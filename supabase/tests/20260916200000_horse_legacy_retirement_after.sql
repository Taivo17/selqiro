-- Include in the same local rollback transaction as the BEFORE file,
-- AFTER applying the candidate retirement definition. Never run on production.
select pg_temp.retire_assert(
 (select (to_jsonb(p)-array['prosrc','proargdefaults']) ||
   jsonb_build_object('canonical_arguments',pg_get_function_arguments(p.oid))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='save_my_horse_offer_draft_v1') =
 (select value from horse_retirement_state where key='legacy_metadata'),
 'same function OID, all arguments/defaults, owner, grants, search path and attributes');
select pg_temp.retire_assert(
 (select jsonb_agg(to_jsonb(p) order by p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
   'get_my_horse_offer_v1','get_my_horse_offer_edit_snapshot_v1',
   'update_my_horse_offer_draft_v1','advance_horse_offer_edit_revision_v1','apply_horse_offer_draft_patch_v1')) =
 (select value from horse_retirement_state where key='unchanged_functions'),
 'existing read, snapshot, CAS writer and helper definitions unchanged');

set local role authenticated;
do $create_compatibility$
declare v_kind text;v_full boolean;v_row public.horse_offers;v_before jsonb;v_key text;v_update record;
begin
 foreach v_kind in array array['sale','free_transfer','lease','co_rider','wanted'] loop
  foreach v_full in array array[false,true] loop
   v_row:=pg_temp.retire_create(v_kind,v_full);v_key:=v_kind||'_'||v_full::text;
   select value into strict v_before from horse_retirement_state where key='created_'||v_key;
   -- Same transaction and actor: only random row ID may differ, including all
   -- metadata, stored normalized fields, details, currency, lifecycle and revision.
   perform pg_temp.retire_assert((to_jsonb(v_row)-'id')=(v_before-'id'),
     'full create result unchanged except random ID: '||v_key);
   insert into horse_retirement_state values('after_'||v_key,to_jsonb(v_row));
   perform pg_temp.retire_expect(format(
     'select * from public.save_my_horse_offer_draft_v1(p_offer_id=>%L,p_offer_type=>%L)',v_row.id,v_kind),
     '55000','horse_offer_legacy_update_disabled');
   select * into strict v_update from public.update_my_horse_offer_draft_v1(
     v_row.id,1,'{"title":"Current revision client update"}'::jsonb);
   perform pg_temp.retire_assert(v_update.offer_id=v_row.id and v_update.edit_revision='2',
     'current create-then-CAS path: '||v_key);
   perform pg_temp.retire_expect(format(
     'select * from public.save_my_horse_offer_draft_v1(p_offer_id=>%L,p_offer_type=>%L,p_title=>%L)',
     v_row.id,v_kind,'stale legacy'), '55000','horse_offer_legacy_update_disabled');
  end loop;
 end loop;
end;
$create_compatibility$;
do $invalid_after$
declare v_sql text;v_i integer:=0;v_before jsonb;
begin
 for v_sql in select jsonb_array_elements_text(value) from horse_retirement_state where key='invalid_calls' loop
  select value into strict v_before from horse_retirement_state where key='invalid_'||v_i;
  perform pg_temp.retire_assert(pg_temp.retire_rejection(v_sql)=v_before,'same invalid create response: '||v_i);
  v_i:=v_i+1;
 end loop;
end;
$invalid_after$;
-- ID presence is rejected even with no offer type; target existence/ownership
-- and policy validity are not consulted. Malformed wire types are PostgreSQL's
-- parameter-casting boundary and are not claimed to return this message.
select pg_temp.retire_expect(
 format('select * from public.save_my_horse_offer_draft_v1(p_offer_id=>%L)',gen_random_uuid()),
 '55000','horse_offer_legacy_update_disabled');
reset role;
select pg_temp.retire_assert(not exists(
 select 1 from horse_retirement_state s
 join public.horse_offers h on h.id=(s.value->>'id')::uuid
 where s.key like 'created\_%' escape '\' and to_jsonb(h) is distinct from s.value),
 'all pre-existing baseline fixtures remain byte-equivalent');
select pg_temp.retire_assert(not exists(
 select 1 from horse_retirement_state s
 join public.horse_offers h on h.id=(s.value->>'id')::uuid
 where s.key like 'after\_%' escape '\' and
   (h.edit_revision<>2 or h.title<>'Current revision client update' or h.status<>'draft')),
 'legacy calls after CAS did not modify new values or revisions');

-- Test all reachable non-public fixture statuses without weakening publication
-- triggers or fabricating a publication event. Other statuses are structurally
-- outside the create-only branch as well, but are not invented for this test.
do $status_refusal$
declare v_id uuid;v_status text;v_before jsonb;
begin
 v_id:=(select (value->>'id')::uuid from horse_retirement_state where key='created_sale_false');
 foreach v_status in array array['draft','rejected','paused','closed','archived'] loop
  update public.horse_offers set status=v_status, published_at=now(), rejected_at=now(),
    closed_at=now(), archived_at=now() where id=v_id;
  select to_jsonb(h) into strict v_before from public.horse_offers h where h.id=v_id;
  perform pg_temp.retire_expect(format(
    'select * from public.save_my_horse_offer_draft_v1(p_offer_id=>%L,p_offer_type=>''sale'',p_title=>''no'')',v_id),
    '55000','horse_offer_legacy_update_disabled');
  perform pg_temp.retire_assert((select to_jsonb(h) from public.horse_offers h where h.id=v_id)=v_before,
    'full row preserved on legacy refusal in status '||v_status);
 end loop;
end;
$status_refusal$;

-- Authenticated caller with another identity cannot use the removed branch.
select set_config('request.jwt.claim.sub',current_setting('selqiro.retire.foreign'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('selqiro.retire.foreign'),'role','authenticated')::text,true);
set local role authenticated;
select pg_temp.retire_expect(format(
 'select * from public.save_my_horse_offer_draft_v1(p_offer_id=>%L,p_offer_type=>''sale'')',
 (select value->>'id' from horse_retirement_state where key='created_sale_true')),
 '55000','horse_offer_legacy_update_disabled');
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.retire_expect(
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'')',
 '42501','horse_offer_authentication_required');
select pg_temp.retire_expect(
 'select * from public.save_my_horse_offer_draft_v1(p_offer_id=>gen_random_uuid(),p_offer_type=>''sale'')',
 '42501','horse_offer_authentication_required');
reset role;
select pg_temp.retire_assert(
 not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='save_my_horse_offer_draft_v1'
    and has_function_privilege('anon',p.oid,'EXECUTE'))
 and not has_table_privilege('authenticated','public.horse_offers','INSERT')
 and not has_table_privilege('authenticated','public.horse_offers','UPDATE')
 and not has_table_privilege('authenticated','public.horse_offers','DELETE'),
 'anonymous RPC and direct table mutation privileges remain closed');
select pg_temp.retire_assert(
 (select count(*) from public.horse_offers)=(select (value->>'offers')::bigint+20 from horse_retirement_state where key='counts')
 and (select count(*) from public.horse_offer_images)=(select (value->>'images')::bigint from horse_retirement_state where key='counts')
 and (select count(*) from public.horse_offer_publication_events)=(select (value->>'events')::bigint from horse_retirement_state where key='counts')
 and (select count(*) from public.user_publication_policy_acceptances)=(select (value->>'acceptances')::bigint from horse_retirement_state where key='counts')
 and (select count(*) from public.listings)=(select (value->>'listings')::bigint from horse_retirement_state where key='counts'),
 'exactly explicit fixture creations; no fallback duplicates, images, policy or generic listing writes');
\echo HORSE_LEGACY_RETIREMENT_COMPATIBILITY_TEST=PASS
