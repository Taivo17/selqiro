'use strict';
// Actual strict model, client request builder and renewal state machine.
// Remote requests alone are synthetic; no account or production data is used.
const {test} = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
const root = path.resolve(__dirname, '..'), plain = value => JSON.parse(JSON.stringify(value));
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222', S='33333333-3333-4333-8333-333333333333';
const actor={userId:U,identityId:I}, now='2026-11-11T12:00:00.123456+00:00';
const old='2026-11-10T12:00:00.123457+00:00', next='2027-11-11T12:00:00.123456+00:00';
function loader(overrides={}) {
  const cache=new Map();
  return function load(name) {
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true}});
    const requireLocal=name=>{
      if(!name.startsWith('.'))return require(name);
      const resolved=path.resolve(path.dirname(file),name), extension=fs.existsSync(resolved+'.ts')?'.ts':'.tsx';
      return load(resolved+extension);
    };
    vm.runInThisContext('(function(module,exports,require){'+output.outputText+'\n})',{filename:file})(module,module.exports,requireLocal);
    return module.exports;
  };
}
const modelPath='src/entities/service/model/serviceActivity.ts', apiPath='src/entities/service/api/serviceActivityClient.ts';
const requestPath='src/entities/service/api/servicePublicationClient.ts', sessionPath='src/features/service-activity/model/serviceActivitySession.ts';
const load=loader(), model=load(modelPath);
function activity(deadline=old,status='published') {
  return {active_until:deadline, origin:deadline?'transition':null, last_confirmed_at:null,
    is_expired:!!deadline && Date.parse(deadline)<=Date.parse(now),can_renew:status!=='draft'&&!!deadline,server_now:now};
}
function raw(status='published',deadline=old) {
  return {schema_version:1,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,status,activity:activity(deadline,status)};
}
function owner(status='published') {
  return {schema_version:2,content_type:'service',actor_user_id:U,identity_id:I,service_id:S,edit_revision:'15',status,
    content:{serviceId:S,title:'Repair service',description:'Saved description',category:'vehicle_machinery',subcategory:null,
      priceType:'contact',priceAmount:null,currency:'EUR',country:'Estonia',city:'Paide',location:null},
    images:[],policy_snapshot:[],created_at:now,updated_at:now,published_at:status==='draft'?null:now,sort_order:0,
    activity:activity(status==='draft'?null:old,status)};
}
function renewal(status='published',changed=true) {
  const value=raw(status,changed?next:old);value.changed=changed;
  if(changed)value.activity.last_confirmed_at=now;
  return value;
}
const input={actor,serviceId:S,expectedActiveUntil:old};
const bind=value=>model.bindServiceActivitySnapshot(value,actor,S,1000);
function deferred(){let resolve,reject;const promise=new Promise((r,j)=>{resolve=r;reject=j});return{promise,resolve,reject};}

test('v2 owner page preserves strict v1 publication snapshot contract and full exact activity deadline',()=>{
  const value=owner(), snapshot=model.bindServiceOwnerActivitySnapshot(value,actor,S,1000);
  assert.equal(snapshot.activity.activeUntil,old);assert.equal(snapshot.editRevision,'15');assert.equal(snapshot.service.status,'published');
  const envelope={schema_version:2,actor_user_id:U,identity_id:I,items:[value],total_count:'1',result_limit:50,result_offset:0,has_more:false,next_offset:null};
  assert.equal(model.bindServiceOwnerActivityPage(envelope,actor,0,50).items[0].activity.activeUntil,old);
  const {bindServiceOwnerSnapshot}=load('src/entities/service/model/servicePublication.ts');
  assert.throws(()=>bindServiceOwnerSnapshot(value,actor,S));
  const {activity:_activity,...v1}=value;v1.schema_version=1;
  assert.equal(bindServiceOwnerSnapshot(v1,actor,S).service.id,S);
  assert.throws(()=>model.bindServiceOwnerActivitySnapshot({...value,extra:true},actor,S));
  assert.throws(()=>model.bindServiceOwnerActivityPage({...envelope,extra:true},actor,0,50));
});

test('activity replies reject wrong actor, wrong service, extra keys, infinite or contradictory dates',()=>{
  for(const changed of [value=>value.actor_user_id=I,value=>value.identity_id=U,value=>value.service_id=I,
    value=>value.extra=true,value=>value.activity.active_until='infinity',value=>value.activity.server_now='2026-02-30T12:00:00Z',
    value=>value.activity.is_expired=false,value=>value.activity.can_renew=false,value=>value.activity.origin=null,
    value=>value.activity.active_until='2026-11-10T12:00:00.1234567Z']) {
    const value=raw();changed(value);assert.throws(()=>bind(value));
  }
  assert.equal(bind(raw('draft',null)).activity.canRenew,false);
  assert.throws(()=>bind(raw('draft')));
});

test('display uses server time despite device clock skew and expiry never autoactivates paused service',()=>{
  const value=raw('published','2026-11-11T12:00:01.123456+00:00');value.activity.is_expired=false;
  const parsed=model.bindServiceActivitySnapshot(value,actor,S,Date.parse('2035-01-01T00:00:00Z'));
  assert.equal(model.serviceActivityDisplay(parsed,Date.parse('2035-01-01T00:00:00Z')).state,'active');
  assert.equal(model.serviceActivityDisplay(parsed,Date.parse('2035-01-01T00:00:01Z')).state,'expired');
  assert.equal(model.serviceActivityDisplay(bind(raw('archived')),1000).state,'paused');
  assert.equal(model.serviceActivityDisplay(bind(raw('archived')),1000).expired,true);
  assert.equal(model.serviceActivityDisplay(bind(raw('draft',null)),1000).state,'draft');
});

test('renewal binder accepts only the exact 365-day server receipt and preserves archived status',()=>{
  const result=model.bindServiceRenewalResult(renewal('archived'),input,1000);
  assert.equal(result.status,'archived');assert.equal(result.activity.activeUntil,next);
  for(const change of [value=>value.activity.active_until='2027-11-11T12:00:00.123455+00:00',
    value=>value.activity.last_confirmed_at='2026-11-11T12:00:00.123455+00:00',value=>value.changed=false,
    value=>value.status='draft',value=>value.new_deadline=next]) {
    const value=renewal();change(value);assert.throws(()=>model.bindServiceRenewalResult(value,input));
  }
  const future='2028-01-01T00:00:00.000001+00:00', value={...raw('archived',future),changed:false};
  assert.equal(model.bindServiceRenewalResult(value,{...input,expectedActiveUntil:future}).changed,false);
});

test('renewal request sends original microsecond CAS string once and never retries or reads after reply loss',async()=>{
  const calls=[], read=loader({[requestPath]:{async servicePublicationRequest(actor,action,body){calls.push({actor,action,body});throw Error('outcome_unknown');}}});
  const api=read(apiPath);await assert.rejects(api.renewServiceActivity(input,new AbortController().signal));
  assert.equal(calls.length,1);assert.equal(calls[0].action,'activity-renew');
  assert.deepEqual(plain(calls[0].body),{expectedUserId:U,expectedIdentityId:I,serviceId:S,expectedActiveUntil:old});
  assert.equal(Object.hasOwn(calls[0].body,'activeUntil'),false);
});

test('v2 owner page and independent activity read use their separate scoped endpoints',async()=>{
  const calls=[], read=loader({[requestPath]:{async servicePublicationRequest(_actor,action,body){calls.push({action,body});
    if(action==='owner-activity-read')return owner();if(action==='activity-read')return raw();
    return {schema_version:2,actor_user_id:U,identity_id:I,items:[owner()],total_count:'1',result_limit:50,result_offset:0,has_more:false,next_offset:null};}}});
  const api=read(apiPath),signal=new AbortController().signal;
  await api.readServiceOwnerActivity(actor,S,signal);await api.readServiceActivity(actor,S,signal);await api.listServiceOwnerActivities(actor,signal);
  assert.deepEqual(calls.map(call=>call.action),['owner-activity-read','activity-read','owner-activity-list']);
});

function sessionFixture({status='published',deadline=old,blocked=false}={}) {
  const calls=[],events=[],gate=deferred(), state={allowed:true,blocked,readReply:raw(status,deadline),renewError:null};
  const Session=loader({[apiPath]:{}})(sessionPath).ServiceActivitySession;
  const session=new Session({actor,serviceId:S,initial:bind(state.readReply),canAct:()=>state.allowed,blocked:()=>state.blocked,
    onVerified:snapshot=>events.push(snapshot),read:async()=>{calls.push('read');return bind(state.readReply);},
    renew:async body=>{calls.push({renew:body});await gate.promise;if(state.renewError)throw state.renewError;
      return model.bindServiceRenewalResult(renewal(status),body,1000);}});
  return{session,calls,events,gate,state};
}

test('explicit confirmation is required, double confirmation dispatches only once and paused remains paused',async()=>{
  const f=sessionFixture({status:'archived'});await f.session.confirm();assert.equal(f.calls.length,0);
  f.session.open();assert.equal(f.session.getSnapshot().phase,'confirming');assert.equal(f.calls.length,0);
  const save=f.session.confirm();await f.session.confirm();assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].renew.expectedActiveUntil,old);f.gate.resolve();await save;
  assert.equal(f.session.getSnapshot().snapshot.status,'archived');assert.equal(f.session.getSnapshot().notice,'renewed');
});

test('uncertain write is blocked without retry until the owner explicitly reads its saved result',async()=>{
  const f=sessionFixture();f.state.renewError=Error('outcome_unknown');f.session.open();const save=f.session.confirm();f.gate.resolve();await save;
  assert.equal(f.session.getSnapshot().phase,'blocked');assert.equal(f.session.getSnapshot().notice,'uncertain');
  f.session.open();await f.session.confirm();await f.session.read();f.session.refresh();assert.equal(f.calls.length,1);
  f.state.readReply=raw('published',next);f.state.readReply.activity.last_confirmed_at=now;
  await f.session.read(true);assert.deepEqual(f.calls.map(x=>typeof x==='string'?x:'renew'),['renew','read']);
  assert.equal(f.session.getSnapshot().notice,'checked');assert.equal(f.session.getSnapshot().snapshot.activity.activeUntil,next);
});

test('known stale CAS also requires a read and keeps the latest deadline',async()=>{
  const f=sessionFixture();f.state.renewError={code:'40001'};f.session.open();const save=f.session.confirm();f.gate.resolve();await save;
  assert.equal(f.session.getSnapshot().notice,'conflict');f.session.open();assert.equal(f.calls.length,1);
  f.state.readReply=raw('published',next);await f.session.read(true);assert.equal(f.session.getSnapshot().phase,'ready');
});

test('identity invalidation discards late read/renew replies and cannot send another renewal',async()=>{
  const f=sessionFixture();f.session.open();const save=f.session.confirm();f.state.allowed=false;f.session.retire();f.gate.resolve();await save;
  assert.equal(f.session.getSnapshot().phase,'retired');assert.equal(f.session.getSnapshot().snapshot,null);assert.equal(f.events.length,0);
  f.state.allowed=true;f.session.open();await f.session.confirm();assert.equal(f.calls.length,1);
});

test('draft services and a caller with pending edits cannot open or dispatch renewal',async()=>{
  const draft=sessionFixture({status:'draft',deadline:null});draft.session.open();assert.equal(draft.session.getSnapshot().phase,'ready');
  const f=sessionFixture({blocked:true});
  f.session.open();await f.session.confirm();assert.equal(f.calls.length,0);
  await f.session.read(true);
  assert.equal(f.calls[0],'read');
});

test('verified first publication refreshes only activity and ignores an older in-flight draft read',async()=>{
  const Session=loader({[apiPath]:{}})(sessionPath).ServiceActivitySession, first=deferred(), events=[];
  let calls=0;
  const session=new Session({actor,serviceId:S,canAct:()=>true,blocked:()=>false,onVerified:value=>events.push(value),
    read:async()=>{calls++;if(calls===1){await first.promise;return bind(raw('draft',null));}return bind(raw('published',next));}});
  const pending=session.read();session.refresh();await new Promise(resolve=>setImmediate(resolve));first.resolve();await pending;
  assert.equal(calls,2);assert.equal(events.length,1);assert.equal(session.getSnapshot().snapshot.status,'published');
  assert.equal(session.getSnapshot().snapshot.activity.activeUntil,next);
});

test('activity EN and ET catalog keys are complete and matched',()=>{
  const catalog=load('src/features/service-activity/model/serviceActivityMessages.ts').serviceActivityMessages;
  assert.deepEqual(Object.keys(catalog.en),Object.keys(catalog.et));
  for(const language of ['en','et'])for(const text of Object.values(catalog[language]))assert.ok(text.trim());
});
