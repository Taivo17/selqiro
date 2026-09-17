\set ON_ERROR_STOP on
begin;

-- Local-only rollback test. Use real auth/identity/horse schema and real RPCs.
-- Every fixture uses a new random ID. The runner also rolls back the migration.
create function pg_temp.horse_edit_assert(p_ok boolean, p_label text)
returns void language plpgsql as $function$
begin
  if p_ok is not true then raise exception 'ASSERT_FAILED: %', p_label; end if;
  raise notice 'PASS: %', p_label;
end;
$function$;
create function pg_temp.horse_edit_expect(p_sql text, p_state text, p_message text)
returns void language plpgsql as $function$
declare v_failed boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_state or position(p_message in sqlerrm) = 0 then raise; end if;
    v_failed := true;
  end;
  perform pg_temp.horse_edit_assert(v_failed, p_message);
end;
$function$;

-- Do not rely on environment-specific default privileges for temporary helpers.
do $temp_grants$
begin
  execute format('grant usage on schema %I to authenticated',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end;
$temp_grants$;
grant execute on function pg_temp.horse_edit_assert(boolean,text) to authenticated;
grant execute on function pg_temp.horse_edit_expect(text,text,text) to authenticated;

select pg_temp.horse_edit_assert(
  (select prosecdef from pg_proc where oid = 'public.update_my_horse_offer_draft_v1(uuid,bigint,jsonb)'::regprocedure)
  and has_function_privilege('authenticated', 'public.update_my_horse_offer_draft_v1(uuid,bigint,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.update_my_horse_offer_draft_v1(uuid,bigint,jsonb)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.get_my_horse_offer_edit_snapshot_v1(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.apply_horse_offer_draft_patch_v1(public.horse_offers,jsonb)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.advance_horse_offer_edit_revision_v1()', 'EXECUTE'),
  'RPC grants and private helper boundary');
select pg_temp.horse_edit_assert(
  not has_table_privilege('authenticated', 'public.horse_offers', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.horse_offers', 'INSERT')
  and not has_table_privilege('anon', 'public.horse_offers', 'SELECT'),
  'direct table access remains closed');

create temporary table horse_edit_state (key text primary key, value jsonb) on commit drop;
grant select, insert, update on horse_edit_state to authenticated;
insert into horse_edit_state values
  ('counts', jsonb_build_object(
    'offers', (select count(*) from public.horse_offers),
    'images', (select count(*) from public.horse_offer_images),
    'events', (select count(*) from public.horse_offer_publication_events),
    'acceptances', (select count(*) from public.user_publication_policy_acceptances),
    'listings', (select count(*) from public.listings)));

do $fixtures$
declare v_user uuid; v_identity uuid; v_kind text; v_email text;
begin
  foreach v_kind in array array['owner','foreign'] loop
    v_user := gen_random_uuid(); v_email := 'horse-edit-' || v_user::text || '@selqiro.local';
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated',
      v_email, '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');
    insert into public.profiles (id,email) values (v_user,v_email)
      on conflict (id) do update set email = excluded.email;
    select id into v_identity from public.identities
      where type = 'private' and user_id = v_user order by created_at limit 1;
    if v_identity is null then
      insert into public.identities (id,type,user_id,display_name,status,created_by,updated_by)
      values (gen_random_uuid(),'private',v_user,'Horse edit test','active',v_user,v_user)
      returning id into v_identity;
    end if;
    update public.profiles set active_identity_id = v_identity where id = v_user;
    perform set_config('selqiro.edit_test.' || v_kind, v_user::text, true);
    perform set_config('selqiro.edit_test.' || v_kind || '_identity', v_identity::text, true);
  end loop;
end;
$fixtures$;
select set_config('request.jwt.claim.sub', current_setting('selqiro.edit_test.owner'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', jsonb_build_object(
  'sub',current_setting('selqiro.edit_test.owner'),'role','authenticated')::text,true);
set local role authenticated;

do $create_offers$
declare v_kind text; v_offer public.horse_offers;
begin
  foreach v_kind in array array['sale','free_transfer','lease','co_rider','wanted'] loop
    select * into v_offer from public.save_my_horse_offer_draft_v1(
      p_offer_type => v_kind, p_title => 'Local edit ' || v_kind,
      p_price_type => case when v_kind='free_transfer' then 'free' else 'contact' end,
      p_recurring_fee_period => case when v_kind in ('lease','co_rider') then 'month' else null end,
      p_wanted_preferred_sex => case when v_kind='wanted' then 'unknown' else null end,
      p_wanted_budget_mode => case when v_kind='wanted' then 'maximum' else 'contact' end,
      p_wanted_budget_amount => case when v_kind='wanted' then 6500 else null end,
      p_wanted_city => case when v_kind='wanted' then 'Paide' else null end,
      p_city => case when v_kind='wanted' then null else 'Paide' end);
    insert into horse_edit_state values (v_kind, to_jsonb(v_offer.id::text));
  end loop;
end;
$create_offers$;
reset role;

-- Add owner-only values that are intentionally not editable in this patch.
update public.horse_offers set
  location_text = 'Private stable', horse_lat=58.885, horse_lng=25.557,
  published_at=now()-interval '1 day', rejected_at=now()-interval '2 days',
  active_until=now()+interval '1 day',
  details=details || '{"unrelated":{"keep":null,"flag":true}}'::jsonb
where id = (select (value #>> '{}')::uuid from horse_edit_state where key='sale');
update public.horse_offers set details = details ||
  '{"unrelated":{"keep":null},"wanted_extra":"keep"}'::jsonb
where id = (select (value #>> '{}')::uuid from horse_edit_state where key='wanted');
insert into public.horse_offer_images
  (horse_offer_id,identity_id,uploaded_by_user_id,original_url,storage_path,sort_order,is_primary)
select (value #>> '{}')::uuid, current_setting('selqiro.edit_test.owner_identity')::uuid,
  current_setting('selqiro.edit_test.owner')::uuid, 'https://example.invalid/local-horse.jpg',
  'test-only/horse-edit.jpg', 0, true from horse_edit_state where key='sale';
insert into horse_edit_state
select 'sale_before',to_jsonb(source) from public.horse_offers source
where id=(select (value #>> '{}')::uuid from horse_edit_state where key='sale');
insert into horse_edit_state
select 'images_before',jsonb_agg(to_jsonb(image) order by id) from public.horse_offer_images image
where horse_offer_id=(select (value #>> '{}')::uuid from horse_edit_state where key='sale');

set local role authenticated;
do $basic_and_revision$
declare v_id uuid; v_initial record; v_loaded record; v_saved record; v_second record;
begin
  v_id := (select (value #>> '{}')::uuid from horse_edit_state where key='sale');
  select * into v_initial from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_assert(v_initial.offer ->> 'content_id'=v_id::text
    and v_initial.offer ->> 'content_type'='horse_offer'
    and not (v_initial.offer ? 'current_publication_event_id')
    and not ((v_initial.offer -> 'images' -> 0) ? 'storage_path'), 'snapshot is owner-safe');
  select * into v_saved from public.update_my_horse_offer_draft_v1(
    v_id,v_initial.edit_revision::bigint,'{"title":"  Edited    horse  "}'::jsonb);
  select * into v_loaded from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_assert(v_saved.offer_id=v_id
    and v_saved.edit_revision::bigint=v_initial.edit_revision::bigint+1
    and v_loaded.edit_revision=v_saved.edit_revision
    and v_loaded.offer ->> 'title'='Edited horse', 'same ID, normalization and version advancement');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',
    v_id,v_initial.edit_revision,'{"description":"stale tab"}'), '40001','horse_offer_edit_conflict');
  select * into v_second from public.update_my_horse_offer_draft_v1(
    v_id,v_saved.edit_revision::bigint,'{"title":"Edited horse"}'::jsonb);
  perform pg_temp.horse_edit_assert(v_second.edit_revision=v_saved.edit_revision
    and v_second.updated_at=v_saved.updated_at, 'normalized no-op does not write');
  -- Sequential independent snapshots model two open tabs. No timestamp dependence.
  select * into v_second from public.update_my_horse_offer_draft_v1(
    v_id,v_saved.edit_revision::bigint,'{"description":"second update same transaction"}');
  perform pg_temp.horse_edit_assert(v_second.edit_revision::bigint=v_saved.edit_revision::bigint+1,
    'two updates in one transaction get distinct versions');
end;
$basic_and_revision$;
reset role;
select pg_temp.horse_edit_assert(
  (select to_jsonb(source) - array['title','description','updated_by_user_id','updated_at','edit_revision','search_vector']
   from public.horse_offers source where id=(select (value #>> '{}')::uuid from horse_edit_state where key='sale'))
  = (select value - array['title','description','updated_by_user_id','updated_at','edit_revision','search_vector']
   from horse_edit_state where key='sale_before'),
  'private location, lifecycle, details and all untouched columns preserved');

set local role authenticated;
do $invalid_patches$
declare v_patch jsonb; v_id uuid; v_rev bigint; v_read record;
begin
  v_id := (select (value #>> '{}')::uuid from horse_edit_state where key='sale');
  select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id); v_rev:=v_read.edit_revision::bigint;
  foreach v_patch in array array[
    '{}','[]','null','{"status":"published"}','{"offer_type":"wanted"}',
    '{"identity_id":null}','{"edit_revision":99}','{"details":{}}',
    '{"location_text":null}','{"horse_lat":null}','{"image_url":null}',
    '{"wanted_budget_amount":10}','{"title":null}','{"title":false}',
    '{"birth_year":2014.5}','{"birth_year":"2014"}','{"height_cm":168.55}',
    '{"price_amount":1.005}','{"price_amount":-1}','{"recurring_fee_period":"month"}'
  ]::jsonb[] loop
    perform pg_temp.horse_edit_expect(format(
      'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_rev,v_patch), '22023','horse_offer_');
  end loop;
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_rev,'{"city":"Tartu"}'),
    '22023','horse_offer_private_location_requires_separate_edit');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_rev,
    jsonb_build_object('title',repeat('X',141))), '23514','horse_offers_title_length_check');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_rev,'{"price_type":"fixed"}'),
    '23514','horse_offers_price_contract_check');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(NULL,%L,%L)',v_rev,'{"title":"x"}'),
    '22023','horse_offer_edit_identity_and_revision_required');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,NULL,%L)',v_id,'{"title":"x"}'),
    '22023','horse_offer_edit_identity_and_revision_required');
  select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_assert(v_read.edit_revision::bigint=v_rev,'all invalid writes roll back atomically');
end;
$invalid_patches$;

do $branches$
declare v_kind text; v_id uuid; v_read record; v_revision bigint; v_changes jsonb;
begin
  foreach v_kind in array array['free_transfer','lease','co_rider','wanted'] loop
    v_id := (select (value #>> '{}')::uuid from horse_edit_state where key=v_kind);
    select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
    v_revision:=v_read.edit_revision::bigint;
    v_changes:=case
      when v_kind='wanted' then '{"wanted_budget_mode":"maximum","wanted_budget_amount":7000,"wanted_city":"Tartu","wanted_health_preferences":"Preference"}'::jsonb
      when v_kind='free_transfer' then '{"horse_name":" Free horse ","birth_year":2014,"sex":"gelding","height_cm":168.5,"health_notes":"Disclosure"}'::jsonb
      else '{"price_type":"fixed","price_amount":100,"recurring_fee_period":"week","region":"Järvamaa"}'::jsonb end;
    perform * from public.update_my_horse_offer_draft_v1(v_id,v_revision,v_changes);
    select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
    perform pg_temp.horse_edit_assert(v_read.offer ->> 'status'='draft' and v_read.offer ->> 'offer_type'=v_kind,
      v_kind || ' stays the same draft type');
    if v_kind='wanted' then
      perform pg_temp.horse_edit_assert(v_read.offer #>> '{details,wanted,preferred_sex}'='unknown'
        and v_read.offer #>> '{details,wanted,budget,amount}'='7000'
        and v_read.offer #>> '{details,wanted,search_area,city_or_municipality}'='Tartu'
        and v_read.offer ->> 'price_type'='contact' and v_read.offer -> 'price_amount'='null'::jsonb
        and v_read.offer -> 'city'='null'::jsonb
        and v_read.offer #> '{details,unrelated,keep}'='null'::jsonb,
        'wanted budget/search area, unknown preference and unknown metadata preserved');
      perform pg_temp.horse_edit_expect(format(
        'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_read.edit_revision,'{"horse_name":"wrong branch"}'),
        '22023','horse_offer_edit_field_not_allowed');
      perform * from public.update_my_horse_offer_draft_v1(v_id,v_read.edit_revision::bigint,
        '{"wanted_budget_mode":"contact","wanted_budget_amount":null,"wanted_health_preferences":null}');
      select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
      perform pg_temp.horse_edit_assert(not ((v_read.offer #> '{details,wanted}') ? 'health_preferences')
        and not ((v_read.offer #> '{details,wanted,budget}') ? 'amount')
        and v_read.offer #>> '{details,wanted,preferred_sex}'='unknown', 'clear only selected wanted leaves');
    elsif v_kind='free_transfer' then
      perform pg_temp.horse_edit_assert(v_read.offer ->> 'price_type'='free'
        and v_read.offer -> 'price_amount'='null'::jsonb, 'free transfer remains free');
      perform * from public.update_my_horse_offer_draft_v1(v_id,v_read.edit_revision::bigint,'{"horse_name":null}');
      select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
      perform pg_temp.horse_edit_assert(v_read.offer -> 'horse_name'='null'::jsonb,'clear selected nullable column');
    else
      perform pg_temp.horse_edit_assert(v_read.offer #>> '{details,recurring_fee,period}'='week'
        and (v_read.offer ->> 'price_amount')::numeric=100, v_kind || ' structured fee preserved');
    end if;
  end loop;
end;
$branches$;

-- A trusted server-side write still invalidates a loaded revision after the
-- unsafe legacy client path is retired. Only our random local fixture is changed.
reset role;
do $trusted_writer$
declare v_id uuid; v_before record; v_after record;
begin
  v_id:=(select (value #>> '{}')::uuid from horse_edit_state where key='co_rider');
  select * into v_before from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  update public.horse_offers set title='trusted fixture update' where id=v_id;
  select * into v_after from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_assert(v_after.edit_revision::bigint=v_before.edit_revision::bigint+1,
    'trusted writer advances revision after legacy retirement');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_before.edit_revision,'{"title":"stale"}'),
    '40001','horse_offer_edit_conflict');
end;
$trusted_writer$;

-- Valid non-draft fixtures do not require fabricating any publication event.
do $non_draft$
declare v_status text; v_id uuid; v_revision bigint;
begin
  v_id:=(select (value #>> '{}')::uuid from horse_edit_state where key='sale');
  foreach v_status in array array['rejected','paused','closed','archived'] loop
    update public.horse_offers set status=v_status, closed_at=now(),archived_at=now()
      where id=v_id returning edit_revision into v_revision;
    -- The function still authenticates auth.uid() even under the local fixture admin.
    perform pg_temp.horse_edit_expect(format(
      'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_revision,'{"title":"forbidden"}'),
      '55000','horse_offer_not_editable');
    perform pg_temp.horse_edit_assert((select edit_revision=v_revision and status=v_status
      from public.horse_offers where id=v_id),v_status || ' unchanged');
  end loop;
  update public.horse_offers set status='draft' where id=v_id;
end;
$non_draft$;

-- Revisions cross JavaScript's safe integer boundary without converting to Number.
insert into public.horse_offers (identity_id,created_by_user_id,updated_by_user_id,
  offer_type,title,details,edit_revision)
values (current_setting('selqiro.edit_test.owner_identity')::uuid,
  current_setting('selqiro.edit_test.owner')::uuid,current_setting('selqiro.edit_test.owner')::uuid,
  'sale','Large revision test','{"schema_version":1,"branch":"specific"}',9007199254740993);
insert into horse_edit_state
select 'large_revision',to_jsonb(id::text) from public.horse_offers
where identity_id=current_setting('selqiro.edit_test.owner_identity')::uuid and title='Large revision test';
set local role authenticated;
do $big_revision$
declare v_id uuid; v_read record; v_saved record;
begin
  v_id:=(select (value #>> '{}')::uuid from horse_edit_state where key='large_revision');
  select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_assert(v_read.edit_revision='9007199254740993','revision serialized as exact decimal text');
  select * into v_saved from public.update_my_horse_offer_draft_v1(v_id,v_read.edit_revision::bigint,'{"title":"Large revision saved"}');
  perform pg_temp.horse_edit_assert(v_saved.edit_revision='9007199254740994','large revision increment remains exact');
end;
$big_revision$;
reset role;

-- Unknown stored schema is rejected, never erased or guessed.
update public.horse_offers set details=details || '{"schema_version":2}'::jsonb
where id=(select (value #>> '{}')::uuid from horse_edit_state where key='lease');
set local role authenticated;
do $shape$
declare v_read record; v_id uuid;
begin
  v_id:=(select (value #>> '{}')::uuid from horse_edit_state where key='lease');
  select * into v_read from public.get_my_horse_offer_edit_snapshot_v1(v_id);
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,%L,%L)',v_id,v_read.edit_revision,'{"title":"unsafe"}'),
    '22023','horse_offer_edit_shape_unsupported');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,1,%L)',gen_random_uuid(),'{"title":"missing"}'),
    '42501','horse_offer_not_found_or_forbidden');
end;
$shape$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('selqiro.edit_test.foreign'),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('selqiro.edit_test.foreign'),'role','authenticated')::text,true);
set local role authenticated;
do $foreign$
declare v_id uuid;
begin
  v_id:=(select (value #>> '{}')::uuid from horse_edit_state where key='sale');
  perform pg_temp.horse_edit_assert(not exists(select 1 from public.get_my_horse_offer_edit_snapshot_v1(v_id)),
    'foreign active identity cannot load snapshot');
  perform pg_temp.horse_edit_expect(format(
    'select * from public.update_my_horse_offer_draft_v1(%L,1,%L)',v_id,'{"title":"foreign"}'),
    '42501','horse_offer_not_found_or_forbidden');
end;
$foreign$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.horse_edit_expect(
  'select * from public.update_my_horse_offer_draft_v1(gen_random_uuid(),1,''{"title":"no actor"}'')',
  '42501','horse_offer_authentication_required');
reset role;

select pg_temp.horse_edit_assert(
  (select jsonb_agg(to_jsonb(image) order by id) from public.horse_offer_images image
   where horse_offer_id=(select (value #>> '{}')::uuid from horse_edit_state where key='sale'))
   = (select value from horse_edit_state where key='images_before'), 'image rows untouched');
select pg_temp.horse_edit_assert(
  (select count(*) from public.horse_offers)=(select (value->>'offers')::bigint+6 from horse_edit_state where key='counts')
  and (select count(*) from public.horse_offer_publication_events)=(select (value->>'events')::bigint from horse_edit_state where key='counts')
  and (select count(*) from public.user_publication_policy_acceptances)=(select (value->>'acceptances')::bigint from horse_edit_state where key='counts')
  and (select count(*) from public.listings)=(select (value->>'listings')::bigint from horse_edit_state where key='counts'),
  'no replacement offer, publication, acceptance or generic listing writes');
\echo HORSE_UPDATE_AFTER_RETIREMENT_TEST=PASS
rollback;
