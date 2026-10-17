-- Synthetic helpers only. No API role receives access to this schema.
CREATE SCHEMA release_test;
CREATE FUNCTION release_test.boot(k text DEFAULT 'one',recorded boolean DEFAULT true) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN PERFORM no_release_test.boot(k); IF recorded THEN PERFORM no_release_test.record(k); END IF; END $f$;
CREATE FUNCTION release_test.get(k text DEFAULT 'one',save_as text DEFAULT 'read') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE v jsonb;BEGIN
 v:=no_release_test.get(k);
 INSERT INTO final_test.ctx VALUES(save_as,v) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;
 RETURN v;
END $f$;
CREATE FUNCTION release_test.confirm(k text DEFAULT 'one',rid uuid DEFAULT NULL,h text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE b jsonb:=final_test.v(k||':grant'); digest text;
BEGIN
 SELECT encode(token_sha256,'hex') INTO digest FROM listing_publication_private.upload_grants WHERE id=(b->>'grant_id')::uuid;
 RETURN public.confirm_listing_upload_release_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 final_test.a(k),(b->>'slot_id')::uuid,(b->>'dispatch_key')::uuid,(b->>'grant_id')::uuid,
 coalesce(rid,(final_test.v('read')->>'release_id')::uuid),coalesce(h,digest));
END $f$;
CREATE FUNCTION release_test.seal() RETURNS jsonb LANGUAGE sql AS $f$ SELECT public.settle_recorded_unreleased_source_one_v1() $f$;
-- A newly TRACKED grant with historical synthetic issuance time; real immutable
-- transition checks stay enabled. No production clock or row is changed.
CREATE FUNCTION release_test.aged() RETURNS void LANGUAGE plpgsql AS $f$
DECLARE ct timestamptz:=clock_timestamp()-interval '3 hours';BEGIN
 PERFORM reconcile_test.source();
 UPDATE listing_publication_private.upload_grants SET state='signing',claim_id=gen_random_uuid(),claimed_at=ct,
 send_before_epoch=floor(extract(epoch FROM ct))::bigint+30 WHERE id=(final_test.v('one:grant')->>'grant_id')::uuid;
 PERFORM no_release_test.record();
END $f$;
