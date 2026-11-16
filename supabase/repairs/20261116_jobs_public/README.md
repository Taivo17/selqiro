# Public business jobs — additive release

This release adds one canonical `public.jobs` domain. Public search, public employer profiles, direct job links, owner management and message context all use that domain. It does not create numeric marketplace listings for jobs or copy jobs into a second search table.

## Product and authority

An active business identity, its active business account and active membership are checked on every owner operation. The existing account/identity lock, hosted-preview boundary and policy foundation remain authoritative. Personal identities cannot create or manage jobs. The application can present a single Publish action while the server separately saves a durable draft and publishes it after the displayed current terms are accepted.

The first publication lasts one calendar month in UTC. Explicit renewal sets the deadline to the later of the existing deadline or one month from the current server time. It does not add another month to an already future deadline, change organic publication time, or resume a paused/closed job. All job wire timestamps are UTC, independently of the database session timezone.

Public search is enabled from the first release. Search, employer profile and detail enforce the same publication, expiry and active-business conditions. Existing bilateral account blocking applies to all three public reads; the existing 24-hour provider hiding applies only to discovery. Public search orders by `(published_at DESC, id DESC)` using a bounded cursor and one extra row for `has_more`. Owner pages use `(created_at DESC, id DESC)`. No deep OFFSET or exact global count is introduced.

Optional pay uses exact decimal strings and the existing currency/minor-unit validator. Structured location, category, employment, working-time and workplace fields are stored independently from the public-text search document. This release does not infer precise private addresses or add new image upload/storage paths.

## Request reconciliation

Every owner mutation has a caller-generated UUID request key. One actor/key is permanently bound to its active identity, operation and exact original JSON request. The existing actor lock serializes same-account commands. Job changes, policy acceptance and the receipt commit atomically. Reusing a key with another operation, identity or payload fails.

`get_my_job_request_v1` is an authenticated READ. It returns either `found:false` or the exact original request and committed result under the same actor/identity. A missing reply is reconciled by reading; a not-found receipt does not prove an in-flight command failed. An explicit retry may reuse only the same immutable key and input. A returned receipt is historical evidence of that command; a fresh owner read establishes the current job state. No automatic mutation retry is required or implied.

## Existing messaging

Job contact uses the existing real account/identity conversation channel and sends no message automatically. Jobs and services route an employer contact to the business account owner. The retained horse contract routes to its original author; that behavior is unchanged. The additive `get_my_marketplace_message_thread_v2` preserves schema version 2 and old listing/service/horse cards while adding UUID job cards with `image:null` and `price:null`.

Current conversation context is separate from each message's historical card. Choosing an ordinary listing clears only the current job pointer, so a later listing deletion cannot revive that old job subject. Historical job cards survive. Sending a single ordinary listing attachment without selecting a new conversation subject does not clear the current job subject.

## Install and evidence

The nine numbered SQL modules are the source. `tests/prepare.mjs` composes the exact catalog-guarded `preflight.sql`, `apply.sql` and `verify.sql` and records source and metadata pins. `changes.sql` is a readable module composition; it is not the Mac installation entrypoint. `catalog-pins.json.changes_sha256` identifies the exact embedded DDL body; `source-pins.json.changes_sha256` identifies the readable file including its final newline.

Use the release updater's fresh read-only preflight and durable intent. Install the additive backend in one bounded transaction before publishing the new client. An uncertain SQL reply requires read-only verification before proceeding. No automatic SQL retry or rollback removes user-created jobs. Unknown catalogs, changed policy requirements, missing current block-removal protection or wrong hosted context stop installation.

Catalog recognition inventories all new functions, owners, configuration, ACLs, tables, RLS, indexes, policies and triggers. It also verifies the retained publication, message/contact and policy dependencies. Before/after invariants cover old relation structure and authority, the accepted block-removal foundation (including public/Auth schema grants), and Auth UID privileges. Live policy identifiers are observed and compared within the run; synthetic fixture IDs are never deployment pins.

The focused local fixture executes real PostgreSQL permissions and PL/pgSQL in PGlite 0.5.13 as a non-superuser installer. Its Auth schema and UID function are owned by separate provider roles; the installer can use them but cannot grant their privileges. Synthetic users, listings, policy and Storage metadata are the only test data. The fixture restores the retained baseline conversation/listing FK for the real terminal-deletion path. Historical test suites and external services are not run.

`runtime-result.json` records the final attempted run and its exact source hashes. Preserved failed attempts and their causes are described in `tests/test-history.json`. Local results do not prove native concurrent sessions, hosted installation, Vercel publication, browser interaction, real messages or Storage deletion. The parent release records those evidence boundaries separately.
