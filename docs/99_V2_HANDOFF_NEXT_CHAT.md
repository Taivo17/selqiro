<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-10 Europe/Tallinn

## Praegune checkpoint

Poe rubriikide ühendus on uues lähtepaketis ette valmistatud: tavakuulutuse praeguses muutmisvaates saab valida, muuta ja tühjendada olemasolevate oma rubriikide seoseid. Värske Next build ning sihitud SQL/API/Reacti/brauseri kontrollid läbisid edukalt. Uuendaja lõppmanifesti ja ajutise Giti tarne tõendid on pakis kontrollid kaustas. Tegelik Maci rakendus, uus commit/push, Verceli Ready ja kasutuskatse on veel kinnitamata. Varasem 429ace2 teenuste tagasitee vastuvõtt säilib.

## Lähtekood ja tõendi piir

- **Kinnitatud lähtealus:** Väljastatud teenuste tagasitee pakett: ZIP SHA256 ca4eb597a990f26ccad7196ecfe752d10166e9876961202e049fb75b0e00f6c2, manifest 4d64c841de1d948c4489db3777c36dd848539ee10d38cecf81895c6dcc0b7e2b; täielik 1383-failine lähtepuu c17292c5a90b9f4f67da748ae5bbea828ab77659. Kõik selle lähtepuu failid kontrolliti enne eraldi kandidaadi loomist. Varasemate väljastatud pakkide baite ei muudeta.
- **Rubriikide ühendus:** IntegratedListingEditPage koostab uue ManagedListingStoreCategoryCard kaardi omandi poolest kontrollitud avaldatud tavakuulutusele. Neli väikest moodulit eraldavad lepingud, andmepäringud, oleku ja UI. Olemasolev rubriigivalija ning English/Eesti tõlkekataloog jäävad kasutusse. Valida saab null, ühe või mitu olemasolevat oma rubriiki; rubriikide salvestus on teksti, hinna ja fotode salvestusest sõltumatu.
- **Õiguskontroll:** Iga tegevus seotakse kasutaja, aktiivse identiteedi, kuulutuse ja alguses kinnitatud tokeniga. Olemasolev set_my_listing_store_categories_v2 kontrollib serveris auth.uid(), aktiivse identiteedi ligipääsu, kuulutuse identity_id-d ning iga rubriigi kuulumist samale identiteedile. Sama kuulutuse seoste asendamine on atomaarne. Käesolev tarne ei lisa SQL-i ega anna uusi õigusi.
- **Vea ja konteksti piir:** Sünkroonne lukk peatab topeltsalvestuse. Konto/identiteedi/kuulutuse vahetuse järel ei rakendu vana vastus. Salvestuse kinnituseks nõutakse täpset kuulutust, rubriikide hulka ja loendurit. Kinnitamata vastuse korral jääb valik alles ning järgmine salvestus ootab kasutaja käivitatud uut lugemist. Lugemine ei taasesita kirjutust ega asenda erinevat kasutajavalikut automaatselt.
- **Avalik nähtavus:** Olemasolev avaliku profiili filter loeb valitud rubriigi rekursiivse alampuu. Alamrubriigi valimine ei lisa eraldi ülemrubriigi seost. Tühja valiku salvestamine eemaldab seosed; kuulutus jääb Kõik-vaatesse. Hobustele ja teenustele seostamismudelit selles sammus ei lisata.
- **Rubriikide halduse piir:** Praegune integreeritud Minu ala peidab vana loomise/ümbernimetamise/kustutamise halduse. See tarne ühendab olemasolevate rubriikide valiku. Tühjal seisul puudub eksitav link peidetud haldusankrule. Halduse avamine vajab eraldi konto ja identiteediga seotud lepingut. Vana otsetabeli RLS-i laiemat kirjutusõigust see uus RPC-kasutus ei paranda; piir on arhitektuuris ja Known Issues failis kirjas.
- **Varasema paranduse vastuvõtt:** 09.11 kasutaja kinnitas teenuse detailist brauseri Tagasi sama kohta nii profiilil kui avalikus teenuseloendis. Kuvatõmmis Screenshot 2026-11-09 at 21.31.20.png, SHA256 cdb5e790985926cbe4fe6b89d56914e2e0c2af0515dc5335ddd9a78de6b4d0f8 näitab main / 429ace2 / Restore service list on browser back / Ready / Production ning 26e468e Ready / Production. Vastuvõtu dokumentide delta on siinse kandidaadi sisse kaasatud.
- **Tarne:** Uus eraldi source-only pakk selqiro-poerubriigid-20261110. Uuendaja lahendab täiscommit’i eelmise navigation-jooksu täpsest lõpetatud privaatsest raportist ja kontrollib sõltumatult Giti puud, parent’e, diffi, tegelikku HEAD-i, haru, kogu indexit/tööpuud, lähtefaile ja kinnitatud remote’i. Kinnitatud prefiksid 429ace2 ja 26e468e ei asenda täiscommit’i kontrolli. SQL-i, Supabase CLI-d, Storage’i ega sõltuvuste paigaldust ei käivitata.
- **Raporti kasutusreegel:** Uue jooksu peatus kirjutab võimalusel privaatse unikaalse raportikoopia Downloads-kausta, prindib SAADA SEE FAIL täpse tee ning valib sama faili Finderis. Puuduvast koopiast, Finderi veast või võimalikust vananenud raportist antakse täpne teade. Varasemate päevikute seast ei valita juhuslikku uusimat faili.

## Tegelik kohalik katse

- Sihitud olemasoleva SQL-i 19/19 kontrolli PASS: oma rubriikide määramine/muutmine/tühjendus, võõra rubriigi ja kuulutuse keeld, identityless legacy keeld, aktiivse ettevõtteliikme õigus, atomaarne tagasilükkamine ja avalik alampuufilter. PGlite/WASM-i päris säilinud deklaratsioonid, sünteetiline Auth/andmestik; pilve ei kasutatud. See ei ole native samaaegsuse ega live PostgREST-i tõend.
- Parseri, captured-token API ja päris ReactDOM/jsdom hooki 13/13 sihitud kontrolli PASS. Kontrolliti ka üle 1000 rubriigi täielikku lehitsemist, täpset vastusehulka, sama klõpsutsükli lukku, konto/identiteedi/kuulutuse vanu vastuseid ning kinnitamata kirjutuse käsitsi uut lugemist. Testi sisendiräsid säilisid; Auth/PostgREST vastused on sünteetilised.
- Täpselt lõppallikaga värske Next 16.2.1 webpack tootmiskooste PASS, 44,635 s, Node 24.22.1 ja sünteetiline konfiguratsioon. Kõik 600 build-sisendit jäid muutmata. Olemasolevad lukustatud sõltuvused taaskasutati. Sihitud TypeScripti kontrollis oli 0 diagnostikat ja ESLintis 0 viga; üks varasem kasutamata muutuja hoiatus säilib. Kaardi Reacti võtme väike parandus on runtime-review tõendis ja lõpp-buildis kaetud.
- Päris Chromium 153.0.8010.0, värske tootmis-CSS: 4/4 kasutusjuhtu PASS. English desktop ja Eesti mobile katses määramine/muutmine/tühjendamine ning avalik filter; kinnitamata salvestuse käsitsi lugemine; lugemisvea retry ja aus tühi seis. Kuulutuse teksti/hinna mustand ja sama input-DOM säilisid. 53 testitud runtime-sisendit kattusid buildiga; räsinihkeid, console.error/warning, pageerror ja välisvõrgupäringuid 0.
- Brauseris kasutati päris IntegratedListingEditPage’i, teksti/hinna sessiooni ning rubriigi/profiili komponente ja hooke. Auth/PostgREST, owner-status, teksti API, fotomodulid, keeleprovider ja Next Link piir olid sünteetilised. Esimene rakise ettevalmistus peatus virtuaalse esbuild-sisendi failina lugemisel enne Chromiumi avamist; rakise paranduse järel esimene tegelik brauserijooks läbis 4/4. See ei ole päris konto, täis-Next serveri ega Verceli katse.
- Uuendaja dünaamilise aluse ja raporti esmane kontroll 10/10 PASS. Täpselt väljastatud manifesti helperi ja päris ajutise Git-tarne tulemused ning täielikud logid on paki kontrollid kaustas. Ajutise tarnekatse build ja eelmise raporti lahendaja piir on sünteetilised; tegeliku Next buildi ja dünaamilise parseri tõendid on eraldi. Vanu päevikuid ja väljastatud ZIP-e ei muudeta.
- Varasemaid teenuste tagasitee, fotode või SQL-i paigaldusi ja laiu vastuvõetud katseid ei korratud. Uued kontrollid käsitlevad selle rubriigiseostamise sammu muutunud osa.

## Production / kasutajaliides

- Vastu võetud varasem veebikäik: teenuse detailist brauseri Tagasi taastab sama koha profiilil ja avalikus teenuseloendis. 429ace2 Ready / Production on kasutaja kuvatõmmisel; 26e468e Ready / Production on samal pildil.
- Poerubriikide uus lähtekood ei ole sellest valmistuskeskkonnast Maci või GitHubi rakendatud. Uue sammu tegelik Maci build/commit/push, uue commit’i Verceli Ready / Production ja rubriigi veebikasutus on kinnitamata.
- Varasemaid täispikki navigation/r2 commit’e ega uut deployment-ID-d ei ole antud; neid ei oletata. Uuendaja loeb ja kontrollib vajalikud olemasolevad täiscommit’id Macis enne kirjutusi. Käesolev samm ei tee andmebaasi skeemimuudatust.

## Üks järgmine töö

Paki selqiro-poerubriigid-20261110.zip Downloads-kausta lahti ja kasuta HOSTED_PORTAL.md üht käsku: python3 -I -B "$HOME/Downloads/selqiro-poerubriigid-20261110/uuenda.py" --publish. Seejärel oota just uue commit’i Verceli Ready / Production, ava ühe avalikult nähtava tavakuulutuse Muuda-vaade, salvesta oma olemasolev rubriik ning kontrolli avaliku profiili vastavat filtrit. Ühe muutmise/tühjendamise kontroll kinnitab seoste voogu; kuulutust ega rubriiki ei kustutata.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindlat SQL-i, commit’i ega push’i ei korrata automaatselt. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — käesoleva rubriikide paki üks käsk ja kasutuskatse.
- docs/continuity/STORE_CATEGORIES_20261110.md — täpne ulatus, kohalikud tõendid ja tarne piir.
- docs/architecture/listing-store-category-assignment-v1.md — õigused, seoste salvestus ja halduse piir.
- docs/continuity/SERVICE_ACCESS.json — olemasolevad sihid; kuupäevaga teenusekirje ei ole värske Maci vaatlus.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Hobuse ja tavakuulutuse staatuse muutmine ei uuenda tähtaega; 90 päeva pikendamine on eraldi omaniku kinnitus. Teenuste käesolev lahendus ei kehtesta uut tähtajareeglit.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse; kolm avatud ja 20 uut toimingut/24 h on eraldi olemasolevad kasutuselevõtukaitsed. Omaniku teenused on lehekülgedega, mitte ühe väikese vaikse kärpega.
- Üldine terminalne taustakoristus jääb eraldi tööks. Paigaldaja ei kustuta Storage’i objekte; teenuse toimingud koristavad ainult enda kontrollitud algfaile või galeriist eemaldatud hallatud veebifaile.
- Teenuste Quick Update, live-asukoht/saadavus, töötajad ja autopark on eraldi edasine töö; töökuulutused hiljem. Nende olemasolu ei väideta selle tarnega.
- Profiili ühine loend ei liida teenuseid toodete hulka. Poerubriigi valimisel kuvatakse olemasoleva skeemi järgi ainult seostatud tavakuulutusi; hobustele ega teenustele seoseid ei oletata.
- Energy, maksete tuum ja piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse pärast käsilolevat kuulutuste/teenuste etappi. Tavaline osalemine ei sõltu Energy ostmisest.
- Käesolev ühendus hõlmab olemasolevate poerubriikide valimist tavakuulutusele. Poerubriikide halduse avamine ning vana otsetabeli kirjutusõiguste tugevdamine vajavad eraldi sammu.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; kinnitatud Maci siht /Users/taivo/selqiro. Uut hoidlat, portaali, Supabase’i projekti ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Käesolev uuendaja ei ühendu andmebaasi; olemasolevat salvestusfunktsiooni kasutab portaal kasutaja enda valiku salvestamisel.
- Sõltuvuste package/lock ja Node/Sharp fra1 seadistus säilivad. Kohalik build kasutab olemasolevaid lukustatud sõltuvusi ja sünteetilist konfiguratsiooni. Tegelik Maci/Verceli tulemus selgub alles selle sammu rakendamisel.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
