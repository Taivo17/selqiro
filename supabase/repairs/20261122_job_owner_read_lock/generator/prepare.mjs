// Called by the coordinated native PostgreSQL test driver. No standalone fixture
// bootstrap, remote connection or live target exists in this module.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {repair,format,modules,changedFunctions,targetSignature,expectedPreviousAfter,context,sha,compose} from './catalog.mjs';
import {authorityRelations,authoritySchemas,requiredColumns,requiredKeys,requiredRls} from './authority.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
export async function prepareFromCaptures({db,before,after,changes,provenance=[],outputDir=repair}){
 assert.equal(before.scope_sha256,expectedPreviousAfter,'exact accepted image-reader catalog before repair');
 for(const capture of [before,after]){
  assert.equal(capture.installer_ready,true);assert.equal(capture.authority_contract_ready,true);
  assert.equal(capture.settings.length,1);
  assert.deepEqual(Object.fromEntries(Object.keys(context).map(k=>[k,capture.settings[0][k]])),context);
 }
 assert.deepEqual(after.settings,before.settings);
 assert.deepEqual(after.authority_facts,before.authority_facts,'actual authority metadata unchanged');
 assert.equal(after.authority_sha256,before.authority_sha256);
 const beforeFns=new Map(before.facts.functions.map(fn=>[fn.signature,fn]));
 const afterFns=new Map(after.facts.functions.map(fn=>[fn.signature,fn]));
 assert.deepEqual([...afterFns.keys()],[...beforeFns.keys()]);assert(beforeFns.has(targetSignature));
 const changed=[];
 for(const [signature,next] of afterFns){const old=beforeFns.get(signature);
  if(signature===targetSignature){
   assert.equal(old.volatility,'v');assert.equal(next.volatility,'s');assert.notEqual(next.body,old.body);
   assert.deepEqual({...next,body:old.body,volatility:old.volatility},old,'target owner, ACL, defaults, strictness and all other properties retained');
   changed.push(signature.split('(')[0]);
  }else assert.deepEqual(next,old,'shared read and write authority unchanged: '+signature);
 }
 assert.deepEqual(changed,changedFunctions);
 for(const key of ['tables','schema','added_triggers'])assert.deepEqual(after.facts[key],before.facts[key]);
 assert.notEqual(after.scope_sha256,before.scope_sha256);
 const pins={format,before:before.scope_sha256,after:after.scope_sha256,context,modules,changed_functions:changedFunctions,
  changes_sha256:sha(changes),before_facts:before.facts,after_facts:after.facts};
 const compiled=compose(pins,changes);
 // Execute only the bounded READ ONLY verification on the caller's local test
 // connection. The separate installation tests exercise apply and rollback.
 const verifyRows=(await db.exec(compiled.verify)).flatMap(r=>r.rows).filter(row=>row.result);
 assert.equal(verifyRows.length,1);assert.equal(verifyRows[0].result.state,'after');
 fs.mkdirSync(outputDir,{recursive:true});
 fs.writeFileSync(path.join(outputDir,modules[0]),changes.endsWith('\n')?changes:changes+'\n');
 fs.writeFileSync(path.join(outputDir,'changes.sql'),changes);
 for(const [name,text] of Object.entries(compiled))fs.writeFileSync(path.join(outputDir,name+'.sql'),text);
 fs.writeFileSync(path.join(outputDir,'catalog-pins.json'),JSON.stringify(pins,null,2)+'\n');
 const sourcePins={format,modules:Object.fromEntries(modules.map(n=>[n,sha(fs.readFileSync(path.join(outputDir,n)))])),
  sql:Object.fromEntries(['changes.sql','preflight.sql','apply.sql','verify.sql'].map(n=>[n,sha(fs.readFileSync(path.join(outputDir,n)))])),
  generator:Object.fromEntries(['core.mjs','authority.mjs','catalog.mjs','prepare.mjs'].map(n=>[n,sha(fs.readFileSync(path.join(here,n)))])),
  retained_inputs:provenance};
 fs.writeFileSync(path.join(outputDir,'source-pins.json'),JSON.stringify(sourcePins,null,2)+'\n');
 const boundary={format:'selqiro-job-owner-read-authority-capture-v1',fixed_scope_basis:'accepted 20261121_job_image_read after catalog',
  expected_previous_after:expectedPreviousAfter,fixture_authority_sha256:before.authority_sha256,
  fixture_authority_is_not_a_live_pin:true,comparison:'full captured authority metadata must equal before and after inside the same apply transaction',
  limitations:['No claim of a fresh live authority security audit.','No application user, profile, membership, allowlist or job rows are read by the guard.',
   'Managed Auth helper and Storage schemas are captured as found; their synthetic complete definitions are not pinned as live definitions.',
   'Concurrent changes after COMMIT remain independent operations; this is not a global catalog lock.'],
  relations:authorityRelations,schemas:authoritySchemas,required_columns:requiredColumns,required_unique_keys:requiredKeys,
  required_rls:requiredRls,role_capture:'all visible pg_roles attributes except passwords; role configuration and current-database settings are hashed',
  membership_capture:'all pg_auth_members edges, including admin/inherit/set options',
  minimum_contract_evidence:{
   public_columns_keys_rls:'supabase/migrations/20260722173530_baseline_20260722.sql: exact profiles, identities, business_accounts and business_members declarations, primary keys and ENABLE ROW LEVEL SECURITY',
   hosted_columns_keys_rls:'supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql: exact hosted settings and actor declarations, keys and RLS',
   api_installer_membership:'same 00_preconditions.sql explicitly rejects anon/authenticated/service_role/authenticator membership in postgres',
   effective_rpc_acl:'supabase/repairs/20261116_jobs_public/09_authority.sql revokes all API roles then grants authenticated only',
   target_extra_properties:'accepted 20261116_jobs_public/04_reads.sql has one scalar PL/pgSQL function without COST, ROWS, SUPPORT, VARIADIC, TRANSFORM or extension membership; retained implied PostgreSQL properties',
   managed_auth:'auth.uid() must retain its UUID scalar STABLE/IMMUTABLE contract for statement-snapshot semantics; its implementation, owner and ACL are captured unchanged instead of pinned from the fixture',
   storage:'complete actual storage.buckets metadata is captured unchanged; synthetic provider column types, owner, ACL and keys are not used as live pins',
   roles:'actual role attributes and current transport session_user are not newly pinned; postgres current_user remains the accepted installer requirement'
  },
  authority_facts:before.authority_facts};
 fs.writeFileSync(path.join(outputDir,'authority-capture-proof.json'),JSON.stringify(boundary,null,2)+'\n');
 return {pins,compiled,proof:{result:'PASS',format,before:pins.before,after:pins.after,changed_functions:changed,
  changed_properties:['body','volatility'],authority_unchanged:true,authority_fixture_hash:before.authority_sha256}};
}
