import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const name=process.argv[2];
if(name==='old_explicit_attempt_survives_install')process.env.SELQIRO_HORSE_CONFIRMATION_REUSE_BASELINE_ONLY='1';
const {db,actors,asRole,call,service,prepare,publish,cancel,ownerRead,isPublic,content,newImage,readyImage,
 confirmations,shownPolicies,denied,setIdentity,applyConfirmationModules}=await import('./fixture.mjs');
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const horsePolicyId=shownPolicies.find(p=>p.version==='ee-horse-v1')?.documentId;
assert.equal(typeof horsePolicyId,'string','fixture exposes the actual required horse policy');
const event=id=>scalar('SELECT to_jsonb(e) value FROM public.horse_offer_publication_events e WHERE id=$1',[id]);
const originalRef=s=>({reusePublicationEventId:s.publication_event_id});
const snapshot=p=>ownerRead(p);
const activity=h=>call(h.actor_user_id,'get_my_horse_offer_lifecycle_v1',[h.actor_user_id,h.identity_id,h.horse_offer_id]);
const select=async(h,next)=>{const a=await activity(h);return call(h.actor_user_id,'set_my_horse_offer_status_v1',[
 h.actor_user_id,h.identity_id,h.horse_offer_id,a.edit_revision,a.source_status,a.active_until,next]);};
async function horse(type='sale',photos=0,options={}){
 const p=await prepare(content(type),Array.from({length:photos},(_,i)=>({...newImage(),isPrimary:i===0})),options);
 for(let i=0;i<photos;i++)await readyImage(p,i);
 const receipt=await publish(p);return {...p,receipt};
}
async function edit(h,title,options={}){
 const s=await snapshot(h);
 return prepare(content(s.offer_type,{offerId:h.horse_offer_id,title}),
  s.images.map(i=>({imageId:i.id,isPrimary:i.is_primary})),{
   user:h.actor_user_id,identity:h.identity_id,offerId:h.horse_offer_id,revision:s.edit_revision,
   confirmations:originalRef(s.saved_confirmation),...options});
}
const countEvents=()=>scalar('SELECT count(*)::integer value FROM public.horse_offer_publication_events');
try{
 if(name==='saved_evidence_only_after_successful_publication'){
  for(const type of ['sale','free_transfer','lease','co_rider','wanted']){
   const p=await prepare(content(type),[]);
   assert.equal((await snapshot(p)).saved_confirmation,null,'a draft or prepared attempt is not confirmation evidence');
   const result=await publish(p),s=await snapshot(p),e=await event(result.publication_event_id);
   assert.equal(s.saved_confirmation.schema_version,1);
   assert.equal(s.saved_confirmation.offer_id,p.horse_offer_id);
   assert.equal(s.saved_confirmation.identity_id,p.identity_id);
   assert.equal(s.saved_confirmation.actor_user_id,p.actor_user_id);
   assert.equal(s.saved_confirmation.offer_type,type);
   assert.equal(s.saved_confirmation.publication_event_id,e.id);
   assert.equal(Date.parse(s.saved_confirmation.confirmed_at),Date.parse(e.created_at));
   assert.equal(Object.keys(e.confirmation_snapshot).length,type==='wanted'?4:7);
   assert(!Object.hasOwn(e.confirmation_snapshot,'reused_from_publication_event_id'));
  }
 }else if(name==='repeated_edits_keep_original_evidence_and_lifecycle'){
  const h=await horse('sale',2),initial=await snapshot(h),origin=await event(initial.saved_confirmation.publication_event_id);
  let previousRevision=BigInt(initial.edit_revision);
  for(const state of ['active','paused','sold']){
   await select(h,state);
   const before=await snapshot(h),p=await edit(h,'Saved while '+state),prepared=await scalar(
    'SELECT confirmation_snapshot value FROM horse_publication_private.commands WHERE attempt_id=$1',[p.attempt_id]);
   assert.deepEqual(prepared,{...origin.confirmation_snapshot,reused_from_publication_event_id:origin.id});
   const result=await publish(p),after=await snapshot(h),newEvent=await event(result.publication_event_id);
   assert.equal(after.title,'Saved while '+state);assert.equal(after.status,before.status);
   assert.equal(after.active_until,before.active_until);assert.deepEqual(after.images,before.images);
   assert.deepEqual(after.saved_confirmation,initial.saved_confirmation);
   assert.deepEqual(newEvent.confirmation_snapshot,prepared);
   assert.deepEqual(await event(origin.id),origin,'original confirmation is never rewritten');
   assert(BigInt(after.edit_revision)>previousRevision);previousRevision=BigInt(after.edit_revision);
   assert.equal(await isPublic(h.horse_offer_id),state==='active');
  }
  assert.equal(await countEvents(),4);assert.equal(await scalar('SELECT count(*)::integer value FROM public.listings'),0);
 }else if(name==='wanted_reuse_preserves_four_fact_scope'){
  const h=await horse('wanted'),s=await snapshot(h),origin=await event(s.saved_confirmation.publication_event_id);
  assert.equal(Object.keys(origin.confirmation_snapshot).length,4);
  const p=await edit(h,'Wanted information corrected'),result=await publish(p),next=await event(result.publication_event_id);
  assert.deepEqual(next.confirmation_snapshot,{...origin.confirmation_snapshot,reused_from_publication_event_id:origin.id});
  for(const key of ['publisher_is_owner_or_authorized','publisher_confirms_horse_identified','publisher_confirms_passport_available'])
   assert.equal(Object.hasOwn(next.confirmation_snapshot,key),false,'inapplicable facts must not be invented');
 }else if(name==='invalid_reference_new_draft_other_offer_and_type_refused'){
  const h=await horse(),s=await snapshot(h),ref=originalRef(s.saved_confirmation),another=await horse();
  await denied(()=>prepare(content(),[],{confirmations:ref}),'22023','horse_offer_confirmations_required');
  const draft=await prepare();
  await denied(()=>prepare(content('sale',{offerId:draft.horse_offer_id}),[],{
   offerId:draft.horse_offer_id,revision:draft.edit_revision,confirmations:ref}),'22023','horse_offer_confirmations_required');
  await cancel(draft);
  const other=await snapshot(another);
  await denied(()=>prepare(content('sale',{offerId:another.horse_offer_id}),[],{
   offerId:another.horse_offer_id,revision:other.edit_revision,confirmations:ref}),'22023','horse_offer_confirmations_required');
  for(const bad of [{reusePublicationEventId:crypto.randomUUID()}, {...ref,publisher_confirms_age_18_or_over:true},
   {reusePublicationEventId:null},{reusePublicationEventId:'not-an-event'},
   {reused_from_publication_event_id:ref.reusePublicationEventId},{}])
   await denied(()=>edit(h,'Rejected reference',{confirmations:bad}),'22023');
  await denied(()=>prepare(content('wanted',{offerId:h.horse_offer_id}),[],{
   offerId:h.horse_offer_id,revision:s.edit_revision,confirmations:ref}),'22023','horse_offer_type_immutable');
  assert.equal(await countEvents(),2);assert.equal((await snapshot(h)).title,s.title);
 }else if(name==='same_person_identity_and_private_authority'){
  await setIdentity(actors.owner,actors.businessIdentity);await setIdentity(actors.member,actors.businessIdentity);
  const h=await horse('sale',0,{identity:actors.businessIdentity}),owner=await snapshot(h),member={...h,actor_user_id:actors.member};
  const otherPerson=await snapshot(member);
  assert.equal(otherPerson.saved_confirmation,null,'sharing a business identity cannot transfer a personal confirmation');
  await denied(()=>prepare(content('sale',{offerId:h.horse_offer_id}),[],{
   user:actors.member,identity:actors.businessIdentity,offerId:h.horse_offer_id,revision:otherPerson.edit_revision,
   confirmations:originalRef(owner.saved_confirmation)}),'22023','horse_offer_confirmations_required');
  const fresh=await prepare(content('sale',{offerId:h.horse_offer_id,title:'Explicitly confirmed by member'}),[],{
   user:actors.member,identity:actors.businessIdentity,offerId:h.horse_offer_id,revision:otherPerson.edit_revision,confirmations});
  const published=await publish(fresh);
  const ownEvidence=await snapshot(member);assert.equal(ownEvidence.saved_confirmation.actor_user_id,actors.member);
  assert.equal(ownEvidence.saved_confirmation.publication_event_id,published.publication_event_id);
  assert.equal((await snapshot(h)).saved_confirmation,null);
  await publish(await edit(member,'Member edit reuses only own facts'));
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.member]);
  await denied(()=>snapshot(member),'42501');
  await setIdentity(actors.owner,actors.otherIdentity);await denied(()=>snapshot(h),'42501');
  for(const role of ['anon','authenticated','service_role'])
   await denied(()=>asRole(role,'SELECT horse_publication_private.reusable_confirmation($1,$2)',[h.horse_offer_id,actors.owner]),'42501');
  await denied(()=>call(actors.peer,'get_my_horse_offer_publication_snapshot_v1',[actors.peer,actors.peerIdentity,h.horse_offer_id]),'42501');
  await denied(()=>service('prepare_my_horse_publication_v1',[actors.owner,actors.businessIdentity,crypto.randomUUID(),null,null,content(),[],confirmations,shownPolicies]),'42501');
 }else if(name==='changed_policies_remain_explicit_and_exact'){
  const h=await horse(),initial=await snapshot(h),pending=await edit(h,'Old policy must not save'),nextId=crypto.randomUUID();
  await db.query("UPDATE public.publication_policy_documents SET status='retired',effective_until=clock_timestamp() WHERE id=$1",[horsePolicyId]);
  await db.query(`INSERT INTO public.publication_policy_documents(id,policy_key,policy_version,country_code,locale,title,body_text,
   content_hash,status,applies_to_content_types,effective_from,metadata)
   SELECT $1,policy_key,'ee-horse-v2',country_code,locale,title,'Changed synthetic policy for exact consent test.',
    repeat('d',64),'active',applies_to_content_types,clock_timestamp()-interval '1 second',metadata
   FROM public.publication_policy_documents WHERE id=$2`,[nextId,horsePolicyId]);
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.publication_policy_documents WHERE id=$1',[nextId]),1);
  await denied(()=>publish(pending),'42501','horse_offer_policy_consent_required');
  assert.equal((await snapshot(h)).title,initial.title);
  assert.deepEqual((await snapshot(h)).saved_confirmation,initial.saved_confirmation,'reading saved facts does not accept new policy terms');
  await cancel(pending);
  await denied(()=>edit(h,'Old shown policy'),'42501','publication_policy_changed');
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.user_publication_policy_acceptances WHERE policy_document_id=$1',[nextId]),0);
  const nextShown=shownPolicies.map(p=>p.documentId===horsePolicyId?
   {documentId:nextId,version:'ee-horse-v2',contentHash:'d'.repeat(64),accepted:true}:p);
  await denied(()=>edit(h,'Unchecked new policy',{policies:nextShown.map(p=>p.documentId===nextId?{...p,accepted:false}:p)}),'22023');
  const valid=await edit(h,'New terms explicitly accepted; prior facts retained',{policies:nextShown});
  await publish(valid);
  const after=await snapshot(h);assert.deepEqual(after.saved_confirmation,initial.saved_confirmation);
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.user_publication_policy_acceptances WHERE policy_document_id=$1',[nextId]),1);
 }else if(name==='exact_retry_conflict_and_stale_revision'){
  const h=await horse(),before=await snapshot(h),key=crypto.randomUUID(),p=await edit(h,'One reference intent',{key});
  const retried=await prepare(p.args[5],p.args[6],{user:p.actor_user_id,identity:p.identity_id,key,
   offerId:h.horse_offer_id,revision:before.edit_revision,confirmations:p.args[7],policies:p.args[8]});
  assert.equal(retried.attempt_id,p.attempt_id);
  await denied(()=>prepare(p.args[5],p.args[6],{key,offerId:h.horse_offer_id,revision:before.edit_revision,
   confirmations}),'22023','publication_request_conflict');
  await select(h,'paused');
  await denied(()=>publish(p),'40001','horse_offer_edit_conflict');await cancel(p);
  const fresh=await edit(h,'Fresh paused edit'),result=await publish(fresh);
  assert.deepEqual(await publish(fresh),result,'exact final retry returns the same event without duplicating confirmation');
  assert.equal(await countEvents(),2);assert.equal((await snapshot(h)).status,'paused');
  assert.equal((await snapshot(h)).active_until,before.active_until);
  await select(h,'active');
  const priorRenewal=await activity(h),pendingRenewal=await edit(h,'Stale after explicit renewal');
  const renewed=await call(h.actor_user_id,'renew_my_horse_offer_activity_v1',[
   h.actor_user_id,h.identity_id,h.horse_offer_id,priorRenewal.edit_revision,priorRenewal.source_status,priorRenewal.active_until]);
  assert.equal(renewed.changed,true);assert(BigInt(renewed.edit_revision)>BigInt(priorRenewal.edit_revision));
  await denied(()=>publish(pendingRenewal),'40001','horse_offer_edit_conflict');await cancel(pendingRenewal);
  await publish(await edit(h,'Fresh after explicit renewal'));
  assert.equal((await snapshot(h)).active_until,renewed.active_until);
  assert.equal(await countEvents(),3);
 }else if(name==='final_write_rechecks_original_evidence'){
  for(const fault of ['different_original_person','missing_original_fact']){
   const h=await horse();await publish(await edit(h,'Current publication retains original facts'));
   const s=await snapshot(h),p=await edit(h,'Must not accept invalidated original evidence'),eventsBefore=await countEvents();
   // Controlled fault injection in the disposable database only: normal clients
   // cannot bypass the retained append-only trigger or rewrite this event. The
   // original event differs from the current event, exercising direct provenance.
   const table='public.horse_offer_publication_events';
   const triggers=(await db.query(`SELECT tgname FROM pg_trigger WHERE tgrelid=$1::regclass AND NOT tgisinternal`,[table])).rows;
   for(const {tgname} of triggers)await db.exec('ALTER TABLE '+table+' DISABLE TRIGGER '+tgname);
   if(fault==='different_original_person')
    await db.query('UPDATE public.horse_offer_publication_events SET actor_user_id=$2 WHERE id=$1',[s.saved_confirmation.publication_event_id,actors.peer]);
   else await db.query("UPDATE public.horse_offer_publication_events SET confirmation_snapshot=confirmation_snapshot-'publisher_confirms_passport_available' WHERE id=$1",[s.saved_confirmation.publication_event_id]);
   for(const {tgname} of triggers)await db.exec('ALTER TABLE '+table+' ENABLE TRIGGER '+tgname);
   assert.equal((await snapshot(h)).saved_confirmation,null);
   assert.equal((await snapshot(h)).edit_revision,s.edit_revision,'the test isolates evidence rechecking independently of revision CAS');
   await denied(()=>publish(p),'22023','horse_offer_confirmations_required');
   assert.equal((await snapshot(h)).title,s.title);assert.equal(await countEvents(),eventsBefore);
  }
 }else if(name==='old_explicit_attempt_survives_install'){
  const h=await horse(),before=await snapshot(h);
  assert.equal(Object.hasOwn(before,'saved_confirmation'),false);
  const pending=await prepare(content('sale',{offerId:h.horse_offer_id,title:'Saved existing explicit intent'}),[],{
   offerId:h.horse_offer_id,revision:before.edit_revision,confirmations});
  await applyConfirmationModules();
  const result=await publish(pending),after=await snapshot(h);
  assert.equal(after.title,'Saved existing explicit intent');assert.equal(after.active_until,before.active_until);
  assert.equal(after.saved_confirmation.publication_event_id,result.publication_event_id);
  const e=await event(result.publication_event_id);
  assert.equal(Object.hasOwn(e.confirmation_snapshot,'reused_from_publication_event_id'),false);
  await publish(await edit(h,'Later edit reuses the actual new explicit evidence'));
  assert.equal((await snapshot(h)).saved_confirmation.publication_event_id,e.id);
 }else throw Error('Unknown confirmation runtime case '+name);
 console.log(JSON.stringify({case:name,passed:true,postgres:await scalar('SELECT version() value'),provider_io:false,native_concurrency:false}));
}catch(error){
 console.error(JSON.stringify({case:name,passed:false,message:error.message,code:error.code,where:error.where,detail:error.detail,stack:error.code&&/^[0-9A-Z]{5}$/.test(error.code)?undefined:error.stack}));process.exitCode=1;
}finally{await db.close();}
