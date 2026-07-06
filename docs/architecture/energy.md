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

---

## Energy and temporary service locations

Temporary service locations can use Energy when they create extra business value.

Launch principle:

- one temporary service location per day can be free
- additional temporary service locations require Energy
- highlighted temporary service location requires Energy or active service highlighting

Reason:

Temporary location can create real local visibility.

If used heavily as a business tool, it should consume Energy.

This prevents abuse and creates a fair value-based revenue model.

---

## Energy and service highlighting duration

Service highlighting can use duration-based Energy pricing.

Recommended principle:

- 1 day highlight has highest cost per day
- 14 day highlight has lower cost per day
- 30 day highlight has best cost per day

Reason:

Longer highlighting is more predictable and valuable for serious service providers.

Short-term highlighting remains available but costs more per day.

This encourages stable participation and reduces constant short-term manipulation.


---

## Updated Energy model for temporary service locations

Temporary service location Energy use should be duration-based.

Launch principle:

- one free temporary service location update per day
- 1 day paid access
- 14 day paid access
- 30 day paid access

The longer period should have a lower cost per day.

The 30 day option should be the most cost-effective.

This fits service providers who use temporary location as a real business tool.

Examples:
- tow truck
- mobile repair
- plumber
- mobile seasonal seller
- future live service providers

Important rule:

Paid access allows the provider to update one active temporary service location, not to be visible in many cities at the same time.

When location is updated, the previous active location is replaced.

This keeps the system useful and prevents abuse.

---

## Temporary location vs highlighting

Temporary location access and service highlighting are separate Energy concepts.

Temporary location access:
- allows current service location updates

Service highlighting:
- increases visibility in relevant discovery surfaces

Together:
- current location + highlighted service can create stronger local visibility

This creates value without turning location updates into random advertising.

---

## Launch-critical Energy decision

Energy foundation must be available for V2 Launch.

Reason:

Selqiro's first revenue features depend on Energy.

Launch-paid features may include:

- Today's Story
- featured discovery
- service highlighting
- paid temporary service location access
- future AI actions
- future Knowledge Gateway actions

Minimum Launch Energy system:

- wallet
- balance
- transaction ledger
- purchase transaction
- spend transaction
- refund/adjustment foundation
- billing entity connection
- actor user tracking
- active identity attribution
- admin visibility

Important rule:

Do not launch paid discovery without a reliable Energy ledger.

Energy balance must never be changed silently.

Every movement must create a transaction.

---

## Launch Energy purchase flow

Launch must allow users and businesses to buy Energy.

Minimum flow:

User starts paid action.
Selqiro checks wallet balance.
If balance is insufficient, user can add Energy.
Payment provider processes payment.
Webhook confirms payment success.
Selqiro adds Energy to wallet.
User returns to the same action.
User can complete the paid action.

The user should not lose context during payment.

Example:

Business wants Today's Story.
Energy required: 900.
Wallet balance: 620.
Missing: 280.

Selqiro shows:
Add Energy and continue.

After payment:
Energy is added.
Today's Story reservation flow continues.

---

## Launch Energy spending

Launch spending must support at least:

- Today's Story reservation
- featured discovery or service highlighting
- paid temporary service location access if available

Spending creates Energy transaction.

Transaction must store:

- wallet
- billing entity
- actor user
- active identity
- amount
- balance after
- reference type
- reference id
- description
- timestamp

This is required for support, trust and accounting.

---

## Energy and future live services

Future Live Services can use Energy through active mobile unit packages.

Possible package dimensions:

- number of active mobile units
- duration
- highlighting status

Examples:

- 1 active unit for 1 day
- 5 active units for 14 days
- 10 active units for 30 days

Longer duration should be cheaper per day.

Temporary location and highlighting remain separate:

Temporary location:
where the service is currently available

Highlighting:
how much extra discovery visibility it receives

This keeps pricing understandable and useful.

---

## Missing Energy purchase decision

Energy purchase has two modes.

Energy page:
Users buy Energy packages.

Paid action flow:
Selqiro calculates missing Energy automatically.

Example:

Required Energy:
5000

Current balance:
1200

Missing:
3800

User sees:

Add missing Energy and continue.

This is clearer than "custom amount".

The user should not need to calculate the required amount manually.

---

## Larger package option

When missing Energy is shown, Selqiro may also offer a larger Energy package.

Example:

Missing:
330 Energy

Options:
- Add exactly 330 Energy and continue
- Buy 500 Energy with better unit price

This gives the business flexibility.

Exact missing Energy is best for completing the current action.

Larger package is useful when the business plans more activity.

---

## Minimum Energy purchase

Selqiro may define a configurable minimum Energy purchase amount.

Reason:

Very small payments are inefficient.

If missing Energy is below minimum purchase threshold, the system can offer the minimum package.

This threshold must be configurable, not hardcoded.

---

## Reserve before moderation

If a paid action requires moderation, Energy should be reserved before final spending.

Examples:

- Today's Story
- high-visibility campaign
- moderated discovery content

If content is approved:
reserved Energy becomes spent.

If content is rejected:
Energy is released or refunded according to policy.

This protects both Selqiro and the business.

---

## Locked launch Energy payment UX

Energy Payment Flow is accepted for V2 Launch.

Locked decisions:

- Energy page uses packages.
- Paid action flow calculates missing Energy automatically.
- Main action text should be "Add missing Energy and continue" / "Lisa puuduv Energy ja jätka".
- Payment button should communicate secure provider flow.
- Use "Jätka turvalisse maksesse" in Estonian UI.
- Selqiro does not store card data.
- Payment provider webhook is source of truth.
- User must return to the same paid action after successful payment.
- If action requires moderation, Energy is reserved until review decision.
- If action activates immediately, Energy can be spent immediately.

Refund wording should stay fair:

If Energy has already been used for an active service, refund may not always be possible.

Avoid absolute wording unless policy is legally finalized.

---

## Admin Energy grants and adjustments

Admins must be able to add or remove Energy when needed.

Use cases:

- technical error correction
- failed paid action
- goodwill compensation
- reward / recognition
- Country Pioneer reward
- beta tester reward
- manual correction
- fraud reversal
- support case resolution

Important rule:

Admin must never edit wallet balance directly.

Every admin Energy change must create an Energy transaction.

---

## Admin adjustment transaction

Admin adjustment must include:

- wallet id
- billing entity id
- affected identity if relevant
- affected account if relevant
- admin user id
- amount
- transaction type
- balance after
- reason
- admin note
- related support case if available
- timestamp

Possible transaction types:

- admin_grant
- admin_deduction
- correction
- goodwill
- recognition
- fraud_reversal
- support_adjustment

This keeps the Energy ledger trustworthy.

---

## Positive Energy grants

Admins may grant Energy for positive reasons.

Examples:

- user helped test Selqiro
- first real user from a new country
- community growth reward
- correction after technical problem
- support goodwill

Energy grants should be rare and meaningful.

Do not create inflation by granting Energy too casually.

---

## Admin deduction

Admins may need to remove Energy in rare cases.

Examples:

- fraud
- payment reversal
- duplicated grant
- technical correction
- abuse

Admin deduction must be logged with clear reason.

If deduction affects business billing, the case should be documented carefully.

---

## Permissions

Energy adjustments are sensitive.

Not every admin should have permission to adjust Energy.

Future permission examples:

- view Energy ledger
- grant Energy
- deduct Energy
- approve large adjustment
- view billing entity
- export Energy history

Large adjustments may later require second approval.

Launch can start simpler, but architecture must support permission control.

---

## User-facing history

If Energy is added or removed by admin, the user should be able to see it in Energy history.

Example:

Energy added by Selqiro support
Reason: technical correction

Or:

Energy added
Reason: Country Pioneer recognition

Do not expose private admin notes to the user.

Public/user-facing explanation can be simpler than internal admin note.

---

## Final rule

Admin Energy changes are allowed.

But they must always be transparent in the ledger, justified by reason and visible in audit history.

---

## Welcome Energy

Selqiro should support Welcome Energy for new users.

Purpose:

Let a new user try paid value-added features before buying Energy.

Examples:

- listing highlighting
- service highlighting
- small discovery boost
- temporary location trial later if appropriate

Recommended launch concept:

Tervitus Energy

Example amount:

100 Energy

The exact amount must be configurable.

---

## Welcome Energy rules

Welcome Energy should not be added silently.

It must create an Energy transaction.

Transaction type:

welcome_grant

The transaction should include:

- wallet id
- user/account id
- identity id if relevant
- amount
- reason
- timestamp
- balance after

User should see it in Energy history.

Example:

Tervitus Energy
Uue liituja kingitus
+100 Energy

---

## Abuse prevention

Welcome Energy can create abuse risk if users create many accounts.

Controls may include:

- one grant per account
- email verification required
- first identity creation required
- optional phone verification later
- optional profile completion requirement later
- configurable country/launch campaign limits
- fraud monitoring
- ability to disable or adjust amount

Welcome Energy should be generous enough to try Selqiro, but not so large that abuse becomes attractive.

---

## Promotional Energy

Welcome Energy is promotional Energy.

Rules:

- cannot be withdrawn as money
- cannot be transferred to another account unless policy later allows
- may have expiration if needed
- can be used only inside Selqiro
- should appear in the ledger
- may have limits for high-visibility moderated features if needed

Do not describe Welcome Energy as cash.

It is a platform credit for trying Selqiro features.

---

## Final rule

New users may receive Welcome Energy.

Every grant must be ledger-based, configurable and abuse-aware.
