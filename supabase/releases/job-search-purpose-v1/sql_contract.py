"""Strict, metadata-only job search purpose installation receipts; Python 3.9+."""
import json
import re

FORMAT = 'selqiro-job-search-purpose-20261126-v1'
BASE = 'd17571a9adea218ec8239a48ec43661284efe2af9512f46d165152137a29f336'
BEFORE = '108e169172491836fc38eeac3fdc88cb32a346830d0932b4e70212dfa5ce0b21'
AFTER = 'aea906efbfb99b2c4443d7d173f312c2e3c1f3f03b4aa06d841693a0f1204690'

_KEYS = frozenset({'format','stage','state','recognized','read_only','account_rows_read',
    'account_rows_exported','base_fingerprint','target_fingerprint','fence_verified'})
_SHA = re.compile(r'^[0-9a-f]{64}$')

def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError('duplicate_json_key')
        result[key] = value
    return result

def _constant(_):
    raise ValueError('non_json_constant')

def _valid(report):
    if type(report) is not dict or frozenset(report) != _KEYS:
        return False
    if report['format'] != FORMAT or report['stage'] not in ('preflight','apply','verify'):
        return False
    for key in ('recognized','read_only','account_rows_read','account_rows_exported','fence_verified'):
        if type(report[key]) is not bool:
            return False
    if report['account_rows_exported'] is not False:
        return False
    for key in ('base_fingerprint','target_fingerprint'):
        if type(report[key]) is not str or not _SHA.fullmatch(report[key]):
            return False
    observed = ('before' if report['base_fingerprint'] == BASE and report['target_fingerprint'] == BEFORE else
                'after' if report['base_fingerprint'] == BASE and report['target_fingerprint'] == AFTER else 'unknown')
    if report['state'] != observed or report['recognized'] is not (observed != 'unknown'):
        return False
    if report['read_only'] is not (report['stage'] != 'apply'):
        return False
    if report['account_rows_read'] is not False:
        return False
    if report['fence_verified'] is not (observed == 'after'):
        return False
    return report['stage'] == 'preflight' or observed == 'after'

def read_result(raw, stage):
    """Only the pinned successful CLI envelope [{"result":{...}}] is accepted."""
    if stage not in ('preflight','apply','verify'):
        raise ValueError('invalid_stage')
    if type(raw) is not bytes or not (1 <= len(raw) <= 8192):
        raise ValueError('invalid_result_size_or_type')
    try:
        envelope = json.loads(raw.decode('utf-8',errors='strict'),object_pairs_hook=_pairs,parse_constant=_constant)
    except (ValueError,UnicodeError,RecursionError) as error:
        raise ValueError('invalid_json_result') from error
    if type(envelope) is not list or len(envelope) != 1 or type(envelope[0]) is not dict or set(envelope[0]) != {'result'}:
        raise ValueError('invalid_result_envelope')
    report = envelope[0]['result']
    if not _valid(report) or report['stage'] != stage:
        raise ValueError('invalid_result_contract')
    return report

def trusted(report, state=None):
    return state in (None,'before','after') and _valid(report) and report['recognized'] is True and (state is None or report['state'] == state)

def unchanged_contract(current, original):
    """Raise on drift, so a caller cannot accidentally ignore a false return value."""
    if not trusted(current) or not trusted(original) or current['base_fingerprint'] != original['base_fingerprint']:
        raise ValueError('job_search_purpose_base_changed')
    return True
