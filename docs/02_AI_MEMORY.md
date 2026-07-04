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
