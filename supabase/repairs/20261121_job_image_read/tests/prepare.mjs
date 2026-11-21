import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import {observe,compose,changedFunctions,context,format} from './catalog.mjs';
const {db,repair,result,sha,modules}=f;
try{
 await db.exec("SET search_path=pg_catalog,pg_temp;SET timezone='UTC';SET jit=off;");
 const before=(await result(observe()))[0];assert.equal(before.installer_ready,true);
 assert.equal(before.settings.length,1);assert.deepEqual(Object.fromEntries(Object.keys(context).map(k=>[k,before.settings[0][k]])),context);
 const oldData=await f.snapshot();const changes=f.changes();
 await db.exec('BEGIN');try{await db.exec(changes);await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
 const after=(await result(observe()))[0];assert.deepEqual(after.settings,before.settings);
 assert.deepEqual(await f.snapshot(),oldData);assert.deepEqual(await f.authSnapshot(),f.authBaseline);
 const beforeFns=new Map(before.facts.functions.map(x=>[x.signature,x]));
 const afterFns=new Map(after.facts.functions.map(x=>[x.signature,x]));
 assert.deepEqual([...afterFns.keys()],[...beforeFns.keys()]);
 const changed=[];
 for(const [signature,next] of afterFns){const old=beforeFns.get(signature);
  assert.deepEqual({...next,body:old.body},old,'only planned function body changes; signature/owner/ACL/config retained');
  if(next.body!==old.body)changed.push(signature.split('(')[0]);
 }
 assert.deepEqual(changed.sort(),[...changedFunctions].sort());
 assert.deepEqual(before.facts.tables,after.facts.tables);
 assert.deepEqual(before.facts.schema,after.facts.schema);
 assert.deepEqual(before.facts.added_triggers,after.facts.added_triggers);
 const pins={format,before:before.scope_sha256,after:after.scope_sha256,context,modules,changed_functions:changedFunctions,
  changes_sha256:sha(changes),before_facts:before.facts,after_facts:after.facts};
 const compiled=compose(pins,changes);assert.equal((await result(compiled.verify))[0].state,'after');
 fs.writeFileSync(path.join(repair,'changes.sql'),changes+'\n');
 for(const [name,text] of Object.entries(compiled))fs.writeFileSync(path.join(repair,name+'.sql'),text);
 fs.writeFileSync(path.join(repair,'catalog-pins.json'),JSON.stringify(pins,null,2)+'\n');
 fs.writeFileSync(path.join(repair,'source-pins.json'),JSON.stringify({format,modules:Object.fromEntries(modules.map(n=>[n,sha(fs.readFileSync(path.join(repair,n)))])),
  sql:Object.fromEntries(['preflight.sql','apply.sql','verify.sql'].map(n=>[n,sha(fs.readFileSync(path.join(repair,n)))])),retained_inputs:f.provenance},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',format,before:pins.before,after:pins.after,changed_functions:changed,
  non_superuser:!f.installerFacts.rolsuper,data_unchanged:true,auth_authority_unchanged:true}));
}catch(error){console.error(JSON.stringify({result:'FAIL',message:error.message,code:error.code,detail:error.detail,where:error.where,position:error.position,stack:error.code?undefined:error.stack},null,2));process.exitCode=1;}
finally{await db.close();}
