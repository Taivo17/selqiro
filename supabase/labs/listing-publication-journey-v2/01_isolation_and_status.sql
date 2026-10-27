-- New integrated fixture only. This is NOT a deployment migration or a hosted apply.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
  OR current_setting('selqiro.integration_run_id',true) IS NULL
  OR current_setting('selqiro.integration_run_id',true)!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN RAISE EXCEPTION 'fresh_integration_run_required'; END IF;
END $gate$;
CREATE SCHEMA selqiro_disposable_v2;
REVOKE ALL ON SCHEMA selqiro_disposable_v2 FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE selqiro_disposable_v2.run (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), run_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO selqiro_disposable_v2.run(run_id) VALUES(current_setting('selqiro.integration_run_id')::uuid);
REVOKE ALL ON selqiro_disposable_v2.run FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.assert_selqiro_disposable_v2(p_run_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM selqiro_disposable_v2.run WHERE run_id=p_run_id)
 THEN RAISE EXCEPTION 'integration_unverified' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('scope','disposable-v2','run_id',p_run_id);
END $f$;
REVOKE ALL ON FUNCTION public.assert_selqiro_disposable_v2(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assert_selqiro_disposable_v2(uuid) TO service_role;

-- Seal an uncertain, not-yet-observed prepare under the same profile lock used by
-- prepare. A late request cannot create a new attempt after cancellation is confirmed.
CREATE TABLE listing_publication_private.closed_journey_requests (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL, request_key uuid NOT NULL,
 closed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,identity_id,request_key)
);
ALTER TABLE listing_publication_private.closed_journey_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON listing_publication_private.closed_journey_requests FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION listing_publication_private.guard_closed_journey_request() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$ BEGIN
 IF EXISTS(SELECT 1 FROM listing_publication_private.closed_journey_requests
  WHERE actor_user_id=NEW.actor_user_id AND identity_id=NEW.identity_id AND request_key=NEW.request_key)
 THEN RAISE EXCEPTION 'publication_request_closed' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_closed_journey_request BEFORE INSERT ON listing_publication_private.attempts
FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_closed_journey_request();

CREATE FUNCTION public.get_my_listing_publication_journey_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE a listing_publication_private.attempts; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO a FROM listing_publication_private.attempts
 WHERE actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR SHARE;
 IF NOT FOUND THEN RETURN jsonb_build_object('snapshot',NULL,'receipt',NULL,'intent_closed',EXISTS(
  SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id
  AND identity_id=p_expected_identity_id AND request_key=p_request_key)); END IF;
 RETURN jsonb_build_object('snapshot',listing_publication_private.snapshot(a.id),
   'receipt',listing_publication_private.final_receipt(a.id),'intent_closed',a.state IN('cancelled','expired','deleted'));
END $f$;
REVOKE ALL ON FUNCTION public.get_my_listing_publication_journey_v2(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.cancel_my_listing_publication_journey_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL THEN RAISE EXCEPTION 'request_key_required' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id
  AND identity_id=p_expected_identity_id AND request_key=p_request_key) THEN
  PERFORM public.cancel_my_listing_publication_v1(p_expected_user_id,p_expected_identity_id,p_request_key);
 ELSE
  IF (SELECT count(*) FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id)>=1000
    AND NOT EXISTS(SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id
      AND identity_id=p_expected_identity_id AND request_key=p_request_key)
  THEN RAISE EXCEPTION 'publication_request_limit' USING ERRCODE='54000'; END IF;
  INSERT INTO listing_publication_private.closed_journey_requests(actor_user_id,identity_id,request_key)
   VALUES(p_expected_user_id,p_expected_identity_id,p_request_key) ON CONFLICT DO NOTHING;
 END IF;
 RETURN public.get_my_listing_publication_journey_v2(p_expected_user_id,p_expected_identity_id,p_request_key);
END $f$;
REVOKE ALL ON FUNCTION public.cancel_my_listing_publication_journey_v2(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_managed_listing_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE aid uuid; BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id !~'^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807
 THEN RAISE EXCEPTION 'listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.attempts a
 JOIN listing_publication_private.publications p ON p.attempt_id=a.id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR SHARE OF a;
 RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(aid));
END $f$;
REVOKE ALL ON FUNCTION public.get_my_managed_listing_v2(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

-- Authenticated grants are applied only by the new isolated runtime after marker verification.
