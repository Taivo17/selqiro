// Disposable PostgreSQL/WASM with exact retained declarations, not old suites.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261110_store_category_authority/tests/fixture.mjs';
export * from '../../20261110_store_category_authority/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,setIdentity,manage}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const modules=['01_assignments.sql','02_profile_marketplace.sql'];
export const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');
}
await db.exec(source('supabase/repairs/20261110_store_category_authority/apply.sql'));
const previous=(await db.exec(source('supabase/repairs/20261110_store_category_authority/verify.sql')))
 .flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(previous.length,1);assert.equal(previous[0].result.state,'applied');
export const priorCatalog=previous[0].result;
export async function install(){for(const name of modules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));}
export async function getCategories(user,offer,identity){
 return (await asActor(user,'SELECT public.get_my_horse_offer_store_categories_v1($1,$2) value',[offer,identity])).rows[0].value;
}
export async function setCategories(user,offer,identity,ids){
 return (await asActor(user,'SELECT public.set_my_horse_offer_store_categories_v1($1,$2,$3) value',[offer,identity,ids])).rows[0].value;
}
export const all=async(table)=>(await db.query('SELECT to_jsonb(t) value FROM '+table+' t ORDER BY to_jsonb(t)::text')).rows.map(r=>r.value);
export async function protectedRows(){return Object.fromEntries(await Promise.all([
 'public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events',
 'horse_publication_private.commands','horse_publication_private.closed_requests','horse_publication_private.gallery',
 'listing_publication_private.attempts','listing_publication_private.publications','listing_publication_private.slots',
 'listing_publication_private.objects','public.listings','public.listing_images'
 ].map(async name=>[name,await all(name)])));}
export async function snapshot(){return {...await protectedRows(),
 categories:await all('public.store_categories'),listing_links:await all('public.listing_store_categories')};}
export const result=async(sql)=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
