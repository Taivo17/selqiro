-- Synthetic WEB contract tests; dependencies are declarations, not old test suites.
CREATE SCHEMA web_test;
CREATE TABLE web_test.ctx(k text PRIMARY KEY,v jsonb NOT NULL);
CREATE FUNCTION web_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'web_test_failed:%',label; END IF; RETURN 'PASS|'||label; END $f$;
CREATE FUNCTION web_test.expect(label text,q text,s text,msg text DEFAULT NULL,r text DEFAULT NULL) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE got text; m text;
BEGIN
 IF r IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I',r); END IF;
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE,m=MESSAGE_TEXT; END;
 IF r IS NOT NULL THEN RESET ROLE; END IF;
 IF got IS DISTINCT FROM s OR (msg IS NOT NULL AND m IS DISTINCT FROM msg) THEN
  RAISE EXCEPTION 'web_test_failed:%:expected=%:actual=%',label,s,coalesce(got,'NO_ERROR'); END IF;
 RETURN web_test.check(label,true);
END $f$;
CREATE FUNCTION web_test.b(p_user uuid DEFAULT '11111111-1111-1111-1111-111111111111') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT v FROM web_test.ctx WHERE k=p_user::text||':binding' $f$;
CREATE FUNCTION web_test.w() RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM web_test.ctx WHERE k='web' $f$;
CREATE FUNCTION web_test.boot(p_user uuid DEFAULT '11111111-1111-1111-1111-111111111111',p_identity uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',p_record boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE a jsonb;b jsonb;c jsonb; epoch bigint; claims jsonb; token text;
BEGIN
 a:=public.prepare_my_listing_publication_v1(p_user,p_identity,'61000000-0000-0000-0000-000000000001',
 '{"basics":{"title":"Web fixture","description":"Synthetic only","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb,
 '[{"client_file_id":"21000000-0000-0000-0000-000000000001","byte_length":100,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}]'::jsonb);
 b:=public.reserve_my_listing_upload_v1(p_user,p_identity,(a->>'attempt_id')::uuid,(a->'slots'->0->>'slot_id')::uuid,'71000000-0000-0000-0000-000000000001')->'binding';
 c:=public.claim_listing_upload_sign_v1(p_user,p_identity,(b->>'attempt_id')::uuid,(b->>'slot_id')::uuid,'71000000-0000-0000-0000-000000000001',(b->>'grant_id')::uuid);
 epoch:=(c->>'send_before_epoch')::bigint-30;
 claims:=jsonb_build_object('url',b->>'bucket_id'||'/'||(b->>'object_path'),'upsert',false,'iat',epoch,'exp',epoch+7200);
 token:='eyJhbGciOiJIUzI1NiJ9.'||rtrim(translate(replace(encode(convert_to(claims::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=')||'.syntheticSignature';
 IF p_record THEN PERFORM public.record_listing_upload_grant_v1((b->>'grant_id')::uuid,(c->>'claim_id')::uuid,token,epoch,epoch+7200); END IF;
 INSERT INTO web_test.ctx VALUES(p_user::text||':binding',b);
END $f$;
CREATE FUNCTION web_test.claim(p_key uuid DEFAULT '81000000-0000-0000-0000-000000000001') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.claim_listing_web_image_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 (web_test.b()->>'attempt_id')::uuid,(web_test.b()->>'slot_id')::uuid,p_key) $f$;
CREATE FUNCTION web_test.start() RETURNS void LANGUAGE plpgsql AS $f$
BEGIN INSERT INTO web_test.ctx VALUES('web',web_test.claim()); END $f$;
CREATE FUNCTION web_test.intent() RETURNS jsonb LANGUAGE sql AS $f$
 SELECT jsonb_build_object('pipeline_version','listing-web-v1','content_type','image/webp','source_sha256',repeat('a',64),
 'source_bytes',100,'source_format','png','web_sha256',repeat('b',64),'web_bytes',80,'width',10,'height',20,
 'sharp_version','0.34.5','libvips_version','8.17.3') $f$;
CREATE FUNCTION web_test.prepare(p jsonb DEFAULT web_test.intent()) RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.prepare_listing_web_write_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 (web_test.b()->>'attempt_id')::uuid,(web_test.b()->>'slot_id')::uuid,(web_test.w()->'binding'->>'job_id')::uuid,
 (web_test.w()->>'claim_id')::uuid,p) $f$;
CREATE FUNCTION web_test.ready(p_hash text DEFAULT repeat('b',64),p_bytes integer DEFAULT 80) RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.record_listing_web_ready_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 (web_test.b()->>'attempt_id')::uuid,(web_test.b()->>'slot_id')::uuid,(web_test.w()->'binding'->>'job_id')::uuid,p_hash,p_bytes) $f$;
CREATE FUNCTION web_test.read_ready() RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.get_my_listing_web_ready_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 (web_test.b()->>'attempt_id')::uuid,(web_test.b()->>'slot_id')::uuid) $f$;
CREATE FUNCTION web_test.cancel() RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.cancel_my_listing_publication_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','61000000-0000-0000-0000-000000000001') $f$;


SELECT set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true); SELECT set_config('request.jwt.claims','{}',true);

SAVEPOINT web_case_1;


SELECT web_test.check('closed_anon_claim_listing_web_image_v1',NOT has_function_privilege('anon','public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('closed_anon_prepare_listing_web_write_v1',NOT has_function_privilege('anon','public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb)','EXECUTE'));

SELECT web_test.check('closed_anon_record_listing_web_ready_v1',NOT has_function_privilege('anon','public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer)','EXECUTE'));

SELECT web_test.check('closed_anon_get_my_listing_web_ready_v1',NOT has_function_privilege('anon','public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('web_table_closed_anon',NOT has_table_privilege('anon','listing_publication_private.web_images','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT web_test.expect('actual_direct_web_select_denied_anon','SELECT * FROM listing_publication_private.web_images','42501',NULL,'anon');

SELECT web_test.check('closed_authenticated_claim_listing_web_image_v1',NOT has_function_privilege('authenticated','public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('closed_authenticated_prepare_listing_web_write_v1',NOT has_function_privilege('authenticated','public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb)','EXECUTE'));

SELECT web_test.check('closed_authenticated_record_listing_web_ready_v1',NOT has_function_privilege('authenticated','public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer)','EXECUTE'));

SELECT web_test.check('closed_authenticated_get_my_listing_web_ready_v1',NOT has_function_privilege('authenticated','public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('web_table_closed_authenticated',NOT has_table_privilege('authenticated','listing_publication_private.web_images','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT web_test.expect('actual_direct_web_select_denied_authenticated','SELECT * FROM listing_publication_private.web_images','42501',NULL,'authenticated');

SELECT web_test.check('closed_service_role_claim_listing_web_image_v1',NOT has_function_privilege('service_role','public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('closed_service_role_prepare_listing_web_write_v1',NOT has_function_privilege('service_role','public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb)','EXECUTE'));

SELECT web_test.check('closed_service_role_record_listing_web_ready_v1',NOT has_function_privilege('service_role','public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer)','EXECUTE'));

SELECT web_test.check('closed_service_role_get_my_listing_web_ready_v1',NOT has_function_privilege('service_role','public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid)','EXECUTE'));

SELECT web_test.check('web_table_closed_service_role',NOT has_table_privilege('service_role','listing_publication_private.web_images','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'));

SELECT web_test.expect('actual_direct_web_select_denied_service_role','SELECT * FROM listing_publication_private.web_images','42501',NULL,'service_role');

SELECT web_test.check('web_rls_enabled',(SELECT relrowsecurity FROM pg_class WHERE oid='listing_publication_private.web_images'::regclass));

ROLLBACK TO SAVEPOINT web_case_1; RELEASE SAVEPOINT web_case_1;

SAVEPOINT web_case_2;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.check('one_processing_claim',web_test.w()->>'process_allowed'='true' AND web_test.w()->>'state'='processing');

SELECT web_test.check('claim_binding_exact',web_test.w()->'binding'->>'source_path'=web_test.b()->>'object_path' AND web_test.w()->'binding'->>'web_path'='v1/'||(web_test.b()->>'attempt_id')||'/'||(web_test.b()->>'slot_id')||'/web-v1.webp');

SELECT web_test.check('processing_replay_no_takeover',web_test.claim()->>'process_allowed'='false' AND web_test.claim()->'claim_id'='null'::jsonb);

SELECT web_test.check('no_ready_before_prepare',web_test.read_ready()->'receipt'='null'::jsonb);

SELECT web_test.expect('different_request_key_denied','SELECT web_test.claim(''82000000-0000-0000-0000-000000000001'')','22023','publication_web_request_conflict',NULL);

SELECT web_test.expect('nil_request_key_denied','SELECT web_test.claim(NULL)','22023','publication_web_request_invalid',NULL);

SELECT web_test.expect('no_ready_from_processing','SELECT web_test.ready()','55000','publication_web_not_prepared',NULL);

SELECT web_test.check('one_write_intent',web_test.prepare()->>'write_allowed'='true');

SELECT web_test.check('prepared_replay_never_resends',web_test.prepare()->>'write_allowed'='false' AND web_test.claim()->>'state'='prepared');

SELECT web_test.check('prepared_not_ready',web_test.read_ready()->'receipt'='null'::jsonb);

SELECT web_test.expect('same_key_different_output_denied','SELECT web_test.prepare(web_test.intent()||''{"width":11}''::jsonb)','22023','publication_web_intent_conflict',NULL);

SELECT web_test.expect('hash_mismatch_denied','SELECT web_test.ready(repeat(''c'',64),80)','22023','publication_web_readback_mismatch',NULL);

SELECT web_test.expect('size_mismatch_denied','SELECT web_test.ready(repeat(''b'',64),81)','22023','publication_web_readback_mismatch',NULL);

SELECT web_test.expect('null_readback_denied','SELECT web_test.ready(NULL,NULL)','22023','publication_web_readback_mismatch',NULL);

INSERT INTO web_test.ctx VALUES('ready',web_test.ready());

SELECT web_test.check('readback_produces_ready',(SELECT v->'receipt'->>'web_sha256'=repeat('b',64) AND v->'receipt'->>'web_bytes'='80' FROM web_test.ctx WHERE k='ready'));

SELECT web_test.check('ready_receipt_replay_exact',web_test.ready()=(SELECT v FROM web_test.ctx WHERE k='ready') AND web_test.read_ready()=(SELECT v FROM web_test.ctx WHERE k='ready'));

SELECT web_test.check('ready_never_reprocesses',web_test.claim()->>'process_allowed'='false' AND web_test.prepare()->>'write_allowed'='false');

SELECT web_test.check('public_listing_not_created',(SELECT count(*)=0 FROM public.listings) AND (SELECT count(*)=0 FROM public.listing_images));

SELECT web_test.expect('ready_intent_cannot_change','UPDATE listing_publication_private.web_images SET intent=intent||''{"width":11}''::jsonb','55000','publication_web_immutable',NULL);

SELECT web_test.expect('ready_receipt_cannot_change','UPDATE listing_publication_private.web_images SET ready_id=gen_random_uuid()','55000','publication_web_immutable',NULL);

SELECT web_test.expect('web_row_cannot_delete','DELETE FROM listing_publication_private.web_images','55000','publication_web_lineage_retained',NULL);

SELECT web_test.expect('web_row_cannot_truncate','TRUNCATE listing_publication_private.web_images','55000','publication_web_lineage_retained',NULL);

ROLLBACK TO SAVEPOINT web_case_2; RELEASE SAVEPOINT web_case_2;

SAVEPOINT web_case_3;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_missing_key','SELECT web_test.prepare(web_test.intent()-''width'')','22023',NULL,NULL);

SELECT web_test.check('intent_reject_missing_key_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_3; RELEASE SAVEPOINT web_case_3;

SAVEPOINT web_case_4;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_extra_key','SELECT web_test.prepare(web_test.intent()||''{"url":"evil"}''::jsonb)','22023',NULL,NULL);

SELECT web_test.check('intent_reject_extra_key_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_4; RELEASE SAVEPOINT web_case_4;

SAVEPOINT web_case_5;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_wrong_pipeline','SELECT web_test.prepare(web_test.intent()||''{"pipeline_version":"v2"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_wrong_pipeline_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_5; RELEASE SAVEPOINT web_case_5;

SAVEPOINT web_case_6;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_wrong_type','SELECT web_test.prepare(web_test.intent()||''{"content_type":"image/jpeg"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_wrong_type_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_6; RELEASE SAVEPOINT web_case_6;

SAVEPOINT web_case_7;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_source_hash','SELECT web_test.prepare(web_test.intent()||jsonb_build_object(''source_sha256'',repeat(''c'',64)))','22023','publication_web_source_mismatch',NULL);

SELECT web_test.check('intent_reject_source_hash_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_7; RELEASE SAVEPOINT web_case_7;

SAVEPOINT web_case_8;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_source_length','SELECT web_test.prepare(web_test.intent()||''{"source_bytes":101}''::jsonb)','22023','publication_web_source_mismatch',NULL);

SELECT web_test.check('intent_reject_source_length_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_8; RELEASE SAVEPOINT web_case_8;

SAVEPOINT web_case_9;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_web_oversize','SELECT web_test.prepare(web_test.intent()||''{"web_bytes":4194305}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_web_oversize_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_9; RELEASE SAVEPOINT web_case_9;

SAVEPOINT web_case_10;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_web_small','SELECT web_test.prepare(web_test.intent()||''{"web_bytes":19}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_web_small_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_10; RELEASE SAVEPOINT web_case_10;

SAVEPOINT web_case_11;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_bad_sha','SELECT web_test.prepare(web_test.intent()||''{"web_sha256":"x"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_bad_sha_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_11; RELEASE SAVEPOINT web_case_11;

SAVEPOINT web_case_12;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_string_size','SELECT web_test.prepare(web_test.intent()||''{"web_bytes":"80"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_string_size_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_12; RELEASE SAVEPOINT web_case_12;

SAVEPOINT web_case_13;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_fraction','SELECT web_test.prepare(web_test.intent()||''{"width":1.5}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_fraction_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_13; RELEASE SAVEPOINT web_case_13;

SAVEPOINT web_case_14;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_wide','SELECT web_test.prepare(web_test.intent()||''{"width":2049}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_wide_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_14; RELEASE SAVEPOINT web_case_14;

SAVEPOINT web_case_15;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_height_zero','SELECT web_test.prepare(web_test.intent()||''{"height":0}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_height_zero_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_15; RELEASE SAVEPOINT web_case_15;

SAVEPOINT web_case_16;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_format','SELECT web_test.prepare(web_test.intent()||''{"source_format":"svg"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_format_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_16; RELEASE SAVEPOINT web_case_16;

SAVEPOINT web_case_17;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_engine','SELECT web_test.prepare(web_test.intent()||''{"sharp_version":"future"}''::jsonb)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_engine_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_17; RELEASE SAVEPOINT web_case_17;

SAVEPOINT web_case_18;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('intent_reject_null','SELECT web_test.prepare(NULL)','22023','publication_web_intent_invalid',NULL);

SELECT web_test.check('intent_reject_null_no_transition',(SELECT state='processing' AND intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_18; RELEASE SAVEPOINT web_case_18;

SAVEPOINT web_case_19;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.cancel();

SELECT web_test.expect('cancel_processing_no_new_claim','SELECT web_test.claim()','55000','publication_attempt_closed',NULL);

SELECT web_test.expect('cancel_processing_no_ready','SELECT web_test.ready()','55000','publication_attempt_closed',NULL);

SELECT web_test.check('cancel_processing_web_cleanup',(SELECT c.state='pending' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='web'));

SELECT web_test.check('cancel_processing_source_cleanup',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT web_test.check('cancel_processing_tombstone_no_payload',(SELECT state='cancelled' AND payload IS NULL FROM listing_publication_private.attempts));

ROLLBACK TO SAVEPOINT web_case_19; RELEASE SAVEPOINT web_case_19;

SAVEPOINT web_case_20;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.prepare();

SELECT web_test.cancel();

SELECT web_test.expect('cancel_prepared_no_new_claim','SELECT web_test.claim()','55000','publication_attempt_closed',NULL);

SELECT web_test.expect('cancel_prepared_no_ready','SELECT web_test.ready()','55000','publication_attempt_closed',NULL);

SELECT web_test.check('cancel_prepared_web_cleanup',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='web'));

SELECT web_test.check('cancel_prepared_source_cleanup',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT web_test.check('cancel_prepared_tombstone_no_payload',(SELECT state='cancelled' AND payload IS NULL FROM listing_publication_private.attempts));

ROLLBACK TO SAVEPOINT web_case_20; RELEASE SAVEPOINT web_case_20;

SAVEPOINT web_case_21;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.prepare();

SELECT web_test.ready();

SELECT web_test.cancel();

SELECT web_test.expect('cancel_ready_no_new_claim','SELECT web_test.claim()','55000','publication_attempt_closed',NULL);

SELECT web_test.expect('cancel_ready_no_ready','SELECT web_test.ready()','55000','publication_attempt_closed',NULL);

SELECT web_test.check('cancel_ready_web_cleanup',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='web'));

SELECT web_test.check('cancel_ready_source_cleanup',(SELECT c.state='blocked_write_settlement' FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='source'));

SELECT web_test.check('cancel_ready_tombstone_no_payload',(SELECT state='cancelled' AND payload IS NULL FROM listing_publication_private.attempts));

ROLLBACK TO SAVEPOINT web_case_21; RELEASE SAVEPOINT web_case_21;

SAVEPOINT web_case_22;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.prepare();

SELECT web_test.expect('cannot_queue_pending_web_write','INSERT INTO listing_publication_private.cleanup SELECT id,bucket_id,object_path,''cancelled'',''pending'',clock_timestamp() FROM listing_publication_private.objects WHERE kind=''web''','55000','publication_web_cleanup_write_unsettled',NULL);

SELECT web_test.check('denied_queue_has_no_partial_rows',(SELECT count(*)=0 FROM listing_publication_private.cleanup));

ROLLBACK TO SAVEPOINT web_case_22; RELEASE SAVEPOINT web_case_22;

SAVEPOINT web_case_23;
SELECT web_test.boot(); SELECT web_test.start();

UPDATE public.profiles SET active_identity_id='cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id='11111111-1111-1111-1111-111111111111';

SELECT web_test.expect('changed_identity_cannot_prepare','SELECT web_test.prepare()','42501',NULL,NULL);

SELECT web_test.check('changed_identity_no_write',(SELECT intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_23; RELEASE SAVEPOINT web_case_23;

SAVEPOINT web_case_24;
SELECT web_test.boot(); SELECT web_test.start();

UPDATE public.publication_policy_documents SET status='retired';

SELECT web_test.expect('changed_policy_cannot_prepare','SELECT web_test.prepare()','42501',NULL,NULL);

ROLLBACK TO SAVEPOINT web_case_24; RELEASE SAVEPOINT web_case_24;

SAVEPOINT web_case_25;
SELECT web_test.boot();

GRANT USAGE ON SCHEMA web_test TO authenticated,service_role; GRANT SELECT ON web_test.ctx TO authenticated,service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA web_test TO authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid) TO service_role,authenticated;

SET LOCAL ROLE service_role; SELECT web_test.claim(); RESET ROLE;

SELECT web_test.check('actual_service_role_can_claim',(SELECT count(*)=1 AND bool_and(state='processing') FROM listing_publication_private.web_images));

SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);

SELECT web_test.expect('authenticated_cannot_forge_service','SELECT web_test.claim()','42501','publication_upload_service_required','authenticated');

SELECT set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);

SELECT web_test.expect('authenticated_other_actor_denied','SELECT web_test.read_ready()','42501','publication_account_changed','authenticated');

SELECT web_test.check('failed_role_sub_preserved',current_setting('request.jwt.claim.sub')='22222222-2222-2222-2222-222222222222' AND current_setting('role')='none');

ROLLBACK TO SAVEPOINT web_case_25; RELEASE SAVEPOINT web_case_25;

SAVEPOINT web_case_26;
SELECT web_test.boot(); SELECT web_test.start();

GRANT USAGE ON SCHEMA web_test TO authenticated,service_role; GRANT SELECT ON web_test.ctx TO authenticated,service_role; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA web_test TO authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer) TO service_role,authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid) TO service_role,authenticated;

SET LOCAL ROLE service_role;

SELECT web_test.check('actual_service_prepare',web_test.prepare()->>'write_allowed'='true');

SELECT web_test.check('actual_service_readback_ready',web_test.ready()->'receipt'->>'web_sha256'=repeat('b',64));

RESET ROLE; SET LOCAL ROLE authenticated;

SELECT web_test.check('actual_owner_reader',web_test.read_ready()->'receipt'->>'web_bytes'='80');

RESET ROLE;

ROLLBACK TO SAVEPOINT web_case_26; RELEASE SAVEPOINT web_case_26;

SAVEPOINT web_case_27;
SELECT web_test.boot('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',false);

SELECT web_test.expect('unrecorded_upload_cannot_claim_web','SELECT web_test.claim()','P0002','publication_web_source_unavailable',NULL);

SELECT web_test.check('unrecorded_upload_no_web_job',(SELECT count(*)=0 FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_27; RELEASE SAVEPOINT web_case_27;

SAVEPOINT web_case_28;
SELECT web_test.boot(); SELECT web_test.start();

SELECT web_test.expect('wrong_native_claim_cannot_prepare','SELECT public.prepare_listing_web_write_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',(web_test.b()->>''attempt_id'')::uuid,(web_test.b()->>''slot_id'')::uuid,(web_test.w()->''binding''->>''job_id'')::uuid,''22222222-2222-2222-2222-222222222222'',web_test.intent())','42501','publication_web_claim_invalid',NULL);

SELECT web_test.check('wrong_native_claim_no_write',(SELECT intent IS NULL FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_28; RELEASE SAVEPOINT web_case_28;

SAVEPOINT web_case_29;
SELECT web_test.boot();

INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state) SELECT (web_test.b()->>'attempt_id')::uuid,(web_test.b()->>'slot_id')::uuid,'81000000-0000-0000-0000-000000000001',t,floor(extract(epoch FROM t))::bigint+120,'processing' FROM (SELECT clock_timestamp()-interval '121 seconds' AS t) x; INSERT INTO web_test.ctx SELECT 'web',jsonb_build_object('binding',listing_publication_private.web_binding(id),'claim_id',claim_id) FROM listing_publication_private.web_images;

SELECT web_test.expect('expired_processing_claim_no_write','SELECT web_test.prepare()','55000','publication_web_processing_expired',NULL);

SELECT web_test.check('expired_processing_claim_no_takeover',web_test.claim()->>'process_allowed'='false');

ROLLBACK TO SAVEPOINT web_case_29; RELEASE SAVEPOINT web_case_29;

SAVEPOINT web_case_30;
SELECT web_test.boot();

SELECT web_test.expect('prepared_row_requires_send_deadline','INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state,intent,prepared_at,write_before_epoch) SELECT (web_test.b()->>''attempt_id'')::uuid,(web_test.b()->>''slot_id'')::uuid,''81000000-0000-0000-0000-000000000001'',t,floor(extract(epoch FROM t))::bigint+120,''prepared'',web_test.intent(),t,NULL FROM (SELECT clock_timestamp() t) x','23514',NULL,NULL);

SELECT web_test.check('missing_send_deadline_has_no_partial_row',(SELECT count(*)=0 FROM listing_publication_private.web_images));

ROLLBACK TO SAVEPOINT web_case_30; RELEASE SAVEPOINT web_case_30;
