-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
-- INTERNAL ONLY. A durable pre-dispatch record, NOT a signed URL, expiry or upload confirmation.
-- No API role gets EXECUTE. Later server integration must commit this result before contacting Storage.
CREATE FUNCTION listing_publication_private.reserve_upload_dispatch_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; s listing_publication_private.slots%ROWTYPE;
 policies jsonb; allowed boolean:=false;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_dispatch_key IS NULL OR p_dispatch_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_dispatch_key_invalid' USING ERRCODE='22023';
 END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';
 END IF;
 policies:=listing_publication_private.require_policies();
 IF policies IS DISTINCT FROM a.policy_snapshot THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 SELECT x.* INTO s FROM listing_publication_private.slots x WHERE x.id=p_slot_id AND x.attempt_id=a.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_slot_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.slot_id=s.id AND x.kind='source' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_object_lineage_missing' USING ERRCODE='55000'; END IF;
 IF o.dispatch_key IS NOT NULL THEN
  IF o.dispatch_key IS DISTINCT FROM p_dispatch_key THEN
   RAISE EXCEPTION 'publication_dispatch_conflict' USING ERRCODE='22023';
  END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM listing_publication_private.objects x WHERE x.attempt_id=a.id AND x.dispatch_key=p_dispatch_key) THEN
   RAISE EXCEPTION 'publication_dispatch_conflict' USING ERRCODE='22023';
  END IF;
  IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.objects SET dispatch_key=p_dispatch_key,dispatch_recorded_at=clock_timestamp()
   WHERE id=o.id RETURNING * INTO o;
  allowed:=true;
 END IF;
 -- Only the FIRST confirmed reservation can request signing. Lost/uncertain responses never mint again.
 RETURN jsonb_build_object('schema_version',1,'attempt_id',a.id::text,'slot_id',s.id::text,
  'object_id',o.id::text,'dispatch_key',o.dispatch_key::text,'dispatch_allowed',allowed,
  'bucket_id',o.bucket_id,'object_path',o.object_path,
  'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex'));
END $fn$;
REVOKE ALL ON FUNCTION listing_publication_private.reserve_upload_dispatch_v1(uuid,uuid,uuid,uuid,uuid)
FROM PUBLIC,anon,authenticated,service_role;
