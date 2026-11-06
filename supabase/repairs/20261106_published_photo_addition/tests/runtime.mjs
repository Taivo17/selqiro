// Each meaningful lifecycle starts from one isolated retained fixture. No old
// suite, provider IO or simulated parallel scheduling is presented as evidence.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const cases=['append_and_replay','concurrent_cas','active_cap_and_monotone','late_active_cap','first_photo',
 'retired_replay','ordinary_publish','sql_first_compatibility','child_not_normal_publication',
 'cancel_before_prepare','cancel_uncertain_upload','delete_parent_with_children','business_member',
 'authority_and_stale_identity','append_requires_live_verified_storage','expired_child','lifetime_cleanup_page'];
const requested=process.argv.slice(2),selected=requested.length?requested:cases;
const started=new Date().toISOString(),results=[];
let passed=0;
for(const name of selected) {
 if(!cases.includes(name))throw Error('unknown focused SQL case: '+name);
 const result=spawnSync(process.execPath,[path.join(here,'runtime-case.mjs'),name],{encoding:'utf8',env:process.env});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stdout.trim())results.push(JSON.parse(result.stdout.trim()));
 if(result.status!==0){if(result.stderr)process.stderr.write(result.stderr);process.exitCode=1;break;}
 passed++;
}
console.log(JSON.stringify({suite:'published-photo-addition-sql',passed,total:selected.length,
 provider_io:false,native_concurrency:false}));
if(!requested.length&&passed===cases.length) {
 const repair=path.dirname(here),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const modules=Object.fromEntries(fs.readdirSync(path.join(repair,'modules')).filter(x=>x.endsWith('.sql')).sort()
  .map(x=>['modules/'+x,sha(path.join(repair,'modules',x))]));
 const tests=Object.fromEntries(['fixture.mjs','retained-authority.mjs','runtime.mjs','runtime-case.mjs',
  'runtime-core.mjs','runtime-lifecycle.mjs','runtime-helpers.mjs'].map(x=>['tests/'+x,sha(path.join(here,x))]));
 const meanings={append_and_replay:'One verified photo attaches once, preserves primary and original publisher; lost reply recovers exact receipt; SOURCE cleanup releases only child SOURCE reservation.',
  concurrent_cas:'Two prepared additions at one revision serialize; stale second append fails CAS without losing its ready photo; explicit current revision succeeds.',
  active_cap_and_monotone:'Ten active photos block preparation; retirement permits ordinals10 and11 with immutable independent media URLs and current primary preserved.',
  late_active_cap:'Two prepared attempts for the last active slot cannot both attach, including a refreshed-revision second append.',
  first_photo:'Zero-image original publication receives its first child as ordinal0 and primary.',
  retired_replay:'Retired child WEB is no longer served; exact cleanup releases its reservation; old append ACK survives retirement and whole parent deletion without resurrection.',
  ordinary_publish:'The unchanged user path performs initial prepare, SOURCE/WEB completion and verification, confirmation and original publication through the shared allocator.',
  sql_first_compatibility:'No-child gallery, primary/removal responses and root cleanup tasks preserve exact old schema1; no-child multipart remains schema3.',
  child_not_normal_publication:'Ready child cannot enter ordinary confirmation/publish; an unrelated actor gets ownership refusal before child-purpose disclosure.',
  cancel_before_prepare:'Durable existing request tombstone blocks a delayed preparation without creating a child or reserving bytes.',
  cancel_uncertain_upload:'Cancellation closes an uncertain multipart dispatch while retaining exact cleanup lineage and quota; published parent SOURCE count excludes unattached children.',
  delete_parent_with_children:'Whole deletion closes attached, ready and uncertain children atomically; all ten objects remain accounted for and no later dispatch/attach can revive content.',
  business_member:'Another active business member may append and clean SOURCE; parent publisher remains unchanged; revoked member loses access.',
  authority_and_stale_identity:'Bound actor, current identity, RPC roles, protected binding relation and immutable metadata reject unauthorized writes/reads.',
  append_requires_live_verified_storage:'Ready acknowledgement alone cannot attach when exact Storage object metadata is absent or an upload witness remains unresolved.',
  expired_child:'An initially expired synthetic child cannot append or dispatch; cancellation retains its object lineage and reservations.',
  lifetime_cleanup_page:'Twenty-one retained objects across one root and nine cancelled children remain accurately counted while a cleanup response carries at most twenty exact origins.'};
 const modulePath=process.env.SELQIRO_PGLITE_MODULE;
 const packageVersion=modulePath?JSON.parse(fs.readFileSync(path.resolve(path.dirname(modulePath),'..','package.json'),'utf8')).version:null;
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify({schema_version:1,
  suite:'published-photo-addition-sql',started_at_utc:started,completed_at_utc:new Date().toISOString(),passed,total:cases.length,
  command:`SELQIRO_PGLITE_MODULE=${modulePath??'@electric-sql/pglite'} node supabase/repairs/20261106_published_photo_addition/tests/runtime.mjs`,
  environment:{node:process.version,pglite:packageVersion,postgres:results[0].postgres},
  limitations:['Disposable PGlite PostgreSQL/WASM fixtures with synthetic accounts, listings and provider metadata.',
   'SOURCE/WEB and cleanup state transitions use retained SQL RPCs; metadata witnesses are synthetic and do not prove live Storage IO.',
   'Competing CAS requests execute serially in the fixture; native concurrent PostgreSQL lock scheduling is not tested.',
   'No Mac installation, remote database mutation, Git push or Vercel deployment is established by these results.'],
  changes_sha256:sha(path.join(repair,'changes.sql')),module_sha256:modules,fixture_and_test_sha256:tests,
  scenarios:results.map(r=>({id:r.case,passed:r.passed,purpose:meanings[r.case]}))},null,2)+'\n');
}
