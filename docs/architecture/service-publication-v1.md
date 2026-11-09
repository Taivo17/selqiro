# Service publication and owner editing

Implementation checkpoint: 2026-11-09. This source adds the services adapter to
the accepted marketplace publication foundation. Local validation and the
installation boundary are recorded in `docs/continuity/CURRENT_STATE.json`.
The r2 report verifies the prior Mac database/build/push at b05ed30; the user
accepted service text and lifecycle behavior. Photo selection still failed.
The prepared photo/list correction and its deployment boundary are recorded
separately in `docs/continuity/SERVICE_PROFILE_POLISH_20261109.md`.

## User flow

`/v2/services` lists real published services with keyword, category and area
filters. `/v2/services/new` offers one form and one Publish action. There is no
mandatory visible Save draft step. Existing drafts remain recoverable and can
be completed through the same form.

My Area shows services for the active identity with their picture, title,
price, status and Edit action. Active maps to `published`; Paused maps to
`archived`. Existing `draft` records retain their meaning. Saving content does
not change an existing published or paused status. The user can resume a
paused service with the status action. This change introduces no service
expiry policy or new permanent account/listing-count quota.

An edit page becomes editable as soon as its current owner snapshot is
verified. After Save, the form adopts the confirmed revision and retires only
that terminal browser operation. A subsequent edit uses a new operation key.
Unknown or in-flight saves remain recoverable. A concurrent update never
silently overwrites local unsaved work or supplies it with an unearned revision.

The existing language preference controls English/Estonian interface text.
User-entered text, category codes and identity-owned category names are not
translated or rewritten.

## Canonical records and ownership

The canonical records remain `public.services` and `public.service_images`,
identified by their existing UUIDs. A service is never copied into `listings`
or `horse_offers`. Public and owner projections preserve the service type and
UUID. Existing rows, images and their IDs remain present through installation.

Owner commands require the authenticated user, active identity, matching
parent service and expected revision. Service-role credentials do not replace
these checks at the HTTP boundary. Public readers expose published services
only; owner snapshots are authenticated and identity scoped.

Price modes remain `fixed`, `from`, `hourly` and `contact`. Existing supported
currency and optional-price rules are retained. Contact pricing does not
invent an amount. Public location is descriptive/approximate; private GPS is
not included in discovery, detail or conversation snapshots.

New and changed category pairs must be valid and active. An existing unchanged
legacy or inactive pair remains editable; the UI must not erase it during
initialization. Global service categories remain separate from a seller's
shop taxonomy.

## Confirmed commands

The new SQL is confined to `supabase/repairs/20261108_service_publication/`.
It supplies private attempts, canonical content snapshots, revision-checked
finalization, idempotent replay, cancellation, owner reads and public reads.
The adapter follows the established listing/horse protocols without treating
a numeric listing ID and a service UUID as interchangeable.

The editor uses explicit Save/Publish. A successful request alone does not
unlock a fresh edit: the client checks authoritative content, status, revision
and exact ordered gallery membership. A lost response is reconciled by reads;
unknown outcomes do not cause a replacement operation or deletion of the
pending journal. Identity changes fence stale responses and commands.

Service publication uses the existing applicable marketplace-general policy.
A matching stored acceptance is reused; a changed policy version requires the
user's explicit acceptance. Horse factual declarations do not apply to a
service and are not fabricated for it.

## Photos and cleanup

New uploads use the shared private source, sanitized verified web image and
managed gallery lifecycle. The service adapter owns its domain bindings;
public/owner media routes recheck the correct parent, identity, status and
membership. Listing and horse media retain their own routes and checks.

A service can have zero to ten photos, an explicit primary photo and ordered
gallery membership. Existing legacy service images remain representable while
new media use the verified managed path. Photo ordering and primary selection
are separate facts: readback must preserve the requested array order and the
selected primary image.

The public detail reuses `PublicPhotoGallery`, including enlargement,
keyboard/touch navigation and the already accepted 3000-ms idle arrows.
No separate service gallery implementation is added.

The shared upload-capacity calculation continues to distinguish temporary
sources from confirmed published web images. Cleanup is limited to the
correct service attempt/parent and verified obsolete membership. The installer
does not delete Storage objects. General background cleanup remains separate.

## Public profiles and conversations

Public service search, detail and profile links use canonical service URLs.
The old demonstration discovery data and owner-only public detail are replaced
by real public reads. Paused/draft services do not appear in public search.

Contact reuses the existing inbox. The recipient comes from the authoritative
private identity owner or business account owner, with current membership and
identity checks. It is not selected from an arbitrary business member.
The current conversation context is explicitly typed as listing, horse or
service and routes to the matching detail page. Shared threads must clear the
other current domain context when the current subject changes. Historical
message cards are preserved.

## Release and validation boundary

The first services package stopped before mutation with
`DATABASE_PRECONDITIONS_NOT_MATCHED`. Its actual report has SHA-256
`6430306e81abdae9cf961a1c3722ab6e47f1a86f24f2cfa39d99f824efa61af2`.
The report's initial 1255-file Git index and 87 target-file old hashes exactly
match the accepted direct horse-edit source at commit
`78209e8ed0c7330b117d7db070b733eda5aa1723`. SQL application, file writes,
build, commit and push were not started.

The r2 correction restores two omitted historical ACL details in the disposable
fixture: the retained public TABLES default grants on service_categories, and
the exact baseline save_my_service_v2 / set_my_service_status_v2 ACLs without
the synthetic anonymous EXECUTE grant inherited from later function defaults.
These source-derived corrections reproduce both actual preflight hashes:
dependencies `9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572`
and absent capability `c33641ef8c175d9b6cb4b80dba1503b95685fd371f68e92d62607101a40c5b26`.
No broader baseline hash is accepted. The eight deployed SQL modules and all
application runtime files are unchanged from the first services candidate.
The new package has a distinct manifest-derived journal; the failed V1 journal
and issued V1 archive remain evidence and are not modified or replayed.

The updater checks the accepted 1255-file direct horse-edit source, its private
successful receipt, actual Git commit/tree/scope and the earlier verified
polish/parity/capacity chain. A receipt locates a commit; it does not replace
independent verification. Prior archives and stopped journals remain unchanged.

Preflight recognizes the exact supported service baseline and shared
publication dependencies. The database change is one guarded transaction with
postconditions. An uncertain apply is reconciled by a read and is never blindly
reissued. Source backup/build/commit/non-force push follow verified SQL success.

The SQL fixture restores the retained service table, functions, ACLs, category
and image migrations and hosted public profile reader. Provider and policy
seed scaffolding is marked synthetic. Local SQL/React/HTTP tests and the
synthetic production build do not claim a live account, real Storage operation,
Mac execution, GitHub push or Vercel deployment. After installation, the user
checks one two-photo Publish journey, repeated Edit/Save and pause/edit/resume.

## Remaining product work

Quick Update, live availability, temporary service location and a fleet/staff
model remain separate capabilities under `live_services.md`. Jobs should later
use the same simple interaction, with their own domain fields and permissions.

## Photo selection and list ordering — 2026-11-09

A native file chooser may restore window focus before its change event.
A soft owner refresh keeps the established active owner while temporarily
withholding readiness. This may delay Publish/Save but must not discard a
local photo selection. The editor checks live `canAct()` on both field and
gallery callbacks so a hard identity/session change is rejected even before
React's next render. The input copies its FileList before clearing its value,
including rejection, allowing the same file to be selected again.

`get_my_service_publications_v1` and `get_public_profile_services_v1` order
by creation time descending and UUID ascending before pagination and JSON
aggregation. Editing, manual legacy order and pause/resume do not make an old
service new. Public listing cards clamp descriptions to two lines; stored
text and public detail remain complete. These read/UI changes do not alter
service publication, status, ownership or photo validation contracts.
