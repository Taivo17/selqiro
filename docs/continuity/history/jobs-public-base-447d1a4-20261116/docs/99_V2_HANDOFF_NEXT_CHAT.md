<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 15.11.2026 Europe/Tallinn — blokeeringu säilimise katse vastu võetud; varem loetud seisu kuvaparandus kohalikult ette valmistatud

## Praegune checkpoint

Viimane vastu võetud Maci/Giti ja Production-seis on 3aaebc6. 14.11 andmebaasi õigusteparandus ning 15.11 kasutaja kahe vahelehe blokeeringu säilimise katse on lõpetatud. Uus kitsas klient eristab varasemat seisupilti viimase eduka lugemise seisust ning peidab kokkuvõtte, kui vana sihtrida pole enam saadaval. Uue pakendi Maci rakendamine, commit/push ja Verceli avaldamine on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Vastu võetud lähtealus:** /Users/taivo/selqiro, main, 3aaebc6d663e6d11c02c49bed502b32ed4312852; parent 29b2457893d6fa9bab2756533319fdc13b841840. Täpne 1765-failine Git-puu ce11882a16861c7401ac22fd18d96c9b6fa84444 on raporti, varasema väljaande ja iga faili räside kaudu sõltumatult tuletatud. Uut live-Maci/GitHubi lugemist siit ei tehtud.
- **Viimane tegelik raport:** selqiro-blokeeringu-parandus-20261114-raport-20261114-172143-e13161720943.json, 274617 B, SHA256 d2d6aa561050d4d6f05b4d985d538eadb3df4b846c47d036ca424e8803c367d8. Stage complete; database verified; commit/push 3aaebc6. Andmebaasi üks apply ja sõltumatu verify andsid sama applied-seisu, üheksa kaitset true ja muutmata kolm invarianti.
- **Kasutaja vastuvõtt 15.11:** „kõik toimis sinu kirjelduse järgi”. Viis pilti 15:18:23–15:20:49 näitavad eemaldamist, uut blokeerimist, blokeeritud vestlust, vana kinnituse unknown-teadet ning lõppnimekirjas alles olevat blokeeringut. Vestlusajalugu säilis. Unknown vastuse konkreetne HTTP/RPC põhjus jäi tõendamata; seda ei liigitata tagantjärele konfliktiks.
- **Uue koodi ulatus:** Neli runtime-faili: jagatud dialoog, eelistuste kokkuvõte, EN/ET sõnastus ning väike tuletatud kuvamudel. Ready ja saadaval siht näitab „Seis viimase kontrolli ajal”; muu säilitatud seis „Varem loetud seis” koos selgitusega. Kui targetAvailable=false, ei näidata eelistuste kokkuvõtet. Seansimudel, API, CAS, SQL, autentimine ja automaatse korduse keeld on muutmata.
- **Tarne ulatus:** 19 täpset teed: 4 runtime-faili, 5 sihttesti/brauserikatse faili ning 10 dokumenti/ajalookirjet. 8 asendust, 11 lisandust, 0 kustutust; 1757 muutmata alusfaili kaitset; kandidaat 1776 faili. Uuendaja kontrollib olemasolevat edukat 3aaebc6 päevikut ainult lugemiseks ja värsket Git-seisu enne kirjutamist. Andmebaasi, Storage’i ega kliendimärgi toiminguid pole.
- **Järjepidevus:** Kolm täpset 3aaebc6 continuity-faili säilivad history/provider-state-feedback-base-20261115/ all. Kogu senine dev-log ja arhitektuur säilivad baiditäpse prefiksina. 14.11 SQL-paranduse ning 15.11 kasutuskatse vastuvõtt on nüüd kandidaadi dokumentides; varasemat väljastatud pakki ega Maci päevikut ei muudeta.

## Tegelik kohalik katse

- Uue sõnastuse 7/7 sihttesti PASS: tegelik seansimudel ja Reacti dialoogi renderdus katavad kirjutuse ebakindla tulemuse, ootel/nurjunud/eduka lugemise, konflikti säilimise, hilinenud vastused, konto vahetumise, vana sihtrea kadumise ning EN/ET/fallback. Test ei käivita SQL-i ega võrku.
- Täielik Next 16.2.1 webpack build PASS, TypeScript PASS, 28 staatilist lehte. 675 runtime-/seadistussisendit, räsierinevusi 0. Esimene katse peatus olemasoleva AI-marsruudi puuduval build-keskkonna muutujal; teine sama lähtekoodiga katse läbis inertsete kohalike build-väärtustega. Päris saladusi ega hosted-teenuseid ei kasutatud.
- Tegelik brauserikontroll jäi keskkonna piirangute tõttu tegemata. Kohalik Chromium peatus socket()-õiguse vea tõttu enne ühegi testijuhu käivitumist. Lubatud CDP-brauser ei pääsenud kohaliku HTTP-serverini ning selle file-URL katse keelas brauseri turvapoliitika. Edasised brauserikatsed lõpetati; käesolevat kasutajaliidese tulemust pärisbrauseris ei ole kinnitatud.
- Uuendaja 14 sihitud protsessi-, jätkamise-, päeviku- ja failisäilituse juhtu PASS. Lõpliku 19-failise manifesti, loaderi ning tegeliku ajutise Git-puu/indexi kontroll on pakendi kontrollid/loplik-kontroll.json-is. Ajutise Giti ja sünteetiliste teenusepiiride tulemus ei tõenda Maci ega live-push’i.
- Varem lõpetatud SQL-kontrolle, peitmise katset ning kahe seadme ja kahe vahelehe blokeeringukatset ei korrata selle kuvaparanduse tõttu.

## Production / kasutajaliides

- 3aaebc6 Ready / sinine Production kasutaja 14.11 kuvatõmmisel ning sama commit’i Maci raport jäävad vastu võetuks. 15.11 blokeeringu säilimise päris kasutuskatse on vastu võetud koos unknown-teate täpse erisusega.
- Uue kuvaparanduse lähtekood ja kohalikud kontrollid ei tähenda selle rakendamist Macis ega Productionis. Selleks on vaja käesoleva uue jooksu täpset raportit ning selle loodud commit’i Ready / Production tulemust.
- 24 tunni peitmine, püsiv kontodevaheline blokeering, vastaspoole blokk, sõnumikeeld, mustand, foto eelvaade ja ajalugu säilivad olemasoleva lepingu järgi. UI-tekst ei tõenda serveri värsket seisu enne edukat lugemist.

## Üks järgmine töö

Paki selqiro-salvestatud-seisu-teade-20261115.zip Downloads-kausta lahti ja käivita: python3 -I -B "$HOME/Downloads/selqiro-salvestatud-seisu-teade-20261115/uuenda.py" --publish. Saada selle jooksu täpne SAADA SEE FAIL JSON-raport. Pärast edukat commit/push’i vaata sama uue commit’i Ready / Production tulemust ning värskenda portaali; kontrolli ainult uue seisukirjelduse arusaadavust. Varasemat SQL-parandust ja vastu võetud blokeeringukatset ei korrata.

**Peatumisel:** Uuendaja peatub muutunud HEAD-i, haru, indexi, tööpuu, lähteallika, kinnitatud remote’i või eelmise eduka päeviku korral. Kasutaja muudatusi ega päevikuid ei nullita. Teadmata protsessi/commit/push’i tulemus nõuab selle jooksu raporti ülevaatust; seda ei korrata pimesi. SAADA SEE FAIL koopia puudumisel näidatakse kontrollitud originaali; puuduva raporti korral saada PEATATUD-rida. Võimalikult aegunud raporti märge säilib.

## Loe ainult vajalikku

- docs/99_V2_HANDOFF_NEXT_CHAT.md — sellest seisukirjest genereeritud üleandmine.
- docs/continuity/HOSTED_PORTAL.md — ainult käesoleva kuvaparanduse käsk ja raport.
- docs/continuity/PROVIDER_STATE_FEEDBACK_20261115.md — vastu võetud lähtealus, kuvareegel, sihtkontrollid ja tõendipiir.
- docs/architecture/provider-controls-v1.md — konto-, CAS- ja kuvareeglid; 15.11 lisand asendab varasemate ettevalmistuskirjete hetkeseisu.
- docs/continuity/SERVICE_ACCESS.json, docs/03_AI_RULES.md ja docs/00_PROJECT_DNA.md — säilivad sihid ja püsireeglid.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu/rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- 24 tunni peitmine on konto ühe pakkuja identiteedi avastuseelistus, püsiv blokk eraldi kontodevaheline kirje. Ühine menüü on avalikul profiilil; vestluse blokeerimine ja Minu ala haldus säilivad. Vaatamiskoguse väravat/jälgimist ei lisata. Ühe eelistuse eemaldamine ei eemalda teist ega vastaspoole blokki.
- Teenuse aegumine säilitab sisu ja rubriigiseosed omanikule. Peatatud teenuse pikendus ei avalda seda. Teksti/foto/rubriigi/staatuse muutus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab lugemist.
- Avalikud rubriigifiltrid arvestavad nähtavat sisu ja esivanemaid enne lehekülge. Omaniku valija näitab kõiki rubriike; rubriigi eemaldamine säilitab sisu ja fotod. 80 teenust pole konto piir.
- Avaliku foto-URL-i ligipääsu ei muuda pelgalt kuulutuse aegumine privaatseks. Hosted fotode taustakoristus ja tehniliste paneelide eemaldamine on avamiseelne töö. Sellel updateril pole Storage’i toiminguid.
- Töökuulutuse kinnitatud algsuund on ettevõtte avalik profiil/otseviide, üks kuu kehtivust ja selge nähtavusteade; üldise tööotsingu sulgemine vajab serverikontrolli. Üks kuu pole fikseeritud 30 päeva. Töökuulutuste koodi selles sammus pole.
- Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir jäävad eraldi. Energy, maksete tuum ja piiratud AI abi säilivad V2 ulatuses. Kontosid, kuulutusi, pilte, sõnumeid ega ajalugu ei kustutata.

## Keskkond

- Olemasolev https://github.com/Taivo17/selqiro.git, https://selqiro.vercel.app ja /Users/taivo/selqiro. Viimane tegelik vastuvõetud commit 3aaebc6; uus kirjutus kontrollib seda värskelt. Hoidlat ega uut portaali ei looda.
- Supabase’i projekt ja CLI 2.117.0 pin säilivad. See väljaanne ei käivita andmebaasi- ega CLI-toiminguid, ei ühenda teenuseid uuesti ning ei paigalda ega uuenda npm-sõltuvusi Macis.
- Uus eraldi provider-state-feedback-20261115 päevik; eelmist edukat block-removal-auth-repair-20261114 päevikut hoitakse ainult lugemiseks lukus. Lõpetatud sihttesti/build’i/commit’i/push’i jätk ei korda; ebaselge protsessi tulemus peatab.
- Iga jooks annab uue privaatse Downloads-raporti täpse SAADA SEE FAIL teega ja kuni viiesekundilise /usr/bin/open -R Finderi kutsega. Originaalid ja varasemad koopiad säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
