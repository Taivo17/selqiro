'use strict';
// Actual identity API modules and actual EN/ET interface messages. Supabase is synthetic and read-only.
const {test,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),api='src/entities/identity/api/',sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceRoot=process.env.SELQIRO_IDENTITY_REPRO_ROOT?path.resolve(process.env.SELQIRO_IDENTITY_REPRO_ROOT):root;
const legacy=sourceRoot!==root,inputs=new Map();
if(legacy){
  const pins={'getActiveIdentity.ts':'b0f74664b72313f12e93f05c16c809599fb5d64e904fe55e4bb5ef50e345cd9f',
    'getMyIdentities.ts':'23b413de9f2240fb406f6bbb7f051f66f537c17ab597ff212e1b5acbeb9d5a61'};
  for(const [name,hash]of Object.entries(pins))assert.equal(sha(fs.readFileSync(path.join(sourceRoot,api+name))),hash,'Only the pinned deployed legacy source may be used for reproduction');
}
function loader(client){
  const cache=new Map();
  function load(name){
    const file=path.resolve(sourceRoot,name),relative=path.relative(sourceRoot,file).split(path.sep).join('/');
    assert.ok(file.startsWith(sourceRoot+path.sep));
    if(relative==='src/shared/supabase/browserClient.ts')return{supabaseBrowserClient:client};
    if(cache.has(file))return cache.get(file).exports;
    const bytes=fs.readFileSync(file),hash=sha(bytes);if(inputs.has(relative))assert.equal(inputs.get(relative),hash);inputs.set(relative,hash);
    const module={exports:{}};cache.set(file,module);
    const transpiled=ts.transpileModule(bytes.toString(),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}});
    function local(request){
      if(!request.startsWith('.')&&!request.startsWith('@/'))return require(request);
      const candidate=request.startsWith('@/')?path.resolve(sourceRoot,request.slice(2)):path.resolve(path.dirname(file),request);
      return load(fs.existsSync(candidate)?candidate:fs.existsSync(candidate+'.ts')?candidate+'.ts':candidate+'.tsx');
    }
    vm.runInThisContext('(function(module,exports,require){'+transpiled.outputText+'\n})',{filename:file})(module,module.exports,local);return module.exports;
  }
  return load;
}
const U='11111111-1111-4111-8111-111111111111',V='22222222-2222-4222-8222-222222222222';
const I='33333333-3333-4333-8333-333333333333',OTHER='44444444-4444-4444-8444-444444444444',PROFILE='55555555-5555-4555-8555-555555555555';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const identity=(extra={})=>({id:I,type:'business',display_name:'Canonical business',avatar_url:'https://example.invalid/canonical.png',
  business_account_id:OTHER,role:'owner',is_active:true,slug:'canonical-business',...extra});
// Exact baseline RETURNS TABLE keys. The row has no type/identity_type; id belongs to identity_profiles.
const publicProfile=(extra={})=>({id:PROFILE,identity_id:I,display_name:'Public business name',slug:'public-business',bio:'Public description',
  avatar_url:'https://example.invalid/public.png',banner_url:null,banner_dominant_color:null,...extra});
function fixture(){
  const calls=[],state={user:U,active:I,profileMissing:false,rows:[identity()],profile:[publicProfile()],authError:null,
    profileError:null,listError:null,decorationError:null,onAuth:null,onProfile:null,onList:null,onDecoration:null};
  const client={auth:{async getUser(){calls.push({method:'auth.getUser'});if(state.onAuth)return state.onAuth();return{data:{user:state.user?{id:state.user}:null},error:state.authError};}},
    from(table){assert.equal(table,'profiles');return{select(columns){return{eq(field,value){assert.equal(field,'id');assert.equal(value,U);return{async maybeSingle(){
      calls.push({method:'profiles.read',columns,user:value});if(state.onProfile)return state.onProfile();return{data:state.profileMissing?null:{active_identity_id:state.active,store_name:'Legacy account label',store_slug:'legacy-account'},error:state.profileError};
    }};}};}};},
    async rpc(name){calls.push({method:name});if(name==='get_my_identities')return state.onList?state.onList():{data:state.rows,error:state.listError};
      if(name==='get_my_active_identity_profile')return state.onDecoration?state.onDecoration():{data:state.profile,error:state.decorationError};
      assert.fail('Unexpected or mutating RPC '+name);}};
  const load=loader(client),active=load(api+'getActiveIdentity.ts').getActiveIdentity,my=load(api+'getMyIdentities.ts').getMyIdentities;
  const messages=load('lib/i18n/interfaceMessage.ts');
  return{state,calls,active:()=>active({userId:U,userEmail:'synthetic@example.invalid'}),get:active,my,messages};
}
const proof={kind:'active-identity-type-targeted-v1',purpose:legacy?'deployed-legacy-regression-reproduction':'candidate-verification',
  startedAt:new Date().toISOString(),sourceRoot,cases:[],boundary:'Actual getActiveIdentity/getMyIdentities TypeScript and actual interface messages; synthetic read-only Supabase. No real account/profile rows, browser, network, SQL, deployment or build.'};
function scenario(name,body){test(name,async()=>{try{await body();proof.cases.push({name,status:'PASS'});}catch(error){proof.cases.push({name,status:'FAIL',error:error.message});throw error;}});}
const unavailable=error=>typeof error?.message==='string'&&error.message.startsWith('selqiro-ui-message:v1:');

scenario('typeless public-profile RPC preserves the actual business kind and public fields',async()=>{
  const f=fixture(),result=await f.active();
  assert.equal(result.type,'business');assert.equal(result.id,I);assert.notEqual(result.id,PROFILE);
  assert.equal(result.displayName,'Public business name');assert.equal(result.avatarUrl,'https://example.invalid/public.png');assert.equal(result.slug,'public-business');
  assert.ok(f.calls.some(call=>call.method==='get_my_identities'));assert.equal(f.calls.filter(call=>call.method==='auth.getUser').length,2);
  assert.equal(f.calls.filter(call=>call.method==='profiles.read').length,2);
});

scenario('a real private identity remains private even if the typeless profile is given an untrusted business label',async()=>{
  const f=fixture();f.state.rows=[identity({type:'private',business_account_id:null,role:null})];f.state.profile=[publicProfile({type:'business',identity_type:'business'})];
  const result=await f.active();assert.equal(result.type,'private');assert.equal(result.id,I);assert.equal(result.displayName,'Public business name');
});

scenario('a missing requested user returns null without reading another signed-in account',async()=>{
  const f=fixture();assert.equal(await f.get({userId:null,userEmail:'old@example.invalid'}),null);assert.equal(f.calls.length,0);
});

scenario('null, missing, unknown and contradictory identity kinds never default to private',async()=>{
  for(const type of [null,undefined,'Business','unknown','',17]){
    const f=fixture();f.state.rows=[identity({type,identity_type:'private'})];await assert.rejects(f.active(),unavailable);
    await assert.rejects(f.my(),unavailable);
  }
});

scenario('the exact active row is selected rather than the first accessible identity',async()=>{
  const f=fixture();f.state.rows=[identity({id:OTHER,type:'private',display_name:'First private identity'}),identity()];
  const result=await f.active();assert.equal(result.id,I);assert.equal(result.type,'business');
});

scenario('no active identity or no account profile returns null without selecting an arbitrary row or legacy name',async()=>{
  for(const missing of [false,true]){
    const f=fixture();f.state.active=null;f.state.profileMissing=missing;assert.equal(await f.active(),null);
    assert.equal(f.calls.some(call=>call.method==='get_my_identities'),false);
    assert.equal(f.calls.filter(call=>call.method==='auth.getUser').length,2);
  }
});

scenario('an active ID absent from accessible identities is an error, never a first-row fallback',async()=>{
  const f=fixture();f.state.rows=[identity({id:OTHER})];await assert.rejects(f.active(),unavailable);
  f.state.rows=[];await assert.rejects(f.active(),unavailable);
});

scenario('profile decoration failure preserves the verified identity kind and canonical public fields',async()=>{
  const f=fixture();f.state.decorationError={code:'XX000',message:'synthetic decoration failure'};
  const result=await f.active();assert.deepEqual(result,{id:I,type:'business',displayName:'Canonical business',avatarUrl:'https://example.invalid/canonical.png',slug:'canonical-business'});
  f.state.decorationError=null;f.state.profile=[];assert.equal((await f.active()).type,'business');
});

scenario('a mismatched profile identity or profile-row ID cannot impersonate the active identity',async()=>{
  for(const row of [publicProfile({identity_id:OTHER}),publicProfile({id:I,identity_id:undefined}),publicProfile({identity_id:null})]){
    const f=fixture();f.state.profile=[row];await assert.rejects(f.active(),unavailable);
  }
});

scenario('invalid or ambiguous identity/profile responses fail closed without raw server messages',async()=>{
  for(const rows of [[identity(),identity()],{},[null],[identity({id:'not-an-identity'})],[identity({avatar_url:{private:'data'}})]]){
    const f=fixture();f.state.rows=rows;await assert.rejects(f.active(),unavailable);
  }
  const f=fixture();f.state.profile=[publicProfile(),publicProfile()];await assert.rejects(f.active(),unavailable);
  f.state.profile=[publicProfile()];f.state.listError={message:'private synthetic server detail'};
  await assert.rejects(f.active(),error=>unavailable(error)&&!error.message.includes('private synthetic'));
});

scenario('the requested account is verified before any identity/profile read',async()=>{
  const f=fixture();f.state.user=V;await assert.rejects(f.active(),unavailable);assert.deepEqual(f.calls,[{method:'auth.getUser'}]);
});

scenario('an account change during the read prevents returning the previous account identity',async()=>{
  const f=fixture();f.state.onList=async()=>{f.state.user=V;return{data:f.state.rows,error:null};};
  await assert.rejects(f.active(),error=>error.message===f.messages.uiMessage('the_signed_in_account_changed_check_your_account_again'));
});

scenario('an active identity change during the read is detected even when the profile response contains the former name',async()=>{
  const f=fixture();f.state.onList=async()=>{f.state.active=OTHER;return{data:f.state.rows,error:null};};
  await assert.rejects(f.active(),error=>error.message===f.messages.uiMessage('the_active_account_or_identity_changed'));
});

scenario('a late old identity read cannot be returned after a newer read confirms a different active identity',async()=>{
  const f=fixture(),late=deferred();let first=true;
  f.state.onList=()=>{if(first){first=false;return late.promise;}return Promise.resolve({data:f.state.rows,error:null});};
  const old=f.active();await tick();
  f.state.active=OTHER;f.state.rows=[identity({id:OTHER,type:'private'})];f.state.profile=[publicProfile({identity_id:OTHER,display_name:'Current private name'})];
  const current=await f.active();assert.equal(current.id,OTHER);assert.equal(current.type,'private');
  const rejected=assert.rejects(old,unavailable);late.resolve({data:[identity()],error:null});await rejected;
});

scenario('late RPC failure and final account/profile verification failures do not return fallback data',async()=>{
  const f=fixture(),late=deferred();f.state.onList=()=>late.promise;const loading=f.active();await tick();
  const rejected=assert.rejects(loading,error=>unavailable(error)&&!error.message.includes('raw'));late.reject(new Error('raw synthetic server exception'));await rejected;
  const account=fixture();let accounts=0;account.state.onAuth=async()=>++accounts===1?{data:{user:{id:U}},error:null}:{data:{user:null},error:{message:'raw auth failure'}};
  await assert.rejects(account.active(),unavailable);
  const profile=fixture();let reads=0;profile.state.onProfile=async()=>++reads===1?{data:{active_identity_id:I},error:null}:{data:null,error:{message:'raw profile failure'}};
  await assert.rejects(profile.active(),unavailable);
});

scenario('public-profile array and object responses preserve an explicit empty avatar/slug instead of a different identity decoration',async()=>{
  for(const array of [false,true]){
    const f=fixture(),row=publicProfile({avatar_url:null,slug:null});f.state.profile=array?[row]:row;
    const result=await f.active();assert.equal(result.type,'business');assert.equal(result.avatarUrl,null);assert.equal(result.slug,null);
  }
});

scenario('existing interface notices render in Estonian and English with English fallback',async()=>{
  const f=fixture();f.state.rows=[identity({type:null})];let notice;
  try{await f.active();assert.fail('Unknown kind must fail');}catch(error){notice=error.message;}
  assert.equal(f.messages.renderUiMessage('en',notice),'Could not verify the identity. Try again.');
  assert.equal(f.messages.renderUiMessage('et',notice),'Identiteeti ei saanud kontrollida. Proovi uuesti.');
  assert.equal(f.messages.renderUiMessage('fr',notice),'Could not verify the identity. Try again.');
});

after(()=>{
  const drift=[...inputs].filter(([name,hash])=>sha(fs.readFileSync(path.join(sourceRoot,name)))!==hash).map(([name])=>name);
  proof.finishedAt=new Date().toISOString();proof.inputDrift=drift;proof.sources=Object.fromEntries([...inputs].sort());
  proof.testSource={path:'tests/active-identity-type.test.cjs',sha256:sha(fs.readFileSync(__filename))};
  proof.runtime={node:process.version,typescript:ts.version};proof.status=drift.length||proof.cases.some(row=>row.status!=='PASS')?'FAIL':'PASS';
  proof.baselineRpcShape={path:'supabase/migrations/20260722173530_baseline_20260722.sql',sha256:sha(fs.readFileSync(path.join(sourceRoot,'supabase/migrations/20260722173530_baseline_20260722.sql'))),
    function:'get_my_active_identity_profile',fields:Object.keys(publicProfile()),hasIdentityType:false};
  if(process.env.SELQIRO_IDENTITY_CLIENT_PROOF)fs.writeFileSync(process.env.SELQIRO_IDENTITY_CLIENT_PROOF,JSON.stringify(proof,null,2)+'\n');
  assert.deepEqual(drift,[]);
});
