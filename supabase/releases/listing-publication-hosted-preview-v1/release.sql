-- ADDITIVE HOSTED PREVIEW RELEASE. Not automatically applied by Supabase CLI.
-- Caller must BEGIN, SET LOCAL trusted target settings, then include this file.
-- Review README.md. A failed statement must abort the entire transaction.
-- No actor is allowlisted and enabled remains false after successful installation.
-- COMPONENT 00_preconditions.sql
-- Hand-authored additive release entry contract. The trusted installer supplies
-- the externally verified project ref and a fresh, recorded installation UUID
-- through SET LOCAL in the SAME transaction. SQL alone cannot identify a hosted
-- project from its common database name; this is not a client-supplied setting.
DO $preconditions$
DECLARE item text; found_versions text[]; required_versions constant text[] := ARRAY[
 '20260722173530','20260723173859','20260723184319','20260726150000','20260729183000',
 '20260802213000','20260805123000','20260805150000','20260817130000','20260817150000',
 '20260818130000','20260822130000','20260830170000','20260906150000','20260911203000',
 '20260911220000','20260913113000','20260913190000','20260916200000','20260920150000',
 '20260926120000','20260926180000','20260928160000'];
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
  OR current_setting('transaction_read_only')<>'off'
  OR current_setting('transaction_isolation')<>'read committed'
  OR current_setting('server_version_num')::integer<170000
  OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres' AND NOT rolsuper AND rolcreaterole AND rolbypassrls) THEN
  RAISE EXCEPTION 'hosted_release_trusted_installer_required' USING ERRCODE='55000';
 END IF;
 IF coalesce(current_setting('selqiro.hosted_preview_project_ref',true),'') !~ '^[a-z]{20}$'
  OR coalesce(current_setting('selqiro.hosted_preview_instance_id',true),'') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR current_setting('selqiro.hosted_preview_instance_id',true)='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'hosted_release_verified_target_settings_required' USING ERRCODE='55000';
 END IF;
 IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
  RAISE EXCEPTION 'hosted_release_baseline_history_required' USING ERRCODE='55000';
 END IF;
 SELECT array_agg(version::text ORDER BY version::text) INTO found_versions
  FROM supabase_migrations.schema_migrations;
 IF found_versions IS DISTINCT FROM required_versions THEN
  RAISE EXCEPTION 'hosted_release_exact_23_migration_baseline_required' USING ERRCODE='55000';
 END IF;
 IF to_regnamespace('listing_publication_private') IS NOT NULL
  OR to_regnamespace('listing_contact_private') IS NOT NULL THEN
  RAISE EXCEPTION 'hosted_release_private_schema_already_exists' USING ERRCODE='55000';
 END IF;
 FOREACH item IN ARRAY ARRAY['anon','authenticated','service_role','postgres','authenticator'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=item) THEN
   RAISE EXCEPTION 'hosted_release_role_missing: %',item USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH item IN ARRAY ARRAY['selqiro_listing_price_writer_v1','selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=item) THEN
   RAISE EXCEPTION 'hosted_release_writer_role_collision: %',item USING ERRCODE='55000';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role','authenticator')
  AND pg_has_role(oid,'postgres','MEMBER')) THEN
  RAISE EXCEPTION 'hosted_release_api_installer_membership_forbidden' USING ERRCODE='55000';
 END IF;
 IF NOT has_table_privilege('postgres','auth.users','REFERENCES') THEN
  RAISE EXCEPTION 'hosted_release_existing_auth_reference_privilege_required' USING ERRCODE='55000';
 END IF;
 IF NOT has_schema_privilege('postgres','auth','USAGE')
  OR NOT has_function_privilege('postgres','auth.uid()','EXECUTE') THEN
  RAISE EXCEPTION 'hosted_release_existing_auth_actor_read_required' USING ERRCODE='55000';
 END IF;
 FOREACH item IN ARRAY ARRAY[
  'auth.users','public.profiles','public.identities','public.business_members','public.identity_profiles',
  'public.listings','public.listing_images','public.store_categories','public.listing_store_categories',
  'public.user_blocks','public.conversations','public.messages','public.conversation_participants',
  'public.publication_policy_documents','public.user_publication_policy_acceptances',
  'public.horse_offers','public.marketplace_item_projection_v1',
  'public.services','public.service_images','public.product_showcases','public.product_showcase_images',
  'public.listings_id_seq','public.conversations_id_seq','public.messages_id_seq','public.conversation_participants_id_seq',
  'storage.buckets','storage.objects','storage.s3_multipart_uploads','storage.s3_multipart_uploads_parts'] LOOP
  IF to_regclass(item) IS NULL THEN
   RAISE EXCEPTION 'hosted_release_existing_relation_required: %',item USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH item IN ARRAY ARRAY[
  'auth.uid()','public.current_user_has_identity_access(uuid)','public.require_my_active_identity_v2()',
  'public.get_store_category_scope_ids(uuid,uuid)',
  'public.public_listing_search_document_v1(text,text,text,text,jsonb)',
  'public.get_required_publication_policies_v1(text,text,text)',
  'public.require_my_current_publication_policy_acceptance_v1(text,text,text)',
  'public.renew_my_listing_activity_v1(text,timestamp with time zone)',
  'public.get_my_marketplace_items_v2(integer,integer,text,text,uuid)',
  'storage.allow_only_operation(text)'] LOOP
  IF to_regprocedure(item) IS NULL THEN
   RAISE EXCEPTION 'hosted_release_existing_function_required: %',item USING ERRCODE='55000';
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.listings'::regclass
  AND NOT attisdropped AND attname IN('price_kind','currency','price_revision')) THEN
  RAISE EXCEPTION 'hosted_release_price_fields_already_exist' USING ERRCODE='55000';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.listings'::regclass
  AND attname='id' AND atttypid='bigint'::regtype AND attidentity IN('a','d')) THEN
  RAISE EXCEPTION 'hosted_release_existing_listing_identity_required' USING ERRCODE='55000';
 END IF;
 FOREACH item IN ARRAY ARRAY['public.listings','public.listing_images','public.profiles','public.identities',
  'public.conversations','public.messages','public.conversation_participants'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item) AND relrowsecurity) THEN
   RAISE EXCEPTION 'hosted_release_existing_rls_required: %',item USING ERRCODE='55000';
  END IF;
 END LOOP;
 -- Read witnesses do not grant privileges on managed Storage tables. Fail here
 -- before DDL if the existing trusted schema role cannot read the exact columns.
 IF NOT has_schema_privilege('postgres','storage','USAGE')
  OR NOT has_column_privilege('postgres','storage.objects','version','SELECT')
  OR NOT has_column_privilege('postgres','storage.s3_multipart_uploads','version','SELECT')
  OR NOT has_column_privilege('postgres','storage.s3_multipart_uploads_parts','etag','SELECT') THEN
  RAISE EXCEPTION 'hosted_release_existing_storage_read_privilege_required' USING ERRCODE='55000';
 END IF;
END $preconditions$;

-- Validate the complete minimal Storage column contract without querying rows.
DO $columns$ DECLARE r record; BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('storage.objects','id','uuid'),('storage.objects','bucket_id','text'),('storage.objects','name','text'),('storage.objects','version','text'),
  ('storage.s3_multipart_uploads','id','text'),('storage.s3_multipart_uploads','bucket_id','text'),
  ('storage.s3_multipart_uploads','key','text'),('storage.s3_multipart_uploads','version','text'),
  ('storage.s3_multipart_uploads_parts','upload_id','text'),('storage.s3_multipart_uploads_parts','bucket_id','text'),
  ('storage.s3_multipart_uploads_parts','key','text'),('storage.s3_multipart_uploads_parts','version','text'),
  ('storage.s3_multipart_uploads_parts','part_number','integer'),('storage.s3_multipart_uploads_parts','etag','text'),
  ('storage.s3_multipart_uploads_parts','size','bigint'),('storage.s3_multipart_uploads_parts','created_at','timestamp with time zone')
 ) AS expected(relation_name,column_name,type_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass(r.relation_name)
   AND attname=r.column_name AND NOT attisdropped AND atttypid=to_regtype(r.type_name)) THEN
   RAISE EXCEPTION 'hosted_release_column_contract: %.% %',r.relation_name,r.column_name,r.type_name USING ERRCODE='55000';
  END IF;
 END LOOP;
END $columns$;

DO $new_function_collisions$ DECLARE conflict text; BEGIN
 SELECT p.oid::regprocedure::text INTO conflict FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['cancel_my_listing_publication_journey_v2','cancel_my_listing_publication_v1','claim_listing_cleanup_for_attempt_v2','claim_listing_cleanup_v1','claim_listing_multipart_complete_v2','claim_listing_multipart_part_v2','claim_listing_upload_sign_v1','claim_listing_web_image_v1','claim_listing_write_reconcile_v1','confirm_listing_upload_release_v1','contact_my_listing_seller_v1','delete_my_published_listing_v1','get_listing_multipart_v2','get_my_listing_basics_v1','get_my_listing_cleanup_summary_v1','get_my_listing_conversation_v1','get_my_listing_edit_v1','get_my_listing_media_binding_v2','get_my_listing_publication_confirmation_v1','get_my_listing_publication_journey_v2','get_my_listing_publication_v1','get_my_listing_upload_grant_v1','get_my_listing_web_ready_v1','get_my_managed_listing_v2','get_my_marketplace_items_v3','get_public_listing_detail_v1','get_public_listing_media_binding_v1','get_public_profile_listings_v1','get_public_profile_services_v1','get_public_profile_showcases_v1','get_selqiro_hosted_preview_readiness_v1','guard_listing_price_v2','horse_owner_price_read_v1','list_my_listing_conversations_v1','listing_actor_uid_hosted_v1','listing_basics_search_text_v1','listing_basics_snapshot_v1','listing_basics_values_v1','listing_contact_is_managed_v1','listing_contact_visible_v1','listing_create_category_path_valid_v1','listing_final_guard_state_v1','listing_price_currency_scale_v1','listing_price_legacy_label_v1','listing_price_read_model_v1','listing_price_snapshot_v1','listing_price_tuple_valid_v1','listing_source_part_allowed_hosted_v1','lock_listing_creation_actor_v1','lock_my_listing_basics_v1','normalize_listing_basics_v1','normalize_listing_create_location_v1','normalize_listing_creation_v1','normalize_listing_price_v1','prepare_listing_multipart_cleanup_v2','prepare_listing_web_write_v1','prepare_my_listing_publication_v1','project_horse_wanted_owner_summary_v2','public_listing_detail_field_spec_v1','public_listing_detail_values_v1','publish_my_listing_v1','purge_listing_upload_token_one_v1','record_listing_cleanup_v1','record_listing_multipart_abort_v2','record_listing_multipart_completed_v2','record_listing_multipart_created_v2','record_listing_multipart_problem_v2','record_listing_multipart_verified_v2','record_listing_upload_grant_v1','record_listing_web_ready_v1','record_listing_web_write_completed_v1','record_listing_write_reconcile_v1','renew_my_managed_listing_activity_v2','require_listing_create_keys_v1','reserve_listing_multipart_v2','reserve_my_listing_upload_v1','save_my_listing_basics_v1','save_my_listing_edit_v1','search_public_listings_v2','send_my_listing_message_v1','set_my_listing_price_core_v1','set_my_managed_listing_status_v2','settle_recorded_unreleased_source_one_v1','settle_unreleased_listing_source_one_v1']) LIMIT 1;
 IF conflict IS NOT NULL THEN RAISE EXCEPTION 'hosted_release_existing_function: %',conflict USING ERRCODE='55000'; END IF;
END $new_function_collisions$;


-- The managed Auth schema gives postgres USAGE without grant option. Preserve
-- that boundary: this narrow wrapper returns the unchanged caller auth.uid()
-- under the existing postgres access. It never accepts an impersonation input.
CREATE FUNCTION public.listing_actor_uid_hosted_v1() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT auth.uid();
$f$;
REVOKE ALL ON FUNCTION public.listing_actor_uid_hosted_v1() FROM PUBLIC,anon,authenticated,service_role;

CREATE SCHEMA listing_publication_private;
REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_publication_private REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE listing_publication_private.hosted_preview_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 project_ref text NOT NULL CHECK(project_ref ~ '^[a-z]{20}$'),
 release_id text NOT NULL CHECK(release_id='listing-publication-hosted-preview-v1'),
 instance_id uuid NOT NULL UNIQUE CHECK(instance_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 enabled boolean NOT NULL DEFAULT false,
 release_ready boolean NOT NULL DEFAULT false,
 storage_authority_version text CHECK(storage_authority_version='source-part-rfc3986-v1'),
 installed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(NOT enabled OR (release_ready AND storage_authority_version IS NOT DISTINCT FROM 'source-part-rfc3986-v1'))
);
CREATE TABLE listing_publication_private.hosted_preview_actors (
 actor_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
 added_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.hosted_preview_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.hosted_preview_actors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.hosted_preview_settings,listing_publication_private.hosted_preview_actors
 FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO listing_publication_private.hosted_preview_settings(singleton,project_ref,release_id,instance_id)
 VALUES(true,current_setting('selqiro.hosted_preview_project_ref'),'listing-publication-hosted-preview-v1',
        current_setting('selqiro.hosted_preview_instance_id')::uuid);

CREATE FUNCTION listing_publication_private.assert_hosted_install_context() RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'postgres' OR NOT EXISTS(
  SELECT 1 FROM listing_publication_private.hosted_preview_settings
  WHERE singleton AND project_ref=current_setting('selqiro.hosted_preview_project_ref',true)
   AND instance_id::text=current_setting('selqiro.hosted_preview_instance_id',true)
   AND release_id='listing-publication-hosted-preview-v1' AND NOT enabled AND NOT release_ready) THEN
  RAISE EXCEPTION 'hosted_release_install_context_mismatch' USING ERRCODE='55000';
 END IF;
END $f$;

-- Read only. The bucket is provisioned separately via the provider API; a SQL
-- marker cannot stand in for the real private bucket and its accepted limits.
CREATE FUNCTION listing_publication_private.hosted_storage_contract_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM storage.buckets b WHERE b.id='listing-publication-private'
  AND b.public IS FALSE AND b.file_size_limit=26214400
  AND cardinality(b.allowed_mime_types)=2
  AND b.allowed_mime_types @> ARRAY['application/octet-stream','image/webp']::text[]
  AND b.allowed_mime_types <@ ARRAY['application/octet-stream','image/webp']::text[]);
$f$;

CREATE FUNCTION listing_publication_private.assert_hosted_preview_actor(p_actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE config listing_publication_private.hosted_preview_settings%ROWTYPE;
BEGIN
 -- Shared locks serialize disabling/removing an actor with accepted DB writes.
 -- No network/storage request is made while these transaction locks are held.
 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton FOR SHARE;
 IF NOT FOUND OR NOT config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM 'source-part-rfc3986-v1'
  OR NOT listing_publication_private.hosted_storage_contract_ready() THEN
  RAISE EXCEPTION 'publication_hosted_preview_disabled' USING ERRCODE='55000';
 END IF;
 IF p_actor IS NULL THEN RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501'; END IF;
END $f$;

-- PL/pgSQL resolves the ledger relation at first call, after 20_publication_core.
CREATE FUNCTION listing_publication_private.assert_hosted_preview_object(p_object uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE actor uuid;
BEGIN
 SELECT a.actor_user_id INTO actor FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id WHERE o.id=p_object;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_multipart_object_unavailable' USING ERRCODE='P0002'; END IF;
 PERFORM listing_publication_private.assert_hosted_preview_actor(actor);
END $f$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;


-- COMPONENT 10_price_core.sql
-- GENERATED by scripts/hosted/compose_publication_release.py; review source-provenance.json.

SELECT listing_publication_private.assert_hosted_install_context();

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.listing_price_currency_scale_v1(p_currency text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_currency
    WHEN 'AED' THEN 2
    WHEN 'AFN' THEN 2
    WHEN 'ALL' THEN 2
    WHEN 'AMD' THEN 2
    WHEN 'AOA' THEN 2
    WHEN 'ARS' THEN 2
    WHEN 'AUD' THEN 2
    WHEN 'AWG' THEN 2
    WHEN 'AZN' THEN 2
    WHEN 'BAM' THEN 2
    WHEN 'BBD' THEN 2
    WHEN 'BDT' THEN 2
    WHEN 'BHD' THEN 3
    WHEN 'BIF' THEN 0
    WHEN 'BMD' THEN 2
    WHEN 'BND' THEN 2
    WHEN 'BOB' THEN 2
    WHEN 'BRL' THEN 2
    WHEN 'BSD' THEN 2
    WHEN 'BTN' THEN 2
    WHEN 'BWP' THEN 2
    WHEN 'BYN' THEN 2
    WHEN 'BZD' THEN 2
    WHEN 'CAD' THEN 2
    WHEN 'CDF' THEN 2
    WHEN 'CHF' THEN 2
    WHEN 'CLP' THEN 0
    WHEN 'CNY' THEN 2
    WHEN 'COP' THEN 2
    WHEN 'CRC' THEN 2
    WHEN 'CUP' THEN 2
    WHEN 'CVE' THEN 2
    WHEN 'CZK' THEN 2
    WHEN 'DJF' THEN 0
    WHEN 'DKK' THEN 2
    WHEN 'DOP' THEN 2
    WHEN 'DZD' THEN 2
    WHEN 'EGP' THEN 2
    WHEN 'ERN' THEN 2
    WHEN 'ETB' THEN 2
    WHEN 'EUR' THEN 2
    WHEN 'FJD' THEN 2
    WHEN 'FKP' THEN 2
    WHEN 'GBP' THEN 2
    WHEN 'GEL' THEN 2
    WHEN 'GHS' THEN 2
    WHEN 'GIP' THEN 2
    WHEN 'GMD' THEN 2
    WHEN 'GNF' THEN 0
    WHEN 'GTQ' THEN 2
    WHEN 'GYD' THEN 2
    WHEN 'HKD' THEN 2
    WHEN 'HNL' THEN 2
    WHEN 'HTG' THEN 2
    WHEN 'HUF' THEN 2
    WHEN 'IDR' THEN 2
    WHEN 'ILS' THEN 2
    WHEN 'INR' THEN 2
    WHEN 'IQD' THEN 3
    WHEN 'IRR' THEN 2
    WHEN 'ISK' THEN 0
    WHEN 'JMD' THEN 2
    WHEN 'JOD' THEN 3
    WHEN 'JPY' THEN 0
    WHEN 'KES' THEN 2
    WHEN 'KGS' THEN 2
    WHEN 'KHR' THEN 2
    WHEN 'KMF' THEN 0
    WHEN 'KPW' THEN 2
    WHEN 'KRW' THEN 0
    WHEN 'KWD' THEN 3
    WHEN 'KYD' THEN 2
    WHEN 'KZT' THEN 2
    WHEN 'LAK' THEN 2
    WHEN 'LBP' THEN 2
    WHEN 'LKR' THEN 2
    WHEN 'LRD' THEN 2
    WHEN 'LSL' THEN 2
    WHEN 'LYD' THEN 3
    WHEN 'MAD' THEN 2
    WHEN 'MDL' THEN 2
    WHEN 'MGA' THEN 2
    WHEN 'MKD' THEN 2
    WHEN 'MMK' THEN 2
    WHEN 'MNT' THEN 2
    WHEN 'MOP' THEN 2
    WHEN 'MRU' THEN 2
    WHEN 'MUR' THEN 2
    WHEN 'MVR' THEN 2
    WHEN 'MWK' THEN 2
    WHEN 'MXN' THEN 2
    WHEN 'MYR' THEN 2
    WHEN 'MZN' THEN 2
    WHEN 'NAD' THEN 2
    WHEN 'NGN' THEN 2
    WHEN 'NIO' THEN 2
    WHEN 'NOK' THEN 2
    WHEN 'NPR' THEN 2
    WHEN 'NZD' THEN 2
    WHEN 'OMR' THEN 3
    WHEN 'PAB' THEN 2
    WHEN 'PEN' THEN 2
    WHEN 'PGK' THEN 2
    WHEN 'PHP' THEN 2
    WHEN 'PKR' THEN 2
    WHEN 'PLN' THEN 2
    WHEN 'PYG' THEN 0
    WHEN 'QAR' THEN 2
    WHEN 'RON' THEN 2
    WHEN 'RSD' THEN 2
    WHEN 'RUB' THEN 2
    WHEN 'RWF' THEN 0
    WHEN 'SAR' THEN 2
    WHEN 'SBD' THEN 2
    WHEN 'SCR' THEN 2
    WHEN 'SDG' THEN 2
    WHEN 'SEK' THEN 2
    WHEN 'SGD' THEN 2
    WHEN 'SHP' THEN 2
    WHEN 'SLE' THEN 2
    WHEN 'SOS' THEN 2
    WHEN 'SRD' THEN 2
    WHEN 'SSP' THEN 2
    WHEN 'STN' THEN 2
    WHEN 'SVC' THEN 2
    WHEN 'SYP' THEN 2
    WHEN 'SZL' THEN 2
    WHEN 'THB' THEN 2
    WHEN 'TJS' THEN 2
    WHEN 'TMT' THEN 2
    WHEN 'TND' THEN 3
    WHEN 'TOP' THEN 2
    WHEN 'TRY' THEN 2
    WHEN 'TTD' THEN 2
    WHEN 'TWD' THEN 2
    WHEN 'TZS' THEN 2
    WHEN 'UAH' THEN 2
    WHEN 'UGX' THEN 0
    WHEN 'USD' THEN 2
    WHEN 'UYU' THEN 2
    WHEN 'UZS' THEN 2
    WHEN 'VES' THEN 2
    WHEN 'VND' THEN 0
    WHEN 'VUV' THEN 0
    WHEN 'WST' THEN 2
    WHEN 'XAF' THEN 0
    WHEN 'XCD' THEN 2
    WHEN 'XCG' THEN 2
    WHEN 'XOF' THEN 0
    WHEN 'XPF' THEN 0
    WHEN 'YER' THEN 2
    WHEN 'ZAR' THEN 2
    WHEN 'ZMW' THEN 2
    WHEN 'ZWG' THEN 2
    ELSE NULL END;
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.normalize_listing_price_v1(p_price jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE k text; a text; c text; digits integer;
BEGIN
  IF p_price IS NULL OR jsonb_typeof(p_price) IS DISTINCT FROM 'object'
     OR octet_length(p_price::text) > 256 THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_price) AS keys(key))
      IS DISTINCT FROM ARRAY['amount','currency','kind']::text[]
      OR jsonb_typeof(p_price->'kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  k := p_price->>'kind';
  IF k NOT IN ('fixed','free','negotiable','unspecified') THEN
    RAISE EXCEPTION 'listing_price_kind_invalid' USING ERRCODE='22023';
  END IF;
  IF k <> 'fixed' THEN
    IF p_price->'amount' IS DISTINCT FROM 'null'::jsonb
       OR p_price->'currency' IS DISTINCT FROM 'null'::jsonb THEN
      RAISE EXCEPTION 'listing_price_nonfixed_values_forbidden' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('kind',k,'amount',NULL,'currency',NULL);
  END IF;
  IF jsonb_typeof(p_price->'amount') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_price->'currency') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_string_values_required' USING ERRCODE='22023';
  END IF;
  a := p_price->>'amount'; c := p_price->>'currency';
  digits := public.listing_price_currency_scale_v1(c);
  IF digits IS NULL THEN
    RAISE EXCEPTION 'listing_price_currency_unsupported' USING ERRCODE='22023';
  END IF;
  -- ASCII, no exponent/grouping/sign, < 10^18 units. Reject rather than round.
  IF char_length(a) > 22 OR a !~ '^(0|[1-9][0-9]{0,17})([.][0-9]{1,3})?$'
      OR (position('.' IN a)>0 AND char_length(split_part(a,'.',2))>digits) THEN
    RAISE EXCEPTION 'listing_price_amount_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('kind',k,'amount',trim_scale(a::numeric)::text,'currency',c);
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.normalize_listing_basics_v1(p_basics jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
DECLARE t text; d text; c text;
BEGIN
  IF p_basics IS NULL OR jsonb_typeof(p_basics) IS DISTINCT FROM 'object'
      OR octet_length(p_basics::text)>24000 THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
      OR jsonb_typeof(p_basics->'title') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(p_basics->'condition') NOT IN ('null','string') THEN
    RAISE EXCEPTION 'listing_basics_shape_invalid' USING ERRCODE='22023';
  END IF;
  -- Explicit ASCII whitespace contract, independent of client locale.
  t := btrim(regexp_replace(p_basics->>'title',E'[ \\t\\n\\r\\f\\v]+',' ','g'));
  d := btrim(p_basics->>'description',E' \t\n\r\f\013');
  c := p_basics->>'condition';
  IF char_length(t)<2 OR char_length(t)>140 OR char_length(p_basics->>'title')>1024 THEN
    RAISE EXCEPTION 'listing_basics_title_invalid' USING ERRCODE='22023';
  END IF;
  IF char_length(p_basics->>'description')>5000 THEN
    RAISE EXCEPTION 'listing_basics_description_invalid' USING ERRCODE='22023';
  END IF;
  IF c IS NOT NULL AND c NOT IN ('new','used','damaged') THEN
    RAISE EXCEPTION 'listing_basics_condition_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('title',t,'description',d,'condition',c);
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.listing_create_category_path_valid_v1(p_path jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path=pg_catalog,pg_temp
AS $fn$
 SELECT p_path = ANY(ARRAY[
    '["vehicles"]'::jsonb,
    '["vehicles","cars"]'::jsonb,
    '["vehicles","cars","passenger_cars"]'::jsonb,
    '["vehicles","cars","suv_offroad"]'::jsonb,
    '["vehicles","cars","vans_minibuses"]'::jsonb,
    '["vehicles","cars","pickup_trucks"]'::jsonb,
    '["vehicles","cars","motorhomes_campers"]'::jsonb,
    '["vehicles","cars","racing_vehicles"]'::jsonb,
    '["vehicles","motorcycles"]'::jsonb,
    '["vehicles","motorcycles","sport_bikes"]'::jsonb,
    '["vehicles","motorcycles","cruisers"]'::jsonb,
    '["vehicles","motorcycles","touring"]'::jsonb,
    '["vehicles","motorcycles","enduro_mx"]'::jsonb,
    '["vehicles","motorcycles","scooters"]'::jsonb,
    '["vehicles","motorcycles","atv_utv"]'::jsonb,
    '["vehicles","motorcycles","snowmobiles"]'::jsonb,
    '["vehicles","trucks_commercial"]'::jsonb,
    '["vehicles","trucks_commercial","trucks"]'::jsonb,
    '["vehicles","trucks_commercial","semi_trucks"]'::jsonb,
    '["vehicles","trucks_commercial","buses"]'::jsonb,
    '["vehicles","trucks_commercial","commercial_trailers"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","tractors"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","harvesters"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","excavators"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","forestry_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","construction_machinery"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","agricultural_attachments_implements"]'::jsonb,
    '["vehicles","agricultural_heavy_machinery","agricultural_heavy_machinery_spare_parts"]'::jsonb,
    '["vehicles","marine"]'::jsonb,
    '["vehicles","marine","boats"]'::jsonb,
    '["vehicles","marine","yachts"]'::jsonb,
    '["vehicles","marine","jet_skis"]'::jsonb,
    '["vehicles","marine","boat_trailers"]'::jsonb,
    '["vehicles","marine","outboard_motors"]'::jsonb,
    '["vehicles","aviation"]'::jsonb,
    '["vehicles","aviation","airplanes"]'::jsonb,
    '["vehicles","aviation","helicopters"]'::jsonb,
    '["vehicles","aviation","ultralights"]'::jsonb,
    '["vehicles","aviation","drones"]'::jsonb,
    '["vehicles","aviation","aircraft_parts"]'::jsonb,
    '["vehicles","trailers"]'::jsonb,
    '["vehicles","trailers","light_trailers"]'::jsonb,
    '["vehicles","trailers","car_trailers"]'::jsonb,
    '["vehicles","trailers","cargo_trailers"]'::jsonb,
    '["vehicles","trailers","caravans"]'::jsonb,
    '["vehicles","trailers","horse_livestock_trailers"]'::jsonb,
    '["vehicles","vehicle_parts"]'::jsonb,
    '["vehicles","vehicle_parts","engines_engine_parts"]'::jsonb,
    '["vehicles","vehicle_parts","transmission_drivetrain"]'::jsonb,
    '["vehicles","vehicle_parts","suspension_steering"]'::jsonb,
    '["vehicles","vehicle_parts","brakes"]'::jsonb,
    '["vehicles","vehicle_parts","electrical_parts"]'::jsonb,
    '["vehicles","vehicle_parts","batteries"]'::jsonb,
    '["vehicles","vehicle_parts","starters_alternators"]'::jsonb,
    '["vehicles","vehicle_parts","body_parts"]'::jsonb,
    '["vehicles","vehicle_parts","lights_lamps"]'::jsonb,
    '["vehicles","vehicle_parts","interior_parts"]'::jsonb,
    '["vehicles","vehicle_parts","exhaust_parts"]'::jsonb,
    '["vehicles","vehicle_parts","cooling_heating"]'::jsonb,
    '["vehicles","vehicle_parts","fuel_system"]'::jsonb,
    '["vehicles","vehicle_parts","tires"]'::jsonb,
    '["vehicles","vehicle_parts","wheels_rims"]'::jsonb,
    '["vehicles","vehicle_parts","accessories"]'::jsonb,
    '["vehicles","vehicle_parts","riding_racing_gear"]'::jsonb,
    '["vehicles","vehicle_parts","spare_parts"]'::jsonb,
    '["vehicles","vehicle_parts","vehicle_for_parts"]'::jsonb,
    '["electronics"]'::jsonb,
    '["electronics","phones"]'::jsonb,
    '["electronics","computers"]'::jsonb,
    '["electronics","tv_audio"]'::jsonb,
    '["electronics","cameras"]'::jsonb,
    '["electronics","gaming"]'::jsonb,
    '["electronics","smart_home"]'::jsonb,
    '["electronics","components"]'::jsonb,
    '["electronics","electronics_accessories"]'::jsonb,
    '["electronics","other_electronics"]'::jsonb,
    '["real_estate"]'::jsonb,
    '["real_estate","apartments"]'::jsonb,
    '["real_estate","houses"]'::jsonb,
    '["real_estate","land"]'::jsonb,
    '["real_estate","commercial_property"]'::jsonb,
    '["real_estate","garages"]'::jsonb,
    '["real_estate","vacation_property"]'::jsonb,
    '["clothing_fashion"]'::jsonb,
    '["clothing_fashion","men"]'::jsonb,
    '["clothing_fashion","women"]'::jsonb,
    '["clothing_fashion","kids"]'::jsonb,
    '["clothing_fashion","workwear"]'::jsonb,
    '["clothing_fashion","shoes"]'::jsonb,
    '["clothing_fashion","watches"]'::jsonb,
    '["clothing_fashion","bags"]'::jsonb,
    '["clothing_fashion","jewelry"]'::jsonb,
    '["clothing_fashion","other_clothing_fashion"]'::jsonb,
    '["tools_industrial"]'::jsonb,
    '["tools_industrial","power_tools"]'::jsonb,
    '["tools_industrial","hand_tools"]'::jsonb,
    '["tools_industrial","workshop_equipment"]'::jsonb,
    '["tools_industrial","industrial_equipment"]'::jsonb,
    '["tools_industrial","safety_equipment"]'::jsonb,
    '["tools_industrial","other_tools_industrial"]'::jsonb,
    '["home_garden"]'::jsonb,
    '["home_garden","furniture"]'::jsonb,
    '["home_garden","appliances"]'::jsonb,
    '["home_garden","garden_tools"]'::jsonb,
    '["home_garden","plants_seedlings"]'::jsonb,
    '["home_garden","seeds"]'::jsonb,
    '["home_garden","crops_produce"]'::jsonb,
    '["home_garden","farm_supplies"]'::jsonb,
    '["home_garden","animal_feed"]'::jsonb,
    '["home_garden","greenhouses"]'::jsonb,
    '["home_garden","decor"]'::jsonb,
    '["home_garden","lighting"]'::jsonb,
    '["home_garden","kitchenware"]'::jsonb,
    '["home_garden","home_textiles"]'::jsonb,
    '["home_garden","household_supplies"]'::jsonb,
    '["home_garden","bathroom"]'::jsonb,
    '["home_garden","heating_fuels"]'::jsonb,
    '["home_garden","heating_equipment"]'::jsonb,
    '["home_garden","outdoor_furniture"]'::jsonb,
    '["home_garden","other_home_garden"]'::jsonb,
    '["sports_outdoor"]'::jsonb,
    '["sports_outdoor","gym_equipment"]'::jsonb,
    '["sports_outdoor","bicycles"]'::jsonb,
    '["sports_outdoor","winter_sports"]'::jsonb,
    '["sports_outdoor","camping"]'::jsonb,
    '["sports_outdoor","fishing"]'::jsonb,
    '["sports_outdoor","other_sports_outdoor"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","saddles_accessories"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","bridles_halters_tack"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","rider_clothing_safety"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","horse_blankets_textiles"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","horse_grooming_care"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","stable_paddock_equipment"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","driving_carriage_equipment"]'::jsonb,
    '["sports_outdoor","equestrian_horse_supplies","other_equestrian_supplies"]'::jsonb,
    '["antiques_collectibles"]'::jsonb,
    '["antiques_collectibles","art"]'::jsonb,
    '["antiques_collectibles","vintage"]'::jsonb,
    '["antiques_collectibles","coins"]'::jsonb,
    '["antiques_collectibles","military"]'::jsonb,
    '["antiques_collectibles","memorabilia"]'::jsonb,
    '["antiques_collectibles","other_antiques_collectibles"]'::jsonb,
    '["building_materials"]'::jsonb,
    '["building_materials","lumber"]'::jsonb,
    '["building_materials","concrete"]'::jsonb,
    '["building_materials","insulation"]'::jsonb,
    '["building_materials","roofing"]'::jsonb,
    '["building_materials","plumbing"]'::jsonb,
    '["building_materials","other_building_materials"]'::jsonb,
    '["children_baby"]'::jsonb,
    '["children_baby","strollers_prams"]'::jsonb,
    '["children_baby","child_car_seats"]'::jsonb,
    '["children_baby","nursery_furniture"]'::jsonb,
    '["children_baby","baby_feeding_care"]'::jsonb,
    '["children_baby","baby_safety_accessories"]'::jsonb,
    '["children_baby","other_children_baby"]'::jsonb,
    '["pet_supplies"]'::jsonb,
    '["pet_supplies","dog_supplies"]'::jsonb,
    '["pet_supplies","cat_supplies"]'::jsonb,
    '["pet_supplies","aquariums_terrariums"]'::jsonb,
    '["pet_supplies","cages_housing"]'::jsonb,
    '["pet_supplies","pet_transport_grooming"]'::jsonb,
    '["pet_supplies","other_pet_supplies"]'::jsonb,
    '["books_music_media"]'::jsonb,
    '["books_music_media","books"]'::jsonb,
    '["books_music_media","magazines_comics"]'::jsonb,
    '["books_music_media","music_movies"]'::jsonb,
    '["books_music_media","musical_instruments"]'::jsonb,
    '["books_music_media","instrument_accessories"]'::jsonb,
    '["books_music_media","other_books_media"]'::jsonb,
    '["hobbies_toys_crafts"]'::jsonb,
    '["hobbies_toys_crafts","toys"]'::jsonb,
    '["hobbies_toys_crafts","board_games_puzzles"]'::jsonb,
    '["hobbies_toys_crafts","arts_crafts"]'::jsonb,
    '["hobbies_toys_crafts","model_rc_hobbies"]'::jsonb,
    '["hobbies_toys_crafts","sewing_knitting"]'::jsonb,
    '["hobbies_toys_crafts","other_hobbies_toys"]'::jsonb,
    '["office_business"]'::jsonb,
    '["office_business","office_equipment"]'::jsonb,
    '["office_business","printers_scanners"]'::jsonb,
    '["office_business","office_furniture"]'::jsonb,
    '["office_business","retail_warehouse_equipment"]'::jsonb,
    '["office_business","presentation_equipment"]'::jsonb,
    '["office_business","other_office_business"]'::jsonb,
    '["general"]'::jsonb
 ]::jsonb[]);
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.require_listing_create_keys_v1(p_value jsonb,p_keys text[])
RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp
AS $fn$
BEGIN
 IF p_value IS NULL OR jsonb_typeof(p_value) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_value) k(key))
    IS DISTINCT FROM (SELECT array_agg(key ORDER BY key) FROM unnest(p_keys) k(key)) THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.normalize_listing_create_location_v1(p_value jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE country_value text; city_value text; lat text; lng text;
BEGIN
 PERFORM public.require_listing_create_keys_v1(p_value,ARRAY['country','city','latitude','longitude']);
 IF jsonb_typeof(p_value->'country') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_value->'city') IS DISTINCT FROM 'string'
    OR char_length(p_value->>'country')>120 OR char_length(p_value->>'city')>160 THEN
  RAISE EXCEPTION 'listing_create_location_invalid' USING ERRCODE='22023';
 END IF;
 country_value:=btrim(p_value->>'country'); city_value:=btrim(p_value->>'city');
 lat:=p_value->>'latitude'; lng:=p_value->>'longitude';
 IF (lat IS NULL) IS DISTINCT FROM (lng IS NULL) THEN
  RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
 END IF;
 IF lat IS NOT NULL THEN
  IF jsonb_typeof(p_value->'latitude') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_value->'longitude') IS DISTINCT FROM 'string'
     OR char_length(lat)>12 OR char_length(lng)>12
     OR lat !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$'
     OR lng !~ '^-?(0|[1-9][0-9]{0,2})([.][0-9]{1,7})?$' THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  IF abs(lat::numeric)>90 OR abs(lng::numeric)>180 THEN
   RAISE EXCEPTION 'listing_create_coordinates_invalid' USING ERRCODE='22023';
  END IF;
  lat:=trim_scale(lat::numeric)::text; lng:=trim_scale(lng::numeric)::text;
 END IF;
 RETURN jsonb_build_object('country',country_value,'city',city_value,'latitude',lat,'longitude',lng);
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.normalize_listing_creation_v1(p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE basics_value jsonb; price_value jsonb; location_value jsonb; attrs jsonb:='{}';
  e record; lang text;
BEGIN
 IF p_input IS NULL OR octet_length(p_input::text)>65536 THEN
  RAISE EXCEPTION 'listing_create_shape_invalid' USING ERRCODE='22023';
 END IF;
 PERFORM public.require_listing_create_keys_v1(p_input,
   ARRAY['basics','price','category_path','location','attributes','details','language']);
 basics_value:=public.normalize_listing_basics_v1(p_input->'basics');
 IF basics_value->>'description'='' OR basics_value->>'condition' IS NULL THEN
  RAISE EXCEPTION 'listing_create_basics_required' USING ERRCODE='22023';
 END IF;
 price_value:=public.normalize_listing_price_v1(p_input->'price');
 IF public.listing_create_category_path_valid_v1(p_input->'category_path') IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_create_category_invalid' USING ERRCODE='22023';
 END IF;
 location_value:=public.normalize_listing_create_location_v1(p_input->'location');
 PERFORM public.require_listing_create_keys_v1(p_input->'attributes',
  ARRAY['manufacturer','part_number','oem_number','vehicle_brand','vehicle_model','vehicle_year','engine']);
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'attributes') LOOP
  IF jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>
      (CASE WHEN e.key='vehicle_year' THEN 20 ELSE 160 END) THEN
   RAISE EXCEPTION 'listing_create_attributes_invalid' USING ERRCODE='22023';
  END IF;
  attrs:=attrs||jsonb_build_object(e.key,btrim(e.value #>> '{}'));
 END LOOP;
 IF jsonb_typeof(p_input->'details') IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_input->'details'))>64 THEN
  RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
 END IF;
 FOR e IN SELECT key,value FROM jsonb_each(p_input->'details') LOOP
  IF e.key !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' OR e.key IN
    ('constructor','prototype','detailCategory','manufacturer','partNumber','oemNumber',
     'vehicleBrand','vehicleModel','vehicleYear','engine')
     OR jsonb_typeof(e.value) IS DISTINCT FROM 'string' OR char_length(e.value #>> '{}')>1000 THEN
   RAISE EXCEPTION 'listing_create_details_invalid' USING ERRCODE='22023';
  END IF;
 END LOOP;
 IF jsonb_typeof(p_input->'language') IS DISTINCT FROM 'string' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 lang:=lower(btrim(p_input->>'language'));
 IF char_length(p_input->>'language')>35 OR lang !~ '^[a-z]{2,3}(-[a-z0-9]{2,8}){0,3}$' THEN
  RAISE EXCEPTION 'listing_create_language_invalid' USING ERRCODE='22023';
 END IF;
 -- Versioned canonical form. Preserve detail text; no translation or unit conversion.
 RETURN jsonb_build_object('version',1,'basics',basics_value,'price',price_value,
  'category_path',p_input->'category_path','location',location_value,'attributes',attrs,
  'details',p_input->'details','language',lang);
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql
CREATE FUNCTION public.lock_listing_creation_actor_v1(p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,auth,pg_temp
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1(); active_id uuid; identity_row public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.assert_hosted_preview_actor(actor);
 IF actor IS NULL OR p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;
 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
    AND m.user_id=actor AND m.status='active' FOR SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN active_id;
END $fn$;

-- Existing rows retain their raw price. No historical row is rewritten.
ALTER TABLE public.listings ADD COLUMN price_kind text, ADD COLUMN currency text,
 ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;
CREATE ROLE selqiro_listing_price_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
 NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- PG17 grants the nonsuperuser creator ADMIN with the bootstrap grantor.
-- Preserve that provenance; add only SET/INHERIT in this installer's grant.
GRANT selqiro_listing_price_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;


-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_price_legacy_label_v1(p_price jsonb)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_price->>'kind'
    WHEN 'fixed' THEN (p_price->>'amount') || ' ' || (p_price->>'currency')
    WHEN 'free' THEN 'Tasuta'
    WHEN 'negotiable' THEN 'Hind kokkuleppel'
    WHEN 'unspecified' THEN NULL END;
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_price_tuple_valid_v1(k text,a numeric,c text,r bigint,legacy text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb;
BEGIN
  IF r IS NULL OR r < 0 THEN RETURN false; END IF;
  IF k IS NULL THEN RETURN c IS NULL; END IF;
  IF r < 1 THEN RETURN false; END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',k,'amount',a::text,'currency',c));
  RETURN legacy IS NOT DISTINCT FROM public.listing_price_legacy_label_v1(normalized)
     AND a::text IS NOT DISTINCT FROM normalized->>'amount';
EXCEPTION WHEN SQLSTATE '22023' THEN RETURN false;
END $fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_price_snapshot_v1(k text,a numeric,c text,r bigint,legacy text)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog
AS $fn$
  SELECT jsonb_build_object('version',1,'kind',k,'amount',CASE WHEN k IS NULL THEN NULL ELSE a::text END,
    'currency',c,'revision',r::text,'legacy_text',CASE WHEN k IS NULL THEN legacy ELSE NULL END);
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_basics_values_v1(p_row public.listings)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT jsonb_build_object('title',(p_row).title,'description',(p_row).description,'condition',(p_row).condition);
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_basics_snapshot_v1(p_row public.listings)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
  SELECT jsonb_build_object('schema_version',1,'content_type','listing',
    'listing_id',(p_row).id::text,'identity_id',(p_row).identity_id::text,
    'basics',public.listing_basics_values_v1(p_row),
    'price',public.listing_price_snapshot_v1((p_row).price_kind,(p_row).price_amount,
      (p_row).currency,(p_row).price_revision,(p_row).price));
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.listing_basics_search_text_v1(p_row public.listings)
RETURNS text LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
  SELECT btrim(regexp_replace(lower(concat_ws(' ',(p_row).title,(p_row).description,
    (p_row).category,(p_row).subcategory,(p_row).condition,
    CASE WHEN jsonb_typeof((p_row).details)='object' THEN
      (SELECT string_agg(value,' ' ORDER BY key) FROM jsonb_each_text((p_row).details))
    ELSE '' END)),E'[ \\t\\n\\r\\f\\v]+',' ','g'));
$fn$;

-- Retained declaration source: supabase/labs/listing-publication-final-v1/tests/fixture-extension.generated.sql
CREATE FUNCTION public.guard_listing_price_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb; changed boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'listing_price_direct_truncate_forbidden' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.price_kind IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_direct_delete_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_revision IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    -- Creation has not switched yet. Old raw-price creation remains possible;
    -- no structured create endpoint is exposed by this existing-listing slice.
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'listing_price_structured_create_not_enabled' USING ERRCODE='42501';
  END IF;
  IF NEW.price_revision IS DISTINCT FROM OLD.price_revision THEN
    RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND NEW.price_kind IS NULL THEN
    RAISE EXCEPTION 'listing_price_downgrade_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND
     ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id)
     IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id) THEN
    RAISE EXCEPTION 'listing_price_owner_tuple_immutable' USING ERRCODE='42501';
  END IF;
  changed := ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
    IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price);
  IF NOT changed THEN RETURN NEW; END IF;
  IF (OLD.price_kind IS NOT NULL OR NEW.price_kind IS NOT NULL)
      AND current_user <> 'selqiro_listing_price_writer_v1' THEN
    RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_revision = 9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_exhausted' USING ERRCODE='54000';
  END IF;
  IF NEW.price_kind IS NULL THEN
    IF NEW.currency IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
    END IF;
    NEW.price_revision := OLD.price_revision + 1;
    RETURN NEW;
  END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',NEW.price_kind,'amount',NEW.price_amount::text,'currency',NEW.currency));
  NEW.price_amount := (normalized->>'amount')::numeric;
  NEW.currency := normalized->>'currency';
  NEW.price := public.listing_price_legacy_label_v1(normalized);
  IF ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
     IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price) THEN
    NEW.price_revision := OLD.price_revision + 1;
  END IF;
  RETURN NEW;
END $fn$;

ALTER TABLE public.listings ADD CONSTRAINT listings_price_tuple_v1_check
 CHECK(public.listing_price_tuple_valid_v1(price_kind,price_amount,currency,price_revision,price) IS TRUE);
CREATE TRIGGER trg_listing_price_guard_v2 BEFORE INSERT OR UPDATE OR DELETE ON public.listings
 FOR EACH ROW EXECUTE FUNCTION public.guard_listing_price_v2();
CREATE TRIGGER trg_listing_price_truncate_guard_v2 BEFORE TRUNCATE ON public.listings
 FOR EACH STATEMENT EXECUTE FUNCTION public.guard_listing_price_v2();


-- COMPONENT 20_publication_core.sql
-- GENERATED by scripts/hosted/compose_publication_release.py; review source-provenance.json.

-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/01_private_state.sql
-- DORMANT CANDIDATE: not a migration. Load only in the NEW isolated test helper.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
-- Private schema bootstrapped by 00_preconditions.sql.
REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE listing_publication_private.attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 payload jsonb,
 policy_snapshot jsonb NOT NULL CHECK(jsonb_typeof(policy_snapshot)='array' AND jsonb_array_length(policy_snapshot)>0),
 state text NOT NULL DEFAULT 'open' CHECK(state IN('open','cancelled','expired')),
 created_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 closed_at timestamptz,
 UNIQUE(actor_user_id,request_key),
 CHECK(expires_at=created_at+interval '24 hours'),
 CHECK((state='open' AND payload IS NOT NULL AND jsonb_typeof(payload)='object' AND closed_at IS NULL)
    OR (state IN('cancelled','expired') AND payload IS NULL AND closed_at IS NOT NULL)),
 CHECK(closed_at IS NULL OR closed_at>=created_at)
);
CREATE INDEX attempts_actor_created ON listing_publication_private.attempts(actor_user_id,created_at);
CREATE INDEX attempts_open_expiry ON listing_publication_private.attempts(expires_at,id) WHERE state='open';
CREATE TABLE listing_publication_private.slots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 ordinal integer NOT NULL CHECK(ordinal BETWEEN 0 AND 9),
 client_file_id uuid NOT NULL CHECK(client_file_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 expected_source_bytes integer NOT NULL CHECK(expected_source_bytes BETWEEN 1 AND 26214400),
 expected_source_sha256 bytea NOT NULL CHECK(octet_length(expected_source_sha256)=32),
 UNIQUE(attempt_id,ordinal), UNIQUE(attempt_id,client_file_id), UNIQUE(id,attempt_id)
);
CREATE TABLE listing_publication_private.objects (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL,
 slot_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN('source','web')),
 bucket_id text NOT NULL CHECK(bucket_id='listing-publication-private'),
 object_path text NOT NULL,
 reserved_bytes integer NOT NULL CHECK(reserved_bytes BETWEEN 1 AND 26214400),
 dispatch_key uuid,
 dispatch_recorded_at timestamptz,
 FOREIGN KEY(slot_id,attempt_id) REFERENCES listing_publication_private.slots(id,attempt_id) ON DELETE RESTRICT,
 UNIQUE(slot_id,kind), UNIQUE(bucket_id,object_path), UNIQUE(attempt_id,dispatch_key),
 CHECK(object_path='v1/'||attempt_id::text||'/'||slot_id::text||
       CASE kind WHEN 'source' THEN '/source.upload' ELSE '/web-v1.webp' END),
 CHECK(reserved_bytes=CASE kind WHEN 'source' THEN 26214400 ELSE 4194304 END),
 CHECK((dispatch_key IS NULL AND dispatch_recorded_at IS NULL) OR
       (kind='source' AND dispatch_key IS NOT NULL AND dispatch_recorded_at IS NOT NULL AND
        dispatch_key<>'00000000-0000-0000-0000-000000000000'::uuid))
);
CREATE INDEX objects_attempt ON listing_publication_private.objects(attempt_id);
-- Exact keys are copied here atomically BEFORE content is erased. No success/TTL guess.
CREATE TABLE listing_publication_private.cleanup (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 bucket_id text NOT NULL CHECK(bucket_id='listing-publication-private'),
 object_path text NOT NULL,
 reason text NOT NULL CHECK(reason IN('cancelled','expired')),
 state text NOT NULL CHECK(state IN('pending','blocked_write_settlement')),
 enqueued_at timestamptz NOT NULL,
 UNIQUE(bucket_id,object_path)
);
ALTER TABLE listing_publication_private.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','payload','closed_at']) OR OLD.state<>'open'
    OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id
    OR c.object_path<>o.object_path OR c.reason<>NEW.state
    OR c.state<>CASE WHEN o.dispatch_key IS NULL THEN 'pending' ELSE 'blocked_write_settlement' END)) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER protect_attempt BEFORE UPDATE OR DELETE ON listing_publication_private.attempts
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_attempt();
CREATE FUNCTION listing_publication_private.protect_slot() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN RAISE EXCEPTION 'publication_slot_immutable' USING ERRCODE='55000'; END $fn$;
CREATE TRIGGER protect_slot BEFORE UPDATE OR DELETE ON listing_publication_private.slots
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_slot();
CREATE FUNCTION listing_publication_private.protect_object() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_object_lineage_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['dispatch_key','dispatch_recorded_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['dispatch_key','dispatch_recorded_at']) OR OLD.dispatch_key IS NOT NULL
    OR NEW.dispatch_key IS NULL OR NEW.dispatch_recorded_at IS NULL THEN
  RAISE EXCEPTION 'publication_object_immutable' USING ERRCODE='55000';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.attempts a
   WHERE a.id=OLD.attempt_id AND a.state='open' AND a.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER protect_object BEFORE UPDATE OR DELETE ON listing_publication_private.objects
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_object();

-- This stage has no settlement worker yet. Queue lineage cannot be rewritten or discarded.
CREATE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END $fn$;
CREATE TRIGGER protect_cleanup BEFORE UPDATE OR DELETE ON listing_publication_private.cleanup
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_cleanup();


-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/02_values_and_policy.sql
-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
-- Reuses the EXISTING exact normalizers, identity lock and versioned policy helpers.
CREATE FUNCTION listing_publication_private.require_actor(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $fn$
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 IF public.listing_actor_uid_hosted_v1() IS NULL OR p_expected_user_id IS NULL OR public.listing_actor_uid_hosted_v1() IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'publication_account_changed' USING ERRCODE='42501';
 END IF;
 RETURN public.lock_listing_creation_actor_v1(p_expected_identity_id);
END $fn$;
CREATE FUNCTION listing_publication_private.require_policies() RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $fn$
DECLARE p record; locked_id uuid; accepted_id uuid; result jsonb:='[]'; at_time timestamptz;
BEGIN
 -- Brief shared catalog lock closes the new-policy phantom between selection and write.
 -- No Storage/network work may occur inside this database transaction.
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;
 at_time:=clock_timestamp();
 -- Ordinary V2 has free-text location, NOT a verified policy-country code. Never guess it.
 -- Global-only pilot fails closed if any country-scoped ordinary rule is active.
 IF EXISTS(SELECT 1 FROM public.publication_policy_documents d WHERE d.status='active'
    AND 'listing'=ANY(d.applies_to_content_types) AND d.country_code IS NOT NULL
    AND (d.effective_until IS NULL OR d.effective_until>at_time)) THEN
  RAISE EXCEPTION 'publication_policy_country_scope_unresolved' USING ERRCODE='55000';
 END IF;
 PERFORM public.require_my_current_publication_policy_acceptance_v1('marketplace-general',NULL,'et-EE');
 FOR p IN SELECT * FROM public.get_required_publication_policies_v1('listing',NULL,'et-EE')
    WHERE requires_user_acceptance ORDER BY policy_document_id LOOP
  -- Existing helpers use transaction time; additionally reject a version expired while waiting.
  SELECT d.id INTO locked_id FROM public.publication_policy_documents d
   WHERE d.id=p.policy_document_id AND d.status='active' AND d.effective_from<=at_time
    AND (d.effective_until IS NULL OR d.effective_until>at_time) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
  accepted_id:=public.require_my_current_publication_policy_acceptance_v1(p.policy_key,NULL,'et-EE');
  IF accepted_id IS DISTINCT FROM locked_id THEN
   RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.user_publication_policy_acceptances a
   WHERE a.user_id=public.listing_actor_uid_hosted_v1() AND a.policy_document_id=locked_id AND a.content_hash=p.content_hash FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_acceptance_required' USING ERRCODE='42501'; END IF;
  result:=result||jsonb_build_array(jsonb_build_object('document_id',p.policy_document_id,
     'version',p.policy_version,'content_hash',p.content_hash));
 END LOOP;
 -- Locks on acceptance rows can wait too: validate wall time again at the last boundary.
 at_time:=clock_timestamp();
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result) item
   LEFT JOIN public.publication_policy_documents d ON d.id=(item->>'document_id')::uuid
   WHERE d.id IS NULL OR d.status<>'active' OR d.effective_from>at_time
    OR (d.effective_until IS NOT NULL AND d.effective_until<=at_time)) THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 -- Also detect newly effective rules that the transaction-time helper did not include.
 IF (SELECT count(*) FROM public.publication_policy_documents d WHERE d.status='active'
   AND d.country_code IS NULL AND d.locale='et-EE' AND 'listing'=ANY(d.applies_to_content_types)
   AND d.requires_user_acceptance AND d.effective_from<=at_time
   AND (d.effective_until IS NULL OR d.effective_until>at_time))<>jsonb_array_length(result)
   OR jsonb_array_length(result)=0 THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 RETURN result;
END $fn$;
CREATE FUNCTION listing_publication_private.normalize_images(p_images jsonb) RETURNS jsonb LANGUAGE plpgsql
IMMUTABLE SET search_path=pg_catalog,public,pg_temp AS $fn$
DECLARE e jsonb; ids uuid[]:='{}'; file_id uuid; bytes integer; total_bytes bigint:=0; result jsonb:='[]';
BEGIN
 IF p_images IS NULL OR jsonb_typeof(p_images) IS DISTINCT FROM 'array' OR octet_length(p_images::text)>4096 THEN
  RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
 END IF;
 IF jsonb_array_length(p_images)>10 THEN RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 FOR e IN SELECT value FROM jsonb_array_elements(p_images) LOOP
  PERFORM public.require_listing_create_keys_v1(e,ARRAY['client_file_id','byte_length','sha256']);
  IF jsonb_typeof(e->'client_file_id') IS DISTINCT FROM 'string'
   OR char_length(e->>'client_file_id')<>36 OR e->>'client_file_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR jsonb_typeof(e->'sha256') IS DISTINCT FROM 'string' OR char_length(e->>'sha256')<>64
   OR e->>'sha256' !~ '^[0-9a-f]{64}$'
   OR jsonb_typeof(e->'byte_length') IS DISTINCT FROM 'number'
   OR e->>'byte_length' !~ '^[1-9][0-9]{0,7}$' THEN
   RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
  END IF;
  file_id:=(e->>'client_file_id')::uuid; bytes:=(e->>'byte_length')::integer;
  IF file_id='00000000-0000-0000-0000-000000000000'::uuid OR file_id=ANY(ids) OR bytes>26214400 THEN
   RAISE EXCEPTION 'publication_images_invalid' USING ERRCODE='22023';
  END IF;
  ids:=array_append(ids,file_id); total_bytes:=total_bytes+bytes;
  result:=result||jsonb_build_array(jsonb_build_object('client_file_id',file_id,'byte_length',bytes,'sha256',e->>'sha256'));
 END LOOP;
 IF total_bytes>104857600 THEN RAISE EXCEPTION 'publication_attempt_bytes_exceeded' USING ERRCODE='22023'; END IF;
 RETURN result;
END $fn$;
CREATE FUNCTION listing_publication_private.snapshot(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $fn$
 WITH at_time AS MATERIALIZED (SELECT clock_timestamp() AS t)
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id::text,'request_key',a.request_key::text,
  'actor_user_id',a.actor_user_id::text,'identity_id',a.identity_id::text,
  'state',CASE WHEN a.state='open' AND a.expires_at<=at_time.t THEN 'expired' ELSE a.state END,
  'created_at',to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'expires_at',to_char(a.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'payload',CASE WHEN a.state='open' AND a.expires_at>at_time.t THEN a.payload ELSE NULL END,
  'slots',coalesce((SELECT jsonb_agg(jsonb_build_object('slot_id',s.id::text,'ordinal',s.ordinal,
   'client_file_id',s.client_file_id::text,'expected_bytes',s.expected_source_bytes,
   'expected_sha256',encode(s.expected_source_sha256,'hex')) ORDER BY s.ordinal)
   FROM listing_publication_private.slots s WHERE s.attempt_id=a.id),'[]'::jsonb))
 FROM listing_publication_private.attempts a CROSS JOIN at_time WHERE a.id=p_id;
$fn$;


-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/03_owner_attempt.sql
-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
-- Creates NO public listing. One committed private intent, slots and object lineage.
CREATE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; policies jsonb;
 a listing_publication_private.attempts%ROWTYPE; slot_id uuid; image record;
 at_time timestamptz; reserved bigint;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023';
 END IF;
 n:=public.normalize_listing_creation_v1(p_input);
 IF n->>'language'<>'et' OR n->'location'->>'country'='' OR n->'location'->>'city'=''
    OR n->'location'->>'latitude' IS NOT NULL OR n->'location'->>'longitude' IS NOT NULL THEN
  RAISE EXCEPTION 'publication_form_scope_invalid' USING ERRCODE='22023';
 END IF;
 images:=listing_publication_private.normalize_images(p_images);
 fingerprint:=sha256(convert_to('selqiro-publication-attempt-v1:'||jsonb_build_object('input',n,'images',images)::text,'UTF8'));
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.actor_user_id=p_expected_user_id AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM active_id OR a.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';
  END IF;
  -- Recovery only; do not rewrite content, move deadline, issue permission or reopen a tombstone.
  RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',true);
 END IF;
 policies:=listing_publication_private.require_policies();
 at_time:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.state='open' AND x.expires_at>at_time)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';
 END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.created_at>at_time-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';
 END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts x ON x.id=o.attempt_id WHERE x.actor_user_id=p_expected_user_id;
 -- Signed uploads cannot be bounded by the untrusted declared size. Reserve FULL per-object maxima.
 -- No budget is released until the future Storage settlement/cleanup contract proves it safe.
 IF reserved+jsonb_array_length(images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
   payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,active_id,p_request_key,fingerprint,n,policies,at_time,at_time+interval '24 hours') RETURNING * INTO a;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(a.id,image.ordinality-1,(image.value->>'client_file_id')::uuid,
    (image.value->>'byte_length')::integer,decode(image.value->>'sha256','hex')) RETURNING id INTO slot_id;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(a.id,slot_id,'source','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/source.upload',26214400),
        (a.id,slot_id,'web','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_listing_publication_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
   AND x.identity_id=active_id AND x.request_key=p_request_key FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 -- Reading/cancelling a user's private attempt never forces acceptance of changed terms.
 RETURN listing_publication_private.snapshot(a.id);
END $fn$;
REVOKE ALL ON FUNCTION public.get_my_listing_publication_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/04_upload_dispatch.sql
-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
-- INTERNAL ONLY. A durable pre-dispatch record, NOT a signed URL, expiry or upload confirmation.
-- No API role gets EXECUTE. Later server integration must commit this result before contacting Storage.
CREATE FUNCTION listing_publication_private.reserve_upload_dispatch_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; s listing_publication_private.slots%ROWTYPE;
 policies jsonb; allowed boolean:=false;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_dispatch_key IS NULL OR p_dispatch_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_dispatch_key_invalid' USING ERRCODE='22023';
 END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';
 END IF;
 policies:=listing_publication_private.require_policies();
 IF policies IS DISTINCT FROM a.policy_snapshot THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 SELECT x.* INTO s FROM listing_publication_private.slots x WHERE x.id=p_slot_id AND x.attempt_id=a.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_slot_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.slot_id=s.id AND x.kind='source' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_object_lineage_missing' USING ERRCODE='55000'; END IF;
 IF o.dispatch_key IS NOT NULL THEN
  IF o.dispatch_key IS DISTINCT FROM p_dispatch_key THEN
   RAISE EXCEPTION 'publication_dispatch_conflict' USING ERRCODE='22023';
  END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM listing_publication_private.objects x WHERE x.attempt_id=a.id AND x.dispatch_key=p_dispatch_key) THEN
   RAISE EXCEPTION 'publication_dispatch_conflict' USING ERRCODE='22023';
  END IF;
  IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.objects SET dispatch_key=p_dispatch_key,dispatch_recorded_at=clock_timestamp()
   WHERE id=o.id RETURNING * INTO o;
  allowed:=true;
 END IF;
 -- Only the FIRST confirmed reservation can request signing. Lost/uncertain responses never mint again.
 RETURN jsonb_build_object('schema_version',1,'attempt_id',a.id::text,'slot_id',s.id::text,
  'object_id',o.id::text,'dispatch_key',o.dispatch_key::text,'dispatch_allowed',allowed,
  'bucket_id',o.bucket_id,'object_path',o.object_path,
  'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex'));
END $fn$;
REVOKE ALL ON FUNCTION listing_publication_private.reserve_upload_dispatch_v1(uuid,uuid,uuid,uuid,uuid)
FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-attempt-v1/05_close_attempt.sql
-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE FUNCTION listing_publication_private.close_locked_attempt(p_id uuid,p_reason text) RETURNS boolean LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE a listing_publication_private.attempts%ROWTYPE; at_time timestamptz;
BEGIN
 IF p_reason IS NULL OR p_reason NOT IN('cancelled','expired') THEN
  RAISE EXCEPTION 'publication_close_reason_invalid' USING ERRCODE='22023';
 END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' THEN RETURN false; END IF;
 at_time:=clock_timestamp();
 IF p_reason='expired' AND a.expires_at>at_time THEN RETURN false; END IF;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,p_reason,
  CASE WHEN o.dispatch_key IS NULL THEN 'pending' ELSE 'blocked_write_settlement' END,at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id;
 -- Same transaction: any enqueue or update failure rolls back BOTH. No Storage call here.
 UPDATE listing_publication_private.attempts SET state=p_reason,payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN true;
END $fn$;
CREATE FUNCTION public.cancel_my_listing_publication_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; changed boolean;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
  AND x.identity_id=active_id AND x.request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 changed:=listing_publication_private.close_locked_attempt(a.id,'cancelled');
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('changed',changed);
END $fn$;
REVOKE ALL ON FUNCTION public.cancel_my_listing_publication_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

-- One bounded unit for a FUTURE expiry worker; no cron, grants or destructive list-all operation.
CREATE FUNCTION listing_publication_private.expire_one_v1(p_attempt_id uuid) RETURNS boolean LANGUAGE plpgsql
SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $fn$
DECLARE actor uuid;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 SELECT a.actor_user_id INTO actor FROM listing_publication_private.attempts a WHERE a.id=p_attempt_id;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Same profile -> attempt order as prepare/reserve/cancel, not reverse-order locking.
 PERFORM 1 FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_actor_lineage_missing' USING ERRCODE='55000'; END IF;
 RETURN listing_publication_private.close_locked_attempt(p_attempt_id,'expired');
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON SCHEMA listing_publication_private IS
 'Dormant V2 ordinary-listing attempt/slot/dispatch-lineage candidate. Not exposed, no Storage token, no publish, no cleanup worker, no listing deletion.';


-- Retained declaration source: supabase/labs/listing-publication-upload-v1/01_upload_grants.sql
-- NEW DORMANT LAB: not a migration, no Storage call, no grants to API roles.
-- Requires the exact existing private-attempt v1 dependency schema (01..05).
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE TABLE listing_publication_private.upload_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 dispatch_key uuid NOT NULL,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','signing','recorded')),
 claim_id uuid UNIQUE,
 claimed_at timestamptz,
 send_before_epoch bigint,
 token text,
 token_sha256 bytea CHECK(token_sha256 IS NULL OR octet_length(token_sha256)=32),
 issued_epoch bigint,
 expires_epoch bigint,
 recorded_at timestamptz,
 token_purged_at timestamptz,
 CHECK((state='reserved' AND claim_id IS NULL AND claimed_at IS NULL AND send_before_epoch IS NULL)
    OR (state IN('signing','recorded') AND claim_id IS NOT NULL AND claimed_at IS NOT NULL
        AND send_before_epoch IS NOT NULL AND send_before_epoch=floor(extract(epoch FROM claimed_at))::bigint+30)),
 CHECK((state IN('reserved','signing') AND token IS NULL AND token_sha256 IS NULL AND issued_epoch IS NULL
        AND expires_epoch IS NULL AND recorded_at IS NULL AND token_purged_at IS NULL)
    OR (state='recorded' AND token_sha256 IS NOT NULL AND issued_epoch IS NOT NULL AND issued_epoch>0
        AND expires_epoch IS NOT NULL AND expires_epoch=issued_epoch+7200 AND recorded_at IS NOT NULL
        AND ((token IS NOT NULL AND char_length(token) BETWEEN 1 AND 4096 AND token_purged_at IS NULL)
          OR (token IS NULL AND token_purged_at IS NOT NULL))))
);
CREATE INDEX upload_grants_token_expiry ON listing_publication_private.upload_grants(expires_epoch,id)
 WHERE token IS NOT NULL;
ALTER TABLE listing_publication_private.upload_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.upload_grants FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_upload_grant() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_upload_receipt_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='reserved' AND NEW.state='signing' AND NEW.claim_id IS NOT NULL AND NEW.claimed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','claim_id','claimed_at','send_before_epoch'])=
      (to_jsonb(OLD)-ARRAY['state','claim_id','claimed_at','send_before_epoch']) THEN RETURN NEW; END IF;
 IF OLD.state='signing' AND NEW.state='recorded' AND NEW.token IS NOT NULL AND NEW.recorded_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','token','token_sha256','issued_epoch','expires_epoch','recorded_at'])=
      (to_jsonb(OLD)-ARRAY['state','token','token_sha256','issued_epoch','expires_epoch','recorded_at']) THEN RETURN NEW; END IF;
 IF OLD.state='recorded' AND OLD.token IS NOT NULL AND NEW.token IS NULL AND NEW.token_purged_at IS NOT NULL
  AND OLD.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  AND (to_jsonb(NEW)-ARRAY['token','token_purged_at'])=(to_jsonb(OLD)-ARRAY['token','token_purged_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_upload_receipt_immutable' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_upload_grant BEFORE UPDATE OR DELETE ON listing_publication_private.upload_grants
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_upload_grant();

CREATE FUNCTION listing_publication_private.upload_binding(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,
  'attempt_id',a.id,'slot_id',s.id,'object_id',o.id,'dispatch_key',g.dispatch_key,'grant_id',g.id,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'expected_bytes',s.expected_source_bytes,
  'expected_sha256',encode(s.expected_source_sha256,'hex'))
 FROM listing_publication_private.upload_grants g JOIN listing_publication_private.objects o ON o.id=g.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE g.id=p_id AND o.kind='source' AND o.dispatch_key=g.dispatch_key;
$f$;

CREATE FUNCTION listing_publication_private.require_upload_service() RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_setting('role',true)='service_role' THEN RETURN; END IF;
 RAISE EXCEPTION 'publication_upload_service_required' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_publication_private.lock_upload_service_actor(p_user uuid,p_identity uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE old_sub text:=current_setting('request.jwt.claim.sub',true);
 old_claims text:=current_setting('request.jwt.claims',true); active_id uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 -- Trusted server verified the user's bearer via Auth. Reuse the EXISTING actor/
 -- identity lock under that actor; do not duplicate price/identity/policy logic.
 PERFORM set_config('request.jwt.claim.sub',coalesce(p_user::text,''),true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user)::text,true);
 active_id:=listing_publication_private.require_actor(p_user,p_identity);
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 RETURN active_id;
 -- On error, statement/subtransaction rollback restores the GUCs as well.
END $f$;

CREATE FUNCTION public.reserve_my_listing_upload_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE reserved jsonb; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 reserved:=listing_publication_private.reserve_upload_dispatch_v1(p_expected_user_id,p_expected_identity_id,
  p_attempt_id,p_slot_id,p_dispatch_key);
 IF (reserved->>'dispatch_allowed')::boolean THEN
  INSERT INTO listing_publication_private.upload_grants(object_id,dispatch_key)
   VALUES((reserved->>'object_id')::uuid,p_dispatch_key) RETURNING * INTO g;
 ELSE
  SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.object_id=(reserved->>'object_id')::uuid;
 END IF;
 -- A legacy reservation without this new receipt cannot be assumed unsent. Do not
 -- fabricate a replacement claim or mint another URL for it.
 RETURN jsonb_build_object('binding',listing_publication_private.upload_binding(g.id));
END $f$;

CREATE FUNCTION public.claim_listing_upload_sign_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 g listing_publication_private.upload_grants%ROWTYPE; allowed boolean:=false; now_time timestamptz;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 active_id:=listing_publication_private.lock_upload_service_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 -- Versioned acceptance helpers also need the trusted actor. Restore both GUCs before return.
 PERFORM set_config('request.jwt.claim.sub',p_expected_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_expected_user_id)::text,true);
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id
  WHERE x.id=p_grant_id AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key
    AND o.attempt_id=a.id AND o.slot_id=p_slot_id AND o.kind='source' FOR UPDATE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 now_time:=clock_timestamp();
 IF a.expires_at<=now_time THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF g.state='reserved' THEN
  UPDATE listing_publication_private.upload_grants SET state='signing',claim_id=gen_random_uuid(),
   claimed_at=now_time,send_before_epoch=floor(extract(epoch FROM now_time))::bigint+30 WHERE id=g.id RETURNING * INTO g;
  allowed:=true;
 END IF;
 -- No lease takeover. An abandoned 'signing' is uncertain, never automatically retryable.
 RETURN jsonb_build_object('binding',listing_publication_private.upload_binding(g.id),'sign_allowed',allowed,
  'claim_id',g.claim_id,'send_before_epoch',g.send_before_epoch);
END $f$;

CREATE FUNCTION public.record_listing_upload_grant_v1(p_grant_id uuid,p_claim_id uuid,p_token text,
 p_issued_epoch bigint,p_expires_epoch bigint) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; actor uuid; attempt uuid; claims jsonb; segment text; digest bytea;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT x.actor_user_id,x.id INTO actor,attempt FROM listing_publication_private.upload_grants ug
 JOIN listing_publication_private.objects ob ON ob.id=ug.object_id
 JOIN listing_publication_private.attempts x ON x.id=ob.attempt_id WHERE ug.id=p_grant_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 -- Same profile -> attempt -> grant order. Recording external evidence remains allowed
 -- AFTER cancel/expiry/access change; it does not authorize releasing a token or publishing.
 PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=attempt FOR UPDATE;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.id=p_grant_id FOR UPDATE;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.id=g.object_id;
 IF p_claim_id IS NULL OR g.claim_id IS DISTINCT FROM p_claim_id OR g.state='reserved' THEN
  RAISE EXCEPTION 'publication_upload_claim_mismatch' USING ERRCODE='22023'; END IF;
 IF p_token IS NULL OR char_length(p_token)>4096 OR p_token !~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
  OR p_issued_epoch IS NULL OR p_expires_epoch IS NULL OR p_expires_epoch<>p_issued_epoch+7200
  OR p_issued_epoch<floor(extract(epoch FROM g.claimed_at))::bigint-60
  OR p_issued_epoch>g.send_before_epoch+60 OR p_issued_epoch>floor(extract(epoch FROM clock_timestamp()))::bigint+60 THEN
  RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END IF;
 BEGIN
  segment:=translate(split_part(p_token,'.',2),'-_','+/');
  claims:=convert_from(decode(segment||repeat('=',(4-length(segment)%4)%4),'base64'),'UTF8')::jsonb;
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END;
 -- Consistency only, NOT signature verification. Only a trusted service broker may
 -- attest a token from its own authenticated HTTPS Storage signing response.
 IF jsonb_typeof(claims) IS DISTINCT FROM 'object' OR claims->>'url' IS DISTINCT FROM o.bucket_id||'/'||o.object_path
   OR claims->'upsert' IS DISTINCT FROM 'false'::jsonb OR claims->'iat' IS DISTINCT FROM to_jsonb(p_issued_epoch)
   OR claims->'exp' IS DISTINCT FROM to_jsonb(p_expires_epoch) THEN
  RAISE EXCEPTION 'publication_upload_token_invalid' USING ERRCODE='22023'; END IF;
 digest:=sha256(convert_to(p_token,'UTF8'));
 IF g.state='recorded' THEN
  IF g.token_sha256 IS DISTINCT FROM digest OR g.issued_epoch IS DISTINCT FROM p_issued_epoch
   OR g.expires_epoch IS DISTINCT FROM p_expires_epoch THEN
   RAISE EXCEPTION 'publication_upload_receipt_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  UPDATE listing_publication_private.upload_grants SET state='recorded',token=p_token,token_sha256=digest,
   issued_epoch=p_issued_epoch,expires_epoch=p_expires_epoch,recorded_at=clock_timestamp() WHERE id=g.id;
 END IF;
 RETURN jsonb_build_object('recorded',true);
END $f$;

CREATE FUNCTION public.get_my_listing_upload_grant_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id WHERE x.id=p_grant_id
  AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key AND o.attempt_id=a.id
  AND o.slot_id=p_slot_id AND o.kind='source' FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF g.state<>'recorded' THEN RETURN jsonb_build_object('state','pending','grant',NULL); END IF;
 IF g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
  RETURN jsonb_build_object('state','expired','grant',NULL); END IF;
 RETURN jsonb_build_object('state','ready','grant',listing_publication_private.upload_binding(g.id)||
  jsonb_build_object('token',g.token,'issued_epoch',g.issued_epoch,'expires_epoch',g.expires_epoch));
END $f$;

CREATE FUNCTION public.purge_listing_upload_token_one_v1(p_grant_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid; attempt uuid; g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT a.actor_user_id,a.id INTO actor,attempt FROM listing_publication_private.upload_grants ug
  JOIN listing_publication_private.objects o ON o.id=ug.object_id
  JOIN listing_publication_private.attempts a ON a.id=o.attempt_id WHERE ug.id=p_grant_id;
 IF NOT FOUND THEN RETURN false; END IF;
 PERFORM 1 FROM public.profiles WHERE id=actor FOR UPDATE;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=attempt FOR UPDATE;
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x WHERE x.id=p_grant_id FOR UPDATE;
 IF g.token IS NULL OR g.expires_epoch>floor(extract(epoch FROM clock_timestamp()))::bigint THEN RETURN false; END IF;
 UPDATE listing_publication_private.upload_grants SET token=NULL,token_purged_at=clock_timestamp() WHERE id=g.id;
 -- This clears only an expired secret. It NEVER deletes Storage objects, unblocks
 -- cleanup, releases byte quota or establishes remote-write quiescence.
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION public.reserve_my_listing_upload_v1(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.claim_listing_upload_sign_v1(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_listing_upload_grant_v1(uuid,uuid,text,bigint,bigint) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.purge_listing_upload_token_one_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.upload_grants IS
 'Dormant private SOURCE upload issuance fence and short-lived capability receipt. Secrets never enter logs or public listing data. No cleanup completion from expiry/404; no grant means unknown, not absent.';


-- Retained declaration source: supabase/labs/listing-publication-web-v1/01_web_receipts.sql
-- DORMANT V2 WEB-IMAGE LAB. NOT a migration. No Storage call or API grants.
-- Load after the committed attempt 01..05 and upload 01 declarations in a new helper only.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE TABLE listing_publication_private.web_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 attempt_id uuid NOT NULL,
 slot_id uuid NOT NULL UNIQUE,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 claim_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 claimed_at timestamptz NOT NULL,
 process_before_epoch bigint NOT NULL,
 state text NOT NULL CHECK(state IN('processing','prepared','ready')),
 intent jsonb,
 prepared_at timestamptz,
 write_before_epoch bigint,
 ready_id uuid UNIQUE,
 ready_at timestamptz,
 FOREIGN KEY(slot_id,attempt_id) REFERENCES listing_publication_private.slots(id,attempt_id) ON DELETE RESTRICT,
 CHECK(process_before_epoch=floor(extract(epoch FROM claimed_at))::bigint+120),
 CHECK((state='processing' AND intent IS NULL AND prepared_at IS NULL AND write_before_epoch IS NULL)
    OR (state IN('prepared','ready') AND jsonb_typeof(intent)='object' AND intent IS NOT NULL
      AND prepared_at IS NOT NULL AND write_before_epoch IS NOT NULL AND write_before_epoch=floor(extract(epoch FROM prepared_at))::bigint+30)),
 CHECK((state IN('processing','prepared') AND ready_id IS NULL AND ready_at IS NULL)
    OR (state='ready' AND ready_id IS NOT NULL AND ready_at IS NOT NULL))
);
ALTER TABLE listing_publication_private.web_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.web_images FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.protect_web_image() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP IN('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'publication_web_lineage_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='processing' AND NEW.state='prepared'
  AND (to_jsonb(NEW)-ARRAY['state','intent','prepared_at','write_before_epoch'])=
      (to_jsonb(OLD)-ARRAY['state','intent','prepared_at','write_before_epoch']) THEN RETURN NEW; END IF;
 IF OLD.state='prepared' AND NEW.state='ready'
  AND (to_jsonb(NEW)-ARRAY['state','ready_id','ready_at'])=(to_jsonb(OLD)-ARRAY['state','ready_id','ready_at']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_web_immutable' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_web_image BEFORE UPDATE OR DELETE ON listing_publication_private.web_images
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_image();
CREATE TRIGGER protect_web_image_truncate BEFORE TRUNCATE ON listing_publication_private.web_images
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_web_image();

-- Actor -> identity -> attempt -> policy -> image is the same lock order as the existing flow.
-- Service authority is the actual SQL role, not a caller-controlled JWT-body claim.
CREATE FUNCTION listing_publication_private.lock_web_context(p_user uuid,p_identity uuid,p_attempt uuid,p_service boolean)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 IF p_service IS NULL THEN RAISE EXCEPTION 'publication_web_invalid' USING ERRCODE='22023'; END IF;
 IF p_service THEN active_id:=listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 ELSE active_id:=listing_publication_private.require_actor(p_user,p_identity); END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.id=p_attempt AND x.actor_user_id=p_user AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF p_service THEN
  PERFORM set_config('request.jwt.claim.sub',p_user::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user)::text,true);
 END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';
 END IF;
 IF p_service THEN
  PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
  PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 RETURN a.id;
END $f$;

CREATE FUNCTION listing_publication_private.web_binding(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,
  'attempt_id',a.id,'slot_id',s.id,'job_id',w.id,'request_key',w.request_key,
  'source_object_id',src.id,'web_object_id',web.id,'bucket_id',src.bucket_id,
  'source_path',src.object_path,'web_path',web.object_path,
  'source_bytes',s.expected_source_bytes,'source_sha256',encode(s.expected_source_sha256,'hex'))
 FROM listing_publication_private.web_images w JOIN listing_publication_private.slots s ON s.id=w.slot_id
 JOIN listing_publication_private.attempts a ON a.id=w.attempt_id
 JOIN listing_publication_private.objects src ON src.slot_id=s.id AND src.kind='source'
 JOIN listing_publication_private.objects web ON web.slot_id=s.id AND web.kind='web'
 WHERE w.id=p_id;
$f$;
CREATE FUNCTION listing_publication_private.web_receipt(p_id uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'receipt_id',w.ready_id,'job_id',w.id,'attempt_id',w.attempt_id,
  'slot_id',w.slot_id,'web_sha256',w.intent->>'web_sha256','web_bytes',(w.intent->>'web_bytes')::integer,
  'width',(w.intent->>'width')::integer,'height',(w.intent->>'height')::integer,'pipeline_version','listing-web-v1')
 FROM listing_publication_private.web_images w WHERE w.id=p_id AND w.state='ready';
$f$;

CREATE FUNCTION public.claim_listing_web_image_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_request_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_request_invalid' USING ERRCODE='22023'; END IF;
 -- A successful PUT alone cannot authorize processing. Retain original upload provenance.
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.slots s
  JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='source'
  JOIN listing_publication_private.upload_grants g ON g.object_id=o.id AND g.dispatch_key=o.dispatch_key
  WHERE s.id=p_slot_id AND s.attempt_id=p_attempt_id AND g.state='recorded') THEN
  RAISE EXCEPTION 'publication_web_source_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.slot_id=p_slot_id FOR UPDATE;
 IF FOUND THEN
  IF w.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_web_request_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  t:=clock_timestamp();
  INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state)
   VALUES(p_attempt_id,p_slot_id,p_request_key,t,floor(extract(epoch FROM t))::bigint+120,'processing') RETURNING * INTO w;
  allowed:=true;
 END IF;
 -- No takeover/reprocessing on timeout. Uncertain processing stays visible for reconciliation/cancel.
 RETURN jsonb_build_object('binding',listing_publication_private.web_binding(w.id),'state',w.state,
  'process_allowed',allowed,'claim_id',CASE WHEN allowed THEN w.claim_id ELSE NULL END,
  'process_before_epoch',w.process_before_epoch,'intent',w.intent,'receipt',listing_publication_private.web_receipt(w.id));
END $f$;

CREATE FUNCTION listing_publication_private.validate_web_intent(p_intent jsonb,p_slot uuid) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE s listing_publication_private.slots%ROWTYPE; k text;
BEGIN
 IF p_intent IS NULL OR jsonb_typeof(p_intent) IS DISTINCT FROM 'object' OR octet_length(p_intent::text)>2048 THEN
  RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 PERFORM public.require_listing_create_keys_v1(p_intent,ARRAY['pipeline_version','content_type','source_sha256','source_bytes',
  'source_format','web_sha256','web_bytes','width','height','sharp_version','libvips_version']);
 FOR k IN SELECT unnest(ARRAY['pipeline_version','content_type','source_sha256','source_format','web_sha256','sharp_version','libvips_version']) LOOP
  IF jsonb_typeof(p_intent->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 END LOOP;
 FOR k IN SELECT unnest(ARRAY['source_bytes','web_bytes','width','height']) LOOP
  IF jsonb_typeof(p_intent->k) IS DISTINCT FROM 'number' OR p_intent->>k !~ '^[1-9][0-9]{0,7}$' THEN
   RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF p_intent->>'pipeline_version'<>'listing-web-v1' OR p_intent->>'content_type'<>'image/webp'
  OR p_intent->>'source_format' NOT IN('jpeg','png','webp')
  OR p_intent->>'source_sha256' !~ '^[0-9a-f]{64}$' OR char_length(p_intent->>'source_sha256')<>64
  OR p_intent->>'web_sha256' !~ '^[0-9a-f]{64}$' OR char_length(p_intent->>'web_sha256')<>64
  OR p_intent->>'sharp_version' !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
  OR p_intent->>'libvips_version' !~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
  OR (p_intent->>'source_bytes')::integer>26214400 OR (p_intent->>'web_bytes')::integer NOT BETWEEN 20 AND 4194304
  OR (p_intent->>'width')::integer>2048 OR (p_intent->>'height')::integer>2048 THEN
  RAISE EXCEPTION 'publication_web_intent_invalid' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO s FROM listing_publication_private.slots x WHERE x.id=p_slot;
 IF NOT FOUND OR encode(s.expected_source_sha256,'hex') IS DISTINCT FROM p_intent->>'source_sha256'
  OR s.expected_source_bytes IS DISTINCT FROM (p_intent->>'source_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_source_mismatch' USING ERRCODE='22023'; END IF;
 RETURN p_intent;
END $f$;

CREATE FUNCTION public.prepare_listing_web_write_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_claim_id uuid,p_intent jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; v jsonb; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.claim_id IS DISTINCT FROM p_claim_id THEN RAISE EXCEPTION 'publication_web_claim_invalid' USING ERRCODE='42501'; END IF;
 v:=listing_publication_private.validate_web_intent(p_intent,p_slot_id);
 IF w.state='processing' THEN
  t:=clock_timestamp();
  IF floor(extract(epoch FROM t))::bigint>=w.process_before_epoch THEN
   RAISE EXCEPTION 'publication_web_processing_expired' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.web_images SET state='prepared',intent=v,prepared_at=t,
   write_before_epoch=floor(extract(epoch FROM t))::bigint+30 WHERE id=w.id RETURNING * INTO w;
  allowed:=true;
 ELSIF w.intent IS DISTINCT FROM v THEN RAISE EXCEPTION 'publication_web_intent_conflict' USING ERRCODE='22023';
 END IF;
 -- This transaction MUST be acknowledged before the one Storage POST. Never extend/reissue.
 RETURN jsonb_build_object('binding',listing_publication_private.web_binding(w.id),'intent',w.intent,
  'write_allowed',allowed,'write_before_epoch',w.write_before_epoch);
END $f$;

CREATE FUNCTION public.record_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_observed_sha256 text,p_observed_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.state NOT IN('prepared','ready') THEN RAISE EXCEPTION 'publication_web_not_prepared' USING ERRCODE='55000'; END IF;
 -- Trusted server supplies these ONLY after a bounded authenticated full-object GET,
 -- hashing the actual bytes, not trusting Storage metadata/ETag/a client statement.
 IF p_observed_sha256 IS DISTINCT FROM w.intent->>'web_sha256'
  OR p_observed_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_readback_mismatch' USING ERRCODE='22023'; END IF;
 IF w.state='prepared' THEN
  UPDATE listing_publication_private.web_images SET state='ready',ready_id=gen_random_uuid(),ready_at=clock_timestamp()
   WHERE id=w.id RETURNING * INTO w;
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.web_receipt(w.id));
END $f$;

CREATE FUNCTION public.get_my_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,false);
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id;
 RETURN jsonb_build_object('receipt',listing_publication_private.web_receipt(w.id));
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_web_image_v1(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_listing_web_write_v1(uuid,uuid,uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.record_listing_web_ready_v1(uuid,uuid,uuid,uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_my_listing_web_ready_v1(uuid,uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-web-v1/02_close_write_fence.sql
-- NEW WEB-WRITE EXTENSION. Existing repository lab files remain unchanged.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
-- A prepared WEB write may still arrive even after the application times out.
-- No time/404/ack assumption makes it safe to delete. Actual settlement is a later gate.
CREATE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN o.dispatch_key IS NOT NULL OR (o.kind='web' AND EXISTS(
  SELECT 1 FROM listing_publication_private.web_images w WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL))
 THEN 'blocked_write_settlement' ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;
CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','payload','closed_at']) OR OLD.state<>'open'
    OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id
    OR c.object_path<>o.object_path OR c.reason<>NEW.state
    OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION listing_publication_private.close_locked_attempt(p_id uuid,p_reason text) RETURNS boolean LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE a listing_publication_private.attempts%ROWTYPE; at_time timestamptz;
BEGIN
 IF p_reason IS NULL OR p_reason NOT IN('cancelled','expired') THEN
  RAISE EXCEPTION 'publication_close_reason_invalid' USING ERRCODE='22023';
 END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' THEN RETURN false; END IF;
 at_time:=clock_timestamp();
 IF p_reason='expired' AND a.expires_at>at_time THEN RETURN false; END IF;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,p_reason,
  listing_publication_private.object_cleanup_state(o.id),at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id;
 -- Same transaction: any enqueue or update failure rolls back BOTH. No Storage call here.
 UPDATE listing_publication_private.attempts SET state=p_reason,payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN true;
END $fn$;

CREATE FUNCTION listing_publication_private.guard_cleanup_web_fence() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.state IS DISTINCT FROM listing_publication_private.object_cleanup_state(NEW.object_id) THEN
  RAISE EXCEPTION 'publication_web_cleanup_write_unsettled' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_cleanup_web_fence BEFORE INSERT ON listing_publication_private.cleanup
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_cleanup_web_fence();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-final-v1/01_state.sql
-- DORMANT FINAL-PUBLICATION LAB. Not a migration; API roles remain closed.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE ROLE selqiro_listing_final_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- ADMIN is the PG17 automatic creator grant; preserve its bootstrap grantor.
GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;
CREATE TABLE listing_publication_private.publications (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 listing_id bigint NOT NULL UNIQUE CHECK(listing_id>0), -- no listing FK: tombstone MUST outlive content
 confirmation_sha256 text NOT NULL CHECK(confirmation_sha256 ~ '^[0-9a-f]{64}$'),
 published_at timestamptz NOT NULL,
 state text NOT NULL CHECK(state IN('published','deleting')),
 deleted_at timestamptz,
 CHECK((state='published' AND deleted_at IS NULL) OR (state='deleting' AND deleted_at IS NOT NULL))
);
ALTER TABLE listing_publication_private.publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.publications FROM PUBLIC,anon,authenticated,service_role;
-- Replace exactly the two old state-related CHECKs. No disable-trigger/RLS or cascade.
DO $checks$ DECLARE r record; n integer:=0; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='listing_publication_private.attempts'::regclass
  AND contype='c' AND pg_get_constraintdef(oid) ~ '\mstate\M' LOOP
  n:=n+1; EXECUTE format('ALTER TABLE listing_publication_private.attempts DROP CONSTRAINT %I',r.conname);
 END LOOP;
 IF n<>2 THEN RAISE EXCEPTION 'publication_attempt_check_contract_changed'; END IF;
END $checks$;
ALTER TABLE listing_publication_private.attempts
 ADD CONSTRAINT final_attempt_state CHECK(state IN('open','cancelled','expired','published','deleted')),
 ADD CONSTRAINT final_attempt_shape CHECK(
 (state='open' AND payload IS NOT NULL AND jsonb_typeof(payload)='object' AND closed_at IS NULL)
 OR (state IN('cancelled','expired','published','deleted') AND payload IS NULL AND closed_at IS NOT NULL));
DO $checks$ DECLARE r record; n integer:=0; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='listing_publication_private.cleanup'::regclass
  AND contype='c' AND (pg_get_constraintdef(oid) ~ '\mstate\M' OR pg_get_constraintdef(oid) ~ '\mreason\M') LOOP
  n:=n+1; EXECUTE format('ALTER TABLE listing_publication_private.cleanup DROP CONSTRAINT %I',r.conname);
 END LOOP;
 IF n<>2 THEN RAISE EXCEPTION 'publication_cleanup_check_contract_changed'; END IF;
END $checks$;
ALTER TABLE listing_publication_private.cleanup
 ADD COLUMN work_key uuid,
 ADD COLUMN lease_until timestamptz,
 ADD COLUMN try_count integer NOT NULL DEFAULT 0 CHECK(try_count BETWEEN 0 AND 8),
 ADD COLUMN not_before timestamptz,
 ADD COLUMN last_error text CHECK(last_error IN('network','timeout','storage','response','lease_lost')),
 ADD COLUMN deleted_at timestamptz,
 ADD CONSTRAINT final_cleanup_reason CHECK(reason IN('cancelled','expired','published_source','terminal_delete')),
 ADD CONSTRAINT final_cleanup_state CHECK(state IN('pending','blocked_write_settlement','in_flight','retry_wait','deleted','needs_attention')),
 ADD CONSTRAINT final_cleanup_shape CHECK(
 (state IN('pending','blocked_write_settlement') AND work_key IS NULL AND lease_until IS NULL AND try_count=0 AND deleted_at IS NULL)
 OR (state IN('in_flight','retry_wait','needs_attention') AND work_key IS NOT NULL AND lease_until IS NOT NULL AND try_count>0 AND deleted_at IS NULL)
 OR (state='deleted' AND work_key IS NOT NULL AND lease_until IS NOT NULL AND try_count>0 AND deleted_at IS NOT NULL));
CREATE INDEX final_cleanup_due ON listing_publication_private.cleanup(state,not_before,enqueued_at,object_id);
CREATE FUNCTION listing_publication_private.final_receipt(p_attempt uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'listing_id',p.listing_id::text,
 'state',CASE WHEN p.state='published' THEN 'published' WHEN EXISTS(
 SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (c.state IS DISTINCT FROM 'deleted')) THEN 'deleting' ELSE 'deleted' END,
 'published_at',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'content_deleted',p.state='deleting',
 'files_remaining',(SELECT count(*) FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (p.state='deleting' OR o.kind='source') AND c.state IS DISTINCT FROM 'deleted'))
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id WHERE a.id=p_attempt;
$f$;
-- Immutable source/WEB references are never dropped, reused, or edited by deletion.
CREATE FUNCTION listing_publication_private.protect_publication() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_outcome_immutable' USING ERRCODE='42501'; END IF;
 IF OLD.state<>'published' OR NEW.state<>'deleting' OR NEW.deleted_at IS NULL OR
 (to_jsonb(NEW)-ARRAY['state','deleted_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','deleted_at']) THEN
  RAISE EXCEPTION 'publication_outcome_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_publication BEFORE UPDATE OR DELETE ON listing_publication_private.publications
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_publication();
CREATE TRIGGER protect_publication_truncate BEFORE TRUNCATE ON listing_publication_private.publications
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_publication();


-- Retained declaration source: supabase/labs/listing-publication-final-v1/02_listing_writer.generated.sql
-- DORMANT; load after fixture-gated 01_state.sql. Source derivation recorded in DERIVATION.json.
CREATE OR REPLACE FUNCTION public.guard_listing_price_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE normalized jsonb; changed boolean;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'listing_price_direct_truncate_forbidden' USING ERRCODE='42501';
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.price_kind IS NOT NULL AND NOT (current_user='selqiro_listing_final_writer_v1'
      AND public.listing_final_guard_state_v1(OLD.id)='deleting') THEN
      RAISE EXCEPTION 'listing_price_direct_delete_forbidden' USING ERRCODE='42501';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.price_revision IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
    END IF;
    -- Creation has not switched yet. Old raw-price creation remains possible;
    -- no structured create endpoint is exposed by this existing-listing slice.
    IF NEW.price_kind IS NULL THEN
      IF NEW.currency IS NOT NULL THEN
        RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
      END IF;
      RETURN NEW;
    END IF;
    IF current_user<>'selqiro_listing_final_writer_v1' THEN
      RAISE EXCEPTION 'listing_price_structured_create_not_enabled' USING ERRCODE='42501';
    END IF;
    normalized:=public.normalize_listing_price_v1(jsonb_build_object('kind',NEW.price_kind,
      'amount',NEW.price_amount::text,'currency',NEW.currency));
    NEW.price_amount:=(normalized->>'amount')::numeric;
    NEW.currency:=normalized->>'currency'; NEW.price:=public.listing_price_legacy_label_v1(normalized);
    NEW.price_revision:=1;
    RETURN NEW;
  END IF;
  IF NEW.price_revision IS DISTINCT FROM OLD.price_revision THEN
    RAISE EXCEPTION 'listing_price_revision_server_owned' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND NEW.price_kind IS NULL THEN
    RAISE EXCEPTION 'listing_price_downgrade_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_kind IS NOT NULL AND
     ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id)
     IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id) THEN
    RAISE EXCEPTION 'listing_price_owner_tuple_immutable' USING ERRCODE='42501';
  END IF;
  changed := ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
    IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price);
  IF NOT changed THEN RETURN NEW; END IF;
  IF (OLD.price_kind IS NOT NULL OR NEW.price_kind IS NOT NULL)
      AND current_user <> 'selqiro_listing_price_writer_v1' THEN
    RAISE EXCEPTION 'listing_price_direct_write_forbidden' USING ERRCODE='42501';
  END IF;
  IF OLD.price_revision = 9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_exhausted' USING ERRCODE='54000';
  END IF;
  IF NEW.price_kind IS NULL THEN
    IF NEW.currency IS NOT NULL THEN
      RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
    END IF;
    NEW.price_revision := OLD.price_revision + 1;
    RETURN NEW;
  END IF;
  normalized := public.normalize_listing_price_v1(jsonb_build_object(
    'kind',NEW.price_kind,'amount',NEW.price_amount::text,'currency',NEW.currency));
  NEW.price_amount := (normalized->>'amount')::numeric;
  NEW.currency := normalized->>'currency';
  NEW.price := public.listing_price_legacy_label_v1(normalized);
  IF ROW(NEW.price_kind,NEW.price_amount,NEW.currency,NEW.price)
     IS DISTINCT FROM ROW(OLD.price_kind,OLD.price_amount,OLD.currency,OLD.price) THEN
    NEW.price_revision := OLD.price_revision + 1;
  END IF;
  RETURN NEW;
END $fn$;

CREATE FUNCTION listing_publication_private.apply_final(p_attempt uuid,p_normalized jsonb,p_confirmation text)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; r public.listings%ROWTYPE;
 n jsonb:=p_normalized; actor uuid:=public.listing_actor_uid_hosted_v1(); active_id uuid; at_time timestamptz:=clock_timestamp();
BEGIN
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt FOR UPDATE;
 IF NOT FOUND OR a.actor_user_id IS DISTINCT FROM actor OR a.state<>'open' OR a.payload IS DISTINCT FROM n
  OR a.expires_at<=at_time THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 active_id:=a.identity_id;
  r.title:=n->'basics'->>'title'; r.description:=n->'basics'->>'description';
  r.condition:=n->'basics'->>'condition';
  r.category:=n->'category_path'->>0; r.subcategory:=coalesce(n->'category_path'->>1,'');
  r.country:=n->'location'->>'country'; r.city:=n->'location'->>'city';
  r.location:=concat_ws(' • ',nullif(r.country,''),nullif(r.city,''));
  r.listing_lat:=(n->'location'->>'latitude')::double precision;
  r.listing_lng:=(n->'location'->>'longitude')::double precision;
  r.manufacturer:=n->'attributes'->>'manufacturer'; r.part_number:=n->'attributes'->>'part_number';
  r.oem_number:=n->'attributes'->>'oem_number'; r.vehicle_brand:=n->'attributes'->>'vehicle_brand';
  r.vehicle_model:=n->'attributes'->>'vehicle_model'; r.vehicle_year:=n->'attributes'->>'vehicle_year';
  r.engine:=n->'attributes'->>'engine';
  -- One-way initial mirrors used by existing detail readers. Input cannot supply two values.
  r.details:=(n->'details')||jsonb_build_object('detailCategory',coalesce(n->'category_path'->>2,''),
    'manufacturer',r.manufacturer,'partNumber',r.part_number,'oemNumber',r.oem_number,
    'vehicleBrand',r.vehicle_brand,'vehicleModel',r.vehicle_model,'vehicleYear',r.vehicle_year,'engine',r.engine);
  INSERT INTO public.listings(
   user_id,identity_id,created_by_user_id,updated_by_user_id,title,description,condition,
   price_kind,price_amount,currency,category,subcategory,country,city,location,listing_lat,listing_lng,
   manufacturer,part_number,oem_number,vehicle_brand,vehicle_model,vehicle_year,engine,details,
   search_text,listing_language,status,created_at,active_until,image,
   ai_status,ai_enriched,ai_level,is_featured,is_boosted)
  VALUES(actor,active_id,actor,actor,r.title,r.description,r.condition,
   n->'price'->>'kind',(n->'price'->>'amount')::numeric,n->'price'->>'currency',
   r.category,r.subcategory,r.country,r.city,r.location,r.listing_lat,r.listing_lng,
   r.manufacturer,r.part_number,r.oem_number,r.vehicle_brand,r.vehicle_model,r.vehicle_year,r.engine,r.details,
   public.listing_basics_search_text_v1(r),n->>'language','active',at_time,at_time+interval '2160 hours',NULL,
   'not_started',false,'none',false,false)
  RETURNING * INTO r;

 INSERT INTO listing_publication_private.publications(attempt_id,listing_id,confirmation_sha256,published_at,state)
 VALUES(a.id,r.id,p_confirmation,at_time,'published');
 INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
 SELECT r.id,actor,'/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,
 '/api/v2/listing-media/'||a.id::text||'/'||s.ordinal::text,s.ordinal,s.ordinal=0
 FROM listing_publication_private.slots s WHERE s.attempt_id=a.id ORDER BY s.ordinal;
 UPDATE public.listings SET image=(SELECT i.original_url FROM public.listing_images i
  WHERE i.listing_id=r.id AND i.is_primary) WHERE id=r.id;
 PERFORM listing_publication_private.assert_final_last_boundary(a.id);
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_source',listing_publication_private.object_cleanup_state(o.id),at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id AND o.kind='source';
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN r.id;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.apply_final(uuid,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-final-v1/03_final_and_delete.sql
-- DORMANT same-V2 final contract. One transaction publishes; no Storage calls inside it.
CREATE FUNCTION listing_publication_private.final_material(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; n jsonb; images jsonb; x record;
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt;
 IF NOT FOUND OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 n:=public.normalize_listing_creation_v1(a.payload-'version');
 IF n IS DISTINCT FROM a.payload THEN RAISE EXCEPTION 'publication_input_changed' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT s.id,w.state,w.ready_id,w.intent FROM listing_publication_private.slots s
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=s.attempt_id
  WHERE s.attempt_id=a.id ORDER BY s.ordinal LOOP
  IF x.state IS DISTINCT FROM 'ready' OR x.ready_id IS NULL THEN
   RAISE EXCEPTION 'publication_images_not_ready' USING ERRCODE='55000'; END IF;
  PERFORM listing_publication_private.validate_web_intent(x.intent,x.id);
 END LOOP;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.cleanup c ON c.object_id=o.id WHERE o.attempt_id=a.id) THEN
  RAISE EXCEPTION 'publication_cleanup_conflict' USING ERRCODE='55000'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('slot_id',s.id,'ordinal',s.ordinal,'receipt_id',w.ready_id,
  'web_sha256',w.intent->>'web_sha256','web_bytes',w.intent->'web_bytes') ORDER BY s.ordinal),'[]') INTO images
 FROM listing_publication_private.slots s JOIN listing_publication_private.web_images w ON w.slot_id=s.id WHERE s.attempt_id=a.id;
 RETURN jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'price',n->'price','image_count',jsonb_array_length(images),
 'confirmation_sha256',encode(sha256(convert_to('selqiro-final-v1:'||jsonb_build_object(
  'intent',encode(a.intent_sha256,'hex'),'attempt',a.id,'price',n->'price','images',images)::text,'UTF8')),'hex'));
END $f$;
CREATE FUNCTION public.get_my_listing_publication_confirmation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state IN('published','deleted') THEN RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(a.id)); END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('confirmation',listing_publication_private.final_material(a.id));
END $f$;
CREATE FUNCTION public.publish_my_listing_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_confirmation_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; material jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_confirmation_sha256 IS NULL OR char_length(p_confirmation_sha256)<>64 OR p_confirmation_sha256 !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'publication_confirmation_invalid' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id;
 IF FOUND THEN
  IF p.confirmation_sha256 IS DISTINCT FROM p_confirmation_sha256 THEN RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
  -- Recovery is a read, even after terms changed, deletion, or listing expiration. Never reactivate.
  RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',true);
 END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 material:=listing_publication_private.final_material(a.id);
 IF material->>'confirmation_sha256' IS DISTINCT FROM p_confirmation_sha256 THEN
  RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
 PERFORM listing_publication_private.apply_final(a.id,a.payload,p_confirmation_sha256);
 RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',false);
END $f$;
CREATE FUNCTION listing_publication_private.apply_delete(p_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt FOR UPDATE;
 IF public.current_user_has_identity_access(a.identity_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 IF p.state='deleting' THEN RETURN; END IF;
 PERFORM 1 FROM public.listings l WHERE l.id=p.listing_id AND l.identity_id=a.identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 -- Locking the referenced listing fences new FK-linked messages while snapshots are scrubbed.
 IF (SELECT count(*) FROM (SELECT id FROM public.messages WHERE listing_id=p.listing_id LIMIT 501) q)>500
 OR (SELECT count(*) FROM (SELECT id FROM public.conversations WHERE listing_id=p.listing_id LIMIT 501) q)>500 THEN
 RAISE EXCEPTION 'publication_message_cleanup_limit' USING ERRCODE='54000'; END IF;

 -- Durably retain every exact key BEFORE deleting listing content or cascade-dependent rows.
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'terminal_delete',listing_publication_private.object_cleanup_state(o.id),t
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id ON CONFLICT(object_id) DO NOTHING;
 UPDATE listing_publication_private.publications SET state='deleting',deleted_at=t WHERE attempt_id=a.id;
 UPDATE public.conversations SET listing_title_snapshot=NULL,listing_image_snapshot=NULL,listing_price_snapshot=NULL WHERE listing_id=p.listing_id;
 UPDATE public.messages SET listing_title=NULL,listing_image=NULL,listing_price=NULL WHERE listing_id=p.listing_id;
 DELETE FROM public.listing_images WHERE listing_id=p.listing_id;
 DELETE FROM public.listings WHERE id=p.listing_id AND identity_id=a.identity_id AND created_by_user_id=a.actor_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 UPDATE listing_publication_private.attempts SET state='deleted' WHERE id=a.id;
 -- Tokens/hashes and private lineage remain under existing retention policy. Account erasure
 -- stays RESTRICT until that separate narrow retention/rekey boundary has been accepted.
END $f$;
CREATE FUNCTION public.delete_my_published_listing_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id IS NULL OR p_listing_id !~ '^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'publication_listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 -- Removing content does not require accepting newer terms. Active identity/access still required.
 PERFORM listing_publication_private.apply_delete(aid);
 RETURN listing_publication_private.final_receipt(aid);
END $f$;
CREATE FUNCTION public.get_public_listing_media_binding_v1(p_attempt_id uuid,p_ordinal integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE v jsonb;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
 'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id JOIN public.identities i ON i.id=l.identity_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.state='ready'
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published' AND l.status='active'
 AND l.active_until>clock_timestamp() AND i.status='active' AND l.identity_id=a.identity_id;
 RETURN v;
END $f$;
REVOKE ALL ON FUNCTION public.get_my_listing_publication_confirmation_v1(uuid,uuid,uuid),public.publish_my_listing_v1(uuid,uuid,uuid,text),
 public.delete_my_published_listing_v1(uuid,uuid,text),public.get_public_listing_media_binding_v1(uuid,integer)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.assert_final_last_boundary(p_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt;
 IF a.actor_user_id IS DISTINCT FROM public.listing_actor_uid_hosted_v1() OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
 RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
 RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.assert_final_last_boundary(uuid) FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-final-v1/04_guards.sql
CREATE FUNCTION public.listing_final_guard_state_v1(p_listing bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,pg_temp AS $f$
DECLARE managed text;
BEGIN
 SELECT state INTO managed FROM listing_publication_private.publications WHERE listing_id=p_listing;
 IF managed IS NOT NULL THEN
  PERFORM listing_publication_private.assert_hosted_preview_actor(public.listing_actor_uid_hosted_v1());
 END IF;
 RETURN managed;
END $f$;
REVOKE ALL ON FUNCTION public.listing_final_guard_state_v1(bigint) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p JOIN public.listings l ON l.id=p.listing_id
   WHERE p.attempt_id=OLD.id AND p.state='published' AND l.identity_id=OLD.identity_id AND l.created_by_user_id=OLD.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source' OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.attempt_id=OLD.id AND p.state='deleting'
   AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  OR OLD.state<>'open' OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path OR c.reason<>NEW.state
   OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE FUNCTION listing_publication_private.guard_managed_listing() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE managed text;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END IF;
 managed:=public.listing_final_guard_state_v1(CASE WHEN TG_OP='INSERT' THEN NEW.id ELSE OLD.id END);
 IF managed IS NULL THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' THEN RAISE EXCEPTION 'publication_tombstone_retained' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN
  IF current_user<>'selqiro_listing_final_writer_v1' OR managed<>'deleting' THEN
   RAISE EXCEPTION 'publication_terminal_delete_required' USING ERRCODE='42501'; END IF;
  RETURN OLD;
 END IF;
 IF ROW(NEW.id,NEW.identity_id,NEW.user_id,NEW.created_by_user_id) IS DISTINCT FROM ROW(OLD.id,OLD.identity_id,OLD.user_id,OLD.created_by_user_id)
  OR (NEW.image IS DISTINCT FROM OLD.image AND current_user<>'selqiro_listing_final_writer_v1') THEN
  RAISE EXCEPTION 'publication_managed_binding_immutable' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_managed_listing BEFORE INSERT OR UPDATE OR DELETE ON public.listings
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_listing();
CREATE FUNCTION listing_publication_private.guard_managed_image() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END IF;
 IF current_user<>'selqiro_listing_final_writer_v1' AND (
 public.listing_final_guard_state_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END) IS NOT NULL OR
 public.listing_final_guard_state_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END) IS NOT NULL) THEN
  RAISE EXCEPTION 'publication_managed_image_immutable' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $f$;
CREATE TRIGGER guard_managed_image BEFORE INSERT OR UPDATE OR DELETE ON public.listing_images
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_managed_image();
CREATE TRIGGER guard_managed_image_truncate BEFORE TRUNCATE ON public.listing_images
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.guard_managed_image();
CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;
-- All lineage tables keep their original row delete protections; block mass removal too.
CREATE FUNCTION listing_publication_private.no_truncate() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN RAISE EXCEPTION 'publication_direct_truncate_forbidden' USING ERRCODE='42501'; END $f$;
CREATE TRIGGER final_attempt_no_truncate BEFORE TRUNCATE ON listing_publication_private.attempts FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_slots_no_truncate BEFORE TRUNCATE ON listing_publication_private.slots FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_objects_no_truncate BEFORE TRUNCATE ON listing_publication_private.objects FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();
CREATE TRIGGER final_cleanup_no_truncate BEFORE TRUNCATE ON listing_publication_private.cleanup FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.no_truncate();


-- Retained declaration source: supabase/labs/listing-publication-final-v1/05_cleanup.sql
-- Durable one-object cleanup. The caller commits the claim BEFORE the Storage API call.
-- Dispatched SOURCE / prepared WEB targets remain blocked. No expiry/404/ready-based unblocking.
CREATE FUNCTION public.claim_listing_cleanup_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source'))
 AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
 AND listing_publication_private.object_cleanup_state(o.id)='pending'
 AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
   OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF c.try_count>=8 THEN
  UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
  RETURN NULL;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
 try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
 RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
 'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
END $f$;
CREATE FUNCTION public.record_listing_cleanup_v1(p_object_id uuid,p_work_key uuid,p_result text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_result IS NULL OR p_result NOT IN('deleted','network','timeout','storage','response') THEN
  RAISE EXCEPTION 'publication_cleanup_result_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=p_object_id FOR UPDATE;
 IF NOT FOUND OR c.work_key IS DISTINCT FROM p_work_key OR p_work_key IS NULL THEN
  RAISE EXCEPTION 'publication_cleanup_lease_lost' USING ERRCODE='55000'; END IF;
 IF c.state='deleted' AND p_result='deleted' THEN
  RETURN jsonb_build_object('object_id',c.object_id,'work_key',c.work_key,'state','deleted'); END IF;
 IF c.state<>'in_flight' OR c.lease_until<=t THEN RAISE EXCEPTION 'publication_cleanup_lease_lost' USING ERRCODE='55000'; END IF;
 IF p_result='deleted' THEN
  UPDATE listing_publication_private.cleanup SET state='deleted',deleted_at=t WHERE object_id=c.object_id;
 ELSE
  UPDATE listing_publication_private.cleanup SET state=CASE WHEN try_count>=8 THEN 'needs_attention' ELSE 'retry_wait' END,
   last_error=p_result,not_before=t+(least(3600,30*(2^(try_count-1))::integer)*interval '1 second') WHERE object_id=c.object_id;
 END IF;
 RETURN (SELECT jsonb_build_object('object_id',q.object_id,'work_key',q.work_key,'state',q.state)
  FROM listing_publication_private.cleanup q WHERE q.object_id=c.object_id);
END $f$;
-- Safe owner progress: no Storage keys, tokens, payloads, raw errors or logs.
CREATE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight')),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),'needs_attention',count(*) FILTER(WHERE c.state='needs_attention'),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE c.state<>'deleted')))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE c.state IS DISTINCT FROM 'deleted'),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_cleanup_v1(),public.record_listing_cleanup_v1(uuid,uuid,text),
 public.get_my_listing_cleanup_summary_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-publication-final-v1/06_authority.sql
-- This NOLOGIN role is a narrow SQL writer, not a client session or JWT claim.
GRANT USAGE ON SCHEMA public,listing_publication_private TO selqiro_listing_final_writer_v1;
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
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1(),public.current_user_has_identity_access(uuid),public.normalize_listing_price_v1(jsonb),
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


-- Retained declaration source: supabase/labs/listing-publication-final-v1/07_budget.generated.sql
-- Exact prior preparation body, one quota predicate change only.
CREATE OR REPLACE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; policies jsonb;
 a listing_publication_private.attempts%ROWTYPE; slot_id uuid; image record;
 at_time timestamptz; reserved bigint;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023';
 END IF;
 n:=public.normalize_listing_creation_v1(p_input);
 IF n->>'language'<>'et' OR n->'location'->>'country'='' OR n->'location'->>'city'=''
    OR n->'location'->>'latitude' IS NOT NULL OR n->'location'->>'longitude' IS NOT NULL THEN
  RAISE EXCEPTION 'publication_form_scope_invalid' USING ERRCODE='22023';
 END IF;
 images:=listing_publication_private.normalize_images(p_images);
 fingerprint:=sha256(convert_to('selqiro-publication-attempt-v1:'||jsonb_build_object('input',n,'images',images)::text,'UTF8'));
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.actor_user_id=p_expected_user_id AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM active_id OR a.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';
  END IF;
  -- Recovery only; do not rewrite content, move deadline, issue permission or reopen a tombstone.
  RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',true);
 END IF;
 policies:=listing_publication_private.require_policies();
 at_time:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.state='open' AND x.expires_at>at_time)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';
 END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.created_at>at_time-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';
 END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts x ON x.id=o.attempt_id WHERE x.actor_user_id=p_expected_user_id AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup done WHERE done.object_id=o.id AND done.state='deleted');
 -- Signed uploads cannot be bounded by the untrusted declared size. Reserve FULL per-object maxima.
 -- No budget is released until the future Storage settlement/cleanup contract proves it safe.
 IF reserved+jsonb_array_length(images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
   payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,active_id,p_request_key,fingerprint,n,policies,at_time,at_time+interval '24 hours') RETURNING * INTO a;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(a.id,image.ordinality-1,(image.value->>'client_file_id')::uuid,
    (image.value->>'byte_length')::integer,decode(image.value->>'sha256','hex')) RETURNING id INTO slot_id;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(a.id,slot_id,'source','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/source.upload',26214400),
        (a.id,slot_id,'web','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;



-- Retained declaration source: supabase/labs/listing-publication-write-completion-v1/01_web_completion.sql
-- NEW disposable-lab overlay, not a production migration or an API grant.
-- Narrow scope: one acknowledged internal WEB POST; never a reusable SOURCE URL.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE TABLE listing_publication_private.web_write_completions (
 job_id uuid PRIMARY KEY REFERENCES listing_publication_private.web_images(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL UNIQUE,
 storage_object_id uuid NOT NULL UNIQUE CHECK(storage_object_id<>'00000000-0000-0000-0000-000000000000'::uuid),
 sent_sha256 text NOT NULL CHECK(sent_sha256 ~ '^[0-9a-f]{64}$' AND char_length(sent_sha256)=64),
 sent_bytes integer NOT NULL CHECK(sent_bytes BETWEEN 20 AND 4194304),
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.web_write_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.web_write_completions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.web_write_completions FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.web_write_completions TO selqiro_listing_final_writer_v1;
CREATE POLICY completion_internal_writer ON listing_publication_private.web_write_completions
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE FUNCTION listing_publication_private.protect_web_completion() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_web_completion_immutable' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.web_images w
  JOIN listing_publication_private.objects o ON o.slot_id=w.slot_id AND o.attempt_id=w.attempt_id AND o.kind='web'
  WHERE w.id=NEW.job_id AND w.claim_id=NEW.claim_id AND o.id=NEW.object_id
   AND w.state IN('prepared','ready') AND w.prepared_at IS NOT NULL AND w.write_before_epoch IS NOT NULL
   AND w.intent->>'web_sha256'=NEW.sent_sha256 AND (w.intent->>'web_bytes')::integer=NEW.sent_bytes
   AND o.bucket_id='listing-publication-private' AND o.dispatch_key IS NULL
   AND o.object_path='v1/'||w.attempt_id::text||'/'||w.slot_id::text||'/web-v1.webp') THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_web_completion BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.web_write_completions
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_web_completion();
CREATE TRIGGER protect_web_completion_truncate BEFORE TRUNCATE ON listing_publication_private.web_write_completions
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_web_completion();

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- Only immutable one-WEB-write evidence can release a blocked WEB target.
 -- SOURCE grants, readiness, expiry and caller booleans are not settlement.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;

CREATE FUNCTION public.record_listing_web_write_completed_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,
 p_job_id uuid,p_claim_id uuid,p_web_object_id uuid,p_storage_object_id uuid,p_storage_key text,
 p_sent_sha256 text,p_sent_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
 w listing_publication_private.web_images%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 r listing_publication_private.web_write_completions%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_storage_object_id IS NULL OR p_storage_object_id='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 -- Cleanup-only evidence may arrive after cancel, expiry, logout, identity switch or
 -- revocation. Do NOT reopen context or reacquire publication permission here.
 -- Lock the attempt like close/delete; read immutable prepared WEB fields; then cleanup.
 -- No UPDATE privilege on web_images is granted merely to obtain a redundant row lock.
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id FOR UPDATE;
 IF NOT FOUND OR a.actor_user_id IS DISTINCT FROM p_expected_user_id
  OR a.identity_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.id=p_job_id;
 SELECT x.* INTO o FROM listing_publication_private.objects x WHERE x.id=p_web_object_id;
 IF w.id IS NULL OR o.id IS NULL OR w.attempt_id IS DISTINCT FROM a.id OR w.slot_id IS DISTINCT FROM p_slot_id
  OR w.claim_id IS DISTINCT FROM p_claim_id OR w.state NOT IN('prepared','ready') OR w.prepared_at IS NULL
  OR w.write_before_epoch IS NULL OR o.attempt_id IS DISTINCT FROM a.id OR o.slot_id IS DISTINCT FROM w.slot_id
  OR o.kind<>'web' OR o.dispatch_key IS NOT NULL OR o.bucket_id<>'listing-publication-private'
  OR o.object_path IS DISTINCT FROM 'v1/'||a.id::text||'/'||w.slot_id::text||'/web-v1.webp'
  OR p_storage_key IS DISTINCT FROM o.bucket_id||'/'||o.object_path
  OR p_sent_sha256 IS DISTINCT FROM w.intent->>'web_sha256'
  OR p_sent_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_completion_binding_mismatch' USING ERRCODE='22023'; END IF;
 -- Neither the caller's clock nor write_before_epoch proves completion. A late
 -- genuine terminal HTTP acknowledgement is useful even after this deadline.
 SELECT x.* INTO r FROM listing_publication_private.web_write_completions x WHERE x.job_id=w.id;
 IF FOUND THEN
  IF ROW(r.object_id,r.claim_id,r.storage_object_id,r.sent_sha256,r.sent_bytes)
   IS DISTINCT FROM ROW(o.id,w.claim_id,p_storage_object_id,p_sent_sha256,p_sent_bytes) THEN
   RAISE EXCEPTION 'publication_web_completion_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  INSERT INTO listing_publication_private.web_write_completions(job_id,object_id,claim_id,storage_object_id,sent_sha256,sent_bytes)
   VALUES(w.id,o.id,w.claim_id,p_storage_object_id,p_sent_sha256,p_sent_bytes) RETURNING * INTO r;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='pending'
  WHERE object_id=o.id AND state='blocked_write_settlement';
 RETURN jsonb_build_object('schema_version',1,'job_id',r.job_id,'web_object_id',r.object_id,
  'storage_object_id',r.storage_object_id,'completed',true);
END $f$;
REVOKE ALL ON FUNCTION public.record_listing_web_write_completed_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_web_write_completed_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,integer)
 OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.protect_web_completion() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_web_completion() TO selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.web_write_completions IS
 'Trusted single-WEB-POST terminal response evidence, not SOURCE settlement, readiness, or exclusive-provider-writer proof. Dormant/API-closed.';


CREATE VIEW listing_publication_private.hosted_storage_objects WITH (security_barrier=true) AS
 SELECT s.id,s.bucket_id,s.name,s.version FROM storage.objects s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.name);
REVOKE ALL ON listing_publication_private.hosted_storage_objects FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON listing_publication_private.hosted_storage_objects TO selqiro_listing_final_writer_v1;

-- Retained declaration source: supabase/labs/listing-publication-write-reconcile-v1/01_reconcile.sql
-- DORMANT LAB overlay. No production migration, no Storage operation, no API grant.
-- Metadata is read from the primary DB, NOT client/user_metadata/ETag/HEAD/404.
-- Provider admission/write/commit ordering and exclusive path writers need real integration acceptance.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;
CREATE TABLE listing_publication_private.write_reconcile_jobs (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN('source_unsigned','web_commit')),
 work_key uuid NOT NULL UNIQUE, try_count integer NOT NULL CHECK(try_count BETWEEN 1 AND 8),
 state text NOT NULL CHECK(state IN('leased','retry_wait','settled','needs_attention')),
 lease_until timestamptz NOT NULL, not_before timestamptz,
 storage_object_id uuid, storage_version text,
 result jsonb,
 CHECK((storage_object_id IS NULL)=(storage_version IS NULL)),
 CHECK(kind='web_commit' OR storage_object_id IS NULL),
 CHECK((state='leased' AND result IS NULL AND not_before IS NULL)
    OR (state<>'leased' AND result IS NOT NULL)),
 CHECK(storage_version IS NULL OR (storage_version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND storage_version<>'00000000-0000-0000-0000-000000000000'))
);
CREATE TABLE listing_publication_private.write_settlements (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN('source_unsigned','web_commit')),
 grant_id uuid REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 job_id uuid REFERENCES listing_publication_private.web_images(id) ON DELETE RESTRICT,
 claim_id uuid,storage_object_id uuid UNIQUE,storage_version text,
 observed_sha256 text,observed_bytes integer,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='source_unsigned' AND grant_id IS NOT NULL AND job_id IS NULL AND claim_id IS NULL
        AND storage_object_id IS NULL AND storage_version IS NULL AND observed_sha256 IS NULL AND observed_bytes IS NULL)
    OR (kind='web_commit' AND grant_id IS NULL AND job_id IS NOT NULL AND claim_id IS NOT NULL
        AND storage_object_id IS NOT NULL AND storage_version IS NOT NULL AND observed_sha256 IS NOT NULL AND observed_bytes BETWEEN 20 AND 4194304))
);
ALTER TABLE listing_publication_private.write_reconcile_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_reconcile_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.write_settlements FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.write_reconcile_jobs,listing_publication_private.write_settlements FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.write_reconcile_jobs TO selqiro_listing_final_writer_v1;
GRANT SELECT,INSERT ON listing_publication_private.write_settlements TO selqiro_listing_final_writer_v1;
CREATE POLICY reconcile_internal ON listing_publication_private.write_reconcile_jobs FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY settlement_internal ON listing_publication_private.write_settlements FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
-- NEW narrowly scoped internal read only; not client/service-role SELECT or any Storage write.
-- Bounded hosted_storage_objects view supplies the read witness.

CREATE FUNCTION listing_publication_private.protect_write_settlement() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_write_settlement_immutable' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  WHERE o.id=NEW.object_id AND a.state IN('cancelled','expired','deleted') AND o.bucket_id='listing-publication-private'
  AND ((NEW.kind='source_unsigned' AND o.kind='source' AND EXISTS(
   SELECT 1 FROM listing_publication_private.upload_grants g WHERE g.id=NEW.grant_id AND g.object_id=o.id
    AND g.dispatch_key=o.dispatch_key AND g.state='reserved' AND g.claim_id IS NULL AND g.claimed_at IS NULL))
  OR (NEW.kind='web_commit' AND o.kind='web' AND o.dispatch_key IS NULL AND EXISTS(
   SELECT 1 FROM listing_publication_private.web_images w JOIN listing_publication_private.hosted_storage_objects s ON s.bucket_id=o.bucket_id AND s.name=o.object_path
   WHERE w.id=NEW.job_id AND w.attempt_id=a.id AND w.slot_id=o.slot_id AND w.claim_id=NEW.claim_id
    AND w.state IN('prepared','ready') AND w.prepared_at IS NOT NULL AND w.write_before_epoch IS NOT NULL
    AND w.intent->>'web_sha256'=NEW.observed_sha256 AND (w.intent->>'web_bytes')::integer=NEW.observed_bytes
    AND (SELECT count(*) FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)=1
    AND s.id=NEW.storage_object_id AND s.id<>'00000000-0000-0000-0000-000000000000'::uuid AND s.version=NEW.storage_version
    AND s.version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND s.version<>'00000000-0000-0000-0000-000000000000'
    AND o.object_path='v1/'||a.id::text||'/'||o.slot_id::text||'/web-v1.webp')))) THEN
  RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_write_settlement BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.write_settlements
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_write_settlement();
CREATE TRIGGER protect_write_settlement_truncate BEFORE TRUNCATE ON listing_publication_private.write_settlements
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_write_settlement();

CREATE FUNCTION listing_publication_private.protect_write_reconcile_job() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_write_reconcile_immutable' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'leased' OR NEW.try_count<>1 OR NEW.lease_until<=clock_timestamp() THEN
   RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.object_id IS DISTINCT FROM OLD.object_id OR NEW.kind IS DISTINCT FROM OLD.kind
  OR (OLD.storage_object_id IS NOT NULL AND ROW(NEW.storage_object_id,NEW.storage_version) IS DISTINCT FROM ROW(OLD.storage_object_id,OLD.storage_version)) THEN
  RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000'; END IF;
 IF OLD.state='leased' AND OLD.lease_until<=clock_timestamp() AND OLD.try_count=8
  AND NEW.state='needs_attention' AND NEW.result=jsonb_build_object('outcome','lease_lost')
  AND (to_jsonb(NEW)-ARRAY['state','result'])=(to_jsonb(OLD)-ARRAY['state','result']) THEN RETURN NEW; END IF;
 IF NEW.state='leased' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key<>OLD.work_key
  AND NEW.lease_until>clock_timestamp() AND
   ((OLD.state='retry_wait' AND OLD.not_before<=clock_timestamp()) OR (OLD.state='leased' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='leased' AND OLD.lease_until>clock_timestamp() AND NEW.state IN('settled','retry_wait','needs_attention')
  AND (to_jsonb(NEW)-ARRAY['state','not_before','result'])=(to_jsonb(OLD)-ARRAY['state','not_before','result']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_write_reconcile_transition' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_write_reconcile_job BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.write_reconcile_jobs
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_write_reconcile_job();
CREATE TRIGGER protect_write_reconcile_job_truncate BEFORE TRUNCATE ON listing_publication_private.write_reconcile_jobs
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_write_reconcile_job();
CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- An immutable POST completion OR narrowly proved write settlement may release this target.
 -- Signed SOURCE expiry/readiness/client booleans remain insufficient.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;


CREATE FUNCTION public.claim_listing_write_reconcile_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 j listing_publication_private.write_reconcile_jobs%ROWTYPE; w listing_publication_private.web_images%ROWTYPE;
 sid uuid;sv text;t timestamptz:=clock_timestamp();k text;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects x ON x.id=q.object_id
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 LEFT JOIN listing_publication_private.write_reconcile_jobs r ON r.object_id=x.id
 WHERE q.state='blocked_write_settlement' AND a.state IN('cancelled','expired','deleted')
  AND q.bucket_id=x.bucket_id AND q.object_path=x.object_path
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=x.id)
  AND ((x.kind='source' AND EXISTS(SELECT 1 FROM listing_publication_private.upload_grants g WHERE g.object_id=x.id
    AND g.dispatch_key=x.dispatch_key AND g.state='reserved' AND g.claim_id IS NULL))
   OR (x.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images v WHERE v.slot_id=x.slot_id
    AND v.attempt_id=x.attempt_id AND v.prepared_at IS NOT NULL AND v.state IN('prepared','ready'))
    AND NOT EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions wc WHERE wc.object_id=x.id)))
  AND (r.object_id IS NULL OR (r.try_count<8 AND r.state='retry_wait' AND r.not_before<=t) OR (r.state='leased' AND r.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=c.object_id;
 k:=CASE WHEN o.kind='source' THEN 'source_unsigned' ELSE 'web_commit' END;
 SELECT * INTO j FROM listing_publication_private.write_reconcile_jobs WHERE object_id=o.id;
 IF j.try_count=8 THEN
  UPDATE listing_publication_private.write_reconcile_jobs SET state='needs_attention',result=jsonb_build_object('outcome','lease_lost') WHERE object_id=o.id;
  RETURN NULL;
 END IF;
 IF k='web_commit' THEN
  SELECT * INTO w FROM listing_publication_private.web_images WHERE attempt_id=o.attempt_id AND slot_id=o.slot_id;
  SELECT s.id,s.version INTO sid,sv FROM listing_publication_private.hosted_storage_objects s WHERE s.bucket_id=o.bucket_id AND s.name=o.object_path
   AND (SELECT count(*) FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)=1
   AND s.id<>'00000000-0000-0000-0000-000000000000'::uuid
   AND s.version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND s.version<>'00000000-0000-0000-0000-000000000000';
 END IF;
 -- Once pinned, a provider generation is never silently replaced by a later one.
 IF j.storage_object_id IS NOT NULL THEN sid:=j.storage_object_id;sv:=j.storage_version; END IF;
 IF j.object_id IS NULL THEN
  INSERT INTO listing_publication_private.write_reconcile_jobs(object_id,kind,work_key,try_count,state,lease_until,storage_object_id,storage_version)
   VALUES(o.id,k,gen_random_uuid(),1,'leased',t+interval '60 seconds',sid,sv) RETURNING * INTO j;
 ELSE
  UPDATE listing_publication_private.write_reconcile_jobs SET work_key=gen_random_uuid(),try_count=try_count+1,state='leased',
   lease_until=t+interval '60 seconds',not_before=NULL,result=NULL,storage_object_id=sid,storage_version=sv WHERE object_id=o.id RETURNING * INTO j;
 END IF;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'work_key',j.work_key,'kind',k,'attempt_id',o.attempt_id,'slot_id',o.slot_id,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'expected_sha256',CASE WHEN k='web_commit' THEN w.intent->>'web_sha256' END,
  'expected_bytes',CASE WHEN k='web_commit' THEN (w.intent->>'web_bytes')::integer END,
  'storage_object_id',j.storage_object_id,'storage_version',j.storage_version,'lease_until_epoch',floor(extract(epoch FROM j.lease_until))::bigint,'try_count',j.try_count);
END $f$;

CREATE FUNCTION public.record_listing_write_reconcile_v1(p_object_id uuid,p_work_key uuid,p_outcome text,
 p_storage_object_id uuid,p_storage_version text,p_observed_sha256 text,p_observed_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE j listing_publication_private.write_reconcile_jobs%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 a listing_publication_private.attempts%ROWTYPE; w listing_publication_private.web_images%ROWTYPE; c listing_publication_private.cleanup%ROWTYPE;
 g uuid;v jsonb;t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_outcome IS NULL OR p_outcome NOT IN('observed','not_visible','mismatch','transport') THEN RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
 v:=jsonb_build_object('outcome',p_outcome,'storage_object_id',p_storage_object_id,'storage_version',p_storage_version,'sha256',p_observed_sha256,'bytes',p_observed_bytes);
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO j FROM listing_publication_private.write_reconcile_jobs WHERE object_id=o.id FOR UPDATE;
 IF j.object_id IS NULL OR p_work_key IS NULL OR j.work_key IS DISTINCT FROM p_work_key THEN
  RAISE EXCEPTION 'publication_write_reconcile_lease_lost' USING ERRCODE='55000'; END IF;
 IF j.state<>'leased' THEN
  IF j.result IS DISTINCT FROM v THEN RAISE EXCEPTION 'publication_write_reconcile_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('object_id',j.object_id,'work_key',j.work_key,'state',j.state);
 END IF;
 IF j.lease_until<=t OR a.state NOT IN('cancelled','expired','deleted') OR c.state<>'blocked_write_settlement' THEN
  RAISE EXCEPTION 'publication_write_reconcile_lease_lost' USING ERRCODE='55000'; END IF;
 IF p_outcome<>'observed' THEN
  IF p_storage_object_id IS NOT NULL OR p_storage_version IS NOT NULL OR p_observed_sha256 IS NOT NULL OR p_observed_bytes IS NOT NULL THEN
   RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
 ELSE
  IF j.kind='source_unsigned' THEN
   IF p_storage_object_id IS NOT NULL OR p_storage_version IS NOT NULL OR p_observed_sha256 IS NOT NULL OR p_observed_bytes IS NOT NULL THEN
    RAISE EXCEPTION 'publication_write_reconcile_result' USING ERRCODE='22023'; END IF;
   SELECT id INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id AND dispatch_key=o.dispatch_key AND state='reserved' AND claim_id IS NULL;
   IF g IS NULL THEN RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
   INSERT INTO listing_publication_private.write_settlements(object_id,kind,grant_id) VALUES(o.id,j.kind,g);
  ELSE
   SELECT * INTO w FROM listing_publication_private.web_images WHERE attempt_id=o.attempt_id AND slot_id=o.slot_id;
   IF j.storage_object_id IS NULL OR p_storage_object_id IS DISTINCT FROM j.storage_object_id OR p_storage_version IS DISTINCT FROM j.storage_version
    OR p_observed_sha256 IS DISTINCT FROM w.intent->>'web_sha256' OR p_observed_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
     RAISE EXCEPTION 'publication_write_settlement_binding' USING ERRCODE='22023'; END IF;
   INSERT INTO listing_publication_private.write_settlements(object_id,kind,job_id,claim_id,storage_object_id,storage_version,observed_sha256,observed_bytes)
    VALUES(o.id,j.kind,w.id,w.claim_id,p_storage_object_id,p_storage_version,p_observed_sha256,p_observed_bytes);
  END IF;
  UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id AND state='blocked_write_settlement';
 END IF;
 UPDATE listing_publication_private.write_reconcile_jobs SET
  state=CASE WHEN p_outcome='observed' THEN 'settled' WHEN try_count>=8 OR p_outcome='mismatch' THEN 'needs_attention' ELSE 'retry_wait' END,
  not_before=CASE WHEN p_outcome<>'observed' THEN t+least(3600,30*(2^(try_count-1))::integer)*interval '1 second' END,result=v
 WHERE object_id=o.id RETURNING * INTO j;
 RETURN jsonb_build_object('object_id',j.object_id,'work_key',j.work_key,'state',j.state);
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_write_reconcile_v1(),public.record_listing_write_reconcile_v1(uuid,uuid,text,uuid,text,text,integer)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION listing_publication_private.protect_write_settlement(),listing_publication_private.protect_write_reconcile_job()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_write_settlement(),listing_publication_private.protect_write_reconcile_job()
 TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_write_reconcile_v1() OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_write_reconcile_v1(uuid,uuid,text,uuid,text,text,integer) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.write_settlements IS
 'Cleanup-only source-never-signed / one-WEB-primary-commit witness. Not a reusable SOURCE revocation, provider drain, or fabricated HTTP acknowledgement. Labs/API-closed.';


-- Retained declaration source: supabase/labs/listing-publication-source-no-release-v1/01_source_no_release.sql
-- DORMANT LAB ONLY. Existing source bytes stay unchanged; no API grant or Storage call.
-- A signing response can create a secret on the server without releasing a capability.
-- The unchanged issuer records that secret in a COMMITTED RPC before the owner getter.
-- Thus current state=signing + terminal attempt proves the getter never released it.
-- This is NOT revocation of a recorded token, request expiry or a provider drain.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;

CREATE TABLE listing_publication_private.source_no_release (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 grant_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL UNIQUE,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.source_no_release ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.source_no_release FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.source_no_release FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.source_no_release TO selqiro_listing_final_writer_v1;
CREATE POLICY source_no_release_internal ON listing_publication_private.source_no_release
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_source_no_release() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
 g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_source_no_release_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=NEW.object_id;
 -- Same attempt lock as grant recording, owner retrieval and cancellation. Never
 -- hold a grant row then request a profile; no reverse profile/attempt ordering.
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 IF o.id IS NULL OR a.id IS NULL OR g.id IS NULL OR o.kind<>'source'
  OR a.state NOT IN('cancelled','expired','deleted')
  OR o.bucket_id<>'listing-publication-private'
  OR o.object_path<>'v1/'||a.id::text||'/'||o.slot_id::text||'/source.upload'
  OR g.object_id<>o.id OR g.dispatch_key IS DISTINCT FROM o.dispatch_key
  OR g.state<>'signing' OR g.claim_id IS DISTINCT FROM NEW.claim_id OR g.claimed_at IS NULL
  OR g.token IS NOT NULL OR g.token_sha256 IS NOT NULL OR g.recorded_at IS NOT NULL
  OR g.issued_epoch IS NOT NULL OR g.expires_epoch IS NOT NULL OR g.token_purged_at IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id
     AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path AND c.state='blocked_write_settlement') THEN
  RAISE EXCEPTION 'publication_source_no_release_binding' USING ERRCODE='22023'; END IF;
 NEW.recorded_at:=clock_timestamp();
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_no_release BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_no_release FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_no_release();
CREATE TRIGGER protect_source_no_release_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_no_release FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_no_release();

-- A late broker may still RECEIVE a signing response. It cannot subsequently
-- persist/release that token once this permanent no-release witness was committed.
-- This trigger is deliberately also applied to the unchanged legacy record RPC.
CREATE FUNCTION listing_publication_private.guard_source_grant_after_no_release() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.state='recorded' AND OLD.state='signing' THEN
  PERFORM 1 FROM listing_publication_private.attempts a
   JOIN listing_publication_private.objects o ON o.attempt_id=a.id WHERE o.id=OLD.object_id FOR UPDATE OF a;
  IF EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=OLD.object_id) THEN
   RAISE EXCEPTION 'publication_source_release_sealed' USING ERRCODE='55000'; END IF;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER source_grant_no_release_fence BEFORE UPDATE ON listing_publication_private.upload_grants
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_source_grant_after_no_release();

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- An immutable POST completion OR narrowly proved write settlement may release this target.
 -- Signed SOURCE expiry/readiness/client booleans remain insufficient.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;

CREATE FUNCTION public.settle_unreleased_listing_source_one_v1() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 c listing_publication_private.cleanup%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 -- Acquire attempt BEFORE cleanup; grant recorder and cancellation use this lock.
 -- A busy attempt is skipped. One bounded database transaction, no external I/O/lease.
 SELECT x.* INTO o FROM listing_publication_private.objects x
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 JOIN listing_publication_private.upload_grants ug ON ug.object_id=x.id
 JOIN listing_publication_private.cleanup q ON q.object_id=x.id
 WHERE a.state IN('cancelled','expired','deleted') AND x.kind='source'
  AND x.bucket_id='listing-publication-private' AND x.dispatch_key=ug.dispatch_key
  AND q.bucket_id=x.bucket_id AND q.object_path=x.object_path AND q.state='blocked_write_settlement'
  AND ug.state='signing' AND ug.claim_id IS NOT NULL AND ug.token_sha256 IS NULL
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=x.id)
 ORDER BY q.enqueued_at,x.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id;
 IF c.state<>'blocked_write_settlement' OR g.state<>'signing' THEN RETURN NULL; END IF;
 INSERT INTO listing_publication_private.source_no_release(object_id,grant_id,claim_id) VALUES(o.id,g.id,g.claim_id);
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'grant_id',g.id,'claim_id',g.claim_id,
  'proof','source_signing_never_released','state','settled');
END $f$;

REVOKE ALL ON FUNCTION public.settle_unreleased_listing_source_one_v1(),
 listing_publication_private.protect_source_no_release(),listing_publication_private.guard_source_grant_after_no_release()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_no_release(),
 listing_publication_private.guard_source_grant_after_no_release() TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.settle_unreleased_listing_source_one_v1() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
-- Trigger function owns only the narrow final-writer capabilities, not postgres.
GRANT CREATE ON SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.guard_source_grant_after_no_release() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA listing_publication_private FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.source_no_release IS
 'Terminal source signing never released by the record-before-get broker. Permanent no-release witness; NOT revocation of a recorded/exposed token, expiry/drain evidence, or Storage deletion. API-closed lab only.';


-- Retained declaration source: supabase/labs/listing-publication-source-release-v1/01_release_ledger.sql
-- DORMANT LAB ONLY. No migration, API grants, Storage operation or historical backfill.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;

-- Absence is usable ONLY for grants observed from their actual INSERT in this protocol.
-- Existing recorded grants cannot acquire this coverage marker retrospectively.
CREATE TABLE listing_publication_private.source_release_tracking (
 grant_id uuid PRIMARY KEY REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 dispatch_key uuid NOT NULL,
 tracked_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.source_release_intents (
 grant_id uuid PRIMARY KEY REFERENCES listing_publication_private.upload_grants(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 release_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL,
 token_sha256 bytea NOT NULL CHECK(octet_length(token_sha256)=32),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.source_recorded_no_release (
 object_id uuid PRIMARY KEY REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 grant_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.source_release_tracking(grant_id) ON DELETE RESTRICT,
 claim_id uuid NOT NULL,
 token_sha256 bytea NOT NULL CHECK(octet_length(token_sha256)=32),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DO $acl$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['source_release_tracking','source_release_intents','source_recorded_no_release'] LOOP
  EXECUTE format('ALTER TABLE listing_publication_private.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('ALTER TABLE listing_publication_private.%I FORCE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON listing_publication_private.%I FROM PUBLIC,anon,authenticated,service_role',t);
  EXECUTE format('GRANT SELECT ON listing_publication_private.%I TO selqiro_listing_final_writer_v1',t);
  EXECUTE format('CREATE POLICY release_read_internal ON listing_publication_private.%I FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)',t);
 END LOOP;
END $acl$;
GRANT INSERT ON listing_publication_private.source_release_tracking,listing_publication_private.source_recorded_no_release
 TO selqiro_listing_final_writer_v1;
CREATE POLICY tracking_insert_internal ON listing_publication_private.source_release_tracking FOR INSERT
 TO selqiro_listing_final_writer_v1 WITH CHECK(true);
CREATE POLICY recorded_no_release_insert_internal ON listing_publication_private.source_recorded_no_release FOR INSERT
 TO selqiro_listing_final_writer_v1 WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_source_release_tracking() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' OR pg_trigger_depth()<>2 THEN
  RAISE EXCEPTION 'publication_release_tracking_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 IF g.id IS NULL OR g.state<>'reserved' OR g.claim_id IS NOT NULL OR g.token_sha256 IS NOT NULL
  OR g.object_id IS DISTINCT FROM NEW.object_id OR g.dispatch_key IS DISTINCT FROM NEW.dispatch_key THEN
  RAISE EXCEPTION 'publication_release_tracking_binding' USING ERRCODE='22023'; END IF;
 NEW.tracked_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_release_tracking BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_release_tracking FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_release_tracking();
CREATE TRIGGER protect_source_release_tracking_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_release_tracking FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_release_tracking();
CREATE FUNCTION listing_publication_private.track_source_grant_birth() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 INSERT INTO listing_publication_private.source_release_tracking(grant_id,object_id,dispatch_key)
 VALUES(NEW.id,NEW.object_id,NEW.dispatch_key);
 RETURN NEW;
END $f$;
CREATE TRIGGER track_source_grant_birth AFTER INSERT ON listing_publication_private.upload_grants
 FOR EACH ROW WHEN(NEW.state='reserved') EXECUTE FUNCTION listing_publication_private.track_source_grant_birth();
GRANT CREATE ON SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION listing_publication_private.track_source_grant_birth() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA listing_publication_private FROM selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_release_tracking() TO selqiro_listing_final_writer_v1;

-- Shared by the TWO trusted service RPCs. Reuses existing actor/identity/policy checks.
-- The browser must NOT call the secret-returning SQL function, even with an accidental
-- EXECUTE grant: a caller-controlled rollback could otherwise reveal an untracked token.
CREATE FUNCTION listing_publication_private.lock_source_release_grant(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid)
RETURNS listing_publication_private.upload_grants LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 old_sub text:=current_setting('request.jwt.claim.sub',true); old_claims text:=current_setting('request.jwt.claims',true);
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 active_id:=listing_publication_private.lock_upload_service_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id
  AND x.actor_user_id=p_expected_user_id AND x.identity_id=active_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' OR a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 PERFORM set_config('request.jwt.claim.sub',p_expected_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_expected_user_id)::text,true);
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 PERFORM set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);
 PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
 SELECT x.* INTO g FROM listing_publication_private.upload_grants x
  JOIN listing_publication_private.objects o ON o.id=x.object_id WHERE x.id=p_grant_id
  AND x.dispatch_key=p_dispatch_key AND o.dispatch_key=p_dispatch_key AND o.attempt_id=a.id
  AND o.slot_id=p_slot_id AND o.kind='source' FOR SHARE OF x;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_upload_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 RETURN g;
END $f$;

CREATE FUNCTION listing_publication_private.protect_source_release_intent() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 -- Existing upload secret RPC owner is postgres; this does not grant the final
 -- cleaner role the ability to invent release intents or read secrets through an API.
 IF TG_OP<>'INSERT' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_release_intent_immutable' USING ERRCODE='55000'; END IF;
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 SELECT a0.* INTO a FROM listing_publication_private.attempts a0 JOIN listing_publication_private.objects o
  ON o.attempt_id=a0.id WHERE o.id=g.object_id FOR UPDATE OF a0;
 IF g.id IS NULL OR a.id IS NULL OR a.state<>'open' OR a.expires_at<=clock_timestamp()
  OR g.state<>'recorded' OR g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  OR g.object_id IS DISTINCT FROM NEW.object_id OR g.claim_id IS DISTINCT FROM NEW.claim_id
  OR g.token_sha256 IS DISTINCT FROM NEW.token_sha256
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=g.object_id) THEN
  RAISE EXCEPTION 'publication_release_intent_binding' USING ERRCODE='22023'; END IF;
 NEW.release_id:=gen_random_uuid(); NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_release_intent BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_release_intents FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_release_intent();
CREATE TRIGGER protect_source_release_intent_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_release_intents FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_release_intent();

-- Signature retained, returned outer envelope gains release_id; all old browser/API
-- callers are refused by actual role before secrets. Only the revised server issuer
-- may use this read, then verify the committed receipt in another HTTP transaction.
CREATE OR REPLACE FUNCTION public.get_my_listing_upload_grant_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; r listing_publication_private.source_release_intents%ROWTYPE;
BEGIN
 g:=listing_publication_private.lock_source_release_grant(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_dispatch_key,p_grant_id);
 IF g.state<>'recorded' THEN RETURN jsonb_build_object('state','pending','grant',NULL,'release_id',NULL); END IF;
 IF g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
  RETURN jsonb_build_object('state','expired','grant',NULL,'release_id',NULL); END IF;
 SELECT * INTO r FROM listing_publication_private.source_release_intents WHERE grant_id=g.id;
 IF NOT FOUND THEN
  INSERT INTO listing_publication_private.source_release_intents(grant_id,object_id,claim_id,token_sha256)
   VALUES(g.id,g.object_id,g.claim_id,g.token_sha256) RETURNING * INTO r;
 END IF;
 IF r.object_id<>g.object_id OR r.claim_id<>g.claim_id OR r.token_sha256<>g.token_sha256 THEN
  RAISE EXCEPTION 'publication_release_receipt_conflict' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('state','ready','release_id',r.release_id,'grant',listing_publication_private.upload_binding(g.id)||
  jsonb_build_object('token',g.token,'issued_epoch',g.issued_epoch,'expires_epoch',g.expires_epoch));
END $f$;

-- NO INSERT here. A second HTTP transaction must see the SAME committed intent.
CREATE FUNCTION public.confirm_listing_upload_release_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_dispatch_key uuid,p_grant_id uuid,p_release_id uuid,p_token_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp
SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; r listing_publication_private.source_release_intents%ROWTYPE;
BEGIN
 g:=listing_publication_private.lock_source_release_grant(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_dispatch_key,p_grant_id);
 IF p_token_sha256 IS NULL OR p_token_sha256 !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'publication_release_not_confirmed' USING ERRCODE='55000'; END IF;
 SELECT * INTO r FROM listing_publication_private.source_release_intents WHERE grant_id=g.id;
 IF NOT FOUND OR p_release_id IS NULL OR r.release_id IS DISTINCT FROM p_release_id OR g.state<>'recorded'
  OR g.token IS NULL OR g.expires_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint
  OR r.token_sha256 IS DISTINCT FROM decode(p_token_sha256,'hex') OR r.token_sha256 IS DISTINCT FROM g.token_sha256
  OR r.object_id IS DISTINCT FROM g.object_id OR r.claim_id IS DISTINCT FROM g.claim_id THEN
  RAISE EXCEPTION 'publication_release_not_confirmed' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('release_id',r.release_id,'grant_id',g.id,'confirmed',true);
END $f$;

CREATE FUNCTION listing_publication_private.protect_source_recorded_no_release() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; o listing_publication_private.objects%ROWTYPE;
 a listing_publication_private.attempts%ROWTYPE; t listing_publication_private.source_release_tracking%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_recorded_no_release_immutable' USING ERRCODE='55000'; END IF;
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=NEW.object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE id=NEW.grant_id;
 SELECT * INTO t FROM listing_publication_private.source_release_tracking WHERE grant_id=NEW.grant_id;
 IF o.id IS NULL OR a.id IS NULL OR g.id IS NULL OR t.grant_id IS NULL
  OR o.kind<>'source' OR a.state NOT IN('cancelled','expired','deleted')
  OR o.bucket_id<>'listing-publication-private'
  OR o.object_path<>'v1/'||a.id::text||'/'||o.slot_id::text||'/source.upload'
  OR g.object_id IS DISTINCT FROM o.id OR t.object_id IS DISTINCT FROM o.id
  OR g.dispatch_key IS DISTINCT FROM o.dispatch_key OR t.dispatch_key IS DISTINCT FROM g.dispatch_key
  OR g.state<>'recorded' OR g.claim_id IS DISTINCT FROM NEW.claim_id
  OR g.token_sha256 IS DISTINCT FROM NEW.token_sha256
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=g.id)
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id
   AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND q.state='blocked_write_settlement') THEN
  RAISE EXCEPTION 'publication_recorded_no_release_binding' USING ERRCODE='22023'; END IF;
 NEW.recorded_at:=clock_timestamp(); RETURN NEW;
END $f$;
CREATE TRIGGER protect_source_recorded_no_release BEFORE INSERT OR UPDATE OR DELETE
 ON listing_publication_private.source_recorded_no_release FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_source_recorded_no_release();
CREATE TRIGGER protect_source_recorded_no_release_truncate BEFORE TRUNCATE
 ON listing_publication_private.source_recorded_no_release FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_source_recorded_no_release();

CREATE FUNCTION public.settle_recorded_unreleased_source_one_v1() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE o listing_publication_private.objects%ROWTYPE; g listing_publication_private.upload_grants%ROWTYPE;
 q listing_publication_private.cleanup%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT x.* INTO o FROM listing_publication_private.objects x
 JOIN listing_publication_private.attempts a ON a.id=x.attempt_id
 JOIN listing_publication_private.upload_grants ug ON ug.object_id=x.id
 JOIN listing_publication_private.source_release_tracking t ON t.grant_id=ug.id AND t.object_id=x.id AND t.dispatch_key=ug.dispatch_key
 JOIN listing_publication_private.cleanup c ON c.object_id=x.id
 WHERE a.state IN('cancelled','expired','deleted') AND x.kind='source'
  AND ug.state='recorded' AND x.dispatch_key=ug.dispatch_key
  AND x.bucket_id='listing-publication-private' AND c.bucket_id=x.bucket_id AND c.object_path=x.object_path
  AND c.state='blocked_write_settlement'
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=ug.id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=x.id)
 ORDER BY c.enqueued_at,x.id LIMIT 1 FOR UPDATE OF a SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO q FROM listing_publication_private.cleanup WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE object_id=o.id;
 IF q.state<>'blocked_write_settlement' OR g.state<>'recorded'
  OR EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents r WHERE r.grant_id=g.id) THEN RETURN NULL; END IF;
 INSERT INTO listing_publication_private.source_recorded_no_release(object_id,grant_id,claim_id,token_sha256)
 VALUES(o.id,g.id,g.claim_id,g.token_sha256);
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id;
 RETURN jsonb_build_object('schema_version',1,'object_id',o.id,'grant_id',g.id,'claim_id',g.claim_id,
  'proof','source_recorded_never_released','state','settled');
END $f$;

GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.settle_recorded_unreleased_source_one_v1() OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.protect_source_recorded_no_release() TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid),
 public.confirm_listing_upload_release_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text),
 public.settle_recorded_unreleased_source_one_v1(),
 listing_publication_private.lock_source_release_grant(uuid,uuid,uuid,uuid,uuid,uuid),
 listing_publication_private.protect_source_release_tracking(),listing_publication_private.track_source_grant_birth(),
 listing_publication_private.protect_source_release_intent(),listing_publication_private.protect_source_recorded_no_release()
 FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.source_release_intents IS
 'Immutable MAY-HAVE-BEEN-RELEASED ledger, not delivery success, revocation, upload completion or expiry. No token bytes. Broker must confirm committed intent in a separate transaction before returning token. API-closed lab.';
COMMENT ON TABLE listing_publication_private.source_release_tracking IS
 'Coverage from reserved grant birth only. NO BACKFILL. Absence for preexisting grants is UNKNOWN. Does not establish no exposure through privileged/uncontrolled paths.';

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- An immutable POST completion OR narrowly proved write settlement may release this target.
 -- Signed SOURCE expiry/readiness/client booleans remain insufficient.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;



-- COMPONENT 30_multipart_and_journey.sql
-- GENERATED by scripts/hosted/compose_publication_release.py; review source-provenance.json.

-- Retained declaration source: supabase/labs/listing-publication-journey-v2/01_isolation_and_status.sql
SELECT listing_publication_private.assert_hosted_install_context();

-- Seal an uncertain, not-yet-observed prepare under the same profile lock used by
-- prepare. A late request cannot create a new attempt after cancellation is confirmed.
CREATE TABLE listing_publication_private.closed_journey_requests (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL, request_key uuid NOT NULL,
 closed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,identity_id,request_key)
);
ALTER TABLE listing_publication_private.closed_journey_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.closed_journey_requests FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION listing_publication_private.guard_closed_journey_request() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$ BEGIN
 IF EXISTS(SELECT 1 FROM listing_publication_private.closed_journey_requests
  WHERE actor_user_id=NEW.actor_user_id AND identity_id=NEW.identity_id AND request_key=NEW.request_key)
 THEN RAISE EXCEPTION 'publication_request_closed' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_closed_journey_request BEFORE INSERT ON listing_publication_private.attempts
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_closed_journey_request();

CREATE FUNCTION public.get_my_listing_publication_journey_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO a FROM listing_publication_private.attempts
 WHERE actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('snapshot',NULL,'receipt',NULL,'intent_closed',EXISTS(
  SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id
  AND identity_id=p_expected_identity_id AND request_key=p_request_key)); END IF;
 RETURN jsonb_build_object('snapshot',listing_publication_private.snapshot(a.id),
   'receipt',listing_publication_private.final_receipt(a.id),'intent_closed',a.state IN('cancelled','expired','deleted'));
END $f$;
REVOKE ALL ON FUNCTION public.get_my_listing_publication_journey_v2(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.cancel_my_listing_publication_journey_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'request_key_required' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id
  AND identity_id=p_expected_identity_id AND request_key=p_request_key) THEN
  PERFORM public.cancel_my_listing_publication_v1(p_expected_user_id,p_expected_identity_id,p_request_key);
 ELSE
  IF (SELECT count(*) FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id)>=1000
    AND NOT EXISTS(SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id
      AND identity_id=p_expected_identity_id AND request_key=p_request_key)
  THEN RAISE EXCEPTION 'publication_request_limit' USING ERRCODE='54000'; END IF;
  INSERT INTO listing_publication_private.closed_journey_requests(actor_user_id,identity_id,request_key)
   VALUES(p_expected_user_id,p_expected_identity_id,p_request_key) ON CONFLICT DO NOTHING;
 END IF;
 RETURN public.get_my_listing_publication_journey_v2(p_expected_user_id,p_expected_identity_id,p_request_key);
END $f$;
REVOKE ALL ON FUNCTION public.cancel_my_listing_publication_journey_v2(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_managed_listing_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id !~'^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807
 THEN RAISE EXCEPTION 'listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR SHARE OF a;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid));
END $f$;
REVOKE ALL ON FUNCTION public.get_my_managed_listing_v2(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

-- Authenticated grants are applied only by the new isolated runtime after marker verification.


-- Retained declaration source: supabase/labs/listing-publication-multipart-v2/01_sessions.sql
-- Integrated disposable V2 protocol. Load AFTER the accepted SOURCE RELEASE labs.
-- Not a production migration. No browser/service API EXECUTE grants are opened here.
-- Hosted provider protocol: supabase-s3-session-v1; provider build is not asserted.
-- Only a complete, successful server-owned CompleteMultipartUpload response plus
-- the same primary listing_publication_private.hosted_storage_objects version closes the final-object writer.
-- Abort, ListParts/404, deadlines, readiness and client ETags do not close it.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;

CREATE TABLE listing_publication_private.multipart_attempts (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE listing_publication_private.multipart_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 object_id uuid NOT NULL UNIQUE REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 provider_contract text NOT NULL DEFAULT 'supabase-s3-session-v1'
  CHECK(provider_contract='supabase-s3-session-v1'),
 create_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 state text NOT NULL DEFAULT 'creating' CHECK(state IN('creating','open','completing','completed','needs_attention')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 upload_id text UNIQUE CHECK(upload_id IS NULL OR octet_length(upload_id) BETWEEN 1 AND 2048),
 storage_version text CHECK(storage_version IS NULL OR storage_version ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 create_received_at timestamptz,
 part_key uuid UNIQUE,
 part_sign_epoch bigint,
 complete_key uuid UNIQUE,
 part_etag text,
 complete_etag text,
 storage_object_id uuid UNIQUE,
 completed_at timestamptz,
 observed_sha256 text CHECK(observed_sha256 IS NULL OR observed_sha256 ~ '^[0-9a-f]{64}$'),
 observed_bytes integer CHECK(observed_bytes IS NULL OR observed_bytes BETWEEN 1 AND 26214400),
 verified_at timestamptz,
 problem text CHECK(problem IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired')),
 CHECK((upload_id IS NULL)=(storage_version IS NULL) AND (upload_id IS NULL)=(create_received_at IS NULL)),
 CHECK((part_key IS NULL)=(part_sign_epoch IS NULL)),
 CHECK((complete_key IS NULL)=(part_etag IS NULL)),
 CHECK((completed_at IS NULL)=(storage_object_id IS NULL) AND (completed_at IS NULL)=(complete_etag IS NULL)),
 CHECK((verified_at IS NULL)=(observed_sha256 IS NULL) AND (verified_at IS NULL)=(observed_bytes IS NULL)),
 CHECK(verified_at IS NULL OR completed_at IS NOT NULL),
 CHECK((state='creating' AND upload_id IS NULL AND completed_at IS NULL)
  OR (state='open' AND upload_id IS NOT NULL AND complete_key IS NULL AND completed_at IS NULL)
  OR (state='completing' AND upload_id IS NOT NULL AND complete_key IS NOT NULL AND completed_at IS NULL)
  OR (state='completed' AND complete_key IS NOT NULL AND completed_at IS NOT NULL)
  OR (state='needs_attention' AND completed_at IS NULL AND problem IS NOT NULL))
);
-- This receipt is deliberately unavailable to app RPCs. An isolated runtime oracle
-- inserts it only after the owned Storage process has exited and its actual private
-- volume scan proves that this uploadId has no remaining temporary parts.
-- Stopping the process is the fixture's drain; hosted Storage has no equivalent
-- established here. A live-file-directory/FD snapshot alone is insufficient.
CREATE TABLE listing_publication_private.multipart_auxiliary_receipts (
 session_id uuid PRIMARY KEY REFERENCES listing_publication_private.multipart_sessions(id) ON DELETE RESTRICT,
 run_id uuid NOT NULL,
 storage_instance_id text NOT NULL CHECK(octet_length(storage_instance_id) BETWEEN 1 AND 256),
 process_exit_observed_at timestamptz NOT NULL,
 process_exit_evidence_sha256 text NOT NULL CHECK(process_exit_evidence_sha256 ~ '^[0-9a-f]{64}$'),
 volume_scan_evidence_sha256 text NOT NULL CHECK(volume_scan_evidence_sha256 ~ '^[0-9a-f]{64}$'),
 observed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE listing_publication_private.multipart_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_auxiliary_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_auxiliary_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.multipart_attempts,listing_publication_private.multipart_sessions,
 listing_publication_private.multipart_auxiliary_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON listing_publication_private.multipart_attempts TO selqiro_listing_final_writer_v1;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.multipart_sessions TO selqiro_listing_final_writer_v1;
GRANT SELECT ON listing_publication_private.multipart_auxiliary_receipts TO selqiro_listing_final_writer_v1;
CREATE POLICY multipart_attempt_internal ON listing_publication_private.multipart_attempts
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY multipart_session_internal ON listing_publication_private.multipart_sessions
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY multipart_auxiliary_internal ON listing_publication_private.multipart_auxiliary_receipts
 FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
-- Application-owned, column- and bucket-bounded metadata witnesses.
CREATE VIEW listing_publication_private.hosted_s3_multipart_uploads WITH (security_barrier=true) AS
 SELECT s.id,s.bucket_id,s.key,s.version FROM storage.s3_multipart_uploads s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.multipart_attempts a ON a.attempt_id=o.attempt_id
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.key);
CREATE VIEW listing_publication_private.hosted_s3_multipart_uploads_parts WITH (security_barrier=true) AS
 SELECT s.upload_id,s.bucket_id,s.key,s.version,s.part_number,s.etag,s.size,s.created_at
 FROM storage.s3_multipart_uploads_parts s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.multipart_attempts a ON a.attempt_id=o.attempt_id
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.key);
REVOKE ALL ON listing_publication_private.hosted_s3_multipart_uploads,
 listing_publication_private.hosted_s3_multipart_uploads_parts,listing_publication_private.hosted_storage_objects
 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON listing_publication_private.hosted_s3_multipart_uploads,
 listing_publication_private.hosted_s3_multipart_uploads_parts,listing_publication_private.hosted_storage_objects
 TO selqiro_listing_final_writer_v1;

CREATE FUNCTION listing_publication_private.protect_multipart_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'INSERT' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o WHERE o.attempt_id=NEW.attempt_id AND o.dispatch_key IS NOT NULL)
  OR EXISTS(SELECT 1 FROM listing_publication_private.web_images w WHERE w.attempt_id=NEW.attempt_id) THEN
  RAISE EXCEPTION 'publication_multipart_legacy_domain' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_multipart_attempt BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_attempts
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt();
CREATE TRIGGER protect_multipart_attempt_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_attempts
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_attempt();
CREATE FUNCTION listing_publication_private.guard_legacy_source_in_multipart() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.dispatch_key IS NOT NULL AND EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts m WHERE m.attempt_id=NEW.attempt_id) THEN
  RAISE EXCEPTION 'publication_multipart_legacy_source_closed' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_legacy_source_in_multipart BEFORE UPDATE ON listing_publication_private.objects
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_legacy_source_in_multipart();
CREATE FUNCTION listing_publication_private.protect_multipart_session() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'creating' OR NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o
   JOIN listing_publication_private.multipart_attempts m ON m.attempt_id=o.attempt_id
   WHERE o.id=NEW.object_id AND o.dispatch_key IS NULL) THEN
   RAISE EXCEPTION 'publication_multipart_binding' USING ERRCODE='22023'; END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['state','upload_id','storage_version','create_received_at','part_key','part_sign_epoch',
  'complete_key','part_etag','complete_etag','storage_object_id','completed_at','observed_sha256','observed_bytes','verified_at','problem'])
  IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','upload_id','storage_version','create_received_at','part_key','part_sign_epoch',
  'complete_key','part_etag','complete_etag','storage_object_id','completed_at','observed_sha256','observed_bytes','verified_at','problem']) THEN
  RAISE EXCEPTION 'publication_multipart_immutable' USING ERRCODE='55000'; END IF;
 IF (OLD.upload_id IS NOT NULL AND ROW(NEW.upload_id,NEW.storage_version,NEW.create_received_at) IS DISTINCT FROM ROW(OLD.upload_id,OLD.storage_version,OLD.create_received_at))
  OR (OLD.part_key IS NOT NULL AND ROW(NEW.part_key,NEW.part_sign_epoch) IS DISTINCT FROM ROW(OLD.part_key,OLD.part_sign_epoch))
  OR (OLD.complete_key IS NOT NULL AND ROW(NEW.complete_key,NEW.part_etag) IS DISTINCT FROM ROW(OLD.complete_key,OLD.part_etag))
  OR (OLD.completed_at IS NOT NULL AND ROW(NEW.completed_at,NEW.complete_etag,NEW.storage_object_id) IS DISTINCT FROM ROW(OLD.completed_at,OLD.complete_etag,OLD.storage_object_id))
  OR (OLD.verified_at IS NOT NULL AND ROW(NEW.verified_at,NEW.observed_sha256,NEW.observed_bytes) IS DISTINCT FROM ROW(OLD.verified_at,OLD.observed_sha256,OLD.observed_bytes)) THEN
  RAISE EXCEPTION 'publication_multipart_immutable' USING ERRCODE='55000'; END IF;
 IF (OLD.state='creating' AND NEW.state IN('open','needs_attention'))
  OR (OLD.state='open' AND NEW.state IN('open','completing','needs_attention'))
  OR (OLD.state IN('completing','needs_attention') AND NEW.state='completed' AND OLD.complete_key IS NOT NULL)
  OR (OLD.state='completing' AND NEW.state='needs_attention')
  OR (OLD.state='completed' AND NEW.state='completed') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_multipart_transition' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_multipart_session BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_sessions
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_session();
CREATE TRIGGER protect_multipart_session_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_sessions
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_session();
CREATE FUNCTION listing_publication_private.protect_multipart_auxiliary() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RAISE EXCEPTION 'publication_hosted_terminal_cleanup_unavailable' USING ERRCODE='55000';
END $f$;
CREATE TRIGGER protect_multipart_auxiliary BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_auxiliary_receipts
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary();
CREATE TRIGGER protect_multipart_auxiliary_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_auxiliary_receipts
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_auxiliary();

CREATE FUNCTION listing_publication_private.multipart_binding(p_object uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',2,'session_id',m.id,'object_id',o.id,'kind',o.kind,
  'attempt_id',o.attempt_id,'slot_id',o.slot_id,'request_key',m.request_key,'bucket_id',o.bucket_id,'object_path',o.object_path,
  'expected_bytes',CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END,
  'expected_sha256',CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END,
  'state',m.state,'upload_id',m.upload_id,'storage_version',m.storage_version,'part_key',m.part_key,
  'part_sign_epoch',m.part_sign_epoch,'complete_key',m.complete_key,'part_etag',m.part_etag,
  'storage_object_id',m.storage_object_id,'completed',m.completed_at IS NOT NULL,'verified',m.verified_at IS NOT NULL,'problem',m.problem)
 FROM listing_publication_private.multipart_sessions m JOIN listing_publication_private.objects o ON o.id=m.object_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id
 LEFT JOIN listing_publication_private.web_images w ON w.slot_id=o.slot_id WHERE o.id=p_object;
$f$;
-- Existing actor/policy locks historically execute inside postgres-owned API
-- functions. Keep that exact bounded authority at one private boundary instead
-- of granting this new ledger writer profile/identity mutation privileges.
CREATE FUNCTION listing_publication_private.lock_multipart_context(p_user uuid,p_identity uuid,p_attempt uuid,p_service boolean)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT listing_publication_private.lock_web_context(p_user,p_identity,p_attempt,p_service);
$f$;
CREATE FUNCTION listing_publication_private.lock_multipart_object(p_user uuid,p_identity uuid,p_attempt uuid,p_slot uuid,p_kind text)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE oid uuid;
BEGIN
 PERFORM listing_publication_private.lock_multipart_context(p_user,p_identity,p_attempt,true);
 IF p_kind IS NULL OR p_kind NOT IN('source','web') THEN RAISE EXCEPTION 'publication_multipart_kind' USING ERRCODE='22023'; END IF;
 SELECT id INTO oid FROM listing_publication_private.objects WHERE attempt_id=p_attempt AND slot_id=p_slot AND kind=p_kind;
 IF oid IS NULL THEN RAISE EXCEPTION 'publication_multipart_object_unavailable' USING ERRCODE='P0002'; END IF;
 RETURN oid;
END $f$;

CREATE FUNCTION public.reserve_listing_multipart_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; allowed boolean:=false; w listing_publication_private.web_images%ROWTYPE;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_multipart_request' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts WHERE attempt_id=p_attempt_id) THEN
  IF p_kind<>'source' THEN RAISE EXCEPTION 'publication_multipart_source_required' USING ERRCODE='55000'; END IF;
  INSERT INTO listing_publication_private.multipart_attempts(attempt_id) VALUES(p_attempt_id);
 END IF;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NOT NULL THEN
  IF m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_request_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  IF p_kind='web' THEN
   SELECT * INTO w FROM listing_publication_private.web_images WHERE slot_id=p_slot_id;
   IF w.state<>'prepared' OR w.request_key IS DISTINCT FROM p_request_key OR w.write_before_epoch<=floor(extract(epoch FROM clock_timestamp()))::bigint THEN
    RAISE EXCEPTION 'publication_multipart_web_intent_required' USING ERRCODE='55000'; END IF;
  END IF;
  -- An existing final object or another provider session is never silently adopted.
  IF EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.name WHERE o.id=oid)
   OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.key WHERE o.id=oid) THEN
   RAISE EXCEPTION 'publication_multipart_provider_path_occupied' USING ERRCODE='55000'; END IF;
  INSERT INTO listing_publication_private.multipart_sessions(object_id,request_key) VALUES(oid,p_request_key) RETURNING * INTO m;
  allowed:=true;
 END IF;
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'create_allowed',allowed,
  'create_key',CASE WHEN allowed THEN m.create_key END);
END $f$;
CREATE FUNCTION public.get_listing_multipart_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid;
 IF m.id IS NULL THEN RETURN NULL; END IF;
 IF m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN listing_publication_private.multipart_binding(oid);
END $f$;
-- Record genuine Create acknowledgement even if cancellation has closed publication.
-- It retains cleanup lineage; it does not authorize a part or a Complete operation.
CREATE FUNCTION public.record_listing_multipart_created_v2(p_object_id uuid,p_create_key uuid,p_upload_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; o listing_publication_private.objects%ROWTYPE; v text;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 PERFORM listing_publication_private.assert_hosted_preview_object(p_object_id);
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 IF m.id IS NULL OR m.create_key IS DISTINCT FROM p_create_key OR p_create_key IS NULL THEN
  RAISE EXCEPTION 'publication_multipart_create_claim' USING ERRCODE='42501'; END IF;
 IF m.upload_id IS NOT NULL THEN
  IF m.upload_id IS DISTINCT FROM p_upload_id THEN RAISE EXCEPTION 'publication_multipart_create_conflict' USING ERRCODE='22023'; END IF;
  RETURN listing_publication_private.multipart_binding(o.id);
 END IF;
 IF m.state<>'creating' THEN RAISE EXCEPTION 'publication_multipart_create_closed' USING ERRCODE='55000'; END IF;
 SELECT u.version INTO v FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=p_upload_id AND u.bucket_id=o.bucket_id AND u.key=o.object_path
  AND (SELECT count(*) FROM listing_publication_private.hosted_s3_multipart_uploads x WHERE x.bucket_id=o.bucket_id AND x.key=o.object_path)=1;
 IF v IS NULL OR v!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
  RAISE EXCEPTION 'publication_multipart_provider_binding' USING ERRCODE='22023'; END IF;
 UPDATE listing_publication_private.multipart_sessions SET state='open',upload_id=p_upload_id,storage_version=v,create_received_at=clock_timestamp()
  WHERE object_id=o.id;
 RETURN listing_publication_private.multipart_binding(o.id);
END $f$;
CREATE FUNCTION public.claim_listing_multipart_part_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; allowed boolean:=false;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NULL OR m.request_key IS DISTINCT FROM p_request_key OR m.state<>'open' OR m.problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_multipart_part_closed' USING ERRCODE='55000'; END IF;
 IF m.part_key IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET part_key=gen_random_uuid(),part_sign_epoch=floor(extract(epoch FROM clock_timestamp()))::bigint
   WHERE object_id=oid RETURNING * INTO m;
  allowed:=true;
 END IF;
 -- SOURCE can recover the exact same presign, never a replacement uploadId/expiry.
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'part_allowed',allowed OR p_kind='source');
END $f$;
CREATE FUNCTION public.claim_listing_multipart_complete_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text,p_part_etag text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; et text; allowed boolean:=false;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 IF m.id IS NULL OR m.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_multipart_binding' USING ERRCODE='22023'; END IF;
 IF m.state='open' AND m.problem IS NULL THEN
  -- Native 1.83.5 insertUploadPart omits size; parts.size remains its default 0.
  -- Do not manufacture a size receipt. SOURCE admission binds Content-Length,
  -- and BOTH kinds require an exact full GET length+SHA256 before verification.
  SELECT p.etag INTO et FROM listing_publication_private.hosted_s3_multipart_uploads_parts p
   JOIN listing_publication_private.objects o ON o.id=oid
   WHERE p.upload_id=m.upload_id AND p.part_number=1 AND p.version=m.storage_version
    AND p.bucket_id=o.bucket_id AND p.key=o.object_path ORDER BY p.created_at DESC LIMIT 1;
  IF m.part_key IS NULL OR et IS DISTINCT FROM p_part_etag OR et IS NULL
   OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts p WHERE p.upload_id=m.upload_id AND p.part_number<>1) THEN
   RAISE EXCEPTION 'publication_multipart_part_not_verified' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.multipart_sessions SET state='completing',complete_key=gen_random_uuid(),part_etag=et
   WHERE object_id=oid RETURNING * INTO m;
  allowed:=true;
 END IF;
 RETURN jsonb_build_object('session',listing_publication_private.multipart_binding(oid),'complete_allowed',allowed);
END $f$;
CREATE FUNCTION public.record_listing_multipart_completed_v2(p_object_id uuid,p_complete_key uuid,p_complete_etag text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; o listing_publication_private.objects%ROWTYPE; sid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 PERFORM listing_publication_private.assert_hosted_preview_object(p_object_id);
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 IF m.id IS NULL OR m.complete_key IS DISTINCT FROM p_complete_key OR p_complete_key IS NULL
  OR p_complete_etag IS NULL OR octet_length(p_complete_etag) NOT BETWEEN 1 AND 256 THEN
  RAISE EXCEPTION 'publication_multipart_complete_claim' USING ERRCODE='42501'; END IF;
 IF m.completed_at IS NOT NULL THEN
  IF m.complete_etag IS DISTINCT FROM p_complete_etag THEN RAISE EXCEPTION 'publication_multipart_complete_conflict' USING ERRCODE='22023'; END IF;
  RETURN listing_publication_private.multipart_binding(o.id);
 END IF;
 IF m.state NOT IN('completing','needs_attention') OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id) THEN
  RAISE EXCEPTION 'publication_multipart_session_not_closed' USING ERRCODE='55000'; END IF;
 SELECT s.id INTO sid FROM listing_publication_private.hosted_storage_objects s WHERE s.bucket_id=o.bucket_id AND s.name=o.object_path AND s.version=m.storage_version
  AND (SELECT count(*) FROM listing_publication_private.hosted_storage_objects x WHERE x.bucket_id=o.bucket_id AND x.name=o.object_path)=1;
 IF sid IS NULL THEN RAISE EXCEPTION 'publication_multipart_committed_version_mismatch' USING ERRCODE='55000'; END IF;
 -- Caller has consumed a genuine successful Complete response, not HEAD or a client claim.
 UPDATE listing_publication_private.multipart_sessions SET state='completed',complete_etag=p_complete_etag,
  storage_object_id=sid,completed_at=clock_timestamp(),problem=NULL WHERE object_id=o.id;
 UPDATE listing_publication_private.cleanup SET state='pending' WHERE object_id=o.id AND state='blocked_write_settlement';
 RETURN listing_publication_private.multipart_binding(o.id);
END $f$;
CREATE FUNCTION public.record_listing_multipart_verified_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,
 p_slot_id uuid,p_request_key uuid,p_kind text,p_observed_sha256 text,p_observed_bytes integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE oid uuid; m listing_publication_private.multipart_sessions%ROWTYPE; b jsonb;
BEGIN
 oid:=listing_publication_private.lock_multipart_object(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_slot_id,p_kind);
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=oid FOR UPDATE;
 b:=listing_publication_private.multipart_binding(oid);
 IF m.state IS DISTINCT FROM 'completed' OR m.problem IS NOT NULL OR m.request_key IS DISTINCT FROM p_request_key
  OR p_observed_sha256 IS DISTINCT FROM b->>'expected_sha256' OR p_observed_bytes IS DISTINCT FROM (b->>'expected_bytes')::integer
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects s JOIN listing_publication_private.objects o ON o.bucket_id=s.bucket_id AND o.object_path=s.name
   WHERE o.id=oid AND s.id=m.storage_object_id AND s.version=m.storage_version) THEN
  RAISE EXCEPTION 'publication_multipart_readback_mismatch' USING ERRCODE='22023'; END IF;
 IF m.verified_at IS NULL THEN UPDATE listing_publication_private.multipart_sessions SET observed_sha256=p_observed_sha256,
  observed_bytes=p_observed_bytes,verified_at=clock_timestamp() WHERE object_id=oid; END IF;
 RETURN listing_publication_private.multipart_binding(oid);
END $f$;
CREATE FUNCTION public.record_listing_multipart_problem_v2(p_object_id uuid,p_problem text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; aid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 PERFORM listing_publication_private.assert_hosted_preview_object(p_object_id);
 SELECT attempt_id INTO aid FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=aid FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=p_object_id FOR UPDATE;
 IF m.id IS NULL OR p_problem IS NULL OR p_problem NOT IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired') THEN RAISE EXCEPTION 'publication_multipart_problem' USING ERRCODE='22023'; END IF;
 IF m.problem IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET problem=p_problem,state=CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'needs_attention' END
   WHERE object_id=p_object_id;
 END IF;
 RETURN listing_publication_private.multipart_binding(p_object_id);
END $f$;

CREATE OR REPLACE FUNCTION public.claim_listing_web_image_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_request_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE; t timestamptz; allowed boolean:=false;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_web_request_invalid' USING ERRCODE='22023'; END IF;
 -- New-domain SOURCE requires genuine Complete and actual whole-object byte verification.
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.slots s
  JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='source'
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  WHERE s.id=p_slot_id AND s.attempt_id=p_attempt_id AND o.dispatch_key IS NULL
   AND m.state='completed' AND m.verified_at IS NOT NULL AND m.problem IS NULL AND m.request_key=p_request_key) THEN
  RAISE EXCEPTION 'publication_web_source_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT x.* INTO w FROM listing_publication_private.web_images x WHERE x.slot_id=p_slot_id FOR UPDATE;
 IF FOUND THEN
  IF w.request_key IS DISTINCT FROM p_request_key THEN RAISE EXCEPTION 'publication_web_request_conflict' USING ERRCODE='22023'; END IF;
 ELSE
  t:=clock_timestamp();
  INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state)
   VALUES(p_attempt_id,p_slot_id,p_request_key,t,floor(extract(epoch FROM t))::bigint+120,'processing') RETURNING * INTO w;
  allowed:=true;
 END IF;
 -- No takeover/reprocessing on timeout. Uncertain processing stays visible for reconciliation/cancel.
 RETURN jsonb_build_object('binding',listing_publication_private.web_binding(w.id),'state',w.state,
  'process_allowed',allowed,'claim_id',CASE WHEN allowed THEN w.claim_id ELSE NULL END,
  'process_before_epoch',w.process_before_epoch,'intent',w.intent,'receipt',listing_publication_private.web_receipt(w.id));
END $f$;


CREATE OR REPLACE FUNCTION public.record_listing_web_ready_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_attempt_id uuid,p_slot_id uuid,p_job_id uuid,p_observed_sha256 text,p_observed_bytes integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $f$
DECLARE w listing_publication_private.web_images%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.lock_web_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,true);
 SELECT x.* INTO w FROM listing_publication_private.web_images x
  WHERE x.id=p_job_id AND x.attempt_id=p_attempt_id AND x.slot_id=p_slot_id FOR UPDATE;
 IF NOT FOUND OR w.state NOT IN('prepared','ready') THEN RAISE EXCEPTION 'publication_web_not_prepared' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  JOIN listing_publication_private.hosted_storage_objects s ON s.id=m.storage_object_id AND s.version=m.storage_version AND s.bucket_id=o.bucket_id AND s.name=o.object_path
  WHERE o.attempt_id=p_attempt_id AND o.slot_id=p_slot_id AND o.kind='web' AND o.dispatch_key IS NULL
   AND m.state='completed' AND m.verified_at IS NOT NULL AND m.problem IS NULL
   AND m.observed_sha256=p_observed_sha256 AND m.observed_bytes=p_observed_bytes) THEN
  RAISE EXCEPTION 'publication_multipart_web_completion_required' USING ERRCODE='55000'; END IF;
 -- Trusted server supplies these ONLY after a bounded authenticated full-object GET,
 -- hashing the actual bytes, not trusting Storage metadata/ETag/a client statement.
 IF p_observed_sha256 IS DISTINCT FROM w.intent->>'web_sha256'
  OR p_observed_bytes IS DISTINCT FROM (w.intent->>'web_bytes')::integer THEN
  RAISE EXCEPTION 'publication_web_readback_mismatch' USING ERRCODE='22023'; END IF;
 IF w.state='prepared' THEN
  UPDATE listing_publication_private.web_images SET state='ready',ready_id=gen_random_uuid(),ready_at=clock_timestamp()
   WHERE id=w.id RETURNING * INTO w;
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.web_receipt(w.id));
END $f$;


CREATE FUNCTION listing_publication_private.legacy_cleanup_state_before_multipart_v2(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=o.id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=o.id) THEN 'pending'
  WHEN o.dispatch_key IS NOT NULL THEN 'blocked_write_settlement'
  WHEN o.kind='web' AND EXISTS(SELECT 1 FROM listing_publication_private.web_images w
   WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.job_id=w.id
      AND r.object_id=o.id AND r.claim_id=w.claim_id AND r.sent_sha256=w.intent->>'web_sha256'
      AND r.sent_bytes=(w.intent->>'web_bytes')::integer)) THEN 'blocked_write_settlement'
  ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;



CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN m.id IS NOT NULL THEN
  CASE WHEN m.completed_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
   THEN 'pending' ELSE 'blocked_write_settlement' END
  WHEN EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts a WHERE a.attempt_id=o.attempt_id) THEN 'pending'
  ELSE listing_publication_private.legacy_cleanup_state_before_multipart_v2(o.id) END
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;
CREATE FUNCTION listing_publication_private.multipart_object_fully_deleted(p_id uuid) RETURNS boolean LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(c.state='deleted',false) AND (m.id IS NULL OR
  (EXISTS(SELECT 1 FROM listing_publication_private.multipart_auxiliary_receipts r WHERE r.session_id=m.id)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)))
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 -- An immutable POST completion OR narrowly proved write settlement may release this target.
 -- Signed SOURCE expiry/readiness/client booleans remain insufficient.
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_sessions m WHERE m.object_id=NEW.object_id AND m.completed_at IS NOT NULL))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.final_receipt(p_attempt uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'listing_id',p.listing_id::text,
 'state',CASE WHEN p.state='published' THEN 'published' WHEN EXISTS(
 SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)) THEN 'deleting' ELSE 'deleted' END,
 'published_at',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'content_deleted',p.state='deleting',
 'files_remaining',(SELECT count(*) FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id=a.id AND (p.state='deleting' OR o.kind='source') AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)))
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id WHERE a.id=p_attempt;
$f$;

-- Keep the accepted quota charged until BOTH final object and multipart auxiliary data are proved removed.
CREATE OR REPLACE FUNCTION public.prepare_my_listing_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_input jsonb,p_images jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; n jsonb; images jsonb; fingerprint bytea; policies jsonb;
 a listing_publication_private.attempts%ROWTYPE; slot_id uuid; image record;
 at_time timestamptz; reserved bigint;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023';
 END IF;
 n:=public.normalize_listing_creation_v1(p_input);
 IF n->>'language'<>'et' OR n->'location'->>'country'='' OR n->'location'->>'city'=''
    OR n->'location'->>'latitude' IS NOT NULL OR n->'location'->>'longitude' IS NOT NULL THEN
  RAISE EXCEPTION 'publication_form_scope_invalid' USING ERRCODE='22023';
 END IF;
 images:=listing_publication_private.normalize_images(p_images);
 fingerprint:=sha256(convert_to('selqiro-publication-attempt-v1:'||jsonb_build_object('input',n,'images',images)::text,'UTF8'));
 SELECT x.* INTO a FROM listing_publication_private.attempts x
  WHERE x.actor_user_id=p_expected_user_id AND x.request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF a.identity_id IS DISTINCT FROM active_id OR a.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';
  END IF;
  -- Recovery only; do not rewrite content, move deadline, issue permission or reopen a tombstone.
  RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',true);
 END IF;
 policies:=listing_publication_private.require_policies();
 at_time:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.state='open' AND x.expires_at>at_time)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';
 END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
     AND x.created_at>at_time-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';
 END IF;
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts x ON x.id=o.attempt_id WHERE x.actor_user_id=p_expected_user_id AND NOT listing_publication_private.multipart_object_fully_deleted(o.id);
 -- Signed uploads cannot be bounded by the untrusted declared size. Reserve FULL per-object maxima.
 -- No budget is released until the future Storage settlement/cleanup contract proves it safe.
 IF reserved+jsonb_array_length(images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
   payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,active_id,p_request_key,fingerprint,n,policies,at_time,at_time+interval '24 hours') RETURNING * INTO a;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(a.id,image.ordinality-1,(image.value->>'client_file_id')::uuid,
    (image.value->>'byte_length')::integer,decode(image.value->>'sha256','hex')) RETURNING id INTO slot_id;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(a.id,slot_id,'source','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/source.upload',26214400),
        (a.id,slot_id,'web','listing-publication-private','v1/'||a.id::text||'/'||slot_id::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('replayed',false);
END $fn$;
REVOKE ALL ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;



CREATE OR REPLACE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,
  'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight') OR (c.state='deleted' AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),
  'needs_attention',count(*) FILTER(WHERE c.state='needs_attention' OR m.problem IS NOT NULL),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id))))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;


-- Server-only protocol RPCs remain API-closed until the isolated runtime grants the
-- exact allowlist. No legacy signed-SOURCE/POST-WEB route is activated alongside them.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
DO $acl$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN('reserve_listing_multipart_v2','get_listing_multipart_v2',
   'record_listing_multipart_created_v2','claim_listing_multipart_part_v2','claim_listing_multipart_complete_v2',
   'record_listing_multipart_completed_v2','record_listing_multipart_verified_v2','record_listing_multipart_problem_v2') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO selqiro_listing_final_writer_v1',r.signature);
 END LOOP;
END $acl$;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE listing_publication_private.multipart_sessions IS
 'New isolated V2 SOURCE/WEB: server-only one Create and one Complete, browser UploadPart only. Unknown effects retain lineage and block cleanup. Genuine Complete and primary version close only the final-object writer, not auxiliary parts.';
COMMENT ON TABLE listing_publication_private.multipart_auxiliary_receipts IS
 'Fixture oracle only, no app RPC. Actual owned Storage process exit plus exact private-volume absence evidence. This does not establish hosted Supabase abort/drain guarantees.';


-- Retained declaration source: supabase/labs/listing-publication-multipart-v2/03_settlement.sql
-- Continue the same disposable attempt flow after owner cancel/delete. Abort is
-- withdrawal of a known uploadId, NOT a drain receipt or a fabricated Complete.
-- Hosted terminal cleanup has no accepted oracle; cleanup and reservations remain held.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;

-- Preserve a concrete terminal image/processor reason across route/module
-- boundaries. No new decoder, processing takeover, or fabricated WEB receipt.
ALTER TABLE listing_publication_private.multipart_sessions DROP CONSTRAINT multipart_sessions_problem_check;
ALTER TABLE listing_publication_private.multipart_sessions ADD CONSTRAINT multipart_sessions_problem_check
 CHECK(problem IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired','image_rejected','image_processor_unavailable'));
CREATE OR REPLACE FUNCTION public.record_listing_multipart_problem_v2(p_object_id uuid,p_problem text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; aid uuid;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 PERFORM listing_publication_private.assert_hosted_preview_object(p_object_id);
 SELECT attempt_id INTO aid FROM listing_publication_private.objects WHERE id=p_object_id;
 PERFORM 1 FROM listing_publication_private.attempts WHERE id=aid FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=p_object_id FOR UPDATE;
 IF m.id IS NULL OR p_problem IS NULL OR p_problem NOT IN('create_outcome_unknown','part_outcome_unknown','complete_outcome_unknown',
  'provider_mismatch','source_mismatch','web_mismatch','part_window_expired','image_rejected','image_processor_unavailable') THEN
  RAISE EXCEPTION 'publication_multipart_problem' USING ERRCODE='22023'; END IF;
 IF m.problem IS NULL THEN
  UPDATE listing_publication_private.multipart_sessions SET problem=p_problem,state=CASE WHEN completed_at IS NOT NULL THEN 'completed' ELSE 'needs_attention' END
   WHERE object_id=p_object_id;
 END IF;
 RETURN listing_publication_private.multipart_binding(p_object_id);
END $f$;

CREATE TABLE listing_publication_private.multipart_abort_observations (
 session_id uuid PRIMARY KEY REFERENCES listing_publication_private.multipart_sessions(id) ON DELETE RESTRICT,
 abort_key uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 outcome text CHECK(outcome IN('aborted','absent')),
 observed_at timestamptz,
 CHECK((outcome IS NULL)=(observed_at IS NULL))
);
ALTER TABLE listing_publication_private.multipart_abort_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_publication_private.multipart_abort_observations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.multipart_abort_observations FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON listing_publication_private.multipart_abort_observations TO selqiro_listing_final_writer_v1;
CREATE POLICY multipart_abort_internal ON listing_publication_private.multipart_abort_observations
 FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION listing_publication_private.protect_multipart_abort() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_final_writer_v1' OR TG_OP NOT IN('INSERT','UPDATE') THEN
  RAISE EXCEPTION 'publication_multipart_lineage_retained' USING ERRCODE='55000'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.outcome IS NOT NULL OR NEW.observed_at IS NOT NULL OR NOT EXISTS(
   SELECT 1 FROM listing_publication_private.multipart_sessions m
   JOIN listing_publication_private.objects o ON o.id=m.object_id
   JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
   WHERE m.id=NEW.session_id AND m.upload_id IS NOT NULL AND m.create_received_at IS NOT NULL
    AND m.completed_at IS NULL AND a.state IN('cancelled','expired','deleted')) THEN
   RAISE EXCEPTION 'publication_multipart_abort_context' USING ERRCODE='55000'; END IF;
  RETURN NEW;
 END IF;
 IF ROW(NEW.session_id,NEW.abort_key,NEW.requested_at) IS DISTINCT FROM ROW(OLD.session_id,OLD.abort_key,OLD.requested_at)
  OR OLD.observed_at IS NOT NULL OR NEW.observed_at IS NULL OR NEW.outcome IS NULL THEN
  RAISE EXCEPTION 'publication_multipart_abort_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_multipart_abort BEFORE INSERT OR UPDATE OR DELETE ON listing_publication_private.multipart_abort_observations
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.protect_multipart_abort();
CREATE TRIGGER protect_multipart_abort_truncate BEFORE TRUNCATE ON listing_publication_private.multipart_abort_observations
 FOR EACH STATEMENT EXECUTE FUNCTION listing_publication_private.protect_multipart_abort();

CREATE FUNCTION listing_publication_private.lock_multipart_cleanup_context(p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 active_id:=listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 -- The current authorizer may be another active business member of the same
 -- identity. The accepted identity lock above checks their actual access; the
 -- original publisher remains unchanged in attempts/publication receipts.
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt
  AND identity_id=active_id AND request_key=p_request FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts m WHERE m.attempt_id=a.id) THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 IF a.state NOT IN('cancelled','expired','deleted','published') THEN
  RAISE EXCEPTION 'publication_multipart_cleanup_not_terminal' USING ERRCODE='55000'; END IF;
 RETURN a.id;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_multipart_auxiliary() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RAISE EXCEPTION 'publication_hosted_terminal_cleanup_unavailable' USING ERRCODE='55000';
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN m.id IS NOT NULL THEN
  CASE WHEN NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path
   AND (z.version IS DISTINCT FROM m.storage_version OR (m.storage_object_id IS NOT NULL AND z.id<>m.storage_object_id)))
   AND (m.completed_at IS NOT NULL OR EXISTS(
    SELECT 1 FROM listing_publication_private.multipart_abort_observations b
    JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=b.session_id
    WHERE b.session_id=m.id AND b.observed_at IS NOT NULL AND b.observed_at<=r.process_exit_observed_at
     AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id)))
   THEN 'pending' ELSE 'blocked_write_settlement' END
  WHEN EXISTS(SELECT 1 FROM listing_publication_private.multipart_attempts a WHERE a.attempt_id=o.attempt_id) THEN 'pending'
  ELSE listing_publication_private.legacy_cleanup_state_before_multipart_v2(o.id) END
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_cleanup() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP<>'UPDATE' OR current_user<>'selqiro_listing_final_writer_v1' THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_retained' USING ERRCODE='55000'; END IF;
 IF OLD.state='blocked_write_settlement' AND NEW.state='pending'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND listing_publication_private.object_cleanup_state(NEW.object_id)='pending'
  AND (EXISTS(SELECT 1 FROM listing_publication_private.web_write_completions r WHERE r.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.write_settlements s WHERE s.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release n WHERE n.object_id=NEW.object_id)
    OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_sessions m WHERE m.object_id=NEW.object_id
      AND (m.completed_at IS NOT NULL OR EXISTS(SELECT 1 FROM listing_publication_private.multipart_abort_observations b
       JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=b.session_id
       WHERE b.session_id=m.id AND b.observed_at<=r.process_exit_observed_at))))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','work_key','lease_until','try_count','not_before','last_error','deleted_at'])
 OR OLD.state IN('deleted','blocked_write_settlement','needs_attention') THEN
  RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000'; END IF;
 IF NEW.state='in_flight' AND NEW.try_count=OLD.try_count+1 AND NEW.work_key IS NOT NULL
  AND NEW.work_key IS DISTINCT FROM OLD.work_key AND NEW.lease_until>clock_timestamp()
  AND ((OLD.state IN('pending','retry_wait') AND (OLD.not_before IS NULL OR OLD.not_before<=clock_timestamp()))
   OR (OLD.state='in_flight' AND OLD.lease_until<=clock_timestamp())) THEN RETURN NEW; END IF;
 IF OLD.state='in_flight' AND NEW.state IN('deleted','retry_wait','needs_attention')
  AND NEW.work_key=OLD.work_key AND NEW.lease_until=OLD.lease_until AND NEW.try_count=OLD.try_count THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'publication_cleanup_transition_forbidden' USING ERRCODE='55000';
END $f$;

CREATE FUNCTION public.prepare_listing_multipart_cleanup_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid;
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 -- Abort is idempotent withdrawal of a known terminal uploadId. A replay may
 -- repeat that withdrawal until a real response is recorded; no new writer opens.
 INSERT INTO listing_publication_private.multipart_abort_observations(session_id)
 SELECT m.id FROM listing_publication_private.multipart_sessions m JOIN listing_publication_private.objects o ON o.id=m.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id=aid AND a.state IN('cancelled','expired','deleted') AND m.completed_at IS NULL
  AND m.upload_id IS NOT NULL AND m.create_received_at IS NOT NULL
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.multipart_abort_observations b WHERE b.session_id=m.id);
 UPDATE listing_publication_private.cleanup c SET state='pending'
 FROM listing_publication_private.objects o WHERE c.object_id=o.id AND o.attempt_id=aid
  AND c.state='blocked_write_settlement' AND listing_publication_private.object_cleanup_state(o.id)='pending';
 -- These counts describe the same immutable selection and can overlap. They
 -- report durable work without admitting any writer or opening a cleanup gate.
 RETURN (SELECT jsonb_build_object('schema_version',3,'attempt_id',aid,'request_key',p_request_key,
  'files_remaining',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),
  'unresolved',count(*) FILTER(WHERE m.id IS NOT NULL AND m.completed_at IS NULL AND b.observed_at IS NULL),
  'needs_attention',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND (c.state='needs_attention' OR m.problem IS NOT NULL)),
  'blocked',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND c.state='blocked_write_settlement'),
  'auxiliary_pending',count(*) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)
    AND m.id IS NOT NULL AND r.session_id IS NULL),
  'items',coalesce(jsonb_agg(jsonb_build_object('object_id',o.id,'session',CASE WHEN m.id IS NULL THEN NULL ELSE listing_publication_private.multipart_binding(o.id) END,
    'abort_key',b.abort_key,'abort_allowed',b.session_id IS NOT NULL AND b.observed_at IS NULL,
    'abort_observed',b.observed_at IS NOT NULL,'auxiliary_observed',r.session_id IS NOT NULL) ORDER BY o.id),'[]'::jsonb))
 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_abort_observations b ON b.session_id=m.id
 LEFT JOIN listing_publication_private.multipart_auxiliary_receipts r ON r.session_id=m.id
 WHERE a.id=aid AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source')));
END $f$;

CREATE FUNCTION public.record_listing_multipart_abort_v2(p_object_id uuid,p_abort_key uuid,p_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE m listing_publication_private.multipart_sessions%ROWTYPE; b listing_publication_private.multipart_abort_observations%ROWTYPE;
 o listing_publication_private.objects%ROWTYPE; a listing_publication_private.attempts%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 SELECT * INTO o FROM listing_publication_private.objects WHERE id=p_object_id;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=o.attempt_id FOR UPDATE;
 SELECT * INTO m FROM listing_publication_private.multipart_sessions WHERE object_id=o.id FOR UPDATE;
 SELECT * INTO b FROM listing_publication_private.multipart_abort_observations WHERE session_id=m.id FOR UPDATE;
 IF a.state NOT IN('cancelled','expired','deleted') OR b.abort_key IS DISTINCT FROM p_abort_key OR p_abort_key IS NULL
  OR b.session_id IS NULL OR p_outcome IS NULL OR p_outcome NOT IN('aborted','absent') THEN
  RAISE EXCEPTION 'publication_multipart_abort_binding' USING ERRCODE='42501'; END IF;
 IF b.observed_at IS NULL THEN
  IF EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id)
   OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path
     AND z.version IS DISTINCT FROM m.storage_version) THEN
   RAISE EXCEPTION 'publication_multipart_abort_not_observed' USING ERRCODE='55000'; END IF;
  UPDATE listing_publication_private.multipart_abort_observations SET outcome=p_outcome,observed_at=clock_timestamp()
   WHERE session_id=m.id RETURNING * INTO b;
 END IF;
 -- This receipt never changes m.state to completed, never claims temp absence,
 -- and never opens the cleanup gate without the actual native process oracle.
 RETURN jsonb_build_object('object_id',o.id,'abort_key',b.abort_key,'outcome',b.outcome,'observed',b.observed_at IS NOT NULL);
END $f$;

-- Exact-attempt claim for the EXISTING createCleanupOne transport and recorder.
CREATE FUNCTION public.claim_listing_cleanup_for_attempt_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 aid:=listing_publication_private.lock_multipart_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.id=aid AND (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source'))
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t)) OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF c.try_count>=8 THEN
  UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
  RETURN NULL;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
  try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
 RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
  'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
END $f$;

CREATE OR REPLACE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,
  'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight') OR (c.state='deleted' AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),
  'needs_attention',count(*) FILTER(WHERE c.state='needs_attention' OR (m.problem IS NOT NULL AND NOT listing_publication_private.multipart_object_fully_deleted(o.id))),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id))))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE NOT listing_publication_private.multipart_object_fully_deleted(o.id)),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;

GRANT EXECUTE ON FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid),
 listing_publication_private.protect_multipart_abort() TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.lock_multipart_cleanup_context(uuid,uuid,uuid,uuid),
 listing_publication_private.protect_multipart_abort() FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
DO $acl$ DECLARE r record; BEGIN
 FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN('prepare_listing_multipart_cleanup_v2','record_listing_multipart_abort_v2','claim_listing_cleanup_for_attempt_v2') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',r.signature);
  EXECUTE format('ALTER FUNCTION %s OWNER TO selqiro_listing_final_writer_v1',r.signature);
 END LOOP;
END $acl$;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
COMMENT ON TABLE listing_publication_private.multipart_abort_observations IS
 'Known terminal uploadId withdrawal only. Actual server Abort/NoSuchUpload response plus primary row absence; temp/drain requires separate genuine native stopped-process oracle. Original Complete-unknown lineage remains unchanged.';



-- COMPONENT 40_read_models_and_owner.sql
-- GENERATED by scripts/hosted/compose_publication_release.py; review source-provenance.json.

SELECT listing_publication_private.assert_hosted_install_context();

-- Retained declaration source: supabase/labs/listing-public-read-v1/10_price_read_model.sql
CREATE FUNCTION public.listing_price_read_model_v1(
  k text, a numeric, c text, r bigint, legacy text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
BEGIN
  IF public.listing_price_tuple_valid_v1(k,a,c,r,legacy) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_read_price_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('version',1,'kind',k,
    'amount',CASE WHEN k IS NULL THEN NULL ELSE a::text END,
    'currency',c,'legacy_text',CASE WHEN k IS NULL THEN legacy ELSE NULL END,
    'legacy_amount',CASE WHEN k IS NULL AND a >= 0
      AND a::text NOT IN ('NaN','Infinity','-Infinity') THEN a::text ELSE NULL END);
END $fn$;

-- Retained declaration source: supabase/labs/listing-public-read-v1/11_public_search_v2.sql
-- CLOSED LOCAL CANDIDATE. v1, its index, predicates and clients remain unchanged.
CREATE FUNCTION public.search_public_listings_v2(p_search_query text DEFAULT ''::text, p_category text DEFAULT NULL::text, p_subcategory text DEFAULT NULL::text, p_detail_category text DEFAULT NULL::text, p_condition text DEFAULT NULL::text, p_location_query text DEFAULT ''::text, p_result_limit integer DEFAULT 24, p_result_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
declare
  v_query text := btrim(coalesce(p_search_query, ''));
  v_location text := btrim(coalesce(p_location_query, ''));
  v_category text := nullif(btrim(p_category), '');
  v_subcategory text := nullif(btrim(p_subcategory), '');
  v_detail text := nullif(btrim(p_detail_category), '');
  v_condition text := nullif(btrim(p_condition), '');
  v_actor uuid := public.listing_actor_uid_hosted_v1();
  v_tsquery tsquery;
  v_result jsonb;
begin
  if char_length(v_query) > 160 or char_length(v_location) > 160 then
    raise exception 'listing_search_text_too_long' using errcode = '22023';
  end if;
  if p_result_limit is null or p_result_limit < 1 or p_result_limit > 60
    or p_result_offset is null or p_result_offset < 0 or p_result_offset > 100000 then
    raise exception 'listing_search_pagination_invalid' using errcode = '22023';
  end if;
  if (v_category is not null and (char_length(v_category) > 120 or v_category !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and (char_length(v_subcategory) > 160 or v_subcategory !~ '^[a-z][a-z0-9_]*$'))
    or (v_detail is not null and (char_length(v_detail) > 160 or v_detail !~ '^[a-z][a-z0-9_]*$'))
    or (v_subcategory is not null and v_category is null)
    or (v_detail is not null and v_subcategory is null) then
    raise exception 'listing_search_category_path_invalid' using errcode = '22023';
  end if;
  if v_condition is not null and v_condition not in ('new', 'used', 'damaged') then
    raise exception 'listing_search_condition_invalid' using errcode = '22023';
  end if;
  -- Plain words are ANDed. No user-controlled SQL, FTS syntax or implicit AI query.
  -- The old search_vector contains raw location and arbitrary details: do not use it.
  v_tsquery := plainto_tsquery('pg_catalog.simple'::regconfig, v_query);
  with matched as materialized (
    select l.id, l.created_at, l.title, left(l.description, 280) as description_preview,
      l.price, l.price_amount, l.price_kind, l.currency, l.price_revision, l.category, l.subcategory, l.condition, l.country, l.city,
      case when jsonb_typeof(l.details -> 'detailCategory') = 'string'
        then l.details ->> 'detailCategory' else null end as detail_category,
      l.image as fallback_image, ip.display_name as seller_name, ip.slug as seller_slug,
      ip.avatar_url as seller_avatar_url, i.type as seller_type
    from public.listings l
    join public.identities i on i.id = l.identity_id and i.status = 'active'
    join public.identity_profiles ip on ip.identity_id = i.id
    where l.status = 'active'
      and (l.active_until is null or l.active_until > now())
      and (v_query = '' or
        public.public_listing_search_document_v1(l.title, l.description, l.category, l.subcategory, l.details) @@ v_tsquery)
      and (v_category is null or l.category = v_category)
      and (v_subcategory is null or l.subcategory = v_subcategory)
      and (v_detail is null or (jsonb_typeof(l.details -> 'detailCategory') = 'string'
        and l.details ->> 'detailCategory' = v_detail))
      and (v_condition is null or l.condition = v_condition)
      and (v_location = '' or strpos(lower(coalesce(l.city, '') || ' ' || coalesce(l.country, '')), lower(v_location)) > 0)
      -- Preserve the existing account-block meaning, now before count/pagination.
      -- This is not a new business/identity-level block policy.
      and not exists (
        select 1 from public.user_blocks b
        where v_actor is not null and (
          (b.blocker_id = v_actor and b.blocked_id = l.user_id)
          or (b.blocked_id = v_actor and b.blocker_id = l.user_id)
        )
      )
  ), page as (
    select m.* from matched m
    order by m.created_at desc, m.id desc
    limit p_result_limit offset p_result_offset
  ), cards as (
    select p.id, p.created_at, jsonb_build_object(
      'content_type', 'listing', 'content_id', p.id::text,
      'title', p.title, 'description_preview', p.description_preview,
      'price', public.listing_price_read_model_v1(p.price_kind,p.price_amount,
        p.currency,p.price_revision,p.price),
      'category', p.category, 'subcategory', p.subcategory,
      'detail_category', p.detail_category, 'condition', p.condition,
      'country', p.country, 'city', p.city,
      'image_url', coalesce(img.thumb_url, img.medium_url, img.original_url, p.fallback_image),
      'seller_name', p.seller_name, 'seller_slug', p.seller_slug,
      'seller_avatar_url', p.seller_avatar_url, 'seller_type', p.seller_type,
      'created_at', p.created_at
    ) as card
    from page p
    left join lateral (
      select li.thumb_url, li.medium_url, li.original_url from public.listing_images li
      where li.listing_id = p.id
      order by li.is_primary desc nulls last, li.sort_order asc nulls last,
        li.created_at asc nulls last, li.id asc
      limit 1
    ) img on true
  ), totals as (select count(*) as n from matched)
  select jsonb_build_object(
    'schema_version', 2, 'content_scope', 'ordinary_listings', 'sort', 'newest',
    'items', coalesce((select jsonb_agg(c.card order by c.created_at desc, c.id desc) from cards c), '[]'::jsonb),
    'total_count', t.n::text, 'result_limit', p_result_limit, 'result_offset', p_result_offset,
    'has_more', t.n > p_result_offset::bigint + p_result_limit,
    'next_offset', case when t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit <= 100000 then p_result_offset + p_result_limit else null end,
    'window_limit_reached', t.n > p_result_offset::bigint + p_result_limit
      and p_result_offset + p_result_limit > 100000
  ) into v_result from totals t;
  return v_result;
end;
$function$;
ALTER FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer) IS
  'Closed local exact-price reader: schema 2 public ordinary cards, no revisions/receipts; v1 visibility, filters, counts and order. Not activated.';


-- Retained declaration source: supabase/labs/listing-public-read-v1/12_public_detail_fields.sql
-- CLOSED LOCAL DISPLAY REGISTRY, independently derived from the current category form.
-- Not the FTS allowlist. Changing this helper never changes the search index.
CREATE FUNCTION public.public_listing_detail_field_spec_v1(p_path text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path=pg_catalog,pg_temp
AS $fn$
  SELECT CASE p_path
    WHEN ARRAY['vehicles','cars','passenger_cars']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','suv_offroad']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','vans_minibuses']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','pickup_trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','cars','motorhomes_campers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"sleeping_places","label":"Sleeping places"},{"key":"length","label":"Length"},{"key":"gross_weight","label":"Gross weight"},{"key":"equipment","label":"Equipment"}]'::jsonb
    WHEN ARRAY['vehicles','cars','racing_vehicles']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"body_type","label":"Body type"},{"key":"doors","label":"Number of doors"},{"key":"seats","label":"Seats"},{"key":"color","label":"Color"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"discipline","label":"Discipline"},{"key":"roll_cage","label":"Roll cage"},{"key":"homologation","label":"Homologation"},{"key":"track_street_legal","label":"Track / street legal"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','sport_bikes']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','cruisers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','touring']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','enduro_mx']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','scooters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','atv_utv']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"mileage","label":"Mileage"},{"key":"transmission","label":"Transmission"},{"key":"type","label":"Type"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"drivetrain","label":"Drivetrain"},{"key":"winch","label":"Winch"},{"key":"road_legal","label":"Road legal"}]'::jsonb
    WHEN ARRAY['vehicles','motorcycles','snowmobiles']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"engine_size","label":"Engine size"},{"key":"power","label":"Power"},{"key":"mileage","label":"Mileage"},{"key":"track_length","label":"Track length"},{"key":"electric_start","label":"Electric start"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','semi_trucks']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','buses']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"gearbox","label":"Gearbox"},{"key":"mileage","label":"Mileage"},{"key":"seats","label":"Seats"},{"key":"axle_configuration","label":"Axle configuration"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"load_space_length","label":"Load space length"},{"key":"load_space_width","label":"Load space width"},{"key":"load_space_height","label":"Load space height"},{"key":"tachograph","label":"Tachograph"},{"key":"vin","label":"VIN"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trucks_commercial','commercial_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','tractors']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"seats","label":"Seats"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','harvesters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"header_width","label":"Header width"},{"key":"crop_type","label":"Crop type"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','excavators']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"bucket_size","label":"Bucket size"},{"key":"lift_capacity","label":"Lift capacity"},{"key":"reach","label":"Reach"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','forestry_machinery']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"lift_capacity","label":"Lift capacity"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','construction_machinery']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"machine_type","label":"Machine type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"working_hours","label":"Working hours"},{"key":"fuel","label":"Fuel"},{"key":"drivetrain_tracks","label":"Drivetrain / tracks"},{"key":"weight","label":"Weight"},{"key":"attachment_type","label":"Attachment type"},{"key":"hydraulics","label":"Hydraulics"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"operating_weight","label":"Operating weight"},{"key":"bucket_size","label":"Bucket size"},{"key":"lift_capacity","label":"Lift capacity"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','agricultural_attachments_implements']::text[] THEN '[{"key":"implement_type","label":"Implement type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"working_width","label":"Working width"},{"key":"attachment_type","label":"Attachment type"},{"key":"compatible_machine","label":"Compatible machine"},{"key":"pto_required","label":"PTO required"},{"key":"hydraulics_required","label":"Hydraulics required"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','agricultural_heavy_machinery','agricultural_heavy_machinery_spare_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"compatible_machine","label":"Compatible machine"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','marine','boats']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','yachts']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','jet_skis']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"type","label":"Type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"material","label":"Material"},{"key":"engine_type","label":"Engine type"},{"key":"engine_power","label":"Engine power"},{"key":"fuel","label":"Fuel"},{"key":"engine_hours","label":"Engine hours"},{"key":"cabins","label":"Cabins"},{"key":"trailer_included","label":"Trailer included"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','marine','boat_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','marine','outboard_motors']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"power","label":"Power"},{"key":"fuel","label":"Fuel"},{"key":"shaft_length","label":"Shaft length"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','airplanes']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"range","label":"Range"},{"key":"registration_number","label":"Registration number"},{"key":"serial_number","label":"Serial number"},{"key":"maintenance_status","label":"Maintenance status"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','helicopters']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"power","label":"Power"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"range","label":"Range"},{"key":"registration_number","label":"Registration number"},{"key":"serial_number","label":"Serial number"},{"key":"maintenance_status","label":"Maintenance status"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','ultralights']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"aircraft_type","label":"Aircraft type"},{"key":"engine","label":"Engine"},{"key":"flight_hours","label":"Flight hours"},{"key":"seats","label":"Seats"},{"key":"registration_number","label":"Registration number"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','drones']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"camera","label":"Camera"},{"key":"flight_time","label":"Flight time"},{"key":"range","label":"Range"},{"key":"battery_count","label":"Battery count"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','aviation','aircraft_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"serial_number","label":"Serial number"},{"key":"compatible_aircraft","label":"Compatible aircraft"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','light_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','car_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','cargo_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','caravans']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"},{"key":"sleeping_places","label":"Sleeping places"},{"key":"heating","label":"Heating"},{"key":"kitchen","label":"Kitchen"},{"key":"toilet_shower","label":"Toilet / shower"},{"key":"awning","label":"Awning"}]'::jsonb
    WHEN ARRAY['vehicles','trailers','horse_livestock_trailers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"trailer_type","label":"Trailer type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"gross_weight","label":"Gross weight"},{"key":"empty_weight","label":"Empty weight"},{"key":"payload","label":"Payload"},{"key":"axles","label":"Axles"},{"key":"brake_type","label":"Brake type"},{"key":"vin_serial","label":"VIN / serial number"},{"key":"registration_number","label":"Registration number"},{"key":"inspection_valid_until","label":"Inspection valid until"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','engines_engine_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"brand","label":"Brand"},{"key":"engine_type","label":"Engine type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','transmission_drivetrain']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"gearbox_type","label":"Gearbox type"},{"key":"drivetrain_type","label":"Drivetrain type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','suspension_steering']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','brakes']::text[] THEN '[{"key":"brake_type","label":"Brake type"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','electrical_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"voltage","label":"Voltage"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','batteries']::text[] THEN '[{"key":"battery_type","label":"Battery type"},{"key":"capacity","label":"Capacity"},{"key":"voltage","label":"Voltage"},{"key":"cca","label":"CCA"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','starters_alternators']::text[] THEN '[{"key":"part_type","label":"Part type"},{"key":"voltage","label":"Voltage"},{"key":"power_rating","label":"Power rating"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','body_parts']::text[] THEN '[{"key":"body_part_type","label":"Body part type"},{"key":"side_position","label":"Side / position"},{"key":"color","label":"Color"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','lights_lamps']::text[] THEN '[{"key":"light_type","label":"Light type"},{"key":"technology","label":"Technology"},{"key":"side_position","label":"Side / position"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','interior_parts']::text[] THEN '[{"key":"interior_part_type","label":"Interior part type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','exhaust_parts']::text[] THEN '[{"key":"exhaust_part_type","label":"Exhaust part type"},{"key":"material","label":"Material"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','cooling_heating']::text[] THEN '[{"key":"part_type","label":"Part type"},{"key":"coolant_type","label":"Coolant type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','fuel_system']::text[] THEN '[{"key":"fuel_system_part","label":"Fuel system part"},{"key":"fuel_type","label":"Fuel type"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','tires']::text[] THEN '[{"key":"width","label":"Width"},{"key":"profile","label":"Profile"},{"key":"diameter","label":"Diameter"},{"key":"season","label":"Season"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"load_index","label":"Load index"},{"key":"speed_index","label":"Speed index"},{"key":"tread_depth","label":"Tread depth"},{"key":"quantity","label":"Quantity"},{"key":"dot_year","label":"DOT year"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','wheels_rims']::text[] THEN '[{"key":"diameter","label":"Diameter"},{"key":"width","label":"Width"},{"key":"bolt_pattern","label":"Bolt pattern"},{"key":"offset","label":"ET / offset"},{"key":"center_bore","label":"Center bore"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','accessories']::text[] THEN '[{"key":"accessory_type","label":"Accessory type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"part_number","label":"Part number"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','riding_racing_gear']::text[] THEN '[{"key":"gear_type","label":"Gear type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"discipline","label":"Discipline"},{"key":"certification","label":"Certification"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','spare_parts']::text[] THEN '[{"key":"part_name","label":"Part name"},{"key":"manufacturer","label":"Manufacturer"},{"key":"part_number","label":"Part number"},{"key":"oem_number","label":"OEM number"},{"key":"fits_brand","label":"Fits brand"},{"key":"fits_model","label":"Fits model"},{"key":"fits_generation","label":"Fits generation / body code"},{"key":"fits_year_from","label":"Fits year from"},{"key":"fits_year_to","label":"Fits year to"},{"key":"fits_engine","label":"Fits engine"},{"key":"fits_gearbox","label":"Fits gearbox"},{"key":"side_position","label":"Side / position"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['vehicles','vehicle_parts','vehicle_for_parts']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"year","label":"Year"},{"key":"generation","label":"Generation / body code"},{"key":"fuel","label":"Fuel"},{"key":"engine","label":"Engine"},{"key":"gearbox","label":"Gearbox"},{"key":"drivetrain","label":"Drivetrain"},{"key":"mileage","label":"Mileage"},{"key":"vin","label":"VIN"},{"key":"condition","label":"Condition"},{"key":"available_parts","label":"Available parts"}]'::jsonb
    WHEN ARRAY['electronics','phones']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"storage","label":"Storage"},{"key":"ram","label":"RAM"},{"key":"color","label":"Color"},{"key":"sim_type","label":"SIM type"},{"key":"battery_health","label":"Battery health"},{"key":"screen_condition","label":"Screen condition"},{"key":"network_lock","label":"Network lock"},{"key":"imei_serial","label":"IMEI / serial number"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['electronics','computers']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"processor","label":"Processor"},{"key":"ram","label":"RAM"},{"key":"storage","label":"Storage"},{"key":"graphics_card","label":"Graphics card"},{"key":"screen_size","label":"Screen size"},{"key":"operating_system","label":"Operating system"},{"key":"battery_health","label":"Battery health"},{"key":"serial_number","label":"Serial number"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['electronics','tv_audio']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"screen_size","label":"Screen size"},{"key":"display_type","label":"Display type"},{"key":"resolution","label":"Resolution"},{"key":"smart_tv","label":"Smart TV"},{"key":"audio_type","label":"Audio type"},{"key":"power_output","label":"Power output"},{"key":"connections","label":"Connections"},{"key":"remote_included","label":"Remote included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','cameras']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"camera_type","label":"Camera type"},{"key":"lens_included","label":"Lens included"},{"key":"sensor_size","label":"Sensor size"},{"key":"megapixels","label":"Megapixels"},{"key":"shutter_count","label":"Shutter count"},{"key":"video_resolution","label":"Video resolution"},{"key":"battery_count","label":"Battery count"},{"key":"memory_card_included","label":"Memory card included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','gaming']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"platform","label":"Platform"},{"key":"storage","label":"Storage"},{"key":"controller_count","label":"Controller count"},{"key":"game_count","label":"Game count"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','smart_home']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"device_type","label":"Device type"},{"key":"compatibility","label":"Compatibility"},{"key":"connection_type","label":"Connection type"},{"key":"power_type","label":"Power type"},{"key":"app_support","label":"App support"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','components']::text[] THEN '[{"key":"component_type","label":"Component type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"socket_compatibility","label":"Socket / compatibility"},{"key":"capacity","label":"Capacity"},{"key":"speed","label":"Speed"},{"key":"power_rating","label":"Power rating"},{"key":"condition","label":"Condition"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['electronics','electronics_accessories']::text[] THEN '[{"key":"accessory_type","label":"Accessory type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"compatibility","label":"Compatibility"},{"key":"connection_type","label":"Connection type"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['electronics','other_electronics']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['real_estate','apartments']::text[] THEN '[{"key":"listing_type","label":"Listing type"},{"key":"property_type","label":"Property type"},{"key":"rooms","label":"Rooms"},{"key":"area","label":"Area (m²)"},{"key":"floor","label":"Floor"},{"key":"total_floors","label":"Total floors"},{"key":"year_built","label":"Year built"},{"key":"condition","label":"Condition"},{"key":"heating_type","label":"Heating type"},{"key":"energy_class","label":"Energy class"},{"key":"balcony","label":"Balcony"},{"key":"furnished","label":"Furnished"},{"key":"parking","label":"Parking"},{"key":"storage_room","label":"Storage room"},{"key":"bathroom_count","label":"Bathroom count"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','houses']::text[] THEN '[{"key":"listing_type","label":"Listing type"},{"key":"house_type","label":"House type"},{"key":"rooms","label":"Rooms"},{"key":"living_area","label":"Living area (m²)"},{"key":"land_area","label":"Land area"},{"key":"floors","label":"Floors"},{"key":"year_built","label":"Year built"},{"key":"condition","label":"Condition"},{"key":"heating_type","label":"Heating type"},{"key":"energy_class","label":"Energy class"},{"key":"garage","label":"Garage"},{"key":"sauna","label":"Sauna"},{"key":"terrace","label":"Terrace"},{"key":"water_supply","label":"Water supply"},{"key":"sewer_connection","label":"Sewer connection"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','land']::text[] THEN '[{"key":"land_type","label":"Land type"},{"key":"area","label":"Area"},{"key":"purpose","label":"Purpose"},{"key":"detailed_plan","label":"Detailed plan"},{"key":"electricity","label":"Electricity"},{"key":"water","label":"Water"},{"key":"sewer","label":"Sewer"},{"key":"road_access","label":"Road access"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','commercial_property']::text[] THEN '[{"key":"property_type","label":"Property type"},{"key":"area","label":"Area"},{"key":"floor","label":"Floor"},{"key":"purpose","label":"Purpose"},{"key":"parking","label":"Parking"},{"key":"loading_access","label":"Loading access"},{"key":"heating","label":"Heating"},{"key":"security","label":"Security"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','garages']::text[] THEN '[{"key":"area","label":"Area"},{"key":"electricity","label":"Electricity"},{"key":"heating","label":"Heating"},{"key":"security","label":"Security"},{"key":"water","label":"Water"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['real_estate','vacation_property']::text[] THEN '[{"key":"property_type","label":"Property type"},{"key":"rooms","label":"Rooms"},{"key":"area","label":"Area"},{"key":"beds","label":"Beds"},{"key":"sauna","label":"Sauna"},{"key":"pool","label":"Pool"},{"key":"beach_access","label":"Beach access"},{"key":"seasonal_year_round","label":"Seasonal / year-round"},{"key":"district","label":"District / neighborhood"}]'::jsonb
    WHEN ARRAY['clothing_fashion','men']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"fit","label":"Fit"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"authenticity","label":"Authenticity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['clothing_fashion','women']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"fit","label":"Fit"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"authenticity","label":"Authenticity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['clothing_fashion','kids']::text[] THEN '[{"key":"category_type","label":"Category type"},{"key":"brand","label":"Brand"},{"key":"size_age","label":"Size / age"},{"key":"gender","label":"Gender"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"}]'::jsonb
    WHEN ARRAY['clothing_fashion','workwear']::text[] THEN '[{"key":"workwear_type","label":"Workwear type"},{"key":"gender","label":"Gender"},{"key":"size","label":"Size"},{"key":"industry","label":"Industry"},{"key":"season","label":"Season"},{"key":"visibility_class","label":"Visibility class"},{"key":"protection_class","label":"Protection class"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['clothing_fashion','shoes']::text[] THEN '[{"key":"gender","label":"Gender"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"size","label":"Size"},{"key":"color","label":"Color"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"season","label":"Season"},{"key":"heel_height","label":"Heel height"},{"key":"authenticity","label":"Authenticity"},{"key":"original_box_included","label":"Original box included"}]'::jsonb
    WHEN ARRAY['clothing_fashion','watches']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"movement_type","label":"Movement type"},{"key":"case_material","label":"Case material"},{"key":"case_size","label":"Case size"},{"key":"water_resistance","label":"Water resistance"},{"key":"condition","label":"Condition"},{"key":"box_papers_included","label":"Box / papers included"},{"key":"authenticity","label":"Authenticity"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['clothing_fashion','bags']::text[] THEN '[{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"authenticity","label":"Authenticity"},{"key":"dust_bag_box_included","label":"Dust bag / box included"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['clothing_fashion','jewelry']::text[] THEN '[{"key":"jewelry_type","label":"Jewelry type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"gemstone","label":"Gemstone"},{"key":"size","label":"Size"},{"key":"weight","label":"Weight"},{"key":"condition","label":"Condition"},{"key":"authenticity","label":"Authenticity"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['clothing_fashion','other_clothing_fashion']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','power_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"power_rating","label":"Power rating"},{"key":"battery_included","label":"Battery included"},{"key":"battery_count","label":"Battery count"},{"key":"charger_included","label":"Charger included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','hand_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"set_single","label":"Set / single item"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','workshop_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"capacity","label":"Capacity"},{"key":"dimensions","label":"Dimensions"},{"key":"weight","label":"Weight"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','industrial_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"capacity","label":"Capacity"},{"key":"working_pressure","label":"Working pressure"},{"key":"weight","label":"Weight"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['tools_industrial','safety_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"certification","label":"Certification"},{"key":"condition","label":"Condition"},{"key":"expiration_date","label":"Expiration date"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['tools_industrial','other_tools_industrial']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','furniture']::text[] THEN '[{"key":"furniture_type","label":"Furniture type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"assembly_required","label":"Assembly required"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','appliances']::text[] THEN '[{"key":"appliance_type","label":"Appliance type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"energy_class","label":"Energy class"},{"key":"power_source","label":"Power source"},{"key":"capacity","label":"Capacity"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"warranty_remaining","label":"Warranty remaining"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['home_garden','garden_tools']::text[] THEN '[{"key":"tool_type","label":"Tool type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"power_source","label":"Power source"},{"key":"voltage","label":"Voltage"},{"key":"battery_included","label":"Battery included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','plants_seedlings']::text[] THEN '[{"key":"plant_type","label":"Plant type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"pot_size","label":"Pot size"},{"key":"growth_stage","label":"Growth stage"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','seeds']::text[] THEN '[{"key":"seed_type","label":"Seed type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"package_weight","label":"Package weight"},{"key":"sowing_season","label":"Sowing season"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','crops_produce']::text[] THEN '[{"key":"produce_type","label":"Produce type"},{"key":"variety","label":"Variety"},{"key":"quantity","label":"Quantity"},{"key":"unit","label":"Unit"},{"key":"harvest_date","label":"Harvest date"},{"key":"organic","label":"Organic"}]'::jsonb
    WHEN ARRAY['home_garden','farm_supplies']::text[] THEN '[{"key":"supply_type","label":"Supply type"},{"key":"brand","label":"Brand"},{"key":"quantity","label":"Quantity"},{"key":"material","label":"Material"},{"key":"intended_use","label":"Intended use"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','animal_feed']::text[] THEN '[{"key":"feed_type","label":"Feed type"},{"key":"animal_type","label":"Animal type"},{"key":"quantity","label":"Quantity"},{"key":"package_weight","label":"Package weight"},{"key":"ingredients","label":"Ingredients"},{"key":"expiry_date","label":"Expiry date"}]'::jsonb
    WHEN ARRAY['home_garden','greenhouses']::text[] THEN '[{"key":"greenhouse_type","label":"Greenhouse type"},{"key":"material","label":"Material"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"height","label":"Height"},{"key":"frame_material","label":"Frame material"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','decor']::text[] THEN '[{"key":"decor_type","label":"Decor type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"style","label":"Style"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['home_garden','lighting']::text[] THEN '[{"key":"lighting_type","label":"Lighting type"},{"key":"brand","label":"Brand"},{"key":"power_source","label":"Power source"},{"key":"bulb_type","label":"Bulb type"},{"key":"color_temperature","label":"Color temperature"},{"key":"smart_lighting_support","label":"Smart lighting support"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','kitchenware']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','home_textiles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','household_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','bathroom']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','heating_fuels']::text[] THEN '[{"key":"fuel_type","label":"Fuel type"},{"key":"wood_type","label":"Wood type"},{"key":"quantity","label":"Quantity"},{"key":"unit","label":"Unit"},{"key":"moisture_level","label":"Moisture level"},{"key":"packaging","label":"Packaging"},{"key":"delivery_available","label":"Delivery available"}]'::jsonb
    WHEN ARRAY['home_garden','heating_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"fuel_type","label":"Fuel type"},{"key":"power","label":"Power"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['home_garden','outdoor_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['home_garden','other_home_garden']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','gym_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"weight_resistance","label":"Weight / resistance"},{"key":"dimensions","label":"Dimensions"},{"key":"foldable","label":"Foldable"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','bicycles']::text[] THEN '[{"key":"bike_type","label":"Bike type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"frame_size","label":"Frame size"},{"key":"wheel_size","label":"Wheel size"},{"key":"material","label":"Material"},{"key":"gear_count","label":"Gear count"},{"key":"suspension","label":"Suspension"},{"key":"brake_type","label":"Brake type"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['sports_outdoor','winter_sports']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"size","label":"Size"},{"key":"binding_included","label":"Binding included"},{"key":"boot_size","label":"Boot size"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','camping']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"capacity","label":"Capacity"},{"key":"weight","label":"Weight"},{"key":"dimensions","label":"Dimensions"},{"key":"season_rating","label":"Season rating"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','fishing']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"length","label":"Length"},{"key":"power_rating","label":"Power rating"},{"key":"reel_included","label":"Reel included"},{"key":"line_included","label":"Line included"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','other_sports_outdoor']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','saddles_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','bridles_halters_tack']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','rider_clothing_safety']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"gender","label":"Gender"},{"key":"discipline","label":"Discipline"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','horse_blankets_textiles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"horse_size","label":"Horse size"},{"key":"blanket_weight","label":"Blanket weight"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','horse_grooming_care']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"horse_size","label":"Horse size"},{"key":"material","label":"Material"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','stable_paddock_equipment']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','driving_carriage_equipment']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"discipline","label":"Discipline"},{"key":"horse_size","label":"Horse size"},{"key":"seat_size","label":"Seat size"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['sports_outdoor','equestrian_horse_supplies','other_equestrian_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','art']::text[] THEN '[{"key":"art_type","label":"Art type"},{"key":"artist","label":"Artist"},{"key":"title","label":"Title"},{"key":"year_period","label":"Year / period"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"signed","label":"Signed"},{"key":"certificate_included","label":"Certificate included"},{"key":"condition","label":"Condition"},{"key":"frame_included","label":"Frame included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','vintage']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand_maker","label":"Brand / maker"},{"key":"year_era","label":"Year / era"},{"key":"material","label":"Material"},{"key":"origin_country","label":"Origin country"},{"key":"condition","label":"Condition"},{"key":"restored","label":"Restored"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','coins']::text[] THEN '[{"key":"country","label":"Country"},{"key":"year","label":"Year"},{"key":"currency","label":"Currency"},{"key":"material","label":"Material"},{"key":"denomination","label":"Denomination"},{"key":"mint_mark","label":"Mint mark"},{"key":"condition_grading","label":"Condition / grading"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','military']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"country","label":"Country"},{"key":"era","label":"Era"},{"key":"original_reproduction","label":"Original / reproduction"},{"key":"material","label":"Material"},{"key":"condition","label":"Condition"},{"key":"serial_markings","label":"Serial number / markings"},{"key":"certificate_included","label":"Certificate included"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','memorabilia']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"related_person_event","label":"Related person / event"},{"key":"year_era","label":"Year / era"},{"key":"signed","label":"Signed"},{"key":"certificate_included","label":"Certificate included"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['antiques_collectibles','other_antiques_collectibles']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['building_materials','lumber']::text[] THEN '[{"key":"material_type","label":"Material type"},{"key":"wood_type","label":"Wood type"},{"key":"length","label":"Length"},{"key":"width","label":"Width"},{"key":"thickness","label":"Thickness"},{"key":"moisture_level","label":"Moisture level"},{"key":"treatment_type","label":"Treatment type"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','concrete']::text[] THEN '[{"key":"material_type","label":"Material type"},{"key":"strength_class","label":"Strength class"},{"key":"weight","label":"Weight"},{"key":"bag_size","label":"Bag size"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','insulation']::text[] THEN '[{"key":"insulation_type","label":"Insulation type"},{"key":"material","label":"Material"},{"key":"thickness","label":"Thickness"},{"key":"coverage_area","label":"Coverage area"},{"key":"fire_rating","label":"Fire rating"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','roofing']::text[] THEN '[{"key":"roofing_type","label":"Roofing type"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"coverage_area","label":"Coverage area"},{"key":"quantity","label":"Quantity"},{"key":"condition","label":"Condition"}]'::jsonb
    WHEN ARRAY['building_materials','plumbing']::text[] THEN '[{"key":"plumbing_type","label":"Plumbing type"},{"key":"material","label":"Material"},{"key":"diameter","label":"Diameter"},{"key":"length","label":"Length"},{"key":"compatibility","label":"Compatibility"},{"key":"pressure_rating","label":"Pressure rating"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['building_materials','other_building_materials']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','strollers_prams']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','child_car_seats']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','nursery_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','baby_feeding_care']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','baby_safety_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['children_baby','other_children_baby']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"age_range","label":"Age range"},{"key":"safety_standard","label":"Safety standard"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','dog_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','cat_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','aquariums_terrariums']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','cages_housing']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','pet_transport_grooming']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['pet_supplies','other_pet_supplies']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"animal_type","label":"Animal type"},{"key":"brand","label":"Brand"},{"key":"size","label":"Size"},{"key":"material","label":"Material"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['books_music_media','books']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','magazines_comics']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','music_movies']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['books_music_media','musical_instruments']::text[] THEN '[{"key":"instrument_type","label":"Instrument type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"size","label":"Size"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['books_music_media','instrument_accessories']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['books_music_media','other_books_media']::text[] THEN '[{"key":"media_type","label":"Media type"},{"key":"title","label":"Title"},{"key":"creator","label":"Author / creator"},{"key":"language","label":"Language"},{"key":"publication_year","label":"Publication year"},{"key":"format","label":"Format"},{"key":"genre","label":"Genre"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','toys']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','board_games_puzzles']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','arts_crafts']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','model_rc_hobbies']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','sewing_knitting']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['hobbies_toys_crafts','other_hobbies_toys']::text[] THEN '[{"key":"hobby_type","label":"Hobby type"},{"key":"brand","label":"Brand"},{"key":"age_range","label":"Age range"},{"key":"material","label":"Material"},{"key":"dimensions","label":"Dimensions"},{"key":"skill_level","label":"Skill level"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    WHEN ARRAY['office_business','office_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','printers_scanners']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','office_furniture']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"capacity","label":"Capacity"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"}]'::jsonb
    WHEN ARRAY['office_business','retail_warehouse_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','presentation_equipment']::text[] THEN '[{"key":"equipment_type","label":"Equipment type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"connection_type","label":"Connection type"},{"key":"power_source","label":"Power source"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"included_accessories","label":"Included accessories"},{"key":"serial_number","label":"Serial number"}]'::jsonb
    WHEN ARRAY['office_business','other_office_business']::text[] THEN '[{"key":"item_type","label":"Item type"},{"key":"brand","label":"Brand"},{"key":"model","label":"Model"},{"key":"material","label":"Material"},{"key":"color","label":"Color"},{"key":"size","label":"Size"},{"key":"dimensions","label":"Dimensions"},{"key":"condition","label":"Condition"},{"key":"quantity","label":"Quantity"},{"key":"included_accessories","label":"Included accessories"}]'::jsonb
    ELSE '[]'::jsonb END;
$fn$;

CREATE FUNCTION public.public_listing_detail_values_v1(p_row public.listings)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,public,pg_temp
AS $fn$
DECLARE path_value text[]; specs jsonb; spec jsonb; value_text text; raw_value jsonb;
  result jsonb:='[]'; seen text[]:=ARRAY[]::text[]; clipped boolean:=false; attrs jsonb;
BEGIN
  path_value:=ARRAY[(p_row).category,(p_row).subcategory];
  IF jsonb_typeof((p_row).details->'detailCategory')='string'
     AND (p_row).details->>'detailCategory'<>'' THEN
    path_value:=path_value||ARRAY[(p_row).details->>'detailCategory'];
  END IF;
  -- These columns are explicit authored public form inputs, not AI or inferred values.
  attrs:=jsonb_build_array(
    jsonb_build_object('key','manufacturer','label','Manufacturer','value',(p_row).manufacturer),
    jsonb_build_object('key','part_number','label','Part number','value',(p_row).part_number),
    jsonb_build_object('key','oem_number','label','OEM number','value',(p_row).oem_number),
    jsonb_build_object('key','vehicle_brand','label','Vehicle brand','value',(p_row).vehicle_brand),
    jsonb_build_object('key','vehicle_model','label','Vehicle model','value',(p_row).vehicle_model),
    jsonb_build_object('key','vehicle_year','label','Vehicle year','value',(p_row).vehicle_year),
    jsonb_build_object('key','engine','label','Engine','value',(p_row).engine));
  FOR spec IN SELECT value FROM jsonb_array_elements(attrs) LOOP
    value_text:=spec->>'value';
    IF value_text IS NOT NULL AND btrim(value_text)<>'' THEN
      clipped:=clipped OR char_length(value_text)>1000;
      result:=result||jsonb_build_array(jsonb_build_object('key',spec->>'key',
        'label',spec->>'label','value',left(value_text,1000)));
      seen:=array_append(seen,spec->>'key');
    END IF;
  END LOOP;
  specs:=public.public_listing_detail_field_spec_v1(path_value);
  IF jsonb_typeof((p_row).details)='object' THEN
    FOR spec IN SELECT value FROM jsonb_array_elements(specs) LOOP
      IF (spec->>'key')=ANY(seen) THEN CONTINUE; END IF;
      raw_value:=(p_row).details->(spec->>'key');
      IF jsonb_typeof(raw_value) IN ('string','number','boolean') THEN
        value_text:=raw_value#>>'{}';
        IF btrim(value_text)<>'' THEN
          clipped:=clipped OR char_length(value_text)>1000;
          result:=result||jsonb_build_array(jsonb_build_object('key',spec->>'key',
            'label',spec->>'label','value',left(value_text,1000)));
          seen:=array_append(seen,spec->>'key');
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('fields',result,'truncated',clipped);
END $fn$;
ALTER FUNCTION public.public_listing_detail_field_spec_v1(text[]) OWNER TO postgres;
ALTER FUNCTION public.public_listing_detail_values_v1(public.listings) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.public_listing_detail_field_spec_v1(text[]),
 public.public_listing_detail_values_v1(public.listings) FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-public-read-v1/13_public_listing_detail.sql
-- CLOSED LOCAL CANDIDATE. Public-only; owner preview remains a separate contract.
CREATE FUNCTION public.get_public_listing_detail_v1(p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1(); r public.listings%ROWTYPE; seller record; gallery jsonb; image_url text;
  detail_values jsonb; item jsonb:=NULL; has_more boolean:=false; id_value bigint;
BEGIN
  IF p_listing_id IS NULL OR char_length(p_listing_id)>20
     OR p_listing_id !~ '^(0|[1-9][0-9]*|-[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric < -9223372036854775808
     OR p_listing_id::numeric > 9223372036854775807 THEN
    RAISE EXCEPTION 'public_listing_id_invalid' USING ERRCODE='22023';
  END IF;
  id_value:=p_listing_id::bigint;
  SELECT l.* INTO r FROM public.listings l
    JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.id=id_value AND l.status='active'
      -- Deliberately preserves public detail/search NULL-expiry semantics.
      AND (l.active_until IS NULL OR l.active_until>now())
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)));
  IF FOUND THEN
    SELECT ip.display_name,ip.slug,ip.avatar_url,i.type INTO seller
      FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
      WHERE i.id=r.identity_id AND i.status='active';
    -- Small bounded gallery, stable tiebreaks, identical first-image rule to search v2.
    WITH ordered AS (
      SELECT li.id,li.thumb_url,li.medium_url,li.original_url,li.is_primary,li.sort_order,
        row_number() OVER (ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
          li.created_at ASC NULLS LAST,li.id ASC) AS position
      FROM public.listing_images li WHERE li.listing_id=r.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,
        li.created_at ASC NULLS LAST,li.id ASC LIMIT 11
    ) SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id::text,'thumb_url',o.thumb_url,
        'medium_url',o.medium_url,'original_url',o.original_url,'is_primary',o.is_primary,
        'sort_order',o.sort_order) ORDER BY o.position) FILTER (WHERE o.position<=10),'[]'::jsonb),
        coalesce(bool_or(o.position>10),false)
      INTO gallery,has_more FROM ordered o;
    image_url:=coalesce(gallery->0->>'thumb_url',gallery->0->>'medium_url',
      gallery->0->>'original_url',r.image);
    detail_values:=public.public_listing_detail_values_v1(r);
    item:=jsonb_build_object('content_type','listing','content_id',r.id::text,
      'title',left(r.title,4096),'description',left(r.description,32768),
      'title_truncated',coalesce(char_length(r.title)>4096,false),
      'description_truncated',coalesce(char_length(r.description)>32768,false),
      'price',public.listing_price_read_model_v1(r.price_kind,r.price_amount,r.currency,r.price_revision,r.price),
      'category',r.category,'subcategory',r.subcategory,
      'detail_category',CASE WHEN jsonb_typeof(r.details->'detailCategory')='string'
        THEN r.details->>'detailCategory' ELSE NULL END,
      'condition',r.condition,'country',r.country,'city',r.city,
      'image_url',image_url,'images',gallery,'images_has_more',has_more,
      'details',detail_values->'fields','details_truncated',detail_values->'truncated',
      'seller_name',seller.display_name,'seller_slug',seller.slug,'seller_avatar_url',seller.avatar_url,
      'seller_type',seller.type,'created_at',r.created_at,'active_until',r.active_until);
  END IF;
  -- Hidden, missing and blocked IDs are indistinguishable. No owner bypass here.
  RETURN jsonb_build_object('schema_version',1,'content_scope','public_ordinary_listing_detail',
    'requested_id',p_listing_id,'item',item);
END $fn$;
ALTER FUNCTION public.get_public_listing_detail_v1(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_listing_detail_v1(text) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_listing_detail_v1(text) IS
 'Closed public detail candidate. One authorized row snapshot; exact shared price, bounded public fields/gallery; NULL expiry allowed; no owner preview or API grants.';


-- Retained declaration source: supabase/labs/listing-public-read-v1/14_public_profile_listings.sql
-- CLOSED LOCAL CANDIDATE. Viewed seller slug, never caller-supplied account ownership.
CREATE FUNCTION public.get_public_profile_listings_v1(
 p_seller_slug text,p_store_category_id uuid DEFAULT NULL,
 p_result_limit integer DEFAULT 12,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1(); identity_value uuid; result jsonb; profile_count integer;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1 OR char_length(p_seller_slug)>160
     OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>60
     OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>100000 THEN
    RAISE EXCEPTION 'public_profile_pagination_invalid' USING ERRCODE='22023';
  END IF;
  -- A duplicate legacy slug is ambiguous, never combine two identities into one shop.
  SELECT count(*)::integer INTO profile_count FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  IF profile_count=1 THEN
    SELECT ip.identity_id INTO identity_value FROM public.identity_profiles ip
      JOIN public.identities i ON i.id=ip.identity_id AND i.status='active' WHERE ip.slug=p_seller_slug;
  END IF;
  WITH RECURSIVE category_scope(id) AS (
    SELECT c.id FROM public.store_categories c
      WHERE c.id=p_store_category_id AND c.identity_id=identity_value
    UNION -- deduplicate and terminate even a corrupt historical cycle
    SELECT c.id FROM public.store_categories c JOIN category_scope s ON c.parent_id=s.id
      WHERE c.identity_id=identity_value
  ), matched AS MATERIALIZED (
    SELECT l.id,l.created_at,l.title,left(l.description,280) AS description_preview,
      l.price,l.price_kind,l.price_amount,l.currency,l.price_revision,l.category,l.subcategory,
      CASE WHEN jsonb_typeof(l.details->'detailCategory')='string' THEN l.details->>'detailCategory' ELSE NULL END AS detail_category,
      l.condition,l.country,l.city,l.image AS fallback_image,
      ip.display_name AS seller_name,ip.slug AS seller_slug,ip.avatar_url AS seller_avatar_url,i.type AS seller_type
    FROM public.listings l JOIN public.identities i ON i.id=l.identity_id AND i.status='active'
    JOIN public.identity_profiles ip ON ip.identity_id=i.id
    WHERE l.identity_id=identity_value AND l.status='active'
      -- Preserve the profile's stricter boundary: unlike search/detail, NULL is excluded.
      AND l.active_until>now()
      AND NOT EXISTS (SELECT 1 FROM public.user_blocks b WHERE actor IS NOT NULL
        AND ((b.blocker_id=actor AND b.blocked_id=l.user_id)
          OR (b.blocked_id=actor AND b.blocker_id=l.user_id)))
      AND (p_store_category_id IS NULL OR EXISTS (
        SELECT 1 FROM public.listing_store_categories x JOIN category_scope s ON s.id=x.store_category_id
        WHERE x.listing_id=l.id))
  ), page AS (
    SELECT m.* FROM matched m ORDER BY m.created_at DESC,m.id DESC LIMIT p_result_limit OFFSET p_result_offset
  ), cards AS (
    SELECT p.id,p.created_at,jsonb_build_object('content_type','listing','content_id',p.id::text,
      'title',p.title,'description_preview',p.description_preview,
      'price',public.listing_price_read_model_v1(p.price_kind,p.price_amount,p.currency,p.price_revision,p.price),
      'category',p.category,'subcategory',p.subcategory,'detail_category',p.detail_category,
      'condition',p.condition,'country',p.country,'city',p.city,
      'image_url',coalesce(img.thumb_url,img.medium_url,img.original_url,p.fallback_image),
      'seller_name',p.seller_name,'seller_slug',p.seller_slug,'seller_avatar_url',p.seller_avatar_url,
      'seller_type',p.seller_type,'created_at',p.created_at) AS card
    FROM page p LEFT JOIN LATERAL (
      SELECT li.thumb_url,li.medium_url,li.original_url FROM public.listing_images li WHERE li.listing_id=p.id
      ORDER BY li.is_primary DESC NULLS LAST,li.sort_order ASC NULLS LAST,li.created_at ASC NULLS LAST,li.id ASC LIMIT 1
    ) img ON true
  ), totals AS (SELECT count(*) AS n FROM matched)
  SELECT jsonb_build_object('schema_version',1,'content_scope','public_profile_ordinary_listings',
    'seller_slug',p_seller_slug,'profile_available',identity_value IS NOT NULL,
    'store_category_id',p_store_category_id::text,'sort','newest',
    'items',coalesce((SELECT jsonb_agg(c.card ORDER BY c.created_at DESC,c.id DESC) FROM cards c),'[]'::jsonb),
    'total_count',t.n::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',t.n>p_result_offset::bigint+p_result_limit,
    'next_offset',CASE WHEN t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit<=100000
      THEN p_result_offset+p_result_limit ELSE NULL END,
    'window_limit_reached',t.n>p_result_offset::bigint+p_result_limit AND p_result_offset+p_result_limit>100000)
    INTO result FROM totals t;
  RETURN result;
END $fn$;
ALTER FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) IS
 'Closed profile-list candidate. Exact active identity slug; strict future expiry; server-resolved category branch; blocks before page/count; no per-card remote requests or API grants.';


-- Retained declaration source: supabase/labs/listing-public-read-v1/15_public_profile_services.sql
-- CLOSED LOCAL CANDIDATE. Public viewed-profile projection, never an owner read.
CREATE FUNCTION public.get_public_profile_services_v1(
  p_seller_slug text,
  p_result_limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE
  profile_identities uuid[];
  identity_value uuid;
  read_time timestamptz := now();
  result jsonb;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1
     OR char_length(p_seller_slug)>160 OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>80 THEN
    RAISE EXCEPTION 'public_profile_limit_invalid' USING ERRCODE='22023';
  END IF;

  -- Two matches are enough to reject an ambiguous legacy slug. Resolve once in
  -- this statement snapshot; active-owner state never changes the public scope.
  SELECT array_agg(candidate.identity_id) INTO profile_identities
  FROM (
    SELECT ip.identity_id
    FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
    WHERE ip.slug=p_seller_slug
    LIMIT 2
  ) candidate;
  IF cardinality(profile_identities)=1 THEN
    identity_value := profile_identities[1];
  END IF;

  WITH page AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.subcategory,
      s.image_url,s.price_amount,s.currency,s.price_type,s.country,s.city,
      s.location,s.status,s.sort_order,s.published_at,s.created_at,s.updated_at
    FROM public.services s
    WHERE s.identity_id=identity_value AND s.status='published'
    ORDER BY s.sort_order ASC,s.created_at ASC,s.id ASC
    LIMIT p_result_limit
  ), cards AS (
    SELECT p.sort_order,p.created_at,p.id,
      jsonb_build_object(
        'id',p.id::text,
        'identity_id',p.identity_id::text,
        'title',p.title,
        'description',p.description,
        'category',p.category,
        'subcategory',p.subcategory,
        'image_url',p.image_url,
        'price_amount',p.price_amount::text,
        'currency',p.currency,
        'price_type',p.price_type,
        'country',p.country,
        'city',p.city,
        'location',p.location,
        'status',p.status,
        'sort_order',p.sort_order,
        'published_at',p.published_at,
        'created_at',p.created_at,
        'updated_at',p.updated_at,
        'images',coalesce(gallery.images,'[]'::jsonb)
      ) AS card
    FROM page p
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',image.id::text,
          'identity_id',image.identity_id::text,
          'service_id',image.service_id::text,
          'original_url',image.original_url,
          'medium_url',image.medium_url,
          'thumb_url',image.thumb_url,
          'sort_order',image.sort_order,
          'is_primary',image.is_primary,
          'created_at',image.created_at
        ) ORDER BY image.is_primary DESC,image.sort_order ASC,
          image.created_at ASC,image.id ASC
      ) AS images
      FROM (
        SELECT si.id,si.identity_id,si.service_id,si.original_url,si.medium_url,
          si.thumb_url,si.sort_order,si.is_primary,si.created_at
        FROM public.service_images si
        WHERE si.service_id=p.id AND si.identity_id=identity_value
        ORDER BY si.is_primary DESC,si.sort_order ASC,si.created_at ASC,si.id ASC
        LIMIT 10
      ) image
    ) gallery ON true
  )
  SELECT jsonb_build_object(
    'schema_version',1,
    'content_scope','public_profile_services',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'result_limit',p_result_limit,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;

ALTER FUNCTION public.get_public_profile_services_v1(text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_services_v1(text,integer)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_profile_services_v1(text,integer) IS
  'Closed public-profile service candidate. Unique active viewed slug; published public projection; at most 80 services and 10 exact-parent/identity images each. No owner-private fields, helper grants or API grants.';


-- Retained declaration source: supabase/labs/listing-public-read-v1/16_public_profile_showcases.sql
-- CLOSED LOCAL CANDIDATE. Public viewed-profile projection, never an owner read.
CREATE FUNCTION public.get_public_profile_showcases_v1(
  p_seller_slug text,
  p_result_limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE
  profile_identities uuid[];
  identity_value uuid;
  read_time timestamptz := now();
  result jsonb;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1
     OR char_length(p_seller_slug)>160 OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>80 THEN
    RAISE EXCEPTION 'public_profile_limit_invalid' USING ERRCODE='22023';
  END IF;

  -- A duplicate slug is unavailable, including duplicate profiles of one
  -- identity. No fallback to the caller's own identity or private content.
  SELECT array_agg(candidate.identity_id) INTO profile_identities
  FROM (
    SELECT ip.identity_id
    FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
    WHERE ip.slug=p_seller_slug
    LIMIT 2
  ) candidate;
  IF cardinality(profile_identities)=1 THEN
    identity_value := profile_identities[1];
  END IF;

  WITH page AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.status,
      s.sort_order,s.published_at,s.active_until,s.created_at,s.updated_at
    FROM public.product_showcases s
    WHERE s.identity_id=identity_value AND s.status='published'
      AND s.active_until>read_time
    ORDER BY s.sort_order ASC,s.created_at ASC,s.id ASC
    LIMIT p_result_limit
  ), cards AS (
    SELECT p.sort_order,p.created_at,p.id,
      jsonb_build_object(
        'id',p.id::text,
        'identity_id',p.identity_id::text,
        'title',p.title,
        'description',p.description,
        'category',p.category,
        'status',p.status,
        'sort_order',p.sort_order,
        'published_at',p.published_at,
        'active_until',p.active_until,
        'created_at',p.created_at,
        'updated_at',p.updated_at,
        'images',coalesce(gallery.images,'[]'::jsonb)
      ) AS card
    FROM page p
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',image.id::text,
          'identity_id',image.identity_id::text,
          'showcase_id',image.showcase_id::text,
          'original_url',image.original_url,
          'medium_url',image.medium_url,
          'thumb_url',image.thumb_url,
          'sort_order',image.sort_order,
          'is_primary',image.is_primary,
          'created_at',image.created_at
        ) ORDER BY image.is_primary DESC,image.sort_order ASC,
          image.created_at ASC,image.id ASC
      ) AS images
      FROM (
        SELECT si.id,si.identity_id,si.showcase_id,si.original_url,si.medium_url,
          si.thumb_url,si.sort_order,si.is_primary,si.created_at
        FROM public.product_showcase_images si
        WHERE si.showcase_id=p.id AND si.identity_id=identity_value
        ORDER BY si.is_primary DESC,si.sort_order ASC,si.created_at ASC,si.id ASC
        LIMIT 10
      ) image
    ) gallery ON true
  )
  SELECT jsonb_build_object(
    'schema_version',1,
    'content_scope','public_profile_product_showcases',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'result_limit',p_result_limit,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;

ALTER FUNCTION public.get_public_profile_showcases_v1(text,integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_public_profile_showcases_v1(text,integer)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.get_public_profile_showcases_v1(text,integer) IS
  'Closed public-profile showcase candidate. Unique active viewed slug; published and unexpired at server read time; at most 80 showcases and 10 exact-parent/identity images each. No helper or API grants.';


-- Retained declaration source: supabase/releases/listing-price-v1/server-composition.test.generated.sql
CREATE FUNCTION public.lock_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_for_update boolean
) RETURNS public.listings LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1(); active_id uuid; row_id bigint;
  identity_row public.identities%ROWTYPE; listing_row public.listings%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.assert_hosted_preview_actor(actor);
  IF actor IS NULL OR p_expected_identity_id IS NULL THEN
    RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
  END IF;
  IF p_listing_id IS NULL OR char_length(p_listing_id)>19
     OR p_listing_id !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  row_id:=p_listing_id::bigint;
  -- Same lock order as the retained core: profile -> identity -> membership -> listing.
  SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR SHARE;
  IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
    RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
  END IF;
  SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF identity_row.type='business' THEN
    PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
      AND m.user_id=actor AND m.status='active' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
    END IF;
  END IF;
  IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
  IF p_for_update IS TRUE THEN
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR UPDATE;
  ELSE
    SELECT l.* INTO listing_row FROM public.listings l WHERE l.id=row_id AND l.identity_id=active_id FOR SHARE;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing_price_not_found_or_forbidden' USING ERRCODE='42501';
  END IF;
  RETURN listing_row;
END $fn$;

-- Retained declaration source: supabase/releases/listing-price-v1/server-composition.test.generated.sql
CREATE FUNCTION public.set_my_listing_price_core_v1(
  p_listing_id text, p_expected_identity_id uuid,
  p_expected_price_revision text, p_price jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE
  active_id uuid; row_id bigint; expected_revision bigint;
  identity_row public.identities%ROWTYPE; current_row public.listings%ROWTYPE;
  normalized jsonb; is_changed boolean;
BEGIN
  -- Actor/identity checks are performed by the closed definer locker.
  IF p_listing_id IS NULL OR char_length(p_listing_id)>19
     OR p_listing_id !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_listing_id::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_id_invalid' USING ERRCODE='22023';
  END IF;
  IF p_expected_price_revision IS NULL OR char_length(p_expected_price_revision)>19
     OR p_expected_price_revision !~ '^(0|[1-9][0-9]*)$' THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  IF p_expected_price_revision::numeric>9223372036854775807 THEN
    RAISE EXCEPTION 'listing_price_revision_invalid' USING ERRCODE='22023';
  END IF;
  row_id := p_listing_id::bigint; expected_revision := p_expected_price_revision::bigint;
  -- The same lock order is owned by the retained, closed definer locker.
  current_row := public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
  active_id := current_row.identity_id;
  -- Check revision BEFORE no-op: stale callers cannot bypass conflict detection.
  IF current_row.price_revision IS DISTINCT FROM expected_revision THEN
    RAISE EXCEPTION 'listing_price_conflict' USING ERRCODE='40001';
  END IF;
  normalized := public.normalize_listing_price_v1(p_price);
  is_changed := ROW(current_row.price_kind,current_row.price_amount,current_row.currency)
    IS DISTINCT FROM ROW(normalized->>'kind',(normalized->>'amount')::numeric,normalized->>'currency');
  IF is_changed THEN
    UPDATE public.listings SET price_kind=normalized->>'kind',
      price_amount=(normalized->>'amount')::numeric, currency=normalized->>'currency'
      WHERE id=row_id RETURNING * INTO current_row;
  END IF;
  RETURN jsonb_build_object('listing_id',row_id::text,'identity_id',active_id::text,
    'price',public.listing_price_snapshot_v1(current_row.price_kind,current_row.price_amount,
       current_row.currency,current_row.price_revision,current_row.price), 'changed',is_changed);
END $fn$;

-- Retained declaration source: supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql
CREATE FUNCTION public.get_my_listing_basics_v1(p_listing_id text,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE;
BEGIN
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,false);
  RETURN public.listing_basics_snapshot_v1(r);
END $fn$;

-- Retained declaration source: supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql
CREATE FUNCTION public.save_my_listing_basics_v1(
  p_listing_id text,p_expected_identity_id uuid,p_expected_basics jsonb,p_basics jsonb,
  p_price_change jsonb DEFAULT NULL,p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout='2s'
AS $fn$
DECLARE r public.listings%ROWTYPE; normalized jsonb; price_result jsonb;
  basics_changed boolean; price_changed boolean:=false;
BEGIN
  normalized:=public.normalize_listing_basics_v1(p_basics);
  IF p_expected_basics IS NULL OR jsonb_typeof(p_expected_basics) IS DISTINCT FROM 'object'
     OR octet_length(p_expected_basics::text)>65536 THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_expected_basics) AS keys(key))
       IS DISTINCT FROM ARRAY['condition','description','title']::text[]
     OR EXISTS (SELECT 1 FROM jsonb_each(p_expected_basics) e WHERE jsonb_typeof(e.value) NOT IN ('string','null')) THEN
    RAISE EXCEPTION 'listing_basics_expected_invalid' USING ERRCODE='22023';
  END IF;
  IF p_price_change IS NULL AND p_expected_price_revision IS NOT NULL THEN
    RAISE EXCEPTION 'listing_price_omission_invalid' USING ERRCODE='22023';
  END IF;
  r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
  -- Compare exact original basic fields, BEFORE no-op; do not fetch a new expected baseline.
  IF public.listing_basics_values_v1(r) IS DISTINCT FROM p_expected_basics THEN
    RAISE EXCEPTION 'listing_basics_conflict' USING ERRCODE='40001';
  END IF;
  basics_changed:=public.listing_basics_values_v1(r) IS DISTINCT FROM normalized;
  IF p_price_change IS NOT NULL THEN
    -- Internal SQL call, not a second client request. Errors roll back the whole call.
    price_result:=public.set_my_listing_price_core_v1(p_listing_id,p_expected_identity_id,
      p_expected_price_revision,p_price_change);
    price_changed:=(price_result->>'changed')::boolean;
    SELECT l.* INTO STRICT r FROM public.listings l WHERE l.id=r.id;
  END IF;
  IF basics_changed THEN
    r.title:=normalized->>'title'; r.description:=normalized->>'description'; r.condition:=normalized->>'condition';
    UPDATE public.listings l SET title=r.title,description=r.description,condition=r.condition,
      search_text=public.listing_basics_search_text_v1(r),updated_by_user_id=public.listing_actor_uid_hosted_v1()
      WHERE l.id=r.id RETURNING l.* INTO r;
  ELSIF price_changed THEN
    UPDATE public.listings l SET updated_by_user_id=public.listing_actor_uid_hosted_v1() WHERE l.id=r.id RETURNING l.* INTO r;
  END IF;
  RETURN jsonb_build_object('schema_version',1,'snapshot',public.listing_basics_snapshot_v1(r),
    'basics_changed',basics_changed,'price_changed',price_changed);
END $fn$;

-- Retained declaration source: supabase/contracts/listing_edit_api_v1.sql
CREATE FUNCTION public.get_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := public.listing_actor_uid_hosted_v1(); snapshot jsonb;
BEGIN
  -- Client pre/post-auth observations alone cannot bind the JWT actually used by an RPC.
  -- Even two accounts with membership in the same business must not cross an editor session.
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  snapshot := public.get_my_listing_basics_v1(p_listing_id, p_expected_identity_id);
  RETURN jsonb_build_object('schema_version', 1, 'actor_id', actor::text, 'snapshot', snapshot);
END $fn$;

-- Retained declaration source: supabase/contracts/listing_edit_api_v1.sql
CREATE FUNCTION public.save_my_listing_edit_v1(
  p_listing_id text, p_expected_identity_id uuid, p_expected_actor_id uuid,
  p_expected_basics jsonb, p_basics jsonb,
  p_price_change jsonb DEFAULT NULL, p_expected_price_revision text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET lock_timeout = '2s'
AS $fn$
DECLARE actor uuid := public.listing_actor_uid_hosted_v1(); saved jsonb;
BEGIN
  IF actor IS NULL OR p_expected_actor_id IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'listing_edit_actor_changed' USING ERRCODE = '42501';
  END IF;
  -- One nested SQL call, never two client writes. Errors retain the original rollback/CAS contract.
  saved := public.save_my_listing_basics_v1(p_listing_id, p_expected_identity_id,
    p_expected_basics, p_basics, p_price_change, p_expected_price_revision);
  RETURN saved || jsonb_build_object('actor_id', actor::text);
END $fn$;

-- Retained declaration source: supabase/labs/listing-owner-read-v1/15_owner_money_models.sql
CREATE FUNCTION public.project_horse_wanted_owner_summary_v2(p_details jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
  WITH source AS MATERIALIZED (
    SELECT public.project_horse_wanted_owner_summary_v1(p_details) AS value
  )
  SELECT jsonb_build_object('version',2,
    'budget', CASE WHEN value -> 'budget' = 'null'::jsonb THEN NULL::jsonb
      ELSE jsonb_build_object('mode',value #>> '{budget,mode}',
        'amount',CASE WHEN value #>> '{budget,mode}' = 'maximum'
          THEN trim_scale((value #>> '{budget,amount}')::numeric)::text ELSE NULL END,
        'currency',value #>> '{budget,currency}') END,
    'search_area',value -> 'search_area')
  FROM source;
$fn$;

-- Retained declaration source: supabase/labs/listing-owner-read-v1/15_owner_money_models.sql
CREATE FUNCTION public.horse_owner_price_read_v1(v text,k text,a numeric,c text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $fn$
BEGIN
  IF (c = 'EUR' AND (
       (v = 'free_transfer' AND k = 'free' AND a IS NULL)
       OR (v IN ('sale','lease','co_rider') AND (
         (k = 'contact' AND a IS NULL)
         OR (k IN ('fixed','from') AND a >= 0 AND a <= 9999999999.99
           AND a = round(a,2))
       ))
     )) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'owner_horse_price_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('version',1,'kind',k,
    'amount',CASE WHEN a IS NOT NULL THEN trim_scale(a)::text ELSE NULL END,
    'currency',c);
END;
$fn$;

-- Retained declaration source: supabase/labs/listing-owner-read-v1/16_owner_marketplace_read_v3.sql
CREATE FUNCTION public.get_my_marketplace_items_v3(
  p_expected_identity_id uuid,
  p_result_limit integer DEFAULT 30,
  p_result_offset integer DEFAULT 0,
  p_status_filter text DEFAULT 'all',
  p_search_query text DEFAULT '',
  p_store_category_filter uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, auth, pg_temp
SET TimeZone = 'UTC'
AS $fn$
DECLARE
  v_actor uuid := public.listing_actor_uid_hosted_v1();
  v_identity uuid;
  v_result jsonb;
  v_status text := coalesce(nullif(lower(btrim(p_status_filter)),''),'all');
  v_search text := btrim(coalesce(p_search_query,''));
BEGIN
  -- This call authenticates even an empty/no-results page.
  v_identity := public.require_my_active_identity_v2();
  IF p_expected_identity_id IS NULL OR p_expected_identity_id <> v_identity THEN
    RAISE EXCEPTION 'owner_read_identity_changed' USING ERRCODE='42501';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit < 1 OR p_result_limit > 100
    OR p_result_offset IS NULL OR p_result_offset < 0 OR p_result_offset > 100000
    OR char_length(v_status) > 40 OR char_length(v_search) > 200 THEN
    RAISE EXCEPTION 'owner_read_request_invalid' USING ERRCODE='22023';
  END IF;

  WITH owner_window AS MATERIALIZED (
    SELECT * FROM public.get_my_marketplace_items_v1(
      p_result_limit+1,p_result_offset,v_status,v_search,p_store_category_filter
    ) WITH ORDINALITY
  ), owner_page AS MATERIALIZED (
    SELECT * FROM owner_window ORDER BY ordinality LIMIT p_result_limit
  ), priced AS (
    SELECT item.ordinality,
      jsonb_build_object(
        'content_type',item.content_type,'content_id',item.content_id,
        'identity_id',item.identity_id,
        'source_status',item.source_status,'lifecycle_status',item.lifecycle_status,
        'content_variant',item.content_variant,
        'title',left(coalesce(item.title,''),512),
        'title_truncated',char_length(coalesce(item.title,'')) > 512,
        'description_excerpt',left(coalesce(item.description,''),512),
        'description_truncated',char_length(coalesce(item.description,'')) > 512,
        'image_url',item.image_url,'category',item.category,'subcategory',item.subcategory,
        'condition',item.condition,
        -- Wanted search area comes ONLY from the whitelist, never horse/seller location.
        'city',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.city END,
        'region',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.region END,
        'location_label',CASE WHEN item.content_variant = 'wanted' THEN NULL ELSE item.location_label END,
        'active_until',item.active_until,'published_at',item.published_at,
        'created_at',item.created_at,'sort_at',item.sort_at,
        'money',CASE
          WHEN item.content_type = 'listing' THEN jsonb_build_object(
            'role','listing_price','value',public.listing_price_read_model_v1(
              listing.price_kind,listing.price_amount,listing.currency,listing.price_revision,listing.price))
          WHEN item.content_variant = 'wanted' THEN jsonb_build_object(
            'role','wanted_budget','value',public.project_horse_wanted_owner_summary_v2(offer.details))
          ELSE jsonb_build_object('role','horse_offer_price','value',
            public.horse_owner_price_read_v1(offer.offer_type,offer.price_type,offer.price_amount,offer.currency))
        END
      ) AS value
    FROM owner_page item
    -- Typed primary-key lookups only on the selected page, not client-side N+1 requests.
    LEFT JOIN public.listings listing
      ON listing.id = CASE WHEN item.content_type='listing' THEN item.content_id::bigint ELSE NULL END
      AND listing.identity_id = v_identity
    LEFT JOIN public.horse_offers offer
      ON offer.id = CASE WHEN item.content_type='horse_offer' THEN item.content_id::uuid ELSE NULL END
      AND offer.identity_id = v_identity
  )
  SELECT jsonb_build_object(
    'schema_version',3,'actor_id',v_actor,'identity_id',v_identity,
    'result_limit',p_result_limit,'result_offset',p_result_offset,
    'has_more',(SELECT count(*) > p_result_limit FROM owner_window),
    'next_offset',CASE WHEN (SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit <= 100000 THEN p_result_offset + p_result_limit ELSE NULL END,
    'window_limit_reached',(SELECT count(*) > p_result_limit FROM owner_window)
      AND p_result_offset + p_result_limit > 100000,
    'items',coalesce((SELECT jsonb_agg(value ORDER BY ordinality) FROM priced),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$fn$;

-- Retained declaration source: supabase/releases/listing-price-v1/writer-authority.sql
-- Release candidate authority. Included only by the fixture-gated composition.
-- One NOLOGIN role owns only the exact price-CAS writer; no API role may SET it.
-- Exact restricted role created by 10_price_core.sql.
-- postgres is the existing trusted schema administrator, not an application role.
-- Inheritance enables managing the function; it does NOT change current_user in
-- an older postgres-owned SECURITY DEFINER function.
-- Membership and its PG17 automatic ADMIN provenance were established in 10_price_core.sql.
GRANT USAGE ON SCHEMA public TO selqiro_listing_price_writer_v1;
GRANT SELECT ON public.listings TO selqiro_listing_price_writer_v1;
GRANT UPDATE (price_kind, price_amount, currency) ON public.listings
  TO selqiro_listing_price_writer_v1;
CREATE POLICY listing_price_writer_v1_update ON public.listings
  FOR UPDATE TO selqiro_listing_price_writer_v1
  USING (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id))
  WITH CHECK (identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));
-- The fixed definer locker checks and locks profile, identity, membership and row.
-- No SELECT/UPDATE on those account tables is granted to this role: this also
-- avoids entering legacy self-referencing PUBLIC membership RLS from the writer.
GRANT EXECUTE ON FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean),
  public.current_user_has_identity_access(uuid),
  public.listing_price_currency_scale_v1(text), public.normalize_listing_price_v1(jsonb),
  public.listing_price_legacy_label_v1(jsonb),
  public.listing_price_tuple_valid_v1(text,numeric,text,bigint,text),
  public.listing_price_snapshot_v1(text,numeric,text,bigint,text)
  TO selqiro_listing_price_writer_v1;
-- Ownership transfer requires CREATE on the destination schema. Remove it again
-- in this same transaction. No dynamic SQL or arbitrary caller names are accepted.
GRANT CREATE ON SCHEMA public TO selqiro_listing_price_writer_v1;
ALTER FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  OWNER TO selqiro_listing_price_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_price_writer_v1;
REVOKE ALL ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb)
  FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON FUNCTION public.set_my_listing_price_core_v1(text,uuid,text,jsonb) IS
  'Release composition: closed dedicated-role price CAS; fixed definer locker validates and locks actor context. No direct API grant.';


CREATE POLICY hosted_price_writer_select ON public.listings FOR SELECT TO selqiro_listing_price_writer_v1
 USING(identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));

-- Retained declaration source: supabase/labs/listing-publication-journey-v2/02_owner_surfaces.sql
-- Integrated owner surfaces, installed only after the random disposable marker.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
END $gate$;

CREATE OR REPLACE FUNCTION public.get_my_managed_listing_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; activity jsonb; images jsonb; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id !~'^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807
 THEN RAISE EXCEPTION 'listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR SHARE OF a;
 IF aid IS NOT NULL THEN
  SELECT jsonb_build_object('status',l.status,'active_until',l.active_until) INTO activity
   FROM public.listings l WHERE l.id=p_listing_id::bigint AND l.identity_id=p_expected_identity_id;
  SELECT coalesce(jsonb_agg('/api/v2/listing-media/'||aid::text||'/'||s.ordinal::text ORDER BY s.ordinal),'[]'::jsonb)
   INTO images FROM listing_publication_private.slots s WHERE s.attempt_id=aid AND activity IS NOT NULL;
 END IF;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid),'activity',activity,'images',coalesce(images,'[]'::jsonb));
END $f$;

CREATE FUNCTION public.get_my_listing_media_binding_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE v jsonb; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
 'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.state='ready'
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published'
 AND l.identity_id=a.identity_id AND a.identity_id=p_expected_identity_id;
 RETURN v;
END $f$;

CREATE FUNCTION public.set_my_managed_listing_status_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text,
 p_expected_status text,p_status text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE r public.listings; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_status IS NULL OR p_status NOT IN('active','paused','sold') OR p_expected_status IS NULL
  OR p_expected_status NOT IN('active','paused','sold') THEN RAISE EXCEPTION 'listing_status_invalid' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM listing_publication_private.attempts a JOIN listing_publication_private.publications p ON p.attempt_id=a.id
  WHERE p.listing_id::text=p_listing_id AND a.identity_id=p_expected_identity_id AND p.state='published' FOR SHARE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'managed_listing_required' USING ERRCODE='42501'; END IF;
 r:=public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);
 IF r.status IS DISTINCT FROM p_expected_status THEN RAISE EXCEPTION 'listing_status_conflict' USING ERRCODE='40001'; END IF;
 IF p_status='active' THEN PERFORM listing_publication_private.require_policies(); END IF;
 UPDATE public.listings SET status=p_status,updated_by_user_id=p_expected_user_id WHERE id=r.id AND status=p_expected_status;
 RETURN jsonb_build_object('listing_id',r.id::text,'status',p_status);
END $f$;

CREATE FUNCTION public.renew_my_managed_listing_activity_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_listing_id text,p_expected_active_until timestamptz)
RETURNS TABLE(listing_id text,status text,active_until timestamptz,changed boolean) LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$ BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN QUERY SELECT * FROM public.renew_my_listing_activity_v1(p_listing_id,p_expected_active_until);
END $f$;
REVOKE ALL ON FUNCTION public.get_my_managed_listing_v2(uuid,uuid,text),
 public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
 public.set_my_managed_listing_status_v2(uuid,uuid,text,text,text),
 public.renew_my_managed_listing_activity_v2(uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;


-- Retained declaration source: supabase/labs/listing-contact-integration-v1/01_contact.sql
-- Same-V2 integration candidate. Load only after the publication/final contract in
-- a new isolated helper. No existing database, API grants, route or schedule.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
 IF to_regprocedure('listing_publication_private.require_actor(uuid,uuid)') IS NULL
 OR to_regclass('listing_publication_private.publications') IS NULL
 OR to_regclass('public.conversation_participants') IS NULL
 OR to_regclass('public.user_blocks') IS NULL
 OR to_regclass('public.conversations_id_seq') IS NULL
 OR to_regclass('public.messages_id_seq') IS NULL
 OR to_regclass('public.conversation_participants_id_seq') IS NULL THEN
  RAISE EXCEPTION 'listing_contact_reviewed_schema_required';
 END IF;
END $gate$;

CREATE ROLE selqiro_listing_contact_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
 NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- ADMIN is the PG17 automatic creator grant; preserve its bootstrap grantor.
GRANT selqiro_listing_contact_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;
CREATE SCHEMA listing_contact_private;
REVOKE ALL ON SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA listing_contact_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- The two account/identity pairs are explicit. Business identities use the same
-- existing active-membership predicate; this does not create a team inbox.
-- No listing FK: deleting a listing must not erase a conversation or a receipt.
CREATE TABLE listing_contact_private.channels (
 conversation_id bigint PRIMARY KEY CHECK(conversation_id>0)
  REFERENCES public.conversations(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 first_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 first_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 second_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 second_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(first_user_id<second_user_id), CHECK(first_identity_id<>second_identity_id),
 UNIQUE(first_user_id,first_identity_id,second_user_id,second_identity_id)
);
CREATE TABLE listing_contact_private.contact_receipts (
 actor_user_id uuid NOT NULL, request_key uuid NOT NULL,
 identity_id uuid NOT NULL, listing_id bigint NOT NULL CHECK(listing_id>0),
 conversation_id bigint NOT NULL REFERENCES listing_contact_private.channels(conversation_id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE TABLE listing_contact_private.message_receipts (
 actor_user_id uuid NOT NULL, request_key uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES listing_contact_private.channels(conversation_id) ON DELETE RESTRICT,
 message_id bigint NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT,
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
ALTER TABLE listing_contact_private.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contact_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_contact_private.message_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_contact_private.positive_id(v text) RETURNS bigint LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF v IS NULL OR length(v)>19 OR v !~ '^[1-9][0-9]*$' OR v::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
 RETURN v::bigint;
END $f$;
CREATE FUNCTION listing_contact_private.require_key(v uuid) RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF v IS NULL OR v='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
END $f$;
CREATE FUNCTION listing_contact_private.require_peer(p_user uuid,p_identity uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF i.type='private' THEN
  IF i.user_id IS DISTINCT FROM p_user THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 ELSIF i.type='business' THEN
  PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 ELSE RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501';
 END IF;
END $f$;
CREATE FUNCTION listing_contact_private.require_member(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS listing_contact_private.channels LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE c listing_contact_private.channels%ROWTYPE;
BEGIN
 SELECT * INTO c FROM listing_contact_private.channels WHERE conversation_id=p_conversation;
 IF NOT FOUND OR NOT ((c.first_user_id=p_user AND c.first_identity_id=p_identity)
  OR (c.second_user_id=p_user AND c.second_identity_id=p_identity))
 OR NOT EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=p_conversation
  AND cp.user_id=p_user AND cp.identity_id=p_identity) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 RETURN c;
END $f$;
CREATE FUNCTION listing_contact_private.require_unblocked(p_first uuid,p_second uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
BEGIN
 -- Brief shared table lock fences a new legacy block INSERT until this small DB
 -- transaction commits. No Storage, network or client wait occurs while held.
 LOCK TABLE public.user_blocks IN SHARE MODE;
 IF EXISTS(SELECT 1 FROM public.user_blocks WHERE
  (blocker_id=p_first AND blocked_id=p_second) OR (blocker_id=p_second AND blocked_id=p_first)) THEN
  RAISE EXCEPTION 'listing_contact_blocked' USING ERRCODE='42501'; END IF;
END $f$;

-- These booleans expose no private rows. The source remains API-closed; the new
-- disposable integration composition grants their execution to its API roles.
CREATE FUNCTION public.listing_contact_is_managed_v1(p_conversation bigint,p_listing bigint DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM listing_contact_private.channels WHERE conversation_id=p_conversation)
  OR EXISTS(SELECT 1 FROM listing_publication_private.publications WHERE listing_id=p_listing);
$f$;
CREATE FUNCTION public.listing_contact_visible_v1(p_conversation bigint) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
 SELECT NOT EXISTS(SELECT 1 FROM listing_contact_private.channels WHERE conversation_id=p_conversation)
 OR EXISTS(SELECT 1 FROM listing_contact_private.channels c JOIN public.profiles p ON p.id=public.listing_actor_uid_hosted_v1()
  WHERE c.conversation_id=p_conversation AND
   ((c.first_user_id=p.id AND c.first_identity_id=p.active_identity_id)
    OR (c.second_user_id=p.id AND c.second_identity_id=p.active_identity_id))
  AND public.current_user_has_identity_access(p.active_identity_id));
$f$;
CREATE POLICY contact_identity_visibility ON public.conversations AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(id)) WITH CHECK(public.listing_contact_visible_v1(id));
CREATE POLICY contact_identity_visibility ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(conversation_id)) WITH CHECK(public.listing_contact_visible_v1(conversation_id));
CREATE POLICY contact_identity_visibility ON public.conversation_participants AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.listing_contact_visible_v1(conversation_id)) WITH CHECK(public.listing_contact_visible_v1(conversation_id));

CREATE FUNCTION listing_contact_private.guard_conversation() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'listing_contact_conversation_retained' USING ERRCODE='42501'; END IF;
 IF current_user='selqiro_listing_contact_writer_v1' THEN
  IF TG_OP='INSERT' OR (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at'])=
   (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at']) THEN RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title_snapshot IS NULL AND NEW.listing_image_snapshot IS NULL AND NEW.listing_price_snapshot IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_contact_private.guard_message() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' AND current_user='selqiro_listing_contact_writer_v1'
 AND NEW.image_url IS NULL AND NEW.image_path IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title IS NULL AND NEW.listing_image IS NULL AND NEW.listing_price IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE FUNCTION listing_contact_private.guard_participant() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF current_user='selqiro_listing_contact_writer_v1' AND TG_OP='INSERT' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_contact_writer_v1' OR
   (current_user='authenticated' AND OLD.user_id=public.listing_actor_uid_hosted_v1() AND public.listing_contact_visible_v1(OLD.conversation_id)))
 AND (to_jsonb(NEW)-ARRAY['last_read_at','deleted_at','custom_title'])=(to_jsonb(OLD)-ARRAY['last_read_at','deleted_at','custom_title']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.conversations
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_conversation();
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.messages
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_message();
CREATE TRIGGER guard_listing_contact BEFORE INSERT OR UPDATE OR DELETE ON public.conversation_participants
 FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_participant();

CREATE FUNCTION public.contact_my_listing_seller_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE lid bigint; l public.listings%ROWTYPE; old listing_contact_private.contact_receipts%ROWTYPE;
 cid bigint; candidate bigint; first_u uuid; first_i uuid; second_u uuid; second_i uuid; t timestamptz;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key); lid:=listing_contact_private.positive_id(p_listing_id);
 SELECT * INTO old FROM listing_contact_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.listing_id<>lid THEN
   RAISE EXCEPTION 'listing_contact_request_conflict' USING ERRCODE='22023'; END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
   'identity_id',p_expected_identity_id,'conversation_id',old.conversation_id::text,'listing_id',lid::text,'replayed',true);
 END IF;
 -- Listing before conversation row: same ordering as terminal deletion. Shared
 -- lock fences status changes/deletion while its automatic snapshot is captured.
 SELECT x.* INTO l FROM public.listings x WHERE x.id=lid FOR SHARE;
 IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published') THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF l.user_id=p_expected_user_id OR l.identity_id=p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_contact_self' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_peer(l.user_id,l.identity_id);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,l.user_id);
 IF p_expected_user_id<l.user_id THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=l.user_id;second_i:=l.identity_id;
 ELSE first_u:=l.user_id;first_i:=l.identity_id;second_u:=p_expected_user_id;second_i:=p_expected_identity_id; END IF;
 candidate:=nextval('public.conversations_id_seq');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  IF l.active_until<=t THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
   created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,lid,l.title,l.image,l.price,p_expected_user_id,t,t,p_expected_user_id,l.user_id,p_expected_identity_id,l.identity_id);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
   VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,l.user_id,l.identity_id,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
   AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND OR l.active_until<=clock_timestamp() THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=lid,listing_title_snapshot=l.title,listing_image_snapshot=l.image,
   listing_price_snapshot=l.price,updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO listing_contact_private.contact_receipts(actor_user_id,request_key,identity_id,listing_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,lid,cid);
 RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
  'identity_id',p_expected_identity_id,'conversation_id',cid::text,'listing_id',lid::text,'replayed',false);
END $f$;

CREATE FUNCTION public.send_my_listing_message_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; lid bigint; ch listing_contact_private.channels%ROWTYPE; old listing_contact_private.message_receipts%ROWTYPE;
 l public.listings%ROWTYPE; digest bytea; mid bigint; peer_u uuid; peer_i uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key); cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_listing_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000 OR btrim(p_message,E' \t\r\n')='' THEN
  RAISE EXCEPTION 'listing_contact_input' USING ERRCODE='22023'; END IF;
 digest:=sha256(convert_to(jsonb_build_object('conversation_id',cid::text,'listing_id',p_listing_id,'message',p_message)::text,'UTF8'));
 ch:=listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO old FROM listing_contact_private.message_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'listing_contact_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
   'identity_id',p_expected_identity_id,'conversation_id',cid::text,'message_id',old.message_id::text,'replayed',true);
 END IF;
 IF ch.first_user_id=p_expected_user_id THEN peer_u:=ch.second_user_id;peer_i:=ch.second_identity_id;
 ELSE peer_u:=ch.first_user_id;peer_i:=ch.first_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 IF lid IS NOT NULL THEN
  SELECT x.* INTO l FROM public.listings x WHERE x.id=lid FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
  OR NOT ((l.user_id=ch.first_user_id AND l.identity_id=ch.first_identity_id) OR (l.user_id=ch.second_user_id AND l.identity_id=ch.second_identity_id))
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published') THEN
   RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND OR (lid IS NOT NULL AND l.active_until<=clock_timestamp()) THEN
  RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message,listing_id,listing_title,listing_image,listing_price)
 VALUES(cid,p_expected_user_id,p_expected_identity_id,p_message,lid,l.title,l.image,l.price) RETURNING id INTO mid;
 INSERT INTO listing_contact_private.message_receipts(actor_user_id,request_key,identity_id,conversation_id,message_id,intent_sha256)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,cid,mid,digest);
 UPDATE public.conversations SET updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',1,'request_key',p_request_key,'actor_user_id',p_expected_user_id,
  'identity_id',p_expected_identity_id,'conversation_id',cid::text,'message_id',mid::text,'replayed',false);
END $f$;

GRANT USAGE ON SCHEMA public,listing_publication_private,listing_contact_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON public.conversations,public.messages,public.conversation_participants TO selqiro_listing_contact_writer_v1;
GRANT UPDATE(listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,updated_at,archived_at)
 ON public.conversations TO selqiro_listing_contact_writer_v1;
GRANT UPDATE(last_read_at,deleted_at,custom_title) ON public.conversation_participants TO selqiro_listing_contact_writer_v1;
GRANT SELECT,UPDATE ON public.profiles,public.identities,public.business_members,public.user_blocks,public.listings TO selqiro_listing_contact_writer_v1;
GRANT USAGE,SELECT ON SEQUENCE public.conversations_id_seq,public.messages_id_seq,public.conversation_participants_id_seq TO selqiro_listing_contact_writer_v1;
GRANT SELECT ON listing_publication_private.publications TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON ALL TABLES IN SCHEMA listing_contact_private TO selqiro_listing_contact_writer_v1;
CREATE POLICY contact_writer ON public.conversations FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON public.messages FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON public.conversation_participants FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer_read ON listing_publication_private.publications FOR SELECT TO selqiro_listing_contact_writer_v1 USING(true);
DO $policies$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['profiles','identities','business_members','user_blocks','listings'] LOOP
  EXECUTE format('CREATE POLICY contact_writer_read ON public.%I FOR SELECT TO selqiro_listing_contact_writer_v1 USING(true)',n);
  -- UPDATE privilege is required for row/table locks. WITH CHECK(false) prevents
  -- these contact functions from modifying the underlying actor/listing data.
  EXECUTE format('CREATE POLICY contact_writer_lock ON public.%I FOR UPDATE TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(false)',n);
 END LOOP;
 FOREACH n IN ARRAY ARRAY['channels','contact_receipts','message_receipts'] LOOP
  EXECUTE format('CREATE POLICY contact_writer ON listing_contact_private.%I FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true)',n);
 END LOOP;
END $policies$;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1(),public.current_user_has_identity_access(uuid),public.lock_listing_creation_actor_v1(uuid),
 listing_publication_private.require_actor(uuid,uuid),public.listing_contact_is_managed_v1(bigint,bigint),public.listing_contact_visible_v1(bigint)
 TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_contact_private TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
 public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),public.listing_contact_is_managed_v1(bigint,bigint),
 public.listing_contact_visible_v1(bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_contact_is_managed_v1(bigint,bigint) TO selqiro_listing_final_writer_v1;
COMMENT ON SCHEMA listing_contact_private IS 'Isolated same-V2 two-account/identity contact and plain-message idempotency. No team inbox, live API grant, message-image upload or account erasure contract.';


-- Retained declaration source: supabase/labs/listing-contact-integration-v1/02_read.sql
-- Authenticated managed-conversation views for the same disposable V2 journey.
DO $gate$ BEGIN
 PERFORM listing_publication_private.assert_hosted_install_context();
 IF to_regclass('listing_contact_private.channels') IS NULL THEN
  RAISE EXCEPTION 'listing_contact_reviewed_schema_required'; END IF;
END $gate$;

CREATE FUNCTION listing_contact_private.peer_ready(p_user uuid,p_identity uuid,p_viewer uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,public,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i WHERE i.id=p_identity AND i.status='active'
  AND ((i.type='private' AND i.user_id=p_user) OR (i.type='business' AND EXISTS(
   SELECT 1 FROM public.business_members b WHERE b.business_account_id=i.business_account_id
    AND b.user_id=p_user AND b.status='active'))))
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=p_user AND blocked_id=p_viewer)
  OR (blocker_id=p_viewer AND blocked_id=p_user));
$f$;

CREATE FUNCTION public.get_my_listing_conversation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint; before_id bigint; ch listing_contact_private.channels%ROWTYPE;
 cv public.conversations%ROWTYPE; peer_u uuid;peer_i uuid;items jsonb;next_id text;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_before_message_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_message_id); END IF;
 ch:=listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO cv FROM public.conversations WHERE id=cid FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_contact_unavailable' USING ERRCODE='42501'; END IF;
 IF ch.first_user_id=p_expected_user_id THEN peer_u:=ch.second_user_id;peer_i:=ch.second_identity_id;
 ELSE peer_u:=ch.first_user_id;peer_i:=ch.first_identity_id; END IF;
 WITH page AS MATERIALIZED(SELECT id,sender_id,sender_identity_id,message,created_at FROM public.messages
  WHERE conversation_id=cid AND (before_id IS NULL OR id<before_id) ORDER BY id DESC LIMIT 51),
 shown AS(SELECT * FROM page ORDER BY id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id::text,'mine',sender_id=p_expected_user_id AND sender_identity_id=p_expected_identity_id,
  'text',message,'created_at',created_at) ORDER BY id),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN min(id)::text ELSE NULL END INTO items,next_id FROM shown;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'peer_name',(SELECT left(display_name,200) FROM public.identities WHERE id=peer_i),
  'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id),
  'listing',CASE WHEN cv.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',cv.listing_id::text,'title',cv.listing_title_snapshot) END,
  'messages',items,'next_before_message_id',next_id);
END $f$;

CREATE FUNCTION public.list_my_listing_conversations_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_before_conversation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE before_id bigint;items jsonb;next_id text;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_before_conversation_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_conversation_id); END IF;
 WITH page AS MATERIALIZED(SELECT c.conversation_id,cv.listing_title_snapshot,cv.updated_at,
  (SELECT left(display_name,200) FROM public.identities WHERE id=CASE WHEN c.first_user_id=p_expected_user_id THEN c.second_identity_id ELSE c.first_identity_id END) AS peer_name
  FROM listing_contact_private.channels c JOIN public.conversations cv ON cv.id=c.conversation_id
  JOIN public.conversation_participants cp ON cp.conversation_id=c.conversation_id AND cp.user_id=p_expected_user_id
   AND cp.identity_id=p_expected_identity_id AND cp.deleted_at IS NULL
  WHERE ((c.first_user_id=p_expected_user_id AND c.first_identity_id=p_expected_identity_id)
   OR (c.second_user_id=p_expected_user_id AND c.second_identity_id=p_expected_identity_id))
   AND (before_id IS NULL OR c.conversation_id<before_id) ORDER BY c.conversation_id DESC LIMIT 51),
 shown AS(SELECT * FROM page ORDER BY conversation_id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('conversation_id',conversation_id::text,'peer_name',peer_name,
  'listing_title',listing_title_snapshot,'updated_at',updated_at) ORDER BY conversation_id DESC),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN min(conversation_id)::text ELSE NULL END INTO items,next_id FROM shown;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversations',items,'next_before_conversation_id',next_id);
END $f$;

GRANT EXECUTE ON FUNCTION listing_contact_private.peer_ready(uuid,uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_listing_conversation_v1(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.list_my_listing_conversations_v1(uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION listing_contact_private.peer_ready(uuid,uuid,uuid),
 public.get_my_listing_conversation_v1(uuid,uuid,text,text),public.list_my_listing_conversations_v1(uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;



-- COMPONENT 50_storage_authority.sql
-- Hosted SOURCE UploadPart admission. Run only inside the reviewed additive
-- release transaction, after its private ledgers and before final API grants.
-- This creates no Storage namespace functions, table triggers, buckets or rows.
-- The provider-supported policy management channel must authorize the two
-- bucket-scoped policies below; lack of that permission aborts the transaction.
DO $storage_preconditions$ BEGIN
 IF current_user <> 'postgres'
  OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_preview_settings
    WHERE singleton AND release_id='listing-publication-hosted-preview-v1'
      AND NOT enabled AND NOT release_ready)
  OR to_regprocedure('storage.allow_only_operation(text)') IS NULL
  OR to_regprocedure('public.listing_actor_uid_hosted_v1()') IS NULL
  OR to_regprocedure('listing_publication_private.assert_hosted_preview_actor(uuid)') IS NULL
  OR NOT has_function_privilege('selqiro_listing_final_writer_v1',
    'public.listing_actor_uid_hosted_v1()','EXECUTE')
  OR NOT has_function_privilege('selqiro_listing_final_writer_v1',
    'storage.allow_only_operation(text)','EXECUTE') THEN
  RAISE EXCEPTION 'hosted_storage_authority_prerequisite' USING ERRCODE='55000';
 END IF;
END $storage_preconditions$;

-- Encode the exact provider-issued opaque ID; never interpret it as a UUID,
-- path or pre-encoded query value. UTF-8 octets outside RFC3986 unreserved ASCII
-- become uppercase percent escapes, matching the AWS SDK signer.
CREATE FUNCTION listing_publication_private.hosted_s3_query_value_v1(p_value text)
RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE bytes bytea:=convert_to(p_value,'UTF8'); i integer; b integer; encoded text:='';
BEGIN
 IF octet_length(bytes)>2048 THEN
  RAISE EXCEPTION 'hosted_upload_id_length' USING ERRCODE='22023';
 END IF;
 FOR i IN 0..octet_length(bytes)-1 LOOP
  b:=get_byte(bytes,i);
  IF (b BETWEEN 65 AND 90) OR (b BETWEEN 97 AND 122) OR (b BETWEEN 48 AND 57)
    OR b IN(45,46,95,126) THEN
   encoded:=encoded||chr(b);
  ELSE
   encoded:=encoded||'%'||upper(lpad(to_hex(b),2,'0'));
  END IF;
 END LOOP;
 RETURN encoded;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.hosted_s3_query_value_v1(text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.hosted_s3_query_value_v1(text)
 TO selqiro_listing_final_writer_v1;

CREATE FUNCTION public.listing_source_part_allowed_hosted_v1(p_bucket text,p_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; request_path text;
 query_fields text[]; request_headers jsonb;
BEGIN
 IF current_setting('role',true) IS DISTINCT FROM 'authenticated' OR public.listing_actor_uid_hosted_v1() IS NULL
  OR p_bucket IS DISTINCT FROM 'listing-publication-private'
  OR NOT coalesce(storage.allow_only_operation('storage.s3.upload.part'),false)
  OR current_setting('request.method',true) IS DISTINCT FROM 'PUT' THEN RETURN false; END IF;

 -- Supabase's S3 router supplies request.url as request.path. A different live
 -- gateway shape fails closed; no suffix/path-normalization fallback is allowed.
 request_path:=coalesce(current_setting('request.path',true),'');
 IF split_part(request_path,'?',1) IS DISTINCT FROM '/s3/'||p_bucket||'/'||p_path
  OR strpos(request_path,'?')=0 THEN RETURN false; END IF;
 query_fields:=string_to_array(substr(request_path,strpos(request_path,'?')+1),'&');
 -- Parse only raw parameter names. Reject encoded names, empty fields and even
 -- case-folded duplicate names, instead of disagreeing with the provider parser.
 IF cardinality(query_fields)>32 OR cardinality(query_fields)<2
  OR EXISTS(SELECT 1 FROM unnest(query_fields) f
    WHERE strpos(f,'=')=0 OR split_part(f,'=',1)!~'^[A-Za-z0-9_-]+$')
  OR (SELECT count(DISTINCT lower(split_part(f,'=',1))) FROM unnest(query_fields) f)
    <>cardinality(query_fields)
  OR NOT coalesce('partNumber=1'=ANY(query_fields),false)
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE split_part(f,'=',1)='partNumber')<>1
  OR (SELECT count(*) FROM unnest(query_fields) f WHERE split_part(f,'=',1)='uploadId')<>1
  THEN RETURN false; END IF;
 BEGIN
  request_headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 EXCEPTION WHEN invalid_text_representation THEN RETURN false;
 END;
 IF jsonb_typeof(request_headers) IS DISTINCT FROM 'object' THEN RETURN false; END IF;

 BEGIN
  PERFORM listing_publication_private.assert_hosted_preview_actor(public.listing_actor_uid_hosted_v1());
 EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE '55000' OR SQLSTATE 'P0002' THEN RETURN false;
 END;
 SELECT x.* INTO a FROM listing_publication_private.attempts x
 JOIN listing_publication_private.objects o ON o.attempt_id=x.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE x.actor_user_id=public.listing_actor_uid_hosted_v1() AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
  AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Preserve the same actor/identity/attempt/policy lock ordering used to issue
 -- the part grant and claim Complete. Admission does not drain an existing PUT.
 BEGIN
  PERFORM listing_publication_private.lock_multipart_context(a.actor_user_id,a.identity_id,a.id,false);
 EXCEPTION WHEN SQLSTATE '42501' OR SQLSTATE '55000' OR SQLSTATE 'P0002' THEN RETURN false;
 END;
 RETURN EXISTS(SELECT 1 FROM listing_publication_private.objects o
  JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
  JOIN listing_publication_private.slots s ON s.id=o.slot_id
  WHERE o.attempt_id=a.id AND o.bucket_id=p_bucket AND o.object_path=p_path AND o.kind='source'
   AND o.dispatch_key IS NULL AND m.state='open' AND m.problem IS NULL AND m.part_key IS NOT NULL
   AND m.part_sign_epoch+600>floor(extract(epoch FROM clock_timestamp()))::bigint
   AND m.upload_id IS NOT NULL
   AND ('uploadId='||listing_publication_private.hosted_s3_query_value_v1(m.upload_id))=ANY(query_fields)
   AND request_headers->>'content-length'=s.expected_source_bytes::text
   AND NOT request_headers ? 'x-amz-decoded-content-length');
END $f$;
REVOKE ALL ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
GRANT USAGE ON SCHEMA storage TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) TO authenticated,anon;

-- Restrictive AND closes this managed bucket even if another permissive policy
-- exists. Other buckets retain their current behavior. No S3 Create, Complete,
-- Abort, Copy, full-object upload or direct read is authorized for the browser.
CREATE POLICY listing_hosted_multipart_operation_fence ON storage.objects AS RESTRICTIVE
 FOR ALL TO authenticated,anon
 USING(bucket_id<>'listing-publication-private' OR public.listing_source_part_allowed_hosted_v1(bucket_id,name))
 WITH CHECK(bucket_id<>'listing-publication-private' OR public.listing_source_part_allowed_hosted_v1(bucket_id,name));
CREATE POLICY listing_hosted_multipart_source_part ON storage.objects FOR ALL TO authenticated
 USING(bucket_id='listing-publication-private' AND public.listing_source_part_allowed_hosted_v1(bucket_id,name))
 WITH CHECK(bucket_id='listing-publication-private' AND public.listing_source_part_allowed_hosted_v1(bucket_id,name));

-- The managed multipart path must not reopen the historical broad capability
-- issuing API alongside its operation-aware user-JWT grants.
DO $close_legacy$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['reserve_my_listing_upload_v1','get_my_listing_upload_grant_v1',
  'claim_listing_upload_sign_v1','record_listing_upload_grant_v1','confirm_listing_upload_release_v1',
  'record_listing_web_write_completed_v1']) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_legacy$;
UPDATE listing_publication_private.hosted_preview_settings
 SET storage_authority_version='source-part-rfc3986-v1'
 WHERE singleton AND NOT enabled AND NOT release_ready;

COMMENT ON FUNCTION public.listing_source_part_allowed_hosted_v1(text,text) IS
 'Closed hosted-preview browser Auth-JWT SOURCE UploadPart admission: current allowlisted actor/identity/policy, exact operation/method/path, canonical opaque uploadId, one part and bound Content-Length. No privileged S3 credentials or external-write finality claim.';


-- COMPONENT 60_preview_authority.sql
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

DO $close_new_public_functions$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY['cancel_my_listing_publication_journey_v2','cancel_my_listing_publication_v1','claim_listing_cleanup_for_attempt_v2','claim_listing_cleanup_v1','claim_listing_multipart_complete_v2','claim_listing_multipart_part_v2','claim_listing_upload_sign_v1','claim_listing_web_image_v1','claim_listing_write_reconcile_v1','confirm_listing_upload_release_v1','contact_my_listing_seller_v1','delete_my_published_listing_v1','get_listing_multipart_v2','get_my_listing_basics_v1','get_my_listing_cleanup_summary_v1','get_my_listing_conversation_v1','get_my_listing_edit_v1','get_my_listing_media_binding_v2','get_my_listing_publication_confirmation_v1','get_my_listing_publication_journey_v2','get_my_listing_publication_v1','get_my_listing_upload_grant_v1','get_my_listing_web_ready_v1','get_my_managed_listing_v2','get_my_marketplace_items_v3','get_public_listing_detail_v1','get_public_listing_media_binding_v1','get_public_profile_listings_v1','get_public_profile_services_v1','get_public_profile_showcases_v1','get_selqiro_hosted_preview_readiness_v1','guard_listing_price_v2','horse_owner_price_read_v1','list_my_listing_conversations_v1','listing_actor_uid_hosted_v1','listing_basics_search_text_v1','listing_basics_snapshot_v1','listing_basics_values_v1','listing_contact_is_managed_v1','listing_contact_visible_v1','listing_create_category_path_valid_v1','listing_final_guard_state_v1','listing_price_currency_scale_v1','listing_price_legacy_label_v1','listing_price_read_model_v1','listing_price_snapshot_v1','listing_price_tuple_valid_v1','listing_source_part_allowed_hosted_v1','lock_listing_creation_actor_v1','lock_my_listing_basics_v1','normalize_listing_basics_v1','normalize_listing_create_location_v1','normalize_listing_creation_v1','normalize_listing_price_v1','prepare_listing_multipart_cleanup_v2','prepare_listing_web_write_v1','prepare_my_listing_publication_v1','project_horse_wanted_owner_summary_v2','public_listing_detail_field_spec_v1','public_listing_detail_values_v1','publish_my_listing_v1','purge_listing_upload_token_one_v1','record_listing_cleanup_v1','record_listing_multipart_abort_v2','record_listing_multipart_completed_v2','record_listing_multipart_created_v2','record_listing_multipart_problem_v2','record_listing_multipart_verified_v2','record_listing_upload_grant_v1','record_listing_web_ready_v1','record_listing_web_write_completed_v1','record_listing_write_reconcile_v1','renew_my_managed_listing_activity_v2','require_listing_create_keys_v1','reserve_listing_multipart_v2','reserve_my_listing_upload_v1','save_my_listing_basics_v1','save_my_listing_edit_v1','search_public_listings_v2','send_my_listing_message_v1','set_my_listing_price_core_v1','set_my_managed_listing_status_v2','settle_recorded_unreleased_source_one_v1','settle_unreleased_listing_source_one_v1']) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_new_public_functions$;


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
