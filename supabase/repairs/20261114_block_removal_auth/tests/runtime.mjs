import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import {retainedFunction} from '../../20261108_service_publication/tests/fixture.mjs';
const {db,root,repair,actors:a,asActor,asRole,call,get,action,all,source,result,snapshot,sha,provenance,
 authSnapshot,authBaseline,installerFacts}=f;
const checks=[],wires=[],id=()=>crypto.randomUUID();
const read=n=>fs.readFileSync(path.join(repair,n),'utf8');
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const denied=async(fn,code='42501')=>assert.rejects(fn,e=>e.code===code);
const clearJwt=()=>db.exec("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','',false),set_config('request.jwt.claim.role','',false)");
const pair=async(from,to)=>(await db.query('SELECT id::text id,created_at::text created_at FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[from,to])).rows[0];
const rawBlock=(from,to)=>asActor(from,'INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT(blocker_id,blocked_id) DO NOTHING',[from,to]);
const block=(from,identity)=>get(from,'profile',identity).then(s=>action(from,s,'block'));
const undo=async(from,row)=>{const state=await get(from,'blocked_account',row.id??row.block_id);wires.push({kind:'unblock_get',response:state});
 const out=await action(from,state,'unblock');wires.push({kind:'unblock_set',response:out});return out;};
const threadBlock=(from,identity,conversation,value)=>call(from,'set_my_thread_block_v2',[from,identity,conversation,value]);
const thread=async(buyer,buyerIdentity,seller,sellerIdentity)=>{
 const q=await db.query('INSERT INTO public.conversations(buyer_id,seller_id,buyer_identity_id,seller_identity_id) VALUES($1,$2,$3,$4) RETURNING id::text id',[buyer,seller,buyerIdentity,sellerIdentity]);
 const cid=q.rows[0].id;await db.query('INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id) VALUES($1,$2,$3),($1,$4,$5)',[cid,buyer,buyerIdentity,seller,sellerIdentity]);return cid;
};
try{
 const facts=(await db.query("SELECT current_user actor,rolsuper,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user")).rows[0];
 assert.equal(facts.actor,'postgres');assert.equal(facts.rolsuper,false);assert.equal(facts.rolcreaterole,true);
 const cid=await thread(a.peer,a.peerIdentity,a.owner,a.ownerIdentity);
 const sent=await call(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,id(),cid,'Retained history',null,null]);
 const hidden=await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'hide',id());
 const initial=await block(a.peer,a.ownerIdentity);assert(initial.blocked_by_me);
 await check('guarded_install_as_nonsuperuser_changes_no_application_rows',async()=>{
  const before=await snapshot(),report=await result(read('apply.sql'));assert.equal(report.length,1);assert.equal(report[0].state,'applied');
  assert.deepEqual(await snapshot(),before);assert.equal((await result(read('verify.sql')))[0].state,'applied');
  assert.deepEqual(await authSnapshot(),authBaseline);
 });
 await check('final_private_role_cannot_be_selected_but_real_CAS_rpc_executes',async()=>{
  await denied(()=>db.exec('SET ROLE selqiro_block_removal_writer_v1'));await db.exec('RESET ROLE');
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await db.query("SELECT pg_has_role($1,'selqiro_block_removal_writer_v1','SET') allowed",[role])).rows[0].allowed,false);
   await denied(()=>asRole(role,'SELECT provider_controls_private.remove_account_block_v1($1,$2,$3,$4)',[a.peer,a.owner,initial.block_id,initial.block_created_at]));
   assert.equal((await db.query("SELECT has_function_privilege($1,'provider_controls_private.current_block_actor_v1()','EXECUTE') allowed",[role])).rows[0].allowed,false);
   await denied(()=>asRole(role,'SELECT provider_controls_private.current_block_actor_v1()'));
  }
  assert.equal((await db.query("SELECT has_schema_privilege('selqiro_block_removal_writer_v1','auth','USAGE') allowed")).rows[0].allowed,false);
  const restored=await undo(a.peer,initial);assert(restored.changed&&!restored.blocked_by_me);
  assert.equal((await get(a.peer,'hidden_provider',a.ownerIdentity)).hide_revision,hidden.hide_revision);
 });
 await check('legacy_true_preserves_generation_and_false_requires_version',async()=>{
  await threadBlock(a.peer,a.peerIdentity,cid,true);const row=await pair(a.peer,a.owner);assert(row);
  await threadBlock(a.peer,a.peerIdentity,cid,true);assert.deepEqual(await pair(a.peer,a.owner),row);
  await denied(()=>threadBlock(a.peer,a.peerIdentity,cid,false));assert.deepEqual(await pair(a.peer,a.owner),row);
 });
 await check('old_definer_body_reaches_new_trigger_and_cannot_delete',async()=>{
  const oldSql=source('supabase/repairs/20261030_messaging_restore/changes.sql');
  const old=retainedFunction(oldSql,'messaging_private_v2.set_block');
  await db.exec('CREATE SCHEMA block_removal_test;GRANT USAGE ON SCHEMA block_removal_test TO authenticated;');
  await db.exec(old.replace('CREATE FUNCTION messaging_private_v2.set_block(','CREATE FUNCTION block_removal_test.old_set_block('));
  await db.exec('REVOKE ALL ON FUNCTION block_removal_test.old_set_block(uuid,uuid,bigint,boolean) FROM PUBLIC;GRANT EXECUTE ON FUNCTION block_removal_test.old_set_block(uuid,uuid,bigint,boolean) TO authenticated;');
  const body=(await db.query("SELECT prosrc FROM pg_proc WHERE oid='block_removal_test.old_set_block(uuid,uuid,bigint,boolean)'::regprocedure")).rows[0].prosrc;
  assert.equal(sha(body),'6d8edfb3963c7261644fddd9519c715d047b78b5037a0c387ea9b03cdeef08fc');
  const before=await pair(a.peer,a.owner);
  await assert.rejects(()=>asActor(a.peer,'SELECT block_removal_test.old_set_block($1,$2,$3,false)',[a.peer,a.peerIdentity,cid]),
   e=>e.code==='42501'&&e.message==='message_block_removal_version_required'&&e.where?.includes('guard_account_block_delete_v1'));
  assert.deepEqual(await pair(a.peer,a.owner),before);
  await db.exec('DROP FUNCTION block_removal_test.old_set_block(uuid,uuid,bigint,boolean);DROP SCHEMA block_removal_test;');
 });
 await check('browser_direct_delete_update_truncate_and_generation_forgery_are_denied',async()=>{
  const before=await all('public.user_blocks');
  for(const sql of [
   'DELETE FROM public.user_blocks WHERE blocker_id=$1',
   'UPDATE public.user_blocks SET created_at=now() WHERE blocker_id=$1',
   'UPDATE public.user_blocks SET blocked_id=$2 WHERE blocker_id=$1',
   'INSERT INTO public.user_blocks(id,blocker_id,blocked_id) VALUES(900000,$1,$2)',
   'INSERT INTO public.user_blocks(blocker_id,blocked_id,created_at) VALUES($1,$2,now())',
  ])await denied(()=>asActor(a.peer,sql,[a.peer,...(sql.includes('$2')?[a.outsider]:[])]));
  await denied(()=>asActor(a.peer,'TRUNCATE public.user_blocks'));
  await denied(()=>asActor(a.peer,"SELECT setval('public.user_blocks_id_seq',1,false)"));
  assert.deepEqual(await all('public.user_blocks'),before);
 });
 await check('pair_only_default_insert_and_ignore_duplicate_preserve_generation',async()=>{
  await rawBlock(a.owner,a.peer);const before=await pair(a.owner,a.peer);assert(before);
  await rawBlock(a.owner,a.peer);assert.deepEqual(await pair(a.owner,a.peer),before);
  await denied(()=>asActor(a.owner,'INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2) ON CONFLICT(blocker_id,blocked_id) DO UPDATE SET blocked_id=EXCLUDED.blocked_id',[a.owner,a.peer]));
  assert.deepEqual(await pair(a.owner,a.peer),before);
 });
 await check('private_writer_RLS_and_actor_bridge_need_no_managed_Auth_access',async()=>{
  const before=await all('public.user_blocks');
  await db.exec('BEGIN');
  try{
   // Test-only transaction grants are rolled back, never part of install.
   await db.exec('GRANT selqiro_block_removal_writer_v1 TO postgres WITH SET TRUE');
   await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[a.peer]);
   await db.exec('SET LOCAL ROLE selqiro_block_removal_writer_v1');
   assert.equal((await db.query('SELECT provider_controls_private.current_block_actor_v1() actor')).rows[0].actor,a.peer);
   const visible=(await db.query('SELECT blocker_id FROM public.user_blocks')).rows;
   assert(visible.length>0);assert(visible.every(row=>row.blocker_id===a.peer));
   const foreign=(await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 RETURNING id',[a.owner])).rows;
   assert.deepEqual(foreign,[],'RLS denies another account even to the narrow writer');
   await db.exec('SAVEPOINT deny_auth');
   await denied(()=>db.query('SELECT auth.uid()'));
   await db.exec('ROLLBACK TO SAVEPOINT deny_auth');
   for(const [actor,peer,id,created] of [[a.owner,a.peer,initial.block_id,initial.block_created_at],
    [null,a.owner,initial.block_id,initial.block_created_at],[a.peer,a.peer,initial.block_id,initial.block_created_at],
    [a.peer,a.owner,'0',initial.block_created_at],[a.peer,a.owner,initial.block_id,'infinity']]){
    await db.exec('SAVEPOINT deny_actor');
    await denied(()=>db.query('SELECT provider_controls_private.remove_account_block_v1($1,$2,$3,$4)',[actor,peer,id,created]));
    await db.exec('ROLLBACK TO SAVEPOINT deny_actor');
   }
  }finally{await db.exec('ROLLBACK');}
  assert.deepEqual(await all('public.user_blocks'),before);assert.deepEqual(await authSnapshot(),authBaseline);
  assert.equal((await result(read('verify.sql')))[0].state,'applied');
 });
 await check('own_exact_unblock_keeps_reverse_block_history_and_hide',async()=>{
  const reverse=await pair(a.owner,a.peer),before=await snapshot(),own=await pair(a.peer,a.owner);
  const r=await undo(a.peer,own);assert(r.changed&&r.blocked_by_other&&!r.blocked_by_me);assert.deepEqual(await pair(a.owner,a.peer),reverse);
  const after=await snapshot();delete before['public.user_blocks'];delete after['public.user_blocks'];assert.deepEqual(after,before);
  const history=await call(a.peer,'get_my_message_thread_v2',[a.peer,a.peerIdentity,cid,null,null]);
  assert(history.messages.some(m=>m.id===sent.message_id));assert.equal(history.can_send,false);
  await denied(()=>call(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,id(),cid,'Still blocked',null,null]));
  await denied(()=>asActor(a.peer,'INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES($1,$2,$3,$4)',[cid,a.peer,a.peerIdentity,'Still blocked legacy']));
  await undo(a.owner,reverse);
 });
 await check('stale_management_target_and_stale_profile_CAS_keep_new_row',async()=>{
  const first=await block(a.peer,a.ownerIdentity),oldProfile=await get(a.peer,'profile',a.ownerIdentity),oldTarget=await get(a.peer,'blocked_account',first.block_id);
  await undo(a.peer,first);const replacement=await block(a.peer,a.ownerIdentity);assert.notEqual(replacement.block_id,first.block_id);
  await denied(()=>action(a.peer,oldProfile,'unblock'),'40001');await denied(()=>action(a.peer,oldTarget,'unblock'),'42501');
  const gone=await get(a.peer,'blocked_account',first.block_id);assert.equal(gone.target_available,false);assert.equal(gone.target_token,null);
  assert.equal((await pair(a.peer,a.owner)).id,replacement.block_id);
  await undo(a.peer,replacement);
 });
 await check('foreign_account_cannot_remove_another_callers_row',async()=>{
  const own=await block(a.peer,a.ownerIdentity),s=await get(a.peer,'blocked_account',own.block_id);
  assert.equal((await get(a.outsider,'blocked_account',own.block_id)).target_available,false);
  await denied(()=>call(a.outsider,'set_my_provider_control_v1',[a.peer,s.target_type,s.target_id,'unblock',s.target_token,null,null,s.block_id,s.block_created_at]));
  await denied(()=>action(a.outsider,{...s,actor_user_id:a.outsider},'unblock'));
  assert.equal((await pair(a.peer,a.owner)).id,own.block_id);await undo(a.peer,own);
 });
 await check('business_thread_resolves_actual_member_account_without_changing_owner_block',async()=>{
  await f.setIdentity(a.member,a.businessIdentity);
  const businessThread=await thread(a.peer,a.peerIdentity,a.member,a.businessIdentity);
  const ownerBlock=await block(a.peer,a.businessIdentity);
  await threadBlock(a.peer,a.peerIdentity,businessThread,true);const memberBlock=await pair(a.peer,a.member);
  assert(memberBlock&&ownerBlock.block_id!==memberBlock.id);
  const context=await get(a.peer,'conversation',businessThread);assert.equal(context.block_id,memberBlock.id);
  assert.equal(context.provider.identity_id,a.businessIdentity);
  await undo(a.peer,{block_id:context.block_id});assert.equal(await pair(a.peer,a.member),undefined);
  assert.equal((await pair(a.peer,a.owner)).id,ownerBlock.block_id);
  await undo(a.peer,ownerBlock);await f.setIdentity(a.member,a.memberIdentity);
 });
 await check('maintenance_is_limited_to_privileged_roles_without_JSON_sub_or_role_JWT_context',async()=>{
  await rawBlock(a.peer,a.owner);const first=await pair(a.peer,a.owner);
  for(const [claims,sub,role] of [['{"role":"anon"}','',''],['','', 'anon'],['malformed','',''],['',a.peer,'']]){
   await db.query("SELECT set_config('request.jwt.claims',$1,false),set_config('request.jwt.claim.sub',$2,false),set_config('request.jwt.claim.role',$3,false)",[claims,sub,role]);
   await denied(()=>db.query('DELETE FROM public.user_blocks WHERE id=$1',[first.id]));
   await denied(()=>asRole('service_role','DELETE FROM public.user_blocks WHERE id=$1',[first.id]));
   await clearJwt();assert.deepEqual(await pair(a.peer,a.owner),first);
  }
  await clearJwt();await db.query('DELETE FROM public.user_blocks WHERE id=$1',[first.id]);assert.equal(await pair(a.peer,a.owner),undefined);
  await rawBlock(a.peer,a.owner);const second=await pair(a.peer,a.owner);await clearJwt();
  await asRole('service_role','DELETE FROM public.user_blocks WHERE id=$1',[second.id]);assert.equal(await pair(a.peer,a.owner),undefined);
 });
 await check('final_catalog_still_applied_and_old_provider_verifier_is_historical',async()=>{
  const current=await result(read('verify.sql'));assert.equal(current[0].state,'applied');
  assert.deepEqual(await authSnapshot(),authBaseline);
  const old=await result(source('supabase/repairs/20261113_provider_controls/verify.sql'));assert.equal(old[0].state,'unknown');
 });
 for(const n of [...f.modules,'preflight.sql','apply.sql','verify.sql','catalog-pins.json','tests/runtime.mjs','tests/fixture.mjs','tests/catalog.mjs'])
  source('supabase/repairs/20261114_block_removal_auth/'+n);
 const inputs=Object.fromEntries(provenance.map(x=>[x.path,x.sha256]).sort(([a],[b])=>a.localeCompare(b)));
 const input_drift=Object.entries(inputs).filter(([n,h])=>sha(fs.readFileSync(path.join(root,n)))!==h).map(([n])=>n);assert.deepEqual(input_drift,[]);
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify({schema_version:1,result:'PASS',
  generated_at_utc:new Date().toISOString(),tests_run:checks.length,checks,inputs,input_drift,installer_role:facts,
  constrained_auth_installer:installerFacts,auth_owner_acl_definition_unchanged:true,writer_has_no_auth_schema_usage:true,
  actor_bridge_not_executable_by_api_roles:true,private_writer_RLS_runtime_tested:true,
  old_definer_body_sha256:'6d8edfb3963c7261644fddd9519c715d047b78b5037a0c387ea9b03cdeef08fc',
  old_definer_reaches_new_trigger:true,actual_multi_session_cutover_tested:false,live_database:false,
  engine:'PGlite PostgreSQL/WASM',synthetic_fixture:true,wire_responses:wires.length,
  maintenance_boundary:'postgres/service_role and empty request.jwt.claims, request.jwt.claim.sub, request.jwt.claim.role',
  retained_service_role_update_truncate_authority:true},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',tests:checks.length,input_drift}));
}catch(e){console.error(JSON.stringify({result:'FAIL',passed:checks,code:e.code,message:e.message,where:e.where,detail:e.detail,
 position:e.position,query_context:e.query?.slice(Math.max(0,Number(e.position)-120),Number(e.position)+100),stack:e.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
