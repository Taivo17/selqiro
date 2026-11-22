// Additional actual metadata is compared within one apply, never treated as a
// fixed production pin derived from the narrower synthetic auth/storage fixture.
import {acl,fnFacts,relationFacts,array,hash} from './core.mjs';
export const authorityRelations=['public.profiles','public.identities','public.business_accounts','public.business_members',
 'listing_publication_private.hosted_preview_settings','listing_publication_private.hosted_preview_actors','storage.buckets'];
export const authoritySchemas=['auth','public','listing_publication_private','storage'];
export const requiredColumns=[
 ['public.profiles','id','uuid'],['public.profiles','active_identity_id','uuid'],
 ['public.identities','id','uuid'],['public.identities','type','text'],['public.identities','user_id','uuid'],
 ['public.identities','business_account_id','uuid'],['public.identities','status','text'],
 ['public.business_accounts','id','uuid'],['public.business_accounts','status','text'],
 ['public.business_members','business_account_id','uuid'],['public.business_members','user_id','uuid'],['public.business_members','status','text'],
 ['listing_publication_private.hosted_preview_settings','singleton','boolean'],
 ['listing_publication_private.hosted_preview_settings','project_ref','text'],
 ['listing_publication_private.hosted_preview_settings','instance_id','uuid'],
 ['listing_publication_private.hosted_preview_settings','release_id','text'],
 ['listing_publication_private.hosted_preview_settings','enabled','boolean'],
 ['listing_publication_private.hosted_preview_settings','release_ready','boolean'],
 ['listing_publication_private.hosted_preview_settings','storage_authority_version','text'],
 ['listing_publication_private.hosted_preview_actors','actor_user_id','uuid']];
export const requiredKeys=[['public.profiles','id'],['public.identities','id'],['public.business_accounts','id'],
 ['listing_publication_private.hosted_preview_settings','singleton'],
 ['listing_publication_private.hosted_preview_actors','actor_user_id']];
export const requiredRls=authorityRelations.filter(name=>name!=='storage.buckets');
const values=rows=>rows.map(row=>'('+row.map(x=>"'"+x.replaceAll("'","''")+"'").join(',')+')').join(',\n');

// All arrays use bytewise C ordering; OIDs are resolved to names. Passwords and
// role-setting contents are never returned. Only their SHA-256 is compared.
export function authoritySql(){return `WITH authority_relations AS MATERIALIZED (
 SELECT n.nspname||'.'||c.relname name,${relationFacts}||jsonb_build_object(
 'persistence',c.relpersistence,'options',c.reloptions,
 'partition_key',pg_get_partkeydef(c.oid),'partition_bound',pg_get_expr(c.relpartbound,c.oid),
 'inherits',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY (i.inhparent::regclass::text) COLLATE "C"),'[]'::jsonb)
 FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'rules',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rulename,'definition',pg_get_ruledef(r.oid))
 ORDER BY r.rulename COLLATE "C"),'[]'::jsonb) FROM pg_rewrite r WHERE r.ev_class=c.oid)) facts
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname=ANY(${array(authorityRelations)})
),authority_functions AS MATERIALIZED (
 SELECT p.oid::regprocedure::text signature,${fnFacts}||jsonb_build_object(
 'returns_set',p.proretset,'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='auth' AND p.proname IN('uid','jwt','role'))
 OR EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace s ON s.oid=c.relnamespace
 WHERE t.tgfoid=p.oid AND NOT t.tgisinternal AND s.nspname||'.'||c.relname=ANY(${array(authorityRelations)}))
 OR EXISTS(SELECT 1 FROM pg_event_trigger e WHERE e.evtfoid=p.oid)
),authority_observed AS MATERIALIZED (
 SELECT jsonb_build_object(
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM authority_relations),
 'functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM authority_functions),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',${acl("coalesce(n.nspacl,acldefault('n',n.nspowner))")}) ORDER BY n.nspname COLLATE "C"),'[]'::jsonb)
 FROM pg_namespace n WHERE n.nspname=ANY(${array(authoritySchemas)})),
 'roles',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'super',r.rolsuper,'inherit',r.rolinherit,
 'create_role',r.rolcreaterole,'create_db',r.rolcreatedb,'login',r.rolcanlogin,'replication',r.rolreplication,
 'bypass_rls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,
 'config_sha256',${hash('to_jsonb(r.rolconfig)')}) ORDER BY r.rolname COLLATE "C"),'[]'::jsonb) FROM pg_roles r),
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),
 'member',pg_get_userbyid(m.member),'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,
 'inherit',m.inherit_option,'set',m.set_option) ORDER BY pg_get_userbyid(m.roleid) COLLATE "C",
 pg_get_userbyid(m.member) COLLATE "C",pg_get_userbyid(m.grantor) COLLATE "C"),'[]'::jsonb) FROM pg_auth_members m),
 'default_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(d.defaclrole),
 'schema',coalesce(n.nspname,'*'),'type',d.defaclobjtype,'acl',${acl('d.defaclacl')})
 ORDER BY pg_get_userbyid(d.defaclrole) COLLATE "C",coalesce(n.nspname,'*') COLLATE "C",d.defaclobjtype),'[]'::jsonb)
 FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
 WHERE d.defaclnamespace=0 OR n.nspname=ANY(${array(authoritySchemas)})),
 'role_database_settings',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END,
 'database',CASE WHEN s.setdatabase=0 THEN 'ALL' ELSE current_database() END,'settings_sha256',${hash('to_jsonb(s.setconfig)')})
 ORDER BY s.setdatabase=0,CASE WHEN s.setrole=0 THEN 'ALL' ELSE pg_get_userbyid(s.setrole) END COLLATE "C"),'[]'::jsonb)
 FROM pg_db_role_setting s WHERE s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database())),
 'event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,
 'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'enabled',e.evtenabled,'tags',e.evttags)
 ORDER BY e.evtname COLLATE "C"),'[]'::jsonb) FROM pg_event_trigger e),
 'target_extra_properties',(SELECT jsonb_build_object('kind',p.prokind,'returns_set',p.proretset,
 'cost',p.procost,'rows',p.prorows,'support',p.prosupport::regproc::text,'variadic',p.provariadic::regtype::text,
 'argument_modes',p.proargmodes,'transforms',p.protrftypes::text,'sql_body',p.prosqlbody IS NOT NULL)
 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'))
 ) authority_facts,
 (${minimumContractSql()}) authority_contract_ready
),authority_measured AS MATERIALIZED (SELECT *,${hash('authority_facts')} authority_sha256 FROM authority_observed)
 SELECT authority_facts,authority_contract_ready,authority_sha256 FROM authority_measured`;}

export function minimumContractSql(){return `
 current_setting('server_version_num')::integer>=170000
 AND current_user='postgres'
 AND current_setting('transaction_isolation')='read committed'
 AND NOT EXISTS(SELECT 1 FROM (VALUES ${values(requiredColumns)}) e(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped
 AND a.attname=e.column_name AND a.atttypid=to_regtype(e.type_name)))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ${values(requiredKeys)}) e(relation_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_index i ON i.indrelid=a.attrelid
 WHERE a.attrelid=to_regclass(e.relation_name) AND a.attname=e.column_name AND a.attnotnull AND NOT a.attisdropped
 AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1 AND i.indkey[0]=a.attnum
 AND i.indexprs IS NULL AND i.indpred IS NULL))
 AND NOT EXISTS(SELECT 1 FROM unnest(${array(requiredRls)}) e(name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_class c WHERE c.oid=to_regclass(e.name) AND c.relrowsecurity))
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()') AND p.prorettype='uuid'::regtype
 AND p.provolatile IN('s','i') AND NOT p.proretset)
 AND EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)')
 AND p.prokind='f' AND NOT p.proretset AND p.procost=100 AND p.prorows=0 AND p.prosupport=0 AND p.provariadic=0
 AND p.proargmodes IS NULL AND p.protrftypes IS NULL AND p.prosqlbody IS NULL
 AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid
 AND d.refclassid='pg_extension'::regclass AND d.deptype='e'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
 AND pg_has_role(r.oid,'postgres','MEMBER'))
 AND coalesce(has_function_privilege('authenticated',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),false)
 AND NOT coalesce(has_function_privilege('anon',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)
 AND NOT coalesce(has_function_privilege('service_role',to_regprocedure('public.get_my_jobs_v1(uuid,uuid,integer,jsonb)'),'EXECUTE'),true)`;}
