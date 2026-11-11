// Disposable PostgreSQL/WASM; exact retained declarations, never old suites.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261110_horse_store_categories/tests/fixture.mjs';
export * from '../../20261110_horse_store_categories/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity,manage}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const modules=['01_assignments.sql','02_profile_services.sql','03_public_categories.sql'];
export const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');
}
await db.exec(source('supabase/repairs/20261110_horse_store_categories/apply.sql'));
const previous=(await db.exec(source('supabase/repairs/20261110_horse_store_categories/verify.sql')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(previous.length,1);assert.equal(previous[0].result.state,'applied');
export const priorCatalog=previous[0].result;
export async function install(){for(const name of modules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));}
export async function getCategories(user,service,identity){
 return (await asActor(user,'SELECT public.get_my_service_store_categories_v1($1,$2) value',[service,identity])).rows[0].value;
}
export async function setCategories(user,service,identity,ids){
 return (await asActor(user,'SELECT public.set_my_service_store_categories_v1($1,$2,$3) value',[service,identity,ids])).rows[0].value;
}
export const all=base.all;
export async function protectedRows(){return {...await base.protectedRows(),...Object.fromEntries(await Promise.all([
 'public.services','public.service_images','service_publication_private.events','service_publication_private.heads','service_publication_private.commands','service_publication_private.closed_requests',
 'service_publication_private.gallery'
 ].map(async name=>[name,await all(name)])))};}
export async function snapshot(){return {...await protectedRows(),
 categories:await all('public.store_categories'),listing_links:await all('public.listing_store_categories'),
 horse_links:await all('public.horse_offer_store_categories')};}
export const result=async(sql)=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
