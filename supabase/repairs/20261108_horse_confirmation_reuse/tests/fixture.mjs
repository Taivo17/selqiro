// Exact accepted lifecycle release in disposable PostgreSQL/WASM.
// Provider metadata is synthetic; this fixture performs no provider network IO.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261108_horse_lifecycle/tests/fixture.mjs';
export * from '../../20261108_horse_lifecycle/tests/fixture.mjs';
export const {db,root}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const restoredRetainedPrivate=base.restoredRetainedPrivate;
for(const name of ['01_lifecycle_core.sql','02_owner_actions.sql','03_authority.sql',
 'tests/fixture.mjs','catalog-pins.json','verify.sql']){
 const relative='supabase/repairs/20261108_horse_lifecycle/'+name;
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')});
}
const prior=(await db.exec(fs.readFileSync(path.join(root,'supabase/repairs/20261108_horse_lifecycle/verify.sql'),'utf8')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(prior.length,1);
assert.equal(prior[0].result.state,'applied',JSON.stringify(prior[0].result));
assert.equal(prior[0].result.fingerprints.capability,'98eb672329e78de2ef86285e4ae8021ad734b99ae167a88d8e52176ed2e16249');
export const priorCatalog=prior[0].result;
export const confirmationModules=['01_saved_confirmations.sql','02_commands.sql','03_authority.sql'];
export async function applyConfirmationModules(){
 for(const name of confirmationModules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));
}
if(process.env.SELQIRO_HORSE_CONFIRMATION_REUSE_BASELINE_ONLY!=='1')await applyConfirmationModules();
