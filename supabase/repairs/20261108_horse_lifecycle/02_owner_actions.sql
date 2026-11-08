-- The existing edit revision advances on every canonical horse UPDATE. These
-- owner actions use that same revision, so a prepared content edit cannot undo
-- a later pause, sale or renewal, and an uncertain write is never replayed.
CREATE FUNCTION horse_publication_private.lifecycle_snapshot(
 p_offer uuid,p_user uuid,p_identity uuid,p_changed boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE h public.horse_offers%ROWTYPE; deadline timestamptz;
BEGIN
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer AND identity_id=p_identity;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 deadline:=horse_publication_private.effective_active_until(h);
 IF deadline IS NOT NULL AND NOT isfinite(deadline) THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','horse_offer','content_id',h.id,
  'actor_user_id',p_user,'identity_id',h.identity_id,'source_status',h.status,
  'status',CASE h.status WHEN 'published' THEN 'active' WHEN 'paused' THEN 'paused' WHEN 'closed' THEN 'sold' ELSE NULL END,
  'active_until',deadline,'edit_revision',h.edit_revision::text,'changed',p_changed);
END $f$;

CREATE FUNCTION public.get_my_horse_offer_lifecycle_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_offer_id IS NULL THEN RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 RETURN horse_publication_private.lifecycle_snapshot(p_offer_id,p_expected_user_id,p_expected_identity_id,false);
END $f$;

CREATE FUNCTION horse_publication_private.lock_lifecycle(
 p_user uuid,p_identity uuid,p_offer uuid,p_revision bigint,p_status text,p_until timestamptz)
RETURNS public.horse_offers LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE;
BEGIN
 -- Profile, identity and membership lock order is shared with publication.
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 IF p_offer IS NULL OR p_revision IS NULL OR p_revision<1 OR p_status IS NULL
  OR p_status NOT IN('published','paused','closed') OR p_until IS NULL OR NOT isfinite(p_until) THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 IF h.edit_revision IS DISTINCT FROM p_revision OR h.status IS DISTINCT FROM p_status
  OR horse_publication_private.effective_active_until(h) IS DISTINCT FROM p_until THEN
  RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
 IF h.status NOT IN('published','paused','closed')
  OR NOT horse_publication_private.has_current_publication(h.id) THEN
  RAISE EXCEPTION 'horse_offer_activity_unavailable' USING ERRCODE='55000'; END IF;
 RETURN h;
END $f$;

CREATE FUNCTION public.set_my_horse_offer_status_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid,
 p_expected_revision bigint,p_expected_status text,p_expected_active_until timestamptz,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE; target text; changed boolean:=false; t timestamptz;
BEGIN
 IF p_status IS NULL OR p_status NOT IN('active','paused','sold') THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 h:=horse_publication_private.lock_lifecycle(p_expected_user_id,p_expected_identity_id,p_offer_id,
  p_expected_revision,p_expected_status,p_expected_active_until);
 target:=CASE p_status WHEN 'active' THEN 'published' WHEN 'paused' THEN 'paused' WHEN 'sold' THEN 'closed' END;
 IF h.status IS DISTINCT FROM target THEN
  -- No duration, content, gallery, policy acceptance or publication event changes.
  t:=clock_timestamp();
  UPDATE public.horse_offers SET status=target,
   paused_at=CASE WHEN target='paused' THEN t ELSE NULL END,
   closed_at=CASE WHEN target='closed' THEN t ELSE NULL END,updated_by_user_id=p_expected_user_id
   WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
  changed:=true;
 END IF;
 RETURN horse_publication_private.lifecycle_snapshot(h.id,p_expected_user_id,p_expected_identity_id,changed);
END $f$;

CREATE FUNCTION public.renew_my_horse_offer_activity_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid,
 p_expected_revision bigint,p_expected_status text,p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE; deadline timestamptz; changed boolean:=false;
BEGIN
 h:=horse_publication_private.lock_lifecycle(p_expected_user_id,p_expected_identity_id,p_offer_id,
  p_expected_revision,p_expected_status,p_expected_active_until);
 IF h.status<>'published' THEN
  RAISE EXCEPTION 'horse_offer_activity_active_status_required' USING ERRCODE='55000'; END IF;
 -- Explicit free renewal, using server time. Status selection and editing never
 -- run this action. Preserve a longer existing period, as ordinary listings do.
 deadline:=clock_timestamp()+interval '2160 hours';
 IF horse_publication_private.effective_active_until(h)<deadline THEN
  UPDATE public.horse_offers SET active_until=deadline,updated_by_user_id=p_expected_user_id
   WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
  changed:=true;
 END IF;
 RETURN horse_publication_private.lifecycle_snapshot(h.id,p_expected_user_id,p_expected_identity_id,changed);
END $f$;
