"""Offline assembly from a reviewed observation and isolated new metadata capture."""
from pathlib import Path
import hashlib
import json
import sys

HERE = Path(__file__).resolve().parent
def sha(data): return hashlib.sha256(data).hexdigest()
def read_json(path): return json.loads(Path(path).read_text())
def quoted(value): return "'"+value.replace("'","''")+"'"
if len(sys.argv)!=3:
    raise SystemExit('usage: build_release.py ACCEPTED_DIAGNOSTIC_REPORT ISOLATED_NEW_CONTRACT')
report_path=Path(sys.argv[1]); native_path=Path(sys.argv[2])
report=read_json(report_path); native=read_json(native_path)
assert report['catalog']['coverage']['state']=='complete'
assert report['source_and_index_preserved'] is True
baseline=report['catalog']['facts_sha256']; contract=native['sha256']
changes=(HERE/'changes.sql').read_text(); release=sha(changes.encode())
assert native['catalog']['counts']['tables']==4 and native['catalog']['counts']['functions']==8
assert len(baseline)==len(contract)==len(release)==64
query=(HERE/'baseline-query.sql').read_text().strip().removesuffix(';')
new_query=(HERE/'new-catalog-query.sql').read_text().strip().removesuffix(';')
settings="""SET LOCAL search_path=pg_catalog;
SET LOCAL timezone='UTC';
SET LOCAL jit=off;
SET LOCAL statement_timeout='20s';
SET LOCAL lock_timeout='3s';
SET LOCAL idle_in_transaction_session_timeout='25s';
"""
authority="""DO $location_authority$
BEGIN
 IF current_user<>'postgres' OR current_setting('server_version_num')::integer<>170006
  OR NOT coalesce(has_schema_privilege('postgres','auth','USAGE'),false)
  OR NOT coalesce(has_table_privilege('postgres','auth.users','SELECT'),false)
  OR NOT coalesce(has_any_column_privilege('postgres','auth.users','UPDATE'),false)
  OR coalesce(row_security_active('auth.users'::regclass),true)
  OR NOT coalesce(has_schema_privilege('postgres','account_lifecycle_private','USAGE'),false)
  OR NOT coalesce(has_table_privilege('postgres','account_lifecycle_private.account_states','SELECT'),false)
  OR NOT coalesce(has_any_column_privilege('postgres','account_lifecycle_private.account_states','UPDATE'),false)
  OR coalesce(row_security_active('account_lifecycle_private.account_states'::regclass),true) THEN
  RAISE EXCEPTION 'PROFILE_LOCATION_EXECUTION_AUTHORITY_REQUIRED' USING ERRCODE='42501';
 END IF;
END;
$location_authority$;
"""
baseline_guard="""DO $location_baseline$
DECLARE observed jsonb;
BEGIN
 SELECT q.result INTO observed FROM (
"""+query+"""
 ) q;
 IF observed#>>'{coverage,state}' IS DISTINCT FROM 'complete'
  OR observed->>'facts_sha256' IS DISTINCT FROM """+quoted(baseline)+""" THEN
  RAISE EXCEPTION 'PROFILE_LOCATION_BASELINE_MISMATCH' USING ERRCODE='55000';
 END IF;
END;
$location_baseline$;
"""
absence_check=""" IF to_regnamespace('profile_location_private') IS NOT NULL
  OR EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname IN ('get_my_profile_editor_v2','save_my_profile_editor_v2',
    'prepare_profile_location_v1','reserve_profile_location_lookup_v1'))
  OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass('public.identity_profiles')
   AND tgname='profile_location_text_changed_v1' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'PROFILE_LOCATION_PARTIAL_OR_EXISTING_RELEASE' USING ERRCODE='55000';
 END IF;
"""
absence_guard='DO $location_absence$\nBEGIN\n'+absence_check+'END;\n$location_absence$;\n'
after_check=""" SELECT q.result INTO observed FROM (
"""+new_query+"""
 ) q;
 IF observed->>'sha256' IS DISTINCT FROM """+quoted(contract)+""" THEN
  RAISE EXCEPTION 'PROFILE_LOCATION_AFTER_MISMATCH' USING ERRCODE='55000';
 END IF;
"""
after_guard='DO $location_after$\nDECLARE observed jsonb;\nBEGIN\n'+after_check+'END;\n$location_after$;\n'
before_state="""DO $location_before$
DECLARE observed jsonb;
BEGIN
 IF to_regnamespace('profile_location_private') IS NULL THEN
"""+absence_check+""" ELSE
"""+after_check+""" END IF;
END;
$location_before$;
"""
def receipt(stage,before=False):
    expected=("CASE WHEN to_regnamespace('profile_location_private') IS NULL THEN NULL ELSE "+quoted(contract)+' END') if before else quoted(contract)
    return "SELECT jsonb_build_object('format','selqiro-profile-location-v1','stage',"+quoted(stage)+",\n 'baseline_sha256',"+quoted(baseline)+",\n 'release_sha256',"+quoted(release)+",\n 'contract_sha256',"+expected+",'no_user_rows_exported',true) AS result;\n"
preflight='-- Read-only: exact absent or exact already-installed release, otherwise stop.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n'+settings+authority+baseline_guard+before_state+receipt('before',True)+'ROLLBACK;\n'
apply='-- One mutation transaction; no acknowledgement is emitted before COMMIT.\nBEGIN ISOLATION LEVEL READ COMMITTED;\n'+settings+authority+baseline_guard+absence_guard+changes+'\n'+baseline_guard+after_guard+"COMMIT;\n\n-- Acknowledgement is a read-only post-COMMIT observation. Failure here means\n-- outcome unknown; only the independent verify.sql may follow, never replay.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n"+settings+authority+baseline_guard+after_guard+receipt('applied')+'ROLLBACK;\n'
verify='-- Independent read-only verification is mandatory after every apply attempt.\nBEGIN ISOLATION LEVEL READ COMMITTED READ ONLY;\n'+settings+authority+baseline_guard+after_guard+receipt('after')+'ROLLBACK;\n'
for name,text in [('preflight.sql',preflight),('apply.sql',apply),('verify.sql',verify),('execution-prerequisite.sql',authority)]:
    (HERE/name).write_text(text)
expected={'format':'selqiro-profile-location-expected-contract-v1','baseline_sha256':baseline,'release_sha256':release,'contract_sha256':contract,
 'accepted_report_sha256':sha(report_path.read_bytes()),'accepted_report_name':report_path.name,
 'accepted_source_commit':'7c53643012545c7dfa99ba976e6f2613e3c3a201','new_catalog':native['catalog'],
 'sql_sha256':{n:sha((HERE/n).read_bytes()) for n in ['baseline-query.sql','new-catalog-query.sql','changes.sql','preflight.sql','apply.sql','verify.sql','execution-prerequisite.sql']}}
(HERE/'expected-contract.json').write_text(json.dumps(expected,ensure_ascii=False,indent=2)+'\n')
parser='''"""Strict bounded profile-location SQL receipts; contains no executor or network code."""
import json

BASELINE_SHA256 = %r
RELEASE_SHA256 = %r
CONTRACT_SHA256 = %r
FORMAT = "selqiro-profile-location-v1"
KEYS = frozenset(("format", "stage", "baseline_sha256", "release_sha256", "contract_sha256", "no_user_rows_exported"))

def _pairs(pairs):
    out = {}
    for key, value in pairs:
        if key in out:
            raise ValueError("duplicate_sql_receipt_key")
        out[key] = value
    return out

def _constant(value):
    raise ValueError("non_json_sql_receipt_number")

def parse_result(raw: bytes, expected_stage: str) -> dict:
    if expected_stage not in ("before", "applied", "after"):
        raise ValueError("unknown_sql_receipt_stage")
    if not isinstance(raw, bytes) or not 1 <= len(raw) <= 16384:
        raise ValueError("sql_receipt_size")
    envelope = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=_pairs, parse_constant=_constant)
    if not isinstance(envelope, list) or len(envelope) != 1 or not isinstance(envelope[0], dict) or set(envelope[0]) != {"result"}:
        raise ValueError("sql_receipt_envelope")
    result = envelope[0]["result"]
    if not isinstance(result, dict) or set(result) != KEYS or result["format"] != FORMAT or result["stage"] != expected_stage:
        raise ValueError("sql_receipt_shape")
    if result["baseline_sha256"] != BASELINE_SHA256 or result["release_sha256"] != RELEASE_SHA256 or result["no_user_rows_exported"] is not True:
        raise ValueError("sql_receipt_pin")
    if result["contract_sha256"] != CONTRACT_SHA256 and not (expected_stage == "before" and result["contract_sha256"] is None):
        raise ValueError("sql_receipt_contract")
    return result
'''%(baseline,release,contract)
(HERE/'sql_contract.py').write_text(parser)
print(json.dumps({'baseline_sha256':baseline,'release_sha256':release,'contract_sha256':contract,'sql_sha256':expected['sql_sha256']},indent=2))
