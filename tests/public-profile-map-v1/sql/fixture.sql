-- Additional synthetic tables for the actual public reader. No hosted data.
ALTER TABLE public.identity_profiles ADD COLUMN contact_phone text;
ALTER TABLE public.identity_profiles ADD COLUMN contact_email text;
ALTER TABLE public.identity_profiles ADD COLUMN banner_url text;
ALTER TABLE public.identity_profiles ADD COLUMN banner_dominant_color text;
CREATE TABLE public.user_blocks(blocker_id uuid NOT NULL,blocked_id uuid NOT NULL,PRIMARY KEY(blocker_id,blocked_id));
REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated,service_role;

-- The unrelated media projection is inert; the actual profile eligibility
-- reader, account helper, canonical location validator and map RPC are loaded.
CREATE SCHEMA profile_media_private;
REVOKE ALL ON SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION profile_media_private.slot_url(uuid,text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT NULL::text$$;
REVOKE ALL ON FUNCTION profile_media_private.slot_url(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
DROP FUNCTION public.get_store_by_slug(text);

INSERT INTO public.identity_profiles(identity_id,display_name,slug,country,city,address_text,location_visibility,lat,lng) VALUES
 ('22222222-2222-4222-8222-222222222222','Private fixture','private-fixture','Estonia','Valga','DO NOT PUBLISH PRIVATE ADDRESS','city',41.123456,21.123456),
 ('44444444-4444-4444-8444-444444444444','Other fixture','other-fixture','Estonia','Valga','','city',51.123456,31.123456),
 ('66666666-6666-4666-8666-666666666666','Business fixture','business-fixture','Estonia','Valga','Synthetic business street 12','exact',61.123456,11.123456);
