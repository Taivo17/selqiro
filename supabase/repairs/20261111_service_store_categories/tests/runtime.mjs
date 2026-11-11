import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as service from '../../20261108_service_publication/tests/fixture.mjs';
import * as horse from '../../20261108_horse_publication/tests/fixture.mjs';
import {setCategories as setHorseCategories} from '../../20261110_horse_store_categories/tests/fixture.mjs';
const {db,repair,actors:a,asActor,asRole,setIdentity,manage,getCategories,setCategories,
 all,protectedRows,install,call,publicCall,provenance,sha,result}=f;
const checks=[],id=()=>crypto.randomUUID();
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
const reject=async(fn,code,message)=>assert.rejects(fn,error=>error.code===code&&(!message||error.message===message));
const slug='synthetic-'+a.ownerIdentity;
const profile=(category=null,limit=24,offset=0,user=null)=>user?
 call(user,'get_public_profile_services_v2',[slug,category,limit,offset]):
 publicCall('get_public_profile_services_v2',[slug,category,limit,offset]);
const categories=(scope='services',limit=100,offset=0,user=null)=>user?
 call(user,'get_public_profile_store_categories_v2',[slug,scope,limit,offset]):
 publicCall('get_public_profile_store_categories_v2',[slug,scope,limit,offset]);
const marketplace=(category=null,user=null)=>user?
 call(user,'get_public_profile_marketplace_v2',[slug,category,24,0]):
 publicCall('get_public_profile_marketplace_v2',[slug,category,24,0]);
const serviceId=n=>'84000000-0000-4000-8000-'+String(n).padStart(12,'0');
const own=(op,category,parent,name,expected=null)=>manage(a.owner,a.ownerIdentity,op,category,parent,name,expected);
try{
 await install();const installed=await result(fs.readFileSync(path.join(repair,'verify.sql'),'utf8'));
 assert.equal(installed[0].state,'applied');
 const parent=id(),child=id(),other=id(),foreign=id();
 await own('create_root',parent,null,'Transport');await own('create_child',child,parent,'Moving');
 await own('create_root',other,null,'Other');await manage(a.peer,a.peerIdentity,'create_root',foreign,null,'Foreign');
 const managed=await service.prepare(service.content(),[service.newImage()]);
 await service.readyImage(managed);await service.publish(managed);
 const offer=managed.service_id,get=(identity=a.ownerIdentity)=>getCategories(a.owner,offer,identity);
 const set=ids=>setCategories(a.owner,offer,a.ownerIdentity,ids);
 await check('new_owner_read_is_exact_empty_receipt',async()=>assert.deepEqual(await get(),
  {service_id:offer,identity_id:a.ownerIdentity,category_ids:[]}));
 await check('owner_explicit_sorted_unique_assignment_preserves_content_lifecycle_and_media',async()=>{
  const before=await protectedRows();const saved=await set([child,parent,child]);
  assert.deepEqual(saved,{service_id:offer,identity_id:a.ownerIdentity,category_ids:[parent,child].sort(),assigned_count:2});
  assert.deepEqual((await get()).category_ids,saved.category_ids);assert.deepEqual(await protectedRows(),before);
  assert((await all('public.service_images')).some(x=>x.service_id===offer));
 });
 await check('identical_replay_retains_rows_and_receipt',async()=>{
  const links=await all('public.service_store_categories'),before=await protectedRows();
  const first=await set([parent,child]),second=await set([child,parent]);
  assert.deepEqual(first,second);assert.deepEqual(await all('public.service_store_categories'),links);
  assert.deepEqual(await protectedRows(),before);
 });
 await check('invalid_or_foreign_set_is_atomic_before_any_removal',async()=>{
  const links=await all('public.service_store_categories'),before=await protectedRows();
  for(const selection of [[other,id()],[other,foreign]])
   await reject(()=>set(selection),'22023','service_store_category_invalid_selection');
  assert.deepEqual(await all('public.service_store_categories'),links);assert.deepEqual(await protectedRows(),before);
 });
 await check('empty_set_clears_only_links_and_does_not_publish_or_delete_service',async()=>{
  const before=await protectedRows();assert.deepEqual(await set([]),
   {service_id:offer,identity_id:a.ownerIdentity,category_ids:[],assigned_count:0});
  assert.deepEqual((await get()).category_ids,[]);assert.deepEqual(await protectedRows(),before);
  await set([parent,child]);
 });
 await check('null_invalid_and_multidimensional_arguments_fail_closed',async()=>{
  const links=await all('public.service_store_categories');
  for(const selection of [null,[null],[parent,null]])await reject(()=>set(selection),'22023','service_store_category_invalid_input');
  await reject(()=>getCategories(a.owner,null,a.ownerIdentity),'22023','service_store_category_invalid_input');
  await reject(()=>getCategories(a.owner,offer,null),'22023','service_store_category_invalid_input');
  await reject(()=>asActor(a.owner,'SELECT public.set_my_service_store_categories_v1($1,$2,ARRAY[[$3::uuid]])',
   [offer,a.ownerIdentity,parent]),'22023','service_store_category_invalid_input');
  assert.deepEqual(await all('public.service_store_categories'),links);
 });
 await check('missing_service_foreign_actor_and_identity_switch_are_denied',async()=>{
  await reject(()=>getCategories(a.owner,id(),a.ownerIdentity),'42501','service_store_category_forbidden');
  await reject(()=>getCategories(a.peer,offer,a.peerIdentity),'42501','service_store_category_forbidden');
  await reject(()=>setCategories(a.peer,offer,a.peerIdentity,[foreign]),'42501','service_store_category_forbidden');
  await reject(()=>get(a.otherIdentity),'42501','service_store_category_context_changed');
  await setIdentity(a.owner,a.otherIdentity);
  await reject(()=>set([]),'42501','service_store_category_context_changed');
  await setIdentity(a.owner,a.peerIdentity);
  await reject(()=>get(a.peerIdentity),'42501','service_store_category_forbidden');
  await setIdentity(a.owner,a.ownerIdentity);
 });
 await check('anonymous_and_service_roles_have_no_owner_rpc_execution',async()=>{
  for(const role of ['anon','service_role']){
   await reject(()=>asRole(role,'SELECT public.get_my_service_store_categories_v1($1,$2)',[offer,a.ownerIdentity]),'42501');
   await reject(()=>asRole(role,'SELECT public.set_my_service_store_categories_v1($1,$2,$3)',[offer,a.ownerIdentity,[parent]]),'42501');
  }
  await reject(()=>asRole('authenticated','SELECT public.get_my_service_store_categories_v1($1,$2)',
   [offer,a.ownerIdentity]),'42501','service_store_category_context_changed');
 });
 await check('all_api_roles_are_denied_direct_table_read_insert_update_delete',async()=>{
  const links=await all('public.service_store_categories');
  for(const role of ['anon','authenticated','service_role'])for(const sql of [
   'SELECT * FROM public.service_store_categories',
   `INSERT INTO public.service_store_categories VALUES('${offer}','${other}')`,
   `UPDATE public.service_store_categories SET store_category_id='${other}'`,
   'DELETE FROM public.service_store_categories',
  ])await reject(()=>asRole(role,sql),'42501');
  assert.deepEqual(await all('public.service_store_categories'),links);
 });
 await check('repeatable_read_and_serializable_snapshots_rejected',async()=>{
  for(const isolation of ['repeatable read','serializable']){
   await db.exec("SET default_transaction_isolation='"+isolation+"'");
   try{await reject(()=>set([]),'22023','service_store_category_invalid_input');}
   finally{await db.exec("SET default_transaction_isolation='read committed'");}
  }
 });
 await check('business_member_can_assign_shared_service_created_by_another_member',async()=>{
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const businessCategory=id();await manage(a.owner,a.businessIdentity,'create_root',businessCategory,null,'Business services');
  const businessService=await service.prepare(service.content(),[],{identity:a.businessIdentity});
  const before=await protectedRows();
  const saved=await setCategories(a.member,businessService.service_id,a.businessIdentity,[businessCategory]);
  assert.equal(saved.assigned_count,1);assert.deepEqual(await getCategories(a.owner,businessService.service_id,a.businessIdentity),
   {service_id:businessService.service_id,identity_id:a.businessIdentity,category_ids:[businessCategory]});
  assert.deepEqual(await protectedRows(),before);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await reject(()=>setCategories(a.member,businessService.service_id,a.businessIdentity,[]),'42501','service_store_category_forbidden');
  await db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await setIdentity(a.owner,a.ownerIdentity);await setIdentity(a.member,a.memberIdentity);
 });
 await check('inactive_identity_denied_to_owner_reader_and_writer',async()=>{
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  await reject(()=>get(),'42501','service_store_category_forbidden');
  await reject(()=>set([]),'42501','service_store_category_forbidden');
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);
 });
 await check('category_only_save_does_not_advance_revision_or_cancel_pending_content_edit',async()=>{
  const current=await service.ownerRead(managed);
  const pending=await service.prepare({...current.content,title:'Pending title',priceAmount:current.content.priceAmount===null?null:Number(current.content.priceAmount)},
   current.images.map(x=>({imageId:x.id,isPrimary:x.is_primary})),{serviceId:offer,revision:current.edit_revision});
  const before=await protectedRows();await set([child]);assert.deepEqual(await protectedRows(),before);
  assert.equal((await service.ownerRead(managed)).edit_revision,current.edit_revision);
  assert.equal((await service.status(pending)).state,'prepared');await service.cancel(pending);
 });
 // Synthetic retained services exceed the old profile reader's eighty-row
 // transport cap; they exercise the actual production eligibility function.
 await db.query(`INSERT INTO public.services(id,identity_id,title,description,category,status,sort_order,created_at,published_at)
  SELECT ('84000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'Service '||n,repeat('full description ',40),
   'transport_roadside','published',n,'2024-01-01Z'::timestamptz+least(n,86)*interval '1 hour',
   '2025-01-01Z'::timestamptz-n*interval '1 hour' FROM generate_series(1,87)n`,[a.ownerIdentity]);
 await db.query(`INSERT INTO public.services(id,identity_id,title,category,status,created_at,published_at)
  VALUES($1,$2,'Paused newest','transport_roadside','archived','2025-01-01Z',now()),
  ($3,$2,'Draft newest','transport_roadside','draft','2025-01-01Z',NULL),
  ($4,$5,'Different identity','transport_roadside','published','2026-01-01Z',now())`,
  [serviceId(88),a.ownerIdentity,serviceId(89),serviceId(90),a.peerIdentity]);
 const expected=[offer,serviceId(86),serviceId(87),...Array.from({length:85},(_,i)=>serviceId(85-i))];
 await check('services_above_eighty_have_complete_stable_pages_and_exact_total',async()=>{
  const pages=[];for(const offset of [0,24,48,72])pages.push(await profile(null,24,offset));
  assert.deepEqual(pages.flatMap(x=>x.items).map(x=>x.id),expected);
  assert(pages.every(x=>x.total_count==='88'&&x.identity_id===a.ownerIdentity));
  assert.deepEqual(pages.map(x=>x.next_offset),[24,48,72,null]);assert.equal(pages[3].has_more,false);
  assert.equal(new Set(pages.flatMap(x=>x.items).map(x=>x.id)).size,88);
  const beyond=await profile(null,24,96);assert.equal(beyond.total_count,'88');assert.deepEqual(beyond.items,[]);assert.equal(beyond.next_offset,null);
 });
 await setCategories(a.owner,serviceId(1),a.ownerIdentity,[child]);
 await setCategories(a.owner,serviceId(2),a.ownerIdentity,[parent]);
 await setCategories(a.owner,serviceId(86),a.ownerIdentity,[child,parent]);
 await setCategories(a.owner,serviceId(88),a.ownerIdentity,[other]);
 await setCategories(a.owner,serviceId(89),a.ownerIdentity,[other]);
 await check('sql_category_filter_finds_oldest_beyond_eighty_before_count_and_limit',async()=>{
  const pages=[];for(const offset of [0,2])pages.push(await profile(parent,2,offset));
  assert(pages.every(x=>x.total_count==='4'));
  assert.deepEqual(pages.flatMap(x=>x.items).map(x=>x.id),[offer,serviceId(86),serviceId(2),serviceId(1)]);
  assert.deepEqual(pages.map(x=>x.next_offset),[2,null]);
  assert.deepEqual((await profile(child)).items.map(x=>x.id),[offer,serviceId(86),serviceId(1)]);
  assert.equal((await profile(foreign)).total_count,'0');assert.equal((await profile(id())).total_count,'0');
 });
 await check('public_category_tree_contains_nonempty_ancestors_but_owner_tree_keeps_empty',async()=>{
  const tree=await categories();assert.deepEqual(tree.items.map(x=>x.id).sort(),[parent,child].sort());
  assert.equal(tree.total_count,'2');assert.equal(tree.identity_id,a.ownerIdentity);
  assert(tree.items.every(x=>JSON.stringify(Object.keys(x).sort())===JSON.stringify(['id','identity_id','name','parent_id','sort_order'].sort())));
  const ownerTree=await asActor(a.owner,'SELECT id::text FROM public.store_categories WHERE identity_id=$1',[a.ownerIdentity]);
  assert(ownerTree.rows.some(x=>x.id===other));assert(!tree.items.some(x=>x.id===other));
 });
 await check('new_profile_services_keep_full_description_and_exact_existing_card_contract',async()=>{
  const old=await publicCall('get_public_profile_services_v1',[slug,80]),current=await profile(null,60);
  assert.deepEqual(current.items,old.items.slice(0,60));
  assert.equal(current.items.find(x=>x.id===offer).images.length,1);
  assert(current.items.find(x=>x.id===serviceId(86)).description.length>280);
  assert.deepEqual(Object.keys(current).sort(),['schema_version','content_scope','seller_slug','identity_id','profile_available',
   'store_category_id','sort','result_limit','result_offset','total_count','has_more','next_offset','window_limit_reached','read_at','items'].sort());
  assert.equal(old.items.length,80);assert.equal(old.schema_version,1);
 });
 await check('paused_managed_service_can_assign_without_republishing_and_is_hidden',async()=>{
  const state=await service.ownerRead(managed);
  await call(a.owner,'set_my_service_activity_v1',[a.owner,a.ownerIdentity,offer,state.edit_revision,state.status,'archived']);
  const before=await protectedRows();await set([other]);assert.deepEqual(await protectedRows(),before);
  assert.equal((await profile(other)).total_count,'0');assert(!(await categories()).items.some(x=>x.id===other));
  const paused=await service.ownerRead(managed);
  await call(a.owner,'set_my_service_activity_v1',[a.owner,a.ownerIdentity,offer,paused.edit_revision,paused.status,'published']);
  assert.equal((await profile(other)).total_count,'1');assert((await categories()).items.some(x=>x.id===other));
  await set([child]);
 });
 await check('unconfirmed_content_revision_is_excluded_from_rows_counts_and_categories',async()=>{
  await db.query('BEGIN');
  try{
   await set([other]);await db.query("UPDATE public.services SET title='Not confirmed by a publication event' WHERE id=$1",[offer]);
   assert.equal((await profile(other)).total_count,'0');assert(!(await categories()).items.some(x=>x.id===other));
  }finally{await db.exec('ROLLBACK');}
 });
 const marketRoot=id(),marketChild=id(),horseRoot=id(),inactiveRoot=id();
 await own('create_root',marketRoot,null,'Parts');await own('create_child',marketChild,marketRoot,'Old parts');
 await own('create_root',horseRoot,null,'Horses');await own('create_root',inactiveRoot,null,'No active listings');
 const hp=await horse.prepare(horse.content());await horse.publish(hp);
 await setHorseCategories(a.owner,hp.horse_offer_id,a.ownerIdentity,[horseRoot]);
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,created_at,active_until)
  VALUES(84101,$1,$2,$1,'Ordinary visible','active',now(),now()+interval '30 days'),
  (84102,$1,$2,$1,'Ordinary expired','active',now(),now()-interval '1 day'),
  (84103,$1,$2,$1,'Ordinary missing deadline','active',now(),NULL),
  (84104,$1,$2,$1,'Ordinary paused','paused',now(),now()+interval '30 days')`,[a.owner,a.ownerIdentity]);
 await f.assign(a.owner,84101,[marketChild]);
 for(const n of [84102,84103,84104])await f.assign(a.owner,n,[inactiveRoot]);
 await check('public_marketplace_tree_uses_both_canonical_domains_without_service_only_categories',async()=>{
  const tree=await categories('marketplace');assert.deepEqual(tree.items.map(x=>x.id).sort(),[marketRoot,marketChild,horseRoot].sort());
  for(const category of tree.items)assert(Number((await marketplace(category.id)).total_count)>0);
  assert(!(await categories()).items.some(x=>[marketRoot,marketChild,horseRoot,inactiveRoot].includes(x.id)));
  assert((await marketplace()).items.some(x=>x.content_id==='84101'));
 });
 await check('paused_and_expired_horse_categories_follow_existing_marketplace_visibility',async()=>{
  const lifecycle=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,hp.horse_offer_id]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,hp.horse_offer_id,lifecycle.edit_revision,lifecycle.source_status,lifecycle.active_until,'paused']);
  assert(!(await categories('marketplace')).items.some(x=>x.id===horseRoot));
  const paused=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,hp.horse_offer_id]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,hp.horse_offer_id,paused.edit_revision,paused.source_status,paused.active_until,'active']);
  assert((await categories('marketplace')).items.some(x=>x.id===horseRoot));
  await db.query("UPDATE public.horse_offers SET published_at=now()-interval '2 days',active_until=now()-interval '1 hour' WHERE id=$1",[hp.horse_offer_id]);
  assert(!(await categories('marketplace')).items.some(x=>x.id===horseRoot));assert.equal((await marketplace(horseRoot)).total_count,'0');
 });
 await check('both_block_directions_apply_before_services_and_marketplace_category_counts',async()=>{
  for(const [blocker,blocked] of [[a.peer,a.owner],[a.owner,a.peer]]){
   await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[blocker,blocked]);
   for(const scope of ['services','marketplace']){
    const tree=await categories(scope,100,0,a.peer);assert.equal(tree.total_count,'0');assert.deepEqual(tree.items,[]);
   }
   assert.equal((await profile(null,24,0,a.peer)).total_count,'0');assert.equal((await marketplace(null,a.peer)).total_count,'0');
   await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[blocker,blocked]);
  }
 });
 await check('missing_or_ambiguous_profile_and_inactive_identity_return_no_categories_or_services',async()=>{
  const empty=async name=>{
   const values=[await publicCall('get_public_profile_services_v2',[name,parent,24,0]),
    ...await Promise.all(['services','marketplace'].map(scope=>publicCall('get_public_profile_store_categories_v2',[name,scope,100,0])))];
   for(const v of values){assert.equal(v.profile_available,false);assert.equal(v.identity_id,null);assert.equal(v.total_count,'0');assert.deepEqual(v.items,[]);}
   assert.equal(values[0].store_category_id,parent);
  };
  await empty('missing-profile');
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',[slug,a.otherIdentity]);await empty(slug);
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',['synthetic-'+a.otherIdentity,a.otherIdentity]);
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);await empty(slug);
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);
 });
 await check('public_parameters_reject_unknown_scope_bad_slug_and_invalid_windows',async()=>{
  for(const args of [[slug,'other',100,0],[slug,null,100,0],[' '+slug,'services',100,0],[slug,'services',101,0],[slug,'services',100,-1],[slug,'services',100,100001]])
   await reject(()=>publicCall('get_public_profile_store_categories_v2',args),'22023');
  for(const args of [[' '+slug,null,24,0],[slug,null,61,0],[slug,null,null,0],[slug,null,24,-1],[slug,null,24,100001]])
   await reject(()=>publicCall('get_public_profile_services_v2',args),'22023');
 });
 await check('category_rename_preserves_service_membership_content_and_media',async()=>{
  const before=await protectedRows(),links=await all('public.service_store_categories');
  await own('rename',child,parent,'Home moving','Moving');
  assert.equal((await categories()).items.find(x=>x.id===child).name,'Home moving');assert.equal((await profile(child)).total_count,'3');
  assert.deepEqual(await protectedRows(),before);assert.deepEqual(await all('public.service_store_categories'),links);
 });
 await check('category_delete_removes_only_links_preserving_service_photos_receipts_and_other_domains',async()=>{
  const before=await protectedRows();
  await reject(()=>own('delete',parent,null,'Transport','Transport'),'23503','store_category_has_children');
  await own('delete',child,parent,'Home moving','Home moving');assert.deepEqual(await protectedRows(),before);
  assert(!(await all('public.service_store_categories')).some(x=>x.store_category_id===child));
  assert.deepEqual((await get()).category_ids,[]);assert((await profile()).items.some(x=>x.id===offer));
  await own('delete',parent,null,'Transport','Transport');assert.deepEqual(await protectedRows(),before);
  assert(!(await all('public.service_store_categories')).some(x=>[parent,child].includes(x.store_category_id)));
  await reject(()=>set([child]),'22023','service_store_category_invalid_selection');assert.deepEqual(await protectedRows(),before);
 });
 await check('category_pages_exceed_one_hundred_without_omitting_visible_roots',async()=>{
  const roots=Array.from({length:105},()=>id());
  await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name)
   SELECT x,$2,$3,'Synthetic category '||ord FROM unnest($1::uuid[]) WITH ORDINALITY ids(x,ord)`,[roots,a.owner,a.ownerIdentity]);
  await setCategories(a.owner,serviceId(1),a.ownerIdentity,roots);
  const first=await categories('services',100,0),second=await categories('services',100,100);
  assert.equal(first.total_count,'105');assert.equal(second.total_count,'105');assert.equal(first.next_offset,100);assert.equal(second.next_offset,null);
  assert.equal(first.items.length,100);assert.equal(second.items.length,5);
  assert.deepEqual([...first.items,...second.items].map(x=>x.id).sort(),roots.sort());
  assert.equal((await profile(roots[104])).total_count,'1');
 });
 await check('final_catalog_unchanged_after_runtime_assignments_and_public_reads',async()=>{
  assert.deepEqual(await result(fs.readFileSync(path.join(repair,'verify.sql'),'utf8')),installed);
 });
 const proof={schema_version:1,kind:'service-store-categories-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_assignments.sql','02_profile_services.sql','03_public_categories.sql',
   'tests/runtime.mjs','tests/fixture.mjs','verify.sql'].map(name=>
    ['supabase/repairs/20261111_service_store_categories/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message,stack:error.stack?.split('\n').slice(0,5)}));process.exitCode=1;}
finally{await db.close();}
