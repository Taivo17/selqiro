-- Definitions used only in the new disposable helper. No historical suite is run.
CREATE SCHEMA no_release_test;
CREATE FUNCTION no_release_test.boot(k text DEFAULT 'one',signing boolean DEFAULT true,
 u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
RETURNS void LANGUAGE sql AS $f$ SELECT reconcile_test.source(k,signing,u,i) $f$;
CREATE FUNCTION no_release_test.close(k text DEFAULT 'one',
 u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE c jsonb;BEGIN
 PERFORM final_test.cancel(k,u,i);
 -- The unused WEB placeholder is already eligible through the unchanged cleaner.
 -- This is a synthetic SQL receipt, NOT actual Storage deletion evidence.
 c:=public.claim_listing_cleanup_v1();
 IF (c->>'object_id')::uuid IS DISTINCT FROM completion_test.obj('web',k) THEN RAISE EXCEPTION 'no_release_fixture_web';END IF;
 PERFORM public.record_listing_cleanup_v1((c->>'object_id')::uuid,(c->>'work_key')::uuid,'deleted');
END $f$;
CREATE FUNCTION no_release_test.record(k text DEFAULT 'one') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE g listing_publication_private.upload_grants%ROWTYPE; epoch bigint;claims jsonb;token text;BEGIN
 SELECT * INTO g FROM listing_publication_private.upload_grants WHERE object_id=completion_test.obj('source',k);
 epoch:=g.send_before_epoch-30;
 claims:=jsonb_build_object('url','listing-publication-private/v1/'||final_test.a(k)::text||'/'||(final_test.v(k)->'slots'->0->>'slot_id')||'/source.upload','upsert',false,'iat',epoch,'exp',epoch+7200);
 token:='eyJhbGciOiJIUzI1NiJ9.'||rtrim(translate(replace(encode(convert_to(claims::text,'UTF8'),'base64'),E'\n',''),'+/','-_'),'=')||'.syntheticSignature';
 RETURN public.record_listing_upload_grant_v1(g.id,g.claim_id,token,epoch,epoch+7200);
END $f$;
CREATE FUNCTION no_release_test.get(k text DEFAULT 'one') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.get_my_listing_upload_grant_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 final_test.a(k),(final_test.v(k)->'slots'->0->>'slot_id')::uuid,(final_test.v(k||':grant')->>'dispatch_key')::uuid,(final_test.v(k||':grant')->>'grant_id')::uuid)
$f$;
CREATE FUNCTION no_release_test.seal() RETURNS jsonb LANGUAGE sql AS $f$ SELECT public.settle_unreleased_listing_source_one_v1() $f$;
-- A separate synthetic pre-existing recorded/expired receipt; no clock change,
-- trigger disabling, or mutation of a real grant is used to fabricate age.
CREATE FUNCTION no_release_test.expired_recorded() RETURNS void LANGUAGE plpgsql AS $f$
DECLARE b jsonb;ct timestamptz:=clock_timestamp()-interval '3 hours';ep bigint;d uuid:=gen_random_uuid();gid uuid;
BEGIN
 PERFORM final_test.boot('one',1,false);
 b:=listing_publication_private.reserve_upload_dispatch_v1('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 final_test.a(),(final_test.v('one')->'slots'->0->>'slot_id')::uuid,d);
 ep:=floor(extract(epoch FROM ct))::bigint;
 INSERT INTO listing_publication_private.upload_grants(object_id,dispatch_key,state,claim_id,claimed_at,send_before_epoch,
 token,token_sha256,issued_epoch,expires_epoch,recorded_at)
 VALUES((b->>'object_id')::uuid,d,'recorded',gen_random_uuid(),ct,ep+30,'SYNTHETIC_EXPIRED_SECRET',
 sha256(convert_to('SYNTHETIC_EXPIRED_SECRET','UTF8')),ep,ep+7200,ct) RETURNING id INTO gid;
 INSERT INTO final_test.ctx VALUES('expired-grant',to_jsonb(gid::text));
END $f$;
