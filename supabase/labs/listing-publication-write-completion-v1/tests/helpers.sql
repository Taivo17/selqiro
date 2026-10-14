-- NEW assertion helpers only in the fresh disposable test database.
CREATE SCHEMA completion_test;
CREATE FUNCTION completion_test.boot(k text DEFAULT 'one',n integer DEFAULT 1,ready boolean DEFAULT true,
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
  IF ready THEN PERFORM public.record_listing_web_ready_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,(w->'binding'->>'job_id')::uuid,repeat('b',64),80); END IF;
 END LOOP;
END $f$;

CREATE FUNCTION completion_test.obj(kind text,k text DEFAULT 'one') RETURNS uuid LANGUAGE sql AS $f$
 SELECT o.id FROM listing_publication_private.objects o WHERE o.attempt_id=final_test.a(k) AND o.kind=$1 $f$;
CREATE FUNCTION completion_test.args(k text DEFAULT 'one') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT jsonb_build_object('u',a.actor_user_id,'i',a.identity_id,'a',a.id,'s',w.slot_id,'j',w.id,'c',w.claim_id,
  'o',o.id,'key',o.bucket_id||'/'||o.object_path,'hash',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer)
 FROM listing_publication_private.attempts a JOIN listing_publication_private.web_images w ON w.attempt_id=a.id
 JOIN listing_publication_private.objects o ON o.slot_id=w.slot_id AND o.kind='web' WHERE a.id=final_test.a(k) $f$;
CREATE FUNCTION completion_test.record(k text DEFAULT 'one',provider uuid DEFAULT '15151515-1515-1515-1515-151515151515',patch jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE p jsonb:=completion_test.args(k)||patch;
BEGIN RETURN public.record_listing_web_write_completed_v1((p->>'u')::uuid,(p->>'i')::uuid,(p->>'a')::uuid,(p->>'s')::uuid,
 (p->>'j')::uuid,(p->>'c')::uuid,(p->>'o')::uuid,provider,p->>'key',p->>'hash',(p->>'bytes')::integer); END $f$;
