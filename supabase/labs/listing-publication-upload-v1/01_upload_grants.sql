-- NEW DORMANT LAB: not a migration, no Storage call, no grants to API roles.
-- Requires the exact existing private-attempt v1 dependency schema (01..05).
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE TABLE listing_publication_private.upload_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 dispatch_key uuid NOT NULL,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','signing','recorded')),
 claim_id uuid UNIQUE,
 claimed_at timestamptz,
 send_before_epoch bigint,
 token text,
 token_sha256 bytea CHECK(token_sha256 IS NULL OR octet_length(token_sha256)=32),
 issued_epoch bigint,
 expires_epoch bigint,
 recorded_at timestamptz,
 token_purged_at timestamptz,
 CHECK((state='reserved' AND claim_id IS NULL AND claimed_at IS NULL AND send_before_epoch IS NULL)
    OR (state IN('signing','recorded') AND claim_id IS NOT NULL AND claimed_at IS NOT NULL
        AND send_before_epoch IS NOT NULL AND send_before_epoch=floor(extract(epoch FROM claimed_at))::bigint+30)),
 CHECK((state IN('reserved','signing') AND token IS NULL AND token_sha256 IS NULL AND issued_epoch IS NULL
        AND expires_epoch IS NULL AND recorded_at IS NULL AND token_purged_at IS NULL)
    OR (state='recorded' AND token_sha256 IS NOT NULL AND issued_epoch IS NOT NULL AND issued_epoch>0
        AND expires_epoch IS NOT NULL AND expires_epoch=issued_epoch+7200 AND recorded_at IS NOT NULL
        AND ((token IS NOT NULL AND char_length(token) BETWEEN 1 AND 4096 AND token_purged_at IS NULL)
          OR (token IS NULL AND token_purged_at IS NOT NULL))))
);
CREATE INDEX upload_grants_token_expiry ON listing_publication_private.upload_grants(expires_epoch,id)
 WHERE token IS NOT NULL;
ALTER TABLE listing_publication_private.upload_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.upload_grants FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_upload_grant() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_upload_receipt_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='reserved' AND NEW.state='signing' AND NEW.claim_id IS NOT NULL AND NEW.claimed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','claim_id','claimed_at','send_before_epoch'])=
      (to_jsonb(OLD)-ARRAY['state','claim_id','claimed_at','send_before_epoch']) THEN RETURN NEW; END IF;
 IF OLD.state='signing' AND NEW.state='recorded' AND NEW.token IS NOT NULL AND NEW.recorded_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','token','token_sha256','issued_epoch','expires_epoch','recorded_at'])=
      (to_jsonb(OLD)-ARRAY['state','token','token_sha256','issued_epoch','expires_epoch','recorded_at']) THEN RETURN NEW; END IF;
 IF OLD.state='recorded' AND OLD.token IS NOT NULL AND NEW.token IS NULL AND NEW.token_purged_at IS NOT NULL
  AND OLD.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  AND (to_jsonb(NEW)-ARRAY['token','token_purged_at'])=(to_jsonb(OLD)-ARRAY['token','token_purged_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_upload_receipt_immutable' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_upload_grant BEFORE UPDATE OR DELETE ON listing_publication_private.upload_grants
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_upload_grant();

CREATE FUNCTION listing_publication_private.upload_binding(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,
  'attempt_id',a.id,'slot_id',s.id,'object_id',o.id,'dispatch_key',g.dispatch_key,'grant_id',g.id,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'expected_bytes',s.expected_source_bytes,
  'expected_sha256',encode(s.expected_source_sha256,'hex'))
 FROM listing_publication_private.upload_grants g JOIN listing_publication_private.objects o ON o.id=g.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE g.id=p_id AND o.kind='source' AND o.dispatch_key=g.dispatch_key;
$f$;

CREATE FUNCTION listing_publication_private.require_upload_service() RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 -- 'role' is the actual SQL role selected by the trusted connection, not a JWT-body
 -- assertion supplied by a browser. SECURITY DEFINER changes current_user, not role.
 -- The postgres exception is limited to this synthetic helper DB and RESET ROLE.
 IF current_setting('role',true)='service_role' THEN RETURN; END IF;
 IF current_database()='selqiro_publication_attempt_fixture' AND session_user='postgres'
    AND current_setting('role',true)='none' THEN RETURN; END IF;
 RAISE EXCEPTION 'publication_upload_service_required' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_publication_private.lock_upload_service_actor(p_user uuid,p_identity uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE old_sub text:=current_setting('request.jwt.claim.sub',true);
 old_claims text:=current_setting('request.jwt.claims',true); active_id uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 -- Trusted server verified the user's bearer via Auth. Reuse the EXISTING actor/
 -- identity lock under that actor; do not duplicate price/identity/policy logic.
 PERFORM set_config('request.jwt.claim.sub',coalesce(p_user::text,''),true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user)::text,true);
 active_id:=listing_publication_private.require_actor(p_user,p_identity);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 RETURN active_id;
 -- On error, statement/subtransaction rollback restores the GUCs as well.
END $f$;

CREATE FUNCTION public.reserve_my_listing_upload_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE reserved jsonb; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 reserved:=listing_publication_private.reserve_upload_dispatch_v1(p_expected_user_id,p_expected_identity_id,
  p_attempt_id,p_slot_id,p_dispatch_key);
 IF (reserved->>'dispatch_allowed')::boolean THEN
  INSERT INTO listing_publication_private.upload_grants(object_id,dispatch_key)
   VALUES((reserved->>'object_id')::uuid,p_dispatch_key) RETURNING * INTO g;
 ELSE
  SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.object_id=(reserved->>'object_id')::uuid;
 END IF;
 -- A legacy reservation without this new receipt cannot be assumed unsent. Do not
 -- fabricate a replacement claim or mint another URL for it.
 RETURN jsonb_build_object('binding',listing_publication_private.upload_binding(g.id));
END $f$;

CREATE FUNCTION public.claim_listing_upload_sign_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 g listing_publication_private.upload_grants%ROWTYPE; allowed boolean:=false; now_time timestamptz;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 active_id:=listing_publication_private.lock_upload_service_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 -- Versioned acceptance helpers also need the trusted actor. Restore both GUCs before return.
 PERFORM set_config('request.jwt.claim.sub',p_expected_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_expected_user_id)::text,true);
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id
  WHERE x.id=p_grant_id AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key
    AND o.attempt_id=a.id AND o.slot_id=p_slot_id AND o.kind='source' FOR UPDATE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 now_time:=clock_timestamp();
 IF a.expires_at<=now_time THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF g.state='reserved' THEN
  UPDATE listing_publication_private.upload_grants SET state='signing',claim_id=gen_random_uuid(),
   claimed_at=now_time,send_before_epoch=floor(extract(epoch FROM now_time))::bigint+30 WHERE id=g.id RETURNING * INTO g;
  allowed:=true;
 END IF;
 -- No lease takeover. An abandoned 'signing' is uncertain, never automatically retryable.
 RETURN jsonb_build_object('binding',listing_publication_private.upload_binding(g.id),'sign_allowed',allowed,
  'claim_id',g.claim_id,'send_before_epoch',g.send_before_epoch);
END $f$;

CREATE FUNCTION public.record_listing_upload_grant_v1(p_grant_id uuid,p_claim_id uuid,p_token text,
 p_issued_epoch bigint,p_expires_epoch bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; actor uuid; attempt uuid; claims jsonb; segment text; digest bytea;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT x.actor_user_id,x.id INTO actor,attempt FROM listing_publication_private.upload_grants ug
 JOIN listing_publication_private.objects ob ON ob.id=ug.object_id
 JOIN listing_publication_private.attempts x ON x.id=ob.attempt_id WHERE ug.id=p_grant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 -- Same profile -> attempt -> grant order. Recording external evidence remains allowed
 -- AFTER cancel/expiry/access change; it does not authorize releasing a token or publishing.
 PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=attempt FOR UPDATE;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.id=p_grant_id FOR UPDATE;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.id=g.object_id;
 IF p_claim_id IS NULL OR g.claim_id IS DISTINCT FROM p_claim_id OR g.state='reserved' THEN
  RAISE EXCEPTION 'publication_upload_claim_mismatch' USING ERRCODE='22023'; END IF;
 IF p_token IS NULL OR char_length(p_token)>4096 OR p_token !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
  OR p_issued_epoch IS NULL OR p_expires_epoch IS NULL OR p_expires_epoch<>p_issued_epoch+7200
  OR p_issued_epoch<floor(extract(epoch FROM g.claimed_at))::bigint-60
  OR p_issued_epoch>g.send_before_epoch+60 OR p_issued_epoch>floor(extract(epoch FROM clock_timestamp()))::bigint+60 THEN
  RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END IF;
 BEGIN
  segment:=translate(split_part(p_token,'.',2),'-_','+/');
  claims:=convert_from(decode(segment||repeat('=',(4-length(segment)%4)%4),'base64'),'UTF8')::jsonb;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END;
 -- Consistency only, NOT signature verification. Only a trusted service broker may
 -- attest a token from its own authenticated HTTPS Storage signing response.
 IF jsonb_typeof(claims) IS DISTINCT FROM 'object' OR claims->>'url' IS DISTINCT FROM o.bucket_id||'/'||o.object_path
   OR claims->'upsert' IS DISTINCT FROM 'false'::jsonb OR claims->'iat' IS DISTINCT FROM to_jsonb(p_issued_epoch)
   OR claims->'exp' IS DISTINCT FROM to_jsonb(p_expires_epoch) THEN
  RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END IF;
 digest:=sha256(convert_to(p_token,'UTF8'));
 IF g.state='recorded' THEN
  IF g.token_sha256 IS DISTINCT FROM digest OR g.issued_epoch IS DISTINCT FROM p_issued_epoch
   OR g.expires_epoch IS DISTINCT FROM p_expires_epoch THEN
   RAISE EXCEPTION 'publication_upload_receipt_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  UPDATE listing_publication_private.upload_grants SET state='recorded',token=p_token,token_sha256=digest,
   issued_epoch=p_issued_epoch,expires_epoch=p_expires_epoch,recorded_at=clock_timestamp() WHERE id=g.id;
 END IF;
 RETURN jsonb_build_object('recorded',true);
END $f$;

CREATE FUNCTION public.get_my_listing_upload_grant_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id WHERE x.id=p_grant_id
  AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key AND o.attempt_id=a.id
  AND o.slot_id=p_slot_id AND o.kind='source' FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF g.state<>'recorded' THEN RETURN jsonb_build_object('state','pending','grant',NULL); END IF;
 IF g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
  RETURN jsonb_build_object('state','expired','grant',NULL); END IF;
 RETURN jsonb_build_object('state','ready','grant',listing_publication_private.upload_binding(g.id)||
  jsonb_build_object('token',g.token,'issued_epoch',g.issued_epoch,'expires_epoch',g.expires_epoch));
END $f$;

CREATE FUNCTION public.purge_listing_upload_token_one_v1(p_grant_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid; attempt uuid; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT a.actor_user_id,a.id INTO actor,attempt FROM listing_publication_private.upload_grants ug
  JOIN listing_publication_private.objects o ON o.id=ug.object_id
  JOIN listing_publication_private.attempts a ON a.id=o.attempt_id WHERE ug.id=p_grant_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=attempt FOR UPDATE;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.id=p_grant_id FOR UPDATE;
 IF g.token IS NULL OR g.expires_epoch>floor(extract(epoch FROM clock_timestamp()))::bigint THEN RETURN false; END IF;
 UPDATE listing_publication_private.upload_grants SET token=NULL,token_purged_at=clock_timestamp() WHERE id=g.id;
 -- This clears only an expired secret. It NEVER deletes Storage objects, unblocks
 -- cleanup, releases byte quota or establishes remote-write quiescence.
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.purge_listing_upload_token_one_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.upload_grants IS
 'Dormant private SOURCE upload issuance fence and short-lived capability receipt. Secrets never enter logs or public listing data. No cleanup completion from expiry/404; no grant means unknown, not absent.';
