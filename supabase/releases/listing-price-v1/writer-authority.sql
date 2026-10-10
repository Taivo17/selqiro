-- Release candidate authority. Included only by the fixture-gated composition.
-- One NOLOGIN role owns only the exact price-CAS writer; no API role may SET it.
CREATE ROLE selqiro_listing_price_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
  NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- postgres is the existing trusted schema administrator, not an application role.
-- Inheritance enables managing the function; it does NOT change current_user in
-- an older postgres-owned SECURITY DEFINER function.
GRANT selqiro_listing_price_writer_v1 TO postgres WITH ADMIN TRUE;
GRANT selqiro_listing_price_writer_v1 TO postgres WITH INHERIT TRUE;
GRANT selqiro_listing_price_writer_v1 TO postgres WITH SET TRUE;
GRANT USAGE ON SCHEMA public TO selqiro_listing_price_writer_v1;
GRANT SELECT ON public.listings TO selqiro_listing_price_writer_v1;
GRANT UPDATE (price_kind, price_amount, currency) ON public.listings
  TO selqiro_listing_price_writer_v1;
CREATE POLICY listing_price_writer_v1_update ON public.listings
  FOR UPDATE TO selqiro_listing_price_writer_v1
  USING (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id))
  WITH CHECK (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));
-- The fixed definer locker checks and locks profile, identity, membership and row.
-- No SELECT/UPDATE on those account tables is granted to this role: this also
-- avoids entering legacy self-referencing PUBLIC membership RLS from the writer.
GRANT EXECUTE ON FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean),
  public.current_user_has_identity_access(uuid),
  public.listing_price_currency_scale_v1(text), public.normalize_listing_price_v1(jsonb),
  public.listing_price_legacy_label_v1(jsonb),
  public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
  public.listing_price_snapshot_v1(text,numeric,text,bigint,text)
  TO selqiro_listing_price_writer_v1;
-- Ownership transfer requires CREATE on the destination schema. Remove it again
-- in this same transaction. No dynamic SQL or arbitrary caller names are accepted.
GRANT CREATE ON SCHEMA public TO selqiro_listing_price_writer_v1;
ALTER FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  OWNER TO selqiro_listing_price_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_price_writer_v1;
REVOKE ALL ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb) IS
  'Release composition: closed dedicated-role price CAS; fixed definer locker validates and locks actor context. No direct API grant.';
