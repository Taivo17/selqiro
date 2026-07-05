# Selqiro V2 Build Plan

## Purpose

This document defines how Selqiro V2 should be built.

The goal is to move from the current working portal toward V2 without breaking what already works.

---

## Core decision

Selqiro V2 will be built as a new clean V2 layer inside the existing repository.

We will not endlessly patch old large files.

We will also not start a completely new repository from zero.

Decision:

Build a new V2 UI and component layer inside the current repo, while reusing the existing working foundation where it makes sense.

---

## Why this decision

The current experience showed that refactoring large existing files can be slow and fragile.

Small changes can create unexpected issues.

A clean V2 layer is easier to build, test and understand.

At the same time, a totally new project would create too much duplicated work:

- authentication would need to be reconnected
- Supabase setup would need to be rebuilt
- API routes would need to be moved
- environment configuration would need to be recreated
- deployment and storage could become more complicated
- existing data and working logic could be lost or delayed

The best path is a controlled middle way:

New V2 experience.
Same repo.
Reuse stable backend and working logic.
Build new UI in smaller pieces.

---

## What stays

V2 should reuse existing foundation where it is stable and useful.

Keep or reuse where possible:

- Supabase project
- authentication
- existing database tables where suitable
- existing RPC functions where working
- existing listing/search logic where useful
- existing messaging logic where useful
- existing admin foundation
- existing AI API routes if working
- location/geocode/search API routes
- existing environment and deployment setup

Do not rebuild backend only for the sake of rebuilding.

---

## What is rebuilt

V2 should rebuild the user-facing experience and component structure.

Rebuild:

- V2 layout
- header and navigation
- homepage / discovery
- product discovery
- listing cards
- listing detail
- public profile / Brand Space
- My Area
- services UI
- quick updates UI
- Energy UI
- payment flow UI
- admin UI visual layer
- shared design system components

The goal is cleaner UI, smaller components and more maintainable structure.

---

## Recommended V2 structure

Recommended project structure:

app/v2
app/v2/products
app/v2/listing/[id]
app/v2/profile/[slug]
app/v2/my-area
app/v2/admin

components/v2/layout
components/v2/cards
components/v2/profile
components/v2/discovery
components/v2/forms
components/v2/energy
components/v2/admin

lib/v2/listings
lib/v2/services
lib/v2/profiles
lib/v2/energy
lib/v2/formatting

V2 can initially live under /v2 routes.

When tested and stable, V2 routes can replace current main routes.

---

## Main build rule

No more large uncontrolled rewrites.

Every step should be:

1. small
2. understandable
3. testable
4. build passing
5. committed to Git

Rule:

One module at a time.
Build.
Test.
Commit.
Then continue.

---

## Phase 1 — V2 shell and navigation

Build the V2 foundation.

Includes:

- V2 layout
- new header
- navigation naming
- active identity visible
- messages always accessible
- login/logout still working
- mobile navigation foundation
- basic responsive structure

Naming direction:

- "Turg" should move toward "Avaleht" or "Avasta" depending on final UI
- "Pood" is no longer a main concept
- public profile is "Profiil"
- private management area is "Minu ala"

Goal:

Create the shell where all V2 views will live.

---

## Phase 2 — Design system components

Create reusable UI components.

Examples:

- buttons
- cards
- badges
- inputs
- panels
- section headers
- empty states
- modals
- drawers
- layout containers

Reason:

V2 should not repeat styling in every page.

Shared components keep design consistent and development faster.

---

## Phase 3 — Product Discovery

Build the product browsing experience.

Includes:

- category/subcategory structure
- product list
- search
- filters
- price filter
- location logic
- automatic loading
- listing card
- mobile horizontal card layout
- desktop grid layout

Important decisions:

- results update immediately
- no "Apply filters" button
- filters are temporary panels
- mobile cards use image left and text right
- desktop launch uses grid layout
- exact public view counts are not shown

---

## Phase 4 — Listing Detail

Build listing detail view.

Includes:

- gallery
- title
- price and currency logic
- original price preserved
- approximate conversion where needed
- seller identity
- contact action
- description
- important details first
- "Show more" opens full listing information
- contextual featured similar listings
- contextual nearby services

Important decisions:

- exact statistics are owner-only at launch
- public visitor does not see exact view count
- related featured content must be contextual
- detail page should not be a dead end

---

## Phase 5 — Public Profile / Brand Space

Build the public profile foundation.

All profile types use the same header foundation.

Includes:

- cover image
- avatar/logo
- name
- short description
- location/area
- trust signals
- primary contact action
- Follow action
- modules below header

Important decisions:

- use "Jälgi", not "Salvesta"
- top profile action should be universal: "Kirjuta" or "Võta ühendust"
- service-specific "Küsi abi" belongs inside service detail or quick update
- differences between sellers, services and producers come from modules below the header

Launch profile presets:

- Müüja / Simple Seller
- Teenusepakkuja / Local Business
- Kohalik tootja / Professional Seller

---

## Phase 6 — My Area

Build the private owner workspace.

My Area is not the public profile.

My Area includes:

- overview
- profile management
- listings
- services
- product showcases
- updates
- messages
- Energy
- billing
- settings
- blocked users
- admin entry if user has permission

Important decisions:

- active identity must always be visible
- show only modules relevant to active identity
- overview is a summary
- "View all" opens full management view
- messages are always accessible from top navigation

---

## Phase 7 — Services and Quick Updates

Build service provider features.

Includes:

- service cards with images
- service detail modal
- optional service price
- hidden empty fields
- quick update
- temporary service location
- updates history
- service contact action

Launch rules:

- one active Quick Update
- one active temporary service location
- temporary location can be Energy-based
- one active temporary location at a time per service
- Live Services with multiple mobile units comes later

---

## Phase 8 — Messaging visual refresh

Do not rebuild messaging logic from zero unless necessary.

Refresh UI to match V2.

Includes:

- inbox
- conversation view
- active identity context
- related listing/service/profile context
- report/block actions
- mobile-friendly layout

Important privacy decisions:

- private messages stay private
- AI does not read private messages during launch
- admin does not browse messages
- message content access only through case-based process

---

## Phase 9 — Energy and Payments

Energy and payments are launch-critical.

Build after main paid surfaces are clear.

Includes:

- Energy wallet
- Energy ledger
- Energy packages
- missing Energy calculation
- "Lisa puuduv Energy ja jätka"
- Stripe or trusted payment provider checkout
- webhook confirmation
- payment record
- receipt/invoice link
- Energy spending
- Energy reservation for moderated actions

Important decisions:

- Selqiro does not store card data
- payment provider webhook is source of truth
- Energy page uses packages
- paid action flow calculates missing Energy automatically
- Today’s Story reserves Energy until review decision
- full Merit integration can come later

---

## Phase 10 — Admin and Moderation

Build modular admin foundation.

Admin should be modular, not one giant page.

Launch admin modules:

- dashboard
- reports
- identities
- listings
- services
- Today's Story review
- Energy/payments visibility
- admin Energy adjustment
- audit log foundation

Important decisions:

- admin protects trust
- admin access is limited and logged
- private messages are not browsed
- AI can triage non-private cases
- sensitive decisions remain human-controlled
- multi-country admin support comes through modular queues and AI signals

---

## Phase 11 — Jobs foundation later

Jobs are not required for V2 Launch unless simple to add.

Initial Jobs model:

- business posts job opportunity
- no personal "looking for work" listings at start
- simple fields: title, location, description, optional salary, contact/apply action
- jobs become Brand Space module and My Area section later

Do not build full recruitment platform for launch.

---

## Phase 12 — Launch QA

Before public launch, test core flows.

Required checks:

- new user can browse without account
- account creation works
- identity switch works
- active identity is visible
- user can create listing
- user can browse listings
- listing detail works
- user can contact seller
- messages work
- service profile works
- quick update works
- Energy purchase works
- payment webhook works
- Energy ledger records transaction
- paid discovery works
- admin sees reports
- admin can review Today's Story
- mobile views are usable
- build passes
- no known critical issues

---

## What not to do during V2 build

Do not:

- rewrite everything at once
- start a new repository unless absolutely necessary
- break working old routes before V2 is ready
- mix public profile and My Area
- mix personal and business billing
- launch paid discovery without Energy ledger
- allow admin to casually read private messages
- overbuild future enterprise features before launch
- add complex features without documentation

---

## Development workflow

For every V2 module:

1. check current relevant code
2. create/modify small components
3. run build
4. test in browser
5. update docs if decision changes
6. commit
7. push

Recommended commit style:

- one logical change per commit
- clear commit message
- do not commit local backup files
- keep build green

---

## Final decision

Selqiro V2 will be built as a clean new V2 layer inside the existing repo.

The old working portal remains usable during development.

V2 replaces current views only after each part is tested.

This gives Selqiro the clean structure of a rebuild without the risk of losing the working foundation.
