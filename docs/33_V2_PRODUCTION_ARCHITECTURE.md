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
