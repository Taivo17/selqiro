-- Canonical public media routes retain their immutable origin attempt/slot.
-- Every response still requires exact live membership in the parent listing.
CREATE OR REPLACE FUNCTION public.get_public_listing_media_binding_v1(p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE v jsonb;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',g.media_attempt_id,'ordinal',g.media_ordinal,'bucket_id',o.bucket_id,
  'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id JOIN public.identities i ON i.id=l.identity_id
 JOIN LATERAL listing_publication_private.managed_image_origins_v1(a.id) g
  ON g.media_attempt_id=p_attempt_id AND g.media_ordinal=p_ordinal
 JOIN listing_publication_private.attempts origin ON origin.id=g.media_attempt_id AND origin.state='published' AND origin.identity_id=a.identity_id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=g.media_attempt_id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=g.media_attempt_id AND (g.attached_ready_id IS NULL OR g.attached_ready_id=w.ready_id) AND w.state='ready'
 JOIN public.listing_images li ON li.listing_id=l.id AND li.sort_order=g.ordinal AND li.user_id=a.actor_user_id
  AND li.original_url=g.canonical_url
  AND li.medium_url=li.original_url AND li.thumb_url=li.original_url
 WHERE a.id=listing_publication_private.managed_image_root_v1(p_attempt_id) AND a.state='published' AND p.state='published' AND l.status='active'
  AND l.active_until>clock_timestamp() AND i.status='active' AND l.identity_id=a.identity_id
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id);
 RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_listing_media_binding_v2(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE v jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',g.media_attempt_id,'ordinal',g.media_ordinal,'bucket_id',o.bucket_id,
  'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id
 JOIN LATERAL listing_publication_private.managed_image_origins_v1(a.id) g
  ON g.media_attempt_id=p_attempt_id AND g.media_ordinal=p_ordinal
 JOIN listing_publication_private.attempts origin ON origin.id=g.media_attempt_id AND origin.state='published' AND origin.identity_id=a.identity_id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=g.media_attempt_id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=g.media_attempt_id AND (g.attached_ready_id IS NULL OR g.attached_ready_id=w.ready_id) AND w.state='ready'
 JOIN public.listing_images li ON li.listing_id=l.id AND li.sort_order=g.ordinal AND li.user_id=a.actor_user_id
  AND li.original_url=g.canonical_url
  AND li.medium_url=li.original_url AND li.thumb_url=li.original_url
 WHERE a.id=listing_publication_private.managed_image_root_v1(p_attempt_id) AND a.state='published' AND p.state='published'
  AND l.identity_id=a.identity_id AND a.identity_id=p_expected_identity_id
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id);
 RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_managed_listing_v2(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; activity jsonb; images jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id IS NULL OR p_listing_id !~'^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR SHARE OF a;
 IF aid IS NOT NULL THEN
  SELECT jsonb_build_object('status',l.status,'active_until',l.active_until) INTO activity
   FROM public.listings l WHERE l.id=p_listing_id::bigint AND l.identity_id=p_expected_identity_id;
  -- Management status remains readable if a gallery is malformed. The separate
  -- gallery RPC still validates every slot before any photo action. EXISTS
  -- projects each immutable ordinal once, even if public rows are duplicated.
  SELECT coalesce(jsonb_agg(g.canonical_url ORDER BY g.ordinal),'[]'::jsonb) INTO images
  FROM listing_publication_private.managed_image_origins_v1(aid) g
  JOIN listing_publication_private.attempts a ON a.id=aid
  JOIN listing_publication_private.attempts origin ON origin.id=g.media_attempt_id AND origin.state='published' AND origin.identity_id=a.identity_id
  JOIN listing_publication_private.objects o ON o.slot_id=g.slot_id AND o.attempt_id=g.media_attempt_id AND o.kind='web'
  WHERE activity IS NOT NULL
   AND EXISTS(SELECT 1 FROM public.listing_images li WHERE li.listing_id=p_listing_id::bigint
    AND li.sort_order=g.ordinal AND li.user_id=a.actor_user_id
    AND li.original_url=g.canonical_url AND li.medium_url=li.original_url AND li.thumb_url=li.original_url)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id);
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid),
  'activity',activity,'images',coalesce(images,'[]'::jsonb));
END $f$;
