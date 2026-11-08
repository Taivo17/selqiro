// Fixture reconstruction only. The upload-capacity guard includes every
// retained private function, whereas the inherited horse fixture had restored
// only named dependencies. Restore the remaining exact release declarations
// and their chronological ACL/owner statements without changing existing
// functions or weakening the complete private inventory guard.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

export const retainedPrivateNames=[
 'assert_hosted_install_context','expire_one_v1','guard_source_grant_after_no_release',
 'hosted_s3_query_value_v1','lock_source_release_grant','no_truncate',
 'protect_source_no_release','protect_source_recorded_no_release','protect_source_release_intent',
 'protect_source_release_tracking','protect_upload_grant','protect_web_completion',
 'protect_write_reconcile_job','protect_write_settlement','reserve_upload_dispatch_v1',
 'track_source_grant_birth','upload_binding'
].map(name=>'listing_publication_private.'+name).sort();

export async function restoreRetainedPrivate(db,root){
 const folder=path.join(root,'supabase/releases/listing-publication-hosted-preview-v1');
 const files=['00_preconditions.sql','20_publication_core.sql','30_multipart_and_journey.sql','40_read_models_and_owner.sql','50_storage_authority.sql','60_preview_authority.sql'];
 const existing=new Set((await db.query("SELECT n.nspname||'.'||p.proname name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='listing_publication_private'")).rows.map(x=>x.name));
 assert(retainedPrivateNames.every(name=>!existing.has(name)),'exact missing retained fixture functions');
 const expected=new Set(retainedPrivateNames);
 const created=new Set(),applied=[],provenance=[];
 const names=[];
 for(const file of files){
  const full=path.join(folder,file),sql=fs.readFileSync(full,'utf8'),events=[];
  provenance.push({path:path.relative(root,full),sha256:crypto.createHash('sha256').update(sql).digest('hex')});
  for(const match of sql.matchAll(/^CREATE(?: OR REPLACE)? FUNCTION\s+(listing_publication_private\.[a-z0-9_]+)\s*\(/gmi)){
   if(existing.has(match[1]))continue;
   assert(expected.has(match[1]),'unreviewed missing retained function '+match[1]);
   const rest=sql.slice(match.index),delimiter=/\bAS\s+(\$[a-z_0-9]*\$)/i.exec(rest);assert(delimiter,match[1]);
   const bodyEnd=rest.indexOf(delimiter[1],delimiter.index+delimiter[0].length)+delimiter[1].length;
   assert(bodyEnd>=delimiter[1].length,match[1]);
   events.push({offset:match.index,kind:'function',name:match[1],sql:rest.slice(0,rest.indexOf(';',bodyEnd)+1)});
  }
  for(const match of sql.matchAll(/^(?:GRANT|REVOKE|ALTER FUNCTION)\b[^;]*;/gmi))events.push({offset:match.index,kind:'authority',sql:match[0]});
  events.sort((a,b)=>a.offset-b.offset);
  for(const event of events){
   if(event.kind==='function'){
    assert(!created.has(event.name),'one exact retained declaration per restored function');
    await db.exec(event.sql);created.add(event.name);names.push(event.name);applied.push({file,offset:event.offset,sql:event.sql});continue;
   }
   const stmt=event.sql;
   const owner=/^ALTER FUNCTION\s+(listing_publication_private\.[a-z0-9_]+)\s*\([^)]*\)\s+OWNER TO\s+([a-z0-9_]+);$/i.exec(stmt);
   if(owner&&created.has(owner[1])){
    const grant='GRANT CREATE ON SCHEMA listing_publication_private TO '+owner[2]+';';
    const revoke='REVOKE CREATE ON SCHEMA listing_publication_private FROM '+owner[2]+';';
    assert(sql.slice(0,event.offset).includes(grant)&&sql.slice(event.offset).includes(revoke),'retained owner-transition authority');
    assert.equal((await db.query("SELECT has_schema_privilege($1,'listing_publication_private','CREATE') value",[owner[2]])).rows[0].value,false);
    await db.exec(grant+'\n'+stmt+'\n'+revoke);
    applied.push({file,offset:event.offset,sql:stmt});continue;
   }
   const acl=/^(GRANT|REVOKE)\s+(.+?)\s+ON\s+(ALL FUNCTIONS IN SCHEMA\s+listing_publication_private|FUNCTION\s+[\s\S]+?)\s+(TO|FROM)\s+([^;]+);$/i.exec(stmt);
   if(!acl)continue;
   const broad=/^ALL FUNCTIONS IN SCHEMA/i.test(acl[3]);
   const targets=broad?(await db.query("SELECT n.nspname||'.'||p.proname name,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY($1)",[[...created]])).rows.map(x=>x.signature):[...acl[3].matchAll(/((?:[a-z_]+)\.[a-z0-9_]+)\s*\([^()]*\)/gi)].filter(x=>created.has(x[1])).map(x=>x[0]);
   if(!targets.length)continue;
   const appliedSql=acl[1]+' '+acl[2]+' ON FUNCTION '+targets.join(',')+' '+acl[4]+' '+acl[5]+';';
   await db.exec(appliedSql);applied.push({file,offset:event.offset,sql:appliedSql,source:stmt});
  }
 }
 assert.deepEqual(names.sort(),retainedPrivateNames,'complete reviewed retained private inventory');
 return {names:names.sort(),provenance,applied};
}
