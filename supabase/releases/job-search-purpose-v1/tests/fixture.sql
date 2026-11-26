-- Synthetic local fixture only. No hosted connection or real user data.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE ROLE supabase_auth_admin; CREATE ROLE dashboard_user;
CREATE ROLE selqiro_listing_contact_writer_v1 NOINHERIT;
CREATE ROLE selqiro_listing_final_writer_v1 NOINHERIT;
CREATE ROLE selqiro_listing_price_writer_v1 NOINHERIT;
CREATE SCHEMA auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO postgres,authenticated;
CREATE TABLE auth.users(id uuid PRIMARY KEY,created_at timestamptz,deleted_at timestamptz,banned_until timestamptz);
ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fixture_uid$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$fixture_uid$;
ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC,dashboard_user;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,active_identity_id uuid,store_slug text UNIQUE);
CREATE TABLE public.business_accounts(id uuid PRIMARY KEY,owner_user_id uuid NOT NULL,status text NOT NULL DEFAULT 'active',name text);
CREATE TABLE public.business_members(business_account_id uuid,user_id uuid,status text NOT NULL DEFAULT 'active',PRIMARY KEY(business_account_id,user_id));
CREATE TABLE public.identities(id uuid PRIMARY KEY,type text NOT NULL,user_id uuid,business_account_id uuid,status text NOT NULL DEFAULT 'active');
CREATE TABLE public.identity_profiles(identity_id uuid UNIQUE,slug text UNIQUE,display_name text,avatar_url text);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.publication_policy_documents(
 id uuid PRIMARY KEY,policy_key text NOT NULL,policy_version text NOT NULL,content_hash text NOT NULL,
 title text NOT NULL,body_text text NOT NULL,locale text NOT NULL,status text NOT NULL,country_code text,
 applies_to_content_types text[] NOT NULL,requires_user_acceptance boolean NOT NULL,
 effective_from timestamptz NOT NULL,effective_until timestamptz);
CREATE TABLE public.user_publication_policy_acceptances(
 user_id uuid,identity_id uuid,policy_document_id uuid,policy_key text,policy_version text,country_code text,
 locale text,content_hash text,acceptance_source text,PRIMARY KEY(user_id,policy_document_id));
CREATE SCHEMA listing_publication_private;
CREATE SCHEMA listing_contact_private;
CREATE TABLE listing_publication_private.hosted_preview_settings(singleton boolean PRIMARY KEY,project_ref text,
 release_id text,instance_id uuid,enabled boolean,release_ready boolean,storage_authority_version text);
CREATE TABLE listing_publication_private.hosted_preview_actors(actor_user_id uuid PRIMARY KEY);
-- Storage itself is outside this account-write test; the existing gate's narrow
-- dependency returns true. Actual actor gate, row locks and all job mutations run.
CREATE FUNCTION listing_publication_private.hosted_storage_contract_ready() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
INSERT INTO listing_publication_private.hosted_preview_settings VALUES(true,'fixture','listing-publication-hosted-preview-v1',gen_random_uuid(),true,true,'source-part-rfc3986-v1');
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

CREATE OR REPLACE FUNCTION public.current_user_has_identity_access(p_identity_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id = p_identity_id
        and identity.status = 'active'
        and (
          (
            identity.type = 'private'
            and identity.user_id = auth.uid()
          )
          or
          (
            identity.type = 'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
    );
$function$
;
CREATE FUNCTION public.listing_actor_uid_hosted_v1() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT auth.uid();
$f$;
CREATE FUNCTION listing_publication_private.assert_hosted_preview_actor(p_actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE config listing_publication_private.hosted_preview_settings%ROWTYPE;
BEGIN
 -- Shared locks serialize disabling/removing an actor with accepted DB writes.
 -- No network/storage request is made while these transaction locks are held.
 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton FOR SHARE;
 IF NOT FOUND OR NOT config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM 'source-part-rfc3986-v1'
  OR NOT listing_publication_private.hosted_storage_contract_ready() THEN
  RAISE EXCEPTION 'publication_hosted_preview_disabled' USING ERRCODE='55000';
 END IF;
 IF p_actor IS NULL THEN RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501'; END IF;
END $f$;
CREATE FUNCTION public.lock_listing_creation_actor_v1(p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path=pg_catalog,public,auth,pg_temp
AS $fn$
DECLARE actor uuid:=public.listing_actor_uid_hosted_v1(); active_id uuid; identity_row public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.assert_hosted_preview_actor(actor);
 IF actor IS NULL OR p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;
 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active' FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
    AND m.user_id=actor AND m.status='active' FOR SHARE;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN active_id;
END $fn$;
CREATE FUNCTION public.listing_price_currency_scale_v1(p_currency text)
RETURNS integer LANGUAGE sql IMMUTABLE PARALLEL SAFE
SET search_path = pg_catalog
AS $fn$
  SELECT CASE p_currency
    WHEN 'AED' THEN 2
    WHEN 'AFN' THEN 2
    WHEN 'ALL' THEN 2
    WHEN 'AMD' THEN 2
    WHEN 'AOA' THEN 2
    WHEN 'ARS' THEN 2
    WHEN 'AUD' THEN 2
    WHEN 'AWG' THEN 2
    WHEN 'AZN' THEN 2
    WHEN 'BAM' THEN 2
    WHEN 'BBD' THEN 2
    WHEN 'BDT' THEN 2
    WHEN 'BHD' THEN 3
    WHEN 'BIF' THEN 0
    WHEN 'BMD' THEN 2
    WHEN 'BND' THEN 2
    WHEN 'BOB' THEN 2
    WHEN 'BRL' THEN 2
    WHEN 'BSD' THEN 2
    WHEN 'BTN' THEN 2
    WHEN 'BWP' THEN 2
    WHEN 'BYN' THEN 2
    WHEN 'BZD' THEN 2
    WHEN 'CAD' THEN 2
    WHEN 'CDF' THEN 2
    WHEN 'CHF' THEN 2
    WHEN 'CLP' THEN 0
    WHEN 'CNY' THEN 2
    WHEN 'COP' THEN 2
    WHEN 'CRC' THEN 2
    WHEN 'CUP' THEN 2
    WHEN 'CVE' THEN 2
    WHEN 'CZK' THEN 2
    WHEN 'DJF' THEN 0
    WHEN 'DKK' THEN 2
    WHEN 'DOP' THEN 2
    WHEN 'DZD' THEN 2
    WHEN 'EGP' THEN 2
    WHEN 'ERN' THEN 2
    WHEN 'ETB' THEN 2
    WHEN 'EUR' THEN 2
    WHEN 'FJD' THEN 2
    WHEN 'FKP' THEN 2
    WHEN 'GBP' THEN 2
    WHEN 'GEL' THEN 2
    WHEN 'GHS' THEN 2
    WHEN 'GIP' THEN 2
    WHEN 'GMD' THEN 2
    WHEN 'GNF' THEN 0
    WHEN 'GTQ' THEN 2
    WHEN 'GYD' THEN 2
    WHEN 'HKD' THEN 2
    WHEN 'HNL' THEN 2
    WHEN 'HTG' THEN 2
    WHEN 'HUF' THEN 2
    WHEN 'IDR' THEN 2
    WHEN 'ILS' THEN 2
    WHEN 'INR' THEN 2
    WHEN 'IQD' THEN 3
    WHEN 'IRR' THEN 2
    WHEN 'ISK' THEN 0
    WHEN 'JMD' THEN 2
    WHEN 'JOD' THEN 3
    WHEN 'JPY' THEN 0
    WHEN 'KES' THEN 2
    WHEN 'KGS' THEN 2
    WHEN 'KHR' THEN 2
    WHEN 'KMF' THEN 0
    WHEN 'KPW' THEN 2
    WHEN 'KRW' THEN 0
    WHEN 'KWD' THEN 3
    WHEN 'KYD' THEN 2
    WHEN 'KZT' THEN 2
    WHEN 'LAK' THEN 2
    WHEN 'LBP' THEN 2
    WHEN 'LKR' THEN 2
    WHEN 'LRD' THEN 2
    WHEN 'LSL' THEN 2
    WHEN 'LYD' THEN 3
    WHEN 'MAD' THEN 2
    WHEN 'MDL' THEN 2
    WHEN 'MGA' THEN 2
    WHEN 'MKD' THEN 2
    WHEN 'MMK' THEN 2
    WHEN 'MNT' THEN 2
    WHEN 'MOP' THEN 2
    WHEN 'MRU' THEN 2
    WHEN 'MUR' THEN 2
    WHEN 'MVR' THEN 2
    WHEN 'MWK' THEN 2
    WHEN 'MXN' THEN 2
    WHEN 'MYR' THEN 2
    WHEN 'MZN' THEN 2
    WHEN 'NAD' THEN 2
    WHEN 'NGN' THEN 2
    WHEN 'NIO' THEN 2
    WHEN 'NOK' THEN 2
    WHEN 'NPR' THEN 2
    WHEN 'NZD' THEN 2
    WHEN 'OMR' THEN 3
    WHEN 'PAB' THEN 2
    WHEN 'PEN' THEN 2
    WHEN 'PGK' THEN 2
    WHEN 'PHP' THEN 2
    WHEN 'PKR' THEN 2
    WHEN 'PLN' THEN 2
    WHEN 'PYG' THEN 0
    WHEN 'QAR' THEN 2
    WHEN 'RON' THEN 2
    WHEN 'RSD' THEN 2
    WHEN 'RUB' THEN 2
    WHEN 'RWF' THEN 0
    WHEN 'SAR' THEN 2
    WHEN 'SBD' THEN 2
    WHEN 'SCR' THEN 2
    WHEN 'SDG' THEN 2
    WHEN 'SEK' THEN 2
    WHEN 'SGD' THEN 2
    WHEN 'SHP' THEN 2
    WHEN 'SLE' THEN 2
    WHEN 'SOS' THEN 2
    WHEN 'SRD' THEN 2
    WHEN 'SSP' THEN 2
    WHEN 'STN' THEN 2
    WHEN 'SVC' THEN 2
    WHEN 'SYP' THEN 2
    WHEN 'SZL' THEN 2
    WHEN 'THB' THEN 2
    WHEN 'TJS' THEN 2
    WHEN 'TMT' THEN 2
    WHEN 'TND' THEN 3
    WHEN 'TOP' THEN 2
    WHEN 'TRY' THEN 2
    WHEN 'TTD' THEN 2
    WHEN 'TWD' THEN 2
    WHEN 'TZS' THEN 2
    WHEN 'UAH' THEN 2
    WHEN 'UGX' THEN 0
    WHEN 'USD' THEN 2
    WHEN 'UYU' THEN 2
    WHEN 'UZS' THEN 2
    WHEN 'VES' THEN 2
    WHEN 'VND' THEN 0
    WHEN 'VUV' THEN 0
    WHEN 'WST' THEN 2
    WHEN 'XAF' THEN 0
    WHEN 'XCD' THEN 2
    WHEN 'XCG' THEN 2
    WHEN 'XOF' THEN 0
    WHEN 'XPF' THEN 0
    WHEN 'YER' THEN 2
    WHEN 'ZAR' THEN 2
    WHEN 'ZMW' THEN 2
    WHEN 'ZWG' THEN 2
    ELSE NULL END;
$fn$;
CREATE FUNCTION public.normalize_listing_price_v1(p_price jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE k text; a text; c text; digits integer;
BEGIN
  IF p_price IS NULL OR jsonb_typeof(p_price) IS DISTINCT FROM 'object'
     OR octet_length(p_price::text) > 256 THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  IF (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_price) AS keys(key))
      IS DISTINCT FROM ARRAY['amount','currency','kind']::text[]
      OR jsonb_typeof(p_price->'kind') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_shape_invalid' USING ERRCODE='22023';
  END IF;
  k := p_price->>'kind';
  IF k NOT IN ('fixed','free','negotiable','unspecified') THEN
    RAISE EXCEPTION 'listing_price_kind_invalid' USING ERRCODE='22023';
  END IF;
  IF k <> 'fixed' THEN
    IF p_price->'amount' IS DISTINCT FROM 'null'::jsonb
       OR p_price->'currency' IS DISTINCT FROM 'null'::jsonb THEN
      RAISE EXCEPTION 'listing_price_nonfixed_values_forbidden' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('kind',k,'amount',NULL,'currency',NULL);
  END IF;
  IF jsonb_typeof(p_price->'amount') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_price->'currency') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'listing_price_string_values_required' USING ERRCODE='22023';
  END IF;
  a := p_price->>'amount'; c := p_price->>'currency';
  digits := public.listing_price_currency_scale_v1(c);
  IF digits IS NULL THEN
    RAISE EXCEPTION 'listing_price_currency_unsupported' USING ERRCODE='22023';
  END IF;
  -- ASCII, no exponent/grouping/sign, < 10^18 units. Reject rather than round.
  IF char_length(a) > 22 OR a !~ '^(0|[1-9][0-9]{0,17})([.][0-9]{1,3})?$'
      OR (position('.' IN a)>0 AND char_length(split_part(a,'.',2))>digits) THEN
    RAISE EXCEPTION 'listing_price_amount_invalid' USING ERRCODE='22023';
  END IF;
  RETURN jsonb_build_object('kind',k,'amount',trim_scale(a::numeric)::text,'currency',c);
END $fn$;
CREATE FUNCTION listing_publication_private.require_actor(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog,public,auth,pg_temp AS $fn$
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 IF public.listing_actor_uid_hosted_v1() IS NULL OR p_expected_user_id IS NULL OR public.listing_actor_uid_hosted_v1() IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'publication_account_changed' USING ERRCODE='42501';
 END IF;
 RETURN public.lock_listing_creation_actor_v1(p_expected_identity_id);
END $fn$;
-- Additive canonical job domain. No existing content rows or policies are rewritten.
CREATE SCHEMA jobs_private;
REVOKE ALL ON SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE jobs_private.categories (
 code text PRIMARY KEY CHECK(code ~ '^[a-z_]{2,64}$'),
 label_et text NOT NULL,label_en text NOT NULL,sort_order integer NOT NULL UNIQUE
);
INSERT INTO jobs_private.categories VALUES
 ('administration','Haldus ja kontoritöö','Administration',10),
 ('agriculture','Põllumajandus','Agriculture',20),
 ('construction','Ehitus','Construction',30),
 ('customer_service','Klienditeenindus','Customer service',40),
 ('education','Haridus','Education',50),
 ('engineering','Tehnika ja inseneeria','Engineering',60),
 ('finance','Rahandus ja raamatupidamine','Finance',70),
 ('healthcare','Tervishoid ja hoolekanne','Healthcare and care',80),
 ('hospitality','Toitlustus ja majutus','Hospitality',90),
 ('information_technology','Infotehnoloogia','Information technology',100),
 ('logistics','Transport ja logistika','Transport and logistics',110),
 ('manufacturing','Tootmine','Manufacturing',120),
 ('sales_marketing','Müük ja turundus','Sales and marketing',130),
 ('other','Muu töö','Other work',140);
CREATE TABLE public.jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 created_by_user_id uuid NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 2 AND 140),
 description text NOT NULL CHECK(char_length(description) BETWEEN 1 AND 10000),
 category text NOT NULL REFERENCES jobs_private.categories(code) ON DELETE RESTRICT,
 country_code text CHECK(country_code ~ '^[A-Z]{2}$'),
 city text CHECK(char_length(city) BETWEEN 1 AND 160),
 location_label text CHECK(char_length(location_label) BETWEEN 1 AND 300),
 workplace_type text NOT NULL CHECK(workplace_type IN('on_site','remote','hybrid')),
 employment_type text CHECK(employment_type IN('permanent','fixed_term','contract','internship','other')),
 working_time text CHECK(working_time IN('full_time','part_time','flexible','other')),
 salary_min numeric CHECK(salary_min>=0 AND salary_min<1000000000000000000),
 salary_max numeric CHECK(salary_max>=0 AND salary_max<1000000000000000000),
 salary_currency text,salary_period text CHECK(salary_period IN('hour','day','week','month','year')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN('draft','published','paused','closed')),
 edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(updated_at)),
 published_at timestamptz CHECK(isfinite(published_at)),
 active_until timestamptz CHECK(isfinite(active_until)),
 last_confirmed_at timestamptz CHECK(isfinite(last_confirmed_at)),
 CHECK(salary_min IS NULL OR salary_max IS NULL OR salary_min<=salary_max),
 CHECK(((salary_min IS NOT NULL OR salary_max IS NOT NULL) AND salary_currency IS NOT NULL AND salary_period IS NOT NULL)
  OR (salary_min IS NULL AND salary_max IS NULL AND salary_currency IS NULL AND salary_period IS NULL)),
 CHECK((status='draft' AND published_at IS NULL AND active_until IS NULL AND last_confirmed_at IS NULL)
  OR (status<>'draft' AND published_at IS NOT NULL AND active_until>published_at
   AND (last_confirmed_at IS NULL OR last_confirmed_at>=published_at)))
);
CREATE TABLE jobs_private.requests (
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN('save','publish','status','renew')),
 request jsonb NOT NULL CHECK(jsonb_typeof(request)='object'),
 request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key)
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jobs,jobs_private.categories,jobs_private.requests FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX jobs_owner_cursor_idx ON public.jobs(identity_id,created_at DESC,id DESC);
CREATE INDEX jobs_profile_cursor_idx ON public.jobs(identity_id,published_at DESC,id DESC) WHERE status='published';
CREATE INDEX jobs_public_cursor_idx ON public.jobs(published_at DESC,id DESC) WHERE status='published';
COMMENT ON TABLE public.jobs IS 'Canonical employer job. Closed browser table; explicit RPCs enforce business identity, revision, policy, calendar-month activity and viewer eligibility.';

CREATE FUNCTION jobs_private.require_key(p_key uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN IF p_key IS NULL OR p_key='00000000-0000-0000-0000-000000000000'::uuid THEN
 RAISE EXCEPTION 'job_request_key_invalid' USING ERRCODE='22023';END IF;END $f$;
CREATE FUNCTION jobs_private.require_revision(p_revision text) RETURNS bigint LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF p_revision IS NULL OR p_revision !~ '^[1-9][0-9]{0,18}$' OR p_revision::numeric>9223372036854775807 THEN
 RAISE EXCEPTION 'job_revision_invalid' USING ERRCODE='22023';END IF;
 RETURN p_revision::bigint;
END $f$;
CREATE FUNCTION jobs_private.calendar_month_after(p_time timestamptz) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF p_time IS NULL OR NOT isfinite(p_time) THEN RAISE EXCEPTION 'job_time_invalid' USING ERRCODE='22023';END IF;
 RETURN p_time+interval '1 month';
END $f$;
CREATE FUNCTION jobs_private.current_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE result jsonb;t timestamptz;
BEGIN
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;t:=clock_timestamp();
 -- Country-scoped rules require a separate reviewed country-policy contract.
 IF EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active'
 AND 'job'=ANY(p.applies_to_content_types) AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t) AND p.country_code IS NOT NULL) THEN
 RAISE EXCEPTION 'job_policy_country_scope_unresolved' USING ERRCODE='55000';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('documentId',p.id,'version',p.policy_version,'contentHash',p.content_hash,
 'title',p.title,'body',p.body_text,'locale',p.locale) ORDER BY p.id),'[]'::jsonb) INTO result
 FROM public.publication_policy_documents p WHERE p.status='active' AND p.locale='et-EE' AND p.country_code IS NULL
 AND 'job'=ANY(p.applies_to_content_types) AND p.requires_user_acceptance AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t);
 IF jsonb_array_length(result) NOT BETWEEN 1 AND 20 OR NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p
 WHERE p.policy_key='marketplace-general' AND p.id IN(SELECT (x->>'documentId')::uuid FROM jsonb_array_elements(result) x)) THEN
 RAISE EXCEPTION 'job_policy_unavailable' USING ERRCODE='55000';END IF;
 RETURN result;
END $f$;
CREATE FUNCTION jobs_private.accept_policies(p_user uuid,p_identity uuid,p_shown jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE documents jsonb;expected jsonb;shown jsonb;d public.publication_policy_documents%ROWTYPE;
BEGIN
 documents:=jobs_private.current_policies();
 IF p_shown IS NULL OR jsonb_typeof(p_shown)<>'array' OR octet_length(p_shown::text)>16384 THEN
 RAISE EXCEPTION 'job_policy_consent_required' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_shown) x WHERE jsonb_typeof(x)<>'object'
 OR x-'documentId'-'version'-'contentHash'-'accepted'<>'{}'::jsonb OR x->'accepted' IS DISTINCT FROM 'true'::jsonb
 OR jsonb_typeof(x->'documentId') IS DISTINCT FROM 'string' OR jsonb_typeof(x->'version') IS DISTINCT FROM 'string'
 OR jsonb_typeof(x->'contentHash') IS DISTINCT FROM 'string') THEN
 RAISE EXCEPTION 'job_policy_consent_required' USING ERRCODE='22023';END IF;
 SELECT jsonb_agg(jsonb_build_object('documentId',x->'documentId','version',x->'version','contentHash',x->'contentHash','accepted',true)
 ORDER BY x->>'documentId') INTO expected FROM jsonb_array_elements(documents) x;
 SELECT jsonb_agg(x ORDER BY x->>'documentId') INTO shown FROM jsonb_array_elements(p_shown) x;
 IF shown IS DISTINCT FROM expected THEN RAISE EXCEPTION 'job_policy_changed' USING ERRCODE='42501';END IF;
 FOR d IN SELECT p.* FROM public.publication_policy_documents p WHERE p.id IN
 (SELECT (x->>'documentId')::uuid FROM jsonb_array_elements(documents) x) FOR SHARE LOOP
  INSERT INTO public.user_publication_policy_acceptances(user_id,identity_id,policy_document_id,policy_key,policy_version,
  country_code,locale,content_hash,acceptance_source) VALUES(p_user,p_identity,d.id,d.policy_key,d.policy_version,
  d.country_code,d.locale,d.content_hash,'publication_gate') ON CONFLICT(user_id,policy_document_id) DO NOTHING;
 END LOOP;
 IF jobs_private.current_policies() IS DISTINCT FROM documents THEN
 RAISE EXCEPTION 'job_policy_changed' USING ERRCODE='42501';END IF;
END $f$;
CREATE FUNCTION jobs_private.cursor(p_cursor jsonb,p_time_key text) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE t timestamptz;u uuid;
BEGIN
 IF p_cursor IS NULL OR p_cursor='null'::jsonb THEN RETURN NULL;END IF;
 IF p_time_key NOT IN('created_at','published_at') OR jsonb_typeof(p_cursor)<>'object'
 OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY[p_time_key,'id']::text[]
 AND (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY['id',p_time_key]::text[]
 OR jsonb_typeof(p_cursor->p_time_key) IS DISTINCT FROM 'string' OR length(p_cursor->>p_time_key)>40
 OR jsonb_typeof(p_cursor->'id') IS DISTINCT FROM 'string'
 OR p_cursor->>'id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
 RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END IF;
 BEGIN t:=(p_cursor->>p_time_key)::timestamptz;u:=(p_cursor->>'id')::uuid;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
 RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END;
 IF NOT isfinite(t) THEN RAISE EXCEPTION 'job_cursor_invalid' USING ERRCODE='22023';END IF;
 RETURN jsonb_build_object(p_time_key,t,'id',u);
END $f$;
-- Extend the accepted job actor contract without changing its account lock,
-- expected identity, business membership or request reconciliation rules.
CREATE OR REPLACE FUNCTION jobs_private.require_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';END IF;
 IF i.type='private' THEN
  IF i.user_id IS DISTINCT FROM p_user OR i.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_user FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';END IF;
 ELSIF i.type='business' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=i.business_account_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_business_unavailable' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_business_forbidden' USING ERRCODE='42501';END IF;
 ELSE RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
 END IF;
END $f$;

-- These are the two exact old named checks. The preflight recognizes the
-- complete job catalog before replacing them; no unknown constraints vanish.
ALTER TABLE public.jobs DROP CONSTRAINT jobs_employment_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_employment_type_check
 CHECK(employment_type IN('permanent','fixed_term','contract','internship','other','task'));
ALTER TABLE public.jobs DROP CONSTRAINT jobs_salary_period_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_salary_period_check
 CHECK(salary_period IN('hour','day','week','month','year','task'));
ALTER TABLE public.jobs ADD CONSTRAINT jobs_task_content_check
 CHECK((employment_type IS DISTINCT FROM 'task' OR working_time IS NULL)
 AND (salary_period IS DISTINCT FROM 'task' OR employment_type IS NOT DISTINCT FROM 'task'));

CREATE OR REPLACE FUNCTION jobs_private.normalize_content(p_content jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE keys constant text[]:=ARRAY['title','description','category','countryCode','city','locationLabel','workplaceType',
 'employmentType','workingTime','salaryMin','salaryMax','salaryCurrency','salaryPeriod'];
 k text;n jsonb:='{}';v text;low jsonb;high jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& keys) OR p_content-keys<>'{}'::jsonb THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 FOREACH k IN ARRAY keys LOOP
  IF p_content->k IS DISTINCT FROM 'null'::jsonb AND jsonb_typeof(p_content->k) IS DISTINCT FROM 'string' THEN
   RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
  v:=CASE WHEN k IN('salaryMin','salaryMax','salaryCurrency') THEN p_content->>k ELSE nullif(btrim(p_content->>k),'') END;
  n:=n||jsonb_build_object(k,v);
 END LOOP;
 IF n->>'title' IS NULL OR char_length(n->>'title') NOT BETWEEN 2 AND 140 OR n->>'title' ~ '[[:cntrl:]]'
 OR n->>'description' IS NULL OR char_length(n->>'description') NOT BETWEEN 1 AND 10000
 OR NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=n->>'category')
 OR (n->>'countryCode' IS NOT NULL AND n->>'countryCode' !~ '^[A-Z]{2}$')
 OR char_length(n->>'city')>160 OR n->>'city' ~ '[[:cntrl:]]'
 OR char_length(n->>'locationLabel')>300 OR n->>'locationLabel' ~ '[[:cntrl:]]'
 OR n->>'workplaceType' IS NULL OR n->>'workplaceType' NOT IN('on_site','remote','hybrid')
 OR (n->>'employmentType' IS NOT NULL AND n->>'employmentType' NOT IN('permanent','fixed_term','contract','internship','other','task'))
 OR (n->>'workingTime' IS NOT NULL AND n->>'workingTime' NOT IN('full_time','part_time','flexible','other')) THEN
 RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 IF n->>'employmentType'='task' AND n->>'workingTime' IS NOT NULL THEN
  RAISE EXCEPTION 'job_content_invalid' USING ERRCODE='22023';END IF;
 IF n->>'salaryPeriod'='task' AND n->>'employmentType' IS DISTINCT FROM 'task' THEN
  RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 IF n->>'salaryMin' IS NULL AND n->>'salaryMax' IS NULL THEN
  IF n->>'salaryCurrency' IS NOT NULL OR n->>'salaryPeriod' IS NOT NULL THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 ELSE
  IF n->>'salaryCurrency' IS NULL OR n->>'salaryPeriod' IS NULL OR n->>'salaryPeriod' NOT IN('hour','day','week','month','year','task') THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
  IF n->>'salaryMin' IS NOT NULL THEN
   low:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMin','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMin}',low->'amount');
  END IF;
  IF n->>'salaryMax' IS NOT NULL THEN
   high:=public.normalize_listing_price_v1(jsonb_build_object('kind','fixed','amount',n->'salaryMax','currency',n->'salaryCurrency'));
   n:=jsonb_set(n,'{salaryMax}',high->'amount');
  END IF;
  IF (n->>'salaryMin')::numeric>(n->>'salaryMax')::numeric THEN
   RAISE EXCEPTION 'job_salary_invalid' USING ERRCODE='22023';END IF;
 END IF;
 RETURN n;
END $f$;
CREATE FUNCTION jobs_private.content(j public.jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('title',j.title,'description',j.description,'category',j.category,'countryCode',j.country_code,
 'city',j.city,'locationLabel',j.location_label,'workplaceType',j.workplace_type,'employmentType',j.employment_type,
 'workingTime',j.working_time,'salaryMin',j.salary_min::text,'salaryMax',j.salary_max::text,
 'salaryCurrency',j.salary_currency,'salaryPeriod',j.salary_period);
$f$;
CREATE FUNCTION jobs_private.owner_fields(j public.jobs,p_user uuid) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','actor_user_id',p_user,'identity_id',j.identity_id,
 'job_id',j.id,'edit_revision',j.edit_revision::text,'status',j.status,'content',jobs_private.content(j),
 'created_at',j.created_at,'updated_at',j.updated_at,'published_at',j.published_at,'active_until',j.active_until,
 'last_confirmed_at',j.last_confirmed_at);
$f$;
CREATE FUNCTION jobs_private.search_document(p_title text,p_description text,p_category text,p_city text,p_country text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT to_tsvector('pg_catalog.simple'::regconfig,coalesce(p_title,'')||' '||coalesce(p_description,'')||' '||
 coalesce(p_category,'')||' '||coalesce(p_city,'')||' '||coalesce(p_country,''));
$f$;
CREATE INDEX jobs_public_keywords_idx ON public.jobs USING gin (jobs_private.search_document(title,description,category,city,country_code)) WHERE status='published';
-- The existing actor lock serializes commands and receipt reconciliation for
-- one real account. Receipt + job + policy acceptance commit atomically.
CREATE FUNCTION jobs_private.mutate(p_user uuid,p_identity uuid,p_key uuid,p_operation text,p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE j public.jobs%ROWTYPE;r jobs_private.requests%ROWTYPE;job_id uuid;revision bigint;normalized jsonb;
 fingerprint bytea;reply jsonb;changed boolean:=false;t timestamptz;target timestamptz;expected_deadline timestamptz;
BEGIN
 PERFORM jobs_private.require_actor(p_user,p_identity);PERFORM jobs_private.require_key(p_key);
 IF p_operation IS NULL OR p_operation NOT IN('save','publish','status','renew') OR p_request IS NULL
 OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>90000 THEN
 RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';END IF;
 fingerprint:=sha256(convert_to(jsonb_build_object('identity',p_identity,'operation',p_operation,'request',p_request)::text,'UTF8'));
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_user AND request_key=p_key;
 IF FOUND THEN
  IF r.identity_id IS DISTINCT FROM p_identity OR r.operation IS DISTINCT FROM p_operation
  OR r.request_hash IS DISTINCT FROM fingerprint OR r.request IS DISTINCT FROM p_request THEN
   RAISE EXCEPTION 'job_request_conflict' USING ERRCODE='22023';END IF;
  RETURN r.result;
 END IF;
 job_id:=(p_request->>'job_id')::uuid;
 IF job_id IS NOT NULL THEN
  revision:=jobs_private.require_revision(p_request->>'expected_revision');
  SELECT * INTO j FROM public.jobs WHERE id=job_id AND identity_id=p_identity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_unavailable' USING ERRCODE='42501';END IF;
  IF j.edit_revision<>revision THEN RAISE EXCEPTION 'job_edit_conflict' USING ERRCODE='40001';END IF;
 ELSIF p_operation<>'save' OR p_request->>'expected_revision' IS NOT NULL THEN
  RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';
 END IF;
 IF p_operation='save' THEN
  normalized:=jobs_private.normalize_content(p_request->'content');
  IF job_id IS NULL OR j.status='draft' THEN
   IF p_request->'policy_snapshot' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'job_draft_policy_invalid' USING ERRCODE='22023';END IF;
  ELSE PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');END IF;
  t:=clock_timestamp();
  IF job_id IS NULL THEN
   INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,country_code,city,location_label,
   workplace_type,employment_type,working_time,salary_min,salary_max,salary_currency,salary_period,created_at,updated_at)
   VALUES(p_identity,p_user,normalized->>'title',normalized->>'description',normalized->>'category',normalized->>'countryCode',
   normalized->>'city',normalized->>'locationLabel',normalized->>'workplaceType',normalized->>'employmentType',normalized->>'workingTime',
   (normalized->>'salaryMin')::numeric,(normalized->>'salaryMax')::numeric,normalized->>'salaryCurrency',normalized->>'salaryPeriod',t,t)
   RETURNING * INTO j;changed:=true;
  ELSIF jobs_private.content(j) IS DISTINCT FROM normalized THEN
   UPDATE public.jobs SET title=normalized->>'title',description=normalized->>'description',category=normalized->>'category',
   country_code=normalized->>'countryCode',city=normalized->>'city',location_label=normalized->>'locationLabel',
   workplace_type=normalized->>'workplaceType',employment_type=normalized->>'employmentType',working_time=normalized->>'workingTime',
   salary_min=(normalized->>'salaryMin')::numeric,salary_max=(normalized->>'salaryMax')::numeric,
   salary_currency=normalized->>'salaryCurrency',salary_period=normalized->>'salaryPeriod',edit_revision=edit_revision+1,updated_at=t
   WHERE id=j.id RETURNING * INTO j;changed:=true;
  END IF;
 ELSIF p_operation='publish' THEN
  IF j.status<>'draft' THEN RAISE EXCEPTION 'job_first_publication_required' USING ERRCODE='22023';END IF;
  PERFORM 1 FROM public.identity_profiles WHERE identity_id=p_identity AND nullif(btrim(slug),'') IS NOT NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_public_profile_required' USING ERRCODE='55000';END IF;
  PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');
  t:=clock_timestamp();
  UPDATE public.jobs SET status='published',published_at=t,active_until=jobs_private.calendar_month_after(t),
  updated_at=t,edit_revision=edit_revision+1 WHERE id=j.id RETURNING * INTO j;changed:=true;
 ELSIF p_operation='status' THEN
  IF j.status='draft' OR p_request->>'expected_status' IS NULL OR p_request->>'expected_status' NOT IN('published','paused','closed')
  OR p_request->>'status' IS NULL OR p_request->>'status' NOT IN('published','paused','closed') THEN
   RAISE EXCEPTION 'job_status_invalid' USING ERRCODE='22023';END IF;
  IF j.status IS DISTINCT FROM p_request->>'expected_status' THEN RAISE EXCEPTION 'job_status_conflict' USING ERRCODE='40001';END IF;
  IF p_request->>'status'='published' AND j.active_until<=clock_timestamp() THEN
   RAISE EXCEPTION 'job_renewal_required' USING ERRCODE='22023';END IF;
  changed:=j.status IS DISTINCT FROM p_request->>'status';
  IF changed THEN UPDATE public.jobs SET status=p_request->>'status',edit_revision=edit_revision+1,
   updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;END IF;
 ELSE
  expected_deadline:=(p_request->>'expected_active_until')::timestamptz;
  IF j.status='draft' OR expected_deadline IS NULL OR NOT isfinite(expected_deadline) THEN
   RAISE EXCEPTION 'job_activity_invalid' USING ERRCODE='22023';END IF;
  IF j.active_until IS DISTINCT FROM expected_deadline THEN RAISE EXCEPTION 'job_activity_conflict' USING ERRCODE='40001';END IF;
  t:=clock_timestamp();target:=greatest(j.active_until,jobs_private.calendar_month_after(t));
  changed:=target>j.active_until;
  IF changed THEN UPDATE public.jobs SET active_until=target,last_confirmed_at=t,edit_revision=edit_revision+1
   WHERE id=j.id RETURNING * INTO j;END IF;
 END IF;
 reply:=jsonb_build_object('schema_version',1,'actor_user_id',p_user,'identity_id',p_identity,'request_key',p_key,
 'operation',p_operation,'job',jobs_private.owner_fields(j,p_user),'changed',changed);
 INSERT INTO jobs_private.requests(actor_user_id,request_key,identity_id,operation,request,request_hash,result)
 VALUES(p_user,p_key,p_identity,p_operation,p_request,fingerprint,reply);
 RETURN reply;
END $f$;
CREATE FUNCTION public.save_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_content jsonb,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'save',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'content',p_content,'policy_snapshot',p_policy_snapshot));
$f$;
CREATE FUNCTION public.publish_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'publish',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'policy_snapshot',p_policy_snapshot));
$f$;
CREATE FUNCTION public.set_my_job_status_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_status text,p_status text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'status',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'expected_status',p_expected_status,'status',p_status));
$f$;
CREATE FUNCTION public.renew_my_job_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,'renew',
 jsonb_build_object('job_id',p_job_id,'expected_revision',p_expected_revision,'expected_active_until',p_expected_active_until));
$f$;

CREATE FUNCTION public.get_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE j public.jobs%ROWTYPE;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id AND identity_id=p_expected_identity_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'job_unavailable' USING ERRCODE='42501';END IF;
 RETURN jobs_private.owner_fields(j,p_expected_user_id);
END $f$;
CREATE FUNCTION public.get_my_job_policies_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'documents',jobs_private.current_policies());
END $f$;
CREATE FUNCTION public.get_my_job_request_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jobs_private.requests%ROWTYPE;present boolean;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 PERFORM jobs_private.require_key(p_request_key);
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 present:=FOUND;
 IF present AND r.identity_id IS DISTINCT FROM p_expected_identity_id THEN
 RAISE EXCEPTION 'job_request_identity_changed' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'request_key',p_request_key,'found',present,'operation',r.operation,'request',r.request,'result',r.result);
END $f$;
CREATE OR REPLACE FUNCTION public.get_my_jobs_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE
 actor uuid;
 active_id uuid;
 identity_row public.identities%ROWTYPE;
 config listing_publication_private.hosted_preview_settings%ROWTYPE;
 cursor_value jsonb;items jsonb;more boolean;next_value jsonb;
 read_time timestamptz:=statement_timestamp();
BEGIN
 -- Preserve the shared actor contract and its refusal order without taking row locks.
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 actor:=public.listing_actor_uid_hosted_v1();
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor IS DISTINCT FROM p_expected_user_id THEN
  RAISE EXCEPTION 'publication_account_changed' USING ERRCODE='42501';
 END IF;

 SELECT * INTO config FROM listing_publication_private.hosted_preview_settings WHERE singleton;
 IF NOT FOUND OR NOT config.enabled OR NOT config.release_ready
  OR config.storage_authority_version IS DISTINCT FROM 'source-part-rfc3986-v1'
  OR NOT listing_publication_private.hosted_storage_contract_ready() THEN
  RAISE EXCEPTION 'publication_hosted_preview_disabled' USING ERRCODE='55000';
 END IF;
 PERFORM 1 FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=actor;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'publication_hosted_preview_actor_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_expected_identity_id IS NULL THEN
  RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';
 END IF;

 SELECT p.active_identity_id INTO active_id FROM public.profiles p WHERE p.id=actor;
 IF active_id IS NULL OR active_id IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'listing_price_identity_changed' USING ERRCODE='42501';
 END IF;
 SELECT i.* INTO identity_row FROM public.identities i WHERE i.id=active_id AND i.status='active';
 IF NOT FOUND THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members m WHERE m.business_account_id=identity_row.business_account_id
   AND m.user_id=actor AND m.status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
  END IF;
 END IF;
 IF public.current_user_has_identity_access(active_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501';
 END IF;

 -- Preserve the job-specific private/business rules after the shared checks.
 IF identity_row.type='private' THEN
  IF identity_row.user_id IS DISTINCT FROM p_expected_user_id OR identity_row.business_account_id IS NOT NULL THEN
   RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_expected_user_id;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_identity_unavailable' USING ERRCODE='42501';
  END IF;
 ELSIF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_accounts WHERE id=identity_row.business_account_id AND status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_business_unavailable' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM public.business_members WHERE business_account_id=identity_row.business_account_id
   AND user_id=p_expected_user_id AND status='active';
  IF NOT FOUND THEN
   RAISE EXCEPTION 'job_business_forbidden' USING ERRCODE='42501';
  END IF;
 ELSE
  RAISE EXCEPTION 'job_identity_forbidden' USING ERRCODE='42501';
 END IF;

 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'job_page_invalid' USING ERRCODE='22023';
 END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'created_at');
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=p_expected_identity_id
 AND (cursor_value IS NULL OR (j.created_at,j.id)<((cursor_value->>'created_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.created_at DESC,j.id DESC LIMIT p_result_limit+1), page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.owner_fields(p,p_expected_user_id) ORDER BY p.created_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('created_at',created_at,'id',id) FROM page ORDER BY created_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'items',items,'result_limit',p_result_limit,'has_more',more,'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,'read_at',read_time);
END $f$;
REVOKE ALL ON FUNCTION jobs_private.accept_policies(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.calendar_month_after(timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.content(public.jobs) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.current_policies() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.normalize_content(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.owner_fields(public.jobs,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_actor(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_key(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_revision(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.require_actor(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.require_actor(uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.require_actor(uuid,uuid) TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION public.current_user_has_identity_access(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_my_job_policies_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_policies_v1(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_job_request_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_request_v1(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_job_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_v1(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.listing_actor_uid_hosted_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO anon;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO service_role;
REVOKE ALL ON FUNCTION public.listing_price_currency_scale_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO anon;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO service_role;
REVOKE ALL ON FUNCTION public.lock_listing_creation_actor_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lock_listing_creation_actor_v1(uuid) TO selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.normalize_listing_price_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION jobs_private.mutate(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA jobs_private TO selqiro_listing_contact_writer_v1;

INSERT INTO public.publication_policy_documents VALUES(
 '50000000-0000-0000-0000-000000000001','marketplace-general','1','testhash','Fixture policy','Fixture policy body',
 'et-EE','active',NULL,ARRAY['job'],true,'2020-01-01Z',NULL);

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

-- Preserve the accepted mutation, changing only new-write account admission.
CREATE OR REPLACE FUNCTION jobs_private.mutate(p_user uuid,p_identity uuid,p_key uuid,p_operation text,p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE j public.jobs%ROWTYPE;r jobs_private.requests%ROWTYPE;job_id uuid;revision bigint;normalized jsonb;
 fingerprint bytea;reply jsonb;changed boolean:=false;t timestamptz;target timestamptz;expected_deadline timestamptz;account_owner uuid;
BEGIN
 PERFORM jobs_private.require_actor(p_user,p_identity);PERFORM jobs_private.require_key(p_key);
 IF p_operation IS NULL OR p_operation NOT IN('save','publish','status','renew') OR p_request IS NULL
 OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>90000 THEN
 RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';END IF;
 fingerprint:=sha256(convert_to(jsonb_build_object('identity',p_identity,'operation',p_operation,'request',p_request)::text,'UTF8'));
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_user AND request_key=p_key;
 IF FOUND THEN
  IF r.identity_id IS DISTINCT FROM p_identity OR r.operation IS DISTINCT FROM p_operation
  OR r.request_hash IS DISTINCT FROM fingerprint OR r.request IS DISTINCT FROM p_request THEN
   RAISE EXCEPTION 'job_request_conflict' USING ERRCODE='22023';END IF;
  RETURN r.result;
 END IF;
 -- require_actor retains the identity and business-owner row locks. Resolve
 -- canonical ownership, never the creator or the currently active UI account.
 -- A completed identical request above only returns its existing receipt.
 SELECT CASE WHEN i.type='private' THEN i.user_id
             WHEN i.type='business' THEN b.owner_user_id END
 INTO account_owner FROM public.identities i
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity;
 PERFORM jobs_private.require_available_accounts_v1(p_user,account_owner);
 job_id:=(p_request->>'job_id')::uuid;
 IF job_id IS NOT NULL THEN
  revision:=jobs_private.require_revision(p_request->>'expected_revision');
  SELECT * INTO j FROM public.jobs WHERE id=job_id AND identity_id=p_identity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_unavailable' USING ERRCODE='42501';END IF;
  IF j.edit_revision<>revision THEN RAISE EXCEPTION 'job_edit_conflict' USING ERRCODE='40001';END IF;
 ELSIF p_operation<>'save' OR p_request->>'expected_revision' IS NOT NULL THEN
  RAISE EXCEPTION 'job_command_invalid' USING ERRCODE='22023';
 END IF;
 IF p_operation='save' THEN
  normalized:=jobs_private.normalize_content(p_request->'content');
  IF job_id IS NULL OR j.status='draft' THEN
   IF p_request->'policy_snapshot' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'job_draft_policy_invalid' USING ERRCODE='22023';END IF;
  ELSE PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');END IF;
  t:=clock_timestamp();
  IF job_id IS NULL THEN
   INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,country_code,city,location_label,
   workplace_type,employment_type,working_time,salary_min,salary_max,salary_currency,salary_period,created_at,updated_at)
   VALUES(p_identity,p_user,normalized->>'title',normalized->>'description',normalized->>'category',normalized->>'countryCode',
   normalized->>'city',normalized->>'locationLabel',normalized->>'workplaceType',normalized->>'employmentType',normalized->>'workingTime',
   (normalized->>'salaryMin')::numeric,(normalized->>'salaryMax')::numeric,normalized->>'salaryCurrency',normalized->>'salaryPeriod',t,t)
   RETURNING * INTO j;changed:=true;
  ELSIF jobs_private.content(j) IS DISTINCT FROM normalized THEN
   UPDATE public.jobs SET title=normalized->>'title',description=normalized->>'description',category=normalized->>'category',
   country_code=normalized->>'countryCode',city=normalized->>'city',location_label=normalized->>'locationLabel',
   workplace_type=normalized->>'workplaceType',employment_type=normalized->>'employmentType',working_time=normalized->>'workingTime',
   salary_min=(normalized->>'salaryMin')::numeric,salary_max=(normalized->>'salaryMax')::numeric,
   salary_currency=normalized->>'salaryCurrency',salary_period=normalized->>'salaryPeriod',edit_revision=edit_revision+1,updated_at=t
   WHERE id=j.id RETURNING * INTO j;changed:=true;
  END IF;
 ELSIF p_operation='publish' THEN
  IF j.status<>'draft' THEN RAISE EXCEPTION 'job_first_publication_required' USING ERRCODE='22023';END IF;
  PERFORM 1 FROM public.identity_profiles WHERE identity_id=p_identity AND nullif(btrim(slug),'') IS NOT NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_public_profile_required' USING ERRCODE='55000';END IF;
  PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->'policy_snapshot');
  t:=clock_timestamp();
  UPDATE public.jobs SET status='published',published_at=t,active_until=jobs_private.calendar_month_after(t),
  updated_at=t,edit_revision=edit_revision+1 WHERE id=j.id RETURNING * INTO j;changed:=true;
 ELSIF p_operation='status' THEN
  IF j.status='draft' OR p_request->>'expected_status' IS NULL OR p_request->>'expected_status' NOT IN('published','paused','closed')
  OR p_request->>'status' IS NULL OR p_request->>'status' NOT IN('published','paused','closed') THEN
   RAISE EXCEPTION 'job_status_invalid' USING ERRCODE='22023';END IF;
  IF j.status IS DISTINCT FROM p_request->>'expected_status' THEN RAISE EXCEPTION 'job_status_conflict' USING ERRCODE='40001';END IF;
  IF p_request->>'status'='published' AND j.active_until<=clock_timestamp() THEN
   RAISE EXCEPTION 'job_renewal_required' USING ERRCODE='22023';END IF;
  changed:=j.status IS DISTINCT FROM p_request->>'status';
  IF changed THEN UPDATE public.jobs SET status=p_request->>'status',edit_revision=edit_revision+1,
   updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;END IF;
 ELSE
  expected_deadline:=(p_request->>'expected_active_until')::timestamptz;
  IF j.status='draft' OR expected_deadline IS NULL OR NOT isfinite(expected_deadline) THEN
   RAISE EXCEPTION 'job_activity_invalid' USING ERRCODE='22023';END IF;
  IF j.active_until IS DISTINCT FROM expected_deadline THEN RAISE EXCEPTION 'job_activity_conflict' USING ERRCODE='40001';END IF;
  t:=clock_timestamp();target:=greatest(j.active_until,jobs_private.calendar_month_after(t));
  changed:=target>j.active_until;
  IF changed THEN UPDATE public.jobs SET active_until=target,last_confirmed_at=t,edit_revision=edit_revision+1
   WHERE id=j.id RETURNING * INTO j;END IF;
 END IF;
 reply:=jsonb_build_object('schema_version',1,'actor_user_id',p_user,'identity_id',p_identity,'request_key',p_key,
 'operation',p_operation,'job',jobs_private.owner_fields(j,p_user),'changed',changed);
 INSERT INTO jobs_private.requests(actor_user_id,request_key,identity_id,operation,request,request_hash,result)
 VALUES(p_user,p_key,p_identity,p_operation,p_request,fingerprint,reply);
 RETURN reply;
END $f$;


-- Synthetic provider/block relations, matching the semantics the real readers use.
CREATE TABLE public.user_blocks(id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
 blocker_id uuid NOT NULL,blocked_id uuid NOT NULL,UNIQUE(blocker_id,blocked_id));
CREATE INDEX user_blocks_blocked_blocker_idx_v1 ON public.user_blocks(blocked_id,blocker_id);
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE SCHEMA provider_controls_private;
CREATE TABLE provider_controls_private.hidden_providers(viewer_user_id uuid NOT NULL,
 provider_identity_id uuid NOT NULL,revision uuid NOT NULL DEFAULT gen_random_uuid(),hidden_until timestamptz,
 PRIMARY KEY(viewer_user_id,provider_identity_id));
CREATE INDEX hidden_providers_active_idx ON provider_controls_private.hidden_providers(viewer_user_id,hidden_until);
ALTER TABLE provider_controls_private.hidden_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA provider_controls_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON public.user_blocks,provider_controls_private.hidden_providers FROM PUBLIC,anon,authenticated,service_role;
-- Avatar storage is unrelated to the search predicate. Actual public_fields
-- still calls this boundary; the fixture substitutes only its image URL result.
CREATE SCHEMA profile_media_private;
CREATE FUNCTION profile_media_private.slot_url(uuid,text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT NULL::text $$;
REVOKE ALL ON SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION profile_media_private.slot_url(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION jobs_private.is_public(j public.jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT j.status='published' AND j.published_at IS NOT NULL AND j.active_until>statement_timestamp()
 AND EXISTS(SELECT 1 FROM public.identities i JOIN public.identity_profiles ip ON ip.identity_id=i.id
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=j.identity_id AND i.status='active' AND nullif(btrim(ip.slug),'') IS NOT NULL
 AND ((i.type='private' AND i.user_id IS NOT NULL AND i.business_account_id IS NULL
  AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=i.user_id))
 OR (i.type='business' AND b.status='active')));
$f$;
CREATE OR REPLACE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','job','content_id',j.id,'identity_id',j.identity_id,
 'content',jobs_private.content(j),'status','published','created_at',j.created_at,'updated_at',j.updated_at,
 'published_at',j.published_at,'active_until',j.active_until,
 'employer',jsonb_build_object('name',coalesce(nullif(btrim(ip.display_name),''),
  CASE WHEN i.type='business' THEN nullif(btrim(b.name),'') END,'Selqiro'),
 'slug',ip.slug,'logo_url',profile_media_private.slot_url(j.identity_id,'avatar'),'identity_type',i.type))
 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;
CREATE OR REPLACE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND i.type IN('private','business')
 AND CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END IS NOT NULL
 AND account_lifecycle_private.account_is_available(CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1()
  AND block.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1()
  AND block.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE b.owner_user_id END))));
$f$;
CREATE OR REPLACE FUNCTION public.search_public_jobs_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,
 p_country_code text DEFAULT NULL,p_city text DEFAULT NULL,p_workplace_type text DEFAULT NULL,
 p_employment_type text DEFAULT NULL,p_working_time text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET plan_cache_mode=force_custom_plan AS $f$
DECLARE cursor_value jsonb;query_value text:=btrim(coalesce(p_query,''));words tsquery;items jsonb;more boolean;next_value jsonb;
BEGIN
 IF length(query_value)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR (p_category IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=p_category))
 OR (p_country_code IS NOT NULL AND p_country_code !~ '^[A-Z]{2}$') OR char_length(p_city)>160
 OR (p_workplace_type IS NOT NULL AND p_workplace_type NOT IN('on_site','remote','hybrid'))
 OR (p_employment_type IS NOT NULL AND p_employment_type NOT IN('permanent','fixed_term','contract','internship','other','task'))
 OR (p_working_time IS NOT NULL AND p_working_time NOT IN('full_time','part_time','flexible','other')) THEN
 RAISE EXCEPTION 'job_search_invalid' USING ERRCODE='22023';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,'published_at');
 words:=plainto_tsquery('pg_catalog.simple'::regconfig,query_value);
 WITH viewer_hidden AS MATERIALIZED(SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()),
 candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j
 WHERE j.status='published' AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.provider_identity_id=j.identity_id)
 AND (p_category IS NULL OR j.category=p_category) AND (p_country_code IS NULL OR j.country_code=p_country_code)
 AND (p_city IS NULL OR lower(j.city)=lower(btrim(p_city)))
 AND (p_workplace_type IS NULL OR j.workplace_type=p_workplace_type)
 AND (p_employment_type IS NULL OR j.employment_type=p_employment_type)
 AND (p_working_time IS NULL OR j.working_time=p_working_time)
 AND (query_value='' OR jobs_private.search_document(j.title,j.description,j.category,j.city,j.country_code)@@words)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>'published_at')::timestamptz,(cursor_value->>'id')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),'[]'::jsonb),
 (SELECT jsonb_build_object('published_at',published_at,'id',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object('schema_version',1,'items',items,'result_limit',p_result_limit,'has_more',more,
 'next_cursor',CASE WHEN more THEN next_value ELSE NULL END,'read_at',statement_timestamp());
END $f$;
REVOKE ALL ON FUNCTION jobs_private.accept_policies(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.calendar_month_after(timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.content(public.jobs) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.current_policies() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.cursor(jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.is_public(public.jobs) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.mutate(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.normalize_content(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.owner_fields(public.jobs,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.public_fields(public.jobs) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_actor(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_available_accounts_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_key(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.require_revision(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.search_document(text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION jobs_private.visible_to_viewer(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION listing_publication_private.require_actor(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION listing_publication_private.require_actor(uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION listing_publication_private.require_actor(uuid,uuid) TO selqiro_listing_final_writer_v1;
REVOKE ALL ON FUNCTION public.current_user_has_identity_access(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_my_job_policies_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_policies_v1(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_job_request_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_request_v1(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_job_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_job_v1(uuid,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.listing_actor_uid_hosted_v1() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO anon;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO service_role;
REVOKE ALL ON FUNCTION public.listing_price_currency_scale_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO anon;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.listing_price_currency_scale_v1(text) TO service_role;
REVOKE ALL ON FUNCTION public.lock_listing_creation_actor_v1(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lock_listing_creation_actor_v1(uuid) TO selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.normalize_listing_price_v1(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO selqiro_listing_price_writer_v1;
GRANT EXECUTE ON FUNCTION public.normalize_listing_price_v1(jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamp with time zone) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb) TO authenticated;
