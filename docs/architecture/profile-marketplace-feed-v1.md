# Public profile marketplace feed

Architecture contract: 2026-11-09. The viewed profile has one Listings section
for ordinary listings and horse offers. Services remain a separate section.
Installation, commit, deployment and user-acceptance evidence belong in
`docs/continuity/CURRENT_STATE.json`.

## Canonical data and public scope

Ordinary listings remain in `public.listings` with numeric IDs; horses remain
in `public.horse_offers` with UUIDs. A typed projection combines their public
cards. It creates no duplicate listing record or new ownership source.

`get_public_profile_marketplace_v1` resolves the requested seller slug to one
active identity. Missing or ambiguous slugs produce an unavailable empty
profile. The viewer's active identity never selects the seller being viewed.
Both domains are filtered before a shared count, order and page are computed.

| Domain | Public eligibility retained by this profile reader |
| --- | --- |
| Ordinary listing | Matching active seller identity, `status='active'`, strictly future `active_until`, and no block in either direction between viewer and listing user |
| Horse offer | Matching active seller identity, the existing `horse_publication_private.is_public` gate, and no block in either direction between viewer and publishing user |

The ordinary profile boundary excludes `NULL` expiry. Do not replace it with
the general discovery reader's more permissive expiry expression. Horse
publication finality, status and effective expiry remain in the existing horse
module. Viewing a profile does not change status, timestamps or publication.

## API and pagination

The read-only RPC accepts `p_seller_slug text`, optional
`p_store_category_id uuid`, `p_result_limit integer DEFAULT 24`, and
`p_result_offset integer DEFAULT 0`. The server accepts limits 1–60 and offsets
0–100000. EXECUTE is granted to `anon` and `authenticated` only.

The response has `schema_version=1`,
`content_scope='public_profile_marketplace'`, the requested seller slug and
store-category ID, `profile_available`, `sort='newest'`, typed `items`, a decimal
string `total_count`, the requested limit/offset, `has_more`, `next_offset` and
`window_limit_reached`. The two domains share these pagination values.

Ordering is `created_at DESC, content_type, numeric_id DESC, horse_id DESC`.
Filtering and ordering happen in SQL before LIMIT/OFFSET; the browser does not
merge independently limited horse and ordinary lists. Card keys are the
existing marketplace projection: content type/ID, horse offer type when
applicable, title, description preview, price, category path, condition,
country/city, public image URL, public seller fields and creation time. The
server limits description previews to 280 characters.

`src/entities/listing/api/getPublicProfileMarketplace.ts` makes the abortable
RPC call. `model/publicRead/publicProfileMarketplaceV1.ts` checks the exact
response shape, request scope, seller slug on every card, pagination and the
existing typed marketplace price/card contract. A category-filtered response
containing a horse is rejected. RPC or validation failure becomes a visible
error with retry, not a fallback to an owner feed.

## Profile presentation and navigation

`usePublicProfileMarketplace` discards aborted responses and hides the prior
scope synchronously when seller, filter or page changes. The listing-view hook
owns category selection, pagination and the existing browser-history return
state. Removing a selected category clears its filter and offset together.

`PublicProfileListingsSection` requests 24 cards per server page. The collapsed
preview shows the first four; the expanded section provides Previous/Next and
uses the server's next offset. The result-window boundary has an explicit
message. A confirmed empty unfiltered section is omitted; loading and failure
remain distinguishable.

`PublicProfileListingCard` uses the content type to route ordinary IDs to
`/v2/listing/[id]` and horse UUIDs to `/v2/horse-offer/[id]`. Existing image
endpoints retain their publication checks. The shared card keeps horse price
semantics, language-aware interface text and return-to-profile navigation.
User content is not translated. Full descriptions remain on detail pages;
listing and service rows use bounded two-line previews.

## Seller-owned shop categories

A selected `store_categories` row must belong to the viewed seller identity.
The SQL reader includes that row and same-identity descendants, using a
recursive UNION that terminates even for a corrupt historical cycle.
`listing_store_categories` supplies ordinary-listing membership; an unrelated
seller's category cannot select content through an erroneous link alone.

With no category filter, eligible ordinary listings and horses share the list.
With a category selected, only associated ordinary listings are eligible:
there is no horse-to-shop-category relation to infer. This reader adds no
category creation or assignment capability. Shop categories remain distinct
from marketplace and service taxonomies.

## Service creation order

`get_my_service_publications_v1` and `get_public_profile_services_v1` order by
`created_at DESC, id ASC` before pagination/limiting and JSON aggregation.
Manual `sort_order`, text edits, `updated_at`, `published_at` and pause/resume do
not make an older service newly created. Existing fields and authorization
remain unchanged.

My Area retains authenticated active-identity checks and 50-row client pages
with Load more; the SQL reader's existing maximum remains 200. The public
service profile retains its existing maximum of 80 eligible services and now
selects the newest 80. This change does not claim unlimited public service
pagination, add service expiry, or impose a new account-wide count limit.

## Delivery and verification boundary

The SQL change is confined to
`supabase/repairs/20261109_service_profile_polish/`: two replaced service
readers and one new profile reader. It changes no tables, user rows, writer
permissions, Storage objects or applied historical SQL. The guarded transaction
checks exact reader definitions/ACLs, retained r2 metadata and profile
category dependencies, then verifies unchanged unrelated invariants. An
unknown catalog is refused; an exact applied replay is a no-op.

`service-profile-polish-review.json` in that repair directory binds the SQL,
provenance and fresh targeted evidence. Its runtime cases cover 88 owner
services, 87 public services and 88 mixed profile results over four pages;
installation cases cover definition/ACL/category drift, atomic rollback,
existing-data preservation and replay. The environment is disposable
PostgreSQL/WASM with synthetic records. It does not establish a production
installation, PostgREST result, native concurrency or browser acceptance.
