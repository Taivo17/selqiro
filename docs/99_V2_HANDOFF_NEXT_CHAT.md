<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-07 Europe/Tallinn

## Praegune checkpoint

07.11.2026 kell 11:58 lisatud terminalipilt näitab fotode kiirenduse edukat build/commit/push tulemust commit’iga 832c6a4c0e97c6b883a81f63ca1821ef3b192cb3. Järgnev foto-valiku pakett peatus PACKAGE_EXTRA_FILE_REFUSED veaga enne projektifailide, Giti või jooksupäeviku toiminguid. Täpne väljastatud ZIP kordab sama viga: assistent lisas pärast eelkontrolli kaks .log tõendifaili, mida paketi reeglid ei luba. Valmistatud on eraldi r2 tarne sama kontrollitud rakenduskoodi ja muutmata uuendajaga; tõendid on lubatud dokumendiformaadis. Foto valimine ja täpne piiranguteade ootavad endiselt Maci rakendamist.

## Lähtekood ja tõendi piir

- **Lähtebaas:** Maci lähtebaasiks jääb fotode kiirendus: manifest a5c9106753ea6f8b586ddd3289a5aa35f4b66efb2c984e34e597008f39dd8223, 1078 lähtefaili. Kasutaja terminalipilt teatab commit’i 832c6a4c0e97c6b883a81f63ca1821ef3b192cb3 build/commit/push edust. Algne foto-valiku ZIP SHA-256 78347f278cb651bfee5bc738d270435c245be58cc98e3971ac50e600bebed0ad säilib muutmata. Uus tarne selqiro-foto-valik-20261107-r2 on eraldi kaustas, et vanad lisafailid ei kanduks lahtipakkimisel kaasa.
- **Üks fotovalik:** ManagedListingPhotoAdd kutsub peidetud failivälja otse nähtava nupu klikist. Esimene valik, teise foto valik ja Lisa järgmine foto avavad sama seadme valija. Tühja valiku või katkestamise korral jätkamiskirjet ei lähtestata. Lõpetatud toimingu lähtestamine toimub alles sobiva faili valimisel ning kontrollib uuesti sama kontrollerit ja valiku versiooni; uuem pooleliolev toiming säilib. Eelvaade ei alusta üleslaadimist.
- **Täpne piiranguteade:** Olemasoleva suletud SQLSTATE 54000 kolme põhjuse põhjal näidatakse eraldi pooleliolevate lisamiste, veereva 24 tunni katsete või vaba üleslaadimisruumi teadet. Kvoodid, SQL, API, õiguskontroll, jätkamiskirje ja päringute järjestus ei muutu. Tundmatut viga ei tõlgendata üheks neist põhjustest.
- **Keelenõue:** Inglise keel on põhikeel ja puuduvate tõlgete varukeel; eesti on teine keel. Sisselogitud kasutaja eelistuse allikas on olemasolev profiles.language. V1 tõlkeabi on olemas, kuid V2 päises, vormides, kategooriates ja veateadetes on püsivalt eestikeelseid tekste. See parandus ei muuda kogu V2 kakskeelseks. Järgmine terviklik keeleetapp kasutab olemasolevat tõlkemehhanismi ja väikseid moodulisõnastikke.
- **Maci värske alus:** Foto-valiku esimese paketi viga tekib read_package sees enne eelmise raporti lugemist, Journal loomist, Git-käske või lähtefailide kirjutusi. Seetõttu ei teki selle peatuse kohta uut result.json-i. R2 kontrollib endiselt tegelikku main-haru, HEAD-i, tööpuud/indexit, kinnitatud remote’i ning ühe eelneva kiirendusraporti commit’i, ainsat vanemat, teemat ja täpseid lähtepuusid. Terminalipilti ei kasutata nende kontrollide asendamiseks.
- **Tarne ulatus:** Uuendaja rakendab ainult lähtekoodi, teeb ühe vajaliku build’i ning --publish korral kontrollitud commit/push’i. SQL-i, Supabase CLI-d ega Storage’i paigaldamisel ei käivitata. Kasutaja pilte, kuulutusi, kontosid, sõnumeid ega päevikuid ei eemaldata. Täpne üks käsk on HOSTED_PORTAL.md-s.
- **R2 pakiparandus:** Kaks passiivset tõendit kontrollid/capacity-tests.log ja kontrollid/feature-build.log tarnitakse sama sisuga .md failidena. Uuendaja, prior_release.py, eelkäija profiil, kolm runtime-faili ja kaks rakenduse testi säilivad bait-baidilt. Muutub jooksev dokumentatsioon ning lisandub pakivea selgitus. Failipiiranguid ega räsikontrolle ei muudeta.

## Tegelik kohalik katse

- Foto lisamise ja journey-capacity sihitud testid: üks jooks, 58/58 PASS. Kaetud kolm täpset põhjust, tundmatu vastus, üks prepare ja null PUT-i keeldumise korral, sama päeviku/galerii säilimine ning kasutaja algatatud katkestamine. Varasemaid laiu foto- ja SQL-sarju ei korratud.
- Täielik npm run build -- --webpack PASS, 27,72 s. Sünteetilised Supabase’i ja OpenAI build-seaded; tootmise saladusi ei kasutatud.
- Päris integreeritud muutmisvaate Chromiumi kontroll: 7/7 PASS, 1440 ja 390 px. Kontrollitud native filechooser sündmus ühe kliki/Enteriga, tühi valik ilma päeviku lähtestamiseta, järgmise faili valik, uuema teise vahekaardi kavatsuse säilimine, kolm täpset piiranguteadet viie fotoga ning kümne foto UI-piir. Olemasolevad fotod, põhipilt ja salvestamata pealkiri säilisid. Auth/RPC/Storage transport oli sünteetiline; see pole Maci galerii välimuse, tootmise kvoodi ega kiiruse tõend.
- Keelte read-only audit kinnitas V1 English/Eesti eelistust ja V2 puudulikku katvust. Fotovaliku sõltumatu lähteülevaatus ei leidnud konkreetses muudatuses regressiooni. Lähtekoodiuuendaja 19/19 sihitud Giti/jätkamise kontrolli PASS; kriitilised olemasolevad kontrollid säilisid. Lõpliku kokkupandud tarne eraldi tõend on paketi kontrollid/ kaustas. Need katsed ei ole Maci ega tootmise toimingud.
- Täpsest algsest 32-failisest ZIP-ist taastati PACKAGE_EXTRA_FILE_REFUSED. Mõlemad keelatud .log failid tuvastati; real run_delivery peatus enne prior-reader’i, Journalit, Giti, kirjutusi ja build’i (kõigi vaatlejate arv 0). Viga oli assistendi lõpliku pakendamise etapis; varasem 20-failise koosseisu kontroll ei katnud hiljem lisatud .log faile. Vana tõend säilib selle piiriga.
- R2 kasutab sama testitud rakenduskoodi, seega varasemat build’i ja 58/7 rakenduse testi ei korrata. Tarne sihitud kontroll katab kogu uue koosseisu ja sama uuendaja paigaldusraja; enne väljastust peab ka lõplikust ZIP-ist lahti pakitud tervik läbima read_package kontrolli. Paketi failide CRC/räsi kontroll üksi ei asenda seda.

## Production / kasutajaliides

- 07.11.2026 kasutaja stopperiga mõõdetud kaks foto lisamist: 17 s ja 19 s. Varasem 27–31 s oli sekundite lugemisel põhinev hinnang. Failide samasus, mahud ja võrguolud pole kinnitatud; protsentuaalset kiirenemist ega aeglast serverietappi nende põhjal ei tõendata.
- Kasutaja pildid näitavad viit fotot, teksti Kuni 10 fotot ning kuuenda lisamise asemel ajutise piirangu teadet. Nähtav kolm koristust ootavat algfaili ei tõenda kolme avatud üleslaadimiskatset ega täitunud kogu konto mahtu. Täpne tagastatud põhjus ja konto loendurid puuduvad.
- Foto lisamine/avalik nähtavus ning varasem foto eemaldamine, põhipildi muutmine ja kuulutuse 201 koristuspaneeli kadumine jäävad vastu võetuks. Neid edukaid kasutuskatseid ei korrata.
- Uus fotovaliku ja teate parandus on ettevalmistatud lähtekood. Selle Maci rakendus, commit/push, sama commit’i Verceli Production Ready ning otsese valiku ja piiranguteate päris kasutuskatse on veel ootel.
- Uus terminalitõend: foto lisamise commit 0b754b6cfd5e2cd3a93af99dfe83fe96e2f29f2d ja kiirenduse commit 832c6a4c0e97c6b883a81f63ca1821ef3b192cb3 on uuendajate väljundi järgi push’itud. See tõendab terminali teatatud etappi; nende värskeid Verceli Ready-ridu ega täit result.json-i selles teates pole. Foto-valiku esimene käik peatus enne hoidla muutmist; uut foto-valiku commit’i pole.

## Üks järgmine töö

Laadi selqiro-foto-valik-20261107-r2.zip, paki see Downloads-kaustas eraldi r2-kaustaks ja käivita HOSTED_PORTAL.md r2-käsk. Vana ZIP-i ega kausta ei muudeta ja varasemat kiirenduspaigaldajat ei korrata. Pärast r2 edukat build/commit/push’i ning sama uue commit’i Verceli Production Ready tulemust kontrolli otsest fotovalikut ja proovi senise viie fotoga kuulutusele üht lisamist. Kui konto piirang kordub, saada uus täpne kasutajateade.

**Peatumisel:** PEATATUD korral säilita rida ja raport, kasutaja muudatused ning kõik päevikud. Räsikaitset, remote’i või SQL-i õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindla SQL-vastuse järel kontrollitakse tegelikku lõppseisu; sama apply ei käivitu pimesi uuesti. Vanu pakke, paigaldusi ja edukaid kasutuskatseid ei korrata ilma uue konkreetse põhjuseta.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — uus üks käsk ja üks sihitud kasutuskatse.
- docs/continuity/PHOTO_PICKER_PACKAGE_FIX_20261107.md — esimese ZIP-i täpne pakkimisviga, peatumiskoht ja r2 tõendi piir.
- docs/continuity/PHOTO_PICKER_REVIEW_20261107.md — kasutaja ajad, viie/kümne foto eristus ja praeguse paranduse tõendipiir.
- docs/architecture/interface-language-v1.md — English põhikeel, Eesti teine keel, üks eelistus ja tegelik V2 katvuse puudujääk.
- docs/architecture/published-photo-addition-v1.md ja docs/architecture/listing-photo-preparation-v1.md — foto lisamise, jätkamise, mahu ja etapimõõtmise lepingud.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja kontosüsteem. Marketplace’i tavatoimingud ei sõltu Energy ostust. Aktiivses galeriis on kuni kümme fotot; püsiv järjekorranumber võib eemaldamise järel ületada 9.
- Lähtekoodi konto piirid on kolm aegumata avatud katset, 20 viimase 24 tunni uut katset ning 300 MiB loogilist reservi. Ühe lisatava foto ettevalmistus reserveerib kuni 25 MiB SOURCE-i ja 4 MiB WEB-i. Need pole uus viie foto reegel ega tõend kasutaja konkreetse konto seisust.
- Koristuse testpaneelid jäävad praegu nähtavaks. Katkestatud/ebaõnnestunud üleslaadimiste automaatne lõpetamine, reservi vabastamine ning tehniliste paneelide eemaldamine tavakasutaja vaatest tuleb lõpetada enne üldist avalikku avamist. Paneeli peitmine ei asenda lõpetamist.
- Kasutajaliidese keel on konto eelistus ning ei sõltu aktiivsest äriidentiteedist ega riigist. Kasutaja sisestatud kuulutuse tekst, selle keel ja versioonitud avaldamistingimuste keel ei muutu automaatselt kasutajaliidese keele vahetamisel.
- Üks foto korraga on praeguse lisamise ulatus. Energy/maksete tuum ja piiratud AI abi säilivad kokkulepitud V2 käivitamise ulatuses. Kasutaja olemasolevate andmete ja päevikute kustutamise luba puudub.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git ja https://selqiro.vercel.app. Kinnitatud siht /Users/taivo/selqiro; uut worktree paigaldajat ei korrata.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm, paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Käesolev ainult lähtekoodi uuendaja ei vaja Supabase CLI-d, SQL-i käivitust ega uusi teenuseseadeid. Ligipääsuandmeid pakk ei sisalda.
- SERVICE_ACCESS.json-i vanad kuupäevad ja NEXT-tekstid on ajalugu. Praegune järgmine toiming on selles kirjes; Maci/Giti, andmebaasi, Verceli ja kasutajavaate tulemused tuleb igaüks eraldi kinnitada.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
