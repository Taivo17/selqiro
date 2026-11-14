# Provider hiding and account blocking v1

Decision: 13 November 2026, Europe/Tallinn. Provider controls and profile-only
placement are installed through the accepted `371f4f4` source. The exact-block
removal follow-up is prepared separately. Actual execution and validation
status belong to `../continuity/CURRENT_STATE.json`.

## Product contract

| Action | Owner and target | Effect | End |
| --- | --- | --- | --- |
| Hide provider for 24 hours | Viewer account → provider identity | Exclude that identity from discovery before counting or paging. | Server deadline or explicit Show again / Undo. |
| Block user | Existing `user_blocks` account → account | Existing bilateral offer/profile visibility and new-message restrictions. | Only the blocker removes their own row. |

These controls are free. Changing the viewer's active identity does not change
the account preference. Hiding one provider identity does not hide other
identities merely because they share an owner. Blocking follows the existing
account relationship; it is not an identity blacklist or a platform suspension.

The account behind a content reference is resolved on the server: ordinary
listing publisher, horse-offer creator, or the service/profile's private user
or business owner. Conversation status uses the actual stored peer account and
identity, which can differ from a business identity's owner. The client does
not submit a target account ID.

Temporary hiding does not enter shared `is_public`/detail/profile/media/contact
predicates. Direct links, profiles and conversations keep their normal access
rules. Existing conversation history remains when permanently blocked; new
messages remain prohibited in both directions. Existing media and content are
not deleted by either preference. Removing hiding does not remove a block,
and removing one's block does not remove the other person's block or hiding.

## State and authority

`provider_controls_private.hidden_providers` stores one row per viewer account
and provider identity: UUID revision and nullable `hidden_until`. An indexed
account/deadline read obtains only that viewer's active preferences. The table
has RLS and no direct browser grants. Public RPCs verify `auth.uid()` against
the expected account; business ownership/membership also prevents hiding or
blocking one's own provider.

The deadline uses one captured server instant plus `interval '24 hours'`.
It is 24 elapsed hours, independent of daylight-saving boundaries and the
client clock ([PostgreSQL datetime semantics](https://www.postgresql.org/docs/17/functions-datetime.html)). Reloading, rereading or repeating the same request never starts
another period. A new hide of an already hidden provider is a no-op. Expiry
is evaluated by readers; no scheduled job is required for correctness.

A hide/unhide operation compares the exact stored revision. The client supplies
a new UUID; replay of that same operation cannot restart the deadline. Unhide
leaves a revision tombstone, so an older Undo cannot remove a later hide.
Each action sends only its own kind of compare-and-set values. A permanent
unblock compares the original block row ID and exact microsecond timestamp.

The existing `user_blocks` table is the sole permanent block registry. Its
owner, RLS, policies, grants and side-effect boundary are checked before the
new capability is applied. Blocking uses the existing messaging serialization
contract and removes only the caller's exact block row when unblocking.

## API and bounded client

Three RPCs expose current state, a page of the caller's own preferences, and an
explicit mutation. GET targets are listing, horse_offer, service, profile,
hidden_provider, blocked_account and conversation. Conversation is read-only;
management targets can only remove their own existing preference.

A server-derived opaque target token binds type, reference, provider identity
and actual account. It is a race check, not an authorization token. The server
locks and resolves a mutation target again before writing. Unavailable or
foreign targets do not reveal another account's preference rows.

The client captures its account/JWT for each request, validates the response
against that account and target, preserves exact timestamp text for CAS, and
bounds responses to 512 KiB with a 15-second deadline. Management reads fetch
25 items at a time; there is no request per result card or download of the
whole discovery catalogue. No remote error detail or bearer token enters UI
messages.

A lost acknowledgement is uncertain, not proof of failure or rollback. No
automatic mutation retry occurs. An explicit read can confirm the requested
revision or show the current saved state without claiming that the original
operation succeeded. A fresh user confirmation is required for another write.
Changing accounts retires outstanding controllers; late replies cannot update
the new account's state. Token refresh alone preserves the account generation.

## Discovery and direct access

| Read path | Hiding filter |
| --- | --- |
| Combined V2 ordinary/horse search | Materialized viewer preference set before match/count/page. |
| V2 services search | Same exclusion before eligibility/count/page. |
| Ordinary search v1 and v2 | Same account-scoped exclusion. |
| Legacy marketplace and nearby RPCs | Exclusion and bilateral account blocks before LIMIT/OFFSET. |
| Legacy followed feed | `discovery_listings_v1` invoker view before range; base-table RLS retained. |
| Explicit profile sections, detail and history | No temporary hiding predicate. Existing block/access rules remain. |

The legacy feed view has explicit invoker computed relationships for existing
image and translation embeds ([PostgREST computed relationships](https://docs.postgrest.org/en/v13/references/api/resource_embedding.html#computed-relationships)). These preserve the underlying table privileges
and RLS and avoid depending on implicit view-relationship inference. No new
write endpoint or policy is created for listing/image/translation content.

The public profile resolver adds the bilateral account-block check to the
profile it already selected. It cannot fall through to another profile alias
after a blocked match. Current V2 profile data loaders include the viewer
account and permanent-block revision in their read scope. A temporary hide
does not invalidate the explicit profile's eligibility.

Cross-tab signals contain a random revision only, without an account, target,
name or private content. Each tab rereads its own authorized state. Discovery
and profile visibility use separate revisions, with a bounded focus reread
for expiry or changes made elsewhere. Search totals and pagination come from
the filtered server response; the UI does not hide rows after paging.

## Scaling and evidence limits

Each discovery query materializes the current viewer's active hidden identities
once. Filtering is done before counting and limiting, with an index on viewer
and deadline; it introduces no network lookup per card. Query-plan checks must
inspect these new paths. The broader retained search implementation, exact
counts and deployment capacity still need measurement at real traffic levels.
Synthetic fixtures are not evidence for millions of concurrent searches.
The existing `(blocker_id, blocked_id)` unique index remains. One separately
pinned `(blocked_id, blocker_id)` index supports incoming-block lookups without
scanning the global block set; the synthetic query-plan proof records its use.

The implementation does not create an advertising or recommendation registry.
Future real featured/advertising readers must apply the same viewer preference
before choosing a page; static skeleton examples are not live offers.

Local PostgreSQL-WASM tests verify SQL behavior and catalog guards; component
fixtures verify application behavior with synthetic Auth/HTTP/Next boundaries.
The real-browser gate is blocked by this environment and is not marked passed.
Neither proves hosted PostgREST, a deployed Vercel route, native parallel
sessions or the user's Mac. Those remain separate evidence checkpoints.

## Delivery boundary

The current follow-up is client-first. Its existing provider CAS contract lets
the reviewed client be deployed before the old removal paths are closed. The
updater checks the exact 1701-file base, branch, HEAD, full index/worktree and
approved remote, while holding the last accepted private receipt unchanged.
A metadata preflight precedes source writes. After build and exact commit/push,
a fixed HTTPS marker must match the reviewed runtime bytes before the SQL
closure. A fresh complete source/remote/marker check precedes its one durable
SQL intent. An independent catalog read confirms the outcome.

A wait resumes without repeating a verified build, commit or push. Unknown
writes are never automatically repeated. An applied catalog may reconcile a
lost acknowledgement; an absent or unknown result after that attempt stops.
The marker does not attest Vercel Ready, deployment ID or old open browser tabs.
The matching new commit's Ready and a targeted stale-confirmation usage path
remain separate evidence. Reports expose a unique private Downloads copy and
preserve the exact original receipt, journal and prior released packages.

The old provider-controls verifier pins the old block writer and table ACL.
Its result after this follow-up is historical, not the new contract. Use only
`supabase/repairs/20261113_block_removal/verify.sql` through the new runner.
Historical repair bytes are retained unchanged.

## UI placement decision — 13 November 2026

This decision supersedes earlier prepared UI placement descriptions. The
shared **Hide provider for 24 hours / Block user** control belongs on the
public profile. Ordinary-listing, horse-offer and service cards do not expose
these provider controls. The existing conversation block remains available
in messaging; My Area retains Undo/Show again and separate preference management.
No viewing-count threshold, new tracking or eligibility data source is added.

Reuse the existing `profile` target and server-derived `canHide`/block
capabilities. The UI must not guess ownership or target accounts. Switching
the viewer account or profile target retires the old scope; late responses
must not populate the new menu. The profile remains directly reachable under
the existing access rules after a temporary hide. Only the relevant discovery
read scope is invalidated for hiding; permanent blocks retain their existing
visibility and messaging effects.

This changes entry-point placement, not the account/identity model, 24-hour
deadline, revision checks, API/RPC contract, SQL, RLS or server-side discovery
filtering. Existing message and management implementations are reused.

The accepted Mac report now pins profile-placement commit
`371f4f4cc1ff62ecadb14d19bf5c8004cff256ea`. The user accepted hide/Show again and
the controlled two-device block/unblock flow with the phone already in the
conversation. This does not establish a cause for the earlier ambiguous case
or transient read errors. Ready for this exact commit was not separately
provided. The new removal follow-up has its own prepared/executed boundary.

## Exact block removal across all views

Every removal binds the previously displayed block row ID and exact timestamp
text. The client rereads only that `blocked_account` row. A missing row or new
version never retargets the confirmation to a replacement block. A lost reply
permits an explicit read, not an automatic mutation retry or success claim.
Account/conversation scope changes retire pending confirmations.

V2 and legacy conversations use the actual stored peer account. The legacy
store page resolves the profile's owner through the existing profile target;
identity UUIDs are not treated as account UUIDs. The legacy management page
composes the existing paginated preference list. Three direct legacy DELETE
handlers and the unused inbox boolean setter are removed. Both the browser
and server compatibility clients refuse `blocked=false` before the old RPC;
`true` remains the idempotent creation path.

The SQL closure keeps `user_blocks` as the sole registry. Browser roles cannot
DELETE, UPDATE, TRUNCATE, create triggers, supply ID/created_at on INSERT, or
reset its sequence. Pair-only INSERT remains available under existing RLS.
The old definer's false branch refuses the operation. A BEFORE DELETE invoker
trigger also rejects a JWT-context old definer that reaches DELETE after the
closure, rather than relying only on new function bodies or revoked grants.

The reviewed provider setter delegates only its exact DELETE to a private
helper owned by a dedicated NOLOGIN/NOINHERIT/NOBYPASSRLS role. That helper
validates auth.uid, both accounts, row ID and timestamp independently. Its
own-row SELECT/DELETE policies remain narrow; browser roles receive no helper
EXECUTE or role membership. Installation-only schema CREATE and temporary SET/INHERIT membership
are removed before commit. PostgreSQL may retain the precisely pinned creator
ADMIN-only membership for postgres, with inherit=false and set=false; it does
not authorize runtime SET ROLE. No client-controlled bypass flag is used.

The DELETE guard retains trusted postgres/service_role maintenance only when
all supported JWT settings (JSON claims, legacy sub and legacy role) are absent.
Existing privileged service-role UPDATE/TRUNCATE/sequence maintenance is outside
this browser-account closure and is not broadened or advertised as forbidden.
The updater changes schema/authority only; it does not alter preference or
content rows. New role/function/trigger/ACL metadata and retained invariants are
pinned by the new repair's guards. Its README records local synthetic evidence
and the remaining hosted execution boundary.


## Hosted auth grant correction — 14 November 2026

The deployed client is commit `29b2457893d6fa9bab2756533319fdc13b841840`.
Its exact public marker was observed twice before the sole original SQL
attempt. The production log for 14:12:26 UTC records two 01007 warnings:
no privileges were granted for schema `auth` or function `uid`. The exact
installed-state guard then raised 55000 and the transaction did not pass.
The independent 14:12:33 UTC check found the original absent capability,
all nine guards and unchanged checked authority/structure/function invariants.
The earlier local non-superuser fixture did not cover this hosted grantor
boundary. Historical source and its successful local checks remain evidence
of their original scope, not proof that the closure was installed in production.

The separate `20261114_block_removal_auth` repair removes this dependency on
granting privileges on platform-owned Auth objects. A small zero-argument
SECURITY DEFINER function in the existing private schema, owned by postgres,
returns the existing `auth.uid()` result. Only the owner and the narrow CAS
writer may execute it. The writer's RLS policies, exact-delete helper and
invoker-trigger check use this one private identity bridge. No JWT parser is
duplicated, no Auth schema/function ACL is changed, no `require_actor`
authority is widened and no persistent inherited or SET authority is expanded.
The reviewed PostgreSQL creator-admin membership has inherit=false and
set=false; it does not let the narrow writer be selected at runtime.
This supersedes the above prepared direct `auth.uid()` calls within the
narrow writer path; it does not create a new user-block registry or relax
version matching, browser denials, maintenance boundaries or the final guards.

The entire `20261113_block_removal` subtree remains immutable. The repair
uses a new SQL subtree, new release and a separate durable journal, while
holding the failed original journal unchanged. Existing deployed web runtime,
client build and accepted Ready evidence are reused; a fresh exact marker
observation remains required before the new SQL transaction. The runner
checks the original absent catalog and exact 1737-file source base, applies
only reviewed SQL/docs to the worktree, rechecks source/remote/catalog/marker,
attempts one bounded transaction, independently verifies it, then stages,
commits and pushes the scoped source delta. An already-applied outcome may finish an interrupted
source commit; absent or unknown after its own attempt never authorizes a
repeat. No application-data or Storage operation belongs to the repair.

At preparation the repair is not yet applied on the Mac or database. Local
PGlite PostgreSQL/WASM proof passed 13 runtime cases and 7 installation cases
with 11 tamper cases under the missing Auth grant-option boundary. Replaying
the exact original SQL reproduced both 01007 warnings, the 55000 guard and
rollback. Auth ownership/ACL/definition and before/after invariants remained
unchanged. The runner passed 24 focused database/diagnostic/process cases.
The delivered package binds the exact final source, loader, Git and receipt
integration evidence in `kontrollid/loplik-kontroll.json`. These synthetic
checks do not claim a native multi-session or live hosted result. The final
Mac report is still required. A second client build or Ready screenshot is
not a gate for this SQL/docs-only delta. The remaining user acceptance is the focused stale
confirmation across two tabs after the successful repair report. The prior
hide/Show again and two-device messaging acceptance remains accepted.
