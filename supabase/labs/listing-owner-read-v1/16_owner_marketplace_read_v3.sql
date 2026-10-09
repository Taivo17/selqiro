-- CLOSED DISPOSABLE LAB ONLY. The existing v1/v2, projection and writers stay intact.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_core_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'owner_reader_disposable_fixture_required';
  END IF;
END $gate$;

-- Expected identity is a stale-context precondition, NEVER an authorization source.
-- One extra v1 row establishes has_more; there is no unbounded total-count query.
-- v1 remains authoritative for ownership, status/search/category filtering and order.
CREATE FUNCTION public.get_my_marketplace_items_v3(
  p_expected_identity_id uuid,
  p_result_limit integer DEFAULT 30,
  p_result_offset integer DEFAULT 0,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_store_category_filter uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET TimeZone = 'UTC'
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_identity uuid;
  v_result jsonb;
  v_status text := coalesce(nullif(lower(btrim(p_status_filter)),''),'all');
  v_search text := btrim(coalesce(p_search_query,''));
BEGIN
  -- This call authenticates even an empty/no-results page.
  v_identity := public.require_my_active_identity_v2();
  IF p_expected_identity_id IS NULL OR p_expected_identity_id <> v_identity THEN
    RAISE EXCEPTION 'owner_read_identity_changed' USING ERRCODE='42501';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit < 1 OR p_result_limit > 100
    OR p_result_offset IS NULL OR p_result_offset < 0 OR p_result_offset > 100000
    OR char_length(v_status) > 40 OR char_length(v_search) > 200 THEN
    RAISE EXCEPTION 'owner_read_request_invalid' USING ERRCODE='22023';
  END IF;

  WITH owner_window AS MATERIALIZED (
    SELECT * FROM public.get_my_marketplace_items_v1(
      p_result_limit+1,p_result_offset,v_status,v_search,p_store_category_filter
    ) WITH ORDINALITY
  ), owner_page AS MATERIALIZED (
    SELECT * FROM owner_window ORDER BY ordinality LIMIT p_result_limit
  ), priced AS (
    SELECT item.ordinality,
      jsonb_build_object(
        'content_type',item.content_type,'content_id',item.content_id,
        'identity_id',item.identity_id,
        'source_status',item.source_status,'lifecycle_status',item.lifecycle_status,
        'content_variant',item.content_variant,
        'title',left(coalesce(item.title,''),512),
        'title_truncated',char_length(coalesce(item.title,'')) > 512,
        'description_excerpt',left(coalesce(item.description,''),512),
        'description_truncated',char_length(coalesce(item.description,'')) > 512,
        'image_url',item.image_url,'category',item.category,'subcategory',item.subcategory,
        'condition',item.condition,
        -- Wanted search area comes ONLY from the whitelist, never horse/seller location.
        'city',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.city END,
        'region',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.region END,
        'location_label',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.location_label END,
        'active_until',item.active_until,'published_at',item.published_at,
        'created_at',item.created_at,'sort_at',item.sort_at,
        'money',CASE
          WHEN item.content_type = 'listing' THEN jsonb_build_object(
            'role','listing_price','value',public.listing_price_read_model_v1(
              listing.price_kind,listing.price_amount,listing.currency,listing.price_revision,listing.price))
          WHEN item.content_variant = 'wanted' THEN jsonb_build_object(
            'role','wanted_budget','value',public.project_horse_wanted_owner_summary_v2(offer.details))
          ELSE jsonb_build_object('role','horse_offer_price','value',
            public.horse_owner_price_read_v1(offer.offer_type,offer.price_type,offer.price_amount,offer.currency))
        END
      ) AS value
    FROM owner_page item
    -- Typed primary-key lookups only on the selected page, not client-side N+1 requests.
    LEFT JOIN public.listings listing
      ON listing.id = CASE WHEN item.content_type='listing' THEN item.content_id::bigint ELSE NULL END
      AND listing.identity_id = v_identity
    LEFT JOIN public.horse_offers offer
      ON offer.id = CASE WHEN item.content_type='horse_offer' THEN item.content_id::uuid ELSE NULL END
      AND offer.identity_id = v_identity
  )
  SELECT jsonb_build_object(
    'schema_version',3,'actor_id',v_actor,'identity_id',v_identity,
    'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',(SELECT count(*) > p_result_limit FROM owner_window),
    'next_offset',CASE WHEN (SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit <= 100000 THEN p_result_offset + p_result_limit ELSE NULL END,
    'window_limit_reached',(SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit > 100000,
    'items',coalesce((SELECT jsonb_agg(value ORDER BY ordinality) FROM priced),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;
ALTER FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid) IS
  'Closed bounded owner snapshot: authoritative v1 access/filter/order; exact ordinary price, distinct horse price and wanted budget. Expected identity precondition; actor context returned. No writer, public grant, count scan or lifecycle/expiry change. Not a full owner detail/editor snapshot.';
