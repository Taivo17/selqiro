# Provider hiding and account blocking v1

Decision: 13 November 2026, Europe/Tallinn. Implementation is prepared
against the accepted `955c935` source. Actual execution and validation status
belong to `../continuity/CURRENT_STATE.json`.

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

The new repair is additive and guarded; historical repairs stay byte-identical.
The old client remains usable during the interval between SQL activation and
new deployment. The updater checks the exact previous receipt, repository,
branch, source/index/worktree and approved remote before writes. It applies
one journalled SQL transaction, verifies it, then writes the reviewed source,
builds and commits/pushes. User changes or unresolved writes stop the runner.

Vercel Ready for the resulting commit and a real two-account usage path are
required after the Mac report. Reports preserve the original journal and expose
a uniquely named private Downloads copy. A released package is never silently
edited; later repairs receive their own package identity and hashes.


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

The database capability and source release `40ceac78deb255d8006244ae232652956b92bea0`
are now installed; the returned Mac report and matching Vercel Ready / Production
screenshot are accepted. Runtime hide/block actions have not yet been tested by
the user. The profile-placement revision is newly prepared and still awaits
its own Mac report, deployment and usage verification. The current state record
is authoritative over the historical delivery description above.

This follow-up delivery is source-only: fresh exact 1696-file base/index/HEAD/
remote checks, a read-only held lock on the accepted private receipt, reviewed
source replacement, build, commit and push. It issues no database or Supabase
CLI calls and does not rerun the completed SQL installer. Each evidence stage
remains separate in `../continuity/CURRENT_STATE.json`.
