<!-- SELQIRO_PHOTO_PICKER_PREPARED_20261107 -->
## 07.11.2026 — fotovalik, piirangute põhjus ja V2 keelekatvus

Stopperiga kasutajakatsed võtsid 17 ja 19 sekundit. Täpne tootmise etapijaotus
pole veel teada; varasema ligikaudse 27–31 sekundiga ei arvutata kinnitatud
protsentuaalset kiirenemist. Olemasolev mõõtmine jääb järgmise kitsaskoha aluseks.

Otsene fotovalik ja konto kolme ajutise piirangu eraldi teated on uues
lähtepaketis ette valmistatud. Viie foto juures nähtud täpne keeldumise põhjus
on veel tuvastamata; koodis on kümme aktiivset fotot. SQL-i piire ei muudeta
üldise veateate põhjal. Uus teade ja edasine üks kasutuskatse on kirjas
`continuity/PHOTO_PICKER_REVIEW_20261107.md`-s ning CURRENT_STATE-is.

V2 pole täielikult kakskeelne: päises, vormides, kategooriates ja veateadetes
on eestikeelsed püsisõned. Kinnitatud suund on English põhikeel/varukeel,
Eesti teine keel ning olemasolev profiles.language + lib/i18n. Järgmine
terviklik etapp peab katma kogu praeguse kuulutuse kasutustee mõlemas keeles.
Vt `architecture/interface-language-v1.md`. Praegune fotovalikupakett seda
lõpetatuks ei märgi.

Allpool olevad kuupäevaga sissekanded on varasemad tõendipiirid, mitte uued
paigaldamiskäsud. Koristuse automaatne lõpetamine ja tavakasutaja tehniliste
paneelide eemaldamine jäävad enne avalikku avamist vajalikuks.

<!-- SELQIRO_PHOTO_SPEED_PREPARED_20261106 -->
## 06.11.2026 — foto kiirendus valmistatud; tootmise ajavõrdlus ootel

Foto lisamine ja avalik nähtavus on kasutaja poolt vastu võetud. Uus ligikaudne
kogukestus on 27–31 sekundit. Valmis on ühine brauseri ettevalmistus ja piiratud
etapiajad. Suurte kohalike võrdlusfailide saatmismaht vähenes; tootmise kiiruse
paranemist pole veel mõõdetud. Täpne Verceli deployment ja võrdluskatse tulevad
pärast uue source-only paketi rakendamist. Vt CURRENT_STATE ja
`continuity/PHOTO_UPLOAD_PERFORMANCE_20261106.md`.

Serveri ja andmebaasi õiguste, failiräsi ning kviitungi kontrollid säilivad.
Tehnilise koristuse nähtavus jääb testimise ajal seniseks. Pooleliolevate või
katkestatud üleslaadimiste ning terminalsete objektide automaatne lõpetamine,
reservi vabastamine ja paneelide eemaldamine tavakasutaja vaatest on endiselt
avaliku avamise eelne töö. Foto vahetamine ühe asendustoiminguga ei ole selle
kiirendusparanduse osa.

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
finish all photo lifecycle cases. On 2026-11-06 the user confirmed that adding a
published photo works and the new image is visible publicly. This functional
acceptance is complete; an exact installation/commit/deployment receipt was not
supplied with it. The user also reports slower V2 addition than V1; per-stage
production timing remains unmeasured. See PHOTO_UPLOAD_PERFORMANCE_20261106.md.
Replacement as one operation, failed or unfinished uploads, other terminal WEB
objects and automatic completion independent of the owner page still require
explicit completion before public launch.

Ordinary users must not see technical cleanup counters or be responsible for
advancing cleanup at public launch. The current test panels are intentionally
retained at the user's request. Hiding a panel does not supply a background
worker. See `docs/architecture/hosted-retired-web-cleanup-v1.md` and the
authoritative `docs/continuity/CURRENT_STATE.json`.
