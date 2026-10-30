import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { PGlite } = await import(process.env.SELQIRO_PGLITE_MODULE || '@electric-sql/pglite');
const here = path.dirname(fileURLToPath(import.meta.url));
const source = process.env.SELQIRO_INBOX_SOURCE || path.resolve(here, '../../../..');
const root = process.env.SELQIRO_INBOX_TEST_OUTPUT || path.resolve(here, '..');
const hostedInstaller = true;
const baseline = fs.readFileSync(source + '/supabase/migrations/20260722173530_baseline_20260722.sql', 'utf8');
const preconditions = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql', 'utf8');
const core = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql', 'utf8');
const publication = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql', 'utf8');
const contacts = fs.readFileSync(source + '/supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql', 'utf8');
// Frozen test-only input; the delivery runner never executes this fixture.
const acceptedContactFix = fs.readFileSync(path.join(source, 'supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql'), 'utf8');
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
  finally { await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)"); }
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

await db.exec(acceptedContactFix);
await db.exec(fs.readFileSync(path.join(source,'supabase/repairs/20261029_listing_message_cards/changes.sql'),'utf8'));
await db.exec(`
 ALTER TABLE public.identities ADD COLUMN avatar_url text;
 ALTER TABLE public.user_blocks ADD UNIQUE(blocker_id,blocked_id);
 CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK(sender_id=auth.uid());
 GRANT INSERT ON public.messages TO authenticated;
 GRANT USAGE ON SEQUENCE public.messages_id_seq TO authenticated;
 CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
 GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;
 CREATE POLICY legacy_permissive_test ON storage.objects FOR ALL TO PUBLIC USING(true) WITH CHECK(true);
 INSERT INTO storage.buckets VALUES('messages',true,5242880,ARRAY['image/webp','image/jpeg','image/png']);
 INSERT INTO storage.buckets VALUES('message-attachments-v2',false,2000000,ARRAY['image/webp']);
 GRANT anon,authenticated,service_role,selqiro_listing_final_writer_v1 TO postgres;
 ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated,service_role;
`);
// Authority regression only: emulate a provider-owned table without giving
// postgres the owner role. No Supautils C hook exists in PGlite.
if(process.env.SELQIRO_TEST_STORAGE_NONOWNER==='1'){
 await db.exec(`
  CREATE ROLE synthetic_storage_owner NOLOGIN NOINHERIT;
  ALTER TABLE storage.objects OWNER TO synthetic_storage_owner;
  GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO postgres;
 `);
}
await db.exec("UPDATE pg_authid SET rolsuper=false,rolcreaterole=true,rolbypassrls=true WHERE rolname='postgres'");
const dir=path.join(source,'supabase/repairs/20261030_messaging_restore');
const read=file=>fs.readFileSync(path.join(dir,file),'utf8');
async function asService(query,params=[]){
 await db.exec('SET ROLE service_role');
 try{return await db.query(query,params);}finally{await db.exec('RESET ROLE');}
}
async function guardEvidence(freshFingerprints){
 const files=['build-guards.py','catalog-guard.sql','preflight.sql','apply.sql','verify.sql','changes.sql',
  'function-pins.json','structure-pins.json','tests/catalog-structure.sql','tests/fixture.mjs',
  'tests/installation-runtime.mjs','tests/storage-authority-runtime.mjs','tests/pre-authority-fresh-fingerprints.json'];
 const hashes=Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex')]));
 const expectedRuntime='eaa813d5cee8ad9514f3e1de9bafb6a4c5f9cacebb1a96ef957fc08951dac883';
 assert.equal(hashes['changes.sql'],expectedRuntime,'frozen runtime SQL changed');
 assert.deepEqual(freshFingerprints,JSON.parse(read('tests/pre-authority-fresh-fingerprints.json')));
 return {
  schema_version:1,
  source_sha256:hashes,
  unchanged_runtime_sql_sha256:expectedRuntime,
  fresh_fingerprints:freshFingerprints,
  fresh_fingerprints_match_previous:true,
  engine:{implementation:'PGlite',server_version_num:Number((await db.query("SELECT current_setting('server_version_num') value")).rows[0].value)},
  provider_supautils_hook_executed:false,
  native_postgresql_17_executed:false,
  live_database_or_storage_calls:false
 };
}
export {db,source,dir,read,actors,asActor,asService,check,checks,results,guardEvidence};
