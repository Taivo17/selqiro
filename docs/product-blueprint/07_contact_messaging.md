# Contact and Messaging Flow

## Purpose

Contact and Messaging is the point where discovery becomes real interaction.

A user may browse without an account, but when they want to contact someone, Selqiro should guide them into a trusted identity-based conversation.

Messaging must feel simple, safe and connected to the context where the conversation started.

---

## Core principle

Messaging is not a separate chat app.

Messaging is part of solving a real-world problem.

A conversation should always have context.

Examples:

- product listing
- service provider
- job opportunity
- Brand Space
- future order
- future Knowledge request

The user should understand why the conversation exists.

---

## When account is required

Users can browse without logging in.

Account should be required when the user wants to:

- message a seller
- contact a service provider
- save favorites
- create listings
- create services
- use identity-based actions
- use Energy-based features

The login prompt should appear only when there is a real reason.

Good moment:

User clicks "Contact seller".

Message:

Create a free account to message the seller and keep your conversations in one place.

This is better than asking for registration too early.

---

## Product contact flow

Typical product contact flow:

Product Discovery
↓
Listing Detail
↓
Contact seller
↓
Login if needed
↓
Choose active identity if needed
↓
Conversation opens
↓
Message is sent

The listing context should remain visible in the conversation.

The user should see:

- listing title
- listing image
- seller identity
- price
- link back to listing

This prevents confusion later.

---

## Service contact flow

Typical service contact flow:

Services
↓
Service Card
↓
Business Profile or Service Detail
↓
Contact provider
↓
Conversation opens

The conversation should show:

- service name
- business identity
- location
- link back to service or Brand Space

Service contact should feel business-like but still simple.

---

## Job contact flow

Jobs are not required for V2 Launch, but the architecture should support them.

Future job contact flow:

Jobs
↓
Job Detail
↓
Ask question or Apply
↓
Conversation or application flow

Job conversations should be clearly separated from normal product messages when needed.

---

## Brand Space contact flow

Brand Space can have multiple contact contexts.

Examples:

- general business message
- product question
- service question
- job question
- support request later

The user should not need to understand internal departments.

Selqiro should guide them with simple choices when needed.

---

## Active identity

Active identity must always be clear for logged-in users.

If a user has multiple identities, the UI should show:

Acting as:
Milline Vedu

The user must know which identity is sending the message.

Email does not need to be constantly visible.

Identity does.

---

## Self-contact prevention

A user should not be able to message their own identity.

If the user tries to contact their own listing, service or Brand Space, Selqiro should show a clear and friendly message.

Example:

You cannot message your own identity.

This prevents dead-end conversations and confusion.

---

## Identity switching

If a user switches active identity while a conversation is open, the current conversation may no longer belong to the new identity.

Correct behavior:

- do not show "conversation not found" as the main experience
- redirect to messages list
- show conversations available for the active identity

This keeps the messaging experience understandable.

---

## Blocking

Messaging must respect block logic.

If either side has blocked the other:

- no new messages can be sent
- the conversation should clearly show messaging is unavailable
- marketplace/feed visibility should also respect block rules

Block should be stronger than follow.

---

## Report and safety

Every conversation should support safety actions.

Possible actions:

- report user
- block user
- report listing/service context
- admin review later

Reports should keep enough context for moderation.

Important context:

- reporter
- reported identity
- related listing/service/job if any
- conversation id if relevant
- reason
- details
- timestamps

---

## Inbox

The inbox should be identity-based.

Each active identity has its own message list.

The inbox should show:

- conversation partner identity
- last message preview
- related listing/service if available
- unread indicator
- timestamp
- partner avatar/logo

If profile image or partner name is missing, the UI should still remain stable.

No broken empty states.

---

## Conversation header

A conversation should show:

- partner name
- partner avatar/logo
- related item or context
- status if blocked/unavailable
- link to listing/service/Brand Space when allowed

If the partner is blocked, opening their store from conversation should be restricted or show a clear message.

---

## Message composer

The message composer should be simple.

Launch composer:

- text input
- send button

Future composer may support:

- attachments
- offer
- quote request
- image
- document
- quick replies
- AI-assisted message writing

Do not overload Launch.

---

## AI assistance

AI may help users write messages, but should not be intrusive.

Examples:

- help write polite first message
- help ask seller useful questions
- help summarize a long conversation later
- help business answer common questions later

AI should not send messages automatically without user confirmation.

User remains in control.

---

## Notifications

Messaging needs notifications.

Launch should support at least:

- unread message indicator
- inbox count
- new message notification inside portal

Later:

- email notification
- push notification
- business response reminders

Notifications must not become spam.

---

## Privacy

Messages are private user communications.

AI should not read or analyze private messages unless the user explicitly asks for assistance.

Admin access to private messages should be limited and only used for safety, support or moderation cases where necessary.

Privacy must remain a competitive advantage.

---

## Admin and moderation

Admin should be able to review messaging-related issues when reported.

Admin should not casually browse private conversations.

Support tools should be designed around cases, reports and evidence.

Not general surveillance.

---

## Future business messaging

Business users may later need:

- quick replies
- customer inbox
- labels
- team members
- AI reply suggestions
- service requests
- quote requests
- order support

These should grow from the same messaging foundation.

Do not build a separate business chat system unless absolutely necessary.

---

## What messaging should feel like

Messaging should feel:

- contextual
- safe
- identity-aware
- simple
- trustworthy
- calm

The user should think:

I know who I am contacting and why.

Not:

Where did this chat come from?

---

## Final rule

Messaging is not just communication.

It is the bridge between discovery and real-world action.
