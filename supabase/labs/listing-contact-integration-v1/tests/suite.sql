-- New contact integration assertions only; driver supplies BEGIN / ROLLBACK.
CREATE FUNCTION contact_integration_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'contact_integration_failed:%',label; END IF; RETURN 'PASS|'||label; END $f$;
CREATE FUNCTION contact_integration_test.expect(label text,q text,state text,expected_message text DEFAULT NULL) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE got text;msg text;
BEGIN
 SET LOCAL ROLE authenticated;
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE,msg=MESSAGE_TEXT; END;
 RESET ROLE;
 IF got IS DISTINCT FROM state OR (expected_message IS NOT NULL AND msg IS DISTINCT FROM expected_message) THEN
  RAISE EXCEPTION 'contact_integration_failed:% expected:%/% got:%/%',label,state,expected_message,got,msg; END IF;
 RETURN contact_integration_test.check(label,true);
END $f$;
CREATE FUNCTION contact_integration_test.call(k text,q text) RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE r jsonb;BEGIN SET LOCAL ROLE authenticated; EXECUTE q INTO r; RESET ROLE;
 INSERT INTO contact_integration_test.ctx VALUES(k,r); RETURN r; END $f$;
CREATE FUNCTION contact_integration_test.count_as(q text) RETURNS bigint LANGUAGE plpgsql AS $f$
DECLARE n bigint;BEGIN SET LOCAL ROLE authenticated;EXECUTE q INTO n;RESET ROLE;RETURN n;END $f$;
CREATE FUNCTION contact_integration_test.contact_sql(key uuid DEFAULT '12000000-0000-0000-0000-000000000001',lid text DEFAULT NULL) RETURNS text LANGUAGE sql AS $f$
 SELECT format('SELECT public.contact_my_listing_seller_v1(%L,%L,%L,%L)','92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002',key,coalesce(lid,contact_integration_test.v('seller')->>'listing_id')) $f$;
CREATE FUNCTION contact_integration_test.send_sql(key uuid DEFAULT '22000000-0000-0000-0000-000000000001',body text DEFAULT '  My own message, preserved.  ',lid text DEFAULT NULL) RETURNS text LANGUAGE sql AS $f$
 SELECT format('SELECT public.send_my_listing_message_v1(%L,%L,%L,%L,%L,%L)','92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002',key,contact_integration_test.v('contact')->>'conversation_id',body,lid) $f$;

SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.call('contact',contact_integration_test.contact_sql());
SELECT contact_integration_test.check('contact_receipt_actor_identity_bound',contact_integration_test.v('contact')->>'actor_user_id'='92000000-0000-0000-0000-000000000002' AND contact_integration_test.v('contact')->>'identity_id'='b2000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.check('exact_two_participants',(SELECT count(*)=2 FROM public.conversation_participants));
SELECT contact_integration_test.check('snapshot_from_authoritative_listing',(SELECT c.listing_title_snapshot=l.title AND c.listing_price_snapshot=l.price AND c.listing_image_snapshot IS NOT DISTINCT FROM l.image FROM public.conversations c JOIN public.listings l ON l.id=c.listing_id));
SELECT contact_integration_test.call('contact-replay',contact_integration_test.contact_sql());
SELECT contact_integration_test.check('contact_same_key_recovers_same_conversation',contact_integration_test.v('contact-replay')->>'conversation_id'=contact_integration_test.v('contact')->>'conversation_id' AND contact_integration_test.v('contact-replay')->>'replayed'='true');
SELECT contact_integration_test.call('contact-second',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000002'));
SELECT contact_integration_test.check('contact_new_key_reuses_pair',(SELECT count(*)=1 FROM public.conversations) AND (SELECT count(*)=2 FROM listing_contact_private.contact_receipts));
SELECT contact_integration_test.expect('contact_key_conflict',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000001','9223372036854775807'),'22023','listing_contact_request_conflict');
SELECT contact_integration_test.expect('contact_zero_key',contact_integration_test.contact_sql('00000000-0000-0000-0000-000000000000'),'22023','listing_contact_input');
SELECT contact_integration_test.expect('contact_bigint_overflow',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000003','9223372036854775808'),'22023','listing_contact_input');
SELECT contact_integration_test.expect('contact_missing_listing',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000003','9223372036854775807'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.expect('contact_own_account',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000004',contact_integration_test.v('buyer')->>'listing_id'),'42501','listing_contact_self');
SELECT contact_integration_test.actor('93000000-0000-0000-0000-000000000003');
SELECT contact_integration_test.expect('contact_spoofed_user',contact_integration_test.contact_sql(),'42501','publication_account_changed');
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');

SELECT contact_integration_test.call('message',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000001','  My own message, preserved.  ',contact_integration_test.v('seller')->>'listing_id'));
SELECT contact_integration_test.check('message_plain_text_preserved',(SELECT message='  My own message, preserved.  ' FROM public.messages));
SELECT contact_integration_test.check('message_snapshot_server_only',(SELECT m.listing_title=l.title AND m.listing_price=l.price AND m.image_url IS NULL AND m.image_path IS NULL FROM public.messages m JOIN public.listings l ON l.id=m.listing_id));
SELECT contact_integration_test.call('message-replay',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000001','  My own message, preserved.  ',contact_integration_test.v('seller')->>'listing_id'));
SELECT contact_integration_test.check('message_same_key_recovers_same_message',contact_integration_test.v('message-replay')->>'message_id'=contact_integration_test.v('message')->>'message_id' AND contact_integration_test.v('message-replay')->>'replayed'='true' AND (SELECT count(*)=1 FROM public.messages));
SELECT contact_integration_test.expect('message_key_conflict',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000001','changed'),'22023','listing_contact_request_conflict');
SELECT contact_integration_test.expect('message_whitespace_rejected',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000002',E' \t\n'),'22023','listing_contact_input');
SELECT contact_integration_test.expect('message_length_bound',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000002',repeat('x',5001)),'22023','listing_contact_input');
SELECT contact_integration_test.expect('legacy_message_insert_blocked',format('INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES(%s,%L,%L,%L)',contact_integration_test.v('contact')->>'conversation_id','92000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','forged direct message'),'42501','listing_contact_direct_write');
SELECT contact_integration_test.expect('legacy_contact_insert_blocked',format('INSERT INTO public.conversations(created_by,listing_id) VALUES(%L,%s)','92000000-0000-0000-0000-000000000002',contact_integration_test.v('seller')->>'listing_id'),'42501','listing_contact_direct_write');
SELECT contact_integration_test.expect('conversation_identity_mutation_blocked',format('UPDATE public.conversations SET buyer_identity_id=%L WHERE id=%s','c3000000-0000-0000-0000-000000000003',contact_integration_test.v('contact')->>'conversation_id'),'42501','listing_contact_direct_write');
SELECT contact_integration_test.expect('participant_identity_mutation_blocked',format('UPDATE public.conversation_participants SET identity_id=%L WHERE user_id=%L','c3000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-000000000002'),'42501','listing_contact_direct_write');

UPDATE public.profiles SET active_identity_id='b2100000-0000-0000-0000-000000000002' WHERE id='92000000-0000-0000-0000-000000000002';
SELECT contact_integration_test.expect('stale_active_identity_write_rejected',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000003'),'42501','listing_price_identity_changed');
SELECT contact_integration_test.check('other_identity_cannot_read_conversation',contact_integration_test.count_as('SELECT count(*) FROM public.conversations')=0);
SELECT contact_integration_test.check('other_identity_cannot_read_messages',contact_integration_test.count_as('SELECT count(*) FROM public.messages')=0);
UPDATE public.profiles SET active_identity_id='b2000000-0000-0000-0000-000000000002' WHERE id='92000000-0000-0000-0000-000000000002';
SELECT contact_integration_test.check('participant_can_read_conversation',contact_integration_test.count_as('SELECT count(*) FROM public.conversations')=1);
SELECT contact_integration_test.actor('93000000-0000-0000-0000-000000000003');
SELECT contact_integration_test.expect('unrelated_sender_rejected',format('SELECT public.send_my_listing_message_v1(%L,%L,%L,%L,%L,NULL)','93000000-0000-0000-0000-000000000003','c3000000-0000-0000-0000-000000000003','23000000-0000-0000-0000-000000000001',contact_integration_test.v('contact')->>'conversation_id','unrelated'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.check('unrelated_account_cannot_read_messages',contact_integration_test.count_as('SELECT count(*) FROM public.messages')=0);
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');

INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES('91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.expect('block_prevents_new_contact',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000005'),'42501','listing_contact_blocked');
SELECT contact_integration_test.expect('block_prevents_new_message',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000003'),'42501','listing_contact_blocked');
SELECT contact_integration_test.call('blocked-replay',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000001','  My own message, preserved.  ',contact_integration_test.v('seller')->>'listing_id'));
SELECT contact_integration_test.check('committed_message_recovery_remains_read_only',contact_integration_test.v('blocked-replay')->>'replayed'='true' AND (SELECT count(*)=1 FROM public.messages));
DELETE FROM public.user_blocks WHERE blocker_id='91000000-0000-0000-0000-000000000001' AND blocked_id='92000000-0000-0000-0000-000000000002';
UPDATE public.identities SET status='paused' WHERE id='a1000000-0000-0000-0000-000000000001';
SELECT contact_integration_test.expect('inactive_peer_identity_rejected',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000003'),'42501','listing_contact_unavailable');
UPDATE public.identities SET status='active' WHERE id='a1000000-0000-0000-0000-000000000001';
UPDATE public.listings SET status='paused' WHERE id=(contact_integration_test.v('seller')->>'listing_id')::bigint;
SELECT contact_integration_test.expect('paused_listing_new_contact_rejected',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000005'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.expect('paused_listing_attachment_rejected',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000003','attachment',contact_integration_test.v('seller')->>'listing_id'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.call('paused-plain',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000003','Plain reply while paused'));
SELECT contact_integration_test.check('plain_conversation_does_not_require_active_listing',(SELECT count(*)=2 FROM public.messages));

SELECT contact_integration_test.actor('91000000-0000-0000-0000-000000000001');
SELECT contact_integration_test.call('delete',format('SELECT public.delete_my_published_listing_v1(%L,%L,%L)','91000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001',contact_integration_test.v('seller')->>'listing_id'));
SELECT contact_integration_test.check('terminal_delete_content_receipt',contact_integration_test.v('delete')->>'content_deleted'='true');
SELECT contact_integration_test.check('conversation_survives_terminal_delete',(SELECT count(*)=1 FROM public.conversations));
SELECT contact_integration_test.check('own_messages_survive_terminal_delete',(SELECT count(*)=2 FROM public.messages) AND EXISTS(SELECT 1 FROM public.messages WHERE message='  My own message, preserved.  '));
SELECT contact_integration_test.check('automatic_conversation_snapshot_scrubbed',(SELECT listing_id IS NULL AND listing_title_snapshot IS NULL AND listing_image_snapshot IS NULL AND listing_price_snapshot IS NULL FROM public.conversations));
SELECT contact_integration_test.check('automatic_message_snapshot_scrubbed',NOT EXISTS(SELECT 1 FROM public.messages WHERE listing_id IS NOT NULL OR listing_title IS NOT NULL OR listing_image IS NOT NULL OR listing_price IS NOT NULL));
SELECT contact_integration_test.check('contact_and_message_receipts_retained',(SELECT count(*)=2 FROM listing_contact_private.contact_receipts) AND (SELECT count(*)=2 FROM listing_contact_private.message_receipts));
SELECT contact_integration_test.actor('92000000-0000-0000-0000-000000000002');
SELECT contact_integration_test.call('deleted-contact-replay',contact_integration_test.contact_sql());
SELECT contact_integration_test.check('deleted_listing_contact_replay_no_resurrection',contact_integration_test.v('deleted-contact-replay')->>'replayed'='true' AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=(contact_integration_test.v('seller')->>'listing_id')::bigint));
SELECT contact_integration_test.expect('deleted_listing_new_contact_rejected',contact_integration_test.contact_sql('12000000-0000-0000-0000-000000000005'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.expect('stale_deleted_attachment_rejected',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000004','stale snapshot',contact_integration_test.v('seller')->>'listing_id'),'42501','listing_contact_unavailable');
SELECT contact_integration_test.call('deleted-plain',contact_integration_test.send_sql('22000000-0000-0000-0000-000000000004','Plain reply after listing deletion'));
SELECT contact_integration_test.check('plain_reply_after_delete_accepted',(SELECT count(*)=3 FROM public.messages));
SELECT contact_integration_test.expect('deleted_snapshot_cannot_be_restored',format('UPDATE public.conversations SET listing_title_snapshot=%L WHERE id=%s','Restored stale title',contact_integration_test.v('contact')->>'conversation_id'),'42501','listing_contact_direct_write');
SELECT contact_integration_test.expect('managed_conversation_direct_delete_rejected',format('DELETE FROM public.conversations WHERE id=%s',contact_integration_test.v('contact')->>'conversation_id'),'42501','listing_contact_conversation_retained');
SELECT contact_integration_test.check('no_message_image_storage_fields',NOT EXISTS(SELECT 1 FROM public.messages WHERE image_url IS NOT NULL OR image_path IS NOT NULL));
