SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',n.nspname||'.'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ',',')||')',
 'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'kind',p.prokind,'definer',p.prosecdef,'volatility',p.provolatile,
 'strict',p.proisstrict,'leakproof',p.proleakproof,'parallel',p.proparallel,'returns_set',p.proretset,'result',pg_get_function_result(p.oid),
 'arguments',to_jsonb(p.proargnames),'argument_types',(SELECT jsonb_agg(format_type(x,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY z(x,ord)),
 'defaults',pg_get_expr(p.proargdefaults,0),'config',to_jsonb(p.proconfig),
 'body_bytes',octet_length(convert_to(p.prosrc,'UTF8')),'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
 'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
 'acl',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'grantable',a.is_grantable,'privilege',a.privilege_type) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type),'[]'::jsonb) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),
 'effective',(SELECT jsonb_agg(jsonb_build_object('role',r.rolname,'execute',has_function_privilege(r.oid,p.oid,'EXECUTE')) ORDER BY r.rolname) FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role','selqiro_listing_contact_writer_v1'))
 ) ORDER BY n.nspname,p.proname,oidvectortypes(p.proargtypes)),'[]'::jsonb) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE n.nspname||'.'||p.proname IN ('public.get_my_marketplace_message_thread_v1','public.get_my_marketplace_message_thread_v2','horse_publication_private.contact_snapshot','service_publication_private.contact_snapshot','jobs_private.contact_snapshot');
