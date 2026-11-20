# Profiili lugemisprivaatsus — 20.11.2026

## Miks see samm eelneb redaktorile

Kasutaja tagastatud metadata-kontroll lõppes 20.11.2026 kell 15:49:09–15:49:13 Eesti aja järgi edukalt. Originaalne tulemusZIP: `4701511ece913c157154d584c76bc884c149dfc846dfd010ceb1b8a779b1c39d`; kataloog: `65576343bd8c024f35c30e3f7b89007e9fc1dc1b0372d476e8bab23f5610dfb2`. Commit `5312ea0`, lähtepuu, indeks ja remote jäid muutmata. Päring luges PostgreSQL 17.6 õiguste metadata’t ja kahte fikseeritud seadistust, mitte profiilide või vestluste sisu.

Kataloog kinnitas, et `profiles` ja `identity_profiles` tabelite avalik SELECT-õigus hõlmab kõiki veerge ning mõlemal on `USING true` lugemisreegel. Esimeses on muu hulgas konto e-post ja kodu koordinaadid; teises täpne aadress, koordinaadid ja sisemised muutja tunnused. Eraldatud katses õnnestus konto `profiles` privaatseid testvälju anonüümselt lugeda; `identity_profiles` otsepäringut takistas allpool kirjeldatud varasem RLS-rekursioon. Avalik `get_store_by_slug` tagastas täpse asukoha ka eraisiku puhul. Kasutajaliidese linnavaade üksi ei piiranud andmebaasi vastust. Need on kinnitatud õiguste ja vastuseväljade probleemid; metadata ei näita, kas keegi tegelikke kasutajaandmeid luges.

Kõigi 17 kontrollitud Selqiro funktsiooni keha SHA256 vastas olemasolevale lähtekoodile. Kaheksat Storage’i platvormitriggerit ei muudeta. Algne katalogi- ja jooksuraport jäävad muutmata ning kuuluvad väljastuspaketi tõenditesse.

## Piiratud muudatus

- `profiles`: autentitud kasutaja loeb ainult enda kontorida. Usaldatud teenuserollide olemasolev ligipääs säilib.
- `identity_profiles`: kliendile on otse loetavad ainult avaliku kaardi jaoks valitud veerud. Aadressi, koordinaatide, kontaktide, auditi ja paketi toorveerge ei anta avalikule lugejale.
- `get_store_by_slug`: eraisiku aadress ja koordinaadid tagastatakse nullina. Asukoha peitmise valik ja tundmatu valiku korral suletud käitumine rakenduvad serveris. Ettevõtte täpne külastusaadress vajab selget `exact` valikut; olemasolev vaikimisi `city` ei avalda täpset aadressi.
- Oma aktiivse profiili kaks lugemisfunktsiooni kontrollivad uuesti kehtivat identiteedi ligipääsu. Eemaldatud liikmesus ei anna salvestatud aktiivse identiteedi kaudu vana ligipääsu edasi.
- Kuulutuse müüjakaart kasutab kitsast avalikku nime/lingi/pildi vastust. Oma identiteetide nime ja lingi jaoks kasutatakse olemasolevat ligipääsukontrolliga päringut. „Minu ala” paketiinfo kasutab autentitud ja identiteediga seotud päringut ning vana tasemeinfo tühjendatakse enne uut laadimist.

Täielike olemasolevate RLS-reeglitega eraldatud katse tõi esile ka varasema `business_members` reeglite rekursiooni, mis takistab profiilitabeli otsest lugemist. Kuulutuse lugeja ja päise üleliigsed toortabelipäringud asendatakse olemasolevate kitsaste funktsioonidega. Liikmesuste reegleid see parandus ümber ei kirjuta. Vana profiiliredaktori nime saadavuse eelpäring kuulub järgnevasse kirjutamisparandusse; lõpliku unikaalsuse tagab andmebaasi piirang.

Kasutajasisu ridu ei kirjutata ümber. Ka fotosid, aadresse ega vanu profiile ei kustutata. Vaba linnatekst või kirjeldus võib ise sisaldada aadressi; sellest ei lubata automaatselt linnataset tuletada. Uus redaktor lahendab struktureeritud üldise asukoha ja avaliku info selgituse eraldi.

## Kontrolli piir

SQL-i õigused tuleb kontrollida päris andmebaasirollide semantikaga eraldatud testandmetel, sh anonüümne lugeja, omanik, teine kasutaja, aktiivne ja eemaldatud ettevõtteliige, peidetud/privaatne asukoht, vastastikune blokeering ning tundmatu kataloogiseis. Kohalik PGlite/PostgreSQL WASM ei ole tootmisandmebaas. Uuendaja kontrollib tegelikku kataloogi uuesti enne ja pärast üht piiratud tehingut. Ebaselget tulemust ei esitata eduna ega korrata automaatselt.

Rakenduse sihitud test käivitab tegelikud TypeScripti lugejad sünteetiliste Supabase vastustega. Täielik build kontrollib tüübivastavust; see ei ole avaliku portaali brauserikatse. Väljastuspaketi tõendites on täpsed käivitused, tulemused ja failiräsid.

## Esimese uuendaja peatumine ja eraldi jätkupakett

20.11.2026 kell 16:34 tagastatud raport on 546 baiti, SHA256 `cc2c7d34e4da055faf48b006bc4df3c830bd5b62a87c077b269ef7e1012ca3c9`. See kuulub väljastusele `09cc0246f5085b93e02728649f0ed9c8aceb47e33e0384ae678de3f80ea7053b` ja näitab `stage: stopped_preserved`, `stopped_at: started`, veakoodi `PREVIOUS_RELEASE_RECEIPT_REQUIRED`, `database: not_started`, `tests/build/push: not_run`, `commit: null` ning `commands: []`. Lähtekoodi rakendamise, andmebaasipäringu ega avaldamise sammuni ei jõutud.

Algne koguja `package_result` kirjutas tulemuskausta `result.json`-i ja `catalog.json`-i. `FILE_MANIFEST.json` tekkis ainult mälus ning lisati ZIP-i. Esimese uuendaja `CollectorReceipt` eeldas ekslikult, et see fail asub ka kaustas. Eelmine kaustatesti näidis pakkis kõik kolm ZIP-i liiget kausta välja ja varjas tootja ning lugeja paigutuse erinevuse. Algse eksportija kontrollitud taasesitus annab kasutaja tagastatud 17 990-baidise ZIP-i täpselt sama kontrollsummaga; ketta manifesti see ei loo.

Eraldi `selqiro-profiili-lugemisprivaatsus-jatk-20261120` kasutab algseid kaustas olevaid tulemus- ja kataloogifaile ning täpselt kontrollitud ZIP-i kolme liiget mälus. Arhiivi ei pakita kasutaja kausta lahti ega looda tagantjärele puuduvat manifesti. Uuendaja seob jätkamise peatunud algse käigu täpse raportiga, hoiab selle olemasolevat lukku ainult lugemiseks ning kontrollib tõendite säilimist. Varasema käigu muutumine või töö edasijõudmine ei anna luba uut SQL-kirjutust alustada.

Rakenduse lugejate, sihitud rakendustesti ja SQL-i paranduse baidid jäävad esimesega samaks; jätkupaketi muudatus puudutab uuendaja tõendite lugemist ja jätkamisjuhiseid. Algne väljastuspakett, raport ja kontrollitõendid säilivad. Jätkupaketi Maci käiku, andmebaasi järelkontrolli ega uut tootmisväljastust ei ole selle ettevalmistuskirje ajal veel kinnitatud.

## 17:16 peatunud jätkukäik ja järjestusparandus

Jätkupaketi uus originaalraport on 284433 baiti, SHA256 `522fbb2910f4afc112a2bd444f9b76dbc5ec5ba93a31904adeeb2c6c4536b843`, release `f8db8efaec47cf19c12364e7177c4f3d54c9f8cb106030368b2f520e9d093a2f`. See näitab `stopped_at: baseline_verified`, `DATABASE_PRECONDITIONS_NOT_MATCHED`, `database: not_started`, käivitamata testi/build’i/push’i ja puuduvat commit’i. Üks read-only preflight lõppes edukalt; kohalik lähtekood ja varasem väljastus säilisid.

Päringu saadud seisuräsi oli `0fee6aa5265d1213dd0e7be3b841135442affb2dc75fcbfcdc5b9802b50b8eb8`, oodatud enne-räsi `a09a7fd154af348f9b6b87043a6dece6e58eb67a3324a174665ef6f3db7e7a50`. Kinnitatud algse kataloogi kõik väärtused annavad täpselt oodatud objekti. Ainult üheksa funktsiooni ACL-massiivi ning `public.identities` ja `public.profiles` poliitikate massiivi lokaadipõhine ümberjärjestus annab täpselt saadud räsi. Ühtegi õigust, poliitikat, väärtust ega massiivi elementi pole selleks vaja muuta.

Algne koguja sorteeris poliitikanimed PostgreSQL-i `name` tüübina C-järjestuses. Uue normaliseerimise JSON-tekst sorteeriti vaikimisi serveri kollatsiooni järgi. Kohalik C-keskkond varjas erinevust. Sõltumatud JavaScripti en-US ja PostgreSQL-i `unicode` järjestuskatsed taastoodavad sama vea. Hosted-andmebaasi lokaadi täpset nime ei väideta teada olevat; tõend on täieliku räsi samasus. Kohaliku PGlite libc `en_US` alias käitub nagu C ega sobi üksi lokaaditaluvuse katseks.

Uus eraldi `selqiro-profiili-kontrolli-parandus-20261120` lisab kanooniliste SQL-tekstijärjestuste juurde `COLLATE "C"`. Algne enne-räsi ning pärast-räsi `7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f` säilivad. Kõik kontrollitavad õigused, RLS, funktsioonid ja projekti seos jäävad seisulepingusse; saadud tundmatut räsi lubatud seisuks ei lisata. Rakenduskood ja õigusi muutev SQL-sisu säilivad.

Katse peab tõendama vana vea päriselt erineva järjestusega kollatsioonil, parandatud enne/pärast räsi ning õiguste tegeliku muutuse jätkuva tõrjumise. Uus Maci käik kontrollib uuesti tegelikku andmebaasiseisu. Algseid raporteid, välja antud pakette, varasemaid migratsioone ja ajaloolist lähteüleandmist ei kirjutata üle. Uue paketi rakendus, DB järelkontroll, commit/push ja Ready / Production on selle ettevalmistuskirje ajal kinnitamata; täpne üks käsk on `docs/continuity/HOSTED_PORTAL.md`-s.

## Järgnev töö

Enne uue profiiliredaktori avamist tuleb parandada kirjutamisõiguse kontroll ja siduda salvestus oodatud identiteedi ning versiooniga. Serveri hallatavad premium/plan/verification väljad vajavad eraldi kirjutuskaitset. Seejärel tuleb ühtne profiili nimi/pilt, serveris kontrollitud pilditöötlus ja koristus, lihtsam liitumine ning sõnumite profiililink. Konto kustutamise ja säilitamise reeglid, sõltuvuste turvauuendused ning reklaami iseteenindus jäävad oma tööetappideks.

Allikad: tagastatud katalogi- ja jooksuraport; kinnitatud lähtekood; PostgreSQL 17 ametlik õiguste kirjeldus https://www.postgresql.org/docs/17/sql-grant.html ja https://www.postgresql.org/docs/17/ddl-rowsecurity.html . Tabeli SELECT-i ei saa tühistada üksnes ühe veeru õiguse eemaldamisega; kõigepealt eemaldatakse lai tabeliõigus ja seejärel antakse lubatud veerud.
