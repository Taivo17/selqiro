import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,root,repair,source,provenance,modules,install} from './fixture.mjs';
import {parts,report,digest,dependencyNames,guardNames} from './catalog.mjs';
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const write=(name,value)=>fs.writeFileSync(path.join(repair,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const p=parts(source('supabase/repairs/20261109_service_profile_polish/verify.sql'),
  source('supabase/repairs/20261108_service_publication/preflight.sql'));
 const scalar=async(expr)=>(await db.query('WITH '+p.extra+' SELECT '+digest(expr)+' value')).rows[0].value;
 const retained=(await db.query(p.retained)).rows[0].result;assert.equal(retained.state,'applied');
 const pins={functions:await scalar(p.functions),relations:await scalar(p.relations),effects:await scalar(p.effects),
  before:await scalar(p.capability),retainedDependencies:retained.fingerprints.dependencies,retainedCapability:retained.fingerprints.capability};
 await db.exec('BEGIN');await install();pins.after=await scalar(p.capability);assert.notEqual(pins.after,pins.before);
 for(const [key,expr] of [['functions',p.functions],['relations',p.relations],['effects',p.effects]])assert.equal(await scalar(expr),pins[key]);
 assert.deepEqual((await db.query(p.retained)).rows[0].result,retained);
 await db.exec('ROLLBACK');
 const query=report(p,pins);
 const changes=modules.map(name=>'-- COMPONENT '+name+'\n'+read(name)).join('\n');
 const header='-- GENERATED from retained, source-verified declarations. No application data changes.\n-- Modules SHA-256: '+sha(changes)+'\n';
 const preflight=header+"BEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL statement_timeout='20s';\n"+query+';\nCOMMIT;\n';
 const apply=header+`BEGIN;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL lock_timeout='3s';\nSET LOCAL statement_timeout='45s';
 DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-store-category-management-v1',0));END $lock$;
 LOCK TABLE public.profiles,public.identities,public.business_members,public.store_categories,public.listing_store_categories IN ACCESS SHARE MODE;
 CREATE TEMP TABLE store_category_management_before ON COMMIT DROP AS ${query};
 DO $before$ BEGIN IF NOT EXISTS(SELECT 1 FROM store_category_management_before WHERE
  result->>'state' IN('absent','applied') AND (result->>'recognized')::boolean AND (result->>'dependencies_ok')::boolean) THEN
  RAISE EXCEPTION 'STORE_CATEGORY_MANAGEMENT_PRECONDITIONS_NOT_MATCHED' USING ERRCODE='55000';END IF;END $before$;
 DO $apply$ BEGIN IF EXISTS(SELECT 1 FROM store_category_management_before WHERE result->>'state'='absent') THEN
  EXECUTE $management$${changes}$management$;END IF;END $apply$;
 CREATE TEMP TABLE store_category_management_after ON COMMIT DROP AS ${query};
 DO $after$ BEGIN IF NOT EXISTS(SELECT 1 FROM store_category_management_after a CROSS JOIN store_category_management_before b
 WHERE a.result->>'state'='applied' AND (a.result->>'recognized')::boolean AND (a.result->>'dependencies_ok')::boolean
 AND a.result->'invariants'=b.result->'invariants'
 AND a.result->'fingerprints'->>'dependencies'=b.result->'fingerprints'->>'dependencies'
 AND a.result->'hosted_context'=b.result->'hosted_context') THEN
 RAISE EXCEPTION 'STORE_CATEGORY_MANAGEMENT_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $after$;
 NOTIFY pgrst,'reload schema';SELECT result FROM store_category_management_after;COMMIT;\n`;
 for(const name of [...modules,'tests/fixture.mjs','tests/catalog.mjs','tests/build-guards.mjs'])
  source('supabase/repairs/20261110_store_category_management/'+name);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 write('changes.sql',changes);write('preflight.sql',preflight);write('verify.sql',preflight);write('apply.sql',apply);
 write('source-pins.json',{schema_version:1,inputs});
 const result=async(sql)=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result);
 const before=await result(preflight);assert.equal(before.length,1);assert.equal(before[0].result.state,'absent');
 assert.deepEqual(Object.keys(before[0].result.guards).sort(),guardNames.slice().sort());
 const after=await result(apply);assert.equal(after.length,1);assert.equal(after[0].result.state,'applied');
 assert.deepEqual(await result(apply),after);assert.deepEqual(await result(preflight),after);
 write('catalog-pins.json',{schema_version:1,kind:'store-category-management-v1',...pins,
  guard_names:guardNames,dependency_names:dependencyNames,dependencies_sha256:after[0].result.fingerprints.dependencies,
  modules_sha256:sha(changes),modules:Object.fromEntries(modules.map(n=>[n,sha(read(n))]))});
 write('tests/before-example.json',before[0].result);write('tests/verified-example.json',after[0].result);
 const proof={schema_version:1,kind:'store-category-management-guard-generation',result:'PASS',generated_at_utc:new Date().toISOString(),
  new_rpc:1,source_inputs:Object.keys(inputs).length,install_replay_verified:true,retained_invariants_unchanged:true,
  live_database:false,production_storage:false,mac_installer:false,
  files:Object.fromEntries(['01_management.sql','changes.sql','preflight.sql','apply.sql','verify.sql','source-pins.json','catalog-pins.json'].map(n=>[n,sha(read(n))]))};
 write('guard-generation-result.json',proof);console.log(JSON.stringify(proof));
}finally{await db.close();}
