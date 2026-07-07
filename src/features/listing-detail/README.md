# Listing Detail feature

Listing Detail owns the V2 listing detail workflow.

It uses the listing entity API.

Rule:

Do not query Supabase directly from Listing Detail UI components.

Flow:

ListingDetail UI
↓
feature hook
↓
listing entity API
↓
Supabase
