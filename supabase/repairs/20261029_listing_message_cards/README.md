# V2 per-message listing cards — 30 October 2026 installation correction

This is an additive, versioned read contract for the existing managed listing
conversation. It restores the data needed by V1-style listing attachment cards
without replacing the existing authorization or sender.

## Scope

Only `public.get_my_listing_conversation_v2(uuid,uuid,text,text,text)` is added.
Its owner is the existing restricted `selqiro_listing_contact_writer_v1` role;
only `authenticated` receives API execution. Existing v1 function bodies, their
ACLs, private helpers, role attributes, policies, tables and user rows remain unchanged.
The installer temporarily grants the existing writer CREATE on the public schema
for the ownership transfer, then revokes it in the same transaction. The exact
public schema owner and ACL must match their initial values before commit.
The existing v1 sender already accepts a listing ID and writes the canonical
`listing_id`, `listing_title`, `listing_image`, and `listing_price` snapshot.

The reader first calls `get_my_listing_conversation_v1`. That preserves active
account/identity validation, membership, peer readiness and the same 50-message
page/cursor. Only IDs in that authorized page are augmented. Old deployed
clients keep using the byte-identical v1 response; the new client uses a distinct
HTTP action and this v2 RPC, avoiding an incompatible change to strict parsers.

## JSON contract

The v1 response's existing fields retain their meaning, except
`schema_version` becomes `2`. Each message receives:

```json
{
  "listing": {
    "id": "197",
    "title": "Listing title at send time",
    "image": "/api/v2/listing-media/01000000-0000-4000-8000-000000000001/0",
    "price": "4376 EUR"
  }
}
```

`listing` is null when the message has no listing ID. Within a non-null card,
title/image/price are nullable strings. Price is the exact stored label: no
floating-point conversion, currency inference, truncation or current-price
substitution occurs. The client separately restricts which image URLs it loads.

Two top-level fields describe the explicit next-message attachment request:

- `attachment_listing_id`: exact canonical requested ID or null.
- `attachment_listing`: the current validated listing snapshot or null.

The fifth optional RPC argument is `p_attachment_listing_id`. Its preview must
be active, unexpired, published and owned by one of this conversation's exact
user/identity pairs. A valid but unavailable/unrelated requested ID is echoed
with a null preview; the client must not silently send the message without its
requested attachment. Noncanonical IDs are rejected. A normal inbox open with
no explicit ID gets no attachment, even if the conversation header has a listing.

## Snapshot and deletion behavior

Every historical card comes from that individual message's stored fields.
Contact about a second listing can update the conversation header without
relabeling earlier messages. Plain messages are never backfilled from the
header. The inherited conversation SHARE lock fences new contact/send and
current-header deletion. No listing lock is acquired after it, preserving the
writer's listing-before-conversation lock ordering.

All added card fields and the composer preview use one MVCC statement.
Historical listing deletion may scrub an earlier card independently of the
current header; the reader uses the actual message row and respects that scrub.
After the existing terminal scrub and FK `ON DELETE SET NULL`, the text remains
but the card is null. The reader does not reconstruct erased metadata from
receipts, another message, or a listing table join.

## Production installation

`changes.sql` is a source fragment for local schema composition, not a standalone
production command. Production uses the exact `preflight.sql`, `apply.sql`, and
`verify.sql` from the manifest through the prepared delivery runner.

The guard reuses the previous contact repair's catalog inspection verbatim and
requires its recognized **fixed** state. It then checks the new reader's complete
signature, body hash, restricted owner, security/config/defaults/ACL metadata,
absence of overloads and consumed column types. Unknown state is refused.

Preflight and verify are read-only and return only bounded flags and fingerprints:

```json
{
  "format": "selqiro-listing-message-cards-v1",
  "state": "absent",
  "recognized": true,
  "guards": {
    "base_fixed": true,
    "reader_state_known": true,
    "read_columns": true
  },
  "fingerprints": {
    "legacy_policies": "64 lowercase hex characters",
    "shared_helpers": "64 lowercase hex characters",
    "writer_role": "64 lowercase hex characters",
    "api_boundary": "64 lowercase hex characters",
    "hosted_settings": "64 lowercase hex characters",
    "patched_functions": "64 lowercase hex characters",
    "reader": "64 lowercase hex characters"
  }
}
```

`state` is `absent`, `applied`, or `unknown`. Apply accepts only recognized absent
state, creates the reader in one guarded transaction, verifies exact applied
state and the six unchanged base fingerprints, then notifies the PostgREST schema
cache. A direct repeated apply refuses; the delivery runner recognizes an already
applied reader through read-only verification and does not replay the mutation.

The 29 October package omitted the target owner's temporary schema CREATE grant.
PostgreSQL requires that privilege for a non-superuser to transfer ownership.
The existing hosted release uses a non-superuser postgres installer and already
uses this grant/transfer/revoke sequence for its v1 readers. This correction keeps
the v2 function body, read contract and read-only preflight/verification unchanged.
It adds only that transaction-scoped ownership setup and an exact public schema
ACL/owner restoration postcondition. A failure rolls back the function and grant.

## Targeted evidence

`evidence/message-cards-fixture-result.json` records **40/40 passing checks** in
PostgreSQL 18.6 / PGlite 0.5.13. The fixture loads the accepted source function
bodies, original legacy policies, synthetic users/listings/messages and the
separately accepted contact fix, then executes this exact guarded installation.
This run uses a non-superuser postgres with CREATEROLE/BYPASSRLS, the required
writer membership, and default function EXECUTE grants to anon/authenticated/
service_role. It reproduces the hash-pinned shipped SQL's `42501` failure
(`permission denied for schema public`), verifies the unchanged absent state
after rollback, then passes the corrected exact installation and full reader
suite. Forced failure immediately after owner transfer also restores the schema
ACL and leaves the reader absent. Success restores the raw schema ACL and owner
byte-for-byte and leaves the writer without CREATE on public.

That accepted fix is frozen byte-for-byte in
`tests/fixtures/accepted-contact-fix.sql` (SHA-256
`aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b`).
It is a synthetic test input only: the delivery runner must never execute this
fixture, and local schema composition does not include it. The test verifies the
hash before execution and no longer depends on a separately delivered repair
folder. `evidence/fixture-source-equivalence.json` relates this exact copy to the
retained earlier 37-check result and the current 40-check regression run.

Coverage includes guard rejection/rollback, v1 byte preservation, data-write
absence, restricted API permissions, both participants, unrelated/expired/missing
preview, same-pair multi-listing history, exact price label, identity/block/allowlist
checks, 50+4 pagination, terminal snapshot scrub/FK behavior, and v1 projection
compatibility. The source fragment also passed against the original local v1 reader
without hosted-only helpers. `tests/message-cards-fixture.mjs` retains the fixture.

Set `SELQIRO_INBOX_HOSTED_INSTALLER=1` and point
`SELQIRO_PREVIOUS_CARDS_APPLY` at the previous shipped `apply.sql` to run the
ownership regression. Its expected SHA-256 is pinned in the test. Set
`SELQIRO_PGLITE_MODULE` to an isolated PGlite 0.5.13 module path as needed; no
application dependency or lockfile changes are required. PGlite protects ALTER
ROLE postgres, so this synthetic mode sets its catalog flags directly during
fixture setup, before executing the exact production SQL. That setup is confined
to the test and is never included in apply.sql or executed by the Mac runner.

This is a single-connection synthetic test. No real accounts, messages, cloud
database, real Storage HTTP, full publication finalizer or multi-connection race
schedule were executed. Production application and browser behavior require
their own evidence; this file does not claim them completed.
