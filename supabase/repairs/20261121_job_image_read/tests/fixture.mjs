// Restore only accepted declarations and synthetic fixtures in local PostgreSQL.
// Prior test suites and all hosted services remain uncalled.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as prior from '../../20261121_personal_jobs/tests/fixture.mjs';
import {repair,modules,sha} from './catalog.mjs';
export const {db,root,actors,asActor,asRole,call,setIdentity,authSnapshot,authBaseline,installerFacts}=prior;
export {repair,modules,sha};
export const provenance=[...prior.provenance];
export const source=relative=>{const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');};
export const result=async sql=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
const personal=(await result(source('supabase/repairs/20261121_personal_jobs/apply.sql')))[0];
assert.equal(personal.state,'after');
assert.equal(personal.scope_sha256,'0154e63e365b610241031f5a0e6617abdb918a067212e99b7a82e9cfa06fbb54');
const media=source('supabase/repairs/20261120_profile_media/apply.sql');
const mediaLoad=source('supabase/repairs/20261120_profile_media_load/apply.sql');
// Keep real constraints, indexes, RLS and immutable-state trigger. Only the
// accepted reader helpers needed by jobs are restored; no mock slot resolver.
const start=media.indexOf('CREATE SCHEMA profile_media_private AUTHORIZATION postgres;');
const end=media.indexOf('CREATE FUNCTION profile_media_private.require_owner(',start);
assert(start>=0&&end>start);
await db.exec(media.slice(start,end));
const definition=(sql,name)=>{
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const matches=[...sql.matchAll(new RegExp('CREATE (?:OR REPLACE )?FUNCTION '+escaped+'\\([\\s\\S]*?\\$media\\$;','g'))];
 assert.equal(matches.length,1,'one accepted definition for '+name);return matches[0][0];
};
await db.exec(definition(media,'profile_media_private.public_url'));
await db.exec(definition(mediaLoad,'profile_media_private.slot_asset'));
await db.exec(definition(media,'profile_media_private.slot_url'));
await db.exec('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA profile_media_private FROM PUBLIC,anon,authenticated,service_role;');
assert.deepEqual(await authSnapshot(),authBaseline);
export const changes=()=>modules.map(n=>source('supabase/repairs/20261121_job_image_read/'+n)).join('\n');
export const snapshot=async()=>{
 const out=await prior.snapshot();
 for(const name of ['profile_media_private.assets','profile_media_private.identity_state','profile_media_private.cleanup_claims'])
  out[name]=(await db.query("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) value FROM "+name+' t')).rows[0].value;
 return out;
};
