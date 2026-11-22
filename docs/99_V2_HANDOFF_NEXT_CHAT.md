<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 22.11.2026 Europe/Tallinn — 8c2ee5c vastu võetud; Minu ala lugemise taastumine ja pakkumise kättesaadavuse selgitus ette valmistatud

## Praegune checkpoint

Tööotsingu pildivea parandus 8c2ee5c on Maci raporti ja Ready / Production ekraanipildi järgi vastu võetud. Kasutaja kontrollis eraisiku ja ettevõtte tööde otsingut, üksikvaateid, profiile ning kahepoolset sõnumivahetust. 22.11 kontroll kinnitab sulgemist: töö jääb Minu alale Suletud olekuga, eemaldub aktiivsest otsingust ja vestlus säilib. Uus parandus lisab Minu ala ajutisele lugemisveale ühe katkestatava lisakatse ja selgitab, miks avalik töölink ei pruugi enam avaneda.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 8c2ee5c1e7caddcc4a6e4efb630458a331c3e31d; puu 0ac538849571489d831fd2125f50be060642ddbd; 2020 jälgitavat faili. Kõik taastatud lähtefailid vastavad aktsepteeritud SHA-256 ja Git blob inventarile.
- **Aluse tõend:** Raport selqiro-too-otsingu-parandus-20261121-raport-20261121-215836-23170b843f10.json, SHA256 ea2a84183c0db2bb6b87144e65f12345a4716daea96e26a7ddc1d1c449b758ea. Raport kinnitab 37 testi, build’i, varasema ühe SQL-paranduse järelseisu ja push’i. Sama commit’i Ready / Production ning kasutaja töövoo pildid on vastu võetud.
- **Laadimisvea tõendi piir:** Kasutaja pilt näitab esmast laadimisviga ja korduskatse õnnestumist. Täpne võrgu- või serverivea kood ei ole teada. Koodis on tõendatud automaatse taastumise puudumine; auth-race’i ega konkreetset serveri lukuaegumist ei väideta juhtumi kindla põhjusena.
- **Lugemise parandus:** Ajutine transpordi või serveri lugemisviga saab eraldi tunnuse. Ainult oma tööde loendi lugemisel tehakse üks lühikese viivitusega lisakatse. Sama konto, profiili ja põlvkonna kehtivus kontrollitakse uuesti; katkestus peatab nii viivituse kui ka poolelioleva päringu. Õiguste, sisendi, aktori ja vigase vastuse vead ei ole korduskatsena käsitletavad.
- **Suletud pakkumine:** get_public_job_v1 null-vastus ei erista suletud, peatatud, aegunud, puuduvat ega vaatajale piiratud pakkumist. Uus teade ütleb, et pakkumine ei ole praegu avalikult nähtav, nimetab võimalikud põhjused ning pakub linki vestlustesse ja tööotsingusse. Klient ei tuleta null-vastusest kindlat Suletud olekut.
- **Ulatus:** Muudatus on kliendis ja selle testides. Serveri õigused, SQL, RPC lepingud, ranged vastuseparserid, mutatsioonid, sulgemine, pikendamine, kontakt ja ajaloolised sõnumikaardid säilivad. Eelmised jooksva juhendi failid on baiditäpselt säilitatud history/job-load-base-8c2ee5c-20261122 all.

## Tegelik kohalik katse

- Läbitud sihitud API ja lugemise taastumise testid, olemasolevad töökuulutuse kliendi/pildilugemise/jagamise testid ning päris React DOM-i testid. Täpsed käsud, arvud, logiräsid, sisendid ja runtime-versioonid on paketi kontrollid/proof kaustas.
- Kontrollid hõlmavad esimese ajutise vea järel õnnestumist, kahe vea järel peatumist, õiguse ja vigase skeemi veal korduse puudumist, profiilivahetusel katkestust ning vana vastuse peitmist. Kirjutamise toiminguid automaatselt ei korrata.
- Kättesaadavuse vaate testid eristavad laadimist, edukat null-vastust, päringuviga ja aktiivset tööd; selgitus ja tagasitee on kontrollitud eesti ja inglise keeles.
- Uue lähtekoodi täielik Next.js 16.4.6 / TypeScripti build läbis. Kasutati lukufaili täpseid sõltuvusi ja inertseid lokaalseid koostamisseadeid. Brauseri päris teenustega läbimängimist ega kasutaja Maci käivitamist siin ei väideta.
- Macis käivitab uuendaja sihitud Node testid ja värske build’i. Ettevalmistuse React DOM-i kontrollid kasutavad eraldi JSDOM-i; seda ei lisata portaali sõltuvuseks ega eeldata kasutaja arvutis.

## Production / kasutajaliides

- 8c2ee5c paigaldus ja Ready / Production on vastu võetud. Varasemad uuendajad jäävad ajalooks.
- Kasutaja 22.11 piltidel on töö sulgemine ja säiliv vestlus kinnitatud. Suletud töö avaliku lingi null-vastus vastab senisele lepingule.
- Selle uue lähtekoodiparanduse Maci käivitus, commit/push, Verceli avaldamine ja kasutaja kontroll on ootel.

## Üks järgmine töö

Ava selqiro-too-laadimise-parandus-20261122.zip Downloads-kaustas ja käivita python3 -I -B "$HOME/Downloads/selqiro-too-laadimise-parandus-20261122/uuenda.py" --publish. Saada SAADA SEE FAIL juures näidatud raport; oota sama uue commit’i Ready / Production tulemust ja värskenda portaali. Kontrolli Minu ala tööloendi avanemist ning olemasoleva suletud töö sõnumilingi selgitust ja tagasiteed.

**Peatumisel:** Tundmatu lähtekood, indeks, remote, eelmise eduka käigu raport, sõltuvused või kontrolltulemus peatab uuendaja. Säilita raport ja päevik ning saada näidatud raport või selle puudumisel PEATATUD rida. Uuendaja ei tee andmebaasimuudatusi.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — praeguse paranduse käivitamine.
- docs/architecture/job-load-recovery-20261122.md — korduslugemine, kättesaadavus ja tõendi piir.
- docs/architecture/job-image-read-20261121.md — varem vastu võetud avaliku pildi lugemise parandus.
- docs/architecture/personal-jobs-20261121.md — eraisiku ja ettevõtte töökuulutuse leping.

## Säilivad piirid

- Kolm kontot on kasutaja enda omad; väliseid testijaid ei ole. E-posti aktiveerimine lükati edasi domeeni kasutuselevõtuni. Enne väliseid testijaid või avalikku registreerimist tuleb kinnitamine, kirjade saatmine ja parooli taastamine lõpuni kontrollida ka juhul, kui avalik aadress on veel vercel.app.
- Põhidomeeniks valiti selqiro.com. Kasutajale kuuluvad ka selqiro.app, selqiro.io ning selkiro.com/.app/.io. Domeenide ja DNS-i seadistust selles paketis ei tehta.
- Ülesannete ja töökohtade eristus ei otsusta lepingu õiguslikku liiki. Konto tüübi laiendus ei laienda riikide poliitikaid ega möödu senisest country-scoped policy peatumisest.
- Olemasolevaid kasutajaid, profiile, töid, vestlusi, pilte, tingimusi ja kviitungeid ei kustutata ega kirjutata ringi. Üks kalendrikuu kehtivus, tasu täpsed kümnendsummad, poliitika nõusolek, revisjonid ja konto/identiteedi seos säilivad.
- Vanasse avatud brauserilehte jäänud range parser ei pruugi uusi task väärtusi ega avaldaja identity_type välja tunda. Pärast sama versiooni Ready / Production tulemust tuleb leht värskendada. See ei ole nullkatkestusega eri kliendiversioonide leping; senised muutumatud päringusisendid ja kviitungid säilivad.
- AI päringuteed jäävad suletuks. Konto sulgemine/kustutamine, reklaami ja esiletõstmise iseteenindus ning laiem avamiseelne ülevaatus on järgnevad tööd.

## Keskkond

- Olemasolev /Users/taivo/selqiro ning Taivo17/selqiro remote. Selle paketi ainus alus on 8c2ee5c1e7caddcc4a6e4efb630458a331c3e31d.
- Next 16.4.6, Sharp 0.35.5, package.json ja package-lock.json säilivad. Maci uuendaja kontrollib paigaldatud sõltuvusi; see ei paigalda ega uuenda neid.
- Uuendaja hoiab eelmise eduka käigu originaalraporti ainult lugemiseks lukus, kontrollib kogu aluspuud ning teeb testide ja build’i järel ainult selle paketi commit’i ja push’i.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
