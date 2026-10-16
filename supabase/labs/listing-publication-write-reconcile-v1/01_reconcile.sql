-- DORMANT LAB overlay. No production migration, no Storage operation, no API grant.
-- Metadata is read from the primary DB, NOT client/user_metadata/ETag/HEAD/404.
-- Provider admission/write/commit ordering and exclusive path writers need real integration acceptance.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;
CREATE TABLE listing_publication_private.write_reconcile_jobs (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN('source_unsigned','web_commit')),
 work_key uuid NOT NULL UNIQUE, try_count integer NOT NULL CHECK(try_count BETWEEN 1 AND 8),
 state text NOT NULL CHECK(state IN('leased','retry_wait','settled','needs_attention')),
 lease_until timestamptz NOT NULL, not_before timestamptz,
 storage_object_id uuid, storage_version text,
 result jsonb,
 CHECK((storage_object_id IS NULL)=(storage_version IS NULL)),
 CHECK(kind='web_commit' OR storage_object_id IS NULL),
 CHECK((state='leased' AND result IS NULL AND not_before IS NULL)
    OR (state<>'leased' AND result IS NOT NULL)),
 CHECK(storage_version IS NULL OR (storage_version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND storage_version<>'00000000-0000-0000-0000-000000000000'))
);
CREATE TABLE listing_publication_private.write_settlements (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN('source_unsigned','web_commit')),
 grant_id uuid REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 job_id uuid REFERENCES listing_publication_private.web_images(id) ON DELETE RESTRICT,
 claim_id uuid,storage_object_id uuid UNIQUE,storage_version text,
 observed_sha256 text,observed_bytes integer,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='source_unsigned' AND grant_id IS NOT NULL AND job_id IS NULL AND claim_id IS NULL
        AND storage_object_id IS NULL AND storage_version IS NULL AND observed_sha256 IS NULL AND observed_bytes IS NULL)
    OR (kind='web_commit' AND grant_id IS NULL AND job_id IS NOT NULL AND claim_id IS NOT NULL
        AND storage_object_id IS NOT NULL AND storage_version IS NOT NULL AND observed_sha256 IS NOT NULL AND observed_bytes BETWEEN 20 AND 4194304))
);
ALTER TABLE listing_publication_private.write_reconcile_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_reconcile_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_settlements FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.write_reconcile_jobs,listing_publication_private.write_settlements FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.write_reconcile_jobs TO selqiro_listing_final_writer_v1;
GRANT SELECT,INSERT ON listing_publication_private.write_settlements TO selqiro_listing_final_writer_v1;
CREATE POLICY reconcile_internal ON listing_publication_private.write_reconcile_jobs FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY settlement_internal ON listing_publication_private.write_settlements FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
-- NEW narrowly scoped internal read only; not client/service-role SELECT or any Storage write.
GRANT USAGE ON SCHEMA storage TO selqiro_listing_final_writer_v1;
GRANT SELECT(id,bucket_id,name,version) ON storage.objects TO selqiro_listing_final_writer_v1;
CREATE POLICY listing_web_commit_witness ON storage.objects FOR SELECT TO selqiro_listing_final_writer_v1 USING(
 bucket_id='listing-publication-private' AND EXISTS(SELECT 1 FROM listing_publication_private.objects o
  WHERE o.kind='web' AND o.bucket_id=objects.bucket_id AND o.object_path=objects.name));

CREATE FUNCTION listing_publication_private.protect_write_settlement() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_write_settlement_immutable' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  WHERE o.id=NEW.object_id AND a.state IN('cancelled','expired','deleted') AND o.bucket_id='listing-publication-private'
  AND ((NEW.kind='source_unsigned' AND o.kind='source' AND EXISTS(
   SELECT 1 FROM listing_publication_private.upload_grants g WHERE g.id=NEW.grant_id AND g.object_id=o.id
    AND g.dispatch_key=o.dispatch_key AND g.state='reserved' AND g.claim_id IS NULL AND g.claimed_at IS NULL))
  OR (NEW.kind='web_commit' AND o.kind='web' AND o.dispatch_key IS NULL AND EXISTS(
   SELECT 1 FROM listing_publication_private.web_images w JOIN storage.objects s ON s.bucket_id=o.bucket_id AND s.name=o.object_path
   WHERE w.id=NEW.job_id AND w.attempt_id=a.id AND w.slot_id=o.slot_id AND w.claim_id=NEW.claim_id
    AND w.state IN('prepared','ready') AND w.prepared_at IS NOT NULL AND w.write_before_epoch IS NOT NULL
    AND w.intent->>'web_sha256'=NEW.observed_sha256 AND (w.intent->>'web_bytes')::integer=NEW.observed_bytes
    AND (SELECT count(*) FROM storage.objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)=1
    AND s.id=NEW.storage_object_id AND s.id<>'00000000-0000-0000-0000-000000000000'::uuid AND s.version=NEW.storage_version
    AND s.version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND s.version<>'00000000-0000-0000-0000-000000000000'
    AND o.object_path='v1/'||a.id::text||'/'||o.slot_id::text||'/web-v1.webp')))) THEN
  RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_write_settlement BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.write_settlements
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_write_settlement();
CREATE TRIGGER protect_write_settlement_truncate BEFORE TRUNCATE ON listing_publication_private.write_settlements
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_write_settlement();

CREATE FUNCTION listing_publication_private.protect_write_reconcile_job() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_write_reconcile_immutable' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'leased' OR NEW.try_count<>1 OR NEW.lease_until<=clock_timestamp() THEN
   RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.object_id IS DISTINCT FROM OLD.object_id OR NEW.kind IS DISTINCT FROM OLD.kind
  OR (OLD.storage_object_id IS NOT NULL AND ROW(NEW.storage_object_id,NEW.storage_version) IS DISTINCT FROM ROW(OLD.storage_object_id,OLD.storage_version)) THEN
  RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000'; END IF;
 IF OLD.state='leased' AND OLD.lease_until<=clock_timestamp() AND OLD.try_count=8
  AND NEW.state='needs_attention' AND NEW.result=jsonb_build_object('outcome','lease_lost')
  AND (to_jsonb(NEW)-ARRAY['state','result'])=(to_jsonb(OLD)-ARRAY['state','result']) THEN RETURN NEW; END IF;
 IF NEW.state='leased' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key<>OLD.work_key
  AND NEW.lease_until>clock_timestamp() AND
   ((OLD.state='retry_wait' AND OLD.not_before<=clock_timestamp()) OR (OLD.state='leased' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='leased' AND OLD.lease_until>clock_timestamp() AND NEW.state IN('settled','retry_wait','needs_attention')
  AND (to_jsonb(NEW)-ARRAY['state','not_before','result'])=(to_jsonb(OLD)-ARRAY['state','not_before','result']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_write_reconcile_job BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.write_reconcile_jobs
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_write_reconcile_job();
CREATE TRIGGER protect_write_reconcile_job_truncate BEFORE TRUNCATE ON listing_publication_private.write_reconcile_jobs
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_write_reconcile_job();
CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id) THEN 'pending'
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
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id))
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


CREATE FUNCTION public.claim_listing_write_reconcile_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 j listing_publication_private.write_reconcile_jobs%ROWTYPE; w listing_publication_private.web_images%ROWTYPE;
 sid uuid;sv text;t timestamptz:=clock_timestamp();k text;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects x ON x.id=q.object_id
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 LEFT JOIN listing_publication_private.write_reconcile_jobs r ON r.object_id=x.id
 WHERE q.state='blocked_write_settlement' AND a.state IN('cancelled','expired','deleted')
  AND q.bucket_id=x.bucket_id AND q.object_path=x.object_path
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=x.id)
  AND ((x.kind='source' AND EXISTS(SELECT 1 FROM listing_publication_private.upload_grants g WHERE g.object_id=x.id
    AND g.dispatch_key=x.dispatch_key AND g.state='reserved' AND g.claim_id IS NULL))
   OR (x.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images v WHERE v.slot_id=x.slot_id
    AND v.attempt_id=x.attempt_id AND v.prepared_at IS NOT NULL AND v.state IN('prepared','ready'))
    AND NOT EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions wc WHERE wc.object_id=x.id)))
  AND (r.object_id IS NULL OR (r.try_count<8 AND r.state='retry_wait' AND r.not_before<=t) OR (r.state='leased' AND r.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=c.object_id;
 k:=CASE WHEN o.kind='source' THEN 'source_unsigned' ELSE 'web_commit' END;
 SELECT * INTO j FROM listing_publication_private.write_reconcile_jobs WHERE object_id=o.id;
 IF j.try_count=8 THEN
  UPDATE listing_publication_private.write_reconcile_jobs SET state='needs_attention',result=jsonb_build_object('outcome','lease_lost') WHERE object_id=o.id;
  RETURN NULL;
 END IF;
 IF k='web_commit' THEN
  SELECT * INTO w FROM listing_publication_private.web_images WHERE attempt_id=o.attempt_id AND slot_id=o.slot_id;
  SELECT s.id,s.version INTO sid,sv FROM storage.objects s WHERE s.bucket_id=o.bucket_id AND s.name=o.object_path
   AND (SELECT count(*) FROM storage.objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)=1
   AND s.id<>'00000000-0000-0000-0000-000000000000'::uuid
   AND s.version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND s.version<>'00000000-0000-0000-0000-000000000000';
 END IF;
 -- Once pinned, a provider generation is never silently replaced by a later one.
 IF j.storage_object_id IS NOT NULL THEN sid:=j.storage_object_id;sv:=j.storage_version; END IF;
 IF j.object_id IS NULL THEN
  INSERT INTO listing_publication_private.write_reconcile_jobs(object_id,kind,work_key,try_count,state,lease_until,storage_object_id,storage_version)
   VALUES(o.id,k,gen_random_uuid(),1,'leased',t+interval '60 seconds',sid,sv) RETURNING * INTO j;
 ELSE
  UPDATE listing_publication_private.write_reconcile_jobs SET work_key=gen_random_uuid(),try_count=try_count+1,state='leased',
   lease_until=t+interval '60 seconds',not_before=NULL,result=NULL,storage_object_id=sid,storage_version=sv WHERE object_id=o.id RETURNING * INTO j;
 END IF;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'work_key',j.work_key,'kind',k,'attempt_id',o.attempt_id,'slot_id',o.slot_id,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'expected_sha256',CASE WHEN k='web_commit' THEN w.intent->>'web_sha256' END,
  'expected_bytes',CASE WHEN k='web_commit' THEN (w.intent->>'web_bytes')::integer END,
  'storage_object_id',j.storage_object_id,'storage_version',j.storage_version,'lease_until_epoch',floor(extract(epoch FROM j.lease_until))::bigint,'try_count',j.try_count);
END $f$;

CREATE FUNCTION public.record_listing_write_reconcile_v1(p_object_id uuid,p_work_key uuid,p_outcome text,
 p_storage_object_id uuid,p_storage_version text,p_observed_sha256 text,p_observed_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE j listing_publication_private.write_reconcile_jobs%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 a listing_publication_private.attempts%ROWTYPE; w listing_publication_private.web_images%ROWTYPE; c listing_publication_private.cleanup%ROWTYPE;
 g uuid;v jsonb;t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_outcome IS NULL OR p_outcome NOT IN('observed','not_visible','mismatch','transport') THEN RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
 v:=jsonb_build_object('outcome',p_outcome,'storage_object_id',p_storage_object_id,'storage_version',p_storage_version,'sha256',p_observed_sha256,'bytes',p_observed_bytes);
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO j FROM listing_publication_private.write_reconcile_jobs WHERE object_id=o.id FOR UPDATE;
 IF j.object_id IS NULL OR p_work_key IS NULL OR j.work_key IS DISTINCT FROM p_work_key THEN
  RAISE EXCEPTION 'publication_write_reconcile_lease_lost' USING ERRCODE='55000'; END IF;
 IF j.state<>'leased' THEN
  IF j.result IS DISTINCT FROM v THEN RAISE EXCEPTION 'publication_write_reconcile_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('object_id',j.object_id,'work_key',j.work_key,'state',j.state);
 END IF;
 IF j.lease_until<=t OR a.state NOT IN('cancelled','expired','deleted') OR c.state<>'blocked_write_settlement' THEN
  RAISE EXCEPTION 'publication_write_reconcile_lease_lost' USING ERRCODE='55000'; END IF;
 IF p_outcome<>'observed' THEN
  IF p_storage_object_id IS NOT NULL OR p_storage_version IS NOT NULL OR p_observed_sha256 IS NOT NULL OR p_observed_bytes IS NOT NULL THEN
   RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
 ELSE
  IF j.kind='source_unsigned' THEN
   IF p_storage_object_id IS NOT NULL OR p_storage_version IS NOT NULL OR p_observed_sha256 IS NOT NULL OR p_observed_bytes IS NOT NULL THEN
    RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
   SELECT id INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id AND dispatch_key=o.dispatch_key AND state='reserved' AND claim_id IS NULL;
   IF g IS NULL THEN RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
   INSERT INTO listing_publication_private.write_settlements(object_id,kind,grant_id) VALUES(o.id,j.kind,g);
  ELSE
   SELECT * INTO w FROM listing_publication_private.web_images WHERE attempt_id=o.attempt_id AND slot_id=o.slot_id;
   IF j.storage_object_id IS NULL OR p_storage_object_id IS DISTINCT FROM j.storage_object_id OR p_storage_version IS DISTINCT FROM j.storage_version
    OR p_observed_sha256 IS DISTINCT FROM w.intent->>'web_sha256' OR p_observed_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
     RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
   INSERT INTO listing_publication_private.write_settlements(object_id,kind,job_id,claim_id,storage_object_id,storage_version,observed_sha256,observed_bytes)
    VALUES(o.id,j.kind,w.id,w.claim_id,p_storage_object_id,p_storage_version,p_observed_sha256,p_observed_bytes);
  END IF;
  UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id AND state='blocked_write_settlement';
 END IF;
 UPDATE listing_publication_private.write_reconcile_jobs SET
  state=CASE WHEN p_outcome='observed' THEN 'settled' WHEN try_count>=8 OR p_outcome='mismatch' THEN 'needs_attention' ELSE 'retry_wait' END,
  not_before=CASE WHEN p_outcome<>'observed' THEN t+least(3600,30*(2^(try_count-1))::integer)*interval '1 second' END,result=v
 WHERE object_id=o.id RETURNING * INTO j;
 RETURN jsonb_build_object('object_id',j.object_id,'work_key',j.work_key,'state',j.state);
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_write_reconcile_v1(),public.record_listing_write_reconcile_v1(uuid,uuid,text,uuid,text,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION listing_publication_private.protect_write_settlement(),listing_publication_private.protect_write_reconcile_job()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_write_settlement(),listing_publication_private.protect_write_reconcile_job()
 TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_write_reconcile_v1() OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_write_reconcile_v1(uuid,uuid,text,uuid,text,text,integer) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.write_settlements IS
 'Cleanup-only source-never-signed / one-WEB-primary-commit witness. Not a reusable SOURCE revocation, provider drain, or fabricated HTTP acknowledgement. Labs/API-closed.';
