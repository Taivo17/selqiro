# Horse publication V1

Status: the returned 2026-11-08 report confirms the successful horse r2
installation receipt and clean `main` `6bb4385` with 1165 source files. That
receipt records verified SQL, passed build and verified push; it is not a fresh
Vercel deployment check. The user's two-photo publication then hit the old
reservation counter. The first upload-capacity package then stopped in its
preflight before applying SQL or source changes. Its corrected r2 fixture
restores seventeen retained private functions; the application and capacity
SQL logic are unchanged. The repair and its separate installation/acceptance
boundary are described in `upload-capacity-v1.md` and
`../continuity/UPLOAD_CAPACITY_20261108.md`. Use only the current instructions in
`../continuity/HOSTED_PORTAL.md`; do not repeat the successful horse-r2 installation.
Development performed no live database, Storage or deployment operations.

## User workflow and canonical record

Create a horse listing by choosing the offer type, entering fields, selecting
photos, reviewing the required documents and confirmations, then pressing
**Publish / Avalda**. There is no mandatory separate Save draft action. The
private prepare attempt is an internal recovery mechanism. Existing private
horse drafts remain accessible and can be published through the same flow.

In My Area, both draft and published records have an Edit link. Draft edits end
with Publish; published edits end with Save changes. Text, photo additions,
removals, order and primary selection form one staged save. The current public
version remains visible until the new version commits atomically. A conflict or
uncertain response never replaces it with partial form state.

The canonical record remains `public.horse_offers` with its UUID and owner
identity. No ordinary listing is inserted as a second horse record. Owner
routes use `/v2/my-area/horse-offers/{UUID}` and `/edit`; the public route is
`/v2/horse-offer/{UUID}`. The offer type is immutable when editing.

| Type | Preserved meaning |
| --- | --- |
| `sale` | A particular horse, seller price or contact pricing |
| `free_transfer` | Free transfer, with no invented amount |
| `lease` | A particular horse, recurring fee with its explicit period |
| `co_rider` | Co-rider arrangement, recurring fee with its explicit period |
| `wanted` | Desired characteristics, buyer budget and search area; no invented horse facts |

The pilot remains Estonia/EUR. Public responses contain only permitted
locality/region fields; precise owner location stays private. The existing
English default and Estonian language switch remain one account preference.
Language changes render the same captured operation and form, rather than
creating a second request. User text is not machine translated.

## Private command and recovery

`/api/v2/horse-publication/[action]` accepts the separate horse protocol:
`prepare`, `status`, `publish`, `cancel`, `owner-read`, `image-prepare` and
`image-verify`. It does not pass a horse UUID into an ordinary listing write.

Before prepare, the client retains the exact form, actor, active identity,
request key, offer UUID/revision, ordered gallery descriptors, confirmations and
shown policy snapshot in its private operation journal. Image preparation
proofs contain sizes and hashes; photo bytes, filenames, upload credentials and
signed URLs are not retained there. Recovery can show the captured values and
ask for the same original files if their bytes must be recreated.

Receipts bind content type, actor, identity, request key, attempt, horse UUID,
revision and exact image-slot bytes/hash. Status and cancellation can resolve
an attempt by its request key when the prepare response was lost. Cancellation
before prepare retains a tombstone. An uncertain multipart PUT is verified
before any further action; it is not blindly sent again. A later operation in
another tab cannot be erased by resetting an older completed operation.

Success requires the publication receipt and a fresh authorized owner snapshot
with the same canonical content/gallery and confirmed revision. If a later
revision already exists, the interface explains that the saved version has
subsequently changed. Failure to confirm the snapshot remains a recoverable
unknown result, not a success notification.

## Policies and atomic publication

The command contains exactly the current documents that the user reviewed and
accepted, with document ID, version, content hash and acceptance flag, plus the
branch-specific factual confirmations. The original accepted document body
remains Estonian; English labels explain this without replacing its contents.
Preparation records this consent for the managed image flow; final publication
revalidates policy currency, actor, identity, content revision and gallery.
Unshown or changed documents are not accepted automatically.

The guarded SQL implementation is in
`supabase/repairs/20261108_horse_publication/`. Its seven components cover policy
and private command storage, prepare/status, finality, managed media, authority,
current messaging and public reads. The generated `apply.sql` installs 01–07 in
one guarded transaction, with exact recognized-state checks before and after.
`preflight.sql` and `verify.sql` distinguish absent, applied and unknown states;
an unknown database state is not treated as permission to overwrite it.

## Production preflight correction (r2)

The original package stopped before applying SQL or source files. The
2026-11-08 read-only report confirmed all retained function definitions,
canonical structures, policies and views. Five function ACLs and the two
PostgreSQL bootstrap-grantor memberships differed from the original local
fixture. Retained migration declarations explain those differences.

The corrected fixture reproduces the reviewed production metadata; the
generated preflight still compares exact dependency and role contracts.
Existing production ACLs and memberships are preserved. No unknown grant,
role option, function body or schema is accepted by normalizing it away.
The package has a new manifest identity, so the stopped original journal is
not reused or erased. See `../continuity/HORSE_PREFLIGHT_20261108.md`.

## Managed images and cleanup

The horse adapter reuses the existing preparation, private multipart transport,
server image processing and exact web-image receipt machinery. The shared
pipeline identifier remains `listing-web-v1`, but authorization binds each slot
to its horse attempt and client-file request key. An ordinal is the position in
the full gallery, not the index among new files.

Zero to ten photos are supported. A nonempty gallery has exactly one primary
photo. Existing images and new verified images may be mixed in one save.
Public image URLs are `/api/v2/horse-media/{attempt}/{ordinal}`; owner URLs are
`/api/v2/horse-owner-media/{attempt}/{ordinal}`. Every read checks current
membership and access. Private-source or capability URLs never enter the public
projection.

A confirmed publication can schedule a bounded cleanup pass over eligible
source/retired objects from the same command lineage. The shared worker verifies
physical absence before recording release. Failure retains the queue and does
not undo publication. This is not a persistent general background cleanup
service; abandoned/expired uploads and complete portal cleanup remain separate
work. The upload-capacity repair preserves this horse pass and follows it with
a bounded account SOURCE pass across the original actor's currently accessible
identities. See `upload-capacity-v1.md` for the exact authorization and budget
rules; canonical published WEB objects are not counted as unfinished work.

## Discovery, profile and contact

`search_public_marketplace_v1` combines ordinary listings and horses in one
read-only typed projection, keyed by `(content_type, content_id)`, with common
filtering, counts and pagination. Horse categories and all five type labels are
localized. Public detail, result cards and public profiles use canonical horse
links and validated branch-specific prices/fields. Profile Show more retains
earlier cards and does not discard them when a later page fails.

Horse contact uses the current conversation/participant/message foundation.
The contact command checks the active actor and identity, uses an idempotent
request key and binds a horse context. The thread adapter preserves typed horse
cards and ordinary listing cards within the same conversation system; it does
not create a parallel inbox or replace current message sending.

## Deliberate remaining boundaries

Editable statuses are `draft` and `published`. `held_for_review`, `paused`,
`closed`, `rejected` and `archived` are read-only in this release. New archive,
delete, pause or renewal actions have not been added. Services and jobs are not
changed by this horse release.

## Original horse verification and remaining acceptance

The following counts record the original horse implementation, not a rerun of
the current capacity repair. Current evidence is in
`../continuity/UPLOAD_CAPACITY_20261108.md` and
`../continuity/CURRENT_STATE.json`.

Local evidence at the original checkpoint: 35 controller/React server-rendered UI tests,
6 public-read/profile-page/parser tests, 9 HTTP/media tests, 8 SQL integration
checks, 9 core SQL checks and 12 installation-guard checks passed. The updater
passed 17 temporary-Git cases, including hook termination after timeout,
normal command completion and interruption. TypeScript passed. SQL checks use isolated
PostgreSQL/WASM with synthetic actors and provider metadata; HTTP checks use
synthetic transport. No native browser binary was available, so no full visual
browser or live Storage test is claimed. The final production build result is
kept in CURRENT_STATE rather than inferred here.

After the guarded installer completes and Vercel shows the resulting commit as
Ready / Production, one focused acceptance journey covers create → public
photo/detail/search/profile → edit the same UUID, add a second photo and make it
primary → contact from another permitted test account → EN/ET switching. Previously accepted ordinary
photo performance and language-installation checks are not repeated without a
new regression.

Services are next: retain `public.services` and its UUIDs, use the same simple
Publish and My Area Edit/Save experience, and adapt exact operation/media and
public/contact contracts. Jobs should follow this interaction model later.
