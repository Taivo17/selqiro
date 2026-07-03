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
