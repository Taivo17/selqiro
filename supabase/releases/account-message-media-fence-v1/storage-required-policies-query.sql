SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
 'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
 'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb) value
 FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname IN ('Participants can upload message images','Participants can view message images','message_attachments_v2_server_only');
