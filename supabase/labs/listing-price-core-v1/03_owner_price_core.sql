-- Closed composition primitive. NO API-role EXECUTE grant in this candidate.
-- Later create/basic-edit/public-reader integration is a separate checkpoint.
CREATE FUNCTION public.set_my_listing_price_core_v1(
  p_listing_id text, p_expected_identity_id uuid,
  p_expected_price_revision text, p_price jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE
  actor uuid := auth.uid(); active_id uuid; row_id bigint; expected_revision bigint;
  identity_row public.identities%ROWTYPE; current_row public.listings%ROWTYPE;
  normalized jsonb; is_changed boolean;
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
  IF p_expected_price_revision IS NULL OR char_length(p_expected_price_revision)>19
     OR p_expected_price_revision !~ '^(0|[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  IF p_expected_price_revision::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  row_id := p_listing_id::bigint; expected_revision := p_expected_price_revision::bigint;
  -- Fixed lock order: caller profile, identity, business membership, then listing.
  SELECT p.active_identity_id INTO active_id FROM public.profiles p
    WHERE p.id=actor FOR SHARE;
  IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO identity_row FROM public.identities i
    WHERE i.id=active_id AND i.status='active' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF identity_row.type='business' THEN
    PERFORM 1 FROM public.business_members m
      WHERE m.business_account_id=identity_row.business_account_id
        AND m.user_id=actor AND m.status='active' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
    END IF;
  END IF;
  IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  SELECT l.* INTO current_row FROM public.listings l
    WHERE l.id=row_id AND l.identity_id=active_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_not_found_or_forbidden' USING ERRCODE='42501';
  END IF;
  -- Check revision BEFORE no-op: stale callers cannot bypass conflict detection.
  IF current_row.price_revision IS DISTINCT FROM expected_revision THEN
    RAISE EXCEPTION 'listing_price_conflict' USING ERRCODE='40001';
  END IF;
  normalized := public.normalize_listing_price_v1(p_price);
  is_changed := ROW(current_row.price_kind,current_row.price_amount,current_row.currency)
    IS DISTINCT FROM ROW(normalized->>'kind',(normalized->>'amount')::numeric,normalized->>'currency');
  IF is_changed THEN
    UPDATE public.listings SET price_kind=normalized->>'kind',
      price_amount=(normalized->>'amount')::numeric, currency=normalized->>'currency'
      WHERE id=row_id RETURNING * INTO current_row;
  END IF;
  RETURN jsonb_build_object('listing_id',row_id::text,'identity_id',active_id::text,
    'price',public.listing_price_snapshot_v1(current_row.price_kind,current_row.price_amount,
       current_row.currency,current_row.price_revision,current_row.price), 'changed',is_changed);
END $fn$;
REVOKE ALL ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb) IS
 'Local candidate: closed price CAS composition primitive, NOT a standalone activated client API.';
