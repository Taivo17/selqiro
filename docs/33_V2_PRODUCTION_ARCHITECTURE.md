# Selqiro V2 Production Architecture

## Purpose

This document defines how Selqiro V2 production code should be built after the skeleton phase.

The goal is not only to make the portal work.

The goal is to build Selqiro so that:

- the code is clean
- the system is reliable
- the product is maintainable by a small team
- future developers can understand the logic quickly
- Taivo can manage and update the portal without unnecessary complexity
- the architecture can grow toward millions of users
- launch features work without fragile hidden complexity

Quality is more important than speed.

---

## Core decision

V2 production code will be built cleanly inside the existing repository.

The old portal remains available as a working reference.

The V2 skeleton remains available as UX and layout reference.

But production V2 code should not copy old large files directly.

Use old code to understand:

- what works
- which tables exist
- which RPC functions exist
- what user flows are already proven
- which edge cases already appeared

Do not copy old file structure or large mixed components into V2.

---

## Why not direct refactor

The existing portal works, but many responsibilities are mixed in larger files.

Examples of mixed responsibilities in old code include:

- UI
- Supabase queries
- active identity logic
- messaging state
- profile state
- listing state
- storage handling
- admin/support logic

V2 should avoid repeating this.

V2 should separate:

- data access
- business logic
- feature logic
- UI components
- route composition

---

## Architecture direction

Use a modular monolith.

Do not use microservices at launch.

Reason:

Selqiro is still early.

A modular monolith is easier to build, test, deploy and understand.

Microservices would add operational complexity too early.

The architecture should still be clean enough that parts can be separated later if needed.

---

## Recommended source structure

Production V2 should gradually move toward this structure:

src/
  shared/
    ui/
    lib/
    config/
    formatting/
    i18n/
    supabase/
    auth/

  entities/
    identity/
    listing/
    service/
    profile/
    message/
    energy/
    payment/
    admin/

  features/
    product-discovery/
    listing-detail/
    public-profile/
    my-area/
    services-discovery/
    energy-wallet/
    admin-dashboard/
    messaging/

  server/
    auth/
    data/
    actions/
    permissions/

app/
  v2/
    page.tsx
    products/page.tsx
    listing/[id]/page.tsx
    profile/[slug]/page.tsx
    my-area/page.tsx
    services/page.tsx
    energy/page.tsx
    admin/page.tsx

app/v2 routes should mostly compose feature modules.

They should not contain large business logic.

---

## Route responsibility

Route files should be small.

Good route:

- loads page shell
- calls feature page component
- passes params if needed

Bad route:

- contains Supabase queries
- contains large business logic
- contains large UI sections
- handles many unrelated concerns

Rule:

If a route grows large, move logic to a feature or entity module.

---

## Entity modules

Entities represent core Selqiro objects.

Examples:

- identity
- profile
- listing
- service
- message
- energy
- payment
- admin case

Each entity may have:

- types
- API/data access
- mappers
- validation
- small business rules

Example:

src/entities/listing/
  types.ts
  api/getListings.ts
  api/getListingById.ts
  mappers.ts

---

## Feature modules

Features represent user-facing workflows.

Examples:

- Product Discovery
- Listing Detail
- Public Profile
- My Area
- Services Discovery
- Energy Wallet
- Admin Dashboard

A feature can use several entities.

Example:

Product Discovery uses:

- listings
- profiles
- services
- location
- highlighting

Feature modules may contain:

- page component
- view components
- filters
- empty states
- loading states

---

## Data access rule

Do not scatter Supabase calls across UI components.

Preferred:

UI component
↓
feature component / hook
↓
entity API module
↓
Supabase/RPC

This makes the code easier to test and understand.

Exception:

Temporary skeletons may use mock data.

Production code should move data access into entity/server modules.

---

## Stable launch first

Launch should prefer simple stable logic over complex smart logic.

Do not add complexity just because architecture can support it.

Launch goal:

Everything that exists should work reliably.

Avoid features that are likely to create confusing behavior, unstable results or hidden maintenance burden.

---

## Ranking simplicity

Do not launch complex ranking based on profile quality, listing quality, behavior prediction, AI scoring or similar hidden logic.

Architecture may allow these later.

Launch visible sorting should stay simple.

Examples:

- Sinu lähedal
- Uuemad ees
- Odavamad ees
- Kallimad ees

Internal ordering can use basic safe rules:

- active listings first
- valid listings only
- paid highlighting where relevant
- distance if location exists
- created_at as fallback
- simple category match

Do not launch a black-box ranking system.

Reason:

Users should not feel that Selqiro decides what is suitable for them without clarity.

Complex ranking can be added later after enough real data and testing.

---

## Highlighting rule

Paid highlighting can improve visibility.

But paid visibility must not override relevance.

Example:

If user searches for lawn mower, highlighted garden equipment services may appear.

A highlighted tow truck should not appear unless it is contextually relevant.

This keeps trust.

---

## AI launch rule

AI can be used where it is clearly safe and useful.

AI should not be added where reliability, privacy or user trust could be harmed.

Launch AI can help with:

- listing text improvement when user asks
- product categorization if user confirms
- admin triage for non-private content
- support suggestions if safe

Launch AI should not:

- read private messages
- make final moderation decisions
- silently rank all users/content
- perform critical payment decisions
- replace human review in sensitive cases

If AI may create confusion or risk, defer it.

---

## Feature reliability classes

### Class A — Launch-critical

These must be very reliable before public launch:

- authentication
- active identity
- browsing listings
- listing detail
- creating/editing listing
- messages
- public profile
- basic My Area
- Energy ledger
- payments/webhook
- basic admin moderation

If these are unstable, do not launch.

### Class B — Revenue/value features

Important, but can be introduced carefully:

- listing highlighting
- service highlighting
- temporary service location
- Today’s Story
- Welcome Energy
- related highlighted services

These must have clear ledger/audit behavior.

### Class C — Later/advanced features

Can be designed now, but should not block launch:

- complex ranking
- profile quality scoring
- listing quality scoring
- AI support automation
- AI private message assistance
- global advanced search
- multi-driver live service tracking
- reputation system
- full appeals system
- advanced fraud scoring

Architecture should not block them.

But do not rush them.

---

## Quality gate

A feature should only move from idea to launch if:

- the behavior is clear
- user-facing wording is clear
- failure behavior is known
- build passes
- basic manual test passes
- data access is not scattered
- errors are handled
- empty state exists
- permissions are considered
- audit/ledger exists if money or Energy is involved
- documentation is updated

If these are not true, the feature should stay later.

---

## Definition of Done for V2 production work

Every production V2 step should include:

1. small scoped change
2. clear route or module affected
3. typed data model where needed
4. data access isolated
5. UI component kept readable
6. loading state if data is loaded
7. empty state if list can be empty
8. error state if request can fail
9. build green
10. browser check
11. docs updated if decision changed
12. commit pushed

Do not merge large unclear changes.

---

## Work style rule

Because Taivo manages the project hands-on, work must be easy to follow.

Each task should be:

- small
- explainable
- reversible
- build-tested
- committed separately

Avoid instructions that require too many simultaneous file changes unless necessary.

---

## 10 million user direction

The 10 million user goal should influence architecture, but not create premature complexity.

Prepare for scale through:

- clean modular code
- stable database schema
- indexes
- pagination
- server-side filtering
- image storage/CDN
- caching later
- background jobs later
- audit logs
- permissions
- monitoring
- rate limiting
- simple reliable flows

Do not overbuild distributed systems before real usage requires them.

---

## Old code usage rule

Old code is reference, not foundation.

Allowed:

- inspect old logic
- reuse proven SQL/RPC ideas
- reuse working Supabase table knowledge
- reuse translations where useful
- reuse simple helpers if clean

Not allowed:

- copy large old page files into V2
- copy mixed UI/data logic without refactor
- spread Supabase queries everywhere again
- bring old backup files into production structure
- keep temporary skeleton mock data as production

---

## Skeleton role

The V2 skeleton phase is useful.

Skeleton role:

- validate route structure
- validate module order
- validate UX logic
- validate product decisions
- guide implementation

Skeleton is not final production architecture.

Production implementation must cleanly separate data, features and UI.

---

## Conservative launch principle

If a feature might create instability, confusion or hidden maintenance burden, defer it.

Better:

small and reliable

Than:

large and fragile

Launch should prove that Selqiro works.

Advanced intelligence can come later.

---

## Final rule

Build Selqiro V2 as a clean, modular, reliable production system.

Use the old portal as a working reference.

Use the V2 skeleton as a UX reference.

Ship fewer features if needed, but make the shipped features stable.

---

## Launch exception: AI image category assist

AI image category assist is allowed in V2 Launch.

Reason:

It is useful, visible and user-confirmed.

It does not create hidden ranking or irreversible decisions.

Allowed launch behavior:

- analyze listing photos
- suggest category
- suggest title
- suggest brand/model if confident
- suggest service category in service mode
- user confirms or changes result

Not allowed:

- AI final category without confirmation
- AI-created categories outside category tree
- AI private message reading
- AI hidden ranking by quality
- AI auto-publishing

AI category assist must have manual fallback.

If AI fails, the user can still create the listing or service manually.

---

## Initial production source structure

V2 production source structure has started under:

src/

Initial folders:

- src/shared/supabase
- src/shared/auth
- src/entities/identity
- src/features/v2-shell

Purpose:

Create a clean place for production V2 logic before connecting real data.

This avoids putting new data logic directly into skeleton UI components.

First entity:

identity

First feature:

v2-shell

Next planned production step:

Create active identity data module and connect V2 header through that module.

---

## First production data module: active identity

The first V2 production data module connects active identity to the V2 shell.

Implemented production structure:

- src/entities/identity/api/getMyIdentities.ts
- src/entities/identity/api/getActiveIdentity.ts
- src/entities/identity/api/setActiveIdentity.ts
- src/features/v2-shell/components/V2IdentityBadge.tsx
- src/features/v2-shell/components/V2AccountActions.tsx

Rules followed:

- old SiteHeader was not copied
- active identity logic moved into identity entity API
- V2 shell uses feature component
- V2 route layout no longer owns identity data loading
- user email remains hidden from header
- active identity is visible

This is the model for future production modules.

---

## Listing entity production foundation

Listing entity production foundation has started.

Created:

- src/entities/listing/model/types.ts
- src/entities/listing/model/image.ts
- src/entities/listing/model/format.ts
- src/entities/listing/api/mappers.ts
- src/entities/listing/api/getProductListings.ts
- src/entities/listing/api/getListingById.ts

Rules followed:

- old marketplace page is used as reference only
- Supabase/RPC access is isolated into entity API
- V2 UI should use ProductListingCard and ProductListingDetail types
- listing image selection logic is separated from UI
- price, distance and location formatting are separated from UI

Next step:

Connect /v2/products to getProductListings through a small feature-level data component or hook.

---

## First V2 Product Discovery data connection

V2 Product Discovery now starts using the listing entity API for the organic results section.

Added:

- src/features/product-discovery/model/useProductDiscoveryListings.ts
- src/features/product-discovery/components/ProductListingCard.tsx
- src/features/product-discovery/components/ProductResultsSection.tsx

Rules followed:

- UI does not call Supabase directly
- ProductResultsSection uses a feature hook
- feature hook uses listing entity API
- listing entity API owns Supabase/RPC access
- loading, error and empty states exist

Current scope:

Only organic product results are connected.

Still skeleton:

- featured products
- related highlighted services
- filters actually affecting results
- pagination / infinite loading

Next step:

Add pagination and filter input flow through feature model.

---

## First V2 Listing Detail data connection

V2 Listing Detail now starts using the listing entity API.

Added:

- src/features/listing-detail/model/useListingDetail.ts
- src/features/listing-detail/components/ListingDetailPage.tsx

Updated:

- components/v2/listing/V2ListingDetailPage.tsx now wraps the feature component
- app/v2/listing/[id]/page.tsx passes route id to the feature component
- getListingById enriches seller name/slug from identity_profiles when possible

Rules followed:

- UI does not call Supabase directly
- feature hook calls listing entity API
- listing entity API owns Supabase access
- loading, error and empty states exist

Current scope:

Listing detail uses real listing data.

Still later:

- real contact action
- save listing
- related featured listings
- related services
- full translation handling
- exact public/private location precision model

---

## Listing detail data polish

After connecting V2 listing detail to real data, two small production polish fixes were added:

- numeric price strings are formatted with currency
- listing detail enriches seller name/slug from identity_profiles or legacy profiles when direct listing row does not contain seller fields

Reason:

Product Discovery RPC returns seller and price fields, but direct listing detail query may need enrichment.

The formatting and seller enrichment remain inside the listing entity layer, not UI components.

---

## Listing seller avatar support

V2 listing detail now supports seller avatar/logo.

Rules:

- seller avatar URL belongs in listing entity mapped data
- UI does not query seller logo directly
- getListingById enriches seller avatar from identity_profiles when available
- if avatar is missing, UI shows a simple initial fallback

This keeps seller visual data inside the listing entity layer.

---

## Listing detail seller consistency fix

A mismatch appeared between Product Discovery seller name and Listing Detail seller name.

Cause:

- Product Discovery used marketplace RPC seller fields.
- Listing Detail used direct listings table lookup and then legacy profile fallback.

Fix:

Listing Detail now first applies a marketplace listing snapshot for seller fields when available.

Then it enriches seller logo/avatar from identity_profiles by seller_slug or identity_id.

Fallback to legacy profiles only happens after identity profile enrichment.

This keeps Product Discovery card and Listing Detail seller identity consistent.

Later improvement:

Create a dedicated RPC such as get_marketplace_listing_by_id so Listing Detail does not need to read a marketplace snapshot from the listing feed.

---

## Listing detail seller avatar via public store RPC

Listing detail seller avatar enrichment now uses the existing public store/profile RPC when seller_slug is available.

Preferred enrichment order:

1. marketplace snapshot
2. get_store_by_slug by seller_slug
3. identity_profiles by slug
4. identity_profiles by identity_id
5. legacy profiles fallback

Reason:

The old public store/profile flow already resolves public avatar_url, banner_url and display name through get_store_by_slug.

This keeps Listing Detail consistent with public profile/store data.

---

## First V2 Public Profile data connection

V2 Public Profile now starts using the profile entity API.

Added:

- src/entities/profile/model/types.ts
- src/entities/profile/api/getPublicProfileBySlug.ts
- src/features/public-profile/model/usePublicProfile.ts
- src/features/public-profile/components/PublicProfilePage.tsx

Updated:

- components/v2/profile/V2PublicProfilePage.tsx wraps the feature component
- app/v2/profile/[slug]/page.tsx passes route slug to the feature component

Current scope:

- real public profile name
- real avatar/logo
- real banner
- real bio
- real location label
- real identity type

Still skeleton:

- product showcases
- listings
- services
- updates

---

## V2 Public Profile listings connection

The public profile "Müügis praegu" section now uses real listing data.

Added:

- src/entities/listing/api/getListingsBySeller.ts
- src/features/public-profile/model/usePublicProfileListings.ts
- src/features/public-profile/components/PublicProfileListingsSection.tsx

Logic:

- public profile entity provides identityId / legacyUserId
- listing entity loads public active listings for that seller
- UI displays loading, error, empty and success states
- Supabase access stays inside listing entity API

Current scope:

Only "Müügis praegu" is connected.

Still skeleton:

- product showcases
- services
- updates

---

## Public profile horizontal scroll containment

Public profile horizontal modules must not create page-level horizontal scrolling.

Rules:

- grid main column should use minmax(0, 1fr)
- left content column should use min-w-0
- horizontal card rows should be inside max-w-full overflow-x-auto containers
- cards should be flex-none with explicit width
- section can use overflow-hidden to keep visual boundaries stable

Reason:

Profile modules can have horizontal card rows, but scrolling must stay inside the row, not move the whole page.

---

## V2 My Area listings connection

The V2 My Area "Sinu kuulutused" section now uses real active identity listing data.

Added:

- src/entities/listing/api/getMyIdentityListings.ts
- src/features/my-area/model/useMyAreaListings.ts
- src/features/my-area/components/MyAreaListingsSection.tsx

Logic:

- My Area listings use get_my_identity_listings RPC
- RPC is wrapped inside listing entity API
- UI does not call Supabase directly
- loading, error, empty and success states exist
- edit/delete actions remain later

Current scope:

Only the My Area listings overview is connected.

Still later:

- edit listing modal
- image editing
- status change actions
- delete/restore
- store category assignment
- pagination / load more

---

## My Area listings row alignment

My Area listing rows should use fixed desktop columns.

Recommended desktop layout:

- listing image/title/info
- price
- status
- actions

Reason:

Prices, status badges and action buttons must not jump to different positions based on title length.

Mobile can stack naturally.

Desktop should stay aligned and easy to scan.

---

## Disabled unfinished actions

V2 UI should not show unfinished actions as fully active.

If an action is not implemented yet, it should be visibly disabled or clearly marked as coming later.

Example:

In My Area listings:
- "Vaata" works and opens listing detail
- "Muuda" is not implemented yet, so it is shown as disabled "Muuda hiljem"

Reason:

Quality-first launch means users should not click buttons that silently do nothing.

---

## V2 Listing Edit direction

Listing edit must be built in phases.

Do not copy the old large My Page edit implementation directly.

Editing affects live production content and should be more conservative than read-only pages.

Recommended route:

/v2/my-area/listings/[id]/edit

First implementation should be read-only owner-checked edit shell.

Saving comes later.

Image editing comes after basic text/status edit is stable.

AI category assist comes after manual edit is reliable.

---

## V2 Listing Edit read-only route

V2 Listing Edit first route has been added.

Route:

/v2/my-area/listings/[id]/edit

Current scope:

- loads listing
- checks authentication
- checks active identity / ownership
- shows read-only edit shell
- shows existing images
- shows basic fields
- shows details
- save button is disabled
- image editing is disabled

No production data is changed yet.

Next phase:

Add basic field save for title, description, price, condition and status.

---

## V2 Listing Edit basic save

V2 Listing Edit now supports safe basic field saving.

Editable fields:

- title
- description
- price
- condition
- status

The update is intentionally limited.

Not included yet:

- image editing
- category editing
- location editing
- dynamic details editing
- AI category assist

Architecture:

- UI uses useListingBasicsForm
- data update goes through listing entity API updateListingBasics
- search_text is rebuilt with buildListingSearchText
- owner check is done before update
- UI shows dirty, saving, saved and error states

This keeps editing small and testable.

---

## V2 Listing Edit date display

Listing edit should not expose raw ISO timestamps to users.

activeUntil is displayed through a small formatting helper.

Database value remains unchanged.

---

## V2 My Area listing action layout

My Area listing rows should not waste a separate column for "View".

The listing image/title/meta area opens the public listing.

The right action column contains:

- status selector
- edit link

This preserves horizontal room for listing content.

---

## V2 Listing visibility model

Public profile is a storefront, not a management view.

Rules:

- public profile: active + not expired listings only
- My Area: all owner listings, including active, paused and sold
- detail view: owner may open own paused/sold listing
- public direct link should not expose paused/sold listing as active public content
- inactive owner detail view must use active identity seller fallback if marketplace snapshot is missing

---

## V2 Listing status management location

Listing status is a management action, not a content edit action.

Rules:

- My Area listing row manages active / paused / sold
- Listing edit manages title, description, price and condition
- updateListingBasics must not update status
- this avoids stale edit forms overwriting listing status

---

## V2 Listing Edit primary image

Primary image source of truth is listing_images.

listings.image is only a fallback/snapshot for cards and legacy surfaces.

Primary image changes must go through RPC:

- set_listing_primary_image_v2
- owner check happens in database function
- selected image gets is_primary true and sort_order 0
- other images are made non-primary and sorted after it
- listings.image fallback is updated after listing_images update

Direct client update to listing_images should be avoided for this operation because RLS/table rules made it unreliable.

---

## V2 Listing Edit delete image

Image deletion is handled through Supabase RPC.

Rules:

- user must own listing
- image must belong to listing
- last image cannot be deleted
- deleting primary image promotes the next image
- listing_images remains the source of truth
- listings.image is updated as fallback/snapshot
- storage cleanup is attempted only after DB delete succeeds

Upload remains separate because it has more moving parts.

---

## V2 Listing image management UI

Image management actions should live near the image they affect.

UI rule:

- each thumbnail card owns its primary/delete actions
- avoid separate global action rows like "Tee pilt 7 esimeseks"
- keep text labels for accessibility and clarity
- upload/delete/primary logic remains separate APIs

---

## V2 Listing image upload input handling

When using file inputs, copy FileList before resetting input value.

Rule:

- const files = Array.from(input.files || [])
- then reset input.value
- pass File[] to upload handler

This prevents browsers from clearing the live FileList before upload begins.

Card image presentation should avoid excessive crop:
- use wider thumbnail ratio where possible
- use object-position tuning for product/listing images

---

## V2 Listing detail component ownership

V2 listing route imports components/v2/listing/V2ListingDetailPage.

That wrapper should delegate to the feature component:

src/features/listing-detail/components/ListingDetailPage

Gallery rules:

- thumbnails wrap into grid rows
- thumbnail is button and changes selected main image
- selected image state is UI-only
- listing_images remains source of truth for ordering
- parent layout uses minmax/min-w-0 to avoid overflow

---

## V2 Listing detail gallery reveal overlay

Auto-hidden gallery controls need a reliable reveal target.

Rule:

- if controls are hidden, render transparent overlay over main image
- overlay reveals controls on user interaction
- if controls are visible, remove overlay so arrow buttons are clickable
- selected image state remains UI-only

---

## V2 Listing detail mobile gallery

Mobile gallery should support swipe.

Rules:

- horizontal swipe changes selected image
- vertical movement should not trigger image change
- tap/reveal behavior remains separate from image order
- image ordering source remains listing_images

---

## V2 Listing detail mobile gallery pointer handling

Mobile gallery must support both vertical page scroll and horizontal image swipe.

Rules:

- overlay may be present while controls are hidden
- overlay must use touch-action: pan-y
- do not reveal controls on pointermove for touch overlay
- detect swipe on pointer down/up
- vertical movement should not trigger image change
- image order source remains listing_images

---

## V2 Listing detail horizontal thumbnail strip

Listing detail gallery should use a compact horizontal thumbnail strip.

Rules:

- thumbnail row scrolls horizontally inside gallery column
- thumbnails are fixed width and flex-none
- row must not widen the page
- thumbnail click changes selected image
- arrow controls remain optional navigation
- image ordering source remains listing_images

---

## V2 Listing detail image lightbox

Listing detail main image can open a larger lightbox view.

Rules:

- lightbox is UI-only
- selected image state is shared with gallery
- backdrop and close button close lightbox
- arrows can change selected image
- gallery image order remains listing_images

---

## V2 Listing edit image preview

Edit view and public detail view have different image goals.

Rules:

- edit preview should show as much of the uploaded image as possible
- object-contain is acceptable in edit view
- public detail can use more polished cover layout
- thumbnail number badges are unnecessary in edit image manager
- primary marker should remain visible

---

## V2 Products mobile image ratio

Do not change listing detail gallery when tuning product card images.

Rules:

- product card mobile image ratio can be adjusted independently
- detail gallery behavior should remain stable
- image/text card click opens listing detail
- image ordering source remains listing_images

---

## V2 Listing detail main image sizing

Listing detail main image should not crop important vehicle content on mobile.

Rules:

- use 4/3 visual ratio for the main image
- prefer object-contain for listing detail main image
- use neutral background behind contained images
- thumbnails remain horizontal scroll strip
- image ordering source remains listing_images

---

## V2 listing detail lightbox controls

Lightbox is separate from normal detail gallery.

Rules:
- do not change normal gallery when tuning lightbox
- lightbox uses separate control visibility state
- pointer swipe works on opened image
- arrows auto-hide after inactivity
- close button remains visible

---

## V2 Products card crop

Product discovery card images should fill their visual frame.

Rules:

- avoid object-contain if it creates gray/empty side bars
- prefer object-cover with tuned object-position
- keep rounded card/image corners
- do not change listing image source or ordering logic

---

## V2 My Area listing preview/expanded state

My Area overview stays compact but allows full owner management.

Rules:

- listing section preview limit is 5 rows
- "Vaata kõiki" expands to all loaded rows
- no separate route is needed for first version
- hook can load a larger owner-management batch
- status controls and edit route remain row-level actions

---

## V2 My Area listing search and filters

Owner listing management must support large inventories.

Rules:

- use server-side getMyIdentityListings filters where possible
- searchQuery, statusFilter and storeCategoryFilter are first-class hook inputs
- preview/expanded UI remains local state
- store categories are active-identity scoped
- category management and listing-category assignment are separate follow-up modules

---

## V2 store category hierarchy architecture

Store categories are owner-defined profile/store organization.

They are not part of the global Selqiro product category tree.

Source of truth:

- `store_categories`

Hierarchy model:

- adjacency list using `parent_id`
- root category has `parent_id = null`
- child category references another `store_categories.id`

Launch UI rule:

- V2 exposes two levels only
- root category
- direct child category

Long-term rule:

- the database model remains capable of deeper hierarchy
- adding another level later must not require replacing the table structure
- UI depth and database capability are separate concerns

Database protections:

- parent and child identity must match
- child identity cannot be null
- a category cannot reference itself
- recursive cycles are forbidden
- deleting a parent with children uses `ON DELETE RESTRICT`
- existing flat categories remain valid root categories

Listing assignment remains separate:

- `listing_store_categories` links listings to owner-defined store categories
- assigning categories to listings is a later feature step
- global marketplace category and owner store category must not be mixed into one business concept

Current RLS note:

- current management policy primarily checks `auth.uid() = user_id`
- future business staff/member permissions require a dedicated identity-membership RLS revision
- this hierarchy migration does not change existing RLS behavior

---

## V2 store category management display

The first V2 store category management module is read-only.

Structure:

- feature UI:
  `src/features/store-category-management/components/StoreCategoryManagementCard.tsx`
- loading hook:
  `src/features/my-area/model/useMyAreaStoreCategories.ts`
- composition:
  `components/v2/my-area/V2MyAreaPage.tsx`

Display rules:

- query categories by active `identity_id`
- load `parent_id` as part of the category model
- roots are rows where `parent_id` is null
- direct children are grouped below their root
- sort roots and children by `sort_order`, with name as fallback
- V2 UI renders two levels only
- database support for deeper levels remains independent from launch UI depth

Development sequence:

1. hierarchy display
2. root category creation
3. child category creation
4. rename
5. delete
6. listing assignment

Do not combine all management actions into one large implementation step.

---

## V2 store category card density and active identity refresh

Owner category management should remain compact even when an identity has many categories.

Display rules:

- root category cards use compact padding
- root names use a readable base font
- long category names wrap instead of being silently truncated
- management cards do not use fixed heights
- category counts stay on one line where possible
- direct children remain visually nested under their root

Active identity rule:

- category data is scoped to the current active identity
- listing category filters use the same active identity scope
- a future V2 identity switcher must trigger a shared active identity refresh
- category management and listing filters must not retain the previous identity's data
- identity switching should not require independent manual refreshes for each feature

Naming constraint status:

- `store_categories.name` is currently unrestricted `text`
- database length and sibling-name uniqueness constraints are not implemented yet
- existing category names must be audited before introducing those constraints

---

## V2 store category naming integrity

Store category naming rules are enforced at database level.

Canonicalization:

- trim the name
- collapse repeated whitespace
- preserve user-entered letter case for display
- compare sibling uniqueness case-insensitively

Validation:

- minimum length: 1 character
- maximum length: 60 characters
- every store category must have `identity_id`

Uniqueness scopes:

Root category:

- unique by `identity_id + lower(name)`
- applies where `parent_id is null`

Child category:

- unique by `identity_id + parent_id + lower(name)`
- applies where `parent_id is not null`

Consequences:

- different identities can use the same category names
- different root categories can contain children with the same name
- one sibling group cannot contain case-only or whitespace-only duplicates
- UI validation improves usability, but database constraints are authoritative

Creation and rename operations must handle:

- empty-name validation
- 60-character limit
- duplicate-name database errors
- active identity ownership
- database-normalized returned values

---

## V2 secure root store category creation

V2 store category writes use database RPCs.

Preferred flow:

UI component
→ feature hook
→ store-category entity API
→ Supabase RPC
→ database validation and authorization

Root creation RPC:

- `create_my_store_root_category_v2(text)`

Client contract:

- client supplies only `p_name`
- client does not choose `identity_id`
- client does not choose `user_id`
- client does not choose `parent_id`
- client does not calculate authoritative `sort_order`

Server contract:

- actor comes from `auth.uid()`
- active identity comes from `profiles.active_identity_id`
- identity access is verified in the database
- root category uses `parent_id = null`
- normalized database row is returned
- database constraints remain authoritative

Identity access helper:

- `current_user_has_identity_access(uuid)`
- private identity: active identity owned by current user
- business identity: current user has active business membership
- inactive identities are not accepted

Defense in depth:

- V2 writes use the RPC
- `store_categories` RLS also validates identity access
- direct legacy writes cannot use an inaccessible identity
- anonymous roles cannot execute category creation
- client-side validation is usability only, not authorization

Current compatibility note:

- `store_categories.user_id` currently records the acting/creating user
- future multi-staff business category management may require a dedicated
  identity-level permission and ownership model
- do not weaken current RLS before that model is designed

---

## V2 root store category creation feature

Root category creation follows the production module flow:

`StoreCategoryManagementCard`
→ `useMyAreaStoreCategories`
→ `createMyStoreRootCategory`
→ `create_my_store_root_category_v2`
→ database authorization and validation

Module responsibilities:

### Store-category model

Owns:

- `StoreCategory` type
- name maximum length
- client-side name normalization helper

### Store-category entity API

Owns:

- RPC invocation
- RPC result mapping
- database error mapping
- entity-level input validation

### My Area store-category hook

Owns:

- loading state
- category collection
- create-in-progress state
- root creation action
- category invalidation event handling

### Management UI

Owns:

- input state
- character counter
- disabled and saving states
- success and error messages
- rendering the hierarchy

Refresh architecture:

- successful mutations dispatch
  `selqiro:store-categories-changed`
- category hook instances listen for that event
- management display and listing filters reload together
- the event is local browser-state invalidation, not an authorization mechanism
- database authorization remains inside the RPC and RLS

Root creation rules:

- root means `parent_id = null`
- only the name is client input
- active identity is resolved server-side
- authoritative sort order is calculated server-side
- normalized stored row is returned
- identity isolation was browser-tested across multiple identities

Later improvements:

- a shared query cache may replace the local event mechanism if V2 data
  coordination becomes larger
- the future secure V2 identity switcher must invalidate all active-identity
  data, including store categories

---

## V2 secure child store category creation

Child category creation follows the same layered flow as root creation:

UI
→ feature hook
→ store-category entity API
→ `create_my_store_child_category_v2`
→ database authorization and validation

Client contract:

- send root category ID
- send child category name
- do not send identity ID
- do not send acting user ID
- do not calculate authoritative sort order

Server contract:

- actor is `auth.uid()`
- active identity comes from the authenticated user's profile
- active identity access is checked server-side
- parent category is locked and validated
- parent must belong to the active identity
- parent must be a root category
- created category inherits the active identity
- server calculates the next sibling sort order
- normalized created row is returned

Two-level V2 rule:

- launch management UI supports root and direct child only
- the V2 child RPC rejects a child category as the selected parent
- the underlying adjacency-list table may support additional levels through
  a future separately designed feature
- launch UI restrictions must not require replacing the database model later

Sibling uniqueness:

- duplicate names are rejected within the same parent
- the same child name can exist under another root
- the same names can exist under another identity
- database constraints remain authoritative

Required UI behavior:

- each root card may open one compact child creation form
- maximum name length is 60 characters
- character counter is shown
- only one child creation operation should be active at a time
- successful creation invalidates all mounted store-category views
- management hierarchy and listing category filters refresh together

---

## V2 child store category creation UI

Child creation follows:

`StoreCategoryManagementCard`
→ `StoreCategoryChildCreateForm`
→ `useMyAreaStoreCategories`
→ `createMyStoreChildCategory`
→ secure database RPC

UI rules:

- creation belongs visually inside the selected root card
- only one child form can be open at a time
- child form uses the shared 60-character naming rule
- success and validation messages remain local to the affected root
- child cards do not expose a further child-creation action
- successful mutations invalidate all mounted category views

---

## V2 hierarchical listing category filter direction

Owner and public listing filters must represent the category hierarchy.

Initial state:

- show `Kõik rubriigid`
- show root categories
- do not show every child as an unrelated flat filter

Root interaction:

- clicking a root selects it
- clicking a root reveals its direct children
- only one root group is expanded at a time
- root selection includes listings assigned directly to the root
- root selection also includes listings assigned to descendants

Child interaction:

- clicking a child keeps its root visually open
- child selection narrows results to the selected child scope
- V2 two-level UI means the child currently has no visible descendants

Data rule:

- do not duplicate listing-category links merely to support parent filtering
- a listing assigned to a child does not also need a stored parent link
- category ancestry is resolved by the query
- backend scope resolution should be recursive so deeper future trees do not
  require replacing the filter architecture

Shared UI direction:

- My Area and public profile should reuse the same hierarchy-filter foundation
- My Area and public profile may use different listing visibility queries
- public profile must continue to hide paused, sold and expired listings

---

## Hierarchical store-category scope for listing queries

Store-category ancestry is resolved server-side.

Data flow:

UI selected category ID
→ listing feature hook
→ listing entity API
→ `get_my_identity_listings`
→ recursive category scope
→ listing/category relation lookup

Scope semantics:

- no selected category:
  all listings matching the other filters
- selected root:
  root plus every descendant
- selected child:
  child plus every descendant below it

Architecture rules:

- the client sends one category ID
- the client does not fetch or construct descendant ID arrays
- the database owns ancestry traversal
- scope is restricted by active identity
- cycles are guarded during recursive traversal
- the existing RPC signature remains stable

Listing assignment rule:

- store only the category or categories explicitly selected for the listing
- do not add parent links automatically only for discovery/filter behavior
- parent filtering is derived from hierarchy
- this avoids duplicate links and inconsistent ancestry data

Future compatibility:

- V2 UI currently exposes two levels
- recursive server-side scope remains compatible with deeper future trees
- public profile filtering should reuse the same category-scope principle
- public profile listing visibility remains a separate concern:
  only active and non-expired listings are public

---

## V2 hierarchical store-category filter component

The listing category hierarchy now has a reusable presentation component:

- `StoreCategoryHierarchyFilter`

Data inputs:

- complete active-identity store category collection
- selected category ID
- all-categories sentinel value
- selection callback

The component owns:

- grouping direct children under roots
- root and child sorting
- currently expanded root
- root/child visual selection
- accessible expanded-state attributes
- one-expanded-branch behavior

The listing feature owns:

- selected category state
- resetting category state
- passing the selected UUID to the listing hook
- resetting preview expansion when a filter changes

The listing hook and entity API own:

- loading owner listings
- forwarding the selected UUID to the database RPC
- loading and error state

The database owns:

- active identity authorization
- recursive category ancestry
- root-plus-descendant scope resolution
- listing/category relation matching

Interaction rules:

- root click selects the root branch and expands children
- child click selects the child and keeps the root expanded
- all-categories selection closes the hierarchy
- clear-filters resets the hierarchy through selected-state changes
- the UI must not calculate descendant category IDs

Shared component direction:

- the same hierarchy-filter foundation should later be reused on public
  profiles
- My Area queries may include active, paused and sold owner listings
- public profile queries must continue to expose only active,
  non-expired listings

---

## Secure store-category rename operation

Store-category rename uses:

UI
→ feature hook
→ store-category entity API
→ `rename_my_store_category_v2`
→ database authorization and validation

Rename contract:

- accept category ID and new name
- resolve actor from `auth.uid()`
- resolve active identity from the authenticated user's profile
- verify access to the active identity
- verify that the category belongs to that identity
- update only the category name
- return the normalized updated category row

Hierarchy invariants:

- renaming a root keeps it as a root
- renaming a child keeps the same parent
- rename does not move a category
- rename does not change order
- rename does not change ownership or identity

UI direction:

- root and child cards use the same inline rename interaction
- only one category should be edited at a time
- edit mode shows:
  - input
  - 60-character counter
  - Salvesta
  - Tühista
- success refreshes every mounted store-category view
- duplicate and validation errors are shown near the edited category
- moving categories is a separate future feature

---

## V2 store-category inline rename UI

Rename flow:

`StoreCategoryRenameControl`
→ `useMyAreaStoreCategories`
→ `renameMyStoreCategory`
→ `rename_my_store_category_v2`
→ database authorization and validation

UI responsibilities:

- display the current name
- open one inline editor
- enforce the shared 60-character input limit
- show saving and validation states
- support cancel
- show a local success or error message

Feature-hook responsibilities:

- track `renamingCategoryId`
- prevent simultaneous category mutations
- invoke the entity API
- invalidate mounted store-category views after success

Database responsibilities:

- verify active identity access
- normalize the new name
- enforce sibling uniqueness
- modify only `name`
- preserve hierarchy and ordering

Delete remains a separate operation because it changes relations between categories and listings.

---

## Secure store-category deletion

Deletion flow:

UI confirmation
→ `useMyAreaStoreCategories`
→ store-category entity API
→ `delete_my_store_category_v2`
→ database authorization and relation cleanup

Allowed operations:

- delete one child category
- delete one root category that has no children

Forbidden operations:

- deleting a root that still has children
- automatic cascading deletion of child categories
- deleting a category from another identity
- deleting listings together with a category

Relation behavior:

- listings remain intact
- only `listing_store_categories` rows for the deleted category are removed
- RPC explicitly counts and deletes those relations
- the foreign key also provides cascade cleanup as defense in depth

RPC result:

- deleted category identity
- deleted display name
- former parent ID
- deleted level
- removed listing-link count

Required UI behavior:

- deletion requires explicit confirmation
- confirmation names the category being deleted
- confirmation explains that listings remain
- confirmation explains how many listing links may be removed when known
- roots with children show deletion as disabled with an explanation
- child categories and childless roots can expose the delete action
- successful deletion invalidates all mounted category views
- a deleted selected listing filter must reset to all categories
- only one category mutation may run at a time

---

## V2 store-category deletion UI

Deletion flow:

`StoreCategoryDeleteControl`
→ `StoreCategoryManagementCard`
→ `useMyAreaStoreCategories`
→ `deleteMyStoreCategory`
→ `delete_my_store_category_v2`
→ database authorization and relation cleanup

UI responsibilities:

- expose deletion for child categories
- expose deletion for childless root categories
- disable root deletion when children exist
- explain why deletion is disabled
- require explicit confirmation
- name the affected category
- explain that listings remain
- expose cancel and deleting states
- show the removed listing-link count after success

Feature-hook responsibilities:

- track `deletingCategoryId`
- prevent concurrent category mutations
- invoke the entity API
- invalidate every mounted category view after success

Listing-filter behavior:

- category views reload after deletion
- a selected category that no longer exists must reset to all categories
- the reset must also close the expanded hierarchy branch
- the client must not keep a stale deleted category UUID as an active filter

Database responsibilities:

- authorize against the authenticated user's active identity
- reject cross-identity deletion
- reject deletion of a root with children
- remove listing/category relations
- preserve all listings
- return the deleted category metadata and relation count

No automatic child deletion is allowed.
Moving or reordering categories remains a separate future feature.

---

## Secure listing store-category assignment

Assignment flow:

hierarchical listing-category selector
→ listing-category feature hook
→ listing entity API
→ `set_my_listing_store_categories_v2`
→ atomic `listing_store_categories` replacement

Operation boundary:

- listing basic-field save remains a separate operation
- status management remains in My Area
- image management remains separate
- store-category assignment has its own saving, success and error states

Database responsibilities:

- resolve the authenticated user
- resolve and authorize the active identity
- lock and verify the listing
- verify every selected category
- normalize duplicate and null category IDs
- replace the complete relation set atomically
- roll back the deletion if any insertion or validation fails

Data rules:

- store only categories explicitly selected by the owner
- do not duplicate parent links for selected children
- hierarchy is derived from `store_categories.parent_id`
- parent filtering is handled by recursive query scope, not duplicated relations
- an empty selected set is valid and removes all store-category relations

Current identity rule:

- V2 assignment requires `listings.identity_id`
- legacy user-only listings must be migrated to identity ownership before using this RPC

RPC result:

- listing ID
- normalized selected category IDs
- assigned category count
- removed previous-link count

---

## V2 listing store-category client assignment layer

Client architecture:

`ListingStoreCategoryAssignmentCard`
→ `useListingStoreCategoryAssignment`
→ listing entity APIs
→ secure assignment RPC

Entity APIs:

- `getListingStoreCategoryIds`
  loads current explicit relation IDs
- `setListingStoreCategories`
  replaces the explicit relation set through the RPC

Hook responsibilities:

- retain the last saved category set
- retain the current selected category set
- detect unsaved changes independently of array order
- support selecting, clearing and resetting
- expose separate loading and saving states
- reload local saved state from the RPC result after success

Presentation responsibilities:

- combine relation IDs with the active identity category tree
- display root names directly
- display child names with their root path
- distinguish missing or stale category references
- keep this operation independent of listing basics and images

The current card is read-only for connection verification.
The next UI version adds hierarchical explicit selection and a separate save action.

---

## V2 listing store-category hierarchical assignment UI

UI flow:

`ListingStoreCategorySelector`
→ `ListingStoreCategoryAssignmentCard`
→ `useListingStoreCategoryAssignment`
→ `setListingStoreCategories`
→ `set_my_listing_store_categories_v2`
→ `listing_store_categories`

Selector responsibilities:

- render root categories
- group direct children under their root
- keep every root and child selection independent
- display selected and unselected states clearly
- support multiple explicit selections
- avoid implicit parent or child mutations
- warn when deeper unsupported UI levels exist

Assignment-card responsibilities:

- combine active-identity categories with current listing relation IDs
- expose the selected count
- expose unsaved-change state
- provide clear, reset and save actions
- display loading, saving, success and error states
- prevent saving before the existing assignment set has loaded
- prevent saving stale missing category references

Hook responsibilities:

- retain the last saved normalized category set
- retain the current selected normalized category set
- compare sets independently of array order
- support toggle, clear and reset actions
- save the complete selected set atomically
- replace saved local state from the RPC result

Operation boundaries:

- listing basics remain a separate save operation
- image management remains separate
- listing status remains managed from My Area
- store-category assignment changes only `listing_store_categories`

Data principle:

- only explicit relations are stored
- parent filtering includes descendants through recursive database scope
- parent relations are not duplicated merely to support filtering

---

## V2 public-profile hierarchical store-category filtering

Public filter flow:

`PublicProfileStoreCategoryFilter`
→ selected category state in `PublicProfileListingsSection`
→ `getStoreCategoryScopeIds`
→ `usePublicProfileListings`
→ `getListingsBySeller`
→ `listing_store_categories`
→ publicly visible listings

Category ownership boundary:

- the viewed public profile supplies the category `identity_id`
- the current viewer active identity is irrelevant to this category query
- changing the viewer active identity must not change the viewed profile tree
- switching the viewed profile clears the previous category selection

Scope semantics:

- `null` means all publicly visible listings
- a root category resolves to the root and every descendant
- a child resolves to the child and every possible descendant
- an invalid or stale category resolves to an empty scope
- an empty explicit scope returns no listings
- recursive scope supports future deeper category levels

Query behavior:

- without a category filter, no category relation join is required
- with a category filter, use an inner `listing_store_categories` relation
- a listing matches when it has at least one explicit relation inside the scope
- parent filtering works through scope expansion
- parent relations are not automatically duplicated on listings

Public visibility boundary:

- listing identity must match the viewed profile
- listing status must be `active`
- listing expiration must be in the future
- paused, sold and expired listings remain invisible
- category filtering must never weaken these rules

UI behavior:

- render all-listings and root pills initially
- open direct children only for the active root
- selecting a root immediately applies the branch filter
- selecting a child applies a narrower filter
- selecting another root closes the previous branch
- selecting all closes the branch and removes the filter
- current UI renders two visible levels while the data scope remains recursive

---

## V2 secure active-identity switching

Canonical switch flow:

`V2IdentityBadge`
→ `useV2IdentitySwitcher`
→ `setActiveIdentity`
→ `set_my_active_identity_v2`
→ validated update of `profiles.active_identity_id`

Database boundary:

- RPC resolves the authenticated user through `auth.uid()`
- RPC validates the target active identity
- RPC validates private ownership or active business membership
- RPC serializes concurrent switches through a profile-row lock
- RPC returns the selected identity summary and whether the value changed
- authenticated role may execute the RPC
- anon role may not execute the RPC

Legacy compatibility:

- a trigger validates every authenticated direct update of `profiles.active_identity_id`
- the old application may continue using its direct update path
- inaccessible and empty identities remain blocked
- trusted postgres/backend operations without an end-user JWT remain possible

V2 client boundary:

- `setActiveIdentity` accepts only `identityId`
- V2 code must not write `profiles.active_identity_id` directly
- V2 code must not trust a client-supplied user ID
- successful RPC response becomes the immediate active identity state

Identity list loading:

- `get_my_identities` is the authoritative accessible-identity list
- slug is read from the RPC response
- no secondary `identity_profiles` browser query is required
- this avoids recursive business-membership RLS evaluation

Owner-route refresh:

- My Area and other active-identity owner modules require a full refresh after a real switch
- listing detail and edit pages require a refresh because ownership can change
- public profile pages remain tied to their route slug and are not automatically reloaded or redirected

Listing ownership precedence:

1. when `listing.identity_id` exists, ownership requires equality with the active identity
2. when `listing.identity_id` is null, legacy `listing.user_id` may be used
3. account ownership alone never overrides an existing listing identity

This precedence must remain consistent across:

- editable-listing loading
- listing-detail owner visibility
- basic listing updates
- listing images
- listing status
- store-category assignment

---

## Public profile compact and expanded modules

Public profile content must remain easy to scan on mobile.

Rules:

- compact content is a horizontal preview
- expanded content is a vertical responsive grid
- view state is independent from listing category filters
- filter changes must not reset the expanded state
- only profile sections with real content are rendered
- zero total listings hides the complete listing section
- zero filtered listings keeps the section and filters visible
- mock showcase and service content must not appear as production profile data
- product showcases and services can reuse the same compact/expanded component after their real entity APIs are connected

## V2 product showcase media and content activity lifecycle

### Product showcase role

Product showcases are identity-owned public-profile portfolio content.

They are separate from:

- marketplace listings;
- marketplace search;
- services;
- Selqiro global product categories;
- identity-owned store categories.

A product showcase can represent a completed job, a product example,
previous experience or other portfolio content without claiming that the
item is currently for sale.

### Product showcase image architecture

The first production image-management implementation uses these rules:

- a showcase is saved as a draft before images are uploaded;
- the stable showcase ID scopes all related image operations;
- images are stored through the dedicated showcase image data model;
- an identity can manage only showcases belonging to its active identity;
- a showcase supports at most 10 images;
- accepted source formats are JPG, PNG and WEBP;
- the maximum source file size is 10 MB;
- one image is selected as the primary image;
- deleting or changing the primary image is handled through server RPCs;
- publishing is rejected unless at least one image exists;
- legacy `image_url` remains available for compatibility;
- legacy `external_url` values remain preserved but are not exposed as
  clickable links in the current V2 interface.

Permanent showcase deletion is a separate future operation. It must remove:

1. the identity-owned showcase row;
2. all related image rows;
3. all related Storage objects.

Database rows and Storage files must not be allowed to become orphaned.

Published showcase data still needs a separate public-profile query and UI
connection. Draft and archived showcases must remain owner-only.

### Locked content activity contract

Content activity represents the latest owner confirmation that public
information is still current.

The lifecycle must keep these meanings separate:

- `created_at` is the original creation time and never resets;
- `published_at` is the first publication time and never resets;
- `updated_at` records a substantive content change;
- `last_confirmed_at` records the latest owner freshness confirmation;
- `active_until` defines public visibility expiry.

Activity periods:

- marketplace listing: 90 days;
- service: 365 days;
- product showcase: 365 days.

All activity timestamps must be calculated server-side using database time.

For published content, a substantive owner edit must set:

- `updated_at = now()`;
- `last_confirmed_at = now()`;
- `active_until = now() + the content activity period`.

An explicit freshness confirmation without a content edit must set:

- `last_confirmed_at = now()`;
- `active_until = now() + the content activity period`;

and must not change `updated_at`.

The new period always starts from the confirmation or edit time. Remaining
days from the previous period are not accumulated.

### Status and expiry separation

Publication status and expiry are separate concepts.

An expired item does not require a background job to rewrite its status.
Public queries exclude content whose `active_until` is not in the future.

Owner views may continue to show the stored publication status together with
a calculated state such as:

- active;
- expiring soon;
- expired and requiring confirmation.

Editing must not automatically publish:

- paused listings;
- sold listings;
- draft showcases;
- archived showcases;
- hidden or otherwise non-public services.

Reactivation of expired content must be explicit where an edit would make
previously invisible content public again.

### Ranking and freshness safety

Renewing activity must not:

- change the original creation time;
- change the first publication time;
- add a new-content badge;
- move content to the top as if newly created;
- grant an advertising or ranking advantage.

The activity lifecycle exists only to keep public information current.

The owner UI should later provide:

- an advance warning 30 days before expiry;
- a stronger warning 7 days before expiry;
- individual confirmation controls;
- selection-based bulk confirmation;
- expired-content recovery without data loss.

The first isolated lifecycle implementation should be added to product
showcases before the same pattern is applied to services and listings.

### Implemented product-showcase lifecycle checkpoint — 2026-07-28

The linked production database now contains the product-showcase activity lifecycle introduced by migration `20260726150000_add_product_showcase_activity_lifecycle.sql`.

Data model:

- `product_showcases.last_confirmed_at timestamptz`;
- `product_showcases.active_until timestamptz`;
- published rows must have a valid activity interval;
- existing published rows received a fresh transition period of 365 days.

Server-side lifecycle:

- `set_product_showcase_content_activity_v2()` preserves first publication time and renews still-active published content after substantive edits;
- `touch_product_showcase_after_image_change_v2()` handles real gallery inserts, updates and deletes;
- `confirm_my_product_showcase_activity_v2(uuid)` performs explicit owner confirmation without changing `updated_at`;
- expired content edits do not silently reactivate public visibility.

Visibility:

- anonymous readers see only `status = 'published'` rows whose `active_until` is in the future;
- unrelated authenticated readers have the same public boundary;
- authorized identity members retain owner access to active, expired, draft and archived rows;
- public image-row access follows the parent showcase activity boundary;
- the separate identity-member image policy preserves owner access.

Performance:

- `product_showcases_identity_activity_idx` supports identity, status, expiry and profile-order access patterns;
- activity confirmation does not change ranking or make old content appear newly created.

Storage boundary:

- `product-showcase-images` is still a public bucket;
- RLS protects database rows and discovery paths, not an already known direct public object URL;
- a future private-bucket design must use signed URLs and must be implemented as a separate migration plus application rollout.

### Implemented product-showcase owner activity UI — 2026-07-29

The owner management view now consumes the production lifecycle fields `last_confirmed_at` and `active_until`.

Client rules:

- activity state is calculated from the server-provided expiry timestamp;
- hydration-safe time evaluation starts after the component mounts;
- the comparison clock refreshes once per minute;
- active content has more than 30 days remaining;
- warning content has 8–30 days remaining;
- urgent content has 1–7 days remaining;
- expired or invalid published content is not counted as publicly active;
- draft and archived content has no public-activity presentation;
- the UI calculation does not mutate lifecycle data or influence ranking.

A short-lived 366-day label can appear immediately after a status RPC because the client clock can predate the newly generated server timestamp by a few seconds. A refresh resolves the presentation to 365 days. This does not represent an incorrect database interval.

Permanent deletion remains a separate security-sensitive workflow. It must remove the owner-authorized showcase row, dependent image rows and corresponding Storage objects without exposing a partial-delete state.

### Implemented product-showcase permanent-deletion foundation — 2026-07-30

Permanent deletion is a coordinated database-and-Storage workflow rather than a direct client-side table delete.

Production invariants:

1. Only an active-identity archived showcase can be prepared.
2. Preparation places a UUID deletion token and timestamp on the showcase.
3. A deletion token freezes parent content, status changes and all gallery mutations.
4. Archived or deleting showcases reject new Storage uploads and image-row insertion.
5. The preparation manifest includes registered gallery paths and orphaned objects beneath the showcase folder.
6. Database deletion is rejected while any corresponding Storage object remains.
7. Cancellation is permitted only before registered Storage cleanup begins.
8. Once cleanup is partial, the workflow must be retried to completion.
9. Final deletion removes the parent and dependent image rows transactionally.
10. Ownership and active-identity access are revalidated inside each security-definer RPC.

Storage objects must be removed through the Storage API, not by direct SQL against `storage.objects`. Cross-member business-identity cleanup requires a trusted server environment because browser Storage deletion is scoped to the uploader's own path.

The service/secret key must never be included in a client bundle. The next layer is an authenticated Next.js server route that validates the user's session, prepares the deletion, removes every manifest path with the server client and finalizes the database deletion.

### Implemented trusted product-showcase deletion orchestration — 2026-07-30

Permanent product-showcase deletion now has a trusted Next.js server layer above the production database foundation.

Request boundary:

1. The browser submits only the archived showcase ID and its current user access token.
2. The server verifies the token through Supabase Auth.
3. A user-scoped Supabase client calls the preparation RPC so `auth.uid()`, active identity and membership checks remain authoritative.
4. The server accepts only the Storage manifest returned by the database.
5. Every manifest path is validated against the requested showcase folder before privileged deletion.
6. A server-only service-role client removes the Storage objects in bounded batches.
7. The user-scoped client calls the final RPC with the database-issued UUID deletion token.
8. A narrow service-role existence check resolves a concurrent already-completed deletion as idempotent success.

Security invariants:

- the service-role key is never exposed to the browser;
- client input cannot select arbitrary Storage objects;
- database RPCs are not replaced with service-role ownership decisions;
- malformed, unauthenticated and non-archived requests fail before destructive work;
- partial Storage cleanup remains retryable through the database deletion lock;
- route responses use `Cache-Control: no-store`;
- server errors expose a request ID but not privileged internal details.

The route has passed a complete local Auth, HTTP, database and real Storage API E2E test, including cleanup of an object stored below another uploader's user-ID directory.

### Implemented product-showcase deletion owner UI — 2026-07-31

The trusted server deletion workflow now has an owner-facing management UI.

Client sequence:

1. The permanent-delete control is shown only when the local entity status is `archived`.
2. The owner opens an inline destructive confirmation panel.
3. The owner must enter the normalized showcase title exactly.
4. The browser retrieves the current authenticated session token.
5. The browser sends only the showcase UUID to `POST /api/product-showcases/delete`.
6. The trusted server and database perform all authoritative authorization and deletion checks.
7. After successful completion, the management hook removes the showcase from local state.
8. The owner receives success feedback without requiring a full page reload.

Client safety invariants:

- title confirmation is never treated as authorization;
- the browser cannot submit Storage paths or a deletion token;
- draft and published showcases have no permanent-delete control;
- the server still rejects any non-archived showcase even if client code is bypassed;
- saving, status changes and deletion are mutually exclusive;
- confirmation cannot be cancelled while final deletion is running;
- a failed deletion leaves the confirmation open and displays the server-safe error beside the affected showcase;
- a successful deletion cannot be reintroduced by an older in-flight list request.

The complete flow has passed manual browser testing in addition to the previously completed Auth, HTTP, database and Storage E2E test.

### Implemented public product-showcase profile read model — 2026-08-01

Public profile product-showcase reads now use a dedicated minimal model rather than the owner-management entity.

Read sequence:

1. Resolve the public profile and its stable identity UUID.
2. Query `product_showcases` for the identity, `published` status and `active_until > request time`.
3. Map and validate UUIDs, dates, status and identity ownership on the client boundary.
4. Query all matching `product_showcase_images` rows in one bounded request.
5. Sort each gallery by primary flag, sort order, creation time and ID.
6. Drop any showcase that has no usable public image.
7. Render the resulting immutable public model.

Privacy and scalability properties:

- the public select excludes `uploaded_by_user_id`, `storage_path` and `external_url`;
- no owner mutation APIs are imported into the public-profile feature;
- gallery loading does not create an N+1 query pattern;
- showcase and image result sizes are bounded;
- database RLS remains authoritative for anonymous and authenticated viewers;
- client-side validation is defense in depth, not authorization.

Public UI invariants:

- no section is rendered for an empty public result;
- compact cards are horizontally contained and do not widen the page;
- expanded cards use a one-column mobile and two-column wider layout;
- the selected card image and fullscreen image remain synchronized;
- fullscreen navigation supports keyboard and pointer input;
- body scrolling is restored on every lightbox cleanup path;
- long descriptions are measured with a null-safe `ResizeObserver` flow before showing the expansion control.

### Implemented listing return-navigation foundation — 2026-08-01

Listing detail navigation now has a shared tab-local return-context boundary.

Stored return fields:

- context version and unique token;
- trusted same-origin source route;
- source type;
- listing ID;
- absolute `scrollY`;
- listing-card viewport offset;
- creation timestamp with a short validity window.

Restoration rules:

1. Save the context immediately before client-side detail navigation.
2. Mark the source browser-history entry with the same token.
3. Restore only when the current route, source type and history token match.
4. Wait until the source listing collection has completed loading.
5. Prefer aligning the original card to its former viewport offset.
6. Fall back to the saved absolute scroll position when the card is unavailable.
7. Repeat alignment across short render delays to tolerate asynchronous layout changes.
8. Clear the context after successful restoration.

The storage boundary is `sessionStorage`; no navigation history is written to Supabase or analytics. The design is extensible to public-profile UI state without coupling listing entities to profile components.

### Public-profile listing return-state extension — 2026-08-01

The tab-local listing return context now has an optional public-profile state payload:

- `showAll`;
- `selectedCategoryId`;
- `expandedRootId`;
- `horizontalScrollLeft`.

Public-profile restoration sequence:

1. Validate the same-origin profile URL and matching history token.
2. Restore the category and expanded/compact UI state.
3. Resolve the category scope IDs.
4. Wait until the listing request associated with the current `categoryScopeKey` has settled.
5. Render the correct filtered listing collection.
6. Restore horizontal row position when the compact view is active.
7. Align the original listing card to its previous viewport position.
8. Clear the temporary return context.

The public listing data hook stores an internal `resolvedScopeKey`. A render whose requested category key differs from the resolved key is exposed as loading, even before React runs the new request effect. This prevents stale query results from triggering premature scroll restoration.

### Coordinated public-profile expansion state — 2026-08-02

The public profile now owns a single expansion state instead of allowing independent large child sections to remain open simultaneously.

State boundary:

- `PublicProfilePage` owns the active expanded section;
- product showcases receive controlled `expanded` and `onExpandedChange` props;
- listings receive controlled `showAll` and `onShowAllChange` props.

Behavioral rules:

1. Opening product showcases closes expanded listings.
2. Opening listings closes expanded product showcases.
3. Store-category controls are mounted only in expanded listings mode.
4. Compact listings mode clears hidden category state after the profile return state has been prepared.
5. Listing-return restoration remains authoritative and may reopen listings before card-position restoration.
6. No database or persistent profile preference is used for this transient presentation state.

This keeps the public page easier to scan on narrow screens while preserving the previously implemented return-navigation contract.

### Public product-showcase pointer-swipe boundary — 2026-08-02

The public product-showcase gallery now uses a local Pointer Events gesture boundary.

Gesture rules:

1. Record the pointer start coordinates only for non-mouse pointers and multi-image galleries.
2. Accept a swipe only when horizontal movement reaches the minimum threshold and clearly dominates vertical movement.
3. Use `touch-action: pan-y` so vertical document scrolling remains native.
4. In expanded card mode, update the selected image without opening the lightbox.
5. Suppress the synthetic post-swipe click for a short interval.
6. In the lightbox, reuse the existing previous/next image functions and reschedule control auto-hide.
7. Do not attach card-level image swipe capture in the compact horizontal showcase row.
8. Preserve thumbnail, keyboard, arrow-button and modal-close navigation as independent accessible controls.

This is transient presentation behavior only. It does not add persistence, analytics, database writes or new public data fields.

Real-device verification on the Vercel deployment confirmed that the pointer boundary behaves correctly on a phone: horizontal swipes change images, vertical movement keeps native page scrolling, and normal taps remain available for opening the lightbox.

### Public showcase gallery component boundary — 2026-08-02

The public product-showcase presentation is now split across two focused components.

`PublicProfileProductShowcasesSection` owns:

1. public showcase data loading;
2. compact versus expanded section layout;
3. card collection rendering;
4. title, category and description presentation;
5. long-description overflow measurement;
6. parent-controlled section expansion.

`PublicProfileProductShowcaseGallery` owns:

1. gallery-selected image state;
2. main image and thumbnail rendering;
3. previous/next navigation;
4. full-screen lightbox lifecycle;
5. keyboard and modal-close behavior;
6. body scroll locking;
7. control auto-hide timing;
8. pointer-swipe gesture handling.

The boundary is presentation-only. It does not change public data minimization, API contracts, database state, storage paths or navigation state.

### Public showcase description component boundary — 2026-08-02

Public product-showcase text presentation now has a dedicated component boundary.

`PublicProfileProductShowcaseDescription` owns:

1. description expansion state;
2. DOM measurement state and refs;
3. initial animation-frame measurement;
4. responsive `ResizeObserver` measurement;
5. compact and expanded line-clamp selection;
6. the accessible expand/collapse control.

`PublicProfileProductShowcasesSection` continues to own:

1. public showcase data loading;
2. compact versus expanded section layout;
3. card collection and card composition;
4. title and category presentation;
5. gallery and description component composition;
6. parent-controlled section expansion.

The boundary is presentation-only and does not change API contracts, public data minimization, database state, storage paths or navigation state.

### V2 service owner-display boundary — 2026-08-02

The owner-facing V2 service display now follows the entity → feature model → feature component boundary.

`src/entities/service/model/types.ts` owns:

1. service status and price-type unions;
2. the normalized owner-facing `Service` entity shape.

`src/entities/service/api/getMyServices.ts` owns:

1. UUID and row normalization;
2. explicit field selection from `public.services`;
3. active-identity filtering;
4. deterministic owner ordering;
5. bounded result size;
6. database error translation.

`src/features/service-management/model/useMyServices.ts` owns:

1. authentication and active-identity resolution;
2. loading, error and service collection state;
3. stale-request protection;
4. active-identity change reloads;
5. manual refresh.

`MyServicesSection` owns owner-facing presentation states and compact versus full list display.

The database contract remains the existing `public.services` table with RLS. This patch adds no migration and performs no direct service mutation.

### Global service taxonomy — 2026-08-03

`public.service_categories` is the canonical global taxonomy for services.

It is intentionally separate from `public.store_categories`:

- `service_categories` supports platform-wide service discovery, filtering, AI suggestions and related-service grouping;
- `store_categories` remains identity-scoped and organizes one profile's marketplace listings.

The service taxonomy uses stable text codes with localized labels. `parent_code` is a self-reference. V2 renders exactly two levels, while the persistence model allows future deeper trees.

Integrity is enforced in the database:

1. the selected root must be active and have `parent_code is null`;
2. an optional child must be active and belong to the selected root;
3. a child cannot exist without a root;
4. both values may be null for an incomplete draft;
5. `trg_services_validate_category_pair_v2` applies the rule to inserts and category updates.

Public clients have read-only access to active taxonomy rows. Mutation remains migration/admin controlled.

### Service category client boundary — 2026-08-03

The global service taxonomy is consumed through a dedicated entity and feature boundary.

`service-category/model/types.ts` owns:

1. stable category and selection shapes;
2. code validation;
3. deterministic ordering;
4. projection of the self-referencing taxonomy into the two-level V2 tree;
5. detection of deeper and orphaned rows.

`getServiceCategories.ts` owns the bounded read-only query of active global taxonomy rows.

`useServiceCategories.ts` owns loading, error, refresh and stale-request protection.

`ServiceCategorySelector` owns:

1. root and optional direct-child controls;
2. automatic child clearing when the root changes;
3. invalid-value recovery;
4. loading, error and empty states;
5. responsive one-column/two-column presentation.

The selector emits stable database codes. It performs no mutation and is designed to be reused by service create and edit forms.

### Service draft creation boundary — 2026-08-04

Service creation now follows the established entity → feature → UI boundary.

`service/model/types.ts` owns the writable input shape and field limits.

`saveMyService.ts` owns:

1. normalization and client-side integrity checks;
2. the `save_my_service_v2` RPC contract;
3. database error translation;
4. mapping the returned database row through the shared service mapper;
5. verification that a create operation returned a draft.

`useMyServices.ts` owns:

1. active-identity presence checks;
2. single-flight write protection;
3. returned identity verification;
4. local upsert and deterministic sorting;
5. the public mutation busy state.

`ServiceDraftCreateForm.tsx` owns create-only form state and validation. The form deliberately excludes images, coordinates, editing, lifecycle transitions and deletion.

The management list resolves stored category codes through the global taxonomy read boundary rather than displaying machine codes.

### Product-showcase management preview geometry — 2026-08-04

The owner management card treats image geometry and textual content independently.

A long `product_showcases.description` may contain up to the database limit, but it must not control the image-column height. Desktop cards therefore use a fixed 140 px media frame with top alignment, while the management description is a four-line preview.

The canonical full description remains unchanged and is exposed by the edit workflow. This is a presentation-only boundary; no product-showcase data or public-profile behavior changed.

### Service draft editing boundary — 2026-08-04

Service editing reuses the existing `save_my_service_v2` command boundary instead of adding a second write path.

The feature layer must prove all of the following before an existing service ID is sent:

1. an active identity exists;
2. the ID belongs to a service already loaded for that active identity;
3. the service is in `draft` status;
4. no other service write is in progress.

After the RPC returns, the client verifies identity ownership and that the status remains `draft`, then performs a deterministic local upsert.

The current form does not own service image or coordinate fields. The API therefore reads and preserves those values during an edit so a partial form cannot silently erase data owned by later modules.

Published and archived editing is intentionally unavailable. Status lifecycle remains a separate command and UI patch.

### Service lifecycle command boundary — 2026-08-05

Service lifecycle transitions use the existing security-definer `set_my_service_status_v2` RPC. Browser code does not update the `services` table directly.

The client feature applies a deliberately narrow transition matrix:

1. `draft` may transition only to `published`;
2. `published` may transition only to `archived`;
3. `archived` may transition only to `draft`.

Before the RPC call, the feature verifies that the service is present in the active identity's loaded collection and that no create, edit or lifecycle write is already in progress. After the RPC returns, identity ownership, service ID and resulting status are verified before the local collection is updated.

The database remains authoritative for ownership, accepted statuses and `published_at`. The UI transition matrix prevents confusing arbitrary jumps but does not replace server authorization.

Public reading, image management, deletion and service discovery are separate architectural boundaries.

### Service image persistence boundary — 2026-08-05

`public.service_images` is the canonical gallery table for services. `services.image_url` remains the denormalized primary-image cache used by compact cards and future discovery reads.

The image foundation follows these boundaries:

1. image rows are identity-owned and reference both the service and uploader;
2. a trigger rejects cross-identity parent/image combinations;
3. one partial unique index permits only one primary image per service;
4. public table reads require a published parent service;
5. owner reads use identity membership;
6. direct table writes are unavailable to anon and authenticated clients;
7. Storage writes require the authenticated user's path, active identity ownership and a draft parent service;
8. bucket validation limits uploads to JPEG, PNG or WEBP and 10 MB.

The bucket is public for efficient image delivery, while object mutation remains authorization-controlled. The next command boundary must register uploaded objects through SECURITY DEFINER RPCs, synchronize `services.image_url`, enforce the ten-image limit and select deterministic fallback primaries after deletion.

A service is allowed to exist and be published without an image.

### Service image command boundary — 2026-08-05

All ordinary service-image table writes are mediated by three SECURITY DEFINER RPCs. Each command locks the parent `services` row before counting or reordering images, which serializes concurrent writes for the same service and protects the ten-image limit.

The command boundary proves:

1. authenticated caller;
2. active identity;
3. identity membership;
4. parent-service ownership;
5. draft-only mutation;
6. user/service Storage path scope;
7. deterministic primary-image and ordering invariants;
8. synchronized `services.image_url` cache.

`delete_my_service_image_v2` deliberately returns the deleted `storage_path` and URL manifest rather than deleting the Storage object inside PostgreSQL. The browser data layer must remove the object after the database command succeeds. If registration fails after an upload, the browser data layer must compensate by removing the newly uploaded object.

The service-image gallery is optional, so deletion of the final image is allowed and clears the denormalized primary-image cache.

### Service-image browser/server data boundary — 2026-08-05

Service-image mutation uses two deliberately asymmetric multi-step flows.

Upload flow:

1. validate the browser file;
2. upload it to `service-images`;
3. derive its public URL;
4. register it through `add_my_service_image_v2`;
5. compensate by deleting the Storage object only when registration has not committed.

The `databaseRegistered` boundary prevents a post-commit mapper or response-validation error from deleting an object that is already referenced by `service_images` and possibly by `services.image_url`.

Delete flow:

1. browser sends only service ID and image ID with its access token;
2. the Node route validates the token;
3. a user-scoped Supabase client calls `delete_my_service_image_v2`;
4. the RPC returns the trusted Storage path after ownership and draft-state checks;
5. the route validates the returned path shape;
6. a service-role client removes only that Storage object.

Database deletion is authoritative. Storage cleanup failure is returned as `storageCleanupFailed`, producing an orphaned object rather than a broken database reference. A later cleanup job can safely remove such orphans.

### Service-image management UI boundary — 2026-08-05

`ServiceImageManager` is a draft-only presentation/controller layer. It imports the service-image entity API and model, but it does not import a Supabase client or access database tables directly.

The parent `useMyServices` hook exposes a narrow local-cache mutation, `updateServiceImageUrl(serviceId, imageUrl)`. This keeps the service card synchronized after image operations without issuing an unrelated full reload.

Busy-state coordination is identity-section scoped: while an image mutation is active, other service writes are disabled. This prevents status publication from racing with an unfinished image upload or deletion.

Responsive management cards use a mobile-first two-column layout:

- fixed compact media column;
- `minmax(0,1fr)` content column;
- clamped long text;
- adaptive button grids;
- breakpoint restoration for tablet and desktop.

The responsive change is presentation-only and does not alter service or product-showcase persistence contracts.

### Mobile file-picker boundary — 2026-08-05

System gallery selection and Storage upload are separate lifecycle phases. The source `<input type="file">` must retain its selected files until browser-side preparation has completed.

The compatible sequence is:

1. clear the old input value immediately before opening the picker;
2. receive and copy the new `FileList`;
3. prepare and validate each copied file;
4. upload/register the prepared file;
5. clear the input after the operation finishes.

This avoids invalidating Android content-backed file handles too early while still allowing the same photo to be selected again. MIME inference and optional HEIC/HEIF conversion belong in the entity API, not in the React presentation component.

### Public profile services — 2026-08-08

Published services are read directly through the browser Supabase client under existing RLS. No public service RPC is required at this stage.

The public boundary uses two reads:

1. `services`, filtered by `identity_id` and `status = published`;
2. `service_images`, restricted to the returned service IDs and the same identity.

The mapper repeats identity, status, UUID, date, URL and price normalization rather than treating RLS as the only validation layer. The public TypeScript model intentionally omits exact coordinates, uploader identity and Storage paths.

Public profile expansion is exclusive across product showcases, services and listings. The service section remains independent from the global `/v2/services` discovery architecture.

Gallery interaction is intentionally deferred to a separate component-level checkpoint. This keeps the read-only data boundary stable before adding lightbox, swipe and image navigation state.

### Public service gallery component boundary — 2026-08-08

The public service presentation is split across
focused component boundaries.

`PublicProfileServicesSection` owns:

1. public service data loading;
2. category-label resolution;
3. compact versus expanded section layout;
4. service-card collection rendering;
5. title, location, description and price content;
6. parent-controlled section expansion.

`PublicProfileServiceGallery` owns:

1. service-image selection state;
2. primary image and thumbnail rendering;
3. legacy `services.image_url` fallback resolution;
4. previous and next image navigation;
5. full-screen lightbox lifecycle;
6. keyboard and modal-close behavior;
7. body scroll locking;
8. control auto-hide timing;
9. expanded-card and lightbox touch swipe;
10. suppression of the synthetic click after swipe.

The boundary is presentation-only. It does not change
public data minimization, service-image query
contracts, database state, RLS, Storage object paths
or navigation state.

The card media dimensions remain intentionally
unchanged in this checkpoint: compact `h-36` and
expanded `h-48 sm:h-52`. Cross-section image-geometry
alignment remains a separate later layout patch.

### My Area owner content detail and return-state boundary — 2026-08-12

The first owner-content detail route is
`/v2/showcase/[id]`.

Responsibilities are separated as follows.

`ProductShowcaseManagementCard` owns:

1. owner collection rendering;
2. separate image, title and description links;
3. management controls outside navigation links;
4. capturing the return anchor before navigation;
5. initiating My Area return restoration after data
   loading.

`ProductShowcaseDetailPage` owns:

1. authenticated and active-identity loading;
2. owner-scoped draft, published and archived access;
3. full detail presentation;
4. reuse of the shared public gallery;
5. browser-history return;
6. explicit `/v2/my-area` fallback return intent.

`myAreaContentReturnContext` owns:

1. tab-local return-state serialization;
2. source-route validation;
3. content-type and content-ID validation;
4. history-entry token marking;
5. fallback-return intent;
6. stale-context expiry and cleanup.

`useMyAreaContentReturnRestoration` owns:

1. waiting for owner content to be ready;
2. locating the exact card with data attributes;
3. restoring the card's previous viewport position;
4. compensating for late dynamic layout changes;
5. temporary manual browser scroll restoration;
6. final cleanup.

The return-state mechanism is navigation UX state,
not analytics. It remains browser-tab local and is
not sent to Selqiro's database.

`MyAreaContentType` includes both `showcase` and
`service`; the service detail route should reuse this
boundary instead of introducing another return-state
implementation.

No production database contract changed in this
checkpoint.

### My Area service owner-detail parity — 2026-08-13

The owner service detail route is
`/v2/service/[id]`.

Responsibilities are separated as follows.

`MyServicesSection` owns:

1. rendering the active identity's service collection;
2. separate image, title/meta and description links;
3. management controls outside navigation links;
4. capturing the service return anchor;
5. restoring the exact service card after data load;
6. reopening the full service list when the return
   target is beyond the preview limit.

`ServiceDetailPage` owns:

1. authenticated and active-identity loading;
2. owner-scoped draft, published and archived access;
3. full service detail presentation;
4. reuse of `PublicProfileServiceGallery`;
5. browser-history return;
6. explicit `/v2/my-area` fallback return intent.

`getMyServiceDetail` owns:

1. validating service and identity IDs;
2. selecting one service restricted by both IDs;
3. loading its service-image collection;
4. validating image ownership boundaries;
5. mapping owner images into the gallery contract.

The route is included in the identity-scoped reload
boundary and in the mobile-navigation hidden-route
boundary.

This checkpoint reuses the existing browser-tab
return-state architecture and does not change any
database contract.

### Public-profile content card geometry — 2026-08-13

Public-profile product showcases, services and
listings now share one presentation geometry
contract while retaining separate data and behavior
components.

Shared geometry:

1. compact card width: 250 px;
2. compact image height: `h-36`;
3. expanded image height: `h-52 sm:h-56`;
4. expanded grid: two columns from `sm`;
5. content-section shell: 30 px radius with
   `p-5 sm:p-6`.

The product-showcase implementation is the current
visual reference. Service and listing components
were aligned to it through class-level changes only.

Behavior boundaries remain independent:

- service gallery owns service swipe, thumbnail and
  lightbox behavior;
- listing section owns category filtering,
  navigation and profile-return restoration;
- listing detail owns its large gallery and
  thumbnail strip.

The geometry change does not alter queries, models,
routing contracts, database schema, authorization or
storage behavior.

### Semantic content-type presentation tokens — 2026-08-13

The V2 public profile establishes a semantic visual
identity for the three current content types:

1. product showcases — indigo;
2. services — teal;
3. active marketplace listings — amber.

Each public-profile section uses four coordinated
presentation layers:

- a light tinted section background;
- a matching section border;
- a persistent 6 px top accent;
- a matching eyebrow pill and action-button accent.

Inner content cards remain white and continue using
the shared card geometry contract. The semantic
identity is intentionally applied at section level,
not inside gallery gesture wrappers or data-aware
components.

Accessibility contract:

- color is supplementary;
- the explicit content-type label remains visible;
- main headings remain high-contrast black;
- functional error and status colors remain
  independent of the decorative section palette.

The current expansion coordination in
`PublicProfilePage` is preserved. No accordion or
new close/open state model was added.

Future market, services and work discovery surfaces
should reuse these semantic content-type tokens where
appropriate, following a separate source audit.

### Discovery semantic color boundary — 2026-08-14

V2 discovery surfaces extend the public-profile
semantic content-type contract:

1. marketplace products and active listings — amber;
2. services and related service assistance — teal;
3. product showcases and portfolio examples — indigo.

The palette is applied only to presentation layers:

- result-section shell;
- top accent;
- explicit content-type pill;
- active filter or sorting state;
- matching section action;
- accessible focus accent.

Data-aware components, RPC calls, result limits,
location behavior and navigation contracts remain
independent of these decorative tokens.

`/v2/products` remains a hybrid composition:

- local design arrays currently render featured
  products and related services;
- `ProductResultsSection` renders live marketplace
  listing data;
- live results use the existing bounded listing API
  and RPC pagination inputs.

This design checkpoint deliberately does not connect
the remaining design arrays to live data and does not
add listing creation or AI behavior. Those are
separate functional milestones.

### Completed V2 presentation color contract — 2026-08-14

The semantic content-type presentation contract is
now applied across the current V2 public-profile and
discovery designs:

1. product showcases and portfolio examples — indigo;
2. services and service assistance — teal;
3. marketplace listings and products for sale — amber.

The service discovery page applies teal to:

- explicit type labels;
- section shells and 6 px top accents;
- active nearby control;
- input focus;
- matching section actions;
- the service detail modal boundary.

White cards and black primary actions remain neutral
content and action layers.

Current service discovery remains presentation-only
data composition. The local service arrays and modal
state are not a production discovery data layer.
Connecting public service records, search, filters,
distance ordering and pagination is a separate
functional architecture milestone.

This checkpoint changes no database, route, RPC,
storage, identity or query contract.

### V2 discovery navigation contract — 2026-08-15

The V2 shell now treats product, service and future
job browsing as one discovery destination on mobile.

Mobile contract:

1. the bottom navigation remains a five-column grid;
2. the discovery item is named `Leia`;
3. its default route is `/v2/products`;
4. active route families include:
   - `/v2/products`;
   - `/v2/services`;
   - future `/v2/jobs`;
5. deeper listing, showcase and service detail
   routes remain outside the bottom-navigation shell.

Page-level contract:

- products and services render the shared
  `src/features/v2-shell/components/
  V2DiscoveryTypeSwitcher.tsx`;
- products use amber active styling;
- services use teal active styling;
- jobs have no live route and are rendered as an
  accessible disabled `Tulekul` state;
- the selector is directly visible and does not use
  a popup, drawer or bottom sheet.

The shared selector is presentation and navigation
only. It does not own search state, filters, results,
pagination, service records or listing records.

This checkpoint changes no database, RPC, storage,
identity, search-index or API contract.

### V2 listing-create client foundation — 2026-08-15

The V2 marketplace listing-create feature now has a
dedicated route and feature boundary:

- `app/v2/sell/page.tsx`;
- `components/v2/sell/V2SellPage.tsx`;
- `src/features/listing-create`.

The first client-only checkpoint owns:

- source-image selection and validation;
- a 10-image local limit;
- local object-URL previews;
- local ordering and removal;
- future-primary-image ordering;
- optional title and description context;
- field provenance for AI-safe merging.

Field provenance contract:

1. `empty` can receive an AI value;
2. `ai` can be refreshed by a later AI analysis;
3. `user` cannot be silently overwritten;
4. AI never publishes automatically.

The first checkpoint intentionally creates no
database row and no Storage object. This avoids
orphaned uploads and premature public data while the
secure active-identity draft contract is still
separate work.

The production `/sell` route remains the mobile
default. The V2 shell already recognizes `/v2/sell`
as the sell branch, but cutover must happen only after
AI, draft persistence, images and publication are
complete and tested.

This checkpoint changes no database, RPC, RLS,
Storage or existing legacy publication contract.

### Energy, advertising and featured visibility contract — 2026-08-17

#### Marketplace access

Marketplace participation is not tier-gated.

Normal listing publication, organic discovery,
service publication, profile visibility and messaging
must not depend on Premium or Business access.

Paid differentiation is based on:

- Energy balance;
- optional AI operations;
- optional promoted visibility;
- future business and operational tools.

Future package names such as Starter, Professional,
Business and Enterprise are Energy or tooling bundles,
not privileged marketplace-ranking classes.

#### Energy boundary

Before V2 AI-assisted listing analysis is shipped,
the legacy Premium-based daily-limit branch must be
replaced by an Energy transaction boundary.

The future transaction pattern is:

1. validate wallet and balance;
2. reserve Energy;
3. run the optional operation;
4. commit the debit on success;
5. release or refund the reservation on a technical
   failure;
6. retain separate technical abuse and rate limits.

Paid and bonus Energy require separate accounting
semantics.

#### Campaign model

V1 should use one small campaign model with placement
types:

- `top_ad`;
- `featured`.

Both placements initially use:

- one existing published Selqiro object;
- one market scope;
- one fixed duration;
- one fixed Energy price;
- simple lifecycle states such as pending, active,
  paused, rejected and ended;
- the same basic admin moderation queue.

Do not introduce an auction, CPC, CPM, freely chosen
radius, auto-optimization, multiple creative
variants or a separate ad wallet in V1.

#### Top-ad placement

The top ad is a compact, neutral, horizontal strip in
the normal page flow.

It must:

- be clearly labelled `Reklaam`;
- use the existing listing, service or showcase
  primary image as a small square or 4 : 3 thumbnail;
- use avatar or logo for a profile campaign;
- use a fallback icon if no image exists;
- show advertiser, market context, content-type chip,
  title and relevant meta;
- expose one CTA;
- never be sticky, animated, blinking, autoplaying,
  overlaid or dismiss-required.

V1 does not require a separate wide banner upload.
Optional crop or focal-point controls may come later.

A campaign can change only on a new eligible page
view, return navigation, refresh or explicit market
context change. It cannot rotate on a timer, while
scrolling or on every filter interaction.

A simple session-level shuffled queue / round-robin
should:

- show eligible campaigns before repeats where
  possible;
- avoid an immediate repeat when alternatives exist;
- require no cross-site behavioural tracking.

Start with one top-ad slot. Do not add a second
standalone mid-page ad in V1.

#### Featured placement

A featured listing or service must remain eligible for
the normal organic result set.

It may also appear:

- in a dedicated featured section;
- later, at low frequency, in one paid insertion slot
  after the first organic result block.

Payment supplements visibility but never bypasses:

- content type;
- publication status;
- category;
- market / location;
- search relevance;
- safety and quality rules.

The visible badge is:

`Esiletõstetud · tasuline nähtavus`.

Within one result list, the promoted object is
rendered once:

- either at its natural organic position with the
  badge;
- or in a paid insertion slot while suppressing its
  duplicate organic copy on that page.

If the same object is selected for both `top_ad` and a
featured placement on one page, choose another
eligible campaign for one placement where possible.

Product showcases remain portfolio/profile objects,
not marketplace sale listings. They may be used in a
top ad or a suitable showcase/profile placement but
must not be mixed into ordinary sale-listing results.

#### Initial frequency

Start conservatively:

- one top ad;
- dedicated featured sections;
- at most one featured insertion after the first
  block of organic results;
- never two paid insertions consecutively;
- expand only from real usage evidence.

This contract is architectural only. No campaign,
Energy-ledger or advertising schema is created by this
documentation checkpoint.

### Energy wallet and append-only ledger foundation — 2026-08-17

#### Ownership

Energy is identity-scoped.

`energy_wallets.identity_id` is unique, producing one
wallet per Selqiro identity.

This supports:

- one private-identity wallet;
- shared business-identity wallets for authorized
  members;
- active-identity switching without mixing balances.

Welcome Energy remains a user-level entitlement and
must later be granted only once to the user's original
private identity wallet.

#### Balance model

The wallet stores four non-negative integer balances:

- `available_paid`;
- `available_bonus`;
- `reserved_paid`;
- `reserved_bonus`.

Purchased and promotional value are not merged.
Reserved value is not available for another
operation.

The wallet row is a current-balance projection.
Financial history is the append-only ledger.

#### Ledger model

`energy_ledger_entries` records deltas for all four
balance buckets.

Initial event types:

- `paid_grant`;
- `bonus_grant`;
- `reserve`;
- `commit`;
- `release`;
- `adjustment`.

The ledger is append-only:

- update is rejected;
- delete is rejected;
- corrections require a new adjustment event.

`operation_key` is the idempotency key.

The schema prevents:

- duplicate event types for the same wallet and
  operation;
- more than one final event (`commit` or `release`)
  for the same wallet and operation.

`public_metadata` is owner-visible.
`internal_metadata` is server-only and is excluded
from owner-history RPC output.

#### Access boundary

The schema reuses:

- `require_my_active_identity_v2()`;
- `current_user_has_identity_access()`.

Authenticated users can read only through active-
identity owner RPCs:

- `get_my_energy_wallet_v2`;
- `get_my_energy_ledger_v2`.

The internal idempotent helper
`ensure_my_energy_wallet_v2` is executable only by
service role and by trusted SECURITY DEFINER calls.

Direct authenticated table writes are not granted.

#### Current implementation boundary

The schema does not yet implement a financial
mutation operation that changes wallet balances.

The next mutation layer must atomically:

1. lock the wallet row;
2. validate the operation key;
3. update the balance projection;
4. append the matching ledger event;
5. return the authoritative wallet summary.

Welcome grant, reserve, commit and release must be
separate audited checkpoints.

The current migration was validated with a complete
local Supabase reset and SQL contract tests.

Committing this migration does not itself deploy it to
the production Supabase database.

### Admin test Energy seed — 2026-08-17

The admin test seed is an operational development
grant, not a marketplace package or purchase.

#### Entitlement

The entitlement is user-scoped:

`admin-test-energy:v1:<admin-user-id>`.

This prevents a second grant when an administrator
switches from a private identity to a business
identity or creates additional identities.

#### Destination wallet

The first successful application grants 5000
`available_bonus` Energy to the wallet of the
administrator's current active identity.

The function revalidates:

- active `admin_users` status;
- active identity status;
- private identity ownership; or
- active business membership.

The resulting wallet remains identity-scoped even
though the entitlement is user-scoped.

#### Financial event

The operation atomically:

1. verifies the user-level entitlement;
2. ensures the identity wallet exists;
3. locks the wallet row;
4. checks idempotency again;
5. increases `available_bonus`;
6. appends one `bonus_grant` ledger event.

Purchased Energy is never changed.

#### Security boundary

`grant_active_admin_test_energy_v2()` is:

- SECURITY DEFINER;
- revoked from public, anon and authenticated;
- executable by service role only.

The migration invokes the function once so active
administrators already present in the target
environment receive the seed after migration.

Future administrators can be seeded by an explicit
trusted service-role operation. The client must never
call this function directly.

#### Scope boundary

This seed is not:

- general welcome Energy;
- a recurring allowance;
- a subscription benefit;
- a price signal;
- a payment;
- an AI usage limit.

The current UI still contains placeholder Energy data.
Production schema deployment and real UI reads remain
separate checkpoints.

## V2 Energy read architecture — 2026-08-18

### Active-identity data flow

```text
authenticated user
→ active identity
→ get_my_energy_wallet_v2
→ identity-owned Energy wallet
```

Täielik `/v2/energy` vaade loeb lisaks:

```text
get_my_energy_ledger_v2(limit=50, offset=0)
→ owner-visible append-only ledger entries
```

Minu ala kasutab eraldi `useEnergySummary` hook'i, mis loeb ainult aktiivse identiteedi ja walleti. See väldib ledger'i laadimist ülevaatekaardi jaoks.

### Client boundaries

- `src/entities/energy/model/types.ts` kirjeldab walleti, ledger'i ja sündmuste tüübid.
- `src/entities/energy/api/getMyEnergyWallet.ts` valideerib RPC vastused ning koondsaldode vastavuse saldoämbritele.
- `src/features/energy-wallet/model/useEnergyWallet.ts` ühendab aktiivse identiteedi, walleti ja ledger'i.
- `src/features/energy-wallet/model/useEnergySummary.ts` teenindab Minu ala kerget saldokokkuvõtet.
- `src/features/energy-wallet/components/EnergyWalletPage.tsx` kuvab päris saldo, ajaloo, laadimise, vea ja tühja ajaloo olekud.

### Security and mutation boundary

See checkpoint on read-only kasutajaliidese ühendus. Klient ei muuda walleti ridu ega ledger'it otse. Tulevased grant/reserve/commit/release/adjustment toimingud peavad jääma serveripoolsete idempotentsete RPC-de taha.

### Navigation reliability

Minu ala sisemised profiili-, Energy- ja adminilingid kasutavad Next `Link` komponenti. See hoiab navigatsiooni App Routeri ajaloos ja väldib brauseri Back korral aegunud täisdokumendi laadimisoleku taastamist.

## Energy mutation architecture — 2026-08-18

### Server-only mutation boundary

```text
authenticated browser
→ Selqiro server route verifies bearer token
→ service_role RPC with verified user_id
→ Energy wallet transaction
```

Brauseri `authenticated` rollil puudub execute õigus funktsioonidele:

- `reserve_user_energy_v2`
- `commit_user_energy_v2`
- `release_user_energy_v2`

### Reservation state machine

```text
none
  → reserve
      → commit
      or
      → release
```

Ühel operation key'l on globaalselt kuni üks reserve-sündmus ja kuni üks lõppsündmus. Osalised unikaalsed indeksid välistavad paralleelse topeltreserveerimise ning commit/release topelttulemuse.

### Atomic reserve

Reserve:

1. valideerib user ID, operation key, feature'i, summa ja metadata;
2. võtab operation key advisory transaction lock'i;
3. lahendab ja kontrollib kasutaja aktiivse identiteedi;
4. loob vajadusel identity walleti;
5. lukustab walleti `FOR UPDATE`;
6. arvutab jaotuse boonus enne ostetud Energy't;
7. liigutab Energy available bucketitest reserved bucketitesse;
8. lisab samas tehingus append-only reserve ledger event'i.

### Atomic finalization

Commit ja release leiavad algse reserveeringu operation key kaudu, mitte kasutaja hetkel aktiivse identiteedi kaudu.

- Commit vähendab reserveeritud paid/bonus bucketeid ning ei tagasta available saldot.
- Release vähendab reserveeritud bucketeid ja taastab täpselt algse paid/bonus jaotuse.
- Vastandlik või korduv lõpptulemus on vastavalt blokeeritud või idempotentselt tagastatud.

### Verified local contract

Kohalik SQL test kontrollis:

- bonus-first reserveerimist;
- operation key idempotentsust ja payload konflikti;
- ebapiisava saldo täielikku rollback'i;
- võõra kasutaja ligipääsu blokeerimist;
- aktiivse identiteedi vahetamist reserve ja finalization vahel;
- commit/release korduskatseid;
- vastandlike lõpptulemuste blokeerimist;
- walleti saldo võrdumist ledger'i delta projektsiooniga.

## Energy reservation production status — 2026-08-19

### Rollout evidence

```text
Supabase project: vyjletlmwoiwxsnsunlm
Migration: 20260818130000_add_energy_reservation_operations.sql
Remote history: 20260818130000 -> 20260818130000
Post-push dry-run: no pending migrations
```

Productionis on nüüd andmebaasikiht:

- `reserve_user_energy_v2`
- `commit_user_energy_v2`
- `release_user_energy_v2`

RPC-d on ainult `service_role` jaoks. `authenticated` brauseriklient ei saa neid otse käivitada.

### Next server TypeScript layer

Järgmine serverikiht peab:

1. valideerima request'i Bearer-tokeni `auth.getUser(token)` kaudu;
2. võtma kasutaja ID ainult valideeritud auth-vastusest;
3. valima feature'i ja Energy hinna kesksest serverikonfiguratsioonist;
4. looma serveripoolse, korduskatsetel stabiilse operation key;
5. kutsuma service-role kliendiga reserve/commit/release RPC-sid;
6. kaardistama andmebaasi vead tüübitud serverivigadeks;
7. hoidma `internal_metadata` serverisisesena;
8. mitte avaldama service-role võtit ega sisemist metadata't brauserile.

Esimene wrapperi checkpoint peab jääma kasutajaliidesest ja OpenAI kutsest eraldi. Selle eesmärk on kontrollida tüüpe, auth-piiri ja RPC vastuste kaardistamist enne AI arvelduse ühendamist.

## Server-only Energy mutation wrapper — 2026-08-20

### Failid

```text
src/server/energy/adminClient.ts
src/server/energy/auth.ts
src/server/energy/featureContract.ts
src/server/energy/model.ts
src/server/energy/mutations.ts
src/server/energy/README.md
```

### Usalduspiir

```text
browser
  → Bearer-token + feature'i tegevussisend

server route
  → auth.getUser(token)
  → VerifiedEnergyActor
  → serveri feature/price contract
  → service-role reserve / commit / release RPC
```

Brauser ei määra autoriteetselt:

- kasutaja ID-d;
- aktiivse identiteedi ID-d;
- wallet ID-d;
- Energy hinda;
- paid/bonus jaotust;
- service-role võtit;
- sisemist ledger metadata't.

### Esimene feature contract

```text
feature: listing_ai_analysis
ledger feature: listing_ai_analysis
price env: SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS
```

Keskkonnamuutuja peab olema positiivne safe integer. Kuni see puudub, katkestab wrapper tegevuse server configuration veaga. See on tahtlik, sest kommertshinda ei tohi juhuslikult koodi sisse peita.

### Veapiir

Avalikud vastused kasutavad ohutuid koode ja sõnumeid. PostgREST/SQL detailid jäävad ainult `internalMessage` väljale serverilogimiseks. Tulemuse mapper kontrollib ka paid/bonus summat ja wallet'i koondsaldode kooskõla.

### Ühendamata osa

Wrapper ei ole veel ühendatud `/api/ai/analyze-listing` route'i, OpenAI päringu ega V2 müügivormiga. Järgmine checkpoint peab muutma ainult AI route'i serverivoo ja jätma kasutajaliidese eraldi sammu.

## V2 listing-create text-first UI boundary — 2026-08-20

### Render order

```text
1. title + description
2. image selection and ordering
3. AI analysis preview
```

### Initial AI input contract

```text
title: optional user context
description: optional user context
image: only the current first / primary image
price shown in UI: 25 Energy
```

This checkpoint changes only the listing-create UI and its feature documentation. It does not call `/api/ai/analyze-listing`, does not read the server price environment variable and does not reserve or commit Energy.

The current form provenance rules remain in force: user-owned text is not silently overwritten; future AI output may fill empty or AI-owned fields. The next route checkpoint must preserve this boundary while connecting `reserve → OpenAI → commit | release`.

## V2 listing AI Energy route — 2026-08-20

### Versioned boundary

```text
browser
  → X-Selqiro-AI-Contract: v2-energy-1
  → Bearer token
  → contractVersion + UUID v4 + optional text + one primary image

server route
  → verifyEnergyActorFromRequest
  → normalize and hash request
  → reserveEnergy(listing_ai_analysis)
  → OpenAI Responses API
  → normalize category and allowed fields
  → commitEnergy | releaseEnergy
```

The server owns the Energy feature key, Energy amount, operation-key prefix, category tree, model contract and internal ledger metadata. The browser cannot provide user ID, identity ID, wallet ID, bucket allocation or price.

### Idempotency

```text
new operation
→ reserve + provider call + commit

same committed operation
→ return stored result snapshot

same active operation
→ 409 ai_analysis_in_progress

stale reserved operation
→ release and require a new operation UUID

same UUID with different request hash
→ 409 ai_operation_conflict
```

### Cost instrumentation

The route records provider usage only in append-only internal ledger metadata:

```text
response ID
returned model
input tokens
cached input tokens
cache-write tokens when available
output tokens
total tokens
duration
estimated provider cost
pricing version
```

The estimate uses a versioned calibration constant and must be recalculated if the configured model or provider price changes. It is not exposed in the normal browser response.

### Rollout boundary

The legacy caller without the V2 contract header continues to use the old Premium/daily-limit branch. The V2 form is still disconnected, so this checkpoint deploys server capability without automatically charging users. Before enabling the V2 button in production, configure `SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS=25` in the deployment environment.

<!-- SELQIRO_LAUNCH_CATEGORIES_AND_EE_HORSE_POLICY_20260822 -->
## Launch-kategooriad ja tulevane hobusepakkumiste domeen

### Kategooriapuu checkpoint

- 15 põhirubriiki
- 187 kategooriasõlme
- 164 lõpurubriiki
- 163 tavalisel lõpurubriigil on detailväljade skeem
- `general` on teadlik globaalne fallback
- kategooriaväärtused on unikaalsed ja kõigil sõlmedel on eestikeelne silt

### Hobusepakkumiste arhitektuuriline piir

Hobusepakkumine peab olema eraldi domeen või selgelt eristatav sisuvariant, mitte tavalise `listings` rea juhuslik JSON-erand. Esimene turupoliitika:

```text
policy_version = ee-horse-v1
market_country_code = EE
horse_location_country_code = EE
cross_border_flow = false
payment_flow = false
auction_flow = false
```

Lubamine põhineb hobuse tegelikul asukohariigil ja kuulutuse tururiigil. Seda ei seota kasutaja IP, GPS-i, kodakondsuse ega hetke asukohaga. Tulevane riigipõhine konfiguratsioon peab võimaldama riike ükshaaval aktiveerida.

Esialgsed pakkumise liigid:

```text
sale
free_transfer
lease
co_rider
wanted
```

Avaldamisel nõutakse kasutaja kinnitusi omandi või volituse, hobuse nõuetekohase identifitseerimise, andmete õigsuse, registri- ja üleandmiskohustuste ning vähemalt 18-aastaseks olemise või seadusliku esindaja nõusoleku kohta. Selqiro ei märgi dokumente „kontrollituks”, kui neid pole päriselt üle vaadatud.

Eluslooma tapmise eesmärgiga sisu on liigist ja riigist sõltumata keelatud. Reegel peab kehtima kuulutustele, ostusoovidele, teenustele, reklaamidele, profiilitekstidele ja muule avalikule sisule. Veterinaarne eutanaasia, päästmine/ümberpaigutamine ja tavapärane loomavedu ei kuulu keelu alla, kui eesmärk ei ole tapmine.

See checkpoint dokumenteerib arhitektuuriotsuse; hobusepakkumiste tabelit, migratsiooni, RPC-sid, UI-d ega modereerimisvoogu pole veel loodud.

<!-- SELQIRO_PUBLICATION_POLICY_ACCEPTANCE_FOUNDATION_V1 -->
## Versioned publication-policy acceptance foundation

Migration: `20260822130000_add_publication_policy_acceptance_foundation.sql`

### Data model

`publication_policy_documents`
- immutable `policy_key + policy_version + country_code + locale` document versions;
- exact `content_hash`;
- active/effective lifecycle and content-type applicability;
- technical moderation/publication metadata;
- same-version content mutation is blocked.

`user_publication_policy_acceptances`
- append-only acceptance history owned by `user_id`;
- optional active-identity snapshot for audit context;
- exact document ID, version and content hash snapshot;
- idempotent uniqueness per user and exact policy document;
- no update or delete path for the authenticated client.

### Reusable RPC boundary

- `get_required_publication_policies_v1`
- `accept_publication_policy_v1`
- `get_my_publication_policy_acceptances_v1`
- `get_my_required_publication_policy_status_v1`
- `has_my_current_publication_policy_acceptance_v1`
- `require_my_current_publication_policy_acceptance_v1`

Publication mutations must call the reusable require/gate contract server-side. UI-only gating is insufficient.

### Active V1 policies

`marketplace-general-v1`
- general marketplace use and publication rules.

`ee-horse-v1`
- additional Estonia-only horse-offer rules;
- `market_country_code=EE`;
- horse-location country must be `EE` in the future horse-offer mutation;
- no default passport upload or ID-document check;
- seller remains responsible for statements, documents and transaction duties.

### Launch moderation contract

- `immediate_low_risk_publication=true`
- `universal_admin_prepublication_review=false`
- `risk_based_prepublication_review=true`
- `post_publication_review=true`
- `notice_and_action=true`
- `ai_moderation_mode=off`

This migration deliberately does not create `horse_offers`, `horse_offer_images`, payment, deposit, auction, registry or transport workflows. Production Supabase remains unchanged until a separate reviewed rollout.

<!-- SELQIRO_EE_HORSE_OFFER_DATABASE_FOUNDATION_20260830 -->
## Eesti hobusepakkumiste andmebaasivundament

Migratsioon: `20260830170000_add_ee_horse_offer_foundation.sql`

### Kasutajakogemuse piir

Hobusepakkumise tehniline domeen on eraldatud, kuid kasutajale ei looda eraldi lisamisvoogu. V2 kasutab jätkuvalt sama `/v2/sell` vormi. Kui valitud kategooria tähistab elushobuse pakkumist, lisab vorm hobusepõhised väljad ja enne avaldamist pakkumisepõhised kinnitused.

### Andmemudel

- `horse_offers` — identiteedipõhine Eesti hobusepakkumise põhikirje;
- `horse_offer_images` — järjestatud ja ühe põhipildiga pildileping;
- `horse_offer_publication_events` — muutmatu avaldamissnapshot täpse reeglinõustumise, kinnituste, sisu, SHA-256 räsi, riskisignaalide ja otsusega.

`publication_policy_documents` ja `user_publication_policy_acceptances` jäävad versioonitud portaali- ja hobusereeglite ainsaks tõeallikaks. Pakkumisepõhised faktilised kinnitused ei asenda reeglitega nõustumist ning salvestatakse iga avaldamiskatse kontekstis uuesti.

### Launchi moderatsioonipiir

Andmemudel toetab kahte tulemust:

- madala riskiga sisu: `published`;
- deterministliku riskisignaaliga sisu: `held_for_review`.

Kõigile hobusepakkumistele üldist admini eelkontrolli ei rakendata. AI-modereerimist see checkpoint ei lisa.

### Turvalisus ja teadlikult tegemata töö

- `anon` ja `authenticated` ei saa domeenitabelitesse otse kirjutada ega neid otse lugeda;
- RLS on sisse lülitatud ning tavakasutaja õigused eemaldatud;
- omanikupõhised draft/RPC lepingud, avalikud read-RPC-d, Storage bucket ja kasutajaliides tulevad eraldi etappidena;
- production-andmebaasi selles checkpoint'is ei muudetud.

Kohalik build, täielik Supabase reset ja tehinguline SQL-lepingutest läbisid.

<!-- SELQIRO_EE_HORSE_PRODUCTION_ROLLOUT_20260830 -->
## EE horse-offer production rollout checkpoint

Production rollout completed on 2026-08-30.

### Applied migration chain

The linked production database applied the dependency chain in timestamp order:

1. `20260822130000_add_publication_policy_acceptance_foundation.sql`
2. `20260830170000_add_ee_horse_offer_foundation.sql`

A public-schema dump was created before the push. After the push:

- local and remote migration histories matched;
- linked dry-run reported no pending migrations;
- the production schema dump confirmed the policy, acceptance, horse-offer, horse-image and append-only publication-event tables.

### Immutable production boundary

Both applied migration files are immutable history. Do not patch, rename or reuse their timestamps. Future corrections require a new migration and a new local/production verification cycle.

### Shared creation UX boundary

The separate `horse_offers` database domain does not create a separate user-facing add flow.

The V2 contract is:

`/v2/sell`
→ shared listing-create experience
→ live-horse selection activates horse mode
→ horse fields and offer-type-specific factual confirmations appear
→ the form calls the horse-offer contract instead of the generic listing contract

The user should experience the same calm listing-creation flow as for other listings. The visible difference is only the information and confirmations required for a controlled live-horse offer.

### Next implementation sequence

1. Audit the current `/v2/sell`, listing-create feature and category-selection modules without changing behavior.
2. Add a typed horse-mode/category boundary without a mutation.
3. Add horse-specific fields in the same form.
4. Add the publication-policy gate and per-offer confirmations, including 18+.
5. Connect draft persistence and publication in separate tested steps.
6. Add horse image handling only after the shared form and draft contract are stable.

<!-- SELQIRO_V2_LIVE_ANIMAL_CAPABILITY_20260830 -->
## Shared V2 live-animal capability boundary

The V2 listing-create experience uses one route and one shared form:

`/v2/sell`
→ typed content selection
→ optional controlled live-animal capability
→ species-specific fields
→ offer-type-specific confirmations
→ secure species/country publication contract

### Capability registry

`src/features/listing-create/model/liveAnimalOfferCapabilities.ts` is the
small UI-capability registry for controlled live-animal creation modes.

A capability is identified by:

- listing-create content type;
- animal species;
- market country;
- enabled state;
- user-facing labels and selected-state guidance.

The registry is not a substitute for database authorization or publication
policy enforcement. It only decides which reviewed creation mode may appear in
the client UI.

### Current launch boundary

Only the following capability is enabled:

- content type: `horse_offer`;
- species: `horse`;
- market country: `EE`.

Unsupported species and countries remain absent from the UI until all of these
exist:

1. reviewed country policy;
2. species-specific fields;
3. moderation and safety contract;
4. secure draft and publication contract;
5. required policy documents and confirmations;
6. browser and database tests.

### Domain rule

The production `horse_offers` domain stays horse-specific. Future dog, cat or
other-animal support may add separate controlled domains or another reviewed
domain pattern, but the shared `/v2/sell` experience must not be replaced or
copied.

### State preservation

Changing the local content type must not reset ordinary shared form state.
Manual browser testing confirmed that title and description remain intact while
switching between ordinary listing and horse offer.

### Current non-goals

This checkpoint does not add:

- horse offer-type selection;
- horse fields;
- policy acceptance UI;
- per-offer confirmations;
- horse draft persistence;
- horse image upload;
- publication mutation;
- dog, cat or another-country functionality.

The next isolated patch adds only the typed horse offer-type model and selector.

<!-- SELQIRO_V2_HORSE_OFFER_TYPE_SELECTOR_20260831 -->
## V2 horse-offer subtype boundary

The enabled `horse + EE` creation capability contains a typed subtype layer.

Canonical values:

- `sale`
- `free_transfer`
- `lease`
- `co_rider`
- `wanted`

The values match the production `horse_offers.offer_type` contract, but the
current selector is local UI state and does not call the database. No subtype
is selected automatically.

`wanted` does not describe an already selected concrete horse. It must not
inherit fields or confirmations asserting ownership, identification or passport
availability for a particular horse. The other four subtypes describe a
concrete horse. This distinction belongs in the typed model and future
confirmation builder, not in scattered component conditions.

State rules:

- ordinary-listing mode hides the subtype selector;
- returning to horse mode restores the selected subtype;
- switching modes does not clear shared title or description;
- no route change occurs.

This checkpoint adds no horse fields, policy acceptance, confirmations, draft
persistence, image upload, publication mutation or production database change.
The next patch should add a small typed horse-field model and one focused fields
component, with concrete-horse fields separate from `wanted` search criteria.

<!-- SELQIRO_V2_HORSE_BASIC_AI_TEXT_FLOW_20260831 -->
## V2 controlled horse creation flow: text, AI and basic fields

The shared `/v2/sell` form now distinguishes two classification contracts.

### Ordinary marketplace listing

- user may enter title and description;
- user adds images;
- optional AI primarily suggests a valid Selqiro category path;
- manual category selection must remain available;
- default examples are neutral and category-independent.

### Controlled horse offer

- user explicitly selects `horse_offer`;
- the enabled capability resolves species `horse` and market `EE`;
- user explicitly selects the horse offer type;
- no duplicate global marketplace category selector is shown;
- public discovery placement is derived later from controlled structured data;
- optional AI may check a visible content mismatch and suggest only missing
  text or visible horse data;
- AI cannot accept rules, attest age, ownership, identification, passport
  availability, information accuracy or the slaughter-purpose prohibition.

### Shared form order

1. content type;
2. horse offer type when horse mode is active;
3. title and description;
4. images, with the first image as future AI input;
5. optional AI analysis;
6. horse-specific fields;
7. later: price, location, policy acceptance, factual confirmations and
   publication.

This order keeps the V2 text-first contract while preserving one calm form.

### Horse text guidance

Text guidance is isolated in
`src/features/listing-create/model/listingCreateTextGuidance.ts`.

It owns:

- neutral ordinary-listing wording;
- horse-mode hero and section guidance;
- offer-type-specific title and description placeholders;
- `wanted` wording that does not imply an already owned concrete horse.

Guidance changes presentation only. It must never reset user-authored fields.

### Horse basic fields

`HorseOfferBasicFieldState` owns the first local horse field state.

Concrete horse types (`sale`, `free_transfer`, `lease`, `co_rider`) show:

- horse name;
- birth year;
- sex;
- breed;
- color;
- height in centimetres.

`wanted` shows only preferred sex and preferred breed.

Hidden local values may survive temporary UI switching, but the future
persistence mapper must send only fields relevant to the active offer type.

### Current non-goals

This checkpoint adds no:

- database write;
- draft save;
- Storage upload;
- Energy charge;
- policy acceptance;
- factual confirmation;
- publication mutation;
- production database change.

The next isolated UI patch adds discipline, training level and suitability
without mixing location, price, confirmations or persistence into it.

<!-- SELQIRO_V2_HORSE_USE_FIELDS_20260901 -->
## V2 horse use fields

Horse use information is isolated from horse basic identity fields.

### Module boundary

- model:
  `src/features/listing-create/model/horseOfferUseFields.ts`
- UI:
  `src/features/listing-create/components/HorseOfferUseFields.tsx`
- composition:
  `src/features/listing-create/components/ListingCreatePage.tsx`

The UI and model contain no Supabase, RPC, Storage, policy-acceptance or
publication mutation.

### State contract

`HorseOfferUseFieldState` contains two semantic branches:

1. `specific`
   - `discipline`
   - `trainingLevel`
   - `suitability`
2. `wanted`
   - `preferredDiscipline`
   - `preferredTrainingLevel`
   - `intendedUse`

A concrete horse disclosure is not interchangeable with a wanted-ad
preference. The UI may preserve hidden local values during temporary switching,
but persistence must map only the active offer-type branch.

### Concrete-horse UI

Used by:

- `sale`
- `free_transfer`
- `lease`
- `co_rider`

Fields:

- use or discipline;
- training level;
- suitability for a rider/user and purpose.

### Wanted UI

Used by `wanted`.

Fields are phrased as search preferences:

- preferred use or discipline;
- preferred training level;
- intended rider/use and suitability preferences.

The wording must not imply that a concrete horse has already been selected or
verified.

### Layout contract

- all field-card labels are `block` and `w-full`;
- two-column desktop grids use `items-start`;
- single-line inputs keep their natural compact height;
- full-width textareas stay inside one complete card;
- narrow mobile stacks every field into one column;
- no page-level horizontal scrolling is introduced.

### Safety boundary

This checkpoint adds local form state only. It does not add:

- draft persistence;
- database mapping;
- image mutation;
- Energy charging;
- publication-policy acceptance;
- seller factual confirmations;
- publication.

The existing production `horse_offers` contract already has eventual
`discipline`, `training_level` and `suitability` fields. Client integration must
still use a separately reviewed typed mapper and server/RPC boundary.

Next isolated UI module:

- health notes;
- behavior notes;
- clear seller-provided disclosure wording;
- no medical verification claims;
- no persistence or publication in the same patch.

<!-- SELQIRO_V2_HORSE_DISCLOSURE_FIELDS_20260901 -->
## V2 horse health and behavior disclosure fields

Health and behavior information is isolated from horse basic fields and use
fields.

### Module boundary

- model:
  `src/features/listing-create/model/horseOfferDisclosureFields.ts`
- UI:
  `src/features/listing-create/components/HorseOfferDisclosureFields.tsx`
- composition:
  `src/features/listing-create/components/ListingCreatePage.tsx`

The model and UI contain no Supabase, RPC, Storage, Energy, policy-acceptance
or publication mutation.

### State contract

`HorseOfferDisclosureFieldState` contains two semantic branches:

1. `specific`
   - `healthNotes`
   - `behaviorNotes`
2. `wanted`
   - `healthPreferences`
   - `behaviorPreferences`

A seller disclosure about a concrete horse is not interchangeable with a
wanted-ad preference. Temporary UI switching may preserve both local branches,
but a future persistence mapper must submit only the branch relevant to the
active offer type.

### Concrete-horse wording contract

Concrete-horse fields are explicitly publisher-provided:

- `Avaldaja teada olev terviseinfo`
- `Avaldaja tähelepanekud käitumise kohta`

Selqiro must not imply that it:

- verified the horse's health;
- verified behavior;
- confirmed a diagnosis;
- confirmed suitability;
- replaced an independent veterinary assessment.

### Wanted wording contract

The `wanted` branch asks only for search preferences:

- health-related preferences;
- behavior-related preferences.

The wording must not imply that a concrete horse has already been selected,
inspected or verified.

### Layout contract

- desktop uses an `items-start` two-column grid;
- narrow mobile stacks fields into one column;
- textarea cards are block-level and full width;
- counters stay inside the card;
- no page-level horizontal overflow is introduced.

### Safety boundary

This checkpoint adds local UI state only. It does not add:

- draft persistence;
- database mapping;
- image mutation;
- Energy charging;
- policy acceptance;
- seller factual confirmations;
- publication.

The production `horse_offers` contract already has eventual `health_notes` and
`behavior_notes` fields. Client integration still requires a separately
reviewed typed mapper and secure server/RPC boundary.

Next isolated UI work:

- define offer-type-aware price semantics;
- keep `free_transfer` free;
- avoid treating a wanted-ad budget as a seller price;
- keep location, confirmations, persistence and publication separate.

<!-- SELQIRO_V2_HORSE_PRICE_FIELDS_20260902 -->
## V2 horse price and budget semantics

The horse create flow keeps commercial meaning separate from visual form
composition and from eventual persistence.

### Module boundary

- model:
  `src/features/listing-create/model/horseOfferPriceFields.ts`
- UI:
  `src/features/listing-create/components/HorseOfferPriceFields.tsx`
- composition:
  `src/features/listing-create/components/ListingCreatePage.tsx`

The new model and UI contain no Supabase, RPC, Storage, Energy,
policy-acceptance or publication mutation.

### Typed local-state branches

`HorseOfferPriceFieldState` owns four independent branches:

1. `sale`
   - mode: `fixed | from | contact`
   - amount
   - currency: `EUR`
2. `lease`
   - mode: `fixed | from | contact`
   - amount
   - recurring/agreed period
   - currency: `EUR`
3. `coRider`
   - mode: `fixed | from | contact`
   - amount
   - recurring/agreed period
   - currency: `EUR`
4. `wanted`
   - mode: maximum budget or flexible budget
   - buyer budget amount
   - currency: `EUR`

Temporary UI switching may preserve all four local branches. A future mapper
must submit only the branch that matches the active offer type and must ignore
an amount when the selected mode does not use one.

### Offer-type contract

- `sale` represents a seller price.
- `free_transfer` is always free and has no editable amount.
- `lease` represents a lease fee and requires period semantics when a numeric
  fee is used.
- `co_rider` represents a co-rider fee and requires period semantics when a
  numeric fee is used.
- `wanted` represents the buyer's search budget and is not a seller price.

UI labels and future public formatting must retain these distinctions.

### Persistence boundary

The production horse foundation already supports `price_amount`,
`price_type = fixed | from | contact | free` and `currency`. This is sufficient
for sale and free-transfer semantics, but it does not explicitly represent:

- a lease or co-rider fee period;
- a wanted-ad buyer budget and its budget mode.

Do not connect this UI by silently:

- writing a wanted budget into ordinary seller-price semantics;
- concatenating the recurring period into free text;
- submitting hidden values from an inactive branch;
- coercing an empty or contact-mode amount into zero.

Before persistence integration, use a separately reviewed migration and typed
server/RPC mapper. The preferred long-term direction is explicit structured
fields for recurring fee period and buyer-budget semantics rather than an
untyped text convention.

### Input and normalization rule

The browser keeps the amount as a constrained decimal string so the user can
edit naturally. A future trusted mapper must:

- normalize comma or dot decimal input;
- reject invalid, negative or out-of-range amounts;
- map contact/flexible modes to a null amount;
- keep the EE pilot currency contract explicit;
- let database constraints remain authoritative.

### Safety boundary

This checkpoint adds only local UI state. It does not add:

- draft persistence;
- database or schema changes;
- image mutation;
- Energy charging;
- policy acceptance;
- seller confirmations;
- publication.

Next isolated work is privacy-safe horse location UI for the EE pilot. Market
country and horse location country remain EE; exact private location must not
be exposed by default.

<!-- SELQIRO_V2_HORSE_LOCATION_FIELDS_20260902 -->
## V2 horse location UI and stale-safe autocomplete

The first Estonia horse pilot represents location through a small UI model,
keeps actual-horse and wanted-search meanings separate, and reuses the shared
location search without exposing exact location data.

### Module boundary

- local field model:
  `src/features/listing-create/model/horseOfferLocationFields.ts`
- horse location UI:
  `src/features/listing-create/components/HorseOfferLocationFields.tsx`
- shared autocomplete:
  `app/components/LocationAutocomplete.tsx`
- create-flow composition:
  `src/features/listing-create/components/ListingCreatePage.tsx`

The horse model and UI contain no Supabase, RPC, Storage, policy-acceptance or
publication mutation.

### Location meaning

`HorseOfferLocationFieldState` owns two independent branches:

1. `specific`
   - applies to sale, free transfer, lease and co-rider offers;
   - means the actual location of the concrete horse.
2. `wanted`
   - applies only to the wanted offer type;
   - means the area from which the buyer wants to find a horse.

Both branches currently contain:

- fixed country code `EE`;
- city or municipality;
- county or region.

A future persistence mapper must submit only the active branch. It must not map
`wanted` search-area values into the concrete horse's `city`, `region`,
`location_text`, `horse_lat` or `horse_lng` fields without a separately defined
wanted-search-area contract.

### Privacy boundary

The first UI intentionally does not request or hold:

- exact street address;
- exact owner-entered location text;
- latitude;
- longitude.

Public location must stay at city or region precision by default. Exact
location and coordinates remain a private future capability and must not be
introduced through a visual autocomplete convenience.

### Shared autocomplete contract

`LocationAutocomplete` now accepts:

- default scope `all`, preserving existing consumers;
- optional scope `locality`, used by the horse form.

The locality scope:

- accepts locality and administrative place types;
- ranks exact matches before prefix and substring matches;
- removes duplicate locality results;
- excludes business, street, house-number and square suggestions from the
  horse location dropdown.

The request lifecycle uses both cancellation and response versioning:

1. input change invalidates the current request;
2. the previous `AbortController` is aborted;
3. old suggestions are cleared before waiting for the new request;
4. a late response is ignored unless its request ID is still current;
5. clearing the input keeps the dropdown closed.

This dual guard is intentional because cancellation alone is not a complete
correctness boundary across every fetch timing and runtime condition.

### Best-effort prefix behavior

The external search provider may not return a locality for every incomplete
prefix. The UI therefore does not promise that two characters always produce a
suggestion. Current accepted behavior is:

- a complete or sufficiently specific locality name produces a correct result
  after debounce and network latency;
- incorrect old-query results must never remain visible;
- manual city and region entry always remains available.

Improving partial-prefix recall would require a separately reviewed search API,
locality dataset, ranking or caching change. It is not part of this horse UI
checkpoint.

### Validation status

The checkpoint passed:

- production build;
- static source and form-order checks;
- desktop browser tests;
- narrow-mobile browser tests;
- concrete/wanted value-isolation tests;
- Türi, Rakvere, Tartu, input-clearing and stale-response tests;
- browser-console review.

No database, production, persistence, confirmation or publication behavior was
changed.
