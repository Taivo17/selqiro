import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const name=process.argv[2],MiB=1024*1024;
const {db,actors,asActor,asRole,call,service,prepare,publish,content,newImage,readyImage,denied,setIdentity}=await import(
 ['three_hundred_historical_listings','legacy_published_source_receipt_preserved'].includes(name)? './historical-fixture.mjs':'./fixture.mjs');
const {image,readyImage:readyOrdinary,prepare:prepareAddition,append:appendAddition,
 deleteParent}=await import('../../20261106_published_photo_addition/tests/runtime-helpers.mjs');
const scalar=async(sql,args=[])=>{const started=performance.now();const value=(await db.query(sql,args)).rows[0].value;
 if(process.env.SELQIRO_CAPACITY_TIMING_TRACE==='1')console.error(JSON.stringify({query:sql.slice(0,100),elapsed_ms:Math.round(performance.now()-started)}));return value;};
const pending=(user=actors.owner)=>scalar('SELECT listing_publication_private.pending_upload_reserved_bytes_v1($1)::integer value',[user]);
const raw=(user=actors.owner)=>scalar(`SELECT coalesce(sum(o.reserved_bytes),0)::integer value FROM listing_publication_private.objects o
 JOIN listing_publication_private.attempts a ON a.id=o.attempt_id WHERE a.actor_user_id=$1
 AND NOT listing_publication_private.multipart_object_fully_deleted(o.id)`,[user]);
const claim=(user=actors.owner,identity=actors.ownerIdentity)=>service('claim_listing_account_source_cleanup_v1',[user,identity]);
const record=(work,user=actors.owner,identity=actors.ownerIdentity,outcome='deleted')=>service('record_listing_account_source_cleanup_v1',
 [user,identity,work.object_id,work.work_key,outcome]);
const erase=work=>db.query('DELETE FROM storage.objects WHERE bucket_id=$1 AND name=$2',[work.bucket_id,work.object_path]);
async function drain(user=actors.owner,identity=actors.ownerIdentity){
 const done=[];
 for(let n=0;n<20;n++){
  const work=await claim(user,identity);if(work===null)return done;
  assert(work.object_path.endsWith('/source.upload'));await erase(work);await record(work,user,identity);done.push(work);
 }
 throw Error('bounded synthetic SOURCE drain exceeded20');
}
const ordinaryInput={basics:{title:'Synthetic ordinary capacity listing',description:'A retained complete publication flow.',condition:'used'},
 price:{kind:'fixed',amount:'15.00',currency:'EUR'},category_path:['electronics','computers'],
 location:{country:'Estonia',city:'Paide',latitude:null,longitude:null},
 attributes:{manufacturer:'',part_number:'',oem_number:'',vehicle_brand:'',vehicle_model:'',vehicle_year:'',engine:''},details:{},language:'et'};
async function ordinary(count=1,user=actors.owner,identity=actors.ownerIdentity){
 const request=crypto.randomUUID(),p=await call(user,'prepare_my_listing_publication_v1',[user,identity,request,ordinaryInput,Array.from({length:count},image)]),ready=[];
 for(let n=0;n<count;n++)ready.push(await readyOrdinary({...p,slots:[p.slots[n]]}));
 const confirmation=await call(user,'get_my_listing_publication_confirmation_v1',[user,identity,p.attempt_id]);
 const receipt=await call(user,'publish_my_listing_v1',[user,identity,p.attempt_id,confirmation.confirmation.confirmation_sha256]);
 assert.equal(receipt.state,'published');
 return {id:Number(receipt.listing_id),attempt:p.attempt_id,request,author:user,identity,ready,p,receipt};
}
async function horse(count=1,options={}){
 const p=await prepare(content(),Array.from({length:count},(_,i)=>({...newImage(),isPrimary:i===0})),options),ready=[];
 for(let n=0;n<count;n++)ready.push(await readyImage(p,n));
 return {p,ready,receipt:await publish(p)};
}

try{
 if(name==='reported_259mib_and_all_three_gates'){
  const listing=await ordinary(7);assert.equal((await drain()).length,7);
  await horse(7);assert.equal((await drain()).length,7);
  await horse(7);assert.equal(await raw(),259*MiB);assert.equal(await pending(),175*MiB);
  const images=[image(),image()],ordinaryOpen=await call(actors.owner,'prepare_my_listing_publication_v1',
   [actors.owner,actors.ownerIdentity,crypto.randomUUID(),ordinaryInput,images]);
  assert.equal(ordinaryOpen.slots.length,2);assert.equal(await pending(),233*MiB);
  const horseOpen=await prepare(content(),[newImage(),{...newImage(),isPrimary:false}]);
  assert.equal(horseOpen.slots.length,2);assert.equal(await pending(),291*MiB);
  await denied(()=>prepareAddition(listing,crypto.randomUUID(),'0'),'54000','publication_retained_bytes_limit');
  assert.equal((await drain()).length,7);assert.equal(await pending(),116*MiB);
  const request=crypto.randomUUID(),addition=await prepareAddition(listing,request,'0'),ready=await readyOrdinary(addition.snapshot);
  const attached=await appendAddition(listing,request,addition.snapshot.attempt_id,ready.ready,'0');
  assert.equal(attached.gallery.images.length,8);assert.equal(await pending(),141*MiB);
  assert.equal((await drain()).length,1);assert.equal(await pending(),116*MiB);
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.listing_images WHERE listing_id=$1',[listing.id]),8);
 }else if(name==='cross_identity_account_scope_and_revocation'){
  await setIdentity(actors.owner,actors.otherIdentity);const privateOther=await horse(1,{identity:actors.otherIdentity});
  await setIdentity(actors.owner,actors.businessIdentity);const businessOwn=await horse(1,{identity:actors.businessIdentity});
  await setIdentity(actors.member,actors.businessIdentity);const businessMember=await horse(1,{user:actors.member,identity:actors.businessIdentity});
  await setIdentity(actors.owner,actors.ownerIdentity);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.owner]);
  const work=await claim();assert.equal(work.object_id,privateOther.ready[0].source.id);
  await denied(()=>record(work,actors.owner,actors.otherIdentity),'42501');
  await denied(()=>record(work,actors.peer,actors.peerIdentity),'42501');
  await erase(work);await record(work);assert.equal(await claim(),null);
  await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.owner]);
  const businessWork=await claim();assert.equal(businessWork.object_id,businessOwn.ready[0].source.id);
  await erase(businessWork);
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[actors.owner]);
  await denied(()=>record(businessWork),'42501');assert.equal(await pending(),25*MiB);
  await db.query("UPDATE public.business_members SET status='active' WHERE user_id=$1",[actors.owner]);
  await record(businessWork);assert.equal(await pending(),0);assert.equal(await claim(),null);
  assert.equal(await pending(actors.member),25*MiB);
  assert.equal(await scalar('SELECT count(*)::integer value FROM storage.objects WHERE id=$1',[businessMember.ready[0].source.storageId]),1);
  assert.equal(await scalar('SELECT active_identity_id value FROM public.profiles WHERE id=$1',[actors.owner]),actors.ownerIdentity);
 }else if(name==='exact_provider_proof_and_source_only_record'){
  const h=await horse(),source=h.ready[0].source,web=h.ready[0].web;
  await db.query('INSERT INTO storage.s3_multipart_uploads VALUES($1,$2,$3,$4)',[source.upload,source.bucket_id,source.object_path,source.version]);
  assert.equal(await claim(),null);await db.query('DELETE FROM storage.s3_multipart_uploads WHERE id=$1',[source.upload]);
  await db.query('UPDATE storage.objects SET version=$2 WHERE id=$1',[source.storageId,crypto.randomUUID()]);
  assert.equal(await claim(),null);await db.query('UPDATE storage.objects SET version=$2 WHERE id=$1',[source.storageId,source.version]);
  await db.query('DELETE FROM storage.objects WHERE id=$1',[web.storageId]);assert.equal(await claim(),null);
  await db.query('INSERT INTO storage.objects VALUES($1,$2,$3,$4)',[web.storageId,web.bucket_id,web.object_path,web.version]);
  const work=await claim();assert.equal(work.object_id,source.id);
  await denied(()=>record(work),'55000','publication_source_cleanup_not_observed');assert.equal(await pending(),25*MiB);
  await denied(()=>record({...work,work_key:crypto.randomUUID()}),'42501');
  await denied(()=>record({...work,object_id:web.id}),'42501');
  await erase(work);
  await db.query('INSERT INTO storage.s3_multipart_uploads_parts VALUES($1,$2,$3,$4,1,$5,0,clock_timestamp())',
   [source.upload,source.bucket_id,source.object_path,source.version,'late-part']);
  await denied(()=>record(work),'55000','publication_source_cleanup_not_observed');assert.equal(await pending(),25*MiB);
  await db.query('DELETE FROM storage.s3_multipart_uploads_parts WHERE upload_id=$1',[source.upload]);
  await record(work);await record(work);assert.equal(await pending(),0);
  assert.equal(await scalar('SELECT count(*)::integer value FROM storage.objects WHERE id=$1',[web.storageId]),1);
  await db.query('INSERT INTO storage.objects VALUES($1,$2,$3,$4)',[source.storageId,source.bucket_id,source.object_path,source.version]);
  assert.equal(await pending(),25*MiB,'a later provider witness must restore the cleanup debt');
  await denied(()=>asActor(actors.owner,'SELECT public.claim_listing_account_source_cleanup_v1($1,$2)',[actors.owner,actors.ownerIdentity]),'42501');
  await denied(()=>asRole('anon','SELECT public.claim_listing_account_source_cleanup_v1($1,$2)',[actors.owner,actors.ownerIdentity]),'42501');
 }else if(name==='published_gallery_can_exceed_former_lifetime_cap'){
  for(let n=0;n<8;n++){await horse(10);assert.equal((await drain()).length,10);}
  assert.equal(await raw(),320*MiB);assert.equal(await pending(),0);
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.horse_offer_images'),80);
  const p=await prepare(content(),[newImage(),{...newImage(),isPrimary:false}]);assert.equal(p.slots.length,2);
  assert.equal(await pending(),58*MiB);assert.equal(await raw(),378*MiB);
 }else if(name==='retired_web_debt_and_zero_upload_edit'){
  const first=await horse(10),second=await horse();assert.equal(await pending(),275*MiB);
  const remove=await prepare(content('sale',{offerId:first.p.horse_offer_id,title:'Remove existing gallery'}),[],
   {offerId:first.p.horse_offer_id,revision:first.receipt.edit_revision});await publish(remove);
  assert.equal(await pending(),315*MiB,'retiredWEB remains temporary cleanup debt');
  const edit=await prepare(content('sale',{offerId:second.p.horse_offer_id,title:'Text-only edit remains available'}),
   [{imageId:(await call(actors.owner,'get_my_horse_offer_publication_snapshot_v1',
    [actors.owner,actors.ownerIdentity,second.p.horse_offer_id])).images[0].id,isPrimary:true}],
   {offerId:second.p.horse_offer_id,revision:second.receipt.edit_revision});
  assert.equal(edit.slots.length,0);await publish(edit);assert.equal(await pending(),315*MiB);
  const noPhotos=await call(actors.owner,'prepare_my_listing_publication_v1',
   [actors.owner,actors.ownerIdentity,crypto.randomUUID(),ordinaryInput,[]]);assert.equal(noPhotos.slots.length,0);
  await denied(()=>prepare(content(),[newImage()]),'54000','publication_retained_bytes_limit');
 }else if(name==='three_hundred_historical_listings'){
  assert.equal(await scalar('SELECT count(*)::integer value FROM public.listings'),300);
  assert.equal(await scalar("SELECT sum(reserved_bytes)::integer value FROM listing_publication_private.objects WHERE kind='web'"),1200*MiB);
  assert.equal(await pending(),0);
  assert.equal(await scalar(`SELECT count(*)::integer value FROM listing_publication_private.objects
   WHERE kind='source' AND listing_publication_private.hosted_completed_source_deleted_v1(id)`),300);
  const p=await call(actors.owner,'prepare_my_listing_publication_v1',
   [actors.owner,actors.ownerIdentity,crypto.randomUUID(),ordinaryInput,[image(),image()]]);
  assert.equal(p.slots.length,2);assert.equal(await pending(),58*MiB);
  const h=await prepare(content(),[newImage(),{...newImage(),isPrimary:false}]);assert.equal(h.slots.length,2);
  assert.equal(await pending(),116*MiB);
  const parent=(await db.query(`SELECT p.listing_id id,p.attempt_id attempt,a.request_key request,
   a.actor_user_id author,a.identity_id identity FROM listing_publication_private.publications p
   JOIN listing_publication_private.attempts a ON a.id=p.attempt_id ORDER BY p.listing_id LIMIT 1`)).rows[0];
  const addition=await prepareAddition(parent,crypto.randomUUID(),'0');assert.equal(addition.snapshot.slots.length,1);
  assert.equal(await pending(),145*MiB);
 }else if(name==='legacy_published_source_receipt_preserved'){
  const source=await scalar("SELECT id value FROM listing_publication_private.objects WHERE kind='source'");
  assert.equal(await scalar('SELECT count(*)::integer value FROM listing_publication_private.multipart_sessions WHERE object_id=$1',[source]),0);
  assert.equal(await scalar('SELECT listing_publication_private.hosted_completed_source_deleted_v1($1) value',[source]),false);
  assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[source]),true);
  assert.equal(await raw(),4*MiB);assert.equal(await pending(),0,'the existing accepted legacy SOURCE receipt stays excluded');
  assert.equal(await claim(),null,'legacy receipt is not newly cleaned by the completed-session worker');
  const p=await prepare(content(),[newImage(),{...newImage(),isPrimary:false}]);assert.equal(p.slots.length,2);
  assert.equal(await pending(),58*MiB);
 }else if(name==='record_after_whole_listing_removal'){
  const listing=await ordinary(),work=await claim();assert.equal(work.object_id,listing.ready[0].source.id);
  await deleteParent(listing);assert.equal(await scalar('SELECT count(*)::integer value FROM public.listings WHERE id=$1',[listing.id]),0);
  await erase(work);await record(work);
  assert.equal(await scalar('SELECT listing_publication_private.hosted_completed_source_deleted_v1($1) value',[work.object_id]),true);
  assert.equal(await pending(),4*MiB,'removedWEB retains its separate cleanup obligation');
 }else throw Error('Unknown capacity runtime case '+name);
 console.log(JSON.stringify({case:name,passed:true,postgres:await scalar('SELECT version() value'),
  provider_io:false,native_concurrency:false}));
}catch(error){
 console.error(JSON.stringify({case:name,passed:false,message:error.message,code:error.code,where:error.where,detail:error.detail,
  stack:error.code?undefined:error.stack}));process.exitCode=1;
}finally{await db.close();}
