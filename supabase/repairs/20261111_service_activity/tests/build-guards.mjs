import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,repair,source,provenance,modules,install,sha,result,snapshot} from './fixture.mjs';
import {parts,report,digest,guardNames} from './catalog.mjs';
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const write=(name,value)=>fs.writeFileSync(path.join(repair,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const profilePins=JSON.parse(source('supabase/repairs/20261109_service_profile_polish/catalog-pins.json'));
 const profile=source('supabase/repairs/20261109_service_profile_polish/verify.sql');
 const service=source('supabase/repairs/20261108_service_publication/preflight.sql');
 const raw=parts(profile,service,profilePins);
 const normalized=(await db.query(raw.retained)).rows[0].result.fingerprints.capability;
 const p=parts(profile,service,profilePins,normalized);
 const scalar=async(expr)=>(await db.query('WITH '+p.extra+' SELECT '+digest(expr)+' value')).rows[0].value;
 const retained=(await db.query(p.retained)).rows[0].result;
 assert.equal(retained.state,'applied',JSON.stringify(retained));
 const pins={normalizedServiceCapability:normalized,retainedDependencies:retained.fingerprints.dependencies,
  retainedCapability:retained.fingerprints.capability};
 const invariants={functions:p.functions,structure:p.structure,effects:p.effects,serviceEffects:p.serviceEffects,
  categoryAuthority:p.categoryAuthority,apiRoles:p.roleFacts,legacyAuthority:p.legacyTarget,
  horseCapability:p.horseTarget,serviceCategories:p.serviceCategoryTarget};
 for(const [name,expr] of Object.entries({...invariants,before:p.target}))pins[name]=await scalar(expr);
 const rows=await snapshot();
 await db.exec('BEGIN');await install();pins.after=await scalar(p.target);assert.notEqual(pins.before,pins.after);
 assert.deepEqual(await snapshot(),rows,'no retained application row changes');
 for(const [name,expr] of Object.entries(invariants))assert.equal(await scalar(expr),pins[name],name+' invariant');
 assert.deepEqual((await db.query(p.retained)).rows[0].result,retained,'retained catalog stable');
 const effective=(await db.query('WITH '+p.extra+' SELECT '+p.effective+' value')).rows[0].value;
 assert(effective.every(x=>!x.allowed&&!x.grantable));await db.exec('ROLLBACK');
 const query=report(p,pins);
 const changes=modules.map(name=>'-- COMPONENT '+name+'\n'+read(name)).join('\n');
 const header='-- GENERATED from retained, source-verified declarations.\n-- Intentional first service activity period; content rows stay unchanged.\n-- Modules SHA-256: '+sha(changes)+'\n';
 const preflight=header+"BEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL statement_timeout='20s';\n"+query+';\nCOMMIT;\n';
 const apply=header+`BEGIN;
 SET LOCAL search_path=pg_catalog,pg_temp;
 SET LOCAL lock_timeout='3s';SET LOCAL statement_timeout='45s';SET LOCAL timezone='UTC';
 DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-service-activity-v1',0));END $lock$;
 LOCK TABLE public.services IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE public.profiles,public.identities,public.business_members,public.store_categories,
 public.listing_store_categories,public.horse_offers,public.horse_offer_images,public.horse_offer_store_categories,
 public.service_images,public.service_store_categories IN ACCESS SHARE MODE;
 CREATE TEMP TABLE service_activity_before ON COMMIT DROP AS ${query};
 DO $before$ BEGIN IF NOT EXISTS(SELECT 1 FROM service_activity_before WHERE
 result->>'state' IN('absent','applied') AND (result->>'recognized')::boolean AND (result->>'dependencies_ok')::boolean) THEN
 RAISE EXCEPTION 'SERVICE_ACTIVITY_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END IF;END $before$;
 DO $apply$ BEGIN IF EXISTS(SELECT 1 FROM service_activity_before WHERE result->>'state'='absent') THEN
 EXECUTE $activity$${changes}$activity$;END IF;END $apply$;
 CREATE TEMP TABLE service_activity_after ON COMMIT DROP AS ${query};
 DO $after$ BEGIN IF NOT EXISTS(SELECT 1 FROM service_activity_after a CROSS JOIN service_activity_before b
 WHERE a.result->>'state'='applied' AND (a.result->>'recognized')::boolean AND (a.result->>'dependencies_ok')::boolean
 AND a.result->'invariants'=b.result->'invariants'
 AND a.result->'fingerprints'->>'dependencies'=b.result->'fingerprints'->>'dependencies'
 AND a.result->'hosted_context'=b.result->'hosted_context') THEN
 RAISE EXCEPTION 'SERVICE_ACTIVITY_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;
 IF EXISTS(SELECT 1 FROM public.services s LEFT JOIN service_publication_private.activity a ON a.service_id=s.id
 WHERE s.status='published' AND a.service_id IS NULL) THEN
 RAISE EXCEPTION 'SERVICE_ACTIVITY_COVERAGE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $after$;
 NOTIFY pgrst,'reload schema';SELECT result FROM service_activity_after;COMMIT;\n`;
 for(const name of [...modules,'tests/fixture.mjs','tests/catalog.mjs','tests/build-guards.mjs'])
  source('supabase/repairs/20261111_service_activity/'+name);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 write('changes.sql',changes);write('preflight.sql',preflight);write('verify.sql',preflight);write('apply.sql',apply);
 write('source-pins.json',{schema_version:1,inputs});
 const before=await result(preflight);assert.equal(before.length,1);assert.equal(before[0].state,'absent',JSON.stringify(before));
 assert.deepEqual(Object.keys(before[0].guards).sort(),guardNames.slice().sort());
 const after=await result(apply);assert.equal(after.length,1);assert.equal(after[0].state,'applied');
 assert.deepEqual(await result(apply),after);assert.deepEqual(await result(preflight),after);
 write('catalog-pins.json',{schema_version:1,kind:'service-activity-v1',...pins,guard_names:guardNames,
  dependencies_sha256:after[0].fingerprints.dependencies,modules_sha256:sha(changes),
  modules:Object.fromEntries(modules.map(n=>[n,sha(read(n))])),target_effective_privileges_after:effective});
 write('tests/before-example.json',before[0]);write('tests/verified-example.json',after[0]);
 const proof={schema_version:1,kind:'service-activity-guard-generation',result:'PASS',generated_at_utc:new Date().toISOString(),
  source_inputs:Object.keys(inputs).length,install_replay_verified:true,retained_invariants_unchanged:true,
  new_table_effective_privileges_all_denied:true,live_database:false,production_storage:false,mac_installer:false,
  files:Object.fromEntries([...modules,'changes.sql','preflight.sql','apply.sql','verify.sql','source-pins.json','catalog-pins.json'].map(n=>[n,sha(read(n))]))};
 write('guard-generation-result.json',proof);console.log(JSON.stringify(proof));
}catch(error){console.error(JSON.stringify({result:'FAIL',message:error.message,code:error.code,stack:error.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
