CREATE OR REPLACE FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") RETURNS TABLE("identity_profile_id" "uuid", "identity_id" "uuid", "identity_type" "text", "business_account_id" "uuid", "display_name" "text", "slug" "text", "bio" "text", "avatar_url" "text", "banner_url" "text", "banner_dominant_color" "text", "contact_phone" "text", "contact_email" "text", "website_url" "text", "address_text" "text", "city" "text", "country" "text", "lat" double precision, "lng" double precision, "location_visibility" "text", "legacy_user_id" "uuid", "is_premium" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ip.id,
    i.id,
    i.type,
    i.business_account_id,
    ip.display_name,
    ip.slug,
    coalesce(ip.bio, p.bio),
    coalesce(ip.avatar_url, p.avatar_url),
    coalesce(ip.banner_url, p.banner_url),
    coalesce(ip.banner_dominant_color, p.banner_dominant_color),
    ip.contact_phone,
    ip.contact_email,
    ip.website_url,
    ip.address_text,
    ip.city,
    ip.country,
    ip.lat,
    ip.lng,
    ip.location_visibility,
    i.user_id,
    coalesce(p.is_premium, false)
  from identity_profiles ip
  join identities i on i.id = ip.identity_id
  left join profiles p on p.id = i.user_id
  where ip.slug = store_slug_input
     or p.store_slug = store_slug_input
  order by case when ip.slug = store_slug_input then 0 else 1 end
  limit 1;
$$;

ALTER FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text",
    "subcategory" "text",
    "image_url" "text",
    "price_amount" numeric(12,2),
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "price_type" "text" DEFAULT 'contact'::"text" NOT NULL,
    "country" "text",
    "city" "text",
    "location" "text",
    "service_lat" double precision,
    "service_lng" double precision,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "services_category_length_check" CHECK ((("category" IS NULL) OR (("char_length"(TRIM(BOTH FROM "category")) >= 1) AND ("char_length"(TRIM(BOTH FROM "category")) <= 120)))),
    CONSTRAINT "services_city_length_check" CHECK ((("city" IS NULL) OR (("char_length"(TRIM(BOTH FROM "city")) >= 1) AND ("char_length"(TRIM(BOTH FROM "city")) <= 160)))),
    CONSTRAINT "services_coordinate_pair_check" CHECK (((("service_lat" IS NULL) AND ("service_lng" IS NULL)) OR (("service_lat" IS NOT NULL) AND ("service_lng" IS NOT NULL)))),
    CONSTRAINT "services_country_length_check" CHECK ((("country" IS NULL) OR (("char_length"(TRIM(BOTH FROM "country")) >= 1) AND ("char_length"(TRIM(BOTH FROM "country")) <= 120)))),
    CONSTRAINT "services_currency_check" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "services_description_length_check" CHECK (("char_length"("description") <= 5000)),
    CONSTRAINT "services_image_url_length_check" CHECK ((("image_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "image_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "image_url")) <= 2000)))),
    CONSTRAINT "services_latitude_check" CHECK ((("service_lat" IS NULL) OR (("service_lat" >= ('-90'::integer)::double precision) AND ("service_lat" <= (90)::double precision)))),
    CONSTRAINT "services_location_length_check" CHECK ((("location" IS NULL) OR (("char_length"(TRIM(BOTH FROM "location")) >= 1) AND ("char_length"(TRIM(BOTH FROM "location")) <= 300)))),
    CONSTRAINT "services_longitude_check" CHECK ((("service_lng" IS NULL) OR (("service_lng" >= ('-180'::integer)::double precision) AND ("service_lng" <= (180)::double precision)))),
    CONSTRAINT "services_price_amount_check" CHECK ((("price_amount" IS NULL) OR ("price_amount" >= (0)::numeric))),
    CONSTRAINT "services_price_type_check" CHECK (("price_type" = ANY (ARRAY['fixed'::"text", 'from'::"text", 'hourly'::"text", 'contact'::"text"]))),
    CONSTRAINT "services_published_at_check" CHECK ((("status" <> 'published'::"text") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "services_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "services_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "services_subcategory_length_check" CHECK ((("subcategory" IS NULL) OR (("char_length"(TRIM(BOTH FROM "subcategory")) >= 1) AND ("char_length"(TRIM(BOTH FROM "subcategory")) <= 160)))),
    CONSTRAINT "services_title_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 2) AND ("char_length"(TRIM(BOTH FROM "title")) <= 140)))
);

ALTER TABLE "public"."services" OWNER TO "postgres";

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;

ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "public"."services" TO "anon";

GRANT SELECT ON TABLE "public"."services" TO "authenticated";

CREATE TABLE IF NOT EXISTS "public"."product_showcases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identity_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text",
    "image_url" "text",
    "external_url" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_showcases_category_length_check" CHECK ((("category" IS NULL) OR (("char_length"(TRIM(BOTH FROM "category")) >= 1) AND ("char_length"(TRIM(BOTH FROM "category")) <= 120)))),
    CONSTRAINT "product_showcases_description_length_check" CHECK (("char_length"("description") <= 5000)),
    CONSTRAINT "product_showcases_external_url_length_check" CHECK ((("external_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "external_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "external_url")) <= 2000)))),
    CONSTRAINT "product_showcases_image_url_length_check" CHECK ((("image_url" IS NULL) OR (("char_length"(TRIM(BOTH FROM "image_url")) >= 1) AND ("char_length"(TRIM(BOTH FROM "image_url")) <= 2000)))),
    CONSTRAINT "product_showcases_published_at_check" CHECK ((("status" <> 'published'::"text") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "product_showcases_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "product_showcases_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"]))),
    CONSTRAINT "product_showcases_title_length_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 2) AND ("char_length"(TRIM(BOTH FROM "title")) <= 140)))
);

ALTER TABLE "public"."product_showcases" OWNER TO "postgres";

ALTER TABLE ONLY "public"."product_showcases"
    ADD CONSTRAINT "product_showcases_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."product_showcases"
    ADD CONSTRAINT "product_showcases_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE CASCADE;

ALTER TABLE "public"."product_showcases" ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE "public"."product_showcases" TO "anon";

GRANT SELECT ON TABLE "public"."product_showcases" TO "authenticated";

alter table public.product_showcases
  add column if not exists
    last_confirmed_at timestamptz,
  add column if not exists
    active_until timestamptz;

CREATE POLICY "services authenticated read" ON "public"."services" FOR SELECT TO "authenticated" USING ((("status" = 'published'::"text") OR "public"."current_user_has_identity_access"("identity_id")));

CREATE POLICY "services public read" ON "public"."services" FOR SELECT TO "anon" USING (("status" = 'published'::"text"));

create policy
  "product showcases authenticated read"
on public.product_showcases
for select
to authenticated
using (
  (
    status = 'published'
    and active_until > now()
  )
  or public.current_user_has_identity_access(
    identity_id
  )
);

create policy
  "product showcases public read"
on public.product_showcases
for select
to anon
using (
  status = 'published'
  and active_until > now()
);

GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "anon";

GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "authenticated";

GRANT ALL ON FUNCTION "public"."get_store_by_slug"("store_slug_input" "text") TO "service_role";
REVOKE ALL ON FUNCTION public.get_store_by_slug(text) FROM PUBLIC;
NOTIFY pgrst,'reload schema';
