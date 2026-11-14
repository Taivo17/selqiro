// Disposable fixture only. The accepted declarations are loaded unchanged;
// no earlier test suite, external database, user data, or network is used.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as previous from '../../20261113_block_removal/tests/fixture.mjs';
export * from '../../20261113_block_removal/tests/fixture.mjs';
export const {db,root,actors,asActor,asRole,call,setIdentity,sha,all,result,get,action,list,snapshot}=previous;
export const repair=path.join(root,'supabase/repairs/20261114_block_removal_auth');
export const provenance=[...previous.provenance];
export function source(relative){const text=fs.readFileSync(path.join(root,relative),'utf8');
 provenance.push({path:relative,sha256:sha(text)});return text;}

// The failed hosted install proved that postgres can call Auth but cannot
// grant its schema/function privileges. Reproduce that boundary through DDL.
// Bootstrap authority is used solely for synthetic setup, then relinquished.
await db.exec(`
 SET SESSION AUTHORIZATION supabase_admin;
 CREATE ROLE supabase_auth_admin NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
 ALTER SCHEMA auth OWNER TO supabase_admin;
 ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
 GRANT USAGE ON SCHEMA auth TO postgres;
 GRANT EXECUTE ON FUNCTION auth.uid() TO postgres;
 SET SESSION AUTHORIZATION postgres;
`);
export const installerFacts=(await db.query(`SELECT current_user actor,r.rolsuper,r.rolcreaterole,
 has_schema_privilege(current_user,'auth','USAGE') auth_usage,
 has_schema_privilege(current_user,'auth','USAGE WITH GRANT OPTION') auth_usage_grantable,
 has_function_privilege(current_user,'auth.uid()','EXECUTE') auth_uid_execute,
 has_function_privilege(current_user,'auth.uid()','EXECUTE WITH GRANT OPTION') auth_uid_execute_grantable
 FROM pg_roles r WHERE r.rolname=current_user`)).rows[0];
assert.deepEqual(installerFacts,{actor:'postgres',rolsuper:false,rolcreaterole:true,
 auth_usage:true,auth_usage_grantable:false,auth_uid_execute:true,auth_uid_execute_grantable:false});

export const authSnapshot=async()=>(await db.query(`SELECT jsonb_build_object(
 'schema_owner',pg_get_userbyid(n.nspowner),'schema_acl',n.nspacl::text,
 'uid_owner',pg_get_userbyid(p.proowner),'uid_acl',p.proacl::text,
 'uid_definition',pg_get_functiondef(p.oid)) value
 FROM pg_namespace n JOIN pg_proc p ON p.pronamespace=n.oid
 WHERE n.nspname='auth' AND p.oid='auth.uid()'::regprocedure`)).rows[0].value;
export const authBaseline=await authSnapshot();
assert.equal(authBaseline.schema_owner,'supabase_admin');
assert.equal(authBaseline.uid_owner,'supabase_auth_admin');
export const modules=['01_legacy_block_guard.sql','02_browser_permissions.sql','03_cas_delete_authority.sql','04_cas_setter.sql'];
export async function install(){for(const name of modules)await db.exec(source('supabase/repairs/20261114_block_removal_auth/'+name));}
