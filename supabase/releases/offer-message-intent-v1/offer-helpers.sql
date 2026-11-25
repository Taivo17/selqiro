-- Typed intent is request data. Thread pointers never choose a message attachment.
CREATE FUNCTION messaging_private_v2.validate_offer_intent_v1(p_type text,p_id text)
RETURNS void LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_type IS NULL AND p_id IS NULL THEN RETURN; END IF;
 IF p_type IS NULL OR p_id IS NULL OR p_type NOT IN ('listing','horse_offer','service','job') THEN
  RAISE EXCEPTION 'message_offer_input' USING ERRCODE='22023'; END IF;
 IF p_type='listing' THEN
  PERFORM listing_contact_private.positive_id(p_id);
 ELSIF p_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 OR p_id='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'message_offer_input' USING ERRCODE='22023';
 END IF;
END $f$;

-- Private, narrow resolver. Existing canonical publication checks and row locks
-- decide availability. The offer must belong to an exact participant tuple.
CREATE FUNCTION messaging_private_v2.offer_snapshot_v1(p_conversation bigint,p_type text,p_id text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;l public.listings%ROWTYPE;s jsonb;card jsonb;
 owner_user uuid;owner_identity uuid;expires timestamptz;
BEGIN
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_type,p_id);
 IF p_type IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 CASE p_type
 WHEN 'listing' THEN
  SELECT * INTO l FROM public.listings WHERE id=p_id::bigint FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
   OR (public.listing_contact_is_managed_v1(p_conversation,l.id) AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=l.id AND p.state='published')) THEN
   RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
  s:=jsonb_build_object('user_id',l.user_id,'identity_id',l.identity_id,
   'card',jsonb_build_object('id',l.id::text,'title',l.title,'image',l.image,'price',l.price));
 WHEN 'horse_offer' THEN s:=horse_publication_private.contact_snapshot(p_id::uuid);
 WHEN 'service' THEN
  s:=service_publication_private.contact_snapshot(p_id::uuid);
  SELECT active_until INTO expires FROM service_publication_private.activity WHERE service_id=p_id::uuid FOR SHARE;
  IF NOT FOUND OR expires IS NULL OR expires<=clock_timestamp() THEN RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 WHEN 'job' THEN
  s:=jobs_private.contact_snapshot(p_id::uuid);
  SELECT active_until INTO expires FROM public.jobs WHERE id=p_id::uuid;
  IF expires IS NULL OR expires<=clock_timestamp() THEN RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 END CASE;
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user IS NULL OR owner_identity IS NULL OR NOT (
  (owner_user=c.buyer_id AND owner_identity=c.buyer_identity_id)
  OR (owner_user=c.seller_id AND owner_identity=c.seller_identity_id)) THEN
  RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 IF p_type='horse_offer' AND ((s->>'active_until') IS NULL OR (s->>'active_until')::timestamptz<=clock_timestamp()) THEN
  RAISE EXCEPTION 'message_offer_unavailable' USING ERRCODE='42501'; END IF;
 card:=s->'card';
 -- Match the bounded existing message-card contract while freezing sent values.
 card:=jsonb_build_object('id',p_id,'title',left(card->>'title',200),
  'image',CASE WHEN length(card->>'image')<=2048 THEN card->>'image' ELSE NULL END,
  'price',left(card->>'price',200)) || CASE WHEN p_type='listing' THEN '{}'::jsonb ELSE jsonb_build_object('content_type',p_type) END;
 RETURN card;
END $f$;

-- Four indexed one-row candidates keep the header bounded even with long history.
CREATE FUNCTION messaging_private_v2.last_shared_offer_v1(p_conversation bigint)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT card FROM (
  (SELECT m.id AS message_id,0 AS kind,jsonb_build_object('id',m.listing_id::text,'title',left(m.listing_title,200)) AS card
   FROM public.messages m WHERE m.conversation_id=p_conversation AND m.listing_id IS NOT NULL ORDER BY m.id DESC LIMIT 1)
  UNION ALL
  (SELECT h.message_id,1,jsonb_build_object('id',h.horse_offer_id,'title',left(h.card->>'title',200),'content_type','horse_offer')
   FROM horse_publication_private.message_cards h WHERE h.conversation_id=p_conversation ORDER BY h.message_id DESC LIMIT 1)
  UNION ALL
  (SELECT s.message_id,2,jsonb_build_object('id',s.service_id,'title',left(s.card->>'title',200),'content_type','service')
   FROM service_publication_private.message_cards s WHERE s.conversation_id=p_conversation ORDER BY s.message_id DESC LIMIT 1)
  UNION ALL
  (SELECT j.message_id,3,jsonb_build_object('id',j.job_id,'title',left(j.card->>'title',200),'content_type','job')
   FROM jobs_private.message_cards j WHERE j.conversation_id=p_conversation ORDER BY j.message_id DESC LIMIT 1)
 ) candidates ORDER BY message_id DESC,kind LIMIT 1;
$f$;

CREATE INDEX offer_message_listing_header_v1 ON public.messages(conversation_id,id DESC) WHERE listing_id IS NOT NULL;
CREATE INDEX offer_message_horse_header_v1 ON horse_publication_private.message_cards(conversation_id,message_id DESC);
CREATE INDEX offer_message_service_header_v1 ON service_publication_private.message_cards(conversation_id,message_id DESC);
CREATE INDEX offer_message_job_header_v1 ON jobs_private.message_cards(conversation_id,message_id DESC);

REVOKE ALL ON FUNCTION messaging_private_v2.validate_offer_intent_v1(text,text),
 messaging_private_v2.offer_snapshot_v1(bigint,text,text),messaging_private_v2.last_shared_offer_v1(bigint)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION messaging_private_v2.validate_offer_intent_v1(text,text),
 messaging_private_v2.offer_snapshot_v1(bigint,text,text),messaging_private_v2.last_shared_offer_v1(bigint)
 TO selqiro_listing_contact_writer_v1;
