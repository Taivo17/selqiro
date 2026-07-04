# Selqiro V2 Scope

## Purpose

This document defines what belongs to Selqiro V2 Launch and what stays for later phases.

Selqiro's long-term vision is:

Marketplace + Nearby Services + Discovery + AI Gateway + Knowledge Platform + Energy Economy.

Launch must stay simple, useful and reliable.

---

## V2 Launch must include

### 1. Marketplace

Users can:
- browse products
- search products
- view product details
- contact sellers
- create listings
- manage listings

Marketplace must be clean, local-first and easy to use.

---

### 2. Nearby Services

Users can:
- discover services near them
- browse service providers
- view business/service profiles
- contact service providers

Nearby Services should be free to join because network growth is more important than early restriction.

---

### 3. Identity system

Users can:
- use one account
- manage multiple identities
- switch active identity
- act as personal seller or business identity

Active identity must always be visible in the UI.

---

### 4. Messaging

Users can:
- contact sellers
- contact service providers
- continue conversations from their inbox

Messaging must respect identity and block logic.

---

### 5. Discovery foundation

Launch includes:
- homepage discovery
- Today's Story concept
- featured products/services section
- non-intrusive discovery areas

Discovery should invite curiosity, not interrupt users.

---

### 6. AI Portal Assistant

Launch AI helps users use Selqiro.

It can help with:
- listing creation
- category suggestions
- basic text improvement
- explaining how the portal works

Launch AI does not yet require professional external databases.

AI should be quiet by default and user-invited.

---

### 7. Energy foundation

Launch should support the future Energy economy.

Energy is used for optional value-added features.

Energy is not required for normal participation.

Marketplace participation should remain free as much as possible.

---

### 8. Admin and moderation

Launch must include:
- admin dashboard
- reports
- identities overview
- moderation foundations
- block/report handling

Admin must support future staff roles.

---

## V2 Launch should not require

### 1. Professional Knowledge Gateway

Professional databases, OEM data, VIN lookup, repair manuals and paid knowledge providers are not required for Launch.

Architecture must be ready for them later.

---

### 2. Full payment automation

Stripe and Energy purchase flow can be added after core V2 is stable.

Launch architecture must not block payments later.

---

### 3. Full accounting integration

Merit integration is not required for Launch.

Future target:
- Stripe invoices first
- Energy ledger
- Merit export or integration later

---

### 4. Full global partner network

Manufacturer and data-provider partnerships come after the portal has users and value to show.

---

### 5. Advanced trust/reputation system

Launch should include report/block/admin safety.

Advanced reputation, ratings and verified business layers can come later.

---

## Architecture must support later

- Energy ledger
- Stripe payments
- accounting exports
- Knowledge Gateway
- professional data providers
- Brand Space
- jobs
- Daily Discovery
- Country Pioneer
- Spotlight / Today's Story reservations
- global country support
- currency conversion
- translations
- mobile app

---

## Key Launch Principle

Do not overload Launch.

Launch must prove that Selqiro is useful.

The first version should make users feel:

"I can find products near me."

"I can find services near me."

"I can sell or offer something easily."

"This place feels useful and alive."

Everything else grows from that.

---

## Future webshop / commerce

Selqiro V2 Launch does not include a full webshop.

No launch requirement for:

- cart
- checkout
- inventory
- shipping
- returns
- order management
- automated tax handling for webshop orders

However, architecture should remain commerce-ready.

Brand Space, Energy, payments, accounting and product listings should be designed so that future commerce modules can be added without rebuilding the platform.

Decision:

Commerce-ready, not webshop-first.

## Energy architecture decision

Energy must support future business billing and accounting.

V2 should not hardcode Energy directly to only user account or only identity.

Architecture target:
- billing entity
- wallet
- transaction ledger
- actor user
- active identity attribution

Launch may implement a simple version, but it should not block future business wallets, invoices, staff access or accounting integration.

## Discovery scope decision

V2 Launch should include discovery foundation.

Launch should support:
- homepage discovery
- Today's Story concept
- featured products/services areas
- non-intrusive discovery surfaces
- fallback curated content when no paid discovery exists

Full paid reservation engine, dynamic pricing, advanced analytics and accounting automation can come later.

Architecture should not block them.

## Moderation scope decision

V2 Launch must include moderation foundations.

Launch should support:
- reports
- block
- admin review basics
- identity overview
- report status handling
- Today's Story content policy foundation

Advanced systems can come later:
- appeals
- full reputation
- fraud scoring
- automated trust engine
- detailed staff permissions
- AI moderation automation

Trust must be protected from the beginning.

## Payments and accounting scope decision

V2 Launch does not require full payment and accounting automation.

Architecture must support:
- billing entities
- Energy wallets
- Energy transactions
- future Stripe integration
- future invoice/receipt downloads
- future accounting exports
- future Merit integration

Launch should not be delayed by full accounting automation.

Payments and accounting should be integrated after the core V2 experience is stable, unless Energy purchases become required earlier.

## Trust scope decision

V2 Launch must include basic trust foundations.

Launch should support:
- clear public identity
- report and block
- admin moderation basics
- active identity visibility
- complete profile signals
- safe messaging context

Launch should not require:
- full reviews
- public star ratings
- full reputation score
- advanced fraud engine
- external registry verification

Trust should start quietly and grow with real platform usage.

---

## Launch scope correction: Energy and payments

Earlier scope treated full payment automation as something that could come after core V2.

Updated decision:

Energy and payment core must be available for V2 Launch.

Reason:

Selqiro revenue depends on optional value-added capabilities from the beginning.

Launch should support paid use of:

- Today's Story
- featured discovery
- service highlighting
- temporary service location paid access
- future Energy-based AI actions
- future Knowledge Gateway actions

Launch must include:

- Energy wallet foundation
- Energy transaction ledger
- Energy purchase flow
- payment provider integration
- payment success webhook
- Energy balance update after successful payment
- Energy spending for launch-paid features
- basic payment history
- receipt or invoice link from payment provider
- admin visibility into payments and Energy transactions

Launch does not need:

- full Merit integration
- full accounting automation
- all-country e-invoice support
- complex subscription system
- advanced tax automation in every market

Decision:

Energy and payments are Launch-critical.

Full accounting integrations can come later.

---

## Jobs scope decision

Jobs are not required for V2 Launch unless implementation is simple.

Architecture should support jobs later.

Initial Jobs model:

- employer-side job postings
- business identity publishes job
- no personal "looking for work" listings initially
- simple job detail
- contact or apply action

Future:

- job alerts near me
- featured jobs
- simple applications
- applicants management
- AI-assisted job writing

Do not build a full recruitment platform for launch.

## Energy purchase UX decision

V2 Launch Energy system should support:

- package purchase from Energy page
- missing Energy purchase inside paid action flow

Paid action flow should calculate missing Energy automatically.

Example:

Required Energy
Current balance
Missing Energy
Add missing Energy and continue

This is required for Today's Story, featured discovery, service highlighting and temporary service location paid access.
