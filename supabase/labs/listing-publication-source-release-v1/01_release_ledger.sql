-- DORMANT LAB ONLY. No migration, API grants, Storage operation or historical backfill.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;

-- Absence is usable ONLY for grants observed from their actual INSERT in this protocol.
-- Existing recorded grants cannot acquire this coverage marker retrospectively.
CREATE TABLE listing_publication_private.source_release_tracking (
 grant_id uuid PRIMARY KEY REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 dispatch_key uuid NOT NULL,
 tracked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.source_release_intents (
 grant_id uuid PRIMARY KEY REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 release_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL,
 token_sha256 bytea NOT NULL CHECK(octet_length(token_sha256)=32),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.source_recorded_no_release (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 grant_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.source_release_tracking(grant_id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL,
 token_sha256 bytea NOT NULL CHECK(octet_length(token_sha256)=32),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DO $acl$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['source_release_tracking','source_release_intents','source_recorded_no_release'] LOOP
  EXECUTE format('ALTER TABLE listing_publication_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE listing_publication_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON listing_publication_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT ON listing_publication_private.%I TO selqiro_listing_final_writer_v1',t);
  EXECUTE format('CREATE POLICY release_read_internal ON listing_publication_private.%I FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)',t);
 END LOOP;
END $acl$;
GRANT INSERT ON listing_publication_private.source_release_tracking,listing_publication_private.source_recorded_no_release
 TO selqiro_listing_final_writer_v1;
CREATE POLICY tracking_insert_internal ON listing_publication_private.source_release_tracking FOR INSERT
 TO selqiro_listing_final_writer_v1 WITH CHECK(true);
CREATE POLICY recorded_no_release_insert_internal ON listing_publication_private.source_recorded_no_release FOR INSERT
 TO selqiro_listing_final_writer_v1 WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_source_release_tracking() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' OR pg_trigger_depth()<>2 THEN
  RAISE EXCEPTION 'publication_release_tracking_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 IF g.id IS NULL OR g.state<>'reserved' OR g.claim_id IS NOT NULL OR g.token_sha256 IS NOT NULL
  OR g.object_id IS DISTINCT FROM NEW.object_id OR g.dispatch_key IS DISTINCT FROM NEW.dispatch_key THEN
  RAISE EXCEPTION 'publication_release_tracking_binding' USING ERRCODE='22023'; END IF;
 NEW.tracked_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_release_tracking BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_release_tracking FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_release_tracking();
CREATE TRIGGER protect_source_release_tracking_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_release_tracking FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_release_tracking();
CREATE FUNCTION listing_publication_private.track_source_grant_birth() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 INSERT INTO listing_publication_private.source_release_tracking(grant_id,object_id,dispatch_key)
 VALUES(NEW.id,NEW.object_id,NEW.dispatch_key);
 RETURN NEW;
END $f$;
CREATE TRIGGER track_source_grant_birth AFTER INSERT ON listing_publication_private.upload_grants
 FOR EACH ROW WHEN(NEW.state='reserved') EXECUTE FUNCTION listing_publication_private.track_source_grant_birth();
GRANT CREATE ON SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.track_source_grant_birth() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA listing_publication_private FROM selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_release_tracking() TO selqiro_listing_final_writer_v1;

-- Shared by the TWO trusted service RPCs. Reuses existing actor/identity/policy checks.
-- The browser must NOT call the secret-returning SQL function, even with an accidental
-- EXECUTE grant: a caller-controlled rollback could otherwise reveal an untracked token.
CREATE FUNCTION listing_publication_private.lock_source_release_grant(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid)
RETURNS listing_publication_private.upload_grants LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 active_id:=listing_publication_private.lock_upload_service_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 PERFORM set_config('request.jwt.claim.sub',p_expected_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_expected_user_id)::text,true);
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id WHERE x.id=p_grant_id
  AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key AND o.attempt_id=a.id
  AND o.slot_id=p_slot_id AND o.kind='source' FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 RETURN g;
END $f$;

CREATE FUNCTION listing_publication_private.protect_source_release_intent() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 -- Existing upload secret RPC owner is postgres; this does not grant the final
 -- cleaner role the ability to invent release intents or read secrets through an API.
 IF TG_OP<>'INSERT' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_release_intent_immutable' USING ERRCODE='55000'; END IF;
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 SELECT a0.* INTO a FROM listing_publication_private.attempts a0 JOIN listing_publication_private.objects o
  ON o.attempt_id=a0.id WHERE o.id=g.object_id FOR UPDATE OF a0;
 IF g.id IS NULL OR a.id IS NULL OR a.state<>'open' OR a.expires_at<=clock_timestamp()
  OR g.state<>'recorded' OR g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  OR g.object_id IS DISTINCT FROM NEW.object_id OR g.claim_id IS DISTINCT FROM NEW.claim_id
  OR g.token_sha256 IS DISTINCT FROM NEW.token_sha256
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=g.object_id) THEN
  RAISE EXCEPTION 'publication_release_intent_binding' USING ERRCODE='22023'; END IF;
 NEW.release_id:=gen_random_uuid(); NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_release_intent BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_release_intents FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_release_intent();
CREATE TRIGGER protect_source_release_intent_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_release_intents FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_release_intent();

-- Signature retained, returned outer envelope gains release_id; all old browser/API
-- callers are refused by actual role before secrets. Only the revised server issuer
-- may use this read, then verify the committed receipt in another HTTP transaction.
CREATE OR REPLACE FUNCTION public.get_my_listing_upload_grant_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; r listing_publication_private.source_release_intents%ROWTYPE;
BEGIN
 g:=listing_publication_private.lock_source_release_grant(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_dispatch_key,p_grant_id);
 IF g.state<>'recorded' THEN RETURN jsonb_build_object('state','pending','grant',NULL,'release_id',NULL); END IF;
 IF g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
  RETURN jsonb_build_object('state','expired','grant',NULL,'release_id',NULL); END IF;
 SELECT * INTO r FROM listing_publication_private.source_release_intents WHERE grant_id=g.id;
 IF NOT FOUND THEN
  INSERT INTO listing_publication_private.source_release_intents(grant_id,object_id,claim_id,token_sha256)
   VALUES(g.id,g.object_id,g.claim_id,g.token_sha256) RETURNING * INTO r;
 END IF;
 IF r.object_id<>g.object_id OR r.claim_id<>g.claim_id OR r.token_sha256<>g.token_sha256 THEN
  RAISE EXCEPTION 'publication_release_receipt_conflict' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('state','ready','release_id',r.release_id,'grant',listing_publication_private.upload_binding(g.id)||
  jsonb_build_object('token',g.token,'issued_epoch',g.issued_epoch,'expires_epoch',g.expires_epoch));
END $f$;

-- NO INSERT here. A second HTTP transaction must see the SAME committed intent.
CREATE FUNCTION public.confirm_listing_upload_release_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid,p_release_id uuid,p_token_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp
SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; r listing_publication_private.source_release_intents%ROWTYPE;
BEGIN
 g:=listing_publication_private.lock_source_release_grant(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_dispatch_key,p_grant_id);
 IF p_token_sha256 IS NULL OR p_token_sha256 !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'publication_release_not_confirmed' USING ERRCODE='55000'; END IF;
 SELECT * INTO r FROM listing_publication_private.source_release_intents WHERE grant_id=g.id;
 IF NOT FOUND OR p_release_id IS NULL OR r.release_id IS DISTINCT FROM p_release_id OR g.state<>'recorded'
  OR g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  OR r.token_sha256 IS DISTINCT FROM decode(p_token_sha256,'hex') OR r.token_sha256 IS DISTINCT FROM g.token_sha256
  OR r.object_id IS DISTINCT FROM g.object_id OR r.claim_id IS DISTINCT FROM g.claim_id THEN
  RAISE EXCEPTION 'publication_release_not_confirmed' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('release_id',r.release_id,'grant_id',g.id,'confirmed',true);
END $f$;

CREATE FUNCTION listing_publication_private.protect_source_recorded_no_release() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 a listing_publication_private.attempts%ROWTYPE; t listing_publication_private.source_release_tracking%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_recorded_no_release_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=NEW.object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 SELECT * INTO t FROM listing_publication_private.source_release_tracking WHERE grant_id=NEW.grant_id;
 IF o.id IS NULL OR a.id IS NULL OR g.id IS NULL OR t.grant_id IS NULL
  OR o.kind<>'source' OR a.state NOT IN('cancelled','expired','deleted')
  OR o.bucket_id<>'listing-publication-private'
  OR o.object_path<>'v1/'||a.id::text||'/'||o.slot_id::text||'/source.upload'
  OR g.object_id IS DISTINCT FROM o.id OR t.object_id IS DISTINCT FROM o.id
  OR g.dispatch_key IS DISTINCT FROM o.dispatch_key OR t.dispatch_key IS DISTINCT FROM g.dispatch_key
  OR g.state<>'recorded' OR g.claim_id IS DISTINCT FROM NEW.claim_id
  OR g.token_sha256 IS DISTINCT FROM NEW.token_sha256
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=g.id)
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id
   AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND q.state='blocked_write_settlement') THEN
  RAISE EXCEPTION 'publication_recorded_no_release_binding' USING ERRCODE='22023'; END IF;
 NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_recorded_no_release BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_recorded_no_release FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_recorded_no_release();
CREATE TRIGGER protect_source_recorded_no_release_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_recorded_no_release FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_recorded_no_release();

CREATE FUNCTION public.settle_recorded_unreleased_source_one_v1() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 q listing_publication_private.cleanup%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT x.* INTO o FROM listing_publication_private.objects x
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 JOIN listing_publication_private.upload_grants ug ON ug.object_id=x.id
 JOIN listing_publication_private.source_release_tracking t ON t.grant_id=ug.id AND t.object_id=x.id AND t.dispatch_key=ug.dispatch_key
 JOIN listing_publication_private.cleanup c ON c.object_id=x.id
 WHERE a.state IN('cancelled','expired','deleted') AND x.kind='source'
  AND ug.state='recorded' AND x.dispatch_key=ug.dispatch_key
  AND x.bucket_id='listing-publication-private' AND c.bucket_id=x.bucket_id AND c.object_path=x.object_path
  AND c.state='blocked_write_settlement'
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=ug.id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=x.id)
 ORDER BY c.enqueued_at,x.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO q FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id;
 IF q.state<>'blocked_write_settlement' OR g.state<>'recorded'
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=g.id) THEN RETURN NULL; END IF;
 INSERT INTO listing_publication_private.source_recorded_no_release(object_id,grant_id,claim_id,token_sha256)
 VALUES(o.id,g.id,g.claim_id,g.token_sha256);
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'grant_id',g.id,'claim_id',g.claim_id,
  'proof','source_recorded_never_released','state','settled');
END $f$;

GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.settle_recorded_unreleased_source_one_v1() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_recorded_no_release() TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid),
 public.confirm_listing_upload_release_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text),
 public.settle_recorded_unreleased_source_one_v1(),
 listing_publication_private.lock_source_release_grant(uuid,uuid,uuid,uuid,uuid,uuid),
 listing_publication_private.protect_source_release_tracking(),listing_publication_private.track_source_grant_birth(),
 listing_publication_private.protect_source_release_intent(),listing_publication_private.protect_source_recorded_no_release()
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.source_release_intents IS
 'Immutable MAY-HAVE-BEEN-RELEASED ledger, not delivery success, revocation, upload completion or expiry. No token bytes. Broker must confirm committed intent in a separate transaction before returning token. API-closed lab.';
COMMENT ON TABLE listing_publication_private.source_release_tracking IS
 'Coverage from reserved grant birth only. NO BACKFILL. Absence for preexisting grants is UNKNOWN. Does not establish no exposure through privileged/uncontrolled paths.';

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
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
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id))
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
