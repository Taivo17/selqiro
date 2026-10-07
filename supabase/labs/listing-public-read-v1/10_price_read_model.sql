-- CLOSED LOCAL READER CANDIDATE. Not a migration; no stored values are modified.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_core_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'listing_reader_disposable_fixture_required';
  END IF;
END $gate$;

-- Public value object: exact scalar input only, no queries and no management revision.
-- Legacy numeric fallback is separate, NEVER promoted to a verified kind/currency.
CREATE FUNCTION public.listing_price_read_model_v1(
  k text, a numeric, c text, r bigint, legacy text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
BEGIN
  IF public.listing_price_tuple_valid_v1(k,a,c,r,legacy) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_read_price_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('version',1,'kind',k,
    'amount',CASE WHEN k IS NULL THEN NULL ELSE a::text END,
    'currency',c,'legacy_text',CASE WHEN k IS NULL THEN legacy ELSE NULL END,
    'legacy_amount',CASE WHEN k IS NULL AND a >= 0
      AND a::text NOT IN ('NaN','Infinity','-Infinity') THEN a::text ELSE NULL END);
END $fn$;
REVOKE ALL ON FUNCTION public.listing_price_read_model_v1(text,numeric,text,bigint,text)
  FROM PUBLIC,anon,authenticated,service_role;
