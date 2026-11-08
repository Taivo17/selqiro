'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,filename);
const S=require('../src/entities/service/model/publicService.ts');
const F=require('../src/features/service-editor/model/serviceEditorForm.ts');
const M=require('../src/entities/conversation/model/messagingParsers.ts');
const P=require('../src/entities/profile/model/publicProfileOfferingsV1.ts');
const ID='a1000000-0000-4000-8000-000000000001',ATTEMPT='b1000000-0000-4000-8000-000000000001';
const IMAGE='c1000000-0000-4000-8000-000000000001',USER='d1000000-0000-4000-8000-000000000001';
const OWN='e1000000-0000-4000-8000-000000000001',PEER='f1000000-0000-4000-8000-000000000001';
const stamp='2026-11-08T12:00:00.000001+00:00',url=`/api/v2/service-media/${ATTEMPT}/0`;
const wire=(patch={})=>({schema_version:1,content_type:'service',content_id:ID,identity_id:OWN,title:'Repair service',description:'Seller-written service.',category:'vehicle_machinery',subcategory:null,
 price_type:'fixed',price_amount:'25.50',currency:'EUR',country:'Estonia',city:'Paide',location_label:'Within 30 km',images:[{id:IMAGE,url}],seller_name:'Seller',seller_slug:'seller',seller_type:'private',published_at:stamp,updated_at:stamp,...patch});
const page=(items,patch={})=>({schema_version:1,items,total_count:String(items.length),result_limit:24,result_offset:0,has_more:false,next_offset:null,...patch});
const command={expectedUserId:USER,expectedIdentityId:OWN,conversationId:'19',beforeMessageId:null,attachmentListingId:null};
const thread=()=>({schema_version:2,actor_user_id:USER,identity_id:OWN,conversation_id:'19',actor:{identity_id:OWN,name:'Me',avatar_url:null},peer:{identity_id:PEER,name:'Provider',avatar_url:null},can_send:true,blocked_by_me:false,
 listing:{id:ID,title:'Repair service',content_type:'service'},messages:[{id:'31',mine:false,text:'Hello',text_truncated:false,created_at:stamp,listing:{id:ID,title:'Repair service',image:url,price:'25.50 EUR',content_type:'service'},image:null}],next_before_message_id:null,attachment_listing_id:null,attachment_listing:null});
const clone=value=>JSON.parse(JSON.stringify(value));

test('public service read binds canonical UUID, identity and managed media without owner fields',()=>{
 const result=S.parsePublicService(wire(),ID);assert.equal(result.id,ID);assert.equal(result.images[0].url,url);assert.equal(result.identityId,OWN);assert.equal(result.priceAmount,'25.50');assert.equal(S.parsePublicService(null,ID),null);
 for(const patch of [{content_id:IMAGE},{content_type:'horse_offer'},{owner_token:'private'},{images:[{id:IMAGE,url:url+'?token=private'}]},
  {images:[{id:IMAGE,url:`/api/v2/service-owner-media/${ATTEMPT}/0`}]},{images:[{id:IMAGE,url:'https://tracker.invalid/photo'}]},{images:[{id:IMAGE,url},{id:IMAGE,url}]},{price_amount:25.5},{seller_slug:'../owner'}])assert.throws(()=>S.parsePublicService(wire(patch),ID));
 let called=false;const hostile=wire();Object.defineProperty(hostile,'content_type',{enumerable:true,get(){called=true;return'service';}});assert.throws(()=>S.parsePublicService(hostile));assert.equal(called,false);
});
test('service image boundary allows only exact public route and same-project historical bucket',()=>{
 const prior=process.env.NEXT_PUBLIC_SUPABASE_URL;process.env.NEXT_PUBLIC_SUPABASE_URL='https://abcdefghijklmnopqrst.supabase.co';
 try{const legacy='https://abcdefghijklmnopqrst.supabase.co/storage/v1/object/public/service-images/owner/service/photo.webp';assert.equal(S.serviceMediaUrl(legacy),legacy);assert.equal(S.serviceMediaUrl(url),url);
  for(const value of [url.replace('/0','/10'),url+'#fragment',url.replace('service-media','service-owner-media'),legacy+'?token=x',legacy.replace('abcdefghijklmnopqrst','other'),legacy.replace('service-images','listing-publication-private'),'//example.invalid/image',url.replace(ATTEMPT,'00000000-0000-0000-0000-000000000000')])assert.equal(S.serviceMediaUrl(value),null);
 }finally{if(prior===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=prior;}
});
test('authoritative service pagination rejects duplicate IDs, wrong offsets and inconsistent totals',()=>{
 assert.equal(S.parsePublicServicePage(page([wire()]),0,24).totalCount,'1');
 const full=Array.from({length:24},(_,i)=>wire({content_id:`a1000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`}));
 const parsed=S.parsePublicServicePage(page(full,{total_count:'325',has_more:true,next_offset:24}),0,24);assert.equal(parsed.nextOffset,24);assert.equal(parsed.items.length,24);
 for(const bad of [page([wire(),wire()]),page([wire()],{total_count:'2'}),page([],{has_more:true,next_offset:24,total_count:'40'}),page([wire()],{result_offset:24}),page([],{total_count:'9'.repeat(40)})])assert.throws(()=>S.parsePublicServicePage(bad,0,24));
});
test('all four pricing modes and legacy absent amounts retain their EN/ET meaning',()=>{
 for(const price_type of ['fixed','from','hourly','contact']){
  const service=S.parsePublicService(wire({price_type,price_amount:price_type==='contact'?null:'25.50'}));
  for(const language of ['en','et']){const label=S.servicePriceLabel(service,language);assert.ok(label.length>0);if(price_type==='hourly')assert.ok(label.endsWith('/ h'));}
 }
 assert.match(S.servicePriceLabel(S.parsePublicService(wire({price_type:'from'})),'en'),/^From /);
 assert.match(S.servicePriceLabel(S.parsePublicService(wire({price_type:'from'})),'et'),/^Alates /);
 for(const price_type of ['fixed','from','hourly']){const legacy=S.parsePublicService(wire({category:null,subcategory:null,price_type,price_amount:null}));assert.equal(legacy.priceAmount,null);assert.equal(S.servicePriceLabel(legacy,'et'),'Hind kokkuleppel');}
});
test('unchanged legacy null category and price are preserved only for an existing published or paused service',()=>{
 for(const status of ['published','archived'])for(const priceType of ['fixed','from','hourly']){
  const service={id:ID,status,title:'Saved title',description:'Saved description',category:null,subcategory:null,priceType,priceAmount:null,currency:'EUR',country:'Estonia',city:null,location:null};
  const form={...F.serviceEditorForm(service),title:'Text correction'};const content=F.buildServiceContent(form,ID,service);assert.equal(content.category,null);assert.equal(content.priceAmount,null);assert.equal(content.priceType,priceType);
  assert.throws(()=>F.buildServiceContent({...form,priceType:priceType==='hourly'?'fixed':'hourly'},ID,service));
  assert.throws(()=>F.buildServiceContent({...form,currency:'USD'},ID,service));assert.throws(()=>F.buildServiceContent(form,ID,{...service,status:'draft'}));assert.throws(()=>F.buildServiceContent(form));
  const noLocation={...service,country:null,city:null,location:null};const unchangedLocation=F.buildServiceContent({...F.serviceEditorForm(noLocation),title:'Title correction'},ID,noLocation);
  assert.equal(unchangedLocation.country,null);assert.equal(unchangedLocation.city,null);assert.equal(unchangedLocation.location,null);
  const corrected=F.buildServiceContent({...form,category:'vehicle_machinery',priceAmount:'29,50'},ID,service);assert.equal(corrected.priceAmount,29.5);
 }
 const existing={id:ID,status:'published',title:'Saved',description:'',category:'retired_root',subcategory:'retired_child',priceType:'contact',priceAmount:null,currency:'EUR'};
 const content=F.buildServiceContent({...F.serviceEditorForm(existing),description:'Only text'},ID,existing);assert.equal(content.category,'retired_root');assert.equal(content.subcategory,'retired_child');
});
test('service conversation header/card retain explicit UUID routing and reject implicit numeric coercion',()=>{
 const parsed=M.parseMessageThread(thread(),command);assert.equal(parsed.listing.content_type,'service');assert.equal(parsed.messages[0].listing.id,ID);assert.equal(parsed.messages[0].listing.image,url);
 for(const mutate of [v=>{delete v.listing.content_type},v=>{v.listing.id='201'},v=>{v.messages[0].listing.content_type='listing'},v=>{v.messages[0].listing.image=`/api/v2/service-owner-media/${ATTEMPT}/0`},v=>{v.messages[0].listing.content_type='horse_offer'}]){const bad=thread();mutate(bad);assert.throws(()=>M.parseMessageThread(bad,command));}
 const mixed=thread();mixed.messages.push({...clone(mixed.messages[0]),id:'32',listing:{id:'9007199254740993',title:'Ordinary',image:null,price:null}});mixed.messages.push({...clone(mixed.messages[0]),id:'33',listing:{id:IMAGE,title:'Horse',content_type:'horse_offer',image:`/api/v2/horse-media/${ATTEMPT}/0`,price:null}});
 assert.equal(M.parseMessageThread(mixed,command).messages.length,3);
 let called=false;const hostile=thread();Object.defineProperty(hostile.listing,'content_type',{enumerable:true,get(){called=true;return'service';}});assert.throws(()=>M.parseMessageThread(hostile,command));assert.equal(called,false);
});
test('existing public profile service contract accepts new managed media while excluding owner routes',()=>{
 const request={identityId:OWN,sellerSlug:'seller',limit:80};
 const image={id:IMAGE,identity_id:OWN,service_id:ID,original_url:url,medium_url:url,thumb_url:url,sort_order:0,is_primary:true,created_at:stamp};
 const row={id:ID,identity_id:OWN,title:'Repair service',description:'Description',category:'vehicle_machinery',subcategory:null,image_url:url,price_amount:'25.50',currency:'EUR',price_type:'fixed',country:'Estonia',city:'Paide',location:null,status:'published',sort_order:0,published_at:stamp,created_at:stamp,updated_at:stamp,images:[image]};
 const envelope={schema_version:1,content_scope:'public_profile_services',seller_slug:'seller',identity_id:OWN,profile_available:true,result_limit:80,read_at:stamp,items:[row]};
 assert.equal(P.parsePublicProfileServicesV1(envelope,request)[0].images[0].mediumUrl,url);
 for(const source of [`/api/v2/service-owner-media/${ATTEMPT}/0`,url+'?secret=1',url.replace('/0','/12')]){const bad=clone(envelope);bad.items[0].images[0].original_url=source;assert.throws(()=>P.parsePublicProfileServicesV1(bad,request));}
});
