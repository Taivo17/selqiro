# Services Flow

## Purpose

Services Flow describes how users discover nearby service providers.

Services are one of Selqiro Launch's most important parts.

A user may not always need to buy a product.

Sometimes they need someone nearby who can help.

Example:

The lawn mower is broken.

Possible solutions:
- buy another lawn mower
- find a repair service nearby
- ask Selqiro Assistant what makes sense

Services make Selqiro useful even when product listings are limited.

---

## Core principle

Nearby Services should feel local, useful and trustworthy.

The user should think:

I can quickly find someone near me who can help.

Not:

I am browsing a business directory.

---

## User flow

Typical service flow:

Homepage
↓
Services
↓
Category
↓
Service Discovery
↓
Service or business detail
↓
Contact provider

Example:

Homepage
↓
Services
↓
Home and Garden
↓
Lawn mower repair
↓
Nearby service providers
↓
Business profile
↓
Message or call

---

## Relationship with products

Products and services are separate in the user interface.

But they should be connected when useful.

Example:

A user views lawn mowers.

Selqiro can also suggest:
- nearby lawn mower repair
- garden services
- similar products

Example:

A user views car parts.

Selqiro can also suggest:
- nearby auto repair
- diagnostics
- parts sellers

This creates real-world usefulness.

---

## Service Discovery

Service Discovery should show:

- service category
- nearby providers
- distance
- business name
- short description
- trust signals
- contact action
- view business profile action

Services are location-sensitive.

Near you matters more for services than for products.

---

## Search behavior

Search should update results immediately.

There is no "Apply filters" button.

When the user changes:
- search text
- category
- location
- service type
- opening status
- rating or trust filters later

results update automatically.

---

## Filter behavior

Filters should not dominate the page.

Visible controls should stay simple:

Search
Location
Service type
Filters

Filters open temporarily.

After selection:
- results update immediately
- user continues browsing services

Rule:

Filters must not interrupt service discovery.

---

## Location behavior

Services should strongly respect "near me".

The system starts near the user and expands when needed.

User can change location.

Visible location control:

Near me
Paide
Change

If few services exist nearby, Selqiro should expand calmly and explain:

Showing nearby services first.
More results appear as the area expands.

Distance display should be calm.

Near:
green

Further away:
white or grey

Avoid red for distance.

Far away is not wrong.

---

## Empty state

Services may be empty in some regions during launch.

This must not feel like failure.

Good empty state:

No lawn mower repair services found near Paide yet.

You can:
- expand search area
- look at garden services
- view product listings
- add your own service
- get notified when a matching service appears later

Empty areas are opportunities, not dead ends.

---

## Service card

A service card should show:

- business or service image
- service title
- business name
- location
- distance
- short description
- trust signal when available
- save action
- view action

Example:

Lawn mower repair
Paide Garden Service
Paide
2.1 km away
Repair and maintenance

---

## Business profile connection

Service cards should lead naturally to the business profile.

The business profile is where the user can see:

- all services
- products if any
- contact information
- location
- opening hours
- trust signals
- Today's Story if active
- future Brand Space modules

A service is not isolated.

It belongs to a business identity.

---

## Free participation

Nearby Services should be free to join during Launch.

Reason:

A services marketplace only works if there are many providers.

Network growth is more important than early restriction.

Revenue comes later from:
- discovery visibility
- Today's Story
- Energy-based tools
- automation
- analytics
- better business tools

Participation should not be restricted.

---

## Discovery and visibility

Paid visibility must not destroy trust.

Services can appear in discovery areas such as:

- Today's Discoveries
- Nearby featured services
- category-relevant recommendations

But paid placement must be clear.

Organic service ranking must remain trustworthy.

If user searches auto repair, do not show unrelated restaurant ads inside the search results.

Visibility must be contextual.

---

## Today's Story

A service provider can use Today's Story later.

Examples:

- new workshop opening
- seasonal service offer
- new repair service
- travel offer
- local event
- hiring campaign

Today's Story is not just an ad.

It is a daily discovery surface.

It should remain connected to Selqiro's useful content.

---

## AI support

AI can help users find the right service.

Example:

User says:
My lawn mower broke.

Selqiro Assistant can suggest:
- view lawn mowers for sale
- view nearby repair services
- ask if repair or replacement may make sense

AI should guide the user to useful options.

AI should not interrupt.

---

## Trust

Service providers need trust signals.

Launch trust signals can be simple:

- verified business later
- active recently
- clear contact information
- complete profile
- no serious reports
- response behavior later

Avoid complex review systems at Launch.

Ratings can come later when enough real usage exists.

---

## Mobile behavior

Mobile service discovery should be very simple.

Recommended mobile layout:

Top:
- service category
- location
- search/filter access

Main:
- nearby service cards
- distance
- business name
- contact/view action

The user should be able to find a nearby provider quickly with one hand.

---

## Desktop behavior

Desktop can show more context:

- service list
- map later
- filter panel when opened
- business preview
- nearby alternatives

But the main focus remains:

Find a useful provider nearby.

---

## Notifications later

Future feature:

Notify me when a new matching service appears near me.

This is important in regions where services are still growing.

It turns an empty result into a future connection.

---

## Accounting and business value later

Businesses should later see:

- profile views
- service views
- contact clicks
- messages
- discovery visibility
- Today's Story performance

This helps businesses understand the value of Selqiro.

Launch does not need full analytics, but architecture should not block it.

---

## What Services should feel like

Services should feel:

- local
- useful
- trustworthy
- easy to contact
- not overloaded
- connected to real needs

The user should think:

Someone nearby can help me.

---

## Final rule

Nearby Services is not a business directory.

It is a local problem-solving layer inside Selqiro.

---

## Service price behavior

Service price is optional.

Many services cannot show a fixed price before the provider knows:

- what the customer needs
- where the job is located
- how much work is required
- whether special equipment is needed
- whether the situation is urgent

Examples:

- tow truck service
- construction work
- plumbing
- repair work
- custom manufacturing
- transport

Allowed price display options:

- starting price
- price range
- price by agreement
- no visible price

If the service price field is empty, the public service view should not show an empty price area.

Rule:

Do not show empty fields.

Only show information that the provider has actually added.

This keeps the profile clean and avoids misleading users.

---

## V2 Services skeleton

V2 Services skeleton introduces:

- services discovery page
- local-first service search
- Quick Update / temporary service location block
- featured services
- nearby services
- service card
- service detail modal

Service card opens a modal instead of navigating away.

Reason:

The user should keep context while seeing more details.

Service detail modal can show:

- image
- service name
- provider
- area
- distance
- optional price
- description
- key details
- contact action

Service price remains optional.

If price is missing, public UI should not show an empty price field.

---

## Temporary service location in services discovery

Services discovery should support temporary service location.

Example:

Tow truck provider normally operates in Järvamaa.

Active temporary location:

Gonsiori area, Tallinn until 16:00.

This can make the service visible in relevant Tallinn tow truck discovery.

Visibility must depend on:

- service category
- location
- time
- trust
- highlighting status if any

Do not show unrelated temporary services in unrelated contexts.
