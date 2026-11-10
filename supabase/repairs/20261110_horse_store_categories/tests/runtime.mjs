import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as horse from '../../20261108_horse_publication/tests/fixture.mjs';
const {db,repair,actors:a,asActor,asRole,setIdentity,manage,getCategories,setCategories,
 all,protectedRows,install,call,publicCall,provenance,sha,result}=f;
const checks=[],id=()=>crypto.randomUUID();
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
const reject=async(fn,code,message)=>assert.rejects(fn,error=>error.code===code&&(!message||error.message===message));
const slug='synthetic-'+a.ownerIdentity;
const profile=(category=null,limit=24,offset=0,version=2,user=null)=>user?
 call(user,'get_public_profile_marketplace_v'+version,[slug,category,limit,offset]):
 publicCall('get_public_profile_marketplace_v'+version,[slug,category,limit,offset]);
const own=(op,category,parent,name,expected=null)=>manage(a.owner,a.ownerIdentity,op,category,parent,name,expected);
try{
 await install();const installed=await result(fs.readFileSync(path.join(repair,'verify.sql'),'utf8'));
 assert.equal(installed[0].state,'applied');
 const parent=id(),child=id(),other=id(),foreign=id();
 await own('create_root',parent,null,'Horses');await own('create_child',child,parent,'School horses');
 await own('create_root',other,null,'Other');await manage(a.peer,a.peerIdentity,'create_root',foreign,null,'Foreign');
 const horses=[];
 for(const [i,type] of ['sale','wanted','free_transfer'].entries()){
  const p=await horse.prepare(horse.content(type),i===0?[horse.newImage()]:[]);
  if(i===0)await horse.readyImage(p);await horse.publish(p);horses.push(p.horse_offer_id);
  await db.query("UPDATE public.horse_offers SET created_at='2025-01-01Z'::timestamptz+$2::int*interval '1 hour' WHERE id=$1",[p.horse_offer_id,6-i*2]);
 }
 const offer=horses[0],get=(identity=a.ownerIdentity)=>getCategories(a.owner,offer,identity);
 const set=ids=>setCategories(a.owner,offer,a.ownerIdentity,ids);
 await check('new_owner_read_is_exact_empty_receipt',async()=>assert.deepEqual(await get(),
  {offer_id:offer,identity_id:a.ownerIdentity,category_ids:[]}));
 await check('owner_explicit_sorted_unique_assignment_preserves_content_lifecycle_and_media',async()=>{
  const before=await protectedRows();const saved=await set([child,parent,child]);
  assert.deepEqual(saved,{offer_id:offer,identity_id:a.ownerIdentity,category_ids:[parent,child].sort(),assigned_count:2});
  assert.deepEqual((await get()).category_ids,saved.category_ids);assert.deepEqual(await protectedRows(),before);
  assert((await all('public.horse_offer_images')).some(x=>x.horse_offer_id===offer));
 });
 await check('identical_replay_retains_rows_and_receipt',async()=>{
  const links=await all('public.horse_offer_store_categories'),before=await protectedRows();
  const first=await set([parent,child]),second=await set([child,parent]);
  assert.deepEqual(first,second);assert.deepEqual(await all('public.horse_offer_store_categories'),links);
  assert.deepEqual(await protectedRows(),before);
 });
 await check('invalid_or_foreign_set_is_atomic_before_any_removal',async()=>{
  const links=await all('public.horse_offer_store_categories'),before=await protectedRows();
  for(const selection of [[other,id()],[other,foreign]])
   await reject(()=>set(selection),'22023','horse_store_category_invalid_selection');
  assert.deepEqual(await all('public.horse_offer_store_categories'),links);assert.deepEqual(await protectedRows(),before);
 });
 await check('empty_set_clears_only_links_and_does_not_publish_or_delete_horse',async()=>{
  const before=await protectedRows();assert.deepEqual(await set([]),
   {offer_id:offer,identity_id:a.ownerIdentity,category_ids:[],assigned_count:0});
  assert.deepEqual((await get()).category_ids,[]);assert.deepEqual(await protectedRows(),before);
  await set([parent,child]);
 });
 await check('null_invalid_and_multidimensional_arguments_fail_closed',async()=>{
  const links=await all('public.horse_offer_store_categories');
  for(const selection of [null,[null],[parent,null]])await reject(()=>set(selection),'22023','horse_store_category_invalid_input');
  await reject(()=>getCategories(a.owner,null,a.ownerIdentity),'22023','horse_store_category_invalid_input');
  await reject(()=>getCategories(a.owner,offer,null),'22023','horse_store_category_invalid_input');
  await reject(()=>asActor(a.owner,'SELECT public.set_my_horse_offer_store_categories_v1($1,$2,ARRAY[[$3::uuid]])',
   [offer,a.ownerIdentity,parent]),'22023','horse_store_category_invalid_input');
  assert.deepEqual(await all('public.horse_offer_store_categories'),links);
 });
 await check('missing_horse_foreign_actor_and_identity_switch_are_denied',async()=>{
  await reject(()=>getCategories(a.owner,id(),a.ownerIdentity),'42501','horse_store_category_forbidden');
  await reject(()=>getCategories(a.peer,offer,a.peerIdentity),'42501','horse_store_category_forbidden');
  await reject(()=>setCategories(a.peer,offer,a.peerIdentity,[foreign]),'42501','horse_store_category_forbidden');
  await reject(()=>get(a.otherIdentity),'42501','horse_store_category_context_changed');
  await setIdentity(a.owner,a.otherIdentity);
  await reject(()=>set([]),'42501','horse_store_category_context_changed');
  await setIdentity(a.owner,a.peerIdentity);
  await reject(()=>get(a.peerIdentity),'42501','horse_store_category_forbidden');
  await setIdentity(a.owner,a.ownerIdentity);
 });
 await check('anonymous_and_service_roles_have_no_owner_rpc_execution',async()=>{
  for(const role of ['anon','service_role']){
   await reject(()=>asRole(role,'SELECT public.get_my_horse_offer_store_categories_v1($1,$2)',[offer,a.ownerIdentity]),'42501');
   await reject(()=>asRole(role,'SELECT public.set_my_horse_offer_store_categories_v1($1,$2,$3)',[offer,a.ownerIdentity,[parent]]),'42501');
  }
  await reject(()=>asRole('authenticated','SELECT public.get_my_horse_offer_store_categories_v1($1,$2)',
   [offer,a.ownerIdentity]),'42501','horse_store_category_context_changed');
 });
 await check('all_api_roles_are_denied_direct_table_read_insert_update_delete',async()=>{
  const links=await all('public.horse_offer_store_categories');
  for(const role of ['anon','authenticated','service_role'])for(const sql of [
   'SELECT * FROM public.horse_offer_store_categories',
   `INSERT INTO public.horse_offer_store_categories VALUES('${offer}','${other}')`,
   `UPDATE public.horse_offer_store_categories SET store_category_id='${other}'`,
   'DELETE FROM public.horse_offer_store_categories',
  ])await reject(()=>asRole(role,sql),'42501');
  assert.deepEqual(await all('public.horse_offer_store_categories'),links);
 });
 await check('repeatable_read_and_serializable_snapshots_rejected',async()=>{
  for(const isolation of ['repeatable read','serializable']){
   await db.exec("SET default_transaction_isolation='"+isolation+"'");
   try{await reject(()=>set([]),'22023','horse_store_category_invalid_input');}
   finally{await db.exec("SET default_transaction_isolation='read committed'");}
  }
 });
 await check('business_member_can_assign_shared_horse_created_by_another_member',async()=>{
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const businessCategory=id();await manage(a.owner,a.businessIdentity,'create_root',businessCategory,null,'Business horses');
  const businessHorse=await horse.prepare(horse.content(),[],{identity:a.businessIdentity});
  const before=await protectedRows();
  const saved=await setCategories(a.member,businessHorse.horse_offer_id,a.businessIdentity,[businessCategory]);
  assert.equal(saved.assigned_count,1);assert.deepEqual(await getCategories(a.owner,businessHorse.horse_offer_id,a.businessIdentity),
   {offer_id:businessHorse.horse_offer_id,identity_id:a.businessIdentity,category_ids:[businessCategory]});
  assert.deepEqual(await protectedRows(),before);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await reject(()=>setCategories(a.member,businessHorse.horse_offer_id,a.businessIdentity,[]),'42501','horse_store_category_forbidden');
  await db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await setIdentity(a.owner,a.ownerIdentity);await setIdentity(a.member,a.memberIdentity);
 });
 await check('inactive_identity_denied_to_owner_reader_and_writer',async()=>{
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  await reject(()=>get(),'42501','horse_store_category_forbidden');
  await reject(()=>set([]),'42501','horse_store_category_forbidden');
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);
 });
 await setCategories(a.owner,horses[1],a.ownerIdentity,[parent]);
 await setCategories(a.owner,horses[2],a.ownerIdentity,[child]);
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,status,created_at,active_until)
  SELECT 83100+n,$1,$2,$1,'Listing '||n,repeat('Long public description ',40),'active',
   '2025-01-01Z'::timestamptz+(7-n*2)*interval '1 hour',now()+interval '30 days' FROM generate_series(1,3)n`,[a.owner,a.ownerIdentity]);
 await f.assign(a.owner,83101,[parent]);await f.assign(a.owner,83102,[child]);await f.assign(a.owner,83103,[other]);
 await check('version_two_filters_before_shared_count_paging_without_duplicate_horses',async()=>{
  const pages=[];for(const offset of [0,2,4])pages.push(await profile(parent,2,offset));
  assert(pages.every(x=>x.schema_version===2&&x.total_count==='5'));
  assert.deepEqual(pages.flatMap(x=>x.items).map(x=>x.content_id),[horses[0],'83101',horses[1],'83102',horses[2]]);
  assert.deepEqual(pages.map(x=>x.next_offset),[2,4,null]);assert.equal(pages[2].has_more,false);
  assert.equal(new Set(pages.flatMap(x=>x.items).map(x=>x.content_type+':'+x.content_id)).size,5);
 });
 await check('child_filter_is_explicit_and_parent_aggregates_descendants',async()=>{
  const p=await profile(child);assert.equal(p.total_count,'3');
  assert.deepEqual(p.items.map(x=>x.content_id),[horses[0],'83102',horses[2]]);
  assert.deepEqual((await profile(other)).items.map(x=>x.content_id),['83103']);
  assert.equal((await profile(foreign)).total_count,'0');assert.equal((await profile(id())).total_count,'0');
 });
 await check('legacy_v1_still_returns_only_ordinary_category_cards',async()=>{
  const legacy=await profile(parent,24,0,1);assert.equal(legacy.schema_version,1);
  assert.equal(legacy.total_count,'2');assert.deepEqual(legacy.items.map(x=>x.content_id),['83101','83102']);
  const oldAll=await profile(null,24,0,1),newAll=await profile();
  assert.deepEqual({...newAll,schema_version:1},oldAll);assert.equal(newAll.total_count,'6');
 });
 await check('version_two_keeps_exact_public_card_allowlist_and_preview_limit',async()=>{
  const page=await profile();const keys=['content_type','content_id','offer_type','title','description_preview','price',
   'category','subcategory','detail_category','condition','country','city','image_url','seller_name','seller_slug',
   'seller_avatar_url','seller_type','created_at'].sort();
  assert(page.items.every(x=>JSON.stringify(Object.keys(x).sort())===JSON.stringify(keys)));
  assert(page.items.every(x=>x.description_preview.length<=280));
  assert(page.items.find(x=>x.content_id===offer).image_url);
 });
 await check('category_rename_preserves_membership_without_mutating_horse',async()=>{
  const before=await protectedRows(),links=await all('public.horse_offer_store_categories');
  await own('rename',child,parent,'Training horses','School horses');
  assert.equal((await profile(child)).total_count,'3');assert.deepEqual(await protectedRows(),before);
  assert.deepEqual(await all('public.horse_offer_store_categories'),links);
 });
 await check('paused_horse_can_change_categories_without_republication',async()=>{
  const state=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,offer]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,offer,state.edit_revision,state.source_status,state.active_until,'paused']);
  const before=await protectedRows();await set([child]);assert.deepEqual(await protectedRows(),before);
  const page=await profile(parent);assert.equal(page.total_count,'4');assert(!page.items.some(x=>x.content_id===offer));
  const paused=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,offer]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,offer,paused.edit_revision,paused.source_status,paused.active_until,'active']);
  assert.equal((await profile(parent)).total_count,'5');
 });
 await check('expired_horse_assignment_does_not_renew_deadline_or_expose_it',async()=>{
  await db.query("UPDATE public.horse_offers SET published_at=now()-interval '2 days',active_until=now()-interval '1 hour' WHERE id=$1",[horses[1]]);
  const before=await protectedRows();await setCategories(a.owner,horses[1],a.ownerIdentity,[parent,child]);
  assert.deepEqual(await protectedRows(),before);const page=await profile(parent);
  assert.equal(page.total_count,'4');assert(!page.items.some(x=>x.content_id===horses[1]));
 });
 await check('ordinary_expired_or_missing_deadline_stays_hidden_with_category',async()=>{
  await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,created_at,active_until)
   VALUES(83104,$1,$2,$1,'Expired','active',now(),now()-interval '1 hour'),(83105,$1,$2,$1,'No deadline','active',now(),NULL)`,[a.owner,a.ownerIdentity]);
  await f.assign(a.owner,83104,[parent]);await f.assign(a.owner,83105,[parent]);
  assert.equal((await profile(parent)).total_count,'4');
  assert.equal((await profile(parent,24,0,1)).total_count,'2');
 });
 await check('both_block_directions_filter_before_count_for_horses_and_listings',async()=>{
  for(const [blocker,blocked] of [[a.peer,a.owner],[a.owner,a.peer]]){
   await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[blocker,blocked]);
   const page=await profile(parent,24,0,2,a.peer);assert.equal(page.total_count,'0');assert.deepEqual(page.items,[]);
   await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[blocker,blocked]);
  }
 });
 await check('missing_or_ambiguous_profile_and_inactive_identity_fail_closed',async()=>{
  assert.equal((await publicCall('get_public_profile_marketplace_v2',['missing-slug',null,24,0])).profile_available,false);
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',[slug,a.otherIdentity]);
  const ambiguous=await profile(parent);assert.equal(ambiguous.profile_available,false);assert.equal(ambiguous.total_count,'0');
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',['synthetic-'+a.otherIdentity,a.otherIdentity]);
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  assert.equal((await profile(parent)).total_count,'0');
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);
 });
 await check('category_delete_cascades_only_links_and_preserves_canonical_horses_photos_and_ordinary_listings',async()=>{
  const before=await protectedRows();
  await reject(()=>own('delete',parent,null,'Horses','Horses'),'23503','store_category_has_children');
  const removed=await own('delete',child,parent,'Training horses','Training horses');
  assert.equal(removed.removed_listing_links,1);assert.deepEqual(await protectedRows(),before);
  assert(!(await all('public.horse_offer_store_categories')).some(x=>x.store_category_id===child));
  assert.equal((await get()).category_ids.length,0);
  await own('delete',parent,null,'Horses','Horses');assert.deepEqual(await protectedRows(),before);
  assert(!(await all('public.horse_offer_store_categories')).some(x=>[parent,child].includes(x.store_category_id)));
  assert((await profile()).items.some(x=>x.content_id===offer));
 });
 await check('removed_category_cannot_be_saved_from_stale_selection',async()=>{
  const before=await protectedRows();await reject(()=>set([child]),'22023','horse_store_category_invalid_selection');
  assert.deepEqual(await protectedRows(),before);assert.deepEqual((await get()).category_ids,[]);
 });
 await check('final_catalog_is_identical_to_installed_state_after_runtime_operations',async()=>{
  assert.deepEqual(await result(fs.readFileSync(path.join(repair,'verify.sql'),'utf8')),installed);
 });
 const proof={schema_version:1,kind:'horse-store-categories-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,concurrent_sessions:false,
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_assignments.sql','02_profile_marketplace.sql',
   'tests/runtime.mjs','tests/fixture.mjs','verify.sql'].map(name=>
    ['supabase/repairs/20261110_horse_store_categories/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message,stack:error.stack?.split('\n').slice(0,5)}));process.exitCode=1;}
finally{await db.close();}
