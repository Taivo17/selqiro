-- CLOSED DISPOSABLE LAB ONLY; not an applied migration or API grant.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_core_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'owner_reader_disposable_fixture_required';
  END IF;
END $gate$;

-- Keep the existing EE budget/area whitelist as the sole eligibility authority.
-- Convert its already-validated numeric budget to text BEFORE JSON leaves PostgreSQL.
CREATE FUNCTION public.project_horse_wanted_owner_summary_v2(p_details jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
  WITH source AS MATERIALIZED (
    SELECT public.project_horse_wanted_owner_summary_v1(p_details) AS value
  )
  SELECT jsonb_build_object('version',2,
    'budget', CASE WHEN value -> 'budget' = 'null'::jsonb THEN NULL::jsonb
      ELSE jsonb_build_object('mode',value #>> '{budget,mode}',
        'amount',CASE WHEN value #>> '{budget,mode}' = 'maximum'
          THEN trim_scale((value #>> '{budget,amount}')::numeric)::text ELSE NULL END,
        'currency',value #>> '{budget,currency}') END,
    'search_area',value -> 'search_area')
  FROM source;
$fn$;
REVOKE ALL ON FUNCTION public.project_horse_wanted_owner_summary_v2(jsonb)
  FROM PUBLIC,anon,authenticated,service_role;

-- Horse offer prices are NOT the ordinary listing money contract.
-- 'from' is meaningful for lease/co-rider/sale; wanted must use its budget section.
CREATE FUNCTION public.horse_owner_price_read_v1(v text,k text,a numeric,c text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
BEGIN
  IF (c = 'EUR' AND (
       (v = 'free_transfer' AND k = 'free' AND a IS NULL)
       OR (v IN ('sale','lease','co_rider') AND (
         (k = 'contact' AND a IS NULL)
         OR (k IN ('fixed','from') AND a >= 0 AND a <= 9999999999.99
           AND a = round(a,2))
       ))
     )) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'owner_horse_price_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('version',1,'kind',k,
    'amount',CASE WHEN a IS NOT NULL THEN trim_scale(a)::text ELSE NULL END,
    'currency',c);
END;
$fn$;
REVOKE ALL ON FUNCTION public.horse_owner_price_read_v1(text,text,numeric,text)
  FROM PUBLIC,anon,authenticated,service_role;
