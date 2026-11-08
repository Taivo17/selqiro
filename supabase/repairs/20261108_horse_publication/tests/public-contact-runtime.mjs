// Focused new integration scenarios against real SQL. Retained helpers are
// declarations, not reruns of historical suites. Provider metadata is synthetic.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {db,actors as a,asActor,asRole,call,prepare,publish,content,newImage,readyImage,repair,
 denied,ownerRead,setIdentity,provenance} from './public-contact-fixture.mjs';
const checks=[],wire={public:[],contacts:[],threads:[]},started=new Date().toISOString();
const key=()=>crypto.randomUUID();
const scalar=async(sql,args=[])=>(await db.query(sql,args)).rows[0].value;
const anon=async(name,args)=>(await asRole('anon','SELECT public.'+name+'('+args.map((_,i)=>'$'+(i+1)).join(',')+') value',args)).rows[0].value;
const detail=id=>anon('get_public_horse_offer_v1',[id]);
const search=(overrides={})=>anon('search_public_marketplace_v1',[
 overrides.q??'',overrides.category??null,overrides.subcategory??null,overrides.detail??null,overrides.condition??null,
 overrides.location??'',overrides.limit??24,overrides.offset??0,overrides.identity??null]);
const contact=(offer,request=key(),user=a.peer,identity=a.peerIdentity)=>call(user,'contact_my_horse_seller_v1',[user,identity,request,offer]);
const send=(cid,text,request=key(),listing=null,user=a.peer,identity=a.peerIdentity)=>
 call(user,'send_my_message_v2',[user,identity,request,cid,text,listing,null]);
const thread=(cid,user=a.peer,identity=a.peerIdentity)=>
 call(user,'get_my_marketplace_message_thread_v1',[user,identity,cid,null,null]);
async function check(name,operation){
 await operation();checks.push({name,passed:true});
}
function safeProjection(value){
 const text=JSON.stringify(value);
 for(const field of ['horse_lat','horse_lng','location_text','actor_user_id','identity_id','created_by_user_id',
  'policy_snapshot','confirmation_snapshot','source_sha256','web_sha256','object_path','listing-publication-private'])
  assert(!text.includes('"'+field+'"')&&!text.includes('listing-publication-private'),'private projection: '+field);
}
async function ordinary(){
 const input={basics:{title:'Synthetic shared marketplace laptop',description:'A retained ordinary listing.',condition:'used'},
  price:{kind:'fixed',amount:'15.00',currency:'EUR'},category_path:['electronics','computers'],
  location:{country:'Estonia',city:'Paide',latitude:null,longitude:null},
  attributes:{manufacturer:'',part_number:'',oem_number:'',vehicle_brand:'',vehicle_model:'',vehicle_year:'',engine:''},details:{},language:'et'};
 const image=newImage(),p=await call(a.owner,'prepare_my_listing_publication_v1',[a.owner,a.ownerIdentity,key(),input,
  [{client_file_id:image.clientFileId,byte_length:image.byteLength,sha256:image.sha256}]]);
 await readyImage(p);
 const confirmation=await call(a.owner,'get_my_listing_publication_confirmation_v1',[a.owner,a.ownerIdentity,p.attempt_id]);
 return call(a.owner,'publish_my_listing_v1',[a.owner,a.ownerIdentity,p.attempt_id,confirmation.confirmation.confirmation_sha256]);
}
try{
 const published=new Map();
 await check('five_offer_types_publish_real_gallery_and_public_price_models',async()=>{
  for(const type of ['sale','free_transfer','lease','co_rider','wanted']){
   const values=type==='wanted'?{wantedBudgetMode:'maximum',wantedBudgetAmount:12500,wantedPreferredBreed:'Tori',wantedCity:'Tartu'}:
    {city:'Paide',region:'Järvamaa',horseName:'Synthetic Aster',breed:'Tori',
     ...(type==='sale'?{priceType:'fixed',priceAmount:4200}:{}),
     ...(['lease','co_rider'].includes(type)?{priceType:'from',priceAmount:120,recurringFeePeriod:'month'}:{})};
   const images=type==='sale'?[{...newImage(),isPrimary:false},newImage()]:[newImage()];
   const p=await prepare(content(type,values),images);
   for(let n=0;n<p.slots.length;n++)await readyImage(p,n);
   const result=await publish(p),visible=await detail(p.horse_offer_id);assert(visible);
   assert.equal(visible.content_type,'horse_offer');assert.equal(visible.content_id,p.horse_offer_id);
   assert.equal(visible.offer_type,type);assert.equal(visible.images.length,images.length);
   const expected=type==='sale'?[1,0]:[0];
   assert.deepEqual(visible.images.map(x=>x.url),expected.map(n=>'/api/v2/horse-media/'+p.attempt_id+'/'+n));
   assert.equal(visible.price.currency,'EUR');
   if(type==='sale'){assert.equal(visible.price.kind,'fixed');assert.equal(Number(visible.price.amount),4200);}
   if(type==='free_transfer'){assert.equal(visible.price.kind,'free');assert.equal(visible.price.amount,null);}
   if(['lease','co_rider'].includes(type)){assert.equal(visible.price.kind,'from');assert.equal(visible.price.period,'month');assert.equal(Number(visible.price.amount),120);}
   if(type==='wanted'){assert.equal(visible.price.kind,'budget');assert.equal(Number(visible.price.amount),12500);assert.equal(visible.city,'Tartu');assert.equal(visible.fields.preferred_breed,'Tori');}
   safeProjection(visible);wire.public.push(visible);published.set(type,{p,result,visible,values});
  }
  assert.equal(await scalar('SELECT count(*)::int value FROM public.listings'),0,'horses create no shadow ordinary rows');
 });
 let listing;
 await check('ordinary_publication_and_shared_media_pipeline_still_publish',async()=>{
  listing=await ordinary();assert.equal(listing.state,'published');assert.match(listing.listing_id,/^[1-9][0-9]*$/);
 });
 await check('marketplace_union_filters_counts_and_paginates_once',async()=>{
  const all=await search();assert.equal(all.total_count,'6');assert.equal(all.items.length,6);
  assert.equal(all.items.filter(x=>x.content_type==='horse_offer').length,5);
  assert.equal(all.items.filter(x=>x.content_type==='listing').length,1);
  for(const item of all.items)safeProjection(item);
  const seen=[];
  for(let offset=0;offset<6;offset+=2){const page=await search({limit:2,offset});assert.equal(page.total_count,'6');
   assert.equal(page.items.length,2);seen.push(...page.items.map(x=>x.content_type+':'+x.content_id));
   assert.equal(page.has_more,offset<4);assert.equal(page.next_offset,offset<4?offset+2:null);}
  assert.equal(new Set(seen).size,6);
  assert.equal((await search({category:'horses'})).total_count,'5');
  for(const type of published.keys()){
   const page=await search({category:'horses',subcategory:type});assert.equal(page.total_count,'1');assert.equal(page.items[0].offer_type,type);
  }
  assert.equal((await search({q:'Tori'})).total_count,'5');
  assert.equal((await search({location:'Tartu'})).items[0].offer_type,'wanted');
  assert.equal((await search({category:'electronics',subcategory:'computers',condition:'used'})).total_count,'1');
  assert.equal((await search({category:'horses',condition:'used'})).total_count,'0');
  assert.equal((await search({identity:a.peerIdentity})).total_count,'0');
  assert.equal((await search({identity:a.ownerIdentity})).total_count,'6');
  await denied(()=>search({category:'horses',subcategory:'unsupported'}),'22023');
  await denied(()=>search({category:'horses',subcategory:'sale',detail:'private'}),'22023');
  await denied(()=>search({offset:-1}),'22023');
 });
 const sale=published.get('sale'),lease=published.get('lease');let contacted,horseMessage,horseMessageKey=key(),initialCard;
 await check('horse_contact_reuses_real_chat_send_and_typed_thread_cards',async()=>{
  const request=key();contacted=await contact(sale.result.horse_offer_id,request);wire.contacts.push(contacted);
  assert.equal(contacted.horse_offer_id,sale.result.horse_offer_id);assert.equal(contacted.replayed,false);
  assert.deepEqual(await contact(sale.result.horse_offer_id,request),{...contacted,replayed:true});
  await denied(()=>contact(lease.result.horse_offer_id,request),'22023');
  horseMessage=await send(contacted.conversation_id,'Is this horse still available?',horseMessageKey);
  assert.equal(horseMessage.schema_version,2);
  const current=await thread(contacted.conversation_id);wire.threads.push(current);
  assert.deepEqual(current.listing,{id:sale.result.horse_offer_id,title:sale.visible.title,content_type:'horse_offer'});
  initialCard=current.messages.find(x=>x.id===horseMessage.message_id).listing;
  assert.equal(initialCard.content_type,'horse_offer');assert.equal(initialCard.id,sale.result.horse_offer_id);
  assert.equal(initialCard.image,sale.visible.images[0].url);assert.equal(current.messages[0].text,'Is this horse still available?');
  const unchanged=await call(a.peer,'get_my_message_thread_v2',[a.peer,a.peerIdentity,contacted.conversation_id,null,null]);
  assert.equal(unchanged.listing,null);assert.equal(unchanged.messages[0].listing,null);
 });
 await check('ordinary_context_in_same_channel_preserves_horse_message_snapshot',async()=>{
  const result=await call(a.peer,'contact_my_listing_seller_v1',[a.peer,a.peerIdentity,key(),listing.listing_id]);
  assert.equal(result.conversation_id,contacted.conversation_id);
  const message=await send(result.conversation_id,'And the ordinary laptop?',key(),listing.listing_id);
  const current=await thread(result.conversation_id);wire.threads.push(current);
  assert.equal(current.listing.id,listing.listing_id);assert.equal(current.messages.find(x=>x.id===message.message_id).listing.id,listing.listing_id);
  assert.deepEqual(current.messages.find(x=>x.id===horseMessage.message_id).listing,initialCard);
  assert.equal(await scalar('SELECT count(*)::int value FROM public.conversations'),1);
  const back=await contact(lease.result.horse_offer_id);assert.equal(back.conversation_id,result.conversation_id);
  const third=await send(back.conversation_id,'Lease details, please.');
  const switched=await thread(back.conversation_id);assert.equal(switched.listing.id,lease.result.horse_offer_id);
  assert.equal(switched.messages.find(x=>x.id===third.message_id).listing.id,lease.result.horse_offer_id);
  assert.deepEqual(switched.messages.find(x=>x.id===horseMessage.message_id).listing,initialCard);
  assert.equal((await send(back.conversation_id,'Is this horse still available?',horseMessageKey)).replayed,true);
  const owner=await ownerRead(sale.p);
  await publish(await prepare(content('sale',{...sale.values,offerId:sale.p.horse_offer_id,title:'Edited horse title'}),
   owner.images.map(x=>({imageId:x.id,isPrimary:x.is_primary})),{offerId:sale.p.horse_offer_id,revision:sale.result.edit_revision}));
  assert.equal((await detail(sale.p.horse_offer_id)).title,'Edited horse title');
  assert.deepEqual((await thread(back.conversation_id)).messages.find(x=>x.id===horseMessage.message_id).listing,initialCard);
 });
 await check('contact_and_thread_reject_own_unauthorized_and_stale_identity_access',async()=>{
  await denied(()=>contact(sale.p.horse_offer_id,key(),a.owner,a.ownerIdentity),'42501');
  await denied(()=>thread(contacted.conversation_id,a.member,a.memberIdentity),'42501');
  await denied(()=>anon('contact_my_horse_seller_v1',[a.peer,a.peerIdentity,key(),sale.p.horse_offer_id]),'42501');
  await denied(()=>asActor(a.peer,'SELECT * FROM horse_publication_private.message_cards'),'42501');
  await setIdentity(a.owner,a.otherIdentity);
  try{await denied(()=>thread(contacted.conversation_id,a.owner,a.ownerIdentity),'42501');}
  finally{await setIdentity(a.owner,a.ownerIdentity);}
 });
 await check('bilateral_blocks_hide_public_results_and_block_new_contact_send',async()=>{
  const cid=contacted.conversation_id;
  await call(a.owner,'set_my_thread_block_v2',[a.owner,a.ownerIdentity,cid,true]);
  try{
   assert.equal(await call(a.peer,'get_public_horse_offer_v1',[sale.p.horse_offer_id]),null);
   const result=await call(a.peer,'search_public_marketplace_v1',['',null,null,null,null,'',24,0,null]);assert.equal(result.total_count,'0');
   await denied(()=>contact(sale.p.horse_offer_id),'42501');
   await denied(()=>send(cid,'blocked new message'),'42501');
   const retained=await thread(cid);assert.equal(retained.can_send,false);
   assert.deepEqual(retained.messages.find(x=>x.id===horseMessage.message_id).listing,initialCard);
   assert(await detail(sale.p.horse_offer_id),'anonymous reads do not impersonate blocked account');
  }finally{await call(a.owner,'set_my_thread_block_v2',[a.owner,a.ownerIdentity,cid,false]);}
  assert.equal((await thread(cid)).can_send,true);
  await call(a.peer,'set_my_thread_block_v2',[a.peer,a.peerIdentity,cid,true]);
  try{await denied(()=>contact(sale.p.horse_offer_id),'42501');}
  finally{await call(a.peer,'set_my_thread_block_v2',[a.peer,a.peerIdentity,cid,false]);}
 });
 await check('stale_event_expiry_and_inactive_identity_never_leak_public_horse',async()=>{
  const id=lease.p.horse_offer_id;
  // Simulate a retained owner/admin content write without its matching new event.
  const original=await scalar('SELECT title value FROM public.horse_offers WHERE id=$1',[id]);
  await db.query('UPDATE public.horse_offers SET title=$2 WHERE id=$1',[id,'Uncommitted to a publication event']);
  try{assert.equal(await detail(id),null);assert.equal((await search({category:'horses',subcategory:'lease'})).total_count,'0');await denied(()=>contact(id),'42501');}
  finally{await db.query('UPDATE public.horse_offers SET title=$2 WHERE id=$1',[id,original]);}
  assert(await detail(id));
  const expiry=await scalar('SELECT active_until value FROM public.horse_offers WHERE id=$1',[id]);
  await db.query("UPDATE public.horse_offers SET active_until=statement_timestamp()-interval '1 second' WHERE id=$1",[id]);
  try{assert.equal(await detail(id),null);await denied(()=>contact(id),'42501');}
  finally{await db.query('UPDATE public.horse_offers SET active_until=$2 WHERE id=$1',[id,expiry]);}
  await db.query("UPDATE public.identities SET status='suspended' WHERE id=$1",[a.ownerIdentity]);
  try{assert.equal(await detail(id),null);assert.equal((await search()).total_count,'0');await denied(()=>contact(id),'42501');}
  finally{await db.query("UPDATE public.identities SET status='active' WHERE id=$1",[a.ownerIdentity]);}
 });
 const modules=Object.fromEntries(fs.readdirSync(repair).filter(x=>/^0[1-7].*\.sql$/.test(x)).sort().map(x=>
  [x,crypto.createHash('sha256').update(fs.readFileSync(path.join(repair,x))).digest('hex')]));
 const result={schema_version:1,suite:'horse-public-contact-sql',started_at_utc:started,completed_at_utc:new Date().toISOString(),
  passed:true,checks,modules,source_provenance:provenance,postgres:await scalar('SELECT version() value'),
  limitations:['Isolated PostgreSQL/WASM, non-superuser installer and actual retained SQL ACLs.',
   'Synthetic identities and provider metadata; no live Storage, remote database or browser calls.',
   'No native concurrent-session scheduling or production deployment is claimed.']};
 fs.writeFileSync(path.join(repair,'public-contact-runtime-result.json'),JSON.stringify(result,null,2)+'\n');
 fs.writeFileSync(path.join(repair,'tests/public-contact-wire.json'),JSON.stringify(wire,null,2)+'\n');
 console.log(JSON.stringify({suite:result.suite,passed:true,checks:checks.length}));
}catch(error){
 console.error(JSON.stringify({passed:false,completed:checks,code:error.code,message:error.message,where:error.where,
  detail:error.detail,position:error.position,stack:error.code?undefined:error.stack},null,2));process.exitCode=1;
}finally{await db.close();}
