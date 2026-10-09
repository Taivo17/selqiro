#!/usr/bin/env python3
"""Read-only verification of retained lab sources. No SQL or network. Python 3.9+."""
import hashlib
import json
import stat
from pathlib import Path


def read_plain(path):
    if path.resolve(strict=True) != path or not stat.S_ISREG(path.stat().st_mode):
        raise ValueError("Expected a regular non-symlink source file")
    return path.read_bytes()


def checked(root, relative, expected):
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts or "\\" in relative:
        raise ValueError("Unsafe source path")
    raw = read_plain(root / path)
    if len(raw) != expected["bytes"] or hashlib.sha256(raw).hexdigest() != expected["sha256"]:
        raise ValueError("Source mismatch: " + relative)


def main():
    lab = Path(__file__).absolute().parent
    root = lab.parents[2]
    try:
        p = json.loads(read_plain(lab / "PROVENANCE.json"))
        d = json.loads(read_plain(lab / "tests/DEPENDENCIES.json"))
        if p["format"] != "selqiro_tested_owner_read_sources_v1":
            raise ValueError("Unknown provenance format")
        if d["paths"] != p["dependencies"]:
            raise ValueError("Dependency manifests disagree")
        for name, expected in p["preserved_sources"].items():
            checked(lab, name, expected)
        for name, expected in p["new_scaffolding"].items():
            checked(lab, name, expected)
        for name, expected in p["dependencies"].items():
            checked(root, name, expected)
        print("LAB_SOURCE_CHECK=PASS_RECORDED_BYTES_ONLY_NO_SQL")
        return 0
    except (OSError, KeyError, TypeError, ValueError) as exc:
        print("LAB_SOURCE_CHECK=STOP: " + str(exc))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
