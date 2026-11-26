-- Only new job mutations. The existing actor/identity/business authority and
-- completed request-receipt path stay at their established call sites.
CREATE FUNCTION jobs_private.require_available_accounts_v1(p_actor uuid,p_owner uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog SET lock_timeout='2s' AS $job_accounts$
DECLARE account_key uuid;deleted_value timestamptz;banned_value timestamptz;
 created_value timestamptz;state_value text;revision_value bigint;
BEGIN
 IF p_actor IS NULL OR p_owner IS NULL THEN
  RAISE EXCEPTION 'job_account_unavailable' USING ERRCODE='42501';
 END IF;
 -- One canonical order, including the usual actor=owner case only once.
 -- This matches the accepted contact fence: UUID order, then Auth and state
 -- for each account. Locks remain until the surrounding mutation ends.
 -- A future closure must commit its Auth/state-only transition before any
 -- profile, identity, business, content or conversation work in a later tx.
 FOR account_key IN SELECT DISTINCT x.id FROM unnest(ARRAY[p_actor,p_owner]) x(id) ORDER BY x.id LOOP
  SELECT u.deleted_at,u.banned_until,u.created_at
   INTO deleted_value,banned_value,created_value
   FROM auth.users u WHERE u.id=account_key FOR SHARE;
  IF NOT FOUND OR deleted_value IS NOT NULL
   OR (banned_value IS NOT NULL AND banned_value>statement_timestamp())
   OR (created_value IS NOT NULL AND NOT isfinite(created_value)) THEN
   RAISE EXCEPTION 'job_account_unavailable' USING ERRCODE='42501';
  END IF;
  SELECT s.state,s.revision INTO state_value,revision_value
   FROM account_lifecycle_private.account_states s
   WHERE s.account_user_id=account_key FOR SHARE;
  IF NOT FOUND OR state_value IS DISTINCT FROM 'active'
   OR revision_value IS NULL OR revision_value<=0 THEN
   RAISE EXCEPTION 'job_account_unavailable' USING ERRCODE='42501';
  END IF;
 END LOOP;
END $job_accounts$;
ALTER FUNCTION jobs_private.require_available_accounts_v1(uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION jobs_private.require_available_accounts_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
