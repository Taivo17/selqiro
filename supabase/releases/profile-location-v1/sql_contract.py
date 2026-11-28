"""Strict bounded profile-location SQL receipts; contains no executor or network code."""
import json

BASELINE_SHA256 = 'eb0bcb241ed6d1d0f786dc06a59b91ecbef0b584d594b105b704331a3c08d2c0'
RELEASE_SHA256 = 'efb63861ed24b046df17cfcf4d634e8fc292fac75514b920a99f4f1eb3b5369d'
CONTRACT_SHA256 = 'e9d04dd82630e259571f0ce3ad06704b835266d184dfe740baa59ef3fc32b06a'
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
