-- Fresh authority/size prerequisites. No account, message or offer rows read.
DO $offer_intent_authority$
DECLARE rel regclass;
BEGIN
 IF current_user<>'postgres' OR NOT has_schema_privilege('postgres','public','CREATE')
 OR NOT pg_has_role('postgres','selqiro_listing_contact_writer_v1','USAGE')
 OR NOT has_schema_privilege('postgres','auth','USAGE')
 OR NOT has_table_privilege('postgres','auth.users','SELECT')
 OR NOT has_any_column_privilege('postgres','auth.users','UPDATE')
 OR row_security_active('auth.users'::regclass)
 OR NOT has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT')
 OR NOT has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE')
 OR row_security_active('account_lifecycle_private.account_states'::regclass) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='OFFER_MESSAGE_INTENT_AUTHORITY_REQUIRED'; END IF;
 FOREACH rel IN ARRAY ARRAY['horse_publication_private.message_cards'::regclass,'service_publication_private.message_cards'::regclass,'jobs_private.message_cards'::regclass] LOOP
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid=rel AND attnum>0 AND NOT attisdropped)>16
  OR (SELECT count(*) FROM pg_constraint WHERE conrelid=rel)>16
  OR (SELECT count(*) FROM pg_index WHERE indrelid=rel)>8
  OR (SELECT count(*) FROM pg_policy WHERE polrelid=rel)>8
  OR (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel AND NOT tgisinternal)>8 THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFER_MESSAGE_INTENT_CATALOG_LIMIT'; END IF;
 END LOOP;
END $offer_intent_authority$;
