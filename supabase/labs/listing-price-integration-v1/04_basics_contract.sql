-- CLOSED LOCAL CANDIDATE. Not a migration and not an activated API.
-- Depends on the unchanged, previously tested listing-price-core-v1 lab.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_core_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'listing_basics_disposable_fixture_required';
  END IF;
END $gate$;

CREATE FUNCTION public.normalize_listing_basics_v1(p_basics jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE t text; d text; c text;
BEGIN
  IF p_basics IS NULL OR jsonb_typeof(p_basics) IS DISTINCT FROM 'object'
      OR octet_length(p_basics::text)>24000 THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
      OR jsonb_typeof(p_basics->'title') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'condition') NOT IN ('null','string') THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  -- Explicit ASCII whitespace contract, independent of client locale.
  t := btrim(regexp_replace(p_basics->>'title',E'[ \\t\\n\\r\\f\\v]+',' ','g'));
  d := btrim(p_basics->>'description',E' \t\n\r\f\013');
  c := p_basics->>'condition';
  IF char_length(t)<2 OR char_length(t)>140 OR char_length(p_basics->>'title')>1024 THEN
    RAISE EXCEPTION 'listing_basics_title_invalid' USING ERRCODE='22023';
  END IF;
  IF char_length(p_basics->>'description')>5000 THEN
    RAISE EXCEPTION 'listing_basics_description_invalid' USING ERRCODE='22023';
  END IF;
  IF c IS NOT NULL AND c NOT IN ('new','used','damaged') THEN
    RAISE EXCEPTION 'listing_basics_condition_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('title',t,'description',d,'condition',c);
END $fn$;

-- The expected baseline is RAW stored values, not normalized user input.
CREATE FUNCTION public.listing_basics_values_v1(p_row public.listings)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT jsonb_build_object('title',(p_row).title,'description',(p_row).description,'condition',(p_row).condition);
$fn$;

CREATE FUNCTION public.listing_basics_snapshot_v1(p_row public.listings)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
  SELECT jsonb_build_object('schema_version',1,'content_type','listing',
    'listing_id',(p_row).id::text,'identity_id',(p_row).identity_id::text,
    'basics',public.listing_basics_values_v1(p_row),
    'price',public.listing_price_snapshot_v1((p_row).price_kind,(p_row).price_amount,
      (p_row).currency,(p_row).price_revision,(p_row).price));
$fn$;

-- Legacy owner-search text only. Public search retains its frozen allowlisted helper.
-- Category and details come from the locked DB row, NEVER from stale form metadata.
CREATE FUNCTION public.listing_basics_search_text_v1(p_row public.listings)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT btrim(regexp_replace(lower(concat_ws(' ',(p_row).title,(p_row).description,
    (p_row).category,(p_row).subcategory,(p_row).condition,
    CASE WHEN jsonb_typeof((p_row).details)='object' THEN
      (SELECT string_agg(value,' ' ORDER BY key) FROM jsonb_each_text((p_row).details))
    ELSE '' END)),E'[ \\t\\n\\r\\f\\v]+',' ','g'));
$fn$;

REVOKE ALL ON FUNCTION public.normalize_listing_basics_v1(jsonb),
  public.listing_basics_values_v1(public.listings),public.listing_basics_snapshot_v1(public.listings),
  public.listing_basics_search_text_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;
