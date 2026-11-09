// Generate this three-reader repair only. Retained r2 files are immutable input.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,root,repair,provenance,source,modules,applyReaderModules} from './fixture.mjs';
import {catalogParts,buildReport,digest,readerNames,profileDependencies} from './catalog.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const write=(name,value)=>fs.writeFileSync(path.join(repair,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const retained=source('supabase/repairs/20261108_service_publication/preflight.sql');
 const parts=catalogParts(retained);
 const prior=(await db.query(parts.retainedQuery)).rows[0].result;
 const query=expression=>'WITH '+parts.extra+' SELECT '+expression+' value';
 const profile=(await db.query(query(digest(parts.profileFacts)))).rows[0].value;
 const before=(await db.query(query(digest(parts.readerFacts)))).rows[0].value;
 const retainedCapability=prior.fingerprints.capability;
 const invariants=prior.invariants;
 await db.exec('BEGIN');await applyReaderModules();
 const after=(await db.query(query(digest(parts.readerFacts)))).rows[0].value;
 assert.notEqual(after,before);
 assert.equal((await db.query(query(digest(parts.profileFacts)))).rows[0].value,profile);
 const retainedAfter=(await db.query(parts.retainedQuery)).rows[0].result;
 assert.equal(retainedAfter.fingerprints.capability,retainedCapability);
 assert.deepEqual(retainedAfter.invariants,invariants);
 assert.deepEqual(retainedAfter.fingerprints,prior.fingerprints);
 await db.exec('ROLLBACK');
 const pins={before,after,profile,retainedCapability};
 const report=buildReport(parts,pins);
 const changes=modules.map(name=>'-- COMPONENT '+name+'\n'+read(name)).join('\n');
 const header='-- GENERATED from the exact retained r2 catalog and these three reviewed readers.\n-- Modules SHA-256: '+sha(changes)+'\n';
 const preflight=header+"BEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL statement_timeout='20s';\n"+report+';\nCOMMIT;\n';
 const apply=header+`BEGIN;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL lock_timeout='3s';\nSET LOCAL statement_timeout='45s';
 DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-service-profile-polish-v1',0));END $lock$;
 LOCK TABLE public.services,public.service_images,public.listings,public.listing_images,
 public.horse_offers,public.horse_offer_images,public.store_categories,public.listing_store_categories IN ACCESS SHARE MODE;
 CREATE TEMP TABLE service_profile_polish_before ON COMMIT DROP AS ${report};
 DO $before$ BEGIN IF NOT EXISTS(SELECT 1 FROM service_profile_polish_before
 WHERE result->>'state' IN('absent','applied') AND (result->>'recognized')::boolean AND (result->>'dependencies_ok')::boolean) THEN
 RAISE EXCEPTION 'SERVICE_PROFILE_POLISH_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END IF;END $before$;
 DO $apply$ BEGIN IF EXISTS(SELECT 1 FROM service_profile_polish_before WHERE result->>'state'='absent') THEN
 EXECUTE $readers$${changes}$readers$;
 END IF;END $apply$;
 CREATE TEMP TABLE service_profile_polish_after ON COMMIT DROP AS ${report};
 DO $after$ BEGIN IF NOT EXISTS(SELECT 1 FROM service_profile_polish_after a CROSS JOIN service_profile_polish_before b
 WHERE a.result->>'state'='applied' AND (a.result->>'dependencies_ok')::boolean
 AND a.result->'invariants'=b.result->'invariants'
 AND a.result->'fingerprints'->>'dependencies'=b.result->'fingerprints'->>'dependencies'
 AND a.result->'hosted_context'=b.result->'hosted_context') THEN
 RAISE EXCEPTION 'SERVICE_PROFILE_POLISH_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $after$;
 NOTIFY pgrst,'reload schema';SELECT result FROM service_profile_polish_after;COMMIT;\n`;
 for(const name of [...modules,'tests/fixture.mjs','tests/catalog.mjs','tests/build-guards.mjs'])
  source('supabase/repairs/20261109_service_profile_polish/'+name);
 const unique=Object.fromEntries(provenance.map(p=>[p.path,p.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 write('changes.sql',changes);write('preflight.sql',preflight);write('verify.sql',preflight);write('apply.sql',apply);
 write('source-pins.json',{schema_version:1,inputs:unique});
 write('catalog-pins.json',{schema_version:1,scope:'service-profile-polish-v1',reader_names:readerNames,
  profile_dependency_names:profileDependencies,dependencies_sha256:null,readers_before_sha256:before,
  readers_after_sha256:after,profile_dependencies_sha256:profile,retained_capability_without_two_readers_sha256:retainedCapability,
  modules_sha256:sha(changes),modules:Object.fromEntries(modules.map(name=>[name,sha(read(name))]))});
 const beforeReport=(await db.exec(preflight)).flatMap(r=>r.rows).filter(r=>r.result);assert.equal(beforeReport.length,1);
 assert.equal(beforeReport[0].result.state,'absent',JSON.stringify(beforeReport[0].result));
 const first=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.equal(first.length,1);assert.equal(first[0].result.state,'applied');
 const replay=(await db.exec(apply)).flatMap(r=>r.rows).filter(r=>r.result);assert.deepEqual(replay,first);
 const verified=(await db.exec(preflight)).flatMap(r=>r.rows).filter(r=>r.result);assert.deepEqual(verified,first);
 const catalog=JSON.parse(read('catalog-pins.json'));catalog.dependencies_sha256=first[0].result.fingerprints.dependencies;write('catalog-pins.json',catalog);
 write('tests/before-example.json',beforeReport[0].result);write('tests/verified-example.json',first[0].result);
 const evidence={schema_version:1,kind:'service-profile-polish-guard-generation',result:'PASS',generated_at_utc:new Date().toISOString(),
  readers:3,changed_readers:2,new_readers:1,source_pins:Object.keys(unique).length,install_replay_verified:true,
  retained_invariants_unchanged:true,live_database:false,production_storage:false,mac_installer:false,
  files:Object.fromEntries(['changes.sql','preflight.sql','apply.sql','verify.sql','source-pins.json','catalog-pins.json'].map(n=>[n,sha(read(n))]))};
 write('guard-generation-result.json',evidence);console.log(JSON.stringify(evidence));
}finally{await db.close();}
