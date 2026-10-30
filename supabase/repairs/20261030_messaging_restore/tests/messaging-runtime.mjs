import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {db,dir,read,actors as a,asActor,asService,check,checks,results} from './fixture.mjs';
const photoWire={};
const key=n=>`e1000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const readOne=async(user,identity,cid,before=null,lid=null)=>(await asActor(user,'SELECT public.get_my_message_thread_v2($1,$2,$3,$4,$5) value',[user,identity,cid,before,lid])).rows[0].value;
const inbox=async(user,identity,before=null)=>(await asActor(user,'SELECT public.list_my_message_threads_v2($1,$2,$3,$4) value',[user,identity,before?.updated_at??null,before?.conversation_id??null])).rows[0].value;
const send=async(user,identity,cid,k,text,lid=null,photo=null)=>(await asActor(user,'SELECT public.send_my_message_v2($1,$2,$3,$4,$5,$6,$7) value',[user,identity,k,cid,text,lid,photo])).rows[0].value;
const reserve=async(user,identity,cid,k,hash='1'.repeat(64))=>(await asActor(user,'SELECT public.reserve_my_message_photo_v2($1,$2,$3,$4,$5,$6,$7) value',[user,identity,k,cid,hash,12345,'image/webp'])).rows[0].value;
const claim=async(photo,k,web='2'.repeat(64))=>(await asService('SELECT public.claim_message_photo_upload_v2($1,$2,$3,$4,$5,$6,$7,$8,$9) value',[photo.attachment_id,photo.actor_user_id,photo.identity_id,photo.source_sha256,k,web,8000,640,480])).rows[0].value;
const finish=async(photo,outcome='ready')=>(await asService('SELECT public.finish_message_photo_upload_v2($1,$2,$3,$4,$5,$6,$7,$8) value',[photo.attachment_id,photo.upload_key,outcome,photo.web_sha256,photo.web_bytes,photo.width,photo.height,null])).rows[0].value;
const mark=async(user,identity,cid,mid)=>(await asActor(user,'SELECT public.mark_my_thread_read_v2($1,$2,$3,$4) value',[user,identity,cid,mid])).rows[0].value;
const block=async(user,identity,cid,on)=>(await asActor(user,'SELECT public.set_my_thread_block_v2($1,$2,$3,$4) value',[user,identity,cid,on])).rows[0].value;
const hide=async(user,identity,cid)=>(await asActor(user,'SELECT public.hide_my_thread_v2($1,$2,$3) value',[user,identity,cid])).rows[0].value;
const cancel=async(user,identity,cid,photo)=>(await asActor(user,'SELECT public.cancel_my_message_photo_v2($1,$2,$3,$4) value',[user,identity,cid,photo])).rows[0].value;
const binding=async(user,identity,cid,mid)=>(await asActor(user,'SELECT public.get_my_message_photo_binding_v2($1,$2,$3,$4) value',[user,identity,cid,mid])).rows[0].value;
const legacy=async()=>{
 const cid=(await db.query(`INSERT INTO public.conversations(buyer_id,seller_id,buyer_identity_id,seller_identity_id,created_by,listing_title_snapshot)
 VALUES($1,$2,$3,$4,$1,'Historical listing') RETURNING id::text`,[a.buyer,a.seller,a.buyerIdentity,a.sellerIdentity])).rows[0].id;
 await db.query('INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id) VALUES($1,$2,$3),($1,$4,$5)',[cid,a.buyer,a.buyerIdentity,a.seller,a.sellerIdentity]);return cid;
};
const catalogQuery=`SELECT n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')' signature,
 p.proname name,n.nspname schema,pg_get_userbyid(p.proowner) owner,l.lanname language,p.prosecdef secdef,p.provolatile volatility,
 p.proargnames args,p.pronargdefaults defaults,pg_get_expr(p.proargdefaults,0) default_expression,
 pg_get_function_result(p.oid) result,p.proconfig config,
 encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') body_sha256,
 ARRAY(SELECT CASE WHEN acl.grantee=0 THEN 'public' ELSE pg_get_userbyid(acl.grantee) END FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 WHERE acl.privilege_type='EXECUTE' ORDER BY 1) acl_roles
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='public' AND p.proname IN('list_my_message_threads_v2','get_my_message_thread_v2','send_my_message_v2','mark_my_thread_read_v2','hide_my_thread_v2','set_my_thread_block_v2',
 'reserve_my_message_photo_v2','claim_message_photo_upload_v2','finish_message_photo_upload_v2','cancel_my_message_photo_v2','get_my_message_photo_binding_v2','claim_message_photo_cleanup_v2','finish_message_photo_cleanup_v2'))
 OR n.nspname='messaging_private_v2' OR (n.nspname='listing_contact_private' AND p.proname='guard_message') ORDER BY 1`;
const oldCatalog=async()=> (await db.query(`SELECT p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,p.proacl::text acl
 FROM pg_proc p WHERE p.pronamespace IN('listing_contact_private'::regnamespace,'listing_publication_private'::regnamespace)
 OR (p.pronamespace='public'::regnamespace AND p.proname IN('contact_my_listing_seller_v1','send_my_listing_message_v1','get_my_listing_conversation_v1','list_my_listing_conversations_v1','get_my_listing_conversation_v2')) ORDER BY 1`)).rows;
let cid,lid,photo,ready,sent;
try {
 const before=await oldCatalog();const aclBefore=(await db.query("SELECT nspacl::text acl FROM pg_namespace WHERE nspname='public'")).rows[0].acl;
 await check('exact_changes_apply_under_hosted_nonsuperuser_with_default_API_execute_grants',async()=>{
  const role=(await db.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];assert.equal(role.rolsuper,false);assert.equal(role.rolbypassrls,true);
  await db.exec('BEGIN');try{await db.exec(read('changes.sql'));await db.exec('COMMIT');}catch(e){await db.exec('ROLLBACK');throw e;}
  assert.equal((await db.query("SELECT nspacl::text acl FROM pg_namespace WHERE nspname='public'")).rows[0].acl,aclBefore);
  const after=await oldCatalog();assert.deepEqual(after.filter(x=>!x.signature.startsWith('listing_contact_private.guard_message(')),before.filter(x=>!x.signature.startsWith('listing_contact_private.guard_message(')));
 });
 if(process.env.SELQIRO_DUMP_SQL_CATALOG==='1'){
  fs.writeFileSync(path.join(dir,'function-pins.json'),JSON.stringify((await db.query(catalogQuery)).rows,null,2)+'\n');
  await db.exec('SET search_path=pg_catalog,public,pg_temp');
  fs.writeFileSync(path.join(dir,'structure-pins.json'),JSON.stringify((await db.query(read('tests/catalog-structure.sql'))).rows[0].structure,null,2)+'\n');
 }
 cid=(await asActor(a.buyer,'SELECT public.contact_my_listing_seller_v1($1,$2,$3,$4) value',[a.buyer,a.buyerIdentity,key(1),'197'])).rows[0].value.conversation_id;
 lid=await legacy();
 await db.query(`INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message,image_path,listing_id,listing_title,listing_price)
 VALUES($1,$2,$3,$4,$5,200,'Historical snapshot','4 000 EUR')`,[lid,a.seller,a.sellerIdentity,'old legacy text',`${lid}/legacy-uuid.webp`]);
 await check('unified_history_lists_managed_and_exact_legacy_without_channel_backfill',async()=>{
  const view=await inbox(a.buyer,a.buyerIdentity);assert.equal(view.schema_version,2);assert.equal(view.actor.identity_id,a.buyerIdentity);
  assert(view.conversations.some(t=>t.conversation_id===cid));assert(view.conversations.some(t=>t.conversation_id===lid));
  assert.equal((await db.query('SELECT count(*)::int n FROM listing_contact_private.channels WHERE conversation_id=$1',[lid])).rows[0].n,0);
  const v=await readOne(a.buyer,a.buyerIdentity,lid);assert.equal(v.peer.identity_id,a.sellerIdentity);assert.equal(v.messages[0].listing.price,'4 000 EUR');assert.equal(v.messages[0].image.kind,'legacy');
 });
 await check('third_party_cannot_read_history_or_photo_binding',()=>readOne(a.third,a.thirdIdentity,lid),'42501');
 await check('expected_user_cannot_substitute_authenticated_user',()=>readOne(a.third,a.buyerIdentity,lid),'42501');
 await check('same_account_other_active_identity_cannot_cross_thread',async()=>{
  await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[a.otherBuyerIdentity,a.buyer]);
  try{await assert.rejects(()=>readOne(a.buyer,a.otherBuyerIdentity,lid),e=>e.code==='42501');assert.equal((await inbox(a.buyer,a.otherBuyerIdentity)).conversations.length,0);}
  finally{await db.query('UPDATE public.profiles SET active_identity_id=$1 WHERE id=$2',[a.buyerIdentity,a.buyer]);}
 });
 await check('null_identity_and_group_like_legacy_threads_fail_closed_without_affecting_valid_history',async()=>{
  const ambiguous=await legacy();await db.query('UPDATE public.conversation_participants SET identity_id=NULL WHERE conversation_id=$1 AND user_id=$2',[ambiguous,a.buyer]);
  const group=await legacy();await db.query('INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id) VALUES($1,$2,$3)',[group,a.third,a.thirdIdentity]);
  const ids=(await inbox(a.buyer,a.buyerIdentity)).conversations.map(t=>t.conversation_id);assert(!ids.includes(ambiguous));assert(!ids.includes(group));assert(ids.includes(lid));
 });
 await check('controlled_send_to_legitimate_legacy_and_exact_snapshot_replay',async()=>{
  const r=await send(a.buyer,a.buyerIdentity,lid,key(2),'new controlled old thread','197');assert.equal(r.action,'send');assert.equal(r.replayed,false);
  const replay=await send(a.buyer,a.buyerIdentity,lid,key(2),'new controlled old thread','197');assert.equal(replay.message_id,r.message_id);assert.equal(replay.replayed,true);
  await assert.rejects(()=>send(a.buyer,a.buyerIdentity,lid,key(2),'changed','197'),e=>e.code==='22023');
  const msg=(await readOne(a.seller,a.sellerIdentity,lid)).messages.find(m=>m.id===r.message_id);assert.equal(msg.listing.price,'4376 EUR');assert.equal(msg.text_truncated,false);
 });
 await check('managed_text_send_and_existing_v1_card_reader_remain_working',async()=>{
  const r=await send(a.buyer,a.buyerIdentity,cid,key(3),'managed text','197');
  const v=(await asActor(a.buyer,'SELECT public.get_my_listing_conversation_v2($1,$2,$3,NULL,$4) value',[a.buyer,a.buyerIdentity,cid,'197'])).rows[0].value;
  assert.equal(v.messages.find(m=>m.id===r.message_id).listing.id,'197');assert.equal(v.attachment_listing.id,'197');
 });
 await check('read_watermark_does_not_acknowledge_a_newer_message_arriving_after_display',async()=>{
  const displayed=await send(a.seller,a.sellerIdentity,cid,key(4),'displayed');
  const unseen=await send(a.seller,a.sellerIdentity,cid,key(5),'arrived after displayed');
  const r=await mark(a.buyer,a.buyerIdentity,cid,displayed.message_id);assert.equal(r.through_message_id,displayed.message_id);
  assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations.find(t=>t.conversation_id===cid).unread,true);
  await mark(a.buyer,a.buyerIdentity,cid,unseen.message_id);assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations.find(t=>t.conversation_id===cid).unread,false);
  assert.equal((await mark(a.buyer,a.buyerIdentity,cid,displayed.message_id)).through_message_id,unseen.message_id);
  const saved=(await db.query('SELECT last_read_at FROM public.conversation_participants WHERE conversation_id=$1 AND user_id=$2',[cid,a.buyer])).rows[0].last_read_at;
  const actual=(await db.query('SELECT created_at FROM public.messages WHERE id=$1',[unseen.message_id])).rows[0].created_at;assert.deepEqual(saved,actual);
 });
 await check('first_visible_ID_watermark_does_not_import_ahead_of_visibility_legacy_timestamp',async()=>{
  const thread=await legacy();const displayed=await send(a.seller,a.sellerIdentity,thread,key(41),'first displayed');
  const unseen=await send(a.seller,a.sellerIdentity,thread,key(42),'unseen concurrent arrival');
  await db.query("UPDATE public.conversation_participants SET last_read_at=clock_timestamp()+interval '5 minutes' WHERE conversation_id=$1 AND user_id=$2",[thread,a.buyer]);
  const r=await mark(a.buyer,a.buyerIdentity,thread,displayed.message_id);assert.equal(r.through_message_id,displayed.message_id);
  assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations.find(t=>t.conversation_id===thread).unread,true);
  await mark(a.buyer,a.buyerIdentity,thread,unseen.message_id);assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations.find(t=>t.conversation_id===thread).unread,false);
 });
 await check('foreign_conversation_watermark_rejected',async()=>{
  const foreign=(await readOne(a.buyer,a.buyerIdentity,lid)).messages[0].id;await mark(a.buyer,a.buyerIdentity,cid,foreign);
 },'22023');
 await check('hide_changes_only_own_inbox_then_new_message_restores',async()=>{
  const before=(await readOne(a.buyer,a.buyerIdentity,cid)).messages.length;
  assert.equal((await hide(a.buyer,a.buyerIdentity,cid)).action,'hide');
  assert(!(await inbox(a.buyer,a.buyerIdentity)).conversations.some(t=>t.conversation_id===cid));assert((await inbox(a.seller,a.sellerIdentity)).conversations.some(t=>t.conversation_id===cid));
  assert.equal((await readOne(a.buyer,a.buyerIdentity,cid)).messages.length,before);
  await send(a.seller,a.sellerIdentity,cid,key(6),'new after hide');assert((await inbox(a.buyer,a.buyerIdentity)).conversations.some(t=>t.conversation_id===cid));
 });
 await check('account_block_both_directions_preserves_history_and_replay_then_unblock',async()=>{
  assert.equal((await block(a.buyer,a.buyerIdentity,cid,true)).blocked_by_me,true);assert.equal((await readOne(a.buyer,a.buyerIdentity,cid)).can_send,false);
  const peer=await readOne(a.seller,a.sellerIdentity,cid);assert.equal(peer.can_send,false);assert.equal(peer.blocked_by_me,false);assert(!('blocked_by_peer' in peer));
  await assert.rejects(()=>send(a.seller,a.sellerIdentity,lid,key(7),'blocked account other conversation'),e=>e.code==='42501');
  assert.equal((await send(a.buyer,a.buyerIdentity,cid,key(3),'managed text','197')).replayed,true);
  const r=await block(a.buyer,a.buyerIdentity,cid,false);assert.equal(r.action,'unblock');assert.equal(r.can_send,true);
 });
 await check('account_block_also_rejects_direct_legacy_INSERT',async()=>{
  await block(a.buyer,a.buyerIdentity,lid,true);
  try{await assert.rejects(()=>asActor(a.seller,'INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES($1,$2,$3,$4)',[lid,a.seller,a.sellerIdentity,'direct legacy bypass']),e=>e.code==='42501');}
  finally{await block(a.buyer,a.buyerIdentity,lid,false);}
  await asActor(a.seller,'INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES($1,$2,$3,$4)',[lid,a.seller,a.sellerIdentity,'direct legacy allowed after unblock']);
 });
 await check('legacy_direct_insert_rejects_wrong_selected_identity_and_outsider_membership',async()=>{
  await assert.rejects(()=>asActor(a.buyer,'INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES($1,$2,$3,$4)',[lid,a.buyer,a.otherBuyerIdentity,'wrong selected identity']),e=>e.code==='42501');
  await assert.rejects(()=>asActor(a.third,'INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) VALUES($1,$2,$3,$4)',[lid,a.third,a.thirdIdentity,'outsider bypass']),e=>e.code==='42501');
 });
 await check('legacy_preallocated_lower_id_cannot_arrive_below_read_watermark',async()=>{
  const delayed=(await db.query("SELECT nextval('public.messages_id_seq')::text id")).rows[0].id;
  const displayed=await send(a.seller,a.sellerIdentity,lid,key(8),'arrived first');await mark(a.buyer,a.buyerIdentity,lid,displayed.message_id);
  const late=(await db.query('INSERT INTO public.messages(id,conversation_id,sender_id,sender_identity_id,message) OVERRIDING SYSTEM VALUE VALUES($1,$2,$3,$4,$5) RETURNING id::text',[delayed,lid,a.seller,a.sellerIdentity,'late legacy arrival'])).rows[0].id;
  assert(BigInt(late)>BigInt(displayed.message_id));assert.notEqual(late,delayed);
  assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations.find(t=>t.conversation_id===lid).unread,true);
 });
 await check('legacy_null_message_photo_keeps_string_and_boolean_wire_contract',async()=>{
  await db.exec('ALTER TABLE public.messages ALTER COLUMN message DROP NOT NULL');
  const old=await legacy();await db.query('INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message,image_path) VALUES($1,$2,$3,NULL,$4)',[old,a.seller,a.sellerIdentity,`${old}/old-photo.webp`]);
  const m=(await readOne(a.buyer,a.buyerIdentity,old)).messages[0];assert.equal(m.text,'');assert.equal(m.text_truncated,false);assert.equal(m.image.kind,'legacy');
 });
 await check('photo_reservation_binds_actor_identity_conversation_request_and_digest',async()=>{
  photo=await reserve(a.buyer,a.buyerIdentity,cid,key(10));photoWire.reserve=photo;assert.equal(photo.state,'reserved');assert.equal(photo.path,`${cid}/${photo.attachment_id}.webp`);
  assert.equal((await reserve(a.buyer,a.buyerIdentity,cid,key(10))).attachment_id,photo.attachment_id);
  await assert.rejects(()=>reserve(a.buyer,a.buyerIdentity,lid,key(10)),e=>e.code==='22023');
  await assert.rejects(()=>reserve(a.buyer,a.buyerIdentity,cid,key(10),'4'.repeat(64)),e=>e.code==='22023');
 });
 await check('authenticated_cannot_call_service_finalize_or_private_ledger',async()=>{
  await assert.rejects(()=>asActor(a.buyer,'SELECT public.claim_message_photo_upload_v2($1,$2,$3,$4,$5,$6,8000,640,480)',[photo.attachment_id,a.buyer,a.buyerIdentity,photo.source_sha256,key(11),'2'.repeat(64)]),e=>e.code==='42501');
  await assert.rejects(()=>asActor(a.buyer,'SELECT * FROM messaging_private_v2.photos'),e=>e.code==='42501');
 });
 await check('frozen_output_replay_preserves_original_claim_key_and_rejects_changed_bytes',async()=>{
  const claimed=await claim(photo,key(11));photoWire.claim=claimed;assert.equal(claimed.state,'uploading');assert.equal((await claim(photo,key(12))).upload_key,key(11));
  await assert.rejects(()=>claim(photo,key(13),'3'.repeat(64)),e=>e.code==='22023');ready=await finish(claimed);photoWire.finish=ready;assert.equal(ready.state,'ready');
 });
 await check('unready_foreign_or_cross_thread_photo_never_attaches',async()=>{
  await assert.rejects(()=>send(a.seller,a.sellerIdentity,cid,key(14),'',null,ready.attachment_id),e=>e.code==='42501');
  await assert.rejects(()=>send(a.buyer,a.buyerIdentity,lid,key(15),'',null,ready.attachment_id),e=>e.code==='42501');
  const unready=await reserve(a.buyer,a.buyerIdentity,cid,key(16));await assert.rejects(()=>send(a.buyer,a.buyerIdentity,cid,key(17),'',null,unready.attachment_id),e=>e.code==='42501');await cancel(a.buyer,a.buyerIdentity,cid,unready.attachment_id);
 });
 await check('photo_only_send_attaches_once_atomic_and_same_key_replays',async()=>{
  sent=await send(a.buyer,a.buyerIdentity,cid,key(18),'',null,ready.attachment_id);assert.equal(sent.replayed,false);
  const replay=await send(a.buyer,a.buyerIdentity,cid,key(18),'',null,ready.attachment_id);assert.equal(replay.message_id,sent.message_id);assert.equal(replay.replayed,true);
  await assert.rejects(()=>send(a.buyer,a.buyerIdentity,cid,key(19),'',null,ready.attachment_id),e=>e.code==='42501');
  const m=(await readOne(a.seller,a.sellerIdentity,cid)).messages.find(m=>m.id===sent.message_id);assert.deepEqual(m.image,{kind:'v2',attachment_id:ready.attachment_id,width:640,height:480});
  assert(!JSON.stringify(m).includes('message-attachments-v2'));photoWire.binding=await binding(a.seller,a.sellerIdentity,cid,sent.message_id);assert.equal(photoWire.binding.web_sha256,ready.web_sha256);
 });
 await check('photo_read_context_and_attached_cancel_are_guarded',async()=>{
  await assert.rejects(()=>binding(a.third,a.thirdIdentity,cid,sent.message_id),e=>e.code==='42501');
  await assert.rejects(()=>binding(a.seller,a.sellerIdentity,lid,sent.message_id),e=>e.code==='42501');
  await assert.rejects(()=>cancel(a.buyer,a.buyerIdentity,cid,ready.attachment_id),e=>e.code==='42501');
 });
 await check('managed_guard_rejects_unbound_photo_even_for_contact_writer',async()=>{
  await db.exec('SET ROLE selqiro_listing_contact_writer_v1');try{
   await assert.rejects(()=>db.query('INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message,image_path) VALUES($1,$2,$3,$4,$5)',[cid,a.buyer,a.buyerIdentity,'','forged.webp']),e=>e.code==='42501');
  }finally{await db.exec('RESET ROLE');}
 });
 await check('legacy_private_photo_binding_is_immutable',async()=>{
  const ph=await finish(await claim(await reserve(a.buyer,a.buyerIdentity,lid,key(20)),key(21)));
  const r=await send(a.buyer,a.buyerIdentity,lid,key(22),'legacy photo',null,ph.attachment_id);
  await assert.rejects(()=>db.query('UPDATE public.messages SET image_path=$1 WHERE id=$2',[`${lid}/other.webp`,r.message_id]),e=>e.code==='42501');
  await assert.rejects(()=>db.query('DELETE FROM public.messages WHERE id=$1',[r.message_id]),e=>e.code==='42501');
 });
 await check('failed_message_INSERT_rolls_back_photo_binding_and_send_receipt_atomically',async()=>{
  const ph=await finish(await claim(await reserve(a.buyer,a.buyerIdentity,cid,key(27)),key(28)));
  await db.exec("ALTER TABLE public.messages ADD CONSTRAINT fixture_reject_message CHECK(message<>'atomic rejection')");
  try{await assert.rejects(()=>send(a.buyer,a.buyerIdentity,cid,key(29),'atomic rejection',null,ph.attachment_id),e=>e.code==='23514');}
  finally{await db.exec('ALTER TABLE public.messages DROP CONSTRAINT fixture_reject_message');}
  const stored=(await db.query('SELECT state,message_id FROM messaging_private_v2.photos WHERE attachment_id=$1',[ph.attachment_id])).rows[0];assert.equal(stored.state,'ready');assert.equal(stored.message_id,null);
  assert.equal((await db.query('SELECT count(*)::int n FROM messaging_private_v2.send_receipts WHERE actor_user_id=$1 AND request_key=$2',[a.buyer,key(29)])).rows[0].n,0);
  assert.equal((await send(a.buyer,a.buyerIdentity,cid,key(29),'atomic rejection',null,ph.attachment_id)).replayed,false);
 });
 await check('canceled_late_finish_never_resurrects_and_cleanup_tombstone_is_revisited',async()=>{
  const ph=await claim(await reserve(a.buyer,a.buyerIdentity,cid,key(23)),key(24));await cancel(a.buyer,a.buyerIdentity,cid,ph.attachment_id);
  assert.equal((await finish(ph)).state,'tombstoned');
  const cleanup=(await asService('SELECT public.claim_message_photo_cleanup_v2($1,3) value',[key(25)])).rows[0].value;
  assert(!cleanup.claims.some(x=>x.attachment_id===ready.attachment_id));assert(cleanup.claims.some(x=>x.attachment_id===ph.attachment_id));
  for(const c of cleanup.claims) await asService('SELECT public.finish_message_photo_cleanup_v2($1,$2,true,NULL)',[c.attachment_id,c.cleanup_key]);
  await db.query("UPDATE messaging_private_v2.photos SET next_cleanup_at=clock_timestamp()-interval '1 second' WHERE attachment_id=$1",[ph.attachment_id]);
  const again=(await asService('SELECT public.claim_message_photo_cleanup_v2($1,3) value',[key(26)])).rows[0].value;assert(again.claims.some(x=>x.attachment_id===ph.attachment_id));
  assert.equal((await db.query('SELECT state,last_cleanup_removed FROM messaging_private_v2.photos WHERE attachment_id=$1',[ph.attachment_id])).rows[0].state,'tombstoned');
 });
 await check('restrictive_storage_policy_denies_new_bucket_despite_broad_legacy_policy',async()=>{
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('message-attachments-v2','private.webp'),('messages','old.webp')");
  const objects=(await asActor(a.buyer,'SELECT bucket_id FROM storage.objects')).rows;assert.equal(objects.length,1);assert.equal(objects[0].bucket_id,'messages');
  await assert.rejects(()=>asActor(a.buyer,"INSERT INTO storage.objects(bucket_id,name) VALUES('message-attachments-v2','forged.webp')"),e=>e.code==='42501');
  assert.equal((await asService('SELECT count(*)::int n FROM storage.objects')).rows[0].n,2);
 });
 await check('legacy_reader_pages_newest_first_at_most50_and_never_reuses_header_snapshot',async()=>{
  const paged=await legacy();await db.query("INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) SELECT $1,$2,$3,'history '||g FROM generate_series(1,65) g",[paged,a.buyer,a.buyerIdentity]);
  const first=await readOne(a.buyer,a.buyerIdentity,paged);assert.equal(first.messages.length,50);assert(first.next_before_message_id);assert.equal(first.messages[0].text,'history 16');assert.equal(first.messages[49].text,'history 65');assert.equal(first.messages[0].listing,null);
  const second=await readOne(a.buyer,a.buyerIdentity,paged,first.next_before_message_id);assert.equal(second.messages.length,15);assert.equal(second.messages[0].text,'history 1');assert.equal(second.next_before_message_id,null);
 });
 await check('oversized_old_history_is_explicitly_truncated_and_byte_budget_paginates',async()=>{
  const paged=await legacy();await db.query("INSERT INTO public.messages(conversation_id,sender_id,sender_identity_id,message) SELECT $1,$2,$3,repeat('😀',25000) FROM generate_series(1,50)",[paged,a.buyer,a.buyerIdentity]);
  const v=await readOne(a.buyer,a.buyerIdentity,paged);assert(v.messages.length>0&&v.messages.length<50);assert(v.next_before_message_id);assert(v.messages.every(m=>m.text_truncated));assert(v.messages.every(m=>[...m.text].length===20000));assert(Buffer.byteLength(JSON.stringify(v))<1600000);
 });
 await check('activity_cursor_uses_timestamp_and_id_ties_without_duplicates',async()=>{
  const ids=[];for(let i=0;i<55;i++)ids.push(await legacy());
  await db.query("UPDATE public.conversations SET updated_at='2026-01-01T00:00:00Z' WHERE id=ANY($1::bigint[])",[ids]);
  const first=await inbox(a.buyer,a.buyerIdentity);assert.equal(first.conversations.length,50);assert(first.next_cursor);const second=await inbox(a.buyer,a.buyerIdentity,first.next_cursor);
  assert.equal(new Set([...first.conversations,...second.conversations].map(x=>x.conversation_id)).size,first.conversations.length+second.conversations.length);
  const newest=await send(a.seller,a.sellerIdentity,ids[0],key(40),'new activity');assert(newest.message_id);assert.equal((await inbox(a.buyer,a.buyerIdentity)).conversations[0].conversation_id,ids[0]);
 });
 await check('quota_counts_canceled_requests_and_same_key_replay_does_not_consume_more',async()=>{
  for(let n=60;n<80;n++){
   try{const p=await reserve(a.buyer,a.buyerIdentity,cid,key(n));await cancel(a.buyer,a.buyerIdentity,cid,p.attachment_id);}catch(e){assert.equal(e.code,'54000');break;}
  }
  assert.equal((await db.query("SELECT count(*)::int n FROM messaging_private_v2.photos WHERE actor_user_id=$1 AND created_at>clock_timestamp()-interval '1 hour'",[a.buyer])).rows[0].n,10);
  await assert.rejects(()=>reserve(a.buyer,a.buyerIdentity,cid,key(90)),e=>e.code==='54000');assert.equal((await reserve(a.buyer,a.buyerIdentity,cid,key(10))).attachment_id,photo.attachment_id);
 });
 const actor={expectedUserId:a.buyer,expectedIdentityId:a.buyerIdentity};
 const sendCommand={...actor,conversationId:cid,requestKey:key(200),message:'SQL to web parser contract',listingId:'197',attachmentId:null};
 const sentWire=await send(a.buyer,a.buyerIdentity,cid,key(200),sendCommand.message,'197');
 const threadCommand={...actor,conversationId:cid,beforeMessageId:null,attachmentListingId:'197'};
 const legacyCommand={...actor,conversationId:lid,beforeMessageId:null,attachmentListingId:null};
 const listCommand={...actor,cursor:null};const listWire=await inbox(a.buyer,a.buyerIdentity);
 const markCommand={...actor,conversationId:cid,throughMessageId:sentWire.message_id};
 const cases=[
  {parser:'parseSendMessageReceipt',command:sendCommand,value:sentWire},
  {parser:'parseSendMessageReceipt',command:sendCommand,value:await send(a.buyer,a.buyerIdentity,cid,key(200),sendCommand.message,'197')},
  {parser:'parseMessageThread',command:threadCommand,value:await readOne(a.buyer,a.buyerIdentity,cid,null,'197')},
  {parser:'parseMessageThread',command:legacyCommand,value:await readOne(a.buyer,a.buyerIdentity,lid)},
  {parser:'parseMessageThreadList',command:listCommand,value:listWire},
  {parser:'parseMessageThreadList',command:{...actor,cursor:listWire.next_cursor},value:await inbox(a.buyer,a.buyerIdentity,listWire.next_cursor)},
  {parser:'parseMarkThreadReadReceipt',command:markCommand,value:await mark(a.buyer,a.buyerIdentity,cid,sentWire.message_id)},
  {parser:'parseHideThreadReceipt',command:{...actor,conversationId:cid},value:await hide(a.buyer,a.buyerIdentity,cid)},
  {parser:'parseSetThreadBlockedReceipt',command:{...actor,conversationId:cid,blocked:true},value:await block(a.buyer,a.buyerIdentity,cid,true)},
  {parser:'parseSetThreadBlockedReceipt',command:{...actor,conversationId:cid,blocked:false},value:await block(a.buyer,a.buyerIdentity,cid,false)},
 ];
 fs.writeFileSync(path.join(dir,'tests/messaging-wire.json'),JSON.stringify({source:'actual isolated PostgreSQL RPC results; synthetic identities only',cases},null,2)+'\n');
 fs.writeFileSync(path.join(dir,'tests/photo-wire.json'),JSON.stringify(photoWire,null,2)+'\n');
 results.scope='Local PGlite PostgreSQL runtime with synthetic actors, existing source helpers/triggers/RLS and hosted non-superuser permissions; no live database, Storage HTTP or simultaneous independent database sessions.';
 results.passed=checks.every(c=>c.passed);fs.writeFileSync(path.join(dir,'tests/runtime-result.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({passed:results.passed,checks:checks.length,version:results.version}));
} catch(error){console.error(error);results.passed=false;fs.writeFileSync(path.join(dir,'tests/runtime-result.json'),JSON.stringify(results,null,2)+'\n');process.exitCode=1;}
finally{await db.close();}
