-- Continue the same new journey after terminal listing deletion.
CREATE FUNCTION contact_integration_test.get_sql(before_id text DEFAULT NULL) RETURNS text LANGUAGE sql AS $f$
 SELECT format('SELECT public.get_my_listing_conversation_v1(%L,%L,%L,%L)',
 '92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002',contact_integration_test.v('contact')->>'conversation_id',before_id) $f$;
SELECT contact_integration_test.check('anonymous_has_no_contact_or_read_authority',
 NOT has_function_privilege('anon','public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)','EXECUTE')
 AND NOT has_function_privilege('anon','public.get_my_listing_conversation_v1(uuid,uuid,text,text)','EXECUTE'));
SELECT contact_integration_test.call('get-deleted',contact_integration_test.get_sql());
SELECT contact_integration_test.check('read_after_delete_retains_own_text',
 jsonb_array_length(contact_integration_test.v('get-deleted')->'messages')=3
 AND contact_integration_test.v('get-deleted')->'messages'->0->>'text'='  My own message, preserved.  '
 AND contact_integration_test.v('get-deleted')->'messages'->0->>'mine'='true');
SELECT contact_integration_test.check('read_after_delete_has_no_automatic_listing',contact_integration_test.v('get-deleted')->'listing'='null'::jsonb);
SELECT contact_integration_test.check('read_has_bounded_peer_label_and_capability',contact_integration_test.v('get-deleted')->>'peer_name'='Contact seller fixture' AND contact_integration_test.v('get-deleted')->>'can_send'='true');
SELECT contact_integration_test.call('list',format('SELECT public.list_my_listing_conversations_v1(%L,%L,NULL)','92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002'));
SELECT contact_integration_test.check('list_only_current_identity_channels',jsonb_array_length(contact_integration_test.v('list')->'conversations')=1);
SELECT contact_integration_test.actor('93000000-0000-0000-0000-000000000003');
SELECT contact_integration_test.expect('read_spoofed_actor_rejected',contact_integration_test.get_sql(),'42501','publication_account_changed');
SELECT contact_integration_test.expect('read_unrelated_conversation_rejected',format('SELECT public.get_my_listing_conversation_v1(%L,%L,%L,NULL)','93000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-000000000003',contact_integration_test.v('contact')->>'conversation_id'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');
INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.call('get-blocked',contact_integration_test.get_sql());
SELECT contact_integration_test.check('blocked_history_readable_with_send_disabled',jsonb_array_length(contact_integration_test.v('get-blocked')->'messages')=3 AND contact_integration_test.v('get-blocked')->>'can_send'='false');
DELETE FROM public.user_blocks WHERE blocker_id='91000000-0000-0000-0000-000000000001' AND blocked_id='92000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET active_identity_id='b2100000-0000-0000-0000-000000000002' WHERE id='92000000-0000-0000-0000-000000000002';
SELECT contact_integration_test.expect('read_stale_identity_rejected',contact_integration_test.get_sql(),'42501','listing_price_identity_changed');
SELECT contact_integration_test.call('list-other',format('SELECT public.list_my_listing_conversations_v1(%L,%L,NULL)','92000000-0000-0000-0000-000000000002','b2100000-0000-0000-0000-000000000002'));
SELECT contact_integration_test.check('list_other_identity_has_no_channel',jsonb_array_length(contact_integration_test.v('list-other')->'conversations')=0);
UPDATE public.profiles SET active_identity_id='b2000000-0000-0000-0000-000000000002' WHERE id='92000000-0000-0000-0000-000000000002';
DO $more$ DECLARE n integer; BEGIN FOR n IN 1..51 LOOP
 PERFORM contact_integration_test.call('page-message-'||n,contact_integration_test.send_sql(gen_random_uuid(),'Page message '||n)); END LOOP; END $more$;
SELECT contact_integration_test.call('get-page',contact_integration_test.get_sql());
SELECT contact_integration_test.check('read_page_limit_50_with_cursor',jsonb_array_length(contact_integration_test.v('get-page')->'messages')=50 AND contact_integration_test.v('get-page')->>'next_before_message_id' IS NOT NULL);
SELECT contact_integration_test.call('get-older',contact_integration_test.get_sql(contact_integration_test.v('get-page')->>'next_before_message_id'));
SELECT contact_integration_test.check('read_keyset_next_page_retains_all_messages',jsonb_array_length(contact_integration_test.v('get-older')->'messages')=4 AND contact_integration_test.v('get-older')->>'next_before_message_id' IS NULL);
SELECT contact_integration_test.check('read_pages_do_not_overlap',NOT EXISTS(SELECT 1 FROM jsonb_array_elements(contact_integration_test.v('get-page')->'messages') a JOIN jsonb_array_elements(contact_integration_test.v('get-older')->'messages') b ON a->>'id'=b->>'id'));
SELECT contact_integration_test.expect('read_invalid_cursor_rejected',contact_integration_test.get_sql('01'),'22023','listing_contact_input');
