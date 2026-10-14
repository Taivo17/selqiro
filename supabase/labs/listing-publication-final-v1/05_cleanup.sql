-- Durable one-object cleanup. The caller commits the claim BEFORE the Storage API call.
-- Dispatched SOURCE / prepared WEB targets remain blocked. No expiry/404/ready-based unblocking.
CREATE FUNCTION public.claim_listing_cleanup_v1() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE (a.state IN('cancelled','expired','deleted') OR (a.state='published' AND o.kind='source'))
 AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
 AND listing_publication_private.object_cleanup_state(o.id)='pending'
 AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
   OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF c.try_count>=8 THEN
  UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
  RETURN NULL;
 END IF;
 UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
 try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
 RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
 'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
END $f$;
CREATE FUNCTION public.record_listing_cleanup_v1(p_object_id uuid,p_work_key uuid,p_result text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c listing_publication_private.cleanup%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 IF p_result IS NULL OR p_result NOT IN('deleted','network','timeout','storage','response') THEN
  RAISE EXCEPTION 'publication_cleanup_result_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM listing_publication_private.cleanup WHERE object_id=p_object_id FOR UPDATE;
 IF NOT FOUND OR c.work_key IS DISTINCT FROM p_work_key OR p_work_key IS NULL THEN
  RAISE EXCEPTION 'publication_cleanup_lease_lost' USING ERRCODE='55000'; END IF;
 IF c.state='deleted' AND p_result='deleted' THEN
  RETURN jsonb_build_object('object_id',c.object_id,'work_key',c.work_key,'state','deleted'); END IF;
 IF c.state<>'in_flight' OR c.lease_until<=t THEN RAISE EXCEPTION 'publication_cleanup_lease_lost' USING ERRCODE='55000'; END IF;
 IF p_result='deleted' THEN
  UPDATE listing_publication_private.cleanup SET state='deleted',deleted_at=t WHERE object_id=c.object_id;
 ELSE
  UPDATE listing_publication_private.cleanup SET state=CASE WHEN try_count>=8 THEN 'needs_attention' ELSE 'retry_wait' END,
   last_error=p_result,not_before=t+(least(3600,30*(2^(try_count-1))::integer)*interval '1 second') WHERE object_id=c.object_id;
 END IF;
 RETURN (SELECT jsonb_build_object('object_id',q.object_id,'work_key',q.work_key,'state',q.state)
  FROM listing_publication_private.cleanup q WHERE q.object_id=c.object_id);
END $f$;
-- Safe owner progress: no Storage keys, tokens, payloads, raw errors or logs.
CREATE FUNCTION public.get_my_listing_cleanup_summary_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN (SELECT jsonb_build_object('schema_version',1,'pending',count(*) FILTER(WHERE c.state IN('pending','retry_wait','in_flight')),
  'blocked',count(*) FILTER(WHERE c.state='blocked_write_settlement'),'needs_attention',count(*) FILTER(WHERE c.state='needs_attention'),
  'oldest_pending_seconds',coalesce(floor(extract(epoch FROM clock_timestamp()-min(c.enqueued_at) FILTER(WHERE c.state<>'deleted')))::bigint,0),
  'reserved_bytes',coalesce(sum(o.reserved_bytes) FILTER(WHERE c.state IS DISTINCT FROM 'deleted'),0))
 FROM listing_publication_private.attempts a JOIN listing_publication_private.objects o ON o.attempt_id=a.id
 LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id);
END $f$;
REVOKE ALL ON FUNCTION public.claim_listing_cleanup_v1(),public.record_listing_cleanup_v1(uuid,uuid,text),
 public.get_my_listing_cleanup_summary_v1(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
