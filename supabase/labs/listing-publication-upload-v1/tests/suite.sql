-- NEW upload tests; only in the fresh disposable fixture database.
CREATE SCHEMA upload_test;
CREATE TABLE upload_test.ctx(k text PRIMARY KEY,v jsonb NOT NULL);
CREATE FUNCTION upload_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'upload_test_failed:%',label; END IF;
RETURN 'PASS|'||label; END $f$;
CREATE FUNCTION upload_test.expect(label text,q text,s text,msg text DEFAULT NULL,r text DEFAULT NULL) RETURNS text
LANGUAGE plpgsql AS $f$ DECLARE got text; m text;
BEGIN
 IF r IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I',r); END IF;
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE,m=MESSAGE_TEXT; END;
 IF r IS NOT NULL THEN RESET ROLE; END IF;
 RETURN upload_test.check(label,got=s AND (msg IS NULL OR m=msg));
END $f$;
CREATE FUNCTION upload_test.b() RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM upload_test.ctx WHERE k='binding' $f$;
CREATE FUNCTION upload_test.c() RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM upload_test.ctx WHERE k='claim' $f$;
CREATE FUNCTION upload_test.boot() RETURNS void LANGUAGE plpgsql AS $f$ DECLARE a jsonb; b jsonb;
BEGIN
 a:=public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','60000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);
 b:=public.reserve_my_listing_upload_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(a->>'attempt_id')::uuid,(a->'slots'->0->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001')->'binding';
 INSERT INTO upload_test.ctx VALUES('attempt',a),('binding',b);
END $f$;
CREATE FUNCTION upload_test.claim() RETURNS jsonb LANGUAGE plpgsql AS $f$ DECLARE b jsonb:=upload_test.b();
BEGIN RETURN public.claim_listing_upload_sign_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(b->>'attempt_id')::uuid,(b->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001',(b->>'grant_id')::uuid); END $f$;
CREATE FUNCTION upload_test.start() RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 INSERT INTO upload_test.ctx VALUES('claim',upload_test.claim()); END $f$;
CREATE FUNCTION upload_test.read_grant() RETURNS jsonb LANGUAGE plpgsql AS $f$ DECLARE b jsonb:=upload_test.b();
BEGIN RETURN public.get_my_listing_upload_grant_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(b->>'attempt_id')::uuid,(b->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001',(b->>'grant_id')::uuid); END $f$;
CREATE FUNCTION upload_test.token(extra jsonb DEFAULT '{}'::jsonb) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE b jsonb:=upload_test.b(); c jsonb:=upload_test.c(); at_epoch bigint:=(c->>'send_before_epoch')::bigint-30; claims jsonb;
BEGIN claims:=jsonb_build_object('url',b->>'bucket_id'||'/'||(b->>'object_path'),'upsert',false,'iat',at_epoch,'exp',at_epoch+7200)||extra;
 RETURN 'eyJhbGciOiJIUzI1NiJ9.'||rtrim(translate(replace(encode(convert_to(claims::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=')||'.syntheticSignature'; END $f$;
CREATE FUNCTION upload_test.record_token(tok text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE b jsonb:=upload_test.b(); c jsonb:=upload_test.c(); at_epoch bigint:=(c->>'send_before_epoch')::bigint-30;
BEGIN RETURN public.record_listing_upload_grant_v1((b->>'grant_id')::uuid,(c->>'claim_id')::uuid,
 coalesce(tok,upload_test.token()),at_epoch,at_epoch+7200); END $f$;
CREATE FUNCTION upload_test.cancel() RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','60000000-0000-0000-0000-000000000001') $f$;


SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);

SELECT set_config('request.jwt.claims','{}',true);

SAVEPOINT upload_case_1;

SELECT upload_test.check('closed_anon_reserve_my_listing_upload_v1',NOT has_function_privilege('anon','public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_anon_claim_listing_upload_sign_v1',NOT has_function_privilege('anon','public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_anon_record_listing_upload_grant_v1',NOT has_function_privilege('anon','public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint)','EXECUTE'));

SELECT upload_test.check('closed_anon_get_my_listing_upload_grant_v1',NOT has_function_privilege('anon','public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_anon_purge_listing_upload_token_one_v1',NOT has_function_privilege('anon','public.purge_listing_upload_token_one_v1(uuid)','EXECUTE'));

SELECT upload_test.check('receipt_table_closed_anon',NOT has_table_privilege('anon','listing_publication_private.upload_grants','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT upload_test.expect('secret_select_denied_anon','SELECT token FROM listing_publication_private.upload_grants','42501',NULL,'anon');

SELECT upload_test.check('closed_authenticated_reserve_my_listing_upload_v1',NOT has_function_privilege('authenticated','public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_authenticated_claim_listing_upload_sign_v1',NOT has_function_privilege('authenticated','public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_authenticated_record_listing_upload_grant_v1',NOT has_function_privilege('authenticated','public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint)','EXECUTE'));

SELECT upload_test.check('closed_authenticated_get_my_listing_upload_grant_v1',NOT has_function_privilege('authenticated','public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_authenticated_purge_listing_upload_token_one_v1',NOT has_function_privilege('authenticated','public.purge_listing_upload_token_one_v1(uuid)','EXECUTE'));

SELECT upload_test.check('receipt_table_closed_authenticated',NOT has_table_privilege('authenticated','listing_publication_private.upload_grants','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT upload_test.expect('secret_select_denied_authenticated','SELECT token FROM listing_publication_private.upload_grants','42501',NULL,'authenticated');

SELECT upload_test.check('closed_service_role_reserve_my_listing_upload_v1',NOT has_function_privilege('service_role','public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_service_role_claim_listing_upload_sign_v1',NOT has_function_privilege('service_role','public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_service_role_record_listing_upload_grant_v1',NOT has_function_privilege('service_role','public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint)','EXECUTE'));

SELECT upload_test.check('closed_service_role_get_my_listing_upload_grant_v1',NOT has_function_privilege('service_role','public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT upload_test.check('closed_service_role_purge_listing_upload_token_one_v1',NOT has_function_privilege('service_role','public.purge_listing_upload_token_one_v1(uuid)','EXECUTE'));

SELECT upload_test.check('receipt_table_closed_service_role',NOT has_table_privilege('service_role','listing_publication_private.upload_grants','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT upload_test.expect('secret_select_denied_service_role','SELECT token FROM listing_publication_private.upload_grants','42501',NULL,'service_role');

SELECT upload_test.check('receipt_table_has_rls',(SELECT relrowsecurity FROM pg_class WHERE oid='listing_publication_private.upload_grants'::regclass));

SELECT upload_test.check('no_permissive_receipt_policies',NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='listing_publication_private.upload_grants'::regclass));

ROLLBACK TO upload_case_1;

SAVEPOINT upload_case_2;

SELECT upload_test.boot();

SELECT upload_test.check('reservation_has_private_exact_binding',upload_test.b()->>'bucket_id'='listing-publication-private' AND upload_test.b()->>'actor_user_id'='11111111-1111-1111-1111-111111111111' AND upload_test.b()->>'identity_id'='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND upload_test.b()->>'object_path'='v1/'||(upload_test.b()->>'attempt_id')||'/'||(upload_test.b()->>'slot_id')||'/source.upload');

SELECT upload_test.check('reservation_receipt_precedes_external_claim',(SELECT state='reserved' AND claim_id IS NULL AND token IS NULL FROM listing_publication_private.upload_grants));

SELECT upload_test.check('reservation_replay_has_same_grant',(public.reserve_my_listing_upload_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(upload_test.b()->>'attempt_id')::uuid,(upload_test.b()->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001')->'binding')=upload_test.b());

SELECT upload_test.check('pending_has_no_token',upload_test.read_grant()=jsonb_build_object('state','pending','grant',NULL));

SELECT upload_test.start();

SELECT upload_test.check('first_claim_is_one_winner',(upload_test.c()->>'sign_allowed')::boolean AND (SELECT state='signing' AND token IS NULL FROM listing_publication_private.upload_grants));

SELECT upload_test.check('claim_window_is_exactly_thirty_seconds',(SELECT send_before_epoch=floor(extract(epoch FROM claimed_at))::bigint+30 FROM listing_publication_private.upload_grants));

SELECT upload_test.check('repeat_claim_never_signs_again',upload_test.claim()->>'sign_allowed'='false');

SELECT upload_test.check('repeat_claim_keeps_nonce',upload_test.claim()->>'claim_id'=upload_test.c()->>'claim_id');

SELECT upload_test.check('claim_restores_actor_sub',current_setting('request.jwt.claim.sub')='11111111-1111-1111-1111-111111111111');

SELECT upload_test.check('claim_restores_actor_claims',current_setting('request.jwt.claims')='{}');

SELECT upload_test.check('record_acknowledges',upload_test.record_token()='{"recorded":true}'::jsonb);

SELECT upload_test.check('same_receipt_is_idempotent',upload_test.record_token()='{"recorded":true}'::jsonb);

SELECT upload_test.check('only_one_receipt',(SELECT count(*)=1 FROM listing_publication_private.upload_grants));

SELECT upload_test.check('owner_recovers_identical_token',upload_test.read_grant()->>'state'='ready' AND upload_test.read_grant()->'grant'->>'token'=upload_test.token());

SELECT upload_test.check('stored_expiration_comes_from_token',(upload_test.read_grant()->'grant'->>'expires_epoch')::bigint=(upload_test.c()->>'send_before_epoch')::bigint-30+7200);

SELECT upload_test.check('receipt_digest_matches_exact_token',(SELECT token_sha256=sha256(convert_to(token,'UTF8')) FROM listing_publication_private.upload_grants));

SELECT upload_test.check('unexpired_token_not_purged',NOT public.purge_listing_upload_token_one_v1((upload_test.b()->>'grant_id')::uuid));

SELECT upload_test.check('signing_receipt_never_creates_public_listing',(SELECT count(*)=0 FROM public.listings) AND (SELECT count(*)=0 FROM public.listing_images));

ROLLBACK TO upload_case_2;

SAVEPOINT upload_case_3;

SELECT upload_test.boot(); SELECT upload_test.start();

SELECT upload_test.expect('token_reject_upsert','SELECT upload_test.record_token(upload_test.token(''{"upsert": true}''::jsonb))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_wrong_path','SELECT upload_test.record_token(upload_test.token(''{"url": "listing-images/evil"}''::jsonb))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_wrong_iat','SELECT upload_test.record_token(upload_test.token(''{"iat": 1}''::jsonb))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_string_exp','SELECT upload_test.record_token(upload_test.token(''{"exp": "not-an-epoch"}''::jsonb))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_missing_upsert','SELECT upload_test.record_token(upload_test.token(''{"upsert": null}''::jsonb))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_non_jwt','SELECT upload_test.record_token(''not-a-jwt'')','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_bad_json','SELECT upload_test.record_token(''a.b.c'')','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_oversize','SELECT upload_test.record_token(repeat(''x'',4097))','22023','publication_upload_token_invalid',NULL);

SELECT upload_test.expect('token_reject_wrong_claim','SELECT public.record_listing_upload_grant_v1((upload_test.b()->>''grant_id'')::uuid,''80000000-0000-0000-0000-000000000001'',upload_test.token(),1,7201)','22023','publication_upload_claim_mismatch',NULL);

SELECT upload_test.check('invalid_tokens_leave_signing_unknown',(SELECT state='signing' AND token IS NULL FROM listing_publication_private.upload_grants));

SELECT upload_test.record_token();

SELECT upload_test.expect('second_different_receipt_rejected','SELECT upload_test.record_token(upload_test.token()||''x'')','22023','publication_upload_receipt_conflict',NULL);

SELECT upload_test.expect('direct_token_replacement_protected','UPDATE listing_publication_private.upload_grants SET token=''evil''','55000','publication_upload_receipt_immutable',NULL);

SELECT upload_test.expect('receipt_deletion_protected','DELETE FROM listing_publication_private.upload_grants','55000','publication_upload_receipt_retained',NULL);

SELECT upload_test.expect('claim_takeover_protected','UPDATE listing_publication_private.upload_grants SET claim_id=gen_random_uuid()','55000','publication_upload_receipt_immutable',NULL);

ROLLBACK TO upload_case_3;

SAVEPOINT upload_case_4;

SELECT upload_test.boot(); SELECT upload_test.start(); SELECT upload_test.cancel();

SELECT upload_test.check('cancel_enqueues_exact_source_block',(SELECT c.state='blocked_write_settlement' AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT upload_test.check('late_signing_receipt_retained_after_cancel',upload_test.record_token()->>'recorded'='true');

SELECT upload_test.expect('closed_attempt_never_releases_token','SELECT upload_test.read_grant()','55000','publication_attempt_closed',NULL);

SELECT upload_test.expect('closed_attempt_never_claims_again','SELECT upload_test.claim()','55000','publication_attempt_closed',NULL);

SELECT upload_test.check('record_never_unblocks_cleanup',(SELECT state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT upload_test.check('record_never_reopens_attempt',(SELECT state='cancelled' AND payload IS NULL FROM listing_publication_private.attempts));

SELECT upload_test.check('record_never_releases_reserved_capacity',(SELECT sum(reserved_bytes)=30408704 FROM listing_publication_private.objects));

ROLLBACK TO upload_case_4;

SAVEPOINT upload_case_5;

SELECT upload_test.boot(); SELECT upload_test.cancel();

SELECT upload_test.expect('cancel_before_claim_denied','SELECT upload_test.claim()','55000','publication_attempt_closed',NULL);

SELECT upload_test.check('cancel_before_claim_keeps_no_capability',(SELECT state='reserved' AND token IS NULL AND claim_id IS NULL FROM listing_publication_private.upload_grants));

ROLLBACK TO upload_case_5;

SAVEPOINT upload_case_6;

SELECT upload_test.boot(); SELECT upload_test.start(); SELECT upload_test.record_token();

SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);

SELECT upload_test.expect('other_actor_cannot_read_owner_token','SELECT upload_test.read_grant()','42501','publication_account_changed',NULL);

SELECT upload_test.check('service_claim_preserves_different_prior_sub',upload_test.claim()->>'sign_allowed'='false' AND current_setting('request.jwt.claim.sub')='22222222-2222-2222-2222-222222222222');

ROLLBACK TO upload_case_6;

SAVEPOINT upload_case_7;

SELECT upload_test.boot(); SELECT upload_test.start();

UPDATE public.profiles SET active_identity_id='cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id='11111111-1111-1111-1111-111111111111';

SELECT upload_test.expect('identity_switch_blocks_new_claim','SELECT upload_test.claim()','42501',NULL,NULL);

SELECT upload_test.check('identity_switch_does_not_discard_late_receipt',upload_test.record_token()->>'recorded'='true');

SELECT upload_test.expect('identity_switch_blocks_token_release','SELECT upload_test.read_grant()','42501',NULL,NULL);

ROLLBACK TO upload_case_7;

SAVEPOINT upload_case_8;

SELECT upload_test.boot(); SELECT upload_test.start();

UPDATE public.publication_policy_documents SET status='retired';

SELECT upload_test.expect('policy_change_blocks_new_claim','SELECT upload_test.claim()','42501',NULL,NULL);

SELECT upload_test.check('policy_change_keeps_evidence_recordable',upload_test.record_token()->>'recorded'='true');

SELECT upload_test.expect('policy_change_blocks_token_release','SELECT upload_test.read_grant()','42501',NULL,NULL);

ROLLBACK TO upload_case_8;

SAVEPOINT upload_case_9;

SELECT upload_test.boot();

GRANT EXECUTE ON FUNCTION public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.purge_listing_upload_token_one_v1(uuid) TO authenticated;

SELECT set_config('request.jwt.claim.role','service_role',true); SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);

SELECT upload_test.expect('forged_role_claim_denied_claim','SELECT public.claim_listing_upload_sign_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',NULL,NULL,NULL,NULL)','42501','publication_upload_service_required','authenticated');

SELECT upload_test.expect('forged_role_claim_denied_record','SELECT public.record_listing_upload_grant_v1(NULL,NULL,''x'',1,7201)','42501','publication_upload_service_required','authenticated');

SELECT upload_test.expect('forged_role_claim_denied_purge','SELECT public.purge_listing_upload_token_one_v1(NULL)','42501','publication_upload_service_required','authenticated');

ROLLBACK TO upload_case_9;

SAVEPOINT upload_case_10;

SELECT upload_test.boot(); SELECT upload_test.start();

GRANT EXECUTE ON FUNCTION public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.purge_listing_upload_token_one_v1(uuid) TO service_role;

SELECT upload_test.check('service_role_no_table_read',NOT has_table_privilege('service_role','listing_publication_private.upload_grants','SELECT'));

SELECT upload_test.expect('actual_service_role_reaches_claim','SELECT public.claim_listing_upload_sign_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',NULL,NULL,NULL,NULL)','P0002','publication_attempt_unavailable','service_role');

ROLLBACK TO upload_case_10;

SAVEPOINT upload_case_11;

SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
DO $f$ DECLARE a jsonb; r jsonb; at_time timestamptz:=clock_timestamp()-interval '3 hours'; ie bigint:=floor(extract(epoch FROM at_time))::bigint;
BEGIN a:=public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','60000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);
 r:=listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(a->>'attempt_id')::uuid,(a->'slots'->0->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001');
 INSERT INTO listing_publication_private.upload_grants(object_id,dispatch_key,state,claim_id,claimed_at,send_before_epoch,token,token_sha256,issued_epoch,expires_epoch,recorded_at)
 VALUES((r->>'object_id')::uuid,'70000000-0000-0000-0000-000000000001','recorded',gen_random_uuid(),at_time,ie+30,'synthetic-expired-secret',sha256(convert_to('synthetic-expired-secret','UTF8')),ie,ie+7200,at_time);
END $f$;

SELECT upload_test.check('aged_secret_purge_one',public.purge_listing_upload_token_one_v1((SELECT id FROM listing_publication_private.upload_grants)));

SELECT upload_test.check('aged_secret_gone_receipt_retained',(SELECT token IS NULL AND token_sha256 IS NOT NULL AND claim_id IS NOT NULL AND expires_epoch IS NOT NULL AND state='recorded' FROM listing_publication_private.upload_grants));

SELECT upload_test.check('aged_secret_purge_idempotent',NOT public.purge_listing_upload_token_one_v1((SELECT id FROM listing_publication_private.upload_grants)));

SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','60000000-0000-0000-0000-000000000001');

SELECT upload_test.check('expired_secret_not_proof_of_remote_absence',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

ROLLBACK TO upload_case_11;

SAVEPOINT upload_case_12;

DO $f$ DECLARE a jsonb;
BEGIN a:=public.prepare_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','60000000-0000-0000-0000-000000000001','{"basics":{"title":"Test title","description":"Synthetic description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,'[{"client_file_id":"20000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);
 PERFORM listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',(a->>'attempt_id')::uuid,(a->'slots'->0->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001');
 INSERT INTO upload_test.ctx VALUES('attempt',a);
END $f$;

SELECT upload_test.check('legacy_dispatch_stays_unknown',public.reserve_my_listing_upload_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',((SELECT v FROM upload_test.ctx WHERE k='attempt')->>'attempt_id')::uuid,((SELECT v FROM upload_test.ctx WHERE k='attempt')->'slots'->0->>'slot_id')::uuid,'70000000-0000-0000-0000-000000000001')='{"binding":null}'::jsonb);

SELECT upload_test.check('legacy_unknown_does_not_create_receipt',(SELECT count(*)=0 FROM listing_publication_private.upload_grants));

ROLLBACK TO upload_case_12;

SAVEPOINT upload_case_13;

SELECT upload_test.boot();

CREATE FUNCTION upload_test.call_as(q text,r text) RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE value jsonb; BEGIN EXECUTE format('SET LOCAL ROLE %I',r); EXECUTE q INTO value; RESET ROLE; RETURN value; END $f$;
GRANT EXECUTE ON FUNCTION public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;


INSERT INTO upload_test.ctx VALUES('claim',upload_test.call_as(format('SELECT public.claim_listing_upload_sign_v1(%L,%L,%L,%L,%L,%L)', '11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',upload_test.b()->>'attempt_id',upload_test.b()->>'slot_id','70000000-0000-0000-0000-000000000001',upload_test.b()->>'grant_id'),'service_role'));

SELECT upload_test.check('actual_service_first_claim_allowed',upload_test.c()->>'sign_allowed'='true');

SELECT upload_test.check('actual_service_records_bound_receipt',upload_test.call_as(format('SELECT public.record_listing_upload_grant_v1(%L,%L,%L,%L,%L)',upload_test.b()->>'grant_id',upload_test.c()->>'claim_id',upload_test.token(),(upload_test.c()->>'send_before_epoch')::bigint-30,(upload_test.c()->>'send_before_epoch')::bigint-30+7200),'service_role')->>'recorded'='true');

SELECT upload_test.check('actual_authenticated_role_recovers_same_capability',upload_test.call_as(format('SELECT public.get_my_listing_upload_grant_v1(%L,%L,%L,%L,%L,%L)','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',upload_test.b()->>'attempt_id',upload_test.b()->>'slot_id','70000000-0000-0000-0000-000000000001',upload_test.b()->>'grant_id'),'authenticated')->'grant'->>'token'=upload_test.token());

SELECT upload_test.check('role_restored_after_success',current_setting('role')='none');

SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);

SELECT upload_test.expect('actual_authenticated_other_actor_denied',format('SELECT public.get_my_listing_upload_grant_v1(%L,%L,%L,%L,%L,%L)','11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',upload_test.b()->>'attempt_id',upload_test.b()->>'slot_id','70000000-0000-0000-0000-000000000001',upload_test.b()->>'grant_id'),'42501','publication_account_changed','authenticated');

SELECT upload_test.check('actor_sub_restored_after_failed_claim',current_setting('request.jwt.claim.sub')='22222222-2222-2222-2222-222222222222' AND current_setting('role')='none');

ROLLBACK TO upload_case_13;
