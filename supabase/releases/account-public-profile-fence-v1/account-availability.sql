-- Only public read eligibility; no state transition, row lock or repair-on-read.
CREATE FUNCTION account_lifecycle_private.account_is_available(p_account_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $account_available$
 SELECT EXISTS (
  SELECT 1
  FROM account_lifecycle_private.account_states AS s
  JOIN auth.users AS u ON u.id = s.account_user_id
  WHERE s.account_user_id = p_account_user_id
    AND s.state = 'active'
    AND s.revision > 0
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.statement_timestamp())
    AND (u.created_at IS NULL OR pg_catalog.isfinite(u.created_at))
 );
$account_available$;
REVOKE ALL ON FUNCTION account_lifecycle_private.account_is_available(uuid)
 FROM PUBLIC, anon, authenticated, service_role;
