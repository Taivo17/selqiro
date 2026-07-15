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
