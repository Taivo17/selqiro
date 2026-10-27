#!/usr/bin/env python3
"""Prepare a separate, staged Mac worktree from the reviewed full-source bundle.

No commit, push, service call, environment-file copy, dependency install or local
runtime change. Existing Git hooks are honored by the normal worktree command.
Run once after extracting the complete handoff ZIP; an existing destination or
branch is preserved and makes a repeat invocation stop before any Git mutation.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shlex
import stat
import subprocess
import sys
from datetime import datetime, timezone


BASE = "e95fa9ce1d41b9b4c6e4884b6076f414173a946d"
MAIN = Path("/Users/taivo/selqiro")
CANDIDATE = Path("/Users/taivo/selqiro-v2-integratsioon-20261018")
DESTINATION = Path("/Users/taivo/selqiro-veeb-20261026")
CANDIDATE_BRANCH = "work/v2-integratsioon-20261018"
BRANCH = "work/portal-20261026"
ACCEPTED_MAP_SHA256 = "463638175d1b4e4440592d569a75fb97e2b75eaeafea5e877edf6dfdfe99766c"
APPROVED_ORIGINS = {
    "https://github.com/Taivo17/selqiro.git",
    "https://github.com/Taivo17/selqiro",
    "git@github.com:Taivo17/selqiro.git",
}


class PreparationError(Exception):
    pass


def require(condition, code):
    if not condition:
        raise PreparationError(code)


def no_link_path(path, allow_missing=False):
    """Check every existing path component without resolving away a symlink."""
    require(path.is_absolute() and ".." not in path.parts, "absolute_path_without_traversal_required")
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current = current / part
        try:
            info = current.lstat()
        except FileNotFoundError:
            require(allow_missing, "required_path_missing")
            continue
        require(not stat.S_ISLNK(info.st_mode), "symlink_path_rejected")


def relative_source_path(value):
    require(isinstance(value, str) and value and "\\" not in value
            and not any(ord(c) < 32 or ord(c) == 127 for c in value), "source_path_invalid")
    path = PurePosixPath(value)
    require(not path.is_absolute() and str(path) == value
            and all(part not in {".", ".."} for part in path.parts), "source_path_invalid")
    require(not any(part in {".git", ".next", ".vercel", ".temp", "node_modules", "__pycache__"}
                    or part.startswith(".env") or part == "accounts.txt" for part in path.parts),
            "non_source_path_rejected")
    return path


def read_regular(path, max_bytes=None):
    no_link_path(path)
    require(stat.S_ISREG(path.lstat().st_mode), "regular_file_required")
    fd = os.open(str(path), os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(fd, "rb") as handle:
        info = os.fstat(handle.fileno())
        require(stat.S_ISREG(info.st_mode), "regular_file_required")
        if max_bytes is not None:
            require(info.st_size <= max_bytes, "metadata_file_too_large")
        data = handle.read() if max_bytes is None else handle.read(max_bytes + 1)
    if max_bytes is not None:
        require(len(data) <= max_bytes, "metadata_file_too_large")
    return data


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate_json_key")
        result[key] = value
    return result


def read_json(path):
    try:
        result = json.loads(read_regular(path, 4 * 1024 * 1024), object_pairs_hook=unique_object)
    except (ValueError, UnicodeError) as exc:
        raise PreparationError("metadata_json_invalid") from exc
    require(isinstance(result, dict), "metadata_object_required")
    return result


def manifest(path):
    value = read_json(path)
    require(value.get("accepted_base") == BASE, "manifest_base_mismatch")
    hashes = value.get("source_hashes")
    require(isinstance(hashes, dict) and hashes
            and value.get("current_source_files") == len(hashes), "manifest_count_invalid")
    for name, digest in hashes.items():
        relative_source_path(name)
        require(isinstance(digest, str) and re.fullmatch(r"[0-9a-f]{64}", digest), "manifest_digest_invalid")
    return hashes


def map_hash(hashes):
    return hashlib.sha256(json.dumps(hashes, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def verify_files(root, hashes, complete=False):
    no_link_path(root)
    require(root.is_dir(), "source_directory_required")
    if complete:
        found = set()
        for directory, dirs, files in os.walk(root, followlinks=False):
            parent = Path(directory)
            for name in dirs:
                require(stat.S_ISDIR((parent / name).lstat().st_mode), "source_directory_symlink_rejected")
            for name in files:
                child = parent / name
                require(stat.S_ISREG(child.lstat().st_mode), "source_nonregular_file_rejected")
                found.add(child.relative_to(root).as_posix())
        require(found == set(hashes), "bundle_source_inventory_mismatch")
    for name, expected in hashes.items():
        actual = hashlib.sha256(read_regular(root.joinpath(*relative_source_path(name).parts))).hexdigest()
        require(actual == expected, "source_hash_mismatch")


def git(root, *args, input_bytes=None, allowed=(0,)):
    result = subprocess.run(["git", "--literal-pathspecs", "-C", str(root), *args],
                            input=input_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    require(result.returncode in allowed, "git_command_failed")
    return result.returncode, result.stdout


def git_text(root, *args):
    _, output = git(root, *args)
    try:
        return output.decode("utf-8").strip()
    except UnicodeError as exc:
        raise PreparationError("git_metadata_encoding_invalid") from exc


def changed_paths(root):
    _, output = git(root, "status", "--porcelain=v1", "-z", "--untracked-files=all")
    fields = output.split(b"\0")
    require(fields[-1] == b"", "git_status_invalid")
    fields.pop()
    paths = set()
    index = 0
    while index < len(fields):
        entry = fields[index]
        require(len(entry) > 3 and entry[2:3] == b" ", "git_status_invalid")
        xy = entry[:2]
        require(xy not in {b"DD", b"AU", b"UD", b"UA", b"DU", b"AA", b"UU"}, "git_conflict_present")
        try:
            paths.add(entry[3:].decode("utf-8"))
            if b"R" in xy or b"C" in xy:
                index += 1
                require(index < len(fields), "git_status_invalid")
                paths.add(fields[index].decode("utf-8"))
        except UnicodeError as exc:
            raise PreparationError("git_path_encoding_invalid") from exc
        index += 1
    return paths


def verify_checkout(root, branch, clean=False):
    no_link_path(root)
    require(root.is_dir(), "checkout_missing")
    require(git_text(root, "rev-parse", "--show-toplevel") == str(root), "checkout_root_mismatch")
    require(git_text(root, "rev-parse", "--verify", "HEAD") == BASE, "checkout_head_changed")
    require(git_text(root, "symbolic-ref", "--quiet", "--short", "HEAD") == branch, "checkout_branch_changed")
    require(git_text(root, "remote", "get-url", "origin") in APPROVED_ORIGINS, "checkout_origin_mismatch")
    changes = changed_paths(root)
    require(not clean or not changes, "main_checkout_not_clean")
    return changes


def copy_reviewed_source(source, destination, hashes):
    for name, expected in sorted(hashes.items()):
        relative = relative_source_path(name)
        data = read_regular(source.joinpath(*relative.parts))
        require(hashlib.sha256(data).hexdigest() == expected, "bundle_changed_during_transfer")
        target = destination.joinpath(*relative.parts)
        no_link_path(target, allow_missing=True)
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            require(stat.S_ISREG(target.lstat().st_mode), "destination_nonregular_file_rejected")
        fd = os.open(str(target), os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644)
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, default=Path(__file__).absolute().parents[3],
                        help="Extracted full handoff folder containing source/, manifests/ and CHECKPOINT.json")
    args = parser.parse_args()
    bundle = args.bundle.absolute()
    report_fd = None
    report_path = bundle / "local-result" / "portal-worktree-preparation.json"
    report = {"format": "selqiro_portal_worktree_preparation_v1", "status": "not_started",
              "accepted_base": BASE, "branch": BRANCH, "worktree": str(DESTINATION),
              "commit_created": False, "pushed": False, "service_changes": False,
              "existing_candidate_modified_by_script": False}
    exit_code = 0
    try:
        require(sys.platform == "darwin", "run_on_existing_mac_required")
        require(not any(name in os.environ for name in (
            "GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR", "GIT_OBJECT_DIRECTORY")),
            "git_environment_override_present")
        no_link_path(bundle)
        require(bundle.is_dir(), "bundle_directory_missing")
        accepted = manifest(bundle / "manifests" / "mac-accepted.json")
        final = manifest(bundle / "manifests" / "after.json")
        checkpoint = read_json(bundle / "CHECKPOINT.json")
        require(len(accepted) == 807 and map_hash(accepted) == ACCEPTED_MAP_SHA256, "accepted_manifest_mismatch")
        final_digest = map_hash(final)
        require(final_digest == checkpoint.get("source_after_map_sha256"), "checkpoint_source_map_mismatch")
        require(set(accepted) <= set(final), "source_removal_not_reviewed")
        verify_files(bundle / "source", final, complete=True)
        verify_checkout(MAIN, "main", clean=True)
        candidate_changes = verify_checkout(CANDIDATE, CANDIDATE_BRANCH)
        require(candidate_changes <= set(accepted), "candidate_has_unreviewed_changed_paths")
        verify_files(CANDIDATE, accepted)
        no_link_path(DESTINATION, allow_missing=True)
        require(not os.path.lexists(DESTINATION), "destination_already_exists_preserved")
        code, _ = git(MAIN, "show-ref", "--verify", "--quiet", "refs/heads/" + BRANCH, allowed=(0, 1))
        require(code == 1, "branch_already_exists_preserved")

        no_link_path(report_path, allow_missing=True)
        require(not os.path.lexists(report_path), "existing_report_preserved")
        report_path.parent.mkdir(mode=0o700, exist_ok=True)
        os.chmod(report_path.parent, 0o700)
        report_fd = os.open(str(report_path), os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        report.update({"source_files": len(final), "source_map_sha256": final_digest,
                       "accepted_candidate_files": len(accepted),
                       "candidate_changed_paths_observed": len(candidate_changes), "status": "creating_worktree"})
        git(MAIN, "worktree", "add", "-b", BRANCH, str(DESTINATION), BASE)
        verify_checkout(DESTINATION, BRANCH, clean=True)
        report["status"] = "copying_reviewed_source"
        copy_reviewed_source(bundle / "source", DESTINATION, final)
        require(changed_paths(DESTINATION) <= set(final), "new_worktree_has_unreviewed_changes")
        report["status"] = "staging_reviewed_source"
        paths = b"".join(name.encode("utf-8") + b"\0" for name in sorted(final))
        git(DESTINATION, "add", "--pathspec-from-file=-", "--pathspec-file-nul", input_bytes=paths)
        _, staged = git(DESTINATION, "diff", "--cached", "--name-only", "-z")
        staged_paths = {name.decode("utf-8") for name in staged.split(b"\0") if name}
        require(staged_paths and staged_paths <= set(final), "staged_paths_mismatch")
        _, deletions = git(DESTINATION, "diff", "--cached", "--name-only", "--diff-filter=D", "-z")
        require(not deletions, "unexpected_staged_deletion")
        require(changed_paths(DESTINATION) <= set(final), "new_worktree_has_unreviewed_changes")
        report.update({"status": "ready_for_review", "staged_files": len(staged_paths)})
        print("Veebi lähtekood on eraldi Git-tööpuus ette valmistatud ja staged.")
        print("Senine peapuu ja V2 kandidaat jäid skripti poolt muutmata. Commit ja push on tegemata.")
        print("Järgmine ülevaatus:")
        print("cd " + shlex.quote(str(DESTINATION)))
        print("git diff --cached --stat")
    except (PreparationError, OSError, UnicodeError) as exc:
        exit_code = 2
        code = str(exc) if isinstance(exc, PreparationError) else "local_operation_failed"
        report.update({"status": "stopped", "reason": code})
        print("Ettevalmistus peatus: " + code + ".", file=sys.stderr)
        if os.path.lexists(DESTINATION):
            print("Olemasolev uus tööpuu säilib; skript ei kirjuta seda korduskäiguga üle.", file=sys.stderr)
        print("Ära kustuta senist tööd ega käivita vana paigaldajat; saada see lühike tulemus vestlusesse.", file=sys.stderr)
    finally:
        if report_fd is not None:
            report["finished_at_utc"] = datetime.now(timezone.utc).isoformat()
            report["destination_exists"] = os.path.lexists(DESTINATION)
            with os.fdopen(report_fd, "w", encoding="utf-8") as handle:
                json.dump(report, handle, ensure_ascii=False, sort_keys=True, indent=2)
                handle.write("\n")
            print("Tulemuse fail: " + str(report_path))
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
