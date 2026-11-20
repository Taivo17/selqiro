"use strict";
// Actual TypeScript listing reader, My Area and header callbacks, with synthetic RPC replies.
// No network, live database rows, account writes, image uploads or browser session.
const {test,after}=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),ts=require("typescript"),{createHash}=require("node:crypto");
const root=path.resolve(__dirname,".."),sources=new Map(),sha=b=>createHash("sha256").update(b).digest("hex");
const U="11111111-1111-4111-8111-111111111111",I="22222222-2222-4222-8222-222222222222";
function source(relative){const file=path.join(root,relative),bytes=fs.readFileSync(file),hash=sha(bytes);if(sources.has(relative))assert.equal(sources.get(relative),hash);sources.set(relative,hash);return bytes.toString();}
function compile(text,file){return ts.transpileModule(text,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;}
function loader(client){const cache=new Map();function load(relative){
 const file=path.resolve(root,relative),rel=path.relative(root,file).split(path.sep).join("/");assert.ok(file.startsWith(root+path.sep));
 if(rel==="src/shared/supabase/browserClient.ts")return{supabaseBrowserClient:client};
 if(rel==="src/shared/config/v2Integration.ts")return{v2IntegrationEnabled:()=>false};
 if(cache.has(rel))return cache.get(rel).exports;
 const code=compile(source(rel),file),module={exports:{}};cache.set(rel,module);
 function local(name){if(!name.startsWith(".")&&!name.startsWith("@/"))return require(name);const stem=name.startsWith("@/")?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name);const found=[stem,stem+".ts",stem+".tsx"].find(p=>fs.existsSync(p)&&fs.statSync(p).isFile());assert.ok(found,"Missing dependency "+name);return load(path.relative(root,found));}
 vm.runInThisContext("(function(module,exports,require){"+code+"\n})",{filename:file})(module,module.exports,local);return module.exports;
}return load;}
function listingFixture({card={display_name:"Public seller",slug:"public-seller",avatar_url:"https://example.invalid/public.webp"},cardError=null,existing={},identityCard=null,identityCardError=null,storeCard=null,viewer=null,viewerIdentity=I,activeProfile=null,myIdentities=[]}={}){
 const calls=[],row={id:7,user_id:U,identity_id:null,status:"active",active_until:"2099-01-01T00:00:00Z",title:"A public listing",description:"Description",price:"25.50",price_amount:"25.50",currency:"EUR",...existing};
 const client={auth:{async getUser(){calls.push({name:"auth"});return{data:{user:viewer},error:null};}},from(table){
  calls.push({name:"from",table});assert.ok(table==="listings"||(viewer&&table==="profiles"),"Reader must not query another account or raw identity profile table");
  return{select(){return{eq(field,id){assert.equal(field,"id");assert.equal(id,table==="listings"?"7":viewer.id);return{async maybeSingle(){return{data:table==="listings"?{...row}:{active_identity_id:viewerIdentity},error:null};}};}};}};
 },rpc(name,args){
  calls.push({name,args});if(name==="get_marketplace_listings")return Promise.resolve({data:[],error:null});
  if(name==="get_public_legacy_profile_card_v1")return{async maybeSingle(){return{data:card,error:cardError};}};
  if(name==="get_identity_profile_public")return{async maybeSingle(){return{data:identityCard,error:identityCardError};}};
  if(name==="get_store_by_slug")return Promise.resolve({data:storeCard?[storeCard]:[],error:null});
  if(name==="get_my_active_identity_profile")return Promise.resolve({data:activeProfile?[activeProfile]:[],error:null});
  if(name==="get_my_identities")return Promise.resolve({data:myIdentities,error:null});assert.fail("Unexpected RPC "+name);
 }};
 return{calls,load:()=>loader(client)("src/entities/listing/api/getListingById.ts").getListingById("7")};
}
function myAreaFixture({active=I,plan="premium",planError=null,profileError=null,initialPlan="free"}={}){
 const file="app/my-page/page.tsx",text=source(file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==="fetchProfile")found.push(node);ts.forEachChild(node,visit);}visit(ast);assert.equal(found.length,1);assert.ok(found[0].initializer);
 const state={profile:null,language:null,plan:initialPlan,country:null,city:null},calls=[];
 const client={from(table){calls.push({name:"from",table});assert.equal(table,"profiles","My Area must not read private plan from public profile table");return{select(){return{eq(field,user){assert.equal(field,"id");assert.equal(user,U);return{async maybeSingle(){return{data:profileError?null:{id:U,active_identity_id:active,language:"et",is_premium:false,premium_until:null},error:profileError};}};}};}};},rpc(name,args){calls.push({name,args});if(name==="get_my_identity_profile_plan_v1")return{async maybeSingle(){return{data:plan===null?null:{plan},error:planError};}};if(name==="get_my_active_identity_profile_details")return Promise.resolve({data:[{identity_id:active,country:"Estonia",city:"Paide"}],error:null});assert.fail("Unexpected RPC "+name);}};
 const context={supabase:client,setProfile:value=>{state.profile=value;},setLanguage:value=>{state.language=value;},setIdentityPlan:value=>{state.plan=value;},setHomeCountry:value=>{state.country=value;},setHomeCity:value=>{state.city=value;},console:{error(){}}};
 const code=compile("const fetchProfile = "+found[0].initializer.getText(ast)+"; globalThis.callback = fetchProfile;",file);
 vm.runInNewContext(code,context,{filename:file});return{calls,state,load:()=>context.callback(U)};
}
function headerFixture({active=I,identities=[{id:I,type:"business",display_name:"Public business",slug:"business-slug",avatar_url:null}]}={}){
 const file="app/components/site-header.tsx",text=source(file),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found=[];
 function visit(node){if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==="loadProfileSlug")found.push(node);ts.forEachChild(node,visit);}visit(ast);assert.equal(found.length,1);assert.ok(found[0].initializer);
 const calls=[],state={slug:null,language:null,identity:null,identities:null,languageLoaded:false,loading:false};
 const client={from(table){calls.push({name:"from",table});assert.equal(table,"profiles","Header must not overwrite RPC slugs using a recursive raw identity profile read");return{select(){return{eq(field,user){assert.equal(field,"id");assert.equal(user,U);return{async maybeSingle(){return{data:{active_identity_id:active,store_slug:"legacy-slug",store_name:"Own account",language:"et"},error:null};}};}};}};},rpc(name){calls.push({name});assert.equal(name,"get_my_identities");return Promise.resolve({data:identities,error:null});}};
 const context={supabase:client,userId:U,userEmail:"private@example.invalid",mounted:true,setStoreSlug:value=>{state.slug=value;},setLanguage:value=>{state.language=value;},setActiveIdentity:value=>{state.identity=value;},setIdentities:value=>{state.identities=value;},setLanguageLoaded:value=>{state.languageLoaded=value;},setLoadingStoreSlug:value=>{state.loading=value;},console:{error(){}}};
 const code=compile("const loadProfileSlug = "+found[0].initializer.getText(ast)+"; globalThis.callback = loadProfileSlug;",file);vm.runInNewContext(code,context,{filename:file});
 return{calls,state,load:()=>context.callback()};
}
const proof={format:"selqiro-profile-read-privacy-client-tests-v1",started_at:new Date().toISOString(),cases:[],boundary:"Actual TypeScript functions and mapper; synthetic read-only Supabase. My Area and header callbacks are extracted using TypeScript AST from the actual components. No live database or browser/React rendering."};
function scenario(name,body){test(name,async()=>{try{await body();proof.cases.push({name,status:"PASS"});}catch(error){proof.cases.push({name,status:"FAIL",error:error.message});throw error;}});}
scenario("anonymous legacy listing keeps public seller name, slug and avatar using bounded RPC",async()=>{
 const f=listingFixture(),result=await f.load();assert.equal(result.sellerName,"Public seller");assert.equal(result.sellerSlug,"public-seller");assert.equal(result.sellerAvatarUrl,"https://example.invalid/public.webp");assert.equal(result.priceAmount,"25.50");
 assert.deepEqual(f.calls.filter(c=>c.name==="get_public_legacy_profile_card_v1"),[{name:"get_public_legacy_profile_card_v1",args:{p_user_id:U}}]);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("hidden or absent public seller card does not fall back to account table",async()=>{
 const f=listingFixture({card:null}),result=await f.load();assert.equal(result.id,"7");assert.equal(result.sellerName,"");assert.equal(result.sellerSlug,null);assert.equal(result.sellerAvatarUrl,null);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("public card transport failure preserves listing without private profile retry",async()=>{
 const f=listingFixture({card:null,cardError:{code:"42501",message:"synthetic unavailable"}}),result=await f.load();assert.equal(result.title,"A public listing");assert.equal(result.sellerName,"");assert.equal(f.calls.filter(c=>c.name==="get_public_legacy_profile_card_v1").length,1);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("public card adds only presentation fields and cannot overwrite listing money or copy account fields",async()=>{
 const f=listingFixture({card:{display_name:"Public seller",slug:"public-seller",avatar_url:null,email:"private@example.invalid",home_lat:59,active_identity_id:I,price_amount:"999999",currency:"USD"}}),result=await f.load();
 assert.equal(result.priceAmount,"25.50");assert.equal(result.currency,"EUR");assert.equal(result.identityId,null);assert.equal(Object.hasOwn(result,"email"),false);assert.equal(Object.hasOwn(result,"home_lat"),false);assert.equal(JSON.stringify(result).includes("private@example.invalid"),false);
});
scenario("listing without seller account does not ask for a different public profile",async()=>{
 const f=listingFixture({existing:{user_id:null}}),result=await f.load();assert.equal(result.id,"7");assert.equal(f.calls.some(c=>c.name==="get_public_legacy_profile_card_v1"),false);
});
scenario("public identity listing uses the bounded identity card RPC without raw profile reads",async()=>{
 const f=listingFixture({existing:{identity_id:I},identityCard:{display_name:"Business seller",slug:"business-seller",avatar_url:"https://example.invalid/business.webp"}}),result=await f.load();
 assert.equal(result.sellerName,"Business seller");assert.equal(result.sellerSlug,"business-seller");assert.equal(result.sellerAvatarUrl,"https://example.invalid/business.webp");assert.deepEqual(f.calls.filter(c=>c.name==="get_identity_profile_public"),[{name:"get_identity_profile_public",args:{p_identity_id:I}}]);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("identity card denial keeps public listing readable without a raw table retry",async()=>{
 const f=listingFixture({existing:{identity_id:I,user_id:null},identityCardError:{code:"42501"}}),result=await f.load();assert.equal(result.id,"7");assert.equal(result.sellerName,"");assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("slug decoration uses the sanitized store RPC and does not repeat a direct slug lookup",async()=>{
 const f=listingFixture({existing:{seller_slug:"canonical-store"},storeCard:{identity_id:I,display_name:"Canonical seller",slug:"canonical-store",avatar_url:"https://example.invalid/canonical.webp"}}),result=await f.load();
 assert.equal(result.sellerName,"Canonical seller");assert.equal(result.sellerSlug,"canonical-store");assert.equal(f.calls.filter(c=>c.name==="get_store_by_slug").length,1);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("unavailable store slug never falls back to raw identity profile rows",async()=>{
 const f=listingFixture({existing:{seller_slug:"closed-store",user_id:null}}),result=await f.load();assert.equal(result.id,"7");assert.equal(result.sellerName,"");assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings"]);
});
scenario("owner seller fallback uses the matching accessible identity when active profile RPC has no row",async()=>{
 const f=listingFixture({viewer:{id:U},existing:{identity_id:I,status:"draft"},myIdentities:[{id:"33333333-3333-4333-8333-333333333333",display_name:"Other owned identity",slug:"other-owned"},{id:I,display_name:"Own business",slug:"own-business",avatar_url:"https://example.invalid/own.webp"}]}),result=await f.load();
 assert.equal(result.id,"7");assert.equal(result.sellerName,"Own business");assert.equal(result.sellerSlug,"own-business");assert.equal(result.sellerAvatarUrl,"https://example.invalid/own.webp");assert.equal(f.calls.filter(c=>c.name==="get_my_identities").length,1);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["listings","profiles"]);
});
scenario("header keeps canonical slugs from its accessible identity RPC",async()=>{
 const f=headerFixture();await f.load();assert.equal(f.state.slug,"business-slug");assert.equal(f.state.identity.id,I);assert.equal(f.state.identities[0].slug,"business-slug");assert.equal(f.state.language,"et");assert.equal(f.state.languageLoaded,true);assert.equal(f.state.loading,false);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["profiles"]);
});
scenario("header preserves all accessible identity slugs when active identity is not the first row",async()=>{
 const f=headerFixture({identities:[{id:"33333333-3333-4333-8333-333333333333",type:"private",display_name:"Own private",slug:"private-slug"},{id:I,type:"business",display_name:"Own business",slug:"business-slug"}]});await f.load();assert.equal(f.state.identity.id,I);assert.equal(f.state.slug,"business-slug");assert.deepEqual(JSON.parse(JSON.stringify(f.state.identities.map(row=>row.slug))),["private-slug","business-slug"]);
});
scenario("My Area reads the selected identity plan from restricted RPC and keeps own account preferences",async()=>{
 const f=myAreaFixture();await f.load();assert.equal(f.state.plan,"premium");assert.equal(f.state.language,"et");assert.equal(f.state.city,"Paide");assert.deepEqual(JSON.parse(JSON.stringify(f.calls.filter(c=>c.name==="get_my_identity_profile_plan_v1"))),[{name:"get_my_identity_profile_plan_v1",args:{p_identity_id:I}}]);assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["profiles"]);
});
scenario("business and free plans keep their existing presentation semantics",async()=>{
 for(const plan of ["business","free"]){const f=myAreaFixture({plan});await f.load();assert.equal(f.state.plan,plan);}
});
scenario("no active identity clears the previous premium display and makes no plan or location request",async()=>{
 const f=myAreaFixture({active:null,initialPlan:"premium"});await f.load();assert.equal(f.state.plan,"free");assert.equal(f.calls.some(c=>c.name==="get_my_identity_profile_plan_v1"),false);assert.equal(f.calls.some(c=>c.name==="get_my_active_identity_profile_details"),false);
});
scenario("inaccessible plan response clears the previous premium display without a private table fallback",async()=>{
 const f=myAreaFixture({plan:null,planError:{code:"42501",message:"synthetic inaccessible"},initialPlan:"premium"});await f.load();assert.equal(f.state.plan,"free");assert.deepEqual(f.calls.filter(c=>c.name==="from").map(c=>c.table),["profiles"]);
});
scenario("missing or unsupported plan response maps to free",async()=>{
 for(const plan of [null,"unexpected",42]){const f=myAreaFixture({plan,initialPlan:"premium"});await f.load();assert.equal(f.state.plan,"free");}
});
scenario("failed own-account read clears the previous premium display and does not try another identity plan",async()=>{
 const f=myAreaFixture({profileError:{code:"42501"},initialPlan:"premium"});await f.load();assert.equal(f.state.profile,null);assert.equal(f.state.plan,"free");assert.equal(f.calls.some(c=>c.name==="get_my_identity_profile_plan_v1"),false);
});
after(()=>{
 const drift=[...sources].filter(([relative,hash])=>sha(fs.readFileSync(path.join(root,relative)))!==hash).map(([relative])=>relative);assert.deepEqual(drift,[]);
 proof.finished_at=new Date().toISOString();proof.status=proof.cases.some(c=>c.status!=="PASS")||drift.length?"FAIL":"PASS";proof.source_drift=drift;proof.sources=Object.fromEntries([...sources].sort());proof.runtime={node:process.version,typescript:ts.version};proof.test_source={path:"tests/profile-read-privacy-callers.test.cjs",sha256:sha(fs.readFileSync(__filename))};
 if(process.env.SELQIRO_PROFILE_READ_CLIENT_PROOF)fs.writeFileSync(process.env.SELQIRO_PROFILE_READ_CLIENT_PROOF,JSON.stringify(proof,null,2)+"\n");
});
