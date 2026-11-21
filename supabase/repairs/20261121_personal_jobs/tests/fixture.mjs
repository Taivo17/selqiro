// Restore previously accepted declarations and synthetic test data only.
// Historical test suites, user accounts and remote services are not invoked.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as prior from '../../20261116_jobs_public/tests/fixture.mjs';
import {repair,modules,sha} from './catalog.mjs';
export const {db,root,actors,asActor,asRole,call,setIdentity,authSnapshot,authBaseline,installerFacts}=prior;
export {repair,modules,sha};
export const provenance=[...prior.provenance];
export const source=relative=>{const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:sha(bytes)});return bytes.toString('utf8');};
export const result=async sql=>(await db.exec(sql)).flatMap(x=>x.rows).filter(x=>x.result).map(x=>x.result);
const old=(await result(source('supabase/repairs/20261116_jobs_public/apply.sql')))[0];
assert.equal(old.state,'applied');
assert.deepEqual(await authSnapshot(),authBaseline);
export const changes=()=>modules.map(n=>source('supabase/repairs/20261121_personal_jobs/'+n)).join('\n');
export const snapshot=async()=>{
 const out=await prior.snapshot();
 for(const name of ['public.jobs','jobs_private.requests','jobs_private.contact_receipts','jobs_private.thread_context',
  'jobs_private.message_cards','public.profiles','public.identities','public.identity_profiles','public.business_accounts','public.business_members']){
  out[name]=(await db.query('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),\'[]\'::jsonb) value FROM '+name+' t')).rows[0].value;
 }
 return out;
};
