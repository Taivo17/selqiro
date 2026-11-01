# Managed listing primary image, version 1

This additive capability changes which existing published photo is primary. It changes the selected `listing_images.is_primary` flags, the `listings.image` mirror and a private presentation revision. It never renumbers slots, changes media URLs, uploads/deletes objects, edits publication receipts, changes listing status or releases held cleanup.

## RPC contract

`get_my_managed_listing_images_v1(expected_user uuid, expected_identity uuid, listing bigint, attempt uuid)` returns:

```json
{
  "schema_version": 1,
  "actor_user_id": "current authenticated editor UUID",
  "identity_id": "current active identity UUID",
  "listing_id": "positive bigint as text",
  "attempt_id": "immutable publication UUID",
  "revision": "0",
  "images": [
    {"ordinal": 0, "url": "/api/v2/listing-media/<attempt>/0", "is_primary": true}
  ]
}
```

Images remain sorted by immutable slot ordinal. Reading does not create a presentation row. A published listing without photos returns an empty array.

`set_my_managed_listing_primary_image_v1` takes the same actor/listing/attempt keys plus `p_expected_revision text` and `p_ordinal integer`. It returns the same envelope with `changed: boolean`. The revision increments only when the selected primary changes. An already-selected target is a no-op only when the supplied revision is current. Every stale revision fails with SQLSTATE `40001` and `listing_images_conflict`, including a retry after an uncertain successful response. The client must refresh before another explicit choice.

Bad command values fail with `22023`; actor/identity/binding denial with `42501`; nonpublished or corrupt gallery state with `55000` and `listing_images_unavailable`. Revisions are decimal strings through signed-bigint maximum, not JavaScript numbers.

## Authority and consistency

The existing hosted gate, authenticated actor, active identity and active business membership are locked first through a narrow postgres wrapper. An active business member can edit identity-owned content; the original author remains bound to the immutable attempt and listing/image creator fields. API roles receive only the two new public RPC execute grants.

Read/write locks follow the terminal-delete order: actor, attempt, publication, listing, image rows. Reads take shared gallery locks; writes take exclusive locks. The attempt lock also serializes the initial revision-zero case. A private RLS table retains the monotonic revision. Its trigger rejects removal/reset, rebinding and nonsequential updates. Only the existing NOLOGIN final writer receives narrowly scoped table/helper privileges.

Before returning or changing a gallery, SQL checks the complete slot-to-image mapping, contiguous immutable ordinals, exact canonical URLs in all three URL columns, image ownership, exactly one primary and its listing mirror. Every slot requires its exact private WEB object and immutable ready receipt, checked by the existing `validate_web_intent` function. Its closed helper dependency is reached through a private postgres validator wrapper; retained helper ACLs stay unchanged. A WEB object already queued for cleanup is rejected. SOURCE cleanup is neither required to finish nor changed.

The legacy `set_listing_primary_image_v2` remains blocked on managed listings. It renumbers sort positions and is unsuitable for immutable media URLs.

## Guarded delivery

Use the accompanying checkpoint installer and `apply.sql`, not `changes.sql` directly. `preflight.sql` and `verify.sql` are read-only and return exactly one `{result: ...}` row. They recognize `absent`, `applied` or `unknown` state. The report includes the hosted context, nine boolean guards, dependency/capability fingerprints and three invariant fingerprints.

Critical retained function definitions and owners are pinned to the accepted source. Required columns, immutable/managed triggers, RLS, final-writer role and policy boundaries and hosted Storage contract are checked independently. All observed existing private function definitions/ACLs, private structures, relevant public table structure, schema/role authority and hosted configuration/allowlist are fingerprinted as invariants. A single transaction requires a recognized absent state, creates the capability, verifies its exact catalog shape and checks unchanged invariants before commit. Unknown states and reapplication are refused.

The report's invariant hashes describe the inspected database and need not equal the synthetic fixture's example hashes. The installer must preserve and compare its own fresh observation, pin the externally verified project/instance, and verify an uncertain apply outcome before deciding anything further. The SQL scripts do not perform Storage calls or provision buckets. Existing release SQL and historical migrations stay unchanged.

### Retained-source guard correction

The preceding package's fixture selected `final_receipt` from `20_publication_core.sql` even though the retained release replaces it in `30_multipart_and_journey.sql`. It also synthesized unconditional public final-writer policies. The original public policies use `current_user_has_identity_access`; only the private `final_internal_writer` policies are unconditional. Both fixture mistakes made the preceding preflight reject the actual retained hosted contract.

The corrected fixture selects the final multipart receipt and its exact helper, tables, metadata view and closed role grants. Every selected hosted function is compared with the final declaration in the complete retained `release.sql`, and all loaded declaration files are source-pinned. Public policy predicates, target roles, command and permissiveness are now pinned to their exact retained definitions. The independently compiled dependency fingerprint is `fb89562d7bb6e653b53e3baad61ae32dc6a64aa1578051a2eed4f50cbf8af4e3`; it is derived from retained source, not an accepted live-catalog hash.

`changes.sql` is byte-identical to the preceding package (`6e131c70b2dc941b411588f2e6585c5bf3a85b23b50f2e2dc19d766ff1297714`). This correction changes neither the capability behavior nor the retained database policies/functions. The report shape and its nine guard names are unchanged. A byte-identical, read-only historical preflight fixture demonstrates the preceding two-guard rejection against the corrected retained-source fixture.

## Verification

Tests execute SQL in disposable PGlite PostgreSQL 18 with a nonsuperuser schema role, actual authenticated roles, retained hosted actor/identity functions, recursive legacy identity RLS, the exact original public final-writer policies and immutable/managed guards. `source-pins.json` prevents tests or guard regeneration from silently adopting changed retained declarations. The fixture uses synthetic rows and does not read live credentials, accounts, messages or photos.

Run with an installed PGlite module, without installing dependencies or contacting a provider:

```sh
SELQIRO_PGLITE_MODULE=/absolute/path/node_modules/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261101_listing_primary_image/tests/run-tests.mjs
```

Current evidence: 26 runtime checks and 19 guarded-installation checks pass. Runtime tests cover actual flag/mirror/revision changes, immutable-row preservation, no-op and stale CAS, two previously read editor snapshots, rollback after a mid-write failure, empty and malformed galleries, active-identity changes, business membership/revocation, legacy writer denial and API/private privilege boundaries. The original public policies independently block the internal writer from changing another identity's listing or images. The latest receipt remains `deleting` when synthetic terminal content is gone but multipart auxiliary proof is absent, even if a synthetic cleanup row claims final-object deletion.

Installation tests cover collisions, changed dependencies/triggers/authority, rollback after failed postverification, invariant equality, exact verification, repeat refusal and catalog drift. Regression checks reproduce the preceding preflight's two false guards, reject the obsolete core receipt, reject replacement of either public identity predicate with `true`, and reject expansion of a writer policy to `PUBLIC`. None of those unknown states is automatically repaired or overwritten.

Limits: these are PostgreSQL 18/PGlite tests, not a native PostgreSQL 17 concurrency test, provider/Supautils test, Storage test or live deployment verification. The two-editor CAS test is sequential; it does not claim two independent concurrent database sessions. The existing terminal-delete function is exercised on a synthetic empty listing with an explicitly documented never-evaluated cleanup helper dependency. The image-bearing terminal receipt regression seeds its terminal SQL state and incomplete multipart evidence; it does not execute the cleanup protocol or claim provider deletion. No file deletion is exercised. Accepted source pins come from the reconstructed accepted checkpoint, not a fresh observation of the user's Mac.

Adding/removing/reordering published photos requires a separate reviewed immutable-media revision contract and is intentionally outside this capability.
