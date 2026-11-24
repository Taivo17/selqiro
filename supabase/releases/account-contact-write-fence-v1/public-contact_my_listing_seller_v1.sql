CREATE OR REPLACE FUNCTION public.contact_my_listing_seller_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE lid bigint; l public.listings%ROWTYPE; old listing_contact_private.contact_receipts%ROWTYPE;
 cid bigint; candidate bigint; first_u uuid; first_i uuid; second_u uuid; second_i uuid; t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key); lid:=listing_contact_private.positive_id(p_listing_id);
 SELECT * INTO old FROM listing_contact_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.listing_id<>lid THEN
   RAISE EXCEPTION 'listing_contact_request_conflict' USING ERRCODE='22023'; END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
   'identity_id',p_expected_identity_id,'conversation_id',old.conversation_id::text,'listing_id',lid::text,'replayed',true);
 END IF;
 -- Listing before conversation row: same ordering as terminal deletion. Shared
 -- lock fences status changes/deletion while its automatic snapshot is captured.
 SELECT x.* INTO l FROM public.listings x WHERE x.id=lid FOR SHARE;
 IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published') THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF l.user_id=p_expected_user_id OR l.identity_id=p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_contact_self' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_peer(l.user_id,l.identity_id);
 PERFORM listing_contact_private.require_available_accounts_v1(p_expected_user_id,l.user_id);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,l.user_id);
 IF p_expected_user_id<l.user_id THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=l.user_id;second_i:=l.identity_id;
 ELSE first_u:=l.user_id;first_i:=l.identity_id;second_u:=p_expected_user_id;second_i:=p_expected_identity_id; END IF;
 candidate:=nextval('public.conversations_id_seq');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  IF l.active_until<=t THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
   created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,lid,l.title,l.image,l.price,p_expected_user_id,t,t,p_expected_user_id,l.user_id,p_expected_identity_id,l.identity_id);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
   VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,l.user_id,l.identity_id,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
   AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND OR l.active_until<=clock_timestamp() THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=lid,listing_title_snapshot=l.title,listing_image_snapshot=l.image,
   listing_price_snapshot=l.price,updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO listing_contact_private.contact_receipts(actor_user_id,request_key,identity_id,listing_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,lid,cid);
 RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
  'identity_id',p_expected_identity_id,'conversation_id',cid::text,'listing_id',lid::text,'replayed',false);
END $f$;
