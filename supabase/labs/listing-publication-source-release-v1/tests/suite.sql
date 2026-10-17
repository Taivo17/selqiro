-- NEW release-ledger suite only. The caller owns BEGIN / ROLLBACK.
SELECT final_test.check('release_empty_idle',release_test.seal() IS NULL);
SELECT final_test.check('release_source_release_tracking_api_closed',NOT has_table_privilege('authenticated','listing_publication_private.source_release_tracking','SELECT') AND NOT has_table_privilege('service_role','listing_publication_private.source_release_tracking','SELECT'));
SELECT final_test.check('release_source_release_tracking_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='listing_publication_private.source_release_tracking'::regclass));
SELECT final_test.check('release_source_release_intents_api_closed',NOT has_table_privilege('authenticated','listing_publication_private.source_release_intents','SELECT') AND NOT has_table_privilege('service_role','listing_publication_private.source_release_intents','SELECT'));
SELECT final_test.check('release_source_release_intents_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='listing_publication_private.source_release_intents'::regclass));
SELECT final_test.check('release_source_recorded_no_release_api_closed',NOT has_table_privilege('authenticated','listing_publication_private.source_recorded_no_release','SELECT') AND NOT has_table_privilege('service_role','listing_publication_private.source_recorded_no_release','SELECT'));
SELECT final_test.check('release_source_recorded_no_release_rls',(SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='listing_publication_private.source_recorded_no_release'::regclass));
SELECT final_test.check('release_secret_rpcs_api_closed',NOT has_function_privilege('authenticated','public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE') AND NOT has_function_privilege('service_role','public.confirm_listing_upload_release_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text)','EXECUTE'));
SELECT final_test.check('release_settle_owner',(SELECT pg_get_userbyid(proowner)='selqiro_listing_final_writer_v1' AND prosecdef FROM pg_proc WHERE oid='public.settle_recorded_unreleased_source_one_v1()'::regprocedure));
SAVEPOINT case_start;
SELECT release_test.boot();
SELECT final_test.check('release_birth_coverage',(SELECT count(*)=1 FROM listing_publication_private.source_release_tracking t JOIN listing_publication_private.upload_grants g ON g.id=t.grant_id WHERE t.object_id=g.object_id AND t.dispatch_key=g.dispatch_key));
SELECT final_test.check('release_record_not_release',NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents) AND (SELECT state='recorded' FROM listing_publication_private.upload_grants));
SELECT final_test.check('release_open_not_sealed',release_test.seal() IS NULL);
SELECT final_test.expect('release_confirm_does_not_create_event','SELECT release_test.confirm(''one'',''99999999-9999-9999-9999-999999999999'')','55000','publication_release_not_confirmed',NULL);
SELECT final_test.check('release_confirm_failure_no_event',NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT no_release_test.close();
SELECT final_test.check('release_before_proof_blocked',listing_publication_private.object_cleanup_state(completion_test.obj('source'))='blocked_write_settlement');
INSERT INTO final_test.ctx VALUES('sealed',release_test.seal());
SELECT final_test.check('release_recorded_unreleased_settles',final_test.v('sealed')->>'proof'='source_recorded_never_released' AND final_test.v('sealed')->>'state'='settled' AND (final_test.v('sealed')->>'object_id')::uuid=completion_test.obj('source'));
SELECT final_test.check('release_receipt_only_bound_ids',(SELECT array_agg(key ORDER BY key)=ARRAY['claim_id','grant_id','object_id','proof','schema_version','state'] FROM jsonb_object_keys(final_test.v('sealed')) key));
SELECT final_test.check('release_proof_is_permanent',(SELECT count(*)=1 FROM listing_publication_private.source_recorded_no_release) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT final_test.check('release_cleanup_pending',(SELECT state='pending' FROM listing_publication_private.cleanup WHERE object_id=completion_test.obj('source')));
SELECT final_test.check('release_byte_quota_kept',(public.get_my_listing_cleanup_summary_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'reserved_bytes')::bigint=26214400);
SELECT final_test.expect('release_getter_after_proof_closed','SELECT release_test.get()','55000','publication_attempt_closed',NULL);
SELECT final_test.check('release_same_record_ack_does_not_release',no_release_test.record()->>'recorded'='true' AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT final_test.claim();
SELECT final_test.check('release_existing_cleaner_exact_source',(final_test.v('claim')->>'object_id')::uuid=completion_test.obj('source'));
SELECT final_test.ack();
SELECT final_test.check('release_files_deleted_and_payload_stays_absent',(SELECT state='deleted' FROM listing_publication_private.cleanup WHERE object_id=completion_test.obj('source')) AND (SELECT payload IS NULL AND state='cancelled' FROM listing_publication_private.attempts WHERE id=final_test.a()));
SELECT final_test.check('release_no_requeue',release_test.seal() IS NULL AND public.claim_listing_cleanup_v1() IS NULL);
SELECT final_test.check('release_quota_released_only_after_cleanup',(public.get_my_listing_cleanup_summary_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')->>'reserved_bytes')::bigint=0);
SELECT final_test.expect('release_getter_after_deletion_closed','SELECT release_test.get()','55000','publication_attempt_closed',NULL);
SELECT final_test.expect('release_proof_update_denied','UPDATE listing_publication_private.source_recorded_no_release SET claim_id=gen_random_uuid()','55000','publication_recorded_no_release_immutable',NULL);
SELECT final_test.expect('release_proof_delete_denied','DELETE FROM listing_publication_private.source_recorded_no_release','55000','publication_recorded_no_release_immutable',NULL);
SELECT final_test.expect('release_proof_truncate_denied','TRUNCATE listing_publication_private.source_recorded_no_release','55000','publication_recorded_no_release_immutable',NULL);
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.boot();
SELECT release_test.get();
SELECT final_test.check('release_read_envelope',(SELECT array_agg(key ORDER BY key)=ARRAY['grant','release_id','state'] FROM jsonb_object_keys(final_test.v('read')) key));
SELECT final_test.check('release_intent_present_in_transaction',(SELECT release_id::text=final_test.v('read')->>'release_id' FROM listing_publication_private.source_release_intents));
SELECT final_test.check('release_confirmation_exact',release_test.confirm()->>'confirmed'='true');
SELECT release_test.get('one','read2');
SELECT final_test.check('release_get_idempotent',final_test.v('read')->>'release_id'=final_test.v('read2')->>'release_id' AND (SELECT count(*)=1 FROM listing_publication_private.source_release_intents));
SELECT final_test.expect('release_wrong_release_id','SELECT release_test.confirm(''one'',''99999999-9999-9999-9999-999999999999'')','55000','publication_release_not_confirmed',NULL);
SELECT final_test.expect('release_wrong_token_digest','SELECT release_test.confirm(''one'',NULL,repeat(''f'',64))','55000','publication_release_not_confirmed',NULL);
SELECT final_test.expect('release_malformed_token_digest','SELECT release_test.confirm(''one'',NULL,''not hex'')','55000','publication_release_not_confirmed',NULL);
SELECT final_test.expect('release_intent_update_denied','UPDATE listing_publication_private.source_release_intents SET release_id=gen_random_uuid()','55000','publication_release_intent_immutable',NULL);
SELECT final_test.expect('release_intent_delete_denied','DELETE FROM listing_publication_private.source_release_intents','55000','publication_release_intent_immutable',NULL);
SELECT final_test.expect('release_intent_truncate_denied','TRUNCATE listing_publication_private.source_release_intents','55000','publication_release_intent_immutable',NULL);
SELECT no_release_test.close();
SELECT final_test.check('release_released_remains_blocked',release_test.seal() IS NULL AND listing_publication_private.object_cleanup_state(completion_test.obj('source'))='blocked_write_settlement');
SELECT final_test.check('release_old_no_release_cannot_bypass',no_release_test.seal() IS NULL);
SELECT final_test.expect('release_confirm_after_cancel_denied','SELECT release_test.confirm()','55000','publication_attempt_closed',NULL);
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.boot();
SAVEPOINT before_get;
SELECT (release_test.get()->>'release_id') AS rolled_back_release_id
\gset
ROLLBACK TO before_get; RELEASE before_get;
SELECT final_test.check('release_rollback_removes_uncommitted_intent',NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT final_test.expect('release_rollback_confirm_denied',format('SELECT release_test.confirm(''one'',%L::uuid)',:'rolled_back_release_id'),'55000','publication_release_not_confirmed',NULL);
\unset rolled_back_release_id
SELECT no_release_test.close();
SELECT final_test.check('release_rollback_no_exposure_can_settle',release_test.seal()->>'state'='settled');
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.boot('one',false);
SELECT final_test.check('release_pending_get_no_intent',release_test.get()=jsonb_build_object('state','pending','grant',NULL,'release_id',NULL) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT no_release_test.close();
SELECT final_test.check('release_signing_left_to_existing_seal',release_test.seal() IS NULL AND no_release_test.seal()->>'state'='settled');
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.aged();
SELECT final_test.check('release_expired_get_no_secret_no_intent',release_test.get()=jsonb_build_object('state','expired','grant',NULL,'release_id',NULL) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_intents));
SELECT public.purge_listing_upload_token_one_v1((final_test.v('one:grant')->>'grant_id')::uuid);
SELECT no_release_test.close();
SELECT final_test.check('release_tracked_purged_unexposed_is_safe_by_coverage',release_test.seal()->>'state'='settled' AND (SELECT token IS NULL FROM listing_publication_private.upload_grants));
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT no_release_test.expired_recorded();
SELECT final_test.check('release_historical_coverage_not_backfilled',NOT EXISTS(SELECT 1 FROM listing_publication_private.source_release_tracking));
SELECT public.purge_listing_upload_token_one_v1((final_test.v('expired-grant')#>>'{}')::uuid);
SELECT no_release_test.close();
SELECT final_test.check('release_historical_expired_purged_still_unknown',release_test.seal() IS NULL AND listing_publication_private.object_cleanup_state(completion_test.obj('source'))='blocked_write_settlement');
SELECT final_test.expect('release_retroactive_tracking_denied','INSERT INTO listing_publication_private.source_release_tracking(grant_id,object_id,dispatch_key) SELECT id,object_id,dispatch_key FROM listing_publication_private.upload_grants','55000','publication_release_tracking_immutable','selqiro_listing_final_writer_v1');
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.boot();
SELECT final_test.expect('release_tracking_update_denied','UPDATE listing_publication_private.source_release_tracking SET dispatch_key=gen_random_uuid()','55000','publication_release_tracking_immutable',NULL);
SELECT final_test.expect('release_tracking_delete_denied','DELETE FROM listing_publication_private.source_release_tracking','55000','publication_release_tracking_immutable',NULL);
SELECT final_test.expect('release_tracking_truncate_denied','TRUNCATE listing_publication_private.source_release_tracking, listing_publication_private.source_recorded_no_release','55000','publication_release_tracking_immutable',NULL);
SELECT no_release_test.close();
SELECT final_test.expect('release_wrong_proof_binding','INSERT INTO listing_publication_private.source_recorded_no_release(object_id,grant_id,claim_id,token_sha256) SELECT object_id,id,gen_random_uuid(),token_sha256 FROM listing_publication_private.upload_grants','22023','publication_recorded_no_release_binding','selqiro_listing_final_writer_v1');
SELECT final_test.check('release_failed_proof_keeps_block',NOT EXISTS(SELECT 1 FROM listing_publication_private.source_recorded_no_release) AND (SELECT state='blocked_write_settlement' FROM listing_publication_private.cleanup WHERE object_id=completion_test.obj('source')));
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT completion_test.boot(); SELECT completion_test.record(); SELECT final_test.publish();
SELECT final_test.check('release_published_not_cleaned',release_test.seal() IS NULL AND public.claim_listing_cleanup_v1() IS NULL);
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
GRANT EXECUTE ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated,anon;
SELECT set_config('request.jwt.claims','{"role":"service_role"}',true);
SELECT final_test.expect('release_direct_authenticated_secret_get_denied','SELECT public.get_my_listing_upload_grant_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''33333333-3333-3333-3333-333333333333'',''44444444-4444-4444-4444-444444444444'',''88888888-8888-8888-8888-888888888888'',''66666666-6666-6666-6666-666666666666'')','42501','publication_upload_service_required','authenticated');
SELECT final_test.expect('release_direct_anon_secret_get_denied','SELECT public.get_my_listing_upload_grant_v1(''11111111-1111-1111-1111-111111111111'',''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'',''33333333-3333-3333-3333-333333333333'',''44444444-4444-4444-4444-444444444444'',''88888888-8888-8888-8888-888888888888'',''66666666-6666-6666-6666-666666666666'')','42501','publication_upload_service_required','anon');
ROLLBACK TO case_start; RELEASE case_start;
SAVEPOINT case_start;
SELECT release_test.boot();
SELECT no_release_test.close();
GRANT EXECUTE ON FUNCTION public.settle_recorded_unreleased_source_one_v1() TO service_role;
SET LOCAL ROLE service_role;
SELECT current_user='service_role' AS actual_role, public.settle_recorded_unreleased_source_one_v1()->>'state'='settled' AS actual_result
\gset
RESET ROLE;
SELECT final_test.check('release_actual_service_settle',:'actual_role'::boolean AND :'actual_result'::boolean);
\unset actual_role
\unset actual_result
SELECT final_test.expect('release_service_ledger_read_denied','SELECT * FROM listing_publication_private.source_release_intents','42501',NULL,'service_role');
SELECT final_test.check('release_service_no_test_schema',NOT has_schema_privilege('service_role','release_test','USAGE'));
ROLLBACK TO case_start; RELEASE case_start;
SELECT final_test.check('release_temporary_grants_rolled_back',NOT has_function_privilege('service_role','public.settle_recorded_unreleased_source_one_v1()','EXECUTE') AND NOT has_function_privilege('authenticated','public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid)','EXECUTE'));
SAVEPOINT case_start;
SELECT release_test.boot();
SELECT final_test.a()::text AS aid,final_test.v('one:grant')->>'slot_id' AS sid, final_test.v('one:grant')->>'dispatch_key' AS dispatch, final_test.v('one:grant')->>'grant_id' AS gid, (SELECT encode(token_sha256,'hex') FROM listing_publication_private.upload_grants) AS thash
\gset
GRANT EXECUTE ON FUNCTION public.get_my_listing_upload_grant_v1(uuid,uuid,uuid,uuid,uuid,uuid), public.confirm_listing_upload_release_v1(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text) TO service_role;
SET LOCAL ROLE service_role;
SELECT (public.get_my_listing_upload_grant_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',:'aid',:'sid',:'dispatch',:'gid')->>'release_id') AS rid
\gset
SELECT public.confirm_listing_upload_release_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',:'aid',:'sid',:'dispatch',:'gid',:'rid',:'thash')->>'confirmed'='true' AS service_confirmed
\gset
RESET ROLE;
SELECT final_test.check('release_actual_service_get_confirm',:'service_confirmed'::boolean AND (SELECT count(*)=1 FROM listing_publication_private.source_release_intents));
\unset aid
\unset sid
\unset dispatch
\unset gid
\unset thash
\unset rid
\unset service_confirmed
ROLLBACK TO case_start; RELEASE case_start;
