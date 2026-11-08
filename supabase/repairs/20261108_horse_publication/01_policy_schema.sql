-- Horse offers remain canonical UUID records. This repair creates no listings.
CREATE SCHEMA horse_publication_private;
REVOKE ALL ON SCHEMA horse_publication_private FROM PUBLIC,anon,authenticated,service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA horse_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE horse_publication_private.commands (
 attempt_id uuid PRIMARY KEY REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 horse_offer_id uuid NOT NULL REFERENCES public.horse_offers(id) ON DELETE RESTRICT,
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL,
 base_revision bigint NOT NULL CHECK(base_revision>0),
 proposed_content jsonb NOT NULL CHECK(jsonb_typeof(proposed_content)='object'),
 gallery_intent jsonb NOT NULL CHECK(jsonb_typeof(gallery_intent)='array' AND jsonb_array_length(gallery_intent)<=10),
 confirmation_snapshot jsonb NOT NULL CHECK(jsonb_typeof(confirmation_snapshot)='object'),
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN('prepared','published','cancelled')),
 publication_event_id uuid REFERENCES public.horse_offer_publication_events(id) ON DELETE RESTRICT,
 published_revision bigint,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_user_id,request_key),
 CHECK((state='published' AND publication_event_id IS NOT NULL AND published_revision IS NOT NULL)
    OR (state IN('prepared','cancelled') AND publication_event_id IS NULL AND published_revision IS NULL))
);
CREATE TABLE horse_publication_private.closed_requests (
 actor_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 closed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key)
);
CREATE TABLE horse_publication_private.gallery (
 image_id uuid PRIMARY KEY REFERENCES public.horse_offer_images(id) ON DELETE CASCADE,
 horse_offer_id uuid NOT NULL REFERENCES public.horse_offers(id) ON DELETE CASCADE,
 attempt_id uuid NOT NULL REFERENCES listing_publication_private.attempts(id) ON DELETE RESTRICT,
 slot_id uuid NOT NULL REFERENCES listing_publication_private.slots(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL REFERENCES listing_publication_private.objects(id) ON DELETE RESTRICT,
 ready_id uuid NOT NULL,
 web_sha256 bytea NOT NULL CHECK(octet_length(web_sha256)=32),
 web_bytes integer NOT NULL CHECK(web_bytes BETWEEN 1 AND 4194304),
 UNIQUE(attempt_id,slot_id)
);
ALTER TABLE horse_publication_private.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_publication_private.closed_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE horse_publication_private.gallery ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA horse_publication_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA horse_publication_private TO selqiro_listing_final_writer_v1;
GRANT SELECT ON ALL TABLES IN SCHEMA horse_publication_private TO selqiro_listing_final_writer_v1;
CREATE POLICY horse_command_writer_read ON horse_publication_private.commands FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY horse_gallery_writer_read ON horse_publication_private.gallery FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
CREATE POLICY horse_closed_writer_read ON horse_publication_private.closed_requests FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);

CREATE FUNCTION horse_publication_private.protect_command() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'prepared' OR NEW.state NOT IN('published','cancelled')
  OR (to_jsonb(NEW)-ARRAY['state','publication_event_id','published_revision']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['state','publication_event_id','published_revision']) THEN
  RAISE EXCEPTION 'horse_publication_receipt_immutable' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER protect_horse_command BEFORE UPDATE OR DELETE ON horse_publication_private.commands
 FOR EACH ROW EXECUTE FUNCTION horse_publication_private.protect_command();

-- The canonical EE policy set is locked before recording or checking consent.
-- Extra currently required horse terms fail closed until their UI is supported.
CREATE FUNCTION horse_publication_private.current_policies() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE result jsonb; t timestamptz;
BEGIN
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;
 t:=clock_timestamp();
 SELECT jsonb_agg(jsonb_build_object('document_id',p.id,'version',p.policy_version,'content_hash',p.content_hash)
  ORDER BY p.policy_key,p.id) INTO result
 FROM public.publication_policy_documents p
 WHERE p.status='active' AND p.locale='et-EE' AND 'horse_offer'=ANY(p.applies_to_content_types)
  AND p.effective_from<=t AND (p.effective_until IS NULL OR p.effective_until>t)
  AND ((p.policy_key='marketplace-general' AND p.country_code IS NULL)
    OR (p.policy_key='horse-offer-ee' AND p.country_code='EE'));
 IF coalesce(jsonb_array_length(result),0)<>2 OR EXISTS(
  SELECT 1 FROM public.publication_policy_documents p
  WHERE p.status='active' AND p.locale='et-EE' AND 'horse_offer'=ANY(p.applies_to_content_types)
   AND (p.country_code IS NULL OR p.country_code='EE') AND p.requires_user_acceptance
   AND p.effective_from<=t AND (p.effective_until IS NULL OR p.effective_until>t)
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result) x WHERE (x->>'document_id')::uuid=p.id)) THEN
  RAISE EXCEPTION 'horse_offer_policy_unavailable' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p
  WHERE p.id=(SELECT (x->>'document_id')::uuid FROM jsonb_array_elements(result) x
   JOIN public.publication_policy_documents q ON q.id=(x->>'document_id')::uuid WHERE q.policy_key='horse-offer-ee')
  AND p.metadata @> '{"market_country_code":"EE","horse_location_country_code":"EE","cross_border_flow":false,"ai_moderation_mode":"off"}'::jsonb
  AND p.metadata->'supported_offer_types' @> '["sale","free_transfer","lease","co_rider","wanted"]'::jsonb) THEN
  RAISE EXCEPTION 'horse_offer_policy_unavailable' USING ERRCODE='55000'; END IF;
 RETURN result;
END $f$;

CREATE FUNCTION horse_publication_private.accept_shown_policies(p_user uuid,p_identity uuid,p_shown jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE required jsonb; shown jsonb; item jsonb; doc public.publication_policy_documents%ROWTYPE;
BEGIN
 required:=horse_publication_private.current_policies();
 IF p_shown IS NULL OR jsonb_typeof(p_shown)<>'array' OR jsonb_array_length(p_shown)<>2 THEN
  RAISE EXCEPTION 'horse_offer_policy_consent_required' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_shown) LOOP
  IF jsonb_typeof(item)<>'object' OR item-'documentId'-'version'-'contentHash'-'accepted'<>'{}'::jsonb
   OR item->'accepted' IS DISTINCT FROM 'true'::jsonb
   OR jsonb_typeof(item->'documentId') IS DISTINCT FROM 'string'
   OR jsonb_typeof(item->'version') IS DISTINCT FROM 'string'
   OR item->>'contentHash' !~'^[0-9a-f]{64}$' THEN
   RAISE EXCEPTION 'horse_offer_policy_consent_required' USING ERRCODE='22023'; END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('document_id',(x->>'documentId')::uuid,'version',x->>'version','content_hash',x->>'contentHash')
  ORDER BY p.policy_key,p.id) INTO shown FROM jsonb_array_elements(p_shown) x
  JOIN public.publication_policy_documents p ON p.id=(x->>'documentId')::uuid;
 IF shown IS DISTINCT FROM required THEN RAISE EXCEPTION 'publication_policy_changed' USING ERRCODE='42501'; END IF;
 FOR doc IN SELECT p.* FROM public.publication_policy_documents p
  JOIN jsonb_array_elements(required) x ON p.id=(x->>'document_id')::uuid LOOP
  INSERT INTO public.user_publication_policy_acceptances(user_id,identity_id,policy_document_id,
   policy_key,policy_version,country_code,locale,content_hash,acceptance_source)
  VALUES(p_user,p_identity,doc.id,doc.policy_key,doc.policy_version,doc.country_code,doc.locale,doc.content_hash,'publication_gate')
  ON CONFLICT(user_id,policy_document_id) DO NOTHING;
 END LOOP;
 RETURN required;
END $f$;

CREATE FUNCTION horse_publication_private.require_policies() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
DECLARE required jsonb; actor uuid:=public.listing_actor_uid_hosted_v1(); item jsonb;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'horse_offer_authentication_required' USING ERRCODE='42501'; END IF;
 required:=horse_publication_private.current_policies();
 FOR item IN SELECT value FROM jsonb_array_elements(required) LOOP
  PERFORM 1 FROM public.user_publication_policy_acceptances a
  WHERE a.user_id=actor AND a.policy_document_id=(item->>'document_id')::uuid
   AND a.policy_version=item->>'version' AND a.content_hash=item->>'content_hash' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'horse_offer_policy_consent_required' USING ERRCODE='42501'; END IF;
 END LOOP;
 RETURN required;
END $f$;

CREATE FUNCTION horse_publication_private.confirmations(p_type text,p_input jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
DECLARE names text[]:=ARRAY['publisher_confirms_age_18_or_over','publisher_confirms_information_accurate',
 'publisher_accepts_transaction_responsibility','publisher_confirms_not_for_slaughter']; key text; result jsonb:='{}';
BEGIN
 IF p_input IS NULL OR jsonb_typeof(p_input)<>'object' OR octet_length(p_input::text)>2048 THEN
  RAISE EXCEPTION 'horse_offer_confirmations_required' USING ERRCODE='22023'; END IF;
 IF p_type<>'wanted' THEN names:=names||ARRAY['publisher_is_owner_or_authorized','publisher_confirms_horse_identified',
  'publisher_confirms_passport_available']; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_input) k WHERE k<>ALL(ARRAY[
  'publisher_confirms_age_18_or_over','publisher_confirms_information_accurate','publisher_accepts_transaction_responsibility',
  'publisher_confirms_not_for_slaughter','publisher_is_owner_or_authorized','publisher_confirms_horse_identified','publisher_confirms_passport_available'])) THEN
  RAISE EXCEPTION 'horse_offer_confirmations_invalid' USING ERRCODE='22023'; END IF;
 FOREACH key IN ARRAY names LOOP
  IF p_input->key IS DISTINCT FROM 'true'::jsonb THEN
   RAISE EXCEPTION 'horse_offer_confirmations_required' USING ERRCODE='22023'; END IF;
  result:=result||jsonb_build_object(key,true);
 END LOOP;
 RETURN result;
END $f$;
