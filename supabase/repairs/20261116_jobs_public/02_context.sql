CREATE FUNCTION jobs_private.require_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND type='business' AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_business_required' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM public.business_accounts WHERE id=i.business_account_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_business_unavailable' USING ERRCODE='42501';END IF;
 -- Shared actor already locks active membership; retain an explicit domain check.
 PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
 AND user_id=p_user AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_business_forbidden' USING ERRCODE='42501';END IF;
END $f$;
CREATE FUNCTION jobs_private.require_key(p_key uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN IF p_key IS NULL OR p_key='00000000-0000-0000-0000-000000000000'::uuid THEN
 RAISE EXCEPTION 'job_request_key_invalid' USING ERRCODE='22023';END IF;END $f$;
CREATE FUNCTION jobs_private.require_revision(p_revision text) RETURNS bigint LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF p_revision IS NULL OR p_revision !~ '^[1-9][0-9]{0,18}$' OR p_revision::numeric>9223372036854775807 THEN
 RAISE EXCEPTION 'job_revision_invalid' USING ERRCODE='22023';END IF;
 RETURN p_revision::bigint;
END $f$;
CREATE FUNCTION jobs_private.calendar_month_after(p_time timestamptz) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF p_time IS NULL OR NOT isfinite(p_time) THEN RAISE EXCEPTION 'job_time_invalid' USING ERRCODE='22023';END IF;
 RETURN p_time+interval '1 month';
END $f$;
CREATE FUNCTION jobs_private.current_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE result jsonb;t timestamptz;
BEGIN
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;t:=clock_timestamp();
 -- Country-scoped rules require a separate reviewed country-policy contract.
 IF EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active'
 AND 'job'=ANY(p.applies_to_content_types) AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t) AND p.country_code IS NOT NULL) THEN
 RAISE EXCEPTION 'job_policy_country_scope_unresolved' USING ERRCODE='55000';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('documentId',p.id,'version',p.policy_version,'contentHash',p.content_hash,
 'title',p.title,'body',p.body_text,'locale',p.locale) ORDER BY p.id),'[]'::jsonb) INTO result
 FROM public.publication_policy_documents p WHERE p.status='active' AND p.locale='et-EE' AND p.country_code IS NULL
 AND 'job'=ANY(p.applies_to_content_types) AND p.requires_user_acceptance AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t);
 IF jsonb_array_length(result) NOT BETWEEN 1 AND 20 OR NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p
 WHERE p.policy_key='marketplace-general' AND p.id IN(SELECT (x->>'documentId')::uuid FROM jsonb_array_elements(result) x)) THEN
 RAISE EXCEPTION 'job_policy_unavailable' USING ERRCODE='55000';END IF;
 RETURN result;
END $f$;
CREATE FUNCTION jobs_private.accept_policies(p_user uuid,p_identity uuid,p_shown jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE documents jsonb;expected jsonb;shown jsonb;d public.publication_policy_documents%ROWTYPE;
BEGIN
 documents:=jobs_private.current_policies();
 IF p_shown IS NULL OR jsonb_typeof(p_shown)<>'array' OR octet_length(p_shown::text)>16384 THEN
 RAISE EXCEPTION 'job_policy_consent_required' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_shown) x WHERE jsonb_typeof(x)<>'object'
 OR x-'documentId'-'version'-'contentHash'-'accepted'<>'{}'::jsonb OR x->'accepted' IS DISTINCT FROM 'true'::jsonb
 OR jsonb_typeof(x->'documentId') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'version') IS DISTINCT FROM 'string'
 OR jsonb_typeof(x->'contentHash') IS DISTINCT FROM 'string') THEN
 RAISE EXCEPTION 'job_policy_consent_required' USING ERRCODE='22023';END IF;
 SELECT jsonb_agg(jsonb_build_object('documentId',x->'documentId','version',x->'version','contentHash',x->'contentHash','accepted',true)
 ORDER BY x->>'documentId') INTO expected FROM jsonb_array_elements(documents) x;
 SELECT jsonb_agg(x ORDER BY x->>'documentId') INTO shown FROM jsonb_array_elements(p_shown) x;
 IF shown IS DISTINCT FROM expected THEN RAISE EXCEPTION 'job_policy_changed' USING ERRCODE='42501';END IF;
 FOR d IN SELECT p.* FROM public.publication_policy_documents p WHERE p.id IN
 (SELECT (x->>'documentId')::uuid FROM jsonb_array_elements(documents) x) FOR SHARE LOOP
  INSERT INTO public.user_publication_policy_acceptances(user_id,identity_id,policy_document_id,policy_key,policy_version,
  country_code,locale,content_hash,acceptance_source) VALUES(p_user,p_identity,d.id,d.policy_key,d.policy_version,
  d.country_code,d.locale,d.content_hash,'publication_gate') ON CONFLICT(user_id,policy_document_id) DO NOTHING;
 END LOOP;
 IF jobs_private.current_policies() IS DISTINCT FROM documents THEN
 RAISE EXCEPTION 'job_policy_changed' USING ERRCODE='42501';END IF;
END $f$;
CREATE FUNCTION jobs_private.cursor(p_cursor jsonb,p_time_key text) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE t timestamptz;u uuid;
BEGIN
 IF p_cursor IS NULL OR p_cursor='null'::jsonb THEN RETURN NULL;END IF;
 IF p_time_key NOT IN('created_at','published_at') OR jsonb_typeof(p_cursor)<>'object'
 OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY[p_time_key,'id']::text[]
 AND (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY['id',p_time_key]::text[]
 OR jsonb_typeof(p_cursor->p_time_key) IS DISTINCT FROM 'string' OR length(p_cursor->>p_time_key)>40
 OR jsonb_typeof(p_cursor->'id') IS DISTINCT FROM 'string'
 OR p_cursor->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
 RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END IF;
 BEGIN t:=(p_cursor->>p_time_key)::timestamptz;u:=(p_cursor->>'id')::uuid;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
 RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END;
 IF NOT isfinite(t) THEN RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END IF;
 RETURN jsonb_build_object(p_time_key,t,'id',u);
END $f$;
