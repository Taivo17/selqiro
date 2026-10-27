-- Integrated disposable V2 protocol. Load AFTER the accepted SOURCE RELEASE labs.
-- Not a production migration. No browser/service API EXECUTE grants are opened here.
-- Provider pin: supabase/storage v1.83.5 c826a70ac6e6f56d3e6033ccb164fb1ff5282570.
-- Only a complete, successful server-owned CompleteMultipartUpload response plus
-- the same primary storage.objects version closes the final-object writer.
-- Abort, ListParts/404, deadlines, readiness and client ETags do not close it.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
  OR current_setting('selqiro.integration_scope',true) IS DISTINCT FROM 'disposable-v2' THEN
  RAISE EXCEPTION 'publication_disposable_integration_required'; END IF;
END $gate$;

CREATE TABLE listing_publication_private.multipart_attempts (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.multipart_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 provider_commit text NOT NULL DEFAULT 'c826a70ac6e6f56d3e6033ccb164fb1ff5282570'
  CHECK(provider_commit='c826a70ac6e6f56d3e6033ccb164fb1ff5282570'),
 create_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 state text NOT NULL DEFAULT 'creating' CHECK(state IN('creating','open','completing','completed','needs_attention')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 upload_id text UNIQUE CHECK(upload_id IS NULL OR octet_length(upload_id) BETWEEN 1 AND 2048),
 storage_version text CHECK(storage_version IS NULL OR storage_version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 create_received_at timestamptz,
 part_key uuid UNIQUE,
 part_sign_epoch bigint,
 complete_key uuid UNIQUE,
 part_etag text,
 complete_etag text,
 storage_object_id uuid UNIQUE,
 completed_at timestamptz,
 observed_sha256 text CHECK(observed_sha256 IS NULL OR observed_sha256 ~ '^[0-9a-f]{64}$'),
 observed_bytes integer CHECK(observed_bytes IS NULL OR observed_bytes BETWEEN 1 AND 26214400),
 verified_at timestamptz,
 problem text CHECK(problem IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired')),
 CHECK((upload_id IS NULL)=(storage_version IS NULL) AND (upload_id IS NULL)=(create_received_at IS NULL)),
 CHECK((part_key IS NULL)=(part_sign_epoch IS NULL)),
 CHECK((complete_key IS NULL)=(part_etag IS NULL)),
 CHECK((completed_at IS NULL)=(storage_object_id IS NULL) AND (completed_at IS NULL)=(complete_etag IS NULL)),
 CHECK((verified_at IS NULL)=(observed_sha256 IS NULL) AND (verified_at IS NULL)=(observed_bytes IS NULL)),
 CHECK(verified_at IS NULL OR completed_at IS NOT NULL),
 CHECK((state='creating' AND upload_id IS NULL AND completed_at IS NULL)
  OR (state='open' AND upload_id IS NOT NULL AND complete_key IS NULL AND completed_at IS NULL)
  OR (state='completing' AND upload_id IS NOT NULL AND complete_key IS NOT NULL AND completed_at IS NULL)
  OR (state='completed' AND complete_key IS NOT NULL AND completed_at IS NOT NULL)
  OR (state='needs_attention' AND completed_at IS NULL AND problem IS NOT NULL))
);
-- This receipt is deliberately unavailable to app RPCs. An isolated runtime oracle
-- inserts it only after the owned Storage process has exited and its actual private
-- volume scan proves that this uploadId has no remaining temporary parts.
-- Stopping the process is the fixture's drain; hosted Storage has no equivalent
-- established here. A live-file-directory/FD snapshot alone is insufficient.
CREATE TABLE listing_publication_private.multipart_auxiliary_receipts (
 session_id uuid PRIMARY KEY REFERENCES listing_publication_private.multipart_sessions(id) ON DELETE RESTRICT,
 run_id uuid NOT NULL,
 storage_instance_id text NOT NULL CHECK(octet_length(storage_instance_id) BETWEEN 1 AND 256),
 process_exit_observed_at timestamptz NOT NULL,
 process_exit_evidence_sha256 text NOT NULL CHECK(process_exit_evidence_sha256 ~ '^[0-9a-f]{64}$'),
 volume_scan_evidence_sha256 text NOT NULL CHECK(volume_scan_evidence_sha256 ~ '^[0-9a-f]{64}$'),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.multipart_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_auxiliary_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_auxiliary_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.multipart_attempts,listing_publication_private.multipart_sessions,
 listing_publication_private.multipart_auxiliary_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.multipart_attempts TO selqiro_listing_final_writer_v1;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.multipart_sessions TO selqiro_listing_final_writer_v1;
GRANT SELECT ON listing_publication_private.multipart_auxiliary_receipts TO selqiro_listing_final_writer_v1;
CREATE POLICY multipart_attempt_internal ON listing_publication_private.multipart_attempts
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY multipart_session_internal ON listing_publication_private.multipart_sessions
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY multipart_auxiliary_internal ON listing_publication_private.multipart_auxiliary_receipts
 FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
GRANT SELECT(id,bucket_id,key,version) ON storage.s3_multipart_uploads TO selqiro_listing_final_writer_v1;
GRANT SELECT(upload_id,bucket_id,key,version,part_number,etag,size,created_at) ON storage.s3_multipart_uploads_parts TO selqiro_listing_final_writer_v1;
CREATE POLICY listing_multipart_session_witness ON storage.s3_multipart_uploads FOR SELECT TO selqiro_listing_final_writer_v1
 USING(bucket_id='listing-publication-private' AND EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_attempts m ON m.attempt_id=o.attempt_id
  WHERE o.bucket_id=s3_multipart_uploads.bucket_id AND o.object_path=s3_multipart_uploads.key));
CREATE POLICY listing_multipart_part_witness ON storage.s3_multipart_uploads_parts FOR SELECT TO selqiro_listing_final_writer_v1
 USING(bucket_id='listing-publication-private' AND EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_attempts m ON m.attempt_id=o.attempt_id
  WHERE o.bucket_id=s3_multipart_uploads_parts.bucket_id AND o.object_path=s3_multipart_uploads_parts.key));
CREATE POLICY listing_multipart_object_witness ON storage.objects FOR SELECT TO selqiro_listing_final_writer_v1
 USING(bucket_id='listing-publication-private' AND EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_attempts m ON m.attempt_id=o.attempt_id
  WHERE o.bucket_id=objects.bucket_id AND o.object_path=objects.name));

CREATE FUNCTION listing_publication_private.protect_multipart_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o WHERE o.attempt_id=NEW.attempt_id AND o.dispatch_key IS NOT NULL)
  OR EXISTS(SELECT 1 FROM listing_publication_private.web_images w WHERE w.attempt_id=NEW.attempt_id) THEN
  RAISE EXCEPTION 'publication_multipart_legacy_domain' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_multipart_attempt BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_attempts
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt();
CREATE TRIGGER protect_multipart_attempt_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_attempts
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt();
CREATE FUNCTION listing_publication_private.guard_legacy_source_in_multipart() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.dispatch_key IS NOT NULL AND EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts m WHERE m.attempt_id=NEW.attempt_id) THEN
  RAISE EXCEPTION 'publication_multipart_legacy_source_closed' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_legacy_source_in_multipart BEFORE UPDATE ON listing_publication_private.objects
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_legacy_source_in_multipart();
CREATE FUNCTION listing_publication_private.protect_multipart_session() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'creating' OR NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o
   JOIN listing_publication_private.multipart_attempts m ON m.attempt_id=o.attempt_id
   WHERE o.id=NEW.object_id AND o.dispatch_key IS NULL) THEN
   RAISE EXCEPTION 'publication_multipart_binding' USING ERRCODE='22023'; END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['state','upload_id','storage_version','create_received_at','part_key','part_sign_epoch',
  'complete_key','part_etag','complete_etag','storage_object_id','completed_at','observed_sha256','observed_bytes','verified_at','problem'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','upload_id','storage_version','create_received_at','part_key','part_sign_epoch',
  'complete_key','part_etag','complete_etag','storage_object_id','completed_at','observed_sha256','observed_bytes','verified_at','problem']) THEN
  RAISE EXCEPTION 'publication_multipart_immutable' USING ERRCODE='55000'; END IF;
 IF (OLD.upload_id IS NOT NULL AND ROW(NEW.upload_id,NEW.storage_version,NEW.create_received_at) IS DISTINCT FROM ROW(OLD.upload_id,OLD.storage_version,OLD.create_received_at))
  OR (OLD.part_key IS NOT NULL AND ROW(NEW.part_key,NEW.part_sign_epoch) IS DISTINCT FROM ROW(OLD.part_key,OLD.part_sign_epoch))
  OR (OLD.complete_key IS NOT NULL AND ROW(NEW.complete_key,NEW.part_etag) IS DISTINCT FROM ROW(OLD.complete_key,OLD.part_etag))
  OR (OLD.completed_at IS NOT NULL AND ROW(NEW.completed_at,NEW.complete_etag,NEW.storage_object_id) IS DISTINCT FROM ROW(OLD.completed_at,OLD.complete_etag,OLD.storage_object_id))
  OR (OLD.verified_at IS NOT NULL AND ROW(NEW.verified_at,NEW.observed_sha256,NEW.observed_bytes) IS DISTINCT FROM ROW(OLD.verified_at,OLD.observed_sha256,OLD.observed_bytes)) THEN
  RAISE EXCEPTION 'publication_multipart_immutable' USING ERRCODE='55000'; END IF;
 IF (OLD.state='creating' AND NEW.state IN('open','needs_attention'))
  OR (OLD.state='open' AND NEW.state IN('open','completing','needs_attention'))
  OR (OLD.state IN('completing','needs_attention') AND NEW.state='completed' AND OLD.complete_key IS NOT NULL)
  OR (OLD.state='completing' AND NEW.state='needs_attention')
  OR (OLD.state='completed' AND NEW.state='completed') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_multipart_transition' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_multipart_session BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_sessions
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_session();
CREATE TRIGGER protect_multipart_session_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_sessions
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_session();
CREATE FUNCTION listing_publication_private.protect_multipart_auxiliary() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'postgres' OR current_database()<>'selqiro_publication_attempt_fixture'
  OR current_setting('selqiro.integration_scope',true) IS DISTINCT FROM 'disposable-v2' THEN
  RAISE EXCEPTION 'publication_multipart_fixture_oracle_required' USING ERRCODE='42501'; END IF;
 IF NEW.process_exit_observed_at>clock_timestamp() OR NOT EXISTS(
  SELECT 1 FROM listing_publication_private.multipart_sessions s WHERE s.id=NEW.session_id
   AND s.state='completed' AND s.completed_at<=NEW.process_exit_observed_at
   AND NOT EXISTS(SELECT 1 FROM storage.s3_multipart_uploads u WHERE u.id=s.upload_id)) THEN
  RAISE EXCEPTION 'publication_multipart_auxiliary_binding' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_multipart_auxiliary BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_auxiliary_receipts
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary();
CREATE TRIGGER protect_multipart_auxiliary_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_auxiliary_receipts
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary();

CREATE FUNCTION listing_publication_private.multipart_binding(p_object uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',2,'session_id',m.id,'object_id',o.id,'kind',o.kind,
  'attempt_id',o.attempt_id,'slot_id',o.slot_id,'request_key',m.request_key,'bucket_id',o.bucket_id,'object_path',o.object_path,
  'expected_bytes',CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END,
  'expected_sha256',CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END,
  'state',m.state,'upload_id',m.upload_id,'storage_version',m.storage_version,'part_key',m.part_key,
  'part_sign_epoch',m.part_sign_epoch,'complete_key',m.complete_key,'part_etag',m.part_etag,
  'storage_object_id',m.storage_object_id,'completed',m.completed_at IS NOT NULL,'verified',m.verified_at IS NOT NULL,'problem',m.problem)
 FROM listing_publication_private.multipart_sessions m JOIN listing_publication_private.objects o ON o.id=m.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id
 LEFT JOIN listing_publication_private.web_images w ON w.slot_id=o.slot_id WHERE o.id=p_object;
$f$;
-- Existing actor/policy locks historically execute inside postgres-owned API
-- functions. Keep that exact bounded authority at one private boundary instead
-- of granting this new ledger writer profile/identity mutation privileges.
CREATE FUNCTION listing_publication_private.lock_multipart_context(p_user uuid,p_identity uuid,p_attempt uuid,p_service boolean)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT listing_publication_private.lock_web_context(p_user,p_identity,p_attempt,p_service);
$f$;
CREATE FUNCTION listing_publication_private.lock_multipart_object(p_user uuid,p_identity uuid,p_attempt uuid,p_slot uuid,p_kind text)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE oid uuid;
BEGIN
 PERFORM listing_publication_private.lock_multipart_context(p_user,p_identity,p_attempt,true);
 IF p_kind IS NULL OR p_kind NOT IN('source','web') THEN RAISE EXCEPTION 'publication_multipart_kind' USING ERRCODE='22023'; END IF;
 SELECT id INTO oid FROM listing_publication_private.objects WHERE attempt_id=p_attempt AND slot_id=p_slot AND kind=p_kind;
 IF oid IS NULL THEN RAISE EXCEPTION 'publication_multipart_object_unavailable' USING ERRCODE='P0002'; END IF;
 RETURN oid;
END $f$;

CREATE FUNCTION public.reserve_listing_multipart_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; allowed boolean:=false; w listing_publication_private.web_images%ROWTYPE;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_multipart_request' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts WHERE attempt_id=p_attempt_id) THEN
  IF p_kind<>'source' THEN RAISE EXCEPTION 'publication_multipart_source_required' USING ERRCODE='55000'; END IF;
  INSERT INTO listing_publication_private.multipart_attempts(attempt_id) VALUES(p_attempt_id);
 END IF;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NOT NULL THEN
  IF m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_request_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  IF p_kind='web' THEN
   SELECT * INTO w FROM listing_publication_private.web_images WHERE slot_id=p_slot_id;
   IF w.state<>'prepared' OR w.request_key IS DISTINCT FROM p_request_key OR w.write_before_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
    RAISE EXCEPTION 'publication_multipart_web_intent_required' USING ERRCODE='55000'; END IF;
  END IF;
  -- An existing final object or another provider session is never silently adopted.
  IF EXISTS(SELECT 1 FROM storage.objects s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.name WHERE o.id=oid)
   OR EXISTS(SELECT 1 FROM storage.s3_multipart_uploads s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.key WHERE o.id=oid) THEN
   RAISE EXCEPTION 'publication_multipart_provider_path_occupied' USING ERRCODE='55000'; END IF;
  INSERT INTO listing_publication_private.multipart_sessions(object_id,request_key) VALUES(oid,p_request_key) RETURNING * INTO m;
  allowed:=true;
 END IF;
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'create_allowed',allowed,
  'create_key',CASE WHEN allowed THEN m.create_key END);
END $f$;
CREATE FUNCTION public.get_listing_multipart_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid;
 IF m.id IS NULL THEN RETURN NULL; END IF;
 IF m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN listing_publication_private.multipart_binding(oid);
END $f$;
-- Record genuine Create acknowledgement even if cancellation has closed publication.
-- It retains cleanup lineage; it does not authorize a part or a Complete operation.
CREATE FUNCTION public.record_listing_multipart_created_v2(p_object_id uuid,p_create_key uuid,p_upload_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; o listing_publication_private.objects%ROWTYPE; v text;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 IF m.id IS NULL OR m.create_key IS DISTINCT FROM p_create_key OR p_create_key IS NULL THEN
  RAISE EXCEPTION 'publication_multipart_create_claim' USING ERRCODE='42501'; END IF;
 IF m.upload_id IS NOT NULL THEN
  IF m.upload_id IS DISTINCT FROM p_upload_id THEN RAISE EXCEPTION 'publication_multipart_create_conflict' USING ERRCODE='22023'; END IF;
  RETURN listing_publication_private.multipart_binding(o.id);
 END IF;
 IF m.state<>'creating' THEN RAISE EXCEPTION 'publication_multipart_create_closed' USING ERRCODE='55000'; END IF;
 SELECT u.version INTO v FROM storage.s3_multipart_uploads u WHERE u.id=p_upload_id AND u.bucket_id=o.bucket_id AND u.key=o.object_path
  AND (SELECT count(*) FROM storage.s3_multipart_uploads x WHERE x.bucket_id=o.bucket_id AND x.key=o.object_path)=1;
 IF v IS NULL OR v!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
  RAISE EXCEPTION 'publication_multipart_provider_binding' USING ERRCODE='22023'; END IF;
 UPDATE listing_publication_private.multipart_sessions SET state='open',upload_id=p_upload_id,storage_version=v,create_received_at=clock_timestamp()
  WHERE object_id=o.id;
 RETURN listing_publication_private.multipart_binding(o.id);
END $f$;
CREATE FUNCTION public.claim_listing_multipart_part_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; allowed boolean:=false;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NULL OR m.request_key IS DISTINCT FROM p_request_key OR m.state<>'open' OR m.problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_multipart_part_closed' USING ERRCODE='55000'; END IF;
 IF m.part_key IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET part_key=gen_random_uuid(),part_sign_epoch=floor(extract(epoch FROM clock_timestamp()))::bigint
   WHERE object_id=oid RETURNING * INTO m;
  allowed:=true;
 END IF;
 -- SOURCE can recover the exact same presign, never a replacement uploadId/expiry.
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'part_allowed',allowed OR p_kind='source');
END $f$;
CREATE FUNCTION public.claim_listing_multipart_complete_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text,p_part_etag text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; et text; allowed boolean:=false;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NULL OR m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_binding' USING ERRCODE='22023'; END IF;
 IF m.state='open' AND m.problem IS NULL THEN
  -- Native 1.83.5 insertUploadPart omits size; parts.size remains its default 0.
  -- Do not manufacture a size receipt. SOURCE admission binds Content-Length,
  -- and BOTH kinds require an exact full GET length+SHA256 before verification.
  SELECT p.etag INTO et FROM storage.s3_multipart_uploads_parts p
   JOIN listing_publication_private.objects o ON o.id=oid
   WHERE p.upload_id=m.upload_id AND p.part_number=1 AND p.version=m.storage_version
    AND p.bucket_id=o.bucket_id AND p.key=o.object_path ORDER BY p.created_at DESC LIMIT 1;
  IF m.part_key IS NULL OR et IS DISTINCT FROM p_part_etag OR et IS NULL
   OR EXISTS(SELECT 1 FROM storage.s3_multipart_uploads_parts p WHERE p.upload_id=m.upload_id AND p.part_number<>1) THEN
   RAISE EXCEPTION 'publication_multipart_part_not_verified' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.multipart_sessions SET state='completing',complete_key=gen_random_uuid(),part_etag=et
   WHERE object_id=oid RETURNING * INTO m;
  allowed:=true;
 END IF;
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'complete_allowed',allowed);
END $f$;
CREATE FUNCTION public.record_listing_multipart_completed_v2(p_object_id uuid,p_complete_key uuid,p_complete_etag text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; o listing_publication_private.objects%ROWTYPE; sid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 IF m.id IS NULL OR m.complete_key IS DISTINCT FROM p_complete_key OR p_complete_key IS NULL
  OR p_complete_etag IS NULL OR octet_length(p_complete_etag) NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'publication_multipart_complete_claim' USING ERRCODE='42501'; END IF;
 IF m.completed_at IS NOT NULL THEN
  IF m.complete_etag IS DISTINCT FROM p_complete_etag THEN RAISE EXCEPTION 'publication_multipart_complete_conflict' USING ERRCODE='22023'; END IF;
  RETURN listing_publication_private.multipart_binding(o.id);
 END IF;
 IF m.state NOT IN('completing','needs_attention') OR EXISTS(SELECT 1 FROM storage.s3_multipart_uploads u WHERE u.id=m.upload_id) THEN
  RAISE EXCEPTION 'publication_multipart_session_not_closed' USING ERRCODE='55000'; END IF;
 SELECT s.id INTO sid FROM storage.objects s WHERE s.bucket_id=o.bucket_id AND s.name=o.object_path AND s.version=m.storage_version
  AND (SELECT count(*) FROM storage.objects x WHERE x.bucket_id=o.bucket_id AND x.name=o.object_path)=1;
 IF sid IS NULL THEN RAISE EXCEPTION 'publication_multipart_committed_version_mismatch' USING ERRCODE='55000'; END IF;
 -- Caller has consumed a genuine successful Complete response, not HEAD or a client claim.
 UPDATE listing_publication_private.multipart_sessions SET state='completed',complete_etag=p_complete_etag,
  storage_object_id=sid,completed_at=clock_timestamp(),problem=NULL WHERE object_id=o.id;
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id AND state='blocked_write_settlement';
 RETURN listing_publication_private.multipart_binding(o.id);
END $f$;
CREATE FUNCTION public.record_listing_multipart_verified_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text,p_observed_sha256 text,p_observed_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; b jsonb;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 b:=listing_publication_private.multipart_binding(oid);
 IF m.state IS DISTINCT FROM 'completed' OR m.problem IS NOT NULL OR m.request_key IS DISTINCT FROM p_request_key
  OR p_observed_sha256 IS DISTINCT FROM b->>'expected_sha256' OR p_observed_bytes IS DISTINCT FROM (b->>'expected_bytes')::integer
  OR NOT EXISTS(SELECT 1 FROM storage.objects s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.name
   WHERE o.id=oid AND s.id=m.storage_object_id AND s.version=m.storage_version) THEN
  RAISE EXCEPTION 'publication_multipart_readback_mismatch' USING ERRCODE='22023'; END IF;
 IF m.verified_at IS NULL THEN UPDATE listing_publication_private.multipart_sessions SET observed_sha256=p_observed_sha256,
  observed_bytes=p_observed_bytes,verified_at=clock_timestamp() WHERE object_id=oid; END IF;
 RETURN listing_publication_private.multipart_binding(oid);
END $f$;
CREATE FUNCTION public.record_listing_multipart_problem_v2(p_object_id uuid,p_problem text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; aid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT attempt_id INTO aid FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=aid FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=p_object_id FOR UPDATE;
 IF m.id IS NULL OR p_problem IS NULL OR p_problem NOT IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired') THEN RAISE EXCEPTION 'publication_multipart_problem' USING ERRCODE='22023'; END IF;
 IF m.problem IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET problem=p_problem,state=CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'needs_attention' END
   WHERE object_id=p_object_id;
 END IF;
 RETURN listing_publication_private.multipart_binding(p_object_id);
END $f$;

CREATE OR REPLACE FUNCTION public.claim_listing_web_image_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_request_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_request_invalid' USING ERRCODE='22023'; END IF;
 -- New-domain SOURCE requires genuine Complete and actual whole-object byte verification.
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.slots s
  JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='source'
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  WHERE s.id=p_slot_id AND s.attempt_id=p_attempt_id AND o.dispatch_key IS NULL
   AND m.state='completed' AND m.verified_at IS NOT NULL AND m.problem IS NULL AND m.request_key=p_request_key) THEN
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


CREATE OR REPLACE FUNCTION public.record_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_observed_sha256 text,p_observed_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.state NOT IN('prepared','ready') THEN RAISE EXCEPTION 'publication_web_not_prepared' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  JOIN storage.objects s ON s.id=m.storage_object_id AND s.version=m.storage_version AND s.bucket_id=o.bucket_id AND s.name=o.object_path
  WHERE o.attempt_id=p_attempt_id AND o.slot_id=p_slot_id AND o.kind='web' AND o.dispatch_key IS NULL
   AND m.state='completed' AND m.verified_at IS NOT NULL AND m.problem IS NULL
   AND m.observed_sha256=p_observed_sha256 AND m.observed_bytes=p_observed_bytes) THEN
  RAISE EXCEPTION 'publication_multipart_web_completion_required' USING ERRCODE='55000'; END IF;
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


CREATE FUNCTION listing_publication_private.legacy_cleanup_state_before_multipart_v2(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;



CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN m.id IS NOT NULL THEN
  CASE WHEN m.completed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM storage.objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
   THEN 'pending' ELSE 'blocked_write_settlement' END
  WHEN EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts a WHERE a.attempt_id=o.attempt_id) THEN 'pending'
  ELSE listing_publication_private.legacy_cleanup_state_before_multipart_v2(o.id) END
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;
CREATE FUNCTION listing_publication_private.multipart_object_fully_deleted(p_id uuid) RETURNS boolean LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(c.state='deleted',false) AND (m.id IS NULL OR
  (EXISTS(SELECT 1 FROM listing_publication_private.multipart_auxiliary_receipts r WHERE r.session_id=m.id)
   AND NOT EXISTS(SELECT 1 FROM storage.objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)))
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
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
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_sessions m WHERE m.object_id=NEW.object_id AND m.completed_at IS NOT NULL))
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

CREATE OR REPLACE FUNCTION listing_publication_private.final_receipt(p_attempt uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'listing_id',p.listing_id::text,
 'state',CASE WHEN p.state='published' THEN 'published' WHEN EXISTS(
 SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)) THEN 'deleting' ELSE 'deleted' END,
 'published_at',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'content_deleted',p.state='deleting',
 'files_remaining',(SELECT count(*) FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (p.state='deleting' OR o.kind='source') AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)))
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id WHERE a.id=p_attempt;
$f$;

-- Keep the accepted quota charged until BOTH final object and multipart auxiliary data are proved removed.
CREATE OR REPLACE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; policies jsonb;
 a listing_publication_private.attempts%ROWTYPE; slot_id uuid; image record;
 at_time timestamptz; reserved bigint;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023';
 END IF;
 n:=public.normalize_listing_creation_v1(p_input);
 IF n->>'language'<>'et' OR n->'location'->>'country'='' OR n->'location'->>'city'=''
    OR n->'location'->>'latitude' IS NOT NULL OR n->'location'->>'longitude' IS NOT NULL THEN
  RAISE EXCEPTION 'publication_form_scope_invalid' USING ERRCODE='22023';
 END IF;
 images:=listing_publication_private.normalize_images(p_images);
 fingerprint:=sha256(convert_to('selqiro-publication-attempt-v1:'||jsonb_build_object('input',n,'images',images)::text,'UTF8'));
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.actor_user_id=p_expected_user_id AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM active_id OR a.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';
  END IF;
  -- Recovery only; do not rewrite content, move deadline, issue permission or reopen a tombstone.
  RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',true);
 END IF;
 policies:=listing_publication_private.require_policies();
 at_time:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.state='open' AND x.expires_at>at_time)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';
 END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.created_at>at_time-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';
 END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts x ON x.id=o.attempt_id WHERE x.actor_user_id=p_expected_user_id AND NOT listing_publication_private.multipart_object_fully_deleted(o.id);
 -- Signed uploads cannot be bounded by the untrusted declared size. Reserve FULL per-object maxima.
 -- No budget is released until the future Storage settlement/cleanup contract proves it safe.
 IF reserved+jsonb_array_length(images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
   payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,active_id,p_request_key,fingerprint,n,policies,at_time,at_time+interval '24 hours') RETURNING * INTO a;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(a.id,image.ordinality-1,(image.value->>'client_file_id')::uuid,
    (image.value->>'byte_length')::integer,decode(image.value->>'sha256','hex')) RETURNING id INTO slot_id;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(a.id,slot_id,'source','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/source.upload',26214400),
        (a.id,slot_id,'web','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;



CREATE OR REPLACE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,
  'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight') OR (c.state='deleted' AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),
  'needs_attention',count(*) FILTER(WHERE c.state='needs_attention' OR m.problem IS NOT NULL),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id))))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;


-- Server-only protocol RPCs remain API-closed until the isolated runtime grants the
-- exact allowlist. No legacy signed-SOURCE/POST-WEB route is activated alongside them.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
DO $acl$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN('reserve_listing_multipart_v2','get_listing_multipart_v2',
   'record_listing_multipart_created_v2','claim_listing_multipart_part_v2','claim_listing_multipart_complete_v2',
   'record_listing_multipart_completed_v2','record_listing_multipart_verified_v2','record_listing_multipart_problem_v2') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO selqiro_listing_final_writer_v1',r.signature);
 END LOOP;
END $acl$;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.multipart_sessions IS
 'New isolated V2 SOURCE/WEB: server-only one Create and one Complete, browser UploadPart only. Unknown effects retain lineage and block cleanup. Genuine Complete and primary version close only the final-object writer, not auxiliary parts.';
COMMENT ON TABLE listing_publication_private.multipart_auxiliary_receipts IS
 'Fixture oracle only, no app RPC. Actual owned Storage process exit plus exact private-volume absence evidence. This does not establish hosted Supabase abort/drain guarantees.';
