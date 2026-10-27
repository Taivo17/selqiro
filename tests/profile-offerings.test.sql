-- Targeted checks for the new public-profile read contracts only.
-- Run against the independently isolated native fixture. Its runner sets the
-- session GUC selqiro.profile_offerings_test to its synthetic seed manifest.
-- This suite creates no fixture, grants no privilege and changes no data.
BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='2s';
SET LOCAL timezone='UTC';

DO $test$
DECLARE
  manifest jsonb := nullif(current_setting('selqiro.profile_offerings_test',true),'')::jsonb;
  rpc_name text;
  signature text;
  api_role text;
  actor uuid;
  viewer integer;
  seller_slug text;
  seller_identity uuid;
  bounded_identity uuid;
  response jsonb;
  limited jsonb;
  baseline_services jsonb;
  baseline_showcases jsonb;
  item jsonb;
  image jsonb;
  expected_ids jsonb;
  expected_images jsonb;
  image_map_key text;
  parent_key text;
  expected_scope text;
  private_id uuid;
  field_name text;
  checked boolean;
  denied boolean;
  row_count bigint;
  bad_limit integer;
  bad_slug text;
  hidden_slug text;
  first_parent uuid;
  passed text[] := ARRAY[]::text[];
BEGIN
  IF manifest IS NULL
     OR manifest->>'kind' IS DISTINCT FROM 'selqiro_profile_offerings_fixture_v1'
     OR manifest->>'database' IS DISTINCT FROM current_database()
     OR current_user<>'postgres'
     OR current_setting('transaction_read_only')<>'on' THEN
    RAISE EXCEPTION 'profile_offerings_test_requires_its_isolated_read_only_fixture';
  END IF;
  seller_slug := nullif(manifest->>'seller_slug','');
  seller_identity := (manifest->>'seller_identity_id')::uuid;
  bounded_identity := (manifest->>'bounded_identity_id')::uuid;
  IF seller_slug IS NULL OR seller_identity IS NULL OR bounded_identity IS NULL
     OR (manifest->>'seller_user_id')::uuid IS NULL
     OR (manifest->>'buyer_user_id')::uuid IS NULL
     OR manifest->>'seller_user_id'=manifest->>'buyer_user_id' THEN
    RAISE EXCEPTION 'profile_offerings_fixture_actor_bindings_missing';
  END IF;
  FOREACH field_name IN ARRAY ARRAY[
    'public_service_ids','public_showcase_ids','private_service_ids','private_showcase_ids'
  ] LOOP
    IF jsonb_typeof(manifest->field_name) IS DISTINCT FROM 'array'
       OR jsonb_array_length(manifest->field_name)<1 THEN
      RAISE EXCEPTION 'profile_offerings_fixture_expected_ids_missing: %',field_name;
    END IF;
  END LOOP;
  IF jsonb_typeof(manifest->'service_image_ids') IS DISTINCT FROM 'object'
     OR jsonb_typeof(manifest->'showcase_image_ids') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'profile_offerings_fixture_expected_images_missing';
  END IF;

  -- Preconditions make negative and bound checks non-vacuous. These rows were
  -- created by the isolated fixture, not by this suite.
  IF (SELECT count(*) FROM public.identity_profiles ip JOIN public.identities i
      ON i.id=ip.identity_id AND i.status='active'
      WHERE ip.slug=manifest->>'duplicate_slug')<2 THEN
    RAISE EXCEPTION 'fixture_missing_adversarial_duplicate_slug';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.identity_profiles ip JOIN public.identities i
      ON i.id=ip.identity_id AND i.status<>'active'
      WHERE ip.slug=manifest->>'inactive_slug')
     OR EXISTS (SELECT 1 FROM public.identity_profiles ip JOIN public.identities i
      ON i.id=ip.identity_id AND i.status='active'
      WHERE ip.slug=manifest->>'inactive_slug') THEN
    RAISE EXCEPTION 'fixture_missing_unambiguously_inactive_profile';
  END IF;
  IF EXISTS (SELECT 1 FROM public.identity_profiles
      WHERE slug='__selqiro_missing_profile_offerings__') THEN
    RAISE EXCEPTION 'fixture_missing_slug_is_not_absent';
  END IF;
  IF (SELECT count(*) FROM public.services WHERE identity_id=bounded_identity
      AND status='published')<81
     OR (SELECT count(*) FROM public.product_showcases WHERE identity_id=bounded_identity
      AND status='published' AND active_until>now())<81 THEN
    RAISE EXCEPTION 'fixture_requires_more_than_eighty_public_parents';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.service_images si
      WHERE si.service_id::text IN (SELECT jsonb_array_elements_text(manifest->'public_service_ids'))
        AND si.identity_id<>seller_identity)
     OR NOT EXISTS (SELECT 1 FROM public.product_showcase_images si
      WHERE si.showcase_id::text IN (SELECT jsonb_array_elements_text(manifest->'public_showcase_ids'))
        AND si.identity_id<>seller_identity) THEN
    RAISE EXCEPTION 'fixture_requires_cross_identity_gallery_rows';
  END IF;
  passed := array_append(passed,'nonvacuous_isolated_fixture_preconditions');

  FOREACH rpc_name IN ARRAY ARRAY['get_public_profile_services_v1','get_public_profile_showcases_v1'] LOOP
    signature := 'public.'||rpc_name||'(text,integer)';
    SELECT p.prosecdef AND p.provolatile='s' AND p.prokind='f'
      AND pg_get_userbyid(p.proowner)='postgres'
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c
        WHERE replace(c,' ','')='search_path=pg_catalog,public,auth,pg_temp')
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE lower(c)='timezone=utc')
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) c WHERE c='plan_cache_mode=force_custom_plan')
      AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE a.grantee=0 AND a.privilege_type='EXECUTE')
      INTO checked FROM pg_proc p WHERE p.oid=signature::regprocedure;
    IF checked IS DISTINCT FROM true
       OR NOT has_function_privilege('anon',signature,'EXECUTE')
       OR NOT has_function_privilege('authenticated',signature,'EXECUTE')
       OR has_function_privilege('service_role',signature,'EXECUTE') THEN
      RAISE EXCEPTION 'unexpected_public_offerings_function_metadata_or_isolated_grant: %',rpc_name;
    END IF;
    passed := array_append(passed,rpc_name||'_fixed_read_boundary_and_exact_api_grants');
  END LOOP;
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_function_privilege(api_role,'public.current_user_has_identity_access(uuid)','EXECUTE') THEN
      RAISE EXCEPTION 'owner_helper_must_remain_closed: %',api_role;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname IN
       ('services','product_showcases','service_images','product_showcase_images')
       AND c.relrowsecurity)=4 IS NOT TRUE THEN
    RAISE EXCEPTION 'existing_offering_and_gallery_rls_must_stay_enabled';
  END IF;
  passed := array_append(passed,'owner_helper_closed_and_existing_rls_enabled');

  -- Distinct authenticated claims and a genuinely anonymous role read the same
  -- public projection. The request clock is the database transaction clock.
  FOR viewer IN 0..2 LOOP
    api_role := CASE WHEN viewer=0 THEN 'anon' ELSE 'authenticated' END;
    actor := CASE WHEN viewer=0 THEN NULL
      WHEN viewer=1 THEN (manifest->>'seller_user_id')::uuid
      ELSE (manifest->>'buyer_user_id')::uuid END;
    PERFORM set_config('request.jwt.claim.sub',coalesce(actor::text,''),true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('role',api_role,'sub',actor)::text,true);
    EXECUTE format('SET LOCAL ROLE %I',api_role);
    IF current_user<>api_role OR auth.uid() IS DISTINCT FROM actor THEN
      RAISE EXCEPTION 'test_viewer_identity_was_not_selected';
    END IF;

    FOREACH rpc_name IN ARRAY ARRAY['get_public_profile_services_v1','get_public_profile_showcases_v1'] LOOP
      IF rpc_name='get_public_profile_services_v1' THEN
        expected_ids := manifest->'public_service_ids';
        image_map_key := 'service_image_ids';
        parent_key := 'service_id';
        expected_scope := 'public_profile_services';
      ELSE
        expected_ids := manifest->'public_showcase_ids';
        image_map_key := 'showcase_image_ids';
        parent_key := 'showcase_id';
        expected_scope := 'public_profile_product_showcases';
      END IF;
      EXECUTE format('SELECT public.%I($1,$2)',rpc_name) INTO response USING seller_slug,80;
      IF (SELECT array_agg(k ORDER BY k) FROM jsonb_object_keys(response) k)
          IS DISTINCT FROM ARRAY['content_scope','identity_id','items','profile_available','read_at','result_limit','schema_version','seller_slug']
         OR response->>'schema_version' IS DISTINCT FROM '1'
         OR response->>'content_scope' IS DISTINCT FROM expected_scope
         OR response->>'seller_slug' IS DISTINCT FROM seller_slug
         OR response->>'identity_id' IS DISTINCT FROM seller_identity::text
         OR response->'profile_available' IS DISTINCT FROM 'true'::jsonb
         OR response->>'result_limit' IS DISTINCT FROM '80'
         OR (response->>'read_at')::timestamptz IS DISTINCT FROM now()
         OR jsonb_path_query_array(response,'$.items[*].id') IS DISTINCT FROM expected_ids THEN
        RAISE EXCEPTION 'public_projection_envelope_or_expected_parents_failed: %,viewer %',rpc_name,viewer;
      END IF;
      IF response::text ~ '"(storage_path|uploaded_by_user_id|service_lat|service_lng|external_url)"[[:space:]]*:' THEN
        RAISE EXCEPTION 'nonpublic_field_in_projection: %',rpc_name;
      END IF;
      FOR item IN SELECT value FROM jsonb_array_elements(response->'items') LOOP
        IF item->>'identity_id' IS DISTINCT FROM seller_identity::text
           OR item->>'status' IS DISTINCT FROM 'published'
           OR jsonb_typeof(item->'images') IS DISTINCT FROM 'array'
           OR jsonb_array_length(item->'images')>10 THEN
          RAISE EXCEPTION 'public_parent_identity_status_or_gallery_bound_failed';
        END IF;
        IF rpc_name='get_public_profile_showcases_v1'
           AND (item->>'active_until')::timestamptz<=(response->>'read_at')::timestamptz THEN
          RAISE EXCEPTION 'expired_showcase_exposed';
        END IF;
        expected_images := manifest->image_map_key->(item->>'id');
        IF jsonb_typeof(expected_images) IS DISTINCT FROM 'array'
           OR jsonb_path_query_array(item,'$.images[*].id') IS DISTINCT FROM expected_images THEN
          RAISE EXCEPTION 'exact_ordered_public_gallery_failed: %,parent %',rpc_name,item->>'id';
        END IF;
        FOR image IN SELECT value FROM jsonb_array_elements(item->'images') LOOP
          IF image->>'identity_id' IS DISTINCT FROM seller_identity::text
             OR image->>parent_key IS DISTINCT FROM item->>'id' THEN
            RAISE EXCEPTION 'foreign_gallery_image_exposed';
          END IF;
        END LOOP;
      END LOOP;
      IF rpc_name='get_public_profile_services_v1' THEN
        IF viewer=0 THEN baseline_services:=response;
        ELSIF response IS DISTINCT FROM baseline_services THEN
          RAISE EXCEPTION 'services_public_projection_depends_on_viewer_owner_state';
        END IF;
      ELSE
        IF viewer=0 THEN baseline_showcases:=response;
        ELSIF response IS DISTINCT FROM baseline_showcases THEN
          RAISE EXCEPTION 'showcases_public_projection_depends_on_viewer_owner_state';
        END IF;
      END IF;
      passed := array_append(passed,rpc_name||'_public_rows_bound_gallery_viewer_'||viewer::text);
    END LOOP;

    denied := false;
    BEGIN
      PERFORM public.current_user_has_identity_access(seller_identity);
    EXCEPTION WHEN insufficient_privilege THEN denied:=true;
    END;
    IF NOT denied THEN RAISE EXCEPTION 'owner_helper_api_call_was_not_denied'; END IF;

    FOREACH field_name IN ARRAY ARRAY['private_service_ids','private_showcase_ids'] LOOP
      FOR private_id IN SELECT value::uuid FROM jsonb_array_elements_text(manifest->field_name) LOOP
        denied:=false; row_count:=NULL;
        BEGIN
          IF field_name='private_service_ids' THEN
            SELECT count(*) INTO row_count FROM public.services WHERE id=private_id;
          ELSE
            SELECT count(*) INTO row_count FROM public.product_showcases WHERE id=private_id;
          END IF;
        EXCEPTION WHEN insufficient_privilege THEN denied:=true;
        END;
        IF NOT denied AND row_count IS DISTINCT FROM 0::bigint THEN
          RAISE EXCEPTION 'private_parent_visible_through_table_api: %,viewer %',field_name,viewer;
        END IF;
      END LOOP;
    END LOOP;
    passed:=array_append(passed,'helper_and_private_table_access_denied_viewer_'||viewer::text);
    EXECUTE 'RESET ROLE';
  END LOOP;

  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{"role":"anon","sub":null}',true);
  EXECUTE 'SET LOCAL ROLE anon';
  FOREACH rpc_name IN ARRAY ARRAY['get_public_profile_services_v1','get_public_profile_showcases_v1'] LOOP
    FOREACH hidden_slug IN ARRAY ARRAY[
      manifest->>'inactive_slug',manifest->>'duplicate_slug','__selqiro_missing_profile_offerings__'
    ] LOOP
      EXECUTE format('SELECT public.%I($1,$2)',rpc_name) INTO response USING hidden_slug,80;
      IF response->'profile_available' IS DISTINCT FROM 'false'::jsonb
         OR response->'identity_id' IS DISTINCT FROM 'null'::jsonb
         OR response->'items' IS DISTINCT FROM '[]'::jsonb
         OR response->>'seller_slug' IS DISTINCT FROM hidden_slug THEN
        RAISE EXCEPTION 'unavailable_profile_exposed_content: %,slug %',rpc_name,hidden_slug;
      END IF;
    END LOOP;
    passed:=array_append(passed,rpc_name||'_inactive_duplicate_missing_profiles_unavailable');
    IF manifest ? 'empty_slug' THEN
      EXECUTE format('SELECT public.%I($1,$2)',rpc_name) INTO response USING manifest->>'empty_slug',80;
      IF response->'profile_available' IS DISTINCT FROM 'true'::jsonb
         OR response->>'identity_id' IS DISTINCT FROM manifest->>'empty_identity_id'
         OR response->'items' IS DISTINCT FROM '[]'::jsonb THEN
        RAISE EXCEPTION 'genuine_empty_profile_not_distinguished_from_unavailable';
      END IF;
      passed:=array_append(passed,rpc_name||'_genuine_empty_profile');
    END IF;

    first_parent := CASE WHEN rpc_name='get_public_profile_services_v1'
      THEN (manifest->>'bounded_first_service_id')::uuid
      ELSE (manifest->>'bounded_first_showcase_id')::uuid END;
    EXECUTE format('SELECT public.%I($1)',rpc_name) INTO response USING manifest->>'bounded_slug';
    EXECUTE format('SELECT public.%I($1,$2)',rpc_name) INTO limited USING manifest->>'bounded_slug',1;
    IF response->>'identity_id' IS DISTINCT FROM bounded_identity::text
       OR response->>'result_limit' IS DISTINCT FROM '80'
       OR jsonb_array_length(response->'items')<>80
       OR response#>>'{items,0,id}' IS DISTINCT FROM first_parent::text
       OR jsonb_array_length(response#>'{items,0,images}')<>10
       OR limited->>'result_limit' IS DISTINCT FROM '1'
       OR jsonb_array_length(limited->'items')<>1
       OR limited#>'{items,0}' IS DISTINCT FROM response#>'{items,0}'
       OR EXISTS (SELECT 1 FROM jsonb_array_elements(response->'items') p
         WHERE jsonb_array_length(p->'images')>10) THEN
      RAISE EXCEPTION 'parent_or_per_parent_gallery_bound_or_stable_order_failed: %',rpc_name;
    END IF;
    passed:=array_append(passed,rpc_name||'_default_80_explicit_1_per_parent_10_stable_order');

    FOREACH bad_limit IN ARRAY ARRAY[NULL::integer,0,81] LOOP
      denied:=false;
      BEGIN
        EXECUTE format('SELECT public.%I($1,$2)',rpc_name) USING seller_slug,bad_limit;
      EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
      END;
      IF NOT denied THEN RAISE EXCEPTION 'invalid_result_limit_accepted: %',rpc_name; END IF;
    END LOOP;
    FOREACH bad_slug IN ARRAY ARRAY[NULL::text,'',' '||seller_slug,seller_slug||' ',repeat('a',161)] LOOP
      denied:=false;
      BEGIN
        EXECUTE format('SELECT public.%I($1,$2)',rpc_name) USING bad_slug,1;
      EXCEPTION WHEN invalid_parameter_value THEN denied:=true;
      END;
      IF NOT denied THEN RAISE EXCEPTION 'invalid_seller_slug_accepted: %',rpc_name; END IF;
    END LOOP;
    passed:=array_append(passed,rpc_name||'_invalid_slug_and_limit_rejected');
  END LOOP;
  EXECUTE 'RESET ROLE';

  -- Verify the seeded gallery capacity as postgres only after API observations.
  IF (SELECT count(*) FROM public.service_images WHERE identity_id=bounded_identity
      AND service_id=(manifest->>'bounded_first_service_id')::uuid)<11
     OR (SELECT count(*) FROM public.product_showcase_images WHERE identity_id=bounded_identity
      AND showcase_id=(manifest->>'bounded_first_showcase_id')::uuid)<11 THEN
    RAISE EXCEPTION 'fixture_requires_more_than_ten_exact_parent_images';
  END IF;
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_function_privilege(api_role,'public.current_user_has_identity_access(uuid)','EXECUTE') THEN
      RAISE EXCEPTION 'owner_helper_acl_changed_during_public_reads';
    END IF;
  END LOOP;
  passed:=array_append(passed,'helper_acl_preserved_after_all_read_only_calls');
  RAISE NOTICE 'SELQIRO_PROFILE_OFFERINGS_CHECKS %',jsonb_build_object(
    'status','PASS','count',cardinality(passed),'checks',to_jsonb(passed),
    'transaction_read_only',current_setting('transaction_read_only')
  );
END $test$;
ROLLBACK;
