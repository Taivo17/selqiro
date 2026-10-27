-- New disposable fixture extension. Exact table/policy declarations selected from
-- 20260722173530_baseline_20260722.sql; no old suites or user data are loaded.
DO $gate$ BEGIN IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'listing_contact_disposable_helper_required'; END IF; END $gate$;

CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" bigint NOT NULL,
    "conversation_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "custom_title" "text",
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "identity_id" "uuid"
);

CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" bigint NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.conversations'::regclass AND attname='id' AND attidentity<>'') THEN
ALTER TABLE "public"."conversations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."conversations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.messages'::regclass AND attname='id' AND attidentity<>'') THEN
ALTER TABLE "public"."messages" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.conversation_participants'::regclass AND attname='id' AND attidentity<>'') THEN
ALTER TABLE "public"."conversation_participants" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."conversation_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
END IF; END $extend$;

CREATE SEQUENCE IF NOT EXISTS "public"."user_blocks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.user_blocks_id_seq OWNED BY public.user_blocks.id;

ALTER TABLE ONLY "public"."user_blocks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_blocks_id_seq"'::"regclass");

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.conversation_participants'::regclass AND conname='conversation_participants_conversation_id_user_id_key') THEN
ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.conversation_participants'::regclass AND conname='conversation_participants_pkey') THEN
ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.conversation_participants'::regclass AND conname='conversation_participants_conversation_id_fkey') THEN
ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.conversation_participants'::regclass AND conname='conversation_participants_user_id_fkey') THEN
ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
END IF; END $extend$;

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.user_blocks'::regclass AND conname='user_blocks_blocker_id_blocked_id_key') THEN
ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.user_blocks'::regclass AND conname='user_blocks_pkey') THEN
ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.user_blocks'::regclass AND conname='user_blocks_blocked_id_fkey') THEN
ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.user_blocks'::regclass AND conname='user_blocks_blocker_id_fkey') THEN
ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
END IF; END $extend$;

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Conversation creator can view created conversation') THEN
CREATE POLICY "Conversation creator can view created conversation" ON "public"."conversations" FOR SELECT TO "authenticated" USING (("created_by" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can create conversations') THEN
CREATE POLICY "Users can create conversations" ON "public"."conversations" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can delete own conversations') THEN
CREATE POLICY "Users can delete own conversations" ON "public"."conversations" FOR DELETE TO "authenticated" USING (("id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can update own conversations') THEN
CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can view buyer seller conversations') THEN
CREATE POLICY "Users can view buyer seller conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((("buyer_id" = "auth"."uid"()) OR ("seller_id" = "auth"."uid"())));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversations' AND policyname='Users can view own conversations') THEN
CREATE POLICY "Users can view own conversations" ON "public"."conversations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "conversations"."id") AND ("cp"."user_id" = "auth"."uid"())))));
END IF; END $extend$;

GRANT ALL ON TABLE public.conversations TO anon,authenticated,service_role;

GRANT USAGE,SELECT ON SEQUENCE public.conversations_id_seq TO anon,authenticated,service_role;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Users can insert messages') THEN
CREATE POLICY "Users can insert messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("sender_id" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='messages' AND policyname='Users can view messages') THEN
CREATE POLICY "Users can view messages" ON "public"."messages" FOR SELECT TO "authenticated" USING (("conversation_id" IN ( SELECT "conversation_participants"."conversation_id"
   FROM "public"."conversation_participants"
  WHERE ("conversation_participants"."user_id" = "auth"."uid"()))));
END IF; END $extend$;

GRANT ALL ON TABLE public.messages TO anon,authenticated,service_role;

GRANT USAGE,SELECT ON SEQUENCE public.messages_id_seq TO anon,authenticated,service_role;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_participants' AND policyname='Users can insert conversation participants') THEN
CREATE POLICY "Users can insert conversation participants" ON "public"."conversation_participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."conversations" "c"
  WHERE (("c"."id" = "conversation_participants"."conversation_id") AND ("c"."created_by" = "auth"."uid"()))))));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_participants' AND policyname='Users can update own participants') THEN
CREATE POLICY "Users can update own participants" ON "public"."conversation_participants" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='conversation_participants' AND policyname='Users can view own participants') THEN
CREATE POLICY "Users can view own participants" ON "public"."conversation_participants" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));
END IF; END $extend$;

GRANT ALL ON TABLE public.conversation_participants TO anon,authenticated,service_role;

GRANT USAGE,SELECT ON SEQUENCE public.conversation_participants_id_seq TO anon,authenticated,service_role;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='Users can create own blocks') THEN
CREATE POLICY "Users can create own blocks" ON "public"."user_blocks" FOR INSERT TO "authenticated" WITH CHECK (("blocker_id" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='Users can delete own blocks') THEN
CREATE POLICY "Users can delete own blocks" ON "public"."user_blocks" FOR DELETE TO "authenticated" USING (("blocker_id" = "auth"."uid"()));
END IF; END $extend$;

DO $extend$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_blocks' AND policyname='Users can view own blocks') THEN
CREATE POLICY "Users can view own blocks" ON "public"."user_blocks" FOR SELECT TO "authenticated" USING ((("blocker_id" = "auth"."uid"()) OR ("blocked_id" = "auth"."uid"())));
END IF; END $extend$;

GRANT ALL ON TABLE public.user_blocks TO anon,authenticated,service_role;

GRANT USAGE,SELECT ON SEQUENCE public.user_blocks_id_seq TO anon,authenticated,service_role;
