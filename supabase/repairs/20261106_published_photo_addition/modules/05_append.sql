-- Append exactly one verified WEB. Public membership, immutable acknowledgement,
-- SOURCE retirement, child terminal state and parent revision commit together.
CREATE FUNCTION public.append_my_managed_listing_image_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_request_key uuid,
 p_addition_attempt_id uuid,p_ready_id uuid,p_expected_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE parent_state text; a listing_publication_private.attempts%ROWTYPE;
 b listing_publication_private.managed_image_additions_v1%ROWTYPE;
 s listing_publication_private.slots%ROWTYPE; w listing_publication_private.web_images%ROWTYPE;
 gallery jsonb; previous_revision bigint; next_ordinal bigint; url text; first_image boolean;
 publisher uuid; affected integer; t timestamptz;
BEGIN
 IF p_request_key IS NULL OR p_addition_attempt_id IS NULL OR p_ready_id IS NULL
  OR p_expected_revision IS NULL OR p_expected_revision !~'^(0|[1-9][0-9]{0,18})$' THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 IF p_expected_revision::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 parent_state:=listing_publication_private.lock_managed_image_addition_parent_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_addition_attempt_id
  AND actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 SELECT * INTO b FROM listing_publication_private.managed_image_additions_v1
  WHERE attempt_id=a.id AND parent_attempt_id=p_attempt_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 IF b.attached_at IS NOT NULL THEN
  IF b.ready_id IS DISTINCT FROM p_ready_id THEN
   RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
  -- The permanent ACK remains valid if the added image has since been retired.
  RETURN listing_publication_private.managed_image_addition_status_v1(
   p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key)||jsonb_build_object('changed',false,'replayed',true);
 END IF;
 IF parent_state<>'published' OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 gallery:=listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 IF gallery->>'revision' IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 IF jsonb_array_length(gallery->'images')>=10 THEN
  RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 IF listing_publication_private.require_managed_image_policies_v1() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 SELECT * INTO s FROM listing_publication_private.slots WHERE attempt_id=a.id AND ordinal=0;
 IF NOT FOUND OR (SELECT count(*) FROM listing_publication_private.slots WHERE attempt_id=a.id)<>1 THEN
  RAISE EXCEPTION 'listing_image_addition_binding' USING ERRCODE='55000'; END IF;
 -- The child attempt lock serializes every retained WEB mutator; no extra
 -- UPDATE privilege is needed merely to lock the immutable ready receipt.
 SELECT * INTO w FROM listing_publication_private.web_images WHERE attempt_id=a.id AND slot_id=s.id;
 IF NOT FOUND OR w.state<>'ready' OR w.ready_id IS DISTINCT FROM p_ready_id OR w.ready_at IS NULL THEN
  RAISE EXCEPTION 'publication_images_not_ready' USING ERRCODE='55000'; END IF;
 PERFORM listing_publication_private.validate_managed_image_intent_v1(w.intent,s.id);
 IF (SELECT count(*) FROM listing_publication_private.objects WHERE attempt_id=a.id)<>2
  OR EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
   WHERE o.attempt_id=a.id AND (o.slot_id<>s.id OR o.dispatch_key IS NOT NULL
    OR m.id IS NULL OR m.provider_contract<>'supabase-s3-session-v1' OR m.state<>'completed'
    OR m.completed_at IS NULL OR m.verified_at IS NULL OR m.problem IS NOT NULL
    OR m.request_key IS DISTINCT FROM w.request_key OR m.storage_object_id IS NULL OR m.storage_version IS NULL
    OR m.observed_sha256 IS DISTINCT FROM CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END
    OR m.observed_bytes IS DISTINCT FROM CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END
    OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
     WHERE z.id=m.storage_object_id AND z.version=m.storage_version AND z.bucket_id=o.bucket_id AND z.name=o.object_path)
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
     WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
     WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts q
     WHERE q.upload_id=m.upload_id OR (q.bucket_id=o.bucket_id AND q.key=o.object_path))
    OR EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id))) THEN
  RAISE EXCEPTION 'publication_multipart_web_completion_required' USING ERRCODE='55000'; END IF;
 previous_revision:=(gallery->>'revision')::bigint;
 SELECT coalesce(max(g.ordinal)::bigint+1,0) INTO next_ordinal FROM listing_publication_private.managed_image_origins_v1(p_attempt_id) g;
 IF previous_revision=9223372036854775807 OR next_ordinal>2147483647 THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 SELECT actor_user_id INTO publisher FROM listing_publication_private.attempts WHERE id=p_attempt_id;
 first_image:=jsonb_array_length(gallery->'images')=0;
 url:='/api/v2/listing-media/'||a.id::text||'/0'; t:=clock_timestamp();
 INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 VALUES(p_listing_id,publisher,url,url,url,next_ordinal::integer,first_image);
 IF first_image THEN UPDATE public.listings SET image=url WHERE id=p_listing_id; END IF;
 IF previous_revision=0 THEN
  INSERT INTO listing_publication_private.managed_image_presentations_v1(attempt_id,revision) VALUES(p_attempt_id,1);
 ELSE UPDATE listing_publication_private.managed_image_presentations_v1 SET revision=previous_revision+1
  WHERE attempt_id=p_attempt_id AND revision=previous_revision; END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 UPDATE listing_publication_private.managed_image_additions_v1 SET attached_at=t,ready_id=w.ready_id,
  gallery_ordinal=next_ordinal::integer,attached_revision=previous_revision+1,was_primary=first_image WHERE attempt_id=a.id;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_source',listing_publication_private.object_cleanup_state(o.id),t
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id AND o.kind='source';
 -- Recheck the wall-clock and policy boundary after every potentially waiting lock.
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF listing_publication_private.require_managed_image_policies_v1() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=t WHERE id=a.id;
 RETURN listing_publication_private.managed_image_addition_status_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key)||jsonb_build_object('changed',true,'replayed',false);
END $f$;
