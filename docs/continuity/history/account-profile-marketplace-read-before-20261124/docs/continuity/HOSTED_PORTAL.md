# Hobusekuulutuste konto-oleku kontroll on vastu võetud

24.11.2026 Europe/Tallinn. Main **ac5521a** on Maci raporti järgi puhas ja pushitud.
Üks SQL rakendamine ning eraldi järelkontroll kinnitasid kahe hobuselugeja konto
sobivuse kontrolli. Sama commit on kasutaja Verceli pildil Ready / Production;
kasutaja kinnitas „kuulutused avanevad” ja lisas tegelike portaalivaadete pildid.

## Lõpetatud käik

Selle paketi uuendajat ja SQL-i ei käivitata uuesti. Algsed paketid, raportid ja
päevikud säilivad. Käesolevad vastuvõtudokumendid on ette valmistatud järgmise
koodipaketi jaoks; nende pärast pole Maci kirjutust, uut build’i, commit’i ega
push’i tehtud. Käsitsi kopeerimist ega uut diagnostikapakki pole vaja.

## Üks järgmine töö

Siduda avaliku profiili kuulutuste ja poerubriikide eraldi lugejad sama kontoolekuga:

- `get_public_profile_marketplace_v1`;
- `get_public_profile_marketplace_v2`;
- `get_public_profile_store_categories_v2`.

Profiili päise kontroll ei asenda nende iseseisvalt kutsutavate lugejate kontrolli.
Ühine rubriigilugeja teenindab nii marketplace kui services ulatust: profiili
konto kontroll peab kehtima mõlemale, teenuste senine sobivusloogika säilib.
Täpne piir, allikad ja vajalikud sihitud kontrollid on
`docs/architecture/account-profile-marketplace-read-next-20261124.md`-s.

Enne järgmist Maci kirjutust kontrollitakse tegelikku lähtepuud, indeksit,
haru/HEAD-i, remote’i ja SQL eelseisu. Selle järgmise mooduli teostust ega
paigalduskäsku pole veel väljastatud.

Konto sulgemise/taastamise/kustutamise tegevus järgneb vajalike avalike lugemiste,
kirjutamise, sõnumite ja pilditeede terviku valmimisele. Ühendatud laiotsingu
optimeerimine jääb eraldi tööks enne suuremat sisuhulka ja liiklust. SMTP paus
ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
