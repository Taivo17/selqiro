CREATE FUNCTION public.get_jobs_capabilities_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'release','jobs-public-v1','public_search',true,'public_profile',true,
 'public_detail',true,'business_publication',true,'validity','one_calendar_month_utc','request_receipts',true);
$f$;
CREATE FUNCTION public.get_job_categories_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'items',jsonb_agg(jsonb_build_object('code',c.code,
 'labels',jsonb_build_object('et',c.label_et,'en',c.label_en)) ORDER BY c.sort_order)) FROM jobs_private.categories c;
$f$;
CREATE FUNCTION public.get_public_job_v1(p_job_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.public_fields(j) FROM public.jobs j WHERE j.id=p_job_id
 AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id);
$f$;
CREATE FUNCTION public.get_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE j public.jobs%ROWTYPE;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id AND identity_id=p_expected_identity_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_unavailable' USING ERRCODE='42501';END IF;
 RETURN jobs_private.owner_fields(j,p_expected_user_id);
END $f$;
CREATE FUNCTION public.get_my_job_policies_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'documents',jobs_private.current_policies());
END $f$;
CREATE FUNCTION public.get_my_job_request_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jobs_private.requests%ROWTYPE;present boolean;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 PERFORM jobs_private.require_key(p_request_key);
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 present:=FOUND;
 IF present AND r.identity_id IS DISTINCT FROM p_expected_identity_id THEN
 RAISE EXCEPTION 'job_request_identity_changed' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'request_key',p_request_key,'found',present,'operation',r.operation,'request',r.request,'result',r.result);
END $f$;
CREATE FUNCTION public.get_my_jobs_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;read_time timestamptz:=statement_timestamp();
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION 'job_page_invalid' USING ERRCODE='22023';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'created_at');
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=p_expected_identity_id
 AND (cursor_value IS NULL OR (j.created_at,j.id)<((cursor_value->>'created_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.created_at DESC,j.id DESC LIMIT p_result_limit+1), page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.owner_fields(p,p_expected_user_id) ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('created_at',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'items',items,'result_limit',p_result_limit,'has_more',more,'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,'read_at',read_time);
END $f$;
CREATE FUNCTION public.get_public_profile_jobs_v1(p_seller_slug text,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;identity_value uuid;identities uuid[];
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug) NOT BETWEEN 1 AND 160 OR p_seller_slug<>btrim(p_seller_slug)
 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION 'job_profile_invalid' USING ERRCODE='22023';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'published_at');
 SELECT array_agg(identity_id) INTO identities FROM(SELECT ip.identity_id FROM public.identity_profiles ip
 JOIN public.identities i ON i.id=ip.identity_id AND i.type='business' AND i.status='active'
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
