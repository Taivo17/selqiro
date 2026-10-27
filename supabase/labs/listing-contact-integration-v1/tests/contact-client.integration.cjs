const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(__dirname,'../../../..'),compiled=root;
// Integrated repository candidate: exercise the actual TS sources with the
// explicit Node server condition, no detached compiled proof directory.
const ts=require(path.join(root,'node_modules/typescript'));
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,esModuleInterop:true},fileName:filename}).outputText,filename);
const model=require(path.join(compiled,'src/entities/conversation/model/listingContact'));
const {contactHttp}=require(path.join(compiled,'src/entities/conversation/api/contactHttp'));
const {createListingContactService}=require(path.join(compiled,'src/server/listing-publication/contact/contactListing'));
const {createListingContactHandler,localListingContactHandler}=require(path.join(compiled,'src/server/listing-publication/contact/contactHandler'));
const {localIntegrationConfig}=require(path.join(compiled,'src/server/listing-publication/journey/localIntegration'));
const U='92000000-0000-0000-0000-000000000002',I='b2000000-0000-0000-0000-000000000002',K='22000000-0000-0000-0000-000000000001';
const ORIGIN='https://abcdefghijklmnopqrst.supabase.co',TOKEN='synthetic-user-token',PUB='synthetic-public-key';
const gateOnly=process.argv.includes('--handler-gate');
const labels=[];function check(name,fn){fn();labels.push(name);}
async function rejects(name,fn,code){await assert.rejects(fn,e=>e instanceof model.ListingContactError&&e.code===code);labels.push(name);}
const contact=()=>({expectedUserId:U,expectedIdentityId:I,requestKey:K,listingId:'9223372036854775807'});
const message=()=>({expectedUserId:U,expectedIdentityId:I,requestKey:K,conversationId:'9007199254740993',message:'  Keep exact user text.  ',listingId:null});
const receipt=(c,isMessage=false)=>({schema_version:1,actor_user_id:c.expectedUserId,identity_id:c.expectedIdentityId,request_key:c.requestKey,
 conversation_id:isMessage?c.conversationId:'9007199254740993',...(isMessage?{message_id:'9007199254740995'}:{listing_id:c.listingId}),replayed:false});
const json=x=>Response.json(x);
const service=fetcher=>createListingContactService({projectOrigin:ORIGIN,publicKey:PUB},fetcher);
async function main(){
 let calls=[],io=0;
 if(!gateOnly){
 let c=contact();
 let s=service(async(url,init)=>{calls.push({url,init});return url.endsWith('/auth/v1/user')?json({id:U}):json(receipt(c));});
 const accepted=await s.contact(TOKEN,c);
 check('contact_bigint_ids_remain_text',()=>{assert.equal(accepted.conversation_id,'9007199254740993');assert.equal(accepted.listing_id,'9223372036854775807');});
 check('contact_actor_token_only_and_no_snapshot_arguments',()=>{assert.equal(calls.length,2);const args=JSON.parse(calls[1].init.body);assert.deepEqual(Object.keys(args).sort(),['p_expected_identity_id','p_expected_user_id','p_listing_id','p_request_key']);
  for(const x of calls){assert.equal(x.init.headers.get('authorization'),'Bearer '+TOKEN);assert.equal(x.init.headers.get('apikey'),PUB);assert.equal(x.init.redirect,'error');assert.equal(x.init.cache,'no-store');assert.equal(x.init.credentials,'omit');}});
 let release;calls=[];c=contact();const original={...c};
 s=service(async(url,init)=>{calls.push({url,init});if(url.endsWith('/auth/v1/user'))return await new Promise(r=>release=()=>r(json({id:U})));return json(receipt(original));});
 const pending=s.contact(TOKEN,c);c.expectedIdentityId='b2100000-0000-0000-0000-000000000002';c.listingId='11';release();await pending;
 check('contact_copies_input_before_auth_await',()=>{assert.equal(JSON.parse(calls[1].init.body).p_expected_identity_id,I);assert.equal(JSON.parse(calls[1].init.body).p_listing_id,original.listingId);});
 io=0;s=service(async()=>{io++;throw Error('unexpected');});
 await rejects('contact_rejects_caller_snapshot_before_io',()=>s.contact(TOKEN,{...contact(),listing_title_snapshot:'forged'}),'input');
 await rejects('contact_rejects_numeric_id_before_io',()=>s.contact(TOKEN,{...contact(),listingId:9007199254740993}),'input');
 let getter=0;const obj={...contact()};Object.defineProperty(obj,'listingId',{get(){getter++;return '1';},enumerable:true});
 await rejects('contact_rejects_accessor_without_evaluation',()=>s.contact(TOKEN,obj),'input');
 check('invalid_commands_do_no_io_or_getter_call',()=>{assert.equal(io,0);assert.equal(getter,0);});
 calls=[];s=service(async(url,init)=>{calls.push({url,init});return json({id:'93000000-0000-0000-0000-000000000003'});});
 await rejects('auth_context_mismatch_prevents_rpc',()=>s.contact(TOKEN,contact()),'context_changed');
 check('auth_mismatch_has_one_auth_read_only',()=>assert.equal(calls.length,1));
 calls=[];const m=message();s=service(async(url,init)=>{calls.push({url,init});return url.endsWith('/auth/v1/user')?json({id:U}):json(receipt(m,true));});
 await s.send(TOKEN,m);
 check('message_text_exact_no_automatic_client_attachment',()=>{const args=JSON.parse(calls[1].init.body);assert.equal(args.p_message,m.message);assert.equal(args.p_listing_id,null);assert.equal(args.p_request_key,K);});
 await rejects('message_unpaired_surrogate_rejected',()=>s.send(TOKEN,{...m,message:'\ud800'}),'input');
 await rejects('message_too_long_rejected',()=>s.send(TOKEN,{...m,message:'x'.repeat(5001)}),'input');
 s=service(async url=>url.endsWith('/auth/v1/user')?json({id:U}):json({...receipt(m,true),identity_id:'b2100000-0000-0000-0000-000000000002'}));
 await rejects('wrong_identity_receipt_never_accepted',()=>s.send(TOKEN,m),'response');
 calls=[];s=service(async(url,init)=>{calls.push({url,init});return url.endsWith('/auth/v1/user')?json({id:U}):new Response(null,{status:503});});
 await rejects('unknown_rpc_outcome_is_not_retried',()=>s.send(TOKEN,m),'outcome_unknown');
 check('unknown_rpc_exactly_one_write_dispatch',()=>assert.equal(calls.length,2));
 const read={expectedUserId:U,expectedIdentityId:I,conversationId:m.conversationId,beforeMessageId:null};
 const view={schema_version:1,actor_user_id:U,identity_id:I,conversation_id:m.conversationId,peer_name:'Seller',can_send:true,listing:null,
 messages:Array.from({length:50},(_,n)=>({id:String(n+1),mine:true,text:'x'.repeat(5000),created_at:'2026-10-17T12:00:00Z'})),next_before_message_id:null};
 s=service(async url=>url.endsWith('/auth/v1/user')?json({id:U}):json(view));const page=await s.get(TOKEN,read);
 check('full_fifty_messages_survive_bounded_read_transport',()=>{assert.equal(page.messages.length,50);assert.equal(page.messages[49].text.length,5000);assert(Object.isFrozen(page.messages));});
 await rejects('over_budget_response_is_rejected',()=>contactHttp(async()=>new Response('x'.repeat(2000001)),ORIGIN,{}),'response');
 s=service(async url=>url.endsWith('/auth/v1/user')?json({id:U}):json({...view,next_before_message_id:'2'}));
 await rejects('unbound_read_cursor_is_rejected',()=>s.get(TOKEN,read),'response');
 const ac=new AbortController();let started;const begun=new Promise(r=>started=r);
 const aborted=contactHttp(async()=>{started();return new Promise(()=>{});},ORIGIN,{},ac.signal);await begun;ac.abort();
 await rejects('aborted_pending_io_finishes_without_retry',()=>aborted,'aborted');
 }
 process.env.NODE_ENV='production';process.env.SELQIRO_V2_LOCAL_INTEGRATION='v1';process.env.NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION='v1';
 check('production_contact_http_composition_remains_closed',()=>assert.equal(localListingContactHandler(),null));
 const local={NODE_ENV:'development',SELQIRO_V2_LOCAL_INTEGRATION:'v1',NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION:'v1',SELQIRO_V2_RUN_ID:K,
  SELQIRO_V2_APP_ORIGIN:'http://127.0.0.1:12345',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:12346',NEXT_PUBLIC_SUPABASE_ANON_KEY:PUB,
  SUPABASE_SERVICE_ROLE_KEY:'synthetic-fixture-service-key',SELQIRO_V2_S3_ENDPOINT:'http://127.0.0.1:12346/storage/v1/s3',SELQIRO_V2_S3_REGION:'test',
  SELQIRO_V2_S3_ACCESS_KEY_ID:'synthetic',SELQIRO_V2_S3_SECRET_ACCESS_KEY:'synthetic',SELQIRO_V2_S3_TENANT_ID:'synthetic'};
 check('remote_or_deployed_local_composition_is_closed',()=>{assert.equal(localIntegrationConfig({...local,NEXT_PUBLIC_SUPABASE_URL:ORIGIN}),null);assert.equal(localIntegrationConfig({...local,VERCEL:'1'}),null);});
 Object.assign(process.env,local);delete process.env.VERCEL;const config=localIntegrationConfig();assert(config);
 calls=[];const handler=createListingContactHandler(config,async(url,init)=>{calls.push({url,init});if(url.includes('assert_selqiro_disposable_v2'))return json({run_id:K,scope:'disposable-v2'});
  if(url.endsWith('/auth/v1/user'))return json({id:U});return json(receipt(contact()));});
 const request=(body=contact(),origin=config.appOrigin,host=new URL(config.appOrigin).host,
  url=config.appOrigin+'/api/v2/listing-contact/contact')=>new Request(url,{method:'POST',
  headers:{...(host===null?{}:{host}),origin,authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:JSON.stringify(body)});
 const rejected=await handler(request(contact(),'http://127.0.0.1:54321'),'contact');
 check('api_origin_rejection_has_zero_io',()=>{assert.equal(rejected.status,403);assert.equal(calls.length,0);});
 const missingHost=await handler(request(contact(),config.appOrigin,null),'contact');
 check('api_missing_host_rejection_has_zero_io',()=>{assert.equal(missingHost.status,403);assert.equal(calls.length,0);});
 const foreignHost=await handler(request(contact(),config.appOrigin,'unrelated.invalid:12345'),'contact');
 check('api_foreign_host_rejection_has_zero_io',()=>{assert.equal(foreignHost.status,403);assert.equal(calls.length,0);});
 const aliasHost=await handler(request(contact(),config.appOrigin,'localhost:12345'),'contact');
 check('api_loopback_alias_host_rejection_has_zero_io',()=>{assert.equal(aliasHost.status,403);assert.equal(calls.length,0);});
 const invalid=await handler(request('x'.repeat(32769)),'contact');
 check('api_oversize_body_rejected_before_db_check',()=>{assert.equal(invalid.status,409);assert.equal(calls.length,0);});
 const response=await handler(request(),'contact');
 check('integrated_api_checks_fresh_db_marker_before_actor_rpc',()=>{assert.equal(response.status,200);assert.equal(calls.length,3);assert(calls[0].url.endsWith('/rpc/assert_selqiro_disposable_v2'));
  assert.equal(calls[0].init.headers.get('authorization'),'Bearer '+config.serviceKey);for(const x of calls.slice(1))assert.equal(x.init.headers.get('authorization'),'Bearer '+TOKEN);});
 calls=[];const normalized=await handler(request(contact(),config.appOrigin,new URL(config.appOrigin).host,
  'http://localhost:12345/api/v2/listing-contact/contact'),'contact');
 check('next_normalized_request_url_accepts_exact_actual_host_and_origin',()=>{assert.equal(normalized.status,200);assert.equal(calls.length,3);
  assert(calls[0].url.endsWith('/rpc/assert_selqiro_disposable_v2'));assert.equal(calls[2].init.headers.get('authorization'),'Bearer '+TOKEN);});
 calls=[];const wrongMarker=createListingContactHandler(config,async(url,init)=>{calls.push({url,init});return json({run_id:'different',scope:'disposable-v2'});});
 const closed=await wrongMarker(request(),'contact');
 check('wrong_run_marker_prevents_contact_and_auth_io',()=>{assert.equal(closed.status,503);assert.equal(calls.length,1);});
 if(!gateOnly){
 const browser=require(path.join(compiled,'src/entities/conversation/api/managedConversationClient'));
 process.env.NODE_ENV='production';io=0;const originalFetch=global.fetch;global.fetch=async()=>{io++;throw Error('unexpected');};
 try {await rejects('production_browser_contact_is_closed',()=>browser.contactListingSeller(TOKEN,contact()),'configuration');}
 finally {global.fetch=originalFetch;}
 check('closed_browser_has_no_io',()=>assert.equal(io,0));
 }
}
const proofDirectory=process.env.SELQIRO_V2_PROOF_DIR||path.join(root,'proof');
fs.mkdirSync(proofDirectory,{recursive:true});
const proofFile=path.join(proofDirectory,gateOnly?'contact-gate.integration.json':'contact-client.integration.json');
main().then(()=>{const result={success:true,checks:labels,old_suites_run:false};fs.writeFileSync(proofFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({success:true,checks:labels.length,gate_only:gateOnly}));})
 .catch(error=>{fs.writeFileSync(proofFile,JSON.stringify({success:false,checks:labels,error:String(error)},null,2)+'\n');console.error(String(error));process.exitCode=1;});
