-- Catalog only; no account, content, Auth or Storage rows.
WITH prior_listing AS MATERIALIZED (
-- Catalog only; no account, content, Auth or Storage rows.
WITH prior_profile AS MATERIALIZED (
-- Catalog only; no application/Auth/Storage rows.
WITH foundation_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='account_lifecycle_private' AND p.proname<>'account_is_available') OR (n.nspname='public' AND p.proname='get_my_account_state_v1') ORDER BY n.nspname,p.proname,p.oid LIMIT 4) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), foundation AS (
 SELECT jsonb_build_object(
  'schema_owner',(SELECT pg_get_userbyid(nspowner) FROM pg_namespace WHERE nspname='account_lifecycle_private'),
  'schema_owner_only',NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='account_lifecycle_private' AND a.grantee<>n.nspowner),
  'schema_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_namespace n ON n.nspname='account_lifecycle_private' WHERE r.rolname IN ('anon','authenticated','service_role') AND (has_schema_privilege(r.oid,n.oid,'USAGE') OR has_schema_privilege(r.oid,n.oid,'CREATE'))),
  'relation_count',(SELECT count(*) FROM (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='account_lifecycle_private' AND c.relkind IN ('r','p','v','m','S','f') LIMIT 3) bounded),
  'table_owner',(SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'table_kind',(SELECT relkind::text FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'rls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'force_rls',(SELECT relforcerowsecurity FROM pg_class WHERE oid=to_regclass('account_lifecycle_private.account_states')),
  'owner_grants_only',NOT EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE c.oid=to_regclass('account_lifecycle_private.account_states') AND a.grantee<>c.relowner),
  'column_grants_owner_only',NOT EXISTS(SELECT 1 FROM pg_attribute col JOIN pg_class c ON c.oid=col.attrelid CROSS JOIN LATERAL aclexplode(col.attacl) a WHERE c.oid=to_regclass('account_lifecycle_private.account_states') AND a.grantee<>c.relowner),
  'table_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role') AND
   (has_table_privilege(r.oid,to_regclass('account_lifecycle_private.account_states'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r.oid,to_regclass('account_lifecycle_private.account_states'),'SELECT,INSERT,UPDATE,REFERENCES'))),
  'columns',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text,
   'default_sha256',CASE WHEN d.oid IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(d.adbin,d.adrelid),'UTF8')),'hex') END) ORDER BY a.attnum)
   FROM (SELECT * FROM pg_attribute WHERE attrelid=to_regclass('account_lifecycle_private.account_states') AND attnum>0 AND NOT attisdropped ORDER BY attnum LIMIT 8) a
   LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum),'[]'::jsonb),
  'constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object('name',con.conname,'kind',con.contype::text,'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(con.oid),'UTF8')),'hex'),'validated',con.convalidated,'deferrable',con.condeferrable) ORDER BY con.conname)
   FROM (SELECT * FROM pg_constraint WHERE conrelid=to_regclass('account_lifecycle_private.account_states') ORDER BY conname LIMIT 8) con),'[]'::jsonb),
  'table_triggers',(SELECT count(*) FROM (SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('account_lifecycle_private.account_states') AND NOT tgisinternal LIMIT 2) bounded),
  'policies',(SELECT count(*) FROM (SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('account_lifecycle_private.account_states') LIMIT 2) bounded),
  'indexes',(SELECT count(*) FROM (SELECT 1 FROM pg_index WHERE indrelid=to_regclass('account_lifecycle_private.account_states') LIMIT 3) bounded),
  'functions',(SELECT value FROM foundation_functions),
  'auth_triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object('definition_sha256',encode(sha256(convert_to(pg_get_triggerdef(t.oid),'UTF8')),'hex'),'name',t.tgname,'function',t.tgfoid::regprocedure::text,'enabled',t.tgenabled::text,'event_mask',t.tgtype,'argument_count',t.tgnargs,
   'arguments_sha256',encode(sha256(t.tgargs),'hex'),'when_sha256',CASE WHEN t.tgqual IS NULL THEN NULL ELSE encode(sha256(convert_to(pg_get_expr(t.tgqual,t.tgrelid),'UTF8')),'hex') END) ORDER BY t.tgname)
   FROM (SELECT * FROM pg_trigger WHERE tgrelid=to_regclass('auth.users') AND NOT tgisinternal ORDER BY tgname LIMIT 4) t),'[]'::jsonb)
 ) value
), scoped_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname IN ('account_lifecycle_private.account_is_available','auth.uid','profile_media_private.public_url','profile_media_private.slot_asset','profile_media_private.slot_url','public.get_public_profile_media_v1','public.get_store_by_slug') ORDER BY n.nspname,p.proname,p.oid LIMIT 12) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
), ownership_columns AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,
 'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text)
 ORDER BY w.relation COLLATE "C",w.name COLLATE "C"),'[]'::jsonb) value
 FROM (VALUES ('auth.users','id'),('auth.users','created_at'),('auth.users','deleted_at'),('auth.users','banned_until'),('public.identities','id'),('public.identities','type'),('public.identities','user_id'),('public.identities','business_account_id'),('public.identities','status'),('public.business_accounts','id'),('public.business_accounts','owner_user_id'),('public.business_accounts','status'),('public.identity_profiles','identity_id'),('public.identity_profiles','slug'),('public.profiles','id'),('public.profiles','store_slug')) w(relation,name)
 JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), protected_relations AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C"),'[]'::jsonb) value
 FROM unnest(ARRAY['auth.users','public.business_accounts','public.identities','public.identity_profiles','public.profiles']) name JOIN pg_class c ON c.oid=to_regclass(name)
), protected_indexes AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
 'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
 'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C"),'[]'::jsonb) value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY['auth.users','public.business_accounts','public.identities','public.identity_profiles','public.profiles']) x) AND c.relname IN ('users_pkey','business_accounts_pkey','identities_pkey','identity_profiles_identity_id_key','identity_profiles_slug_key','profiles_pkey','profiles_store_slug_key')
), base AS (
 SELECT jsonb_build_object('foundation',(SELECT value FROM foundation),
 'dependencies',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM scoped_functions,jsonb_array_elements(value) x
 WHERE x->>'name' NOT IN ('public.get_store_by_slug','account_lifecycle_private.account_is_available')),
 'relations',(SELECT value FROM protected_relations),'columns',(SELECT value FROM ownership_columns),
 'indexes',(SELECT value FROM protected_indexes),'observer',current_user,
 'roles',(SELECT jsonb_agg(rolname ORDER BY rolname COLLATE "C") FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role'))
 ) value
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM scoped_functions,jsonb_array_elements(value) x
 WHERE x->>'name' IN ('public.get_store_by_slug','account_lifecycle_private.account_is_available')),
 'helper_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_proc p ON p.oid=to_regprocedure('account_lifecycle_private.account_is_available(uuid)')
 WHERE r.rolname IN ('anon','authenticated','service_role') AND has_function_privilege(r.oid,p.oid,'EXECUTE'))
 ) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target
), listing_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname IN ('public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.get_public_listing_detail_v1','public.listing_actor_uid_hosted_v1','public.public_listing_search_document_v1') ORDER BY n.nspname,p.proname,p.oid LIMIT 8) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
)
, listing_relations AS (
 SELECT jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
  'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C") value
 FROM unnest(ARRAY['public.listings','public.listing_images','public.user_blocks','provider_controls_private.hidden_providers']) name JOIN pg_class c ON c.oid=to_regclass(name)
), listing_columns AS (
 SELECT jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text) ORDER BY w.relation COLLATE "C",w.name COLLATE "C") value
 FROM (VALUES ('public.listings','id'),('public.listings','identity_id'),('public.listings','user_id'),('public.listings','status'),('public.listings','active_until'),('public.listing_images','id'),('public.listing_images','listing_id'),('public.user_blocks','blocker_id'),('public.user_blocks','blocked_id'),('provider_controls_private.hidden_providers','viewer_user_id'),('provider_controls_private.hidden_providers','provider_identity_id'),('provider_controls_private.hidden_providers','hidden_until')) w(relation,name) JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), listing_indexes AS (
 SELECT jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
  'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
  'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C") value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY['public.listings','public.listing_images','public.user_blocks','provider_controls_private.hidden_providers']) x) AND c.relname IN ('listings_pkey','listings_public_keywords_v1_gin','listings_identity_id_idx','idx_listings_category','idx_listing_images_listing_id','user_blocks_blocker_id_blocked_id_key','user_blocks_blocked_blocker_idx_v1','hidden_providers_pkey','hidden_providers_active_idx')
), base AS (
 SELECT jsonb_build_object('accepted_profile_base',prior_profile.b,'accepted_profile_target',prior_profile.t,
  'dependencies',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM listing_functions,jsonb_array_elements(value) x WHERE x->>'name' IN ('public.listing_actor_uid_hosted_v1','public.public_listing_search_document_v1')),
  'relations',(SELECT value FROM listing_relations),'columns',(SELECT value FROM listing_columns),
  'indexes',(SELECT value FROM listing_indexes)) value FROM prior_profile
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM listing_functions,jsonb_array_elements(value) x WHERE x->>'name' IN ('public.search_public_listings_v1','public.search_public_listings_v2','public.search_public_marketplace_v1','public.get_public_listing_detail_v1'))) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target
), horse_functions AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'name',n.nspname||'.'||p.proname,
  'arguments',COALESCE((SELECT jsonb_agg(format_type(a,NULL) ORDER BY ord) FROM unnest(p.proargtypes::oid[]) WITH ORDINALITY x(a,ord)),'[]'::jsonb),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'definer',p.prosecdef,'volatility',p.provolatile::text,'strict',p.proisstrict,'parallel',p.proparallel::text,'leakproof',p.proleakproof,
  'config_sha256',CASE WHEN p.proconfig IS NULL THEN NULL ELSE encode(sha256(convert_to(p.proconfig::text,'UTF8')),'hex') END,
  'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex'),
  'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),'defaults',p.pronargdefaults<>0,
  'grants',COALESCE((SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,a.privilege_type)
   FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) ORDER BY n.nspname,p.proname,p.oid),'[]'::jsonb) value
 FROM (SELECT p.* FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname IN ('public.search_public_marketplace_v1','public.get_public_horse_offer_v1','horse_publication_private.effective_active_until','horse_publication_private.has_current_publication','horse_publication_private.is_public','horse_publication_private.public_price','horse_publication_private.public_fields','public.build_horse_offer_content_snapshot_v1') ORDER BY n.nspname,p.proname,p.oid LIMIT 10) p
 JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
)
, horse_relations AS (
 SELECT jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
  'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C") value
 FROM unnest(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.gallery','listing_publication_private.web_images','listing_publication_private.cleanup']) name JOIN pg_class c ON c.oid=to_regclass(name)
), horse_columns AS (
 SELECT jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text) ORDER BY w.relation COLLATE "C",w.name COLLATE "C") value
 FROM (VALUES ('public.horse_offers','id'),('public.horse_offers','identity_id'),('public.horse_offers','created_by_user_id'),('public.horse_offers','status'),('public.horse_offers','offer_type'),('public.horse_offers','market_country_code'),('public.horse_offers','horse_location_country_code'),('public.horse_offers','title'),('public.horse_offers','description'),('public.horse_offers','price_amount'),('public.horse_offers','price_type'),('public.horse_offers','currency'),('public.horse_offers','details'),('public.horse_offers','current_publication_event_id'),('public.horse_offers','published_at'),('public.horse_offers','active_until'),('public.horse_offers','created_at'),('public.horse_offers','city'),('public.horse_offers','region'),('public.horse_offers','image_url'),('public.horse_offers','horse_name'),('public.horse_offers','birth_year'),('public.horse_offers','sex'),('public.horse_offers','breed'),('public.horse_offers','color'),('public.horse_offers','height_cm'),('public.horse_offers','discipline'),('public.horse_offers','training_level'),('public.horse_offers','suitability'),('public.horse_offers','health_notes'),('public.horse_offers','behavior_notes'),('public.horse_offers','location_text'),('public.horse_offers','horse_lat'),('public.horse_offers','horse_lng'),('public.horse_offers','search_vector'),('public.horse_offer_images','id'),('public.horse_offer_images','horse_offer_id'),('public.horse_offer_images','identity_id'),('public.horse_offer_images','original_url'),('public.horse_offer_images','medium_url'),('public.horse_offer_images','thumb_url'),('public.horse_offer_images','storage_path'),('public.horse_offer_images','sort_order'),('public.horse_offer_images','is_primary'),('public.horse_offer_images','created_at'),('public.horse_offer_publication_events','id'),('public.horse_offer_publication_events','horse_offer_id'),('public.horse_offer_publication_events','identity_id'),('public.horse_offer_publication_events','decision'),('public.horse_offer_publication_events','content_snapshot'),('public.horse_offer_publication_events','content_hash'),('horse_publication_private.gallery','image_id'),('horse_publication_private.gallery','horse_offer_id'),('horse_publication_private.gallery','slot_id'),('horse_publication_private.gallery','attempt_id'),('horse_publication_private.gallery','object_id'),('horse_publication_private.gallery','ready_id'),('listing_publication_private.web_images','slot_id'),('listing_publication_private.web_images','attempt_id'),('listing_publication_private.web_images','state'),('listing_publication_private.web_images','ready_id'),('listing_publication_private.cleanup','object_id')) w(relation,name) JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), horse_indexes AS (
 SELECT jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
  'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
  'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C") value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events','horse_publication_private.gallery','listing_publication_private.web_images','listing_publication_private.cleanup']) x) AND c.relname IN ('horse_offers_pkey','horse_offers_identity_status_updated_idx','horse_offers_public_market_type_idx','horse_offers_active_until_idx','horse_offers_search_vector_idx','horse_offer_images_pkey','horse_offer_images_offer_order_idx','horse_offer_publication_events_pkey','gallery_pkey','web_images_slot_id_key','cleanup_pkey')
), base AS (
 SELECT jsonb_build_object('accepted_listing_base',prior_listing.b,
  'accepted_ordinary_readers',(SELECT jsonb_build_object('functions',coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb)) FROM jsonb_array_elements(prior_listing.t->'functions') x WHERE x->>'name'<>'public.search_public_marketplace_v1'),
  'dependencies',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM horse_functions,jsonb_array_elements(value) x WHERE x->>'name' IN ('horse_publication_private.effective_active_until','horse_publication_private.has_current_publication','horse_publication_private.is_public','horse_publication_private.public_price','horse_publication_private.public_fields','public.build_horse_offer_content_snapshot_v1')),
  'relations',(SELECT value FROM horse_relations),'columns',(SELECT value FROM horse_columns),
  'indexes',(SELECT value FROM horse_indexes)) value FROM prior_listing
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(x ORDER BY x->>'name' COLLATE "C"),'[]'::jsonb) FROM horse_functions,jsonb_array_elements(value) x WHERE x->>'name' IN ('public.search_public_marketplace_v1','public.get_public_horse_offer_v1'))) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target;
