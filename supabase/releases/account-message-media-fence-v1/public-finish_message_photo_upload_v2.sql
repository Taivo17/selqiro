CREATE OR REPLACE FUNCTION public.finish_message_photo_upload_v2(p_attachment_id uuid,p_claim_key uuid,p_outcome text,
 p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;initial_ph messaging_private_v2.photos%ROWTYPE;gated boolean:=false;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('ready','failed') OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO initial_ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id;
 IF FOUND AND initial_ph.upload_key=p_claim_key AND p_claim_key IS NOT NULL
 AND initial_ph.web_sha256=p_web_sha256 AND initial_ph.web_bytes=p_web_bytes AND initial_ph.width=p_width AND initial_ph.height=p_height
 AND p_outcome='ready' AND initial_ph.state='uploading' AND initial_ph.expires_at>clock_timestamp() THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(initial_ph.conversation_id,initial_ph.actor_user_id,initial_ph.identity_id);
  gated:=true;
 END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.upload_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL
 OR ph.web_sha256 IS DISTINCT FROM p_web_sha256 OR ph.web_bytes IS DISTINCT FROM p_web_bytes
 OR ph.width IS DISTINCT FROM p_width OR ph.height IS DISTINCT FROM p_height THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF p_outcome='ready' AND ph.state='uploading' AND ph.expires_at>clock_timestamp()
 AND (NOT gated OR (ph.actor_user_id,ph.identity_id,ph.conversation_id) IS DISTINCT FROM (initial_ph.actor_user_id,initial_ph.identity_id,initial_ph.conversation_id)) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND (ph.expires_at<=clock_timestamp() OR p_outcome='failed') THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code=coalesce(p_failure_code,CASE WHEN ph.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'UPLOAD_FAILED' END)
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='uploading' AND p_outcome='ready' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='ready' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- attached and tombstoned states never regress or resurrect on late results.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
