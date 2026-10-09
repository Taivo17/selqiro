BEGIN READ ONLY; SET LOCAL TimeZone='UTC'; SET LOCAL search_path=pg_catalog;
SELECT jsonb_build_object(
 'relations',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl::text,'rls',c.relrowsecurity,'force',c.relforcerowsecurity,'options',c.reloptions,'view',CASE WHEN c.relkind='v' THEN pg_get_viewdef(c.oid,true) ELSE NULL END) ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','auth') AND c.relkind IN('r','v','S')),
 'columns',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',a.attname,'number',a.attnum,'type',format_type(a.atttypid,a.atttypmod),'notnull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY n.nspname,c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname IN('public','auth') AND a.attnum>0 AND NOT a.attisdropped AND c.relkind IN('r','v')),
 'constraints',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',c.relname,'name',co.conname,'definition',pg_get_constraintdef(co.oid,true)) ORDER BY n.nspname,c.relname,co.conname) FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','auth')),
 'functions',(SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'acl',p.proacl::text) ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN('public','auth') AND p.prokind='f'),
 'indexes',(SELECT jsonb_agg(jsonb_build_object('name',c.relname,'def',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready) ORDER BY c.relname) FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','auth')),
 'triggers',(SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'def',pg_get_triggerdef(t.oid,true),'enabled',t.tgenabled) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','auth') AND NOT t.tgisinternal),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.schemaname,p.tablename,p.policyname) FROM pg_policies p WHERE schemaname IN('public','auth')),
 'rows',jsonb_build_object(
 'profiles',(SELECT count(*)::text FROM public.profiles),'identities',(SELECT count(*)::text FROM public.identities),
 'business_members',(SELECT count(*)::text FROM public.business_members),'listings',(SELECT count(*)::text FROM public.listings),
 'listing_images',(SELECT count(*)::text FROM public.listing_images),'store_categories',(SELECT count(*)::text FROM public.store_categories),
 'listing_store_categories',(SELECT count(*)::text FROM public.listing_store_categories),'horse_offers',(SELECT count(*)::text FROM public.horse_offers),
 'auth_users',(SELECT count(*)::text FROM auth.users)),
 'test_schema_absent',to_regnamespace('owner_read_test') IS NULL,
 'creation_receipts_absent',to_regclass('public.listing_creation_receipts_v1') IS NULL
);

COMMIT;
