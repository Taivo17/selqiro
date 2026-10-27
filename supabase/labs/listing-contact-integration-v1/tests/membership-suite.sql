-- Existing membership semantics, explicit two-account channel ownership.
INSERT INTO public.business_accounts(id,owner_user_id,name) VALUES('d4000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000002','Contact business fixture');
INSERT INTO public.business_members(business_account_id,user_id,role,status) VALUES
 ('d4000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-000000000002','owner','active'),
 ('d4000000-0000-0000-0000-000000000004','93000000-0000-0000-0000-000000000003','member','active');
INSERT INTO public.identities(id,type,business_account_id,display_name) VALUES('d4100000-0000-0000-0000-000000000004','business','d4000000-0000-0000-0000-000000000004','Contact business identity');
UPDATE public.profiles SET active_identity_id='d4100000-0000-0000-0000-000000000004' WHERE id IN ('92000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000003');
SELECT contact_integration_test.boot('seller-for-business','91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001');
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.call('business-contact',format('SELECT public.contact_my_listing_seller_v1(%L,%L,%L,%L)','92000000-0000-0000-0000-000000000002','d4100000-0000-0000-0000-000000000004','14000000-0000-0000-0000-000000000001',contact_integration_test.v('seller-for-business')->>'listing_id'));
SELECT contact_integration_test.check('business_identity_channel_is_separate',contact_integration_test.v('business-contact')->>'conversation_id'<>contact_integration_test.v('contact')->>'conversation_id');
SELECT contact_integration_test.actor('93000000-0000-0000-0000-000000000003');
SELECT contact_integration_test.expect('membership_does_not_create_shared_account_inbox',format('SELECT public.get_my_listing_conversation_v1(%L,%L,%L,NULL)','93000000-0000-0000-0000-000000000003','d4100000-0000-0000-0000-000000000004',contact_integration_test.v('business-contact')->>'conversation_id'),'42501','listing_contact_unavailable');
UPDATE public.business_members SET status='inactive' WHERE business_account_id='d4000000-0000-0000-0000-000000000004' AND user_id='92000000-0000-0000-0000-000000000002';
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.expect('withdrawn_member_cannot_read_channel',format('SELECT public.get_my_listing_conversation_v1(%L,%L,%L,NULL)','92000000-0000-0000-0000-000000000002','d4100000-0000-0000-0000-000000000004',contact_integration_test.v('business-contact')->>'conversation_id'),'42501','listing_price_identity_forbidden');
SELECT contact_integration_test.expect('withdrawn_member_cannot_send',format('SELECT public.send_my_listing_message_v1(%L,%L,%L,%L,%L,NULL)','92000000-0000-0000-0000-000000000002','d4100000-0000-0000-0000-000000000004','24000000-0000-0000-0000-000000000001',contact_integration_test.v('business-contact')->>'conversation_id','Withdrawn member'),'42501','listing_price_identity_forbidden');
SELECT contact_integration_test.actor('91000000-0000-0000-0000-000000000001');
SELECT contact_integration_test.expect('withdrawn_peer_blocks_new_send',format('SELECT public.send_my_listing_message_v1(%L,%L,%L,%L,%L,NULL)','91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','24000000-0000-0000-0000-000000000002',contact_integration_test.v('business-contact')->>'conversation_id','Peer removed'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.call('withdrawn-peer-read',format('SELECT public.get_my_listing_conversation_v1(%L,%L,%L,NULL)','91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',contact_integration_test.v('business-contact')->>'conversation_id'));
SELECT contact_integration_test.check('withdrawn_peer_read_disables_new_send',contact_integration_test.v('withdrawn-peer-read')->>'can_send'='false');
