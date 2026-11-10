import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,repair,actors as a,asActor,asRole,setIdentity,manage,assign,all,snapshot,provenance,source,sha,result} from './fixture.mjs';
const checks=[];
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const own='82100000-0000-4000-8000-000000000001',child='82100000-0000-4000-8000-000000000002';
const foreign='82100000-0000-4000-8000-000000000003',other='82100000-0000-4000-8000-000000000004';
const business='82100000-0000-4000-8000-000000000005';
const denied=async(fn,code='42501')=>assert.rejects(fn,error=>error.code===code);
const links=async(id)=>(await db.query('SELECT store_category_id FROM public.listing_store_categories WHERE listing_id=$1 ORDER BY store_category_id',[id])).rows.map(r=>r.store_category_id);
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await manage(a.owner,a.ownerIdentity,'create_root',own,null,'Authority own');
 await manage(a.owner,a.ownerIdentity,'create_child',child,own,'Authority child');
 await manage(a.peer,a.peerIdentity,'create_root',foreign,null,'Authority peer');
 await setIdentity(a.owner,a.otherIdentity);await manage(a.owner,a.otherIdentity,'create_root',other,null,'Authority other');
 await setIdentity(a.owner,a.businessIdentity);await manage(a.owner,a.businessIdentity,'create_root',business,null,'Authority business');
 await setIdentity(a.owner,a.ownerIdentity);
 for(const [id,user,identity] of [[82101,a.owner,a.ownerIdentity],[82102,a.owner,null],
  [82103,a.peer,a.peerIdentity],[82104,a.owner,a.businessIdentity],[82105,a.owner,a.otherIdentity]])
  await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,image,status)
   VALUES($1,$2,$3,$2,'Retained authority listing','Retained complete text','retained-image.webp','active')`,[id,user,identity]);
 await db.query("INSERT INTO public.listing_images(listing_id,user_id,original_url,sort_order) VALUES(82101,$1,'retained-image.webp',0)",[a.owner]);
 await check('old_policy_allows_cross_identity_if_listing_is_visible',async()=>{
  // Current fixture closes ordinary direct listing reads. Exercise the weak
  // link predicate under the exact historical public SELECT declaration, then
  // remove that visibility setup before testing the real guarded repair.
  const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
  const policy=baseline.match(/^CREATE POLICY "Public can view listings"[^;]+;/m);
  assert(policy);await db.exec(policy[0]);
  try{
   await asActor(a.owner,'INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES($1,$2)',[82101,foreign]);
   assert.deepEqual(await links(82101),[foreign]);
  }finally{await db.exec('DROP POLICY "Public can view listings" ON public.listings');}
 });
 await check('repair_preserves_existing_rows_even_invalid_historical_link',async()=>{
  const before=await snapshot();const installed=await result(read('apply.sql'));
  assert.equal(installed.length,1);assert.equal(installed[0].state,'applied');
  assert.deepEqual(await snapshot(),before);
 });
 await check('direct_foreign_and_same_identity_insert_both_rejected',async()=>{
  for(const category of [foreign,own])await denied(()=>asActor(a.owner,
   'INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES($1,$2)',[82105,category]));
  assert.deepEqual(await links(82105),[]);
 });
 await check('direct_update_delete_and_truncate_are_rejected',async()=>{
  const before=await all('public.listing_store_categories');
  for(const sql of ['UPDATE public.listing_store_categories SET store_category_id=$1 WHERE listing_id=82101',
   'DELETE FROM public.listing_store_categories WHERE listing_id=82101','TRUNCATE public.listing_store_categories'])
   await denied(()=>asActor(a.owner,sql,sql.includes('$1')?[own]:[]));
  assert.deepEqual(await all('public.listing_store_categories'),before);
 });
 await check('anonymous_mutations_and_rpc_are_rejected',async()=>{
  for(const sql of [`INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(82101,'${own}')`,
   'UPDATE public.listing_store_categories SET created_at=created_at','DELETE FROM public.listing_store_categories',
   'TRUNCATE public.listing_store_categories',"SELECT * FROM public.set_my_listing_store_categories_v2('82101','{}')"])
   await denied(()=>asRole('anon',sql));
 });
 await check('effective_table_column_grants_have_no_write_or_grant_option',async()=>{
  for(const role of ['anon','authenticated']){
   for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']){
    const row=(await db.query(`SELECT has_table_privilege($1,'public.listing_store_categories',$2) allowed,
     has_table_privilege($1,'public.listing_store_categories',$2||' WITH GRANT OPTION') grantable`,[role,privilege])).rows[0];
    assert.equal(row.allowed,privilege==='SELECT');assert.equal(row.grantable,false);
   }
   for(const column of ['listing_id','store_category_id','created_at'])for(const privilege of ['SELECT','INSERT','UPDATE','REFERENCES'])
    assert.equal((await db.query("SELECT has_column_privilege($1,'public.listing_store_categories',$2,$3) allowed",[role,column,privilege])).rows[0].allowed,privilege==='SELECT');
  }
 });
 await check('private_rpc_atomically_replaces_set_and_preserves_content_images',async()=>{
  const listings=await all('public.listings'),images=await all('public.listing_images');
  const saved=await assign(a.owner,82101,[child,own,child]);
  assert.deepEqual(saved.rows,[{listing_id:82101,category_ids:[own,child],assigned_count:2,removed_previous_links:1}]);
  assert.deepEqual(await links(82101),[own,child]);
  assert.deepEqual(await all('public.listings'),listings);assert.deepEqual(await all('public.listing_images'),images);
 });
 await check('foreign_and_missing_categories_roll_back_complete_assignment',async()=>{
  for(const selected of [[own,foreign],[own,'82100000-0000-4000-8000-999999999999']]){
   const before=await snapshot();await denied(()=>assign(a.owner,82101,selected));assert.deepEqual(await snapshot(),before);
  }
 });
 await check('same_account_other_identity_is_not_an_assignment_fallback',async()=>{
  const before=await snapshot();await denied(()=>assign(a.owner,82101,[other]));
  await denied(()=>assign(a.owner,82105,[other]));assert.deepEqual(await snapshot(),before);
 });
 await check('foreign_and_null_identity_listings_are_rejected_without_backfill',async()=>{
  const before=await snapshot();
  await denied(()=>assign(a.owner,82103,[own]));await denied(()=>assign(a.owner,82102,[own]));
  assert.deepEqual(await snapshot(),before);
 });
 await check('invalid_listing_id_and_missing_active_identity_are_rejected',async()=>{
  const before=await snapshot();
  for(const id of ['abc','-1',''])await denied(()=>assign(a.owner,id,[own]),'22023');
  await setIdentity(a.owner,null);await denied(()=>assign(a.owner,82101,[own]),'22023');
  await setIdentity(a.owner,a.ownerIdentity);assert.deepEqual(await snapshot(),before);
 });
 await check('forged_stored_active_identity_does_not_grant_foreign_access',async()=>{
  await setIdentity(a.owner,a.peerIdentity);const before=await snapshot();
  await denied(()=>assign(a.owner,82103,[foreign]));assert.deepEqual(await snapshot(),before);
  await setIdentity(a.owner,a.ownerIdentity);
 });
 await check('active_business_member_can_assign_another_creator_listing',async()=>{
  await setIdentity(a.member,a.businessIdentity);
  const saved=await assign(a.member,82104,[business]);assert.equal(saved.rows[0].assigned_count,1);
  assert.deepEqual(await links(82104),[business]);
  await setIdentity(a.member,a.memberIdentity);
 });
 await check('inactive_business_member_and_identity_are_rejected',async()=>{
  await setIdentity(a.member,a.businessIdentity);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await denied(()=>assign(a.member,82104,[]));assert.deepEqual(await links(82104),[business]);
  await db.query("UPDATE public.business_members SET status='active' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.member]);
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.businessIdentity]);
  await denied(()=>assign(a.member,82104,[]));assert.deepEqual(await links(82104),[business]);
  await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.businessIdentity]);
  await setIdentity(a.member,a.memberIdentity);
 });
 await check('anonymous_and_authenticated_link_reads_still_work',async()=>{
  for(const role of ['anon','authenticated']){
   const rows=(await asRole(role,'SELECT store_category_id FROM public.listing_store_categories WHERE listing_id=82101 ORDER BY store_category_id')).rows;
   assert.deepEqual(rows.map(x=>x.store_category_id),[own,child]);
  }
 });
 await check('management_delete_retains_listing_and_other_category_link',async()=>{
  const listings=await all('public.listings'),images=await all('public.listing_images');
  const removed=await manage(a.owner,a.ownerIdentity,'delete',child,own,'Authority child','Authority child');
  assert.equal(removed.removed_listing_links,1);assert.deepEqual(await links(82101),[own]);
  assert.deepEqual(await all('public.listings'),listings);assert.deepEqual(await all('public.listing_images'),images);
 });
 await check('empty_atomic_assignment_removes_links_without_listing_deletion',async()=>{
  const listings=await all('public.listings'),images=await all('public.listing_images');
  const saved=await assign(a.owner,82101,[]);assert.equal(saved.rows[0].assigned_count,0);
  assert.deepEqual(await links(82101),[]);assert.deepEqual(await all('public.listings'),listings);assert.deepEqual(await all('public.listing_images'),images);
 });
 await check('obsolete_write_policy_removed_public_read_policy_retained',async()=>{
  const policies=(await db.query("SELECT polname,polcmd FROM pg_policy WHERE polrelid='public.listing_store_categories'::regclass ORDER BY polname")).rows;
  assert.deepEqual(policies,[{polname:'users can read listing store categories',polcmd:'r'}]);
 });
 const proof={schema_version:1,kind:'store-category-authority-runtime',result:'PASS',generated_at_utc:new Date().toISOString(),
  checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,multiple_connections:false,
  pre_repair_reproduction_visibility:'Temporary exact baseline public listings SELECT policy; removed before repair. Current production visibility was not queried.',
  live_database:false,production_storage:false,mac_installer:false,
  inputs:Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...['01_authority.sql','apply.sql','tests/fixture.mjs','tests/runtime.mjs'].map(name=>
   ['supabase/repairs/20261110_store_category_authority/'+name,sha(fs.readFileSync(path.join(repair,name)))])])};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({result:'PASS',check_count:checks.length}));
}catch(error){console.error(JSON.stringify({result:'FAIL',checks,error_code:error.code??null,message:error.message}));process.exitCode=1;}
finally{await db.close();}
