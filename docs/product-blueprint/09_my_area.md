# My Area

## Purpose

My Area is the private management space for the logged-in user.

It is different from the public profile.

Public Profile:
what others see.

My Area:
where the owner manages their identities, listings, services, updates, Energy, billing and settings.

---

## Naming

User-facing Estonian name:

Minu ala

Reason:

"Minu leht" is too close to a public page.

"Minu ala" better describes a private workspace where the user manages their activity.

---

## Core principle

My Area should stay simple for small users and powerful for larger users.

A simple seller should not see a complicated business dashboard.

A business should be able to access more tools when needed.

Rule:

Show only what is relevant to the active identity and enabled modules.

---

## Account vs identity

My Area must clearly separate:

Account:
private login and ownership

Identity:
public actor inside Selqiro

Billing entity:
who pays

Energy wallet:
available Energy balance

The user should not need to understand all technical terms.

But the UI must make clear:

Who am I acting as?

Example:

Acting as:
Milline Vedu

---

## Active identity

Active identity must always be visible in My Area.

Recommended header:

Tegutsen kui:
Milline Vedu ▼

Switching identity changes:

- listings
- services
- product showcases
- updates
- messages
- profile management
- business tools
- Energy usage context

Email can be shown inside account settings, but it does not need to be constantly visible.

---

## Main sections

My Area can include:

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
- Location and language
- Blocked users
- Admin if user has permission

Not every identity sees every section.

Sections appear based on enabled modules and permissions.

---

## Overview

Overview is the first screen.

It should show the most useful current state.

For simple seller:

- active listings
- messages
- profile completeness
- quick actions

For service provider:

- active services
- quick update status
- temporary location status
- messages
- profile completeness

For local producer:

- product showcases
- listings
- updates
- messages
- profile completeness

For admin:

Admin access should be visible only if user has permission.

---

## Profile management

Profile management controls the public profile.

Owner can manage:

- cover image
- avatar or logo
- display name
- short description
- location / operating area
- contact preferences
- enabled modules
- module order
- pinned content later

Owner view can show suggestions:

- add cover image
- add description
- add first service
- add first listing
- add Quick Update
- complete billing details later

Public visitors do not see these suggestions.

---

## Listings

Listings section is for managing product listings.

It should support:

- active listings
- paused listings
- sold listings
- draft listings
- archived listings
- search own listings
- filter by status
- add listing

This replaces the old "Minu kuulutused" section.

---

## Services

Services section is shown if the identity has service module enabled.

It should support:

- add service
- edit service
- service image
- service description
- optional price
- service area
- service detail fields
- active/inactive status
- service card preview

Service price is optional.

If price is empty, public view does not show it.

---

## Product Showcase

Product Showcase section is shown if enabled.

It supports:

- examples of products
- portfolio items
- product lines
- local producer examples
- official product presentation later

Product Showcase is not the same as marketplace listing.

Listing:
specific item for sale.

Product Showcase:
example, portfolio item or product presentation.

---

## Updates

Updates section manages profile updates.

Updates and Quick Update are one system.

Owner can create:

- general update
- current availability
- temporary service location
- fresh stock
- seasonal offer
- job announcement later
- important notice

The latest active important update can appear as Quick Update on public profile.

If no active update exists, no Quick Update box is shown publicly.

---

## Temporary service location

For service providers, Updates may include temporary service location.

Launch logic:

- one free temporary location update per day
- paid access can be 1 day, 14 days or 30 days
- one active temporary location at a time per service
- updating location replaces previous active location
- service highlighting can increase visibility

This should be managed from My Area, not from the public profile.

---

## Messages

Messages are identity-based.

My Area should show messages for the active identity.

Switching identity changes the inbox.

Messages should show context:

- listing
- service
- Brand Space
- future job
- future order

Messaging is where discovery becomes real interaction.

---

## Energy

Energy section shows:

- current Energy balance
- purchase Energy
- Energy usage history
- Energy spend by feature
- Energy added by recognition
- refunds or adjustments
- related identity/billing entity

For business identities, Energy should connect to billing entity.

Normal participation should not require Energy.

Energy is for optional capability.

---

## Billing

Billing section is important for businesses.

It should show:

- billing entity
- company name
- registration number
- VAT number if applicable
- billing address
- billing email
- payment history
- invoices or receipts
- Energy purchases
- future accounting export

Personal users may see a simpler payment history.

Business users need accounting-friendly data.

---

## Settings

Settings can include:

- account settings
- language
- currency
- location
- notification preferences
- privacy settings
- security
- connected accounting later
- delete/archive options

Do not overload the main My Area overview with settings.

---

## Blocked users

Blocked users should be managed in My Area.

Blocked users cannot message where block applies.

Their listings and profile visibility may be restricted according to block logic.

Blocked users section should be available but not visually dominant.

---

## Admin access

If user has admin permission, My Area may include admin entry.

Admin tools should remain clearly separated from normal user tools.

Admin access should not appear for normal users.

---

## Mobile behavior

Mobile My Area should be simple.

Recommended mobile structure:

Top:
- active identity
- quick switcher

Then:
- main cards:
  - listings
  - messages
  - profile
  - services
  - Energy if relevant

Use clear navigation.

Do not show too many sections at once.

---

## Desktop behavior

Desktop can show a sidebar or dashboard layout.

Recommended desktop structure:

Left:
- My Area navigation

Main:
- selected section

Top:
- active identity
- quick action
- Energy/billing if relevant

Keep desktop calm and spacious.

---

## Empty states

Empty states should be helpful.

Example:

No services yet.

Add your first service so people nearby can find you.

Example:

No Product Showcase yet.

Add examples of what you make or sell professionally.

Empty state should invite action.

Not feel like failure.

---

## Permissions later

Future business identities may support multiple users.

Possible roles:

- owner
- manager
- staff
- driver / worker
- support

Permissions determine what each person can manage.

Launch does not need full team management.

Architecture should allow it later.

---

## What My Area should feel like

Small seller:

I can easily manage my listings.

Service provider:

I can manage services and availability.

Local producer:

I can show what I make and manage listings.

Business:

I can manage profile, billing and visibility.

The user should not feel overwhelmed.

---

## Final rule

My Area is the owner's workspace.

It should reveal complexity only when the user needs it.

---

## Jobs management

Jobs can be a future My Area section for business identities.

My Area / Jobs may support:

- add job
- edit job
- pause job
- close job
- archive job
- view job messages
- future applicants

Initial job management should stay simple.

The business should be able to publish:

- job title
- location
- description
- optional salary
- optional employment type
- contact or apply action

If no job module is enabled, normal users should not see job management.

---

## Overview vs full management

My Area overview should stay compact.

It should show only short summaries:

- a few listings
- a few services
- active quick update
- important messages
- Energy if relevant

Full management opens from "View all" or section navigation.

Examples:

Overview:
Sinu kuulutused

Full view:
Minu ala / Kuulutused
with search, status filter, own sections and editing tools.

Overview:
Sinu teenused

Full view:
Minu ala / Teenused
with edit, active/paused status and add service.

Do not overload the overview page.

The overview is a dashboard, not the full management interface.

---

## Messages access

Messages must be accessible globally.

The top navigation should always include message access.

Clicking messages opens the inbox for the active identity.

If active identity changes, message context changes.

My Area can include a messages section, but the top navigation is the fast access point from every page.

---

## Header login/logout and identity

My Area should rely on the global V2 header for account access.

Header should show active identity at all times.

Example:

Tegutsen kui: Milline Vedu

The login email does not need to be constantly visible.

Email can be shown in account settings.

When logged in, header should provide Log out access.

When logged out, header should provide Log in / Create account access.

---

## Updates placement in My Area

In My Area, Updates / Viimased teated belong in the main management flow.

Reason:

In public profile, updates can be supporting information.

In My Area, updates are managed content.

Therefore they can appear alongside:

- listings
- services
- product showcases

This is different from public profile layout, where latest updates can sit in the right supporting column on desktop.

---

## Identity visual preview in My Area

My Area should make the active identity visually clear.

Recommended approach:

- global header shows active identity with small avatar/logo
- My Area overview shows compact identity preview
- public profile card shows a small public profile preview

Do not use the full public profile header inside My Area.

Reason:

My Area is a management workspace, not the public profile page.

The user should understand:

I am managing this identity.

But the view should not be confused with what public visitors see.

---

## Header identity preview

V2 header may show a small avatar/logo next to active identity.

Do not show full cover image in the global header.

The header must stay compact and practical.

Email does not need to be constantly visible.

Active identity is more important in daily use.

---

## Public profile preview card

The "Vaata avalikku profiili" card in My Area can include:

- small cover preview
- avatar/logo
- identity name

This makes it visually clear which public profile will open.

This is especially useful when one account has multiple identities.
