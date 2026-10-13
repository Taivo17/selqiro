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
