-- DORMANT LAB ONLY. Existing source bytes stay unchanged; no API grant or Storage call.
-- A signing response can create a secret on the server without releasing a capability.
-- The unchanged issuer records that secret in a COMMITTED RPC before the owner getter.
-- Thus current state=signing + terminal attempt proves the getter never released it.
-- This is NOT revocation of a recorded token, request expiry or a provider drain.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;

CREATE TABLE listing_publication_private.source_no_release (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 grant_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL UNIQUE,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.source_no_release ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.source_no_release FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.source_no_release FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.source_no_release TO selqiro_listing_final_writer_v1;
CREATE POLICY source_no_release_internal ON listing_publication_private.source_no_release
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_source_no_release() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
 g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_source_no_release_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=NEW.object_id;
 -- Same attempt lock as grant recording, owner retrieval and cancellation. Never
 -- hold a grant row then request a profile; no reverse profile/attempt ordering.
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 IF o.id IS NULL OR a.id IS NULL OR g.id IS NULL OR o.kind<>'source'
  OR a.state NOT IN('cancelled','expired','deleted')
  OR o.bucket_id<>'listing-publication-private'
  OR o.object_path<>'v1/'||a.id::text||'/'||o.slot_id::text||'/source.upload'
  OR g.object_id<>o.id OR g.dispatch_key IS DISTINCT FROM o.dispatch_key
  OR g.state<>'signing' OR g.claim_id IS DISTINCT FROM NEW.claim_id OR g.claimed_at IS NULL
  OR g.token IS NOT NULL OR g.token_sha256 IS NOT NULL OR g.recorded_at IS NOT NULL
  OR g.issued_epoch IS NOT NULL OR g.expires_epoch IS NOT NULL OR g.token_purged_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id
     AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path AND c.state='blocked_write_settlement') THEN
  RAISE EXCEPTION 'publication_source_no_release_binding' USING ERRCODE='22023'; END IF;
 NEW.recorded_at:=clock_timestamp();
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_no_release BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_no_release FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_no_release();
CREATE TRIGGER protect_source_no_release_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_no_release FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_no_release();

-- A late broker may still RECEIVE a signing response. It cannot subsequently
-- persist/release that token once this permanent no-release witness was committed.
-- This trigger is deliberately also applied to the unchanged legacy record RPC.
CREATE FUNCTION listing_publication_private.guard_source_grant_after_no_release() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.state='recorded' AND OLD.state='signing' THEN
  PERFORM 1 FROM listing_publication_private.attempts a
   JOIN listing_publication_private.objects o ON o.attempt_id=a.id WHERE o.id=OLD.object_id FOR UPDATE OF a;
  IF EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=OLD.object_id) THEN
   RAISE EXCEPTION 'publication_source_release_sealed' USING ERRCODE='55000'; END IF;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER source_grant_no_release_fence BEFORE UPDATE ON listing_publication_private.upload_grants
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_source_grant_after_no_release();

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
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
 -- An immutable POST completion OR narrowly proved write settlement may release this target.
 -- Signed SOURCE expiry/readiness/client booleans remain insufficient.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id))
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

CREATE FUNCTION public.settle_unreleased_listing_source_one_v1() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 c listing_publication_private.cleanup%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 -- Acquire attempt BEFORE cleanup; grant recorder and cancellation use this lock.
 -- A busy attempt is skipped. One bounded database transaction, no external I/O/lease.
 SELECT x.* INTO o FROM listing_publication_private.objects x
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 JOIN listing_publication_private.upload_grants ug ON ug.object_id=x.id
 JOIN listing_publication_private.cleanup q ON q.object_id=x.id
 WHERE a.state IN('cancelled','expired','deleted') AND x.kind='source'
  AND x.bucket_id='listing-publication-private' AND x.dispatch_key=ug.dispatch_key
  AND q.bucket_id=x.bucket_id AND q.object_path=x.object_path AND q.state='blocked_write_settlement'
  AND ug.state='signing' AND ug.claim_id IS NOT NULL AND ug.token_sha256 IS NULL
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=x.id)
 ORDER BY q.enqueued_at,x.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id;
 IF c.state<>'blocked_write_settlement' OR g.state<>'signing' THEN RETURN NULL; END IF;
 INSERT INTO listing_publication_private.source_no_release(object_id,grant_id,claim_id) VALUES(o.id,g.id,g.claim_id);
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'grant_id',g.id,'claim_id',g.claim_id,
  'proof','source_signing_never_released','state','settled');
END $f$;

REVOKE ALL ON FUNCTION public.settle_unreleased_listing_source_one_v1(),
 listing_publication_private.protect_source_no_release(),listing_publication_private.guard_source_grant_after_no_release()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_no_release(),
 listing_publication_private.guard_source_grant_after_no_release() TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.settle_unreleased_listing_source_one_v1() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
-- Trigger function owns only the narrow final-writer capabilities, not postgres.
GRANT CREATE ON SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.guard_source_grant_after_no_release() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA listing_publication_private FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.source_no_release IS
 'Terminal source signing never released by the record-before-get broker. Permanent no-release witness; NOT revocation of a recorded/exposed token, expiry/drain evidence, or Storage deletion. API-closed lab only.';
