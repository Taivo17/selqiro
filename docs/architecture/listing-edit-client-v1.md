# Listing edit client v1 — account-bound atomic read/save connection

2026-10-10. Candidate built on 7f2db6bc11ad0384ae1cf077c896f2ee77d9ea24.
This is a real client/session implementation and two thin SQL adapters, NOT route activation
or permission to deploy the price labs. Read the installer result for actual execution.

## One connection, not another money model

listingEditClient.read → get_my_listing_edit_v1 → existing get_my_listing_basics_v1.
listingEditClient.save → save_my_listing_edit_v1 → existing save_my_listing_basics_v1.
The adapters add exact expected JWT actor binding and the returned actor envelope. The
retained inner functions still own active identity, raw basics CAS, price revision,
normalization, row locks and one atomic transaction. No client direct-table fallback.

Why actor binding is required: two different accounts may both be active members of one
business identity. A client pre/post-auth observation is not proof of which JWT was used
by the write. The adapter checks p_expected_actor_id against auth.uid() before delegation.
Navigation and expected IDs never grant access. All API execution grants remain revoked
in the candidate; the regression suite temporarily grants authenticated inside rollback.

## Module boundaries

- entities/listing/model/listingEditSnapshot.ts: exact full snapshot/envelope parsing,
  string IDs/revisions, raw nulls, original legacy text and stored-price validation.
- entities/listing/model/listingEditCommand.ts: normalized scalar basics, exact raw expected
  basics and optional new price/revision pair; strict canonical save acknowledgment.
- entities/listing/api/listingEditClient.ts: existing singleton and minimized actor helper,
  one bounded RPC, actor checks, no retry, safe cancellation and explicit error outcomes.
- features/listing-edit/model/listingEditDraft.ts: reuse existing price input/draft rules.
- features/listing-edit/model/listingEditSession.ts: per-editor immutable state, synchronous
  in-flight lock, context generations and explicit read-only reconciliation.

No entity imports feature state. No new client configuration, package, router framework,
localStorage/sessionStorage cache, autosave or mandatory visible draft step.
The session is prepared for a later React subscription; it is not mounted by current routes.

## Exact values and canonical outcomes

Four kinds remain fixed/free/negotiable/unspecified. Fixed zero is not free. Amounts stay
strings. The frozen 154-code registry is reused unchanged; no FX or currency inference.
Stored historical currency is readable even when not allowed for NEW input. Unchanged
price AND price revision are omitted together. Raw expected title/description/condition
retain null and whitespace; a complete submitted basics object follows the existing SQL
normalization (including an entered empty description). No arbitrary details or location
are sent in this command. A successful response must match requested actor/identity/ID,
normalized basics, change flags and the allowed price-revision progression.

When price is omitted, another edit's newer price may appear in the authoritative response;
this request does not claim to have changed or CAS-checked that price. An explicit price
must have the exact expected revision, even if its normalized value would be a no-op.

## Cancellation, identity and uncertain writes

The whole preflight/RPC/postflight is bounded to 20 seconds. Cancellation is not a rollback
receipt. A preflight finishing after cancellation cannot dispatch a late write. A failed
post-write actor read is unknown, not proof that the already completed write was rejected.

One session is tied to account + identity + listing. All auth/identity transitions MUST be
delivered by later route integration before enabling actions. A→B blocks editing; returning
to A preserves an idle draft. A transition during a write invalidates its result and requires
review. Account logout/change permanently closes the session and clears its plaintext.
Ordinary reload never overwrites a loaded draft. A synchronous lock suppresses double clicks.

Unknown/conflict results retain input and block another save. Reset must not bypass that
gate. Explicit reviewSaved reads only and keeps the original draft/revision separate.
useReviewed(true) is an explicit discard after the reviewed server version was shown;
no implicit rebase, merge or replay occurs. Editing invalidates a previously reviewed version.
The route must not label an unconfirmed write as failed or auto-retry it.

## Test boundary and composition

Only NEW tests are run: 28 targeted SQL assertions and 10 real SQL JSON captures, then
108 Node cases (107 module/transport/session cases plus full captured-response parity).
TypeScript strict checks use the repository ES2017 target and two declared existing client
boundaries; the subsequent full Mac build checks real project imports.

SQL test composition: unchanged seven-table fixture and seed, retained core 01–03 and
basics 04–05. ONLY the 16-code CREATE FUNCTION in 01 is replaced in the disposable batch
by the exact generated 154-code CREATE FUNCTION; the retained normalizer and all source
files remain byte-identical. The batch and per-source line/hash map are exported.
The new two adapter functions and test-only grants exist only within outer rollback.
Before/after checks compare selected schema, ACLs, functions, constraints/indexes/triggers,
policies, roles/default grants and seven empty tables; then only this helper is removed.
Sequence values are not a promise of transactional rewind. No persistent local installation.

This is PostgreSQL 17.6 with selected schema and synthetic auth/rows, not full Supabase,
real HTTP/JWT transport, browser integration or load evidence. No new multi-connection
race suite is claimed; existing core concurrent-test evidence remains separate.
The Node transport, timers and actors are synthetic; actual parsers consume the new SQL capture.
Preparation alone does not establish these real SQL or full-project build outcomes.

## Current application remains unchanged

Current ListingEditPage, old basics writer, galleries, classification/store assignment,
horse editor, renewal and all four public/owner price surfaces are not reconnected here.
The navigation proposal remains separate context within the same edit/view flow. No new
back link, departure guard, server API opening or protection of existing image reloads is
claimed. Current source refactor deployment was user-accepted Ready/Production on 10 Oct.

## Remaining activation gate — finish this same price-edit release

After reviewing this local result and finishing its exact source checkpoint, assemble the
retained price write/read modules plus these adapters into a controlled release (outside old
labs; do not edit any applied migration). Validate current direct/SECURITY DEFINER writers,
roles, HTTP calls and the release compatibility of all existing clients before opening new
writes. Existing postgres-owned legacy writers are NOT globally retired by these adapters.
Production preflight and explicit application consent remain separate. Then connect one
four-kind price component to the full snapshot/session, integrate image/unsaved action
boundaries and the accepted contextual return flow, test real browser/identity/concurrency,
and display the same canonical value in detail/search/profile/My Area.
Do not introduce another registry, generalized form framework or unrelated feature.

Energy/payments wait until create/edit/find/contact and visible actions/links work.
AI, FX, crypto, units, new creation/publication and test-listing cleanup are not in this step.
