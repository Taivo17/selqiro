// New authority tests reuse accepted declarations in disposable PostgreSQL/WASM.
// No previous test suite, provider, real account or production row is accessed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261110_store_category_management/tests/fixture.mjs';
export * from '../../20261110_store_category_management/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity,manage}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const modules=['01_authority.sql'];
export const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');
}
await db.exec(source('supabase/repairs/20261110_store_category_management/apply.sql'));
const previous=(await db.exec(source('supabase/repairs/20261110_store_category_management/verify.sql')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(previous.length,1);assert.equal(previous[0].result.state,'applied');
export const priorCatalog=previous[0].result;
export async function install(){await db.exec(fs.readFileSync(path.join(repair,'01_authority.sql'),'utf8'));}
export async function assign(user,listing,ids){
 return asActor(user,'SELECT * FROM public.set_my_listing_store_categories_v2($1,$2)',[String(listing),ids]);
}
export const all=async(table)=>(await db.query('SELECT to_jsonb(t) value FROM '+table+' t ORDER BY to_jsonb(t)::text')).rows.map(r=>r.value);
export async function snapshot(){return {
 listings:await all('public.listings'),images:await all('public.listing_images'),
 categories:await all('public.store_categories'),links:await all('public.listing_store_categories')
};}
export const result=async(sql)=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
