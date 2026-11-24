CREATE OR REPLACE FUNCTION public.claim_message_photo_upload_v2(p_attachment_id uuid,p_expected_user_id uuid,p_expected_identity_id uuid,
 p_source_sha256 text,p_claim_key uuid,p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;initial_ph messaging_private_v2.photos%ROWTYPE;gated boolean:=false;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_web_sha256 IS NULL OR p_web_sha256 !~ '^[0-9a-f]{64}$' OR p_web_bytes IS NULL OR p_web_bytes NOT BETWEEN 1 AND 2000000
 OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 1600 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 1600 THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO initial_ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id;
 IF FOUND AND initial_ph.actor_user_id=p_expected_user_id AND initial_ph.identity_id=p_expected_identity_id
 AND initial_ph.source_sha256=p_source_sha256
 AND (initial_ph.upload_key IS NULL OR (initial_ph.web_sha256=p_web_sha256 AND initial_ph.web_bytes=p_web_bytes AND initial_ph.width=p_width AND initial_ph.height=p_height))
 AND initial_ph.state IN('reserved','uploading') AND initial_ph.expires_at>clock_timestamp() THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(initial_ph.conversation_id,initial_ph.actor_user_id,initial_ph.identity_id);
  gated:=true;
 END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id IS DISTINCT FROM p_expected_user_id OR ph.identity_id IS DISTINCT FROM p_expected_identity_id
 OR ph.source_sha256 IS DISTINCT FROM p_source_sha256 THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.upload_key IS NOT NULL AND (ph.web_sha256<>p_web_sha256 OR ph.web_bytes<>p_web_bytes OR ph.width<>p_width OR ph.height<>p_height) THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading') AND ph.expires_at>clock_timestamp()
 AND (NOT gated OR (ph.actor_user_id,ph.identity_id,ph.conversation_id) IS DISTINCT FROM (initial_ph.actor_user_id,initial_ph.identity_id,initial_ph.conversation_id)) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='reserved' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='uploading',upload_key=p_claim_key,web_sha256=p_web_sha256,web_bytes=p_web_bytes,width=p_width,height=p_height
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- A replay returns the original upload key and exact frozen bytes. The HTTP
 -- transport must use create-only writes; an existing object must be read/hash
 -- verified against this manifest, never overwritten or silently adopted.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
