'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const {loader,loadWithExternals,hookScheduler,browserLocation,language,U,I,J,P,project,origin,jsonResponse,deferred}=require('./runtime.cjs');
const load=loader(), model=load('src/entities/conversation/model/offerMessaging.ts');
const legacy=load('src/entities/conversation/model/messagingCommands.ts');
const navigation=load('src/features/listing-conversation/model/listingConversationNavigation.ts');
const KEY='55555555-5555-4555-8555-555555555555', PHOTO='66666666-6666-4666-8666-666666666666';
const ENTRY='77777777-7777-4777-8777-777777777777', NEXT='88888888-8888-4888-8888-888888888888';
const CID='9007199254740993', actor={expectedUserId:U,expectedIdentityId:I};
const offers=[{type:'listing',id:'123'},{type:'horse_offer',id:J},{type:'service',id:J},{type:'job',id:J}];
const card=offer=>({...(offer.type==='listing'?{}:{content_type:offer.type}),id:offer.id,title:offer.type+' snapshot',image:null,price:null});
const subject=offer=>offer?{id:offer.id,title:offer.type+' shared',...(offer.type==='listing'?{}:{content_type:offer.type})}:null;
const get=(offer=null)=>({...actor,conversationId:CID,beforeMessageId:null,attachmentOfferType:offer?.type??null,attachmentOfferId:offer?.id??null});
const send=(offer=null,patch={})=>({...actor,conversationId:CID,requestKey:KEY,message:'Is it available?',offerType:offer?.type??null,offerId:offer?.id??null,attachmentId:null,...patch});
const identity=id=>({identity_id:id,name:id===I?'Sender':'Seller',avatar_url:null});
const thread=(offer=null,patch={})=>({schema_version:3,actor_user_id:U,identity_id:I,actor:identity(I),peer:identity(P),conversation_id:CID,
  can_send:true,blocked_by_me:false,listing:null,messages:[],next_before_message_id:null,
  attachment_offer_type:offer?.type??null,attachment_offer_id:offer?.id??null,attachment_offer:offer?card(offer):null,...patch});
const receipt=(command,patch={})=>({schema_version:2,actor_user_id:command.expectedUserId,identity_id:command.expectedIdentityId,
  conversation_id:command.conversationId,action:'send',request_key:command.requestKey,message_id:'101',replayed:false,...patch});
const message=(id,listing=null)=>({id,mine:true,text:'Earlier text',text_truncated:false,created_at:'2026-11-24T12:00:00Z',listing,image:null});

test('typed commands accept all four offer kinds and preserve strict legacy numeric contracts',()=>{
  for(const offer of offers){const c=model.copySendOfferMessage(send(offer)),r=model.copyGetOfferMessageThread(get(offer));
    assert.equal(c.offerType,offer.type);assert.equal(c.offerId,offer.id);assert.ok(Object.isFrozen(c));assert.ok(Object.isFrozen(r));}
  assert.equal(model.copySendOfferMessage(send(null,{message:'',attachmentId:PHOTO})).attachmentId,PHOTO);
  assert.equal(model.copySendOfferMessage(send()).offerId,null);
  for(const offer of offers.slice(1)){
    assert.throws(()=>legacy.copySendMessage({...actor,conversationId:CID,requestKey:KEY,message:'Hello',listingId:offer.id,attachmentId:null}));
    assert.throws(()=>legacy.copyGetMessageThread({...actor,conversationId:CID,beforeMessageId:null,attachmentListingId:offer.id}));
  }
});

test('typed commands reject ambiguous IDs partial pairs extra keys and executable accessors',()=>{
  for(const patch of [{offerType:'horse_offer',offerId:'123'},{offerType:'listing',offerId:J},{offerType:'other',offerId:J},
    {offerType:null,offerId:'123'},{offerType:'service',offerId:null},{offerType:'listing',offerId:'0'},
    {offerType:'listing',offerId:'01'},{offerType:'listing',offerId:'9223372036854775808'},
    {offerType:'job',offerId:'00000000-0000-0000-0000-000000000000'},{message:''},{message:'\u0000'},
    {message:'😀'.repeat(5001)},{attachmentId:'123'},{entryKey:ENTRY},{listingId:'123'}]){
    assert.throws(()=>model.copySendOfferMessage(send(null,patch)));
  }
  assert.throws(()=>model.copyGetOfferMessageThread({...get(),attachmentOfferId:J}));
  const input=send(offers[2]);let called=0;
  Object.defineProperty(input,'offerId',{enumerable:true,get(){called++;return J;}});
  assert.throws(()=>model.copySendOfferMessage(input));assert.equal(called,0);
  assert.throws(()=>model.copySendOfferMessage(Object.assign(Object.create({}),send())));
});

test('schema three keeps last shared header history snapshots and pending preview independent',()=>{
  for(const offer of offers){const result=model.parseOfferMessageThread(thread(offer,{listing:subject(offers[3]),
    messages:offers.map((o,i)=>message(String(100+i),card(o)))}),get(offer));
    assert.equal(result.listing.title,'job shared');assert.equal(result.attachment_offer.title,offer.type+' snapshot');
    assert.deepEqual(result.messages.map(m=>m.listing.title),offers.map(o=>o.type+' snapshot'));
    assert.equal(result.schema_version,3);assert.equal(Object.hasOwn(result,'attachment_listing'),false);assert.ok(Object.isFrozen(result.attachment_offer));}
  assert.equal(model.parseOfferMessageThread(thread(offers[0],{attachment_offer:null}),get(offers[0])).attachment_offer,null);
  assert.equal(model.parseOfferMessageThread(thread(),get()).listing,null);
});

test('schema three rejects wrong actors mismatched kinds invalid cards and stale receipt bindings',()=>{
  for(const patch of [{schema_version:2},{actor_user_id:P},{identity_id:P},{conversation_id:'1'},
    {attachment_offer_type:'job'},{attachment_offer_id:P},{attachment_offer:card(offers[3])},
    {attachment_offer:{...card(offers[2]),image:'https://private.example/photo'}},
    {attachment_listing_id:null},{messages:[message('102'),message('101')]}]){
    assert.throws(()=>model.parseOfferMessageThread(thread(offers[2],patch),get(offers[2])));
  }
  assert.throws(()=>model.parseOfferMessageThread(thread(null,{attachment_offer:card(offers[0])}),get()));
  const c=model.copySendOfferMessage(send(offers[1]));assert.equal(model.parseSendOfferMessageReceipt(receipt(c),c).message_id,'101');
  for(const patch of [{request_key:ENTRY},{identity_id:P},{actor_user_id:P},{conversation_id:'1'},{schema_version:3},{message_id:J}])
    assert.throws(()=>model.parseSendOfferMessageReceipt(receipt(c,patch),c));
});

test('typed service uses exact additive RPC arguments caller JWT and validated receipts',async()=>{
  const calls=[],pending=offers[2],c=send(pending,{attachmentId:PHOTO});
  const service=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test'},async(url,init)=>{
    calls.push({url,init});return jsonResponse(url.endsWith('/auth/v1/user')?{id:U}:url.includes('get_my_offer')?thread(pending):receipt(c));});
  await service.getOffer('synthetic.user.token',get(pending));await service.sendOffer('synthetic.user.token',c);
  assert.equal(calls.length,4);assert.equal(calls[1].url,project+'/rest/v1/rpc/get_my_offer_message_thread_v1');
  assert.deepEqual(JSON.parse(calls[1].init.body),{p_expected_user_id:U,p_expected_identity_id:I,p_conversation_id:CID,
    p_before_message_id:null,p_attachment_offer_type:'service',p_attachment_offer_id:J});
  assert.equal(calls[3].url,project+'/rest/v1/rpc/send_my_offer_message_v1');
  assert.deepEqual(JSON.parse(calls[3].init.body),{p_expected_user_id:U,p_expected_identity_id:I,p_request_key:KEY,p_conversation_id:CID,
    p_message:c.message,p_offer_type:'service',p_offer_id:J,p_attachment_id:PHOTO});
  for(const call of calls)assert.equal(new Headers(call.init.headers).get('authorization'),'Bearer synthetic.user.token');
  let attempts=0;const denied=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test'},async()=>{attempts++;return jsonResponse({id:P});});
  await assert.rejects(denied.sendOffer('synthetic.user.token',c),error=>error.code==='context_changed');assert.equal(attempts,1);
});

test('typed browser and handler dispatch preserve actor guards and reject cross origin requests',async()=>{
  const calls=[],c=send(offers[3]);
  const modules=loadWithExternals({'src/shared/config/v2Integration.ts':{v2IntegrationEnabled:()=>true},
    'src/server/listing-publication/journey/integrationRuntime.ts':{},'src/server/messaging-media/maintenance.ts':{}},{'next/server':{after:()=>{}}});
  const client=modules('src/entities/conversation/api/messagingClient.ts').createMessagingClient(async(url,init)=>{
    calls.push({url,init});return jsonResponse(url.endsWith('/getOffer')?thread(offers[3]):receipt(c));});
  await client.getOfferMessageThread('synthetic.user.token',get(offers[3]));await client.sendOfferMessage('synthetic.user.token',c);
  assert.deepEqual(calls.map(c=>c.url),['/api/v2/messaging/getOffer','/api/v2/messaging/sendOffer']);
  assert.deepEqual(JSON.parse(calls[1].init.body),c);
  const sequence=[];const handler=modules('src/server/messaging/handler.ts').createMessagingHandler({projectOrigin:project,publicKey:'public-test',appOrigin:origin},
    {actorGuard:async(_config,_token,user)=>{assert.equal(user,U);sequence.push('guard');},service:{sendOffer:async(_token,command)=>{sequence.push('send');return receipt(command);}},maintenance:()=>sequence.push('maintenance')});
  const request=(requestOrigin=origin,body=c)=>new Request(origin+'/api/v2/messaging/sendOffer',{method:'POST',headers:{host:new URL(origin).host,
    origin:requestOrigin,authorization:'Bearer synthetic.user.token','content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handler(request(),'sendOffer')).status,200);assert.deepEqual(sequence,['guard','send','maintenance']);
  assert.equal((await handler(request('https://other.example'),'sendOffer')).status,403);
  assert.equal((await handler(request(origin,{...c,offerType:null}),'sendOffer')).status,409);assert.equal(sequence.length,3);
});

test('expected offer RPC refusals expose only safe fixed diagnostics and never private upstream details',async()=>{
  for(const [code,message] of [['22023','message_offer_input'],['42501','message_offer_unavailable'],
    ['42501','horse_contact_unavailable'],['42501','service_contact_unavailable'],['42501','job_contact_unavailable']]){
    const service=load('src/server/messaging/service.ts').createMessagingService({projectOrigin:project,publicKey:'public-test'},async url=>
      url.endsWith('/auth/v1/user')?jsonResponse({id:U}):jsonResponse({code,message,hint:'PRIVATE_HINT',details:'PRIVATE_DETAILS'},code==='22023'?400:403));
    await assert.rejects(service.sendOffer('synthetic.user.token',send(offers[2])),error=>{
      assert.equal(error.code,'refused');assert.deepEqual(error.diagnostic,{stage:'rpc',code:'refused',status:code==='22023'?400:403,upstreamCode:code});
      assert.doesNotMatch(JSON.stringify(error),/PRIVATE|message_offer_|contact_unavailable/);return true;
    });
  }
});

test('offer origins parse exact typed or legacy links and reject mixed duplicate or malformed queries',()=>{
  for(const offer of offers){const value={...offer,entryKey:ENTRY},href=navigation.offerConversationHref(CID,value);
    assert.deepEqual(navigation.messageOfferOrigin(new URL(href,'https://selqiro.test').searchParams),value);
    assert.deepEqual(navigation.messageOfferOrigin({offer_type:offer.type,offer_id:offer.id,offer_intent:ENTRY}),value);}
  assert.deepEqual(navigation.messageOfferOrigin({listing:'123'}),offers[0]);
  for(const query of [{listing:['123','123']},{offer_type:['job','job'],offer_id:J},{offer_type:'job'},{offer_id:J},
    {offer_type:'job',offer_id:J,listing:'123'},{offer_type:'horse_offer',offer_id:'123'},
    {offer_type:'listing',offer_id:J},{offer_type:'job',offer_id:J,offer_intent:'bad'},
    {offer_type:'job',offer_id:J,offer_intent:[ENTRY,NEXT]},{listing:'123',offer_intent:ENTRY},{offer_intent:ENTRY}])
    assert.equal(navigation.messageOfferOrigin(query),null);
  assert.throws(()=>navigation.offerConversationHref(CID,{type:'job',id:'123'}));
});

test('consuming an origin preserves newer same offer intent unrelated query and history fragment',()=>{
  const old={...offers[1],entryKey:ENTRY},next={...offers[1],entryKey:NEXT};
  const browser=browserLocation(navigation.offerConversationHref(CID,next)+'&view=compact#last');
  try{navigation.consumeOfferOrigin(CID,old);assert.equal(browser.changes.length,0);
    navigation.consumeOfferOrigin(CID,next);assert.equal(browser.url.pathname,'/v2/messages/'+CID);
    assert.equal(browser.url.search,'?view=compact');assert.equal(browser.url.hash,'#last');assert.equal(browser.changes.length,1);
    browser.navigate('/v2/messages/'+CID+'?listing=123&view=compact#last');navigation.consumeOfferOrigin(CID,offers[0]);
    assert.equal(browser.url.search,'?view=compact');
    browser.navigate('/v2/messages/'+CID+'?offer_type=job&offer_id='+J+'&listing=123');navigation.consumeOfferOrigin(CID,offers[3]);assert.equal(browser.changes.length,2);
  }finally{browser.close();}
});

function controller(initial) {
  const scheduler=hookScheduler(),calls=[],gets=[],committed=[],history=[];
  let currentActor={...actor,accessToken:'synthetic.user.token',generation:1,signal:new AbortController().signal};
  let currentOrigin=initial,shared=null,previewAvailable=true,sendImplementation=null,canSend=true;
  const photoRef={current:null};
  const photo={current:photoRef,get visiblePhoto(){return photoRef.current;},get photo(){return photoRef.current;},changed:false,
    committed(id){committed.push(id);if(photoRef.current?.attachmentId===id)photoRef.current=null;},locked:false,waitingForActor:false};
  const context=()=>({actor:currentActor,isCurrent:a=>a===currentActor&&!a.signal.aborted,refresh:()=>{},anonymous:false,loading:false,error:null});
  const browser=browserLocation(navigation.offerConversationHref(CID,initial),url=>{currentOrigin=navigation.messageOfferOrigin(url.searchParams);scheduler.invalidate();});
  function persist(c){if(c.offerType){shared={type:c.offerType,id:c.offerId};history.push(message(String(100+history.length),card(shared)));}
    else history.push(message(String(100+history.length)));
    return receipt(c,{message_id:String(99+history.length)});}
  const modules=loadWithExternals({
    'src/features/listing-conversation/model/useConversationActor.ts':{useConversationActor:context},
    'src/features/listing-conversation/model/useConversationAutoRefresh.ts':{useConversationAutoRefresh:()=>{}},
    'src/features/listing-conversation/model/useThreadReadWatermark.ts':{useThreadReadWatermark:()=>async()=>{}},
    'src/features/listing-conversation/model/useMessagePhoto.ts':{useMessagePhoto:()=>photo},
    'src/shared/provider-controls/useViewerReadScope.ts':{useProviderControlRevision:()=>0},
    'src/shared/provider-controls/providerControlEvents.ts':{notifyProviderControlsChanged:()=>{}},
    'src/entities/conversation/api/messagingClient.ts':{
      async getOfferMessageThread(_token,input){const c=model.copyGetOfferMessageThread(input);gets.push(c);
        const offer=c.attachmentOfferType?{type:c.attachmentOfferType,id:c.attachmentOfferId}:null;
        return model.parseOfferMessageThread(thread(offer,{actor_user_id:c.expectedUserId,identity_id:c.expectedIdentityId,actor:identity(c.expectedIdentityId),
          listing:subject(shared),messages:[...history],attachment_offer:offer&&previewAvailable?card(offer):null,can_send:canSend}),c);},
      async sendOfferMessage(_token,input){const c=model.copySendOfferMessage(input);calls.push(c);
        const value=sendImplementation?await sendImplementation(c):persist(c);return model.parseSendOfferMessageReceipt(value,c);},
      hideThread:async()=>{},setThreadBlocked:async()=>{},
    },
  },{react:scheduler.hooks});
  const useConversation=modules('src/features/listing-conversation/model/useListingConversation.ts').useListingConversation;
  scheduler.start(()=>useConversation(CID,currentOrigin));
  return {scheduler,browser,calls,gets,committed,history,persist,photo,
    get state(){return scheduler.state;},flush:()=>scheduler.flush(),
    navigate(offer){browser.navigate(navigation.offerConversationHref(CID,offer));},
    setSend(fn){sendImplementation=fn;},setAvailable(value){previewAvailable=value;},
    refusal(){const ErrorClass=modules('src/entities/conversation/model/listingContact.ts').ListingContactError;
      return new ErrorClass('refused',{stage:'rpc',code:'refused',status:403,upstreamCode:'42501'});},
    setPhoto(id=PHOTO){photoRef.current={owner:U+'/'+I,state:'ready',attachmentId:id,previewUrl:null};scheduler.invalidate();},
    setActor(identityId){currentActor={...currentActor,expectedIdentityId:identityId,generation:currentActor.generation+1};scheduler.invalidate();},
    denySend(){canSend=false;},close(){scheduler.close();browser.close();},
  };
}

test('all four controller paths attach once then send plain text photos and allow deliberate same offer reentry',async()=>{
  for(const offer of offers){const c=controller({...offer,entryKey:ENTRY});try{
    await c.flush();assert.equal(c.state.attachmentRequested,true);assert.equal(c.state.attachment.title,offer.type+' snapshot');assert.equal(c.state.visible.listing,null);
    c.state.changeBody('First question');await c.flush();await c.state.send();await c.flush();
    assert.equal(c.calls[0].offerType,offer.type);assert.equal(c.calls[0].offerId,offer.id);assert.equal(c.state.attachmentRequested,false);
    assert.equal(c.browser.url.search,'');assert.equal(c.state.visible.listing.title,offer.type+' shared');
    c.state.changeBody('Follow-up');await c.flush();await c.state.send();await c.flush();assert.equal(c.calls[1].offerType,null);assert.equal(c.calls[1].offerId,null);
    c.setPhoto();await c.flush();await c.state.send();await c.flush();assert.equal(c.calls[2].message,'');assert.equal(c.calls[2].attachmentId,PHOTO);assert.equal(c.calls[2].offerId,null);
    c.navigate({...offer,entryKey:NEXT});await c.flush();assert.equal(c.state.attachmentRequested,true);
    c.state.changeBody('A month later');await c.flush();await c.state.send();await c.flush();assert.equal(c.calls[3].offerType,offer.type);assert.equal(c.calls[3].offerId,offer.id);
    assert.notEqual(c.calls[0].requestKey,c.calls[3].requestKey);assert.equal(c.state.attachmentRequested,false);
  }finally{c.close();}}
});

test('removal consumes the intent keeps text and photo and leaves the last shared header unchanged',async()=>{
  const c=controller({...offers[2],entryKey:ENTRY});try{await c.flush();c.state.changeBody('No card please');c.setPhoto();await c.flush();
    c.state.removeAttachment();await c.flush();assert.equal(c.state.body,'No card please');assert.equal(c.state.attachmentRequested,false);
    assert.equal(c.photo.current.current.attachmentId,PHOTO);assert.equal(c.state.visible.listing,null);assert.equal(c.browser.url.search,'');
    await c.state.send();await c.flush();assert.equal(c.calls[0].offerId,null);assert.equal(c.calls[0].attachmentId,PHOTO);assert.equal(c.state.visible.listing,null);
    c.navigate(null);await c.flush();assert.equal(c.state.attachmentRequested,false);
  }finally{c.close();}
});

test('unavailable previews require removal and blocked threads cannot send',async()=>{
  const c=controller({...offers[1],entryKey:ENTRY});try{c.setAvailable(false);await c.flush();c.state.changeBody('Question');await c.flush();
    assert.equal(c.state.attachmentUnavailable,true);assert.equal(c.state.canSend,false);await c.state.send();assert.equal(c.calls.length,0);
    c.state.removeAttachment();await c.flush();assert.equal(c.state.canSend,true);
    c.denySend();c.state.refresh();await c.flush();assert.equal(c.state.canSend,false);await c.state.send();assert.equal(c.calls.length,0);
  }finally{c.close();}
});

test('uncertain sends retain exact request text photo and offer while a newer same offer intent is queued',async()=>{
  const first={...offers[1],entryKey:ENTRY},next={...offers[1],entryKey:NEXT},c=controller(first);
  try{await c.flush();c.state.changeBody('Frozen question');c.setPhoto();await c.flush();
    c.setSend(async()=>{throw new Error('lost_receipt');});await c.state.send();await c.flush();assert.equal(c.state.unresolved,true);
    const frozen=c.calls[0];c.state.changeBody('Must not replace');c.state.removeAttachment();await c.flush();assert.equal(c.state.body,'Frozen question');
    c.navigate(next);await c.flush();assert.deepEqual(c.state.incomingOffer,next);assert.equal(c.state.canAcceptIncoming,false);
    c.setSend(async command=>c.persist(command));await c.state.send();await c.flush();assert.deepEqual(c.calls[1],frozen);
    assert.equal(c.committed.length,1);assert.equal(c.committed[0],PHOTO);assert.equal(c.state.unresolved,false);
    assert.equal(c.browser.url.searchParams.get('offer_intent'),NEXT);assert.equal(c.state.attachmentRequested,true);
    c.state.changeBody('New deliberate question');await c.flush();await c.state.send();await c.flush();
    assert.notEqual(c.calls[2].requestKey,frozen.requestKey);assert.equal(c.calls[2].offerId,first.id);assert.equal(c.browser.url.search,'');
  }finally{c.close();}
});

test('a definite first RPC refusal keeps the removable draft and allows a new corrected request',async()=>{
  const c=controller({...offers[2],entryKey:ENTRY});try{await c.flush();c.state.changeBody('Unavailable offer');c.setPhoto();await c.flush();
    c.setSend(async()=>{throw c.refusal();});await c.state.send();await c.flush();
    assert.equal(c.state.unresolved,false);assert.equal(c.state.body,'Unavailable offer');assert.equal(c.state.attachmentRequested,true);
    assert.equal(c.committed.length,0);assert.equal(c.state.visible.listing,null);assert.equal(c.browser.url.searchParams.get('offer_intent'),ENTRY);
    c.state.removeAttachment();c.state.changeBody('Plain corrected question');await c.flush();c.setSend(null);await c.state.send();await c.flush();
    assert.equal(c.calls[1].offerId,null);assert.equal(c.calls[1].message,'Plain corrected question');assert.equal(c.calls[1].attachmentId,PHOTO);
    assert.notEqual(c.calls[0].requestKey,c.calls[1].requestKey);
  }finally{c.close();}
});

test('a different incoming offer preserves the pending draft and a later typed draft survives a slow receipt',async()=>{
  const c=controller({...offers[0],entryKey:ENTRY});try{await c.flush();c.state.changeBody('Original');await c.flush();
    const wait=deferred();c.setSend(command=>wait.promise.then(()=>c.persist(command)));const sending=c.state.send();await c.flush();
    c.state.changeBody('Later text');c.navigate({...offers[3],entryKey:NEXT});await c.flush();
    assert.equal(c.state.body,'Later text');assert.equal(c.state.attachment.id,'123');assert.equal(c.state.incomingOffer.type,'job');
    wait.resolve();await sending;await c.flush();assert.equal(c.calls[0].message,'Original');assert.equal(c.calls[0].offerId,'123');
    assert.equal(c.state.body,'Later text');assert.equal(c.state.attachmentRequested,false);assert.equal(c.state.incomingOffer.type,'job');
    assert.equal(c.state.visible.listing.id,'123');assert.equal(c.browser.url.searchParams.get('offer_id'),J);
    c.state.acceptIncomingOffer();await c.flush();assert.equal(c.state.body,'');assert.equal(c.state.attachment.content_type,'job');
  }finally{c.close();}
});

test('actor changes hide and lock pending drafts and cannot consume an old actor send receipt',async()=>{
  const c=controller({...offers[2],entryKey:ENTRY});try{await c.flush();c.state.changeBody('Private old draft');await c.flush();
    const wait=deferred();c.setSend(command=>wait.promise.then(()=>receipt(command)));const sending=c.state.send();await c.flush();
    c.setActor(J);await c.flush();assert.equal(c.state.changed,true);assert.equal(c.state.body,'');assert.equal(c.state.attachment,null);assert.equal(c.state.canSend,false);
    wait.resolve();await sending;await c.flush();assert.equal(c.state.unresolved,true);assert.equal(c.committed.length,0);
    assert.equal(c.browser.url.searchParams.get('offer_intent'),ENTRY);await c.state.send();assert.equal(c.calls.length,1);
  }finally{c.close();}
});

function findElement(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;
  for(const child of React.Children.toArray(tree.props?.children)){const result=findElement(child,predicate);if(result)return result;}return null;}

test('every deliberate contact button navigation creates a typed offer intent with a fresh entry token',async()=>{
  const definitions=[
    ['src/features/listing-conversation/components/ListingContactButton.tsx',{listingId:'123'},'src/entities/conversation/api/managedConversationClient.ts','contactListingSeller',offers[0]],
    ['src/features/horse-offer-public/components/HorseContactButton.tsx',{offerId:J},'src/entities/horse-offer/api/contactHorseSeller.ts','contactHorseSeller',offers[1]],
    ['src/features/service-detail/components/ServiceContactButton.tsx',{serviceId:J},'src/entities/service/api/contactServiceProvider.ts','contactServiceProvider',offers[2]],
    ['src/features/jobs/components/JobContactButton.tsx',{jobId:J,identityId:P},'src/entities/job/api/jobClient.ts','contactJob',offers[3]],
  ];
  for(const [file,props,api,method,offer] of definitions){const scheduler=hookScheduler(),paths=[];let currentProps=props,paused=null;
    const contactResult=offer.type==='listing'?{conversation_id:CID,listing_id:offer.id}:CID;
    const current={...actor,accessToken:'synthetic',generation:1,signal:new AbortController().signal};
    const modules=loadWithExternals({'src/shared/i18n/V2LanguageProvider.tsx':language('et'),
      'src/shared/config/v2Integration.ts':{v2IntegrationEnabled:()=>true},
      'src/features/listing-conversation/model/useConversationActor.ts':{useConversationActor:()=>({actor:current,isCurrent:a=>a===current,loading:false,anonymous:false,error:null})},
      [api]:{[method]:async()=>paused?paused.promise:contactResult},
    },{react:scheduler.hooks,'next/navigation':{useRouter:()=>({push:path=>paths.push(path)})}});
    const Component=modules(file).default;scheduler.start(()=>{let element=Component(currentProps);while(typeof element?.type==='function')element=element.type(element.props);return element;});
    try{await scheduler.flush();for(let i=0;i<2;i++){findElement(scheduler.state,e=>e.type==='button').props.onClick();await scheduler.flush();}
      assert.equal(paths.length,2);const entries=paths.map(path=>navigation.messageOfferOrigin(new URL(path,'https://selqiro.test').searchParams));
      for(const entry of entries){assert.equal(entry.type,offer.type);assert.equal(entry.id,offer.id);assert.match(entry.entryKey,/^[0-9a-f-]{36}$/);}
      assert.notEqual(entries[0].entryKey,entries[1].entryKey);
      paused=deferred();findElement(scheduler.state,e=>e.type==='button').props.onClick();await scheduler.flush();
      const idField=offer.type==='listing'?'listingId':offer.type==='horse_offer'?'offerId':offer.type==='service'?'serviceId':'jobId';
      currentProps={...props,[idField]:offer.type==='listing'?'124':P};scheduler.invalidate();await scheduler.flush();
      paused.resolve(contactResult);await scheduler.flush();assert.equal(paths.length,2,'a stale contact target cannot navigate');
    }finally{scheduler.close();}
  }
});

test('real server rendered composer previews can be removed and header links only show the supplied last shared offer',()=>{
  const modules=loader({'src/shared/i18n/V2LanguageProvider.tsx':language('et'),
    'src/features/listing-conversation/components/ThreadActions.tsx':{__esModule:true,default:()=>null}});
  const Composer=modules('src/features/listing-conversation/components/MessageComposer.tsx').default;
  const Header=modules('src/features/listing-conversation/components/ConversationHeader.tsx').default;
  for(const offer of offers){const props={identity:identity(I),text:'Küsimus',canSend:true,busy:false,unresolved:false,disabled:false,photo:null,photoLocked:false,
    attachmentRequested:true,attachment:card(offer),attachmentUnavailable:false,onText:()=>{},onSend:async()=>{},onPhoto:()=>{},onRetryPhoto:()=>{},onRemovePhoto:()=>{},
    onRemoveAttachment:()=>{},onPhotoPickerOpen:()=>true,onPhotoPickerCancel:()=>{}};
    const html=renderToStaticMarkup(React.createElement(Composer,props));assert.match(html,/Sõnumiga läheb kaasa/);assert.match(html,/Eemalda pakkumise kaart/);
    const expected=offer.type==='listing'?'/v2/listing/123':offer.type==='horse_offer'?'/v2/horse-offer/'+J:'/v2/'+offer.type+'/'+J;
    assert.ok(html.includes('href="'+expected+'"'));assert.doesNotMatch(html,/Lisa link uuesti|share again/i);
    const without=renderToStaticMarkup(React.createElement(Composer,{...props,attachmentRequested:false,attachment:null}));assert.doesNotMatch(without,/Sõnumiga läheb kaasa/);
    const header=renderToStaticMarkup(React.createElement(Header,{peer:identity(P),listing:subject(offer),ready:false,blocked:false,busy:false,onHide:async()=>true,onBlock:async()=>true}));
    assert.ok(header.includes('href="'+expected+'"'));assert.ok(header.includes(offer.type+' shared'));assert.doesNotMatch(header,/snapshot/);
  }
});
