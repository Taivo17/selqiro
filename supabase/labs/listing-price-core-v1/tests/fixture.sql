-- DISPOSABLE HELPER FIXTURE ONLY. Seven selected tables; synthetic identities/rows.
-- Table declarations are prior reviewed definitions; selected functions are exact Oct 3 catalog bodies.
\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE anon NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
CREATE ROLE service_role NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT BYPASSRLS;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$
;
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$
;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "store_name" "text",
    "store_slug" "text",
    "bio" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_premium" boolean DEFAULT false NOT NULL,
    "premium_until" timestamp with time zone,
    "home_country" "text",
    "home_city" "text",
    "home_lat" double precision,
    "home_lng" double precision,
    "banner_dominant_color" "text",
    "avatar_dominant_color" "text",
    "language" "text" DEFAULT 'en'::"text",
    "active_identity_id" "uuid"
);
alter table public.profiles add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."identities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "user_id" "uuid",
    "business_account_id" "uuid",
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "identities_type_check" CHECK (("type" = ANY (ARRAY['private'::"text", 'business'::"text"]))),
    CONSTRAINT "identity_owner_check" CHECK (((("type" = 'private'::"text") AND ("user_id" IS NOT NULL) AND ("business_account_id" IS NULL)) OR (("type" = 'business'::"text") AND ("business_account_id" IS NOT NULL))))
);
alter table public.identities add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."business_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_account_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'owner'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
alter table public.business_members add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text",
    "description" "text",
    "price" "text",
    "image" "text",
    "status" "text" DEFAULT 'active'::"text",
    "category" "text" DEFAULT 'general'::"text",
    "condition" "text" DEFAULT 'used'::"text",
    "country" "text",
    "city" "text",
    "location" "text",
    "user_id" "uuid",
    "ai_title" "text",
    "ai_description" "text",
    "ai_category" "text",
    "ai_detected_brand" "text",
    "ai_detected_type" "text",
    "ai_confidence" double precision,
    "ai_raw" "jsonb",
    "manufacturer" "text",
    "part_number" "text",
    "oem_number" "text",
    "vehicle_brand" "text",
    "vehicle_model" "text",
    "vehicle_year" "text",
    "engine" "text",
    "compatibility" "jsonb",
    "is_featured" boolean DEFAULT false,
    "featured_until" timestamp with time zone,
    "ai_enriched" boolean DEFAULT false,
    "ai_level" "text" DEFAULT 'none'::"text",
    "item_type" "text",
    "subcategory" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_status" "text" DEFAULT 'not_started'::"text",
    "ai_review_required" boolean DEFAULT false,
    "ai_reviewed_by_user" boolean DEFAULT false,
    "search_text" "text",
    "active_until" timestamp with time zone,
    "is_boosted" boolean DEFAULT false,
    "boost_until" timestamp without time zone,
    "seo_title" "text",
    "seo_description" "text",
    "description_en" "text",
    "ai_detected_object" "text",
    "ai_suggested_category" "text",
    "ai_suggested_subcategory" "text",
    "ai_suggested_title" "text",
    "ai_suggested_brand" "text",
    "ai_suggested_model" "text",
    "ai_suggestion_json" "jsonb",
    "price_amount" numeric,
    "search_vector" "tsvector",
    "listing_lat" double precision,
    "listing_lng" double precision,
    "listing_language" "text" DEFAULT 'en'::"text",
    "identity_id" "uuid",
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid"
);
alter table public.listings add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."listing_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "listing_id" bigint,
    "user_id" "uuid",
    "original_url" "text" NOT NULL,
    "medium_url" "text",
    "thumb_url" "text",
    "sort_order" integer DEFAULT 0,
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);
alter table public.listing_images add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."store_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    CONSTRAINT "store_categories_name_valid_check" CHECK (((("char_length"("name") >= 1) AND ("char_length"("name") <= 60)) AND ("name" = "regexp_replace"("btrim"("name"), '[[:space:]]+'::"text", ' '::"text", 'g'::"text"))))
);
alter table public.store_categories add primary key (id);
CREATE TABLE IF NOT EXISTS "public"."listing_store_categories" (
    "listing_id" bigint NOT NULL,
    "store_category_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
alter table public.listing_store_categories add primary key (listing_id, store_category_id);
alter table public.business_members add unique (business_account_id, user_id);
CREATE OR REPLACE FUNCTION public.current_user_has_identity_access(p_identity_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id = p_identity_id
        and identity.status = 'active'
        and (
          (
            identity.type = 'private'
            and identity.user_id = auth.uid()
          )
          or
          (
            identity.type = 'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
    );
$function$
;
CREATE OR REPLACE FUNCTION public.update_listing_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.search_vector :=
    to_tsvector(
      'simple',
      concat_ws(
        ' ',
        new.title,
        new.description,
        new.search_text,
        new.category,
        new.subcategory,
        new.condition,
        new.country,
        new.city,
        new.location,
        coalesce(new.details::text, '')
      )
    );

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.renew_my_listing_activity_v1(p_listing_id text, p_expected_active_until timestamp with time zone)
 RETURNS TABLE(listing_id text, status text, active_until timestamp with time zone, changed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
 SET "TimeZone" TO 'UTC'
 SET lock_timeout TO '2s'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_identity uuid;
  v_id bigint;
  v_status text;
  v_existing_until timestamptz;
  v_new_until timestamptz;
  v_affected bigint;
begin
  if v_actor is null then
    raise exception 'listing_activity_authentication_required' using errcode = '42501';
  end if;
  if p_listing_id is null or char_length(p_listing_id) > 19
    or p_listing_id !~ '^[1-9][0-9]*$' then
    raise exception 'listing_activity_id_invalid' using errcode = '22023';
  end if;
  if p_listing_id::numeric > 9223372036854775807 then
    raise exception 'listing_activity_id_invalid' using errcode = '22023';
  end if;
  v_id := p_listing_id::bigint;
  if p_expected_active_until is not null and not isfinite(p_expected_active_until) then
    raise exception 'listing_activity_deadline_invalid' using errcode = '22023';
  end if;

  -- Same profile-before-listing lock order as the existing classification writer.
  -- A concurrent active-identity switch must wait or this request fails closed.
  select profile.active_identity_id into v_identity
  from public.profiles profile where profile.id = v_actor for update;
  if v_identity is null or not coalesce(
    public.current_user_has_identity_access(v_identity), false
  ) then
    raise exception 'listing_activity_identity_required' using errcode = '42501';
  end if;

  -- Filter ownership BEFORE locking. No legacy user_id fallback or identity adoption.
  select listing.status, listing.active_until into v_status, v_existing_until
  from public.listings listing
  where listing.id = v_id and listing.identity_id = v_identity
  for update;
  if not found then
    raise exception 'listing_activity_not_found_or_forbidden' using errcode = '42501';
  end if;
  if v_status is distinct from 'active' then
    raise exception 'listing_activity_active_status_required' using errcode = '55000';
  end if;
  if v_existing_until is not null and not isfinite(v_existing_until) then
    raise exception 'listing_activity_deadline_invalid' using errcode = '22023';
  end if;
  if v_existing_until is distinct from p_expected_active_until then
    raise exception 'listing_activity_conflict' using errcode = '40001';
  end if;

  -- Historical NULL expiry is currently publicly valid. Do not silently shorten it.
  -- New finite-expiry creation and legacy data migration are separate contracts.
  if v_existing_until is null then
    return query select v_id::text, v_status, v_existing_until, false;
    return;
  end if;

  -- The browser cannot set duration, a new expiry, status or actor identity.
  -- UTC makes this 90 * 24 hours, independent of client/session daylight-saving rules.
  v_new_until := clock_timestamp() + interval '90 days';
  if v_existing_until >= v_new_until then
    return query select v_id::text, v_status, v_existing_until, false;
    return;
  end if;
  update public.listings listing set active_until = v_new_until
  where listing.id = v_id and listing.identity_id = v_identity
    and listing.status = 'active'
    and listing.active_until is not distinct from p_expected_active_until;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'listing_activity_conflict' using errcode = '40001';
  end if;
  return query select v_id::text, v_status, v_new_until, true;
end;
$function$
;
CREATE TRIGGER trg_update_listing_search_vector BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.update_listing_search_vector();
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
-- Reproduce observed broad listings table privileges (including TRUNCATE) plus all 4 policies.
GRANT ALL ON public.listings TO anon,authenticated,service_role;
CREATE POLICY "Public can view listings" ON public.listings FOR SELECT TO PUBLIC USING (true);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY "Users can insert own listings" ON public.listings FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
REVOKE ALL ON public.profiles,public.identities,public.business_members FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.profiles,public.identities,public.business_members TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_has_identity_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.renew_my_listing_activity_v1(text,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.renew_my_listing_activity_v1(text,timestamptz) TO authenticated;
COMMIT;
