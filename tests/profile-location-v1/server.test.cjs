'use strict';
// Real TypeScript domain/provider/proof/service/HTTP modules, with bounded fake transports.
// No provider, Supabase, account, storage or production requests are made.
const test = require('node:test'), assert = require('node:assert/strict');
const {loader, deferred, U, I, J, P} = require('../helpers/jobs-public-loader.cjs');
const load = loader();
const countries = load('src/entities/location/model/countries.ts');
const location = load('src/entities/location/model/location.ts');
const {createLocationProofs} = load('src/server/profile-location/proof.ts');
const {createLocationProvider, normalizeLocationSuggestions} = load('src/server/profile-location/provider.ts');
const {createLocationService} = load('src/server/profile-location/service.ts');
const {createLocationTransport} = load('src/server/profile-location/transport.ts');
const {createProfileLocationHandler} = load('src/server/profile-location/handler.ts');
const {LocationError} = load('src/server/profile-location/errors.ts');
const R = '44444444-4444-4444-8444-444444444444', NEXT = '55555555-5555-4555-8555-555555555555';
const config = {projectOrigin: 'https://exampleproject.supabase.co', appOrigin: 'https://app.example.test',
  publicKey: 'synthetic-public-key', serviceKey: 'synthetic-private-server-key'};
const owner = {user_id: U, identity_id: I}, signal = () => new AbortController().signal;
const loc = extra => ({country_code:'EE', country_name:'Eesti', place_name:'Paide', region_name:'Järva maakond',
  latitude:58.885, longitude:25.555, precision:'locality', source:'geoapify', source_id:'synthetic-paide-place', source_kind:'city', ...extra});
const patch = extra => ({display_name:'Minu profiil', bio:'', website_url:'', country:'Eesti', city:'Paide',
  address_text:'', location_visibility:'city', ...extra});
const profile = extra => ({...patch(), user_id:U, identity_id:I, identity_type:'private', revision:R, slug:'minu-profiil', ...extra});
const snapshot = (p={}, l=null) => ({profile:profile(p),location:l});
const suggest = extra => ({...owner,country_code:'EE',query:'Pai',language:'et',...extra});
const save = extra => ({...owner,expected_revision:R,patch:patch(),location:{action:'keep'},...extra});
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const raw = extra => ({country_code:'ee',city:'Paide',county:'Järva maakond',lat:58.885,lon:25.555,result_type:'city',place_id:'synthetic-paide-place',...extra});
function fixture(options={}) {
  const calls=[], providers=[];
  const transport={
    authenticate:async (...args)=>{calls.push(['auth',...args.slice(0,2)]);if(options.authError)throw options.authError;},
    rpc:async (name,args,token)=>{
      calls.push([name,args,token]);
      if(options.rpc)return options.rpc(name,args,token);
      if(name==='get_my_profile_editor_v2')return options.before??snapshot();
      if(name==='reserve_profile_location_lookup_v1')return options.budget??{allowed:true,retry_after_seconds:0};
      if(name==='prepare_profile_location_v1')return {selection_id:J};
      if(name==='save_my_profile_editor_v2')return options.after??snapshot({...args.p_patch,revision:NEXT},args.p_location_command.action==='select'?loc():options.before?.location??null);
      throw Error('unexpected RPC');
    },
  };
  const provider={configured:options.configured??true,suggest:async (...args)=>{providers.push(args);return options.locations??[loc()];}};
  const service=createLocationService(config,null,{transport,provider,now:()=>1800000000000});
  return {service,calls,providers};
}
const names = calls => calls.map(row=>row[0]);

test('country catalog has 249 unique ISO identities and multilingual aliases without a network call',()=>{
  assert.equal(countries.COUNTRY_CODES.length,249);assert.equal(new Set(countries.COUNTRY_CODES).size,249);
  for(const query of ['Soo','Suomi','Finland','フィンランド'])assert.equal(countries.searchLocationCountries(query,'et')[0].code,'FI',query);
  assert.equal(countries.searchLocationCountries('日本','et')[0].code,'JP');
  assert.equal(countries.searchLocationCountries('Эстония','en')[0].code,'EE');
  assert.equal(countries.searchLocationCountries('UK','en')[0].code,'GB');
  assert.equal(countries.isLocationCountry('ZZ'),false);assert.equal(countries.isLocationCountry('ee'),false);
  assert.equal(countries.getLocationCountryName('FI','et'),'Soome');
});
test('canonical points accept zero and Unicode but reject missing, precise or nonfinite coordinates',()=>{
  assert.deepEqual(location.parseSelectedLocation(loc({latitude:0,longitude:0})),loc({latitude:0,longitude:0}));
  assert.equal(location.parseSelectedLocation(loc({country_code:'JP',country_name:'Jaapan',place_name:'東京',region_name:''})).place_name,'東京');
  for(const changes of [{latitude:null},{latitude:NaN},{longitude:Infinity},{latitude:91},{longitude:-181},
    {source_kind:'street'},{precision:'exact'},{country_code:'XX'},{address:'Secret street'},{place_name:'Bad\nname'}])
    assert.equal(location.parseSelectedLocation(loc(changes)),null);
});
test('provider normalization excludes other countries, postcodes and street-level points even under a city label',()=>{
  const result=normalizeLocationSuggestions({results:[raw(),raw({country_code:'lv',place_id:'lv-valka'}),
    raw({result_type:'postcode',place_id:'postcode'}),raw({result_type:'building',place_id:'house'}),
    raw({street:'Secret street',place_id:'street-disguised-as-city'}),raw({housenumber:'12',place_id:'house-disguised-as-city'}),
    raw({result_type:'district',place_id:'district'})]},'EE','et');
  assert.deepEqual(result,[loc()]);
});
test('provider retains city and region Unicode, rejects unknown country identities, and never invents a point',()=>{
  const result=normalizeLocationSuggestions({results:[raw({country_code:'jp',city:'東京',county:undefined,state:'東京都',lat:0,lon:0})]},'JP','et');
  assert.equal(result[0].place_name,'東京');assert.equal(result[0].latitude,0);assert.equal(result[0].country_name,'Jaapan');
  const region=normalizeLocationSuggestions({results:[raw({city:undefined,result_type:'county',county:'Järva maakond'})]},'EE','et')[0];
  assert.equal(region.precision,'region');assert.equal(region.place_name,'Järva maakond');
  assert.deepEqual(normalizeLocationSuggestions({results:[raw({lat:undefined})]},'EE','et'),[]);
  assert.throws(()=>normalizeLocationSuggestions({results:[]},'ZZ','et'),e=>e.code==='unavailable');
});
test('provider request uses a hard selected-country filter and an administrative-only type, with no browser credential',async()=>{
  let captured;
  const provider=createLocationProvider('synthetic-geoapify-api-key',async(url,init)=>{captured={url:new URL(url),init};return json({results:[raw({country_code:'fi',city:'Helsinki'})]});});
  const result=await provider.suggest('FI','Hel','et',signal());
  assert.equal(captured.url.origin,'https://api.geoapify.com');assert.equal(captured.url.searchParams.get('filter'),'countrycode:fi');
  assert.equal(captured.url.searchParams.get('type'),'locality');assert.equal(captured.url.searchParams.get('bias'),null);
  assert.equal(captured.init.headers.authorization,undefined);assert.equal(captured.init.redirect,'error');
  assert.equal(captured.init.cache,'no-store');assert.equal(result[0].country_code,'FI');
});
test('provider errors are redacted and do not fall back to an unrestricted or public Nominatim endpoint',async()=>{
  const calls=[];
  const provider=createLocationProvider('synthetic-geoapify-api-key',async(url)=>{calls.push(url);throw Error('https://private.example/?apiKey=secret');});
  await assert.rejects(provider.suggest('EE','Pai','et',signal()),e=>e.code==='unavailable'&&!e.message.includes('secret'));
  assert.equal(calls.length,1);assert.ok(calls.every(url=>url.startsWith('https://api.geoapify.com/')));
  assert.equal(createLocationProvider(null).configured,false);
});
test('proof binds normalized data, actor, project and origin and expires without trusting browser coordinates',()=>{
  let now=1800000000000;const proofs=createLocationProofs(config.serviceKey,config.projectOrigin,config.appOrigin,()=>now);
  const candidate=proofs.issue(loc(),owner);
  assert.deepEqual(proofs.verify(candidate.proof,owner),loc());
  assert.throws(()=>proofs.verify(candidate.proof,{...owner,identity_id:J}),e=>e.code==='invalid');
  assert.throws(()=>proofs.verify(candidate.proof,{...owner,user_id:P}),e=>e.code==='invalid');
  assert.throws(()=>createLocationProofs(config.serviceKey,config.projectOrigin,'https://other.test',()=>now).verify(candidate.proof,owner),e=>e.code==='invalid');
  const [payload,signature]=candidate.proof.split('.'), changed=JSON.parse(Buffer.from(payload,'base64url'));
  changed.location.latitude=1;
  assert.throws(()=>proofs.verify(Buffer.from(JSON.stringify(changed)).toString('base64url')+'.'+signature,owner),e=>e.code==='invalid');
  now+=1800000;assert.throws(()=>proofs.verify(candidate.proof,owner),e=>e.code==='selectionExpired');
});
test('suggestions verify current account and owner before reserving the shared quota or calling the provider',async()=>{
  const f=fixture();const result=await f.service.suggest('captured-user-token',suggest(),signal());
  assert.deepEqual(names(f.calls),['auth','get_my_profile_editor_v2','reserve_profile_location_lookup_v1']);
  assert.equal(f.calls[1][2],'captured-user-token');assert.equal(f.calls[2][2],null);
  assert.equal(f.providers.length,1);assert.equal(result.suggestions.length,1);
  assert.ok(!JSON.stringify(result).includes(config.serviceKey));
});
test('unavailable or denied accounts cannot reach geocoding or the service-side quota write',async()=>{
  const f=fixture({authError:new LocationError('authChanged')});
  await assert.rejects(f.service.suggest('token',suggest(),signal()),e=>e.code==='authChanged');
  assert.deepEqual(names(f.calls),['auth']);assert.equal(f.providers.length,0);
  const g=fixture({rpc:()=>{throw new LocationError('forbidden');}});
  await assert.rejects(g.service.suggest('token',suggest(),signal()),e=>e.code==='forbidden');
  assert.deepEqual(names(g.calls),['auth','get_my_profile_editor_v2']);assert.equal(g.providers.length,0);
});
test('unconfigured geocoder and exhausted shared quota fail honestly before an upstream request',async()=>{
  const f=fixture({configured:false});await assert.rejects(f.service.suggest('token',suggest(),signal()),e=>e.code==='unavailable');
  assert.deepEqual(names(f.calls),['auth','get_my_profile_editor_v2']);assert.equal(f.providers.length,0);
  const g=fixture({budget:{allowed:false,retry_after_seconds:30}});
  await assert.rejects(g.service.suggest('token',suggest(),signal()),e=>e.code==='rateLimited');assert.equal(g.providers.length,0);
  const h=fixture({budget:{allowed:true,retry_after_seconds:-1}});
  await assert.rejects(h.service.suggest('token',suggest(),signal()),e=>e.code==='unknown');assert.equal(h.providers.length,0);
});
test('invalid suggestion inputs never issue authentication or provider requests',async()=>{
  const f=fixture();
  for(const changes of [{country_code:'ZZ'},{country_code:'ee'},{query:' '},{query:'a'},{query:'a'.repeat(121)},
    {query:'Paide\n'},{language:'auto'},{latitude:58},{user_id:'bad'}])
    await assert.rejects(f.service.suggest('token',suggest(changes),signal()),e=>e.code==='invalid');
  assert.equal(f.calls.length,0);assert.equal(f.providers.length,0);
});
test('one deliberate select-save registers a bounded capability then uses only its UUID in the authenticated write',async()=>{
  const f=fixture();const {suggestions}=await f.service.suggest('captured-token',suggest(),signal());f.calls.length=0;
  const result=await f.service.save('captured-token',save({location:{action:'select',proof:suggestions[0].proof}}),signal());
  assert.deepEqual(names(f.calls),['auth','get_my_profile_editor_v2','prepare_profile_location_v1','save_my_profile_editor_v2']);
  assert.equal(f.calls[2][2],null);assert.deepEqual(f.calls[2][1].p_location,loc());
  assert.equal(f.calls[3][2],'captured-token');assert.deepEqual(f.calls[3][1].p_location_command,{action:'select',selection_id:J});
  assert.deepEqual(result.location,loc());assert.equal(result.profile.revision,NEXT);
});
test('ordinary profile edits work without a geocoder key and preserve a confirmed point',async()=>{
  const f=fixture({configured:false,before:snapshot({},loc()),after:snapshot({bio:'Uus tutvustus',revision:NEXT},loc())});
  const result=await f.service.save('token',save({patch:patch({bio:'Uus tutvustus'})}),signal());
  assert.equal(result.profile.bio,'Uus tutvustus');assert.deepEqual(result.location,loc());
  assert.deepEqual(names(f.calls),['auth','get_my_profile_editor_v2','save_my_profile_editor_v2']);assert.equal(f.providers.length,0);
});
test('legacy text survives an unrelated edit and does not become a manufactured canonical point',async()=>{
  const f=fixture({configured:false,before:snapshot({country:'Suomi',city:'Old free text'})});
  const result=await f.service.save('token',save({patch:patch({country:'Suomi',city:'Old free text',bio:'Nimi ja kirjeldus'})}),signal());
  assert.equal(result.location,null);assert.equal(result.profile.city,'Old free text');
  assert.ok(!names(f.calls).includes('prepare_profile_location_v1'));
});
test('keep cannot relabel an old point and clear is an explicit removal of country and city',async()=>{
  const f=fixture({before:snapshot({},loc())});
  await assert.rejects(f.service.save('token',save({patch:patch({city:'Helsinki',country:'Soome'})}),signal()),e=>e.code==='invalid');
  assert.ok(!names(f.calls).includes('save_my_profile_editor_v2'));
  const g=fixture({before:snapshot({},loc()),after:snapshot({country:'',city:'',revision:NEXT},null)});
  const result=await g.service.save('token',save({patch:patch({country:'',city:''}),location:{action:'clear'}}),signal());
  assert.equal(result.location,null);assert.equal(result.profile.city,'');
});
test('forged proof, changed labels, direct coordinate payloads and private addresses cannot produce a save',async()=>{
  const f=fixture();const {suggestions}=await f.service.suggest('token',suggest(),signal());f.calls.length=0;
  for(const changes of [{location:{action:'select',proof:'forged'}},
    {location:{action:'select',proof:suggestions[0].proof},patch:patch({city:'Helsinki'})},
    {location:{action:'select',proof:suggestions[0].proof,latitude:1}},
    {patch:patch({address_text:'Private street 1'})},{patch:patch({location_visibility:'exact'})},
    {patch:{...patch(),latitude:58}}])await assert.rejects(f.service.save('token',save(changes),signal()),e=>e.code==='invalid');
  assert.ok(!names(f.calls).includes('prepare_profile_location_v1'));assert.ok(!names(f.calls).includes('save_my_profile_editor_v2'));
});
test('a newer server revision blocks stale text and location before preparing a capability',async()=>{
  const f=fixture({before:snapshot({revision:NEXT})});
  await assert.rejects(f.service.save('token',save(),signal()),e=>e.code==='conflict');
  assert.deepEqual(names(f.calls),['auth','get_my_profile_editor_v2']);
});
test('malformed or unrelated save acknowledgements remain unknown rather than being accepted',async()=>{
  for(const after of [snapshot({revision:R}),snapshot({revision:NEXT,user_id:J}),snapshot({revision:NEXT,bio:'Different'}),
    snapshot({revision:NEXT},loc({place_name:'Helsinki'})),{...snapshot({revision:NEXT}),extra:'no'}]){
    const f=fixture({after});await assert.rejects(f.service.save('token',save(),signal()),e=>e.code==='unknown');
    assert.equal(names(f.calls).filter(name=>name==='save_my_profile_editor_v2').length,1);
  }
});
test('unknown mutation outcome is never retried by the server',async()=>{
  const f=fixture({rpc:(name)=>{if(name==='get_my_profile_editor_v2')return snapshot();throw Error('connection lost after commit');}});
  await assert.rejects(f.service.save('token',save(),signal()));
  assert.equal(names(f.calls).filter(name=>name==='save_my_profile_editor_v2').length,1);
});
test('aborted selections cannot launch later provider or mutation stages',async()=>{
  const c=new AbortController();c.abort();const f=fixture();
  await assert.rejects(f.service.suggest('token',suggest(),c.signal));assert.equal(f.providers.length,0);
  assert.ok(!names(f.calls).includes('reserve_profile_location_lookup_v1'));
});
test('real bounded RPC transport pins user/service credentials separately and redacts arbitrary database errors',async()=>{
  const requests=[];
  const t=createLocationTransport(config,async(url,init)=>{requests.push({url,init});return json({ok:true});});
  await t.rpc('get_my_profile_editor_v2',{},'captured',signal());await t.rpc('prepare_profile_location_v1',{},null,signal());
  assert.equal(requests[0].init.headers.authorization,'Bearer captured');assert.equal(requests[0].init.headers.apikey,config.publicKey);
  assert.equal(requests[1].init.headers.authorization,'Bearer '+config.serviceKey);
  const e=createLocationTransport(config,async()=>json({code:'42501',message:'PROFILE_EDITOR_FORBIDDEN',details:'secret'},403));
  await assert.rejects(e.rpc('get_my_profile_editor_v2',{},'token',signal()),v=>v.code==='forbidden'&&!v.message.includes('secret'));
  const u=createLocationTransport(config,async()=>json({code:'42501',message:'private SQL contents',details:'secret'},403));
  await assert.rejects(u.rpc('get_my_profile_editor_v2',{},'token',signal()),v=>v.code==='unknown');
});
test('selection capability quota is reported without exposing private database diagnostics or retrying',async()=>{
  let calls=0;
  const t=createLocationTransport(config,async()=>{calls++;return json({code:'54000',message:'LOCATION_RATE_LIMITED',details:'private quota contents'},500);});
  await assert.rejects(t.rpc('prepare_profile_location_v1',{},null,signal()),v=>v.code==='rateLimited'&&v.message==='rateLimited');
  assert.equal(calls,1);
});
function request(value,extra={}){
  return new Request(config.appOrigin+'/api/v2/profile-location/save',{method:'POST',headers:{origin:config.appOrigin,host:new URL(config.appOrigin).host,
    authorization:'Bearer captured-user-token','content-type':'application/json',...extra.headers},body:JSON.stringify(value),...extra});
}
function handler(options={}){
  const calls=[];const service={suggest:async(...args)=>{calls.push(['suggest',...args]);return {suggestions:[]};},
    save:async(...args)=>{calls.push(['save',...args]);return snapshot({revision:NEXT});},...options.service};
  return {calls,run:createProfileLocationHandler(config,null,{service,environmentGuard:async()=>{},...options})};
}
test('HTTP handler rejects cross-origin or unbounded requests before any service call',async()=>{
  const h=handler();
  const foreign=new Request(config.appOrigin+'/api/v2/profile-location/save',{method:'POST',headers:{origin:'https://other.test',host:new URL(config.appOrigin).host,
    authorization:'Bearer token','content-type':'application/json'},body:'{}'});
  assert.equal((await h.run(foreign,'save')).status,403);
  const large=request({value:'x'.repeat(33000)});assert.equal((await h.run(large,'save')).status,400);
  assert.equal(h.calls.length,0);
});
test('HTTP response is private, redacted and no-store and uses the captured bearer token',async()=>{
  const h=handler();const result=await h.run(request(save()),'save');
  assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'private, no-store');
  assert.equal(h.calls[0][1],'captured-user-token');
  const e=handler({service:{save:async()=>{throw Error('secret-provider-key');}}});
  const failure=await e.run(request(save()),'save');assert.equal(failure.status,503);
  assert.deepEqual(await failure.json(),{error:'unknown'});
});
test('wall-clock bound cancels a stalled operation without retry or a false save acknowledgement',async()=>{
  const pending=deferred(),h=handler({deadlineMs:10,service:{save:async()=>pending.promise}});
  const result=await h.run(request(save()),'save');assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'unknown'});
  pending.resolve(snapshot({revision:NEXT}));
});
