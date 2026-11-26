'use strict';
// Real TS model/client and React SSR; RPC replies are synthetic, no database or browser is claimed.
const {test}=require('node:test'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loader,job}=require('./helpers/jobs-public-loader.cjs');
const M='src/entities/job/model/',F='src/features/jobs/',API='src/entities/job/api/jobClient.ts';
const language={useV2Translation:catalog=>({language:'et',t:(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replaceAll('{'+k+'}',String(v)),catalog.et[key]??catalog.en[key])})};
const categories={useJobCategories:()=>({items:[{code:'logistics',labels:{et:'Transport ja logistika',en:'Transport and logistics'}}],loading:false,error:false,reload(){}})};
const load=(overrides={})=>loader({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{}},'src/shared/i18n/V2LanguageProvider.tsx':language,[F+'model/useJobCategories.ts']:categories,...overrides});
const base=load(),{EMPTY_JOB_SEARCH,JOB_EMPLOYMENT_TYPES,JOB_SEARCH_EMPLOYMENT_TYPES}=base(M+'types.ts');
const {readJobSearch,jobSearchUrl}=base(F+'model/jobSearchUrl.ts');
const {jobSearchPurpose,changeJobSearchPurpose,changeJobSearchWorkingTime}=base(F+'model/jobSearchPurpose.ts');
const {parseJobContent}=base(M+'jobContent.ts');
const renderForm=value=>renderToStaticMarkup(React.createElement(base(F+'components/JobSearchForm.tsx').default,{value,onSearch(){}}));

test('employment aggregate is search-only and never becomes saved job content',()=>{
  assert.ok(JOB_SEARCH_EMPLOYMENT_TYPES.includes('employment'));
  assert.ok(!JOB_EMPLOYMENT_TYPES.includes('employment'));
  assert.throws(()=>parseJobContent({...job().content,employmentType:'employment'}));
  const value={...EMPTY_JOB_SEARCH,employmentType:'employment'};
  assert.equal(jobSearchUrl(value),'/v2/jobs?employment=employment');
  assert.deepEqual(readJobSearch('employment=employment'),value);
  assert.equal(jobSearchPurpose(value),'employment');
});

test('existing exact employment and task links keep their meaning and filter values',()=>{
  for(const employmentType of JOB_EMPLOYMENT_TYPES){
    const input={...EMPTY_JOB_SEARCH,query:'aia töö',category:'logistics',countryCode:'JP',city:'Tokyo',workplaceType:'on_site',employmentType,workingTime:employmentType==='task'?null:'flexible'};
    const url=jobSearchUrl(input);
    assert.deepEqual(readJobSearch(url.split('?')[1]),input);
    assert.equal(jobSearchPurpose(input),employmentType==='task'?'task':'employment');
  }
  assert.equal(jobSearchUrl(EMPTY_JOB_SEARCH),'/v2/jobs');
  assert.equal(readJobSearch('employment=task&hours=full_time').workingTime,null);
});

test('unknown search kinds and private navigation data do not become URL filters',()=>{
  const parsed=readJobSearch('employment=anything&country=ee&kind=task&identity=private&next=https://bad.invalid');
  assert.equal(parsed.employmentType,null);
  assert.equal(parsed.countryCode,'EE');
  assert.equal(jobSearchUrl(parsed),'/v2/jobs?country=EE');
});

test('direction changes preserve common search but clear the prior subtype and workload',()=>{
  const input={...EMPTY_JOB_SEARCH,query:'Snow',category:'logistics',countryCode:'EE',city:'Paide',workplaceType:'on_site',employmentType:'fixed_term',workingTime:'part_time'};
  const task=changeJobSearchPurpose(input,'task');
  assert.deepEqual(task,{...input,employmentType:'task',workingTime:null});
  const employment=changeJobSearchPurpose(task,'employment');
  assert.deepEqual(employment,{...input,employmentType:'employment',workingTime:null});
  const all=changeJobSearchPurpose(input,'all');
  assert.deepEqual(all,{...input,employmentType:null,workingTime:null});
  assert.equal(jobSearchPurpose(all),'all');
  assert.equal(input.employmentType,'fixed_term');
});

test('legacy workload-only links retain visible employee filters and can clear workload without losing direction',()=>{
  const legacy=readJobSearch('hours=part_time');
  assert.equal(legacy.employmentType,null);
  assert.equal(jobSearchUrl(legacy),'/v2/jobs?hours=part_time');
  assert.equal(jobSearchPurpose(legacy),'employment');
  const changed=changeJobSearchWorkingTime(legacy,null);
  assert.equal(changed.employmentType,'employment');
  assert.equal(changed.workingTime,null);
  const task=changeJobSearchWorkingTime({...EMPTY_JOB_SEARCH,employmentType:'task'},'full_time');
  assert.equal(task.workingTime,null);
  assert.equal(task.employmentType,'task');
});

test('employment search sends the server aggregate before pagination and retains the current RPC signature',async()=>{
  const calls=[],cursor={published_at:'2026-11-21T12:00:00Z',id:'55555555-5555-4555-8555-555555555555'};
  const l=load({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc(name,args){calls.push({name,args});return{abortSignal:async()=>({data:{schema_version:1,items:[],result_limit:24,has_more:false,next_cursor:null,read_at:'2026-11-26T12:00:00Z'},error:null})};}}}});
  await l(API).searchPublicJobs({...EMPTY_JOB_SEARCH,employmentType:'employment'},cursor,new AbortController().signal);
  assert.equal(calls.length,1);
  assert.equal(calls[0].name,'search_public_jobs_v1');
  assert.equal(calls[0].args.p_employment_type,'employment');
  assert.deepEqual(calls[0].args.p_cursor,cursor);
  assert.deepEqual(Object.keys(calls[0].args).sort(),['p_query','p_category','p_country_code','p_city','p_workplace_type','p_employment_type','p_working_time','p_result_limit','p_cursor'].sort());
});

test('an unsupported aggregate is reported without fetching mixed results as a fallback',async()=>{
  const calls=[];
  const l=load({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc(name,args){calls.push({name,args});return{abortSignal:async()=>({data:null,error:{code:'22023',message:'job_search_invalid'},status:400})};}}}});
  await assert.rejects(()=>l(API).searchPublicJobs({...EMPTY_JOB_SEARCH,employmentType:'employment'},null,new AbortController().signal),error=>error.kind==='invalid');
  assert.equal(calls.length,1);
});

test('all-offers view presents two explicit directions and visible country/city without employee-specific selectors',()=>{
  const html=renderForm(EMPTY_JOB_SEARCH);
  assert.match(html,/Otsin töökohta/);assert.match(html,/Otsin tööotsi/);assert.match(html,/aria-pressed="true"[^>]*>Kõik pakkumised/);
  const beforeMore=html.split('<details')[0];
  assert.match(beforeMore,/Riik/);assert.match(beforeMore,/Linn või piirkond/);
  assert.match(beforeMore,/Lähedasi kohti automaatselt ei kaasata/);
  assert.doesNotMatch(html,/value="permanent"|value="full_time"/);
});

test('task direction hides employee subtype and workload while employee direction restores both',()=>{
  const taskHtml=renderForm({...EMPTY_JOB_SEARCH,employmentType:'task'});
  assert.match(taskHtml,/name="job-search-purpose" checked="" value="task"/);
  assert.doesNotMatch(taskHtml,/value="fixed_term"|value="full_time"/);
  const employmentHtml=renderForm({...EMPTY_JOB_SEARCH,employmentType:'employment'});
  assert.match(employmentHtml,/name="job-search-purpose" checked="" value="employment"/);
  assert.match(employmentHtml,/value="employment" selected=""/);
  assert.match(employmentHtml,/value="fixed_term"/);assert.match(employmentHtml,/value="full_time"/);
  assert.doesNotMatch(employmentHtml,/<option value="task"/);
});

test('position cards show the real subtype and omit an invented subtype for unspecified positions',()=>{
  const Card=base(F+'components/JobCard.tsx').default;
  for(const [type,label] of [['permanent','Tähtajatu'],['fixed_term','Tähtajaline']]){
    const html=renderToStaticMarkup(React.createElement(Card,{job:job({content:{...job().content,employmentType:type}})}));
    assert.match(html,/Töökoht/);assert.ok(html.includes(label));
  }
  const unspecified=renderToStaticMarkup(React.createElement(Card,{job:job()}));
  assert.doesNotMatch(unspecified,/Tähtajatu|Tähtajaline/);
  const task=renderToStaticMarkup(React.createElement(Card,{job:job({content:{...job().content,employmentType:'task'}})}));
  assert.match(task,/Tööots/);assert.doesNotMatch(task,/Tähtajatu|Tähtajaline/);
});
