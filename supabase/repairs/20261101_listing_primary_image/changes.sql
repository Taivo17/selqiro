-- Additive presentation-only capability. Execute through guarded apply.sql.
-- Immutable publication slots, media URLs, object receipts and cleanup stay unchanged.
CREATE TABLE listing_publication_private.managed_image_presentations_v1 (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.publications(attempt_id) ON DELETE RESTRICT,
 revision bigint NOT NULL CHECK(revision BETWEEN 1 AND 9223372036854775807)
);
ALTER TABLE listing_publication_private.managed_image_presentations_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.managed_image_presentations_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.managed_image_presentations_v1 TO selqiro_listing_final_writer_v1;
CREATE POLICY managed_image_presentation_writer ON listing_publication_private.managed_image_presentations_v1
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_managed_image_presentation_v1()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'listing_images_presentation_immutable' USING ERRCODE='42501';
 END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>1 THEN RAISE EXCEPTION 'listing_images_presentation_revision_invalid' USING ERRCODE='55000'; END IF;
 ELSIF NEW.attempt_id IS DISTINCT FROM OLD.attempt_id OR OLD.revision=9223372036854775807
  OR NEW.revision IS DISTINCT FROM OLD.revision+1 THEN
  RAISE EXCEPTION 'listing_images_presentation_revision_invalid' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_managed_image_presentation_v1 BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.managed_image_presentations_v1 FOR EACH ROW
 EXECUTE FUNCTION listing_publication_private.protect_managed_image_presentation_v1();
CREATE TRIGGER protect_managed_image_presentation_truncate_v1 BEFORE TRUNCATE
 ON listing_publication_private.managed_image_presentations_v1 FOR EACH STATEMENT
 EXECUTE FUNCTION listing_publication_private.protect_managed_image_presentation_v1();

-- Keep the existing hosted actor/active-identity/membership locks and allowlist.
-- The postgres boundary avoids evaluating legacy recursive identity RLS as the
-- NOLOGIN final writer. It grants no table access to any browser/API role.
CREATE FUNCTION listing_publication_private.require_managed_image_actor_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RETURN listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
END $f$;
ALTER FUNCTION listing_publication_private.require_managed_image_actor_v1(uuid,uuid) OWNER TO postgres;

-- validate_web_intent delegates to a closed public helper in the hosted release.
-- Reuse that exact validator under its existing postgres authority rather than
-- widening any retained helper's ACL for the final writer or API roles.
CREATE FUNCTION listing_publication_private.validate_managed_image_intent_v1(p_intent jsonb,p_slot uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.validate_web_intent(p_intent,p_slot);
END $f$;
ALTER FUNCTION listing_publication_private.validate_managed_image_intent_v1(jsonb,uuid) OWNER TO postgres;

CREATE FUNCTION listing_publication_private.lock_managed_listing_images_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,p_for_update boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
 p listing_publication_private.publications%ROWTYPE;
 l public.listings%ROWTYPE;
 r record; n integer; image_count integer; primary_count integer; primary_url text;
 images jsonb:='[]'::jsonb; revision bigint;
BEGIN
 PERFORM listing_publication_private.require_managed_image_actor_v1(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id IS NULL OR p_listing_id<1 OR p_attempt_id IS NULL OR p_for_update IS NULL THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023';
 END IF;
 -- Same serialization order as terminal deletion: actor, attempt, outcome,
 -- listing, then its presentation rows. Shared reads never create a revision.
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
  RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501';
 END IF;
 IF a.state<>'published' OR p.state<>'published' OR p.deleted_at IS NOT NULL THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000';
 END IF;
 IF p_for_update THEN
  SELECT * INTO l FROM public.listings WHERE id=p_listing_id FOR UPDATE;
 ELSE
  SELECT * INTO l FROM public.listings WHERE id=p_listing_id FOR SHARE;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 IF l.identity_id IS DISTINCT FROM a.identity_id OR l.user_id IS DISTINCT FROM a.actor_user_id
  OR l.created_by_user_id IS DISTINCT FROM a.actor_user_id THEN
  RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_for_update THEN
  PERFORM 1 FROM public.listing_images WHERE listing_id=l.id ORDER BY id FOR UPDATE;
 ELSE
  PERFORM 1 FROM public.listing_images WHERE listing_id=l.id ORDER BY id FOR SHARE;
 END IF;
 SELECT count(*) INTO n FROM listing_publication_private.slots WHERE attempt_id=a.id;
 SELECT count(*),count(*) FILTER(WHERE is_primary),max(original_url) FILTER(WHERE is_primary)
  INTO image_count,primary_count,primary_url FROM public.listing_images WHERE listing_id=l.id;
 IF n>10 OR image_count<>n OR (n=0 AND (primary_count<>0 OR l.image IS NOT NULL))
  OR (n>0 AND (primary_count<>1 OR l.image IS DISTINCT FROM primary_url)) THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000';
 END IF;
 FOR r IN
  SELECT s.id AS slot_id,s.ordinal,
   '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text AS canonical_url,
   o.id AS object_id,o.bucket_id,o.object_path,
   w.id AS web_id,w.state AS web_state,w.ready_id,w.ready_at,w.intent,
   i.id AS image_id,i.user_id AS image_user_id,i.original_url,i.medium_url,i.thumb_url,i.is_primary
  FROM listing_publication_private.slots s
  LEFT JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
  LEFT JOIN public.listing_images i ON i.listing_id=l.id AND i.sort_order=s.ordinal
  WHERE s.attempt_id=a.id ORDER BY s.ordinal
 LOOP
  IF r.ordinal<>jsonb_array_length(images) OR r.image_id IS NULL OR r.image_user_id IS DISTINCT FROM a.actor_user_id
   OR r.original_url IS DISTINCT FROM r.canonical_url OR r.medium_url IS DISTINCT FROM r.canonical_url
   OR r.thumb_url IS DISTINCT FROM r.canonical_url OR r.is_primary IS NULL
   OR r.object_id IS NULL OR r.bucket_id IS DISTINCT FROM 'listing-publication-private'
   OR r.object_path IS DISTINCT FROM ('v1/'||a.id::text||'/'||r.slot_id::text||'/web-v1.webp')
   OR r.web_id IS NULL OR r.web_state IS DISTINCT FROM 'ready' OR r.ready_id IS NULL OR r.ready_at IS NULL
   OR EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=r.object_id) THEN
   RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000';
  END IF;
  BEGIN
   PERFORM listing_publication_private.validate_managed_image_intent_v1(r.intent,r.slot_id);
  EXCEPTION WHEN SQLSTATE '22023' THEN
   RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000';
  END;
  images:=images||jsonb_build_array(jsonb_build_object('ordinal',r.ordinal,'url',r.canonical_url,'is_primary',r.is_primary));
 END LOOP;
 IF jsonb_array_length(images)<>n THEN RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 SELECT x.revision INTO revision FROM listing_publication_private.managed_image_presentations_v1 x WHERE x.attempt_id=a.id;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',a.identity_id,
  'listing_id',l.id::text,'attempt_id',a.id,'revision',coalesce(revision,0)::text,'images',images);
END $f$;

CREATE FUNCTION public.get_my_managed_listing_images_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 RETURN listing_publication_private.lock_managed_listing_images_v1(
  p_expected_user_id,p_expected_identity_id,p_listing_id,p_attempt_id,false);
END $f$;

CREATE FUNCTION public.set_my_managed_listing_primary_image_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id bigint,p_attempt_id uuid,
 p_expected_revision text,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE gallery jsonb; target jsonb; previous_revision bigint; next_revision bigint; affected integer;
BEGIN
 IF p_expected_revision IS NULL OR p_expected_revision !~ '^(0|[1-9][0-9]{0,18})$'
  OR p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN
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

-- Ownership changes require CREATE only during this transaction. Guarded apply
-- asserts that it was absent and verifies that all existing ACLs are restored.
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.set_my_managed_listing_primary_image_v1(uuid,uuid,bigint,uuid,text,integer) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION
 listing_publication_private.protect_managed_image_presentation_v1(),
 listing_publication_private.require_managed_image_actor_v1(uuid,uuid),
 listing_publication_private.validate_managed_image_intent_v1(jsonb,uuid),
 listing_publication_private.lock_managed_listing_images_v1(uuid,uuid,bigint,uuid,boolean),
 public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid),
 public.set_my_managed_listing_primary_image_v1(uuid,uuid,bigint,uuid,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION
 listing_publication_private.protect_managed_image_presentation_v1(),
 listing_publication_private.require_managed_image_actor_v1(uuid,uuid),
 listing_publication_private.validate_managed_image_intent_v1(jsonb,uuid),
 listing_publication_private.lock_managed_listing_images_v1(uuid,uuid,bigint,uuid,boolean)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.get_my_managed_listing_images_v1(uuid,uuid,bigint,uuid),
 public.set_my_managed_listing_primary_image_v1(uuid,uuid,bigint,uuid,text,integer) TO authenticated;
COMMENT ON TABLE listing_publication_private.managed_image_presentations_v1 IS
 'Published gallery presentation revision only. Absence means 0; immutable publication media remains untouched.';
