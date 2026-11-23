# Account lifecycle — evidence and verification plan v1

2026-11-22. Baseline `034211d`; design only. This plan is not a runnable migration,
not an instruction to replay any old release, and not evidence of passed runtime
tests. It scopes the next necessary checks around the audit's concrete findings.

## Evidence already sufficient for this audit

- Accepted 2047-file source inventory and exact reviewed file hashes.
- User's successful Mac job-read report, acknowledged one-time SQL repair and
  separate after-state verification.
- Same commit Ready / Production screenshot and private/business job-list checks.
- Current source contracts and dated historical migrations, distinguished from
  installed full-schema evidence.

The latest job-read catalog covers eight jobs/profile-media tables and 56
functions. It does not establish the account, Energy, consent, admin and message
dependency graph. Source examination found a business-owner cascade, immutable
ledger/FK interaction and read handlers with side effects. Those are concrete
reasons for a new bounded catalog read; completed job tests and repair are reused.

## Next task: one metadata-only observation of the existing database

Use the existing approved project and pinned CLI. Verify actual Mac repository,
HEAD, index/worktree, expected source and remote before relying on their identity.
This observation must not commit, push, build, change deployment, reconnect the
service or reinstall dependencies. It must not invoke application RPCs.

The runner and SQL are to be prepared separately after this scope review. They
must use an explicit read-only transaction with bounded lock/statement/overall
timeouts, bounded output and exact target identity checks. Do not weaken a
read-only boundary to collect a convenient application-function result.

### Fixed catalog scope

| Area | Objects/metadata needed |
| --- | --- |
| Account and identity | Structure and grants of `auth.users`, `auth.sessions`, `profiles`, `identities`, `identity_profiles`, `business_accounts`, `business_members`, legacy `stores` and related membership structures actually present. |
| Incoming/outgoing relationships | All immediate incoming/outgoing FK endpoints/actions touching the scoped account/identity/business relations; include no-FK UUID/JSON reference categories from the source audit separately. The full transitive erasure graph is a later gate. |
| Access enforcement | Actual RLS enable/force flags, policies, table/column ACLs, relevant views and latest identity/owner/public-reader function signatures, owners, volatility, security-definer/search-path properties and body fingerprints. |
| Integrity | Bound triggers and constraints on Energy wallet/ledger, publication attempts/events/commands, consent records, admin audit, channels, participants, messages, message photos/receipts and profile media. |
| Lifecycle surfaces | Search/detail/profile/media eligibility and direct legacy paths; actual latest function definitions where source comparison is necessary. |
| Storage configuration | Public/private flags and policies of the fixed known buckets. Query bucket configuration only; no object names/listing. Versioning/lifecycle availability must be reported as known or unknown, not inferred. |

The first observation resolves the core identity/business reader's actual
dependencies and checks the two concrete cascade/immutable-ledger hazards. Other
domain metadata is collected only where needed for this boundary; full content
and erasure coverage is explicitly later. Previously accepted unrelated catalog
checks are not repeated without a changed dependency or new mismatch.

Any dependency traversal must cap relation count, depth, response bytes and time.
If a bound is exceeded, return incomplete coverage and the next narrow segment;
never truncate silently. Do not collect unrelated extension/system objects or
function text wholesale. Use existing function source fingerprints first;
request a precise definition only for a relevant missing or mismatching routine.

Report relation/function absence separately from permission failure. If current
metadata differs from accepted source, preserve both observations and narrow the
next comparison. Do not auto-fix schema drift or infer that a missing table has
zero user data.

### Data deliberately outside this diagnostic

No Auth user rows, e-mail addresses, passwords/hashes, refresh/session rows,
application user rows, message text, image bytes, Storage object keys, wallet
balances, payment details or member rosters. Public bucket IDs and schema names
are configuration metadata. Sensitive literal values found in a policy/function
definition must be redacted or reduced to a fingerprint before the report is sent.

Create the original report in a private durable journal; preserve older reports.
Create a private unique sendable copy in Downloads, print
`SAADA SEE FAIL: <absolute path>` and reveal exactly it using a bounded
`/usr/bin/open -R` call. Follow the existing fallback/stale-report rules in
`docs/03_AI_RULES.md`. Do not select a report by searching for the newest file.

## Preview implementation checks after catalog acceptance

| Case | Required result |
| --- | --- |
| Anonymous or wrong expected account | Refusal before any private summary; no data about the supplied account. |
| Selected identity changes | Account scope remains explicit; no crossed-account or late private response. |
| User has no active identity | Account controls remain reachable; empty personal identity set is a valid known result. |
| Personal and shared business identities | Correct classification; co-member is not implied owner/successor. |
| Energy in the first identity/business slice | `not_assessed`; no wallet or balance query. |
| Missing wallet, when the Energy adapter is introduced | `not_created`; no wallet/ledger INSERT and no Energy charge. |
| Missing domain/read failure | Explicit `not_assessed`/`unavailable`, never fabricated zero. |
| Existing message/profile read hooks | Preview does not call them or start cleanup/background work. |
| Large relationship set; domain counts when their adapters are introduced | Bounded pages/counts; cap shown as `at_least`, complete scope not inferred from one page. |
| Account/session switches during request | Cancel/hide stale response and clear private component state. |
| Malformed version/shape/cursor | Strict failure; no permissive parser fallback. |
| Browser history/cache | Private no-store response; no personal data in URLs or diagnostics. |
| Database execution | Reader remains read-only with its entire call graph; no row locks or implicit last-seen writes. |

Use synthetic identities/data for behavior and cross-account denial tests. Verify
the new RPC's permissions and narrow query behavior, then the fresh build and
small browser path. Existing three user accounts are not destructive test fixtures.
Add tests for meaningful account/security risks; do not rerun the entire portal
suite merely because a new documentation/audit step completed.

## Additional gates before reversible closure

- Single authoritative account state is initialized for current and new users.
- Every relevant RPC, RLS, direct legacy write, recipient check, public reader,
  private media route and final adoption/commit step observes the lifecycle fence.
- Fresh proof is server-verified, same-account, live-session, short-lived,
  one-use and operation/scope/revision bound. Passwords are never logged/trimmed.
- Old tokens, ordinary sign-in and token refresh cannot bypass closure;
  explicit restore uses a restricted account path and does not extend deadlines.
- Close/restore races with membership change, publication, send, attachment and
  settlement have defined outcomes under the actual transaction/lock order.
- Business ownership resolution cannot silently transfer data or indefinitely
  force the personal account to remain open.
- Restoration leaves unrelated blocks, expired/closed content and revoked roles
  intact. A second click/unknown response reconciles the same operation receipt.
- User-visible claims about public profile images match their actual delivery
  properties; the existing public URL limitation is resolved or stated accurately.

## Separate gates before final erasure

Category-specific retention and deletion rules must cover Auth/account identifiers,
messages and snapshots, image objects and versions, receipts, Energy/financial
records, audit, backups and case-specific holds. Define approved purposes, scope,
access, finite handling and completion evidence; this audit sets no legal period.

Verify the current FK/trigger graph and the unlinked UUID/JSON references. Design
finite retirement of late-write tombstones and idempotency receipts without
claiming that deleting their row deletes a provider object. Resolve shared
business content/threads and pending paid operations explicitly.

Only then design the erasure worker and its separate permission boundary.
Supabase soft-delete is irreversible and not the restoration mechanism. An Auth
delete is a late, explicitly reviewed part of erasure, not the first close step.

## Completion boundary of this audit

Completed: source-based dependency findings, recommended behavior, bounded
server contract, catalog scope and verification cases, updated continuity delta.
Pending: fresh catalog observation, implemented preview, migration/runtime tests,
Mac application, new commit/push, deployment and user validation of that module.
The current production result remains the accepted job-read fix `034211d`.
