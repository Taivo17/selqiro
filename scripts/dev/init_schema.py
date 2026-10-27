"""Initialize the application schema once in a new, uniquely bound LOCAL database.

Services and credentials belong to the separate reusable development lifecycle.
This module never creates/restarts processes, clears data, imports an old runner,
changes an existing initialized schema, or grants auxiliary-finality proof.
The SQL callback must use psql ON_ERROR_STOP, a direct loopback PostgreSQL target
and the lifecycle's newly created local credentials. No remote DSN is accepted.
"""
import hashlib
import json
from pathlib import PurePosixPath
import uuid

from schema_compose import compile_schema

DB_NAME = "selqiro_publication_attempt_fixture"
SCHEMA_VERSION = 1


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def identity(run_id, data_directory):
    if str(uuid.UUID(run_id)) != run_id or uuid.UUID(run_id).int == 0:
        raise ValueError("Canonical new local environment UUID required")
    path = PurePosixPath(str(data_directory))
    if not path.is_absolute() or str(path) != str(data_directory) or ".." in path.parts:
        raise ValueError("Exact absolute local PostgreSQL data directory required")
    return run_id, str(path)


def verify_schema(run_id, expected_data_directory, sql_callback):
    """Read-only restart check, including the exact owner-image RPC permission."""
    run_id, directory = identity(run_id, expected_data_directory)
    output = sql_callback("""BEGIN READ ONLY;
SELECT json_build_object(
 'database',current_database(),
 'database_user',current_user,
 'data_directory',current_setting('data_directory'),
 'run_id',(SELECT run_id FROM selqiro_disposable_v2.run),
 'schema_version',(SELECT schema_version FROM selqiro_local_development.environment),
 'environment_id',(SELECT environment_id FROM selqiro_local_development.environment),
 'owner_media_authenticated',has_function_privilege('authenticated',
   'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'),
 'owner_media_anon',has_function_privilege('anon',
   'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'),
 'owner_media_service',has_function_privilege('service_role',
   'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'),
 'helper_api_closed',(SELECT bool_and(NOT has_function_privilege(role_name,
   'public.current_user_has_identity_access(uuid)','EXECUTE'))
   FROM unnest(ARRAY['anon','authenticated','service_role']) role_name));
COMMIT;
""")
    rows = [line for line in output.splitlines() if line.startswith("{")]
    if len(rows) != 1:
        raise RuntimeError("Local schema identity response unavailable")
    actual = json.loads(rows[0])
    expected = {"database": DB_NAME, "database_user": "postgres", "data_directory": directory,
                "run_id": run_id, "schema_version": SCHEMA_VERSION, "environment_id": run_id,
                "owner_media_authenticated": True, "owner_media_anon": False,
                "owner_media_service": False, "helper_api_closed": True}
    if actual != expected:
        raise RuntimeError("Local schema identity or exact owner-media permission differs")
    return actual


def initialize_schema(source_root, run_id, expected_data_directory, sql_callback):
    """Apply declarations only when public application/auth/storage data are empty.

    The fresh-state guard and all application DDL share one transaction. A later
    normal start must call verify_schema, never this initializer or a test runner.
    """
    run_id, directory = identity(run_id, expected_data_directory)
    body, sources = compile_schema(source_root)
    sql_hash = hashlib.sha256(body.encode()).hexdigest()
    input_map = {row["path"]: row["source_sha256"] for row in sources}
    source_hash = hashlib.sha256(json.dumps(input_map, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    guard = """BEGIN;
SELECT pg_advisory_xact_lock(hashtextextended('selqiro-local-development-initialize',0));
DO $fresh_local$ BEGIN
 IF current_database()<>%s OR current_user<>'postgres'
  OR current_setting('data_directory')<>%s
  OR inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet
  OR to_regnamespace('selqiro_disposable_v2') IS NOT NULL
  OR to_regnamespace('selqiro_local_development') IS NOT NULL
  OR to_regnamespace('listing_publication_private') IS NOT NULL
  OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','S','f'))
  OR to_regclass('auth.users') IS NULL OR to_regclass('auth.sessions') IS NULL
  OR to_regclass('storage.objects') IS NULL OR to_regclass('storage.s3_multipart_uploads') IS NULL
 THEN RAISE EXCEPTION 'new_empty_local_development_database_required'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM storage.objects)
  OR EXISTS(SELECT 1 FROM storage.buckets)
 THEN RAISE EXCEPTION 'local_initialization_cannot_adopt_existing_data'; END IF;
END $fresh_local$;
SET LOCAL selqiro.integration_scope='disposable-v2';
SET LOCAL selqiro.integration_run_id=%s;
""" % (literal(DB_NAME), literal(directory), literal(run_id))
    seal = """
CREATE SCHEMA selqiro_local_development;
REVOKE ALL ON SCHEMA selqiro_local_development FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE selqiro_local_development.environment(
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 environment_id uuid NOT NULL, schema_version integer NOT NULL,
 source_map_sha256 text NOT NULL, schema_sha256 text NOT NULL,
 initialized_at timestamptz NOT NULL DEFAULT clock_timestamp());
REVOKE ALL ON selqiro_local_development.environment FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO selqiro_local_development.environment(environment_id,schema_version,source_map_sha256,schema_sha256)
 VALUES(%s,%d,%s,%s);
COMMIT;
""" % (literal(run_id), SCHEMA_VERSION, literal(source_hash), literal(sql_hash))
    initialization_output = sql_callback(guard + body + seal)
    grant_observations = []
    for line in initialization_output.splitlines():
        if line.startswith("{"):
            value = json.loads(line)
            if "owner_media_grant_stage" in value:
                grant_observations.append(value)
    expected_observations = [
        {"owner_media_grant_stage": "after_closed_declaration", "authenticated": False,
         "anon": False, "service_role": False},
        {"owner_media_grant_stage": "after_retained_runtime_grant", "authenticated": True,
         "anon": False, "service_role": False},
    ]
    if grant_observations != expected_observations:
        raise RuntimeError("New local owner-media grant observation differs; preserve initialized data")
    verification = verify_schema(run_id, directory, sql_callback)
    return {"status": "LOCAL_DEVELOPMENT_SCHEMA_INITIALIZED", "schema_version": SCHEMA_VERSION,
            "run_id": run_id, "source_files": len(input_map), "source_map_sha256": source_hash,
            "schema_sha256": sql_hash, "verification": verification,
            "owner_media_grant_observations": grant_observations,
            "owner_media_grant_basis": "Retained runtime grant, not a diagnosed repair of any prior environment"}
