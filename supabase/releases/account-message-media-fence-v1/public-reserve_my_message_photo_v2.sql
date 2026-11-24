CREATE OR REPLACE FUNCTION public.reserve_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_source_sha256 text,p_source_bytes bigint,p_source_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_source_sha256 IS NULL OR p_source_sha256 !~ '^[0-9a-f]{64}$' OR p_source_bytes IS NULL
 OR p_source_bytes NOT BETWEEN 1 AND 1400000 OR p_source_mime IS DISTINCT FROM 'image/webp' THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.source_sha256<>p_source_sha256 OR ph.source_bytes<>p_source_bytes OR ph.source_mime<>p_source_mime THEN
   RAISE EXCEPTION 'message_photo_request_conflict' USING ERRCODE='22023'; END IF;
  IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
   UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=ph.attachment_id RETURNING * INTO ph;
  END IF;
  RETURN messaging_private_v2.photo_receipt(ph);
 END IF;
 c:=messaging_private_v2.require_writable_thread_v1(cid,p_expected_user_id,p_expected_identity_id);
 IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- require_actor holds the actor profile lock, serializing this actor's quota
 -- decisions. Permanent tombstones retain their byte reservation: an ambiguous
 -- late upload never creates unaccounted storage merely because it was canceled.
 t:=clock_timestamp();
 IF (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 hour')>=10
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')>=100
 OR (SELECT coalesce(sum(source_bytes),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')+p_source_bytes>104857600
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND state IN('reserved','uploading','ready') AND expires_at>t)>=10
 OR (SELECT coalesce(sum(coalesce(web_bytes,2000000)),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id)+2000000>262144000 THEN
  RAISE EXCEPTION 'message_photo_quota' USING ERRCODE='54000'; END IF;
 INSERT INTO messaging_private_v2.photos(actor_user_id,identity_id,conversation_id,request_key,source_sha256,source_bytes,source_mime,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,p_request_key,p_source_sha256,p_source_bytes,p_source_mime,t,t+interval '30 minutes') RETURNING * INTO ph;
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
