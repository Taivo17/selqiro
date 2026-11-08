import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),repair=path.dirname(here);
const cases=['reported_259mib_and_all_three_gates','cross_identity_account_scope_and_revocation',
 'exact_provider_proof_and_source_only_record','published_gallery_can_exceed_former_lifetime_cap',
 'retired_web_debt_and_zero_upload_edit','record_after_whole_listing_removal','three_hundred_historical_listings',
 'legacy_published_source_receipt_preserved'];
const selected=process.argv.slice(2).length?process.argv.slice(2):cases,started=new Date().toISOString(),results=[];
for(const name of selected){
 if(!cases.includes(name))throw Error('Unknown case '+name);
 const run=spawnSync(process.execPath,[here+'/runtime-case.mjs',name],{encoding:'utf8',env:process.env});
 if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1);}
 const result=JSON.parse(run.stdout.trim());results.push(result);console.log(JSON.stringify(result));
}
if(selected.length===cases.length)fs.writeFileSync(repair+'/runtime-result.json',JSON.stringify({schema_version:1,
 suite:'transient-upload-capacity-and-account-source-cleanup',started_at_utc:started,completed_at_utc:new Date().toISOString(),
 passed:results.length,total:cases.length,files:Object.fromEntries(['01_capacity.sql','02_account_source_cleanup.sql','03_authority.sql'].map(name=>
  [name,crypto.createHash('sha256').update(fs.readFileSync(repair+'/'+name)).digest('hex')])),scenarios:results,
 limitations:['Disposable PostgreSQL/WASM with synthetic provider metadata; no actual Storage HTTP deletion, remote migration or native concurrent scheduling is claimed.']},null,2)+'\n');
