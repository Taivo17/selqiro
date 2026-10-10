-- GENERATED DISPOSABLE-HELPER BASELINE; SYNTHETIC AUTH/ROWS ONLY.
-- SOURCE: supabase/labs/listing-price-core-v1/tests/fixture.sql
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

-- SOURCE: supabase/labs/listing-public-read-v1/tests/reader-fixture-extension.sql
-- TWO extra declarations from the reviewed public-search fixture; synthetic rows only.
BEGIN;
CREATE TABLE IF NOT EXISTS "public"."identity_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "slug" "text",
    "bio" "text",
    "avatar_url" "text",
    "banner_url" "text",
    "banner_dominant_color" "text",
    "contact_phone" "text",
    "contact_email" "text",
    "website_url" "text",
    "address_text" "text",
    "city" "text",
    "country" "text",
    "lat" double precision,
    "lng" double precision,
    "location_visibility" "text" DEFAULT 'city'::"text" NOT NULL,
    "created_by_user_id" "uuid",
    "updated_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "plan" "text" DEFAULT 'free'::"text",
    CONSTRAINT "identity_profiles_plan_check" CHECK (("plan" = ANY (ARRAY['free'::"text", 'premium'::"text", 'business'::"text"])))
);
ALTER TABLE public.identity_profiles ADD PRIMARY KEY(id);
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.identity_profiles FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" bigint NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);
ALTER TABLE public.user_blocks ADD PRIMARY KEY(id);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE public.identity_profiles ADD UNIQUE(identity_id);
ALTER TABLE public.user_blocks ADD UNIQUE(blocker_id,blocked_id);
COMMIT;

-- SOURCE: supabase/labs/listing-owner-read-v1/tests/fixture-extension.sql
-- Synthetic extension ONLY in a new disposable helper. Not a full Supabase schema.
-- Horse declaration and helpers copied verbatim from tracked migrations below.
-- auth.users is an ID-only stub for foreign keys; no real accounts/data copied.
BEGIN;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
create table public.horse_offers (
  id uuid primary key
    default gen_random_uuid(),

  identity_id uuid not null
    references public.identities(id)
    on delete cascade,

  created_by_user_id uuid
    references auth.users(id)
    on delete set null,

  updated_by_user_id uuid
    references auth.users(id)
    on delete set null,

  offer_type text not null,

  status text not null
    default 'draft',

  market_country_code text not null
    default 'EE',

  horse_location_country_code text not null
    default 'EE',

  title text not null
    default '',

  description text not null
    default '',

  price_amount numeric(12, 2),

  price_type text not null
    default 'contact',

  currency text not null
    default 'EUR',

  image_url text,

  horse_name text,
  birth_year integer,
  sex text,
  breed text,
  color text,
  height_cm numeric(6, 1),
  discipline text,
  training_level text,
  suitability text,
  health_notes text,
  behavior_notes text,

  city text,
  region text,
  location_text text,
  horse_lat double precision,
  horse_lng double precision,

  details jsonb not null
    default '{}'::jsonb,

  current_publication_event_id uuid,

  published_at timestamptz,
  held_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  active_until timestamptz,

  search_vector tsvector not null
    default ''::tsvector,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint horse_offers_offer_type_check
    check (
      offer_type = any (
        array[
          'sale',
          'free_transfer',
          'lease',
          'co_rider',
          'wanted'
        ]::text[]
      )
    ),

  constraint horse_offers_status_check
    check (
      status = any (
        array[
          'draft',
          'published',
          'held_for_review',
          'paused',
          'closed',
          'rejected',
          'archived'
        ]::text[]
      )
    ),

  constraint horse_offers_ee_market_check
    check (
      market_country_code = 'EE'
      and horse_location_country_code = 'EE'
    ),

  constraint horse_offers_title_length_check
    check (
      char_length(title) <= 140
    ),

  constraint horse_offers_description_length_check
    check (
      char_length(description) <= 5000
    ),

  constraint horse_offers_price_amount_check
    check (
      price_amount is null
      or price_amount between 0 and 9999999999.99
    ),

  constraint horse_offers_price_type_check
    check (
      price_type = any (
        array[
          'fixed',
          'from',
          'contact',
          'free'
        ]::text[]
      )
    ),

  constraint horse_offers_price_contract_check
    check (
      (
        offer_type = 'free_transfer'
        and price_type = 'free'
        and price_amount is null
      )
      or
      (
        offer_type <> 'free_transfer'
        and price_type = 'contact'
        and price_amount is null
      )
      or
      (
        offer_type <> 'free_transfer'
        and price_type = any (
          array[
            'fixed',
            'from'
          ]::text[]
        )
        and price_amount is not null
      )
    ),

  constraint horse_offers_currency_check
    check (
      currency = 'EUR'
    ),

  constraint horse_offers_image_url_check
    check (
      image_url is null
      or char_length(
        btrim(image_url)
      ) between 1 and 2000
    ),

  constraint horse_offers_horse_name_check
    check (
      horse_name is null
      or char_length(horse_name) <= 160
    ),

  constraint horse_offers_birth_year_check
    check (
      birth_year is null
      or birth_year between 1900 and 2100
    ),

  constraint horse_offers_sex_check
    check (
      sex is null
      or sex = any (
        array[
          'mare',
          'gelding',
          'stallion',
          'unknown'
        ]::text[]
      )
    ),

  constraint horse_offers_breed_check
    check (
      breed is null
      or char_length(breed) <= 160
    ),

  constraint horse_offers_color_check
    check (
      color is null
      or char_length(color) <= 120
    ),

  constraint horse_offers_height_check
    check (
      height_cm is null
      or height_cm between 1 and 300
    ),

  constraint horse_offers_discipline_check
    check (
      discipline is null
      or char_length(discipline) <= 240
    ),

  constraint horse_offers_training_level_check
    check (
      training_level is null
      or char_length(training_level) <= 500
    ),

  constraint horse_offers_suitability_check
    check (
      suitability is null
      or char_length(suitability) <= 2000
    ),

  constraint horse_offers_health_notes_check
    check (
      health_notes is null
      or char_length(health_notes) <= 3000
    ),

  constraint horse_offers_behavior_notes_check
    check (
      behavior_notes is null
      or char_length(behavior_notes) <= 3000
    ),

  constraint horse_offers_city_check
    check (
      city is null
      or char_length(city) <= 160
    ),

  constraint horse_offers_region_check
    check (
      region is null
      or char_length(region) <= 160
    ),

  constraint horse_offers_location_text_check
    check (
      location_text is null
      or char_length(location_text) <= 300
    ),

  constraint horse_offers_coordinate_pair_check
    check (
      (
        horse_lat is null
        and horse_lng is null
      )
      or
      (
        horse_lat is not null
        and horse_lng is not null
      )
    ),

  constraint horse_offers_latitude_check
    check (
      horse_lat is null
      or horse_lat between -90 and 90
    ),

  constraint horse_offers_longitude_check
    check (
      horse_lng is null
      or horse_lng between -180 and 180
    ),

  constraint horse_offers_details_check
    check (
      jsonb_typeof(details) = 'object'
    ),

  constraint horse_offers_published_state_check
    check (
      status <> 'published'
      or (
        current_publication_event_id is not null
        and published_at is not null
      )
    ),

  constraint horse_offers_held_state_check
    check (
      status <> 'held_for_review'
      or (
        current_publication_event_id is not null
        and held_at is not null
      )
    ),

  constraint horse_offers_paused_state_check
    check (
      status <> 'paused'
      or published_at is not null
    ),

  constraint horse_offers_closed_state_check
    check (
      status <> 'closed'
      or closed_at is not null
    ),

  constraint horse_offers_rejected_state_check
    check (
      status <> 'rejected'
      or rejected_at is not null
    ),

  constraint horse_offers_archived_state_check
    check (
      status <> 'archived'
      or archived_at is not null
    ),

  constraint horse_offers_active_until_check
    check (
      active_until is null
      or (
        published_at is not null
        and active_until > published_at
      )
    )
);
CREATE OR REPLACE FUNCTION "public"."require_my_active_identity_v2"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  return v_active_identity_id;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") RETURNS TABLE("category_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  with recursive category_scope (
    category_id,
    visited_ids
  ) as (
    /*
     * Scope always starts from the selected category.
     * The selected category must belong to the supplied identity.
     */
    select
      category.id,
      array[category.id]::uuid[]
    from public.store_categories category
    where category.id = p_category_id
      and category.identity_id = p_identity_id

    union all

    /*
     * Include every descendant.
     * The path guard prevents accidental recursive cycles.
     */
    select
      child.id,
      scope.visited_ids || child.id
    from public.store_categories child
    join category_scope scope
      on child.parent_id = scope.category_id
    where child.identity_id = p_identity_id
      and not child.id = any(scope.visited_ids)
  )
  select scope.category_id
  from category_scope scope;
$$;
ALTER TABLE public.horse_offers ADD COLUMN edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>=1);
ALTER TABLE public.horse_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.horse_offers,auth.users FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.require_my_active_identity_v2(), public.get_store_category_scope_ids(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.require_my_active_identity_v2(),public.get_store_category_scope_ids(uuid,uuid) TO authenticated,service_role;
COMMIT;

-- SOURCE: supabase/migrations/20260911203000_add_marketplace_item_projection_foundation.sql
begin;

create view public.marketplace_item_projection_v1
with (
  security_barrier = true,
  security_invoker = true
)
as
select
  'listing'::text as content_type,
  listing.id::text as content_id,
  listing.identity_id,
  listing.user_id as owner_user_id,
  listing.status as source_status,
  case listing.status
    when 'active' then 'active'
    when 'paused' then 'paused'
    when 'sold' then 'closed'
    else listing.status
  end::text as lifecycle_status,
  null::text as content_variant,
  listing.title,
  listing.description,
  listing.price as price_text,
  case
    when btrim(coalesce(listing.price, '')) ~
      '^[0-9]+([.,][0-9]{1,2})?$'
    then replace(
      btrim(listing.price),
      ',',
      '.'
    )::numeric
    else null::numeric
  end as price_amount,
  case
    when nullif(
      btrim(coalesce(listing.price, '')),
      ''
    ) is null
    then 'contact'
    else 'legacy_text'
  end::text as price_type,
  null::text as currency,
  listing.image as image_url,
  listing.category,
  listing.subcategory,
  listing.condition,
  listing.city,
  null::text as region,
  coalesce(
    nullif(
      btrim(coalesce(listing.location, '')),
      ''
    ),
    nullif(
      btrim(coalesce(listing.city, '')),
      ''
    )
  ) as location_label,
  listing.active_until,
  null::timestamptz as published_at,
  listing.created_at,
  listing.created_at as sort_at,
  nullif(
    btrim(coalesce(listing.search_text, '')),
    ''
  ) as search_text
from public.listings listing

union all

select
  'horse_offer'::text as content_type,
  offer.id::text as content_id,
  offer.identity_id,
  offer.created_by_user_id as owner_user_id,
  offer.status as source_status,
  case offer.status
    when 'published' then 'active'
    else offer.status
  end::text as lifecycle_status,
  offer.offer_type as content_variant,
  offer.title,
  offer.description,
  null::text as price_text,
  offer.price_amount,
  offer.price_type,
  offer.currency,
  offer.image_url,
  null::text as category,
  null::text as subcategory,
  null::text as condition,
  offer.city,
  offer.region,
  nullif(
    btrim(
      concat_ws(
        ' · ',
        nullif(
          btrim(coalesce(offer.city, '')),
          ''
        ),
        nullif(
          btrim(coalesce(offer.region, '')),
          ''
        )
      )
    ),
    ''
  ) as location_label,
  offer.active_until,
  offer.published_at,
  offer.created_at,
  coalesce(
    offer.published_at,
    offer.updated_at,
    offer.created_at
  ) as sort_at,
  nullif(
    btrim(
      concat_ws(
        ' ',
        offer.title,
        offer.description,
        offer.horse_name,
        offer.breed,
        offer.color,
        offer.discipline,
        offer.training_level,
        offer.suitability,
        offer.health_notes,
        offer.behavior_notes,
        offer.city,
        offer.region
      )
    ),
    ''
  ) as search_text
from public.horse_offers offer;

comment on view
  public.marketplace_item_projection_v1
is
  'Internal read-only UNION ALL projection over canonical listings and horse_offers. content_type plus content_id is the shared key. It is not a writable or canonical marketplace table.';

comment on column
  public.marketplace_item_projection_v1.content_type
is
  'Canonical source discriminator. Current values are listing and horse_offer.';

comment on column
  public.marketplace_item_projection_v1.content_id
is
  'Canonical source ID serialized as text so bigint listing IDs and UUID horse-offer IDs can share one read contract.';

comment on column
  public.marketplace_item_projection_v1.source_status
is
  'Unmodified status from the canonical source row.';

comment on column
  public.marketplace_item_projection_v1.lifecycle_status
is
  'Shared management status. listing sold maps to closed and horse_offer published maps to active; source_status remains authoritative for domain actions.';

comment on column
  public.marketplace_item_projection_v1.search_text
is
  'Read-model text only. High-volume public search may use source-specific indexed predicates and return the same projection shape instead of scanning this view.';

comment on column
  public.marketplace_item_projection_v1.location_label
is
  'Privacy-safe display location. Horse exact location_text and coordinates are intentionally excluded.';

revoke all
on table public.marketplace_item_projection_v1
from public, anon, authenticated;

grant select
on table public.marketplace_item_projection_v1
to service_role;

commit;

-- SOURCE: supabase/migrations/20260911220000_add_owner_marketplace_item_read_rpc.sql
begin;

create or replace function
  public.get_my_marketplace_items_v1(
    p_result_limit integer default 30,
    p_result_offset integer default 0,
    p_status_filter text default 'all',
    p_search_query text default '',
    p_store_category_filter uuid default null
  )
returns table (
  content_type text,
  content_id text,
  identity_id uuid,
  owner_user_id uuid,
  source_status text,
  lifecycle_status text,
  content_variant text,
  title text,
  description text,
  price_text text,
  price_amount numeric,
  price_type text,
  currency text,
  image_url text,
  category text,
  subcategory text,
  condition text,
  city text,
  region text,
  location_label text,
  active_until timestamptz,
  published_at timestamptz,
  created_at timestamptz,
  sort_at timestamptz,
  search_text text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  with request_context as materialized (
    select
      public.require_my_active_identity_v2()
        as active_identity_id,
      least(
        greatest(
          coalesce(p_result_limit, 30),
          1
        ),
        500
      ) as bounded_limit,
      least(
        greatest(
          coalesce(p_result_offset, 0),
          0
        ),
        1000000
      ) as bounded_offset,
      coalesce(
        nullif(
          lower(
            btrim(
              coalesce(p_status_filter, '')
            )
          ),
          ''
        ),
        'all'
      ) as normalized_status,
      btrim(
        coalesce(p_search_query, '')
      ) as normalized_search
  ),
  selected_category_scope as materialized (
    select scope.category_id
    from request_context context
    cross join lateral
      public.get_store_category_scope_ids(
        context.active_identity_id,
        p_store_category_filter
      ) scope
    where p_store_category_filter is not null
  )
  select
    item.content_type,
    item.content_id,
    item.identity_id,
    item.owner_user_id,
    item.source_status,
    item.lifecycle_status,
    item.content_variant,
    item.title,
    item.description,
    item.price_text,
    item.price_amount,
    item.price_type,
    item.currency,
    item.image_url,
    item.category,
    item.subcategory,
    item.condition,
    item.city,
    item.region,
    item.location_label,
    item.active_until,
    item.published_at,
    item.created_at,
    item.sort_at,
    item.search_text
  from request_context context
  join public.marketplace_item_projection_v1 item
    on item.identity_id =
      context.active_identity_id
  where (
    context.normalized_status = 'all'
    or item.source_status =
      context.normalized_status
    or item.lifecycle_status =
      context.normalized_status
    or (
      context.normalized_status = 'sold'
      and item.lifecycle_status = 'closed'
    )
  )
  and (
    context.normalized_search = ''
    or concat_ws(
      ' ',
      item.title,
      item.description,
      item.search_text,
      item.content_variant,
      item.category,
      item.subcategory,
      item.condition,
      item.city,
      item.region,
      item.location_label
    ) ilike
      '%' || context.normalized_search || '%'
  )
  and (
    p_store_category_filter is null
    or (
      item.content_type = 'listing'
      and exists (
        select 1
        from public.listing_store_categories
          relation
        join selected_category_scope scope
          on scope.category_id =
            relation.store_category_id
        where relation.listing_id::text =
          item.content_id
      )
    )
  )
  order by
    item.sort_at desc nulls last,
    item.created_at desc,
    item.content_type,
    item.content_id desc
  limit (
    select context.bounded_limit
    from request_context context
  )
  offset (
    select context.bounded_offset
    from request_context context
  );
$function$;

comment on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
is
  'Returns a bounded active-identity owner read model over canonical listings and horse offers. The shared key is content_type plus content_id. Legacy get_my_identity_listings remains unchanged. Store-category filtering currently matches generic listing relations only; horse offers remain unassigned until a polymorphic marketplace-item category relation is added.';

revoke all
on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
from public, anon;

grant execute
on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
to authenticated, service_role;

commit;

-- SOURCE: supabase/migrations/20260926120000_add_public_listing_search.sql
begin;

-- Additive public ordinary-listing search. No existing RPC/table/policy is replaced.
-- This function does not publish horse offers or interpret generic rental/buy intent.
create function public.search_public_listings_v1(
  p_search_query text default '',
  p_category text default null,
  p_subcategory text default null,
  p_detail_category text default null,
  p_condition text default null,
  p_location_query text default '',
  p_result_limit integer default 24,
  p_result_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        to_tsvector('pg_catalog.simple'::regconfig, coalesce(l.title, '') || ' ' || coalesce(l.description, '')) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', p.price,
      'price_amount', case when p.price_amount >= 0 and p.price_amount::text not in ('NaN','Infinity','-Infinity')
        then p.price_amount::text else null end,
      -- Legacy listings have no canonical currency column. Never invent EUR.
      'currency', null,
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 1, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

alter function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) owner to postgres;
comment on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) is
  'Public ordinary-listing search v1: public title/description words, literal category path, condition and city/country query before count/newest pagination. Minimal cards only; no private details/coordinates/account IDs, horse publication, price currency inference or mutations.';
revoke all on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  to anon, authenticated, service_role;

commit;

-- SOURCE: supabase/migrations/20260926180000_add_public_listing_detail_keywords.sql
begin;

-- Deployment-only limits for this not-yet-applied migration.
-- SET LOCAL takes effect in the SAME transaction as CREATE INDEX, then resets.
-- These are server cancellation thresholds, not a guaranteed wall-clock outage cap.
set local lock_timeout = '2s';
set local statement_timeout = '15s';
set local idle_in_transaction_session_timeout = '10s';
set local transaction_timeout = '30s';
do $rollout_limits$
begin
  if current_setting('server_version_num')::integer < 170000
    or current_setting('lock_timeout') <> '2s'
    or current_setting('statement_timeout') <> '15s'
    or current_setting('idle_in_transaction_session_timeout') <> '10s'
    or current_setting('transaction_timeout') <> '30s' then
    raise exception 'listing_search_rollout_limits_required' using errcode = '55000';
  end if;
  raise notice 'PUBLIC_LISTING_ROLLOUT_LIMITS=2s/15s/10s/30s';
end;
$rollout_limits$;

-- Separate extension after the committed title/description foundation.
-- The earlier migration is preserved byte-for-byte and is required first.
do $precondition$
begin
  if not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = to_regprocedure('public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)')
      and p.prosecdef and p.provolatile = 's'
      and p.proowner = (select oid from pg_catalog.pg_roles where rolname = 'postgres')
      and p.proconfig = array['search_path=pg_catalog, public, auth, pg_temp']
      and md5(p.prosrc) = 'f613f2401edb06eb3e35836284bfea35'
  ) then
    raise exception 'listing_search_exact_foundation_required';
  end if;
end;
$precondition$;

create function public.public_listing_search_document_v1(
  p_title text, p_description text, p_category text, p_subcategory text, p_details jsonb
)
returns tsvector
language plpgsql immutable parallel safe security invoker
set search_path = pg_catalog, pg_temp
as $document$
declare
  -- Frozen registry copied from the reviewed source allowlist. No table/HTTP/AI reads.
  -- A new registry version requires a new function/index or an explicit index rebuild.
  v_policy constant jsonb := $policy${"vehicles":{"cars":{"passenger_cars":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"suv_offroad":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"vans_minibuses":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"pickup_trucks":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until"],"motorhomes_campers":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until","sleeping_places","length","gross_weight","equipment"],"racing_vehicles":["brand","model","year","generation","fuel","engine","power","gearbox","drivetrain","mileage","body_type","doors","seats","color","inspection_valid_until","discipline","roll_cage","homologation","track_street_legal"]},"motorcycles":{"sport_bikes":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"cruisers":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"touring":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"enduro_mx":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"scooters":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until"],"atv_utv":["brand","model","year","engine_size","power","fuel","mileage","transmission","type","inspection_valid_until","drivetrain","winch","road_legal"],"snowmobiles":["brand","model","year","engine_size","power","mileage","track_length","electric_start"]},"trucks_commercial":{"trucks":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"semi_trucks":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"buses":["brand","model","year","fuel","engine","power","gearbox","mileage","seats","axle_configuration","gross_weight","empty_weight","payload","load_space_length","load_space_width","load_space_height","tachograph","inspection_valid_until"],"commercial_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"]},"agricultural_heavy_machinery":{"tractors":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","seats"],"harvesters":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","header_width","crop_type"],"excavators":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","bucket_size","lift_capacity","reach"],"forestry_machinery":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","lift_capacity"],"construction_machinery":["brand","model","year","machine_type","engine","power","working_hours","fuel","drivetrain_tracks","weight","attachment_type","hydraulics","operating_weight","bucket_size","lift_capacity"],"agricultural_attachments_implements":["implement_type","brand","model","working_width","attachment_type","compatible_machine","pto_required","hydraulics_required","condition"],"agricultural_heavy_machinery_spare_parts":["part_name","manufacturer","part_number","compatible_machine","fits_brand","fits_model","condition"]},"marine":{"boats":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"yachts":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"jet_skis":["brand","model","year","type","length","width","material","engine_type","engine_power","fuel","engine_hours","cabins","trailer_included"],"boat_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"outboard_motors":["brand","model","year","power","fuel","shaft_length"]},"aviation":{"airplanes":["brand","model","year","aircraft_type","engine","power","flight_hours","seats","range","maintenance_status"],"helicopters":["brand","model","year","aircraft_type","engine","power","flight_hours","seats","range","maintenance_status"],"ultralights":["brand","model","year","aircraft_type","engine","flight_hours","seats"],"drones":["brand","model","camera","flight_time","range","battery_count","condition"],"aircraft_parts":["part_name","manufacturer","part_number","compatible_aircraft","condition"]},"trailers":{"light_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"car_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"cargo_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"],"caravans":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until","sleeping_places","heating","kitchen","toilet_shower","awning"],"horse_livestock_trailers":["brand","model","year","trailer_type","length","width","height","gross_weight","empty_weight","payload","axles","brake_type","inspection_valid_until"]},"vehicle_parts":{"engines_engine_parts":["part_name","brand","engine_type","fits_brand","fits_model","part_number","condition"],"transmission_drivetrain":["part_name","gearbox_type","drivetrain_type","fits_brand","fits_model","part_number","condition"],"suspension_steering":["part_name","side_position","fits_brand","fits_model","part_number","condition"],"brakes":["brake_type","side_position","fits_brand","fits_model","part_number","condition"],"electrical_parts":["part_name","voltage","fits_brand","fits_model","part_number","condition"],"batteries":["battery_type","capacity","voltage","cca","brand","model","condition"],"starters_alternators":["part_type","voltage","power_rating","fits_brand","fits_model","part_number","condition"],"body_parts":["body_part_type","side_position","color","fits_brand","fits_model","condition"],"lights_lamps":["light_type","technology","side_position","fits_brand","fits_model","condition"],"interior_parts":["interior_part_type","material","color","fits_brand","fits_model","condition"],"exhaust_parts":["exhaust_part_type","material","fits_brand","fits_model","condition"],"cooling_heating":["part_type","coolant_type","fits_brand","fits_model","condition"],"fuel_system":["fuel_system_part","fuel_type","fits_brand","fits_model","part_number","condition"],"tires":["width","profile","diameter","season","brand","model","load_index","speed_index","tread_depth","quantity","dot_year"],"wheels_rims":["diameter","width","bolt_pattern","offset","center_bore","brand","model","material","quantity","condition"],"accessories":["accessory_type","brand","model","fits_brand","fits_model","part_number","condition"],"riding_racing_gear":["gear_type","brand","size","discipline","certification","material","condition"],"spare_parts":["part_name","manufacturer","part_number","oem_number","fits_brand","fits_model","fits_generation","fits_year_from","fits_year_to","fits_engine","fits_gearbox","side_position","condition"],"vehicle_for_parts":["brand","model","year","generation","fuel","engine","gearbox","drivetrain","mileage","condition","available_parts"]}},
"electronics":{"phones":{"":["brand","model","storage","ram","color","sim_type","battery_health","screen_condition","network_lock","included_accessories"]},"computers":{"":["brand","model","processor","ram","storage","graphics_card","screen_size","operating_system","battery_health","included_accessories"]},"tv_audio":{"":["brand","model","screen_size","display_type","resolution","smart_tv","audio_type","power_output","connections","remote_included"]},"cameras":{"":["brand","model","camera_type","lens_included","sensor_size","megapixels","shutter_count","video_resolution","battery_count","memory_card_included"]},"gaming":{"":["brand","model","platform","storage","controller_count","game_count","included_accessories"]},"smart_home":{"":["brand","model","device_type","compatibility","connection_type","power_type","app_support","included_accessories"]},"components":{"":["component_type","brand","model","socket_compatibility","capacity","speed","power_rating","condition"]},"electronics_accessories":{"":["accessory_type","brand","model","compatibility","connection_type","color","condition","quantity"]},"other_electronics":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"real_estate":{"apartments":{"":["property_type","rooms","area","floor","total_floors","year_built","condition","heating_type","energy_class","balcony","furnished","parking","storage_room","bathroom_count"]},"houses":{"":["house_type","rooms","living_area","land_area","floors","year_built","condition","heating_type","energy_class","garage","sauna","terrace","water_supply","sewer_connection"]},"land":{"":["land_type","area","purpose","detailed_plan","electricity","water","sewer","road_access"]},"commercial_property":{"":["property_type","area","floor","purpose","parking","loading_access","heating","security"]},"garages":{"":["area","electricity","heating","security","water"]},"vacation_property":{"":["property_type","rooms","area","beds","sauna","pool","beach_access","seasonal_year_round"]}},
"clothing_fashion":{"men":{"":["category_type","brand","size","fit","color","material","condition","season","authenticity","included_accessories"]},"women":{"":["category_type","brand","size","fit","color","material","condition","season","authenticity","included_accessories"]},"kids":{"":["category_type","brand","size_age","gender","color","material","condition","season"]},"workwear":{"":["workwear_type","gender","size","industry","season","visibility_class","protection_class","condition"]},"shoes":{"":["gender","brand","model","size","color","material","condition","season","heel_height","authenticity","original_box_included"]},"watches":{"":["brand","model","movement_type","case_material","case_size","water_resistance","condition","box_papers_included","authenticity"]},"bags":{"":["brand","model","material","color","size","condition","authenticity","dust_bag_box_included"]},"jewelry":{"":["jewelry_type","brand","material","gemstone","size","weight","condition","authenticity","certificate_included"]},"other_clothing_fashion":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"tools_industrial":{"power_tools":{"":["tool_type","brand","model","power_source","voltage","power_rating","battery_included","battery_count","charger_included","condition","included_accessories"]},"hand_tools":{"":["tool_type","brand","material","size","condition","set_single","included_accessories"]},"workshop_equipment":{"":["equipment_type","brand","model","power_source","voltage","capacity","dimensions","weight","condition","included_accessories"]},"industrial_equipment":{"":["equipment_type","brand","model","power_source","voltage","capacity","working_pressure","weight","dimensions","condition"]},"safety_equipment":{"":["equipment_type","brand","size","certification","condition","expiration_date","included_accessories"]},"other_tools_industrial":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"home_garden":{"furniture":{"":["furniture_type","brand","material","color","dimensions","assembly_required","condition","included_accessories"]},"appliances":{"":["appliance_type","brand","model","energy_class","power_source","capacity","dimensions","condition","warranty_remaining","included_accessories"]},"garden_tools":{"":["tool_type","brand","model","power_source","voltage","battery_included","condition","included_accessories"]},"plants_seedlings":{"":["plant_type","variety","quantity","pot_size","growth_stage","organic"]},"seeds":{"":["seed_type","variety","quantity","package_weight","sowing_season","organic"]},"crops_produce":{"":["produce_type","variety","quantity","unit","harvest_date","organic"]},"farm_supplies":{"":["supply_type","brand","quantity","material","intended_use","condition"]},"animal_feed":{"":["feed_type","animal_type","quantity","package_weight","ingredients","expiry_date"]},"greenhouses":{"":["greenhouse_type","material","length","width","height","frame_material","condition"]},"decor":{"":["decor_type","material","color","style","dimensions","condition"]},"lighting":{"":["lighting_type","brand","power_source","bulb_type","color_temperature","smart_lighting_support","condition","included_accessories"]},"kitchenware":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"home_textiles":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"household_supplies":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"bathroom":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"heating_fuels":{"":["fuel_type","wood_type","quantity","unit","moisture_level","packaging","delivery_available"]},"heating_equipment":{"":["equipment_type","brand","model","fuel_type","power","dimensions","condition","included_accessories"]},"outdoor_furniture":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"other_home_garden":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"sports_outdoor":{"gym_equipment":{"":["equipment_type","brand","model","weight_resistance","dimensions","foldable","condition","included_accessories"]},"bicycles":{"":["bike_type","brand","model","frame_size","wheel_size","material","gear_count","suspension","brake_type","condition","included_accessories"]},"winter_sports":{"":["equipment_type","brand","model","size","binding_included","boot_size","condition","included_accessories"]},"camping":{"":["equipment_type","brand","capacity","weight","dimensions","season_rating","condition","included_accessories"]},"fishing":{"":["equipment_type","brand","model","length","power_rating","reel_included","line_included","condition","included_accessories"]},"other_sports_outdoor":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]},"equestrian_horse_supplies":{"saddles_accessories":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"bridles_halters_tack":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"rider_clothing_safety":["item_type","brand","size","gender","discipline","safety_standard","material","color","condition"],"horse_blankets_textiles":["item_type","brand","horse_size","blanket_weight","material","color","condition"],"horse_grooming_care":["item_type","brand","horse_size","material","quantity","condition","included_accessories"],"stable_paddock_equipment":["item_type","brand","material","dimensions","capacity","quantity","condition"],"driving_carriage_equipment":["item_type","brand","model","discipline","horse_size","seat_size","material","color","condition","included_accessories"],"other_equestrian_supplies":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"antiques_collectibles":{"art":{"":["art_type","artist","title","year_period","material","dimensions","signed","certificate_included","condition","frame_included"]},"vintage":{"":["item_type","brand_maker","year_era","material","origin_country","condition","restored"]},"coins":{"":["country","year","currency","material","denomination","mint_mark","condition_grading","certificate_included"]},"military":{"":["item_type","country","era","original_reproduction","material","condition","certificate_included"]},"memorabilia":{"":["item_type","related_person_event","year_era","signed","certificate_included","condition"]},"other_antiques_collectibles":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"building_materials":{"lumber":{"":["material_type","wood_type","length","width","thickness","moisture_level","treatment_type","quantity","condition"]},"concrete":{"":["material_type","strength_class","weight","bag_size","quantity","condition"]},"insulation":{"":["insulation_type","material","thickness","coverage_area","fire_rating","quantity","condition"]},"roofing":{"":["roofing_type","material","color","dimensions","coverage_area","quantity","condition"]},"plumbing":{"":["plumbing_type","material","diameter","length","compatibility","pressure_rating","condition","quantity"]},"other_building_materials":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}},
"children_baby":{"strollers_prams":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"child_car_seats":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"nursery_furniture":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"baby_feeding_care":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"baby_safety_accessories":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]},"other_children_baby":{"":["item_type","brand","model","age_range","safety_standard","material","color","dimensions","condition","included_accessories"]}},
"pet_supplies":{"dog_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"cat_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"aquariums_terrariums":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"cages_housing":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"pet_transport_grooming":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]},"other_pet_supplies":{"":["item_type","animal_type","brand","size","material","capacity","condition","quantity","included_accessories"]}},
"books_music_media":{"books":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"magazines_comics":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"music_movies":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]},"musical_instruments":{"":["instrument_type","brand","model","material","size","condition","included_accessories"]},"instrument_accessories":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]},"other_books_media":{"":["media_type","title","creator","language","publication_year","format","genre","condition","quantity"]}},
"hobbies_toys_crafts":{"toys":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"board_games_puzzles":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"arts_crafts":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"model_rc_hobbies":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"sewing_knitting":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]},"other_hobbies_toys":{"":["hobby_type","brand","age_range","material","dimensions","skill_level","condition","quantity","included_accessories"]}},
"office_business":{"office_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"printers_scanners":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"office_furniture":{"":["item_type","brand","material","color","size","dimensions","capacity","condition","quantity"]},"retail_warehouse_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"presentation_equipment":{"":["equipment_type","brand","model","connection_type","power_source","dimensions","condition","included_accessories"]},"other_office_business":{"":["item_type","brand","model","material","color","size","dimensions","condition","quantity","included_accessories"]}}}$policy$::jsonb;
  v_text text := left(coalesce(p_title, ''), 4096) || ' ' || left(coalesce(p_description, ''), 32768);
  v_detail text := '';
  v_keys jsonb;
  v_key text;
begin
  if jsonb_typeof(p_details) = 'object' then
    -- A malformed selector must not fall back to an unrelated field family.
    if p_details ? 'detailCategory' and p_details -> 'detailCategory' <> 'null'::jsonb then
      if jsonb_typeof(p_details -> 'detailCategory') <> 'string' then
        return to_tsvector('pg_catalog.simple'::regconfig, v_text);
      end if;
      v_detail := p_details ->> 'detailCategory';
    end if;
    v_keys := v_policy -> p_category -> p_subcategory -> v_detail;
    if jsonb_typeof(v_keys) = 'array' then
      for v_key in select jsonb_array_elements_text(v_keys) loop
        -- Only the value at the exact allowed top-level key is searchable.
        -- No recursive JSON, key names, arrays, objects, nulls or boolean guessing.
        if jsonb_typeof(p_details -> v_key) in ('string', 'number') then
          v_text := v_text || ' ' || left(p_details ->> v_key, 1024);
        end if;
      end loop;
    end if;
  end if;
  return to_tsvector('pg_catalog.simple'::regconfig, v_text);
end;
$document$;
alter function public.public_listing_search_document_v1(text,text,text,text,jsonb) owner to postgres;
comment on function public.public_listing_search_document_v1(text,text,text,text,jsonb) is
  'Pure frozen v1 keyword document: bounded public title/description and explicitly reviewed category-scoped scalar detail values. Reads no tables. No arbitrary JSON, private location, AI metadata or unique identifiers. Never replace its behavior without rebuilding the dependent index.';
revoke all on function public.public_listing_search_document_v1(text,text,text,text,jsonb)
  from public, anon, authenticated, service_role;
-- This pure helper transforms only caller-provided arguments, not stored data.
-- Explicit execution also supports expression-index maintenance by ordinary writers.
grant execute on function public.public_listing_search_document_v1(text,text,text,text,jsonb)
  to anon, authenticated, service_role;

-- Ordinary CREATE INDEX is transactional but can block writers during future rollout.
-- This package runs ONLY in a new isolated helper; production requires its own gate.
create index listings_public_keywords_v1_gin on public.listings using gin
  (public.public_listing_search_document_v1(title, description, category, subcategory, details))
  where status = 'active';
comment on index public.listings_public_keywords_v1_gin is
  'Keyword GIN for public_listing_search_document_v1; expiry, identity and block eligibility are still checked at query time. Partial predicate intentionally contains no clock-dependent condition.';

create or replace function public.search_public_listings_v1(
  p_search_query text default '',
  p_category text default null,
  p_subcategory text default null,
  p_detail_category text default null,
  p_condition text default null,
  p_location_query text default '',
  p_result_limit integer default 24,
  p_result_offset integer default 0
)
returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
-- Optional predicates must be planned using this call's actual search inputs.
-- This setting is local to the function; it does not alter the caller/session default.
set plan_cache_mode = force_custom_plan
as $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := auth.uid();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', p.price,
      'price_amount', case when p.price_amount >= 0 and p.price_amount::text not in ('NaN','Infinity','-Infinity')
        then p.price_amount::text else null end,
      -- Legacy listings have no canonical currency column. Never invent EUR.
      'currency', null,
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 1, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;

alter function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) owner to postgres;
comment on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer) is
  'Public ordinary-listing keyword search v1 with frozen category-scoped public scalar details and GIN support. Same minimal cards, visibility, account blocks, filters, count and newest pagination. No arbitrary details, private coordinates, raw AI, unique identifiers, currency inference or mutations. Bounded document; no synonym or range interpretation.';
revoke all on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.search_public_listings_v1(text,text,text,text,text,text,integer,integer)
  to anon, authenticated, service_role;

commit;

-- EXISTING PRIVATE DEPENDENCY: supabase/migrations/20260920150000_add_owner_marketplace_wanted_summary.sql#project_horse_wanted_owner_summary_v1
create function public.project_horse_wanted_owner_summary_v1(p_details jsonb)
returns jsonb
language plpgsql immutable
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_wanted jsonb;
  v_budget jsonb;
  v_area jsonb;
  v_budget_result jsonb := null;
  v_area_result jsonb := null;
  v_amount numeric;
  v_city text;
  v_region text;
begin
  -- Unsupported sections are explicit null, NOT an invented flexible budget.
  -- Never return the original details object or arbitrary nested keys.
  if jsonb_typeof(p_details) = 'object'
    and p_details -> 'schema_version' = '1'::jsonb
    and p_details ->> 'branch' = 'wanted'
    and jsonb_typeof(p_details -> 'wanted') = 'object' then
    v_wanted := p_details -> 'wanted';
    v_budget := v_wanted -> 'budget';
    v_area := v_wanted -> 'search_area';

    if jsonb_typeof(v_budget) = 'object'
      and v_budget ->> 'currency' = 'EUR' then
      if v_budget ->> 'mode' = 'maximum'
        and jsonb_typeof(v_budget -> 'amount') = 'number' then
        -- Cast only after checking JSON numeric type. Malformed legacy text
        -- cannot abort the whole owner list or be interpreted as money.
        v_amount := (v_budget ->> 'amount')::numeric;
        if v_amount >= 0 and v_amount <= 9999999999.99
          and v_amount = round(v_amount, 2) then
          v_budget_result := jsonb_build_object(
            'mode', 'maximum', 'amount', v_amount, 'currency', 'EUR');
        end if;
      elsif v_budget ->> 'mode' = 'contact'
        and (not (v_budget ? 'amount') or v_budget -> 'amount' = 'null'::jsonb) then
        v_budget_result := jsonb_build_object(
          'mode', 'contact', 'amount', null, 'currency', 'EUR');
      end if;
    end if;

    if jsonb_typeof(v_area) = 'object'
      and v_area ->> 'country_code' = 'EE'
      and coalesce(jsonb_typeof(v_area -> 'city_or_municipality'), 'null') in ('string', 'null')
      and coalesce(jsonb_typeof(v_area -> 'region'), 'null') in ('string', 'null') then
      v_city := nullif(btrim(v_area ->> 'city_or_municipality'), '');
      v_region := nullif(btrim(v_area ->> 'region'), '');
      if coalesce(char_length(v_city), 0) <= 160
        and coalesce(char_length(v_region), 0) <= 160 then
        v_area_result := jsonb_build_object(
          'country_code', 'EE', 'city_or_municipality', v_city, 'region', v_region);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'version', 1, 'budget', v_budget_result, 'search_area', v_area_result);
end;
$function$;
ALTER FUNCTION public.project_horse_wanted_owner_summary_v1(jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.project_horse_wanted_owner_summary_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
-- SOURCE: supabase/migrations/20260722173530_baseline_20260722.sql#add_listing_image_v2
CREATE OR REPLACE FUNCTION "public"."add_listing_image_v2"("p_listing_id" "text", "p_original_url" "text", "p_medium_url" "text" DEFAULT NULL::"text", "p_thumb_url" "text" DEFAULT NULL::"text", "p_max_images" integer DEFAULT 10) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := auth.uid();
  v_user_text text := auth.uid()::text;
  v_active_identity text;
  v_listing record;
  v_count integer := 0;
  v_next_sort_order integer := 0;
  v_is_primary boolean := false;
  v_image_url text;
  v_inserted record;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_original_url is null or length(trim(p_original_url)) = 0 then
    raise exception 'image_url_missing';
  end if;

  select active_identity_id::text
    into v_active_identity
  from profiles
  where id = v_user;

  select id, user_id, identity_id
    into v_listing
  from listings
  where id::text = p_listing_id;

  if not found then
    raise exception 'listing_not_found';
  end if;

  if v_listing.identity_id is not null then
    if v_active_identity is null or v_listing.identity_id::text <> v_active_identity then
      raise exception 'not_owner';
    end if;
  else
    if v_listing.user_id is null or v_listing.user_id::text <> v_user_text then
      raise exception 'not_owner';
    end if;
  end if;

  select count(*)
    into v_count
  from listing_images
  where listing_id::text = p_listing_id;

  if v_count >= p_max_images then
    raise exception 'max_images';
  end if;

  v_is_primary := v_count = 0;

  select coalesce(max(sort_order), -1) + 1
    into v_next_sort_order
  from listing_images
  where listing_id::text = p_listing_id;

  insert into listing_images (
    listing_id,
    user_id,
    original_url,
    medium_url,
    thumb_url,
    is_primary,
    sort_order
  )
  values (
    v_listing.id,
    coalesce(v_listing.user_id, v_user),
    p_original_url,
    nullif(p_medium_url, ''),
    nullif(p_thumb_url, ''),
    v_is_primary,
    v_next_sort_order
  )
  returning id, original_url, medium_url, thumb_url, is_primary, sort_order
  into v_inserted;

  v_image_url := coalesce(
    v_inserted.original_url,
    v_inserted.medium_url,
    v_inserted.thumb_url
  );

  if v_is_primary and v_image_url is not null then
    update listings
    set image = v_image_url
    where id = v_listing.id;
  end if;

  return jsonb_build_object(
    'id', v_inserted.id,
    'image_url', v_image_url,
    'is_primary', v_inserted.is_primary,
    'sort_order', v_inserted.sort_order
  );
end;
$$;
ALTER FUNCTION public.add_listing_image_v2(text,text,text,text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.add_listing_image_v2(text,text,text,text,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.add_listing_image_v2(text,text,text,text,integer) TO PUBLIC,anon,authenticated,service_role;
-- SOURCE: supabase/migrations/20260722173530_baseline_20260722.sql#delete_listing_image_v2
CREATE OR REPLACE FUNCTION "public"."delete_listing_image_v2"("p_listing_id" "text", "p_image_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user text := auth.uid()::text;
  v_active_identity text;
  v_listing record;
  v_image record;
  v_row record;
  v_count integer := 0;
  v_index integer := 0;
  v_fallback_image text := null;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select active_identity_id::text
    into v_active_identity
  from profiles
  where id::text = v_user;

  select id, user_id, identity_id
    into v_listing
  from listings
  where id::text = p_listing_id;

  if not found then
    raise exception 'listing_not_found';
  end if;

  if v_listing.identity_id is not null then
    if v_active_identity is null or v_listing.identity_id::text <> v_active_identity then
      raise exception 'not_owner';
    end if;
  else
    if v_listing.user_id is null or v_listing.user_id::text <> v_user then
      raise exception 'not_owner';
    end if;
  end if;

  select count(*)
    into v_count
  from listing_images
  where listing_id::text = p_listing_id;

  if v_count <= 1 then
    raise exception 'last_image';
  end if;

  select id, thumb_url, medium_url, original_url
    into v_image
  from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  if not found then
    raise exception 'image_not_found';
  end if;

  delete from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  for v_row in
    select id, thumb_url, medium_url, original_url
    from listing_images
    where listing_id::text = p_listing_id
    order by
      coalesce(is_primary, false) desc,
      coalesce(sort_order, 999999),
      id::text
  loop
    update listing_images
    set
      is_primary = (v_index = 0),
      sort_order = v_index
    where id = v_row.id;

    if v_index = 0 then
      v_fallback_image := coalesce(
        v_row.original_url,
        v_row.medium_url,
        v_row.thumb_url
      );
    end if;

    v_index := v_index + 1;
  end loop;

  update listings
  set image = v_fallback_image
  where id::text = p_listing_id;

  return jsonb_build_object(
    'deleted_urls',
    jsonb_build_array(
      v_image.thumb_url,
      v_image.medium_url,
      v_image.original_url
    ),
    'fallback_image',
    v_fallback_image
  );
end;
$$;
ALTER FUNCTION public.delete_listing_image_v2(text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.delete_listing_image_v2(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.delete_listing_image_v2(text,text) TO PUBLIC,anon,authenticated,service_role;
-- SOURCE: supabase/migrations/20260722173530_baseline_20260722.sql#set_listing_primary_image_v2
CREATE OR REPLACE FUNCTION "public"."set_listing_primary_image_v2"("p_listing_id" "text", "p_image_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user text := auth.uid()::text;
  v_active_identity text;
  v_listing record;
  v_image record;
  v_row record;
  v_index integer := 0;
  v_fallback_image text;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select active_identity_id::text
    into v_active_identity
  from profiles
  where id::text = v_user;

  select id, user_id, identity_id
    into v_listing
  from listings
  where id::text = p_listing_id;

  if not found then
    raise exception 'listing_not_found';
  end if;

  if v_listing.identity_id is not null then
    if v_active_identity is null or v_listing.identity_id::text <> v_active_identity then
      raise exception 'not_owner';
    end if;
  else
    if v_listing.user_id is null or v_listing.user_id::text <> v_user then
      raise exception 'not_owner';
    end if;
  end if;

  select id, thumb_url, medium_url, original_url
    into v_image
  from listing_images
  where id::text = p_image_id
    and listing_id::text = p_listing_id;

  if not found then
    raise exception 'image_not_found';
  end if;

  for v_row in
    select id
    from listing_images
    where listing_id::text = p_listing_id
    order by
      case when id::text = p_image_id then 0 else 1 end,
      coalesce(sort_order, 999999),
      id::text
  loop
    update listing_images
    set
      is_primary = (v_row.id::text = p_image_id),
      sort_order = v_index
    where id = v_row.id;

    v_index := v_index + 1;
  end loop;

  v_fallback_image := coalesce(
    v_image.original_url,
    v_image.medium_url,
    v_image.thumb_url
  );

  if v_fallback_image is not null then
    update listings
    set image = v_fallback_image
    where id::text = p_listing_id;
  end if;
end;
$$;
ALTER FUNCTION public.set_listing_primary_image_v2(text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_listing_primary_image_v2(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_listing_primary_image_v2(text,text) TO PUBLIC,anon,authenticated,service_role;
-- SOURCE: supabase/migrations/20260722173530_baseline_20260722.sql#update_my_listing_classification_location_v2
CREATE OR REPLACE FUNCTION "public"."update_my_listing_classification_location_v2"("p_listing_id" "text", "p_category" "text", "p_subcategory" "text" DEFAULT NULL::"text", "p_detail_category" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_city" "text" DEFAULT NULL::"text", "p_listing_lat" double precision DEFAULT NULL::double precision, "p_listing_lng" double precision DEFAULT NULL::double precision) RETURNS TABLE("listing_id" bigint, "category" "text", "subcategory" "text", "detail_category" "text", "country" "text", "city" "text", "location" "text", "listing_lat" double precision, "listing_lng" double precision, "changed" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $_$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_listing_id bigint;
  v_listing_user_id uuid;
  v_listing_identity_id uuid;

  v_title text;
  v_description text;
  v_condition text;

  v_existing_category text;
  v_existing_subcategory text;
  v_existing_details jsonb;
  v_existing_country text;
  v_existing_city text;
  v_existing_location text;
  v_existing_listing_lat double precision;
  v_existing_listing_lng double precision;
  v_existing_search_text text;

  v_clean_category text;
  v_clean_subcategory text;
  v_clean_detail_category text;
  v_clean_country text;
  v_clean_city text;

  v_new_details jsonb;
  v_new_location text;
  v_details_search_text text;
  v_new_search_text text;
  v_changed boolean;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_listing_id is null
    or btrim(p_listing_id) = ''
    or btrim(p_listing_id) !~ '^[1-9][0-9]*$'
  then
    raise exception
      'The listing ID is invalid.'
      using errcode = '22023';
  end if;

  v_listing_id := btrim(p_listing_id)::bigint;

  /*
   * Lock the profile row so an active-identity switch
   * cannot race this listing update.
   */
  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      v_active_identity_id
    ),
    false
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  v_clean_category := nullif(
    regexp_replace(
      btrim(coalesce(p_category, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_subcategory := nullif(
    regexp_replace(
      btrim(coalesce(p_subcategory, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_detail_category := nullif(
    regexp_replace(
      btrim(coalesce(p_detail_category, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_country := nullif(
    regexp_replace(
      btrim(coalesce(p_country, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  v_clean_city := nullif(
    regexp_replace(
      btrim(coalesce(p_city, '')),
      '[[:space:]]+',
      ' ',
      'g'
    ),
    ''
  );

  if v_clean_category is null then
    raise exception
      'The Selqiro category is required.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_category) > 120 then
    raise exception
      'The Selqiro category is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_subcategory, '')) > 160 then
    raise exception
      'The Selqiro subcategory is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_detail_category, '')) > 160 then
    raise exception
      'The detailed Selqiro category is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_country, '')) > 120 then
    raise exception
      'The country is too long.'
      using errcode = '22023';
  end if;

  if char_length(coalesce(v_clean_city, '')) > 160 then
    raise exception
      'The city or region is too long.'
      using errcode = '22023';
  end if;

  /*
   * Coordinates must be supplied as a complete pair.
   */
  if (
    p_listing_lat is null
    and p_listing_lng is not null
  ) or (
    p_listing_lat is not null
    and p_listing_lng is null
  ) then
    raise exception
      'Latitude and longitude must be supplied together.'
      using errcode = '22023';
  end if;

  if p_listing_lat is not null then
    if p_listing_lat::text in (
      'NaN',
      'Infinity',
      '-Infinity'
    ) or p_listing_lat < -90
      or p_listing_lat > 90
    then
      raise exception
        'Latitude is invalid.'
        using errcode = '22023';
    end if;

    if p_listing_lng::text in (
      'NaN',
      'Infinity',
      '-Infinity'
    ) or p_listing_lng < -180
      or p_listing_lng > 180
    then
      raise exception
        'Longitude is invalid.'
        using errcode = '22023';
    end if;
  end if;

  /*
   * Lock the listing before checking ownership and
   * before changing classification or location.
   */
  select
    listing.user_id,
    listing.identity_id,
    listing.title,
    listing.description,
    listing.condition,
    listing.category,
    listing.subcategory,
    listing.details,
    listing.country,
    listing.city,
    listing.location,
    listing.listing_lat,
    listing.listing_lng,
    listing.search_text
  into
    v_listing_user_id,
    v_listing_identity_id,
    v_title,
    v_description,
    v_condition,
    v_existing_category,
    v_existing_subcategory,
    v_existing_details,
    v_existing_country,
    v_existing_city,
    v_existing_location,
    v_existing_listing_lat,
    v_existing_listing_lng,
    v_existing_search_text
  from public.listings listing
  where listing.id = v_listing_id
  for update;

  if not found then
    raise exception
      'The listing does not exist.'
      using errcode = '22023';
  end if;

  /*
   * Identity-first ownership:
   *
   * - an identity-owned listing requires the current
   *   active identity;
   * - user_id is only a fallback for a genuine legacy
   *   listing without identity_id.
   */
  if v_listing_identity_id is not null then
    if v_listing_identity_id <> v_active_identity_id then
      raise exception
        'The listing does not belong to the active identity.'
        using errcode = '42501';
    end if;
  elsif v_listing_user_id is distinct from v_user_id then
    raise exception
      'The legacy listing does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  v_existing_details :=
    coalesce(
      v_existing_details,
      '{}'::jsonb
    );

  if jsonb_typeof(v_existing_details) <> 'object' then
    raise exception
      'The listing details must be a JSON object.'
      using errcode = '22023';
  end if;

  /*
   * Preserve every existing detail field. Only the
   * global-category detailCategory key is replaced.
   */
  v_new_details :=
    v_existing_details
    - 'detailCategory';

  if v_clean_detail_category is not null then
    v_new_details := jsonb_set(
      v_new_details,
      '{detailCategory}',
      to_jsonb(v_clean_detail_category),
      true
    );
  end if;

  /*
   * The display location is derived server-side so the
   * country/city columns and location label cannot drift.
   */
  v_new_location := nullif(
    concat_ws(
      ' • ',
      v_clean_country,
      v_clean_city
    ),
    ''
  );

  select string_agg(
    detail.detail_value,
    ' '
  )
  into v_details_search_text
  from jsonb_each_text(
    v_new_details
  ) as detail(
    detail_key,
    detail_value
  );

  /*
   * Rebuild search_text with classification, location
   * and all preserved detail values. The existing
   * listings trigger rebuilds search_vector.
   */
  v_new_search_text := lower(
    regexp_replace(
      btrim(
        concat_ws(
          ' ',
          v_title,
          v_description,
          v_clean_category,
          v_clean_subcategory,
          v_clean_detail_category,
          v_condition,
          v_clean_country,
          v_clean_city,
          v_details_search_text
        )
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );

  v_changed :=
    v_existing_category
      is distinct from v_clean_category
    or v_existing_subcategory
      is distinct from v_clean_subcategory
    or v_existing_details
      is distinct from v_new_details
    or v_existing_country
      is distinct from v_clean_country
    or v_existing_city
      is distinct from v_clean_city
    or v_existing_location
      is distinct from v_new_location
    or v_existing_listing_lat
      is distinct from p_listing_lat
    or v_existing_listing_lng
      is distinct from p_listing_lng
    or v_existing_search_text
      is distinct from v_new_search_text;

  if v_changed then
    update public.listings listing
    set
      category = v_clean_category,
      subcategory = v_clean_subcategory,
      details = v_new_details,
      country = v_clean_country,
      city = v_clean_city,
      location = v_new_location,
      listing_lat = p_listing_lat,
      listing_lng = p_listing_lng,
      search_text = v_new_search_text,
      updated_by_user_id = v_user_id
    where listing.id = v_listing_id;
  end if;

  return query
  select
    v_listing_id,
    v_clean_category,
    v_clean_subcategory,
    v_clean_detail_category,
    v_clean_country,
    v_clean_city,
    v_new_location,
    p_listing_lat,
    p_listing_lng,
    v_changed;
end;
$_$;
ALTER FUNCTION public.update_my_listing_classification_location_v2(text,text,text,text,text,text,double precision,double precision) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.update_my_listing_classification_location_v2(text,text,text,text,text,text,double precision,double precision) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.update_my_listing_classification_location_v2(text,text,text,text,text,text,double precision,double precision) TO authenticated,service_role;
-- SOURCE: supabase/migrations/20260722173530_baseline_20260722.sql#set_my_listing_store_categories_v2
CREATE OR REPLACE FUNCTION "public"."set_my_listing_store_categories_v2"("p_listing_id" "text", "p_category_ids" "uuid"[] DEFAULT '{}'::"uuid"[]) RETURNS TABLE("listing_id" bigint, "category_ids" "uuid"[], "assigned_count" integer, "removed_previous_links" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $_$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_listing_id bigint;
  v_listing_identity_id uuid;

  v_normalized_category_ids uuid[] := '{}'::uuid[];
  v_requested_count integer := 0;
  v_valid_count integer := 0;
  v_removed_count integer := 0;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  /*
   * Listing IDs arrive from the browser as strings.
   * Accept only a positive numeric database ID.
   */
  if btrim(coalesce(p_listing_id, '')) !~ '^[0-9]+$' then
    raise exception
      'A valid listing ID is required.'
      using errcode = '22023';
  end if;

  v_listing_id := btrim(p_listing_id)::bigint;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      v_active_identity_id
    ),
    false
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock and verify the listing.
   *
   * Store categories are identity-owned, therefore V2 assignment
   * requires identity_id ownership. A legacy user_id-only listing
   * must first be migrated to identity ownership.
   */
  select listing.identity_id
  into v_listing_identity_id
  from public.listings listing
  where listing.id = v_listing_id
  for update;

  if not found then
    raise exception
      'The listing does not exist.'
      using errcode = '22023';
  end if;

  if v_listing_identity_id is null
    or v_listing_identity_id <> v_active_identity_id
  then
    raise exception
      'The listing does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Normalize the requested set:
   *
   * - NULL input becomes an empty array
   * - NULL category IDs are discarded
   * - duplicate IDs are removed
   * - deterministic ordering is used in the returned value
   */
  select coalesce(
    array_agg(
      distinct requested.category_id
      order by requested.category_id
    ),
    '{}'::uuid[]
  )
  into v_normalized_category_ids
  from unnest(
    coalesce(p_category_ids, '{}'::uuid[])
  ) as requested(category_id)
  where requested.category_id is not null;

  v_requested_count :=
    coalesce(cardinality(v_normalized_category_ids), 0);

  /*
   * Every selected category must belong to the same active identity.
   * A foreign, missing or stale category ID rejects the whole update.
   */
  if v_requested_count > 0 then
    select count(*)::integer
    into v_valid_count
    from public.store_categories category
    where category.identity_id = v_active_identity_id
      and category.id = any(v_normalized_category_ids);

    if v_valid_count <> v_requested_count then
      raise exception
        'One or more store categories do not belong to the active identity.'
        using errcode = '42501';
    end if;
  end if;

  /*
   * Replace the complete explicit assignment set atomically.
   *
   * If validation or insertion fails, PostgreSQL rolls the entire
   * function call back, including this deletion.
   */
  with deleted_links as (
    delete from public.listing_store_categories relation
    where relation.listing_id = v_listing_id
    returning 1
  )
  select count(*)::integer
  into v_removed_count
  from deleted_links;

  if v_requested_count > 0 then
    insert into public.listing_store_categories (
      listing_id,
      store_category_id
    )
    select
      v_listing_id,
      selected_category.category_id
    from unnest(
      v_normalized_category_ids
    ) as selected_category(category_id);
  end if;

  return query
  select
    v_listing_id,
    v_normalized_category_ids,
    v_requested_count,
    v_removed_count;
end;
$_$;
ALTER FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_listing_store_categories_v2(text,uuid[]) TO authenticated,service_role;
