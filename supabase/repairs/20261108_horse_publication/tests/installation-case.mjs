import fs from 'node:fs';
import assert from 'node:assert/strict';
process.env.SELQIRO_HORSE_BASELINE_ONLY='1';
const {db,repair}=await import('./public-contact-fixture.mjs');
const read=name=>fs.readFileSync(repair+'/'+name,'utf8');
assert.equal((await db.query("SELECT count(*)::integer value FROM pg_policy WHERE polname LIKE 'fixture\\_%' ESCAPE '\\'")).rows[0].value,0,
 'the installation baseline has no synthetic read policies');
const installer=(await db.query(`SELECT current_user,session_user,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls
 FROM pg_roles WHERE rolname=current_user`)).rows[0];
assert.equal(installer.current_user,'postgres');assert.equal(installer.session_user,'postgres');assert.equal(installer.rolsuper,false);
async function report(name){const rows=(await db.exec(read(name))).flatMap(x=>x.rows).filter(x=>x.result);assert.equal(rows.length,1);return rows[0].result;}
async function denied(sql,message){let error;try{await db.exec(sql);}catch(e){error=e;await db.exec('ROLLBACK');}
 assert.equal(error?.code,'55000',error?.message??'unexpected success');if(message)assert.equal(error.message,message);}
const absent=await report('preflight.sql');assert.equal(absent.state,'absent',JSON.stringify(absent));
assert(absent.recognized&&absent.ready_to_apply&&Object.values(absent.guards).every(Boolean));
const name=process.argv[2];
if(name==='provider_baseline_and_defaults'){
 const members=(await db.query(`SELECT pg_get_userbyid(roleid) role,pg_get_userbyid(member) member,
  pg_get_userbyid(grantor) grantor,admin_option admin,inherit_option inherit,set_option set
  FROM pg_auth_members WHERE pg_get_userbyid(roleid) IN('selqiro_listing_contact_writer_v1','selqiro_listing_final_writer_v1')
  ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text`)).rows;
 assert.deepEqual(members,['selqiro_listing_contact_writer_v1','selqiro_listing_final_writer_v1'].flatMap(role=>[
  {role,member:'postgres',grantor:'postgres',admin:false,inherit:true,set:true},
  {role,member:'postgres',grantor:'supabase_admin',admin:true,inherit:false,set:false}]));
 const helpers=['public.advance_horse_offer_edit_revision_v1()',
  'public.apply_horse_offer_draft_patch_v1(public.horse_offers,jsonb)'];
 for(const helper of helpers){
  assert.equal((await db.query("SELECT has_function_privilege('service_role',$1,'EXECUTE') value",[helper])).rows[0].value,true);
  for(const client of ['anon','authenticated'])assert.equal((await db.query(
   "SELECT has_function_privilege($1,$2,'EXECUTE') value",[client,helper])).rows[0].value,false);
 }
 // Verify the retained defaults really apply to newly created public functions,
 // then discard the probe. The unchanged horse modules must explicitly close
 // their new APIs despite these provider-default permissions.
 await db.exec(`BEGIN; CREATE FUNCTION public.horse_provider_default_probe() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;`);
 for(const client of ['anon','authenticated','service_role'])assert.equal((await db.query(
  "SELECT has_function_privilege($1,'public.horse_provider_default_probe()','EXECUTE') value",[client])).rows[0].value,true);
 await db.exec('ROLLBACK');
 const applied=await report('apply.sql');assert.equal(applied.state,'applied');
 assert.deepEqual(applied.invariants,absent.invariants);assert.deepEqual(await report('verify.sql'),applied);
 for(const client of ['anon','service_role'])assert.equal((await db.query(
  "SELECT has_function_privilege($1,'public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid)','EXECUTE') value",[client])).rows[0].value,false);
}else if(name==='install_and_replay'){
 const applied=await report('apply.sql');assert.equal(applied.state,'applied');assert.equal(applied.ready_to_apply,false);
 assert.deepEqual(applied.invariants,absent.invariants);assert.deepEqual(applied.hosted_context,absent.hosted_context);
 assert.equal(applied.fingerprints.dependencies,absent.fingerprints.dependencies);
 assert.deepEqual(await report('verify.sql'),applied);assert.deepEqual(await report('apply.sql'),applied);
}else if(name==='retained_policy_baseline'){
 const pins=JSON.parse(read('catalog-pins.json'));assert(pins.required_policy_pairs.length>40);
 assert(!pins.retained_policies.some(x=>x.name.startsWith('fixture_')));
 for(const [relation,name] of pins.required_policy_pairs){
  const found=await db.query('SELECT count(*)::integer value FROM pg_policy WHERE polrelid=to_regclass($1) AND polname=$2',[relation,name]);
  assert.equal(found.rows[0].value,1,relation+'/'+name);
 }
 const applied=await report('apply.sql');assert.equal(applied.state,'applied');
 assert.deepEqual(applied.invariants,absent.invariants);assert.deepEqual(await report('verify.sql'),applied);
}else if(name==='policy_definition_drift'){
 await db.exec('ALTER POLICY completion_internal_writer ON listing_publication_private.web_write_completions WITH CHECK(false)');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.final_writer_policies,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='extra_private_policy'){
 await db.exec('CREATE POLICY unreviewed_policy ON listing_publication_private.attempts TO authenticated USING(true)');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.final_writer_policies,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='missing_public_writer_policy'){
 await db.exec('DROP POLICY contact_writer_lock ON public.identities');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.final_writer_policies,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='unknown_function'){
 await db.exec(`CREATE OR REPLACE FUNCTION listing_publication_private.require_actor(p_expected_user_id uuid,p_expected_identity_id uuid) RETURNS uuid LANGUAGE sql AS $$ SELECT $2 $$`);
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(['retained_helper_acl_grantee','retained_helper_acl_grant_option','retained_policy_acl_grant_option',
 'retained_function_overload'].includes(name)){
 const mutation={
  retained_helper_acl_grantee:'GRANT EXECUTE ON FUNCTION public.apply_horse_offer_draft_patch_v1(public.horse_offers,jsonb) TO anon',
  retained_helper_acl_grant_option:'GRANT EXECUTE ON FUNCTION public.apply_horse_offer_draft_patch_v1(public.horse_offers,jsonb) TO service_role WITH GRANT OPTION',
  retained_policy_acl_grant_option:'GRANT EXECUTE ON FUNCTION public.prevent_publication_policy_acceptance_update() TO anon WITH GRANT OPTION',
  retained_function_overload:'CREATE FUNCTION public.apply_horse_offer_draft_patch_v1(jsonb) RETURNS jsonb LANGUAGE sql AS $$ SELECT $1 $$'
 }[name];
 await db.exec(mutation);
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='unknown_authority'){
 await db.exec('GRANT USAGE ON SCHEMA listing_publication_private TO authenticated');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.closed_private_schema,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='partial_schema'){
 await db.exec('CREATE SCHEMA horse_publication_private');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert(!changed.capability_absent&&!changed.capability_present);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='applied_acl_drift'){
 await report('apply.sql');await db.exec('GRANT EXECUTE ON FUNCTION public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid) TO anon');
 const changed=await report('verify.sql');assert.equal(changed.state,'unknown');assert(!changed.capability_present);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
 assert.equal((await db.query("SELECT has_function_privilege('anon','public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid)','EXECUTE') value")).rows[0].value,true);
}else if(name==='writer_role_drift'){
 await db.exec('GRANT selqiro_listing_final_writer_v1 TO authenticated');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.actor_roles,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(['writer_bootstrap_inherit','writer_bootstrap_set','writer_bootstrap_admin','writer_bootstrap_grantor'].includes(name)){
 if(name==='writer_bootstrap_admin')await db.exec(`SET SESSION AUTHORIZATION supabase_admin;
  REVOKE ADMIN OPTION FOR selqiro_listing_final_writer_v1 FROM postgres GRANTED BY supabase_admin CASCADE;
  SET SESSION AUTHORIZATION postgres;`);
 else if(name==='writer_bootstrap_grantor')await db.exec(`
  SET SESSION AUTHORIZATION supabase_admin;
  CREATE ROLE horse_fixture_role_rename SUPERUSER;
  SET SESSION AUTHORIZATION horse_fixture_role_rename;
  ALTER ROLE supabase_admin RENAME TO unreviewed_bootstrap;
  SET SESSION AUTHORIZATION unreviewed_bootstrap;
  DROP ROLE horse_fixture_role_rename;
  SET SESSION AUTHORIZATION postgres;
 `);
 else await db.exec(`SET SESSION AUTHORIZATION supabase_admin;
  GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN TRUE,
   INHERIT ${name==='writer_bootstrap_inherit'?'TRUE':'FALSE'},SET ${name==='writer_bootstrap_set'?'TRUE':'FALSE'}
   GRANTED BY supabase_admin;
  SET SESSION AUTHORIZATION postgres;`);
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.actor_roles,false);
 assert.equal((await db.query("SELECT rolsuper FROM pg_roles WHERE rolname=current_user")).rows[0].rolsuper,false,
  'bootstrap-only fixture drift setup restores non-superuser installer');
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='canonical_schema_drift'){
 await db.exec('ALTER TABLE public.horse_offers ADD COLUMN unreviewed_public_flag boolean');
 const changed=await report('preflight.sql');assert.equal(changed.state,'unknown');assert.equal(changed.guards.functions,false);
 await denied(read('apply.sql'),'HORSE_PUBLICATION_KNOWN_STATE_REQUIRED');
}else if(name==='atomic_rollback'){
 const broken=read('apply.sql').replace('END $before$;','END $before$;\nGRANT EXECUTE ON FUNCTION public.publish_my_horse_offer_v1(uuid,uuid,uuid,uuid) TO anon;');
 await denied(broken,'HORSE_PUBLICATION_INSTALLED_STATE_NOT_VERIFIED');
 assert.equal((await db.query("SELECT to_regnamespace('horse_publication_private') value")).rows[0].value,null);
 assert.deepEqual(await report('preflight.sql'),absent);
}else throw Error('Unknown installation case '+name);
console.log(JSON.stringify({case:name,passed:true,postgres:(await db.query('SELECT version() value')).rows[0].value,installer,
 live_database:false,native_concurrency:false}));await db.close();
