-- Authenticated managed-conversation views for the same disposable V2 journey.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
 OR to_regclass('listing_contact_private.channels') IS NULL THEN
  RAISE EXCEPTION 'listing_contact_disposable_helper_required'; END IF;
END $gate$;

CREATE FUNCTION listing_contact_private.peer_ready(p_user uuid,p_identity uuid,p_viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i WHERE i.id=p_identity AND i.status='active'
  AND ((i.type='private' AND i.user_id=p_user) OR (i.type='business' AND EXISTS(
   SELECT 1 FROM public.business_members b WHERE b.business_account_id=i.business_account_id
    AND b.user_id=p_user AND b.status='active'))))
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=p_user AND blocked_id=p_viewer)
  OR (blocker_id=p_viewer AND blocked_id=p_user));
$f$;

CREATE FUNCTION public.get_my_listing_conversation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; before_id bigint; ch listing_contact_private.channels%ROWTYPE;
 cv public.conversations%ROWTYPE; peer_u uuid;peer_i uuid;items jsonb;next_id text;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
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
  'conversation_id',cid::text,'peer_name',(SELECT left(display_name,200) FROM public.identities WHERE id=peer_i),
  'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id),
  'listing',CASE WHEN cv.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',cv.listing_id::text,'title',cv.listing_title_snapshot) END,
  'messages',items,'next_before_message_id',next_id);
END $f$;

CREATE FUNCTION public.list_my_listing_conversations_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_before_conversation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE before_id bigint;items jsonb;next_id text;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_before_conversation_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_conversation_id); END IF;
 WITH page AS MATERIALIZED(SELECT c.conversation_id,cv.listing_title_snapshot,cv.updated_at,
  (SELECT left(display_name,200) FROM public.identities WHERE id=CASE WHEN c.first_user_id=p_expected_user_id THEN c.second_identity_id ELSE c.first_identity_id END) AS peer_name
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

GRANT EXECUTE ON FUNCTION listing_contact_private.peer_ready(uuid,uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_listing_conversation_v1(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.list_my_listing_conversations_v1(uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION listing_contact_private.peer_ready(uuid,uuid,uuid),
 public.get_my_listing_conversation_v1(uuid,uuid,text,text),public.list_my_listing_conversations_v1(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
