-- A public projection is valid only for the exact current event and gallery.
CREATE FUNCTION horse_publication_private.is_public(p_offer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.horse_offers h
  JOIN public.horse_offer_publication_events e ON e.id=h.current_publication_event_id
  WHERE h.id=p_offer AND h.status='published' AND h.published_at IS NOT NULL
   AND (h.active_until IS NULL OR h.active_until>statement_timestamp())
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

-- Ready is a durable DB receipt, but publication additionally checks exact live
-- provider metadata and absence of unresolved upload witnesses, like listings.
CREATE FUNCTION horse_publication_private.require_ready_image(p_attempt uuid,p_slot uuid)
RETURNS listing_publication_private.web_images LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE s listing_publication_private.slots%ROWTYPE; w listing_publication_private.web_images%ROWTYPE;
BEGIN
 SELECT * INTO s FROM listing_publication_private.slots WHERE id=p_slot AND attempt_id=p_attempt;
 SELECT * INTO w FROM listing_publication_private.web_images WHERE slot_id=p_slot AND attempt_id=p_attempt;
 IF s.id IS NULL OR w.id IS NULL OR w.state<>'ready' OR w.ready_id IS NULL OR w.ready_at IS NULL THEN
  RAISE EXCEPTION 'publication_images_not_ready' USING ERRCODE='55000'; END IF;
 PERFORM listing_publication_private.validate_managed_image_intent_v1(w.intent,s.id);
 IF (SELECT count(*) FROM listing_publication_private.objects WHERE slot_id=s.id)<>2
  OR EXISTS(SELECT 1 FROM listing_publication_private.objects o
   LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
   WHERE o.slot_id=s.id AND (o.attempt_id<>p_attempt OR o.dispatch_key IS NOT NULL
    OR m.id IS NULL OR m.provider_contract<>'supabase-s3-session-v1' OR m.state<>'completed'
    OR m.completed_at IS NULL OR m.verified_at IS NULL OR m.problem IS NOT NULL
    OR m.request_key IS DISTINCT FROM w.request_key OR m.storage_object_id IS NULL OR m.storage_version IS NULL
    OR m.observed_sha256 IS DISTINCT FROM CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END
    OR m.observed_bytes IS DISTINCT FROM CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END
    OR NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
     WHERE z.id=m.storage_object_id AND z.version=m.storage_version AND z.bucket_id=o.bucket_id AND z.name=o.object_path)
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
     WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u
     WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
    OR EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts q
     WHERE q.upload_id=m.upload_id OR (q.bucket_id=o.bucket_id AND q.key=o.object_path))
    OR EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=o.id))) THEN
  RAISE EXCEPTION 'publication_multipart_web_completion_required' USING ERRCODE='55000'; END IF;
 RETURN w;
END $f$;

-- This helper is owned by the retained final writer solely for the protected
-- attempt terminal transition. Its input cannot choose content or an outcome.
CREATE FUNCTION horse_publication_private.assert_actor(p_user uuid,p_identity uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
END $f$;

CREATE FUNCTION horse_publication_private.close_published_attempt(p_user uuid,p_identity uuid,p_attempt uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE c horse_publication_private.commands%ROWTYPE;
BEGIN
 PERFORM horse_publication_private.assert_actor(p_user,p_identity);
 SELECT * INTO c FROM horse_publication_private.commands
 WHERE attempt_id=p_attempt AND actor_user_id=p_user AND identity_id=p_identity;
 IF NOT FOUND OR c.state<>'published' OR NOT horse_publication_private.is_public(c.horse_offer_id) THEN
  RAISE EXCEPTION 'horse_offer_finality_invalid' USING ERRCODE='55000'; END IF;
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=clock_timestamp()
 WHERE id=p_attempt AND actor_user_id=p_user AND identity_id=p_identity AND state='open';
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000'; END IF;
END $f$;

CREATE FUNCTION public.publish_my_horse_offer_v1(
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
 IF h.status NOT IN('draft','published','paused') THEN
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
 UPDATE public.horse_offers SET current_publication_event_id=event_id,status='published',published_at=coalesce(published_at,t),
  active_until=CASE WHEN active_until IS NOT NULL AND active_until<=t THEN t+interval '90 days' ELSE active_until END,
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
