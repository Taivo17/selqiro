-- Version 2 adds canonical horse membership to the same category branch.
-- Version 1 remains byte-identical for cached clients whose parser excludes
-- category-filtered horse cards. Ordinary visibility, paging and count remain.
CREATE FUNCTION public.get_public_profile_marketplace_v2(
 p_seller_slug text,p_store_category_id uuid DEFAULT NULL,
 p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1();
 identity_value uuid;profile_identities uuid[];result jsonb;
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
  OR p_seller_slug<>btrim(p_seller_slug) THEN
  RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';END IF;
 IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>60
  OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
  RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';END IF;
 -- Reject ambiguous legacy slugs without merging identities or depending on
 -- the viewer's selected identity. Two matching rows are enough to reject.
 SELECT array_agg(candidate.identity_id) INTO profile_identities FROM (
  SELECT ip.identity_id FROM public.identity_profiles ip
  JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
  WHERE ip.slug=p_seller_slug LIMIT 2
 ) candidate;
 IF cardinality(profile_identities)=1 THEN identity_value:=profile_identities[1];END IF;
 WITH RECURSIVE category_scope(id) AS (
  SELECT c.id FROM public.store_categories c
   WHERE c.id=p_store_category_id AND c.identity_id=identity_value
  UNION
  SELECT c.id FROM public.store_categories c JOIN category_scope s ON c.parent_id=s.id
   WHERE c.identity_id=identity_value
 ), ordinary AS MATERIALIZED (
  SELECT 'listing'::text content_type,l.id numeric_id,NULL::uuid horse_id,l.created_at,
   jsonb_build_object('content_type','listing','content_id',l.id::text,'offer_type',NULL,
    'title',l.title,'description_preview',left(l.description,280),
    'price',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),
    'category',l.category,'subcategory',l.subcategory,
    'detail_category',CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' END,
    'condition',l.condition,'country',l.country,'city',l.city,
    'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),
    'seller_name',ip.display_name,'seller_slug',ip.slug,'seller_avatar_url',ip.avatar_url,
    'seller_type',i.type,'created_at',l.created_at) card
  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL (
   SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id
   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id ASC LIMIT 1
  ) img ON true
  WHERE l.identity_id=identity_value AND l.status='active' AND l.active_until>now()
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
   AND (p_store_category_id IS NULL OR EXISTS (
    SELECT 1 FROM public.listing_store_categories x JOIN category_scope s ON s.id=x.store_category_id
    WHERE x.listing_id=l.id))
 ), horses AS MATERIALIZED (
  SELECT 'horse_offer'::text content_type,NULL::bigint numeric_id,h.id horse_id,h.created_at,
   jsonb_build_object('content_type','horse_offer','content_id',h.id,'offer_type',h.offer_type,
    'title',h.title,'description_preview',left(h.description,280),'price',horse_publication_private.public_price(h),
    'category','horses','subcategory',h.offer_type,'detail_category',NULL,'condition',NULL,'country','EE',
    'city',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,city_or_municipality}' ELSE h.city END,
    'image_url',img.original_url,'seller_name',ip.display_name,'seller_slug',ip.slug,
    'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',h.created_at) card
  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL (
   SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id
   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1
  ) img ON true
  WHERE h.identity_id=identity_value AND horse_publication_private.is_public(h.id)
   AND (p_store_category_id IS NULL OR EXISTS (
    SELECT 1 FROM public.horse_offer_store_categories x JOIN category_scope s ON s.id=x.store_category_id
    WHERE x.horse_offer_id=h.id))
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id)
     OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
 ), matched AS MATERIALIZED (SELECT * FROM ordinary UNION ALL SELECT * FROM horses),
 page AS (
  SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC
  LIMIT p_result_limit OFFSET p_result_offset
 ), totals AS (SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',2,'content_scope','public_profile_marketplace',
  'seller_slug',p_seller_slug,'profile_available',identity_value IS NOT NULL,
  'store_category_id',p_store_category_id::text,'sort','newest',
  'items',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
   THEN p_result_offset+p_result_limit ELSE NULL END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $fn$;
ALTER FUNCTION public.get_public_profile_marketplace_v2(text,uuid,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_marketplace_v2(text,uuid,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_marketplace_v2(text,uuid,integer,integer) TO anon,authenticated;
COMMENT ON FUNCTION public.get_public_profile_marketplace_v2(text,uuid,integer,integer) IS
 'One typed viewed-profile list; unique active seller slug, strict ordinary expiry, seller-owned listing/horse category descendants, canonical horse visibility and blocks before one count/page. Read only.';
