-- COMPONENT 01_capacity.sql
-- The retained 300 MiB limit bounds unfinished upload work. A committed gallery
-- is product content, not unfinished work. No object reservation or deletion
-- receipt is rewritten, and no permanent account/listing quota is introduced.
CREATE FUNCTION listing_publication_private.upload_object_is_published_web_v1(p_object uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT o.kind='web' AND o.dispatch_key IS NULL
  AND o.bucket_id='listing-publication-private'
  AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
  AND a.state='published' AND a.closed_at IS NOT NULL
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex')
  AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id)
  AND (EXISTS(
   SELECT 1 FROM listing_publication_private.publications p
   JOIN listing_publication_private.attempts parent ON parent.id=p.attempt_id
   JOIN public.listings l ON l.id=p.listing_id
   JOIN LATERAL listing_publication_private.managed_image_origins_v1(parent.id) g ON g.media_attempt_id=a.id AND g.slot_id=s.id
   JOIN public.listing_images i ON i.listing_id=l.id AND i.sort_order=g.ordinal
   WHERE p.attempt_id=coalesce((SELECT b.parent_attempt_id FROM listing_publication_private.managed_image_additions_v1 b
     WHERE b.attempt_id=a.id AND b.attached_at IS NOT NULL),a.id)
    AND parent.state='published' AND p.state='published' AND p.deleted_at IS NULL
    AND parent.identity_id=a.identity_id AND l.identity_id=a.identity_id
    AND l.user_id=parent.actor_user_id AND l.created_by_user_id=parent.actor_user_id
    AND i.user_id=parent.actor_user_id AND i.original_url=g.canonical_url
    AND i.medium_url=g.canonical_url AND i.thumb_url=g.canonical_url
    AND (g.attached_ready_id IS NULL OR g.attached_ready_id=w.ready_id)
    AND NOT EXISTS(SELECT 1 FROM horse_publication_private.commands c WHERE c.attempt_id=a.id)
  ) OR EXISTS(
   SELECT 1 FROM horse_publication_private.commands c
   JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id
   JOIN horse_publication_private.gallery g ON g.attempt_id=a.id AND g.slot_id=s.id AND g.object_id=o.id
   JOIN public.horse_offers h ON h.id=g.horse_offer_id
   JOIN public.horse_offer_images i ON i.id=g.image_id AND i.horse_offer_id=h.id
   WHERE c.attempt_id=a.id AND c.state='published' AND c.actor_user_id=a.actor_user_id
    AND c.identity_id=a.identity_id AND c.request_key=a.request_key AND c.horse_offer_id=h.id
    AND e.horse_offer_id=h.id AND e.identity_id=a.identity_id AND e.actor_user_id=a.actor_user_id
    AND e.submission_key=a.id AND e.decision='published'
    AND h.identity_id=a.identity_id AND i.identity_id=a.identity_id
    AND g.ready_id=w.ready_id AND encode(g.web_sha256,'hex')=w.intent->>'web_sha256'
    AND g.web_bytes::text=w.intent->>'web_bytes'
    AND i.original_url='/api/v2/horse-media/'||a.id::text||'/'||s.ordinal::text
    AND i.medium_url=i.original_url AND i.thumb_url=i.original_url AND i.storage_path=o.object_path
  ))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.attempt_id=a.id AND w.slot_id=s.id
 WHERE o.id=p_object),false);
$f$;

-- SOURCE remains charged after publication until accepted provider absence.
-- Open/unattached, cancelled, expired and retired WEB remain charged as well.
-- Public visibility and current identity selection do not change this budget.
CREATE FUNCTION listing_publication_private.pending_upload_reserved_bytes_v1(p_user uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(sum(o.reserved_bytes),0)::bigint
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 LEFT JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 WHERE a.actor_user_id=p_user
  AND CASE
   -- CASE deliberately avoids the unrelated legacy/retired deletion joins for
   -- every live gallery WEB and every object still lacking a deletion receipt.
   WHEN o.kind='web' AND q.object_id IS NULL
    AND listing_publication_private.upload_object_is_published_web_v1(o.id) THEN false
   WHEN q.state IS DISTINCT FROM 'deleted' THEN true
   WHEN o.kind='source' AND q.reason='published_source'
    AND listing_publication_private.hosted_completed_source_deleted_v1(o.id) THEN false
   ELSE listing_publication_private.multipart_object_fully_deleted(o.id) IS DISTINCT FROM true
  END;
$f$;

-- The two active reservation gates are appended below from their exact retained
-- definitions. Their byte counter is shared; commands without new photos reserve no upload bytes.

CREATE OR REPLACE FUNCTION listing_publication_private.allocate_managed_publication_attempt_v1(
 p_user uuid,p_identity uuid,p_request uuid,p_fingerprint bytea,p_payload jsonb,p_images jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE active_id uuid; policies jsonb; t timestamptz; reserved bigint; aid uuid; sid uuid; image record;
BEGIN
 active_id:=listing_publication_private.require_actor(p_user,p_identity);
 policies:=listing_publication_private.require_policies(); t:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_user
  AND state='open' AND expires_at>t)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_user
  AND created_at>t-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000'; END IF;
 reserved:=listing_publication_private.pending_upload_reserved_bytes_v1(p_user);
 IF jsonb_array_length(p_images)>0 AND reserved+jsonb_array_length(p_images)::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000'; END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,
  payload,policy_snapshot,created_at,expires_at)
 VALUES(p_user,active_id,p_request,p_fingerprint,p_payload,policies,t,t+interval '24 hours') RETURNING id INTO aid;
 FOR image IN SELECT value,ordinality FROM jsonb_array_elements(p_images) WITH ORDINALITY LOOP
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(aid,image.ordinality-1,(image.value->>'client_file_id')::uuid,(image.value->>'byte_length')::integer,
   decode(image.value->>'sha256','hex')) RETURNING id INTO sid;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(aid,sid,'source','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/source.upload',26214400),
   (aid,sid,'web','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/web-v1.webp',4194304);
 END LOOP;
 RETURN aid;
END $f$;

CREATE OR REPLACE FUNCTION public.prepare_my_horse_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_offer_id uuid,p_expected_revision text,
 p_content jsonb,p_gallery jsonb,p_confirmations jsonb,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c horse_publication_private.commands%ROWTYPE; current public.horse_offers%ROWTYPE; proposed public.horse_offers%ROWTYPE;
 gallery jsonb; factual jsonb; policies jsonb; fingerprint bytea; prior listing_publication_private.attempts%ROWTYPE;
 t timestamptz; reserved bigint; aid uuid; sid uuid; item record; new_count integer;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid
  OR (p_offer_id IS NULL AND p_expected_revision IS NOT NULL)
  OR (p_offer_id IS NOT NULL AND (p_expected_revision IS NULL OR p_expected_revision !~'^[1-9][0-9]{0,18}$'
    OR p_expected_revision::numeric>9223372036854775807)) THEN
  RAISE EXCEPTION 'horse_offer_command_invalid' USING ERRCODE='22023'; END IF;
 IF coalesce(p_content->>'offerId','')<>coalesce(p_offer_id::text,'') THEN
  RAISE EXCEPTION 'horse_offer_command_invalid' USING ERRCODE='22023'; END IF;
 -- Raw input fingerprint makes retry exact, including confirmation/policy intent.
 fingerprint:=sha256(convert_to('selqiro-horse-publication-v1:'||jsonb_build_object(
  'offer',p_offer_id,'revision',p_expected_revision,'content',p_content,'gallery',p_gallery,
  'confirmations',p_confirmations,'policies',p_policy_snapshot)::text,'UTF8'));
 SELECT * INTO prior FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO c FROM horse_publication_private.commands WHERE attempt_id=prior.id;
  IF NOT FOUND OR prior.identity_id IS DISTINCT FROM p_expected_identity_id OR prior.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN horse_publication_private.snapshot(prior.id);
 END IF;
 IF EXISTS(SELECT 1 FROM horse_publication_private.closed_requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key) THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF p_offer_id IS NOT NULL THEN
  SELECT * INTO current FROM public.horse_offers WHERE id=p_offer_id AND identity_id=p_expected_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
  IF current.status NOT IN('draft','published','paused') THEN
   RAISE EXCEPTION 'horse_offer_status_not_editable' USING ERRCODE='55000'; END IF;
  IF current.edit_revision::text IS DISTINCT FROM p_expected_revision THEN
   RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
 END IF;
 proposed:=horse_publication_private.normalize_content(current,p_content);
 factual:=horse_publication_private.confirmations(proposed.offer_type,p_confirmations);
 gallery:=horse_publication_private.normalize_gallery(p_offer_id,p_expected_identity_id,p_gallery);
 policies:=horse_publication_private.accept_shown_policies(p_expected_user_id,p_expected_identity_id,p_policy_snapshot);
 t:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND state='open' AND expires_at>t)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000'; END IF;
 SELECT count(*) INTO new_count FROM jsonb_array_elements(gallery) x WHERE x ? 'clientFileId';
 reserved:=listing_publication_private.pending_upload_reserved_bytes_v1(p_expected_user_id);
 IF new_count>0 AND reserved+new_count::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000'; END IF;
 IF p_offer_id IS NULL THEN
  INSERT INTO public.horse_offers(identity_id,created_by_user_id,updated_by_user_id,offer_type,status,market_country_code,
   horse_location_country_code,title,description,price_amount,price_type,currency,horse_name,birth_year,sex,breed,color,height_cm,
   discipline,training_level,suitability,health_notes,behavior_notes,city,region,details)
  VALUES(p_expected_identity_id,p_expected_user_id,p_expected_user_id,proposed.offer_type,'draft','EE','EE',proposed.title,
   proposed.description,proposed.price_amount,proposed.price_type,'EUR',proposed.horse_name,proposed.birth_year,proposed.sex,
   proposed.breed,proposed.color,proposed.height_cm,proposed.discipline,proposed.training_level,proposed.suitability,
   proposed.health_notes,proposed.behavior_notes,proposed.city,proposed.region,proposed.details) RETURNING * INTO current;
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key,fingerprint,
  jsonb_build_object('purpose','horse_publication','horse_offer_id',current.id),policies,t,t+interval '24 hours') RETURNING id INTO aid;
 INSERT INTO horse_publication_private.commands(attempt_id,horse_offer_id,actor_user_id,identity_id,request_key,base_revision,
  proposed_content,gallery_intent,confirmation_snapshot)
 VALUES(aid,current.id,p_expected_user_id,p_expected_identity_id,p_request_key,current.edit_revision,to_jsonb(proposed),gallery,factual);
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements(gallery) WITH ORDINALITY LOOP
  IF NOT(item.value ? 'clientFileId') THEN CONTINUE; END IF;
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(aid,item.ordinality-1,(item.value->>'clientFileId')::uuid,(item.value->>'byteLength')::integer,
   decode(item.value->>'sha256','hex')) RETURNING id INTO sid;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(aid,sid,'source','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/source.upload',26214400),
   (aid,sid,'web','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/web-v1.webp',4194304);
 END LOOP;
 IF horse_publication_private.require_policies() IS DISTINCT FROM policies THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 RETURN horse_publication_private.snapshot(aid);
END $f$;

-- COMPONENT 02_account_source_cleanup.sql
-- Account housekeeping is explicitly distinct from acting as another identity.
-- The public service entry points first lock/recheck the real current active
-- identity. This helper checks ownership/access to the original SOURCE identity
-- without switching that identity or changing the user's authentication claims.
CREATE FUNCTION listing_publication_private.lock_account_upload_actor_v1(p_user uuid,p_identity uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.lock_upload_service_actor(p_user,p_identity);
END $f$;

CREATE FUNCTION listing_publication_private.lock_account_upload_identity_v1(p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE identity_row public.identities%ROWTYPE;
BEGIN
 SELECT * INTO identity_row FROM public.identities WHERE id=p_identity AND status='active' FOR SHARE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF identity_row.type='private' THEN RETURN identity_row.user_id=p_user; END IF;
 IF identity_row.type='business' THEN
  PERFORM 1 FROM public.business_members WHERE business_account_id=identity_row.business_account_id
   AND user_id=p_user AND status='active' FOR SHARE;
  RETURN FOUND;
 END IF;
 RETURN false;
END $f$;

-- Exact verified completed SOURCE plus its still-attached WEB. Missing SOURCE
-- metadata can be a lost DELETE acknowledgement; conflicting versions, any
-- unresolved multipart writer, or an absent/conflicting WEB are never eligible.
CREATE FUNCTION listing_publication_private.account_source_cleanup_eligible_v1(p_object uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT a.actor_user_id=p_user AND a.state='published'
  AND o.kind='source' AND o.dispatch_key IS NULL AND o.bucket_id='listing-publication-private'
  AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/source.upload'
  AND q.reason='published_source' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.problem IS NULL
  AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=encode(s.expected_source_sha256,'hex') AND m.observed_bytes=s.expected_source_bytes
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part
   WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
  AND listing_publication_private.upload_object_is_published_web_v1(web.id)
  AND wm.provider_contract='supabase-s3-session-v1' AND wm.state='completed'
  AND wm.completed_at IS NOT NULL AND wm.verified_at IS NOT NULL AND wm.problem IS NULL
  AND wm.storage_object_id IS NOT NULL AND wm.storage_version IS NOT NULL
  AND wm.observed_sha256=w.intent->>'web_sha256' AND wm.observed_bytes::text=w.intent->>'web_bytes'
  AND EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.id=wm.storage_object_id AND z.version=wm.storage_version AND z.bucket_id=web.bucket_id AND z.name=web.object_path)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=web.bucket_id AND z.name=web.object_path AND (z.id<>wm.storage_object_id OR z.version IS DISTINCT FROM wm.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
   WHERE u.id=wm.upload_id OR (u.bucket_id=web.bucket_id AND u.key=web.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part
   WHERE part.upload_id=wm.upload_id OR (part.bucket_id=web.bucket_id AND part.key=web.object_path))
  AND EXISTS(SELECT 1 FROM public.identities i WHERE i.id=a.identity_id AND i.status='active'
   AND ((i.type='private' AND i.user_id=p_user) OR (i.type='business' AND EXISTS(
    SELECT 1 FROM public.business_members bm WHERE bm.business_account_id=i.business_account_id
     AND bm.user_id=p_user AND bm.status='active'))))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.multipart_attempts ma ON ma.attempt_id=a.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN listing_publication_private.objects web ON web.attempt_id=a.id AND web.slot_id=s.id AND web.kind='web'
 JOIN listing_publication_private.web_images w ON w.attempt_id=a.id AND w.slot_id=s.id
 JOIN listing_publication_private.multipart_sessions wm ON wm.object_id=web.id
 WHERE o.id=p_object),false);
$f$;

-- Stable identity -> parent attempt -> origin -> canonical content -> image
-- locks close membership/access races before a SOURCE lease is issued. This
-- also permits recording an issued SOURCE result after the listing was removed.
CREATE FUNCTION listing_publication_private.lock_account_source_cleanup_context_v1(p_user uuid,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE origin_id uuid; target_identity uuid; root_id uuid; target_listing bigint; horse_id uuid;
BEGIN
 SELECT a.id,a.identity_id INTO origin_id,target_identity
 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE o.id=p_object AND o.kind='source' AND a.actor_user_id=p_user;
 IF NOT FOUND OR listing_publication_private.lock_account_upload_identity_v1(p_user,target_identity) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
 SELECT c.horse_offer_id INTO horse_id FROM horse_publication_private.commands c WHERE c.attempt_id=origin_id;
 IF FOUND THEN
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user
   AND a.identity_id=target_identity FOR SHARE;
  PERFORM 1 FROM public.horse_offers h WHERE h.id=horse_id AND h.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.horse_offer_images WHERE horse_offer_id=horse_id ORDER BY id FOR SHARE;
 ELSE
  SELECT listing_publication_private.managed_image_root_v1(origin_id) INTO root_id;
  IF root_id IS NULL THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=root_id AND a.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  IF root_id<>origin_id THEN
   PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user
    AND a.identity_id=target_identity FOR SHARE;
  END IF;
  SELECT p.listing_id INTO target_listing FROM listing_publication_private.publications p WHERE p.attempt_id=root_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.listings l WHERE l.id=target_listing FOR SHARE;
  PERFORM 1 FROM public.listing_images i WHERE i.listing_id=target_listing ORDER BY i.id FOR SHARE;
 END IF;
END $f$;

CREATE FUNCTION public.claim_listing_account_source_cleanup_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE candidate record; c listing_publication_private.cleanup%ROWTYPE; t timestamptz;
BEGIN
 PERFORM listing_publication_private.lock_account_upload_actor_v1(p_expected_user_id,p_expected_identity_id);
 t:=clock_timestamp();
 -- This worker selects only the verified account's own original SOURCE work.
 -- The caller cannot choose a different publisher, historical identity or WEB.
 FOR candidate IN
  SELECT o.id FROM listing_publication_private.objects o
  JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
  JOIN listing_publication_private.cleanup q ON q.object_id=o.id
  WHERE a.actor_user_id=p_expected_user_id AND o.kind='source' AND q.reason='published_source'
   AND listing_publication_private.object_cleanup_state(o.id)='pending'
   AND listing_publication_private.account_source_cleanup_eligible_v1(o.id,p_expected_user_id)
   AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
    OR (q.state='in_flight' AND q.lease_until<=t))
  ORDER BY q.enqueued_at,q.object_id LIMIT 20
 LOOP
  BEGIN
   PERFORM listing_publication_private.lock_account_source_cleanup_context_v1(p_expected_user_id,candidate.id);
  EXCEPTION WHEN SQLSTATE '42501' THEN CONTINUE;
  END;
  t:=clock_timestamp();
  SELECT q.* INTO c FROM listing_publication_private.cleanup q WHERE q.object_id=candidate.id
   AND listing_publication_private.account_source_cleanup_eligible_v1(q.object_id,p_expected_user_id)
   AND listing_publication_private.object_cleanup_state(q.object_id)='pending'
   AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t))
    OR (q.state='in_flight' AND q.lease_until<=t)) FOR UPDATE OF q SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  IF c.try_count>=8 THEN
   UPDATE listing_publication_private.cleanup SET state='needs_attention',last_error='lease_lost' WHERE object_id=c.object_id;
   CONTINUE;
  END IF;
  UPDATE listing_publication_private.cleanup SET state='in_flight',work_key=gen_random_uuid(),lease_until=t+interval '60 seconds',
   try_count=try_count+1,not_before=NULL,last_error=NULL WHERE object_id=c.object_id RETURNING * INTO c;
  RETURN jsonb_build_object('schema_version',1,'object_id',c.object_id,'work_key',c.work_key,'bucket_id',c.bucket_id,
   'object_path',c.object_path,'try_count',c.try_count,'lease_until_epoch',floor(extract(epoch FROM c.lease_until))::bigint);
 END LOOP;
 RETURN NULL;
END $f$;

CREATE FUNCTION public.record_listing_account_source_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE saved jsonb; cleanup_state text; session_problem text;
BEGIN
 PERFORM listing_publication_private.lock_account_upload_actor_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_publication_private.lock_account_source_cleanup_context_v1(p_expected_user_id,p_object_id);
 SELECT q.state,m.problem INTO cleanup_state,session_problem
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 WHERE o.id=p_object_id AND a.actor_user_id=p_expected_user_id AND o.kind='source' AND o.dispatch_key IS NULL
  AND q.reason='published_source' AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path AND q.work_key=p_work_key
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL FOR UPDATE OF q;
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_binding' USING ERRCODE='42501'; END IF;
 IF p_result='deleted' AND cleanup_state<>'deleted' AND session_problem IS NOT NULL THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 -- Existing recorder owns exact work-key, lease expiry, retry and idempotency.
 saved:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND listing_publication_private.hosted_completed_source_deleted_v1(p_object_id) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_source_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 RETURN saved;
END $f$;

-- COMPONENT 03_authority.sql
-- Helpers remain private; browser roles cannot allocate or perform account
-- housekeeping directly. Storage claims/results are service-only and run with
-- the existing ledger writer's scoped mutation authority.
REVOKE ALL ON FUNCTION
 listing_publication_private.upload_object_is_published_web_v1(uuid),
 listing_publication_private.pending_upload_reserved_bytes_v1(uuid),
 listing_publication_private.lock_account_upload_actor_v1(uuid,uuid),
 listing_publication_private.lock_account_upload_identity_v1(uuid,uuid),
 listing_publication_private.account_source_cleanup_eligible_v1(uuid,uuid),
 listing_publication_private.lock_account_source_cleanup_context_v1(uuid,uuid),
 public.claim_listing_account_source_cleanup_v1(uuid,uuid),
 public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION
 listing_publication_private.upload_object_is_published_web_v1(uuid),
 listing_publication_private.pending_upload_reserved_bytes_v1(uuid),
 listing_publication_private.lock_account_upload_actor_v1(uuid,uuid),
 listing_publication_private.lock_account_upload_identity_v1(uuid,uuid),
 listing_publication_private.account_source_cleanup_eligible_v1(uuid,uuid),
 listing_publication_private.lock_account_source_cleanup_context_v1(uuid,uuid)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION public.claim_listing_account_source_cleanup_v1(uuid,uuid),
 public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text) TO service_role;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.claim_listing_account_source_cleanup_v1(uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_listing_account_source_cleanup_v1(uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1;
