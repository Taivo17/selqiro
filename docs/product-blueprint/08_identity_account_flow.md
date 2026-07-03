# Identity and Account Flow

## Purpose

Identity is one of Selqiro's core concepts.

A user has one account, but can act through multiple identities.

This allows one person or business owner to use Selqiro in different roles without creating separate accounts.

Examples:

- personal seller
- small business
- garage
- transport service
- future brand identity

---

## Core principle

Account is private.

Identity is public.

The user logs in with an account.

The world sees the active public identity.

---

## Account

The account contains private ownership information.

Account-level data may include:

- email
- authentication
- language preference
- security settings
- owned identities
- payment ownership later
- admin role if applicable

The account is not what the marketplace mainly displays.

---

## Identity

Identity is the public actor inside Selqiro.

Identity may represent:

- a person
- a business
- a service provider
- a professional seller
- a future brand
- a future organization

Identity may own:

- listings
- services
- jobs later
- Brand Space
- messages
- follows
- store sections
- future Energy balance if decided later

---

## Active identity

The active identity is the identity the user is currently acting as.

It must always be clear in the UI.

Example:

Acting as:
Milline Vedu

The active identity should be visible in the top navigation for logged-in users.

Email does not need to be constantly visible.

The active identity does.

---

## Identity switcher

Users with multiple identities need a fast switcher.

The switcher should show:

- active identity
- available identities
- identity type if useful
- create identity option later
- account settings link

Switching identity should update:

- listings shown in My Space
- messages inbox
- store/Brand Space management
- follow state
- service management
- future Energy/Business tools if identity-based

---

## Email visibility

Email is private account information.

It should not be shown constantly in the main UI.

It can be shown in:

- account settings
- identity switcher expanded menu
- security page
- admin tools

Public visitors should see identity name, not email.

---

## Public identity display

A public identity should show:

- display name
- avatar/logo
- short description
- location
- listings or services
- Brand Space if business
- trust signals when available

It should not expose private account details.

---

## Multiple identities

A single account can own multiple identities.

Example:

Account:
taivo17@example.com

Identities:
- Taivo
- Milline Vedu
- Taivo Garaaž

Each identity can have different public activity.

This supports realistic real-world use.

---

## Self-interaction rules

A user should not interact with their own identities as if they were separate people when it creates confusion.

Examples:

- cannot message own identity
- cannot block own identity
- cannot report own identity
- should not create dead-end conversations

Selqiro should show friendly messages instead of allowing confusing actions.

---

## Identity-based messaging

Messaging is identity-based.

Each active identity has its own inbox.

Switching identity should show conversations belonging to that identity.

If a user switches identity while a conversation is open, Selqiro should redirect to inbox list rather than show a confusing error.

---

## Identity-based follow

Following should be identity-based.

Different identities under the same account may follow the same store independently.

Example:

Milline Vedu follows Jaani Pood.

Taivo Garaaž can also follow Jaani Pood.

The state must not conflict.

---

## Blocking

Blocking is account-level for safety.

If one identity blocks another user's account, blocking should protect all identities owned by that account from bypass attempts.

This prevents a blocked person from using another identity to bypass the block.

Block is stronger than follow.

---

## Reports

Reports should support identity context.

Report should know:

- reporter account
- reporter identity when available
- reported account
- reported identity when available
- reason
- details
- related object if any

This helps admin understand the exact situation.

---

## Brand Space

Business identity can have a Brand Space.

Brand Space is the public home of an identity.

It can show:

- overview
- products
- services
- jobs later
- Today's Story later
- contact
- knowledge later
- future commerce modules

A Brand Space should not be tied only to marketplace listings.

---

## Personal identity

Personal identity can be simpler.

It may show:

- public name
- listings
- location
- basic trust signals

Personal identity does not need full Brand Space modules unless enabled later.

---

## Identity lifecycle

Identity should support lifecycle states.

Possible future states:

- active
- hidden
- archived
- deleted

Deletion should be handled carefully.

In many cases, hiding or archiving is safer than hard delete.

Reason:

Identities may be linked to listings, messages, reports, follows, services and payments.

---

## Admin identity management

Admin should be able to view:

- identity name
- owner account
- listings count
- services count later
- followers
- reports
- plan/energy state later
- status
- created date

Admin actions later may include:

- hide identity
- restore identity
- review reports
- manage plan/energy adjustments
- verify business

All admin actions should be audit logged.

---

## Identity and Energy

The final Energy ownership model should be decided carefully.

Possible principle:

Energy may belong to account, while usage is attributed to identity.

This allows one account owner to manage Energy across identities while still seeing which identity used it.

Do not hardcode this too early.

Energy architecture should support both account-level balance and identity-level usage attribution.

---

## Identity and payments

Payments are account-owned or business-owned depending on billing setup.

Invoices should clearly show the billing entity.

Future business accounts may need:

- company name
- registration number
- VAT number
- invoice address
- accounting export

Identity and billing may be related but should not be confused.

---

## Mobile behavior

On mobile, the active identity must still be visible or easily accessible.

Identity switching should not be hidden too deeply.

A small identity chip in the header or menu is recommended.

Example:

Milline Vedu ▼

---

## Desktop behavior

On desktop, identity can be shown in the top-right area.

Example:

Messages
Notifications
Milline Vedu ▼

The interface should feel calm and clear.

---

## What identity should feel like

The user should always feel:

I know who I am acting as.

The public should see:

A clear seller, business or brand identity.

The system should preserve:

private account ownership behind the scenes.

---

## Final rule

One account can own many identities.

But every public action must clearly belong to one identity.
