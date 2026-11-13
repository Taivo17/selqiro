-- Select the same canonical/legacy slug candidate first. A blocked selected
-- profile must not fall through to another account's coinciding legacy alias.
-- Temporary discovery hiding never affects direct profile access.
CREATE OR REPLACE FUNCTION public.get_store_by_slug(store_slug_input text)
RETURNS TABLE(identity_profile_id uuid,identity_id uuid,identity_type text,business_account_id uuid,
 display_name text,slug text,bio text,avatar_url text,banner_url text,banner_dominant_color text,
 contact_phone text,contact_email text,website_url text,address_text text,city text,country text,
 lat double precision,lng double precision,location_visibility text,legacy_user_id uuid,is_premium boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp AS $f$
 WITH selected AS MATERIALIZED(
  SELECT ip.id identity_profile_id,i.id identity_id,i.type identity_type,i.business_account_id,
   ip.display_name,ip.slug,coalesce(ip.bio,p.bio) bio,coalesce(ip.avatar_url,p.avatar_url) avatar_url,
   coalesce(ip.banner_url,p.banner_url) banner_url,coalesce(ip.banner_dominant_color,p.banner_dominant_color) banner_dominant_color,
   ip.contact_phone,ip.contact_email,ip.website_url,ip.address_text,ip.city,ip.country,
   ip.lat,ip.lng,ip.location_visibility,i.user_id legacy_user_id,coalesce(p.is_premium,false) is_premium,
   CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END block_account_id
  FROM public.identity_profiles ip JOIN public.identities i ON i.id=ip.identity_id
  LEFT JOIN public.profiles p ON p.id=i.user_id
  LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
  WHERE ip.slug=store_slug_input OR p.store_slug=store_slug_input
  ORDER BY CASE WHEN ip.slug=store_slug_input THEN 0 ELSE 1 END LIMIT 1
 )
 SELECT s.identity_profile_id,s.identity_id,s.identity_type,s.business_account_id,s.display_name,s.slug,s.bio,
 s.avatar_url,s.banner_url,s.banner_dominant_color,s.contact_phone,s.contact_email,s.website_url,s.address_text,
 s.city,s.country,s.lat,s.lng,s.location_visibility,s.legacy_user_id,s.is_premium FROM selected s
 WHERE NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
 AND ((b.blocker_id=auth.uid() AND b.blocked_id=s.block_account_id)
 OR (b.blocked_id=auth.uid() AND b.blocker_id=s.block_account_id)));
$f$;
