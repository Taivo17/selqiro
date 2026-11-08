-- Explicit horse media purpose, reusing the accepted immutable binary lineage.
-- Existing ordinary implementations below retain every former branch and check.
CREATE FUNCTION horse_publication_private.attempt_publication_matches(p_attempt uuid,p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM horse_publication_private.commands c
  JOIN public.horse_offers h ON h.id=c.horse_offer_id
  JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id
  WHERE c.attempt_id=p_attempt AND c.actor_user_id=p_user AND c.identity_id=p_identity
   AND c.state='published' AND c.publication_event_id=h.current_publication_event_id
   AND h.identity_id=p_identity AND h.status='published' AND e.horse_offer_id=h.id
   AND e.identity_id=p_identity AND e.actor_user_id=p_user AND e.submission_key=p_attempt
   AND e.decision='published' AND horse_publication_private.is_public(h.id));
$f$;
REVOKE ALL ON FUNCTION horse_publication_private.attempt_publication_matches(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.attempt_publication_matches(uuid,uuid,uuid) TO selqiro_listing_final_writer_v1;

CREATE FUNCTION listing_publication_private.assert_non_horse_attempt_v1(p_attempt uuid)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM horse_publication_private.commands WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'horse_publication_requires_horse_command' USING ERRCODE='55000'; END IF;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.assert_non_horse_attempt_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_non_horse_attempt_v1(uuid) TO selqiro_listing_final_writer_v1;

CREATE FUNCTION listing_publication_private.require_attempt_policies_v1(p_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM horse_publication_private.commands c
  JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
  WHERE c.attempt_id=p_attempt AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
   AND a.request_key=c.request_key AND c.state='prepared') THEN
  RETURN horse_publication_private.require_policies();
 END IF;
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(p_attempt);
 RETURN listing_publication_private.require_policies();
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.require_attempt_policies_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.require_attempt_policies_v1(uuid) TO selqiro_listing_final_writer_v1;
CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 -- A canonical horse event is an explicit alternative, never a numeric listing.
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND horse_publication_private.attempt_publication_matches(OLD.id,OLD.actor_user_id,OLD.identity_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   JOIN listing_publication_private.attempts parent ON parent.id=p.attempt_id
   JOIN public.listings l ON l.id=p.listing_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='published' AND parent.state='published'
    AND parent.identity_id=OLD.identity_id AND l.identity_id=OLD.identity_id AND l.created_by_user_id=parent.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='deleting'
    AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p JOIN public.listings l ON l.id=p.listing_id
   WHERE p.attempt_id=OLD.id AND p.state='published' AND l.identity_id=OLD.identity_id AND l.created_by_user_id=OLD.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source' OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.attempt_id=OLD.id AND p.state='deleting'
   AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  OR OLD.state<>'open' OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path OR c.reason<>NEW.state
   OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.lock_web_context(p_user uuid,p_identity uuid,p_attempt uuid,p_service boolean)
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
 IF listing_publication_private.require_attempt_policies_v1(a.id) IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 IF p_service THEN
  PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 RETURN a.id;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.assert_ordinary_publication_v1(p_attempt uuid)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(p_attempt);
 IF EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'publication_addition_requires_append' USING ERRCODE='55000'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_listing_publication_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
   AND x.identity_id=active_id AND x.request_key=p_request_key FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(a.id);
 -- Reading/cancelling a user's private attempt never forces acceptance of changed terms.
 RETURN listing_publication_private.snapshot(a.id);
END $fn$;

CREATE OR REPLACE FUNCTION public.cancel_my_listing_publication_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; changed boolean;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
  AND x.identity_id=active_id AND x.request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(a.id);
 changed:=listing_publication_private.close_locked_attempt(a.id,'cancelled');
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('changed',changed);
END $fn$;

CREATE OR REPLACE FUNCTION public.get_my_listing_publication_journey_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO a FROM listing_publication_private.attempts
 WHERE actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('snapshot',NULL,'receipt',NULL,'intent_closed',EXISTS(
  SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id
  AND identity_id=p_expected_identity_id AND request_key=p_request_key)); END IF;
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(a.id);
 RETURN jsonb_build_object('snapshot',listing_publication_private.snapshot(a.id),
   'receipt',listing_publication_private.final_receipt(a.id),'intent_closed',a.state IN('cancelled','expired','deleted'));
END $f$;

-- Browser media commands use their client-file key, not the parent publication
-- request key. This read authorizes no capability itself; the multipart ledger
-- repeats actor, expiry, policy and immutable object checks before every write.
CREATE FUNCTION public.get_my_horse_publication_image_binding_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,p_client_file_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT jsonb_build_object('schema_version',1,'content_type','horse_offer','actor_user_id',a.actor_user_id,
  'identity_id',a.identity_id,'attempt_id',a.id,'slot_id',s.id,'client_file_id',s.client_file_id,
  'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex')) INTO result
 FROM horse_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id
 WHERE a.id=p_attempt_id AND a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id
  AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
  AND c.state='prepared' AND a.state='open' AND a.expires_at>clock_timestamp()
  AND s.id=p_slot_id AND s.client_file_id=p_client_file_id FOR SHARE OF a;
 IF result IS NULL THEN RAISE EXCEPTION 'horse_offer_image_unavailable' USING ERRCODE='42501'; END IF;
 RETURN result;
END $f$;

-- No storage path is returned by a public API. The service-only public binding
-- feeds the server's exact-hash WEB reader, which rereads this binding after IO.
CREATE FUNCTION horse_publication_private.media_binding(p_attempt uuid,p_ordinal integer,p_public boolean,p_identity uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'sha256',encode(g.web_sha256,'hex'),'bytes',g.web_bytes)
 FROM horse_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN horse_publication_private.gallery g ON g.attempt_id=a.id AND g.horse_offer_id=c.horse_offer_id
 JOIN public.horse_offers h ON h.id=g.horse_offer_id AND h.identity_id=c.identity_id
 JOIN public.identities identity_row ON identity_row.id=h.identity_id AND identity_row.status='active'
 JOIN public.horse_offer_images i ON i.id=g.image_id AND i.horse_offer_id=h.id AND i.identity_id=h.identity_id
 JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id AND e.horse_offer_id=h.id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.objects o ON o.id=g.object_id AND o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 WHERE a.id=p_attempt AND s.ordinal=p_ordinal AND a.state='published' AND c.state='published'
  AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id AND a.request_key=c.request_key
  AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id AND e.submission_key=a.id AND e.decision='published'
  AND w.state='ready' AND w.ready_id=g.ready_id AND w.ready_at IS NOT NULL
  AND w.intent->>'web_sha256'=encode(g.web_sha256,'hex') AND w.intent->>'web_bytes'=g.web_bytes::text
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
  AND i.original_url='/api/v2/horse-media/'||a.id::text||'/'||s.ordinal::text
  AND i.medium_url=i.original_url AND i.thumb_url=i.original_url AND i.storage_path=o.object_path
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id)
  AND CASE WHEN p_public THEN horse_publication_private.is_public(h.id) ELSE h.identity_id=p_identity END;
$f$;

CREATE FUNCTION public.get_public_horse_media_binding_v1(p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 RETURN horse_publication_private.media_binding(p_attempt_id,p_ordinal,true,NULL);
END $f$;

CREATE FUNCTION public.get_my_horse_media_binding_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 RETURN horse_publication_private.media_binding(p_attempt_id,p_ordinal,false,p_expected_identity_id);
END $f$;

-- An immutable publication event proves that the WEB was previously published.
-- Current membership is checked independently: a retained image is never eligible.
CREATE FUNCTION horse_publication_private.retired_web_deleted(p_object uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT o.kind='web' AND o.dispatch_key IS NULL
  AND q.reason='published_image_removed' AND q.state='deleted'
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
  AND a.state='published' AND c.state='published' AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
  AND e.horse_offer_id=c.horse_offer_id AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id
  AND e.submission_key=a.id AND e.decision='published'
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=w.intent->>'web_sha256' AND m.observed_bytes::text=w.intent->>'web_bytes'
  AND NOT EXISTS(SELECT 1 FROM horse_publication_private.gallery g WHERE g.object_id=o.id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN horse_publication_private.commands c ON c.attempt_id=a.id
 JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.multipart_attempts ma ON ma.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.attempt_id=a.id AND w.slot_id=s.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id WHERE o.id=p_object),false);
$f$;

-- Preserve all three accepted ordinary alternatives. Completed SOURCE proof is
-- already domain independent; only horse retired WEB adds a new alternative.
CREATE OR REPLACE FUNCTION listing_publication_private.multipart_object_fully_deleted(p_id uuid)
RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT horse_publication_private.retired_web_deleted(p_id) OR
 listing_publication_private.hosted_retired_web_deleted_v1(p_id) OR
 listing_publication_private.hosted_completed_source_deleted_v1(p_id) OR
 (coalesce(c.state='deleted',false) AND (m.id IS NULL OR
  (EXISTS(SELECT 1 FROM listing_publication_private.multipart_auxiliary_receipts r WHERE r.session_id=m.id)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path))))
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

-- Scope cleanup to one canonical horse and its immutable publication commands.
-- It may include earlier commands for that same horse after a later gallery edit.
CREATE FUNCTION horse_publication_private.lock_cleanup_context(p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid;
BEGIN
 PERFORM listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT c.horse_offer_id INTO offer_id FROM horse_publication_private.commands c
 JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 WHERE a.id=p_attempt AND a.identity_id=p_identity AND a.request_key=p_request
  AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
  AND c.state='published' AND a.state='published' FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_publication_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.horse_offers WHERE id=offer_id AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_publication_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 RETURN offer_id;
END $f$;

-- Shared eligibility predicate for claim and result recording. Unknown writes,
-- conflicting provider versions and live WEB membership always retain quota.
CREATE FUNCTION horse_publication_private.cleanup_object_eligible(p_object uuid,p_offer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT a.state='published' AND c.state='published' AND c.horse_offer_id=p_offer
  AND a.identity_id=c.identity_id AND a.actor_user_id=c.actor_user_id AND a.request_key=c.request_key
  AND e.horse_offer_id=p_offer AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id
  AND e.submission_key=a.id AND e.decision='published'
  AND o.dispatch_key IS NULL AND o.bucket_id='listing-publication-private'
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND o.object_path='v1/'||a.id::text||'/'||s.id::text||CASE WHEN o.kind='source' THEN '/source.upload' ELSE '/web-v1.webp' END
  AND ((o.kind='source' AND q.reason='published_source') OR (o.kind='web' AND q.reason='published_image_removed'))
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed' AND m.completed_at IS NOT NULL
  AND m.verified_at IS NOT NULL AND m.problem IS NULL AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END
  AND m.observed_bytes=CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
  AND CASE WHEN o.kind='web' THEN NOT EXISTS(SELECT 1 FROM horse_publication_private.gallery g WHERE g.object_id=o.id)
   ELSE EXISTS(SELECT 1 FROM listing_publication_private.objects web
    JOIN listing_publication_private.multipart_sessions wm ON wm.object_id=web.id
    WHERE web.slot_id=s.id AND web.attempt_id=a.id AND web.kind='web' AND web.dispatch_key IS NULL
     AND wm.provider_contract='supabase-s3-session-v1' AND wm.state='completed' AND wm.completed_at IS NOT NULL
     AND wm.verified_at IS NOT NULL AND wm.problem IS NULL AND wm.storage_object_id IS NOT NULL AND wm.storage_version IS NOT NULL
     AND wm.observed_sha256=w.intent->>'web_sha256' AND wm.observed_bytes::text=w.intent->>'web_bytes'
     AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=wm.upload_id OR (u.bucket_id=web.bucket_id AND u.key=web.object_path))
     AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=wm.upload_id OR (part.bucket_id=web.bucket_id AND part.key=web.object_path))
     AND ((EXISTS(SELECT 1 FROM horse_publication_private.gallery g WHERE g.object_id=web.id AND g.ready_id=w.ready_id)
       AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup qc WHERE qc.object_id=web.id)
       AND EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.id=wm.storage_object_id AND z.version=wm.storage_version AND z.bucket_id=web.bucket_id AND z.name=web.object_path)
       AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=web.bucket_id AND z.name=web.object_path AND (z.id<>wm.storage_object_id OR z.version IS DISTINCT FROM wm.storage_version)))
      OR (NOT EXISTS(SELECT 1 FROM horse_publication_private.gallery g WHERE g.object_id=web.id)
       AND EXISTS(SELECT 1 FROM listing_publication_private.cleanup qc WHERE qc.object_id=web.id AND qc.reason='published_image_removed'
        AND qc.bucket_id=web.bucket_id AND qc.object_path=web.object_path)))) END
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN horse_publication_private.commands c ON c.attempt_id=a.id
 JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id WHERE o.id=p_object),false);
$f$;

CREATE FUNCTION public.claim_horse_publication_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz;
BEGIN
 offer_id:=horse_publication_private.lock_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 t:=clock_timestamp();
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN horse_publication_private.commands cmd ON cmd.attempt_id=o.attempt_id AND cmd.horse_offer_id=offer_id
 WHERE horse_publication_private.cleanup_object_eligible(o.id,offer_id)
  AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t)) OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY CASE WHEN o.kind='source' THEN 0 ELSE 1 END,q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
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

CREATE FUNCTION public.record_horse_publication_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid,
 p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid; target_kind text; cleanup_state text; result jsonb;
BEGIN
 offer_id:=horse_publication_private.lock_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 SELECT o.kind,q.state INTO target_kind,cleanup_state FROM listing_publication_private.objects o
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN horse_publication_private.commands cmd ON cmd.attempt_id=o.attempt_id AND cmd.horse_offer_id=offer_id
 WHERE o.id=p_object_id AND q.work_key=p_work_key AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND ((o.kind='source' AND q.reason='published_source') OR (o.kind='web' AND q.reason='published_image_removed'))
 FOR UPDATE OF q;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_publication_cleanup_binding' USING ERRCODE='42501'; END IF;
 IF cleanup_state<>'deleted' AND NOT horse_publication_private.cleanup_object_eligible(p_object_id,offer_id) THEN
  RAISE EXCEPTION 'horse_publication_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 IF target_kind='web' AND EXISTS(SELECT 1 FROM horse_publication_private.gallery WHERE object_id=p_object_id) THEN
  RAISE EXCEPTION 'horse_publication_cleanup_active_image' USING ERRCODE='55000'; END IF;
 result:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND (CASE WHEN target_kind='source'
  THEN listing_publication_private.hosted_completed_source_deleted_v1(p_object_id)
  ELSE horse_publication_private.retired_web_deleted(p_object_id) END) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'horse_publication_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 RETURN result;
END $f$;

-- Browser rights are closed to their typed owner/public read contracts. Storage
-- claim/record remain service-only and execute under the retained ledger writer.
REVOKE ALL ON FUNCTION horse_publication_private.media_binding(uuid,integer,boolean,uuid),
 horse_publication_private.retired_web_deleted(uuid),horse_publication_private.lock_cleanup_context(uuid,uuid,uuid,uuid),
 horse_publication_private.cleanup_object_eligible(uuid,uuid),
 public.get_my_horse_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),
 public.get_public_horse_media_binding_v1(uuid,integer),public.get_my_horse_media_binding_v1(uuid,uuid,uuid,integer),
 public.claim_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_horse_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),
 public.get_my_horse_media_binding_v1(uuid,uuid,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_horse_media_binding_v1(uuid,integer),
 public.claim_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.retired_web_deleted(uuid),
 horse_publication_private.lock_cleanup_context(uuid,uuid,uuid,uuid),
 horse_publication_private.cleanup_object_eligible(uuid,uuid) TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_horse_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;

-- The binding is enforced below HTTP as well. Ordinary image request keys keep
-- their established semantics; a horse image uses its prepared client-file ID.
CREATE FUNCTION horse_publication_private.guard_image_request_key()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE expected uuid;
BEGIN
 IF TG_TABLE_SCHEMA<>'listing_publication_private' OR TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'horse_offer_image_binding_invalid' USING ERRCODE='55000'; END IF;
 IF TG_TABLE_NAME='multipart_sessions' THEN
  SELECT s.client_file_id INTO expected FROM listing_publication_private.objects o
  JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=o.attempt_id
  JOIN horse_publication_private.commands c ON c.attempt_id=o.attempt_id WHERE o.id=NEW.object_id;
 ELSIF TG_TABLE_NAME='web_images' THEN
  SELECT s.client_file_id INTO expected FROM listing_publication_private.slots s
  JOIN horse_publication_private.commands c ON c.attempt_id=s.attempt_id
  WHERE s.id=NEW.slot_id AND s.attempt_id=NEW.attempt_id;
 ELSE RAISE EXCEPTION 'horse_offer_image_binding_invalid' USING ERRCODE='55000'; END IF;
 IF expected IS NOT NULL AND NEW.request_key IS DISTINCT FROM expected THEN
  RAISE EXCEPTION 'horse_offer_image_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_horse_multipart_key BEFORE INSERT ON listing_publication_private.multipart_sessions
 FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key();
CREATE TRIGGER guard_horse_web_key BEFORE INSERT ON listing_publication_private.web_images
 FOR EACH ROW EXECUTE FUNCTION horse_publication_private.guard_image_request_key();
REVOKE ALL ON FUNCTION horse_publication_private.guard_image_request_key() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.guard_image_request_key() TO selqiro_listing_final_writer_v1;
