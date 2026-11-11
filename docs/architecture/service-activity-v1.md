# Service activity — one year and explicit owner review

Prepared 2026-11-11. This document describes the new source and SQL contract;
it does not establish that the Mac, hosted database or Vercel has applied it.
The current evidence and next action remain in `continuity/CURRENT_STATE.json`.

## Product rule

A service is valid for **365 × 24 hours** after its first publication or the
owner's explicit renewal. Normal participation and renewal are free. No Energy,
payment, artificial service-count cap or automatic renewal is added.

The owner confirms that the service information is still current. A successful
renewal gives a deadline one year from the database server's current instant.
It does not accumulate another year on top of the old deadline. A longer existing
period is retained without shortening it or recording a false new confirmation.

Expiry is separate from the persisted `published` / `archived` / `draft` status.
An expired published service remains in My Area with its UUID, content, gallery
and store-category assignments. It is unavailable in public discovery until the
owner explicitly renews it. Renewing an archived service leaves it archived.
Resuming an expired archived service does not extend its deadline.

## One source for each responsibility

`public.services` remains the canonical service. Its UUID and existing content
and publication receipt mechanism are unchanged. New
`service_publication_private.activity` stores only service activity metadata:

| Field | Meaning |
| --- | --- |
| `service_id` | Canonical service UUID and primary key; restrictive foreign key |
| `started_at` | Initial period start, preserved by renewal |
| `active_until` | Finite authoritative deadline |
| `origin` | `transition` or `publication`; describes initial period |
| `last_confirmed_at` | Last explicit owner renewal that extended the deadline; initially null |

Renewal changes this private row only. It does not modify `created_at`,
`updated_at`, `published_at`, `edit_revision`, status, image order, category links
or content. Existing creation-time ordering is retained and pending content-save
commands are not invalidated by a renewal.

The API roles have no direct read/write privileges on either new activity table.
Only authenticated owner RPCs expose the limited owner projection. Authorization
uses the existing server actor, stored active identity and private-owner / active
business-member checks; no client-selected identity alone authorizes a write.

## Deliberate transition for existing services

Existing service data has `published_at`, `created_at` and `updated_at`, but no
service activity deadline. Historical publication timestamps are not evidence of
a recent user review. The migration therefore records a single rollout instant
and deliberately grants one initial year from that instant to:

- currently published services;
- archived services with an existing publication timestamp.

These rows have `origin = transition` and `last_confirmed_at = null`. None of
the original service dates or rows is rewritten. Drafts and archived services
without a publication timestamp receive no period in this migration. Their first
actual publication initializes a year using the database clock. A legacy archived
content save can populate its old `published_at` field while remaining archived;
that save alone still does not initialize activity.

The guarded preflight checks the retained schema/functions/rights and finite
existing dates. Its `transition_summary` reports current published, archived,
draft and invalid-date counts, without UUIDs or content. Counts may change
between separate preflight and apply calls. The transaction locks service writes,
checks again, inserts the rollout metadata and periods, installs the trigger and
public predicate, and verifies the resulting declarations before committing.
Unknown schema/rights or invalid dates cause a stop. Exact installer replay does
not create another rollout, extend a deadline or alter the original records.

## First publication and old writers

The `service_activity_start` AFTER INSERT/UPDATE trigger initializes a missing
period only when a service is actually published. Existing periods are never
replaced. Content edits, gallery saves, category changes, command replay and the
existing status toggle do not renew it. The old browser writers and direct table
writes remain closed by the accepted publication authority contract.

The already accepted V1 owner readers retain their exact response contract.
SQL can therefore be applied before the new web client. The new client uses V2
owner readers and separate activity read/renewal commands.

## Owner RPC contract

`get_my_service_publication_snapshot_v2` and `get_my_service_publications_v2`
use the same arguments, actor checks, content and pagination as V1. Their
`schema_version` is 2. Each service snapshot adds exactly one `activity` field:

```json
{
  "active_until": "finite PostgreSQL timestamptz string or null",
  "origin": "transition, publication or null",
  "last_confirmed_at": "finite timestamp string or null",
  "is_expired": false,
  "can_renew": true,
  "server_now": "database observation timestamp"
}
```

`is_expired` means an existing deadline is at or before that server observation.
`can_renew` means a period exists and persisted status is published or archived;
it does not promise that a longer existing deadline will change. Missing periods
have null date/origin fields and false flags.

`get_my_service_activity_v1(expected_user, expected_identity, service_id)` returns
schema version 1, content type `service`, the expected actor, owning identity,
service UUID, persisted status and the activity object.

`renew_my_service_activity_v1(expected_user, expected_identity, service_id,
expected_active_until)` returns that same envelope plus `changed`. The expected
deadline is the exact string returned by PostgreSQL, including microseconds.
The browser must not round-trip it through a millisecond JavaScript `Date`.

The RPC locks the authorized service and then the activity row. It rejects a
null/nonfinite deadline, non-read-committed execution, a missing published period
or a different current deadline. A stale deadline gives SQLSTATE `40001` with
`service_activity_conflict`. It does not retry with a silently refreshed deadline.

One captured `clock_timestamp()` is used for receipt `server_now`, the explicit
confirmation timestamp and `active_until = server_now + interval '8760 hours'`.
When `changed = false`, the old deadline and last confirmation remain unchanged.
An uncertain network result is reconciled by rereading activity; it is not proof
of success and does not authorize automatic repeated extensions.

## Public eligibility

The existing `service_publication_private.is_public` predicate now requires a
matching activity row with `active_until > statement_timestamp()`, alongside
the existing active identity, published status and publication/gallery finality.
The established call sites apply this before result counts and pagination:

- public detail and public service search;
- public-profile service readers V1 and V2;
- public-profile store-category visibility in the services section;
- managed service-media binding;
- a new service contact request.

Owner reads and owner media remain available after expiry. Established private
message history is preserved; replay of an already completed contact request
does not create a new conversation or erase earlier messages.

This is offer visibility and managed-media access control. Legacy photos already
published at public Storage URLs are not made private by an offer deadline. No
Storage objects are deleted or rewritten by this step.

## Verification boundary

The new repair has isolated PostgreSQL/WASM runtime and fault-injection tests,
using source-pinned retained declarations and synthetic rows. They cover transition
preservation, first publication, expired edits/resume, exact deadline concurrency
checks, an archive staying archived, managed public read/media/contact gating,
existing V1 compatibility, business membership and direct-write denial.

The local test engine does not prove concurrent live sessions, a Mac run,
production database activation, Vercel readiness or the real browser acceptance
path. Those are distinct receipts recorded in the current continuity state.
