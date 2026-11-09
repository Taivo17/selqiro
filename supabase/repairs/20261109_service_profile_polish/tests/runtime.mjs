import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here);
const results=[];
for(const name of ['service_creation_order','unified_profile_pages']){
 const started=new Date().toISOString();
 const run=spawnSync(process.execPath,[path.join(here,'runtime-case.mjs'),name],{
  env:process.env,encoding:'utf8',timeout:120000,maxBuffer:4*1024*1024});
 assert.equal(run.status,0,run.stderr||run.error?.message||run.stdout);
 const value=JSON.parse(run.stdout.trim());assert.equal(value.result,'PASS');assert.equal(value.case,name);
 assert.equal(value.check_count,value.checks.length);assert.equal(new Set(value.checks).size,value.checks.length);
 const receipt={...value,started_at_utc:started,finished_at_utc:new Date().toISOString(),exit_code:run.status,
  stdout_sha256:crypto.createHash('sha256').update(run.stdout).digest('hex'),stderr_bytes:Buffer.byteLength(run.stderr)};
 fs.writeFileSync(path.join(here,'runtime-'+name+'.json'),JSON.stringify(receipt,null,2)+'\n');results.push(receipt);
}
const result={schema_version:1,kind:'service-profile-polish-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
 node_version:process.version,case_count:results.length,check_count:results.reduce((n,x)=>n+x.check_count,0),cases:results,
 live_database:false,provider_io:false,native_concurrency:false,
 limits:['Fresh disposable PostgreSQL/WASM with retained SQL declarations; no original suite was executed.',
 'Synthetic service and ordinary rows plus three controlled horse publications; no external account or file was changed.',
 'No PostgREST, Storage, Mac, GitHub or Vercel acceptance is claimed.']};
fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({result:'PASS',cases:result.case_count,checks:result.check_count}));
