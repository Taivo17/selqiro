CREATE FUNCTION horse_publication_private.normalize_content(p_existing public.horse_offers,p_content jsonb)
RETURNS public.horse_offers LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE n public.horse_offers:=p_existing; typ text; item record; target text; patch jsonb:='{}';
 mappings constant jsonb:='{"title":"title","description":"description","priceAmount":"price_amount","priceType":"price_type",
 "horseName":"horse_name","birthYear":"birth_year","sex":"sex","breed":"breed","color":"color","heightCm":"height_cm",
 "discipline":"discipline","trainingLevel":"training_level","suitability":"suitability","healthNotes":"health_notes",
 "behaviorNotes":"behavior_notes","city":"city","region":"region","recurringFeePeriod":"recurring_fee_period",
 "wantedPreferredSex":"wanted_preferred_sex","wantedPreferredBreed":"wanted_preferred_breed",
 "wantedPreferredDiscipline":"wanted_preferred_discipline","wantedPreferredTrainingLevel":"wanted_preferred_training_level",
 "wantedIntendedUse":"wanted_intended_use","wantedHealthPreferences":"wanted_health_preferences",
 "wantedBehaviorPreferences":"wanted_behavior_preferences","wantedBudgetMode":"wanted_budget_mode",
 "wantedBudgetAmount":"wanted_budget_amount","wantedCity":"wanted_city","wantedRegion":"wanted_region"}'::jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR octet_length(p_content::text)>65536 THEN
  RAISE EXCEPTION 'horse_offer_content_invalid' USING ERRCODE='22023'; END IF;
 typ:=p_content->>'offerType';
 IF typ IS NULL OR typ NOT IN('sale','free_transfer','lease','co_rider','wanted')
  OR p_content->>'marketCountryCode' IS DISTINCT FROM 'EE'
  OR p_content->>'horseLocationCountryCode' IS DISTINCT FROM 'EE'
  OR p_content->>'currency' IS DISTINCT FROM 'EUR'
  OR NOT(p_content ?& ARRAY['title','description']) THEN
  RAISE EXCEPTION 'horse_offer_content_invalid' USING ERRCODE='22023'; END IF;
 IF n.id IS NOT NULL AND n.offer_type IS DISTINCT FROM typ THEN
  RAISE EXCEPTION 'horse_offer_type_immutable' USING ERRCODE='22023'; END IF;
 IF n.id IS NULL THEN
  n.offer_type:=typ; n.status:='draft'; n.market_country_code:='EE'; n.horse_location_country_code:='EE'; n.currency:='EUR';
  n.title:=''; n.description:=''; n.price_type:=CASE WHEN typ='free_transfer' THEN 'free' ELSE 'contact' END;
  n.details:=CASE WHEN typ='wanted' THEN
   '{"schema_version":1,"branch":"wanted","wanted":{"budget":{"mode":"contact","currency":"EUR"},"search_area":{"country_code":"EE"}}}'::jsonb
   ELSE '{"schema_version":1,"branch":"specific"}'::jsonb END;
  IF typ IN('lease','co_rider') THEN n.details:=n.details||'{"recurring_fee":{"period":"agreed_period"}}'::jsonb; END IF;
 END IF;
 FOR item IN SELECT key,value FROM jsonb_each(p_content) LOOP
  IF item.key=ANY(ARRAY['offerType','marketCountryCode','horseLocationCountryCode','currency','offerId']) THEN CONTINUE; END IF;
  IF item.key=ANY(ARRAY['locationText','horseLat','horseLng']) THEN
   IF item.value<>'null'::jsonb THEN RAISE EXCEPTION 'horse_offer_private_location_not_supported' USING ERRCODE='22023'; END IF;
   CONTINUE;
  END IF;
  target:=mappings->>item.key;
  IF target IS NULL THEN RAISE EXCEPTION 'horse_offer_content_field_invalid' USING ERRCODE='22023'; END IF;
  IF (typ='wanted' AND NOT(target IN('title','description') OR target LIKE 'wanted\_%' ESCAPE '\'))
   OR (typ<>'wanted' AND target LIKE 'wanted\_%' ESCAPE '\')
   OR (typ NOT IN('lease','co_rider') AND target='recurring_fee_period') THEN
   IF item.value<>'null'::jsonb AND NOT(target='wanted_budget_mode' AND item.value='"contact"'::jsonb)
    AND NOT(typ='wanted' AND target='price_type' AND item.value='"contact"'::jsonb) THEN
    RAISE EXCEPTION 'horse_offer_content_branch_invalid' USING ERRCODE='22023'; END IF;
   CONTINUE;
  END IF;
  patch:=patch||jsonb_build_object(target,item.value);
 END LOOP;
 n:=public.apply_horse_offer_draft_patch_v1(n,patch);
 IF length(btrim(n.title)) NOT BETWEEN 2 AND 140 OR length(btrim(n.description)) NOT BETWEEN 1 AND 5000
  OR length(n.horse_name)>160 OR length(n.breed)>160 OR length(n.color)>120 OR length(n.discipline)>240
  OR length(n.training_level)>500 OR length(n.suitability)>2000 OR length(n.health_notes)>3000
  OR length(n.behavior_notes)>3000 OR length(n.city)>160 OR length(n.region)>160 THEN
  RAISE EXCEPTION 'horse_offer_content_incomplete' USING ERRCODE='22023'; END IF;
 IF (typ='free_transfer' AND (n.price_type<>'free' OR n.price_amount IS NOT NULL))
  OR (typ<>'free_transfer' AND NOT((n.price_type='contact' AND n.price_amount IS NULL)
   OR (n.price_type IN('fixed','from') AND n.price_amount IS NOT NULL))) THEN
  RAISE EXCEPTION 'horse_offer_price_invalid' USING ERRCODE='22023'; END IF;
 RETURN n;
END $f$;

CREATE FUNCTION horse_publication_private.normalize_gallery(p_offer uuid,p_identity uuid,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE item jsonb; result jsonb:='[]'; ids uuid[]:='{}'; image_key uuid; count_primary integer:=0; total_bytes bigint:=0;
BEGIN
 IF p_input IS NULL OR jsonb_typeof(p_input)<>'array' OR jsonb_array_length(p_input)>10 THEN
  RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_input) LOOP
  IF jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'isPrimary') IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='22023'; END IF;
  IF (item->>'isPrimary')::boolean THEN count_primary:=count_primary+1; END IF;
  IF item ? 'imageId' THEN
   IF item-'imageId'-'isPrimary'<>'{}'::jsonb OR jsonb_typeof(item->'imageId') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='22023'; END IF;
   image_key:=(item->>'imageId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.horse_offer_images i JOIN horse_publication_private.gallery g ON g.image_id=i.id
    WHERE i.id=image_key AND i.horse_offer_id=p_offer AND i.identity_id=p_identity AND g.horse_offer_id=p_offer) THEN
    RAISE EXCEPTION 'horse_offer_image_unavailable' USING ERRCODE='42501'; END IF;
   item:=jsonb_build_object('imageId',image_key,'isPrimary',(item->>'isPrimary')::boolean);
  ELSE
   IF item-'clientFileId'-'byteLength'-'sha256'-'isPrimary'<>'{}'::jsonb
    OR jsonb_typeof(item->'clientFileId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(item->'byteLength') IS DISTINCT FROM 'number'
    OR (item->>'byteLength')::numeric NOT BETWEEN 1 AND 26214400
    OR (item->>'byteLength')::numeric<>trunc((item->>'byteLength')::numeric)
    OR jsonb_typeof(item->'sha256') IS DISTINCT FROM 'string'
    OR item->>'sha256' !~'^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='22023'; END IF;
   image_key:=(item->>'clientFileId')::uuid;
   total_bytes:=total_bytes+(item->>'byteLength')::bigint;
   item:=jsonb_build_object('clientFileId',image_key,'byteLength',(item->>'byteLength')::integer,
    'sha256',item->>'sha256','isPrimary',(item->>'isPrimary')::boolean);
  END IF;
  IF image_key IS NULL OR image_key='00000000-0000-0000-0000-000000000000'::uuid OR image_key=ANY(ids) THEN
   RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='22023'; END IF;
  ids:=array_append(ids,image_key); result:=result||jsonb_build_array(item);
 END LOOP;
 IF (jsonb_array_length(result)>0 AND count_primary<>1) OR total_bytes>104857600 THEN
  RAISE EXCEPTION 'horse_offer_gallery_invalid' USING ERRCODE='22023'; END IF;
 RETURN result;
END $f$;

CREATE FUNCTION horse_publication_private.snapshot(p_attempt uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','horse_offer','state',c.state,
  'actor_user_id',c.actor_user_id,'identity_id',c.identity_id,'request_key',c.request_key,
  'attempt_id',c.attempt_id,'horse_offer_id',c.horse_offer_id,
  'edit_revision',coalesce(c.published_revision,c.base_revision)::text,'publication_event_id',c.publication_event_id,
  'slots',coalesce((SELECT jsonb_agg(jsonb_build_object('slot_id',s.id,'client_file_id',s.client_file_id,
   'ordinal',s.ordinal,'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex'))
   ORDER BY s.ordinal) FROM listing_publication_private.slots s WHERE s.attempt_id=c.attempt_id),'[]'::jsonb))
 FROM horse_publication_private.commands c WHERE c.attempt_id=p_attempt;
$f$;

CREATE FUNCTION public.get_my_horse_publication_attempt_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c horse_publication_private.commands%ROWTYPE; closed_identity uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM horse_publication_private.commands
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR SHARE;
 IF FOUND THEN
  IF c.identity_id IS DISTINCT FROM p_expected_identity_id OR (p_attempt_id IS NOT NULL AND c.attempt_id<>p_attempt_id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN horse_publication_private.snapshot(c.attempt_id);
 END IF;
 IF p_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'horse_offer_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT identity_id INTO closed_identity FROM horse_publication_private.closed_requests
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND AND closed_identity IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','horse_offer',
  'state',CASE WHEN closed_identity IS NULL THEN 'not_found' ELSE 'cancelled' END,
  'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'request_key',p_request_key,
  'attempt_id',NULL,'horse_offer_id',NULL,'edit_revision',NULL,'publication_event_id',NULL,'slots','[]'::jsonb);
END $f$;

CREATE FUNCTION public.prepare_my_horse_publication_v1(
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
 SELECT coalesce(sum(o.reserved_bytes),0) INTO reserved FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE a.actor_user_id=p_expected_user_id AND NOT listing_publication_private.multipart_object_fully_deleted(o.id);
 IF reserved+new_count::bigint*(26214400+4194304)>314572800 THEN
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

CREATE FUNCTION public.get_my_horse_offer_publication_snapshot_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_offer_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT s.offer||jsonb_build_object('edit_revision',s.edit_revision) INTO result
 FROM public.get_my_horse_offer_edit_snapshot_v1(p_offer_id) s;
 IF result IS NULL OR result->>'identity_id' IS DISTINCT FROM p_expected_identity_id::text THEN
  RAISE EXCEPTION 'horse_offer_unavailable' USING ERRCODE='42501'; END IF;
 result:=jsonb_set(result,'{images}',coalesce((SELECT jsonb_agg(
  x||jsonb_build_object('url',replace(x->>'url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'original_url',replace(x->>'original_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'medium_url',replace(x->>'medium_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'),
   'thumb_url',replace(x->>'thumb_url','/api/v2/horse-media/','/api/v2/horse-owner-media/')) ORDER BY ord)
  FROM jsonb_array_elements(result->'images') WITH ORDINALITY e(x,ord)),'[]'::jsonb));
 result:=result||jsonb_build_object('image_url',replace(result->>'image_url','/api/v2/horse-media/','/api/v2/horse-owner-media/'));
 RETURN result;
END $f$;

CREATE FUNCTION public.cancel_my_horse_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c horse_publication_private.commands%ROWTYPE; a listing_publication_private.attempts%ROWTYPE; existing_identity uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO c FROM horse_publication_private.commands WHERE attempt_id=a.id FOR UPDATE;
  IF NOT FOUND OR a.identity_id IS DISTINCT FROM p_expected_identity_id OR (p_attempt_id IS NOT NULL AND p_attempt_id<>a.id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  IF c.state='published' THEN RETURN horse_publication_private.snapshot(a.id); END IF;
  IF a.state='open' THEN PERFORM listing_publication_private.close_locked_attempt(a.id,'cancelled'); END IF;
  IF c.state='prepared' THEN UPDATE horse_publication_private.commands SET state='cancelled' WHERE attempt_id=a.id; END IF;
 ELSIF p_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'horse_offer_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT identity_id INTO existing_identity FROM horse_publication_private.closed_requests
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND AND existing_identity IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 INSERT INTO horse_publication_private.closed_requests(actor_user_id,identity_id,request_key)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key) ON CONFLICT DO NOTHING;
 RETURN public.get_my_horse_publication_attempt_v1(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
END $f$;
