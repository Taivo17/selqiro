# Controlled messaging restoration — 30 October 2026

This additive repair provides the V2 inbox and conversation API for the existing
`public.conversations`, `public.conversation_participants` and `public.messages`
tables. Historical V1 messages and current managed messages remain in those same
tables. The repair does not copy messages into a second inbox, rewrite old message
content, infer missing identities, or change the bodies/ACLs of the four existing
V1 contact/message RPCs or the accepted V2 listing-card reader.

## Installation and verification

The supplied Mac installer owns the deployment journal and Storage bucket setup.
Do not execute old releases or old repair files as a way to install this change.

1. Run `preflight.sql` read-only through the intended project's SQL management
   connection. It checks the accepted contact fix and listing-card reader, their
   exact function bodies/metadata/ACLs, the existing contact writer, source-defined
   policy boundaries and the intended hosted project/release/instance.
2. A fresh SQL state can report `state: "absent"`, `recognized: true`,
   `bucket_state: "absent"`, `ready_to_apply: false`. Create only the new bucket
   through the Storage admin API, then read it back and rerun preflight:

   ```json
   {
     "id": "message-attachments-v2",
     "name": "message-attachments-v2",
     "public": false,
     "file_size_limit": 2000000,
     "allowed_mime_types": ["image/webp"]
   }
   ```

3. `apply.sql` requires the exact fresh state and the exact private bucket. Its
   transaction installs the new objects, verifies their catalog fingerprints,
   compares all protected invariants and commits only if every comparison holds.
   The temporary `CREATE` privilege needed to transfer public function ownership
   to the existing constrained writer is revoked in the same transaction. The
   public schema ACL must match its original value exactly.
4. Run `verify.sql`. Accept only `state: "applied"`, `recognized: true`,
   `bucket_state: "ready"`, all guards true, and the same protected invariants.
   A known installed state is verified, never blindly reapplied.
5. Deploy the matching application source after SQL verification. The runner must
   reconcile an unknown network outcome by reading the catalog and its journal;
   an unknown or partial state is never overwritten.

Missing or changed objects, unexpected overloads, changed function security,
extra private helpers, weakened Storage restrictions and a missing bucket after
installation produce an unknown state. A failed post-install verification rolls
back functions, tables, triggers and temporary grants together.

### Storage policy authority and catalog compatibility

The authority guard accepts either native table-owner privileges or the provider's
registered Supautils policy grant. The latter requires a `pg_catalog.pg_settings`
entry named `supautils.policy_grants`, with `context = 'sighup'` and
`vartype = 'string'`, a valid role-to-table-array mapping, the exact current user
`postgres`, and a permitted table name resolving to `storage.objects`. Identifiers
are parsed and quoted before lookup so numeric OID strings cannot stand in for
table names. An arbitrary custom setting, malformed mapping, other role, other
table or substring match cannot authorize installation.

This check changes no role membership, table ownership or policy definition.
The same `CREATE POLICY` statement still runs under the database's real permission
checks inside the guarded transaction. A provider permission failure aborts that
transaction. Preflight and verification remain `BEGIN READ ONLY` / `ROLLBACK`.

The structure fingerprint pins column `attnotnull` on PostgreSQL 17 and 18.
PostgreSQL 18 also records named NOT NULL constraints in `pg_constraint`; only
those duplicate relation rows are omitted from canonical constraint JSON. Every
omitted row must remain validated, enforced, local, nondeferrable, nondeferred,
without inherited/parent state or `NO INHERIT`, and bind exactly one non-null
column. PostgreSQL 18 requires one such row for every non-null column. The new
tables may have no inheritance edges. All other constraints remain exactly pinned.
This accepts the two catalog representations without accepting weaker nullability.

The correction preserves all three fresh-state fingerprints and the report shape
from the preceding package. It does not alter `changes.sql` or any runtime RPC.

### Report contract

`preflight.sql`, `apply.sql` and `verify.sql` each return one JSON `result` object.
The SQL execution adapter must locate that result rather than mistake the advisory
lock's empty result row for the report.

- `format`: `selqiro-messaging-restore-v2`.
- `state`: `absent`, `applied` or `unknown`.
- `recognized`, `ready_to_apply`: booleans.
- `bucket_state`: `absent`, `ready` or `unknown`.
- `required_bucket`: the exact metadata above in a successfully inspected report.
- `guards`: `base_contract`, `bucket_contract`, `required_columns`,
  `known_object_state`, `storage_row_security`, `storage_policy_authority`,
  `existing_message_triggers`.
- `invariants`: `reader`, `writer_role`, `api_boundary`, `legacy_buckets`,
  `hosted_settings`, `legacy_policies`, `patched_functions`, `public_schema_acl`,
  `protected_functions`, `legacy_storage_policies`, `existing_message_triggers`.
- `fingerprints`: `new_guard`, `new_functions`, `new_structure`.

Invariant values are SHA-256 catalog fingerprints. Compare the complete invariant
object before/after and on resume. The synthetic fixture's project-independent
bucket/policy fingerprints are not a production baseline to substitute for the
project's own recorded preflight. An inspection exception returns unknown with a
`probe_code` and closed guards; it cannot authorize an installation.

## Authorization and history

Every browser-authorized RPC calls the existing hosted actor guard. Its verified
JWT subject, active selected identity, ownership/business membership, pilot
allowlist and existing release conditions remain authoritative. The new read
metadata helper exposes only the two conversation identity cards:
`{identity_id, name, avatar_url}`. It does not expose the other account's user ID.

A historical thread is eligible only when its stored buyer and seller account/
identity pairs are non-null and distinct, both exact participant rows exist,
there are exactly two participants, and any managed channel registry agrees with
those same pairs. There is no user-only fallback, group interpretation or
null-identity guess. Inactive/unavailable peers can still have readable historical
threads, while the server refuses new sends to an unavailable peer.

The new schema `messaging_private_v2` contains only read watermarks, idempotency
receipts and private photo reservations. It contains no second message store.
Browser roles have no direct access to that schema or its tables. The existing
contact writer is the owner of the authenticated public functions; private helpers
remain explicitly closed to browser roles. Service photo settlement/cleanup
functions are executable only by `service_role`.

### Thread and inbox RPCs

All functions accept `p_expected_user_id` and `p_expected_identity_id` where the
caller is an authenticated application user. All returned browser envelopes have
`schema_version: 2`, `actor_user_id` and `identity_id`.

| RPC | Additional arguments | Result |
| --- | --- | --- |
| `list_my_message_threads_v2` | Optional `p_before_updated_at`, `p_before_conversation_id` together | Up to 50 threads, own identity card and strict `(updated_at, conversation_id)` cursor; peer card, listing title, short preview, unread flag and `can_send` per thread |
| `get_my_message_thread_v2` | `p_conversation_id`, optional `p_before_message_id`, optional `p_attachment_listing_id` | Own/peer cards, send/block state, header listing, messages, older-page cursor and matching optional attachment preview |
| `send_my_message_v2` | `p_request_key`, `p_conversation_id`, `p_message`, optional `p_listing_id`, optional `p_attachment_id` | `action: "send"`, request key, message ID and `replayed` |
| `mark_my_thread_read_v2` | `p_conversation_id`, `p_through_message_id` | `action: "mark_read"`, effective monotonic `through_message_id` |
| `hide_my_thread_v2` | `p_conversation_id` | `action: "hide"` |
| `set_my_thread_block_v2` | `p_conversation_id`, `p_blocked` | `action: "block"` or `"unblock"`, `blocked_by_me`, `can_send` |

Inbox activity uses the stored update timestamp, falling back to creation time for
old null timestamps. Message pages show the newest messages first for fetching,
then return that page in chronological ID order. A page contains at most 50
messages and at most 1,400,000 bytes of accumulated PostgreSQL message JSON. Its
cursor can therefore be present on a page shorter than 50 messages.

Ordinary new text is limited to 5,000 Unicode characters and 20,000 UTF-8 bytes.
Legacy message text up to 20,000 characters is retained in reads. Longer old text
is explicitly identified with `text_truncated: true`; normal messages have false.
Legacy null text is represented as an empty string, including old photo messages.

Each listing card uses that message's own persisted listing snapshot. Historical
messages are not retrospectively given the conversation's latest listing card.
The optional draft preview is separately validated and returned together with the
requested `attachment_listing_id`; send independently revalidates/locks the
selected live listing. Existing terminal listing snapshot scrubbing remains
permitted by the retained guard.

### Sending, hiding, blocking and reading

A send receipt is bound to the account, identity, conversation, request key and
SHA-256 of the immutable text/listing/photo intent. Replaying the same intent
returns the same committed message ID, including after a later block. Reusing a
key for a changed intent is rejected. A new send checks both directions of the
existing account block table and captures listing snapshots inside its database
transaction. A photo-only message is allowed only with a ready owned attachment.
An empty text-only message is rejected.

Hiding changes only the caller's participant row; it does not delete message
content or the other participant's view. A new authorized message restores the
participants' hidden flags. Account blocking uses the existing `user_blocks`
table through a narrow private helper, with no new broad write policy. The public
response never reveals a separate `blocked_by_peer` flag.

The added INSERT trigger also checks legacy direct inserts: actual authenticated
sender/selected identity, exact membership, current identity access and account
blocks. It takes the same short block/conversation/participant locks, then assigns
a legacy insert's final message ID after the conversation lock. This prevents a
previously allocated lower ID from committing later below an already acknowledged
read watermark. Existing V1 `INSERT ... RETURNING id` receives the final ID. The
new sender preserves its preallocated ID through its exact private deferred
receipt. Existing message IDs are untouched. Preflight also requires the existing
bigint message sequence to increment by one, use `CACHE 1`, stay positive without
cycling, and remain usable by the constrained writer. Cached ranges across pooled
database sessions could otherwise break the visible-ID ordering guarantee.

A read acknowledgement must refer to a real message in the requested conversation.
The first V2 watermark is exactly the submitted visible message ID; later marks
cannot move it backwards. A concurrent message with a greater ID remains unread.
The legacy `last_read_at` can advance only to the displayed message's timestamp,
never to the current wallclock.

Before a V2 watermark exists, the inbox uses the existing V1 timestamp as its
initial historical unread fallback. After a V2 watermark exists it stays
authoritative. A later read in the old V1 interface may therefore remain unread
in V2 until the V2 thread is opened. Importing V1's wallclock marks after that point
would reintroduce the old unseen-arrival race. The V1 interface was not changed in
this repair.

## Private photo lifecycle

The browser prepares a bounded WebP transport. The server independently decodes
and normalizes it, claims the exact output manifest, uses a create-only Storage
write and verifies any existing object's exact bytes/hash before recovering an
ambiguous attempt. The original client file is not trusted server input.

| Limit | Contract |
| --- | --- |
| Prepared transport | WebP; 1–1,400,000 bytes |
| Stored output | WebP; 1–2,000,000 bytes; width and height each 1–1,600 |
| Reservation | 30 minutes; exact actor, identity, conversation, request key, source hash/size/type |
| Rate | At most 10 new reservations per hour and 100 per day per account; at most 100 MiB of prepared bytes per day |
| Active reservations | At most 10 unexpired `reserved`, `uploading` or `ready` rows per account |
| Retained byte budget | 250 MiB per account across attached/reserved/tombstoned rows; unclaimed output reserves 2,000,000 bytes and a claimed output charges its frozen size |
| Cleanup batch | At most 3 immutable paths; 5-minute lease |

Cancellation does not erase a rate/budget reservation. This conservative pilot
budget includes tombstones whose earlier upload outcome might be ambiguous.
Reclaiming that budget is deliberately not an unverified automatic state change.

### Photo functions

The authenticated reserve/cancel/read-binding functions use the same actor and
thread guard as the messaging functions. The server strips bucket/path and
manifest data from browser JSON and serves authorized image bytes by conversation
and message ID.

- `reserve_my_message_photo_v2(expected user, expected identity, request key,
  conversation ID, source SHA-256, source bytes, source MIME)` returns the exact
  reservation. Same-key source/identity/conversation mismatch is rejected.
- `claim_message_photo_upload_v2(attachment ID, expected user, expected identity,
  source SHA-256, claim key, web SHA-256, web bytes, width, height)` is service-only.
  The first claim freezes the output manifest and upload key. Replays return that
  original key. Changed output bytes/dimensions cannot overwrite it.
- `finish_message_photo_upload_v2(attachment ID, claim key, outcome, web SHA-256,
  web bytes, width, height, optional failure code)` is service-only. Outcomes are
  `ready` or `failed`. An unknown HTTP outcome must remain `uploading`; it is not a
  claim that the object was removed or that a write cannot arrive later.
- `cancel_my_message_photo_v2(expected user, expected identity, conversation ID,
  attachment ID)` tombstones an unattached owned reservation. An attached photo
  cannot be canceled, detached or cleaned by this operation.
- `get_my_message_photo_binding_v2(expected user, expected identity, conversation
  ID, message ID)` returns the authoritative binding to the authenticated server
  caller. The app's route returns only authorized bytes to the browser.
- `claim_message_photo_cleanup_v2(claim key, limit)` and
  `finish_message_photo_cleanup_v2(attachment ID, claim key, removed, optional
  failure code)` are service-only and act on tombstones/expired unattached rows.

New objects have one immutable path:
`message-attachments-v2/<conversation ID>/<attachment UUID>.webp`.

The SQL photo row follows `reserved → uploading → ready → attached`, or moves from
an unattached state to a permanent `tombstoned` state. Attachment changes, send
receipt creation and message INSERT are one transaction with deferred foreign
keys. Any failed message INSERT rolls all of those changes back. A second message
cannot attach the same photo. Newly attached private photo messages cannot have
their sender/conversation/content/path binding edited or deleted by a legacy
endpoint.

A tombstone never becomes ready/attached after a late upload response. Cleanup
records the result of a bounded deletion attempt and revisits the path hourly for
the first attempts/failures and daily thereafter. It never claims a terminal
"deleted forever" state or removes the ledger row. Attached objects are excluded
from cleanup under the same row lock that protects attachment.

The new bucket is private. A restrictive `FOR ALL` policy for `anon` and
`authenticated` denies the new bucket even if a permissive old Storage policy
would otherwise grant access. The service role is the only app path for new
object reads/writes. No browser signed-upload URL or raw new image URL is used.
The existing `messages` bucket and all its policies/data remain unchanged. A proxy
for an old image does not retroactively make an already public V1 object private.
Old message images are served only from their stored, safely validated
`<conversation ID>/<filename>` path in `messages`; arbitrary old `image_url`
values are never fetched as remote URLs.

## Files and local evidence

- `changes.sql`: reviewed declarations used by guarded production apply and the
  separately guarded fresh local schema composition.
- `preflight.sql`, `apply.sql`, `verify.sql`, `catalog-guard.sql`: generated exact
  catalog gates. `apply.sql` is self-contained, not a sequence of unguarded files.
- `function-pins.json`, `structure-pins.json`: reviewed local PostgreSQL catalog
  shapes embedded into the gates.
- `build-guards.py`: deterministic local file generator; it does not connect to a
  database. Changes to a definition require new fixture evidence, reviewed pins,
  regenerated gates and installation checks.
- `tests/messaging-runtime.mjs`: focused synthetic PostgreSQL behavior tests.
- `tests/installation-runtime.mjs`: exact fresh/installed/unknown/refusal/rollback
  tests with default API grants and a hosted-like non-superuser installer.
- `tests/storage-authority-runtime.mjs`: separate-owner negative cases, a spoofed
  custom-setting rejection, exact registered-setting parser cases, and proof that
  native SQL still rejects policy creation without actual authority. Positive
  parser cases model metadata; they do not claim an installed Supautils C hook.
- `tests/pre-authority-fresh-fingerprints.json`: retained fresh-state fingerprints
  used to check continuation compatibility with the preceding package.
- `tests/messaging-wire.json`, `tests/photo-wire.json`: actual synthetic SQL results
  for checking the strict TypeScript/API parsers, not invented response mocks.
- `tests/*-result.json`: local results and explicit test scope.

Example local invocation with an existing PGlite module:

```sh
SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261030_messaging_restore/tests/messaging-runtime.mjs
SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261030_messaging_restore/tests/installation-runtime.mjs
SELQIRO_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js \
  node supabase/repairs/20261030_messaging_restore/tests/storage-authority-runtime.mjs
```

These tests use source-defined helpers, triggers, RLS and synthetic identities.
They do not query or modify a live database, send a real message, test real Storage
HTTP, or simulate two independent database connections at once. Their late-ID
case explicitly recreates allocation before a later visible/acknowledged message;
locking behavior and native service integration remain distinct verification
layers.
