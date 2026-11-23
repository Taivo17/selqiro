-- Source fragment: assembled into apply.sql. No caller-controlled account state.
CREATE FUNCTION account_lifecycle_private.initialize_account_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $account_init$
BEGIN
  INSERT INTO account_lifecycle_private.account_states(account_user_id)
  VALUES (NEW.id)
  ON CONFLICT (account_user_id) DO NOTHING;
  RETURN NEW;
END;
$account_init$;

CREATE FUNCTION public.get_my_account_state_v1(p_expected_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $account_state$
DECLARE
  v_actor uuid;
  v_role text;
  v_state text;
  v_revision bigint;
  v_account_created_at timestamptz;
  v_read_at timestamptz := pg_catalog.statement_timestamp();
BEGIN
  BEGIN
    v_actor := auth.uid();
    v_role := COALESCE(
      NULLIF(pg_catalog.current_setting('request.jwt.claim.role', true), ''),
      NULLIF(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    );
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_AUTH_REQUIRED';
  END;
  IF v_actor IS NULL OR v_role IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_AUTH_REQUIRED';
  END IF;
  IF p_expected_user_id IS NULL OR p_expected_user_id <> v_actor THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_ACTOR_MISMATCH';
  END IF;
  SELECT u.created_at INTO v_account_created_at
  FROM auth.users AS u
  WHERE u.id = v_actor
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= v_read_at);
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_UNAVAILABLE';
  END IF;
  IF v_account_created_at IS NOT NULL AND NOT pg_catalog.isfinite(v_account_created_at) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_UNAVAILABLE';
  END IF;
  SELECT s.state, s.revision INTO v_state, v_revision
  FROM account_lifecycle_private.account_states AS s
  WHERE s.account_user_id = v_actor;
  IF NOT FOUND OR v_state IS DISTINCT FROM 'active' OR v_revision IS NULL OR v_revision <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ACCOUNT_STATE_UNAVAILABLE';
  END IF;
  RETURN pg_catalog.jsonb_build_object(
    'schema_version', 1,
    'actor_user_id', v_actor,
    'scope', 'account',
    'state', v_state,
    'revision', v_revision::text,
    'account_created_at', CASE WHEN v_account_created_at IS NULL THEN NULL ELSE
      pg_catalog.to_char(v_account_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END,
    'read_at', pg_catalog.to_char(v_read_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
END;
$account_state$;
