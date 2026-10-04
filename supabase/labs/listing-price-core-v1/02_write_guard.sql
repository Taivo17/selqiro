-- LOCAL LAB ONLY. Preserve old unstructured rows; never allow a structured downgrade.
-- SECURITY INVOKER is intentional: effective SQL role, NOT a client-controlled GUC.
CREATE FUNCTION public.guard_listing_price_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb; changed boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'listing_price_direct_truncate_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.price_kind IS NOT NULL AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'listing_price_direct_delete_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_revision IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      RETURN NEW; -- temporary old creator path; NOT a new UI option
    END IF;
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
    END IF;
    NEW.price_revision := 1;
  ELSE
    IF NEW.price_revision IS DISTINCT FROM OLD.price_revision THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    IF OLD.price_kind IS NOT NULL AND NEW.price_kind IS NULL THEN
      RAISE EXCEPTION 'listing_price_downgrade_forbidden' USING ERRCODE='42501';
    END IF;
    IF OLD.price_kind IS NOT NULL AND
       ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id)
       IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id) THEN
      RAISE EXCEPTION 'listing_price_owner_tuple_immutable' USING ERRCODE='42501';
    END IF;
    changed := ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
      IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price);
    IF NOT changed THEN RETURN NEW; END IF;
    IF (OLD.price_kind IS NOT NULL OR NEW.price_kind IS NOT NULL) AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
    END IF;
    IF OLD.price_revision = 9223372036854775807 THEN
      RAISE EXCEPTION 'listing_price_revision_exhausted' USING ERRCODE='54000';
    END IF;
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      NEW.price_revision := OLD.price_revision + 1;
      RETURN NEW;
    END IF;
  END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',NEW.price_kind,'amount',NEW.price_amount::text,'currency',NEW.currency));
  NEW.price_amount := (normalized->>'amount')::numeric;
  NEW.currency := normalized->>'currency';
  NEW.price := public.listing_price_legacy_label_v1(normalized);
  IF TG_OP = 'UPDATE' THEN
    IF ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
       IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price) THEN
      NEW.price_revision := OLD.price_revision + 1;
    END IF;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.guard_listing_price_v1() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER trg_listing_price_guard_v1 BEFORE INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_listing_price_v1();
CREATE TRIGGER trg_listing_price_truncate_guard_v1 BEFORE TRUNCATE ON public.listings
  FOR EACH STATEMENT EXECUTE FUNCTION public.guard_listing_price_v1();
