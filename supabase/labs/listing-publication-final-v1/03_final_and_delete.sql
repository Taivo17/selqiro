-- DORMANT same-V2 final contract. One transaction publishes; no Storage calls inside it.
CREATE FUNCTION listing_publication_private.final_material(p_attempt uuid) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,public,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; n jsonb; images jsonb; x record;
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt;
 IF NOT FOUND OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 n:=public.normalize_listing_creation_v1(a.payload-'version');
 IF n IS DISTINCT FROM a.payload THEN RAISE EXCEPTION 'publication_input_changed' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT s.id,w.state,w.ready_id,w.intent FROM listing_publication_private.slots s
  LEFT JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=s.attempt_id
  WHERE s.attempt_id=a.id ORDER BY s.ordinal LOOP
  IF x.state IS DISTINCT FROM 'ready' OR x.ready_id IS NULL THEN
   RAISE EXCEPTION 'publication_images_not_ready' USING ERRCODE='55000'; END IF;
  PERFORM listing_publication_private.validate_web_intent(x.intent,x.id);
 END LOOP;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.cleanup c ON c.object_id=o.id WHERE o.attempt_id=a.id) THEN
  RAISE EXCEPTION 'publication_cleanup_conflict' USING ERRCODE='55000'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('slot_id',s.id,'ordinal',s.ordinal,'receipt_id',w.ready_id,
  'web_sha256',w.intent->>'web_sha256','web_bytes',w.intent->'web_bytes') ORDER BY s.ordinal),'[]') INTO images
 FROM listing_publication_private.slots s JOIN listing_publication_private.web_images w ON w.slot_id=s.id WHERE s.attempt_id=a.id;
 RETURN jsonb_build_object('schema_version',1,'attempt_id',a.id,'request_key',a.request_key,
 'actor_user_id',a.actor_user_id,'identity_id',a.identity_id,'price',n->'price','image_count',jsonb_array_length(images),
 'confirmation_sha256',encode(sha256(convert_to('selqiro-final-v1:'||jsonb_build_object(
  'intent',encode(a.intent_sha256,'hex'),'attempt',a.id,'price',n->'price','images',images)::text,'UTF8')),'hex'));
END $f$;
CREATE FUNCTION public.get_my_listing_publication_confirmation_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 IF a.state IN('published','deleted') THEN RETURN jsonb_build_object('receipt',listing_publication_private.final_receipt(a.id)); END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('confirmation',listing_publication_private.final_material(a.id));
END $f$;
CREATE FUNCTION public.publish_my_listing_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_confirmation_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; material jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_confirmation_sha256 IS NULL OR char_length(p_confirmation_sha256)<>64 OR p_confirmation_sha256 !~ '^[0-9a-f]{64}$' THEN
  RAISE EXCEPTION 'publication_confirmation_invalid' USING ERRCODE='22023'; END IF;
 SELECT x.* INTO a FROM listing_publication_private.attempts x WHERE x.id=p_attempt_id AND x.actor_user_id=p_expected_user_id
  AND x.identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_unavailable' USING ERRCODE='P0002'; END IF;
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id;
 IF FOUND THEN
  IF p.confirmation_sha256 IS DISTINCT FROM p_confirmation_sha256 THEN RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
  -- Recovery is a read, even after terms changed, deletion, or listing expiration. Never reactivate.
  RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',true);
 END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 material:=listing_publication_private.final_material(a.id);
 IF material->>'confirmation_sha256' IS DISTINCT FROM p_confirmation_sha256 THEN
  RAISE EXCEPTION 'publication_confirmation_conflict' USING ERRCODE='22023'; END IF;
 PERFORM listing_publication_private.apply_final(a.id,a.payload,p_confirmation_sha256);
 RETURN listing_publication_private.final_receipt(a.id)||jsonb_build_object('replayed',false);
END $f$;
CREATE FUNCTION listing_publication_private.apply_delete(p_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; p listing_publication_private.publications%ROWTYPE; t timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt FOR UPDATE;
 IF public.current_user_has_identity_access(a.identity_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'listing_price_identity_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM listing_publication_private.publications WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 IF p.state='deleting' THEN RETURN; END IF;
 PERFORM 1 FROM public.listings l WHERE l.id=p.listing_id AND l.identity_id=a.identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 -- Locking the referenced listing fences new FK-linked messages while snapshots are scrubbed.
 IF (SELECT count(*) FROM (SELECT id FROM public.messages WHERE listing_id=p.listing_id LIMIT 501) q)>500
 OR (SELECT count(*) FROM (SELECT id FROM public.conversations WHERE listing_id=p.listing_id LIMIT 501) q)>500 THEN
 RAISE EXCEPTION 'publication_message_cleanup_limit' USING ERRCODE='54000'; END IF;

 -- Durably retain every exact key BEFORE deleting listing content or cascade-dependent rows.
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'terminal_delete',listing_publication_private.object_cleanup_state(o.id),t
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id ON CONFLICT(object_id) DO NOTHING;
 UPDATE listing_publication_private.publications SET state='deleting',deleted_at=t WHERE attempt_id=a.id;
 UPDATE public.conversations SET listing_title_snapshot=NULL,listing_image_snapshot=NULL,listing_price_snapshot=NULL WHERE listing_id=p.listing_id;
 UPDATE public.messages SET listing_title=NULL,listing_image=NULL,listing_price=NULL WHERE listing_id=p.listing_id;
 DELETE FROM public.listing_images WHERE listing_id=p.listing_id;
 DELETE FROM public.listings WHERE id=p.listing_id AND identity_id=a.identity_id AND created_by_user_id=a.actor_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 UPDATE listing_publication_private.attempts SET state='deleted' WHERE id=a.id;
 -- Tokens/hashes and private lineage remain under existing retention policy. Account erasure
 -- stays RESTRICT until that separate narrow retention/rekey boundary has been accepted.
END $f$;
CREATE FUNCTION public.delete_my_published_listing_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_listing_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE aid uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_listing_id IS NULL OR p_listing_id !~ '^[1-9][0-9]{0,18}$' OR p_listing_id::numeric>9223372036854775807 THEN
  RAISE EXCEPTION 'publication_listing_id_invalid' USING ERRCODE='22023'; END IF;
 SELECT a.id INTO aid FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 WHERE p.listing_id=p_listing_id::bigint AND a.identity_id=p_expected_identity_id FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_result_unavailable' USING ERRCODE='P0002'; END IF;
 -- Removing content does not require accepting newer terms. Active identity/access still required.
 PERFORM listing_publication_private.apply_delete(aid);
 RETURN listing_publication_private.final_receipt(aid);
END $f$;
CREATE FUNCTION public.get_public_listing_media_binding_v1(p_attempt_id uuid,p_ordinal integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE v jsonb;
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,'bucket_id',o.bucket_id,
 'object_path',o.object_path,'sha256',w.intent->>'web_sha256','bytes',(w.intent->>'web_bytes')::integer) INTO v
 FROM listing_publication_private.publications p JOIN listing_publication_private.attempts a ON a.id=p.attempt_id
 JOIN public.listings l ON l.id=p.listing_id JOIN public.identities i ON i.id=l.identity_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id AND s.ordinal=p_ordinal
 JOIN listing_publication_private.objects o ON o.slot_id=s.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.state='ready'
 WHERE a.id=p_attempt_id AND a.state='published' AND p.state='published' AND l.status='active'
 AND l.active_until>clock_timestamp() AND i.status='active' AND l.identity_id=a.identity_id;
 RETURN v;
END $f$;
REVOKE ALL ON FUNCTION public.get_my_listing_publication_confirmation_v1(uuid,uuid,uuid),public.publish_my_listing_v1(uuid,uuid,uuid,text),
 public.delete_my_published_listing_v1(uuid,uuid,text),public.get_public_listing_media_binding_v1(uuid,integer)
 FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION listing_publication_private.assert_final_last_boundary(p_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;
BEGIN
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt;
 IF a.actor_user_id IS DISTINCT FROM auth.uid() OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
 RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF listing_publication_private.require_policies() IS DISTINCT FROM a.policy_snapshot THEN
 RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
END $f$;
REVOKE ALL ON FUNCTION listing_publication_private.assert_final_last_boundary(uuid) FROM PUBLIC,anon,authenticated,service_role;
