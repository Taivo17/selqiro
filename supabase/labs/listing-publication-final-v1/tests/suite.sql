-- New synthetic final lifecycle helpers. Never loaded outside the disposable lab.
CREATE SCHEMA final_test;
CREATE TABLE final_test.ctx(k text PRIMARY KEY,v jsonb NOT NULL);
CREATE FUNCTION final_test.check(label text,ok boolean) RETURNS text LANGUAGE plpgsql AS $f$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'final_test_failed:%',label; END IF; RETURN 'PASS|'||label; END $f$;
CREATE FUNCTION final_test.expect(label text,q text,s text,msg text DEFAULT NULL,r text DEFAULT NULL) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE got text;m text;
BEGIN
 IF r IS NOT NULL THEN EXECUTE format('SET LOCAL ROLE %I',r); END IF;
 BEGIN EXECUTE q; EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS got=RETURNED_SQLSTATE,m=MESSAGE_TEXT; END;
 IF r IS NOT NULL THEN RESET ROLE; END IF;
 IF got IS DISTINCT FROM s OR (msg IS NOT NULL AND m IS DISTINCT FROM msg) THEN
 RAISE EXCEPTION 'final_test_failed:%:expected=%:actual=%',label,s,coalesce(got,'NO_ERROR'); END IF;
 RETURN final_test.check(label,true);
END $f$;
CREATE FUNCTION final_test.actor(u uuid DEFAULT '11111111-1111-1111-1111-111111111111') RETURNS void LANGUAGE plpgsql AS $f$
BEGIN PERFORM set_config('request.jwt.claim.sub',u::text,true);PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',u)::text,true); END $f$;
CREATE FUNCTION final_test.v(k text) RETURNS jsonb LANGUAGE sql AS $f$ SELECT v FROM final_test.ctx WHERE ctx.k=$1 $f$;
CREATE FUNCTION final_test.a(k text DEFAULT 'one') RETURNS uuid LANGUAGE sql AS $f$ SELECT (final_test.v(k)->>'attempt_id')::uuid $f$;
CREATE FUNCTION final_test.l(k text DEFAULT 'one') RETURNS bigint LANGUAGE sql AS $f$ SELECT listing_id FROM listing_publication_private.publications WHERE attempt_id=final_test.a(k) $f$;
CREATE FUNCTION final_test.boot(k text DEFAULT 'one',n integer DEFAULT 0,ready boolean DEFAULT true,
 u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 price jsonb DEFAULT '{"kind":"fixed","amount":"123.40","currency":"EUR"}') RETURNS void LANGUAGE plpgsql AS $f$
DECLARE input jsonb; images jsonb:='[]';a jsonb;b jsonb;c jsonb;w jsonb;slot jsonb;claims jsonb;token text;epoch bigint;j integer;d uuid;intent jsonb;
BEGIN
 PERFORM final_test.actor(u);
 input:='{"basics":{"title":"Final fixture","description":"Synthetic only","condition":"used"},"price":{"kind":"fixed","amount":"123.40","currency":"EUR"},"category_path":["vehicles","trucks_commercial","trucks"],"location":{"country":"Estonia","city":"Paide","latitude":null,"longitude":null},"attributes":{"manufacturer":"","part_number":"","oem_number":"","vehicle_brand":"","vehicle_model":"","vehicle_year":"","engine":""},"details":{"power":"90 kW"},"language":"et"}'::jsonb;
 input:=jsonb_set(input,'{price}',price);
 FOR j IN 1..n LOOP images:=images||jsonb_build_array(jsonb_build_object('client_file_id',gen_random_uuid(),'byte_length',100,'sha256',repeat('a',64)));END LOOP;
 a:=public.prepare_my_listing_publication_v1(u,i,gen_random_uuid(),input,images);
 INSERT INTO final_test.ctx VALUES(k,a),(k||':input',input),(k||':images',images);
 IF NOT ready THEN RETURN; END IF;
 FOR slot IN SELECT value FROM jsonb_array_elements(a->'slots') LOOP
  d:=gen_random_uuid();
  b:=public.reserve_my_listing_upload_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,d)->'binding';
  c:=public.claim_listing_upload_sign_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,d,(b->>'grant_id')::uuid);
  epoch:=(c->>'send_before_epoch')::bigint-30;
  claims:=jsonb_build_object('url',b->>'bucket_id'||'/'||(b->>'object_path'),'upsert',false,'iat',epoch,'exp',epoch+7200);
  token:='eyJhbGciOiJIUzI1NiJ9.'||rtrim(translate(replace(encode(convert_to(claims::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=')||'.syntheticSignature';
  PERFORM public.record_listing_upload_grant_v1((b->>'grant_id')::uuid,(c->>'claim_id')::uuid,token,epoch,epoch+7200);
  w:=public.claim_listing_web_image_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,gen_random_uuid());
  intent:=jsonb_build_object('pipeline_version','listing-web-v1','content_type','image/webp','source_sha256',repeat('a',64),
   'source_bytes',100,'source_format','png','web_sha256',repeat('b',64),'web_bytes',80,'width',10,'height',20,'sharp_version','0.34.5','libvips_version','8.17.3');
  PERFORM public.prepare_listing_web_write_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,(w->'binding'->>'job_id')::uuid,(w->>'claim_id')::uuid,intent);
  PERFORM public.record_listing_web_ready_v1(u,i,(a->>'attempt_id')::uuid,(slot->>'slot_id')::uuid,(w->'binding'->>'job_id')::uuid,repeat('b',64),80);
 END LOOP;
END $f$;
CREATE FUNCTION final_test.confirm(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;BEGIN c:=public.get_my_listing_publication_confirmation_v1(u,i,final_test.a(k));
 INSERT INTO final_test.ctx VALUES(k||':confirm',c) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v; RETURN c; END $f$;
CREATE FUNCTION final_test.publish(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;r jsonb;BEGIN c:=final_test.v(k||':confirm');IF c IS NULL THEN c:=final_test.confirm(k,u,i);END IF;
 r:=public.publish_my_listing_v1(u,i,final_test.a(k),c->'confirmation'->>'confirmation_sha256');
 INSERT INTO final_test.ctx VALUES(k||':result',r) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;RETURN r;END $f$;
CREATE FUNCTION final_test.cancel(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.cancel_my_listing_publication_v1(u,i,(final_test.v(k)->>'request_key')::uuid) $f$;
CREATE FUNCTION final_test.remove(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.delete_my_published_listing_v1(u,i,final_test.l(k)::text) $f$;
CREATE FUNCTION final_test.claim(k text DEFAULT 'claim') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE c jsonb;BEGIN c:=public.claim_listing_cleanup_v1();INSERT INTO final_test.ctx VALUES(k,coalesce(c,'null'::jsonb)) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;RETURN c;END $f$;
CREATE FUNCTION final_test.ack(k text DEFAULT 'claim',outcome text DEFAULT 'deleted') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.record_listing_cleanup_v1((final_test.v(k)->>'object_id')::uuid,(final_test.v(k)->>'work_key')::uuid,outcome) $f$;

SELECT final_test.actor();
SAVEPOINT new_case;
SELECT final_test.boot(); SELECT final_test.confirm(); SELECT final_test.publish();
SELECT final_test.check('publish_one_canonical_listing',(SELECT count(*)=1 FROM public.listings));
SELECT final_test.check('publish_exact_original_price',(SELECT price_kind='fixed' AND price_amount=123.4 AND currency='EUR' AND price_revision=1 FROM public.listings));
SELECT final_test.check('publish_search_details_location_unchanged',(SELECT details->>'power'='90 kW' AND city='Paide' AND country='Estonia' AND listing_language='et' AND search_text LIKE '%final fixture%' FROM public.listings));
SELECT final_test.check('publish_activity_starts_once',(SELECT status='active' AND active_until=created_at+interval '2160 hours' FROM public.listings));
SELECT final_test.check('publish_no_image_means_no_image_row',NOT EXISTS(SELECT 1 FROM public.listing_images));
SELECT final_test.check('publish_clears_private_payload',(SELECT state='published' AND payload IS NULL AND closed_at IS NOT NULL FROM listing_publication_private.attempts));
SELECT final_test.check('publish_exact_owner_tuple',(SELECT user_id='11111111-1111-1111-1111-111111111111' AND created_by_user_id=user_id AND identity_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' FROM public.listings));
SELECT final_test.check('publish_first_receipt_not_replayed',final_test.v('one:result')->>'replayed'='false');
SELECT final_test.publish();
SELECT final_test.check('same_confirmation_replays_without_new_listing',final_test.v('one:result')->>'replayed'='true' AND (SELECT count(*)=1 FROM public.listings));
SELECT final_test.expect('different_confirmation_cannot_replay',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('f',64))$q$,'22023','publication_confirmation_conflict',NULL);
SELECT final_test.remove();
SELECT final_test.check('zero_file_terminal_delete_finishes',listing_publication_private.final_receipt(final_test.a())->>'state'='deleted');
SELECT final_test.check('delete_removes_content',NOT EXISTS(SELECT 1 FROM public.listings));
SELECT final_test.check('delete_retains_tombstone',(SELECT state='deleting' FROM listing_publication_private.publications));
SELECT final_test.publish();
SELECT final_test.check('old_publish_never_resurrects',NOT EXISTS(SELECT 1 FROM public.listings) AND final_test.v('one:result')->>'state'='deleted');
SELECT final_test.remove();
SELECT final_test.check('terminal_delete_idempotent',(SELECT count(*)=1 FROM listing_publication_private.publications));
SELECT final_test.expect('tombstone_cannot_be_removed',$q$DELETE FROM listing_publication_private.publications$q$,'42501','publication_outcome_immutable',NULL);
SELECT final_test.expect('attempt_cannot_be_removed',$q$DELETE FROM listing_publication_private.attempts$q$,'55000','publication_receipt_retained',NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',2,true); SELECT final_test.confirm(); SELECT final_test.publish();
SELECT final_test.check('every_chosen_ready_image_attached',(SELECT count(*)=2 FROM public.listing_images));
SELECT final_test.check('exactly_one_primary_image',(SELECT count(*)=1 FROM public.listing_images WHERE is_primary AND sort_order=0));
SELECT final_test.check('only_relative_controlled_media_paths',NOT EXISTS(SELECT 1 FROM public.listing_images WHERE original_url<>'/api/v2/listing-media/'||final_test.a()::text||'/'||sort_order::text OR medium_url<>original_url OR thumb_url<>original_url));
SELECT final_test.check('listing_primary_matches_image',(SELECT image FROM public.listings)=(SELECT original_url FROM public.listing_images WHERE is_primary));
SELECT final_test.check('published_cleanup_only_sources',(SELECT count(*)=2 AND bool_and(reason='published_source' AND state='blocked_write_settlement') FROM listing_publication_private.cleanup));
SELECT final_test.check('active_published_webs_not_cleanup_targets',NOT EXISTS(SELECT 1 FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE o.kind='web'));
SELECT final_test.check('public_binding_is_web_only',public.get_public_listing_media_binding_v1(final_test.a(),0)->>'object_path' LIKE '%/web-v1.webp');
SELECT final_test.check('unknown_image_ordinal_is_hidden',public.get_public_listing_media_binding_v1(final_test.a(),9) IS NULL);
SELECT final_test.check('cleanup_cannot_claim_published_images',public.claim_listing_cleanup_v1() IS NULL);
SELECT final_test.expect('managed_image_change_rejected',$q$UPDATE public.listing_images SET original_url='https://evil.invalid/x'$q$,'42501','publication_managed_image_immutable',NULL);
SELECT final_test.expect('managed_image_direct_delete_rejected',$q$DELETE FROM public.listing_images$q$,'42501','publication_managed_image_immutable',NULL);
SELECT final_test.expect('managed_primary_change_rejected',$q$UPDATE public.listings SET image='wrong'$q$,'42501','publication_managed_binding_immutable',NULL);
SELECT final_test.expect('managed_listing_direct_delete_rejected',$q$DELETE FROM public.listings$q$,'42501',NULL,NULL);
UPDATE public.listings SET status='paused';
SELECT final_test.check('paused_public_media_hidden',public.get_public_listing_media_binding_v1(final_test.a(),0) IS NULL);
UPDATE public.listings SET status='active',active_until=clock_timestamp()-interval '1 second';
SELECT final_test.check('expired_public_media_hidden',public.get_public_listing_media_binding_v1(final_test.a(),0) IS NULL);
SELECT final_test.remove();
SELECT final_test.check('delete_clears_all_listing_image_rows',NOT EXISTS(SELECT 1 FROM public.listing_images));
SELECT final_test.check('delete_retains_four_exact_object_targets',(SELECT count(*)=4 FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id AND o.bucket_id=c.bucket_id AND o.object_path=c.object_path));
SELECT final_test.check('prepared_web_deletion_stays_blocked',(SELECT bool_and(c.state='blocked_write_settlement') FROM listing_publication_private.cleanup c));
SELECT final_test.check('content_deleted_is_not_files_deleted',listing_publication_private.final_receipt(final_test.a())->>'state'='deleting' AND (listing_publication_private.final_receipt(final_test.a())->>'files_remaining')::int=4);
SELECT final_test.check('deleted_listing_never_serves_web',public.get_public_listing_media_binding_v1(final_test.a(),0) IS NULL);
SELECT final_test.check('blocked_writes_not_claimed_after_delete',public.claim_listing_cleanup_v1() IS NULL);
SELECT final_test.publish();
SELECT final_test.check('late_publish_returns_deleting_without_resurrection',final_test.v('one:result')->>'state'='deleting' AND NOT EXISTS(SELECT 1 FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,false);
SELECT final_test.expect('unverified_image_cannot_get_final_confirmation',$q$SELECT final_test.confirm()$q$,'55000','publication_images_not_ready',NULL);
SELECT final_test.expect('unverified_image_cannot_publish',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('a',64))$q$,'55000','publication_images_not_ready',NULL);
SELECT final_test.check('unready_publish_leaves_no_public_rows',NOT EXISTS(SELECT 1 FROM public.listings) AND NOT EXISTS(SELECT 1 FROM public.listing_images));
SELECT final_test.cancel();
SELECT final_test.check('unissued_cancel_creates_pending_targets',(SELECT count(*)=2 AND bool_and(state='pending') FROM listing_publication_private.cleanup));
SELECT final_test.expect('cancelled_attempt_never_publishes',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('a',64))$q$,'55000','publication_attempt_closed',NULL);
SELECT final_test.claim();
SELECT final_test.check('cleanup_claim_is_exact_and_leased',(SELECT c.state='in_flight' AND c.try_count=1 AND c.work_key=(final_test.v('claim')->>'work_key')::uuid AND c.bucket_id=o.bucket_id AND c.object_path=o.object_path FROM listing_publication_private.cleanup c JOIN listing_publication_private.objects o ON o.id=c.object_id WHERE c.object_id=(final_test.v('claim')->>'object_id')::uuid));
SELECT final_test.expect('wrong_claim_key_cannot_ack',$q$SELECT public.record_listing_cleanup_v1((final_test.v('claim')->>'object_id')::uuid,gen_random_uuid(),'deleted')$q$,'55000','publication_cleanup_lease_lost',NULL);
SELECT final_test.expect('arbitrary_result_code_rejected',$q$SELECT final_test.ack('claim','secret raw error')$q$,'22023','publication_cleanup_result_invalid',NULL);
SELECT final_test.ack(); SELECT final_test.ack();
SELECT final_test.check('cleanup_ack_idempotent',(SELECT state='deleted' FROM listing_publication_private.cleanup WHERE object_id=(final_test.v('claim')->>'object_id')::uuid));
SELECT final_test.claim('claim2');SELECT final_test.ack('claim2');
SELECT final_test.check('all_unissued_targets_can_finish',(SELECT bool_and(state='deleted') FROM listing_publication_private.cleanup));
SELECT final_test.check('deleted_targets_not_claimed_again',public.claim_listing_cleanup_v1() IS NULL);
SELECT final_test.check('quota_released_only_after_confirmed_delete',(public.get_my_listing_cleanup_summary_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'reserved_bytes')::bigint=0);
SELECT final_test.expect('cleanup_exact_lineage_cannot_be_deleted',$q$DELETE FROM listing_publication_private.cleanup$q$,'55000','publication_cleanup_lineage_retained',NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,false);SELECT final_test.cancel();SELECT final_test.claim();SELECT final_test.ack('claim','network');
SELECT final_test.check('retry_state_persists_fixed_error',(SELECT state='retry_wait' AND last_error='network' AND not_before>clock_timestamp() FROM listing_publication_private.cleanup WHERE object_id=(final_test.v('claim')->>'object_id')::uuid));
SELECT final_test.expect('failed_claim_cannot_be_late_marked_deleted',$q$SELECT final_test.ack()$q$,'55000','publication_cleanup_lease_lost',NULL);
SELECT final_test.check('failure_does_not_release_reserved_bytes',(public.get_my_listing_cleanup_summary_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'reserved_bytes')::bigint=30408704);
SELECT final_test.expect('blocked_state_cannot_be_forced_as_postgres',$q$UPDATE listing_publication_private.cleanup SET state='deleted'$q$,'55000','publication_cleanup_lineage_retained',NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',0,true,'11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"kind":"free","amount":null,"currency":null}');SELECT final_test.publish();
SELECT final_test.check('free_has_no_inferred_currency',(SELECT price_kind='free' AND price_amount IS NULL AND currency IS NULL FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',0,true,'11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"kind":"negotiable","amount":null,"currency":null}');SELECT final_test.publish();
SELECT final_test.check('negotiable_has_no_inferred_currency',(SELECT price_kind='negotiable' AND price_amount IS NULL AND currency IS NULL FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',0,true,'11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','{"kind":"unspecified","amount":null,"currency":null}');SELECT final_test.publish();
SELECT final_test.check('unspecified_has_no_inferred_currency',(SELECT price_kind='unspecified' AND price_amount IS NULL AND currency IS NULL FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.confirm();
SELECT final_test.actor('22222222-2222-2222-2222-222222222222');
SELECT final_test.expect('foreign_account_denied_before_publish',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('a',64))$q$,'42501','publication_account_changed',NULL);
SELECT final_test.actor();
UPDATE public.profiles SET active_identity_id='cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id='11111111-1111-1111-1111-111111111111';
SELECT final_test.expect('active_identity_change_denies_publish',$q$SELECT final_test.publish()$q$,'42501',NULL,NULL);
SELECT final_test.check('identity_denial_no_public_listing',NOT EXISTS(SELECT 1 FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.confirm();
-- Existing accepted policy content is immutable, including for postgres. This refusal
-- is an expected test result, not a reason to disable the production-derived trigger.
SELECT final_test.expect('policy_version_content_mutation_rejected',$q$UPDATE public.publication_policy_documents SET content_hash=repeat('c',64) WHERE id='99999999-9999-9999-9999-999999999999'$q$,'55000','publication_policy_document_version_immutable',NULL);
-- Legal synthetic rollover: retain the accepted version, retire only its operational
-- status and INSERT a separate active version. Do not rewrite or add acceptances.
UPDATE public.publication_policy_documents SET status='retired'
 WHERE id='99999999-9999-9999-9999-999999999999' AND status='active';
INSERT INTO public.publication_policy_documents
 (id,policy_key,policy_version,country_code,locale,title,summary,body_text,content_hash,
  status,applies_to_content_types,requires_user_acceptance,effective_from,effective_until)
SELECT '88888888-8888-4888-8888-888888888888'::uuid,policy_key,'synthetic-v2',country_code,
 locale,'Synthetic updated rules','','Synthetic revised publication rules, test only, version two.','80eb29d0c932437a9077c7f8ff44585f5a0fb7e98a58f85504b065bf6546cc11','active',
 applies_to_content_types,requires_user_acceptance,effective_from,NULL
 FROM public.publication_policy_documents WHERE id='99999999-9999-9999-9999-999999999999';
SELECT final_test.check('policy_rollover_preserves_accepted_version',
 (SELECT status='retired' AND policy_version='synthetic-v1' AND content_hash=repeat('a',64)
  FROM public.publication_policy_documents WHERE id='99999999-9999-9999-9999-999999999999')
 AND (SELECT count(*)=2 AND bool_and(policy_document_id='99999999-9999-9999-9999-999999999999'::uuid
      AND policy_version='synthetic-v1' AND content_hash=repeat('a',64))
      FROM public.user_publication_policy_acceptances));
SELECT final_test.check('policy_rollover_new_active_unaccepted',
 (SELECT count(*)=1 AND bool_and(id='88888888-8888-4888-8888-888888888888'::uuid
      AND policy_version='synthetic-v2' AND content_hash='80eb29d0c932437a9077c7f8ff44585f5a0fb7e98a58f85504b065bf6546cc11'
      AND body_text='Synthetic revised publication rules, test only, version two.' AND requires_user_acceptance)
      FROM public.publication_policy_documents WHERE status='active')
 AND NOT EXISTS(SELECT 1 FROM public.user_publication_policy_acceptances
      WHERE policy_document_id='88888888-8888-4888-8888-888888888888'));
SELECT final_test.expect('policy_change_denies_final_publish',$q$SELECT final_test.publish()$q$,'42501',NULL,NULL);
SELECT final_test.check('policy_denial_no_public_listing',NOT EXISTS(SELECT 1 FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.publish(); UPDATE public.publication_policy_documents SET status='retired';
SELECT final_test.remove();
SELECT final_test.check('deletion_does_not_require_new_terms',NOT EXISTS(SELECT 1 FROM public.listings));
SELECT final_test.publish();
SELECT final_test.check('recovery_after_terms_change_is_read_only',final_test.v('one:result')->>'state'='deleted');
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,true);SELECT final_test.publish();
INSERT INTO public.conversations(id,buyer_id,seller_id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot) VALUES(9001,'22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',final_test.l(),'Automatic title','Automatic image','Automatic price');
INSERT INTO public.messages(id,sender_id,message,conversation_id,listing_id,listing_title,listing_image,listing_price,image_url,image_path) VALUES(9002,'22222222-2222-2222-2222-222222222222','Keep this conversation',9001,final_test.l(),'Automatic title','Automatic image','Automatic price','chat attachment','chat/object');
SELECT final_test.remove();
SELECT final_test.check('conversation_survives_terminal_delete',(SELECT count(*)=1 FROM public.conversations));
SELECT final_test.check('message_body_and_own_attachments_survive',(SELECT message='Keep this conversation' AND image_url='chat attachment' AND image_path='chat/object' FROM public.messages));
SELECT final_test.check('message_listing_snapshots_are_scrubbed',(SELECT listing_id IS NULL AND listing_title IS NULL AND listing_image IS NULL AND listing_price IS NULL FROM public.messages));
SELECT final_test.check('conversation_listing_snapshots_are_scrubbed',(SELECT listing_id IS NULL AND listing_title_snapshot IS NULL AND listing_image_snapshot IS NULL AND listing_price_snapshot IS NULL FROM public.conversations));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,true);SELECT final_test.publish();
CREATE TABLE final_test.unexpected_reference(listing_id bigint REFERENCES public.listings(id)); INSERT INTO final_test.unexpected_reference VALUES(final_test.l());
SELECT final_test.expect('unhandled_fk_prevents_atomic_deletion',$q$SELECT final_test.remove()$q$,'23503',NULL,NULL);
SELECT final_test.check('failed_delete_preserves_content_and_images',EXISTS(SELECT 1 FROM public.listings) AND EXISTS(SELECT 1 FROM public.listing_images));
SELECT final_test.check('failed_delete_rolls_back_cleanup_and_tombstone',(SELECT state='published' FROM listing_publication_private.publications) AND (SELECT count(*)=1 FROM listing_publication_private.cleanup));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.confirm();
SELECT final_test.expect('authenticated_rpc_closed_by_default',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('a',64))$q$,'42501',NULL,'authenticated');
GRANT USAGE ON SCHEMA final_test TO authenticated;GRANT SELECT ON final_test.ctx TO authenticated;GRANT EXECUTE ON FUNCTION public.publish_my_listing_v1(uuid,uuid,uuid,text),public.get_my_listing_publication_confirmation_v1(uuid,uuid,uuid),public.delete_my_published_listing_v1(uuid,uuid,text) TO authenticated;
SET LOCAL ROLE authenticated;
SELECT final_test.check('actual_authenticated_owner_can_publish',public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),final_test.v('one:confirm')->'confirmation'->>'confirmation_sha256')->>'state'='published');
RESET ROLE;
SELECT final_test.expect('actual_authenticated_cannot_access_private_rows',$q$SELECT * FROM listing_publication_private.publications$q$,'42501',NULL,'authenticated');
SELECT final_test.actor('22222222-2222-2222-2222-222222222222');
SELECT final_test.expect('actual_authenticated_foreign_actor_denied',$q$SELECT public.publish_my_listing_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',final_test.a(),repeat('a',64))$q$,'42501','publication_account_changed','authenticated');
SELECT final_test.actor();
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"service_role"}',true);GRANT EXECUTE ON FUNCTION public.claim_listing_cleanup_v1() TO authenticated;
SELECT final_test.expect('jwt_role_string_is_not_service_authority',$q$SELECT public.claim_listing_cleanup_v1()$q$,'42501','publication_upload_service_required','authenticated');
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,false);SELECT final_test.cancel();GRANT EXECUTE ON FUNCTION public.claim_listing_cleanup_v1(),public.record_listing_cleanup_v1(uuid,uuid,text) TO service_role;
-- Keep the test-helper schema inaccessible to service_role. Invoke only the real
-- cleanup RPC under that role, capture two booleans, then assert as the test owner.
SELECT final_test.check('service_role_has_no_test_helper_access',NOT has_schema_privilege('service_role','final_test','USAGE'));
\unset final_cleanup_service_role_ok
\unset final_cleanup_service_claim_ok
SET LOCAL ROLE service_role;
SELECT current_user='service_role' AS role_ok,
       public.claim_listing_cleanup_v1() IS NOT NULL AS claim_ok
\gset final_cleanup_service_
RESET ROLE;
SELECT final_test.check('actual_service_role_can_claim_one',
  :'final_cleanup_service_role_ok'::boolean AND :'final_cleanup_service_claim_ok'::boolean);
SELECT final_test.expect('actual_service_role_cannot_read_private_cleanup',$q$SELECT * FROM listing_publication_private.cleanup$q$,'42501',NULL,'service_role');
\unset final_cleanup_service_role_ok
\unset final_cleanup_service_claim_ok
SELECT final_test.check('internal_writer_has_no_login_or_bypassrls',(SELECT NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls FROM pg_roles WHERE rolname='selqiro_listing_final_writer_v1'));
SELECT final_test.check('api_cannot_assume_final_writer',NOT pg_has_role('authenticated','selqiro_listing_final_writer_v1','MEMBER') AND NOT pg_has_role('service_role','selqiro_listing_final_writer_v1','MEMBER'));
SELECT final_test.check('internal_snapshot_writer_cannot_update_chat_body',NOT has_column_privilege('selqiro_listing_final_writer_v1','public.messages','message','UPDATE'));
ROLLBACK TO new_case; RELEASE new_case;
SELECT final_test.check('service_role_test_grants_rolled_back',
  NOT has_function_privilege('service_role','public.claim_listing_cleanup_v1()','EXECUTE')
  AND NOT has_function_privilege('service_role','public.record_listing_cleanup_v1(uuid,uuid,text)','EXECUTE')
  AND NOT has_schema_privilege('service_role','final_test','USAGE'));
SAVEPOINT new_case;
SELECT final_test.expect('truncate_attempts_denied',$q$TRUNCATE listing_publication_private.attempts CASCADE$q$,'42501',NULL,NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.expect('truncate_slots_denied',$q$TRUNCATE listing_publication_private.slots CASCADE$q$,'42501',NULL,NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.expect('truncate_objects_denied',$q$TRUNCATE listing_publication_private.objects CASCADE$q$,'42501',NULL,NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.expect('truncate_cleanup_denied',$q$TRUNCATE listing_publication_private.cleanup CASCADE$q$,'42501',NULL,NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.expect('truncate_publications_denied',$q$TRUNCATE listing_publication_private.publications CASCADE$q$,'42501',NULL,NULL);
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
UPDATE public.profiles SET active_identity_id='cccccccc-cccc-cccc-cccc-cccccccccccc' WHERE id IN('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222');SELECT final_test.boot('one',0,true,'11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc');SELECT final_test.publish('one','11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc');SELECT final_test.actor('22222222-2222-2222-2222-222222222222');
SELECT final_test.check('active_business_member_can_remove_shared_listing',final_test.remove('one','22222222-2222-2222-2222-222222222222','cccccccc-cccc-cccc-cccc-cccccccccccc')->>'state'='deleted');
SELECT final_test.check('business_terminal_tombstone_preserves_original_creator',listing_publication_private.final_receipt(final_test.a())->>'actor_user_id'='11111111-1111-1111-1111-111111111111');
SELECT final_test.expect('business_member_cannot_replay_other_creator_publish',$q$SELECT public.publish_my_listing_v1('22222222-2222-2222-2222-222222222222','cccccccc-cccc-cccc-cccc-cccccccccccc',final_test.a(),repeat('a',64))$q$,'P0002','publication_attempt_unavailable');
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot('one',1,true);SELECT final_test.publish();
INSERT INTO public.conversations(id,buyer_id,seller_id,listing_id) VALUES(9001,'22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111',final_test.l());
INSERT INTO public.messages(id,conversation_id,sender_id,message,listing_id) SELECT n,9001,'22222222-2222-2222-2222-222222222222','Synthetic bounded-count fixture',final_test.l() FROM generate_series(1,501) n;
SELECT final_test.expect('too_many_message_snapshots_fail_before_deletion',$q$SELECT final_test.remove()$q$,'54000','publication_message_cleanup_limit');
SELECT final_test.check('bounded_refusal_preserves_listing_and_messages',EXISTS(SELECT 1 FROM public.listings) AND (SELECT count(*)=501 FROM public.messages));
SELECT final_test.check('bounded_refusal_preserves_published_state',(SELECT state='published' FROM listing_publication_private.publications));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.confirm();
CREATE FUNCTION final_test.delay_insert() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN PERFORM pg_sleep(0.15);RETURN NEW;END $f$;
CREATE TRIGGER final_test_delay BEFORE INSERT ON public.listings FOR EACH ROW EXECUTE FUNCTION final_test.delay_insert();
UPDATE public.publication_policy_documents SET effective_until=clock_timestamp()+interval '0.08 seconds';
SELECT final_test.expect('policy_expiring_during_final_write_rolls_back',$q$SELECT final_test.publish()$q$,'42501','publication_policy_changed');
SELECT final_test.check('last_boundary_failure_has_no_partial_listing',NOT EXISTS(SELECT 1 FROM public.listings) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.publications));
ROLLBACK TO new_case; RELEASE new_case;
SAVEPOINT new_case;
SELECT final_test.boot();SELECT final_test.publish();
SELECT final_test.expect('account_erasure_cannot_drop_retained_lineage',$q$DELETE FROM auth.users WHERE id='11111111-1111-1111-1111-111111111111'$q$,'23503',NULL);
SELECT final_test.check('account_erasure_refusal_keeps_publication',(SELECT count(*)=1 FROM public.listings));
ROLLBACK TO new_case; RELEASE new_case;
