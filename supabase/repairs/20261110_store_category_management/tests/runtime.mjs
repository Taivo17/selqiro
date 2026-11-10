import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {db,repair,actors as a,asActor,asRole,setIdentity,install,manage,reject,provenance} from './fixture.mjs';
const checks=[];
const id=()=>crypto.randomUUID();
const own=(op,category,parent,name,expected=null)=>manage(a.owner,a.ownerIdentity,op,category,parent,name,expected);
const row=async(category)=>(await db.query('SELECT * FROM public.store_categories WHERE id=$1',[category])).rows[0];
const all=async(table)=>(await db.query('SELECT to_jsonb(t) value FROM '+table+' t ORDER BY to_jsonb(t)::text')).rows.map(r=>r.value);
const code=async(fn,value)=>assert.rejects(fn,error=>error.code===value);
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await install();
 const installed=(await db.exec(fs.readFileSync(path.join(repair,'verify.sql'),'utf8'))).flatMap(r=>r.rows).filter(r=>r.result);
 assert.equal(installed.length,1);assert.equal(installed[0].result.state,'applied');
 const rootId=id(),childId=id(),otherRoot=id();
 await check('only_authenticated_actor_may_call_rpc',async()=>{
  for(const role of ['anon','service_role'])await code(()=>asRole(role,
   'SELECT public.manage_my_store_category_v1($1,$2,$3,$4,$5,$6,$7)',[a.owner,a.ownerIdentity,'create_root',id(),null,'Denied',null]),'42501');
  await reject(()=>asRole('authenticated',
   'SELECT public.manage_my_store_category_v1($1,$2,$3,$4,$5,$6,$7)',[a.owner,a.ownerIdentity,'create_root',id(),null,'Denied',null]),'42501','store_category_context_changed');
 });
 await check('expected_user_and_active_identity_are_binding',async()=>{
  await reject(()=>asActor(a.owner,'SELECT public.manage_my_store_category_v1($1,$2,$3,$4,$5,$6,$7)',
   [a.peer,a.ownerIdentity,'create_root',id(),null,'Denied',null]),'42501','store_category_context_changed');
  await reject(()=>manage(a.owner,a.otherIdentity,'create_root',id(),null,'Denied'),'42501','store_category_context_changed');
  await setIdentity(a.owner,a.peerIdentity);
  await reject(()=>manage(a.owner,a.peerIdentity,'create_root',id(),null,'Denied'),'42501','store_category_forbidden');
  await setIdentity(a.owner,a.ownerIdentity);
 });
 await check('root_creation_normalizes_once_and_returns_exact_receipt',async()=>{
  const result=await own('create_root',rootId,null,' \t Workshop\n  tools \t');
  assert.deepEqual(Object.keys(result).sort(),['schema_version','operation','actor_user_id','identity_id','category_id',
   'name','sort_order','parent_id','changed','removed_listing_links'].sort());
  assert.deepEqual(result,{schema_version:1,operation:'create_root',actor_user_id:a.owner,identity_id:a.ownerIdentity,
   category_id:rootId,name:'Workshop tools',sort_order:0,parent_id:null,changed:true,removed_listing_links:0});
  const stored=await row(rootId);assert.equal(stored.name,result.name);assert.equal(stored.user_id,a.owner);
 });
 await check('stable_create_uuid_reconciles_lost_ack_without_duplicate',async()=>{
  const before=await row(rootId);
  const replay=await own('create_root',rootId,null,'Workshop tools');assert.equal(replay.changed,false);
  assert.deepEqual(await row(rootId),before);
  await reject(()=>own('create_root',rootId,null,'Changed intent'),'40001','store_category_stale');
  assert.equal((await db.query('SELECT count(*)::int n FROM public.store_categories WHERE id=$1',[rootId])).rows[0].n,1);
 });
 await check('root_sibling_uniqueness_and_sixty_unicode_codepoints',async()=>{
  await reject(()=>own('create_root',id(),null,'WORKSHOP TOOLS'),'23505','store_category_duplicate');
  const emoji=id();assert.equal((await own('create_root',emoji,null,'🧰'.repeat(60))).name,'🧰'.repeat(60));
  await reject(()=>own('create_root',id(),null,'🧰'.repeat(61)),'22023','store_category_invalid_input');
  for(const bad of ['', ' \t\n '])await reject(()=>own('create_root',id(),null,bad),'22023','store_category_invalid_input');
 });
 await check('create_direct_child_with_separate_sibling_scope',async()=>{
  const child=await own('create_child',childId,rootId,'Parts');assert.equal(child.parent_id,rootId);assert.equal(child.sort_order,0);
  await own('create_root',otherRoot,null,'Separate root');
  await own('create_child',id(),otherRoot,'Parts');
  await reject(()=>own('create_child',id(),rootId,'PARTS'),'23505','store_category_duplicate');
  await reject(()=>own('create_child',id(),childId,'Too deep'),'22023','store_category_invalid_input');
  await reject(()=>own('create_child',id(),id(),'Missing parent'),'40001','store_category_stale');
 });
 await check('foreign_identity_parent_and_category_are_denied',async()=>{
  const foreign=id();await manage(a.peer,a.peerIdentity,'create_root',foreign,null,'Peer root');
  await reject(()=>own('create_child',id(),foreign,'Denied'),'42501','store_category_forbidden');
  await reject(()=>own('rename',foreign,null,'Denied','Peer root'),'42501','store_category_forbidden');
  await reject(()=>own('delete',foreign,null,'Peer root','Peer root'),'42501','store_category_forbidden');
  assert.equal((await row(foreign)).name,'Peer root');
 });
 await check('rename_changes_only_name_and_noop_preserves_row',async()=>{
  const before=await row(childId);const changed=await own('rename',childId,rootId,' Spare parts ','Parts');
  assert.equal(changed.name,'Spare parts');assert.equal(changed.changed,true);
  assert.deepEqual(await row(childId),{...before,name:'Spare parts'});
  const same=await own('rename',childId,rootId,'Spare parts','Spare parts');assert.equal(same.changed,false);
  assert.deepEqual(await row(childId),{...before,name:'Spare parts'});
 });
 await check('renamed_or_reparented_stale_forms_never_overwrite',async()=>{
  await reject(()=>own('rename',childId,rootId,'Wrong','Parts'),'40001','store_category_stale');
  await reject(()=>own('delete',childId,rootId,'Parts','Parts'),'40001','store_category_stale');
  const freeRoot=id();await own('create_root',freeRoot,null,'Free movement target');
  await db.query('UPDATE public.store_categories SET parent_id=$2 WHERE id=$1',[childId,freeRoot]);
  await reject(()=>own('rename',childId,rootId,'Wrong','Spare parts'),'40001','store_category_stale');
  await reject(()=>own('delete',childId,rootId,'Spare parts','Spare parts'),'40001','store_category_stale');
  await db.query('UPDATE public.store_categories SET parent_id=$2 WHERE id=$1',[childId,rootId]);
 });
 await check('parent_with_children_cannot_be_deleted',async()=>{
  await reject(()=>own('delete',rootId,null,'Workshop tools','Workshop tools'),'23503','store_category_has_children');
  assert(await row(rootId));assert(await row(childId));
 });
 await check('child_delete_removes_only_its_links_and_retains_full_listing_and_images',async()=>{
  await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,image,status)
   VALUES(73001,$1,$2,$1,'Preserved title','Preserved full description','retained-photo.webp','active')`,[a.owner,a.ownerIdentity]);
  await db.query("INSERT INTO public.listing_images(listing_id,user_id,original_url,sort_order) VALUES(73001,$1,'retained-photo.webp',0)",[a.owner]);
  await db.query('INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(73001,$1),(73001,$2)',[childId,rootId]);
  const listings=await all('public.listings'),images=await all('public.listing_images');
  const result=await own('delete',childId,rootId,'Spare parts','Spare parts');
  assert.equal(result.removed_listing_links,1);assert.equal(result.changed,true);assert.equal(result.name,'Spare parts');
  assert.equal(await row(childId),undefined);assert.deepEqual(await all('public.listings'),listings);assert.deepEqual(await all('public.listing_images'),images);
  assert.deepEqual((await db.query('SELECT store_category_id FROM public.listing_store_categories WHERE listing_id=73001')).rows,[{store_category_id:rootId}]);
 });
 await check('childless_root_delete_retains_listing_and_replay_is_stale',async()=>{
  const listings=await all('public.listings');const result=await own('delete',rootId,null,'Workshop tools','Workshop tools');
  assert.equal(result.removed_listing_links,1);assert.equal(await row(rootId),undefined);assert.deepEqual(await all('public.listings'),listings);
  await reject(()=>own('delete',rootId,null,'Workshop tools','Workshop tools'),'40001','store_category_stale');
 });
 await check('active_business_members_can_manage_shared_categories_but_not_replay_other_creator',async()=>{
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const shared=id();await manage(a.owner,a.businessIdentity,'create_root',shared,null,'Team root');
  await reject(()=>manage(a.member,a.businessIdentity,'create_root',shared,null,'Team root'),'42501','store_category_forbidden');
  const renamed=await manage(a.member,a.businessIdentity,'rename',shared,null,'Team renamed','Team root');assert.equal(renamed.changed,true);
  assert.equal((await row(shared)).user_id,a.owner);
  const removed=await manage(a.member,a.businessIdentity,'delete',shared,null,'Team renamed','Team renamed');assert.equal(removed.changed,true);
  await setIdentity(a.owner,a.ownerIdentity);await setIdentity(a.member,a.memberIdentity);
 });
 await check('inactive_membership_and_inactive_identity_fail_closed',async()=>{
  await setIdentity(a.member,a.businessIdentity);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await reject(()=>manage(a.member,a.businessIdentity,'create_root',id(),null,'Denied'),'42501','store_category_forbidden');
  await db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await setIdentity(a.member,a.memberIdentity);
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  await reject(()=>own('create_root',id(),null,'Denied'),'42501','store_category_forbidden');
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);
 });
 await check('invalid_command_shapes_and_exact_expected_name_fail_closed',async()=>{
  const target=id();await own('create_root',target,null,'Exact');
  for(const [op,category,parent,name,expected] of [
   ['create_root',id(),otherRoot,'Invalid',null],['create_child',id(),null,'Invalid',null],
   ['create_root',id(),null,'Invalid','expected'],['rename',target,null,'Wrong',' Exact '],
   ['delete',target,null,'Wrong','Exact'],['delete',target,null,'Exact',null],['move',target,null,'Exact','Exact'],
  ])await code(()=>own(op,category,parent,name,expected),op==='rename'?'40001':'22023');
  assert.equal((await row(target)).name,'Exact');
 });
 await check('repeatable_read_and_serializable_are_rejected',async()=>{
  for(const isolation of ['repeatable read','serializable']){
   await db.exec("SET default_transaction_isolation='"+isolation+"'");
   try{await reject(()=>own('create_root',id(),null,'Denied snapshot'),'22023','store_category_invalid_input');}
   finally{await db.exec("SET default_transaction_isolation='read committed'");}
  }
 });
 await check('final_catalog_stays_verified_after_operations',async()=>{
  const result=(await db.exec(fs.readFileSync(path.join(repair,'verify.sql'),'utf8'))).flatMap(r=>r.rows).filter(r=>r.result);
  assert.equal(result.length,1);assert.equal(result[0].result.state,'applied');
  // Authority invariants include synthetic hosted actor created_at values.
  // Compare this fixture before/after, never another fixture's data timestamp.
  assert.deepEqual(result[0].result,installed[0].result);
 });
 const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
 const proof={schema_version:1,kind:'store-category-management-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_management.sql','tests/runtime.mjs','tests/fixture.mjs'].map(name=>
   ['supabase/repairs/20261110_store_category_management/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message}));process.exitCode=1;}
finally{await db.close();}
