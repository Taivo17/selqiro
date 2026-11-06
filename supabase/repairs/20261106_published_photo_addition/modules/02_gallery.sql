-- Gallery identity and source identity are separate. Existing mutation CAS and
-- retirement proof remain unchanged, with one resolver for every photo origin.
CREATE FUNCTION listing_publication_private.managed_image_gallery_projection_v1(p_gallery jsonb,p_force_v2 boolean)
RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN p_gallery IS NULL THEN NULL
  WHEN p_force_v2 OR EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1
    WHERE parent_attempt_id=(p_gallery->>'attempt_id')::uuid AND attached_at IS NOT NULL)
  THEN p_gallery||jsonb_build_object('schema_version',2,'images',(SELECT coalesce(jsonb_agg(
   value||jsonb_build_object('media_attempt_id',coalesce(value->'media_attempt_id',p_gallery->'attempt_id'),
    'media_ordinal',coalesce(value->'media_ordinal',value->'ordinal')) ORDER BY (value->>'ordinal')::integer),'[]'::jsonb)
   FROM jsonb_array_elements(p_gallery->'images')))
  ELSE p_gallery||jsonb_build_object('schema_version',1,'images',(SELECT coalesce(jsonb_agg(
   value-'media_attempt_id'-'media_ordinal' ORDER BY (value->>'ordinal')::integer),'[]'::jsonb)
   FROM jsonb_array_elements(p_gallery->'images'))) END;
$f$;

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
 SELECT count(*) INTO n FROM listing_publication_private.managed_image_origins_v1(a.id);
 SELECT count(*),count(*) FILTER(WHERE is_primary),max(original_url) FILTER(WHERE is_primary)
  INTO image_count,primary_count,primary_url FROM public.listing_images WHERE listing_id=l.id;
 IF (SELECT count(*) FROM listing_publication_private.slots WHERE attempt_id=a.id)>10 OR image_count>10 OR image_count>n OR (n=0 AND (primary_count<>0 OR l.image IS NOT NULL))
  OR (n>0 AND (image_count<1 OR primary_count<>1 OR l.image IS DISTINCT FROM primary_url)) THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 FOR r IN
  SELECT g.slot_id,g.ordinal,g.media_attempt_id,g.media_ordinal,g.canonical_url,g.attached_ready_id,origin.state AS origin_state,origin.identity_id AS origin_identity,
   o.id AS object_id,o.bucket_id,o.object_path,so.id AS source_object_id,
   w.id AS web_id,w.state AS web_state,w.ready_id,w.ready_at,w.intent,
   i.id AS image_id,i.user_id AS image_user_id,i.original_url,i.medium_url,i.thumb_url,i.is_primary,
   c.object_id AS cleanup_object_id,c.bucket_id AS cleanup_bucket,c.object_path AS cleanup_path,c.reason AS cleanup_reason
  FROM listing_publication_private.managed_image_origins_v1(a.id) g
  JOIN listing_publication_private.attempts origin ON origin.id=g.media_attempt_id
  LEFT JOIN listing_publication_private.objects o ON o.slot_id=g.slot_id AND o.attempt_id=g.media_attempt_id AND o.kind='web'
  LEFT JOIN listing_publication_private.objects so ON so.slot_id=g.slot_id AND so.attempt_id=g.media_attempt_id AND so.kind='source'
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=g.slot_id AND w.attempt_id=g.media_attempt_id
  LEFT JOIN public.listing_images i ON i.listing_id=l.id AND i.sort_order=g.ordinal
  LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  ORDER BY g.ordinal
 LOOP
  -- Every origin retains its proof, even after public membership ends.
  IF r.ordinal<>seen OR r.object_id IS NULL OR r.bucket_id IS DISTINCT FROM 'listing-publication-private'
   OR r.object_path IS DISTINCT FROM ('v1/'||r.media_attempt_id::text||'/'||r.slot_id::text||'/web-v1.webp')
   OR r.origin_state IS DISTINCT FROM 'published' OR r.origin_identity IS DISTINCT FROM a.identity_id
   OR (r.attached_ready_id IS NOT NULL AND r.attached_ready_id IS DISTINCT FROM r.ready_id)
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
   images:=images||jsonb_build_array(jsonb_build_object('ordinal',r.ordinal,'media_attempt_id',r.media_attempt_id,'media_ordinal',r.media_ordinal,'url',r.canonical_url,'is_primary',r.is_primary));
  END IF;
 END LOOP;
 IF seen<>n OR jsonb_array_length(images)<>image_count THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 SELECT x.revision INTO revision FROM listing_publication_private.managed_image_presentations_v1 x WHERE x.attempt_id=a.id;
 -- SQL is installed before the app: unchanged galleries keep their exact old
 -- envelope until an addition exists. Addition endpoints explicitly request v2.
 RETURN listing_publication_private.managed_image_gallery_projection_v1(
  jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',a.identity_id,
   'listing_id',l.id::text,'attempt_id',a.id,'revision',coalesce(revision,0)::text,'images',images),false);
END $f$;

CREATE OR REPLACE FUNCTION public.set_my_managed_listing_primary_image_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,
 p_expected_revision text,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE gallery jsonb; target jsonb; previous_revision bigint; next_revision bigint; affected integer;
BEGIN
 IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
  OR p_ordinal IS NULL OR p_ordinal<0 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023';
 END IF;
 IF p_expected_revision::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023';
 END IF;
 gallery:=listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,true);
 -- Compare even when the requested target already happens to be primary.
 IF gallery->>'revision' IS DISTINCT FROM p_expected_revision THEN
  RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001';
 END IF;
 SELECT value INTO target FROM jsonb_array_elements(gallery->'images') WHERE (value->>'ordinal')::integer=p_ordinal;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 IF (target->>'is_primary')::boolean THEN RETURN gallery||jsonb_build_object('changed',false); END IF;
 previous_revision:=(gallery->>'revision')::bigint;
 IF previous_revision=9223372036854775807 THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 next_revision:=previous_revision+1;
 UPDATE public.listing_images SET is_primary=false WHERE listing_id=p_listing_id AND is_primary;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 UPDATE public.listing_images SET is_primary=true
  WHERE listing_id=p_listing_id AND sort_order=p_ordinal AND original_url=target->>'url';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 UPDATE public.listings SET image=target->>'url' WHERE id=p_listing_id;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF previous_revision=0 THEN
  INSERT INTO listing_publication_private.managed_image_presentations_v1(attempt_id,revision)
   VALUES(p_attempt_id,next_revision);
 ELSE
  UPDATE listing_publication_private.managed_image_presentations_v1 SET revision=next_revision
   WHERE attempt_id=p_attempt_id AND revision=previous_revision;
 END IF;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'listing_images_conflict' USING ERRCODE='40001'; END IF;
 SELECT jsonb_agg(value||jsonb_build_object('is_primary',(value->>'ordinal')::integer=p_ordinal)
  ORDER BY (value->>'ordinal')::integer) INTO target FROM jsonb_array_elements(gallery->'images');
 RETURN gallery||jsonb_build_object('revision',next_revision::text,'images',target,'changed',true);
END $f$;

CREATE OR REPLACE FUNCTION public.remove_my_managed_listing_image_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,
 p_expected_revision text,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE gallery jsonb; target jsonb; previous_revision bigint; affected integer;
 source_id uuid; web_object listing_publication_private.objects%ROWTYPE;
BEGIN
 IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
  OR p_ordinal IS NULL OR p_ordinal<0 THEN
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
 SELECT o.* INTO web_object FROM listing_publication_private.managed_image_origins_v1(p_attempt_id) g
 JOIN listing_publication_private.objects o ON o.slot_id=g.slot_id AND o.attempt_id=g.media_attempt_id AND o.kind='web'
 WHERE g.ordinal=p_ordinal;
 SELECT o.id INTO source_id FROM listing_publication_private.objects o
 WHERE o.slot_id=web_object.slot_id AND o.attempt_id=web_object.attempt_id AND o.kind='source';
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
