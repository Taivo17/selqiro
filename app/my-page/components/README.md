# My Page Components

This folder contains UI components used by `app/my-page/page.tsx`.

## Component status

### MembershipCard
Status: implemented

Purpose:
Shows account plan status and premium invite actions.

### LocationCard
Status: planned

Purpose:
Shows and edits user's local marketplace region.

### LanguageCard
Status: planned

Purpose:
Shows and edits user's preferred portal language.

### StoreCategoriesCard
Status: planned

Purpose:
Manages seller's own store sections.

### BlockedUsersCard
Status: planned

Purpose:
Shows blocked users and allows unblocking.

### ListingsToolbar
Status: planned

Purpose:
Search, status filter and store-section filter for user's listings.

### ListingsGrid
Status: planned

Purpose:
Displays user's listings.

### ListingCard
Status: planned

Purpose:
Displays one listing card with actions.

## Rule

Each component should have one clear responsibility.

Large UI blocks should be moved out of `page.tsx` into these component files.
