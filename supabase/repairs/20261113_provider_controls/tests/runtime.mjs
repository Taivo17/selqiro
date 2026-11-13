import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as service from '../../20261108_service_publication/tests/fixture.mjs';
import * as horse from '../../20261108_horse_publication/tests/fixture.mjs';
const {db,repair,actors:a,asActor,asRole,call,publicCall,setIdentity,install,snapshot,all,sha,provenance,modules}=f;
const checks=[],wires=[],id=()=>crypto.randomUUID(),slug='synthetic-'+a.ownerIdentity;
const capture=(context,response)=>{wires.push({...context,response});return response;};
const get=async(user,type,target)=>capture({operation:'get',actor_user_id:user,target_type:type,target_id:String(target)},await f.get(user,type,target));
const action=async(user,state,name,next=null)=>capture({operation:'set',actor_user_id:user,target_type:state.target_type,
 target_id:state.target_id,action:name},await f.action(user,state,name,next));
const list=async(user,kind,limit=25,offset=0)=>capture({operation:'list',actor_user_id:user,kind,result_limit:limit,result_offset:offset},await f.list(user,kind,limit,offset));
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
const reject=async(fn,code)=>assert.rejects(fn,e=>e.code===code);
const ordinary=(version=2,user=a.peer,limit=60,offset=0)=>call(user,'search_public_listings_v'+version,['',null,null,null,null,'',limit,offset]);
const market=(user=a.peer,limit=60,offset=0,identity=null)=>call(user,'search_public_marketplace_v1',['',null,null,null,null,'',limit,offset,identity]);
const services=(user=a.peer)=>call(user,'search_public_services_v1',['',null,null,null,null,100,0]);
const legacy=async(nearby=false,user=a.peer)=>(await asActor(user,'SELECT listing_id::text id FROM public.'+
 (nearby?'get_marketplace_listings_nearby(NULL,NULL,30,0)':'get_marketplace_listings(30,0)'))).rows;
const profile=async(user=a.peer,target=slug)=>(await asActor(user,'SELECT to_jsonb(p) value FROM public.get_store_by_slug($1) p',[target])).rows.map(x=>x.value);
const detail=(type,target,user=a.peer)=>call(user,type==='listing'?'get_public_listing_detail_v1':type==='horse_offer'?'get_public_horse_offer_v1':'get_public_service_v1',[String(target)]);
const feed=async(user=a.peer)=>(await asActor(user,"SELECT id::text id FROM public.discovery_listings_v1 WHERE status='active' AND active_until>statement_timestamp() ORDER BY created_at DESC,id DESC LIMIT 25")).rows;
const hiddenRows=()=>all('provider_controls_private.hidden_providers');
try{
 for(const [n,user,identity] of [[61001,a.owner,a.ownerIdentity],[61002,a.owner,a.ownerIdentity],[61003,a.owner,a.ownerIdentity],
  [61004,a.peer,a.peerIdentity],[61005,a.peer,a.peerIdentity],[61006,a.owner,a.otherIdentity]])
  await db.query("INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,active_until,created_at) VALUES($1,$2,$3,$2,'Provider control listing','active',now()+interval '20 days',now()+$4::int*interval '1 second')",[n,user,identity,n]);
 await db.query("INSERT INTO public.listing_translations(listing_id,language,title,status) VALUES(61004,'en','Translated peer listing','published')");
 await db.query("INSERT INTO public.listing_images(id,listing_id,user_id,original_url,sort_order,is_primary) VALUES($1,61004,$2,'https://example.test/peer.webp',0,true)",[id(),a.peer]);
 const s=await service.prepare(service.content(),[service.newImage()]);await service.readyImage(s);await service.publish(s);
 const sPeer=await service.prepare(service.content({title:'Peer service'}),[],{user:a.peer,identity:a.peerIdentity});await service.publish(sPeer);
 const h=await horse.prepare(horse.content(),[]);await horse.publish(h);
 const c=await call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,id(),s.service_id]);
 const sent=await call(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,id(),c.conversation_id,'History must remain readable',null,null]);
 const thread=()=>call(a.peer,'get_my_marketplace_message_thread_v1',[a.peer,a.peerIdentity,c.conversation_id,null,null]);
 await check('install_changes_no_content_photos_categories_activity_blocks_or_messages',async()=>{
  const rows=await snapshot();await install();assert.deepEqual(await snapshot(),rows);assert.deepEqual(await hiddenRows(),[]);
 });
 await check('all_three_content_kinds_and_profile_resolve_one_canonical_provider',async()=>{
  for(const [type,target] of [['listing','61001'],['horse_offer',h.horse_offer_id],['service',s.service_id],['profile',a.ownerIdentity]]){
   const r=await get(a.peer,type,target);assert.equal(r.provider.identity_id,a.ownerIdentity);assert(r.target_available&&r.can_hide&&r.can_block);
   assert.equal(r.target_type,type);assert.equal(r.target_id,String(target));assert(!r.hidden&&!r.blocked_by_me&&!r.blocked_by_other);
  }
 });
 let hidden,undo;
 const beforeSearch={v1:await ordinary(1),v2:await ordinary(2),market:await market(),services:await services(),legacy:await legacy(),nearby:await legacy(true)};
 const beforeDirect={listing:await detail('listing','61001'),horse:await detail('horse_offer',h.horse_offer_id),service:await detail('service',s.service_id),profile:await profile(),thread:await thread()};
 await check('server_clock_24_hours_and_preference_only_write',async()=>{
  const rows=await snapshot();hidden=await action(a.peer,await get(a.peer,'listing','61001'),'hide',id());
  assert(hidden.changed&&hidden.hidden);assert.equal(hidden.target_type,'listing');assert.deepEqual(await snapshot(),rows);
  const seconds=(await db.query('SELECT extract(epoch FROM $1::timestamptz-$2::timestamptz)::text seconds',[hidden.hidden_until,hidden.server_now])).rows[0].seconds;
  assert.equal(Number(seconds),86400);assert.equal((await hiddenRows()).length,1);
 });
 await check('all_six_searches_filter_before_counts_and_page_selection',async()=>{
  for(const version of [1,2]){const r=await ordinary(version);assert.equal(Number(r.total_count),Number(beforeSearch['v'+version].total_count)-3);
   assert(!r.items.some(x=>['61001','61002','61003'].includes(x.content_id)));assert(r.items.some(x=>x.content_id==='61006'));
   const page=await ordinary(version,a.peer,2,0),next=await ordinary(version,a.peer,2,2);assert.equal(page.items.length,2);
   assert.equal(page.total_count,r.total_count);assert.equal(next.items.length,1);assert.equal(next.has_more,false);
  }
  const m=await market();assert.equal(Number(m.total_count),Number(beforeSearch.market.total_count)-4);
  assert(!m.items.some(x=>x.content_id===h.horse_offer_id));assert.equal((await market(a.peer,60,0,a.ownerIdentity)).total_count,'0');
  assert.equal(Number((await services()).total_count),Number(beforeSearch.services.total_count)-1);
  assert.equal((await legacy()).length,beforeSearch.legacy.length-3);assert.equal((await legacy(true)).length,beforeSearch.nearby.length-3);
 });
 await check('legacy_invoker_feed_filters_before_limit_preserves_underlying_RLS_and_grants',async()=>{
  const rows=await feed();assert.deepEqual(rows.map(x=>x.id).sort(),['61004','61005','61006']);
  const anon=(await asRole('anon',"SELECT id::text id FROM public.discovery_listings_v1 WHERE status='active' AND active_until>now()")).rows;
  assert.equal(anon.length,6);assert.equal((await asRole('anon','SELECT * FROM public.hidden_provider_ids_for_viewer_v1()')).rows.length,0);
  const direct=(await asActor(a.peer,'SELECT id::text id FROM public.listings ORDER BY id')).rows;assert.equal(direct.length,6);
  await db.exec('BEGIN');try{await db.exec('DROP POLICY "Public can view listings" ON public.listings');
   assert.equal((await feed()).length,0);assert.equal((await asRole('anon','SELECT * FROM public.discovery_listings_v1')).rows.length,0);
  }finally{await db.exec('ROLLBACK');}
  for(const role of ['anon','authenticated','service_role']){
   assert.equal((await db.query("SELECT has_table_privilege($1,'public.discovery_listings_v1','DELETE') allowed",[role])).rows[0].allowed,false);
   await assert.rejects(()=>asRole(role,"DELETE FROM public.discovery_listings_v1 WHERE id=61001"),e=>['42501','55000'].includes(e.code));
  }
 });
 await check('temporary_hide_preserves_direct_detail_profile_media_and_message_history',async()=>{
  assert.deepEqual(await detail('listing','61001'),beforeDirect.listing);assert.deepEqual(await detail('horse_offer',h.horse_offer_id),beforeDirect.horse);
  assert.deepEqual(await detail('service',s.service_id),beforeDirect.service);assert.deepEqual(await profile(),beforeDirect.profile);
  assert.deepEqual(await thread(),beforeDirect.thread);assert((await thread()).messages.some(x=>x.id===sent.message_id));
  const p=await call(a.peer,'get_public_profile_marketplace_v2',[slug,null,24,0]);assert(p.items.some(x=>x.content_id==='61001'||x.id==='61001'));
  const ps=await call(a.peer,'get_public_profile_services_v2',[slug,null,24,0]);assert(ps.items.some(x=>x.id===s.service_id));
 });
 await check('explicit_computed_embeds_keep_invoker_image_translation_RLS',async()=>{
  const sql="SELECT (SELECT count(*) FROM public.listing_images(d))::int images,(SELECT count(*) FROM public.listing_translations(d))::int translations FROM public.discovery_listings_v1 d WHERE d.id=61004";
  for(const role of ['anon','authenticated'])assert.deepEqual((await asRole(role,sql)).rows,[{images:1,translations:1}]);
  await db.exec('BEGIN');try{await db.exec('DROP POLICY "Users can view all images" ON public.listing_images;DROP POLICY "Public can read active listing translations" ON public.listing_translations');
   assert.deepEqual((await asRole('anon',sql)).rows,[{images:0,translations:0}]);
   assert.deepEqual((await asActor(a.peer,sql)).rows,[{images:0,translations:1}]);
  }finally{await db.exec('ROLLBACK');}
 });
 await check('other_accounts_anonymous_and_other_provider_identity_are_unaffected',async()=>{
  assert.equal((await ordinary(2,a.outsider)).total_count,beforeSearch.v2.total_count);
  assert.equal((await publicCall('search_public_marketplace_v1',['',null,null,null,null,'',60,0,null])).total_count,beforeSearch.market.total_count);
  assert((await ordinary()).items.some(x=>x.content_id==='61006'));
 });
 await check('identity_switch_does_not_change_account_preference',async()=>{
  await setIdentity(a.peer,null);assert((await get(a.peer,'profile',a.ownerIdentity)).hidden);
  assert.equal((await ordinary()).total_count,'3');await setIdentity(a.peer,a.peerIdentity);
 });
 await check('bounded_hidden_management_and_exact_replay_do_not_extend_clock',async()=>{
  const first=await list(a.peer,'hidden');assert.equal(first.total_count,'1');assert.equal(first.items[0].target_type,'hidden_provider');
  assert(first.items.every(x=>x.hidden));const rows=await hiddenRows();
  const original={...hidden,hide_revision:null};const replay=await action(a.peer,original,'hide',hidden.hide_revision);
  assert(!replay.changed);assert.equal(replay.hidden_until,hidden.hidden_until);assert.deepEqual(await hiddenRows(),rows);
  const noop=await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'hide',id());assert(!noop.changed);assert.equal(noop.hidden_until,hidden.hidden_until);
 });
 await check('unhide_tombstone_and_stale_undo_cannot_erase_a_new_hide',async()=>{
  undo=(await list(a.peer,'hidden')).items[0];const restored=await action(a.peer,undo,'unhide',id());assert(!restored.hidden&&restored.changed);
  assert(restored.hide_revision);assert.equal(restored.hidden_until,null);assert.equal((await list(a.peer,'hidden')).total_count,'0');
  hidden=await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'hide',id());
  await reject(()=>action(a.peer,undo,'unhide',id()),'40001');assert((await get(a.peer,'hidden_provider',a.ownerIdentity)).hidden);
 });
 await check('expired_hides_self_expire_without_worker_and_renew_uses_server_24_hours',async()=>{
  await db.query("UPDATE provider_controls_private.hidden_providers SET hidden_until=statement_timestamp()-interval '1 microsecond' WHERE viewer_user_id=$1",[a.peer]);
  const old=await get(a.peer,'profile',a.ownerIdentity);assert(!old.hidden&&old.hidden_until);assert.equal((await list(a.peer,'hidden')).total_count,'0');
  assert.equal((await market()).total_count,beforeSearch.market.total_count);
  hidden=await action(a.peer,old,'hide',id());assert(hidden.changed&&hidden.hidden);
 });
 await check('actor_mismatch_foreign_management_and_private_storage_are_closed',async()=>{
  await reject(()=>call(a.peer,'get_my_provider_control_v1',[a.owner,'profile',a.ownerIdentity]),'42501');
  const ownMissing=await get(a.outsider,'hidden_provider',a.ownerIdentity),randomMissing=await get(a.outsider,'hidden_provider',id());
  assert(!ownMissing.target_available&&ownMissing.target_token===null);assert.equal(ownMissing.provider.identity_id,null);
  assert.equal(randomMissing.target_available,false);
  for(const role of ['anon','service_role'])await reject(()=>asRole(role,'SELECT public.get_my_provider_control_v1($1,$2,$3)',[a.peer,'profile',a.ownerIdentity]),'42501');
  for(const role of ['anon','authenticated','service_role'])for(const sql of ['SELECT * FROM provider_controls_private.hidden_providers',
   'DELETE FROM provider_controls_private.hidden_providers','TRUNCATE provider_controls_private.hidden_providers'])await reject(()=>asRole(role,sql),'42501');
 });
 await check('own_and_active_member_providers_cannot_be_hidden_or_blocked',async()=>{
  for(const [user,identity] of [[a.owner,a.ownerIdentity],[a.owner,a.businessIdentity],[a.member,a.businessIdentity]]){
   const own=await get(user,'profile',identity);assert(own.target_available);assert(!own.can_hide&&!own.can_block);
   await reject(()=>action(user,own,'hide',id()),'42501');await reject(()=>action(user,own,'block'),'42501');
  }
 });
 await check('changed_provider_account_invalidates_menu_target_token',async()=>{
  const old=await get(a.peer,'listing','61006');await db.query('UPDATE public.listings SET user_id=$1 WHERE id=61006',[a.outsider]);
  try{await reject(()=>action(a.peer,old,'block'),'40001');}finally{await db.query('UPDATE public.listings SET user_id=$1 WHERE id=61006',[a.owner]);}
 });
 let blocked;
 await check('permanent_block_reuses_one_canonical_pair_and_is_distinct_from_hide',async()=>{
  const before=await snapshot(),hideBefore=await hiddenRows();blocked=await action(a.peer,await get(a.peer,'service',s.service_id),'block');
  assert(blocked.changed&&blocked.blocked_by_me&&blocked.block_id&&blocked.block_created_at);assert(blocked.hidden);
  assert.deepEqual(await hiddenRows(),hideBefore);const after=await snapshot();delete before['public.user_blocks'];delete after['public.user_blocks'];assert.deepEqual(after,before);
  const replay=await action(a.peer,await get(a.peer,'service',s.service_id),'block');assert(!replay.changed);assert.equal(replay.block_id,blocked.block_id);
  const hiddenItem=(await list(a.peer,'hidden')).items[0];const unhidden=await action(a.peer,hiddenItem,'unhide',id());assert(!unhidden.hidden&&unhidden.blocked_by_me);
 });
 await check('block_filters_all_searches_and_direct_profile_before_page_but_keeps_history',async()=>{
  assert.equal((await ordinary()).total_count,'2');assert.equal((await legacy()).length,2);assert.equal((await legacy(true)).length,2);assert.equal((await feed()).length,2);
  assert.equal((await profile()).length,0);assert.equal((await detail('listing','61001')).item,null);
  assert.equal(await detail('horse_offer',h.horse_offer_id),null);assert.equal(await detail('service',s.service_id),null);
  assert((await thread()).messages.some(x=>x.id===sent.message_id));assert.equal((await thread()).can_send,false);
  await reject(()=>call(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,id(),c.conversation_id,'Refused',null,null]),'42501');
  await reject(()=>call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,id(),s.service_id]),'42501');
 });
 await check('conversation_GET_uses_exact_peer_and_does_not_authorize_mutation_or_foreign_reads',async()=>{
  const mine=await get(a.peer,'conversation',c.conversation_id);assert(mine.blocked_by_me&&!mine.blocked_by_other);assert(!mine.can_hide&&!mine.can_block);
  const theirs=await get(a.owner,'conversation',c.conversation_id);assert(theirs.blocked_by_other&&!theirs.blocked_by_me);
  assert.equal(theirs.provider.identity_id,a.peerIdentity);assert.equal((await get(a.outsider,'conversation',c.conversation_id)).target_available,false);
  await reject(()=>action(a.peer,mine,'unblock'),'22023');
 });
 await check('block_management_exact_unblock_and_missing_target_do_not_claim_global_unblocked',async()=>{
  const items=await list(a.peer,'blocked');assert.equal(items.total_count,'1');const b=items.items[0];assert.equal(b.target_type,'blocked_account');
  const unblocked=await action(a.peer,b,'unblock');assert(unblocked.changed&&!unblocked.blocked_by_me);assert.equal(unblocked.target_id,b.target_id);
  const missing=await get(a.peer,'blocked_account',b.target_id);assert(!missing.target_available&&missing.target_token===null);
  blocked=await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'block');assert.notEqual(blocked.block_id,b.block_id);
  await reject(()=>action(a.peer,{...blocked,block_id:b.block_id,block_created_at:b.block_created_at},'unblock'),'40001');
  assert((await get(a.peer,'profile',a.ownerIdentity)).blocked_by_me);
  await action(a.peer,(await list(a.peer,'blocked')).items[0],'unblock');assert((await thread()).can_send);
 });
 await check('profile_slug_block_is_applied_after_canonical_candidate_selection',async()=>{
  await db.query('UPDATE public.profiles SET store_slug=$1 WHERE id=$2',[slug,a.outsider]);
  await action(a.peer,await get(a.peer,'profile',a.ownerIdentity),'block');assert.equal((await profile()).length,0);
  await action(a.peer,(await list(a.peer,'blocked')).items[0],'unblock');assert.equal((await profile())[0].identity_id,a.ownerIdentity);
 });
 await check('conversation_business_member_peer_is_not_replaced_by_business_owner',async()=>{
  await setIdentity(a.member,a.businessIdentity);
  const memberHorse=await horse.prepare(horse.content(),[],{user:a.member,identity:a.businessIdentity});await horse.publish(memberHorse);
  const memberThread=await call(a.peer,'contact_my_horse_seller_v1',[a.peer,a.peerIdentity,id(),memberHorse.horse_offer_id]);
  const pair=(await db.query('SELECT seller_id,seller_identity_id FROM public.conversations WHERE id=$1',[memberThread.conversation_id])).rows[0];
  assert.equal(pair.seller_id,a.member);assert.equal(pair.seller_identity_id,a.businessIdentity);
  await asActor(a.member,'INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[a.member,a.peer]);
  assert((await get(a.peer,'conversation',memberThread.conversation_id)).blocked_by_other);
  assert.equal((await get(a.peer,'profile',a.businessIdentity)).blocked_by_other,false);
  await asActor(a.member,'DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[a.member,a.peer]);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1 AND business_account_id=$2",[a.member,a.business]);
  assert.equal((await get(a.peer,'conversation',memberThread.conversation_id)).blocked_by_other,false);
  assert.equal((await call(a.peer,'get_my_marketplace_message_thread_v1',[a.peer,a.peerIdentity,memberThread.conversation_id,null,null])).can_send,false);
  await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1 AND business_account_id=$2",[a.member,a.business]);
  await setIdentity(a.member,a.memberIdentity);
 });
 await check('management_pages_count_only_own_active_preferences_with_one_server_now',async()=>{
  for(const identity of [a.ownerIdentity,a.otherIdentity,a.outsiderIdentity])await action(a.peer,await get(a.peer,'profile',identity),'hide',id());
  const first=await list(a.peer,'hidden',2,0),second=await list(a.peer,'hidden',2,2),end=await list(a.peer,'hidden',2,4);
  assert.equal(first.total_count,'3');assert.equal(first.items.length,2);assert.equal(first.next_offset,2);
  assert.equal(second.items.length,1);assert(!second.has_more&&second.next_offset===null);assert.equal(end.items.length,0);
  assert(first.items.every(x=>x.hidden&&x.server_now===first.items[0].server_now));
  assert.equal((await list(a.outsider,'hidden')).total_count,'0');
 });
 await check('invalid_bounds_keys_and_cross_action_CAS_fields_fail_closed',async()=>{
  for(const [type,target] of [['listing','01'],['listing','9223372036854775808'],['blocked_account','0'],['conversation','-1'],['service','oops'],['nope','1']])
   await reject(()=>get(a.peer,type,target),'22023');
  for(const target of ['0','-1','-9223372036854775808'])assert.equal((await get(a.peer,'listing',target)).target_available,false);
  await reject(()=>list(a.peer,'all'),'22023');await reject(()=>list(a.peer,'hidden',51),'22023');await reject(()=>list(a.peer,'hidden',25,-1),'22023');
  const state=await get(a.peer,'profile',a.ownerIdentity);
  await reject(()=>call(a.peer,'set_my_provider_control_v1',[a.peer,'profile',a.ownerIdentity,'hide',state.target_token,state.hide_revision,id(),'1',new Date().toISOString()]),'22023');
  await reject(()=>call(a.peer,'set_my_provider_control_v1',[a.peer,'profile',a.ownerIdentity,'block','0'.repeat(64),null,null,null,null]),'40001');
 });
 await check('management_metadata_is_bounded_and_no_private_account_id_leaks',async()=>{
  await db.query("UPDATE public.identity_profiles SET display_name=repeat('A',4000),avatar_url='https://example.test/'||repeat('a',3000) WHERE identity_id=$1",[a.ownerIdentity]);
  const state=await get(a.peer,'profile',a.ownerIdentity);assert.equal(state.provider.display_name.length,200);assert.equal(state.provider.avatar_url,null);
  assert(!JSON.stringify(state).includes('account_id'));assert(!Object.hasOwn(state.provider,'user_id'));
 });
 const inputs=Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...[...modules,'tests/fixture.mjs','tests/runtime.mjs'].map(n=>
  ['supabase/repairs/20261113_provider_controls/'+n,sha(fs.readFileSync(path.join(repair,n)))])]);
 fs.writeFileSync(path.join(repair,'tests/wire-examples.json'),JSON.stringify({schema_version:1,synthetic_rows:true,cases:wires},null,2)+'\n');
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify({schema_version:1,kind:'provider-controls-runtime',result:'PASS',
  generated_at_utc:new Date().toISOString(),checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:true,
  concurrent_sessions:false,live_database:false,production_storage:false,mac_installer:false,postgrest_embeds:false,inputs},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length,wire_examples:wires.length}));
}catch(e){console.error(JSON.stringify({result:'FAIL',checks,code:e.code,message:e.message,where:e.where,detail:e.detail,position:e.position,
 stack:e.stack?.split('\n').slice(0,7)}));process.exitCode=1;}
finally{await db.close();}
