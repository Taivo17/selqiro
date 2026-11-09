import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as horse from '../../20261108_horse_publication/tests/fixture.mjs';
const {db,repair,actors:a,asActor,asRole,call,publicCall,scalar,denied,setIdentity}=f;
const name=process.argv[2],checks=[];
const record=(label,fn)=>{fn();checks.push(label);};
const reject=async(label,fn,code)=>{await denied(fn,code);checks.push(label);};
const sid=n=>'61000000-0000-4000-8000-'+String(n).padStart(12,'0');
const slug='synthetic-'+a.ownerIdentity;
const serviceProfile=(limit=80)=>publicCall('get_public_profile_services_v1',[slug,limit]);
const profile=(category=null,limit=24,offset=0)=>publicCall('get_public_profile_marketplace_v1',[slug,category,limit,offset]);
const owner=(limit=50,offset=0)=>call(a.owner,'get_my_service_publications_v1',[a.owner,a.ownerIdentity,limit,offset]);
try{
 await db.exec(fs.readFileSync(path.join(repair,'apply.sql'),'utf8'));
 if(name==='service_creation_order'){
  // Eighty-seven retained published services exceed both the owner's 50-row
  // page and the public profile's 80-row maximum. Old manual order is opposite.
  await db.query(`INSERT INTO public.services(id,identity_id,title,description,category,status,sort_order,created_at,published_at)
   SELECT ('61000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'Service '||n,repeat('description ',40),
   'transport_roadside','published',n,'2024-01-01Z'::timestamptz+least(n,86)*interval '1 hour',
   '2025-01-01Z'::timestamptz-n*interval '1 hour' FROM generate_series(1,87)n`,[a.ownerIdentity]);
  await db.query(`INSERT INTO public.services(id,identity_id,title,category,status,sort_order,created_at,published_at)
   VALUES($1,$2,'Paused newest','transport_roadside','archived',999,'2025-01-01Z',now()),
   ($3,$4,'Different identity','transport_roadside','published',0,'2026-01-01Z',now())`,[sid(88),a.ownerIdentity,sid(89),a.peerIdentity]);
  const publicExpected=[sid(86),sid(87),...Array.from({length:85},(_,i)=>sid(85-i))];
  const ownerExpected=[sid(88),...publicExpected];
  const first=await owner(),second=await owner(50,50);
  record('owner_first_page_newest_before_limit',()=>assert.deepEqual(first.items.map(x=>x.service_id),ownerExpected.slice(0,50)));
  record('owner_second_page_complete_without_duplicates',()=>assert.deepEqual(second.items.map(x=>x.service_id),ownerExpected.slice(50)));
  record('owner_totals_offsets',()=>{assert.equal(first.total_count,'88');assert.equal(first.next_offset,50);assert.equal(first.has_more,true);assert.equal(second.has_more,false);});
  record('owner_foreign_identity_excluded',()=>assert(![...first.items,...second.items].some(x=>x.service_id===sid(89))));
  const publicFirst=await serviceProfile();
  record('profile_over_eighty_newest_before_limit',()=>assert.deepEqual(publicFirst.items.map(x=>x.id),publicExpected.slice(0,80)));
  record('profile_creation_tie_id_ascending',()=>assert.deepEqual(publicFirst.items.slice(0,2).map(x=>x.id),[sid(86),sid(87)]));
  record('profile_paused_and_foreign_excluded',()=>assert(!publicFirst.items.some(x=>[sid(88),sid(89)].includes(x.id))));
  await db.query("UPDATE public.services SET title='Edited oldest',sort_order=0,updated_at=now(),published_at=now() WHERE id=$1",[sid(1)]);
  const afterEdit=await owner(200);record('owner_complete_creation_order_after_edit',()=>assert.deepEqual(afterEdit.items.map(x=>x.service_id),ownerExpected));
  const publicAfterEdit=await serviceProfile();record('profile_unchanged_after_edit',()=>assert.deepEqual(publicAfterEdit.items.map(x=>x.id),publicExpected.slice(0,80)));
  const snapshot=await call(a.owner,'get_my_service_publication_snapshot_v1',[a.owner,a.ownerIdentity,sid(86)]);
  await call(a.owner,'set_my_service_activity_v1',[a.owner,a.ownerIdentity,sid(86),snapshot.edit_revision,'published','archived']);
  const afterPause=await serviceProfile();record('pause_removes_service_before_public_limit',()=>assert.deepEqual(afterPause.items.map(x=>x.id),publicExpected.filter(x=>x!==sid(86)).slice(0,80)));
  const paused=await call(a.owner,'get_my_service_publication_snapshot_v1',[a.owner,a.ownerIdentity,sid(86)]);
  await call(a.owner,'set_my_service_activity_v1',[a.owner,a.ownerIdentity,sid(86),paused.edit_revision,'archived','published']);
  const afterActive=await serviceProfile();record('reactivation_restores_original_creation_order',()=>assert.deepEqual(afterActive.items.map(x=>x.id),publicExpected.slice(0,80)));
  await reject('owner_other_actor_denied',()=>call(a.peer,'get_my_service_publications_v1',[a.owner,a.ownerIdentity,50,0]),'42501');
  await reject('owner_anon_denied',()=>publicCall('get_my_service_publications_v1',[a.owner,a.ownerIdentity,50,0]),'42501');
  await reject('owner_invalid_offset_rejected',()=>owner(50,-1),'22023');
  await reject('profile_service_limit_over_eighty_rejected',()=>serviceProfile(81),'22023');
  await setIdentity(a.owner,a.otherIdentity);
  await reject('owner_changed_active_identity_denied',()=>owner(),'42501');
  await setIdentity(a.owner,a.ownerIdentity);
  await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[a.peer,a.owner]);
  const blocked=await call(a.peer,'get_public_profile_services_v1',[slug,80]);record('profile_service_viewer_block_enforced',()=>assert.deepEqual(blocked.items,[]));
  await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[a.peer,a.owner]);
  await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[a.owner,a.peer]);
  const reverse=await call(a.peer,'get_public_profile_services_v1',[slug,80]);record('profile_service_seller_block_enforced',()=>assert.deepEqual(reverse.items,[]));
  await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[a.owner,a.peer]);
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  const inactive=await serviceProfile();record('inactive_profile_hidden',()=>{assert.equal(inactive.profile_available,false);assert.deepEqual(inactive.items,[]);});
 }else if(name==='unified_profile_pages'){
  await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,description,status,created_at,active_until,
   category,subcategory,condition,country,city)
   SELECT 70000+n,$1,$2,$1,'Listing '||n,repeat('public description ',30),'active',
    '2024-01-01Z'::timestamptz+n*interval '1 hour',now()+interval '30 days','electronics','computers','used','Estonia','Paide'
   FROM generate_series(1,85)n`,[a.owner,a.ownerIdentity]);
  const horses=[];
  for(const [i,type] of ['sale','wanted','free_transfer'].entries()){
   const p=await horse.prepare(horse.content(type));await horse.publish(p);
   await db.query("UPDATE public.horse_offers SET created_at='2024-01-01Z'::timestamptz+$2::int*interval '1 hour' WHERE id=$1",[p.horse_offer_id,84-i*40]);
   horses.push({id:p.horse_offer_id,type,hour:84-i*40});
  }
  const rows=[...Array.from({length:85},(_,i)=>({content_type:'listing',content_id:String(70001+i),hour:i+1})),
   ...horses.map(x=>({content_type:'horse_offer',content_id:x.id,hour:x.hour}))].sort((x,y)=>y.hour-x.hour||x.content_type.localeCompare(y.content_type)||
    (x.content_type==='listing'?Number(y.content_id)-Number(x.content_id):y.content_id.localeCompare(x.content_id)));
  const pages=[];for(const offset of [0,24,48,72])pages.push(await profile(null,24,offset));
  const items=pages.flatMap(x=>x.items);
  record('shared_profile_eighty_eight_items_without_capping',()=>assert.equal(items.length,88));
  record('shared_profile_orders_before_pagination',()=>assert.deepEqual(items.map(x=>[x.content_type,x.content_id]),rows.map(x=>[x.content_type,x.content_id])));
  record('shared_profile_one_total_not_two_domain_counts',()=>assert(pages.every(x=>x.total_count==='88')));
  record('shared_profile_pagination_metadata',()=>{assert.deepEqual(pages.map(x=>x.next_offset),[24,48,72,null]);assert.equal(pages[3].has_more,false);});
  record('shared_profile_no_duplicate_canonical_ids',()=>assert.equal(new Set(items.map(x=>x.content_type+':'+x.content_id)).size,88));
  record('shared_profile_exact_envelope',()=>assert.deepEqual(Object.keys(pages[0]).sort(),['schema_version','content_scope','seller_slug','profile_available','store_category_id','sort','items','total_count','result_limit','result_offset','has_more','next_offset','window_limit_reached'].sort()));
  const cardKeys=['content_type','content_id','offer_type','title','description_preview','price','category','subcategory','detail_category','condition','country','city','image_url','seller_name','seller_slug','seller_avatar_url','seller_type','created_at'].sort();
  record('shared_profile_exact_public_card_allowlist',()=>assert(items.every(x=>JSON.stringify(Object.keys(x).sort())===JSON.stringify(cardKeys))));
  record('shared_profile_preview_bounded',()=>assert(items.every(x=>x.description_preview.length<=280)));
  record('shared_profile_only_requested_seller',()=>assert(items.every(x=>x.seller_slug===slug)));
  record('shared_profile_horse_uuid_not_listing_shadow',()=>{assert.equal(items.filter(x=>x.content_type==='horse_offer').length,3);assert.equal(items.filter(x=>x.content_type==='listing').length,85);});
  await db.query("UPDATE public.listings SET title='Older listing edited' WHERE id=70001");
  const afterEdit=await profile(null,60);record('ordinary_edit_does_not_reorder_profile',()=>assert.deepEqual(afterEdit.items.map(x=>x.content_id),items.slice(0,60).map(x=>x.content_id)));
  const h=horses[0],s=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,h.id]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,h.id,s.edit_revision,s.source_status,s.active_until,'paused']);
  const hidden=await profile(null,60);record('paused_horse_filtered_before_total',()=>{assert.equal(hidden.total_count,'87');assert(!hidden.items.some(x=>x.content_id===h.id));});
  const ps=await call(a.owner,'get_my_horse_offer_lifecycle_v1',[a.owner,a.ownerIdentity,h.id]);
  await call(a.owner,'set_my_horse_offer_status_v1',[a.owner,a.ownerIdentity,h.id,ps.edit_revision,ps.source_status,ps.active_until,'active']);
  const active=await profile(null,60);record('horse_reactivation_restores_original_position',()=>assert.deepEqual(active.items.map(x=>x.content_id),items.slice(0,60).map(x=>x.content_id)));
  await db.query(`INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,created_at,active_until)
   VALUES(79001,$1,$2,$1,'Null deadline','active',now(),NULL),(79002,$1,$2,$1,'Expired','active',now(),now()-interval '1 day'),
   (79003,$1,$2,$1,'Paused','paused',now(),now()+interval '30 days'),(79004,$3,$4,$3,'Other seller','active',now(),now()+interval '30 days')`,[a.owner,a.ownerIdentity,a.peer,a.peerIdentity]);
  const strict=await profile(null,60);record('ordinary_strict_expiry_and_seller_scope_preserved',()=>{assert.equal(strict.total_count,'88');assert(!strict.items.some(x=>Number(x.content_id)>=79000));});
  const parent=sid(201),child=sid(202),foreign=sid(203),foreignChild=sid(204);
  await db.query(`INSERT INTO public.store_categories(id,user_id,identity_id,name,parent_id) VALUES($1,$2,$3,'Parent',NULL),
   ($4,$2,$3,'Child',$1),($5,$6,$7,'Foreign',NULL),($8,$6,$7,'Foreign child',$5)`,[parent,a.owner,a.ownerIdentity,child,foreign,a.peer,a.peerIdentity,foreignChild]);
  await db.query('INSERT INTO public.listing_store_categories(listing_id,store_category_id) VALUES(70001,$1),(70085,$2),(70002,$3)',[parent,child,foreign]);
  const branch=await profile(parent,24);record('seller_category_descendants_and_count',()=>{assert.equal(branch.total_count,'2');assert.deepEqual(branch.items.map(x=>x.content_id),['70085','70001']);});
  record('category_filter_never_invents_horse_membership',()=>assert(branch.items.every(x=>x.content_type==='listing')));
  const foreignPage=await profile(foreign,24);record('foreign_category_not_authorized_by_listing_link',()=>{assert.equal(foreignPage.total_count,'0');assert.deepEqual(foreignPage.items,[]);});
  const absent=await publicCall('get_public_profile_marketplace_v1',['does-not-exist',null,24,0]);record('missing_profile_not_available',()=>{assert.equal(absent.profile_available,false);assert.equal(absent.total_count,'0');});
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',[slug,a.otherIdentity]);
  const ambiguous=await profile();record('ambiguous_legacy_slug_fails_closed',()=>{assert.equal(ambiguous.profile_available,false);assert.equal(ambiguous.total_count,'0');});
  await db.query('UPDATE public.identity_profiles SET slug=$1 WHERE identity_id=$2',['synthetic-'+a.otherIdentity,a.otherIdentity]);
  for(const [blocker,blocked,label] of [[a.peer,a.owner,'viewer'],[a.owner,a.peer,'seller']]){
   await db.query('INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES($1,$2)',[blocker,blocked]);
   const b=await call(a.peer,'get_public_profile_marketplace_v1',[slug,null,24,0]);record('shared_profile_'+label+'_block_before_count',()=>{assert.equal(b.total_count,'0');assert.deepEqual(b.items,[]);});
   await db.query('DELETE FROM public.user_blocks WHERE blocker_id=$1 AND blocked_id=$2',[blocker,blocked]);
  }
  await reject('profile_invalid_slug_rejected',()=>publicCall('get_public_profile_marketplace_v1',[' '+slug,null,24,0]),'22023');
  await reject('profile_invalid_limit_rejected',()=>profile(null,61),'22023');
  await reject('profile_invalid_offset_rejected',()=>profile(null,24,100001),'22023');
  await db.query("UPDATE public.identities SET status='inactive' WHERE id=$1",[a.ownerIdentity]);
  const off=await profile();record('inactive_seller_all_domains_hidden',()=>{assert.equal(off.profile_available,false);assert.equal(off.total_count,'0');});
 }else throw Error('unknown runtime case');
 console.log(JSON.stringify({case:name,result:'PASS',checks,check_count:checks.length,live_database:false,provider_io:false,native_concurrency:false}));
}catch(error){console.error(JSON.stringify({case:name,result:'FAIL',checks,error_code:error.code??null,message:error.message,stack:error.stack?.split('\n').slice(0,4)}));process.exitCode=1;}
finally{await db.close();}
