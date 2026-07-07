# Entities

Entities represent core Selqiro business objects.

Examples:

- identity
- profile
- listing
- service
- message
- energy
- payment
- admin case

Each entity should own its types, API/data access and mapping logic.

UI components should use entity APIs instead of querying Supabase directly.
