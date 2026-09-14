# Owner horse-offer draft update v1

Base: `5f59250 Add owner horse offer read-only edit form`.
Migration: `20260913190000_add_owner_horse_offer_draft_update.sql`.

## Why a separate update contract

The existing `save_my_horse_offer_draft_v1` is a create/resubmit-style endpoint:
it permits draft/rejected, rebuilds details, clears lifecycle fields and does not
accept an expected revision. The create-form mapper also supplies null for private
location fields. Neither that mapper nor the display hydration is a lossless editor.

This contract updates only an existing, authorized `draft`. It creates no replacement
row and never calls the legacy save function internally. `horse_offers` stays the
canonical source; no shadow generic listing is written.

## Revision and snapshot

`horse_offers.edit_revision` is a positive bigint initially 1. A BEFORE UPDATE
trigger advances it for **every** horse-row update, including legacy/trusted writes.
The existing updated-at trigger is unchanged. Revision overflow fails closed.

`get_my_horse_offer_edit_snapshot_v1(uuid)` returns at most one row:

```ts
{ offer: ExistingOwnerHorseOfferRpcRow; edit_revision: string }
```

The nested `offer` is built from the existing owner-safe `get_my_horse_offer_v1`
contract, including its ownership checks and safe image metadata. Both fields are
read in one SQL statement/snapshot. A missing/inaccessible offer returns no row.
The existing read RPC, its output signature and current UI callers are unchanged.

Revision is an opaque decimal string in TypeScript. Do not convert it to Number.
Do not load an ordinary detail and fetch a revision later: that would risk pairing
old values with a newer revision. Use the new atomic edit snapshot.

## Update input and result

```ts
update_my_horse_offer_draft_v1({
  p_offer_id: existingUuid,
  p_expected_edit_revision: exactLoadedRevisionString,
  p_changes: { title: "Updated title" }
})
// One row: { offer_id: string, edit_revision: string, updated_at: string }
```

No defaults allow accidental create. Authenticated user and active identity come
from the server authority. Ownership is included in the row-lock predicate.
The server checks exact draft status and revision under that lock. The UPDATE
also includes identity/status/revision predicates as defense in depth.

A normalized no-op returns the same ID/revision/timestamp without writing.
Successful mutation advances revision once. Timestamp remains presentation/audit
metadata, not the concurrency token. A stale revision returns SQLSTATE `40001`
with `horse_offer_edit_conflict`. Do not automatically retry with a newly fetched
revision; retain unsaved user values and ask the user to reload/reconcile.

## Closed patch allowlist

A patch is a nonempty object limited to 64 KiB of serialized JSONB. Only selected
scalar keys are accepted. Omitted key means preserve; explicit null clears that
optional value. Required string fields do not accept null. Empty title/description
remain valid for an incomplete private draft. Unknown keys fail, even with null.

Common keys: `title`, `description`.

Concrete horse keys: `horse_name`, `birth_year`, `sex`, `breed`, `color`, `height_cm`,
`discipline`, `training_level`, `suitability`, `health_notes`, `behavior_notes`,
`price_type`, `price_amount`, `city`, `region`.

Lease/co-rider only: `recurring_fee_period` (`day`, `week`, `month`, `agreed_period`).

Wanted only: `wanted_preferred_sex`, `wanted_preferred_breed`,
`wanted_preferred_discipline`, `wanted_preferred_training_level`,
`wanted_intended_use`, `wanted_health_preferences`, `wanted_behavior_preferences`,
`wanted_budget_mode`, `wanted_budget_amount`, `wanted_city`, `wanted_region`.

Specific fields are rejected on wanted; wanted fields are rejected on concrete
horse offers. Wanted budget is never the seller price; search area is never the
horse's actual location. Free-transfer remains free through the existing constraint.

Numbers must be JSON numbers (or explicit null for optional numbers), not strings.
Birth year is integral 1900–2100; height is 1–300 with at most one decimal;
price/budget is 0–9999999999.99 with at most two decimals. No silent rounding.
Existing table constraints remain authoritative for scalar lengths, enums and price
relationships. Wanted nested-field limits match the existing draft-save contract.

## Preservation and deliberate exclusions

The private `apply_horse_offer_draft_patch_v1` helper validates the allowlist before
populating a candidate composite row. UI roles cannot execute it. The writer has
an explicit SET list; it never assigns arbitrary columns from a browser payload.

Details must have recognized schema version 1 and the matching branch. Expected
wanted/budget/search-area or recurring-fee containers must be objects. Unsupported
shapes fail instead of guessing. Only explicitly edited allowed leaves change;
unrelated keys and unrelated explicit nulls are preserved. The stored wanted
`preferred_sex = unknown` stays intact unless that field is deliberately changed.

Private location text/coordinates are never accepted in this patch. A title-only
save preserves them. A changed city/region while precise location exists is refused
with `horse_offer_private_location_requires_separate_edit` rather than silently
retaining contradictory coordinates or deleting private data. A future UI should
explain/disable that locality edit until explicit reconciliation is supported.

Offer type, market, currency, identity, creation metadata, status, publication-event
pointer, lifecycle dates, exact location, images, categories, policy acceptance and
Energy are outside the update allowlist. Offer type stays locked in the first owner
editor. It is not safe to turn seller facts into wanted preferences by changing a label.

The active EE policy capability is checked as in draft creation. No policy acceptance
or factual publication confirmation is recorded by saving a draft.

## Legacy writer transition boundary

The legacy save API is deliberately not rewritten in this server-only checkpoint.
Its updates advance edit_revision, so a **subsequent new-editor save** detects them.
However, the legacy endpoint itself still does not check an expected revision and
can still overwrite a newer save if a stale legacy create-form session writes last.
Do not claim system-wide lost-update protection yet.

Before exposing owner editing, coordinate the optional `Salvesta hilisemaks`
same-session update path with this new revision contract and retire/restrict legacy
updates in a separately validated migration/release. First creation may remain a
create operation. This transition must not silently break the existing create UI.

## Validation and rollout

The supplied runner verifies the reviewed base/source hashes, local Unix-socket
Docker context, local Supabase container and exact existing read/save function bodies.
It runs the new migration and the existing draft-save, existing owner-read and new
update tests inside one outer transaction using savepoints; it then rolls back the
entire migration/fixtures and checks the pre-test catalog/count snapshot again.
No reset, linked database URL, production command or automatic commit/push is used.
The local database must already contain the earlier horse foundations.

The new tests exercise all five offer types, no-op, two saves in one transaction,
stale snapshots, legacy-writer revision invalidation, exact large revision strings,
field/shape/type/permission rejection, private-field and nested metadata preservation,
optional null clearing, rejected/paused/closed/archived refusal, and untouched images,
publication events, policy acceptances and generic listings. They are sequential
transactional tests, not a multi-connection race test or browser test. Published and
held-for-review fixtures are not fabricated by disabling publication safety triggers;
the implementation rejects every status other than draft before applying a patch.

After local review, commit source separately; production preflight/apply/verification
is a distinct controlled step. This source checkpoint does not enable an editable UI.
