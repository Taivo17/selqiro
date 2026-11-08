# Teadaolevad käsilolevad tööd

Seis: 08.11.2026 Europe/Tallinn. Üks praegune tööjärg on
`continuity/CURRENT_STATE.json`-is; see dokument ei ole teine NEXT-allikas.

## Hobuste kuulutused — teostatud, kasutuselevõtt ja vastuvõtt ootel

Kõik viis tüüpi kasutavad üht Avalda-toimingut; eraldi kohustuslikku mustandi
salvestamist ei ole. Privaatne jätkatav katse säilitab täpsed andmed, fotode
seosed, nõusoleku ja toiminguvõtme. Avaldatud kuulutuse muutmine käib Minu alast
ühe Salvesta muudatused toiminguga. Senine avalik versioon jääb alles kuni
revisjoniga kontrollitud tehingu kinnitamiseni.

Ühendatud on hallatud fotod, põhipilt/järjekord/lisamine/eemaldamine, avalik
detail, tüübiga ühine otsing, avaliku profiili kaardid ja olemasolevad vestlused.
Hobune säilitab oma UUID ega tekita tavalise kuulutuse koopiat.
Vt `architecture/horse-publication-v1.md`.

Esimese paketi Maci eelkontroll peatus enne muutmist. Ainult lugemise raport
kinnitas seniste funktsioonide koodi ja struktuuri vastavuse; erinevus oli viie
funktsiooni õiguste ja kahe automaatse rolliliikmesuse testmudelis. r2 kasutab
nende täpset tõendatud kuju. Vt `continuity/HORSE_PREFLIGHT_20261108.md`.

Kohalikud kliendi, serveri ja SQL-katsed on läbinud; see ei tõenda tootmise
paigaldust. r2 Maci käivitus, commit/push, Verceli Ready ja üks sisuline
kasutuskatse on veel ootel. Natiivset brauserit selles tööruumis ei olnud;
tegelike Reacti komponentide SSR ja kontrollerikatsed ei ole visuaalne
brauserikatse. Lõplik build'i tulemus on CURRENT_STATE-is.

Muudetavad seisud on `draft` ja `published`. `held_for_review`, `paused`,
`closed`, `rejected`, `archived` on lugemiseks. Uusi peatamise, arhiveerimise,
kustutamise ega uuendamise nuppe/lepinguid selles paketis ei lisata.

## Teenused — järgmine ühendatav domeen; töökuulutused hiljem

Olemasolev teenuste omaniku haldus ja avaliku profiili lugemine säilivad.
`/v2/services` näitab endiselt näidisandmeid, `/v2/service/[id]` on omaniku
vaade. Päris kataloog/detail/kontakt, revisjoniga kinnitatud salvestus ja hallatud
meedia tuleb ühendada kanoonilise `services` UUID peale. Kasutaja soovitud
voog on sisestamine → Avalda ning Minu ala → Muuda → Salvesta muudatused;
eraldi kohustuslikku mustandi salvestust ei lisata. Töökuulutused järgivad sama
loogikat hiljem. Vt `architecture/shared-marketplace-foundation.md`.

## EN/ET liides — kasutaja kuvatõmmistega kinnitatud

Keelevalik on olemas ning kasutaja näitas ingliskeelset avalikku otsingut ja
eestikeelset Minu ala. Inglise põhikeel/fallback, eesti teine keel ja üks konto
`profiles.language` eelistus säilivad. Hobuste uued toimingud on mõlemas keeles.
Keel ei muuda aktiivset identiteeti, kasutajasisu ega poolelioleva toimingu võtit.

Kasutajasisu ei tõlgita. Kinnitatavate õigusdokumentide praegune originaal on
eesti keeles; inglise liides selgitab seda. Ingliskeelsete poliitikaversioonide
ja tegeliku sisukeele metadata laiendamine vajab eraldi autoriteetset lepingut.

## Foto lisamine ja kuvamine — varasem vastuvõtt säilib

Tavalise kuulutuse kümne foto piir, avalik nähtavus, põhipilt, eemaldamine ja
koristus on kasutaja katsetega kinnitatud. Vastuvõetud commit `785c359`
(`Load the added photo while confirming gallery membership`) andis ühes
kasutaja katses 9 s lisamise. See pole püsiva keskmise lubadus. Frankfurt
`fra1` on kinnitatud; neid varasemaid vastuvõtte ilma uue regressioonita ei korrata.

## Üldine koristus enne avalikku avamist

Katkestatud/aegunud üleslaadimiste ja kogu kuulutuse terminalse koristuse täielik
püsiv taustateenus on eraldi töö. Hobuse kinnitatud toimingu piiratud
vastusejärgne koristus säilitab ebaõnnestumisel järjekorra; see ei ole kogu konto
lõpmatu taustakoristus. Tehniliste testpaneelide eemaldamine peab käima koos
täieliku taustal lõpetamisega.

## Diagnostika ajatemplid — varasem lahendus säilib

Parandatud r2 koguja lõpetas 07.11 kell 13:29 Python 3.9.6 all edukalt. Maci
lähtepuu ja index säilisid. Toonane 277 MiB reserv on ajalooline vaatlus;
vt `continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md`.
