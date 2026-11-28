DO $map_authority$
DECLARE relation_name text;
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::integer<>170006 THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['auth.users','public.profiles','public.identities',
  'public.identity_profiles','public.business_accounts','public.user_blocks',
  'account_lifecycle_private.account_states','profile_location_private.profile_locations'] LOOP
  IF NOT coalesce(has_schema_privilege('postgres',split_part(relation_name,'.',1),'USAGE'),false)
   OR NOT coalesce(has_table_privilege('postgres',relation_name,'SELECT'),false)
   OR coalesce(row_security_active(relation_name::regclass),true) THEN
   RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
  END IF;
 END LOOP;
 IF NOT has_function_privilege('postgres','public.get_store_by_slug(text)','EXECUTE')
  OR NOT has_function_privilege('postgres','profile_location_private.valid_location(jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END;
$map_authority$;
