import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here);
const cases=['install_and_replay','unknown_function','unknown_authority','partial_schema','applied_acl_drift',
 'writer_role_drift','canonical_schema_drift','atomic_rollback','retained_policy_baseline','policy_definition_drift',
 'extra_private_policy','missing_public_writer_policy','provider_baseline_and_defaults',
 'retained_helper_acl_grantee','retained_helper_acl_grant_option','retained_policy_acl_grant_option',
 'retained_function_overload','writer_bootstrap_inherit','writer_bootstrap_set','writer_bootstrap_admin','writer_bootstrap_grantor'];
const chosen=process.argv.slice(2).length?process.argv.slice(2):cases,results=[],start=new Date().toISOString();
for(const name of chosen){assertCase(name);const r=spawnSync(process.execPath,[here+'/installation-case.mjs',name],{encoding:'utf8',env:process.env});
 if(r.status!==0){process.stderr.write(r.stderr||r.stdout);process.exit(r.status||1);}const data=JSON.parse(r.stdout.trim());results.push(data);console.log(JSON.stringify(data));}
function assertCase(name){if(!cases.includes(name))throw Error('Unknown installation case '+name);}
if(chosen.length===cases.length){const hash=n=>crypto.createHash('sha256').update(fs.readFileSync(repair+'/'+n)).digest('hex');
 fs.writeFileSync(repair+'/installation-result.json',JSON.stringify({schema_version:1,suite:'horse-installation-guards',started_at_utc:start,
 completed_at_utc:new Date().toISOString(),passed:results.length,total:cases.length,
 files:Object.fromEntries(['preflight.sql','apply.sql','verify.sql','catalog-pins.json','source-pins.json'].map(n=>[n,hash(n)])),scenarios:results,
 limitations:['Disposable PostgreSQL/WASM only; actual remote catalog is checked by generated preflight before any mutation.',
 'No live database, native concurrent lock scheduling, Mac installer run or Vercel deployment is claimed.']},null,2)+'\n');}
