-- NEW disposable-lab overlay, not a production migration or an API grant.
-- Narrow scope: one acknowledged internal WEB POST; never a reusable SOURCE URL.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;
CREATE TABLE listing_publication_private.web_write_completions (
 job_id uuid PRIMARY KEY REFERENCES listing_publication_private.web_images(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL UNIQUE,
 storage_object_id uuid NOT NULL UNIQUE CHECK(storage_object_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 sent_sha256 text NOT NULL CHECK(sent_sha256 ~ '^[0-9a-f]{64}$' AND char_length(sent_sha256)=64),
 sent_bytes integer NOT NULL CHECK(sent_bytes BETWEEN 20 AND 4194304),
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.web_write_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.web_write_completions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.web_write_completions FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.web_write_completions TO selqiro_listing_final_writer_v1;
CREATE POLICY completion_internal_writer ON listing_publication_private.web_write_completions
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE FUNCTION listing_publication_private.protect_web_completion() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_web_completion_immutable' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.web_images w
  JOIN listing_publication_private.objects o ON o.slot_id=w.slot_id AND o.attempt_id=w.attempt_id AND o.kind='web'
  WHERE w.id=NEW.job_id AND w.claim_id=NEW.claim_id AND o.id=NEW.object_id
   AND w.state IN('prepared','ready') AND w.prepared_at IS NOT NULL AND w.write_before_epoch IS NOT NULL
   AND w.intent->>'web_sha256'=NEW.sent_sha256 AND (w.intent->>'web_bytes')::integer=NEW.sent_bytes
   AND o.bucket_id='listing-publication-private' AND o.dispatch_key IS NULL
   AND o.object_path='v1/'||w.attempt_id::text||'/'||w.slot_id::text||'/web-v1.webp') THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_web_completion BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.web_write_completions
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_completion();
CREATE TRIGGER protect_web_completion_truncate BEFORE TRUNCATE ON listing_publication_private.web_write_completions
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_web_completion();

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- Only immutable one-WEB-write evidence can release a blocked WEB target.
 -- SOURCE grants, readiness, expiry and caller booleans are not settlement.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;

CREATE FUNCTION public.record_listing_web_write_completed_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,
 p_job_id uuid,p_claim_id uuid,p_web_object_id uuid,p_storage_object_id uuid,p_storage_key text,
 p_sent_sha256 text,p_sent_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
 w listing_publication_private.web_images%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 r listing_publication_private.web_write_completions%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_storage_object_id IS NULL OR p_storage_object_id='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 -- Cleanup-only evidence may arrive after cancel, expiry, logout, identity switch or
 -- revocation. Do NOT reopen context or reacquire publication permission here.
 -- Lock the attempt like close/delete; read immutable prepared WEB fields; then cleanup.
 -- No UPDATE privilege on web_images is granted merely to obtain a redundant row lock.
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR a.actor_user_id IS DISTINCT FROM p_expected_user_id
  OR a.identity_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.id=p_job_id;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.id=p_web_object_id;
 IF w.id IS NULL OR o.id IS NULL OR w.attempt_id IS DISTINCT FROM a.id OR w.slot_id IS DISTINCT FROM p_slot_id
  OR w.claim_id IS DISTINCT FROM p_claim_id OR w.state NOT IN('prepared','ready') OR w.prepared_at IS NULL
  OR w.write_before_epoch IS NULL OR o.attempt_id IS DISTINCT FROM a.id OR o.slot_id IS DISTINCT FROM w.slot_id
  OR o.kind<>'web' OR o.dispatch_key IS NOT NULL OR o.bucket_id<>'listing-publication-private'
  OR o.object_path IS DISTINCT FROM 'v1/'||a.id::text||'/'||w.slot_id::text||'/web-v1.webp'
  OR p_storage_key IS DISTINCT FROM o.bucket_id||'/'||o.object_path
  OR p_sent_sha256 IS DISTINCT FROM w.intent->>'web_sha256'
  OR p_sent_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 -- Neither the caller's clock nor write_before_epoch proves completion. A late
 -- genuine terminal HTTP acknowledgement is useful even after this deadline.
 SELECT x.* INTO r FROM listing_publication_private.web_write_completions x WHERE x.job_id=w.id;
 IF FOUND THEN
  IF ROW(r.object_id,r.claim_id,r.storage_object_id,r.sent_sha256,r.sent_bytes)
   IS DISTINCT FROM ROW(o.id,w.claim_id,p_storage_object_id,p_sent_sha256,p_sent_bytes) THEN
   RAISE EXCEPTION 'publication_web_completion_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  INSERT INTO listing_publication_private.web_write_completions(job_id,object_id,claim_id,storage_object_id,sent_sha256,sent_bytes)
   VALUES(w.id,o.id,w.claim_id,p_storage_object_id,p_sent_sha256,p_sent_bytes) RETURNING * INTO r;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='pending'
  WHERE object_id=o.id AND state='blocked_write_settlement';
 RETURN jsonb_build_object('schema_version',1,'job_id',r.job_id,'web_object_id',r.object_id,
  'storage_object_id',r.storage_object_id,'completed',true);
END $f$;
REVOKE ALL ON FUNCTION public.record_listing_web_write_completed_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_web_write_completed_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,integer)
 OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.protect_web_completion() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_web_completion() TO selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.web_write_completions IS
 'Trusted single-WEB-POST terminal response evidence, not SOURCE settlement, readiness, or exclusive-provider-writer proof. Dormant/API-closed.';
