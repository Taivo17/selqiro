-- Read only catalog expression; caller sets search_path=pg_catalog,pg_temp.
WITH function_facts AS (SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),
 'language',l.lanname,'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
 'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]')
 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind='f' AND (n.nspname='listing_publication_private' OR n.nspname||'.'||p.proname=ANY(ARRAY['public.current_user_has_identity_access','public.set_listing_primary_image_v2','public.listing_actor_uid_hosted_v1','listing_publication_private.hosted_storage_contract_ready','listing_publication_private.assert_hosted_preview_actor','public.lock_listing_creation_actor_v1','public.require_listing_create_keys_v1','listing_publication_private.require_actor','listing_publication_private.validate_web_intent','public.listing_final_guard_state_v1','public.guard_listing_price_v2','listing_publication_private.guard_managed_listing','listing_publication_private.guard_managed_image','listing_publication_private.protect_attempt','listing_publication_private.protect_slot','listing_publication_private.protect_object','listing_publication_private.protect_web_image','listing_publication_private.protect_publication','listing_publication_private.apply_delete','listing_publication_private.final_receipt','public.delete_my_published_listing_v1','public.get_selqiro_hosted_preview_readiness_v1','listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.lock_managed_listing_images_v1','public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1']::text[]))),
 relation_facts AS (SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
 'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
 'default',pg_get_expr(ad.adbin,ad.adrelid),'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END)
 ORDER BY a.attnum),'[]') FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
 WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,
 'definition',pg_get_constraintdef(q.oid),'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,
 'local',q.conislocal,'inheritance',q.coninhcount,'no_inherit',q.connoinherit) ORDER BY q.conname),'[]')
 FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
 AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
 'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)) structure,
 jsonb_build_object('acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),
 'column_acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('column',a.attname,'grantor',pg_get_userbyid(x.grantor),
 'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
 ORDER BY a.attname,x.grantee::regrole::text,x.privilege_type),'[]') FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
 WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'permissive',q.polpermissive,'command',q.polcmd,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(q.polroles) r),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]')
 FROM pg_policy q WHERE q.polrelid=c.oid)) authority
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relkind IN('r','p') AND (n.nspname='listing_publication_private' OR n.nspname||'.'||c.relname=ANY(
 ARRAY['public.profiles','public.identities','public.business_members','public.listings','public.listing_images']))),
 hosted AS (SELECT jsonb_build_object('project_ref',project_ref,'release_id',release_id,'instance_id',instance_id,
  'release_ready',release_ready,'storage_authority_version',storage_authority_version,'cleanup_mode','held') context,
  to_jsonb(s) all_settings FROM listing_publication_private.hosted_preview_settings s WHERE singleton),
 measured AS (SELECT
  encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts) ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['public.current_user_has_identity_access','public.set_listing_primary_image_v2','public.listing_actor_uid_hosted_v1','listing_publication_private.hosted_storage_contract_ready','listing_publication_private.assert_hosted_preview_actor','public.lock_listing_creation_actor_v1','public.require_listing_create_keys_v1','listing_publication_private.require_actor','listing_publication_private.validate_web_intent','public.listing_final_guard_state_v1','public.guard_listing_price_v2','listing_publication_private.guard_managed_listing','listing_publication_private.guard_managed_image','listing_publication_private.protect_attempt','listing_publication_private.protect_slot','listing_publication_private.protect_object','listing_publication_private.protect_web_image','listing_publication_private.protect_publication','listing_publication_private.apply_delete','listing_publication_private.final_receipt','public.delete_my_published_listing_v1','public.get_selqiro_hosted_preview_readiness_v1']::text[])))::text,'UTF8')),'hex') dependencies,
  encode(sha256(convert_to((jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl)
 ORDER BY signature),'[]') FROM function_facts WHERE name=ANY(ARRAY['listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.lock_managed_listing_images_v1','public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1']::text[])),
 'table',(SELECT jsonb_build_object('structure',structure,'authority',authority) FROM relation_facts WHERE name='listing_publication_private.managed_image_presentations_v1')))::text,'UTF8')),'hex') capability,
  encode(sha256(convert_to(((SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]') FROM function_facts WHERE NOT(name=ANY(ARRAY['listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.lock_managed_listing_images_v1','public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1']::text[]))))::text,'UTF8')),'hex') existing_functions,
  encode(sha256(convert_to((jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name) FROM relation_facts WHERE name<>'listing_publication_private.managed_image_presentations_v1'),
  'schemas',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
  'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,
  'privilege',x.privilege_type,'grantable',x.is_grantable) ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname)
  FROM pg_namespace n WHERE n.nspname IN('public','listing_publication_private')),
  'writer',(SELECT jsonb_build_object('login',rolcanlogin,'super',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls)
  FROM pg_roles WHERE rolname='selqiro_listing_final_writer_v1'),
  'members',(SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
  'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text)
  FROM pg_auth_members WHERE roleid=to_regrole('selqiro_listing_final_writer_v1') OR member=to_regrole('selqiro_listing_final_writer_v1')),
  'settings',(SELECT all_settings FROM hosted),
  'actors',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.actor_user_id),'[]') FROM listing_publication_private.hosted_preview_actors a)))::text,'UTF8')),'hex') existing_authority,
  encode(sha256(convert_to(((SELECT jsonb_agg(structure ORDER BY name) FROM relation_facts WHERE name<>'listing_publication_private.managed_image_presentations_v1'))::text,'UTF8')),'hex') immutable_structure),
 checks AS (SELECT
  dependencies='fb89562d7bb6e653b53e3baad61ae32dc6a64aa1578051a2eed4f50cbf8af4e3' AS functions,
  current_user='postgres' AND session_user='postgres' AND current_setting('transaction_isolation')='read committed'
   AND current_setting('server_version_num')::integer>=170000 AS installer,
  EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_final_writer_v1' AND NOT rolcanlogin AND NOT rolsuper
   AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls)
   AND pg_has_role('postgres','selqiro_listing_final_writer_v1','SET')
   AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE
    (roleid=to_regrole('selqiro_listing_final_writer_v1') AND member<>to_regrole('postgres')) OR member=to_regrole('selqiro_listing_final_writer_v1'))
   AND NOT has_schema_privilege('selqiro_listing_final_writer_v1','public','CREATE')
   AND NOT has_schema_privilege('selqiro_listing_final_writer_v1','listing_publication_private','CREATE') AS actor_roles,
  EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='listing_publication_private' AND nspowner=to_regrole('postgres'))
   AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) api
    WHERE has_schema_privilege(api,'listing_publication_private','USAGE')) AS closed_private_schema,
  NOT EXISTS(SELECT 1 FROM unnest(ARRAY['public.profiles','public.identities','public.business_members','public.listings','public.listing_images','listing_publication_private.attempts','listing_publication_private.publications','listing_publication_private.slots','listing_publication_private.objects','listing_publication_private.web_images','listing_publication_private.cleanup']::text[]) required(name)
   LEFT JOIN pg_class c ON c.oid=to_regclass(required.name)
   WHERE c.oid IS NULL OR c.relkind<>'r' OR NOT c.relrowsecurity OR c.relowner<>to_regrole('postgres')) AS core_relations,
  NOT EXISTS(SELECT 1 FROM (VALUES ('public.profiles','id','uuid',true),
('public.profiles','active_identity_id','uuid',false),
('public.identities','id','uuid',true),
('public.identities','type','text',true),
('public.identities','status','text',true),
('public.identities','user_id','uuid',false),
('public.identities','business_account_id','uuid',false),
('public.business_members','user_id','uuid',true),
('public.business_members','business_account_id','uuid',true),
('public.business_members','status','text',true),
('public.listings','id','bigint',true),
('public.listings','user_id','uuid',false),
('public.listings','identity_id','uuid',false),
('public.listings','created_by_user_id','uuid',false),
('public.listings','image','text',false),
('public.listing_images','id','uuid',true),
('public.listing_images','listing_id','bigint',false),
('public.listing_images','user_id','uuid',false),
('public.listing_images','original_url','text',true),
('public.listing_images','medium_url','text',false),
('public.listing_images','thumb_url','text',false),
('public.listing_images','sort_order','integer',false),
('public.listing_images','is_primary','boolean',false),
('listing_publication_private.attempts','id','uuid',true),
('listing_publication_private.attempts','actor_user_id','uuid',true),
('listing_publication_private.attempts','identity_id','uuid',true),
('listing_publication_private.attempts','state','text',true),
('listing_publication_private.publications','attempt_id','uuid',true),
('listing_publication_private.publications','listing_id','bigint',true),
('listing_publication_private.publications','state','text',true),
('listing_publication_private.publications','deleted_at','timestamp with time zone',false),
('listing_publication_private.slots','id','uuid',true),
('listing_publication_private.slots','attempt_id','uuid',true),
('listing_publication_private.slots','ordinal','integer',true),
('listing_publication_private.slots','expected_source_bytes','integer',true),
('listing_publication_private.slots','expected_source_sha256','bytea',true),
('listing_publication_private.objects','id','uuid',true),
('listing_publication_private.objects','slot_id','uuid',true),
('listing_publication_private.objects','attempt_id','uuid',true),
('listing_publication_private.objects','kind','text',true),
('listing_publication_private.objects','bucket_id','text',true),
('listing_publication_private.objects','object_path','text',true),
('listing_publication_private.web_images','id','uuid',true),
('listing_publication_private.web_images','attempt_id','uuid',true),
('listing_publication_private.web_images','slot_id','uuid',true),
('listing_publication_private.web_images','state','text',true),
('listing_publication_private.web_images','ready_id','uuid',false),
('listing_publication_private.web_images','ready_at','timestamp with time zone',false),
('listing_publication_private.web_images','intent','jsonb',false),
('listing_publication_private.cleanup','object_id','uuid',true))
   required(relation_name,column_name,type_name,not_null)
   WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass(required.relation_name)
    AND a.attname=required.column_name AND NOT a.attisdropped AND a.atttypid=to_regtype(required.type_name)
    AND a.attnotnull=required.not_null AND a.attgenerated='')) AS required_columns,
  NOT EXISTS(SELECT 1 FROM (VALUES ('public.listings','guard_managed_listing','listing_publication_private.guard_managed_listing()',31),
('public.listing_images','guard_managed_image','listing_publication_private.guard_managed_image()',31),
('public.listing_images','guard_managed_image_truncate','listing_publication_private.guard_managed_image()',34),
('listing_publication_private.attempts','protect_attempt','listing_publication_private.protect_attempt()',27),
('listing_publication_private.slots','protect_slot','listing_publication_private.protect_slot()',27),
('listing_publication_private.objects','protect_object','listing_publication_private.protect_object()',27),
('listing_publication_private.web_images','protect_web_image','listing_publication_private.protect_web_image()',27),
('listing_publication_private.web_images','protect_web_image_truncate','listing_publication_private.protect_web_image()',34),
('listing_publication_private.publications','protect_publication','listing_publication_private.protect_publication()',27),
('listing_publication_private.publications','protect_publication_truncate','listing_publication_private.protect_publication()',34)) required(relation_name,trigger_name,function_name,trigger_type)
   WHERE NOT EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass(required.relation_name) AND t.tgname=required.trigger_name
    AND t.tgenabled='O' AND NOT t.tgisinternal AND t.tgtype=required.trigger_type AND t.tgfoid=to_regprocedure(required.function_name))) AS managed_triggers,
  (SELECT coalesce(jsonb_agg(jsonb_build_object(
 'relation',required.relation_name,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text)
  FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))
 ORDER BY required.relation_name,required.policy_name),'[]')
 FROM (VALUES ('public.listings','final_writer_listings'),
('public.listing_images','final_writer_images'),
('listing_publication_private.attempts','final_internal_writer'),
('listing_publication_private.slots','final_internal_writer'),
('listing_publication_private.objects','final_internal_writer'),
('listing_publication_private.cleanup','final_internal_writer'),
('listing_publication_private.web_images','final_internal_writer'),
('listing_publication_private.publications','final_internal_writer')) required(relation_name,policy_name)
 JOIN pg_policy p ON p.polrelid=to_regclass(required.relation_name) AND p.polname=required.policy_name)='[{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.attempts","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.cleanup","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.objects","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.publications","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.slots","permissive":true},{"name":"final_internal_writer","check":"true","roles":["selqiro_listing_final_writer_v1"],"using":"true","command":"*","relation":"listing_publication_private.web_images","permissive":true},{"name":"final_writer_images","check":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","roles":["selqiro_listing_final_writer_v1"],"using":"(EXISTS ( SELECT 1\n   FROM public.listings l\n  WHERE ((l.id = listing_images.listing_id) AND public.current_user_has_identity_access(l.identity_id))))","command":"*","relation":"public.listing_images","permissive":true},{"name":"final_writer_listings","check":"public.current_user_has_identity_access(identity_id)","roles":["selqiro_listing_final_writer_v1"],"using":"public.current_user_has_identity_access(identity_id)","command":"*","relation":"public.listings","permissive":true}]'::jsonb AS final_writer_policies,
  EXISTS(SELECT 1 FROM hosted WHERE context->>'project_ref'='vyjletlmwoiwxsnsunlm'
   AND context->>'release_id'='listing-publication-hosted-preview-v1' AND (context->>'release_ready')::boolean
   AND context->>'storage_authority_version'='source-part-rfc3986-v1')
   AND listing_publication_private.hosted_storage_contract_ready() AS hosted_context_ready,
  NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.lock_managed_listing_images_v1','public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1']::text[]))
   AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='listing_publication_private' AND c.relname='managed_image_presentations_v1')
   AND NOT EXISTS(SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='listing_publication_private' AND t.typname='managed_image_presentations_v1') AS capability_absent,
  capability='be211792d33b920adfc4c86bb08da0ca6e0d582b68b19960b3fc30aaa2b82df9' AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname||'.'||p.proname=ANY(ARRAY['listing_publication_private.protect_managed_image_presentation_v1','listing_publication_private.require_managed_image_actor_v1','listing_publication_private.validate_managed_image_intent_v1','listing_publication_private.lock_managed_listing_images_v1','public.get_my_managed_listing_images_v1','public.set_my_managed_listing_primary_image_v1']::text[]))=6 AS capability_present
 FROM measured),
 assessed AS (SELECT *,coalesce(functions AND installer AND actor_roles AND closed_private_schema AND core_relations
  AND required_columns AND managed_triggers AND final_writer_policies AND hosted_context_ready,false) dependencies_ok FROM checks),
 result_row AS (SELECT jsonb_build_object('schema_version',1,'kind','listing-primary-image-v1',
  'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
   WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
  'recognized',dependencies_ok AND (capability_absent<>capability_present),
  'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,'dependencies_ok',dependencies_ok,
  'capability_absent',capability_absent,'capability_present',capability_present,
  'guards',to_jsonb(assessed)-ARRAY['dependencies_ok','capability_absent','capability_present'],
  'hosted_context',(SELECT context FROM hosted),
  'fingerprints',jsonb_build_object('dependencies',dependencies,'capability',capability),
  'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result
 FROM assessed CROSS JOIN measured)
 SELECT result FROM result_row;
