# Server-only Energy mutation wrapper

This directory is the trusted TypeScript boundary for the production Energy
reservation state machine.

## Current scope

Implemented:

- server-only Supabase service-role client;
- Bearer-token validation through `auth.getUser(token)`;
- branded verified Energy actor;
- central feature contract and server-side price lookup;
- server-generated Energy operation keys;
- strict reserve / commit / release RPC result validation;
- safe SQL and PostgREST error mapping;
- metadata validation and size bounds.

Not connected yet:

- `/api/ai/analyze-listing`;
- any browser component;
- advertisements or featured visibility;
- payment flows;
- admin corrections.

## Price configuration

The wrapper intentionally does not invent a commercial Energy price.

Before connecting listing AI analysis, configure a positive integer on the
server:

```text
SELQIRO_ENERGY_COST_LISTING_AI_ANALYSIS
```

The browser must never submit the trusted Energy amount.

## Route usage

A server route should:

1. call `verifyEnergyActorFromRequest(request)`;
2. create or reuse a server-controlled operation key;
3. call `reserveEnergy`;
4. perform the external operation;
5. call `commitEnergy` after success;
6. call `releaseEnergy` after a technical failure.

The caller must retain the same operation key for retries of the same logical
operation.

## Security invariants

- `SUPABASE_SERVICE_ROLE_KEY` appears only in the server-only admin client.
- The browser cannot supply a trusted user ID, identity ID, wallet ID, paid /
  bonus split or Energy amount.
- Public metadata may be shown in Energy history.
- Internal metadata remains server-controlled.
- RPC responses are validated before they are returned to route code.
- Database error details stay in `internalMessage`; public messages are safe.
