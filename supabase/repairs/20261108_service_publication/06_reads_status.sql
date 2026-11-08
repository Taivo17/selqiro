CREATE FUNCTION public.get_my_service_publication_snapshot_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,'identity_id',s.identity_id,
 'service_id',s.id,'edit_revision',s.edit_revision::text,'status',s.status,'content',service_publication_private.content(s),
 'images',service_publication_private.image_projection(s.id,true),'policy_snapshot',service_publication_private.current_policies(),
 'created_at',s.created_at,'updated_at',s.updated_at,'published_at',s.published_at,'sort_order',s.sort_order);
END $f$;
CREATE FUNCTION public.get_my_service_publications_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 200,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE items jsonb;total bigint;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 200 OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>1000000 THEN
 RAISE EXCEPTION 'service_page_invalid' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO total FROM public.services WHERE identity_id=p_expected_identity_id;
 SELECT coalesce(jsonb_agg(public.get_my_service_publication_snapshot_v1(p_expected_user_id,p_expected_identity_id,s.id)
 ORDER BY s.sort_order,s.created_at DESC,s.id),'[]'::jsonb) INTO items FROM
 (SELECT * FROM public.services WHERE identity_id=p_expected_identity_id ORDER BY sort_order,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset) s;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'items',items,
 'total_count',total::text,'result_limit',p_result_limit,'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

CREATE FUNCTION public.set_my_service_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid,
 p_expected_revision text,p_expected_status text,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;changed boolean;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_expected_revision IS NULL OR p_expected_revision !~'^[1-9][0-9]{0,18}$' OR p_expected_revision::numeric>9223372036854775807
 OR p_expected_status IS NULL OR p_expected_status NOT IN('published','archived') OR p_status IS NULL OR p_status NOT IN('published','archived') THEN
 RAISE EXCEPTION 'service_status_invalid' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 IF s.edit_revision::numeric=p_expected_revision::numeric+1 AND s.status=p_status AND p_status<>p_expected_status THEN changed:=true;
 ELSE
  IF s.edit_revision::text<>p_expected_revision OR s.status<>p_expected_status THEN RAISE EXCEPTION 'service_edit_conflict' USING ERRCODE='40001';END IF;
  IF p_status='published' AND EXISTS(SELECT 1 FROM service_publication_private.heads WHERE service_id=s.id)
  AND NOT service_publication_private.has_current_publication(s.id) THEN RAISE EXCEPTION 'service_finality_invalid' USING ERRCODE='55000';END IF;
  changed:=s.status<>p_status;
  IF changed THEN UPDATE public.services SET status=p_status WHERE id=s.id RETURNING * INTO s;END IF;
 END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,'identity_id',s.identity_id,
 'service_id',s.id,'edit_revision',s.edit_revision::text,'status',s.status,'changed',changed);
END $f$;

CREATE FUNCTION service_publication_private.public_fields(s public.services) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','service','content_id',s.id,'identity_id',s.identity_id,
 'title',s.title,'description',s.description,'category',s.category,'subcategory',s.subcategory,'price_type',s.price_type,
 'price_amount',s.price_amount::text,'currency',s.currency,'country',s.country,'city',s.city,'location_label',s.location,
 'images',CASE WHEN jsonb_array_length(service_publication_private.image_projection(s.id,false))>0 THEN
 (SELECT jsonb_agg(jsonb_build_object('id',x->'id','url',x->'url') ORDER BY (x->>'is_primary')::boolean DESC,ord)
 FROM jsonb_array_elements(service_publication_private.image_projection(s.id,false)) WITH ORDINALITY i(x,ord))
 WHEN s.image_url ~ '^https?://' THEN jsonb_build_array(jsonb_build_object('id',s.id,'url',s.image_url)) ELSE '[]'::jsonb END,
 'seller_name',coalesce(nullif(ip.display_name,''),i.display_name),'seller_slug',ip.slug,'seller_type',i.type,
 'published_at',s.published_at,'updated_at',s.updated_at)
 FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=s.identity_id AND i.status='active';
$f$;
CREATE FUNCTION service_publication_private.visible_to_viewer(p_service uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s JOIN public.identities i ON i.id=s.identity_id
 LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
 WHERE s.id=p_service AND NOT EXISTS(SELECT 1 FROM public.user_blocks b
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL AND
 ((b.blocker_id=public.listing_actor_uid_hosted_v1() AND b.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END)
 OR (b.blocked_id=public.listing_actor_uid_hosted_v1() AND b.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END))));
$f$;
CREATE FUNCTION public.get_public_service_v1(p_service_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT service_publication_private.public_fields(s) FROM public.services s WHERE s.id=p_service_id AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id);
$f$;
CREATE FUNCTION public.search_public_services_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,p_subcategory text DEFAULT NULL,
 p_country text DEFAULT NULL,p_city text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'')));
BEGIN
 IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160
 OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION 'service_search_invalid' USING ERRCODE='22023';END IF;
 WITH candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
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

-- Keep the established public-profile wire while sharing the publication gate.
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
      SELECT jsonb_agg(c.card ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;
