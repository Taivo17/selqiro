-- ONLY the new isolated integration database. This is not a release privilege file.
DO $gate$ BEGIN IF current_database()<>'selqiro_publication_attempt_fixture' OR current_user<>'postgres'
 THEN RAISE EXCEPTION 'listing_contact_disposable_helper_required'; END IF; END $gate$;
GRANT EXECUTE ON FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
 public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),
 public.get_my_listing_conversation_v1(uuid,uuid,text,text),public.list_my_listing_conversations_v1(uuid,uuid,text),
 public.listing_contact_is_managed_v1(bigint,bigint),public.listing_contact_visible_v1(bigint)
 TO authenticated;
GRANT EXECUTE ON FUNCTION public.listing_contact_is_managed_v1(bigint,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_my_listing_publication_v1(uuid,uuid,uuid,jsonb,jsonb),
 public.get_my_listing_publication_confirmation_v1(uuid,uuid,uuid),public.publish_my_listing_v1(uuid,uuid,uuid,text),
 public.delete_my_published_listing_v1(uuid,uuid,text) TO authenticated;
