-- Preserve every service read field and authorization check. Only creation order changes.
CREATE OR REPLACE FUNCTION public.get_my_service_publications_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 200,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE items jsonb;total bigint;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 200 OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>1000000 THEN
 RAISE EXCEPTION 'service_page_invalid' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO total FROM public.services WHERE identity_id=p_expected_identity_id;
 SELECT coalesce(jsonb_agg(public.get_my_service_publication_snapshot_v1(p_expected_user_id,p_expected_identity_id,s.id)
 ORDER BY s.created_at DESC,s.id ASC),'[]'::jsonb) INTO items FROM
 (SELECT * FROM public.services WHERE identity_id=p_expected_identity_id ORDER BY created_at DESC,id ASC LIMIT p_result_limit OFFSET p_result_offset) s;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'items',items,
 'total_count',total::text,'result_limit',p_result_limit,'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

CREATE OR REPLACE FUNCTION public.get_public_profile_services_v1(
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

  WITH page AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.subcategory,
      s.image_url,s.price_amount,s.currency,s.price_type,s.country,s.city,
      s.location,s.status,s.sort_order,s.published_at,s.created_at,s.updated_at
    FROM public.services s
    WHERE s.identity_id=identity_value AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
    ORDER BY s.created_at DESC,s.id ASC
    LIMIT p_result_limit
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
  )
  SELECT jsonb_build_object(
    'schema_version',1,
    'content_scope','public_profile_services',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'result_limit',p_result_limit,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.created_at DESC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;
