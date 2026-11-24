# Contact and message account availability — reviewed SQL scope

This module adds account availability checks to **new contact and message writes**. It has no account state transition, deletion action, SMTP setting, publication route or UI change.

## Installation boundary

The accepted starting source is commit `e336a5b9d02845c688def778babeac0f1e3fec95`, tree `7734a70aa174b25b2ce5cc85aca3c0fa4e628624`. The returned v2 contact metadata observation is complete for its explicitly requested functions and the direct triggers of the three messaging tables. All 20 observed function bodies were matched to exact bytes in that accepted source. The native PostgreSQL recreation also matched all 20 `pg_get_functiondef` hashes, configurations, ACLs, policy expressions and public trigger definitions. This is evidence for this defined scope; it is not a complete contact call graph.

`preflight.sql` accepts only the exact before or after catalog fingerprints. `apply.sql` requires the exact before state, performs one guarded DDL transaction, verifies the exact after state, commits, and then obtains a fresh metadata acknowledgment. `verify.sql` independently observes the after state. No account, Auth, message, offer or storage row is selected by these installation scripts. No such row is modified by installation.

| Contract | SHA-256 |
| --- | --- |
| Preserved base | `fb4fd27d31d456f2ea5c6dcb4c3b4bd6d71be0a5910dfc0dbe4d09d18bd28d00` |
| Before target | `002a7544e7c060d70562c3ceca2ac94ef4f6cdc0a57c98526f6fa75d6a7a0487` |
| After target | `96e50aaaeb1afed0c66b5f8bfe8e3fb2ff5b89a8e942152e59a706e49237fb3c` |

Each public CLI output is one strict metadata-only receipt. `sql_contract.py` retains the established reader API and field names. Its stage, state, types and fingerprints must agree; a successful shell exit alone is not an installation receipt.

### Fresh execution prerequisite

`execution-prerequisite.sql` is evaluated in preflight, before apply DDL, during the post-commit acknowledgment, and in independent verification. It checks the actual `postgres` execution context has schema usage, table SELECT, at least one column UPDATE privilege, and inactive row-level security on both `auth.users` and the private account-state table. PostgreSQL requires UPDATE authority as well as SELECT for `FOR SHARE`.

This capability check is **a fresh installation prerequisite**, not a claim that the earlier metadata report observed these privileges. It raises the fixed `ACCOUNT_CONTACT_WRITE_AUTHORITY_REQUIRED` error when unmet. It adds no Auth grant, changes no role attribute and returns no user data. The new helper's owner is pinned to `postgres`, so checking that execution context is deliberate.

## Exact changes

| Function | Addition point |
| --- | --- |
| `public.contact_my_listing_seller_v1` | After existing receipt replay and listing/peer authority checks; immediately before the existing block check. |
| `public.contact_my_horse_seller_v1` | After receipt replay and resolved owner/identity checks. |
| `public.contact_my_service_provider_v1` | After receipt replay and resolved owner/identity checks. |
| `public.contact_my_job_provider_v1` | After receipt replay and resolved owner/identity checks. |
| `public.send_my_listing_message_v1` | After receipt replay and resolved conversation peer checks. |
| `public.send_my_message_v2` | After receipt replay and resolved conversation peer checks. |
| `messaging_private_v2.guard_account_block` | After the legacy INSERT guard locks the conversation and validates its exact two-party membership. |

The six RPCs call the new private `listing_contact_private.require_available_accounts_v1(uuid,uuid)` helper. The existing legacy message INSERT trigger calls the same helper with the buyer and seller from its locked, validated conversation. Only inserted body bytes are changed. The original replay/conflict prefixes and all remaining original body bytes are retained. Function declarations, owners, defaults, argument names, configurations and existing grants are preserved.

The helper is `VOLATILE SECURITY DEFINER`, owned by `postgres`, with a fixed `pg_catalog` search path and a two-second lock timeout. Its only non-owner execution grant is to the existing contact writer. PUBLIC and API role execution are revoked. Any unanticipated default privilege remains a postcondition mismatch and causes the apply transaction to roll back.

## Availability and transaction ordering

The helper requires exactly two non-null, distinct account IDs. It sorts them in UUID order and, for each account, locks the Auth row with `FOR SHARE`, then locks its private account-state row with `FOR SHARE`. It checks the values fetched by those locking reads after a wait. It does not call the existing stable read-availability helper against an earlier snapshot.

A write is allowed only if both state rows exist, state is `active`, revision is positive, neither Auth row is soft-deleted or currently banned, and each account creation timestamp is either null or finite. Ban expiry uses the same `statement_timestamp()` boundary as the accepted read helper. Unavailability raises SQLSTATE `42501` with the generic `message_account_unavailable` text. It does not reveal which account or condition failed.

These locks remain held until the surrounding transaction ends. A committed prior ban or state deletion is rechecked after waiting; a ban or state revision update started after the writer has acquired its locks waits for the writer's commit. A stale repeatable-read legacy INSERT fails with a serialization error rather than using stale Auth data.

The canonical pair order is a local lock discipline, **not a proof that every existing portal or Auth-service operation is globally deadlock-free**. Existing actor/profile, offer, conversation and block locks still exist. A future closure operation must use the same Auth/state ordering, commit its state change first, and perform profile/offer/conversation cleanup in a later transaction. Acquiring those other locks while holding exclusive Auth/state locks would risk an inverse order with existing writers.

## Native verification scope

The final proof comes from a new owned localhost PostgreSQL 17.6 cluster, not a live application database. All seven changed functions, the 20 observed bodies, the account foundation, the existing read helper, the public policy bodies and public triggers are real accepted definitions. The fixture declares a small set of unrelated publication/identity-rendering leaf stubs; `tests/fixture-scope.json` lists them explicitly. The proof does not claim a complete hosted publication or Auth chain, a photo flow or external-service coverage.

The focused checks cover active private/business use, all six write entry points denying either unavailable participant, receipt replay and conflict preservation, both real history RPCs, legacy direct message INSERT, malformed pairs, missing and invalid state, transaction rollback, catalog drift, atomic installation and row preservation. They also observe actual PostgreSQL lock waits in both write orders, a changed authoritative conversation peer after waiting, repeatable-read serialization safety and overlapping account pairs. A dedicated non-superuser `postgres` test proves the fresh prerequisite rejects missing UPDATE authority and active Auth RLS, then accepts the helper with the required privileges and BYPASSRLS.

Synthetic unsupported state/revision values are introduced only inside rolled-back fixture transactions. The production account-state table remains constrained to active state. Harness inputs and installed SQL bytes are hash-bound before and after the final run; the cluster shutdown is separately recorded.

## Remaining work

This module does not implement account closure. Legacy conversation/participant creation, account-state transition ordering, remaining write surfaces, cleanup, and closure UI remain separate gates. Photo reservation, upload and attachment behavior are unchanged. Peer history remains readable under the prior rules; its `can_send` projection is unchanged, so a later UI stage must reconcile that presentation with unavailable-account write rejection.

The successful local proof establishes readiness of the packaged candidate. A user's actual preflight/apply/verify receipts, source publication result, Vercel deployment and user-path check are separate evidence and are not asserted here.
