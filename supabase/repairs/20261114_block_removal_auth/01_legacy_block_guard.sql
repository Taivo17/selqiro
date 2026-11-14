-- Keep the exact legacy create-only behavior. Removal requires the existing
-- public.set_my_provider_control_v1 blocked_account row-CAS contract.
CREATE OR REPLACE FUNCTION messaging_private_v2.set_block(p_user uuid,p_identity uuid,p_conversation bigint,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;peer_u uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_user,p_identity);
 c:=messaging_private_v2.require_thread(p_conversation,p_user,p_identity);
 IF p_blocked IS NULL THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 IF NOT p_blocked THEN
  RAISE EXCEPTION 'message_block_removal_version_required' USING ERRCODE='42501';
 END IF;
 peer_u:=CASE WHEN c.buyer_id=p_user THEN c.seller_id ELSE c.buyer_id END;
 LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(p_user,peer_u) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
END $f$;
