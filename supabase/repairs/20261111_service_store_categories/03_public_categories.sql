-- A viewed profile's category choices come from the whole visible section,
-- before category selection or pagination. Owner category readers stay intact.
CREATE FUNCTION public.get_public_profile_store_categories_v2(
 p_seller_slug text,p_content_scope text,
 p_result_limit integer DEFAULT 100,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan SET timezone='UTC'
AS $fn$
DECLARE
 actor uuid:=public.listing_actor_uid_hosted_v1();
 identity_value uuid;profile_identities uuid[];result jsonb;
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
  OR p_seller_slug<>btrim(p_seller_slug) THEN
  RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';END IF;
 IF p_content_scope IS NULL OR p_content_scope NOT IN('marketplace','services') THEN
  RAISE EXCEPTION 'public_profile_scope_invalid' USING ERRCODE='22023';END IF;
 IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>100
  OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
  RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';END IF;
 SELECT array_agg(candidate.identity_id) INTO profile_identities FROM (
  SELECT ip.identity_id FROM public.identity_profiles ip
  JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
  WHERE ip.slug=p_seller_slug LIMIT 2
 ) candidate;
 IF cardinality(profile_identities)=1 THEN identity_value:=profile_identities[1];END IF;

 WITH RECURSIVE linked_categories(id) AS (
  SELECT x.store_category_id FROM public.listing_store_categories x
  JOIN public.listings l ON l.id=x.listing_id
  WHERE p_content_scope='marketplace' AND l.identity_id=identity_value
   AND l.status='active' AND l.active_until>now()
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
      OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
  UNION
  SELECT x.store_category_id FROM public.horse_offer_store_categories x
  JOIN public.horse_offers h ON h.id=x.horse_offer_id
  WHERE p_content_scope='marketplace' AND h.identity_id=identity_value
   AND horse_publication_private.is_public(h.id)
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id)
      OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
  UNION
  SELECT x.store_category_id FROM public.service_store_categories x
  JOIN public.services s ON s.id=x.service_id
  WHERE p_content_scope='services' AND s.identity_id=identity_value
   AND service_publication_private.is_public(s.id)
   AND service_publication_private.visible_to_viewer(s.id)
 ), visible_categories(id,parent_id) AS (
  SELECT c.id,c.parent_id FROM public.store_categories c
  JOIN linked_categories x ON x.id=c.id WHERE c.identity_id=identity_value
  UNION
  SELECT c.id,c.parent_id FROM public.store_categories c
  JOIN visible_categories child ON child.parent_id=c.id
  WHERE c.identity_id=identity_value
 ), matched AS MATERIALIZED (
  SELECT c.id,c.identity_id,c.name,c.parent_id,c.sort_order,c.created_at
  FROM public.store_categories c JOIN visible_categories visible ON visible.id=c.id
  WHERE c.identity_id=identity_value
 ), page AS (
  SELECT * FROM matched ORDER BY sort_order ASC NULLS LAST,created_at ASC NULLS LAST,id ASC
  LIMIT p_result_limit OFFSET p_result_offset
 ), totals AS (SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',2,'content_scope','public_profile_store_categories',
  'filter_scope',p_content_scope,'seller_slug',p_seller_slug,'identity_id',identity_value::text,
  'profile_available',identity_value IS NOT NULL,
  'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',id::text,'identity_id',identity_id::text,'name',name,
    'parent_id',parent_id::text,'sort_order',sort_order)
    ORDER BY sort_order ASC NULLS LAST,created_at ASC NULLS LAST,id ASC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
   THEN p_result_offset+p_result_limit ELSE NULL END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $fn$;
ALTER FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) TO anon,authenticated;
COMMENT ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) IS
 'Only categories with visible canonical content in the viewed profile section, plus same-identity ancestors. Marketplace follows listing/horse public visibility and blocks; services follow service public/viewer checks. Owner readers are unchanged.';
