CREATE FUNCTION public.send_my_offer_message_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_offer_type text DEFAULT NULL,p_offer_id text DEFAULT NULL,p_attachment_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;lid bigint;c public.conversations%ROWTYPE;old messaging_private_v2.send_receipts%ROWTYPE;
 card jsonb;ph messaging_private_v2.photos%ROWTYPE;digest bytea;mid bigint;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_offer_type,p_offer_id);
 IF p_offer_type='listing' THEN lid:=listing_contact_private.positive_id(p_offer_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000
 OR (btrim(p_message,E' \t\r\n')='' AND p_attachment_id IS NULL) THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 digest:=sha256(convert_to(jsonb_build_object('protocol','offer-message-intent-v1','conversation_id',cid::text,'offer_type',p_offer_type,'offer_id',p_offer_id,'message',p_message,'attachment_id',p_attachment_id)::text,'UTF8'));
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_available_accounts_v1(p_expected_user_id,peer_u);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- Offer -> conversation -> attachment preserves the existing mutation lock order.
 IF p_offer_type IS NOT NULL THEN card:=messaging_private_v2.offer_snapshot_v1(cid,p_offer_type,p_offer_id); END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(cid,p_expected_user_id,p_expected_identity_id) THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 -- A retry waiting on the thread must acknowledge the same durable receipt.
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 -- Recheck time-based availability after a possible conversation-lock wait.
 IF p_offer_type IS NOT NULL THEN PERFORM messaging_private_v2.offer_snapshot_v1(cid,p_offer_type,p_offer_id); END IF;
 mid:=nextval('public.messages_id_seq');t:=clock_timestamp();
 IF p_attachment_id IS NOT NULL THEN
  SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
  IF NOT FOUND OR ph.actor_user_id<>p_expected_user_id OR ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid
   OR ph.state<>'ready' OR ph.expires_at<=t OR NOT messaging_private_v2.bucket_ready() THEN
   RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
  -- The deferred FK and insert trigger bind this exact message ID atomically.
  UPDATE messaging_private_v2.photos SET state='attached',message_id=mid WHERE attachment_id=p_attachment_id;
 END IF;
 INSERT INTO messaging_private_v2.send_receipts(actor_user_id,identity_id,request_key,conversation_id,message_id,intent_sha256)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key,cid,mid,digest);
 INSERT INTO public.messages(id,conversation_id,sender_id,sender_identity_id,message,created_at,listing_id,listing_title,listing_image,listing_price,image_path)
 OVERRIDING SYSTEM VALUE VALUES(mid,cid,p_expected_user_id,p_expected_identity_id,p_message,t,lid,CASE WHEN lid IS NOT NULL THEN card->>'title' END,
  CASE WHEN lid IS NOT NULL THEN card->>'image' END,CASE WHEN lid IS NOT NULL THEN card->>'price' END,
  CASE WHEN p_attachment_id IS NULL THEN NULL ELSE cid::text||'/'||p_attachment_id::text||'.webp' END);
 -- Exactly one typed immutable snapshot belongs to this accepted send intent.
 CASE p_offer_type
 WHEN 'horse_offer' THEN INSERT INTO horse_publication_private.message_cards(message_id,conversation_id,horse_offer_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 WHEN 'service' THEN INSERT INTO service_publication_private.message_cards(message_id,conversation_id,service_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 WHEN 'job' THEN INSERT INTO jobs_private.message_cards(message_id,conversation_id,job_id,card) VALUES(mid,cid,p_offer_id::uuid,card);
 ELSE NULL;
 END CASE;
 UPDATE public.conversations SET updated_at=t,archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','send','message_id',mid::text,'request_key',p_request_key,'replayed',false);
END $f$;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.send_my_offer_message_v1(uuid,uuid,uuid,text,text,text,text,uuid) TO authenticated;
