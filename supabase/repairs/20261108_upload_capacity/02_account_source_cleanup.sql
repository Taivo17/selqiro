-- Account housekeeping is explicitly distinct from acting as another identity.
-- The public service entry points first lock/recheck the real current active
-- identity. This helper checks ownership/access to the original SOURCE identity
-- without switching that identity or changing the user's authentication claims.
CREATE FUNCTION listing_publication_private.lock_account_upload_actor_v1(p_user uuid,p_identity uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.lock_upload_service_actor(p_user,p_identity);
END $f$;

CREATE FUNCTION listing_publication_private.lock_account_upload_identity_v1(p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_row public.identities%ROWTYPE;
BEGIN
 SELECT * INTO identity_row FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF identity_row.type='private' THEN RETURN identity_row.user_id=p_user; END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members WHERE business_account_id=identity_row.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  RETURN FOUND;
 END IF;
 RETURN false;
END $f$;

-- Exact verified completed SOURCE plus its still-attached WEB. Missing SOURCE
-- metadata can be a lost DELETE acknowledgement; conflicting versions, any
-- unresolved multipart writer, or an absent/conflicting WEB are never eligible.
CREATE FUNCTION listing_publication_private.account_source_cleanup_eligible_v1(p_object uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT a.actor_user_id=p_user AND a.state='published'
  AND o.kind='source' AND o.dispatch_key IS NULL AND o.bucket_id='listing-publication-private'
  AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/source.upload'
  AND q.reason='published_source' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.problem IS NULL
  AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=encode(s.expected_source_sha256,'hex') AND m.observed_bytes=s.expected_source_bytes
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part
   WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
  AND listing_publication_private.upload_object_is_published_web_v1(web.id)
  AND wm.provider_contract='supabase-s3-session-v1' AND wm.state='completed'
  AND wm.completed_at IS NOT NULL AND wm.verified_at IS NOT NULL AND wm.problem IS NULL
  AND wm.storage_object_id IS NOT NULL AND wm.storage_version IS NOT NULL
  AND wm.observed_sha256=w.intent->>'web_sha256' AND wm.observed_bytes::text=w.intent->>'web_bytes'
  AND EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.id=wm.storage_object_id AND z.version=wm.storage_version AND z.bucket_id=web.bucket_id AND z.name=web.object_path)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=web.bucket_id AND z.name=web.object_path AND (z.id<>wm.storage_object_id OR z.version IS DISTINCT FROM wm.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=wm.upload_id OR (u.bucket_id=web.bucket_id AND u.key=web.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part
   WHERE part.upload_id=wm.upload_id OR (part.bucket_id=web.bucket_id AND part.key=web.object_path))
  AND EXISTS(SELECT 1 FROM public.identities i WHERE i.id=a.identity_id AND i.status='active'
   AND ((i.type='private' AND i.user_id=p_user) OR (i.type='business' AND EXISTS(
    SELECT 1 FROM public.business_members bm WHERE bm.business_account_id=i.business_account_id
     AND bm.user_id=p_user AND bm.status='active'))))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.multipart_attempts ma ON ma.attempt_id=a.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN listing_publication_private.objects web ON web.attempt_id=a.id AND web.slot_id=s.id AND web.kind='web'
 JOIN listing_publication_private.web_images w ON w.attempt_id=a.id AND w.slot_id=s.id
 JOIN listing_publication_private.multipart_sessions wm ON wm.object_id=web.id
 WHERE o.id=p_object),false);
$f$;

-- Stable identity -> parent attempt -> origin -> canonical content -> image
-- locks close membership/access races before a SOURCE lease is issued. This
-- also permits recording an issued SOURCE result after the listing was removed.
CREATE FUNCTION listing_publication_private.lock_account_source_cleanup_context_v1(p_user uuid,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE origin_id uuid; target_identity uuid; root_id uuid; target_listing bigint; horse_id uuid;
BEGIN
 SELECT a.id,a.identity_id INTO origin_id,target_identity
 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE o.id=p_object AND o.kind='source' AND a.actor_user_id=p_user;
 IF NOT FOUND OR listing_publication_private.lock_account_upload_identity_v1(p_user,target_identity) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
 SELECT c.horse_offer_id INTO horse_id FROM horse_publication_private.commands c WHERE c.attempt_id=origin_id;
 IF FOUND THEN
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user
   AND a.identity_id=target_identity FOR SHARE;
  PERFORM 1 FROM public.horse_offers h WHERE h.id=horse_id AND h.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.horse_offer_images WHERE horse_offer_id=horse_id ORDER BY id FOR SHARE;
 ELSE
  SELECT listing_publication_private.managed_image_root_v1(origin_id) INTO root_id;
  IF root_id IS NULL THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=root_id AND a.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  IF root_id<>origin_id THEN
   PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user
    AND a.identity_id=target_identity FOR SHARE;
  END IF;
  SELECT p.listing_id INTO target_listing FROM listing_publication_private.publications p WHERE p.attempt_id=root_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.listings l WHERE l.id=target_listing FOR SHARE;
  PERFORM 1 FROM public.listing_images i WHERE i.listing_id=target_listing ORDER BY i.id FOR SHARE;
 END IF;
END $f$;

CREATE FUNCTION public.claim_listing_account_source_cleanup_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE candidate record; c listing_publication_private.cleanup%ROWTYPE; t timestamptz;
BEGIN
 PERFORM listing_publication_private.lock_account_upload_actor_v1(p_expected_user_id,p_expected_identity_id);
 t:=clock_timestamp();
 -- This worker selects only the verified account's own original SOURCE work.
 -- The caller cannot choose a different publisher, historical identity or WEB.
 FOR candidate IN
  SELECT o.id FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  JOIN listing_publication_private.cleanup q ON q.object_id=o.id
  WHERE a.actor_user_id=p_expected_user_id AND o.kind='source' AND q.reason='published_source'
   AND listing_publication_private.object_cleanup_state(o.id)='pending'
   AND listing_publication_private.account_source_cleanup_eligible_v1(o.id,p_expected_user_id)
   AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
    OR (q.state='in_flight' AND q.lease_until<=t))
  ORDER BY q.enqueued_at,q.object_id LIMIT 20
 LOOP
  BEGIN
   PERFORM listing_publication_private.lock_account_source_cleanup_context_v1(p_expected_user_id,candidate.id);
  EXCEPTION WHEN SQLSTATE '42501' THEN CONTINUE;
  END;
  t:=clock_timestamp();
  SELECT q.* INTO c FROM listing_publication_private.cleanup q WHERE q.object_id=candidate.id
   AND listing_publication_private.account_source_cleanup_eligible_v1(q.object_id,p_expected_user_id)
   AND listing_publication_private.object_cleanup_state(q.object_id)='pending'
   AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
    OR (q.state='in_flight' AND q.lease_until<=t)) FOR UPDATE OF q SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF c.try_count>=8 THEN
   UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
   CONTINUE;
  END IF;
  UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
   try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
  RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
   'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
 END LOOP;
 RETURN NULL;
END $f$;

CREATE FUNCTION public.record_listing_account_source_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE saved jsonb; cleanup_state text; session_problem text;
BEGIN
 PERFORM listing_publication_private.lock_account_upload_actor_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_publication_private.lock_account_source_cleanup_context_v1(p_expected_user_id,p_object_id);
 SELECT q.state,m.problem INTO cleanup_state,session_problem
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.id=p_object_id AND a.actor_user_id=p_expected_user_id AND o.kind='source' AND o.dispatch_key IS NULL
  AND q.reason='published_source' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND q.work_key=p_work_key
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL FOR UPDATE OF q;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_binding' USING ERRCODE='42501'; END IF;
 IF p_result='deleted' AND cleanup_state<>'deleted' AND session_problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 -- Existing recorder owns exact work-key, lease expiry, retry and idempotency.
 saved:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND listing_publication_private.hosted_completed_source_deleted_v1(p_object_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 RETURN saved;
END $f$;
