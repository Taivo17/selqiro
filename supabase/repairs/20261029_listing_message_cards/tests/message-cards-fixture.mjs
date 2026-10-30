import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { PGlite } = await import(process.env.SELQIRO_PGLITE_MODULE || '@electric-sql/pglite');
const here = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.SELQIRO_INBOX_SOURCE || path.resolve(here, '../../../..');
const root = process.env.SELQIRO_INBOX_TEST_OUTPUT || path.resolve(here, '..');
const hostedInstaller = process.env.SELQIRO_INBOX_HOSTED_INSTALLER === '1';
const baseline = fs.readFileSync(source + '/supabase/migrations/20260722173530_baseline_20260722.sql', 'utf8');
const preconditions = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql', 'utf8');
const core = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql', 'utf8');
const publication = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql', 'utf8');
const contacts = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql', 'utf8');
// Frozen test-only input; the delivery runner never executes this fixture.
const acceptedContactFix = fs.readFileSync(path.join(here, 'fixtures/accepted-contact-fix.sql'), 'utf8');
const acceptedContactFixHash = crypto.createHash('sha256').update(acceptedContactFix).digest('hex');
assert.equal(acceptedContactFixHash, 'aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b');

const extractFunction = (text, head, delimiter) => {
  const from = text.indexOf(head);
  if (from < 0) throw new Error('missing exact function ' + head);
  const body = text.indexOf(delimiter, from);
  const end = text.indexOf(delimiter + ';', body + delimiter.length);
  if (body < 0 || end < 0) throw new Error('missing function delimiters');
  return text.slice(from, end + delimiter.length + 1);
};
const policyNames = [
  'Business members can read business identities',
  'Business members can read members',
  'Business owners can manage business identities',
  'Business owners can manage members',
  'Users can manage their private identities',
  'Users can read their private identities',
];
const legacyPolicies = policyNames.map(name => {
  const from = baseline.indexOf('CREATE POLICY "' + name + '"');
  if (from < 0) throw new Error('missing policy ' + name);
  return baseline.slice(from, baseline.indexOf(';', from) + 1);
});
const extractTable = name => {
  const from = baseline.indexOf('CREATE TABLE IF NOT EXISTS "public"."' + name + '"');
  if (from < 0) throw new Error('missing table ' + name);
  return baseline.slice(from, baseline.indexOf('\n);', from) + 3);
};
const functionSql = [
  extractFunction(baseline, 'CREATE OR REPLACE FUNCTION "public"."current_user_has_identity_access"(', '$$'),
  extractFunction(preconditions, 'CREATE FUNCTION public.listing_actor_uid_hosted_v1()', '$f$'),
  extractFunction(preconditions, 'CREATE FUNCTION listing_publication_private.hosted_storage_contract_ready()', '$f$'),
  extractFunction(preconditions, 'CREATE FUNCTION listing_publication_private.assert_hosted_preview_actor(', '$f$'),
  extractFunction(core, 'CREATE FUNCTION public.lock_listing_creation_actor_v1(', '$fn$'),
  extractFunction(publication, 'CREATE FUNCTION listing_publication_private.require_actor(', '$fn$'),
].join('\n');
const contactFrom = contacts.indexOf('CREATE ROLE selqiro_listing_contact_writer_v1');
const contactEnd = contacts.indexOf("COMMENT ON SCHEMA listing_contact_private IS", contactFrom);
const contactSql = contacts.slice(contactFrom, contacts.indexOf(';', contactEnd) + 1);
const readFrom = contacts.indexOf('CREATE FUNCTION listing_contact_private.peer_ready(');
const readSql = contacts.slice(readFrom);
const actors = {
  buyer: '91000000-0000-0000-0000-000000000001',
  seller: '92000000-0000-0000-0000-000000000002',
  third: '93000000-0000-0000-0000-000000000003',
  buyerIdentity: 'a1000000-0000-0000-0000-000000000001',
  sellerIdentity: 'b2000000-0000-0000-0000-000000000002',
  thirdIdentity: 'c3000000-0000-0000-0000-000000000003',
  otherBuyerIdentity: 'a1100000-0000-0000-0000-000000000001',
  business: 'd1000000-0000-0000-0000-000000000001',
  businessIdentity: 'd2000000-0000-0000-0000-000000000001',
};
const db = await PGlite.create();
const checks = [];
const results = { version: (await db.query('select version()')).rows[0].version, checks };
await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE ROLE selqiro_listing_final_writer_v1 NOLOGIN NOINHERIT NOBYPASSRLS;
  CREATE SCHEMA auth;
  CREATE SCHEMA storage;
  CREATE SCHEMA listing_publication_private;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  CREATE TABLE public.profiles(id uuid PRIMARY KEY, active_identity_id uuid);
  CREATE TABLE public.identities(id uuid PRIMARY KEY, type text, user_id uuid, business_account_id uuid, status text, display_name text);
  CREATE TABLE public.business_accounts(id uuid PRIMARY KEY, owner_user_id uuid);
  CREATE TABLE public.business_members(id uuid PRIMARY KEY, business_account_id uuid, user_id uuid, status text);
  CREATE TABLE public.listings(id bigint PRIMARY KEY, user_id uuid, identity_id uuid, status text, active_until timestamptz, title text, image text, price text);
  CREATE TABLE public.user_blocks(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, blocker_id uuid, blocked_id uuid);
  ${extractTable('conversations')}
  ${extractTable('conversation_participants')}
  ${extractTable('messages')}
  ALTER TABLE public.conversations ADD PRIMARY KEY(id);
  ALTER TABLE public.conversation_participants ADD PRIMARY KEY(id);
  ALTER TABLE public.messages ADD PRIMARY KEY(id);
  ALTER TABLE public.conversations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  ALTER TABLE public.conversation_participants ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  ALTER TABLE public.messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  ALTER TABLE public.conversation_participants ADD UNIQUE(conversation_id, user_id);
  CREATE TABLE listing_publication_private.publications(listing_id bigint PRIMARY KEY,state text);
  CREATE TABLE listing_publication_private.hosted_preview_settings(singleton boolean PRIMARY KEY, enabled boolean, release_ready boolean, storage_authority_version text,
    project_ref text DEFAULT 'vyjletlmwoiwxsnsunlm', release_id text DEFAULT 'listing-publication-hosted-preview-v1',
    instance_id uuid DEFAULT '2d088814-0900-448a-a9d1-7b05470cb1d2');
  CREATE TABLE listing_publication_private.hosted_preview_actors(actor_user_id uuid PRIMARY KEY);
  CREATE TABLE storage.buckets(id text PRIMARY KEY, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  INSERT INTO storage.buckets VALUES('listing-publication-private',false,26214400,ARRAY['application/octet-stream','image/webp']);
  INSERT INTO listing_publication_private.hosted_preview_settings(singleton,enabled,release_ready,storage_authority_version) VALUES(true,true,true,'source-part-rfc3986-v1');
  INSERT INTO auth.users VALUES('${actors.buyer}'),('${actors.seller}'),('${actors.third}');
  INSERT INTO public.profiles VALUES
    ('${actors.buyer}', '${actors.buyerIdentity}'),('${actors.seller}', '${actors.sellerIdentity}'),('${actors.third}', '${actors.thirdIdentity}');
  INSERT INTO public.identities VALUES
    ('${actors.buyerIdentity}', 'private', '${actors.buyer}', NULL, 'active','Synthetic buyer'),
    ('${actors.sellerIdentity}', 'private', '${actors.seller}', NULL, 'active','Synthetic seller'),
    ('${actors.thirdIdentity}', 'private', '${actors.third}', NULL, 'active','Synthetic third'),
    ('${actors.otherBuyerIdentity}', 'private', '${actors.buyer}', NULL, 'active','Synthetic other buyer'),
    ('${actors.businessIdentity}', 'business', NULL, '${actors.business}', 'active','Synthetic business');
  INSERT INTO public.business_accounts VALUES('${actors.business}','${actors.buyer}');
  INSERT INTO public.business_members VALUES('d3000000-0000-0000-0000-000000000001','${actors.business}','${actors.buyer}','active');
  INSERT INTO listing_publication_private.hosted_preview_actors VALUES('${actors.buyer}'),('${actors.seller}'),('${actors.third}');
  INSERT INTO public.listings VALUES(197,'${actors.seller}','${actors.sellerIdentity}','active',now()+interval '90 days','Synthetic car',NULL,'4376 EUR');
  INSERT INTO public.listings VALUES(198,'${actors.buyer}','${actors.buyerIdentity}','active',now()+interval '90 days','Synthetic own item',NULL,'1 EUR');
  INSERT INTO listing_publication_private.publications VALUES(197,'published'),(198,'published');
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
  ALTER TABLE listing_publication_private.publications ENABLE ROW LEVEL SECURITY;
  ${legacyPolicies.join('\n')}
  CREATE POLICY public_profiles_read ON public.profiles FOR SELECT USING(true);
  CREATE POLICY public_listings_read ON public.listings FOR SELECT USING(true);
  ${functionSql}
  ${contactSql}
  ${readSql}
  GRANT EXECUTE ON FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
    public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),
    public.get_my_listing_conversation_v1(uuid,uuid,text,text),
    public.list_my_listing_conversations_v1(uuid,uuid,text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1(),
    public.listing_contact_is_managed_v1(bigint,bigint) TO authenticated, selqiro_listing_contact_writer_v1;
  GRANT EXECUTE ON FUNCTION public.listing_contact_visible_v1(bigint) TO authenticated,selqiro_listing_contact_writer_v1;
  GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_contact_writer_v1;
  GRANT USAGE ON SCHEMA public TO authenticated;
  REVOKE ALL ON FUNCTION public.current_user_has_identity_access(uuid) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO authenticated,service_role,selqiro_listing_contact_writer_v1;
  REVOKE ALL ON FUNCTION public.listing_actor_uid_hosted_v1() FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1() TO anon,authenticated,service_role,selqiro_listing_contact_writer_v1;
  REVOKE ALL ON FUNCTION public.lock_listing_creation_actor_v1(uuid) FROM PUBLIC;
  REVOKE ALL ON FUNCTION listing_publication_private.require_actor(uuid,uuid) FROM PUBLIC;
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
  REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
  REVOKE ALL ON SCHEMA listing_contact_private FROM PUBLIC,anon,authenticated,service_role;
`);

async function asActor(user, query, params=[]) {
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
  await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:user,role:'authenticated'})]);
  await db.exec('SET ROLE authenticated');
  try { return await db.query(query, params); }
  finally { await db.exec('RESET ROLE'); }
}
async function check(label, operation, expectedCode) {
  try {
    const value = await operation();
    assert.equal(expectedCode,undefined,'expected SQLSTATE '+expectedCode);
    checks.push({label,passed:true});
    return value;
  } catch(error) {
    if (expectedCode && error.code===expectedCode) { checks.push({label,passed:true,observed_code:error.code,message:error.message,where:error.where}); return null; }
    checks.push({label,passed:false,code:error.code,message:error.message,where:error.where});
    throw error;
  }
}
const dir=path.join(source,'supabase/repairs/20261029_listing_message_cards');
const evidence=path.join(root,'evidence');
fs.mkdirSync(evidence,{recursive:true});
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
const inspect=async()=> (await db.exec(read('preflight.sql'))).flatMap(r=>r.rows??[]).find(r=>r.result)?.result;
async function refused(sql,message) {
 let caught;
 try { await db.exec(sql); } catch(e) { caught=e; }
 finally { await db.exec('ROLLBACK'); }
 assert.equal(caught?.code,'55000'); assert.equal(caught?.message,message);
}
try {
 await check('unrepaired_database_is_not_a_ready_base',async()=>{
  const r=await inspect();assert.equal(r.state,'unknown');assert.equal(r.recognized,false);
  await refused(read('apply.sql'),'MESSAGE_CARDS_ABSENT_STATE_REQUIRED');
 });
 await check('source_fragment_also_works_with_original_v1_reader_in_local_schema',async()=>{
  await db.exec('BEGIN');
  try {
   for(const p of legacyPolicies){
    const name=p.match(/^CREATE POLICY "([^"]+)"/)[1];
    const table=p.includes('ON "public"."business_members"')?'business_members':'identities';
    await db.exec(`DROP POLICY "${name}" ON public.${table};`);
   }
   await db.exec(read('changes.sql'));
   const cid=(await asActor(actors.buyer,'SELECT public.contact_my_listing_seller_v1($1,$2,$3,$4) receipt',
    [actors.buyer,actors.buyerIdentity,'e0900000-0000-0000-0000-000000000001','197'])).rows[0].receipt.conversation_id;
   const r=(await asActor(actors.buyer,'SELECT public.get_my_listing_conversation_v2($1,$2,$3,NULL,$4) view',
    [actors.buyer,actors.buyerIdentity,cid,'197'])).rows[0].view;
   assert.equal(r.schema_version,2);assert.equal(r.attachment_listing.id,'197');
   assert.equal((await db.query("SELECT to_regprocedure('listing_contact_private.require_actor_hosted_v1(uuid,uuid)') IS NULL absent")).rows[0].absent,true);
  } finally { await db.exec('ROLLBACK'); }
 });
 // Represent the already accepted contact repair. Do not invoke a production tool.
 await db.exec(acceptedContactFix);
 if (hostedInstaller) {
  // Real hosted postgres has BYPASSRLS and CREATEROLE but is not a superuser.
  // PGlite's default postgres is superuser, which hid the shipped ALTER OWNER
  // precondition failure. Keep this fixture mode explicit and record its state.
  await db.exec(`
   GRANT anon,authenticated,service_role,selqiro_listing_final_writer_v1 TO postgres;
   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
   -- PGlite protects ALTER ROLE postgres, so synthetic fixture setup changes
   -- its catalog flags directly before testing the exact production SQL.
   -- This setup is never part of changes.sql, apply.sql, or the Mac runner.
   UPDATE pg_authid SET rolsuper=false,rolcreaterole=true,rolbypassrls=true
    WHERE rolname='postgres';
  `);
  results.installer=(await db.query(`SELECT current_user,session_user,rolsuper,rolcreaterole,rolbypassrls,
   has_schema_privilege('selqiro_listing_contact_writer_v1','public','CREATE') writer_can_create,
   has_schema_privilege('postgres','public','CREATE') installer_can_create,
   pg_has_role('postgres','selqiro_listing_contact_writer_v1','SET') installer_can_set_writer
   FROM pg_roles WHERE rolname=current_user`)).rows[0];
  assert.equal(results.installer.rolsuper,false);
  assert.equal(results.installer.writer_can_create,false);
  assert.equal(results.installer.installer_can_create,true);
  assert.equal(results.installer.installer_can_set_writer,true);
 }
 const before=await check('repaired_base_preflight_recognizes_absent_reader',async()=>{
  const r=await inspect();assert.equal(r.state,'absent');assert.equal(r.recognized,true);return r;
 });
 results.preflight=before;
 const publicSchemaBefore=(await db.query(`SELECT nspowner::text owner,nspacl::text acl
  FROM pg_namespace WHERE nspname='public'`)).rows[0];
 if (hostedInstaller) {
  const shippedPath=process.env.SELQIRO_PREVIOUS_CARDS_APPLY;
  assert.ok(shippedPath,'exact previous apply.sql is required for the hosted regression');
  const shipped=fs.readFileSync(shippedPath,'utf8');
  assert.equal(crypto.createHash('sha256').update(shipped).digest('hex'),
   '2b788fc60586c8abdc4457b55aaa3fe80d4f46924c3c2b6278f8de895aff0cda');
  await check('shipped_apply_reproduces_nonsuper_owner_transfer_failure_and_rolls_back',async()=>{
   let caught;
   try { await db.exec(shipped); } catch(e) { caught=e; }
   finally { await db.exec('ROLLBACK'); }
   assert.equal(caught?.code,'42501');
   assert.equal(caught?.message,'permission denied for schema public');
   results.shipped_failure={code:caught.code,message:caught.message};
   assert.deepEqual(await inspect(),before);
   assert.deepEqual((await db.query(`SELECT nspowner::text owner,nspacl::text acl
    FROM pg_namespace WHERE nspname='public'`)).rows[0],publicSchemaBefore);
  });
  await check('rollback_restores_temporary_create_grant_after_owner_transfer',async()=>{
   const apply=read('apply.sql');
   const owner='ALTER FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;';
   const where=apply.indexOf(owner)+owner.length;
   assert.ok(where>owner.length);
   const interrupted=apply.slice(0,where)+`\nDO $$ BEGIN RAISE EXCEPTION 'SYNTHETIC_OWNER_TRANSFER_ABORT' USING ERRCODE='55000'; END $$;\n`+apply.slice(where);
   await refused(interrupted,'SYNTHETIC_OWNER_TRANSFER_ABORT');
   assert.deepEqual(await inspect(),before);
   assert.deepEqual((await db.query(`SELECT nspowner::text owner,nspacl::text acl
    FROM pg_namespace WHERE nspname='public'`)).rows[0],publicSchemaBefore);
  });
 }
 await check('unrelated_signature_collision_refuses_install',async()=>{
  await db.exec('CREATE FUNCTION public.get_my_listing_conversation_v2(text) RETURNS text LANGUAGE sql AS $$ SELECT $1 $$;');
  assert.equal((await inspect()).state,'unknown');
  await refused(read('apply.sql'),'MESSAGE_CARDS_ABSENT_STATE_REQUIRED');
  await db.exec('DROP FUNCTION public.get_my_listing_conversation_v2(text);');
 });
 await check('unknown_dependency_state_refuses_install',async()=>{
  await db.exec('ALTER FUNCTION public.get_my_listing_conversation_v1(uuid,uuid,text,text) STABLE;');
  assert.equal((await inspect()).state,'unknown');
  await refused(read('apply.sql'),'MESSAGE_CARDS_ABSENT_STATE_REQUIRED');
  await db.exec('ALTER FUNCTION public.get_my_listing_conversation_v1(uuid,uuid,text,text) VOLATILE;');
 });
 await check('failed_postcondition_rolls_back_new_function',async()=>{
  const apply=read('apply.sql'); const where=apply.lastIndexOf('DO $catalog_guard$');
  const invalid=apply.slice(0,where)+"ALTER FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) STABLE;\n"+apply.slice(where);
  await refused(invalid,'MESSAGE_CARDS_POSTCONDITION_FAILED');
  assert.equal((await inspect()).state,'absent');
 });
 const oldDefinitions=(await db.query(`SELECT oid::regprocedure::text AS name,pg_get_functiondef(oid) AS definition
 FROM pg_proc WHERE oid IN ('public.get_my_listing_conversation_v1(uuid,uuid,text,text)'::regprocedure,
 'public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)'::regprocedure,
 'public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)'::regprocedure,
 'public.list_my_listing_conversations_v1(uuid,uuid,text)'::regprocedure) ORDER BY 1`)).rows;
 const dataDigest=async()=> (await db.query(`SELECT jsonb_build_object(
 'messages',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM public.messages x),
 'conversations',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM public.conversations x),
 'participants',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM public.conversation_participants x),
 'listings',(SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.id),'[]') FROM public.listings x)) AS data`)).rows[0].data;
 const dataBefore=await dataDigest();
 const after=await check('guarded_additive_apply_and_verify',async()=>{
  const r=(await db.exec(read('apply.sql'))).flatMap(r=>r.rows??[]).find(r=>r.result)?.result;
  assert.equal(r.state,'applied');assert.equal(r.recognized,true);
  const verified=await inspect();assert.deepEqual(verified,r);return r;
 });
 results.verification=after;
 await check('public_schema_owner_and_acl_are_restored_byte_identically',async()=>{
  assert.deepEqual((await db.query(`SELECT nspowner::text owner,nspacl::text acl
   FROM pg_namespace WHERE nspname='public'`)).rows[0],publicSchemaBefore);
  assert.equal((await db.query(`SELECT has_schema_privilege('selqiro_listing_contact_writer_v1','public','CREATE') allowed`)).rows[0].allowed,false);
 });
 await check('six_existing_security_fingerprints_are_preserved',async()=>{
  for(const key of Object.keys(before.fingerprints).filter(k=>k!=='reader')) assert.equal(before.fingerprints[key],after.fingerprints[key],key);
 });
 await check('install_does_not_write_messages_conversations_listings_or_participants',async()=>assert.deepEqual(await dataDigest(),dataBefore));
 await check('all_four_existing_public_v1_function_definitions_are_byte_identical',async()=>{
  for(const item of oldDefinitions) assert.equal((await db.query('SELECT pg_get_functiondef($1::regprocedure) AS definition',[item.name])).rows[0].definition,item.definition,item.name);
 });
 await check('direct_second_apply_stops_but_readonly_verify_accepts_applied',async()=>{
  await refused(read('apply.sql'),'MESSAGE_CARDS_ABSENT_STATE_REQUIRED');assert.deepEqual(await inspect(),after);
 });
 await check('reader_acl_is_authenticated_only_with_restricted_owner',async()=>{
  const sig='public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)';
  for(const role of ['anon','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') allowed",[role,sig])).rows[0].allowed,false);
  assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') allowed",[sig])).rows[0].allowed,true);
 });
 await check('unexpected_reader_acl_is_not_recognized',async()=>{
  await db.exec('GRANT EXECUTE ON FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) TO anon;');
  assert.equal((await inspect()).state,'unknown');
  await db.exec('REVOKE ALL ON FUNCTION public.get_my_listing_conversation_v2(uuid,uuid,text,text,text) FROM anon;');
  assert.equal((await inspect()).state,'applied');
 });
 const imageA='/api/v2/listing-media/01000000-0000-4000-8000-000000000001/0';
 const imageB='/api/v2/listing-media/02000000-0000-4000-8000-000000000002/0';
 await db.query('UPDATE public.listings SET image=$1 WHERE id=197',[imageA]);
 await db.query(`INSERT INTO public.listings VALUES(199,$1,$2,'active',now()+interval '90 days','Another listing',$3,'999999999999999999.999 KWD'),
  (201,$4,$5,'active',now()+interval '90 days','Unrelated listing',NULL,'22 EUR'),
  (202,$1,$2,'active',now()-interval '1 day','Expired',NULL,'3 EUR'),
  (203,$1,$2,'active',now()+interval '90 days','Not published',NULL,'4 EUR'),
  (204,$1,$2,'paused',now()+interval '90 days','Paused',NULL,'5 EUR')`,[actors.seller,actors.sellerIdentity,imageB,actors.third,actors.thirdIdentity]);
 await db.exec("INSERT INTO listing_publication_private.publications VALUES(199,'published'),(201,'published'),(202,'published'),(204,'published');");
 const contactQuery='SELECT public.contact_my_listing_seller_v1($1,$2,$3,$4) receipt';
 const contactArgs=[actors.buyer,actors.buyerIdentity,'e1000000-0000-0000-0000-000000000001','197'];
 const cid=(await asActor(actors.buyer,contactQuery,contactArgs)).rows[0].receipt.conversation_id;
 const getQuery='SELECT public.get_my_listing_conversation_v2($1,$2,$3,$4,$5) view';
 const get=async(who='buyer',attachment=null,before=null)=>(await asActor(actors[who],getQuery,[actors[who],actors[who+'Identity'],cid,before,attachment])).rows[0].view;
 let messageNumber=0;
 const send=async(text,listing=null,who='buyer')=>{
  const key='e2000000-0000-0000-0000-'+String(++messageNumber).padStart(12,'0');
  return (await asActor(actors[who],'SELECT public.send_my_listing_message_v1($1,$2,$3,$4,$5,$6) receipt',
   [actors[who],actors[who+'Identity'],key,cid,text,listing])).rows[0].receipt;
 };
 await check('explicit_composer_preview_uses_canonical_listing_snapshot',async()=>{
  const r=await get('buyer','197');assert.equal(r.schema_version,2);assert.equal(r.attachment_listing_id,'197');
  assert.deepEqual(r.attachment_listing,{id:'197',title:'Synthetic car',image:imageA,price:'4376 EUR'});
 });
 await check('direct_inbox_open_does_not_attach_current_header',async()=>{
  const r=await get();assert.equal(r.listing.id,'197');assert.equal(r.attachment_listing_id,null);assert.equal(r.attachment_listing,null);
 });
 const msgA=await send('First listing question','197');
 const plain=await send('Ordinary reply',null,'seller');
 await check('buyer_and_seller_read_same_per_message_card_with_own_mine_flag',async()=>{
  const buyer=await get(),seller=await get('seller');
  const a=buyer.messages.find(m=>m.id===msgA.message_id),b=seller.messages.find(m=>m.id===msgA.message_id);
  assert.deepEqual(a.listing,b.listing);assert.deepEqual(a.listing,{id:'197',title:'Synthetic car',image:imageA,price:'4376 EUR'});
  assert.equal(a.mine,true);assert.equal(b.mine,false);
 });
 await check('plain_message_stays_without_card',async()=>assert.equal((await get()).messages.find(m=>m.id===plain.message_id).listing,null));
 await check('v1_reader_shape_stays_unchanged_after_v2_install',async()=>{
  const r=(await asActor(actors.buyer,'SELECT public.get_my_listing_conversation_v1($1,$2,$3) view',[actors.buyer,actors.buyerIdentity,cid])).rows[0].view;
  assert.equal(r.schema_version,1);assert.equal('attachment_listing' in r,false);
  assert.deepEqual(Object.keys(r.messages[0]).sort(),['created_at','id','mine','text']);
 });
 await db.exec("UPDATE public.listings SET title='Edited current title',price='9 EUR',image=NULL WHERE id=197;");
 await check('later_listing_edits_do_not_rewrite_stored_message_snapshot',async()=>{
  const r=await get('buyer','197');assert.equal(r.attachment_listing.title,'Edited current title');
  const a=r.messages.find(m=>m.id===msgA.message_id);assert.equal(a.listing.title,'Synthetic car');assert.equal(a.listing.image,imageA);assert.equal(a.listing.price,'4376 EUR');
 });
 const nextContact=(await asActor(actors.buyer,contactQuery,[actors.buyer,actors.buyerIdentity,'e1000000-0000-0000-0000-000000000002','199'])).rows[0].receipt;
 assert.equal(nextContact.conversation_id,cid);
 const msgB=await send('Second listing question','199');
 await check('same_identity_pair_can_discuss_two_listings_without_relabelling_history',async()=>{
  const r=await get('buyer','197');assert.equal(r.listing.id,'199');assert.equal(r.attachment_listing.id,'197');
  assert.equal(r.messages.find(m=>m.id===msgA.message_id).listing.id,'197');
  assert.equal(r.messages.find(m=>m.id===msgB.message_id).listing.id,'199');
  assert.equal(r.messages.find(m=>m.id===plain.message_id).listing,null);
 });
 await check('price_label_retains_precision_and_currency_exactly',async()=>assert.equal((await get()).messages.find(m=>m.id===msgB.message_id).listing.price,'999999999999999999.999 KWD'));
 for(const [id,label] of [['201','unrelated_owner'],['202','expired'],['203','unpublished'],['204','inactive'],['999','absent']]){
  await check('requested_'+label+'_preview_is_null_and_echoes_request',async()=>{
   const r=await get('buyer',id);assert.equal(r.attachment_listing_id,id);assert.equal(r.attachment_listing,null);
  });
 }
 await check('noncanonical_preview_id_is_rejected',()=>get('buyer','0197'),'22023');
 await check('forged_user_is_rejected',()=>asActor(actors.third,getQuery,[actors.buyer,actors.buyerIdentity,cid,null,'197']),'42501');
 await check('other_identity_on_same_account_is_rejected',()=>asActor(actors.buyer,getQuery,[actors.buyer,actors.otherBuyerIdentity,cid,null,'197']),'42501');
 await check('third_account_cannot_read_history_or_preview',()=>get('third','201'),'42501');
 await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[actors.seller,actors.buyer]);
 await check('blocked_member_can_read_history_but_can_send_is_false',async()=>{
  const r=await get();assert.equal(r.can_send,false);assert.equal(r.messages.length,3);
 });
 await check('existing_sender_keeps_block_check',()=>send('Blocked','199'),'42501');
 await db.exec('DELETE FROM public.user_blocks;');
 await db.query('DELETE FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id=$1',[actors.buyer]);
 await check('removed_allowlist_actor_cannot_read_cards',()=>get(),'42501');
 await db.query('INSERT INTO listing_publication_private.hosted_preview_actors VALUES($1)',[actors.buyer]);
 const beforeRead=await dataDigest();
 await get('buyer','197');await get('seller','199');
 await check('v2_read_does_not_write_any_user_message_or_listing_state',async()=>assert.deepEqual(await dataDigest(),beforeRead));
 for(let i=0;i<51;i++)await send('Pagination '+i,i%2?'199':null);
 await check('latest_page_has_fifty_and_cursor_preserves_message_cards',async()=>{
  const r=await get();assert.equal(r.messages.length,50);assert.equal(r.next_before_message_id,r.messages[0].id);
  assert.ok(r.messages.every((m,i)=>i===0||BigInt(r.messages[i-1].id)<BigInt(m.id)));
  const older=await get('buyer',null,r.next_before_message_id);assert.equal(older.messages.length,4);assert.equal(older.next_before_message_id,null);
  assert.equal(older.messages.find(m=>m.id===msgA.message_id).listing.id,'197');
  assert.equal(older.messages.find(m=>m.id===msgB.message_id).listing.id,'199');
  assert.equal(new Set([...older.messages,...r.messages].map(m=>m.id)).size,54);
 });
 // Reproduce actual terminal cleanup's allowed scrub then ON DELETE SET NULL.
 // The full storage/publication finalizer is outside this focused reader fixture.
 await db.exec(`
  ALTER TABLE public.messages ADD CONSTRAINT messages_listing_id_fkey FOREIGN KEY(listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;
  ALTER TABLE public.conversations ADD CONSTRAINT conversations_listing_id_fkey FOREIGN KEY(listing_id) REFERENCES public.listings(id) ON DELETE SET NULL;
  GRANT USAGE ON SCHEMA public TO selqiro_listing_final_writer_v1;
  GRANT SELECT ON public.messages,public.conversations,public.listings TO selqiro_listing_final_writer_v1;
  GRANT UPDATE(listing_title,listing_image,listing_price) ON public.messages TO selqiro_listing_final_writer_v1;
  GRANT UPDATE(listing_title_snapshot,listing_image_snapshot,listing_price_snapshot) ON public.conversations TO selqiro_listing_final_writer_v1;
  GRANT EXECUTE ON FUNCTION public.listing_contact_is_managed_v1(bigint,bigint) TO selqiro_listing_final_writer_v1;
  CREATE POLICY final_writer_messages ON public.messages FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
  CREATE POLICY final_writer_conversations ON public.conversations FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);
  CREATE POLICY final_writer_listings ON public.listings FOR SELECT TO selqiro_listing_final_writer_v1 USING(true);
  SET ROLE selqiro_listing_final_writer_v1;
  UPDATE public.messages SET listing_title=NULL,listing_image=NULL,listing_price=NULL WHERE listing_id=197;
  RESET ROLE;
  DELETE FROM public.listings WHERE id=197;
 `);
 await check('historical_listing_scrub_preserves_text_but_removes_card_without_rebuilding_from_header',async()=>{
  const latest=await get('buyer','197'),old=await get('buyer',null,latest.next_before_message_id);
  assert.equal(latest.listing.id,'199');assert.equal(latest.attachment_listing,null);assert.equal(latest.attachment_listing_id,'197');
  const m=old.messages.find(m=>m.id===msgA.message_id);assert.equal(m.text,'First listing question');assert.equal(m.listing,null);
  assert.equal(old.messages.find(m=>m.id===msgB.message_id).listing.id,'199');
 });
 await check('v1_projection_matches_v2_after_removing_only_added_fields',async()=>{
  const old=(await asActor(actors.buyer,'SELECT public.get_my_listing_conversation_v1($1,$2,$3) view',[actors.buyer,actors.buyerIdentity,cid])).rows[0].view;
  const latest=await get();const {attachment_listing_id,attachment_listing,...projection}=latest;
  projection.schema_version=1;projection.messages=projection.messages.map(({listing,...m})=>m);
  assert.deepEqual(projection,old);
 });
 results.passed=checks.filter(c=>c.passed).length;results.failed=checks.filter(c=>!c.passed).length;
 results.new_reader_sha256=crypto.createHash('sha256').update(read('changes.sql')).digest('hex');
 results.fixture_inputs={accepted_contact_fix_sha256:acceptedContactFixHash,
  preflight_sha256:crypto.createHash('sha256').update(read('preflight.sql')).digest('hex'),
  apply_sha256:crypto.createHash('sha256').update(read('apply.sql')).digest('hex'),
  verify_sha256:crypto.createHash('sha256').update(read('verify.sql')).digest('hex'),
  fixture_sha256:crypto.createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex')};
 results.fixture_mode=hostedInstaller?'nonsuper_hosted_installer':'default_superuser_installer';
 results.limitations=['Single-connection synthetic PGlite PostgreSQL fixture, not live Supabase','No multi-connection scheduler or real Storage HTTP','Legacy terminal scrub reproduced with existing trigger and actual FK behavior; full finalizer not rerun'];
 if(hostedInstaller)results.limitations.push('PGlite-protected postgres role flags changed through pg_authid only during isolated fixture setup; no production role is modified');
 fs.writeFileSync(path.join(evidence,'message-cards-fixture-result.json'),JSON.stringify(results,null,2)+'\n');
 console.log(JSON.stringify({passed:results.passed,failed:results.failed,version:results.version,result:path.join(evidence,'message-cards-fixture-result.json')}));
} catch(error) {
 results.error={code:error.code,message:error.message,where:error.where,stack:error.stack};
 fs.writeFileSync(path.join(evidence,'message-cards-fixture-result.json'),JSON.stringify(results,null,2)+'\n');
 console.error(JSON.stringify(results.error));process.exitCode=1;
} finally { await db.close(); }
