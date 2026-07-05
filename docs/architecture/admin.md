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

---

## AI-assisted admin operations

Admin should not scale only by adding more humans.

As Selqiro grows across countries, AI should help reduce admin workload.

AI can perform first-pass review and triage.

AI should help with:

- reports
- Today's Story submissions
- suspicious listings
- suspicious services
- profile quality issues
- repeated support questions
- repeated technical problems
- payment issue patterns
- upload failures
- localization issues
- user confusion patterns

AI helps admins focus on what truly needs human judgment.

---

## AI triage model

AI triage should classify incoming issues.

Possible outcomes:

### Green

Low risk or clear case.

AI may:

- auto-answer support question
- suggest simple fix
- approve low-risk content if policy allows
- close simple informational request
- route to correct help page

### Yellow

Unclear or moderate risk.

AI should escalate to admin or support.

Examples:

- uncertain Today's Story content
- unclear scam report
- repeated user complaint
- unusual payment issue
- suspicious profile claim

### Red

High risk.

AI should hold content or escalate urgently.

Examples:

- likely scam
- dangerous content
- policy violation in Today's Story
- severe safety issue
- serious payment/fraud concern

AI should not be the final authority for sensitive decisions.

AI triages.

Humans decide when risk, money, reputation, privacy or legal issues are involved.

---

## Human escalation

Human admin review is required when:

- AI is uncertain
- content is high visibility
- Today's Story is involved and not clearly safe
- payment or Energy dispute exists
- private message case requires review
- legal or safety risk exists
- business reputation may be affected
- user account restriction is considered

Admin should see:

- AI summary
- reason for escalation
- risk level
- related object
- related user/identity
- recommended next action
- history
- policy reference if available

---

## Multi-country operations

Selqiro should support admin operations across many countries.

Admin dashboard should later support:

- country filter
- language filter
- country-level case volume
- AI-handled percentage
- human review queue by country
- high-risk countries or regions
- local policy notes
- local support load

Example dashboard indicators:

- Estonia: open cases, AI handled %, needs review
- Finland: open cases, AI handled %, needs review
- Japan: open cases, AI handled %, needs review
- Brazil: open cases, AI handled %, needs review

This helps Selqiro grow globally without losing operational control.

---

## AI Signals

AI Signals is a future admin module.

It detects repeated patterns that may indicate product or system problems.

Examples:

- multiple users report checkout error
- several users fail image upload
- many users abandon Today's Story reservation at same step
- users in one language repeatedly misunderstand a label
- same payment provider error repeats
- many users ask the same support question

AI Signals should notify admin before small issues become large support problems.

AI Signals should show:

- issue summary
- affected area
- number of users
- severity
- trend
- suggested next step
- related logs or examples

---

## Support AI

AI can help with support, but should not pretend to be human.

AI may:

- answer common questions
- guide user to correct page
- explain how Energy works
- explain why a status is pending
- suggest how to complete a profile
- help user understand a rejected Today's Story reason

If AI cannot solve the issue, it should escalate to human support.

User should not be trapped in AI support loops.

---

## Admin decision flow

Recommended admin flow:

Dashboard
↓
Queue
↓
Case detail
↓
AI summary
↓
Admin decision
↓
User notification if needed
↓
Audit log

This keeps admin work structured and traceable.

---

## What Selqiro should do better than many platforms

Selqiro should avoid:

- unclear rejections
- hidden admin decisions
- casual access to private messages
- paid content bypassing review
- users being trapped in automated support
- one giant admin page with no structure
- scaling only by adding more manual work

Selqiro should prefer:

- clear policies
- case-based review
- AI triage
- human decision for sensitive cases
- audit logs
- transparent user messages
- modular admin tools
- privacy-first operations

---

## Final rule for AI in admin

AI reduces admin workload.

AI does not replace responsibility.

Sensitive decisions remain human-controlled.

---

## Multilingual admin operations

Selqiro is global by design.

Admin work must support many countries and languages.

A case may arrive in any language.

Admin should be able to work in their own working language while still seeing the original content.

Important rule:

Original content remains the source of truth.

AI translation is a working aid.

---

## Original text and AI translation

For non-private case content, admin case detail should show:

- original text
- detected language
- AI translation to admin working language
- AI summary
- risk level
- suggested next step
- related object
- country / region if relevant

Examples of content that AI can translate for admin:

- report reason
- public listing text
- public service profile
- Today's Story content
- public update
- support request submitted through help form
- payment issue description
- public profile text

Private message content is excluded from AI translation during V2 Launch.

---

## Private message exception

V2 Launch decision:

AI does not read or translate private message content.

If a private conversation is reported, human support/moderation may review the relevant content through a case-based access path.

AI should not analyze, summarize or translate private messages during launch.

This protects Selqiro's privacy promise.

Future opt-in AI assistance for private messages may be reconsidered later after a separate privacy review.

---

## Admin reply translation

Admin may write a reply in their working language.

If the user language is different, AI can translate the admin reply for the user.

Before sending, admin should see:

- admin original reply
- AI translated reply
- target language
- option to edit translation if needed

User sees the translated reply.

The admin working language does not need to be shown to the user.

System should store both:

- original admin reply
- translated user-facing reply

Reason:

This supports audit, quality review and dispute resolution.

---

## Translation disclaimer for admin

Admin UI should make clear:

AI translation may contain inaccuracies.

Original text should remain visible.

For important or sensitive cases, admin should be careful and may need human language support later.

---

## Case ownership

Admin work should use case ownership.

A case should have:

- status
- assigned admin
- assigned team later
- lock state
- lock expiration
- priority
- risk level
- country
- language
- related object
- audit history

This prevents two admins from solving the same case at the same time.

---

## Case statuses

Recommended case statuses:

- new
- ai_triaged
- needs_review
- assigned
- in_progress
- waiting_for_user
- waiting_for_business
- waiting_for_payment_provider
- waiting_for_moderation
- resolved
- dismissed
- escalated

Not every status is needed in the first implementation.

Architecture should support this model.

---

## Taking a case

Launch-friendly workflow:

Admin opens queue.
Admin clicks "Take case".
Case becomes assigned to that admin.
Other admins see that the case is already being handled.

Fields:

- assigned_admin_id
- locked_by
- lock_expires_at
- status = in_progress

If the admin does not act for a defined time, the lock can expire.

The case may then return to the queue.

---

## Preventing admin collision

If another admin opens an assigned case, UI should show:

This case is being handled by [admin name].

They may view limited information depending on permissions, but should not send replies or make final decisions unless reassigned.

This avoids duplicate replies and conflicting decisions.

---

## Reassigning cases

A case may need reassignment.

Reasons:

- admin is unavailable
- wrong language
- wrong country
- higher permission required
- finance case
- legal/safety case
- technical issue

Reassignment should be logged.

---

## Work distribution

Launch can start with manual "Take case" workflow.

Future work distribution options:

### Manual

Admins choose cases from queue.

Good for small team.

### Round robin

Cases are distributed evenly between available admins.

Good when team grows.

### Balanced

System gives case to admin with fewer active cases.

Good for workload balance.

### Country routing

Cases are routed by country.

Example:

Japan cases to Japan team or language-capable admin.

### Language routing

Cases are routed based on language.

### Risk routing

High-risk cases go to experienced admins.

### Module routing

Payment cases go to finance/support.

Today's Story cases go to moderation.

Technical issue clusters go to product/admin team.

Launch should not overbuild routing.

Architecture should allow it later.

---

## AI triage and routing

AI can assist routing.

AI may detect:

- language
- country
- case type
- urgency
- risk level
- affected feature
- whether user issue is repeated
- whether human admin is needed

AI may recommend:

- auto-answer
- route to support
- route to moderation
- route to finance
- route to technical admin
- escalate urgently

AI recommendation should be visible to admin.

AI is not the final authority for sensitive cases.

---

## AI support answer draft

For non-sensitive support cases, AI can draft a reply.

Admin may review and send.

For very simple support questions, future policy may allow AI to answer automatically.

User should not be trapped in AI support loops.

If AI is uncertain or the user asks for human help, escalate to admin/support.

---

## AI Signals for recurring issues

AI Signals should detect repeated problems across cases and user behavior.

Examples:

- many users fail payment checkout
- many users report image upload timeout
- many users abandon Energy purchase at the same step
- many users in one language misunderstand the same label
- repeated location search failures in one country
- repeated Today's Story submission confusion
- multiple users report the same listing or identity

AI Signals should create grouped admin alerts.

A signal should show:

- issue summary
- affected feature
- number of affected users
- countries/languages affected
- start time
- severity
- trend
- suggested next step
- related cases
- sample events

This prevents admin workload from becoming many duplicate cases.

---

## Multi-country dashboard

Admin dashboard should support country-level overview.

Possible columns:

- country
- open cases
- AI handled
- needs human review
- high-risk cases
- payment issues
- language issues
- average resolution time

This allows Selqiro to scale globally.

Admin should be able to filter by:

- country
- language
- module
- risk
- status
- assigned admin
- date

---

## User-facing translated replies

When admin sends translated reply, system should store:

- original admin message
- translated message
- language
- translation provider/model if relevant
- timestamp
- case id
- admin id

User sees the translated message in their language.

The user does not need to see admin's working language.

If needed, UI may show that the reply was translated.

This can be decided later based on UX and legal requirements.

---

## Admin translation audit

Translation-related actions should be audit logged when relevant.

Examples:

- AI translation generated
- admin edited translation
- translated reply sent
- language changed
- case rerouted due to language

This helps quality and dispute review.

---

## Final rule for global admin

Admin must scale through:

- AI triage
- translation support
- case ownership
- modular queues
- audit logs
- country/language routing
- AI Signals for recurring problems

But privacy and sensitive decisions remain human-controlled.
