<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-09 Europe/Tallinn

## Praegune checkpoint

Teenuste fotovaliku ja profiililoendite r2 on eraldi jätkupakina ette valmistatud. 09.11 kell 19:33:50–19:33:54 Europe/Tallinn tehtud ainult lugemise kontroll kinnitab sama b05ed30 lähtealust. Peatuse põhjustasid kohaliku katsekeskkonna kaks taastamisviga: rubriigi abifunktsioonide PUBLIC EXECUTE ja nimepiirangu algse BETWEEN-kuju taastamine. Parandatud kontrollalus taastoodab tegeliku eelkontrolli kõik väljad täpselt; tootmise õigusi ega rubriigitabeleid selleks ei muudeta. Uuendaja vea korral näidatakse kontrollitud saadetavat raportit ja valitakse see Finderis; puuduva või kontrollimatu faili kohta antakse täpne juhis. Uue r2 Maci paigaldus, commit/push, Verceli Ready ja kitsas kasutuskatse on veel ees.

## Lähtekood ja tõendi piir

- **Kinnitatud alus:** Teenuste eelmise eduka r2 raport SHA256 517fb67df34bf21c6cdaa6856b2ad00487821c5f774fec33665a03ecd6f69202: commit b05ed3047a25bc1504403ec70e98ae0ff7757bec, parent 78209e8ed0c7330b117d7db070b733eda5aa1723, 1326 faili, puu 4dd48a37bb2df4de686a6b930b951e9af115f63c. Uus lugemisraport kinnitab sama indexit ja muutumatut allikat enne/pärast päringut. Enne järgmist kirjutust kontrollib uuendaja tegelikku Maci/Giti/remote’i seisu uuesti.
- **Fotovaliku parandus:** Brauseri faili valimise järel tehtav pehme omaniku korduskontroll ei keela enam kohalikku failivalikut. Päris seansi/identiteedi muutus keelab endiselt muutmise; Avalda/Salvesta ootab värsket kontrolli. FileList kopeeritakse enne input’i tühjendamist ning sama faili saab uuesti valida. Serveri, SQL-i, faili tüübi, mahu ja kuni kümne foto kontrollid säilivad.
- **Teenuste loendid:** Minu ala ja avaliku profiili teenused järjestuvad created_at DESC, id ASC järgi juba SQL-is enne lehekülje valimist. Sisu muutmine või taasaktiveerimine ei tee vanast teenusest uut. Kirjeldus on kaartidel kuni kaks rida, detailis ja salvestatud kirjes jääb täistekst alles.
- **Üks profiili kuulutuste loend:** Uus get_public_profile_marketplace_v1 ühendab kanoonilised listings ja horse_offers enne loendamist ning lehekülgede valikut. Eelvaates neli, avatud loendis 24 tulemust lehel. Tüüp, numbriline ID või UUID, õige detailiaadress, filter ning tagasi tulles lehekülg ja kerimiskoht säilivad. Olemasolevad aegumise-, nähtavuse- ja blokeeringureeglid säilivad.
- **Poerubriikide audit:** Rubriikide haldus ja tavakuulutuste listing_store_categories avalik filter on olemas. Seostamise kaart on vanas ExistingListingEditPage’is, kuid praeguses hallatud fotodega IntegratedListingEditPage’is puudub. Hobuste ja teenuste jaoks seostamismudel puudub. Uus ühine profiil säilitab olemasoleva tavakuulutuste filtri; see tarne ei märgi kogu poerubriikide tööd valmis.
- **Tarne:** Eraldi selqiro-teenuste-parandus-20261109-r2.zip. Algse paranduse rakenduskood ja kolme lugemisfunktsiooni changes.sql jäävad bait-baidilt samaks; uued on õigelt kontrollaluselt tuletatud eel-/järelkontrollid, raportiabistaja ja jätkudokumendid. Täpse varasema eduraporti ning täieliku lähtepuu sidumine, olemasolev CLI, varukoopiad, üks kontrollitud SQL-tehing ja piiratud commit/push säilivad.
- **Uus peatuse tõend:** Esimese paranduspaki STOP-raport SHA256 fde3c3e874bbeabb018c4de66b8746c2b1a35d5d9a68d1f9e21f02c01df0c99a kinnitab database not_started, build not_run, commit null, push not_run. Väljalase 0cf78dad191f17bdc73876649470ce1d269e2631356f7090f45daa64d9a366ab ja selle päevik säilivad muutmata.
- **Põhjuse piir:** Fixture eemaldas ekslikult PUBLIC EXECUTE kahelt rubriigi triggeriabifunktsioonilt. Lisaks muutis dump’i kordusparsimine algse BETWEEN-tingimuse pesastatud AND-i lamedaks. Mõlemad taastati muutmata algallikate järgi ainult katsekeskkonnas. Nüüd kattuvad mõlema tabeli metadata ning sõltuvusräsi d42b8615d634c3c823c2399a8dcc32e88151624635cb90eec20d10262c8f63a6. Varasema tegeliku r2 säilitatavate invariantide sisenditega kattub kogu STOP-eelkontroll; ühtegi tundmatut räsi ega üldist normaliseerimist ei lisatud.
- **Raporti kasutusreegel:** 09.11 kasutaja soov on püsivalt docs/03_AI_RULES.md-s. Uue uuendaja vea korral tehakse privaatne unikaalne JSON-koopia Downloads-kausta, prinditakse SAADA SEE FAIL täpne tee ja valitakse sama fail Finderis. Koopia vea korral kasutatakse kontrollitud originaali; Finderi vea või puuduva/vananenud raporti kohta antakse täpne juhis. Vanu pakke ega päevikuid ei kirjutata üle.
- **Tegelik diagnostika:** 09.11 lugemisraport SHA256 8e09ba1c714950e8fc28ce8b1f1d1dc8c65dd0f433d22d96f1131bb7b859b980: complete/read_only_complete, PostgreSQL 17.6, sama eelkontroll kui peatunud jooksus, täpselt kaks rubriigitabeli tehnilist kirjeldust. Ühtegi portaali/DB/Storage muudatust ei tehtud. Raportikoopia Downloads-kaustas on vastu võetud; terminal käivitas sama faili valimise Finderis ilma veateateta.

## Tegelik kohalik katse

- Algse rakendusparanduse Next.js/TypeScript tootmiskooste PASS, 29,838 s, Node 24.22.1, sünteetilised võtmed. Kõik 557 kontrollitud rakendusesisendit kattuvad r2 allikaga. Seetõttu ei korratud sama rakenduse build’i ega varasemaid brauserikatseid selle kontrollaluse paranduse jaoks; Maci uuendaja koostab tegeliku muudetud portaali enne commit’i.
- Päris Reacti sihitud testid: fotovalik 7/7 ja ühine profiil 13/13 PASS. Fotovaliku vana allikas andis samas regressioonis 2/7 PASS. Auth, API ja brauseri sündmuste piirid on sünteetilised; need tulemused ei ole live-konto või Storage’i vastuvõtt.
- Algse muutumatu runtime-SQL-i tõend: PostgreSQL/WASM-is 19 teenuste järjestuse ja 25 ühise profiili kasutusjuhtu ning 16 algset paigalduse/drift/rollback kontrolli PASS. R2 ei korda neid laiu kasutusjuhtusid; uue kontrollaluse ja guardide tõend on eraldi. Kõik 507 varasemat supabase-faili säilivad. Native paralleelseansse ega päris PostgREST-i ei väideta kontrollituks.
- Päris Chromium 153.0.8010.0: 14/14 brauserijuhtu PASS. English/Eesti, loomine/muutmine ja 390/1365 px; pehme omaniku kontroll säilitab foto, päris identiteedimuutus tõrjub hilise valiku. Kolme teenuseloendi 12 CSS-mõõtmist näitavad kahe rea 48 px kõrgust. Auth/API on sünteetilised, välisvõrgupäringuid null.
- Algse uuendaja 15/15 isoleeritud katset on ajalooline tõend. R2 jaoks kontrollitakse eraldi muudetud veatee/raportiabistaja integratsiooni ning täpselt lõppmanifesti üks SQL- ja build-piiriga kirjutuse/commit/push’i ning korduse käik. Ajutine Git on päris; DB ja build on selles tarnekatses asendatud. Lõppmanifesti tõend jääb välise tarnepaki kontrollid-kausta.
- Varasem public-profile-offerings sari sisaldab nelja sama veateksti-ootuse tõrget nii vanas aluses kui kandidaadis (21/25). See testivõlg säilib; vana sarja ega lõpetatud paigaldajaid selle töö käigus uuesti ei käivitatud.
- Uued r2 kontrollid: kogu tegeliku algoleku taastamine PASS; 20 sihitud SQL õiguste/CHECK drift’i, rollback’i, apply/replay kontrolli PASS; uuendaja veatee/raportiintegratsioon 10/10 PASS. Muutumatu raportiabistaja 11/11 ja lõpetatud lugemisdiagnostika 10/10 varasemad tõendid säilivad. Lõpliku manifesti üks isoleeritud paigalduskäik ning paketi räsisidumine on välises kontrollid-kaustas; päris Maci r2 käiku see ei asenda.

## Production / kasutajaliides

- R2 tegelik jooks lõppes 08.11.2026 22:12:32 Europe/Tallinn. Raportis stage complete, database verified, build passed, push verified ja storage_operations not_performed. Verceli täpne sama commit’i Ready jäi raportis READY_NOT_CHECKED. Viie käsukviitungi väljumiskood on null; toor-build-logi ja SQL stderr ei ole raportiga kaasa antud.
- Kasutaja kinnitas teenuste loomise/teksti muutmise avalikku tulemust, peatamise, peatatud teenuse muutmise ja taastamise. Fotovaliku tõrge on eraldi uus parandus. Varem vastu võetud hobuse kohe muudetav vorm, korduvad salvestused, galerii ja 3-sekundilised nooled säilivad.
- 09.11 uus lähtekandidaat on ette valmistatud assistendi eraldatud keskkonnas. Uut Maci kirjutust, Supabase’i/Storage’i toimingut, commit/push’i ega Verceli deployment’i pole selle ettevalmistusega tehtud.
- 09.11 kell 18:19 alanud esimene paranduspaki jooks peatus enne SQL-i rakendamist/lähtefailide kirjutamist/build’i/commit’i/push’i. Kell 19:33 lõpetatud ainult lugemise diagnostika kinnitab sama puhta aluse. Parandatud r2 on assistendi eraldatud keskkonnas valmis; Maci eduraportit, uut commit/push’i, sama commit’i Ready’t ega muudetud foto/profiili kasutustee vastuvõttu veel pole.

## Üks järgmine töö

Paki selqiro-teenuste-parandus-20261109-r2.zip Downloads-kaustas lahti ning käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk. Pärast edu oota Vercelis sama uue commit’i Ready / Production tulemust ning tee seal kirjeldatud kitsas foto ja profiili kontroll. PEATATUD korral lisa Finderis valitud täpne JSON vestlusse. Lõpetatud diagnostikat ja vanu paigaldajaid ei korrata.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindlat SQL-i, commit’i ega push’i ei korrata automaatselt. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks praegune r2 paigalduskäsk ja kitsas kasutuskatse.
- docs/continuity/SERVICE_PROFILE_STRUCTURE_DIAGNOSTIC_20261109.md — vastu võetud lugemisraport, täpne põhjus ja r2 tõendi piir.
- docs/continuity/SERVICE_PROFILE_POLISH_20261109.md — rakendusmuudatuse ulatus, tõendid ja poerubriikide audit.
- docs/architecture/service-publication-v1.md ning docs/architecture/profile-marketplace-feed-v1.md — säilivad andmelepingud.
- supabase/repairs/20261109_service_profile_polish/tests/review/baseline-reconstruction-verified.json ning root-cause-resolved.md — täpse taastamise tõend; runtime-proof-reuse.json — muutumatu kasutusloogika varasem tõend.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Hobuse ja tavakuulutuse staatuse muutmine ei uuenda tähtaega; 90 päeva pikendamine on eraldi omaniku kinnitus. Teenuste käesolev lahendus ei kehtesta uut tähtajareeglit.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse; kolm avatud ja 20 uut toimingut/24 h on eraldi olemasolevad kasutuselevõtukaitsed. Omaniku teenused on lehekülgedega, mitte ühe väikese vaikse kärpega.
- Üldine terminalne taustakoristus jääb eraldi tööks. Paigaldaja ei kustuta Storage’i objekte; teenuse toimingud koristavad ainult enda kontrollitud algfaile või galeriist eemaldatud hallatud veebifaile.
- Teenuste Quick Update, live-asukoht/saadavus, töötajad ja autopark on eraldi edasine töö; töökuulutused hiljem. Nende olemasolu ei väideta selle tarnega.
- Profiili ühine loend ei liida teenuseid toodete hulka. Poerubriigi valimisel kuvatakse olemasoleva skeemi järgi ainult seostatud tavakuulutusi; hobustele ega teenustele seoseid ei oletata.
- Energy, maksete tuum ja piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse pärast käsilolevat kuulutuste/teenuste etappi. Tavaline osalemine ei sõltu Energy ostmisest.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Uus lugemisparandus rakendub ainult teadaolevale täpsele eelolekule või tuvastab täpse juba rakendatud oleku.
- Node/Sharp piirkond fra1, package.json ja package-lock.json säilivad. Macis kasutatakse olemasolevaid lukustatud sõltuvusi; uut installi ega teenuste ühendamist ei alustata. Kohalik build ei tõenda Maci build/push’i, Verceli Ready’t ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
