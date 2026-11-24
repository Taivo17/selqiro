CREATE OR REPLACE FUNCTION messaging_private_v2.guard_account_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=auth.uid();active_identity uuid;c public.conversations%ROWTYPE;
BEGIN
 -- Legacy callers still pass normal existing RLS. Independently verify the
 -- actual authenticated sender and selected identity; service maintenance has
 -- no auth subject but must still target an exact legitimate two-party thread.
 IF actor IS NOT NULL THEN
  IF NEW.sender_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
  SELECT active_identity_id INTO active_identity FROM public.profiles WHERE id=actor FOR SHARE;
  IF active_identity IS DISTINCT FROM NEW.sender_identity_id OR active_identity IS NULL THEN
   RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM listing_contact_private.require_peer(NEW.sender_id,NEW.sender_identity_id);
 LOCK TABLE public.user_blocks IN SHARE MODE;
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=NEW.conversation_id FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(NEW.conversation_id,NEW.sender_id,NEW.sender_identity_id)
 OR EXISTS(SELECT 1 FROM public.conversation_participants cp JOIN public.user_blocks b ON
   ((b.blocker_id=NEW.sender_id AND b.blocked_id=cp.user_id) OR (b.blocker_id=cp.user_id AND b.blocked_id=NEW.sender_id))
  WHERE cp.conversation_id=NEW.conversation_id AND cp.user_id IS DISTINCT FROM NEW.sender_id) THEN
  RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 -- Both participants come from the locked, exact two-party conversation.
 PERFORM listing_contact_private.require_available_accounts_v1(c.buyer_id,c.seller_id);
 -- A legacy INSERT may have allocated its default ID before waiting for this
 -- conversation. Allocate the final ID only AFTER this lock, so a late commit
 -- cannot arrive permanently below an already acknowledged message watermark.
 -- The new controlled sender already allocated under this same lock and bound
 -- its private deferred receipt; preserve exactly that independently bound ID.
 IF NOT EXISTS(SELECT 1 FROM messaging_private_v2.send_receipts r WHERE r.message_id=NEW.id
   AND r.actor_user_id=NEW.sender_id AND r.identity_id=NEW.sender_identity_id AND r.conversation_id=NEW.conversation_id) THEN
  NEW.id:=nextval('public.messages_id_seq');NEW.created_at:=clock_timestamp();
 END IF;
 IF NOT public.listing_contact_is_managed_v1(c.id,c.listing_id) THEN
  UPDATE public.conversations SET updated_at=clock_timestamp(),archived_at=NULL WHERE id=c.id;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=c.id;
 END IF;
 RETURN NEW;
END $f$;
