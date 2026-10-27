#!/usr/bin/env python3
"""Pure, additive hosted SQL composition. Never opens a database or a network.

The local lab files are provenance sources, not executable installers. Only the
explicit declarations below are selected. Historical migrations, fixtures,
local cluster markers, seeds and local setup programs are never executed.
Every adaptation is counted and recorded alongside source/output hashes.
Run from any directory: python3 scripts/hosted/compose_publication_release.py
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "supabase/releases/listing-publication-hosted-preview-v1"
PIN_PATH = OUT / "source-pins.json"
PINS = json.loads(PIN_PATH.read_text())
PROVENANCE: list[dict] = []
LAB = "supabase/labs/"


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def read(relative: str) -> str:
    path = ROOT / relative
    if path.is_symlink() or not path.is_file():
        raise ValueError("Missing regular source file: " + relative)
    content = path.read_text()
    if sha(content) != PINS.get(relative):
        raise ValueError("Reviewed source hash changed: " + relative)
    return content


def function_span(content: str, qualified: str) -> tuple[int, int]:
    schema, name = qualified.split(".")
    identifier = r'(?:"' + schema + r'"\."' + name + r'"|' + re.escape(qualified) + r')'
    matches = list(re.finditer(r'\bCREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+' + identifier + r'\s*\(', content, re.I))
    if len(matches) != 1:
        raise ValueError("Expected one function: " + qualified)
    start = matches[0].start()
    body = re.search(r'\bAS\s+(\$[A-Za-z0-9_]*\$)', content[start:], re.I)
    if not body:
        raise ValueError("No function delimiter: " + qualified)
    end = content.index(body.group(1), start + body.end()) + len(body.group(1))
    return start, content.index(";", end) + 1


class Selection:
    def __init__(self, relative: str, qualified: str | None = None):
        self.relative = relative
        raw = read(relative)
        self.record = {"path": relative, "source_sha256": sha(raw), "adaptations": []}
        if qualified:
            start, end = function_span(raw, qualified)
            self.text = raw[start:end]
            self.record.update(selection="one function", function=qualified,
                               selected_sha256=sha(self.text))
        else:
            self.text = raw
            self.record.update(selection="declaration file", selected_sha256=sha(raw))

    def replace(self, old: str, new: str, reason: str, count: int = 1):
        if self.text.count(old) != count:
            raise ValueError(f"Exact adaptation no longer matches ({reason}): {self.relative}")
        self.text = self.text.replace(old, new)
        self.record["adaptations"].append({"reason": reason, "count": count,
            "before_sha256": sha(old), "after_sha256": sha(new)})
        return self

    def replace_function(self, qualified: str, new: str, reason: str):
        start, end = function_span(self.text, qualified)
        return self.replace(self.text[start:end], new, reason)

    def gate(self, suffix: str = ""):
        match = re.search(r'DO \$gate\$.*?END \$gate\$;', self.text, re.S)
        if not match:
            raise ValueError("Expected exact fixture installation gate: " + self.relative)
        return self.replace(match.group(),
            "DO $gate$ BEGIN\n PERFORM listing_publication_private.assert_hosted_install_context();\n"
            + suffix + "END $gate$;", "replace top-level fixture-only installation gate with trusted additive target gate; preserve runtime invariants")

    def render(self) -> str:
        # auth schema USAGE in the hosted snapshot has no grant option. The
        # application wrapper returns exactly auth.uid() under postgres' existing
        # access. Dedicated writers get no new auth schema/table privilege.
        calls = self.text.count("auth.uid()")
        if calls:
            self.replace("auth.uid()", "public.listing_actor_uid_hosted_v1()",
                "route retained current-actor calls/grants through postgres-owned self-UID wrapper; no managed Auth privilege expansion", calls)
        for match in list(re.finditer(r'GRANT USAGE ON SCHEMA ([a-z_,]+) TO ([a-z0-9_]+);', self.text)):
            schemas = match.group(1).split(",")
            if "auth" in schemas:
                self.replace(match.group(), "GRANT USAGE ON SCHEMA " + ",".join(s for s in schemas if s != "auth") + " TO " + match.group(2) + ";",
                    "remove unsupported Auth schema regrant; actor wrapper uses already held postgres access")
        self.record["output_sha256"] = sha(self.text)
        PROVENANCE.append(self.record)
        return "-- Retained declaration source: " + self.relative + "\n" + self.text


def selected(relative: str, name: str) -> Selection:
    return Selection(relative, "public." + name)


def full(relative: str, gate: bool = False) -> Selection:
    value = Selection(relative)
    return value.gate() if gate else value


def actor_gate(value: Selection, actor: str) -> Selection:
    start, end = function_span(value.text, value.record.get("function", "public.lock_listing_creation_actor_v1"))
    body = value.text[start:end]
    if body.count("\nBEGIN\n") != 1:
        raise ValueError("Actor function BEGIN changed")
    return value.replace(body, body.replace("\nBEGIN\n", "\nBEGIN\n PERFORM listing_publication_private.assert_hosted_preview_actor(" + actor + ");\n", 1),
        "gate independently of client/runtime flags before locking the existing actor")


def write(name: str, chunks: list[str]):
    body = "-- GENERATED by scripts/hosted/compose_publication_release.py; review source-provenance.json.\n\n" + "\n\n".join(chunks) + "\n"
    (OUT / name).write_text(body)


def price_core():
    fixture = LAB + "listing-publication-attempt-v1/tests/fixture.generated.sql"
    chunks = ["SELECT listing_publication_private.assert_hosted_install_context();"]
    for name in ("listing_price_currency_scale_v1", "normalize_listing_price_v1", "normalize_listing_basics_v1",
                 "listing_create_category_path_valid_v1", "require_listing_create_keys_v1",
                 "normalize_listing_create_location_v1", "normalize_listing_creation_v1", "lock_listing_creation_actor_v1"):
        value = selected(fixture, name)
        if name == "lock_listing_creation_actor_v1":
            actor_gate(value, "actor")
        chunks.append(value.render())
    chunks.append("""-- Existing rows retain their raw price. No historical row is rewritten.
ALTER TABLE public.listings ADD COLUMN price_kind text, ADD COLUMN currency text,
 ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;
CREATE ROLE selqiro_listing_price_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
 NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- PG17 grants the nonsuperuser creator ADMIN with the bootstrap grantor.
-- Preserve that provenance; add only SET/INHERIT in this installer's grant.
GRANT selqiro_listing_price_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;
""")
    price = LAB + "listing-publication-final-v1/tests/fixture-extension.generated.sql"
    for name in ("listing_price_legacy_label_v1", "listing_price_tuple_valid_v1", "listing_price_snapshot_v1",
                 "listing_basics_values_v1", "listing_basics_snapshot_v1", "listing_basics_search_text_v1", "guard_listing_price_v2"):
        chunks.append(selected(price, name).render())
    chunks.append("""ALTER TABLE public.listings ADD CONSTRAINT listings_price_tuple_v1_check
 CHECK(public.listing_price_tuple_valid_v1(price_kind,price_amount,currency,price_revision,price) IS TRUE);
CREATE TRIGGER trg_listing_price_guard_v2 BEFORE INSERT OR UPDATE OR DELETE ON public.listings
 FOR EACH ROW EXECUTE FUNCTION public.guard_listing_price_v2();
CREATE TRIGGER trg_listing_price_truncate_guard_v2 BEFORE TRUNCATE ON public.listings
 FOR EACH STATEMENT EXECUTE FUNCTION public.guard_listing_price_v2();""")
    write("10_price_core.sql", chunks)


def publication_core():
    chunks = []
    files = (
        "listing-publication-attempt-v1/01_private_state.sql",
        "listing-publication-attempt-v1/02_values_and_policy.sql",
        "listing-publication-attempt-v1/03_owner_attempt.sql",
        "listing-publication-attempt-v1/04_upload_dispatch.sql",
        "listing-publication-attempt-v1/05_close_attempt.sql",
        "listing-publication-upload-v1/01_upload_grants.sql",
        "listing-publication-web-v1/01_web_receipts.sql",
        "listing-publication-web-v1/02_close_write_fence.sql",
        "listing-publication-final-v1/01_state.sql",
        "listing-publication-final-v1/02_listing_writer.generated.sql",
        "listing-publication-final-v1/03_final_and_delete.sql",
        "listing-publication-final-v1/04_guards.sql",
        "listing-publication-final-v1/05_cleanup.sql",
        "listing-publication-final-v1/06_authority.sql",
        "listing-publication-final-v1/07_budget.generated.sql",
        "listing-publication-write-completion-v1/01_web_completion.sql",
        "listing-publication-write-reconcile-v1/01_reconcile.sql",
        "listing-publication-source-no-release-v1/01_source_no_release.sql",
        "listing-publication-source-release-v1/01_release_ledger.sql",
    )
    for name in files:
        value = full(LAB + name)
        if "DO $gate$" in value.text:
            value.gate()
        if name.endswith("/01_private_state.sql"):
            value.replace("CREATE SCHEMA listing_publication_private;", "-- Private schema bootstrapped by 00_preconditions.sql.",
                          "avoid recreating the already closed additive release settings schema")
        if name == "listing-publication-upload-v1/01_upload_grants.sql":
            value.replace_function("listing_publication_private.require_upload_service", """CREATE FUNCTION listing_publication_private.require_upload_service() RETURNS void LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 IF current_setting('role',true)='service_role' THEN RETURN; END IF;
 RAISE EXCEPTION 'publication_upload_service_required' USING ERRCODE='42501';
END $f$;""", "retain actual SQL service-role check; remove local postgres/fixture exception")
        if name == "listing-publication-final-v1/01_state.sql":
            value.replace("GRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN TRUE;\nGRANT selqiro_listing_final_writer_v1 TO postgres WITH INHERIT TRUE;\nGRANT selqiro_listing_final_writer_v1 TO postgres WITH SET TRUE;",
                "-- ADMIN is the PG17 automatic creator grant; preserve its bootstrap grantor.\nGRANT selqiro_listing_final_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;",
                "nonsuperuser PG17 creator retains automatic ADMIN and adds only needed SET/INHERIT membership")
        if name == "listing-publication-final-v1/02_listing_writer.generated.sql":
            value.replace("current_user='selqiro_listing_final_writer_v1' AND EXISTS(\n      SELECT 1 FROM listing_publication_private.publications p\n      WHERE p.listing_id=OLD.id AND p.state='deleting')",
                "current_user='selqiro_listing_final_writer_v1'\n      AND public.listing_final_guard_state_v1(OLD.id)='deleting'",
                "use the closed state classifier in the invoker trigger; do not require API SELECT on a private ledger even for legacy DELETE")
        if name == "listing-publication-final-v1/04_guards.sql":
            value.replace_function("public.listing_final_guard_state_v1", """CREATE FUNCTION public.listing_final_guard_state_v1(p_listing bigint) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,auth,pg_temp AS $f$
DECLARE managed text;
BEGIN
 SELECT state INTO managed FROM listing_publication_private.publications WHERE listing_id=p_listing;
 IF managed IS NOT NULL THEN
  PERFORM listing_publication_private.assert_hosted_preview_actor(auth.uid());
 END IF;
 RETURN managed;
END $f$;""", "gate managed row mutations reached through old direct SQL writes, while preserving unmanaged legacy writes")
        if name == "listing-publication-write-reconcile-v1/01_reconcile.sql":
            start = value.text.index("GRANT USAGE ON SCHEMA storage TO selqiro_listing_final_writer_v1;")
            end = value.text.index("CREATE FUNCTION listing_publication_private.protect_write_settlement", start)
            block = value.text[start:end]
            if block.count("CREATE POLICY") != 1 or block.count("GRANT SELECT") != 1:
                raise ValueError("Unexpected legacy WEB witness authority block")
            value.replace(block, "-- Bounded hosted_storage_objects view supplies the read witness.\n\n",
                "remove native WEB witness managed-table policy/grant; use the application-owned read-only view")
            calls = value.text.count("storage.objects")
            value.replace("storage.objects", "listing_publication_private.hosted_storage_objects",
                "route retained WEB metadata witness reads through the private bounded view", calls)
            chunks.append(hosted_storage_objects_view())
        chunks.append(value.render())
    write("20_publication_core.sql", chunks)


def hosted_storage_objects_view() -> str:
    return """CREATE VIEW listing_publication_private.hosted_storage_objects WITH (security_barrier=true) AS
 SELECT s.id,s.bucket_id,s.name,s.version FROM storage.objects s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.name);
REVOKE ALL ON listing_publication_private.hosted_storage_objects FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON listing_publication_private.hosted_storage_objects TO selqiro_listing_final_writer_v1;"""


def private_storage_views() -> str:
    # The managed tables need no new grants/policies; postgres reads under its
    # pre-existing trusted privileges, and the dedicated writer sees only this
    # release's bucket/ledger rows and columns. Views are not API-granted.
    return """-- Application-owned, column- and bucket-bounded metadata witnesses.
CREATE VIEW listing_publication_private.hosted_s3_multipart_uploads WITH (security_barrier=true) AS
 SELECT s.id,s.bucket_id,s.key,s.version FROM storage.s3_multipart_uploads s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.multipart_attempts a ON a.attempt_id=o.attempt_id
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.key);
CREATE VIEW listing_publication_private.hosted_s3_multipart_uploads_parts WITH (security_barrier=true) AS
 SELECT s.upload_id,s.bucket_id,s.key,s.version,s.part_number,s.etag,s.size,s.created_at
 FROM storage.s3_multipart_uploads_parts s
 WHERE s.bucket_id='listing-publication-private' AND EXISTS(
  SELECT 1 FROM listing_publication_private.objects o JOIN listing_publication_private.multipart_attempts a ON a.attempt_id=o.attempt_id
  WHERE o.bucket_id=s.bucket_id AND o.object_path=s.key);
REVOKE ALL ON listing_publication_private.hosted_s3_multipart_uploads,
 listing_publication_private.hosted_s3_multipart_uploads_parts,listing_publication_private.hosted_storage_objects
 FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON listing_publication_private.hosted_s3_multipart_uploads,
 listing_publication_private.hosted_s3_multipart_uploads_parts,listing_publication_private.hosted_storage_objects
 TO selqiro_listing_final_writer_v1;"""


def multipart_and_journey():
    journey = full(LAB + "listing-publication-journey-v2/01_isolation_and_status.sql")
    marker = "-- Seal an uncertain, not-yet-observed prepare under the same profile lock used by"
    prefix = journey.text[:journey.text.index(marker)]
    journey.replace(prefix, "SELECT listing_publication_private.assert_hosted_install_context();\n\n",
        "select journey declarations after the disposable run marker; create no local marker or readiness RPC")
    chunks = [journey.render()]
    for name in ("01_sessions.sql", "03_settlement.sql"):
        value = full(LAB + "listing-publication-multipart-v2/" + name, gate=True)
        if name == "01_sessions.sql":
            value.replace(" provider_commit text NOT NULL DEFAULT 'c826a70ac6e6f56d3e6033ccb164fb1ff5282570'\n  CHECK(provider_commit='c826a70ac6e6f56d3e6033ccb164fb1ff5282570'),",
                " provider_contract text NOT NULL DEFAULT 'supabase-s3-session-v1'\n  CHECK(provider_contract='supabase-s3-session-v1'),",
                "record the managed protocol contract, never assert a local provider build as hosted fact")
            value.replace("-- Provider pin: supabase/storage v1.83.5 c826a70ac6e6f56d3e6033ccb164fb1ff5282570.",
                "-- Hosted provider protocol: supabase-s3-session-v1; provider build is not asserted.", "remove misleading local provider pin comment")
            start = value.text.index("GRANT SELECT(id,bucket_id,key,version) ON storage.s3_multipart_uploads")
            end = value.text.index("CREATE FUNCTION listing_publication_private.protect_multipart_attempt", start)
            block = value.text[start:end]
            # The exact source hash pins the removed block. Assert its shape as
            # well so no additional grant/trigger can silently be removed.
            if block.count("CREATE POLICY") != 3 or block.count("GRANT SELECT") != 2 or "TRIGGER" in block:
                raise ValueError("Unexpected native Storage authority block")
            value.replace(block, "-- HOSTED_METADATA_VIEWS --\n\n",
                "replace two managed-table grants and three read policies with postgres-owned bounded read-only views")
        else:
            value.replace("-- The actual stopped-process/volume oracle must follow before cleanup unblocks.",
                "-- Hosted terminal cleanup has no accepted oracle; cleanup and reservations remain held.",
                "describe hosted held cleanup truthfully")
        original_start, original_end = function_span(value.text, "listing_publication_private.protect_multipart_auxiliary")
        original = value.text[original_start:original_end]
        verb = "CREATE OR REPLACE" if original.startswith("CREATE OR REPLACE") else "CREATE"
        value.replace(original, verb + """ FUNCTION listing_publication_private.protect_multipart_auxiliary() RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,pg_temp AS $f$
BEGIN
 RAISE EXCEPTION 'publication_hosted_terminal_cleanup_unavailable' USING ERRCODE='55000';
END $f$;""", "replace local process/volume oracle with stronger unconditional denial; never fabricate terminal cleanup")
        for old, new in (
            ("storage.s3_multipart_uploads_parts", "listing_publication_private.hosted_s3_multipart_uploads_parts"),
            ("storage.s3_multipart_uploads", "listing_publication_private.hosted_s3_multipart_uploads"),
            ("storage.objects", "listing_publication_private.hosted_storage_objects"),
        ):
            count = value.text.count(old)
            if count:
                value.replace(old, new, "route only metadata reads through bounded application-owned view: " + old, count)
        if name == "01_sessions.sql":
            value.replace("-- HOSTED_METADATA_VIEWS --", private_storage_views(), "declare bounded views before their first referenced function")
        # These post-I/O service receipts have object-only signatures. Bind the
        # object to its recorded actor before accepting a service completion.
        functions = ("record_listing_multipart_created_v2", "record_listing_multipart_completed_v2", "record_listing_multipart_problem_v2") if name == "01_sessions.sql" else ("record_listing_multipart_problem_v2",)
        for func in functions:
            start, end = function_span(value.text, "public." + func)
            body = value.text[start:end]
            insert = " PERFORM listing_publication_private.require_upload_service();"
            body_new = body.replace(insert, insert + "\n PERFORM listing_publication_private.assert_hosted_preview_object(p_object_id);", 1)
            if body_new == body:
                raise ValueError("Missing service guard: " + func)
            value.replace(body, body_new, "object receipt rechecks the current hosted actor allowlist: " + func)
        chunks.append(value.render())
    write("30_multipart_and_journey.sql", chunks)


def read_and_owner():
    chunks = ["SELECT listing_publication_private.assert_hosted_install_context();"]
    chunks.append(selected(LAB + "listing-public-read-v1/10_price_read_model.sql", "listing_price_read_model_v1").render())
    for name in ("11_public_search_v2.sql", "12_public_detail_fields.sql", "13_public_listing_detail.sql", "14_public_profile_listings.sql",
                 "15_public_profile_services.sql", "16_public_profile_showcases.sql"):
        chunks.append(full(LAB + "listing-public-read-v1/" + name).render())
    for relative, names in (
        ("supabase/releases/listing-price-v1/server-composition.test.generated.sql", ("lock_my_listing_basics_v1", "set_my_listing_price_core_v1")),
        (LAB + "listing-price-integration-v1/05_owner_basics_atomic.sql", ("get_my_listing_basics_v1", "save_my_listing_basics_v1")),
        ("supabase/contracts/listing_edit_api_v1.sql", ("get_my_listing_edit_v1", "save_my_listing_edit_v1")),
        (LAB + "listing-owner-read-v1/15_owner_money_models.sql", ("project_horse_wanted_owner_summary_v2", "horse_owner_price_read_v1")),
        (LAB + "listing-owner-read-v1/16_owner_marketplace_read_v3.sql", ("get_my_marketplace_items_v3",)),
    ):
        for name in names:
            value = selected(relative, name)
            if name == "lock_my_listing_basics_v1":
                actor_gate(value, "actor")
            chunks.append(value.render())
    authority = full("supabase/releases/listing-price-v1/writer-authority.sql")
    role = re.search(r'CREATE ROLE selqiro_listing_price_writer_v1\b[^;]*;', authority.text)
    authority.replace(role.group(), "-- Exact restricted role created by 10_price_core.sql.", "preserve authority without recreating already declared restricted writer")
    authority.replace("GRANT selqiro_listing_price_writer_v1 TO postgres WITH ADMIN TRUE;\nGRANT selqiro_listing_price_writer_v1 TO postgres WITH INHERIT TRUE;\nGRANT selqiro_listing_price_writer_v1 TO postgres WITH SET TRUE;",
        "-- Membership and its PG17 automatic ADMIN provenance were established in 10_price_core.sql.",
        "do not grant ADMIN back to its grantor; preserve creator grant and SET/INHERIT established once")
    chunks.append(authority.render())
    chunks.append("""CREATE POLICY hosted_price_writer_select ON public.listings FOR SELECT TO selqiro_listing_price_writer_v1
 USING(identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));""")
    chunks.append(full(LAB + "listing-publication-journey-v2/02_owner_surfaces.sql", gate=True).render())
    value = full(LAB + "listing-contact-integration-v1/01_contact.sql")
    gate = re.search(r'DO \$gate\$.*?END \$gate\$;', value.text, re.S).group()
    # Keep the actual relation/sequence/dependency checks within that gate.
    prerequisites = gate[gate.index(" IF to_regprocedure"):gate.index("END $gate$;")]
    value.gate(prerequisites)
    value.replace("CREATE ROLE selqiro_listing_contact_writer_v1 NOLOGIN;", """CREATE ROLE selqiro_listing_contact_writer_v1 NOLOGIN NOSUPERUSER NOCREATEDB
 NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
-- ADMIN is the PG17 automatic creator grant; preserve its bootstrap grantor.
GRANT selqiro_listing_contact_writer_v1 TO postgres WITH ADMIN FALSE, INHERIT TRUE, SET TRUE GRANTED BY postgres;""", "make contact writer attributes and needed SET/INHERIT membership explicit while retaining PG17 automatic ADMIN")
    chunks.append(value.render())
    value = full(LAB + "listing-contact-integration-v1/02_read.sql")
    value.gate(" IF to_regclass('listing_contact_private.channels') IS NULL THEN\n  RAISE EXCEPTION 'listing_contact_reviewed_schema_required'; END IF;\n")
    chunks.append(value.render())
    write("40_read_models_and_owner.sql", chunks)


def public_functions(text: str) -> list[str]:
    return sorted(set(re.findall(r'\bCREATE(?:\s+OR\s+REPLACE)?\s+FUNCTION\s+public\.([a-z0-9_]+)\s*\(', text, re.I)))


def main():
    price_core()
    publication_core()
    multipart_and_journey()
    read_and_owner()
    bodies = {name: (OUT / name).read_text() for name in (
        "00_preconditions.sql", "10_price_core.sql", "20_publication_core.sql", "30_multipart_and_journey.sql",
        "40_read_models_and_owner.sql", "50_storage_authority.sql", "60_preview_authority.sql")}
    public_names = public_functions("\n".join(bodies.values()))
    inventory = "ARRAY[" + ",".join("'" + name + "'" for name in public_names) + "]"
    # Every new public name is absent at entry. We therefore never replace an
    # unknown existing function merely because a retained declaration uses OR REPLACE.
    collision = """DO $new_function_collisions$ DECLARE conflict text; BEGIN
 SELECT p.oid::regprocedure::text INTO conflict FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(""" + inventory + """) LIMIT 1;
 IF conflict IS NOT NULL THEN RAISE EXCEPTION 'hosted_release_existing_function: %',conflict USING ERRCODE='55000'; END IF;
END $new_function_collisions$;
"""
    closure = """DO $close_new_public_functions$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(""" + inventory + """) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_new_public_functions$;
"""
    bodies["00_preconditions.sql"] = bodies["00_preconditions.sql"].replace("-- GENERATED_NEW_FUNCTION_COLLISION_GUARD --", collision)
    bodies["60_preview_authority.sql"] = bodies["60_preview_authority.sql"].replace("-- GENERATED_CLOSE_NEW_PUBLIC_FUNCTIONS --", closure)
    sql = """-- ADDITIVE HOSTED PREVIEW RELEASE. Not automatically applied by Supabase CLI.
-- Caller must BEGIN, SET LOCAL trusted target settings, then include this file.
-- Review README.md. A failed statement must abort the entire transaction.
-- No actor is allowlisted and enabled remains false after successful installation.
""" + "\n\n".join("-- COMPONENT " + name + "\n" + body for name, body in bodies.items())
    if "current_database()" in sql or "selqiro_disposable_v2.run" in sql or "selqiro.integration_scope" in sql:
        raise ValueError("Unadapted local runtime/installation guard remains")
    if re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?(?:TABLE|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.|auth\.|storage\.)', sql, re.I):
        raise ValueError("Baseline application/provider object recreation detected")
    if "REVOKE ALL ON ALL TABLES IN SCHEMA public" in sql or "REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public" in sql:
        raise ValueError("Existing public ACL must not be rewritten")
    if re.search(r'GRANT\b[^;]*\bON\s+SCHEMA\s+[^;]*\bauth\b[^;]*;', sql, re.I):
        raise ValueError("Managed Auth schema privilege regrant is forbidden")
    (OUT / "release.sql").write_text(sql)
    report = {"format": "selqiro-hosted-additive-sql-provenance-v1", "release_id": "listing-publication-hosted-preview-v1",
        "public_function_names": public_names, "sources": PROVENANCE,
        "components": [{"path": name, "sha256": sha((OUT / name).read_text())} for name in bodies],
        "release_sha256": sha(sql), "execution": "composition only; no database, process, provider, network or fixture execution"}
    (OUT / "source-provenance.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps({"release": str(OUT / "release.sql"), "sha256": sha(sql),
                      "source_selections": len(PROVENANCE), "new_public_function_names": len(public_names)}))


if __name__ == "__main__":
    main()
