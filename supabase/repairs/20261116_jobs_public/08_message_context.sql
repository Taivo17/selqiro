-- Add a context pointer without changing any old contact or reader body.
-- Only current pointers are replaced; immutable historical cards remain.
CREATE FUNCTION jobs_private.select_context() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF current_user<>'selqiro_listing_contact_writer_v1' THEN
 RAISE EXCEPTION 'job_contact_writer_required' USING ERRCODE='42501';END IF;
 IF TG_TABLE_SCHEMA='jobs_private' THEN
  DELETE FROM horse_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
  DELETE FROM service_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
 ELSE DELETE FROM jobs_private.thread_context WHERE conversation_id=NEW.conversation_id;END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_select_context AFTER INSERT OR UPDATE ON jobs_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
CREATE TRIGGER job_clear_context AFTER INSERT OR UPDATE ON service_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
CREATE TRIGGER job_clear_context AFTER INSERT OR UPDATE ON horse_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
-- Selecting an ordinary listing supersedes the current job subject. Its
-- later ON DELETE SET NULL must not revive a historical job pointer. Existing
-- conversation authority still decides whether the row may be changed.
CREATE FUNCTION jobs_private.clear_on_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 DELETE FROM jobs_private.thread_context WHERE conversation_id=NEW.id;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_clear_on_listing AFTER INSERT OR UPDATE OF listing_id ON public.conversations
 FOR EACH ROW WHEN(NEW.listing_id IS NOT NULL) EXECUTE FUNCTION jobs_private.clear_on_listing();
CREATE FUNCTION jobs_private.capture_message_card() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone='UTC' AS $f$
BEGIN
 IF current_user='selqiro_listing_contact_writer_v1' AND NEW.listing_id IS NULL THEN
  INSERT INTO jobs_private.message_cards(message_id,conversation_id,job_id,card)
  SELECT NEW.id,NEW.conversation_id,j.job_id,j.card FROM jobs_private.thread_context j
  JOIN public.conversations c ON c.id=j.conversation_id AND c.listing_id IS NULL
  WHERE j.conversation_id=NEW.conversation_id;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_message_context AFTER INSERT ON public.messages
 FOR EACH ROW EXECUTE FUNCTION jobs_private.capture_message_card();
CREATE FUNCTION public.get_my_marketplace_message_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jsonb;context jsonb;items jsonb;cid bigint;
BEGIN
 r:=public.get_my_marketplace_message_thread_v1(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,p_attachment_listing_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF r->'listing'='null'::jsonb THEN
  SELECT jsonb_build_object('id',j.job_id,'title',j.card->>'title','content_type','job') INTO context
  FROM jobs_private.thread_context j JOIN public.conversations c ON c.id=j.conversation_id AND c.listing_id IS NULL
  WHERE j.conversation_id=cid;
  IF context IS NOT NULL THEN r:=jsonb_set(r,'{listing}',context);END IF;
 END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN m.item->'listing'='null'::jsonb AND j.card IS NOT NULL
 THEN jsonb_set(m.item,'{listing}',j.card) ELSE m.item END ORDER BY m.ordinal),'[]'::jsonb) INTO items
 FROM jsonb_array_elements(r->'messages') WITH ORDINALITY m(item,ordinal)
 LEFT JOIN jobs_private.message_cards j ON j.message_id=(m.item->>'id')::bigint AND j.conversation_id=cid;
 RETURN jsonb_set(r,'{messages}',items);
END $f$;
