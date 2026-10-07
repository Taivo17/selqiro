-- CLOSED LOCAL CANDIDATE. Public-only; owner preview remains a separate contract.
CREATE FUNCTION public.get_public_listing_detail_v1(p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=auth.uid(); r public.listings%ROWTYPE; seller record; gallery jsonb; image_url text;
  detail_values jsonb; item jsonb:=NULL; has_more boolean:=false; id_value bigint;
BEGIN
  IF p_listing_id IS NULL OR char_length(p_listing_id)>20
     OR p_listing_id !~ '^(0|[1-9][0-9]*|-[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric < -9223372036854775808
     OR p_listing_id::numeric > 9223372036854775807 THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  id_value:=p_listing_id::bigint;
  SELECT l.* INTO r FROM public.listings l
    JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.id=id_value AND l.status='active'
      -- Deliberately preserves public detail/search NULL-expiry semantics.
      AND (l.active_until IS NULL OR l.active_until>now())
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)));
  IF FOUND THEN
    SELECT ip.display_name,ip.slug,ip.avatar_url,i.type INTO seller
      FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
      WHERE i.id=r.identity_id AND i.status='active';
    -- Small bounded gallery, stable tiebreaks, identical first-image rule to search v2.
    WITH ordered AS (
      SELECT li.id,li.thumb_url,li.medium_url,li.original_url,li.is_primary,li.sort_order,
        row_number() OVER (ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
          li.created_at ASC NULLS LAST,li.id ASC) AS position
      FROM public.listing_images li WHERE li.listing_id=r.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
        li.created_at ASC NULLS LAST,li.id ASC LIMIT 11
    ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id::text,'thumb_url',o.thumb_url,
        'medium_url',o.medium_url,'original_url',o.original_url,'is_primary',o.is_primary,
        'sort_order',o.sort_order) ORDER BY o.position) FILTER (WHERE o.position<=10),'[]'::jsonb),
        coalesce(bool_or(o.position>10),false)
      INTO gallery,has_more FROM ordered o;
    image_url:=coalesce(gallery->0->>'thumb_url',gallery->0->>'medium_url',
      gallery->0->>'original_url',r.image);
    detail_values:=public.public_listing_detail_values_v1(r);
    item:=jsonb_build_object('content_type','listing','content_id',r.id::text,
      'title',left(r.title,4096),'description',left(r.description,32768),
      'title_truncated',coalesce(char_length(r.title)>4096,false),
      'description_truncated',coalesce(char_length(r.description)>32768,false),
      'price',public.listing_price_read_model_v1(r.price_kind,r.price_amount,r.currency,r.price_revision,r.price),
      'category',r.category,'subcategory',r.subcategory,
      'detail_category',CASE WHEN jsonb_typeof(r.details->'detailCategory')='string'
        THEN r.details->>'detailCategory' ELSE NULL END,
      'condition',r.condition,'country',r.country,'city',r.city,
      'image_url',image_url,'images',gallery,'images_has_more',has_more,
      'details',detail_values->'fields','details_truncated',detail_values->'truncated',
      'seller_name',seller.display_name,'seller_slug',seller.slug,'seller_avatar_url',seller.avatar_url,
      'seller_type',seller.type,'created_at',r.created_at,'active_until',r.active_until);
  END IF;
  -- Hidden, missing and blocked IDs are indistinguishable. No owner bypass here.
  RETURN jsonb_build_object('schema_version',1,'content_scope','public_ordinary_listing_detail',
    'requested_id',p_listing_id,'item',item);
END $fn$;
ALTER FUNCTION public.get_public_listing_detail_v1(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_listing_detail_v1(text) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_listing_detail_v1(text) IS
 'Closed public detail candidate. One authorized row snapshot; exact shared price, bounded public fields/gallery; NULL expiry allowed; no owner preview or API grants.';
