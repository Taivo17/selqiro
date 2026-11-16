'use strict';
// Actual parsers/service dispatch and React SSR; Auth/RPC/SQL and browser layout
// are synthetic. Historical message cards are never rebuilt from the header.
const {test}=require('node:test'), assert=require('node:assert/strict');
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const {loader,language,U,I,J,P,project,jsonResponse}=require('./helpers/jobs-public-loader.cjs');
const load=loader(), parse=load('src/entities/conversation/model/messagingParsers.ts').parseMessageThread;
const commands=load('src/entities/conversation/model/messagingCommands.ts');
const subject=load('src/features/listing-conversation/model/conversationSubject.ts');
const command={expectedUserId:U,expectedIdentityId:I,conversationId:'9007199254740993',beforeMessageId:null,attachmentListingId:null};
const jobCard={content_type:'job',id:J,title:'Earlier job title',image:null,price:null};
const message=(id,mine,listing)=>({id,mine,text:mine?'My reply':'Their reply',text_truncated:false,
  created_at:'2026-11-16T10:00:00.000001Z',listing,image:null});
const thread=()=>({schema_version:2,actor_user_id:U,identity_id:I,actor:{identity_id:I,name:'My company',avatar_url:null},
  conversation_id:command.conversationId,peer:{identity_id:P,name:'Other person',avatar_url:null},can_send:true,blocked_by_me:false,
  listing:{id:J,title:'Current job title',content_type:'job'},
  messages:[message('101',false,{...jobCard}),message('102',true,{...jobCard})],
  next_before_message_id:null,attachment_listing_id:null,attachment_listing:null});

test('job header and per-message job snapshot parse independently within the existing schema-2 envelope',()=>{
  const result=parse(thread(),command);
  assert.equal(result.listing.title,'Current job title');assert.equal(result.messages[0].listing.title,'Earlier job title');
  assert.equal(result.messages[0].listing.image,null);assert.equal(result.messages[0].listing.price,null);
  assert.equal(result.messages[0].mine,false);assert.equal(result.messages[1].mine,true);
  assert.equal(subject.conversationOfferKind(result.listing),'job');
  assert.equal(subject.conversationSubjectHref(result.listing),'/v2/job/'+J);
  assert.ok(Object.isFrozen(result));assert.ok(Object.isFrozen(result.messages[0].listing));
});

test('mixed listing, horse, service and job history keeps typed routes and prior message-local content',()=>{
  const value=thread();
  value.messages=[message('101',false,{id:'9007199254740994',title:'Old bicycle',image:null,price:'20 EUR'}),
    message('102',true,{content_type:'horse_offer',id:J,title:'Old horse title',image:`/api/v2/horse-media/${J}/0`,price:'Ask'}),
    message('103',false,{content_type:'service',id:P,title:'Old service title',image:`/api/v2/service-media/${P}/0`,price:null}),
    message('104',true,{...jobCard})];
  const result=parse(value,command), expected=['/v2/listing/9007199254740994','/v2/horse-offer/'+J,'/v2/service/'+P,'/v2/job/'+J];
  result.messages.forEach((m,index)=>assert.equal(subject.conversationSubjectHref(m.listing),expected[index]));
  assert.deepEqual(result.messages.map(m=>m.listing.title),['Old bicycle','Old horse title','Old service title','Earlier job title']);
  const noHeader={...value,listing:null};assert.equal(parse(noHeader,command).messages[3].listing.content_type,'job');
});

test('job IDs, null image/price, exact keys, actor and conversation bindings fail closed',()=>{
  const mutations=[
    v=>v.listing.id='123',v=>v.listing.id=J+'?private=1',v=>v.listing.content_type='application',
    v=>v.messages[0].listing.image=project+'/storage/v1/object/public/avatars/logo.png',
    v=>v.messages[0].listing.price='3000 EUR/month',v=>v.messages[0].listing.salary='3000',
    v=>v.messages[0].listing.id='00000000-0000-0000-0000-000000000000',v=>v.messages[0].listing.content_type='unknown',
    v=>v.actor_user_id=P,v=>v.identity_id=P,v=>v.actor.identity_id=P,v=>v.conversation_id='123',
    v=>v.can_send=true&&(v.blocked_by_me=true),v=>v.messages[1].id=v.messages[0].id,
  ];
  for(const mutate of mutations) {const value=thread();mutate(value);assert.throws(()=>parse(value,command));}
  const value=thread();Object.defineProperty(value.messages[0].listing,'title',{enumerable:true,get(){assert.fail('getter must not run');}});
  assert.throws(()=>parse(value,command));
});

test('job UUIDs never enter the ordinary attachment-listing or send-listing field',()=>{
  assert.throws(()=>commands.copyGetMessageThread({...command,attachmentListingId:J}));
  const send={expectedUserId:U,expectedIdentityId:I,conversationId:command.conversationId,
    requestKey:J,message:'Hello',listingId:null,attachmentId:null};
  assert.equal(commands.copySendMessage(send).listingId,null);
  assert.throws(()=>commands.copySendMessage({...send,listingId:J}));
  assert.equal(commands.copyGetMessageThread({...command,attachmentListingId:'123'}).attachmentListingId,'123');
  const value=thread();value.attachment_listing_id='123';value.attachment_listing={...jobCard};
  assert.throws(()=>parse(value,{...command,attachmentListingId:'123'}));
});

test('thread service uses the new additive read RPC with the verified user token and unchanged five arguments',async()=>{
  const calls=[], token='synthetic-user-token';
  const service=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test-key'},async(url,init)=>{
    calls.push({url,init});return jsonResponse(url.endsWith('/auth/v1/user')?{id:U}:thread());
  });
  const result=await service.get(token,command);assert.equal(result.listing.content_type,'job');assert.equal(calls.length,2);
  assert.equal(calls[0].url,project+'/auth/v1/user');
  assert.equal(calls[1].url,project+'/rest/v1/rpc/get_my_marketplace_message_thread_v2');
  assert.deepEqual(JSON.parse(calls[1].init.body),{p_expected_user_id:U,p_expected_identity_id:I,p_conversation_id:command.conversationId,
    p_before_message_id:null,p_attachment_listing_id:null});
  for(const call of calls) {assert.equal(new Headers(call.init.headers).get('authorization'),'Bearer '+token);assert.equal(call.init.credentials,'omit');}
  let refusedCalls=0;const refused=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test-key'},async()=>{
    refusedCalls++;return jsonResponse({id:P});});
  await assert.rejects(refused.get(token,command),error=>error.code==='context_changed');assert.equal(refusedCalls,1);
});

test('job conversation replies keep the established send RPC and do not smuggle a subject UUID as a listing',async()=>{
  const send={expectedUserId:U,expectedIdentityId:I,conversationId:command.conversationId,
    requestKey:J,message:'Hello',listingId:null,attachmentId:null}, calls=[];
  const service=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test-key'},async(url,init)=>{
    calls.push({url,init});return jsonResponse(url.endsWith('/auth/v1/user')?{id:U}:{schema_version:2,actor_user_id:U,identity_id:I,
      conversation_id:command.conversationId,action:'send',request_key:J,message_id:'103',replayed:false});});
  const receipt=await service.send('synthetic-user-token',send);assert.equal(receipt.message_id,'103');
  assert.equal(calls[1].url,project+'/rest/v1/rpc/send_my_message_v2');
  assert.deepEqual(JSON.parse(calls[1].init.body),{p_expected_user_id:U,p_expected_identity_id:I,p_request_key:J,
    p_conversation_id:command.conversationId,p_message:'Hello',p_listing_id:null,p_attachment_id:null});
});

function ui(lang='en') {
  return loader({'src/shared/i18n/V2LanguageProvider.tsx':language(lang),
    'src/features/listing-conversation/components/ThreadActions.tsx':{__esModule:true,default:()=>null},
    'src/features/listing-conversation/components/MessageImage.tsx':{__esModule:true,default:()=>null}});
}
test('subject cards have text as well as color, correct links and no salary/photo placeholder for jobs',()=>{
  for(const [lang,jobLabel] of [['en','Job opportunity'],['et','Tööpakkumine']]) {
    const modules=ui(lang), Card=modules('src/features/listing-conversation/components/ConversationListingCard.tsx').default;
    const html=renderToStaticMarkup(React.createElement(Card,{listing:jobCard}));
    assert.match(html,new RegExp(jobLabel));assert.match(html,/bg-blue-50/);assert.match(html,new RegExp('href="/v2/job/'+J+'"'));
    assert.match(html,/Earlier job title/);assert.doesNotMatch(html,/Current job title|<img|No image|Pilt puudub|EUR/);
  }
  const modules=ui(), Card=modules('src/features/listing-conversation/components/ConversationListingCard.tsx').default;
  assert.match(renderToStaticMarkup(React.createElement(Card,{listing:{id:'123',title:'Bicycle',image:null,price:null}})),/bg-amber-50/);
  assert.match(renderToStaticMarkup(React.createElement(Card,{listing:{content_type:'service',id:P,title:'Repair',image:null,price:null}})),/bg-teal-50/);
});

test('current subject header keeps peer identity and message bubbles keep sender labels and alignment',()=>{
  const modules=ui(), Header=modules('src/features/listing-conversation/components/ConversationHeader.tsx').default;
  const result=parse(thread(),command), html=renderToStaticMarkup(React.createElement(Header,{peer:result.peer,listing:result.listing,
    ready:false,blocked:false,busy:false,onHide:async()=>true,onBlock:async()=>true}));
  assert.match(html,/Other person/);assert.match(html,/Job opportunity/);assert.match(html,/Current job title/);assert.match(html,/bg-blue-50/);
  const Messages=modules('src/features/listing-conversation/components/ConversationMessages.tsx').default;
  const messages=renderToStaticMarkup(React.createElement(Messages,{conversationId:command.conversationId,messages:result.messages,
    actor:{generation:1},isCurrent:()=>true}));
  assert.match(messages,/data-message-id="101" class="message"/);assert.match(messages,/data-message-id="102" class="message mine"/);
  assert.match(messages,/aria-label="Incoming message"/);assert.match(messages,/aria-label="Your message"/);
  assert.equal((messages.match(/Earlier job title/g)||[]).length,4);assert.doesNotMatch(messages,/Current job title/);
});
