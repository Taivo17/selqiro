"""Validate exact bounded metadata receipt parsing without a live connection."""
from pathlib import Path
import importlib.util
import json

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / 'release' if (ROOT / 'release').is_dir() else ROOT
spec = importlib.util.spec_from_file_location('contract', RELEASE / 'sql_contract.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
cases = []


def payload(stage, state):
    return {'format': c.FORMAT, 'stage': stage, 'state': state,
            'recognized': state != 'unknown', 'read_only': stage != 'apply',
            'account_rows_read': False, 'account_rows_exported': False,
            'base_fingerprint': c.BASE,
            'target_fingerprint': c.BEFORE if state == 'before' else c.AFTER if state == 'after' else '0' * 64,
            'fence_verified': state == 'after'}


def wire(value):
    return json.dumps([{'result': value}], separators=(',', ':')).encode()


def check(name, operation):
    operation()
    cases.append({'name': name, 'passed': True})


def rejected(raw, stage):
    try:
        c.read_result(raw, stage)
    except ValueError:
        return
    raise AssertionError('Invalid receipt accepted')


for stage, state in [('preflight', 'before'), ('preflight', 'after'), ('apply', 'after'), ('verify', 'after')]:
    def valid(stage=stage, state=state):
        p = payload(stage, state)
        assert c.read_result(wire(p), stage) == p
        assert c.trusted(p, state)
    check(stage + '_' + state + '_trusted', valid)


def unknown():
    p = payload('preflight', 'unknown')
    assert c.read_result(wire(p), 'preflight') == p
    assert not c.trusted(p)


check('unknown_preflight_never_trusted', unknown)
good = payload('preflight', 'before')
for name, raw, stage in [
    ('extra_envelope_row', json.dumps([{'result': good}, {'result': good}]).encode(), 'preflight'),
    ('extra_envelope_key', json.dumps([{'result': good, 'extra': 1}]).encode(), 'preflight'),
    ('extra_report_key', wire({**good, 'extra': 1}), 'preflight'),
    ('duplicate_key', wire(good).replace(b'"recognized":true', b'"recognized":true,"recognized":true'), 'preflight'),
    ('numeric_boolean', wire({**good, 'read_only': 1}), 'preflight'),
    ('wrong_format', wire({**good, 'format': 'other'}), 'preflight'),
    ('stage_mismatch', wire(good), 'verify'),
    ('apply_before_state', wire(payload('apply', 'before')), 'apply'),
    ('verify_unknown_state', wire(payload('verify', 'unknown')), 'verify'),
    ('forged_after_fingerprint', wire({**payload('apply', 'after'), 'target_fingerprint': c.BEFORE}), 'apply'),
    ('account_rows_read', wire({**good, 'account_rows_read': True}), 'preflight'),
    ('account_rows_exported', wire({**good, 'account_rows_exported': True}), 'preflight'),
    ('oversize', b' ' * 8193, 'preflight'),
    ('empty', b'', 'preflight'),
    ('invalid_utf8', b'\xff', 'preflight'),
    ('non_json_constant', wire(good).replace(b'"recognized":true', b'"recognized":NaN'), 'preflight'),
]:
    check(name + '_rejected', lambda raw=raw, stage=stage: rejected(raw, stage))


def preservation():
    assert c.unchanged_contract(payload('verify', 'after'), good)
    try:
        c.unchanged_contract({**payload('verify', 'after'), 'base_fingerprint': '0' * 64}, good)
    except ValueError:
        return
    raise AssertionError('Changed BASE accepted')


check('unchanged_base_contract_raises_on_drift', preservation)
result = {'format': 'selqiro-job-search-purpose-receipt-tests-v1', 'result': 'PASS',
          'counts': {'passed': len(cases), 'failed': 0}, 'cases': cases,
          'production_connection_used': False}
(ROOT / 'proof/receipt-tests.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'result': 'PASS', 'passed': len(cases), 'failed': 0}))
