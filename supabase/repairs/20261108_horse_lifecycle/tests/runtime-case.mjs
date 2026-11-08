import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {db,actors,asRole,call,service,prepare,publish,cancel,status,ownerRead,isPublic,
 content,newImage,readyImage,denied,setIdentity} from './fixture.mjs';
const name=process.argv[2],MiB=1024*1024;
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const anon=async(fn,args)=>(await asRole('anon','SELECT public.'+fn+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
const detail=id=>anon('get_public_horse_offer_v1',[id]);
const search=identity=>anon('search_public_marketplace_v1',['','horses',null,null,null,'',24,0,identity??null]);
const contact=id=>call(actors.peer,'contact_my_horse_seller_v1',[actors.peer,actors.peerIdentity,crypto.randomUUID(),id]);
const activity=(id,user=actors.owner,identity=actors.ownerIdentity)=>call(user,'get_my_horse_offer_lifecycle_v1',[user,identity,id]);
const args=s=>[s.actor_user_id,s.identity_id,s.content_id,s.edit_revision,s.source_status,s.active_until];
const select=(s,next)=>call(s.actor_user_id,'set_my_horse_offer_status_v1',[...args(s),next]);
const renew=s=>call(s.actor_user_id,'renew_my_horse_offer_activity_v1',args(s));
const pending=()=>scalar('SELECT listing_publication_private.pending_upload_reserved_bytes_v1($1)::integer value',[actors.owner]);
const claim=()=>service('claim_listing_account_source_cleanup_v1',[actors.owner,actors.ownerIdentity]);
const record=work=>service('record_listing_account_source_cleanup_v1',[actors.owner,actors.ownerIdentity,work.object_id,work.work_key,'deleted']);
const exact=(id,column)=>scalar('SELECT '+column+'::text value FROM public.horse_offers WHERE id=$1',[id]);
async function horse(count=1,type='sale',options={}){
 const p=await prepare(content(type),Array.from({length:count},(_,i)=>({...newImage(),isPrimary:i===0})),options),ready=[];
 for(let n=0;n<count;n++)ready.push(await readyImage(p,n));
 const receipt=await publish(p);assert.equal(receipt.state,'published');
 return {p,receipt,ready,id:p.horse_offer_id};
}
async function edit(h,title,{newPhoto=false}={}){
 const before=await ownerRead(h.p),images=before.images.map(x=>({imageId:x.id,isPrimary:x.is_primary}));
 if(newPhoto)images.push({...newImage(),isPrimary:images.length===0});
 const p=await prepare(content(before.offer_type,{offerId:h.id,title}),images,{offerId:h.id,revision:before.edit_revision});
 for(let n=0;n<p.slots.length;n++)await readyImage(p,n);
 return p;
}
async function hidden(h){
 assert.equal(await isPublic(h.id),false);assert.equal(await detail(h.id),null);
 for(const identity of [null,actors.ownerIdentity])assert(!(await search(identity)).items.some(x=>x.content_id===h.id));
 await denied(()=>contact(h.id),'42501');
 if(h.ready.length){
  assert.equal(await service('get_public_horse_media_binding_v1',[h.p.attempt_id,0]),null);
  assert(await call(actors.owner,'get_my_horse_media_binding_v1',[actors.owner,actors.ownerIdentity,h.p.attempt_id,0]));
 }
}
async function durable(id){return scalar(`SELECT jsonb_build_object('content',public.build_horse_offer_content_snapshot_v1(id),
 'event',current_publication_event_id,'images',(SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id)
 FROM public.horse_offer_images i WHERE i.horse_offer_id=h.id)) value FROM public.horse_offers h WHERE id=$1`,[id]);}
async function expire(id){await db.query("UPDATE public.horse_offers SET published_at=clock_timestamp()-interval '100 days', active_until=clock_timestamp()-interval '10 days' WHERE id=$1",[id]);}

try{
 if(name==='new_publications_exact_ninety_days'){
  await db.exec("SET timezone='America/New_York'");
  for(const type of ['sale','free_transfer','lease','co_rider','wanted']){
   const h=await horse(type==='sale'?2:0,type),s=await activity(h.id);
   assert.equal(s.source_status,'published');assert.equal(s.status,'active');assert.equal(s.changed,false);
   assert.equal(await scalar('SELECT extract(epoch FROM active_until-published_at)::bigint::text value FROM public.horse_offers WHERE id=$1',[h.id]),String(90*24*60*60));
   assert.match(s.active_until,/\+00:00$/);assert(await isPublic(h.id));assert(await detail(h.id));
  }
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.listings'),0,'canonical horses do not create ordinary shadow rows');
 }else if(name==='status_revoke_public_preserve_owner_media'){
  const h=await horse(2),before=await durable(h.id),initial=await activity(h.id);
  let s=initial;
  for(const [next,canonical] of [['paused','paused'],['sold','closed']]){
   const changed=await select(s,next);assert.equal(changed.status,next);assert.equal(changed.source_status,canonical);
   assert.equal(changed.active_until,initial.active_until);assert.equal(changed.changed,true);
   assert.equal(BigInt(changed.edit_revision),BigInt(s.edit_revision)+1n);await hidden(h);
   assert.deepEqual(await durable(h.id),before);
   const noop=await select(changed,next);assert.deepEqual(noop,{...changed,changed:false});
   await denied(()=>renew(noop),'55000','horse_offer_activity_active_status_required');
   s=changed;
  }
  const active=await select(s,'active');assert.equal(active.active_until,initial.active_until);
  assert(await isPublic(h.id));assert(await detail(h.id));assert.deepEqual(await durable(h.id),before);
 }else if(name==='expired_requires_explicit_renewal_and_exact_cas'){
  const h=await horse(),before=await durable(h.id);await expire(h.id);await hidden(h);
  const expired=await activity(h.id),unchanged=await select(expired,'active');assert.equal(unchanged.changed,false);
  assert.equal(unchanged.edit_revision,expired.edit_revision);assert.equal(unchanged.active_until,expired.active_until);await hidden(h);
  const beforeClock=await scalar('SELECT extract(epoch FROM clock_timestamp()) value'),renewed=await renew(expired),afterClock=await scalar('SELECT extract(epoch FROM clock_timestamp()) value');
  const deadline=await scalar('SELECT extract(epoch FROM active_until) value FROM public.horse_offers WHERE id=$1',[h.id]);
  assert(Number(deadline)>=Number(beforeClock)+90*86400&&Number(deadline)<=Number(afterClock)+90*86400);
  assert.equal(renewed.changed,true);assert.equal(BigInt(renewed.edit_revision),BigInt(expired.edit_revision)+1n);
  assert(await isPublic(h.id));assert.deepEqual(await durable(h.id),before);
  await denied(()=>renew(expired),'40001','horse_offer_edit_conflict');
  const shifted=await scalar("SELECT (active_until+interval '1 microsecond')::text value FROM public.horse_offers WHERE id=$1",[h.id]);
  await denied(()=>select({...renewed,active_until:shifted},'paused'),'40001');
  await denied(()=>select({...renewed,source_status:'paused'},'sold'),'40001');
  await denied(()=>select({...renewed,active_until:null},'paused'),'22023');
 }else if(name==='legacy_null_deadline_finite_fallback'){
  const h=await horse();
  await db.query("UPDATE public.horse_offers SET active_until=NULL,published_at='2020-03-01T12:13:14.123456Z' WHERE id=$1",[h.id]);
  await db.exec("SET timezone='America/New_York'");
  const s=await activity(h.id);assert.equal(s.active_until,'2020-05-30T12:13:14.123456+00:00');
  assert.equal(await exact(h.id,'active_until'),null);await hidden(h);
  const changed=await select(s,'paused');assert.equal(changed.active_until,s.active_until);
  assert.equal(await exact(h.id,'active_until'),null,'status does not backfill or extend legacy deadline');
  const active=await select(changed,'active');await hidden(h);assert((await renew(active)).changed);
  assert(await isPublic(h.id));
  const draft=await prepare(content(),[]);assert.equal((await activity(draft.horse_offer_id)).active_until,null);
  assert.equal(await isPublic(draft.horse_offer_id),false);
  await db.query("UPDATE public.horse_offers SET active_until='infinity' WHERE id=$1",[h.id]);
  assert.equal(await isPublic(h.id),false);assert.equal(await detail(h.id),null);
  await denied(()=>activity(h.id),'55000','horse_offer_activity_invalid');
 }else if(name==='stale_edit_cannot_undo_status_or_renewal'){
  const h=await horse();
  for(const next of ['paused','sold']){
   const prepared=await edit(h,'Must not publish stale '+next),before=await durable(h.id),s=await activity(h.id);
   const changed=await select(s,next);
   await denied(()=>publish(prepared),'40001','horse_offer_edit_conflict');
   assert.deepEqual(await durable(h.id),before);assert.deepEqual(await activity(h.id),{...changed,changed:false});
   await cancel(prepared);await select(await activity(h.id),'active');
  }
  const prepared=await edit(h,'Must not overwrite renewal'),before=await durable(h.id);
  const renewed=await renew(await activity(h.id));assert.equal(renewed.changed,true);
  await denied(()=>publish(prepared),'40001','horse_offer_edit_conflict');
  assert.deepEqual(await durable(h.id),before);assert.equal((await activity(h.id)).active_until,renewed.active_until);await cancel(prepared);
 }else if(name==='paused_sold_expired_edits_preserve_lifecycle'){
  for(const next of ['paused','sold','expired']){
   const h=await horse();
   if(next==='expired')await expire(h.id);else await select(await activity(h.id),next);
   const before=await activity(h.id),prepared=await edit(h,'Changed safely while '+next,{newPhoto:true}),result=await publish(prepared),after=await activity(h.id);
   assert.equal(result.state,'published');assert.equal(after.source_status,before.source_status);assert.equal(after.active_until,before.active_until);
   assert.equal((await ownerRead(h.p)).title,'Changed safely while '+next);
   assert.equal((await ownerRead(h.p)).images.length,2);await hidden(h);
   assert.equal(await scalar('SELECT state value FROM listing_publication_private.attempts WHERE id=$1',[prepared.attempt_id]),'published');
   assert.equal(await scalar('SELECT horse_publication_private.attempt_publication_matches($1,$2,$3) value',
    [prepared.attempt_id,actors.owner,actors.ownerIdentity]),true);
   assert.equal((await status(prepared)).state,'published');
  }
 }else if(name==='actor_ownership_and_canonical_finality'){
  const h=await horse(),s=await activity(h.id);
  await denied(()=>activity(h.id,actors.peer,actors.peerIdentity),'42501');
  await denied(()=>call(actors.peer,'set_my_horse_offer_status_v1',[actors.peer,actors.peerIdentity,...args(s).slice(2),'paused']),'42501');
  await setIdentity(actors.owner,actors.otherIdentity);
  await denied(()=>activity(h.id),'42501');await denied(()=>select(s,'paused'),'42501');
  await setIdentity(actors.owner,actors.ownerIdentity);
  await denied(()=>asRole('anon','SELECT public.get_my_horse_offer_lifecycle_v1($1,$2,$3)',[actors.owner,actors.ownerIdentity,h.id]),'42501');
  await denied(()=>service('renew_my_horse_offer_activity_v1',args(s)),'42501');
  await denied(()=>select(s,'draft'),'22023');
  await db.query("UPDATE public.horse_offers SET title='Unproven changed content' WHERE id=$1",[h.id]);
  await hidden(h);const fresh=await activity(h.id);
  await denied(()=>select(fresh,'paused'),'55000','horse_offer_activity_unavailable');
  await denied(()=>renew(fresh),'55000','horse_offer_activity_unavailable');
 }else if(name==='completed_sources_cleanup_when_not_public'){
  const records=[];
  for(const next of ['paused','sold','expired']){
   const h=await horse();if(next==='expired')await expire(h.id);else await select(await activity(h.id),next);
   await hidden(h);records.push(h);
   assert.equal(await pending(),25*MiB);
   const work=await claim();assert(work);assert.equal(work.object_id,h.ready[0].source.id);
   assert(work.object_path.endsWith('/source.upload'));
   await db.query('DELETE FROM storage.objects WHERE bucket_id=$1 AND name=$2',[work.bucket_id,work.object_path]);
   await record(work);assert.equal(await pending(),0);assert.equal(await claim(),null);
   assert.equal(await scalar('SELECT count(*)::integer value FROM storage.objects WHERE id=$1',[h.ready[0].web.storageId]),1);
  }
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.horse_offer_images'),records.length);
 }else if(name==='longer_period_and_nonactionable_states'){
  const h=await horse();await db.query("UPDATE public.horse_offers SET active_until=clock_timestamp()+interval '120 days' WHERE id=$1",[h.id]);
  const s=await activity(h.id);assert.deepEqual(await renew(s),s,'explicit renewal preserves longer existing period');
  await denied(()=>select({...s,source_status:'held_for_review'},'active'),'22023');
  await assert.rejects(()=>db.query("UPDATE public.horse_offers SET status='held_for_review',held_at=clock_timestamp() WHERE id=$1",[h.id]),
   error=>error.code==='23514'&&error.message==='horse_offer_publication_event_decision_mismatch');
  for(const state of ['rejected','archived']){
   await db.query('UPDATE public.horse_offers SET status=$2,held_at=clock_timestamp(),rejected_at=clock_timestamp(),archived_at=clock_timestamp() WHERE id=$1',[h.id,state]);
   const current=await activity(h.id);assert.equal(current.status,null);assert.equal(current.source_status,state);
   assert.equal(await isPublic(h.id),false);await denied(()=>select(current,'active'),'22023');
  }
 }else throw Error('Unknown lifecycle runtime case '+name);
 console.log(JSON.stringify({case:name,passed:true,postgres:await scalar('SELECT version() value'),provider_io:false,native_concurrency:false}));
}catch(error){
 console.error(JSON.stringify({case:name,passed:false,message:error.message,code:error.code,where:error.where,detail:error.detail,stack:error.code?undefined:error.stack}));process.exitCode=1;
}finally{await db.close();}
