<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-04

## Praegune checkpoint

04.11.2026: ettevalmistatud ühe lisafoto eemaldamine avaldatud hallatud kuulutusest. Foto peab olema mittepõhipilt ja vähemalt üks foto jääb alles. Olemasolev galerii, versioonikontroll ning koristuspäevik jäävad kasutusse; vana foto veebiaadress sulgub, ülejäänud aadressid säilivad. Kohalikud sihitud kontrollid ja brauserikatse on läbinud. Maci rakendamine, uus commit/push, Verceli Ready ning päris kasutuskatse on järgmine samm.

## Lähtekood ja tõendi piir

- **Üks muudatus:** Kuues olemasolevas runtime-failis laiendatakse pildiandmete lepingut, sama autentitud päringupiiri, omaniku hooki ja galerii kasutajaliidest. Foto eemaldamine nõuab konkreetse foto kinnitust. Uut tabelit, järjekorda, rolli, mahubilanssi ega üldist töövoomootorit ei looda.
- **Andmete autoriteet:** public.listing_images on aktiivne galerii. Olemasoleva cleanup-päeviku täpne WEB-kirje põhjusega published_image_removed tõendab eemaldatud liikmestaatust. Sama managed_image_presentations_v1.revision juhib põhipilti ja koosseisu; algsed slotid/URL-id/kviitungid säilivad.
- **Andmebaas:** Üks uus authenticated-only eemaldamise RPC, neli kitsast olemasolevate funktsioonide asendust ja üks cleanup-põhjuse lisamine. Õigus, aktiivne identiteet, liikmelisus, avaldatud katse ja oodatud revision kontrollitakse serveris. Mõlemad meedia lugemisteed keelavad eemaldatud foto.
- **Tõrgete piir:** Ebaselget kirjutust ei korrata. Kinnitus ja värske serveri lugem peavad tõendama koosseisu; kasutaja sisestatud tekst säilib. Omaniku üldine seis/tekstitöö ja kogu kuulutuse eemaldamine jäävad rangest galeriikontrollist sõltumatuks ka vigase galeriirea korral.
- **Koristus ja maht:** Eemaldamine lubatakse pärast valitud SOURCE-i tõendatud koristust; praegune UI ootab SOURCE-loenduri nulli. WEB jääb privaatselt järjekorda ja 4 MiB reservi. Foto eemaldamine ei kinnita faili lõplikku kustutust. SOURCE-kviitungi files_remaining tähendus ja vana töötaja säilivad.
- **Tarne lähtebaas:** Eelmise SOURCE-koristuse väljastatud 978 lähtefaili vastasid säilitatud manifestile. Need on uue paigaldaja old-räsid. Vastuvõtu viis dokumenti polnud eraldi Maci viidud; need kaasatakse uue delta sisse. Tegelik haru/HEAD/kogu index/tööpuu/remote kontrollitakse värskelt enne Maci või SQL-kirjutusi; R3 räsi on üksnes esivanema kontroll.
- **Pakett:** Uus selqiro-foto-eemaldamine-20261104.zip ja täielik selqiro-uleandmine-foto-eemaldamine-20261104.zip. Varem väljastatud pakke ei muudeta. Uus paigaldaja ise ei eemalda kasutaja fotot ega tee Storage DELETE-i.
- **Avaliku vaate otsus:** Senine tehniline koristusplokk jääb testimiseks alles. Enne avalikku avamist peab koristus edenema nupuvajutusteta ja avatud omanikuvaatest sõltumata; tehnilised loendurid/nupud kaovad tavakasutaja vaatest. Ainult peitmine ei täida nõuet.

## Tegelik kohalik katse

- 225/225 sihitud mudeli, kliendipäringu, HTTP-piiri ja kuvamisjärjestuse Node-katset PASS. Kontrolliti tühikuga algseid ordinaale, täpset ühe foto ACK-i, CAS-i, vananenud/tundmatut lugemit, konto/identiteedi muutust ja automaatse korduse puudumist. Teenusevastused sünteetilised.
- Lõpliku SQL-i 20/20 käitumise ning 14/14 paigalduse kontrollrühma PASS PostgreSQL 17.5 / PGlite 0.3.14 WASM-is. Eemaldatud URL-id suletakse mõlemal lugemisteel; sama põhipilt, teised SOURCE-id, WEB-reserv ning hilisem kogu kuulutuse eemaldamine säilivad. Ülevaatuses leitud omanikuvaate sõltuvus rangest galeriikontrollist parandati ja lõplik SQL kontrolliti uuesti. Native paralleelseansse ega päris Storage’it ei kasutatud.
- Lõpliku runtime’i npm run build -- --webpack PASS, exit 0, 18,94 s. Olemasolevad lukustatud sõltuvused ja sünteetilised build-väärtused. Varasem 26,54 s build säilitatakse eraldi; väike tühja galerii helperi täpsustus nõudis lõplikku build’i. SQL-i hilisem lugemiparandus runtime’i ei muutnud.
- 12/12 brauserijuhtumit PASS Chromium 153.0.8010.0-ga pärast lõplikku build’i. Tegelik IntegratedListingEditPage/hook/entity-kliendid, 1440/390 px: eemaldamine, järgnev põhipilt, viimane foto, pooleliolev SOURCE, kinnitusrevision, hilisem kaasmuudatus, kadunud vastus, vigane lugem ja identiteedivahetus. 0 leheviga/välispäringut/ootamatut toimingut. HTTP sünteetiline; esialgse testibrauseri protsessieluea tõrge parandati ainult katses.
- Uue SQL-raporti ja uuendaja sidumine PASS; Python 3.9 süntaks säilib. Neli uue tarne sihitud liidesekatset PASS: päris ajutine Git/index/varukoopia/kohalik remote, SQL ja build sünteetilised. SQL-eelne indexi muutus peatab; kadunud vastus loetakse üle; tundmatut apply’d ei korrata.
- Üks kokkupandud tarnekatse PASS, 6,737 s: tegelik 978-failine väljastatud baas, 34 payloadi / 961 guardi / 995 lähtefaili, päris ajutine Git/index/varukoopia ning üks commit ja kohalik tavaline push. Korduskäik tegi ainult SQL-i lugemiskinnitused; kokku üks sünteetiline apply ja build. Katseraami vana raportitee parandati enne edukat jooksu; paigaldaja kood ei muutunud. See pole Maci ega pilve katse.
- Sõltumatu ülevaatus kontrollis uut lepingut, säilivaid rolle/õigusi, koristuse ja mahu piiri ning allikabaasi. Detailid ja piirid on üleandmise kontrollid/foto-eemaldamine-20261104/ all. Varasemad tulemused säilivad oma kuupäevaga, uue tootmistõendina neid ei esitata.

## Production / kasutajaliides

- Viimane varem täiscommit’iga seotud deployment on R3 8be94cdff322bc051cd54f5143cd3ea12312493e / main / Ready / Production. Seda ei nimetata algfotokoristuse ega uue fotoeemalduse commit’iks.
- 04.11 kasutaja piltidel vähenes kuulutuse 201 algfailide ootel arv 3 → 2 → 1, siis plokk kadus; kolm fotot ja põhipilt säilisid. Uuel ühe fotoga kuulutusel 202 plokki polnud. Otsingu pildil olid fotodega kaardid sisse logitud vaates. See funktsionaalne vastuvõtt jääb jõusse.
- Algfotokoristuse täpset Maci commit’i, indexit, SQL-fingerprinti, Verceli deployment’i identiteeti ega mahuarvestust piltidel ei olnud. Lõpetatud katset ei korrata puuduva commit-pildi pärast.
- Selle fotoeemalduse teostus on eraldatud lähtekoopia ja kohalik kontroll. Maci/GitHubi/Supabase’i/Verceli kirjutusi ega päris kasutaja foto eemaldamist selles ettevalmistuses ei tehtud. Uue commit’i ja deployment’i tõend tuleb uuendaja tegelikust jooksust ning järgnevast veebikatsest.

## Üks järgmine töö

Laadi lahti selqiro-foto-eemaldamine-20261104.zip ja kasuta docs/continuity/HOSTED_PORTAL.md üht uuendamiskäsku. Uuendaja kontrollib värskelt tegelikku Maci/Giti/andmebaasi seisu, teeb piiratud muudatuse, build’i ning commit/push’i. Seejärel oota sama uue commit’i Ready/Production tulemust ja tee üks lisafoto eemaldamise ning allesjäänud põhipildi kasutuskatse olemasoleval testkuulutusel.

**Peatumisel:** PEATATUD korral säilita töö ja päevikud ning saada nimetatud result.json. Ära korda vana paigaldajat ega eemalda lähte- või SQL-kaitseid. Tundmatut kirjutust loetakse üle, mitte ei saadeta automaatselt uuesti. Tegelikku uut HEAD-i või deployment’i ei oletata vanast R3 räsist.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus käsk ja üks kitsas veebikatse.
- docs/architecture/published-listing-photo-removal-v1.md — valitud leping, õigused, aktiivne galerii, URL-ide sulgemine ja WEB-i säiliv reserv.
- supabase/repairs/20261104_listing_photo_removal/README.md — SQL-i ulatus, kontrollid ja paigalduspiir.
- docs/architecture/hosted-completed-source-cleanup-v1.md — säiliv SOURCE-leping ja avaliku UI otsus.
- Üleandmise kontrollid/foto-eemaldamine-20261104/ — uue sammu tõendid; algfotod-vastuvott-20261104 all säilivad varasemad kasutaja vaatlused.

## Säilivad piirid

- Üks olemasolev portaal, hoidla ja Supabase’i projekt; samad kontod ja päris Auth. Uut pilvebaasi, kontosüsteemi ega taustateenust ei looda.
- SOURCE 25 MiB ja WEB 4 MiB on Selqiro loogilised ülempiirid, konto piir 300 MiB. Aktiivse foto või eemaldatud WEB-i mahtu ei vabastata ilma vastava kustumise tõendita; see pole teenusepakkuja füüsilise ketta või arve hetkeseis.
- Praegune eemaldamine puudutab üht olemasolevat mittepõhipilti ja jätab vähemalt ühe foto. Lisamine/asendamine, WEB-i lõppkoristus, katkiste upload’ide lõpuni viimine ning püsiv automaatne koristus on järgnevad väikesed sammud enne avalikku avamist.
- Avaliku avamise eel peab koristus edenema kasutaja nupuvajutusteta ning avatud omanikuvaatest sõltumata. Senine püsiv päevik ja ühe objekti leping säilivad. Tehniline diagnostika jääb sisemiseks; kasutaja näeb tegelikku olekut ja tegevust mõjutavat selget probleemi.
- Sõnumite, privaatsete sõnumifotode ning nende 250 MiB mahuarvestust ei muudeta. Käesolev ettevalmistus ei anna luba kustutada kontosid, identiteete, logosid, teenuseid, tootenäidiseid või päevikuid. Uue fotoeemalduse käivitab omanik konkreetse kinnitusega.
- Hobused jäävad ühisesse lisamise, otsingu, detaili ja omanikuvaate voogu. Energy/maksete tuum ning piiratud AI abi jäävad kokkulepitud V2 käivitamiseelsesse ulatusse.
- R3 vormimustandid jäävad avatud lehe ja aktiivse identiteedi kaupa eraldatuks. Täielik taaslaadimine ei taasta File-objekte. Varem teadaolev välise brauseripäeviku taastamine ja ülejäänud V2 tööd säilivad.

## Keskkond

- Kinnitatud siht: https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; uuendaja vaikimisi siht ~/selqiro. Terminaliviiba kaustanimi ei määra sihti. --repo kasutamisel kontrollivad Git ja CLI sama tegelikku rada.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm / eu-central-1; paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. CLI 2.117.0 viie faili pin ja olemasolev autentimine; uusi paigaldusi ega login’it pole vaja. Need on säilitatud sihid, mitte uus teenusevaatlus.
- Viimane täielik Maci vaatlus on 03.11 koondraportis; hilisem R3 terminal/Vercel seob 8be94cd… . Uus 04.11 veebikatse kinnitab funktsionaalset käitumist, kuid selle täpne Git/HEAD/index/tööpuu ja DB-fingerprint on siin lugemata. Järgmist lähtekaitset ei tuletata vana R3 HEAD-i ega uue dokumentatsioonikoopia põhjal.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
