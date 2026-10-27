-- REVIEW TEMPLATE ONLY. Begin a transaction; supply the same externally verified
-- project_ref and recorded instance_id GUCs used at installation/activation.
-- Pausing preserves listings, accounts, receipts, objects and all reservations.
DO $pause$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' THEN
  RAISE EXCEPTION 'hosted_preview_trusted_pause_required' USING ERRCODE='42501';
 END IF;
 UPDATE listing_publication_private.hosted_preview_settings SET enabled=false
 WHERE singleton AND project_ref=current_setting('selqiro.hosted_preview_project_ref',true)
  AND instance_id::text=current_setting('selqiro.hosted_preview_instance_id',true)
  AND release_id='listing-publication-hosted-preview-v1';
 IF NOT FOUND THEN RAISE EXCEPTION 'hosted_preview_pause_identity_mismatch' USING ERRCODE='55000'; END IF;
END $pause$;
