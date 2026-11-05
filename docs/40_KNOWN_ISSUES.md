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

## Published photo lifecycle — remaining public-launch work, 2026-11-04

The current small removal candidate removes a non-primary photo from the active
gallery and revokes its media routes. Its private WEB object remains queued and
charged until a separate, proved cleanup capability completes. The removal
command does not claim physical deletion or release that reservation.

Adding/replacing published photos, retired/terminal WEB cleanup and automatic
completion independent of the owner page remain to be finished. Before public
launch, ordinary users must not see technical cleanup counters or be responsible
for advancing cleanup. The current test panel is intentionally retained at the
user's request. See `docs/architecture/published-listing-photo-removal-v1.md` and
the authoritative `docs/continuity/CURRENT_STATE.json` for actual delivery state.
