<!-- SELQIRO_RETIRED_WEB_PENDING_20261106 -->
## 06.11.2026 — eemaldatud WEB-i puudumise kontroll vajab värsket vastust

Kuulutuse 201 päris raport kinnitab retry_wait/try2/last_error=response;
Storage’i objekti/upload’i/osade metaandmed on juba puudu, kuid lõpetamistõend
ja 4 MiB loogilise reservi vabastus on veel ootel. Väljastatud koodis tähendab
response aktsepteeritud DELETE-i järel mittetühja kontroll-GET-i vastust.
Vahemälu on toetatud seletus, HTTP-päiseid raport ei sisalda.

Ettevalmistatud väike parandus annab ainult kustutamisjärgsele GET-ile uue
juhusliku cacheNonce’i. Olemasolev SQL ja õiguse/puudumise kontrollid säilivad.
Paranduse tegelik vastuvõtt jääb uue commit’i Ready/Production ja ühe olemasoleva
koristussammu järel loetava nulli ootele. Käivitamisjuhis on CURRENT_STATE-is;
raport ja järelduste piir RETIRED_WEB_DIAGNOSTIC_20261106.md-s.

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

## Published photo lifecycle — remaining public-launch work, 2026-11-06

The user accepted non-primary photo removal and the following primary-image
change on 2026-11-05. The next prepared slice adds bounded Storage cleanup for
that already-retired WEB object and releases its existing logical reservation
only after authoritative absence. Prepared code is not production acceptance;
see the one current state record for installation and validation evidence.

The new cleanup uses the existing ledger and one-object transport. It does not
finish all photo lifecycle cases. Adding/replacing published photos, failed or
unfinished uploads, other terminal WEB objects and automatic completion
independent of the owner page remain to be finished before public launch.

Ordinary users must not see technical cleanup counters or be responsible for
advancing cleanup at public launch. The current test panels are intentionally
retained at the user's request. Hiding a panel does not supply a background
worker. See `docs/architecture/hosted-retired-web-cleanup-v1.md` and the
authoritative `docs/continuity/CURRENT_STATE.json`.
