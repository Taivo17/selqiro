REVOKE ALL ON ALL TABLES IN SCHEMA horse_publication_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA horse_publication_private FROM PUBLIC,anon,authenticated,service_role;
-- Canonical managed gallery membership can move only through the controlled
-- command transaction; direct owner DML cannot bypass WEB retirement lineage.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.horse_offer_images FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA horse_publication_private TO selqiro_listing_final_writer_v1;
-- Retained media guards run as the existing isolated writer. Read-only canonical
-- membership is enough; the horse API functions retain postgres ownership.
GRANT SELECT ON public.horse_offers,public.horse_offer_images,public.horse_offer_publication_events TO selqiro_listing_final_writer_v1;
CREATE POLICY horse_writer_read_offers ON public.horse_offers FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY horse_writer_read_images ON public.horse_offer_images FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY horse_writer_read_events ON public.horse_offer_publication_events FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
GRANT CREATE ON SCHEMA horse_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION horse_publication_private.close_published_attempt(uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA horse_publication_private FROM selqiro_listing_final_writer_v1;

REVOKE ALL ON FUNCTION public.prepare_my_horse_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb),
 public.get_my_horse_publication_attempt_v1(uuid,uuid,uuid,uuid),
 public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_horse_publication_v1(uuid,uuid,uuid,uuid),
 public.get_my_horse_offer_publication_snapshot_v1(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_horse_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb,jsonb),
 public.get_my_horse_publication_attempt_v1(uuid,uuid,uuid,uuid),
 public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_horse_publication_v1(uuid,uuid,uuid,uuid),
 public.get_my_horse_offer_publication_snapshot_v1(uuid,uuid,uuid) TO authenticated;
