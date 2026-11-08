// Fresh, disposable PostgreSQL/WASM fixture. Restore the exact retained public
// and messaging declarations before installing the new horse modules. No old
// suite is rerun and no database or Storage HTTP request leaves this process.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const baselineOnly=process.env.SELQIRO_HORSE_BASELINE_ONLY==='1';
const previous=process.env.SELQIRO_HORSE_BASELINE_ONLY;
process.env.SELQIRO_HORSE_BASELINE_ONLY='1';
const base=await import('./fixture.mjs');
if(previous===undefined)delete process.env.SELQIRO_HORSE_BASELINE_ONLY;
else process.env.SELQIRO_HORSE_BASELINE_ONLY=previous;
export const {db,actors,asActor,asRole,withActorContext,root,repair,call,service,prepare,publish,status,cancel,
 ownerRead,isPublic,content,confirmations,shownPolicies,newImage,readyImage,denied,setIdentity}=base;
export const provenance=[...base.provenance];
export const sourceProvenance=provenance;
export const dependencyNames=[];
function source(relative){
 const bytes=fs.readFileSync(path.join(root,relative));
 provenance.push({path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 return bytes.toString('utf8');
}
function fn(sql,name){
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const escaped=name.split('.').map(p=>'(?:'+escape(p)+'|"'+escape(p)+'")').join('\\s*\\.\\s*');
 const match=new RegExp('create\\s+(?:or\\s+replace\\s+)?function\\s+'+escaped+'\\s*\\(','i').exec(sql);
 assert(match,name);const text=sql.slice(match.index),delimiter=/\bas\s+(\$[a-z_0-9]*\$)/i.exec(text);assert(delimiter,name);
 const end=text.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;
 return text.slice(0,text.indexOf(';',end)+1);
}
function table(sql,name){
 const start=sql.indexOf('CREATE TABLE IF NOT EXISTS "public"."'+name+'"');assert(start>=0,name);
 return sql.slice(start,sql.indexOf('\n);',start)+3);
}
let dependenciesInstalled=false,horseInstalled=false;
export async function installPublicDependencies(){
 if(dependenciesInstalled)return;
 const baseline=source('supabase/migrations/20260722173530_baseline_20260722.sql');
 // The inherited media fixture has empty, five-column conversation/message
 // tables. Add each missing column from its exact baseline declaration.
 for(const name of ['conversations','messages']){
  const existing=new Set((await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[name])).rows.map(x=>x.column_name));
  for(const line of table(baseline,name).split('\n').slice(1,-1)){
   const match=/^\s*"([a-z_]+)"\s+(.+?)(?:,)?$/.exec(line);assert(match,'baseline column '+name+': '+line);
   if(!existing.has(match[1]))await db.exec('ALTER TABLE public.'+name+' ADD COLUMN '+line.trim().replace(/,$/,''));
  }
  await db.exec('ALTER TABLE public.'+name+' ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY; ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY');
 }
 for(const name of ['conversation_participants','identity_profiles','user_blocks']){
  await db.exec(table(baseline,name)+'\nALTER TABLE public.'+name+' ADD PRIMARY KEY(id); ALTER TABLE public.'+name+' ENABLE ROW LEVEL SECURITY;');
 }
 await db.exec(`
  ALTER TABLE public.conversation_participants ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY;
  ALTER TABLE public.conversation_participants ADD UNIQUE(conversation_id,user_id);
  ALTER TABLE public.identity_profiles ADD UNIQUE(identity_id);
  CREATE SEQUENCE public.user_blocks_id_seq OWNED BY public.user_blocks.id;
  ALTER TABLE public.user_blocks ALTER COLUMN id SET DEFAULT nextval('public.user_blocks_id_seq');
  ALTER TABLE public.user_blocks ADD UNIQUE(blocker_id,blocked_id);
 `);
 const contacts=source('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
 const contactFrom=contacts.indexOf('CREATE ROLE selqiro_listing_contact_writer_v1');
 const contactEnd=contacts.indexOf('COMMENT ON SCHEMA listing_contact_private IS',contactFrom);
 assert(contactFrom>=0&&contactEnd>contactFrom);
 // The inherited retained-authority composition already created this role.
 const contactSql=contacts.slice(contactFrom,contacts.indexOf(';',contactEnd)+1)
  .replace(/^CREATE ROLE selqiro_listing_contact_writer_v1[\s\S]*?;/,'');
 await db.exec(contactSql+'\n'+contacts.slice(contacts.indexOf('CREATE FUNCTION listing_contact_private.peer_ready(')));
 await db.exec(`
  GRANT EXECUTE ON FUNCTION public.contact_my_listing_seller_v1(uuid,uuid,uuid,text),
   public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text),public.get_my_listing_conversation_v1(uuid,uuid,text,text),
   public.list_my_listing_conversations_v1(uuid,uuid,text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.listing_contact_is_managed_v1(bigint,bigint)
   TO anon,authenticated,service_role,selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1,selqiro_listing_contact_writer_v1;
  GRANT EXECUTE ON FUNCTION public.listing_contact_visible_v1(bigint) TO authenticated,selqiro_listing_contact_writer_v1;
  GRANT EXECUTE ON FUNCTION listing_publication_private.assert_hosted_preview_actor(uuid) TO selqiro_listing_contact_writer_v1;
 `);
 const accepted=source('supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql');
 assert.equal(crypto.createHash('sha256').update(accepted).digest('hex'),'aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b');
 await db.exec(accepted);
 await db.exec(source('supabase/repairs/20261029_listing_message_cards/changes.sql'));
 await db.exec(source('supabase/repairs/20261030_messaging_restore/changes.sql'));
 const search=source('supabase/migrations/20260926180000_add_public_listing_detail_keywords.sql');
 await db.exec(fn(search,'public.public_listing_search_document_v1')+'\n'+fn(contacts,'public.listing_price_read_model_v1'));
 await db.exec(`
  REVOKE ALL ON FUNCTION public.public_listing_search_document_v1(text,text,text,text,jsonb),
   public.listing_price_read_model_v1(text,numeric,text,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
  GRANT EXECUTE ON FUNCTION public.public_listing_search_document_v1(text,text,text,text,jsonb)
   TO anon,authenticated,service_role,selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1;
  INSERT INTO public.identity_profiles(identity_id,display_name,slug)
   SELECT id,display_name,'synthetic-'||id FROM public.identities;
  INSERT INTO storage.buckets VALUES('messages',true,5242880,ARRAY['image/webp','image/jpeg','image/png']),
   ('message-attachments-v2',false,2000000,ARRAY['image/webp']);
 `);
 dependenciesInstalled=true;
 const names=(await db.query(`SELECT DISTINCT n.nspname||'.'||p.proname name FROM pg_proc p
  JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('listing_contact_private','messaging_private_v2')
  OR (n.nspname='public' AND p.proname IN('contact_my_listing_seller_v1','send_my_listing_message_v1',
   'get_my_listing_conversation_v1','get_my_listing_conversation_v2','list_my_listing_conversations_v1',
   'listing_contact_is_managed_v1','listing_contact_visible_v1','list_my_message_threads_v2','get_my_message_thread_v2',
   'send_my_message_v2','mark_my_thread_read_v2','hide_my_thread_v2','set_my_thread_block_v2',
   'reserve_my_message_photo_v2','cancel_my_message_photo_v2','get_my_message_photo_binding_v2',
   'claim_message_photo_upload_v2','finish_message_photo_upload_v2','claim_message_photo_cleanup_v2',
   'finish_message_photo_cleanup_v2','public_listing_search_document_v1','listing_price_read_model_v1'))
  ORDER BY name`)).rows;
 dependencyNames.push(...names.map(x=>x.name));
}
export async function applyHorseModules(){
 if(horseInstalled)return;
 await installPublicDependencies();
 await base.installHorseModules();
 for(const name of ['06_contact.sql','07_public.sql'])await db.exec(fs.readFileSync(path.join(repair,name),'utf8'));
 horseInstalled=true;
}
await installPublicDependencies();
if(!baselineOnly)await applyHorseModules();
