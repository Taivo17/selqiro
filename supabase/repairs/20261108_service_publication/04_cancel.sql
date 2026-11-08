CREATE FUNCTION public.cancel_my_service_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c service_publication_private.commands%ROWTYPE; a listing_publication_private.attempts%ROWTYPE; existing_identity uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO c FROM service_publication_private.commands WHERE attempt_id=a.id FOR UPDATE;
  IF NOT FOUND OR a.identity_id IS DISTINCT FROM p_expected_identity_id OR (p_attempt_id IS NOT NULL AND p_attempt_id<>a.id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  IF c.state='published' THEN RETURN service_publication_private.snapshot(a.id); END IF;
  IF a.state='open' THEN PERFORM listing_publication_private.close_locked_attempt(a.id,'cancelled'); END IF;
  IF c.state='prepared' THEN UPDATE service_publication_private.commands SET state='cancelled' WHERE attempt_id=a.id; END IF;
 ELSIF p_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'service_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT identity_id INTO existing_identity FROM service_publication_private.closed_requests
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND AND existing_identity IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 INSERT INTO service_publication_private.closed_requests(actor_user_id,identity_id,request_key)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key) ON CONFLICT DO NOTHING;
 RETURN public.get_my_service_publication_attempt_v1(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
END $f$;
