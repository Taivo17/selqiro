-- Final authority is deliberately explicit. Baseline public table/function ACLs
-- are untouched; only names introduced by this release are closed and reopened.
SELECT listing_publication_private.assert_hosted_install_context();

CREATE FUNCTION public.get_selqiro_hosted_preview_readiness_v1(
 p_expected_project_ref text,p_expected_release_id text,p_expected_instance_id uuid,p_expected_user_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE config listing_publication_private.hosted_preview_settings%ROWTYPE; ready boolean; allowed boolean;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'service_role' THEN
  RAISE EXCEPTION 'publication_hosted_readiness_service_required' USING ERRCODE='42501';
 END IF;
 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_hosted_release_not_installed' USING ERRCODE='55000'; END IF;
 ready:=coalesce(config.enabled AND config.release_ready
  AND config.storage_authority_version='source-part-rfc3986-v1'
  AND listing_publication_private.hosted_storage_contract_ready()
  AND config.project_ref=p_expected_project_ref AND config.release_id=p_expected_release_id
  AND config.instance_id=p_expected_instance_id,false);
 allowed:=ready AND p_expected_user_id IS NOT NULL AND EXISTS(
  SELECT 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=p_expected_user_id);
 RETURN jsonb_build_object('schema_version',1,'scope','hosted-preview-v1',
  'storage_contract','supabase-s3-session-v1','cleanup_mode','held',
  'project_ref',config.project_ref,'release_id',config.release_id,'instance_id',config.instance_id,
  'enabled',ready,'actor_user_id',p_expected_user_id,'actor_allowed',allowed);
END $f$;

-- GENERATED_CLOSE_NEW_PUBLIC_FUNCTIONS --

GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1()
 TO anon,authenticated,service_role,selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1,selqiro_listing_contact_writer_v1;
-- Existing listing expression indexes also execute on INSERT/UPDATE. Preserve
-- their implementation and API ACLs; grant only the two new actual writers.
GRANT EXECUTE ON FUNCTION public.public_listing_search_document_v1(text,text,text,text,jsonb)
 TO selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1;

-- Only public projections, without private media paths or upload authority.
GRANT EXECUTE ON FUNCTION
 public.search_public_listings_v2(text,text,text,text,text,text,integer,integer),
 public.get_public_listing_detail_v1(text),
 public.get_public_profile_listings_v1(text,uuid,integer,integer),
 public.get_public_profile_services_v1(text,integer),
 public.get_public_profile_showcases_v1(text,integer)
 TO anon,authenticated;

-- Browser calls are independently actor-gated in SQL. Helpers, raw price CAS,
-- old signing/issuance and terminal-cleanup RPCs receive no API grant.
GRANT EXECUTE ON FUNCTION
 public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb),
 public.get_my_listing_publication_v1(uuid,uuid,uuid),
 public.cancel_my_listing_publication_v1(uuid,uuid,uuid),
 public.get_my_listing_publication_journey_v2(uuid,uuid,uuid),
 public.cancel_my_listing_publication_journey_v2(uuid,uuid,uuid),
 public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid),
 public.get_my_listing_publication_confirmation_v1(uuid,uuid,uuid),
 public.publish_my_listing_v1(uuid,uuid,uuid,text),
 public.delete_my_published_listing_v1(uuid,uuid,text),
 public.get_my_listing_cleanup_summary_v1(uuid,uuid),
 public.get_my_listing_edit_v1(text,uuid,uuid),
 public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text),
 public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid),
 public.get_my_managed_listing_v2(uuid,uuid,text),
 public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
 public.set_my_managed_listing_status_v2(uuid,uuid,text,text,text),
 public.renew_my_managed_listing_activity_v2(uuid,uuid,text,timestamp with time zone),
 public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
 public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_listing_conversation_v1(uuid,uuid,text,text),
 public.list_my_listing_conversations_v1(uuid,uuid,text)
 TO authenticated;

-- Classifiers are required by existing-table triggers/RLS even on legacy rows.
-- These helpers reveal only a managed state/boolean, never a private ledger.
-- The publication classifier also checks the allowlist for managed mutations.
GRANT EXECUTE ON FUNCTION public.listing_final_guard_state_v1(bigint),
 public.listing_contact_is_managed_v1(bigint,bigint)
 TO anon,authenticated,service_role,selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1,selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_contact_visible_v1(bigint) TO authenticated,selqiro_listing_contact_writer_v1;
-- The existing listing CHECK and row trigger invoke pure money functions as
-- the caller; these grants preserve legacy writes without granting a writer.
GRANT EXECUTE ON FUNCTION public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
 public.normalize_listing_price_v1(jsonb),public.listing_price_currency_scale_v1(text),
 public.listing_price_legacy_label_v1(jsonb)
 TO anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION
 public.reserve_listing_multipart_v2(uuid,uuid,uuid,uuid,uuid,text),
 public.get_listing_multipart_v2(uuid,uuid,uuid,uuid,uuid,text),
 public.record_listing_multipart_created_v2(uuid,uuid,text),
 public.claim_listing_multipart_part_v2(uuid,uuid,uuid,uuid,uuid,text),
 public.claim_listing_multipart_complete_v2(uuid,uuid,uuid,uuid,uuid,text,text),
 public.record_listing_multipart_completed_v2(uuid,uuid,text),
 public.record_listing_multipart_verified_v2(uuid,uuid,uuid,uuid,uuid,text,text,integer),
 public.record_listing_multipart_problem_v2(uuid,text),
 public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid),
 public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb),
 public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer),
 public.get_public_listing_media_binding_v1(uuid,integer),
 public.get_selqiro_hosted_preview_readiness_v1(text,text,uuid,uuid)
 TO service_role;
-- The restrictive Storage policy also evaluates for anon; the helper returns
-- false immediately for that role, keeping other bucket policy behavior intact.
GRANT EXECUTE ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) TO authenticated,anon;

-- Contact/publication share the exact same gate. Neither role can alter the
-- settings/allowlist, impersonate postgres, or mint terminal cleanup evidence.
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid),
 listing_publication_private.assert_hosted_preview_object(uuid)
 TO selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE CREATE ON SCHEMA public,listing_publication_private,listing_contact_private
 FROM selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1,selqiro_listing_contact_writer_v1;

DO $final_contract$
DECLARE role_name text; forbidden text; api text;
BEGIN
 FOREACH role_name IN ARRAY ARRAY['selqiro_listing_price_writer_v1','selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
   AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls)
   OR NOT pg_has_role('postgres',role_name,'USAGE') OR NOT pg_has_role('postgres',role_name,'SET')
   OR NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.roleid=role_name::regrole
    AND m.member='postgres'::regrole AND m.admin_option AND m.grantor<>'postgres'::regrole)
   OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
    JOIN pg_roles member ON member.oid=m.member WHERE r.rolname=role_name AND member.rolname<>'postgres') THEN
   RAISE EXCEPTION 'hosted_release_writer_role_contract: %',role_name USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH forbidden IN ARRAY ARRAY[
  'public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid)',
  'public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)',
  'public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid)',
  'public.record_listing_web_write_completed_v1(uuid,uuid,uuid,uuid,uuid,uuid)',
  'public.claim_listing_cleanup_v1()',
  'public.record_listing_cleanup_v1(uuid,uuid,text)',
  'public.prepare_listing_multipart_cleanup_v2(uuid,uuid,uuid,uuid)',
  'public.record_listing_multipart_abort_v2(uuid,uuid,uuid,text)',
  'public.claim_listing_cleanup_for_attempt_v2(uuid,uuid,uuid,uuid)'] LOOP
  IF to_regprocedure(forbidden) IS NOT NULL THEN
   FOREACH api IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF has_function_privilege(api,to_regprocedure(forbidden),'EXECUTE') THEN
     RAISE EXCEPTION 'hosted_release_forbidden_api_grant: % %',api,forbidden USING ERRCODE='55000';
    END IF;
   END LOOP;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM listing_publication_private.hosted_preview_actors)
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_preview_settings WHERE singleton
   AND NOT enabled AND NOT release_ready AND storage_authority_version='source-part-rfc3986-v1') THEN
  RAISE EXCEPTION 'hosted_release_must_install_disabled' USING ERRCODE='55000';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.listing_source_part_allowed_hosted_v1(text,text)'::regprocedure
  AND proowner='selqiro_listing_final_writer_v1'::regrole AND prosecdef)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.get_selqiro_hosted_preview_readiness_v1(text,text,uuid,uuid)'::regprocedure
   AND proowner='postgres'::regrole AND prosecdef) THEN
  RAISE EXCEPTION 'hosted_release_helper_owner_contract' USING ERRCODE='55000';
 END IF;
END $final_contract$;

UPDATE listing_publication_private.hosted_preview_settings SET release_ready=true
 WHERE singleton AND NOT enabled AND NOT release_ready AND storage_authority_version='source-part-rfc3986-v1';
COMMENT ON SCHEMA listing_publication_private IS
 'listing-publication-hosted-preview-v1: additive closed preview, actor allowlist required; terminal cleanup and reservations held.';
COMMENT ON TABLE listing_publication_private.hosted_preview_settings IS
 'Trusted installer target identity and closed-by-default preview activation. No API table privileges or activation RPC.';
NOTIFY pgrst,'reload schema';
