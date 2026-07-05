# Location Privacy Architecture

## Purpose

Location is important in Selqiro because the platform is local-first.

Users should understand what is near them.

At the same time, Selqiro must protect private sellers and home addresses.

---

## Core principle

Distance is useful.

Exact private address is not always appropriate.

Selqiro should show location with the right precision depending on profile type and user choice.

---

## Private seller location

Private sellers and simple sellers should not be encouraged to publish exact home address.

Recommended default:

- city
- town
- village
- area
- approximate location
- approximate distance

Example public display:

Paide piirkond · umbes 12 km sinust

Do not show exact street address for private seller by default.

The exact meeting place can be agreed in messages.

---

## Business location

Businesses may show exact location when appropriate.

Examples:

- shop
- workshop
- office
- service point
- public business address

Example public display:

Paide, Kesk 12 · 3.2 km sinust

Business can still choose to show only operating area if exact address is not useful.

---

## Service provider location

Service providers may have different location types:

- exact business address
- service area
- temporary service location
- mobile unit location later

Public display should use the right wording.

Examples:

Teeninduspiirkond: Tallinn ja Harjumaa

Puksiir saadaval Gonsiori tänava piirkonnas kuni 16:00

Do not expose exact live GPS by default for mobile services.

---

## Location precision levels

Recommended internal concept:

- exact_address
- approximate_area
- city_only
- service_area
- temporary_area
- hidden

Each listing, profile or service can have a location precision.

This allows Selqiro to show correct wording.

---

## Distance display

If location is exact, distance can be shown normally.

Example:

12 km sinust

If location is approximate, distance should be approximate.

Example:

umbes 12 km sinust

or

~12 km sinust

If only city or region is known, use area wording.

Example:

Paide piirkond

If distance would be misleading, do not show exact distance.

---

## Public wording

Use calm wording.

Good:

- Paide piirkond
- umbes 12 km sinust
- asukoht on ligikaudne
- täpne koht lepitakse kokku müüjaga

Avoid scary wording.

Do not make the listing look untrustworthy only because the seller protects their privacy.

---

## Listing detail behavior

Listing detail should show:

- location area
- approximate distance when appropriate
- privacy note for private sellers

Example:

Paide piirkond, Eesti
umbes 12 km sinust

Asukoht on ligikaudne. Täpne koht lepitakse kokku müüjaga.

---

## Product card behavior

Product cards should stay compact.

Recommended display:

Paide piirkond
~12 km

or

Paide
~12 km

Do not overload cards with long privacy explanations.

Detailed explanation belongs to listing detail or tooltip.

---

## Listing creation guidance

When creating a listing, private sellers should see guidance:

For privacy, use city or area instead of exact home address.

Businesses can add exact public address if they want customers to find them.

---

## Trust

Approximate location should not be treated as suspicious.

For private sellers, approximate location is normal.

Trust should come from:

- identity
- listing quality
- messages
- reports
- behavior
- moderation

Not from forcing private address exposure.

---

## Final rule

Selqiro should help users find nearby opportunities without forcing private users to reveal exact home location.
