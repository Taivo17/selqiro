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

-- Existing trigger identities, owners, grants and rows are retained. New typed
-- sends insert their validated snapshot explicitly in the same transaction.
CREATE OR REPLACE FUNCTION horse_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION service_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION jobs_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 RETURN NEW;
END $f$;

CREATE FUNCTION public.get_my_offer_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_offer_type text DEFAULT NULL,p_attachment_offer_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jsonb;cid bigint;attachment jsonb;header jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_attachment_offer_type,p_attachment_offer_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 -- Resolve an explicit preview before the base reader locks the conversation,
 -- following the same offer -> conversation order as a send. Missing/unavailable
 -- previews are removable; they never replace a historical shared header.
 IF p_attachment_offer_type IS NOT NULL THEN
  BEGIN
   attachment:=messaging_private_v2.offer_snapshot_v1(cid,p_attachment_offer_type,p_attachment_offer_id);
  EXCEPTION WHEN insufficient_privilege THEN attachment:=NULL;
  END;
 END IF;
 r:=public.get_my_marketplace_message_thread_v2(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,NULL);
 header:=messaging_private_v2.last_shared_offer_v1(cid);
 RETURN (r-ARRAY['attachment_listing_id','attachment_listing']) || jsonb_build_object(
  'schema_version',3,'listing',header,'attachment_offer_type',p_attachment_offer_type,
  'attachment_offer_id',p_attachment_offer_id,'attachment_offer',attachment);
END $f$;
REVOKE ALL ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) TO authenticated;

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
