CREATE OR REPLACE FUNCTION public.search_public_services_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,p_subcategory text DEFAULT NULL,
 p_country text DEFAULT NULL,p_city text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'')));
BEGIN
 IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160
 OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION 'service_search_invalid' USING ERRCODE='22023';END IF;
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()), candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=s.identity_id) AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
 AND (nullif(btrim(p_category),'') IS NULL OR s.category=btrim(p_category))
 AND (nullif(btrim(p_subcategory),'') IS NULL OR s.subcategory=btrim(p_subcategory))
 AND (nullif(btrim(p_country),'') IS NULL OR lower(s.country)=lower(btrim(p_country)))
 AND (nullif(btrim(p_city),'') IS NULL OR lower(s.city)=lower(btrim(p_city)))
 AND (query='' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,'\s+') token
 WHERE token<>'' AND position(token IN lower(concat_ws(' ',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),
 page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)
 ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),'[]'::jsonb) INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'items',items,'total_count',total::text,'result_limit',p_result_limit,
 'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;
