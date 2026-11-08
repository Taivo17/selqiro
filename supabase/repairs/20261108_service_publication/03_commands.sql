CREATE FUNCTION public.prepare_my_service_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_service_id uuid,p_expected_revision text,
 p_content jsonb,p_gallery jsonb,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c service_publication_private.commands%ROWTYPE;current public.services%ROWTYPE;proposed public.services%ROWTYPE;
 gallery jsonb;policies jsonb;fingerprint bytea;prior listing_publication_private.attempts%ROWTYPE;
 t timestamptz;reserved bigint;aid uuid;sid uuid;item record;new_count integer;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid
 OR (p_service_id IS NULL AND p_expected_revision IS NOT NULL)
 OR (p_service_id IS NOT NULL AND (p_expected_revision IS NULL OR p_expected_revision !~'^[1-9][0-9]{0,18}$'
 OR p_expected_revision::numeric>9223372036854775807))
 OR coalesce(p_content->>'serviceId','')<>coalesce(p_service_id::text,'') THEN
  RAISE EXCEPTION 'service_command_invalid' USING ERRCODE='22023';END IF;
 fingerprint:=sha256(convert_to('selqiro-service-publication-v1:'||jsonb_build_object('service',p_service_id,
 'revision',p_expected_revision,'content',p_content,'gallery',p_gallery,'policies',p_policy_snapshot)::text,'UTF8'));
 SELECT * INTO prior FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO c FROM service_publication_private.commands WHERE attempt_id=prior.id;
  IF NOT FOUND OR prior.identity_id IS DISTINCT FROM p_expected_identity_id OR prior.intent_sha256 IS DISTINCT FROM fingerprint THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023';END IF;
  RETURN service_publication_private.snapshot(prior.id);
 END IF;
 IF EXISTS(SELECT 1 FROM service_publication_private.closed_requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key)
 OR EXISTS(SELECT 1 FROM horse_publication_private.closed_requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key)
 OR EXISTS(SELECT 1 FROM listing_publication_private.closed_journey_requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key) THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';END IF;
 IF p_service_id IS NOT NULL THEN
  SELECT * INTO current FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
  IF current.edit_revision::text IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION 'service_edit_conflict' USING ERRCODE='40001';END IF;
 END IF;
 proposed:=service_publication_private.normalize_content(current,p_content);
 gallery:=service_publication_private.normalize_gallery(p_service_id,p_expected_identity_id,p_gallery);
 policies:=service_publication_private.accept_shown_policies(p_expected_user_id,p_expected_identity_id,p_policy_snapshot);
 t:=clock_timestamp();
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND state='open' AND expires_at>t)>=3 THEN
  RAISE EXCEPTION 'publication_open_attempt_limit' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '24 hours')>=20 THEN
  RAISE EXCEPTION 'publication_daily_attempt_limit' USING ERRCODE='54000';END IF;
 SELECT count(*) INTO new_count FROM jsonb_array_elements(gallery) x WHERE x ? 'clientFileId';
 reserved:=listing_publication_private.pending_upload_reserved_bytes_v1(p_expected_user_id);
 IF new_count>0 AND reserved+new_count::bigint*(26214400+4194304)>314572800 THEN
  RAISE EXCEPTION 'publication_retained_bytes_limit' USING ERRCODE='54000';END IF;
 IF p_service_id IS NULL THEN
  INSERT INTO public.services(identity_id,title,description,category,subcategory,price_amount,price_type,currency,country,city,location,status,sort_order)
  VALUES(p_expected_identity_id,proposed.title,proposed.description,proposed.category,proposed.subcategory,proposed.price_amount,
  proposed.price_type,proposed.currency,proposed.country,proposed.city,proposed.location,'draft',
  coalesce((SELECT max(sort_order)+1 FROM public.services WHERE identity_id=p_expected_identity_id),0)) RETURNING * INTO current;
 END IF;
 INSERT INTO listing_publication_private.attempts(actor_user_id,identity_id,request_key,intent_sha256,payload,policy_snapshot,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key,fingerprint,jsonb_build_object('purpose','service_publication','service_id',current.id),
 policies,t,t+interval '24 hours') RETURNING id INTO aid;
 INSERT INTO service_publication_private.commands(attempt_id,service_id,actor_user_id,identity_id,request_key,base_revision,proposed_content,gallery_intent)
 VALUES(aid,current.id,p_expected_user_id,p_expected_identity_id,p_request_key,current.edit_revision,to_jsonb(proposed),gallery);
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements(gallery) WITH ORDINALITY LOOP
  IF NOT(item.value ? 'clientFileId') THEN CONTINUE;END IF;
  INSERT INTO listing_publication_private.slots(attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
  VALUES(aid,item.ordinality-1,(item.value->>'clientFileId')::uuid,(item.value->>'byteLength')::integer,decode(item.value->>'sha256','hex')) RETURNING id INTO sid;
  INSERT INTO listing_publication_private.objects(attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
  VALUES(aid,sid,'source','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/source.upload',26214400),
  (aid,sid,'web','listing-publication-private','v1/'||aid::text||'/'||sid::text||'/web-v1.webp',4194304);
 END LOOP;
 IF service_publication_private.require_policies() IS DISTINCT FROM policies THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';END IF;
 RETURN service_publication_private.snapshot(aid);
END $f$;

CREATE FUNCTION service_publication_private.attempt_publication_matches(p_attempt uuid,p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM service_publication_private.commands c JOIN public.services s ON s.id=c.service_id
 JOIN service_publication_private.heads h ON h.service_id=s.id AND h.event_id=c.publication_event_id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id
 WHERE c.attempt_id=p_attempt AND c.actor_user_id=p_user AND c.identity_id=p_identity AND c.state='published'
 AND s.identity_id=p_identity AND e.service_id=s.id AND e.identity_id=p_identity AND e.actor_user_id=p_user
 AND e.submission_key=p_attempt AND service_publication_private.has_current_publication(s.id));
$f$;
CREATE FUNCTION service_publication_private.assert_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN PERFORM listing_publication_private.require_actor(p_user,p_identity);END $f$;
CREATE FUNCTION service_publication_private.close_published_attempt(p_user uuid,p_identity uuid,p_attempt uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM service_publication_private.assert_actor(p_user,p_identity);
 IF NOT service_publication_private.attempt_publication_matches(p_attempt,p_user,p_identity) THEN
  RAISE EXCEPTION 'service_finality_invalid' USING ERRCODE='55000';END IF;
 UPDATE listing_publication_private.attempts SET state='published',payload=NULL,closed_at=clock_timestamp()
 WHERE id=p_attempt AND actor_user_id=p_user AND identity_id=p_identity AND state='open';
 IF NOT FOUND THEN RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';END IF;
END $f$;

CREATE FUNCTION public.publish_my_service_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE a listing_publication_private.attempts%ROWTYPE;c service_publication_private.commands%ROWTYPE;
 h public.services%ROWTYPE;n public.services%ROWTYPE;w listing_publication_private.web_images%ROWTYPE;
 s listing_publication_private.slots%ROWTYPE;o listing_publication_private.objects%ROWTYPE;
 item record;new_image uuid;primary_url text;content jsonb;event_id uuid;policy jsonb;had_images boolean;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO a FROM listing_publication_private.attempts WHERE id=p_attempt_id AND actor_user_id=p_expected_user_id
 AND identity_id=p_expected_identity_id AND request_key=p_request_key FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_attempt_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM service_publication_private.commands WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_attempt_unavailable' USING ERRCODE='42501';END IF;
 IF c.state='published' THEN RETURN service_publication_private.snapshot(a.id);END IF;
 IF c.state<>'prepared' OR a.state<>'open' OR a.expires_at<=clock_timestamp() THEN
  RAISE EXCEPTION 'publication_attempt_closed' USING ERRCODE='55000';END IF;
 SELECT * INTO h FROM public.services WHERE id=c.service_id AND identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 IF h.edit_revision<>c.base_revision THEN RAISE EXCEPTION 'service_edit_conflict' USING ERRCODE='40001';END IF;
 policy:=service_publication_private.require_policies();
 IF policy IS DISTINCT FROM a.policy_snapshot THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';END IF;
 PERFORM service_publication_private.normalize_gallery(h.id,h.identity_id,c.gallery_intent);
 FOR s IN SELECT * FROM listing_publication_private.slots WHERE attempt_id=a.id ORDER BY ordinal LOOP
  IF c.gallery_intent->s.ordinal->>'clientFileId' IS DISTINCT FROM s.client_file_id::text THEN
   RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='55000';END IF;
  PERFORM service_publication_private.require_ready_image(a.id,s.id);
 END LOOP;
 n:=jsonb_populate_record(NULL::public.services,c.proposed_content);
 IF NOT public.is_valid_service_category_pair_v2(n.category,n.subcategory)
 AND NOT(n.category IS NOT DISTINCT FROM h.category AND n.subcategory IS NOT DISTINCT FROM h.subcategory) THEN RAISE EXCEPTION 'service_category_invalid' USING ERRCODE='22023';END IF;
 SELECT EXISTS(SELECT 1 FROM public.service_images WHERE service_id=h.id) INTO had_images;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT x.id,x.bucket_id,x.object_path,'published_image_removed',listing_publication_private.object_cleanup_state(x.id),clock_timestamp()
 FROM service_publication_private.gallery g JOIN listing_publication_private.objects x ON x.id=g.object_id
 WHERE g.service_id=h.id AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.gallery_intent) x WHERE x->>'imageId'=g.image_id::text)
 ON CONFLICT(object_id) DO NOTHING;
 -- Legacy objects are retained. Only membership explicitly omitted by this
 -- complete gallery intent is removed; managed objects receive durable cleanup.
 DELETE FROM public.service_images i WHERE i.service_id=h.id
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(c.gallery_intent) x WHERE x->>'imageId'=i.id::text);
 UPDATE public.service_images SET is_primary=false WHERE service_id=h.id AND is_primary;
 FOR item IN SELECT value,ordinality FROM jsonb_array_elements(c.gallery_intent) WITH ORDINALITY LOOP
  IF item.value ? 'imageId' THEN
   UPDATE public.service_images SET sort_order=item.ordinality-1,is_primary=(item.value->>'isPrimary')::boolean
   WHERE id=(item.value->>'imageId')::uuid AND service_id=h.id AND identity_id=h.identity_id;
  ELSE
   SELECT * INTO s FROM listing_publication_private.slots WHERE attempt_id=a.id AND ordinal=item.ordinality-1;
   SELECT * INTO w FROM listing_publication_private.web_images WHERE slot_id=s.id AND attempt_id=a.id;
   SELECT * INTO o FROM listing_publication_private.objects WHERE slot_id=s.id AND kind='web';
   primary_url:='/api/v2/service-media/'||a.id::text||'/'||s.ordinal::text;
   INSERT INTO public.service_images(service_id,identity_id,uploaded_by_user_id,original_url,medium_url,thumb_url,storage_path,sort_order,is_primary)
   VALUES(h.id,h.identity_id,p_expected_user_id,primary_url,primary_url,primary_url,o.object_path,item.ordinality-1,
   (item.value->>'isPrimary')::boolean) RETURNING id INTO new_image;
   INSERT INTO service_publication_private.gallery(image_id,service_id,attempt_id,slot_id,object_id,ready_id,web_sha256,web_bytes)
   VALUES(new_image,h.id,a.id,s.id,o.id,w.ready_id,decode(w.intent->>'web_sha256','hex'),(w.intent->>'web_bytes')::integer);
  END IF;
 END LOOP;
 SELECT coalesce(medium_url,original_url,thumb_url) INTO primary_url FROM public.service_images WHERE service_id=h.id AND is_primary;
 IF primary_url IS NULL AND NOT had_images AND jsonb_array_length(c.gallery_intent)=0 THEN primary_url:=h.image_url;END IF;
 UPDATE public.services SET title=n.title,description=n.description,category=n.category,subcategory=n.subcategory,
 price_amount=n.price_amount,price_type=n.price_type,currency=n.currency,country=n.country,city=n.city,location=n.location,image_url=primary_url,
 status=CASE WHEN h.status='draft' THEN 'published' ELSE h.status END,published_at=coalesce(h.published_at,clock_timestamp())
 WHERE id=h.id AND identity_id=h.identity_id AND edit_revision=c.base_revision RETURNING * INTO h;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_edit_conflict' USING ERRCODE='40001';END IF;
 content:=service_publication_private.content_snapshot(h.id);
 INSERT INTO service_publication_private.events(service_id,identity_id,actor_user_id,submission_key,content_snapshot,content_hash,policy_snapshot)
 VALUES(h.id,h.identity_id,p_expected_user_id,a.id,content,encode(sha256(convert_to(content::text,'UTF8')),'hex'),policy) RETURNING id INTO event_id;
 INSERT INTO service_publication_private.heads(service_id,event_id) VALUES(h.id,event_id) ON CONFLICT(service_id) DO UPDATE SET event_id=excluded.event_id;
 UPDATE service_publication_private.commands SET state='published',publication_event_id=event_id,published_revision=h.edit_revision WHERE attempt_id=a.id;
 INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
 SELECT id,bucket_id,object_path,'published_source',listing_publication_private.object_cleanup_state(id),clock_timestamp()
 FROM listing_publication_private.objects WHERE attempt_id=a.id AND kind='source' ON CONFLICT(object_id) DO NOTHING;
 PERFORM service_publication_private.close_published_attempt(p_expected_user_id,p_expected_identity_id,a.id);
 RETURN service_publication_private.snapshot(a.id);
END $f$;
