-- Dynamic bounded snapshot of pre-existing Storage metadata. This is retained
-- only inside the single apply transaction, not invented as a previous fact.
SELECT jsonb_build_object(
 'relation',(SELECT jsonb_build_object('owner',pg_get_userbyid(c.relowner),'kind',c.relkind,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'acl',coalesce(c.relacl,acldefault('r',c.relowner))::text) FROM pg_class c WHERE c.oid='storage.objects'::regclass),
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
  'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'acl',a.attacl::text) ORDER BY a.attnum)
  FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid='storage.objects'::regclass AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
  'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(p.polroles) x ORDER BY 1),
  'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb)
  FROM pg_policy p WHERE p.polrelid='storage.objects'::regclass AND p.polname NOT IN('message_legacy_account_insert_v1','message_legacy_account_update_v1')),
 'triggers',(SELECT coalesce(jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid='storage.objects'::regclass AND NOT tgisinternal),
 'buckets',(SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'public',public,'limit',file_size_limit,'mimes',allowed_mime_types) ORDER BY id)
  FROM storage.buckets WHERE id IN('messages','message-attachments-v2'))
) value;
