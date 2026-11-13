-- Existing legacy wires and sorting; filters now run before page selection.
CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings"("result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,

    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),

    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),

    l.category,
    l.subcategory,
    l.condition,

    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,

    l.search_text,
    l.details,

    l.active_until,
    l.created_at

  from listings l
  join identities i
    on i.id = l.identity_id
  join identity_profiles ip
    on ip.identity_id = i.id
  left join profiles p
    on p.id = i.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (
      l.active_until is null
      or l.active_until > now()
    )
  order by l.created_at desc
  limit result_limit
  offset result_offset;
$$;

CREATE OR REPLACE FUNCTION "public"."get_marketplace_listings_nearby"("center_lat" double precision DEFAULT NULL::double precision, "center_lng" double precision DEFAULT NULL::double precision, "result_limit" integer DEFAULT 30, "result_offset" integer DEFAULT 0) RETURNS TABLE("listing_id" bigint, "user_id" "uuid", "identity_id" "uuid", "seller_name" "text", "seller_slug" "text", "seller_type" "text", "is_premium" boolean, "title" "text", "description" "text", "price" "text", "price_amount" numeric, "image" "text", "category" "text", "subcategory" "text", "condition" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "search_text" "text", "details" "jsonb", "distance_km" double precision, "active_until" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=auth.uid() AND hidden_until>statement_timestamp())
  select
    l.id,
    l.user_id,
    l.identity_id,
    ip.display_name,
    ip.slug,
    i.type,
    coalesce(p.is_premium, false),
    l.title,
    l.description,
    l.price,
    l.price_amount,
    coalesce(li.thumb_url, li.medium_url, li.original_url, l.image),
    l.category,
    l.subcategory,
    l.condition,
    l.country,
    l.city,
    l.location,
    l.listing_lat,
    l.listing_lng,
    l.search_text,
    l.details,
    case
      when center_lat is not null
       and center_lng is not null
       and l.listing_lat is not null
       and l.listing_lng is not null
      then 6371 * 2 * asin(
        sqrt(
          power(sin(radians(l.listing_lat - center_lat) / 2), 2) +
          cos(radians(center_lat)) *
          cos(radians(l.listing_lat)) *
          power(sin(radians(l.listing_lng - center_lng) / 2), 2)
        )
      )
      else null
    end as distance_km,
    l.active_until,
    l.created_at
  from listings l
  join identities i on i.id = l.identity_id
  join identity_profiles ip on ip.identity_id = i.id
  left join profiles p on p.id = l.user_id
  left join lateral (
    select thumb_url, medium_url, original_url
    from listing_images
    where listing_id = l.id
    order by is_primary desc, sort_order asc, created_at asc
    limit 1
  ) li on true
  where NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=l.identity_id)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'
    and (l.active_until is null or l.active_until > now())
  order by
    case when center_lat is not null and center_lng is not null then
      case
        when l.listing_lat is null or l.listing_lng is null then 1
        else 0
      end
    else 0 end,
    distance_km asc nulls last,
    l.created_at desc
  limit result_limit
  offset result_offset;
$$;
