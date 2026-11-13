-- One free, account-scoped discovery preference. No content or message writes.
CREATE SCHEMA provider_controls_private;
REVOKE ALL ON SCHEMA provider_controls_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE provider_controls_private.hidden_providers (
 viewer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 provider_identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 revision uuid NOT NULL CHECK(revision<>'00000000-0000-0000-0000-000000000000'::uuid),
 hidden_until timestamptz CHECK(hidden_until IS NULL OR isfinite(hidden_until)),
 PRIMARY KEY(viewer_user_id,provider_identity_id)
);
CREATE INDEX hidden_providers_active_idx ON provider_controls_private.hidden_providers
 (viewer_user_id,hidden_until DESC,provider_identity_id) WHERE hidden_until IS NOT NULL;
ALTER TABLE provider_controls_private.hidden_providers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON provider_controls_private.hidden_providers FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION provider_controls_private.require_actor(p_expected_user_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR p_expected_user_id IS NULL OR actor<>p_expected_user_id
 OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor) THEN
  RAISE EXCEPTION 'provider_control_actor_mismatch' USING ERRCODE='42501';END IF;
 RETURN actor;
END $f$;

CREATE FUNCTION provider_controls_private.validate_target(p_type text,p_id text) RETURNS void
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF p_type IS NULL OR p_id IS NULL OR p_type NOT IN('listing','horse_offer','service','profile','hidden_provider','blocked_account','conversation') THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 IF p_type='listing' THEN
  IF p_id!~'^(0|[1-9][0-9]{0,18}|-[1-9][0-9]{0,18})$' THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric NOT BETWEEN -9223372036854775808 AND 9223372036854775807 THEN
   RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_type IN('blocked_account','conversation') THEN
  IF p_id!~'^[1-9][0-9]{0,18}$' THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
  IF p_id::numeric>9223372036854775807 THEN RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
 ELSIF p_id!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  OR p_id='00000000-0000-0000-0000-000000000000' THEN
  RAISE EXCEPTION 'provider_control_target_invalid' USING ERRCODE='22023';END IF;
END $f$;

CREATE FUNCTION provider_controls_private.is_own_provider(p_actor uuid,p_identity uuid,p_account uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT p_actor=p_account OR EXISTS(SELECT 1 FROM public.identities i
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND ((i.type='private' AND i.user_id=p_actor)
 OR (i.type='business' AND (b.owner_user_id=p_actor OR EXISTS(SELECT 1 FROM public.business_members m
 WHERE m.business_account_id=i.business_account_id AND m.user_id=p_actor AND m.status='active')))));
$f$;
REVOKE ALL ON FUNCTION provider_controls_private.require_actor(uuid),
 provider_controls_private.validate_target(text,text),provider_controls_private.is_own_provider(uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
