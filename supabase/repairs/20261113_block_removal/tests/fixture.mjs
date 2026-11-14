// Setup declarations only. No earlier test suite, live API, installer or network.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as previous from '../../20261113_provider_controls/tests/fixture.mjs';
import {retainedFunction} from '../../20261108_service_publication/tests/fixture.mjs';
export * from '../../20261113_provider_controls/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,call,setIdentity,sha,all,result,get,action,list}=previous;
export const repair=path.join(root,'supabase/repairs/20261113_block_removal');
export const provenance=[...previous.provenance];
export function source(relative){const text=fs.readFileSync(path.join(root,relative),'utf8');
 provenance.push({path:relative,sha256:sha(text)});return text;}
await previous.install();
// The earlier focused fixture omitted these real legacy public entrypoints.
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
// Restore the two real baseline outgoing FKs, omitted by the inherited focused
// fixture. This repair pins the complete account-block table structure.
for(const statement of baseline.matchAll(/^ALTER TABLE ONLY "public"\."user_blocks"\s+ADD CONSTRAINT "user_blocks_(?:blocked|blocker)_id_fkey"[^;]+;/gm))
 await db.exec(statement[0]);
for(const name of ['block_store_identity_owner','restore_conversation_for_participants']){
 const present=await db.query('SELECT count(*)::int n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1 AND p.proname=$2',['public',name]);
 assert.equal(present.rows[0].n,0,'restore omitted exact '+name);
 await db.exec(retainedFunction(baseline,'public.'+name));
 const signature=(await db.query("SELECT p.oid::regprocedure::text value FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1",[name])).rows[0].value;
 await db.exec('REVOKE ALL ON FUNCTION '+signature+' FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION '+signature+' TO PUBLIC;');
 for(const statement of baseline.matchAll(new RegExp('^(?:ALTER FUNCTION|REVOKE ALL ON FUNCTION|GRANT ALL ON FUNCTION) "public"\\."'+name+'"[^;]+;','gm')))
  await db.exec(statement[0]);
}
export const modules=['01_legacy_block_guard.sql','02_browser_permissions.sql','03_cas_delete_authority.sql','04_cas_setter.sql'];
export async function install(){for(const name of modules)await db.exec(source('supabase/repairs/20261113_block_removal/'+name));}
export const snapshot=async()=>Object.fromEntries(await Promise.all(['public.user_blocks','public.conversations','public.conversation_participants','public.messages',
 'provider_controls_private.hidden_providers'].map(async table=>[table,await all(table)])));
