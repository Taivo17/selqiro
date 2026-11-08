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
