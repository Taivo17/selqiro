'use strict';
// Real handlers and Storage transport with synthetic external responses only.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  fileName: filename, compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText, filename);
const {hostedPreviewConfig} = require('../src/server/listing-publication/journey/hostedPreviewConfig.ts');
const {createJourneyRequestHandler} = require('../src/server/listing-publication/journey/createJourneyHandler.ts');
const {createHorsePublicationRequestHandler} = require('../src/server/horse-publication/createHorsePublicationHandler.ts');
const REF = 'abcdefghijklmnopqrst', API = `https://${REF}.supabase.co`, APP = 'https://capacity-test.vercel.app';
const id = n => `71000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const USER=id(1), IDENTITY=id(2), REQUEST=id(3), ATTEMPT=id(4), SLOT=id(5), FILE=id(6), OFFER=id(7),
  EVENT=id(8), INSTANCE=id(9), OBJECT=id(10), WORK=id(11), CHILD=id(12), READY=id(13);
const TOKEN='synthetic-user-token', HASH='ab'.repeat(32), AT='2026-11-08T12:00:00.000000Z';
const SOURCE=`v1/${ATTEMPT}/${SLOT}/source.upload`, BUCKET='listing-publication-private';
const actor={expectedUserId:USER, expectedIdentityId:IDENTITY};
const json=(value,status=200)=>Response.json(value,{status});
const quota={code:'54000',message:'publication_retained_bytes_limit'};
function config() {
  const now=Date.parse('2026-11-08T12:00:00Z');
  const jwt=role=>[{alg:'HS256',typ:'JWT'},{ref:REF,role,exp:now/1000+3600},'synthetic-signature']
    .map(p=>Buffer.from(typeof p==='string'?p:JSON.stringify(p)).toString('base64url')).join('.');
  return hostedPreviewConfig({NODE_ENV:'production',VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:new URL(APP).host,
    SELQIRO_V2_HOSTED_PREVIEW:'v1',NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW:'v1',SELQIRO_V2_HOSTED_PROJECT_REF:REF,
    SELQIRO_V2_HOSTED_INSTANCE_ID:INSTANCE,SELQIRO_V2_HOSTED_REGION:'eu-central-1',NEXT_PUBLIC_SUPABASE_URL:API,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon'),SUPABASE_SERVICE_ROLE_KEY:jwt('service_role'),
    SELQIRO_V2_S3_ACCESS_KEY_ID:'synthetic-access',SELQIRO_V2_S3_SECRET_ACCESS_KEY:'synthetic-secret'},now);
}
const ordinary=()=>({...actor,requestKey:REQUEST,listing:{basics:{title:'Fixture',description:'Fixture',condition:'used'},
  price:{kind:'fixed',amount:'12',currency:'EUR'},category_path:['vehicles','cars'],
  location:{country:'Eesti',city:'Paide',latitude:null,longitude:null},attributes:{},details:{},language:'et'},
  images:[{client_file_id:FILE,byte_length:123,sha256:HASH}]});
const horse=()=>({...actor,requestKey:REQUEST,offerId:null,expectedRevision:null,content:{offerType:'sale'},
  gallery:[{clientFileId:FILE,byteLength:123,sha256:HASH,isPrimary:true}],confirmations:{},policySnapshot:[{},{}]});
const addition=()=>({p_expected_user_id:USER,p_expected_identity_id:IDENTITY,p_listing_id:'201',p_attempt_id:ATTEMPT,
  p_request_key:REQUEST,p_expected_revision:'1',p_image:{client_file_id:FILE,byte_length:123,sha256:HASH}});
const horseReceipt=state=>({schema_version:1,content_type:'horse_offer',state,actor_user_id:USER,identity_id:IDENTITY,
  request_key:REQUEST,attempt_id:ATTEMPT,horse_offer_id:OFFER,edit_revision:'1',
  publication_event_id:state==='published'?EVENT:null,
  slots:[{slot_id:SLOT,client_file_id:FILE,ordinal:0,expected_bytes:123,expected_sha256:HASH}]});
const listingReceipt=()=>({schema_version:1,attempt_id:ATTEMPT,request_key:REQUEST,actor_user_id:USER,
  identity_id:IDENTITY,listing_id:'201',state:'published',published_at:AT,content_deleted:false,files_remaining:1});
const appended=()=>({schema_version:1,listing_id:'201',attempt_id:ATTEMPT,request_key:REQUEST,
  receipt:{schema_version:1,listing_id:'201',attempt_id:ATTEMPT,request_key:REQUEST,actor_user_id:USER,identity_id:IDENTITY,
    addition_attempt_id:CHILD,ready_id:READY,slot_id:SLOT,ordinal:1,attached_revision:'2',was_primary:false,
    media_attempt_id:CHILD,media_ordinal:0,url:`/api/v2/listing-media/${CHILD}/0`,attached_at:AT},
  snapshot:{attempt_id:CHILD,request_key:REQUEST,actor_user_id:USER,identity_id:IDENTITY,state:'published'}});
const domains={ordinary:{input:ordinary,action:'prepare',rpc:'prepare_my_listing_publication_v1'},
  addition:{input:addition,action:'owner-images-add-prepare',rpc:'prepare_my_managed_listing_image_addition_v1'},
  horse:{input:horse,action:'prepare',rpc:'prepare_my_horse_publication_v1'}};

function fixture(domain, options={}) {
  const c=config(), calls=[], jobs=[], unexpected=[]; let claims=0, prepares=0;
  assert.ok(c);
  const success=()=>domain==='horse'?horseReceipt('prepared'):{schema_version:1,fixture:'prepared'};
  const fetcher=async(url,init)=>{
    const parsed=new URL(url), name=parsed.pathname.split('/').pop(), body=init.body?JSON.parse(init.body):null;
    const call={name,path:parsed.pathname,url,body,raw:init.body,method:init.method,headers:init.headers,signal:init.signal};
    calls.push(call); assert.equal(parsed.origin,API); assert.equal(init.redirect,'error'); assert.equal(init.cache,'no-store');
    if(parsed.pathname==='/auth/v1/user')return json({id:USER});
    if(name==='get_selqiro_hosted_preview_readiness_v1')return json({schema_version:1,scope:'hosted-preview-v1',
      storage_contract:'supabase-s3-session-v1',cleanup_mode:'held',project_ref:REF,release_id:'listing-publication-hosted-preview-v1',
      instance_id:INSTANCE,enabled:true,actor_user_id:USER,actor_allowed:true});
    if(name===domains[domain].rpc){
      prepares++;
      if(options.prepare)return options.prepare(prepares,call,success);
      return prepares===1?json(quota,500):json(success());
    }
    if(name==='claim_listing_account_source_cleanup_v1'){
      assert.equal(init.headers.get('authorization'),'Bearer '+c.serviceKey);
      assert.deepEqual(body,{p_expected_user_id:USER,p_expected_identity_id:IDENTITY});
      if(options.claim)return options.claim(call);
      return json(claims++===0?{schema_version:1,object_id:OBJECT,work_key:WORK,bucket_id:BUCKET,object_path:SOURCE,
        try_count:1,lease_until_epoch:Math.floor(Date.now()/1000)+60}:null);
    }
    if(init.method==='DELETE'){
      assert.equal(parsed.pathname,`/storage/v1/object/${BUCKET}`); assert.deepEqual(body,{prefixes:[SOURCE]});
      return json([{name:SOURCE}]);
    }
    if(parsed.pathname===`/storage/v1/object/authenticated/${BUCKET}/${SOURCE}`){
      assert.deepEqual([...parsed.searchParams.keys()],['cacheNonce']);
      return options.readback?options.readback(call):json({},404);
    }
    if(name==='record_listing_account_source_cleanup_v1'){
      assert.deepEqual(body,{p_expected_user_id:USER,p_expected_identity_id:IDENTITY,
        p_object_id:OBJECT,p_work_key:WORK,p_result:'deleted'});
      return options.record?options.record(call):json({object_id:OBJECT,work_key:WORK,state:'deleted'});
    }
    if(name==='claim_horse_publication_cleanup_v1')return json(null);
    if(name==='publish_my_horse_offer_v1')return json(options.badReceipt?{...horseReceipt('published'),identity_id:FILE}:horseReceipt('published'));
    if(name==='append_my_managed_listing_image_v1')return json(options.badReceipt?{}:appended());
    if(name==='get_my_listing_publication_confirmation_v1')return json({confirmation:{schema_version:1,
      attempt_id:ATTEMPT,request_key:REQUEST,actor_user_id:USER,identity_id:IDENTITY,
      price:{kind:'fixed',amount:'12',currency:'EUR'},image_count:1,confirmation_sha256:HASH}});
    if(name==='publish_my_listing_v1')return json({...listingReceipt(),actor_user_id:options.badReceipt?FILE:USER,replayed:false});
    if(name==='get_my_managed_listing_v2')return json({receipt:listingReceipt(),activity:{},images:[]});
    unexpected.push(name); throw Error('unexpected external operation '+name);
  };
  const images={prepare:async()=>{throw Error('image IO forbidden');},verify:async()=>{throw Error('image IO forbidden');},
    settle:async()=>({kind:'pending',attemptId:ATTEMPT,filesRemaining:null})};
  const handle=domain==='horse'?createHorsePublicationRequestHandler(c,images,fetcher,job=>jobs.push(job))
    :createJourneyRequestHandler(c,images,fetcher,job=>jobs.push(job));
  return {calls,jobs,async invoke(input=domains[domain].input(),action=domains[domain].action,signal){
    const result=await handle(new Request(APP+'/api/v2/test/'+action,{method:'POST',signal,
      headers:{origin:APP,host:new URL(APP).host,authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:JSON.stringify(input)}),action);
    assert.deepEqual(unexpected,[]); return {status:result.status,value:await result.json()};
  }};
}
const prepareCalls=(f,domain)=>f.calls.filter(c=>c.name===domains[domain].rpc);
const cleanupCalls=f=>f.calls.filter(c=>c.name==='claim_listing_account_source_cleanup_v1');
for(const domain of Object.keys(domains)){
  test(domain+': exact known refusal and confirmed SOURCE completion permit exactly one identical prepare',async()=>{
    const f=fixture(domain); const result=await f.invoke(); assert.equal(result.status,200);
    const calls=prepareCalls(f,domain); assert.equal(calls.length,2); assert.equal(calls[0].raw,calls[1].raw);
    assert.equal(cleanupCalls(f).length,2); assert.equal(f.calls.filter(c=>c.method==='DELETE').length,1);
  });
  for(const [name,change] of [
    ['no eligible SOURCE',{claim:()=>json(null)}],
    ['record response is lost',{record:()=>{throw Error('record reply lost');}}],
    ['changed active identity refuses the claim',{claim:()=>json({code:'42501'},403)}],
  ])test(domain+': '+name+' cannot retry prepare or claim completion',async()=>{
    const f=fixture(domain,change); const result=await f.invoke(); assert.equal(result.status,409);
    assert.equal(result.value.message,quota.message); assert.equal(prepareCalls(f,domain).length,1);
  });
  for(const [name,prepare] of [
    ['unknown SQL response',()=>json({code:'XX000',message:'private-detail'},500)],
    ['lost prepare response',()=>{throw Error('prepare response lost');}],
    ['daily limit',()=>json({code:'54000',message:'publication_daily_attempt_limit'},500)],
    ['open attempt limit',()=>json({code:'54000',message:'publication_open_attempt_limit'},500)],
  ])test(domain+': '+name+' never starts cleanup or repeats a write',async()=>{
    const f=fixture(domain,{prepare}); const result=await f.invoke(); assert.notEqual(result.status,200);
    assert.equal(prepareCalls(f,domain).length,1); assert.equal(cleanupCalls(f).length,0);
    assert.ok(!JSON.stringify(result).includes('private-detail'));
  });
  test(domain+': repeated quota refusal stops after the second prepare',async()=>{
    const f=fixture(domain,{prepare:()=>json(quota,500)}); const result=await f.invoke();
    assert.equal(result.status,409); assert.equal(prepareCalls(f,domain).length,2);
    assert.equal(cleanupCalls(f).length,2);
  });
  test(domain+': unknown second prepare stays unknown without a third attempt',async()=>{
    const f=fixture(domain,{prepare:n=>n===1?json(quota,500):Promise.reject(Error('second reply lost'))});
    assert.equal((await f.invoke()).status,503); assert.equal(prepareCalls(f,domain).length,2);
  });
}

function publishInput(domain){
  if(domain==='horse')return {...actor,attemptId:ATTEMPT,requestKey:REQUEST};
  if(domain==='ordinary')return {...actor,attemptId:ATTEMPT,requestKey:REQUEST,expectedPrice:{kind:'fixed',amount:'12',currency:'EUR'}};
  const input=addition(); delete input.p_image;
  return {...input,p_addition_attempt_id:CHILD,p_ready_id:READY};
}
for(const domain of Object.keys(domains)){
  test(domain+': bound publication ACK schedules bounded SOURCE cleanup after response independently of client abort',async()=>{
    const f=fixture(domain),controller=new AbortController();
    assert.equal((await f.invoke(publishInput(domain),domain==='addition'?'owner-images-add-append':'publish',controller.signal)).status,200);
    assert.equal(f.jobs.length,1); assert.equal(cleanupCalls(f).length,0);
    controller.abort(); await f.jobs[0]();
    assert.equal(cleanupCalls(f).length,2); assert.equal(f.calls.filter(c=>c.method==='DELETE').length,1);
  });
  test(domain+': invalid publication receipt never schedules background deletion',async()=>{
    const f=fixture(domain,{badReceipt:true});
    await f.invoke(publishInput(domain),domain==='addition'?'owner-images-add-append':'publish');
    assert.equal(f.jobs.length,0); assert.equal(cleanupCalls(f).length,0);
  });
}
