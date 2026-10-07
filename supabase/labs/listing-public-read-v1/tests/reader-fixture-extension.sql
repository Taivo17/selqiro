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
