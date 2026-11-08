import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url)),repair=fileURLToPath(new URL('..',import.meta.url));
const cases=['new_publications_exact_ninety_days','status_revoke_public_preserve_owner_media',
 'expired_requires_explicit_renewal_and_exact_cas','legacy_null_deadline_finite_fallback',
 'stale_edit_cannot_undo_status_or_renewal','paused_sold_expired_edits_preserve_lifecycle',
 'actor_ownership_and_canonical_finality','completed_sources_cleanup_when_not_public',
 'longer_period_and_nonactionable_states'];
const selected=process.argv.slice(2).length?process.argv.slice(2):cases,started=new Date().toISOString(),results=[];
for(const name of selected){
 if(!cases.includes(name))throw Error('Unknown case '+name);
 const run=spawnSync(process.execPath,[here+'runtime-case.mjs',name],{encoding:'utf8',env:process.env,timeout:120000});
 if(run.status!==0){process.stderr.write(run.stderr||run.stdout);process.exit(run.status||1);}
 const result=JSON.parse(run.stdout.trim());results.push(result);console.log(JSON.stringify(result));
}
if(selected.length===cases.length)fs.writeFileSync(repair+'/runtime-result.json',JSON.stringify({schema_version:1,
 suite:'canonical-horse-lifecycle-and-public-visibility',started_at_utc:started,completed_at_utc:new Date().toISOString(),
 passed:results.length,total:cases.length,files:Object.fromEntries(['01_lifecycle_core.sql','02_owner_actions.sql','03_authority.sql'].map(name=>
 [name,crypto.createHash('sha256').update(fs.readFileSync(repair+'/'+name)).digest('hex')])),scenarios:results,
 limitations:['Disposable PostgreSQL/WASM with synthetic provider metadata; no actual Storage HTTP, remote migration or native concurrent scheduling is claimed.']},null,2)+'\n');
