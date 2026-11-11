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
