"""Offline assembly of the profile map release; no database or network executor."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

HERE = Path(__file__).resolve().parent
PREVIOUS = HERE.parent / 'profile-location-v1'
ACCEPTED_COMMIT = 'af78c7be2a336da661be838d3577bb51b7ad3b66'
def sha(data): return hashlib.sha256(data).hexdigest()
def quoted(value): return "'" + value.replace("'", "''") + "'"
def read_json(path): return json.loads(Path(path).read_text())

if len(sys.argv) != 3:
    raise SystemExit('usage: build_release.py ACCEPTED_INSTALL_REPORT ISOLATED_NEW_CONTRACT')
report_path, native_path = map(Path, sys.argv[1:])
report, native = read_json(report_path), read_json(native_path)
previous = read_json(PREVIOUS / 'expected-contract.json')
spec = importlib.util.spec_from_file_location('accepted_location_receipts', PREVIOUS / 'sql_contract.py')
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
assert report['stage'] == 'complete' and report['commit'] == ACCEPTED_COMMIT and report['push'] == 'verified'
assert report['database_apply_acknowledged'] is True and report['database_apply_count'] == 1
for key, stage in [('database_apply_result', 'applied'), ('database_verified', 'after')]:
    parser.parse_result(json.dumps([{'result': report[key]}]).encode(), stage)
for name in ['baseline-query.sql', 'new-catalog-query.sql']:
    assert sha((PREVIOUS / name).read_bytes()) == previous['sql_sha256'][name]

legacy = previous['baseline_sha256']
location = previous['contract_sha256']
# The two keys and values are fixed ASCII. PostgreSQL jsonb prints these keys
# in this same length-then-byte order, with the shown separators.
baseline_facts = {'legacy_sha256': legacy, 'profile_location_sha256': location}
baseline = sha(json.dumps(baseline_facts, separators=(', ', ': ')).encode())
old_query = (PREVIOUS / 'baseline-query.sql').read_text().strip().removesuffix(';')
location_query = (PREVIOUS / 'new-catalog-query.sql').read_text().strip().removesuffix(';')
query = """-- Metadata only. Both already accepted contracts remain byte-for-byte pinned.
WITH legacy AS MATERIALIZED (
""" + old_query + """
), locality AS MATERIALIZED (
""" + location_query + """
), gathered AS (
 SELECT jsonb_build_object('legacy_sha256',legacy.result->>'facts_sha256',
  'profile_location_sha256',locality.result->>'sha256') facts,
  legacy.result#>>'{coverage,state}' legacy_coverage
 FROM legacy CROSS JOIN locality
)
SELECT jsonb_build_object('format','selqiro-public-profile-map-baseline-v1',
 'coverage',legacy_coverage,'facts',facts,
 'baseline_sha256',encode(sha256(convert_to(facts::text,'UTF8')),'hex')) AS result FROM gathered
"""
(HERE / 'baseline-query.sql').write_text(query + ';\n')
new_query = (HERE / 'new-catalog-query.sql').read_text().strip().removesuffix(';')
changes = (HERE / 'changes.sql').read_text()
release, contract = sha(changes.encode()), native['sha256']
assert native['catalog']['format'] == 'selqiro-public-profile-map-catalog-v1'
assert native['catalog']['counts'] == {'routines': 1, 'roles': 3}
assert len(baseline) == len(release) == len(contract) == 64
settings = """SET LOCAL search_path=pg_catalog;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='3s';
SET LOCAL idle_in_transaction_session_timeout='25s';
"""
authority = """DO $map_authority$
DECLARE relation_name text;
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::integer<>170006 THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['auth.users','public.profiles','public.identities',
  'public.identity_profiles','public.business_accounts','public.user_blocks',
  'account_lifecycle_private.account_states','profile_location_private.profile_locations'] LOOP
  IF NOT coalesce(has_schema_privilege('postgres',split_part(relation_name,'.',1),'USAGE'),false)
   OR NOT coalesce(has_table_privilege('postgres',relation_name,'SELECT'),false)
   OR coalesce(row_security_active(relation_name::regclass),true) THEN
   RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
  END IF;
 END LOOP;
 IF NOT has_function_privilege('postgres','public.get_store_by_slug(text)','EXECUTE')
  OR NOT has_function_privilege('postgres','profile_location_private.valid_location(jsonb)','EXECUTE') THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END;
$map_authority$;
"""
baseline_guard = """DO $map_baseline$
DECLARE observed jsonb;
BEGIN
 SELECT q.result INTO observed FROM (
""" + query + """
 ) q;
 IF observed->>'coverage' IS DISTINCT FROM 'complete'
  OR observed->>'baseline_sha256' IS DISTINCT FROM """ + quoted(baseline) + """ THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_BASELINE_MISMATCH' USING ERRCODE='55000';
 END IF;
END;
$map_baseline$;
"""
presence = "EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_profile_location_v1')"
absence_guard = """DO $map_absence$
BEGIN
 IF """ + presence + """ THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_PARTIAL_OR_EXISTING_RELEASE' USING ERRCODE='55000';
 END IF;
END;
$map_absence$;
"""
after_check = """ SELECT q.result INTO observed FROM (
""" + new_query + """
 ) q;
 IF observed->>'sha256' IS DISTINCT FROM """ + quoted(contract) + """ THEN
  RAISE EXCEPTION 'PUBLIC_PROFILE_MAP_AFTER_MISMATCH' USING ERRCODE='55000';
 END IF;
"""
after_guard = 'DO $map_after$\nDECLARE observed jsonb;\nBEGIN\n' + after_check + 'END;\n$map_after$;\n'
before_guard = 'DO $map_before$\nDECLARE observed jsonb;\nBEGIN\n IF ' + presence + ' THEN\n' + after_check + ' END IF;\nEND;\n$map_before$;\n'
def receipt(stage, before=False):
    expected = ('CASE WHEN ' + presence + ' THEN ' + quoted(contract) + ' ELSE NULL END') if before else quoted(contract)
    return ("SELECT jsonb_build_object('format','selqiro-public-profile-map-v1','stage'," + quoted(stage)
        + ",\n 'baseline_sha256'," + quoted(baseline) + ",\n 'release_sha256'," + quoted(release)
        + ",\n 'contract_sha256'," + expected + ",'no_user_rows_exported',true) AS result;\n")

preflight = '-- Read-only: exact absence or exact installed release, otherwise stop.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n' + settings + authority + baseline_guard + before_guard + receipt('before', True) + 'ROLLBACK;\n'
apply = '-- One mutation transaction. No acknowledgement is emitted before COMMIT.\nBEGIN ISOLATION LEVEL READ COMMITTED;\n' + settings + authority + baseline_guard + absence_guard + changes + '\n' + baseline_guard + after_guard + "COMMIT;\n\n-- Acknowledgement is read-only and post-COMMIT; uncertainty never authorizes replay.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n" + settings + authority + baseline_guard + after_guard + receipt('applied') + 'ROLLBACK;\n'
verify = '-- Independent read-only verification is mandatory after an apply attempt.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n' + settings + authority + baseline_guard + after_guard + receipt('after') + 'ROLLBACK;\n'
for name, text in [('preflight.sql', preflight), ('apply.sql', apply), ('verify.sql', verify), ('execution-prerequisite.sql', authority)]:
    (HERE / name).write_text(text)

old_parser = (PREVIOUS / 'sql_contract.py').read_text()
new_parser = old_parser.replace('profile-location SQL receipts', 'public profile map SQL receipts').replace(
    parser.BASELINE_SHA256, baseline).replace(parser.RELEASE_SHA256, release).replace(
    parser.CONTRACT_SHA256, contract).replace('selqiro-profile-location-v1', 'selqiro-public-profile-map-v1')
(HERE / 'sql_contract.py').write_text(new_parser)
expected = {'format': 'selqiro-public-profile-map-expected-contract-v1', 'baseline_sha256': baseline,
    'preserved_baseline_facts': baseline_facts, 'release_sha256': release, 'contract_sha256': contract,
    'accepted_report_name': report_path.name, 'accepted_report_sha256': sha(report_path.read_bytes()),
    'accepted_source_commit': ACCEPTED_COMMIT, 'new_catalog': native['catalog'],
    'sql_sha256': {name: sha((HERE / name).read_bytes()) for name in ['baseline-query.sql', 'new-catalog-query.sql',
      'changes.sql', 'preflight.sql', 'apply.sql', 'verify.sql', 'execution-prerequisite.sql', 'sql_contract.py']}}
(HERE / 'expected-contract.json').write_text(json.dumps(expected, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: expected[k] for k in ['baseline_sha256', 'release_sha256', 'contract_sha256', 'sql_sha256']}, indent=2))
