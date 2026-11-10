// Disposable local PostgreSQL/WASM. Retained declarations, not old test suites,
// establish the accepted hosted baseline. No provider or user data is contacted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261109_service_profile_polish/tests/fixture.mjs';
export * from '../../20261109_service_profile_polish/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const modules=['01_management.sql'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');
}
for(const name of [...base.modules,'tests/fixture.mjs','catalog-pins.json','verify.sql'])
 source('supabase/repairs/20261109_service_profile_polish/'+name);
await db.exec(source('supabase/repairs/20261109_service_profile_polish/apply.sql'));
const accepted=(await db.exec(source('supabase/repairs/20261109_service_profile_polish/verify.sql')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(accepted.length,1);assert.equal(accepted[0].result.state,'applied');
export const retainedCatalog=accepted[0].result;
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
export const legacyNames=['create_my_store_root_category_v2','create_my_store_child_category_v2',
 'rename_my_store_category_v2','delete_my_store_category_v2','set_my_listing_store_categories_v2'];
for(const name of legacyNames){
 await db.exec(base.retainedFunction(baseline,'public.'+name));
 const rows=(await db.query(`SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n
  ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1`,[name])).rows;
 assert.equal(rows.length,1);
 await db.exec('REVOKE ALL ON FUNCTION '+rows[0].signature+' FROM PUBLIC,anon,authenticated,service_role');
 for(const declaration of baseline.matchAll(new RegExp('^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."'+name+'"[^;]+;','gm')))
  await db.exec(declaration[0]);
}
export async function install(){await db.exec(fs.readFileSync(path.join(repair,'01_management.sql'),'utf8'));}
export async function manage(user,identity,operation,id,parent,name,expected=null){
 const result=await asActor(user,'SELECT public.manage_my_store_category_v1($1,$2,$3,$4,$5,$6,$7) value',
  [user,identity,operation,id,parent,name,expected]);return result.rows[0].value;
}
export async function reject(operation,code,message){
 await assert.rejects(operation,error=>error.code===code&&error.message===message,
  'expected '+code+' / '+message);
}
