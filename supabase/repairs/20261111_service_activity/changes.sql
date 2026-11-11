-- COMPONENT 01_state.sql
-- One canonical service UUID; activity metadata never rewrites its content row.
CREATE TABLE service_publication_private.activity_rollout (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 activated_at timestamptz NOT NULL CHECK(isfinite(activated_at)),
 period_hours integer NOT NULL DEFAULT 8760 CHECK(period_hours=8760),
 published_count bigint NOT NULL CHECK(published_count>=0),
 archived_count bigint NOT NULL CHECK(archived_count>=0)
);
CREATE TABLE service_publication_private.activity (
 service_id uuid PRIMARY KEY REFERENCES public.services(id) ON DELETE RESTRICT,
 started_at timestamptz NOT NULL CHECK(isfinite(started_at)),
 active_until timestamptz NOT NULL CHECK(isfinite(active_until) AND active_until>started_at),
 origin text NOT NULL CHECK(origin IN('transition','publication')),
 last_confirmed_at timestamptz CHECK(last_confirmed_at IS NULL OR
  (isfinite(last_confirmed_at) AND last_confirmed_at>=started_at AND last_confirmed_at<active_until))
);
CREATE INDEX service_activity_until_idx ON service_publication_private.activity(active_until,service_id);
ALTER TABLE service_publication_private.activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_publication_private.activity_rollout ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_publication_private.activity,service_publication_private.activity_rollout
 FROM PUBLIC,anon,authenticated,service_role;

-- This is a deliberate transition period, not a claimed historical user review.
-- LOCK in apply.sql prevents a publication between the backfill and the trigger.
INSERT INTO service_publication_private.activity_rollout(singleton,activated_at,published_count,archived_count)
 SELECT true,clock_timestamp(),count(*) FILTER(WHERE status='published'),
 count(*) FILTER(WHERE status='archived' AND published_at IS NOT NULL) FROM public.services;
INSERT INTO service_publication_private.activity(service_id,started_at,active_until,origin,last_confirmed_at)
 SELECT s.id,r.activated_at,r.activated_at+interval '8760 hours','transition',NULL
 FROM public.services s CROSS JOIN service_publication_private.activity_rollout r
 WHERE s.status IN('published','archived') AND s.published_at IS NOT NULL;

CREATE FUNCTION service_publication_private.start_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE started timestamptz;
BEGIN
 -- Only the first actual publication starts a period. Editing, resuming and
 -- replaying an old command can neither extend nor replace an existing period.
 IF NEW.status='published' AND NEW.published_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM service_publication_private.activity WHERE service_id=NEW.id) THEN
  IF TG_OP='UPDATE' AND OLD.status='published' THEN
   RAISE EXCEPTION 'service_activity_missing' USING ERRCODE='55000';
  END IF;
  started:=clock_timestamp();
  INSERT INTO service_publication_private.activity(service_id,started_at,active_until,origin,last_confirmed_at)
   VALUES(NEW.id,started,started+interval '8760 hours','publication',NULL);
 END IF;
 RETURN NEW;
END $f$;
REVOKE ALL ON FUNCTION service_publication_private.start_activity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER service_activity_start AFTER INSERT OR UPDATE ON public.services
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.start_activity();

CREATE OR REPLACE FUNCTION service_publication_private.is_public(p_service uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s
 JOIN public.identities i ON i.id=s.identity_id AND i.status='active'
 JOIN service_publication_private.activity a ON a.service_id=s.id
 WHERE s.id=p_service AND s.status='published' AND a.active_until>statement_timestamp()
 AND (NOT EXISTS(SELECT 1 FROM service_publication_private.heads h WHERE h.service_id=s.id)
 OR service_publication_private.has_current_publication(s.id)));
$f$;

-- COMPONENT 02_owner_reads.sql
CREATE FUNCTION service_publication_private.activity_fields(s public.services,p_now timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('active_until',a.active_until,'origin',a.origin,
 'last_confirmed_at',a.last_confirmed_at,'is_expired',coalesce(a.active_until<=p_now,false),
 'can_renew',s.status IN('published','archived') AND a.service_id IS NOT NULL,'server_now',p_now)
 FROM (SELECT 1) one LEFT JOIN service_publication_private.activity a ON a.service_id=s.id;
$f$;
REVOKE ALL ON FUNCTION service_publication_private.activity_fields(public.services,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_my_service_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,
 'identity_id',s.identity_id,'service_id',s.id,'status',s.status,
 'activity',service_publication_private.activity_fields(s,clock_timestamp()));
END $f$;

CREATE FUNCTION public.get_my_service_publication_snapshot_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;retained jsonb;
BEGIN
 -- The v1 reader keeps its exact contract for old clients and command receipts.
 retained:=public.get_my_service_publication_snapshot_v1(p_expected_user_id,p_expected_identity_id,p_service_id);
 SELECT * INTO STRICT s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id;
 RETURN retained||jsonb_build_object('schema_version',2,'activity',service_publication_private.activity_fields(s,statement_timestamp()));
END $f$;

CREATE FUNCTION public.get_my_service_publications_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 200,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE items jsonb;total bigint;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 200 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 THEN RAISE EXCEPTION 'service_page_invalid' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO total FROM public.services WHERE identity_id=p_expected_identity_id;
 SELECT coalesce(jsonb_agg(public.get_my_service_publication_snapshot_v2(p_expected_user_id,p_expected_identity_id,s.id)
 ORDER BY s.created_at DESC,s.id ASC),'[]'::jsonb) INTO items FROM
 (SELECT * FROM public.services WHERE identity_id=p_expected_identity_id ORDER BY created_at DESC,id ASC
 LIMIT p_result_limit OFFSET p_result_offset) s;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
 'items',items,'total_count',total::text,'result_limit',p_result_limit,'result_offset',p_result_offset,
 'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

REVOKE ALL ON FUNCTION public.get_my_service_activity_v1(uuid,uuid,uuid),
 public.get_my_service_publication_snapshot_v2(uuid,uuid,uuid),public.get_my_service_publications_v2(uuid,uuid,integer,integer)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_service_activity_v1(uuid,uuid,uuid),
 public.get_my_service_publication_snapshot_v2(uuid,uuid,uuid),public.get_my_service_publications_v2(uuid,uuid,integer,integer)
 TO authenticated;

-- COMPONENT 03_renewal.sql
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
