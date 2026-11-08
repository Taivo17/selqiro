CREATE FUNCTION service_publication_private.normalize_content(p_existing public.services,p_content jsonb)
RETURNS public.services LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE n public.services:=p_existing;item record;target text;patch jsonb:='{}';
 mapping constant jsonb:='{"title":"title","description":"description","category":"category","subcategory":"subcategory",
 "priceAmount":"price_amount","priceType":"price_type","currency":"currency","country":"country","city":"city","location":"location"}';
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& ARRAY['title','description','category','priceType','currency']) THEN
  RAISE EXCEPTION 'service_content_invalid' USING ERRCODE='22023';END IF;
 IF n.id IS NULL THEN n.status:='draft';n.description:='';n.price_type:='contact';n.currency:='EUR';n.sort_order:=0;END IF;
 FOR item IN SELECT key,value FROM jsonb_each(p_content) LOOP
  IF item.key='serviceId' THEN CONTINUE;END IF;
  target:=mapping->>item.key;
  IF target IS NULL OR (item.value<>'null'::jsonb AND jsonb_typeof(item.value)<>CASE WHEN target='price_amount' THEN 'number' ELSE 'string' END) THEN
   RAISE EXCEPTION 'service_content_invalid' USING ERRCODE='22023';END IF;
  patch:=patch||jsonb_build_object(target,item.value);
 END LOOP;
 n:=jsonb_populate_record(n,patch);n.title:=btrim(n.title);n.description:=coalesce(n.description,'');
 n.category:=nullif(btrim(n.category),'');n.subcategory:=nullif(btrim(n.subcategory),'');
 n.country:=nullif(btrim(n.country),'');n.city:=nullif(btrim(n.city),'');n.location:=nullif(btrim(n.location),'');
 IF n.title IS NULL OR length(n.title) NOT BETWEEN 2 AND 140 OR length(n.description)>5000
 OR length(n.category)>120 OR length(n.subcategory)>160
 OR ((n.category IS NULL OR NOT public.is_valid_service_category_pair_v2(n.category,n.subcategory))
 AND NOT(p_existing.id IS NOT NULL AND p_existing.status IN('published','archived')
 AND n.category IS NOT DISTINCT FROM p_existing.category AND n.subcategory IS NOT DISTINCT FROM p_existing.subcategory))
 OR length(n.country)>120 OR length(n.city)>160 OR length(n.location)>300 THEN
  RAISE EXCEPTION 'service_content_incomplete' USING ERRCODE='22023';END IF;
 IF n.price_type IS NULL OR n.price_type NOT IN('fixed','from','hourly','contact') OR n.currency IS NULL OR n.currency !~'^[A-Z]{3}$'
 OR (n.price_type<>'contact' AND (n.price_amount<0 OR n.price_amount>9999999999.99
 OR (n.price_amount IS NULL AND NOT(p_existing.id IS NOT NULL AND p_existing.status IN('published','archived')
 AND n.price_type IS NOT DISTINCT FROM p_existing.price_type AND n.price_amount IS NOT DISTINCT FROM p_existing.price_amount
 AND n.currency IS NOT DISTINCT FROM p_existing.currency)))) THEN
  RAISE EXCEPTION 'service_price_invalid' USING ERRCODE='22023';END IF;
 IF n.price_type='contact' THEN n.price_amount:=NULL;ELSE n.price_amount:=round(n.price_amount,2);END IF;
 RETURN n;
END $f$;

CREATE FUNCTION service_publication_private.content(s public.services) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('serviceId',s.id,'title',s.title,'description',s.description,'category',s.category,'subcategory',s.subcategory,
 'priceAmount',s.price_amount::text,'priceType',s.price_type,'currency',s.currency,'country',s.country,'city',s.city,'location',s.location);
$f$;
CREATE FUNCTION service_publication_private.image_projection(p_service uuid,p_owner boolean) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'url',CASE WHEN p_owner AND g.image_id IS NOT NULL
 THEN replace(i.original_url,'/api/v2/service-media/','/api/v2/service-owner-media/')
 ELSE coalesce(i.medium_url,i.original_url,i.thumb_url) END,'is_primary',CASE WHEN i.primary_count=1 THEN i.is_primary ELSE i.ordinal=1 END,'sort_order',i.ordinal-1)
 ORDER BY i.ordinal),'[]'::jsonb)
 FROM (SELECT raw.*,count(*) FILTER(WHERE raw.is_primary) OVER() AS primary_count,
 row_number() OVER(ORDER BY raw.sort_order,raw.created_at,raw.id) AS ordinal
 FROM public.service_images raw
 WHERE raw.service_id=p_service) i JOIN public.services s ON s.id=i.service_id AND s.identity_id=i.identity_id
 LEFT JOIN service_publication_private.gallery g ON g.image_id=i.id AND g.service_id=s.id WHERE s.id=p_service;
$f$;
CREATE FUNCTION service_publication_private.content_snapshot(p_service uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT service_publication_private.content(s)||jsonb_build_object('image_url',s.image_url,
 'images',service_publication_private.image_projection(s.id,false)) FROM public.services s WHERE s.id=p_service;
$f$;
CREATE FUNCTION service_publication_private.has_current_publication(p_service uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s JOIN service_publication_private.heads h ON h.service_id=s.id
 JOIN service_publication_private.events e ON e.id=h.event_id AND e.service_id=s.id AND e.identity_id=s.identity_id
 WHERE s.id=p_service AND e.content_snapshot=service_publication_private.content_snapshot(s.id)
 AND e.content_hash=encode(sha256(convert_to(e.content_snapshot::text,'UTF8')),'hex')
 AND NOT EXISTS(SELECT 1 FROM public.service_images i JOIN service_publication_private.gallery g ON g.image_id=i.id
 LEFT JOIN listing_publication_private.web_images w ON w.slot_id=g.slot_id AND w.attempt_id=g.attempt_id
 WHERE i.service_id=s.id AND (g.service_id<>s.id OR i.identity_id<>s.identity_id OR w.state IS DISTINCT FROM 'ready'
 OR w.ready_id IS DISTINCT FROM g.ready_id OR EXISTS(SELECT 1 FROM listing_publication_private.cleanup c WHERE c.object_id=g.object_id))));
$f$;
CREATE FUNCTION service_publication_private.is_public(p_service uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s JOIN public.identities i ON i.id=s.identity_id AND i.status='active'
 WHERE s.id=p_service AND s.status='published'
 AND (NOT EXISTS(SELECT 1 FROM service_publication_private.heads h WHERE h.service_id=s.id)
 OR service_publication_private.has_current_publication(s.id)));
$f$;

CREATE FUNCTION service_publication_private.normalize_gallery(p_service uuid,p_identity uuid,p_input jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE item jsonb; result jsonb:='[]'; ids uuid[]:='{}'; image_key uuid; count_primary integer:=0; total_bytes bigint:=0;
BEGIN
 IF p_input IS NULL OR jsonb_typeof(p_input)<>'array' OR jsonb_array_length(p_input)>10 THEN
  RAISE EXCEPTION 'publication_image_count_exceeded' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_input) LOOP
  IF jsonb_typeof(item)<>'object' OR jsonb_typeof(item->'isPrimary') IS DISTINCT FROM 'boolean' THEN
   RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='22023'; END IF;
  IF (item->>'isPrimary')::boolean THEN count_primary:=count_primary+1; END IF;
  IF item ? 'imageId' THEN
   IF item-'imageId'-'isPrimary'<>'{}'::jsonb OR jsonb_typeof(item->'imageId') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='22023'; END IF;
   image_key:=(item->>'imageId')::uuid;
   IF NOT EXISTS(SELECT 1 FROM public.service_images i
    WHERE i.id=image_key AND i.service_id=p_service AND i.identity_id=p_identity) THEN
    RAISE EXCEPTION 'service_image_unavailable' USING ERRCODE='42501'; END IF;
   item:=jsonb_build_object('imageId',image_key,'isPrimary',(item->>'isPrimary')::boolean);
  ELSE
   IF item-'clientFileId'-'byteLength'-'sha256'-'isPrimary'<>'{}'::jsonb
    OR jsonb_typeof(item->'clientFileId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(item->'byteLength') IS DISTINCT FROM 'number'
    OR (item->>'byteLength')::numeric NOT BETWEEN 1 AND 26214400
    OR (item->>'byteLength')::numeric<>trunc((item->>'byteLength')::numeric)
    OR jsonb_typeof(item->'sha256') IS DISTINCT FROM 'string'
    OR item->>'sha256' !~'^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='22023'; END IF;
   image_key:=(item->>'clientFileId')::uuid;
   total_bytes:=total_bytes+(item->>'byteLength')::bigint;
   item:=jsonb_build_object('clientFileId',image_key,'byteLength',(item->>'byteLength')::integer,
    'sha256',item->>'sha256','isPrimary',(item->>'isPrimary')::boolean);
  END IF;
  IF image_key IS NULL OR image_key='00000000-0000-0000-0000-000000000000'::uuid OR image_key=ANY(ids) THEN
   RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='22023'; END IF;
  ids:=array_append(ids,image_key); result:=result||jsonb_build_array(item);
 END LOOP;
 IF (jsonb_array_length(result)>0 AND count_primary<>1) OR total_bytes>104857600 THEN
  RAISE EXCEPTION 'service_gallery_invalid' USING ERRCODE='22023'; END IF;
 RETURN result;
END $f$;

CREATE FUNCTION service_publication_private.snapshot(p_attempt uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','service','state',c.state,
  'actor_user_id',c.actor_user_id,'identity_id',c.identity_id,'request_key',c.request_key,
  'attempt_id',c.attempt_id,'service_id',c.service_id,
  'edit_revision',coalesce(c.published_revision,c.base_revision)::text,'publication_event_id',c.publication_event_id,
  'slots',coalesce((SELECT jsonb_agg(jsonb_build_object('slot_id',s.id,'client_file_id',s.client_file_id,
   'ordinal',s.ordinal,'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex'))
   ORDER BY s.ordinal) FROM listing_publication_private.slots s WHERE s.attempt_id=c.attempt_id),'[]'::jsonb))
 FROM service_publication_private.commands c WHERE c.attempt_id=p_attempt;
$f$;

CREATE FUNCTION public.get_my_service_publication_attempt_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c service_publication_private.commands%ROWTYPE; closed_identity uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM service_publication_private.commands
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR SHARE;
 IF FOUND THEN
  IF c.identity_id IS DISTINCT FROM p_expected_identity_id OR (p_attempt_id IS NOT NULL AND c.attempt_id<>p_attempt_id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN service_publication_private.snapshot(c.attempt_id);
 END IF;
 IF p_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'service_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT identity_id INTO closed_identity FROM service_publication_private.closed_requests
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND AND closed_identity IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service',
  'state',CASE WHEN closed_identity IS NULL THEN 'not_found' ELSE 'cancelled' END,
  'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'request_key',p_request_key,
  'attempt_id',NULL,'service_id',NULL,'edit_revision',NULL,'publication_event_id',NULL,'slots','[]'::jsonb);
END $f$;

