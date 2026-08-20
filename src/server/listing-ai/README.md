# V2 listing AI Energy route foundation

This folder contains the server-only support code for the Energy-backed V2
listing analysis contract.

## Contract

```text
contractVersion: v2-energy-1
feature: listing_ai_analysis
model: gpt-4.1-mini-2025-04-14
image detail: low
image count: exactly one primary image
local test price: 25 Energy
```

The browser sends:

- `X-Selqiro-AI-Contract: v2-energy-1`;
- a Bearer token;
- the matching `contractVersion` body field;
- an idempotency UUID v4;
- optional title;
- optional description;
- one resized primary-image data URL.

The server derives the trusted Energy operation key by prefixing the UUID with
the server-owned feature name. The browser cannot choose the feature or Energy
amount.

## State flow

```text
select versioned contract
→ verify actor
→ parse and validate request
→ reserve Energy
→ reject duplicate in-flight requests
→ call OpenAI
→ validate and normalize result
→ commit Energy
```

A technical failure attempts to release the reservation. Successful commit
metadata stores a compact result snapshot and token/cost telemetry so a retry
with the same idempotency key can return the prior result without another
OpenAI request.

## Cost telemetry

The stored usage snapshot includes:

- OpenAI response ID and returned model;
- input tokens;
- cached input tokens;
- cache-write token count when present;
- output and total tokens;
- request duration;
- estimated provider cost based on the pricing version recorded in the
  snapshot.

The estimate is calibration data, not the final Selqiro retail price.

## Legacy boundary

The existing `/sell` caller remains on the legacy Premium/daily-limit branch of
`/api/ai/analyze-listing`. The new Energy branch is selected only by the
`X-Selqiro-AI-Contract: v2-energy-1` request header, and the matching body
contract version is validated after authentication.

The legacy branch will be removed only after the V2 flow is complete and the
mobile sell navigation no longer depends on `/sell`.
