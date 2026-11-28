-- ASUKOHT-1B: one read-only public projection of a confirmed locality/region.
-- Existing public/owner RPCs, tables, coordinates, and stored user content remain unchanged.
CREATE FUNCTION public.get_public_profile_location_v1(p_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $public_profile_location$
DECLARE v_slug text; v_public record; v_location jsonb;
BEGIN
 IF p_identity_id IS NULL THEN RETURN NULL; END IF;
 SELECT p.slug INTO v_slug FROM public.identity_profiles p WHERE p.identity_id=p_identity_id;
 IF v_slug IS NULL OR btrim(v_slug)='' THEN RETURN NULL; END IF;

 -- The canonical reader owns account, identity, business and viewer-block
 -- eligibility. Filtering its selected result cannot revive a legacy alias.
 SELECT s.* INTO v_public FROM public.get_store_by_slug(v_slug) s WHERE s.identity_id=p_identity_id;
 IF NOT FOUND THEN RETURN NULL; END IF;

 IF v_public.location_visibility IN ('city','exact') THEN
  SELECT l.location INTO v_location FROM profile_location_private.profile_locations l
   WHERE l.identity_id=p_identity_id
    AND l.location->>'country_name'=v_public.country
    AND l.location->>'place_name'=v_public.city
    AND profile_location_private.valid_location(l.location);
 END IF;

 -- This point is the selected locality/region for either identity type.
 -- Legacy exact lat/lng and the optional public address never enter this map.
 RETURN jsonb_build_object('identity_id',p_identity_id,'location',
  CASE WHEN v_location IS NULL THEN NULL ELSE jsonb_build_object(
   'country_code',v_location->'country_code','country_name',v_location->'country_name',
   'place_name',v_location->'place_name','region_name',v_location->'region_name',
   'latitude',v_location->'latitude','longitude',v_location->'longitude',
   'precision',v_location->'precision') END);
END;
$public_profile_location$;
REVOKE ALL ON FUNCTION public.get_public_profile_location_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_location_v1(uuid) TO anon,authenticated;

-- PostgREST receives the schema notification only after the release commits.
NOTIFY pgrst, 'reload schema';
