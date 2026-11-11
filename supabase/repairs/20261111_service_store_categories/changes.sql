-- COMPONENT 01_assignments.sql
-- Canonical service/category links. Neither FK can delete the referenced service,
-- category or media. Category removal cleans links through its existing RPC.
CREATE TABLE public.service_store_categories (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  store_category_id uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id,store_category_id)
);
ALTER TABLE public.service_store_categories OWNER TO postgres;
CREATE INDEX service_store_categories_category_idx
  ON public.service_store_categories(store_category_id,service_id);
ALTER TABLE public.service_store_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_store_categories FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.service_store_categories IS
  'Canonical service UUID to identity-scoped shop category. Writes and owner reads only through checked RPCs; public reads through the versioned profile reader.';

CREATE FUNCTION public.get_my_service_store_categories_v1(
  p_service_id uuid,p_expected_identity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $function$
DECLARE
  v_user uuid:=auth.uid();
  v_active uuid;
  v_identity public.identities%ROWTYPE;
  v_ids uuid[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'service_store_category_context_changed' USING ERRCODE='42501';
  END IF;
  IF p_service_id IS NULL OR p_expected_identity_id IS NULL
    OR current_setting('transaction_isolation')<>'read committed' THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  -- Match category management/publication lock order: profile, identity,
  -- active membership, service, then (for writes) categories in UUID order.
  SELECT p.active_identity_id INTO v_active FROM public.profiles p
    WHERE p.id=v_user FOR UPDATE;
  IF NOT FOUND OR v_active IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'service_store_category_context_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO v_identity FROM public.identities i WHERE i.id=v_active FOR UPDATE;
  IF NOT FOUND OR v_identity.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF v_identity.type='private' THEN
    IF v_identity.user_id IS DISTINCT FROM v_user THEN
      RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSIF v_identity.type='business' THEN
    PERFORM 1 FROM public.business_members m WHERE m.business_account_id=v_identity.business_account_id
      AND m.user_id=v_user AND m.status='active' FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  IF NOT coalesce(public.current_user_has_identity_access(v_active),false) THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.services h WHERE h.id=p_service_id AND h.identity_id=v_active FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'service_store_category_forbidden' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(array_agg(x.store_category_id ORDER BY x.store_category_id),'{}'::uuid[])
    INTO v_ids FROM public.service_store_categories x
    JOIN public.store_categories c ON c.id=x.store_category_id AND c.identity_id=v_active
    WHERE x.service_id=p_service_id;
  RETURN jsonb_build_object('service_id',p_service_id,'identity_id',v_active,'category_ids',v_ids);
END;
$function$;
ALTER FUNCTION public.get_my_service_store_categories_v1(uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_service_store_categories_v1(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_service_store_categories_v1(uuid,uuid) TO authenticated;

CREATE FUNCTION public.set_my_service_store_categories_v1(
  p_service_id uuid,p_expected_identity_id uuid,p_category_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp
AS $function$
DECLARE
  v_context jsonb;
  v_ids uuid[];
  v_count integer;
BEGIN
  -- The owner reader acquires and retains the common authority/service locks
  -- for this transaction; no identity or revision is inferred from the UI.
  v_context:=public.get_my_service_store_categories_v1(p_service_id,p_expected_identity_id);
  IF p_category_ids IS NULL OR coalesce(array_ndims(p_category_ids),1)>1 THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  IF array_position(p_category_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'service_store_category_invalid_input' USING ERRCODE='22023';
  END IF;
  SELECT coalesce(array_agg(DISTINCT id ORDER BY id),'{}'::uuid[]) INTO v_ids
    FROM unnest(p_category_ids) ids(id);
  PERFORM c.id FROM public.store_categories c
    WHERE c.id=ANY(v_ids) AND c.identity_id=p_expected_identity_id ORDER BY c.id FOR UPDATE;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>cardinality(v_ids) THEN
    RAISE EXCEPTION 'service_store_category_invalid_selection' USING ERRCODE='22023';
  END IF;
  -- Validate the complete set before touching any links. Empty set clears;
  -- stable links are retained, so a replay is an exact no-op on existing rows.
  DELETE FROM public.service_store_categories x
    WHERE x.service_id=p_service_id AND NOT (x.store_category_id=ANY(v_ids));
  INSERT INTO public.service_store_categories(service_id,store_category_id)
    SELECT p_service_id,id FROM unnest(v_ids) ids(id)
    ON CONFLICT (service_id,store_category_id) DO NOTHING;
  RETURN jsonb_build_object('service_id',p_service_id,'identity_id',p_expected_identity_id,
    'category_ids',v_ids,'assigned_count',cardinality(v_ids));
END;
$function$;
ALTER FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[])
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) TO authenticated;
COMMENT ON FUNCTION public.set_my_service_store_categories_v1(uuid,uuid,uuid[]) IS
  'Atomically replace the explicit shop-category set of an authorized canonical service; stored active identity and private/business access are checked under shared lock ordering. No content, lifecycle or media write.';

-- COMPONENT 02_profile_services.sql
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

-- COMPONENT 03_public_categories.sql
-- A viewed profile's category choices come from the whole visible section,
-- before category selection or pagination. Owner category readers stay intact.
CREATE FUNCTION public.get_public_profile_store_categories_v2(
 p_seller_slug text,p_content_scope text,
 p_result_limit integer DEFAULT 100,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan SET timezone='UTC'
AS $fn$
DECLARE
 actor uuid:=public.listing_actor_uid_hosted_v1();
 identity_value uuid;profile_identities uuid[];result jsonb;
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
  OR p_seller_slug<>btrim(p_seller_slug) THEN
  RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';END IF;
 IF p_content_scope IS NULL OR p_content_scope NOT IN('marketplace','services') THEN
  RAISE EXCEPTION 'public_profile_scope_invalid' USING ERRCODE='22023';END IF;
 IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>100
  OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
  RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';END IF;
 SELECT array_agg(candidate.identity_id) INTO profile_identities FROM (
  SELECT ip.identity_id FROM public.identity_profiles ip
  JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
  WHERE ip.slug=p_seller_slug LIMIT 2
 ) candidate;
 IF cardinality(profile_identities)=1 THEN identity_value:=profile_identities[1];END IF;

 WITH RECURSIVE linked_categories(id) AS (
  SELECT x.store_category_id FROM public.listing_store_categories x
  JOIN public.listings l ON l.id=x.listing_id
  WHERE p_content_scope='marketplace' AND l.identity_id=identity_value
   AND l.status='active' AND l.active_until>now()
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
      OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
  UNION
  SELECT x.store_category_id FROM public.horse_offer_store_categories x
  JOIN public.horse_offers h ON h.id=x.horse_offer_id
  WHERE p_content_scope='marketplace' AND h.identity_id=identity_value
   AND horse_publication_private.is_public(h.id)
   AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
    AND ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id)
      OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)))
  UNION
  SELECT x.store_category_id FROM public.service_store_categories x
  JOIN public.services s ON s.id=x.service_id
  WHERE p_content_scope='services' AND s.identity_id=identity_value
   AND service_publication_private.is_public(s.id)
   AND service_publication_private.visible_to_viewer(s.id)
 ), visible_categories(id,parent_id) AS (
  SELECT c.id,c.parent_id FROM public.store_categories c
  JOIN linked_categories x ON x.id=c.id WHERE c.identity_id=identity_value
  UNION
  SELECT c.id,c.parent_id FROM public.store_categories c
  JOIN visible_categories child ON child.parent_id=c.id
  WHERE c.identity_id=identity_value
 ), matched AS MATERIALIZED (
  SELECT c.id,c.identity_id,c.name,c.parent_id,c.sort_order,c.created_at
  FROM public.store_categories c JOIN visible_categories visible ON visible.id=c.id
  WHERE c.identity_id=identity_value
 ), page AS (
  SELECT * FROM matched ORDER BY sort_order ASC NULLS LAST,created_at ASC NULLS LAST,id ASC
  LIMIT p_result_limit OFFSET p_result_offset
 ), totals AS (SELECT count(*) n FROM matched)
 SELECT jsonb_build_object('schema_version',2,'content_scope','public_profile_store_categories',
  'filter_scope',p_content_scope,'seller_slug',p_seller_slug,'identity_id',identity_value::text,
  'profile_available',identity_value IS NOT NULL,
  'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',id::text,'identity_id',identity_id::text,'name',name,
    'parent_id',parent_id::text,'sort_order',sort_order)
    ORDER BY sort_order ASC NULLS LAST,created_at ASC NULLS LAST,id ASC) FROM page),'[]'::jsonb),
  'total_count',n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
  'has_more',n>p_result_offset::bigint+p_result_limit,
  'next_offset',CASE WHEN n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
   THEN p_result_offset+p_result_limit ELSE NULL END,
  'window_limit_reached',n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
 INTO result FROM totals;
 RETURN result;
END $fn$;
ALTER FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) TO anon,authenticated;
COMMENT ON FUNCTION public.get_public_profile_store_categories_v2(text,text,integer,integer) IS
 'Only categories with visible canonical content in the viewed profile section, plus same-identity ancestors. Marketplace follows listing/horse public visibility and blocks; services follow service public/viewer checks. Owner readers are unchanged.';
