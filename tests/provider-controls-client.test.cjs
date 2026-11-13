'use strict';
// Real provider-control parsers and bounded transport; only remote HTTP is synthetic.
const {test, after} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..'), inputs = new Map(), sha = bytes => createHash('sha256').update(bytes).digest('hex');
function loader() {
  const cache = new Map();
  function load(name) {
    const file = path.resolve(root, name), relative = path.relative(root, file).split(path.sep).join('/');
    assert.ok(file.startsWith(root + path.sep));
    if (cache.has(file)) return cache.get(file).exports;
    const source = fs.readFileSync(file), digest = sha(source);
    if (inputs.has(relative)) assert.equal(inputs.get(relative), digest, 'Input changed while testing: ' + relative);
    inputs.set(relative, digest);
    const module = {exports: {}}; cache.set(file, module);
    const output = ts.transpileModule(source.toString(), {fileName: file,
      compilerOptions: {target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true}});
    function localRequire(spec) {
      if (!spec.startsWith('.')) return require(spec);
      const stem = path.resolve(path.dirname(file), spec);
      return load(fs.existsSync(stem) ? stem : fs.existsSync(stem + '.ts') ? stem + '.ts' : stem + '.tsx');
    }
    vm.runInThisContext('(function(module,exports,require){' + output.outputText + '\n})', {filename: file})(module, module.exports, localRequire);
    return module.exports;
  }
  return load;
}
const load = loader(), model = load('src/entities/viewer-provider-controls/model/types.ts');
const parse = load('src/entities/viewer-provider-controls/model/parsers.ts');
const {createProviderControlsClient} = load('src/entities/viewer-provider-controls/api/providerControlsClient.ts');
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const R='33333333-3333-4333-8333-333333333333', N='44444444-4444-4444-8444-444444444444';
const now='2026-11-13T12:00:00.123456+00:00', until='2026-11-14T12:00:00.123456+00:00';
const actor={userId:U,accessToken:'synthetic.account.token'}, target={type:'listing',id:'9223372036854775807'};
const origin='https://abcdefghijklmnopqrst.supabase.co', apiKey='synthetic-public-key';
function raw(extra={}) {
  return {schema_version:1,actor_user_id:U,target_type:target.type,target_id:target.id,target_token:'a'.repeat(64),target_available:true,
    provider:{identity_id:I,display_name:'Example shop',slug:'example-shop',avatar_url:'https://images.example.invalid/avatar.webp'},
    hidden_until:null,hidden:false,hide_revision:null,blocked_by_me:false,blocked_by_other:false,
    block_id:null,block_created_at:null,can_hide:true,can_block:true,server_now:now,...extra};
}
const parsed = value => parse.parseProviderControlState(value,U,{type:value.target_type,id:value.target_id});
function response(value,status=200,headers={}) {return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json',...headers}});}
function client(fetcher,extra={}) {return createProviderControlsClient({projectOrigin:origin,publicKey:apiKey,newRevision:()=>N,fetcher,...extra});}
const rejects = (fn,code) => assert.rejects(fn,error=>error instanceof model.ProviderControlsError && error.code===code);
function page(items,extra={}) {return {schema_version:1,actor_user_id:U,kind:'hidden',items,total_count:String(items.length),result_limit:25,result_offset:0,has_more:false,next_offset:null,...extra};}
function hidden(id=I) {return raw({target_type:'hidden_provider',target_id:id,hidden:true,hidden_until:until,hide_revision:R});}

 test('microsecond deadlines and original CAS text remain exact, including UTC offset forms',()=>{
  const active=parsed(raw({hidden_until:'2026-11-13T12:00:00.123457+00:00',hide_revision:R,hidden:true}));
  assert.equal(active.hidden,true);assert.equal(active.hiddenUntil,'2026-11-13T12:00:00.123457+00:00');
  assert.equal(parsed(raw({hidden_until:now,hide_revision:R,hidden:false})).hidden,false);
  assert.equal(parsed(raw({server_now:'2026-11-13T14:00:00.123456+02'})).serverNow,'2026-11-13T14:00:00.123456+02');
  for(const bad of ['infinity','2026-02-30T12:00:00Z','2026-11-13T25:00:00Z','2026-11-13T12:00:00.1234567Z'])
    assert.throws(()=>parsed(raw({server_now:bad})),{code:'invalid_response'});
 });
 test('state rejects foreign actor/target, contradictory ownership flags and unbounded metadata',()=>{
  for(const edit of [r=>r.actor_user_id=I,r=>r.target_type='service',r=>r.extra=true,r=>r.provider.private_account=U,
    r=>r.target_available=false,r=>r.blocked_by_me=true,r=>r.block_created_at=now,r=>r.hidden=true,
    r=>r.hidden_until=until,r=>r.target_token='secret',r=>r.provider.display_name='x'.repeat(4097)]) {
    const value=raw();edit(value);assert.throws(()=>parse.parseProviderControlState(value,U,target));
  }
  assert.equal(parsed(raw({provider:{identity_id:I,display_name:'Example',slug:null,avatar_url:'javascript:alert(1)'}})).provider.avatarUrl,null);
  assert.equal(parsed(raw({provider:{identity_id:I,display_name:'Example',slug:null,avatar_url:'https://user:password@images.example.invalid/a'}})).provider.avatarUrl,null);
 });
 test('all control targets are explicit and exact; identifiers never round through JS numbers',()=>{
  assert.equal(model.copyProviderControlTarget(target).id,'9223372036854775807');
  assert.equal(model.copyProviderControlTarget({type:'listing',id:'-9223372036854775808'}).id,'-9223372036854775808');
  assert.equal(model.copyProviderControlTarget({type:'conversation',id:'42'}).type,'conversation');
  for(const value of [{type:'listing',id:42},{type:'listing',id:'9223372036854775808'},
    {type:'profile',id:'42'},{type:'blocked_account',id:'0'},{type:'conversation',id:'-2'},
    {type:'listing',id:'01'},{...target,userId:U},{type:'unknown',id:I}]) assert.throws(()=>model.copyProviderControlTarget(value));
 });
 test('management page proves counts, kind, unique rows and server-active state together',()=>{
  assert.equal(parse.parseProviderControlPage(page([hidden()]),U,'hidden',0).items.length,1);
  assert.equal(parse.parseProviderControlPage(page([],{total_count:'1',result_offset:25}),U,'hidden',25).items.length,0);
  for(const value of [page([hidden()],{total_count:'2'}),page([hidden()],{has_more:true}),page([hidden()],{next_offset:25}),
    page([hidden()],{kind:'blocked'}),page([hidden(),hidden()]),page([hidden()],{result_limit:50}),
    page([raw({target_type:'hidden_provider',target_id:I})])])
    assert.throws(()=>parse.parseProviderControlPage(value,U,'hidden',0));
  const full=Array.from({length:25},(_,i)=>hidden('20000000-0000-4000-8000-'+String(i+1).padStart(12,'0')));
  assert.equal(parse.parseProviderControlPage(page(full,{total_count:'26',has_more:true,next_offset:25}),U,'hidden',0).nextOffset,25);
  assert.equal(parse.parseProviderControlPage(page([hidden()],{total_count:'26',result_offset:25}),U,'hidden',25).hasMore,false);
  const blocked=raw({target_type:'blocked_account',target_id:'54',blocked_by_me:true,block_id:'54',block_created_at:now});
  assert.equal(parse.parseProviderControlPage(page([blocked],{kind:'blocked'}),U,'blocked',0).items[0].blockCreatedAt,now);
 });
 test('GET is account bound with one captured bearer and no browser credentials, redirects or cache',async()=>{
  const calls=[], supplied={...actor};
  const api=client(async(url,init)=>{calls.push({url,init});supplied.userId=I;supplied.accessToken='changed';return response(raw());});
  const result=await api.get(supplied,target);
  assert.equal(result.actorUserId,U);assert.equal(calls.length,1);const {url,init}=calls[0];
  assert.equal(url,origin+'/rest/v1/rpc/get_my_provider_control_v1');
  assert.equal(init.headers.get('authorization'),'Bearer '+actor.accessToken);
  assert.equal(init.headers.get('apikey'),apiKey);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  assert.equal(init.cache,'no-store');assert.equal(init.referrerPolicy,'no-referrer');
  assert.deepEqual(JSON.parse(init.body),{p_expected_user_id:U,p_target_type:'listing',p_target_id:target.id});
 });
 test('hide and unblock send only expected target/revision fields; server owns all durations and actual account lookup',async()=>{
  const calls=[], before=parsed(raw({hide_revision:R,hidden_until:now}));
  const api=client(async(_url,init)=>{calls.push(JSON.parse(init.body));return response({...hidden(),target_type:'listing',target_id:target.id,hide_revision:N,action:'hide',changed:true});});
  const receipt=await api.set(actor,before,'hide');assert.equal(receipt.hideRevision,N);assert.equal(calls.length,1);
  assert.deepEqual(calls[0],{p_expected_user_id:U,p_target_type:'listing',p_target_id:target.id,p_action:'hide',p_expected_target_token:'a'.repeat(64),
    p_expected_revision:R,p_next_revision:N,p_expected_block_id:null,p_expected_block_created_at:null});
  const blocked=parsed(raw({blocked_by_me:true,block_id:'9223372036854775807',block_created_at:now}));
  const api2=client(async(_url,init)=>{const body=JSON.parse(init.body);assert.equal(body.p_expected_block_created_at,now);
    assert.equal(body.p_expected_block_id,'9223372036854775807');assert.equal(body.p_next_revision,null);return response({...raw(),action:'unblock',changed:true});});
  assert.equal((await api2.set(actor,blocked,'unblock')).blockedByMe,false);
 });
 test("temporary hiding and permanent blocking never send one another's CAS values",async()=>{
  const both=parsed(raw({hidden:true,hidden_until:until,hide_revision:R,blocked_by_me:true,block_id:'54',block_created_at:now}));
  for(const action of ['unhide','unblock']) {
    let sent;const api=client(async(_url,init)=>{sent=JSON.parse(init.body);return response({...raw(),action,changed:true});});
    await api.set(actor,both,action);
    assert.equal(sent.p_expected_revision,action==='unhide'?R:null);
    assert.equal(sent.p_expected_block_id,action==='unblock'?'54':null);
    assert.equal(sent.p_expected_block_created_at,action==='unblock'?now:null);
  }
 });
 test('read errors have safe typed codes and never expose SQL detail, JWTs or response text',async()=>{
  for(const [status,code,expected] of [[409,'40001','stale'],[401,'PGRST301','unauthorized'],[403,'42501','refused'],[400,'22023','input'],[404,'PGRST202','unavailable']]) {
    await rejects(()=>client(async()=>response({code,message:'PRIVATE SECRET '+actor.accessToken,details:'internal sql'},status)).get(actor,target),expected);
  }
 });
 test('write ambiguity is never replayed and carries its own revision for explicit readback',async()=>{
  for(const fetcher of [async()=>{throw Error('network SECRET');},async()=>response({wrong:'reply'}),async()=>response({code:'XX000',message:'SECRET'},500)]) {
    let count=0;const api=client(async(...args)=>{count++;return fetcher(...args);});
    await assert.rejects(api.set(actor,parsed(raw()),'hide'),error=>error.code==='outcome_unknown' && error.attemptedRevision===N && !String(error).includes('SECRET'));
    assert.equal(count,1);
  }
 });
 test('aborting an already dispatched mutation is uncertain; pre-aborted/cross-account calls never send',async()=>{
  const control=new AbortController();let calls=0;
  const api=client(async()=>{calls++;control.abort();return response({...raw(),action:'hide',changed:true});});
  await rejects(()=>api.set(actor,parsed(raw()),'hide',control.signal),'outcome_unknown');assert.equal(calls,1);
  await rejects(()=>api.set(actor,parsed(raw()),'hide',control.signal),'aborted');assert.equal(calls,1);
  await rejects(()=>api.set({...actor,userId:I},parsed(raw()),'hide'),'context_changed');assert.equal(calls,1);
 });
 test('overlarge and redirect responses fail closed without a fallback write',async()=>{
  for(const fetcher of [async()=>response(raw(),200,{'content-length':'524289'}),async()=>response({text:'x'.repeat(524289)}),
    async()=>({status:200,redirected:true,body:null})]) {
    let calls=0;const api=client(async(...args)=>{calls++;return fetcher(...args);});
    await rejects(()=>api.set(actor,parsed(raw()),'block'),'outcome_unknown');assert.equal(calls,1);
  }
 });
 test('configuration, target permissions and management bounds reject before network',async()=>{
  let calls=0;const fetcher=async()=>{calls++;return response(raw());};
  await rejects(()=>client(fetcher,{projectOrigin:'https://outside.example.invalid'}).get(actor,target),'configuration');
  await rejects(()=>client(fetcher).set(actor,parsed(raw({can_hide:false})),'hide'),'refused');
  await rejects(()=>client(fetcher).set(actor,parsed(raw({can_block:false})),'block'),'refused');
  await rejects(()=>client(fetcher).list(actor,'hidden',100001),'input');
  await rejects(()=>client(fetcher).list(actor,'hidden',-1),'input');assert.equal(calls,0);
 });
 test('management fetch is bounded to 25 and never downloads the entire personal list',async()=>{
  let body;const api=client(async(_url,init)=>{body=JSON.parse(init.body);return response(page([],{result_offset:25,total_count:'25'}));});
  await api.list(actor,'hidden',25);
  assert.deepEqual(body,{p_expected_user_id:U,p_kind:'hidden',p_result_limit:25,p_result_offset:25});
 });
 test('actual PostgreSQL-WASM GET/SET/LIST wire replies satisfy the real application parser contract',()=>{
  const file='supabase/repairs/20261113_provider_controls/tests/wire-examples.json';
  const bytes=fs.readFileSync(path.join(root,file));inputs.set(file,sha(bytes));const wire=JSON.parse(bytes);
  assert.equal(wire.schema_version,1);assert.equal(wire.synthetic_rows,true);assert.ok(wire.cases.length>=40);
  const seen=new Set();
  for(const row of wire.cases) {
    seen.add(row.operation);const target={type:row.target_type,id:row.target_id};
    if(row.operation==='get')parse.parseProviderControlState(row.response,row.actor_user_id,target);
    else if(row.operation==='set')parse.parseProviderControlReceipt(row.response,row.actor_user_id,target,row.action);
    else if(row.operation==='list') {
      if(row.result_limit===25)parse.parseProviderControlPage(row.response,row.actor_user_id,row.kind,row.result_offset);
      else assert.throws(()=>parse.parseProviderControlPage(row.response,row.actor_user_id,row.kind,row.result_offset),
        {code:'invalid_response'},'The app requests exactly 25; separate SQL-bound tests use smaller pages.');
    }
    else assert.fail('Unexpected SQL fixture operation');
  }
  assert.deepEqual([...seen].sort(),['get','list','set']);
 });
after(()=>{
  for(const [name,digest] of inputs) assert.equal(sha(fs.readFileSync(path.join(root,name))),digest,'No runtime source drift: '+name);
  if(process.env.SELQIRO_PROVIDER_CLIENT_INPUTS) fs.writeFileSync(process.env.SELQIRO_PROVIDER_CLIENT_INPUTS,
    JSON.stringify({kind:'provider-controls-client-inputs-v1',sources:Object.fromEntries([...inputs].sort())},null,2)+'\n');
});
