-- COMPONENT 01_lifecycle_core.sql
-- Exactly 90 * 24 hours, independent of session timezone or daylight saving.
-- Legacy NULL deadlines derive from original publication; no bulk row rewrite.
CREATE FUNCTION horse_publication_private.effective_active_until(h public.horse_offers)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(h.active_until,h.published_at+interval '2160 hours');
$f$;

CREATE FUNCTION horse_publication_private.has_current_publication(p_offer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.horse_offers h
  JOIN public.horse_offer_publication_events e ON e.id=h.current_publication_event_id
  WHERE h.id=p_offer AND h.published_at IS NOT NULL
   AND e.horse_offer_id=h.id AND e.identity_id=h.identity_id AND e.decision='published'
   AND e.content_snapshot=public.build_horse_offer_content_snapshot_v1(h.id)
   AND e.content_hash=encode(sha256(convert_to(e.content_snapshot::text,'UTF8')),'hex')
   AND NOT EXISTS(SELECT 1 FROM public.horse_offer_images i
    LEFT JOIN horse_publication_private.gallery g ON g.image_id=i.id
    LEFT JOIN listing_publication_private.web_images w ON w.slot_id=g.slot_id AND w.attempt_id=g.attempt_id
    WHERE i.horse_offer_id=h.id AND (g.image_id IS NULL OR g.horse_offer_id<>h.id OR i.identity_id<>h.identity_id
     OR w.state IS DISTINCT FROM 'ready' OR w.ready_id IS DISTINCT FROM g.ready_id
     OR EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=g.object_id))));
$f$;

-- Publication finality and public visibility are separate. Saving a paused,
-- sold or expired offer must not publish it or silently extend its activity.
CREATE OR REPLACE FUNCTION horse_publication_private.is_public(p_offer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.horse_offers h
  WHERE h.id=p_offer AND h.status='published'
   AND isfinite(horse_publication_private.effective_active_until(h))
   AND horse_publication_private.effective_active_until(h)>statement_timestamp()
   AND horse_publication_private.has_current_publication(h.id));
$f$;

CREATE OR REPLACE FUNCTION horse_publication_private.close_published_attempt(p_user uuid,p_identity uuid,p_attempt uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE c horse_publication_private.commands%ROWTYPE;
BEGIN
 PERFORM horse_publication_private.assert_actor(p_user,p_identity);
 SELECT * INTO c FROM horse_publication_private.commands
 WHERE attempt_id=p_attempt AND actor_user_id=p_user AND identity_id=p_identity;
 IF NOT FOUND OR c.state<>'published' OR NOT horse_publication_private.has_current_publication(c.horse_offer_id)
  OR NOT EXISTS(SELECT 1 FROM public.horse_offers h WHERE h.id=c.horse_offer_id
   AND h.status IN('published','paused','closed')) THEN
  RAISE EXCEPTION 'horse_offer_finality_invalid' USING ERRCODE='55000'; END IF;
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=clock_timestamp()
 WHERE id=p_attempt AND actor_user_id=p_user AND identity_id=p_identity AND state='open';
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION horse_publication_private.attempt_publication_matches(p_attempt uuid,p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM horse_publication_private.commands c
  JOIN public.horse_offers h ON h.id=c.horse_offer_id
  JOIN public.horse_offer_publication_events e ON e.id=c.publication_event_id
  WHERE c.attempt_id=p_attempt AND c.actor_user_id=p_user AND c.identity_id=p_identity
   AND c.state='published' AND c.publication_event_id=h.current_publication_event_id
   AND h.identity_id=p_identity AND h.status IN('published','paused','closed') AND e.horse_offer_id=h.id
   AND e.identity_id=p_identity AND e.actor_user_id=p_user AND e.submission_key=p_attempt
   AND e.decision='published' AND horse_publication_private.has_current_publication(h.id));
$f$;

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
  IF current.status NOT IN('draft','published','paused','closed') THEN
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

CREATE OR REPLACE FUNCTION public.publish_my_horse_offer_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE; c horse_publication_private.commands%ROWTYPE;
 h public.horse_offers%ROWTYPE; n public.horse_offers%ROWTYPE; w listing_publication_private.web_images%ROWTYPE;
 s listing_publication_private.slots%ROWTYPE; web_object listing_publication_private.objects%ROWTYPE;
 item record; new_image uuid; primary_url text; content jsonb; event_id uuid; t timestamptz;
 general public.publication_policy_documents%ROWTYPE; horse public.publication_policy_documents%ROWTYPE;
 general_acceptance uuid; horse_acceptance uuid; policy jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_attempt_id IS NULL OR p_request_key IS NULL THEN
  RAISE EXCEPTION 'horse_offer_command_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt_id
  AND actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM horse_publication_private.commands WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_attempt_unavailable' USING ERRCODE='42501'; END IF;
 IF c.state='published' THEN RETURN horse_publication_private.snapshot(a.id); END IF;
 IF c.state<>'prepared' OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 SELECT * INTO h FROM public.horse_offers WHERE id=c.horse_offer_id AND identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 IF h.edit_revision<>c.base_revision THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
 IF h.status NOT IN('draft','published','paused','closed') THEN
  RAISE EXCEPTION 'horse_offer_status_not_editable' USING ERRCODE='55000'; END IF;
 policy:=horse_publication_private.require_policies();
 IF policy IS DISTINCT FROM a.policy_snapshot THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 PERFORM horse_publication_private.confirmations(h.offer_type,c.confirmation_snapshot);
 PERFORM horse_publication_private.normalize_gallery(h.id,h.identity_id,c.gallery_intent);
 IF (SELECT count(*) FROM listing_publication_private.slots WHERE attempt_id=a.id)<>
  (SELECT count(*) FROM jsonb_array_elements(c.gallery_intent) x WHERE x ? 'clientFileId') THEN
  RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='55000'; END IF;
 -- All new images must be proven before any canonical content or membership moves.
 FOR s IN SELECT * FROM listing_publication_private.slots WHERE attempt_id=a.id ORDER BY ordinal LOOP
  IF c.gallery_intent->s.ordinal->>'clientFileId' IS DISTINCT FROM s.client_file_id::text THEN
   RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='55000'; END IF;
  PERFORM horse_publication_private.require_ready_image(a.id,s.id);
 END LOOP;
 n:=jsonb_populate_record(NULL::public.horse_offers,c.proposed_content);
 IF n.offer_type IS DISTINCT FROM h.offer_type OR n.market_country_code IS DISTINCT FROM 'EE'
  OR n.horse_location_country_code IS DISTINCT FROM 'EE' OR n.currency IS DISTINCT FROM 'EUR' THEN
  RAISE EXCEPTION 'horse_offer_content_invalid' USING ERRCODE='55000'; END IF;
 -- Retire only explicitly omitted images. Their immutable object lineage survives.
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_image_removed',listing_publication_private.object_cleanup_state(o.id),clock_timestamp()
 FROM horse_publication_private.gallery g JOIN listing_publication_private.objects o ON o.id=g.object_id
 WHERE g.horse_offer_id=h.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.gallery_intent) x WHERE x->>'imageId'=g.image_id::text)
 ON CONFLICT(object_id) DO NOTHING;
 DELETE FROM public.horse_offer_images i WHERE i.horse_offer_id=h.id
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.gallery_intent) x WHERE x->>'imageId'=i.id::text);
 UPDATE public.horse_offer_images SET is_primary=false WHERE horse_offer_id=h.id AND is_primary;
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements(c.gallery_intent) WITH ORDINALITY LOOP
  IF item.value ? 'imageId' THEN
   UPDATE public.horse_offer_images SET sort_order=item.ordinality-1,is_primary=(item.value->>'isPrimary')::boolean
   WHERE id=(item.value->>'imageId')::uuid AND horse_offer_id=h.id;
  ELSE
   SELECT * INTO s FROM listing_publication_private.slots WHERE attempt_id=a.id AND ordinal=item.ordinality-1;
   SELECT * INTO w FROM listing_publication_private.web_images WHERE slot_id=s.id AND attempt_id=a.id;
   SELECT * INTO web_object FROM listing_publication_private.objects WHERE slot_id=s.id AND kind='web';
   primary_url:='/api/v2/horse-media/'||a.id::text||'/'||s.ordinal::text;
   INSERT INTO public.horse_offer_images(horse_offer_id,identity_id,uploaded_by_user_id,original_url,medium_url,thumb_url,
    storage_path,sort_order,is_primary)
   VALUES(h.id,h.identity_id,p_expected_user_id,primary_url,primary_url,primary_url,web_object.object_path,item.ordinality-1,
    (item.value->>'isPrimary')::boolean) RETURNING id INTO new_image;
   INSERT INTO horse_publication_private.gallery(image_id,horse_offer_id,attempt_id,slot_id,object_id,ready_id,web_sha256,web_bytes)
   VALUES(new_image,h.id,a.id,s.id,web_object.id,w.ready_id,decode(w.intent->>'web_sha256','hex'),(w.intent->>'web_bytes')::integer);
  END IF;
 END LOOP;
 SELECT original_url INTO primary_url FROM public.horse_offer_images WHERE horse_offer_id=h.id AND is_primary;
 UPDATE public.horse_offers SET title=n.title,description=n.description,price_amount=n.price_amount,price_type=n.price_type,
  horse_name=n.horse_name,birth_year=n.birth_year,sex=n.sex,breed=n.breed,color=n.color,height_cm=n.height_cm,
  discipline=n.discipline,training_level=n.training_level,suitability=n.suitability,health_notes=n.health_notes,
  behavior_notes=n.behavior_notes,city=n.city,region=n.region,details=n.details,image_url=primary_url,updated_by_user_id=p_expected_user_id
 WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=c.base_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
 SELECT p.* INTO general FROM public.publication_policy_documents p
  JOIN jsonb_array_elements(policy) x ON p.id=(x->>'document_id')::uuid WHERE p.policy_key='marketplace-general';
 SELECT p.* INTO horse FROM public.publication_policy_documents p
  JOIN jsonb_array_elements(policy) x ON p.id=(x->>'document_id')::uuid WHERE p.policy_key='horse-offer-ee';
 SELECT id INTO general_acceptance FROM public.user_publication_policy_acceptances
  WHERE user_id=p_expected_user_id AND policy_document_id=general.id AND content_hash=general.content_hash;
 SELECT id INTO horse_acceptance FROM public.user_publication_policy_acceptances
  WHERE user_id=p_expected_user_id AND policy_document_id=horse.id AND content_hash=horse.content_hash;
 content:=public.build_horse_offer_content_snapshot_v1(h.id); t:=clock_timestamp();
 INSERT INTO public.horse_offer_publication_events(horse_offer_id,identity_id,actor_user_id,submission_key,decision,
  general_policy_document_id,general_policy_version,general_policy_content_hash,general_acceptance_id,
  horse_policy_document_id,horse_policy_version,horse_policy_content_hash,horse_acceptance_id,
  confirmation_snapshot,content_snapshot,content_hash,risk_signals)
 VALUES(h.id,h.identity_id,p_expected_user_id,a.id,'published',general.id,general.policy_version,general.content_hash,general_acceptance,
  horse.id,horse.policy_version,horse.content_hash,horse_acceptance,c.confirmation_snapshot,content,
  encode(sha256(convert_to(content::text,'UTF8')),'hex'),'{}') RETURNING id INTO event_id;
 UPDATE public.horse_offers SET current_publication_event_id=event_id,
  status=CASE WHEN h.status='draft' THEN 'published' ELSE h.status END,published_at=coalesce(h.published_at,t),
  active_until=CASE WHEN h.published_at IS NULL THEN t+interval '2160 hours'
   ELSE horse_publication_private.effective_active_until(h) END,
  updated_by_user_id=p_expected_user_id WHERE id=h.id RETURNING * INTO h;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT o.id,o.bucket_id,o.object_path,'published_source',listing_publication_private.object_cleanup_state(o.id),t
 FROM listing_publication_private.objects o WHERE o.attempt_id=a.id AND o.kind='source';
 IF a.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
 IF horse_publication_private.require_policies() IS DISTINCT FROM policy THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 UPDATE horse_publication_private.commands SET state='published',publication_event_id=event_id,published_revision=h.edit_revision WHERE attempt_id=a.id;
 PERFORM horse_publication_private.close_published_attempt(p_expected_user_id,p_expected_identity_id,a.id);
 RETURN horse_publication_private.snapshot(a.id);
END $f$;

-- COMPONENT 02_owner_actions.sql
-- The existing edit revision advances on every canonical horse UPDATE. These
-- owner actions use that same revision, so a prepared content edit cannot undo
-- a later pause, sale or renewal, and an uncertain write is never replayed.
CREATE FUNCTION horse_publication_private.lifecycle_snapshot(
 p_offer uuid,p_user uuid,p_identity uuid,p_changed boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
DECLARE h public.horse_offers%ROWTYPE; deadline timestamptz;
BEGIN
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer AND identity_id=p_identity;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 deadline:=horse_publication_private.effective_active_until(h);
 IF deadline IS NOT NULL AND NOT isfinite(deadline) THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','horse_offer','content_id',h.id,
  'actor_user_id',p_user,'identity_id',h.identity_id,'source_status',h.status,
  'status',CASE h.status WHEN 'published' THEN 'active' WHEN 'paused' THEN 'paused' WHEN 'closed' THEN 'sold' ELSE NULL END,
  'active_until',deadline,'edit_revision',h.edit_revision::text,'changed',p_changed);
END $f$;

CREATE FUNCTION public.get_my_horse_offer_lifecycle_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_offer_id IS NULL THEN RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 RETURN horse_publication_private.lifecycle_snapshot(p_offer_id,p_expected_user_id,p_expected_identity_id,false);
END $f$;

CREATE FUNCTION horse_publication_private.lock_lifecycle(
 p_user uuid,p_identity uuid,p_offer uuid,p_revision bigint,p_status text,p_until timestamptz)
RETURNS public.horse_offers LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE;
BEGIN
 -- Profile, identity and membership lock order is shared with publication.
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 IF p_offer IS NULL OR p_revision IS NULL OR p_revision<1 OR p_status IS NULL
  OR p_status NOT IN('published','paused','closed') OR p_until IS NULL OR NOT isfinite(p_until) THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO h FROM public.horse_offers WHERE id=p_offer AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 IF h.edit_revision IS DISTINCT FROM p_revision OR h.status IS DISTINCT FROM p_status
  OR horse_publication_private.effective_active_until(h) IS DISTINCT FROM p_until THEN
  RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
 IF h.status NOT IN('published','paused','closed')
  OR NOT horse_publication_private.has_current_publication(h.id) THEN
  RAISE EXCEPTION 'horse_offer_activity_unavailable' USING ERRCODE='55000'; END IF;
 RETURN h;
END $f$;

CREATE FUNCTION public.set_my_horse_offer_status_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid,
 p_expected_revision bigint,p_expected_status text,p_expected_active_until timestamptz,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE; target text; changed boolean:=false; t timestamptz;
BEGIN
 IF p_status IS NULL OR p_status NOT IN('active','paused','sold') THEN
  RAISE EXCEPTION 'horse_offer_activity_invalid' USING ERRCODE='22023'; END IF;
 h:=horse_publication_private.lock_lifecycle(p_expected_user_id,p_expected_identity_id,p_offer_id,
  p_expected_revision,p_expected_status,p_expected_active_until);
 target:=CASE p_status WHEN 'active' THEN 'published' WHEN 'paused' THEN 'paused' WHEN 'sold' THEN 'closed' END;
 IF h.status IS DISTINCT FROM target THEN
  -- No duration, content, gallery, policy acceptance or publication event changes.
  t:=clock_timestamp();
  UPDATE public.horse_offers SET status=target,
   paused_at=CASE WHEN target='paused' THEN t ELSE NULL END,
   closed_at=CASE WHEN target='closed' THEN t ELSE NULL END,updated_by_user_id=p_expected_user_id
   WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
  changed:=true;
 END IF;
 RETURN horse_publication_private.lifecycle_snapshot(h.id,p_expected_user_id,p_expected_identity_id,changed);
END $f$;

CREATE FUNCTION public.renew_my_horse_offer_activity_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid,
 p_expected_revision bigint,p_expected_status text,p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE h public.horse_offers%ROWTYPE; deadline timestamptz; changed boolean:=false;
BEGIN
 h:=horse_publication_private.lock_lifecycle(p_expected_user_id,p_expected_identity_id,p_offer_id,
  p_expected_revision,p_expected_status,p_expected_active_until);
 IF h.status<>'published' THEN
  RAISE EXCEPTION 'horse_offer_activity_active_status_required' USING ERRCODE='55000'; END IF;
 -- Explicit free renewal, using server time. Status selection and editing never
 -- run this action. Preserve a longer existing period, as ordinary listings do.
 deadline:=clock_timestamp()+interval '2160 hours';
 IF horse_publication_private.effective_active_until(h)<deadline THEN
  UPDATE public.horse_offers SET active_until=deadline,updated_by_user_id=p_expected_user_id
   WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=p_expected_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_edit_conflict' USING ERRCODE='40001'; END IF;
  changed:=true;
 END IF;
 RETURN horse_publication_private.lifecycle_snapshot(h.id,p_expected_user_id,p_expected_identity_id,changed);
END $f$;

-- COMPONENT 03_authority.sql
-- Retained functions keep their owner, EXECUTE grants and execution settings.
-- New owner commands are authenticated-only; they bind the active identity in
-- the same database transaction. No direct table or private-schema grants.
REVOKE ALL ON FUNCTION
 horse_publication_private.effective_active_until(public.horse_offers),
 horse_publication_private.has_current_publication(uuid),
 horse_publication_private.lifecycle_snapshot(uuid,uuid,uuid,boolean),
 horse_publication_private.lock_lifecycle(uuid,uuid,uuid,bigint,text,timestamptz),
 public.get_my_horse_offer_lifecycle_v1(uuid,uuid,uuid),
 public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text),
 public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION horse_publication_private.has_current_publication(uuid)
 TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION
 public.get_my_horse_offer_lifecycle_v1(uuid,uuid,uuid),
 public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text),
 public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz)
 TO authenticated;

COMMENT ON FUNCTION public.set_my_horse_offer_status_v1(uuid,uuid,uuid,bigint,text,timestamptz,text) IS
 'Explicit owner lifecycle selection for a canonical published horse offer. Active identity plus source status, effective deadline and edit revision CAS. Does not change deadline or publish content; stale and uncertain writes are not replayed.';
COMMENT ON FUNCTION public.renew_my_horse_offer_activity_v1(uuid,uuid,uuid,bigint,text,timestamptz) IS
 'Explicit owner renewal of an active-status canonical horse offer for 90 * 24 hours from server time. Finite deadline, identity and revision CAS, no silent reactivation, no content/gallery/policy mutation.';
