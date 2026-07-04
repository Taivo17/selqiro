# Privacy and Message Access Architecture

## Purpose

This document defines how Selqiro protects private messages and when message content may be accessed for support, safety, fraud investigation or legal reasons.

Privacy is one of Selqiro's core trust principles.

Selqiro should never feel like a platform that watches users.

---

## Core principle

Selqiro does not read private messages by default.

Private messages are private user communications.

Admin, support, AI and developers should not casually access message content.

Access to message content is allowed only when there is a clear, specific and justified reason.

---

## Default behavior

By default:

- admin cannot browse private messages
- support cannot browse private messages
- AI does not read private messages
- developers do not inspect private messages
- message content is not used for general analytics
- message content is not used for advertising

Selqiro may store messages because messaging must function.

But storing messages does not mean staff can freely read them.

---

## Allowed access cases

Message content may be accessed only in limited cases.

### 1. User reports a conversation

If a user reports a conversation, Selqiro support or moderation may review relevant message content.

The user must be clearly informed:

When you report this conversation, relevant conversation content is shared with Selqiro support for review.

The review is for that specific case only.

### 2. User asks support for help

If a user contacts Selqiro support and asks for help with a specific conversation, support may access the relevant conversation context if needed.

Access should be limited to the case.

### 3. Fraud or safety investigation

If there is a serious fraud, abuse or safety concern, limited message access may be allowed when strictly necessary.

This should be case-based, not general browsing.

### 4. Legal requirement

If Selqiro receives a valid legal request from a competent authority, Selqiro may be required to provide specific information.

Such access must be handled through a legal/support process.

### 5. Serious risk

If Selqiro becomes aware of serious risk to people, safety or law, limited access may be needed to respond appropriately.

This does not create general monitoring.

---

## Not allowed

Selqiro staff should not access messages for:

- curiosity
- general browsing
- marketing
- advertising
- product analytics without consent
- training AI on private messages by default
- checking users without a case
- internal entertainment
- unnecessary support browsing

Private messages are not a content feed for the company.

---

## Case-based access

If message access is needed, it must be connected to a case.

A case may be:

- report case
- support case
- fraud case
- safety case
- legal request
- payment dispute case

The case should include:

- reason for access
- related user or identity
- related conversation
- related listing/service/job if relevant
- admin/support person
- time of access
- action taken
- final outcome when available

---

## Access scope

Message access should be limited.

Possible scopes:

- selected messages
- last messages
- full conversation when needed
- related media or attachments if needed
- related listing/service context

Launch may use full conversation review for reported conversations if simpler, but user-facing text must clearly say that conversation content may be reviewed.

Future versions can allow more granular reporting.

---

## User consent through reporting

When a user reports a conversation, they are sharing that conversation with Selqiro for review.

Important:

One user cannot give permission for unlimited access to everything about the other user.

The access is only for the reported conversation and case.

The other side should be informed through Privacy Policy and Terms that reported conversations may be reviewed by Selqiro for safety and support.

---

## AI and private messages

AI should not read private messages by default.

AI may help with messages only when the user explicitly requests help.

Examples:

- help write a polite reply
- summarize this conversation for me
- help report this message
- help explain what the seller asked

AI assistance must be user-invited.

AI should not silently analyze private conversations.

---

## Admin tools

Admin tools should not show private message content by default.

Admin may see metadata such as:

- conversation id
- participants
- related listing/service
- report status
- block status
- last activity time
- unread status

Message content opens only through a case-based access path.

---

## Audit log

Every access to private message content must be logged.

Audit log should include:

- who accessed
- when
- why
- case id
- conversation id
- scope
- action taken
- export/download if any

This is essential for trust.

---

## Staff permissions

Message content access should be restricted by role.

Possible roles:

- super_admin
- support
- moderator
- legal/admin later

Developers should not automatically have access to private messages.

Access should be permission-based and case-based.

Future option:

Sensitive message access may require two-person approval.

---

## Privacy Policy user-facing explanation

Selqiro should have a user-readable privacy explanation.

It should say clearly:

- we do not read your private messages by default
- we do not use private messages for advertising
- AI does not read your messages unless you ask it to help
- if you report a conversation, relevant content may be reviewed
- if there is fraud, safety concern or legal requirement, limited review may happen
- access is logged and restricted

This should be written in simple language.

---

## Support and moderation wording

When user reports a conversation, show a clear message:

By reporting this conversation, you share relevant conversation content with Selqiro support for review.

Selqiro will use this information only to review this case.

---

## No general monitoring

Selqiro should not perform general monitoring of all private conversations.

Safety tools may detect platform abuse patterns, but private message content should not be broadly inspected without reason.

The platform should protect users without becoming invasive.

---

## Retention

Message retention policy should be defined later.

Possible future controls:

- delete conversation
- archive conversation
- export conversation
- retention period
- legal hold when required

Launch does not need all retention tools, but architecture should not block them.

---

## Final rule

Private messages are private by default.

Access is exceptional, limited, justified and logged.

Privacy is part of Selqiro's trust.
