-- DISPOSABLE TEST FIXTURE ONLY. NEVER APPLY TO AN EXISTING DATABASE.
-- Seven selected table CREATE definitions copied from the reviewed 27 Sep schema.
-- Selected keys and exact two helper/trigger bodies; synthetic auth, restrictive
-- fixture ACL/RLS. Not a full Supabase schema, production ACL or HTTP test.
-- There are NO real user rows, original database connections or copied keys.
\set ON_ERROR_STOP on
begin;
create role anon nologin nosuperuser nocreatedb nocreaterole noinherit;
create role authenticated nologin nosuperuser nocreatedb nocreaterole noinherit;
create role service_role nologin nosuperuser nocreatedb nocreaterole noinherit;
revoke create on schema public from public;
create schema auth;
create function auth.uid() returns uuid language sql stable as $auth$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$auth$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

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
CREATE OR REPLACE FUNCTION "public"."current_user_has_identity_access"("p_identity_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
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
$$;
CREATE OR REPLACE FUNCTION "public"."update_listing_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;
revoke all on function public.current_user_has_identity_access(uuid) from public;
grant execute on function public.current_user_has_identity_access(uuid) to authenticated, service_role;
create trigger trg_update_listing_search_vector before insert or update on public.listings
for each row execute function public.update_listing_search_vector();
alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated, service_role;
alter table public.identities enable row level security;
revoke all on table public.identities from public, anon, authenticated, service_role;
alter table public.business_members enable row level security;
revoke all on table public.business_members from public, anon, authenticated, service_role;
alter table public.listings enable row level security;
revoke all on table public.listings from public, anon, authenticated, service_role;
alter table public.listing_images enable row level security;
revoke all on table public.listing_images from public, anon, authenticated, service_role;
alter table public.store_categories enable row level security;
revoke all on table public.store_categories from public, anon, authenticated, service_role;
alter table public.listing_store_categories enable row level security;
revoke all on table public.listing_store_categories from public, anon, authenticated, service_role;
grant select on public.listings to authenticated;
create policy test_owner_listing_read on public.listings for select to authenticated
  using (identity_id in (select active_identity_id from public.profiles where id=auth.uid()));
grant select on public.profiles to authenticated;
create policy test_own_profile_read on public.profiles for select to authenticated using (id=auth.uid());
commit;
