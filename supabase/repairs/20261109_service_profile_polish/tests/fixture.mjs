// Fresh local reader tests over the exact retained r2 declarations. No old suite,
// remote database, Storage call, installer or account operation runs here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import * as base from '../../20261108_service_publication/tests/fixture.mjs';
export * from '../../20261108_service_publication/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,call,denied,setIdentity}=base;
export const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const provenance=[...base.provenance];
export const modules=['01_service_order.sql','02_profile_marketplace.sql'];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');
}
for(const name of [...base.serviceModules,'tests/fixture.mjs','catalog-pins.json','verify.sql'])
 source('supabase/repairs/20261108_service_publication/'+name);
const retained=source('supabase/repairs/20261108_service_publication/verify.sql');
const r2=(await db.exec(retained)).flatMap(r=>r.rows).filter(r=>r.result);
assert.equal(r2.length,1);assert.equal(r2[0].result.state,'applied',JSON.stringify(r2[0].result));
assert.equal(r2[0].result.fingerprints.capability,'f95c0cd0cbb13e51962ade6842c6faa0dad1aacf3ba9a3a50a34ca33c769fe6f');
export const r2Catalog=r2[0].result;
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
const retainedRead=source('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
const authority=source('supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql');
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Existing dumped tables/functions predate the inherited future-object default
// grants. Clear synthetic inherited API grants and replay the original ACLs.
// These two trigger functions have no PUBLIC revoke in the baseline dump:
// preserve PostgreSQL's default PUBLIC EXECUTE while restoring named-role ACLs.
for(const name of ['prepare_store_category_name','validate_store_category_parent']){
 await db.exec(base.retainedFunction(baseline,'public.'+name));
 const rows=(await db.query(`SELECT p.oid::regprocedure::text signature FROM pg_proc p JOIN pg_namespace n
  ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1`,[name])).rows;
 assert.equal(rows.length,1);
 await db.exec('REVOKE ALL ON FUNCTION '+rows[0].signature+' FROM anon,authenticated,service_role');
 for(const statement of baseline.matchAll(new RegExp('^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."'+escape(name)+'"[^;]+;','gm')))
  await db.exec(statement[0]);
}
for(const name of ['store_categories','listing_store_categories']){
 assert.equal((await db.query('SELECT to_regclass($1) value',['public.'+name])).rows[0].value,null);
 const start=baseline.indexOf('CREATE TABLE IF NOT EXISTS "public"."'+name+'"');assert(start>=0);
 const end=baseline.indexOf('\n);',start)+3;await db.exec(baseline.slice(start,end));
 await db.exec('REVOKE ALL ON TABLE public.'+name+' FROM PUBLIC,anon,authenticated,service_role');
 for(const pattern of [
  '^ALTER TABLE "public"\\."'+name+'"[^;]+;',
  '^ALTER TABLE ONLY "public"\\."'+name+'"\\s+ADD CONSTRAINT[^;]+;',
  '^CREATE (?:UNIQUE )?INDEX [^;]+ ON "public"\\."'+name+'"[^;]+;',
  '^CREATE OR REPLACE TRIGGER [^;]+ ON "public"\\."'+name+'"[^;]+;',
  '^CREATE POLICY [^;]+ ON "public"\\."'+name+'"[^;]+;',
  '^(?:GRANT|REVOKE) [^;]+ ON TABLE "public"\\."'+name+'"[^;]+;',
 ])for(const statement of baseline.matchAll(new RegExp(pattern,'gm')))await db.exec(statement[0]);
}
// The same retained baseline ends with a validated replacement of the name
// check. Replay this later declaration too, rather than only its CREATE dump.
const categoryChecks=[...baseline.matchAll(/^alter table "public"\."store_categories" (?:drop|add|validate) constraint "store_categories_name_valid_check"[^;]*;/gm)];
assert.equal(categoryChecks.length,3,'retained final store-category name check');
for(const statement of categoryChecks)await db.exec(statement[0]);
// The original migration used BETWEEN. Its stored two-comparison BoolExpr is
// visible in the baseline dump and the read-only production catalog. Reparsing
// the dump's explicit AND text flattens that tree. Restore the exact retained
// CHECK declaration locally; never normalize or weaken the production guard.
const categoryHistory=source('docs/database/legacy-migrations-20260722/20260713152000_add_store_category_name_integrity.sql');
const originalCategoryCheck=/alter table public\.store_categories\s+add constraint store_categories_name_valid_check\s+check\s*\([\s\S]*?\);/i;
const categoryCheck=categoryHistory.match(originalCategoryCheck);
assert(categoryCheck&&/char_length\(name\) between 1 and 60/.test(categoryCheck[0]),'retained BETWEEN name check');
await db.exec('ALTER TABLE public.store_categories DROP CONSTRAINT store_categories_name_valid_check');
await db.exec(categoryCheck[0]);
assert.equal((await db.query("SELECT to_regprocedure('public.get_public_profile_listings_v1(text,uuid,integer,integer)') value")).rows[0].value,null);
await db.exec(base.retainedFunction(retainedRead,'public.get_public_profile_listings_v1'));
assert([...authority.matchAll(/GRANT EXECUTE ON FUNCTION[\s\S]*?;/g)].some(match=>
 match[0].includes('public.get_public_profile_listings_v1(text,uuid,integer,integer)')&&/TO anon,authenticated;\s*$/.test(match[0])));
await db.exec(`ALTER FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) OWNER TO postgres;
 REVOKE ALL ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
 GRANT EXECUTE ON FUNCTION public.get_public_profile_listings_v1(text,uuid,integer,integer) TO anon,authenticated;`);
export async function applyReaderModules(){for(const name of modules)await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));}
export const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
export const publicCall=async(name,args=[])=>(await asRole('anon','SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
