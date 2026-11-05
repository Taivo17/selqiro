-- Remove one non-primary published photo. Apply only through guarded apply.sql.
-- Original slots/objects/ready receipts stay immutable. Removed WEB remains
-- private and charged: this capability performs no Storage or quota deletion.
ALTER TABLE listing_publication_private.cleanup DROP CONSTRAINT final_cleanup_reason;
ALTER TABLE listing_publication_private.cleanup ADD CONSTRAINT final_cleanup_reason
 CHECK(reason IN('cancelled','expired','published_source','terminal_delete','published_image_removed'));

CREATE OR REPLACE FUNCTION listing_publication_private.lock_managed_listing_images_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_for_update boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
 p listing_publication_private.publications%ROWTYPE; l public.listings%ROWTYPE;
 r record; n integer; seen integer:=0; image_count integer; primary_count integer; primary_url text;
 images jsonb:='[]'::jsonb; revision bigint;
BEGIN
 PERFORM listing_publication_private.require_managed_image_actor_v1(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id IS NULL OR p_listing_id<1 OR p_attempt_id IS NULL OR p_for_update IS NULL THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 -- Keep actor -> attempt -> publication -> listing -> image serialization.
 IF p_for_update THEN
  SELECT * INTO a FROM listing_publication_private.attempts
   WHERE id=p_attempt_id AND identity_id=p_expected_identity_id FOR UPDATE;
 ELSE
  SELECT * INTO a FROM listing_publication_private.attempts
   WHERE id=p_attempt_id AND identity_id=p_expected_identity_id FOR SHARE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501'; END IF;
 IF p_for_update THEN
  SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR UPDATE;
 ELSE
  SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR SHARE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF p.listing_id IS DISTINCT FROM p_listing_id THEN
  RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501'; END IF;
 IF a.state<>'published' OR p.state<>'published' OR p.deleted_at IS NOT NULL THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF p_for_update THEN SELECT * INTO l FROM public.listings WHERE id=p_listing_id FOR UPDATE;
 ELSE SELECT * INTO l FROM public.listings WHERE id=p_listing_id FOR SHARE; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF l.identity_id IS DISTINCT FROM a.identity_id OR l.user_id IS DISTINCT FROM a.actor_user_id
  OR l.created_by_user_id IS DISTINCT FROM a.actor_user_id THEN
  RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501'; END IF;
 IF p_for_update THEN
  PERFORM 1 FROM public.listing_images WHERE listing_id=l.id ORDER BY id FOR UPDATE;
 ELSE PERFORM 1 FROM public.listing_images WHERE listing_id=l.id ORDER BY id FOR SHARE; END IF;
 SELECT count(*) INTO n FROM listing_publication_private.slots WHERE attempt_id=a.id;
 SELECT count(*),count(*) FILTER(WHERE is_primary),max(original_url) FILTER(WHERE is_primary)
  INTO image_count,primary_count,primary_url FROM public.listing_images WHERE listing_id=l.id;
 IF n>10 OR image_count>n OR (n=0 AND (primary_count<>0 OR l.image IS NOT NULL))
  OR (n>0 AND (image_count<1 OR primary_count<>1 OR l.image IS DISTINCT FROM primary_url)) THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 FOR r IN
  SELECT s.id AS slot_id,s.ordinal,
   '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text AS canonical_url,
   o.id AS object_id,o.bucket_id,o.object_path,so.id AS source_object_id,
   w.id AS web_id,w.state AS web_state,w.ready_id,w.ready_at,w.intent,
   i.id AS image_id,i.user_id AS image_user_id,i.original_url,i.medium_url,i.thumb_url,i.is_primary,
   c.object_id AS cleanup_object_id,c.bucket_id AS cleanup_bucket,c.object_path AS cleanup_path,c.reason AS cleanup_reason
  FROM listing_publication_private.slots s
  LEFT JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
  LEFT JOIN listing_publication_private.objects so ON so.slot_id=s.id AND so.attempt_id=a.id AND so.kind='source'
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
  LEFT JOIN public.listing_images i ON i.listing_id=l.id AND i.sort_order=s.ordinal
  LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE s.attempt_id=a.id ORDER BY s.ordinal
 LOOP
  -- Every original slot retains its proof, even after public membership ends.
  IF r.ordinal<>seen OR r.object_id IS NULL OR r.bucket_id IS DISTINCT FROM 'listing-publication-private'
   OR r.object_path IS DISTINCT FROM ('v1/'||a.id::text||'/'||r.slot_id::text||'/web-v1.webp')
   OR r.web_id IS NULL OR r.web_state IS DISTINCT FROM 'ready' OR r.ready_id IS NULL OR r.ready_at IS NULL THEN
   RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
  seen:=seen+1;
  BEGIN PERFORM listing_publication_private.validate_managed_image_intent_v1(r.intent,r.slot_id);
  EXCEPTION WHEN SQLSTATE '22023' THEN
   RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END;
  IF r.cleanup_object_id IS NOT NULL THEN
   -- A missing row is valid only with its exact retained removal lineage.
   IF r.image_id IS NOT NULL OR r.cleanup_reason IS DISTINCT FROM 'published_image_removed'
    OR r.cleanup_bucket IS DISTINCT FROM r.bucket_id OR r.cleanup_path IS DISTINCT FROM r.object_path
    OR listing_publication_private.hosted_completed_source_deleted_v1(r.source_object_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
  ELSE
   IF r.image_id IS NULL OR r.image_user_id IS DISTINCT FROM a.actor_user_id
    OR r.original_url IS DISTINCT FROM r.canonical_url OR r.medium_url IS DISTINCT FROM r.canonical_url
    OR r.thumb_url IS DISTINCT FROM r.canonical_url OR r.is_primary IS NULL THEN
    RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
   images:=images||jsonb_build_array(jsonb_build_object('ordinal',r.ordinal,'url',r.canonical_url,'is_primary',r.is_primary));
  END IF;
 END LOOP;
 IF seen<>n OR jsonb_array_length(images)<>image_count THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 SELECT x.revision INTO revision FROM listing_publication_private.managed_image_presentations_v1 x WHERE x.attempt_id=a.id;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',a.identity_id,
  'listing_id',l.id::text,'attempt_id',a.id,'revision',coalesce(revision,0)::text,'images',images);
END $f$;

CREATE FUNCTION public.remove_my_managed_listing_image_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,
 p_expected_revision text,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE gallery jsonb; target jsonb; previous_revision bigint; affected integer;
 source_id uuid; web_object listing_publication_private.objects%ROWTYPE;
BEGIN
 IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
  OR p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 IF p_expected_revision::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 gallery:=listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 IF gallery->>'revision' IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 SELECT value INTO target FROM jsonb_array_elements(gallery->'images') WHERE (value->>'ordinal')::integer=p_ordinal;
 IF NOT FOUND OR jsonb_array_length(gallery->'images')<2 OR (target->>'is_primary')::boolean THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 previous_revision:=(gallery->>'revision')::bigint;
 IF previous_revision=9223372036854775807 THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 SELECT o.* INTO web_object FROM listing_publication_private.slots s
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=s.attempt_id AND o.kind='web'
 WHERE s.attempt_id=p_attempt_id AND s.ordinal=p_ordinal;
 SELECT o.id INTO source_id FROM listing_publication_private.objects o
 WHERE o.slot_id=web_object.slot_id AND o.attempt_id=p_attempt_id AND o.kind='source';
 -- The accepted SOURCE claim needs its WEB to remain active. Requiring that
 -- SOURCE already settled avoids stranding it or changing the accepted worker.
 IF listing_publication_private.hosted_completed_source_deleted_v1(source_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 VALUES(web_object.id,web_object.bucket_id,web_object.object_path,'published_image_removed',
  listing_publication_private.object_cleanup_state(web_object.id),clock_timestamp());
 DELETE FROM public.listing_images WHERE listing_id=p_listing_id AND sort_order=p_ordinal
  AND original_url=target->>'url' AND is_primary=false;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF previous_revision=0 THEN
  INSERT INTO listing_publication_private.managed_image_presentations_v1(attempt_id,revision) VALUES(p_attempt_id,1);
 ELSE
  UPDATE listing_publication_private.managed_image_presentations_v1 SET revision=previous_revision+1
   WHERE attempt_id=p_attempt_id AND revision=previous_revision;
 END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 -- Revalidate all active and removed slots before committing any part.
 RETURN listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true)||jsonb_build_object('changed',true);
END $f$;

CREATE OR REPLACE FUNCTION public.get_public_listing_media_binding_v1(p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE v jsonb;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
  'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id JOIN public.identities i ON i.id=l.identity_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id AND w.state='ready'
 JOIN public.listing_images li ON li.listing_id=l.id AND li.sort_order=s.ordinal AND li.user_id=a.actor_user_id
  AND li.original_url='/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text
  AND li.medium_url=li.original_url AND li.thumb_url=li.original_url
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published' AND l.status='active'
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
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
  'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id AND w.state='ready'
 JOIN public.listing_images li ON li.listing_id=l.id AND li.sort_order=s.ordinal AND li.user_id=a.actor_user_id
  AND li.original_url='/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text
  AND li.medium_url=li.original_url AND li.thumb_url=li.original_url
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published'
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
  SELECT coalesce(jsonb_agg('/api/v2/listing-media/'||aid::text||'/'||s.ordinal::text ORDER BY s.ordinal),'[]'::jsonb)
   INTO images FROM listing_publication_private.slots s
  JOIN listing_publication_private.attempts a ON a.id=s.attempt_id
  JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
  WHERE s.attempt_id=aid AND activity IS NOT NULL
   AND EXISTS(SELECT 1 FROM public.listing_images li WHERE li.listing_id=p_listing_id::bigint
    AND li.sort_order=s.ordinal AND li.user_id=a.actor_user_id
    AND li.original_url='/api/v2/listing-media/'||aid::text||'/'||s.ordinal::text
    AND li.medium_url=li.original_url AND li.thumb_url=li.original_url)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id);
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid),
  'activity',activity,'images',coalesce(images,'[]'::jsonb));
END $f$;

-- Existing replacements preserve their owners and ACLs. One new browser RPC
-- uses the same closed writer and independent active-identity authorization.
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer)
 OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer) TO authenticated;
COMMENT ON FUNCTION public.remove_my_managed_listing_image_v1(uuid,uuid,bigint,uuid,text,integer) IS
 'Remove one non-primary current membership after completed SOURCE cleanup. Original publication proof and removed WEB quota retained; no Storage delete or physical deletion receipt.';
