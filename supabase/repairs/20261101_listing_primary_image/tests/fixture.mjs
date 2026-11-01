// Disposable real-PostgreSQL fixture. Only synthetic rows; no provider/network calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const { PGlite } = await import(process.env.SELQIRO_PGLITE_MODULE || '@electric-sql/pglite');
export const here=path.dirname(fileURLToPath(import.meta.url));
export const root=path.resolve(here,'../../../..');
export const repair=path.dirname(here);
export const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
export const provenance=[];
const acceptedSource=JSON.parse(read('source-pins.json'));
const source=relative=>{
 const bytes=fs.readFileSync(path.join(root,relative));
 const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha256,acceptedSource.inputs[relative],'retained source changed: '+relative);
 provenance.push({path:relative,sha256});
 return bytes.toString('utf8');
};
const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
const before=source('supabase/releases/listing-publication-hosted-preview-v1/00_preconditions.sql');
const price=source('supabase/releases/listing-publication-hosted-preview-v1/10_price_core.sql');
const core=source('supabase/releases/listing-publication-hosted-preview-v1/20_publication_core.sql');
const multipart=source('supabase/releases/listing-publication-hosted-preview-v1/30_multipart_and_journey.sql');
const authority=source('supabase/releases/listing-publication-hosted-preview-v1/60_preview_authority.sql');
const assembled=source('supabase/releases/listing-publication-hosted-preview-v1/release.sql');
export const previousPreflight=source('supabase/repairs/20261101_listing_primary_image/tests/previous-preflight.sql');
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function namePattern(name){return name.split('.').map(part=>`(?:${escape(part)}|"${escape(part)}")`).join('\\.');}
export function fn(sql,name){
 const all=[...sql.matchAll(new RegExp('CREATE(?: OR REPLACE)? FUNCTION '+namePattern(name)+'\\s*\\(','gi'))];
 assert(all.length,`missing function ${name}`);
 const from=all.at(-1).index;
 const tail=sql.slice(from);
 const body=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(tail);
 assert(body,`missing delimiter ${name}`);
 const end=tail.indexOf(body[1],body.index+body[0].length)+body[1].length;
 return tail.slice(0,tail.indexOf(';',end)+1);
}
function table(sql,name){
 const found=new RegExp('CREATE TABLE(?: IF NOT EXISTS)? '+namePattern(name)+'\\s*\\(','i').exec(sql);
 assert(found,`missing table ${name}`);
 const end=/^\);/m.exec(sql.slice(found.index));
 assert(end,`missing table end ${name}`);
 return sql.slice(found.index,found.index+end.index+3);
}
function trigger(sql,name){
 const found=new RegExp('CREATE TRIGGER '+escape(name)+'\\s','i').exec(sql);
 assert(found,`missing trigger ${name}`);
 return sql.slice(found.index,sql.indexOf(';',found.index)+1);
}
function declaration(sql,kind,name){
 const found=new RegExp('CREATE '+kind+' '+namePattern(name)+'\\s','i').exec(sql);
 assert(found,`missing ${kind} ${name}`);
 return sql.slice(found.index,sql.indexOf(';',found.index)+1);
}
function policy(name){
 const start=baseline.indexOf('CREATE POLICY "'+name+'"');assert(start>=0,name);
 return baseline.slice(start,baseline.indexOf(';',start)+1);
}
export const originalPublicWriterPolicies=[
 declaration(core,'POLICY','final_writer_listings'),
 declaration(core,'POLICY','final_writer_images')
];
export const originalCoreReceipt=fn(core,'listing_publication_private.final_receipt');
export const latestMultipartReceipt=fn(multipart,'listing_publication_private.final_receipt');
const multipartHelper=fn(multipart,'listing_publication_private.multipart_object_fully_deleted');
export const actors={
 owner:'91000000-0000-0000-0000-000000000001',
 peer:'92000000-0000-0000-0000-000000000002',
 member:'93000000-0000-0000-0000-000000000003',
 outsider:'94000000-0000-0000-0000-000000000004',
 ownerIdentity:'a1000000-0000-0000-0000-000000000001',
 otherIdentity:'a1100000-0000-0000-0000-000000000001',
 peerIdentity:'b2000000-0000-0000-0000-000000000002',
 memberIdentity:'c3000000-0000-0000-0000-000000000003',
 outsiderIdentity:'d4000000-0000-0000-0000-000000000004',
 business:'e1000000-0000-0000-0000-000000000001',
 businessIdentity:'e2000000-0000-0000-0000-000000000002'
};
export const db=await PGlite.create();
const sourceTables=['profiles','identities','business_accounts','business_members','listings','listing_images'];
const privateTables=['attempts','slots','objects','cleanup','web_images','publications'];
const multipartTables=['multipart_attempts','multipart_sessions','multipart_auxiliary_receipts'];
const multipartAuthorityFrom=multipart.indexOf('ALTER TABLE listing_publication_private.multipart_attempts ENABLE ROW LEVEL SECURITY;');
const multipartAuthorityTo=multipart.indexOf('-- Application-owned, column- and bucket-bounded metadata witnesses.',multipartAuthorityFrom);
assert(multipartAuthorityFrom>=0&&multipartAuthorityTo>multipartAuthorityFrom);
const stateFrom=core.indexOf('-- Replace exactly the two old state-related CHECKs.');
const stateTo=core.indexOf('CREATE FUNCTION listing_publication_private.final_receipt',stateFrom);
const exactFunctions=[
 [baseline,'public.current_user_has_identity_access'],
 [baseline,'public.set_listing_primary_image_v2'],
 [before,'public.listing_actor_uid_hosted_v1'],
 [before,'listing_publication_private.hosted_storage_contract_ready'],
 [before,'listing_publication_private.assert_hosted_preview_actor'],
 [price,'public.lock_listing_creation_actor_v1'],
 [price,'public.require_listing_create_keys_v1'],
 [core,'listing_publication_private.require_actor'],
 [core,'listing_publication_private.validate_web_intent'],
 [core,'public.listing_final_guard_state_v1'],
 [core,'public.guard_listing_price_v2'],
 [core,'listing_publication_private.guard_managed_listing'],
 [core,'listing_publication_private.guard_managed_image'],
 [core,'listing_publication_private.protect_attempt'],
 [core,'listing_publication_private.protect_slot'],
 [core,'listing_publication_private.protect_object'],
 [core,'listing_publication_private.protect_web_image'],
 [core,'listing_publication_private.protect_publication'],
 [core,'listing_publication_private.apply_delete'],
 [multipart,'listing_publication_private.final_receipt'],
 [core,'public.delete_my_published_listing_v1'],
 [authority,'public.get_selqiro_hosted_preview_readiness_v1']
];
export const dependencyNames=exactFunctions.map(([,name])=>name);
// Each hosted declaration must be the final declaration in the complete retained
// release, not merely the last definition in an earlier component file.
for(const [sql,name] of exactFunctions){
 if(sql!==baseline)assert.equal(fn(sql,name),fn(assembled,name),'stale component declaration: '+name);
}
assert.equal(multipartHelper,fn(assembled,'listing_publication_private.multipart_object_fully_deleted'));
for(const name of ['final_writer_listings','final_writer_images']){
 assert.equal(declaration(core,'POLICY',name),declaration(assembled,'POLICY',name));
}
await db.exec(`
 CREATE ROLE anon NOLOGIN;
 CREATE ROLE authenticated NOLOGIN;
 CREATE ROLE service_role NOLOGIN BYPASSRLS;
 CREATE ROLE selqiro_listing_final_writer_v1 NOLOGIN NOINHERIT NOBYPASSRLS;
 GRANT anon,authenticated,service_role TO postgres;
 GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN FALSE,INHERIT TRUE,SET TRUE;
 REVOKE CREATE ON SCHEMA public FROM PUBLIC;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
 $$;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE SCHEMA storage;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 -- Empty synthetic provider metadata, accessed only through the retained exact
 -- bucket/path-bounded view. This fixture never calls Storage or fabricates IO.
 CREATE TABLE storage.objects(id uuid PRIMARY KEY,bucket_id text,name text,version text);
 INSERT INTO storage.buckets VALUES('listing-publication-private',false,26214400,ARRAY['application/octet-stream','image/webp']);
 CREATE SCHEMA listing_publication_private;
 ALTER DEFAULT PRIVILEGES IN SCHEMA listing_publication_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
 ${sourceTables.map(n=>table(baseline,'public.'+n)).join('\n')}
 ${sourceTables.map(n=>`ALTER TABLE public.${n} ADD PRIMARY KEY(id); ALTER TABLE public.${n} ENABLE ROW LEVEL SECURITY;`).join('\n')}
 ALTER TABLE public.listings ADD COLUMN price_kind text,ADD COLUMN currency text,ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;
 ${table(before,'listing_publication_private.hosted_preview_settings')}
 ${table(before,'listing_publication_private.hosted_preview_actors')}
 ${privateTables.map(n=>table(core,'listing_publication_private.'+n)).join('\n')}
 ${core.slice(stateFrom,stateTo)}
 ${multipartTables.map(n=>table(multipart,'listing_publication_private.'+n)).join('\n')}
 ${multipart.slice(multipartAuthorityFrom,multipartAuthorityTo)}
 ${declaration(core,'VIEW','listing_publication_private.hosted_storage_objects')}
 ${[...privateTables,'hosted_preview_settings','hosted_preview_actors'].map(n=>`ALTER TABLE listing_publication_private.${n} ENABLE ROW LEVEL SECURITY;`).join('\n')}
 CREATE TABLE public.conversations(id bigint PRIMARY KEY,listing_id bigint,listing_title_snapshot text,listing_image_snapshot text,listing_price_snapshot text);
 CREATE TABLE public.messages(id bigint PRIMARY KEY,listing_id bigint,listing_title text,listing_image text,listing_price text);
 ${multipartHelper}
 ${exactFunctions.map(([sql,name])=>fn(sql,name)).join('\n')}
 ${['protect_attempt','protect_slot','protect_object','protect_web_image','protect_web_image_truncate',
 'protect_publication','protect_publication_truncate','guard_managed_listing','guard_managed_image','guard_managed_image_truncate'].map(n=>trigger(core,n)).join('\n')}
 CREATE TRIGGER fixture_price_guard BEFORE INSERT OR UPDATE OR DELETE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.guard_listing_price_v2();
 ${['Business members can read business identities','Business members can read members','Business owners can manage business identities',
 'Business owners can manage members','Users can manage their private identities','Users can read their private identities'].map(policy).join('\n')}
 CREATE POLICY fixture_profiles ON public.profiles FOR SELECT USING(true);
 CREATE POLICY fixture_public_listings ON public.listings FOR SELECT USING(true);
 CREATE POLICY fixture_public_images ON public.listing_images FOR SELECT USING(true);
 ${originalPublicWriterPolicies.join('\n')}
 ${privateTables.map(n=>`CREATE POLICY final_internal_writer ON listing_publication_private.${n} FOR ALL TO selqiro_listing_final_writer_v1 USING(true) WITH CHECK(true);`).join('\n')}
 REVOKE ALL ON ALL TABLES IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON ALL FUNCTIONS IN SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON SCHEMA listing_publication_private FROM PUBLIC,anon,authenticated,service_role;
 GRANT USAGE ON SCHEMA public,listing_publication_private TO selqiro_listing_final_writer_v1;
 GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
 GRANT SELECT,INSERT,UPDATE,DELETE ON public.listings,public.listing_images TO selqiro_listing_final_writer_v1;
 GRANT SELECT ON ALL TABLES IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
 GRANT INSERT,UPDATE ON listing_publication_private.publications,listing_publication_private.cleanup TO selqiro_listing_final_writer_v1;
 GRANT UPDATE(state,payload,closed_at) ON listing_publication_private.attempts TO selqiro_listing_final_writer_v1;
 GRANT SELECT,UPDATE ON public.messages,public.conversations TO selqiro_listing_final_writer_v1;
 GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
 REVOKE ALL ON FUNCTION public.current_user_has_identity_access(uuid) FROM PUBLIC;
 GRANT EXECUTE ON FUNCTION public.current_user_has_identity_access(uuid) TO authenticated,service_role,selqiro_listing_final_writer_v1;
 REVOKE ALL ON FUNCTION public.lock_listing_creation_actor_v1(uuid),public.require_listing_create_keys_v1(jsonb,text[]) FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON FUNCTION public.listing_actor_uid_hosted_v1(),public.listing_final_guard_state_v1(bigint) FROM PUBLIC;
 GRANT EXECUTE ON FUNCTION public.listing_actor_uid_hosted_v1(),public.listing_final_guard_state_v1(bigint)
  TO anon,authenticated,service_role,selqiro_listing_final_writer_v1;
 GRANT SELECT ON public.listings,public.listing_images TO authenticated;
 GRANT EXECUTE ON FUNCTION public.set_listing_primary_image_v2(text,text) TO authenticated;
 GRANT CREATE ON SCHEMA listing_publication_private TO selqiro_listing_final_writer_v1;
 ALTER FUNCTION listing_publication_private.apply_delete(uuid) OWNER TO selqiro_listing_final_writer_v1;
 REVOKE CREATE ON SCHEMA listing_publication_private FROM selqiro_listing_final_writer_v1;
 INSERT INTO listing_publication_private.hosted_preview_settings(singleton,project_ref,release_id,instance_id,enabled,release_ready,storage_authority_version)
 VALUES(true,'vyjletlmwoiwxsnsunlm','listing-publication-hosted-preview-v1','2d088814-0900-448a-a9d1-7b05470cb1d2',true,true,'source-part-rfc3986-v1');
 INSERT INTO auth.users VALUES('${actors.owner}'),('${actors.peer}'),('${actors.member}'),('${actors.outsider}');
 INSERT INTO public.profiles(id,active_identity_id) VALUES
 ('${actors.owner}','${actors.ownerIdentity}'),('${actors.peer}','${actors.peerIdentity}'),
 ('${actors.member}','${actors.memberIdentity}'),('${actors.outsider}','${actors.outsiderIdentity}');
 INSERT INTO public.identities(id,type,user_id,display_name,status) VALUES
 ('${actors.ownerIdentity}','private','${actors.owner}','Synthetic owner','active'),
 ('${actors.otherIdentity}','private','${actors.owner}','Synthetic other identity','active'),
 ('${actors.peerIdentity}','private','${actors.peer}','Synthetic peer','active'),
 ('${actors.memberIdentity}','private','${actors.member}','Synthetic member','active'),
 ('${actors.outsiderIdentity}','private','${actors.outsider}','Synthetic outsider','active');
 INSERT INTO public.identities(id,type,business_account_id,display_name,status)
 VALUES('${actors.businessIdentity}','business','${actors.business}','Synthetic business','active');
 INSERT INTO public.business_members(business_account_id,user_id,role,status)
 VALUES('${actors.business}','${actors.owner}','owner','active'),('${actors.business}','${actors.member}','member','active');
 INSERT INTO listing_publication_private.hosted_preview_actors(actor_user_id) VALUES('${actors.owner}'),('${actors.peer}'),('${actors.member}');
`);
// Simulate hosted schema-role authority (no superuser), not provider Supautils.
await db.exec("UPDATE pg_authid SET rolsuper=false,rolcreaterole=true,rolbypassrls=true WHERE rolname='postgres'");
export async function asActor(user,sql,params=[]){
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[user,JSON.stringify({sub:user,role:'authenticated'})]);
 await db.exec('SET ROLE authenticated');
 try{return await db.query(sql,params);}
 finally{await db.exec('RESET ROLE');await db.exec("SELECT set_config('request.jwt.claim.sub','',false),set_config('request.jwt.claims','{}',false)");}
}
export async function asRole(role,sql,params=[]){
 assert(['anon','service_role','authenticated','selqiro_listing_final_writer_v1'].includes(role));
 await db.exec('SET ROLE '+role);
 try{return await db.query(sql,params);}finally{await db.exec('RESET ROLE');}
}
export async function withActorContext(user,operation){
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
 try{return await operation();}finally{await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");}
}
export async function seedListing(id,{count=3,identity=actors.ownerIdentity,author=actors.owner,status='active',bad=null}={}){
 const attempt=crypto.randomUUID();
 const created=new Date().toISOString();
 await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,image)
 VALUES($1,$2,$3,$2,'Synthetic listing',$4,$5)`,[id,author,identity,status,count?`/api/v2/listing-media/${attempt}/0`:null]);
 await db.query(`INSERT INTO listing_publication_private.attempts(id,actor_user_id,identity_id,request_key,intent_sha256,payload,policy_snapshot,state,created_at,expires_at,closed_at)
 VALUES($1,$2,$3,$4,decode(repeat('a',64),'hex'),NULL,'[{}]','published',$5::timestamptz,$5::timestamptz+interval '24 hours',$5::timestamptz)`,[attempt,author,identity,crypto.randomUUID(),created]);
 for(let ordinal=0;ordinal<count;ordinal++){
  const slot=crypto.randomUUID();const sourceId=crypto.randomUUID();const webId=crypto.randomUUID();
  await db.query(`INSERT INTO listing_publication_private.slots(id,attempt_id,ordinal,client_file_id,expected_source_bytes,expected_source_sha256)
   VALUES($1,$2,$3,$4,100,decode(repeat('b',64),'hex'))`,[slot,attempt,bad==='ordinal-gap'?ordinal+1:ordinal,crypto.randomUUID()]);
  await db.query(`INSERT INTO listing_publication_private.objects(id,attempt_id,slot_id,kind,bucket_id,object_path,reserved_bytes)
   VALUES($1,$2,$3,'source','listing-publication-private',$4,26214400),($5,$2,$3,'web','listing-publication-private',$6,4194304)`,
   [sourceId,attempt,slot,`v1/${attempt}/${slot}/source.upload`,webId,`v1/${attempt}/${slot}/web-v1.webp`]);
  const intent={pipeline_version:'listing-web-v1',content_type:'image/webp',source_sha256:'b'.repeat(64),source_bytes:100,
   source_format:'jpeg',web_sha256:'c'.repeat(64),web_bytes:100,width:200,height:100,sharp_version:'0.34.3',libvips_version:'8.17.1'};
  if(bad==='invalid-intent')intent.web_bytes=4194305;
  if(bad!=='missing-ready')await db.query(`INSERT INTO listing_publication_private.web_images(attempt_id,slot_id,request_key,claimed_at,process_before_epoch,state,intent,prepared_at,write_before_epoch,ready_id,ready_at)
   VALUES($1,$2,$3,$4::timestamptz,floor(extract(epoch FROM $4::timestamptz))::bigint+120,'ready',$5::jsonb,$4::timestamptz,floor(extract(epoch FROM $4::timestamptz))::bigint+30,$6,$4::timestamptz)`,
   [attempt,slot,crypto.randomUUID(),created,JSON.stringify(intent),crypto.randomUUID()]);
  await db.query(`INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
   VALUES($1,'listing-publication-private',$2,'published_source','blocked_write_settlement',$3::timestamptz)`,[sourceId,`v1/${attempt}/${slot}/source.upload`,created]);
  if(bad==='web-cleanup')await db.query(`INSERT INTO listing_publication_private.cleanup(object_id,bucket_id,object_path,reason,state,enqueued_at)
   VALUES($1,'listing-publication-private',$2,'terminal_delete','blocked_write_settlement',$3::timestamptz)`,[webId,`v1/${attempt}/${slot}/web-v1.webp`,created]);
  const url=`/api/v2/listing-media/${attempt}/${ordinal}`;
  if(!(bad==='missing-image'&&ordinal===count-1))await db.query(`INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
   VALUES($1,$2,$3,$4,$3,$5,$6)`,[id,author,url,bad==='wrong-url'&&ordinal===count-1?'https://invalid.test/wrong':url,ordinal,bad==='multiple-primary'||ordinal===0]);
 }
 if(bad==='extra-image')await db.query(`INSERT INTO public.listing_images(listing_id,user_id,original_url,medium_url,thumb_url,sort_order,is_primary)
  VALUES($1,$2,'/extra','/extra','/extra',9,false)`,[id,author]);
 if(bad==='wrong-mirror')await db.query("UPDATE public.listings SET image='/wrong' WHERE id=$1",[id]);
 if(bad==='wrong-creator')await db.query('UPDATE public.listings SET created_by_user_id=$2 WHERE id=$1',[id,actors.peer]);
 await db.query(`INSERT INTO listing_publication_private.publications(attempt_id,listing_id,confirmation_sha256,published_at,state)
 VALUES($1,$2,repeat('d',64),$3::timestamptz,'published')`,[attempt,id,created]);
 return {id,attempt,identity,author};
}
export async function immutableSnapshot(){
 const tables=['attempts','slots','objects','web_images','publications','cleanup','multipart_attempts','multipart_sessions',
  'multipart_auxiliary_receipts','hosted_preview_settings','hosted_preview_actors'];
 const output={};
 for(const name of tables)output[name]=(await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]') value FROM listing_publication_private.${name} t`)).rows[0].value;
 output.images=(await db.query("SELECT coalesce(jsonb_agg(to_jsonb(i)-'is_primary' ORDER BY i.id),'[]') value FROM public.listing_images i")).rows[0].value;
 output.listings=(await db.query("SELECT coalesce(jsonb_agg(to_jsonb(l)-'image' ORDER BY l.id),'[]') value FROM public.listings l")).rows[0].value;
 return output;
}
