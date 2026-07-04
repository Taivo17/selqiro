# Listing Detail

## Purpose

Listing Detail is the page where the user decides whether an opportunity is useful enough to act on.

For products, this usually means contacting the seller.

For services, this means contacting the provider or opening the business profile.

For jobs, this means viewing the company and applying or saving the job.

The detail page must feel trustworthy, calm and complete.

---

## Core principle

The detail page should answer the user's next question.

The user should not feel stuck.

After opening a listing, the user should clearly understand:

- what this is
- where it is
- who offers it
- what it costs
- how to act next
- what related options exist

---

## Shared architecture

Product, service and job detail pages should share the same structural idea.

User-facing pages remain different enough to feel natural.

Underneath, they should use the same opportunity architecture where possible.

This keeps Selqiro simple to maintain.

---

## Product detail

A product detail page should show:

- title
- image gallery
- price
- original currency
- approximate converted price when needed
- location
- distance
- condition
- description
- seller identity
- contact action
- save action
- related products
- nearby services when useful

Example:

A user opens a lawn mower listing.

Selqiro should show:
- the mower
- seller
- price
- location
- condition
- contact button
- similar lawn mowers
- nearby repair services if relevant

---

## Service detail

A service detail page should show:

- service title
- business name
- business identity
- images or logo
- location or service area
- service description
- price indication if available
- contact action
- opening hours if available
- trust signals
- related services
- business profile link

The user should understand quickly whether this provider can help them.

---

## Job detail

A job detail page should show:

- job title
- company name
- location
- salary range if available
- job type
- description
- requirements
- contact or apply action
- company profile link
- related jobs

Jobs should feel like opportunities, not just listings.

---

## Desktop layout

Recommended desktop layout:

Top:
- title
- primary image area
- price or value
- main action area

Main content:
- description
- details
- location
- related items

Side area:
- seller or business card
- contact button
- save button
- trust signals
- AI helper when relevant

The layout should be calm and spacious.

---

## Mobile layout

Recommended mobile layout:

Top:
- image gallery
- title
- price
- location

Then:
- main action button
- seller/business card
- description
- details
- related items

The contact action should be easy to reach.

On mobile, a sticky bottom action can be useful:

Contact seller
Save

But it should not cover content aggressively.

---

## Contact behavior

The user can browse without an account.

Account should be required when the user wants to:
- send a message
- save listing
- create listing
- use identity-based actions
- use Energy-based features

The account prompt should appear only when there is a reason.

Good moment:

User clicks "Contact seller".

Message:

Create a free account to message the seller and save your conversations.

This is better than asking for registration too early.

---

## Seller identity

Seller identity must be clear.

The user should know:

- who is selling
- whether it is a personal identity or business identity
- location
- basic trust signals

Email does not need to be public.

Active identity is important inside the logged-in UI, but listing viewers need seller identity, not account email.

---

## Location and distance

Location should feel useful, not technical.

Examples:

Paide
2.1 km away
Near you
Further away

Distance should not use red as a warning.

Far away is not wrong.

It is just further away.

---

## Currency

The listing detail page must preserve original seller price.

Example:

Original:
¥380,000

Viewer conversion:
≈ 2,350 €

Rules:

- original price is always visible
- conversion is approximate
- conversion must not replace seller price
- exchange rate date should be available when relevant

---

## Original language and translation

Original content belongs to the seller.

AI translation can help the viewer, but it must not replace the original.

Recommended behavior:

- show original text
- offer AI translation
- clearly label AI translation
- allow user to compare original and translated text

Rule:

Original content is preserved.

AI helps the viewer understand it.

AI does not rewrite the seller's official message without permission.

---

## Related content

The detail page should not be a dead end.

Depending on the listing, Selqiro can show:

- similar products
- same seller's other listings
- nearby services
- related knowledge later
- related jobs later
- related Brand Space content later

Example:

A lawn mower product can show:
- similar lawn mowers
- garden service providers nearby
- future knowledge: how to choose a mower

---

## AI support

AI should be quiet by default.

AI can appear when useful.

Examples:

- "Need help comparing this with another listing?"
- "Want to know what to check before buying a used lawn mower?"
- "Want help writing a message to the seller?"

AI must not interrupt.

AI should be invited.

---

## Safety and trust

The detail page should support trust.

It can show:

- report listing
- block seller
- verified business signal
- seller active recently
- listing freshness
- suspicious listing warnings when needed

Trust signals should be calm.

Avoid aggressive warning design unless there is a real risk.

---

## Featured listings

If the listing is featured, that can be visible.

But the detail page must not exaggerate importance.

Featured means:

- this listing was highlighted in discovery
- it may have Today's Story or featured placement

It does not mean:
- better quality automatically
- official recommendation automatically
- guaranteed trust

Featured content still follows the same trust and moderation rules.

---

## Empty or incomplete information

If important data is missing, the page should still be usable.

Examples:

Missing price:
Show "Price not specified"

Missing location:
Show "Location not specified"

Missing image:
Show clean placeholder

Missing description:
Do not make the page look broken.

---

## Future Knowledge Gateway

In later phases, detail pages can connect to Knowledge Gateway.

Examples:

Product:
- compatibility
- manuals
- repair info
- related parts

Service:
- certifications
- service documentation
- verified knowledge

Job:
- company background
- role explanation
- skill guidance

Launch does not require professional Knowledge Gateway.

Architecture should not block it later.

---

## What Listing Detail should feel like

The user should feel:

- I understand what this is
- I know who offers it
- I know where it is
- I know what to do next
- I can trust the page enough to continue

The detail page should not feel crowded.

It should feel helpful.

---

## Final rule

Listing Detail is not only a product page.

It is the place where curiosity becomes action.

---

## Listing visibility metrics

Launch decision:

Detailed listing statistics are visible only to the listing owner.

Public visitors should not see exact view counts during launch.

Owner can later see:

- listing views
- saves
- contact clicks
- messages
- phone clicks if supported
- discovery performance later

Public visitors should not see:

- exact view count
- exact save count
- exact contact count

Reason:

Early marketplace numbers may be small and could create the wrong impression.

A new listing should not look weak only because it has few views.

Users should judge listings by relevance, trust, price, content and location, not by public popularity counters.

Future option:

When Selqiro has enough real activity, public soft signals may be considered.

Examples:

- Popular
- Getting attention today
- Many users are viewing this

But exact public metrics are not part of launch.

Decision:

Launch uses owner-only detailed metrics.
Public listing view remains clean.

---

## Show more behavior

Launch decision:

The listing detail page should initially show only the most important information.

Visible first:

- main images
- title
- price
- location
- seller identity
- short description
- most important details
- contact action

The "Show more" action should expand the full listing information.

It should reveal:

- full description
- full technical details
- additional attributes
- extended seller-provided information
- any category-specific fields

Reason:

Users should quickly understand the listing without being overwhelmed.

Users who want more information can open the full detail.

This keeps the first view clean while still preserving complete information.

Rule:

Show important first.
Reveal full detail on demand.

---

## Related and featured sections

The listing detail page should not end after the main listing information.

It should show useful next steps.

Recommended sections:

1. Featured similar listings
2. Featured nearby services related to the listing
3. Normal similar listings
4. Other content from same seller when useful

Example:

A lawn mower listing may show:

- featured similar lawn mowers
- nearby lawn mower repair services
- normal similar lawn mower listings
- seller's other garden equipment

This creates value for:

- the user
- featured listing owners
- nearby service providers
- Selqiro discovery system

---

## Contextual featured content on detail page

Featured content on listing detail pages must be contextual.

If the user is viewing a lawn mower, featured services should be related to:

- lawn mower repair
- garden equipment service
- garden services
- transport if relevant

Do not show unrelated featured content.

Example of wrong behavior:

User views lawn mower.
Page shows boosted restaurant.

This would reduce trust.

Example of correct behavior:

User views lawn mower.
Page shows nearby lawn mower repair service.

This adds value.

---

## Featured content and trust

Featured similar listings and featured services should be clearly marked.

They should not look like hidden organic recommendations.

Possible labels:

- Featured
- Esiletõstetud
- Recommended nearby
- Sinu lähedal esiletõstetud

Exact wording can be refined during UI design.

Important rule:

Featured content must be useful and contextual.

Paid visibility must not break trust.

---

## Detail page discovery value

The detail page is a strong discovery surface.

When a user opens a listing, they already show intent.

This makes contextual featured content more valuable than random ads.

Examples:

- similar featured products
- nearby featured services
- related business profile
- future Knowledge content
- future Brand Space content

This should feel like help, not advertising.


---

## Optional field display on detail page

Detail pages should hide empty optional fields.

If a seller or provider has not added a field, the public page should not show an empty label or empty section.

Examples:

- no service price
- no technical details
- no additional description
- no gallery
- no opening hours
- no documents
- no extra attributes

Owner tools may suggest completing missing fields.

Public visitors should see only meaningful information.

Rule:

Show what exists.
Hide what is empty.
