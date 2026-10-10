-- Owner edit integration adapter, NOT a deployment migration or an API grant.
-- Reuses the retained atomic read/save in listing-price-integration-v1/05.
-- This file is tested only in the disposable fixture. A reviewed release assembly
-- must remove this exact fixture gate and coordinate all legacy writers before opening it.
DO $gate$ BEGIN
  IF current_database() <> 'selqiro_price_core_fixture' OR current_user <> 'postgres' THEN
    RAISE EXCEPTION 'listing_edit_adapter_disposable_fixture_required';
  END IF;
END $gate$;

CREATE FUNCTION public.get_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := auth.uid(); snapshot jsonb;
BEGIN
  -- Client pre/post-auth observations alone cannot bind the JWT actually used by an RPC.
  -- Even two accounts with membership in the same business must not cross an editor session.
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  snapshot := public.get_my_listing_basics_v1(p_listing_id, p_expected_identity_id);
  RETURN jsonb_build_object('schema_version', 1, 'actor_id', actor::text, 'snapshot', snapshot);
END $fn$;

CREATE FUNCTION public.save_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid,
  p_expected_basics jsonb, p_basics jsonb,
  p_price_change jsonb DEFAULT NULL, p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := auth.uid(); saved jsonb;
BEGIN
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  -- One nested SQL call, never two client writes. Errors retain the original rollback/CAS contract.
  saved := public.save_my_listing_basics_v1(p_listing_id, p_expected_identity_id,
    p_expected_basics, p_basics, p_price_change, p_expected_price_revision);
  RETURN saved || jsonb_build_object('actor_id', actor::text);
END $fn$;

ALTER FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid) OWNER TO postgres;
ALTER FUNCTION public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid),
  public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)
  FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON FUNCTION public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text) IS
  'Closed integration adapter: exact expected JWT actor plus retained active-identity/basic-value/price-revision checks. No API exposure or legacy-writer retirement in this file.';
