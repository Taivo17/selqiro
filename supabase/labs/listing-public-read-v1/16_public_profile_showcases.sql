-- CLOSED LOCAL CANDIDATE. Public viewed-profile projection, never an owner read.
CREATE FUNCTION public.get_public_profile_showcases_v1(
  p_seller_slug text,
  p_result_limit integer DEFAULT 80
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
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>80 THEN
    RAISE EXCEPTION 'public_profile_limit_invalid' USING ERRCODE='22023';
  END IF;

  -- A duplicate slug is unavailable, including duplicate profiles of one
  -- identity. No fallback to the caller's own identity or private content.
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

  WITH page AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.status,
      s.sort_order,s.published_at,s.active_until,s.created_at,s.updated_at
    FROM public.product_showcases s
    WHERE s.identity_id=identity_value AND s.status='published'
      AND s.active_until>read_time
    ORDER BY s.sort_order ASC,s.created_at ASC,s.id ASC
    LIMIT p_result_limit
  ), cards AS (
    SELECT p.sort_order,p.created_at,p.id,
      jsonb_build_object(
        'id',p.id::text,
        'identity_id',p.identity_id::text,
        'title',p.title,
        'description',p.description,
        'category',p.category,
        'status',p.status,
        'sort_order',p.sort_order,
        'published_at',p.published_at,
        'active_until',p.active_until,
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
          'showcase_id',image.showcase_id::text,
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
        SELECT si.id,si.identity_id,si.showcase_id,si.original_url,si.medium_url,
          si.thumb_url,si.sort_order,si.is_primary,si.created_at
        FROM public.product_showcase_images si
        WHERE si.showcase_id=p.id AND si.identity_id=identity_value
        ORDER BY si.is_primary DESC,si.sort_order ASC,si.created_at ASC,si.id ASC
        LIMIT 10
      ) image
    ) gallery ON true
  )
  SELECT jsonb_build_object(
    'schema_version',1,
    'content_scope','public_profile_product_showcases',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'result_limit',p_result_limit,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;

ALTER FUNCTION public.get_public_profile_showcases_v1(text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_showcases_v1(text,integer)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_profile_showcases_v1(text,integer) IS
  'Closed public-profile showcase candidate. Unique active viewed slug; published and unexpired at server read time; at most 80 showcases and 10 exact-parent/identity images each. No helper or API grants.';
