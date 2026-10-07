-- CLOSED LOCAL CANDIDATE. Viewed seller slug, never caller-supplied account ownership.
CREATE FUNCTION public.get_public_profile_listings_v1(
 p_seller_slug text,p_store_category_id uuid DEFAULT NULL,
 p_result_limit integer DEFAULT 12,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=auth.uid(); identity_value uuid; result jsonb; profile_count integer;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
     OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>60
     OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
    RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';
  END IF;
  -- A duplicate legacy slug is ambiguous, never combine two identities into one shop.
  SELECT count(*)::integer INTO profile_count FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  IF profile_count=1 THEN
    SELECT ip.identity_id INTO identity_value FROM public.identity_profiles ip
      JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  END IF;
  WITH RECURSIVE category_scope(id) AS (
    SELECT c.id FROM public.store_categories c
      WHERE c.id=p_store_category_id AND c.identity_id=identity_value
    UNION -- deduplicate and terminate even a corrupt historical cycle
    SELECT c.id FROM public.store_categories c JOIN category_scope s ON c.parent_id=s.id
      WHERE c.identity_id=identity_value
  ), matched AS MATERIALIZED (
    SELECT l.id,l.created_at,l.title,left(l.description,280) AS description_preview,
      l.price,l.price_kind,l.price_amount,l.currency,l.price_revision,l.category,l.subcategory,
      CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' ELSE NULL END AS detail_category,
      l.condition,l.country,l.city,l.image AS fallback_image,
      ip.display_name AS seller_name,ip.slug AS seller_slug,ip.avatar_url AS seller_avatar_url,i.type AS seller_type
    FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.identity_id=identity_value AND l.status='active'
      -- Preserve the profile's stricter boundary: unlike search/detail, NULL is excluded.
      AND l.active_until>now()
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
      AND (p_store_category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.listing_store_categories x JOIN category_scope s ON s.id=x.store_category_id
        WHERE x.listing_id=l.id))
  ), page AS (
    SELECT m.* FROM matched m ORDER BY m.created_at DESC,m.id DESC LIMIT p_result_limit OFFSET p_result_offset
  ), cards AS (
    SELECT p.id,p.created_at,jsonb_build_object('content_type','listing','content_id',p.id::text,
      'title',p.title,'description_preview',p.description_preview,
      'price',public.listing_price_read_model_v1(p.price_kind,p.price_amount,p.currency,p.price_revision,p.price),
      'category',p.category,'subcategory',p.subcategory,'detail_category',p.detail_category,
      'condition',p.condition,'country',p.country,'city',p.city,
      'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,p.fallback_image),
      'seller_name',p.seller_name,'seller_slug',p.seller_slug,'seller_avatar_url',p.seller_avatar_url,
      'seller_type',p.seller_type,'created_at',p.created_at) AS card
    FROM page p LEFT JOIN LATERAL (
      SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=p.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id ASC LIMIT 1
    ) img ON true
  ), totals AS (SELECT count(*) AS n FROM matched)
  SELECT jsonb_build_object('schema_version',1,'content_scope','public_profile_ordinary_listings',
    'seller_slug',p_seller_slug,'profile_available',identity_value IS NOT NULL,
    'store_category_id',p_store_category_id::text,'sort','newest',
    'items',coalesce((SELECT jsonb_agg(c.card ORDER BY c.created_at DESC,c.id DESC) FROM cards c),'[]'::jsonb),
    'total_count',t.n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',t.n>p_result_offset::bigint+p_result_limit,
    'next_offset',CASE WHEN t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
      THEN p_result_offset+p_result_limit ELSE NULL END,
    'window_limit_reached',t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
    INTO result FROM totals t;
  RETURN result;
END $fn$;
ALTER FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) IS
 'Closed profile-list candidate. Exact active identity slug; strict future expiry; server-resolved category branch; blocks before page/count; no per-card remote requests or API grants.';
