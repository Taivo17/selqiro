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

-- GENERATED_NEW_FUNCTION_COLLISION_GUARD --

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
