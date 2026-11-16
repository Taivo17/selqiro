import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import {observe,report,compose,dependencyNames,publicNames} from './catalog.mjs';
const {db,repair,modules,sha,source,result,snapshot,authSnapshot,authBaseline,installerFacts}=f;
const read=n=>fs.readFileSync(path.join(repair,n),'utf8');
try{
 await db.exec("SET search_path=pg_catalog,pg_temp;SET timezone='UTC';SET jit=off;");
 const before=(await result(observe()))[0];
 assert.equal(before.foundation.state,'applied',JSON.stringify(before.foundation));
 const present=new Set(before.dependencies.map(x=>x.signature.split('(')[0]));
 assert.deepEqual(dependencyNames.filter(name=>!present.has(name)),[],'all named foundation functions present');
 const data=await snapshot();const changes=f.jobsSources();
 await db.exec('BEGIN');
 try{await db.exec(changes);await db.exec('COMMIT');}catch(error){await db.exec('ROLLBACK');throw error;}
 const after=(await result(observe()))[0];
 assert.equal(after.foundation.state,'applied',JSON.stringify(after.foundation));
 assert.deepEqual(after.invariants,before.invariants,'existing functions/authority/structure/Auth unchanged');
 assert.deepEqual(await authSnapshot(),authBaseline);assert.deepEqual(await snapshot(),data);
 const pins={schema_version:1,kind:'jobs-public-v1',dependencies:before.dependency_hash,before:before.capability_hash,after:after.capability_hash,
 hosted_context:before.foundation.hosted_context,modules,public_entrypoints:publicNames,installerFacts,
 before_facts:before,after_facts:after,changes_sha256:sha(changes),invariant_exclusions:[
 'Only new job_message_context on public.messages, job_clear_on_listing on public.conversations and job_clear_context triggers on existing service/horse pointers are excluded from old structure comparison and included in complete job capability inventory.',
 'Only incoming FKs from jobs_private contact/context/card tables are excluded from old block-report structure and included in job table inventory. No old function, ACL or policy is excluded.']};
 const compiled=compose(report(pins),changes);
 assert.equal((await result(compiled.verify))[0].state,'applied');
 fs.writeFileSync(path.join(repair,'changes.sql'),changes+'\n');
 for(const [name,text] of Object.entries(compiled))fs.writeFileSync(path.join(repair,name+'.sql'),text);
 fs.writeFileSync(path.join(repair,'catalog-pins.json'),JSON.stringify(pins,null,2)+'\n');
 fs.writeFileSync(path.join(repair,'source-pins.json'),JSON.stringify({schema_version:1,modules:Object.fromEntries(modules.map(n=>[n,sha(read(n))])),
 changes_sha256:sha(read('changes.sql')),sql:Object.fromEntries(['preflight.sql','apply.sql','verify.sql'].map(n=>[n,sha(read(n))])),
 retained_inputs:f.provenance},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',kind:'jobs-public-catalog-preparation',before:pins.before,after:pins.after,dependencies:pins.dependencies,
 unchanged_invariants:before.invariants,non_superuser:!installerFacts.rolsuper,files:['changes.sql','preflight.sql','apply.sql','verify.sql','catalog-pins.json','source-pins.json']}));
}catch(error){console.error(JSON.stringify({result:'FAIL',message:error.message,code:error.code,detail:error.detail,where:error.where,position:error.position,stack:error.code?undefined:error.stack},null,2));process.exitCode=1;}
finally{await db.close();}
