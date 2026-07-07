# Identity entity

Identity is one of the most important Selqiro concepts.

One account can have multiple identities.

The active identity controls:

- My Area context
- messages context
- listings context
- services context
- Energy wallet context later
- public profile context

Old code reference:

- profiles.active_identity_id
- get_my_identities RPC
- identity_profiles table
- get_my_active_identity_profile / details RPCs

V2 production goal:

Create one clean active identity module.

Do not duplicate active identity logic across many pages.
