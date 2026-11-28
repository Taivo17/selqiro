"""Offline acceptance of one uploaded location catalog receipt.

Reads immutable delivered/prepared/source/report files. Imports only the sealed
pure catalog parser. No application tests, subprocesses, SQL, CLI, Git or network.
Writes review evidence exclusively beneath this script's own directory.
"""
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import ast
import hashlib
import importlib.util
import json
import re
import zipfile

ROOT = Path('/workspace/scratch/de90fa9e1734')
OUT = Path(__file__).resolve().parent
PKG = ROOT / 'deliverables/selqiro-asukoha-aluse-kontroll-20261127'
PREP = ROOT / 'work/location-foundation-20261127'
SOURCE = ROOT / 'work/job-search-implementation-20261126/source'
REPORT = ROOT / 'upload/selqiro-asukoha-aluse-kontroll-20261127-raport-20261127-133852-f5686ad8ac14.json'
PREVIOUS = ROOT / 'upload/selqiro-too-otsingu-valikud-20261126-raport-20261126-123637-6dbb54449153.json'
HEAD = '7c53643012545c7dfa99ba976e6f2613e3c3a201'
TREE = '98444c7d31e7afac995f195d884700b60c82b6cf'
REPORT_SHA = 'cc884c36ae31b5217b69c45e0810f28d5791572f462152225cf67d6fd11c5938'
MANIFEST_SHA = 'e16ec81ccc063fc8d057750f260e0367c84f81713fddfce13dfee175e4ddc144'
ZIP_SHA = 'a84ae34c224ac72240f69bc4c703fffbabbcede55f1d1806ab27de07e3052533'
ENTRY_SHA = '4256be1ee638226f72a878d6065e6d2741ff8bd2f3903d0c43035e212757a1a7'
SQL_SHA = '85111d2673e28db2e4524fa655f3bb1000d38980d171045c9452db3dc39e3b78'
PARSER_SHA = '0b3c58e0916b382ce3f147fe5f7c37410022fdfc21a3a5c2b9506595d029a2ec'
INVENTORY_SHA = '22bbd39ef2651b4ad3d0c1cc2b0742250cb176c531dd22debcc19a87122032f2'
PRIOR_SHA = '39a9e0d2296e360c4fe3c210b56fca291593ac5965f33368dd3f4de70a38176f'
REMOTE = 'https://github.com/Taivo17/selqiro.git'
PROJECT = 'vyjletlmwoiwxsnsunlm'
checks, inputs, command_streams, probe_streams, runtime_streams = [], {}, [], [], []


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pairs(items):
    value = {}
    for key, item in items:
        if key in value:
            raise ValueError('duplicate key: ' + key)
        value[key] = item
    return value


def invalid_constant(value):
    raise ValueError('invalid JSON constant: ' + value)


def raw(path):
    data = path.read_bytes()
    inputs[str(path.relative_to(ROOT))] = {'bytes': len(data), 'sha256': sha(data)}
    return data


def load(path):
    return json.loads(raw(path).decode('utf-8', 'strict'), object_pairs_hook=pairs,
                      parse_constant=invalid_constant)


def check(condition, label, detail=None):
    row = {'check': label, 'passed': bool(condition)}
    if detail is not None:
        row['detail'] = detail
    checks.append(row)
    if not condition:
        raise AssertionError(label + ': ' + str(detail))


def write(name, value):
    path = OUT / name
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def git_oid(kind, data):
    return hashlib.sha1(kind.encode() + b' ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def tree_oid(files):
    root = {}
    for name, row in files.items():
        current = root
        components = name.split('/')
        for component in components[:-1]:
            current = current.setdefault(component, {})
        current[components[-1]] = (row['mode'], row['blob'])
    def visit(node):
        data = b''
        for name, value in sorted(node.items(), key=lambda x: (x[0] + ('/' if isinstance(x[1], dict) else '')).encode()):
            mode, oid = ('40000', visit(value)) if isinstance(value, dict) else value
            data += mode.encode() + b' ' + name.encode() + b'\0' + bytes.fromhex(oid)
        return git_oid('tree', data)
    return visit(root)


def timestamp(value):
    return datetime.fromisoformat(value)


report_bytes = raw(REPORT)
report = load(REPORT)
check(len(report_bytes) == 310390 and sha(report_bytes) == REPORT_SHA, 'uploaded_report_exact_bytes')
check(report_bytes == (json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode(),
      'uploaded_report_matches_issued_journal_serialization')
manifest = load(PKG / 'manifest.json')
sealed = load(PREP / 'runner/package-verification.json')
inventory = load(PKG / 'accepted-inventory.json')
source_pins = load(PKG / 'evidence/catalog/source-pins.json')
scope = load(PKG / 'evidence/catalog/scope.json')
prior_reference = load(PKG / 'evidence/accepted-report-reference.json')
check(sha(raw(PKG / 'manifest.json')) == MANIFEST_SHA == sealed['manifest_sha256'], 'sealed_manifest')
check(sha(raw(PKG / 'kontrolli.py')) == ENTRY_SHA == sealed['sealed_entry_sha256'], 'sealed_entry')
check(sha(raw(PKG / 'accepted-inventory.json')) == INVENTORY_SHA == manifest['inventory_sha256'], 'accepted_inventory')
check(set(manifest) == {'format', 'runtime_sha256', 'sql_sha256', 'inventory_sha256', 'artifacts_sha256'}, 'manifest_exact_contract')
check(manifest['format'] == 'selqiro-location-foundation-catalog-package-20261127-v1', 'manifest_format')
entry_ast = ast.parse((PKG / 'kontrolli.py').read_text())
entry_constants = {n.targets[0].id: ast.literal_eval(n.value) for n in entry_ast.body
                   if isinstance(n, ast.Assign) and isinstance(n.targets[0], ast.Name)
                   and n.targets[0].id in ('MANIFEST_SHA256', 'MODULES')}
check(entry_constants['MANIFEST_SHA256'] == MANIFEST_SHA, 'entry_manifest_literal')
check(set(manifest['runtime_sha256']) == {p for p, _ in entry_constants['MODULES']}
      and len(manifest['runtime_sha256']) == 12, 'exact_runtime_module_scope')
all_pins = {**manifest['runtime_sha256'], **manifest['artifacts_sha256'],
            'catalog.sql': manifest['sql_sha256'], 'accepted-inventory.json': manifest['inventory_sha256']}
check(len(all_pins) == 79 and len(manifest['artifacts_sha256']) == 65, 'manifest_pin_count')
check(all(sha(raw(PKG / p)) == digest for p, digest in all_pins.items()), 'all_79_manifest_pins')
package_files = {str(p.relative_to(PKG)) for p in PKG.rglob('*') if p.is_file()}
check(package_files == set(sealed['sealed_files_sha256']) == set(all_pins) | {'kontrolli.py', 'manifest.json'}, 'exact_81_package_files')
check(all(sha(raw(PKG / p)) == digest for p, digest in sealed['sealed_files_sha256'].items()), 'all_81_sealed_file_pins')
check(sum((PKG / p).stat().st_size for p in package_files) == sealed['package_uncompressed_bytes'] == 2973952,
      'package_uncompressed_length')
zip_bytes = raw(PKG.with_suffix('.zip'))
check(len(zip_bytes) == sealed['archive_bytes'] == 723766 and sha(zip_bytes) == ZIP_SHA == sealed['archive_sha256'], 'archive_exact_bytes')
with zipfile.ZipFile(PKG.with_suffix('.zip')) as archive:
    prefix = PKG.name + '/'
    check(len(archive.namelist()) == len(set(archive.namelist())) == 81, 'archive_no_duplicate_members')
    check(set(archive.namelist()) == {prefix + p for p in package_files}, 'archive_exact_member_set')
    check(archive.testzip() is None, 'archive_crc')
    check(all(archive.read(prefix + p) == (PKG / p).read_bytes() for p in package_files), 'archive_directory_identical')
check(all(sha(raw(Path(row['source']))) == row['sha256'] and Path(row['source']).stat().st_size == row['bytes']
          for row in sealed['assembly_inputs'].values()), 'all_80_prepared_assembly_inputs_unchanged')
sql_bytes = raw(PKG / 'catalog.sql')
check(sha(sql_bytes) == SQL_SHA == report['sql_sha256'] == manifest['sql_sha256'], 'exact_executed_sql_pin')
check(sql_bytes == raw(PREP / 'catalog/catalog.sql') == raw(PKG / 'evidence/catalog/catalog.sql'), 'sql_all_source_copies_equal')
check(sha(raw(PKG / 'catalog_contract.py')) == PARSER_SHA
      and raw(PKG / 'catalog_contract.py') == raw(PREP / 'catalog/catalog_contract.py')
      == raw(PKG / 'evidence/catalog/catalog_contract.py'), 'parser_all_source_copies_equal')

# Static examination only: a SQL file is never executed by this review.
sql_text = sql_bytes.decode()
sql_code = re.sub(r'--[^\n]*', '', sql_text)
sql_code = re.sub(r"'(?:''|[^'])*'", "''", sql_code)
statements = [s.strip() for s in sql_code.split(';') if s.strip()]
check(len(statements) == 9, 'sql_exact_9_statements')
check(statements[0] == 'BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY'
      and all(s.startswith('SET LOCAL ') for s in statements[1:7])
      and statements[7].startswith('WITH requested_relations') and statements[-1] == 'ROLLBACK', 'sql_readonly_transaction_contract')
check(not re.search(r'\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|CALL|DO|GRANT|REVOKE|COMMIT)\b', sql_code, re.I),
      'sql_no_write_statements_or_dynamic_calls')
check(not re.search(r'\b(?:FROM|JOIN)\s+(?:public|auth|account_lifecycle_private)\.', sql_code, re.I), 'sql_no_application_relation_reads')
check('SET LOCAL statement_timeout=\'20s\'' in sql_text and 'SET LOCAL lock_timeout=\'3s\'' in sql_text
      and 'SET LOCAL idle_in_transaction_session_timeout=\'25s\'' in sql_text, 'sql_deadlines')

check(inventory['commit_from_report'] == HEAD and inventory['tree_oid'] == TREE
      and inventory['source_count'] == len(inventory['files']) == 2443, 'accepted_source_identity')
check(tree_oid(inventory['files']) == TREE, 'accepted_git_tree_reconstructed_without_git')
source_bytes_total = 0
for name, pin in inventory['files'].items():
    data = (SOURCE / name).read_bytes()
    source_bytes_total += len(data)
    if sha(data) != pin['sha256'] or git_oid('blob', data) != pin['blob']:
        raise AssertionError('accepted source differs: ' + name)
check(source_bytes_total == 40032703, 'all_2443_local_source_bytes_and_git_blobs', {'bytes': source_bytes_total})
prepared_inventory = load(ROOT / 'work/job-search-implementation-20261126/prepared-final-inventory.json')
check(sha(raw(ROOT / 'work/job-search-implementation-20261126/prepared-final-inventory.json')) == source_pins['inventory_sha256']
      and prepared_inventory['files'] == inventory['files'], 'prepared_and_accepted_inventory_same_files')
check(source_pins['accepted_source_commit'] == HEAD and source_pins['accepted_source_tree'] == TREE, 'catalog_source_commit_tree_pins')
for name, pin in source_pins['source_files'].items():
    data = raw(SOURCE / name)
    check(len(data) == pin['bytes'] and sha(data) == pin['sha256'] == inventory['files'][name]['sha256']
          and git_oid('blob', data) == pin['git_blob'] == inventory['files'][name]['blob']
          and pin['git_mode'] == inventory['files'][name]['mode'], 'catalog_source_file:' + name)

expected_keys = {'format','scope','run_id','package_sha256','target','started_at_utc','stage','work_item','commands',
 'database_query_count','database','source_writes','index_writes','commit_push','build_tests_install','database_writes',
 'application_rows_read','smtp_auth_changes','storage_operations','account_closure_deletion','geocoder_called',
 'location_migration_applied','distance_search_implemented','observation_complete','implementation_ready','accepted_receipts',
 'runtime_observations','before','remote_before','sql_sha256','linked_project','cli_pin','catalog','coverage','after',
 'source_and_index_preserved','accepted_receipts_preserved','finished_at_utc'}
check(set(report) == expected_keys, 'report_exact_success_shape')
check(report['format'] == 'selqiro-location-foundation-catalog-report-20261127-v1'
      and report['scope'] == 'location_foundation_catalog' and report['work_item'] == 'ASUKOHT-1', 'report_format_scope_work_item')
check(re.fullmatch('[0-9a-f]{64}', report['run_id']) and report['package_sha256'] == MANIFEST_SHA, 'report_manifest_binding_and_run_identity')
check(report['target'] == '/Users/taivo/selqiro' and report['linked_project'] == PROJECT, 'target_and_linked_project')
check(report['stage'] == report['database'] == 'metadata_observed' and report['coverage'] == 'complete'
      and report['observation_complete'] is True and report['implementation_ready'] is False, 'observation_not_implementation')
scope_flags = ('source_writes','index_writes','commit_push','build_tests_install','database_writes','application_rows_read',
               'smtp_auth_changes','storage_operations','account_closure_deletion','geocoder_called',
               'location_migration_applied','distance_search_implemented')
check(all(report[k] is False for k in scope_flags), 'all_12_out_of_scope_actions_reported_false')
check(report['before'] == report['after'] and report['source_and_index_preserved'] is True, 'before_after_exact_equality')
check(report['before'] == {'head':HEAD,'branch':'main','tree':TREE,'source_count':2443,
      'index_sha256':'c707544665e248c38f062a01275aa2c575fbf9a2a8cd57086d05d2abb25d383b',
      'index_entries_sha256':'c4b6ffdc8acf5bd4ef8a67376e21f4bd838971f9e7d124f30235870c04901f8c',
      'worktree':'clean_verified','source_verified':True}, 'exact_baseline_after_summary')
check(report['remote_before']['remote'] == REMOTE and report['remote_before']['main'] == HEAD
      and report['remote_before']['read_only'] is True, 'remote_observation_matches_accepted_source')
check(report['cli_pin'] == {'version':'2.117.0','files_verified':5,
      'entry_sha256':'c2ca0770b4634e85a01254ffdfda1999063e5d424f41dc345839e62171d8bb4b',
      'sidecar_sha256':'f2590cf902b63a3450fc284d9b54751e48b6fec5881e0924e50df3be3361beda'}, 'reported_cli_pins')
access_text = (PKG / 'catalog_access.py').read_text()
check("PROJECT = '" + PROJECT + "'" in access_text
      and all(value in access_text for k,value in report['cli_pin'].items() if k.endswith('sha256'))
      and "journal.data['database_query_count'] == 0" in access_text
      and "database_query_count=1" in access_text
      and "'--linked'" in access_text and "'--file'" in access_text, 'source_cli_project_and_single_attempt_guards')
prior = load(PREVIOUS)
check(PREVIOUS.stat().st_size == 1452209 and sha(raw(PREVIOUS)) == PRIOR_SHA == prior_reference['sha256'], 'original_prior_receipt_exact_bytes')
check(prior['commit'] == HEAD and prior['stage'] == 'complete' and prior['database'] == 'verified'
      and prior['push'] == 'verified' and prior['tests'] == prior['build'] == 'passed', 'prior_receipt_accepted_state')
prior_evidence = {'sha256':PRIOR_SHA,'bytes':1452209,'read_only':True,'held_existing_update_lock_read_only':True}
check(report['accepted_receipts'] == {'accepted_job_search_journal':prior_evidence,
      'accepted_job_search_download':prior_evidence} and report['accepted_receipts_preserved'] is True, 'both_prior_receipts_preserved_report')

spec = importlib.util.spec_from_file_location('sealed_pure_catalog_contract', PKG / 'catalog_contract.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
catalog = report['catalog']
envelope = (json.dumps([{'result':catalog}], ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + '\n').encode()
check(parser.parse_result(envelope) == catalog, 'embedded_catalog_reparsed_by_delivered_parser')
check(parser.facts_sha256(catalog['catalog']) == catalog['facts_sha256']
      == 'eb0bcb241ed6d1d0f786dc06a59b91ecbef0b584d594b105b704331a3c08d2c0', 'catalog_facts_hash_recomputed')
check(set(scope['fixed_signatures']) == set(parser.FUNCTIONS)
      and set(scope['relations']) == set(parser.RELATIONS) and scope['limits'] == parser.LIMITS, 'source_catalog_scope_matches_parser')
check(catalog['coverage'] == {'body_review':'required_before_implementation','call_graph':'fixed_signatures_and_direct_attached_triggers_only',
      'issues':[],'max_result_bytes':786432,'result_limited':False,'state':'complete'}, 'bounded_complete_catalog_capture')
check(all(c['returned'] == c['total'] for c in catalog['counts'].values()), 'all_catalog_sets_untruncated')

# Reconstruct all 29 top-level stdout streams from retained values and the exact
# issued control flow. No Git commands or CLI invocations are run here.
expected_commands = []
def command(stage, label, data, exit_code=0):
    if isinstance(data,str):
        data=data.encode()
    expected_commands.append({'stage':stage,'label':label,'data':data,'exit_code':exit_code})
def local_guard(phase):
    command('git_rev_parse',phase+':root',report['target']+'\n')
    command('git_symbolic_ref',phase+':branch','main\n')
    command('git_rev_parse',phase+':object_format','sha1\n')
    command('git_rev_parse',phase+':head',HEAD+'\n')
    command('git_rev_parse',phase+':tree',TREE+'\n')
    command('git_rev_parse',phase+':git_directory',report['target']+'/.git\n')
    command('git_rev_parse',phase+':index_path','.git/index\n')
    command('git_ls_files',phase+':index_entries',b''.join(f"{v['mode']} {v['blob']} 0\t{p}\0".encode() for p,v in sorted(inventory['files'].items())))
    command('git_ls_files',phase+':index_flags',b''.join(('H '+p+'\0').encode() for p in sorted(inventory['files'])))
    command('git_ls_tree',phase+':head_tree',b''.join(f"{v['mode']} blob {v['blob']}\t{p}\0".encode() for p,v in sorted(inventory['files'].items())))
    command('git_ls_files',phase+':untracked',b'')
    command('git_rev_parse',phase+':stable_head',HEAD+'\n')
local_guard('before')
command('git_remote','origin_fetch_url',REMOTE+'\n')
command('git_remote','origin_push_url',REMOTE+'\n')
command('git_config','origin_not_mirror',b'',1)
command('git_ls_remote','remote_main',HEAD+'\trefs/heads/main\n')
command('location_foundation_catalog_read','exact_reconstructed_cli_json',envelope)
local_guard('after')
check(len(expected_commands) == len(report['commands']) == 29, 'exact_29_command_count')
check(report['database_query_count'] == 1 and sum(c['stage']=='location_foundation_catalog_read' for c in report['commands'])==1,
      'exactly_one_database_query_record')
def stream(row, name, expected, scope_name):
    item = {'scope':scope_name,'stream':name,'bytes':row[name+'_bytes'],
            'sha256':row[name+'_sha256'],'complete':row[name+'_complete']}
    check(item['complete'] is True and type(item['bytes']) is int and item['bytes']>=0
          and re.fullmatch('[0-9a-f]{64}',item['sha256']), 'complete_stream:'+scope_name+':'+name)
    if expected is None:
        item.update(reconciliation='opaque_retained_hash_only', reconstructed=False)
    else:
        item.update(reconciliation='exact_bytes_reconstructed',reconstructed=True,
                    reconstructed_bytes=len(expected),reconstructed_sha256=sha(expected))
        check(item['bytes']==len(expected) and item['sha256']==sha(expected), 'stream_hash:'+scope_name+':'+name)
    return item
previous_finish = timestamp(report['started_at_utc'])
for i,(observed,expected) in enumerate(zip(report['commands'],expected_commands)):
    label = str(i)+':'+expected['label']
    check(observed['stage']==expected['stage'] and observed['status']=='ok'
          and observed['exit_code']==expected['exit_code'] and observed['error_code'] is None,
          'command_exact_stage_and_success:'+label)
    start,finish = timestamp(observed['started_at_utc']),timestamp(observed['finished_at_utc'])
    check(previous_finish<=start<=finish<=timestamp(report['finished_at_utc']), 'command_sequential_timeline:'+label)
    previous_finish=finish
    check(observed['timeout_seconds']==45 and observed['elapsed_seconds']<45
          and observed['cleanup_status']=='confirmed' and observed['stderr_limit_bytes']==131072
          and observed['stdout_limit_bytes']==(1048576 if i==16 else 4194304), 'command_bounds:'+label)
    completion=observed['process_completion'];spawn=observed['spawn']
    check(spawn['new_session_requested'] is True and completion['pid']==completion['expected_pgid']==spawn['pid']==spawn['expected_pgid']
          and completion['child_reaped'] is True and completion['group_check']=='no_live_members_observed'
          and completion['signal']=='not_sent' and completion['stream_close']=='confirmed'
          and completion['errors']==[] and completion['group_live_count']==completion['group_zombie_count']==0,
          'command_completion:'+label)
    command_streams.append(stream(observed,'stdout',expected['data'],label))
    command_streams.append(stream(observed,'stderr',None if i==16 else b'',label))
    check(len(completion['probes'])==1,'one_completion_probe:'+label)
    for j,probe in enumerate(completion['probes']):
        check(probe['status']=='ok' and probe['exit_code']==1 and probe['error'] is None
              and probe['cleanup']=='confirmed' and probe['timeout_seconds']==1.0,'completion_probe_status:'+label)
        for name in ('stdout','stderr'):
            probe_streams.append(stream(probe,name,b'',label+':cleanup_probe:'+str(j)))
check(timestamp(report['remote_before']['verified_at_utc'])>=timestamp(report['commands'][15]['finished_at_utc'])
      and timestamp(report['remote_before']['verified_at_utc'])<=timestamp(report['commands'][16]['started_at_utc']), 'remote_time_precedes_single_query')
check(len(report['runtime_observations'])==1, 'one_current_runtime_observation')
runtime=report['runtime_observations'][0]
check(runtime['status']=='no_related_runtime_observed' and runtime['scope']=='current_own_real_uid_javascript_runtime_cwd'
      and len(runtime['observations'])==2 and len(runtime['probes'])==4,'runtime_exact_scope')
check(all(x=={'status':'no_related_runtime_observed','before_candidate_count':0,'after_candidate_count':0,
      'vanished_candidate_count':0,'related_runtime_count':0,'related_runtimes':[]} for x in runtime['observations']), 'runtime_two_scans_no_related_candidate')
for i,probe in enumerate(runtime['probes']):
    check(probe['status']=='ok' and probe['exit_code']==0 and probe['error'] is None and probe['cleanup']=='confirmed'
          and probe['timeout_seconds']==2.0 and probe['uid_scope']['selector']=='real_uid'
          and probe['uid_scope']['row_count']==probe['uid_scope']['matching_real_uid_count'], 'runtime_probe_status:'+str(i))
    runtime_streams.append(stream(probe,'stdout',None,'runtime_probe:'+str(i)))
    runtime_streams.append(stream(probe,'stderr',b'','runtime_probe:'+str(i)))

facts=catalog['catalog'];functions={f['signature']:f for f in facts['functions']}
function_reviews=[]
for pin in source_pins['function_source_pins']:
    actual=functions[pin['signature']]
    record={'signature':pin['signature'],'basis':pin['basis'],'source':pin['source'],'matched':True}
    if pin['basis']=='exact_dollar_quoted_source_body':
        text=(SOURCE/pin['source']).read_text(); name=pin['signature'].split('(',1)[0]
        matches=list(re.finditer(r'^CREATE(?: OR REPLACE)? FUNCTION '+re.escape(name)+r'\s*\(.*?\bAS\s+(\$[A-Za-z_]*\$)(.*?)\1\s*;',text,re.M|re.S|re.I))
        check(len(matches)==1,'single_source_definition:'+name)
        m=matches[0]; body=m.group(2).encode();header=text[m.start():m.start(2)]
        check(len(body)==pin['body_bytes']==actual['body_bytes'] and sha(body)==pin['body_sha256']==actual['body_sha256'], 'current_function_body:'+name)
        check(bool(re.search(r'\bSECURITY\s+DEFINER\b',header,re.I))==actual['definer']==pin['security_definer_in_source'], 'function_security_definer:'+name)
        language=re.search(r'\bLANGUAGE\s+(\w+)',header,re.I).group(1).lower()
        search=re.search(r'\bSET\s+search_path\s*=\s*([A-Za-z_, ]+)\s+AS\s+',header,re.I).group(1)
        config_value='search_path='+', '.join(v.strip() for v in search.strip().split(','))
        config_text='{'+('"'+config_value+'"' if ' ' in config_value else config_value)+'}'
        check(actual['config_sha256']==sha(config_text.encode()) and actual['language']==language and actual['owner']=='postgres'
              and actual['volatility']==('s' if re.search(r'\bSTABLE\b',header,re.I) else 'v')
              and actual['strict'] is False and actual['parallel']=='u' and actual['leakproof'] is False
              and actual['default_arguments_sha256'] is None,'function_header_contract:'+name)
        record.update(body_sha256=sha(body),body_bytes=len(body),source_line=pin['source_line'],config_sha256=actual['config_sha256'])
    elif pin['basis']=='previously_accepted_catalog_not_new_live_proof':
        check(all(pin[k]==actual[k] for k in ('body_sha256','definition_sha256','config_sha256','owner')), 'historical_uid_pin_matches_current_observation')
        record.update(body_sha256=actual['body_sha256'],definition_sha256=actual['definition_sha256'])
    else:
        check(pin['body_sha256'] is None and pin['expected_client_execute'] is False,'legacy_body_not_claimed:'+pin['signature'])
        record.update(body_review='not asserted; client revocation is the applicable reference')
    function_reviews.append(record)
historical=load(SOURCE/'supabase/releases/account-state-foundation-v1/source-pins.json')
for name in ('auth.uid()','profile_editor_private.touch_revision()','public.validate_profile_active_identity_v2()'):
    pin=next(x for x in historical['base']['actor_functions'] if x['signature']==name)
    check(all(pin[k]==functions[name][k] for k in ('body_sha256','definition_sha256','config_sha256','owner')), 'historical_current_fingerprint:'+name)
check(facts['triggers']==historical['base']['protected_triggers'],'both_direct_trigger_fingerprints')
function_reviews.append({'signature':'public.validate_profile_active_identity_v2()',
    'basis':'previously_accepted_catalog_pin_matches_current_direct_trigger_observation',
    'source':'supabase/releases/account-state-foundation-v1/source-pins.json','matched':True,
    'body_sha256':functions['public.validate_profile_active_identity_v2()']['body_sha256']})

effective={(x['object_kind'],x['object_name'],x['role']):x for x in facts['effective_privileges']}
grants_by_function={s:[x for x in facts['grants'] if x['object_kind']=='function' and x['object_name']==s] for s in functions}
private_functions=[s for s in functions if s.startswith(('profile_editor_private.','account_lifecycle_private.'))]
editor_functions=['public.get_my_profile_editor_v1(uuid,uuid)','public.save_my_profile_editor_v1(uuid,uuid,uuid,jsonb)']
legacy_functions=['public.save_my_active_identity_profile(text,text,text,text,text,text)',
                  'public.update_my_active_identity_location(text,text,double precision,double precision)']
for name in private_functions+editor_functions:
    expected_grantees={'postgres'} | ({'authenticated'} if name in editor_functions else set())
    check({x['grantee'] for x in grants_by_function[name]}==expected_grantees
          and all(x['privilege']=='EXECUTE' and x['grantable'] is False and x['grantor']=='postgres' for x in grants_by_function[name]), 'exact_current_function_grants:'+name)
    check(all(effective[('function',name,role)]['can_execute'] is (name in editor_functions and role=='authenticated')
          for role in parser.ROLES),'effective_current_function_execute:'+name)
for name in legacy_functions:
    check(all(effective[('function',name,role)]['can_execute'] is False for role in ('anon','authenticated'))
          and not any(x['grantee'] in ('PUBLIC','anon','authenticated') for x in grants_by_function[name]),'legacy_client_revocations:'+name)
    check(effective[('function',name,'service_role')]['can_execute'] is True
          and {x['grantee'] for x in grants_by_function[name]}=={'postgres','service_role'},'legacy_service_role_retained:'+name)
for name in ('profile_editor_private','account_lifecycle_private'):
    check(all(effective[('schema',name,role)]['can_usage'] is False and effective[('schema',name,role)]['can_create'] is False
              for role in parser.ROLES),'private_schema_closed:'+name)
for name in parser.RELATIONS:
    check(all(not effective[('relation',name,role)][k] for role in ('anon','authenticated')
              for k in ('can_insert','can_update','can_delete')),'no_client_whole_table_writes:'+name)
bootstrap_insert={
 'public.profiles':{'id','email','language'},
 'public.identities':{'type','user_id','business_account_id','display_name','created_by','updated_by'},
 'public.business_accounts':{'owner_user_id','name','slug','description','created_by','updated_by'},
 'public.business_members':{'business_account_id','user_id','invited_by'},
}
expected_inserts={rel+'.'+column for rel,columns in bootstrap_insert.items() for column in columns}
expected_updates={'public.profiles.language','public.profiles.active_identity_id'}
for role in ('anon','authenticated'):
    for privilege,expected in [('can_insert',expected_inserts),('can_update',expected_updates)]:
        observed={x['object_name'] for x in facts['effective_privileges'] if x['object_kind']=='column' and x['role']==role and x[privilege]}
        check(observed==(expected if role=='authenticated' else set()),'exact_bootstrap_column_grants:'+role+':'+privilege)
check(all(not effective[('column','public.identity_profiles.'+column,role)][k]
          for column in ('country','city','address_text','lat','lng','location_visibility','profile_revision')
          for role in ('anon','authenticated') for k in ('can_insert','can_update')), 'location_columns_no_direct_client_write')
default_function_grantees={x['grantee'] for x in facts['default_acl_grants']
                          if x['object_kind']=='f' and x['schema']=='public' and x['privilege']=='EXECUTE'}
check({'anon','authenticated','service_role'} <= default_function_grantees,'observed_public_function_default_grants')

# Compare the subset of the earlier accepted public-profile contract actually
# captured here, without claiming its wider dependencies were re-observed.
public_contract=load(SOURCE/'supabase/releases/account-public-profile-fence-v1/expected-contract.json')
for old in public_contract['after']['functions']:
    signature=old['name']+'('+','.join(old['arguments'])+')'; actual=functions[signature]
    shared=('owner','strict','definer','language','parallel','leakproof','volatility','body_sha256','config_sha256','definition_sha256')
    check(all(old[k]==actual[k] for k in shared),'current_public_read_contract:'+signature)
    observed_grants=sorted([{'role':x['grantee'],'grantable':x['grantable'],'privilege':x['privilege']} for x in grants_by_function[signature]],key=lambda x:x['role'])
    check(observed_grants==sorted(old['grants'],key=lambda x:x['role']), 'current_public_read_grants:'+signature)
foundation='account_lifecycle_private.account_states'
for old in public_contract['base']['foundation']['columns']:
    actual=next(x for x in facts['columns'] if x['relation']==foundation and x['name']==old['name'])
    check(all(old[k]==actual[k] for k in old),'foundation_column:'+old['name'])
constraint_reconciliation=[]
pretty_variants={
 'account_states_active_only':("CHECK ((state = 'active'::text))","CHECK (state = 'active'::text)"),
 'account_states_revision_positive':('CHECK ((revision > 0))','CHECK (revision > 0)'),
}
for old in public_contract['base']['foundation']['constraints']:
    actual=next(x for x in facts['constraints'] if x['relation']==foundation and x['name']==old['name'])
    check(all(old[k]==actual[k] for k in ('kind','name','validated','deferrable')),'foundation_constraint_shape:'+old['name'])
    if old['name'] in pretty_variants:
        before,after=pretty_variants[old['name']]
        check(sha(before.encode())==old['definition_sha256'] and sha(after.encode())==actual['definition_sha256'], 'constraint_pretty_hash_reconciled:'+old['name'])
        constraint_reconciliation.append({'name':old['name'],'previous_definition':before,'current_pretty_definition':after,
          'previous_sha256':old['definition_sha256'],'current_sha256':actual['definition_sha256'],
          'reason':'earlier pg_get_constraintdef(oid) versus current pg_get_constraintdef(oid,true); exact string hashes reproduced'})
    else:
        check(old['definition_sha256']==actual['definition_sha256'],'foundation_constraint_identical_hash:'+old['name'])
check(all(not effective[('relation',foundation,role)][k] for role in parser.ROLES for k in ('can_select','can_insert','can_update','can_delete')),
      'account_state_table_all_client_roles_closed')
profile_columns={x['name']:x for x in facts['columns'] if x['relation']=='public.identity_profiles'}
check(profile_columns['country']['type']==profile_columns['city']['type']=='text'
      and profile_columns['lat']['type']==profile_columns['lng']['type']=='double precision'
      and profile_columns['profile_revision']['type']=='uuid' and profile_columns['profile_revision']['not_null'] is True,
      'current_profile_location_storage_shape')
check(not ({'country_code','place_id','location_provider','place_provider'} & set(profile_columns)), 'no_normalized_profile_place_contract_yet')
lock_source=next(x for x in source_pins['function_source_pins'] if x['signature']=='profile_editor_private.lock_owner(uuid,uuid)')
lock_text=(SOURCE/lock_source['source']).read_text();lock_match=re.search(r'CREATE FUNCTION profile_editor_private\.lock_owner\(.*?AS \$function\$(.*?)\$function\$;',lock_text,re.S)
check(lock_match is not None and 'account_is_available' not in lock_match.group(1), 'current_owner_lock_has_no_account_availability_call')
extensions={x['name']:x for x in facts['extensions']}
check(extensions['postgis']=={'available':True,'default_version':'3.3.7','installed':False,'installed_version':None,'name':'postgis','owner':None,'relocatable':None,'schema':None}, 'postgis_available_not_installed')
check(extensions['pg_trgm']['installed'] is True and extensions['pg_trgm']['installed_version']=='1.6'
      and extensions['pg_trgm']['schema']=='public' and extensions['unaccent']['installed'] is False, 'trigram_and_unaccent_observations')

all_streams=command_streams+probe_streams+runtime_streams
stream_counts=Counter(x['reconciliation'] for x in all_streams)
check(len(all_streams)==124 and stream_counts=={'exact_bytes_reconstructed':119,'opaque_retained_hash_only':5}, 'stream_accounting_complete')
reconciliation={'format':'selqiro-location-foundation-command-reconciliation-20261127-v1',
 'top_level_commands':29,'top_level_streams':command_streams,'completion_probe_streams':probe_streams,
 'runtime_probe_streams':runtime_streams,'stream_counts':dict(stream_counts),
 'boundary':'All top-level stdout, including catalog JSON, reconstructed exactly. CLI stderr (27 bytes) and four current-process snapshot stdout streams are opaque retained hash/count evidence. They are not decoded, guessed, or treated as independent semantic proof.'}
write('command-hash-reconciliation.json',reconciliation)
write('function-and-permission-reconciliation.json',{'functions':function_reviews,'constraint_hash_variants':constraint_reconciliation,
 'current_editor_execute':{'anon':False,'authenticated':True,'service_role':False},
 'legacy_writer_execute':{'anon':False,'authenticated':False,'service_role':True},
 'public_function_default_execute_grantees':sorted(default_function_grantees)})
write('input-hashes.json',inputs)
review={'format':'selqiro-location-foundation-acceptance-20261127-v1','result':'ACCEPTED_METADATA_OBSERVATION',
 'reviewed_at_utc':datetime.now(timezone.utc).isoformat(),'report':str(REPORT.relative_to(ROOT)),
 'report_sha256':REPORT_SHA,'report_bytes':len(report_bytes),'observed_at_utc':report['finished_at_utc'],
 'basis':'User-uploaded unsigned report, reconciled offline against immutable delivered code, catalog contract and accepted source. No independent live observation performed.',
 'metadata_observation_accepted':True,'implementation_ready':False,'unresolved_metadata_blockers':[],
 'source_commit':HEAD,'source_tree':TREE,'source_files_verified':2443,'source_bytes_verified':source_bytes_total,
 'package':{'manifest_sha256':MANIFEST_SHA,'archive_sha256':ZIP_SHA,'archive_bytes':723766,'files':81},
 'single_readonly_query':True,'top_level_commands':29,'catalog_facts_sha256':catalog['facts_sha256'],
 'catalog_counts':catalog['counts'],'extensions':facts['extensions'],'stream_counts':dict(stream_counts),
 'checks_passed':len(checks),'checks':checks,
 'implementation_constraints':[
  'Normalized country/place persistence and shared typeahead are not implemented by this observation.',
  'Current profile owner lock lacks account_is_available; a future location write needs its own active-account gate.',
  'Private approximate locality and business explicit exact visibility must remain separate; no hidden private exact point.',
  'PostGIS is available but not installed; this observation authorizes no installation or distance-search migration.',
  'Legacy location/profile writers remain denied to PUBLIC/anon/authenticated; service_role execute remains. Do not re-enable client paths.',
  'Postgres public-schema default function ACL grants EXECUTE to anon/authenticated/service_role; new RPC/helper grants must be explicit.',
  'Catalog covers fixed signatures/direct attached triggers only, not transitive dependencies, application rows, UI behavior or full account deletion.',
 ],
 'evidence_limits':[
  'Raw local Git index bytes, five CLI files, prior Mac file inode/mode/time snapshots and runtime process rows are not exported; report summaries are backed by the sealed guards, not independently re-observed on the Mac.',
  'The 27-byte CLI stderr and four runtime-probe stdout streams have complete hashes/counts only; no meaning or warning-free state is inferred.',
  'Two CHECK constraint definition hashes differ from the old catalog only because this catalog uses pretty output; both exact old/new strings and hashes were reconstructed.',
  'No SQL, app tests/build, CLI, Git, network or database action was run during this review. Existing artifacts were read only.',
 ]}
write('review.json',review)
print(json.dumps({'result':review['result'],'checks_passed':len(checks),'streams':dict(stream_counts),
                  'implementation_ready':False,'metadata_blockers':[]}))
