-- Test-only wire boundary, included inside the runner's outer rollback transaction.
-- Every ORIGINAL case is staged as JSON TEXT, not eagerly decoded as jsonb.
-- U+0000 is deliberately rejected by jsonb decoding before the price function.
CREATE TEMP TABLE price_input_results (
  ordinal integer PRIMARY KEY, label text, ok boolean, value jsonb,
  stage text NOT NULL, rejection_sqlstate text
);
CREATE TEMP TABLE price_input_boundary_checks (ordinal integer PRIMARY KEY, label text UNIQUE);
CREATE FUNCTION pg_temp.assert_price_input_boundary(p_ok boolean, p_label text)
RETURNS void LANGUAGE plpgsql AS $assert$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'price_input_boundary_failed: %', p_label;
  END IF;
  INSERT INTO price_input_boundary_checks
    SELECT count(*)::integer + 1, p_label FROM price_input_boundary_checks;
END $assert$;

DO $test$
DECLARE r record; decoded jsonb; actual jsonb; accepted boolean;
  decode_rejected boolean; rejected_state text; total integer := 0;
BEGIN
  FOR r IN SELECT * FROM price_input_cases ORDER BY ordinal LOOP
    decoded := NULL; actual := NULL; accepted := false;
    decode_rejected := false; rejected_state := NULL;
    BEGIN
      decoded := r.input_wire::jsonb;
    EXCEPTION WHEN SQLSTATE '22P05' THEN
      decode_rejected := true; rejected_state := '22P05';
    END;
    IF decode_rejected THEN
      -- Only this exact ORIGINAL hostile wire case can pass at this earlier boundary.
      IF r.ordinal <> 823 OR r.label <> 'bad_amount_26'
         OR r.input_wire IS DISTINCT FROM $wire${"kind":"fixed","amount":"1\u0000","currency":"EUR"}$wire$ THEN
        RAISE EXCEPTION 'unexpected_price_input_decode_rejection: %', r.label;
      END IF;
    ELSE
      IF r.label = 'bad_amount_26' THEN
        RAISE EXCEPTION 'price_input_nul_unexpectedly_decoded';
      END IF;
      BEGIN
        actual := public.normalize_listing_price_v1(decoded); accepted := true;
      EXCEPTION WHEN SQLSTATE '22023' THEN rejected_state := '22023';
      END;
    END IF;
    IF accepted IS DISTINCT FROM (r.expected->>'ok')::boolean
       OR actual IS DISTINCT FROM NULLIF(r.expected->'value','null'::jsonb) THEN
      RAISE EXCEPTION 'price_input_case_failed: %', r.label;
    END IF;
    INSERT INTO price_input_results VALUES (r.ordinal, r.label, accepted, actual,
      CASE WHEN decode_rejected THEN 'jsonb_decode' ELSE 'normalizer' END, rejected_state);
    total := total + 1;
  END LOOP;
  FOR r IN SELECT * FROM price_input_scales LOOP
    IF public.listing_price_currency_scale_v1(r.code) IS DISTINCT FROM r.scale THEN
      RAISE EXCEPTION 'price_input_scale_failed: %', r.code;
    END IF;
  END LOOP;
  -- Retain the original function-property check; the exact catalog check below is stronger.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('normalize_listing_price_v1','listing_price_currency_scale_v1')
    AND (p.provolatile <> 'i' OR p.prosecdef OR EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0))) THEN
    RAISE EXCEPTION 'price_input_function_properties_failed';
  END IF;
  RAISE NOTICE 'PRICE_INPUT_CASES_PASS: %', total;
END $test$;

DO $regression$
DECLARE rejected boolean := false; v jsonb;
BEGIN
  -- Reproduce the original bulk failure, isolated from the matrix's data loading.
  BEGIN
    PERFORM jsonb_agg(input_wire::jsonb ORDER BY ordinal) FROM price_input_cases;
  EXCEPTION WHEN SQLSTATE '22P05' THEN rejected := true;
  END;
  PERFORM pg_temp.assert_price_input_boundary(rejected, 'bulk_nul_reproduces_22P05');
  PERFORM pg_temp.assert_price_input_boundary(
    (SELECT count(*) = 1 AND bool_and(ordinal = 823 AND label = 'bad_amount_26'
      AND ok = false AND value IS NULL AND rejection_sqlstate = '22P05')
     FROM price_input_results WHERE stage = 'jsonb_decode'), 'original_nul_preserved_and_rejected');
  PERFORM pg_temp.assert_price_input_boundary(
    (SELECT count(*) = 844 FROM price_input_results WHERE stage = 'normalizer'), 'other_844_cases_reach_normalizer');

  -- A literal backslash-u sequence is valid jsonb text, but still NOT a price.
  v := $wire${"kind":"fixed","amount":"1\\u0000","currency":"EUR"}$wire$::jsonb;
  rejected := false;
  BEGIN
    PERFORM public.normalize_listing_price_v1(v);
  EXCEPTION WHEN SQLSTATE '22023' THEN rejected := true;
  END;
  PERFORM pg_temp.assert_price_input_boundary(
    v->>'amount' = $literal$1\u0000$literal$ AND rejected, 'escaped_backslash_is_normalizer_rejection');
  PERFORM pg_temp.assert_price_input_boundary(
    public.normalize_listing_price_v1('{"kind":"free","amount":null,"currency":null}'::jsonb)
      = '{"kind":"free","amount":null,"currency":null}'::jsonb, 'json_null_is_not_nul_character');
  PERFORM pg_temp.assert_price_input_boundary(
    public.normalize_listing_price_v1('{"kind":"fixed","amount":"0","currency":"EUR"}'::jsonb)
      = '{"kind":"fixed","amount":"0","currency":"EUR"}'::jsonb, 'fixed_zero_remains_fixed');
  PERFORM pg_temp.assert_price_input_boundary(
    public.normalize_listing_price_v1('{"kind":"fixed","amount":"999999999999999999.999","currency":"KWD"}'::jsonb)
      = '{"kind":"fixed","amount":"999999999999999999.999","currency":"KWD"}'::jsonb, 'large_exact_amount_preserved');
  PERFORM pg_temp.assert_price_input_boundary(
    (SELECT count(*) = 2 AND array_agg(p.proname::text ORDER BY p.proname)
      = ARRAY['listing_price_currency_scale_v1','normalize_listing_price_v1']::text[]
      AND bool_and(p.provolatile = 'i' AND NOT p.prosecdef AND p.proconfig IS NOT NULL)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public')
    AND NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
      LATERAL aclexplode(COALESCE(p.proacl, acldefault('f',p.proowner))) a
      WHERE n.nspname = 'public' AND a.grantee = 0 AND a.privilege_type = 'EXECUTE'
    ), 'exact_two_closed_value_functions');
  RAISE NOTICE 'PRICE_INPUT_BOUNDARY_REGRESSIONS_PASS: %', (SELECT count(*) FROM price_input_boundary_checks);
END $regression$;

-- Preserve the ORIGINAL client comparison envelope and all 845 outcomes unchanged.
SELECT jsonb_build_object('version',1,'count',(SELECT count(*) FROM price_input_results),
 'scales',(SELECT jsonb_object_agg(code,scale) FROM price_input_scales),
 'results',(SELECT jsonb_agg(jsonb_build_object('label',label,'ok',ok,'value',value) ORDER BY ordinal) FROM price_input_results));
-- Separate evidence makes the one pre-function rejection explicit, never a function PASS.
SELECT jsonb_build_object('format','selqiro_price_input_boundary_v1',
 'normalizer_cases',(SELECT count(*) FROM price_input_results WHERE stage = 'normalizer'),
 'decode_rejections',(SELECT jsonb_agg(jsonb_build_object('ordinal',ordinal,'label',label,'sqlstate',rejection_sqlstate) ORDER BY ordinal)
   FROM price_input_results WHERE stage = 'jsonb_decode'),
 'regressions',(SELECT jsonb_agg(label ORDER BY ordinal) FROM price_input_boundary_checks));
