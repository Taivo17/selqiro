// Reconstruct function ACLs from the retained release, never from fixture defaults.
// This affects only the disposable fixture and leaves production SQL unchanged.
import assert from 'node:assert/strict';
export async function retainedAuthority(db,release,policy) {
 const retained=new Set([...release.matchAll(/^CREATE(?: OR REPLACE)? FUNCTION ([a-z_]+\.[a-z0-9_]+)\s*\(/gm)].map(x=>x[1]));
 const rows=(await db.query(`SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,
  pg_get_userbyid(p.proowner) owner FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN('public','listing_publication_private')`)).rows;
 const byName=new Map(rows.map(row=>[row.name,row]));
 for(const role of ['selqiro_listing_price_writer_v1','selqiro_listing_contact_writer_v1']) {
  await db.exec(`CREATE ROLE ${role} NOLOGIN NOINHERIT NOBYPASSRLS`);
 }
 for(const match of release.matchAll(/^ALTER FUNCTION ([a-z_]+\.[a-z0-9_]+)\([^;]*?\)\s+OWNER TO ([a-z0-9_]+);/gm)) {
  const row=byName.get(match[1]);if(!row)continue;
  await db.exec(`ALTER FUNCTION ${row.signature} OWNER TO ${match[2]}`);row.owner=match[2];
 }
 for(const row of rows.filter(row=>retained.has(row.name))) {
  await db.exec(`REVOKE ALL ON FUNCTION ${row.signature} FROM PUBLIC,anon,authenticated,service_role,
   selqiro_listing_final_writer_v1,selqiro_listing_price_writer_v1,selqiro_listing_contact_writer_v1;
   GRANT EXECUTE ON FUNCTION ${row.signature} TO ${row.owner}`);
  if(row.name.startsWith('listing_publication_private.'))await db.exec(
   `GRANT EXECUTE ON FUNCTION ${row.signature} TO selqiro_listing_final_writer_v1`);
 }
 async function grants(sql) {
  for(const grant of sql.matchAll(/^GRANT EXECUTE ON FUNCTION([\s\S]*?)\sTO ([a-z0-9_,\s]+);/gm)) {
   const roles=grant[2].split(',').map(x=>x.trim());
   assert(roles.every(x=>/^[a-z][a-z0-9_]*$/.test(x)));
   for(const signature of grant[1].matchAll(/((?:public|listing_publication_private|listing_contact_private)\.[a-z0-9_]+)\([^)]*\)/g)) {
    const row=byName.get(signature[1]);if(!row)continue;
    const actual=(await db.query('SELECT to_regprocedure($1)::text signature',[signature[0]])).rows[0].signature;
    assert.equal(actual,row.signature,'retained GRANT signature drift: '+signature[0]);
    await db.exec(`GRANT EXECUTE ON FUNCTION ${row.signature} TO ${roles.join(',')}`);
   }
  }
 }
 await grants(release);
 // The release compiler expands this exact closure after earlier component grants.
 const close=release.match(/DO \$close_new_public_functions\$[\s\S]*?END \$close_new_public_functions\$;/);
 assert(close);await db.exec(close[0]);
 await grants(release.slice(release.indexOf('-- COMPONENT 60_preview_authority.sql')));
 for(const row of rows.filter(row=>retained.has(row.name)&&row.name.startsWith('listing_publication_private.'))) {
  await db.exec(`REVOKE ALL ON FUNCTION ${row.signature} FROM PUBLIC,anon,authenticated,service_role`);
 }
 // These two earlier policy functions are not owned by the hosted release.
 // Apply their exact original migration statements, including explicit PUBLIC closure.
 for(const match of policy.matchAll(/(?:^|\n)(revoke all|grant execute)\s+on function\s+(public\.[a-z0-9_]+\([^;]*?\))\s+(from|to)\s+([^;]+);/gi)) {
  const name=match[2].slice(0,match[2].indexOf('(')).trim();
  if(!byName.has(name))continue;
  await db.exec(`${match[1]} ON FUNCTION ${match[2]} ${match[3]} ${match[4]}`);
 }
}
