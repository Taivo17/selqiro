-- Helpers remain private; browser roles cannot allocate or perform account
-- housekeeping directly. Storage claims/results are service-only and run with
-- the existing ledger writer's scoped mutation authority.
REVOKE ALL ON FUNCTION
 listing_publication_private.upload_object_is_published_web_v1(uuid),
 listing_publication_private.pending_upload_reserved_bytes_v1(uuid),
 listing_publication_private.lock_account_upload_actor_v1(uuid,uuid),
 listing_publication_private.lock_account_upload_identity_v1(uuid,uuid),
 listing_publication_private.account_source_cleanup_eligible_v1(uuid,uuid),
 listing_publication_private.lock_account_source_cleanup_context_v1(uuid,uuid),
 public.claim_listing_account_source_cleanup_v1(uuid,uuid),
 public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION
 listing_publication_private.upload_object_is_published_web_v1(uuid),
 listing_publication_private.pending_upload_reserved_bytes_v1(uuid),
 listing_publication_private.lock_account_upload_actor_v1(uuid,uuid),
 listing_publication_private.lock_account_upload_identity_v1(uuid,uuid),
 listing_publication_private.account_source_cleanup_eligible_v1(uuid,uuid),
 listing_publication_private.lock_account_source_cleanup_context_v1(uuid,uuid)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.claim_listing_account_source_cleanup_v1(uuid,uuid),
 public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text) TO service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_account_source_cleanup_v1(uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
