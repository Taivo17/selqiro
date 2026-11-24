-- Account write helper remains installed and byte-exact. These entry points are
-- private, except the caller-bound boolean required by Storage RLS.
CREATE FUNCTION messaging_private_v2.require_writable_thread_v1(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS public.conversations LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;
BEGIN
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=p_conversation FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(p_conversation,p_user,p_identity) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(c.buyer_id,c.seller_id);
 RETURN c;
END $f$;

CREATE FUNCTION messaging_private_v2.guard_legacy_conversation_accounts_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid;identity_key uuid;
BEGIN
 -- Existing INVOKER guard remains responsible for managed writer permissions.
 IF public.listing_contact_is_managed_v1(CASE WHEN TG_OP='UPDATE' THEN OLD.id END,CASE WHEN TG_OP='UPDATE' THEN OLD.listing_id END)
 OR public.listing_contact_is_managed_v1(NEW.id,NEW.listing_id) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot','updated_at','archived_at']) THEN
   RAISE EXCEPTION 'message_conversation_binding_immutable' USING ERRCODE='42501'; END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  -- Retention-only archive and cleared listing snapshots do not create contact.
  IF NEW.archived_at IS NOT NULL AND (to_jsonb(NEW)-'archived_at')=(to_jsonb(OLD)-'archived_at') THEN RETURN NEW; END IF;
  IF NEW.listing_title_snapshot IS NULL AND NEW.listing_image_snapshot IS NULL AND NEW.listing_price_snapshot IS NULL
   AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
   AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot'])=
       (to_jsonb(OLD)-ARRAY['listing_id','listing_title_snapshot','listing_image_snapshot','listing_price_snapshot']) THEN RETURN NEW; END IF;
 END IF;
 actor:=auth.uid();
 -- Existing message INSERT maintenance has no JWT subject, but its nested
 -- activity update is already under the exact thread lock. Keep that narrow
 -- path while still checking both accounts and freezing every binding.
 IF TG_OP='UPDATE' AND actor IS NULL AND pg_trigger_depth()>1 AND NEW.archived_at IS NULL
 AND (to_jsonb(NEW)-ARRAY['updated_at','archived_at'])=(to_jsonb(OLD)-ARRAY['updated_at','archived_at']) THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(NEW.id,NEW.buyer_id,NEW.buyer_identity_id);
  RETURN NEW;
 END IF;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 IF actor IS NULL OR identity_key IS NULL OR NEW.buyer_id IS NULL OR NEW.seller_id IS NULL
 OR NEW.buyer_identity_id IS NULL OR NEW.seller_identity_id IS NULL
 OR NEW.buyer_id=NEW.seller_id OR NEW.buyer_identity_id=NEW.seller_identity_id
 OR NOT ((NEW.buyer_id=actor AND NEW.buyer_identity_id=identity_key) OR (NEW.seller_id=actor AND NEW.seller_identity_id=identity_key))
 OR (TG_OP='INSERT' AND NEW.created_by IS DISTINCT FROM actor) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 -- No profile/identity lock is acquired from inside an already locked UPDATE.
 -- New INSERT has no visible existing conversation to contend with.
 IF TG_OP='INSERT' THEN
  PERFORM listing_contact_private.require_peer(NEW.buyer_id,NEW.buyer_identity_id);
  PERFORM listing_contact_private.require_peer(NEW.seller_id,NEW.seller_identity_id);
 END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(NEW.buyer_id,NEW.seller_id);
 RETURN NEW;
END $f$;

CREATE FUNCTION messaging_private_v2.guard_legacy_participant_accounts_v1()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;actor uuid;identity_key uuid;
BEGIN
 IF public.listing_contact_is_managed_v1(CASE WHEN TG_OP='UPDATE' THEN OLD.conversation_id END)
 OR public.listing_contact_is_managed_v1(NEW.conversation_id) THEN RETURN NEW; END IF;
 actor:=auth.uid();
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['last_read_at','deleted_at','custom_title']) IS DISTINCT FROM
     (to_jsonb(OLD)-ARRAY['last_read_at','deleted_at','custom_title']) THEN
   RAISE EXCEPTION 'message_participant_binding_immutable' USING ERRCODE='42501'; END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  IF actor=OLD.user_id THEN RETURN NEW; END IF;
  -- The existing sender trigger may unhide the peer after a successful send.
  IF NEW.deleted_at IS NOT NULL OR (to_jsonb(NEW)-'deleted_at')<>(to_jsonb(OLD)-'deleted_at') THEN
   RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND actor IS NULL AND pg_trigger_depth()>1 AND NEW.deleted_at IS NULL
 AND (to_jsonb(NEW)-'deleted_at')=(to_jsonb(OLD)-'deleted_at') THEN
  PERFORM messaging_private_v2.require_writable_thread_v1(NEW.conversation_id,NEW.user_id,NEW.identity_id);
  RETURN NEW;
 END IF;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF NOT FOUND OR actor IS NULL OR identity_key IS NULL OR c.buyer_id IS NULL OR c.seller_id IS NULL
 OR c.buyer_identity_id IS NULL OR c.seller_identity_id IS NULL
 OR c.buyer_id=c.seller_id OR c.buyer_identity_id=c.seller_identity_id
 OR NOT ((c.buyer_id=actor AND c.buyer_identity_id=identity_key) OR (c.seller_id=actor AND c.seller_identity_id=identity_key))
 OR NOT ((NEW.user_id=c.buyer_id AND NEW.identity_id=c.buyer_identity_id) OR (NEW.user_id=c.seller_id AND NEW.identity_id=c.seller_identity_id))
 OR NEW.user_id IS NULL OR NEW.identity_id IS NULL THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' AND ((SELECT count(*) FROM public.conversation_participants WHERE conversation_id=c.id)>=2
 OR EXISTS(SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id=c.id AND
  (p.user_id IS NULL OR p.identity_id IS NULL OR NOT ((p.user_id=c.buyer_id AND p.identity_id=c.buyer_identity_id) OR (p.user_id=c.seller_id AND p.identity_id=c.seller_identity_id))))) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF TG_OP='UPDATE' AND NOT messaging_private_v2.exact_thread(c.id,actor,identity_key) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM listing_contact_private.require_available_accounts_v1(c.buyer_id,c.seller_id);
 RETURN NEW;
END $f$;

CREATE FUNCTION public.message_photo_write_available_v1(p_name text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid;identity_key uuid;cid bigint;
BEGIN
 actor:=auth.uid();
 IF actor IS NULL OR p_name IS NULL OR length(p_name)>230
 OR p_name !~ '^[1-9][0-9]{0,18}/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$' OR strpos(p_name,'..')>0 THEN RETURN false; END IF;
 BEGIN cid:=split_part(p_name,'/',1)::bigint; EXCEPTION WHEN numeric_value_out_of_range THEN RETURN false; END;
 SELECT active_identity_id INTO identity_key FROM public.profiles WHERE id=actor;
 IF identity_key IS NULL THEN RETURN false; END IF;
 PERFORM messaging_private_v2.require_writable_thread_v1(cid,actor,identity_key);
 -- Recheck selection after any conversation/account lock wait, without taking
 -- a profile lock after the conversation lock.
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND active_identity_id=identity_key) THEN RETURN false; END IF;
 RETURN true;
END $f$;

REVOKE ALL ON FUNCTION messaging_private_v2.require_writable_thread_v1(bigint,uuid,uuid),
 messaging_private_v2.guard_legacy_conversation_accounts_v1(),messaging_private_v2.guard_legacy_participant_accounts_v1(),
 public.message_photo_write_available_v1(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION messaging_private_v2.require_writable_thread_v1(bigint,uuid,uuid) TO selqiro_listing_contact_writer_v1;
GRANT EXECUTE ON FUNCTION public.message_photo_write_available_v1(text) TO authenticated;

CREATE TRIGGER guard_account_lifecycle_conversation_v1 BEFORE INSERT OR UPDATE ON public.conversations
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_legacy_conversation_accounts_v1();
CREATE TRIGGER guard_account_lifecycle_participant_v1 BEFORE INSERT OR UPDATE ON public.conversation_participants
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_legacy_participant_accounts_v1();

CREATE POLICY message_legacy_account_insert_v1 ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END);
CREATE POLICY message_legacy_account_update_v1 ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END)
 WITH CHECK(CASE WHEN bucket_id='messages' THEN CASE WHEN auth.uid() IS NULL THEN false ELSE public.message_photo_write_available_v1(name) END ELSE true END);
