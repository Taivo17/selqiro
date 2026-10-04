-- LOCAL LAB CANDIDATE ONLY. Not a deployment migration.
DO $gate$ BEGIN
  IF current_database() NOT IN ('selqiro_price_core_fixture','selqiro_price_race_fixture')
     OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'price_core_disposable_fixture_required';
  END IF;
END $gate$;

ALTER TABLE public.listings
  ADD COLUMN price_kind text,
  ADD COLUMN currency text,
  ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;

-- Generated from currencies.v1.json; registry parity is checked by the runner.
CREATE FUNCTION public.listing_price_currency_scale_v1(p_currency text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_currency
    WHEN 'AUD' THEN 2 WHEN 'BHD' THEN 3 WHEN 'CAD' THEN 2 WHEN 'CHF' THEN 2
    WHEN 'CZK' THEN 2 WHEN 'DKK' THEN 2 WHEN 'EUR' THEN 2 WHEN 'GBP' THEN 2
    WHEN 'JPY' THEN 0 WHEN 'KWD' THEN 3 WHEN 'NOK' THEN 2 WHEN 'NZD' THEN 2
    WHEN 'PLN' THEN 2 WHEN 'SEK' THEN 2 WHEN 'TND' THEN 3 WHEN 'USD' THEN 2
    ELSE NULL END;
$fn$;

CREATE FUNCTION public.normalize_listing_price_v1(p_price jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE k text; a text; c text; digits integer;
BEGIN
  IF p_price IS NULL OR jsonb_typeof(p_price) IS DISTINCT FROM 'object'
     OR octet_length(p_price::text) > 256 THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_price) AS keys(key))
      IS DISTINCT FROM ARRAY['amount','currency','kind']::text[]
      OR jsonb_typeof(p_price->'kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  k := p_price->>'kind';
  IF k NOT IN ('fixed','free','negotiable','unspecified') THEN
    RAISE EXCEPTION 'listing_price_kind_invalid' USING ERRCODE='22023';
  END IF;
  IF k <> 'fixed' THEN
    IF p_price->'amount' IS DISTINCT FROM 'null'::jsonb
       OR p_price->'currency' IS DISTINCT FROM 'null'::jsonb THEN
      RAISE EXCEPTION 'listing_price_nonfixed_values_forbidden' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('kind',k,'amount',NULL,'currency',NULL);
  END IF;
  IF jsonb_typeof(p_price->'amount') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_price->'currency') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_string_values_required' USING ERRCODE='22023';
  END IF;
  a := p_price->>'amount'; c := p_price->>'currency';
  digits := public.listing_price_currency_scale_v1(c);
  IF digits IS NULL THEN
    RAISE EXCEPTION 'listing_price_currency_unsupported' USING ERRCODE='22023';
  END IF;
  -- ASCII, no exponent/grouping/sign, < 10^18 units. Reject rather than round.
  IF char_length(a) > 22 OR a !~ '^(0|[1-9][0-9]{0,17})([.][0-9]{1,3})?$'
      OR (position('.' IN a)>0 AND char_length(split_part(a,'.',2))>digits) THEN
    RAISE EXCEPTION 'listing_price_amount_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('kind',k,'amount',trim_scale(a::numeric)::text,'currency',c);
END $fn$;

CREATE FUNCTION public.listing_price_legacy_label_v1(p_price jsonb)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_price->>'kind'
    WHEN 'fixed' THEN (p_price->>'amount') || ' ' || (p_price->>'currency')
    WHEN 'free' THEN 'Tasuta'
    WHEN 'negotiable' THEN 'Hind kokkuleppel'
    WHEN 'unspecified' THEN NULL END;
$fn$;

CREATE FUNCTION public.listing_price_tuple_valid_v1(k text,a numeric,c text,r bigint,legacy text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb;
BEGIN
  IF r IS NULL OR r < 0 THEN RETURN false; END IF;
  IF k IS NULL THEN RETURN c IS NULL; END IF;
  IF r < 1 THEN RETURN false; END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',k,'amount',a::text,'currency',c));
  RETURN legacy IS NOT DISTINCT FROM public.listing_price_legacy_label_v1(normalized)
     AND a::text IS NOT DISTINCT FROM normalized->>'amount';
EXCEPTION WHEN SQLSTATE '22023' THEN RETURN false;
END $fn$;

ALTER TABLE public.listings ADD CONSTRAINT listings_price_tuple_v1_check CHECK (
  public.listing_price_tuple_valid_v1(price_kind,price_amount,currency,price_revision,price) IS TRUE
);

-- Only a pure value projection: never reads tables or interprets legacy text as money.
CREATE FUNCTION public.listing_price_snapshot_v1(k text,a numeric,c text,r bigint,legacy text)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $fn$
  SELECT jsonb_build_object('version',1,'kind',k,'amount',CASE WHEN k IS NULL THEN NULL ELSE a::text END,
    'currency',c,'revision',r::text,'legacy_text',CASE WHEN k IS NULL THEN legacy ELSE NULL END);
$fn$;

REVOKE ALL ON FUNCTION public.listing_price_currency_scale_v1(text),
 public.normalize_listing_price_v1(jsonb),public.listing_price_legacy_label_v1(jsonb),
 public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
 public.listing_price_snapshot_v1(text,numeric,text,bigint,text)
 FROM PUBLIC,anon,authenticated,service_role;
-- Pure functions only: caller-provided values, no application row access.
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text),
 public.normalize_listing_price_v1(jsonb),public.listing_price_legacy_label_v1(jsonb),
 public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
 public.listing_price_snapshot_v1(text,numeric,text,bigint,text)
 TO anon,authenticated,service_role;
