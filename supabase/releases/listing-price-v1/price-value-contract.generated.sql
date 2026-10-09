-- GENERATED frozen release INPUT fragment, NOT a migration or deployment permission.
-- Registry SHA256: bdb245baa6e395dd95e6f83559eeccd8f0649803eb59df8614ce2a9e7c94aafc
-- Retained normalizer SHA256: 1a703a5757cbdc7648d881db2a3af2234b891db855d4789bd44b5f1d36b33d45
-- First installation only; no replacement of a live IMMUTABLE function.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_input_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'price_input_disposable_fixture_required';
  END IF;
END $gate$;

CREATE FUNCTION public.listing_price_currency_scale_v1(p_currency text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_currency
    WHEN 'AED' THEN 2
    WHEN 'AFN' THEN 2
    WHEN 'ALL' THEN 2
    WHEN 'AMD' THEN 2
    WHEN 'AOA' THEN 2
    WHEN 'ARS' THEN 2
    WHEN 'AUD' THEN 2
    WHEN 'AWG' THEN 2
    WHEN 'AZN' THEN 2
    WHEN 'BAM' THEN 2
    WHEN 'BBD' THEN 2
    WHEN 'BDT' THEN 2
    WHEN 'BHD' THEN 3
    WHEN 'BIF' THEN 0
    WHEN 'BMD' THEN 2
    WHEN 'BND' THEN 2
    WHEN 'BOB' THEN 2
    WHEN 'BRL' THEN 2
    WHEN 'BSD' THEN 2
    WHEN 'BTN' THEN 2
    WHEN 'BWP' THEN 2
    WHEN 'BYN' THEN 2
    WHEN 'BZD' THEN 2
    WHEN 'CAD' THEN 2
    WHEN 'CDF' THEN 2
    WHEN 'CHF' THEN 2
    WHEN 'CLP' THEN 0
    WHEN 'CNY' THEN 2
    WHEN 'COP' THEN 2
    WHEN 'CRC' THEN 2
    WHEN 'CUP' THEN 2
    WHEN 'CVE' THEN 2
    WHEN 'CZK' THEN 2
    WHEN 'DJF' THEN 0
    WHEN 'DKK' THEN 2
    WHEN 'DOP' THEN 2
    WHEN 'DZD' THEN 2
    WHEN 'EGP' THEN 2
    WHEN 'ERN' THEN 2
    WHEN 'ETB' THEN 2
    WHEN 'EUR' THEN 2
    WHEN 'FJD' THEN 2
    WHEN 'FKP' THEN 2
    WHEN 'GBP' THEN 2
    WHEN 'GEL' THEN 2
    WHEN 'GHS' THEN 2
    WHEN 'GIP' THEN 2
    WHEN 'GMD' THEN 2
    WHEN 'GNF' THEN 0
    WHEN 'GTQ' THEN 2
    WHEN 'GYD' THEN 2
    WHEN 'HKD' THEN 2
    WHEN 'HNL' THEN 2
    WHEN 'HTG' THEN 2
    WHEN 'HUF' THEN 2
    WHEN 'IDR' THEN 2
    WHEN 'ILS' THEN 2
    WHEN 'INR' THEN 2
    WHEN 'IQD' THEN 3
    WHEN 'IRR' THEN 2
    WHEN 'ISK' THEN 0
    WHEN 'JMD' THEN 2
    WHEN 'JOD' THEN 3
    WHEN 'JPY' THEN 0
    WHEN 'KES' THEN 2
    WHEN 'KGS' THEN 2
    WHEN 'KHR' THEN 2
    WHEN 'KMF' THEN 0
    WHEN 'KPW' THEN 2
    WHEN 'KRW' THEN 0
    WHEN 'KWD' THEN 3
    WHEN 'KYD' THEN 2
    WHEN 'KZT' THEN 2
    WHEN 'LAK' THEN 2
    WHEN 'LBP' THEN 2
    WHEN 'LKR' THEN 2
    WHEN 'LRD' THEN 2
    WHEN 'LSL' THEN 2
    WHEN 'LYD' THEN 3
    WHEN 'MAD' THEN 2
    WHEN 'MDL' THEN 2
    WHEN 'MGA' THEN 2
    WHEN 'MKD' THEN 2
    WHEN 'MMK' THEN 2
    WHEN 'MNT' THEN 2
    WHEN 'MOP' THEN 2
    WHEN 'MRU' THEN 2
    WHEN 'MUR' THEN 2
    WHEN 'MVR' THEN 2
    WHEN 'MWK' THEN 2
    WHEN 'MXN' THEN 2
    WHEN 'MYR' THEN 2
    WHEN 'MZN' THEN 2
    WHEN 'NAD' THEN 2
    WHEN 'NGN' THEN 2
    WHEN 'NIO' THEN 2
    WHEN 'NOK' THEN 2
    WHEN 'NPR' THEN 2
    WHEN 'NZD' THEN 2
    WHEN 'OMR' THEN 3
    WHEN 'PAB' THEN 2
    WHEN 'PEN' THEN 2
    WHEN 'PGK' THEN 2
    WHEN 'PHP' THEN 2
    WHEN 'PKR' THEN 2
    WHEN 'PLN' THEN 2
    WHEN 'PYG' THEN 0
    WHEN 'QAR' THEN 2
    WHEN 'RON' THEN 2
    WHEN 'RSD' THEN 2
    WHEN 'RUB' THEN 2
    WHEN 'RWF' THEN 0
    WHEN 'SAR' THEN 2
    WHEN 'SBD' THEN 2
    WHEN 'SCR' THEN 2
    WHEN 'SDG' THEN 2
    WHEN 'SEK' THEN 2
    WHEN 'SGD' THEN 2
    WHEN 'SHP' THEN 2
    WHEN 'SLE' THEN 2
    WHEN 'SOS' THEN 2
    WHEN 'SRD' THEN 2
    WHEN 'SSP' THEN 2
    WHEN 'STN' THEN 2
    WHEN 'SVC' THEN 2
    WHEN 'SYP' THEN 2
    WHEN 'SZL' THEN 2
    WHEN 'THB' THEN 2
    WHEN 'TJS' THEN 2
    WHEN 'TMT' THEN 2
    WHEN 'TND' THEN 3
    WHEN 'TOP' THEN 2
    WHEN 'TRY' THEN 2
    WHEN 'TTD' THEN 2
    WHEN 'TWD' THEN 2
    WHEN 'TZS' THEN 2
    WHEN 'UAH' THEN 2
    WHEN 'UGX' THEN 0
    WHEN 'USD' THEN 2
    WHEN 'UYU' THEN 2
    WHEN 'UZS' THEN 2
    WHEN 'VES' THEN 2
    WHEN 'VND' THEN 0
    WHEN 'VUV' THEN 0
    WHEN 'WST' THEN 2
    WHEN 'XAF' THEN 0
    WHEN 'XCD' THEN 2
    WHEN 'XCG' THEN 2
    WHEN 'XOF' THEN 0
    WHEN 'XPF' THEN 0
    WHEN 'YER' THEN 2
    WHEN 'ZAR' THEN 2
    WHEN 'ZMW' THEN 2
    WHEN 'ZWG' THEN 2
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

REVOKE ALL ON FUNCTION public.listing_price_currency_scale_v1(text),
 public.normalize_listing_price_v1(jsonb) FROM PUBLIC;
