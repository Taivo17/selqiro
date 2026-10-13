-- DORMANT NEW HELPER CANDIDATE; not a production migration.
DO $gate$ BEGIN
 IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres' THEN
  RAISE EXCEPTION 'publication_disposable_helper_required';
 END IF;
END $gate$;
CREATE FUNCTION listing_publication_private.close_locked_attempt(p_id uuid,p_reason text) RETURNS boolean LANGUAGE plpgsql
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
  CASE WHEN o.dispatch_key IS NULL THEN 'pending' ELSE 'blocked_write_settlement' END,at_time
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id;
 -- Same transaction: any enqueue or update failure rolls back BOTH. No Storage call here.
 UPDATE listing_publication_private.attempts SET state=p_reason,payload=NULL,closed_at=at_time WHERE id=a.id;
 RETURN true;
END $fn$;
CREATE FUNCTION public.cancel_my_listing_publication_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' SET timezone='UTC' AS $fn$
DECLARE active_id uuid; a listing_publication_private.attempts%ROWTYPE; changed boolean;
BEGIN
 active_id:=listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.actor_user_id=p_expected_user_id
  AND x.identity_id=active_id AND x.request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 changed:=listing_publication_private.close_locked_attempt(a.id,'cancelled');
 RETURN listing_publication_private.snapshot(a.id)||jsonb_build_object('changed',changed);
END $fn$;
REVOKE ALL ON FUNCTION public.cancel_my_listing_publication_v1(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

-- One bounded unit for a FUTURE expiry worker; no cron, grants or destructive list-all operation.
CREATE FUNCTION listing_publication_private.expire_one_v1(p_attempt_id uuid) RETURNS boolean LANGUAGE plpgsql
SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $fn$
DECLARE actor uuid;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001';
 END IF;
 SELECT a.actor_user_id INTO actor FROM listing_publication_private.attempts a WHERE a.id=p_attempt_id;
 IF NOT FOUND THEN RETURN false; END IF;
 -- Same profile -> attempt order as prepare/reserve/cancel, not reverse-order locking.
 PERFORM 1 FROM public.profiles p WHERE p.id=actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_actor_lineage_missing' USING ERRCODE='55000'; END IF;
 RETURN listing_publication_private.close_locked_attempt(p_attempt_id,'expired');
END $fn$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON SCHEMA listing_publication_private IS
 'Dormant V2 ordinary-listing attempt/slot/dispatch-lineage candidate. Not exposed, no Storage token, no publish, no cleanup worker, no listing deletion.';
