'use strict';
// Real TS validators/session/components. Auth, storage, HTTP and time-bearing SQL results are synthetic.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loader,root,language,U,I,J,P,job:publicJob,deferred}=require('./helpers/jobs-public-loader.cjs');
const api='src/entities/job/api/jobClient.ts',model='src/entities/job/model/',feature='src/features/jobs/';
const actor={userId:U,identityId:I},T='2026-11-16T12:00:00.000001Z',E='2026-12-16T12:00:00.000001Z';
const content=publicJob().content,policy={documentId:P,version:'2026-11',contentHash:'a'.repeat(64),accepted:true};
const document={...policy,title:'Terms',body:'\nVersioned original text.\n',locale:'en'};delete document.accepted;
const inputs=new Map(),sha=value=>createHash('sha256').update(value).digest('hex');
function load(overrides={}) {const result=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{}},...overrides});
  const wrapped=name=>{const value=result(name);for(const [key,hash] of result.inputs){if(inputs.has(key))assert.equal(inputs.get(key),hash);inputs.set(key,hash);}return value;};return wrapped;}
const base=load(),{JobError,EMPTY_JOB_SEARCH}=base(model+'types.ts'),{parseJobContent,sameJobValue}=base(model+'jobContent.ts');
const parsers=base(model+'jobParsers.ts'),{parseJobIntent}=base(model+'jobIntent.ts');
const {JobSession}=base(feature+'model/jobSession.ts'),{jobFormContent,jobToForm}=base(feature+'model/jobForm.ts');
const owner=(extra={})=>({schema_version:1,content_type:'job',actor_user_id:U,identity_id:I,job_id:J,edit_revision:'1',status:'draft',
  content,created_at:T,updated_at:T,published_at:null,active_until:null,last_confirmed_at:null,...extra});
const published=(extra={})=>owner({status:'published',edit_revision:'2',published_at:T,active_until:E,last_confirmed_at:T,...extra});
const request=(operation='save',input={job_id:null,expected_revision:null,content,policy_snapshot:[]},key='55555555-5555-4555-8555-555555555555')=>parseJobIntent({actor,operation,input,requestKey:key},actor);
const mutation=(intent,job)=>({schema_version:1,actor_user_id:U,identity_id:I,request_key:intent.requestKey,operation:intent.operation,job,changed:true});
const receipt=(intent,result=null)=>({schema_version:1,actor_user_id:U,identity_id:I,request_key:intent.requestKey,found:!!result,
  operation:result?intent.operation:null,request:result?intent.input:null,result});
function fixture(options={}) {
  const calls=[],persisted=[],abort=new AbortController();let saved=options.saved??null,key=0;
  const state={allowed:true,server:options.initial??null,failStore:false,write:null,read:null,lookup:null};
  const store={read:()=>saved,write:value=>{if(state.failStore)throw new Error('synthetic storage failure');saved=JSON.parse(JSON.stringify(value));persisted.push(saved);},clear:()=>{if(state.failStore)throw new Error('synthetic storage failure');saved=null;}};
  const client={async write(intent,signal){calls.push({kind:'write',intent,signal});assert.ok(saved?.intent,'write must have durable intent');
      if(state.write)return state.write(intent);let job;
      if(intent.operation==='save')job=owner({...state.server,job_id:intent.input.job_id??J,content:intent.input.content,
        edit_revision:state.server?String(BigInt(state.server.edit_revision)+1n):'1'});
      if(intent.operation==='publish')job=published({...state.server,status:'published',edit_revision:String(BigInt(state.server.edit_revision)+1n),published_at:T,active_until:E,last_confirmed_at:T});
      if(intent.operation==='status')job={...state.server,status:intent.input.status,edit_revision:String(BigInt(state.server.edit_revision)+1n)};
      if(intent.operation==='renew')job={...state.server,active_until:'2027-01-16T12:00:00.000001Z',edit_revision:String(BigInt(state.server.edit_revision)+1n)};
      state.server=job;return mutation(intent,job);},
    async owner(a,id,signal){calls.push({kind:'owner',actor:a,id,signal});if(state.read)return state.read(a,id);return state.server;},
    async receipt(intent,signal){calls.push({kind:'receipt',intent,signal});return state.lookup?state.lookup(intent):receipt(intent);}};
  const session=new JobSession({actor,scope:options.scope??'new',initial:options.initial,store,client,canAct:()=>state.allowed&&!abort.signal.aborted,
    signal:()=>abort.signal,uuid:()=>`${String(++key).padStart(8,'0')}-1111-4111-8111-111111111111`});
  return {session,state,store,calls,persisted,abort,saved:()=>saved,writes:()=>calls.filter(row=>row.kind==='write')};
}
const proof={kind:'jobs-client-targeted-v1',startedAt:new Date().toISOString(),cases:[],
  boundary:'Actual TS form normalization, wire parsers, immutable intent/receipt session, RPC mapping and React server-rendered components. Synthetic Auth, HTTP, storage and SQL time/results; no browser layout, production write or database test.'};
function scenario(name,body){test(name,async()=>{try{await body();proof.cases.push({name,status:'PASS'});}catch(error){proof.cases.push({name,status:'FAIL',error:error.message});throw error;}});}

scenario('global country and optional salary preserve exact values without a local country allowlist or floating-point rounding',()=>{
  const form={...jobToForm(content),countryCode:'ke',salaryMin:'999999999999999999,123',salaryMax:'',salaryCurrency:'KWD',salaryPeriod:'month'};
  const result=jobFormContent(form);assert.equal(result.countryCode,'KE');assert.equal(result.salaryMin,'999999999999999999.123');assert.equal(result.salaryMax,null);
  assert.equal(jobFormContent({...form,salaryMin:'',salaryCurrency:'EUR',salaryPeriod:'month'}).salaryCurrency,null);
  assert.equal(jobFormContent({...form,salaryMin:'0',salaryCurrency:'JPY'}).salaryMin,'0');
  for(const change of [{salaryMin:'1.001',salaryCurrency:'EUR'},{salaryMin:'1.0',salaryCurrency:'JPY'},{salaryMin:'1e3'},{salaryMin:'1 000'},{salaryMin:'1000000000000000000'},{salaryMin:'10',salaryMax:'9'}]){
    assert.throws(()=>jobFormContent({...form,...change}));
  }
  assert.throws(()=>parseJobContent({...content,title:' '}));assert.throws(()=>parseJobContent({...content,unexpected:true}));
});

scenario('public and owner records cannot cross job, identity or revision boundaries',()=>{
  assert.equal(parsers.parsePublicJob(publicJob(),J).content_id,J);
  assert.throws(()=>parsers.parsePublicJob({...publicJob(),private_email:'secret@example.invalid'}));
  assert.throws(()=>parsers.parsePublicJob(publicJob(),P));
  assert.throws(()=>parsers.parseOwnerJob(owner({identity_id:P}),actor));
  assert.throws(()=>parsers.parseOwnerJob(owner({edit_revision:9007199254740993}),actor));
  assert.equal(parsers.parseOwnerJob(owner({edit_revision:'9007199254740993'}),actor).edit_revision,'9007199254740993');
});

scenario('bounded keyset pages reject duplicates, reversed order, wrong final cursors and ineligible expired items',()=>{
  const first=publicJob({published_at:'2026-11-16T12:00:00.000002Z'}),second=publicJob({content_id:P,published_at:T});
  const page={schema_version:1,items:[first,second],result_limit:2,has_more:true,next_cursor:{published_at:T,id:P},read_at:T};
  assert.equal(parsers.parseJobPage(page,2,{kind:'search'}).items.length,2);
  for(const change of [{items:[second,first]},{items:[first,first]},{next_cursor:{published_at:T,id:J}},{result_limit:50},{has_more:false}])assert.throws(()=>parsers.parseJobPage({...page,...change},2,{kind:'search'}));
  assert.throws(()=>parsers.parseJobPage({...page,items:[{...first,active_until:'2026-11-15T12:00:00Z'},second]},2,{kind:'search'}));
  assert.throws(()=>parsers.parseJobPage({...page,seller_slug:'another',identity_id:I},2,{kind:'profile',slug:'expected',identityId:I}));
  const empty={schema_version:1,items:[],result_limit:2,has_more:false,next_cursor:null,read_at:T,seller_slug:'gone',identity_id:null};
  assert.equal(parsers.parseJobPage(empty,2,{kind:'profile',slug:'gone',identityId:I}).items.length,0);
});

scenario('versioned policy text retains original whitespace while request receipts must echo the exact original action',()=>{
  const result=parsers.parseJobPolicies({schema_version:1,actor_user_id:U,identity_id:I,documents:[document]},actor);
  assert.equal(result[0].body,document.body);assert.equal(result[0].contentHash,document.contentHash);
  const intent=request(),recorded=mutation(intent,owner());assert.equal(parsers.parseJobReceipt(receipt(intent,recorded),intent).found,true);
  assert.throws(()=>parsers.parseJobReceipt({...receipt(intent,recorded),request:{...intent.input,content:{...content,title:'Changed'}}},intent));
  assert.throws(()=>parsers.parseJobReceipt({...receipt(intent,recorded),identity_id:P},intent));
  assert.throws(()=>parsers.parseJobReceipt({...receipt(intent),result:recorded},intent));
  assert.ok(Object.isFrozen(intent.input));assert.ok(Object.isFrozen(intent.input.content));
});

scenario('RPC calls bind filters, actor, revision and request; contact returns a decimal conversation without sending a message',async()=>{
  const calls=[],signal=new AbortController().signal;let reply;
  const client=load({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc(name,args){calls.push({name,args});return{abortSignal:async()=>reply};}}}})(api);
  const search={query:'welder',category:'engineering',countryCode:'KE',city:'Nairobi',workplaceType:'hybrid',employmentType:'permanent',workingTime:'part_time'};
  reply={data:{schema_version:1,items:[],result_limit:12,has_more:false,next_cursor:null,read_at:T},error:null};
  await client.searchPublicJobs(search,null,signal,12);
  assert.deepEqual(calls[0],{name:'search_public_jobs_v1',args:{p_query:'welder',p_category:'engineering',p_country_code:'KE',p_city:'Nairobi',p_workplace_type:'hybrid',p_employment_type:'permanent',p_working_time:'part_time',p_result_limit:12,p_cursor:null}});
  const intent=request();reply={data:mutation(intent,owner()),error:null};await client.writeJob(intent,signal);
  assert.equal(calls[1].name,'save_my_job_v1');assert.equal(calls[1].args.p_request_key,intent.requestKey);assert.equal(calls[1].args.p_expected_identity_id,I);
  reply={data:{schema_version:1,actor_user_id:U,identity_id:I,request_key:intent.requestKey,job_id:J,conversation_id:'9007199254740993',replayed:true},error:null};
  assert.equal(await client.contactJob({actor,requestKey:intent.requestKey,jobId:J},signal),'9007199254740993');
  assert.equal(calls[2].name,'contact_my_job_provider_v1');assert.equal(calls.length,3);assert.equal(Object.hasOwn(calls[2].args,'message'),false);
  for(const [code,kind] of [['40001','conflict'],['42501','forbidden'],['55000','policy'],['55P03','unknown'],['XX000','unknown']]){
    reply={data:null,error:{code}};await assert.rejects(client.writeJob(intent,signal),error=>error.kind===kind);
  }
  for(const [code,message,kind] of [['22023','job_renewal_required','renewal'],['55000','job_public_profile_required','profile'],['55000','unrecognized raw SQL text','policy']]){
    reply={data:null,error:{code,message}};await assert.rejects(client.writeJob(intent,signal),error=>error.kind===kind&&!error.message.includes('raw SQL'));
  }
});

scenario('one initial publish stores each exact intent before save and publish then verifies the current owner record',async()=>{
  const f=fixture();await f.session.submit(content,[policy]);
  assert.deepEqual(f.writes().map(row=>row.intent.operation),['save','publish']);
  assert.equal(f.writes()[0].intent.input.job_id,null);assert.deepEqual(f.writes()[0].intent.input.policy_snapshot,[]);
  assert.equal(f.writes()[1].intent.input.job_id,J);assert.equal(f.writes()[1].intent.input.expected_revision,'1');
  assert.equal(f.writes()[1].intent.requestKey,f.persisted[0].publishNext.requestKey);
  assert.equal(f.session.getSnapshot().message,'published');assert.equal(f.session.getSnapshot().job.job_id,J);assert.equal(f.saved(),null);
  assert.equal(f.calls.at(-1).kind,'owner');f.session.retire();
});

scenario('lost create response survives remount and a receipt read never automatically publishes',async()=>{
  const f=fixture();let original;
  f.state.write=async intent=>{original=intent;throw new JobError('unknown');};await f.session.submit(content,[policy]);
  assert.equal(f.session.getSnapshot().phase,'uncertain');const durable=f.saved(),publishKey=durable.publishNext.requestKey;f.session.retire();
  const resumed=fixture({saved:durable});assert.equal(resumed.calls.length,0);assert.equal(resumed.session.getSnapshot().pending.requestKey,original.requestKey);
  resumed.state.server=owner();resumed.state.lookup=async intent=>receipt(intent,mutation(intent,owner()));await resumed.session.check();
  assert.equal(resumed.writes().length,0);assert.equal(resumed.session.getSnapshot().phase,'continue');
  assert.equal(resumed.session.getSnapshot().pending.requestKey,publishKey);
  await resumed.session.retrySame();assert.equal(resumed.writes().length,1);assert.equal(resumed.writes()[0].intent.operation,'publish');assert.equal(resumed.session.getSnapshot().message,'published');resumed.session.retire();
});

scenario('not-found receipt allows only an explicit retry of the same immutable request',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.write=async()=>{throw new JobError('unknown');};await f.session.submit({...content,title:'New title'},[policy]);
  const first=f.writes()[0].intent;await f.session.check();assert.equal(f.session.getSnapshot().phase,'retryable');assert.equal(f.writes().length,1);
  await f.session.submit({...content,title:'A different action'},[policy]);assert.equal(f.writes().length,1);
  await f.session.retrySame();assert.equal(f.writes().length,2);assert.deepEqual(f.writes()[1].intent,first);f.session.retire();
});

scenario('a known CAS conflict blocks another write until fresh owner data is explicitly loaded',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.write=async()=>{throw new JobError('conflict');};await f.session.status('paused');
  assert.equal(f.session.getSnapshot().phase,'blocked');assert.equal(f.session.getSnapshot().message,'conflict');
  await f.session.renew();assert.equal(f.writes().length,1);f.state.server=published({edit_revision:'3',content:{...content,title:'Other edit'}});await f.session.reload();
  f.state.write=null;await f.session.status('paused');assert.equal(f.writes()[1].intent.input.expected_revision,'3');assert.notEqual(f.writes()[0].intent.requestKey,f.writes()[1].intent.requestKey);f.session.retire();
});

scenario('late completion after account invalidation cannot publish, clear the pending action or claim success',async()=>{
  const f=fixture(),response=deferred();f.state.write=()=>response.promise;const sending=f.session.submit(content,[policy]);
  const intent=f.writes()[0].intent;f.state.allowed=false;f.session.suspend();response.resolve(mutation(intent,owner()));await sending;
  assert.equal(f.session.getSnapshot().phase,'uncertain');assert.equal(f.writes().length,1);assert.equal(f.saved().intent.requestKey,intent.requestKey);assert.equal(f.session.getSnapshot().job,null);f.session.retire();
});

scenario('a failed fresh read after acknowledged SQL keeps uncertainty and the same receipt key',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.read=async()=>{throw new JobError('forbidden');};await f.session.status('paused');
  assert.equal(f.session.getSnapshot().phase,'uncertain');assert.ok(f.saved().intent);const intent=f.writes()[0].intent;
  f.state.lookup=async value=>receipt(value,mutation(intent,f.state.server));f.state.read=null;await f.session.check();
  assert.equal(f.session.getSnapshot().message,'stateChanged');assert.equal(f.writes().length,1);assert.equal(f.saved(),null);f.session.retire();
});

scenario('historical receipt is not presented as the latest state when the current revision has moved on',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.write=async()=>{throw new JobError('unknown');};await f.session.status('paused');
  const intent=f.writes()[0].intent,old=published({status:'paused',edit_revision:'3'});f.state.lookup=async()=>receipt(intent,mutation(intent,old));
  f.state.server=published({status:'closed',edit_revision:'4'});await f.session.check();assert.equal(f.session.getSnapshot().message,'changedElsewhere');assert.equal(f.session.getSnapshot().job.status,'closed');assert.equal(f.writes().length,1);f.session.retire();
});

scenario('known publication refusal retains the created draft and retries its existing UUID rather than creating another job',async()=>{
  const f=fixture();f.state.write=async intent=>{if(intent.operation==='publish')throw new JobError('policy');f.state.server=owner();return mutation(intent,owner());};
  await f.session.submit(content,[policy]);assert.equal(f.session.getSnapshot().phase,'editing');assert.equal(f.saved().jobId,J);assert.equal(f.saved().intent,null);
  const resumed=fixture({saved:f.saved()});resumed.state.server=owner();assert.equal(resumed.session.getJobId(),J);resumed.session.adopt(owner());
  await resumed.session.submit(content,[policy]);assert.equal(resumed.writes()[0].intent.input.job_id,J);assert.equal(resumed.writes()[0].intent.input.expected_revision,'1');
  f.session.retire();resumed.session.retire();
});

scenario('storage failure prevents a write, and corrupted cross-account recovery cannot become a new action',async()=>{
  const f=fixture();f.state.failStore=true;await f.session.submit(content,[policy]);assert.equal(f.writes().length,0);assert.equal(f.session.getSnapshot().message,'storageError');f.session.retire();
  const invalid=fixture({saved:{version:1,actor:{userId:P,identityId:I},scope:'new',jobId:null,intent:null,publishNext:null}});
  assert.equal(invalid.session.getSnapshot().phase,'blocked');await invalid.session.submit(content,[policy]);assert.equal(invalid.writes().length,0);invalid.session.retire();
});

scenario('explicit status and renewal carry the shown revision/deadline and never extend from an ordinary content edit',async()=>{
  const f=fixture({initial:published(),scope:J});await f.session.submit({...content,title:'Updated title'},[policy]);
  assert.deepEqual(f.writes().map(row=>row.intent.operation),['save']);assert.equal(f.session.getSnapshot().job.active_until,E);
  await f.session.status('paused');const before=f.session.getSnapshot().job;await f.session.renew();
  assert.deepEqual(f.writes().map(row=>row.intent.operation),['save','status','renew']);
  assert.equal(f.writes()[2].intent.input.expected_active_until,E);assert.equal(f.writes()[2].intent.input.expected_revision,before.edit_revision);
  assert.equal(f.session.getSnapshot().job.status,'paused');f.session.retire();
});

scenario('a suspended older receipt read cannot override a later verification',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.write=async()=>{throw new JobError('unknown');};await f.session.status('paused');
  const old=deferred();f.state.lookup=()=>old.promise;const checking=f.session.check();f.session.suspend();
  f.state.lookup=async intent=>receipt(intent);await f.session.check();assert.equal(f.session.getSnapshot().phase,'retryable');
  old.resolve(receipt(f.writes()[0].intent,mutation(f.writes()[0].intent,published({status:'paused'}))));await checking;
  assert.equal(f.session.getSnapshot().phase,'retryable');assert.equal(f.writes().length,1);f.session.retire();
});

scenario('job discovery exposes an honest empty state, enabled navigation and English fallback without fake employers',()=>{
  for(const lang of ['en','et','fr']) {
    const l=load({'src/shared/i18n/V2LanguageProvider.tsx':language(lang),[feature+'model/useJobCategories.ts']:{useJobCategories:()=>({items:[],loading:false,error:false,reload(){}})},
      [feature+'model/useJobSearchUrl.ts']:{useJobSearchUrl:()=>({search:EMPTY_JOB_SEARCH,change(){}})},
      [feature+'model/usePublicJobs.ts']:{usePublicJobs:()=>({page:{items:[],has_more:false},loading:false,error:false,canPrevious:false,reset(){},reload(){},next(){},previous(){}})}});
    const html=renderToStaticMarkup(React.createElement(l(feature+'components/JobDiscoveryPage.tsx').default));
    assert.match(html,/href="\/v2\/jobs" aria-current="page"/);assert.match(html,/href="\/v2\/my-area\/jobs\/new"/);
    assert.match(html,lang==='et'?/Tööpakkumisi veel pole\./:/There are no job opportunities yet\./);
    assert.doesNotMatch(html,/TULEKUL|Coming soon|Sales consultant|Müügikonsultant/);
    assert.match(html,/bg-blue-/);
  }
});

scenario('unknown action UI is distinct from conflict and only shows recovery actions that the session actually permits',()=>{
  const l=load({'src/shared/i18n/V2LanguageProvider.tsx':language('et')}),Component=l(feature+'components/JobActionFeedback.tsx').default;
  const render=(phase,message)=>renderToStaticMarkup(React.createElement(Component,{session:{check(){},retrySame(){}},view:{phase,message,pending:request(),job:null,completion:0},enabled:true,onReload(){}}));
  const unknown=render('uncertain','unknown');assert.match(unknown,/Muudatuse tulemust ei õnnestunud kinnitada/);assert.match(unknown,/Kontrolli salvestatud tulemust/);assert.doesNotMatch(unknown,/Korda sama tegevust/);
  const retry=render('retryable','notFoundRequest');assert.match(retry,/Korda sama tegevust/);
  const conflict=render('blocked','conflict');assert.match(conflict,/muudeti mujal/);assert.doesNotMatch(conflict,/Korda sama tegevust|Muudatuse tulemust ei õnnestunud kinnitada/);
});

scenario('public search URL round-trips every selected filter and discards untrusted destinations and invalid values',()=>{
  const {readJobSearch,jobSearchUrl}=base(feature+'model/jobSearchUrl.ts');
  const search={query:'Engineer & technician',category:'engineering',countryCode:'KE',city:'Nairobi',workplaceType:'hybrid',employmentType:'permanent',workingTime:'part_time'};
  const url=jobSearchUrl(search);assert.ok(url.startsWith('/v2/jobs?'));assert.equal(url.includes('Engineer+%26+technician'),true);
  assert.deepEqual(readJobSearch(url.split('?')[1]),search);assert.equal(jobSearchUrl(EMPTY_JOB_SEARCH),'/v2/jobs');
  const sanitized=readJobSearch('q=Engineer&country=ke&category=unknown&workplace=unknown&next=https%3A%2F%2Fevil.invalid&identity=private');
  assert.equal(sanitized.countryCode,'KE');assert.equal(sanitized.category,null);assert.equal(sanitized.workplaceType,null);
  assert.doesNotMatch(jobSearchUrl(sanitized),/evil|identity|next=/);assert.equal(readJobSearch('city=%00&q='+ 'a'.repeat(201)).query,'');
});

scenario('filtered empty state includes a direct clear action and its form is restored from the public URL selection',()=>{
  const selected={...EMPTY_JOB_SEARCH,query:'Mechanic',countryCode:'FI',workplaceType:'remote'};
  const l=load({'src/shared/i18n/V2LanguageProvider.tsx':language('en'),[feature+'model/useJobCategories.ts']:{useJobCategories:()=>({items:[],loading:false,error:false,reload(){}})},
    [feature+'model/useJobSearchUrl.ts']:{useJobSearchUrl:()=>({search:selected,change(){}})},
    [feature+'model/usePublicJobs.ts']:{usePublicJobs:()=>({page:{items:[],has_more:false},loading:false,error:false,canPrevious:false,reset(){},reload(){},next(){},previous(){}})}});
  const html=renderToStaticMarkup(React.createElement(l(feature+'components/JobDiscoveryPage.tsx').default));
  assert.match(html,/value="Mechanic"/);assert.match(html,/value="FI" selected=""/);assert.match(html,/value="remote" selected=""/);
  assert.match(html,/<\/form>.*No jobs match this search\..*<button[^>]*>Clear filters<\/button>/s);
});

scenario('an unchanged renewal keeps its deadline and is described as no change rather than a false extension',async()=>{
  const f=fixture({initial:published(),scope:J});f.state.write=async intent=>({...mutation(intent,f.state.server),changed:false});await f.session.renew();
  assert.equal(f.session.getSnapshot().message,'nothingChanged');assert.equal(f.session.getSnapshot().job.active_until,E);assert.equal(f.writes().length,1);f.session.retire();
});

scenario('expired resume and missing public profile provide exact guidance without a silent renewal or duplicate draft',async()=>{
  const f=fixture({initial:published({status:'paused'}),scope:J});f.state.write=async()=>{throw new JobError('renewal');};await f.session.status('published');
  assert.equal(f.session.getSnapshot().message,'renewal');assert.equal(f.session.getSnapshot().phase,'editing');
  assert.deepEqual(f.writes().map(row=>row.intent.operation),['status']);assert.equal(f.session.getSnapshot().job.status,'paused');f.session.retire();
  const fresh=fixture();fresh.state.write=async intent=>{if(intent.operation==='publish')throw new JobError('profile');fresh.state.server=owner();return mutation(intent,owner());};
  await fresh.session.submit(content,[policy]);assert.equal(fresh.session.getSnapshot().message,'profile');assert.equal(fresh.saved().jobId,J);assert.equal(fresh.saved().intent,null);
  assert.deepEqual(fresh.writes().map(row=>row.intent.operation),['save','publish']);fresh.session.retire();
});

after(()=>{
  const drift=[...inputs].filter(([name,hash])=>sha(fs.readFileSync(path.join(root,name)))!==hash).map(([name])=>name);
  proof.finishedAt=new Date().toISOString();proof.inputDrift=drift;proof.sources=Object.fromEntries([...inputs].sort());
  proof.testSource={path:'tests/jobs-client.test.cjs',sha256:sha(fs.readFileSync(__filename))};
  proof.loaderSource={path:'tests/helpers/jobs-public-loader.cjs',sha256:sha(fs.readFileSync(path.join(__dirname,'helpers/jobs-public-loader.cjs')))};
  proof.runtime={node:process.version,typescript:require('typescript').version,react:React.version};
  proof.status=drift.length||proof.cases.some(row=>row.status!=='PASS')?'FAIL':'PASS';
  if(process.env.SELQIRO_JOBS_CLIENT_PROOF)fs.writeFileSync(process.env.SELQIRO_JOBS_CLIENT_PROOF,JSON.stringify(proof,null,2)+'\n');
  assert.deepEqual(drift,[]);
});
