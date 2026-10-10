-- Intended API boundary, exercised ONLY in the disposable composed release tests.
-- A later production application needs a separate audited migration and consent.
GRANT EXECUTE ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid),
  public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer),
  public.get_public_listing_detail_v1(text),
  public.get_public_profile_listings_v1(text,uuid,integer,integer)
  TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid)
  TO authenticated;
-- No broad table grant to API roles; no new privilege for service_role; no grant
-- for internal locks, raw snapshots, price-CAS, wanted projector or arbitrary SQL.
-- Existing v1/v2 readers and all non-price writers remain unchanged.
