-- Reviewed DDL only. Included inside apply.sql's guarded transaction.
-- Existing PUBLIC policies, shared actor helpers, writer roles and table data
-- are unchanged. The four API RPCs retain their contact-writer owner and ACL.
CREATE FUNCTION listing_contact_private.require_actor_hosted_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
END
$f$;
CREATE FUNCTION listing_contact_private.peer_name_hosted_v1(p_identity uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT left(i.display_name,200) FROM public.identities i WHERE i.id=p_identity;
$f$;
ALTER FUNCTION listing_contact_private.require_actor_hosted_v1(uuid,uuid) OWNER TO postgres;
ALTER FUNCTION listing_contact_private.peer_name_hosted_v1(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION listing_contact_private.require_actor_hosted_v1(uuid,uuid),
 listing_contact_private.peer_name_hosted_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_contact_private.require_actor_hosted_v1(uuid,uuid),
 listing_contact_private.peer_name_hosted_v1(uuid) TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION listing_contact_private.require_peer(uuid,uuid) SECURITY DEFINER;
ALTER FUNCTION listing_contact_private.peer_ready(uuid,uuid,uuid) SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION public.get_my_listing_conversation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; before_id bigint; ch listing_contact_private.channels%ROWTYPE;
 cv public.conversations%ROWTYPE; peer_u uuid;peer_i uuid;items jsonb;next_id text;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_before_message_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_message_id); END IF;
 ch:=listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO cv FROM public.conversations WHERE id=cid FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF ch.first_user_id=p_expected_user_id THEN peer_u:=ch.second_user_id;peer_i:=ch.second_identity_id;
 ELSE peer_u:=ch.first_user_id;peer_i:=ch.first_identity_id; END IF;
 WITH page AS MATERIALIZED(SELECT id,sender_id,sender_identity_id,message,created_at FROM public.messages
  WHERE conversation_id=cid AND (before_id IS NULL OR id<before_id) ORDER BY id DESC LIMIT 51),
 shown AS(SELECT * FROM page ORDER BY id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id::text,'mine',sender_id=p_expected_user_id AND sender_identity_id=p_expected_identity_id,
  'text',message,'created_at',created_at) ORDER BY id),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN min(id)::text ELSE NULL END INTO items,next_id FROM shown;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'peer_name',listing_contact_private.peer_name_hosted_v1(peer_i),
  'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id),
  'listing',CASE WHEN cv.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',cv.listing_id::text,'title',cv.listing_title_snapshot) END,
  'messages',items,'next_before_message_id',next_id);
END $f$;

CREATE OR REPLACE FUNCTION public.list_my_listing_conversations_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_before_conversation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE before_id bigint;items jsonb;next_id text;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 IF p_before_conversation_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_conversation_id); END IF;
 WITH page AS MATERIALIZED(SELECT c.conversation_id,cv.listing_title_snapshot,cv.updated_at,
  listing_contact_private.peer_name_hosted_v1(CASE WHEN c.first_user_id=p_expected_user_id THEN c.second_identity_id ELSE c.first_identity_id END) AS peer_name
  FROM listing_contact_private.channels c JOIN public.conversations cv ON cv.id=c.conversation_id
  JOIN public.conversation_participants cp ON cp.conversation_id=c.conversation_id AND cp.user_id=p_expected_user_id
   AND cp.identity_id=p_expected_identity_id AND cp.deleted_at IS NULL
  WHERE ((c.first_user_id=p_expected_user_id AND c.first_identity_id=p_expected_identity_id)
   OR (c.second_user_id=p_expected_user_id AND c.second_identity_id=p_expected_identity_id))
   AND (before_id IS NULL OR c.conversation_id<before_id) ORDER BY c.conversation_id DESC LIMIT 51),
 shown AS(SELECT * FROM page ORDER BY conversation_id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('conversation_id',conversation_id::text,'peer_name',peer_name,
  'listing_title',listing_title_snapshot,'updated_at',updated_at) ORDER BY conversation_id DESC),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN min(conversation_id)::text ELSE NULL END INTO items,next_id FROM shown;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversations',items,'next_before_conversation_id',next_id);
END $f$;
