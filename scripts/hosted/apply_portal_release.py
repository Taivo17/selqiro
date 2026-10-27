#!/usr/bin/env python3
"""Prepare the selected existing Selqiro database and private Storage bucket.

Run on Taivo's Mac from the delivered source. No Git/deploy/env-file operations.
The pinned CLI validates three selected accounts before any cloud mutation.
Only the reviewed activation template admits all three atomically. Credentials stay in
memory; SQL scratch files and the small recovery journal are owner-private.

Verified CLI source: supabase/cli tag v2.117.0, commands/db/query/query.handler.ts
and commands/projects/api-keys/api-keys.handler.ts. Storage wire format matches
the installed @supabase/storage-js StorageBucketApi.ts createBucket/getBucket.
"""
import argparse
import base64
import datetime
import fcntl
import getpass
import hashlib
import json
import os
from pathlib import Path
import platform
import pwd
import re
import selectors
import signal
import ssl
import stat
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

PROJECT = "vyjletlmwoiwxsnsunlm"
INSTANCE = "2d088814-0900-448a-a9d1-7b05470cb1d2"
RELEASE = "listing-publication-hosted-preview-v1"
RELEASE_SHA = "974dd6acb246b275acb593688aa14449cd42e80939101086d742ee5c4c5a4c3e"
ACTIVATION_SHA = "0112cbcb6b74be0e041ece005bf045546740463ac7991ab7ef4b27a9ce510c2c"
ACTOR_SELECTION = "three-existing-accounts-v1"
ACTOR_COUNT = 3
PIN_SHA = "4bcf6c83e7518b18c1f871288a96e0a93652a12d7d4a15c91537dbe1e2e6a778"
BUCKET = {"id": "listing-publication-private", "name": "listing-publication-private",
          "public": False, "file_size_limit": 26214400,
          "allowed_mime_types": ["application/octet-stream", "image/webp"]}
API = "https://" + PROJECT + ".supabase.co"
MAX_OUTPUT = 256 * 1024
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
SAFE_SQL_ERRORS = frozenset("""
hosted_preview_activation_identity_mismatch hosted_preview_approved_existing_actor_required
hosted_preview_different_existing_allowlist_requires_review hosted_preview_existing_actor_identity_required
hosted_preview_trusted_activation_required hosted_preview_three_existing_actors_required
hosted_release_api_installer_membership_forbidden
hosted_release_baseline_history_required hosted_release_column_contract
hosted_release_exact_23_migration_baseline_required hosted_release_existing_auth_actor_read_required
hosted_release_existing_auth_reference_privilege_required hosted_release_existing_function
hosted_release_existing_function_required hosted_release_existing_listing_identity_required
hosted_release_existing_relation_required hosted_release_existing_rls_required
hosted_release_existing_storage_read_privilege_required hosted_release_forbidden_api_grant
hosted_release_helper_owner_contract hosted_release_install_context_mismatch
hosted_release_must_install_disabled hosted_release_price_fields_already_exist
hosted_release_private_schema_already_exists hosted_release_role_missing
hosted_release_trusted_installer_required hosted_release_verified_target_settings_required
hosted_release_writer_role_collision hosted_release_writer_role_contract
publication_hosted_preview_actor_forbidden publication_hosted_preview_disabled
publication_hosted_readiness_service_required publication_hosted_release_not_installed
publication_hosted_terminal_cleanup_unavailable
""".split())
SAFE_SQLSTATES = frozenset("42501 55000 42P01 42703 42710 42P07 23505 40001 40P01 57014 55P03 22023 22P02 3F000 42883 25006 0LP01 XX000".split())


class Stop(Exception):
    """Only a fixed, non-secret local error code may reach the terminal."""


def require(value, code):
    if not value:
        raise Stop(code)


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def selected_actor_set(values):
    require(isinstance(values, (list, tuple)) and len(values) == ACTOR_COUNT
            and all(isinstance(value, str) and UUID.fullmatch(value) for value in values)
            and len(set(values)) == ACTOR_COUNT, "THREE_DISTINCT_EXISTING_ACCOUNTS_REQUIRED")
    return tuple(sorted(values))


def select_accounts(db, journal):
    print("Valime sinu kolm juba olemasolevat Selqiro kontot uue funktsiooni kasutamiseks.", flush=True)
    print("See ei logi sind sisse. Veebis kasutad endiselt oma e-posti ja parooli.", flush=True)
    print("Pärast kolme aadressi sisestamist kontrollin kõik kontod ja jätkan päris Selqiro", flush=True)
    print("andmebaasi/pildikogu seadistusega. Uusi kontosid ega eraldi baasi ei looda.", flush=True)
    emails = []
    try:
        for index in range(ACTOR_COUNT):
            email = input("Olemasoleva konto " + str(index + 1) + "/3 e-post: ").strip()
            require(3 <= len(email) <= 254 and "@" in email
                    and not re.search(r"[\x00-\x20\x7f]", email), "ACCOUNT_EMAIL_INVALID")
            require(email.casefold() not in {value.casefold() for value in emails}, "DUPLICATE_ACCOUNT_EMAIL")
            emails.append(email)
        actors = selected_actor_set([db.account(email) for email in emails])
    finally:
        emails.clear()
    actor_hash = sha(canonical({"selection": ACTOR_SELECTION, "actors": actors}))
    require("actor_sha256" not in journal.data, "PREVIOUS_SINGLE_ACCOUNT_SELECTION_PRESERVED")
    previous = journal.data.get("actor_set_sha256")
    require(previous is not None or not journal.data.get("operations"), "RECOVERY_ACCOUNT_SET_REQUIRED")
    require(previous in (None, actor_hash), "RECOVERY_ACCOUNT_SET_MISMATCH")
    journal.data.update({"actor_set_sha256": actor_hash, "actor_count": ACTOR_COUNT,
                         "actor_selection": ACTOR_SELECTION})
    journal.save()
    return actors


def safe_diagnostic(raw):
    """Classify a bounded error in memory; never return matched text/snippets.

    A release label must follow an actual ERROR prefix, not appear in an echoed
    CREATE FUNCTION body. Every returned value comes from a fixed whitelist.
    """
    text = raw[:2 * MAX_OUTPUT].decode("utf-8", errors="replace").replace('\\"', '"')
    result = {}
    state = re.search(r"\b(?:SQLSTATE\s*[:=]?\s*|ERROR:\s*)([0-9A-Z]{5})\b", text)
    if state and state.group(1) in SAFE_SQLSTATES:
        result["sqlstate"] = state.group(1)
    label = re.search(r"\bERROR:\s*(?:[0-9A-Z]{5}:\s*)?([a-z][a-z0-9_]{1,100})\b", text)
    if label and label.group(1) in SAFE_SQL_ERRORS:
        result["release_error"] = label.group(1)
    categories = (
        (r"must be owner of (?:table|relation) [\"]?(?:storage\.)?objects\b", "storage_objects_policy_permission"),
        (r"permission denied for (?:table|relation) [\"]?(?:storage\.)?objects\b", "storage_objects_permission"),
        (r"permission denied for schema [\"]?auth\b", "auth_schema_permission"),
        (r"permission denied for schema [\"]?storage\b", "storage_schema_permission"),
        (r"permission denied for (?:table|relation) [\"]?(?:storage\.)?(?:buckets|s3_multipart_uploads|s3_multipart_uploads_parts)\b", "storage_metadata_permission"),
        (r"must have admin option on role\b", "role_membership_permission"),
        (r"permission denied to create role\b", "role_creation_permission"),
        (r"canceling statement due to statement timeout\b", "statement_timeout"),
        (r"canceling statement due to lock timeout\b", "lock_timeout"),
    )
    for pattern, category in categories:
        if re.search(pattern, text, re.IGNORECASE):
            result["category"] = category
            break
    return result


def regular(path, limit):
    require(path.is_absolute(), "ABSOLUTE_PATH_REQUIRED")
    cursor = Path(path.anchor)
    for part in path.parts[1:]:
        cursor = cursor / part
        require(not cursor.is_symlink(), "SYMLINK_PATH_REJECTED")
    info = path.stat()
    require(stat.S_ISREG(info.st_mode) and info.st_size <= limit, "FILE_KIND_OR_SIZE_INVALID")
    return path.read_bytes()


def private_dir(path):
    if not path.exists():
        path.mkdir(mode=0o700)
    require(not path.is_symlink() and path.is_dir(), "PRIVATE_DIRECTORY_INVALID")
    info = path.stat()
    require(info.st_uid == os.getuid() and not info.st_mode & 0o077,
            "PRIVATE_DIRECTORY_PERMISSIONS_REQUIRED")


class Journal:
    def __init__(self, directory):
        self.directory = directory
        self.path = directory / "prepare-report.json"
        lock_fd = os.open(directory / "prepare.lock", os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        self.lock = os.fdopen(lock_fd, "a", encoding="utf-8")
        lock_info = os.fstat(lock_fd)
        require(stat.S_ISREG(lock_info.st_mode) and lock_info.st_uid == os.getuid()
                and not lock_info.st_mode & 0o077, "JOURNAL_LOCK_INVALID")
        try:
            fcntl.flock(self.lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise Stop("ANOTHER_PREPARATION_IS_RUNNING") from None
        target = {"project_ref": PROJECT, "instance_id": INSTANCE,
                  "release_id": RELEASE, "release_sha256": RELEASE_SHA}
        if self.path.exists():
            self.data = json.loads(regular(self.path, 1024 * 1024))
            require(self.data.get("format") == "selqiro-existing-portal-preparation-v1"
                    and self.data.get("target") == target, "RECOVERY_JOURNAL_TARGET_MISMATCH")
        else:
            self.data = {"format": "selqiro-existing-portal-preparation-v1", "target": target,
                         "operations": {}, "runs": [], "cloud_web_deployed": False}
        self.run = {"started_at_utc": now(), "status": "running", "stage": "local_guards",
                    "commands": []}
        self.data["runs"].append(self.run)
        self.save()

    def save(self):
        fd, name = tempfile.mkstemp(prefix=".report-", dir=self.directory)
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(json.dumps(self.data, ensure_ascii=False, indent=2).encode() + b"\n")
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(name, self.path)
        finally:
            if os.path.exists(name):
                os.unlink(name)

    def stage(self, name, message):
        self.run["stage"] = name
        self.save()
        print(message, flush=True)

    def begin(self, name):
        previous = self.data["operations"].get(name)
        require(previous is None, "UNRESOLVED_OR_PREVIOUS_MUTATION_MUST_NOT_REPEAT")
        self.data["operations"][name] = {"status": "outcome_unverified", "started_at_utc": now()}
        self.save()

    def verified(self, name, existing=False):
        self.data["operations"][name] = {"status": "verified", "verified_at_utc": now(),
                                         "already_present": existing}
        self.save()


def process(journal, label, argv, cwd, env):
    """Bound both streams; discard diagnostics without displaying/recording them."""
    row = {"stage": label, "status": "running", "exit_code": None}
    journal.run["commands"].append(row)
    journal.save()
    output = bytearray()
    diagnostics = bytearray()
    counts = {"stdout": 0, "stderr": 0}
    child = None
    try:
        child = subprocess.Popen(argv, cwd=str(cwd), env=env, stdin=subprocess.DEVNULL,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 start_new_session=True)
        deadline = time.monotonic() + 50
        with selectors.DefaultSelector() as selector:
            selector.register(child.stdout, selectors.EVENT_READ, "stdout")
            selector.register(child.stderr, selectors.EVENT_READ, "stderr")
            while selector.get_map():
                require(time.monotonic() < deadline, "CLI_TIMEOUT_OUTCOME_UNVERIFIED")
                for key, _ in selector.select(0.2):
                    block = os.read(key.fileobj.fileno(), 65536)
                    if not block:
                        selector.unregister(key.fileobj)
                        continue
                    counts[key.data] += len(block)
                    require(counts[key.data] <= MAX_OUTPUT, "CLI_OUTPUT_LIMIT")
                    if key.data == "stdout":
                        output.extend(block)
                    else:
                        diagnostics.extend(block)
            child.wait(timeout=max(0.01, deadline - time.monotonic()))
        row["exit_code"] = child.returncode
        require(child.returncode == 0, "CLI_EXECUTION_FAILED")
        row["status"] = "ok"
        return bytes(output)
    finally:
        if child is not None:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGKILL)
                child.wait(timeout=2)
            row["exit_code"] = child.returncode
            child.stdout.close()
            child.stderr.close()
        if row["status"] != "ok":
            row["status"] = "failed_no_raw_output_exported"
            row["diagnostic"] = safe_diagnostic(bytes(diagnostics) + b"\n" + bytes(output))
        row["stdout_bytes"], row["stderr_bytes"] = counts["stdout"], counts["stderr"]
        journal.save()


def clean_env(home, sidecar=None):
    env = {k: os.environ[k] for k in ("PATH", "USER", "LOGNAME", "LANG", "LC_ALL", "LC_CTYPE",
                                    "TMPDIR", "SSH_AUTH_SOCK") if k in os.environ}
    env.update({"HOME": str(home), "NO_COLOR": "1", "TERM": "dumb", "GIT_OPTIONAL_LOCKS": "0",
                "GIT_TERMINAL_PROMPT": "0"})
    if sidecar:
        env.update({"SUPABASE_GO_BINARY": str(sidecar), "SUPABASE_TELEMETRY_DISABLED": "1",
                    "SUPABASE_NO_UPDATE_NOTIFIER": "1", "DO_NOT_TRACK": "1"})
        for key in ("SUPABASE_ACCESS_TOKEN", "SUPABASE_DB_PASSWORD"):
            if key in os.environ:
                env[key] = os.environ[key]
    return env


def quoted(value):
    return "'" + value.replace("'", "''") + "'"


class Database:
    def __init__(self, journal, cli, repository, env):
        self.journal, self.repository, self.env = journal, repository, env
        self.prefix = [str(cli), "--workdir", str(repository), "--profile", "supabase", "--agent", "no",
                       "--output", "json"]

    def execute(self, label, sql):
        # The CLI sends the whole file unchanged in one Management API request.
        with tempfile.TemporaryDirectory(prefix="sql-", dir=self.journal.directory) as folder:
            path = Path(folder) / "operation.sql"
            path.write_text(sql, encoding="utf-8")
            return process(self.journal, label, self.prefix + ["--output-format", "json", "db", "query", "--linked",
                           "--project-ref", PROJECT, "--file", str(path)], self.repository, self.env)

    def read(self, label, expression):
        sql = ("BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='3s';\n"
               + expression + "\nROLLBACK;\n")
        rows = json.loads(self.execute(label, sql))
        require(type(rows) is list and len(rows) == 1 and type(rows[0]) is dict
                and set(rows[0]) == {"result"} and type(rows[0]["result"]) is dict,
                "DATABASE_RESPONSE_SHAPE_INVALID")
        return rows[0]["result"]

    def state(self, actors):
        actors = selected_actor_set(actors)
        shape = self.read("release_presence", """SELECT jsonb_build_object(
 'actor',current_user,'session_actor',session_user,
 'publication',to_regnamespace('listing_publication_private') IS NOT NULL,
 'contact',to_regnamespace('listing_contact_private') IS NOT NULL,
 'settings',to_regclass('listing_publication_private.hosted_preview_settings') IS NOT NULL
) AS result;""")
        require(shape.get("actor") == shape.get("session_actor") == "postgres", "TRUSTED_DATABASE_ACTOR_REQUIRED")
        if shape.get("publication") is False and shape.get("contact") is False and shape.get("settings") is False:
            return None
        require(all(shape.get(k) is True for k in ("publication", "contact", "settings")),
                "PARTIAL_OR_DIFFERENT_RELEASE_PRESERVED")
        actor_match = ("(SELECT count(*) FROM listing_publication_private.hosted_preview_actors WHERE actor_user_id IN ("
                       + ",".join(quoted(actor) + "::uuid" for actor in actors) + "))")
        value = self.read("release_identity", """SELECT jsonb_build_object(
 'settings_count',(SELECT count(*) FROM listing_publication_private.hosted_preview_settings),
 'settings',(SELECT jsonb_build_object('project_ref',project_ref,'release_id',release_id,
 'instance_id',instance_id,'enabled',enabled,'release_ready',release_ready,
 'storage_authority_version',storage_authority_version)
 FROM listing_publication_private.hosted_preview_settings WHERE singleton),
 'actor_count',(SELECT count(*) FROM listing_publication_private.hosted_preview_actors),
 'matching_actor_count',""" + actor_match + """,
 'bucket_ready',listing_publication_private.hosted_storage_contract_ready()) AS result;""")
        config = value.get("settings")
        require(value.get("settings_count") == 1 and type(config) is dict
                and config.get("project_ref") == PROJECT and config.get("instance_id") == INSTANCE
                and config.get("release_id") == RELEASE and config.get("release_ready") is True
                and config.get("storage_authority_version") == "source-part-rfc3986-v1"
                and type(config.get("enabled")) is bool and type(value.get("actor_count")) is int,
                "EXISTING_RELEASE_IDENTITY_MISMATCH")
        require(type(value.get("matching_actor_count")) is int
                and value["actor_count"] in (0, ACTOR_COUNT)
                and value["matching_actor_count"] == value["actor_count"], "DIFFERENT_ALLOWLIST_PRESERVED")
        return value

    def account(self, email):
        # UTF-8 hex prevents email text from becoming SQL syntax even if the
        # remote session has nondefault string-literal settings.
        email_sql = "convert_from(decode('" + email.encode().hex() + "','hex'),'UTF8')"
        value = self.read("selected_account", """WITH selected AS (
 SELECT u.id,p.active_identity_id FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id
 WHERE lower(u.email)=lower(""" + email_sql + """)), available AS (
 SELECT s.id FROM selected s JOIN public.identities i ON i.id=s.active_identity_id
 WHERE i.status='active' AND ((i.type='private' AND i.user_id=s.id) OR
 (i.type='business' AND EXISTS(SELECT 1 FROM public.business_members m
 WHERE m.business_account_id=i.business_account_id AND m.user_id=s.id AND m.status='active'))))
 SELECT jsonb_build_object('matches',(SELECT count(*) FROM selected),
 'actor_id',(SELECT id FROM selected LIMIT 1),'identity_ready',EXISTS(SELECT 1 FROM available)) AS result;""")
        require(value.get("matches") == 1 and value.get("identity_ready") is True
                and type(value.get("actor_id")) is str and UUID.fullmatch(value["actor_id"]),
                "EXISTING_ACCOUNT_AND_ACTIVE_IDENTITY_REQUIRED")
        return value["actor_id"]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        raise Stop("STORAGE_REDIRECT_REJECTED")


def http(method, path, key, body=None):
    require(path in ("/storage/v1/bucket", "/storage/v1/bucket/" + BUCKET["id"],
                     "/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1"), "HTTP_PATH_REJECTED")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                                        urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    data = canonical(body) if body is not None else None
    request = urllib.request.Request(API + path, data=data, method=method,
                                      headers={"apikey": key, "Authorization": "Bearer " + key,
                                               "Content-Type": "application/json", "Accept": "application/json"})
    try:
        with opener.open(request, timeout=25) as response:
            status = response.status
            raw = response.read(65537)
    except urllib.error.HTTPError as error:
        status = error.code
        raw = error.read(65537)
        error.close()
    except Stop:
        raise
    except (OSError, urllib.error.URLError, TimeoutError):
        raise Stop("STORAGE_CONNECTION_FAILED_OUTCOME_UNVERIFIED") from None
    require(len(raw) <= 65536, "STORAGE_RESPONSE_LIMIT")
    try:
        value = json.loads(raw)
    except (UnicodeError, ValueError):
        value = None
    return status, value


def legacy_key(value, role):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", value) or len(value) > 8192:
        return False
    try:
        parts = value.split(".")
        decode = lambda p: json.loads(base64.urlsafe_b64decode(p + "=" * (-len(p) % 4)))
        header, claims = decode(parts[0]), decode(parts[1])
        return (type(header) is dict and type(claims) is dict and header.get("alg") == "HS256"
                and claims.get("role") == role and claims.get("ref") == PROJECT
                and type(claims.get("exp")) is int and claims["exp"] > time.time())
    except (ValueError, UnicodeError, TypeError):
        return False


def service_key(db):
    rows = json.loads(process(db.journal, "project_api_keys", db.prefix + ["projects", "api-keys",
                             "--project-ref", PROJECT], db.repository, db.env))
    require(type(rows) is list and len(rows) <= 100 and all(type(r) is dict for r in rows),
            "PROJECT_KEYS_RESPONSE_INVALID")
    candidates = [r.get("api_key") for r in rows if r.get("name") == "service_role"]
    valid = [value for value in candidates if legacy_key(value, "service_role")]
    anon = [r.get("api_key") for r in rows if r.get("name") == "anon"]
    require(not anon or (len(anon) == 1 and legacy_key(anon[0], "anon")), "LEGACY_ANON_KEY_TARGET_MISMATCH")
    require(len(valid) <= 1, "MULTIPLE_SERVICE_KEYS_REJECTED")
    if valid:
        return valid[0]
    require(not candidates or all(value is None for value in candidates), "LEGACY_SERVICE_KEY_TARGET_MISMATCH")
    print("CLI ei tagastanud legacy service_role võtit. Kopeeri see sama projekti API seadetest.", flush=True)
    value = getpass.getpass("Legacy service_role võti (ei kuvata ega salvestata): ")
    require(legacy_key(value, "service_role"), "LEGACY_SERVICE_KEY_TARGET_MISMATCH")
    return value


def missing_bucket(status, value):
    """Storage may send semantic 404 as HTTP 400. Match only NoSuchBucket.

    The reviewed provider error mapper uses userStatusCode=400 and body
    statusCode='404'. Other 404s, notably TenantNotFound, never mean that this
    bucket may be created. A precise older body without a code is also accepted.
    """
    if status not in (400, 404) or type(value) is not dict:
        return False
    semantic_404 = value.get("statusCode") in ("404", 404)
    if value.get("code") == "NoSuchBucket":
        return semantic_404 or (status == 404 and "statusCode" not in value)
    return ("code" not in value and semantic_404 and value.get("error") == "Bucket not found"
            and value.get("message") == "Bucket not found")


def bucket_state(key):
    status, value = http("GET", "/storage/v1/bucket/" + BUCKET["id"], key)
    if missing_bucket(status, value):
        return False
    require(status == 200 and type(value) is dict, "BUCKET_READ_FAILED")
    require(value.get("id") == BUCKET["id"] and value.get("name") == BUCKET["name"]
            and value.get("public") is False and type(value.get("file_size_limit")) is int
            and value["file_size_limit"] == BUCKET["file_size_limit"]
            and type(value.get("allowed_mime_types")) is list
            and sorted(value["allowed_mime_types"]) == sorted(BUCKET["allowed_mime_types"]),
            "EXISTING_BUCKET_CONFIG_PRESERVED")
    return True


def transaction(body, actors=None):
    selected = selected_actor_set(actors) if actors is not None else None
    return ("BEGIN; SET LOCAL statement_timeout='40s'; SET LOCAL lock_timeout='5s';\n"
            + "SET LOCAL selqiro.hosted_preview_project_ref=" + quoted(PROJECT) + ";\n"
            + "SET LOCAL selqiro.hosted_preview_instance_id=" + quoted(INSTANCE) + ";\n"
            + ("SET LOCAL selqiro.hosted_preview_actor_ids=" + quoted(",".join(selected)) + ";\n" if selected else "")
            + body + "\nCOMMIT;\n")


def prepare(journal, home):
    source = Path(__file__).resolve().parents[2]
    target = json.loads(regular(source / "scripts/hosted/portal-target.json", 16384))
    require(target.get("project_ref") == PROJECT and target.get("instance_id") == INSTANCE
            and target.get("release_id") == RELEASE and target.get("release_sha256") == RELEASE_SHA
            and target.get("activation_sha256") == ACTIVATION_SHA and target.get("cli_pin_sha256") == PIN_SHA
            and target.get("actor_selection") == ACTOR_SELECTION and target.get("actor_count") == ACTOR_COUNT
            and target.get("region") == "eu-central-1" and target.get("app_origin") == "https://selqiro.vercel.app"
            and target.get("bucket") == BUCKET, "TARGET_MANIFEST_MISMATCH")
    release_dir = source / "supabase/releases" / RELEASE
    release = regular(release_dir / "release.sql", 1024 * 1024)
    activation = regular(release_dir / "activate.template.sql", 16384)
    require(sha(release) == RELEASE_SHA and sha(activation) == ACTIVATION_SHA, "REVIEWED_SQL_HASH_MISMATCH")
    access = json.loads(regular(source / "docs/continuity/SERVICE_ACCESS.json", 128 * 1024))
    pin = access["supabase"]["cli_pin"]
    require(sha(canonical(pin)) == PIN_SHA and len(pin["files"]) == 5, "PRESERVED_CLI_PIN_MISMATCH")
    cache = home / pin["cache_relative"]
    for name, expected in pin["files"].items():
        data = regular(cache / name, expected["bytes"])
        require(len(data) == expected["bytes"] and sha(data) == expected["sha256"], "CLI_FIVE_FILE_PIN_MISMATCH")
    cli, sidecar = cache / pin["entrypoint"], cache / pin["sidecar"]
    require(os.access(cli, os.X_OK) and os.access(sidecar, os.X_OK), "PINNED_CLI_NOT_EXECUTABLE")
    repository = home / "selqiro"
    require(repository.is_dir() and not repository.is_symlink(), "EXISTING_REPOSITORY_REQUIRED")
    env = clean_env(home, sidecar)
    git = lambda *args: process(journal, "repository_guard", ["git", "-C", str(repository), *args], repository, clean_env(home)).decode().strip()
    require(git("rev-parse", "--show-toplevel") == str(repository), "REPOSITORY_ROOT_MISMATCH")
    require(git("config", "--get", "remote.origin.url") in
            ("https://github.com/Taivo17/selqiro.git", "git@github.com:Taivo17/selqiro.git"), "APPROVED_REMOTE_REQUIRED")
    require(regular(repository / "supabase/.temp/project-ref", 128).strip() == PROJECT.encode(),
            "EXISTING_SUPABASE_LINK_MISMATCH")
    db = Database(journal, cli, repository, env)
    journal.stage("selected_accounts", "1/4 Kontrollin kolme olemasolevat portaali kontot ja paigalduse seisu.")
    actors = select_accounts(db, journal)
    state = db.state(actors)
    key = service_key(db)
    bucket_exists = bucket_state(key)

    journal.stage("release_install", "2/4 Paigaldan valmis SQL-release’i või kinnitan sama lõpetatud paigalduse.")
    if state is None:
        journal.begin("release_install")
        db.execute("release_install", transaction(release.decode()))
        state = db.state(actors)
        require(state is not None and state["settings"]["enabled"] is False and state["actor_count"] == 0,
                "INSTALLATION_READBACK_FAILED")
        journal.verified("release_install")
    else:
        journal.verified("release_install", existing=True)

    journal.stage("bucket_create", "3/4 Loon 25 MiB piiriga privaatse pildikogu või kontrollin selle seniseid seadeid.")
    if not bucket_exists:
        journal.begin("bucket_create")
        status, _ = http("POST", "/storage/v1/bucket", key, BUCKET)
        require(status in (200, 201), "BUCKET_CREATE_FAILED_OUTCOME_UNVERIFIED")
        require(bucket_state(key), "BUCKET_CREATE_READBACK_FAILED")
        journal.verified("bucket_create")
    else:
        journal.verified("bucket_create", existing=True)

    journal.stage("actor_activate", "4/4 Avan uue avaldamisvoo sinu kolmele olemasolevale kontole.")
    state = db.state(actors)
    require(state is not None and state.get("bucket_ready") is True, "DATABASE_BUCKET_CONTRACT_NOT_READY")
    if state["settings"]["enabled"]:
        require(state["actor_count"] == ACTOR_COUNT and state.get("matching_actor_count") == ACTOR_COUNT,
                "ENABLED_ACTOR_SET_MISMATCH")
        journal.verified("actor_activate", existing=True)
    else:
        journal.begin("actor_activate")
        db.execute("actor_activate", transaction(activation.decode(), actors))
        state = db.state(actors)
        require(state is not None and state["settings"]["enabled"] is True
                and state["actor_count"] == ACTOR_COUNT and state.get("matching_actor_count") == ACTOR_COUNT,
                "ACTIVATION_READBACK_FAILED")
        journal.verified("actor_activate")
    for actor in actors:
        status, ready = http("POST", "/rest/v1/rpc/get_selqiro_hosted_preview_readiness_v1", key,
                             {"p_expected_project_ref": PROJECT, "p_expected_release_id": RELEASE,
                              "p_expected_instance_id": INSTANCE, "p_expected_user_id": actor})
        expected = {"schema_version": 1, "scope": "hosted-preview-v1", "storage_contract": "supabase-s3-session-v1",
                    "cleanup_mode": "held", "project_ref": PROJECT, "release_id": RELEASE, "instance_id": INSTANCE,
                    "enabled": True, "actor_user_id": actor, "actor_allowed": True}
        require(status == 200 and ready == expected, "HTTP_READINESS_NOT_CONFIRMED")
    journal.run.update({"status": "complete", "finished_at_utc": now(), "readiness_confirmed": True,
                        "readiness_account_count": ACTOR_COUNT})
    journal.save()
    print("VALMIS: andmebaasi release, privaatne pildikogu ja kõigi kolme konto avaldamisõigus on kontrollitud.")
    print("Järgmine samm: Verceli Production seadistus ning valmis lähtekoodi GitHubi saatmine.")
    print("Selle käsuga ei tehtud Git push’i ega Verceli deploy’d. Hosted lõppkoristus jääb ootele.")


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    journal = None
    try:
        require(sys.version_info >= (3, 9), "PYTHON_3_9_REQUIRED")
        require(platform.system() == "Darwin" and platform.machine().lower() == "arm64", "TAIVO_MAC_ARM64_REQUIRED")
        home = Path(pwd.getpwuid(os.getuid()).pw_dir)
        require(str(home) == "/Users/taivo" and os.environ.get("HOME") == str(home), "EXISTING_TAIVO_HOME_REQUIRED")
        require(sys.stdin.isatty(), "INTERACTIVE_MAC_TERMINAL_REQUIRED")
        os.umask(0o077)
        parent = home / "Library/Application Support/Selqiro"
        require(parent.is_dir() and not parent.is_symlink(), "EXISTING_SELQIRO_SUPPORT_DIRECTORY_REQUIRED")
        folder = parent / "hosted-publication"
        private_dir(folder)
        folder = folder / INSTANCE
        private_dir(folder)
        journal = Journal(folder)
        prepare(journal, home)
        code = 0
    except (Stop, KeyboardInterrupt, Exception) as error:
        code = 1
        safe_code = str(error) if isinstance(error, Stop) else ("INTERRUPTED" if isinstance(error, KeyboardInterrupt) else "LOCAL_OR_RESPONSE_ERROR")
        if journal:
            journal.run.update({"status": "stopped", "error_code": safe_code, "finished_at_utc": now()})
            journal.save()
        print("PEATATUD: " + safe_code, file=sys.stderr)
        print("Toimingut ei korratud automaatselt. Saada väike prepare-report.json raport; võtmeid ega kontoandmeid see ei sisalda.", file=sys.stderr)
        if journal and any(x.get("status") == "outcome_unverified" for x in journal.data["operations"].values()):
            print("Ühe pilvetoimingu lõpptulemus on veel kinnitamata. Ära korda SQL-i ega muuda päevikut käsitsi.", file=sys.stderr)
    if journal:
        print("Raport: " + str(journal.path))
    return code


if __name__ == "__main__":
    sys.exit(main())
