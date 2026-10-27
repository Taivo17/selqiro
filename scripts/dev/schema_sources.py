"""Pure SQL composition for a NEW persistent local development database.

No historical runner module is imported. The selected declaration functions below
are retained from reviewed source; input hashes and provenance are adjacent.
This compiler performs no process, network, database or source write action.
"""
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent
PROVENANCE = json.loads((HERE / "schema_provenance.json").read_text())
SOURCE = None
SOURCES = []

def source_text(relative):
    target = SOURCE / relative
    if target.is_symlink() or not target.is_file():
        raise ValueError("Schema source missing or linked: " + relative)
    data = target.read_bytes()
    if hashlib.sha256(data).hexdigest() != PROVENANCE["input_hashes"].get(relative):
        raise ValueError("Schema declaration source changed: " + relative)
    return data.decode("utf-8")

def fragment(relative):
    data = (HERE / relative).read_bytes()
    if hashlib.sha256(data).hexdigest() != PROVENANCE["retained_fragments"][relative]["sha256"]:
        raise ValueError("Retained schema fragment changed: " + relative)
    return data.decode("utf-8")

def source(path):
    content = source_text(path)
    SOURCES.append({"path": path, "source_sha256": hashlib.sha256(content.encode()).hexdigest(), "mode": "whole declaration file"})
    return content


def declaration(path, name, kind="function"):
    content = source_text(path)
    owner = r'(?:"public"\."' + re.escape(name) + r'"|public\.' + re.escape(name) + r')'
    if kind == "function":
        match = re.search(r'create(?:\s+or\s+replace)?\s+function\s+' + owner + r'\s*\(', content, re.I)
        if not match:
            raise ValueError("Missing selected function: " + name)
        opening = re.search(r'\bas\s+(\$[A-Za-z0-9_]*\$)', content[match.start():], re.I)
        if not opening:
            raise ValueError("Missing SQL body delimiter: " + name)
        body_start = match.start() + opening.end()
        delimiter = opening.group(1)
        end = content.index(delimiter, body_start) + len(delimiter)
        end = content.index(";", end) + 1
    elif kind == "table":
        match = re.search(r'create\s+table\s+(?:if\s+not\s+exists\s+)?' + owner + r'\s*\(', content, re.I)
        if not match:
            raise ValueError("Missing selected table: " + name)
        end_match = re.search(r'^[ \t]*\);', content[match.start():], re.M)
        end = match.start() + end_match.end()
    elif kind == "trigger":
        match = re.search(r'create\s+trigger\s+' + re.escape(name) + r'\s', content, re.I)
        if not match:
            raise ValueError("Missing selected trigger: " + name)
        end = content.index(";", match.end()) + 1
    else:
        raise ValueError("Unsupported selection")
    selected = content[match.start():end]
    SOURCES.append({"path": path, "source_sha256": hashlib.sha256(content.encode()).hexdigest(),
                    "mode": "selected " + kind, "name": name,
                    "declaration_sha256": hashlib.sha256(selected.encode()).hexdigest()})
    return selected


def compile_base_schema():
    fixture_path = "supabase/labs/listing-publication-attempt-v1/tests/fixture.generated.sql"
    fixture = source(fixture_path)
    start = fixture.index('CREATE TABLE IF NOT EXISTS "public"."profiles"')
    prefix = fixture[:start]
    assert prefix.count("CREATE TABLE auth.users(id uuid PRIMARY KEY);") == 1
    assert prefix.count("CREATE OR REPLACE FUNCTION auth.uid()") == 1
    SOURCES[-1].update(mode="public declarations after native Auth stubs", omitted_prefix_sha256=hashlib.sha256(prefix.encode()).hexdigest())
    chunks = ["-- New native-service integration fixture; declarations only, no legacy tests/seeds.\n", fixture[start:]]
    lab = "supabase/labs/"
    for name in [
        "listing-publication-attempt-v1/01_private_state.sql",
        "listing-publication-attempt-v1/02_values_and_policy.sql",
        "listing-publication-attempt-v1/03_owner_attempt.sql",
        "listing-publication-attempt-v1/04_upload_dispatch.sql",
        "listing-publication-attempt-v1/05_close_attempt.sql",
        "listing-publication-upload-v1/01_upload_grants.sql",
        "listing-publication-web-v1/01_web_receipts.sql",
        "listing-publication-web-v1/02_close_write_fence.sql",
        "listing-publication-final-v1/tests/fixture-extension.generated.sql",
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
    ]:
        chunks.append(source(lab + name))
    reader = source(lab + "listing-public-read-v1/tests/reader-fixture-extension.sql")
    reader = re.sub(r'^(BEGIN|COMMIT);\s*$', '', reader, flags=re.M)
    SOURCES[-1]["mode"] = "exact table declarations, outer fixture transaction removed for combined transaction"
    chunks.append(reader)
    baseline = "supabase/migrations/20260722173530_baseline_20260722.sql"
    for name in ["store_categories", "listing_store_categories"]:
        chunks.append(declaration(baseline, name, "table"))
    chunks.append("""
ALTER TABLE public.store_categories ADD PRIMARY KEY(id);
ALTER TABLE public.listing_store_categories ADD PRIMARY KEY(listing_id,store_category_id);
ALTER TABLE public.store_categories ADD FOREIGN KEY(identity_id) REFERENCES public.identities(id) ON DELETE CASCADE;
ALTER TABLE public.store_categories ADD FOREIGN KEY(parent_id) REFERENCES public.store_categories(id) ON DELETE RESTRICT;
ALTER TABLE public.store_categories ADD FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.listing_store_categories ADD FOREIGN KEY(listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_store_categories ADD FOREIGN KEY(store_category_id) REFERENCES public.store_categories(id) ON DELETE CASCADE;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_store_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.store_categories,public.listing_store_categories FROM PUBLIC,anon,authenticated,service_role;
""")
    chunks.append(declaration("supabase/migrations/20260926180000_add_public_listing_detail_keywords.sql", "public_listing_search_document_v1"))
    # This existing pure function is selected as a declaration, rather than
    # executing its historical price-only test fixture setup guard in a second
    # database. The whole new setup is guarded against our exact native cluster.
    chunks.append(declaration(lab + "listing-public-read-v1/10_price_read_model.sql", "listing_price_read_model_v1"))
    for name in ["11_public_search_v2.sql", "12_public_detail_fields.sql", "13_public_listing_detail.sql", "14_public_profile_listings.sql"]:
        chunks.append(source(lab + "listing-public-read-v1/" + name))
    for name in ["get_my_active_identity_profile", "get_my_active_identity_profile_details", "get_my_identities", "set_my_active_identity_v2", "validate_profile_active_identity_v2"]:
        chunks.append(declaration(baseline, name))
    chunks.append("""
CREATE TRIGGER integration_profile_identity_validation BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.validate_profile_active_identity_v2();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY integration_own_profile_read ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
GRANT SELECT(id,store_slug,active_identity_id,store_name) ON public.profiles TO authenticated;
""")
    policy = "supabase/migrations/20260822130000_add_publication_policy_acceptance_foundation.sql"
    for name in ["set_publication_policy_acceptance_snapshot", "accept_publication_policy_v1", "get_my_required_publication_policy_status_v1"]:
        chunks.append(declaration(policy, name))
    chunks.append(declaration(policy, "trg_user_publication_policy_acceptances_snapshot", "trigger"))
    # Closed source contracts receive explicit disposable-session grants here.
    # No tables in listing_publication_private are granted to API roles.
    chunks.append("""
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.search_public_listings_v2(text,text,text,text,text,text,integer,integer),
 public.get_public_listing_detail_v1(text),public.get_public_profile_listings_v1(text,uuid,integer,integer)
 TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_active_identity_profile(), public.get_my_active_identity_profile_details(),
 public.get_my_identities(), public.set_my_active_identity_v2(uuid),
 public.accept_publication_policy_v1(uuid,text,text,uuid,text),
 public.get_my_required_publication_policy_status_v1(text,text,text) TO authenticated;
DO $owner_grants$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
 'prepare_my_listing_publication_v1','get_my_listing_publication_v1','cancel_my_listing_publication_v1',
 'reserve_my_listing_upload_v1','get_my_listing_upload_grant_v1','get_my_listing_web_ready_v1',
 'get_my_listing_publication_confirmation_v1','publish_my_listing_v1','delete_my_published_listing_v1',
 'get_my_listing_cleanup_summary_v1']) LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f);
 END LOOP;
END $owner_grants$;
DO $service_grants$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
 'claim_listing_upload_sign_v1','record_listing_upload_grant_v1','confirm_listing_upload_release_v1',
 'purge_listing_upload_token_one_v1','claim_listing_web_image_v1','prepare_listing_web_write_v1',
 'record_listing_web_ready_v1','record_listing_web_write_completed_v1','claim_listing_cleanup_v1',
 'record_listing_cleanup_v1','claim_listing_write_reconcile_v1','record_listing_write_reconcile_v1',
 'settle_unreleased_listing_source_one_v1','settle_recorded_unreleased_source_one_v1',
 'get_public_listing_media_binding_v1']) LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f);
 END LOOP;
END $service_grants$;
""")
    return "\n\n".join(chunks)


OWNER_FUNCTIONS = [('supabase/migrations/20260722173530_baseline_20260722.sql', 'require_my_active_identity_v2'), ('supabase/migrations/20260722173530_baseline_20260722.sql', 'get_store_category_scope_ids'), ('supabase/releases/listing-price-v1/server-composition.test.generated.sql', 'lock_my_listing_basics_v1'), ('supabase/releases/listing-price-v1/server-composition.test.generated.sql', 'set_my_listing_price_core_v1'), ('supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql', 'get_my_listing_basics_v1'), ('supabase/labs/listing-price-integration-v1/05_owner_basics_atomic.sql', 'save_my_listing_basics_v1'), ('supabase/contracts/listing_edit_api_v1.sql', 'get_my_listing_edit_v1'), ('supabase/contracts/listing_edit_api_v1.sql', 'save_my_listing_edit_v1'), ('supabase/migrations/20260928160000_add_owner_listing_activity_renewal.sql', 'renew_my_listing_activity_v1'), ('supabase/migrations/20260911220000_add_owner_marketplace_item_read_rpc.sql', 'get_my_marketplace_items_v1'), ('supabase/migrations/20260920150000_add_owner_marketplace_wanted_summary.sql', 'project_horse_wanted_owner_summary_v1'), ('supabase/migrations/20260920150000_add_owner_marketplace_wanted_summary.sql', 'get_my_marketplace_items_v2'), ('supabase/labs/listing-owner-read-v1/15_owner_money_models.sql', 'project_horse_wanted_owner_summary_v2'), ('supabase/labs/listing-owner-read-v1/15_owner_money_models.sql', 'horse_owner_price_read_v1'), ('supabase/labs/listing-owner-read-v1/16_owner_marketplace_read_v3.sql', 'get_my_marketplace_items_v3')]

def retained_price_authority():
 # The final-publication fixture already creates this NOLOGIN role. Keep its
 # existing grants, verify its attributes, and select the remaining accepted
 # price release authority without rerunning its gated composition/installer.
 rel='supabase/releases/listing-price-v1/writer-authority.sql'
 content=source_text(rel)
 role=re.search(r'CREATE ROLE selqiro_listing_price_writer_v1\b[^;]*;',content)
 if role is None: raise ValueError('Missing retained price writer role declaration')
 selected=content[:role.start()]+content[role.end():]
 SOURCES.append({'path':rel,'source_sha256':hashlib.sha256(content.encode()).hexdigest(),
  'mode':'exact authority except already-created fixture role; attributes checked',
  'declaration_sha256':hashlib.sha256(selected.encode()).hexdigest(),
  'omitted_role_declaration_sha256':hashlib.sha256(role.group().encode()).hexdigest()})
 return """
DO $writer_role$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_price_writer_v1'
  AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
  AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls)
 OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.roleid
  JOIN pg_roles member ON member.oid=m.member
  WHERE r.rolname='selqiro_listing_price_writer_v1' AND member.rolname<>'postgres') THEN
  RAISE EXCEPTION 'native_price_writer_role_guard';
 END IF;
END $writer_role$;
ALTER FUNCTION public.lock_my_listing_basics_v1(text,uuid,boolean) OWNER TO postgres;
"""+selected+"""
-- The accepted price fixture has a PUBLIC SELECT policy; this composed native
-- fixture intentionally has no broad direct listing read. Supply only the
-- dedicated writer's required SELECT visibility, using the retained UPDATE
-- policy predicate. No API table or role grant is introduced.
CREATE POLICY integration_price_writer_select ON public.listings
 FOR SELECT TO selqiro_listing_price_writer_v1
 USING(identity_id IS NOT NULL AND public.current_user_has_identity_access(identity_id));
"""


OVERLAY_GRANTS = "\nGRANT EXECUTE ON FUNCTION public.get_my_listing_publication_journey_v2(uuid,uuid,uuid),\n public.cancel_my_listing_publication_journey_v2(uuid,uuid,uuid),\n public.get_my_managed_listing_v2(uuid,uuid,text),\n public.get_my_listing_cleanup_summary_v1(uuid,uuid)\n TO authenticated;\nDO $integration_service_grants$ DECLARE f regprocedure; n integer := 0; BEGIN\n FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace\n WHERE ns.nspname='public' AND p.proname=ANY(ARRAY[\n 'reserve_listing_multipart_v2','get_listing_multipart_v2','record_listing_multipart_created_v2',\n 'claim_listing_multipart_part_v2','claim_listing_multipart_complete_v2',\n 'record_listing_multipart_completed_v2','record_listing_multipart_verified_v2',\n 'record_listing_multipart_problem_v2','prepare_listing_multipart_cleanup_v2',\n 'record_listing_multipart_abort_v2','claim_listing_cleanup_for_attempt_v2']) LOOP\n  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f);\n  n := n+1;\n END LOOP;\n IF n<>11 THEN RAISE EXCEPTION 'integration_multipart_grant_count'; END IF;\nEND $integration_service_grants$;\nNOTIFY pgrst, 'reload schema';\n"
