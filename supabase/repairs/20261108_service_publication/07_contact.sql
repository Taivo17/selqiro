CREATE TABLE service_publication_private.contact_receipts(
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 service_id uuid NOT NULL,conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 PRIMARY KEY(actor_user_id,request_key));
CREATE TABLE service_publication_private.thread_context(
 conversation_id bigint PRIMARY KEY REFERENCES public.conversations(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL,card jsonb NOT NULL);
CREATE TABLE service_publication_private.message_cards(
 message_id bigint PRIMARY KEY REFERENCES public.messages(id) ON DELETE RESTRICT,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL,card jsonb NOT NULL);
ALTER TABLE service_publication_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_publication_private.thread_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_publication_private.message_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_publication_private.contact_receipts,service_publication_private.thread_context,
 service_publication_private.message_cards FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA service_publication_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON service_publication_private.contact_receipts,service_publication_private.message_cards TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT,UPDATE ON service_publication_private.thread_context TO selqiro_listing_contact_writer_v1;
CREATE POLICY contact_writer ON service_publication_private.contact_receipts TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON service_publication_private.thread_context TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON service_publication_private.message_cards TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);



CREATE FUNCTION service_publication_private.contact_snapshot(p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE s public.services%ROWTYPE;identity public.identities%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO s FROM public.services WHERE id=p_service_id FOR SHARE;
 IF NOT FOUND OR NOT service_publication_private.is_public(s.id) THEN
  RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO identity FROM public.identities WHERE id=s.identity_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 IF identity.type='private' THEN owner_user:=identity.user_id;
 ELSE SELECT owner_user_id INTO owner_user FROM public.business_accounts WHERE id=identity.business_account_id FOR SHARE;
 END IF;
 IF owner_user IS NULL THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('user_id',owner_user,'identity_id',s.identity_id,
 'card',jsonb_build_object('content_type','service','id',s.id,'title',left(s.title,200),
 'image',coalesce(s.image_url,(service_publication_private.image_projection(s.id,false)->0->>'url')),'price',NULL));
END $f$;

CREATE FUNCTION public.contact_my_service_provider_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE old service_publication_private.contact_receipts%ROWTYPE;s jsonb;card jsonb;owner_user uuid;owner_identity uuid;
 cid bigint;candidate bigint;first_u uuid;first_i uuid;second_u uuid;second_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);
 IF p_service_id IS NULL THEN RAISE EXCEPTION 'service_contact_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO old FROM service_publication_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id<>p_expected_identity_id OR old.service_id<>p_service_id THEN
   RAISE EXCEPTION 'service_contact_request_conflict' USING ERRCODE='22023'; END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'request_key',p_request_key,'service_id',p_service_id,'conversation_id',old.conversation_id::text,'replayed',true);
 END IF;
 s:=service_publication_private.contact_snapshot(p_service_id);card:=s->'card';
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user=p_expected_user_id OR owner_identity=p_expected_identity_id THEN
  RAISE EXCEPTION 'service_contact_self' USING ERRCODE='42501'; END IF;
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
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
   created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,NULL,card->>'title',card->>'image',NULL,p_expected_user_id,t,t,p_expected_user_id,owner_user,p_expected_identity_id,owner_identity);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
   VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,owner_user,owner_identity,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
   AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=NULL,listing_title_snapshot=card->>'title',listing_image_snapshot=card->>'image',
   listing_price_snapshot=NULL,updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO service_publication_private.thread_context(conversation_id,service_id,card) VALUES(cid,p_service_id,card)
 ON CONFLICT(conversation_id) DO UPDATE SET service_id=excluded.service_id,card=excluded.card;
 INSERT INTO service_publication_private.contact_receipts(actor_user_id,request_key,identity_id,service_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,p_service_id,cid);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'request_key',p_request_key,'service_id',p_service_id,'conversation_id',cid::text,'replayed',false);
END $f$;

CREATE FUNCTION service_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user='selqiro_listing_contact_writer_v1' AND NEW.listing_id IS NULL THEN
  INSERT INTO service_publication_private.message_cards(message_id,conversation_id,service_id,card)
  SELECT NEW.id,NEW.conversation_id,h.service_id,h.card FROM service_publication_private.thread_context h
  JOIN public.conversations c ON c.id=h.conversation_id AND c.listing_id IS NULL
  WHERE h.conversation_id=NEW.conversation_id;
 END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER service_message_context AFTER INSERT ON public.messages FOR EACH ROW
 EXECUTE FUNCTION service_publication_private.capture_message_card();
-- Each shared channel has one current marketplace context. Only that pointer
-- is superseded; historical per-message cards are immutable and remain intact.
CREATE FUNCTION service_publication_private.select_current_context() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_contact_writer_v1' THEN RAISE EXCEPTION 'service_contact_writer_required' USING ERRCODE='42501';END IF;
 IF TG_TABLE_SCHEMA='service_publication_private' THEN
  DELETE FROM horse_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
 ELSE DELETE FROM service_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER service_select_context AFTER INSERT OR UPDATE ON service_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();
CREATE TRIGGER horse_select_context AFTER INSERT OR UPDATE ON horse_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();

CREATE OR REPLACE FUNCTION public.get_my_marketplace_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
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
  IF context IS NULL THEN
  SELECT jsonb_build_object('id',s.service_id,'title',s.card->>'title','content_type','service') INTO context
  FROM service_publication_private.thread_context s JOIN public.conversations c ON c.id=s.conversation_id AND c.listing_id IS NULL
  WHERE s.conversation_id=cid;
 END IF;
 IF context IS NOT NULL THEN r:=jsonb_set(r,'{listing}',context); END IF;
 END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN m.item->'listing'='null'::jsonb AND hc.card IS NOT NULL
  THEN jsonb_set(m.item,'{listing}',hc.card) WHEN m.item->'listing'='null'::jsonb AND sc.card IS NOT NULL THEN jsonb_set(m.item,'{listing}',sc.card) ELSE m.item END ORDER BY m.ordinal),'[]'::jsonb) INTO items
 FROM jsonb_array_elements(r->'messages') WITH ORDINALITY m(item,ordinal)
 LEFT JOIN horse_publication_private.message_cards hc ON hc.message_id=(m.item->>'id')::bigint AND hc.conversation_id=cid
 LEFT JOIN service_publication_private.message_cards sc ON sc.message_id=(m.item->>'id')::bigint AND sc.conversation_id=cid;
 RETURN jsonb_set(r,'{messages}',items);
END $f$;
