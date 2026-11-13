// Focused planner evidence, not a load or production throughput benchmark.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as f from './fixture.mjs';
import * as service from '../../20261108_service_publication/tests/fixture.mjs';
const {db,repair,actors:a,asActor,install,sha,provenance,modules}=f;
const records=[],checks=[];
const read=name=>fs.readFileSync(path.join(repair,name),'utf8');
const nodes=plan=>[plan,...(plan.Plans||[]).flatMap(nodes)];
async function explain(label,sql,actor=false){
 const statement='EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON,TIMING FALSE) '+sql;
 const reply=actor?await asActor(a.peer,statement):await db.query(statement);
 const plan=reply.rows[0]['QUERY PLAN'][0];records.push({label,sql,plan});return nodes(plan.Plan);
}
function body(module,name,values){
 const source=service.retainedFunction(read(module),name),delimiter=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(source);assert(delimiter);
 const text=source.slice(delimiter.index+delimiter[0].length),from=text.toLowerCase().indexOf('with viewer_hidden');assert(from>=0);
 let sql=text.slice(from,text.indexOf(';',from)).replace(/\bINTO\s+(?:v_result|result|total\s*,\s*items)\b/i,'');
 for(const [key,value] of Object.entries(values))sql=sql.replace(new RegExp('\\b'+key+'\\b','g'),()=>value);
 return sql;
}
try{
 await install();
 await db.exec(`
 INSERT INTO auth.users(id) SELECT ('95000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid FROM generate_series(1,512) n;
 INSERT INTO public.profiles(id) SELECT ('95000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid FROM generate_series(1,512) n;
 INSERT INTO public.identities(id,user_id,type,display_name)
 SELECT ('96000000-0000-4000-8000-'||lpad(to_hex(n),12,'0'))::uuid,'${a.owner}','private','Synthetic plan provider '||n FROM generate_series(1,32) n;
 INSERT INTO public.identity_profiles(identity_id,display_name,slug)
 SELECT id,display_name,'plan-'||id FROM public.identities WHERE id::text LIKE '96000000-%';
 INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
 SELECT ('95000000-0000-4000-8000-'||lpad(to_hex(v),12,'0'))::uuid,
 ('96000000-0000-4000-8000-'||lpad(to_hex(p),12,'0'))::uuid,gen_random_uuid(),
 statement_timestamp()+CASE WHEN p<=2 THEN interval '24 hours' ELSE interval '-24 hours' END
 FROM generate_series(1,512) v CROSS JOIN generate_series(1,32) p;
 INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
 SELECT '${a.peer}',('96000000-0000-4000-8000-'||lpad(to_hex(p),12,'0'))::uuid,gen_random_uuid(),
 statement_timestamp()+CASE WHEN p<=2 THEN interval '24 hours' ELSE interval '-24 hours' END FROM generate_series(1,32) p;
 INSERT INTO public.user_blocks(blocker_id,blocked_id)
 SELECT ('95000000-0000-4000-8000-'||lpad(to_hex(v),12,'0'))::uuid,
 ('95000000-0000-4000-8000-'||lpad(to_hex(p),12,'0'))::uuid FROM generate_series(1,512) v CROSS JOIN generate_series(1,20) p WHERE v<>p;
 INSERT INTO public.listings(id,user_id,identity_id,created_by_user_id,title,status,active_until,created_at)
 SELECT 70000+n,'${a.owner}',('96000000-0000-4000-8000-'||lpad(to_hex(1+n%32),12,'0'))::uuid,'${a.owner}',
 'Synthetic plan listing '||n,'active',statement_timestamp()+interval '20 days',statement_timestamp()-n*interval '1 second' FROM generate_series(1,240) n;
 ANALYZE provider_controls_private.hidden_providers;ANALYZE public.user_blocks;ANALYZE public.listings;ANALYZE public.identities;ANALYZE public.identity_profiles;
 `);
 const s=await service.prepare(service.content(),[]);await service.publish(s);await db.exec('ANALYZE public.services');
 const params={v_actor:`'${a.peer}'::uuid`,v_query:"''",v_location:"''",v_category:'NULL::text',v_subcategory:'NULL::text',v_detail:'NULL::text',v_condition:'NULL::text',
 v_tsquery:"plainto_tsquery('pg_catalog.simple'::regconfig,'')",p_result_limit:'25',p_result_offset:'0',
 actor:`'${a.peer}'::uuid`,q:"''",loc:"''",cat:'NULL::text',sub:'NULL::text',detail:'NULL::text',cond:'NULL::text',
 p_identity_id:'NULL::uuid',query:"plainto_tsquery('pg_catalog.simple'::regconfig,'')",
 p_category:'NULL::text',p_subcategory:'NULL::text',p_country:'NULL::text',p_city:'NULL::text',
 result_limit:'25',result_offset:'0',center_lat:'NULL::double precision',center_lng:'NULL::double precision'};
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[a.peer]);
 for(const [module,name,extra] of [
 ['05_search_ordinary_v1.sql','public.search_public_listings_v1',{}],['06_search_ordinary_v2.sql','public.search_public_listings_v2',{}],
 ['07_search_marketplace.sql','public.search_public_marketplace_v1',{}],['08_search_services.sql','public.search_public_services_v1',{query:"''"}],
 ['10_legacy_search.sql','public.get_marketplace_listings',{}],['10_legacy_search.sql','public.get_marketplace_listings_nearby',{}]]){
  const result=await explain(name,body(module,name,{...params,...extra}));
  const cte=result.filter(x=>x['Subplan Name']==='CTE viewer_hidden');assert.equal(cte.length,1,name+' one materialized set');
  assert.equal(cte[0]['Actual Loops'],1,name+' one execution');assert.equal(cte[0]['Actual Rows'],2,name+' only this viewer active rows');
  assert(result.some(x=>x['Index Name']==='hidden_providers_active_idx'),name+' scoped hidden index');
  assert(!result.some(x=>x['Node Type']==='Seq Scan'&&x['Relation Name']==='hidden_providers'),name+' no global hidden scan');
  checks.push(name+'_materialized_once_and_scoped_index');
 }
 const helper=await explain('own-hidden-helper-body',`SELECT h.provider_identity_id FROM provider_controls_private.hidden_providers h
 WHERE h.viewer_user_id=auth.uid() AND h.hidden_until>statement_timestamp()`);
 assert(helper.some(x=>x['Index Name']==='hidden_providers_active_idx'&&x['Index Cond'].includes('viewer_user_id')&&x['Index Cond'].includes('hidden_until')));
 checks.push('own_hidden_helper_uses_viewer_and_expiry_index_conditions');
 const block=await explain('bilateral-pair-index',`SELECT 1 FROM public.user_blocks b WHERE
 (b.blocker_id='${a.peer}' AND b.blocked_id='${a.owner}') OR (b.blocker_id='${a.owner}' AND b.blocked_id='${a.peer}')`);
 assert(block.filter(x=>['user_blocks_blocker_id_blocked_id_key','user_blocks_blocked_blocker_idx_v1'].includes(x['Index Name'])).length>=2);
 assert(!block.some(x=>x['Node Type']==='Seq Scan'&&x['Relation Name']==='user_blocks'));
 checks.push('account_pair_predicates_use_btree_indexes_in_both_directions');
 const incoming=await explain('incoming-account-leading-key',`SELECT blocker_id FROM public.user_blocks WHERE blocked_id='${a.peer}'::uuid`);
 assert(incoming.some(x=>x['Index Name']==='user_blocks_blocked_blocker_idx_v1'&&x['Index Cond'].includes('blocked_id')));
 assert(!incoming.some(x=>x['Node Type']==='Seq Scan'&&x['Relation Name']==='user_blocks'));
 checks.push('incoming_account_set_uses_blocked_id_as_leading_index_key');
 await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
 const feed=await explain('authenticated-invoker-feed',"SELECT d.id FROM public.discovery_listings_v1 d WHERE d.status='active' AND d.active_until>statement_timestamp() ORDER BY d.created_at DESC,d.id DESC LIMIT 25",true);
 const feedSet=feed.filter(x=>x['Subplan Name']==='CTE viewer_hidden');assert.equal(feedSet.length,1);assert.equal(feedSet[0]['Actual Loops'],1);
 assert.equal(feedSet[0]['Actual Rows'],2);checks.push('invoker_feed_materializes_one_actor_set_before_page');
 assert(feed.some(x=>x['Index Name']==='user_blocks_blocked_blocker_idx_v1'&&x['Index Cond'].includes('blocked_id')));
 assert(!feed.some(x=>x['Node Type']==='Seq Scan'&&x['Relation Name']==='user_blocks'));
 checks.push('invoker_feed_incoming_blocks_use_reverse_index_without_global_scan');
 const summary=await db.query(`SELECT (SELECT count(*)::int FROM provider_controls_private.hidden_providers) hidden_rows,
 (SELECT count(*)::int FROM public.user_blocks) block_rows,(SELECT count(*)::int FROM public.listings) listing_rows`);
 const indexes=(await db.query("SELECT indexrelid::regclass::text name,pg_get_indexdef(indexrelid) definition,indisvalid,indisready FROM pg_index WHERE indrelid IN('public.user_blocks'::regclass,'provider_controls_private.hidden_providers'::regclass) ORDER BY indexrelid::regclass::text")).rows;
 const inputs=Object.fromEntries([...provenance.map(p=>[p.path,p.sha256]),...[...modules,'tests/fixture.mjs','tests/query-plan.mjs'].map(n=>
 ['supabase/repairs/20261113_provider_controls/'+n,sha(fs.readFileSync(path.join(repair,n)))])]);
 fs.writeFileSync(path.join(repair,'query-plan-result.json'),JSON.stringify({schema_version:1,kind:'provider-controls-query-plan',result:'PASS',
 generated_at_utc:new Date().toISOString(),checks,check_count:checks.length,engine:'PGlite PostgreSQL/WASM',synthetic_rows:summary.rows[0],
 indexes,plans:records,concurrent_sessions:false,load_test:false,production_throughput:false,live_database:false,postgrest_embeds:false,inputs},null,2)+'\n');
 console.log(JSON.stringify({result:'PASS',check_count:checks.length,synthetic_rows:summary.rows[0]}));
}catch(e){console.error(JSON.stringify({result:'FAIL',checks,message:e.message,code:e.code,where:e.where,position:e.position,
 plan_summaries:records.map(r=>({label:r.label,nodes:nodes(r.plan.Plan).map(n=>({type:n['Node Type'],relation:n['Relation Name'],index:n['Index Name'],loops:n['Actual Loops'],rows:n['Actual Rows']}))}))},null,2));process.exitCode=1;}
finally{await db.close();}
