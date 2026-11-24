-- New writes only. Existing actor, identity, membership and replay checks remain
-- at their established call sites. This helper exports no account information.
CREATE FUNCTION listing_contact_private.require_available_accounts_v1(p_first uuid,p_second uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog SET lock_timeout='2s' AS $available_accounts$
DECLARE account_key uuid;deleted_value timestamptz;banned_value timestamptz;
 created_value timestamptz;state_value text;revision_value bigint;
BEGIN
 IF p_first IS NULL OR p_second IS NULL OR p_first=p_second THEN
  RAISE EXCEPTION 'message_account_unavailable' USING ERRCODE='42501';
 END IF;
 -- A single canonical pair order, Auth then state for each account. Locks remain
 -- held until the surrounding contact/send transaction commits or rolls back.
 -- A future closure must use this order and commit its state transition before
 -- touching profiles, offers, conversations or messages in a later transaction.
 FOREACH account_key IN ARRAY ARRAY[least(p_first,p_second),greatest(p_first,p_second)] LOOP
  SELECT u.deleted_at,u.banned_until,u.created_at
   INTO deleted_value,banned_value,created_value
   FROM auth.users u WHERE u.id=account_key FOR SHARE;
  IF NOT FOUND OR deleted_value IS NOT NULL
   OR (banned_value IS NOT NULL AND banned_value>statement_timestamp())
   OR (created_value IS NOT NULL AND NOT isfinite(created_value)) THEN
   RAISE EXCEPTION 'message_account_unavailable' USING ERRCODE='42501';
  END IF;
  SELECT s.state,s.revision INTO state_value,revision_value
   FROM account_lifecycle_private.account_states s
   WHERE s.account_user_id=account_key FOR SHARE;
  IF NOT FOUND OR state_value IS DISTINCT FROM 'active'
   OR revision_value IS NULL OR revision_value<=0 THEN
   RAISE EXCEPTION 'message_account_unavailable' USING ERRCODE='42501';
  END IF;
 END LOOP;
END $available_accounts$;
ALTER FUNCTION listing_contact_private.require_available_accounts_v1(uuid,uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION listing_contact_private.require_available_accounts_v1(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_contact_private.require_available_accounts_v1(uuid,uuid)
 TO selqiro_listing_contact_writer_v1;
