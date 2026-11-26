"""Build the bounded release from accepted source pins, never from live data."""
from pathlib import Path
import copy
import hashlib
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'release' if (ROOT / 'release' / 'account-availability.sql').is_file() else ROOT
default_base = next((p for p in ROOT.parents if (p / 'supabase/releases/account-state-foundation-v1').is_dir()),
                    ROOT.parents[1] / 'account-next-20261125' / 'base')
BASE = Path(os.environ.get('SELQIRO_JOB_WRITE_BASE',str(default_base))).resolve()
FORMAT = 'selqiro-account-job-write-fence-20261125-v1'

def read(rel):
    return (BASE / rel).read_text()

def jread(rel):
    return json.loads(read(rel))

def sha(value):
    if isinstance(value, str):
        value = value.encode()
    return hashlib.sha256(value).hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value)

def json_write(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def pg_json(value):
    """Postgres jsonb text for this string/bool/int/null-only pinned domain."""
    if isinstance(value, dict):
        keys = sorted(value, key=lambda key: (len(key.encode()), key.encode()))
        return '{' + ', '.join(json.dumps(key, ensure_ascii=False) + ': ' + pg_json(value[key]) for key in keys) + '}'
    if isinstance(value, list):
        return '[' + ', '.join(pg_json(x) for x in value) + ']'
    if type(value) not in (str, bool, int, type(None)):
        raise ValueError('unsupported_pinned_json_type')
    return json.dumps(value, ensure_ascii=False)

def function(source, name):
    pattern = r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+' + re.escape(name) + r'\s*\('
    start = re.search(pattern, source, re.I)
    if not start:
        raise ValueError('missing_function:' + name)
    end_head = re.search(r'\bAS\s+(\$[A-Za-z0-9_]*\$)', source[start.start():], re.I)
    if not end_head:
        raise ValueError('missing_dollar_body:' + name)
    delimiter = end_head.group(1)
    body_start = start.start() + end_head.end()
    body_end = source.index(delimiter, body_start)
    terminator = source.index(';', body_end + len(delimiter)) + 1
    return source[start.start():terminator], source[body_start:body_end]

job_pins_rel = 'supabase/repairs/20261122_job_owner_read_lock/catalog-pins.json'
job_pins = jread(job_pins_rel)['after_facts']
old = {x['signature']: x for x in job_pins['functions']}
mutate_signature = 'jobs_private.mutate(uuid,uuid,uuid,text,jsonb)'
helper_signature = 'jobs_private.require_available_accounts_v1(uuid,uuid)'
mutate_rel = 'supabase/repairs/20261116_jobs_public/06_mutations.sql'
mutate, original_body = function(read(mutate_rel), 'jobs_private.mutate')
assert sha(original_body) == old[mutate_signature]['body']
needle = ' END IF;\n job_id:=(p_request->>\'job_id\')::uuid;'
assert mutate.count(needle) == 1
mutate = mutate.replace('CREATE FUNCTION', 'CREATE OR REPLACE FUNCTION', 1)
mutate = mutate.replace('expected_deadline timestamptz;', 'expected_deadline timestamptz;account_owner uuid;', 1)
mutate = mutate.replace(needle, ''' END IF;
 -- require_actor retains the identity and business-owner row locks. Resolve
 -- canonical ownership, never the creator or the currently active UI account.
 -- A completed identical request above only returns its existing receipt.
 SELECT CASE WHEN i.type='private' THEN i.user_id
             WHEN i.type='business' THEN b.owner_user_id END
 INTO account_owner FROM public.identities i
 LEFT JOIN public.business_accounts b ON b.id=i.business_account_id
 WHERE i.id=p_identity;
 PERFORM jobs_private.require_available_accounts_v1(p_user,account_owner);
 job_id:=(p_request->>'job_id')::uuid;''', 1)
write(RELEASE / 'mutate.sql', '-- Preserve the accepted mutation, changing only new-write account admission.\n' + mutate + '\n')
new_mutate_body = function(mutate, 'jobs_private.mutate')[1]
helper = (RELEASE / 'account-availability.sql').read_text()
helper_body = function(helper, 'jobs_private.require_available_accounts_v1')[1]

dependent_signatures = [
 'jobs_private.accept_policies(uuid,uuid,jsonb)',
 'jobs_private.calendar_month_after(timestamp with time zone)',
 'jobs_private.content(public.jobs)',
 'jobs_private.current_policies()',
 'jobs_private.normalize_content(jsonb)',
 'jobs_private.owner_fields(public.jobs,uuid)',
 'jobs_private.require_actor(uuid,uuid)',
 'jobs_private.require_key(uuid)',
 'jobs_private.require_revision(text)',
 'listing_publication_private.assert_hosted_preview_actor(uuid)',
 'listing_publication_private.hosted_storage_contract_ready()',
 'listing_publication_private.require_actor(uuid,uuid)',
 'public.current_user_has_identity_access(uuid)',
 'public.listing_actor_uid_hosted_v1()',
 'public.listing_price_currency_scale_v1(text)',
 'public.lock_listing_creation_actor_v1(uuid)',
 'public.normalize_listing_price_v1(jsonb)',
 'public.get_my_job_policies_v1(uuid,uuid)',
 'public.get_my_job_request_v1(uuid,uuid,uuid)',
 'public.get_my_job_v1(uuid,uuid,uuid)',
 'public.get_my_jobs_v1(uuid,uuid,integer,jsonb)',
 'public.publish_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb)',
 'public.renew_my_job_activity_v1(uuid,uuid,uuid,uuid,text,timestamp with time zone)',
 'public.save_my_job_v1(uuid,uuid,uuid,uuid,text,jsonb,jsonb)',
 'public.set_my_job_status_v1(uuid,uuid,uuid,uuid,text,text,text)',
]
contact_rel = 'supabase/releases/account-contact-write-fence-v1/expected-contract.json'
contact = jread(contact_rel)
profile_rel = 'supabase/releases/account-public-profile-fence-v1/expected-contract.json'
profile = jread(profile_rel)
identity_relations = ['public.identities', 'public.business_accounts', 'public.profiles', 'public.identity_profiles']
base = {
 'account': contact['base']['account'],
 'accepted_contact_availability': contact['after']['new_helper'],
 'auth_uid': [x for x in profile['base']['dependencies'] if x['name']=='auth.uid'],
 'schema': [x for x in job_pins['schema'] if x['name']=='jobs_private'],
 'tables': [x for x in job_pins['tables'] if x['name'] in ['jobs_private.categories','jobs_private.requests','public.jobs']],
 'dependencies': [old[x] for x in sorted(dependent_signatures)],
 'identity_structure': {
  'relations': [x for x in profile['base']['relations'] if x['name'] in identity_relations],
  'columns': [x for x in profile['base']['columns'] if x['relation'] in identity_relations],
  'indexes': [x for x in profile['base']['indexes'] if x['relation'] in identity_relations],
 },
}
before = {'functions': [old[mutate_signature]], 'helper_app_denied': True}
new_meta = copy.deepcopy(old[mutate_signature]); new_meta['body'] = sha(new_mutate_body)
helper_meta = {
 'acl': [{'grantee':'postgres','grantor':'postgres','grantable':False,'privilege':'EXECUTE'}],
 'body':sha(helper_body),'owner':'postgres','config':['search_path=pg_catalog','lock_timeout=2s'],
 'result':'void','strict':False,'definer':True,'defaults':None,'language':'plpgsql','parallel':'u',
 'arguments':['p_actor','p_owner'],'leakproof':False,'signature':helper_signature,'volatility':'v',
}
after = {'functions': sorted([new_meta, helper_meta],key=lambda x:x['signature']), 'helper_app_denied':True}
fingerprints = {'base':sha(pg_json(base)), 'before':sha(pg_json(before)), 'after':sha(pg_json(after))}
expected = {'format':FORMAT, 'base':base,'before':before,'after':after,'fingerprints':fingerprints,
 'evidence_domains':{
  'job_writer':'Accepted source/catalog pins from 20261122; fresh exact metadata preflight required.',
  'account':'Accepted account foundation and contact writer helper; preserved byte/fact-exactly.',
  'native':'Isolated PostgreSQL 17.6 synthetic fixture; no production account/content data used.'}}
json_write(RELEASE/'expected-contract.json',expected)
json_write(RELEASE/'receipt-pins.json',{'format':FORMAT, **{k+'_fingerprint':v for k,v in fingerprints.items()}})

account_query = read('supabase/releases/account-contact-write-fence-v1/account-query.sql').rstrip().removesuffix(';')
contact_query = read('supabase/releases/account-contact-write-fence-v1/helper-query.sql').rstrip().removesuffix(';')
write(RELEASE/'account-query.sql', account_query+';\n')
write(RELEASE/'contact-availability-query.sql', contact_query+';\n')

# Reuse exactly the accepted serializer for jobs function/table/schema metadata.
prior_query = read('supabase/releases/account-job-read-fence-v1/catalog-query.sql')
jobs_start = prior_query.index('job_functions AS MATERIALIZED (')
jobs_end = prior_query.index('), base AS (', jobs_start)
jobs_serializers = prior_query[jobs_start:jobs_end+1]
names = sorted({x.split('(')[0] for x in dependent_signatures + [mutate_signature,helper_signature]})
function_name_list = ','.join("'"+x+"'" for x in names)
jobs_serializers, count = re.subn(r"WHERE n\.nspname\|\|'\.'\|\|p\.proname IN \([^\n]+\)",
 'WHERE n.nspname||\'.\'||p.proname IN ('+function_name_list+')',jobs_serializers,count=1)
assert count==1
assert jobs_serializers.count('p.oid LIMIT 16')==1
jobs_serializers = jobs_serializers.replace('p.oid LIMIT 16','p.oid LIMIT '+str(len(dependent_signatures)+3))
jobs_serializers = jobs_serializers.replace("IN ('jobs_private.categories','public.jobs')", "IN ('jobs_private.categories','jobs_private.requests','public.jobs')")

# auth.uid is pinned in the accepted foundation serializer, including pg_get_functiondef.
auth_template = account_query[account_query.index('scoped_functions AS ('):account_query.index('), ownership_columns AS (')+1]
auth_template = auth_template.replace('scoped_functions AS (','auth_uid AS (').replace("('account_lifecycle_private.account_is_available')", "('auth.uid')")
identity_query = '''identity_columns AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',w.relation,'name',w.name,
 'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'generated',a.attgenerated::text,'identity',a.attidentity::text)
 ORDER BY w.relation COLLATE "C",w.name COLLATE "C"),'[]'::jsonb) value
 FROM (VALUES __IDENTITY_COLUMNS__) w(relation,name)
 JOIN pg_attribute a ON a.attrelid=to_regclass(w.relation) AND a.attname=w.name AND NOT a.attisdropped
), identity_relations AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('name',name,'kind',c.relkind::text,'owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'observer_select',has_table_privilege(current_user,c.oid,'SELECT')) ORDER BY name COLLATE "C"),'[]'::jsonb) value
 FROM unnest(ARRAY[__IDENTITY_RELATIONS__]) name JOIN pg_class c ON c.oid=to_regclass(name)
), identity_indexes AS (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('relation',i.indrelid::regclass::text,'name',c.relname,'unique',i.indisunique,
 'primary',i.indisprimary,'valid',i.indisvalid,'ready',i.indisready,
 'definition_sha256',encode(sha256(convert_to(pg_get_indexdef(i.indexrelid),'UTF8')),'hex')) ORDER BY i.indrelid::regclass::text COLLATE "C",c.relname COLLATE "C"),'[]'::jsonb) value
 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
 WHERE i.indrelid IN (SELECT to_regclass(x) FROM unnest(ARRAY[__IDENTITY_RELATIONS__]) x)
 AND c.relname IN (__IDENTITY_INDEXES__)
)'''
identity_query=identity_query.replace('__IDENTITY_COLUMNS__', ','.join("('"+x['relation']+"','"+x['name']+"')" for x in base['identity_structure']['columns']))
identity_query=identity_query.replace('__IDENTITY_RELATIONS__', ','.join("'"+x+"'" for x in identity_relations))
identity_query=identity_query.replace('__IDENTITY_INDEXES__', ','.join("'"+x['name']+"'" for x in base['identity_structure']['indexes']))
query = ('-- Bounded metadata only; no account, content, messages, files or Storage rows.\n'
 'WITH account AS MATERIALIZED (\n'+account_query+'\n), contact_availability AS MATERIALIZED (\n'+contact_query+'\n), '+auth_template+', '+jobs_serializers+', '+identity_query+''', base AS (
 SELECT jsonb_build_object('account',(SELECT value FROM account),
 'accepted_contact_availability',(SELECT value FROM contact_availability),'auth_uid',(SELECT value FROM auth_uid),
 'schema',jsonb_build_array((SELECT value FROM job_schema)),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM job_relations),
 'dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM job_functions
  WHERE signature NOT IN ('jobs_private.mutate(uuid,uuid,uuid,text,jsonb)','jobs_private.require_available_accounts_v1(uuid,uuid)')),
 'identity_structure',jsonb_build_object('columns',(SELECT value FROM identity_columns),
  'relations',(SELECT value FROM identity_relations),'indexes',(SELECT value FROM identity_indexes))) value
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM job_functions
  WHERE signature IN ('jobs_private.mutate(uuid,uuid,uuid,text,jsonb)','jobs_private.require_available_accounts_v1(uuid,uuid)')),
 'helper_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_proc p ON p.oid=to_regprocedure('jobs_private.require_available_accounts_v1(uuid,uuid)')
 WHERE r.rolname IN ('anon','authenticated','service_role') AND has_function_privilege(r.oid,p.oid,'EXECUTE'))) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target''')
write(RELEASE/'catalog-query.sql', query+';\n')

expected_sql = "SELECT '"+json.dumps(base,separators=(',',':'),ensure_ascii=False).replace("'","''")+"'::jsonb b, '"+json.dumps(before,separators=(',',':'),ensure_ascii=False).replace("'","''")+"'::jsonb before_t, '"+json.dumps(after,separators=(',',':'),ensure_ascii=False).replace("'","''")+"'::jsonb after_t"
evaluated = '''WITH actual AS MATERIALIZED (\n'''+query+'''
), expected AS MATERIALIZED (\n'''+expected_sql+'''
), evaluated AS (
 SELECT actual.b,actual.t,CASE WHEN actual.b=expected.b AND actual.t=expected.before_t THEN 'before'
 WHEN actual.b=expected.b AND actual.t=expected.after_t THEN 'after' ELSE 'unknown' END state
 FROM actual CROSS JOIN expected
)'''
def report(stage):
    return evaluated+f"""
SELECT jsonb_build_object('format','{FORMAT}','stage','{stage}','state',state,
 'recognized',state IN ('before','after'),'read_only',{str(stage!='apply').lower()},
 'account_rows_read',false,'account_rows_exported',false,
 'base_fingerprint',encode(sha256(convert_to(b::text,'UTF8')),'hex'),
 'target_fingerprint',encode(sha256(convert_to(t::text,'UTF8')),'hex'),
 'fence_verified',state='after') AS result FROM evaluated;
"""
def guard(want):
    return 'DO $job_guard$ DECLARE observed text; BEGIN\n'+evaluated+"\nSELECT state INTO observed FROM evaluated;\n IF observed IS DISTINCT FROM '"+want+"' THEN\n RAISE EXCEPTION 'ACCOUNT_JOB_WRITE_"+want.upper()+"_STATE_MISMATCH' USING ERRCODE='55000';\n END IF;\nEND $job_guard$;\n"

settings="SET LOCAL search_path=pg_catalog;\nSET LOCAL statement_timeout='20s';\nSET LOCAL lock_timeout='2s';\nSET LOCAL idle_in_transaction_session_timeout='15s';\n"
authority = read('supabase/releases/account-contact-write-fence-v1/execution-prerequisite.sql').replace('$contact_authority$', '$job_authority$').replace('ACCOUNT_CONTACT_WRITE_AUTHORITY_REQUIRED','ACCOUNT_JOB_WRITE_AUTHORITY_REQUIRED')
write(RELEASE/'execution-prerequisite.sql',authority)
write(RELEASE/'preflight.sql','-- Fresh read-only recognition; unknown never authorizes a write.\nBEGIN READ ONLY;\n'+settings+authority+report('preflight')+'ROLLBACK;\n')
write(RELEASE/'verify.sql','-- Independent read-only confirmation, in its own connection.\nBEGIN READ ONLY;\n'+settings+authority+guard('after')+report('verify')+'ROLLBACK;\n')
write(RELEASE/'apply.sql', '''-- Exactly one schema transaction. No account/content row mutations.
BEGIN READ WRITE;
'''+settings+authority+'''DO $job_lock$ BEGIN PERFORM pg_advisory_xact_lock(20261125,48108); END $job_lock$;
LOCK TABLE public.jobs,jobs_private.requests,jobs_private.categories,
 account_lifecycle_private.account_states,public.identities,public.business_accounts,
 public.business_members,public.profiles,public.identity_profiles IN SHARE ROW EXCLUSIVE MODE;
'''+guard('before')+helper+'\n'+mutate+'\n'+guard('after')+'''COMMIT;
-- Receipt is emitted only after the schema commit, under a fresh read-only snapshot.
BEGIN READ ONLY;
'''+settings+authority+guard('after')+report('apply')+'ROLLBACK;\n')

parser = read('supabase/releases/account-contact-write-fence-v1/sql_contract.py')
parser = parser.replace('contact write fence','job write fence').replace('selqiro-account-contact-write-fence-20261124-v1',FORMAT)
parser = parser.replace('account_contact_write_base_changed','account_job_write_base_changed')
for constant,key in [('BASE','base'),('BEFORE','before'),('AFTER','after')]:
    parser = re.sub(r'^'+constant+r" = '[0-9a-f]{64}'$", constant+" = '"+fingerprints[key]+"'", parser, flags=re.M)
write(RELEASE/'sql_contract.py',parser)

inputs=[job_pins_rel,mutate_rel,contact_rel,profile_rel,
 'supabase/releases/account-contact-write-fence-v1/account-query.sql',
 'supabase/releases/account-contact-write-fence-v1/helper-query.sql',
 'supabase/releases/account-contact-write-fence-v1/account-write-availability.sql',
 'supabase/releases/account-contact-write-fence-v1/execution-prerequisite.sql',
 'supabase/releases/account-contact-write-fence-v1/sql_contract.py',
 'supabase/releases/account-job-read-fence-v1/catalog-query.sql',
 'supabase/repairs/20261121_personal_jobs/01_authority.sql',
 'supabase/repairs/20261121_personal_jobs/02_content.sql']
json_write(RELEASE/'source-pins.json',{'format':FORMAT,'accepted_commit':'c66a39b96c8d204382413a7ab652e66898782f18',
 'base_boundary':'Known accepted source only; live preflight independently verifies exact catalog before DDL.',
 'inputs':{rel:sha((BASE/rel).read_bytes()) for rel in inputs},'old_mutate_body_sha256':sha(original_body),
 'new_mutate_body_sha256':sha(new_mutate_body),'new_helper_body_sha256':sha(helper_body)})
json_write(RELEASE/'target-deltas.json',{'format':FORMAT,'added_functions':[helper_signature],
 'changed_functions':[mutate_signature], 'unchanged':dependent_signatures,
 'row_writes':[], 'table_ddl':[], 'policies':[], 'role_memberships':[], 'existing_acl_changes':[]})
json_write(RELEASE/'sql-files.json',{'format':FORMAT,'files':{p.name:sha(p.read_bytes()) for p in sorted(RELEASE.glob('*.sql'))}})
assert all((RELEASE/name).stat().st_size<=512*1024 for name in ('preflight.sql','apply.sql','verify.sql'))
print(json.dumps({'format':FORMAT,'fingerprints':fingerprints,'sql_bytes':{n:(RELEASE/n).stat().st_size for n in ['preflight.sql','apply.sql','verify.sql']}}))
