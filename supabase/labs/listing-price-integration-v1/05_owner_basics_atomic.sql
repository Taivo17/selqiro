-- CLOSED LOCAL CANDIDATE ONLY. Every new callable remains closed to API roles.
CREATE FUNCTION public.lock_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_for_update boolean
) RETURNS public.listings LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, auth, pg_temp
AS $fn$
DECLARE actor uuid:=auth.uid(); active_id uuid; row_id bigint;
  identity_row public.identities%ROWTYPE; listing_row public.listings%ROWTYPE;
BEGIN
  IF actor IS NULL OR p_expected_identity_id IS NULL THEN
    RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
  END IF;
  IF p_listing_id IS NULL OR char_length(p_listing_id)>19
     OR p_listing_id !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  row_id:=p_listing_id::bigint;
  -- Same lock order as the retained core: profile -> identity -> membership -> listing.
  SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR SHARE;
  IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF identity_row.type='business' THEN
    PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
      AND m.user_id=actor AND m.status='active' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
    END IF;
  END IF;
  IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF p_for_update IS TRUE THEN
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR UPDATE;
  ELSE
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR SHARE;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_not_found_or_forbidden' USING ERRCODE='42501';
  END IF;
  RETURN listing_row;
END $fn$;

-- VOLATILE because row locking is intentional. This reader makes NO data writes.
CREATE FUNCTION public.get_my_listing_basics_v1(p_listing_id text,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE;
BEGIN
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,false);
  RETURN public.listing_basics_snapshot_v1(r);
END $fn$;

CREATE FUNCTION public.save_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_expected_basics jsonb,p_basics jsonb,
  p_price_change jsonb DEFAULT NULL,p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE; normalized jsonb; price_result jsonb;
  basics_changed boolean; price_changed boolean:=false;
BEGIN
  normalized:=public.normalize_listing_basics_v1(p_basics);
  IF p_expected_basics IS NULL OR jsonb_typeof(p_expected_basics) IS DISTINCT FROM 'object'
     OR octet_length(p_expected_basics::text)>65536 THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_expected_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
     OR EXISTS (SELECT 1 FROM jsonb_each(p_expected_basics) e WHERE jsonb_typeof(e.value) NOT IN ('string','null')) THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF p_price_change IS NULL AND p_expected_price_revision IS NOT NULL THEN
    RAISE EXCEPTION 'listing_price_omission_invalid' USING ERRCODE='22023';
  END IF;
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
  -- Compare exact original basic fields, BEFORE no-op; do not fetch a new expected baseline.
  IF public.listing_basics_values_v1(r) IS DISTINCT FROM p_expected_basics THEN
    RAISE EXCEPTION 'listing_basics_conflict' USING ERRCODE='40001';
  END IF;
  basics_changed:=public.listing_basics_values_v1(r) IS DISTINCT FROM normalized;
  IF p_price_change IS NOT NULL THEN
    -- Internal SQL call, not a second client request. Errors roll back the whole call.
    price_result:=public.set_my_listing_price_core_v1(p_listing_id,p_expected_identity_id,
      p_expected_price_revision,p_price_change);
    price_changed:=(price_result->>'changed')::boolean;
    SELECT l.* INTO STRICT r FROM public.listings l WHERE l.id=r.id;
  END IF;
  IF basics_changed THEN
    r.title:=normalized->>'title'; r.description:=normalized->>'description'; r.condition:=normalized->>'condition';
    UPDATE public.listings l SET title=r.title,description=r.description,condition=r.condition,
      search_text=public.listing_basics_search_text_v1(r),updated_by_user_id=auth.uid()
      WHERE l.id=r.id RETURNING l.* INTO r;
  ELSIF price_changed THEN
    UPDATE public.listings l SET updated_by_user_id=auth.uid() WHERE l.id=r.id RETURNING l.* INTO r;
  END IF;
  RETURN jsonb_build_object('schema_version',1,'snapshot',public.listing_basics_snapshot_v1(r),
    'basics_changed',basics_changed,'price_changed',price_changed);
END $fn$;

REVOKE ALL ON FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean),
 public.get_my_listing_basics_v1(text,uuid),
 public.save_my_listing_basics_v1(text,uuid,jsonb,jsonb,jsonb,text)
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.save_my_listing_basics_v1(text,uuid,jsonb,jsonb,jsonb,text) IS
 'Closed local candidate: atomic basics and optional price CAS. No create/status/expiry/images/category writes. Not activated.';
