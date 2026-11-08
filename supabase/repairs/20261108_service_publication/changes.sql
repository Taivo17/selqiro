-- COMPONENT 01_state.sql
-- Canonical UUID services and legacy photos remain in place. New operations
-- carry their own immutable receipt and share only the accepted binary ledger.
CREATE SCHEMA service_publication_private;
REVOKE ALL ON SCHEMA service_publication_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA service_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER TABLE public.services ADD COLUMN edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>0);

CREATE TABLE service_publication_private.events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
 identity_id uuid NOT NULL REFERENCES public.identities(id),actor_user_id uuid NOT NULL REFERENCES public.profiles(id),
 submission_key uuid NOT NULL UNIQUE REFERENCES listing_publication_private.attempts(id),
 decision text NOT NULL DEFAULT 'published' CHECK(decision='published'),
 content_snapshot jsonb NOT NULL,content_hash text NOT NULL CHECK(content_hash ~ '^[0-9a-f]{64}$'),
 policy_snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE service_publication_private.heads(
 service_id uuid PRIMARY KEY REFERENCES public.services(id) ON DELETE RESTRICT,
 event_id uuid NOT NULL UNIQUE REFERENCES service_publication_private.events(id));
CREATE TABLE service_publication_private.commands(
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id),identity_id uuid NOT NULL REFERENCES public.identities(id),
 request_key uuid NOT NULL,base_revision bigint NOT NULL CHECK(base_revision>0),
 proposed_content jsonb NOT NULL CHECK(jsonb_typeof(proposed_content)='object'),
 gallery_intent jsonb NOT NULL CHECK(jsonb_typeof(gallery_intent)='array' AND jsonb_array_length(gallery_intent)<=10),
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN('prepared','published','cancelled')),
 publication_event_id uuid REFERENCES service_publication_private.events(id),published_revision bigint,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(actor_user_id,request_key),
 CHECK((state='published' AND publication_event_id IS NOT NULL AND published_revision IS NOT NULL)
 OR (state IN('prepared','cancelled') AND publication_event_id IS NULL AND published_revision IS NULL)));
CREATE TABLE service_publication_private.closed_requests(
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id),identity_id uuid NOT NULL REFERENCES public.identities(id),
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 closed_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(actor_user_id,request_key));
CREATE TABLE service_publication_private.gallery(
 image_id uuid PRIMARY KEY REFERENCES public.service_images(id) ON DELETE CASCADE,
 service_id uuid NOT NULL REFERENCES public.services(id),attempt_id uuid NOT NULL REFERENCES listing_publication_private.attempts(id),
 slot_id uuid NOT NULL REFERENCES listing_publication_private.slots(id),object_id uuid NOT NULL REFERENCES listing_publication_private.objects(id),
 ready_id uuid NOT NULL,web_sha256 bytea NOT NULL CHECK(octet_length(web_sha256)=32),
 web_bytes integer NOT NULL CHECK(web_bytes BETWEEN 1 AND 4194304),UNIQUE(attempt_id,slot_id));

CREATE FUNCTION service_publication_private.protect_receipt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_TABLE_NAME='events' THEN RAISE EXCEPTION 'service_receipt_immutable' USING ERRCODE='55000';END IF;
 IF TG_OP='DELETE' OR OLD.state<>'prepared' OR NEW.state NOT IN('published','cancelled')
 OR (to_jsonb(NEW)-ARRAY['state','publication_event_id','published_revision']) IS DISTINCT FROM
 (to_jsonb(OLD)-ARRAY['state','publication_event_id','published_revision']) THEN
  RAISE EXCEPTION 'service_receipt_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER service_event_immutable BEFORE UPDATE OR DELETE ON service_publication_private.events
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.protect_receipt();
CREATE TRIGGER service_command_immutable BEFORE UPDATE OR DELETE ON service_publication_private.commands
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.protect_receipt();

CREATE FUNCTION service_publication_private.advance_revision() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user NOT IN('postgres','selqiro_listing_final_writer_v1') THEN
  RAISE EXCEPTION 'service_command_required' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' THEN
  IF NEW.id<>OLD.id OR NEW.identity_id<>OLD.identity_id OR NEW.created_at<>OLD.created_at THEN
   RAISE EXCEPTION 'service_identity_immutable' USING ERRCODE='55000'; END IF;
  NEW.edit_revision:=OLD.edit_revision+1;
 ELSIF TG_OP='INSERT' THEN NEW.edit_revision:=1;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER service_revision BEFORE INSERT OR UPDATE ON public.services
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.advance_revision();
CREATE FUNCTION service_publication_private.guard_gallery() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user NOT IN('postgres','selqiro_listing_final_writer_v1') THEN
  RAISE EXCEPTION 'service_command_required' USING ERRCODE='42501'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $f$;
CREATE TRIGGER service_gallery_authority BEFORE INSERT OR UPDATE OR DELETE ON public.service_images
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.guard_gallery();

CREATE FUNCTION service_publication_private.current_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb;t timestamptz;
BEGIN
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;t:=clock_timestamp();
 SELECT jsonb_agg(jsonb_build_object('document_id',p.id,'version',p.policy_version,'content_hash',p.content_hash) ORDER BY p.id)
 INTO result FROM public.publication_policy_documents p WHERE p.status='active' AND p.locale='et-EE'
 AND p.country_code IS NULL AND p.policy_key='marketplace-general' AND 'service'=ANY(p.applies_to_content_types)
 AND p.effective_from<=t AND (p.effective_until IS NULL OR p.effective_until>t);
 IF coalesce(jsonb_array_length(result),0)<>1 OR EXISTS(SELECT 1 FROM public.publication_policy_documents p
 WHERE p.status='active' AND p.locale='et-EE' AND p.country_code IS NULL AND 'service'=ANY(p.applies_to_content_types)
 AND p.requires_user_acceptance AND p.effective_from<=t AND (p.effective_until IS NULL OR p.effective_until>t)
 AND p.policy_key<>'marketplace-general') THEN RAISE EXCEPTION 'service_policy_unavailable' USING ERRCODE='55000';END IF;
 RETURN result;
END $f$;
CREATE FUNCTION service_publication_private.accept_shown_policies(p_user uuid,p_identity uuid,p_shown jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE required jsonb;item jsonb;doc public.publication_policy_documents%ROWTYPE;
BEGIN
 required:=service_publication_private.current_policies();
 IF p_shown IS NULL OR jsonb_typeof(p_shown)<>'array' OR jsonb_array_length(p_shown)<>1 THEN
  RAISE EXCEPTION 'service_policy_consent_required' USING ERRCODE='22023';END IF;
 item:=p_shown->0;
 IF jsonb_typeof(item)<>'object' OR item-'documentId'-'version'-'contentHash'-'accepted'<>'{}'::jsonb
 OR item->'accepted' IS DISTINCT FROM 'true'::jsonb THEN
  RAISE EXCEPTION 'service_policy_consent_required' USING ERRCODE='22023';END IF;
 IF jsonb_build_array(jsonb_build_object('document_id',(item->>'documentId')::uuid,'version',item->>'version',
 'content_hash',item->>'contentHash')) IS DISTINCT FROM required THEN
  RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501';END IF;
 SELECT * INTO doc FROM public.publication_policy_documents WHERE id=(required->0->>'document_id')::uuid;
 INSERT INTO public.user_publication_policy_acceptances(user_id,identity_id,policy_document_id,policy_key,policy_version,
 country_code,locale,content_hash,acceptance_source) VALUES(p_user,p_identity,doc.id,doc.policy_key,doc.policy_version,
 doc.country_code,doc.locale,doc.content_hash,'publication_gate') ON CONFLICT(user_id,policy_document_id) DO NOTHING;
 RETURN required;
END $f$;
CREATE FUNCTION service_publication_private.require_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
DECLARE required jsonb;actor uuid:=public.listing_actor_uid_hosted_v1();item jsonb;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'service_authentication_required' USING ERRCODE='42501';END IF;
 required:=service_publication_private.current_policies();item:=required->0;
 PERFORM 1 FROM public.user_publication_policy_acceptances a WHERE a.user_id=actor AND a.policy_document_id=(item->>'document_id')::uuid
 AND a.policy_version=item->>'version' AND a.content_hash=item->>'content_hash' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_policy_consent_required' USING ERRCODE='42501';END IF;
 RETURN required;
END $f$;

-- COMPONENT 02_content.sql
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


-- COMPONENT 03_commands.sql
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

-- COMPONENT 04_cancel.sql
CREATE FUNCTION public.cancel_my_service_publication_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c service_publication_private.commands%ROWTYPE; a listing_publication_private.attempts%ROWTYPE; existing_identity uuid;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_request_key IS NULL OR p_request_key='00000000-0000-0000-0000-000000000000'::uuid THEN
  RAISE EXCEPTION 'publication_request_key_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM listing_publication_private.attempts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO c FROM service_publication_private.commands WHERE attempt_id=a.id FOR UPDATE;
  IF NOT FOUND OR a.identity_id IS DISTINCT FROM p_expected_identity_id OR (p_attempt_id IS NOT NULL AND p_attempt_id<>a.id) THEN
   RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
  IF c.state='published' THEN RETURN service_publication_private.snapshot(a.id); END IF;
  IF a.state='open' THEN PERFORM listing_publication_private.close_locked_attempt(a.id,'cancelled'); END IF;
  IF c.state='prepared' THEN UPDATE service_publication_private.commands SET state='cancelled' WHERE attempt_id=a.id; END IF;
 ELSIF p_attempt_id IS NOT NULL THEN RAISE EXCEPTION 'service_attempt_unavailable' USING ERRCODE='42501'; END IF;
 SELECT identity_id INTO existing_identity FROM service_publication_private.closed_requests
 WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND AND existing_identity IS DISTINCT FROM p_expected_identity_id THEN
  RAISE EXCEPTION 'publication_request_conflict' USING ERRCODE='22023'; END IF;
 INSERT INTO service_publication_private.closed_requests(actor_user_id,identity_id,request_key)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key) ON CONFLICT DO NOTHING;
 RETURN public.get_my_service_publication_attempt_v1(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
END $f$;

-- COMPONENT 05_media_bridge.sql
-- Service binary adapter; retained listing/horse branches are preserved.

CREATE FUNCTION service_publication_private.require_ready_image(p_attempt uuid,p_slot uuid)
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

CREATE FUNCTION public.get_my_service_publication_image_binding_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_slot_id uuid,p_client_file_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE result jsonb;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',a.actor_user_id,
  'identity_id',a.identity_id,'attempt_id',a.id,'slot_id',s.id,'client_file_id',s.client_file_id,
  'expected_bytes',s.expected_source_bytes,'expected_sha256',encode(s.expected_source_sha256,'hex')) INTO result
 FROM service_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN listing_publication_private.slots s ON s.attempt_id=a.id
 WHERE a.id=p_attempt_id AND a.actor_user_id=p_expected_user_id AND a.identity_id=p_expected_identity_id
  AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
  AND c.state='prepared' AND a.state='open' AND a.expires_at>clock_timestamp()
  AND s.id=p_slot_id AND s.client_file_id=p_client_file_id FOR SHARE OF a;
 IF result IS NULL THEN RAISE EXCEPTION 'service_image_unavailable' USING ERRCODE='42501'; END IF;
 RETURN result;
END $f$;

CREATE FUNCTION service_publication_private.media_binding(p_attempt uuid,p_ordinal integer,p_public boolean,p_identity uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'attempt_id',a.id,'ordinal',s.ordinal,
  'bucket_id',o.bucket_id,'object_path',o.object_path,'sha256',encode(g.web_sha256,'hex'),'bytes',g.web_bytes)
 FROM service_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN service_publication_private.gallery g ON g.attempt_id=a.id AND g.service_id=c.service_id
 JOIN public.services h ON h.id=g.service_id AND h.identity_id=c.identity_id
 JOIN public.identities identity_row ON identity_row.id=h.identity_id AND identity_row.status='active'
 JOIN public.service_images i ON i.id=g.image_id AND i.service_id=h.id AND i.identity_id=h.identity_id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id AND e.service_id=h.id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.objects o ON o.id=g.object_id AND o.slot_id=s.id AND o.attempt_id=a.id AND o.kind='web'
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 WHERE a.id=p_attempt AND s.ordinal=p_ordinal AND a.state='published' AND c.state='published'
  AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id AND a.request_key=c.request_key
  AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id AND e.submission_key=a.id AND e.decision='published'
  AND w.state='ready' AND w.ready_id=g.ready_id AND w.ready_at IS NOT NULL
  AND w.intent->>'web_sha256'=encode(g.web_sha256,'hex') AND w.intent->>'web_bytes'=g.web_bytes::text
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
  AND i.original_url='/api/v2/service-media/'||a.id::text||'/'||s.ordinal::text
  AND i.medium_url=i.original_url AND i.thumb_url=i.original_url AND i.storage_path=o.object_path
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id)
  AND CASE WHEN p_public THEN service_publication_private.is_public(h.id) ELSE h.identity_id=p_identity END;
$f$;

CREATE FUNCTION public.get_public_service_media_binding_v1(p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_upload_service();
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 RETURN service_publication_private.media_binding(p_attempt_id,p_ordinal,true,NULL);
END $f$;

CREATE FUNCTION public.get_my_service_media_binding_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_ordinal integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_ordinal IS NULL OR p_ordinal NOT BETWEEN 0 AND 9 THEN RETURN NULL; END IF;
 RETURN service_publication_private.media_binding(p_attempt_id,p_ordinal,false,p_expected_identity_id);
END $f$;

CREATE FUNCTION service_publication_private.retired_web_deleted(p_object uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT o.kind='web' AND o.dispatch_key IS NULL
  AND q.reason='published_image_removed' AND q.state='deleted'
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
  AND a.state='published' AND c.state='published' AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
  AND e.service_id=c.service_id AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id
  AND e.submission_key=a.id AND e.decision='published'
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed'
  AND m.completed_at IS NOT NULL AND m.verified_at IS NOT NULL AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=w.intent->>'web_sha256' AND m.observed_bytes::text=w.intent->>'web_bytes'
  AND NOT EXISTS(SELECT 1 FROM service_publication_private.gallery g WHERE g.object_id=o.id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN service_publication_private.commands c ON c.attempt_id=a.id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.multipart_attempts ma ON ma.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.attempt_id=a.id AND w.slot_id=s.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id WHERE o.id=p_object),false);
$f$;

CREATE FUNCTION service_publication_private.lock_cleanup_context(p_user uuid,p_identity uuid,p_attempt uuid,p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid;
BEGIN
 PERFORM listing_publication_private.lock_upload_service_actor(p_user,p_identity);
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'publication_read_committed_required' USING ERRCODE='25001'; END IF;
 SELECT c.service_id INTO offer_id FROM service_publication_private.commands c
 JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 WHERE a.id=p_attempt AND a.identity_id=p_identity AND a.request_key=p_request
  AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
  AND c.state='published' AND a.state='published' FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_publication_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.services WHERE id=offer_id AND identity_id=p_identity FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_publication_cleanup_unavailable' USING ERRCODE='42501'; END IF;
 RETURN offer_id;
END $f$;

CREATE FUNCTION service_publication_private.cleanup_object_eligible(p_object uuid,p_service uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce((SELECT a.state='published' AND c.state='published' AND c.service_id=p_service
  AND a.identity_id=c.identity_id AND a.actor_user_id=c.actor_user_id AND a.request_key=c.request_key
  AND e.service_id=p_service AND e.identity_id=c.identity_id AND e.actor_user_id=c.actor_user_id
  AND e.submission_key=a.id AND e.decision='published'
  AND o.dispatch_key IS NULL AND o.bucket_id='listing-publication-private'
  AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND o.object_path='v1/'||a.id::text||'/'||s.id::text||CASE WHEN o.kind='source' THEN '/source.upload' ELSE '/web-v1.webp' END
  AND ((o.kind='source' AND q.reason='published_source') OR (o.kind='web' AND q.reason='published_image_removed'))
  AND w.state='ready' AND w.ready_id IS NOT NULL AND w.ready_at IS NOT NULL
  AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
  AND m.provider_contract='supabase-s3-session-v1' AND m.state='completed' AND m.completed_at IS NOT NULL
  AND m.verified_at IS NOT NULL AND m.problem IS NULL AND m.storage_object_id IS NOT NULL AND m.storage_version IS NOT NULL
  AND m.observed_sha256=CASE WHEN o.kind='source' THEN encode(s.expected_source_sha256,'hex') ELSE w.intent->>'web_sha256' END
  AND m.observed_bytes=CASE WHEN o.kind='source' THEN s.expected_source_bytes ELSE (w.intent->>'web_bytes')::integer END
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z
   WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path AND (z.id<>m.storage_object_id OR z.version IS DISTINCT FROM m.storage_version))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=m.upload_id OR (u.bucket_id=o.bucket_id AND u.key=o.object_path))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=m.upload_id OR (part.bucket_id=o.bucket_id AND part.key=o.object_path))
  AND CASE WHEN o.kind='web' THEN NOT EXISTS(SELECT 1 FROM service_publication_private.gallery g WHERE g.object_id=o.id)
   ELSE EXISTS(SELECT 1 FROM listing_publication_private.objects web
    JOIN listing_publication_private.multipart_sessions wm ON wm.object_id=web.id
    WHERE web.slot_id=s.id AND web.attempt_id=a.id AND web.kind='web' AND web.dispatch_key IS NULL
     AND wm.provider_contract='supabase-s3-session-v1' AND wm.state='completed' AND wm.completed_at IS NOT NULL
     AND wm.verified_at IS NOT NULL AND wm.problem IS NULL AND wm.storage_object_id IS NOT NULL AND wm.storage_version IS NOT NULL
     AND wm.observed_sha256=w.intent->>'web_sha256' AND wm.observed_bytes::text=w.intent->>'web_bytes'
     AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads u WHERE u.id=wm.upload_id OR (u.bucket_id=web.bucket_id AND u.key=web.object_path))
     AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_s3_multipart_uploads_parts part WHERE part.upload_id=wm.upload_id OR (part.bucket_id=web.bucket_id AND part.key=web.object_path))
     AND ((EXISTS(SELECT 1 FROM service_publication_private.gallery g WHERE g.object_id=web.id AND g.ready_id=w.ready_id)
       AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup qc WHERE qc.object_id=web.id)
       AND EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.id=wm.storage_object_id AND z.version=wm.storage_version AND z.bucket_id=web.bucket_id AND z.name=web.object_path)
       AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=web.bucket_id AND z.name=web.object_path AND (z.id<>wm.storage_object_id OR z.version IS DISTINCT FROM wm.storage_version)))
      OR (NOT EXISTS(SELECT 1 FROM service_publication_private.gallery g WHERE g.object_id=web.id)
       AND EXISTS(SELECT 1 FROM listing_publication_private.cleanup qc WHERE qc.object_id=web.id AND qc.reason='published_image_removed'
        AND qc.bucket_id=web.bucket_id AND qc.object_path=web.object_path)))) END
 FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 JOIN service_publication_private.commands c ON c.attempt_id=a.id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id
 JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id WHERE o.id=p_object),false);
$f$;

CREATE FUNCTION public.claim_service_publication_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid; c listing_publication_private.cleanup%ROWTYPE; t timestamptz;
BEGIN
 offer_id:=service_publication_private.lock_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 t:=clock_timestamp();
 SELECT q.* INTO c FROM listing_publication_private.cleanup q
 JOIN listing_publication_private.objects o ON o.id=q.object_id
 JOIN service_publication_private.commands cmd ON cmd.attempt_id=o.attempt_id AND cmd.service_id=offer_id
 WHERE service_publication_private.cleanup_object_eligible(o.id,offer_id)
  AND listing_publication_private.object_cleanup_state(o.id)='pending'
  AND ((q.state IN('pending','retry_wait') AND (q.not_before IS NULL OR q.not_before<=t)) OR (q.state='in_flight' AND q.lease_until<=t))
 ORDER BY CASE WHEN o.kind='source' THEN 0 ELSE 1 END,q.enqueued_at,q.object_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED;
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

CREATE FUNCTION public.record_service_publication_cleanup_v1(
 p_expected_user_id uuid,p_expected_identity_id uuid,p_attempt_id uuid,p_request_key uuid,
 p_object_id uuid,p_work_key uuid,p_result text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE offer_id uuid; target_kind text; cleanup_state text; result jsonb;
BEGIN
 offer_id:=service_publication_private.lock_cleanup_context(p_expected_user_id,p_expected_identity_id,p_attempt_id,p_request_key);
 SELECT o.kind,q.state INTO target_kind,cleanup_state FROM listing_publication_private.objects o
 JOIN listing_publication_private.cleanup q ON q.object_id=o.id
 JOIN service_publication_private.commands cmd ON cmd.attempt_id=o.attempt_id AND cmd.service_id=offer_id
 WHERE o.id=p_object_id AND q.work_key=p_work_key AND q.bucket_id=o.bucket_id AND q.object_path=o.object_path
  AND ((o.kind='source' AND q.reason='published_source') OR (o.kind='web' AND q.reason='published_image_removed'))
 FOR UPDATE OF q;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_publication_cleanup_binding' USING ERRCODE='42501'; END IF;
 IF cleanup_state<>'deleted' AND NOT service_publication_private.cleanup_object_eligible(p_object_id,offer_id) THEN
  RAISE EXCEPTION 'service_publication_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 IF target_kind='web' AND EXISTS(SELECT 1 FROM service_publication_private.gallery WHERE object_id=p_object_id) THEN
  RAISE EXCEPTION 'service_publication_cleanup_active_image' USING ERRCODE='55000'; END IF;
 result:=public.record_listing_cleanup_v1(p_object_id,p_work_key,p_result);
 IF p_result='deleted' AND (CASE WHEN target_kind='source'
  THEN listing_publication_private.hosted_completed_source_deleted_v1(p_object_id)
  ELSE service_publication_private.retired_web_deleted(p_object_id) END) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'service_publication_cleanup_not_observed' USING ERRCODE='55000'; END IF;
 RETURN result;
END $f$;

CREATE FUNCTION service_publication_private.guard_image_request_key()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE expected uuid;
BEGIN
 IF TG_TABLE_SCHEMA<>'listing_publication_private' OR TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'service_image_binding_invalid' USING ERRCODE='55000'; END IF;
 IF TG_TABLE_NAME='multipart_sessions' THEN
  SELECT s.client_file_id INTO expected FROM listing_publication_private.objects o
  JOIN listing_publication_private.slots s ON s.id=o.slot_id AND s.attempt_id=o.attempt_id
  JOIN service_publication_private.commands c ON c.attempt_id=o.attempt_id WHERE o.id=NEW.object_id;
 ELSIF TG_TABLE_NAME='web_images' THEN
  SELECT s.client_file_id INTO expected FROM listing_publication_private.slots s
  JOIN service_publication_private.commands c ON c.attempt_id=s.attempt_id
  WHERE s.id=NEW.slot_id AND s.attempt_id=NEW.attempt_id;
 ELSE RAISE EXCEPTION 'service_image_binding_invalid' USING ERRCODE='55000'; END IF;
 IF expected IS NOT NULL AND NEW.request_key IS DISTINCT FROM expected THEN
  RAISE EXCEPTION 'service_image_request_conflict' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER guard_service_multipart_key BEFORE INSERT ON listing_publication_private.multipart_sessions
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.guard_image_request_key();
CREATE TRIGGER guard_service_web_key BEFORE INSERT ON listing_publication_private.web_images
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.guard_image_request_key();

CREATE OR REPLACE FUNCTION listing_publication_private.assert_non_horse_attempt_v1(p_attempt uuid)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM service_publication_private.commands WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'service_publication_requires_service_command' USING ERRCODE='55000';END IF;
 IF EXISTS(SELECT 1 FROM horse_publication_private.commands WHERE attempt_id=p_attempt) THEN
  RAISE EXCEPTION 'horse_publication_requires_horse_command' USING ERRCODE='55000'; END IF;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.require_attempt_policies_v1(p_attempt uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM service_publication_private.commands c JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 WHERE c.attempt_id=p_attempt AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
 AND a.request_key=c.request_key AND c.state='prepared') THEN RETURN service_publication_private.require_policies();END IF;
 IF EXISTS(SELECT 1 FROM horse_publication_private.commands c
  JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
  WHERE c.attempt_id=p_attempt AND a.actor_user_id=c.actor_user_id AND a.identity_id=c.identity_id
   AND a.request_key=c.request_key AND c.state='prepared') THEN
  RETURN horse_publication_private.require_policies();
 END IF;
 PERFORM listing_publication_private.assert_non_horse_attempt_v1(p_attempt);
 RETURN listing_publication_private.require_policies();
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.protect_attempt() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'publication_receipt_retained' USING ERRCODE='55000'; END IF;
 -- A canonical horse event is an explicit alternative, never a numeric listing.
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND service_publication_private.attempt_publication_matches(OLD.id,OLD.actor_user_id,OLD.identity_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND horse_publication_private.attempt_publication_matches(OLD.id,OLD.actor_user_id,OLD.identity_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   JOIN listing_publication_private.attempts parent ON parent.id=p.attempt_id
   JOIN public.listings l ON l.id=p.listing_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='published' AND parent.state='published'
    AND parent.identity_id=OLD.identity_id AND l.identity_id=OLD.identity_id AND l.created_by_user_id=parent.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source'
    OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.managed_image_additions_v1 b
   JOIN listing_publication_private.publications p ON p.attempt_id=b.parent_attempt_id
   WHERE b.attempt_id=OLD.id AND b.attached_at IS NOT NULL AND p.state='deleting'
    AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path)) THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='open' AND NEW.state='published'
  AND NEW.payload IS NULL AND NEW.closed_at IS NOT NULL
  AND (to_jsonb(NEW)-ARRAY['state','payload','closed_at'])=(to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p JOIN public.listings l ON l.id=p.listing_id
   WHERE p.attempt_id=OLD.id AND p.state='published' AND l.identity_id=OLD.identity_id AND l.created_by_user_id=OLD.actor_user_id)
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND o.kind='source' AND (c.object_id IS NULL OR c.reason<>'published_source' OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF current_user='selqiro_listing_final_writer_v1' AND OLD.state='published' AND NEW.state='deleted'
  AND (to_jsonb(NEW)-'state')=(to_jsonb(OLD)-'state')
  AND EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.attempt_id=OLD.id AND p.state='deleting'
   AND NOT EXISTS(SELECT 1 FROM public.listings l WHERE l.id=p.listing_id))
  AND NOT EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
   WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path))
 THEN RETURN NEW; END IF;
 IF (to_jsonb(NEW)-ARRAY['state','payload','closed_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','payload','closed_at'])
  OR OLD.state<>'open' OR NEW.state NOT IN('cancelled','expired') OR NEW.payload IS NOT NULL OR NEW.closed_at IS NULL THEN
  RAISE EXCEPTION 'publication_attempt_immutable' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
  WHERE o.attempt_id=OLD.id AND (c.object_id IS NULL OR c.bucket_id<>o.bucket_id OR c.object_path<>o.object_path OR c.reason<>NEW.state
   OR c.state<>listing_publication_private.object_cleanup_state(o.id))) THEN
  RAISE EXCEPTION 'publication_cleanup_lineage_required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;

CREATE OR REPLACE FUNCTION listing_publication_private.multipart_object_fully_deleted(p_id uuid)
RETURNS boolean LANGUAGE sql SET search_path=pg_catalog,pg_temp AS $f$
 SELECT service_publication_private.retired_web_deleted(p_id) OR horse_publication_private.retired_web_deleted(p_id) OR
 listing_publication_private.hosted_retired_web_deleted_v1(p_id) OR
 listing_publication_private.hosted_completed_source_deleted_v1(p_id) OR
 (coalesce(c.state='deleted',false) AND (m.id IS NULL OR
  (EXISTS(SELECT 1 FROM listing_publication_private.multipart_auxiliary_receipts r WHERE r.session_id=m.id)
   AND NOT EXISTS(SELECT 1 FROM listing_publication_private.hosted_storage_objects z WHERE z.bucket_id=o.bucket_id AND z.name=o.object_path))))
 FROM listing_publication_private.objects o LEFT JOIN listing_publication_private.cleanup c ON c.object_id=o.id
 LEFT JOIN listing_publication_private.multipart_sessions m ON m.object_id=o.id WHERE o.id=p_id;
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.upload_object_is_published_web_v1(p_object uuid)
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
 WHERE o.id=p_object),false) OR EXISTS(
 SELECT 1 FROM service_publication_private.gallery g
 JOIN public.service_images i ON i.id=g.image_id AND i.service_id=g.service_id
 JOIN public.services svc ON svc.id=i.service_id AND svc.identity_id=i.identity_id
 JOIN service_publication_private.commands c ON c.attempt_id=g.attempt_id AND c.service_id=svc.id
 JOIN service_publication_private.events e ON e.id=c.publication_event_id AND e.service_id=svc.id
 JOIN listing_publication_private.attempts a ON a.id=c.attempt_id
 JOIN listing_publication_private.slots s ON s.id=g.slot_id AND s.attempt_id=a.id
 JOIN listing_publication_private.objects o ON o.id=g.object_id AND o.slot_id=s.id AND o.attempt_id=a.id
 JOIN listing_publication_private.web_images w ON w.slot_id=s.id AND w.attempt_id=a.id
 WHERE o.id=p_object AND o.kind='web' AND o.dispatch_key IS NULL AND a.state='published' AND a.closed_at IS NOT NULL
 AND c.state='published' AND c.actor_user_id=a.actor_user_id AND c.identity_id=a.identity_id AND c.request_key=a.request_key
 AND e.actor_user_id=a.actor_user_id AND e.identity_id=a.identity_id AND e.submission_key=a.id AND e.decision='published'
 AND svc.identity_id=a.identity_id AND g.ready_id=w.ready_id AND w.state='ready' AND w.ready_at IS NOT NULL
 AND encode(g.web_sha256,'hex')=w.intent->>'web_sha256' AND g.web_bytes::text=w.intent->>'web_bytes'
 AND w.intent->>'source_sha256'=encode(s.expected_source_sha256,'hex') AND w.intent->>'source_bytes'=s.expected_source_bytes::text
 AND o.bucket_id='listing-publication-private' AND o.object_path='v1/'||a.id::text||'/'||s.id::text||'/web-v1.webp'
 AND i.original_url='/api/v2/service-media/'||a.id::text||'/'||s.ordinal::text
 AND i.medium_url=i.original_url AND i.thumb_url=i.original_url AND i.storage_path=o.object_path
 AND NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup q WHERE q.object_id=o.id));
$f$;

CREATE OR REPLACE FUNCTION listing_publication_private.lock_account_source_cleanup_context_v1(p_user uuid,p_object uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE origin_id uuid; target_identity uuid; root_id uuid; target_listing bigint; horse_id uuid;target_service uuid;
BEGIN
 SELECT a.id,a.identity_id INTO origin_id,target_identity
 FROM listing_publication_private.objects o JOIN listing_publication_private.attempts a ON a.id=o.attempt_id
 WHERE o.id=p_object AND o.kind='source' AND a.actor_user_id=p_user;
 IF NOT FOUND OR listing_publication_private.lock_account_upload_identity_v1(p_user,target_identity) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501'; END IF;
 SELECT c.service_id INTO target_service FROM service_publication_private.commands c WHERE c.attempt_id=origin_id;
 IF FOUND THEN
  PERFORM 1 FROM listing_publication_private.attempts a WHERE a.id=origin_id AND a.actor_user_id=p_user AND a.identity_id=target_identity FOR SHARE;
  PERFORM 1 FROM public.services s WHERE s.id=target_service AND s.identity_id=target_identity FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication_account_source_unavailable' USING ERRCODE='42501';END IF;
  PERFORM 1 FROM public.service_images i WHERE i.service_id=target_service ORDER BY i.id FOR SHARE;
  RETURN;
 END IF;
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

-- COMPONENT 06_reads_status.sql
CREATE FUNCTION public.get_my_service_publication_snapshot_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,'identity_id',s.identity_id,
 'service_id',s.id,'edit_revision',s.edit_revision::text,'status',s.status,'content',service_publication_private.content(s),
 'images',service_publication_private.image_projection(s.id,true),'policy_snapshot',service_publication_private.current_policies(),
 'created_at',s.created_at,'updated_at',s.updated_at,'published_at',s.published_at,'sort_order',s.sort_order);
END $f$;
CREATE FUNCTION public.get_my_service_publications_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 200,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE items jsonb;total bigint;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 200 OR p_result_offset IS NULL OR p_result_offset<0 OR p_result_offset>1000000 THEN
 RAISE EXCEPTION 'service_page_invalid' USING ERRCODE='22023';END IF;
 SELECT count(*) INTO total FROM public.services WHERE identity_id=p_expected_identity_id;
 SELECT coalesce(jsonb_agg(public.get_my_service_publication_snapshot_v1(p_expected_user_id,p_expected_identity_id,s.id)
 ORDER BY s.sort_order,s.created_at DESC,s.id),'[]'::jsonb) INTO items FROM
 (SELECT * FROM public.services WHERE identity_id=p_expected_identity_id ORDER BY sort_order,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset) s;
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'items',items,
 'total_count',total::text,'result_limit',p_result_limit,'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

CREATE FUNCTION public.set_my_service_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_service_id uuid,
 p_expected_revision text,p_expected_status text,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE s public.services%ROWTYPE;changed boolean;
BEGIN
 PERFORM listing_publication_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_expected_revision IS NULL OR p_expected_revision !~'^[1-9][0-9]{0,18}$' OR p_expected_revision::numeric>9223372036854775807
 OR p_expected_status IS NULL OR p_expected_status NOT IN('published','archived') OR p_status IS NULL OR p_status NOT IN('published','archived') THEN
 RAISE EXCEPTION 'service_status_invalid' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM public.services WHERE id=p_service_id AND identity_id=p_expected_identity_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_unavailable' USING ERRCODE='42501';END IF;
 IF s.edit_revision::numeric=p_expected_revision::numeric+1 AND s.status=p_status AND p_status<>p_expected_status THEN changed:=true;
 ELSE
  IF s.edit_revision::text<>p_expected_revision OR s.status<>p_expected_status THEN RAISE EXCEPTION 'service_edit_conflict' USING ERRCODE='40001';END IF;
  IF p_status='published' AND EXISTS(SELECT 1 FROM service_publication_private.heads WHERE service_id=s.id)
  AND NOT service_publication_private.has_current_publication(s.id) THEN RAISE EXCEPTION 'service_finality_invalid' USING ERRCODE='55000';END IF;
  changed:=s.status<>p_status;
  IF changed THEN UPDATE public.services SET status=p_status WHERE id=s.id RETURNING * INTO s;END IF;
 END IF;
 RETURN jsonb_build_object('schema_version',1,'content_type','service','actor_user_id',p_expected_user_id,'identity_id',s.identity_id,
 'service_id',s.id,'edit_revision',s.edit_revision::text,'status',s.status,'changed',changed);
END $f$;

CREATE FUNCTION service_publication_private.public_fields(s public.services) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',1,'content_type','service','content_id',s.id,'identity_id',s.identity_id,
 'title',s.title,'description',s.description,'category',s.category,'subcategory',s.subcategory,'price_type',s.price_type,
 'price_amount',s.price_amount::text,'currency',s.currency,'country',s.country,'city',s.city,'location_label',s.location,
 'images',CASE WHEN jsonb_array_length(service_publication_private.image_projection(s.id,false))>0 THEN
 (SELECT jsonb_agg(jsonb_build_object('id',x->'id','url',x->'url') ORDER BY (x->>'is_primary')::boolean DESC,ord)
 FROM jsonb_array_elements(service_publication_private.image_projection(s.id,false)) WITH ORDINALITY i(x,ord))
 WHEN s.image_url ~ '^https?://' THEN jsonb_build_array(jsonb_build_object('id',s.id,'url',s.image_url)) ELSE '[]'::jsonb END,
 'seller_name',coalesce(nullif(ip.display_name,''),i.display_name),'seller_slug',ip.slug,'seller_type',i.type,
 'published_at',s.published_at,'updated_at',s.updated_at)
 FROM public.identities i LEFT JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=s.identity_id AND i.status='active';
$f$;
CREATE FUNCTION service_publication_private.visible_to_viewer(p_service uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.services s JOIN public.identities i ON i.id=s.identity_id
 LEFT JOIN public.business_accounts business ON business.id=i.business_account_id
 WHERE s.id=p_service AND NOT EXISTS(SELECT 1 FROM public.user_blocks b
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL AND
 ((b.blocker_id=public.listing_actor_uid_hosted_v1() AND b.blocked_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END)
 OR (b.blocked_id=public.listing_actor_uid_hosted_v1() AND b.blocker_id=CASE WHEN i.type='private' THEN i.user_id ELSE business.owner_user_id END))));
$f$;
CREATE FUNCTION public.get_public_service_v1(p_service_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
 SELECT service_publication_private.public_fields(s) FROM public.services s WHERE s.id=p_service_id AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id);
$f$;
CREATE FUNCTION public.search_public_services_v1(p_query text DEFAULT '',p_category text DEFAULT NULL,p_subcategory text DEFAULT NULL,
 p_country text DEFAULT NULL,p_city text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_result_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE items jsonb;total bigint;query text:=lower(btrim(coalesce(p_query,'')));
BEGIN
 IF length(query)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 100 OR p_result_offset IS NULL
 OR p_result_offset<0 OR p_result_offset>1000000 OR length(p_category)>120 OR length(p_subcategory)>160
 OR length(p_country)>120 OR length(p_city)>160 THEN RAISE EXCEPTION 'service_search_invalid' USING ERRCODE='22023';END IF;
 WITH candidates AS MATERIALIZED(SELECT s.* FROM public.services s WHERE service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
 AND (nullif(btrim(p_category),'') IS NULL OR s.category=btrim(p_category))
 AND (nullif(btrim(p_subcategory),'') IS NULL OR s.subcategory=btrim(p_subcategory))
 AND (nullif(btrim(p_country),'') IS NULL OR lower(s.country)=lower(btrim(p_country)))
 AND (nullif(btrim(p_city),'') IS NULL OR lower(s.city)=lower(btrim(p_city)))
 AND (query='' OR NOT EXISTS(SELECT 1 FROM regexp_split_to_table(query,'\s+') token
 WHERE token<>'' AND position(token IN lower(concat_ws(' ',s.title,s.description,s.category,s.subcategory,s.country,s.city,s.location)))=0))),
 page AS(SELECT * FROM candidates ORDER BY published_at DESC,created_at DESC,id LIMIT p_result_limit OFFSET p_result_offset)
 SELECT (SELECT count(*) FROM candidates),coalesce((SELECT jsonb_agg(service_publication_private.public_fields(p)
 ORDER BY p.published_at DESC,p.created_at DESC,p.id) FROM page p),'[]'::jsonb) INTO total,items;
 RETURN jsonb_build_object('schema_version',1,'items',items,'total_count',total::text,'result_limit',p_result_limit,
 'result_offset',p_result_offset,'has_more',p_result_offset+jsonb_array_length(items)<total,
 'next_offset',CASE WHEN p_result_offset+jsonb_array_length(items)<total THEN p_result_offset+jsonb_array_length(items) ELSE NULL END);
END $f$;

-- Keep the established public-profile wire while sharing the publication gate.
CREATE OR REPLACE FUNCTION public.get_public_profile_services_v1(
  p_seller_slug text,
  p_result_limit integer DEFAULT 80
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,auth,pg_temp
SET plan_cache_mode=force_custom_plan
SET timezone='UTC'
AS $fn$
DECLARE
  profile_identities uuid[];
  identity_value uuid;
  read_time timestamptz := now();
  result jsonb;
BEGIN
  IF p_seller_slug IS NULL OR char_length(p_seller_slug)<1
     OR char_length(p_seller_slug)>160 OR p_seller_slug<>btrim(p_seller_slug) THEN
    RAISE EXCEPTION 'public_profile_slug_invalid' USING ERRCODE='22023';
  END IF;
  IF p_result_limit IS NULL OR p_result_limit<1 OR p_result_limit>80 THEN
    RAISE EXCEPTION 'public_profile_limit_invalid' USING ERRCODE='22023';
  END IF;

  -- Two matches are enough to reject an ambiguous legacy slug. Resolve once in
  -- this statement snapshot; active-owner state never changes the public scope.
  SELECT array_agg(candidate.identity_id) INTO profile_identities
  FROM (
    SELECT ip.identity_id
    FROM public.identity_profiles ip
    JOIN public.identities i ON i.id=ip.identity_id AND i.status='active'
    WHERE ip.slug=p_seller_slug
    LIMIT 2
  ) candidate;
  IF cardinality(profile_identities)=1 THEN
    identity_value := profile_identities[1];
  END IF;

  WITH page AS MATERIALIZED (
    SELECT s.id,s.identity_id,s.title,s.description,s.category,s.subcategory,
      s.image_url,s.price_amount,s.currency,s.price_type,s.country,s.city,
      s.location,s.status,s.sort_order,s.published_at,s.created_at,s.updated_at
    FROM public.services s
    WHERE s.identity_id=identity_value AND service_publication_private.is_public(s.id) AND service_publication_private.visible_to_viewer(s.id)
    ORDER BY s.sort_order ASC,s.created_at ASC,s.id ASC
    LIMIT p_result_limit
  ), cards AS (
    SELECT p.sort_order,p.created_at,p.id,
      jsonb_build_object(
        'id',p.id::text,
        'identity_id',p.identity_id::text,
        'title',p.title,
        'description',p.description,
        'category',p.category,
        'subcategory',p.subcategory,
        'image_url',p.image_url,
        'price_amount',p.price_amount::text,
        'currency',p.currency,
        'price_type',p.price_type,
        'country',p.country,
        'city',p.city,
        'location',p.location,
        'status',p.status,
        'sort_order',p.sort_order,
        'published_at',p.published_at,
        'created_at',p.created_at,
        'updated_at',p.updated_at,
        'images',coalesce(gallery.images,'[]'::jsonb)
      ) AS card
    FROM page p
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',image.id::text,
          'identity_id',image.identity_id::text,
          'service_id',image.service_id::text,
          'original_url',image.original_url,
          'medium_url',image.medium_url,
          'thumb_url',image.thumb_url,
          'sort_order',image.sort_order,
          'is_primary',image.is_primary,
          'created_at',image.created_at
        ) ORDER BY image.is_primary DESC,image.sort_order ASC,
          image.created_at ASC,image.id ASC
      ) AS images
      FROM (
        SELECT si.id,si.identity_id,si.service_id,si.original_url,si.medium_url,
          si.thumb_url,si.sort_order,si.is_primary,si.created_at
        FROM public.service_images si
        WHERE si.service_id=p.id AND si.identity_id=identity_value
        ORDER BY si.is_primary DESC,si.sort_order ASC,si.created_at ASC,si.id ASC
        LIMIT 10
      ) image
    ) gallery ON true
  )
  SELECT jsonb_build_object(
    'schema_version',1,
    'content_scope','public_profile_services',
    'seller_slug',p_seller_slug,
    'identity_id',identity_value::text,
    'profile_available',identity_value IS NOT NULL,
    'result_limit',p_result_limit,
    'read_at',read_time,
    'items',coalesce((
      SELECT jsonb_agg(c.card ORDER BY c.sort_order ASC,c.created_at ASC,c.id ASC)
      FROM cards c
    ),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END $fn$;

-- COMPONENT 07_contact.sql
CREATE TABLE service_publication_private.contact_receipts(
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 service_id uuid NOT NULL,conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 PRIMARY KEY(actor_user_id,request_key));
CREATE TABLE service_publication_private.thread_context(
 conversation_id bigint PRIMARY KEY REFERENCES public.conversations(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL,card jsonb NOT NULL);
CREATE TABLE service_publication_private.message_cards(
 message_id bigint PRIMARY KEY REFERENCES public.messages(id) ON DELETE RESTRICT,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 service_id uuid NOT NULL,card jsonb NOT NULL);
ALTER TABLE service_publication_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_publication_private.thread_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_publication_private.message_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON service_publication_private.contact_receipts,service_publication_private.thread_context,
 service_publication_private.message_cards FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA service_publication_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON service_publication_private.contact_receipts,service_publication_private.message_cards TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT,UPDATE ON service_publication_private.thread_context TO selqiro_listing_contact_writer_v1;
CREATE POLICY contact_writer ON service_publication_private.contact_receipts TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON service_publication_private.thread_context TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY contact_writer ON service_publication_private.message_cards TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);



CREATE FUNCTION service_publication_private.contact_snapshot(p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE s public.services%ROWTYPE;identity public.identities%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO s FROM public.services WHERE id=p_service_id FOR SHARE;
 IF NOT FOUND OR NOT service_publication_private.is_public(s.id) THEN
  RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 SELECT * INTO identity FROM public.identities WHERE id=s.identity_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 IF identity.type='private' THEN owner_user:=identity.user_id;
 ELSE SELECT owner_user_id INTO owner_user FROM public.business_accounts WHERE id=identity.business_account_id FOR SHARE;
 END IF;
 IF owner_user IS NULL THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('user_id',owner_user,'identity_id',s.identity_id,
 'card',jsonb_build_object('content_type','service','id',s.id,'title',left(s.title,200),
 'image',coalesce(s.image_url,(service_publication_private.image_projection(s.id,false)->0->>'url')),'price',NULL));
END $f$;

CREATE FUNCTION public.contact_my_service_provider_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_service_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE old service_publication_private.contact_receipts%ROWTYPE;s jsonb;card jsonb;owner_user uuid;owner_identity uuid;
 cid bigint;candidate bigint;first_u uuid;first_i uuid;second_u uuid;second_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);
 IF p_service_id IS NULL THEN RAISE EXCEPTION 'service_contact_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO old FROM service_publication_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id<>p_expected_identity_id OR old.service_id<>p_service_id THEN
   RAISE EXCEPTION 'service_contact_request_conflict' USING ERRCODE='22023'; END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'request_key',p_request_key,'service_id',p_service_id,'conversation_id',old.conversation_id::text,'replayed',true);
 END IF;
 s:=service_publication_private.contact_snapshot(p_service_id);card:=s->'card';
 owner_user:=(s->>'user_id')::uuid;owner_identity:=(s->>'identity_id')::uuid;
 IF owner_user=p_expected_user_id OR owner_identity=p_expected_identity_id THEN
  RAISE EXCEPTION 'service_contact_self' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_peer(owner_user,owner_identity);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,owner_user);
 IF p_expected_user_id<owner_user THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=owner_user;second_i:=owner_identity;
 ELSE first_u:=owner_user;first_i:=owner_identity;second_u:=p_expected_user_id;second_i:=p_expected_identity_id; END IF;
 candidate:=nextval('public.conversations_id_seq');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
   created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,NULL,card->>'title',card->>'image',NULL,p_expected_user_id,t,t,p_expected_user_id,owner_user,p_expected_identity_id,owner_identity);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
   VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,owner_user,owner_identity,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
   AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_contact_unavailable' USING ERRCODE='42501'; END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=NULL,listing_title_snapshot=card->>'title',listing_image_snapshot=card->>'image',
   listing_price_snapshot=NULL,updated_at=clock_timestamp(),archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO service_publication_private.thread_context(conversation_id,service_id,card) VALUES(cid,p_service_id,card)
 ON CONFLICT(conversation_id) DO UPDATE SET service_id=excluded.service_id,card=excluded.card;
 INSERT INTO service_publication_private.contact_receipts(actor_user_id,request_key,identity_id,service_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,p_service_id,cid);
 RETURN jsonb_build_object('schema_version',1,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'request_key',p_request_key,'service_id',p_service_id,'conversation_id',cid::text,'replayed',false);
END $f$;

CREATE FUNCTION service_publication_private.capture_message_card()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user='selqiro_listing_contact_writer_v1' AND NEW.listing_id IS NULL THEN
  INSERT INTO service_publication_private.message_cards(message_id,conversation_id,service_id,card)
  SELECT NEW.id,NEW.conversation_id,h.service_id,h.card FROM service_publication_private.thread_context h
  JOIN public.conversations c ON c.id=h.conversation_id AND c.listing_id IS NULL
  WHERE h.conversation_id=NEW.conversation_id;
 END IF;
 RETURN NEW;
END $f$;

CREATE TRIGGER service_message_context AFTER INSERT ON public.messages FOR EACH ROW
 EXECUTE FUNCTION service_publication_private.capture_message_card();
-- Each shared channel has one current marketplace context. Only that pointer
-- is superseded; historical per-message cards are immutable and remain intact.
CREATE FUNCTION service_publication_private.select_current_context() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user<>'selqiro_listing_contact_writer_v1' THEN RAISE EXCEPTION 'service_contact_writer_required' USING ERRCODE='42501';END IF;
 IF TG_TABLE_SCHEMA='service_publication_private' THEN
  DELETE FROM horse_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
 ELSE DELETE FROM service_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER service_select_context AFTER INSERT OR UPDATE ON service_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();
CREATE TRIGGER horse_select_context AFTER INSERT OR UPDATE ON horse_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION service_publication_private.select_current_context();

CREATE OR REPLACE FUNCTION public.get_my_marketplace_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE r jsonb;context jsonb;items jsonb;cid bigint;
BEGIN
 r:=public.get_my_message_thread_v2(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,p_attachment_listing_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF r->'listing'='null'::jsonb THEN
  SELECT jsonb_build_object('id',h.horse_offer_id,'title',h.card->>'title','content_type','horse_offer') INTO context
  FROM horse_publication_private.thread_context h JOIN public.conversations c ON c.id=h.conversation_id AND c.listing_id IS NULL
  WHERE h.conversation_id=cid;
  IF context IS NULL THEN
  SELECT jsonb_build_object('id',s.service_id,'title',s.card->>'title','content_type','service') INTO context
  FROM service_publication_private.thread_context s JOIN public.conversations c ON c.id=s.conversation_id AND c.listing_id IS NULL
  WHERE s.conversation_id=cid;
 END IF;
 IF context IS NOT NULL THEN r:=jsonb_set(r,'{listing}',context); END IF;
 END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN m.item->'listing'='null'::jsonb AND hc.card IS NOT NULL
  THEN jsonb_set(m.item,'{listing}',hc.card) WHEN m.item->'listing'='null'::jsonb AND sc.card IS NOT NULL THEN jsonb_set(m.item,'{listing}',sc.card) ELSE m.item END ORDER BY m.ordinal),'[]'::jsonb) INTO items
 FROM jsonb_array_elements(r->'messages') WITH ORDINALITY m(item,ordinal)
 LEFT JOIN horse_publication_private.message_cards hc ON hc.message_id=(m.item->>'id')::bigint AND hc.conversation_id=cid
 LEFT JOIN service_publication_private.message_cards sc ON sc.message_id=(m.item->>'id')::bigint AND sc.conversation_id=cid;
 RETURN jsonb_set(r,'{messages}',items);
END $f$;

-- COMPONENT 08_authority.sql
-- Old browser writers cannot bypass the service command/revision boundary.
REVOKE ALL ON FUNCTION public.save_my_service_v2(uuid,text,text,text,text,text,numeric,text,text,text,text,text,double precision,double precision),
 public.set_my_service_status_v2(uuid,text),public.add_my_service_image_v2(uuid,text,text,text,text),
 public.set_my_service_primary_image_v2(uuid,uuid),public.delete_my_service_image_v2(uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.can_manage_service_storage_v2(p_service_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,auth,storage,pg_temp AS $f$
 SELECT false;
$f$;
REVOKE ALL ON public.services,public.service_images FROM PUBLIC,anon,authenticated;

DO $authority$ DECLARE name text;BEGIN
 FOREACH name IN ARRAY ARRAY['events','heads','commands','closed_requests','gallery'] LOOP
  EXECUTE format('ALTER TABLE service_publication_private.%I ENABLE ROW LEVEL SECURITY',name);
  EXECUTE format('REVOKE ALL ON service_publication_private.%I FROM PUBLIC,anon,authenticated,service_role',name);
  EXECUTE format('GRANT SELECT ON service_publication_private.%I TO selqiro_listing_final_writer_v1',name);
  EXECUTE format('CREATE POLICY service_final_read ON service_publication_private.%I FOR SELECT TO selqiro_listing_final_writer_v1 USING(true)',name);
 END LOOP;
END $authority$;
GRANT USAGE ON SCHEMA service_publication_private TO selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;
GRANT SELECT ON public.services,public.service_images TO selqiro_listing_final_writer_v1;
CREATE POLICY service_writer_read ON public.services FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY service_writer_read ON public.service_images FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA service_publication_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA service_publication_private TO selqiro_listing_final_writer_v1;
GRANT EXECUTE ON FUNCTION service_publication_private.contact_snapshot(uuid),service_publication_private.capture_message_card(),
 service_publication_private.select_current_context() TO selqiro_listing_contact_writer_v1;
GRANT DELETE ON horse_publication_private.thread_context,service_publication_private.thread_context TO selqiro_listing_contact_writer_v1;

GRANT CREATE ON SCHEMA service_publication_private TO selqiro_listing_final_writer_v1;
ALTER FUNCTION service_publication_private.close_published_attempt(uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
REVOKE CREATE ON SCHEMA service_publication_private FROM selqiro_listing_final_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text) OWNER TO selqiro_listing_final_writer_v1;
ALTER FUNCTION public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_final_writer_v1,selqiro_listing_contact_writer_v1;

REVOKE ALL ON FUNCTION public.prepare_my_service_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb),
 public.get_my_service_publication_attempt_v1(uuid,uuid,uuid,uuid),public.publish_my_service_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_service_publication_v1(uuid,uuid,uuid,uuid),public.get_my_service_publication_snapshot_v1(uuid,uuid,uuid),
 public.get_my_service_publications_v1(uuid,uuid,integer,integer),public.set_my_service_activity_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_service_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),public.get_my_service_media_binding_v1(uuid,uuid,uuid,integer),
 public.get_public_service_media_binding_v1(uuid,integer),public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid),
 public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text),public.get_public_service_v1(uuid),
 public.search_public_services_v1(text,text,text,text,text,integer,integer),public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_service_publication_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb,jsonb),
 public.get_my_service_publication_attempt_v1(uuid,uuid,uuid,uuid),public.publish_my_service_v1(uuid,uuid,uuid,uuid),
 public.cancel_my_service_publication_v1(uuid,uuid,uuid,uuid),public.get_my_service_publication_snapshot_v1(uuid,uuid,uuid),
 public.get_my_service_publications_v1(uuid,uuid,integer,integer),public.set_my_service_activity_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_service_publication_image_binding_v1(uuid,uuid,uuid,uuid,uuid),public.get_my_service_media_binding_v1(uuid,uuid,uuid,integer),
 public.contact_my_service_provider_v1(uuid,uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_service_v1(uuid),public.search_public_services_v1(text,text,text,text,text,integer,integer)
 TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_service_media_binding_v1(uuid,integer),
 public.claim_service_publication_cleanup_v1(uuid,uuid,uuid,uuid),public.record_service_publication_cleanup_v1(uuid,uuid,uuid,uuid,uuid,uuid,text)
 TO service_role;

-- Preserve a legacy/inactive category pair when the owner changes other fields.
create or replace function
  public.validate_service_category_pair_v2()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if TG_OP='UPDATE' and NEW.category is not distinct from OLD.category and NEW.subcategory is not distinct from OLD.subcategory then return NEW; end if;
  new.category :=
    nullif(
      btrim(
        coalesce(
          new.category,
          ''
        )
      ),
      ''
    );

  new.subcategory :=
    nullif(
      btrim(
        coalesce(
          new.subcategory,
          ''
        )
      ),
      ''
    );

  if not public.is_valid_service_category_pair_v2(
    new.category,
    new.subcategory
  ) then
    raise exception
      'Service category selection is invalid.'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;
