'use strict';
// Actual read parsers, synthetic wire envelopes. SQL/Storage proofs are separate.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 fileName:filename,compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
}).outputText,filename);
const H=require('../src/entities/horse-offer/model/publicHorse.ts');
const M=require('../src/entities/listing/model/publicRead/publicMarketplace.ts');
const P=require('../src/entities/conversation/model/messagingParsers.ts');
const SEARCH=require('../src/entities/listing/model/publicSearch.ts');
const ID='a1000000-0000-0000-0000-000000000001',ATTEMPT='b1000000-0000-0000-0000-000000000001';
const IMAGE='c1000000-0000-0000-0000-000000000001',USER='d1000000-0000-0000-0000-000000000001';
const OWN='e1000000-0000-0000-0000-000000000001',PEER='f1000000-0000-0000-0000-000000000001';
const stamp='2026-11-08T12:00:00.000001+00:00',url='/api/v2/horse-media/'+ATTEMPT+'/0';
const price=(kind='fixed',amount='9500.00',period=null)=>({kind,amount,currency:'EUR',period});
const horse=(patch={})=>({schema_version:1,content_type:'horse_offer',content_id:ID,offer_type:'sale',title:'Test horse',
 description:'Seller-written detail.',price:price(),country:'EE',city:'Paide',region:'Järvamaa',fields:{breed:'Estonian'},
 images:[{id:IMAGE,url}],seller_name:'Seller',seller_slug:'seller',seller_type:'private',published_at:stamp,active_until:null,...patch});
const card=(type='horse_offer')=>({content_type:type,content_id:type==='listing'?'9007199254740993':ID,
 offer_type:type==='listing'?null:'sale',title:'Test horse',description_preview:'Public preview',
 price:type==='listing'?{version:1,kind:'fixed',amount:'9500',currency:'EUR',legacy_text:null,legacy_amount:null}:price(),
 category:type==='listing'?'vehicles':'horses',subcategory:type==='listing'?'cars':'sale',detail_category:null,condition:null,
 country:'EE',city:'Paide',image_url:type==='listing'?null:url,seller_name:'Seller',seller_slug:'seller',
 seller_avatar_url:null,seller_type:'private',created_at:stamp});
const page=items=>({schema_version:1,content_scope:'marketplace',sort:'newest',items,total_count:String(items.length),
 result_limit:24,result_offset:0,has_more:false,next_offset:null,window_limit_reached:false});
const actor={expectedUserId:USER,expectedIdentityId:OWN,conversationId:'19',beforeMessageId:null,attachmentListingId:null};
const thread=(patch={})=>({schema_version:2,actor_user_id:USER,identity_id:OWN,conversation_id:'19',
 actor:{identity_id:OWN,name:'Me',avatar_url:null},peer:{identity_id:PEER,name:'Seller',avatar_url:null},
 can_send:true,blocked_by_me:false,listing:{id:ID,title:'Horse',content_type:'horse_offer'},
 messages:[{id:'31',mine:false,text:'Hello',text_truncated:false,created_at:stamp,
  listing:{id:ID,title:'Horse',image:url,price:null,content_type:'horse_offer'},image:null}],
 next_before_message_id:null,attachment_listing_id:null,attachment_listing:null,...patch});

test('canonical public horse retains only the declared public fields and exact image references',()=>{
 const result=H.parsePublicHorse(horse(),ID);assert.equal(result.id,ID);assert.equal(result.images[0].url,url);
 assert.equal(result.price.amount,'9500.00');assert.equal(result.fields.breed,'Estonian');
 assert.equal(H.parsePublicHorse(null,ID),null);
 for(const patch of [{content_id:IMAGE},{content_type:'listing'},{country:'LV'},
  {fields:{...horse().fields,horseLat:'58.12'}},{location_text:'Private street'},
  {images:[{id:IMAGE,url:'https://tracker.invalid/image'}]},
  {images:[{id:IMAGE,url},{id:IMAGE,url}]},{price:price('fixed',9500)},
  {images:[{id:IMAGE,url:url+'?token=private'}]},{price:{...price(),currency:'USD'}}])
  assert.throws(()=>H.parsePublicHorse(horse(patch),ID));
});

test('all five horse categories have public types and correct EN/ET price semantics',()=>{
 for(const offer_type of H.HORSE_TYPES){
  const p=offer_type==='wanted'?price('budget','7500.50'):offer_type==='free_transfer'?price('free',null)
   :price('contact',null,['lease','co_rider'].includes(offer_type)?'month':null);
  const fields=offer_type==='wanted'?{preferred_breed:'Estonian'}:{breed:'Estonian'};
  assert.equal(H.parsePublicHorse(horse({offer_type,price:p,fields}),ID).offerType,offer_type);
  const parsed=SEARCH.parsePublicSearch(new URLSearchParams('category=horses&subcategory='+offer_type));
  assert.equal(parsed.error,null);assert.equal(parsed.input.subcategory,offer_type);
 }
 assert.equal(H.horsePriceDisplay(price('budget','7500.50'),'en').priceLabel,'Budget up to 7500.5 €');
 assert.equal(H.horsePriceDisplay(price('budget','7500.50'),'et').priceLabel,'Eelarve kuni 7500,5 €');
 assert.equal(H.horsePriceDisplay(price('free',null),'et').priceLabel,'Tasuta');
 assert.throws(()=>H.parsePublicHorse(horse({offer_type:'wanted'}),ID));
});

test('public detail and cards enforce horse branch prices and public field separation',()=>{
 const invalid=[['sale',price('free',null)],['sale',price('fixed','500','month')],
  ['free_transfer',price('fixed','500')],['free_transfer',price('free','0')],
  ['lease',price('fixed','500')],['co_rider',price('budget','500','month')],
  ['wanted',price('budget','500','month')],['wanted',price('contact','500')]];
 for(const [offer_type,p] of invalid){
  assert.throws(()=>H.parsePublicHorse(horse({offer_type,price:p,fields:{}}),ID));
  assert.throws(()=>M.parsePublicMarketplace(page([{...card(),offer_type,subcategory:offer_type,price:p}]),0));
 }
 assert.throws(()=>H.parsePublicHorse(horse({fields:{preferred_sex:'mare'}}),ID));
 assert.throws(()=>H.parsePublicHorse(horse({offer_type:'wanted',price:price('contact',null),fields:{horse_name:'Invented'}}),ID));
});

test('profile Show more retains earlier cards, deduplicates movement and fences identity/pages',()=>{
 const {appendPublicProfileHorsePage:append}=require('../src/features/public-profile/model/publicProfileHorsePages.ts');
 const one={...M.parsePublicMarketplace(page([card()]),0),hasMore:true,nextOffset:24};
 const first=append(null,OWN,one);
 const nextId='a1000000-0000-0000-0000-000000000002';
 const second={...one,offset:24,items:[one.items[0],{...one.items[0],id:nextId}],hasMore:false,nextOffset:null};
 const combined=append(first,OWN,second);
 assert.deepEqual(combined.items.map(item=>item.id),[ID,nextId]);
 assert.equal(append(combined,OWN,second),combined);
 assert.throws(()=>append(first,PEER,second));
 assert.throws(()=>append(first,OWN,{...second,offset:48}));
 assert.throws(()=>append(null,OWN,{...one,items:[{...one.items[0],contentType:'listing'}]}));
 assert.deepEqual(append(combined,PEER,one).items,one.items);
 assert.equal(append(combined,PEER,one).identityId,PEER);
});

test('one marketplace page preserves typed UUID and bigint IDs with authoritative pagination',()=>{
 const result=M.parsePublicMarketplace(page([card('listing'),card()]),0);
 assert.equal(result.items[0].id,'9007199254740993');assert.equal(result.items[0].contentType,'listing');
 assert.equal(result.items[1].id,ID);assert.equal(result.items[1].horsePrice.amount,'9500.00');
 assert.equal(result.totalCount,'2');
 for(const input of [page([card(),card()]),{...page([card()]),total_count:'2'},
  page([{...card(),content_id:'201'}]),page([{...card('listing'),content_id:ID}]),
  page([{...card(),content_type:'service'}]),page([{...card(),original_path:'private/source'}])])
  assert.throws(()=>M.parsePublicMarketplace(input,0));
});

test('horse chat cards coexist with numeric listing cards and never accept private media URLs',()=>{
 const input=thread(),parsed=P.parseMessageThread(input,actor);
 assert.equal(parsed.listing.content_type,'horse_offer');assert.equal(parsed.messages[0].listing.id,ID);
 const ordinary={id:'9007199254740993',title:'Car',image:null,price:'123 EUR'};
 const mixed=P.parseMessageThread(thread({listing:{id:'202',title:'Car'},messages:[input.messages[0],
  {...input.messages[0],id:'32',listing:ordinary}]}),actor);
 assert.equal(mixed.messages[0].listing.content_type,'horse_offer');assert.equal(mixed.messages[1].listing.id,ordinary.id);
 for(const listing of [{...input.messages[0].listing,id:'201'},
  {...input.messages[0].listing,image:'/api/v2/horse-owner-media/'+ATTEMPT+'/0'},
  {...input.messages[0].listing,image:'https://private.invalid/photo'}])
  assert.throws(()=>P.parseMessageThread(thread({messages:[{...input.messages[0],listing}]}),actor));
 let calls=0;const dangerous={...input.messages[0].listing};
 Object.defineProperty(dangerous,'content_type',{enumerable:true,get(){calls++;return 'horse_offer';}});
 assert.throws(()=>P.parseMessageThread(thread({messages:[{...input.messages[0],listing:dangerous}]}),actor));
 assert.equal(calls,0);
});
