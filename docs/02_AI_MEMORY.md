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
