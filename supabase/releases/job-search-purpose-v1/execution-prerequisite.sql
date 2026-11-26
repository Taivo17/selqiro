-- No authority is granted. Only the pinned function owner may apply this release.
DO $job_search_authority$ BEGIN
 IF current_user <> 'postgres' THEN
  RAISE EXCEPTION 'JOB_SEARCH_PURPOSE_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END $job_search_authority$;
