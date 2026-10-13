-- DORMANT V2 WEB-IMAGE LAB. NOT a migration. No Storage call or API grants.
-- Load after the committed attempt 01..05 and upload 01 declarations in a new helper only.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE TABLE listing_publication_private.web_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL,
 slot_id uuid NOT NULL UNIQUE,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 claim_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 claimed_at timestamptz NOT NULL,
 process_before_epoch bigint NOT NULL,
 state text NOT NULL CHECK(state IN('processing','prepared','ready')),
 intent jsonb,
 prepared_at timestamptz,
 write_before_epoch bigint,
 ready_id uuid UNIQUE,
 ready_at timestamptz,
 FOREIGN KEY(slot_id,attempt_id) REFERENCES listing_publication_private.slots(id,attempt_id) ON DELETE RESTRICT,
 CHECK(process_before_epoch=floor(extract(epoch FROM claimed_at))::bigint+120),
 CHECK((state='processing' AND intent IS NULL AND prepared_at IS NULL AND write_before_epoch IS NULL)
    OR (state IN('prepared','ready') AND jsonb_typeof(intent)='object' AND intent IS NOT NULL
      AND prepared_at IS NOT NULL AND write_before_epoch IS NOT NULL AND write_before_epoch=floor(extract(epoch FROM prepared_at))::bigint+30)),
 CHECK((state IN('processing','prepared') AND ready_id IS NULL AND ready_at IS NULL)
    OR (state='ready' AND ready_id IS NOT NULL AND ready_at IS NOT NULL))
);
ALTER TABLE listing_publication_private.web_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.web_images FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_web_image() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP IN('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'publication_web_lineage_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='processing' AND NEW.state='prepared'
  AND (to_jsonb(NEW)-ARRAY['state','intent','prepared_at','write_before_epoch'])=
      (to_jsonb(OLD)-ARRAY['state','intent','prepared_at','write_before_epoch']) THEN RETURN NEW; END IF;
 IF OLD.state='prepared' AND NEW.state='ready'
  AND (to_jsonb(NEW)-ARRAY['state','ready_id','ready_at'])=(to_jsonb(OLD)-ARRAY['state','ready_id','ready_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_web_immutable' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_web_image BEFORE UPDATE OR DELETE ON listing_publication_private.web_images
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_image();
CREATE TRIGGER protect_web_image_truncate BEFORE TRUNCATE ON listing_publication_private.web_images
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_web_image();

-- Actor -> identity -> attempt -> policy -> image is the same lock order as the existing flow.
-- Service authority is the actual SQL role, not a caller-controlled JWT-body claim.
CREATE FUNCTION listing_publication_private.lock_web_context(p_user uuid,p_identity uuid,p_attempt uuid,p_service boolean)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 IF p_service IS NULL THEN RAISE EXCEPTION 'publication_web_invalid' USING ERRCODE='22023'; END IF;
 IF p_service THEN active_id:=listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 ELSE active_id:=listing_publication_private.require_actor(p_user,p_identity); END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.id=p_attempt AND x.actor_user_id=p_user AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF p_service THEN
  PERFORM set_config('request.jwt.claim.sub',p_user::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user)::text,true);
 END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 IF p_service THEN
  PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 RETURN a.id;
END $f$;

CREATE FUNCTION listing_publication_private.web_binding(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,
  'attempt_id',a.id,'slot_id',s.id,'job_id',w.id,'request_key',w.request_key,
  'source_object_id',src.id,'web_object_id',web.id,'bucket_id',src.bucket_id,
  'source_path',src.object_path,'web_path',web.object_path,
  'source_bytes',s.expected_source_bytes,'source_sha256',encode(s.expected_source_sha256,'hex'))
 FROM listing_publication_private.web_images w JOIN listing_publication_private.slots s ON s.id=w.slot_id
 JOIN listing_publication_private.attempts a ON a.id=w.attempt_id
 JOIN listing_publication_private.objects src ON src.slot_id=s.id AND src.kind='source'
 JOIN listing_publication_private.objects web ON web.slot_id=s.id AND web.kind='web'
 WHERE w.id=p_id;
$f$;
CREATE FUNCTION listing_publication_private.web_receipt(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'receipt_id',w.ready_id,'job_id',w.id,'attempt_id',w.attempt_id,
  'slot_id',w.slot_id,'web_sha256',w.intent->>'web_sha256','web_bytes',(w.intent->>'web_bytes')::integer,
  'width',(w.intent->>'width')::integer,'height',(w.intent->>'height')::integer,'pipeline_version','listing-web-v1')
 FROM listing_publication_private.web_images w WHERE w.id=p_id AND w.state='ready';
$f$;

CREATE FUNCTION public.claim_listing_web_image_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_request_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_request_invalid' USING ERRCODE='22023'; END IF;
 -- A successful PUT alone cannot authorize processing. Retain original upload provenance.
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.slots s
  JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='source'
  JOIN listing_publication_private.upload_grants g ON g.object_id=o.id AND g.dispatch_key=o.dispatch_key
  WHERE s.id=p_slot_id AND s.attempt_id=p_attempt_id AND g.state='recorded') THEN
  RAISE EXCEPTION 'publication_web_source_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.slot_id=p_slot_id FOR UPDATE;
 IF FOUND THEN
  IF w.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_web_request_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  t:=clock_timestamp();
  INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state)
   VALUES(p_attempt_id,p_slot_id,p_request_key,t,floor(extract(epoch FROM t))::bigint+120,'processing') RETURNING * INTO w;
  allowed:=true;
 END IF;
 -- No takeover/reprocessing on timeout. Uncertain processing stays visible for reconciliation/cancel.
 RETURN jsonb_build_object('binding',listing_publication_private.web_binding(w.id),'state',w.state,
  'process_allowed',allowed,'claim_id',CASE WHEN allowed THEN w.claim_id ELSE NULL END,
  'process_before_epoch',w.process_before_epoch,'intent',w.intent,'receipt',listing_publication_private.web_receipt(w.id));
END $f$;

CREATE FUNCTION listing_publication_private.validate_web_intent(p_intent jsonb,p_slot uuid) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE s listing_publication_private.slots%ROWTYPE; k text;
BEGIN
 IF p_intent IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR octet_length(p_intent::text)>2048 THEN
  RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 PERFORM public.require_listing_create_keys_v1(p_intent,ARRAY['pipeline_version','content_type','source_sha256','source_bytes',
  'source_format','web_sha256','web_bytes','width','height','sharp_version','libvips_version']);
 FOR k IN SELECT unnest(ARRAY['pipeline_version','content_type','source_sha256','source_format','web_sha256','sharp_version','libvips_version']) LOOP
  IF jsonb_typeof(p_intent->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['source_bytes','web_bytes','width','height']) LOOP
  IF jsonb_typeof(p_intent->k) IS DISTINCT FROM 'number' OR p_intent->>k !~ '^[1-9][0-9]{0,7}$' THEN
   RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF p_intent->>'pipeline_version'<>'listing-web-v1' OR p_intent->>'content_type'<>'image/webp'
  OR p_intent->>'source_format' NOT IN('jpeg','png','webp')
  OR p_intent->>'source_sha256' !~ '^[0-9a-f]{64}$' OR char_length(p_intent->>'source_sha256')<>64
  OR p_intent->>'web_sha256' !~ '^[0-9a-f]{64}$' OR char_length(p_intent->>'web_sha256')<>64
  OR p_intent->>'sharp_version' !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
  OR p_intent->>'libvips_version' !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
  OR (p_intent->>'source_bytes')::integer>26214400 OR (p_intent->>'web_bytes')::integer NOT BETWEEN 20 AND 4194304
  OR (p_intent->>'width')::integer>2048 OR (p_intent->>'height')::integer>2048 THEN
  RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO s FROM listing_publication_private.slots x WHERE x.id=p_slot;
 IF NOT FOUND OR encode(s.expected_source_sha256,'hex') IS DISTINCT FROM p_intent->>'source_sha256'
  OR s.expected_source_bytes IS DISTINCT FROM (p_intent->>'source_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_source_mismatch' USING ERRCODE='22023'; END IF;
 RETURN p_intent;
END $f$;

CREATE FUNCTION public.prepare_listing_web_write_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_claim_id uuid,p_intent jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; v jsonb; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.claim_id IS DISTINCT FROM p_claim_id THEN RAISE EXCEPTION 'publication_web_claim_invalid' USING ERRCODE='42501'; END IF;
 v:=listing_publication_private.validate_web_intent(p_intent,p_slot_id);
 IF w.state='processing' THEN
  t:=clock_timestamp();
  IF floor(extract(epoch FROM t))::bigint>=w.process_before_epoch THEN
   RAISE EXCEPTION 'publication_web_processing_expired' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.web_images SET state='prepared',intent=v,prepared_at=t,
   write_before_epoch=floor(extract(epoch FROM t))::bigint+30 WHERE id=w.id RETURNING * INTO w;
  allowed:=true;
 ELSIF w.intent IS DISTINCT FROM v THEN RAISE EXCEPTION 'publication_web_intent_conflict' USING ERRCODE='22023';
 END IF;
 -- This transaction MUST be acknowledged before the one Storage POST. Never extend/reissue.
 RETURN jsonb_build_object('binding',listing_publication_private.web_binding(w.id),'intent',w.intent,
  'write_allowed',allowed,'write_before_epoch',w.write_before_epoch);
END $f$;

CREATE FUNCTION public.record_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_observed_sha256 text,p_observed_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.state NOT IN('prepared','ready') THEN RAISE EXCEPTION 'publication_web_not_prepared' USING ERRCODE='55000'; END IF;
 -- Trusted server supplies these ONLY after a bounded authenticated full-object GET,
 -- hashing the actual bytes, not trusting Storage metadata/ETag/a client statement.
 IF p_observed_sha256 IS DISTINCT FROM w.intent->>'web_sha256'
  OR p_observed_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_readback_mismatch' USING ERRCODE='22023'; END IF;
 IF w.state='prepared' THEN
  UPDATE listing_publication_private.web_images SET state='ready',ready_id=gen_random_uuid(),ready_at=clock_timestamp()
   WHERE id=w.id RETURNING * INTO w;
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.web_receipt(w.id));
END $f$;

CREATE FUNCTION public.get_my_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,false);
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id;
 RETURN jsonb_build_object('receipt',listing_publication_private.web_receipt(w.id));
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
