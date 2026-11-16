'use strict';
// Actual canonical-link, share operation, public parsers, metadata and React SSR.
// Native share, browser clipboard, social crawlers and public SQL are synthetic.
const {test}=require('node:test'), assert=require('node:assert/strict');
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const {loader,language,J,I,P,project,origin,jwt,config,job,jsonResponse,deferred}=require('./helpers/jobs-public-loader.cjs');
const load=loader(), links=load('src/shared/sharing/offerLink.ts'), share=load('src/shared/sharing/shareOffer.ts').shareOfferLink;
const {readAnonymousOfferPreview:preview,publicPreviewImage}=load('src/server/sharing/anonymousOfferPreview.ts');
const {offerMetadata,generateOfferMetadata}=load('src/server/sharing/offerMetadata.ts');
const input={kind:'job',id:J,title:'Test engineer'};

test('canonical URLs cover all four kinds and reject injected paths, queries, fragments and ambiguous IDs',()=>{
  for(const [kind,id,route] of [['listing','9007199254740993','listing'],['horse',J,'horse-offer'],['service',J,'service'],['job',J,'job']])
    assert.equal(links.publicOfferUrl(kind,id),`${origin}/v2/${route}/${id}`);
  // Preserve the existing public ordinary-listing signed-bigint contract.
  assert.equal(links.publicOfferPath('listing','-9223372036854775808'),'/v2/listing/-9223372036854775808');
  for(const id of ['',J+'?token=private',J+'#draft',J+'/../owner',encodeURIComponent(J+'/owner'),'0'.repeat(36),J.toUpperCase()+'A'])
    assert.equal(links.publicOfferUrl('job',id),null);
  for(const id of ['01','1?next=/private','+1','1.0','9223372036854775808','-9223372036854775809'])
    assert.equal(links.publicOfferUrl('listing',id),null);
  assert.equal(links.publicOfferUrl('other',J),null);
});

test('native share starts from the call and cancellation performs no clipboard action',async()=>{
  let called=false,copied=0;const pending=deferred();
  const result=share({...input,title:' A\npublic title '},{share:payload=>{called=true;
    assert.deepEqual(payload,{title:'A public title',url:`${origin}/v2/job/${J}`});return pending.promise;},copy:async()=>{copied++;}});
  assert.equal(called,true);pending.reject(Object.assign(new Error('cancelled'),{name:'AbortError'}));
  assert.equal(await result,'cancelled');assert.equal(copied,0);
  assert.equal(await share(input,{share:async()=>{},copy:async()=>{copied++;}}),'shared');assert.equal(copied,0);
});

test('clipboard completion is awaited; denied or unavailable clipboard returns a manual-link outcome',async()=>{
  const copy=deferred();let completed=false;
  const result=share(input,{share:async()=>{throw new Error('not supported');},copy:url=>{
    assert.equal(url,`${origin}/v2/job/${J}`);return copy.promise;}}).then(value=>{completed=true;return value;});
  await Promise.resolve();assert.equal(completed,false);copy.resolve();assert.equal(await result,'copied');
  assert.equal(await share(input,{copy:async()=>{throw new Error('denied');}}),'manual');
  assert.equal(await share(input,{}),'manual');
  await assert.rejects(share({...input,id:J+'?session=secret'},{share:async()=>assert.fail('invalid ID must not reach native share')}));
});

test('shared buttons render translated text and invalid identifiers produce no actionable control',()=>{
  for(const [lang,label] of [['en','Share'],['et','Jaga']]) {
    const ui=loader({'src/shared/i18n/V2LanguageProvider.tsx':language(lang)});
    const Button=ui('src/shared/sharing/ShareOfferButton.tsx').default;
    const html=renderToStaticMarkup(React.createElement(Button,input));
    assert.match(html,new RegExp('>'+label+'</button>'));assert.match(html,/type="button"/);assert.match(html,/bg-blue-50/);
    assert.equal(renderToStaticMarkup(React.createElement(Button,{...input,id:'invalid'})),'');
  }
});

test('job preview uses one anonymous fixed-target RPC and exact item binding, without sessions or owner fallback',async()=>{
  const calls=[];
  const result=await preview('job',J,config,async(url,init)=>{calls.push({url,init});return jsonResponse(job());});
  assert.equal(result.title,'Test engineer');assert.equal(result.url,`${origin}/v2/job/${J}`);assert.equal(calls.length,1);
  const {url,init}=calls[0];assert.equal(url,project+'/rest/v1/rpc/get_public_job_v1');
  assert.equal(init.method,'POST');assert.deepEqual(JSON.parse(init.body),{p_job_id:J});
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer '+config.publicKey);assert.equal(new Headers(init.headers).get('apikey'),config.publicKey);
  assert.equal(new Headers(init.headers).get('cookie'),null);assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');
  assert.equal(init.cache,'no-store');assert.equal(init.referrerPolicy,'no-referrer');
  assert.equal(await preview('job',J,config,async()=>jsonResponse(job({content_id:P}))),null);
  assert.equal(await preview('job',J,config,async()=>jsonResponse({...job(),owner_email:'private@example.invalid'})),null);
});

test('private keys, wrong projects, missing records and closed or expired jobs produce no offer metadata',async()=>{
  let calls=0;const noCall=async()=>{calls++;return jsonResponse(job());};
  for(const publicKey of [jwt('service_role'),jwt('authenticated'),'secret','sb_secret_private'])
    assert.equal(await preview('job',J,{...config,publicKey},noCall),null);
  assert.equal(await preview('job',J,{...config,projectOrigin:'https://other.supabase.co'},noCall),null);
  assert.equal(await preview('job','invalid',config,noCall),null);assert.equal(calls,0);
  for(const value of [null,job({status:'closed'}),job({published_at:'2020-01-01T00:00:00Z',active_until:'2020-02-01T00:00:00Z'})])
    assert.equal(await preview('job',J,config,async()=>jsonResponse(value)),null);
  let deniedCalls=0;assert.equal(await preview('job',J,config,async()=>{deniedCalls++;return jsonResponse({message:'private SQL failure'},403);}),null);
  assert.equal(deniedCalls,1);
  const hidden=offerMetadata('job',J,null);assert.equal(hidden.title,'Selqiro');assert.equal(hidden.robots.index,false);
  assert.equal(hidden.alternates,undefined);assert.deepEqual(hidden.openGraph.images,[]);
  assert.doesNotMatch(JSON.stringify(hidden),/Test engineer|private SQL|owner_email/);
});

test('ordinary listing, horse and service previews reuse their public DTOs, not an owner table read',async()=>{
  const listing={schema_version:1,content_scope:'public_ordinary_listing_detail',requested_id:'123',item:{content_type:'listing',content_id:'123',
    title:'Public bike',description:'Ready to ride',title_truncated:false,description_truncated:false,
    price:{version:1,kind:'fixed',amount:'10',currency:'EUR',legacy_text:null,legacy_amount:null},
    category:null,subcategory:null,detail_category:null,condition:null,country:'EE',city:'Paide',image_url:null,images:[],
    images_has_more:false,details:[],details_truncated:false,seller_name:'Public seller',seller_slug:'seller',seller_avatar_url:null,
    seller_type:'private',created_at:'2026-11-16T08:00:00Z',active_until:'2099-12-16T08:00:00Z'}};
  const horse={schema_version:1,content_type:'horse_offer',content_id:J,offer_type:'sale',title:'Public horse',description:'A calm horse',
    price:{kind:'contact',amount:null,currency:'EUR',period:null},country:'EE',city:'Paide',region:null,fields:{},
    images:[{id:P,url:`/api/v2/horse-media/${P}/0`}],seller_name:'Public seller',seller_slug:'seller',seller_type:'private',
    published_at:'2026-11-16T08:00:00Z',active_until:'2099-12-16T08:00:00Z'};
  const service={schema_version:1,content_type:'service',content_id:J,identity_id:I,title:'Public service',description:'A local service',
    category:null,subcategory:null,price_type:'contact',price_amount:null,currency:'EUR',country:'EE',city:'Paide',location_label:null,
    images:[{id:P,url:`/api/v2/service-media/${P}/0`}],seller_name:'Public seller',seller_slug:'seller',seller_type:'business',
    published_at:'2026-11-16T08:00:00Z',updated_at:'2026-11-16T08:00:00Z'};
  for(const [kind,id,name,arg,value,title] of [['listing','123','get_public_listing_detail_v1','p_listing_id',listing,'Public bike'],
    ['horse',J,'get_public_horse_offer_v1','p_offer_id',horse,'Public horse'],['service',J,'get_public_service_v1','p_service_id',service,'Public service']]) {
    let calls=0;const result=await preview(kind,id,config,async(url,init)=>{
      calls++;assert.equal(url,project+'/rest/v1/rpc/'+name);assert.deepEqual(JSON.parse(init.body),{[arg]:id});return jsonResponse(value);});
    assert.equal(result?.title,title);assert.equal(calls,1);
  }
});

test('preview images are public bounded URLs; signed, private, query and third-party images are omitted',async()=>{
  const publicLogo=project+'/storage/v1/object/public/avatars/public-logo.png';
  assert.equal(publicPreviewImage(publicLogo,'job',project),publicLogo);
  assert.equal(publicPreviewImage(`/api/v2/service-media/${J}/0`,'service',project),`${origin}/api/v2/service-media/${J}/0`);
  for(const url of [publicLogo+'?token=secret',publicLogo+'#owner','https://tracker.invalid/a.png',
    project+'/storage/v1/object/sign/avatars/a.png',project+'/storage/v1/object/authenticated/avatars/a.png',
    `/api/v2/service-media/${J}/0`,project+'/storage/v1/object/public/avatars/a.png?download=1'])
    assert.equal(publicPreviewImage(url,'job',project),null);
  const result=await preview('job',J,config,async()=>jsonResponse(job({employer:{name:'Public employer',slug:'public-employer',logo_url:'https://tracker.invalid/private.png'}})));
  assert.equal(result.image,null);assert.equal(result.title,'Test engineer');
  const meta=offerMetadata('job',J,result);assert.equal(meta.alternates.canonical,`${origin}/v2/job/${J}`);
  assert.equal(meta.twitter.card,'summary');assert.deepEqual(meta.openGraph.images,[]);
});

test('metadata has bounded public text, no raw errors, no cross-ID metadata and no unbounded response',async()=>{
  const long=job();long.content.description='x'.repeat(9000);
  const result=await preview('job',J,config,async()=>jsonResponse(long));assert.equal(result.description.length,260);
  const meta=offerMetadata('job',J,result);assert.equal(meta.openGraph.title,'Test engineer');
  assert.equal(offerMetadata('job',P,result).title,'Selqiro');
  let calls=0;assert.equal(await preview('job',J,config,async()=>{calls++;
    return new Response('x'.repeat(65537),{status:200,headers:{'content-length':'65537'}});}),null);assert.equal(calls,1);
  assert.equal(await preview('job',J,config,async()=>{throw new Error('SECRET_ERROR');}),null);
});

test('metadata generation is disabled outside the approved hosted configuration and never reads incoming cookies',async()=>{
  const keys=['NODE_ENV','NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL','NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW',
    'NEXT_PUBLIC_SELQIRO_V2_LOCAL_INTEGRATION','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const before=Object.fromEntries(keys.map(key=>[key,process.env[key]])), oldFetch=global.fetch;let calls=0;
  try {
    for(const key of keys)delete process.env[key];
    process.env.NODE_ENV='production';process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PORTAL='v1';
    process.env.NEXT_PUBLIC_SUPABASE_URL=project;process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=config.publicKey;
    global.fetch=async(_url,init)=>{calls++;assert.equal(new Headers(init.headers).get('cookie'),null);return jsonResponse(job());};
    assert.equal((await generateOfferMetadata('job',J)).title,'Test engineer | Selqiro');assert.equal(calls,1);
    process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW='v1';
    assert.equal((await generateOfferMetadata('job',J)).title,'Selqiro');assert.equal(calls,1);
    delete process.env.NEXT_PUBLIC_SELQIRO_V2_HOSTED_PREVIEW;process.env.NEXT_PUBLIC_SUPABASE_URL='https://other.supabase.co';
    assert.equal((await generateOfferMetadata('job',J)).title,'Selqiro');assert.equal(calls,1);
  } finally {global.fetch=oldFetch;for(const key of keys)before[key]===undefined?delete process.env[key]:process.env[key]=before[key];}
});
