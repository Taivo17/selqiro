import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url));
const cases=['commands_and_cas','legacy_identity_and_authority','managed_media_cleanup_and_binding','domain_cancel_policy_and_public_search','contact_context_business_and_history','ordinary_horse_binary_regressions'];
const checks=[];
for(const name of cases){const r=spawnSync(process.execPath,[path.join(here,'runtime-case.mjs'),name],{encoding:'utf8',env:process.env,maxBuffer:8*1024*1024,timeout:90000});
 if(r.status!==0){console.error(r.stdout+r.stderr);process.exitCode=1;break;}
 const value=JSON.parse(r.stdout.trim().split('\n').at(-1));checks.push(value);console.log(JSON.stringify(value));}
const result={schema_version:1,kind:'service-publication-runtime',result:checks.length===cases.length?'PASS':'FAIL',generated_at_utc:new Date().toISOString(),checks,
 live_database:false,production_storage:false,native_concurrency:false,limitations:['WASM database serializes commands; stale revision races are interleaved, not simultaneous sessions.','Provider object metadata is synthetic.']};
fs.writeFileSync(path.join(here,'..','runtime-result.json'),JSON.stringify(result,null,2)+'\n');
