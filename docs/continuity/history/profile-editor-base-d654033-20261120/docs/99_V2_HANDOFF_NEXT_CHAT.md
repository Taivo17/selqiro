<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 20.11.2026 Europe/Tallinn — kell 17:16 peatunud kataloogikontrolli järjestusviga täpselt taastoodetud; uus eraldi paranduskandidaat

## Praegune checkpoint

Viimane vastu võetud tootmiscommit on 5312ea0. Profiili lugemiskontroll kell 15:49 lõppes edukalt. Esimene privaatsusuuendaja peatus kell 16:34 kontrollfaili asukoha vea tõttu. Jätkupakett jõudis kell 17:16 ainult read-only kataloogikontrollini ning peatus enne muudatusi. Selle täpne kontrollsumma erinevus on taastoodetud samade õiguste kirjetega: SQL järjestas teksti serveri lokaadi järgi, kohalik näidis kasutas C-järjestust. Uus selqiro-profiili-kontrolli-parandus-20261120 määrab järjestuse üheselt. Algne enne/pärast kontrollsumma ja õigusteparanduse sisu säilivad. Uue paketi Maci rakendus ning tootmistulemus on ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 5312ea0fa0d430b9f62ffd29c2200b0a6d0f61b3; parent 7c7bc115e209495d5610a76e8626f9f049451274; puu 87d785b415f65b2ae5412100cfd5f7ece943bef2; 1891 lähtefaili.
- **Maci vastuvõtt:** AI raport SHA256 a1fb1f941245f96c43bb85f2deb6024b8b11fc7032b2c2a9817fc7e9d1dc9b79: complete, test/build passed, push verified. Raporti ajaloolist READY_NOT_CHECKED välja ei muudeta; eraldi pilt on visuaalne sama commit’i Ready / Production tõend.
- **Profiili inventuur:** Originaalne tulemusZIP SHA256 4701511ece913c157154d584c76bc884c149dfc846dfd010ceb1b8a779b1c39d; catalog.json SHA256 65576343bd8c024f35c30e3f7b89007e9fc1dc1b0372d476e8bab23f5610dfb2. PostgreSQL 17.6, read_only=on, üks metadata päring, kasutajasisu ridu ei loetud.
- **Lähtevastavus:** Kõik 17 loetud Selqiro rakendusfunktsiooni keha kontrollsummat vastavad kinnitatud lähtekoodile. Kaheksat Storage’i platvormitriggerit ei asendata. Kontroll ei ole kogu portaali turvaaudit ega tõend, et keegi on andmeid kuritarvitanud.
- **Parandus:** Konto toortabeli lugemine piiratakse omanikule; avaliku profiili toortabelist on kliendile lubatud ainult valitud avaliku nime/lingi/pildi veerud. Avalik profiilipäring ei väljasta eraisiku aadressi ega koordinaate. Oma aktiivse profiili lugemine kontrollib uuesti kehtivat juurdepääsu. Kuulutuse müüjakaart, päise profiililink ja „Minu ala” paketiinfo kasutavad kitsaid RPC-sid. Olemasolevate liikmesusreeglite rekursioonist mõjutatud üleliigsed toortabelipäringud eemaldatakse; liikmesusreegleid ei kirjutata ümber.
- **Järjepidevus:** Varasemad kolm continuity-faili on baiditäpselt history/profile-read-privacy-base-5312ea0-20261120 all. Kõik väljastatud ZIP-id ja algsed raportid jäävad muutmata. Reklaami automaatne iseteenindus ja riigipõhine hinnakiri on uusim kinnitatud suund; vana käsitsipäringu soovitus on asendatud.
- **Peatunud esimene käik:** 16:34 raport SHA256 cc2c7d34e4da055faf48b006bc4df3c830bd5b62a87c077b269ef7e1012ca3c9; stopped_at started, PREVIOUS_RELEASE_RECEIPT_REQUIRED; ühtegi käsku ega muudatust ei tehtud. Manifest oli koguja ZIP-is, mitte kaustas; see lugemise tee parandati eraldi jätkupaketis.
- **Peatunud jätkukäik:** 17:16 raport SHA256 522fbb2910f4afc112a2bd444f9b76dbc5ec5ba93a31904adeeb2c6c4536b843 (284433 B), release f8db8efaec47cf19c12364e7177c4f3d54c9f8cb106030368b2f520e9d093a2f; stopped_at baseline_verified, DATABASE_PRECONDITIONS_NOT_MATCHED. Üks edukas read-only preflight; database not_started, tests/build/push not_run, commit null. Varasem väljastus säilis.
- **Järjestusvea tõend:** Kinnitatud metadata 11 massiivi järjekorra muutmine, ilma ühegi õiguse või muu väärtuse muutmiseta, taastoodab täpselt rapordi 0fee6aa5265d1213dd0e7be3b841135442affb2dc75fcbfcdc5b9802b50b8eb8. C-järjestus annab endiselt algse a09a7fd154af348f9b6b87043a6dece6e58eb67a3324a174665ef6f3db7e7a50. Oodatud kontrollsummat tundmatu seisuga ei asendata.
- **Uue paranduse piir:** Uus pakett kontrollib algseid raporteid ja koguja ZIP-i nende tegelikust asukohast ning jätab varasemad tõendid muutmata. SQL-i kanooniliste tekstijärjestuste COLLATE C eemaldab lokaadist sõltuvuse. Rakenduskood, sisuline õigusteparandus ja algsed enne/pärast seisulepingud säilivad.

## Tegelik kohalik katse

- Tegelike TypeScripti lugejate sihitud katsete tulemus on uue paketi kontrollitõendites. SQL-i rolle ja privaatsuspiire kontrollitakse eraldatud sünteetilise andmestikuga; päris kasutajaandmeid kohalikku testi ei kopeerita.
- Kohalikud SQL katsed kasutavad PGlite/PostgreSQL WASM-i, mitte kasutaja tootmisandmebaasi. Uuendaja kontrollib enne rakendust uuesti tegelikku projekti ja oodatud kataloogiseisu.
- Uuendaja protokoll nõuab rakenduse testi ja täielikku build’i enne SQL rakendust, commit’i ja push’i. Ebaselge SQL-vastus ei anna luba sama kirjutust automaatselt korrata. Uue Maci käigu tulemus tuleb eraldi vastu võtta.
- Järjestusvea täpne taasesitus kasutab sõltumatult JavaScripti en-US järjestust ning PostgreSQL-i unicode-kollatsiooni; mõlemad annavad sama peatunud rapordi kontrollsumma. Kohalik libc en_US, mis käitub nagu C, ei tõenda lokaaditaluvust. Paranduse kontrollid peavad säilitama senised õiguste muutuse STOP-testid ja tehingu järelkontrolli tagasipööramise katse.

## Production / kasutajaliides

- Viimane visuaalselt vastu võetud tootmisväljastus on 5312ea0. Mõlemad privaatsuse uuendamise katsed peatusid enne muudatusi. Uue järjestusparanduse rakendust, DB järelkontrolli ega uut Ready / Production tulemust ei ole veel kinnitatud.
- Koguja tulemus kinnitab 20.11 kell 15:49 metadata lugemist; 17:16 raport kinnitab hilisemat read-only preflight’i. Need ei asenda paranduse rakendamise järelkontrolli.

## Üks järgmine töö

Käivita ainult: python3 -I -B "$HOME/Downloads/selqiro-profiili-kontrolli-parandus-20261120/uuenda.py" --publish. Saada lõpus näidatud täpne uus raport. Pärast edukat commit’i ja push’i kontrolli sama commit’i Verceli Ready / Production tulemust. Säilita kõik varasemad paketid, originaalraportid ja koguja ZIP; varasemaid käike ei korrata. Pärast vastuvõttu jätkub profiilikirjutuse õiguste ja versioonisidumise, tasemeväljade kaitse ning ühtse profiiliredaktori/pilditee töö.

**Peatumisel:** Tundmatu lähtekood, remote, paketifail, CLI, varasema käigu tõend või andmebaasiseis peatab töö. Kontrollsummat ei muudeta tundmatu seisuga sobivaks. Saada täpne uus raport või STOP-rida; puuduvat tõendit käsitsi ei looda ega ebaselget kirjutust automaatselt korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — praegune üks käsk ja tõendipiir.
- docs/architecture/profile-read-privacy-20261120.md — kinnitatud metadata leid, kitsas parandus, allesjääv töö.
- docs/architecture/advertising-pricing-self-service-plan.md — kasutaja kinnitatud automaatne hinnakiri ja riigipõhine hind.
- supabase/repairs/20261120_profile_read_privacy — läbivaadatud SQL, kataloogiseisu leping ja isoleeritud katsed.

## Säilivad piirid

- Olemasolev portaal ja andmebaas. Pakkumiste omanikke, liikmesusi, kasutajate profiiliandmeid ega Storage’i faile ei muudeta selles lugemisprivaatsuse etapis.
- Eraisiku täpne aadress ja koordinaadid ei kuulu avalikku asukohta. Vaba linnatekst, kirjeldus ja pildid võivad ise sisaldada aadressi; neid ei puhastata ega kustutata automaatselt. Uus redaktor peab kasutama linna/piirkonna välja ja selget avalikkuse juhist.
- Avaliku info kitsendamine ei paranda veel vana profiilikirjutaja õiguse/identiteedi/versiooni sidumist, premium/plan/verification väljade kirjutuskaitset ega profiilipildi serveri töötlust. Need jäävad avamiseelseteks töödeks.
- Ühe nähtava eraisiku/ettevõtte profiiliga liitumine, sama pildi/nime kasutamine sõnumites ja avalikus profiilis ning konto sulgemise/kustutamise täpne kord on järgnevad eraldi tööd. Olemasolevat mitme identiteedi mudelit ei lammutata.
- Reklaam ja esiletõstmine: automaatne avalik hinnakiri, ühine alghind ja riigi erihinna valmidus, fikseeritud paketid. Põhitee on iseteenindus; käsitsi lahendatakse erandid. Oksjon ja automaatne nõudluspõhine ümberhindamine pole esimese avamise eeltingimused.
- AI jääb suletuks. Vanade Energy reserveeringute koondseisu ei ole loetud ega automaatselt tagastatud. Sõltuvuste turvauuendused ja laiem portaali turvaülevaatus pole selle parandusega lõpetatud.

## Keskkond

- Kasutaja olemasolev /Users/taivo/selqiro; kinnitatud Taivo17/selqiro remote; lähtecommit 5312ea0. Uusi kontosid, andmebaase ega makseteenuseid ei looda.
- Olemasolev täpselt kontrollitud Supabase CLI 2.117.0, kinnitatud projekt ja read-only originaalraportid. Uuendaja ei paigalda uusi sõltuvusi ega küsi võtmete kleepimist.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
