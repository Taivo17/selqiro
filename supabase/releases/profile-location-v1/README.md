# ASUKOHT-1: profile locality foundation

This release adds the selected active profile's normalized locality or region.
It does not add geographic offer search, copy location into listings, backfill
existing rows, add temporary service positions, or change account deletion.

## Database contract

The exact RPC, input, result, permission and error contract is in
`contract.json`. The owner read and save RPCs return
`{ profile: <unchanged v1 snapshot>, location: <canonical location or null> }`.
The existing seven-field v1 patch and its optimistic revision remain the
authority for profile text, private address rules and profile updates.

The server verifies the provider suggestion proof before preparing a selection.
Only `service_role` can prepare that 15-minute selection or reserve the provider
lookup budget. Both service RPCs independently check the account, active profile,
owner and applicable business membership. Browser calls cannot supply arbitrary
coordinates to the owner save RPC: they supply a server-prepared, actor-bound
selection UUID. A selection is consumed in the same transaction as a successful
profile save. Failed saves roll back the text update and selection consumption.

All new tables have RLS enabled and no application-role table privileges or
policies. All functions explicitly revoke broad default execution grants before
granting only their intended RPC caller. The owner RPCs do not grant access to
`service_role`. No new function body or privilege replaces an existing RPC.

The canonical point is a locality/region point for both private and business
profiles. It is stored in the new private table, not in legacy latitude and
longitude columns. Existing business exact text addresses remain governed by
the existing profile rule. A change to the old country/city text invalidates
the normalized point; a name or media change does not. No old rows are backfilled.

`lock_owner` locks the account's `public.profiles` row before identity-specific
rows. That per-user lock serializes the pending-selection quota and identity
switches. It is not merely a per-identity lock. Native tests exercise the bound
with simultaneous preparations at 19/20 selections and a blocked identity switch.

## Pinned application protocol

The updater uses this sequence:

1. `preflight.sql`: read-only check of the exact accepted baseline and either
   complete absence or the exact installed release. Partial or unknown states
   are refused. An exact installed release proceeds directly to verification.
2. `apply.sql`: at most one mutation attempt. It checks the baseline and absence,
   creates the release, checks both metadata contracts, then commits.
3. The acknowledgement in `apply.sql` is produced by a separate read-only
   transaction **after COMMIT**. It is not a pre-commit promise of success.
4. `verify.sql`: a separate, read-only verification is mandatory before the
   updater's repository commit and push.

If the application result is uncertain, do not automatically retry mutation.
Use the read-only installed-state verification/resume path. A CLI exit alone is
not the accepted acknowledgement. `sql_contract.py` parses exactly one bounded
JSON result with all six expected fields, source/release pins and phase-specific
new-contract pin. It rejects extra fields, duplicate keys, malformed UTF-8,
non-JSON numbers, extra result rows, wrong phases and unknown hashes.

The SQL uses transaction-local `search_path=pg_catalog`, UTC, a 20-second
statement timeout, 3-second lock timeout and 25-second idle transaction timeout.
Owner/service functions additionally use a 2-second lock timeout. Preconditions
require the expected PostgreSQL 17.6 catalog and the actual privileged read/lock
authority needed by account checks. No default ACL or PostGIS installation is
changed. PostgREST schema reload notification is committed with the release.

## Preparation evidence and limits

`tests/profile-location-v1/sql/run_native.py` starts a fresh, isolated local
PostgreSQL 17.6 instance. It executes the actual existing profile functions and
the actual new SQL against synthetic users and tables. Unrelated optional
catalog functions are inert fixtures. The fixture has no production user data
or credentials and the process is stopped at the end.

The production baseline fingerprint deliberately does not match the smaller
synthetic fixture. Tests first require the unmodified production preflight to
reject it. Wrapper tests then substitute **only that baseline hash literal in
memory**; migration SQL, new metadata pins, grants, guards, rollback behavior,
post-commit acknowledgement and verification remain unchanged. This is isolated
preparation evidence, not a claim that a live project was migrated or tested.

The committed `expected-contract.json` and generated scripts record the accepted
diagnostic report hash and source commit. `build_release.py` is an offline
generator; it performs no database or network action. The independent review and
the native report are separately hashed by the updater's preparation proof.

The provider budget is scoped to this application's reservations: maximum 3000
over the rolling previous 24 hours, minimum 250 ms between global reservations,
and maximum 60 per account over the rolling previous hour. Timestamps contain no
queries, IP addresses or provider responses. The application needs a dedicated
provider key for this bound to describe all use of that key; unrelated callers
of the provider are outside this database's accounting.
