# Listing publication hosted preview v1

This is an **additive, closed-by-default SQL release** for an existing Selqiro
database at the exact 23-migration baseline ending in `20260928160000`. It adds
the ordinary listing publication journey and its owner/public read models. It
does not recreate accounts, listings, Auth tables, Storage tables, migrations,
existing application policies, or the local development database.

`release.sql` is the reviewed execution artifact. The numbered files are its
composition inputs; `00_preconditions.sql` and `60_preview_authority.sql` contain
markers expanded by the composer and must not be installed independently.
The activation/pause templates are separate operator actions and are **not**
included in the release or executed by its composer.

## Release contents

| Input | Responsibility |
| --- | --- |
| `00_preconditions.sql` | Exact existing baseline, role/relation/column/function checks; fresh name checks; private settings, empty actor allowlist, actor and installer guards |
| `10_price_core.sql` | Nullable new `price_kind`/`currency`, default-zero `price_revision`, normalizers and guarded structured money; legacy prices preserved |
| `20_publication_core.sql` | Attempts, slots, objects, publication/tombstone and cleanup ledgers; retained value/policy/idempotency rules; dedicated final writer |
| `30_multipart_and_journey.sql` | SOURCE and WEB multipart state, readback receipts, journey recovery, bounded Storage metadata views; terminal cleanup remains held |
| `40_read_models_and_owner.sql` | Public search/detail/profile projections; owner edit/activity/media; contact and plain messages; dedicated price/contact writers |
| `50_storage_authority.sql` | Existing-account SOURCE UploadPart authority, exact provider upload ID binding and two bucket-scoped Storage policies |
| `60_preview_authority.sql` | Exact API execution grants, service-only readiness contract, final invariant checks; set `release_ready=true` while keeping `enabled=false` |

Retained lab source is used as **declaration provenance**, not as a hosted
installer. `scripts/hosted/compose_publication_release.py` reads pinned files,
selects exact declarations, records every counted adaptation, and writes the
numbered generated components plus `release.sql`/`source-provenance.json`.
It invokes no subprocess, database, network, historical runner, fixture or seed.
To reproduce the SQL from the checkout:

```sh
python3 scripts/hosted/compose_publication_release.py
```

`source-pins.json` contains the reviewed input hashes. `source-provenance.json`
records the actually selected sources, selected declaration hashes, each
before/after adaptation hash, component hashes and final release hash. The
composer rejects changed inputs and unadapted local database/run markers.

## Preserved and explicitly adapted contracts

Existing raw prices remain raw prices with a null structured kind/currency and
revision zero. This release does not infer historical currency or rewrite
existing row contents. New ordinary listings use the retained normalized price
and compare-and-set edit contracts. The dedicated `NOLOGIN` writers have no
superuser, role-management, replication or RLS-bypass powers and are granted to
the trusted `postgres` installer only. PostgreSQL 17's automatic creator ADMIN
grant keeps its bootstrap-superuser grantor; the installer adds its own
`ADMIN FALSE, INHERIT TRUE, SET TRUE` membership for ownership management. It
does not try to grant ADMIN back to its own grantor.

The original fixture installation guards are replaced only at their explicit
top-level declaration boundary with the trusted hosted installation-context
guard. Contact schema prerequisites remain checked. The local fixture
exception in `require_upload_service()` is removed; service operations still
require the actual SQL `service_role`, not a body/JWT assertion. The local
provider commit is replaced by the honest protocol value
`provider_contract='supabase-s3-session-v1'`. No deployed provider build is
claimed by this value.

Managed Storage table ownership is retained. Three application-owned,
`security_barrier` views expose only the exact needed columns for the isolated
bucket and matching publication ledger paths to the dedicated writer. The
views are owned by the existing trusted `postgres` role and use its existing
read authority; the release does not grant new access to the provider's
multipart tables or add triggers/functions in the `storage` schema.

The managed `auth` schema grants the trusted `postgres` role usage without
grant option. Dedicated writers therefore call the new application-owned
`public.listing_actor_uid_hosted_v1()` definer wrapper, which returns only the
unchanged current `auth.uid()` and accepts no actor input. The wrapper uses
postgres' existing Auth access. No Auth namespace/function/table privilege is
expanded or granted to a writer.

The two bucket-scoped policies in component 50 still require Supabase's actual
supported policy-management authority. A plain PostgreSQL compile cannot
prove the hosted `supautils` policy permission or gateway request shape.
If the target does not authorize the exact policy DDL, abort the transaction;
do not transfer managed-table ownership or expand database-role powers.

The private actor guard checks the current settings and the allowlist under
shared transaction locks. It protects direct authenticated write RPCs as well
as the trusted service flow. Object-only post-I/O receipt functions bind back
to their ledger actor and recheck that guard. Managed listing trigger
classification also checks the guard, so an older direct update cannot bypass
the preview gate. Unmanaged legacy row behavior and existing public ACLs are
preserved. Private schemas/tables/functions receive no API grants.

## Publish and cleanup are distinct facts

A successful publication requires the retained SOURCE and WEB session binding,
successful server-owned Complete receipt, primary object version, byte count
and SHA-256 readback, ready WEB receipt, final policy and actor checks, and
atomic listing/image publication. Terminal cleanup is not a publish gate.

There is **no accepted hosted terminal-cleanup oracle in this release**. Both
retained auxiliary-receipt trigger declarations are replaced with an
unconditional `publication_hosted_terminal_cleanup_unavailable` rejection.
The receipt tables, lineage and conservative cleanup accounting remain.
Old signing/upload issuance and terminal settlement/cleanup RPCs have no API
execution grant. The hosted runtime can report pending cleanup, but cannot
claim zero remaining files or release retained reservations. Repeated attempts
therefore continue to consume the retained quotas until a separately reviewed
cleanup implementation exists.

## Installation and activation

For the existing portal continuation, follow `docs/continuity/HOSTED_PORTAL.md`.
Its Production target and installation UUID are already recorded. Keep that UUID
and continue the existing staged worktree; do not create a new preview target.
The generic initial-installation steps below do not override that current guide.

1. Associate the selected Supabase endpoint/project ref and permitted
   role/policy-management channel with this deployment. The release's built-in
   preconditions check the exact 23-version history and required existing
   relations, columns, functions and rights in the same install transaction;
   repeating the broad historical inventory/runner is not an installation step.
   A common database name such as `postgres` does not identify a hosted project.
2. For a first installation, record an installation UUID and the verified project
   ref in the private deployment record. For the existing portal, preserve its
   already recorded UUID. Use the same values in the server environment and SQL
   transaction. Do not generate a different UUID on each deployment.
3. Review `release.sql` and its final hash. In one error-aborting transaction as
   the existing trusted `postgres` role, set the two local values below, apply
   the compiled release and commit only if the entire release succeeds.
4. Provision the dedicated `listing-publication-private` bucket through the
   supported Storage API with `public=false`, `file_size_limit=26214400` and
   exactly `application/octet-stream` / `image/webp` as allowed MIME types.
   The release never writes a bucket row. Verify readiness is disabled and the
   allowlist is empty. Deploy the reviewed hosted runtime on the explicitly
   selected portal target using the same project, release and instance identity. Server flags
   alone cannot enable the new client flow.
5. Select the owner's three existing portal accounts for the seller/buyer
   journey. The installer validates all three before any cloud mutation, then
   applies `activate.template.sql` in a separate transaction with the same
   target tuple and all three actual Auth UUIDs. No new account, password,
   login session, policy acceptance or listing is seeded by this template.
   Each account uses normal password login and policy acceptance through the UI.
6. Run the first bounded real browser journey: sign in, accept required policy,
   choose an image, publish, inspect the public/owner result and edit it.
   Hosted Storage signing, gateway admission and readback need this real target
   check even after SQL compilation succeeds.

Trusted transaction settings (placeholders; these are not ready-to-run values):

```sql
BEGIN;
SET LOCAL selqiro.hosted_preview_project_ref = '<verified 20-letter project ref>';
SET LOCAL selqiro.hosted_preview_instance_id = '<recorded installation UUID>';
-- Include the compiled release.sql here, with stop-on-error enabled.
COMMIT;
```

For the separate activation transaction, also set:

```sql
SET LOCAL selqiro.hosted_preview_actor_ids = '<UUID1>,<UUID2>,<UUID3>';
-- Include activate.template.sql inside that same transaction.
```

Activation checks the exact stored target/instance/release, completed release
and Storage authority, three distinct existing Auth/profile/active identities,
and an empty or exactly matching three-account allowlist. It validates every
selected identity under transaction locks before adding all three accounts
and enabling the feature atomically. A partial or unrelated allowlist is
preserved and refused. There is no activation RPC or API-role write access to
settings. The paused 27 October single-account prompt is superseded by the
continuation in `docs/continuity/HOSTED_PORTAL.md`; the release itself is unchanged.

**Preview access is an actor gate, not a promise that published rows are
private.** If a preview deployment shares the production database, an active
test listing is an ordinary public listing and existing production readers
may display it. A private data pilot needs an isolated database target; using
the current production target requires an explicit choice to publish real
test listings. Pausing the preview does not unpublish already active rows.

## Readiness contract

Only the service role can execute:

```sql
public.get_selqiro_hosted_preview_readiness_v1(
  p_expected_project_ref text,
  p_expected_release_id text,
  p_expected_instance_id uuid,
  p_expected_user_id uuid DEFAULT NULL
) RETURNS jsonb
```

The result has exactly these ten fields:

```json
{
  "schema_version": 1,
  "scope": "hosted-preview-v1",
  "storage_contract": "supabase-s3-session-v1",
  "cleanup_mode": "held",
  "project_ref": "stored project ref",
  "release_id": "listing-publication-hosted-preview-v1",
  "instance_id": "stored installation UUID",
  "enabled": false,
  "actor_user_id": null,
  "actor_allowed": false
}
```

`enabled` requires stored activation, completed release, the exact Storage
authority marker, the actual private bucket and size/MIME contract above, and
an exact match of all three expected identity values. Both activation and every
SQL actor gate check the real bucket contract too; a later bucket change fails
readiness and further admitted writes closed.
`actor_allowed` additionally requires the supplied actor's allowlist membership.
The server verifies `/auth/v1/user` before supplying an actor for an action.
A public-media/read capability check supplies null, yielding
`actor_allowed=false`. A mismatched project/release/instance yields
`enabled=false`; a missing release never becomes an always-success marker.

## Pause and recovery

Review `pause.template.sql` to disable the same recorded target/instance.
It preserves all data, receipts, allowlist membership and reservations.
Settings-row locks serialize disabling with accepted SQL write transactions;
they do not claim to cancel an already in-flight provider request. A transport
failure or uncertain provider result remains recoverable/pending under the
retained journal and quotas. Do not invent a receipt, delete a ledger row,
release reservations manually, or use DROP-based rollback after activation.

This package does not apply itself. Validation performed by the parent task is
recorded separately with its actual baseline, role model and limitations.
