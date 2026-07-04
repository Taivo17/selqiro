# Accounting and Payments Architecture

## Purpose

Accounting and Payments Architecture defines how Selqiro handles money, Energy purchases, invoices, receipts, business billing and future accounting integrations.

Selqiro should not build its own payment infrastructure from scratch.

Selqiro should use trusted payment providers and keep its own internal Energy ledger.

---

## Core principle

Payments and Energy are different things.

Money buys Energy.

Energy is used inside Selqiro.

This separation makes the system flexible and easier to maintain.

---

## Main model

Recommended model:

Payment Provider
↓
Selqiro Payment Record
↓
Energy Wallet
↓
Energy Transaction Ledger
↓
Invoice / Receipt / Accounting Export

Payment provider handles real money.

Selqiro handles Energy balance and usage.

---

## Do not store card data

Selqiro should never store card details.

Card data, Apple Pay, Google Pay and similar payment methods should be handled by a trusted payment provider.

Reason:

- security
- compliance
- trust
- lower technical risk

---

## Payment provider

Recommended launch provider:

Stripe

Reason:

Stripe supports:
- card payments
- Apple Pay
- Google Pay
- hosted checkout
- invoices
- receipts
- webhooks
- refunds
- tax tools
- payment links
- international payments

Selqiro can start with Stripe and add other providers later if needed.

---

## Stripe role

Stripe handles:

- payment collection
- payment security
- payment methods
- hosted payment pages
- receipts
- invoices where applicable
- webhooks
- refunds
- tax tools later

Selqiro handles:

- Energy balance
- Energy transaction history
- user flow
- billing entity connection
- internal audit trail
- business logic
- admin support

---

## Energy purchase flow

Example:

User wants to reserve Today's Story.

Energy required:
900

Current wallet balance:
620

Missing:
280

Selqiro shows:

You need 280 more Energy Credits.

Add Energy and continue.

User pays through payment provider.

Payment succeeds.

Webhook confirms payment.

Selqiro adds Energy to the correct wallet.

User returns to the same Today's Story reservation flow.

The user should not need to start again.

---

## Billing entity

All business purchases should connect to a billing entity.

Billing entity represents who pays.

Types:
- personal
- business
- organization later

Business billing entity may include:
- company name
- registration number
- VAT number
- billing address
- billing email
- country
- accounting provider later

This prevents mixing personal and business purchases.

---

## Personal billing

Personal users need a simple purchase history.

They may need:
- receipt
- payment date
- Energy amount
- payment method
- refund history if any

Personal users do not need full company invoice fields by default.

---

## Business billing

Business users need more.

Business billing should support:

- invoice or receipt
- company name
- registration number
- VAT number
- billing address
- billing email
- payment history
- Energy purchase history
- Energy usage history
- export later

Businesses need documents for accounting.

This is trust-critical.

---

## Invoice and receipt

Selqiro should support downloadable documents.

Launch target:
- payment provider receipt or invoice
- payment history in Selqiro
- Energy transaction history in Selqiro

Future:
- structured invoices
- country-specific invoice formats
- accounting exports
- e-invoice support where needed

---

## Global invoicing reality

One universal invoice format does not automatically satisfy every country.

Different countries may require different tax, invoice and reporting rules.

Selqiro should not try to manually build every country's accounting system at launch.

Instead:

- use trusted payment provider invoices/receipts
- store billing country
- store business tax details
- support exports
- add country-specific integrations later

---

## Tax handling

Tax can become complex internationally.

Launch should avoid custom tax logic where possible.

Recommended approach:

- use payment provider tax tools where available
- collect billing country
- collect VAT or tax ID when needed
- keep tax data connected to billing entity
- avoid hardcoded tax rules in marketplace code

---

## Merit accounting

The owner currently uses Merit accounting software.

Launch does not require full Merit integration.

Recommended path:

1. Stripe or payment provider handles payment document.
2. Selqiro stores internal Energy ledger.
3. Owner can export payment records.
4. Later, build Merit API integration if payment volume justifies it.

Reason:

Do not delay Launch with complex accounting automation.

Build accounting integration when real transaction volume exists.

---

## Accounting provider abstraction

Selqiro should not hardcode only Merit.

Future accounting providers may include:

- Merit
- Directo
- Standard Books
- QuickBooks
- Xero
- local country systems
- Peppol / e-invoice systems later

Architecture should support:

Accounting Provider
↓
Adapter
↓
Export / API sync

This keeps Selqiro flexible.

---

## Energy ledger

Energy ledger is mandatory.

Every Energy movement must be stored.

Transaction types:
- purchase
- spend
- refund
- recognition
- adjustment
- correction
- expiration later

Every transaction should include:

- wallet id
- billing entity id
- actor user id
- active identity id if relevant
- transaction type
- amount
- balance after
- reference type
- reference id
- created at
- description
- admin id if manual

Energy ledger must be reliable.

Do not silently edit balances.

---

## Payment records

Selqiro should store payment records separate from Energy transactions.

Payment record may include:

- payment provider
- provider payment id
- billing entity id
- wallet id
- amount paid
- currency
- Energy amount purchased
- status
- invoice id
- receipt url
- created at

Payment status should be synced from provider webhooks.

---

## Webhooks

Payment provider webhooks are required.

Example:

payment succeeded
↓
Selqiro verifies webhook
↓
creates payment record
↓
adds Energy transaction
↓
updates wallet balance

Never trust frontend alone for payment success.

Webhook confirmation is source of truth.

---

## Refunds

Refunds must be handled carefully.

If money is refunded, Energy may need to be removed or marked.

Refund should create transactions.

Example:
- refund payment
- reverse unused Energy if possible
- admin review if Energy already spent

Refund rules must be clear.

Do not create negative confusion for users.

---

## Failed payment

If payment fails:

- do not add Energy
- show clear message
- keep user in same flow if possible
- allow retry

If the user was reserving Today's Story, the reservation should not be confirmed until payment and Energy are successful.

---

## Today's Story billing

Today's Story can require significant Energy.

Rules:

- show Energy requirement before reservation
- show wallet balance
- allow add Energy and continue
- do not publish until payment/Energy/reservation conditions are met
- connect reservation to billing entity
- create Energy spend transaction
- provide invoice/receipt for Energy purchase
- provide reservation history for business records

---

## Discovery spending

Discovery spending should be traceable.

Business should later see:

- what was purchased
- when
- Energy spent
- placement
- region
- duration
- performance metrics later

This helps businesses understand value.

---

## Knowledge Gateway billing later

Knowledge Gateway may use external data providers.

User sees one Energy cost.

Selqiro internally covers:
- provider cost
- AI cost
- infrastructure
- margin

The user should not see raw provider costs.

Energy cost should be based on value delivered.

---

## Business reports

Businesses need clear reports.

Future business billing section may show:

- Energy balance
- Energy purchases
- Energy usage
- invoices
- receipts
- Today's Story reservations
- Discovery spend
- AI spend
- Knowledge spend later
- CSV export
- PDF documents

This should be easy to hand to accounting.

---

## Admin tools

Admin should see:

- payments
- failed payments
- Energy purchases
- Energy spend
- refunds
- manual adjustments
- billing entity details
- invoice references
- wallet history

Admins should not edit balances directly.

Admins create adjustments that are logged.

---

## Audit trail

All financial and Energy actions must be audit logged.

Important events:
- payment success
- payment failure
- refund
- Energy purchase
- Energy spend
- manual adjustment
- invoice generation
- billing entity change
- admin correction

Financial history must be explainable later.

---

## Staff permissions

Not every admin should access financial tools.

Possible permission groups:

- view payments
- refund payments
- adjust Energy
- view invoices
- manage billing entities
- export accounting data

Developer access should not automatically mean financial access.

---

## User experience

Payment UX should feel simple.

User should never think:

I lost my place.

If payment is needed during an action, payment should feel like a step inside the same flow.

Example:

Reserve Today's Story
↓
Need Energy
↓
Add Energy
↓
Return to reservation
↓
Confirm

---

## Launch scope

V2 Launch does not need full accounting automation.

Launch should support:

- Energy architecture
- payment provider decision
- future billing entity model
- basic payment records later
- Energy ledger later
- invoice/receipt concept

Full Stripe integration may be added after core V2 is stable if needed.

Full Merit integration can come later.

---

## Future scope

Future payment/accounting features:

- Stripe Checkout
- Stripe invoices
- Stripe Tax
- Energy packages
- subscription packages
- business billing profiles
- invoices list
- accounting export
- Merit integration
- other accounting providers
- e-invoice support
- VAT validation
- automatic bookkeeping sync

---

## What payments should feel like

Users should feel:

I know what I am buying.

Businesses should feel:

I can account for this properly.

Admins should feel:

Every transaction is traceable.

---

## Final rule

Selqiro should not build a bank or accounting system.

Selqiro should build a reliable Energy ledger and integrate with trusted payment and accounting systems.

---

## Launch-critical payment decision

Payment provider integration must be part of V2 Launch if paid Energy features are available.

Updated decision:

Energy purchases and payment confirmation are Launch-critical.

Launch should include:

- payment provider checkout or payment flow
- payment provider webhook
- Selqiro payment record
- Energy purchase transaction
- wallet balance update
- payment history
- receipt or invoice link
- admin payment visibility

Launch does not need full accounting automation.

But Launch must allow a business to pay for Energy and receive a usable payment document from the payment provider.

---

## Minimum launch payment flow

Minimum required flow:

1. User chooses Energy package or needs Energy inside paid action.
2. Selqiro creates payment session with payment provider.
3. User pays.
4. Payment provider sends webhook.
5. Selqiro verifies webhook.
6. Selqiro creates payment record.
7. Selqiro creates Energy transaction.
8. Wallet balance is updated.
9. User can continue original action.

Frontend success alone is not enough.

Webhook is source of truth.

---

## Launch business payment document

For Launch, business users should be able to access at least:

- payment receipt or invoice from payment provider
- payment date
- payment amount
- currency
- Energy amount purchased
- billing entity if available

Full country-specific accounting export can come later.

Merit integration can come later.

The launch requirement is:

Business can pay and obtain a usable document for accounting.
