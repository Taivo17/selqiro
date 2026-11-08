// Exact accepted upload-capacity-r2 baseline in disposable PostgreSQL/WASM.
// Provider metadata remains synthetic; no database or Storage HTTP is used.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261108_upload_capacity/tests/fixture.mjs';
export * from '../../20261108_upload_capacity/tests/fixture.mjs';
export const {db,root}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const restoredRetainedPrivate=base.restoredRetainedPrivate;
for(const name of ['01_capacity.sql','02_account_source_cleanup.sql','03_authority.sql',
 'tests/fixture.mjs','tests/retained-private-functions.mjs','catalog-pins.json']){
 const relative='supabase/repairs/20261108_upload_capacity/'+name;
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')});
}
// Prove the complete starting catalog is exactly the previously issued r2
// capacity capability. This is not a learned or weakened production baseline.
const prior=(await db.exec(fs.readFileSync(path.join(root,'supabase/repairs/20261108_upload_capacity/verify.sql'),'utf8')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(prior.length,1);
assert.equal(prior[0].result.state,'applied',JSON.stringify(prior[0].result));
assert.equal(prior[0].result.fingerprints.capability,'7b2ae16eb51a93d31d7542463eeb895f5116850332bb0e56a2b74c49827fc79b');
export const priorCatalog=prior[0].result;
export const lifecycleModules=['01_lifecycle_core.sql','02_owner_actions.sql','03_authority.sql'];
export async function applyLifecycleModules(){
 for(const name of lifecycleModules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));
}
if(process.env.SELQIRO_HORSE_LIFECYCLE_BASELINE_ONLY!=='1')await applyLifecycleModules();
