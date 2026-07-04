# Moderation Architecture

## Purpose

Moderation protects Selqiro's trust, safety and calm user experience.

Moderation is not only about removing bad content.

It is about keeping Selqiro useful, fair and trustworthy.

Moderation applies to:

- listings
- services
- jobs later
- Brand Space content
- Today's Story
- featured discovery content
- messages when reported
- AI-generated or AI-assisted content
- user reports
- business profiles
- future Knowledge content

---

## Core principle

Selqiro should be open to participation, but protected from abuse.

Users should feel:

I can trust this platform.

Businesses should feel:

The rules are clear and fair.

Admins should feel:

I have the tools to review issues without guessing.

---

## Moderation style

Selqiro should avoid aggressive automatic punishment.

Preferred moderation style:

- prevent obvious abuse
- warn when content seems risky
- review when uncertain
- explain problems clearly
- allow correction when possible

AI helps with moderation.

AI does not become the final authority for sensitive cases.

---

## AI moderation role

AI should act as first review layer.

AI can detect:

- violence
- hate
- adult content
- scams
- misleading claims
- political campaigns
- protest campaigns
- irrelevant Today's Story content
- fake or suspicious listings
- low quality story content
- dangerous technical advice later
- spam patterns

AI outputs a risk result.

AI does not make every final decision.

---

## Risk levels

Moderation should use a simple risk model.

### Green

Content looks safe.

Possible actions:
- publish automatically
- or approve quickly depending on content type

### Yellow

Content may be risky or unclear.

Possible actions:
- send to human review
- request correction
- temporarily hold publishing

### Red

Content clearly violates policy.

Possible actions:
- do not publish
- ask user to correct
- escalate to admin
- hide content if already live

---

## Human review

Human review is required when:

- AI is uncertain
- content is high visibility
- Today's Story is involved
- user report is serious
- account safety is involved
- business reputation is involved
- payment or Energy dispute is involved
- legal risk exists
- political or divisive content is detected

Admin should see:

- content
- author identity
- related object
- AI risk result
- user reports
- history
- previous admin actions
- recommended next action

---

## Today's Story moderation

Today's Story needs stronger moderation than normal listings.

Reason:

Today's Story is a high-visibility surface.

Allowed content:

- products
- services
- jobs
- business openings
- travel offers
- events
- entertainment
- seasonal campaigns
- useful local or global opportunities
- product launches
- innovation stories

Not allowed:

- political advertising
- election campaigns
- protest campaigns
- ideological campaigns
- violent content
- adult content
- gambling-like content
- hate or divisive content
- misleading claims
- unrelated generic advertising
- content that does not fit Selqiro's useful opportunity purpose

Today's Story should stay calm, useful and relevant.

---

## Marketplace listing moderation

Listings should be checked for:

- forbidden items
- scam signals
- misleading title
- wrong category
- fake price
- stolen images when detectable
- spam repetition
- dangerous or illegal goods
- low quality or incomplete content

Launch moderation can be light.

High-risk content should be reviewed.

---

## Services moderation

Services should be checked for:

- misleading service claims
- illegal services
- unsafe services
- fake business identity
- irrelevant category
- spam
- adult or restricted services
- political or ideological promotion disguised as service

Service providers should be able to correct honest mistakes.

---

## Brand Space moderation

Brand Space content should be checked for:

- business identity misuse
- impersonation
- misleading official claims
- inappropriate media
- unsupported claims
- prohibited content
- fake locations
- fake contact details

Global brands or verified businesses may later require verification workflow.

---

## Messages moderation

Messages are private by default.

Selqiro should not casually inspect private conversations.

Messages are reviewed only when:

- a user reports a conversation
- safety issue exists
- legal or support case requires it
- fraud investigation requires it

AI should not read private messages unless user explicitly asks for AI help or moderation context requires review.

Privacy remains a core value.

---

## Reports

Reports are user-submitted safety signals.

Report should store:

- reporter account
- reporter identity if available
- reported account
- reported identity if available
- related object type
- related object id
- reason
- details
- status
- created at

Report statuses may include:

- open
- reviewing
- actioned
- dismissed

Reports should not automatically punish users.

Reports create review signals.

---

## Blocking

Blocking protects users.

Block should:

- prevent messaging
- hide marketplace visibility where appropriate
- hide feed/discovery content where appropriate
- prevent blocked user from bypassing through another identity when safety requires account-level protection

Block is stronger than follow.

---

## Content lifecycle

Content should have clear status.

Possible statuses:

- draft
- pending_review
- active
- paused
- expired
- hidden
- archived
- deleted

Not every content type needs every status at launch.

But architecture should support a shared lifecycle concept.

---

## Correction over rejection

When possible, Selqiro should help users fix content.

Example:

Your Today's Story cannot be published because it contains political campaign content.

Please replace it with a product, service, event, job or business-related story.

This is better than a silent rejection.

---

## Appeals

Future feature:

Users and businesses may request review if content is rejected or hidden.

Appeals should be tracked.

Admin should see:

- original decision
- AI result
- human reviewer
- appeal reason
- final resolution

Launch may not need full appeal system, but architecture should not block it.

---

## Admin tools

Admin moderation tools should support:

- report list
- content review queue
- Today's Story review queue
- identity overview
- listing overview
- service overview later
- action history
- audit log
- status changes
- admin notes

Admin actions should be logged.

---

## Audit log

Important moderation actions must be logged.

Examples:

- hide listing
- restore listing
- dismiss report
- action report
- reject Today's Story
- approve Today's Story
- hide identity
- restore identity
- manual Energy adjustment related to moderation
- admin note

Audit log should include:

- admin user
- action
- target type
- target id
- metadata
- timestamp

This becomes essential when more staff join later.

---

## Roles and permissions

Moderation should support future staff roles.

Possible roles:

- super_admin
- admin
- moderator
- support
- developer

Moderators should not automatically have access to everything.

Support should see only what is needed.

Developers should not casually see private user data.

Permissions should be specific.

---

## AI quality assistance

AI can improve content quality before moderation.

Examples:

- suggest better title
- detect missing image
- detect unclear text
- detect too aggressive marketing
- detect unsupported claims
- suggest category correction

The best moderation prevents problems before publishing.

---

## Knowledge moderation later

When Knowledge Gateway is added, moderation becomes more serious.

Knowledge answers may involve:

- repair advice
- safety
- technical instructions
- professional data
- legal or compliance issues later

Knowledge AI must show confidence and sources.

If confidence is low, AI must say so.

Selqiro must not pretend certainty.

---

## Political and divisive content

Selqiro should remain neutral and useful.

Today's Story and discovery surfaces should not be used for:

- election campaigns
- political advertising
- ideological campaigns
- protest promotion
- divisive social campaigns

Selqiro is for products, services, jobs, businesses, knowledge, travel, entertainment and useful opportunities.

This protects user trust.

---

## Moderation and revenue

Revenue must not override moderation.

A business paying Energy for Today's Story does not guarantee publication.

If content violates rules, it must not be published.

Energy refund or correction policy should be defined separately.

Trust is more valuable than one booking.

---

## Launch moderation scope

V2 Launch should include:

- reports
- block
- basic admin moderation
- Today's Story policy foundation
- listing/service safety review foundation
- AI-assisted review later if ready

Launch does not need:

- full appeal system
- full reputation system
- full automated fraud engine
- complete legal automation

But architecture should support them later.

---

## What moderation should feel like

Users should feel:

Selqiro is safe but not oppressive.

Businesses should feel:

Rules are clear and fair.

Admins should feel:

I can review this calmly with enough context.

---

## Final rule

Moderation protects trust.

Trust is more valuable than short-term revenue.

---

## Message privacy in moderation

Moderation must respect private messages.

Private messages are not reviewed by default.

Message content is reviewed only when there is a specific case:

- conversation report
- support request
- fraud concern
- safety issue
- legal request

Admin should not casually browse private messages.

Every access to message content should be logged.

AI may help review reported content, but only inside the specific case and according to privacy rules.

Privacy remains part of trust.
