-- Reuse the existing private attempt allocator and account limits for both
-- initial publication and one-photo additions. Only this helper owns the limits.
CREATE FUNCTION listing_publication_private.allocate_managed_publication_attempt_v1(
 p_user uuid,p_identity uuid,p_request uuid,p_fingerprint bytea,p_payload jsonb,p_images jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE active_id uuid; policies jsonb; t timestamptz; reserved bigint; aid uuid; sid uuid; image record;
BEGIN
 active_id:=listing_publication_private.require_actor(p_user,p_identity);
 policies:=listing_publication_private.require_policies(); t:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_user
  AND state='open' AND expires_at>t)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_user
  AND created_at>t-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000'; END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.actor_user_id=p_user AND NOT listing_publication_private.multipart_object_fully_deleted(o.id);
 IF reserved+jsonb_array_length(p_images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000'; END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
  payload,policy_snapshot,created_at,expires_at)
 VALUES(p_user,active_id,p_request,p_fingerprint,p_payload,policies,t,t+interval '24 hours') RETURNING id INTO aid;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(p_images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(aid,image.ordinality-1,(image.value->>'client_file_id')::uuid,(image.value->>'byte_length')::integer,
   decode(image.value->>'sha256','hex')) RETURNING id INTO sid;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(aid,sid,'source','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/source.upload',26214400),
   (aid,sid,'web','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN aid;
END $f$;

-- Closed wrappers preserve the existing postgres policy/normalizer authority;
-- API roles receive no new access to those retained helpers or their tables.
CREATE FUNCTION listing_publication_private.normalize_managed_image_addition_v1(p_image jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN RETURN listing_publication_private.normalize_images(jsonb_build_array(p_image))->0; END $f$;
CREATE FUNCTION listing_publication_private.require_managed_image_policies_v1()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN RETURN listing_publication_private.require_policies(); END $f$;
CREATE FUNCTION listing_publication_private.managed_image_addition_journey_v1(
 p_user uuid,p_identity uuid,p_request uuid,p_close boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_close THEN RETURN public.cancel_my_listing_publication_journey_v2(p_user,p_identity,p_request); END IF;
 RETURN public.get_my_listing_publication_journey_v2(p_user,p_identity,p_request);
END $f$;

CREATE FUNCTION listing_publication_private.lock_managed_image_addition_parent_v1(
 p_user uuid,p_identity uuid,p_listing bigint,p_parent uuid,p_for_update boolean)
RETURNS text LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_managed_image_actor_v1(p_user,p_identity);
 IF p_listing IS NULL OR p_listing<1 OR p_parent IS NULL OR p_for_update IS NULL THEN
  RAISE EXCEPTION 'listing_images_command_invalid' USING ERRCODE='22023'; END IF;
 IF p_for_update THEN
  SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_parent AND identity_id=p_identity FOR UPDATE;
 ELSE SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_parent AND identity_id=p_identity FOR SHARE; END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501'; END IF;
 IF p_for_update THEN
  SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR UPDATE;
 ELSE SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR SHARE; END IF;
 IF NOT FOUND OR p.listing_id IS DISTINCT FROM p_listing THEN
  RAISE EXCEPTION 'listing_images_forbidden' USING ERRCODE='42501'; END IF;
 IF NOT((a.state='published' AND p.state='published' AND p.deleted_at IS NULL)
  OR (a.state='deleted' AND p.state='deleting' AND p.deleted_at IS NOT NULL)) THEN
  RAISE EXCEPTION 'listing_images_unavailable' USING ERRCODE='55000'; END IF;
 RETURN a.state;
END $f$;

CREATE FUNCTION listing_publication_private.managed_image_addition_status_v1(
 p_user uuid,p_identity uuid,p_listing bigint,p_parent uuid,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE parent_state text; a listing_publication_private.attempts%ROWTYPE; journey jsonb; gallery jsonb;
BEGIN
 IF p_request IS NULL OR p_request='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 parent_state:=listing_publication_private.lock_managed_image_addition_parent_v1(p_user,p_identity,p_listing,p_parent,false);
 SELECT * INTO a FROM listing_publication_private.attempts WHERE actor_user_id=p_user AND request_key=p_request FOR SHARE;
 IF FOUND AND (a.identity_id IS DISTINCT FROM p_identity OR NOT EXISTS(
  SELECT 1 FROM listing_publication_private.managed_image_additions_v1 WHERE attempt_id=a.id AND parent_attempt_id=p_parent)) THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 journey:=listing_publication_private.managed_image_addition_journey_v1(p_user,p_identity,p_request,false);
 IF parent_state='published' THEN
  gallery:=listing_publication_private.managed_image_gallery_projection_v1(
   listing_publication_private.lock_managed_listing_images_v1(p_user,p_identity,p_listing,p_parent,false),true);
 END IF;
 RETURN jsonb_build_object('schema_version',1,'listing_id',p_listing::text,'attempt_id',p_parent,'request_key',p_request,
  'snapshot',journey->'snapshot','receipt',listing_publication_private.managed_image_addition_receipt_v1(a.id),
  'intent_closed',(journey->>'intent_closed')::boolean OR parent_state='deleted','gallery',gallery);
END $f$;
