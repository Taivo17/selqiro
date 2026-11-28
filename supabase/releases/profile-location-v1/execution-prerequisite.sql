DO $location_authority$
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::integer<>170006
  OR NOT coalesce(has_schema_privilege('postgres','auth','USAGE'),false)
  OR NOT coalesce(has_table_privilege('postgres','auth.users','SELECT'),false)
  OR NOT coalesce(has_any_column_privilege('postgres','auth.users','UPDATE'),false)
  OR coalesce(row_security_active('auth.users'::regclass),true)
  OR NOT coalesce(has_schema_privilege('postgres','account_lifecycle_private','USAGE'),false)
  OR NOT coalesce(has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT'),false)
  OR NOT coalesce(has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE'),false)
  OR coalesce(row_security_active('account_lifecycle_private.account_states'::regclass),true) THEN
  RAISE EXCEPTION 'PROFILE_LOCATION_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END;
$location_authority$;
