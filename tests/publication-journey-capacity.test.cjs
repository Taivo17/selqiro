// Actual browser journey boundary with a controlled session and HTTP response.
// No live Auth, network, Storage or database calls are made.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const USER='71000000-0000-0000-0000-000000000001',IDENTITY='72000000-0000-0000-0000-000000000002';
const build=filename=>ts.transpileModule(fs.readFileSync(filename,'utf8'),{fileName:filename,
  compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;
function loadModel(name){
  const module={exports:{}};
  vm.runInNewContext(build(path.resolve(__dirname,'../src/entities/listing/model/'+name+'.ts')),
    {module,exports:module.exports},{timeout:1000});
  return module.exports;
}
const capacity=loadModel('publicationCapacity'),timing=loadModel('photoPerformance');
function client(response){
  const calls=[],api={exports:{}};
  const dependencies={
    '../../../shared/supabase/browserClient':{supabaseBrowserClient:{auth:{getSession:async()=>
      ({data:{session:{user:{id:USER},access_token:'synthetic-session'}},error:null})}}},
    '../../../shared/config/v2Integration':{v2IntegrationEnabled:()=>true},
    '../model/publicationCapacity':capacity,
    '../model/photoPerformance':timing,
    './privateUploadHttp':{privateUploadHttp:async(fetcher,url,init,options)=>{
      calls.push({url,init,options});return response;
    }},
  };
  vm.runInNewContext(build(path.resolve(__dirname,'../src/entities/listing/api/publicationJourneyClient.ts')),
    {module:api,exports:api.exports,require:name=>{assert.ok(Object.hasOwn(dependencies,name),name);return dependencies[name];},
      window:{location:{origin:'https://selqiro.example'}},fetch:()=>{throw Error('Live fetch forbidden');},Error},
    {timeout:1000});
  return {calls,request:()=>api.exports.publicationJourneyRequest({userId:USER,identityId:IDENTITY},
    'owner-images-add-prepare',{synthetic:true},new AbortController().signal)};
}
for(const message of ['publication_open_attempt_limit','publication_daily_attempt_limit','publication_retained_bytes_limit'])
  test('journey preserves the exact known capacity class '+message,async()=>{
    const h=client({status:409,json:{error:'owner_contract',code:'54000',message}});
    await assert.rejects(h.request(),error=>error.code==='54000'&&error.message===message);
    assert.equal(h.calls.length,1);assert.equal(h.calls[0].init.headers.authorization,'Bearer synthetic-session');
  });
for(const message of ['publication_message_cleanup_limit','publication_open_attempt_limit\n','private_internal_failure'])
  test('journey keeps unrecognized capacity response unknown: '+JSON.stringify(message),async()=>{
    const h=client({status:409,json:{error:'owner_contract',code:'54000',message}});
    await assert.rejects(h.request(),error=>error instanceof Error&&error.message==='outcome_unknown');
    assert.equal(h.calls.length,1);
  });

for(const [message,reason] of [
  ['publication_open_attempt_limit','open_attempts'],
  ['publication_daily_attempt_limit','daily_attempts'],
  ['publication_retained_bytes_limit','retained_capacity'],
])test('capacity reason preserves the known SQL class '+message,()=>{
  const error={code:'54000',message};
  assert.equal(capacity.isPublicationCapacityError(error),true);
  assert.equal(capacity.publicationCapacityReason(error),reason);
});
test('capacity reasons reject unknown errors and malformed classes without broadening the existing guard',()=>{
  for(const value of [null,undefined,false,'publication_open_attempt_limit',[],
    {code:54000,message:'publication_open_attempt_limit'},
    {code:'40001',message:'publication_open_attempt_limit'},
    {code:'54000',message:'publication_open_attempt_limit\n'},
    {code:'54000',message:'private_internal_failure'},
    {code:'54000',message:'toString'},
    Object.assign([],{code:'54000',message:'publication_open_attempt_limit'}),
  ]){
    assert.equal(capacity.isPublicationCapacityError(value),false);
    assert.equal(capacity.publicationCapacityReason(value),null);
  }
});
