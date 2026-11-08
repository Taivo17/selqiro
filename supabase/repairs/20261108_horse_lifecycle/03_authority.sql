-- Retained functions keep their owner, EXECUTE grants and execution settings.
-- New owner commands are authenticated-only; they bind the active identity in
-- the same database transaction. No direct table or private-schema grants.
REVOKE ALL ON FUNCTION
 horse_publication_private.effective_active_until(public.horse_offers),
 horse_publication_private.has_current_publication(uuid),
 horse_publication_private.lifecycle_snapshot(uuid,uuid,uuid,boolean),
 horse_publication_private.lock_lifecycle(uuid,uuid,uuid,bigint,text,timestamptz),
 public.get_my_horse_offer_lifecycle_v1(uuid,uuid,uuid),
 public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text),
 public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.has_current_publication(uuid)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION
 public.get_my_horse_offer_lifecycle_v1(uuid,uuid,uuid),
 public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text),
 public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz)
 TO authenticated;

COMMENT ON FUNCTION public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text) IS
 'Explicit owner lifecycle selection for a canonical published horse offer. Active identity plus source status, effective deadline and edit revision CAS. Does not change deadline or publish content; stale and uncertain writes are not replayed.';
COMMENT ON FUNCTION public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz) IS
 'Explicit owner renewal of an active-status canonical horse offer for 90 * 24 hours from server time. Finite deadline, identity and revision CAS, no silent reactivation, no content/gallery/policy mutation.';
