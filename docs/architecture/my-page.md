# My Page Architecture

## Current state

My Page is still too large.

## Target architecture

app/my-page/
- page.tsx
- components/
  - MembershipCard.tsx
  - LocationCard.tsx
  - LanguageCard.tsx
  - StoreCategoriesCard.tsx
  - BlockedUsersCard.tsx
  - ListingsGrid.tsx
  - ListingCard.tsx
- hooks/
  - useMembership.ts
  - useProfile.ts
  - useListings.ts
  - useLocation.ts
  - useStoreCategories.ts
  - useBlockedUsers.ts

## Principle

page.tsx should compose modules, not contain all business logic.

## Country selection

Location-related UI should not hardcode country options inside the component.

Near-term target:
- create shared `lib/countries.ts`
- import country options where needed

Long-term target:
- move country list into database table
- support periodic updates from trusted external sources
