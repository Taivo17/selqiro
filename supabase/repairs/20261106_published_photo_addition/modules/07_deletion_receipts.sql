-- Terminal listing removal retains the original publication and every bound
-- child, closes pending writes, and queues exact objects before public deletion.
CREATE OR REPLACE FUNCTION listing_publication_private.apply_delete(p_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; child record; t timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt FOR UPDATE;
 IF public.current_user_has_identity_access(a.identity_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 IF p.state='deleting' THEN RETURN; END IF;
 -- Parent serialization fences a new child or attachment while all existing
 -- children are closed in stable order. Their exact immutable ledgers survive.
 FOR child IN SELECT c.id,c.state FROM listing_publication_private.attempts c
  JOIN listing_publication_private.managed_image_additions_v1 b ON b.attempt_id=c.id
  WHERE b.parent_attempt_id=a.id ORDER BY c.id FOR UPDATE OF c LOOP
  IF child.state='open' THEN PERFORM listing_publication_private.close_locked_attempt(child.id,'cancelled'); END IF;
 END LOOP;
 PERFORM 1 FROM public.listings l WHERE l.id=p.listing_id AND l.identity_id=a.identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 -- Locking the referenced listing fences new FK-linked messages while snapshots are scrubbed.
 IF (SELECT count(*) FROM (SELECT id FROM public.messages WHERE listing_id=p.listing_id LIMIT 501) q)>500
 OR (SELECT count(*) FROM (SELECT id FROM public.conversations WHERE listing_id=p.listing_id LIMIT 501) q)>500 THEN
 RAISE EXCEPTION 'publication_message_cleanup_limit' USING ERRCODE='54000'; END IF;

 -- Durably retain every exact key BEFORE deleting listing content or cascade-dependent rows.
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'terminal_delete',listing_publication_private.object_cleanup_state(o.id),t
 FROM listing_publication_private.objects o WHERE o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(a.id))
 ON CONFLICT(object_id) DO NOTHING;
 UPDATE listing_publication_private.publications SET state='deleting',deleted_at=t WHERE attempt_id=a.id;
 UPDATE public.conversations SET listing_title_snapshot=NULL,listing_image_snapshot=NULL,listing_price_snapshot=NULL WHERE listing_id=p.listing_id;
 UPDATE public.messages SET listing_title=NULL,listing_image=NULL,listing_price=NULL WHERE listing_id=p.listing_id;
 DELETE FROM public.listing_images WHERE listing_id=p.listing_id;
 DELETE FROM public.listings WHERE id=p.listing_id AND identity_id=a.identity_id AND created_by_user_id=a.actor_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 UPDATE listing_publication_private.attempts SET state='deleted' WHERE state='published' AND id IN(
  SELECT attempt_id FROM listing_publication_private.managed_image_additions_v1 WHERE parent_attempt_id=a.id AND attached_at IS NOT NULL);
 UPDATE listing_publication_private.attempts SET state='deleted' WHERE id=a.id;
 -- Tokens/hashes and private lineage remain under existing retention policy. Account erasure
 -- stays RESTRICT until that separate narrow retention/rekey boundary has been accepted.
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.final_receipt(p_attempt uuid) RETURNS jsonb LANGUAGE sql
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'listing_id',p.listing_id::text,
 'state',CASE WHEN p.state='published' THEN 'published' WHEN EXISTS(
 SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(a.id)) AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)) THEN 'deleting' ELSE 'deleted' END,
 'published_at',to_char(p.published_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'content_deleted',p.state='deleting',
 'files_remaining',(SELECT count(*) FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 WHERE o.attempt_id IN(SELECT attempt_id FROM listing_publication_private.managed_image_family_v1(a.id)) AND (p.state='deleting' OR (o.kind='source' AND c.reason='published_source')) AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)))
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id WHERE a.id=p_attempt;
$f$;
