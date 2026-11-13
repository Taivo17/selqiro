# Provider discovery controls v1

This is a new, unapplied repair over the accepted service-activity release.
Earlier migrations, repairs and released packages remain unchanged. Run the
current guarded portal updater to install it; these files are not a second
installer or a reason to repeat an earlier release.

## Behavior

Temporary hiding is one account → provider identity preference. The database
captures the action time and hides that identity from discovery for exactly
24 hours. Switching the viewer's active identity does not reset the preference.
Expiration needs no worker. An explicit unhide keeps a UUID revision tombstone
so an older undo cannot remove a later hide. Replaying the same revision does
not extend its deadline; requesting an already active hide is a no-op.

The six ordinary, combined marketplace, service and legacy discovery RPCs
materialize the viewer's active hidden identities once, before filtering counts
and selecting a page. `/feed` uses `discovery_listings_v1`, a SELECT-only invoker
view over the same listings. Its explicit `listing_images` and
`listing_translations` computed relationships are invoker functions and retain
the related tables' RLS. Profile, detail, managed media and conversations do not
apply the temporary preference.

Permanent blocking uses the existing `public.user_blocks` account pair. The
new API does not write conversations, messages, participants, content, images,
categories, service activity, reputation or Energy. Existing messaging guards
continue to deny new contact and sending while preserving readable history.
The legacy search functions now apply the same bilateral account block before
their page selection. `get_store_by_slug` selects its existing canonical/legacy
slug candidate first and then applies the bilateral block, without falling back
to a different account's coinciding legacy alias.

## Authenticated RPC boundary

- `get_my_provider_control_v1(expected_user, target_type, target_id)` resolves a
  public content reference, profile identity or the caller's own preference.
- `list_my_provider_controls_v1(expected_user, kind, limit, offset)` reads only
  this account's active hidden providers or existing outgoing account blocks.
- `set_my_provider_control_v1(expected_user, target_type, target_id, action,
  expected_target_token, expected_revision, next_revision, expected_block_id,
  expected_block_created_at)` applies the explicit action with the relevant CAS.

`auth.uid()` must equal the expected account. Public content references retain
their original type and ID in the response. Listings use canonical signed
bigint text; horse offers and services use canonical UUIDs. The opaque target
token binds the viewer, original reference, resolved identity and resolved
account. It does not replace authorization. SET locks and resolves again before
checking the token. Hidden management targets use the stored identity; blocked
management targets use the caller's own block row ID. A missing management row
returns `target_available=false` and a null token, which is not proof that no
newer account block exists.

`conversation` is a GET-only target. It requires the actor's exact existing
thread membership and resolves the actual stored peer account and identity,
including a business member who differs from the business owner. It exposes
only the control state, grants no mutation, and does not infer an incoming
block from `can_send=false`.

Hide/unhide use a UUID revision. Unblock uses the exact block ID and timestamp;
timestamp precision must not be rounded. Input errors use SQLSTATE `22023`,
stale intent/CAS uses `40001`, and actor/ownership failures use `42501`. After an
unconfirmed transport outcome the client reads state; it never automatically
replays SET.

Ordinary and horse account blocking retains the item's existing author-account
meaning. Service and profile blocking uses the current canonical private owner
or business owner. This repair does not redefine all historical account and
business-transfer semantics.

## Installation guard

The generated read-only preflight and verifier recognize only the exact absent
or exact installed capability. The 16 guards retain the previous activity
contract and add the complete retained-activity fingerprint and canonical
account-block authority. That authority requires the source-defined owner, RLS,
five existing policies and absence of unexpected delete triggers, rewrite rules
or incoming foreign keys, plus the existing valid unique account-pair index and
primary ID index. No old grants or policies are rewritten.

Exactly seven deliberately replaced readers are represented by their original
source-derived function facts inside the retained verifier. Their actual full
definitions, ACLs and overloads are independently included in the new capability
fingerprint, along with all new functions, schema objects, table authority,
column grants, indexes, foreign keys, view properties and computed relationships.
No changed function is omitted from both comparisons.

One new `(blocked_id, blocker_id)` index supports incoming account-block sets.
Only this exact index is excluded from the retained structural invariant; its
actual definition, owner, kind and valid/ready state are included in the new
capability. The existing unique `(blocker_id, blocked_id)` index remains intact.

Apply uses one transaction, a release-specific advisory lock and bounded lock
and statement timeouts. It verifies all guards and dependency/hosted invariants
again before committing, then notifies PostgREST to reload its schema. Exact
installer replay leaves existing preference rows, deadlines and blocks intact.

## Local evidence and limits

`guard-generation-result.json`, `runtime-result.json` and
`installation-result.json` record the checks actually run and their exact input
hashes. `tests/wire-examples.json` contains synthetic responses for the real
TypeScript parser contract. The fixture imports retained declarations, not old
test suites, and installs into disposable PGlite PostgreSQL/WASM only.

`query-plan-result.json` records bounded EXPLAIN ANALYZE checks over 16,416
synthetic preference rows, 10,220 synthetic account blocks and 240 listings.
The hidden set is materialized once and uses the viewer/expiry index. The
reverse block index addresses the incoming lookup observed in
`query-plan-before-reverse-index.json`; these are planner checks, not evidence
of production capacity or millions of concurrent searches.

This evidence does not claim concurrent-session execution, production Storage,
Mac installation, deployment, a live PostgREST schema cache or browser acceptance.
After the guarded Mac installation and a Ready deployment, verify an actual
search hide/undo, My Area management, the legacy feed embeddings, direct profile
access under a temporary hide, and the separate block/message-history path.
