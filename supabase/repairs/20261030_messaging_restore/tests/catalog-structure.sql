SELECT jsonb_build_object(
 'schema',(SELECT jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',
   (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a)) FROM pg_namespace n WHERE n.nspname='messaging_private_v2'),
 'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
   'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
   'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
     'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum)
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
   'constraints',(SELECT jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'validated',q.convalidated,
    'definition',pg_get_constraintdef(q.oid)) ORDER BY q.conname) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
   'indexes',(SELECT jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY x.relname) FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid WHERE i.indrelid=c.oid),
   'policies',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname) FROM pg_policy q WHERE q.polrelid=c.oid),
   'acl',(SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
    FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a)
  ) ORDER BY c.relname),'[]'::jsonb) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p','v','m','f')),
 'public_indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',c.relname,'owner',pg_get_userbyid(c.relowner),'definition',pg_get_indexdef(c.oid)) ORDER BY c.relname),'[]'::jsonb)
   FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname IN('messaging_thread_activity_v2','messaging_thread_message_v2')),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
  FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND t.tgname IN('protect_attached_message_photo_v2','messaging_account_block_v2')),
 'storage_policy',(SELECT jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
    'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
    'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname)
    FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname='message_attachments_v2_server_only')
) AS structure;
