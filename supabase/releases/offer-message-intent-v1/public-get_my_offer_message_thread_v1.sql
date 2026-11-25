CREATE FUNCTION public.get_my_offer_message_thread_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_offer_type text DEFAULT NULL,p_attachment_offer_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone='UTC' SET lock_timeout='2s' AS $f$
DECLARE r jsonb;cid bigint;attachment jsonb;header jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM messaging_private_v2.validate_offer_intent_v1(p_attachment_offer_type,p_attachment_offer_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 -- Resolve an explicit preview before the base reader locks the conversation,
 -- following the same offer -> conversation order as a send. Missing/unavailable
 -- previews are removable; they never replace a historical shared header.
 IF p_attachment_offer_type IS NOT NULL THEN
  BEGIN
   attachment:=messaging_private_v2.offer_snapshot_v1(cid,p_attachment_offer_type,p_attachment_offer_id);
  EXCEPTION WHEN insufficient_privilege THEN attachment:=NULL;
  END;
 END IF;
 r:=public.get_my_marketplace_message_thread_v2(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,NULL);
 header:=messaging_private_v2.last_shared_offer_v1(cid);
 RETURN (r-ARRAY['attachment_listing_id','attachment_listing']) || jsonb_build_object(
  'schema_version',3,'listing',header,'attachment_offer_type',p_attachment_offer_type,
  'attachment_offer_id',p_attachment_offer_id,'attachment_offer',attachment);
END $f$;
REVOKE ALL ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_my_offer_message_thread_v1(uuid,uuid,text,text,text,text) TO authenticated;
