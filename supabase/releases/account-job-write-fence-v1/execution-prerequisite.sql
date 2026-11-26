-- Fresh execution prerequisite, not a previously observed catalog fact.
-- FOR SHARE requires row visibility, SELECT and at least one UPDATE column.
-- No privileges are changed and no Auth/account data is selected here.
DO $job_authority$
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
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNT_JOB_WRITE_AUTHORITY_REQUIRED';
 END IF;
END;
$job_authority$;
