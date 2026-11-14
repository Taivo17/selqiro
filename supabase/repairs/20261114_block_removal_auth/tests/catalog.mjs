import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const role='selqiro_block_removal_writer_v1';
export const changedFunctions=['messaging_private_v2.set_block','public.set_my_provider_control_v1'];
export const newFunctions=['provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1',
 'provider_controls_private.current_block_actor_v1'];
export const newPolicies=['block_removal_own_read_v1','block_removal_own_delete_v1'];
export const guardNames=['installer','hosted_context_ready','actor_roles','account_block_structure',
 'account_block_policies','provider_cas_authority','messaging_guards','entrypoint_authority','block_writer_inventory'];
export const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
export const array=xs=>'ARRAY['+xs.map(quote).join(',')+']::text[]';
export const sha=s=>createHash('sha256').update(s).digest('hex');
export const digest=s=>"encode(sha256(convert_to(("+s+")::text,'UTF8')),'hex')";
const acl=(expression,filter='true',grantor=true)=>"(SELECT coalesce(jsonb_agg(jsonb_build_object("+
 (grantor?"'grantor',pg_get_userbyid(x.grantor),":"")+
 "'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)"+
 " ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb)"+
 " FROM aclexplode("+expression+") x WHERE "+filter+")";
const noNewRole="pg_get_userbyid(x.grantee)<>"+quote(role);
const justNewRole="pg_get_userbyid(x.grantee)="+quote(role);
const related=['public.user_blocks','public.messages','public.conversations','public.conversation_participants','provider_controls_private.hidden_providers'];
const functions=[
 ...changedFunctions,...newFunctions,
 'provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider',
 'provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot',
 'public.get_my_provider_control_v1','public.list_my_provider_controls_v1',
 'messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block',
 'listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message',
 'public.send_my_message_v2','public.send_my_listing_message_v1','public.set_my_thread_block_v2',
 'public.block_store_identity_owner','public.restore_conversation_for_participants'];
const policyFacts="jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,"+
 "'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),"+
 "'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))";
const triggerFacts="jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text)";
export function observationSql(){return [
"WITH function_facts AS MATERIALIZED (",
" SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,",
" jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,",
" 'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,",
" 'parallel',p.proparallel,'result',pg_get_function_result(p.oid),'argument_names',p.proargnames,",
" 'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,'body_sha256',"+digest('p.prosrc')+",",
" 'acl',"+acl("coalesce(p.proacl,acldefault('f',p.proowner))")+") facts",
" FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang",
" WHERE n.nspname||'.'||p.proname=ANY("+array(functions)+")",
"), relation_facts AS MATERIALIZED (",
" SELECT n.nspname||'.'||c.relname name,c.oid,",
" jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,",
" 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),",
" 'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum),'[]')",
" FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),",
" 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated)",
" ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),",
" 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,",
" 'ready',i.indisready,'unique',i.indisunique,'primary',i.indisprimary) ORDER BY i.indexrelid::regclass::text),'[]') FROM pg_index i WHERE i.indrelid=c.oid),",
" 'triggers',(SELECT coalesce(jsonb_agg("+triggerFacts+" ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal",
" AND t.tgname<>'user_blocks_cas_delete_v1'),",
" 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),",
" 'parents',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhparent::regclass::text),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),",
" 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid))",
" ORDER BY q.conrelid::regclass::text,q.conname),'[]') FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid)) structure,",
" jsonb_build_object('acl',"+acl("coalesce(c.relacl,acldefault('r',c.relowner))")+",",
" 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'acl',"+acl("a.attacl")+") ORDER BY a.attnum),'[]')",
" FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),",
" 'policies',(SELECT coalesce(jsonb_agg("+policyFacts+" ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname<>ALL("+array(newPolicies)+"))) authority",
" FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY("+array(related)+")",
"), sequence_facts AS MATERIALIZED (",
" SELECT jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'type',format_type(s.seqtypid,NULL),",
" 'start',s.seqstart::text,'increment',s.seqincrement::text,'min',s.seqmin::text,'max',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle,",
" 'ownership',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',d.refobjid::regclass::text,'column',a.attname,'kind',d.deptype) ORDER BY d.refobjid::regclass::text,d.refobjsubid),'[]')",
" FROM pg_depend d JOIN pg_attribute a ON a.attrelid=d.refobjid AND a.attnum=d.refobjsubid WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype IN('a','i'))) structure,",
" "+acl("coalesce(c.relacl,acldefault('s',c.relowner))")+" acl",
" FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid WHERE c.oid=to_regclass('public.user_blocks_id_seq')",
"), effective AS MATERIALIZED (",
" SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'kind',v.kind,'column',v.col,'privilege',v.priv,",
" 'allowed',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv)",
" WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv)",
" ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv) END,",
" 'grantable',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv||' WITH GRANT OPTION')",
" WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv||' WITH GRANT OPTION')",
" ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv||' WITH GRANT OPTION') END) ORDER BY r.rolname,v.kind,v.col,v.priv),'[]') value",
" FROM pg_roles r CROSS JOIN (SELECT 'table'::text kind,''::text col,unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) priv",
" UNION ALL SELECT 'sequence','',unnest(ARRAY['SELECT','USAGE','UPDATE'])",
" UNION ALL SELECT 'column',a.col,v.priv FROM unnest(ARRAY['id','blocker_id','blocked_id','created_at']) a(col) CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) v(priv)) v",
" WHERE r.rolname=ANY("+array(['anon','authenticated','service_role','selqiro_listing_contact_writer_v1',role])+")",
"), new_role AS MATERIALIZED (",
" SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,'inherit',r.rolinherit,'superuser',r.rolsuper,'createdb',r.rolcreatedb,",
" 'createrole',r.rolcreaterole,'replication',r.rolreplication,'bypassrls',r.rolbypassrls,'limit',r.rolconnlimit,",
" 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),'member',pg_get_userbyid(m.member),",
" 'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid::regrole::text,m.member::regrole::text),'[]')",
" FROM pg_auth_members m WHERE m.roleid=r.oid OR m.member=r.oid),",
" 'schema_rights',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),",
" 'create',has_schema_privilege(r.oid,n.oid,'CREATE')) ORDER BY n.nspname) FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),",
" 'auth_uid_execute',has_function_privilege(r.oid,to_regprocedure('auth.uid()'),'EXECUTE')) ORDER BY r.rolname),'[]') value FROM pg_roles r WHERE r.rolname="+quote(role),
"), writer_inventory AS MATERIALIZED (",
" SELECT coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),",
" 'body_sha256',"+digest('p.prosrc')+",'config',p.proconfig,'acl',"+acl("coalesce(p.proacl,acldefault('f',p.proowner))")+") ORDER BY p.oid::regprocedure::text),'[]') value",
" FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind IN('f','p') AND p.prosecdef AND n.nspname NOT LIKE 'pg_%'",
" AND n.nspname||'.'||p.proname<>ALL("+array([...changedFunctions,...newFunctions])+")",
" AND ((p.prosrc ~* 'user_blocks' AND p.prosrc ~* '\\m(insert|update|delete|truncate)\\M')",
" OR p.prosrc ~* '(set_my_provider_control_v1|set_my_thread_block_v2|messaging_private_v2[.]set_block|provider_controls_private[.]remove_account_block_v1)')",
"), views AS MATERIALIZED (",
" SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'options',c.reloptions,",
" 'definition',pg_get_viewdef(c.oid,true),'acl',"+acl("coalesce(c.relacl,acldefault('r',c.relowner))")+") ORDER BY c.oid::regclass::text),'[]') value",
" FROM pg_class c WHERE c.relkind IN('v','m') AND EXISTS(SELECT 1 FROM pg_rewrite rw JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid",
" WHERE rw.ev_class=c.oid AND d.refclassid='pg_class'::regclass AND d.refobjid=to_regclass('public.user_blocks'))",
"), namespace_authority AS MATERIALIZED (",
" SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',"+acl("coalesce(n.nspacl,acldefault('n',n.nspowner))",noNewRole)+") ORDER BY n.nspname) value",
" FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private','messaging_private_v2','listing_contact_private')",
"), auth_function_acl AS MATERIALIZED (",
" SELECT "+acl("coalesce(p.proacl,acldefault('f',p.proowner))",noNewRole)+" value FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()')",
"), new_privileges AS MATERIALIZED (",
" SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'acl',"+
 acl("coalesce(n.nspacl,acldefault('n',n.nspowner))",justNewRole,false)+") ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),",
" 'auth_uid_acl',(SELECT "+acl("coalesce(p.proacl,acldefault('f',p.proowner))",justNewRole,false)+" FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()'))) value",
"), observed AS MATERIALIZED (",
" SELECT",
" (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name<>ALL("+array([...changedFunctions,...newFunctions])+")) retained_functions,",
" (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name=ANY("+array([...changedFunctions,...newFunctions])+")) changed_functions,",
" (SELECT structure FROM relation_facts WHERE name='public.user_blocks') block_structure,",
" (SELECT authority FROM relation_facts WHERE name='public.user_blocks') block_authority,",
" (SELECT structure FROM sequence_facts) sequence_structure,(SELECT acl FROM sequence_facts) sequence_acl,",
" (SELECT value FROM effective) effective,(SELECT value FROM new_role) new_role,(SELECT value FROM new_privileges) new_privileges,",
" (SELECT value FROM writer_inventory) writer_inventory,(SELECT value FROM views) block_views,",
" (SELECT coalesce(jsonb_agg("+policyFacts+" ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=to_regclass('public.user_blocks') AND p.polname=ANY("+array(newPolicies)+")) new_policies,",
" (SELECT coalesce(jsonb_agg("+triggerFacts+" ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.user_blocks') AND NOT t.tgisinternal AND t.tgname='user_blocks_cas_delete_v1') new_trigger,",
" (SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'structure',structure) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks') retained_structures,",
" jsonb_build_object('relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks'),",
" 'schemas',(SELECT value FROM namespace_authority),'auth_uid_acl',(SELECT value FROM auth_function_acl)) retained_authority,",
" (SELECT coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'release_id',s.release_id,'instance_id',s.instance_id,'release_ready',s.release_ready,",
" 'storage_authority_version',s.storage_authority_version,'cleanup_mode','held') ORDER BY s.singleton),'[]') FROM listing_publication_private.hosted_preview_settings s WHERE s.singleton AND s.enabled) hosted,",
" (current_user='postgres' AND current_setting('transaction_isolation')='read committed' AND EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname=current_user AND (r.rolsuper OR r.rolcreaterole))",
" AND has_schema_privilege(current_user,'provider_controls_private','CREATE') AND has_schema_privilege(current_user,'messaging_private_v2','CREATE')",
" AND has_schema_privilege(current_user,'auth','USAGE') AND has_function_privilege(current_user,to_regprocedure('auth.uid()'),'EXECUTE')) installer_ok,",
" ((SELECT count(*)=3 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role'))",
" AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR (rolname<>'service_role' AND rolbypassrls)))",
" AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN('anon','authenticated'))",
" AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'provider_controls_private','CREATE')",
" OR has_schema_privilege(r.oid,'provider_controls_private','USAGE') OR has_schema_privilege(r.oid,'messaging_private_v2','CREATE') OR has_schema_privilege(r.oid,'messaging_private_v2','USAGE')))) actor_roles_ok",
")"
].join('\n');}
const piece=(names,changed=false)=>"(SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements("+
 (changed?'changed_functions':'retained_functions')+") x(value) WHERE split_part(value->>'signature','(',1)=ANY("+array(names)+"))";
export const factExpressions={
 account_block_structure:"jsonb_build_object('table',block_structure,'sequence',sequence_structure)",
 account_block_policies:"block_authority->'policies'",
 provider_cas_authority:piece(functions.filter(n=>n.startsWith('provider_controls_private.')&&!newFunctions.includes(n)).concat(['public.get_my_provider_control_v1','public.list_my_provider_controls_v1'])),
 messaging_guards:piece(['messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block',
 'listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message',
 'public.send_my_message_v2','public.send_my_listing_message_v1']),
 entrypoint_authority:piece(['public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']),
 block_writer_inventory:"jsonb_build_object('writers',writer_inventory,'views',block_views)",
 capability:"jsonb_build_object('functions',changed_functions,'table_acl',block_authority-'policies','sequence_acl',sequence_acl,'effective',effective,'role',new_role,'new_privileges',new_privileges,'policies',new_policies,'trigger',new_trigger)",
 invariants:"jsonb_build_object('existing_functions',"+digest('retained_functions')+
 ",'existing_authority',"+digest("jsonb_build_object('authority',retained_authority,'block_policies',block_authority->'policies','writer_inventory',writer_inventory,'block_views',block_views)")+
 ",'immutable_structure',"+digest("jsonb_build_object('block',block_structure,'sequence',sequence_structure,'relations',retained_structures)")+")"
};
export function observe(){return observationSql()+"\nSELECT jsonb_build_object("+
 Object.entries(factExpressions).map(([k,v])=>quote(k)+','+(k==='invariants'?v:"jsonb_build_object('sha256',"+digest(v)+",'facts',"+v+")")).join(',')+
 ",'hosted_context',hosted,'installer',installer_ok,'actor_roles',actor_roles_ok) result FROM observed";}
export function report(pins){const checks=guardNames.map(name=>{
 if(name==='installer')return quote(name)+',coalesce(installer_ok,false)';
 if(name==='actor_roles')return quote(name)+',coalesce(actor_roles_ok,false)';
 if(name==='hosted_context_ready')return quote(name)+",coalesce(hosted="+quote(JSON.stringify([pins.hosted_context]))+"::jsonb AND (SELECT count(*)=1 FROM listing_publication_private.hosted_preview_settings),false)";
 return quote(name)+",coalesce("+digest(factExpressions[name])+'='+quote(pins.guards[name])+',false)';
});
 return observationSql()+", measured AS MATERIALIZED (SELECT "+factExpressions.invariants+" invariants,hosted,"+
 digest(factExpressions.capability)+" capability,jsonb_build_object("+checks.join(',')+") guards FROM observed),"+
 "\nassessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM measured)"+
 "\nSELECT jsonb_build_object('schema_version',1,'kind','block-removal-cas-v1',"+
 "'state',CASE WHEN dependencies_ok AND capability="+quote(pins.before)+" THEN 'absent' WHEN dependencies_ok AND capability="+quote(pins.after)+" THEN 'applied' ELSE 'unknown' END,"+
 "'recognized',dependencies_ok AND capability IN("+quote(pins.before)+','+quote(pins.after)+"),'ready_to_apply',dependencies_ok AND capability="+quote(pins.before)+","+
 "'dependencies_ok',dependencies_ok,'capability_absent',capability="+quote(pins.before)+",'capability_present',capability="+quote(pins.after)+","+
 "'fingerprints',jsonb_build_object('dependencies',"+digest("jsonb_build_object('guards',guards,'pins',"+quote(JSON.stringify(pins.guards))+"::jsonb)")+
 ",'capability',capability),'invariants',invariants,'hosted_context',hosted->0,'guards',guards) result FROM assessed";
}
export function compile(query,changes){
 const before="SELECT result INTO STRICT b FROM pg_temp.block_removal_before";
 const settings=["SET LOCAL search_path=pg_catalog,pg_temp;","SET LOCAL jit=off;","SET LOCAL lock_timeout='3s';"];
 const preflight=['BEGIN READ ONLY;',...settings,"SET LOCAL statement_timeout='20s';",query+';','COMMIT;',''].join('\n');
 const apply=['BEGIN;',...settings,"SET LOCAL statement_timeout='45s';",
 "SELECT pg_advisory_xact_lock(hashtextextended('selqiro:block-removal-cas:v1',0));",
 "LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;",
 'CREATE TEMP TABLE block_removal_before ON COMMIT DROP AS '+query+';',
 "DO $before$ DECLARE b jsonb; BEGIN "+before+";",
 " IF (b->>'recognized'='true' AND b->>'dependencies_ok'='true' AND b->>'state' IN('absent','applied')) IS NOT TRUE THEN",
 " RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END IF;",
 " EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END $before$;",
 "DO $apply$ DECLARE b jsonb; BEGIN "+before+"; IF b->>'state'='absent' THEN",
 " EXECUTE "+quote(changes)+"; END IF;",
 " EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END $apply$;",
 'CREATE TEMP TABLE block_removal_after ON COMMIT DROP AS '+query+';',
 "DO $after$ DECLARE b jsonb;a jsonb; BEGIN "+before+"; SELECT result INTO STRICT a FROM pg_temp.block_removal_after;",
 " IF (a->>'state'='applied' AND a->>'recognized'='true' AND a->>'dependencies_ok'='true'",
 " AND a->'invariants'=b->'invariants' AND a->'hosted_context'=b->'hosted_context'",
 " AND a->'fingerprints'->>'dependencies'=b->'fingerprints'->>'dependencies') IS NOT TRUE THEN",
 " RAISE EXCEPTION 'BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END IF;",
 " EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END $after$;",
 "NOTIFY pgrst,'reload schema';",'SELECT result FROM pg_temp.block_removal_after;','COMMIT;',''].join('\n');
 assert(query.length<60000,'bounded metadata reader');return {preflight,apply};
}
