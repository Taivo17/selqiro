# Energy Architecture

## Purpose

Energy is Selqiro's internal economy for optional value-added capabilities.

Energy should never be required for basic participation.

Users should be able to:
- browse
- sell
- buy
- create listings
- create services
- message
- participate in the community

without needing Energy for normal use.

Energy is used when the user wants extra capability.

Examples:
- AI assistance
- image analysis
- translations
- category suggestions
- Knowledge Gateway queries later
- VIN lookup later
- compatibility search later
- Today's Story reservation
- Discovery visibility
- automation later

---

## Naming

Internal architecture name:

Energy

User-facing name at launch:

Energy Credits

Reason:

"Energy" is the long-term concept.
"Energy Credits" is easier for new users to understand.

Later, the UI can shorten the name to Energy if users understand the concept.

---

## Core principle

Selqiro does not sell permission to participate.

Selqiro sells optional capability.

The user should feel:

I can use Selqiro freely.
If I want more power, speed, visibility or knowledge, I can use Energy.

Not:

I must pay before Selqiro becomes useful.

---

## Core model

Energy should not belong directly only to the login account.

Energy should belong to a wallet.

Wallet belongs to a billing entity.

User acts through an identity.

Recommended model:

Account = who logs in
Identity = who acts publicly
Billing Entity = who pays
Energy Wallet = spendable Energy balance
Energy Transaction = audit trail

Practical rule:

Energy belongs to wallet.
Wallet belongs to billing entity.
Identity uses wallet.
User acts through identity.

---

## Account

Account is private login ownership.

Account may contain:
- email
- authentication
- security
- owned identities
- admin role if any

Account should not be the only place where Energy belongs.

Reason:

A single account may control both personal and business identities.

---

## Identity

Identity is the public actor.

Examples:
- personal identity
- business identity
- service provider identity
- brand identity later

Identity uses a wallet depending on its billing setup.

A business identity should usually use a business wallet.

A personal identity should usually use a personal wallet.

---

## Billing Entity

Billing Entity represents who is financially responsible.

Types may include:
- personal
- business
- organization later

Future fields may include:
- name
- country
- registration number
- VAT number
- billing email
- billing address
- accounting provider
- invoice settings

Business invoices must be tied to business billing entity, not just login account.

---

## Energy Wallet

Energy Wallet holds balance.

A billing entity has one or more wallets if needed.

Launch target:

- personal account gets personal wallet
- business identity gets business wallet
- Energy usage is attributed to active identity

This supports:
- private users
- companies
- multiple identities
- future staff managing company accounts
- accounting
- admin auditing

---

## Energy Transactions

Every Energy movement must be recorded.

Energy balance should never be changed without a transaction.

Transaction types may include:
- purchase
- spend
- refund
- recognition
- adjustment
- expiration later
- correction

Each transaction should store:
- wallet id
- billing entity id
- actor user id
- identity id if relevant
- amount
- balance after
- reference type
- reference id
- description
- created at

This must be as reliable as a bank statement.

---

## Purchase flow

Energy purchase must not interrupt user flow.

Example:

User wants to reserve Today's Story.

Energy required:
900

Wallet balance:
620

Missing:
280

Selqiro should show:

You need 280 more Energy Credits.

Add Energy and continue.

After payment:
- Energy is added
- user returns to the same reservation
- reservation flow continues

The user should not need to start again.

---

## Payments

Selqiro should not store card data.

Payments should be handled by trusted payment provider.

Architecture should support:
- card payments
- Apple Pay
- Google Pay
- bank payment methods where available
- invoices or receipts
- webhooks
- refunds

Payment provider details belong to payment module, not marketplace module.

---

## Accounting

Businesses need accounting documents.

Selqiro should support:
- invoice or receipt download
- payment history
- Energy purchase history
- Energy usage history
- CSV export
- future accounting integrations

Launch target:
- payment provider invoices/receipts
- Selqiro Energy ledger
- manual or export-based accounting

Future:
- Merit integration
- other accounting providers
- structured e-invoice where needed

Do not build full accounting engine inside Selqiro.

Selqiro should integrate with accounting systems.

---

## Personal vs business use

Personal user:

- simple payment history
- receipt may be enough
- no complex accounting fields required

Business user:

- billing entity required
- invoice details required
- company name
- registration number
- VAT number when applicable
- billing address
- accounting export later

Do not mix personal and business Energy spending.

---

## Staff and delegated access

Future business accounts may allow several people to manage one business identity.

Example:

Owner:
Taivo

Manager:
Mari

Active identity:
Milline Vedu

Wallet:
Milline Vedu business wallet

Actor:
Mari

Billing:
Milline Vedu business billing entity

Audit log should show:

Mari used Milline Vedu wallet for Today's Story reservation.

This is why Energy cannot belong only to the login user.

---

## Recognition Energy

Energy can be granted for positive community contribution.

Examples:
- Country Pioneer
- invited user becomes active community member
- beta testing
- useful knowledge contribution
- helping with translations

Energy should not be granted for negative or easily abused actions.

Do not reward reporting with Energy.

Reason:

Rewarding reports may create bad incentives.

Energy recognition should feel like thanks, not like payment for behavior.

---

## Active invited user

If Energy is granted for inviting a user, it should not be granted immediately on registration.

It should be granted only when the invited person becomes a real community member.

The exact activity formula should not be public.

It may consider:
- returning on different days
- creating identity
- adding useful content
- browsing or messaging
- real activity signals

User-facing message should remain positive:

Your invitation helped Selqiro community grow. Thank you. Energy Credits were added.

Avoid promises that create disappointment.

---

## Country Pioneer

Country Pioneer should reward the first real community member from a new country.

Do not base this only on manually selected profile country.

Reason:

Users could fake country selection.

Country Pioneer should be based on trustworthy signals.

Exact method can be designed later.

Principle:

Pioneer should mean real new community beginning.

---

## Energy inflation

Energy must not become inflationary.

Energy recognition should be rare and meaningful.

Most Energy should come from purchases or packages.

Recognition Energy should support community feeling, not create a game that can be exploited.

---

## Energy Packages

Premium and Business should no longer be treated as account privilege levels.

They can become Energy package names or subscription tiers.

Possible package logic:
- Starter
- Professional
- Business
- Enterprise

Packages provide more Energy or better unit price.

They should not lock normal marketplace participation.

---

## Spending Energy

Energy spending should be transparent before action.

Before consuming Energy, user should see:

- what action will happen
- Energy cost
- current balance
- confirmation if cost is meaningful

For small actions, flow can be light.

For large actions such as Today's Story, confirmation must be clear.

---

## Refunds

Refunds must be handled through Energy Transactions.

Examples:
- failed AI request
- canceled reservation inside allowed window
- admin correction
- payment refund

Refund should create a new transaction.

Never silently edit old balance.

---

## Admin adjustments

Admins may need to adjust Energy.

Examples:
- support case
- correction
- goodwill
- fraud reversal
- test account

Every admin adjustment must be audit logged.

Fields should include:
- admin user
- reason
- amount
- affected wallet
- related case if any

---

## Energy and Today's Story

Today's Story reservation may require significant Energy.

If balance is insufficient, user can add Energy without losing reservation context.

Today's Story should not start unless Energy is successfully reserved or spent according to final booking rules.

The exact reservation/cancellation policy belongs to Discovery Architecture.

---

## Energy and Knowledge Gateway

Knowledge Gateway may later consume Energy.

Important rule:

User pays for value delivered, not for raw provider cost.

Selqiro may query:
- one provider
- multiple providers
- AI model
- cache
- validation system

User sees one Energy cost.

Selqiro must price this so:
- provider cost is covered
- infrastructure cost is covered
- AI cost is covered
- Selqiro earns reasonable margin

Knowledge must prioritize trust over lowest cost.

---

## Energy and AI

AI use can consume Energy when it creates real value.

Examples:
- listing improvement
- translation
- image analysis
- Knowledge query
- automation

AI should not burn Energy silently.

For user-facing paid AI actions, cost should be clear.

---

## Energy and participation

Normal participation should stay free as much as possible.

Energy should not be required for:
- browsing
- basic search
- normal listings within reasonable platform limits
- normal messaging
- joining nearby services
- creating community value

If usage becomes extremely high, limits should be configurable, not hardcoded.

---

## Configurable limits

Listing limits or free usage thresholds should be configurable.

Do not hardcode business rules.

Example:

free_active_listing_limit = configurable

This allows Selqiro to start generous and adjust later based on real usage.

---

## Trust and abuse prevention

Energy system must prevent abuse.

Risk areas:
- fake invited users
- fake country pioneers
- repeated refunds
- stolen cards
- automated AI abuse
- mass account creation
- business wallet misuse

Mitigation should include:
- activity scoring
- fraud detection
- admin review
- payment provider risk tools
- internal audit trail

---

## User interface principles

Energy should feel like capability.

Not punishment.

UI should say:

Use Energy Credits to make this faster / smarter / more visible.

Not:

Pay or you cannot continue.

---

## Final rule

Energy is Selqiro's capability economy.

It should increase what users can achieve without restricting their ability to participate.
