# Creation row boundary and integration plan

2026-10-05. Closed local candidate, not deployed policy. Source /sell read from
38d260a's selected 328-source export. The 03.10 catalog is saved evidence, not a
new production observation.

## Actual /sell sequence seen in source

`app/sell/page.tsx:677–end of createListing` validates current title/description/price,
resolves coordinates, INSERTs listing fields and browser-computed expiry, inserts an
optional owner store-category link, dispatches AI enrich, uploads images, updates the
fallback image and possibly reports an AI category correction. Failures in later
steps can happen AFTER row creation. That whole browser sequence is not SQL-atomic.
This candidate changes NONE of that source and does not replay the enrich endpoint.

## Accepted input to the proposed replacement row contract

| Field | Proposed exact rule |
| --- | --- |
| basics | Existing tested title/description/condition normalizer; creation additionally requires nonblank description and nonnull supported condition. |
| price | Existing exact decimal-string fixed/free/negotiable/unspecified contract. Lab-only 16-currency subset unchanged; not a country/launch restriction. |
| category_path | 1–3 member path from the 187 current ordinary CATEGORY_TREE prefixes. SQL is generated from a versioned JSON record tied to lib/categories.ts SHA-256. No new horse/live-animal publication flow. |
| location | country/city text, optional PAIR of decimal-text coordinates. No country inferred from IP; no currency inferred from country. Zero is valid. Up to 7 decimal places, lat ±90 / lon ±180; paired nulls allowed. This is coordinate validation, not geocoding or a privacy-precision guarantee. |
| attributes | Seven existing manufacturer/part/OEM/vehicle/engine text fields, exact keys; year ≤20 chars, others ≤160. |
| details | ≤64 simple named text values, ≤1000 chars each; no nested objects/numbers/arrays. Reserved mirrored keys rejected rather than accepting two conflicting values. UI mapper must put existing engine/manufacturer inputs into attributes. No title/description/unit conversion. |
| language | Bounded normalized language-tag shape (≤35 input chars); not a full language registry. |

Overall canonical input ≤65536 bytes. No price parsing from prose. No JSON mass
assignment to listings. The INSERT lists allowed columns explicitly. Initial legacy
price label and detail mirrors are one-way projections; the creator supplies one
value. Changing normalization later requires a new version/replay strategy, not
rewriting this version's fingerprint rules after keys are used.

## Fields outside this SQL transaction

Image uploads/objects: keep files in the browser until upload result is known. Once
creation is confirmed or recovered, keep returned listing ID. An upload error must
be displayed as "listing created, images not complete", not "nothing was saved".
Re-read existing images for explicit recovery before retrying an upload. No guarantee
of upload idempotency is claimed here; row creation must not be repeated with a new key.

Owner store category: separate existing set_my_listing_store_categories_v2 operation,
not an unchecked direct link INSERT and not part of creation receipt in this version.
On failure show that the listing exists and its category assignment is incomplete;
read current assignment before explicit retry. Global taxonomy is already in the row.
No fake owner-category table or membership query is fabricated for this test.

Geocoding: before submission; accepted resolved coordinate pair becomes part of the
fixed request snapshot. Do not re-geocode between retries and silently change its hash.
A failed optional lookup can use paired NULL coordinates according to UI policy.

AI: never re-dispatch because a creation reply was recovered. Existing enrich auth/cost
risk remains separate; this lab calls no AI and is not approval for the old automatic
background enrich call. No generic workflow/queue engine is created for these steps.

## Future UI request state (not implemented)

Create one UUID when the user commits a creation attempt, persist it with the exact
canonical user-input snapshot under account AND identity, and keep it through an
uncertain response. Replay only that same snapshot/key. New user edits while a reply
is unknown must not silently start a different creation. Re-authentication and active
identity context must match. Explicit retry is not an automatic no-limit loop.

A replay returns CURRENT owner basics/price for the same original ID. Existing later
edits remain authoritative. Timestamp and original creator match bind receipts to an
object even if a trusted test actor manually reuses the numeric ID after deletion.
Removed/inaccessible result is an error; creating a replacement requires a distinct,
explicit user decision and key. No receipt TTL, deletion endpoint or cleanup job here.

## Nonproduction-only gates

API grants stay closed. The core trigger still uses the lab postgres authority and
its legacy/DELETE/TRUNCATE scope. This does not fix all trusted-definer paths, broad
SELECT policy, legacy writers or real identity lifecycle constraints. First make all
versioned readers compatible and coordinate /sell, /my-page, V2 writes and deletion;
then do separately approved rollout and actual HTTP/JWT/browser checks.

PostgreSQL 17 primary docs consulted during implementation (not Selqiro evidence):
https://www.postgresql.org/docs/17/explicit-locking.html
https://www.postgresql.org/docs/17/transaction-iso.html
https://www.postgresql.org/docs/17/sql-createfunction.html
https://www.postgresql.org/docs/17/functions-binarystring.html
The source/evidence determines Selqiro's fields; docs only support DB semantics.
