BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
SET LOCAL idle_in_transaction_session_timeout='10s';
SET LOCAL transaction_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro:jobs-public:v1',0));
CREATE TEMP TABLE jobs_before ON COMMIT DROP AS WITH foundation AS MATERIALIZED (WITH function_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,
 jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,
 'parallel',p.proparallel,'result',pg_get_function_result(p.oid),'argument_names',p.proargnames,
 'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname||'.'||p.proname=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1','provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1','messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1','public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])
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
 AND t.tgname<>'user_blocks_cas_delete_v1' AND NOT ((t.tgrelid='public.messages'::regclass AND t.tgname='job_message_context') OR (t.tgrelid='public.conversations'::regclass AND t.tgname='job_clear_on_listing'))),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'parents',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhparent::regclass::text),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid))
 ORDER BY q.conrelid::regclass::text,q.conname),'[]') FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid AND q.conrelid::regclass::text NOT IN('jobs_private.contact_receipts','jobs_private.thread_context','jobs_private.message_cards'))) structure,
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
 AND n.nspname||'.'||p.proname<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])
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
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])) retained_functions,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])) changed_functions,
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
 AND has_schema_privilege(current_user,'provider_controls_private','CREATE') AND has_schema_privilege(current_user,'messaging_private_v2','CREATE')
 AND has_schema_privilege(current_user,'auth','USAGE') AND has_function_privilege(current_user,to_regprocedure('auth.uid()'),'EXECUTE')) installer_ok,
 ((SELECT count(*)=3 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR (rolname<>'service_role' AND rolbypassrls)))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN('anon','authenticated'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'provider_controls_private','CREATE')
 OR has_schema_privilege(r.oid,'provider_controls_private','USAGE') OR has_schema_privilege(r.oid,'messaging_private_v2','CREATE') OR has_schema_privilege(r.oid,'messaging_private_v2','USAGE')))) actor_roles_ok
), measured AS MATERIALIZED (SELECT jsonb_build_object('existing_functions',encode(sha256(convert_to((retained_functions)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('authority',retained_authority,'block_policies',block_authority->'policies','writer_inventory',writer_inventory,'block_views',block_views))::text,'UTF8')),'hex'),'immutable_structure',encode(sha256(convert_to((jsonb_build_object('block',block_structure,'sequence',sequence_structure,'relations',retained_structures))::text,'UTF8')),'hex')) invariants,hosted,encode(sha256(convert_to((jsonb_build_object('functions',changed_functions,'table_acl',block_authority-'policies','sequence_acl',sequence_acl,'effective',effective,'role',new_role,'new_privileges',new_privileges,'policies',new_policies,'trigger',new_trigger))::text,'UTF8')),'hex') capability,jsonb_build_object('installer',coalesce(installer_ok,false),'hosted_context_ready',coalesce(hosted='[{"release_id":"listing-publication-hosted-preview-v1","instance_id":"2d088814-0900-448a-a9d1-7b05470cb1d2","project_ref":"vyjletlmwoiwxsnsunlm","cleanup_mode":"held","release_ready":true,"storage_authority_version":"source-part-rfc3986-v1"}]'::jsonb AND (SELECT count(*)=1 FROM listing_publication_private.hosted_preview_settings),false),'actor_roles',coalesce(actor_roles_ok,false),'account_block_structure',coalesce(encode(sha256(convert_to((jsonb_build_object('table',block_structure,'sequence',sequence_structure))::text,'UTF8')),'hex')='c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35',false),'account_block_policies',coalesce(encode(sha256(convert_to((block_authority->'policies')::text,'UTF8')),'hex')='2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43',false),'provider_cas_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1']::text[])))::text,'UTF8')),'hex')='2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918',false),'messaging_guards',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1']::text[])))::text,'UTF8')),'hex')='902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766',false),'entrypoint_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])))::text,'UTF8')),'hex')='3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47',false),'block_writer_inventory',coalesce(encode(sha256(convert_to((jsonb_build_object('writers',writer_inventory,'views',block_views))::text,'UTF8')),'hex')='96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590',false)) guards FROM observed),
assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM measured)
SELECT jsonb_build_object('schema_version',1,'kind','block-removal-cas-v1','state',CASE WHEN dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56' THEN 'absent' WHEN dependencies_ok AND capability='38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854' THEN 'applied' ELSE 'unknown' END,'recognized',dependencies_ok AND capability IN('db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854'),'ready_to_apply',dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','dependencies_ok',dependencies_ok,'capability_absent',capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','capability_present',capability='38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854','fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('guards',guards,'pins','{"account_block_structure":"c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35","account_block_policies":"2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43","provider_cas_authority":"2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918","messaging_guards":"902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766","entrypoint_authority":"3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47","block_writer_inventory":"96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590"}'::jsonb))::text,'UTF8')),'hex'),'capability',capability),'invariants',invariants,'hosted_context',hosted->0,'guards',guards) result FROM assessed),
 functions AS MATERIALIZED(SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
 'result',pg_get_function_result(p.oid),'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),
 'config',p.proconfig,'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='jobs_private' OR (n.nspname='public' AND p.proname=ANY(ARRAY['get_jobs_capabilities_v1','get_job_categories_v1','get_public_job_v1','search_public_jobs_v1','get_public_profile_jobs_v1','get_my_jobs_v1','get_my_job_v1','get_my_job_policies_v1','get_my_job_request_v1','save_my_job_v1','publish_my_job_v1','set_my_job_status_v1','renew_my_job_activity_v1','contact_my_job_provider_v1','get_my_marketplace_message_thread_v2']::text[])) OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])),
 relations AS MATERIALIZED(SELECT n.nspname||'.'||c.relname name,jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(a.attacl) x)) ORDER BY a.attnum),'[]'::jsonb)
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
 'validated',q.convalidated) ORDER BY q.conname),'[]'::jsonb) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
 'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT (t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND (n.nspname||'.'||c.relname)=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid)) facts FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname='public.jobs'
 OR n.nspname||'.'||c.relname=ANY(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[]))),
 policy_state AS MATERIALIZED(SELECT
 NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()) AND p.country_code IS NOT NULL)
 AND EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.policy_key='marketplace-general'
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()))
 AND (SELECT count(*) FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) BETWEEN 1 AND 20 ready,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.policy_version,'content_hash',p.content_hash,
 'country',p.country_code,'locale',p.locale,'requires_acceptance',p.requires_user_acceptance,'effective_from',p.effective_from,
 'effective_until',p.effective_until) ORDER BY p.id),'[]'::jsonb) FROM public.publication_policy_documents p
 WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types) AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) facts),
 observation AS MATERIALIZED(SELECT
 (SELECT result FROM foundation) foundation,(SELECT ready FROM policy_state) policy_ready,(SELECT facts FROM policy_state) policy_facts,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])) dependencies,
 (SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name=ANY(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[])) existing_relations,
 jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name<>ALL(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name<>ALL(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[])),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x))),'[]'::jsonb) FROM pg_namespace n WHERE n.nspname='jobs_private'),
 'added_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid),'function_owner',pg_get_userbyid(p.proowner)) ORDER BY t.tgrelid::regclass::text,t.tgname),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND t.tgrelid::regclass::text=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))) capability,
 jsonb_build_object('schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) FROM pg_namespace n WHERE n.nspname='auth'),
 'uid',(SELECT jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
 'result',pg_get_function_result(p.oid),'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),
 'config',p.proconfig,'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure('auth.uid()'))) auth_authority)
,measured AS MATERIALIZED(SELECT *,
 encode(sha256(convert_to((dependencies)::text,'UTF8')),'hex') dependency_hash,encode(sha256(convert_to((capability)::text,'UTF8')),'hex') capability_hash,
 jsonb_build_object('existing_functions',encode(sha256(convert_to((dependencies)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('foundation',foundation->'invariants'->'existing_authority','relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',value->'name','acl',value->'acl','policies',value->'policies','columns',value->'columns') ORDER BY value->>'name'),'[]'::jsonb) FROM jsonb_array_elements(existing_relations))))::text,'UTF8')),'hex'),
 'existing_structure',encode(sha256(convert_to((jsonb_build_object('foundation',foundation->'invariants'->'immutable_structure','relations',existing_relations))::text,'UTF8')),'hex'),'auth_authority',encode(sha256(convert_to((auth_authority)::text,'UTF8')),'hex')) invariants FROM observation),
 checked AS MATERIALIZED(SELECT *,jsonb_build_object(
 'installer',foundation->'guards'->'installer','hosted_context',foundation->'guards'->'hosted_context_ready',
 'block_removal_current',foundation->>'state'='applied' AND foundation->>'dependencies_ok'='true',
 'publication_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d','service_horse_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d',
 'policy_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d' AND policy_ready,'messaging_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d') guards FROM measured),
 assessed AS MATERIALIZED(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM checked)
 SELECT jsonb_build_object('schema_version',1,'kind','jobs-public-v1',
 'state',CASE WHEN dependencies_ok AND capability_hash='85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65' THEN 'absent'
 WHEN dependencies_ok AND capability_hash='ee2765b24aae2b51578f355de562cbd6af580bc7e2d8bc4bed43d2a3af7ad4cc' THEN 'applied' ELSE 'incompatible' END,
 'recognized',dependencies_ok AND capability_hash IN('85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65','ee2765b24aae2b51578f355de562cbd6af580bc7e2d8bc4bed43d2a3af7ad4cc'),
 'ready_to_apply',dependencies_ok AND capability_hash='85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65','dependencies_ok',dependencies_ok,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('functions',dependency_hash,'policy',policy_facts))::text,'UTF8')),'hex'),'capability',capability_hash),
 'invariants',invariants,'guards',guards,'hosted_context',foundation->'hosted_context',
 'rollout',jsonb_build_object('public_search',true,'validity','one_calendar_month_utc')) result FROM assessed;
DO $guard$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;
IF (b->>'recognized'='true' AND b->>'dependencies_ok'='true' AND b->>'state' IN('absent','applied')) IS NOT TRUE THEN
RAISE EXCEPTION 'JOBS_STATE_NOT_RECOGNIZED' USING ERRCODE='55000';END IF;END $guard$;
DO $install$ DECLARE b jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;IF b->>'state'='absent' THEN EXECUTE '-- Additive canonical job domain. No existing content rows or policies are rewritten.
CREATE SCHEMA jobs_private;
REVOKE ALL ON SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE jobs_private.categories (
 code text PRIMARY KEY CHECK(code ~ ''^[a-z_]{2,64}$''),
 label_et text NOT NULL,label_en text NOT NULL,sort_order integer NOT NULL UNIQUE
);
INSERT INTO jobs_private.categories VALUES
 (''administration'',''Haldus ja kontoritöö'',''Administration'',10),
 (''agriculture'',''Põllumajandus'',''Agriculture'',20),
 (''construction'',''Ehitus'',''Construction'',30),
 (''customer_service'',''Klienditeenindus'',''Customer service'',40),
 (''education'',''Haridus'',''Education'',50),
 (''engineering'',''Tehnika ja inseneeria'',''Engineering'',60),
 (''finance'',''Rahandus ja raamatupidamine'',''Finance'',70),
 (''healthcare'',''Tervishoid ja hoolekanne'',''Healthcare and care'',80),
 (''hospitality'',''Toitlustus ja majutus'',''Hospitality'',90),
 (''information_technology'',''Infotehnoloogia'',''Information technology'',100),
 (''logistics'',''Transport ja logistika'',''Transport and logistics'',110),
 (''manufacturing'',''Tootmine'',''Manufacturing'',120),
 (''sales_marketing'',''Müük ja turundus'',''Sales and marketing'',130),
 (''other'',''Muu töö'',''Other work'',140);
CREATE TABLE public.jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_id uuid NOT NULL REFERENCES public.identities(id) ON DELETE RESTRICT,
 created_by_user_id uuid NOT NULL,
 title text NOT NULL CHECK(char_length(title) BETWEEN 2 AND 140),
 description text NOT NULL CHECK(char_length(description) BETWEEN 1 AND 10000),
 category text NOT NULL REFERENCES jobs_private.categories(code) ON DELETE RESTRICT,
 country_code text CHECK(country_code ~ ''^[A-Z]{2}$''),
 city text CHECK(char_length(city) BETWEEN 1 AND 160),
 location_label text CHECK(char_length(location_label) BETWEEN 1 AND 300),
 workplace_type text NOT NULL CHECK(workplace_type IN(''on_site'',''remote'',''hybrid'')),
 employment_type text CHECK(employment_type IN(''permanent'',''fixed_term'',''contract'',''internship'',''other'')),
 working_time text CHECK(working_time IN(''full_time'',''part_time'',''flexible'',''other'')),
 salary_min numeric CHECK(salary_min>=0 AND salary_min<1000000000000000000),
 salary_max numeric CHECK(salary_max>=0 AND salary_max<1000000000000000000),
 salary_currency text,salary_period text CHECK(salary_period IN(''hour'',''day'',''week'',''month'',''year'')),
 status text NOT NULL DEFAULT ''draft'' CHECK(status IN(''draft'',''published'',''paused'',''closed'')),
 edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(created_at)),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp() CHECK(isfinite(updated_at)),
 published_at timestamptz CHECK(isfinite(published_at)),
 active_until timestamptz CHECK(isfinite(active_until)),
 last_confirmed_at timestamptz CHECK(isfinite(last_confirmed_at)),
 CHECK(salary_min IS NULL OR salary_max IS NULL OR salary_min<=salary_max),
 CHECK(((salary_min IS NOT NULL OR salary_max IS NOT NULL) AND salary_currency IS NOT NULL AND salary_period IS NOT NULL)
  OR (salary_min IS NULL AND salary_max IS NULL AND salary_currency IS NULL AND salary_period IS NULL)),
 CHECK((status=''draft'' AND published_at IS NULL AND active_until IS NULL AND last_confirmed_at IS NULL)
  OR (status<>''draft'' AND published_at IS NOT NULL AND active_until>published_at
   AND (last_confirmed_at IS NULL OR last_confirmed_at>=published_at)))
);
CREATE TABLE jobs_private.requests (
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN(''save'',''publish'',''status'',''renew'')),
 request jsonb NOT NULL CHECK(jsonb_typeof(request)=''object''),
 request_hash bytea NOT NULL CHECK(octet_length(request_hash)=32),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)=''object''),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key)
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jobs,jobs_private.categories,jobs_private.requests FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX jobs_owner_cursor_idx ON public.jobs(identity_id,created_at DESC,id DESC);
CREATE INDEX jobs_profile_cursor_idx ON public.jobs(identity_id,published_at DESC,id DESC) WHERE status=''published'';
CREATE INDEX jobs_public_cursor_idx ON public.jobs(published_at DESC,id DESC) WHERE status=''published'';
COMMENT ON TABLE public.jobs IS ''Canonical employer job. Closed browser table; explicit RPCs enforce business identity, revision, policy, calendar-month activity and viewer eligibility.'';

CREATE FUNCTION jobs_private.require_actor(p_user uuid,p_identity uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE i public.identities%ROWTYPE;
BEGIN
 PERFORM listing_publication_private.require_actor(p_user,p_identity);
 SELECT * INTO i FROM public.identities WHERE id=p_identity AND type=''business'' AND status=''active'' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_business_required'' USING ERRCODE=''42501'';END IF;
 PERFORM 1 FROM public.business_accounts WHERE id=i.business_account_id AND status=''active'' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_business_unavailable'' USING ERRCODE=''42501'';END IF;
 -- Shared actor already locks active membership; retain an explicit domain check.
 PERFORM 1 FROM public.business_members WHERE business_account_id=i.business_account_id
 AND user_id=p_user AND status=''active'' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_business_forbidden'' USING ERRCODE=''42501'';END IF;
END $f$;
CREATE FUNCTION jobs_private.require_key(p_key uuid) RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN IF p_key IS NULL OR p_key=''00000000-0000-0000-0000-000000000000''::uuid THEN
 RAISE EXCEPTION ''job_request_key_invalid'' USING ERRCODE=''22023'';END IF;END $f$;
CREATE FUNCTION jobs_private.require_revision(p_revision text) RETURNS bigint LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN
 IF p_revision IS NULL OR p_revision !~ ''^[1-9][0-9]{0,18}$'' OR p_revision::numeric>9223372036854775807 THEN
 RAISE EXCEPTION ''job_revision_invalid'' USING ERRCODE=''22023'';END IF;
 RETURN p_revision::bigint;
END $f$;
CREATE FUNCTION jobs_private.calendar_month_after(p_time timestamptz) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN
 IF p_time IS NULL OR NOT isfinite(p_time) THEN RAISE EXCEPTION ''job_time_invalid'' USING ERRCODE=''22023'';END IF;
 RETURN p_time+interval ''1 month'';
END $f$;
CREATE FUNCTION jobs_private.current_policies() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE result jsonb;t timestamptz;
BEGIN
 LOCK TABLE public.publication_policy_documents IN SHARE MODE;t:=clock_timestamp();
 -- Country-scoped rules require a separate reviewed country-policy contract.
 IF EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status=''active''
 AND ''job''=ANY(p.applies_to_content_types) AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t) AND p.country_code IS NOT NULL) THEN
 RAISE EXCEPTION ''job_policy_country_scope_unresolved'' USING ERRCODE=''55000'';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(''documentId'',p.id,''version'',p.policy_version,''contentHash'',p.content_hash,
 ''title'',p.title,''body'',p.body_text,''locale'',p.locale) ORDER BY p.id),''[]''::jsonb) INTO result
 FROM public.publication_policy_documents p WHERE p.status=''active'' AND p.locale=''et-EE'' AND p.country_code IS NULL
 AND ''job''=ANY(p.applies_to_content_types) AND p.requires_user_acceptance AND p.effective_from<=t
 AND (p.effective_until IS NULL OR p.effective_until>t);
 IF jsonb_array_length(result) NOT BETWEEN 1 AND 20 OR NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p
 WHERE p.policy_key=''marketplace-general'' AND p.id IN(SELECT (x->>''documentId'')::uuid FROM jsonb_array_elements(result) x)) THEN
 RAISE EXCEPTION ''job_policy_unavailable'' USING ERRCODE=''55000'';END IF;
 RETURN result;
END $f$;
CREATE FUNCTION jobs_private.accept_policies(p_user uuid,p_identity uuid,p_shown jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE documents jsonb;expected jsonb;shown jsonb;d public.publication_policy_documents%ROWTYPE;
BEGIN
 documents:=jobs_private.current_policies();
 IF p_shown IS NULL OR jsonb_typeof(p_shown)<>''array'' OR octet_length(p_shown::text)>16384 THEN
 RAISE EXCEPTION ''job_policy_consent_required'' USING ERRCODE=''22023'';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_shown) x WHERE jsonb_typeof(x)<>''object''
 OR x-''documentId''-''version''-''contentHash''-''accepted''<>''{}''::jsonb OR x->''accepted'' IS DISTINCT FROM ''true''::jsonb
 OR jsonb_typeof(x->''documentId'') IS DISTINCT FROM ''string'' OR jsonb_typeof(x->''version'') IS DISTINCT FROM ''string''
 OR jsonb_typeof(x->''contentHash'') IS DISTINCT FROM ''string'') THEN
 RAISE EXCEPTION ''job_policy_consent_required'' USING ERRCODE=''22023'';END IF;
 SELECT jsonb_agg(jsonb_build_object(''documentId'',x->''documentId'',''version'',x->''version'',''contentHash'',x->''contentHash'',''accepted'',true)
 ORDER BY x->>''documentId'') INTO expected FROM jsonb_array_elements(documents) x;
 SELECT jsonb_agg(x ORDER BY x->>''documentId'') INTO shown FROM jsonb_array_elements(p_shown) x;
 IF shown IS DISTINCT FROM expected THEN RAISE EXCEPTION ''job_policy_changed'' USING ERRCODE=''42501'';END IF;
 FOR d IN SELECT p.* FROM public.publication_policy_documents p WHERE p.id IN
 (SELECT (x->>''documentId'')::uuid FROM jsonb_array_elements(documents) x) FOR SHARE LOOP
  INSERT INTO public.user_publication_policy_acceptances(user_id,identity_id,policy_document_id,policy_key,policy_version,
  country_code,locale,content_hash,acceptance_source) VALUES(p_user,p_identity,d.id,d.policy_key,d.policy_version,
  d.country_code,d.locale,d.content_hash,''publication_gate'') ON CONFLICT(user_id,policy_document_id) DO NOTHING;
 END LOOP;
 IF jobs_private.current_policies() IS DISTINCT FROM documents THEN
 RAISE EXCEPTION ''job_policy_changed'' USING ERRCODE=''42501'';END IF;
END $f$;
CREATE FUNCTION jobs_private.cursor(p_cursor jsonb,p_time_key text) RETURNS jsonb LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE t timestamptz;u uuid;
BEGIN
 IF p_cursor IS NULL OR p_cursor=''null''::jsonb THEN RETURN NULL;END IF;
 IF p_time_key NOT IN(''created_at'',''published_at'') OR jsonb_typeof(p_cursor)<>''object''
 OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY[p_time_key,''id'']::text[]
 AND (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_cursor) key) IS DISTINCT FROM ARRAY[''id'',p_time_key]::text[]
 OR jsonb_typeof(p_cursor->p_time_key) IS DISTINCT FROM ''string'' OR length(p_cursor->>p_time_key)>40
 OR jsonb_typeof(p_cursor->''id'') IS DISTINCT FROM ''string''
 OR p_cursor->>''id'' !~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN
 RAISE EXCEPTION ''job_cursor_invalid'' USING ERRCODE=''22023'';END IF;
 BEGIN t:=(p_cursor->>p_time_key)::timestamptz;u:=(p_cursor->>''id'')::uuid;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow OR invalid_text_representation THEN
 RAISE EXCEPTION ''job_cursor_invalid'' USING ERRCODE=''22023'';END;
 IF NOT isfinite(t) THEN RAISE EXCEPTION ''job_cursor_invalid'' USING ERRCODE=''22023'';END IF;
 RETURN jsonb_build_object(p_time_key,t,''id'',u);
END $f$;

CREATE FUNCTION jobs_private.normalize_content(p_content jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE keys constant text[]:=ARRAY[''title'',''description'',''category'',''countryCode'',''city'',''locationLabel'',''workplaceType'',
 ''employmentType'',''workingTime'',''salaryMin'',''salaryMax'',''salaryCurrency'',''salaryPeriod''];
 k text;n jsonb:=''{}'';v text;low jsonb;high jsonb;
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>''object'' OR octet_length(p_content::text)>65536
 OR NOT(p_content ?& keys) OR p_content-keys<>''{}''::jsonb THEN
 RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
 FOREACH k IN ARRAY keys LOOP
  IF p_content->k IS DISTINCT FROM ''null''::jsonb AND jsonb_typeof(p_content->k) IS DISTINCT FROM ''string'' THEN
   RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
  v:=CASE WHEN k IN(''salaryMin'',''salaryMax'',''salaryCurrency'') THEN p_content->>k ELSE nullif(btrim(p_content->>k),'''') END;
  n:=n||jsonb_build_object(k,v);
 END LOOP;
 IF n->>''title'' IS NULL OR char_length(n->>''title'') NOT BETWEEN 2 AND 140 OR n->>''title'' ~ ''[[:cntrl:]]''
 OR n->>''description'' IS NULL OR char_length(n->>''description'') NOT BETWEEN 1 AND 10000
 OR NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=n->>''category'')
 OR (n->>''countryCode'' IS NOT NULL AND n->>''countryCode'' !~ ''^[A-Z]{2}$'')
 OR char_length(n->>''city'')>160 OR n->>''city'' ~ ''[[:cntrl:]]''
 OR char_length(n->>''locationLabel'')>300 OR n->>''locationLabel'' ~ ''[[:cntrl:]]''
 OR n->>''workplaceType'' IS NULL OR n->>''workplaceType'' NOT IN(''on_site'',''remote'',''hybrid'')
 OR (n->>''employmentType'' IS NOT NULL AND n->>''employmentType'' NOT IN(''permanent'',''fixed_term'',''contract'',''internship'',''other''))
 OR (n->>''workingTime'' IS NOT NULL AND n->>''workingTime'' NOT IN(''full_time'',''part_time'',''flexible'',''other'')) THEN
 RAISE EXCEPTION ''job_content_invalid'' USING ERRCODE=''22023'';END IF;
 IF n->>''salaryMin'' IS NULL AND n->>''salaryMax'' IS NULL THEN
  IF n->>''salaryCurrency'' IS NOT NULL OR n->>''salaryPeriod'' IS NOT NULL THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
 ELSE
  IF n->>''salaryCurrency'' IS NULL OR n->>''salaryPeriod'' IS NULL OR n->>''salaryPeriod'' NOT IN(''hour'',''day'',''week'',''month'',''year'') THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
  IF n->>''salaryMin'' IS NOT NULL THEN
   low:=public.normalize_listing_price_v1(jsonb_build_object(''kind'',''fixed'',''amount'',n->''salaryMin'',''currency'',n->''salaryCurrency''));
   n:=jsonb_set(n,''{salaryMin}'',low->''amount'');
  END IF;
  IF n->>''salaryMax'' IS NOT NULL THEN
   high:=public.normalize_listing_price_v1(jsonb_build_object(''kind'',''fixed'',''amount'',n->''salaryMax'',''currency'',n->''salaryCurrency''));
   n:=jsonb_set(n,''{salaryMax}'',high->''amount'');
  END IF;
  IF (n->>''salaryMin'')::numeric>(n->>''salaryMax'')::numeric THEN
   RAISE EXCEPTION ''job_salary_invalid'' USING ERRCODE=''22023'';END IF;
 END IF;
 RETURN n;
END $f$;
CREATE FUNCTION jobs_private.content(j public.jobs) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''title'',j.title,''description'',j.description,''category'',j.category,''countryCode'',j.country_code,
 ''city'',j.city,''locationLabel'',j.location_label,''workplaceType'',j.workplace_type,''employmentType'',j.employment_type,
 ''workingTime'',j.working_time,''salaryMin'',j.salary_min::text,''salaryMax'',j.salary_max::text,
 ''salaryCurrency'',j.salary_currency,''salaryPeriod'',j.salary_period);
$f$;
CREATE FUNCTION jobs_private.owner_fields(j public.jobs,p_user uuid) RETURNS jsonb LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''content_type'',''job'',''actor_user_id'',p_user,''identity_id'',j.identity_id,
 ''job_id'',j.id,''edit_revision'',j.edit_revision::text,''status'',j.status,''content'',jobs_private.content(j),
 ''created_at'',j.created_at,''updated_at'',j.updated_at,''published_at'',j.published_at,''active_until'',j.active_until,
 ''last_confirmed_at'',j.last_confirmed_at);
$f$;
CREATE FUNCTION jobs_private.is_public(j public.jobs) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT j.status=''published'' AND j.published_at IS NOT NULL AND j.active_until>statement_timestamp()
 AND EXISTS(SELECT 1 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id AND b.status=''active''
 JOIN public.identity_profiles ip ON ip.identity_id=i.id
 WHERE i.id=j.identity_id AND i.type=''business'' AND i.status=''active'' AND nullif(btrim(ip.slug),'''') IS NOT NULL);
$f$;
CREATE FUNCTION jobs_private.visible_to_viewer(p_identity uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT EXISTS(SELECT 1 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity AND NOT EXISTS(SELECT 1 FROM public.user_blocks block
 WHERE public.listing_actor_uid_hosted_v1() IS NOT NULL
 AND ((block.blocker_id=public.listing_actor_uid_hosted_v1() AND block.blocked_id=b.owner_user_id)
 OR (block.blocked_id=public.listing_actor_uid_hosted_v1() AND block.blocker_id=b.owner_user_id))));
$f$;
CREATE FUNCTION jobs_private.public_fields(j public.jobs) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''content_type'',''job'',''content_id'',j.id,''identity_id'',j.identity_id,
 ''content'',jobs_private.content(j),''status'',''published'',''created_at'',j.created_at,''updated_at'',j.updated_at,
 ''published_at'',j.published_at,''active_until'',j.active_until,
 ''employer'',jsonb_build_object(''name'',coalesce(nullif(ip.display_name,''''),b.name),''slug'',ip.slug,''logo_url'',ip.avatar_url))
 FROM public.identities i JOIN public.business_accounts b ON b.id=i.business_account_id
 JOIN public.identity_profiles ip ON ip.identity_id=i.id WHERE i.id=j.identity_id;
$f$;
CREATE FUNCTION jobs_private.search_document(p_title text,p_description text,p_category text,p_city text,p_country text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT to_tsvector(''pg_catalog.simple''::regconfig,coalesce(p_title,'''')||'' ''||coalesce(p_description,'''')||'' ''||
 coalesce(p_category,'''')||'' ''||coalesce(p_city,'''')||'' ''||coalesce(p_country,''''));
$f$;
CREATE INDEX jobs_public_keywords_idx ON public.jobs USING gin
 (jobs_private.search_document(title,description,category,city,country_code)) WHERE status=''published'';

CREATE FUNCTION public.get_jobs_capabilities_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''release'',''jobs-public-v1'',''public_search'',true,''public_profile'',true,
 ''public_detail'',true,''business_publication'',true,''validity'',''one_calendar_month_utc'',''request_receipts'',true);
$f$;
CREATE FUNCTION public.get_job_categories_v1() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jsonb_build_object(''schema_version'',1,''items'',jsonb_agg(jsonb_build_object(''code'',c.code,
 ''labels'',jsonb_build_object(''et'',c.label_et,''en'',c.label_en)) ORDER BY c.sort_order)) FROM jobs_private.categories c;
$f$;
CREATE FUNCTION public.get_public_job_v1(p_job_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jobs_private.public_fields(j) FROM public.jobs j WHERE j.id=p_job_id
 AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id);
$f$;
CREATE FUNCTION public.get_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE j public.jobs%ROWTYPE;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id AND identity_id=p_expected_identity_id;
 IF NOT FOUND THEN RAISE EXCEPTION ''job_unavailable'' USING ERRCODE=''42501'';END IF;
 RETURN jobs_private.owner_fields(j,p_expected_user_id);
END $f$;
CREATE FUNCTION public.get_my_job_policies_v1(p_expected_user_id uuid,p_expected_identity_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
 ''documents'',jobs_private.current_policies());
END $f$;
CREATE FUNCTION public.get_my_job_request_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE r jobs_private.requests%ROWTYPE;present boolean;
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 PERFORM jobs_private.require_key(p_request_key);
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 present:=FOUND;
 IF present AND r.identity_id IS DISTINCT FROM p_expected_identity_id THEN
 RAISE EXCEPTION ''job_request_identity_changed'' USING ERRCODE=''42501'';END IF;
 RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
 ''request_key'',p_request_key,''found'',present,''operation'',r.operation,''request'',r.request,''result'',r.result);
END $f$;
CREATE FUNCTION public.get_my_jobs_v1(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;read_time timestamptz:=statement_timestamp();
BEGIN
 PERFORM jobs_private.require_actor(p_expected_user_id,p_expected_identity_id);
 IF p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION ''job_page_invalid'' USING ERRCODE=''22023'';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''created_at'');
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=p_expected_identity_id
 AND (cursor_value IS NULL OR (j.created_at,j.id)<((cursor_value->>''created_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.created_at DESC,j.id DESC LIMIT p_result_limit+1), page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY created_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.owner_fields(p,p_expected_user_id) ORDER BY p.created_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''created_at'',created_at,''id'',id) FROM page ORDER BY created_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
 ''items'',items,''result_limit'',p_result_limit,''has_more'',more,''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,''read_at'',read_time);
END $f$;
CREATE FUNCTION public.get_public_profile_jobs_v1(p_seller_slug text,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE cursor_value jsonb;items jsonb;more boolean;next_value jsonb;identity_value uuid;identities uuid[];
BEGIN
 IF p_seller_slug IS NULL OR char_length(p_seller_slug) NOT BETWEEN 1 AND 160 OR p_seller_slug<>btrim(p_seller_slug)
 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50 THEN
 RAISE EXCEPTION ''job_profile_invalid'' USING ERRCODE=''22023'';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''published_at'');
 SELECT array_agg(identity_id) INTO identities FROM(SELECT ip.identity_id FROM public.identity_profiles ip
 JOIN public.identities i ON i.id=ip.identity_id AND i.type=''business'' AND i.status=''active''
 WHERE ip.slug=p_seller_slug LIMIT 2) known;
 IF cardinality(identities)=1 THEN identity_value:=identities[1];END IF;
 WITH candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j WHERE j.identity_id=identity_value
 AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>''published_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''published_at'',published_at,''id'',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''seller_slug'',p_seller_slug,''identity_id'',identity_value,
 ''items'',items,''result_limit'',p_result_limit,''has_more'',more,''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,
 ''read_at'',statement_timestamp());
END $f$;

CREATE FUNCTION public.search_public_jobs_v1(p_query text DEFAULT '''',p_category text DEFAULT NULL,
 p_country_code text DEFAULT NULL,p_city text DEFAULT NULL,p_workplace_type text DEFAULT NULL,
 p_employment_type text DEFAULT NULL,p_working_time text DEFAULT NULL,p_result_limit integer DEFAULT 24,p_cursor jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET plan_cache_mode=force_custom_plan AS $f$
DECLARE cursor_value jsonb;query_value text:=btrim(coalesce(p_query,''''));words tsquery;items jsonb;more boolean;next_value jsonb;
BEGIN
 IF length(query_value)>300 OR p_result_limit IS NULL OR p_result_limit NOT BETWEEN 1 AND 50
 OR (p_category IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jobs_private.categories WHERE code=p_category))
 OR (p_country_code IS NOT NULL AND p_country_code !~ ''^[A-Z]{2}$'') OR char_length(p_city)>160
 OR (p_workplace_type IS NOT NULL AND p_workplace_type NOT IN(''on_site'',''remote'',''hybrid''))
 OR (p_employment_type IS NOT NULL AND p_employment_type NOT IN(''permanent'',''fixed_term'',''contract'',''internship'',''other''))
 OR (p_working_time IS NOT NULL AND p_working_time NOT IN(''full_time'',''part_time'',''flexible'',''other'')) THEN
 RAISE EXCEPTION ''job_search_invalid'' USING ERRCODE=''22023'';END IF;
 cursor_value:=jobs_private.cursor(p_cursor,''published_at'');
 words:=plainto_tsquery(''pg_catalog.simple''::regconfig,query_value);
 WITH viewer_hidden AS MATERIALIZED(SELECT provider_identity_id FROM provider_controls_private.hidden_providers
 WHERE viewer_user_id=public.listing_actor_uid_hosted_v1() AND hidden_until>statement_timestamp()),
 candidates AS MATERIALIZED(SELECT j.* FROM public.jobs j
 WHERE j.status=''published'' AND jobs_private.is_public(j) AND jobs_private.visible_to_viewer(j.identity_id)
 AND NOT EXISTS(SELECT 1 FROM viewer_hidden h WHERE h.provider_identity_id=j.identity_id)
 AND (p_category IS NULL OR j.category=p_category) AND (p_country_code IS NULL OR j.country_code=p_country_code)
 AND (p_city IS NULL OR lower(j.city)=lower(btrim(p_city)))
 AND (p_workplace_type IS NULL OR j.workplace_type=p_workplace_type)
 AND (p_employment_type IS NULL OR j.employment_type=p_employment_type)
 AND (p_working_time IS NULL OR j.working_time=p_working_time)
 AND (query_value='''' OR jobs_private.search_document(j.title,j.description,j.category,j.city,j.country_code)@@words)
 AND (cursor_value IS NULL OR (j.published_at,j.id)<((cursor_value->>''published_at'')::timestamptz,(cursor_value->>''id'')::uuid))
 ORDER BY j.published_at DESC,j.id DESC LIMIT p_result_limit+1),page AS MATERIALIZED(
 SELECT * FROM candidates ORDER BY published_at DESC,id DESC LIMIT p_result_limit)
 SELECT (SELECT count(*)>p_result_limit FROM candidates),
 coalesce((SELECT jsonb_agg(jobs_private.public_fields(p) ORDER BY p.published_at DESC,p.id DESC) FROM page p),''[]''::jsonb),
 (SELECT jsonb_build_object(''published_at'',published_at,''id'',id) FROM page ORDER BY published_at,id LIMIT 1)
 INTO more,items,next_value;
 RETURN jsonb_build_object(''schema_version'',1,''items'',items,''result_limit'',p_result_limit,''has_more'',more,
 ''next_cursor'',CASE WHEN more THEN next_value ELSE NULL END,''read_at'',statement_timestamp());
END $f$;

-- The existing actor lock serializes commands and receipt reconciliation for
-- one real account. Receipt + job + policy acceptance commit atomically.
CREATE FUNCTION jobs_private.mutate(p_user uuid,p_identity uuid,p_key uuid,p_operation text,p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE j public.jobs%ROWTYPE;r jobs_private.requests%ROWTYPE;job_id uuid;revision bigint;normalized jsonb;
 fingerprint bytea;reply jsonb;changed boolean:=false;t timestamptz;target timestamptz;expected_deadline timestamptz;
BEGIN
 PERFORM jobs_private.require_actor(p_user,p_identity);PERFORM jobs_private.require_key(p_key);
 IF p_operation IS NULL OR p_operation NOT IN(''save'',''publish'',''status'',''renew'') OR p_request IS NULL
 OR jsonb_typeof(p_request)<>''object'' OR octet_length(p_request::text)>90000 THEN
 RAISE EXCEPTION ''job_command_invalid'' USING ERRCODE=''22023'';END IF;
 fingerprint:=sha256(convert_to(jsonb_build_object(''identity'',p_identity,''operation'',p_operation,''request'',p_request)::text,''UTF8''));
 SELECT * INTO r FROM jobs_private.requests WHERE actor_user_id=p_user AND request_key=p_key;
 IF FOUND THEN
  IF r.identity_id IS DISTINCT FROM p_identity OR r.operation IS DISTINCT FROM p_operation
  OR r.request_hash IS DISTINCT FROM fingerprint OR r.request IS DISTINCT FROM p_request THEN
   RAISE EXCEPTION ''job_request_conflict'' USING ERRCODE=''22023'';END IF;
  RETURN r.result;
 END IF;
 job_id:=(p_request->>''job_id'')::uuid;
 IF job_id IS NOT NULL THEN
  revision:=jobs_private.require_revision(p_request->>''expected_revision'');
  SELECT * INTO j FROM public.jobs WHERE id=job_id AND identity_id=p_identity FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_unavailable'' USING ERRCODE=''42501'';END IF;
  IF j.edit_revision<>revision THEN RAISE EXCEPTION ''job_edit_conflict'' USING ERRCODE=''40001'';END IF;
 ELSIF p_operation<>''save'' OR p_request->>''expected_revision'' IS NOT NULL THEN
  RAISE EXCEPTION ''job_command_invalid'' USING ERRCODE=''22023'';
 END IF;
 IF p_operation=''save'' THEN
  normalized:=jobs_private.normalize_content(p_request->''content'');
  IF job_id IS NULL OR j.status=''draft'' THEN
   IF p_request->''policy_snapshot'' IS DISTINCT FROM ''[]''::jsonb THEN
    RAISE EXCEPTION ''job_draft_policy_invalid'' USING ERRCODE=''22023'';END IF;
  ELSE PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->''policy_snapshot'');END IF;
  t:=clock_timestamp();
  IF job_id IS NULL THEN
   INSERT INTO public.jobs(identity_id,created_by_user_id,title,description,category,country_code,city,location_label,
   workplace_type,employment_type,working_time,salary_min,salary_max,salary_currency,salary_period,created_at,updated_at)
   VALUES(p_identity,p_user,normalized->>''title'',normalized->>''description'',normalized->>''category'',normalized->>''countryCode'',
   normalized->>''city'',normalized->>''locationLabel'',normalized->>''workplaceType'',normalized->>''employmentType'',normalized->>''workingTime'',
   (normalized->>''salaryMin'')::numeric,(normalized->>''salaryMax'')::numeric,normalized->>''salaryCurrency'',normalized->>''salaryPeriod'',t,t)
   RETURNING * INTO j;changed:=true;
  ELSIF jobs_private.content(j) IS DISTINCT FROM normalized THEN
   UPDATE public.jobs SET title=normalized->>''title'',description=normalized->>''description'',category=normalized->>''category'',
   country_code=normalized->>''countryCode'',city=normalized->>''city'',location_label=normalized->>''locationLabel'',
   workplace_type=normalized->>''workplaceType'',employment_type=normalized->>''employmentType'',working_time=normalized->>''workingTime'',
   salary_min=(normalized->>''salaryMin'')::numeric,salary_max=(normalized->>''salaryMax'')::numeric,
   salary_currency=normalized->>''salaryCurrency'',salary_period=normalized->>''salaryPeriod'',edit_revision=edit_revision+1,updated_at=t
   WHERE id=j.id RETURNING * INTO j;changed:=true;
  END IF;
 ELSIF p_operation=''publish'' THEN
  IF j.status<>''draft'' THEN RAISE EXCEPTION ''job_first_publication_required'' USING ERRCODE=''22023'';END IF;
  PERFORM 1 FROM public.identity_profiles WHERE identity_id=p_identity AND nullif(btrim(slug),'''') IS NOT NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_public_profile_required'' USING ERRCODE=''55000'';END IF;
  PERFORM jobs_private.accept_policies(p_user,p_identity,p_request->''policy_snapshot'');
  t:=clock_timestamp();
  UPDATE public.jobs SET status=''published'',published_at=t,active_until=jobs_private.calendar_month_after(t),
  updated_at=t,edit_revision=edit_revision+1 WHERE id=j.id RETURNING * INTO j;changed:=true;
 ELSIF p_operation=''status'' THEN
  IF j.status=''draft'' OR p_request->>''expected_status'' IS NULL OR p_request->>''expected_status'' NOT IN(''published'',''paused'',''closed'')
  OR p_request->>''status'' IS NULL OR p_request->>''status'' NOT IN(''published'',''paused'',''closed'') THEN
   RAISE EXCEPTION ''job_status_invalid'' USING ERRCODE=''22023'';END IF;
  IF j.status IS DISTINCT FROM p_request->>''expected_status'' THEN RAISE EXCEPTION ''job_status_conflict'' USING ERRCODE=''40001'';END IF;
  IF p_request->>''status''=''published'' AND j.active_until<=clock_timestamp() THEN
   RAISE EXCEPTION ''job_renewal_required'' USING ERRCODE=''22023'';END IF;
  changed:=j.status IS DISTINCT FROM p_request->>''status'';
  IF changed THEN UPDATE public.jobs SET status=p_request->>''status'',edit_revision=edit_revision+1,
   updated_at=clock_timestamp() WHERE id=j.id RETURNING * INTO j;END IF;
 ELSE
  expected_deadline:=(p_request->>''expected_active_until'')::timestamptz;
  IF j.status=''draft'' OR expected_deadline IS NULL OR NOT isfinite(expected_deadline) THEN
   RAISE EXCEPTION ''job_activity_invalid'' USING ERRCODE=''22023'';END IF;
  IF j.active_until IS DISTINCT FROM expected_deadline THEN RAISE EXCEPTION ''job_activity_conflict'' USING ERRCODE=''40001'';END IF;
  t:=clock_timestamp();target:=greatest(j.active_until,jobs_private.calendar_month_after(t));
  changed:=target>j.active_until;
  IF changed THEN UPDATE public.jobs SET active_until=target,last_confirmed_at=t,edit_revision=edit_revision+1
   WHERE id=j.id RETURNING * INTO j;END IF;
 END IF;
 reply:=jsonb_build_object(''schema_version'',1,''actor_user_id'',p_user,''identity_id'',p_identity,''request_key'',p_key,
 ''operation'',p_operation,''job'',jobs_private.owner_fields(j,p_user),''changed'',changed);
 INSERT INTO jobs_private.requests(actor_user_id,request_key,identity_id,operation,request,request_hash,result)
 VALUES(p_user,p_key,p_identity,p_operation,p_request,fingerprint,reply);
 RETURN reply;
END $f$;
CREATE FUNCTION public.save_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_content jsonb,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,''save'',
 jsonb_build_object(''job_id'',p_job_id,''expected_revision'',p_expected_revision,''content'',p_content,''policy_snapshot'',p_policy_snapshot));
$f$;
CREATE FUNCTION public.publish_my_job_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_policy_snapshot jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,''publish'',
 jsonb_build_object(''job_id'',p_job_id,''expected_revision'',p_expected_revision,''policy_snapshot'',p_policy_snapshot));
$f$;
CREATE FUNCTION public.set_my_job_status_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_status text,p_status text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,''status'',
 jsonb_build_object(''job_id'',p_job_id,''expected_revision'',p_expected_revision,''expected_status'',p_expected_status,''status'',p_status));
$f$;
CREATE FUNCTION public.renew_my_job_activity_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_job_id uuid,p_expected_revision text,p_expected_active_until timestamptz)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
 SELECT jobs_private.mutate(p_expected_user_id,p_expected_identity_id,p_request_key,''renew'',
 jsonb_build_object(''job_id'',p_job_id,''expected_revision'',p_expected_revision,''expected_active_until'',p_expected_active_until));
$f$;

CREATE TABLE jobs_private.contact_receipts(
 actor_user_id uuid NOT NULL,request_key uuid NOT NULL,identity_id uuid NOT NULL,
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 PRIMARY KEY(actor_user_id,request_key));
CREATE TABLE jobs_private.thread_context(
 conversation_id bigint PRIMARY KEY REFERENCES public.conversations(id) ON DELETE RESTRICT,
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,card jsonb NOT NULL);
CREATE TABLE jobs_private.message_cards(
 message_id bigint PRIMARY KEY REFERENCES public.messages(id) ON DELETE RESTRICT,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,card jsonb NOT NULL);
ALTER TABLE jobs_private.contact_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.thread_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs_private.message_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON jobs_private.contact_receipts,jobs_private.thread_context,jobs_private.message_cards FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA jobs_private TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT ON jobs_private.contact_receipts,jobs_private.message_cards TO selqiro_listing_contact_writer_v1;
GRANT SELECT,INSERT,UPDATE,DELETE ON jobs_private.thread_context TO selqiro_listing_contact_writer_v1;
CREATE POLICY job_contact_writer ON jobs_private.contact_receipts TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY job_contact_writer ON jobs_private.message_cards TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY job_contact_writer ON jobs_private.thread_context TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);

CREATE FUNCTION jobs_private.contact_snapshot(p_job_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
DECLARE j public.jobs%ROWTYPE;owner_user uuid;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=p_job_id FOR SHARE;
 IF NOT FOUND OR NOT jobs_private.is_public(j) THEN
 RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 SELECT b.owner_user_id INTO owner_user FROM public.identities i
 JOIN public.business_accounts b ON b.id=i.business_account_id AND b.status=''active''
 WHERE i.id=j.identity_id AND i.type=''business'' AND i.status=''active'' FOR SHARE OF i,b;
 IF owner_user IS NULL THEN RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
 RETURN jsonb_build_object(''user_id'',owner_user,''identity_id'',j.identity_id,
 ''card'',jsonb_build_object(''content_type'',''job'',''id'',j.id,''title'',j.title,''image'',NULL,''price'',NULL));
END $f$;
CREATE FUNCTION public.contact_my_job_provider_v1(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE old jobs_private.contact_receipts%ROWTYPE;s jsonb;card jsonb;owner_user uuid;owner_identity uuid;
 cid bigint;candidate bigint;first_u uuid;first_i uuid;second_u uuid;second_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);
 IF p_job_id IS NULL THEN RAISE EXCEPTION ''job_contact_input'' USING ERRCODE=''22023'';END IF;
 SELECT * INTO old FROM jobs_private.contact_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id<>p_expected_identity_id OR old.job_id<>p_job_id THEN
   RAISE EXCEPTION ''job_contact_request_conflict'' USING ERRCODE=''22023'';END IF;
  PERFORM listing_contact_private.require_member(old.conversation_id,p_expected_user_id,p_expected_identity_id);
  RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
  ''request_key'',p_request_key,''job_id'',p_job_id,''conversation_id'',old.conversation_id::text,''replayed'',true);
 END IF;
 s:=jobs_private.contact_snapshot(p_job_id);card:=s->''card'';
 owner_user:=(s->>''user_id'')::uuid;owner_identity:=(s->>''identity_id'')::uuid;
 IF owner_user=p_expected_user_id OR owner_identity=p_expected_identity_id THEN
 RAISE EXCEPTION ''job_contact_self'' USING ERRCODE=''42501'';END IF;
 PERFORM listing_contact_private.require_peer(owner_user,owner_identity);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,owner_user);
 IF p_expected_user_id<owner_user THEN first_u:=p_expected_user_id;first_i:=p_expected_identity_id;second_u:=owner_user;second_i:=owner_identity;
 ELSE first_u:=owner_user;first_i:=owner_identity;second_u:=p_expected_user_id;second_i:=p_expected_identity_id;END IF;
 candidate:=nextval(''public.conversations_id_seq'');
 INSERT INTO listing_contact_private.channels(conversation_id,first_user_id,first_identity_id,second_user_id,second_identity_id)
 VALUES(candidate,first_u,first_i,second_u,second_i) ON CONFLICT(first_user_id,first_identity_id,second_user_id,second_identity_id) DO NOTHING
 RETURNING conversation_id INTO cid;
 t:=clock_timestamp();
 IF cid IS NOT NULL THEN
  INSERT INTO public.conversations(id,listing_id,listing_title_snapshot,listing_image_snapshot,listing_price_snapshot,
  created_by,created_at,updated_at,buyer_id,seller_id,buyer_identity_id,seller_identity_id) OVERRIDING SYSTEM VALUE
  VALUES(cid,NULL,card->>''title'',NULL,NULL,p_expected_user_id,t,t,p_expected_user_id,owner_user,p_expected_identity_id,owner_identity);
  INSERT INTO public.conversation_participants(conversation_id,user_id,identity_id,last_read_at)
  VALUES(cid,p_expected_user_id,p_expected_identity_id,t),(cid,owner_user,owner_identity,NULL);
 ELSE
  SELECT conversation_id INTO cid FROM listing_contact_private.channels WHERE first_user_id=first_u AND first_identity_id=first_i
  AND second_user_id=second_u AND second_identity_id=second_i;
  PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION ''job_contact_unavailable'' USING ERRCODE=''42501'';END IF;
  PERFORM listing_contact_private.require_member(cid,p_expected_user_id,p_expected_identity_id);
  UPDATE public.conversations SET listing_id=NULL,listing_title_snapshot=card->>''title'',listing_image_snapshot=NULL,
  listing_price_snapshot=NULL,updated_at=t,archived_at=NULL WHERE id=cid;
  UPDATE public.conversation_participants SET deleted_at=NULL
  WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 END IF;
 INSERT INTO jobs_private.thread_context(conversation_id,job_id,card) VALUES(cid,p_job_id,card)
 ON CONFLICT(conversation_id) DO UPDATE SET job_id=excluded.job_id,card=excluded.card;
 INSERT INTO jobs_private.contact_receipts(actor_user_id,request_key,identity_id,job_id,conversation_id)
 VALUES(p_expected_user_id,p_request_key,p_expected_identity_id,p_job_id,cid);
 RETURN jsonb_build_object(''schema_version'',1,''actor_user_id'',p_expected_user_id,''identity_id'',p_expected_identity_id,
 ''request_key'',p_request_key,''job_id'',p_job_id,''conversation_id'',cid::text,''replayed'',false);
END $f$;

-- Add a context pointer without changing any old contact or reader body.
-- Only current pointers are replaced; immutable historical cards remain.
CREATE FUNCTION jobs_private.select_context() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN
 IF current_user<>''selqiro_listing_contact_writer_v1'' THEN
 RAISE EXCEPTION ''job_contact_writer_required'' USING ERRCODE=''42501'';END IF;
 IF TG_TABLE_SCHEMA=''jobs_private'' THEN
  DELETE FROM horse_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
  DELETE FROM service_publication_private.thread_context WHERE conversation_id=NEW.conversation_id;
 ELSE DELETE FROM jobs_private.thread_context WHERE conversation_id=NEW.conversation_id;END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_select_context AFTER INSERT OR UPDATE ON jobs_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
CREATE TRIGGER job_clear_context AFTER INSERT OR UPDATE ON service_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
CREATE TRIGGER job_clear_context AFTER INSERT OR UPDATE ON horse_publication_private.thread_context
 FOR EACH ROW EXECUTE FUNCTION jobs_private.select_context();
-- Selecting an ordinary listing supersedes the current job subject. Its
-- later ON DELETE SET NULL must not revive a historical job pointer. Existing
-- conversation authority still decides whether the row may be changed.
CREATE FUNCTION jobs_private.clear_on_listing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN
 DELETE FROM jobs_private.thread_context WHERE conversation_id=NEW.id;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_clear_on_listing AFTER INSERT OR UPDATE OF listing_id ON public.conversations
 FOR EACH ROW WHEN(NEW.listing_id IS NOT NULL) EXECUTE FUNCTION jobs_private.clear_on_listing();
CREATE FUNCTION jobs_private.capture_message_card() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' AS $f$
BEGIN
 IF current_user=''selqiro_listing_contact_writer_v1'' AND NEW.listing_id IS NULL THEN
  INSERT INTO jobs_private.message_cards(message_id,conversation_id,job_id,card)
  SELECT NEW.id,NEW.conversation_id,j.job_id,j.card FROM jobs_private.thread_context j
  JOIN public.conversations c ON c.id=j.conversation_id AND c.listing_id IS NULL
  WHERE j.conversation_id=NEW.conversation_id;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER job_message_context AFTER INSERT ON public.messages
 FOR EACH ROW EXECUTE FUNCTION jobs_private.capture_message_card();
CREATE FUNCTION public.get_my_marketplace_message_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET timezone=''UTC'' SET lock_timeout=''2s'' AS $f$
DECLARE r jsonb;context jsonb;items jsonb;cid bigint;
BEGIN
 r:=public.get_my_marketplace_message_thread_v1(p_expected_user_id,p_expected_identity_id,p_conversation_id,p_before_message_id,p_attachment_listing_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF r->''listing''=''null''::jsonb THEN
  SELECT jsonb_build_object(''id'',j.job_id,''title'',j.card->>''title'',''content_type'',''job'') INTO context
  FROM jobs_private.thread_context j JOIN public.conversations c ON c.id=j.conversation_id AND c.listing_id IS NULL
  WHERE j.conversation_id=cid;
  IF context IS NOT NULL THEN r:=jsonb_set(r,''{listing}'',context);END IF;
 END IF;
 SELECT coalesce(jsonb_agg(CASE WHEN m.item->''listing''=''null''::jsonb AND j.card IS NOT NULL
 THEN jsonb_set(m.item,''{listing}'',j.card) ELSE m.item END ORDER BY m.ordinal),''[]''::jsonb) INTO items
 FROM jsonb_array_elements(r->''messages'') WITH ORDINALITY m(item,ordinal)
 LEFT JOIN jobs_private.message_cards j ON j.message_id=(m.item->>''id'')::bigint AND j.conversation_id=cid;
 RETURN jsonb_set(r,''{messages}'',items);
END $f$;

-- New schema only; do not change Auth, roles, old function grants or defaults.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA jobs_private FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION jobs_private.contact_snapshot(uuid),jobs_private.select_context(),jobs_private.capture_message_card()
 TO selqiro_listing_contact_writer_v1;
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.get_jobs_capabilities_v1(),public.get_job_categories_v1(),public.get_public_job_v1(uuid),
 public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb),public.get_public_profile_jobs_v1(text,integer,jsonb),
 public.get_my_jobs_v1(uuid,uuid,integer,jsonb),public.get_my_job_v1(uuid,uuid,uuid),public.get_my_job_policies_v1(uuid,uuid),
 public.get_my_job_request_v1(uuid,uuid,uuid),public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb),
 public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb),public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text),
 public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamptz),public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid),
 public.get_my_marketplace_message_thread_v2(uuid,uuid,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_jobs_capabilities_v1(),public.get_job_categories_v1(),public.get_public_job_v1(uuid),
 public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb),public.get_public_profile_jobs_v1(text,integer,jsonb)
 TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_jobs_v1(uuid,uuid,integer,jsonb),public.get_my_job_v1(uuid,uuid,uuid),
 public.get_my_job_policies_v1(uuid,uuid),public.get_my_job_request_v1(uuid,uuid,uuid),
 public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb),public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb),
 public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text),public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamptz),
 public.contact_my_job_provider_v1(uuid,uuid,uuid,uuid),public.get_my_marketplace_message_thread_v2(uuid,uuid,text,text,text)
 TO authenticated;
';END IF;END $install$;
CREATE TEMP TABLE jobs_after ON COMMIT DROP AS WITH foundation AS MATERIALIZED (WITH function_facts AS MATERIALIZED (
 SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,
 jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,
 'parallel',p.proparallel,'result',pg_get_function_result(p.oid),'argument_names',p.proargnames,
 'defaults',pg_get_expr(p.proargdefaults,0),'config',p.proconfig,'body_sha256',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,x.privilege_type,pg_get_userbyid(x.grantor)),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x WHERE true)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname||'.'||p.proname=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1','provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1','messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1','public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])
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
 AND t.tgname<>'user_blocks_cas_delete_v1' AND NOT ((t.tgrelid='public.messages'::regclass AND t.tgname='job_message_context') OR (t.tgrelid='public.conversations'::regclass AND t.tgname='job_clear_on_listing'))),
 'rules',(SELECT coalesce(jsonb_agg(pg_get_ruledef(r.oid) ORDER BY r.rulename),'[]') FROM pg_rewrite r WHERE r.ev_class=c.oid),
 'parents',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhparent::regclass::text),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'incoming',(SELECT coalesce(jsonb_agg(jsonb_build_object('source',q.conrelid::regclass::text,'name',q.conname,'definition',pg_get_constraintdef(q.oid))
 ORDER BY q.conrelid::regclass::text,q.conname),'[]') FROM pg_constraint q WHERE q.contype='f' AND q.confrelid=c.oid AND q.conrelid::regclass::text NOT IN('jobs_private.contact_receipts','jobs_private.thread_context','jobs_private.message_cards'))) structure,
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
 AND n.nspname||'.'||p.proname<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])
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
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name<>ALL(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])) retained_functions,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['messaging_private_v2.set_block','public.set_my_provider_control_v1','provider_controls_private.remove_account_block_v1','provider_controls_private.guard_account_block_delete_v1','provider_controls_private.current_block_actor_v1']::text[])) changed_functions,
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
 AND has_schema_privilege(current_user,'provider_controls_private','CREATE') AND has_schema_privilege(current_user,'messaging_private_v2','CREATE')
 AND has_schema_privilege(current_user,'auth','USAGE') AND has_function_privilege(current_user,to_regprocedure('auth.uid()'),'EXECUTE')) installer_ok,
 ((SELECT count(*)=3 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole OR rolcreatedb OR rolreplication OR (rolname<>'service_role' AND rolbypassrls)))
 AND NOT EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN('anon','authenticated'))
 AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,'provider_controls_private','CREATE')
 OR has_schema_privilege(r.oid,'provider_controls_private','USAGE') OR has_schema_privilege(r.oid,'messaging_private_v2','CREATE') OR has_schema_privilege(r.oid,'messaging_private_v2','USAGE')))) actor_roles_ok
), measured AS MATERIALIZED (SELECT jsonb_build_object('existing_functions',encode(sha256(convert_to((retained_functions)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('authority',retained_authority,'block_policies',block_authority->'policies','writer_inventory',writer_inventory,'block_views',block_views))::text,'UTF8')),'hex'),'immutable_structure',encode(sha256(convert_to((jsonb_build_object('block',block_structure,'sequence',sequence_structure,'relations',retained_structures))::text,'UTF8')),'hex')) invariants,hosted,encode(sha256(convert_to((jsonb_build_object('functions',changed_functions,'table_acl',block_authority-'policies','sequence_acl',sequence_acl,'effective',effective,'role',new_role,'new_privileges',new_privileges,'policies',new_policies,'trigger',new_trigger))::text,'UTF8')),'hex') capability,jsonb_build_object('installer',coalesce(installer_ok,false),'hosted_context_ready',coalesce(hosted='[{"release_id":"listing-publication-hosted-preview-v1","instance_id":"2d088814-0900-448a-a9d1-7b05470cb1d2","project_ref":"vyjletlmwoiwxsnsunlm","cleanup_mode":"held","release_ready":true,"storage_authority_version":"source-part-rfc3986-v1"}]'::jsonb AND (SELECT count(*)=1 FROM listing_publication_private.hosted_preview_settings),false),'actor_roles',coalesce(actor_roles_ok,false),'account_block_structure',coalesce(encode(sha256(convert_to((jsonb_build_object('table',block_structure,'sequence',sequence_structure))::text,'UTF8')),'hex')='c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35',false),'account_block_policies',coalesce(encode(sha256(convert_to((block_authority->'policies')::text,'UTF8')),'hex')='2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43',false),'provider_cas_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['provider_controls_private.require_actor','provider_controls_private.validate_target','provider_controls_private.is_own_provider','provider_controls_private.resolve_target','provider_controls_private.lock_target','provider_controls_private.snapshot','public.get_my_provider_control_v1','public.list_my_provider_controls_v1']::text[])))::text,'UTF8')),'hex')='2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918',false),'messaging_guards',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['messaging_private_v2.exact_thread','messaging_private_v2.require_thread','messaging_private_v2.guard_account_block','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_peer','listing_contact_private.require_unblocked','listing_contact_private.guard_message','public.send_my_message_v2','public.send_my_listing_message_v1']::text[])))::text,'UTF8')),'hex')='902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766',false),'entrypoint_authority',coalesce(encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature'),'[]') FROM jsonb_array_elements(retained_functions) x(value) WHERE split_part(value->>'signature','(',1)=ANY(ARRAY['public.set_my_thread_block_v2','public.block_store_identity_owner','public.restore_conversation_for_participants']::text[])))::text,'UTF8')),'hex')='3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47',false),'block_writer_inventory',coalesce(encode(sha256(convert_to((jsonb_build_object('writers',writer_inventory,'views',block_views))::text,'UTF8')),'hex')='96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590',false)) guards FROM observed),
assessed AS MATERIALIZED (SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM measured)
SELECT jsonb_build_object('schema_version',1,'kind','block-removal-cas-v1','state',CASE WHEN dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56' THEN 'absent' WHEN dependencies_ok AND capability='38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854' THEN 'applied' ELSE 'unknown' END,'recognized',dependencies_ok AND capability IN('db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854'),'ready_to_apply',dependencies_ok AND capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','dependencies_ok',dependencies_ok,'capability_absent',capability='db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56','capability_present',capability='38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854','fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('guards',guards,'pins','{"account_block_structure":"c0ee4dad990aff94373a18b505f6b33a6f284361b571f19f2a704c2344b49a35","account_block_policies":"2be4f71ef40cb8d289a7905df80330da9e158e6a4534c4db66d9d4c24627ca43","provider_cas_authority":"2f034e5f727dd2ce33ed4e87dec4b5cdbaa06e763ccf16588e4bbbd1b15aa918","messaging_guards":"902185951bece19a25534da8b2eeb7a06c14ead8091baa116521954094a46766","entrypoint_authority":"3ba06e3567651bbd395bb048ee58b94662c1f02a840deeda451f510437ff1b47","block_writer_inventory":"96b905abf14a60f32b340ac84b6b123168b517360f6f77d601ed44d41e56b590"}'::jsonb))::text,'UTF8')),'hex'),'capability',capability),'invariants',invariants,'hosted_context',hosted->0,'guards',guards) result FROM assessed),
 functions AS MATERIALIZED(SELECT n.nspname||'.'||p.proname name,p.oid::regprocedure::text signature,jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
 'result',pg_get_function_result(p.oid),'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),
 'config',p.proconfig,'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) facts
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname='jobs_private' OR (n.nspname='public' AND p.proname=ANY(ARRAY['get_jobs_capabilities_v1','get_job_categories_v1','get_public_job_v1','search_public_jobs_v1','get_public_profile_jobs_v1','get_my_jobs_v1','get_my_job_v1','get_my_job_policies_v1','get_my_job_request_v1','save_my_job_v1','publish_my_job_v1','set_my_job_status_v1','renew_my_job_activity_v1','contact_my_job_provider_v1','get_my_marketplace_message_thread_v2']::text[])) OR n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])),
 relations AS MATERIALIZED(SELECT n.nspname||'.'||c.relname name,jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'forced',c.relforcerowsecurity,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'notnull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(a.attacl) x)) ORDER BY a.attnum),'[]'::jsonb)
 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
 'validated',q.convalidated) ORDER BY q.conname),'[]'::jsonb) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',i.indexrelid::regclass::text,'definition',pg_get_indexdef(i.indexrelid),
 'valid',i.indisvalid,'ready',i.indisready,'unique',i.indisunique) ORDER BY i.indexrelid::regclass::text),'[]'::jsonb) FROM pg_index i WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT (t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND (n.nspname||'.'||c.relname)=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid)) facts FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='jobs_private' OR n.nspname||'.'||c.relname='public.jobs'
 OR n.nspname||'.'||c.relname=ANY(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[]))),
 policy_state AS MATERIALIZED(SELECT
 NOT EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()) AND p.country_code IS NOT NULL)
 AND EXISTS(SELECT 1 FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.policy_key='marketplace-general'
 AND p.effective_from<=statement_timestamp() AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp()))
 AND (SELECT count(*) FROM public.publication_policy_documents p WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types)
 AND p.country_code IS NULL AND p.locale='et-EE' AND p.requires_user_acceptance AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) BETWEEN 1 AND 20 ready,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'version',p.policy_version,'content_hash',p.content_hash,
 'country',p.country_code,'locale',p.locale,'requires_acceptance',p.requires_user_acceptance,'effective_from',p.effective_from,
 'effective_until',p.effective_until) ORDER BY p.id),'[]'::jsonb) FROM public.publication_policy_documents p
 WHERE p.status='active' AND 'job'=ANY(p.applies_to_content_types) AND p.effective_from<=statement_timestamp()
 AND (p.effective_until IS NULL OR p.effective_until>statement_timestamp())) facts),
 observation AS MATERIALIZED(SELECT
 (SELECT result FROM foundation) foundation,(SELECT ready FROM policy_state) policy_ready,(SELECT facts FROM policy_state) policy_facts,
 (SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name=ANY(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])) dependencies,
 (SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name=ANY(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[])) existing_relations,
 jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature),'[]'::jsonb) FROM functions WHERE name<>ALL(ARRAY['listing_publication_private.require_actor','public.listing_actor_uid_hosted_v1','public.lock_listing_creation_actor_v1','public.current_user_has_identity_access','public.normalize_listing_price_v1','public.listing_price_currency_scale_v1','listing_publication_private.assert_hosted_preview_actor','listing_publication_private.require_policies','service_publication_private.current_policies','service_publication_private.require_policies','service_publication_private.is_public','public.get_public_service_v1','public.search_public_services_v1','public.get_public_profile_services_v1','public.publish_my_service_v1','public.renew_my_service_activity_v1','public.set_my_service_activity_v1','public.contact_my_service_provider_v1','public.contact_my_horse_seller_v1','public.get_my_marketplace_message_thread_v1','listing_contact_private.require_actor_hosted_v1','listing_contact_private.require_key','listing_contact_private.require_peer','listing_contact_private.require_member','listing_contact_private.require_unblocked','listing_contact_private.positive_id','listing_contact_private.guard_message','listing_contact_private.guard_conversation','listing_contact_private.guard_participant','public.contact_my_listing_seller_v1','public.delete_my_published_listing_v1','listing_publication_private.apply_delete','service_publication_private.contact_snapshot','horse_publication_private.contact_snapshot','public.get_my_message_thread_v2','public.send_my_message_v2','public.send_my_listing_message_v1','service_publication_private.select_current_context','service_publication_private.capture_message_card','horse_publication_private.capture_message_card','public.get_required_publication_policies_v1','public.require_my_current_publication_policy_acceptance_v1']::text[])),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name),'[]'::jsonb) FROM relations WHERE name<>ALL(ARRAY['public.listings','public.listing_images','public.services','public.service_images','public.horse_offers','public.horse_offer_images','public.identities','public.identity_profiles','public.business_accounts','public.business_members','public.profiles','public.user_blocks','public.conversations','public.conversation_participants','public.messages','public.publication_policy_documents','public.user_publication_policy_acceptances','listing_contact_private.channels','provider_controls_private.hidden_providers','service_publication_private.thread_context','service_publication_private.message_cards','horse_publication_private.thread_context','horse_publication_private.message_cards','service_publication_private.activity']::text[])),
 'schema',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x))),'[]'::jsonb) FROM pg_namespace n WHERE n.nspname='jobs_private'),
 'added_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('table',t.tgrelid::regclass::text,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid),'function_owner',pg_get_userbyid(p.proowner)) ORDER BY t.tgrelid::regclass::text,t.tgname),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_proc p ON p.oid=t.tgfoid WHERE NOT t.tgisinternal AND t.tgname IN('job_message_context','job_clear_context','job_clear_on_listing')
 AND t.tgrelid::regclass::text=ANY(ARRAY['public.messages','public.conversations','service_publication_private.thread_context','horse_publication_private.thread_context']))) capability,
 jsonb_build_object('schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) FROM pg_namespace n WHERE n.nspname='auth'),
 'uid',(SELECT jsonb_build_object('signature',p.oid::regprocedure::text,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
 'definer',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,
 'result',pg_get_function_result(p.oid),'arguments',p.proargnames,'defaults',pg_get_expr(p.proargdefaults,0),
 'config',p.proconfig,'body',encode(sha256(convert_to((p.prosrc)::text,'UTF8')),'hex'),'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,
 'grantable',x.is_grantable) ORDER BY pg_get_userbyid(x.grantor),x.grantee::regrole::text,x.privilege_type),'[]'::jsonb)
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x)) FROM pg_proc p JOIN pg_language l ON l.oid=p.prolang WHERE p.oid=to_regprocedure('auth.uid()'))) auth_authority)
,measured AS MATERIALIZED(SELECT *,
 encode(sha256(convert_to((dependencies)::text,'UTF8')),'hex') dependency_hash,encode(sha256(convert_to((capability)::text,'UTF8')),'hex') capability_hash,
 jsonb_build_object('existing_functions',encode(sha256(convert_to((dependencies)::text,'UTF8')),'hex'),'existing_authority',encode(sha256(convert_to((jsonb_build_object('foundation',foundation->'invariants'->'existing_authority','relations',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',value->'name','acl',value->'acl','policies',value->'policies','columns',value->'columns') ORDER BY value->>'name'),'[]'::jsonb) FROM jsonb_array_elements(existing_relations))))::text,'UTF8')),'hex'),
 'existing_structure',encode(sha256(convert_to((jsonb_build_object('foundation',foundation->'invariants'->'immutable_structure','relations',existing_relations))::text,'UTF8')),'hex'),'auth_authority',encode(sha256(convert_to((auth_authority)::text,'UTF8')),'hex')) invariants FROM observation),
 checked AS MATERIALIZED(SELECT *,jsonb_build_object(
 'installer',foundation->'guards'->'installer','hosted_context',foundation->'guards'->'hosted_context_ready',
 'block_removal_current',foundation->>'state'='applied' AND foundation->>'dependencies_ok'='true',
 'publication_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d','service_horse_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d',
 'policy_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d' AND policy_ready,'messaging_foundation',dependency_hash='f2a0d7f86a517e78b0ff123e171593a8ff5c8e5ad5b16e3a8bb6d99f5e8b0f0d') guards FROM measured),
 assessed AS MATERIALIZED(SELECT *,NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value IS DISTINCT FROM 'true'::jsonb) dependencies_ok FROM checked)
 SELECT jsonb_build_object('schema_version',1,'kind','jobs-public-v1',
 'state',CASE WHEN dependencies_ok AND capability_hash='85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65' THEN 'absent'
 WHEN dependencies_ok AND capability_hash='ee2765b24aae2b51578f355de562cbd6af580bc7e2d8bc4bed43d2a3af7ad4cc' THEN 'applied' ELSE 'incompatible' END,
 'recognized',dependencies_ok AND capability_hash IN('85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65','ee2765b24aae2b51578f355de562cbd6af580bc7e2d8bc4bed43d2a3af7ad4cc'),
 'ready_to_apply',dependencies_ok AND capability_hash='85bc46bd56e96e34511592ba050fec3864d9871b389c3c30a826f5964640ac65','dependencies_ok',dependencies_ok,
 'fingerprints',jsonb_build_object('dependencies',encode(sha256(convert_to((jsonb_build_object('functions',dependency_hash,'policy',policy_facts))::text,'UTF8')),'hex'),'capability',capability_hash),
 'invariants',invariants,'guards',guards,'hosted_context',foundation->'hosted_context',
 'rollout',jsonb_build_object('public_search',true,'validity','one_calendar_month_utc')) result FROM assessed;
DO $verify$ DECLARE b jsonb;a jsonb;BEGIN SELECT result INTO STRICT b FROM pg_temp.jobs_before;SELECT result INTO STRICT a FROM pg_temp.jobs_after;
IF (a->>'state'='applied' AND a->>'recognized'='true' AND a->>'dependencies_ok'='true' AND a->'invariants'=b->'invariants'
AND a->'hosted_context'=b->'hosted_context' AND a->'fingerprints'->>'dependencies'=b->'fingerprints'->>'dependencies') IS NOT TRUE THEN
RAISE EXCEPTION 'JOBS_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000';END IF;END $verify$;
NOTIFY pgrst,'reload schema';
SELECT result FROM pg_temp.jobs_after;
COMMIT;
