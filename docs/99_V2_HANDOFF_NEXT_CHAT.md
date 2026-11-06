<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-06

## Praegune checkpoint

06.11.2026: ette valmistatud ja kohalikult kontrollitud ühe varem galeriist eemaldatud WEB-foto lõppkoristus ning selle reservi tõendatud vabastamine. Kasutusel on senine päevik ja ühe objekti transport. Viimane kasutaja vastu võetud tootmissamm on fotoeemaldus commit’iga 69ca43454857d3f742aea35faa57cfecf57b7cf1; uus Maci/SQL-i rakendus, commit/push, Vercel ja päris koristus on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Üks muudatus:** Kitsas töötaja valib ainult täpse published_image_removed kirjega WEB-objekti. Aktiivsed galeriifotod ja põhipilt ei kuulu sellesse koristusse. Sama päevik, töövõti, lease, kordusreeglid ja Storage-transport säilivad; uut tabelit, järjekorda, rolli ega mahubilanssi ei lisata.
- **Andmebaasi piir:** Kolm uut kitsast RPC-d (claim/record service_role’ile, seis authenticated-kasutajale), kaks privaatset helperit ja üks täpne lisaharu senises lõpetamistõendis. Olemasolev actor-wrapper ja galeriikontroll tagavad õiguse; RLS-i varjatud rida ei ole puudumise tõend. SQL ei kustuta Storage’i ridu.
- **Koristus ja maht:** Üks päring töötleb kuni ühe objekti. Senine SOURCE claim proovitakse esimesena; ainult selle literal null lubab eemaldatud WEB-i claim’i. 4 MiB WEB-reserv vabaneb pärast täpse objekti, lõpetatud sessiooni ning teenuseobjekti/upload’i/osade puudumise kinnitamist. Tundmatu tulemus jätab reservi alles. Hilisem kuulutuse eemaldamine või kõrvaline SOURCE-diagnostika ei lae tõendatud WEB-i uuesti arvestusse.
- **Omanikuvaade:** Vana owner-status kuju ja avaldatud SOURCE files_remaining säilivad. Uus eraldi seis loeb olemasolevast päevikust eemaldatud WEB-ide arvu ja reservi. Selle lugemise tõrge ei blokeeri põhitoimetajat ega muuda edukat fotoeemaldust nurjunuks. Pärast koristuskäsku nõutakse värsket seisu; lehe avamine/fookus/värskendus ei kustuta faile.
- **Tarne:** selqiro-eemaldatud-fotode-koristus-20261106.zip sisaldab piiratud uuendajat. SQL-tugi kinnitatakse enne lähtefaile, build’i ja täpset commit/push’i. Paigaldaja ei käivita Storage’i koristust. Täisüleandmine on selqiro-uleandmine-eemaldatud-fotode-koristus-20261106.zip; vanad väljastatud pakid jäävad muutmata.
- **Lähtebaas:** Old-räsid pärinevad muutmata 04.11 fotoeemalduse 995-failisest tarnest, release_id 9b569647dc3f8b2436367d3b40e328e914d2e3a4c33032dffd8ea56a88162146. Uus lähtepuu on 1019 faili; 38 payloadi ja 981 muutmata guardi. 05.11 viis eraldi Maci rakendamata vastuvõtudokumenti kaasatakse deltasse. Tegelik haru/HEAD/kogu index/tööpuu/allikad/remote loetakse enne kirjutusi värskelt.
- **Keerukuse piir:** Uus read-mudel on sama andmestiku arvutus, mitte teine tööjärg. Uus nupp „Korista järgmine fail” kasutab senist omaniku toimingulukku. Sõltumatu põhiväljade toimetaja ei muutu üldiseks töövoomootoriks. Testid katavad muudetud piire; lõpetatud paigaldusi ei korrata.
- **Avaliku vaate otsus:** Testimise ajal jääb tehniline diagnostika nähtavaks. Enne avalikku avamist peab koristus töötama kasutaja nupuvajutuste ja avatud omanikuvaateta; tehnilised loendurid/nupud kaovad tavavaatest. Käesolev samm ei lisa püsivat ajastajat. Ainult paneeli peitmine ei täida nõuet.

## Tegelik kohalik katse

- 91/91 sihitud Node-katset PASS: ühise adapteri tõttu kontrolliti säiliva SOURCE-lepingu 31 katset; uus töötaja/seis 45 ja uus autenditud lugemistee 15. HTTP-vastused on sünteetilised. Vale SOURCE-vastus ei ava WEB-haru; ühine transport väljastab kuni ühe täpse kustutuse.
- Lõpliku SQL-i 22/22 käitumise ja 14/14 paigalduse kontrollrühma PASS PostgreSQL 17.5 / PGlite 0.3.14 WASM-is. Kinnitati 4 MiB vabastamine alles puudumise järel, aktiivse galerii säilimine, lease, tundmatud tulemused, õiguse muutus, SOURCE-loenduri eraldatus ja hilisema kogu kuulutuse eemaldamise olukorrad. Native paralleelseansse ega päris Storage’it ei kasutatud.
- Lõpliku runtime’i npm run build -- --webpack PASS, exit 0, 29,33 s. Kasutati olemasolevaid lukustatud sõltuvusi ning sünteetilisi build-väärtusi. Pärast seda runtime’i ei muudetud.
- 11/11 brauserijuhtumit PASS Chromium 153.0.8010.0-ga pärast build’i, tegelik IntegratedListingEditPage/hook/kliendid, 1440/390 px. Olemasolev kahe fotoga 201: SOURCE 0 + eemaldatud WEB 1 → kinnitatud0/0, sama galerii/põhipilt ja salvestamata tekst. Kontrolliti vigast/puuduvat/hilist seisu, tundmatut tulemust, tähelepanuolekut, sama lukku, SOURCE/WEB koosolu ja hilisemat kogu kuulutuse eemaldamist. 0 leheviga/välispäringut/ootamatut toimingut; HTTP sünteetiline.
- Neli uuendaja liidesekatset PASS ning üks kokkupandud tarnekatse PASS, 4,604 s: tegelik 995-failine lähtebaas, 38 payloadi, 981 guardi, päris ajutine Git/index/varukoopia/kohalik remote. SQL-transport ja selle katse build olid sünteetilised. Üks commit/tavaline kohalik push; kordus ainult SQL-i lugemiskinnitus. Lõplike dokumentide ja manifesti terviklust kontrollitakse pakendamisel eraldi.
- Sõltumatu staatiline ülevaatus ei leidnud lõplikes kontrollitud allikates blokeerivat õiguse- või andmetervikluse probleemi. Täpsustati reservi lugemi kontrolli ja SOURCE-esimese nupu sõnastust. SQL-i esimene owner-read õiguseprobleem lahendati senise wrapperiga õigusi laiendamata. Algne SQL-katse süntaksitõrge ja brauseri käivitusfaili/fondide lahtipakkimise tõrked säilivad ajalooliste katsetõenditena; lõplikud katsed läbisid.
- Täpne praegune tõend on üleandmise kontrollid/eemaldatud-fotode-koristus-20261106/ all. Varasemad vastuvõtud, kontrollid ja väljastatud pakid säilivad oma kuupäevadega. Neid ei esitata uue WEB-koristuse tootmiskinnitusena.

## Production / kasutajaliides

- 05.11 fotoeemaldus: terminali VALMIS kinnitab andmebaasitoe, build’i ja commit/push’i commit’iga 69ca43454857d3f742aea35faa57cfecf57b7cf1. Verceli pildil sama 69ca434 / main / Ready 45 s / sinine Production. Esimene ZIP-i lahtipakkimata jätmisest tulnud puuduva faili viga eelnes uuendaja käivitusele; järgnev jooks õnnestus.
- Kasutaja kinnitas fotoeemalduse ja uue põhipildi toimimist. Taivo Garaaži kuulutusel 201 eemaldati murutraktori lisafoto; BMW ja Mercedes jäid alles. Mercedes määrati põhipildiks ning ilmus otsingu „Test Taivo garaaz” kaardile. See kitsas kasutustee on vastu võetud ja seda ei korrata.
- Algfotokoristus: 203021cec14d103d4c2cd38230d33979e2baa02a, Verceli pildil 203021c / main / Ready 46 s / Production. Varem vastu võetud 201 SOURCE-loendur 3→2→1→kadumine ja ühe fotoga 202 vaade säilivad. R3 8be94cd… on varasem eraldi samm.
- Ülaltoodu on kasutaja terminali/juhtpaneeli/veebipiltide tõend. Täit jooksuraportit, värsket Maci indexit/tööpuud/remote’i, live DB-kataloogiräsi ega deployment-ID-d pole selles ettevalmistuses loetud. Uue WEB-koristuse pilvepaigaldust, tegelikku Storage-puudumist ega reservi vabastamist pole veel vaadeldud. Maci, pilveandmebaasi, GitHubi või Verceli kirjutusi ega päris foto koristust siin ei tehtud.

## Üks järgmine töö

Laadi alla ja paki Downloads-kaustas lahti selqiro-eemaldatud-fotode-koristus-20261106.zip; käivita HOSTED_PORTAL.md üks uus uuenduskäsk. Seejärel sama terminali commit’i Ready/Production → värskenda kuulutuse 201 muutmisvaadet → üks „Korista järgmine fail” samm olemasolevale eemaldatud fotole → kinnitatud nullseisul plokk kaob, samad kaks fotot ja praegune põhipilt säilivad. Uut fotot selleks ei eemaldata. Vana fotoeemalduse/SOURCE-i paigaldajat ei korrata.

**Peatumisel:** PEATATUD korral säilita töö ja päevikud ning saada peatumisrida koos nimetatud result.json-iga. Lähte- või SQL-kaitseid ei nõrgendata ja tundmatut kirjutust ei korrata. 05.11 commit on viimane vaadeldud tulemus, mitte eeldus tänase HEAD-i kohta. Varasem lahtipakkimise tõrge on lahendatud.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus käsk, lahtipakkimine ja olemasoleva kuulutuse kitsas kasutuskatse.
- docs/architecture/hosted-retired-web-cleanup-v1.md — käesoleva koristuse õigus, püsiv puudumistõend, reserv ja UI piir.
- supabase/repairs/20261106_retired_web_cleanup/README.md — uus SQL ja sihitud kontrollid; vanu apply-faile ei korrata.
- docs/architecture/published-listing-photo-removal-v1.md ja hosted-completed-source-cleanup-v1.md — säilivad eelnevate sammude lepingud.
- Üleandmise kontrollid/eemaldatud-fotode-koristus-20261106/review/verification.json ning browser-check/browser-proof.json — selle kandidaadi tulemused ja tõendipiirid.

## Säilivad piirid

- Üks olemasolev portaal, hoidla ja Supabase’i projekt, samad kontod ning päris Auth. Uut pilvebaasi, kontosüsteemi ega eraldi taustateenust ei looda.
- SOURCE 25 MiB / WEB 4 MiB ja konto 300 MiB on Selqiro loogilised piirid. Ühe eemaldatud WEB-i puudumistõend vähendab senist reservi; see ei mõõda teenusepakkuja varjatud kettaid ega arvet. Üldised koristus-RPC-d jäävad suletuks ja cleanup_mode:held säilib.
- Käesolev uus WEB-haru valib ainult varem kinnitatud published_image_removed objekti. Aktiivseid fotosid või teise põhjusega terminalseid objekte ei lisata sellesse ulatusse. Fotode lisamine/asendamine ja katkiste üleslaadimiste lõpuni viimine on järgnevad väikesed sammud.
- Püsiv automaatne koristus ilma omaniku avatud lehe/nupuvajutuseta ning tehnilise UI eemaldamine tavavaatelt on enne avalikku avamist veel vajalikud. Praegune diagnostika jääb testimiseks nähtavaks.
- Sõnumid, privaatsed sõnumifotod ja nende 250 MiB arvestus ei muutu. Kontode, identiteetide, logode, teenuste, tootenäidiste või päevikute kustutamisluba puudub. Uue foto eemaldamise käivitab omanik konkreetse kinnitusega; praegune veebikatse kasutab varem eemaldatud fotot.
- Hobused jäävad ühisesse lisamise/otsingu/detaili/omanikuvaate voogu. Energy/maksete tuum ja piiratud AI abi jäävad V2 käivitamiseelsesse ulatusse. R3 vormimustandid jäävad avatud lehe ning aktiivse identiteedi kaupa eraldatuks; täielik taaslaadimine File-objekte ei taasta.

## Keskkond

- Kinnitatud siht https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; uuendaja vaikimisi ~/selqiro. Terminaliviiba kaustanimi ei määra sihti; --repo korral kontrollivad Git ja CLI sama tegelikku rada.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm / eu-central-1, paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. CLI 2.117.0 viie faili pin ja olemasolev autentimine; uut paigaldust/login’it ei ole vaja. Need on säilitatud sihid, mitte uus teenusevaatlus.
- Viimane täielik Maci inventuur on 03.11 koondraportis; 05.11 terminal/Vercel annavad uuema fotoeemalduse commit’i 69ca434… . Tegelik tööpuu/index/remote ja DB-fingerprint kontrollitakse uue uuendaja sees. SERVICE_ACCESS.json-i vanema kuupäeva tööjärg on ajalooline; praegune järgmine tegevus tuleb ainult siit.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
