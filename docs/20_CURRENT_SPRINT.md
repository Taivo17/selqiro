# Current Sprint

## Name

Architecture Sprint 1

## Goal

Split My Page into smaller modules and create the Selqiro Knowledge System.

## Done

- MembershipCard created.
- Admin identity premium plan works.
- Engineering Handbook created.
- Development log created.
- AI Knowledge System started.

## Current task

Build and organize Knowledge System files.

## Next task

Extract LocationCard from My Page.

## Risks

- My Page is still too large.
- Premium migration is not fully completed across all files.
- Old profiles.is_premium logic may still exist.

## Test plan

- npm run build
- npm run dev
- test /my-page
- test /admin/identities

## Added architecture decision

Global country support:
Selqiro should not block users from unsupported countries. Country selection should move from hardcoded component options into shared architecture.
