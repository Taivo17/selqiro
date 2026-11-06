-- Expand only the exact parent/child selection. Provider IO, verification,
-- leases, retry limits and the accepted SOURCE deletion proof remain unchanged.
CREATE OR REPLACE FUNCTION listing_publication_private.lock_multipart_cleanup_context(p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 -- The current authorizer may be another active business member of the same
 -- identity. The accepted identity lock above checks their actual access; the
 -- original publisher remains unchanged in attempts/publication receipts.
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt
  AND identity_id=active_id AND request_key=p_request FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts m WHERE m.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(a.id))) THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 IF a.state NOT IN('cancelled','expired','deleted','published') THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_not_terminal' USING ERRCODE='55000'; END IF;
 -- Parent -> child locking matches append and whole-listing deletion. A child
 -- request has no descendants and retains the existing single-attempt behavior.
 PERFORM 1 FROM listing_publication_private.attempts child
 WHERE child.id IN(SELECT b.attempt_id FROM listing_publication_private.managed_image_additions_v1 b WHERE b.parent_attempt_id=a.id)
 ORDER BY child.id FOR UPDATE;
 RETURN a.id;
END $f$;

CREATE FUNCTION listing_publication_private.managed_image_cleanup_task_v2(p_parent uuid,p_request uuid,p_object uuid)
RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN a.id=p_parent THEN jsonb_build_object('schema_version',1)
  ELSE jsonb_build_object('schema_version',2,'attempt_id',p_parent,'request_key',p_request,
   'origin_attempt_id',a.id,'origin_request_key',a.request_key) END||jsonb_build_object(
  'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,'object_path',c.object_path,
  'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint)
 FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE c.object_id=p_object AND o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(p_parent));
$f$;

CREATE OR REPLACE FUNCTION public.claim_listing_published_source_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; listing_id bigint; c listing_publication_private.cleanup%ROWTYPE;
 t timestamptz:=clock_timestamp(); old_sub text:=current_setting('request.jwt.claim.sub',true);
 old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(
  p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT p.listing_id INTO listing_id FROM listing_publication_private.publications p
 JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 WHERE a.id=aid AND a.state='published' AND p.state='published' AND p.deleted_at IS NULL
 FOR SHARE OF p;
 IF NOT FOUND THEN RETURN NULL; END IF;

 -- Auth already bound this user at the server boundary. The service-only actor
 -- lock above verifies their current access. Reuse the accepted gallery checker
 -- under that same user so original identity RLS also protects its public reads.
 PERFORM set_config('request.jwt.claim.sub',p_expected_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_expected_user_id)::text,true);
 PERFORM listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,listing_id,aid,false);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 -- A failed statement/subtransaction restores its temporary GUC changes too.
 t:=clock_timestamp();

 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=o.attempt_id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.objects w ON w.attempt_id=o.attempt_id AND w.slot_id=o.slot_id AND w.kind='web'
 JOIN listing_publication_private.web_images r ON r.attempt_id=w.attempt_id AND r.slot_id=w.slot_id
 JOIN listing_publication_private.multipart_sessions wm ON wm.object_id=w.id
 WHERE o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid)) AND o.kind='source' AND o.dispatch_key IS NULL
  AND q.reason='published_source' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.problem IS NULL
  AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=encode(s.expected_source_sha256,'hex') AND m.observed_bytes=s.expected_source_bytes
  AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts up
   WHERE up.upload_id=m.upload_id OR (up.bucket_id=o.bucket_id AND up.key=o.object_path))
  AND r.state='ready' AND r.ready_id IS NOT NULL AND r.ready_at IS NOT NULL
  AND wm.provider_contract='supabase-s3-session-v1' AND wm.state='completed'
  AND wm.completed_at IS NOT NULL AND wm.verified_at IS NOT NULL AND wm.problem IS NULL
  AND wm.observed_sha256=r.intent->>'web_sha256' AND wm.observed_bytes=(r.intent->>'web_bytes')::integer
  AND EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=w.bucket_id AND z.name=w.object_path AND z.id=wm.storage_object_id AND z.version=wm.storage_version)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=w.bucket_id AND z.name=w.object_path AND (z.id<>wm.storage_object_id OR z.version IS DISTINCT FROM wm.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup wc WHERE wc.object_id=w.id)
  AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
   OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF c.try_count>=8 THEN
  UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
  RETURN NULL;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
  try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
 RETURN listing_publication_private.managed_image_cleanup_task_v2(aid,p_request_key,c.object_id);
END $f$;

CREATE OR REPLACE FUNCTION public.record_listing_published_source_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid,
 p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; result jsonb; cleanup_state text; session_problem text;
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(
  p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 -- A listing may be removed after the external DELETE was dispatched. Preserve
 -- the original published_source lineage; do not require mutable published state.
 SELECT c.state,m.problem INTO cleanup_state,session_problem FROM listing_publication_private.objects o
 JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.id=p_object_id AND o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid)) AND o.kind='source' AND o.dispatch_key IS NULL
  AND c.reason='published_source' AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path
  AND c.work_key=p_work_key AND m.state='completed' AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL
 FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_source_cleanup_binding' USING ERRCODE='42501'; END IF;
 IF p_result='deleted' AND cleanup_state<>'deleted' AND session_problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000';
 END IF;
 -- A later diagnostic cannot undo an already accepted logical deletion. The
 -- immutable verified lineage and current metadata absence remain mandatory.
 -- The closed recorder owns lease expiry, idempotency, backoff and retry limits.
 result:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND listing_publication_private.hosted_completed_source_deleted_v1(p_object_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000';
 END IF;
 -- Failure above rolls back the recorder update; no quota changes on an ACK alone.
 RETURN result;
END $f$;
