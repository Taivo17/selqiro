'use strict';
// Run actual TS/TSX modules with installed TypeScript; no bundler, DOM or network.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), ts=require('typescript');
const {createHash}=require('node:crypto'), React=require('react');
const root=path.resolve(__dirname,'../..');
function loader(overrides={}) {
  const cache=new Map(), inputs=new Map();
  function load(name) {
    const file=path.resolve(root,name), relative=path.relative(root,file).split(path.sep).join('/');
    if(!file.startsWith(root+path.sep))throw new Error('test_source_outside_root');
    if(Object.hasOwn(overrides,relative))return overrides[relative];
    if(cache.has(file))return cache.get(file).exports;
    if(relative.endsWith('.css'))return {__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};
    const bytes=fs.readFileSync(file), digest=createHash('sha256').update(bytes).digest('hex');
    inputs.set(relative,digest);
    const module={exports:{}};cache.set(file,module);
    const result=ts.transpileModule(bytes.toString(),{fileName:file,compilerOptions:{
      target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}});
    function local(name) {
      if(name==='server-only')return {};
      if(name==='next/link')return {__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)};
      if(!name.startsWith('.')&&!name.startsWith('@/'))return require(name);
      const resolved=name.startsWith('@/')?path.resolve(root,name.slice(2)):path.resolve(path.dirname(file),name);
      return load(fs.existsSync(resolved)?resolved:fs.existsSync(resolved+'.ts')?resolved+'.ts':resolved+'.tsx');
    }
    vm.runInThisContext('(function(module,exports,require){'+result.outputText+'\n})',{filename:file})(module,module.exports,local);
    return module.exports;
  }
  load.inputs=inputs;
  return load;
}
const language=(value='en')=>({useV2Translation:catalog=>({language:value,t:key=>catalog[value]?.[key]??catalog.en[key]})});
const U='11111111-1111-4111-8111-111111111111', I='22222222-2222-4222-8222-222222222222';
const J='33333333-3333-4333-8333-333333333333', P='44444444-4444-4444-8444-444444444444';
const project='https://vyjletlmwoiwxsnsunlm.supabase.co', origin='https://selqiro.vercel.app';
const jwt=role=>Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'
  +Buffer.from(JSON.stringify({role,ref:'vyjletlmwoiwxsnsunlm',exp:4102444800})).toString('base64url')+'.synthetic';
const config={projectOrigin:project,publicKey:jwt('anon')};
const job=(extra={})=>({schema_version:1,content_type:'job',content_id:J,identity_id:I,status:'published',
  content:{title:'Test engineer',description:'Work with a local team.',category:'engineering',countryCode:'EE',city:'Paide',
    locationLabel:null,workplaceType:'on_site',employmentType:null,workingTime:null,
    salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null},
  created_at:'2026-11-16T08:00:00Z',updated_at:'2026-11-16T08:00:00Z',published_at:'2026-11-16T08:00:00Z',
  active_until:'2099-12-16T08:00:00Z',employer:{name:'Public employer',slug:'public-employer',logo_url:null},...extra});
const jsonResponse=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
module.exports={loader,root,language,U,I,J,P,project,origin,jwt,config,job,jsonResponse,deferred};
