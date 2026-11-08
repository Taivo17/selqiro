-- Existing public signatures, owners and grants stay exact. The owner read
-- gets the same bounded two-second lock wait as the existing write commands.
-- No direct access to saved evidence is granted to clients or service_role.
REVOKE ALL ON FUNCTION horse_publication_private.reusable_confirmation(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION horse_publication_private.reusable_confirmation(uuid,uuid) IS
 'Private lookup of original immutable factual confirmation evidence for the same canonical horse offer, identity, confirming actor and immutable offer type. A reused event points directly to its original source; missing proof yields no saved confirmation.';
COMMENT ON COLUMN public.horse_offer_publication_events.confirmation_snapshot IS
 'Factual confirmations for this publication event. An explicit reused_from_publication_event_id identifies the original immutable human confirmation when saving a later edit; this is separate from current versioned policy acceptance.';
