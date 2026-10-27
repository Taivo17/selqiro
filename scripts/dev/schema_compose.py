"""Compose the reviewed V2 declarations for one new local development database.

No subprocesses or database writes are performed here. Historical setup programs
are not imported: schema_sources contains only the recorded pure extractors.
"""
import hashlib
from pathlib import Path
import re

import schema_sources as retained


OVERLAYS = (
    "supabase/labs/listing-publication-journey-v2/01_isolation_and_status.sql",
    "supabase/labs/listing-publication-multipart-v2/01_sessions.sql",
    "supabase/labs/listing-publication-multipart-v2/02_source_part_authority.sql",
    "supabase/labs/listing-publication-multipart-v2/03_settlement.sql",
    "supabase/labs/listing-contact-integration-v1/tests/fixture-extension.sql",
    "supabase/labs/listing-contact-integration-v1/01_contact.sql",
    "supabase/labs/listing-contact-integration-v1/02_read.sql",
    "supabase/labs/listing-contact-integration-v1/tests/authority.sql",
)

OWNER_GRANTS = """
DO $close_new$ DECLARE f regprocedure; BEGIN
 FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname=ANY(ARRAY[
 'set_my_listing_price_core_v1','lock_my_listing_basics_v1','get_my_listing_basics_v1','save_my_listing_basics_v1',
 'get_my_listing_edit_v1','save_my_listing_edit_v1','get_my_marketplace_items_v3',
 'project_horse_wanted_owner_summary_v2','horse_owner_price_read_v1']) LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f);
 END LOOP;
END $close_new$;
GRANT EXECUTE ON FUNCTION public.get_my_listing_edit_v1(text,uuid,uuid),
 public.save_my_listing_edit_v1(text,uuid,uuid,jsonb,jsonb,jsonb,text),
 public.get_my_marketplace_items_v3(uuid,integer,integer,text,text,uuid),
 public.get_my_managed_listing_v2(uuid,uuid,text),
 public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer),
 public.set_my_managed_listing_status_v2(uuid,uuid,text,text,text),
 public.renew_my_managed_listing_activity_v2(uuid,uuid,text,timestamptz) TO authenticated;
"""


def has_declaration(body, kind, name):
    quoted = r'(?:"public"\."' + re.escape(name) + r'"|public\.' + re.escape(name) + r')'
    pattern = r'\bcreate(?:\s+or\s+replace)?\s+' + kind + r'\s+(?:if\s+not\s+exists\s+)?' + quoted + r'\b'
    # The quote at the end is non-word; a boundary is needed only for unquoted names.
    return re.search(pattern[:-2] + r'(?=\s|\()', body, re.I) is not None


def owner_grant_observation(stage):
    return """SELECT json_build_object('owner_media_grant_stage','%s',
 'authenticated',has_function_privilege('authenticated',
  'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'),
 'anon',has_function_privilege('anon',
  'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'),
 'service_role',has_function_privilege('service_role',
  'public.get_my_listing_media_binding_v2(uuid,uuid,uuid,integer)','EXECUTE'));
""" % stage


def compile_schema(source_root):
    """Return SQL and its declaration provenance; caller supplies a fresh DB guard."""
    root = Path(source_root).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Application source directory required")
    retained.SOURCE = root
    retained.SOURCES.clear()
    chunks = [retained.compile_base_schema()]
    chunks.extend(retained.source(relative) for relative in OVERLAYS)
    chunks.append(retained.OVERLAY_GRANTS)
    existing = "\n".join(chunks)

    if not has_declaration(existing, "table", "horse_offers"):
        chunks.append(retained.declaration(
            "supabase/migrations/20260830170000_add_ee_horse_offer_foundation.sql", "horse_offers", "table"))
        chunks.append("ALTER TABLE public.horse_offers ENABLE ROW LEVEL SECURITY; "
                      "REVOKE ALL ON public.horse_offers FROM PUBLIC,anon,authenticated,service_role;")
    if not has_declaration(existing, "view", "marketplace_item_projection_v1"):
        relative = "supabase/migrations/20260911203000_add_marketplace_item_projection_foundation.sql"
        text = retained.source_text(relative)
        begin = text.index("create view public.marketplace_item_projection_v1")
        tail = "from public.horse_offers offer;"
        end = text.index(tail, begin) + len(tail)
        selected = text[begin:end]
        chunks.extend((selected, "REVOKE ALL ON public.marketplace_item_projection_v1 FROM PUBLIC,anon,authenticated,service_role;"))
        retained.SOURCES.append({"path": relative, "source_sha256": hashlib.sha256(text.encode()).hexdigest(),
                                 "mode": "exact view declaration", "declaration_sha256": hashlib.sha256(selected.encode()).hexdigest()})
    for relative, function in retained.OWNER_FUNCTIONS:
        if not has_declaration(existing, "function", function):
            selected = retained.declaration(relative, function)
            chunks.append(selected)
            existing += "\n" + selected
    chunks.append(retained.retained_price_authority())
    chunks.append(retained.source("supabase/labs/listing-publication-journey-v2/02_owner_surfaces.sql"))
    chunks.append(owner_grant_observation("after_closed_declaration"))
    chunks.append(OWNER_GRANTS)
    chunks.append(owner_grant_observation("after_retained_runtime_grant"))

    baseline = "supabase/migrations/20260722173530_baseline_20260722.sql"
    baseline_text = retained.source_text(baseline)
    follows = retained.declaration(baseline, "store_follows", "table")
    follows_policy = re.search(r'CREATE POLICY "Users can view their own store follows".*?;', baseline_text, re.S)
    profile_policy = re.search(r'CREATE POLICY "Public can read identity profiles".*?;', baseline_text, re.S)
    if not follows_policy or not profile_policy:
        raise ValueError("Retained header read policies missing")
    chunks.append(follows + "\n" + """
ALTER TABLE public.store_follows ADD PRIMARY KEY(id);
ALTER TABLE public.store_follows ADD FOREIGN KEY(follower_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.store_follows ADD FOREIGN KEY(store_owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.store_follows ENABLE ROW LEVEL SECURITY;
""" + follows_policy.group(0) + "\n" + """
REVOKE ALL ON public.store_follows FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT(store_owner_id,follower_id) ON public.store_follows TO authenticated;
GRANT SELECT(language) ON public.profiles TO authenticated;
ALTER TABLE public.identity_profiles ENABLE ROW LEVEL SECURITY;
""" + profile_policy.group(0) + "\nGRANT SELECT(identity_id,slug) ON public.identity_profiles TO authenticated;\n")
    chunks.extend(retained.fragment(relative) for relative in (
        "schema_fragments/read-extension.sql", "schema_fragments/profile-read-continuation.sql"))

    # Only the two gallery table declarations are selected. The historical image
    # migrations also alter Storage buckets/policies and are not executed wholesale.
    for relative, table in (
        ("supabase/migrations/20260805123000_add_service_image_foundation.sql", "service_images"),
        ("supabase/migrations/20260723173859_add_product_showcase_image_foundation.sql", "product_showcase_images"),
    ):
        chunks.append(retained.declaration(relative, table, "table"))
        chunks.append("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY; "
                      "REVOKE ALL ON public." + table + " FROM PUBLIC,anon,authenticated,service_role;")
    chunks.append(retained.source("supabase/labs/listing-public-read-v1/15_public_profile_services.sql"))
    chunks.append(retained.source("supabase/labs/listing-public-read-v1/16_public_profile_showcases.sql"))
    chunks.append("""
GRANT EXECUTE ON FUNCTION public.get_public_profile_services_v1(text,integer),
 public.get_public_profile_showcases_v1(text,integer) TO anon,authenticated;
GRANT SELECT ON public.store_categories TO authenticated;
-- The exact owner-media permission is already supplied by the retained runtime
-- grants above. Verification checks it; no hypothetical old grant bug is repaired.
NOTIFY pgrst,'reload schema';
""")
    body = "\n\n".join(chunks)
    # The caller owns the sole transaction. Copied declarations contain SQL/PLpgSQL
    # BEGIN blocks, but no top-level transaction end may escape the fresh DB guard.
    if re.search(r'^(?:COMMIT|ROLLBACK);\s*$', body, re.M | re.I):
        raise ValueError("Unexpected retained transaction boundary")
    return body, tuple(dict(row) for row in retained.SOURCES)
