-- Execute only inside the installer's outer rollback in the NEW disposable fixture.
-- Retained core/basic functions, currency registry and fixture are loaded by the runner.
CREATE TEMP TABLE edit_test_labels (position integer GENERATED ALWAYS AS IDENTITY, label text NOT NULL UNIQUE);
CREATE TEMP TABLE edit_test_capture (position integer GENERATED ALWAYS AS IDENTITY, name text NOT NULL UNIQUE, item jsonb NOT NULL);
CREATE FUNCTION pg_temp.edit_assert(ok boolean, label text) RETURNS void LANGUAGE plpgsql AS $fn$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'EDIT_ASSERT_FAILED: %', label; END IF;
  INSERT INTO pg_temp.edit_test_labels(label) VALUES (label);
  RAISE NOTICE 'EDIT_PASS: %', label;
END $fn$;
CREATE FUNCTION pg_temp.edit_error(statement text, code text, message text, label text)
RETURNS void LANGUAGE plpgsql AS $fn$
DECLARE caught_code text; caught_message text;
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS caught_code = RETURNED_SQLSTATE, caught_message = MESSAGE_TEXT; END;
  PERFORM pg_temp.edit_assert(caught_code IS NOT DISTINCT FROM code AND caught_message IS NOT DISTINCT FROM message, label);
END $fn$;
CREATE FUNCTION pg_temp.edit_capture_save(label text, key jsonb, baseline jsonb, basics jsonb, price_change jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE response jsonb; command jsonb;
BEGIN
  response := public.save_my_listing_edit_v1(key->>'listingId',(key->>'identityId')::uuid,(key->>'userId')::uuid,
    baseline->'basics',basics,price_change,CASE WHEN price_change IS NOT NULL THEN baseline->'price'->>'revision' ELSE NULL END);
  command := jsonb_build_object('key',key,'baseline',baseline,'basics',basics)
    || CASE WHEN price_change IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('priceChange',price_change) END;
  INSERT INTO pg_temp.edit_test_capture(name,item) VALUES (label,jsonb_build_object('name',label,'type','save','command',command,'response',response));
  RETURN response;
END $fn$;
-- Explicit access only to this session's disposable temporary test namespace.
DO $test_acl$ DECLARE ns text; BEGIN
  SELECT nspname INTO STRICT ns FROM pg_namespace WHERE oid=pg_my_temp_schema();
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated',ns);
END $test_acl$;
GRANT ALL ON pg_temp.edit_test_labels,pg_temp.edit_test_capture TO authenticated;
GRANT USAGE ON SEQUENCE pg_temp.edit_test_labels_position_seq,pg_temp.edit_test_capture_position_seq TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.edit_assert(boolean,text),pg_temp.edit_error(text,text,text,text),
  pg_temp.edit_capture_save(text,jsonb,jsonb,jsonb,jsonb) TO authenticated;

SELECT pg_temp.edit_assert(NOT has_function_privilege('anon','public.get_my_listing_edit_v1(text,uuid,uuid)','EXECUTE'),'closed_read_anon');
SELECT pg_temp.edit_assert(NOT has_function_privilege('authenticated','public.get_my_listing_edit_v1(text,uuid,uuid)','EXECUTE'),'closed_read_authenticated');
SELECT pg_temp.edit_assert(NOT has_function_privilege('service_role','public.get_my_listing_edit_v1(text,uuid,uuid)','EXECUTE'),'closed_read_service');
SELECT pg_temp.edit_assert(NOT has_function_privilege('anon','public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'closed_save_anon');
SELECT pg_temp.edit_assert(NOT has_function_privilege('authenticated','public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'closed_save_authenticated');
SELECT pg_temp.edit_assert(NOT has_function_privilege('service_role','public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'closed_save_service');
-- Temporary grants belong ONLY to this rollback test, never to the candidate SQL.
GRANT EXECUTE ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid),
  public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text) TO authenticated;
UPDATE public.listings SET description=NULL,condition=NULL WHERE id=1001;
CREATE TEMP TABLE edit_preserved AS SELECT to_jsonb(l)-ARRAY['title','description','condition','price','price_amount','currency','price_kind','price_revision','search_text','search_vector','updated_by_user_id'] AS value FROM public.listings l WHERE id=1001;
GRANT SELECT ON pg_temp.edit_preserved TO authenticated;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE actor uuid:='11111111-1111-4111-8111-111111111111'; identity_id uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 key jsonb; response jsonb; baseline jsonb; result jsonb; current_snapshot jsonb;
BEGIN
 key:=jsonb_build_object('listingId','1001','identityId',identity_id::text,'userId',actor::text);
 response:=public.get_my_listing_edit_v1('1001',identity_id,actor);baseline:=response->'snapshot';
 INSERT INTO pg_temp.edit_test_capture(name,item) VALUES ('read_legacy',jsonb_build_object('name','read_legacy','type','read','key',key,'response',response));
 PERFORM pg_temp.edit_assert(response->>'actor_id'=actor::text AND response->>'schema_version'='1','read_actor_envelope');
 PERFORM pg_temp.edit_assert(baseline->'basics'->'description'='null'::jsonb AND baseline->'basics'->'condition'='null'::jsonb,'raw_null_baseline');
 PERFORM pg_temp.edit_assert(baseline->'price'->>'legacy_text'='5578' AND baseline->'price'->'currency'='null'::jsonb,'legacy_price_no_currency_inference');
 PERFORM pg_temp.edit_assert(NOT has_function_privilege(current_user,'public.save_my_listing_basics_v1(text,uuid,jsonb,jsonb,jsonb,text)','EXECUTE'),'inner_writer_still_closed');
 result:=pg_temp.edit_capture_save('save_fixed',key,baseline,
  jsonb_build_object('title',E'  Changed\t title  ','description','','condition',NULL),
  jsonb_build_object('kind','fixed','amount','999999999999999999.999','currency','KWD'));
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'amount'='999999999999999999.999' AND result->'snapshot'->'price'->>'revision'='1','fixed_maximum_exact');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'basics'->>'title'='Changed title' AND result->>'basics_changed'='true' AND result->>'price_changed'='true','canonical_basics_and_flags');
 response:=public.get_my_listing_edit_v1('1001',identity_id,actor);
 INSERT INTO pg_temp.edit_test_capture(name,item) VALUES ('read_fixed',jsonb_build_object('name','read_fixed','type','read','key',key,'response',response));
 PERFORM pg_temp.edit_assert(response->'snapshot'=result->'snapshot','read_after_save_matches');
 baseline:=response->'snapshot';
 -- Another successful edit changes only the price before an omitted-price save.
 PERFORM public.save_my_listing_edit_v1('1001',identity_id,actor,baseline->'basics',baseline->'basics',
  '{"kind":"fixed","amount":"91.5","currency":"USD"}'::jsonb,'1');
 result:=pg_temp.edit_capture_save('save_omitted',key,baseline,
  '{"title":"Second title","description":"","condition":null}'::jsonb);
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'amount'='91.5' AND result->'snapshot'->'price'->>'revision'='2' AND result->>'price_changed'='false','omitted_price_preserves_other_edit');
 baseline:=result->'snapshot';
 result:=pg_temp.edit_capture_save('save_free',key,baseline,baseline->'basics','{"kind":"free","amount":null,"currency":null}');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'kind'='free','free_kind');baseline:=result->'snapshot';
 result:=pg_temp.edit_capture_save('save_negotiable',key,baseline,baseline->'basics','{"kind":"negotiable","amount":null,"currency":null}');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'kind'='negotiable','negotiable_kind');baseline:=result->'snapshot';
 result:=pg_temp.edit_capture_save('save_unspecified',key,baseline,baseline->'basics','{"kind":"unspecified","amount":null,"currency":null}');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'kind'='unspecified','unspecified_kind');baseline:=result->'snapshot';
 result:=pg_temp.edit_capture_save('save_zero',key,baseline,baseline->'basics','{"kind":"fixed","amount":"0","currency":"JPY"}');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'kind'='fixed' AND result->'snapshot'->'price'->>'amount'='0','zero_is_fixed');baseline:=result->'snapshot';
 result:=pg_temp.edit_capture_save('save_aed',key,baseline,baseline->'basics','{"kind":"fixed","amount":"12.50","currency":"AED"}');
 PERFORM pg_temp.edit_assert(result->'snapshot'->'price'->>'amount'='12.5' AND result->'snapshot'->'price'->>'currency'='AED','expanded_registry_reused');
 current_snapshot:=result->'snapshot';
 PERFORM pg_temp.edit_error(format('SELECT public.save_my_listing_edit_v1(%L,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb,%L::jsonb,%L)',
  '1001',identity_id,actor,baseline->'basics',jsonb_build_object('title','Must not save','description','','condition',NULL),
  '{"kind":"fixed","amount":"9","currency":"EUR"}',baseline->'price'->>'revision'),'40001','listing_price_conflict','stale_price_conflict');
 PERFORM pg_temp.edit_assert((public.get_my_listing_edit_v1('1001',identity_id,actor)->'snapshot')=current_snapshot,'conflict_preserves_both_basics_and_price');
 PERFORM pg_temp.edit_error(format('SELECT public.get_my_listing_edit_v1(%L,%L::uuid,%L::uuid)','1001',identity_id,'22222222-2222-4222-8222-222222222222'),
  '42501','listing_edit_actor_changed','wrong_actor_read_rejected');
 PERFORM pg_temp.edit_error(format('SELECT public.get_my_listing_edit_v1(%L,%L::uuid,%L::uuid)','1001','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',actor),
  '42501','listing_price_identity_changed','wrong_identity_read_rejected');
 PERFORM pg_temp.edit_error(format('SELECT public.save_my_listing_edit_v1(%L,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb)',
  '1001',identity_id,actor,jsonb_build_object('title','stale','description','','condition',NULL),current_snapshot->'basics'),
  '40001','listing_basics_conflict','stale_basics_rejected');
 PERFORM pg_temp.edit_assert((SELECT to_jsonb(l)-ARRAY['title','description','condition','price','price_amount','currency','price_kind','price_revision','search_text','search_vector','updated_by_user_id'] FROM public.listings l WHERE id=1001)
  =(SELECT value FROM pg_temp.edit_preserved),'unrelated_listing_fields_preserved');
END $test$;
RESET ROLE;
-- Two different accounts are authorized members of the SAME business; expected actor must still bind exactly.
INSERT INTO public.business_members(business_account_id,user_id,role,status) VALUES
 ('99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222','member','active');
UPDATE public.profiles SET active_identity_id='cccccccc-cccc-4ccc-8ccc-cccccccccccc' WHERE id='22222222-2222-4222-8222-222222222222';
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
SET LOCAL ROLE authenticated;
DO $test$
DECLARE actor uuid:='22222222-2222-4222-8222-222222222222'; identity_id uuid:='cccccccc-cccc-4ccc-8ccc-cccccccccccc'; response jsonb; key jsonb;
BEGIN
 key:=jsonb_build_object('listingId','1003','identityId',identity_id::text,'userId',actor::text);
 response:=public.get_my_listing_edit_v1('1003',identity_id,actor);
 INSERT INTO pg_temp.edit_test_capture(name,item) VALUES ('read_business',jsonb_build_object('name','read_business','type','read','key',key,'response',response));
 PERFORM pg_temp.edit_assert(response->>'actor_id'=actor::text,'business_current_actor_read');
 PERFORM pg_temp.edit_error(format('SELECT public.save_my_listing_edit_v1(%L,%L::uuid,%L::uuid,%L::jsonb,%L::jsonb)',
  '1003',identity_id,'33333333-3333-4333-8333-333333333333',response->'snapshot'->'basics',response->'snapshot'->'basics'),
  '42501','listing_edit_actor_changed','same_business_other_actor_rejected');
 PERFORM pg_temp.edit_assert(public.get_my_listing_edit_v1('1003',identity_id,actor)=response,'other_actor_rejection_preserves_row');
END $test$;
RESET ROLE;
SELECT 'EDIT_CAPTURE:'||jsonb_build_object('format','listing_edit_client_capture_v1',
 'entries',(SELECT jsonb_agg(item ORDER BY position) FROM pg_temp.edit_test_capture),
 'labels',(SELECT jsonb_agg(label ORDER BY position) FROM pg_temp.edit_test_labels))::text;
