# Listing entity

Listing entity owns product listing data access and mapping for V2 production code.

Old portal reference:

- marketplace uses get_marketplace_listings RPC
- nearby mode uses get_marketplace_listings_nearby RPC
- listing detail loads listings with listing_images relation
- UI should not query Supabase directly

V2 production rule:

Product Discovery and Listing Detail should use listing entity APIs.

Do not scatter listing Supabase queries across UI components.
