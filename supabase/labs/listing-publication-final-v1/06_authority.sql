-- This NOLOGIN role is a narrow SQL writer, not a client session or JWT claim.
GRANT USAGE ON SCHEMA public,auth,listing_publication_private TO selqiro_listing_final_writer_v1;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.listings,public.listing_images TO selqiro_listing_final_writer_v1;
GRANT USAGE,SELECT ON SEQUENCE public.listings_id_seq TO selqiro_listing_final_writer_v1;
CREATE POLICY final_writer_listings ON public.listings FOR ALL TO selqiro_listing_final_writer_v1
 USING (public.current_user_has_identity_access(identity_id)) WITH CHECK(public.current_user_has_identity_access(identity_id));
CREATE POLICY final_writer_images ON public.listing_images FOR ALL TO selqiro_listing_final_writer_v1
 USING (EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND public.current_user_has_identity_access(l.identity_id)))
 WITH CHECK(EXISTS(SELECT 1 FROM public.listings l WHERE l.id=listing_id AND public.current_user_has_identity_access(l.identity_id)));
GRANT SELECT ON ALL TABLES IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
GRANT INSERT,UPDATE ON listing_publication_private.publications,listing_publication_private.cleanup TO selqiro_listing_final_writer_v1;
GRANT UPDATE(state,payload,closed_at) ON listing_publication_private.attempts TO selqiro_listing_final_writer_v1;
DO $policies$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['attempts','slots','objects','cleanup','web_images','upload_grants','publications'] LOOP
  EXECUTE format('CREATE POLICY final_internal_writer ON listing_publication_private.%I FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true)',t);
 END LOOP;
END $policies$;
GRANT EXECUTE ON FUNCTION auth.uid(),public.current_user_has_identity_access(uuid),public.normalize_listing_price_v1(jsonb),
 public.listing_price_currency_scale_v1(text),public.listing_price_legacy_label_v1(jsonb),
 public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),public.listing_basics_search_text_v1(public.listings)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public,listing_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.apply_final(uuid,jsonb,text) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.apply_delete(uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_cleanup_v1() OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_cleanup_v1(uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public,listing_publication_private FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_final_guard_state_v1(bigint) TO selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1;
-- Old direct API-role writes remain closed by the classifier ACL until release review.
-- Existing dedicated price-CAS writer can still classify managed rows; no private SELECT granted.
COMMENT ON SCHEMA listing_publication_private IS 'Dormant final-publication/terminal-content-deletion/durable-cleanup candidate. Dispatched-write settlement and media route rollout remain closed.';

GRANT SELECT(id,listing_id) ON public.conversations,public.messages TO selqiro_listing_final_writer_v1;
GRANT UPDATE(listing_title_snapshot,listing_image_snapshot,listing_price_snapshot) ON public.conversations TO selqiro_listing_final_writer_v1;
GRANT UPDATE(listing_title,listing_image,listing_price) ON public.messages TO selqiro_listing_final_writer_v1;
CREATE POLICY final_snapshot_scrub ON public.conversations FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY final_snapshot_scrub ON public.messages FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
