-- CLOSED LOCAL CANDIDATE. Fixed bounded row-input contract, no external calls.
CREATE FUNCTION public.require_listing_create_keys_v1(p_value jsonb,p_keys text[])
RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp
AS $fn$
BEGIN
 IF p_value IS NULL OR jsonb_typeof(p_value) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_value) k(key))
    IS DISTINCT FROM (SELECT array_agg(key ORDER BY key) FROM unnest(p_keys) k(key)) THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
END $fn$;

CREATE FUNCTION public.normalize_listing_create_location_v1(p_value jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE country_value text; city_value text; lat text; lng text;
BEGIN
 PERFORM public.require_listing_create_keys_v1(p_value,ARRAY['country','city','latitude','longitude']);
 IF jsonb_typeof(p_value->'country') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_value->'city') IS DISTINCT FROM 'string'
    OR char_length(p_value->>'country')>120 OR char_length(p_value->>'city')>160 THEN
  RAISE EXCEPTION 'listing_create_location_invalid' USING ERRCODE='22023';
 END IF;
 country_value:=btrim(p_value->>'country'); city_value:=btrim(p_value->>'city');
 lat:=p_value->>'latitude'; lng:=p_value->>'longitude';
 IF (lat IS NULL) IS DISTINCT FROM (lng IS NULL) THEN
  RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
 END IF;
 IF lat IS NOT NULL THEN
  IF jsonb_typeof(p_value->'latitude') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_value->'longitude') IS DISTINCT FROM 'string'
     OR char_length(lat)>12 OR char_length(lng)>12
     OR lat !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$'
     OR lng !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$' THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  IF abs(lat::numeric)>90 OR abs(lng::numeric)>180 THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  lat:=trim_scale(lat::numeric)::text; lng:=trim_scale(lng::numeric)::text;
 END IF;
 RETURN jsonb_build_object('country',country_value,'city',city_value,'latitude',lat,'longitude',lng);
END $fn$;

CREATE FUNCTION public.normalize_listing_creation_v1(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE basics_value jsonb; price_value jsonb; location_value jsonb; attrs jsonb:='{}';
  e record; lang text;
BEGIN
 IF p_input IS NULL OR octet_length(p_input::text)>65536 THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 PERFORM public.require_listing_create_keys_v1(p_input,
   ARRAY['basics','price','category_path','location','attributes','details','language']);
 basics_value:=public.normalize_listing_basics_v1(p_input->'basics');
 IF basics_value->>'description'='' OR basics_value->>'condition' IS NULL THEN
  RAISE EXCEPTION 'listing_create_basics_required' USING ERRCODE='22023';
 END IF;
 price_value:=public.normalize_listing_price_v1(p_input->'price');
 IF public.listing_create_category_path_valid_v1(p_input->'category_path') IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_create_category_invalid' USING ERRCODE='22023';
 END IF;
 location_value:=public.normalize_listing_create_location_v1(p_input->'location');
 PERFORM public.require_listing_create_keys_v1(p_input->'attributes',
  ARRAY['manufacturer','part_number','oem_number','vehicle_brand','vehicle_model','vehicle_year','engine']);
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'attributes') LOOP
  IF jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>
      (CASE WHEN e.key='vehicle_year' THEN 20 ELSE 160 END) THEN
   RAISE EXCEPTION 'listing_create_attributes_invalid' USING ERRCODE='22023';
  END IF;
  attrs:=attrs||jsonb_build_object(e.key,btrim(e.value #>> '{}'));
 END LOOP;
 IF jsonb_typeof(p_input->'details') IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_input->'details'))>64 THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'details') LOOP
  IF e.key !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' OR e.key IN
    ('constructor','prototype','detailCategory','manufacturer','partNumber','oemNumber',
     'vehicleBrand','vehicleModel','vehicleYear','engine')
     OR jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>1000 THEN
   RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF jsonb_typeof(p_input->'language') IS DISTINCT FROM 'string' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 lang:=lower(btrim(p_input->>'language'));
 IF char_length(p_input->>'language')>35 OR lang !~ '^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 -- Versioned canonical form. Preserve detail text; no translation or unit conversion.
 RETURN jsonb_build_object('version',1,'basics',basics_value,'price',price_value,
  'category_path',p_input->'category_path','location',location_value,'attributes',attrs,
  'details',p_input->'details','language',lang);
END $fn$;

CREATE FUNCTION public.listing_creation_fingerprint_v1(p_normalized jsonb)
RETURNS bytea LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path=pg_catalog,pg_temp
AS $fn$
 SELECT sha256(convert_to('selqiro-listing-creation-v1:'||p_normalized::text,'UTF8'));
$fn$;
REVOKE ALL ON FUNCTION public.require_listing_create_keys_v1(jsonb,text[]),
 public.normalize_listing_create_location_v1(jsonb),public.normalize_listing_creation_v1(jsonb),
 public.listing_creation_fingerprint_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
