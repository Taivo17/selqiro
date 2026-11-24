-- Fresh execution prerequisite, not a previously observed catalog fact.
-- FOR SHARE requires row visibility, SELECT and at least one UPDATE column.
-- No privileges are changed and no Auth/account data is selected here.
DO $message_media_authority$
BEGIN
 IF current_user <> 'postgres'
 OR NOT coalesce(has_schema_privilege('postgres','auth','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','auth.users','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','auth.users','UPDATE'),false)
 OR coalesce(row_security_active('auth.users'::regclass),true)
 OR NOT coalesce(has_schema_privilege('postgres','account_lifecycle_private','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT'),false)
 OR NOT coalesce(has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE'),false)
 OR coalesce(row_security_active('account_lifecycle_private.account_states'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_AUTHORITY_REQUIRED';
 END IF;
END;
$message_media_authority$;

-- Storage policy authority and bucket configuration are fresh prerequisites.
-- They are not described as previously observed hosted metadata. No object rows
-- are read, and existing legacy bucket privacy/limits are preserved as found.
DO $storage_authority$
DECLARE storage_rls boolean;storage_authority boolean;storage_setting text;
 storage_policy_grants jsonb;storage_grant_tables jsonb;
BEGIN
 IF NOT coalesce(has_schema_privilege('postgres','storage','USAGE'),false)
 OR NOT coalesce(has_table_privilege('postgres','storage.buckets','SELECT'),false)
 OR coalesce(row_security_active('storage.buckets'::regclass),true) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 SELECT c.relrowsecurity,pg_has_role('postgres',c.relowner,'USAGE') INTO storage_rls,storage_authority FROM pg_class c WHERE c.oid='storage.objects'::regclass;
 -- Supabase may delegate policy management without inheriting the table owner.
 -- A registered SIGHUP-only Supautils setting is distinct from an arbitrary
 -- custom GUC placeholder. Its grant is for this exact current user and table.
 IF storage_authority IS NOT TRUE AND current_user='postgres' THEN
  storage_authority:=false;
  BEGIN
   SELECT s.setting INTO storage_setting FROM pg_catalog.pg_settings s
    WHERE s.name='supautils.policy_grants' AND s.context='sighup' AND s.vartype='string';
   IF FOUND THEN
    storage_policy_grants:=storage_setting::jsonb;
    IF jsonb_typeof(storage_policy_grants)='object' THEN
     IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g WHERE jsonb_typeof(g.value)<>'array') THEN
      IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g
       CROSS JOIN LATERAL jsonb_array_elements(g.value) t WHERE jsonb_typeof(t.value)<>'string') THEN
       storage_grant_tables:=storage_policy_grants->current_user::text;
       IF jsonb_typeof(storage_grant_tables)='array' THEN
        -- Resolve a table NAME like Supautils, not regclass's numeric-OID input.
        SELECT coalesce(bool_or(pg_catalog.to_regclass((SELECT string_agg(pg_catalog.quote_ident(p.part),'.' ORDER BY p.ordinal)
          FROM unnest(pg_catalog.parse_ident(t.value,true)) WITH ORDINALITY p(part,ordinal)))='storage.objects'::regclass),false)
         INTO storage_authority FROM jsonb_array_elements_text(storage_grant_tables) t(value);
       END IF;
      END IF;
     END IF;
    END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN
   storage_authority:=false;
  END;
 END IF;

 IF storage_rls IS NOT TRUE OR storage_authority IS NOT TRUE THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_AUTHORITY_REQUIRED'; END IF;
 IF (SELECT count(*) FROM pg_attribute WHERE attrelid='storage.objects'::regclass AND attnum>0 AND NOT attisdropped)>128
 OR (SELECT count(*) FROM pg_policy WHERE polrelid='storage.objects'::regclass)>128
 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='storage.objects'::regclass AND NOT tgisinternal)>64 THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_STORAGE_CATALOG_LIMIT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='messages')
 OR NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false
  AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]) THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='ACCOUNT_MESSAGE_MEDIA_BUCKET_CONFIG_MISMATCH'; END IF;
END;
$storage_authority$;
