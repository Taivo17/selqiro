BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro:block-removal-cas:v1',0));
LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE block_removal_before ON COMMIT DROP AS WITH function_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,
 jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,
 'parallel',p.proparallel,'result',pg_get_function_result(p.oid),'argument_names',p.proargnames,
 'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname||'.'||p.proname=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1','messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1','public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])
), relation_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||c.relname name,c.oid,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum),'[]')
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated)
 ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,
 'ready',i.indisready,'unique',i.indisunique,'primary',i.indisprimary) ORDER BY i.indexrelid::regclass::text),'[]') FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal
 AND t.tgname<>'user_blocks_cas_delete_v1'),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'parents',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhparent::regclass::text),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid))
 ORDER BY q.conrelid::regclass::text,q.conname),'[]') FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid)) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE true),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(a.attacl) x WHERE true)) ORDER BY a.attnum),'[]')
 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname<>ALL(ARRAY['block_removal_own_read_v1','block_removal_own_delete_v1']::text[]))) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.user_blocks','public.messages','public.conversations','public.conversation_participants','provider_controls_private.hidden_providers']::text[])
), sequence_facts AS MATERIALIZED (
 SELECT jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'type',format_type(s.seqtypid,NULL),
 'start',s.seqstart::text,'increment',s.seqincrement::text,'min',s.seqmin::text,'max',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle,
 'ownership',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',d.refobjid::regclass::text,'column',a.attname,'kind',d.deptype) ORDER BY d.refobjid::regclass::text,d.refobjsubid),'[]')
 FROM pg_depend d JOIN pg_attribute a ON a.attrelid=d.refobjid AND a.attnum=d.refobjsubid WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype IN('a','i'))) structure,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('s',c.relowner))) x WHERE true) acl
 FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid WHERE c.oid=to_regclass('public.user_blocks_id_seq')
), effective AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'kind',v.kind,'column',v.col,'privilege',v.priv,
 'allowed',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv)
 WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv)
 ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv) END,
 'grantable',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv||' WITH GRANT OPTION')
 WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv||' WITH GRANT OPTION')
 ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv||' WITH GRANT OPTION') END) ORDER BY r.rolname,v.kind,v.col,v.priv),'[]') value
 FROM pg_roles r CROSS JOIN (SELECT 'table'::text kind,''::text col,unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) priv
 UNION ALL SELECT 'sequence','',unnest(ARRAY['SELECT','USAGE','UPDATE'])
 UNION ALL SELECT 'column',a.col,v.priv FROM unnest(ARRAY['id','blocker_id','blocked_id','created_at']) a(col) CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) v(priv)) v
 WHERE r.rolname=ANY(ARRAY['anon','authenticated','service_role','selqiro_listing_contact_writer_v1','selqiro_block_removal_writer_v1']::text[])
), new_role AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,'inherit',r.rolinherit,'superuser',r.rolsuper,'createdb',r.rolcreatedb,
 'createrole',r.rolcreaterole,'replication',r.rolreplication,'bypassrls',r.rolbypassrls,'limit',r.rolconnlimit,
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),'member',pg_get_userbyid(m.member),
 'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid::regrole::text,m.member::regrole::text),'[]')
 FROM pg_auth_members m WHERE m.roleid=r.oid OR m.member=r.oid),
 'schema_rights',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
 'create',has_schema_privilege(r.oid,n.oid,'CREATE')) ORDER BY n.nspname) FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),
 'auth_uid_execute',has_function_privilege(r.oid,to_regprocedure('auth.uid()'),'EXECUTE')) ORDER BY r.rolname),'[]') value FROM pg_roles r WHERE r.rolname='selqiro_block_removal_writer_v1'
), writer_inventory AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'config',p.proconfig,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) ORDER BY p.oid::regprocedure::text),'[]') value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind IN('f','p') AND p.prosecdef AND n.nspname NOT LIKE 'pg_%'
 AND n.nspname||'.'||p.proname<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])
 AND ((p.prosrc ~* 'user_blocks' AND p.prosrc ~* '\m(insert|update|delete|truncate)\M')
 OR p.prosrc ~* '(set_my_provider_control_v1|set_my_thread_block_v2|messaging_private_v2[.]set_block|provider_controls_private[.]remove_account_block_v1)')
), views AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'options',c.reloptions,
 'definition',pg_get_viewdef(c.oid,true),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE true)) ORDER BY c.oid::regclass::text),'[]') value
 FROM pg_class c WHERE c.relkind IN('v','m') AND EXISTS(SELECT 1 FROM pg_rewrite rw JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE rw.ev_class=c.oid AND d.refclassid='pg_class'::regclass AND d.refobjid=to_regclass('public.user_blocks'))
), namespace_authority AS MATERIALIZED (
 SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE pg_get_userbyid(x.grantee)<>'selqiro_block_removal_writer_v1')) ORDER BY n.nspname) value
 FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private','messaging_private_v2','listing_contact_private')
), auth_function_acl AS MATERIALIZED (
 SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE pg_get_userbyid(x.grantee)<>'selqiro_block_removal_writer_v1') value FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()')
), new_privileges AS MATERIALIZED (
 SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE pg_get_userbyid(x.grantee)='selqiro_block_removal_writer_v1')) ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),
 'auth_uid_acl',(SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE pg_get_userbyid(x.grantee)='selqiro_block_removal_writer_v1') FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()'))) value
), observed AS MATERIALIZED (
 SELECT
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])) retained_functions,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])) changed_functions,
 (SELECT structure FROM relation_facts WHERE name='public.user_blocks') block_structure,
 (SELECT authority FROM relation_facts WHERE name='public.user_blocks') block_authority,
 (SELECT structure FROM sequence_facts) sequence_structure,(SELECT acl FROM sequence_facts) sequence_acl,
 (SELECT value FROM effective) effective,(SELECT value FROM new_role) new_role,(SELECT value FROM new_privileges) new_privileges,
 (SELECT value FROM writer_inventory) writer_inventory,(SELECT value FROM views) block_views,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=to_regclass('public.user_blocks') AND p.polname=ANY(ARRAY['block_removal_own_read_v1','block_removal_own_delete_v1']::text[])) new_policies,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.user_blocks') AND NOT t.tgisinternal AND t.tgname='user_blocks_cas_delete_v1') new_trigger,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'structure',structure) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks') retained_structures,
 jsonb_build_object('relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks'),
 'schemas',(SELECT value FROM namespace_authority),'auth_uid_acl',(SELECT value FROM auth_function_acl)) retained_authority,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'release_id',s.release_id,'instance_id',s.instance_id,'release_ready',s.release_ready,
 'storage_authority_version',s.storage_authority_version,'cleanup_mode','held') ORDER BY s.singleton),'[]') FROM listing_publication_private.hosted_preview_settings s WHERE s.singleton AND s.enabled) hosted,
 (current_user='postgres' AND current_setting('transaction_isolation')='read committed' AND EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname=current_user AND (r.rolsuper OR r.rolcreaterole))
 AND has_schema_privilege(current_user,'provider_controls_private','CREATE') AND has_schema_privilege(current_user,'messaging_private_v2','CREATE')) installer_ok,
 ((SELECT count(*)=3 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR (rolname<>'service_role' AND rolbypassrls)))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN('anon','authenticated'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'provider_controls_private','CREATE')
 OR has_schema_privilege(r.oid,'provider_controls_private','USAGE') OR has_schema_privilege(r.oid,'messaging_private_v2','CREATE') OR has_schema_privilege(r.oid,'messaging_private_v2','USAGE')))) actor_roles_ok
), measured AS MATERIALIZED (SELECT jsonb_build_object('existing_functions',encode(sha256(convert_to((retained_functions)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('authority',retained_authority,'block_policies',block_authority->'policies','writer_inventory',writer_inventory,'block_views',block_views))::text,'UTF8')),'hex'),'immutable_structure',encode(sha256(convert_to((jsonb_build_object('block',block_structure,'sequence',sequence_structure,'relations',retained_structures))::text,'UTF8')),'hex')) invariants,hosted,encode(sha256(convert_to((jsonb_build_object('functions',changed_functions,'table_acl',block_authority-'policies','sequence_acl',sequence_acl,'effective',effective,'role',new_role,'new_privileges',new_privileges,'policies',new_policies,'trigger',new_trigger))::text,'UTF8')),'hex') capability,jsonb_build_object('installer',coalesce(installer_ok,false),'hosted_context_ready',coalesce(hosted='[{"release_id":"listing-publication-hosted-preview-v1","instance_id":"2d088814-0900-448a-a9d1-7b05470cb1d2","project_ref":"vyjletlmwoiwxsnsunlm","cleanup_mode":"held","release_ready":true,"storage_authority_version":"source-part-rfc3986-v1"}]'::jsonb AND (SELECT count(*)=1 FROM listing_publication_private.hosted_preview_settings),false),'actor_roles',coalesce(actor_roles_ok,false),'account_block_structure',coalesce(encode(sha256(convert_to((jsonb_build_object('table',block_structure,'sequence',sequence_structure))::text,'UTF8')),'hex')='c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35',false),'account_block_policies',coalesce(encode(sha256(convert_to((block_authority->'policies')::text,'UTF8')),'hex')='2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43',false),'provider_cas_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1']::text[])))::text,'UTF8')),'hex')='2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918',false),'messaging_guards',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1']::text[])))::text,'UTF8')),'hex')='902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766',false),'entrypoint_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])))::text,'UTF8')),'hex')='3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47',false),'block_writer_inventory',coalesce(encode(sha256(convert_to((jsonb_build_object('writers',writer_inventory,'views',block_views))::text,'UTF8')),'hex')='96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590',false)) guards FROM observed),
assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM measured)
SELECT jsonb_build_object('schema_version',1,'kind','block-removal-cas-v1','state',CASE WHEN dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56' THEN 'absent' WHEN dependencies_ok AND capability='00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118' THEN 'applied' ELSE 'unknown' END,'recognized',dependencies_ok AND capability IN('db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118'),'ready_to_apply',dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','dependencies_ok',dependencies_ok,'capability_absent',capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','capability_present',capability='00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118','fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('guards',guards,'pins','{"account_block_structure":"c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35","account_block_policies":"2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43","provider_cas_authority":"2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918","messaging_guards":"902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766","entrypoint_authority":"3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47","block_writer_inventory":"96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590"}'::jsonb))::text,'UTF8')),'hex'),'capability',capability),'invariants',invariants,'hosted_context',hosted->0,'guards',guards) result FROM assessed;
DO $before$ DECLARE b jsonb; BEGIN SELECT result INTO STRICT b FROM pg_temp.block_removal_before;
 IF (b->>'recognized'='true' AND b->>'dependencies_ok'='true' AND b->>'state' IN('absent','applied')) IS NOT TRUE THEN
 RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END IF;
 EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END $before$;
DO $apply$ DECLARE b jsonb; BEGIN SELECT result INTO STRICT b FROM pg_temp.block_removal_before; IF b->>'state'='absent' THEN
 EXECUTE '-- COMPONENT 01_legacy_block_guard.sql
-- Keep the exact legacy create-only behavior. Removal requires the existing
-- public.set_my_provider_control_v1 blocked_account row-CAS contract.
CREATE OR REPLACE FUNCTION messaging_private_v2.set_block(p_user uuid,p_identity uuid,p_conversation bigint,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout=''2s'' AS $f$
DECLARE c public.conversations%ROWTYPE;peer_u uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_user,p_identity);
 c:=messaging_private_v2.require_thread(p_conversation,p_user,p_identity);
 IF p_blocked IS NULL THEN RAISE EXCEPTION ''message_input'' USING ERRCODE=''22023''; END IF;
 IF NOT p_blocked THEN
  RAISE EXCEPTION ''message_block_removal_version_required'' USING ERRCODE=''42501'';
 END IF;
 peer_u:=CASE WHEN c.buyer_id=p_user THEN c.seller_id ELSE c.buyer_id END;
 LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(p_user,peer_u) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
END $f$;

-- COMPONENT 02_browser_permissions.sql
-- A browser may create its own account pair, but cannot supply/rewrite a CAS
-- generation, reset its sequence, or remove rows outside the existing setter.
-- Explicit column revokes also cover grants that table-level REVOKE cannot undo.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
REVOKE INSERT(id,blocker_id,blocked_id,created_at),UPDATE(id,blocker_id,blocked_id,created_at)
 ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
GRANT INSERT(blocker_id,blocked_id) ON TABLE public.user_blocks TO authenticated;
REVOKE UPDATE ON SEQUENCE public.user_blocks_id_seq FROM PUBLIC,anon,authenticated;

-- COMPONENT 03_cas_delete_authority.sql
-- The table lock in apply.sql drains writers already holding a table lock.
-- Calls which reach DELETE later, including an already-running old definer,
-- must pass this invoker trigger under the narrowly authorized writer role.
CREATE ROLE selqiro_block_removal_writer_v1 NOLOGIN NOINHERIT NOSUPERUSER
 NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH INHERIT FALSE;
GRANT selqiro_block_removal_writer_v1 TO postgres WITH SET TRUE;
GRANT USAGE ON SCHEMA public,auth,provider_controls_private TO selqiro_block_removal_writer_v1;
GRANT EXECUTE ON FUNCTION auth.uid() TO selqiro_block_removal_writer_v1;
GRANT SELECT,DELETE ON TABLE public.user_blocks TO selqiro_block_removal_writer_v1;
CREATE POLICY block_removal_own_read_v1 ON public.user_blocks FOR SELECT
 TO selqiro_block_removal_writer_v1 USING (blocker_id=auth.uid());
CREATE POLICY block_removal_own_delete_v1 ON public.user_blocks FOR DELETE
 TO selqiro_block_removal_writer_v1 USING (blocker_id=auth.uid());

CREATE FUNCTION provider_controls_private.remove_account_block_v1(p_actor uuid,p_peer uuid,
 p_id bigint,p_created_at timestamptz) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout=''2s'' AS $f$
BEGIN
 IF p_actor IS NULL OR p_peer IS NULL OR p_actor=p_peer OR p_id IS NULL OR p_id<=0
 OR p_created_at IS NULL OR NOT isfinite(p_created_at) OR auth.uid() IS DISTINCT FROM p_actor THEN
  RAISE EXCEPTION ''provider_control_unavailable'' USING ERRCODE=''42501'';
 END IF;
 DELETE FROM public.user_blocks WHERE id=p_id AND blocker_id=p_actor
  AND blocked_id=p_peer AND created_at=p_created_at;
 IF NOT FOUND THEN RAISE EXCEPTION ''provider_control_conflict'' USING ERRCODE=''40001''; END IF;
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
-- These installation-only privileges are removed before the transaction commits.
GRANT CREATE ON SCHEMA provider_controls_private TO selqiro_block_removal_writer_v1;
ALTER FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz)
 OWNER TO selqiro_block_removal_writer_v1;
-- ALTER OWNER transfers owner ACL entries. Grant to the old owner only after
-- transfer, acting briefly as the new owner through installation-only SET.
SET LOCAL ROLE selqiro_block_removal_writer_v1;
GRANT EXECUTE ON FUNCTION provider_controls_private.remove_account_block_v1(uuid,uuid,bigint,timestamptz) TO postgres;
RESET ROLE;
REVOKE CREATE ON SCHEMA provider_controls_private FROM selqiro_block_removal_writer_v1;
REVOKE selqiro_block_removal_writer_v1 FROM postgres;

CREATE FUNCTION provider_controls_private.guard_account_block_delete_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_user=''selqiro_block_removal_writer_v1'' AND auth.uid() IS NOT NULL
 AND auth.uid()=OLD.blocker_id THEN RETURN OLD; END IF;
 -- Preserve trusted maintenance only with no JWT context at all. An anonymous
 -- or malformed JWT is not a maintenance session. No caller-set bypass flag.
 IF current_user IN(''postgres'',''service_role'') AND auth.uid() IS NULL
 AND nullif(current_setting(''request.jwt.claims'',true),'''') IS NULL
 AND nullif(current_setting(''request.jwt.claim.sub'',true),'''') IS NULL
 AND nullif(current_setting(''request.jwt.claim.role'',true),'''') IS NULL THEN RETURN OLD; END IF;
 RAISE EXCEPTION ''message_block_removal_version_required'' USING ERRCODE=''42501'';
END $f$;
REVOKE ALL ON FUNCTION provider_controls_private.guard_account_block_delete_v1()
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION provider_controls_private.guard_account_block_delete_v1()
 TO selqiro_block_removal_writer_v1;
CREATE TRIGGER user_blocks_cas_delete_v1 BEFORE DELETE ON public.user_blocks
 FOR EACH ROW EXECUTE FUNCTION provider_controls_private.guard_account_block_delete_v1();

-- COMPONENT 04_cas_setter.sql
-- Generated from the accepted provider-controls setter; only DELETE delegates.
CREATE OR REPLACE FUNCTION public.set_my_provider_control_v1(p_expected_user_id uuid,p_target_type text,p_target_id text,p_action text,
 p_expected_target_token text,p_expected_revision uuid DEFAULT NULL,p_next_revision uuid DEFAULT NULL,
 p_expected_block_id text DEFAULT NULL,p_expected_block_created_at timestamptz DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE actor uuid:=provider_controls_private.require_actor(p_expected_user_id);target jsonb;state jsonb;
 identity_value uuid;account_value uuid;h provider_controls_private.hidden_providers%ROWTYPE;b public.user_blocks%ROWTYPE;
 read_time timestamptz;changed boolean:=false;
BEGIN
 IF current_setting(''transaction_isolation'')<>''read committed'' THEN
  RAISE EXCEPTION ''provider_control_read_committed_required'' USING ERRCODE=''22023'';END IF;
 IF p_action IS NULL OR p_action NOT IN(''hide'',''unhide'',''block'',''unblock'') OR p_expected_target_token IS NULL
 OR p_expected_target_token!~''^[0-9a-f]{64}$'' OR (p_target_type=''hidden_provider'' AND p_action<>''unhide'')
 OR (p_target_type=''blocked_account'' AND p_action<>''unblock'') OR p_target_type=''conversation'' THEN
  RAISE EXCEPTION ''provider_control_action_invalid'' USING ERRCODE=''22023'';END IF;
 IF p_action IN(''hide'',''unhide'') THEN
  IF p_next_revision IS NULL OR p_next_revision=''00000000-0000-0000-0000-000000000000''::uuid
  OR p_next_revision=p_expected_revision OR p_expected_block_id IS NOT NULL OR p_expected_block_created_at IS NOT NULL THEN
   RAISE EXCEPTION ''provider_control_revision_invalid'' USING ERRCODE=''22023'';END IF;
 ELSE
  IF p_expected_revision IS NOT NULL OR p_next_revision IS NOT NULL
  OR ((p_expected_block_id IS NULL)<>(p_expected_block_created_at IS NULL))
  OR (p_expected_block_created_at IS NOT NULL AND NOT isfinite(p_expected_block_created_at)) THEN
   RAISE EXCEPTION ''provider_control_block_input_invalid'' USING ERRCODE=''22023'';END IF;
  IF p_expected_block_id IS NOT NULL THEN PERFORM provider_controls_private.validate_target(''blocked_account'',p_expected_block_id);END IF;
  IF p_action=''unblock'' AND p_expected_block_id IS NULL THEN
   RAISE EXCEPTION ''provider_control_block_input_invalid'' USING ERRCODE=''22023'';END IF;
 END IF;
 PERFORM provider_controls_private.lock_target(actor,p_target_type,p_target_id);
 -- A bounded table lock is the existing account-block serialization contract.
 IF p_action IN(''block'',''unblock'') THEN LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 ELSE LOCK TABLE public.user_blocks IN SHARE MODE;END IF;
 target:=provider_controls_private.resolve_target(actor,p_target_type,p_target_id);
 IF target IS NULL THEN RAISE EXCEPTION ''provider_control_unavailable'' USING ERRCODE=''42501'';END IF;
 IF target->>''target_token'' IS DISTINCT FROM p_expected_target_token THEN
  RAISE EXCEPTION ''provider_control_target_conflict'' USING ERRCODE=''40001'';END IF;
 identity_value:=(target->>''identity_id'')::uuid;account_value:=(target->>''account_id'')::uuid;
 IF p_action IN(''hide'',''unhide'') THEN
  IF identity_value IS NULL THEN RAISE EXCEPTION ''provider_control_unavailable'' USING ERRCODE=''42501'';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(''selqiro-provider-control:''||actor::text||'':''||identity_value::text,0));
  SELECT * INTO h FROM provider_controls_private.hidden_providers WHERE viewer_user_id=actor AND provider_identity_id=identity_value FOR UPDATE;
  read_time:=clock_timestamp();
  state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF p_action=''hide'' AND NOT (state->>''can_hide'')::boolean THEN
   RAISE EXCEPTION ''provider_control_unavailable'' USING ERRCODE=''42501'';END IF;
  -- Exact replay never restarts the clock. A new generation requires its own CAS.
  IF h.revision=p_next_revision AND ((p_action=''hide'' AND h.hidden_until IS NOT NULL) OR (p_action=''unhide'' AND h.hidden_until IS NULL)) THEN NULL;
  ELSE
   IF h.revision IS DISTINCT FROM p_expected_revision THEN RAISE EXCEPTION ''provider_control_conflict'' USING ERRCODE=''40001'';END IF;
   IF (p_action=''hide'' AND NOT coalesce(h.hidden_until>read_time,false)) OR (p_action=''unhide'' AND h.hidden_until IS NOT NULL) THEN
    INSERT INTO provider_controls_private.hidden_providers(viewer_user_id,provider_identity_id,revision,hidden_until)
    VALUES(actor,identity_value,p_next_revision,CASE WHEN p_action=''hide'' THEN read_time+interval ''24 hours'' END)
    ON CONFLICT(viewer_user_id,provider_identity_id) DO UPDATE SET revision=EXCLUDED.revision,hidden_until=EXCLUDED.hidden_until;
    changed:=true;
   END IF;
  END IF;
 ELSE
  read_time:=clock_timestamp();state:=provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time);
  IF NOT (state->>''can_block'')::boolean THEN RAISE EXCEPTION ''provider_control_unavailable'' USING ERRCODE=''42501'';END IF;
  SELECT * INTO b FROM public.user_blocks WHERE blocker_id=actor AND blocked_id=account_value;
  IF p_action=''block'' THEN
   IF b.id IS NULL AND p_expected_block_id IS NOT NULL THEN RAISE EXCEPTION ''provider_control_conflict'' USING ERRCODE=''40001'';END IF;
   IF b.id IS NOT NULL AND p_expected_block_id IS NOT NULL
   AND (b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at) THEN
    RAISE EXCEPTION ''provider_control_conflict'' USING ERRCODE=''40001'';END IF;
   IF b.id IS NULL THEN INSERT INTO public.user_blocks(blocker_id,blocked_id,created_at) VALUES(actor,account_value,read_time);changed:=true;END IF;
  ELSE
   IF b.id IS NULL OR b.id::text<>p_expected_block_id OR b.created_at IS DISTINCT FROM p_expected_block_created_at THEN
    RAISE EXCEPTION ''provider_control_conflict'' USING ERRCODE=''40001'';END IF;
   changed:=provider_controls_private.remove_account_block_v1(actor,account_value,b.id,p_expected_block_created_at);
  END IF;
 END IF;
 RETURN provider_controls_private.snapshot(actor,p_target_type,p_target_id,target,read_time)||jsonb_build_object(''action'',p_action,''changed'',changed);
END $f$;
REVOKE ALL ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.set_my_provider_control_v1(uuid,text,text,text,text,uuid,uuid,text,timestamptz) TO authenticated;
'; END IF;
 EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_STATE_NOT_RECOGNIZED' USING ERRCODE='55000'; END $apply$;
CREATE TEMP TABLE block_removal_after ON COMMIT DROP AS WITH function_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,
 jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,
 'parallel',p.proparallel,'result',pg_get_function_result(p.oid),'argument_names',p.proargnames,
 'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname||'.'||p.proname=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1','messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1','public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])
), relation_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||c.relname name,c.oid,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum),'[]')
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated)
 ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,
 'ready',i.indisready,'unique',i.indisunique,'primary',i.indisprimary) ORDER BY i.indexrelid::regclass::text),'[]') FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal
 AND t.tgname<>'user_blocks_cas_delete_v1'),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'parents',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhparent::regclass::text),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid))
 ORDER BY q.conrelid::regclass::text,q.conname),'[]') FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid)) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE true),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(a.attacl) x WHERE true)) ORDER BY a.attnum),'[]')
 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=c.oid AND p.polname<>ALL(ARRAY['block_removal_own_read_v1','block_removal_own_delete_v1']::text[]))) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY(ARRAY['public.user_blocks','public.messages','public.conversations','public.conversation_participants','provider_controls_private.hidden_providers']::text[])
), sequence_facts AS MATERIALIZED (
 SELECT jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'type',format_type(s.seqtypid,NULL),
 'start',s.seqstart::text,'increment',s.seqincrement::text,'min',s.seqmin::text,'max',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle,
 'ownership',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',d.refobjid::regclass::text,'column',a.attname,'kind',d.deptype) ORDER BY d.refobjid::regclass::text,d.refobjsubid),'[]')
 FROM pg_depend d JOIN pg_attribute a ON a.attrelid=d.refobjid AND a.attnum=d.refobjsubid WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype IN('a','i'))) structure,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('s',c.relowner))) x WHERE true) acl
 FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid WHERE c.oid=to_regclass('public.user_blocks_id_seq')
), effective AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'kind',v.kind,'column',v.col,'privilege',v.priv,
 'allowed',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv)
 WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv)
 ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv) END,
 'grantable',CASE v.kind WHEN 'table' THEN has_table_privilege(r.oid,to_regclass('public.user_blocks'),v.priv||' WITH GRANT OPTION')
 WHEN 'sequence' THEN has_sequence_privilege(r.oid,to_regclass('public.user_blocks_id_seq'),v.priv||' WITH GRANT OPTION')
 ELSE has_column_privilege(r.oid,to_regclass('public.user_blocks'),v.col,v.priv||' WITH GRANT OPTION') END) ORDER BY r.rolname,v.kind,v.col,v.priv),'[]') value
 FROM pg_roles r CROSS JOIN (SELECT 'table'::text kind,''::text col,unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES']) priv
 UNION ALL SELECT 'sequence','',unnest(ARRAY['SELECT','USAGE','UPDATE'])
 UNION ALL SELECT 'column',a.col,v.priv FROM unnest(ARRAY['id','blocker_id','blocked_id','created_at']) a(col) CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','REFERENCES']) v(priv)) v
 WHERE r.rolname=ANY(ARRAY['anon','authenticated','service_role','selqiro_listing_contact_writer_v1','selqiro_block_removal_writer_v1']::text[])
), new_role AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,'inherit',r.rolinherit,'superuser',r.rolsuper,'createdb',r.rolcreatedb,
 'createrole',r.rolcreaterole,'replication',r.rolreplication,'bypassrls',r.rolbypassrls,'limit',r.rolconnlimit,
 'memberships',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),'member',pg_get_userbyid(m.member),
 'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid::regrole::text,m.member::regrole::text),'[]')
 FROM pg_auth_members m WHERE m.roleid=r.oid OR m.member=r.oid),
 'schema_rights',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
 'create',has_schema_privilege(r.oid,n.oid,'CREATE')) ORDER BY n.nspname) FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),
 'auth_uid_execute',has_function_privilege(r.oid,to_regprocedure('auth.uid()'),'EXECUTE')) ORDER BY r.rolname),'[]') value FROM pg_roles r WHERE r.rolname='selqiro_block_removal_writer_v1'
), writer_inventory AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),
 'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'config',p.proconfig,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) ORDER BY p.oid::regprocedure::text),'[]') value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE p.prokind IN('f','p') AND p.prosecdef AND n.nspname NOT LIKE 'pg_%'
 AND n.nspname||'.'||p.proname<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])
 AND ((p.prosrc ~* 'user_blocks' AND p.prosrc ~* '\m(insert|update|delete|truncate)\M')
 OR p.prosrc ~* '(set_my_provider_control_v1|set_my_thread_block_v2|messaging_private_v2[.]set_block|provider_controls_private[.]remove_account_block_v1)')
), views AS MATERIALIZED (
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.oid::regclass::text,'owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'options',c.reloptions,
 'definition',pg_get_viewdef(c.oid,true),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x WHERE true)) ORDER BY c.oid::regclass::text),'[]') value
 FROM pg_class c WHERE c.relkind IN('v','m') AND EXISTS(SELECT 1 FROM pg_rewrite rw JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
 WHERE rw.ev_class=c.oid AND d.refclassid='pg_class'::regclass AND d.refobjid=to_regclass('public.user_blocks'))
), namespace_authority AS MATERIALIZED (
 SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE pg_get_userbyid(x.grantee)<>'selqiro_block_removal_writer_v1')) ORDER BY n.nspname) value
 FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private','messaging_private_v2','listing_contact_private')
), auth_function_acl AS MATERIALIZED (
 SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE pg_get_userbyid(x.grantee)<>'selqiro_block_removal_writer_v1') value FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()')
), new_privileges AS MATERIALIZED (
 SELECT jsonb_build_object('schemas',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',n.nspname,'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x WHERE pg_get_userbyid(x.grantee)='selqiro_block_removal_writer_v1')) ORDER BY n.nspname),'[]') FROM pg_namespace n WHERE n.nspname IN('public','auth','provider_controls_private')),
 'auth_uid_acl',(SELECT (SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE pg_get_userbyid(x.grantee)='selqiro_block_removal_writer_v1') FROM pg_proc p WHERE p.oid=to_regprocedure('auth.uid()'))) value
), observed AS MATERIALIZED (
 SELECT
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])) retained_functions,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1']::text[])) changed_functions,
 (SELECT structure FROM relation_facts WHERE name='public.user_blocks') block_structure,
 (SELECT authority FROM relation_facts WHERE name='public.user_blocks') block_authority,
 (SELECT structure FROM sequence_facts) sequence_structure,(SELECT acl FROM sequence_facts) sequence_acl,
 (SELECT value FROM effective) effective,(SELECT value FROM new_role) new_role,(SELECT value FROM new_privileges) new_privileges,
 (SELECT value FROM writer_inventory) writer_inventory,(SELECT value FROM views) block_views,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END ORDER BY CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END) FROM unnest(p.polroles) x),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=to_regclass('public.user_blocks') AND p.polname=ANY(ARRAY['block_removal_own_read_v1','block_removal_own_delete_v1']::text[])) new_policies,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid),'function',t.tgfoid::regprocedure::text) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.user_blocks') AND NOT t.tgisinternal AND t.tgname='user_blocks_cas_delete_v1') new_trigger,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'structure',structure) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks') retained_structures,
 jsonb_build_object('relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]') FROM relation_facts WHERE name<>'public.user_blocks'),
 'schemas',(SELECT value FROM namespace_authority),'auth_uid_acl',(SELECT value FROM auth_function_acl)) retained_authority,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('project_ref',s.project_ref,'release_id',s.release_id,'instance_id',s.instance_id,'release_ready',s.release_ready,
 'storage_authority_version',s.storage_authority_version,'cleanup_mode','held') ORDER BY s.singleton),'[]') FROM listing_publication_private.hosted_preview_settings s WHERE s.singleton AND s.enabled) hosted,
 (current_user='postgres' AND current_setting('transaction_isolation')='read committed' AND EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname=current_user AND (r.rolsuper OR r.rolcreaterole))
 AND has_schema_privilege(current_user,'provider_controls_private','CREATE') AND has_schema_privilege(current_user,'messaging_private_v2','CREATE')) installer_ok,
 ((SELECT count(*)=3 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR (rolname<>'service_role' AND rolbypassrls)))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN('anon','authenticated'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'provider_controls_private','CREATE')
 OR has_schema_privilege(r.oid,'provider_controls_private','USAGE') OR has_schema_privilege(r.oid,'messaging_private_v2','CREATE') OR has_schema_privilege(r.oid,'messaging_private_v2','USAGE')))) actor_roles_ok
), measured AS MATERIALIZED (SELECT jsonb_build_object('existing_functions',encode(sha256(convert_to((retained_functions)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('authority',retained_authority,'block_policies',block_authority->'policies','writer_inventory',writer_inventory,'block_views',block_views))::text,'UTF8')),'hex'),'immutable_structure',encode(sha256(convert_to((jsonb_build_object('block',block_structure,'sequence',sequence_structure,'relations',retained_structures))::text,'UTF8')),'hex')) invariants,hosted,encode(sha256(convert_to((jsonb_build_object('functions',changed_functions,'table_acl',block_authority-'policies','sequence_acl',sequence_acl,'effective',effective,'role',new_role,'new_privileges',new_privileges,'policies',new_policies,'trigger',new_trigger))::text,'UTF8')),'hex') capability,jsonb_build_object('installer',coalesce(installer_ok,false),'hosted_context_ready',coalesce(hosted='[{"release_id":"listing-publication-hosted-preview-v1","instance_id":"2d088814-0900-448a-a9d1-7b05470cb1d2","project_ref":"vyjletlmwoiwxsnsunlm","cleanup_mode":"held","release_ready":true,"storage_authority_version":"source-part-rfc3986-v1"}]'::jsonb AND (SELECT count(*)=1 FROM listing_publication_private.hosted_preview_settings),false),'actor_roles',coalesce(actor_roles_ok,false),'account_block_structure',coalesce(encode(sha256(convert_to((jsonb_build_object('table',block_structure,'sequence',sequence_structure))::text,'UTF8')),'hex')='c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35',false),'account_block_policies',coalesce(encode(sha256(convert_to((block_authority->'policies')::text,'UTF8')),'hex')='2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43',false),'provider_cas_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1']::text[])))::text,'UTF8')),'hex')='2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918',false),'messaging_guards',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1']::text[])))::text,'UTF8')),'hex')='902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766',false),'entrypoint_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])))::text,'UTF8')),'hex')='3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47',false),'block_writer_inventory',coalesce(encode(sha256(convert_to((jsonb_build_object('writers',writer_inventory,'views',block_views))::text,'UTF8')),'hex')='96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590',false)) guards FROM observed),
assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM measured)
SELECT jsonb_build_object('schema_version',1,'kind','block-removal-cas-v1','state',CASE WHEN dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56' THEN 'absent' WHEN dependencies_ok AND capability='00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118' THEN 'applied' ELSE 'unknown' END,'recognized',dependencies_ok AND capability IN('db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118'),'ready_to_apply',dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','dependencies_ok',dependencies_ok,'capability_absent',capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','capability_present',capability='00d71c2cce40cbf4f918876cb9d25a6a86e6bf7d97b02536be2fc489a9de6118','fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('guards',guards,'pins','{"account_block_structure":"c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35","account_block_policies":"2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43","provider_cas_authority":"2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918","messaging_guards":"902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766","entrypoint_authority":"3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47","block_writer_inventory":"96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590"}'::jsonb))::text,'UTF8')),'hex'),'capability',capability),'invariants',invariants,'hosted_context',hosted->0,'guards',guards) result FROM assessed;
DO $after$ DECLARE b jsonb;a jsonb; BEGIN SELECT result INTO STRICT b FROM pg_temp.block_removal_before; SELECT result INTO STRICT a FROM pg_temp.block_removal_after;
 IF (a->>'state'='applied' AND a->>'recognized'='true' AND a->>'dependencies_ok'='true'
 AND a->'invariants'=b->'invariants' AND a->'hosted_context'=b->'hosted_context'
 AND a->'fingerprints'->>'dependencies'=b->'fingerprints'->>'dependencies') IS NOT TRUE THEN
 RAISE EXCEPTION 'BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END IF;
 EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END $after$;
NOTIFY pgrst,'reload schema';
SELECT result FROM pg_temp.block_removal_after;
COMMIT;
