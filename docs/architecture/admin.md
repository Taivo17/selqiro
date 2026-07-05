# Admin Architecture

## Purpose

Admin Architecture defines how Selqiro admin tools should be structured so the platform can grow without rebuilding the admin system every time a new feature is added.

Admin must protect trust, support operations and help solve cases.

Admin should not become a giant unstructured page.

---

## Core principle

Admin should be modular.

Each major product feature can have its own admin module.

Admin shell stays the same.

New features add new modules.

Do not rebuild the whole admin system when adding new product areas.

---

## Admin shell

The admin shell is the common admin foundation.

It may include:

- admin navigation
- permissions
- search
- active admin user
- dashboard
- audit log access
- case overview
- system status
- module registry

The shell does not contain all business logic.

It hosts admin modules.

---

## Admin modules

Each admin module should manage one area.

Examples:

- Reports
- Identities
- Listings
- Services
- Today's Story
- Discovery
- Energy
- Payments
- Quick Updates
- Live Services later
- Jobs later
- Knowledge later
- Brand Space later
- Users / Accounts
- Audit Log
- Support Cases

Each module should be independently understandable.

---

## Module structure

A good admin module has a consistent structure.

Recommended module parts:

1. Overview card
2. List or queue
3. Filters
4. Detail view
5. Actions
6. Admin notes
7. Audit history
8. Permissions
9. Related objects

Example:

Reports module:
- report queue
- report detail
- related listing/service/message
- reporter
- reported identity
- actions
- notes
- audit log

Today's Story module:
- review queue
- story detail
- advertiser identity
- scheduled date
- Energy reservation
- approve / reject / request correction
- moderation history
- audit log

---

## Dashboard

Admin dashboard should not show everything.

It should show what needs attention now.

Possible dashboard blocks:

- open reports
- pending Today's Story reviews
- flagged listings
- flagged services
- payment / Energy issues
- recent admin actions
- urgent support cases
- suspicious patterns later

Dashboard blocks should be modular.

When a new feature is added, it can add a dashboard block if needed.

---

## Case-based admin

Admin should be case-based.

Admin should help solve specific cases.

Examples:

- report case
- support case
- fraud case
- payment case
- moderation case
- legal case

Sensitive data access should happen through cases, not casual browsing.

This is especially important for private messages.

---

## Private message access

Private message content must not be visible in normal admin modules.

Message content can be accessed only through a specific case.

Examples:

- reported conversation
- support request
- fraud investigation
- safety issue
- valid legal request

Every access must be logged.

This belongs to privacy-first admin architecture.

---

## Permissions

Admin modules should support permissions.

Not every admin user should access every tool.

Future permission examples:

- view reports
- resolve reports
- view payments
- adjust Energy
- review Today's Story
- view identities
- hide listings
- access message case content
- export accounting data
- manage admin users

Launch can start simple.

Architecture should not block granular permissions later.

---

## Audit log

All important admin actions must be audit logged.

Examples:

- approve Today's Story
- reject Today's Story
- hide listing
- restore listing
- hide service
- restore service
- hide identity
- Energy adjustment
- payment refund action
- report dismissal
- message content access through case
- role/permission change later

Audit log should be shared infrastructure used by all admin modules.

---

## Related objects

Admin modules should show related objects.

Example:

Report about listing:
- report
- listing
- seller identity
- reporter
- conversation if relevant
- previous reports
- admin notes

Energy issue:
- wallet
- billing entity
- payment
- transaction
- identity
- user
- related paid action

Admin should not need to search manually across many places.

---

## Adding new features

When adding a new Selqiro feature, ask:

Does this feature need admin support?

If yes, create:

- admin overview block if needed
- admin module
- list/queue view
- detail view
- actions
- permissions
- audit log entries
- related object links

This keeps admin growth controlled.

---

## Launch admin scope

V2 Launch admin should include only essential modules:

- Dashboard
- Reports
- Identities
- Listings
- Services
- Today's Story review foundation
- Energy / Payments visibility foundation
- Audit Log foundation

Other modules can be added later.

---

## Future admin modules

Future modules may include:

- Jobs
- Knowledge Gateway
- Live Services
- Brand verification
- Accounting exports
- Country Pioneer review
- Discovery analytics
- Fraud scoring
- Appeals
- Staff roles
- Legal requests

These should plug into the admin shell.

---

## What admin should feel like

Admin should feel:

- calm
- structured
- modular
- case-based
- privacy-respecting
- expandable

Admin should not feel like a messy backdoor into all user data.

---

## Final rule

Admin is a modular trust and operations system.

Every new Selqiro feature should add admin capability through a module, not by making one giant admin page larger.
