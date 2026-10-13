<!-- SELQIRO_PRIVATE_ATTEMPT_INSTALL_REVIEWED_FINISH_20261013 -->
## 2026-10-13 — actual private-attempt installation reviewed; same source checkpoint completion

The source installer has already run. Its unchanged result is
`publication-attempt-source-install-20261013-100540-z_s6nsyk.zip`, SHA-256
`6cdb59d5531992ad92e33d530183c6d16fb40ddce2d457e12c945019caf38b0e`.
Independent offline review accepted all 502 selected sources and the exact 28-path overlay.
All eighteen tested files are installed/staged byte-identically. All 23 migrations,
existing application modules, dependencies and the dormant image verifier are unchanged.
A new actual Mac build exited zero on 13 October 10:05:56 Tallinn; its private stdout
was not independently read. Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3 were recorded.
The 195 SQL and 109 command tests are prior proof; neither they nor 119 native tests were replayed.
Last full local observation was 10:05:59.825383 Tallinn: main/cb6b68b, exactly 28 staged
paths and no unstaged extras, NOT clean. Last remote observation at 10:05:58.644430 matched
cb6b68b. Those are saved observations, not a present live view or proof of a new commit.

The separate source finisher keeps all eighteen tested files and the 28-path commit scope.
It amends eight documentation paths only; the approved requirements and test inventory stay
exact. Fresh actual Git/index/worktree/source/migration/approved-remote guards precede writes.
Its result.json, commit-proof.json and remote-observations.json determine the actual new
commit/push/clean outcome; this prewritten text is NOT proof that the finisher succeeded.
Read that result once. On STOP preserve partial state and journal; never retry/reset/restore.
After an accepted clean source finish, proceed directly with the SAME V2 private Storage,
immutable verified image, final publication, durable cleanup, terminal deletion and full
seller/buyer/anonymous journey. Do not start another documentation-only finish cycle.
SQL stays labs-only; upload/publication remains disabled. Push may trigger deployment,
but does not verify Ready/Production, cloud-native invocation or Storage HTTP behavior.
No authorization to delete existing accounts, listings, images or journals is granted.
Historical installation/test/next-action wording below is superseded, not a rerun instruction.

---
# V2 private publication attempt v1 — reviewed source retention

Recorded: 2026-10-13. Base: `cb6b68bf2afedd138f18d0f1eccb0562d05e36cb`.
Status: reviewed module/SQL candidate; source-only installation package. **Not an enabled API or production migration.**
Actual installation/build/staging status must come from the new installer result, not this prewritten document.

## Current evidence — replaces historical next actions

The dormant image verifier is committed/pushed at cb6b68b, with a user-provided
Ready/Production screenshot. Its installer/finisher and the Storage context reader are complete.
The 12 October 23:38 v3 helper run then passed 195 intended PostgreSQL 17.6 assertions:
157 rollback checks, 36 assertions across twelve two-session schedules, and two expected
REPEATABLE READ/SERIALIZABLE rejections. Ten schedules observed the expected blocking PID;
two observed another account completing before the first account committed. The helper was removed.
The 109 command-module tests and strict TypeScript check are retained v2 PASS proof, not new v3 execution.
The v1/v2 STOP records are not rewritten. None of these runners should be replayed.

The exact evidence inventory and all eighteen tested file triples are in
`docs/verification/v2-private-attempt-tests-20261012.json`. The original v3 ZIP is embedded,
unchanged, in the new source installer and its external result under `evidence/reviewed-v3-tests.zip`.
The approved requirements are retained byte-for-byte in
`docs/architecture/v2-publication-requirements-approved-20261012.md`.
The lab README and dependency fixture intentionally remain their original tested bytes;
their preparation-time future-tense/NOT_RUN statements are history, not current instructions.
This document and the current handoff supply the later evidence and next action.

## Retained implementation — no parallel source of listing truth

`src/server/listing-publication/attempts/prepareInput.ts` builds bounded immutable
command data. It uses the existing exact price wire normalizer and image selection limits;
it does not authenticate a session, authorize a write, persist data or issue a URL.
`tests/listing-publication-command.test.cjs` remains the exact tested module suite.

`supabase/labs/listing-publication-attempt-v1/01_private_state.sql` through
`05_close_attempt.sql` retain the helper-guarded SQL design. They remain under labs,
not migrations. Test fixtures/plans/expected labels accompany them without modification.
The SQL creates no active/public listing or public image URL. Its own schema/tables/RPCs
remain closed to the API roles, with no permissive RLS policy. Installation executes no SQL.

A private attempt binds account, expected active identity, request key, canonical listing
input and ordered image intent. Replaying the same bound request returns the same attempt;
changing its binding conflicts, and a terminal attempt is not reopened by old requests.
Existing price, category/basic-field, creation-value, actor/identity and versioned-policy
functions are reused. The dependency fixture contains 23 exact source declarations,
not a complete copy of the production schema or its role/authentication model.

Every image slot receives exact server-owned source and web-object references before a
one-time dispatch reservation. The durable reservation must commit before an external
Storage signing call. The current reservation is NOT a signed URL or an upload authorization
exposed to the client. Lost signing responses and late uploads still need a real transport contract.
The candidate bucket name does not create a bucket. The old public `listing-images` bucket
and existing public links remain unchanged.

Cancel/expire enqueue exact cleanup references in the same transaction before clearing
payload. A source whose external dispatch may have begun remains blocked pending external
write settlement. An early 404 or network timeout is not completion. A cleanup record is
NOT a deletion: the worker, persistent retries, terminal confirmation and quota release are
not implemented here. Retained account/identity references and replay tombstones likewise
are NOT a completed account-erasure or message-retention policy.

## Bounded design choices — not live configuration

One attempt: 24 hours, at most ten images, at most 25 MiB per declared source and 100 MiB
declared total. Each slot reserves the full source+web maximum, 25+4=29 MiB, not the
client-declared smaller size. The proposed account limits are three unexpired open attempts,
twenty new attempts per 24 hours and 300 MiB retained reserve. They are tested candidate
values, not production settings. A per-process image worker is not a cloud-wide load limit.

The SQL requires READ COMMITTED and uses the existing account/identity locking contract.
The policy selection is global listing/et-EE only and fails closed when active country-scoped
listing rules require an unresolved country selection. The form's free-text country is not
inferred into a policy ISO code from currency, language or search area. Horse policy remains separate.
The short policy SHARE lock, acceptance-row locks and expiry rechecks do not span an external call.
Real runtime permissions, contention/resource limits and HTTP authentication remain unverified.

## Source installation boundary

The new installer retains the eighteen files byte-for-byte, adds this contract, a compact
proof inventory and the exact approved requirements, and updates seven current documents.
Total scope: 28 paths (21 new, seven existing-document updates); final selected-source
export: 502 files, not a complete repository. Every existing application module, dependency
file, image verifier and all 23 migrations remain unchanged.

Before writes it checks the actual base/parent/tree, whole index, worktree, selected files,
new paths and approved origin/main. A fresh existing `npm run build` follows source writes;
only the changed current handoff is rendered/checked. No SQL, 109 command tests, 119 native
image tests, installs, Docker/Supabase CLI, commits or pushes run. A successful result leaves
exactly the 28 paths staged for review, not committed. Build failure or drift preserves files
and the new one-use journal; no reset/restore/retry occurs. Private build output stays on the Mac.
An existing Next build is not a network-isolation sandbox; the runner makes no DB/Storage call.

## Next integration and whole user journey

First review the actual source-install result, then complete that exact source checkpoint
under fresh guards. Do not add another application patch on unreviewed partial/staged work.
After that continue the SAME V2 publication connection, not a new general workflow engine:
private direct-to-Storage transport and recovery of late/uncertain issuance; immutable verified
web bytes/hash; final rights/policy/price/readiness checks; durable bounded cleanup and terminal
deletion. Old replay must not resurrect deleted content. Account/identity removal and message
retention must agree with that deletion contract without deleting existing test accounts.

Before enabling the user action, verify the entire path with distinct seller, buyer and anonymous
sessions: add -> discover -> detail/profile -> contact -> manage -> delete. Price/currency,
images, identity and visibility must agree across readers. Loading a page as owner is not an
anonymous visibility test. Close only the unsafe legacy V1 writers that could damage the new
objects and connect phone navigation to V2 when it really works; do not rewrite the whole V1.

These are activation gates, not optional polish. Failed attempts, cleanup age and reserved
bytes need bounded operational visibility without private payloads in logs. Energy, payments,
AI, remembered currency and search enhancements stay deferred. New upload/publication remains
disabled. No permission is granted to delete existing accounts, listings, images or journals.
