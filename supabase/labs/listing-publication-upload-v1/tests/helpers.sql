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
