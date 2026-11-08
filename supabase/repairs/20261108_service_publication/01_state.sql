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
