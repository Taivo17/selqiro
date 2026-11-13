CREATE OR REPLACE FUNCTION public.search_public_marketplace_v1(p_search_query text DEFAULT '',p_category text DEFAULT NULL,
 p_subcategory text DEFAULT NULL,p_detail_category text DEFAULT NULL,p_condition text DEFAULT NULL,
 p_location_query text DEFAULT '',p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0,
 p_identity_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET plan_cache_mode='force_custom_plan' AS $f$
DECLARE q text:=btrim(coalesce(p_search_query,''));loc text:=btrim(coalesce(p_location_query,''));
 cat text:=nullif(btrim(p_category),'');sub text:=nullif(btrim(p_subcategory),'');
 detail text:=nullif(btrim(p_detail_category),'');cond text:=nullif(btrim(p_condition),'');
 actor uuid:=public.listing_actor_uid_hosted_v1();query tsquery;result jsonb;
BEGIN
 IF char_length(q)>160 OR char_length(loc)>160 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 60
  OR p_result_offset IS NULL OR p_result_offset NOT BETWEEN 0 AND 100000 THEN
  RAISE EXCEPTION 'marketplace_search_input' USING ERRCODE='22023'; END IF;
 IF (cat IS NOT NULL AND (length(cat)>120 OR cat!~'^[a-z][a-z0-9_]*$'))
  OR (sub IS NOT NULL AND (length(sub)>160 OR sub!~'^[a-z][a-z0-9_]*$' OR cat IS NULL))
  OR (detail IS NOT NULL AND (length(detail)>160 OR detail!~'^[a-z][a-z0-9_]*$' OR sub IS NULL))
  OR (cond IS NOT NULL AND cond NOT IN('new','used','damaged'))
  OR (cat='horses' AND (detail IS NOT NULL OR (sub IS NOT NULL AND sub NOT IN('sale','free_transfer','lease','co_rider','wanted')))) THEN
  RAISE EXCEPTION 'marketplace_search_filters' USING ERRCODE='22023'; END IF;
 query:=plainto_tsquery('pg_catalog.simple'::regconfig,q);
 WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=actor AND hidden_until>statement_timestamp()), ordinary AS MATERIALIZED(
  SELECT 'listing'::text content_type,l.id::text content_id,l.id numeric_id,NULL::uuid horse_id,l.created_at,
   jsonb_build_object('content_type','listing','content_id',l.id::text,'offer_type',NULL,
    'title',l.title,'description_preview',left(l.description,280),
    'price',public.listing_price_read_model_v1(l.price_kind,l.price_amount,l.currency,l.price_revision,l.price),
    'category',l.category,'subcategory',l.subcategory,
    'detail_category',CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' END,
    'condition',l.condition,'country',l.country,'city',l.city,
    'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,l.image),
    'seller_name',ip.display_name,'seller_slug',ip.slug,'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',l.created_at) card
  FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=l.id
   ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id) AND l.status='active' AND (l.active_until IS NULL OR l.active_until>now())
   AND (p_identity_id IS NULL OR l.identity_id=p_identity_id)
   AND (q='' OR public.public_listing_search_document_v1(l.title,l.description,l.category,l.subcategory,l.details)@@query)
   AND (cat IS NULL OR l.category=cat) AND (sub IS NULL OR l.subcategory=sub)
   AND (detail IS NULL OR (jsonb_typeof(l.details->'detailCategory')='string' AND l.details->>'detailCategory'=detail))
   AND (cond IS NULL OR l.condition=cond)
   AND (loc='' OR strpos(lower(coalesce(l.city,'')||' '||coalesce(l.country,'')),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=l.user_id) OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
 ), horses AS MATERIALIZED(
  SELECT 'horse_offer'::text content_type,h.id::text content_id,NULL::bigint numeric_id,h.id horse_id,h.created_at,
   jsonb_build_object('content_type','horse_offer','content_id',h.id,'offer_type',h.offer_type,
    'title',h.title,'description_preview',left(h.description,280),'price',horse_publication_private.public_price(h),
    'category','horses','subcategory',h.offer_type,'detail_category',NULL,'condition',NULL,'country','EE',
    'city',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,city_or_municipality}' ELSE h.city END,
    'image_url',img.original_url,'seller_name',ip.display_name,'seller_slug',ip.slug,
    'seller_avatar_url',ip.avatar_url,'seller_type',i.type,'created_at',h.created_at) card
  FROM public.horse_offers h JOIN public.identities i ON i.id=h.identity_id AND i.status='active'
  JOIN public.identity_profiles ip ON ip.identity_id=i.id
  LEFT JOIN LATERAL(SELECT im.original_url FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id
   ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id LIMIT 1) img ON true
  WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=h.identity_id) AND horse_publication_private.is_public(h.id) AND (p_identity_id IS NULL OR h.identity_id=p_identity_id)
   AND (cat IS NULL OR cat='horses') AND (sub IS NULL OR h.offer_type=sub) AND detail IS NULL AND cond IS NULL
   AND (q='' OR to_tsvector('pg_catalog.simple'::regconfig,coalesce(h.title,'')||' '||coalesce(h.description,'')||' '||
    coalesce(h.breed,'')||' '||coalesce(h.discipline,'')||' '||coalesce(h.details#>>'{wanted,preferred_breed}',''))@@query)
   AND (loc='' OR strpos(lower(CASE WHEN h.offer_type='wanted' THEN coalesce(h.details#>>'{wanted,search_area,city_or_municipality}','')
     ELSE coalesce(h.city,'') END||' EE'),lower(loc))>0)
   AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
 ), matched AS MATERIALIZED(SELECT * FROM ordinary UNION ALL SELECT * FROM horses),
 page AS(SELECT * FROM matched ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC LIMIT p_result_limit OFFSET p_result_offset),
 totals AS(SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',1,'content_scope','marketplace','sort','newest',
  'items',coalesce((SELECT jsonb_agg(card ORDER BY created_at DESC,content_type,numeric_id DESC,horse_id DESC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000 THEN p_result_offset+p_result_limit END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $f$;
