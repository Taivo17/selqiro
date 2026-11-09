// Verify the corrected disposable reconstruction against bounded, hash-bound
// catalog observations. This never applies reader modules or contacts a service.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,root,repair,r2Catalog} from './fixture.mjs';
import {catalogParts,buildReport,digest,quote} from './catalog.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const evidence=JSON.parse(read('tests/review/observed-baseline.json'));
const reuse=JSON.parse(read('tests/review/runtime-proof-reuse.json'));
const actual=evidence.observed_current_preflight;
const expectedProfile='61b4fe2388231c5545158271b96859195f9e8c56c110e98468f53a370ae94adb';
const historicalSource='docs/database/legacy-migrations-20260722/20260713152000_add_store_category_name_integrity.sql';
const historical=fs.readFileSync(path.join(root,historicalSource),'utf8');
assert.equal(sha(historical),'082ff73e6d12a87b24a1badbfbac003c7810ffd96aea9699dabe0ec154426000');
assert.equal(evidence.receipts.diagnostic_sha256,'8e09ba1c714950e8fc28ce8b1f1d1dc8c65dd0f433d22d96f1131bb7b859b980');
const originalCheck=historical.match(/alter table public\.store_categories\s+add constraint store_categories_name_valid_check\s+check\s*\([\s\S]*?\);/i);
assert(originalCheck&&/char_length\(name\) between 1 and 60/.test(originalCheck[0]));
try{
 await db.exec('SET search_path=pg_catalog,pg_temp');
 const parts=catalogParts(fs.readFileSync(path.join(root,'supabase/repairs/20261108_service_publication/preflight.sql'),'utf8'));
 const query=expression=>'WITH '+parts.extra+' SELECT '+expression+' value';
 const scalar=async sql=>(await db.query(sql)).rows[0].value;
 const structures=await scalar(query(parts.storeStructure));
 assert.deepEqual(structures,evidence.store_structures,'all fields of both observed structures');
 const profile=await scalar(query(digest(parts.profileFacts)));
 assert.equal(profile,expectedProfile,'source-derived profile dependency fingerprint');
 assert.equal(r2Catalog.invariants.existing_functions,evidence.prior_success_retained_invariants.existing_functions);
 const foldedInvariants={};
 for(const [key,expression] of Object.entries({existing_functions:parts.profileFunctionFacts,
  existing_authority:parts.storeAuthority,immutable_structure:parts.storeStructure})){
  foldedInvariants[key]=await scalar(query(digest("jsonb_build_object('retained',"+
   quote(evidence.prior_success_retained_invariants[key])+",'profile',"+expression+')')));
 }
 const issuedLocal=(await db.query(buildReport(parts,evidence.issued_pins))).rows[0].result;
 assert.deepEqual({...issuedLocal,invariants:foldedInvariants},actual,'entire observed STOP report');
 const results=(await db.exec(read('preflight.sql'))).flatMap(row=>row.rows).filter(row=>row.result);
 assert.equal(results.length,1);
 const corrected=results[0].result;
 const expectedAccepted={...actual,state:'absent',recognized:true,ready_to_apply:true,dependencies_ok:true,
  guards:{...actual.guards,profile_dependencies:true}};
 assert.deepEqual({...corrected,invariants:foldedInvariants},expectedAccepted,
  'the corrected exact pin changes recognition only, never measured facts');
 assert.deepEqual(corrected.fingerprints,actual.fingerprints);
 assert.deepEqual(corrected.invariants,issuedLocal.invariants);
 for(const [name,hash] of Object.entries(reuse.files))assert.equal(sha(read(name)),hash,name);
 const result={schema_version:1,kind:'service-profile-baseline-reconstruction-verified',result:'PASS',
  generated_at_utc:new Date().toISOString(),
  receipts:evidence.receipts,
  local_server_version_num:Number(await scalar("SELECT current_setting('server_version_num') value")),
  source:{path:historicalSource,sha256:sha(historical),original_check_sha256:sha(originalCheck[0]),
   fixture_sha256:sha(read('tests/fixture.mjs')),observation_sha256:sha(read('tests/review/observed-baseline.json'))},
  confirmed_causes:[
   'The fixture removed PUBLIC EXECUTE that the retained trigger functions keep.',
   'Reparsing expanded AND text flattened the original BETWEEN boolean expression; the retained BETWEEN declaration restores the observed tree.'
  ],
  exact_matches:{both_complete_table_structures:true,issued_stop_report:true,
   capability:true,dependencies:true,existing_functions:true,existing_authority:true,immutable_structure:true},
  source_profile_dependency_sha256:profile,
  measured_fingerprints:corrected.fingerprints,
  reconstructed_observed_invariants:foldedInvariants,
  corrected_state:corrected.state,corrected_ready_to_apply:corrected.ready_to_apply,
  changed_recognition_fields:['state','recognized','ready_to_apply','dependencies_ok','guards.profile_dependencies'],
  invariant_boundary:'The retained authority/structure invariant inputs are the exact earlier successful r2 receipt values; the new profile facts are independently source-reconstructed. Whole live retained catalogs are not exported or simulated.',
  no_unknown_hash_allowlist:true,no_catalog_normalization:true,no_production_acl_or_table_change:true,
  new_reader_modules_applied:false,unchanged_runtime_proofs:44,runtime_suite_rerun:false,
  live_database:false,storage:false,mac_installer:false,
 };
 fs.writeFileSync(path.join(repair,'tests/review/baseline-reconstruction-verified.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
}finally{await db.close();}
