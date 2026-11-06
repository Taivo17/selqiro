-- The existing terminal multipart worker receives a bounded exact family page.
-- Counts cover all eligible retained work; settled objects leave the next page.
CREATE OR REPLACE FUNCTION public.prepare_listing_multipart_cleanup_v2(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; has_children boolean;
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 SELECT EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 WHERE parent_attempt_id=aid) INTO has_children;
 INSERT INTO listing_publication_private.multipart_abort_observations(session_id)
 SELECT m.id FROM listing_publication_private.multipart_sessions m JOIN listing_publication_private.objects o ON o.id=m.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid))
  AND a.state IN('cancelled','expired','deleted') AND m.completed_at IS NULL
  AND m.upload_id IS NOT NULL AND m.create_received_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_abort_observations b WHERE b.session_id=m.id);
 UPDATE listing_publication_private.cleanup c SET state='pending' FROM listing_publication_private.objects o
 WHERE c.object_id=o.id AND o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid))
  AND c.state='blocked_write_settlement' AND listing_publication_private.object_cleanup_state(o.id)='pending';
 RETURN (WITH eligible AS MATERIALIZED (
  SELECT o.id AS object_id,a.id AS origin_attempt_id,a.request_key AS origin_request_key,m.id AS session_id,
   m.completed_at,m.problem,c.state AS cleanup_state,b.abort_key,b.session_id AS abort_session,b.observed_at,
   r.session_id AS auxiliary_session,listing_publication_private.multipart_object_fully_deleted(o.id) AS fully_deleted
  FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  LEFT JOIN listing_publication_private.multipart_abort_observations b ON b.session_id=m.id
  LEFT JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=m.id
  WHERE a.id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid))
   AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source')))
 SELECT jsonb_build_object('schema_version',CASE WHEN has_children THEN 4 ELSE 3 END,'attempt_id',aid,'request_key',p_request_key,
  'files_remaining',count(*) FILTER(WHERE NOT fully_deleted),
  'unresolved',count(*) FILTER(WHERE session_id IS NOT NULL AND completed_at IS NULL AND observed_at IS NULL),
  'needs_attention',count(*) FILTER(WHERE NOT fully_deleted AND (cleanup_state='needs_attention' OR problem IS NOT NULL)),
  'blocked',count(*) FILTER(WHERE NOT fully_deleted AND cleanup_state='blocked_write_settlement'),
  'auxiliary_pending',count(*) FILTER(WHERE NOT fully_deleted AND session_id IS NOT NULL AND auxiliary_session IS NULL),
  'items',(SELECT coalesce(jsonb_agg((CASE WHEN has_children THEN
    jsonb_build_object('origin_attempt_id',page.origin_attempt_id,'origin_request_key',page.origin_request_key)
    ELSE '{}'::jsonb END)||jsonb_build_object('object_id',page.object_id,
    'session',CASE WHEN page.session_id IS NULL THEN NULL ELSE listing_publication_private.multipart_binding(page.object_id) END,
    'abort_key',page.abort_key,'abort_allowed',page.abort_session IS NOT NULL AND page.observed_at IS NULL,
    'abort_observed',page.observed_at IS NOT NULL,'auxiliary_observed',page.auxiliary_session IS NOT NULL)
    ORDER BY page.object_id),'[]'::jsonb)
   FROM (SELECT * FROM eligible WHERE NOT has_children OR NOT fully_deleted ORDER BY object_id LIMIT 20) page)) FROM eligible);
END $f$;

CREATE OR REPLACE FUNCTION public.claim_listing_cleanup_for_attempt_v2(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(aid))
  AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source'))
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
 RETURN listing_publication_private.managed_image_cleanup_task_v2(aid,p_request_key,c.object_id);
END $f$;
