-- Source fragment. Installation owns only this new schema, two functions, and trigger.
CREATE SCHEMA account_lifecycle_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA account_lifecycle_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE account_lifecycle_private.account_states (
  account_user_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'active',
  revision bigint NOT NULL DEFAULT 1,
  initialized_at timestamptz NOT NULL DEFAULT pg_catalog.statement_timestamp(),
  CONSTRAINT account_states_pkey PRIMARY KEY (account_user_id),
  CONSTRAINT account_states_auth_user_fkey FOREIGN KEY (account_user_id)
    REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT account_states_active_only CHECK (state = 'active'),
  CONSTRAINT account_states_revision_positive CHECK (revision > 0)
);
ALTER TABLE account_lifecycle_private.account_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE account_lifecycle_private.account_states FROM PUBLIC, anon, authenticated, service_role;

-- @FUNCTIONS@

REVOKE ALL ON FUNCTION account_lifecycle_private.initialize_account_state() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_account_state_v1(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_account_state_v1(uuid) TO authenticated;

-- Under the surrounding Auth write lock, install the trigger before the bounded backfill.
CREATE TRIGGER initialize_account_state
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION account_lifecycle_private.initialize_account_state();

DO $bounded_backfill$
BEGIN
  IF (SELECT pg_catalog.count(*) FROM (SELECT 1 FROM auth.users LIMIT 1001) AS bounded_users) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_STATE_BACKFILL_LIMIT';
  END IF;
  INSERT INTO account_lifecycle_private.account_states(account_user_id)
  SELECT u.id FROM auth.users AS u
  ON CONFLICT (account_user_id) DO NOTHING;
END;
$bounded_backfill$;

-- Transactional notification; delivery follows commit. HTTP cache readiness is tested separately.
NOTIFY pgrst, 'reload schema';
