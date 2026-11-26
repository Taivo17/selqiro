"""Build one search-function release from accepted source/catalog facts only."""
from pathlib import Path
import copy
import hashlib
import json
import os
import re

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'release' if (ROOT / 'release').is_dir() else ROOT
DEFAULT_BASE = next((p for p in ROOT.parents if (p / 'supabase/releases/account-job-write-fence-v1').is_dir()),
                    ROOT.parents[1] / 'account-job-write-20261125/source')
BASE = Path(os.environ.get('SELQIRO_JOB_SEARCH_BASE', str(DEFAULT_BASE))).resolve()
FORMAT = 'selqiro-job-search-purpose-20261126-v1'
COMMIT = '2b3407fee17f4d19594ce45647a1739b26249835'
TREE = 'b6543039421cd86f4227d18f65edde1ca06e8a05'
TARGET = 'public.search_public_jobs_v1(text,text,text,text,text,text,text,integer,jsonb)'


def read(rel):
    return (BASE / rel).read_text()


def jread(rel):
    return json.loads(read(rel))


def sha(value):
    return hashlib.sha256(value.encode() if isinstance(value, str) else value).hexdigest()


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def jwrite(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def function(source, name):
    start = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+' + re.escape(name) + r'\s*\(', source, re.I)
    if not start:
        raise ValueError('missing_function:' + name)
    header = re.search(r'\bAS\s+(\$[A-Za-z0-9_]*\$)', source[start.start():], re.I)
    if not header:
        raise ValueError('missing_function_body:' + name)
    delimiter = header.group(1)
    begin = start.start() + header.end()
    end = source.index(delimiter, begin)
    finish = source.index(';', end + len(delimiter)) + 1
    return source[start.start():finish], source[begin:end]


def pg_json(value):
    if isinstance(value, dict):
        keys = sorted(value, key=lambda k: (len(k.encode()), k.encode()))
        return '{' + ', '.join(json.dumps(k, ensure_ascii=False) + ': ' + pg_json(value[k]) for k in keys) + '}'
    if isinstance(value, list):
        return '[' + ', '.join(pg_json(x) for x in value) + ']'
    if type(value) not in (str, bool, int, type(None)):
        raise ValueError('unsupported_pin_type')
    return json.dumps(value, ensure_ascii=False)


def literal(value):
    return "'" + json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace("'", "''") + "'::jsonb"


read_pins_rel = 'supabase/releases/account-job-read-fence-v1/expected-contract.json'
write_pins_rel = 'supabase/releases/account-job-write-fence-v1/expected-contract.json'
old_source_rel = 'supabase/repairs/20261121_personal_jobs/04_reads.sql'
read_pins, write_pins = jread(read_pins_rel), jread(write_pins_rel)
read_functions = {x['signature']: x for x in read_pins['base']['job_dependencies'] + read_pins['after']['functions']}
old_meta = read_functions[TARGET]
old_sql, old_body = function(read(old_source_rel), 'public.search_public_jobs_v1')
assert sha(old_body) == old_meta['body'] == 'ec3d96fe4dc460cef8bd646d8ae376e06e8a0f7320508451d83f711879495fc3'

old_allow = "p_employment_type NOT IN('permanent','fixed_term','contract','internship','other','task')"
new_allow = "p_employment_type NOT IN('permanent','fixed_term','contract','internship','other','task','employment')"
old_predicate = '(p_employment_type IS NULL OR j.employment_type=p_employment_type)'
new_predicate = """(p_employment_type IS NULL
  OR (p_employment_type='employment' AND j.employment_type IS DISTINCT FROM 'task')
  OR j.employment_type=p_employment_type)"""
assert old_sql.count(old_allow) == old_sql.count(old_predicate) == 1
new_sql = old_sql.replace(old_allow, new_allow).replace(old_predicate, new_predicate)
new_body = function(new_sql, 'public.search_public_jobs_v1')[1]
# The only implementation delta is search argument validation + its row predicate.
assert new_sql.replace(new_allow, old_allow).replace(new_predicate, old_predicate) == old_sql
assert new_sql.index(new_predicate) < new_sql.index('AND (cursor_value IS NULL') < new_sql.index('LIMIT p_result_limit+1')
write(RELEASE / 'search-public-jobs.sql', '-- Search-only purpose sentinel; stored employment types and writes are unchanged.\n' + new_sql + '\n')
write(ROOT / 'tests/old-search.sql', old_sql + '\n')

# Preserve the latest accepted writer contract, including the newly installed
# account fence, rather than reusing earlier contact/job catalogs wholesale.
base = copy.deepcopy(write_pins['base'])
deps = {x['signature']: x for x in base['dependencies'] + write_pins['after']['functions']}
read_dep_signatures = [
    'jobs_private.cursor(jsonb,text)',
    'jobs_private.is_public(public.jobs)',
    'jobs_private.public_fields(public.jobs)',
    'jobs_private.search_document(text,text,text,text,text)',
    'jobs_private.visible_to_viewer(uuid)',
]
for signature in read_dep_signatures:
    deps[signature] = read_functions[signature]
base['dependencies'] = [deps[k] for k in sorted(deps)]
base['writer_helper_app_denied'] = write_pins['after']['helper_app_denied']

# The inherited read contract separately pins discovery hiding/block structures
# and the public avatar projection. Include only those relevant facts.
listing_base = read_pins['base']['accepted_service_base']['accepted_profile_marketplace_base']['accepted_horse_base']['accepted_listing_base']
extra_relations = {'public.user_blocks', 'provider_controls_private.hidden_providers'}
for key in ['relations', 'columns', 'indexes']:
    selected = [x for x in listing_base[key] if x.get('relation', x.get('name')) in extra_relations]
    base['identity_structure'][key].extend(selected)
    sort_keys = ('name',) if key == 'relations' else ('relation', 'name')
    base['identity_structure'][key].sort(key=lambda x: tuple(x[k] for k in sort_keys))
base['public_avatar'] = [x for x in listing_base['accepted_profile_base']['dependencies'] if x['name'] == 'profile_media_private.slot_url']
assert len(base['public_avatar']) == 1
before = {'functions': [old_meta]}
new_meta = copy.deepcopy(old_meta)
new_meta['body'] = sha(new_body)
after = {'functions': [new_meta]}
fingerprints = {k: sha(pg_json(v)) for k, v in [('base', base), ('before', before), ('after', after)]}
jwrite(RELEASE / 'expected-contract.json', {
    'format': FORMAT, 'base': base, 'before': before, 'after': after, 'fingerprints': fingerprints,
    'evidence_boundary': 'Accepted source/catalog pins; fresh exact production preflight is required. No production data was read.'
})
jwrite(RELEASE / 'receipt-pins.json', {'format': FORMAT, **{k + '_fingerprint': v for k, v in fingerprints.items()}})

prior_query_rel = 'supabase/releases/account-job-write-fence-v1/catalog-query.sql'
query = read(prior_query_rel)
start = query.index('job_functions AS MATERIALIZED (')
end = query.index('), job_relations AS MATERIALIZED (', start)
serializer = query[start:end]
names = sorted({x.split('(')[0] for x in list(deps) + [TARGET]})
serializer, n = re.subn(r"WHERE n\.nspname\|\|'\.'\|\|p\.proname IN \([^\n]+\)",
    "WHERE n.nspname||'.'||p.proname IN (" + ','.join("'" + x + "'" for x in names) + ')', serializer, count=1)
assert n == 1
serializer, n = re.subn(r'p\.oid LIMIT \d+\) p', 'p.oid LIMIT ' + str(len(deps) + 2) + ') p', serializer, count=1)
assert n == 1
query = query[:start] + serializer + query[end:]

identity_relations = [x['name'] for x in base['identity_structure']['relations']]
relation_sql = ','.join("'" + x + "'" for x in identity_relations)
start = query.index('identity_columns AS (')
end = query.index('), base AS (', start)
identity_query = query[start:end]
identity_query, n = re.subn(r'FROM \(VALUES [^\n]+\) w\(relation,name\)',
    'FROM (VALUES ' + ','.join("('" + x['relation'] + "','" + x['name'] + "')" for x in base['identity_structure']['columns']) + ') w(relation,name)', identity_query, count=1)
assert n == 1
identity_query, n = re.subn(r'ARRAY\[[^\n]+?\]', 'ARRAY[' + relation_sql + ']', identity_query)
assert n == 2
identity_query, n = re.subn(r'AND c\.relname IN \([^\n]+\)',
    'AND c.relname IN (' + ','.join("'" + x['name'] + "'" for x in base['identity_structure']['indexes']) + ')', identity_query, count=1)
assert n == 1
query = query[:start] + identity_query + query[end:]

# Reuse the accepted full-definition serializer for the public avatar function.
start = query.index('auth_uid AS (')
end = query.index('), job_functions AS MATERIALIZED (', start)
avatar_query = query[start:end].replace('auth_uid AS (', 'public_avatar AS (').replace("IN ('auth.uid')", "IN ('profile_media_private.slot_url')").replace('LIMIT 12', 'LIMIT 2')
base_start = query.index('), base AS (')
query = query[:base_start] + '), ' + avatar_query + '''), base AS (
 SELECT jsonb_build_object('account',(SELECT value FROM account),
 'accepted_contact_availability',(SELECT value FROM contact_availability),'auth_uid',(SELECT value FROM auth_uid),
 'schema',jsonb_build_array((SELECT value FROM job_schema)),
 'tables',(SELECT coalesce(jsonb_agg(facts ORDER BY name COLLATE "C"),'[]'::jsonb) FROM job_relations),
 'dependencies',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb) FROM job_functions
  WHERE signature <> '__TARGET__'),
 'identity_structure',jsonb_build_object('columns',(SELECT value FROM identity_columns),
  'relations',(SELECT value FROM identity_relations),'indexes',(SELECT value FROM identity_indexes)),
 'public_avatar',(SELECT value FROM public_avatar),
 'writer_helper_app_denied',NOT EXISTS(SELECT 1 FROM pg_roles r
  JOIN pg_proc p ON p.oid=to_regprocedure('jobs_private.require_available_accounts_v1(uuid,uuid)')
  WHERE r.rolname IN ('anon','authenticated','service_role') AND has_function_privilege(r.oid,p.oid,'EXECUTE'))) value
), target AS (
 SELECT jsonb_build_object('functions',(SELECT coalesce(jsonb_agg(facts ORDER BY signature COLLATE "C"),'[]'::jsonb)
 FROM job_functions WHERE signature='__TARGET__')) value
)
SELECT base.value b,target.value t FROM base CROSS JOIN target'''.replace('__TARGET__', TARGET)
write(RELEASE / 'catalog-query.sql', query + ';\n')

expected_sql = 'SELECT ' + literal(base) + ' b, ' + literal(before) + ' before_t, ' + literal(after) + ' after_t'
evaluated = 'WITH actual AS MATERIALIZED (\n' + query + '\n), expected AS MATERIALIZED (\n' + expected_sql + '''
), evaluated AS (
 SELECT actual.b,actual.t,CASE WHEN actual.b=expected.b AND actual.t=expected.before_t THEN 'before'
 WHEN actual.b=expected.b AND actual.t=expected.after_t THEN 'after' ELSE 'unknown' END state
 FROM actual CROSS JOIN expected
)'''


def report(stage):
    return evaluated + f"""
SELECT jsonb_build_object('format','{FORMAT}','stage','{stage}','state',state,
 'recognized',state IN ('before','after'),'read_only',{str(stage != 'apply').lower()},
 'account_rows_read',false,'account_rows_exported',false,
 'base_fingerprint',encode(sha256(convert_to(b::text,'UTF8')),'hex'),
 'target_fingerprint',encode(sha256(convert_to(t::text,'UTF8')),'hex'),
 'fence_verified',state='after') AS result FROM evaluated;
"""


def guard(want):
    return 'DO $job_search_guard$ DECLARE observed text; BEGIN\n' + evaluated + "\nSELECT state INTO observed FROM evaluated;\n IF observed IS DISTINCT FROM '" + want + "' THEN\n RAISE EXCEPTION 'JOB_SEARCH_PURPOSE_" + want.upper() + "_STATE_MISMATCH' USING ERRCODE='55000';\n END IF;\nEND $job_search_guard$;\n"


settings = "SET LOCAL search_path=pg_catalog;\nSET LOCAL statement_timeout='20s';\nSET LOCAL lock_timeout='2s';\nSET LOCAL idle_in_transaction_session_timeout='15s';\n"
authority = """-- No authority is granted. Only the pinned function owner may apply this release.
DO $job_search_authority$ BEGIN
 IF current_user <> 'postgres' THEN
  RAISE EXCEPTION 'JOB_SEARCH_PURPOSE_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END $job_search_authority$;
"""
write(RELEASE / 'execution-prerequisite.sql', authority)
write(RELEASE / 'preflight.sql', '-- Fresh metadata-only recognition; unknown never authorizes a write.\nBEGIN READ ONLY;\n' + settings + authority + report('preflight') + 'ROLLBACK;\n')
write(RELEASE / 'verify.sql', '-- Run independently after the one apply acknowledgement.\nBEGIN READ ONLY;\n' + settings + authority + guard('after') + report('verify') + 'ROLLBACK;\n')
write(RELEASE / 'apply.sql', '''-- One function replacement; no account/content row writes or enum changes.
BEGIN READ WRITE;
''' + settings + authority + '''DO $job_search_lock$ BEGIN PERFORM pg_advisory_xact_lock(20261126,48109); END $job_search_lock$;
LOCK TABLE public.jobs,jobs_private.categories,jobs_private.requests,
 account_lifecycle_private.account_states,public.identities,public.business_accounts,
 public.business_members,public.profiles,public.identity_profiles,
 public.user_blocks,provider_controls_private.hidden_providers IN SHARE ROW EXCLUSIVE MODE;
''' + guard('before') + new_sql + '\n' + guard('after') + '''COMMIT;
-- An acknowledgement is emitted only after COMMIT, from a new read-only snapshot.
BEGIN READ ONLY;
''' + settings + authority + guard('after') + report('apply') + 'ROLLBACK;\n')

parser_rel = 'supabase/releases/account-job-write-fence-v1/sql_contract.py'
parser = read(parser_rel).replace('job write fence', 'job search purpose').replace('selqiro-account-job-write-fence-20261125-v1', FORMAT).replace('account_job_write_base_changed', 'job_search_purpose_base_changed')
for constant, key in [('BASE', 'base'), ('BEFORE', 'before'), ('AFTER', 'after')]:
    parser, n = re.subn(r'^' + constant + r" = '[0-9a-f]{64}'$", constant + " = '" + fingerprints[key] + "'", parser, flags=re.M)
    assert n == 1
write(RELEASE / 'sql_contract.py', parser)
inputs = [read_pins_rel, write_pins_rel, old_source_rel, prior_query_rel, parser_rel]
jwrite(RELEASE / 'source-pins.json', {'format': FORMAT, 'accepted_commit': COMMIT, 'accepted_tree': TREE, 'accepted_file_count': 2398,
    'inputs': {rel: sha(read(rel)) for rel in inputs}, 'old_search_body_sha256': sha(old_body), 'new_search_body_sha256': sha(new_body),
    'boundary': 'Pins derive from accepted source/catalog facts only. Fresh exact metadata recognition is mandatory before live apply.'})
jwrite(RELEASE / 'target-deltas.json', {'format': FORMAT, 'changed_functions': [TARGET], 'added_functions': [],
    'unchanged_dependencies': sorted(deps), 'changed_fields': ['body'], 'row_writes': [], 'table_ddl': [], 'policies': [],
    'role_memberships': [], 'existing_acl_changes': [], 'write_enums_changed': False, 'search_sentinel': 'employment',
    'employment_semantics': "j.employment_type IS DISTINCT FROM 'task' (includes NULL)"})
jwrite(RELEASE / 'sql-files.json', {'format': FORMAT, 'files': {p.name: sha(p.read_bytes()) for p in sorted(RELEASE.glob('*.sql'))}})
for name in ['preflight.sql', 'apply.sql', 'verify.sql']:
    assert (RELEASE / name).stat().st_size <= 512 * 1024
print(json.dumps({'format': FORMAT, 'target_count': 1, 'dependency_count': len(deps), 'fingerprints': fingerprints,
    'body_sha256': sha(new_body), 'sql_bytes': {n: (RELEASE / n).stat().st_size for n in ['preflight.sql', 'apply.sql', 'verify.sql']}}))
