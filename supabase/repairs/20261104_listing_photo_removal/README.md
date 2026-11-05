# Published listing photo removal — narrow SQL contract

This candidate adds one operation: remove one current non-primary photo while
at least one photo remains. It follows the accepted primary-image and completed
SOURCE contracts. It has not been run on the Mac or a hosted database by these
local tests.

The application-level decision and rollout boundary are documented in
[the module architecture](../../../docs/architecture/published-listing-photo-removal-v1.md).

## Transaction and authority

`remove_my_managed_listing_image_v1` accepts the same actor, active identity,
listing, original publication attempt, expected presentation revision and stable
ordinal arguments as the existing primary-image operation. It checks current
private ownership or active business membership using the retained actor lock.
The original publisher and original publication proof remain unchanged.

The target must be non-primary, and its SOURCE must satisfy the accepted
`hosted_completed_source_deleted_v1` proof. This restriction keeps removal from
stranding the SOURCE worker, which needs that slot's WEB to have no cleanup row.

One transaction inserts the exact WEB path into the existing cleanup ledger with
reason `published_image_removed`, removes exactly one public `listing_images`
membership and increments the existing presentation revision once. The resulting
gallery is validated again before the transaction can commit. Stale revisions
conflict, including a repeated command after a lost response; the client recovers
by reading the current gallery.

## Current gallery and historical proof

Original slots, ordinals, object paths, verified WEB receipts and publication
confirmation remain immutable. Current gallery ordinals may contain gaps. The
validator accounts for every original slot: either an exact active image row or
an absent image row with its exact WEB retirement record. Unexpected missing,
extra, duplicated or contradictory rows still fail closed.

Public and owner media binding functions require current exact membership and
no WEB cleanup row. The existing media transport already rechecks binding after
reading bytes; its implementation is reused. Owner status independently projects
current membership, keeping receipt/activity management available when a malformed
gallery causes the separate strict photo RPC to refuse changes. Earlier delivered
image bytes cannot be recalled from a user's device.

## Held WEB cleanup boundary

This repair does not delete a Storage object, authorize a WEB cleanup worker,
create physical deletion evidence, release WEB quota or add a scheduler. The
removed WEB stays private, queued and charged. The completed SOURCE worker and
`multipart_object_fully_deleted` remain unchanged. Pending SOURCE files in other
slots can still complete cleanup.

The published `final_receipt.files_remaining` field keeps its SOURCE-only
meaning. Adding a WEB retirement does not create a new visible SOURCE cleanup
prompt or invalidate the receipt's monotonic count. Whole-listing deletion later
retains the existing retirement reason and continues to count held WEB objects.

## Rollout and verification

The guarded SQL capability is applied before the new client action is deployed.
Before the first removal, the existing primary and owner reads retain their
wire shape and original contiguous gallery. An older client with a stale revision
cannot overwrite a newer removal. Sparse galleries require the new client parser;
an older parser fails closed instead of renumbering media.

`preflight.sql` and `verify.sql` are read-only. `apply.sql` accepts only the exact
prior capability, checks the resulting capability and preserves all other
observed functions, authority and table structures. The only table-structure
exception is the exact `final_cleanup_reason` constraint, which is included in
the capability fingerprint. No old installer or release is modified.

Local validation used retained declarations in isolated PGlite and synthetic
metadata: 20 runtime checks and 14 installation checks. Reports are under
`tests/`. No provider Storage calls, live database calls, native PostgreSQL
concurrency or real Mac/deployment evidence is claimed. The fresh Mac and hosted
preflight remains required before deployment.

From the repository root, with `SELQIRO_PGLITE_MODULE` pointing to the existing
installed PGlite module when it is not available through Node resolution:

```sh
node supabase/repairs/20261104_listing_photo_removal/tests/build-guards.mjs
node supabase/repairs/20261104_listing_photo_removal/tests/installation.mjs
node supabase/repairs/20261104_listing_photo_removal/tests/runtime.mjs
```

Importing the retained fixture loads declarations only; it does not rerun an old
test suite or installer. Documentation-only edits do not require repeating these
checks.
