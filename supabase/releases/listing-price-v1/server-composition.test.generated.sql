-- SOURCE: test-only envelope
-- NOT A PRODUCTION MIGRATION. This candidate contains real grants only in the NEW helper.
DO $gate$ BEGIN
  IF current_database() NOT IN ('selqiro_price_release_fixture','selqiro_price_release_race_fixture')
      OR current_user <> 'postgres' OR current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'listing_price_release_disposable_fixture_required';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_price_writer_v1') THEN
    RAISE EXCEPTION 'listing_price_release_role_already_exists';
  END IF;
END $gate$;
ALTER TABLE public.listings
  ADD COLUMN price_kind text, ADD COLUMN currency text,
  ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;

-- SOURCE: supabase/releases/listing-price-v1/price-value-contract.generated.sql#listing_price_currency_scale_v1
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

-- SOURCE: supabase/labs/listing-price-core-v1/01_value_contract.sql#normalize_listing_price_v1
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

-- SOURCE: supabase/labs/listing-price-core-v1/01_value_contract.sql#listing_price_legacy_label_v1
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

-- SOURCE: supabase/labs/listing-price-core-v1/01_value_contract.sql#listing_price_tuple_valid_v1
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

-- SOURCE: supabase/labs/listing-price-core-v1/01_value_contract.sql#listing_price_snapshot_v1
CREATE FUNCTION public.listing_price_snapshot_v1(k text,a numeric,c text,r bigint,legacy text)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $fn$
  SELECT jsonb_build_object('version',1,'kind',k,'amount',CASE WHEN k IS NULL THEN NULL ELSE a::text END,
    'currency',c,'revision',r::text,'legacy_text',CASE WHEN k IS NULL THEN legacy ELSE NULL END);
$fn$;

-- SOURCE: retained tuple constraint
ALTER TABLE public.listings ADD CONSTRAINT listings_price_tuple_v1_check CHECK (
  public.listing_price_tuple_valid_v1(price_kind,price_amount,currency,price_revision,price) IS TRUE
);

-- SOURCE: supabase/labs/listing-price-integration-v1/04_basics_contract.sql#normalize_listing_basics_v1
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

-- SOURCE: supabase/labs/listing-price-integration-v1/04_basics_contract.sql#listing_basics_values_v1
CREATE FUNCTION public.listing_basics_values_v1(p_row public.listings)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT jsonb_build_object('title',(p_row).title,'description',(p_row).description,'condition',(p_row).condition);
$fn$;

-- SOURCE: supabase/labs/listing-price-integration-v1/04_basics_contract.sql#listing_basics_snapshot_v1
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

-- SOURCE: supabase/labs/listing-price-integration-v1/04_basics_contract.sql#listing_basics_search_text_v1
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

-- SOURCE: supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql#lock_my_listing_basics_v1
CREATE FUNCTION public.lock_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_for_update boolean
) RETURNS public.listings LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $fn$
DECLARE actor uuid:=auth.uid(); active_id uuid; row_id bigint;
  identity_row public.identities%ROWTYPE; listing_row public.listings%ROWTYPE;
BEGIN
  IF actor IS NULL OR p_expected_identity_id IS NULL THEN
    RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
  END IF;
  IF p_listing_id IS NULL OR char_length(p_listing_id)>19
     OR p_listing_id !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  row_id:=p_listing_id::bigint;
  -- Same lock order as the retained core: profile -> identity -> membership -> listing.
  SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR SHARE;
  IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF identity_row.type='business' THEN
    PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
      AND m.user_id=actor AND m.status='active' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
    END IF;
  END IF;
  IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF p_for_update IS TRUE THEN
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR UPDATE;
  ELSE
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR SHARE;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_not_found_or_forbidden' USING ERRCODE='42501';
  END IF;
  RETURN listing_row;
END $fn$;

-- SOURCE: supabase/labs/listing-price-core-v1/03_owner_price_core.sql#set_my_listing_price_core_v1
CREATE FUNCTION public.set_my_listing_price_core_v1(
  p_listing_id text, p_expected_identity_id uuid,
  p_expected_price_revision text, p_price jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE
  active_id uuid; row_id bigint; expected_revision bigint;
  identity_row public.identities%ROWTYPE; current_row public.listings%ROWTYPE;
  normalized jsonb; is_changed boolean;
BEGIN
  -- Actor/identity checks are performed by the closed definer locker.
  IF p_listing_id IS NULL OR char_length(p_listing_id)>19
     OR p_listing_id !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_expected_price_revision IS NULL OR char_length(p_expected_price_revision)>19
     OR p_expected_price_revision !~ '^(0|[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  IF p_expected_price_revision::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  row_id := p_listing_id::bigint; expected_revision := p_expected_price_revision::bigint;
  -- The same lock order is owned by the retained, closed definer locker.
  current_row := public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
  active_id := current_row.identity_id;
  -- Check revision BEFORE no-op: stale callers cannot bypass conflict detection.
  IF current_row.price_revision IS DISTINCT FROM expected_revision THEN
    RAISE EXCEPTION 'listing_price_conflict' USING ERRCODE='40001';
  END IF;
  normalized := public.normalize_listing_price_v1(p_price);
  is_changed := ROW(current_row.price_kind,current_row.price_amount,current_row.currency)
    IS DISTINCT FROM ROW(normalized->>'kind',(normalized->>'amount')::numeric,normalized->>'currency');
  IF is_changed THEN
    UPDATE public.listings SET price_kind=normalized->>'kind',
      price_amount=(normalized->>'amount')::numeric, currency=normalized->>'currency'
      WHERE id=row_id RETURNING * INTO current_row;
  END IF;
  RETURN jsonb_build_object('listing_id',row_id::text,'identity_id',active_id::text,
    'price',public.listing_price_snapshot_v1(current_row.price_kind,current_row.price_amount,
       current_row.currency,current_row.price_revision,current_row.price), 'changed',is_changed);
END $fn$;

-- SOURCE: supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql#get_my_listing_basics_v1
CREATE FUNCTION public.get_my_listing_basics_v1(p_listing_id text,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE;
BEGIN
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,false);
  RETURN public.listing_basics_snapshot_v1(r);
END $fn$;

-- SOURCE: supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql#save_my_listing_basics_v1
CREATE FUNCTION public.save_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_expected_basics jsonb,p_basics jsonb,
  p_price_change jsonb DEFAULT NULL,p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE; normalized jsonb; price_result jsonb;
  basics_changed boolean; price_changed boolean:=false;
BEGIN
  normalized:=public.normalize_listing_basics_v1(p_basics);
  IF p_expected_basics IS NULL OR jsonb_typeof(p_expected_basics) IS DISTINCT FROM 'object'
     OR octet_length(p_expected_basics::text)>65536 THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_expected_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
     OR EXISTS (SELECT 1 FROM jsonb_each(p_expected_basics) e WHERE jsonb_typeof(e.value) NOT IN ('string','null')) THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF p_price_change IS NULL AND p_expected_price_revision IS NOT NULL THEN
    RAISE EXCEPTION 'listing_price_omission_invalid' USING ERRCODE='22023';
  END IF;
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
  -- Compare exact original basic fields, BEFORE no-op; do not fetch a new expected baseline.
  IF public.listing_basics_values_v1(r) IS DISTINCT FROM p_expected_basics THEN
    RAISE EXCEPTION 'listing_basics_conflict' USING ERRCODE='40001';
  END IF;
  basics_changed:=public.listing_basics_values_v1(r) IS DISTINCT FROM normalized;
  IF p_price_change IS NOT NULL THEN
    -- Internal SQL call, not a second client request. Errors roll back the whole call.
    price_result:=public.set_my_listing_price_core_v1(p_listing_id,p_expected_identity_id,
      p_expected_price_revision,p_price_change);
    price_changed:=(price_result->>'changed')::boolean;
    SELECT l.* INTO STRICT r FROM public.listings l WHERE l.id=r.id;
  END IF;
  IF basics_changed THEN
    r.title:=normalized->>'title'; r.description:=normalized->>'description'; r.condition:=normalized->>'condition';
    UPDATE public.listings l SET title=r.title,description=r.description,condition=r.condition,
      search_text=public.listing_basics_search_text_v1(r),updated_by_user_id=auth.uid()
      WHERE l.id=r.id RETURNING l.* INTO r;
  ELSIF price_changed THEN
    UPDATE public.listings l SET updated_by_user_id=auth.uid() WHERE l.id=r.id RETURNING l.* INTO r;
  END IF;
  RETURN jsonb_build_object('schema_version',1,'snapshot',public.listing_basics_snapshot_v1(r),
    'basics_changed',basics_changed,'price_changed',price_changed);
END $fn$;

-- SOURCE: supabase/contracts/listing_edit_api_v1.sql#get_my_listing_edit_v1
CREATE FUNCTION public.get_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := auth.uid(); snapshot jsonb;
BEGIN
  -- Client pre/post-auth observations alone cannot bind the JWT actually used by an RPC.
  -- Even two accounts with membership in the same business must not cross an editor session.
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  snapshot := public.get_my_listing_basics_v1(p_listing_id, p_expected_identity_id);
  RETURN jsonb_build_object('schema_version', 1, 'actor_id', actor::text, 'snapshot', snapshot);
END $fn$;

-- SOURCE: supabase/contracts/listing_edit_api_v1.sql#save_my_listing_edit_v1
CREATE FUNCTION public.save_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid,
  p_expected_basics jsonb, p_basics jsonb,
  p_price_change jsonb DEFAULT NULL, p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := auth.uid(); saved jsonb;
BEGIN
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  -- One nested SQL call, never two client writes. Errors retain the original rollback/CAS contract.
  saved := public.save_my_listing_basics_v1(p_listing_id, p_expected_identity_id,
    p_expected_basics, p_basics, p_price_change, p_expected_price_revision);
  RETURN saved || jsonb_build_object('actor_id', actor::text);
END $fn$;

-- SOURCE: supabase/labs/listing-public-read-v1/10_price_read_model.sql#listing_price_read_model_v1
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

-- SOURCE: supabase/labs/listing-public-read-v1/11_public_search_v2.sql#search_public_listings_v2
CREATE FUNCTION public.search_public_listings_v2(p_search_query text DEFAULT ''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.price_kind, l.currency, l.price_revision, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', public.listing_price_read_model_v1(p.price_kind,p.price_amount,
        p.currency,p.price_revision,p.price),
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 2, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

-- SOURCE: supabase/labs/listing-public-read-v1/12_public_detail_fields.sql#public_listing_detail_field_spec_v1
CREATE FUNCTION public.public_listing_detail_field_spec_v1(p_path text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path=pg_catalog,pg_temp
AS $fn$
  SELECT CASE p_path
    WHEN ARRAY['vehicles','cars','passenger_cars']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','suv_offroad']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','vans_minibuses']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','pickup_trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','motorhomes_campers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"sleeping_places","label":"Sleeping places"},{"key":"length","label":"Length"},{"key":"gross_weight","label":"Gross weight"},{"key":"equipment","label":"Equipment"}]'::jsonb
    WHEN ARRAY['vehicles','cars','racing_vehicles']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"discipline","label":"Discipline"},{"key":"roll_cage","label":"Roll cage"},{"key":"homologation","label":"Homologation"},{"key":"track_street_legal","label":"Track / street legal"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','sport_bikes']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','cruisers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','touring']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','enduro_mx']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','scooters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','atv_utv']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"drivetrain","label":"Drivetrain"},{"key":"winch","label":"Winch"},{"key":"road_legal","label":"Road legal"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','snowmobiles']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"mileage","label":"Mileage"},{"key":"track_length","label":"Track length"},{"key":"electric_start","label":"Electric start"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','semi_trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','buses']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','commercial_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','tractors']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"seats","label":"Seats"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','harvesters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"header_width","label":"Header width"},{"key":"crop_type","label":"Crop type"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','excavators']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"bucket_size","label":"Bucket size"},{"key":"lift_capacity","label":"Lift capacity"},{"key":"reach","label":"Reach"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','forestry_machinery']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"lift_capacity","label":"Lift capacity"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','construction_machinery']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"bucket_size","label":"Bucket size"},{"key":"lift_capacity","label":"Lift capacity"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','agricultural_attachments_implements']::text[] THEN '[{"key":"implement_type","label":"Implement type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"working_width","label":"Working width"},{"key":"attachment_type","label":"Attachment type"},{"key":"compatible_machine","label":"Compatible machine"},{"key":"pto_required","label":"PTO required"},{"key":"hydraulics_required","label":"Hydraulics required"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','agricultural_heavy_machinery_spare_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"compatible_machine","label":"Compatible machine"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','marine','boats']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','yachts']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','jet_skis']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','boat_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','marine','outboard_motors']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"shaft_length","label":"Shaft length"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','airplanes']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"range","label":"Range"},{"key":"registration_number","label":"Registration number"},{"key":"serial_number","label":"Serial number"},{"key":"maintenance_status","label":"Maintenance status"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','helicopters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"range","label":"Range"},{"key":"registration_number","label":"Registration number"},{"key":"serial_number","label":"Serial number"},{"key":"maintenance_status","label":"Maintenance status"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','ultralights']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','drones']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"camera","label":"Camera"},{"key":"flight_time","label":"Flight time"},{"key":"range","label":"Range"},{"key":"battery_count","label":"Battery count"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','aircraft_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"serial_number","label":"Serial number"},{"key":"compatible_aircraft","label":"Compatible aircraft"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','light_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','car_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','cargo_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','caravans']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"sleeping_places","label":"Sleeping places"},{"key":"heating","label":"Heating"},{"key":"kitchen","label":"Kitchen"},{"key":"toilet_shower","label":"Toilet / shower"},{"key":"awning","label":"Awning"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','horse_livestock_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','engines_engine_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"brand","label":"Brand"},{"key":"engine_type","label":"Engine type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','transmission_drivetrain']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"gearbox_type","label":"Gearbox type"},{"key":"drivetrain_type","label":"Drivetrain type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','suspension_steering']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','brakes']::text[] THEN '[{"key":"brake_type","label":"Brake type"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','electrical_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"voltage","label":"Voltage"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','batteries']::text[] THEN '[{"key":"battery_type","label":"Battery type"},{"key":"capacity","label":"Capacity"},{"key":"voltage","label":"Voltage"},{"key":"cca","label":"CCA"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','starters_alternators']::text[] THEN '[{"key":"part_type","label":"Part type"},{"key":"voltage","label":"Voltage"},{"key":"power_rating","label":"Power rating"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','body_parts']::text[] THEN '[{"key":"body_part_type","label":"Body part type"},{"key":"side_position","label":"Side / position"},{"key":"color","label":"Color"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','lights_lamps']::text[] THEN '[{"key":"light_type","label":"Light type"},{"key":"technology","label":"Technology"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','interior_parts']::text[] THEN '[{"key":"interior_part_type","label":"Interior part type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','exhaust_parts']::text[] THEN '[{"key":"exhaust_part_type","label":"Exhaust part type"},{"key":"material","label":"Material"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','cooling_heating']::text[] THEN '[{"key":"part_type","label":"Part type"},{"key":"coolant_type","label":"Coolant type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','fuel_system']::text[] THEN '[{"key":"fuel_system_part","label":"Fuel system part"},{"key":"fuel_type","label":"Fuel type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','tires']::text[] THEN '[{"key":"width","label":"Width"},{"key":"profile","label":"Profile"},{"key":"diameter","label":"Diameter"},{"key":"season","label":"Season"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"load_index","label":"Load index"},{"key":"speed_index","label":"Speed index"},{"key":"tread_depth","label":"Tread depth"},{"key":"quantity","label":"Quantity"},{"key":"dot_year","label":"DOT year"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','wheels_rims']::text[] THEN '[{"key":"diameter","label":"Diameter"},{"key":"width","label":"Width"},{"key":"bolt_pattern","label":"Bolt pattern"},{"key":"offset","label":"ET / offset"},{"key":"center_bore","label":"Center bore"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','accessories']::text[] THEN '[{"key":"accessory_type","label":"Accessory type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','riding_racing_gear']::text[] THEN '[{"key":"gear_type","label":"Gear type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"discipline","label":"Discipline"},{"key":"certification","label":"Certification"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','spare_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"oem_number","label":"OEM number"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"fits_generation","label":"Fits generation / body code"},{"key":"fits_year_from","label":"Fits year from"},{"key":"fits_year_to","label":"Fits year to"},{"key":"fits_engine","label":"Fits engine"},{"key":"fits_gearbox","label":"Fits gearbox"},{"key":"side_position","label":"Side / position"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','vehicle_for_parts']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"condition","label":"Condition"},{"key":"available_parts","label":"Available parts"}]'::jsonb
    WHEN ARRAY['electronics','phones']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"storage","label":"Storage"},{"key":"ram","label":"RAM"},{"key":"color","label":"Color"},{"key":"sim_type","label":"SIM type"},{"key":"battery_health","label":"Battery health"},{"key":"screen_condition","label":"Screen condition"},{"key":"network_lock","label":"Network lock"},{"key":"imei_serial","label":"IMEI / serial number"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['electronics','computers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"processor","label":"Processor"},{"key":"ram","label":"RAM"},{"key":"storage","label":"Storage"},{"key":"graphics_card","label":"Graphics card"},{"key":"screen_size","label":"Screen size"},{"key":"operating_system","label":"Operating system"},{"key":"battery_health","label":"Battery health"},{"key":"serial_number","label":"Serial number"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['electronics','tv_audio']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"screen_size","label":"Screen size"},{"key":"display_type","label":"Display type"},{"key":"resolution","label":"Resolution"},{"key":"smart_tv","label":"Smart TV"},{"key":"audio_type","label":"Audio type"},{"key":"power_output","label":"Power output"},{"key":"connections","label":"Connections"},{"key":"remote_included","label":"Remote included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','cameras']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"camera_type","label":"Camera type"},{"key":"lens_included","label":"Lens included"},{"key":"sensor_size","label":"Sensor size"},{"key":"megapixels","label":"Megapixels"},{"key":"shutter_count","label":"Shutter count"},{"key":"video_resolution","label":"Video resolution"},{"key":"battery_count","label":"Battery count"},{"key":"memory_card_included","label":"Memory card included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','gaming']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"platform","label":"Platform"},{"key":"storage","label":"Storage"},{"key":"controller_count","label":"Controller count"},{"key":"game_count","label":"Game count"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','smart_home']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"device_type","label":"Device type"},{"key":"compatibility","label":"Compatibility"},{"key":"connection_type","label":"Connection type"},{"key":"power_type","label":"Power type"},{"key":"app_support","label":"App support"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','components']::text[] THEN '[{"key":"component_type","label":"Component type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"socket_compatibility","label":"Socket / compatibility"},{"key":"capacity","label":"Capacity"},{"key":"speed","label":"Speed"},{"key":"power_rating","label":"Power rating"},{"key":"condition","label":"Condition"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','electronics_accessories']::text[] THEN '[{"key":"accessory_type","label":"Accessory type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"compatibility","label":"Compatibility"},{"key":"connection_type","label":"Connection type"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['electronics','other_electronics']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['real_estate','apartments']::text[] THEN '[{"key":"listing_type","label":"Listing type"},{"key":"property_type","label":"Property type"},{"key":"rooms","label":"Rooms"},{"key":"area","label":"Area (m²)"},{"key":"floor","label":"Floor"},{"key":"total_floors","label":"Total floors"},{"key":"year_built","label":"Year built"},{"key":"condition","label":"Condition"},{"key":"heating_type","label":"Heating type"},{"key":"energy_class","label":"Energy class"},{"key":"balcony","label":"Balcony"},{"key":"furnished","label":"Furnished"},{"key":"parking","label":"Parking"},{"key":"storage_room","label":"Storage room"},{"key":"bathroom_count","label":"Bathroom count"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','houses']::text[] THEN '[{"key":"listing_type","label":"Listing type"},{"key":"house_type","label":"House type"},{"key":"rooms","label":"Rooms"},{"key":"living_area","label":"Living area (m²)"},{"key":"land_area","label":"Land area"},{"key":"floors","label":"Floors"},{"key":"year_built","label":"Year built"},{"key":"condition","label":"Condition"},{"key":"heating_type","label":"Heating type"},{"key":"energy_class","label":"Energy class"},{"key":"garage","label":"Garage"},{"key":"sauna","label":"Sauna"},{"key":"terrace","label":"Terrace"},{"key":"water_supply","label":"Water supply"},{"key":"sewer_connection","label":"Sewer connection"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','land']::text[] THEN '[{"key":"land_type","label":"Land type"},{"key":"area","label":"Area"},{"key":"purpose","label":"Purpose"},{"key":"detailed_plan","label":"Detailed plan"},{"key":"electricity","label":"Electricity"},{"key":"water","label":"Water"},{"key":"sewer","label":"Sewer"},{"key":"road_access","label":"Road access"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','commercial_property']::text[] THEN '[{"key":"property_type","label":"Property type"},{"key":"area","label":"Area"},{"key":"floor","label":"Floor"},{"key":"purpose","label":"Purpose"},{"key":"parking","label":"Parking"},{"key":"loading_access","label":"Loading access"},{"key":"heating","label":"Heating"},{"key":"security","label":"Security"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','garages']::text[] THEN '[{"key":"area","label":"Area"},{"key":"electricity","label":"Electricity"},{"key":"heating","label":"Heating"},{"key":"security","label":"Security"},{"key":"water","label":"Water"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','vacation_property']::text[] THEN '[{"key":"property_type","label":"Property type"},{"key":"rooms","label":"Rooms"},{"key":"area","label":"Area"},{"key":"beds","label":"Beds"},{"key":"sauna","label":"Sauna"},{"key":"pool","label":"Pool"},{"key":"beach_access","label":"Beach access"},{"key":"seasonal_year_round","label":"Seasonal / year-round"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['clothing_fashion','men']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"fit","label":"Fit"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"authenticity","label":"Authenticity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['clothing_fashion','women']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"fit","label":"Fit"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"authenticity","label":"Authenticity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['clothing_fashion','kids']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size_age","label":"Size / age"},{"key":"gender","label":"Gender"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"}]'::jsonb
    WHEN ARRAY['clothing_fashion','workwear']::text[] THEN '[{"key":"workwear_type","label":"Workwear type"},{"key":"gender","label":"Gender"},{"key":"size","label":"Size"},{"key":"industry","label":"Industry"},{"key":"season","label":"Season"},{"key":"visibility_class","label":"Visibility class"},{"key":"protection_class","label":"Protection class"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['clothing_fashion','shoes']::text[] THEN '[{"key":"gender","label":"Gender"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"size","label":"Size"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"heel_height","label":"Heel height"},{"key":"authenticity","label":"Authenticity"},{"key":"original_box_included","label":"Original box included"}]'::jsonb
    WHEN ARRAY['clothing_fashion','watches']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"movement_type","label":"Movement type"},{"key":"case_material","label":"Case material"},{"key":"case_size","label":"Case size"},{"key":"water_resistance","label":"Water resistance"},{"key":"condition","label":"Condition"},{"key":"box_papers_included","label":"Box / papers included"},{"key":"authenticity","label":"Authenticity"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['clothing_fashion','bags']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"authenticity","label":"Authenticity"},{"key":"dust_bag_box_included","label":"Dust bag / box included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['clothing_fashion','jewelry']::text[] THEN '[{"key":"jewelry_type","label":"Jewelry type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"gemstone","label":"Gemstone"},{"key":"size","label":"Size"},{"key":"weight","label":"Weight"},{"key":"condition","label":"Condition"},{"key":"authenticity","label":"Authenticity"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['clothing_fashion','other_clothing_fashion']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','power_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"power_rating","label":"Power rating"},{"key":"battery_included","label":"Battery included"},{"key":"battery_count","label":"Battery count"},{"key":"charger_included","label":"Charger included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','hand_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"set_single","label":"Set / single item"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','workshop_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"capacity","label":"Capacity"},{"key":"dimensions","label":"Dimensions"},{"key":"weight","label":"Weight"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','industrial_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"capacity","label":"Capacity"},{"key":"working_pressure","label":"Working pressure"},{"key":"weight","label":"Weight"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','safety_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"certification","label":"Certification"},{"key":"condition","label":"Condition"},{"key":"expiration_date","label":"Expiration date"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','other_tools_industrial']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','furniture']::text[] THEN '[{"key":"furniture_type","label":"Furniture type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"assembly_required","label":"Assembly required"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','appliances']::text[] THEN '[{"key":"appliance_type","label":"Appliance type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"energy_class","label":"Energy class"},{"key":"power_source","label":"Power source"},{"key":"capacity","label":"Capacity"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"warranty_remaining","label":"Warranty remaining"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['home_garden','garden_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"battery_included","label":"Battery included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','plants_seedlings']::text[] THEN '[{"key":"plant_type","label":"Plant type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"pot_size","label":"Pot size"},{"key":"growth_stage","label":"Growth stage"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','seeds']::text[] THEN '[{"key":"seed_type","label":"Seed type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"package_weight","label":"Package weight"},{"key":"sowing_season","label":"Sowing season"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','crops_produce']::text[] THEN '[{"key":"produce_type","label":"Produce type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"unit","label":"Unit"},{"key":"harvest_date","label":"Harvest date"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','farm_supplies']::text[] THEN '[{"key":"supply_type","label":"Supply type"},{"key":"brand","label":"Brand"},{"key":"quantity","label":"Quantity"},{"key":"material","label":"Material"},{"key":"intended_use","label":"Intended use"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','animal_feed']::text[] THEN '[{"key":"feed_type","label":"Feed type"},{"key":"animal_type","label":"Animal type"},{"key":"quantity","label":"Quantity"},{"key":"package_weight","label":"Package weight"},{"key":"ingredients","label":"Ingredients"},{"key":"expiry_date","label":"Expiry date"}]'::jsonb
    WHEN ARRAY['home_garden','greenhouses']::text[] THEN '[{"key":"greenhouse_type","label":"Greenhouse type"},{"key":"material","label":"Material"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"frame_material","label":"Frame material"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','decor']::text[] THEN '[{"key":"decor_type","label":"Decor type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"style","label":"Style"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','lighting']::text[] THEN '[{"key":"lighting_type","label":"Lighting type"},{"key":"brand","label":"Brand"},{"key":"power_source","label":"Power source"},{"key":"bulb_type","label":"Bulb type"},{"key":"color_temperature","label":"Color temperature"},{"key":"smart_lighting_support","label":"Smart lighting support"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','kitchenware']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','home_textiles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','household_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','bathroom']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','heating_fuels']::text[] THEN '[{"key":"fuel_type","label":"Fuel type"},{"key":"wood_type","label":"Wood type"},{"key":"quantity","label":"Quantity"},{"key":"unit","label":"Unit"},{"key":"moisture_level","label":"Moisture level"},{"key":"packaging","label":"Packaging"},{"key":"delivery_available","label":"Delivery available"}]'::jsonb
    WHEN ARRAY['home_garden','heating_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"fuel_type","label":"Fuel type"},{"key":"power","label":"Power"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','outdoor_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','other_home_garden']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','gym_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"weight_resistance","label":"Weight / resistance"},{"key":"dimensions","label":"Dimensions"},{"key":"foldable","label":"Foldable"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','bicycles']::text[] THEN '[{"key":"bike_type","label":"Bike type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"frame_size","label":"Frame size"},{"key":"wheel_size","label":"Wheel size"},{"key":"material","label":"Material"},{"key":"gear_count","label":"Gear count"},{"key":"suspension","label":"Suspension"},{"key":"brake_type","label":"Brake type"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['sports_outdoor','winter_sports']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"size","label":"Size"},{"key":"binding_included","label":"Binding included"},{"key":"boot_size","label":"Boot size"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','camping']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"capacity","label":"Capacity"},{"key":"weight","label":"Weight"},{"key":"dimensions","label":"Dimensions"},{"key":"season_rating","label":"Season rating"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','fishing']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"length","label":"Length"},{"key":"power_rating","label":"Power rating"},{"key":"reel_included","label":"Reel included"},{"key":"line_included","label":"Line included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','other_sports_outdoor']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','saddles_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','bridles_halters_tack']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','rider_clothing_safety']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"gender","label":"Gender"},{"key":"discipline","label":"Discipline"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','horse_blankets_textiles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"horse_size","label":"Horse size"},{"key":"blanket_weight","label":"Blanket weight"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','horse_grooming_care']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"horse_size","label":"Horse size"},{"key":"material","label":"Material"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','stable_paddock_equipment']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','driving_carriage_equipment']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','other_equestrian_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','art']::text[] THEN '[{"key":"art_type","label":"Art type"},{"key":"artist","label":"Artist"},{"key":"title","label":"Title"},{"key":"year_period","label":"Year / period"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"signed","label":"Signed"},{"key":"certificate_included","label":"Certificate included"},{"key":"condition","label":"Condition"},{"key":"frame_included","label":"Frame included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','vintage']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand_maker","label":"Brand / maker"},{"key":"year_era","label":"Year / era"},{"key":"material","label":"Material"},{"key":"origin_country","label":"Origin country"},{"key":"condition","label":"Condition"},{"key":"restored","label":"Restored"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','coins']::text[] THEN '[{"key":"country","label":"Country"},{"key":"year","label":"Year"},{"key":"currency","label":"Currency"},{"key":"material","label":"Material"},{"key":"denomination","label":"Denomination"},{"key":"mint_mark","label":"Mint mark"},{"key":"condition_grading","label":"Condition / grading"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','military']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"country","label":"Country"},{"key":"era","label":"Era"},{"key":"original_reproduction","label":"Original / reproduction"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"serial_markings","label":"Serial number / markings"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','memorabilia']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"related_person_event","label":"Related person / event"},{"key":"year_era","label":"Year / era"},{"key":"signed","label":"Signed"},{"key":"certificate_included","label":"Certificate included"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','other_antiques_collectibles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['building_materials','lumber']::text[] THEN '[{"key":"material_type","label":"Material type"},{"key":"wood_type","label":"Wood type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"thickness","label":"Thickness"},{"key":"moisture_level","label":"Moisture level"},{"key":"treatment_type","label":"Treatment type"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','concrete']::text[] THEN '[{"key":"material_type","label":"Material type"},{"key":"strength_class","label":"Strength class"},{"key":"weight","label":"Weight"},{"key":"bag_size","label":"Bag size"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','insulation']::text[] THEN '[{"key":"insulation_type","label":"Insulation type"},{"key":"material","label":"Material"},{"key":"thickness","label":"Thickness"},{"key":"coverage_area","label":"Coverage area"},{"key":"fire_rating","label":"Fire rating"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','roofing']::text[] THEN '[{"key":"roofing_type","label":"Roofing type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"coverage_area","label":"Coverage area"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','plumbing']::text[] THEN '[{"key":"plumbing_type","label":"Plumbing type"},{"key":"material","label":"Material"},{"key":"diameter","label":"Diameter"},{"key":"length","label":"Length"},{"key":"compatibility","label":"Compatibility"},{"key":"pressure_rating","label":"Pressure rating"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['building_materials','other_building_materials']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','strollers_prams']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','child_car_seats']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','nursery_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','baby_feeding_care']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','baby_safety_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','other_children_baby']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','dog_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','cat_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','aquariums_terrariums']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','cages_housing']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','pet_transport_grooming']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','other_pet_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['books_music_media','books']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','magazines_comics']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','music_movies']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','musical_instruments']::text[] THEN '[{"key":"instrument_type","label":"Instrument type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['books_music_media','instrument_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['books_music_media','other_books_media']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','toys']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','board_games_puzzles']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','arts_crafts']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','model_rc_hobbies']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','sewing_knitting']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','other_hobbies_toys']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['office_business','office_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','printers_scanners']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','office_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['office_business','retail_warehouse_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','presentation_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','other_office_business']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    ELSE '[]'::jsonb END;
$fn$;

-- SOURCE: supabase/labs/listing-public-read-v1/12_public_detail_fields.sql#public_listing_detail_values_v1
CREATE FUNCTION public.public_listing_detail_values_v1(p_row public.listings)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE path_value text[]; specs jsonb; spec jsonb; value_text text; raw_value jsonb;
  result jsonb:='[]'; seen text[]:=ARRAY[]::text[]; clipped boolean:=false; attrs jsonb;
BEGIN
  path_value:=ARRAY[(p_row).category,(p_row).subcategory];
  IF jsonb_typeof((p_row).details->'detailCategory')='string'
     AND (p_row).details->>'detailCategory'<>'' THEN
    path_value:=path_value||ARRAY[(p_row).details->>'detailCategory'];
  END IF;
  -- These columns are explicit authored public form inputs, not AI or inferred values.
  attrs:=jsonb_build_array(
    jsonb_build_object('key','manufacturer','label','Manufacturer','value',(p_row).manufacturer),
    jsonb_build_object('key','part_number','label','Part number','value',(p_row).part_number),
    jsonb_build_object('key','oem_number','label','OEM number','value',(p_row).oem_number),
    jsonb_build_object('key','vehicle_brand','label','Vehicle brand','value',(p_row).vehicle_brand),
    jsonb_build_object('key','vehicle_model','label','Vehicle model','value',(p_row).vehicle_model),
    jsonb_build_object('key','vehicle_year','label','Vehicle year','value',(p_row).vehicle_year),
    jsonb_build_object('key','engine','label','Engine','value',(p_row).engine));
  FOR spec IN SELECT value FROM jsonb_array_elements(attrs) LOOP
    value_text:=spec->>'value';
    IF value_text IS NOT NULL AND btrim(value_text)<>'' THEN
      clipped:=clipped OR char_length(value_text)>1000;
      result:=result||jsonb_build_array(jsonb_build_object('key',spec->>'key',
        'label',spec->>'label','value',left(value_text,1000)));
      seen:=array_append(seen,spec->>'key');
    END IF;
  END LOOP;
  specs:=public.public_listing_detail_field_spec_v1(path_value);
  IF jsonb_typeof((p_row).details)='object' THEN
    FOR spec IN SELECT value FROM jsonb_array_elements(specs) LOOP
      IF (spec->>'key')=ANY(seen) THEN CONTINUE; END IF;
      raw_value:=(p_row).details->(spec->>'key');
      IF jsonb_typeof(raw_value) IN ('string','number','boolean') THEN
        value_text:=raw_value#>>'{}';
        IF btrim(value_text)<>'' THEN
          clipped:=clipped OR char_length(value_text)>1000;
          result:=result||jsonb_build_array(jsonb_build_object('key',spec->>'key',
            'label',spec->>'label','value',left(value_text,1000)));
          seen:=array_append(seen,spec->>'key');
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('fields',result,'truncated',clipped);
END $fn$;

-- SOURCE: supabase/labs/listing-public-read-v1/13_public_listing_detail.sql#get_public_listing_detail_v1
CREATE FUNCTION public.get_public_listing_detail_v1(p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=auth.uid(); r public.listings%ROWTYPE; seller record; gallery jsonb; image_url text;
  detail_values jsonb; item jsonb:=NULL; has_more boolean:=false; id_value bigint;
BEGIN
  IF p_listing_id IS NULL OR char_length(p_listing_id)>20
     OR p_listing_id !~ '^(0|[1-9][0-9]*|-[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric < -9223372036854775808
     OR p_listing_id::numeric > 9223372036854775807 THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  id_value:=p_listing_id::bigint;
  SELECT l.* INTO r FROM public.listings l
    JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.id=id_value AND l.status='active'
      -- Deliberately preserves public detail/search NULL-expiry semantics.
      AND (l.active_until IS NULL OR l.active_until>now())
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)));
  IF FOUND THEN
    SELECT ip.display_name,ip.slug,ip.avatar_url,i.type INTO seller
      FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
      WHERE i.id=r.identity_id AND i.status='active';
    -- Small bounded gallery, stable tiebreaks, identical first-image rule to search v2.
    WITH ordered AS (
      SELECT li.id,li.thumb_url,li.medium_url,li.original_url,li.is_primary,li.sort_order,
        row_number() OVER (ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
          li.created_at ASC NULLS LAST,li.id ASC) AS position
      FROM public.listing_images li WHERE li.listing_id=r.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
        li.created_at ASC NULLS LAST,li.id ASC LIMIT 11
    ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id::text,'thumb_url',o.thumb_url,
        'medium_url',o.medium_url,'original_url',o.original_url,'is_primary',o.is_primary,
        'sort_order',o.sort_order) ORDER BY o.position) FILTER (WHERE o.position<=10),'[]'::jsonb),
        coalesce(bool_or(o.position>10),false)
      INTO gallery,has_more FROM ordered o;
    image_url:=coalesce(gallery->0->>'thumb_url',gallery->0->>'medium_url',
      gallery->0->>'original_url',r.image);
    detail_values:=public.public_listing_detail_values_v1(r);
    item:=jsonb_build_object('content_type','listing','content_id',r.id::text,
      'title',left(r.title,4096),'description',left(r.description,32768),
      'title_truncated',coalesce(char_length(r.title)>4096,false),
      'description_truncated',coalesce(char_length(r.description)>32768,false),
      'price',public.listing_price_read_model_v1(r.price_kind,r.price_amount,r.currency,r.price_revision,r.price),
      'category',r.category,'subcategory',r.subcategory,
      'detail_category',CASE WHEN jsonb_typeof(r.details->'detailCategory')='string'
        THEN r.details->>'detailCategory' ELSE NULL END,
      'condition',r.condition,'country',r.country,'city',r.city,
      'image_url',image_url,'images',gallery,'images_has_more',has_more,
      'details',detail_values->'fields','details_truncated',detail_values->'truncated',
      'seller_name',seller.display_name,'seller_slug',seller.slug,'seller_avatar_url',seller.avatar_url,
      'seller_type',seller.type,'created_at',r.created_at,'active_until',r.active_until);
  END IF;
  -- Hidden, missing and blocked IDs are indistinguishable. No owner bypass here.
  RETURN jsonb_build_object('schema_version',1,'content_scope','public_ordinary_listing_detail',
    'requested_id',p_listing_id,'item',item);
END $fn$;

-- SOURCE: supabase/labs/listing-public-read-v1/14_public_profile_listings.sql#get_public_profile_listings_v1
CREATE FUNCTION public.get_public_profile_listings_v1(
 p_seller_slug text,p_store_category_id uuid DEFAULT NULL,
 p_result_limit integer DEFAULT 12,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=auth.uid(); identity_value uuid; result jsonb; profile_count integer;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
     OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>60
     OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
    RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';
  END IF;
  -- A duplicate legacy slug is ambiguous, never combine two identities into one shop.
  SELECT count(*)::integer INTO profile_count FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  IF profile_count=1 THEN
    SELECT ip.identity_id INTO identity_value FROM public.identity_profiles ip
      JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  END IF;
  WITH RECURSIVE category_scope(id) AS (
    SELECT c.id FROM public.store_categories c
      WHERE c.id=p_store_category_id AND c.identity_id=identity_value
    UNION -- deduplicate and terminate even a corrupt historical cycle
    SELECT c.id FROM public.store_categories c JOIN category_scope s ON c.parent_id=s.id
      WHERE c.identity_id=identity_value
  ), matched AS MATERIALIZED (
    SELECT l.id,l.created_at,l.title,left(l.description,280) AS description_preview,
      l.price,l.price_kind,l.price_amount,l.currency,l.price_revision,l.category,l.subcategory,
      CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' ELSE NULL END AS detail_category,
      l.condition,l.country,l.city,l.image AS fallback_image,
      ip.display_name AS seller_name,ip.slug AS seller_slug,ip.avatar_url AS seller_avatar_url,i.type AS seller_type
    FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.identity_id=identity_value AND l.status='active'
      -- Preserve the profile's stricter boundary: unlike search/detail, NULL is excluded.
      AND l.active_until>now()
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
      AND (p_store_category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.listing_store_categories x JOIN category_scope s ON s.id=x.store_category_id
        WHERE x.listing_id=l.id))
  ), page AS (
    SELECT m.* FROM matched m ORDER BY m.created_at DESC,m.id DESC LIMIT p_result_limit OFFSET p_result_offset
  ), cards AS (
    SELECT p.id,p.created_at,jsonb_build_object('content_type','listing','content_id',p.id::text,
      'title',p.title,'description_preview',p.description_preview,
      'price',public.listing_price_read_model_v1(p.price_kind,p.price_amount,p.currency,p.price_revision,p.price),
      'category',p.category,'subcategory',p.subcategory,'detail_category',p.detail_category,
      'condition',p.condition,'country',p.country,'city',p.city,
      'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,p.fallback_image),
      'seller_name',p.seller_name,'seller_slug',p.seller_slug,'seller_avatar_url',p.seller_avatar_url,
      'seller_type',p.seller_type,'created_at',p.created_at) AS card
    FROM page p LEFT JOIN LATERAL (
      SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=p.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id ASC LIMIT 1
    ) img ON true
  ), totals AS (SELECT count(*) AS n FROM matched)
  SELECT jsonb_build_object('schema_version',1,'content_scope','public_profile_ordinary_listings',
    'seller_slug',p_seller_slug,'profile_available',identity_value IS NOT NULL,
    'store_category_id',p_store_category_id::text,'sort','newest',
    'items',coalesce((SELECT jsonb_agg(c.card ORDER BY c.created_at DESC,c.id DESC) FROM cards c),'[]'::jsonb),
    'total_count',t.n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',t.n>p_result_offset::bigint+p_result_limit,
    'next_offset',CASE WHEN t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
      THEN p_result_offset+p_result_limit ELSE NULL END,
    'window_limit_reached',t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
    INTO result FROM totals t;
  RETURN result;
END $fn$;

-- SOURCE: supabase/labs/listing-owner-read-v1/15_owner_money_models.sql#project_horse_wanted_owner_summary_v2
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

-- SOURCE: supabase/labs/listing-owner-read-v1/15_owner_money_models.sql#horse_owner_price_read_v1
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

-- SOURCE: supabase/labs/listing-owner-read-v1/16_owner_marketplace_read_v3.sql#get_my_marketplace_items_v3
CREATE FUNCTION public.get_my_marketplace_items_v3(
  p_expected_identity_id uuid,
  p_result_limit integer DEFAULT 30,
  p_result_offset integer DEFAULT 0,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_store_category_filter uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET TimeZone = 'UTC'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_identity uuid;
  v_result jsonb;
  v_status text := coalesce(nullif(lower(btrim(p_status_filter)),''),'all');
  v_search text := btrim(coalesce(p_search_query,''));
BEGIN
  -- This call authenticates even an empty/no-results page.
  v_identity := public.require_my_active_identity_v2();
  IF p_expected_identity_id IS NULL OR p_expected_identity_id <> v_identity THEN
    RAISE EXCEPTION 'owner_read_identity_changed' USING ERRCODE='42501';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit < 1 OR p_result_limit > 100
    OR p_result_offset IS NULL OR p_result_offset < 0 OR p_result_offset > 100000
    OR char_length(v_status) > 40 OR char_length(v_search) > 200 THEN
    RAISE EXCEPTION 'owner_read_request_invalid' USING ERRCODE='22023';
  END IF;

  WITH owner_window AS MATERIALIZED (
    SELECT * FROM public.get_my_marketplace_items_v1(
      p_result_limit+1,p_result_offset,v_status,v_search,p_store_category_filter
    ) WITH ORDINALITY
  ), owner_page AS MATERIALIZED (
    SELECT * FROM owner_window ORDER BY ordinality LIMIT p_result_limit
  ), priced AS (
    SELECT item.ordinality,
      jsonb_build_object(
        'content_type',item.content_type,'content_id',item.content_id,
        'identity_id',item.identity_id,
        'source_status',item.source_status,'lifecycle_status',item.lifecycle_status,
        'content_variant',item.content_variant,
        'title',left(coalesce(item.title,''),512),
        'title_truncated',char_length(coalesce(item.title,'')) > 512,
        'description_excerpt',left(coalesce(item.description,''),512),
        'description_truncated',char_length(coalesce(item.description,'')) > 512,
        'image_url',item.image_url,'category',item.category,'subcategory',item.subcategory,
        'condition',item.condition,
        -- Wanted search area comes ONLY from the whitelist, never horse/seller location.
        'city',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.city END,
        'region',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.region END,
        'location_label',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.location_label END,
        'active_until',item.active_until,'published_at',item.published_at,
        'created_at',item.created_at,'sort_at',item.sort_at,
        'money',CASE
          WHEN item.content_type = 'listing' THEN jsonb_build_object(
            'role','listing_price','value',public.listing_price_read_model_v1(
              listing.price_kind,listing.price_amount,listing.currency,listing.price_revision,listing.price))
          WHEN item.content_variant = 'wanted' THEN jsonb_build_object(
            'role','wanted_budget','value',public.project_horse_wanted_owner_summary_v2(offer.details))
          ELSE jsonb_build_object('role','horse_offer_price','value',
            public.horse_owner_price_read_v1(offer.offer_type,offer.price_type,offer.price_amount,offer.currency))
        END
      ) AS value
    FROM owner_page item
    -- Typed primary-key lookups only on the selected page, not client-side N+1 requests.
    LEFT JOIN public.listings listing
      ON listing.id = CASE WHEN item.content_type='listing' THEN item.content_id::bigint ELSE NULL END
      AND listing.identity_id = v_identity
    LEFT JOIN public.horse_offers offer
      ON offer.id = CASE WHEN item.content_type='horse_offer' THEN item.content_id::uuid ELSE NULL END
      AND offer.identity_id = v_identity
  )
  SELECT jsonb_build_object(
    'schema_version',3,'actor_id',v_actor,'identity_id',v_identity,
    'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',(SELECT count(*) > p_result_limit FROM owner_window),
    'next_offset',CASE WHEN (SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit <= 100000 THEN p_result_offset + p_result_limit ELSE NULL END,
    'window_limit_reached',(SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit > 100000,
    'items',coalesce((SELECT jsonb_agg(value ORDER BY ordinality) FROM priced),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;

-- SOURCE: explicit base ACL
REVOKE ALL ON FUNCTION public.listing_price_currency_scale_v1(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.normalize_listing_price_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_price_legacy_label_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_price_snapshot_v1(text,numeric,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.normalize_listing_basics_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_basics_values_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_basics_snapshot_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_basics_search_text_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_basics_v1(text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_my_listing_basics_v1(text,uuid,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.listing_price_read_model_v1(text,numeric,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.public_listing_detail_field_spec_v1(text[]) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.public_listing_detail_values_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_public_listing_detail_v1(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.project_horse_wanted_owner_summary_v2(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.horse_owner_price_read_v1(text,text,numeric,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;

-- SOURCE: retained pure-value grants
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_price_legacy_label_v1(jsonb) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_price_snapshot_v1(text,numeric,text,bigint,text) TO anon,authenticated,service_role;

-- SOURCE: supabase/releases/listing-price-v1/writer-authority.sql
-- Release candidate authority. Included only by the fixture-gated composition.
-- One NOLOGIN role owns only the exact price-CAS writer; no API role may SET it.
CREATE ROLE selqiro_listing_price_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- postgres is the existing trusted schema administrator, not an application role.
-- Inheritance enables managing the function; it does NOT change current_user in
-- an older postgres-owned SECURITY DEFINER function.
GRANT selqiro_listing_price_writer_v1 TO postgres WITH ADMIN TRUE;
GRANT selqiro_listing_price_writer_v1 TO postgres WITH INHERIT TRUE;
GRANT selqiro_listing_price_writer_v1 TO postgres WITH SET TRUE;
GRANT USAGE ON SCHEMA public TO selqiro_listing_price_writer_v1;
GRANT SELECT ON public.listings TO selqiro_listing_price_writer_v1;
GRANT UPDATE (price_kind, price_amount, currency) ON public.listings
  TO selqiro_listing_price_writer_v1;
CREATE POLICY listing_price_writer_v1_update ON public.listings
  FOR UPDATE TO selqiro_listing_price_writer_v1
  USING (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id))
  WITH CHECK (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));
-- The fixed definer locker checks and locks profile, identity, membership and row.
-- No SELECT/UPDATE on those account tables is granted to this role: this also
-- avoids entering legacy self-referencing PUBLIC membership RLS from the writer.
GRANT EXECUTE ON FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean),
  public.current_user_has_identity_access(uuid),
  public.listing_price_currency_scale_v1(text), public.normalize_listing_price_v1(jsonb),
  public.listing_price_legacy_label_v1(jsonb),
  public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
  public.listing_price_snapshot_v1(text,numeric,text,bigint,text)
  TO selqiro_listing_price_writer_v1;
-- Ownership transfer requires CREATE on the destination schema. Remove it again
-- in this same transaction. No dynamic SQL or arbitrary caller names are accepted.
GRANT CREATE ON SCHEMA public TO selqiro_listing_price_writer_v1;
ALTER FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  OWNER TO selqiro_listing_price_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_price_writer_v1;
REVOKE ALL ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb) IS
  'Release composition: closed dedicated-role price CAS; fixed definer locker validates and locks actor context. No direct API grant.';

-- SOURCE: supabase/releases/listing-price-v1/write-guard-v2.sql
-- Candidate row guard: effective SQL role, never auth.role or an application GUC.
-- Even legacy postgres-owned definers are not allowed to change structured money.
CREATE FUNCTION public.guard_listing_price_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb; changed boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'listing_price_direct_truncate_forbidden' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.price_kind IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_direct_delete_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_revision IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    -- Creation has not switched yet. Old raw-price creation remains possible;
    -- no structured create endpoint is exposed by this existing-listing slice.
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'listing_price_structured_create_not_enabled' USING ERRCODE='42501';
  END IF;
  IF NEW.price_revision IS DISTINCT FROM OLD.price_revision THEN
    RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND NEW.price_kind IS NULL THEN
    RAISE EXCEPTION 'listing_price_downgrade_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND
     ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id)
     IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id) THEN
    RAISE EXCEPTION 'listing_price_owner_tuple_immutable' USING ERRCODE='42501';
  END IF;
  changed := ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
    IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price);
  IF NOT changed THEN RETURN NEW; END IF;
  IF (OLD.price_kind IS NOT NULL OR NEW.price_kind IS NOT NULL)
      AND current_user <> 'selqiro_listing_price_writer_v1' THEN
    RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_revision = 9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_exhausted' USING ERRCODE='54000';
  END IF;
  IF NEW.price_kind IS NULL THEN
    IF NEW.currency IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
    END IF;
    NEW.price_revision := OLD.price_revision + 1;
    RETURN NEW;
  END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',NEW.price_kind,'amount',NEW.price_amount::text,'currency',NEW.currency));
  NEW.price_amount := (normalized->>'amount')::numeric;
  NEW.currency := normalized->>'currency';
  NEW.price := public.listing_price_legacy_label_v1(normalized);
  IF ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
     IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price) THEN
    NEW.price_revision := OLD.price_revision + 1;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.guard_listing_price_v2()
  FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER trg_listing_price_guard_v2 BEFORE INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_price_v2();
CREATE TRIGGER trg_listing_price_truncate_guard_v2 BEFORE TRUNCATE ON public.listings
  FOR EACH STATEMENT EXECUTE FUNCTION public.guard_listing_price_v2();

-- SOURCE: supabase/releases/listing-price-v1/api-privileges.sql
-- Intended API boundary, exercised ONLY in the disposable composed release tests.
-- A later production application needs a separate audited migration and consent.
GRANT EXECUTE ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid),
  public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer),
  public.get_public_listing_detail_v1(text),
  public.get_public_profile_listings_v1(text,uuid,integer,integer)
  TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid)
  TO authenticated;
-- No broad table grant to API roles; no new privilege for service_role; no grant
-- for internal locks, raw snapshots, price-CAS, wanted projector or arbitrary SQL.
-- Existing v1/v2 readers and all non-price writers remain unchanged.

