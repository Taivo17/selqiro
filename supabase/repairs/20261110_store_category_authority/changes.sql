-- COMPONENT 01_authority.sql
-- Clients assign categories only through the existing atomic, identity-checked
-- RPC. Table-level TRUNCATE and future ALL-granted privileges cannot rely on RLS.
REVOKE ALL PRIVILEGES ON TABLE public.listing_store_categories
  FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.listing_store_categories TO anon,authenticated;
DROP POLICY "users can manage own listing store categories"
  ON public.listing_store_categories;
