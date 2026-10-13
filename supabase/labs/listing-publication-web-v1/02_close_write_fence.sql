-- NEW WEB-WRITE EXTENSION. Existing repository lab files remain unchanged.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required'; END IF;
END $gate$;
-- A prepared WEB write may still arrive even after the application times out.
-- No time/404/ack assumption makes it safe to delete. Actual settlement is a later gate.
CREATE FUNCTION listing_publication_private.object_cleanup_state(p_id uuid) RETURNS text LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT CASE WHEN o.dispatch_key IS NOT NULL OR (o.kind='web' AND EXISTS(
  SELECT 1 FROM listing_publication_private.web_images w WHERE w.slot_id=o.slot_id AND w.prepared_at IS NOT NULL))
 THEN 'blocked_write_settlement' ELSE 'pending' END
 FROM listing_publication_private.objects o WHERE o.id=p_id;
$f$;
CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['state','payload','closed_at']) OR OLD.state<>'open'
    OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id
    OR c.object_path<>o.object_path OR c.reason<>NEW.state
    OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END $fn$;

CREATE OR REPLACE FUNCTION listing_publication_private.close_locked_attempt(p_id uuid,p_reason text) RETURNS boolean LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $fn$
DECLARE a listing_publication_private.attempts%ROWTYPE; at_time timestamptz;
BEGIN
 IF p_reason IS NULL OR p_reason NOT IN('cancelled','expired') THEN
  RAISE EXCEPTION 'publication_close_reason_invalid' USING ERRCODE='22023';
 END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state<>'open' THEN RETURN false; END IF;
 at_time:=clock_timestamp();
 IF p_reason='expired' AND a.expires_at>at_time THEN RETURN false; END IF;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,p_reason,
  listing_publication_private.object_cleanup_state(o.id),at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id;
 -- Same transaction: any enqueue or update failure rolls back BOTH. No Storage call here.
 UPDATE listing_publication_private.attempts SET state=p_reason,payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN true;
END $fn$;

CREATE FUNCTION listing_publication_private.guard_cleanup_web_fence() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF NEW.state IS DISTINCT FROM listing_publication_private.object_cleanup_state(NEW.object_id) THEN
  RAISE EXCEPTION 'publication_web_cleanup_write_unsettled' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER guard_cleanup_web_fence BEFORE INSERT ON listing_publication_private.cleanup
 FOR EACH ROW EXECUTE FUNCTION listing_publication_private.guard_cleanup_web_fence();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
