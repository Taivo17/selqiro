// Local test adapter only. No remote database connection or production SQL.
// Supabase's bootstrap role and the normal `postgres` installer are distinct.
// PostgreSQL 17 therefore records its automatic creator ADMIN grant with the
// bootstrap grantor, alongside the retained explicit installer membership.
// Reproduce that behavior through PostgreSQL role DDL, not edited catalog rows.
import assert from 'node:assert/strict';
const {PGlite:Backend}=await import(process.env.SELQIRO_HORSE_PGLITE_BACKEND||'@electric-sql/pglite');

export class PGlite {
 static async create(...args){
  const db=await Backend.create(...args);
  await db.exec(`
   CREATE ROLE horse_fixture_bootstrap SUPERUSER;
   SET SESSION AUTHORIZATION horse_fixture_bootstrap;
   ALTER ROLE postgres RENAME TO supabase_admin;
   CREATE ROLE postgres LOGIN SUPERUSER CREATEDB CREATEROLE BYPASSRLS;
   SET SESSION AUTHORIZATION postgres;
   DROP ROLE horse_fixture_bootstrap;
  `);
  const bootstrap=(await db.query(`SELECT rolname FROM pg_roles WHERE oid=10`)).rows[0];
  assert.equal(bootstrap.rolname,'supabase_admin','provider bootstrap grantor');
  const database=(await db.query('SELECT current_database() name')).rows[0].name;
  await db.exec('ALTER DATABASE "'+database.replaceAll('"','""')+'" OWNER TO postgres');
  const originalExec=db.exec.bind(db);
  const declaration='CREATE ROLE selqiro_listing_final_writer_v1 NOLOGIN NOINHERIT NOBYPASSRLS;';
  const inheritedGrant='GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN FALSE,INHERIT TRUE,SET TRUE;';
  const inheritedDemotion="UPDATE pg_authid SET rolsuper=false,rolcreaterole=true,rolbypassrls=true WHERE rolname='postgres'";
  let created=false;
  db.exec=async(sql,...options)=>{
   if(typeof sql==='string'&&sql.includes(declaration)){
    assert(!created,'one synthetic final-writer setup');created=true;
    assert.equal(sql.split(declaration).length,2,'one retained final-writer creation');
    assert.equal(sql.split(inheritedGrant).length,2,'one inherited final-writer grant');
    // The inherited fixture creates initial synthetic schemas with superuser
    // setup, then demotes postgres before any tested operation. Create this
    // application role under the real non-superuser CREATEROLE boundary too.
    const creation=`
     SET SESSION AUTHORIZATION supabase_admin;
     ALTER ROLE postgres NOSUPERUSER;
     SET SESSION AUTHORIZATION postgres;
     ${declaration}
     SET SESSION AUTHORIZATION supabase_admin;
     ALTER ROLE postgres SUPERUSER;
     SET SESSION AUTHORIZATION postgres;
    `;
    // The retained release explicitly names postgres as grantor, preserving
    // the distinct PG17 automatic grant from supabase_admin.
    return originalExec(sql.replace(declaration,creation).replace(inheritedGrant,
     inheritedGrant.slice(0,-1)+' GRANTED BY postgres;'),...options);
   }
   if(sql===inheritedDemotion){
    assert(created,'demotion follows fixture setup');
    // Role DDL refreshes permission caches. Do not inherit the old fixture's
    // direct system-catalog UPDATE when the bootstrap role is distinct.
    db.exec=originalExec;
    return originalExec('ALTER ROLE postgres NOSUPERUSER CREATEROLE BYPASSRLS',...options);
   }
   return originalExec(sql,...options);
  };
  return db;
 }
}
