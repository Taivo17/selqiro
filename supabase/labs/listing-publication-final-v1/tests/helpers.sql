-- New synthetic final lifecycle helpers. Never loaded outside the disposable lab.
CREATE SCHEMA final_test;
CREATE TABLE final_test.ctx(k text PRIMARY KEY,v jsonb NOT NULL);
CREATE FUNCTION final_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'final_test_failed:%',label; END IF; RETURN 'PASS|'||label; END $f$;
CREATE FUNCTION final_test.expect(label text,q text,s text,msg text DEFAULT NULL,r text DEFAULT NULL) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE got text;m text;
BEGIN
 IF r IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I',r); END IF;
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE,m=MESSAGE_TEXT; END;
 IF r IS NOT NULL THEN RESET ROLE; END IF;
 IF got IS DISTINCT FROM s OR (msg IS NOT NULL AND m IS DISTINCT FROM msg) THEN
 RAISE EXCEPTION 'final_test_failed:%:expected=%:actual=%',label,s,coalesce(got,'NO_ERROR'); END IF;
 RETURN final_test.check(label,true);
END $f$;
CREATE FUNCTION final_test.actor(u uuid DEFAULT '11111111-1111-1111-1111-111111111111') RETURNS void LANGUAGE plpgsql AS $f$
BEGIN PERFORM set_config('request.jwt.claim.sub',u::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u)::text,true); END $f$;
CREATE FUNCTION final_test.v(k text) RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM final_test.ctx WHERE ctx.k=$1 $f$;
CREATE FUNCTION final_test.a(k text DEFAULT 'one') RETURNS uuid LANGUAGE sql AS $f$ SELECT (final_test.v(k)->>'attempt_id')::uuid $f$;
CREATE FUNCTION final_test.l(k text DEFAULT 'one') RETURNS bigint LANGUAGE sql AS $f$ SELECT listing_id FROM listing_publication_private.publications WHERE attempt_id=final_test.a(k) $f$;
CREATE FUNCTION final_test.boot(k text DEFAULT 'one',n integer DEFAULT 0,ready boolean DEFAULT true,
 u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 price jsonb DEFAULT '{"kind":"fixed","amount":"123.40","currency":"EUR"}') RETURNS void LANGUAGE plpgsql AS $f$
DECLARE input jsonb; images jsonb:='[]';a jsonb;b jsonb;c jsonb;w jsonb;slot jsonb;claims jsonb;token text;epoch bigint;j integer;d uuid;intent jsonb;
BEGIN
 PERFORM final_test.actor(u);
 input:='{"basics":{"title":"Final fixture","description":"Synthetic only","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb;
 input:=jsonb_set(input,'{price}',price);
 FOR j IN 1..n LOOP images:=images||jsonb_build_array(jsonb_build_object('client_file_id',gen_random_uuid(),'byte_length',100,'sha256',repeat('a',64)));END LOOP;
 a:=public.prepare_my_listing_publication_v1(u,i,gen_random_uuid(),input,images);
 INSERT INTO final_test.ctx VALUES(k,a),(k||':input',input),(k||':images',images);
 IF NOT ready THEN RETURN; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(a->'slots') LOOP
  d:=gen_random_uuid();
  b:=public.reserve_my_listing_upload_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,d)->'binding';
  c:=public.claim_listing_upload_sign_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,d,(b->>'grant_id')::uuid);
  epoch:=(c->>'send_before_epoch')::bigint-30;
  claims:=jsonb_build_object('url',b->>'bucket_id'||'/'||(b->>'object_path'),'upsert',false,'iat',epoch,'exp',epoch+7200);
  token:='eyJhbGciOiJIUzI1NiJ9.'||rtrim(translate(replace(encode(convert_to(claims::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=')||'.syntheticSignature';
  PERFORM public.record_listing_upload_grant_v1((b->>'grant_id')::uuid,(c->>'claim_id')::uuid,token,epoch,epoch+7200);
  w:=public.claim_listing_web_image_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,gen_random_uuid());
  intent:=jsonb_build_object('pipeline_version','listing-web-v1','content_type','image/webp','source_sha256',repeat('a',64),
   'source_bytes',100,'source_format','png','web_sha256',repeat('b',64),'web_bytes',80,'width',10,'height',20,'sharp_version','0.34.5','libvips_version','8.17.3');
  PERFORM public.prepare_listing_web_write_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,(w->'binding'->>'job_id')::uuid,(w->>'claim_id')::uuid,intent);
  PERFORM public.record_listing_web_ready_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,(w->'binding'->>'job_id')::uuid,repeat('b',64),80);
 END LOOP;
END $f$;
CREATE FUNCTION final_test.confirm(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;BEGIN c:=public.get_my_listing_publication_confirmation_v1(u,i,final_test.a(k));
 INSERT INTO final_test.ctx VALUES(k||':confirm',c) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v; RETURN c; END $f$;
CREATE FUNCTION final_test.publish(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;r jsonb;BEGIN c:=final_test.v(k||':confirm');IF c IS NULL THEN c:=final_test.confirm(k,u,i);END IF;
 r:=public.publish_my_listing_v1(u,i,final_test.a(k),c->'confirmation'->>'confirmation_sha256');
 INSERT INTO final_test.ctx VALUES(k||':result',r) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;RETURN r;END $f$;
CREATE FUNCTION final_test.cancel(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.cancel_my_listing_publication_v1(u,i,(final_test.v(k)->>'request_key')::uuid) $f$;
CREATE FUNCTION final_test.remove(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.delete_my_published_listing_v1(u,i,final_test.l(k)::text) $f$;
CREATE FUNCTION final_test.claim(k text DEFAULT 'claim') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;BEGIN c:=public.claim_listing_cleanup_v1();INSERT INTO final_test.ctx VALUES(k,coalesce(c,'null'::jsonb)) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;RETURN c;END $f$;
CREATE FUNCTION final_test.ack(k text DEFAULT 'claim',outcome text DEFAULT 'deleted') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.record_listing_cleanup_v1((final_test.v(k)->>'object_id')::uuid,(final_test.v(k)->>'work_key')::uuid,outcome) $f$;
