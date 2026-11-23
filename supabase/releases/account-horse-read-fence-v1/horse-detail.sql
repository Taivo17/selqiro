-- Only horse account eligibility changes; public output and prior ordinary branch are retained.
CREATE OR REPLACE FUNCTION public.get_public_horse_offer_v1(p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb; actor uuid:=public.listing_actor_uid_hosted_v1();
BEGIN
 SELECT jsonb_build_object('schema_version',1,'content_type','horse_offer','content_id',h.id,
  'offer_type',h.offer_type,'title',h.title,'description',h.description,
  'price',horse_publication_private.public_price(h),'country','EE',
  'city',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,city_or_municipality}' ELSE h.city END,
  'region',CASE WHEN h.offer_type='wanted' THEN h.details#>>'{wanted,search_area,region}' ELSE h.region END,
  'fields',horse_publication_private.public_fields(h),
  'images',coalesce((SELECT jsonb_agg(jsonb_build_object('id',im.id,'url',im.original_url)
    ORDER BY im.is_primary DESC,im.sort_order,im.created_at,im.id) FROM public.horse_offer_images im WHERE im.horse_offer_id=h.id),'[]'::jsonb),
  'seller_name',ip.display_name,'seller_slug',ip.slug,'seller_type',i.type,
  'published_at',h.published_at,'active_until',h.active_until)
 INTO result FROM public.horse_offers h
 JOIN LATERAL (
   SELECT account_identity.* FROM public.identities account_identity
   LEFT JOIN public.business_accounts account_business ON account_business.id=account_identity.business_account_id
   WHERE account_identity.id=h.identity_id AND account_identity.status='active'
    AND account_identity.type IN ('private','business')
    AND account_lifecycle_private.account_is_available(
     CASE WHEN account_identity.type='private' THEN account_identity.user_id ELSE account_business.owner_user_id END)
   OFFSET 0
  ) i ON true
 JOIN public.identity_profiles ip ON ip.identity_id=i.id
 WHERE h.id=p_offer_id AND horse_publication_private.is_public(h.id)
  AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL AND
    ((b.blocker_id=actor AND b.blocked_id=h.created_by_user_id) OR (b.blocked_id=actor AND b.blocker_id=h.created_by_user_id)));
 RETURN result;
END $f$;
