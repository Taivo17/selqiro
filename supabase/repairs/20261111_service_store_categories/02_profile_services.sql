CREATE FUNCTION public.get_public_profile_services_v2(
  p_seller_slug text,
  p_store_category_id uuid DEFAULT NULL,
  p_result_limit integer DEFAULT 24,
  p_result_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE
  profile_identities uuid[];
  identity_value uuid;
  read_time timestamptz := now();
  result jsonb;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1
     OR char_length(p_seller_slug)>160 OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>60
     OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
    RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';
  END IF;

  -- Two matches are enough to reject an ambiguous legacy slug. Resolve once in
  -- this statement snapshot; active-owner state never changes the public scope.
  SELECT array_agg(candidate.identity_id) INTO profile_identities
  FROM (
    SELECT ip.identity_id
    FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
    WHERE ip.slug=p_seller_slug
    LIMIT 2
  ) candidate;
  IF cardinality(profile_identities)=1 THEN
    identity_value := profile_identities[1];
  END IF;

  WITH RECURSIVE category_scope(id) AS (
    SELECT c.id FROM public.store_categories c
    WHERE c.id=p_store_category_id AND c.identity_id=identity_value
    UNION
    SELECT c.id FROM public.store_categories c JOIN category_scope branch ON c.parent_id=branch.id
    WHERE c.identity_id=identity_value
  ), eligible AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.subcategory,
      s.image_url,s.price_amount,s.currency,s.price_type,s.country,s.city,
      s.location,s.status,s.sort_order,s.published_at,s.created_at,s.updated_at
    FROM public.services s
    WHERE s.identity_id=identity_value
      AND service_publication_private.is_public(s.id)
      AND service_publication_private.visible_to_viewer(s.id)
  ), matched AS MATERIALIZED (
    SELECT s.* FROM eligible s WHERE p_store_category_id IS NULL OR EXISTS (
      SELECT 1 FROM public.service_store_categories link JOIN category_scope branch ON branch.id=link.store_category_id
      WHERE link.service_id=s.id
    )
  ), page AS MATERIALIZED (
    SELECT * FROM matched ORDER BY created_at DESC,id ASC
    LIMIT p_result_limit OFFSET p_result_offset
  ), cards AS (
    SELECT p.sort_order,p.created_at,p.id,
      jsonb_build_object(
        'id',p.id::text,
        'identity_id',p.identity_id::text,
        'title',p.title,
        'description',p.description,
        'category',p.category,
        'subcategory',p.subcategory,
        'image_url',p.image_url,
        'price_amount',p.price_amount::text,
        'currency',p.currency,
        'price_type',p.price_type,
        'country',p.country,
        'city',p.city,
        'location',p.location,
        'status',p.status,
        'sort_order',p.sort_order,
        'published_at',p.published_at,
        'created_at',p.created_at,
        'updated_at',p.updated_at,
        'images',coalesce(gallery.images,'[]'::jsonb)
      ) AS card
    FROM page p
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',image.id::text,
          'identity_id',image.identity_id::text,
          'service_id',image.service_id::text,
          'original_url',image.original_url,
          'medium_url',image.medium_url,
          'thumb_url',image.thumb_url,
          'sort_order',image.sort_order,
          'is_primary',image.is_primary,
          'created_at',image.created_at
        ) ORDER BY image.is_primary DESC,image.sort_order ASC,
          image.created_at ASC,image.id ASC
      ) AS images
      FROM (
        SELECT si.id,si.identity_id,si.service_id,si.original_url,si.medium_url,
          si.thumb_url,si.sort_order,si.is_primary,si.created_at
        FROM public.service_images si
        WHERE si.service_id=p.id AND si.identity_id=identity_value
        ORDER BY si.is_primary DESC,si.sort_order ASC,si.created_at ASC,si.id ASC
        LIMIT 10
      ) image
    ) gallery ON true
  ), totals AS (SELECT count(*) n FROM matched)
  SELECT jsonb_build_object(
    'schema_version',2,
    'content_scope','public_profile_services',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'store_category_id',p_store_category_id::text,
    'sort','newest',
    'result_limit',p_result_limit,
    'result_offset',p_result_offset,
    'total_count',n::text,
    'has_more',n>p_result_offset::bigint+p_result_limit,
    'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit
      AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,
    'window_limit_reached',n>p_result_offset::bigint+p_result_limit
      AND p_result_offset+p_result_limit>100000,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.created_at DESC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result FROM totals;
  RETURN result;
END $fn$;

ALTER FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer) TO anon,authenticated;
COMMENT ON FUNCTION public.get_public_profile_services_v2(text,uuid,integer,integer) IS
 'Canonical public services for one unambiguous active profile. Same publication/viewer visibility before category filtering, total and page; no permanent service-count cap. V1 is retained.';
