-- TEST-ONLY regression: actual PL/pgSQL compiler and the two unchanged length limits.
-- Runs after the repaired candidate has compiled, in the same disposable rollback batch.
SET LOCAL check_function_bodies=on;
DO $regression$
DECLARE input_value jsonb := '{"basics":{"title":"Test title","description":"Test description","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":"0","longitude":"0"},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90KW","model":"Gaz 53"},"language":"et"}'::jsonb; got_code text; got_message text; normalized jsonb;
BEGIN
 BEGIN
  EXECUTE $broken$CREATE FUNCTION public.creation_unparenthesized_case_probe_v3()
    RETURNS boolean LANGUAGE plpgsql AS $body$
    BEGIN
      IF 21 > CASE WHEN true THEN 20 ELSE 160 END THEN RETURN true; END IF;
      RETURN false;
    END $body$;$broken$;
 EXCEPTION WHEN syntax_error THEN got_code:=SQLSTATE;
 END;
 IF got_code IS DISTINCT FROM '42601' THEN
  RAISE EXCEPTION 'CREATION_SYNTAX_ASSERT_FAILED: original_case_compile_error';
 END IF;
 RAISE NOTICE 'CREATION_SYNTAX_PASS: original_case_compile_error';
 normalized:=public.normalize_listing_creation_v1(jsonb_set(input_value,'{attributes,vehicle_year}',to_jsonb(repeat('1',20))));
 IF normalized->'attributes'->>'vehicle_year' IS DISTINCT FROM repeat('1',20) THEN
  RAISE EXCEPTION 'CREATION_SYNTAX_ASSERT_FAILED: year_limit_accept_20';
 END IF;
 RAISE NOTICE 'CREATION_SYNTAX_PASS: year_limit_accept_20';
 got_code:=NULL; got_message:=NULL;
 BEGIN
  PERFORM public.normalize_listing_creation_v1(jsonb_set(input_value,'{attributes,vehicle_year}',to_jsonb(repeat('1',21))));
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS got_code=RETURNED_SQLSTATE,got_message=MESSAGE_TEXT;
 END;
 IF got_code IS DISTINCT FROM '22023' OR got_message IS DISTINCT FROM 'listing_create_attributes_invalid' THEN
  RAISE EXCEPTION 'CREATION_SYNTAX_ASSERT_FAILED: year_limit_reject_21';
 END IF;
 RAISE NOTICE 'CREATION_SYNTAX_PASS: year_limit_reject_21';
 normalized:=public.normalize_listing_creation_v1(jsonb_set(input_value,'{attributes,manufacturer}',to_jsonb(repeat('M',160))));
 IF normalized->'attributes'->>'manufacturer' IS DISTINCT FROM repeat('M',160) THEN
  RAISE EXCEPTION 'CREATION_SYNTAX_ASSERT_FAILED: other_limit_accept_160';
 END IF;
 RAISE NOTICE 'CREATION_SYNTAX_PASS: other_limit_accept_160';
 got_code:=NULL; got_message:=NULL;
 BEGIN
  PERFORM public.normalize_listing_creation_v1(jsonb_set(input_value,'{attributes,manufacturer}',to_jsonb(repeat('M',161))));
 EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS got_code=RETURNED_SQLSTATE,got_message=MESSAGE_TEXT;
 END;
 IF got_code IS DISTINCT FROM '22023' OR got_message IS DISTINCT FROM 'listing_create_attributes_invalid' THEN
  RAISE EXCEPTION 'CREATION_SYNTAX_ASSERT_FAILED: other_limit_reject_161';
 END IF;
 RAISE NOTICE 'CREATION_SYNTAX_PASS: other_limit_reject_161';
END $regression$;
