// Exact installed horse-r2 declarations in disposable PostgreSQL/WASM.
// Synthetic Storage metadata is not evidence of any live provider operation.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {restoreRetainedPrivate} from './retained-private-functions.mjs';
import * as base from '../../20261108_horse_publication/tests/public-contact-fixture.mjs';
export * from '../../20261108_horse_publication/tests/public-contact-fixture.mjs';
export const {db,root}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const restoredRetainedPrivate=await restoreRetainedPrivate(db,root);
provenance.push(...restoredRetainedPrivate.provenance);
for(const name of ['01_policy_schema.sql','02_commands_prepare.sql','03_finality.sql','04_media_bridge.sql','05_authority.sql','06_contact.sql','07_public.sql']){
 const relative='supabase/repairs/20261108_horse_publication/'+name;
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex')});
}
export const capacityModules=['01_capacity.sql','02_account_source_cleanup.sql','03_authority.sql'];
export async function applyCapacityModules(){
 for(const name of capacityModules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));
}
if(process.env.SELQIRO_CAPACITY_BASELINE_ONLY!=='1')await applyCapacityModules();
