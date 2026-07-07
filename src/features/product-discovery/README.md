# Product Discovery feature

Product Discovery owns the V2 product browsing workflow.

It uses listing entity APIs for data access.

Rule:

Do not query Supabase directly from Product Discovery UI components.

Flow:

ProductDiscovery UI
↓
feature hook/component
↓
listing entity API
↓
Supabase/RPC
