// Exact retained query bodies plus one materialized viewer anti-join per search.
// Never rewrite an applied source file. This generator writes this repair only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const repair=path.dirname(path.dirname(fileURLToPath(import.meta.url))),root=path.resolve(repair,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function fn(sql,name){const escaped=name.split('.').map(n=>'(?:'+n+'|"'+n+'")').join('\\.');
 const m=new RegExp('CREATE(?: OR REPLACE)? FUNCTION '+escaped+'\\s*\\(','i').exec(sql);assert(m,name);
 const tail=sql.slice(m.index),delimiter=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(tail);assert(delimiter,name);
 const end=tail.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;
 return tail.slice(0,tail.indexOf(';',end)+1).replace(/^create(?: or replace)? function/i,'CREATE OR REPLACE FUNCTION');}
const replace=(s,a,b)=>{assert.equal(s.split(a).length,2,a);return s.replace(a,()=>b);};
const hidden=actor=>`viewer_hidden AS MATERIALIZED (SELECT provider_identity_id FROM provider_controls_private.hidden_providers\n WHERE viewer_user_id=${actor} AND hidden_until>statement_timestamp())`;
const anti=identity=>`NOT EXISTS(SELECT 1 FROM viewer_hidden vh WHERE vh.provider_identity_id=${identity})`;
const v1=read('supabase/migrations/20260926180000_add_public_listing_detail_keywords.sql');
const v2=read('supabase/releases/listing-publication-hosted-preview-v1/40_read_models_and_owner.sql');
for(const [name,sql,out] of [['search_public_listings_v1',v1,'05_search_ordinary_v1.sql'],['search_public_listings_v2',v2,'06_search_ordinary_v2.sql']]){
 let body=fn(sql,'public.'+name);
 body=replace(body,'with matched as materialized (','with '+hidden('v_actor')+', matched as materialized (');
 body=replace(body,"where l.status = 'active'","where "+anti('l.identity_id')+" and l.status = 'active'");
 fs.writeFileSync(path.join(repair,out),'-- Retained filters, wire, ordering and public grants; preference before count/page.\n'+body+'\n');
}
let marketplace=fn(read('supabase/repairs/20261108_horse_publication/07_public.sql'),'public.search_public_marketplace_v1');
marketplace=replace(marketplace,'WITH ordinary AS MATERIALIZED(','WITH '+hidden('actor')+', ordinary AS MATERIALIZED(');
marketplace=replace(marketplace,"WHERE l.status='active'","WHERE "+anti('l.identity_id')+" AND l.status='active'");
marketplace=replace(marketplace,'WHERE horse_publication_private.is_public(h.id)','WHERE '+anti('h.identity_id')+' AND horse_publication_private.is_public(h.id)');
fs.writeFileSync(path.join(repair,'07_search_marketplace.sql'),marketplace+'\n');
let services=fn(read('supabase/repairs/20261108_service_publication/06_reads_status.sql'),'public.search_public_services_v1');
services=replace(services,'WITH candidates AS MATERIALIZED(','WITH '+hidden('public.listing_actor_uid_hosted_v1()')+', candidates AS MATERIALIZED(');
services=replace(services,'FROM public.services s WHERE service_publication_private.is_public(s.id)',
 'FROM public.services s WHERE '+anti('s.identity_id')+' AND service_publication_private.is_public(s.id)');
fs.writeFileSync(path.join(repair,'08_search_services.sql'),services+'\n');
const baseline=read('supabase/migrations/20260722173530_baseline_20260722.sql');
const legacy=[];
for(const name of ['get_marketplace_listings','get_marketplace_listings_nearby']){
 let body=fn(baseline,'public.'+name);
 body=replace(body,'AS $$\n  select','AS $$\n  WITH '+hidden('auth.uid()')+'\n  select');
 body=replace(body,"where l.status = 'active'","where "+anti('l.identity_id')+`\n    AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE auth.uid() IS NOT NULL
     AND ((b.blocker_id=auth.uid() AND b.blocked_id=l.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=l.user_id)))
    AND l.status = 'active'`);
 legacy.push(body);
}
fs.writeFileSync(path.join(repair,'10_legacy_search.sql'),'-- Existing legacy wires and sorting; filters now run before page selection.\n'+legacy.join('\n\n')+'\n');
