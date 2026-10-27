-- Same-V2 integration candidate. Load only after the publication/final contract in
-- a new isolated helper. No existing database, API grants, route or schedule.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'listing_contact_disposable_helper_required';
 END IF;
 IF to_regprocedure('listing_publication_private.require_actor(uuid,uuid)') IS NULL
 OR to_regclass('listing_publication_private.publications') IS NULL
 OR to_regclass('public.conversation_participants') IS NULL
 OR to_regclass('public.user_blocks') IS NULL
 OR to_regclass('public.conversations_id_seq') IS NULL
 OR to_regclass('public.messages_id_seq') IS NULL
 OR to_regclass('public.conversation_participants_id_seq') IS NULL THEN
  RAISE EXCEPTION 'listing_contact_reviewed_schema_required';
 END IF;
END $gate$;

CREATE ROLE selqiro_listing_contact_writer_v1 NOLOGIN;
CREATE SCHEMA listing_contact_private;
REVOKE ALL ON SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_contact_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- The two account/identity pairs are explicit. Business identities use the same
-- existing active-membership predicate; this does not create a team inbox.
-- No listing FK: deleting a listing must not erase a conversation or a receipt.
CREATE TABLE listing_contact_private.channels (
 conversation_id bigint PRIMARY KEY CHECK(conversation_id>0)
  REFERENCES public.conversations(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 first_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 first_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 second_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 second_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(first_user_id<second_user_id), CHECK(first_identity_id<>second_identity_id),
 UNIQUE(first_user_id,first_identity_id,second_user_id,second_identity_id)
);
CREATE TABLE listing_contact_private.contact_receipts (
 actor_user_id uuid NOT NULL, request_key uuid NOT NULL,
 identity_id uuid NOT NULL, listing_id bigint NOT NULL CHECK(listing_id>0),
 conversation_id bigint NOT NULL REFERENCES listing_contact_private.channels(conversation_id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE TABLE listing_contact_private.message_receipts (
 actor_user_id uuid NOT NULL, request_key uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES listing_contact_private.channels(conversation_id) ON DELETE RESTRICT,
 message_id bigint NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT,
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
ALTER TABLE listing_contact_private.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contact_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contact_private.message_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_contact_private.positive_id(v text) RETURNS bigint LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF v IS NULL OR length(v)>19 OR v !~ '^[1-9][0-9]*$' OR v::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
 RETURN v::bigint;
END $f$;
CREATE FUNCTION listing_contact_private.require_key(v uuid) RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF v IS NULL OR v='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
END $f$;
CREATE FUNCTION listing_contact_private.require_peer(p_user uuid,p_identity uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF i.type='private' THEN
  IF i.user_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 ELSIF i.type='business' THEN
  PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 ELSE RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501';
 END IF;
END $f$;
CREATE FUNCTION listing_contact_private.require_member(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS listing_contact_private.channels LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE c listing_contact_private.channels%ROWTYPE;
BEGIN
 SELECT * INTO c FROM listing_contact_private.channels WHERE conversation_id=p_conversation;
 IF NOT FOUND OR NOT ((c.first_user_id=p_user AND c.first_identity_id=p_identity)
  OR (c.second_user_id=p_user AND c.second_identity_id=p_identity))
 OR NOT EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=p_conversation
  AND cp.user_id=p_user AND cp.identity_id=p_identity) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 RETURN c;
END $f$;
CREATE FUNCTION listing_contact_private.require_unblocked(p_first uuid,p_second uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
BEGIN
 -- Brief shared table lock fences a new legacy block INSERT until this small DB
 -- transaction commits. No Storage, network or client wait occurs while held.
 LOCK TABLE public.user_blocks IN SHARE MODE;
 IF EXISTS(SELECT 1 FROM public.user_blocks WHERE
  (blocker_id=p_first AND blocked_id=p_second) OR (blocker_id=p_second AND blocked_id=p_first)) THEN
  RAISE EXCEPTION 'listing_contact_blocked' USING ERRCODE='42501'; END IF;
END $f$;

-- These booleans expose no private rows. The source remains API-closed; the new
-- disposable integration composition grants their execution to its API roles.
CREATE FUNCTION public.listing_contact_is_managed_v1(p_conversation bigint,p_listing bigint DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM listing_contact_private.channels WHERE conversation_id=p_conversation)
  OR EXISTS(SELECT 1 FROM listing_publication_private.publications WHERE listing_id=p_listing);
$f$;
CREATE FUNCTION public.listing_contact_visible_v1(p_conversation bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
 SELECT NOT EXISTS(SELECT 1 FROM listing_contact_private.channels WHERE conversation_id=p_conversation)
 OR EXISTS(SELECT 1 FROM listing_contact_private.channels c JOIN public.profiles p ON p.id=auth.uid()
  WHERE c.conversation_id=p_conversation AND
   ((c.first_user_id=p.id AND c.first_identity_id=p.active_identity_id)
    OR (c.second_user_id=p.id AND c.second_identity_id=p.active_identity_id))
  AND public.current_user_has_identity_access(p.active_identity_id));
$f$;
CREATE POLICY contact_identity_visibility ON public.conversations AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(id)) WITH CHECK(public.listing_contact_visible_v1(id));
CREATE POLICY contact_identity_visibility ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(conversation_id)) WITH CHECK(public.listing_contact_visible_v1(conversation_id));
CREATE POLICY contact_identity_visibility ON public.conversation_participants AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(conversation_id)) WITH CHECK(public.listing_contact_visible_v1(conversation_id));

CREATE FUNCTION listing_contact_private.guard_conversation() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'listing_contact_conversation_retained' USING ERRCODE='42501'; END IF;
 IF current_user='selqiro_listing_contact_writer_v1' THEN
  IF TG_OP='INSERT' OR (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at'])=
   (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at']) THEN RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title_snapshot IS NULL AND NEW.listing_image_snapshot IS NULL AND NEW.listing_price_snapshot IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_contact_private.guard_message() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' AND current_user='selqiro_listing_contact_writer_v1'
 AND NEW.image_url IS NULL AND NEW.image_path IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title IS NULL AND NEW.listing_image IS NULL AND NEW.listing_price IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_contact_private.guard_participant() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF current_user='selqiro_listing_contact_writer_v1' AND TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_contact_writer_v1' OR
   (current_user='authenticated' AND OLD.user_id=auth.uid() AND public.listing_contact_visible_v1(OLD.conversation_id)))
 AND (to_jsonb(NEW)-ARRAY['last_read_at','deleted_at','custom_title'])=(to_jsonb(OLD)-ARRAY['last_read_at','deleted_at','custom_title']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.conversations
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_conversation();
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.messages
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_message();
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.conversation_participants
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_participant();

CREATE FUNCTION public.contact_my_listing_seller_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE lid bigint; l public.listings%ROWTYPE; old listing_contact_private.contact_receipts%ROWTYPE;
 cid bigint; candidate bigint; first_u uuid; first_i uuid; second_u uuid; second_i uuid; t timestamptz;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
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

CREATE FUNCTION public.send_my_listing_message_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; lid bigint; ch listing_contact_private.channels%ROWTYPE; old listing_contact_private.message_receipts%ROWTYPE;
 l public.listings%ROWTYPE; digest bytea; mid bigint; peer_u uuid; peer_i uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
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

GRANT USAGE ON SCHEMA public,auth,listing_publication_private,listing_contact_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON public.conversations,public.messages,public.conversation_participants TO selqiro_listing_contact_writer_v1;
GRANT UPDATE(listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,updated_at,archived_at)
 ON public.conversations TO selqiro_listing_contact_writer_v1;
GRANT UPDATE(last_read_at,deleted_at,custom_title) ON public.conversation_participants TO selqiro_listing_contact_writer_v1;
GRANT SELECT,UPDATE ON public.profiles,public.identities,public.business_members,public.user_blocks,public.listings TO selqiro_listing_contact_writer_v1;
GRANT USAGE,SELECT ON SEQUENCE public.conversations_id_seq,public.messages_id_seq,public.conversation_participants_id_seq TO selqiro_listing_contact_writer_v1;
GRANT SELECT ON listing_publication_private.publications TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA listing_contact_private TO selqiro_listing_contact_writer_v1;
CREATE POLICY contact_writer ON public.conversations FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON public.messages FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON public.conversation_participants FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer_read ON listing_publication_private.publications FOR SELECT TO selqiro_listing_contact_writer_v1 USING(true);
DO $policies$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['profiles','identities','business_members','user_blocks','listings'] LOOP
  EXECUTE format('CREATE POLICY contact_writer_read ON public.%I FOR SELECT TO selqiro_listing_contact_writer_v1 USING(true)',n);
  -- UPDATE privilege is required for row/table locks. WITH CHECK(false) prevents
  -- these contact functions from modifying the underlying actor/listing data.
  EXECUTE format('CREATE POLICY contact_writer_lock ON public.%I FOR UPDATE TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(false)',n);
 END LOOP;
 FOREACH n IN ARRAY ARRAY['channels','contact_receipts','message_receipts'] LOOP
  EXECUTE format('CREATE POLICY contact_writer ON listing_contact_private.%I FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true)',n);
 END LOOP;
END $policies$;
GRANT EXECUTE ON FUNCTION auth.uid(),public.current_user_has_identity_access(uuid),public.lock_listing_creation_actor_v1(uuid),
 listing_publication_private.require_actor(uuid,uuid),public.listing_contact_is_managed_v1(bigint,bigint),public.listing_contact_visible_v1(bigint)
 TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_contact_private TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
 public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),public.listing_contact_is_managed_v1(bigint,bigint),
 public.listing_contact_visible_v1(bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_contact_is_managed_v1(bigint,bigint) TO selqiro_listing_final_writer_v1;
COMMENT ON SCHEMA listing_contact_private IS 'Isolated same-V2 two-account/identity contact and plain-message idempotency. No team inbox, live API grant, message-image upload or account erasure contract.';
