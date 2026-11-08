// Build installation recognition only from retained, versioned declarations in
// a disposable PostgreSQL/WASM database, including retained public function
// defaults and PostgreSQL 17's distinct provider bootstrap grantor. Never learn
// acceptable function bodies or authority drift from live state.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
process.env.SELQIRO_HORSE_LIFECYCLE_BASELINE_ONLY='1';
const f=await import('./fixture.mjs');
const {db,root,repair,provenance,applyLifecycleModules}=f;
const here=path.join(repair,'tests'),read=n=>fs.readFileSync(path.join(repair,n),'utf8');
const quote=s=>"'"+s.replaceAll("'","''")+"'",array=x=>'ARRAY['+x.map(quote).join(',')+']::text[]';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const modules=['01_lifecycle_core.sql','02_owner_actions.sql','03_authority.sql'];
const changes=modules.map(name=>'-- COMPONENT '+name+'\n'+read(name)).join('\n');
for(const name of [...modules,'tests/fixture.mjs','tests/build-guards.mjs'])
 provenance.push({path:'supabase/repairs/20261108_horse_lifecycle/'+name,sha256:sha(read(name))});
const declarations=[...changes.matchAll(/CREATE(?: OR REPLACE)? FUNCTION\s+([a-z_]+\.[a-z0-9_]+)\s*\(/gi)].map(x=>x[1]);
assert.equal(declarations.length,new Set(declarations).size,'one reviewed signature per function name');
const capNames=declarations.sort();
const changedNames=['horse_publication_private.is_public','horse_publication_private.close_published_attempt',
 'horse_publication_private.attempt_publication_matches','public.prepare_my_horse_publication_v1',
 'public.publish_my_horse_offer_v1'].sort();
assert.equal(capNames.length,12,'exact reviewed horse lifecycle function scope');
const newNames=capNames.filter(x=>!changedNames.includes(x));
assert.deepEqual([...changes.matchAll(/CREATE OR REPLACE FUNCTION\s+([a-z_]+\.[a-z0-9_]+)/gi)].map(x=>x[1]).sort(),changedNames);
const beforeSlots=(await db.query(`SELECT n.nspname||'.'||p.proname name,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY($1)`,[capNames])).rows;
assert.deepEqual(beforeSlots.map(x=>x.name).sort(),changedNames,'restore exact prior declarations before generating pins');
const priorPinPath='supabase/repairs/20261108_upload_capacity/catalog-pins.json';
const priorPinBytes=fs.readFileSync(path.join(root,priorPinPath));
provenance.push({path:priorPinPath,sha256:sha(priorPinBytes)});
const priorPins=JSON.parse(priorPinBytes);
const deps=[...new Set([...priorPins.dependency_function_names,...priorPins.changed_function_names,
 ...priorPins.new_function_names])].filter(x=>!capNames.includes(x)).sort();
const newRelations=[];
assert(!/^\s*(?:CREATE|ALTER|DROP)\s+(?:TABLE|SCHEMA|ROLE|POLICY|TRIGGER|INDEX|VIEW)\b/mi.test(changes),
 'horse lifecycle release changes function definitions and explicit function authority only');
const horseRelations=['public.horse_offers','public.horse_offer_images','public.horse_offer_publication_events'];
const horsePrivateRelations=['commands','closed_requests','gallery','contact_receipts','thread_context','message_cards']
 .map(x=>'horse_publication_private.'+x);
const addedTriggers=[];
const addedTriggerCondition='false';
const actualRelations=[...horseRelations,...horsePrivateRelations,'public.publication_policy_documents','public.user_publication_policy_acceptances'];
const invariantRelations=[...actualRelations,'public.profiles','public.identities','public.business_members','public.listings','public.listing_images',
 'public.conversations','public.messages','public.conversation_participants','public.identity_profiles','public.user_blocks'];
const functionFacts=`SELECT n.nspname||'.'||p.proname name,
 format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature,
 jsonb_build_object('definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'language',l.lanname,
  'kind',p.prokind,'leakproof',p.proleakproof,'parallel',p.proparallel) facts,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type,x.is_grantable),'[]') FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x) acl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
 WHERE p.prokind IN('f','p') AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private')
  OR n.nspname||'.'||p.proname=ANY(${array([...deps,...capNames])}))`;
const relationFacts=`SELECT n.nspname||'.'||c.relname name,
 jsonb_build_object('name',n.nspname||'.'||c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'persistence',c.relpersistence,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),
  'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(ad.adbin,ad.adrelid),
  'collation',CASE WHEN a.attcollation=0 THEN NULL ELSE a.attcollation::regcollation::text END) ORDER BY a.attnum),'[]')
  FROM pg_attribute a LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.conname,'type',q.contype,'definition',pg_get_constraintdef(q.oid),
  'validated',q.convalidated,'deferrable',q.condeferrable,'deferred',q.condeferred,'local',q.conislocal,'inheritance',q.coninhcount,
  'no_inherit',q.connoinherit) ORDER BY q.conname),'[]') FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype<>'n'),
 'nonstandard_not_null',(SELECT count(*) FROM pg_constraint q WHERE q.conrelid=c.oid AND q.contype='n'
  AND (NOT q.convalidated OR NOT q.conislocal OR q.coninhcount<>0 OR q.connoinherit)),
 'inheritance',(SELECT coalesce(jsonb_agg(i.inhparent::regclass::text ORDER BY i.inhseqno),'[]') FROM pg_inherits i WHERE i.inhrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',ic.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready) ORDER BY ic.relname),'[]') FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid))
  ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND NOT ${addedTriggerCondition})) structure,
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
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN('r','p')
 AND (n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private')
  OR n.nspname||'.'||c.relname=ANY(${array(invariantRelations)}))`;
const fnAggregate=condition=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',signature,'facts',facts,'acl',acl) ORDER BY signature),'[]')
 FROM function_facts WHERE ${condition})`;
const schemaAggregate=names=>`(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),
 'acl',(SELECT jsonb_agg(jsonb_build_object('grantor',pg_get_userbyid(x.grantor),
  'grantee',CASE WHEN x.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END,'privilege',x.privilege_type,'grantable',x.is_grantable)
  ORDER BY x.grantee::regrole::text,x.privilege_type) FROM aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) x)) ORDER BY n.nspname),'[]')
 FROM pg_namespace n WHERE n.nspname=ANY(${array(names)}))`;
const newTriggerAggregate=`(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,
 'enabled',t.tgenabled,'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname),'[]')
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE ${addedTriggerCondition})`;
const viewNames=['listing_publication_private.hosted_storage_objects','listing_publication_private.hosted_s3_multipart_uploads',
 'listing_publication_private.hosted_s3_multipart_uploads_parts'];
const dependencyAggregate=`jsonb_build_object('functions',${fnAggregate('NOT(name=ANY('+array(capNames)+'))')},
 'canonical_structure',(SELECT coalesce(jsonb_agg(structure ORDER BY name),'[]') FROM relation_facts WHERE name=ANY(${array(actualRelations)})),
 'policy_authority',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name),'[]')
 FROM relation_facts WHERE name=ANY(${array(actualRelations)})),
 'views',(SELECT jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'owner',pg_get_userbyid(c.relowner),
 'kind',c.relkind,'options',c.reloptions,'definition',pg_get_viewdef(c.oid,true)) ORDER BY n.nspname,c.relname)
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='v' AND n.nspname||'.'||c.relname=ANY(${array(viewNames)})))`;
const capabilityAggregate=`jsonb_build_object('functions',${fnAggregate('name=ANY('+array(capNames)+')')})`;
const fingerprint=x=>`encode(sha256(convert_to((${x})::text,'UTF8')),'hex')`;
const query=(expr)=>`WITH function_facts AS (${functionFacts}),relation_facts AS (${relationFacts}) SELECT ${expr} value`;
await db.exec('SET search_path=pg_catalog,pg_temp');
const dependencies=(await db.query(query(fingerprint(dependencyAggregate)))).rows[0].value;
const beforeCapability=(await db.query(query(fingerprint(capabilityAggregate)))).rows[0].value;
const selectedDependencyNames=(await db.query(`WITH function_facts AS (${functionFacts})
 SELECT DISTINCT name FROM function_facts WHERE NOT(name=ANY(${array(capNames)})) ORDER BY name`)).rows.map(row=>row.name);
assert.deepEqual(selectedDependencyNames,deps,'complete retained function inventory from accepted capacity-r2');
const invariantFacts=`jsonb_build_object('functions',${fnAggregate('NOT(name=ANY('+array(capNames)+'))')},
 'structure',(SELECT jsonb_agg(structure ORDER BY name) FROM relation_facts),
 'authority',(SELECT jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name) FROM relation_facts))`;
const beforeInvariants=(await db.query(query(invariantFacts))).rows[0].value;
const changedAuthority=`SELECT n.nspname||'.'||p.proname name,pg_get_userbyid(p.proowner) owner,
 p.proacl::text acl,p.prosecdef,p.proconfig,p.provolatile,p.proparallel,p.proleakproof,p.prokind,
 oidvectortypes(p.proargtypes) arguments,format_type(p.prorettype,NULL) returns
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname||'.'||p.proname=ANY($1) ORDER BY n.nspname,p.proname`;
const beforeChangedAuthority=(await db.query(changedAuthority,[changedNames])).rows;
await db.exec('BEGIN');
await applyLifecycleModules();
assert.equal((await db.query(query(fingerprint(dependencyAggregate)))).rows[0].value,dependencies,
 'unchanged retained function definitions, canonical structures and authority');
const afterInvariants=(await db.query(query(invariantFacts))).rows[0].value;
assert.deepEqual(afterInvariants,beforeInvariants,'all existing functions outside reviewed scope, structure and authority unchanged');
assert.deepEqual((await db.query(changedAuthority,[changedNames])).rows,beforeChangedAuthority,
 'replaced functions retain exact signatures, owners, ACLs and execution settings');
const capability=(await db.query(query(fingerprint(capabilityAggregate)))).rows[0].value;
const signatures=(await db.query(`SELECT n.nspname||'.'||p.proname name,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) signature
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY($1)`,[capNames])).rows;
assert.equal(signatures.length,capNames.length);
const roles=['selqiro_listing_final_writer_v1','selqiro_listing_contact_writer_v1'];
const roleFacts=`jsonb_build_object('roles',(SELECT jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'super',rolsuper,
 'createdb',rolcreatedb,'createrole',rolcreaterole,'inherit',rolinherit,'replication',rolreplication,'bypassrls',rolbypassrls) ORDER BY rolname)
 FROM pg_roles WHERE rolname=ANY(${array(roles)})),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('role',pg_get_userbyid(roleid),'member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),
 'admin',admin_option,'inherit',inherit_option,'set',set_option) ORDER BY roleid::regrole::text,member::regrole::text,grantor::regrole::text),'[]')
 FROM pg_auth_members WHERE pg_get_userbyid(roleid)=ANY(${array(roles)}) OR pg_get_userbyid(member)=ANY(${array(roles)})))`;
const rolePin=(await db.query('SELECT '+roleFacts+' value')).rows[0].value;
const triggerNames=['protect_attempt','protect_slot','protect_object','protect_web_image','protect_publication','protect_cleanup',
 'guard_managed_listing','guard_managed_image','protect_multipart_attempt','protect_multipart_session','protect_multipart_auxiliary',
 'guard_horse_multipart_key','guard_horse_web_key','horse_message_context'];
const triggerFacts=`(SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',t.tgname,'enabled',t.tgenabled,
 'definition',pg_get_triggerdef(t.oid)) ORDER BY n.nspname,c.relname,t.tgname)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE t.tgname=ANY(${array(triggerNames)}) AND n.nspname IN('public','listing_publication_private'))`;
const triggerPin=(await db.query('SELECT '+triggerFacts+' value')).rows[0].value;assert.equal(triggerPin.length,triggerNames.length);
// These relation/name pairs come from retained release20/30/40, the managed
// primary/addition repairs and the messaging restoration. Never promote the
// whole disposable fixture policy inventory into a production baseline pin.
const requiredPolicies=[
 ['horse_publication_private.commands','horse_command_writer_read'],
 ['horse_publication_private.gallery','horse_gallery_writer_read'],
 ['horse_publication_private.closed_requests','horse_closed_writer_read'],
 ...['contact_receipts','thread_context','message_cards'].map(n=>['horse_publication_private.'+n,'contact_writer']),
 ['public.horse_offers','horse_writer_read_offers'],['public.horse_offer_images','horse_writer_read_images'],
 ['public.horse_offer_publication_events','horse_writer_read_events'],
 ...['channels','contact_receipts','message_receipts'].map(n=>['listing_contact_private.'+n,'contact_writer']),
 ...['attempts','cleanup','objects','publications','slots','upload_grants','web_images']
  .map(n=>['listing_publication_private.'+n,'final_internal_writer']),
 ['listing_publication_private.publications','contact_writer_read'],
 ['listing_publication_private.managed_image_additions_v1','managed_image_addition_writer'],
 ['listing_publication_private.managed_image_presentations_v1','managed_image_presentation_writer'],
 ['listing_publication_private.multipart_abort_observations','multipart_abort_internal'],
 ['listing_publication_private.multipart_attempts','multipart_attempt_internal'],
 ['listing_publication_private.multipart_auxiliary_receipts','multipart_auxiliary_internal'],
 ['listing_publication_private.multipart_sessions','multipart_session_internal'],
 ['listing_publication_private.source_no_release','source_no_release_internal'],
 ['listing_publication_private.source_recorded_no_release','recorded_no_release_insert_internal'],
 ['listing_publication_private.source_recorded_no_release','release_read_internal'],
 ['listing_publication_private.source_release_tracking','release_read_internal'],
 ['listing_publication_private.source_release_tracking','tracking_insert_internal'],
 ['listing_publication_private.web_write_completions','completion_internal_writer'],
 ['listing_publication_private.write_settlements','settlement_internal'],
 ...['photos','read_watermarks','send_receipts'].map(n=>['messaging_private_v2.'+n,'controlled_writer']),
 ['public.listings','final_writer_listings'],['public.listing_images','final_writer_images'],
 ...['conversations','messages','conversation_participants'].flatMap(n=>[
  ['public.'+n,'contact_identity_visibility'],['public.'+n,'contact_writer']]),
 ...['profiles','identities','business_members','user_blocks','listings'].flatMap(n=>[
  ['public.'+n,'contact_writer_read'],['public.'+n,'contact_writer_lock']])
].sort(([ar,an],[br,bn])=>ar.localeCompare(br)||an.localeCompare(bn));
assert.equal(new Set(requiredPolicies.map(x=>x.join('/'))).size,requiredPolicies.length);
const policyPairs='(VALUES '+requiredPolicies.map(row=>'('+row.map(quote).join(',')+')').join(',')+')';
const privatePolicyRelations=[...new Set(requiredPolicies.map(x=>x[0]).filter(x=>!x.startsWith('public.')))];
const policyFacts=`(SELECT jsonb_agg(jsonb_build_object('relation',n.nspname||'.'||c.relname,'name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,
 'roles',(SELECT jsonb_agg(CASE WHEN r=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r) END ORDER BY r::regrole::text) FROM unnest(p.polroles) r),
 'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY n.nspname,c.relname,p.polname)
 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname||'.'||c.relname,p.polname) IN ${policyPairs})`;
const policyPin=(await db.query('SELECT '+policyFacts+' value')).rows[0].value;
assert.equal(policyPin.length,requiredPolicies.length,'all required policies restored from retained declarations');
assert(!policyPin.some(x=>x.name.startsWith('fixture_')),'synthetic policies cannot be acceptance pins');
const noExtraPrivatePolicies=`NOT EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname||'.'||c.relname=ANY(${array(privatePolicyRelations)})
 AND (n.nspname||'.'||c.relname,p.polname) NOT IN ${policyPairs})`;
assert((await db.query('SELECT '+noExtraPrivatePolicies+' value')).rows[0].value,
 'the reviewed private relations have exactly their retained policy sets');
const requiredColumns=[['public.profiles','id','uuid'],['public.profiles','active_identity_id','uuid'],
 ['public.identities','id','uuid'],['public.identities','status','text'],['public.identities','business_account_id','uuid'],
 ['public.business_members','user_id','uuid'],['public.business_members','business_account_id','uuid'],['public.business_members','status','text'],
 ['public.messages','id','bigint'],['public.messages','conversation_id','bigint'],['public.messages','sender_id','uuid'],
 ['public.conversations','id','bigint'],['public.conversation_participants','conversation_id','bigint'],['public.conversation_participants','user_id','uuid'],
 ['public.identity_profiles','identity_id','uuid'],['public.identity_profiles','display_name','text'],['public.identity_profiles','slug','text']];
const coreTables=['public.profiles','public.identities','public.business_members',...horseRelations,...horsePrivateRelations,
 'listing_publication_private.attempts','listing_publication_private.objects','listing_publication_private.slots',
 'listing_publication_private.web_images','listing_publication_private.multipart_sessions','listing_publication_private.cleanup',
 'listing_contact_private.channels','public.messages','public.conversations'];
const common=`WITH function_facts AS (${functionFacts}),relation_facts AS (${relationFacts}),
 hosted AS (SELECT jsonb_build_object('project_ref',project_ref,'release_id',release_id,'instance_id',instance_id,
 'release_ready',release_ready,'storage_authority_version',storage_authority_version,'cleanup_mode','held') context,to_jsonb(s) all_settings
 FROM listing_publication_private.hosted_preview_settings s WHERE singleton),
 measured AS (SELECT ${fingerprint(dependencyAggregate)} dependencies,${fingerprint(capabilityAggregate)} capability,
 ${fingerprint(fnAggregate("NOT(name=ANY("+array(capNames)+"))"))} existing_functions,
 ${fingerprint(`jsonb_build_object('tables',(SELECT jsonb_agg(jsonb_build_object('name',name,'authority',authority) ORDER BY name)
 FROM relation_facts),
 'schemas',${schemaAggregate(['public','listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private'])},
 'roles',${roleFacts},'settings',(SELECT all_settings FROM hosted),
 'actors',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.actor_user_id),'[]') FROM listing_publication_private.hosted_preview_actors a))`)} existing_authority,
 ${fingerprint("(SELECT jsonb_agg(structure ORDER BY name) FROM relation_facts)")} immutable_structure),
 checks AS (SELECT dependencies=${quote(dependencies)} AS functions,
 current_user='postgres' AND session_user='postgres' AND current_setting('transaction_isolation')='read committed'
  AND current_setting('server_version_num')::integer>=170000 AS installer,
 ${roleFacts}=${quote(JSON.stringify(rolePin))}::jsonb AND NOT EXISTS(SELECT 1 FROM unnest(${array(roles)}) r
  WHERE has_schema_privilege(r,'public','CREATE') OR has_schema_privilege(r,'listing_publication_private','CREATE')
  OR EXISTS(SELECT 1 FROM unnest(ARRAY['anon','authenticated','service_role']) a WHERE pg_has_role(a,r,'MEMBER'))) AS actor_roles,
 NOT EXISTS(SELECT 1 FROM pg_namespace n CROSS JOIN unnest(ARRAY['anon','authenticated','service_role']) a
  WHERE n.nspname IN('listing_publication_private','listing_contact_private','messaging_private_v2','horse_publication_private')
  AND (n.nspowner<>to_regrole('postgres') OR has_schema_privilege(a,n.oid,'USAGE') OR has_schema_privilege(a,n.oid,'CREATE'))) AS closed_private_schema,
 NOT EXISTS(SELECT 1 FROM unnest(${array(coreTables)}) required(name) LEFT JOIN pg_class c ON c.oid=to_regclass(required.name)
  WHERE c.oid IS NULL OR c.relkind<>'r' OR NOT c.relrowsecurity OR c.relowner<>to_regrole('postgres')) AS core_relations,
 NOT EXISTS(SELECT 1 FROM (VALUES ${requiredColumns.map(row=>'('+row.map(quote).join(',')+')').join(',')}) required(relation_name,column_name,type_name)
 WHERE NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass(required.relation_name) AND a.attname=required.column_name
 AND NOT a.attisdropped AND a.atttypid=to_regtype(required.type_name) AND a.attgenerated='')) AS required_columns,
 ${triggerFacts}=${quote(JSON.stringify(triggerPin))}::jsonb AS managed_triggers,
 ${policyFacts}=${quote(JSON.stringify(policyPin))}::jsonb AND ${noExtraPrivatePolicies} AS final_writer_policies,
 EXISTS(SELECT 1 FROM hosted WHERE context->>'project_ref'='vyjletlmwoiwxsnsunlm' AND context->>'release_id'='listing-publication-hosted-preview-v1'
 AND (context->>'release_ready')::boolean AND context->>'storage_authority_version'='source-part-rfc3986-v1'
 AND context->>'instance_id'='2d088814-0900-448a-a9d1-7b05470cb1d2') AND listing_publication_private.hosted_storage_contract_ready() AS hosted_context_ready,
 capability=${quote(beforeCapability)}
 AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname||'.'||p.proname=ANY(${array(capNames)}))=${changedNames.length} AS capability_absent,
 capability=${quote(capability)} AND (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname||'.'||p.proname=ANY(${array(capNames)}))=${capNames.length} AS capability_present FROM measured),
 assessed AS (SELECT *,coalesce(functions AND installer AND actor_roles AND closed_private_schema AND core_relations
 AND required_columns AND managed_triggers AND final_writer_policies AND hosted_context_ready,false) dependencies_ok FROM checks),
 result_row AS (SELECT jsonb_build_object('schema_version',1,'kind','horse-lifecycle-v1',
 'state',CASE WHEN dependencies_ok AND capability_absent AND NOT capability_present THEN 'absent'
 WHEN dependencies_ok AND capability_present AND NOT capability_absent THEN 'applied' ELSE 'unknown' END,
 'recognized',dependencies_ok AND (capability_absent<>capability_present),'ready_to_apply',dependencies_ok AND capability_absent AND NOT capability_present,
 'dependencies_ok',dependencies_ok,'capability_absent',capability_absent,'capability_present',capability_present,
 'guards',to_jsonb(assessed)-ARRAY['dependencies_ok','capability_absent','capability_present'],'hosted_context',(SELECT context FROM hosted),
 'fingerprints',jsonb_build_object('dependencies',dependencies,'capability',capability),
 'invariants',jsonb_build_object('existing_functions',existing_functions,'existing_authority',existing_authority,'immutable_structure',immutable_structure)) result
 FROM assessed CROSS JOIN measured) SELECT result FROM result_row`;
const header='-- GENERATED by tests/build-guards.mjs from exact retained declarations.\n-- Modules SHA-256: '+sha(changes)+'\n';
const readonly=header+"BEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=pg_catalog,pg_temp;\nSET LOCAL statement_timeout='20s';\n"+common+';\nCOMMIT;\n';
const apply=header+`BEGIN;
SET LOCAL search_path=pg_catalog,pg_temp;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
DO $lock$ BEGIN PERFORM pg_advisory_xact_lock(hashtextextended('selqiro-horse-lifecycle-v1',0)); END $lock$;
LOCK TABLE listing_publication_private.attempts,listing_publication_private.objects,
 listing_publication_private.slots,listing_publication_private.cleanup,listing_publication_private.publications,
 listing_publication_private.multipart_sessions,listing_publication_private.web_images,
 horse_publication_private.commands,horse_publication_private.gallery,
 public.horse_offers,public.horse_offer_images IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE horse_lifecycle_install_before ON COMMIT DROP AS ${common};
DO $before$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM horse_lifecycle_install_before WHERE (result->>'recognized')::boolean AND result->>'state' IN('absent','applied')) THEN
 RAISE EXCEPTION 'HORSE_LIFECYCLE_KNOWN_STATE_REQUIRED' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM horse_lifecycle_install_before WHERE result->>'state'='absent') THEN
 EXECUTE $horse_lifecycle_modules$${changes}$horse_lifecycle_modules$;
 END IF;
END $before$;
CREATE TEMP TABLE horse_lifecycle_install_after ON COMMIT DROP AS ${common};
DO $after$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM horse_lifecycle_install_after a CROSS JOIN horse_lifecycle_install_before b WHERE a.result->>'state'='applied'
 AND a.result->'invariants'=b.result->'invariants'
 AND a.result->'fingerprints'->>'dependencies'=b.result->'fingerprints'->>'dependencies'
 AND a.result->'hosted_context'=b.result->'hosted_context') THEN
 RAISE EXCEPTION 'HORSE_LIFECYCLE_INSTALLED_STATE_NOT_VERIFIED' USING ERRCODE='55000'; END IF;
END $after$;
NOTIFY pgrst,'reload schema';
SELECT result FROM horse_lifecycle_install_after;
COMMIT;
`;
for(const [name,value] of [['changes.sql',changes],['preflight.sql',readonly],['verify.sql',readonly],['apply.sql',apply],['tests/catalog.sql',common+';\n']])
 fs.writeFileSync(path.join(repair,name),value);
const report=(await db.query(common)).rows[0].result;
assert.equal(report.state,'applied',JSON.stringify(report));
await db.exec('ROLLBACK');
const beforeReport=(await db.query(common)).rows[0].result;
assert.equal(beforeReport.state,'absent',JSON.stringify(beforeReport));
assert.deepEqual(beforeReport.invariants,report.invariants,'unchanged complete guard invariants');
const appliedRows=(await db.exec(apply)).flatMap(x=>x.rows).filter(x=>x.result);
assert.equal(appliedRows.length,1);
assert.deepEqual(appliedRows[0].result,report,'generated guarded transaction installs exact verified capability');
const replayRows=(await db.exec(apply)).flatMap(x=>x.rows).filter(x=>x.result);
assert.equal(replayRows.length,1);
assert.deepEqual(replayRows[0].result,report,'known-state SQL replay preserves exact capability');
fs.writeFileSync(path.join(here,'before-example.json'),JSON.stringify(beforeReport,null,2)+'\n');
fs.writeFileSync(path.join(here,'verified-example.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(repair,'source-pins.json'),JSON.stringify({schema_version:1,inputs:Object.fromEntries(provenance.map(x=>[x.path,x.sha256]))},null,2)+'\n');
fs.writeFileSync(path.join(repair,'catalog-pins.json'),JSON.stringify({schema_version:1,
 scope:'Exact five replaced and seven added horse-lifecycle functions. Canonical horse data stays in place; no bulk update, new relation, schema, role, policy or trigger. All retained functions outside this scope and existing function authority, table structures, RLS and role memberships are preserved. Unknown drift fails closed.',
 dependencies_sha256:dependencies,before_capability_sha256:beforeCapability,capability_sha256:capability,
 modules_sha256:sha(changes),modules:Object.fromEntries(modules.map(n=>[n,sha(read(n))])),dependency_function_names:selectedDependencyNames,
 named_dependency_function_names:deps,restored_fixture_function_names:f.restoredRetainedPrivate.names,
 changed_function_names:changedNames,new_function_names:newNames,
 changed_function_signatures:signatures.filter(x=>changedNames.includes(x.name)).map(x=>x.signature),
 new_function_signatures:signatures.filter(x=>newNames.includes(x.name)).map(x=>x.signature),
 new_relations:newRelations,new_triggers:addedTriggers,retained_roles:rolePin,
 required_policy_pairs:requiredPolicies,exact_private_policy_relations:privatePolicyRelations,retained_policies:policyPin,
 source_provenance:provenance},null,2)+'\n');
const proof={schema_version:1,kind:'horse-lifecycle-guard-generation',result:'PASS',
 generated_at_utc:new Date().toISOString(),dependencies,capability,functions:capNames.length,modules:modules.length,
 changed_functions:changedNames,new_functions:newNames,
 generated_sql_install_and_replay:true,retained_invariants_unchanged:true,prior_function_authority_unchanged:true,
 live_database:false,mac_installer:false,production_storage:false,
 files:Object.fromEntries(['preflight.sql','apply.sql','verify.sql','catalog-pins.json','source-pins.json'].map(n=>[n,sha(read(n))]))};
fs.writeFileSync(path.join(repair,'guard-generation-result.json'),JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof));
await db.close();
