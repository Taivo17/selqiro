import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const name=process.argv[2];
const f=await import('./fixture.mjs');
const {db,actors:a,asActor,asRole,call,service,prepare,publish,status,cancel,ownerRead,content,newImage,readyImage,denied,setIdentity}=f;
const key=()=>crypto.randomUUID();
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const anon=async(name,args=[])=>(await asRole('anon','SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
const detail=id=>anon('get_public_service_v1',[id]);
const events=()=>scalar('SELECT count(*)::int value FROM service_publication_private.events');
const context=p=>[p.actor_user_id,p.identity_id,p.attempt_id,p.request_key];
async function edit(p,title,gallery,options={}){
 const s=await ownerRead(p);
 return prepare({...s.content,priceAmount:s.content.priceAmount===null?null:Number(s.content.priceAmount),title},
 gallery??s.images.map(x=>({imageId:x.id,isPrimary:x.is_primary})),{
 serviceId:s.service_id,revision:s.edit_revision,user:p.actor_user_id,identity:p.identity_id,...options});
}
async function active(p,next){const s=await ownerRead(p);return call(p.actor_user_id,'set_my_service_activity_v1',[
 p.actor_user_id,p.identity_id,p.service_id,s.edit_revision,s.status,next]);}
async function created(photos=0,options={}){
 const p=await prepare(content(),Array.from({length:photos},(_,i)=>({...newImage(),isPrimary:i===0})),options);
 for(let i=0;i<photos;i++)await readyImage(p,i);
 await publish(p);return p;
}
try{
 if(name==='commands_and_cas'){
  const p=await prepare();assert.equal((await ownerRead(p)).status,'draft');assert.equal(await detail(p.service_id),null);
  const published=await publish(p);assert.equal(published.state,'published');assert.equal(published.edit_revision,'2');
  assert.deepEqual(await publish(p),published);assert.deepEqual(await status(p),published);assert.equal(await events(),1);
  assert.deepEqual(await call(a.owner,'prepare_my_service_publication_v1',p.args),published);
  const args=structuredClone(p.args);args[5].title='Different command under the same key';
  await denied(()=>call(a.owner,'prepare_my_service_publication_v1',args),'22023');
  for(const title of ['First saved edit','Second saved edit']){await publish(await edit(p,title));assert.equal((await detail(p.service_id)).title,title);}
  const earlier=await ownerRead(p),q=await edit(p,'Wins revision race'),stale=await edit(p,'Loses revision race');
  await publish(q);await denied(()=>publish(stale),'40001');assert.equal((await detail(p.service_id)).title,'Wins revision race');
  assert.equal(await events(),4);await cancel(stale);
  const beforeStatus=await ownerRead(p);const pauseArgs=[a.owner,a.ownerIdentity,p.service_id,beforeStatus.edit_revision,'published','archived'];
  const paused=await call(a.owner,'set_my_service_activity_v1',pauseArgs);
  assert.deepEqual(await call(a.owner,'set_my_service_activity_v1',pauseArgs),paused,'lost status response can be reconciled once');
  assert.equal(await detail(p.service_id),null);await publish(await edit(p,'Edit while paused'));
  const editedPaused=await ownerRead(p);assert.equal(editedPaused.status,'archived');assert.equal(editedPaused.published_at,earlier.published_at);
  assert.equal(await detail(p.service_id),null);await active(p,'published');assert.equal((await detail(p.service_id)).title,'Edit while paused');
  assert.equal((await ownerRead(p)).published_at,earlier.published_at,'status change introduces no new duration policy');
  await denied(()=>call(a.owner,'set_my_service_activity_v1',pauseArgs),'40001');
  await denied(()=>db.query('UPDATE service_publication_private.events SET content_hash=repeat(\'f\',64) WHERE id=$1',[published.publication_event_id]),'55000');
  await denied(()=>db.query('DELETE FROM service_publication_private.commands WHERE attempt_id=$1',[p.attempt_id]),'55000');
  assert.equal(await scalar('SELECT count(*)::int value FROM public.listings'),0);
 }else if(name==='legacy_identity_and_authority'){
  const id=key(),other=key(),im1=key(),im2=key();
  await db.query(`INSERT INTO public.services(id,identity_id,title,category,status,service_lat,service_lng,image_url,published_at)
   VALUES($1,$2,'Legacy unchanged service','transport_roadside','published',59.123,24.123,'https://example.test/old-cover.jpg',clock_timestamp()),
   ($3,$2,'Other legacy service','transport_roadside','published',null,null,null,clock_timestamp())`,[id,a.ownerIdentity,other]);
  await db.query(`INSERT INTO public.service_images(id,service_id,identity_id,original_url,sort_order,is_primary,uploaded_by_user_id,storage_path)
   VALUES($1,$2,$3,'https://example.test/a.jpg',7,false,$5,$2::uuid::text||'/a.jpg'),($4,$2,$3,'https://example.test/b.jpg',9,true,$5,$2::uuid::text||'/b.jpg')`,[im1,id,a.ownerIdentity,im2,a.owner]);
  const p={actor_user_id:a.owner,identity_id:a.ownerIdentity,service_id:id},before=await ownerRead(p);
  assert.deepEqual(before.images.map(x=>x.sort_order),[0,1]);assert.deepEqual(before.images.map(x=>x.is_primary),[false,true]);
  await db.query("UPDATE public.service_categories SET is_active=false WHERE code='transport_roadside'");
  const q=await edit(p,'Legacy record gets published');await publish(q);
  assert.equal(q.service_id,id);assert.equal((await ownerRead(p)).status,'published');
  assert.deepEqual((await ownerRead(p)).images.map(x=>x.id),[im1,im2]);assert.equal((await detail(id)).images[0].id,im2);
  assert.deepEqual((await db.query('SELECT service_lat,service_lng FROM public.services WHERE id=$1',[id])).rows[0],{service_lat:59.123,service_lng:24.123});
  const old=await ownerRead(p);await denied(()=>prepare(content({serviceId:id,category:'invalid'}),[],{serviceId:id,revision:old.edit_revision}),'22023');
  const otherP={...p,service_id:other};await denied(()=>edit(otherP,'Cross-parent image',[{imageId:im1,isPrimary:true}]),'42501');
  await denied(()=>call(a.peer,'get_my_service_publication_snapshot_v1',[a.peer,a.peerIdentity,id]),'42501');
  await denied(()=>call(a.owner,'save_my_service_v2',[id,'Bypass writer']),'42501');
  await denied(()=>call(a.owner,'set_my_service_status_v2',[id,'draft']),'42501');
  await denied(()=>call(a.owner,'delete_my_service_image_v2',[id,im1]),'42501');
  await denied(()=>asActor(a.owner,'UPDATE public.services SET title=$1 WHERE id=$2',['Bypass raw',id]),'42501');
  assert.equal(await call(a.owner,'can_manage_service_storage_v2',[id]),false);
  await denied(()=>asActor(a.owner,'SELECT * FROM service_publication_private.events'),'42501');
  await setIdentity(a.owner,a.otherIdentity);await denied(()=>ownerRead(p),'42501');await setIdentity(a.owner,a.ownerIdentity);
  await db.query("UPDATE public.service_categories SET is_active=true WHERE code='transport_roadside'");
  const optional=key(),draft=key();
  await db.query(`INSERT INTO public.services(id,identity_id,title,category,price_type,price_amount,currency,status,published_at)
   VALUES($1,$2,'Optional legacy fields',NULL,'fixed',NULL,'EUR','published',clock_timestamp()),
   ($3,$2,'Incomplete draft',NULL,'fixed',NULL,'EUR','draft',NULL)`,[optional,a.ownerIdentity,draft]);
  const optionalParent={...p,service_id:optional};await publish(await edit(optionalParent,'Only title changed'));
  const preserved=await ownerRead(optionalParent);assert.equal(preserved.content.category,null);assert.equal(preserved.content.priceType,'fixed');assert.equal(preserved.content.priceAmount,null);
  await denied(()=>edit({...p,service_id:draft},'Draft must be complete to publish'),'22023');
  await denied(()=>prepare(content({category:null}),[]),'22023');
  await denied(()=>prepare(content({priceType:'fixed',priceAmount:null}),[]),'22023');
  await denied(()=>prepare({...preserved.content,title:'Changed currency without amount',currency:'USD'},[],
   {serviceId:optional,revision:preserved.edit_revision}),'22023');
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const b=await created(0,{identity:a.businessIdentity});
  const member={...b,actor_user_id:a.member};await publish(await edit(member,'Business member edit'));
  await db.query("UPDATE public.business_members SET status='inactive' WHERE user_id=$1",[a.member]);
  await denied(()=>ownerRead(member),'42501');assert.equal((await detail(b.service_id)).title,'Business member edit');
 }else if(name==='managed_media_cleanup_and_binding'){
  const p=await prepare(content(),[{...newImage(),isPrimary:false},newImage()]);
  await denied(()=>publish(p),'55000');assert.equal(await events(),0);assert.equal((await ownerRead(p)).images.length,0);
  const first=await readyImage(p,0),second=await readyImage(p,1);await publish(p);
  const s=await ownerRead(p);assert.deepEqual(s.images.map(x=>x.is_primary),[false,true]);assert.deepEqual(s.images.map(x=>x.sort_order),[0,1]);
  assert.deepEqual((await detail(p.service_id)).images.map(x=>x.url),[1,0].map(n=>'/api/v2/service-media/'+p.attempt_id+'/'+n));
  assert.equal((await service('get_public_service_media_binding_v1',[p.attempt_id,0])).object_path,first.web.object_path);
  assert.equal(await call(a.peer,'get_my_service_media_binding_v1',[a.peer,a.peerIdentity,p.attempt_id,0]),null);
  await active(p,'archived');assert.equal(await service('get_public_service_media_binding_v1',[p.attempt_id,0]),null);
  assert(await call(a.owner,'get_my_service_media_binding_v1',[a.owner,a.ownerIdentity,p.attempt_id,0]));await active(p,'published');
  const pending=await scalar('SELECT listing_publication_private.pending_upload_reserved_bytes_v1($1)::int value',[a.owner]);
  assert.equal(pending,2*26214400,'published WEB objects are excluded from unfinished upload budget');
  for(const item of [first,second]){
   const work=await service('claim_listing_account_source_cleanup_v1',[a.owner,a.ownerIdentity]);assert(work);assert.match(work.object_path,/source\.upload$/);
   await denied(()=>service('record_listing_account_source_cleanup_v1',[a.owner,a.ownerIdentity,work.object_id,work.work_key,'deleted']),'55000');
   await db.query('DELETE FROM storage.objects WHERE bucket_id=$1 AND name=$2',[work.bucket_id,work.object_path]);
   await service('record_listing_account_source_cleanup_v1',[a.owner,a.ownerIdentity,work.object_id,work.work_key,'deleted']);
  }
  assert.equal(await scalar('SELECT listing_publication_private.pending_upload_reserved_bytes_v1($1)::int value',[a.owner]),0);
  assert(await detail(p.service_id));
  const q=await edit(p,'Remove first photo',[{imageId:s.images[1].id,isPrimary:true}]);await publish(q);
  assert.equal(await service('get_public_service_media_binding_v1',[p.attempt_id,0]),null);
  assert(await service('get_public_service_media_binding_v1',[p.attempt_id,1]));
  const work=await service('claim_service_publication_cleanup_v1',context(q));assert.equal(work.object_id,first.web.id);
  await denied(()=>service('record_service_publication_cleanup_v1',[...context(q),work.object_id,work.work_key,'deleted']),'55000');
  await db.query('DELETE FROM storage.objects WHERE id=$1',[first.web.storageId]);
  await service('record_service_publication_cleanup_v1',[...context(q),work.object_id,work.work_key,'deleted']);
  assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[first.web.id]),true);
  assert.equal(await scalar('SELECT listing_publication_private.multipart_object_fully_deleted($1) value',[second.web.id]),false);
  assert.equal(await service('claim_service_publication_cleanup_v1',context(q)),null);
  const remains=await ownerRead(p);assert.equal(remains.images[0].id,s.images[1].id);assert(await detail(p.service_id));
 }else if(name==='domain_cancel_policy_and_public_search'){
  const p=await prepare(content(),[newImage()]),slot=p.slots[0];
  await denied(()=>service('reserve_listing_multipart_v2',[a.owner,a.ownerIdentity,p.attempt_id,slot.slot_id,key(),'source']),'22023');
  await denied(()=>call(a.owner,'get_my_service_publication_image_binding_v1',[a.owner,a.ownerIdentity,p.attempt_id,slot.slot_id,key()]),'42501');
  await denied(()=>call(a.owner,'publish_my_listing_v1',[a.owner,a.ownerIdentity,p.attempt_id,'f'.repeat(64)]),'55000');
  await denied(()=>call(a.owner,'publish_my_horse_offer_v1',context(p)),'42501');
  const cancelled=await cancel(p);assert.equal(cancelled.state,'cancelled');assert.deepEqual(await cancel(p),cancelled);
  await denied(()=>publish(p),'55000');assert.equal(await detail(p.service_id),null);
  const noAttempt=await call(a.owner,'cancel_my_service_publication_v1',[a.owner,a.ownerIdentity,null,key()]);assert.equal(noAttempt.state,'cancelled');
  const invalidPolicy=f.shownPolicies.map(x=>({...x,accepted:false}));
  await denied(()=>prepare(content(),[],{policies:invalidPolicy}),'22023');
  const badHash=f.shownPolicies.map(x=>({...x,contentHash:'f'.repeat(64)}));
  await denied(()=>prepare(content(),[],{policies:badHash}),'42501');
  const q=await created(),r=await created();
  const page=await anon('search_public_services_v1',['synthetic transport','transport_roadside',null,'estonia','rapla',1,0]);
  assert.equal(page.total_count,'2');assert.equal(page.items.length,1);assert.equal(page.has_more,true);assert.equal(page.next_offset,1);
  const page2=await anon('search_public_services_v1',['synthetic transport','transport_roadside',null,'estonia','rapla',1,1]);
  assert.notEqual(page.items[0].content_id,page2.items[0].content_id);assert.equal(page2.has_more,false);
  assert.equal((await anon('search_public_services_v1',['unknownword'])).total_count,'0');
  const privateFields=['actor_user_id','object_path','policy_snapshot','service_lat','service_lng','web_sha256','listing-publication-private'];
  for(const name of privateFields)assert(!JSON.stringify(page).includes(name));
  await db.query('UPDATE public.services SET title=$1 WHERE id=$2',['No publication event for this update',q.service_id]);
  assert.equal(await detail(q.service_id),null);assert.equal((await anon('search_public_services_v1')).total_count,'1');
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  assert.equal(await detail(r.service_id),null);
 }else if(name==='ordinary_horse_binary_regressions'){
  const input={basics:{title:'Synthetic ordinary service compatibility',description:'The established listing flow still works.',condition:'used'},
   price:{kind:'fixed',amount:'15.00',currency:'EUR'},category_path:['electronics','computers'],
   location:{country:'Estonia',city:'Paide',latitude:null,longitude:null},
   attributes:{manufacturer:'',part_number:'',oem_number:'',vehicle_brand:'',vehicle_model:'',vehicle_year:'',engine:''},details:{},language:'et'};
  const image=newImage(),p=await call(a.owner,'prepare_my_listing_publication_v1',[a.owner,a.ownerIdentity,key(),input,
   [{client_file_id:image.clientFileId,byte_length:image.byteLength,sha256:image.sha256}]]);
  await readyImage(p);const confirmation=await call(a.owner,'get_my_listing_publication_confirmation_v1',[a.owner,a.ownerIdentity,p.attempt_id]);
  const published=await call(a.owner,'publish_my_listing_v1',[a.owner,a.ownerIdentity,p.attempt_id,confirmation.confirmation.confirmation_sha256]);
  assert.equal(published.state,'published');
  const horseBase=await import('../../20261108_horse_confirmation_reuse/tests/fixture.mjs');
  const h=await horseBase.prepare(horseBase.content(),[newImage()]);await readyImage(h);await horseBase.publish(h);
  assert(await service('get_public_horse_media_binding_v1',[h.attempt_id,0]));
  assert.equal(await scalar('SELECT count(*)::int value FROM service_publication_private.commands'),0);
  for(let i=0;i<2;i++){
   const work=await service('claim_listing_account_source_cleanup_v1',[a.owner,a.ownerIdentity]);assert(work);
   await db.query('DELETE FROM storage.objects WHERE bucket_id=$1 AND name=$2',[work.bucket_id,work.object_path]);
   await service('record_listing_account_source_cleanup_v1',[a.owner,a.ownerIdentity,work.object_id,work.work_key,'deleted']);
  }
  assert.equal(await scalar('SELECT listing_publication_private.pending_upload_reserved_bytes_v1($1)::int value',[a.owner]),0);
 }else if(name==='contact_context_business_and_history'){
  const p=await created(),request=key(),args=[a.peer,a.peerIdentity,request,p.service_id];
  const c=await call(a.peer,'contact_my_service_provider_v1',args);assert.equal(c.replayed,false);
  assert.deepEqual(await call(a.peer,'contact_my_service_provider_v1',args),{...c,replayed:true});
  await denied(()=>call(a.owner,'contact_my_service_provider_v1',[a.owner,a.ownerIdentity,key(),p.service_id]),'42501');
  const send=text=>call(a.peer,'send_my_message_v2',[a.peer,a.peerIdentity,key(),c.conversation_id,text,null,null]);
  const thread=()=>call(a.peer,'get_my_marketplace_message_thread_v1',[a.peer,a.peerIdentity,c.conversation_id,null,null]);
  const m1=await send('Service question');let t=await thread();assert.equal(t.listing.content_type,'service');
  const card=t.messages.find(x=>x.id===m1.message_id).listing;assert.equal(card.id,p.service_id);
  const horseBase=await import('../../20261108_horse_confirmation_reuse/tests/fixture.mjs');
  const hp=await horseBase.prepare(horseBase.content(),[]);await horseBase.publish(hp);
  const hc=await call(a.peer,'contact_my_horse_seller_v1',[a.peer,a.peerIdentity,key(),hp.horse_offer_id]);assert.equal(hc.conversation_id,c.conversation_id);
  const m2=await send('Horse question');t=await thread();assert.equal(t.listing.content_type,'horse_offer');
  assert.equal(t.messages.find(x=>x.id===m2.message_id).listing.id,hp.horse_offer_id);assert.deepEqual(t.messages.find(x=>x.id===m1.message_id).listing,card);
  assert.equal(await scalar('SELECT count(*)::int value FROM service_publication_private.thread_context'),0);
  await call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,key(),p.service_id]);
  const m3=await send('Back to service');t=await thread();assert.equal(t.listing.content_type,'service');
  assert.equal(t.messages.find(x=>x.id===m3.message_id).listing.id,p.service_id);
  assert.equal(t.messages.find(x=>x.id===m2.message_id).listing.content_type,'horse_offer');
  assert.equal(await scalar('SELECT count(*)::int value FROM horse_publication_private.thread_context'),0);
  await publish(await edit(p,'Service title changed later'));assert.deepEqual((await thread()).messages.find(x=>x.id===m1.message_id).listing,card);
  await call(a.owner,'set_my_thread_block_v2',[a.owner,a.ownerIdentity,c.conversation_id,true]);
  await denied(()=>call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,key(),p.service_id]),'42501');
  await call(a.owner,'set_my_thread_block_v2',[a.owner,a.ownerIdentity,c.conversation_id,false]);
  await active(p,'archived');await denied(()=>call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,key(),p.service_id]),'42501');
  await setIdentity(a.owner,a.businessIdentity);await setIdentity(a.member,a.businessIdentity);
  const b=await created(0,{user:a.member,identity:a.businessIdentity});
  const bc=await call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,key(),b.service_id]);
  assert.equal(await scalar('SELECT seller_id::text value FROM public.conversations WHERE id=$1',[bc.conversation_id]),a.owner,
   'business recipient is the canonical owner, not publishing member');
  await db.query("UPDATE public.business_members SET status='inactive' WHERE business_account_id=$1 AND user_id=$2",[a.business,a.owner]);
  await denied(()=>call(a.peer,'contact_my_service_provider_v1',[a.peer,a.peerIdentity,key(),b.service_id]),'42501');
 }else throw Error('Unknown service test case '+name);
 console.log(JSON.stringify({case:name,passed:true,provider_io:false,native_concurrency:false}));
}catch(e){console.error(JSON.stringify({case:name,passed:false,message:e.message,code:e.code,detail:e.detail,where:e.where,stack:e.stack?.split('\n').slice(0,4)}));process.exitCode=1;}
finally{await db.close();}
