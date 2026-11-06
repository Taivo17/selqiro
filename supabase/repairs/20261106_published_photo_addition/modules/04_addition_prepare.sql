CREATE FUNCTION public.get_my_managed_listing_image_addition_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 RETURN listing_publication_private.managed_image_addition_status_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key);
END $f$;

CREATE FUNCTION public.prepare_my_managed_listing_image_addition_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_request_key uuid,
 p_expected_revision text,p_image jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE parent_state text; image jsonb; payload jsonb; fingerprint bytea;
 a listing_publication_private.attempts%ROWTYPE; aid uuid; gallery jsonb;
BEGIN
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid
  OR p_expected_revision IS NULL OR p_expected_revision !~'^(0|[1-9][0-9]{0,18})$' THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 IF p_expected_revision::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 parent_state:=listing_publication_private.lock_managed_image_addition_parent_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 image:=listing_publication_private.normalize_managed_image_addition_v1(p_image);
 payload:=jsonb_build_object('schema_version',1,'purpose','listing_image_addition',
  'parent_attempt_id',p_attempt_id,'listing_id',p_listing_id::text);
 fingerprint:=sha256(convert_to('selqiro-managed-image-addition-v1:'||jsonb_build_object('target',payload,'image',image)::text,'UTF8'));
 SELECT * INTO a FROM listing_publication_private.attempts
  WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM p_expected_identity_id OR a.intent_sha256 IS DISTINCT FROM fingerprint
   OR NOT EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1
    WHERE attempt_id=a.id AND parent_attempt_id=p_attempt_id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN listing_publication_private.managed_image_addition_status_v1(
   p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key)||jsonb_build_object('replayed',true);
 END IF;
 IF parent_state<>'published' THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 gallery:=listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 IF gallery->>'revision' IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 IF jsonb_array_length(gallery->'images')>=10 THEN
  RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 aid:=listing_publication_private.allocate_managed_publication_attempt_v1(
  p_expected_user_id,p_expected_identity_id,p_request_key,fingerprint,payload,jsonb_build_array(image));
 -- Enrol the unused child in the accepted multipart domain before any writer.
 -- Cancellation before upload can then settle its exact reserved objects too.
 INSERT INTO listing_publication_private.multipart_attempts(attempt_id) VALUES(aid);
 INSERT INTO listing_publication_private.managed_image_additions_v1(attempt_id,parent_attempt_id) VALUES(aid,p_attempt_id);
 RETURN listing_publication_private.managed_image_addition_status_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key)||jsonb_build_object('replayed',false);
END $f$;

CREATE FUNCTION public.cancel_my_managed_listing_image_addition_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 PERFORM listing_publication_private.lock_managed_image_addition_parent_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 SELECT * INTO a FROM listing_publication_private.attempts
  WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND AND (a.identity_id IS DISTINCT FROM p_expected_identity_id OR NOT EXISTS(
  SELECT 1 FROM listing_publication_private.managed_image_additions_v1 WHERE attempt_id=a.id AND parent_attempt_id=p_attempt_id)) THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 -- The retained journey tombstone also closes a not-yet-observed prepare under
 -- the same profile lock. An attached image is a read-only replay, not removed.
 PERFORM listing_publication_private.managed_image_addition_journey_v1(
  p_expected_user_id,p_expected_identity_id,p_request_key,true);
 RETURN listing_publication_private.managed_image_addition_status_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,p_request_key);
END $f$;
