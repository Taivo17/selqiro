'use strict';
// Actual TS validators, request recovery and React SSR. Database/Auth/HTTP answers are synthetic.
const {test,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loader,root,U,I,J,P,job}=require('./helpers/jobs-public-loader.cjs');
const M='src/entities/job/model/',F='src/features/jobs/',API='src/entities/job/api/jobClient.ts';
const actor={userId:U,identityId:I},T='2026-11-21T12:00:00Z',E='2026-12-21T12:00:00Z';
const inputHashes=new Map(),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const language=(value='et')=>({useV2Translation:catalog=>({language:value,t:(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),catalog[value]?.[key]??catalog.en[key])})});
function load(overrides={}){const l=loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{}},'src/shared/i18n/V2LanguageProvider.tsx':language(),...overrides});return name=>{const module=l(name);for(const [key,hash] of l.inputs){if(inputHashes.has(key))assert.equal(inputHashes.get(key),hash);inputHashes.set(key,hash);}return module;};}
const base=load(),{parseJobContent,JOB_CONTENT_KEYS}=base(M+'jobContent.ts'),{parseJobIntent}=base(M+'jobIntent.ts');
const parsers=base(M+'jobParsers.ts'),forms=base(F+'model/jobForm.ts'),{EMPTY_JOB_SEARCH,JobError}=base(M+'types.ts');
const {parseJobPending}=base(F+'model/jobPending.ts'),{JobSession}=base(F+'model/jobSession.ts');
const content=job().content,task={...content,title:'Lume lükkamine',employmentType:'task',workingTime:null,salaryMin:'75.5',salaryMax:null,salaryCurrency:'EUR',salaryPeriod:'task'};
const policy={documentId:P,version:'2026-11',contentHash:'a'.repeat(64),accepted:true};
const owner=(value=content,extra={})=>({schema_version:1,content_type:'job',actor_user_id:U,identity_id:I,job_id:J,edit_revision:'1',status:'draft',content:value,created_at:T,updated_at:T,published_at:null,active_until:null,last_confirmed_at:null,...extra});
const intent=(value=content)=>parseJobIntent({actor,requestKey:'55555555-5555-4555-8555-555555555555',operation:'save',input:{job_id:null,expected_revision:null,content:value,policy_snapshot:[]}},actor);
const mutation=(i,row)=>({schema_version:1,actor_user_id:U,identity_id:I,request_key:i.requestKey,operation:i.operation,job:row,changed:true});
const categories={useJobCategories:()=>({items:[{code:'other',labels:{en:'Other',et:'Muu'}}],loading:false,error:false,reload(){}})};
const proof={kind:'personal-jobs-client-v1',startedAt:new Date().toISOString(),cases:[],boundary:'Real TS content/form/parser/recovery and React SSR; synthetic identity and RPC answers. No browser layout, hosted SQL or messages sent.'};
function scenario(name,body){test(name,async()=>{try{await body();proof.cases.push({name,status:'PASS'});}catch(e){proof.cases.push({name,status:'FAIL',error:e.message});throw e;}});}

scenario('specific task retains the exact thirteen-key content contract and exact whole-task pay',()=>{
  const parsed=parseJobContent(task);assert.equal(Object.keys(parsed).length,13);assert.deepEqual(Object.keys(parsed).sort(),[...JOB_CONTENT_KEYS].sort());
  assert.equal(parsed.employmentType,'task');assert.equal(parsed.salaryPeriod,'task');
  const normalized=forms.jobFormContent({...forms.jobToForm(task),salaryMin:'75,50',salaryMax:'90,10'});
  assert.equal(normalized.salaryMin,'75.5');assert.equal(normalized.salaryMax,'90.1');
  const t=(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',v),base(F+'model/jobMessages.ts').jobMessages.et[key]);
  assert.equal(forms.jobSalary(normalized,t),'75.5–90.1 EUR kogu töö eest');
  for(const period of ['hour','day','week','month','year','task'])assert.equal(parseJobContent({...task,salaryPeriod:period}).salaryPeriod,period);
  for(const change of [{workingTime:'part_time'},{employmentType:'permanent'},{salaryMin:'75.001'},{salaryMin:'91',salaryMax:'90'},{salaryCurrency:'UNKNOWN'}])assert.throws(()=>parseJobContent({...task,...change}));
  const unpaid={...task,salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null};assert.equal(parseJobContent(unpaid).salaryPeriod,null);
});

scenario('changing the work choice clears hidden task-incompatible fields without changing description or amount',()=>{
  const original={...forms.jobToForm(content),employmentType:'permanent',workingTime:'full_time',salaryMin:'50',salaryCurrency:'EUR',salaryPeriod:'hour'};
  const changed=forms.changeJobFormField(original,'employmentType','task');assert.equal(changed.workingTime,'');assert.equal(changed.salaryPeriod,'hour');assert.equal(changed.salaryMin,'50');
  assert.equal(original.workingTime,'full_time');assert.equal(changed.description,original.description);
  const whole={...changed,salaryPeriod:'task'},employee=forms.changeJobFormField(whole,'employmentType','');
  assert.equal(employee.salaryPeriod,'');assert.equal(employee.salaryMin,'50');assert.equal(employee.salaryCurrency,'EUR');
  assert.throws(()=>forms.jobFormContent({...employee,title:'Snow',description:'Work',category:'other'}));
  assert.equal(forms.emptyJobForm(true).employmentType,'task');assert.equal(forms.emptyJobForm(false).employmentType,'');
});

scenario('legacy saved action and receipt retain their original bytes and never gain a job-kind field',()=>{
  const old=intent(),serialized=JSON.stringify(old),pending={version:1,actor,scope:'new',jobId:null,intent:old,publishNext:{requestKey:P,policies:[policy]}};
  const restored=parseJobPending(JSON.parse(JSON.stringify(pending)),actor,'new');assert.equal(JSON.stringify(restored.intent),serialized);
  const reply={schema_version:1,actor_user_id:U,identity_id:I,request_key:old.requestKey,found:true,operation:'save',request:old.input,result:mutation(old,owner())};
  assert.equal(parsers.parseJobReceipt(reply,restored.intent).found,true);assert.equal(JSON.stringify(old),serialized);
  assert.equal(Object.hasOwn(restored.intent.input.content,'jobKind'),false);assert.equal(Object.hasOwn(restored.intent.input.content,'identity_type'),false);
  assert.throws(()=>parsers.parseJobReceipt({...reply,request:{...old.input,content:{...content,employmentType:'task'}}},old));
});

scenario('public publisher badge accepts only actual private or business values and tolerates legacy absence',()=>{
  assert.equal(parsers.parsePublicJob(job()).employer.identity_type,undefined);
  for(const identity_type of ['private','business'])assert.equal(parsers.parsePublicJob(job({content:task,employer:{...job().employer,identity_type}})).employer.identity_type,identity_type);
  for(const identity_type of [null,'personal','admin','',42])assert.throws(()=>parsers.parsePublicJob(job({employer:{...job().employer,identity_type}})));
  assert.throws(()=>parsers.parsePublicJob(job({employer:{...job().employer,identity_type:'private',email:'private@example.invalid'}})));
});

scenario('private and business editor pages both render an enabled real form with appropriate initial choice',()=>{
  for(const type of ['private','business']){
    const identity={id:I,type,displayName:'My public name',avatarUrl:null,slug:'my-public-name'};
    const l=load({[F+'model/useJobCategories.ts']:categories,[F+'model/useJobEditor.ts']:{useJobEditor:()=>({context:{anonymous:false},identity,bound:{key:I,session:{}},view:{phase:'editing',job:null,pending:null,message:null,completion:0},ready:true,error:false,policies:[],reload(){}})}});
    const html=renderToStaticMarkup(React.createElement(l(F+'components/JobEditorPage.tsx').default));
    assert.match(html,/<form/);assert.doesNotMatch(html,/<fieldset disabled/);assert.doesNotMatch(html,/vali ettevõtte identiteet/);
    assert.match(html,new RegExp('name="job-purpose" checked="" value="'+(type==='private'?'task':'employment')+'"'));
    assert.match(html,type==='private'?/Eraisik/:/Ettevõte/);assert.match(html,/Otsin töö tegijat/);assert.match(html,/Otsin töötajat/);
  }
});

scenario('owner jobs load for both supported profile types and remain disabled while identity is unverified',()=>{
  for(const type of ['private','business',null]){
    let enabled;
    const l=load({[F+'model/useOwnerJobs.ts']:{useOwnerJobs:(a,allow)=>{assert.deepEqual(a,actor);enabled=allow;return{page:{items:[owner(task)],read_at:T,has_more:false},loading:false,error:false,canPrevious:false,next(){},previous(){},reload(){}};}}});
    const identity=type?{id:I,type,displayName:'My public name',avatarUrl:null,slug:'my-public-name'}:null;
    const html=renderToStaticMarkup(React.createElement(l(F+'components/MyJobsSection.tsx').default,{identity,actor,loading:false,error:null}));
    assert.equal(enabled,!!type);if(type){assert.match(html,/Lume lükkamine/);assert.match(html,/Tööots/);}else assert.doesNotMatch(html,/Lume lükkamine/);
    renderToStaticMarkup(React.createElement(l(F+'components/MyJobsSection.tsx').default,{identity,actor,loading:true,error:null}));assert.equal(enabled,false);
  }
});

scenario('task fields expose a full-task payment option without hidden employee workload or subtype',()=>{
  const Fields=base(F+'components/JobFields.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Fields,{form:forms.jobToForm(task),change(){},categories:categories.useJobCategories().items,disabled:false}));
  assert.match(html,/Kogu töö eest/);assert.match(html,/value="task" selected=""/);assert.match(html,/lume lükkamine, puude ladumine, aia parandamine või muru niitmine/);
  assert.doesNotMatch(html,/Töösuhte tüüp|Tööaeg|value="full_time"|value="permanent"/);
  const employment=renderToStaticMarkup(React.createElement(Fields,{form:forms.jobToForm(content),change(){},categories:[],disabled:false}));
  assert.match(employment,/Töösuhte tüüp/);assert.match(employment,/Tööaeg/);assert.doesNotMatch(employment,/>Kogu töö eest<\/option>/);
});

scenario('public task card shows actual publisher type, neutral navigation and the total rather than a monthly amount',()=>{
  const Card=base(F+'components/JobCard.tsx').default;
  for(const identity_type of ['private','business']){
    const html=renderToStaticMarkup(React.createElement(Card,{job:job({content:task,employer:{...job().employer,identity_type}})}));
    assert.match(html,/Tööots/);assert.match(html,/75.5 EUR kogu töö eest/);assert.match(html,identity_type==='private'?/Eraisik/:/Ettevõte/);assert.match(html,new RegExp('href="/v2/job/'+J+'"'));
  }
  const legacy=renderToStaticMarkup(React.createElement(Card,{job:job()}));assert.match(legacy,/Töökoht/);assert.doesNotMatch(legacy,/Eraisik|Ettevõte/);
});

scenario('task search round-trips the existing employment filter and sends no invented RPC arguments',async()=>{
  const {readJobSearch,jobSearchUrl}=base(F+'model/jobSearchUrl.ts');
  const search={...EMPTY_JOB_SEARCH,query:'lumi',employmentType:'task'},url=jobSearchUrl(search);assert.equal(url,'/v2/jobs?q=lumi&employment=task');assert.deepEqual(readJobSearch(url.split('?')[1]),search);
  assert.equal(readJobSearch('employment=task&hours=full_time').workingTime,null);
  const calls=[],l=load({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc(name,args){calls.push({name,args});return{abortSignal:async()=>({data:{schema_version:1,items:[],result_limit:24,has_more:false,next_cursor:null,read_at:T},error:null})};}}}});
  await l(API).searchPublicJobs(search,null,new AbortController().signal);
  assert.equal(calls[0].name,'search_public_jobs_v1');assert.equal(calls[0].args.p_employment_type,'task');assert.equal(calls[0].args.p_working_time,null);assert.equal(Object.hasOwn(calls[0].args,'p_job_kind'),false);
});

scenario('task search form restores a visible task filter and does not retain a hidden workload selector',()=>{
  const l=load({[F+'model/useJobCategories.ts']:categories});
  const html=renderToStaticMarkup(React.createElement(l(F+'components/JobSearchForm.tsx').default,{value:{...EMPTY_JOB_SEARCH,employmentType:'task'},onSearch(){}}));
  assert.match(html,/name="job-search-purpose" checked="" value="task"/);assert.match(html,/Otsin tööotsi/);assert.doesNotMatch(html,/value="full_time"/);
});

scenario('a lost task save response restores the exact same thirteen-key request before any retry or publication',async()=>{
  let saved=null,calls=0,key=0;const store={read:()=>saved,write:v=>{saved=JSON.parse(JSON.stringify(v));},clear:()=>{saved=null;}};
  const client={write:async()=>{calls++;throw new JobError('unknown');},receipt:async()=>{throw new Error('unexpected read');},owner:async()=>{throw new Error('unexpected owner');}};
  const session=new JobSession({actor,scope:'new',store,client,canAct:()=>true,signal:()=>new AbortController().signal,uuid:()=>`${String(++key).padStart(8,'0')}-7777-4777-8777-777777777777`});
  await session.submit(task,[policy]);assert.equal(calls,1);assert.equal(session.getSnapshot().phase,'uncertain');const original=JSON.stringify(saved.intent);session.retire();
  const restored=new JobSession({actor,scope:'new',store,client,canAct:()=>true,signal:()=>new AbortController().signal});
  assert.equal(calls,1);assert.equal(JSON.stringify(restored.getSnapshot().pending),original);assert.deepEqual(restored.getSnapshot().pending.input.content,task);restored.retire();
});

after(()=>{proof.finishedAt=new Date().toISOString();proof.sources=Object.fromEntries([...inputHashes].sort());proof.inputDrift=[...inputHashes].filter(([name,hash])=>sha(fs.readFileSync(path.join(root,name)))!==hash).map(([name])=>name);proof.runtime={node:process.version,typescript:require('typescript').version,react:React.version};proof.testSource={path:'tests/personal-jobs-client.test.cjs',sha256:sha(fs.readFileSync(__filename))};proof.status=proof.inputDrift.length||proof.cases.some(c=>c.status!=='PASS')?'FAIL':'PASS';if(process.env.SELQIRO_PERSONAL_JOBS_CLIENT_PROOF)fs.writeFileSync(process.env.SELQIRO_PERSONAL_JOBS_CLIENT_PROOF,JSON.stringify(proof,null,2)+'\n');assert.deepEqual(proof.inputDrift,[]);});
