import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {f,a,publicRpc,search,detail,profile,owner,receipt} from './helpers.mjs';
import {commandCases} from './commands.mjs';
import {discoveryCases} from './discovery.mjs';
import {messageCases} from './messages.mjs';
import {observe,report} from './catalog.mjs';
const {db,repair,result,authSnapshot,authBaseline,installerFacts}=f;
const read=n=>fs.readFileSync(path.join(repair,n),'utf8');
const checks=[],state={};let absent,applied;
const testSources=Object.fromEntries(fs.readdirSync(path.join(repair,'tests')).filter(n=>n.endsWith('.mjs')).map(n=>[n,f.sha(fs.readFileSync(path.join(repair,'tests',n)))]));
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
const utc=value=>{if(typeof value==='string'&&/^\d{4}-\d\d-\d\dT/.test(value))assert(/(?:Z|\+00:00)$/.test(value),value);
 else if(value&&typeof value==='object')Object.values(value).forEach(utc);};
let failure=null;
try{
 await db.exec("SET search_path=pg_catalog,pg_temp;SET timezone='UTC';SET jit=off;");
 await check('guarded_install_nonsuperuser_preserves_old_catalog_data_and_auth',async()=>{
  absent=(await result(read('preflight.sql')))[0];assert.equal(absent.state,'absent');assert(absent.ready_to_apply);
  assert(Object.values(absent.guards).every(x=>x===true));const before=await f.snapshot();
  applied=(await result(read('apply.sql')))[0];assert.equal(applied.state,'applied');
  assert.deepEqual(applied.invariants,absent.invariants);assert.deepEqual(applied.hosted_context,absent.hosted_context);
  assert.equal(applied.fingerprints.dependencies,absent.fingerprints.dependencies);
  assert.deepEqual(await f.snapshot(),before);assert.deepEqual(await authSnapshot(),authBaseline);
  assert.equal(installerFacts.rolsuper,false);assert.equal(installerFacts.auth_uid_execute_grantable,false);
  assert.deepEqual((await result(read('verify.sql')))[0],applied);
  assert.deepEqual((await result(read('apply.sql')))[0],applied,'already-applied local test does not recreate capability');
 });
 await check('public_capability_categories_and_empty_keyset_page',async()=>{
  const caps=await publicRpc('get_jobs_capabilities_v1');assert(caps.public_search&&caps.public_profile&&caps.request_receipts);
  const categories=await publicRpc('get_job_categories_v1');assert.equal(categories.items.length,14);
  assert(categories.items.every(x=>x.labels.et&&x.labels.en));const page=await search();
  assert.deepEqual(page.items,[]);assert.equal(page.has_more,false);assert.equal(page.next_cursor,null);
 });
 await commandCases(check,state);
 await discoveryCases(check,state);
 await check('all_job_wire_timestamps_are_UTC_in_nonUTC_session',async()=>{
  await db.exec("SET timezone='Europe/Tallinn'");
  try{
   utc(await detail(state.job.job_id));utc(await profile(state.slug,2));utc(await search(2));
   utc(await owner(state.job.job_id));utc(await f.call(a.member,'get_my_jobs_v1',[a.member,a.businessIdentity,2,null]));
   const keys=(await db.query('SELECT request_key FROM jobs_private.requests WHERE actor_user_id=$1 LIMIT 1',[a.member])).rows;
   utc(await receipt(keys[0].request_key));
  }finally{await db.exec("SET timezone='UTC'");}
 });
 await messageCases(check,state);
 await check('catalog_detects_policy_unavailable_unknown_ACL_and_keeps_existing_invariants',async()=>{
  const pins=JSON.parse(read('catalog-pins.json'));const baseline=(await result(read('verify.sql')))[0];assert.equal(baseline.state,'applied');
  await db.exec('BEGIN');
  try{
   await db.exec("UPDATE public.publication_policy_documents SET status='retired' WHERE policy_key='marketplace-general'");
   const absentPolicy=(await result(report(pins)))[0];assert.equal(absentPolicy.state,'incompatible');assert.equal(absentPolicy.guards.policy_foundation,false);
  }finally{await db.exec('ROLLBACK');}
  await db.exec('BEGIN');
  try{
   await db.exec('GRANT SELECT ON public.jobs TO anon');const drift=(await result(report(pins)))[0];assert.equal(drift.state,'incompatible');
  }finally{await db.exec('ROLLBACK');}
  const final=(await result(read('verify.sql')))[0];assert.deepEqual(final,baseline);assert.deepEqual(final.invariants,absent.invariants);
  assert.deepEqual(await authSnapshot(),authBaseline);
 });
 fs.writeFileSync(path.resolve(repair,'../../../..','sql-report-fixture.json'),JSON.stringify({absent,applied},null,2)+'\n');
}catch(error){failure={message:error.message,code:error.code,detail:error.detail,where:error.where,position:error.position,stack:error.code&&error.code!=='ERR_ASSERTION'?undefined:error.stack};
 console.error(JSON.stringify(failure,null,2));process.exitCode=1;}
finally{
 const reportValue={schema_version:1,kind:'jobs-public-runtime',result:failure?'FAIL':'PASS',generated_at_utc:new Date().toISOString(),checks,failure,
 installer:installerFacts,test_sources:testSources,source_modules:Object.fromEntries(f.modules.map(n=>[n,f.sha(read(n))])),
 sql_sha256:Object.fromEntries(['preflight.sql','apply.sql','verify.sql'].map(n=>[n,f.sha(read(n))])),
 live_database:false,real_user_data:false,production_storage:false,native_concurrency:false,
 limitations:['PostgreSQL/WASM executes real PostgreSQL permissions and PL/pgSQL, but serializes sessions. Conflict cases are stale/interleaved commands, not native concurrent sessions.',
 'The fixture restores accepted declarations and synthetic identities/policy/Storage metadata; it does not contact hosted services or rerun old test suites.']};
 fs.writeFileSync(path.join(repair,'runtime-result.json'),JSON.stringify(reportValue,null,2)+'\n');
 console.log(JSON.stringify({result:reportValue.result,checks:checks.length,report:path.join(repair,'runtime-result.json')}));await db.close();
}
