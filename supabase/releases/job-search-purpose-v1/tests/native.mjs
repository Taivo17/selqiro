import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const packagedLayout=fs.existsSync(path.join(root,'expected-contract.json'));
const runtime=process.env.SELQIRO_TEST_RUNTIME || path.resolve(root,'../../test-runtime');
const require=createRequire(path.join(runtime,'package.json'));
const {Client}=require('pg');
const bin=process.env.SELQIRO_PG_BIN || path.join(runtime,'node_modules/@embedded-postgres/linux-x64/native/bin');
const runName=process.argv[2] || 'runtime01';
assert.match(runName,/^runtime[0-9]+$/);
const work=path.join(root,'tests',runName),proof=path.join(work,'proof'),data=path.join(work,'data');
assert(!fs.existsSync(work),'Preserve every earlier test attempt.');
fs.mkdirSync(proof,{recursive:true});
const port=58429,tests=[],commands=[],clients=[];
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const read=n=>fs.readFileSync(path.join(root,packagedLayout&&n.startsWith('release/')?n.slice(8):n),'utf8');
const write=(n,v)=>fs.writeFileSync(path.join(proof,n),JSON.stringify(v,null,2)+'\n');
const target='public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb)';
const expected=JSON.parse(read('release/expected-contract.json'));
const config={host:'127.0.0.1',port,user:'postgres',database:'postgres'};
let db,started=false,failure,fixtureBase,fixtureHash;

function run(binary,args,name,allow=false){
 const r=spawnSync(path.join(bin,binary),args,{encoding:'utf8',timeout:30000});
 fs.writeFileSync(path.join(work,name),r.stdout+r.stderr);
 commands.push({binary,args,exit_code:r.status,log:name,sha256:hash(r.stdout+r.stderr)});
 if(!allow)assert.equal(r.status,0,r.stdout+r.stderr);
 return r;
}
async function connect(database='fixture'){
 const c=new Client({...config,database});await c.connect();await c.query('SET search_path=pg_catalog');clients.push(c);return c;
}
async function test(name,fn){const t=Date.now();await fn();tests.push({name,passed:true,duration_ms:Date.now()-t});console.log('PASS '+name);}
const rows=r=>(Array.isArray(r)?r:[r]).flatMap(x=>x.rows||[]);
function report(r){const a=rows(r);assert.equal(a.length,1);assert.deepEqual(Object.keys(a[0]),['result']);return a[0].result;}
const literal=x=>JSON.stringify(x).replaceAll("'","''");
function adapted(name){
 const sql=read('release/'+name),needle="'"+literal(expected.base)+"'::jsonb b";
 assert(sql.includes(needle));return sql.replaceAll(needle,()=>"'"+literal(fixtureBase)+"'::jsonb b");
}
async function catalog(c=db){return (await c.query(read('release/catalog-query.sql'))).rows[0];}
async function reject(c,sql,args,code,message){
 let e;try{await c.query(sql,args);}catch(error){e=error;}
 assert(e,'Expected SQL rejection');if(code)assert.equal(e.code,code,e.message);if(message)assert.match(e.message,new RegExp(message));return e;
}
async function snapshotFunctions(){
 return (await db.query(`SELECT p.oid::regprocedure::text signature,
 encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') definition,
 pg_get_userbyid(p.proowner) owner, p.proacl::text acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND p.prokind='f'
 ORDER BY p.oid::regprocedure::text COLLATE "C"`)).rows;
}
async function snapshotRows(){
 const v={};for(const t of ['public.jobs','jobs_private.categories','jobs_private.requests','public.user_publication_policy_acceptances',
  'auth.users','account_lifecycle_private.account_states','public.identities','public.identity_profiles','public.profiles',
  'public.business_accounts','public.business_members','public.user_blocks','provider_controls_private.hidden_providers'])
  v[t]=(await db.query("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) value FROM "+t+' t')).rows[0].value;
 return v;
}
const uid=n=>'10000000-0000-0000-0000-'+String(n).padStart(12,'0');
const iid=n=>'20000000-0000-0000-0000-'+String(n).padStart(12,'0');
const jid=n=>'40000000-0000-0000-0000-'+String(n).padStart(12,'0');
const business='30000000-0000-0000-0000-000000000001';
const subtypeValues=['permanent','fixed_term','contract','internship','other',null,'task'];
const fixtureJobs=[];
async function addJob(n,options={}){
 const employment=options.employment===undefined?subtypeValues[n%7]:options.employment;
 const entry={n,id:jid(n),identity:n%4===0?iid(2):n%7===0?iid(4):iid(1),
  employment,country:n%3===0?'FI':'EE',city:n%3===0?'Vantaa':n%2===0?'Paide':'Tallinn',
  category:n%3===0?'logistics':'engineering',workplace:n%3===0?'remote':'on_site',
  workingTime:employment==='task'?null:n%2===0?'part_time':'full_time',
  published:new Date(Date.UTC(2026,9,1,12,Math.floor(n/4))).toISOString(),
  title:'Snow opportunity '+n,description:'Synthetic clearing work',...options};
 await db.query(`INSERT INTO public.jobs(id,identity_id,created_by_user_id,title,description,category,country_code,city,
 location_label,workplace_type,employment_type,working_time,status,created_at,updated_at,published_at,active_until)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,'Approximate public area',$9,$10,$11,'published',$12,$12,$12,'2099-01-01Z')`,
 [entry.id,entry.identity,uid(5),entry.title,entry.description,entry.category,entry.country,entry.city,entry.workplace,entry.employment,entry.workingTime,entry.published]);
 fixtureJobs.push(entry);return entry;
}
async function search(options={},c=db){
 const {query='',category=null,country=null,city=null,workplace=null,employment=null,workingTime=null,limit=50,cursor=null}=options;
 return (await c.query('SELECT public.search_public_jobs_v1($1,$2,$3,$4,$5,$6,$7,$8,$9) result',
  [query,category,country,city,workplace,employment,workingTime,limit,cursor])).rows[0].result;
}
const ids=r=>r.items.map(x=>x.content_id);
const order=values=>[...values].sort((a,b)=>b.published.localeCompare(a.published)||b.id.localeCompare(a.id));
const expectedIds=values=>order(values).map(x=>x.id);
const stripClock=r=>{const {read_at,...rest}=r;return rest;};
async function pages(options={},c=db){
 const result=[],seen=[];let cursor=null;
 do{
  const value=await search({...options,cursor},c);result.push(...value.items);seen.push(value);
  assert.equal(value.has_more,value.next_cursor!==null);
  if(value.has_more){assert(value.items.length===options.limit);assert.equal(value.next_cursor.id,value.items.at(-1).content_id);}
  cursor=value.next_cursor;assert(seen.length<100,'Cursor terminates');
 }while(cursor);
 assert.equal(new Set(result.map(x=>x.content_id)).size,result.length,'No duplicate rows');
 return {items:result,pages:seen};
}
async function withChange(sql,args,fn){
 await db.query('BEGIN');try{if(sql)await db.query(sql,args);await fn();}finally{await db.query('ROLLBACK');}
}
async function actor(value,fn){
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[value||'']);
 try{return await fn();}finally{await db.query("SELECT set_config('request.jwt.claim.sub','',false)");}
}

try{
 assert.equal(run('postgres',['--version'],'version.log').stdout.trim(),'postgres (PostgreSQL) 17.6');
 run('initdb',['-D',data,'-A','trust','-U','postgres','--no-locale','--encoding=UTF8'],'initdb.log');
 run('pg_ctl',['-D',data,'-l',path.join(work,'postgres.log'),'-o',`-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,'-w','start'],'start.log');started=true;
 const admin=await connect('postgres');await admin.query('CREATE DATABASE fixture');db=await connect();
 await db.query(read('tests/fixture.sql'));
 await test('native_PostgreSQL_17_6',async()=>assert.equal((await db.query('SHOW server_version_num')).rows[0].server_version_num,'170006'));
 await test('production_jsonb_fingerprints_are_canonical',async()=>{
  for(const k of ['base','before','after'])assert.equal((await db.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') h",[expected[k]])).rows[0].h,expected.fingerprints[k]);
 });
 const initial=await catalog();fixtureBase=initial.b;
 fixtureHash=(await db.query("SELECT encode(sha256(convert_to($1::jsonb::text,'UTF8')),'hex') h",[fixtureBase])).rows[0].h;
 write('fixture-base.json',fixtureBase);
 await test('accepted_old_target_body_metadata_and_ACL_are_exact',async()=>assert.deepEqual(initial.t,expected.before));
 await test('unmodified_production_preflight_rejects_synthetic_base',async()=>{
  const r=report(await db.query(read('release/preflight.sql')));assert.equal(r.state,'unknown');assert.equal(r.recognized,false);write('production-preflight-fixture-refusal.json',[{result:r}]);
 });
 await test('adapted_metadata_preflight_is_read_only_before',async()=>{
  const r=report(await db.query(adapted('preflight.sql')));assert.equal(r.state,'before');assert.equal(r.read_only,true);assert.equal(r.base_fingerprint,fixtureHash);
  write('preflight-envelope.json',[{result:r}]);
 });
 await db.query('INSERT INTO auth.users(id,created_at) SELECT x,now() FROM unnest($1::uuid[]) x',[[1,2,3,4,5].map(uid)]);
 await db.query("INSERT INTO public.business_accounts(id,owner_user_id,name) VALUES($1,$2,'Synthetic business')",[business,uid(2)]);
 await db.query('INSERT INTO public.business_members(business_account_id,user_id) VALUES($1,$2),($1,$3)',[business,uid(2),uid(5)]);
 await db.query("INSERT INTO public.identities(id,type,user_id,business_account_id) VALUES($1,'private',$2,NULL),($3,'business',NULL,$4),($5,'private',$6,NULL),($7,'private',$8,NULL)",
  [iid(1),uid(1),iid(2),business,iid(3),uid(3),iid(4),uid(4)]);
 await db.query('INSERT INTO public.profiles(id,active_identity_id) VALUES($1,$2),($3,$4),($5,$6),($7,$8),($9,$4)',
  [uid(1),iid(1),uid(2),iid(2),uid(3),iid(3),uid(4),iid(4),uid(5)]);
 await db.query("INSERT INTO public.identity_profiles(identity_id,slug,display_name) VALUES($1,'fixture-private','Private'),($2,'fixture-business','Business'),($3,'fixture-viewer','Viewer'),($4,'fixture-other','Other')",[iid(1),iid(2),iid(3),iid(4)]);
 await db.query('INSERT INTO listing_publication_private.hosted_preview_actors(actor_user_id) SELECT x FROM unnest($1::uuid[]) x',[[1,2,3,4,5].map(uid)]);
 for(let n=1;n<=28;n++)await addJob(n);
 await addJob(29,{employment:'permanent',country:'JP',city:'Tokyo',category:'logistics',workplace:'remote',workingTime:'flexible',title:'Cargo driver',description:'Synthetic cargo opportunity'});
 const baseline={};for(const e of [null,...subtypeValues.filter(Boolean)])baseline[String(e)]=stripClock(await search({employment:e}));
 await test('old_search_rejects_search_only_sentinel',()=>reject(db,'SELECT public.search_public_jobs_v1(p_employment_type=>$1)',['employment'],'22023','job_search_invalid'));
 const rowBefore=await snapshotRows(),functionsBefore=await snapshotFunctions();
 await test('unknown_target_ACL_refuses_before_DDL',async()=>{
  await db.query('GRANT EXECUTE ON FUNCTION '+target+' TO service_role');
  try{assert.equal(report(await db.query(adapted('preflight.sql'))).state,'unknown');await reject(db,adapted('apply.sql'),undefined,'55000','BEFORE_STATE_MISMATCH');await db.query('ROLLBACK');}
  finally{await db.query('REVOKE EXECUTE ON FUNCTION '+target+' FROM service_role');}
  assert.deepEqual((await catalog()).t,expected.before);
 });
 await test('injected_after_DDL_failure_rolls_back_without_acknowledgement',async()=>{
  const broken=adapted('apply.sql').replace('COMMIT;',"DO $fail$ BEGIN RAISE EXCEPTION 'synthetic_after_ddl'; END $fail$;\nCOMMIT;");
  await reject(db,broken,undefined,'P0001','synthetic_after_ddl');await db.query('ROLLBACK');assert.deepEqual((await catalog()).t,expected.before);assert.deepEqual(await snapshotRows(),rowBefore);
 });
 await test('one_apply_commits_before_exact_after_acknowledgement',async()=>{
  const sql=adapted('apply.sql');assert(sql.indexOf('COMMIT;')<sql.lastIndexOf("'stage','apply'"));
  const r=report(await db.query(sql));assert.equal(r.state,'after');assert.equal(r.fence_verified,true);assert.equal(r.target_fingerprint,expected.fingerprints.after);
  assert.deepEqual(await catalog(),{b:fixtureBase,t:expected.after});write('apply-envelope.json',[{result:r}]);
 });
 await test('independent_connection_verifies_committed_after',async()=>{
  const c=await connect();const r=report(await c.query(adapted('verify.sql')));assert.equal(r.state,'after');write('verify-envelope.json',[{result:r}]);
 });
 await test('only_search_function_body_changes_and_all_rows_are_preserved',async()=>{
  const after=await snapshotFunctions();assert.equal(after.length,functionsBefore.length);
  const changed=after.filter((f,i)=>JSON.stringify(f)!==JSON.stringify(functionsBefore[i]));assert.equal(changed.length,1);assert.equal(changed[0].signature,target);
  const beforeTarget=functionsBefore.find(f=>f.signature===target);assert.equal(changed[0].acl,beforeTarget.acl);assert.equal(changed[0].owner,beforeTarget.owner);
  assert.deepEqual(await snapshotRows(),rowBefore);write('preservation.json',{changed_functions:[target],all_other_functions_equal:true,function_count:after.length,rows_before_sha256:hash(JSON.stringify(rowBefore)),rows_after_sha256:hash(JSON.stringify(await snapshotRows())),relation_count:Object.keys(rowBefore).length});
 });
 await test('all_and_each_existing_subtype_keep_complete_JSON_results',async()=>{
  for(const e of [null,...subtypeValues.filter(Boolean)])assert.deepEqual(stripClock(await search({employment:e})),baseline[String(e)]);
 });
 await test('employment_includes_every_non_task_and_NULL_subtype',async()=>{
  const r=await search({employment:'employment'});assert.deepEqual(ids(r),expectedIds(fixtureJobs.filter(x=>x.employment!=='task')));
  assert(r.items.some(x=>x.content.employmentType===null));assert(r.items.every(x=>x.content.employmentType!=='task'));
  write('employment-wire.json',{request:{employment:'employment'},result:r});
 });
 for(const [purpose,predicate] of [['employment',x=>x.employment!=='task'],['task',x=>x.employment==='task'],[null,()=>true],['contract',x=>x.employment==='contract']]){
  await test('interleaved_tied_cursor_pages_'+String(purpose),async()=>{
   for(const limit of [1,3,7]){const p=await pages({employment:purpose,limit});assert.deepEqual(p.items.map(x=>x.content_id),expectedIds(fixtureJobs.filter(predicate)));}
  });
 }
 await test('purpose_filter_runs_before_cursor_and_page_limit',async()=>{
  const first=await search({employment:'employment',limit:3});assert.equal(first.items.length,3);assert.deepEqual(ids(first),expectedIds(fixtureJobs.filter(x=>x.employment!=='task')).slice(0,3));
  const last=order(fixtureJobs).at(-1);const empty=await search({employment:'employment',limit:3,cursor:{id:last.id,published_at:last.published}});assert.deepEqual(empty.items,[]);assert.equal(empty.has_more,false);assert.equal(empty.next_cursor,null);
 });
 const filterCases=[
  ['category',{category:'logistics'},x=>x.category==='logistics'],
  ['country',{country:'FI'},x=>x.country==='FI'],
  ['city_case_and_trim',{city:' pAiDe '},x=>x.city==='Paide'],
  ['workplace',{workplace:'remote'},x=>x.workplace==='remote'],
  ['working_time',{workingTime:'part_time'},x=>x.workingTime==='part_time'],
  ['keyword',{query:'snow clearing'},x=>x.title.startsWith('Snow')],
  ['combined',{query:'cargo',category:'logistics',country:'JP',city:' Tokyo ',workplace:'remote',workingTime:'flexible'},x=>x.n===29]
 ];
 for(const [label,options,predicate] of filterCases)await test('common_filters_'+label,async()=>{
  const expectedRows=fixtureJobs.filter(x=>x.employment!=='task'&&predicate(x));assert(expectedRows.length>0);
  const p=await pages({...options,employment:'employment',limit:2});assert.deepEqual(p.items.map(x=>x.content_id),expectedIds(expectedRows));
 });
 await test('unmatched_filters_return_empty_envelope',async()=>{
  const r=await search({employment:'employment',query:'unmatchabletoken'});assert.deepEqual(r.items,[]);assert.equal(r.has_more,false);assert.equal(r.next_cursor,null);
 });
 await test('existing_invalid_input_validation_is_unchanged',async()=>{
  for(const options of [{employment:'Employment'},{employment:'employment '},{employment:''},{employment:'missing'},
   {category:'missing'},{country:'ee'},{city:'x'.repeat(161)},{query:'x'.repeat(301)},{workplace:'other'},{workingTime:'other_invalid'},
   {limit:null},{limit:0},{limit:51},{cursor:{}},{cursor:{id:jid(1),published_at:'infinity'}},{cursor:{id:jid(1),published_at:'2026-01-01Z',extra:1}}])
   await assert.rejects(()=>search(options),e=>e.code==='22023');
 });
 const visibleExpected=(excluded=new Set(),employment='employment')=>expectedIds(fixtureJobs.filter(x=>!excluded.has(x.id)&&(employment===null||employment==='task'?employment===null||x.employment==='task':x.employment!=='task')));
 for(const [label,sql,args,excluded] of [
  ['paused',"UPDATE public.jobs SET status='paused' WHERE id=$1",[jid(29)],new Set([jid(29)])],
  ['closed',"UPDATE public.jobs SET status='closed' WHERE id=$1",[jid(29)],new Set([jid(29)])],
  ['draft',"UPDATE public.jobs SET status='draft',published_at=NULL,active_until=NULL WHERE id=$1",[jid(29)],new Set([jid(29)])],
  ['expired',"UPDATE public.jobs SET published_at='2020-01-01Z',active_until='2020-02-01Z' WHERE id=$1",[jid(29)],new Set([jid(29)])],
  ['inactive_identity',"UPDATE public.identities SET status='inactive' WHERE id=$1",[iid(1)],new Set(fixtureJobs.filter(x=>x.identity===iid(1)).map(x=>x.id))],
  ['missing_slug','UPDATE public.identity_profiles SET slug=NULL WHERE identity_id=$1',[iid(1)],new Set(fixtureJobs.filter(x=>x.identity===iid(1)).map(x=>x.id))],
  ['inactive_business',"UPDATE public.business_accounts SET status='inactive' WHERE id=$1",[business],new Set(fixtureJobs.filter(x=>x.identity===iid(2)).map(x=>x.id))]
 ])await test('publication_gate_'+label,()=>withChange(sql,args,async()=>{
  for(const mode of ['employment','task',null])assert.deepEqual((await pages({employment:mode,limit:2})).items.map(x=>x.content_id),visibleExpected(excluded,mode));
 }));
 for(const [label,sql] of [
  ['banned',"UPDATE auth.users SET banned_until='2099-01-01Z' WHERE id=$1"],
  ['deleted',"UPDATE auth.users SET deleted_at=now() WHERE id=$1"],
  ['missing_state','DELETE FROM account_lifecycle_private.account_states WHERE account_user_id=$1'],
  ['nonfinite_created',"UPDATE auth.users SET created_at='infinity' WHERE id=$1"]
 ])await test('canonical_account_gate_'+label,()=>withChange(sql,[uid(2)],async()=>{
  const hidden=new Set(fixtureJobs.filter(x=>x.identity===iid(2)).map(x=>x.id));
  assert.deepEqual((await pages({employment:'employment',limit:2})).items.map(x=>x.content_id),visibleExpected(hidden));
 }));
 await test('nonactive_account_state_remains_fail_closed',()=>withChange('ALTER TABLE account_lifecycle_private.account_states DROP CONSTRAINT account_states_active_only',[],async()=>{
  await db.query("UPDATE account_lifecycle_private.account_states SET state='closed' WHERE account_user_id=$1",[uid(2)]);
  assert.deepEqual(ids(await search({employment:'employment'})),visibleExpected(new Set(fixtureJobs.filter(x=>x.identity===iid(2)).map(x=>x.id))));
 }));
 await test('banned_creator_does_not_replace_canonical_owner',()=>withChange("UPDATE auth.users SET banned_until='2099-01-01Z' WHERE id=$1",[uid(5)],async()=>{
  assert.deepEqual(ids(await search({employment:'employment'})),visibleExpected());
 }));
 for(const [label,from,to] of [['outgoing',3,2],['incoming',2,3]])await test('bilateral_block_'+label,()=>withChange('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[uid(from),uid(to)],async()=>{
  await actor(uid(3),async()=>assert.deepEqual(ids(await search({employment:'employment'})),visibleExpected(new Set(fixtureJobs.filter(x=>x.identity===iid(2)).map(x=>x.id)))));
  assert.deepEqual(ids(await search({employment:'employment'})),visibleExpected());
 }));
 await test('active_hidden_provider_excluded_before_limit',()=>withChange("INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,hidden_until) VALUES($1,$2,'2099-01-01Z')",[uid(3),iid(1)],async()=>{
  await actor(uid(3),async()=>assert.deepEqual((await pages({employment:'employment',limit:3})).items.map(x=>x.content_id),visibleExpected(new Set(fixtureJobs.filter(x=>x.identity===iid(1)).map(x=>x.id)))));
 }));
 await test('expired_hide_does_not_filter_provider',()=>withChange("INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,hidden_until) VALUES($1,$2,'2020-01-01Z')",[uid(3),iid(1)],async()=>{
  await actor(uid(3),async()=>assert.deepEqual(ids(await search({employment:'employment'})),visibleExpected()));
 }));
 await test('anon_and_authenticated_RPC_allowed_but_tables_helpers_denied',async()=>{
  const c=await connect();
  for(const role of ['anon','authenticated']){
   await c.query('SET ROLE '+role);await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[role==='anon'?'':uid(3)]);
   assert.deepEqual(ids(await search({employment:'employment'},c)),visibleExpected());
   for(const sql of ['SELECT * FROM public.jobs','SELECT * FROM jobs_private.categories','SELECT * FROM account_lifecycle_private.account_states','SELECT jobs_private.visible_to_viewer(NULL)'])await reject(c,sql,undefined,'42501');
   await c.query('RESET ROLE');
  }
  await c.query('SET ROLE service_role');await assert.rejects(()=>search({employment:'employment'},c),e=>e.code==='42501');await c.query('RESET ROLE');
 });
 const content={title:'Synthetic writer',description:'Synthetic work',category:'other',countryCode:'EE',city:'Paide',locationLabel:'Paide',
  workplaceType:'on_site',employmentType:'employment',workingTime:null,salaryMin:null,salaryMax:null,salaryCurrency:null,salaryPeriod:null};
 await test('search_sentinel_still_rejected_by_normalizer_and_storage_constraint',async()=>{
  await reject(db,'SELECT jobs_private.normalize_content($1)',[content],'22023','job_content_invalid');
  await reject(db,"UPDATE public.jobs SET employment_type='employment' WHERE id=$1",[jid(29)],'23514','jobs_employment_type_check');
 });
 await test('public_save_RPC_rejects_sentinel_without_job_receipt_or_policy_write',async()=>{
  const before=await snapshotRows();const c=await connect();await c.query('SET ROLE authenticated');await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid(1)]);
  await reject(c,'SELECT public.save_my_job_v1($1,$2,$3,NULL,NULL,$4,$5)',[uid(1),iid(1),crypto.randomUUID(),content,'[]'],'22023','job_content_invalid');
  await c.query('RESET ROLE');assert.deepEqual(await snapshotRows(),before);
 });
 await test('search_works_in_read_only_transaction',async()=>{
  await db.query('BEGIN READ ONLY');try{assert((await search({employment:'employment'})).items.length>0);}finally{await db.query('ROLLBACK');}
 });
 await test('second_apply_is_refused',async()=>{
  await reject(db,adapted('apply.sql'),undefined,'55000','BEFORE_STATE_MISMATCH');await db.query('ROLLBACK');assert.deepEqual((await catalog()).t,expected.after);
 });
 const driftCases=[
  ['target_config','ALTER FUNCTION '+target+" SET search_path=public",'ALTER FUNCTION '+target+' SET search_path=pg_catalog,pg_temp'],
  ['target_ACL','GRANT EXECUTE ON FUNCTION '+target+' TO service_role','REVOKE EXECUTE ON FUNCTION '+target+' FROM service_role'],
  ['target_overload',"CREATE FUNCTION public.search_public_jobs_v1(integer) RETURNS jsonb LANGUAGE sql AS 'SELECT NULL::jsonb'",'DROP FUNCTION public.search_public_jobs_v1(integer)'],
  ['visibility_dependency','ALTER FUNCTION jobs_private.visible_to_viewer(uuid) SET search_path=public','ALTER FUNCTION jobs_private.visible_to_viewer(uuid) SET search_path=pg_catalog,pg_temp'],
  ['account_dependency','ALTER FUNCTION account_lifecycle_private.account_is_available(uuid) SET search_path=public',"ALTER FUNCTION account_lifecycle_private.account_is_available(uuid) SET search_path=pg_catalog"],
  ['write_normalizer','ALTER FUNCTION jobs_private.normalize_content(jsonb) SET search_path=public','ALTER FUNCTION jobs_private.normalize_content(jsonb) SET search_path=pg_catalog,pg_temp'],
  ['job_table_acl','GRANT SELECT ON public.jobs TO anon','REVOKE SELECT ON public.jobs FROM anon']
 ];
 for(const [label,mutate,restore] of driftCases)await test('drift_'+label+'_fails_closed',async()=>{
  const before=await catalog();await db.query(mutate);
  try{
   const r=report(await db.query(adapted('preflight.sql')));assert.equal(r.state,'unknown');assert.equal(r.recognized,false);
   await reject(db,adapted('verify.sql'),undefined,'55000','AFTER_STATE_MISMATCH');await db.query('ROLLBACK');
  }finally{await db.query(restore);}
  assert.deepEqual(await catalog(),before);
 });
 await test('before_apply_dependency_drift_never_replaces_target',async()=>{
  await db.query(read('tests/old-search.sql'));await db.query('ALTER FUNCTION jobs_private.is_public(public.jobs) SET search_path=public');
  try{await reject(db,adapted('apply.sql'),undefined,'55000','BEFORE_STATE_MISMATCH');await db.query('ROLLBACK');assert.deepEqual((await catalog()).t,expected.before);}
  finally{await db.query('ALTER FUNCTION jobs_private.is_public(public.jobs) SET search_path=pg_catalog,pg_temp');await db.query(read('release/search-public-jobs.sql'));}
  assert.deepEqual(await catalog(),{b:fixtureBase,t:expected.after});
 });
 await test('final_rows_and_non_target_metadata_remain_equal',async()=>{
  assert.deepEqual(await snapshotRows(),rowBefore);assert.deepEqual((await catalog()).b,fixtureBase);
  const final=await snapshotFunctions();assert.deepEqual(final.filter(x=>x.signature!==target),functionsBefore.filter(x=>x.signature!==target));
 });
 write('catalog-final.json',await catalog());
}catch(e){failure={name:e.name,code:e.code??null,message:e.message,stack:e.stack};console.error(JSON.stringify(failure,null,2));process.exitCode=1;}
finally{
 for(const c of clients)try{await c.end();}catch{}
 if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop'],'stop.log',true);
 const status=run('pg_ctl',['-D',data,'status'],'status.log',true);
 const cleanup={pg_ctl_status_exit:status.status,postmaster_pid_absent:!fs.existsSync(path.join(data,'postmaster.pid'))};write('cleanup.json',cleanup);
 const value={format:'selqiro-job-search-purpose-native-tests-v1',postgres:'17.6',production_executed:false,production_rows_used:false,
  test_only_base_adaptation:true,target_metadata_exact:true,counts:{passed:tests.length,failed:failure?1:0},tests,failure:failure??null,cleanup};
 write('native-report.json',value);write('commands.json',commands);
 if(!failure){
  for(const name of ['native-report.json','preservation.json','preflight-envelope.json','apply-envelope.json','verify-envelope.json','cleanup.json'])fs.copyFileSync(path.join(proof,name),path.join(root,'proof',name));
 }
 console.log(JSON.stringify({result:failure?'FAIL':'PASS',passed:tests.length,failed:failure?1:0,proof}));
}
