import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,root,repair,provenance,source,modules,install,sha,result,snapshot} from './fixture.mjs';
import {observe,report,compile,guardNames,changedFunctions,newFunctions} from './catalog.mjs';
const read=n=>fs.readFileSync(path.join(repair,n),'utf8');
const write=(n,v)=>fs.writeFileSync(path.join(repair,n),typeof v==='string'?v:JSON.stringify(v,null,2)+'\n');
const obs=async()=>(await db.query(observe())).rows[0].result;
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 // One reproducible original-setter transformation. No old SQL file changes.
 const original=source('supabase/repairs/20261113_provider_controls/04_actions.sql');
 const oldDelete='   DELETE FROM public.user_blocks WHERE id=b.id AND blocker_id=actor AND blocked_id=account_value AND created_at=p_expected_block_created_at;\n   changed:=FOUND;';
 const delegation='   changed:=provider_controls_private.remove_account_block_v1(actor,account_value,b.id,p_expected_block_created_at);';
 assert.equal(original.split(oldDelete).length,2);
 const setter='-- Generated from the accepted provider-controls setter; only DELETE delegates.\n'+
  original.replace('CREATE FUNCTION public.set_my_provider_control_v1(','CREATE OR REPLACE FUNCTION public.set_my_provider_control_v1(').replace(oldDelete,delegation);
 write('04_cas_setter.sql',setter);
 const before=await obs();assert(before.installer&&before.actor_roles);assert.equal(before.hosted_context.length,1);
 const rows=await snapshot();
 await db.exec('BEGIN');await install();const after=await obs();
 assert.deepEqual(await snapshot(),rows,'installer does not modify application rows');
 assert.deepEqual(after.invariants,before.invariants,'only intended catalog changes');
 for(const g of guardNames.filter(n=>!['installer','actor_roles','hosted_context_ready'].includes(n)))assert.deepEqual(after[g],before[g],g+' unchanged');
 assert.notEqual(before.capability.sha256,after.capability.sha256);await db.exec('ROLLBACK');
 const pins={schema_version:1,kind:'block-removal-cas-v1',
  before:before.capability.sha256,after:after.capability.sha256,
  guards:Object.fromEntries(guardNames.filter(n=>!['installer','actor_roles','hosted_context_ready'].includes(n)).map(n=>[n,before[n].sha256])),
  hosted_context:before.hosted_context[0],guard_names:guardNames,
  changed_functions:changedFunctions,new_functions:newFunctions,
  intentional_existing_changes:['messaging_private_v2.set_block body','public.set_my_provider_control_v1 CAS DELETE delegation',
   'public.user_blocks table/column browser write ACL','public.user_blocks_id_seq browser UPDATE ACL'],
  new_objects_and_grants:['selqiro_block_removal_writer_v1','two provider_controls_private functions','two own-row RLS policies',
   'user_blocks_cas_delete_v1 trigger','new writer USAGE/SELECT/DELETE/auth.uid EXECUTE grants'],
  invariant_exclusions:['two changed function bodies/complete capability-pinned facts','new writer grants/role/functions/policies/trigger',
   'user_blocks table/column ACL and sequence ACL: complete before/after capability pin'],
  before_facts:before,after_facts:after};
 const changes=modules.map(n=>'-- COMPONENT '+n+'\n'+read(n)).join('\n');
 const compiled=compile(report(pins),changes);
 write('changes.sql',changes);write('preflight.sql',compiled.preflight);write('verify.sql',compiled.preflight);write('apply.sql',compiled.apply);
 const first=await result(compiled.preflight);assert.equal(first.length,1);assert.equal(first[0].state,'absent',JSON.stringify(first));
 const applied=await result(compiled.apply);assert.equal(applied.length,1);assert.equal(applied[0].state,'applied',JSON.stringify(applied));
 assert.deepEqual(await snapshot(),rows,'guarded apply preserves rows');
 assert.deepEqual(await result(compiled.preflight),applied,'independent read matches apply');
 assert.deepEqual(await result(compiled.apply),applied,'applied SQL path changes no capability');
 assert.deepEqual(await snapshot(),rows);
 for(const n of [...modules,'tests/catalog.mjs','tests/build-guards.mjs','tests/fixture.mjs'])source('supabase/repairs/20261113_block_removal/'+n);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 const drift=Object.entries(inputs).filter(([n,h])=>sha(fs.readFileSync(path.join(root,n)))!==h).map(([n])=>n);assert.deepEqual(drift,[]);
 pins.modules=Object.fromEntries(modules.map(n=>[n,sha(read(n))]));pins.modules_sha256=sha(changes);
 pins.dependencies_sha256=applied[0].fingerprints.dependencies;
 write('source-pins.json',{schema_version:1,inputs});
 write('catalog-pins.json',pins);write('tests/before-example.json',first[0]);write('tests/verified-example.json',applied[0]);
 write('guard-generation-result.json',{schema_version:1,kind:'block-removal-cas-guard-generation',result:'PASS',
  generated_at_utc:new Date().toISOString(),engine:'PGlite PostgreSQL/WASM',synthetic_fixture:true,live_database:false,
  input_drift:drift,source_inputs:Object.keys(inputs).length,guards:guardNames.length,
  setter_original_sha256:sha(original),setter_delegation_only:true,retained_rows_unchanged:true,
  invariant_equality:true,independent_read_matches_apply:true,
  cleanup_mode_evidence:'derived retained-contract label; no fresh cleanup state observation',already_applied_path_preserves_catalog_and_rows:true,
  sql_sha256:Object.fromEntries(['changes.sql','preflight.sql','apply.sql','verify.sql'].map(n=>[n,sha(read(n))]))});
 console.log(JSON.stringify({result:'PASS',before:pins.before,after:pins.after,guards:guardNames.length,bytes:{read:compiled.preflight.length,apply:compiled.apply.length}}));
}catch(e){console.error(JSON.stringify({result:'FAIL',code:e.code,message:e.message,detail:e.detail,where:e.where,
 position:e.position,query_context:e.query?.slice(Math.max(0,Number(e.position)-120),Number(e.position)+100),stack:e.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
