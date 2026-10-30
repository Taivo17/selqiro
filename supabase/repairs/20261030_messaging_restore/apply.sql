-- One transaction. Unknown or partially installed catalogs are never overwritten.
BEGIN;
SET LOCAL search_path=pg_catalog,public,pg_temp;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='30s';
SELECT pg_advisory_xact_lock(hashtextextended('selqiro-messaging-restore-20261030',0));
DO $catalog_guard$
DECLARE
 specs jsonb := $specs$[{"signature":"public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)","name":"public.contact_my_listing_seller_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"50e84938abd4b5e47ef1344727688bae0d49f4c05ffe73c1590a2d6555e7bb72","fixed_sha256":"45b13119d7f8c75c4efeb0996ad14cfa60b02cd031015b64b5ab5655e1577710","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)","name":"public.send_my_listing_message_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_message","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"529c7780a55d58e825eca45f86bcc9615201975579f15fa6c43d646b74adc471","fixed_sha256":"2b2f38a55bef3b0751ae2ae045f973a9a7032ed322ef6bf5ca1e39b1fe0bd56a","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.get_my_listing_conversation_v1(uuid,uuid,text,text)","name":"public.get_my_listing_conversation_v1","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_before_message_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"cdf1a128a2eab29d8975517005af0385afa1565e7c2bc74ca2133bfc6b85ddfc","fixed_sha256":"04cf2707130e6845a0b48332664caade46e9ae354a54dd14acae18532615b25d","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.list_my_listing_conversations_v1(uuid,uuid,text)","name":"public.list_my_listing_conversations_v1","args":["p_expected_user_id","p_expected_identity_id","p_before_conversation_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"691956e594cf4f0c0ddac5da50df31d17e784b8d4bd2de4e7188af1d85d1c8d0","fixed_sha256":"c47b47d481ace70c4038f8a52bbdb10a0dcde969cf8212644a89fe062126515f","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_peer(uuid,uuid)","name":"listing_contact_private.require_peer","args":["p_user","p_identity"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_ready(uuid,uuid,uuid)","name":"listing_contact_private.peer_ready","args":["p_user","p_identity","p_viewer"],"result":"boolean","owner":"postgres","language":"sql","secdef":false,"volatility":"s","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_actor_hosted_v1(uuid,uuid)","name":"listing_contact_private.require_actor_hosted_v1","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"d6b6bede7ce642c19c3ebdb0e809abf1ab049c789b2219b9e8454923c88f5518","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_name_hosted_v1(uuid)","name":"listing_contact_private.peer_name_hosted_v1","args":["p_identity"],"result":"text","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"836c3f6e06f1c84d9d93c7aa1c150bd2e17e3b68884b422849ca073a4c8a0d90","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_publication_private.require_actor(uuid,uuid)","name":"listing_publication_private.require_actor","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"9a86e4ca817793a77420dfc2e74d9e2df18298436638a7bf241428fca2c9a3f0"},{"signature":"public.lock_listing_creation_actor_v1(uuid)","name":"public.lock_listing_creation_actor_v1","args":["p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"45c3cd15d8181606e839e83978b114bced5dd5480781a956ed40d96cd62802d8"},{"signature":"public.listing_actor_uid_hosted_v1()","name":"public.listing_actor_uid_hosted_v1","args":[],"result":"uuid","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ff7f6ce615280095930c983468c5ce5a6c3982bc4f540e4929bb0baf904ce88d"},{"signature":"listing_publication_private.assert_hosted_preview_actor(uuid)","name":"listing_publication_private.assert_hosted_preview_actor","args":["p_actor"],"result":"void","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"307f98bf3584f0394697bbb1a4d60c54454c69b193f5c2bba0cf68701d7babc2"},{"signature":"listing_publication_private.hosted_storage_contract_ready()","name":"listing_publication_private.hosted_storage_contract_ready","args":[],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"2e41806725b8c4f9af82e4541d8fc4a17faae54aa36dc5d63be1c40c753f841f"},{"signature":"public.current_user_has_identity_access(uuid)","name":"public.current_user_has_identity_access","args":["p_identity_id"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"b708d7abdfac00c7341979f4ff6dfae2ab2bfb55d311f27c7cc2935167224027"},{"signature":"listing_contact_private.require_member(bigint,uuid,uuid)","name":"listing_contact_private.require_member","args":["p_conversation","p_user","p_identity"],"result":"listing_contact_private.channels","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"20e71c37d94292b18235d0346133c4bd088d7ca13ce61706e2fb3305be28a689"},{"signature":"listing_contact_private.require_unblocked(uuid,uuid)","name":"listing_contact_private.require_unblocked","args":["p_first","p_second"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"aabb21ea89dd484394e31241d5e490551f72935900840946dd286d937dbdae80"},{"signature":"listing_contact_private.require_key(uuid)","name":"listing_contact_private.require_key","args":["v"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"8c0a721a658f0aee11b5ab6eb59386829974b4c16f4ab17e01ce60cd58b82c1d"},{"signature":"listing_contact_private.positive_id(text)","name":"listing_contact_private.positive_id","args":["v"],"result":"bigint","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"27c9aa1df9f9951953e563e6082d397c3bf70fe87e7c7081879a227c82fd098e"},{"signature":"listing_contact_private.guard_conversation()","name":"listing_contact_private.guard_conversation","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"7c86041baee326a66504c329d89be942cf5af0c62ca5f58b027b9b72bb349207"},{"signature":"listing_contact_private.guard_message()","name":"listing_contact_private.guard_message","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"a5be6fd14797297cc98667155325d8518dbdf7a36df69739c2c4cdd1e01b520c"},{"signature":"listing_contact_private.guard_participant()","name":"listing_contact_private.guard_participant","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"97e3f59dd5cf441cb3f2ff33b473a5361c481ed8d65f3b4fc8c3ea72ea003420"},{"signature":"public.listing_contact_is_managed_v1(bigint,bigint)","name":"public.listing_contact_is_managed_v1","args":["p_conversation","p_listing"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":1,"default_expression":"NULL::bigint","group":"shared","body_sha256":"438bea962cc7ddc548cf4f29b354b38d0d3208f0c5792acae2b606e4c79a0edd"},{"signature":"public.listing_contact_visible_v1(bigint)","name":"public.listing_contact_visible_v1","args":["p_conversation"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ba2976f4b0a465d3f0e409e673d30f083a147f5e1815a141f0ac473ac081609e"}]$specs$::jsonb;
 expected_policies constant jsonb := $policies$[{"relation":"business_members","polname":"Business members can read members","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((user_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM business_members bm\n  WHERE ((bm.business_account_id = business_members.business_account_id) AND (bm.user_id = auth.uid()) AND (bm.status = 'active'::text)))))","check_expression":null},{"relation":"business_members","polname":"Business owners can manage members","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"(EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = business_members.business_account_id) AND (business_accounts.owner_user_id = auth.uid()))))","check_expression":"(EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = business_members.business_account_id) AND (business_accounts.owner_user_id = auth.uid()))))"},{"relation":"business_members","polname":"contact_writer_lock","polcmd":"w","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":"false"},{"relation":"business_members","polname":"contact_writer_read","polcmd":"r","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":null},{"relation":"identities","polname":"Business members can read business identities","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_members\n  WHERE ((business_members.business_account_id = identities.business_account_id) AND (business_members.user_id = auth.uid()) AND (business_members.status = 'active'::text)))))","check_expression":null},{"relation":"identities","polname":"Business owners can manage business identities","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = identities.business_account_id) AND (business_accounts.owner_user_id = auth.uid())))))","check_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = identities.business_account_id) AND (business_accounts.owner_user_id = auth.uid())))))"},{"relation":"identities","polname":"Users can manage their private identities","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"((type = 'private'::text) AND (user_id = auth.uid()))","check_expression":"((type = 'private'::text) AND (user_id = auth.uid()))"},{"relation":"identities","polname":"Users can read their private identities","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((type = 'private'::text) AND (user_id = auth.uid()))","check_expression":null},{"relation":"identities","polname":"contact_writer_lock","polcmd":"w","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":"false"},{"relation":"identities","polname":"contact_writer_read","polcmd":"r","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":null}]$policies$::jsonb;
 item jsonb; proc_oid oid; p record; metadata jsonb; acl_roles text[];
 expected_args text[]; expected_config text[]; actual_config text[];
 base_ok boolean; original_ok boolean:=true; fixed_ok boolean:=true; shared_ok boolean:=true;
 acl_ok boolean:=true; role_ok boolean:=false; schemas_ok boolean:=false;
 trusted_ok boolean:=false; settings_ok boolean:=false; policies_ok boolean:=false;
 raw_probe text:='NOT_RUN'; probe_error text; helper_name_ok boolean:=false;
 helper_ready_ok boolean:=false; helper_name text; helper_ready boolean;
 actual_policies jsonb; shared_catalog jsonb:='[]'; changed_catalog jsonb:='[]';
 api_catalog jsonb:='[]'; roles_catalog jsonb; settings_catalog jsonb;
 state_name text:='unknown'; recognized boolean:=false; guards jsonb; fingerprints jsonb;
 name_count integer; error_state text;
BEGIN
 -- The existing base remains exact. Only the explicitly reviewed message guard
 -- has a second pinned state after this additive schema exists.
 IF to_regnamespace('messaging_private_v2') IS NOT NULL THEN
  SELECT jsonb_agg(CASE WHEN value->>'signature'='listing_contact_private.guard_message()'
   THEN jsonb_set(value,'{body_sha256}',to_jsonb('a2ac16ccb92fb05c5e1ddb2849fbf2c14e5ea00004916f60186f46733de63950'::text)) ELSE value END)
  INTO specs FROM jsonb_array_elements(specs);
 END IF;
 trusted_ok := current_user='postgres' AND session_user='postgres'
  AND current_setting('transaction_isolation')='read committed'
  AND current_setting('server_version_num')::integer>=170000
  AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres' AND rolbypassrls)
  AND has_schema_privilege('postgres','auth','USAGE')
  AND has_function_privilege('postgres','auth.uid()','EXECUTE');

 SELECT jsonb_build_object('role',jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,
  'super',r.rolsuper,'createdb',r.rolcreatedb,'createrole',r.rolcreaterole,
  'inherit',r.rolinherit,'replication',r.rolreplication,'bypassrls',r.rolbypassrls),
  'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),
   'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option)
   ORDER BY pg_get_userbyid(m.member),pg_get_userbyid(m.grantor))
   FROM pg_auth_members m WHERE m.roleid=r.oid),'[]'::jsonb)) INTO roles_catalog
 FROM pg_roles r WHERE r.rolname='selqiro_listing_contact_writer_v1';
 role_ok := EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_contact_writer_v1'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls)
  AND pg_has_role('postgres','selqiro_listing_contact_writer_v1','USAGE')
  AND pg_has_role('postgres','selqiro_listing_contact_writer_v1','SET')
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.roleid='selqiro_listing_contact_writer_v1'::regrole
   AND m.member<>'postgres'::regrole)
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member='selqiro_listing_contact_writer_v1'::regrole)
  AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
   AND pg_has_role(r.oid,'postgres','MEMBER'));

 schemas_ok := EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='listing_contact_private' AND nspowner='postgres'::regrole)
  AND EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='listing_publication_private' AND nspowner='postgres'::regrole)
  AND has_schema_privilege('selqiro_listing_contact_writer_v1','listing_contact_private','USAGE')
  AND NOT has_schema_privilege('selqiro_listing_contact_writer_v1','listing_contact_private','CREATE')
  AND NOT has_schema_privilege('selqiro_listing_contact_writer_v1','public','CREATE')
  AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role')
    AND (has_schema_privilege(r.oid,'listing_contact_private','USAGE')
      OR has_schema_privilege(r.oid,'listing_contact_private','CREATE')
      OR has_schema_privilege(r.oid,'listing_publication_private','USAGE')
      OR has_schema_privilege(r.oid,'listing_publication_private','CREATE')));

 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.singleton),'[]'::jsonb) INTO settings_catalog
 FROM listing_publication_private.hosted_preview_settings s;
 settings_ok := jsonb_array_length(settings_catalog)=1 AND EXISTS(
  SELECT 1 FROM listing_publication_private.hosted_preview_settings WHERE singleton
   AND project_ref='vyjletlmwoiwxsnsunlm' AND release_id='listing-publication-hosted-preview-v1'
   AND instance_id='2d088814-0900-448a-a9d1-7b05470cb1d2'::uuid
   AND enabled AND release_ready AND storage_authority_version='source-part-rfc3986-v1');

 -- These four known baseline policies plus private-identity and writer policies
 -- are compared structurally as pg_get_expr renders them under explicit public
 -- search_path. The raw legacy query must separately reproduce SQLSTATE 42P17.
 SELECT coalesce(jsonb_agg(jsonb_build_object('relation',c.relname,'polname',q.polname,
   'polcmd',q.polcmd,'polpermissive',q.polpermissive,
   'roles',ARRAY(SELECT CASE WHEN role_id=0 THEN 'public' ELSE pg_get_userbyid(role_id) END
      FROM unnest(q.polroles) role_id ORDER BY 1),
   'using_expression',pg_get_expr(q.polqual,q.polrelid),'check_expression',pg_get_expr(q.polwithcheck,q.polrelid))
   ORDER BY c.relname,q.polname),'[]'::jsonb) INTO actual_policies
 FROM pg_policy q JOIN pg_class c ON c.oid=q.polrelid
 WHERE c.relnamespace='public'::regnamespace AND c.relname IN('identities','business_members');
 policies_ok := actual_policies=expected_policies
  AND (SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
    AND c.relname IN('identities','business_members') AND c.relrowsecurity
    AND NOT c.relforcerowsecurity AND c.relowner='postgres'::regrole)=2;

 FOR item IN SELECT value FROM jsonb_array_elements(specs) LOOP
  proc_oid:=to_regprocedure(item->>'signature');
  SELECT count(*) INTO name_count FROM pg_proc x JOIN pg_namespace n ON n.oid=x.pronamespace
   WHERE n.nspname=split_part(item->>'name','.',1) AND x.proname=split_part(item->>'name','.',2);
  IF proc_oid IS NULL THEN
   IF item->>'group'='new' AND name_count=0 THEN fixed_ok:=false;
   ELSE original_ok:=false;fixed_ok:=false;shared_ok:=false; END IF;
   CONTINUE;
  END IF;
  SELECT x.*,l.lanname INTO p FROM pg_proc x JOIN pg_language l ON l.oid=x.prolang WHERE x.oid=proc_oid;
  SELECT coalesce(array_agg(value ORDER BY value),'{}'::text[]) INTO expected_config
   FROM jsonb_array_elements_text(item->'config');
  SELECT coalesce(array_agg(replace(value,' ','') ORDER BY replace(value,' ','')),'{}'::text[]) INTO actual_config
   FROM unnest(p.proconfig) value;
  SELECT coalesce(array_agg(value ORDER BY ordinal),'{}'::text[]) INTO expected_args
   FROM jsonb_array_elements_text(item->'args') WITH ORDINALITY AS a(value,ordinal);
  base_ok:=name_count=1 AND pg_get_userbyid(p.proowner)=item->>'owner'
   AND p.lanname=item->>'language' AND p.prorettype=to_regtype(item->>'result')
   AND coalesce(p.proargnames,'{}'::text[])=expected_args AND p.prokind='f'
   AND p.provolatile::text=item->>'volatility' AND p.proparallel='u'
   AND NOT p.proisstrict AND NOT p.proleakproof AND NOT p.proretset
   AND p.provariadic=0 AND p.prosupport=0 AND p.probin IS NULL
   AND p.procost=100 AND p.prorows=0
   AND p.proallargtypes IS NULL AND p.proargmodes IS NULL
   AND p.pronargdefaults=(item->>'defaults')::integer
   AND pg_get_expr(p.proargdefaults,0) IS NOT DISTINCT FROM item->>'default_expression'
   AND actual_config=expected_config;
  SELECT jsonb_build_object('signature',item->>'signature','body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'owner',pg_get_userbyid(p.proowner),'secdef',p.prosecdef,'config',actual_config,
   'args',coalesce(p.proargnames,'{}'::text[]),'result',p.prorettype::regtype::text,
   'volatility',p.provolatile,'language',p.lanname,'parallel',p.proparallel,'strict',p.proisstrict,
   'leakproof',p.proleakproof,'returns_set',p.proretset,'kind',p.prokind,
   'defaults',pg_get_expr(p.proargdefaults,0),'acl',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY a.grantee,a.grantor,a.privilege_type)
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) INTO metadata;
  IF item ? 'acl_roles' THEN
   SELECT coalesce(array_agg(DISTINCT CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END
      ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END),'{}'::text[]) INTO acl_roles
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a;
   base_ok:=base_ok AND acl_roles=ARRAY(SELECT value FROM jsonb_array_elements_text(item->'acl_roles') ORDER BY value)
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.privilege_type<>'EXECUTE' OR a.is_grantable OR a.grantor<>p.proowner);
   acl_ok:=acl_ok AND base_ok;
  END IF;
  IF item->>'group'='shared' THEN
   shared_ok:=shared_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   shared_catalog:=shared_catalog||jsonb_build_array(metadata);
  ELSIF item->>'group'='changed' THEN
   original_ok:=original_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   fixed_ok:=fixed_ok AND base_ok AND p.prosecdef=(item->>'fixed_secdef')::boolean
    AND metadata->>'body_sha256'=item->>'fixed_sha256';
   changed_catalog:=changed_catalog||jsonb_build_array(metadata);
   api_catalog:=api_catalog||jsonb_build_array(jsonb_build_object('signature',item->>'signature',
    'owner',metadata->'owner','acl',metadata->'acl'));
  ELSE
   original_ok:=false;
   fixed_ok:=fixed_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   changed_catalog:=changed_catalog||jsonb_build_array(metadata);
  END IF;
 END LOOP;

 -- No actor impersonation, JWT/session-token read, lock-bearing RPC invocation,
 -- conversation creation, or account/message/listing row read occurs here.
 IF trusted_ok AND role_ok AND schemas_ok THEN
  PERFORM set_config('role','selqiro_listing_contact_writer_v1',true);
  BEGIN
   PERFORM 1 FROM public.identities LIMIT 0;
   raw_probe:='00000';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS raw_probe=RETURNED_SQLSTATE;
  END;
  IF fixed_ok AND shared_ok AND acl_ok THEN
   BEGIN
    EXECUTE 'SELECT listing_contact_private.peer_name_hosted_v1(NULL::uuid)' INTO helper_name;
    EXECUTE 'SELECT listing_contact_private.peer_ready(NULL::uuid,NULL::uuid,NULL::uuid)' INTO helper_ready;
    helper_name_ok:=helper_name IS NULL;helper_ready_ok:=helper_ready IS FALSE;
   EXCEPTION WHEN OTHERS THEN
    helper_name_ok:=false;helper_ready_ok:=false;
   END;
  END IF;
  PERFORM set_config('role','none',true);
 END IF;
 IF original_ok AND NOT fixed_ok THEN state_name:='original';
 ELSIF fixed_ok AND NOT original_ok THEN state_name:='fixed'; END IF;
 guards:=jsonb_build_object('trusted_session',trusted_ok,'writer_role',role_ok,
  'private_schema_boundary',schemas_ok,'hosted_target',settings_ok,
  'known_legacy_policies',policies_ok,'shared_helpers_exact',shared_ok,
  'function_acl_and_metadata',acl_ok,'known_function_state',state_name<>'unknown',
  'legacy_recursion_confirmed',raw_probe='42P17',
  'fixed_private_reads',state_name='original' OR (helper_name_ok AND helper_ready_ok));
 recognized:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb);
 IF NOT recognized THEN state_name:='unknown'; END IF;
 fingerprints:=jsonb_build_object(
  'legacy_policies',encode(sha256(convert_to(actual_policies::text,'UTF8')),'hex'),
  'shared_helpers',encode(sha256(convert_to(shared_catalog::text,'UTF8')),'hex'),
  'writer_role',encode(sha256(convert_to(coalesce(roles_catalog,'null'::jsonb)::text,'UTF8')),'hex'),
  'api_boundary',encode(sha256(convert_to(jsonb_build_object('functions',api_catalog,'schemas',(
    SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)
      ORDER BY nspname) FROM pg_namespace WHERE nspname IN('listing_contact_private','listing_publication_private'))
    )::text,'UTF8')),'hex'),
  'hosted_settings',encode(sha256(convert_to(settings_catalog::text,'UTF8')),'hex'),
  'patched_functions',encode(sha256(convert_to(changed_catalog::text,'UTF8')),'hex'));
 PERFORM set_config('selqiro.contact_rls_report',jsonb_build_object(
  'format','selqiro-contact-rls-fix-v1','state',state_name,'recognized',recognized,'probe_code',raw_probe,
  'guards',guards,'fingerprints',fingerprints,'checks',jsonb_build_object(
   'original_functions_exact',original_ok,'fixed_functions_exact',fixed_ok,
   'private_null_name_read',helper_name_ok,'private_null_peer_read',helper_ready_ok))::text,true);
EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS error_state=RETURNED_SQLSTATE;
 PERFORM set_config('role','none',true);
 PERFORM set_config('selqiro.contact_rls_report',jsonb_build_object(
  'format','selqiro-contact-rls-fix-v1','state','unknown','recognized',false,'probe_code',error_state,
  'guards',jsonb_build_object('catalog_inspection_completed',false),
  'fingerprints','{}'::jsonb,'checks',jsonb_build_object('catalog_error',true))::text,true);
END $catalog_guard$;
DO $reader_guard$
DECLARE base jsonb:=current_setting('selqiro.contact_rls_report')::jsonb;
 p record; state_name text:='unknown'; known boolean:=false; columns_ok boolean;
 fingerprints jsonb:='{}'::jsonb; metadata jsonb; guards jsonb; item text;
 unknown_hash constant text:=encode(sha256(convert_to('unknown','UTF8')),'hex');
BEGIN
 SELECT count(*)=8 INTO columns_ok FROM (VALUES
  ('messages','listing_id','bigint'),('messages','listing_title','text'),
  ('messages','listing_image','text'),('messages','listing_price','text'),
  ('listings','id','bigint'),('listings','title','text'),
  ('listings','image','text'),('listings','price','text')
 ) expected(relation,column_name,column_type)
 JOIN pg_class c ON c.relnamespace='public'::regnamespace AND c.relname=expected.relation AND c.relkind='r'
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=expected.column_name AND NOT a.attisdropped
  AND format_type(a.atttypid,a.atttypmod)=expected.column_type;

 SELECT p1.*,l.lanname,pg_get_userbyid(p1.proowner) AS owner_name,
  pg_get_expr(p1.proargdefaults,0) AS defaults_expression,
  ARRAY(SELECT replace(x,' ','') FROM unnest(p1.proconfig) x ORDER BY replace(x,' ','')) AS settings,
  (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
   'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
   ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(p1.proacl,acldefault('f',p1.proowner))) a) AS acl
 INTO p FROM pg_proc p1 JOIN pg_language l ON l.oid=p1.prolang
 WHERE p1.oid=to_regprocedure('public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)');
 IF NOT FOUND THEN
  known:=NOT EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_my_listing_conversation_v2');
  IF known THEN state_name:='absent'; END IF;
  metadata:=jsonb_build_object('present',false);
 ELSE
  metadata:=jsonb_build_object('present',true,'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'owner',p.owner_name,'language',p.lanname,'secdef',p.prosecdef,'strict',p.proisstrict,'retset',p.proretset,
   'volatility',p.provolatile,'parallel',p.proparallel,'result',format_type(p.prorettype,NULL),
   'args',p.proargnames,'settings',p.settings,'defaults',p.defaults_expression,'acl',p.acl);
  known:=p.owner_name='selqiro_listing_contact_writer_v1' AND p.lanname='plpgsql'
   AND p.prosecdef AND NOT p.proisstrict AND NOT p.proretset AND p.provolatile='v' AND p.proparallel='u'
   AND p.prorettype='jsonb'::regtype AND p.pronargdefaults=2 AND p.defaults_expression='NULL::text, NULL::text'
   AND p.proargnames=ARRAY['p_expected_user_id','p_expected_identity_id','p_conversation_id','p_before_message_id','p_attachment_listing_id']
   AND p.settings=ARRAY['lock_timeout=2s','search_path=pg_catalog,public,auth,pg_temp']
   AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='740815c40c0c52eba205a30cb7e8267025c5e394aeea760556b8ce7ac711c0cd'
   AND (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_my_listing_conversation_v2')=1
   AND (SELECT array_agg(CASE WHEN a.grantee=0 THEN 'public'::text ELSE pg_get_userbyid(a.grantee)::text END ORDER BY CASE WHEN a.grantee=0 THEN 'public'::text ELSE pg_get_userbyid(a.grantee)::text END)
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)=ARRAY['authenticated','selqiro_listing_contact_writer_v1']
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE a.is_grantable OR a.privilege_type<>'EXECUTE' OR a.grantor<>p.proowner);
  IF known THEN state_name:='applied'; END IF;
 END IF;
 guards:=jsonb_build_object('base_fixed',base->>'state'='fixed' AND base->'recognized'='true'::jsonb,
  'reader_state_known',coalesce(known,false),'read_columns',coalesce(columns_ok,false));
 FOREACH item IN ARRAY ARRAY['legacy_policies','shared_helpers','writer_role','api_boundary','hosted_settings','patched_functions'] LOOP
  fingerprints:=fingerprints||jsonb_build_object(item,coalesce(base->'fingerprints'->>item,unknown_hash));
 END LOOP;
 fingerprints:=fingerprints||jsonb_build_object('reader',encode(sha256(convert_to(metadata::text,'UTF8')),'hex'));
 known:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb OR g.value='null'::jsonb);
 IF NOT known THEN state_name:='unknown'; END IF;
 PERFORM set_config('selqiro.message_cards_report',jsonb_build_object('format','selqiro-listing-message-cards-v1',
  'state',state_name,'recognized',known,'guards',guards,'fingerprints',fingerprints)::text,true);
EXCEPTION WHEN OTHERS THEN
 fingerprints:='{}'::jsonb;
 FOREACH item IN ARRAY ARRAY['legacy_policies','shared_helpers','writer_role','api_boundary','hosted_settings','patched_functions','reader'] LOOP
  fingerprints:=fingerprints||jsonb_build_object(item,unknown_hash);
 END LOOP;
 PERFORM set_config('selqiro.message_cards_report',jsonb_build_object('format','selqiro-listing-message-cards-v1',
  'state','unknown','recognized',false,'guards',jsonb_build_object('base_fixed',false,'reader_state_known',false,'read_columns',false),
  'fingerprints',fingerprints)::text,true);
END $reader_guard$;
DO $messaging_guard$
DECLARE
 expected_functions constant jsonb := $functions$[{"signature":"listing_contact_private.guard_message()","name":"guard_message","schema":"listing_contact_private","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, public, auth, pg_temp"],"body_sha256":"a2ac16ccb92fb05c5e1ddb2849fbf2c14e5ea00004916f60186f46733de63950","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.bucket_ready()","name":"bucket_ready","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":true,"volatility":"s","args":null,"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"bbff113436e34f7e251903262749066fab152206ad5470982ad77cb3201f8302","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.exact_thread(bigint, uuid, uuid)","name":"exact_thread","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"s","args":["p_conversation","p_user","p_identity"],"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"19fd6913a5e44248686e56a0151d7a953c0fbf7b603cfc2e2b65a21ac252fd23","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.guard_account_block()","name":"guard_account_block","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"83bd3c50a4d0bb2323e5dee7ed86032d506ea82e276b6127d3238bc96b37773a","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.identity_card(uuid)","name":"identity_card","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":true,"volatility":"s","args":["p_identity"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"62ceeedfd0a054f3563ed4e9abf8cf33bb2605dd3ee20bf53e9f35b4e0296bcc","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.photo_receipt(messaging_private_v2.photos)","name":"photo_receipt","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"s","args":["p"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"2530b94b02c3184d7297700808498d471b0df80d03d918260021d95b563aefc2","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.protect_attached_photo()","name":"protect_attached_photo","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"f5ff79e11810dc2fed2a039d1684f64cdfe055fa112fad91ef9f5e17ff670cc8","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.require_thread(bigint, uuid, uuid)","name":"require_thread","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","args":["p_conversation","p_user","p_identity"],"defaults":0,"default_expression":null,"result":"conversations","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"5f2487f6126fd6a17f67c6ec4b9de340840f8ac3f0585d5750a38c90396fbd36","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.safe_legacy_path(bigint, text)","name":"safe_legacy_path","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"i","args":["p_conversation","p_path"],"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"725be82b057829689f62d388837a4c405da02660524a727cc381397ed71901b3","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.set_block(uuid, uuid, bigint, boolean)","name":"set_block","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_user","p_identity","p_conversation","p_blocked"],"defaults":0,"default_expression":null,"result":"void","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"6d8edfb3963c7261644fddd9519c715d047b78b5037a0c387ea9b03cdeef08fc","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"public.cancel_my_message_photo_v2(uuid, uuid, text, uuid)","name":"cancel_my_message_photo_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_attachment_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"55a1216fe599b8a047bd299bcb24c153a51de0f764dbf8ede7912442b764c5d8","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.claim_message_photo_cleanup_v2(uuid, integer)","name":"claim_message_photo_cleanup_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_claim_key","p_limit"],"defaults":1,"default_expression":"3","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"21059a776ef44ea56bee5c1a15ec2ca229cab8d23064e56b73b1c3d91691f9f2","acl_roles":["postgres","service_role"]},{"signature":"public.claim_message_photo_upload_v2(uuid, uuid, uuid, text, uuid, text, bigint, integer, integer)","name":"claim_message_photo_upload_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_expected_user_id","p_expected_identity_id","p_source_sha256","p_claim_key","p_web_sha256","p_web_bytes","p_width","p_height"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"4b5eb65ca6095b5db082c83b182d639bf7c071a97ed6fbcb0aeec6494e25a54a","acl_roles":["postgres","service_role"]},{"signature":"public.finish_message_photo_cleanup_v2(uuid, uuid, boolean, text)","name":"finish_message_photo_cleanup_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_claim_key","p_removed","p_failure_code"],"defaults":1,"default_expression":"NULL::text","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"4780e8a3a1437763ad97d4dc72d40175b9e3e2ddf3da0f36bb41d83c667ffe4a","acl_roles":["postgres","service_role"]},{"signature":"public.finish_message_photo_upload_v2(uuid, uuid, text, text, bigint, integer, integer, text)","name":"finish_message_photo_upload_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_claim_key","p_outcome","p_web_sha256","p_web_bytes","p_width","p_height","p_failure_code"],"defaults":1,"default_expression":"NULL::text","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"f49f44e5d5dfa3ceb768c4bfeb9da6105efb4458d751bc7e0c3e2e83922dadca","acl_roles":["postgres","service_role"]},{"signature":"public.get_my_message_photo_binding_v2(uuid, uuid, text, text)","name":"get_my_message_photo_binding_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_message_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"fd00f01e0042ca0d8bae144047aaaed01f3af76e8c45a9814986a72bc24048e9","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.get_my_message_thread_v2(uuid, uuid, text, text, text)","name":"get_my_message_thread_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_before_message_id","p_attachment_listing_id"],"defaults":2,"default_expression":"NULL::text, NULL::text","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"2db77291a038a9092d1a1d6929b4eb929642f9beb6f8c4da2903930caf680ec9","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.hide_my_thread_v2(uuid, uuid, text)","name":"hide_my_thread_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"4c96a94b35d82b44cfa10bf69538979d92336f07cc7db040b618fb71b0e8ec23","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.list_my_message_threads_v2(uuid, uuid, timestamp with time zone, text)","name":"list_my_message_threads_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_before_updated_at","p_before_conversation_id"],"defaults":2,"default_expression":"NULL::timestamp with time zone, NULL::text","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"ea23465a4ad4da28151e04e3ddcb17356fed35ec34f065c29df6c73e1b1cbbf8","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.mark_my_thread_read_v2(uuid, uuid, text, text)","name":"mark_my_thread_read_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_through_message_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"6f38f871015c4996d6000c4fe07e3476f944687578fc31c869df324c6008ea5b","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.reserve_my_message_photo_v2(uuid, uuid, uuid, text, text, bigint, text)","name":"reserve_my_message_photo_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_source_sha256","p_source_bytes","p_source_mime"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"07f4ecb16970ca276efb8d191523eaa72a1b670c9c3aa4f208e49f12955ac3ec","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.send_my_message_v2(uuid, uuid, uuid, text, text, text, uuid)","name":"send_my_message_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_message","p_listing_id","p_attachment_id"],"defaults":2,"default_expression":"NULL::text, NULL::uuid","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"22669894a1de3dceac8d608a271ae7c459c16f2957af33b04b24fbf9365e1538","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.set_my_thread_block_v2(uuid, uuid, text, boolean)","name":"set_my_thread_block_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_blocked"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"2755d8475ddd0c5ee7e61d7e66e96919013202056d8473bb7a81b63ddabb2d81","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]}]$functions$::jsonb;
 expected_structure constant jsonb := $structure${"schema":{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"CREATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"USAGE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"USAGE"}],"owner":"postgres"},"tables":[{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"photos","owner":"postgres","columns":[{"name":"attachment_id","type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""},{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"request_key","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_sha256","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_bytes","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_mime","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"state","type":"text","default":"'reserved'::text","identity":"","not_null":true,"generated":""},{"name":"created_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""},{"name":"expires_at","type":"timestamp with time zone","default":"(clock_timestamp() + '00:30:00'::interval)","identity":"","not_null":true,"generated":""},{"name":"upload_key","type":"uuid","default":null,"identity":"","not_null":false,"generated":""},{"name":"web_sha256","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"web_bytes","type":"bigint","default":null,"identity":"","not_null":false,"generated":""},{"name":"width","type":"integer","default":null,"identity":"","not_null":false,"generated":""},{"name":"height","type":"integer","default":null,"identity":"","not_null":false,"generated":""},{"name":"message_id","type":"bigint","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_key","type":"uuid","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_lease_until","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"next_cleanup_at","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_attempts","type":"bigint","default":"0","identity":"","not_null":true,"generated":""},{"name":"last_cleanup_at","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"last_cleanup_removed","type":"boolean","default":null,"identity":"","not_null":false,"generated":""},{"name":"failure_code","type":"text","default":null,"identity":"","not_null":false,"generated":""}],"indexes":["CREATE INDEX photos_actor_created_v2 ON messaging_private_v2.photos USING btree (actor_user_id, created_at)","CREATE UNIQUE INDEX photos_actor_user_id_request_key_key ON messaging_private_v2.photos USING btree (actor_user_id, request_key)","CREATE INDEX photos_cleanup_v2 ON messaging_private_v2.photos USING btree (state, next_cleanup_at, expires_at)","CREATE UNIQUE INDEX photos_message_id_key ON messaging_private_v2.photos USING btree (message_id)","CREATE UNIQUE INDEX photos_pkey ON messaging_private_v2.photos USING btree (attachment_id)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"photos_actor_user_id_request_key_key","type":"u","validated":true,"definition":"UNIQUE (actor_user_id, request_key)"},{"name":"photos_check","type":"c","validated":true,"definition":"CHECK ((((upload_key IS NULL) AND (web_sha256 IS NULL) AND (web_bytes IS NULL) AND (width IS NULL) AND (height IS NULL)) OR ((upload_key IS NOT NULL) AND (web_sha256 IS NOT NULL) AND (web_bytes IS NOT NULL) AND (width IS NOT NULL) AND (height IS NOT NULL))))"},{"name":"photos_check1","type":"c","validated":true,"definition":"CHECK (((state <> ALL (ARRAY['uploading'::text, 'ready'::text, 'attached'::text])) OR (upload_key IS NOT NULL)))"},{"name":"photos_check2","type":"c","validated":true,"definition":"CHECK (((state = 'attached'::text) = (message_id IS NOT NULL)))"},{"name":"photos_check3","type":"c","validated":true,"definition":"CHECK (((state = 'tombstoned'::text) OR ((cleanup_key IS NULL) AND (cleanup_lease_until IS NULL) AND (next_cleanup_at IS NULL))))"},{"name":"photos_check4","type":"c","validated":true,"definition":"CHECK (((cleanup_key IS NULL) = (cleanup_lease_until IS NULL)))"},{"name":"photos_check5","type":"c","validated":true,"definition":"CHECK ((expires_at > created_at))"},{"name":"photos_cleanup_attempts_check","type":"c","validated":true,"definition":"CHECK ((cleanup_attempts >= 0))"},{"name":"photos_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT"},{"name":"photos_failure_code_check","type":"c","validated":true,"definition":"CHECK ((failure_code ~ '^[A-Z0-9_]{1,64}$'::text))"},{"name":"photos_height_check","type":"c","validated":true,"definition":"CHECK (((height >= 1) AND (height <= 1600)))"},{"name":"photos_message_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED"},{"name":"photos_message_id_key","type":"u","validated":true,"definition":"UNIQUE (message_id)"},{"name":"photos_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (attachment_id)"},{"name":"photos_request_key_check","type":"c","validated":true,"definition":"CHECK ((request_key <> '00000000-0000-0000-0000-000000000000'::uuid))"},{"name":"photos_source_bytes_check","type":"c","validated":true,"definition":"CHECK (((source_bytes >= 1) AND (source_bytes <= 1400000)))"},{"name":"photos_source_mime_check","type":"c","validated":true,"definition":"CHECK ((source_mime = 'image/webp'::text))"},{"name":"photos_source_sha256_check","type":"c","validated":true,"definition":"CHECK ((source_sha256 ~ '^[0-9a-f]{64}$'::text))"},{"name":"photos_state_check","type":"c","validated":true,"definition":"CHECK ((state = ANY (ARRAY['reserved'::text, 'uploading'::text, 'ready'::text, 'attached'::text, 'tombstoned'::text])))"},{"name":"photos_web_bytes_check","type":"c","validated":true,"definition":"CHECK (((web_bytes >= 1) AND (web_bytes <= 2000000)))"},{"name":"photos_web_sha256_check","type":"c","validated":true,"definition":"CHECK ((web_sha256 ~ '^[0-9a-f]{64}$'::text))"},{"name":"photos_width_check","type":"c","validated":true,"definition":"CHECK (((width >= 1) AND (width <= 1600)))"}]},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"read_watermarks","owner":"postgres","columns":[{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"through_message_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"updated_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""}],"indexes":["CREATE UNIQUE INDEX read_watermarks_pkey ON messaging_private_v2.read_watermarks USING btree (actor_user_id, identity_id, conversation_id)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"read_watermarks_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE"},{"name":"read_watermarks_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (actor_user_id, identity_id, conversation_id)"},{"name":"read_watermarks_through_message_id_check","type":"c","validated":true,"definition":"CHECK ((through_message_id > 0))"}]},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"send_receipts","owner":"postgres","columns":[{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"request_key","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"message_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"intent_sha256","type":"bytea","default":null,"identity":"","not_null":true,"generated":""},{"name":"created_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""}],"indexes":["CREATE UNIQUE INDEX send_receipts_message_id_key ON messaging_private_v2.send_receipts USING btree (message_id)","CREATE UNIQUE INDEX send_receipts_pkey ON messaging_private_v2.send_receipts USING btree (actor_user_id, request_key)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"send_receipts_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT"},{"name":"send_receipts_intent_sha256_check","type":"c","validated":true,"definition":"CHECK ((octet_length(intent_sha256) = 32))"},{"name":"send_receipts_message_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED"},{"name":"send_receipts_message_id_key","type":"u","validated":true,"definition":"UNIQUE (message_id)"},{"name":"send_receipts_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (actor_user_id, request_key)"},{"name":"send_receipts_request_key_check","type":"c","validated":true,"definition":"CHECK ((request_key <> '00000000-0000-0000-0000-000000000000'::uuid))"}]}],"triggers":[{"name":"messaging_account_block_v2","enabled":"O","definition":"CREATE TRIGGER messaging_account_block_v2 BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_account_block()"},{"name":"protect_attached_message_photo_v2","enabled":"O","definition":"CREATE TRIGGER protect_attached_message_photo_v2 BEFORE DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.protect_attached_photo()"}],"public_indexes":[{"name":"messaging_thread_activity_v2","owner":"postgres","definition":"CREATE INDEX messaging_thread_activity_v2 ON public.conversations USING btree (COALESCE(updated_at, created_at) DESC, id DESC)"},{"name":"messaging_thread_message_v2","owner":"postgres","definition":"CREATE INDEX messaging_thread_message_v2 ON public.messages USING btree (conversation_id, id DESC)"}],"storage_policy":[{"name":"message_attachments_v2_server_only","check":"(bucket_id <> 'message-attachments-v2'::text)","roles":["anon","authenticated"],"using":"(bucket_id <> 'message-attachments-v2'::text)","command":"*","permissive":false}]}$structure$::jsonb;
 protected_signatures constant jsonb := $protected$["public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)","public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)","public.get_my_listing_conversation_v1(uuid,uuid,text,text)","public.list_my_listing_conversations_v1(uuid,uuid,text)","listing_contact_private.require_peer(uuid,uuid)","listing_contact_private.peer_ready(uuid,uuid,uuid)","listing_contact_private.require_actor_hosted_v1(uuid,uuid)","listing_contact_private.peer_name_hosted_v1(uuid)","listing_publication_private.require_actor(uuid,uuid)","public.lock_listing_creation_actor_v1(uuid)","public.listing_actor_uid_hosted_v1()","listing_publication_private.assert_hosted_preview_actor(uuid)","listing_publication_private.hosted_storage_contract_ready()","public.current_user_has_identity_access(uuid)","listing_contact_private.require_member(bigint,uuid,uuid)","listing_contact_private.require_unblocked(uuid,uuid)","listing_contact_private.require_key(uuid)","listing_contact_private.positive_id(text)","listing_contact_private.guard_conversation()","listing_contact_private.guard_participant()","public.listing_contact_is_managed_v1(bigint,bigint)","public.listing_contact_visible_v1(bigint)","public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)"]$protected$::jsonb;
 base jsonb:=current_setting('selqiro.message_cards_report')::jsonb;
 actual_functions jsonb;actual_structure jsonb;protected_functions jsonb;storage_policies jsonb;legacy_buckets jsonb;existing_triggers jsonb;
 invariants jsonb:='{}'::jsonb;fingerprints jsonb:='{}'::jsonb;guards jsonb;
 fresh boolean;installed boolean;columns_ok boolean;metadata_ok boolean;table_semantics_ok boolean;trigger_ok boolean;storage_rls boolean;storage_authority boolean;
 storage_setting text;storage_policy_grants jsonb;storage_grant_tables jsonb;
 bucket_state text:='unknown';state_name text:='unknown';recognized boolean:=false;item text;error_state text;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.signature),'[]'::jsonb) INTO actual_functions FROM (SELECT n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')' signature,
 p.proname name,n.nspname schema,pg_get_userbyid(p.proowner) owner,l.lanname language,p.prosecdef secdef,p.provolatile volatility,
 p.proargnames args,p.pronargdefaults defaults,pg_get_expr(p.proargdefaults,0) default_expression,
 pg_get_function_result(p.oid) result,p.proconfig config,
 encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') body_sha256,
 ARRAY(SELECT CASE WHEN acl.grantee=0 THEN 'public' ELSE pg_get_userbyid(acl.grantee) END FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 WHERE acl.privilege_type='EXECUTE' ORDER BY 1) acl_roles
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='public' AND p.proname IN('list_my_message_threads_v2','get_my_message_thread_v2','send_my_message_v2','mark_my_thread_read_v2','hide_my_thread_v2','set_my_thread_block_v2',
 'reserve_my_message_photo_v2','claim_message_photo_upload_v2','finish_message_photo_upload_v2','cancel_my_message_photo_v2','get_my_message_photo_binding_v2','claim_message_photo_cleanup_v2','finish_message_photo_cleanup_v2'))
 OR n.nspname='messaging_private_v2' OR (n.nspname='listing_contact_private' AND p.proname='guard_message') ORDER BY 1) q;
 SELECT q.structure INTO actual_structure FROM (SELECT jsonb_build_object(
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
) AS structure) q;
 SELECT count(*)=22 INTO columns_ok FROM (VALUES ('messages','id','bigint'),('messages','conversation_id','bigint'),('messages','sender_id','uuid'),('messages','sender_identity_id','uuid'),('messages','message','text'),('messages','created_at','timestamp with time zone'),('messages','image_path','text'),('messages','image_url','text'),('conversations','id','bigint'),('conversations','buyer_id','uuid'),('conversations','seller_id','uuid'),('conversations','buyer_identity_id','uuid'),('conversations','seller_identity_id','uuid'),('conversations','updated_at','timestamp with time zone'),('conversations','created_at','timestamp with time zone'),('conversations','archived_at','timestamp with time zone'),('conversation_participants','conversation_id','bigint'),('conversation_participants','user_id','uuid'),('conversation_participants','identity_id','uuid'),('conversation_participants','last_read_at','timestamp with time zone'),('conversation_participants','deleted_at','timestamp with time zone'),('identities','avatar_url','text')) e(relation,name,type)
 JOIN pg_class c ON c.relnamespace='public'::regnamespace AND c.relname=e.relation AND c.relkind='r'
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=e.name AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod)=e.type;
 -- Final message IDs are assigned under the conversation lock. Cached ranges
 -- across pooled sessions would invalidate that visible-ID ordering guarantee.
 columns_ok:=columns_ok AND EXISTS(SELECT 1 FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid
  WHERE c.relnamespace='public'::regnamespace AND c.relname='messages_id_seq'
  AND s.seqtypid='bigint'::regtype AND s.seqincrement=1 AND s.seqmin=1 AND s.seqcache=1 AND NOT s.seqcycle
  AND has_sequence_privilege('selqiro_listing_contact_writer_v1',s.seqrelid,'USAGE'));
 SELECT coalesce(jsonb_agg(jsonb_build_object('signature',s.value,'definition',pg_get_functiondef(p.oid),
   'acl',p.proacl::text) ORDER BY s.value),'[]'::jsonb) INTO protected_functions
 FROM jsonb_array_elements_text(protected_signatures) s(value) JOIN pg_proc p ON p.oid=to_regprocedure(s.value);
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
   'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
   'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb)
 INTO storage_policies FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname<>'message_attachments_v2_server_only';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'file_size_limit',b.file_size_limit,'allowed_mime_types',b.allowed_mime_types) ORDER BY b.id),'[]'::jsonb)
 INTO legacy_buckets FROM storage.buckets b WHERE b.id<>'message-attachments-v2';
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
 INTO existing_triggers FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND NOT t.tgisinternal
  AND t.tgname NOT IN('protect_attached_message_photo_v2','messaging_account_block_v2');
 trigger_ok:=jsonb_array_length(existing_triggers)=1 AND existing_triggers->0->>'name'='guard_listing_contact'
  AND existing_triggers->0->>'enabled'='O' AND existing_triggers->0->>'definition'=
  'CREATE TRIGGER guard_listing_contact BEFORE INSERT OR DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_message()';
 -- BEGIN STORAGE POLICY AUTHORITY
 SELECT c.relrowsecurity,pg_has_role('postgres',c.relowner,'USAGE') INTO storage_rls,storage_authority FROM pg_class c WHERE c.oid='storage.objects'::regclass;
 -- Supabase may delegate policy management without inheriting the table owner.
 -- A registered SIGHUP-only Supautils setting is distinct from an arbitrary
 -- custom GUC placeholder. Its grant is for this exact current user and table.
 IF storage_authority IS NOT TRUE AND current_user='postgres' THEN
  storage_authority:=false;
  BEGIN
   SELECT s.setting INTO storage_setting FROM pg_catalog.pg_settings s
    WHERE s.name='supautils.policy_grants' AND s.context='sighup' AND s.vartype='string';
   IF FOUND THEN
    storage_policy_grants:=storage_setting::jsonb;
    IF jsonb_typeof(storage_policy_grants)='object' THEN
     IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g WHERE jsonb_typeof(g.value)<>'array') THEN
      IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g
       CROSS JOIN LATERAL jsonb_array_elements(g.value) t WHERE jsonb_typeof(t.value)<>'string') THEN
       storage_grant_tables:=storage_policy_grants->current_user::text;
       IF jsonb_typeof(storage_grant_tables)='array' THEN
        -- Resolve a table NAME like Supautils, not regclass's numeric-OID input.
        SELECT coalesce(bool_or(pg_catalog.to_regclass((SELECT string_agg(pg_catalog.quote_ident(p.part),'.' ORDER BY p.ordinal)
          FROM unnest(pg_catalog.parse_ident(t.value,true)) WITH ORDINALITY p(part,ordinal)))='storage.objects'::regclass),false)
         INTO storage_authority FROM jsonb_array_elements_text(storage_grant_tables) t(value);
       END IF;
      END IF;
     END IF;
    END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN
   storage_authority:=false;
  END;
 END IF;
 -- END STORAGE POLICY AUTHORITY
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2') THEN bucket_state:='absent';
 ELSIF EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]) THEN bucket_state:='ready'; END IF;
 fresh:=to_regnamespace('messaging_private_v2') IS NULL
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(actual_functions) f WHERE f->>'signature'<>'listing_contact_private.guard_message()')
  AND actual_structure->'tables'='[]'::jsonb AND actual_structure->'public_indexes'='[]'::jsonb AND actual_structure->'triggers'='[]'::jsonb
  AND actual_structure->'storage_policy'='null'::jsonb;
 -- Compare all function bodies, argument names/types/defaults, return types,
 -- owners, settings and role ACLs, and reject unexpected overloads/helpers.
 metadata_ok:=NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE (n.nspname='messaging_private_v2' OR EXISTS(SELECT 1 FROM jsonb_array_elements(expected_functions) f WHERE f->>'schema'=n.nspname AND f->>'name'=p.proname))
  AND (p.proisstrict OR p.proretset OR p.proleakproof OR p.proparallel<>'u' OR p.prosupport<>0
   OR EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.is_grantable OR a.privilege_type<>'EXECUTE' OR a.grantor<>p.proowner)));
 -- PostgreSQL 18 adds named NOT NULL rows to pg_constraint. Column attnotnull
 -- is pinned on both supported representations; omit only the duplicate rows
 -- from the canonical JSON, while checking their full ordinary semantics here.
 table_semantics_ok:=NOT EXISTS(SELECT 1 FROM pg_inherits i JOIN pg_class c
  ON c.oid=i.inhrelid OR c.oid=i.inhparent JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='messaging_private_v2')
  AND NOT EXISTS(SELECT 1 FROM pg_constraint q JOIN pg_class c ON c.oid=q.conrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND q.contype='n'
   AND (NOT q.convalidated OR NOT coalesce((to_jsonb(q)->>'conenforced')::boolean,true) OR q.condeferrable OR q.condeferred
    OR NOT q.conislocal OR q.coninhcount<>0 OR q.conparentid<>0 OR q.connoinherit
    OR q.conkey IS NULL OR cardinality(q.conkey)<>1
    OR NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum=q.conkey[1]
     AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull)))
  AND (current_setting('server_version_num')::integer<180000 OR NOT EXISTS(
   SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull
    AND (SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n' AND q.conkey=ARRAY[a.attnum]::smallint[])<>1));
 installed:=actual_functions=expected_functions AND actual_structure=expected_structure AND metadata_ok AND table_semantics_ok;
 guards:=jsonb_build_object('base_contract',base->>'state'='applied' AND base->'recognized'='true'::jsonb,
  'required_columns',coalesce(columns_ok,false),'existing_message_triggers',coalesce(trigger_ok,false),
  'storage_row_security',coalesce(storage_rls,false),'storage_policy_authority',coalesce(storage_authority,false),
  'known_object_state',coalesce(fresh OR installed,false),
  'bucket_contract',bucket_state='ready' OR (fresh AND bucket_state='absent'));
 recognized:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb OR g.value='null'::jsonb);
 IF recognized AND fresh THEN state_name:='absent'; ELSIF recognized AND installed THEN state_name:='applied'; END IF;
 FOREACH item IN ARRAY ARRAY['legacy_policies','writer_role','api_boundary','hosted_settings','patched_functions','reader'] LOOP
  invariants:=invariants||jsonb_build_object(item,base->'fingerprints'->>item);
 END LOOP;
 invariants:=invariants||jsonb_build_object('protected_functions',encode(sha256(convert_to(protected_functions::text,'UTF8')),'hex'),
  'legacy_storage_policies',encode(sha256(convert_to(storage_policies::text,'UTF8')),'hex'),
  'legacy_buckets',encode(sha256(convert_to(legacy_buckets::text,'UTF8')),'hex'),
  'existing_message_triggers',encode(sha256(convert_to(existing_triggers::text,'UTF8')),'hex'),
  'public_schema_acl',(SELECT encode(sha256(convert_to(coalesce(nspacl::text,''),'UTF8')),'hex') FROM pg_namespace WHERE nspname='public'));
 fingerprints:=jsonb_build_object('new_functions',encode(sha256(convert_to(actual_functions::text,'UTF8')),'hex'),
  'new_structure',encode(sha256(convert_to(actual_structure::text,'UTF8')),'hex'),
  'new_guard',(SELECT value->>'body_sha256' FROM jsonb_array_elements(actual_functions) WHERE value->>'signature'='listing_contact_private.guard_message()'));
 PERFORM set_config('selqiro.messaging_restore_report',jsonb_build_object('format','selqiro-messaging-restore-v2','state',state_name,
  'recognized',recognized,'bucket_state',bucket_state,'ready_to_apply',state_name='absent' AND bucket_state='ready',
  'required_bucket',jsonb_build_object('id','message-attachments-v2','name','message-attachments-v2','public',false,'file_size_limit',2000000,'allowed_mime_types',jsonb_build_array('image/webp')),
  'guards',guards,'invariants',invariants,'fingerprints',fingerprints)::text,true);
EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS error_state=RETURNED_SQLSTATE;
 PERFORM set_config('role','none',true);
 PERFORM set_config('selqiro.messaging_restore_report',jsonb_build_object('format','selqiro-messaging-restore-v2','state','unknown',
  'recognized',false,'bucket_state','unknown','ready_to_apply',false,'probe_code',error_state,
  'guards',jsonb_build_object('catalog_inspection_completed',false),'invariants','{}'::jsonb,'fingerprints','{}'::jsonb)::text,true);
END $messaging_guard$;
DO $before$
DECLARE r jsonb:=current_setting('selqiro.messaging_restore_report')::jsonb;
BEGIN
 IF r->>'state'<>'absent' OR r->'recognized'<>'true'::jsonb OR r->'ready_to_apply'<>'true'::jsonb THEN
  RAISE EXCEPTION 'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED' USING ERRCODE='55000'; END IF;
 PERFORM set_config('selqiro.messaging_restore_before',r::text,true);
END $before$;
-- Controlled messaging restoration. Include only inside apply.sql's guarded
-- transaction. Existing message content and all v1 API definitions are retained.
CREATE SCHEMA messaging_private_v2;
REVOKE ALL ON SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA messaging_private_v2 TO selqiro_listing_contact_writer_v1;
ALTER DEFAULT PRIVILEGES IN SCHEMA messaging_private_v2 REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE messaging_private_v2.read_watermarks (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 through_message_id bigint NOT NULL CHECK(through_message_id>0),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,identity_id,conversation_id)
);
CREATE TABLE messaging_private_v2.send_receipts (
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL, request_key uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 message_id bigint NOT NULL UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 intent_sha256 bytea NOT NULL CHECK(octet_length(intent_sha256)=32),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(actor_user_id,request_key),
 CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE TABLE messaging_private_v2.photos (
 attachment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL, identity_id uuid NOT NULL,
 conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE RESTRICT,
 request_key uuid NOT NULL CHECK(request_key<>'00000000-0000-0000-0000-000000000000'::uuid),
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[0-9a-f]{64}$'),
 source_bytes bigint NOT NULL CHECK(source_bytes BETWEEN 1 AND 1400000),
 source_mime text NOT NULL CHECK(source_mime='image/webp'),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','uploading','ready','attached','tombstoned')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '30 minutes',
 upload_key uuid,
 web_sha256 text CHECK(web_sha256 ~ '^[0-9a-f]{64}$'),
 web_bytes bigint CHECK(web_bytes BETWEEN 1 AND 2000000),
 width integer CHECK(width BETWEEN 1 AND 1600), height integer CHECK(height BETWEEN 1 AND 1600),
 message_id bigint UNIQUE REFERENCES public.messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 cleanup_key uuid, cleanup_lease_until timestamptz, next_cleanup_at timestamptz,
 cleanup_attempts bigint NOT NULL DEFAULT 0 CHECK(cleanup_attempts>=0),
 last_cleanup_at timestamptz, last_cleanup_removed boolean,
 failure_code text CHECK(failure_code ~ '^[A-Z0-9_]{1,64}$'),
 UNIQUE(actor_user_id,request_key),
 CHECK((upload_key IS NULL AND web_sha256 IS NULL AND web_bytes IS NULL AND width IS NULL AND height IS NULL)
  OR (upload_key IS NOT NULL AND web_sha256 IS NOT NULL AND web_bytes IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)),
 CHECK(state NOT IN('uploading','ready','attached') OR upload_key IS NOT NULL),
 CHECK((state='attached')=(message_id IS NOT NULL)),
 CHECK(state='tombstoned' OR (cleanup_key IS NULL AND cleanup_lease_until IS NULL AND next_cleanup_at IS NULL)),
 CHECK((cleanup_key IS NULL)=(cleanup_lease_until IS NULL)),
 CHECK(expires_at>created_at)
);
CREATE INDEX photos_actor_created_v2 ON messaging_private_v2.photos(actor_user_id,created_at);
CREATE INDEX photos_cleanup_v2 ON messaging_private_v2.photos(state,next_cleanup_at,expires_at);
-- Existing content stays in public.messages. These indexes serve bounded paging.
CREATE INDEX messaging_thread_activity_v2 ON public.conversations((coalesce(updated_at,created_at)) DESC,id DESC);
CREATE INDEX messaging_thread_message_v2 ON public.messages(conversation_id,id DESC);

ALTER TABLE messaging_private_v2.read_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_private_v2.send_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging_private_v2.photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON messaging_private_v2.read_watermarks,messaging_private_v2.send_receipts,messaging_private_v2.photos TO selqiro_listing_contact_writer_v1;
CREATE POLICY controlled_writer ON messaging_private_v2.read_watermarks FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY controlled_writer ON messaging_private_v2.send_receipts FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);
CREATE POLICY controlled_writer ON messaging_private_v2.photos FOR ALL TO selqiro_listing_contact_writer_v1 USING(true) WITH CHECK(true);

-- Two exact account/identity participants are authoritative for both historical
-- and managed threads. No user-only, null-identity, group or guessed membership.
CREATE FUNCTION messaging_private_v2.exact_thread(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM public.conversations c
  WHERE c.id=p_conversation AND c.buyer_id IS NOT NULL AND c.seller_id IS NOT NULL
   AND c.buyer_identity_id IS NOT NULL AND c.seller_identity_id IS NOT NULL
   AND c.buyer_id<>c.seller_id AND c.buyer_identity_id<>c.seller_identity_id
   AND ((c.buyer_id=p_user AND c.buyer_identity_id=p_identity) OR (c.seller_id=p_user AND c.seller_identity_id=p_identity))
   AND (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id=c.id)=2
   AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id=c.buyer_id AND cp.identity_id=c.buyer_identity_id)
   AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=c.id AND cp.user_id=c.seller_id AND cp.identity_id=c.seller_identity_id)
   AND NOT EXISTS(SELECT 1 FROM listing_contact_private.channels ch WHERE ch.conversation_id=c.id
    AND NOT ((ch.first_user_id=c.buyer_id AND ch.first_identity_id=c.buyer_identity_id AND ch.second_user_id=c.seller_id AND ch.second_identity_id=c.seller_identity_id)
     OR (ch.second_user_id=c.buyer_id AND ch.second_identity_id=c.buyer_identity_id AND ch.first_user_id=c.seller_id AND ch.first_identity_id=c.seller_identity_id))));
$f$;
CREATE FUNCTION messaging_private_v2.require_thread(p_conversation bigint,p_user uuid,p_identity uuid)
RETURNS public.conversations LANGUAGE plpgsql SET search_path=pg_catalog,pg_temp AS $f$
DECLARE c public.conversations%ROWTYPE;
BEGIN
 IF NOT messaging_private_v2.exact_thread(p_conversation,p_user,p_identity) THEN
  RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO c FROM public.conversations WHERE id=p_conversation;
 RETURN c;
END $f$;
CREATE FUNCTION messaging_private_v2.identity_card(p_identity uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('identity_id',p_identity,'name',coalesce(nullif(left(i.display_name,200),''),'Kasutaja'),
  'avatar_url',CASE WHEN length(i.avatar_url)<=2048 AND i.avatar_url ~ '^https://' THEN i.avatar_url ELSE NULL END)
 FROM (VALUES(1)) AS one(n) LEFT JOIN public.identities i ON i.id=p_identity;
$f$;
CREATE FUNCTION messaging_private_v2.safe_legacy_path(p_conversation bigint,p_path text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT coalesce(p_path ~ ('^'||p_conversation::text||'/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$')
  AND strpos(p_path,'..')=0 AND length(p_path)<=230,false);
$f$;
CREATE FUNCTION messaging_private_v2.photo_receipt(p messaging_private_v2.photos)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,pg_temp AS $f$
 SELECT jsonb_build_object('schema_version',2,'actor_user_id',p.actor_user_id,'identity_id',p.identity_id,
  'conversation_id',p.conversation_id::text,'request_key',p.request_key,'attachment_id',p.attachment_id,
  'state',p.state,'bucket','message-attachments-v2','path',p.conversation_id::text||'/'||p.attachment_id::text||'.webp',
  'upload_key',p.upload_key,'source_sha256',p.source_sha256,'source_bytes',p.source_bytes,'source_mime',p.source_mime,
  'web_sha256',p.web_sha256,'web_bytes',p.web_bytes,'width',p.width,'height',p.height,'expires_at',p.expires_at);
$f$;
CREATE FUNCTION messaging_private_v2.bucket_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $f$
 SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false
  AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]);
$f$;

CREATE FUNCTION public.list_my_message_threads_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_before_updated_at timestamptz DEFAULT NULL,p_before_conversation_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE before_id bigint;items jsonb;cursor jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 IF (p_before_updated_at IS NULL)<>(p_before_conversation_id IS NULL) OR (p_before_updated_at IS NOT NULL AND NOT isfinite(p_before_updated_at)) THEN
  RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 IF p_before_conversation_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_conversation_id); END IF;
 WITH page AS MATERIALIZED(SELECT c.*,coalesce(c.updated_at,c.created_at) activity_at,cp.last_read_at,
   CASE WHEN c.buyer_id=p_expected_user_id THEN c.seller_id ELSE c.buyer_id END peer_user,
   CASE WHEN c.buyer_id=p_expected_user_id THEN c.seller_identity_id ELSE c.buyer_identity_id END peer_identity
  FROM public.conversations c JOIN public.conversation_participants cp ON cp.conversation_id=c.id
   AND cp.user_id=p_expected_user_id AND cp.identity_id=p_expected_identity_id AND cp.deleted_at IS NULL
  WHERE messaging_private_v2.exact_thread(c.id,p_expected_user_id,p_expected_identity_id)
   AND (before_id IS NULL OR (coalesce(c.updated_at,c.created_at),c.id)<(p_before_updated_at,before_id))
  ORDER BY coalesce(c.updated_at,c.created_at) DESC,c.id DESC LIMIT 51),
 shown AS MATERIALIZED(SELECT * FROM page ORDER BY activity_at DESC,id DESC LIMIT 50)
 SELECT coalesce(jsonb_agg(jsonb_build_object('conversation_id',s.id::text,'peer',messaging_private_v2.identity_card(s.peer_identity),
   'updated_at',s.activity_at,'listing_title',left(s.listing_title_snapshot,200),
   'preview',jsonb_build_object('text',left(coalesce(latest.message,''),180),'has_image',messaging_private_v2.safe_legacy_path(s.id,latest.image_path)),
   'unread',EXISTS(SELECT 1 FROM public.messages m WHERE m.conversation_id=s.id
     AND NOT coalesce(m.sender_id=p_expected_user_id AND m.sender_identity_id IS NOT DISTINCT FROM p_expected_identity_id,false)
     AND CASE WHEN w.through_message_id IS NOT NULL THEN m.id>w.through_message_id ELSE s.last_read_at IS NULL OR m.created_at>s.last_read_at END),
   'can_send',listing_contact_private.peer_ready(s.peer_user,s.peer_identity,p_expected_user_id)) ORDER BY s.activity_at DESC,s.id DESC),'[]'::jsonb),
  CASE WHEN (SELECT count(*) FROM page)>50 THEN
   (SELECT jsonb_build_object('updated_at',activity_at,'conversation_id',id::text) FROM shown ORDER BY activity_at,id LIMIT 1) ELSE NULL END
 INTO items,cursor FROM shown s
 LEFT JOIN messaging_private_v2.read_watermarks w ON w.actor_user_id=p_expected_user_id AND w.identity_id=p_expected_identity_id AND w.conversation_id=s.id
 LEFT JOIN LATERAL(SELECT m.message,m.image_path,m.image_url FROM public.messages m WHERE m.conversation_id=s.id ORDER BY m.id DESC LIMIT 1) latest ON true;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'actor',messaging_private_v2.identity_card(p_expected_identity_id),'conversations',items,'next_cursor',cursor);
END $f$;

CREATE FUNCTION public.get_my_message_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,
 p_conversation_id text,p_before_message_id text DEFAULT NULL,p_attachment_listing_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;before_id bigint;lid bigint;c public.conversations%ROWTYPE;peer_u uuid;peer_i uuid;items jsonb;next_id text;attachment jsonb;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_before_message_id IS NOT NULL THEN before_id:=listing_contact_private.positive_id(p_before_message_id); END IF;
 IF p_attachment_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_attachment_listing_id); END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO c FROM public.conversations WHERE id=cid FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 -- Limit both row count and cumulative encoded message JSON. Only genuinely
 -- oversized legacy text is explicitly marked; normal historical text survives.
 WITH page AS MATERIALIZED(SELECT m.* FROM public.messages m WHERE m.conversation_id=cid
  AND (before_id IS NULL OR m.id<before_id) ORDER BY m.id DESC LIMIT 51),
 enriched AS MATERIALIZED(SELECT m.id,jsonb_build_object('id',m.id::text,
   'mine',coalesce(m.sender_id=p_expected_user_id AND m.sender_identity_id=p_expected_identity_id,false),
   'text',left(coalesce(m.message,''),20000),'text_truncated',char_length(coalesce(m.message,''))>20000,'created_at',m.created_at,
   'listing',CASE WHEN m.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',m.listing_id::text,
    'title',left(m.listing_title,200),'image',CASE WHEN length(m.listing_image)<=2048 THEN m.listing_image ELSE NULL END,'price',left(m.listing_price,200)) END,
   'image',CASE WHEN ph.attachment_id IS NOT NULL THEN jsonb_build_object('kind','v2','attachment_id',ph.attachment_id,'width',ph.width,'height',ph.height)
    WHEN messaging_private_v2.safe_legacy_path(cid,m.image_path) THEN jsonb_build_object('kind','legacy','attachment_id',NULL,'width',NULL,'height',NULL) ELSE NULL END) payload
  FROM page m LEFT JOIN messaging_private_v2.photos ph ON ph.message_id=m.id AND ph.conversation_id=cid AND ph.state='attached'
   AND ph.actor_user_id=m.sender_id AND ph.identity_id=m.sender_identity_id
   AND m.image_path=cid::text||'/'||ph.attachment_id::text||'.webp'),
 sized AS(SELECT *,row_number() OVER(ORDER BY id DESC) ordinal,
  sum(octet_length(payload::text)) OVER(ORDER BY id DESC) total_bytes FROM enriched),
 shown AS MATERIALIZED(SELECT * FROM sized WHERE ordinal<=50 AND total_bytes<=1400000)
 SELECT coalesce(jsonb_agg(payload ORDER BY id),'[]'::jsonb),
  CASE WHEN EXISTS(SELECT 1 FROM page WHERE id<(SELECT min(id) FROM shown)) THEN min(id)::text ELSE NULL END
 INTO items,next_id FROM shown;
 SELECT jsonb_build_object('id',l.id::text,'title',left(l.title,200),'image',CASE WHEN length(l.image)<=2048 THEN l.image ELSE NULL END,'price',left(l.price,200))
 INTO attachment FROM public.listings l WHERE l.id=lid AND l.status='active' AND l.active_until IS NOT NULL AND l.active_until>clock_timestamp()
  AND ((l.user_id=c.buyer_id AND l.identity_id=c.buyer_identity_id) OR (l.user_id=c.seller_id AND l.identity_id=c.seller_identity_id))
  AND (NOT public.listing_contact_is_managed_v1(cid,l.id) OR EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=l.id AND p.state='published'));
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'actor',messaging_private_v2.identity_card(p_expected_identity_id),'peer',messaging_private_v2.identity_card(peer_i),
  'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id),
  'blocked_by_me',EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id=p_expected_user_id AND blocked_id=peer_u),
  'listing',CASE WHEN c.listing_id IS NULL THEN NULL ELSE jsonb_build_object('id',c.listing_id::text,'title',left(c.listing_title_snapshot,200)) END,
  'messages',items,'next_before_message_id',next_id,'attachment_listing_id',p_attachment_listing_id,'attachment_listing',attachment);
END $f$;

CREATE FUNCTION public.send_my_message_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_message text,p_listing_id text DEFAULT NULL,p_attachment_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;lid bigint;c public.conversations%ROWTYPE;old messaging_private_v2.send_receipts%ROWTYPE;
 l public.listings%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;digest bytea;mid bigint;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_listing_id IS NOT NULL THEN lid:=listing_contact_private.positive_id(p_listing_id); END IF;
 IF p_message IS NULL OR char_length(p_message)>5000 OR octet_length(p_message)>20000
 OR (btrim(p_message,E' \t\r\n')='' AND p_attachment_id IS NULL) THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 digest:=sha256(convert_to(jsonb_build_object('conversation_id',cid::text,'listing_id',p_listing_id,'message',p_message,'attachment_id',p_attachment_id)::text,'UTF8'));
 SELECT * INTO old FROM messaging_private_v2.send_receipts WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key;
 IF FOUND THEN
  IF old.identity_id IS DISTINCT FROM p_expected_identity_id OR old.conversation_id<>cid OR old.intent_sha256<>digest THEN
   RAISE EXCEPTION 'message_request_conflict' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
   'conversation_id',cid::text,'action','send','message_id',old.message_id::text,'request_key',p_request_key,'replayed',true);
 END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);
 PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- Listing -> conversation -> attachment is the lock order. Existing terminal
 -- listing deletion uses listing -> conversation; no network occurs under locks.
 IF lid IS NOT NULL THEN
  SELECT * INTO l FROM public.listings WHERE id=lid FOR SHARE;
  IF NOT FOUND OR l.status<>'active' OR l.active_until IS NULL OR l.active_until<=clock_timestamp()
   OR NOT ((l.user_id=c.buyer_id AND l.identity_id=c.buyer_identity_id) OR (l.user_id=c.seller_id AND l.identity_id=c.seller_identity_id))
   OR (public.listing_contact_is_managed_v1(cid,lid) AND NOT EXISTS(SELECT 1 FROM listing_publication_private.publications p WHERE p.listing_id=lid AND p.state='published')) THEN
   RAISE EXCEPTION 'message_listing_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(cid,p_expected_user_id,p_expected_identity_id)
 OR (lid IS NOT NULL AND l.active_until<=clock_timestamp()) THEN RAISE EXCEPTION 'message_thread_unavailable' USING ERRCODE='42501'; END IF;
 mid:=nextval('public.messages_id_seq');t:=clock_timestamp();
 IF p_attachment_id IS NOT NULL THEN
  SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
  IF NOT FOUND OR ph.actor_user_id<>p_expected_user_id OR ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid
   OR ph.state<>'ready' OR ph.expires_at<=t OR NOT messaging_private_v2.bucket_ready() THEN
   RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
  -- The deferred FK and insert trigger bind this exact message ID atomically.
  UPDATE messaging_private_v2.photos SET state='attached',message_id=mid WHERE attachment_id=p_attachment_id;
 END IF;
 INSERT INTO messaging_private_v2.send_receipts(actor_user_id,identity_id,request_key,conversation_id,message_id,intent_sha256)
 VALUES(p_expected_user_id,p_expected_identity_id,p_request_key,cid,mid,digest);
 INSERT INTO public.messages(id,conversation_id,sender_id,sender_identity_id,message,created_at,listing_id,listing_title,listing_image,listing_price,image_path)
 OVERRIDING SYSTEM VALUE VALUES(mid,cid,p_expected_user_id,p_expected_identity_id,p_message,t,lid,l.title,l.image,l.price,
  CASE WHEN p_attachment_id IS NULL THEN NULL ELSE cid::text||'/'||p_attachment_id::text||'.webp' END);
 UPDATE public.conversations SET updated_at=t,archived_at=NULL WHERE id=cid;
 UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=cid;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','send','message_id',mid::text,'request_key',p_request_key,'replayed',false);
END $f$;

CREATE FUNCTION public.mark_my_thread_read_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_through_message_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;mid bigint;effective bigint;old_id bigint;seen_at timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);mid:=listing_contact_private.positive_id(p_through_message_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT created_at INTO seen_at FROM public.messages WHERE conversation_id=cid AND id=mid;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_read_input' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id FOR UPDATE;
 SELECT through_message_id INTO old_id FROM messaging_private_v2.read_watermarks
  WHERE actor_user_id=p_expected_user_id AND identity_id=p_expected_identity_id AND conversation_id=cid FOR UPDATE;
 -- Never widen the first visible-ID acknowledgement from a legacy wallclock.
 -- The timestamp is only an initial inbox fallback before this watermark exists.
 effective:=greatest(mid,coalesce(old_id,mid));
 INSERT INTO messaging_private_v2.read_watermarks(actor_user_id,identity_id,conversation_id,through_message_id)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,effective)
 ON CONFLICT(actor_user_id,identity_id,conversation_id) DO UPDATE SET through_message_id=greatest(messaging_private_v2.read_watermarks.through_message_id,EXCLUDED.through_message_id),updated_at=clock_timestamp()
 RETURNING through_message_id INTO effective;
 -- Legacy readers retain their timestamp semantics, but only the timestamp of
 -- an actually displayed message is advanced. No NOW() read acknowledgement.
 UPDATE public.conversation_participants SET last_read_at=greatest(last_read_at,seen_at)
 WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'action','mark_read','through_message_id',effective::text);
END $f$;
CREATE FUNCTION public.hide_my_thread_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 PERFORM 1 FROM public.conversations WHERE id=cid FOR UPDATE;
 UPDATE public.conversation_participants SET deleted_at=clock_timestamp() WHERE conversation_id=cid AND user_id=p_expected_user_id AND identity_id=p_expected_identity_id;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,'action','hide');
END $f$;
-- The contact writer has no INSERT/DELETE authority on user_blocks. This narrow
-- postgres-owned helper changes only the verified caller's own account block.
CREATE FUNCTION messaging_private_v2.set_block(p_user uuid,p_identity uuid,p_conversation bigint,p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE c public.conversations%ROWTYPE;peer_u uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_user,p_identity);
 c:=messaging_private_v2.require_thread(p_conversation,p_user,p_identity);
 IF p_blocked IS NULL THEN RAISE EXCEPTION 'message_input' USING ERRCODE='22023'; END IF;
 peer_u:=CASE WHEN c.buyer_id=p_user THEN c.seller_id ELSE c.buyer_id END;
 LOCK TABLE public.user_blocks IN SHARE ROW EXCLUSIVE MODE;
 IF p_blocked THEN INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(p_user,peer_u) ON CONFLICT(blocker_id,blocked_id) DO NOTHING;
 ELSE DELETE FROM public.user_blocks WHERE blocker_id=p_user AND blocked_id=peer_u; END IF;
END $f$;
CREATE FUNCTION public.set_my_thread_block_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_blocked boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;peer_u uuid;peer_i uuid;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 PERFORM messaging_private_v2.set_block(p_expected_user_id,p_expected_identity_id,cid,p_blocked);
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,
  'action',CASE WHEN p_blocked THEN 'block' ELSE 'unblock' END,'blocked_by_me',p_blocked,'can_send',listing_contact_private.peer_ready(peer_u,peer_i,p_expected_user_id));
END $f$;

-- Restrictive policy composes with any permissive legacy Storage policy. It
-- changes no other bucket and prevents direct browser access even if an old
-- PUBLIC policy happens to allow an object. Service-role access remains server.
CREATE POLICY message_attachments_v2_server_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
 USING(bucket_id<>'message-attachments-v2') WITH CHECK(bucket_id<>'message-attachments-v2');

CREATE FUNCTION public.reserve_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_request_key uuid,
 p_conversation_id text,p_source_sha256 text,p_source_bytes bigint,p_source_mime text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;c public.conversations%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;peer_u uuid;peer_i uuid;t timestamptz;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 PERFORM listing_contact_private.require_key(p_request_key);cid:=listing_contact_private.positive_id(p_conversation_id);
 IF p_source_sha256 IS NULL OR p_source_sha256 !~ '^[0-9a-f]{64}$' OR p_source_bytes IS NULL
 OR p_source_bytes NOT BETWEEN 1 AND 1400000 OR p_source_mime IS DISTINCT FROM 'image/webp' THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 c:=messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND request_key=p_request_key FOR UPDATE;
 IF FOUND THEN
  IF ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.source_sha256<>p_source_sha256 OR ph.source_bytes<>p_source_bytes OR ph.source_mime<>p_source_mime THEN
   RAISE EXCEPTION 'message_photo_request_conflict' USING ERRCODE='22023'; END IF;
  IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
   UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=ph.attachment_id RETURNING * INTO ph;
  END IF;
  RETURN messaging_private_v2.photo_receipt(ph);
 END IF;
 IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
 IF c.buyer_id=p_expected_user_id THEN peer_u:=c.seller_id;peer_i:=c.seller_identity_id; ELSE peer_u:=c.buyer_id;peer_i:=c.buyer_identity_id; END IF;
 PERFORM listing_contact_private.require_peer(peer_u,peer_i);PERFORM listing_contact_private.require_unblocked(p_expected_user_id,peer_u);
 -- require_actor holds the actor profile lock, serializing this actor's quota
 -- decisions. Permanent tombstones retain their byte reservation: an ambiguous
 -- late upload never creates unaccounted storage merely because it was canceled.
 t:=clock_timestamp();
 IF (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 hour')>=10
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')>=100
 OR (SELECT coalesce(sum(source_bytes),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND created_at>t-interval '1 day')+p_source_bytes>104857600
 OR (SELECT count(*) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id AND state IN('reserved','uploading','ready') AND expires_at>t)>=10
 OR (SELECT coalesce(sum(coalesce(web_bytes,2000000)),0) FROM messaging_private_v2.photos WHERE actor_user_id=p_expected_user_id)+2000000>262144000 THEN
  RAISE EXCEPTION 'message_photo_quota' USING ERRCODE='54000'; END IF;
 INSERT INTO messaging_private_v2.photos(actor_user_id,identity_id,conversation_id,request_key,source_sha256,source_bytes,source_mime,created_at,expires_at)
 VALUES(p_expected_user_id,p_expected_identity_id,cid,p_request_key,p_source_sha256,p_source_bytes,p_source_mime,t,t+interval '30 minutes') RETURNING * INTO ph;
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;

CREATE FUNCTION public.claim_message_photo_upload_v2(p_attachment_id uuid,p_expected_user_id uuid,p_expected_identity_id uuid,
 p_source_sha256 text,p_claim_key uuid,p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_web_sha256 IS NULL OR p_web_sha256 !~ '^[0-9a-f]{64}$' OR p_web_bytes IS NULL OR p_web_bytes NOT BETWEEN 1 AND 2000000
 OR p_width IS NULL OR p_width NOT BETWEEN 1 AND 1600 OR p_height IS NULL OR p_height NOT BETWEEN 1 AND 1600 THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id IS DISTINCT FROM p_expected_user_id OR ph.identity_id IS DISTINCT FROM p_expected_identity_id
 OR ph.source_sha256 IS DISTINCT FROM p_source_sha256 THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.upload_key IS NOT NULL AND (ph.web_sha256<>p_web_sha256 OR ph.web_bytes<>p_web_bytes OR ph.width<>p_width OR ph.height<>p_height) THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND ph.expires_at<=clock_timestamp() THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='EXPIRED' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='reserved' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='uploading',upload_key=p_claim_key,web_sha256=p_web_sha256,web_bytes=p_web_bytes,width=p_width,height=p_height
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- A replay returns the original upload key and exact frozen bytes. The HTTP
 -- transport must use create-only writes; an existing object must be read/hash
 -- verified against this manifest, never overwritten or silently adopted.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
CREATE FUNCTION public.finish_message_photo_upload_v2(p_attachment_id uuid,p_claim_key uuid,p_outcome text,
 p_web_sha256 text,p_web_bytes bigint,p_width integer,p_height integer,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN('ready','failed') OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.upload_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL
 OR ph.web_sha256 IS DISTINCT FROM p_web_sha256 OR ph.web_bytes IS DISTINCT FROM p_web_bytes
 OR ph.width IS DISTINCT FROM p_width OR ph.height IS DISTINCT FROM p_height THEN
  RAISE EXCEPTION 'message_photo_output_conflict' USING ERRCODE='22023'; END IF;
 IF ph.state IN('reserved','uploading','ready') AND (ph.expires_at<=clock_timestamp() OR p_outcome='failed') THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code=coalesce(p_failure_code,CASE WHEN ph.expires_at<=clock_timestamp() THEN 'EXPIRED' ELSE 'UPLOAD_FAILED' END)
  WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 ELSIF ph.state='uploading' AND p_outcome='ready' THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  UPDATE messaging_private_v2.photos SET state='ready' WHERE attachment_id=p_attachment_id RETURNING * INTO ph;
 END IF;
 -- attached and tombstoned states never regress or resurrect on late results.
 RETURN messaging_private_v2.photo_receipt(ph);
END $f$;
CREATE FUNCTION public.cancel_my_message_photo_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_attachment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;ph messaging_private_v2.photos%ROWTYPE;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.actor_user_id<>p_expected_user_id OR ph.identity_id<>p_expected_identity_id OR ph.conversation_id<>cid OR ph.state='attached' THEN
  RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 IF ph.state<>'tombstoned' THEN
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=clock_timestamp(),failure_code='CANCELED' WHERE attachment_id=p_attachment_id;
 END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,
  'conversation_id',cid::text,'attachment_id',p_attachment_id,'state','tombstoned');
END $f$;
CREATE FUNCTION public.get_my_message_photo_binding_v2(p_expected_user_id uuid,p_expected_identity_id uuid,p_conversation_id text,p_message_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,auth,pg_temp SET lock_timeout='2s' AS $f$
DECLARE cid bigint;mid bigint;m public.messages%ROWTYPE;ph messaging_private_v2.photos%ROWTYPE;kind text;bucket text;object_path text;
BEGIN
 PERFORM listing_contact_private.require_actor_hosted_v1(p_expected_user_id,p_expected_identity_id);
 cid:=listing_contact_private.positive_id(p_conversation_id);mid:=listing_contact_private.positive_id(p_message_id);
 PERFORM messaging_private_v2.require_thread(cid,p_expected_user_id,p_expected_identity_id);
 SELECT * INTO m FROM public.messages WHERE conversation_id=cid AND id=mid;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE message_id=mid AND conversation_id=cid AND state='attached'
  AND actor_user_id=m.sender_id AND identity_id=m.sender_identity_id
  AND m.image_path=cid::text||'/'||attachment_id::text||'.webp';
 IF FOUND THEN
  IF NOT messaging_private_v2.bucket_ready() THEN RAISE EXCEPTION 'message_photo_storage_unavailable' USING ERRCODE='55000'; END IF;
  kind:='v2';bucket:='message-attachments-v2';object_path:=cid::text||'/'||ph.attachment_id::text||'.webp';
 ELSIF messaging_private_v2.safe_legacy_path(cid,m.image_path) THEN
  kind:='legacy';bucket:='messages';object_path:=m.image_path;
 ELSE RAISE EXCEPTION 'message_photo_unavailable' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('schema_version',2,'actor_user_id',p_expected_user_id,'identity_id',p_expected_identity_id,'conversation_id',cid::text,
  'message_id',mid::text,'kind',kind,'attachment_id',ph.attachment_id,'bucket',bucket,'path',object_path,
  'web_sha256',ph.web_sha256,'web_bytes',ph.web_bytes,'width',ph.width,'height',ph.height);
END $f$;
CREATE FUNCTION public.claim_message_photo_cleanup_v2(p_claim_key uuid,p_limit integer DEFAULT 3)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;t timestamptz;items jsonb:='[]'::jsonb;
BEGIN
 PERFORM listing_contact_private.require_key(p_claim_key);
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 3 THEN RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 t:=clock_timestamp();
 FOR ph IN SELECT * FROM messaging_private_v2.photos WHERE
  (state IN('reserved','uploading','ready') AND expires_at<=t)
  OR (state='tombstoned' AND next_cleanup_at<=t AND (cleanup_lease_until IS NULL OR cleanup_lease_until<=t OR cleanup_key=p_claim_key))
  ORDER BY coalesce(next_cleanup_at,expires_at),attachment_id LIMIT p_limit FOR UPDATE SKIP LOCKED
 LOOP
  UPDATE messaging_private_v2.photos SET state='tombstoned',next_cleanup_at=coalesce(next_cleanup_at,t),
   cleanup_key=p_claim_key,cleanup_lease_until=t+interval '5 minutes',failure_code=coalesce(failure_code,'EXPIRED')
  WHERE attachment_id=ph.attachment_id;
  items:=items||jsonb_build_array(jsonb_build_object('attachment_id',ph.attachment_id,'bucket','message-attachments-v2',
   'path',ph.conversation_id::text||'/'||ph.attachment_id::text||'.webp','cleanup_key',p_claim_key,'lease_until',t+interval '5 minutes'));
 END LOOP;
 RETURN jsonb_build_object('schema_version',2,'claims',items);
END $f$;
CREATE FUNCTION public.finish_message_photo_cleanup_v2(p_attachment_id uuid,p_claim_key uuid,p_removed boolean,p_failure_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE ph messaging_private_v2.photos%ROWTYPE;next_time timestamptz;
BEGIN
 IF p_removed IS NULL OR (p_failure_code IS NOT NULL AND p_failure_code !~ '^[A-Z0-9_]{1,64}$') THEN
  RAISE EXCEPTION 'message_photo_input' USING ERRCODE='22023'; END IF;
 SELECT * INTO ph FROM messaging_private_v2.photos WHERE attachment_id=p_attachment_id FOR UPDATE;
 IF NOT FOUND OR ph.state<>'tombstoned' OR ph.cleanup_key IS DISTINCT FROM p_claim_key OR p_claim_key IS NULL THEN
  RAISE EXCEPTION 'message_photo_cleanup_conflict' USING ERRCODE='22023'; END IF;
 next_time:=clock_timestamp()+CASE WHEN ph.cleanup_attempts<2 OR NOT p_removed THEN interval '1 hour' ELSE interval '1 day' END;
 UPDATE messaging_private_v2.photos SET cleanup_key=NULL,cleanup_lease_until=NULL,next_cleanup_at=next_time,
  cleanup_attempts=cleanup_attempts+1,last_cleanup_at=clock_timestamp(),last_cleanup_removed=p_removed,
  failure_code=coalesce(p_failure_code,failure_code) WHERE attachment_id=p_attachment_id;
 -- An observed DELETE/404 does not prove a previously ambiguous create cannot
 -- arrive later. The immutable tombstone is revisited; no terminal deleted state.
 RETURN jsonb_build_object('schema_version',2,'attachment_id',p_attachment_id,'state','tombstoned','next_cleanup_at',next_time);
END $f$;

-- Only this INSERT branch changes in the existing guard. Text-only behavior,
-- terminal listing snapshot scrubbing, and every direct-write rejection remain.
CREATE OR REPLACE FUNCTION listing_contact_private.guard_message() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,public,auth,pg_temp AS $f$
DECLARE managed boolean;
BEGIN
 IF TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501'; END IF;
 managed:=public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'INSERT' THEN OLD.conversation_id END,CASE WHEN TG_OP<>'INSERT' THEN OLD.listing_id END)
  OR public.listing_contact_is_managed_v1(CASE WHEN TG_OP<>'DELETE' THEN NEW.conversation_id END,CASE WHEN TG_OP<>'DELETE' THEN NEW.listing_id END);
 IF NOT managed THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 IF TG_OP='INSERT' AND current_user='selqiro_listing_contact_writer_v1' AND NEW.image_url IS NULL THEN
  IF NEW.image_path IS NULL THEN RETURN NEW; END IF;
  IF EXISTS(SELECT 1 FROM messaging_private_v2.photos p WHERE p.state='attached' AND p.message_id=NEW.id
   AND p.conversation_id=NEW.conversation_id AND p.actor_user_id=NEW.sender_id AND p.identity_id=NEW.sender_identity_id
   AND p.web_sha256 IS NOT NULL AND p.web_bytes IS NOT NULL AND p.width IS NOT NULL AND p.height IS NOT NULL
   AND NEW.image_path=p.conversation_id::text||'/'||p.attachment_id::text||'.webp') THEN RETURN NEW; END IF;
 END IF;
 IF TG_OP='UPDATE' AND (current_user='selqiro_listing_final_writer_v1' OR pg_trigger_depth()>1)
 AND NEW.listing_title IS NULL AND NEW.listing_image IS NULL AND NEW.listing_price IS NULL
 AND (NEW.listing_id IS NOT DISTINCT FROM OLD.listing_id OR (NEW.listing_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.listings WHERE id=OLD.listing_id)))
 AND (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])=
  (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'listing_contact_direct_write' USING ERRCODE='42501';
END $f$;
-- Historical legacy messages retain their legacy rules. Only a newly attached
-- private photo's immutable sender/conversation/path/content binding is protected
-- if a legacy endpoint later attempts to edit or delete that specific message.
CREATE FUNCTION messaging_private_v2.protect_attached_photo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF EXISTS(SELECT 1 FROM messaging_private_v2.photos WHERE message_id=OLD.id AND state='attached') THEN
  IF TG_OP='DELETE' OR (to_jsonb(NEW)-ARRAY['listing_id','listing_title','listing_image','listing_price'])<>
   (to_jsonb(OLD)-ARRAY['listing_id','listing_title','listing_image','listing_price']) THEN
   RAISE EXCEPTION 'message_photo_binding_retained' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $f$;
CREATE TRIGGER protect_attached_message_photo_v2 BEFORE UPDATE OR DELETE ON public.messages
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.protect_attached_photo();

-- A legacy direct INSERT must honor the same account block as the V2 RPC.
-- This trigger grants no write/read authority; existing RLS still authorizes
-- the INSERT. The brief SHARE lock also fences a concurrent legacy block write.
CREATE FUNCTION messaging_private_v2.guard_account_block() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pg_temp SET lock_timeout='2s' AS $f$
DECLARE actor uuid:=auth.uid();active_identity uuid;c public.conversations%ROWTYPE;
BEGIN
 -- Legacy callers still pass normal existing RLS. Independently verify the
 -- actual authenticated sender and selected identity; service maintenance has
 -- no auth subject but must still target an exact legitimate two-party thread.
 IF actor IS NOT NULL THEN
  IF NEW.sender_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
  SELECT active_identity_id INTO active_identity FROM public.profiles WHERE id=actor FOR SHARE;
  IF active_identity IS DISTINCT FROM NEW.sender_identity_id OR active_identity IS NULL THEN
   RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 PERFORM listing_contact_private.require_peer(NEW.sender_id,NEW.sender_identity_id);
 LOCK TABLE public.user_blocks IN SHARE MODE;
 SELECT * INTO c FROM public.conversations WHERE id=NEW.conversation_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.conversation_participants WHERE conversation_id=NEW.conversation_id FOR SHARE;
 IF NOT messaging_private_v2.exact_thread(NEW.conversation_id,NEW.sender_id,NEW.sender_identity_id)
 OR EXISTS(SELECT 1 FROM public.conversation_participants cp JOIN public.user_blocks b ON
   ((b.blocker_id=NEW.sender_id AND b.blocked_id=cp.user_id) OR (b.blocker_id=cp.user_id AND b.blocked_id=NEW.sender_id))
  WHERE cp.conversation_id=NEW.conversation_id AND cp.user_id IS DISTINCT FROM NEW.sender_id) THEN
  RAISE EXCEPTION 'message_send_unavailable' USING ERRCODE='42501'; END IF;
 -- A legacy INSERT may have allocated its default ID before waiting for this
 -- conversation. Allocate the final ID only AFTER this lock, so a late commit
 -- cannot arrive permanently below an already acknowledged message watermark.
 -- The new controlled sender already allocated under this same lock and bound
 -- its private deferred receipt; preserve exactly that independently bound ID.
 IF NOT EXISTS(SELECT 1 FROM messaging_private_v2.send_receipts r WHERE r.message_id=NEW.id
   AND r.actor_user_id=NEW.sender_id AND r.identity_id=NEW.sender_identity_id AND r.conversation_id=NEW.conversation_id) THEN
  NEW.id:=nextval('public.messages_id_seq');NEW.created_at:=clock_timestamp();
 END IF;
 IF NOT public.listing_contact_is_managed_v1(c.id,c.listing_id) THEN
  UPDATE public.conversations SET updated_at=clock_timestamp(),archived_at=NULL WHERE id=c.id;
  UPDATE public.conversation_participants SET deleted_at=NULL WHERE conversation_id=c.id;
 END IF;
 RETURN NEW;
END $f$;
CREATE TRIGGER messaging_account_block_v2 BEFORE INSERT ON public.messages
 FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_account_block();

-- Public browser-authorized functions use the established constrained writer.
-- The temporary CREATE grant is revoked in this same transaction; apply verifies
-- the public schema ACL is byte-identical before commit.
GRANT CREATE ON SCHEMA public TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_message_thread_v2(uuid,uuid,text,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.mark_my_thread_read_v2(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.hide_my_thread_v2(uuid,uuid,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.set_my_thread_block_v2(uuid,uuid,text,boolean) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.cancel_my_message_photo_v2(uuid,uuid,text,uuid) OWNER TO selqiro_listing_contact_writer_v1;
ALTER FUNCTION public.get_my_message_photo_binding_v2(uuid,uuid,text,text) OWNER TO selqiro_listing_contact_writer_v1;
REVOKE CREATE ON SCHEMA public FROM selqiro_listing_contact_writer_v1;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA messaging_private_v2 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA messaging_private_v2 TO selqiro_listing_contact_writer_v1;
REVOKE ALL ON FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text),public.get_my_message_thread_v2(uuid,uuid,text,text,text),
 public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid),public.mark_my_thread_read_v2(uuid,uuid,text,text),public.hide_my_thread_v2(uuid,uuid,text),
 public.set_my_thread_block_v2(uuid,uuid,text,boolean),public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text),
 public.cancel_my_message_photo_v2(uuid,uuid,text,uuid),public.get_my_message_photo_binding_v2(uuid,uuid,text,text),
 public.claim_message_photo_upload_v2(uuid,uuid,uuid,text,uuid,text,bigint,integer,integer),
 public.finish_message_photo_upload_v2(uuid,uuid,text,text,bigint,integer,integer,text),public.claim_message_photo_cleanup_v2(uuid,integer),
 public.finish_message_photo_cleanup_v2(uuid,uuid,boolean,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_my_message_threads_v2(uuid,uuid,timestamptz,text),public.get_my_message_thread_v2(uuid,uuid,text,text,text),
 public.send_my_message_v2(uuid,uuid,uuid,text,text,text,uuid),public.mark_my_thread_read_v2(uuid,uuid,text,text),public.hide_my_thread_v2(uuid,uuid,text),
 public.set_my_thread_block_v2(uuid,uuid,text,boolean),public.reserve_my_message_photo_v2(uuid,uuid,uuid,text,text,bigint,text),
 public.cancel_my_message_photo_v2(uuid,uuid,text,uuid),public.get_my_message_photo_binding_v2(uuid,uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_message_photo_upload_v2(uuid,uuid,uuid,text,uuid,text,bigint,integer,integer),
 public.finish_message_photo_upload_v2(uuid,uuid,text,text,bigint,integer,integer,text),public.claim_message_photo_cleanup_v2(uuid,integer),
 public.finish_message_photo_cleanup_v2(uuid,uuid,boolean,text) TO service_role;

DO $catalog_guard$
DECLARE
 specs jsonb := $specs$[{"signature":"public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)","name":"public.contact_my_listing_seller_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"50e84938abd4b5e47ef1344727688bae0d49f4c05ffe73c1590a2d6555e7bb72","fixed_sha256":"45b13119d7f8c75c4efeb0996ad14cfa60b02cd031015b64b5ab5655e1577710","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)","name":"public.send_my_listing_message_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_message","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"529c7780a55d58e825eca45f86bcc9615201975579f15fa6c43d646b74adc471","fixed_sha256":"2b2f38a55bef3b0751ae2ae045f973a9a7032ed322ef6bf5ca1e39b1fe0bd56a","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.get_my_listing_conversation_v1(uuid,uuid,text,text)","name":"public.get_my_listing_conversation_v1","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_before_message_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"cdf1a128a2eab29d8975517005af0385afa1565e7c2bc74ca2133bfc6b85ddfc","fixed_sha256":"04cf2707130e6845a0b48332664caade46e9ae354a54dd14acae18532615b25d","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.list_my_listing_conversations_v1(uuid,uuid,text)","name":"public.list_my_listing_conversations_v1","args":["p_expected_user_id","p_expected_identity_id","p_before_conversation_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"691956e594cf4f0c0ddac5da50df31d17e784b8d4bd2de4e7188af1d85d1c8d0","fixed_sha256":"c47b47d481ace70c4038f8a52bbdb10a0dcde969cf8212644a89fe062126515f","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_peer(uuid,uuid)","name":"listing_contact_private.require_peer","args":["p_user","p_identity"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_ready(uuid,uuid,uuid)","name":"listing_contact_private.peer_ready","args":["p_user","p_identity","p_viewer"],"result":"boolean","owner":"postgres","language":"sql","secdef":false,"volatility":"s","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_actor_hosted_v1(uuid,uuid)","name":"listing_contact_private.require_actor_hosted_v1","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"d6b6bede7ce642c19c3ebdb0e809abf1ab049c789b2219b9e8454923c88f5518","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_name_hosted_v1(uuid)","name":"listing_contact_private.peer_name_hosted_v1","args":["p_identity"],"result":"text","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"836c3f6e06f1c84d9d93c7aa1c150bd2e17e3b68884b422849ca073a4c8a0d90","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_publication_private.require_actor(uuid,uuid)","name":"listing_publication_private.require_actor","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"9a86e4ca817793a77420dfc2e74d9e2df18298436638a7bf241428fca2c9a3f0"},{"signature":"public.lock_listing_creation_actor_v1(uuid)","name":"public.lock_listing_creation_actor_v1","args":["p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"45c3cd15d8181606e839e83978b114bced5dd5480781a956ed40d96cd62802d8"},{"signature":"public.listing_actor_uid_hosted_v1()","name":"public.listing_actor_uid_hosted_v1","args":[],"result":"uuid","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ff7f6ce615280095930c983468c5ce5a6c3982bc4f540e4929bb0baf904ce88d"},{"signature":"listing_publication_private.assert_hosted_preview_actor(uuid)","name":"listing_publication_private.assert_hosted_preview_actor","args":["p_actor"],"result":"void","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"307f98bf3584f0394697bbb1a4d60c54454c69b193f5c2bba0cf68701d7babc2"},{"signature":"listing_publication_private.hosted_storage_contract_ready()","name":"listing_publication_private.hosted_storage_contract_ready","args":[],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"2e41806725b8c4f9af82e4541d8fc4a17faae54aa36dc5d63be1c40c753f841f"},{"signature":"public.current_user_has_identity_access(uuid)","name":"public.current_user_has_identity_access","args":["p_identity_id"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"b708d7abdfac00c7341979f4ff6dfae2ab2bfb55d311f27c7cc2935167224027"},{"signature":"listing_contact_private.require_member(bigint,uuid,uuid)","name":"listing_contact_private.require_member","args":["p_conversation","p_user","p_identity"],"result":"listing_contact_private.channels","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"20e71c37d94292b18235d0346133c4bd088d7ca13ce61706e2fb3305be28a689"},{"signature":"listing_contact_private.require_unblocked(uuid,uuid)","name":"listing_contact_private.require_unblocked","args":["p_first","p_second"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"aabb21ea89dd484394e31241d5e490551f72935900840946dd286d937dbdae80"},{"signature":"listing_contact_private.require_key(uuid)","name":"listing_contact_private.require_key","args":["v"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"8c0a721a658f0aee11b5ab6eb59386829974b4c16f4ab17e01ce60cd58b82c1d"},{"signature":"listing_contact_private.positive_id(text)","name":"listing_contact_private.positive_id","args":["v"],"result":"bigint","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"27c9aa1df9f9951953e563e6082d397c3bf70fe87e7c7081879a227c82fd098e"},{"signature":"listing_contact_private.guard_conversation()","name":"listing_contact_private.guard_conversation","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"7c86041baee326a66504c329d89be942cf5af0c62ca5f58b027b9b72bb349207"},{"signature":"listing_contact_private.guard_message()","name":"listing_contact_private.guard_message","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"a5be6fd14797297cc98667155325d8518dbdf7a36df69739c2c4cdd1e01b520c"},{"signature":"listing_contact_private.guard_participant()","name":"listing_contact_private.guard_participant","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"97e3f59dd5cf441cb3f2ff33b473a5361c481ed8d65f3b4fc8c3ea72ea003420"},{"signature":"public.listing_contact_is_managed_v1(bigint,bigint)","name":"public.listing_contact_is_managed_v1","args":["p_conversation","p_listing"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":1,"default_expression":"NULL::bigint","group":"shared","body_sha256":"438bea962cc7ddc548cf4f29b354b38d0d3208f0c5792acae2b606e4c79a0edd"},{"signature":"public.listing_contact_visible_v1(bigint)","name":"public.listing_contact_visible_v1","args":["p_conversation"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ba2976f4b0a465d3f0e409e673d30f083a147f5e1815a141f0ac473ac081609e"}]$specs$::jsonb;
 expected_policies constant jsonb := $policies$[{"relation":"business_members","polname":"Business members can read members","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((user_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM business_members bm\n  WHERE ((bm.business_account_id = business_members.business_account_id) AND (bm.user_id = auth.uid()) AND (bm.status = 'active'::text)))))","check_expression":null},{"relation":"business_members","polname":"Business owners can manage members","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"(EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = business_members.business_account_id) AND (business_accounts.owner_user_id = auth.uid()))))","check_expression":"(EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = business_members.business_account_id) AND (business_accounts.owner_user_id = auth.uid()))))"},{"relation":"business_members","polname":"contact_writer_lock","polcmd":"w","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":"false"},{"relation":"business_members","polname":"contact_writer_read","polcmd":"r","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":null},{"relation":"identities","polname":"Business members can read business identities","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_members\n  WHERE ((business_members.business_account_id = identities.business_account_id) AND (business_members.user_id = auth.uid()) AND (business_members.status = 'active'::text)))))","check_expression":null},{"relation":"identities","polname":"Business owners can manage business identities","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = identities.business_account_id) AND (business_accounts.owner_user_id = auth.uid())))))","check_expression":"((type = 'business'::text) AND (EXISTS ( SELECT 1\n   FROM business_accounts\n  WHERE ((business_accounts.id = identities.business_account_id) AND (business_accounts.owner_user_id = auth.uid())))))"},{"relation":"identities","polname":"Users can manage their private identities","polcmd":"*","polpermissive":true,"roles":["public"],"using_expression":"((type = 'private'::text) AND (user_id = auth.uid()))","check_expression":"((type = 'private'::text) AND (user_id = auth.uid()))"},{"relation":"identities","polname":"Users can read their private identities","polcmd":"r","polpermissive":true,"roles":["public"],"using_expression":"((type = 'private'::text) AND (user_id = auth.uid()))","check_expression":null},{"relation":"identities","polname":"contact_writer_lock","polcmd":"w","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":"false"},{"relation":"identities","polname":"contact_writer_read","polcmd":"r","polpermissive":true,"roles":["selqiro_listing_contact_writer_v1"],"using_expression":"true","check_expression":null}]$policies$::jsonb;
 item jsonb; proc_oid oid; p record; metadata jsonb; acl_roles text[];
 expected_args text[]; expected_config text[]; actual_config text[];
 base_ok boolean; original_ok boolean:=true; fixed_ok boolean:=true; shared_ok boolean:=true;
 acl_ok boolean:=true; role_ok boolean:=false; schemas_ok boolean:=false;
 trusted_ok boolean:=false; settings_ok boolean:=false; policies_ok boolean:=false;
 raw_probe text:='NOT_RUN'; probe_error text; helper_name_ok boolean:=false;
 helper_ready_ok boolean:=false; helper_name text; helper_ready boolean;
 actual_policies jsonb; shared_catalog jsonb:='[]'; changed_catalog jsonb:='[]';
 api_catalog jsonb:='[]'; roles_catalog jsonb; settings_catalog jsonb;
 state_name text:='unknown'; recognized boolean:=false; guards jsonb; fingerprints jsonb;
 name_count integer; error_state text;
BEGIN
 -- The existing base remains exact. Only the explicitly reviewed message guard
 -- has a second pinned state after this additive schema exists.
 IF to_regnamespace('messaging_private_v2') IS NOT NULL THEN
  SELECT jsonb_agg(CASE WHEN value->>'signature'='listing_contact_private.guard_message()'
   THEN jsonb_set(value,'{body_sha256}',to_jsonb('a2ac16ccb92fb05c5e1ddb2849fbf2c14e5ea00004916f60186f46733de63950'::text)) ELSE value END)
  INTO specs FROM jsonb_array_elements(specs);
 END IF;
 trusted_ok := current_user='postgres' AND session_user='postgres'
  AND current_setting('transaction_isolation')='read committed'
  AND current_setting('server_version_num')::integer>=170000
  AND EXISTS(SELECT 1 FROM pg_roles WHERE rolname='postgres' AND rolbypassrls)
  AND has_schema_privilege('postgres','auth','USAGE')
  AND has_function_privilege('postgres','auth.uid()','EXECUTE');

 SELECT jsonb_build_object('role',jsonb_build_object('name',r.rolname,'login',r.rolcanlogin,
  'super',r.rolsuper,'createdb',r.rolcreatedb,'createrole',r.rolcreaterole,
  'inherit',r.rolinherit,'replication',r.rolreplication,'bypassrls',r.rolbypassrls),
  'memberships',coalesce((SELECT jsonb_agg(jsonb_build_object('member',pg_get_userbyid(m.member),
   'grantor',pg_get_userbyid(m.grantor),'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option)
   ORDER BY pg_get_userbyid(m.member),pg_get_userbyid(m.grantor))
   FROM pg_auth_members m WHERE m.roleid=r.oid),'[]'::jsonb)) INTO roles_catalog
 FROM pg_roles r WHERE r.rolname='selqiro_listing_contact_writer_v1';
 role_ok := EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_contact_writer_v1'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls)
  AND pg_has_role('postgres','selqiro_listing_contact_writer_v1','USAGE')
  AND pg_has_role('postgres','selqiro_listing_contact_writer_v1','SET')
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.roleid='selqiro_listing_contact_writer_v1'::regrole
   AND m.member<>'postgres'::regrole)
  AND NOT EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member='selqiro_listing_contact_writer_v1'::regrole)
  AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role','authenticator')
   AND pg_has_role(r.oid,'postgres','MEMBER'));

 schemas_ok := EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='listing_contact_private' AND nspowner='postgres'::regrole)
  AND EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='listing_publication_private' AND nspowner='postgres'::regrole)
  AND has_schema_privilege('selqiro_listing_contact_writer_v1','listing_contact_private','USAGE')
  AND NOT has_schema_privilege('selqiro_listing_contact_writer_v1','listing_contact_private','CREATE')
  AND NOT has_schema_privilege('selqiro_listing_contact_writer_v1','public','CREATE')
  AND NOT EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN('anon','authenticated','service_role')
    AND (has_schema_privilege(r.oid,'listing_contact_private','USAGE')
      OR has_schema_privilege(r.oid,'listing_contact_private','CREATE')
      OR has_schema_privilege(r.oid,'listing_publication_private','USAGE')
      OR has_schema_privilege(r.oid,'listing_publication_private','CREATE')));

 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.singleton),'[]'::jsonb) INTO settings_catalog
 FROM listing_publication_private.hosted_preview_settings s;
 settings_ok := jsonb_array_length(settings_catalog)=1 AND EXISTS(
  SELECT 1 FROM listing_publication_private.hosted_preview_settings WHERE singleton
   AND project_ref='vyjletlmwoiwxsnsunlm' AND release_id='listing-publication-hosted-preview-v1'
   AND instance_id='2d088814-0900-448a-a9d1-7b05470cb1d2'::uuid
   AND enabled AND release_ready AND storage_authority_version='source-part-rfc3986-v1');

 -- These four known baseline policies plus private-identity and writer policies
 -- are compared structurally as pg_get_expr renders them under explicit public
 -- search_path. The raw legacy query must separately reproduce SQLSTATE 42P17.
 SELECT coalesce(jsonb_agg(jsonb_build_object('relation',c.relname,'polname',q.polname,
   'polcmd',q.polcmd,'polpermissive',q.polpermissive,
   'roles',ARRAY(SELECT CASE WHEN role_id=0 THEN 'public' ELSE pg_get_userbyid(role_id) END
      FROM unnest(q.polroles) role_id ORDER BY 1),
   'using_expression',pg_get_expr(q.polqual,q.polrelid),'check_expression',pg_get_expr(q.polwithcheck,q.polrelid))
   ORDER BY c.relname,q.polname),'[]'::jsonb) INTO actual_policies
 FROM pg_policy q JOIN pg_class c ON c.oid=q.polrelid
 WHERE c.relnamespace='public'::regnamespace AND c.relname IN('identities','business_members');
 policies_ok := actual_policies=expected_policies
  AND (SELECT count(*) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
    AND c.relname IN('identities','business_members') AND c.relrowsecurity
    AND NOT c.relforcerowsecurity AND c.relowner='postgres'::regrole)=2;

 FOR item IN SELECT value FROM jsonb_array_elements(specs) LOOP
  proc_oid:=to_regprocedure(item->>'signature');
  SELECT count(*) INTO name_count FROM pg_proc x JOIN pg_namespace n ON n.oid=x.pronamespace
   WHERE n.nspname=split_part(item->>'name','.',1) AND x.proname=split_part(item->>'name','.',2);
  IF proc_oid IS NULL THEN
   IF item->>'group'='new' AND name_count=0 THEN fixed_ok:=false;
   ELSE original_ok:=false;fixed_ok:=false;shared_ok:=false; END IF;
   CONTINUE;
  END IF;
  SELECT x.*,l.lanname INTO p FROM pg_proc x JOIN pg_language l ON l.oid=x.prolang WHERE x.oid=proc_oid;
  SELECT coalesce(array_agg(value ORDER BY value),'{}'::text[]) INTO expected_config
   FROM jsonb_array_elements_text(item->'config');
  SELECT coalesce(array_agg(replace(value,' ','') ORDER BY replace(value,' ','')),'{}'::text[]) INTO actual_config
   FROM unnest(p.proconfig) value;
  SELECT coalesce(array_agg(value ORDER BY ordinal),'{}'::text[]) INTO expected_args
   FROM jsonb_array_elements_text(item->'args') WITH ORDINALITY AS a(value,ordinal);
  base_ok:=name_count=1 AND pg_get_userbyid(p.proowner)=item->>'owner'
   AND p.lanname=item->>'language' AND p.prorettype=to_regtype(item->>'result')
   AND coalesce(p.proargnames,'{}'::text[])=expected_args AND p.prokind='f'
   AND p.provolatile::text=item->>'volatility' AND p.proparallel='u'
   AND NOT p.proisstrict AND NOT p.proleakproof AND NOT p.proretset
   AND p.provariadic=0 AND p.prosupport=0 AND p.probin IS NULL
   AND p.procost=100 AND p.prorows=0
   AND p.proallargtypes IS NULL AND p.proargmodes IS NULL
   AND p.pronargdefaults=(item->>'defaults')::integer
   AND pg_get_expr(p.proargdefaults,0) IS NOT DISTINCT FROM item->>'default_expression'
   AND actual_config=expected_config;
  SELECT jsonb_build_object('signature',item->>'signature','body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'owner',pg_get_userbyid(p.proowner),'secdef',p.prosecdef,'config',actual_config,
   'args',coalesce(p.proargnames,'{}'::text[]),'result',p.prorettype::regtype::text,
   'volatility',p.provolatile,'language',p.lanname,'parallel',p.proparallel,'strict',p.proisstrict,
   'leakproof',p.proleakproof,'returns_set',p.proretset,'kind',p.prokind,
   'defaults',pg_get_expr(p.proargdefaults,0),'acl',coalesce((SELECT jsonb_agg(jsonb_build_object(
    'grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
    'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
    ORDER BY a.grantee,a.grantor,a.privilege_type)
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb)) INTO metadata;
  IF item ? 'acl_roles' THEN
   SELECT coalesce(array_agg(DISTINCT CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END
      ORDER BY CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END),'{}'::text[]) INTO acl_roles
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a;
   base_ok:=base_ok AND acl_roles=ARRAY(SELECT value FROM jsonb_array_elements_text(item->'acl_roles') ORDER BY value)
    AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
      WHERE a.privilege_type<>'EXECUTE' OR a.is_grantable OR a.grantor<>p.proowner);
   acl_ok:=acl_ok AND base_ok;
  END IF;
  IF item->>'group'='shared' THEN
   shared_ok:=shared_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   shared_catalog:=shared_catalog||jsonb_build_array(metadata);
  ELSIF item->>'group'='changed' THEN
   original_ok:=original_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   fixed_ok:=fixed_ok AND base_ok AND p.prosecdef=(item->>'fixed_secdef')::boolean
    AND metadata->>'body_sha256'=item->>'fixed_sha256';
   changed_catalog:=changed_catalog||jsonb_build_array(metadata);
   api_catalog:=api_catalog||jsonb_build_array(jsonb_build_object('signature',item->>'signature',
    'owner',metadata->'owner','acl',metadata->'acl'));
  ELSE
   original_ok:=false;
   fixed_ok:=fixed_ok AND base_ok AND p.prosecdef=(item->>'secdef')::boolean
    AND metadata->>'body_sha256'=item->>'body_sha256';
   changed_catalog:=changed_catalog||jsonb_build_array(metadata);
  END IF;
 END LOOP;

 -- No actor impersonation, JWT/session-token read, lock-bearing RPC invocation,
 -- conversation creation, or account/message/listing row read occurs here.
 IF trusted_ok AND role_ok AND schemas_ok THEN
  PERFORM set_config('role','selqiro_listing_contact_writer_v1',true);
  BEGIN
   PERFORM 1 FROM public.identities LIMIT 0;
   raw_probe:='00000';
  EXCEPTION WHEN OTHERS THEN GET STACKED DIAGNOSTICS raw_probe=RETURNED_SQLSTATE;
  END;
  IF fixed_ok AND shared_ok AND acl_ok THEN
   BEGIN
    EXECUTE 'SELECT listing_contact_private.peer_name_hosted_v1(NULL::uuid)' INTO helper_name;
    EXECUTE 'SELECT listing_contact_private.peer_ready(NULL::uuid,NULL::uuid,NULL::uuid)' INTO helper_ready;
    helper_name_ok:=helper_name IS NULL;helper_ready_ok:=helper_ready IS FALSE;
   EXCEPTION WHEN OTHERS THEN
    helper_name_ok:=false;helper_ready_ok:=false;
   END;
  END IF;
  PERFORM set_config('role','none',true);
 END IF;
 IF original_ok AND NOT fixed_ok THEN state_name:='original';
 ELSIF fixed_ok AND NOT original_ok THEN state_name:='fixed'; END IF;
 guards:=jsonb_build_object('trusted_session',trusted_ok,'writer_role',role_ok,
  'private_schema_boundary',schemas_ok,'hosted_target',settings_ok,
  'known_legacy_policies',policies_ok,'shared_helpers_exact',shared_ok,
  'function_acl_and_metadata',acl_ok,'known_function_state',state_name<>'unknown',
  'legacy_recursion_confirmed',raw_probe='42P17',
  'fixed_private_reads',state_name='original' OR (helper_name_ok AND helper_ready_ok));
 recognized:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb);
 IF NOT recognized THEN state_name:='unknown'; END IF;
 fingerprints:=jsonb_build_object(
  'legacy_policies',encode(sha256(convert_to(actual_policies::text,'UTF8')),'hex'),
  'shared_helpers',encode(sha256(convert_to(shared_catalog::text,'UTF8')),'hex'),
  'writer_role',encode(sha256(convert_to(coalesce(roles_catalog,'null'::jsonb)::text,'UTF8')),'hex'),
  'api_boundary',encode(sha256(convert_to(jsonb_build_object('functions',api_catalog,'schemas',(
    SELECT jsonb_agg(jsonb_build_object('name',nspname,'owner',pg_get_userbyid(nspowner),'acl',nspacl::text)
      ORDER BY nspname) FROM pg_namespace WHERE nspname IN('listing_contact_private','listing_publication_private'))
    )::text,'UTF8')),'hex'),
  'hosted_settings',encode(sha256(convert_to(settings_catalog::text,'UTF8')),'hex'),
  'patched_functions',encode(sha256(convert_to(changed_catalog::text,'UTF8')),'hex'));
 PERFORM set_config('selqiro.contact_rls_report',jsonb_build_object(
  'format','selqiro-contact-rls-fix-v1','state',state_name,'recognized',recognized,'probe_code',raw_probe,
  'guards',guards,'fingerprints',fingerprints,'checks',jsonb_build_object(
   'original_functions_exact',original_ok,'fixed_functions_exact',fixed_ok,
   'private_null_name_read',helper_name_ok,'private_null_peer_read',helper_ready_ok))::text,true);
EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS error_state=RETURNED_SQLSTATE;
 PERFORM set_config('role','none',true);
 PERFORM set_config('selqiro.contact_rls_report',jsonb_build_object(
  'format','selqiro-contact-rls-fix-v1','state','unknown','recognized',false,'probe_code',error_state,
  'guards',jsonb_build_object('catalog_inspection_completed',false),
  'fingerprints','{}'::jsonb,'checks',jsonb_build_object('catalog_error',true))::text,true);
END $catalog_guard$;
DO $reader_guard$
DECLARE base jsonb:=current_setting('selqiro.contact_rls_report')::jsonb;
 p record; state_name text:='unknown'; known boolean:=false; columns_ok boolean;
 fingerprints jsonb:='{}'::jsonb; metadata jsonb; guards jsonb; item text;
 unknown_hash constant text:=encode(sha256(convert_to('unknown','UTF8')),'hex');
BEGIN
 SELECT count(*)=8 INTO columns_ok FROM (VALUES
  ('messages','listing_id','bigint'),('messages','listing_title','text'),
  ('messages','listing_image','text'),('messages','listing_price','text'),
  ('listings','id','bigint'),('listings','title','text'),
  ('listings','image','text'),('listings','price','text')
 ) expected(relation,column_name,column_type)
 JOIN pg_class c ON c.relnamespace='public'::regnamespace AND c.relname=expected.relation AND c.relkind='r'
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=expected.column_name AND NOT a.attisdropped
  AND format_type(a.atttypid,a.atttypmod)=expected.column_type;

 SELECT p1.*,l.lanname,pg_get_userbyid(p1.proowner) AS owner_name,
  pg_get_expr(p1.proargdefaults,0) AS defaults_expression,
  ARRAY(SELECT replace(x,' ','') FROM unnest(p1.proconfig) x ORDER BY replace(x,' ','')) AS settings,
  (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END,
   'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable)
   ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(p1.proacl,acldefault('f',p1.proowner))) a) AS acl
 INTO p FROM pg_proc p1 JOIN pg_language l ON l.oid=p1.prolang
 WHERE p1.oid=to_regprocedure('public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)');
 IF NOT FOUND THEN
  known:=NOT EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_my_listing_conversation_v2');
  IF known THEN state_name:='absent'; END IF;
  metadata:=jsonb_build_object('present',false);
 ELSE
  metadata:=jsonb_build_object('present',true,'body_sha256',encode(sha256(convert_to(p.prosrc,'UTF8')),'hex'),
   'owner',p.owner_name,'language',p.lanname,'secdef',p.prosecdef,'strict',p.proisstrict,'retset',p.proretset,
   'volatility',p.provolatile,'parallel',p.proparallel,'result',format_type(p.prorettype,NULL),
   'args',p.proargnames,'settings',p.settings,'defaults',p.defaults_expression,'acl',p.acl);
  known:=p.owner_name='selqiro_listing_contact_writer_v1' AND p.lanname='plpgsql'
   AND p.prosecdef AND NOT p.proisstrict AND NOT p.proretset AND p.provolatile='v' AND p.proparallel='u'
   AND p.prorettype='jsonb'::regtype AND p.pronargdefaults=2 AND p.defaults_expression='NULL::text, NULL::text'
   AND p.proargnames=ARRAY['p_expected_user_id','p_expected_identity_id','p_conversation_id','p_before_message_id','p_attachment_listing_id']
   AND p.settings=ARRAY['lock_timeout=2s','search_path=pg_catalog,public,auth,pg_temp']
   AND encode(sha256(convert_to(p.prosrc,'UTF8')),'hex')='740815c40c0c52eba205a30cb7e8267025c5e394aeea760556b8ce7ac711c0cd'
   AND (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='get_my_listing_conversation_v2')=1
   AND (SELECT array_agg(CASE WHEN a.grantee=0 THEN 'public'::text ELSE pg_get_userbyid(a.grantee)::text END ORDER BY CASE WHEN a.grantee=0 THEN 'public'::text ELSE pg_get_userbyid(a.grantee)::text END)
    FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)=ARRAY['authenticated','selqiro_listing_contact_writer_v1']
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
    WHERE a.is_grantable OR a.privilege_type<>'EXECUTE' OR a.grantor<>p.proowner);
  IF known THEN state_name:='applied'; END IF;
 END IF;
 guards:=jsonb_build_object('base_fixed',base->>'state'='fixed' AND base->'recognized'='true'::jsonb,
  'reader_state_known',coalesce(known,false),'read_columns',coalesce(columns_ok,false));
 FOREACH item IN ARRAY ARRAY['legacy_policies','shared_helpers','writer_role','api_boundary','hosted_settings','patched_functions'] LOOP
  fingerprints:=fingerprints||jsonb_build_object(item,coalesce(base->'fingerprints'->>item,unknown_hash));
 END LOOP;
 fingerprints:=fingerprints||jsonb_build_object('reader',encode(sha256(convert_to(metadata::text,'UTF8')),'hex'));
 known:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb OR g.value='null'::jsonb);
 IF NOT known THEN state_name:='unknown'; END IF;
 PERFORM set_config('selqiro.message_cards_report',jsonb_build_object('format','selqiro-listing-message-cards-v1',
  'state',state_name,'recognized',known,'guards',guards,'fingerprints',fingerprints)::text,true);
EXCEPTION WHEN OTHERS THEN
 fingerprints:='{}'::jsonb;
 FOREACH item IN ARRAY ARRAY['legacy_policies','shared_helpers','writer_role','api_boundary','hosted_settings','patched_functions','reader'] LOOP
  fingerprints:=fingerprints||jsonb_build_object(item,unknown_hash);
 END LOOP;
 PERFORM set_config('selqiro.message_cards_report',jsonb_build_object('format','selqiro-listing-message-cards-v1',
  'state','unknown','recognized',false,'guards',jsonb_build_object('base_fixed',false,'reader_state_known',false,'read_columns',false),
  'fingerprints',fingerprints)::text,true);
END $reader_guard$;
DO $messaging_guard$
DECLARE
 expected_functions constant jsonb := $functions$[{"signature":"listing_contact_private.guard_message()","name":"guard_message","schema":"listing_contact_private","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, public, auth, pg_temp"],"body_sha256":"a2ac16ccb92fb05c5e1ddb2849fbf2c14e5ea00004916f60186f46733de63950","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.bucket_ready()","name":"bucket_ready","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":true,"volatility":"s","args":null,"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"bbff113436e34f7e251903262749066fab152206ad5470982ad77cb3201f8302","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.exact_thread(bigint, uuid, uuid)","name":"exact_thread","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"s","args":["p_conversation","p_user","p_identity"],"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"19fd6913a5e44248686e56a0151d7a953c0fbf7b603cfc2e2b65a21ac252fd23","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.guard_account_block()","name":"guard_account_block","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"83bd3c50a4d0bb2323e5dee7ed86032d506ea82e276b6127d3238bc96b37773a","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.identity_card(uuid)","name":"identity_card","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":true,"volatility":"s","args":["p_identity"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"62ceeedfd0a054f3563ed4e9abf8cf33bb2605dd3ee20bf53e9f35b4e0296bcc","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.photo_receipt(messaging_private_v2.photos)","name":"photo_receipt","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"s","args":["p"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"2530b94b02c3184d7297700808498d471b0df80d03d918260021d95b563aefc2","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.protect_attached_photo()","name":"protect_attached_photo","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":null,"defaults":0,"default_expression":null,"result":"trigger","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"f5ff79e11810dc2fed2a039d1684f64cdfe055fa112fad91ef9f5e17ff670cc8","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.require_thread(bigint, uuid, uuid)","name":"require_thread","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","args":["p_conversation","p_user","p_identity"],"defaults":0,"default_expression":null,"result":"conversations","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"5f2487f6126fd6a17f67c6ec4b9de340840f8ac3f0585d5750a38c90396fbd36","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.safe_legacy_path(bigint, text)","name":"safe_legacy_path","schema":"messaging_private_v2","owner":"postgres","language":"sql","secdef":false,"volatility":"i","args":["p_conversation","p_path"],"defaults":0,"default_expression":null,"result":"boolean","config":["search_path=pg_catalog, pg_temp"],"body_sha256":"725be82b057829689f62d388837a4c405da02660524a727cc381397ed71901b3","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"messaging_private_v2.set_block(uuid, uuid, bigint, boolean)","name":"set_block","schema":"messaging_private_v2","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_user","p_identity","p_conversation","p_blocked"],"defaults":0,"default_expression":null,"result":"void","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"6d8edfb3963c7261644fddd9519c715d047b78b5037a0c387ea9b03cdeef08fc","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"public.cancel_my_message_photo_v2(uuid, uuid, text, uuid)","name":"cancel_my_message_photo_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_attachment_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"55a1216fe599b8a047bd299bcb24c153a51de0f764dbf8ede7912442b764c5d8","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.claim_message_photo_cleanup_v2(uuid, integer)","name":"claim_message_photo_cleanup_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_claim_key","p_limit"],"defaults":1,"default_expression":"3","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"21059a776ef44ea56bee5c1a15ec2ca229cab8d23064e56b73b1c3d91691f9f2","acl_roles":["postgres","service_role"]},{"signature":"public.claim_message_photo_upload_v2(uuid, uuid, uuid, text, uuid, text, bigint, integer, integer)","name":"claim_message_photo_upload_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_expected_user_id","p_expected_identity_id","p_source_sha256","p_claim_key","p_web_sha256","p_web_bytes","p_width","p_height"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"4b5eb65ca6095b5db082c83b182d639bf7c071a97ed6fbcb0aeec6494e25a54a","acl_roles":["postgres","service_role"]},{"signature":"public.finish_message_photo_cleanup_v2(uuid, uuid, boolean, text)","name":"finish_message_photo_cleanup_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_claim_key","p_removed","p_failure_code"],"defaults":1,"default_expression":"NULL::text","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"4780e8a3a1437763ad97d4dc72d40175b9e3e2ddf3da0f36bb41d83c667ffe4a","acl_roles":["postgres","service_role"]},{"signature":"public.finish_message_photo_upload_v2(uuid, uuid, text, text, bigint, integer, integer, text)","name":"finish_message_photo_upload_v2","schema":"public","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","args":["p_attachment_id","p_claim_key","p_outcome","p_web_sha256","p_web_bytes","p_width","p_height","p_failure_code"],"defaults":1,"default_expression":"NULL::text","result":"jsonb","config":["search_path=pg_catalog, pg_temp","lock_timeout=2s"],"body_sha256":"f49f44e5d5dfa3ceb768c4bfeb9da6105efb4458d751bc7e0c3e2e83922dadca","acl_roles":["postgres","service_role"]},{"signature":"public.get_my_message_photo_binding_v2(uuid, uuid, text, text)","name":"get_my_message_photo_binding_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_message_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"fd00f01e0042ca0d8bae144047aaaed01f3af76e8c45a9814986a72bc24048e9","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.get_my_message_thread_v2(uuid, uuid, text, text, text)","name":"get_my_message_thread_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_before_message_id","p_attachment_listing_id"],"defaults":2,"default_expression":"NULL::text, NULL::text","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"2db77291a038a9092d1a1d6929b4eb929642f9beb6f8c4da2903930caf680ec9","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.hide_my_thread_v2(uuid, uuid, text)","name":"hide_my_thread_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"4c96a94b35d82b44cfa10bf69538979d92336f07cc7db040b618fb71b0e8ec23","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.list_my_message_threads_v2(uuid, uuid, timestamp with time zone, text)","name":"list_my_message_threads_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_before_updated_at","p_before_conversation_id"],"defaults":2,"default_expression":"NULL::timestamp with time zone, NULL::text","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"ea23465a4ad4da28151e04e3ddcb17356fed35ec34f065c29df6c73e1b1cbbf8","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.mark_my_thread_read_v2(uuid, uuid, text, text)","name":"mark_my_thread_read_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_through_message_id"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"6f38f871015c4996d6000c4fe07e3476f944687578fc31c869df324c6008ea5b","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.reserve_my_message_photo_v2(uuid, uuid, uuid, text, text, bigint, text)","name":"reserve_my_message_photo_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_source_sha256","p_source_bytes","p_source_mime"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"07f4ecb16970ca276efb8d191523eaa72a1b670c9c3aa4f208e49f12955ac3ec","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.send_my_message_v2(uuid, uuid, uuid, text, text, text, uuid)","name":"send_my_message_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_message","p_listing_id","p_attachment_id"],"defaults":2,"default_expression":"NULL::text, NULL::uuid","result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"22669894a1de3dceac8d608a271ae7c459c16f2957af33b04b24fbf9365e1538","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.set_my_thread_block_v2(uuid, uuid, text, boolean)","name":"set_my_thread_block_v2","schema":"public","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_blocked"],"defaults":0,"default_expression":null,"result":"jsonb","config":["search_path=pg_catalog, public, auth, pg_temp","lock_timeout=2s"],"body_sha256":"2755d8475ddd0c5ee7e61d7e66e96919013202056d8473bb7a81b63ddabb2d81","acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]}]$functions$::jsonb;
 expected_structure constant jsonb := $structure${"schema":{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"CREATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"USAGE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"USAGE"}],"owner":"postgres"},"tables":[{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"photos","owner":"postgres","columns":[{"name":"attachment_id","type":"uuid","default":"gen_random_uuid()","identity":"","not_null":true,"generated":""},{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"request_key","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_sha256","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_bytes","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"source_mime","type":"text","default":null,"identity":"","not_null":true,"generated":""},{"name":"state","type":"text","default":"'reserved'::text","identity":"","not_null":true,"generated":""},{"name":"created_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""},{"name":"expires_at","type":"timestamp with time zone","default":"(clock_timestamp() + '00:30:00'::interval)","identity":"","not_null":true,"generated":""},{"name":"upload_key","type":"uuid","default":null,"identity":"","not_null":false,"generated":""},{"name":"web_sha256","type":"text","default":null,"identity":"","not_null":false,"generated":""},{"name":"web_bytes","type":"bigint","default":null,"identity":"","not_null":false,"generated":""},{"name":"width","type":"integer","default":null,"identity":"","not_null":false,"generated":""},{"name":"height","type":"integer","default":null,"identity":"","not_null":false,"generated":""},{"name":"message_id","type":"bigint","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_key","type":"uuid","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_lease_until","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"next_cleanup_at","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"cleanup_attempts","type":"bigint","default":"0","identity":"","not_null":true,"generated":""},{"name":"last_cleanup_at","type":"timestamp with time zone","default":null,"identity":"","not_null":false,"generated":""},{"name":"last_cleanup_removed","type":"boolean","default":null,"identity":"","not_null":false,"generated":""},{"name":"failure_code","type":"text","default":null,"identity":"","not_null":false,"generated":""}],"indexes":["CREATE INDEX photos_actor_created_v2 ON messaging_private_v2.photos USING btree (actor_user_id, created_at)","CREATE UNIQUE INDEX photos_actor_user_id_request_key_key ON messaging_private_v2.photos USING btree (actor_user_id, request_key)","CREATE INDEX photos_cleanup_v2 ON messaging_private_v2.photos USING btree (state, next_cleanup_at, expires_at)","CREATE UNIQUE INDEX photos_message_id_key ON messaging_private_v2.photos USING btree (message_id)","CREATE UNIQUE INDEX photos_pkey ON messaging_private_v2.photos USING btree (attachment_id)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"photos_actor_user_id_request_key_key","type":"u","validated":true,"definition":"UNIQUE (actor_user_id, request_key)"},{"name":"photos_check","type":"c","validated":true,"definition":"CHECK ((((upload_key IS NULL) AND (web_sha256 IS NULL) AND (web_bytes IS NULL) AND (width IS NULL) AND (height IS NULL)) OR ((upload_key IS NOT NULL) AND (web_sha256 IS NOT NULL) AND (web_bytes IS NOT NULL) AND (width IS NOT NULL) AND (height IS NOT NULL))))"},{"name":"photos_check1","type":"c","validated":true,"definition":"CHECK (((state <> ALL (ARRAY['uploading'::text, 'ready'::text, 'attached'::text])) OR (upload_key IS NOT NULL)))"},{"name":"photos_check2","type":"c","validated":true,"definition":"CHECK (((state = 'attached'::text) = (message_id IS NOT NULL)))"},{"name":"photos_check3","type":"c","validated":true,"definition":"CHECK (((state = 'tombstoned'::text) OR ((cleanup_key IS NULL) AND (cleanup_lease_until IS NULL) AND (next_cleanup_at IS NULL))))"},{"name":"photos_check4","type":"c","validated":true,"definition":"CHECK (((cleanup_key IS NULL) = (cleanup_lease_until IS NULL)))"},{"name":"photos_check5","type":"c","validated":true,"definition":"CHECK ((expires_at > created_at))"},{"name":"photos_cleanup_attempts_check","type":"c","validated":true,"definition":"CHECK ((cleanup_attempts >= 0))"},{"name":"photos_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT"},{"name":"photos_failure_code_check","type":"c","validated":true,"definition":"CHECK ((failure_code ~ '^[A-Z0-9_]{1,64}$'::text))"},{"name":"photos_height_check","type":"c","validated":true,"definition":"CHECK (((height >= 1) AND (height <= 1600)))"},{"name":"photos_message_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED"},{"name":"photos_message_id_key","type":"u","validated":true,"definition":"UNIQUE (message_id)"},{"name":"photos_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (attachment_id)"},{"name":"photos_request_key_check","type":"c","validated":true,"definition":"CHECK ((request_key <> '00000000-0000-0000-0000-000000000000'::uuid))"},{"name":"photos_source_bytes_check","type":"c","validated":true,"definition":"CHECK (((source_bytes >= 1) AND (source_bytes <= 1400000)))"},{"name":"photos_source_mime_check","type":"c","validated":true,"definition":"CHECK ((source_mime = 'image/webp'::text))"},{"name":"photos_source_sha256_check","type":"c","validated":true,"definition":"CHECK ((source_sha256 ~ '^[0-9a-f]{64}$'::text))"},{"name":"photos_state_check","type":"c","validated":true,"definition":"CHECK ((state = ANY (ARRAY['reserved'::text, 'uploading'::text, 'ready'::text, 'attached'::text, 'tombstoned'::text])))"},{"name":"photos_web_bytes_check","type":"c","validated":true,"definition":"CHECK (((web_bytes >= 1) AND (web_bytes <= 2000000)))"},{"name":"photos_web_sha256_check","type":"c","validated":true,"definition":"CHECK ((web_sha256 ~ '^[0-9a-f]{64}$'::text))"},{"name":"photos_width_check","type":"c","validated":true,"definition":"CHECK (((width >= 1) AND (width <= 1600)))"}]},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"read_watermarks","owner":"postgres","columns":[{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"through_message_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"updated_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""}],"indexes":["CREATE UNIQUE INDEX read_watermarks_pkey ON messaging_private_v2.read_watermarks USING btree (actor_user_id, identity_id, conversation_id)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"read_watermarks_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE"},{"name":"read_watermarks_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (actor_user_id, identity_id, conversation_id)"},{"name":"read_watermarks_through_message_id_check","type":"c","validated":true,"definition":"CHECK ((through_message_id > 0))"}]},{"acl":[{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"DELETE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"MAINTAIN"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"REFERENCES"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRIGGER"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"TRUNCATE"},{"grantee":"postgres","grantor":"postgres","grantable":false,"privilege":"UPDATE"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"INSERT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"SELECT"},{"grantee":"selqiro_listing_contact_writer_v1","grantor":"postgres","grantable":false,"privilege":"UPDATE"}],"rls":true,"kind":"r","name":"send_receipts","owner":"postgres","columns":[{"name":"actor_user_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"identity_id","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"request_key","type":"uuid","default":null,"identity":"","not_null":true,"generated":""},{"name":"conversation_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"message_id","type":"bigint","default":null,"identity":"","not_null":true,"generated":""},{"name":"intent_sha256","type":"bytea","default":null,"identity":"","not_null":true,"generated":""},{"name":"created_at","type":"timestamp with time zone","default":"clock_timestamp()","identity":"","not_null":true,"generated":""}],"indexes":["CREATE UNIQUE INDEX send_receipts_message_id_key ON messaging_private_v2.send_receipts USING btree (message_id)","CREATE UNIQUE INDEX send_receipts_pkey ON messaging_private_v2.send_receipts USING btree (actor_user_id, request_key)"],"policies":[{"name":"controlled_writer","check":"true","roles":["selqiro_listing_contact_writer_v1"],"using":"true","command":"*","permissive":true}],"force_rls":false,"constraints":[{"name":"send_receipts_conversation_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE RESTRICT"},{"name":"send_receipts_intent_sha256_check","type":"c","validated":true,"definition":"CHECK ((octet_length(intent_sha256) = 32))"},{"name":"send_receipts_message_id_fkey","type":"f","validated":true,"definition":"FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED"},{"name":"send_receipts_message_id_key","type":"u","validated":true,"definition":"UNIQUE (message_id)"},{"name":"send_receipts_pkey","type":"p","validated":true,"definition":"PRIMARY KEY (actor_user_id, request_key)"},{"name":"send_receipts_request_key_check","type":"c","validated":true,"definition":"CHECK ((request_key <> '00000000-0000-0000-0000-000000000000'::uuid))"}]}],"triggers":[{"name":"messaging_account_block_v2","enabled":"O","definition":"CREATE TRIGGER messaging_account_block_v2 BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.guard_account_block()"},{"name":"protect_attached_message_photo_v2","enabled":"O","definition":"CREATE TRIGGER protect_attached_message_photo_v2 BEFORE DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION messaging_private_v2.protect_attached_photo()"}],"public_indexes":[{"name":"messaging_thread_activity_v2","owner":"postgres","definition":"CREATE INDEX messaging_thread_activity_v2 ON public.conversations USING btree (COALESCE(updated_at, created_at) DESC, id DESC)"},{"name":"messaging_thread_message_v2","owner":"postgres","definition":"CREATE INDEX messaging_thread_message_v2 ON public.messages USING btree (conversation_id, id DESC)"}],"storage_policy":[{"name":"message_attachments_v2_server_only","check":"(bucket_id <> 'message-attachments-v2'::text)","roles":["anon","authenticated"],"using":"(bucket_id <> 'message-attachments-v2'::text)","command":"*","permissive":false}]}$structure$::jsonb;
 protected_signatures constant jsonb := $protected$["public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)","public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)","public.get_my_listing_conversation_v1(uuid,uuid,text,text)","public.list_my_listing_conversations_v1(uuid,uuid,text)","listing_contact_private.require_peer(uuid,uuid)","listing_contact_private.peer_ready(uuid,uuid,uuid)","listing_contact_private.require_actor_hosted_v1(uuid,uuid)","listing_contact_private.peer_name_hosted_v1(uuid)","listing_publication_private.require_actor(uuid,uuid)","public.lock_listing_creation_actor_v1(uuid)","public.listing_actor_uid_hosted_v1()","listing_publication_private.assert_hosted_preview_actor(uuid)","listing_publication_private.hosted_storage_contract_ready()","public.current_user_has_identity_access(uuid)","listing_contact_private.require_member(bigint,uuid,uuid)","listing_contact_private.require_unblocked(uuid,uuid)","listing_contact_private.require_key(uuid)","listing_contact_private.positive_id(text)","listing_contact_private.guard_conversation()","listing_contact_private.guard_participant()","public.listing_contact_is_managed_v1(bigint,bigint)","public.listing_contact_visible_v1(bigint)","public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)"]$protected$::jsonb;
 base jsonb:=current_setting('selqiro.message_cards_report')::jsonb;
 actual_functions jsonb;actual_structure jsonb;protected_functions jsonb;storage_policies jsonb;legacy_buckets jsonb;existing_triggers jsonb;
 invariants jsonb:='{}'::jsonb;fingerprints jsonb:='{}'::jsonb;guards jsonb;
 fresh boolean;installed boolean;columns_ok boolean;metadata_ok boolean;table_semantics_ok boolean;trigger_ok boolean;storage_rls boolean;storage_authority boolean;
 storage_setting text;storage_policy_grants jsonb;storage_grant_tables jsonb;
 bucket_state text:='unknown';state_name text:='unknown';recognized boolean:=false;item text;error_state text;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.signature),'[]'::jsonb) INTO actual_functions FROM (SELECT n.nspname||'.'||p.proname||'('||oidvectortypes(p.proargtypes)||')' signature,
 p.proname name,n.nspname schema,pg_get_userbyid(p.proowner) owner,l.lanname language,p.prosecdef secdef,p.provolatile volatility,
 p.proargnames args,p.pronargdefaults defaults,pg_get_expr(p.proargdefaults,0) default_expression,
 pg_get_function_result(p.oid) result,p.proconfig config,
 encode(sha256(convert_to(p.prosrc,'UTF8')),'hex') body_sha256,
 ARRAY(SELECT CASE WHEN acl.grantee=0 THEN 'public' ELSE pg_get_userbyid(acl.grantee) END FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
 WHERE acl.privilege_type='EXECUTE' ORDER BY 1) acl_roles
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE (n.nspname='public' AND p.proname IN('list_my_message_threads_v2','get_my_message_thread_v2','send_my_message_v2','mark_my_thread_read_v2','hide_my_thread_v2','set_my_thread_block_v2',
 'reserve_my_message_photo_v2','claim_message_photo_upload_v2','finish_message_photo_upload_v2','cancel_my_message_photo_v2','get_my_message_photo_binding_v2','claim_message_photo_cleanup_v2','finish_message_photo_cleanup_v2'))
 OR n.nspname='messaging_private_v2' OR (n.nspname='listing_contact_private' AND p.proname='guard_message') ORDER BY 1) q;
 SELECT q.structure INTO actual_structure FROM (SELECT jsonb_build_object(
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
) AS structure) q;
 SELECT count(*)=22 INTO columns_ok FROM (VALUES ('messages','id','bigint'),('messages','conversation_id','bigint'),('messages','sender_id','uuid'),('messages','sender_identity_id','uuid'),('messages','message','text'),('messages','created_at','timestamp with time zone'),('messages','image_path','text'),('messages','image_url','text'),('conversations','id','bigint'),('conversations','buyer_id','uuid'),('conversations','seller_id','uuid'),('conversations','buyer_identity_id','uuid'),('conversations','seller_identity_id','uuid'),('conversations','updated_at','timestamp with time zone'),('conversations','created_at','timestamp with time zone'),('conversations','archived_at','timestamp with time zone'),('conversation_participants','conversation_id','bigint'),('conversation_participants','user_id','uuid'),('conversation_participants','identity_id','uuid'),('conversation_participants','last_read_at','timestamp with time zone'),('conversation_participants','deleted_at','timestamp with time zone'),('identities','avatar_url','text')) e(relation,name,type)
 JOIN pg_class c ON c.relnamespace='public'::regnamespace AND c.relname=e.relation AND c.relkind='r'
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attname=e.name AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod)=e.type;
 -- Final message IDs are assigned under the conversation lock. Cached ranges
 -- across pooled sessions would invalidate that visible-ID ordering guarantee.
 columns_ok:=columns_ok AND EXISTS(SELECT 1 FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid
  WHERE c.relnamespace='public'::regnamespace AND c.relname='messages_id_seq'
  AND s.seqtypid='bigint'::regtype AND s.seqincrement=1 AND s.seqmin=1 AND s.seqcache=1 AND NOT s.seqcycle
  AND has_sequence_privilege('selqiro_listing_contact_writer_v1',s.seqrelid,'USAGE'));
 SELECT coalesce(jsonb_agg(jsonb_build_object('signature',s.value,'definition',pg_get_functiondef(p.oid),
   'acl',p.proacl::text) ORDER BY s.value),'[]'::jsonb) INTO protected_functions
 FROM jsonb_array_elements_text(protected_signatures) s(value) JOIN pg_proc p ON p.oid=to_regprocedure(s.value);
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.polname,'command',q.polcmd,'permissive',q.polpermissive,
   'roles',ARRAY(SELECT CASE WHEN x=0 THEN 'public' ELSE pg_get_userbyid(x) END FROM unnest(q.polroles) x ORDER BY 1),
   'using',pg_get_expr(q.polqual,q.polrelid),'check',pg_get_expr(q.polwithcheck,q.polrelid)) ORDER BY q.polname),'[]'::jsonb)
 INTO storage_policies FROM pg_policy q WHERE q.polrelid='storage.objects'::regclass AND q.polname<>'message_attachments_v2_server_only';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'file_size_limit',b.file_size_limit,'allowed_mime_types',b.allowed_mime_types) ORDER BY b.id),'[]'::jsonb)
 INTO legacy_buckets FROM storage.buckets b WHERE b.id<>'message-attachments-v2';
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY t.tgname),'[]'::jsonb)
 INTO existing_triggers FROM pg_trigger t WHERE t.tgrelid='public.messages'::regclass AND NOT t.tgisinternal
  AND t.tgname NOT IN('protect_attached_message_photo_v2','messaging_account_block_v2');
 trigger_ok:=jsonb_array_length(existing_triggers)=1 AND existing_triggers->0->>'name'='guard_listing_contact'
  AND existing_triggers->0->>'enabled'='O' AND existing_triggers->0->>'definition'=
  'CREATE TRIGGER guard_listing_contact BEFORE INSERT OR DELETE OR UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION listing_contact_private.guard_message()';
 -- BEGIN STORAGE POLICY AUTHORITY
 SELECT c.relrowsecurity,pg_has_role('postgres',c.relowner,'USAGE') INTO storage_rls,storage_authority FROM pg_class c WHERE c.oid='storage.objects'::regclass;
 -- Supabase may delegate policy management without inheriting the table owner.
 -- A registered SIGHUP-only Supautils setting is distinct from an arbitrary
 -- custom GUC placeholder. Its grant is for this exact current user and table.
 IF storage_authority IS NOT TRUE AND current_user='postgres' THEN
  storage_authority:=false;
  BEGIN
   SELECT s.setting INTO storage_setting FROM pg_catalog.pg_settings s
    WHERE s.name='supautils.policy_grants' AND s.context='sighup' AND s.vartype='string';
   IF FOUND THEN
    storage_policy_grants:=storage_setting::jsonb;
    IF jsonb_typeof(storage_policy_grants)='object' THEN
     IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g WHERE jsonb_typeof(g.value)<>'array') THEN
      IF NOT EXISTS(SELECT 1 FROM jsonb_each(storage_policy_grants) g
       CROSS JOIN LATERAL jsonb_array_elements(g.value) t WHERE jsonb_typeof(t.value)<>'string') THEN
       storage_grant_tables:=storage_policy_grants->current_user::text;
       IF jsonb_typeof(storage_grant_tables)='array' THEN
        -- Resolve a table NAME like Supautils, not regclass's numeric-OID input.
        SELECT coalesce(bool_or(pg_catalog.to_regclass((SELECT string_agg(pg_catalog.quote_ident(p.part),'.' ORDER BY p.ordinal)
          FROM unnest(pg_catalog.parse_ident(t.value,true)) WITH ORDINALITY p(part,ordinal)))='storage.objects'::regclass),false)
         INTO storage_authority FROM jsonb_array_elements_text(storage_grant_tables) t(value);
       END IF;
      END IF;
     END IF;
    END IF;
   END IF;
  EXCEPTION WHEN OTHERS THEN
   storage_authority:=false;
  END;
 END IF;
 -- END STORAGE POLICY AUTHORITY
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2') THEN bucket_state:='absent';
 ELSIF EXISTS(SELECT 1 FROM storage.buckets WHERE id='message-attachments-v2' AND public=false AND file_size_limit=2000000 AND allowed_mime_types=ARRAY['image/webp']::text[]) THEN bucket_state:='ready'; END IF;
 fresh:=to_regnamespace('messaging_private_v2') IS NULL
  AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(actual_functions) f WHERE f->>'signature'<>'listing_contact_private.guard_message()')
  AND actual_structure->'tables'='[]'::jsonb AND actual_structure->'public_indexes'='[]'::jsonb AND actual_structure->'triggers'='[]'::jsonb
  AND actual_structure->'storage_policy'='null'::jsonb;
 -- Compare all function bodies, argument names/types/defaults, return types,
 -- owners, settings and role ACLs, and reject unexpected overloads/helpers.
 metadata_ok:=NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE (n.nspname='messaging_private_v2' OR EXISTS(SELECT 1 FROM jsonb_array_elements(expected_functions) f WHERE f->>'schema'=n.nspname AND f->>'name'=p.proname))
  AND (p.proisstrict OR p.proretset OR p.proleakproof OR p.proparallel<>'u' OR p.prosupport<>0
   OR EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.is_grantable OR a.privilege_type<>'EXECUTE' OR a.grantor<>p.proowner)));
 -- PostgreSQL 18 adds named NOT NULL rows to pg_constraint. Column attnotnull
 -- is pinned on both supported representations; omit only the duplicate rows
 -- from the canonical JSON, while checking their full ordinary semantics here.
 table_semantics_ok:=NOT EXISTS(SELECT 1 FROM pg_inherits i JOIN pg_class c
  ON c.oid=i.inhrelid OR c.oid=i.inhparent JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='messaging_private_v2')
  AND NOT EXISTS(SELECT 1 FROM pg_constraint q JOIN pg_class c ON c.oid=q.conrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='messaging_private_v2' AND q.contype='n'
   AND (NOT q.convalidated OR NOT coalesce((to_jsonb(q)->>'conenforced')::boolean,true) OR q.condeferrable OR q.condeferred
    OR NOT q.conislocal OR q.coninhcount<>0 OR q.conparentid<>0 OR q.connoinherit
    OR q.conkey IS NULL OR cardinality(q.conkey)<>1
    OR NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum=q.conkey[1]
     AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull)))
  AND (current_setting('server_version_num')::integer<180000 OR NOT EXISTS(
   SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='messaging_private_v2' AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull
    AND (SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n' AND q.conkey=ARRAY[a.attnum]::smallint[])<>1));
 installed:=actual_functions=expected_functions AND actual_structure=expected_structure AND metadata_ok AND table_semantics_ok;
 guards:=jsonb_build_object('base_contract',base->>'state'='applied' AND base->'recognized'='true'::jsonb,
  'required_columns',coalesce(columns_ok,false),'existing_message_triggers',coalesce(trigger_ok,false),
  'storage_row_security',coalesce(storage_rls,false),'storage_policy_authority',coalesce(storage_authority,false),
  'known_object_state',coalesce(fresh OR installed,false),
  'bucket_contract',bucket_state='ready' OR (fresh AND bucket_state='absent'));
 recognized:=NOT EXISTS(SELECT 1 FROM jsonb_each(guards) g WHERE g.value<>'true'::jsonb OR g.value='null'::jsonb);
 IF recognized AND fresh THEN state_name:='absent'; ELSIF recognized AND installed THEN state_name:='applied'; END IF;
 FOREACH item IN ARRAY ARRAY['legacy_policies','writer_role','api_boundary','hosted_settings','patched_functions','reader'] LOOP
  invariants:=invariants||jsonb_build_object(item,base->'fingerprints'->>item);
 END LOOP;
 invariants:=invariants||jsonb_build_object('protected_functions',encode(sha256(convert_to(protected_functions::text,'UTF8')),'hex'),
  'legacy_storage_policies',encode(sha256(convert_to(storage_policies::text,'UTF8')),'hex'),
  'legacy_buckets',encode(sha256(convert_to(legacy_buckets::text,'UTF8')),'hex'),
  'existing_message_triggers',encode(sha256(convert_to(existing_triggers::text,'UTF8')),'hex'),
  'public_schema_acl',(SELECT encode(sha256(convert_to(coalesce(nspacl::text,''),'UTF8')),'hex') FROM pg_namespace WHERE nspname='public'));
 fingerprints:=jsonb_build_object('new_functions',encode(sha256(convert_to(actual_functions::text,'UTF8')),'hex'),
  'new_structure',encode(sha256(convert_to(actual_structure::text,'UTF8')),'hex'),
  'new_guard',(SELECT value->>'body_sha256' FROM jsonb_array_elements(actual_functions) WHERE value->>'signature'='listing_contact_private.guard_message()'));
 PERFORM set_config('selqiro.messaging_restore_report',jsonb_build_object('format','selqiro-messaging-restore-v2','state',state_name,
  'recognized',recognized,'bucket_state',bucket_state,'ready_to_apply',state_name='absent' AND bucket_state='ready',
  'required_bucket',jsonb_build_object('id','message-attachments-v2','name','message-attachments-v2','public',false,'file_size_limit',2000000,'allowed_mime_types',jsonb_build_array('image/webp')),
  'guards',guards,'invariants',invariants,'fingerprints',fingerprints)::text,true);
EXCEPTION WHEN OTHERS THEN
 GET STACKED DIAGNOSTICS error_state=RETURNED_SQLSTATE;
 PERFORM set_config('role','none',true);
 PERFORM set_config('selqiro.messaging_restore_report',jsonb_build_object('format','selqiro-messaging-restore-v2','state','unknown',
  'recognized',false,'bucket_state','unknown','ready_to_apply',false,'probe_code',error_state,
  'guards',jsonb_build_object('catalog_inspection_completed',false),'invariants','{}'::jsonb,'fingerprints','{}'::jsonb)::text,true);
END $messaging_guard$;
DO $after$
DECLARE r jsonb:=current_setting('selqiro.messaging_restore_report')::jsonb;
 before_state jsonb:=current_setting('selqiro.messaging_restore_before')::jsonb;
BEGIN
 IF r->>'state'<>'applied' OR r->'recognized'<>'true'::jsonb OR r->>'bucket_state'<>'ready' THEN
  RAISE EXCEPTION 'MESSAGING_RESTORE_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END IF;
 IF r->'invariants' IS DISTINCT FROM before_state->'invariants' THEN
  RAISE EXCEPTION 'MESSAGING_RESTORE_PROTECTED_INVARIANT_CHANGED' USING ERRCODE='55000'; END IF;
END $after$;
NOTIFY pgrst, 'reload schema';
SELECT current_setting('selqiro.messaging_restore_report')::jsonb AS result;
COMMIT;
