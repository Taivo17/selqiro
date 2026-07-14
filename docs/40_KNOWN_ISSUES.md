# Known Issues

## My Page is too large

app/my-page/page.tsx is still too large and should be gradually split into components and hooks.

## Premium migration incomplete

Admin uses identity_profiles.plan correctly.

Some user-facing pages may still use old profiles.is_premium / premium_until logic.

## Documentation structure new

Knowledge System files have been created and need to be kept updated after each sprint.

---

## V2 active identity setter needs a secure RPC

Current file:

- `src/entities/identity/api/setActiveIdentity.ts`

Current behavior:

- writes `profiles.active_identity_id` directly from a client-provided identity ID
- the entity API does not independently verify that the requested identity is available to the current user

Risk:

- this method should not be exposed as the final V2 identity switcher without a database authorization check

Required future fix:

- create a secure active-identity RPC
- accept the requested identity ID
- verify access using the same private-owner / active-business-member rules
- update only the authenticated user's profile
- return the resolved active identity
- refresh all V2 active-identity modules after success

Store category creation does not rely on this client setter for authorization.
Its RPC validates the stored active identity independently.
