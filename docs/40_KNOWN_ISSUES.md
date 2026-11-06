<!-- SELQIRO_PUBLISHED_PHOTO_ADDITION_20261106 -->
## 06.11.2026 — avaldatud kuulutusele foto lisamine on ette valmistatud

Ühe foto lisamine kasutab olemasolevat privaatset pilditöötlust. Lisatud foto
püsiv päritolu, põhipildi muutmine, eemaldamine ja sellega seotud koristus
kasutavad sama kuulutuse õiguskontrolli. Tegelik Maci paigaldus, uus commit,
Production-deployment ja kasutaja lisamiskatse on kinnitamata; tööjärg on
CURRENT_STATE-is. Varasem fotoeemaldus ja konkreetne koristuskatse on vastu võetud.

Avaliku avamise eel jäävad vajalikuks pooleliolevate/katkestatud üleslaadimiste
ning kõigi terminalsete objektide automaatne lõpetamine, reservi vabastamine ja
tehniliste paneelide eemaldamine tavavaatelt. Lisamine ei tähenda selle taustatöö
valmimist. Foto vahetamine ühe asendustoiminguga ei kuulu käesolevasse sammu.

<!-- SELQIRO_RETIRED_WEB_ACCEPTED_20261106 -->
## 06.11.2026 — kuulutuse 201 koristuskatse on kasutaja poolt vastu võetud

Kasutaja kinnitas koristuspaneeli kadumist. Hilisem kuvatõmmis näitab kahte
alles jäetud fotot ja Mercedese põhipilti. Varasem nähtav kinnijäämine on selle
kasutuskatse piires lahendatuks märgitud; uut korduskatset ei nõuta.

Uue paranduse täpne commit/Ready-rida ning lõpetamisjärgne SQL-kviitung või
reservinäit pole selles tõendis esitatud. Need ei ole sama mis nähtav vastuvõtt.
Dateeritud diagnoos säilib RETIRED_WEB_DIAGNOSTIC_20261106.md-s ja praegune
järgmine samm CURRENT_STATE-is. Avaliku avamise eel tuleb lõpetada automaatne
koristus ning eemaldada tehnilised loendurid ja nupud tavakasutaja vaatest.

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
change on 2026-11-05. On 2026-11-06 the user also accepted the removed-photo
cleanup journey for listing 201: the cleanup panel disappeared while the two
retained photos and the Mercedes primary image remained visible. This is
user-visible acceptance; a fresh database receipt, quota reading and exact fix
commit/deployment identity were not supplied with that confirmation. See the
one current state record for these evidence boundaries.

The new cleanup uses the existing ledger and one-object transport. It does not
finish all photo lifecycle cases. Adding a published photo is now implemented
in prepared source; its installation and real user acceptance remain pending.
Replacement as one operation, failed or unfinished uploads, other terminal WEB
objects and automatic completion independent of the owner page still require
explicit completion before public launch.

Ordinary users must not see technical cleanup counters or be responsible for
advancing cleanup at public launch. The current test panels are intentionally
retained at the user's request. Hiding a panel does not supply a background
worker. See `docs/architecture/hosted-retired-web-cleanup-v1.md` and the
authoritative `docs/continuity/CURRENT_STATE.json`.
