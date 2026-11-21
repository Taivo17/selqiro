'use strict';
// The DTOs below are captured from the actual local SQL repair runtime with
// synthetic accounts. Consumers are the real TypeScript API/parsers/React SSR
// and anonymous metadata reader; RPC transport is mocked, not a hosted probe.
const {test,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loader,root,config,project,jsonResponse}=require('./helpers/jobs-public-loader.cjs');
const fixturePath='supabase/repairs/20261121_job_image_read/tests/public-read-fixtures.json';
const fixtureBytes=fs.readFileSync(path.join(root,fixturePath)),fixtures=JSON.parse(fixtureBytes);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),clone=value=>JSON.parse(JSON.stringify(value));
const inputs=new Map(),proof={format:'selqiro-job-image-read-client-proof-20261121-v1',
  boundary:'Actual TypeScript clients/parsers, React server rendering and anonymous metadata using local SQL-generated synthetic DTOs. No hosted user data, browser layout or image decoding.',cases:[]};
function source(overrides={}) {const load=loader(overrides);return name=>{const result=load(name);
  for(const [file,hash] of load.inputs){if(inputs.has(file))assert.equal(inputs.get(file),hash);inputs.set(file,hash);}return result;};}
const base=source(),parsers=base('src/entities/job/model/jobParsers.ts');
const {EMPTY_JOB_SEARCH}=base('src/entities/job/model/types.ts');
const {getCatalogTranslation}=base('lib/i18n/useTranslation.ts');
const language={useV2Translation:catalog=>({language:'et',t:(key,params)=>getCatalogTranslation('et',catalog,key,params)})};
const privateItem=page=>{const item=page.items.find(item=>item.employer.identity_type==='private');assert.ok(item);return item;};
function api(value) {const calls=[],load=source({'src/shared/supabase/browserClient.ts':{supabaseBrowserClient:{rpc(name,args){calls.push({name,args});
  return{abortSignal:async()=>({data:clone(value),error:null})};}}}});return{...load('src/entities/job/api/jobClient.ts'),calls};}
function scenario(name,body){test(name,async context=>{await body(context);proof.cases.push({name,status:'PASS'});});}

scenario('SQL image correction keeps the private task and existing business job together in public search',async()=>{
  const page=fixtures.after.legacy.search,client=api(page);
  const result=await client.searchPublicJobs(EMPTY_JOB_SEARCH,null,new AbortController().signal,page.result_limit);
  assert.equal(result.items.length,2);assert.deepEqual(new Set(result.items.map(item=>item.employer.identity_type)),new Set(['private','business']));
  const task=privateItem(result);assert.equal(task.content.employmentType,'task');assert.equal(task.content.workingTime,null);
  for(const field of ['salaryMin','salaryMax','salaryCurrency','salaryPeriod'])assert.equal(task.content[field],null);
  assert.equal(task.employer.logo_url,null);assert.doesNotMatch(JSON.stringify(result),/data:image\//i);
  assert.deepEqual(client.calls,[{name:'search_public_jobs_v1',args:{p_query:'',p_category:null,p_country_code:null,p_city:null,
    p_workplace_type:null,p_employment_type:null,p_working_time:null,p_result_limit:page.result_limit,p_cursor:null}}]);
  const Card=source({'src/shared/i18n/V2LanguageProvider.tsx':language})('src/features/jobs/components/JobCard.tsx').default;
  const html=renderToStaticMarkup(React.createElement('div',null,result.items.map(item=>React.createElement(Card,{key:item.content_id,job:item}))));
  assert.match(html,/Eraisik/);assert.match(html,/Ettevõte/);assert.match(html,/Tööots/);assert.match(html,/Töökoht/);
  for(const item of result.items)assert.ok(html.includes('href="/v2/job/'+item.content_id+'"'));
});

scenario('SQL image correction is consumed by public job detail and the matching private profile',async()=>{
  for(const state of ['legacy','managed','removed']){
    const {detail,profile}=fixtures.after[state],detailClient=api(detail),profileClient=api(profile);
    const item=await detailClient.getPublicJob(detail.content_id,new AbortController().signal);
    assert.deepEqual(item,detail);assert.deepEqual(detailClient.calls,[{name:'get_public_job_v1',args:{p_job_id:detail.content_id}}]);
    const page=await profileClient.getProfileJobs(profile.seller_slug,profile.identity_id,null,new AbortController().signal,profile.result_limit);
    assert.equal(page.items.length,1);assert.equal(page.items[0].content_id,detail.content_id);assert.deepEqual(page.items[0],item);
    assert.deepEqual(profileClient.calls,[{name:'get_public_profile_jobs_v1',args:{p_seller_slug:profile.seller_slug,p_result_limit:profile.result_limit,p_cursor:null}}]);
    assert.throws(()=>parsers.parseJobPage(profile,profile.result_limit,{kind:'profile',slug:profile.seller_slug,identityId:fixtures.after.legacy.search.items.find(item=>item.employer.identity_type==='business').identity_id}));
  }
  assert.equal(fixtures.after.removed.detail.employer.logo_url,null);
  assert.ok(fixtures.after.managed.detail.employer.logo_url.startsWith(project+'/storage/v1/object/public/identity-media/'));
});

scenario('mixed job pagination retains exact cursor binding and rejects duplicates or reversed ordering',async()=>{
  const {first,second}=fixtures.pagination,firstClient=api(first),secondClient=api(second);
  const pageOne=await firstClient.searchPublicJobs(EMPTY_JOB_SEARCH,null,new AbortController().signal,first.result_limit);
  assert.equal(pageOne.has_more,true);assert.ok(pageOne.next_cursor);
  const pageTwo=await secondClient.searchPublicJobs(EMPTY_JOB_SEARCH,pageOne.next_cursor,new AbortController().signal,second.result_limit);
  assert.equal(pageTwo.items.length,1);assert.equal(pageTwo.has_more,false);assert.notEqual(pageOne.items[0].content_id,pageTwo.items[0].content_id);
  assert.deepEqual(secondClient.calls[0].args.p_cursor,pageOne.next_cursor);
  const mixed=clone(fixtures.after.legacy.search);mixed.items.reverse();assert.throws(()=>parsers.parseJobPage(mixed,mixed.result_limit,{kind:'search'}));
  const duplicate=clone(fixtures.after.legacy.search);duplicate.items[1]=clone(duplicate.items[0]);assert.throws(()=>parsers.parseJobPage(duplicate,duplicate.result_limit,{kind:'search'}));
  const wrongNext=clone(first);wrongNext.next_cursor.id=pageTwo.items[0].content_id;assert.throws(()=>parsers.parseJobPage(wrongNext,wrongNext.result_limit,{kind:'search'}));
  assert.throws(()=>parsers.parseJobPage(first,first.result_limit,{kind:'search'},first.next_cursor));
});

scenario('legacy oversized image reproduction and unknown public fields still fail closed at the client boundary',()=>{
  const before=fixtures.before.search,legacy=privateItem(before);assert.ok(legacy.employer.logo_url.length>4096);
  assert.throws(()=>parsers.parseJobPage(before,before.result_limit,{kind:'search'}));
  for(const change of [item=>{item.employer.owner_email='private@example.invalid';},item=>{item.owner_user_id='11111111-1111-4111-8111-111111111111';},
    item=>{item.employer.identity_type='admin';},item=>{item.employer.logo_url='data:image/jpeg;base64,'+'A'.repeat(8192);}]){
    const page=clone(fixtures.after.legacy.search);change(privateItem(page));assert.throws(()=>parsers.parseJobPage(page,page.result_limit,{kind:'search'}));
  }
  for(const oldItem of before.items){const current=fixtures.after.legacy.search.items.find(item=>item.content_id===oldItem.content_id);assert.ok(current);
    const old=clone(oldItem),now=clone(current);delete old.employer.logo_url;delete now.employer.logo_url;assert.deepEqual(now,old);}
});

scenario('job share metadata uses bounded current media and never leaks legacy inline or unsafe image references',async context=>{
  const {readAnonymousOfferPreview:preview}=base('src/server/sharing/anonymousOfferPreview.ts');
  context.mock.method(Date,'now',()=>Date.parse(fixtures.after.legacy.search.read_at));
  for(const state of ['legacy','managed','removed']){
    const {detail}=fixtures.after[state],calls=[];
    const result=await preview('job',detail.content_id,config,async(url,init)=>{calls.push({url,init});return jsonResponse(detail);});
    assert.ok(result);assert.equal(result.title,detail.content.title);assert.equal(result.image,detail.employer.logo_url);
    assert.equal(calls.length,1);assert.equal(calls[0].url,project+'/rest/v1/rpc/get_public_job_v1');
    assert.equal(calls[0].init.credentials,'omit');assert.equal(new Headers(calls[0].init.headers).get('cookie'),null);
    assert.deepEqual(JSON.parse(calls[0].init.body),{p_job_id:detail.content_id});assert.doesNotMatch(JSON.stringify(result),/data:image\/|owner_email|owner_user_id/i);
  }
  for(const logo of ['data:image/jpeg;base64,AA==','https://tracker.invalid/picture.jpg',project+'/storage/v1/object/sign/identity-media/private.jpg?token=private']){
    const item=clone(fixtures.after.legacy.detail);item.employer.logo_url=logo;
    const result=await preview('job',item.content_id,config,async()=>jsonResponse(item));assert.equal(result?.title,item.content.title);assert.equal(result?.image,null);
    assert.doesNotMatch(JSON.stringify(result),/tracker\.invalid|token=private|data:image\//i);
  }
  const legacy=privateItem(fixtures.before.search);assert.equal(await preview('job',legacy.content_id,config,async()=>jsonResponse(legacy)),null);
});

after(()=>{
  proof.sources=Object.fromEntries([...inputs].sort());proof.fixture={path:fixturePath,sha256:sha(fixtureBytes)};
  proof.test={path:'tests/job-image-read.test.cjs',sha256:sha(fs.readFileSync(__filename))};
  proof.sourceDrift=[...inputs].filter(([name,hash])=>sha(fs.readFileSync(path.join(root,name)))!==hash).map(([name])=>name);
  if(sha(fs.readFileSync(path.join(root,fixturePath)))!==proof.fixture.sha256)proof.sourceDrift.push(fixturePath);
  proof.runtime={node:process.version,typescript:require('typescript').version,react:React.version};
  proof.status=proof.cases.length===5&&!proof.sourceDrift.length?'PASS':'FAIL';
  if(process.env.SELQIRO_JOB_IMAGE_READ_CLIENT_PROOF)fs.writeFileSync(process.env.SELQIRO_JOB_IMAGE_READ_CLIENT_PROOF,JSON.stringify(proof,null,2)+'\n');
  assert.deepEqual(proof.sourceDrift,[]);assert.equal(proof.status,'PASS');
});
