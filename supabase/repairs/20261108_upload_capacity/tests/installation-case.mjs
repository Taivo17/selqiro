import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.SELQIRO_CAPACITY_BASELINE_ONLY='1';
const {db,repair}=await import('./fixture.mjs');
const read=name=>fs.readFileSync(repair+'/'+name,'utf8');
const pins=JSON.parse(read('catalog-pins.json'));
const newRpc=pins.new_function_signatures.find(n=>n.startsWith('public.claim_'));
const allocator=pins.changed_function_signatures.find(n=>n.startsWith('listing_publication_private.allocate_managed_publication_attempt_v1('));
assert(newRpc&&allocator,'exact generated changed and service function signatures');
const installer=(await db.query(`SELECT current_user,session_user,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls
 FROM pg_roles WHERE rolname=current_user`)).rows[0];
assert.equal(installer.current_user,'postgres');assert.equal(installer.session_user,'postgres');assert.equal(installer.rolsuper,false);
assert.equal((await db.query("SELECT count(*)::integer value FROM pg_policy WHERE polname LIKE 'fixture\\_%' ESCAPE '\\'")).rows[0].value,0);
async function report(name){
 const rows=(await db.exec(read(name))).flatMap(x=>x.rows).filter(x=>x.result);
 assert.equal(rows.length,1);return rows[0].result;
}
async function denied(sql,message){
 let error;
 try{await db.exec(sql);}catch(e){error=e;await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000',error?.message??'unexpected success');
 assert.equal(error?.message,message);
}
const absent=await report('preflight.sql');
assert.equal(absent.state,'absent',JSON.stringify(absent));
assert(absent.recognized&&absent.ready_to_apply&&Object.values(absent.guards).every(Boolean));
const name=process.argv[2];
if(name==='retained_release_inventory'){
 assert.equal(absent.fingerprints.dependencies,'bd0d02ea9d228af46cf3f6a016bc985a4b7edffffa7c157e94c389440194fa38');
 assert.equal(absent.invariants.existing_functions,'93b95bd4c438853375365a1480e4fd08dbdddb759d16995f9bbdff15dc240b0e');
 assert.equal(absent.fingerprints.capability,'d043db1cd2e5ab796ad82e82c1281f04670adf36f0861be198befe9012f7b7d1');
 assert.equal(pins.restored_fixture_function_names.length,17);
 assert.equal(pins.dependency_function_names.length,231);
 for(const functionName of pins.restored_fixture_function_names){
  assert(pins.dependency_function_names.includes(functionName));
  assert.equal((await db.query("SELECT count(*)::integer value FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=$1",[functionName])).rows[0].value,1);
 }
}else if(name==='retained_release_function_missing'){
 await db.exec('DROP FUNCTION listing_publication_private.assert_hosted_install_context()');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='install_and_replay'){
 const applied=await report('apply.sql');
 assert.equal(applied.state,'applied');assert.equal(applied.ready_to_apply,false);
 assert.deepEqual(applied.invariants,absent.invariants);
 assert.deepEqual(applied.hosted_context,absent.hosted_context);
 assert.equal(applied.fingerprints.dependencies,absent.fingerprints.dependencies);
 assert.deepEqual(await report('verify.sql'),applied);
 assert.deepEqual(await report('apply.sql'),applied);
 for(const rpc of pins.new_function_signatures.filter(n=>n.startsWith('public.'))){
  for(const role of ['anon','authenticated'])assert.equal((await db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') value',[role,rpc])).rows[0].value,false);
  assert.equal((await db.query("SELECT has_function_privilege('service_role',$1,'EXECUTE') value",[rpc])).rows[0].value,true);
 }
}else if(name==='changed_allocator_metadata_drift'){
 await db.exec('ALTER FUNCTION '+allocator+" SET lock_timeout='9s'");
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert(!changed.capability_absent);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='retained_function_body_drift'){
 await db.exec(`CREATE OR REPLACE FUNCTION listing_publication_private.require_actor(p_expected_user_id uuid,p_expected_identity_id uuid)
 RETURNS uuid LANGUAGE sql AS $$ SELECT $2 $$`);
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='retained_public_acl_drift'){
 await db.exec('GRANT EXECUTE ON FUNCTION public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid) TO anon');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='extra_private_function'){
 await db.exec('CREATE FUNCTION listing_publication_private.unreviewed_capacity_probe() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='partial_helper'){
 await db.exec('CREATE FUNCTION listing_publication_private.pending_upload_reserved_bytes_v1(uuid) RETURNS bigint LANGUAGE sql AS $$ SELECT 0::bigint $$');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert(!changed.capability_absent&&!changed.capability_present);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='applied_service_acl_drift'){
 await report('apply.sql');await db.exec('GRANT EXECUTE ON FUNCTION '+newRpc+' TO authenticated');
 const changed=await report('verify.sql');assert.equal(changed.state,'unknown');assert(!changed.capability_present);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
 assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') value",[newRpc])).rows[0].value,true);
}else if(name==='horse_policy_drift'){
 await db.exec('ALTER POLICY horse_command_writer_read ON horse_publication_private.commands USING(false)');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.final_writer_policies,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='writer_role_drift'){
 await db.exec('GRANT selqiro_listing_final_writer_v1 TO authenticated');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.actor_roles,false);
 await denied(read('apply.sql'),'UPLOAD_CAPACITY_KNOWN_STATE_REQUIRED');
}else if(name==='atomic_rollback'){
 const broken=read('apply.sql').replace('END $before$;','END $before$;\nGRANT EXECUTE ON FUNCTION '+newRpc+' TO anon;');
 await denied(broken,'UPLOAD_CAPACITY_INSTALLED_STATE_NOT_VERIFIED');
 assert.equal((await db.query('SELECT to_regprocedure($1)::text value',[newRpc])).rows[0].value,null);
 assert.deepEqual(await report('preflight.sql'),absent);
}else throw Error('Unknown installation case '+name);
console.log(JSON.stringify({case:name,passed:true,postgres:(await db.query('SELECT version() value')).rows[0].value,
 installer,live_database:false,native_concurrency:false}));
await db.close();
