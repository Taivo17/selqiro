# Listing Card

## Purpose

Listing Card is one of the most important UI components in Selqiro.

Users see listing cards much more often than detail pages.

A good card helps the user decide quickly:

Is this worth opening?

The card should be simple, trustworthy and useful.

---

## Core principle

A listing card should show enough information to make a decision, but not so much that browsing becomes heavy.

Rule:

The card is not the detail page.

The card is a preview.

---

## Shared architecture

Products, services, jobs and future opportunity types can use the same card architecture.

User-facing sections remain separate:

- Products
- Services
- Jobs
- Future sections

But underneath, they can share a common card system.

This keeps Selqiro simple for users and maintainable for developers.

---

## Universal card fields

Every card should be able to support:

- image or visual identity
- title
- short subtitle or description
- price or value information
- location
- distance feeling
- owner or provider identity
- type indicator when needed
- saved/favorite action
- trust signals when available

Not every card must show every field.

The visible fields depend on the opportunity type.

---

## Product card

A product card should show:

- product image
- title
- price
- location or distance
- condition
- seller identity when useful
- favorite/save action

Example visible information:

Husqvarna LC 140
120 €
Good condition
2.1 km away

---

## Service card

A service card should show:

- service or business image/logo
- service title
- business name
- location or service area
- price indication if available
- trust or verified signal when available
- contact or view action

Example visible information:

Auto repair
Taivo Garage
Paide
Near you

---

## Job card

A job card should show:

- job title
- company name
- location or remote status
- salary range if available
- job type
- posted date or freshness

Example visible information:

Mechanic
Taivo Garage
Paide
Full-time

---

## Image behavior

Image is important, but should not dominate the whole card.

The first image should represent the listing clearly.

If no image exists:
- product card can show a clean placeholder
- service card can show business logo or category icon
- job card can show company logo or neutral job icon

Avoid empty-looking cards.

---

## Price behavior

Price should be clear and easy to read.

The listing always stores original price and original currency.

Example:

¥380,000

If the viewer uses another currency, Selqiro may show an approximate converted value:

¥380,000
≈ 2,350 €

Rules:

- original price is the source of truth
- converted value is only an estimate
- do not hide the seller's original currency
- do not store converted price as the official listing price

---

## Distance behavior

Selqiro should keep the "near me" feeling.

Distance should help the user understand availability, not punish listings.

Recommended distance feeling:

Near:
green indicator

Further away:
white or grey indicator

Avoid red for distance.

A far listing is not wrong. It is simply further away.

---

## Location behavior

Cards should show location in a calm and compact way.

Examples:

2.1 km
Paide
Near you
Further away

The exact wording can depend on country, language and view.

Location and distance belong to the global platform layer, not only marketplace.

---

## Trust signals

Trust signals should be subtle.

Examples:

- verified business
- active recently
- identity age
- response quality
- report-free status
- admin verified

Avoid aggressive rating systems at launch.

A new marketplace may not have enough reliable review data early.

Start with quiet trust signals, not public score pressure.

---

## Featured card behavior

Featured cards must be clearly separated from organic ranking.

Rules:

- featured visibility must be labeled
- featured cards must not secretly replace organic results
- the same listing can still appear in its normal organic position
- discovery surfaces must be honest and understandable

Selqiro should use discovery, not hidden manipulation.

---

## Today's Story card

Today's Story is not a normal listing card.

It is a discovery story surface.

It can feature:

- product
- service
- job
- business
- event
- campaign
- travel offer
- future opportunity types

Today's Story should feel curated and valuable, not like a noisy advertisement.

---

## Mobile behavior

On mobile, cards must be compact.

Recommended mobile card behavior:

- image on left or top depending on view
- title clearly visible
- price or value visible
- distance visible
- one quiet save action
- no overloaded metadata

Mobile card should support fast scrolling.

The user should be able to understand the listing in one glance.

---

## Desktop behavior

On desktop, cards can show more information, but still should stay calm.

Desktop card may show:

- larger image
- title
- price
- condition
- location
- seller/business
- short metadata

Do not make desktop cards too information-heavy.

Browsing speed matters.

---

## What the card should not do

A listing card should not:

- show too many badges
- show too many buttons
- hide important price information
- exaggerate urgency
- confuse paid and organic visibility
- open popups unnecessarily
- feel like an advertisement by default

The card should support trust and discovery.

---

## Card click behavior

Clicking the card opens the detail page.

Secondary actions should be limited.

Recommended secondary actions:

- save/favorite
- maybe quick contact in some contexts later

Do not overload the card with too many actions.

The main action is:

Open detail.

---

## AI support

AI can improve card quality during listing creation.

AI can help with:

- better title
- cleaner description
- category suggestion
- missing information warning
- translation
- image quality warning

AI should not invent facts.

If AI improves text, the user must remain in control.

---

## Global-local behavior

Listing cards must support global usage.

They should handle:

- different currencies
- different address formats
- different languages
- different units
- different country norms
- translated display where appropriate

Selqiro is global by design and local by experience.

The card should feel natural in every country.

---

## Final rule

A listing card should help the user decide quickly without breaking trust.

It should feel simple on the surface and powerful underneath.
