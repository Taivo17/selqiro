> **Ajalooline dokument — praegune tööjärg on muutunud.**
>
> Parandatud suhtluse kataloogi kontroll on edukalt vastu võetud ja kõigi 20 funktsioonikeha võrdlus on lõpetatud. Allolev tekst ja käsud säilitavad varasema tööetapi seisu; neid ei kasutata praeguse järgmise sammu käivitamiseks.
>
> Ainus praegune paigaldusjuhend: [HOSTED_PORTAL.md](../continuity/HOSTED_PORTAL.md). Järgmine moodul: [uute kontaktide ja sõnumite konto kontroll](account-contact-write-fence-v1.md).
>
> Ka kaasnev `account-next-after-job-read-20261124.sources.json` on varasema lähtekoodiauditi muutumatu hetkepilt. Selle päritoluandmed ei tähista uut tegemata diagnostikat.

# Kontoelutsükli järgmine alametapp pärast tööde avaliku lugemise vastuvõttu

24.11.2026, Europe/Tallinn. Kitsas lähteaudit vastu võetud commit'ile
`e336a5b9d02845c688def778babeac0f1e3fec95`, puu
`7734a70aa174b25b2ce5cc85aca3c0fa4e628624`.
Viidatud failide baidid ja räsid sobivad selle puu vastu võetud inventariga.
Täpsed pin'id on kõrvalfailis `account-next-after-job-read-20261124.sources.json`.

## Üks soovitus

**Järgmine kontoetapp on uue kontakti ja sõnumi kontoõiguse ühine piir.**
Tegutseja ja saaja konto kättesaadavust kontrollitakse serveris/andmebaasis,
säilitades aktiivse vestluspartneri senise ajaloo ja olemasolevad kviitungid.
Ettevalmistuse esimene puuduv tõend on kitsalt selle piiri tegelik live-eelseis.
Konto sulgemist, taastamist ega lõplikku kustutamist veel ei aktiveerita.

Kasutaja täpsustatud tööjärg on **kontoelutsükkel → jälgitavate poodide/profiilide
Uudised → esiletõstmine → reklaamid**. Uudised koondab jälgimisnimekirja uusi
kuulutusi ja teateid ning on järgmine sisuline tootetöö pärast kontoelutsüklit.
See jooksva vestluse täpsustus täiendab vanemate dokumentide reklaamitööde järjekorda.

## Miks see on järgmine loogiline osa

Tööde avalik otsing, detail ja profiililoend kasutavad nüüd konto kättesaadavust.
Kontakt, kirjutused ja korduskviitungid jäid samas etapis teadlikult muutmata
(`account-job-read-fence-v1.md`, `account-job-read-next-20261124.md`).
Pakkumise korrektne avalik peitmine ei tõenda otsese kontakti- või saatmiskäsu
sama konto piiri järgimist.

Konkreetne olemasolev ahel on `public.contact_my_job_provider_v1` →
`listing_contact_private.require_actor_hosted_v1` →
`jobs_private.contact_snapshot` → `listing_contact_private.require_peer`.
Allikad: `supabase/repairs/20261116_jobs_public/07_contact.sql` ja
`supabase/repairs/20261121_personal_jobs/05_contact.sql`.
`public.send_my_message_v2` kasutab samuti actor/peer kontrolle
(`supabase/repairs/20261030_messaging_restore/changes.sql`).

Vaadatud `require_peer` lähtekeha kontrollib identiteeti, profiili ja vajadusel
ettevõtte liikmesust; eraldi kontooleku kontrolli seal pole
(`supabase/labs/listing-contact-integration-v1/01_contact.sql`). Hosted actor'i
ajalooline aktsepteeritud fixture suunab publication actor helperisse
(`supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql`).
Need on lähteviited, mitte tänaste live-kehade uus kinnitus.

Olemasolev `account_lifecycle_private.account_is_available(uuid)` on ühine
konto aktiivsuse ja Auth kättesaadavuse lugemisreegel
(`supabase/releases/account-public-profile-fence-v1/account-availability.sql`).
Selle olemasolu ei tõenda kirjutuse ja hilisema sulgemise võistluse lahendamist.

## Mis on olemas ja mis peab säilima

| Olemas | Järgmise mooduli piir |
| --- | --- |
| Ainult `active` olekut lubav konto vundament ja Minu konto vaade. | Olekute laiendamist ega sulgemise nuppu selles etapis ei lisata. |
| Nimetatud avalike profiili- ja pakkumiselugejate konto kontrollid. | Samu teste ega vastuvõttu ei korrata selle auditi tõttu. Kõigi vanade otseteede katvust sellest ei järeldata. |
| Kontakti/sõnumi konto ja identiteedi paarid, blokeeringud ning kviitungid. | Säilib sama request_key korduse tulemus; uus kirjutus eristatakse olemasoleva kviitungi lugemisest. |
| `messaging_private_v2.exact_thread` määrab senise ajaloo osaluse. | Saaja konto tulevane piirang ei tohi eemaldada seoseid ega peita aktiivse partneri senist ajalugu. |

Shared actor helperit kasutavad ka ajaloo lugemise ja piltide teed. Täpne
muudatuskoht valitakse piiratud kutsujate liigituse järel; ühise helperi
asendamist ei käsitleta automaatselt ainult saatmiskäskude muudatusena.
Uue suhtluse ja ajaloo õiguste eristus on juba nõutud olemasolevas
`account-lifecycle-server-contract-v1.md` sulgemisprotokolli punktides 3–4.

## Milline live-tõend tegelikult puudub

22.11 põhikataloog ja selle 11 funktsiooni on vastu võetud;
`docs/continuity/ACCOUNT_CATALOG_ACCEPTED_20261122.md` järgi sama vaatlust ei
korrata. 24.11 tööde raport kaitseb job-contact funktsiooni ja snapshot'i keha,
kuid job-read kataloogi fikseeritud loend ei kogu shared actor/peer helper'eid
(`supabase/releases/account-job-read-fence-v1/catalog-query.sql`).

Enne järgmise SQL-paketi koostamist on vaja **ainult valitud suhtluspiiri**
tegelikke funktsiooni-, omaniku-, konfiguratsiooni- ja õigusepinne:
`listing_contact_private.require_actor_hosted_v1(uuid,uuid)` ning
`listing_contact_private.require_peer(uuid,uuid)` koos selle muudatuse otseste
contact/send kutsujate ja seotud kirjutuskaitsetega. Juba tõendatud job-contact
pinne kasutatakse uuesti; uut täielikku konto-, sisu-, meedia- või sõnumikataloogi
selle põhjendusega ei avata. Puuduv või erinev täpne funktsioonikeha loetakse
ainult siis, kui räsi võrdlemisest ei piisa. Kontode, sõnumite ja sessioonide
andmeridu pole selle eelseisu tõendamiseks vaja.

Aktiivse eraisiku töö päris brauseritee jäi viimases kasutajakontrollis vaatlemata,
sest kasutaja kinnitusel sellist pakkumist hetkel pole. Olemasoleva ettevõtte töö
otsing/detail/profiil oli nähtav. Uut sisu selle puuduse täitmiseks ei nõuta;
see ei muuda vastuvõetud public-job tulemust ega asenda suhtluse live-eelseisu tõendit.

## Mis jääb sulgemise ette ka pärast seda

Ülejäänud kirjutuste ja lõpliku avaldamise/sidumise piirid, manused ja meedia
(sh vanad avalikud URL-id), sessioonid, värske sama konto autentimine,
sulgemise/taastamise võistlused ning registreerimise algprofiili kontooleku seos
vajavad lõpetamist. Need on olemasoleva
`account-lifecycle-verification-plan-v1.md` sulgemise väravad.
Ühe valitud eraisiku või ettevõtte profiili kokkulepe ja SMTP/sisselogimise paus
säilivad (`account-model-lifecycle-20261122.md`). Lõppkustutamise andmeliigi-
ja säilitamisreeglid on eraldi järgnev etapp.

## Auditi tõendi piir

Loeti vajalikke olemasolevaid dokumente ja lähtekehi ning võrreldi pinne
aktsepteeritud inventariga. Ei käivitatud teste, build'i, uuendajat, CLI-d,
SQL-i ega rakenduse RPC-sid; pilveteenuseid, Maci, kontosid või lähtekoodi ei
muudetud. Valminud runnerreview jäi muutmata. Vanade dokumentide NEXT-pealkirjad
ja aegunud järgmise töö käsud ei ole tänased käivitamisjuhised.

Lähtutud Maci raporti SHA-256:
`76ee0b1d3dc42838b7ddcafec65c4903638da50adb43a90cff1a271f6f97c629`.
Selle offline vastuvõtt ei ole uus live-vaatlus.
