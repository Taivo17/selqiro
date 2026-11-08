-- A saved factual confirmation belongs to one canonical offer and one person.
-- Policy-version acceptance remains a separate, current-version requirement.
-- This helper is private; only actor-bound owner commands expose its descriptor.
CREATE FUNCTION horse_publication_private.reusable_confirmation(p_offer uuid,p_user uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE h public.horse_offers%ROWTYPE; current_event public.horse_offer_publication_events%ROWTYPE;
 original_event public.horse_offer_publication_events%ROWTYPE; original_id uuid; current_facts jsonb; original_facts jsonb;
BEGIN
 IF p_offer IS NULL OR p_user IS NULL THEN RETURN NULL; END IF;
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer;
 IF NOT FOUND OR h.status NOT IN('published','paused','closed')
  OR NOT horse_publication_private.has_current_publication(h.id) THEN RETURN NULL; END IF;
 SELECT * INTO current_event FROM public.horse_offer_publication_events WHERE id=h.current_publication_event_id;
 IF NOT FOUND OR current_event.actor_user_id IS DISTINCT FROM p_user
  OR current_event.horse_offer_id IS DISTINCT FROM h.id OR current_event.identity_id IS DISTINCT FROM h.identity_id
  OR current_event.content_snapshot->>'offer_type' IS DISTINCT FROM h.offer_type THEN RETURN NULL; END IF;
 BEGIN
  current_facts:=horse_publication_private.confirmations(h.offer_type,
   current_event.confirmation_snapshot-'reused_from_publication_event_id');
 EXCEPTION WHEN invalid_parameter_value THEN RETURN NULL;
 END;
 IF current_event.confirmation_snapshot ? 'reused_from_publication_event_id' THEN
  IF jsonb_typeof(current_event.confirmation_snapshot->'reused_from_publication_event_id') IS DISTINCT FROM 'string'
   OR current_event.confirmation_snapshot->>'reused_from_publication_event_id' !~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RETURN NULL; END IF;
  original_id:=(current_event.confirmation_snapshot->>'reused_from_publication_event_id')::uuid;
 ELSE original_id:=current_event.id;
 END IF;
 SELECT * INTO original_event FROM public.horse_offer_publication_events WHERE id=original_id;
 IF NOT FOUND OR original_event.horse_offer_id IS DISTINCT FROM h.id
  OR original_event.identity_id IS DISTINCT FROM h.identity_id OR original_event.actor_user_id IS DISTINCT FROM p_user
  OR original_event.decision<>'published' OR NOT isfinite(original_event.created_at)
  OR original_event.content_snapshot->>'offer_type' IS DISTINCT FROM h.offer_type
  OR original_event.content_hash IS DISTINCT FROM encode(sha256(convert_to(original_event.content_snapshot::text,'UTF8')),'hex')
  OR original_event.confirmation_snapshot ? 'reused_from_publication_event_id' THEN RETURN NULL; END IF;
 BEGIN
  original_facts:=horse_publication_private.confirmations(h.offer_type,original_event.confirmation_snapshot);
 EXCEPTION WHEN invalid_parameter_value THEN RETURN NULL;
 END;
 IF original_facts IS DISTINCT FROM current_facts THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('schema_version',1,'offer_id',h.id,'identity_id',h.identity_id,'actor_user_id',p_user,
  'offer_type',h.offer_type,'publication_event_id',original_id,
  'confirmed_at',to_char(original_event.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_horse_offer_publication_snapshot_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 -- Keep content/revision and saved evidence from the same locked owner row.
 PERFORM 1 FROM public.horse_offers WHERE id=p_offer_id AND identity_id=p_expected_identity_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 SELECT s.offer||jsonb_build_object('edit_revision',s.edit_revision) INTO result
 FROM public.get_my_horse_offer_edit_snapshot_v1(p_offer_id) s;
 IF result IS NULL OR result->>'identity_id' IS DISTINCT FROM p_expected_identity_id::text THEN
  RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 result:=jsonb_set(result,'{images}',coalesce((SELECT jsonb_agg(
  x||jsonb_build_object('url',replace(x->>'url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'original_url',replace(x->>'original_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'medium_url',replace(x->>'medium_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'thumb_url',replace(x->>'thumb_url','/api/v2/horse-media/','/api/v2/horse-owner-media/')) ORDER BY ord)
  FROM jsonb_array_elements(result->'images') WITH ORDINALITY e(x,ord)),'[]'::jsonb));
 result:=result||jsonb_build_object('image_url',replace(result->>'image_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'));
 result:=result||jsonb_build_object('saved_confirmation',
  horse_publication_private.reusable_confirmation(p_offer_id,p_expected_user_id));
 RETURN result;
END $f$;
