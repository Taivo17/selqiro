-- Synthetic local fixture. No hosted project credentials or original user rows.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz DEFAULT clock_timestamp(),deleted_at timestamptz,banned_until timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fixture_uid$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$fixture_uid$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,active_identity_id uuid,bio text,store_slug text,is_premium boolean,banner_dominant_color text);
CREATE TABLE public.identities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),type text NOT NULL,user_id uuid,business_account_id uuid,
 display_name text NOT NULL,status text NOT NULL DEFAULT 'active',updated_by uuid,updated_at timestamptz);
CREATE TABLE public.business_accounts(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL,status text NOT NULL DEFAULT 'active');
CREATE TABLE public.business_members(business_account_id uuid,user_id uuid,status text NOT NULL DEFAULT 'active',PRIMARY KEY(business_account_id,user_id));
CREATE TABLE public.identity_profiles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),identity_id uuid NOT NULL UNIQUE REFERENCES public.identities(id),
 display_name text NOT NULL,slug text,bio text,website_url text,country text,city text,address_text text,location_visibility text NOT NULL DEFAULT 'city',
 lat double precision,lng double precision,created_by_user_id uuid,updated_by_user_id uuid,updated_at timestamptz,avatar_url text);
CREATE SCHEMA account_lifecycle_private;
REVOKE ALL ON SCHEMA account_lifecycle_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE account_lifecycle_private.account_states(account_user_id uuid PRIMARY KEY REFERENCES auth.users(id),state text NOT NULL DEFAULT 'active',
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),initialized_at timestamptz NOT NULL DEFAULT statement_timestamp());
ALTER TABLE account_lifecycle_private.account_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles,public.identities,public.identity_profiles,public.business_accounts,public.business_members,
 account_lifecycle_private.account_states FROM PUBLIC,anon,authenticated,service_role;
-- Match the deployment's broad public function defaults: every new release
-- function must revoke these itself rather than passing a permissive fixture.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
-- Optional catalog routines are deliberately inert fixtures, never invoked.
CREATE FUNCTION public.get_my_active_identity_profile_details() RETURNS void LANGUAGE sql AS $$SELECT$$;
CREATE FUNCTION public.update_my_active_identity_location(text,text,double precision,double precision) RETURNS void LANGUAGE sql AS $$SELECT$$;
CREATE FUNCTION public.save_my_active_identity_profile(text,text,text,text,text,text) RETURNS void LANGUAGE sql AS $$SELECT$$;
CREATE FUNCTION public.get_store_by_slug(text) RETURNS void LANGUAGE sql AS $$SELECT$$;
REVOKE EXECUTE ON FUNCTION public.update_my_active_identity_location(text,text,double precision,double precision),
 public.save_my_active_identity_profile(text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;

INSERT INTO auth.users(id) VALUES('11111111-1111-4111-8111-111111111111'),('33333333-3333-4333-8333-333333333333');
INSERT INTO account_lifecycle_private.account_states(account_user_id) SELECT id FROM auth.users;
INSERT INTO public.identities(id,type,user_id,display_name) VALUES
 ('22222222-2222-4222-8222-222222222222','private','11111111-1111-4111-8111-111111111111','Private fixture'),
 ('44444444-4444-4444-8444-444444444444','private','33333333-3333-4333-8333-333333333333','Other fixture');
INSERT INTO public.business_accounts(id,owner_user_id) VALUES('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111');
INSERT INTO public.business_members(business_account_id,user_id) VALUES
 ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111'),
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333');
INSERT INTO public.identities(id,type,business_account_id,display_name) VALUES
 ('66666666-6666-4666-8666-666666666666','business','55555555-5555-4555-8555-555555555555','Business fixture');
INSERT INTO public.profiles(id,active_identity_id) VALUES
 ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444');
