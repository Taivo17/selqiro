-- Controlled messaging restoration. Include only inside apply.sql's guarded
-- transaction. Existing message content and all v1 API definitions are retained.
CREATE SCHEMA messaging_private_v2;
REVOKE ALL ON SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA messaging_private_v2 TO selqiro_listing_contact_writer_v1;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging_private_v2 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE messaging_private_v2.read_watermarks (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 through_message_id bigint NOT NULL CHECK(through_message_id>0),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,identity_id,conversation_id)
);
CREATE TABLE messaging_private_v2.send_receipts (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL, request_key uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 message_id bigint NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE TABLE messaging_private_v2.photos (
 attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
 source_bytes bigint NOT NULL CHECK(source_bytes BETWEEN 1 AND 1400000),
 source_mime text NOT NULL CHECK(source_mime='image/webp'),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','uploading','ready','attached','tombstoned')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '30 minutes',
 upload_key uuid,
 web_sha256 text CHECK(web_sha256 ~ '^[0-9a-f]{64}$'),
 web_bytes bigint CHECK(web_bytes BETWEEN 1 AND 2000000),
 width integer CHECK(width BETWEEN 1 AND 1600), height integer CHECK(height BETWEEN 1 AND 1600),
 message_id bigint UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 cleanup_key uuid, cleanup_lease_until timestamptz, next_cleanup_at timestamptz,
 cleanup_attempts bigint NOT NULL DEFAULT 0 CHECK(cleanup_attempts>=0),
 last_cleanup_at timestamptz, last_cleanup_removed boolean,
 failure_code text CHECK(failure_code ~ '^[A-Z0-9_]{1,64}$'),
 UNIQUE(actor_user_id,request_key),
 CHECK((upload_key IS NULL AND web_sha256 IS NULL AND web_bytes IS NULL AND width IS NULL AND height IS NULL)
  OR (upload_key IS NOT NULL AND web_sha256 IS NOT NULL AND web_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)),
 CHECK(state NOT IN('uploading','ready','attached') OR upload_key IS NOT NULL),
 CHECK((state='attached')=(message_id IS NOT NULL)),
 CHECK(state='tombstoned' OR (cleanup_key IS NULL AND cleanup_lease_until IS NULL AND next_cleanup_at IS NULL)),
 CHECK((cleanup_key IS NULL)=(cleanup_lease_until IS NULL)),
 CHECK(expires_at>created_at)
);
CREATE INDEX photos_actor_created_v2 ON messaging_private_v2.photos(actor_user_id,created_at);
CREATE INDEX photos_cleanup_v2 ON messaging_private_v2.photos(state,next_cleanup_at,expires_at);
-- Existing content stays in public.messages. These indexes serve bounded paging.
CREATE INDEX messaging_thread_activity_v2 ON public.conversations((coalesce(updated_at,created_at)) DESC,id DESC);
CREATE INDEX messaging_thread_message_v2 ON public.messages(conversation_id,id DESC);

ALTER TABLE messaging_private_v2.read_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_private_v2.send_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_private_v2.photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON messaging_private_v2.read_watermarks,messaging_private_v2.send_receipts,messaging_private_v2.photos TO selqiro_listing_contact_writer_v1;
CREATE POLICY controlled_writer ON messaging_private_v2.read_watermarks FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY controlled_writer ON messaging_private_v2.send_receipts FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY controlled_writer ON messaging_private_v2.photos FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);

-- Two exact account/identity participants are authoritative for both historical
-- and managed threads. No user-only, null-identity, group or guessed membership.
CREATE FUNCTION messaging_private_v2.exact_thread(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.conversations c
  WHERE c.id=p_conversation AND c.buyer_id IS NOT NULL AND c.seller_id IS NOT NULL
   AND c.buyer_identity_id IS NOT NULL AND c.seller_identity_id IS NOT NULL
   AND c.buyer_id<>c.seller_id AND c.buyer_identity_id<>c.seller_identity_id
   AND ((c.buyer_id=p_user AND c.buyer_identity_id=p_identity) OR (c.seller_id=p_user AND c.seller_identity_id=p_identity))
   AND (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id=c.id)=2
   AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id=c.buyer_id AND cp.identity_id=c.buyer_identity_id)
   AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id=c.seller_id AND cp.identity_id=c.seller_identity_id)
   AND NOT EXISTS(SELECT 1 FROM listing_contact_private.channels ch WHERE ch.conversation_id=c.id
    AND NOT ((ch.first_user_id=c.buyer_id AND ch.first_identity_id=c.buyer_identity_id AND ch.second_user_id=c.seller_id AND ch.second_identity_id=c.seller_identity_id)
     OR (ch.second_user_id=c.buyer_id AND ch.second_identity_id=c.buyer_identity_id AND ch.first_user_id=c.seller_id AND ch.first_identity_id=c.seller_identity_id))));
$f$;
CREATE FUNCTION messaging_private_v2.require_thread(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS public.conversations LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE c public.conversations%ROWTYPE;
BEGIN
 IF NOT messaging_private_v2.exact_thread(p_conversation,p_user,p_identity) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation;
 RETURN c;
END $f$;
CREATE FUNCTION messaging_private_v2.identity_card(p_identity uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('identity_id',p_identity,'name',coalesce(nullif(left(i.display_name,200),''),'Kasutaja'),
  'avatar_url',CASE WHEN length(i.avatar_url)<=2048 AND i.avatar_url ~ '^https://' THEN i.avatar_url ELSE NULL END)
 FROM (VALUES(1)) AS one(n) LEFT JOIN public.identities i ON i.id=p_identity;
$f$;
CREATE FUNCTION messaging_private_v2.safe_legacy_path(p_conversation bigint,p_path text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(p_path ~ ('^'||p_conversation::text||'/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$')
  AND strpos(p_path,'..')=0 AND length(p_path)<=230,false);
$f$;
CREATE FUNCTION messaging_private_v2.photo_receipt(p messaging_private_v2.photos)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',2,'actor_user_id',p.actor_user_id,'identity_id',p.identity_id,
  'conversation_id',p.conversation_id::text,'request_key',p.request_key,'attachment_id',p.attachment_id,
  'state',p.state,'bucket','message-attachments-v2','path',p.conversation_id::text||'/'||p.attachment_id::text||'.webp',
  'upload_key',p.upload_key,'source_sha256',p.source_sha256,'source_bytes',p.source_bytes,'source_mime',p.source_mime,
  'web_sha256',p.web_sha256,'web_bytes',p.web_bytes,'width',p.width,'height',p.height,'expires_at',p.expires_at);
$f$;
CREATE FUNCTION messaging_private_v2.bucket_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false
  AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]);
$f$;

CREATE FUNCTION public.list_my_message_threads_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_before_updated_at timestamptz DEFAULT NULL,p_before_conversation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE before_id bigint;items jsonb;cursor jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 IF (p_before_updated_at IS NULL)<>(p_before_conversation_id IS NULL) OR (p_before_updated_at IS NOT NULL AND NOT isfinite(p_before_updated_at)) THEN
  RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 IF p_before_conversation_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_conversation_id); END IF;
 WITH page AS MATERIALIZED(SELECT c.*,coalesce(c.updated_at,c.created_at) activity_at,cp.last_read_at,
   CASE WHEN c.buyer_id=p_expected_user_id THEN c.seller_id ELSE c.buyer_id END peer_user,
   CASE WHEN c.buyer_id=p_expected_user_id THEN c.seller_identity_id ELSE c.buyer_identity_id END peer_identity
  FROM public.conversations c JOIN public.conversation_participants cp ON cp.conversation_id=c.id
   AND cp.user_id=p_expected_user_id AND cp.identity_id=p_expected_identity_id AND cp.deleted_at IS NULL
  WHERE messaging_private_v2.exact_thread(c.id,p_expected_user_id,p_expected_identity_id)
   AND (before_id IS NULL OR (coalesce(c.updated_at,c.created_at),c.id)<(p_before_updated_at,before_id))
  ORDER BY coalesce(c.updated_at,c.created_at) DESC,c.id DESC LIMIT 51),
 shown AS MATERIALIZED(SELECT * FROM page ORDER BY activity_at DESC,id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('conversation_id',s.id::text,'peer',messaging_private_v2.identity_card(s.peer_identity),
   'updated_at',s.activity_at,'listing_title',left(s.listing_title_snapshot,200),
   'preview',jsonb_build_object('text',left(coalesce(latest.message,''),180),'has_image',messaging_private_v2.safe_legacy_path(s.id,latest.image_path)),
   'unread',EXISTS(SELECT 1 FROM public.messages m WHERE m.conversation_id=s.id
     AND NOT coalesce(m.sender_id=p_expected_user_id AND m.sender_identity_id IS NOT DISTINCT FROM p_expected_identity_id,false)
     AND CASE WHEN w.through_message_id IS NOT NULL THEN m.id>w.through_message_id ELSE s.last_read_at IS NULL OR m.created_at>s.last_read_at END),
   'can_send',listing_contact_private.peer_ready(s.peer_user,s.peer_identity,p_expected_user_id)) ORDER BY s.activity_at DESC,s.id DESC),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN
   (SELECT jsonb_build_object('updated_at',activity_at,'conversation_id',id::text) FROM shown ORDER BY activity_at,id LIMIT 1) ELSE NULL END
 INTO items,cursor FROM shown s
 LEFT JOIN messaging_private_v2.read_watermarks w ON w.actor_user_id=p_expected_user_id AND w.identity_id=p_expected_identity_id AND w.conversation_id=s.id
 LEFT JOIN LATERAL(SELECT m.message,m.image_path,m.image_url FROM public.messages m WHERE m.conversation_id=s.id ORDER BY m.id DESC LIMIT 1) latest ON true;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'actor',messaging_private_v2.identity_card(p_expected_identity_id),'conversations',items,'next_cursor',cursor);
END $f$;

CREATE FUNCTION public.get_my_message_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;before_id bigint;lid bigint;c public.conversations%ROWTYPE;peer_u uuid;peer_i uuid;items jsonb;next_id text;attachment jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_before_message_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_message_id); END IF;
 IF p_attachment_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_attachment_listing_id); END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO c FROM public.conversations WHERE id=cid FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 -- Limit both row count and cumulative encoded message JSON. Only genuinely
 -- oversized legacy text is explicitly marked; normal historical text survives.
 WITH page AS MATERIALIZED(SELECT m.* FROM public.messages m WHERE m.conversation_id=cid
  AND (before_id IS NULL OR m.id<before_id) ORDER BY m.id DESC LIMIT 51),
 enriched AS MATERIALIZED(SELECT m.id,jsonb_build_object('id',m.id::text,
   'mine',coalesce(m.sender_id=p_expected_user_id AND m.sender_identity_id=p_expected_identity_id,false),
   'text',left(coalesce(m.message,''),20000),'text_truncated',char_length(coalesce(m.message,''))>20000,'created_at',m.created_at,
   'listing',CASE WHEN m.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',m.listing_id::text,
    'title',left(m.listing_title,200),'image',CASE WHEN length(m.listing_image)<=2048 THEN m.listing_image ELSE NULL END,'price',left(m.listing_price,200)) END,
   'image',CASE WHEN ph.attachment_id IS NOT NULL THEN jsonb_build_object('kind','v2','attachment_id',ph.attachment_id,'width',ph.width,'height',ph.height)
    WHEN messaging_private_v2.safe_legacy_path(cid,m.image_path) THEN jsonb_build_object('kind','legacy','attachment_id',NULL,'width',NULL,'height',NULL) ELSE NULL END) payload
  FROM page m LEFT JOIN messaging_private_v2.photos ph ON ph.message_id=m.id AND ph.conversation_id=cid AND ph.state='attached'
   AND ph.actor_user_id=m.sender_id AND ph.identity_id=m.sender_identity_id
   AND m.image_path=cid::text||'/'||ph.attachment_id::text||'.webp'),
 sized AS(SELECT *,row_number() OVER(ORDER BY id DESC) ordinal,
  sum(octet_length(payload::text)) OVER(ORDER BY id DESC) total_bytes FROM enriched),
 shown AS MATERIALIZED(SELECT * FROM sized WHERE ordinal<=50 AND total_bytes<=1400000)
 SELECT coalesce(jsonb_agg(payload ORDER BY id),'[]'::jsonb),
  CASE WHEN EXISTS(SELECT 1 FROM page WHERE id<(SELECT min(id) FROM shown)) THEN min(id)::text ELSE NULL END
 INTO items,next_id FROM shown;
 SELECT jsonb_build_object('id',l.id::text,'title',left(l.title,200),'image',CASE WHEN length(l.image)<=2048 THEN l.image ELSE NULL END,'price',left(l.price,200))
 INTO attachment FROM public.listings l WHERE l.id=lid AND l.status='active' AND l.active_until IS NOT NULL AND l.active_until>clock_timestamp()
  AND ((l.user_id=c.buyer_id AND l.identity_id=c.buyer_identity_id) OR (l.user_id=c.seller_id AND l.identity_id=c.seller_identity_id))
  AND (NOT public.listing_contact_is_managed_v1(cid,l.id) OR EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=l.id AND p.state='published'));
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'actor',messaging_private_v2.identity_card(p_expected_identity_id),'peer',messaging_private_v2.identity_card(peer_i),
  'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id),
  'blocked_by_me',EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id=p_expected_user_id AND blocked_id=peer_u),
  'listing',CASE WHEN c.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',c.listing_id::text,'title',left(c.listing_title_snapshot,200)) END,
  'messages',items,'next_before_message_id',next_id,'attachment_listing_id',p_attachment_listing_id,'attachment_listing',attachment);
END $f$;

CREATE FUNCTION public.send_my_message_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_listing_id text DEFAULT NULL,p_attachment_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;lid bigint;c public.conversations%ROWTYPE;old messaging_private_v2.send_receipts%ROWTYPE;
 l public.listings%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;digest bytea;mid bigint;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_listing_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000
 OR (btrim(p_message,E' \t\r\n')='' AND p_attachment_id IS NULL) THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 digest:=sha256(convert_to(jsonb_build_object('conversation_id',cid::text,'listing_id',p_listing_id,'message',p_message,'attachment_id',p_attachment_id)::text,'UTF8'));
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- Listing -> conversation -> attachment is the lock order. Existing terminal
 -- listing deletion uses listing -> conversation; no network occurs under locks.
 IF lid IS NOT NULL THEN
  SELECT * INTO l FROM public.listings WHERE id=lid FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
   OR NOT ((l.user_id=c.buyer_id AND l.identity_id=c.buyer_identity_id) OR (l.user_id=c.seller_id AND l.identity_id=c.seller_identity_id))
   OR (public.listing_contact_is_managed_v1(cid,lid) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published')) THEN
   RAISE EXCEPTION 'message_listing_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(cid,p_expected_user_id,p_expected_identity_id)
 OR (lid IS NOT NULL AND l.active_until<=clock_timestamp()) THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
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
 OVERRIDING SYSTEM VALUE VALUES(mid,cid,p_expected_user_id,p_expected_identity_id,p_message,t,lid,l.title,l.image,l.price,
  CASE WHEN p_attachment_id IS NULL THEN NULL ELSE cid::text||'/'||p_attachment_id::text||'.webp' END);
 UPDATE public.conversations SET updated_at=t,archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','send','message_id',mid::text,'request_key',p_request_key,'replayed',false);
END $f$;

CREATE FUNCTION public.mark_my_thread_read_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_through_message_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;mid bigint;effective bigint;old_id bigint;seen_at timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);mid:=listing_contact_private.positive_id(p_through_message_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT created_at INTO seen_at FROM public.messages WHERE conversation_id=cid AND id=mid;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_read_input' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id FOR UPDATE;
 SELECT through_message_id INTO old_id FROM messaging_private_v2.read_watermarks
  WHERE actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND conversation_id=cid FOR UPDATE;
 -- Never widen the first visible-ID acknowledgement from a legacy wallclock.
 -- The timestamp is only an initial inbox fallback before this watermark exists.
 effective:=greatest(mid,coalesce(old_id,mid));
 INSERT INTO messaging_private_v2.read_watermarks(actor_user_id,identity_id,conversation_id,through_message_id)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,effective)
 ON CONFLICT(actor_user_id,identity_id,conversation_id) DO UPDATE SET through_message_id=greatest(messaging_private_v2.read_watermarks.through_message_id,EXCLUDED.through_message_id),updated_at=clock_timestamp()
 RETURNING through_message_id INTO effective;
 -- Legacy readers retain their timestamp semantics, but only the timestamp of
 -- an actually displayed message is advanced. No NOW() read acknowledgement.
 UPDATE public.conversation_participants SET last_read_at=greatest(last_read_at,seen_at)
 WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','mark_read','through_message_id',effective::text);
END $f$;
CREATE FUNCTION public.hide_my_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 UPDATE public.conversation_participants SET deleted_at=clock_timestamp() WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,'action','hide');
END $f$;
-- The contact writer has no INSERT/DELETE authority on user_blocks. This narrow
-- postgres-owned helper changes only the verified caller's own account block.
CREATE FUNCTION messaging_private_v2.set_block(p_user uuid,p_identity uuid,p_conversation bigint,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;peer_u uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_user,p_identity);
 c:=messaging_private_v2.require_thread(p_conversation,p_user,p_identity);
 IF p_blocked IS NULL THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 peer_u:=CASE WHEN c.buyer_id=p_user THEN c.seller_id ELSE c.buyer_id END;
 LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 IF p_blocked THEN INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(p_user,peer_u) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
 ELSE DELETE FROM public.user_blocks WHERE blocker_id=p_user AND blocked_id=peer_u; END IF;
END $f$;
CREATE FUNCTION public.set_my_thread_block_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_blocked boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;peer_u uuid;peer_i uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 PERFORM messaging_private_v2.set_block(p_expected_user_id,p_expected_identity_id,cid,p_blocked);
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,
  'action',CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END,'blocked_by_me',p_blocked,'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id));
END $f$;

-- Restrictive policy composes with any permissive legacy Storage policy. It
-- changes no other bucket and prevents direct browser access even if an old
-- PUBLIC policy happens to allow an object. Service-role access remains server.
CREATE POLICY message_attachments_v2_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
 USING(bucket_id<>'message-attachments-v2') WITH CHECK(bucket_id<>'message-attachments-v2');

CREATE FUNCTION public.reserve_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_source_sha256 text,p_source_bytes bigint,p_source_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_source_sha256 IS NULL OR p_source_sha256 !~ '^[0-9a-f]{64}$' OR p_source_bytes IS NULL
 OR p_source_bytes NOT BETWEEN 1 AND 1400000 OR p_source_mime IS DISTINCT FROM 'image/webp' THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.source_sha256<>p_source_sha256 OR ph.source_bytes<>p_source_bytes OR ph.source_mime<>p_source_mime THEN
   RAISE EXCEPTION 'message_photo_request_conflict' USING ERRCODE='22023'; END IF;
  IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
   UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=ph.attachment_id RETURNING * INTO ph;
  END IF;
  RETURN messaging_private_v2.photo_receipt(ph);
 END IF;
 IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- require_actor holds the actor profile lock, serializing this actor's quota
 -- decisions. Permanent tombstones retain their byte reservation: an ambiguous
 -- late upload never creates unaccounted storage merely because it was canceled.
 t:=clock_timestamp();
 IF (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 hour')>=10
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')>=100
 OR (SELECT coalesce(sum(source_bytes),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')+p_source_bytes>104857600
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND state IN('reserved','uploading','ready') AND expires_at>t)>=10
 OR (SELECT coalesce(sum(coalesce(web_bytes,2000000)),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id)+2000000>262144000 THEN
  RAISE EXCEPTION 'message_photo_quota' USING ERRCODE='54000'; END IF;
 INSERT INTO messaging_private_v2.photos(actor_user_id,identity_id,conversation_id,request_key,source_sha256,source_bytes,source_mime,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,p_request_key,p_source_sha256,p_source_bytes,p_source_mime,t,t+interval '30 minutes') RETURNING * INTO ph;
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;

CREATE FUNCTION public.claim_message_photo_upload_v2(p_attachment_id uuid,p_expected_user_id uuid,p_expected_identity_id uuid,
 p_source_sha256 text,p_claim_key uuid,p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_web_sha256 IS NULL OR p_web_sha256 !~ '^[0-9a-f]{64}$' OR p_web_bytes IS NULL OR p_web_bytes NOT BETWEEN 1 AND 2000000
 OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 1600 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 1600 THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id IS DISTINCT FROM p_expected_user_id OR ph.identity_id IS DISTINCT FROM p_expected_identity_id
 OR ph.source_sha256 IS DISTINCT FROM p_source_sha256 THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.upload_key IS NOT NULL AND (ph.web_sha256<>p_web_sha256 OR ph.web_bytes<>p_web_bytes OR ph.width<>p_width OR ph.height<>p_height) THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='reserved' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='uploading',upload_key=p_claim_key,web_sha256=p_web_sha256,web_bytes=p_web_bytes,width=p_width,height=p_height
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- A replay returns the original upload key and exact frozen bytes. The HTTP
 -- transport must use create-only writes; an existing object must be read/hash
 -- verified against this manifest, never overwritten or silently adopted.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
CREATE FUNCTION public.finish_message_photo_upload_v2(p_attachment_id uuid,p_claim_key uuid,p_outcome text,
 p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('ready','failed') OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.upload_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL
 OR ph.web_sha256 IS DISTINCT FROM p_web_sha256 OR ph.web_bytes IS DISTINCT FROM p_web_bytes
 OR ph.width IS DISTINCT FROM p_width OR ph.height IS DISTINCT FROM p_height THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND (ph.expires_at<=clock_timestamp() OR p_outcome='failed') THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code=coalesce(p_failure_code,CASE WHEN ph.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'UPLOAD_FAILED' END)
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='uploading' AND p_outcome='ready' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='ready' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- attached and tombstoned states never regress or resurrect on late results.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
CREATE FUNCTION public.cancel_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_attachment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id<>p_expected_user_id OR ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.state='attached' THEN
  RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state<>'tombstoned' THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='CANCELED' WHERE attachment_id=p_attachment_id;
 END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'attachment_id',p_attachment_id,'state','tombstoned');
END $f$;
CREATE FUNCTION public.get_my_message_photo_binding_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_message_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;mid bigint;m public.messages%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;kind text;bucket text;object_path text;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);mid:=listing_contact_private.positive_id(p_message_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO m FROM public.messages WHERE conversation_id=cid AND id=mid;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE message_id=mid AND conversation_id=cid AND state='attached'
  AND actor_user_id=m.sender_id AND identity_id=m.sender_identity_id
  AND m.image_path=cid::text||'/'||attachment_id::text||'.webp';
 IF FOUND THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  kind:='v2';bucket:='message-attachments-v2';object_path:=cid::text||'/'||ph.attachment_id::text||'.webp';
 ELSIF messaging_private_v2.safe_legacy_path(cid,m.image_path) THEN
  kind:='legacy';bucket:='messages';object_path:=m.image_path;
 ELSE RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,
  'message_id',mid::text,'kind',kind,'attachment_id',ph.attachment_id,'bucket',bucket,'path',object_path,
  'web_sha256',ph.web_sha256,'web_bytes',ph.web_bytes,'width',ph.width,'height',ph.height);
END $f$;
CREATE FUNCTION public.claim_message_photo_cleanup_v2(p_claim_key uuid,p_limit integer DEFAULT 3)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;t timestamptz;items jsonb:='[]'::jsonb;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 t:=clock_timestamp();
 FOR ph IN SELECT * FROM messaging_private_v2.photos WHERE
  (state IN('reserved','uploading','ready') AND expires_at<=t)
  OR (state='tombstoned' AND next_cleanup_at<=t AND (cleanup_lease_until IS NULL OR cleanup_lease_until<=t OR cleanup_key=p_claim_key))
  ORDER BY coalesce(next_cleanup_at,expires_at),attachment_id LIMIT p_limit FOR UPDATE SKIP LOCKED
 LOOP
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=coalesce(next_cleanup_at,t),
   cleanup_key=p_claim_key,cleanup_lease_until=t+interval '5 minutes',failure_code=coalesce(failure_code,'EXPIRED')
  WHERE attachment_id=ph.attachment_id;
  items:=items||jsonb_build_array(jsonb_build_object('attachment_id',ph.attachment_id,'bucket','message-attachments-v2',
   'path',ph.conversation_id::text||'/'||ph.attachment_id::text||'.webp','cleanup_key',p_claim_key,'lease_until',t+interval '5 minutes'));
 END LOOP;
 RETURN jsonb_build_object('schema_version',2,'claims',items);
END $f$;
CREATE FUNCTION public.finish_message_photo_cleanup_v2(p_attachment_id uuid,p_claim_key uuid,p_removed boolean,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;next_time timestamptz;
BEGIN
 IF p_removed IS NULL OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.state<>'tombstoned' OR ph.cleanup_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL THEN
  RAISE EXCEPTION 'message_photo_cleanup_conflict' USING ERRCODE='22023'; END IF;
 next_time:=clock_timestamp()+CASE WHEN ph.cleanup_attempts<2 OR NOT p_removed THEN interval '1 hour' ELSE interval '1 day' END;
 UPDATE messaging_private_v2.photos SET cleanup_key=NULL,cleanup_lease_until=NULL,next_cleanup_at=next_time,
  cleanup_attempts=cleanup_attempts+1,last_cleanup_at=clock_timestamp(),last_cleanup_removed=p_removed,
  failure_code=coalesce(p_failure_code,failure_code) WHERE attachment_id=p_attachment_id;
 -- An observed DELETE/404 does not prove a previously ambiguous create cannot
 -- arrive later. The immutable tombstone is revisited; no terminal deleted state.
 RETURN jsonb_build_object('schema_version',2,'attachment_id',p_attachment_id,'state','tombstoned','next_cleanup_at',next_time);
END $f$;

-- Only this INSERT branch changes in the existing guard. Text-only behavior,
-- terminal listing snapshot scrubbing, and every direct-write rejection remain.
CREATE OR REPLACE FUNCTION listing_contact_private.guard_message() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' AND current_user='selqiro_listing_contact_writer_v1' AND NEW.image_url IS NULL THEN
  IF NEW.image_path IS NULL THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM messaging_private_v2.photos p WHERE p.state='attached' AND p.message_id=NEW.id
   AND p.conversation_id=NEW.conversation_id AND p.actor_user_id=NEW.sender_id AND p.identity_id=NEW.sender_identity_id
   AND p.web_sha256 IS NOT NULL AND p.web_bytes IS NOT NULL AND p.width IS NOT NULL AND p.height IS NOT NULL
   AND NEW.image_path=p.conversation_id::text||'/'||p.attachment_id::text||'.webp') THEN RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title IS NULL AND NEW.listing_image IS NULL AND NEW.listing_price IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
-- Historical legacy messages retain their legacy rules. Only a newly attached
-- private photo's immutable sender/conversation/path/content binding is protected
-- if a legacy endpoint later attempts to edit or delete that specific message.
CREATE FUNCTION messaging_private_v2.protect_attached_photo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM messaging_private_v2.photos WHERE message_id=OLD.id AND state='attached') THEN
  IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])<>
   (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN
   RAISE EXCEPTION 'message_photo_binding_retained' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $f$;
CREATE TRIGGER protect_attached_message_photo_v2 BEFORE UPDATE OR DELETE ON public.messages
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.protect_attached_photo();

-- A legacy direct INSERT must honor the same account block as the V2 RPC.
-- This trigger grants no write/read authority; existing RLS still authorizes
-- the INSERT. The brief SHARE lock also fences a concurrent legacy block write.
CREATE FUNCTION messaging_private_v2.guard_account_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=auth.uid();active_identity uuid;c public.conversations%ROWTYPE;
BEGIN
 -- Legacy callers still pass normal existing RLS. Independently verify the
 -- actual authenticated sender and selected identity; service maintenance has
 -- no auth subject but must still target an exact legitimate two-party thread.
 IF actor IS NOT NULL THEN
  IF NEW.sender_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
  SELECT active_identity_id INTO active_identity FROM public.profiles WHERE id=actor FOR SHARE;
  IF active_identity IS DISTINCT FROM NEW.sender_identity_id OR active_identity IS NULL THEN
   RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM listing_contact_private.require_peer(NEW.sender_id,NEW.sender_identity_id);
 LOCK TABLE public.user_blocks IN SHARE MODE;
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=NEW.conversation_id FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(NEW.conversation_id,NEW.sender_id,NEW.sender_identity_id)
 OR EXISTS(SELECT 1 FROM public.conversation_participants cp JOIN public.user_blocks b ON
   ((b.blocker_id=NEW.sender_id AND b.blocked_id=cp.user_id) OR (b.blocker_id=cp.user_id AND b.blocked_id=NEW.sender_id))
  WHERE cp.conversation_id=NEW.conversation_id AND cp.user_id IS DISTINCT FROM NEW.sender_id) THEN
  RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 -- A legacy INSERT may have allocated its default ID before waiting for this
 -- conversation. Allocate the final ID only AFTER this lock, so a late commit
 -- cannot arrive permanently below an already acknowledged message watermark.
 -- The new controlled sender already allocated under this same lock and bound
 -- its private deferred receipt; preserve exactly that independently bound ID.
 IF NOT EXISTS(SELECT 1 FROM messaging_private_v2.send_receipts r WHERE r.message_id=NEW.id
   AND r.actor_user_id=NEW.sender_id AND r.identity_id=NEW.sender_identity_id AND r.conversation_id=NEW.conversation_id) THEN
  NEW.id:=nextval('public.messages_id_seq');NEW.created_at:=clock_timestamp();
 END IF;
 IF NOT public.listing_contact_is_managed_v1(c.id,c.listing_id) THEN
  UPDATE public.conversations SET updated_at=clock_timestamp(),archived_at=NULL WHERE id=c.id;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=c.id;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER messaging_account_block_v2 BEFORE INSERT ON public.messages
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_account_block();

-- Public browser-authorized functions use the established constrained writer.
-- The temporary CREATE grant is revoked in this same transaction; apply verifies
-- the public schema ACL is byte-identical before commit.
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_message_thread_v2(uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.mark_my_thread_read_v2(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.hide_my_thread_v2(uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.set_my_thread_block_v2(uuid,uuid,text,boolean) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.cancel_my_message_photo_v2(uuid,uuid,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_message_photo_binding_v2(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA messaging_private_v2 TO selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text),public.get_my_message_thread_v2(uuid,uuid,text,text,text),
 public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid),public.mark_my_thread_read_v2(uuid,uuid,text,text),public.hide_my_thread_v2(uuid,uuid,text),
 public.set_my_thread_block_v2(uuid,uuid,text,boolean),public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text),
 public.cancel_my_message_photo_v2(uuid,uuid,text,uuid),public.get_my_message_photo_binding_v2(uuid,uuid,text,text),
 public.claim_message_photo_upload_v2(uuid,uuid,uuid,text,uuid,text,bigint,integer,integer),
 public.finish_message_photo_upload_v2(uuid,uuid,text,text,bigint,integer,integer,text),public.claim_message_photo_cleanup_v2(uuid,integer),
 public.finish_message_photo_cleanup_v2(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text),public.get_my_message_thread_v2(uuid,uuid,text,text,text),
 public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid),public.mark_my_thread_read_v2(uuid,uuid,text,text),public.hide_my_thread_v2(uuid,uuid,text),
 public.set_my_thread_block_v2(uuid,uuid,text,boolean),public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text),
 public.cancel_my_message_photo_v2(uuid,uuid,text,uuid),public.get_my_message_photo_binding_v2(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_message_photo_upload_v2(uuid,uuid,uuid,text,uuid,text,bigint,integer,integer),
 public.finish_message_photo_upload_v2(uuid,uuid,text,text,bigint,integer,integer,text),public.claim_message_photo_cleanup_v2(uuid,integer),
 public.finish_message_photo_cleanup_v2(uuid,uuid,boolean,text) TO service_role;
