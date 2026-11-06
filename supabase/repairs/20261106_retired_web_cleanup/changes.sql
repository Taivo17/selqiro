-- Complete exactly one already retired, verified WEB through Storage API IO.
-- Apply only through apply.sql. No new table, queue, role or Storage-table write.
CREATE FUNCTION listing_publication_private.hosted_retired_web_deleted_v1(p_object uuid)
RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT o.kind='web' AND o.dispatch_key IS NULL
  AND c.reason='published_image_removed' AND c.state='deleted'
  AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path
  AND o.bucket_id='listing-publication-private'
  AND o.object_path='v1/'||o.attempt_id::text||'/'||s.id::text||'/web-v1.webp'
  AND p.published_at IS NOT NULL AND p.confirmation_sha256 IS NOT NULL
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex')
  AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL
  AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=w.intent->>'web_sha256'
  AND m.observed_bytes::text=w.intent->>'web_bytes'
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts q
   WHERE q.upload_id=m.upload_id OR (q.bucket_id=o.bucket_id AND q.key=o.object_path))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=o.attempt_id
 JOIN listing_publication_private.multipart_attempts a ON a.attempt_id=o.attempt_id
 JOIN listing_publication_private.publications p ON p.attempt_id=o.attempt_id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=o.attempt_id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.id=p_object),false);
$f$;

-- Retain both accepted alternatives exactly. The new proof relies on protected
-- retirement lineage, never on RLS-hidden public rows or mutable listing/SOURCE
-- state. Later content removal or a diagnostic cannot recharge this WEB.
CREATE OR REPLACE FUNCTION listing_publication_private.multipart_object_fully_deleted(p_id uuid)
RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT listing_publication_private.hosted_retired_web_deleted_v1(p_id) OR
 listing_publication_private.hosted_completed_source_deleted_v1(p_id) OR
 (coalesce(c.state='deleted',false) AND (m.id IS NULL OR
  (EXISTS(SELECT 1 FROM listing_publication_private.multipart_auxiliary_receipts r WHERE r.session_id=m.id)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path))))
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

CREATE FUNCTION listing_publication_private.lock_retired_web_cleanup_context_v1(
 p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; context record;
 old_sub text:=current_setting('request.jwt.claim.sub',true);
 old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_user,p_identity,p_attempt,p_request);
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT a.state AS attempt_state,p.state AS publication_state,p.listing_id,p.deleted_at INTO context
 FROM listing_publication_private.attempts a JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE a.id=aid FOR SHARE OF p;
 IF NOT FOUND OR NOT((context.attempt_state='published' AND context.publication_state='published' AND context.deleted_at IS NULL)
  OR (context.attempt_state='deleted' AND context.publication_state='deleting' AND context.deleted_at IS NOT NULL)) THEN
  RAISE EXCEPTION 'publication_retired_web_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 -- Bind the already verified actor while checking public membership. Otherwise
 -- identity RLS could hide an active row and falsely suggest that it is absent.
 PERFORM set_config('request.jwt.claim.sub',p_user::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user)::text,true);
 IF context.attempt_state='published' THEN
  PERFORM listing_publication_private.lock_managed_listing_images_v1(p_user,p_identity,context.listing_id,aid,false);
 ELSE
  -- Whole-listing deletion may commit after a worker dispatched Storage DELETE.
  -- It preserves the old retirement reason; it does not authorize other objects.
  PERFORM 1 FROM public.listings WHERE id=context.listing_id FOR SHARE;
  IF FOUND THEN RAISE EXCEPTION 'publication_retired_web_cleanup_unavailable' USING ERRCODE='55000'; END IF;
  PERFORM 1 FROM public.listing_images WHERE listing_id=context.listing_id FOR SHARE;
  IF FOUND THEN RAISE EXCEPTION 'publication_retired_web_cleanup_unavailable' USING ERRCODE='55000'; END IF;
 END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 RETURN aid;
 -- Statement/subtransaction failure restores the temporary GUC changes too.
END $f$;

CREATE FUNCTION public.claim_listing_retired_web_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz;
BEGIN
 aid:=listing_publication_private.lock_retired_web_cleanup_context_v1(
  p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 t:=clock_timestamp();
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=o.attempt_id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=o.attempt_id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.attempt_id=aid AND o.kind='web' AND o.dispatch_key IS NULL
  AND q.reason='published_image_removed' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex')
  AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.problem IS NULL
  AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=w.intent->>'web_sha256' AND m.observed_bytes::text=w.intent->>'web_bytes'
  AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path
    AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts up
   WHERE up.upload_id=m.upload_id OR (up.bucket_id=o.bucket_id AND up.key=o.object_path))
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
 RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
  'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
END $f$;

CREATE FUNCTION public.record_listing_retired_web_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid,
 p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; result jsonb; cleanup_state text; session_problem text;
BEGIN
 aid:=listing_publication_private.lock_retired_web_cleanup_context_v1(
  p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 SELECT c.state,m.problem INTO cleanup_state,session_problem FROM listing_publication_private.objects o
 JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.id=p_object_id AND o.attempt_id=aid AND o.kind='web' AND o.dispatch_key IS NULL
  AND c.reason='published_image_removed' AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path
  AND c.work_key=p_work_key AND m.state='completed' AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL
 FOR UPDATE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_retired_web_cleanup_binding' USING ERRCODE='42501'; END IF;
 IF p_result='deleted' AND cleanup_state<>'deleted' AND session_problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_retired_web_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 -- Reuse exact lease, idempotency, retry/backoff and eight-attempt limits.
 result:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND listing_publication_private.hosted_retired_web_deleted_v1(p_object_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_retired_web_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 -- The recorder update rolls back on failed proof. No release on an ACK alone.
 RETURN result;
END $f$;

CREATE FUNCTION public.get_my_listing_retired_web_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid;
BEGIN
 PERFORM listing_publication_private.require_managed_image_actor_v1(p_expected_user_id,p_expected_identity_id);
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE a.id=p_attempt_id AND a.identity_id=p_expected_identity_id AND a.request_key=p_request_key
  AND ((a.state='published' AND p.state='published' AND p.deleted_at IS NULL)
   OR (a.state='deleted' AND p.state='deleting' AND p.deleted_at IS NOT NULL)) FOR SHARE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_retired_web_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 -- Separate derived status: no Storage IO, no mutation, no second balance and
 -- no dependence on a perfect gallery. Published SOURCE receipt stays unchanged.
 RETURN (SELECT jsonb_build_object('schema_version',1,'attempt_id',aid,'request_key',p_request_key,
  'files_remaining',count(*),
  'needs_attention',count(*) FILTER(WHERE c.state IN('needs_attention','blocked_write_settlement') OR m.problem IS NOT NULL),
  'reserved_bytes',coalesce(sum(o.reserved_bytes),0))
 FROM listing_publication_private.objects o JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.attempt_id=aid AND o.kind='web' AND c.reason='published_image_removed'
  AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path
  AND listing_publication_private.multipart_object_fully_deleted(o.id) IS DISTINCT FROM true);
END $f$;

GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.get_my_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.hosted_retired_web_deleted_v1(uuid),
 listing_publication_private.lock_retired_web_cleanup_context_v1(uuid,uuid,uuid,uuid),
 public.claim_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text),
 public.get_my_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.hosted_retired_web_deleted_v1(uuid),
 listing_publication_private.lock_retired_web_cleanup_context_v1(uuid,uuid,uuid,uuid) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.claim_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_listing_retired_web_cleanup_v1(uuid,uuid,uuid,uuid) TO authenticated;
COMMENT ON FUNCTION listing_publication_private.hosted_retired_web_deleted_v1(uuid) IS
 'Exact retired WEB logical removal after completed verified upload and Storage API deletion. Protected retirement lineage, immutable WEB proof and authoritative metadata absence; no hidden provider disk or SOURCE-state assertion.';
