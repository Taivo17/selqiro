import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url)),repair=fileURLToPath(new URL('..',import.meta.url));
const cases=['saved_evidence_only_after_successful_publication','repeated_edits_keep_original_evidence_and_lifecycle',
 'wanted_reuse_preserves_four_fact_scope','invalid_reference_new_draft_other_offer_and_type_refused',
 'same_person_identity_and_private_authority','changed_policies_remain_explicit_and_exact',
 'exact_retry_conflict_and_stale_revision','final_write_rechecks_original_evidence','old_explicit_attempt_survives_install'];
const selected=process.argv.slice(2).length?process.argv.slice(2):cases,started=new Date().toISOString(),results=[];
for(const name of selected){
 if(!cases.includes(name))throw Error('Unknown case '+name);
 const run=spawnSync(process.execPath,[here+'runtime-case.mjs',name],{encoding:'utf8',env:process.env,timeout:120000,maxBuffer:4*1024*1024});
 if(run.status!==0){process.stderr.write(run.stderr||run.stdout||String(run.error));process.exit(run.status||1);}
 const result=JSON.parse(run.stdout.trim());results.push(result);console.log(JSON.stringify(result));
}
if(selected.length===cases.length)fs.writeFileSync(repair+'/runtime-result.json',JSON.stringify({schema_version:1,
 suite:'stored-horse-confirmation-evidence-and-edit-reuse',started_at_utc:started,completed_at_utc:new Date().toISOString(),
 passed:results.length,total:cases.length,files:Object.fromEntries(['01_saved_confirmations.sql','02_commands.sql','03_authority.sql',
 'tests/fixture.mjs','tests/runtime-case.mjs','tests/runtime.mjs'].map(name=>
 [name,crypto.createHash('sha256').update(fs.readFileSync(repair+'/'+name)).digest('hex')])),scenarios:results,
 limitations:['Disposable PostgreSQL/WASM with synthetic provider metadata; no actual Storage HTTP, remote migration or native concurrent scheduling is claimed.']},null,2)+'\n');
