# AI_MEMORY

VERSION: 2.0

## PROJECT

Type:
Marketplace + Knowledge Platform + AI Gateway

Primary goal:
Help people solve real-world problems.

Marketplace is only one module.

---

## MARKETPLACE

Participation should remain as open as possible.

Community growth is more valuable than restricting participation.

Listings are encouraged.

Services are encouraged.

Businesses are encouraged.

---

## BUSINESS MODEL

Revenue comes from added value.

Never from restricting participation.

Users pay for capability.

Not for permission.

---

## ENERGY

Internal architecture name:
Energy

User-facing name:
Energy Credits

Purpose:
Measure consumption of optional high-value capabilities.

Examples:

- AI assistance
- Knowledge databases
- VIN decoding
- Compatibility search
- Image analysis
- Translation
- Promotion
- Boost
- Automation

Marketplace participation should not consume Energy.

---

## ACCOUNTS

All accounts are equal.

Differences come from:

- Energy balance
- Optional subscriptions
- Business tools

Subscriptions provide larger Energy packages.

Not exclusive access to the marketplace.

---

## COMMUNITY

Community comes before revenue.

First user from every country matters.

Country Pioneer program planned.

Marketplace value grows through participation.

---

## AI

AI is an assistant.

AI is not the product.

Three layers:

1. Portal Assistant
2. Knowledge Assistant
3. Expert AI

AI should never interrupt users.

AI is invited.

AI respects privacy.

---

## KNOWLEDGE

Knowledge is a core module.

Knowledge comes from:

- databases
- documentation
- experts
- AI
- trusted sources

Selqiro connects users with knowledge.

It does not attempt to own all knowledge.

---

## PRIVACY

Collect only necessary information.

AI only receives information required for the current task.

Privacy is a competitive advantage.

---

## ARCHITECTURE

Small modules.

Hooks.

Components.

Shared libraries.

One Source of Truth.

Whole-file replacement.

Copy → Verify → Replace.

Documentation grows with code.

Architecture before features.

---

## LONG TERM

Every architectural decision should work:

- today
- after one year
- after ten years
- with ten million users

---

## CURRENT FOUNDATION

Knowledge System established.

Engineering Standard established.

Foundation Sprint in progress.

Current direction confirmed.

## COMMERCE

Selqiro should be commerce-ready but not webshop-first.

V2 Launch should not include a full webshop.

Future commerce may grow from Brand Space if real user behavior shows demand.

Do not design V2 around cart and checkout.

Design Brand Space so that commerce can be added later without rewriting the architecture.

## ENERGY_ARCHITECTURE

Energy belongs to wallets, not directly only to accounts or identities.

Recommended model:
Account = login
Identity = public actor
Billing Entity = who pays
Energy Wallet = spendable balance
Energy Transaction = audit trail

Energy user-facing name:
Energy Credits

Energy should be used for optional capability, not normal participation.

Business accounting requires billing entity separation.

Do not mix private and business Energy spending.

Energy recognition should be for positive community contribution only.

Do not reward reports with Energy.

Energy must not become inflationary.

## DISCOVERY

Discovery is not advertising.

Selqiro sells useful discovery opportunities, not noisy attention.

Today's Story is the most valuable discovery surface.

There is one primary story slot.

It can rotate between country story and worldwide story.

Default concept:
60 percent country
40 percent worldwide

Paid discovery must be contextual and clearly marked.

Organic ranking must remain trustworthy.

Featured content can appear in discovery areas and also in its normal organic position.

Do not show irrelevant paid content inside unrelated searches.

Today's Story content must be moderated.

Politics, protest campaigns and divisive content are not suitable for Today's Story.

Discovery should create curiosity, not interruption.

## MODERATION

Moderation protects trust.

AI can assist moderation but should not be the final authority for sensitive cases.

Today's Story needs stronger moderation than normal listings because it is high visibility.

Political ads, protest campaigns, ideological campaigns and divisive content are not suitable for Today's Story.

Reports create review signals, not automatic punishment.

Private messages are not casually inspected.

Admin access should be based on reports, support cases and safety needs.

Revenue must never override moderation rules.

## ACCOUNTING_PAYMENTS

Selqiro should not build its own payment infrastructure.

Use trusted payment providers such as Stripe.

Selqiro stores Energy ledger and internal business logic.

Money buys Energy.

Energy is spent inside Selqiro.

Business billing requires billing entity separation.

Personal and business purchases must not be mixed.

Launch does not require full Merit integration.

Merit and other accounting providers should be added later through accounting adapter architecture.

Payment provider webhook is source of truth for payment success.

Every Energy movement must be ledgered.

## TRUST

Trust is a core platform layer.

Launch should begin with quiet trust signals, not public star ratings.

Public reviews and reputation can come later.

Trust layers:
- account trust
- identity trust
- business trust
- listing trust
- service trust
- message trust
- discovery trust
- future Knowledge trust

Verified business should only be used when verification is real.

Privacy is part of trust.

Trust should be calm and not make the platform feel suspicious by default.

## LISTING_METRICS

Launch decision:
Exact listing statistics are visible only to the listing owner.

Public users do not see exact view counts, save counts or contact counts during launch.

Reason:
Early marketplace metrics may be small and could create the wrong impression.

Future:
Soft public signals such as "Popular" or "Getting attention today" can be considered after Selqiro has enough real usage.

## LISTING_DETAIL_DISCOVERY

Listing detail pages should show contextual discovery.

After main listing info, show:
- featured similar listings
- featured nearby services related to the listing
- normal similar listings when useful

Featured content must be contextual.

Do not show unrelated paid content on detail pages.

"Show more" expands the full listing information, including full description and technical details.

## BRAND_SPACE_PRESETS

Brand Space uses one shared foundation with presets and enabled modules.

Launch presets:
- Simple Seller
- Service Provider / Local Business
- Local Producer / Professional Seller

Preset is only a starting configuration, not a limitation.

Modules can be enabled later.

Important modules:
- Listings
- Services
- Product Showcase
- Updates
- Contact
- Trust basics

Future enterprise modules are not required for Launch.

## QUICK_UPDATES_AND_TEMPORARY_LOCATIONS

Brand Space should support a Quick Update module.

Quick Update is for current useful information:
- temporary service location
- fresh availability
- seasonal offer
- free time slot
- important short announcement

If no active update exists, no empty module is shown.

Service providers can use temporary service location.

Launch concept:
- one free temporary service location per day
- additional temporary locations use Energy
- temporary location can gain more visibility if tied to service highlighting
- all temporary updates expire automatically and are logged

Service highlighting duration pricing:
- 1 day highest cost per day
- 14 days medium cost per day
- 30 days lowest cost per day

Misleading temporary locations reduce trust and can be moderated.

## TEMPORARY_LOCATION_PRICING_UPDATE

Temporary service location Energy model is duration-based.

Launch:
- one free temporary location update per day
- paid 1 day access
- paid 14 day access
- paid 30 day access

Longer access is cheaper per day.

30 days should be the most cost-effective.

Paid access allows updates to one active temporary location, not many simultaneous locations.

When the provider updates location, previous active temporary location is replaced.

Service highlighting is separate but can increase visibility of the active temporary location in relevant local discovery.

## LAUNCH_ENERGY_PAYMENTS_CORRECTION

Energy and payment core must be part of V2 Launch.

Reason:
Selqiro revenue depends on paid optional capabilities from the beginning.

Launch must support:
- Energy purchase
- payment provider webhook
- Energy wallet
- Energy ledger
- Energy spending for Today's Story / featured discovery / service highlighting
- basic payment history
- receipt or invoice link

Launch does not need full Merit integration or complete accounting automation.

But paid discovery must not launch without reliable Energy ledger and payment confirmation.

## LIVE_SERVICES

Launch only needs simple Quick Update and one active temporary service location.

Future Live Services module can support businesses with multiple mobile units, such as tow trucks.

Public profile should not show every driver update as a noisy feed.

Instead:
- profile shows compact availability summary
- search/discovery uses active unit locations
- driver role can update only assigned unit
- owner/manager can manage units
- Energy can price active mobile units by duration and count

Avoid exact public GPS by default.

Use area-level availability.

## OPTIONAL_FIELDS

Service price is optional.

If a provider does not add price, public view should not show an empty price field.

General rule:
Show what exists.
Hide what is empty.

Owner view may suggest completing missing fields.
Public view must stay clean.

## SERVICE_PROVIDER_PROFILE_FINAL

Service provider profile visual direction is accepted for launch.

Profile uses:
- cover image
- logo/avatar
- business name
- short description
- Quick Update if active
- temporary location if active
- service cards
- service detail modal
- Follow instead of Save
- no public ratings at launch

Service CTA:
Use "Küsi abi", "Võta ühendust" or "Sõnum".
Avoid "Telli nüüd" unless true instant ordering exists.

Service card opens modal with more details and contact action.

Hide empty optional fields.

## UNIFIED_PROFILE_HEADER_AND_UPDATES

All profile types should use the same public header foundation.

Header:
- cover image
- avatar/logo
- name
- short description
- location/area
- trust signals
- primary contact action
- Follow action

Profile differences come from modules below the header.

Use "Jälgi" for profiles, not "Salvesta".

Use universal top action such as "Kirjuta" or "Võta ühendust".

Service-specific action "Küsi abi" can appear inside service detail modal, Quick Update or temporary location card, not necessarily as the global profile header action.

Updates and Quick Update are one system:
- Updates = history
- Quick Update = active highlighted update at top
- if no active update, hide Quick Update box

## MY_AREA

User-facing Estonian name:
Minu ala

My Area is private management workspace.

Public Profile = what others see.
My Area = where owner manages identity, profile, listings, services, updates, Energy, billing and settings.

Active identity must always be visible.

Show only relevant sections based on enabled modules and permissions.

Main sections:
- Overview
- Profile
- Listings
- Services
- Product Showcase
- Updates
- Messages
- Energy
- Billing
- Settings
- Blocked users
- Admin if permitted

My Area should stay simple for small users and expand for businesses.

## JOBS

Initial Jobs model should be employer-side.

A business is looking for a worker.

Do not start with personal "looking for work" listings.

Jobs should be simple:
- title
- company
- location
- optional salary
- optional employment type
- description
- contact/apply action

Jobs are a Brand Space module and a future My Area section.

Jobs are not required for V2 Launch unless simple to add.

Future:
job alerts near me, featured jobs, simple application flow.

## ENERGY_PAYMENT_FLOW

Energy purchase has two UX modes.

Energy page:
Buy packages such as Starter / Professional / Business.

Inside paid action:
Selqiro calculates missing Energy automatically and offers "Add missing Energy and continue".

Do not call this "custom amount" in the main UX.

If paid action requires moderation, reserve Energy first.
Spend only after approval.
Refund/release if rejected according to policy.

Webhook confirmation from payment provider is source of truth.

## ENERGY_PAYMENT_FLOW_LOCKED

Energy Payment Flow is locked for V2 Launch.

Use:
- "Lisa puuduv Energy ja jätka"
- "Jätka turvalisse maksesse"

Do not show Selqiro as collecting card data.

Payment happens through trusted payment provider.

Launch does not need save-card UX.

For Today's Story and other moderated actions:
Energy is reserved until review decision.

Use fair refund wording:
If Energy has already been used for an active service, refund may not always be possible.

Energy/payment UX should not be redesigned unless implementation exposes a major issue.

## MESSAGE_PRIVACY

Selqiro does not read private messages by default.

Admin/support/developers should not casually access message content.

Message content can be accessed only case-by-case:
- user reports conversation
- user asks support for help
- fraud/safety case
- valid legal request

During V2 Launch, AI does not access private message content at all. Future opt-in AI assistance may be considered later after a separate privacy review.

Access must be limited, justified and logged.

This should be user-facing in Selqiro principles and privacy policy.


## AI_MESSAGE_ACCESS_LAUNCH_DECISION

Launch decision:
AI does not read private messages during V2 Launch, even with user permission.

Reason:
Selqiro's first privacy promise should be simple and clear.

Private messages stay private.

Future:
AI-assisted message writing, summarizing or reporting may be considered later as an explicit opt-in feature after user trust, UX and privacy policy are clear.

## ADMIN_MODERATION_FLOW

Admin Launch foundation:
- reports queue
- identity overview
- listing overview
- service overview
- Today's Story review
- Energy/payment visibility
- audit log foundation
- message privacy case concept

Admin must not casually browse private messages.

Message content can only be accessed through a case:
- reported conversation
- support request
- fraud/safety case
- legal request

Admin actions should be logged.

Today's Story cannot be published only because it was paid.
Trust comes first.

Admin should be case-based, privacy-respecting and structured.

## ADMIN_ENERGY_ADJUSTMENTS

Admin must be able to add or remove Energy when needed.

Use cases:
- technical correction
- failed paid action
- goodwill
- reward / recognition
- Country Pioneer
- beta tester
- fraud reversal

Admin must not directly edit balance.

Every admin Energy change creates an Energy transaction and audit log.

Admin selects wallet:
- personal wallet
- business wallet
- identity-related wallet

User can see admin-added Energy in Energy history.
Internal admin notes remain private.

## MODULAR_ADMIN

Admin should be modular.

Use admin shell + admin modules.

Do not build one giant admin page.

Each feature that needs admin support should add a module:
- reports
- identities
- listings
- services
- Today's Story
- Energy/payments
- jobs later
- Knowledge later
- Live Services later

Each module should have:
- overview
- list/queue
- detail view
- actions
- notes
- audit history
- permissions later

Admin must stay case-based and privacy-respecting.

## ADMIN_AI_TRIAGE

Admin should be modular and AI-assisted.

AI does first-pass triage:
- green = safe/simple
- yellow = uncertain, escalate
- red = high-risk, urgent review

AI can help with:
- reports
- Today's Story review
- support questions
- suspicious content
- repeated system issues
- multi-country admin workload

AI Signals should detect recurring problems such as payment errors, upload failures, localization confusion.

AI reduces admin workload but sensitive decisions remain human-controlled.

## MULTILINGUAL_ADMIN_AND_CASE_OWNERSHIP

Admin cases should support original text + AI translation for non-private content.

Original is source of truth.

AI translation is a working aid.

Admin can write reply in working language and have it translated to user language.

Store both original admin reply and translated user-facing reply.

Private messages exception:
AI does not translate or analyze private messages during V2 Launch.

Case ownership:
Admin clicks "Take case"; case becomes assigned/locked.
Other admins see who is handling it.
Lock can expire or case can be reassigned.

Future routing:
manual, round robin, balanced, country, language, risk, module.

AI Signals:
detect recurring problems like payment errors, upload timeouts, localization confusion, repeated support issues.

## V2_BUILD_PLAN

Decision:
Build Selqiro V2 as a clean new V2 layer inside the existing repo.

Do not endlessly patch old large files.
Do not start a totally new repo from zero.

Reuse:
- Supabase
- auth
- existing database where suitable
- working API/RPC logic
- existing messaging logic where useful
- existing admin foundation where useful

Rebuild:
- UI
- layout
- navigation
- profiles
- discovery
- listing cards/details
- My Area
- services UI
- Energy UI
- admin UI visual layer

V2 can initially live under /v2 routes.

Development rule:
one module at a time, build, test, commit.

Build phases:
1. V2 shell/navigation
2. design system components
3. product discovery
4. listing detail
5. public profile / Brand Space
6. My Area
7. services and quick updates
8. messaging visual refresh
9. Energy/payments
10. admin/moderation
11. jobs later
12. launch QA

## V2_HOMEPAGE_MODULE_ORDER

V2 homepage order:
1. Today's Story
2. Start search direction: Products, Services, Jobs
3. Today to discover
4. Featured products near user
5. Featured services near user
6. Daily Discovery later

Homepage should feel alive but not restless.

Avoid constant auto-moving carousels.

Use manual horizontal scroll, session/page-refresh variation and fair rotation.

Do not change visible content while user is actively reading or interacting.

Featured content rotation must consider location, relevance, fairness, paid rules and trust.

## PRODUCT_DISCOVERY_LOCATION_SORTING

Default product discovery sorting is "Sinu lähedal", not "Uuemad ees".

"Sinu lähedal" means smart nearby ranking:
distance + relevance + freshness + quality + trust.

Selqiro starts from user's selected location and expands automatically when nearby results are limited.

Location change should remain possible, but launch UI should keep it simple.

Global search is a separate mode and should not rely mainly on distance.

Country-specific search can come later when multi-country usage grows.

## LOCATION_PRIVACY

Selqiro is local-first, but private sellers should not be encouraged to publish exact home address.

Private/simple seller default:
- city/area
- approximate distance
- wording like "Paide piirkond · umbes 12 km sinust"

Business default:
- may show exact public address if chosen

Listing detail should show a calm note:
"Asukoht on ligikaudne. Täpne koht lepitakse kokku müüjaga."

Distance precision must match location precision.

Do not treat approximate location as suspicious.

## PUBLIC_PROFILE_MODULE_PLACEMENT

Desktop public profile layout:
Left/main column:
- Quick Update
- Product Showcase
- Listings
- Services

Right/supporting column:
- profile information
- location
- latest updates

Latest updates should be on the right on desktop, like the reference layout.
Quick Update remains prominent near top.
On mobile, sections can stack.

## V2_HEADER_ACCOUNT_VISIBILITY

V2 header should show active identity and account access.

Logged in:
- Sõnumid
- Minu ala
- Tegutsen kui: active identity
- Logi välja

Email does not need to be constantly visible in the header.

Email belongs in account settings or future account dropdown.

My Area:
Updates are managed content and can appear in the main flow with listings/services/product showcases.

## MY_AREA_IDENTITY_PREVIEW

My Area should show active identity visually but compactly.

Use:
- small avatar/logo in global V2 header
- compact identity preview in My Area overview
- small public profile preview in "Vaata avalikku profiili" card

Do not use full public profile header inside My Area.

Reason:
My Area is private management workspace, not public profile view.

Email does not need to be always visible.
Active identity must be visible.

## V2_SERVICES_SKELETON

V2 Services page includes:
- local-first services discovery
- Quick Update / temporary service location
- featured services
- nearby services
- service cards
- service detail modal

Service card opens modal to keep context.

Service price optional.

Temporary service location can make a service visible in relevant local discovery during active time window.

## DISCOVERY_WORDING_LOCATION_NEARBY

Do not mix "Minu lähedal" and "Sinu lähedal" in controls.

Use:
- control: "Asukoht: Paide"
- sorting: "Sinu lähedal"
- section heading: "Sinu lähedal"

Reason:
Location is a setting.
Nearby/relevant is ranking.
Near you is a user-facing section heading.

Default visible sorting label is Near you. Internally, ranking may still consider freshness, quality and trust.

## PRODUCT_DISCOVERY_RELATED_SERVICES

Product Discovery can show a narrow related services strip.

Heading:
Kasulikud teenused selle otsingu juurde

Listing detail heading:
Selle tootega seotud teenused

Show only services that are:
- highlighted / paid visibility
- related to the product search/category
- useful to the user

If no related highlighted service exists, hide the strip.

Prefer closer services, but a farther service can appear if it strongly matches and no close match exists.

Do not show unrelated paid services.

## V2_SERVICES_DISCOVERY_ORDER

Services page order:
1. Compact search
2. Featured services near user
3. Quick updates / temporary service locations
4. Organic services near user

Search affects all three:
featured, quick updates, organic results.

Featured services must match query/category/context.
Quick updates must be time-relevant and contextual.
Paid visibility does not override relevance.

## PRODUCT_DISCOVERY_SEARCH_PLACEMENT

Product Discovery search controls should be in the same top section as the title/location summary, matching Services Discovery.

Order:
1. title + location summary + compact search/filter controls
2. featured products
3. related highlighted services
4. organic products

Keep Products and Services discovery patterns consistent.

## V2_ENERGY_SKELETON

V2 Energy route:
/v2/energy

Includes:
- wallet balance
- package purchase skeleton
- missing Energy flow
- reserved Energy
- Energy history
- secure payment explanation
- billing/receipt placeholder
- admin adjustment explanation

No real payment integration yet.

## WELCOME_ENERGY

New users should receive Welcome Energy if possible.

User-facing name:
Tervitus Energy

Recommended starting amount:
100 Energy, configurable.

Purpose:
Let users try paid value-added features like highlighting before buying Energy.

Rules:
- ledger transaction required
- type: welcome_grant
- visible in Energy history
- not cash
- not silently added
- abuse-aware
- one grant per account/eligible user

## V2_ADMIN_SKELETON

V2 admin route:
/v2/admin

Includes:
- modular dashboard
- case queue
- case detail
- AI triage
- AI Signals
- Energy/payment adjustment concept
- audit log preview
- multilingual original + AI translation example
- case ownership / Take case

Admin must be permission-protected before launch.
No casual private message access.

## V2_SKELETON_CHECKPOINT

First V2 skeleton phase is complete.

Created routes:
- /v2
- /v2/products
- /v2/listing/[id]
- /v2/profile/[slug]
- /v2/my-area
- /v2/services
- /v2/energy
- /v2/admin

These are skeletons, not fully connected to real data.

Next recommended phase:
connect real data gradually, starting with active identity and Product Discovery.

Do not add more large skeleton pages before checkpoint/testing.

## V2_PRODUCTION_ARCHITECTURE_DECISION

After V2 skeleton checkpoint:
Do not directly connect data into skeleton pages yet.

First define clean V2 production architecture.

Decision:
- same repo
- new clean V2 production layer
- old portal is reference only
- V2 skeleton is UX reference only
- production code separates data, feature logic and UI

Avoid launching complex hidden logic:
- profile quality ranking
- listing quality ranking
- AI content ranking
- private message AI
- advanced fraud automation
- live multi-driver services

Launch principle:
small, stable, understandable.

If feature may create instability or confusion, defer it.

Quality is more important than speed.

## AI_IMAGE_CATEGORY_ASSIST_LAUNCH

AI image category assist is included in V2 Launch.

It is user-confirmed, not automatic final decision.

Product listing:
image -> AI suggests category/title/brand/model -> user confirms or edits.

Service:
image + title/description/context -> AI suggests service category -> user confirms or edits.

Use mode:
- product_listing
- service
- product_showcase later
- job/event later

AI must choose from category tree values.
Use normalization + alias mapping + validation.

Manual category selection must always be available.

If AI fails or is unsure, user chooses manually.

## V2_PRODUCTION_SOURCE_STRUCTURE_STARTED

Production V2 source structure starts under src/.

Initial modules:
- src/shared/supabase
- src/shared/auth
- src/entities/identity
- src/features/v2-shell

Old code remains reference only.

Do not copy old SiteHeader directly.

Next production step:
create active identity entity API and V2 identity badge using that API.

## V2_ACTIVE_IDENTITY_MODULE

First production data module:
active identity in V2 header.

Created:
- getMyIdentities
- getActiveIdentity
- setActiveIdentity
- V2IdentityBadge
- V2AccountActions

Old SiteHeader was not copied.

V2Shell now uses V2AccountActions.

Active identity is loaded through src/entities/identity API.

## LISTING_ENTITY_FOUNDATION

Listing entity foundation created under src/entities/listing.

Includes:
- ProductListingCard
- ProductListingDetail
- getProductListings
- getListingById
- listing image sorting/primary selection
- price/location/distance formatting
- mappers

Old marketplace RPCs used:
- get_marketplace_listings
- get_marketplace_listings_nearby

Next step:
connect /v2/products to getProductListings without putting Supabase calls in UI components.

## V2_PRODUCT_DISCOVERY_FIRST_DATA_CONNECTION

Connected V2 Product Discovery organic results to listing entity API.

New feature files:
- useProductDiscoveryListings
- ProductListingCard
- ProductResultsSection

UI does not call Supabase directly.

Only organic results connected for now.

Featured products, related services, filters and pagination remain later.

## V2_LISTING_DETAIL_FIRST_DATA_CONNECTION

Connected /v2/listing/[id] to listing entity API.

New feature files:
- useListingDetail
- ListingDetailPage

Route passes id to feature component.

getListingById enriches seller name/slug from identity_profiles when possible.

UI does not query Supabase directly.

## V2_LISTING_DETAIL_DATA_POLISH

Listing detail polish:
- numeric price strings like "99000" should display with currency, e.g. "99 000 €"
- getListingById enriches seller name/slug from identity_profiles first, then profiles fallback
- keep price formatting and seller enrichment inside listing entity layer

## V2_LISTING_SELLER_AVATAR

Listing detail supports sellerAvatarUrl.

getListingById enriches it from identity_profiles.avatar_url when possible.

Listing detail UI shows:
- seller logo/avatar if available
- first letter fallback if no avatar exists

## V2_LISTING_SELLER_CONSISTENCY_FIX

Product Discovery and Listing Detail seller mismatch fixed.

Listing Detail now:
1. loads direct listing row
2. applies marketplace snapshot seller fields if available
3. enriches by seller_slug from identity_profiles
4. enriches by identity_id from identity_profiles
5. falls back to legacy profiles only last

Future:
create dedicated get_marketplace_listing_by_id RPC.

## V2_LISTING_SELLER_AVATAR_PUBLIC_RPC

If V2 listing detail has seller_slug, enrich seller visual data through get_store_by_slug.

Order:
1. marketplace snapshot
2. get_store_by_slug
3. identity_profiles by slug
4. identity_profiles by identity_id
5. profiles fallback

This is needed because public avatar/logo may come from the public store/profile RPC.

## V2_PUBLIC_PROFILE_FIRST_DATA_CONNECTION

Connected /v2/profile/[slug] to profile entity API.

Uses get_store_by_slug through getPublicProfileBySlug.

Real data:
- displayName
- avatarUrl
- bannerUrl
- bio
- location
- identityType

Still skeleton:
- showcases
- listings
- services
- updates

## V2_PUBLIC_PROFILE_LISTINGS_CONNECTED

Public profile "Müügis praegu" now uses real listings.

New files:
- getListingsBySeller
- usePublicProfileListings
- PublicProfileListingsSection

Listings query:
- identity_id if available
- fallback user_id if legacyUserId
- status active
- active_until > now
- order created_at desc
- limit 12

Still skeleton:
- showcases
- services
- updates

## PUBLIC_PROFILE_HORIZONTAL_SCROLL_FIX

Public profile horizontal card rows must be contained.

Use:
- grid minmax(0,1fr)
- main content min-w-0
- section overflow-hidden
- scroll wrapper max-w-full overflow-x-auto overscroll-x-contain
- cards flex-none fixed width

Do not allow profile listing carousel to create body-level horizontal scroll.

## V2_MY_AREA_LISTINGS_CONNECTED

V2 My Area "Sinu kuulutused" connected to real data.

New files:
- getMyIdentityListings
- useMyAreaListings
- MyAreaListingsSection

Uses get_my_identity_listings RPC through listing entity API.

UI does not call Supabase directly.

Still later:
- edit
- delete/restore
- status changes
- store category assignment
- pagination

## V2_MY_AREA_LISTING_ROW_ALIGNMENT

My Area listing rows use fixed desktop columns:
- listing info
- price
- status
- actions

This prevents price/status/buttons from appearing in different places per row.

Mobile can stack.

## V2_DISABLED_UNFINISHED_ACTIONS

Do not show unfinished actions as active.

Example:
My Area listings:
- Vaata works
- Muuda is disabled as "Muuda hiljem" until edit flow is built

Quality-first rule:
No silent dead buttons.

## V2_LISTING_EDIT_PLAN

V2 listing edit must be built carefully in phases.

Do not copy old My Page edit code directly.

Route:
- /v2/my-area/listings/[id]/edit

Phase order:
1. read-only edit route skeleton with owner check
2. basic fields save
3. location edit
4. category/details edit
5. store category assignment
6. image manager
7. AI assist

Image editing is separate from basic listing edit.

No dead buttons.

Editing changes production content, so each phase must be small and tested.

## V2_LISTING_EDIT_READ_ONLY_ROUTE

Created /v2/my-area/listings/[id]/edit.

Current behavior:
- read-only edit shell
- owner check
- loading/error/not found/forbidden states
- save disabled
- image edit disabled

No data is changed yet.

Next:
basic save for title/description/price/condition/status.

## V2_LISTING_EDIT_BASIC_SAVE

V2 listing edit basic save is working.

Editable fields:
- title
- description
- price
- condition
- status

Still not editable:
- images
- category
- location
- dynamic details
- AI assist

Implemented with small modules:
- buildListingSearchText
- updateListingBasics
- useListingBasicsForm

The edit UI now has:
- dirty state
- save button
- saving state
- saved confirmation
- error state

Owner check remains required before saving.

## V2_LISTING_EDIT_DATE_FORMAT

Listing edit activeUntil is now formatted for display using Intl.DateTimeFormat.

This is display-only.

No database format change.

## V2_MY_AREA_LISTING_ACTION_LAYOUT

My Area listing rows use compact actions.

- image/title/meta opens public listing
- no separate Vaata button
- status dropdown is above edit button
- edit button stays below status
- this gives listing text more room

## V2_LISTING_VISIBILITY_DECISION

Visibility decision:

- public profile shows active + not expired listings only
- My Area shows active, paused and sold listings for management
- listing detail allows owner to open own paused/sold listing
- public viewer should not see paused/sold listing as a normal active listing
- inactive owner listing detail uses active identity seller fallback when marketplace snapshot is missing

## V2_LISTING_EDIT_STATUS_REMOVED

Listing status editing moved out of edit view.

Status is managed in My Area listing rows.

Listing edit now saves:
- title
- description
- price
- condition

It no longer sends status in updateListingBasics.

This prevents edit-save from accidentally overwriting active/paused/sold state.

## V2_LISTING_EDIT_PRIMARY_IMAGE

V2 listing edit can set an existing listing image as primary.

Final implementation uses Supabase RPC set_listing_primary_image_v2.

Reason:
- client-side direct listing_images update was unreliable with current RLS/table rules
- RPC can perform owner check and update image order server-side

Rules:
- selected image becomes is_primary true and sort_order 0
- other images become is_primary false and sorted after it
- listings.image fallback is updated after image order update
- upload/delete/full reorder are separate later steps

## V2_LISTING_EDIT_DELETE_IMAGE

V2 listing edit can delete existing listing images.

Implementation:
- delete_listing_image_v2 Supabase RPC
- owner check in database function
- last image cannot be deleted
- deleting primary image promotes next image automatically
- listing_images order is normalized after delete
- listings.image fallback is updated
- storage cleanup runs after DB delete succeeds

Tested:
- delete non-primary image
- delete primary image
- prevent deleting last image
- edit/My Area/products/detail views stay consistent

## V2_LISTING_IMAGE_UI_COMPACT

Listing edit image actions were moved under each thumbnail.

Each image card now has:
- ✓ Esimene / Esimeseks
- Kustuta
- Viimane pilt when only one image remains

This replaces separate long action rows and keeps image management usable with up to 10 images.

## V2_LISTING_UPLOAD_INPUT_AND_IMAGE_FOCUS

Fixed V2 listing edit image upload input.

Important:
- copy FileList to File[] before clearing input.value
- otherwise selected files may disappear before upload handler reads them

Also tuned listing image presentation:
- My Area listing thumbnails use a wider ratio
- product discovery card images use object-position center 42%
- goal is to reduce unwanted top crop on vehicle photos

## V2_LISTING_DETAIL_THUMBNAIL_GRID

V2 listing detail uses clickable thumbnail grid.

Important:
- route app/v2/listing/[id] uses components/v2/listing/V2ListingDetailPage
- wrapper delegates to src/features/listing-detail/components/ListingDetailPage
- thumbnails are buttons, not passive img elements
- thumbnail click changes selected main image
- previous/next buttons change selected main image
- thumbnails wrap into grid rows to avoid horizontal page overflow

## V2_LISTING_DETAIL_GALLERY_REVEAL_OVERLAY

V2 listing detail gallery arrows auto-hide and reappear reliably.

Final fix:
- when arrows are hidden, render transparent overlay over main image
- overlay listens to mouse/pointer/touch/focus
- interaction reveals arrows
- visible arrow layer has higher z-index than overlay
- when arrows are visible, overlay is not rendered

## V2_LISTING_DETAIL_MOBILE_SWIPE

V2 listing detail gallery supports mobile swipe.

Rules:
- touch start stores x/y
- touch end compares x/y movement
- left swipe = next image
- right swipe = previous image
- vertical scroll is ignored
- tap reveals gallery arrows

## V2_LISTING_DETAIL_MOBILE_GALLERY_POINTER_FIX

V2 listing detail mobile gallery uses pointer events.

Rules:
- hidden controls render a transparent overlay also on mobile
- overlay uses touch-action pan-y to preserve vertical scroll
- pointer down/up detects horizontal swipe
- left swipe = next image
- right swipe = previous image
- tap/reveal shows arrows again
- avoid pointermove reveal on mobile overlay because it can unmount overlay before pointerup

## V2_LISTING_DETAIL_HORIZONTAL_THUMB_STRIP

V2 listing detail gallery uses horizontal thumbnail strip.

Decision:
- prefer old-version style thumbnail strip over multi-row grid
- grid took too much space on mobile
- horizontal strip is compact and works on desktop/mobile

Rules:
- main image stays above
- thumbnails are in one horizontal scroll row
- thumbnail click changes selected main image
- arrows remain available and auto-hide
- mobile vertical scroll over main image must work
- image order source remains listing_images is_primary + sort_order

## V2_LISTING_DETAIL_IMAGE_LIGHTBOX

V2 listing detail supports image lightbox.

Rules:
- clicking main image opens large image overlay
- backdrop click closes overlay
- close button closes overlay
- overlay arrows change selected image
- swipe should not accidentally open lightbox
- image order source remains listing_images is_primary + sort_order

## V2_LISTING_EDIT_IMAGE_PREVIEW_AND_BADGES

V2 listing edit image manager rules:

- edit main image preview should avoid crop
- use object-contain for edit preview
- prefer original_url for edit preview where possible
- thumbnail number badges like "Pilt 2" are not needed
- keep only "✓ Esimene" marker for primary image
- keep Esimeseks/Kustuta actions under thumbnails

## V2_PRODUCTS_MOBILE_IMAGE_RATIO_ONLY

Decision:
- do not rewrite V2 listing detail gallery logic
- keep detail image open/enlarge/scroll behavior
- only tune product card image ratio on mobile

Product cards:
- mobile image should be closer to old version
- use 4:3-ish ratio to reduce excessive cropping
- image/text click still opens listing detail

## V2_LISTING_DETAIL_MAIN_IMAGE_CONTAIN

V2 listing detail main image should show the full vehicle/image on mobile.

Decision:
- match product card feel more closely
- use aspect 4/3
- use object-contain instead of object-cover for the detail main image
- keep horizontal thumbnail strip
- image order source remains listing_images is_primary + sort_order

## V2_LIGHTBOX_SWIPE_AND_AUTO_HIDE_ARROWS

V2 listing detail normal gallery should remain unchanged.

Only lightbox behavior changed:
- modal image supports pointer swipe
- left swipe = next image
- right swipe = previous image
- lightbox arrows have separate visibility state
- arrows hide after about 3 seconds
- interaction with modal image reveals arrows again
- close X is always visible

Implementation caution:
- replace whole lightbox block from lightboxOpen start to return-wrapper tail
- do not stop at first nested ") : null}" inside previous/next buttons

## V2_PRODUCTS_CARD_IMAGE_CROP_NO_GRAY_BARS

V2 product cards should not use object-contain if it creates gray bars.

Decision:
- product card image should use object-cover
- keep rounded corners
- use a slightly wider/lower desktop aspect ratio
- tune crop with object-position instead of contain
- do not change image source/order logic

## V2_MY_AREA_LISTINGS_VIEW_ALL

V2 My Area listings section has a working local view-all toggle.

Rules:
- preview limit is 5 rows
- if loaded listings > 5, show "Vaata kõiki (N)"
- click toggles all loaded rows
- expanded state shows "Näita vähem"
- hook loads up to 80 owner listings
- status change remains inline
- listing image/text opens public detail
- edit button opens edit route

Implementation note:
- overwrite MyAreaListingsSection if small string replacements fail
- ensure render uses visibleListings, not displayListings directly

## V2_MY_AREA_LISTINGS_SEARCH_FILTERS

V2 My Area listings now support owner-management search/filtering.

Rules:
- search input debounced 300ms
- status filter: all/active/paused/sold
- store category filter uses active identity store_categories
- getMyIdentityListings gets searchQuery/statusFilter/storeCategoryFilter
- management limit is 500
- view-all preview remains 5 rows
- status change remains inline
- image/text opens public detail
- edit opens /v2/my-area/listings/[id]/edit

Next related work:
- add/edit/delete owner store categories
- assign listings to store categories in edit view

## V2_STORE_CATEGORY_HIERARCHY_FOUNDATION

Rules:

- owner-defined store categories use `store_categories`
- store categories are separate from Selqiro global marketplace categories
- store categories are scoped by `identity_id`
- hierarchy uses self-referencing `store_categories.parent_id`
- existing flat categories are root categories with `parent_id = null`
- V2 UI supports exactly two levels for now:
  - root category
  - child category
- database architecture may support deeper levels later
- parent and child must belong to the same identity
- self-parent and hierarchy cycles are forbidden
- deleting a category with children is restricted
- child categories require a non-null identity
- `listing_store_categories` remains the listing-to-owner-category link table
- current store category RLS is still based primarily on `user_id`; future staff/business membership support requires a separate RLS review

## V2_STORE_CATEGORY_HIERARCHY_DISPLAY

Rules:

- V2 My Area has a dedicated `StoreCategoryManagementCard`
- the first version is read-only
- `useMyAreaStoreCategories` loads `id`, `name`, `sort_order` and `parent_id`
- only categories belonging to the active identity are loaded
- root categories have `parent_id = null`
- direct children are displayed under their root category
- V2 management UI displays two levels only
- deeper database levels are not rendered in this view
- store categories remain separate from the global Selqiro category tree
- loading, error and empty states are required
- next step is root category creation

## V2_STORE_CATEGORY_COMPACT_LAYOUT_AND_IDENTITY_TEST

Rules:

- store category root cards use compact padding and `text-base` names
- category names wrap naturally and are not truncated in owner management
- category cards do not use a fixed height
- the category count badge uses nowrap
- active identity isolation was browser-tested
- Milline Vedu and Taivo Garaaž show different owner categories
- listing category filters change with the active identity
- V2 does not yet have its own identity switcher
- current identity-switch testing uses the legacy portal
- future V2 identity switching must refresh category management and listing category filters together
- store category name length is not yet constrained in the database
- audit existing names before adding the create action and database name constraints

## V2_STORE_CATEGORY_NAME_INTEGRITY

Rules:

- `store_categories.identity_id` is NOT NULL
- store category names are normalized before database write
- trim leading and trailing whitespace
- collapse repeated whitespace to one space
- category name length is 1–60 characters
- root names are case-insensitively unique within one identity
- child names are case-insensitively unique within one identity and parent
- different identities may use the same category name
- different parents may contain children with the same name
- UI must use the same 60-character limit and show clear validation
- database constraints remain the final source of truth
- production migration:
  `20260713152000_add_store_category_name_integrity.sql`
- rollback test finished with 13 existing categories, 0 test rows and 0 child categories

## V2_STORE_ROOT_CATEGORY_CREATE_SECURITY

Rules:

- root category creation RPC is:
  `public.create_my_store_root_category_v2(text)`
- V2 client sends only the category name
- client must never provide category `identity_id`
- client must never provide root category `parent_id`
- RPC resolves the active identity from `profiles.active_identity_id`
- RPC uses `auth.uid()` as the acting user
- active identity access is checked through:
  `public.current_user_has_identity_access(uuid)`
- private identity access requires `identities.user_id = auth.uid()`
- business identity access requires active `business_members` membership
- root creation always stores `parent_id = null`
- root sort order is appended after current root categories
- database-normalized row is returned to the client
- duplicate root names return a database uniqueness error
- authenticated users can execute the create RPC
- anonymous users cannot execute the create RPC
- direct table writes require:
  `auth.uid() = user_id`
  and access to the row identity
- legacy direct writes remain compatible only for an accessible identity
- cross-identity direct writes are blocked by RLS
- next step is V2 entity API, hook action and root-category form

## V2_STORE_ROOT_CATEGORY_CREATE_UI

Rules:

- V2 My Area supports creating root store categories
- entity type and limits are in:
  `src/entities/store-category/model/types.ts`
- root creation API is:
  `src/entities/store-category/api/createMyStoreRootCategory.ts`
- client-side maximum name length is 60 characters
- UI shows a character counter
- empty input keeps the create button disabled
- UI normalizes whitespace for usability
- database normalization and constraints remain authoritative
- entity API calls `create_my_store_root_category_v2`
- client sends only `p_name`
- RPC resolves user and active identity in the database
- successful creation dispatches:
  `selqiro:store-categories-changed`
- all mounted `useMyAreaStoreCategories` instances reload after the event
- management card and listing category filters refresh without page reload
- duplicate root names show:
  `Selle nimega ülemrubriik on juba olemas.`
- browser-tested with Milline Vedu and Taivo Garaaž
- created category stayed scoped to Taivo Garaaž
- next step is child-category creation
- do not add rename or delete in the same child-creation step

## V2_STORE_CHILD_CATEGORY_CREATE_RPC

Rules:

- child category creation RPC is:
  `public.create_my_store_child_category_v2(uuid, text)`
- client supplies:
  - `p_parent_id`
  - `p_name`
- client does not supply:
  - `identity_id`
  - `user_id`
  - `sort_order`
- RPC resolves active identity from `profiles.active_identity_id`
- RPC validates active identity access in the database
- selected parent must exist
- selected parent must belong to the active identity
- selected parent must be a root category
- V2 child creation RPC supports exactly two UI levels
- third-level creation is rejected by this RPC
- database adjacency-list architecture remains capable of deeper levels later
- sibling sort order is calculated server-side
- duplicate child name under the same parent is rejected
- same child name under another root is allowed
- authenticated role can execute the RPC
- anonymous role cannot execute the RPC
- rollback test completed with zero remaining test rows
- next step is child-category entity API, hook action and compact per-root UI
- do not add rename or delete in the same UI step

## V2_STORE_CHILD_CATEGORY_CREATE_UI

Rules:

- each root category card has a compact `+ Lisa alamrubriik` action
- only one child creation form is open at a time
- child creation uses:
  `src/entities/store-category/api/createMyStoreChildCategory.ts`
- feature state is managed by `useMyAreaStoreCategories`
- child form is:
  `StoreCategoryChildCreateForm.tsx`
- client sends parent ID and child name only
- maximum child name length is 60 characters
- empty input is disabled
- duplicate sibling names show a clear error
- successful creation dispatches the shared store-category invalidation event
- hierarchy display and listing filters reload without page refresh
- V2 UI does not expose third-level creation
- browser-tested with SÕIDUAUTOD, VEOAUTOD and MAASTURID under AUTOD MÜÜGIKS

Next filter behavior:

- listing category filters must not remain flat
- initially show root categories
- selecting a root filters by the root and all descendants
- selecting a child narrows to that child
- selected root reveals its direct children
- only one root group should be expanded at a time

## V2_HIERARCHICAL_STORE_CATEGORY_LISTING_FILTER

Rules:

- owner listing filter RPC remains:
  `get_my_identity_listings(integer, integer, text, text, uuid)`
- frontend still sends one selected store category UUID
- null category filter means all categories
- selected root category includes:
  - listings assigned directly to the root
  - listings assigned to all descendants
- selected child category includes that child and possible future descendants
- category scope is resolved recursively in the database
- recursive helper is:
  `get_store_category_scope_ids(uuid, uuid)`
- scope is always restricted to the active identity
- client must not calculate descendant category IDs
- listing-to-category links must not be duplicated only to support root filtering
- one child assignment is enough for root filtering
- `get_my_identity_listings` now verifies access to the stored active identity
- RPC signature, hook contract and listing entity API did not change
- rollback test confirmed root/child/unrelated branch behavior
- next step is replacing flat My Area category pills with hierarchical filter UI

## V2_MY_AREA_HIERARCHICAL_STORE_CATEGORY_FILTER_UI

Rules:

- My Area listing category filters are hierarchical
- reusable component:
  `src/features/store-category-filter/components/StoreCategoryHierarchyFilter.tsx`
- integration:
  `src/features/my-area/components/MyAreaListingsSection.tsx`
- initial state shows:
  - Kõik rubriigid
  - root categories
- child categories are not displayed as unrelated flat pills
- selecting a root:
  - selects the complete branch scope
  - expands its direct children
- selecting a child:
  - narrows the query to that child scope
  - keeps its root expanded
- only one root group is expanded at a time
- selecting another root closes the previous group
- selecting all categories closes the expanded group
- clearing filters resets the selected category and expanded group
- selected category ID remains one UUID
- `useMyAreaListings` contract did not change
- `getMyIdentityListings` contract did not change
- descendant resolution remains server-side
- no duplicate parent listing-category relation is required
- component is intended for later reuse on the public profile
- public profile visibility rules remain separate from My Area visibility

## V2_STORE_CATEGORY_RENAME_RPC

Rules:

- store category rename RPC is:
  `public.rename_my_store_category_v2(uuid, text)`
- the RPC can rename a root or child category
- client supplies:
  - category ID
  - new name
- category must belong to the authenticated user's active identity
- rename changes only `name`
- rename must not change:
  - category ID
  - parent ID
  - identity ID
  - user ID
  - sort order
- database normalization and 60-character limit remain authoritative
- root sibling-name uniqueness remains enforced
- child sibling-name uniqueness remains enforced
- same child name under another root remains allowed
- anonymous execution is disabled
- rollback test completed with zero remaining test rows
- rename UI has not yet been implemented
- next step is one inline rename form shared by root and child cards

## V2_STORE_CATEGORY_RENAME_UI

Rules:

- store category rename entity API:
  `src/entities/store-category/api/renameMyStoreCategory.ts`
- shared rename UI:
  `StoreCategoryRenameControl.tsx`
- root and child categories both support inline rename
- only one category can be edited at a time
- edit form shows the current name
- maximum length is 60 characters
- unchanged names cannot be submitted
- cancel does not modify the category
- rename changes only the category name
- parent, identity, owner and sort order remain unchanged
- successful rename dispatches the shared category invalidation event
- management hierarchy and listing filters refresh together
- delete is not implemented yet
- next step is secure store-category deletion

## V2_STORE_CATEGORY_DELETE_RPC

Rules:

- store category deletion RPC:
  `public.delete_my_store_category_v2(uuid)`
- child categories may be deleted
- root categories may be deleted only when they have no children
- child categories must never be silently cascade-deleted with a root
- listings themselves must never be deleted with a store category
- only `listing_store_categories` relations are removed
- RPC returns the number of removed listing/category relations
- deletion is limited to the authenticated user's active accessible identity
- anonymous execution is disabled
- cross-identity deletion is forbidden
- missing-category deletion is forbidden
- listing/category links are explicitly removed before deleting the category
- database foreign keys additionally enforce:
  - child protection with `ON DELETE RESTRICT`
  - listing-link cleanup with `ON DELETE CASCADE`
- rollback test completed with zero remaining category and relation rows
- delete UI has not yet been implemented
- next step is confirmed deletion UI for root and child cards

## V2_STORE_CATEGORY_DELETE_UI

Rules:

- delete entity API:
  `src/entities/store-category/api/deleteMyStoreCategory.ts`
- shared confirmation UI:
  `StoreCategoryDeleteControl.tsx`
- child categories can be deleted
- childless root categories can be deleted
- root categories with children cannot be deleted
- child categories are never silently cascade-deleted with a root
- deletion always requires explicit confirmation
- confirmation names the category
- confirmation explains that listings remain
- only listing/category relations are removed
- deletion result includes removed listing-link count
- `useMyAreaStoreCategories` tracks `deletingCategoryId`
- successful deletion dispatches the shared category invalidation event
- category management and listing filters refresh together
- if the selected listing filter no longer exists, it resets to all categories
- only one category mutation or confirmation can be active at a time
- browser tests completed successfully
- store-category launch management now supports:
  - root creation
  - child creation
  - rename
  - safe deletion
  - hierarchical owner listing filtering
- category ordering remains a later feature

## V2_LISTING_STORE_CATEGORY_ASSIGNMENT_RPC

Rules:

- listing store-category assignment RPC:
  `public.set_my_listing_store_categories_v2(text, uuid[])`
- assignment is separate from `updateListingBasics`
- client sends:
  - listing ID
  - complete explicit category ID set
- RPC atomically replaces all existing listing/category links
- empty array removes all store-category links
- duplicate IDs are removed
- null IDs are ignored
- all categories must belong to the active accessible identity
- listing must belong to the same active identity
- cross-identity listing or category assignment is forbidden
- failed validation must preserve the previous assignment set
- child selection must not automatically add its parent
- only explicitly selected category links are stored
- listing content and listing status are not changed
- rollback test completed with zero remaining test categories and links
- assignment UI has not yet been implemented
- next step is hierarchical multi-select assignment in the V2 listing edit view

## V2_LISTING_STORE_CATEGORY_ASSIGNMENT_CLIENT_LAYER

Rules:

- current assignment loader:
  `getListingStoreCategoryIds.ts`
- current assignment saver:
  `setListingStoreCategories.ts`
- assignment state hook:
  `useListingStoreCategoryAssignment.ts`
- read-only edit card:
  `ListingStoreCategoryAssignmentCard.tsx`
- only explicit listing/category links are loaded and displayed
- child links are displayed with their parent path
- parent links are not inferred or stored automatically
- assignment save remains separate from listing basic-field save
- empty category selection is valid
- hook supports dirty, reset, clear, saving, success and error state
- read-only browser connection has been verified
- next step is hierarchical explicit multi-selection and separate save controls

## V2_LISTING_STORE_CATEGORY_ASSIGNMENT_UI

Rules:

- hierarchical selector:
  `ListingStoreCategorySelector.tsx`
- assignment card:
  `ListingStoreCategoryAssignmentCard.tsx`
- assignment state:
  `useListingStoreCategoryAssignment.ts`
- root and child categories are independent explicit selections
- selecting a child must not automatically select its parent
- selecting a root must not automatically select its children
- zero, one or multiple explicit categories are allowed
- empty saved selection removes all listing store-category links
- assignment is saved separately from listing basics
- assignment is saved through `set_my_listing_store_categories_v2`
- `listing_store_categories` is the assignment source of truth
- the hook must finish loading current relations before saving is enabled
- stale or missing selected category references must block unsafe saving
- `Taasta` restores the last saved set
- `Tühjenda valik` changes local selection but does not save automatically
- successful save replaces local saved state with the RPC result
- current management UI supports two levels
- database hierarchy may support deeper levels later
- browser tests completed successfully
- next logical feature is hierarchical store-category filtering on the V2 public profile

## V2_PUBLIC_PROFILE_STORE_CATEGORY_FILTER

Rules:

- public category loader:
  `getPublicStoreCategories.ts`
- recursive category scope:
  `getStoreCategoryScopeIds.ts`
- public category hook:
  `usePublicProfileStoreCategories.ts`
- public filter component:
  `PublicProfileStoreCategoryFilter.tsx`
- filter state belongs in `PublicProfileListingsSection`
- public profile categories must come from the viewed profile `identityId`
- never use `useMyAreaStoreCategories` for a public profile
- viewer active identity must not affect the viewed profile category tree
- initial state shows only all-listings and root categories
- selecting a root filters the complete descendant branch
- selecting a child narrows to that child branch
- root and child filtering use explicit listing/category relations
- parent links must not be duplicated merely to support branch filtering
- recursive scope supports future deeper levels
- current public filter UI displays two levels
- null scope means no category filter
- empty explicit scope must fail closed and return no listings
- selected category resets when the viewed profile changes
- stale selected category resets safely
- only active and non-expired listings are public
- paused, sold and expired listings remain hidden
- use a stable primitive scope key in effects to prevent fetch loops
- browser tests completed successfully

## V2_SECURE_IDENTITY_SWITCHING

Core files:

- database migration:
  `20260720170000_add_secure_active_identity_switch.sql`
- secure switch API:
  `src/entities/identity/api/setActiveIdentity.ts`
- identity list API:
  `src/entities/identity/api/getMyIdentities.ts`
- switcher hook:
  `src/features/v2-shell/model/useV2IdentitySwitcher.ts`
- header dropdown:
  `src/features/v2-shell/components/V2IdentityBadge.tsx`

Security rules:

- active identity switching must use `set_my_active_identity_v2`
- the client must not provide a user ID
- authenticated user is resolved through `auth.uid()`
- target identity must be active
- target identity must be privately owned or available through active business membership
- anon execution must remain disabled
- direct legacy updates of `profiles.active_identity_id` remain protected by the validation trigger
- same-identity selection is idempotent
- do not restore direct `profiles.update` inside the V2 entity API

Identity loading:

- `get_my_identities` already returns slug
- do not add a second browser query to `identity_profiles`
- the redundant query caused recursive `business_members` RLS evaluation
- identity summaries should be mapped directly from the RPC response

Route behavior:

- reload active-identity owner routes after a successful change
- current owner routes include My Area, Energy and listing owner/edit pages
- do not redirect or replace the currently viewed public profile
- public profile data remains keyed by URL slug and viewed profile identity

Listing ownership:

- identity-owned listings require active identity equality
- user ID ownership is only a legacy fallback when `listing.identity_id` is null
- the same identity-first rule must be used for detail visibility, edit loading and writes
- do not let another identity under the same account edit an identity-owned listing
- wrong identity must show forbidden state before a save attempt

Refresh event:

- event name:
  `selqiro:active-identity-changed`
- event detail contains the selected identity and `changed`

## V2_PUBLIC_PROFILE_EXPANDABLE_CONTENT

V2 avaliku profiili sisumoodulid kasutavad kompaktset ja laiendatud olekut.

Reeglid:

- profiili põhijärjekord on Tootenäidised, Teenused, Müügis praegu
- kompaktne olek kuvab mobiilis horisontaalse eelvaate
- Vaata kõiki avab vertikaalse kaardivaate
- avatud olekus on nupu tekst Vaata vähem
- Vaata vähem taastab horisontaalse eelvaate
- kuulutuste poe-rubriigi filtrid ei sulge avatud Vaata kõiki olekut
- valitud filtris null tulemust jätab filtrid nähtavaks
- kui profiilil pole üldse aktiivseid kuulutusi, kuulutuste moodulit ei renderdata
- tootenäidiste ja teenuste moodulid renderdatakse ainult siis, kui neil on päris sisu
- vanad avaliku profiili mock-tootenäidised ja mock-teenused on eemaldatud
- avalik profiil laeb praegu kuni 80 aktiivset kuulutust
- suuremate mahtude jaoks tuleb hiljem päris lehekülgede või Laadi veel loogika

## 2026-07-26 — V2 product showcase image management checkpoint

Implemented and browser-tested:

- V2 My Area now has real active-identity-scoped product showcase management.
- A product showcase is first saved as a draft and the form remains open.
- Users can upload up to 10 JPG, PNG or WEBP images from desktop or mobile.
- The maximum source image size is 10 MB per image.
- Images can be deleted and a different primary image can be selected.
- Publishing is rejected unless the showcase has at least one image.
- External URL fields were removed from the management form.
- Product showcase cards do not expose a clickable external link.
- Existing legacy `image_url` and `external_url` values remain preserved.
- Database migrations `20260723173859` and `20260723184319`
  were applied successfully to the linked production database.
- Local database reset, application build and browser testing succeeded.

Current boundaries:

- Product showcases are portfolio/profile content, not marketplace listings.
- Product showcases do not need a separate global search at launch.
- Published product showcases still need to be connected to real public-profile data.
- Permanent showcase deletion must remove the row, image rows and Storage files.
- Draft and archived showcases remain owner-only.

Locked content-activity policy:

- marketplace listings are active for 90 days;
- services and product showcases are active for 365 days;
- a substantive owner edit restarts the activity period from the edit time;
- an explicit confirmation can restart the period before expiry;
- the original `created_at` and first `published_at` must remain unchanged;
- confirmation without content changes must not change `updated_at`;
- paused, sold, draft or archived content must not be published automatically;
- expired content disappears publicly but remains available in My Area;
- renewing activity must not make content appear newly created or boost ranking.

Before adding activity lifecycle fields, commit and push the current
product-showcase image-management checkpoint.

The next isolated product-showcase lifecycle patch should add:

- `last_confirmed_at`;
- `active_until`;
- a 365-day server-side confirmation rule;
- automatic renewal after substantive edits to published content;
- an explicit owner confirmation RPC;
- preservation of the original first-publication timestamp.

## 2026-07-28 — Product showcase activity lifecycle is live

Migration `20260726150000_add_product_showcase_activity_lifecycle.sql` is applied to the linked production database and must no longer be edited. Any follow-up database change requires a new migration.

Authoritative product-showcase lifecycle rules:

- published product showcases are active for 365 days;
- first publication initializes `published_at`, `last_confirmed_at` and `active_until`;
- the original `published_at` must remain unchanged;
- a substantive edit to still-active published content restarts the 365-day period from the edit time;
- a real gallery insert, update or delete counts as a substantive edit;
- editing already expired content updates its content timestamp but must not silently make it public again;
- explicit owner confirmation uses `confirm_my_product_showcase_activity_v2`;
- confirmation changes `last_confirmed_at` and `active_until`, but not `updated_at`;
- draft and archived content must never become public because of an edit or confirmation side effect;
- expired content remains available to an authorized identity owner but is hidden from public and unrelated authenticated readers;
- activity renewal must not alter creation time, first-publication time or search ranking.

Production verification completed:

- clean local database reset;
- structural SQL checks;
- lifecycle behavior tests;
- anonymous, unrelated-authenticated and owner RLS tests;
- successful application build;
- successful linked dry-run and production push;
- successful production schema dump/object verification.

Known boundary:

- the current `product-showcase-images` bucket remains public;
- database and API visibility are protected, but an already known direct public object URL is not revoked;
- private storage and signed URLs belong to a later isolated migration and application patch.

## 2026-07-29 — Product-showcase owner activity status UI

Implemented and browser-tested:

- `ProductShowcase` now exposes `lastConfirmedAt` and `activeUntil`;
- the owner management API selects and maps the lifecycle fields;
- published showcase cards derive their display state from the server-provided `activeUntil`;
- states are active, 30-day warning, 7-day urgent warning, expired and invalid;
- expired published showcases remain visible to the owner but are excluded from the public-count badge;
- draft and archived showcases do not display an activity notice;
- the client activity clock starts after mount and updates once per minute;
- no lifecycle display action changes creation time, first-publication time or ranking.

Known harmless presentation edge case:

- immediately archiving and republishing may temporarily display 366 days because the RPC timestamp is a few seconds later than the current client comparison timestamp and remaining days use ceiling;
- a refresh displays 365 days;
- the database interval remains exactly 365 days.

The next isolated product-showcase patch is permanent deletion of an archived showcase, including database rows and Storage objects.

## 2026-07-30 — Product-showcase permanent deletion foundation

The secure database foundation for permanent product-showcase deletion is live in production.

Locked behavior:

- only archived showcases may enter permanent deletion;
- preparation creates an idempotent database-issued UUID deletion token;
- a pending token freezes showcase content, status and gallery mutations;
- new Storage uploads and gallery rows are rejected for archived or deleting showcases;
- preparation returns registered image paths and orphaned Storage objects below the showcase folder;
- final deletion is rejected while any corresponding Storage object remains;
- cancellation is allowed only before registered Storage cleanup starts;
- partial cleanup must be completed rather than unlocking a broken showcase;
- final deletion removes the showcase and dependent image rows in one database transaction;
- all RPCs resolve ownership again from the authenticated user's active identity.

Production migration:

- `20260729183000_add_product_showcase_delete_rpcs.sql`;
- locally reset and behavior-tested;
- tested through the real local Storage API;
- dry-run and production push succeeded;
- production schema dump verified columns, constraint, index, functions, grants, triggers and Storage policy.

Never expose a service-role or secret key to the browser. The next isolated patch must implement the Storage cleanup in a trusted Next.js server route and only then expose the owner deletion control.

## 2026-07-30 — Product-showcase deletion server API

The trusted server-side orchestration for permanent product-showcase deletion is implemented and locally E2E-tested.

Implemented boundary:

- `POST /api/product-showcases/delete`;
- the route requires a user Bearer token;
- the token is verified against the Supabase Auth server;
- preparation and finalization RPCs run with the user's JWT;
- the service-role client is limited to trusted Auth verification, Storage cleanup and a narrow post-finalization existence check;
- the browser never supplies privileged Storage paths;
- only database-generated manifest paths are accepted;
- every path must match the expected showcase folder;
- responses are non-cacheable and contain a request ID;
- concurrent completion is handled idempotently when another request already removed the database row.

Validated locally:

- production build and route registration;
- no service-role environment reference in the static client bundle;
- unauthenticated and malformed-request guards;
- real Auth sign-in;
- draft deletion rejection;
- archived showcase deletion;
- registered and orphaned cross-member Storage cleanup;
- image-row and showcase-row removal;
- complete fixture cleanup.

The next patch may connect this endpoint to the owner hook and expose a permanent-delete control only for archived showcases.

## 2026-07-31 — Product-showcase permanent deletion UI

The owner-facing permanent deletion flow is implemented and browser-tested.

Implemented client boundary:

- the permanent-delete control is rendered only for archived showcases;
- deletion requires the exact showcase title;
- cancellation performs no mutation;
- malformed or incomplete confirmation cannot start deletion;
- all overlapping save, status and delete operations are blocked;
- the browser wrapper obtains the current Supabase session token;
- the wrapper sends only the showcase ID to the trusted deletion route;
- the hook removes the deleted showcase from local state after server success;
- stale in-flight loading cannot restore the deleted row;
- success feedback and owner counts update immediately.

The title confirmation is a destructive-action UX safeguard only. Authorization, active-identity ownership, archived status, manifest generation, Storage cleanup and final deletion remain authoritative on the server and in the database.

Manual browser validation passed for opening, cancelling, invalid confirmation, successful deletion and persistence after reload.

## 2026-08-01 — Public-profile product showcases are live

The product-showcase public-profile boundary is implemented and manually browser-tested.

Data boundary:

- query by `PublicProfile.identityId`;
- require `status = published`;
- require `active_until` later than the request timestamp;
- rely on RLS as the authoritative visibility boundary and repeat critical visibility validation in the mapper;
- load showcase rows and all matching gallery rows with two bounded queries;
- omit uploader identity, Storage object path and external URL from the public select;
- omit malformed rows, expired rows and showcases without a usable public image.

Presentation boundary:

- hide the entire section when there is no public content;
- show up to five cards in the compact horizontal preview;
- expose all cards in a responsive expanded grid;
- allow every available gallery image to become the selected card image;
- open the selected original image in an accessible fullscreen dialog;
- support pointer controls, thumbnails, keyboard arrows, Escape, backdrop close and body-scroll locking;
- hide previous/next controls after about three seconds of inactivity and restore them after interaction;
- clamp long expanded descriptions and expose `Vaata rohkem` only when measured overflow exists.

Manual validation passed for published/draft/archived filtering, authenticated and anonymous profile views, gallery selection, fullscreen navigation, long-description expansion and narrow mobile layout.

## 2026-08-01 — Product listing return-position foundation

The V2 product-discovery listing flow now preserves the browsing position when a visitor opens a listing and returns.

Implementation:

- `ProductListingCard` stores a tab-local return context before routing to `/v2/listing/[id]`;
- the source history entry receives a unique return token;
- the context records source URL, listing ID, absolute scroll position and the card's viewport offset;
- `ProductResultsSection` waits for the asynchronous listing load before restoration;
- the shared restoration hook aligns the original card over several render delays and then clears the context;
- `ListingDetailPage` uses history back when a matching context exists and retains `/v2/products` as the direct-entry fallback;
- the detail action label remains source-aware for the upcoming public-profile integration.

This mechanism is intentionally privacy-light: it uses only `sessionStorage`, does not reach the database and does not persist across browser tabs or sessions.

## 2026-08-01 — Public-profile listing return state is restored

The shared listing return-navigation foundation now supports public-profile browsing.

Stored public-profile return state:

- expanded or compact listings mode;
- selected store-category ID;
- expanded root-category ID;
- compact horizontal row `scrollLeft`;
- listing ID, absolute page scroll and listing-card viewport offset.

`PublicProfileListingsSection` restores the UI state before enabling position restoration. The public listings hook tracks `resolvedScopeKey` so a stale result set from the previous category cannot satisfy the restoration readiness check during the render before the new effect starts.

Both browser history back and the detail action labelled `Tagasi profiilile` restore the previous browsing context. The storage remains tab-local `sessionStorage` only.

## 2026-08-02 — Public-profile expanded sections are coordinated

`PublicProfilePage` now owns one shared expanded-section state for the two large public-profile content areas:

- `showcases`;
- `listings`;
- or no expanded section.

`PublicProfileProductShowcasesSection` and `PublicProfileListingsSection` are controlled components. Opening either section automatically compacts the other. The listing store-category controls render only while listings are expanded, reducing immediate page height on mobile.

When listings are compacted outside the listing-return restoration flow, the hidden selected category and expanded root are cleared so the compact preview is not silently filtered. Existing public-profile listing return restoration can still reopen listings and restore the saved category, expanded branch, card position and horizontal row position.

## 2026-08-02 — Public product-showcase touch swipe verified on a real phone

`PublicProfileProductShowcasesSection` now supports Pointer Events based horizontal swipe navigation in both the expanded card gallery and the full-screen lightbox.

Important behavior:

- minimum horizontal movement is 55 px;
- horizontal movement must exceed vertical movement by the configured axis ratio;
- `touchAction: "pan-y"` preserves vertical page scrolling;
- the compact horizontal showcase row does not capture image swipes;
- the post-swipe click is suppressed so the lightbox is not opened accidentally;
- single-image galleries ignore swipe navigation;
- thumbnails, arrow buttons, keyboard navigation, Escape handling and the three-second control auto-hide remain intact.

Production build passes. Taivo verified the Vercel deployment on a real phone: left/right swipe works in the expanded card gallery and full-screen lightbox, vertical scrolling remains natural, normal tap still opens the lightbox, and the existing three-second arrow auto-hide remains correct. The mobile swipe interaction is fully verified.
