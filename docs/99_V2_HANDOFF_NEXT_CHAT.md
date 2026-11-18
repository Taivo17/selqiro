<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 18.11.2026 Europe/Tallinn — sõnumimullide ja pakkumiskaartide parandus ette valmistatud

## Praegune checkpoint

Teenuste ja töö jaotiste kujundus 8c3c8e4 on vastu võetud. Kasutaja uued pildid näitavad töö jagamismenüü avanemist ning tegelikku kahepoolset sõnumivahetust töö ja tavakuulutuse kohta. Uus väike parandus eristab enda rohelist sõnumimulli vastaspoole helehallist ning teeb kogu töökaardi otsingus ja profiilil lingiks. Sõnumi pakkumiskaardi olemasolev terviklink saab selgema hõljumise ja fookuse. Kandidaat on kohalikult ette valmistatud; Macile ega Productionisse pole seda siin rakendatud.

## Lähtekood ja tõendi piir

- **Vastu võetud lähtealus:** main, 8c3c8e49a4dfe30799d125b4d45a61003ba5b911; parent 0e9197e250e19f260a6b92ab4dec96c89ca1a183. Raporti ja väljastatud paketi põhjal tuletatud 1874-faililine puu on 7f6ea576188db59d16ee89811521c7a871814730. See ei ole uus live-Maci eksport.
- **Eelmise jooksu tõend:** 17.11 kujundusraport 279207 B, SHA256 13c5644cd5ceb14c86b19f6e8eb82690a1d35bd022aa85c20d73b3df85efc753: complete, build passed, tests not_required_style_only, push verified; database/storage not_performed. Eelmine originaalpäevik säilib lugemisluku all.
- **Uus muudatus:** Kolm runtime-faili: conversation.module.css, ConversationListingCard.tsx ja JobCard.tsx. Enda mull #d4ebdc, saabuv #f1f3f5; loetavad tekst ja kellaaeg. Töökaardi üks native Link katab sisu ja servad. Sõnumi terviklingi kollane/rohekas/sinine pakkumiskontekst säilib.
- **Kasutaja uus tõend:** 18.11 kaheksa pilti: Safari jagamisaken ning töö ja tavakuulutuse tegelik kahepoolne vestlus. Jagamise lõpuleviimist välises rakenduses või otseviite anonüümset kasutust need pildid eraldi ei tõenda. Pildid on paranduse-eelne alus.
- **Järjepidevus:** Eraldi 17.11 vastuvõtukirje on viidud uude praegusse seisu ja päevikusse. 8c3c8e4 kolm ettevalmistusdokumenti säilivad baiditäpselt history/message-card-usability-base-8c3c8e4-20261118 all. Väljastatud varasemad pakid ja raportid jäävad muutmata.

## Tegelik kohalik katse

- Täpselt kolme runtime-faili lähteülevaatus PASS. Kogu 1874-faililist alusallikat võrreldi; sõnumiandmed, saatja tuvastus, transport, õigused, blokeeringud ja ajalooliste pakkumiste seosed ei muutu.
- Üks täielik Next.js/TypeScript build PASS, 729 salvestatud sisendit, drift 0. Olemasolevad lukustatud sõltuvused ja passiivne lokaalne compile-konfiguratsioon; päris kontosid, SQL-i ega Storage’it ei kasutatud.
- Uue kandidaadi brauserikontrolli tulemus: BLOCKED. Täpne piir ja põhjus on paki kontrollid/browser-result.json-is; läbi tegemata kontrolli ei nimetata läbinuks.
- Teksti arvutatud kontrast on mõlemal mullil vähemalt 12,93:1 ja kellaajal vähemalt 5,20:1. Saatja eristamiseks säilivad ka vasak/parem paigutus ning olemasolevad ligipääsetavussildid.
- Väikese esitlus- ja native-lingi muudatuse jaoks rakenduse ühik- või regressioonikatseid ei lisata ega korrata. Uue uuendaja piiratud katsed ja tarnekontroll on paki kontrollid/ all; nende simuleeritud build ei asenda eespool kirjeldatud tegelikku kandidaadibuild’i.

## Production / kasutajaliides

- Viimane vastu võetud Maci commit on 8c3c8e4: build ja push kinnitatud. Teenuste/töö kogumite töölauakujundus ning töö avaliku profiili nähtavus olid 17.11 piltidega vastu võetud.
- 18.11 pildid lisavad töö jagamisakna avanemise ja reaalse kahepoolse sõnumivahetuse tõendi. Neid lõpetatud samme ei nõuta uuesti selle väikese muudatuse eelduseks.
- Uue kandidaadi Maci rakendus, commit/push, Vercel Ready/Production ning tegeliku portaali uus välimus on veel kinnitamata. Kohalik brauserinäidis ei tõenda neid.
- Varasem jobs SQL, identiteediparandus ja blokeeringute vastuvõtt säilivad. Käesolevas sammus puuduvad SQL-i, Supabase CLI ja Storage’i toimingud.

## Üks järgmine töö

Laadi uus selqiro-sonumite-ja-kaartide-parandus-20261118.zip alla ja ava ZIP Downloads-kaustas. Käivita üks HOSTED_PORTAL.md-s olev python3 -I -B uuenda.py --publish käsk. Uuendaja kontrollib tegelikku 8c3c8e4 alust, rakendab ainult kokkulepitud failiulatuse, teeb build’i ning kinnitab commit/push’i. Saada ainult selle jooksu täpne SAADA SEE FAIL raport; Vercelis peab uus commit saama Ready / Production.

**Peatumisel:** Uus uuendaja kontrollib tegelikku main-haru, HEAD-i, kogu lähtepuud, indexit, kinnitatud remote’i ja täpset eelmist originaalraportit. Alusmuutust, tundmatut jätkuseisu või kasutaja muudatusi ei kirjutata üle. Eelmisi paigaldajaid, SQL-i ega lõpetatud katseid ei korrata. Tõrke korral saadetakse uue jooksu täpne raport; uut paigalduskäsku ei oletata.

## Loe ainult vajalikku

- docs/99_V2_HANDOFF_NEXT_CHAT.md — sellest JSON-ist genereeritud üleandmine.
- docs/continuity/HOSTED_PORTAL.md — üks uue paranduse käsk ja tulemuse kontroll.
- docs/architecture/message-card-usability.md — saatjavärvid, terviklink ja kontrolli ulatus.
- Uue paki kontrollid/ — täpne lähteülevaatus, build, brauser, kasutaja tõendi piirid ja uuendaja tarnekontroll.
- docs/continuity/SERVICE_ACCESS.json, docs/03_AI_RULES.md ja docs/00_PROJECT_DNA.md — säilivad sihid ning reeglid; vanad NEXT-id ei asenda seda seisu.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu/rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- Tööpakkumine kuulub aktiivsele ettevõtte identiteedile; see ei tähenda tasulise Business-taseme nõuet. Avaldamine, tavaline otsing, jagamine ja pikendamine ei sõltu Energy ostust. Üks kuu tähendab serveris UTC kalendrikuud, mitte fikseeritud 30 päeva.
- Töö aegumine/peatamine/lõpetamine peidab pakkumise avalikest vaadetest, kuid jätab sisu omanikule ning varasema vestluse alles. Pikendamine ei muuda avaldamiskuupäeva, otsingujärjestust ega peatatud/lõpetatud staatust. CV-hoidlat, värbamise töölauda ega uut fotolaadijat ei lisata.
- 24 tunni peitmine on konto ühe pakkuja identiteedi avastuseelistus, püsiv blokk eraldi kontodevaheline kirje. Ühine menüü on avalikul profiilil; vestluse blokeerimine ja Minu ala haldus säilivad. Vaatamiskoguse väravat/jälgimist ei lisata. Ühe eelistuse eemaldamine ei eemalda teist ega vastaspoole blokki.
- Teenuse aegumine säilitab sisu ja rubriigiseosed omanikule. Peatatud teenuse pikendus ei avalda seda. Teksti/foto/rubriigi/staatuse muutus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab lugemist.
- Avalikud rubriigifiltrid arvestavad nähtavat sisu ja esivanemaid enne lehekülge. Omaniku valija näitab kõiki rubriike; rubriigi eemaldamine säilitab sisu ja fotod. 80 teenust pole konto piir.
- Avaliku foto-URL-i ligipääsu ei muuda pelgalt kuulutuse aegumine privaatseks. Hosted fotode taustakoristus ja tehniliste paneelide eemaldamine on avamiseelne töö. Sellel updateril pole Storage’i toiminguid.
- Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir jäävad eraldi. Energy, maksete tuum ja piiratud AI abi säilivad V2 ulatuses. Kontosid, kuulutusi, pilte, sõnumeid ega ajalugu ei kustutata.

## Keskkond

- Olemasolevad /Users/taivo/selqiro, kinnitatud Taivo17/selqiro remote ja selqiro.vercel.app. Uusi teenuseid, andmebaase ega kasutajaid ei looda.
- Uue uuendaja privaatne päevik on message-card-usability-20261118. Eelmise offer-section-theme-20261117 täpne edukas result.json hoitakse muutmata ja lugemisluku all.
- Uuendaja kasutab olemasolevaid lukustatud sõltuvusi ning ühte täielikku build’i; testiseis on not_required_presentation_only. Eelmise raporti not_required_style_only jääb ajalooliselt täpseks.
- Iga jooks loob unikaalse privaatse Downloads-raporti, prindib SAADA SEE FAIL täpse tee ning avab selle Finderis kuni viiesekundilise käsuga. Vanad raportid säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
