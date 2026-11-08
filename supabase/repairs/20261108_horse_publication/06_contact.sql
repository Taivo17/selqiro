-- Horse contact reuses the existing exact two-account/two-identity channel.
-- Canonical conversations/messages and their blocking/read/photo mechanisms
-- remain authoritative. No synthetic numeric listing is created.
CREATE TABLE horse_publication_private.contact_receipts(
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 horse_offer_id uuid NOT NULL,conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 PRIMARY KEY(actor_user_id,request_key));
CREATE TABLE horse_publication_private.thread_context(
 conversation_id bigint PRIMARY KEY REFERENCES public.conversations(id) ON DELETE RESTRICT,
 horse_offer_id uuid NOT NULL,card jsonb NOT NULL);
CREATE TABLE horse_publication_private.message_cards(
 message_id bigint PRIMARY KEY REFERENCES public.messages(id) ON DELETE RESTRICT,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 horse_offer_id uuid NOT NULL,card jsonb NOT NULL);
ALTER TABLE horse_publication_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_publication_private.thread_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_publication_private.message_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON horse_publication_private.contact_receipts,horse_publication_private.thread_context,
 horse_publication_private.message_cards FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA horse_publication_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON horse_publication_private.contact_receipts,horse_publication_private.message_cards TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT,UPDATE ON horse_publication_private.thread_context TO selqiro_listing_contact_writer_v1;
CREATE POLICY contact_writer ON horse_publication_private.contact_receipts TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON horse_publication_private.thread_context TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON horse_publication_private.message_cards TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);

-- Definer reads and locks only the one canonical, publicly eligible horse.
CREATE FUNCTION horse_publication_private.contact_snapshot(p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE h public.horse_offers%ROWTYPE;
BEGIN
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer_id FOR SHARE;
 IF NOT FOUND OR NOT horse_publication_private.is_public(h.id) OR h.created_by_user_id IS NULL THEN
  RAISE EXCEPTION 'horse_contact_unavailable' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('user_id',h.created_by_user_id,'identity_id',h.identity_id,'active_until',h.active_until,
  'card',jsonb_build_object('content_type','horse_offer','id',h.id,'title',left(h.title,200),
   'image',(SELECT original_url FROM public.horse_offer_images WHERE horse_offer_id=h.id
     ORDER BY is_primary DESC,sort_order,created_at,id LIMIT 1),'price',NULL));
END $f$;
REVOKE ALL ON FUNCTION horse_publication_private.contact_snapshot(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.contact_snapshot(uuid) TO selqiro_listing_contact_writer_v1;

CREATE FUNCTION public.contact_my_horse_seller_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE old horse_publication_private.contact_receipts%ROWTYPE;s jsonb;card jsonb;owner_user uuid;owner_identity uuid;
 cid bigint;candidate bigint;first_u uuid;first_i uuid;second_u uuid;second_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);
 IF p_offer_id IS NULL THEN RAISE EXCEPTION 'horse_contact_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO old FROM horse_publication_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id<>p_expected_identity_id OR old.horse_offer_id<>p_offer_id THEN
   RAISE EXCEPTION 'horse_contact_request_conflict' USING ERRCODE='22023'; END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'request_key',p_request_key,'horse_offer_id',p_offer_id,'conversation_id',old.conversation_id::text,'replayed',true);
 END IF;
 s:=horse_publication_private.contact_snapshot(p_offer_id);card:=s->'card';
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user=p_expected_user_id OR owner_identity=p_expected_identity_id THEN
  RAISE EXCEPTION 'horse_contact_self' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_peer(owner_user,owner_identity);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,owner_user);
 IF p_expected_user_id<owner_user THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=owner_user;second_i:=owner_identity;
 ELSE first_u:=owner_user;first_i:=owner_identity;second_u:=p_expected_user_id;second_i:=p_expected_identity_id; END IF;
 candidate:=nextval('public.conversations_id_seq');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  IF (s->>'active_until')::timestamptz<=t THEN RAISE EXCEPTION 'horse_contact_unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
   created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,NULL,card->>'title',card->>'image',NULL,p_expected_user_id,t,t,p_expected_user_id,owner_user,p_expected_identity_id,owner_identity);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
   VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,owner_user,owner_identity,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
   AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND OR (s->>'active_until')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'horse_contact_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=NULL,listing_title_snapshot=card->>'title',listing_image_snapshot=card->>'image',
   listing_price_snapshot=NULL,updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO horse_publication_private.thread_context(conversation_id,horse_offer_id,card) VALUES(cid,p_offer_id,card)
 ON CONFLICT(conversation_id) DO UPDATE SET horse_offer_id=excluded.horse_offer_id,card=excluded.card;
 INSERT INTO horse_publication_private.contact_receipts(actor_user_id,request_key,identity_id,horse_offer_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,p_offer_id,cid);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'request_key',p_request_key,'horse_offer_id',p_offer_id,'conversation_id',cid::text,'replayed',false);
END $f$;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.contact_my_horse_seller_v1(uuid,uuid,uuid,uuid) TO authenticated;

-- send_my_message_v2 already locks the thread before inserting. Its exact actor,
-- membership, blocks, idempotency and private-photo checks are reused unchanged.
-- Store the horse context at send time so later thread switches do not rewrite it.
CREATE FUNCTION horse_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user='selqiro_listing_contact_writer_v1' AND NEW.listing_id IS NULL THEN
  INSERT INTO horse_publication_private.message_cards(message_id,conversation_id,horse_offer_id,card)
  SELECT NEW.id,NEW.conversation_id,h.horse_offer_id,h.card FROM horse_publication_private.thread_context h
  JOIN public.conversations c ON c.id=h.conversation_id AND c.listing_id IS NULL
  WHERE h.conversation_id=NEW.conversation_id;
 END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION horse_publication_private.capture_message_card() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.capture_message_card() TO selqiro_listing_contact_writer_v1;
CREATE TRIGGER horse_message_context AFTER INSERT ON public.messages FOR EACH ROW
 EXECUTE FUNCTION horse_publication_private.capture_message_card();

-- V2's existing shape gains a typed horse card only when one actually exists.
-- The old get_my_message_thread_v2 RPC stays byte-for-byte compatible.
CREATE FUNCTION public.get_my_marketplace_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE r jsonb;context jsonb;items jsonb;cid bigint;
BEGIN
 r:=public.get_my_message_thread_v2(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,p_attachment_listing_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF r->'listing'='null'::jsonb THEN
  SELECT jsonb_build_object('id',h.horse_offer_id,'title',h.card->>'title','content_type','horse_offer') INTO context
  FROM horse_publication_private.thread_context h JOIN public.conversations c ON c.id=h.conversation_id AND c.listing_id IS NULL
  WHERE h.conversation_id=cid;
  IF context IS NOT NULL THEN r:=jsonb_set(r,'{listing}',context); END IF;
 END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN m.item->'listing'='null'::jsonb AND hc.card IS NOT NULL
  THEN jsonb_set(m.item,'{listing}',hc.card) ELSE m.item END ORDER BY m.ordinal),'[]'::jsonb) INTO items
 FROM jsonb_array_elements(r->'messages') WITH ORDINALITY m(item,ordinal)
 LEFT JOIN horse_publication_private.message_cards hc ON hc.message_id=(m.item->>'id')::bigint AND hc.conversation_id=cid;
 RETURN jsonb_set(r,'{messages}',items);
END $f$;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_marketplace_message_thread_v1(uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.get_my_marketplace_message_thread_v1(uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_marketplace_message_thread_v1(uuid,uuid,text,text,text) TO authenticated;
