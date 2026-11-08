import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {db,actors,asActor,asRole,call,service,prepare,publish,status,cancel,ownerRead,isPublic,content,
 confirmations,shownPolicies,newImage,readyImage,denied,setIdentity} from './fixture.mjs';
const caseName=process.argv[2];
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const state=async(id)=>scalar('SELECT to_jsonb(h) value FROM public.horse_offers h WHERE id=$1',[id]);
const editing=(p,title,extra={})=>prepare(content('sale',{offerId:p.horse_offer_id,title}),[],
 {offerId:p.horse_offer_id,revision:p.edit_revision,...extra});
if(caseName==='five_types_and_replay'){
 for(const type of ['sale','free_transfer','lease','co_rider','wanted']){
  const data=content(type,type==='wanted'?{wantedBudgetMode:'maximum',wantedBudgetAmount:12500,wantedCity:'Tartu'}:{});
  const p=await prepare(data),result=await publish(p);
  assert.equal(result.state,'published');assert.equal(result.horse_offer_id,p.horse_offer_id);
  assert.equal(await isPublic(p.horse_offer_id),true);
  const owner=await ownerRead(p);assert.equal(owner.offer_type,type);assert.equal(owner.content_type,'horse_offer');
  assert.equal(owner.status,'published');assert.equal(owner.edit_revision,result.edit_revision);
  const again=await call(actors.owner,'prepare_my_horse_publication_v1',p.args);assert.deepEqual(again,result);
  assert.deepEqual(await publish(p),result);assert.deepEqual(await status(p),result);
  const changed=structuredClone(p.args);changed[5].title+=' changed';
  await denied(()=>call(actors.owner,'prepare_my_horse_publication_v1',changed),'22023','publication_request_conflict');
  if(type==='wanted'){assert.equal(owner.details.wanted.budget.amount,12500);assert.equal(owner.details.wanted.search_area.city_or_municipality,'Tartu');}
  if(type==='free_transfer'){assert.equal(owner.price_type,'free');assert.equal(owner.price_amount,null);}
 }
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offers'),5);
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offer_publication_events'),5);
 assert.equal(await scalar('SELECT count(*)::int value FROM public.listings'),0);
}else if(caseName==='input_and_policy'){
 await denied(()=>prepare(content('sale',{title:''})),'22023');
 await denied(()=>prepare(content('sale',{details:{malicious:true}})),'22023');
 await denied(()=>prepare(content('sale',{horseLat:58,horseLng:25})),'22023');
 await denied(()=>prepare(content('free_transfer',{priceAmount:1})),'22023');
 await denied(()=>prepare(content('lease',{recurringFeePeriod:null})),'22023');
 await denied(()=>prepare(content('wanted',{horseName:'not wanted data'})),'22023');
 await denied(()=>prepare(content(),[],{confirmations:{...confirmations,publisher_confirms_not_for_slaughter:false}}),'22023');
 await denied(()=>prepare(content(),[],{policies:shownPolicies.map(x=>({...x,accepted:false}))}),'22023');
 await denied(()=>prepare(content(),[],{policies:shownPolicies.map(x=>({...x,contentHash:'c'.repeat(64)}))}),'42501');
 await denied(()=>prepare(content(),[],{identity:actors.peerIdentity}),'42501');
 await denied(()=>asRole('anon','SELECT public.get_my_horse_publication_attempt_v1($1,$2,NULL,$3)',
  [actors.owner,actors.ownerIdentity,crypto.randomUUID()]),'42501');
 await denied(()=>asRole('authenticated','SELECT * FROM horse_publication_private.commands'),'42501');
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offers'),0);
 assert.equal(await scalar('SELECT count(*)::int value FROM listing_publication_private.attempts'),0);
}else if(caseName==='cas_and_old_public'){
 const first=await publish(await prepare()),old=await state(first.horse_offer_id);
 const p1=await editing(first,'First edited title'),p2=await editing(first,'Conflicting second title');
 assert.equal((await state(first.horse_offer_id)).title,old.title);
 assert.equal(await isPublic(first.horse_offer_id),true);
 const saved=await publish(p1);assert.equal((await state(first.horse_offer_id)).title,'First edited title');
 assert.equal(await isPublic(first.horse_offer_id),true);
 await denied(()=>publish(p2),'40001','horse_offer_edit_conflict');
 assert.equal((await state(first.horse_offer_id)).title,'First edited title');
 assert.deepEqual(await publish(p1),saved);
 await cancel(p2);assert.equal((await state(first.horse_offer_id)).title,'First edited title');
 await denied(()=>editing(first,'Stale early edit'),'40001','horse_offer_edit_conflict');
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offer_publication_events'),2);
}else if(caseName==='cancel_and_identity'){
 const key=crypto.randomUUID(),context=[actors.owner,actors.ownerIdentity,null,key];
 const absent=await call(actors.owner,'get_my_horse_publication_attempt_v1',context);assert.equal(absent.state,'not_found');
 const closed=await call(actors.owner,'cancel_my_horse_publication_v1',context);assert.equal(closed.state,'cancelled');
 await denied(()=>prepare(content(),[],{key}),'55000','publication_attempt_closed');
 const p=await prepare(content(),[newImage()]);await setIdentity(actors.owner,actors.otherIdentity);
 await denied(()=>publish(p),'42501');await setIdentity(actors.owner,actors.ownerIdentity);
 const cancelled=await cancel(p);assert.equal(cancelled.state,'cancelled');
 assert.equal(await scalar('SELECT count(*)::int value FROM listing_publication_private.cleanup WHERE object_id IN(SELECT id FROM listing_publication_private.objects WHERE attempt_id=$1)',[p.attempt_id]),2);
 await denied(()=>publish(p),'55000','publication_attempt_closed');
 const recovered=await call(actors.owner,'get_my_horse_publication_attempt_v1',[actors.owner,actors.ownerIdentity,null,p.request_key]);
 assert.equal(recovered.attempt_id,p.attempt_id);assert.equal(recovered.state,'cancelled');
 assert.equal(await isPublic(p.horse_offer_id),false);
}else if(caseName==='policy_change_final'){
 const initial=await publish(await prepare()),p=await editing(initial,'Do not expose rejected edit');
 await db.query("UPDATE public.publication_policy_documents SET effective_until=clock_timestamp()-interval '1 second' WHERE policy_key='horse-offer-ee'");
 await denied(()=>publish(p),'55000','horse_offer_policy_unavailable');
 assert.equal((await state(initial.horse_offer_id)).title,'Synthetic horse sale');
 assert.equal(await isPublic(initial.horse_offer_id),true);
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offer_publication_events'),1);
}else if(caseName==='media_lifecycle'){
 const p=await prepare(content(),[newImage(),{...newImage(),isPrimary:false}]);
 await denied(()=>publish(p),'55000','publication_images_not_ready');
 await denied(()=>service('reserve_listing_multipart_v2',[p.actor_user_id,p.identity_id,p.attempt_id,
  p.slots[0].slot_id,crypto.randomUUID(),'source']),'22023','horse_offer_image_request_conflict');
 const ready1=await readyImage(p,0),ready2=await readyImage(p,1);const result=await publish(p);
 let owner=await ownerRead(p);assert.equal(owner.images.length,2);assert(owner.images[0].url.startsWith('/api/v2/horse-owner-media/'));
 assert.equal(await isPublic(p.horse_offer_id),true);
 const existing=owner.images[1];
 const p2=await prepare(content('sale',{offerId:p.horse_offer_id,title:'Edited gallery'}),
  [{imageId:existing.id,isPrimary:true},{...newImage(),isPrimary:false}],{offerId:p.horse_offer_id,revision:result.edit_revision});
 assert.equal(p2.slots[0].ordinal,1);await readyImage(p2);await publish(p2);
 owner=await ownerRead(p2);assert.equal(owner.images.length,2);assert.equal(owner.images[0].id,existing.id);
 assert.equal(owner.images[0].is_primary,true);assert.equal(await isPublic(p.horse_offer_id),true);
 assert.equal(await scalar("SELECT count(*)::int value FROM listing_publication_private.cleanup WHERE reason='published_image_removed'"),1);
 assert.equal(await scalar('SELECT count(*)::int value FROM horse_publication_private.gallery'),2);
 assert.equal(await scalar("SELECT count(*)::int value FROM listing_publication_private.cleanup WHERE reason='published_source'"),3);
 assert.equal(await scalar('SELECT count(*)::int value FROM public.horse_offer_publication_events'),2);
}else if(caseName==='live_media_proof'){
 const p=await prepare(content(),[newImage()]);const ready=await readyImage(p);
 const metadata=(await db.query('SELECT * FROM storage.objects WHERE id=$1',[ready.web.storageId])).rows[0];
 await db.query('DELETE FROM storage.objects WHERE id=$1',[metadata.id]);
 await denied(()=>publish(p),'55000','publication_multipart_web_completion_required');
 assert.equal(await isPublic(p.horse_offer_id),false);assert.equal((await state(p.horse_offer_id)).status,'draft');
 await db.query('INSERT INTO storage.objects(id,bucket_id,name,version) VALUES($1,$2,$3,$4)',
  [metadata.id,metadata.bucket_id,metadata.name,metadata.version]);
 await publish(p);assert.equal(await isPublic(p.horse_offer_id),true);
}else if(caseName==='business_and_authority'){
 await setIdentity(actors.owner,actors.businessIdentity);await setIdentity(actors.member,actors.businessIdentity);
 const p=await prepare(content(),[],{identity:actors.businessIdentity}),result=await publish(p);
 const p2=await prepare(content('sale',{offerId:p.horse_offer_id,title:'Business member update'}),[],
  {user:actors.member,identity:actors.businessIdentity,offerId:p.horse_offer_id,revision:result.edit_revision});
 await publish(p2);assert.equal((await state(p.horse_offer_id)).created_by_user_id,actors.owner);
 await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.member]);
 await denied(()=>ownerRead(p2),'42501');
 await denied(()=>asRole('authenticated','SELECT horse_publication_private.snapshot($1)',[p.attempt_id]),'42501');
 await denied(()=>asActor(actors.owner,'DELETE FROM public.horse_offer_images WHERE horse_offer_id=$1',[p.horse_offer_id]),'42501');
 const live=await prepare(content(),[],{identity:actors.businessIdentity});
 await denied(()=>call(actors.owner,'publish_my_listing_v1',[actors.owner,actors.businessIdentity,live.attempt_id,'f'.repeat(64)]),'55000');
 assert.equal(await scalar('SELECT count(*)::int value FROM public.listings'),0);
}else if(caseName==='media_binding_cleanup'){
 const p=await prepare(content(),[newImage()]),ready=await readyImage(p),published=await publish(p);
 const binding=await service('get_public_horse_media_binding_v1',[p.attempt_id,0]);
 assert.equal(binding.object_path,ready.web.object_path);assert.equal(binding.sha256,'c'.repeat(64));
 assert.equal(binding.bytes,100);
 assert.equal(await call(actors.peer,'get_my_horse_media_binding_v1',[actors.peer,actors.peerIdentity,p.attempt_id,0]),null);
 const context=[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key];
 const sourceWork=await service('claim_horse_publication_cleanup_v1',context);assert.equal(sourceWork.object_id,ready.source.id);
 await denied(()=>service('record_horse_publication_cleanup_v1',[...context,sourceWork.object_id,sourceWork.work_key,'deleted']),'55000');
 await db.query('DELETE FROM storage.objects WHERE id=$1',[ready.source.storageId]);
 await service('record_horse_publication_cleanup_v1',[...context,sourceWork.object_id,sourceWork.work_key,'deleted']);
 assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[ready.source.id]),true);
 assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[ready.web.id]),false);
 assert.equal(await isPublic(p.horse_offer_id),true);
 const edited=await prepare(content('sale',{offerId:p.horse_offer_id,title:'Gallery removed explicitly'}),[],
  {offerId:p.horse_offer_id,revision:published.edit_revision});await publish(edited);
 assert.equal(await service('get_public_horse_media_binding_v1',[p.attempt_id,0]),null);
 const editContext=[edited.actor_user_id,edited.identity_id,edited.attempt_id,edited.request_key];
 const webWork=await service('claim_horse_publication_cleanup_v1',editContext);assert.equal(webWork.object_id,ready.web.id);
 await denied(()=>service('record_horse_publication_cleanup_v1',[...editContext,webWork.object_id,webWork.work_key,'deleted']),'55000');
 await db.query('DELETE FROM storage.objects WHERE id=$1',[ready.web.storageId]);
 await service('record_horse_publication_cleanup_v1',[...editContext,webWork.object_id,webWork.work_key,'deleted']);
 assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[ready.web.id]),true);
 assert.equal(await service('claim_horse_publication_cleanup_v1',editContext),null);
 assert.equal(await isPublic(p.horse_offer_id),true);
}else throw Error('Unknown horse SQL case '+caseName);
const postgres=await scalar('SELECT version() value');
console.log(JSON.stringify({case:caseName,passed:true,postgres,provider_io:false,native_concurrency:false}));
await db.close();
