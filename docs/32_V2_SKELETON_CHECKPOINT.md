# Selqiro V2 Skeleton Checkpoint

## Purpose

This document marks the completion of the first V2 skeleton phase.

V2 is now built as a clean layer inside the existing repository.

The old portal remains available while V2 routes are developed separately.

---

## V2 skeleton routes created

The following V2 routes exist:

- /v2
- /v2/products
- /v2/listing/[id]
- /v2/profile/[slug]
- /v2/my-area
- /v2/services
- /v2/energy
- /v2/admin

---

## V2 shell

Completed:

- V2 header
- V2 route area
- legacy header hidden on /v2 routes
- active identity visible
- messages button visible
- My Area button visible
- Log out button visible
- simple desktop navigation
- mobile refinement later

Decision:

The user's email does not need to be constantly visible in the header.

Active identity is more important.

---

## V2 homepage

Completed skeleton:

- Today's Story / main discovery
- start search direction
- Today to discover
- featured products
- featured services
- Daily Discovery placeholder

Decision:

Homepage should feel alive but not noisy.

No constantly moving auto-carousel.

---

## V2 Product Discovery

Completed skeleton:

- product discovery page
- compact search and filters in top section
- local-first logic
- featured products
- related highlighted services
- organic product results
- filter panel skeleton
- listing card skeleton

Key decisions:

- default visible sorting: Sinu lähedal
- location control: Asukoht: Paide
- related services strip appears only when services are relevant and highlighted
- paid visibility does not override relevance
- design refinement later

---

## V2 Listing Detail

Completed skeleton:

- listing detail route
- gallery placeholder
- price and approximate currency conversion placeholder
- location privacy wording
- seller profile card
- contact action
- save listing action
- description
- important details
- Show more opens full information
- related featured listings
- related services

Key decisions:

- private/simple seller location is approximate
- show wording such as "Paide piirkond" and "umbes 12 km sinust"
- exact private address is not shown by default
- business can show exact public address if chosen

---

## V2 Public Profile / Brand Space

Completed skeleton:

- public profile route
- cover image
- avatar/logo
- name
- description
- location/trust signals
- Kirjuta
- Jälgi
- Quick Update
- Product Showcase
- Listings
- Services
- right column with profile info, location and updates

Key decisions:

Desktop layout:

Left:
- Quick Update
- Product Showcase
- Listings
- Services

Right:
- profile information
- location
- latest updates

Public profile does not show owner-only improvement suggestions.

---

## V2 My Area

Completed skeleton:

- My Area route
- sidebar navigation
- overview
- active identity preview
- summary cards
- active quick update
- listings management preview
- services management preview
- product showcase management preview
- updates management preview
- public profile preview
- Energy card
- billing placeholder
- profile completeness card
- admin entry placeholder

Key decisions:

My Area is a private management workspace.

It should not look like the public profile page.

Active identity must be visually clear.

---

## V2 Services

Completed skeleton:

- services discovery route
- compact search
- featured services near user
- quick updates / temporary service locations
- organic services near user
- service cards
- service detail modal

Key decisions:

Services page order:

1. compact search
2. featured services
3. quick updates / temporary service locations
4. organic services

Search affects all areas.

Service price is optional.

Service card opens modal to keep context.

---

## V2 Energy

Completed skeleton:

- Energy wallet page
- balance
- package purchase skeleton
- missing Energy example
- reserved Energy example
- Energy history
- secure payment explanation
- billing/receipt placeholder
- Selqiro support corrections/prewards wording
- Welcome Energy concept

Key decisions:

- Energy page uses packages
- paid action flow calculates missing Energy
- payment provider checkout later
- Selqiro does not store card data
- webhook is source of truth later
- Welcome Energy can help new users try paid features
- Welcome Energy must be ledger-based

---

## V2 Admin

Completed skeleton:

- admin dashboard
- modular sidebar
- stats
- AI triage overview
- human review queue
- selected case detail
- case ownership concept
- original text and AI translation example
- AI Signals
- Energy/payment adjustment concept
- audit log preview

Key decisions:

- admin is modular
- admin is case-based
- admin is not for casual browsing
- private messages are not read by default
- AI does not read private messages at launch
- sensitive decisions remain human-controlled
- admin route must be permission-protected before launch

---

## Not connected yet

These V2 pages are skeletons.

They are not fully connected to real production data yet.

Not yet done:

- real Supabase data binding
- real product listing query
- real profile data
- real services data
- real Energy ledger
- real payment provider checkout
- real webhook
- real admin permissions
- real moderation queues
- real image handling
- final mobile design
- final visual polish
- accessibility pass
- full QA

---

## Next major choices

After this checkpoint, choose one of the following paths:

### Option A — Data connection phase

Start connecting V2 pages to real existing data.

Recommended order:

1. V2 shell identity data
2. Product Discovery data
3. Listing Detail data
4. Public Profile data
5. My Area data
6. Services data
7. Energy ledger/payment data
8. Admin data later

### Option B — Design refinement phase

Refine visual design before real data connection.

Focus:

- spacing
- card width
- mobile layout
- image ratios
- header polish
- buttons
- typography
- skeleton consistency

### Option C — Messaging visual refresh

Create V2 messaging visual refresh while reusing existing messaging logic.

---

## Recommendation

Do not add more large skeleton pages now.

The next best step is to verify the existing V2 skeleton routes and then start connecting data gradually.

Preferred next phase:

Data connection, starting with active identity and Product Discovery.

---

## Final checkpoint decision

The first V2 skeleton phase is complete.

All major V2 product areas now have a route and layout foundation.

Continue with small, testable steps.

---

## Post-checkpoint production direction

The first skeleton phase is complete.

Next work should not simply connect real data into skeleton components.

Before data connection, establish production architecture:

- clean module structure
- entity data access
- feature components
- small route files
- conservative launch rules

The skeleton validates product layout.

Production implementation must be cleaner and more maintainable.

---

## Quality before speed

Selqiro V2 should prioritize quality.

If a feature is risky or may reduce reliability, defer it.

The first public version should contain fewer but stronger features.

Advanced features can be added after the platform proves stable.
