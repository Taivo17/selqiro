<!-- SELQIRO_SERVICE_PREFLIGHT_R2_20261108 -->
## 08.11.2026 — Teenuste esimene paigaldus peatus enne muudatusi

Esimese teenuste paketi tegelik raport kinnitab `DATABASE_PRECONDITIONS_NOT_MATCHED`
peatust enne SQL-i rakendamist, lähtefailide muutmist, build'i, commit'i ja push'i.
Raporti SHA256 on `6430306e81abdae9cf961a1c3722ab6e47f1a86f24f2cfa39d99f824efa61af2`.
Kõik 1255 lähtefaili ja 87 sihtfaili algolekut vastavad vastu võetud alusele;
tegelik Maci commit on `78209e8ed0c7330b117d7db070b733eda5aa1723`.

Põhjus oli kohalikus SQL-katsekeskkonnas: teenuserubriigi tabeli varasemad
TABLES-vaikeõigused jäid taastamata ja kahe vana teenusefunktsiooni juurde jäi
hilisemate FUNCTIONS-vaikeõiguste tõttu anon EXECUTE. Algallikate järgi taastatud
õigused annavad mõlemad päris raporti räsi täpselt. r2 uuendab sellest tuletatud
eel- ja järelkontrollid; teenuste rakendus ning kaheksa SQL-moodulit ei muutu.
Täpseid kontrolle ei nõrgendata. Esimene pakett ja peatunud päevik säilivad.

Praegune käsk ja tõendipiir on `docs/continuity/HOSTED_PORTAL.md` ning
`docs/continuity/CURRENT_STATE.json`. Kasuta `selqiro-teenused-20261108-r2.zip`.
Teenuste uus paigaldus ja kasutuskatse on veel ootel. Hobuse vahetu muutmine,
korduv salvestamine ja galerii jäävad kasutaja poolt vastu võetuks.
Allpool olevad esimese teenuste paketi tööjärg ja teadmata-commit kirjeldus on ajalugu.

---

<!-- SELQIRO_SERVICE_PUBLICATION_20261108 -->
## 08.11.2026 — praegune seis: hobuse muutmise vastuvõtt tehtud

Kasutaja kinnitas kohe avaneva muutmisvormi, korduva salvestuse ja kõigi
muudatuste nähtavuse avalikus vaates. „Muuda uuesti” eeltingimuse viga on
kasutuskatse järgi lahendatud. Galerii ja hobuse elutsükli varasem vastuvõtt
säilib; nende korduskontroll ei ole teenuste töö eeltingimus.

Teenuste uus kandidaat ühendab avaldamise, omaniku muutmise ja fotod ning
asendab avalikud näidisandmed päris teenuste lugemisega. Kohaliku kontrolli
ja live-paigalduse piir on continuity/CURRENT_STATE.json-s. Teenuste päris
kasutuskatse on vajalik pärast uut paigaldust, mitte väidetavalt juba tehtud.
Quick Update, live-asukoht, üldine taustakoristus ja töökuulutused jäävad
järgnevateks töödeks. Allpool olevad varasemad „järgmine/ootel” kirjed on ajalugu.

Teenuste 75 sihitud katset, tootmiskooste ja muudetud failide lint läbisid.
Ühise `public-profile-offerings.test.cjs` neli vana veateksti ootust annavad
sama tõrke nii kandidaadis kui ka muutmata hobusemuutmise lähtealuses:
varasem tõlkeuuendus tagastab sõnumivõtme, test ootab sõnasõnalist teksti.
See on eraldi testivõlg; teenuste tarne ei muuda neid vanu ootusi.

---

# Praegune parandus — muutmisvaate avamine

Seis: 08.11.2026 Europe/Tallinn. Tänane tööjärg on `continuity/CURRENT_STATE.json`.

Kasutaja on vastu võtnud galerii noolte peitumise/tagasituleku ja sama hobuse
salvestatud faktilise kinnituse kasutamise. Juba vastu võetud galerii, pisipildi,
pildilinkide, peatamise/aktiveerimise ning tähtaja katsed säilivad.

Uus probleem on muutmisvaates taastatud varasema lõpetatud salvestuse olek:
see jättis väljad lukku kuni all oleva „Muuda uuesti” vajutamiseni. Parandus
annab pärast tulemuse kontrollimist ja vormi laadimist kohe muudetavad väljad
ning kasutab üht „Salvesta muudatused” toimingut. Pooleliolevat teadmata
salvestust ei kustutata selle nimel ning teise vahekaardi tulemus ei kirjuta
üle kohalikku salvestamata teksti. Vt `architecture/horse-direct-edit-v1.md`.

See on lähtekoodi parandus; uue paketi Maci paigaldus, Verceli Ready ning üks
vahetu muutmise/salvestamise kasutuskatse järgnevad kohalikele kontrollidele.
Teenused jätkuvad pärast seda sama kasutusloogikaga. Allpool on varasem ajalugu.

---

# Teadaolevad käsilolevad tööd

Seis: 08.11.2026 Europe/Tallinn. Tänane tööjärg on `continuity/CURRENT_STATE.json`.

## Praegu: galerii noolte ja hobuse kinnituste viimistlus

Kasutaja kinnitas eelmise halduse paranduse brauserikäitumise: galerii, pildilingid,
omaniku pisipilt, peatamine/muutmine/aktiveerimine ja eraldi tähtaja uuendamine.
Need on vastu võetud. Uus parandus taastab noolte peitumise 3 sekundi järel ja
kasutab olemasolevat algset faktilist kinnitust sama hobuse muutmisel.
Kehtivate tingimuste versioon ei ole sama mis kuulutuse faktiline kinnitus.
Kohalik tõend ning uus paigalduspiir on `continuity/CURRENT_STATE.json`-s;
leping on `architecture/horse-confirmation-reuse-v1.md`.

Teenused järgnevad sama Avalda / Minu ala Muuda–Salvesta vooga ilma kohustusliku
mustandita. Püsiv kuulutuste arvupiir on otsustamata. Üldine terminalne
koristus ja olemasolevate 3-avatud/20-uut-toimingut kaitsete lõplik tooteotsus
jäävad eraldi tööks.

## Varasem checkpoint — allpool ajalooline seis enne uut hobuse brauseritulemust

Allolevad paigalduskäsud ja „ootel” märked ei asenda tänast CURRENT_STATE.json-i.

# Teadaolevad käsilolevad tööd

Seis: 08.11.2026 Europe/Tallinn. Üks praegune tööjärg on
`continuity/CURRENT_STATE.json`-is; see dokument ei ole teine NEXT-allikas.

## Kahe foto lisamine — ajutise ruumi arvestuse parandus

Esimene ruumiparanduse pakett peatus eelkontrollis enne SQL-i või lähtefailide
muutmist, build'i, commit'i ja push'i. Puudus oli kohalikus kontrollaluses:
17 varem paigaldatud privaatse funktsiooni taastamine täpsetest säilitatud
SQL-määratlustest koos algsete õiguste/omanikega reprodutseerib tegeliku
raporti funktsioonide ja sõltuvuste räsid. Parandatud kandidaat on
`selqiro-uleslaadimise-ruum-20261108-r2.zip`; tööloogika ja kolm SQL-moodulit
jäävad samaks. Vana peatuse päevik säilib. R2 paigaldus ja Ready on veel ootel.

Hobuse kahe fotoga avaldamine peatus reservipiiril. Kontrollitud raportis oli
259 MiB reserve: 175 MiB koristamist ootavaid avaldatud SOURCE-algfaile ja
84 MiB juba avaldatud WEB-galeriipilte. Kaks uut fotot lisasid 58 MiB ning
vana kontroll sai 317 > 300 MiB. See ei olnud tegeliku kettamahu mõõtmine ega
kasutajaga kokku lepitud püsiv kontopiir.

Valmistatud parandus eristab ajutist üleslaadimistööd avaldatud galeriist.
Sama kontroll on enne koristamist 175 + 58 = 233 MiB. SOURCE-reserv vabaneb
endiselt alles pärast värsket Storage'i puudumiskontrolli ja seotud püsivat
kinnitust. Sama algse kasutaja lubatud identiteetide avaldatud SOURCE-objekte
lõpetab piiratud taustakäik; WEB-pilte see võime ei kustuta. Uusi fotosid
mitte lisav toiming ei vaja uut pildireservi ning jätab vahele ainult baitide
kontrolli. Vt `architecture/upload-capacity-v1.md` ja
`continuity/UPLOAD_CAPACITY_20261108.md`.

Kasutaja eesmärk on mitusada kuulutust; täpne püsiv arvupiir on otsustamata.
300 MiB on selles paranduses ajutise töö kaitse. Kolm avatud toimingut ja
20 uut toimingut jooksva 24 tunni jooksul jäävad eraldi kasutuselevõtukaitsetena
alles; need ei määra konto avaldatud kuulutuste arvu ning vajavad enne laiemat
kasutust eraldi otsust. Parandatud r2 Maci paigaldus, Ready ning sama kahe
fotoga hobuse avaldamise vastuvõtt on ootel. Praegune käsk ja jätkamissammud
on ainult `continuity/HOSTED_PORTAL.md`-s.

## Hobuste kuulutused — r2 paigaldus edukas, avaldamise vastuvõtt jätkub

Kõik viis tüüpi kasutavad üht Avalda-toimingut; eraldi kohustuslikku mustandi
salvestamist ei ole. Privaatne jätkatav katse säilitab täpsed andmed, fotode
seosed, nõusoleku ja toiminguvõtme. Avaldatud kuulutuse muutmine käib Minu alast
ühe Salvesta muudatused toiminguga. Senine avalik versioon jääb alles kuni
revisjoniga kontrollitud tehingu kinnitamiseni.

Ühendatud on hallatud fotod, põhipilt/järjekord/lisamine/eemaldamine, avalik
detail, tüübiga ühine otsing, avaliku profiili kaardid ja olemasolevad vestlused.
Hobune säilitab oma UUID ega tekita tavalise kuulutuse koopiat.
Vt `architecture/horse-publication-v1.md`.

Esimese paketi Maci eelkontrolli peatus jääb ajalukku. Hilisema r2 tulemuse
`complete`, andmebaasi kontrolli, build'i ja push'i edu on tagastatud raportiga
kinnitatud. Praegune puhas `main` on
`6bb438519570faa0e42f56e0670e32965cfd62fb`, 1165 lähtefaili. R2 uuesti ei
paigaldata. See tõend ei asenda uue ruumiparanduse Verceli Ready ega praegu
pooleli oleva kahe fotoga avaldamise kasutajakatset.

Muudetavad seisud on `draft` ja `published`. `held_for_review`, `paused`,
`closed`, `rejected`, `archived` on lugemiseks. Uusi peatamise, arhiveerimise,
kustutamise ega uuendamise nuppe/lepinguid selles paranduses ei lisata.

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
püsiv taustateenus on eraldi töö. Praegune raport näitas null arvestuses
terminalset objekti; sellest ei järeldu terminalse koristuse valmidus.
Avaldatud SOURCE-failide piiratud vastusejärgne lõpetamine säilitab
Storage’i või andmebaasi vea korral järjekorra ja kinnitamata reservi.
See ei ole lõpmatu püsiv taustateenus. Tehniliste testpaneelide eemaldamine
peab käima koos täieliku taustal lõpetamisega.

## Diagnostika ajatemplid — varasem lahendus säilib

Parandatud r2 koguja lõpetas 07.11 kell 13:29 Python 3.9.6 all edukalt. Maci
lähtepuu ja index säilisid. Toonane 277 MiB reserv on ajalooline vaatlus;
vt `continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md`. Praeguse paranduse
259 MiB vaatlus ja selle ulatus on `continuity/UPLOAD_CAPACITY_20261108.md`-s.
