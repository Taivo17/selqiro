-- NEW TESTS ONLY. Driver wraps in one outer BEGIN ... ROLLBACK.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE SCHEMA publication_test;
CREATE FUNCTION publication_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $fn$
BEGIN
 IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'publication_test_failed:%',label; END IF;
 RETURN 'PASS|'||label;
END $fn$;
CREATE FUNCTION publication_test.expect(label text,query text,expected_state text,expected_message text DEFAULT NULL,test_role text DEFAULT 'postgres')
RETURNS text LANGUAGE plpgsql AS $fn$
DECLARE got_state text; got_message text;
BEGIN
 EXECUTE format('SET LOCAL ROLE %I',test_role);
 BEGIN EXECUTE query;
 EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got_state=RETURNED_SQLSTATE,got_message=MESSAGE_TEXT;
 END;
 RESET ROLE;
 RETURN publication_test.check(label,got_state=expected_state AND
   (expected_message IS NULL OR got_message=expected_message));
END $fn$;
CREATE FUNCTION publication_test.scalar_as(query text,test_role text) RETURNS bigint LANGUAGE plpgsql AS $fn$
DECLARE n bigint;
BEGIN EXECUTE format('SET LOCAL ROLE %I',test_role); EXECUTE query INTO n; RESET ROLE; RETURN n; END $fn$;


SAVEPOINT case_1;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('closed_anon_prepare_my_listing_publication_v1',NOT has_function_privilege('anon','public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE'));

SELECT publication_test.check('closed_anon_get_my_listing_publication_v1',NOT has_function_privilege('anon','public.get_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_anon_cancel_my_listing_publication_v1',NOT has_function_privilege('anon','public.cancel_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_anon_reserve_upload_dispatch_v1',NOT has_function_privilege('anon','listing_publication_private.reserve_upload_dispatch_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('table_closed_anon_attempts',NOT has_table_privilege('anon','listing_publication_private.attempts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_anon_slots',NOT has_table_privilege('anon','listing_publication_private.slots','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_anon_objects',NOT has_table_privilege('anon','listing_publication_private.objects','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_anon_cleanup',NOT has_table_privilege('anon','listing_publication_private.cleanup','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.expect('direct_call_closed_anon','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'anon');

SELECT publication_test.check('closed_authenticated_prepare_my_listing_publication_v1',NOT has_function_privilege('authenticated','public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE'));

SELECT publication_test.check('closed_authenticated_get_my_listing_publication_v1',NOT has_function_privilege('authenticated','public.get_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_authenticated_cancel_my_listing_publication_v1',NOT has_function_privilege('authenticated','public.cancel_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_authenticated_reserve_upload_dispatch_v1',NOT has_function_privilege('authenticated','listing_publication_private.reserve_upload_dispatch_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('table_closed_authenticated_attempts',NOT has_table_privilege('authenticated','listing_publication_private.attempts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_authenticated_slots',NOT has_table_privilege('authenticated','listing_publication_private.slots','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_authenticated_objects',NOT has_table_privilege('authenticated','listing_publication_private.objects','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_authenticated_cleanup',NOT has_table_privilege('authenticated','listing_publication_private.cleanup','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.expect('direct_call_closed_authenticated','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'authenticated');

SELECT publication_test.check('closed_service_role_prepare_my_listing_publication_v1',NOT has_function_privilege('service_role','public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb)','EXECUTE'));

SELECT publication_test.check('closed_service_role_get_my_listing_publication_v1',NOT has_function_privilege('service_role','public.get_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_service_role_cancel_my_listing_publication_v1',NOT has_function_privilege('service_role','public.cancel_my_listing_publication_v1(uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('closed_service_role_reserve_upload_dispatch_v1',NOT has_function_privilege('service_role','listing_publication_private.reserve_upload_dispatch_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT publication_test.check('table_closed_service_role_attempts',NOT has_table_privilege('service_role','listing_publication_private.attempts','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_service_role_slots',NOT has_table_privilege('service_role','listing_publication_private.slots','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_service_role_objects',NOT has_table_privilege('service_role','listing_publication_private.objects','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.check('table_closed_service_role_cleanup',NOT has_table_privilege('service_role','listing_publication_private.cleanup','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT publication_test.expect('direct_call_closed_service_role','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'service_role');

SELECT publication_test.check('four_rls_tables',(SELECT count(*)=4 AND bool_and(relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='listing_publication_private' AND c.relkind='r'));

SELECT publication_test.check('no_private_rls_allow_policies',(SELECT count(*)=0 FROM pg_policies WHERE schemaname='listing_publication_private'));

ROLLBACK TO SAVEPOINT case_1; RELEASE SAVEPOINT case_1;

SAVEPOINT case_2;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

CREATE TEMP TABLE first_result AS SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb) AS j;

SELECT publication_test.check('prepare_not_replayed',(SELECT j->>'replayed'='false' FROM first_result));

SELECT publication_test.check('prepare_open',(SELECT j->>'state'='open' FROM first_result));

SELECT publication_test.check('one_private_attempt',(SELECT count(*)=1 FROM listing_publication_private.attempts));

SELECT publication_test.check('one_slot',(SELECT count(*)=1 FROM listing_publication_private.slots));

SELECT publication_test.check('two_private_object_refs',(SELECT count(*)=2 AND bool_and(bucket_id='listing-publication-private') FROM listing_publication_private.objects));

SELECT publication_test.check('reserve_max_not_declared_bytes',(SELECT sum(reserved_bytes)=30408704 FROM listing_publication_private.objects));

SELECT publication_test.check('deadline_24_hours',(SELECT expires_at-created_at=interval '24 hours' FROM listing_publication_private.attempts));

SELECT publication_test.check('no_public_listing_or_image',(SELECT count(*)=0 FROM public.listings) AND (SELECT count(*)=0 FROM public.listing_images));

SELECT publication_test.check('price_exact_canonical',(SELECT payload->'price'= '{"kind":"fixed","amount":"123.4","currency":"EUR"}'::jsonb FROM listing_publication_private.attempts));

SELECT publication_test.check('details_unconverted',(SELECT payload->'details'->>'power'='90 kW' FROM listing_publication_private.attempts));

SELECT publication_test.check('snapshot_no_storage_paths',(SELECT j::text NOT LIKE '%bucket_id%' AND j::text NOT LIKE '%object_path%' AND j::text NOT LIKE '%source.upload%' FROM first_result));

SELECT publication_test.check('same_request_same_attempt',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->>'attempt_id')=(SELECT j->>'attempt_id' FROM first_result));

SELECT publication_test.check('replay_flag',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->>'replayed')='true');

SELECT publication_test.check('replay_no_extra_objects',(SELECT count(*)=2 FROM listing_publication_private.objects));

SELECT publication_test.check('owner_get_same_payload',(public.get_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001')->'payload')=(SELECT j->'payload' FROM first_result));

SELECT publication_test.check('acceptances_not_written',(SELECT count(*)=2 FROM public.user_publication_policy_acceptances));

GRANT USAGE ON SCHEMA listing_publication_private TO authenticated; GRANT SELECT ON ALL TABLES IN SCHEMA listing_publication_private TO authenticated;

SELECT publication_test.check('rls_zero_attempts',publication_test.scalar_as('SELECT count(*) FROM listing_publication_private.attempts','authenticated')=0);

SELECT publication_test.check('rls_zero_slots',publication_test.scalar_as('SELECT count(*) FROM listing_publication_private.slots','authenticated')=0);

SELECT publication_test.check('rls_zero_objects',publication_test.scalar_as('SELECT count(*) FROM listing_publication_private.objects','authenticated')=0);

SELECT publication_test.check('rls_zero_cleanup',publication_test.scalar_as('SELECT count(*) FROM listing_publication_private.cleanup','authenticated')=0);

ROLLBACK TO SAVEPOINT case_2; RELEASE SAVEPOINT case_2;

SAVEPOINT case_3;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_price','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"USD"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_3; RELEASE SAVEPOINT case_3;

SAVEPOINT case_4;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_basics','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Different title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_4; RELEASE SAVEPOINT case_4;

SAVEPOINT case_5;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_location','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Tallinn","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_5; RELEASE SAVEPOINT case_5;

SAVEPOINT case_6;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_details','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"91 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_6; RELEASE SAVEPOINT case_6;

SAVEPOINT case_7;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_category_path','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","cars","passenger_cars"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_7; RELEASE SAVEPOINT case_7;

SAVEPOINT case_8;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_digest','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_8; RELEASE SAVEPOINT case_8;

SAVEPOINT case_9;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_size','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":101,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_9; RELEASE SAVEPOINT case_9;

SAVEPOINT case_10;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_client_id','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_10; RELEASE SAVEPOINT case_10;

SAVEPOINT case_11;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('replay_conflict_order','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023','publication_request_conflict','postgres');

ROLLBACK TO SAVEPOINT case_11; RELEASE SAVEPOINT case_11;

SAVEPOINT case_12;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT set_config('request.jwt.claim.sub','',true);

SELECT publication_test.expect('anonymous','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_12; RELEASE SAVEPOINT case_12;

SAVEPOINT case_13;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('wrong_expected_account','SELECT public.prepare_my_listing_publication_v1(''22222222-2222-2222-2222-222222222222'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_13; RELEASE SAVEPOINT case_13;

SAVEPOINT case_14;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('wrong_identity','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_14; RELEASE SAVEPOINT case_14;

SAVEPOINT case_15;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT set_config('request.jwt.claim.sub','33333333-3333-3333-3333-333333333333',true);

SELECT publication_test.expect('missing_acceptance','SELECT public.prepare_my_listing_publication_v1(''33333333-3333-3333-3333-333333333333'',''eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_15; RELEASE SAVEPOINT case_15;

SAVEPOINT case_16;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

UPDATE public.identities SET status='inactive' WHERE id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT publication_test.expect('inactive_identity','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_16; RELEASE SAVEPOINT case_16;

SAVEPOINT case_17;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

UPDATE public.profiles SET active_identity_id='cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id='11111111-1111-1111-1111-111111111111';

SELECT publication_test.check('business_member_prepare',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->>'identity_id')='cccccccc-cccc-cccc-cccc-cccccccccccc');

UPDATE public.business_members SET status='inactive' WHERE business_account_id='dddddddd-dddd-dddd-dddd-dddddddddddd' AND user_id='11111111-1111-1111-1111-111111111111';

SELECT publication_test.expect('revoked_membership_replay','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''cccccccc-cccc-cccc-cccc-cccccccccccc'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_17; RELEASE SAVEPOINT case_17;

SAVEPOINT case_18;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);

SELECT publication_test.expect('other_account_get','SELECT public.get_my_listing_publication_v1(''22222222-2222-2222-2222-222222222222'',''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'',''10000000-0000-0000-0000-000000000001'')','P0002',NULL,'postgres');

SELECT publication_test.check('same_key_other_account_independent',(public.prepare_my_listing_publication_v1('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->>'actor_user_id')='22222222-2222-2222-2222-222222222222');

SELECT publication_test.check('two_actor_receipts',(SELECT count(*)=2 FROM listing_publication_private.attempts));

ROLLBACK TO SAVEPOINT case_18; RELEASE SAVEPOINT case_18;

SAVEPOINT case_19;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_object','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''{}''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_19; RELEASE SAVEPOINT case_19;

SAVEPOINT case_20;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_null','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,NULL)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_20; RELEASE SAVEPOINT case_20;

SAVEPOINT case_21;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_too_many','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000003","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000004","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000005","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000006","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000007","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000008","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000009","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000010","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000011","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_21; RELEASE SAVEPOINT case_21;

SAVEPOINT case_22;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_duplicate','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_22; RELEASE SAVEPOINT case_22;

SAVEPOINT case_23;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_byte_length_4','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":0,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_23; RELEASE SAVEPOINT case_23;

SAVEPOINT case_24;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_byte_length_5','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":-1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_24; RELEASE SAVEPOINT case_24;

SAVEPOINT case_25;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_byte_length_6','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":"100","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_25; RELEASE SAVEPOINT case_25;

SAVEPOINT case_26;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_byte_length_7','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":1.5,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_26; RELEASE SAVEPOINT case_26;

SAVEPOINT case_27;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_byte_length_8','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":26214401,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_27; RELEASE SAVEPOINT case_27;

SAVEPOINT case_28;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_sha256_9','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_28; RELEASE SAVEPOINT case_28;

SAVEPOINT case_29;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_sha256_10','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_29; RELEASE SAVEPOINT case_29;

SAVEPOINT case_30;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_client_file_id_11','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"fallback-private","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_30; RELEASE SAVEPOINT case_30;

SAVEPOINT case_31;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_client_file_id_12','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"00000000-0000-0000-0000-000000000000","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_31; RELEASE SAVEPOINT case_31;

SAVEPOINT case_32;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_authority_path','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","path":"client-controlled"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_32; RELEASE SAVEPOINT case_32;

SAVEPOINT case_33;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_authority_bucket_id','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","bucket_id":"client-controlled"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_33; RELEASE SAVEPOINT case_33;

SAVEPOINT case_34;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_authority_verified','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","verified":"client-controlled"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_34; RELEASE SAVEPOINT case_34;

SAVEPOINT case_35;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_authority_mime','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","mime":"client-controlled"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_35; RELEASE SAVEPOINT case_35;

SAVEPOINT case_36;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_authority_filename','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","filename":"client-controlled"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_36; RELEASE SAVEPOINT case_36;

SAVEPOINT case_37;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('images_total_bytes','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":26214400,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":26214400,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000003","byte_length":26214400,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000004","byte_length":26214400,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000005","byte_length":26214400,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_37; RELEASE SAVEPOINT case_37;

SAVEPOINT case_38;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('input_authority_status','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et","status":"untrusted"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_38; RELEASE SAVEPOINT case_38;

SAVEPOINT case_39;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('input_authority_image','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et","image":"untrusted"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_39; RELEASE SAVEPOINT case_39;

SAVEPOINT case_40;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('input_authority_identity_id','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et","identity_id":"untrusted"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_40; RELEASE SAVEPOINT case_40;

SAVEPOINT case_41;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('input_authority_active_until','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et","active_until":"untrusted"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_41; RELEASE SAVEPOINT case_41;

SAVEPOINT case_42;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('input_authority_policy_accepted','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et","policy_accepted":"untrusted"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_42; RELEASE SAVEPOINT case_42;

SAVEPOINT case_43;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('price_numeric','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":100,"currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_43; RELEASE SAVEPOINT case_43;

SAVEPOINT case_44;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('price_precision','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"1.00","currency":"JPY"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_44; RELEASE SAVEPOINT case_44;

SAVEPOINT case_45;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('price_invalid_currency','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"1","currency":"BTC"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_45; RELEASE SAVEPOINT case_45;

SAVEPOINT case_46;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('price_jpyaccepted',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123","currency":"JPY"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload'->'price')='{"kind":"fixed","amount":"123","currency":"JPY"}'::jsonb);

ROLLBACK TO SAVEPOINT case_46; RELEASE SAVEPOINT case_46;

SAVEPOINT case_47;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('price_kwdaccepted',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"1.234","currency":"KWD"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload'->'price')='{"kind":"fixed","amount":"1.234","currency":"KWD"}'::jsonb);

ROLLBACK TO SAVEPOINT case_47; RELEASE SAVEPOINT case_47;

SAVEPOINT case_48;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('price_freeaccepted',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"free","amount":null,"currency":null},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload'->'price')='{"kind":"free","amount":null,"currency":null}'::jsonb);

ROLLBACK TO SAVEPOINT case_48; RELEASE SAVEPOINT case_48;

SAVEPOINT case_49;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('price_negotiableaccepted',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"negotiable","amount":null,"currency":null},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload'->'price')='{"kind":"negotiable","amount":null,"currency":null}'::jsonb);

ROLLBACK TO SAVEPOINT case_49; RELEASE SAVEPOINT case_49;

SAVEPOINT case_50;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.check('price_unspecifiedaccepted',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"unspecified","amount":null,"currency":null},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload'->'price')='{"kind":"unspecified","amount":null,"currency":null}'::jsonb);

ROLLBACK TO SAVEPOINT case_50; RELEASE SAVEPOINT case_50;

SAVEPOINT case_51;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('scope_blank_country','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_51; RELEASE SAVEPOINT case_51;

SAVEPOINT case_52;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('scope_blank_city','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":" ","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_52; RELEASE SAVEPOINT case_52;

SAVEPOINT case_53;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('scope_coordinates','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":"0","longitude":"0"},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_53; RELEASE SAVEPOINT case_53;

SAVEPOINT case_54;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT publication_test.expect('scope_language','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"en"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','22023',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_54; RELEASE SAVEPOINT case_54;

SAVEPOINT case_55;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

DELETE FROM public.user_publication_policy_acceptances WHERE user_id='11111111-1111-1111-1111-111111111111';

SELECT publication_test.check('read_without_reaccepting',(public.get_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001')->>'state')='open');

SELECT publication_test.expect('reserve_requires_current_acceptance','SELECT listing_publication_private.reserve_upload_dispatch_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001''),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001'') AND ordinal=0),''30000000-0000-0000-0000-000000000001'')','42501',NULL,'postgres');

SELECT publication_test.check('cancel_without_reaccepting',(public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001')->>'state')='cancelled');

ROLLBACK TO SAVEPOINT case_55; RELEASE SAVEPOINT case_55;

SAVEPOINT case_56;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

UPDATE public.publication_policy_documents SET status='retired' WHERE id='99999999-9999-9999-9999-999999999999';

SELECT publication_test.expect('no_active_general_policy','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'postgres');

ROLLBACK TO SAVEPOINT case_56; RELEASE SAVEPOINT case_56;

SAVEPOINT case_57;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

INSERT INTO public.publication_policy_documents(policy_key,policy_version,country_code,locale,title,body_text,content_hash,status,applies_to_content_types) VALUES('country-rule','test-v1','EE','et-EE','Synthetic country','Synthetic country scoped policy for test only.',repeat('b',64),'active',ARRAY['listing']);

SELECT publication_test.expect('free_text_not_policy_country','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','55000','publication_policy_country_scope_unresolved','postgres');

ROLLBACK TO SAVEPOINT case_57; RELEASE SAVEPOINT case_57;

SAVEPOINT case_58;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.expect('slot_update','UPDATE listing_publication_private.slots SET ordinal=1','55000','publication_slot_immutable','postgres');

SELECT publication_test.expect('slot_delete','DELETE FROM listing_publication_private.slots','55000','publication_slot_immutable','postgres');

SELECT publication_test.expect('object_move','UPDATE listing_publication_private.objects SET object_path=''elsewhere''','55000','publication_object_immutable','postgres');

SELECT publication_test.expect('object_delete','DELETE FROM listing_publication_private.objects','55000','publication_object_lineage_retained','postgres');

SELECT publication_test.expect('payload_update','UPDATE listing_publication_private.attempts SET payload=payload||''{"title":"changed"}''::jsonb','55000','publication_attempt_immutable','postgres');

SELECT publication_test.expect('receipt_delete','DELETE FROM listing_publication_private.attempts','55000','publication_receipt_retained','postgres');

SELECT publication_test.expect('close_without_lineage','UPDATE listing_publication_private.attempts SET state=''cancelled'',payload=NULL,closed_at=clock_timestamp()','55000','publication_cleanup_lineage_required','postgres');

ROLLBACK TO SAVEPOINT case_58; RELEASE SAVEPOINT case_58;

SAVEPOINT case_59;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.check('first_dispatch_allowed',(listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001'),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001') AND ordinal=0),'30000000-0000-0000-0000-000000000001')->>'dispatch_allowed')='true');

SELECT publication_test.check('dispatch_replay_not_allowed',(listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001'),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001') AND ordinal=0),'30000000-0000-0000-0000-000000000001')->>'dispatch_allowed')='false');

SELECT publication_test.check('dispatch_exact_server_path',(listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001'),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001') AND ordinal=0),'30000000-0000-0000-0000-000000000001')->>'object_path')=(SELECT object_path FROM listing_publication_private.objects WHERE kind='source'));

SELECT publication_test.expect('dispatch_other_key','SELECT listing_publication_private.reserve_upload_dispatch_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001''),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001'') AND ordinal=0),''30000000-0000-0000-0000-000000000002'')','22023','publication_dispatch_conflict','postgres');

SELECT publication_test.expect('dispatch_nil_key','SELECT listing_publication_private.reserve_upload_dispatch_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001''),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001'') AND ordinal=0),''00000000-0000-0000-0000-000000000000'')','22023','publication_dispatch_key_invalid','postgres');

SELECT publication_test.check('cancel_changed',(public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001')->>'changed')='true');

SELECT publication_test.check('cancel_erases_payload',(SELECT payload IS NULL AND state='cancelled' FROM listing_publication_private.attempts));

SELECT publication_test.check('cancel_two_durable_refs',(SELECT count(*)=2 FROM listing_publication_private.cleanup));

SELECT publication_test.check('dispatch_source_cleanup_blocked',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT publication_test.check('undispatched_web_cleanup_pending',(SELECT c.state='pending' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='web'));

SELECT publication_test.check('cancel_replay_no_change',(public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001')->>'changed')='false');

SELECT publication_test.check('cancel_replay_no_duplicate_jobs',(SELECT count(*)=2 FROM listing_publication_private.cleanup));

SELECT publication_test.check('old_prepare_no_resurrection',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->>'state')='cancelled');

SELECT publication_test.check('old_prepare_no_content',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb)->'payload')='null'::jsonb);

SELECT publication_test.expect('late_dispatch_cannot_reopen','SELECT listing_publication_private.reserve_upload_dispatch_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001''),(SELECT id FROM listing_publication_private.slots WHERE attempt_id=(SELECT id FROM listing_publication_private.attempts WHERE request_key=''10000000-0000-0000-0000-000000000001'') AND ordinal=0),''30000000-0000-0000-0000-000000000001'')','55000','publication_attempt_closed','postgres');

SELECT publication_test.expect('terminal_cannot_reopen','UPDATE listing_publication_private.attempts SET state=''open'',payload=''{}'',closed_at=NULL','55000','publication_attempt_immutable','postgres');

SELECT publication_test.check('terminal_reservations_retained',(SELECT sum(reserved_bytes)=30408704 FROM listing_publication_private.objects));

ROLLBACK TO SAVEPOINT case_59; RELEASE SAVEPOINT case_59;

SAVEPOINT case_60;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

CREATE FUNCTION publication_test.fail_queue() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic_queue_failure'; END$$; CREATE TRIGGER fail_queue BEFORE INSERT ON listing_publication_private.cleanup FOR EACH ROW EXECUTE FUNCTION publication_test.fail_queue();

SELECT publication_test.expect('queue_failure_propagates','SELECT public.cancel_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'')','P0001','synthetic_queue_failure','postgres');

SELECT publication_test.check('queue_failure_keeps_payload',(SELECT state='open' AND payload IS NOT NULL FROM listing_publication_private.attempts));

SELECT publication_test.check('queue_failure_leaves_no_partial_jobs',(SELECT count(*)=0 FROM listing_publication_private.cleanup));

ROLLBACK TO SAVEPOINT case_60; RELEASE SAVEPOINT case_60;

SAVEPOINT case_61;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT publication_test.check('expire_before_deadline_noop',listing_publication_private.expire_one_v1((SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000001'))=false);

INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,payload,policy_snapshot,created_at,expires_at) SELECT actor_user_id,identity_id,'10000000-0000-0000-0000-000000000099',intent_sha256,payload,policy_snapshot,created_at-interval '25 hours',expires_at-interval '25 hours' FROM listing_publication_private.attempts;

SELECT publication_test.check('expired_snapshot_before_sweep',(public.get_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000099')->>'state')='expired');

SELECT publication_test.check('expired_snapshot_hides_payload',(public.get_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000099')->'payload')='null'::jsonb);

SELECT publication_test.check('expire_old_attempt',listing_publication_private.expire_one_v1((SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000099')));

SELECT publication_test.check('expire_second_noop',NOT listing_publication_private.expire_one_v1((SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000099')));

SELECT publication_test.check('expiry_payload_removed',(SELECT payload IS NULL AND state='expired' FROM listing_publication_private.attempts WHERE id=(SELECT id FROM listing_publication_private.attempts WHERE request_key='10000000-0000-0000-0000-000000000099')));

ROLLBACK TO SAVEPOINT case_61; RELEASE SAVEPOINT case_61;

SAVEPOINT case_62;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000002','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000003','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb);

SELECT publication_test.expect('three_open_attempt_limit','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000004'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[]''::jsonb)','54000','publication_open_attempt_limit','postgres');

SELECT publication_test.check('quota_replay_still_readable',(public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb)->>'replayed')='true');

ROLLBACK TO SAVEPOINT case_62; RELEASE SAVEPOINT case_62;

SAVEPOINT case_63;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000002','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000002');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000003','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000003');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000004','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000004');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000005','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000005');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000006','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000006');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000007','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000007');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000008','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000008');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000009','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000009');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000010','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000010');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000011','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000011');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000012','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000012');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000013','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000013');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000014','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000014');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000015','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000015');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000016','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000016');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000017','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000017');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000018','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000018');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000019','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000019');

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000020','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000020');

SELECT publication_test.expect('twenty_daily_attempt_limit','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000021'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[]''::jsonb)','54000','publication_daily_attempt_limit','postgres');

ROLLBACK TO SAVEPOINT case_63; RELEASE SAVEPOINT case_63;

SAVEPOINT case_64;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000002","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000003","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000004","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000005","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000006","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000007","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000008","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000009","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"client_file_id":"20000000-0000-0000-0000-000000000010","byte_length":1,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb); SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001');

SELECT publication_test.expect('claimed_one_byte_cannot_evade_budget','SELECT public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000002'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','54000','publication_retained_bytes_limit','postgres');

SELECT publication_test.check('ten_image_order',(SELECT array_agg(ordinal ORDER BY ordinal)=ARRAY[0,1,2,3,4,5,6,7,8,9] FROM listing_publication_private.slots));

SELECT publication_test.check('paths_do_not_embed_actor_or_filename',(SELECT bool_and(object_path NOT LIKE '%11111111-1111-1111-1111-111111111111%') FROM listing_publication_private.objects));

ROLLBACK TO SAVEPOINT case_64; RELEASE SAVEPOINT case_64;

SAVEPOINT case_65;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

GRANT EXECUTE ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb),public.get_my_listing_publication_v1(uuid,uuid,uuid),public.cancel_my_listing_publication_v1(uuid,uuid,uuid) TO authenticated;

SELECT publication_test.check('future_rpc_authenticated_definer_create',publication_test.scalar_as('SELECT (public.prepare_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)->>''schema_version'')::bigint','authenticated')=1);

SELECT publication_test.check('future_rpc_authenticated_definer_get',publication_test.scalar_as('SELECT (public.get_my_listing_publication_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'')->>''schema_version'')::bigint','authenticated')=1);

SELECT publication_test.expect('future_rpc_rejects_account_forgery','SELECT public.prepare_my_listing_publication_v1(''22222222-2222-2222-2222-222222222222'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''10000000-0000-0000-0000-000000000001'',''{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}''::jsonb,''[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]''::jsonb)','42501',NULL,'authenticated');

SELECT publication_test.check('future_rpc_still_no_private_table_access',NOT has_table_privilege('authenticated','listing_publication_private.attempts','SELECT'));

ROLLBACK TO SAVEPOINT case_65; RELEASE SAVEPOINT case_65;

SAVEPOINT case_66;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);

SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','10000000-0000-0000-0000-000000000001');

SELECT publication_test.expect('queue_reference_cannot_be_changed','UPDATE listing_publication_private.cleanup SET object_path=''other''','55000','publication_cleanup_lineage_retained','postgres');

SELECT publication_test.expect('queue_reference_cannot_be_deleted','DELETE FROM listing_publication_private.cleanup','55000','publication_cleanup_lineage_retained','postgres');

SELECT publication_test.expect('source_dispatch_cannot_be_added_after_close','UPDATE listing_publication_private.objects SET dispatch_key=''30000000-0000-0000-0000-000000000001'',dispatch_recorded_at=clock_timestamp() WHERE kind=''source''','55000','publication_attempt_closed','postgres');

ROLLBACK TO SAVEPOINT case_66; RELEASE SAVEPOINT case_66;

SELECT publication_test.check('suite_no_surviving_attempts',(SELECT count(*)=0 FROM listing_publication_private.attempts));

SELECT publication_test.check('suite_public_rows_unchanged',(SELECT count(*)=0 FROM public.listings) AND (SELECT count(*)=0 FROM public.listing_images));
