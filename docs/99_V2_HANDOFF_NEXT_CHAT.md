<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-08 Europe/Tallinn

## Praegune checkpoint

Kasutaja kinnitas kahe fotoga hobuse avaliku detaili, otsingu ja Minu ala. Hobuse galerii ja Minu ala halduse ühine kandidaat on kohalikult kontrollitud: piltide vahetamine ja suurendamine, omaniku pisipilt, ühised staatusevalikud, 90-päevane tähtaeg ja eraldi uuendamine. Tavakuulutuse pildilink on parandatud. Uue paketi Maci paigaldus, Verceli Ready ning pärisbrauseri vastuvõtt on veel ootel.

## Lähtekood ja tõendi piir

- **Alus:** Täpselt säilitatud upload-capacity r2 lähtekood: 1193 faili, manifest dbbe2c0266a91514aeb0bdf07ff1ff711b87c7f0a0547c6cbf44864749694ee9. Maci eduraport määrab uue tegeliku commit’i; uuendaja kontrollib selle vanemat 6bb4385, pealkirja, ulatust ning kõiki Giti objekte. Screenshoti põhjal commit’i ei oletata.
- **Galerii:** Ühine PublicPhotoGallery teenindab hobuse ja tavakuulutuse avalikku vaadet. Nooled, pisipildid, suur vaade, klaviatuur ja puuteliigutus; olemasolevad meedia-URL-id ja õiguskontrollid säilivad.
- **Minu ala:** Hobuse meediaviide läbib oma tüübi kontrolli ja omaniku pilt laetakse autentitud meediatee kaudu. Pilt ja tekst avavad sama sobiva vaate; parempoolne üleliigne avaliku vaate link eemaldatakse. Staatuse, uuendamise ja muutmise esitlus on ühine.
- **Elutsükkel:** Hobune jääb horse_offers UUID-kirjeks. published/paused/closed vastavad Aktiivne/Peatatud/Müüdud valikutele. Esmaavaldamine annab 90×24 tundi; vana NULL-tähtaeg tuletatakse algsest avaldamisest. Sisu muutmine ja staatuse valik ei pikenda tähtaega ega tühista teises aknas tehtud elutsüklitoimingut.
- **Leping:** Uus eraldi horse_lifecycle SQL-parandus kasutab parandatud capacity-r2 kontrollalust. Üks tehing, täpsed sõltuvused ja õigused, eraldi järelkontroll ning sama katse päevik. Vanad rakendatud SQL-failid ja väljastatud paketid jäävad muutmata.

## Tegelik kohalik katse

- Kliendi/galerii/omanikuvaate/elutsükli koondkatse 254/254 PASS, ilma vahelejäetud või tühistatud katseteta. HTTP uued ja säilitatud avaldamistoimingud 15/15 PASS.
- SQL elutsükli käitumine 9/9 ning paigalduse, kõrvalekallete ja atomaarse tagasipööramise katsed 12/12 PASS. Sõltumatu ülevaatus kontrollis moodulite, genereeritud SQL-i ja alusfailide räside vastavust ning kordas kahte võtmekatset.
- Uuendaja taastumise ja peatamise 20/20 katset PASS. Sõltumatu kontroll keeldus veel viiest valest eelmise paigalduse raporti/commiti juhtumist enne andmebaasi või lähtefailide muutmist.
- Täielik Next.js tootmiskooste koos TypeScriptiga PASS sünteetiliste võtmetega; 506 rakenduse lähtefaili räsi püsis koostamise ajal muutmata. Uusi tootmiskoodi lint-vigu ei ole; viis alusversiooni set-state-in-effect leidu säilivad.
- PGlite, sünteetilised HTTP/DOM piirid ja ajutine Git ei asenda native samaaegsust, pärisbrauseri galerii/fookuse kontrolli ega kasutaja Maci, Supabase’i ja Verceli paigaldust. Täpse ZIP-i koostatud paigalduskatse ja baitide kontroll lisatakse eraldi väljastusraportisse.

## Production / kasutajaliides

- Kasutaja kinnitas ekraanipiltidega hobuse hobutest kaks fotot avalikus detailis ning kirje otsingus ja Minu alas. Uue capacity-r2 commit’i või selle privaatse paigaldusraporti eraldi eksporti ei ole; järgmine uuendaja kontrollib need Macis.
- Uue galerii/elutsükli kandidaadi paigaldus, Verceli Ready ja kasutaja vastuvõtt on ootel. Arendustöö ei teinud live-andmebaasi, Storage’i ega deployment’i toiminguid.
- English/Eesti, Frankfurt fra1 ja varasem üks 9-sekundiline fotolisamise kasutajamõõt säilivad varasema tõendina.

## Üks järgmine töö

Paki selqiro-hobuste-haldus-20261108.zip Downloads-kaustas lahti ja järgi HOSTED_PORTAL.md ühte käsku. Seejärel oota selle commit’i Ready/Production tulemust ning kontrolli galeriid, pisipilti, pildilinke, staatust ja eraldi uuendamist. Teenused järgnevad sama Avalda ja Minu ala Muuda/Salvesta loogikaga, töökuulutused hiljem.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus käsk ja vastuvõtt.
- docs/architecture/horse-owner-lifecycle-v1.md — ühine galerii ja 90-päevane haldus.
- docs/architecture/horse-publication-v1.md — kanooniline UUID, revisjon, nõusolek, galerii ja kontakt.
- docs/architecture/shared-marketplace-foundation.md ja docs/known-issues.md — teenused järgmisena ja säilivad piirid.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Staatus ei uuenda tähtaega. 90 päeva pikendamine on eraldi omaniku kinnitus; teise identiteedi või aegunud revisjoni käsk ei tohi tulemust muuta.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse, kolm avatud ja 20 uut toimingut/24 h eraldi olemasolevad kasutuselevõtukaitsed.
- Üldine terminalne taustakoristus jääb eraldi tööks. Uus elutsükkel ei kustuta kuulutusi, pilte, nõusolekuid ega päevikuid.
- Teenuste sisestamine ja muutmine järgib sama Avalda ning Minu ala Muuda/Salvesta voogu ilma kohustusliku eraldi mustandita. Teenuse eriväljad säilivad; töökuulutused hiljem.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Uus SQL rakendub ainult kontrollitud paigalduskäsuga olemasolevasse projekti; arendustöö ei teinud live-toiminguid.
- Node/Sharp piirkond fra1 säilib; sõltuvusi ega teenusepiirkonda ei muudeta. Kohalik kooste ei asenda Maci build/push, Verceli Ready ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
