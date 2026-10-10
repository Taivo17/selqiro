#!/usr/bin/env python3
"""Deterministic, offline composition of retained listing-price sources. Never runs SQL."""
from pathlib import Path
import argparse
import hashlib
import json
import re

HERE = 'supabase/releases/listing-price-v1/'
CORE = 'supabase/labs/listing-price-core-v1/'
BASIC = 'supabase/labs/listing-price-integration-v1/'
PUBLIC = 'supabase/labs/listing-public-read-v1/'
OWNER = 'supabase/labs/listing-owner-read-v1/'
MANIFEST = HERE + 'composition-inputs.json'
OUTPUT = HERE + 'server-composition.test.generated.sql'
MAP = HERE + 'server-composition.map.json'


def digest(value):
    return hashlib.sha256(value).hexdigest()


def one_function(text, name):
    # All retained SQL is trusted, pinned source. Anchor CREATE outside bodies;
    # honor its own dollar delimiter, rather than guessing the next function end.
    pattern = r'^CREATE(?: OR REPLACE)? FUNCTION (?:"public"|public)\.(?:"' + re.escape(name) + r'"|' + re.escape(name) + r')\('
    matches = list(re.finditer(pattern, text, re.M | re.I))
    if len(matches) != 1:
        raise ValueError('Function boundary is not unique: ' + name)
    start = matches[0].start()
    opening = re.search(r'\bAS\s+(\$[a-zA-Z_0-9]*\$)', text[matches[0].end():], re.I)
    if not opening:
        raise ValueError('Dollar-quoted function required: ' + name)
    tag = opening.group(1)
    body_start = matches[0].end() + opening.end()
    body_end = text.find(tag, body_start)
    if body_end < 0 or not re.match(r'\s*;', text[body_end + len(tag):]):
        raise ValueError('Function end missing: ' + name)
    end = body_end + len(tag) + re.match(r'\s*;', text[body_end + len(tag):]).end()
    return text[start:end], text[body_start:body_end]


def exactly(text, old, new):
    if text.count(old) != 1:
        raise ValueError('Source transformation boundary changed')
    return text.replace(old, new, 1)


def generate(root):
    spec = json.loads((root / MANIFEST).read_text())
    source = {}
    for name, expected in spec['inputs'].items():
        raw = (root / name).read_bytes()
        if digest(raw) != expected['sha256'] or len(raw) != expected['bytes']:
            raise ValueError('Source input changed: ' + name)
        source[name] = raw.decode('utf-8')
    pieces = []
    origins = []

    def add(origin, text, changes='byte-identical segment'):
        pieces.append('-- SOURCE: ' + origin + '\n' + text.strip('\n') + '\n\n')
        origins.append({'source': origin, 'sha256': digest(text.encode()), 'transformation': changes})

    def func(path, name, transform=None):
        original, body = one_function(source[path], name)
        result = original if transform is None else transform(original)
        add(path + '#' + name, result, 'unchanged function definition' if transform is None else spec['changes'][name])
        return body

    add('test-only envelope', """-- NOT A PRODUCTION MIGRATION. This candidate contains real grants only in the NEW helper.
DO $gate$ BEGIN
  IF current_database() NOT IN ('selqiro_price_release_fixture','selqiro_price_release_race_fixture')
      OR current_user <> 'postgres' OR current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'listing_price_release_disposable_fixture_required';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='selqiro_listing_price_writer_v1') THEN
    RAISE EXCEPTION 'listing_price_release_role_already_exists';
  END IF;
END $gate$;
ALTER TABLE public.listings
  ADD COLUMN price_kind text, ADD COLUMN currency text,
  ADD COLUMN price_revision bigint NOT NULL DEFAULT 0;
""")
    func(HERE + 'price-value-contract.generated.sql', 'listing_price_currency_scale_v1')
    for name in ('normalize_listing_price_v1','listing_price_legacy_label_v1','listing_price_tuple_valid_v1','listing_price_snapshot_v1'):
        func(CORE + '01_value_contract.sql', name)
    add('retained tuple constraint', """ALTER TABLE public.listings ADD CONSTRAINT listings_price_tuple_v1_check CHECK (
  public.listing_price_tuple_valid_v1(price_kind,price_amount,currency,price_revision,price) IS TRUE
);""")
    for name in ('normalize_listing_basics_v1','listing_basics_values_v1','listing_basics_snapshot_v1','listing_basics_search_text_v1'):
        func(BASIC + '04_basics_contract.sql', name)
    func(BASIC + '05_owner_basics_atomic.sql','lock_my_listing_basics_v1',
         lambda text: exactly(text, 'LANGUAGE plpgsql SECURITY INVOKER','LANGUAGE plpgsql SECURITY DEFINER'))

    def core_change(text):
        start = '  -- Fixed lock order: caller profile, identity, business membership, then listing.\n'
        end = '  -- Check revision BEFORE no-op: stale callers cannot bypass conflict detection.\n'
        if text.count(start) != 1 or text.count(end) != 1:
            raise ValueError('Price core lock block changed')
        a, b = text.index(start), text.index(end)
        if b <= a:
            raise ValueError('Invalid lock block order')
        text = text[:a] + ('  -- The same lock order is owned by the retained, closed definer locker.\n'
            '  current_row := public.lock_my_listing_basics_v1(p_listing_id,p_expected_identity_id,true);\n'
            '  active_id := current_row.identity_id;\n') + text[b:]
        text = exactly(text, '  actor uuid := auth.uid(); active_id uuid; row_id bigint; expected_revision bigint;',
                       '  active_id uuid; row_id bigint; expected_revision bigint;')
        text = exactly(text, "  IF actor IS NULL OR p_expected_identity_id IS NULL THEN\n    RAISE EXCEPTION 'listing_price_identity_required' USING ERRCODE='42501';\n  END IF;\n",
                       '  -- Actor/identity checks are performed by the closed definer locker.\n')
        return text

    func(CORE + '03_owner_price_core.sql','set_my_listing_price_core_v1',core_change)
    for name in ('get_my_listing_basics_v1','save_my_listing_basics_v1'):
        func(BASIC + '05_owner_basics_atomic.sql',name)
    for name in ('get_my_listing_edit_v1','save_my_listing_edit_v1'):
        func('supabase/contracts/listing_edit_api_v1.sql',name)
    # Public and mixed-owner readers are retained byte-identically. No legacy v1
    # body or search index is replaced; snapshots use the same authoritative tuple.
    reader_functions = {
        PUBLIC+'10_price_read_model.sql': ['listing_price_read_model_v1'],
        PUBLIC+'11_public_search_v2.sql': ['search_public_listings_v2'],
        PUBLIC+'12_public_detail_fields.sql': ['public_listing_detail_field_spec_v1','public_listing_detail_values_v1'],
        PUBLIC+'13_public_listing_detail.sql': ['get_public_listing_detail_v1'],
        PUBLIC+'14_public_profile_listings.sql': ['get_public_profile_listings_v1'],
        OWNER+'15_owner_money_models.sql': ['project_horse_wanted_owner_summary_v2','horse_owner_price_read_v1'],
        OWNER+'16_owner_marketplace_read_v3.sql': ['get_my_marketplace_items_v3'],
    }
    for path, names in reader_functions.items():
        for name in names:
            func(path,name)
    # Close every NEW function, including default privileges, before selective grants.
    signatures = spec['function_signatures']
    add('explicit base ACL', '\n'.join('REVOKE ALL ON FUNCTION public.'+signature+' FROM PUBLIC,anon,authenticated,service_role;' for signature in signatures))
    pure = spec['pure_signatures']
    add('retained pure-value grants', '\n'.join('GRANT EXECUTE ON FUNCTION public.'+s+' TO anon,authenticated,service_role;' for s in pure))
    for path in ('writer-authority.sql','write-guard-v2.sql','api-privileges.sql'):
        add(HERE+path,source[HERE+path],'reviewed new release-only authority component')
    text = ''.join(pieces)
    lines = 1
    for row, piece in zip(origins,pieces):
        row['start_line'], row['end_line'] = lines, lines + piece.count('\n') - 1
        lines += piece.count('\n')
    mapping = {'format':'selqiro_listing_price_server_composition_v1',
        'not_a_production_migration':True, 'output_sha256':digest(text.encode()),
        'source_manifest_sha256':digest((root / MANIFEST).read_bytes()), 'segments':origins,
        'changes':spec['changes'], 'warning':'No runtime activation from source-only files; fresh production preflight remains required.'}
    return {OUTPUT:text.encode(), MAP:(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n').encode(),
        HERE+'test-fixture.generated.sql':fixture_text(source,spec)}



def fixture_text(source, spec):
    # Selected existing table/function declarations, never a full production dump.
    # Their BEGIN/COMMIT wrappers remain intact; the caller loads this ONCE before
    # its outer rollback test. No synthetic test suite from a prior run is replayed.
    parts = ["-- GENERATED DISPOSABLE-HELPER BASELINE; SYNTHETIC AUTH/ROWS ONLY.\n"]
    for path in spec['fixture_files']:
        parts.append('-- SOURCE: ' + path + '\n' + source[path] + '\n')
    # V2 repair: an existing private wanted-summary helper was missing from
    # the disposable baseline. Load only its exact pinned definition, not the
    # whole applied migration or a rewritten substitute. No API EXECUTE grant.
    for dep in spec['fixture_dependencies']:
        definition, body = one_function(source[dep['source']], dep['name'])
        if (digest(definition.encode()) != dep['definition_sha256']
                or hashlib.md5(body.encode()).hexdigest() != dep['body_md5']
                or dep['owner'] != 'postgres'
                or dep['execute'] != 'closed_to_PUBLIC_anon_authenticated_service_role'):
            raise ValueError('Fixture dependency contract differs: ' + dep['name'])
        parts.append('-- EXISTING PRIVATE DEPENDENCY: ' + dep['source'] + '#' + dep['name'] + '\n' + definition + '\n')
        parts.append('ALTER FUNCTION public.' + dep['signature'] + ' OWNER TO postgres;\n')
        parts.append('REVOKE ALL ON FUNCTION public.' + dep['signature'] + ' FROM PUBLIC,anon,authenticated,service_role;\n')
    baseline = 'supabase/migrations/20260722173530_baseline_20260722.sql'
    for name, signature, public_execute in spec['legacy_functions']:
        definition, _ = one_function(source[baseline], name)
        parts.append('-- SOURCE: ' + baseline + '#' + name + '\n' + definition + '\n')
        parts.append('ALTER FUNCTION public.' + signature + ' OWNER TO postgres;\n')
        parts.append('REVOKE ALL ON FUNCTION public.' + signature + ' FROM PUBLIC,anon,authenticated,service_role;\n')
        grants = 'PUBLIC,anon,authenticated,service_role' if public_execute else 'authenticated,service_role'
        parts.append('GRANT EXECUTE ON FUNCTION public.' + signature + ' TO ' + grants + ';\n')
    return ''.join(parts).encode()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check',action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    for path, raw in generate(root).items():
        target = root / path
        if args.check:
            if not target.is_file() or target.read_bytes() != raw:
                raise SystemExit('Generated release file differs: ' + path)
        else:
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(raw)
    print('RELEASE_COMPOSITION=EXACT_SOURCE_NO_SQL_NO_NETWORK')


if __name__ == '__main__':
    main()
