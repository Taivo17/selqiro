<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-11 Europe/Tallinn; teenuse üheaastane kehtivus ja teadlik pikendamine ette valmistatud

## Praegune checkpoint

Teenuse 365-päevane kehtivus ning omaniku teadlik tasuta pikendamine on uues lähtepaketis kohalikult kontrollitud. Minu ala ja muutmisvaade näitavad serveri tähtaega; aegunud teenus jääb omanikule alles. Viimane tegelik Maci commit on teenuste rubriigisammu 1b0c5ba867e5f466e75f63aee78521d37cf8164f, mille kasutuskatse on vastu võetud. Uue kehtivussammu Maci rakendus, SQL-i aktiveerimine, commit/push, Verceli Ready ja kasutajavastuvõtt on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Tegelik alus:** /Users/taivo/selqiro, main, 1b0c5ba867e5f466e75f63aee78521d37cf8164f; vanem d5e77e963f80cb4dab33e6e6667c44d4062c4bbc. Täpne 1563-failine puu 6808d687e21b96d7e8b25639e00d0a525f97ad6a rekonstrueeriti muutmata raporti, väljastatud paketi ja külmutatud allikate põhjal. See ei ole värske live-Giti vaatlus.
- **Eelmine lõppraport:** selqiro-teenuste-poerubriigid-20261111-raport-20261111-163201-1847005ab277.json, 237629 baiti, SHA256 024d92a76b33fc5b6e3ea51f3fa0216b47c4bafe122243552d9d43372b7350ff. Lõpp 11.11 kell 16:31:59 Europe/Tallinn; database verified, build passed, push verified, Storage not_performed. Täpne Verceli Ready/deployment-ID on eraldi kinnitamata.
- **Uus lähtepakk:** selqiro-teenuste-kehtivus-20261111.zip. Uued väikesed activity entity/API/hook/komponendid, eraldi serveribinding ning olemasoleva My Area/editori liidesed. Lõplik failiulatus ja räsid on paki manifest.json-is; pärast väljastamist pakki ei muudeta.
- **Üks kehtivuse allikas:** services UUID säilib. Privaatne activity-kirje hoiab tähtaega; pikendamine ei muuda teenuse sisu, fotosid, rubriike, staatust, edit_revision-it ega loomise/muutmise/avaldamise aega. Täpse vana tähtaja võrdlus säilitab mikrosekundid. 365 × 24 tundi arvutab server.
- **Olemasolevate teenuste üleminek:** Tegelikus lähtelepingus ei ole teenuse tähtaega. Praegu avaldatud teenused ja avaldamisajaga (published_at) arhiveeritud teenused saavad ühe aasta SQL-i aktiveerimishetkest; origin=transition ja last_confirmed_at=null. Algseid kuupäevi ei muudeta. Mustand alustab aastat esimesel päris avaldamisel; paigaldaja kordus ei pikenda.
- **Avalik nähtavus ja vanem klient:** Ühine serveri is_public lisab tähtaja enne avalikke loendeid, koguarve, lehekülgi, teenuste profiilirubriike, detaili, hallatud meediat ja uut kontakti. V1 vastus säilib, V2 lisab activity-ploki; SQL võib eelneda uuele veebikliendile. Omaniku ligipääs ja olemasolevad sõnumid säilivad.
- **Dokumentide jätk:** Pakk kannab kaasa eelmise teenuste rubriigivastuvõtu 13-failise dokumentide delta. Selle vana CURRENT_STATE/üleandmise/HOSTED täpsed baidid on docs/continuity/history/service-store-categories-accepted-20261111/ all. Praegune seisukirje genereerib üleandmise; eraldi dokumentide paigaldajat pole.

## Tegelik kohalik katse

- SQL runtime 22/22 ning paigaldus/drift/rollback 38/38 PASS PostgreSQL/WASM-is. Kaetud on üleminek, esimene avaldamine, aegunud teenuse muutmine/taastamine, täpne tähtajakonflikt, äriliikme õigus ja ühised avalikud filtrid. Päris Supabase’i ega native paralleelsessioone ei kasutatud.
- Muudetud HTTP-transpordi 25/25 ja kliendi/editori 25/25 sihitud juhtu PASS; TypeScript PASS. Katsed kasutavad tegelikke mooduleid sünteetiliste Auth/RPC/HTTP ja jsdom’i piiridega. Uuendaja eelmise raporti kontroll 9/9 ning lõplike SQL-baitidega adapter 15/15 PASS.
- Next webpack build PASS: 25.715 s, 647 sisendit, drift 0. Inventari SHA256 3015b717a5c5b15724d35fca9acedd1e8133610858d365531d8205c2dc3e9a1a. Olemasolevad lukustatud sõltuvused ja sünteetiline seadistus; uusi sõltuvusi ei paigaldatud.
- Build’i järel Chromium 153: 5/5 PASS, English/Eesti, 1365/390 px. 51 rakendussisendit vastavad build’ile, drift 0; konsoolihoiatusi/-vigu, lehevigu ja välisvõrgupäringuid 0. Tegelikud My Area/editor/activity moodulid ja tootmise CSS; Auth/HTTP/avaldamiskontroller/Next-adapter on sünteetilised.
- Brauseris kontrolliti loobutavat kinnitust, aegunud ja peatatud teenuse pikendamist, mustandi piirangut, tundmatu kirjutuse eraldi lugemist, lugemistõrkest taastumist ning identiteedivahetuse hilist vastust. Pooleli tekst, foto ja rubriigivalik säilisid; horisontaalset ülevoolu polnud. Vaadati üle dialog, omaniku loend ja taastatud tähtajapaneel.
- Lõpliku manifesti täie payload’i Giti/indexi/varukoopia/commit’i ja kohaliku remote’i tarnekäigu tõend on paki kontrollid/final-flow.json-is. SQL/build on selles tarnekatses sünteetilised; tegelik kohalik build on eespool. See ei ole Maci, GitHubi, tootmis-SQL-i ega Verceli tõend.

## Production / kasutajaliides

- 11.11 lõppraport: complete / database verified / build passed / push verified; commit 1b0c5ba867e5f466e75f63aee78521d37cf8164f, siht /Users/taivo/selqiro. Algus 16:31:16, SQL järelkontroll 16:31:32, lõpp 16:31:59 Europe/Tallinn. Toiminguid ei korratud vastuvõtu ülevaatuses.
- Kasutaja võttis vastu teenusele ANTIIK-rubriigi salvestamise, sama teenuse leidmise/avamise profiili ANTIIK-filtrist ning aktiivse sisuga rubriikide näitamise avalikus profiilis. Piltidel on teenuste ANTIIK-filtris üks Puhastusteenus; kuulutuste filtris AUTODE MÜÜK ja GARAAZI LEID.
- Raportis vercel=READY_NOT_CHECKED. Selle commit’i täpne Verceli Ready-rida või deployment-ID ei ole esitatud; nähtav kasutajavastuvõtt on eraldi tõend. Varasema teenuste Back-katse ja tava-/hobusekuulutuste rubriigisammude vastuvõtt säilib.
- Uue teenuse kehtivuse koodi ega SQL-i ei ole selles ettevalmistuses Macis/tootmises rakendatud. Uut commit/push’i, Verceli Ready/deployment-ID-d või teenuse pikendamise kasutajavastuvõttu ei väideta. Lõpetatud rubriigi-/Back-katseid ei korrata.

## Üks järgmine töö

Rakenda HOSTED_PORTAL.md üks käsk uue selqiro-teenuste-kehtivus-20261111 pakiga. Uuendaja kontrollib tegelikku Maci haru/HEAD-i, tööpuud/indexit, faile, eelmist raportit ja remote’i, teeb guarded SQL-i/järelkontrolli ning selle sammu build/commit/push’i. Seejärel sama commit’i Verceli Ready / Production, portaali värskendus ja ühe teenuse teadlik pikendamine: tähtaeg Minu alas ning sama teenuse nähtavus avalikul profiilil. Tootmises ei muudeta tähtaega käsitsi aegumise katseks.

**Peatumisel:** Peatumisel säilita PEATATUD-rida ja saada SAADA SEE FAIL real näidatud ning Finderis valitud selle jooksu täpne JSON. Lähte-/indexi-/remote’i-/andmebaasilepingu erinevust ei normaliseerita automaatselt. Teadmata SQL-i tulemus kontrollitakse lugemisega; kirjutust automaatselt ei korrata. Kontode, kuulutuste, teenuste, hobuste, fotode, sõnumite ja päevikute kustutamisluba puudub.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus Maci jätkamiskäsk ja kasutajakatse.
- docs/continuity/SERVICE_ACTIVITY_20261111.md — teostus, kontrollid, üleminek ja tõendipiir.
- docs/architecture/service-activity-v1.md — tähtaja autoriteet ja RPC/public eligibility leping.
- docs/continuity/SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md — eelmine tegelik raport ja vastu võetud rubriigid.
- docs/architecture/public-discovery-controls-v1.md — säilivad hilisema peitmise/tööpakkumise otsused.
- docs/continuity/SERVICE_ACCESS.json — olemasolevad sihid ja CLI pin; vanad jooksud on ajalugu.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu ega rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- Aegumine jätab teenuse ja seosed omanikule alles. Peatatud teenuse pikendamine ei avalda seda. Teksti-, foto-, rubriigi- või staatusemuudatus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab eraldi lugemist, mitte automaatset kirjutuse kordust.
- Teenuse ja kuulutuste avalik rubriigifilter arvestab eraldi jaotise kogu nähtavat sisu ja esivanemaid enne lehekülge. Omaniku haldus/valija näitab kõiki rubriike. Rubriigi eemaldamine säilitab sisu ja fotod; 80 teenust ei ole konto piir.
- Tähtaeg kontrollib pakkumise ja hallatud pildi nähtavust. Varem avaliku Storage-URL-iga fotot ei muuda see privaatseks. Uuendaja ei tee Storage’i toiminguid. Üldine fotode taustakoristus ja tehniliste paneelide eemaldamine jäävad avamiseelseks tööks.
- Ajutine pakkuja peitmine jääb eraldi vaataja otsingueelistuseks; soovitus on 7 päeva ja tagasivõtmine. Olemasolevat sõnumeid mõjutavat user_blocks-i selle asemele ei kasutata. Seda võimet siin ei rakendata.
- Töökuulutuse kinnitatud algsuund on ettevõtte avalik profiil/otseviide, üks kuu kehtivust ja nähtavuse selge teade. Üldise tööotsingu sulgemine vajab ka serverikontrolli; üks kuu pole vaikimisi fikseeritud 30 päeva. Töökuulutuste koodi siin pole.
- Uued owner RPC-d kontrollivad oma õigusi. Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir vajavad eraldi lahendust. Energy, maksete tuum ja piiratud AI abi jäävad V2 ulatusse.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; kinnitatud Maci siht /Users/taivo/selqiro. Terminali prompt’i vana töökausta nimi ei muuda uuendaja sihti.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Kasutatakse olemasolevat räsiga kinnitatud CLI-d; uut projekti, sisselogimist ega sõltuvuste paigaldust ei tehta.
- Uus ettevalmistus kasutas kontrollitud lähtekoopiat, kohalikke sünteetilisi katseid ja olemasolevaid sõltuvusi. Maci, remote’i, Supabase’i ega Vercelit siin ei avatud. Uuendaja peab enne tegelikke kirjutusi kinnitama uue jooksu lähte/indexi/sihtkoha seisud.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
