CREATE OR REPLACE FUNCTION public.send_my_listing_message_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; lid bigint; ch listing_contact_private.channels%ROWTYPE; old listing_contact_private.message_receipts%ROWTYPE;
 l public.listings%ROWTYPE; digest bytea; mid bigint; peer_u uuid; peer_i uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key); cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_listing_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000 OR btrim(p_message,E' \t\r\n')='' THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
 digest:=sha256(convert_to(jsonb_build_object('conversation_id',cid::text,'listing_id',p_listing_id,'message',p_message)::text,'UTF8'));
 ch:=listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO old FROM listing_contact_private.message_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'listing_contact_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
   'identity_id',p_expected_identity_id,'conversation_id',cid::text,'message_id',old.message_id::text,'replayed',true);
 END IF;
 IF ch.first_user_id=p_expected_user_id THEN peer_u:=ch.second_user_id;peer_i:=ch.second_identity_id;
 ELSE peer_u:=ch.first_user_id;peer_i:=ch.first_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_available_accounts_v1(p_expected_user_id,peer_u);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 IF lid IS NOT NULL THEN
  SELECT x.* INTO l FROM public.listings x WHERE x.id=lid FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
  OR NOT ((l.user_id=ch.first_user_id AND l.identity_id=ch.first_identity_id) OR (l.user_id=ch.second_user_id AND l.identity_id=ch.second_identity_id))
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published') THEN
   RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND OR (lid IS NOT NULL AND l.active_until<=clock_timestamp()) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message,listing_id,listing_title,listing_image,listing_price)
 VALUES(cid,p_expected_user_id,p_expected_identity_id,p_message,lid,l.title,l.image,l.price) RETURNING id INTO mid;
 INSERT INTO listing_contact_private.message_receipts(actor_user_id,request_key,identity_id,conversation_id,message_id,intent_sha256)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,cid,mid,digest);
 UPDATE public.conversations SET updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
  'identity_id',p_expected_identity_id,'conversation_id',cid::text,'message_id',mid::text,'replayed',false);
END $f$;
