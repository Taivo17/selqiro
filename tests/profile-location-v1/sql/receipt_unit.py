#!/usr/bin/env python3
"""Strict receipt boundary tests. No SQL executor, application rows or network."""
from pathlib import Path
import hashlib
import importlib.util
import json
import sys

SOURCE = Path(__file__).resolve().parents[3]
PARSER = SOURCE / 'supabase/releases/profile-location-v1/sql_contract.py'
spec = importlib.util.spec_from_file_location('profile_location_receipt', PARSER)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)
cases = []


def receipt(stage='before', installed=False):
    return {'format': contract.FORMAT, 'stage': stage,
            'baseline_sha256': contract.BASELINE_SHA256,
            'release_sha256': contract.RELEASE_SHA256,
            'contract_sha256': contract.CONTRACT_SHA256 if installed or stage != 'before' else None,
            'no_user_rows_exported': True}


def wire(value):
    return json.dumps([{'result': value}], ensure_ascii=False).encode()


def denied(raw, stage='before'):
    try:
        contract.parse_result(raw, stage)
    except (ValueError, UnicodeDecodeError):
        return
    raise AssertionError('invalid receipt was accepted')


def run(name, fn):
    fn()
    cases.append({'id': name, 'passed': True})


def valid_receipts():
    for stage, installed in [('before', False), ('before', True), ('applied', True), ('after', True)]:
        value = receipt(stage, installed)
        assert contract.parse_result(wire(value), stage) == value


def malformed_envelopes():
    for value in [{}, [], [None], [receipt()], [{'result': receipt(), 'extra': 1}],
                  [{'result': receipt()}, {'result': receipt()}], [{'result': None}], [{'result': []}]]:
        denied(json.dumps(value).encode())


def closed_shape():
    for key in receipt():
        value = receipt()
        del value[key]
        denied(wire(value))
    denied(wire({**receipt(), 'extra': 'value'}))
    for key in ['format', 'stage', 'baseline_sha256', 'release_sha256']:
        for bad in [None, '', 0, False, [], {}, 'not-the-pin']:
            denied(wire({**receipt(), key: bad}))
    for bad in [False, 1, 'true', None]:
        denied(wire({**receipt(), 'no_user_rows_exported': bad}))


def stages_and_pins():
    for stage in ['before', 'applied', 'after']:
        for other in ['before', 'applied', 'after']:
            if stage != other:
                denied(wire(receipt(other)), stage)
        denied(wire({**receipt(stage), 'contract_sha256': '0' * 64}), stage)
    for stage in ['applied', 'after']:
        denied(wire({**receipt(stage), 'contract_sha256': None}), stage)
    for stage in ['', 'verified', None]:
        denied(wire(receipt()), stage)


def duplicate_keys():
    raw = wire(receipt())
    denied(raw.replace(b'"stage": "before"', b'"stage": "before", "stage": "before"'))
    denied(b'[{"result":' + json.dumps(receipt()).encode() + b',"result":' + json.dumps(receipt()).encode() + b'}]')


def bytes_and_json_bounds():
    for raw in [b'', b' ' * 16385, b'\xff', b'[] trailing', '[]', bytearray(b'[]'), None]:
        denied(raw)
    for number in [b'NaN', b'Infinity', b'-Infinity']:
        denied(wire(receipt()).replace(b'"contract_sha256": null', b'"contract_sha256": ' + number))


failure = None
try:
    run('exact_absent_installed_applied_and_verified_receipts', valid_receipts)
    run('one_exact_result_wrapper_and_no_extra_rows', malformed_envelopes)
    run('exact_six_keys_types_boolean_and_source_release_pins', closed_shape)
    run('expected_stage_and_new_contract_pin_cannot_be_confused', stages_and_pins)
    run('duplicate_keys_rejected_at_result_and_wrapper', duplicate_keys)
    run('bounded_strict_utf8_bytes_json_and_no_nonfinite_constants', bytes_and_json_bounds)
except Exception as error:
    failure = {'type': type(error).__name__, 'message': str(error)}
report = {'format': 'selqiro-profile-location-receipt-proof-v1', 'passed': failure is None,
          'case_count': len(cases), 'cases': cases, 'failure': failure,
          'parser_sha256': hashlib.sha256(PARSER.read_bytes()).hexdigest(),
          'test_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'sql_executed': False, 'network_accessed': False}
if len(sys.argv) == 2:
    with Path(sys.argv[1]).open('x') as output:
        json.dump(report, output, ensure_ascii=False, indent=2)
        output.write('\n')
print(json.dumps({'passed': report['passed'], 'case_count': len(cases), 'failure': failure}))
raise SystemExit(0 if failure is None else 1)
