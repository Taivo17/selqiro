# Admin and Moderation Flow

## Purpose

Admin and Moderation Flow describes the minimum launch admin system Selqiro needs to stay safe, trustworthy and manageable.

Admin is not the public product.

Admin is the control layer that helps protect:

- users
- sellers
- service providers
- businesses
- paid discovery
- trust
- privacy
- platform quality

Launch admin should be simple but reliable.

---

## Core principle

Admin tools should help solve real cases.

Admin should not become a place for casual browsing of user data.

Every sensitive admin action should be intentional, limited and logged.

---

## Launch admin must support

V2 Launch admin should support at least:

- report review
- block/report overview
- identity overview
- listing overview
- service overview if services are active
- Today's Story review
- discovery content review
- basic moderation actions
- basic Energy/payment visibility
- admin notes
- audit log foundation

Launch does not need a huge enterprise admin system.

But it must be safe and structured.

---

## Admin dashboard

Admin dashboard should show:

- open reports
- pending Today's Story reviews
- suspicious or flagged listings
- flagged identities
- recent moderation actions
- payment/Energy issues if any
- system health basics

The dashboard should help admin answer:

What needs attention today?

---

## Reports queue

Reports are user-submitted trust signals.

Report queue should show:

- report reason
- reporter identity
- reported identity
- related object
- object type
- created time
- status
- admin note
- action buttons

Object types may include:

- listing
- service
- profile
- message conversation
- Today's Story
- update
- future job

Report statuses:

- open
- reviewing
- actioned
- dismissed

Reports should not automatically punish users.

Reports create review signals.

---

## Listing moderation

Admin should be able to review listings.

Admin may need to:

- hide listing
- restore listing
- mark as needs correction
- view report history
- view seller identity
- view listing metadata
- add admin note

Possible listing issues:

- scam
- prohibited item
- misleading price
- wrong category
- stolen-looking image
- duplicate spam
- unsafe content
- missing important info

Launch moderation can stay simple.

---

## Service moderation

Admin should be able to review services.

Possible issues:

- misleading service claim
- illegal service
- wrong category
- fake business identity
- unsafe service
- spam
- adult or restricted service
- irrelevant promotion

Admin actions:

- hide service
- request correction
- restore service
- add note
- review reports

---

## Identity moderation

Admin should be able to review identities.

Identity overview may show:

- identity name
- owner account
- identity type
- created date
- listings count
- services count
- reports count
- status
- profile completeness
- verification state later

Admin actions may include:

- hide identity
- restore identity
- review reports
- mark as needs correction
- verify business later
- add admin note

Identity actions are serious because many objects may depend on one identity.

Use carefully.

---

## Today's Story review

Today's Story is high visibility and needs stronger moderation.

Admin review should show:

- advertiser identity
- billing identity if relevant
- story content
- image/video
- target country or worldwide
- planned date
- Energy requirement
- Energy reservation state
- AI moderation result later
- previous corrections
- admin decision

Possible decisions:

- approve
- request correction
- reject
- hold for review

If approved:
- story can become active at scheduled time
- reserved Energy becomes spent according to policy

If rejected:
- Energy is released or refunded according to policy
- business may be allowed to correct content

Today's Story cannot be published only because it was paid.

Trust comes first.

---

## Discovery review

Discovery content includes:

- featured listings
- featured services
- featured products
- Today's Discoveries
- future Daily Discovery

Paid discovery must remain contextual.

Admin should be able to review cases where paid discovery appears irrelevant, misleading or against policy.

---

## Quick Update and temporary location review

Admin should be able to review Quick Updates and temporary service locations if reported or suspicious.

Possible issues:

- fake temporary location
- misleading availability
- spammy updates
- unrelated promotional content
- repeated location abuse

Admin actions:

- hide update
- remove temporary location
- warn provider later
- reduce visibility later
- add note
- review history

Launch does not require complex live tracking.

But update history should be available.

---

## Message privacy in admin

Admin should not casually read private messages.

Admin can see message metadata such as:

- conversation id
- participants
- related listing or service
- report status
- block status
- last activity

Message content is hidden by default.

Message content can be reviewed only through a case:

- reported conversation
- support request
- fraud case
- safety concern
- valid legal request

All message content access must be logged.

AI does not read private messages during Launch.

---

## Case-based message access

If a conversation is reported, admin may review relevant message content for that case.

The case should record:

- reason
- reporter
- reported identity
- conversation id
- related object
- admin user
- time of access
- action taken
- final decision if available

This protects privacy and allows safety work.

---

## Energy and payment visibility

Admin needs visibility into Energy and payments for support.

Admin may see:

- payment records
- payment status
- Energy purchases
- Energy spends
- wallet balance
- related billing entity
- related paid feature
- failed payments
- refunds or adjustments

Admin should not edit balances directly.

Any correction must create an Energy adjustment transaction.

---

## Manual Energy adjustments

Admin may need to adjust Energy for support reasons.

Examples:

- correction
- failed paid action
- goodwill
- moderation refund
- test account cleanup
- fraud reversal

Every adjustment must include:

- admin user
- wallet
- amount
- reason
- reference case
- timestamp

Never silently edit balance.

---

## Audit log

Admin actions must be logged.

Audit log should include:

- admin user
- action
- target type
- target id
- reason
- metadata
- timestamp

Important logged actions:

- hide listing
- restore listing
- hide service
- restore service
- hide identity
- approve Today's Story
- reject Today's Story
- request correction
- view private message content through case
- Energy adjustment
- dismiss report
- action report

Audit log is essential when Selqiro grows.

---

## Roles and permissions

Launch can start simple with admin role.

Architecture should support future roles:

- super admin
- admin
- moderator
- support
- finance
- developer

Not all staff should see everything.

Examples:

- support can see cases, but not financial tools unless needed
- finance can see payments, but not private messages
- developer does not automatically see private user data
- moderator can review content but not billing

Permissions should become more specific as team grows.

---

## Admin notes

Admin notes help future review.

Notes may be added to:

- report
- identity
- listing
- service
- Today's Story
- payment case
- support case

Notes should be internal only.

Do not show admin notes publicly.

---

## Correction-first approach

When possible, Selqiro should allow correction.

Example:

Today's Story contains unsupported claim.

Instead of permanent rejection, admin may request correction.

User sees:

Please update this part before publication.

This is better than silent rejection.

But serious violations may be rejected immediately.

---

## User-facing fairness

If content is hidden, rejected or held, user should receive a clear reason when possible.

Avoid vague messages.

Good:

Your Today's Story cannot be published because political campaign content is not allowed.

Please replace it with a product, service, event, job or business-related story.

This helps users understand rules.

---

## Launch admin scope

V2 Launch admin should include:

- admin dashboard
- reports queue
- identity overview
- listing overview
- service overview
- Today's Story review foundation
- Energy/payment visibility foundation
- audit log foundation
- message privacy case concept

V2 Launch does not need:

- full staff permission system
- full legal workflow
- full fraud engine
- full appeal system
- complete reputation system
- automated AI moderation if not ready

But architecture must not block these later.

---

## What admin should feel like

Admin should feel:

- calm
- structured
- case-based
- privacy-respecting
- not overloaded
- trustworthy

Admin should help Selqiro protect users without becoming invasive.

---

## Final rule

Admin exists to protect trust.

Admin access must be limited, justified and logged.

---

## Admin Energy adjustment tool

Admin must have a tool to adjust Energy when needed.

Use cases:

- correction
- support case
- failed paid feature
- goodwill
- reward
- Country Pioneer
- beta tester
- fraud reversal

The admin tool should not directly edit a balance.

It should create an Energy transaction.

Admin form should require:

- target wallet
- affected identity if relevant
- amount
- adjustment type
- reason
- internal note
- support case reference if available

The system should show:

- current balance
- adjustment amount
- resulting balance
- warning for large adjustments

All adjustments must be audit logged.

---

## Admin Energy grant UX

Admin can add Energy to a user or business, but technically it is added to the selected wallet.

The UI should help admin choose correctly:

- personal wallet
- business wallet
- identity-related wallet

Example:

User:
Taivo

Identity:
Milline Vedu

Wallet:
Milline Vedu OÜ business wallet

Admin should clearly see where Energy will be added before confirming.

---

## Large adjustment review later

Future option:

Large Energy grants or deductions may require second admin approval.

Launch does not require this if the team is small.

Architecture should not block it.

---

## Modular admin decision

Admin should be built as modular blocks.

Do not create one giant admin page.

Admin should have a shared shell and separate modules.

Examples:

- Reports
- Identities
- Listings
- Services
- Today's Story
- Discovery
- Energy
- Payments
- Audit Log
- Jobs later
- Knowledge later
- Live Services later

Each module should have:

- overview
- list or queue
- detail view
- actions
- admin notes
- audit history
- permissions later
- related objects

When Selqiro adds a new feature, it should add an admin module if admin support is needed.

This allows Selqiro to grow without rebuilding admin from scratch.

---

## Admin dashboard blocks

Admin dashboard should use blocks.

Possible blocks:

- Open reports
- Today's Story waiting review
- Flagged listings
- Flagged services
- Energy / payment issues
- Recent admin actions
- Support cases later

New features may add dashboard blocks later.

Dashboard should answer:

What needs attention today?

It should not show every possible admin tool at once.

---

## Admin dashboard visual direction

The admin dashboard visual direction is accepted as a modular overview.

The dashboard should prioritize:

- what needs attention today
- AI escalations
- open reports
- Today's Story reviews
- support cases
- payment or Energy issues
- system alerts
- recent admin actions
- audit log summary

The dashboard should not show every possible admin tool at once.

It should guide admin to the highest priority cases.

---

## AI first-pass review

Admin UX should support AI first-pass review.

AI can help sort issues before they reach human admin.

Examples:

- safe content can be approved or routed automatically when policy allows
- common support questions can receive AI-guided answers
- suspicious or unclear content goes to human review
- repeated product issues become AI Signals

Human admin should see why AI escalated something.

Admin should not need to guess.

---

## AI escalation queue

The admin dashboard can include an AI escalation queue.

Examples:

- Today's Story flagged by AI
- listing possible scam
- service profile unclear claim
- support case AI could not resolve
- payment dispute needs human review

Each escalation should include:

- risk level
- reason
- affected user/identity
- related object
- time
- action button

---

## Multi-country admin view

As Selqiro grows, admin dashboard should support country-level operations.

Admin should be able to see:

- open cases by country
- AI-handled percentage
- human review queue
- country-specific workload
- language-related issues
- localized support pressure

This is important for global scaling.

---

## Recurring issue detection

Admin should not learn about every product problem manually.

If several users report or experience the same problem, AI should detect the pattern and notify admin.

Examples:

- payment checkout error
- image upload timeout
- translation issue
- broken form
- repeated confusion in Energy purchase flow

This turns support messages into product improvement signals.

---

## Multilingual admin UX

Admin case detail should support multilingual work.

For non-private content, show:

- original text
- AI translation
- AI summary
- detected language
- risk level
- recommended action

Original text must remain visible.

AI translation is only a working aid.

Private message content is not translated or analyzed by AI during V2 Launch.

---

## Admin reply translation UX

Admin can write a reply in their working language.

If the user uses another language, Selqiro can translate the reply.

Before sending, admin should see:

- original admin text
- translated user-facing text
- target language
- edit option

User receives the translated reply.

System stores both original and translated versions.

---

## Case ownership UX

Admin cases should support ownership and locking.

User flow:

1. Case appears in queue.
2. Admin clicks "Take case".
3. Case is assigned and locked.
4. Other admins see that someone is handling it.
5. Admin resolves, dismisses, escalates or reassigns.

This prevents two admins from working on the same case at the same time.

---

## AI Signals UX

Admin dashboard should later include AI Signals.

AI Signals group repeated problems.

Examples:

- payment checkout failing for many users
- image upload timeout
- translation issue in Japanese UI
- users abandoning Energy purchase at same step

AI Signals should show:

- issue summary
- affected feature
- number of users
- severity
- trend
- suggested action
- related cases

This helps admin see product problems, not only individual complaints.
