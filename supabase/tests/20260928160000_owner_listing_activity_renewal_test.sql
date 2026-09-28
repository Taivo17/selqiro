\set ON_ERROR_STOP on
begin;
set local statement_timeout='15s';
set local lock_timeout='2s';
create schema renewal_test;
-- Test-only canonical serialization: compare every column in one fixed zone.
-- Do NOT remove created_at/featured_until or any other field from comparisons.
-- The production renewal function and the selected fixture are unchanged.
create function renewal_test.snapshot(p_row anyelement) returns jsonb
language sql stable
set search_path = pg_catalog
set timezone = 'UTC'
as $snapshot$
  select pg_catalog.to_jsonb(p_row);
$snapshot$;
create table renewal_test.assertion_log(label text primary key);
create function renewal_test.ok(p_ok boolean, p_label text) returns void
language plpgsql as $test$
begin
  if p_ok is not true then raise exception 'RENEWAL_ASSERT_FAILED: %', p_label; end if;
  insert into renewal_test.assertion_log values (p_label);
  raise notice 'RENEWAL_PASS: %', p_label;
end;
$test$;
create function renewal_test.expect_error(p_sql text,p_state text,p_message text,p_label text)
returns void language plpgsql as $test$
declare caught boolean := false;
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate <> p_state or position(p_message in sqlerrm)=0 then raise; end if;
    caught := true;
  end;
  perform renewal_test.ok(caught,p_label);
end;
$test$;
grant usage on schema renewal_test to anon, authenticated, service_role;
grant insert, select on renewal_test.assertion_log to anon, authenticated, service_role;
grant execute on all functions in schema renewal_test to anon, authenticated, service_role;

select renewal_test.ok(((select prosecdef and provolatile='v' and proparallel='u' from pg_proc where oid='public.renew_my_listing_activity_v1(text,timestamp with time zone)'::regprocedure)),'definer_volatile_not_parallel');
select renewal_test.ok(((select pronargdefaults=0 and pronargs=2 from pg_proc where oid='public.renew_my_listing_activity_v1(text,timestamp with time zone)'::regprocedure)),'two_required_inputs_no_defaults');
select renewal_test.ok((has_function_privilege('authenticated','public.renew_my_listing_activity_v1(text,timestamp with time zone)','execute')),'authenticated_execute');
select renewal_test.ok((has_function_privilege('service_role','public.renew_my_listing_activity_v1(text,timestamp with time zone)','execute')),'service_execute_still_requires_user');
select renewal_test.ok((not has_function_privilege('anon','public.renew_my_listing_activity_v1(text,timestamp with time zone)','execute')),'anonymous_acl_denied');
select renewal_test.ok((not exists(select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid='public.renew_my_listing_activity_v1(text,timestamp with time zone)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE')),'public_acl_denied');
select renewal_test.ok(((select proconfig @> array['search_path=pg_catalog, public, auth, pg_temp','TimeZone=UTC','lock_timeout=2s'] from pg_proc where oid='public.renew_my_listing_activity_v1(text,timestamp with time zone)'::regprocedure)),'fixed_search_path_timezone_lock_timeout');
select renewal_test.ok((not has_table_privilege('authenticated','public.listings','update')),'no_direct_update_grant_added');
insert into public.identities(id,type,user_id,display_name) values
('20000000-0000-4000-8000-000000000001','private','10000000-0000-4000-8000-000000000001','Synthetic owner A'),
('20000000-0000-4000-8000-000000000002','private','10000000-0000-4000-8000-000000000001','Synthetic owner B'),
('20000000-0000-4000-8000-000000000003','private','10000000-0000-4000-8000-000000000003','Synthetic unrelated owner');
insert into public.identities(id,type,business_account_id,display_name) values
('20000000-0000-4000-8000-000000000004','business','30000000-0000-4000-8000-000000000001','Synthetic business');
insert into public.business_members(business_account_id,user_id,status,role) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','active','owner'), ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','active','member');
insert into public.profiles(id,active_identity_id) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000004'),('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000003');
insert into public.listings(id,user_id,identity_id,title,description,price,price_amount,
 category,subcategory,condition,country,city,details,status,active_until,created_at,
 image,listing_lat,listing_lng,search_text,created_by_user_id,updated_by_user_id)
values (101,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic available listing','Preserve description','123',123,
 'vehicles','cars','used','Estonia','Paide',
 '{"detailCategory":"passenger_cars","brand":"AUDI","transmission":"automaat","unrelated":{"keep":null}}',
 'active','2000-01-01 00:00:00+00','1999-01-01 00:00:00+00',
 'https://example.invalid/test-image.jpg',58.8,25.5,'preserve search text','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
insert into public.listings(id,user_id,identity_id,title,status,active_until,created_at)
select id,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic '||id,'active','2000-01-01 00:00:00+00','1999-01-01 00:00:00+00'
from generate_series(102,119) id;
update public.listings set status='paused' where id=102;
update public.listings set status='sold' where id=103;
update public.listings set status='draft' where id=104;
update public.listings set status='archived' where id=105;
update public.listings set status=null where id=106;
update public.listings set status='ACTIVE' where id=107;
update public.listings set active_until=null where id=108;
update public.listings set active_until=clock_timestamp()+interval '2 days' where id=109;
update public.listings set active_until=clock_timestamp()+interval '120 days' where id=110;
update public.listings set identity_id='20000000-0000-4000-8000-000000000002' where id=111;
update public.listings set identity_id='20000000-0000-4000-8000-000000000003',user_id='10000000-0000-4000-8000-000000000003' where id=112;
update public.listings set identity_id=null where id=113;
update public.listings set identity_id='20000000-0000-4000-8000-000000000004' where id=114;
update public.listings set active_until='infinity' where id=115;
update public.listings set active_until='-infinity' where id=116;
insert into public.listings(id,user_id,identity_id,title,status,active_until) values
(9223372036854775807,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Synthetic bigint','active','2000-01-01 00:00:00+00');
insert into public.store_categories(id,user_id,identity_id,name) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','Test category');
insert into public.listing_store_categories(listing_id,store_category_id) values
(101,'40000000-0000-4000-8000-000000000001');
insert into public.listing_images(id,listing_id,user_id,original_url,sort_order,is_primary) values
('50000000-0000-4000-8000-000000000001',101,'10000000-0000-4000-8000-000000000001','https://example.invalid/original.jpg',0,true);
create table renewal_test.before_rows as select id,renewal_test.snapshot(l) as row from public.listings l;
create table renewal_test.related_before as
select 'images'::text as kind,renewal_test.snapshot(x) as row from public.listing_images x
union all select 'categories',renewal_test.snapshot(x) from public.store_categories x
union all select 'links',renewal_test.snapshot(x) from public.listing_store_categories x;
create table renewal_test.output(listing_id text,status text,active_until timestamptz,changed boolean);
create table renewal_test.clock_bounds(point text,stamp timestamptz);
grant select on renewal_test.before_rows to authenticated;
grant insert,select,delete on renewal_test.output to authenticated;
grant insert,select on renewal_test.clock_bounds to authenticated;
select renewal_test.ok((not exists(select 1 from public.listings where id=101 and status='active' and (active_until is null or active_until>now()))),'expired_active_fails_public_time_predicate_before');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2000-01-01 00:00:00+00'')','42501','permission denied','anon_call_blocked');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2000-01-01 00:00:00+00'')','42501','listing_activity_authentication_required','missing_auth_blocked');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role service_role;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2000-01-01 00:00:00+00'')','42501','listing_activity_authentication_required','service_without_actor_blocked');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','missing_profile_blocked');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1('''',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_1');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''0'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_2');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''-1'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_3');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''01'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_4');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1('' 101'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_5');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101 '',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_6');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101.0'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_7');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''1e2'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_8');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''abc'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_9');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''9223372036854775808'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_10');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''99999999999999999999'',''2000-01-01 00:00:00+00'')','22023','listing_activity_id_invalid','invalid_id_11');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(null,null)','22023','listing_activity_id_invalid','null_id_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''infinity'')','22023','listing_activity_deadline_invalid','infinite_expectation_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''-infinity'')','22023','listing_activity_deadline_invalid','negative_infinite_expectation_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''999'',''2000-01-01 00:00:00+00'')','42501','listing_activity_not_found_or_forbidden','missing_listing_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''111'',''2000-01-01 00:00:00+00'')','42501','listing_activity_not_found_or_forbidden','same_account_other_identity_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''112'',''2000-01-01 00:00:00+00'')','42501','listing_activity_not_found_or_forbidden','foreign_identity_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''113'',''2000-01-01 00:00:00+00'')','42501','listing_activity_not_found_or_forbidden','legacy_unassigned_not_adopted');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''102'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','paused_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''103'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','sold_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''104'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','draft_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''105'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','archived_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''106'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','null_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''107'',''2000-01-01 00:00:00+00'')','55000','listing_activity_active_status_required','upper_active_never_republished');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''115'',null)','22023','listing_activity_deadline_invalid','stored_positive_infinity_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''116'',null)','22023','listing_activity_deadline_invalid','stored_negative_infinity_blocked');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',null)','40001','listing_activity_conflict','missing_finite_expected_deadline_conflicts');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2001-01-01 00:00:00+00'')','40001','listing_activity_conflict','wrong_deadline_conflicts');
select renewal_test.expect_error('update public.listings set active_until=now()+interval ''900 days'' where id=101','42501','permission denied','fixture_direct_write_denied');
set local timezone='Pacific/Auckland';
set local lock_timeout='800ms';
-- Reproduce the old comparison defect BEFORE a renewal write.
-- Only synthetic fixture rows are read. The same instant has different JSON
-- text in UTC and Auckland; the canonical snapshot must still match fully.
select renewal_test.ok(((select to_jsonb(l)->'created_at' is distinct from b.row->'created_at'
  from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),
  'raw_json_timestamp_differs_in_auckland');
select renewal_test.ok(((select l.created_at=(b.row->>'created_at')::timestamptz
  and l.active_until=(b.row->>'active_until')::timestamptz
  from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),
  'timezone_representation_preserves_stored_instants');
select renewal_test.ok(((select renewal_test.snapshot(l)=b.row
  from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),
  'canonical_snapshot_matches_before_renewal');
insert into renewal_test.clock_bounds values ('before',clock_timestamp());
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('101','2000-01-01 00:00:00+00');
insert into renewal_test.clock_bounds values ('after',clock_timestamp());
select renewal_test.ok(((select count(*)=1 from renewal_test.output)),'exact_one_result');
select renewal_test.ok(((select listing_id='101' and status='active' and changed from renewal_test.output)),'same_id_active_changed');
select renewal_test.ok(((select extract(epoch from (o.active_until-b.stamp)) >= 90*86400 and extract(epoch from (o.active_until-a.stamp)) <=90*86400 from renewal_test.output o cross join renewal_test.clock_bounds b cross join renewal_test.clock_bounds a where b.point='before' and a.point='after')),'deadline_exact_server_utc_90_days');
select renewal_test.ok((current_setting('TimeZone')='Pacific/Auckland' and current_setting('lock_timeout')='800ms'),'function_settings_restore_caller');
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''101'',''2000-01-01 00:00:00+00'')','40001','listing_activity_conflict','stale_replay_does_not_extend_again');
select renewal_test.ok((current_setting('TimeZone')='Pacific/Auckland' and current_setting('lock_timeout')='800ms'),'error_restores_caller_settings');
reset role;
select renewal_test.ok(((select renewal_test.snapshot(l)-'active_until' = b.row-'active_until' from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),'all_other_listing_columns_preserved');
-- Pure counterexamples, not table writes: the corrected comparison must
-- still reject an altered creation timestamp and altered listing text.
select renewal_test.ok(((select
  (renewal_test.snapshot(jsonb_populate_record(l,
    '{"created_at":"2000-01-01T00:00:00+00:00"}'::jsonb))-'active_until')
  is distinct from (b.row-'active_until')
  from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),
  'preservation_check_detects_changed_creation_timestamp');
select renewal_test.ok(((select
  (renewal_test.snapshot(jsonb_populate_record(l,
    '{"title":"Synthetic deliberately changed title"}'::jsonb))-'active_until')
  is distinct from (b.row-'active_until')
  from public.listings l join renewal_test.before_rows b using(id) where l.id=101)),
  'preservation_check_detects_changed_title');
select renewal_test.ok(((select l.active_until=o.active_until from public.listings l join renewal_test.output o on o.listing_id=l.id::text where l.id=101)),'returned_deadline_matches_row');
select renewal_test.ok((exists(select 1 from public.listings where id=101 and status='active' and (active_until is null or active_until>now()))),'public_time_predicate_true_after');
select renewal_test.ok(((select created_at='1999-01-01 00:00:00+00'::timestamptz from public.listings where id=101)),'creation_order_not_bumped');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
delete from renewal_test.output;
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('108',null);
select renewal_test.ok(((select active_until is null and not changed from renewal_test.output)),'legacy_null_deadline_is_noop');
delete from renewal_test.output;
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('110',(select (row->>'active_until')::timestamptz from renewal_test.before_rows where id=110));
select renewal_test.ok(((select not changed from renewal_test.output)),'longer_existing_deadline_never_shortened');
delete from renewal_test.output;
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('109',(select (row->>'active_until')::timestamptz from renewal_test.before_rows where id=109));
select renewal_test.ok(((select changed from renewal_test.output)),'explicit_pre_expiry_confirmation_supported');
delete from renewal_test.output;
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('9223372036854775807','2000-01-01 00:00:00+00');
select renewal_test.ok(((select listing_id='9223372036854775807' from renewal_test.output)),'bigint_id_returned_without_js_rounding');
reset role;
update public.profiles set active_identity_id=null where id='10000000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''117'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','null_active_identity_blocked');
reset role;
update public.profiles set active_identity_id='20000000-0000-4000-8000-000000000003' where id='10000000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''112'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','forged_active_identity_rejected');
reset role;
update public.profiles set active_identity_id='20000000-0000-4000-8000-000000000001' where id='10000000-0000-4000-8000-000000000001';
update public.identities set status='inactive' where id='20000000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''117'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','inactive_identity_rejected');
reset role;
update public.identities set status='active' where id='20000000-0000-4000-8000-000000000001';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
delete from renewal_test.output;
insert into renewal_test.output select * from public.renew_my_listing_activity_v1('114','2000-01-01 00:00:00+00');
select renewal_test.ok(((select listing_id='114' and changed from renewal_test.output)),'business_member_uses_existing_identity_authority');
reset role;
update public.listings set identity_id='20000000-0000-4000-8000-000000000004' where id=117;
update public.business_members set status='inactive' where user_id='10000000-0000-4000-8000-000000000002';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''117'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','inactive_business_member_rejected');
reset role;
delete from public.business_members where user_id='10000000-0000-4000-8000-000000000002';
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select renewal_test.expect_error('select * from public.renew_my_listing_activity_v1(''117'',''2000-01-01 00:00:00+00'')','42501','listing_activity_identity_required','removed_business_member_rejected');
reset role;
select renewal_test.ok((not exists((select kind,row from renewal_test.related_before except select 'images',renewal_test.snapshot(x) from public.listing_images x except select 'categories',renewal_test.snapshot(x) from public.store_categories x except select 'links',renewal_test.snapshot(x) from public.listing_store_categories x))),'original_images_categories_links_preserved');
select renewal_test.ok(((select count(*) from renewal_test.related_before)=(select count(*) from public.listing_images)+(select count(*) from public.store_categories)+(select count(*) from public.listing_store_categories)),'no_added_images_categories_links');
select renewal_test.ok(((select count(*) from public.listings)=(select count(*) from renewal_test.before_rows)),'no_listing_created_or_deleted');
select renewal_test.ok((not exists(select 1 from public.listings l join renewal_test.before_rows b using(id) where l.id not in(101,109,114,117,9223372036854775807) and renewal_test.snapshot(l) is distinct from b.row)),'all_untargeted_rows_unchanged');
select renewal_test.ok((not exists(select 1 from public.listings l join renewal_test.before_rows b using(id) where l.id in(109,114,9223372036854775807) and (renewal_test.snapshot(l)-'active_until') is distinct from (b.row-'active_until'))),'all_successful_renewals_only_change_deadline');
savepoint renewal_rollback;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select * from public.renew_my_listing_activity_v1('118','2000-01-01 00:00:00+00');
reset role;
rollback to savepoint renewal_rollback;
select renewal_test.ok(((select renewal_test.snapshot(l)=b.row from public.listings l join renewal_test.before_rows b using(id) where l.id=118)),'renewal_rolls_back_with_transaction');
select renewal_test.ok((select count(*)=73 from renewal_test.assertion_log),'all_planned_assertions_executed');
select 'OWNER_LISTING_ACTIVITY_RENEWAL_SUITE=PASS';
rollback;
