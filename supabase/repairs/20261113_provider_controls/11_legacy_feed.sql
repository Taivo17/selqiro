-- A narrow own-preference projection for an invoker view. The unauthenticated
-- viewer gets no identities. It grants no direct access to the private table.
CREATE FUNCTION public.hidden_provider_ids_for_viewer_v1() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT h.provider_identity_id FROM provider_controls_private.hidden_providers h
 WHERE h.viewer_user_id=auth.uid() AND h.hidden_until>statement_timestamp();
$f$;
REVOKE ALL ON FUNCTION public.hidden_provider_ids_for_viewer_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.hidden_provider_ids_for_viewer_v1() TO anon,authenticated;

-- Top-level l.* retains the underlying FK column lineage for PostgREST embeds.
-- RLS and table grants are those of the real invoker, never the view owner.
CREATE VIEW public.discovery_listings_v1 WITH(security_invoker=true,security_barrier=true) AS
 WITH viewer_hidden AS MATERIALIZED(SELECT public.hidden_provider_ids_for_viewer_v1() identity_id)
 SELECT l.* FROM public.listings l
 WHERE NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.identity_id=l.identity_id)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
  AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)));
REVOKE ALL ON public.discovery_listings_v1 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.discovery_listings_v1 TO anon,authenticated;

-- Explicit to-many relationships avoid relying on CTE view FK inference.
-- SECURITY INVOKER preserves each related table's real RLS and SELECT grants.
CREATE FUNCTION public.listing_images(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_images
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT image.* FROM public.listing_images image WHERE image.listing_id=(p_listing).id;
$f$;
CREATE FUNCTION public.listing_translations(p_listing public.discovery_listings_v1) RETURNS SETOF public.listing_translations
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT translation.* FROM public.listing_translations translation WHERE translation.listing_id=(p_listing).id;
$f$;
REVOKE ALL ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_images(public.discovery_listings_v1),public.listing_translations(public.discovery_listings_v1)
 TO anon,authenticated;
