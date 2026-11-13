import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,repair,source,provenance,modules,install,sha,result,snapshot} from './fixture.mjs';
import {parts,report,digest,array,guardNames,queryOnly,functionBody,replacedNames,compileControlSql} from './catalog.mjs';
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const write=(name,value)=>fs.writeFileSync(path.join(repair,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const activity=source('supabase/repairs/20261111_service_activity/verify.sql');
 const service=source('supabase/repairs/20261108_service_publication/preflight.sql');
 const originals=(await db.query('WITH function_facts AS ('+functionBody(queryOnly(activity))+') SELECT * FROM function_facts WHERE name=ANY('+array(replacedNames)+') ORDER BY signature')).rows;
 const p=parts(activity,service,originals),retained=(await db.query(p.retained)).rows[0].result;
 assert.equal(retained.state,'applied',JSON.stringify(retained));
 const capability=async()=>(await db.query('WITH '+p.extra+' SELECT '+digest(p.target)+' value')).rows[0].value;
 const blockFacts=(await db.query('SELECT '+p.blockFacts+' value')).rows[0].value;
 assert.equal(blockFacts.owner,'postgres');assert.equal(blockFacts.rls,true);assert.equal(blockFacts.policies.length,5);
 assert.equal(blockFacts.pair_index_ready,true);assert.equal(blockFacts.primary_id_ready,true);
 assert.deepEqual(blockFacts.triggers,[]);assert.deepEqual(blockFacts.rules,[]);assert.deepEqual(blockFacts.incoming,[]);
 const pins={retainedFingerprints:retained.fingerprints,normalized_retained_function_facts:originals,before:await capability(),
  blockAuthority:(await db.query('SELECT '+digest(p.blockFacts)+' value')).rows[0].value,account_block_authority_facts:blockFacts};
 const rows=await snapshot();await db.exec('BEGIN');await install();pins.after=await capability();assert.notEqual(pins.before,pins.after);
 assert.deepEqual(await snapshot(),rows,'no retained application row changes');
 assert.deepEqual((await db.query(p.retained)).rows[0].result,retained,'all retained catalog guards and invariants stable');
 const effective=(await db.query('WITH '+p.extra+' SELECT '+p.effective+' value')).rows[0].value;
 assert(effective.every(x=>!x.allowed&&!x.grantable));await db.exec('ROLLBACK');
 const query=report(p,pins),changes=modules.map(name=>'-- COMPONENT '+name+'\n'+read(name)).join('\n');
 const compiled=compileControlSql(query,changes),{preflight,apply}=compiled;
 for(const name of [...modules,'tests/fixture.mjs','tests/catalog.mjs','tests/build-readers.mjs','tests/build-guards.mjs'])
  source('supabase/repairs/20261113_provider_controls/'+name);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 write('changes.sql',changes);write('preflight.sql',preflight);write('verify.sql',preflight);write('apply.sql',apply);
 write('source-pins.json',{schema_version:1,inputs});
 const before=await result(preflight);assert.equal(before.length,1);assert.equal(before[0].state,'absent',JSON.stringify(before));
 assert.deepEqual(Object.keys(before[0].guards).sort(),guardNames.slice().sort());
 const after=await result(apply);assert.equal(after.length,1);assert.equal(after[0].state,'applied');
 assert.deepEqual(await result(apply),after);assert.deepEqual(await result(preflight),after);
 write('catalog-pins.json',{schema_version:1,kind:'provider-controls-v1',...pins,guard_names:guardNames,
  dependencies_sha256:after[0].fingerprints.dependencies,modules_sha256:sha(changes),
  modules:Object.fromEntries(modules.map(n=>[n,sha(read(n))])),target_effective_privileges_after:effective,guard_report_optimization:compiled.optimization});
 write('tests/before-example.json',before[0]);write('tests/verified-example.json',after[0]);
 write('guard-generation-result.json',{schema_version:1,kind:'provider-controls-guard-generation',result:'PASS',
  generated_at_utc:new Date().toISOString(),guard_report_optimization:compiled.optimization,source_inputs:Object.keys(inputs).length,engine:'PGlite PostgreSQL/WASM',
  installed_replay_and_independent_read_equal:true,retained_rows_unchanged:true,retained_catalog_unchanged:true,
  new_table_API_privileges_closed:true,synthetic_rows:true,concurrent_sessions:false,live_database:false,production_storage:false});
 console.log(JSON.stringify({result:'PASS',guards:guardNames.length,sources:Object.keys(inputs).length,pins:{before:pins.before,after:pins.after}}));
}catch(e){console.error(JSON.stringify({result:'FAIL',code:e.code,message:e.message,where:e.where,position:e.position,query_context:e.query?.slice(Number(e.position)-120,Number(e.position)+100),stack:e.stack?.split('\n').slice(0,6)}));process.exitCode=1;}
finally{await db.close();}
