-- Continue the same disposable attempt flow after owner cancel/delete. Abort is
-- withdrawal of a known uploadId, NOT a drain receipt or a fabricated Complete.
-- The actual stopped-process/volume oracle must follow before cleanup unblocks.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
  OR current_setting('selqiro.integration_scope',true) IS DISTINCT FROM 'disposable-v2' THEN
  RAISE EXCEPTION 'publication_disposable_integration_required'; END IF;
END $gate$;

-- Preserve a concrete terminal image/processor reason across route/module
-- boundaries. No new decoder, processing takeover, or fabricated WEB receipt.
ALTER TABLE listing_publication_private.multipart_sessions DROP CONSTRAINT multipart_sessions_problem_check;
ALTER TABLE listing_publication_private.multipart_sessions ADD CONSTRAINT multipart_sessions_problem_check
 CHECK(problem IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired','image_rejected','image_processor_unavailable'));
CREATE OR REPLACE FUNCTION public.record_listing_multipart_problem_v2(p_object_id uuid,p_problem text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; aid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT attempt_id INTO aid FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=aid FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=p_object_id FOR UPDATE;
 IF m.id IS NULL OR p_problem IS NULL OR p_problem NOT IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired','image_rejected','image_processor_unavailable') THEN
  RAISE EXCEPTION 'publication_multipart_problem' USING ERRCODE='22023'; END IF;
 IF m.problem IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET problem=p_problem,state=CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'needs_attention' END
   WHERE object_id=p_object_id;
 END IF;
 RETURN listing_publication_private.multipart_binding(p_object_id);
END $f$;

CREATE TABLE listing_publication_private.multipart_abort_observations (
 session_id uuid PRIMARY KEY REFERENCES listing_publication_private.multipart_sessions(id) ON DELETE RESTRICT,
 abort_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 outcome text CHECK(outcome IN('aborted','absent')),
 observed_at timestamptz,
 CHECK((outcome IS NULL)=(observed_at IS NULL))
);
ALTER TABLE listing_publication_private.multipart_abort_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_abort_observations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.multipart_abort_observations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.multipart_abort_observations TO selqiro_listing_final_writer_v1;
CREATE POLICY multipart_abort_internal ON listing_publication_private.multipart_abort_observations
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_multipart_abort() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.outcome IS NOT NULL OR NEW.observed_at IS NOT NULL OR NOT EXISTS(
   SELECT 1 FROM listing_publication_private.multipart_sessions m
   JOIN listing_publication_private.objects o ON o.id=m.object_id
   JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
   WHERE m.id=NEW.session_id AND m.upload_id IS NOT NULL AND m.create_received_at IS NOT NULL
    AND m.completed_at IS NULL AND a.state IN('cancelled','expired','deleted')) THEN
   RAISE EXCEPTION 'publication_multipart_abort_context' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.session_id,NEW.abort_key,NEW.requested_at) IS DISTINCT FROM ROW(OLD.session_id,OLD.abort_key,OLD.requested_at)
  OR OLD.observed_at IS NOT NULL OR NEW.observed_at IS NULL OR NEW.outcome IS NULL THEN
  RAISE EXCEPTION 'publication_multipart_abort_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_multipart_abort BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_abort_observations
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_abort();
CREATE TRIGGER protect_multipart_abort_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_abort_observations
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_abort();

CREATE FUNCTION listing_publication_private.lock_multipart_cleanup_context(p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 -- The current authorizer may be another active business member of the same
 -- identity. The accepted identity lock above checks their actual access; the
 -- original publisher remains unchanged in attempts/publication receipts.
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt
  AND identity_id=active_id AND request_key=p_request FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts m WHERE m.attempt_id=a.id) THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 IF a.state NOT IN('cancelled','expired','deleted','published') THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_not_terminal' USING ERRCODE='55000'; END IF;
 RETURN a.id;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_multipart_auxiliary() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'postgres' OR current_database()<>'selqiro_publication_attempt_fixture'
  OR current_setting('selqiro.integration_scope',true) IS DISTINCT FROM 'disposable-v2' THEN
  RAISE EXCEPTION 'publication_multipart_fixture_oracle_required' USING ERRCODE='42501'; END IF;
 IF NEW.process_exit_observed_at>clock_timestamp() OR NOT EXISTS(
  SELECT 1 FROM listing_publication_private.multipart_sessions s
  JOIN listing_publication_private.objects o ON o.id=s.object_id
  JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  LEFT JOIN listing_publication_private.multipart_abort_observations b ON b.session_id=s.id
  WHERE s.id=NEW.session_id AND s.upload_id IS NOT NULL
   AND ((s.state='completed' AND s.completed_at<=NEW.process_exit_observed_at)
    OR (a.state IN('cancelled','expired','deleted') AND b.observed_at<=NEW.process_exit_observed_at))
   AND NOT EXISTS(SELECT 1 FROM storage.s3_multipart_uploads u WHERE u.id=s.upload_id)) THEN
  RAISE EXCEPTION 'publication_multipart_auxiliary_binding' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN m.id IS NOT NULL THEN
  CASE WHEN NOT EXISTS(SELECT 1 FROM storage.objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path
   AND (z.version IS DISTINCT FROM m.storage_version OR (m.storage_object_id IS NOT NULL AND z.id<>m.storage_object_id)))
   AND (m.completed_at IS NOT NULL OR EXISTS(
    SELECT 1 FROM listing_publication_private.multipart_abort_observations b
    JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=b.session_id
    WHERE b.session_id=m.id AND b.observed_at IS NOT NULL AND b.observed_at<=r.process_exit_observed_at
     AND NOT EXISTS(SELECT 1 FROM storage.s3_multipart_uploads u WHERE u.id=m.upload_id)))
   THEN 'pending' ELSE 'blocked_write_settlement' END
  WHEN EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts a WHERE a.attempt_id=o.attempt_id) THEN 'pending'
  ELSE listing_publication_private.legacy_cleanup_state_before_multipart_v2(o.id) END
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_sessions m WHERE m.object_id=NEW.object_id
      AND (m.completed_at IS NOT NULL OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_abort_observations b
       JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=b.session_id
       WHERE b.session_id=m.id AND b.observed_at<=r.process_exit_observed_at))))
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

CREATE FUNCTION public.prepare_listing_multipart_cleanup_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid;
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 -- Abort is idempotent withdrawal of a known terminal uploadId. A replay may
 -- repeat that withdrawal until a real response is recorded; no new writer opens.
 INSERT INTO listing_publication_private.multipart_abort_observations(session_id)
 SELECT m.id FROM listing_publication_private.multipart_sessions m JOIN listing_publication_private.objects o ON o.id=m.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id=aid AND a.state IN('cancelled','expired','deleted') AND m.completed_at IS NULL
  AND m.upload_id IS NOT NULL AND m.create_received_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_abort_observations b WHERE b.session_id=m.id);
 UPDATE listing_publication_private.cleanup c SET state='pending'
 FROM listing_publication_private.objects o WHERE c.object_id=o.id AND o.attempt_id=aid
  AND c.state='blocked_write_settlement' AND listing_publication_private.object_cleanup_state(o.id)='pending';
 -- These counts describe the same immutable selection and can overlap. They
 -- report durable work without admitting any writer or opening a cleanup gate.
 RETURN (SELECT jsonb_build_object('schema_version',3,'attempt_id',aid,'request_key',p_request_key,
  'files_remaining',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),
  'unresolved',count(*) FILTER(WHERE m.id IS NOT NULL AND m.completed_at IS NULL AND b.observed_at IS NULL),
  'needs_attention',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND (c.state='needs_attention' OR m.problem IS NOT NULL)),
  'blocked',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND c.state='blocked_write_settlement'),
  'auxiliary_pending',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND m.id IS NOT NULL AND r.session_id IS NULL),
  'items',coalesce(jsonb_agg(jsonb_build_object('object_id',o.id,'session',CASE WHEN m.id IS NULL THEN NULL ELSE listing_publication_private.multipart_binding(o.id) END,
    'abort_key',b.abort_key,'abort_allowed',b.session_id IS NOT NULL AND b.observed_at IS NULL,
    'abort_observed',b.observed_at IS NOT NULL,'auxiliary_observed',r.session_id IS NOT NULL) ORDER BY o.id),'[]'::jsonb))
 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_abort_observations b ON b.session_id=m.id
 LEFT JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=m.id
 WHERE a.id=aid AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source')));
END $f$;

CREATE FUNCTION public.record_listing_multipart_abort_v2(p_object_id uuid,p_abort_key uuid,p_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; b listing_publication_private.multipart_abort_observations%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO b FROM listing_publication_private.multipart_abort_observations WHERE session_id=m.id FOR UPDATE;
 IF a.state NOT IN('cancelled','expired','deleted') OR b.abort_key IS DISTINCT FROM p_abort_key OR p_abort_key IS NULL
  OR b.session_id IS NULL OR p_outcome IS NULL OR p_outcome NOT IN('aborted','absent') THEN
  RAISE EXCEPTION 'publication_multipart_abort_binding' USING ERRCODE='42501'; END IF;
 IF b.observed_at IS NULL THEN
  IF EXISTS(SELECT 1 FROM storage.s3_multipart_uploads u WHERE u.id=m.upload_id)
   OR EXISTS(SELECT 1 FROM storage.objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path
     AND z.version IS DISTINCT FROM m.storage_version) THEN
   RAISE EXCEPTION 'publication_multipart_abort_not_observed' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.multipart_abort_observations SET outcome=p_outcome,observed_at=clock_timestamp()
   WHERE session_id=m.id RETURNING * INTO b;
 END IF;
 -- This receipt never changes m.state to completed, never claims temp absence,
 -- and never opens the cleanup gate without the actual native process oracle.
 RETURN jsonb_build_object('object_id',o.id,'abort_key',b.abort_key,'outcome',b.outcome,'observed',b.observed_at IS NOT NULL);
END $f$;

-- Exact-attempt claim for the EXISTING createCleanupOne transport and recorder.
CREATE FUNCTION public.claim_listing_cleanup_for_attempt_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id=aid AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source'))
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t)) OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF c.try_count>=8 THEN
  UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
  RETURN NULL;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
  try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
 RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
  'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,
  'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight') OR (c.state='deleted' AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),
  'needs_attention',count(*) FILTER(WHERE c.state='needs_attention' OR (m.problem IS NOT NULL AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id))))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;

GRANT EXECUTE ON FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid),
 listing_publication_private.protect_multipart_abort() TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid),
 listing_publication_private.protect_multipart_abort() FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
DO $acl$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN('prepare_listing_multipart_cleanup_v2','record_listing_multipart_abort_v2','claim_listing_cleanup_for_attempt_v2') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO selqiro_listing_final_writer_v1',r.signature);
 END LOOP;
END $acl$;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.multipart_abort_observations IS
 'Known terminal uploadId withdrawal only. Actual server Abort/NoSuchUpload response plus primary row absence; temp/drain requires separate genuine native stopped-process oracle. Original Complete-unknown lineage remains unchanged.';
