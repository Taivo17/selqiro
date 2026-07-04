# Energy Payment Flow

## Purpose

Energy Payment Flow describes how users and businesses buy Energy Credits and use them for paid Selqiro capabilities.

Energy is used for optional value-added actions.

Examples:

- Today's Story
- featured discovery
- service highlighting
- temporary service location access
- future AI actions
- future Knowledge Gateway actions

---

## Core principle

The user should not lose context when Energy is missing.

If a user starts a paid action and does not have enough Energy, Selqiro should calculate the missing amount and allow the user to add Energy without restarting the action.

---

## Two Energy purchase modes

Selqiro should support two Energy purchase modes.

### 1. Package purchase

Used when the user opens the Energy page directly.

Example packages:

- Starter
- Professional
- Business

Larger packages can have a better Energy unit price.

Purpose:

Let users or businesses prepare Energy balance for future use.

---

### 2. Missing Energy purchase

Used when the user is inside a specific paid action.

Examples:

- reserving Today's Story
- highlighting a service
- highlighting a listing
- buying temporary service location access

Selqiro shows:

Required Energy
Current balance
Missing Energy

Then offers:

Add missing Energy and continue

This is the default option inside a paid action.

---

## Example: Today's Story

Business wants to reserve Today's Story.

Required Energy:
5000

Current balance:
1200

Missing:
3800

Selqiro should show:

Add 3800 Energy and continue

After payment:

- Energy is added to wallet
- required Energy is reserved or spent depending on moderation flow
- user returns to the same Today's Story reservation

The user should not need to start again.

---

## Optional larger package

When missing Energy is shown, Selqiro may also suggest a larger package.

Example:

Missing:
330 Energy

Options:

- Add exactly 330 Energy and continue
- Buy 500 Energy with better unit price

The user chooses.

Do not force larger packages when exact missing Energy is more appropriate.

---

## Minimum purchase

Very small payments may not be practical.

Selqiro may define a minimum Energy purchase amount.

Example:

If missing Energy is very small, Selqiro may say:

Minimum Energy purchase is 50 Energy.

This prevents tiny payment transactions.

The exact threshold should be configurable.

---

## Naming

Do not call this "custom amount" in the main UX.

Better wording:

- Add missing Energy
- Add required Energy
- Fill missing balance
- Lisa puuduv Energy

Reason:

The user should not calculate manually.

Selqiro calculates the missing Energy automatically.

---

## Reserve vs spend

Energy behavior depends on the paid action.

### Immediate activation

If the paid action can activate immediately, Energy can be spent immediately.

Example:

Listing highlight starts immediately.

Flow:

Energy spent
Highlight active

### Moderated action

If the paid action needs moderation, Energy should be reserved first.

Example:

Today's Story may require review.

Flow:

Energy reserved
Content sent to review
If approved:
Energy spent
Story active

If rejected:
Energy released or refunded
User may correct content if policy allows

This is fair and protects trust.

---

## Payment provider

Selqiro should not collect card data directly.

Payment should happen through trusted payment provider.

Launch target:

- payment provider checkout
- webhook confirmation
- payment record
- Energy transaction
- wallet balance update
- receipt or invoice link

Webhook confirmation is source of truth.

Frontend success alone is not enough.

---

## Business billing

When a business buys Energy, purchase must connect to the correct billing entity.

The user should see which identity or business is paying.

Example:

Acting as:
Milline Vedu OÜ

Energy wallet:
Milline Vedu OÜ

This prevents mixing personal and business Energy.

---

## User experience

The flow should feel like one continuous action.

Bad:

User starts reservation.
Energy missing.
User is sent elsewhere.
User returns and must start over.

Good:

User starts reservation.
Energy missing.
Selqiro shows missing Energy.
User pays.
User returns to same reservation.
Reservation continues.

---

## Final rule

Energy page uses packages.

Paid action flow uses automatically calculated missing Energy.

The user should always understand:

- how much Energy is required
- how much they have
- how much is missing
- what happens after payment

---

## Final launch UX wording decisions

Energy Payment Flow visual direction is accepted for V2 Launch.

Final wording decisions:

### Payment button

Use:

Jätka turvalisse maksesse

Instead of:

Ava makse

Reason:

The user should clearly understand that payment happens in a secure payment provider environment.

---

### Card data

Selqiro does not collect or store card data.

Launch payment should use trusted payment provider checkout.

The UI should clearly communicate:

Payment is handled securely by payment provider.

Selqiro does not store card details.

---

### Refund wording

Avoid harsh refund wording.

Do not say:

Energy cannot be refunded after use.

Better wording:

If Energy has already been used for an active service, refund may not always be possible.

Reason:

This is more fair, more human and leaves room for support decisions.

---

### Today's Story reservation wording

For moderated paid actions, especially Today's Story, use clear reserve wording.

Recommended text:

Energy is reserved until the review decision.

If approved:
Energy is spent and the story becomes active.

If rejected:
Energy is released or refunded according to policy.

---

## Final launch decision

Energy Payment Flow is locked for launch as:

1. User starts paid action.
2. Selqiro checks required Energy.
3. If Energy is missing, Selqiro calculates missing Energy.
4. User can add missing Energy and continue.
5. User may choose larger package with better unit price.
6. Payment happens through trusted payment provider.
7. Webhook confirms payment.
8. Energy is added to wallet.
9. User returns to the same action.
10. Energy is spent or reserved depending on the action.

This flow should not be redesigned unless implementation exposes a major issue.
