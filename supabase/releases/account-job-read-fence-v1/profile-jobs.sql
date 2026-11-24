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
 IF identity_value IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
  WHERE i.id=identity_value AND i.type IN('private','business')
  AND account_lifecycle_private.account_is_available(CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 ) THEN identity_value:=NULL;END IF;
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
