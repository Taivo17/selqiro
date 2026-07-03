# Selqiro Engineering Handbook

## Core principle

Selqiro is built for long-term maintainability by a small team.

Every technical decision should make the portal:
- easier to understand
- easier to debug
- easier to change
- safer to extend
- privacy-respecting
- scalable for large search volume

## Development style

Prefer small, clear modules over large files.

A feature should usually be split into:
- UI component
- data hook
- database/RPC layer
- documentation entry

Avoid files over 500 lines when possible.

## Refactor rule

When changing an important area:

1. First refactor without changing behavior.
2. Build and test.
3. Then change logic.
4. Build and test again.
5. Document what changed.

## My Page architecture

`app/my-page/page.tsx` was too large.

Decision:
- gradually split it into components and hooks
- first component: `MembershipCard.tsx`
- future modules:
  - `useMembership.ts`
  - `useProfile.ts`
  - `useListings.ts`
  - `LocationCard.tsx`
  - `LanguageCard.tsx`
  - `StoreCategoriesCard.tsx`
  - `BlockedUsersCard.tsx`

## Premium system

Source of truth:
- `identity_profiles.plan`

Allowed plans:
- `free`
- `premium`
- `business`

Avoid using old premium fields as the primary source:
- `profiles.is_premium`
- `profiles.premium_until`

## Safety rules

Before risky edits:
- create a backup file
- run `npm run build`
- only then continue

Never combine too many changes in one step.

## Documentation rule

After each meaningful development step, update:
- `docs/selqiro-dev-log.md`
- `docs/engineering-handbook.md` if architecture changes
- `docs/known-issues.md` if something remains broken

## ChatGPT-friendly architecture

Selqiro should be built so that important modules are small enough to be shared, reviewed, replaced, and repaired as complete files.

Practical rules:
- important files should usually stay under 300–500 lines
- if a file cannot be sent as one complete ChatGPT answer, it is probably too large
- prefer replacing one whole component file over editing small fragments inside a huge file
- avoid hidden coupling between unrelated features
- each module should have a clear name and clear responsibility

This makes development easier for the owner, for ChatGPT-assisted work, and for future developers.

## Development planning rule

Before larger changes, define:

1. Goal — what we are building or fixing
2. Affected files — which files will change
3. Risks — what could break
4. Test plan — how we confirm it works
5. Documentation — which docs need updating

After the change:
- run `npm run build`
- test the relevant page in browser
- update the development log

## 10-year architecture principle

Selqiro should not be built only for the next feature.

It should be built so that the portal can grow for at least 10 years with:
- marketplace search at large scale
- business accounts
- premium accounts
- AI tools
- promoted listings
- payments
- trust and safety systems
- mobile apps
- external integrations
- future commerce features

The architecture should stay understandable, modular, and maintainable even as the portal grows.

## Backwards compatibility during development

During active development, maintaining old implementations is not a goal.

If a better architecture is found:

- replace the old implementation
- remove obsolete code
- avoid duplicate systems
- keep only one maintained solution

Technical debt should be removed immediately instead of accumulated.

---

## One source of truth

Every important business concept must have exactly one authoritative source.

Examples:

Premium plan
→ identity_profiles.plan

Identity visibility
→ identity_profiles.visibility

Store categories
→ store_categories

Never keep multiple independent sources for the same business state.

---

## Architecture sprint

After every 3–5 larger features:

Schedule one Architecture Sprint.

Goals:

- reduce technical debt
- split large files
- simplify architecture
- improve documentation
- remove obsolete code
- improve readability
- keep modules independent

Architecture work is considered a feature, not maintenance.

---

## Long-term ownership

Selqiro must remain understandable even if the original developer is no longer involved.

A new developer should be able to understand a module in hours, not weeks.

The system should explain itself through:

- module names
- folder structure
- documentation
- clear responsibilities

---

## Simplicity over cleverness

Never choose a clever solution only because it is shorter.

Prefer:

- readable
- maintainable
- predictable
- testable

over

- clever
- compact
- difficult to understand

---

## Build for change

Assume every feature will change in the future.

Therefore:

- keep coupling low
- keep components independent
- avoid hidden dependencies
- isolate business logic
- isolate UI

Changing one module should not require changing unrelated modules.

---

## Documentation first

Every significant architectural decision must be documented.

Documentation is considered part of the source code.

Code without documentation is incomplete.

---

## The Portal Must Stay Calm

Selqiro should remain simple, fast, privacy-respecting and understandable.

New features should simplify the portal, not make it more complicated.

Every new feature must have a clear purpose and long-term value.

---

## One Change – One File

Whenever practical, one development task should modify only one primary module.

Preferred workflow:

1. Create folder (terminal)
2. Create file (terminal)
3. Replace whole file
4. Build
5. Test
6. Update documentation

Avoid editing many unrelated files during the same change.

Benefits:

- easier debugging
- easier rollback
- cleaner Git history
- safer development
- simpler ChatGPT-assisted development

---

## Engineering Standard Evolution

The Selqiro Engineering Standard is a living document.

Rules may evolve when:

- better development practices are discovered
- maintenance can be simplified
- reliability can be improved
- scalability requirements change
- long-term experience shows a better solution

Changes to the standard should always include the reason for the change.

The objective is continuous improvement rather than rigid adherence to old decisions.
