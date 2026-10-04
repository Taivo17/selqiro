#!/usr/bin/env python3
"""Render the short Selqiro handoff from its one state record. Python 3.9+.
Default/--check is read-only. --write only refreshes the generated handoff.
No Git, network, database, environment-file read or package dependency.
"""
import argparse
import json
import os
import stat
import tempfile
from pathlib import Path

STATE = "docs/continuity/CURRENT_STATE.json"
TARGET = "docs/99_V2_HANDOFF_NEXT_CHAT.md"

def render(s):
    required = {"format", "recorded_on", "checkpoint", "source", "local_test", "production",
                "next_action", "stop_rule", "archive", "read_next", "boundaries", "environment"}
    if set(s) != required or s["format"] != "selqiro_repo_handoff_v1":
        raise ValueError("Unexpected state format; do not guess missing fields.")
    for key in ("checkpoint", "next_action", "stop_rule"):
        if not isinstance(s[key], str) or not s[key].strip():
            raise ValueError("Missing current checkpoint/action/stop rule.")
    lines = ["<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->",
             "# Selqiro — praegune tööüleandmine", "", "Seisukirje: " + s["recorded_on"], "",
             "## Praegune checkpoint", "", s["checkpoint"], "", "## Lähtekood ja tõendi piir", ""]
    for key, text in s["source"].items():
        lines.append("- **" + key + ":** " + text)
    lines += ["", "## Tegelik kohalik katse", ""]
    lines += ["- " + text for text in s["local_test"]]
    lines += ["", "## Production / kasutajaliides", ""]
    lines += ["- " + text for text in s["production"]]
    lines += ["", "## Üks järgmine töö", "", s["next_action"], "", "**Peatumisel:** " + s["stop_rule"],
              "", "## Loe ainult vajalikku", ""]
    lines += ["- " + text for text in s["read_next"]]
    lines += ["", "## Säilivad piirid", ""]
    lines += ["- " + text for text in s["boundaries"]]
    lines += ["", "## Keskkond", ""]
    lines += ["- " + text for text in s["environment"]]
    lines += ["", "## Ajalugu (mitte praegused käsud)", "",
              "Vana sisenemisleht: `" + s["archive"]["path"] + "`.",
              "Kõik " + str(s["archive"]["lines"]) + " algset rida säilivad bait-baidilt; SHA-256 `" +
              s["archive"]["sha256"] + "`.",
              "Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.", ""]
    output = "\n".join(lines)
    if len(lines) > 100 or len(output.encode("utf-8")) > 16000:
        raise ValueError("Current handoff grew too long; move detail to a linked document.")
    return output

def plain(path):
    if path.resolve(strict=True) != path or not stat.S_ISREG(path.stat().st_mode):
        raise ValueError("Expected an existing non-symlink file.")
    return path.read_bytes()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="verify generated handoff (default)")
    mode.add_argument("--write", action="store_true", help="explicitly update only the generated handoff")
    args = parser.parse_args()
    root = Path(__file__).absolute().parents[2]
    try:
        state_path, target = root / STATE, root / TARGET
        source = plain(state_path)
        obj = json.loads(source)
        expected = render(obj).encode("utf-8")
        before = plain(target)
        if args.write and before != expected:
            if plain(state_path) != source or plain(target) != before:
                raise ValueError("Source changed before write; stop.")
            fd, tmp = tempfile.mkstemp(prefix=".handoff-", dir=str(target.parent))
            try:
                with os.fdopen(fd, "wb") as handle:
                    handle.write(expected); handle.flush(); os.fsync(handle.fileno())
                os.chmod(tmp, 0o644)
                if plain(state_path) != source or plain(target) != before:
                    raise ValueError("Source changed before replacement; stop.")
                os.replace(tmp, target)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)  # only this invocation's exclusive temporary file
        if plain(target) != expected or plain(state_path) != source:
            raise ValueError("Generated handoff differs; edit state, then use --write deliberately.")
        print("HANDOFF_CHECK=PASS")
        return 0
    except (ValueError, OSError, KeyError, TypeError) as exc:
        print("HANDOFF_CHECK=STOP: " + str(exc))
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
