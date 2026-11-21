CREATE OR REPLACE FUNCTION public.get_public_profile_jobs_v1(p_seller_slug text,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;identity_value uuid;identities uuid[];
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug) NOT BETWEEN 1 AND 160 OR p_seller_slug<>btrim(p_seller_slug)
 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION 'job_profile_invalid' USING ERRCODE='22023';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'published_at');
 SELECT array_agg(identity_id) INTO identities FROM(SELECT ip.identity_id FROM public.identity_profiles ip
 JOIN public.identities i ON i.id=ip.identity_id AND i.type IN('private','business') AND i.status='active'
 WHERE ip.slug=p_seller_slug LIMIT 2) known;
 IF cardinality(identities)=1 THEN identity_value:=identities[1];END IF;
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=identity_value
 AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>'published_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('published_at',published_at,'id',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'seller_slug',p_seller_slug,'identity_id',identity_value,
 'items',items,'result_limit',p_result_limit,'has_more',more,'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,
 'read_at',statement_timestamp());
END $f$;

CREATE OR REPLACE FUNCTION public.search_public_jobs_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,
 p_country_code text DEFAULT NULL,p_city text DEFAULT NULL,p_workplace_type text DEFAULT NULL,
 p_employment_type text DEFAULT NULL,p_working_time text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET plan_cache_mode=force_custom_plan AS $f$
DECLARE cursor_value jsonb;query_value text:=btrim(coalesce(p_query,''));words tsquery;items jsonb;more boolean;next_value jsonb;
BEGIN
 IF length(query_value)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR (p_category IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=p_category))
 OR (p_country_code IS NOT NULL AND p_country_code !~ '^[A-Z]{2}$') OR char_length(p_city)>160
 OR (p_workplace_type IS NOT NULL AND p_workplace_type NOT IN('on_site','remote','hybrid'))
 OR (p_employment_type IS NOT NULL AND p_employment_type NOT IN('permanent','fixed_term','contract','internship','other','task'))
 OR (p_working_time IS NOT NULL AND p_working_time NOT IN('full_time','part_time','flexible','other')) THEN
 RAISE EXCEPTION 'job_search_invalid' USING ERRCODE='22023';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'published_at');
 words:=plainto_tsquery('pg_catalog.simple'::regconfig,query_value);
 WITH viewer_hidden AS MATERIALIZED(SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()),
 candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j
 WHERE j.status='published' AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.provider_identity_id=j.identity_id)
 AND (p_category IS NULL OR j.category=p_category) AND (p_country_code IS NULL OR j.country_code=p_country_code)
 AND (p_city IS NULL OR lower(j.city)=lower(btrim(p_city)))
 AND (p_workplace_type IS NULL OR j.workplace_type=p_workplace_type)
 AND (p_employment_type IS NULL OR j.employment_type=p_employment_type)
 AND (p_working_time IS NULL OR j.working_time=p_working_time)
 AND (query_value='' OR jobs_private.search_document(j.title,j.description,j.category,j.city,j.country_code)@@words)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>'published_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('published_at',published_at,'id',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'items',items,'result_limit',p_result_limit,'has_more',more,
 'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,'read_at',statement_timestamp());
END $f$;
