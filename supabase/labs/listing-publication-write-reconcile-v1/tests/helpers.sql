-- NEW test definitions; all data synthetic. No earlier suite is executed.
CREATE SCHEMA reconcile_test;
CREATE FUNCTION reconcile_test.source(k text DEFAULT 'one',start_sign boolean DEFAULT false,
 u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS void LANGUAGE plpgsql AS $f$
DECLARE b jsonb;sl uuid;d uuid:=gen_random_uuid();BEGIN
 PERFORM final_test.boot(k,1,false,u,i);
 sl:=(final_test.v(k)->'slots'->0->>'slot_id')::uuid;
 b:=public.reserve_my_listing_upload_v1(u,i,final_test.a(k),sl,d)->'binding';
 INSERT INTO final_test.ctx VALUES(k||':grant',b);
 IF start_sign THEN PERFORM public.claim_listing_upload_sign_v1(u,i,final_test.a(k),sl,d,(b->>'grant_id')::uuid); END IF;
END $f$;
CREATE FUNCTION reconcile_test.sign(k text DEFAULT 'one',u uuid DEFAULT '11111111-1111-1111-1111-111111111111',i uuid DEFAULT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') RETURNS jsonb LANGUAGE sql AS $f$
 SELECT public.claim_listing_upload_sign_v1(u,i,final_test.a(k),(final_test.v(k||':grant')->>'slot_id')::uuid,
  (final_test.v(k||':grant')->>'dispatch_key')::uuid,(final_test.v(k||':grant')->>'grant_id')::uuid) $f$;
CREATE FUNCTION reconcile_test.provider(k text DEFAULT 'one',sid uuid DEFAULT '15151515-1515-1515-1515-151515151515',v text DEFAULT '16161616-1616-1616-1616-161616161616') RETURNS void LANGUAGE sql AS $f$
 INSERT INTO storage.objects(id,bucket_id,name,version)
 SELECT sid,bucket_id,object_path,v FROM listing_publication_private.objects WHERE id=completion_test.obj('web',k) $f$;
CREATE FUNCTION reconcile_test.claim(k text DEFAULT 'recon') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE r jsonb;BEGIN r:=public.claim_listing_write_reconcile_v1();
 INSERT INTO final_test.ctx VALUES(k,coalesce(r,'null')) ON CONFLICT ON CONSTRAINT ctx_pkey DO UPDATE SET v=excluded.v;
 RETURN r;END $f$;
CREATE FUNCTION reconcile_test.record(k text DEFAULT 'recon',outcome text DEFAULT 'observed',patch jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql AS $f$
DECLARE r jsonb:=final_test.v(k);v jsonb;BEGIN
 v:=jsonb_build_object('o',r->>'object_id','wk',r->>'work_key','outcome',outcome,
 'sid',CASE WHEN outcome='observed' THEN r->>'storage_object_id' END,'version',CASE WHEN outcome='observed' THEN r->>'storage_version' END,
 'hash',CASE WHEN outcome='observed' THEN r->>'expected_sha256' END,'bytes',CASE WHEN outcome='observed' THEN (r->>'expected_bytes')::integer END)||patch;
 RETURN public.record_listing_write_reconcile_v1((v->>'o')::uuid,(v->>'wk')::uuid,v->>'outcome',(v->>'sid')::uuid,v->>'version',v->>'hash',(v->>'bytes')::integer);
END $f$;
CREATE FUNCTION reconcile_test.call_sql(k text DEFAULT 'recon') RETURNS text LANGUAGE sql AS $f$
 SELECT format('SELECT public.record_listing_write_reconcile_v1(%L::uuid,%L::uuid,''observed'',%L::uuid,%L,%L,%L::integer)',
 r->>'object_id',r->>'work_key',r->>'storage_object_id',r->>'storage_version',r->>'expected_sha256',r->>'expected_bytes')
 FROM (SELECT final_test.v(k) r) z $f$;
-- Exercise the REAL job trigger's valid lease transitions with short synthetic
-- leases. No clock injection, disabled trigger or production-field rewrite.
CREATE FUNCTION reconcile_test.crashed_leases(n integer DEFAULT 1) RETURNS void LANGUAGE plpgsql AS $f$
DECLARE o uuid:=completion_test.obj('web');i integer;BEGIN
 IF current_user<>'postgres' OR n NOT BETWEEN 1 AND 8 THEN RAISE EXCEPTION 'synthetic_test_only'; END IF;
 SET LOCAL ROLE selqiro_listing_final_writer_v1;
 INSERT INTO listing_publication_private.write_reconcile_jobs(object_id,kind,work_key,try_count,state,lease_until)
 VALUES(o,'web_commit',gen_random_uuid(),1,'leased',clock_timestamp()+interval '0.25 seconds');
 FOR i IN 2..n LOOP
  PERFORM pg_sleep(0.30);
  UPDATE listing_publication_private.write_reconcile_jobs SET work_key=gen_random_uuid(),try_count=i,lease_until=clock_timestamp()+interval '0.25 seconds' WHERE object_id=o;
 END LOOP;
 RESET ROLE;
 INSERT INTO final_test.ctx VALUES('crashed', (SELECT jsonb_build_object('object_id',object_id,'work_key',work_key,'kind','web_commit',
 'storage_object_id',NULL,'storage_version',NULL,'expected_sha256',NULL,'expected_bytes',NULL) FROM listing_publication_private.write_reconcile_jobs WHERE object_id=o));
 PERFORM pg_sleep(0.30);
END $f$;
