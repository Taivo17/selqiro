import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here);
const cases=['retained_release_inventory','retained_release_function_missing','install_and_replay','changed_publisher_metadata_drift','retained_function_body_drift',
 'retained_public_acl_drift','extra_private_function','partial_helper','applied_owner_acl_drift',
 'horse_policy_drift','writer_role_drift','atomic_rollback'];
const chosen=process.argv.slice(2).length?process.argv.slice(2):cases,results=[],start=new Date().toISOString();
for(const name of chosen){
 if(!cases.includes(name))throw Error('Unknown installation case '+name);
 const result=spawnSync(process.execPath,[here+'/installation-case.mjs',name],
  {encoding:'utf8',env:process.env,timeout:120000,maxBuffer:4*1024*1024});
 if(result.status!==0){process.stderr.write(result.stderr||result.stdout||String(result.error));process.exit(result.status||1);}
 const data=JSON.parse(result.stdout.trim());results.push(data);console.log(JSON.stringify(data));
}
if(chosen.length===cases.length){
 const hash=name=>crypto.createHash('sha256').update(fs.readFileSync(repair+'/'+name)).digest('hex');
 fs.writeFileSync(repair+'/installation-result.json',JSON.stringify({schema_version:1,suite:'horse-lifecycle-installation-guards',
  started_at_utc:start,completed_at_utc:new Date().toISOString(),passed:results.length,total:cases.length,
  files:Object.fromEntries(['preflight.sql','apply.sql','verify.sql','catalog-pins.json','source-pins.json',
   'tests/build-guards.mjs','tests/fixture.mjs','tests/installation-case.mjs','tests/installation.mjs'].map(name=>[name,hash(name)])),
  scenarios:results,limitations:['Disposable PostgreSQL/WASM only; actual remote catalog is verified by generated preflight before mutation.',
   'No live database, native concurrent lock scheduling, Mac installer run or Vercel deployment is claimed.']},null,2)+'\n');
}
