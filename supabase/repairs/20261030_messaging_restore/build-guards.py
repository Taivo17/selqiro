#!/usr/bin/env python3
"""Rebuild deterministic guards from reviewed source and local catalog pins.
This tool writes SQL files only; it never connects to a database.
"""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parent
old=(root.parent/'20261029_listing_message_cards/preflight.sql').read_text()
base=old[old.index('DO $catalog_guard$'):old.index("SELECT current_setting('selqiro.message_cards_report')")].strip()
functions=json.loads((root/'function-pins.json').read_text())
structure=json.loads((root/'structure-pins.json').read_text())
new_guard=next(x['body_sha256'] for x in functions if x['signature']=='listing_contact_private.guard_message()')
base=base.replace('specs constant jsonb :=','specs jsonb :=',1)
marker='BEGIN\n trusted_ok :='
base=base.replace(marker,"""BEGIN
 -- The existing base remains exact. Only the explicitly reviewed message guard
 -- has a second pinned state after this additive schema exists.
 IF to_regnamespace('messaging_private_v2') IS NOT NULL THEN
  SELECT jsonb_agg(CASE WHEN value->>'signature'='listing_contact_private.guard_message()'
   THEN jsonb_set(value,'{body_sha256}',to_jsonb('"""+new_guard+"""'::text)) ELSE value END)
  INTO specs FROM jsonb_array_elements(specs);
 END IF;
 trusted_ok :=""",1)
assert marker not in base
catalog_query=(root/'tests/messaging-runtime.mjs').read_text().split('const catalogQuery=`',1)[1].split('`;',1)[0]
structure_query=(root/'tests/catalog-structure.sql').read_text().strip().removesuffix(';')
# Wrap the exact same catalog JSON queries used for the isolated pin fixture.
function_expr="SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.signature),'[]'::jsonb) INTO actual_functions FROM ("+catalog_query+") q;"
structure_expr="SELECT q.structure INTO actual_structure FROM ("+structure_query+") q;"
base_specs=json.loads(re.search(r'\$specs\$(.*?)\$specs\$',old,re.S).group(1))
protected=[x['signature'] for x in base_specs if x['signature']!='listing_contact_private.guard_message()']+['public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)']
required_columns=[
 ('messages','id','bigint'),('messages','conversation_id','bigint'),('messages','sender_id','uuid'),('messages','sender_identity_id','uuid'),('messages','message','text'),('messages','created_at','timestamp with time zone'),('messages','image_path','text'),('messages','image_url','text'),
 ('conversations','id','bigint'),('conversations','buyer_id','uuid'),('conversations','seller_id','uuid'),('conversations','buyer_identity_id','uuid'),('conversations','seller_identity_id','uuid'),('conversations','updated_at','timestamp with time zone'),('conversations','created_at','timestamp with time zone'),('conversations','archived_at','timestamp with time zone'),
 ('conversation_participants','conversation_id','bigint'),('conversation_participants','user_id','uuid'),('conversation_participants','identity_id','uuid'),('conversation_participants','last_read_at','timestamp with time zone'),('conversation_participants','deleted_at','timestamp with time zone'),('identities','avatar_url','text')]
values=','.join("("+','.join("'"+i+"'" for i in row)+")" for row in required_columns)
new='''DO $messaging_guard$
DECLARE
 expected_functions constant jsonb := $functions$FUNCTION_PINS$functions$::jsonb;
 expected_structure constant jsonb := $structure$STRUCTURE_PINS$structure$::jsonb;
 protected_signatures constant jsonb := $protected$PROTECTED_PINS$protected$::jsonb;
 base jsonb:=current_setting('selqiro.message_cards_report')::jsonb;
 actual_functions jsonb;actual_structure jsonb;protected_functions jsonb;storage_policies jsonb;legacy_buckets jsonb;existing_triggers jsonb;
 invariants jsonb:='{}'::jsonb;fingerprints jsonb:='{}'::jsonb;guards jsonb;
 fresh boolean;installed boolean;columns_ok boolean;metadata_ok boolean;table_semantics_ok boolean;trigger_ok boolean;storage_rls boolean;storage_authority boolean;
 storage_setting text;storage_policy_grants jsonb;storage_grant_tables jsonb;
 bucket_state text:='unknown';state_name text:='unknown';recognized boolean:=false;item text;error_state text;
BEGIN
 FUNCTION_QUERY
 STRUCTURE_QUERY
 SELECT count(*)=REQUIRED_COLUMN_COUNT INTO columns_ok FROM (VALUES REQUIRED_COLUMN_VALUES) e(relation,name,type)
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
END $messaging_guard$;'''
for k,v in {'FUNCTION_PINS':json.dumps(functions,separators=(',',':')),'STRUCTURE_PINS':json.dumps(structure,separators=(',',':')),'PROTECTED_PINS':json.dumps(protected,separators=(',',':')),'FUNCTION_QUERY':function_expr,'STRUCTURE_QUERY':structure_expr,'REQUIRED_COLUMN_COUNT':str(len(required_columns)),'REQUIRED_COLUMN_VALUES':values}.items():new=new.replace(k,v)
guards=base+'\n'+new+'\n'
(root/'catalog-guard.sql').write_text('-- Shared exact catalog inspector; no persistent writes.\n'+guards)
settings="SET LOCAL search_path=pg_catalog,public,pg_temp;\nSET LOCAL lock_timeout='3s';\nSET LOCAL statement_timeout='30s';\n"
preflight='-- Read-only: absent with a missing private bucket is recognized but not apply-ready.\nBEGIN READ ONLY;\n'+settings+guards+"SELECT current_setting('selqiro.messaging_restore_report')::jsonb AS result;\nROLLBACK;\n"
(root/'preflight.sql').write_text(preflight)
(root/'verify.sql').write_text('-- Verification succeeds only when the returned state is applied and recognized.\n'+preflight)
apply="""-- One transaction. Unknown or partially installed catalogs are never overwritten.
BEGIN;
"""+settings+"SELECT pg_advisory_xact_lock(hashtextextended('selqiro-messaging-restore-20261030',0));\n"+guards+"""DO $before$
DECLARE r jsonb:=current_setting('selqiro.messaging_restore_report')::jsonb;
BEGIN
 IF r->>'state'<>'absent' OR r->'recognized'<>'true'::jsonb OR r->'ready_to_apply'<>'true'::jsonb THEN
  RAISE EXCEPTION 'MESSAGING_RESTORE_READY_ABSENT_STATE_REQUIRED' USING ERRCODE='55000'; END IF;
 PERFORM set_config('selqiro.messaging_restore_before',r::text,true);
END $before$;
"""+(root/'changes.sql').read_text()+'\n'+guards+"""DO $after$
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
"""
(root/'apply.sql').write_text(apply)
print('Generated catalog-guard.sql, preflight.sql, verify.sql, apply.sql')
