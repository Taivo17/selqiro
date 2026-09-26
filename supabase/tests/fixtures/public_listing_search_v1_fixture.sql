-- ISOLATED TEST FIXTURE ONLY. Never execute in a Selqiro database.
-- Five full CREATE TABLE declarations from the reviewed 20260722 baseline.
-- Production FKs/triggers/policies are not cloned: deliberately restrictive test ACLs below.
-- Synthetic auth.uid session adapter; this does not test Supabase Auth/HTTP or production role inheritance.
\set ON_ERROR_STOP on
begin;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;

-- Exact baseline table SHA256: 8711f06dcde3e478a3b01d2b0663a3592e799f59005450f7741f7b8c5500b76e
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
alter table public.identities enable row level security;
revoke all on table public.identities from public, anon, authenticated, service_role;

-- Exact baseline table SHA256: 30af13209c8050cf797b7c4c610ea2bb58fad5df6c1872ee3e18f8f1cd9b378f
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
alter table public.identity_profiles add primary key (id);
alter table public.identity_profiles enable row level security;
revoke all on table public.identity_profiles from public, anon, authenticated, service_role;

-- Exact baseline table SHA256: 55effd0c0ac767a4a62331b03cd52d63ed8928e46e25294fec58b879b9a3c419
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
alter table public.listings enable row level security;
revoke all on table public.listings from public, anon, authenticated, service_role;

-- Exact baseline table SHA256: d0348bd3e50cd824eb599f26fd68f0b695307eb4c43d7ef9adc0f7adc9cf1f2a
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
alter table public.listing_images enable row level security;
revoke all on table public.listing_images from public, anon, authenticated, service_role;

-- Exact baseline table SHA256: 1e16a957c8082fd1541ba506c3f04e8432b1e0860dd6708820aa5302b0565a57
CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" bigint NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);
alter table public.user_blocks add primary key (id);
alter table public.user_blocks enable row level security;
revoke all on table public.user_blocks from public, anon, authenticated, service_role;
alter table public.identity_profiles add unique (identity_id);
alter table public.user_blocks add unique (blocker_id, blocked_id);
-- Test explicit function grants even with permissive function defaults.
alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated, service_role;
commit;
