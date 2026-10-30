-- Read-only installed-state inspection. No user identifiers or row contents are returned.
BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='3s';
SET LOCAL search_path=pg_catalog,public,pg_temp;
DO $catalog_guard$
DECLARE
 specs constant jsonb := $specs$[{"signature":"public.contact_my_listing_seller_v1(uuid,uuid,uuid,text)","name":"public.contact_my_listing_seller_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"50e84938abd4b5e47ef1344727688bae0d49f4c05ffe73c1590a2d6555e7bb72","fixed_sha256":"45b13119d7f8c75c4efeb0996ad14cfa60b02cd031015b64b5ab5655e1577710","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.send_my_listing_message_v1(uuid,uuid,uuid,text,text,text)","name":"public.send_my_listing_message_v1","args":["p_expected_user_id","p_expected_identity_id","p_request_key","p_conversation_id","p_message","p_listing_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"529c7780a55d58e825eca45f86bcc9615201975579f15fa6c43d646b74adc471","fixed_sha256":"2b2f38a55bef3b0751ae2ae045f973a9a7032ed322ef6bf5ca1e39b1fe0bd56a","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.get_my_listing_conversation_v1(uuid,uuid,text,text)","name":"public.get_my_listing_conversation_v1","args":["p_expected_user_id","p_expected_identity_id","p_conversation_id","p_before_message_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"cdf1a128a2eab29d8975517005af0385afa1565e7c2bc74ca2133bfc6b85ddfc","fixed_sha256":"04cf2707130e6845a0b48332664caade46e9ae354a54dd14acae18532615b25d","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"public.list_my_listing_conversations_v1(uuid,uuid,text)","name":"public.list_my_listing_conversations_v1","args":["p_expected_user_id","p_expected_identity_id","p_before_conversation_id"],"result":"jsonb","owner":"selqiro_listing_contact_writer_v1","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,public,auth,pg_temp"],"defaults":1,"default_expression":"NULL::text","group":"changed","body_sha256":"691956e594cf4f0c0ddac5da50df31d17e784b8d4bd2de4e7188af1d85d1c8d0","fixed_sha256":"c47b47d481ace70c4038f8a52bbdb10a0dcde969cf8212644a89fe062126515f","fixed_secdef":true,"acl_roles":["authenticated","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_peer(uuid,uuid)","name":"listing_contact_private.require_peer","args":["p_user","p_identity"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_sha256":"43f16a23f77900f91a850c3d7d41689b806680f7ffb68796d164d23cccd3f7aa","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_ready(uuid,uuid,uuid)","name":"listing_contact_private.peer_ready","args":["p_user","p_identity","p_viewer"],"result":"boolean","owner":"postgres","language":"sql","secdef":false,"volatility":"s","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"changed","body_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_sha256":"ae5647d577c57fa9afb13ff3683369ba40436a6174bd2396e11c3642b48f7e62","fixed_secdef":true,"acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.require_actor_hosted_v1(uuid,uuid)","name":"listing_contact_private.require_actor_hosted_v1","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"d6b6bede7ce642c19c3ebdb0e809abf1ab049c789b2219b9e8454923c88f5518","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_contact_private.peer_name_hosted_v1(uuid)","name":"listing_contact_private.peer_name_hosted_v1","args":["p_identity"],"result":"text","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"new","body_sha256":"836c3f6e06f1c84d9d93c7aa1c150bd2e17e3b68884b422849ca073a4c8a0d90","acl_roles":["postgres","selqiro_listing_contact_writer_v1"]},{"signature":"listing_publication_private.require_actor(uuid,uuid)","name":"listing_publication_private.require_actor","args":["p_expected_user_id","p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"9a86e4ca817793a77420dfc2e74d9e2df18298436638a7bf241428fca2c9a3f0"},{"signature":"public.lock_listing_creation_actor_v1(uuid)","name":"public.lock_listing_creation_actor_v1","args":["p_expected_identity_id"],"result":"uuid","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"45c3cd15d8181606e839e83978b114bced5dd5480781a956ed40d96cd62802d8"},{"signature":"public.listing_actor_uid_hosted_v1()","name":"public.listing_actor_uid_hosted_v1","args":[],"result":"uuid","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ff7f6ce615280095930c983468c5ce5a6c3982bc4f540e4929bb0baf904ce88d"},{"signature":"listing_publication_private.assert_hosted_preview_actor(uuid)","name":"listing_publication_private.assert_hosted_preview_actor","args":["p_actor"],"result":"void","owner":"postgres","language":"plpgsql","secdef":true,"volatility":"v","config":["lock_timeout=2s","search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"307f98bf3584f0394697bbb1a4d60c54454c69b193f5c2bba0cf68701d7babc2"},{"signature":"listing_publication_private.hosted_storage_contract_ready()","name":"listing_publication_private.hosted_storage_contract_ready","args":[],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"2e41806725b8c4f9af82e4541d8fc4a17faae54aa36dc5d63be1c40c753f841f"},{"signature":"public.current_user_has_identity_access(uuid)","name":"public.current_user_has_identity_access","args":["p_identity_id"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"b708d7abdfac00c7341979f4ff6dfae2ab2bfb55d311f27c7cc2935167224027"},{"signature":"listing_contact_private.require_member(bigint,uuid,uuid)","name":"listing_contact_private.require_member","args":["p_conversation","p_user","p_identity"],"result":"listing_contact_private.channels","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"20e71c37d94292b18235d0346133c4bd088d7ca13ce61706e2fb3305be28a689"},{"signature":"listing_contact_private.require_unblocked(uuid,uuid)","name":"listing_contact_private.require_unblocked","args":["p_first","p_second"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"aabb21ea89dd484394e31241d5e490551f72935900840946dd286d937dbdae80"},{"signature":"listing_contact_private.require_key(uuid)","name":"listing_contact_private.require_key","args":["v"],"result":"void","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"8c0a721a658f0aee11b5ab6eb59386829974b4c16f4ab17e01ce60cd58b82c1d"},{"signature":"listing_contact_private.positive_id(text)","name":"listing_contact_private.positive_id","args":["v"],"result":"bigint","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"i","config":["search_path=pg_catalog,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"27c9aa1df9f9951953e563e6082d397c3bf70fe87e7c7081879a227c82fd098e"},{"signature":"listing_contact_private.guard_conversation()","name":"listing_contact_private.guard_conversation","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"7c86041baee326a66504c329d89be942cf5af0c62ca5f58b027b9b72bb349207"},{"signature":"listing_contact_private.guard_message()","name":"listing_contact_private.guard_message","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"a5be6fd14797297cc98667155325d8518dbdf7a36df69739c2c4cdd1e01b520c"},{"signature":"listing_contact_private.guard_participant()","name":"listing_contact_private.guard_participant","args":[],"result":"trigger","owner":"postgres","language":"plpgsql","secdef":false,"volatility":"v","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"97e3f59dd5cf441cb3f2ff33b473a5361c481ed8d65f3b4fc8c3ea72ea003420"},{"signature":"public.listing_contact_is_managed_v1(bigint,bigint)","name":"public.listing_contact_is_managed_v1","args":["p_conversation","p_listing"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,pg_temp"],"defaults":1,"default_expression":"NULL::bigint","group":"shared","body_sha256":"438bea962cc7ddc548cf4f29b354b38d0d3208f0c5792acae2b606e4c79a0edd"},{"signature":"public.listing_contact_visible_v1(bigint)","name":"public.listing_contact_visible_v1","args":["p_conversation"],"result":"boolean","owner":"postgres","language":"sql","secdef":true,"volatility":"s","config":["search_path=pg_catalog,public,auth,pg_temp"],"defaults":0,"default_expression":null,"group":"shared","body_sha256":"ba2976f4b0a465d3f0e409e673d30f083a147f5e1815a141f0ac473ac081609e"}]$specs$::jsonb;
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

SELECT current_setting('selqiro.message_cards_report')::jsonb AS result;
ROLLBACK;
