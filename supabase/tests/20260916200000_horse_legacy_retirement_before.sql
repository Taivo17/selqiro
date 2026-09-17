-- Include only inside the local runner's outer rollback transaction, BEFORE
-- the retirement migration. This file captures real legacy create behavior;
-- the AFTER file compares it, using the same random actor and same transaction.
-- No fixture ID from an existing account/listing is used.
create temporary table horse_retirement_state (
  key text primary key, value jsonb not null
) on commit drop;
grant select, insert, update on horse_retirement_state to authenticated;

create function pg_temp.retire_assert(p_ok boolean,p_label text)
returns void language plpgsql as $fn$
begin
  if p_ok is not true then raise exception 'RETIRE_ASSERT_FAILED: %',p_label; end if;
  raise notice 'RETIRE_PASS: %',p_label;
end;
$fn$;
create function pg_temp.retire_expect(p_sql text,p_state text,p_message text)
returns void language plpgsql as $fn$
declare v_failed boolean:=false;
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate<>p_state or position(p_message in sqlerrm)=0 then raise; end if;
    v_failed:=true;
  end;
  perform pg_temp.retire_assert(v_failed,p_message);
end;
$fn$;
-- Invoker helper: the actual application RPC still sees the authenticated role.
create function pg_temp.retire_create(p_kind text,p_full boolean)
returns public.horse_offers language plpgsql as $fn$
declare v_row public.horse_offers;
begin
  select * into strict v_row from public.save_my_horse_offer_draft_v1(
    p_offer_id=>null, p_offer_type=>upper(p_kind)||' ',
    p_market_country_code=>' ee ',p_horse_location_country_code=>'ee',
    p_currency=>' eur ',p_title=>E'  Local  retirement\tcase  ',
    p_description=>E'  Local description\nsecond line  ',
    p_price_type=>case when p_kind='free_transfer' then 'contact'
      when p_full and p_kind<>'wanted' then 'FIXED' else 'contact' end,
    p_price_amount=>case when p_full and p_kind not in ('free_transfer','wanted') then 1234.56 else null end,
    p_horse_name=>case when p_full and p_kind<>'wanted' then ' Local  horse ' else null end,
    p_birth_year=>case when p_full and p_kind<>'wanted' then 2014 else null end,
    p_sex=>case when p_full and p_kind<>'wanted' then 'MARE' else null end,
    p_breed=>case when p_full and p_kind<>'wanted' then ' Local  breed ' else null end,
    p_color=>case when p_full and p_kind<>'wanted' then ' bay ' else null end,
    p_height_cm=>case when p_full and p_kind<>'wanted' then 168.5 else null end,
    p_discipline=>case when p_full and p_kind<>'wanted' then '  Local  use  ' else null end,
    p_training_level=>case when p_full and p_kind<>'wanted' then ' known training ' else null end,
    p_suitability=>case when p_full and p_kind<>'wanted' then ' known suitability ' else null end,
    p_health_notes=>case when p_full and p_kind<>'wanted' then ' publisher health note ' else null end,
    p_behavior_notes=>case when p_full and p_kind<>'wanted' then ' publisher behavior note ' else null end,
    p_city=>case when p_full and p_kind<>'wanted' then ' Paide  linn ' else null end,
    p_region=>case when p_full and p_kind<>'wanted' then ' Jarva  county ' else null end,
    p_location_text=>case when p_full and p_kind<>'wanted' then ' Private  stable ' else null end,
    p_horse_lat=>case when p_full and p_kind<>'wanted' then 58.885 else null end,
    p_horse_lng=>case when p_full and p_kind<>'wanted' then 25.557 else null end,
    p_recurring_fee_period=>case when p_kind in ('lease','co_rider') then 'MONTH' else null end,
    p_wanted_preferred_sex=>case when p_full and p_kind='wanted' then 'MARE' else null end,
    p_wanted_preferred_breed=>case when p_full and p_kind='wanted' then ' Local  preferred ' else null end,
    p_wanted_preferred_discipline=>case when p_full and p_kind='wanted' then ' Dressage ' else null end,
    p_wanted_preferred_training_level=>case when p_full and p_kind='wanted' then ' Basic ' else null end,
    p_wanted_intended_use=>case when p_full and p_kind='wanted' then ' Riding ' else null end,
    p_wanted_health_preferences=>case when p_full and p_kind='wanted' then ' Preference H ' else null end,
    p_wanted_behavior_preferences=>case when p_full and p_kind='wanted' then ' Preference B ' else null end,
    p_wanted_budget_mode=>case when p_full and p_kind='wanted' then 'MAXIMUM' else 'contact' end,
    p_wanted_budget_amount=>case when p_full and p_kind='wanted' then 6500.50 else null end,
    p_wanted_city=>case when p_full and p_kind='wanted' then ' Paide  linn ' else null end,
    p_wanted_region=>case when p_full and p_kind='wanted' then ' Jarva  county ' else null end
  );
  return v_row;
end;
$fn$;
-- Invalid creation calls must really reject; any unexpected successful creation
-- raises an outer failure, which the runner rolls back along with every fixture.
create function pg_temp.retire_rejection(p_sql text)
returns jsonb language plpgsql as $fn$
begin
  begin
    execute p_sql;
  exception when others then
    return jsonb_build_object('state',sqlstate,'message',sqlerrm);
  end;
  raise exception 'RETIRE_EXPECTED_CREATE_REJECTION';
end;
$fn$;
do $grants$
begin
  execute format('grant usage on schema %I to authenticated',
    (select nspname from pg_namespace where oid=pg_my_temp_schema()));
end;
$grants$;
grant execute on function pg_temp.retire_assert(boolean,text),
  pg_temp.retire_expect(text,text,text),pg_temp.retire_create(text,boolean),
  pg_temp.retire_rejection(text) to authenticated;

insert into horse_retirement_state
select 'legacy_metadata', (to_jsonb(p)-array['prosrc','proargdefaults']) ||
  jsonb_build_object('canonical_arguments',pg_get_function_arguments(p.oid))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='save_my_horse_offer_draft_v1';
insert into horse_retirement_state
select 'unchanged_functions', jsonb_agg(to_jsonb(p) order by p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'get_my_horse_offer_v1','get_my_horse_offer_edit_snapshot_v1',
 'update_my_horse_offer_draft_v1','advance_horse_offer_edit_revision_v1','apply_horse_offer_draft_patch_v1');
insert into horse_retirement_state values ('counts',jsonb_build_object(
 'offers',(select count(*) from public.horse_offers),
 'images',(select count(*) from public.horse_offer_images),
 'events',(select count(*) from public.horse_offer_publication_events),
 'acceptances',(select count(*) from public.user_publication_policy_acceptances),
 'listings',(select count(*) from public.listings)));

do $actors$
declare v_user uuid;v_identity uuid;v_kind text;v_email text;
begin
 foreach v_kind in array array['owner','foreign'] loop
  v_user:=gen_random_uuid();v_email:='horse-retire-'||v_user::text||'@selqiro.local';
  insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
    confirmation_token,recovery_token,email_change_token_new,email_change)
  values ('00000000-0000-0000-0000-000000000000',v_user,'authenticated','authenticated',v_email,'',now(),
    '{}'::jsonb,'{}'::jsonb,now(),now(),'','','','');
  insert into public.profiles(id,email) values(v_user,v_email)
    on conflict(id) do update set email=excluded.email;
  select id into v_identity from public.identities
    where type='private' and user_id=v_user order by created_at limit 1;
  if v_identity is null then
   insert into public.identities(id,type,user_id,display_name,status,created_by,updated_by)
   values(gen_random_uuid(),'private',v_user,'Horse retirement local fixture','active',v_user,v_user)
   returning id into v_identity;
  end if;
  update public.profiles set active_identity_id=v_identity where id=v_user;
  perform set_config('selqiro.retire.'||v_kind,v_user::text,true);
  perform set_config('selqiro.retire.'||v_kind||'_identity',v_identity::text,true);
 end loop;
end;
$actors$;
select set_config('request.jwt.claim.sub',current_setting('selqiro.retire.owner'),true);
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('selqiro.retire.owner'),'role','authenticated')::text,true);
set local role authenticated;
do $baseline$
declare v_kind text;v_full boolean;v_row public.horse_offers;v_key text;
begin
 foreach v_kind in array array['sale','free_transfer','lease','co_rider','wanted'] loop
  foreach v_full in array array[false,true] loop
   v_row:=pg_temp.retire_create(v_kind,v_full);v_key:=v_kind||'_'||v_full::text;
   insert into horse_retirement_state values('created_'||v_key,to_jsonb(v_row));
   perform pg_temp.retire_assert(v_row.edit_revision=1 and v_row.status='draft','baseline create '||v_key);
  end loop;
 end loop;
end;
$baseline$;
reset role;
-- These expressions all intentionally fail BEFORE the migration and must fail
-- identically AFTER it. Parameter defaults and existing validation are preserved.
insert into horse_retirement_state values ('invalid_calls',jsonb_build_array(
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''unknown'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_market_country_code=>''FI'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_currency=>''USD'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_title=>repeat(''x'',141))',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_birth_year=>1899)',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_sex=>''invalid'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_horse_lat=>58.8)',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''sale'',p_price_type=>''fixed'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''free_transfer'',p_price_amount=>1)',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''lease'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''wanted'',p_city=>''Paide'')',
 'select * from public.save_my_horse_offer_draft_v1(p_offer_type=>''wanted'',p_wanted_budget_mode=>''maximum'')'
));
set local role authenticated;
do $invalid_before$
declare v_sql text;v_i integer:=0;
begin
 for v_sql in select jsonb_array_elements_text(value) from horse_retirement_state where key='invalid_calls' loop
  insert into horse_retirement_state values('invalid_'||v_i,pg_temp.retire_rejection(v_sql));
  v_i:=v_i+1;
 end loop;
end;
$invalid_before$;
reset role;
\echo HORSE_RETIREMENT_BASELINE_CAPTURED=PASS
