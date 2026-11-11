CREATE FUNCTION public.renew_my_service_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid,
 p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;a service_publication_private.activity%ROWTYPE;read_time timestamptz;target timestamptz;changed boolean:=false;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF current_setting('transaction_isolation')<>'read committed' OR p_expected_active_until IS NULL
 OR NOT isfinite(p_expected_active_until) THEN RAISE EXCEPTION 'service_activity_invalid_input' USING ERRCODE='22023';END IF;
 -- Actor/active identity before service before activity: same order as saves.
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM service_publication_private.activity WHERE service_id=s.id FOR UPDATE;
 IF NOT FOUND OR s.status NOT IN('published','archived') THEN
  RAISE EXCEPTION 'service_activity_not_published' USING ERRCODE='55000';END IF;
 IF a.active_until IS DISTINCT FROM p_expected_active_until THEN
  RAISE EXCEPTION 'service_activity_conflict' USING ERRCODE='40001';END IF;
 read_time:=clock_timestamp();target:=read_time+interval '8760 hours';
 -- Do not shorten an existing longer period or accumulate future years.
 IF a.active_until<target THEN
  UPDATE service_publication_private.activity SET active_until=target,last_confirmed_at=read_time
   WHERE service_id=s.id AND active_until=p_expected_active_until;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_activity_conflict' USING ERRCODE='40001';END IF;
  changed:=true;
 END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,
 'identity_id',s.identity_id,'service_id',s.id,'status',s.status,
 'activity',service_publication_private.activity_fields(s,read_time),'changed',changed);
END $f$;
REVOKE ALL ON FUNCTION public.renew_my_service_activity_v1(uuid,uuid,uuid,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.renew_my_service_activity_v1(uuid,uuid,uuid,timestamptz) TO authenticated;
COMMENT ON FUNCTION public.renew_my_service_activity_v1(uuid,uuid,uuid,timestamptz) IS
 'Explicit free owner review of an already published service. Exact old deadline compare-and-swap; server UTC 365*24 hours. Changes activity metadata only. Archived remains archived; no content, edit revision, created/updated/published timestamp, gallery, store category or Energy changes.';
