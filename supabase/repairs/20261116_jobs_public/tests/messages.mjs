import assert from 'node:assert/strict';
import {f,a,id,rpc,denied,owner,control,action} from './helpers.mjs';
const thread=(cid,user=a.peer,identity=a.peerIdentity)=>rpc(user,'get_my_marketplace_message_thread_v2',[user,identity,cid,null,null]);
const send=(cid,text)=>rpc(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,id(),cid,text,null,null]);
export async function messageCases(check,state){
 const service=await import('../../20261108_service_publication/tests/fixture.mjs');
 const horse=await import('../../20261108_horse_publication/tests/fixture.mjs');
 await check('job_contact_uses_existing_channel_and_message_local_historical_cards',async()=>{
  const before=(await f.db.query('SELECT count(*)::int n FROM public.messages')).rows[0].n;
  const key=id(),args=[a.peer,a.peerIdentity,key,state.job.job_id];
  const contacted=await rpc(a.peer,'contact_my_job_provider_v1',args);state.cid=contacted.conversation_id;
  assert.equal(contacted.job_id,state.job.job_id);assert.equal(contacted.replayed,false);
  assert.equal((await f.db.query('SELECT count(*)::int n FROM public.messages')).rows[0].n,before,'contact does not send a message');
  assert.equal((await rpc(a.peer,'contact_my_job_provider_v1',args)).replayed,true);
  const sent=await send(state.cid,'Synthetic job message');state.message=sent.message_id;
  const read=await thread(state.cid);assert.equal(read.listing.content_type,'job');assert.equal(read.listing.id,state.job.job_id);
  const card=read.messages.find(m=>m.id===sent.message_id).listing;
  assert.deepEqual(card,{id:state.job.job_id,title:state.job.content.title,image:null,price:null,content_type:'job'});
  assert.equal((await rpc(a.peer,'get_my_marketplace_message_thread_v1',[a.peer,a.peerIdentity,state.cid,null,null])).listing,null,
   'old v1 stays backward-compatible without receiving an unknown discriminator');
 });
 await check('job_service_horse_context_switch_keeps_each_historical_message_card',async()=>{
  const prepared=await service.prepare(service.content(),[],{user:a.member,identity:a.businessIdentity});
  const pub=await service.publish(prepared);const serviceId=pub.service_id;
  assert(serviceId);
  const serviceContact=await rpc(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,id(),serviceId]);
  assert.equal(serviceContact.conversation_id,state.cid,'same employer channel');
  const serviceSent=await send(state.cid,'Synthetic service message');
  let read=await thread(state.cid);assert.equal(read.listing.content_type,'service');
  assert.equal(read.messages.find(m=>m.id===state.message).listing.content_type,'job');
  assert.equal(read.messages.find(m=>m.id===serviceSent.message_id).listing.content_type,'service');
  assert.equal((await f.db.query('SELECT count(*)::int n FROM jobs_private.thread_context WHERE conversation_id=$1',[state.cid])).rows[0].n,0);
  // Horses retain their original author-user routing, unlike business-owner jobs/services.
  // Use that same employer account here to exercise one channel's context transitions.
  await f.setIdentity(a.owner,a.businessIdentity);let ho;
  try{
   const hp=await horse.prepare(horse.content(),[],{user:a.owner,identity:a.businessIdentity});
   ho=await horse.publish(hp);assert(ho.horse_offer_id);
  }finally{await f.setIdentity(a.owner,a.ownerIdentity);}
  const hc=await rpc(a.peer,'contact_my_horse_seller_v1',[a.peer,a.peerIdentity,id(),ho.horse_offer_id]);
  assert.equal(hc.conversation_id,state.cid,'same author-user and employer identity channel');
  const hs=await send(state.cid,'Synthetic horse message');read=await thread(state.cid);
  assert.equal(read.listing.content_type,'horse_offer');assert.equal(read.messages.find(m=>m.id===hs.message_id).listing.content_type,'horse_offer');
  await rpc(a.peer,'contact_my_job_provider_v1',[a.peer,a.peerIdentity,id(),state.job.job_id]);
  read=await thread(state.cid);assert.equal(read.listing.content_type,'job');
  assert.equal(read.messages.find(m=>m.id===serviceSent.message_id).listing.content_type,'service');
  assert.equal(read.messages.find(m=>m.id===state.message).listing.content_type,'job');
  assert.equal((await f.db.query('SELECT count(*)::int n FROM horse_publication_private.thread_context WHERE conversation_id=$1',[state.cid])).rows[0].n,0);
 });
 await check('ordinary_context_selection_then_terminal_removal_cannot_revive_old_job',async()=>{
  const ordinaryContact=await rpc(a.peer,'contact_my_listing_seller_v1',[a.peer,a.peerIdentity,id(),String(f.ordinary.id)]);
  assert.equal(ordinaryContact.conversation_id,state.cid);
  assert.equal((await f.db.query('SELECT count(*)::int n FROM jobs_private.thread_context WHERE conversation_id=$1',[state.cid])).rows[0].n,0);
  let read=await thread(state.cid);assert.equal(read.listing.id,String(f.ordinary.id));
  assert.equal(read.messages.find(m=>m.id===state.message).listing.content_type,'job');
  await f.setIdentity(a.owner,a.businessIdentity);
  try{
   const removed=await rpc(a.owner,'delete_my_published_listing_v1',[a.owner,a.businessIdentity,String(f.ordinary.id)]);
   assert.equal(removed.content_deleted,true,'real retained delete RPC acknowledges content deletion');
   assert.equal((await f.db.query('SELECT count(*)::int n FROM public.listings WHERE id=$1',[f.ordinary.id])).rows[0].n,0);
  }
  finally{await f.setIdentity(a.owner,a.ownerIdentity);}
  assert.equal((await f.db.query('SELECT listing_id FROM public.conversations WHERE id=$1',[state.cid])).rows[0].listing_id,null);
  read=await thread(state.cid);assert.equal(read.listing,null,'ordinary deletion does not revive job pointer');
  assert.equal(read.messages.find(m=>m.id===state.message).listing.content_type,'job');
  await rpc(a.peer,'contact_my_job_provider_v1',[a.peer,a.peerIdentity,id(),state.job.job_id]);
 });
 await check('blocked_or_expired_new_contact_refused_history_and_send_guard_preserved',async()=>{
  await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'block');
  await denied(()=>rpc(a.peer,'contact_my_job_provider_v1',[a.peer,a.peerIdentity,id(),state.job.job_id]));
  await denied(()=>send(state.cid,'Blocked synthetic message'));
  let read=await thread(state.cid);assert.equal(read.can_send,false);assert(read.messages.some(m=>m.id===state.message));
  await action(a.peer,await control(a.peer,'profile',a.businessIdentity),'unblock');
  await f.db.query("UPDATE public.jobs SET active_until=statement_timestamp() WHERE id=$1",[state.job.job_id]);
  await denied(()=>rpc(a.peer,'contact_my_job_provider_v1',[a.peer,a.peerIdentity,id(),state.job.job_id]));
  read=await thread(state.cid);assert(read.messages.some(m=>m.id===state.message));
  assert.equal((await owner(state.job.job_id)).job_id,state.job.job_id);
 });
}
