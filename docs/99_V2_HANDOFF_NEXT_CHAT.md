<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-09 Europe/Tallinn

## Praegune checkpoint

09.11 kasutaja võttis vastu teenuse fotode salvestamise ning uusima teenuse esimese koha Minu alas ja avalikul profiilil. Teenuse detailist brauseri Tagasi kaotas profiili või avaliku teenuseloendi lähtekoha; mõlemad vead korrati vanas allikas. Uus teenuste tagasitee parandus on lähtekoodis ette valmistatud, värske Next tootmiskooste, 12 kontekstikontrolli ja 13 päris Chromiumi kasutusjuhtu läbisid. Üks järgmine tegevus on uue lähtekoodipaki rakendamine Macis. Selle paranduse Maci kirjutus, commit/push ja Verceli Ready on veel kinnitamata; eelmise r2 tegelik commit lahendatakse olemasolevast päevikust ja Gitist enne kirjutusi.

## Lähtekood ja tõendi piir

- **Kinnitatud alus:** Eraldi säilitatud r2 lähtepuu: 1367 faili, tree 224a1c5708688303c24dcd2a360ff3035a91e683, manifest d537235cb494f4b3862b2580952d3cc300bc20e7f8137a03aebcd58c78c45c7d. R2 väljastatud ZIP ja allikas jäävad muutmata. Sellel põhinev uus navigeerimiskandidaat on eraldi töökoopias. Täpne Maci commit lahendatakse r2 privaatse complete-raporti, parent b05ed3047a25bc1504403ec70e98ae0ff7757bec, teema, 59 muudetud raja ja kogu tree põhjal; commit’i ei oletata.
- **Kasutaja vastuvõtt:** 09.11 tekst ja viis kuvatõmmist kell 20:19–20:36 Europe/Tallinn kinnitavad teenuse fotode salvestamist ja uusima teenuse esimest kohta Minu alas/profiilil. Kasutaja kinnitas ka hobuse profiililt ning tavakuulutuse avalikust loetelust tagasitee toimimist. Neid lõpetatud kasutuskatseid ei korrata selle paranduse eeltingimusena.
- **Teenuse tagasitee:** Eraldi service-navigation moodul salvestab teenuse avamisel ajalookirje külge lähte-URL-i, kaardi nähtava asukoha, profiili laienduse/horisontaalse asendi ning avatud tulemuste lehe. Otsing ja filtrid säilivad URL-is. Tagasi–Edasi–Tagasi ja detaili nähtav tagasilink taastavad valideeritud lähtekoha. Teenuse andmed loetakse uuesti olemasoleva avaliku lugeja kaudu; ajalukku ei salvestata teenuse teksti, pilte ega omanikuandmeid.
- **Piiratud automaatne taastamine:** Kuni kaheksa 24-realise lehe automaatset lugemist; sügavama ajaloo puhul alustatakse avatud kaardi lehelt ja varasemad/hilisemad tulemused jäävad nuppudega ligipääsetavaks. See on automaatse töö piir, mitte teenuste arvu ega osalemise piirang. Hiline ülemise sisu kasv ei nihuta taastatud kaarti; kasutaja enda kerimine/puudutus/klahv lõpetab automaatse joondamise.
- **Kirjeldused:** Kaartidel säilib kahe rea kokkuvõte. Muutumatu avalik SQL projitseerib kogu kirjelduse ning detail ei kärbi teksti. Vana ja uue allika Chromiumi katses oli pikk English/Eesti kirjeldus viimase lõiguni loetav; kasutaja sõnastuse põhjal andmekadu ega uut detaili kärpimist ei väideta.
- **Kuulutuste kooselu:** Profiilil sulgeb kummagi loendi false-uuendus ainult enda laiendatud sektsiooni. Teenus eemaldab eelmise ühekordse kuulutuse tagasikonteksti; hilisem kuulutuse/hobuse avamine eemaldab sama lähte-ajalookirje teenusekonteksti. Suurt olemasolevat listingReturnContext moodulit, kuulutuse/hobuse aadresse ega nende andmelepinguid ei muudeta.
- **Tarne:** Eraldi selqiro-teenuste-tagasitee-20261109.zip. Ainult lähtekood, dokumendid ja sihitud testid; SQL-i, Supabase CLI-d, sõltuvuste installi ega Storage’i toimingut ei ole. Uuendaja kontrollib täpset r2 privaatset complete-raportit, sellest leitud tegelikku commit’i, parent’i, teemat ja kõiki 1367 puukirjet. Seejärel kontrollib tegelikku HEAD-i/haru/kogu indexit/lähtepuud/kinnitatud remote’i, varundab muudatused, teeb build’i ning piiratud commit/push’i. Väljastatud r2 pakki ei muudeta.
- **Raporti kasutusreegel:** 09.11 kasutaja soov on püsivalt docs/03_AI_RULES.md-s. Uue uuendaja vea korral tehakse privaatne unikaalne JSON-koopia Downloads-kausta, prinditakse SAADA SEE FAIL täpne tee ja valitakse sama fail Finderis. Koopia vea korral kasutatakse kontrollitud originaali; Finderi vea või puuduva/vananenud raporti kohta antakse täpne juhis. Vanu pakke ega päevikuid ei kirjutata üle.
- **Poerubriikide piir:** Rubriikide haldus ja tavakuulutuste listing_store_categories avalik filter on olemas. Seostamise kaart on vanas ExistingListingEditPage’is, kuid praeguses hallatud fotodega IntegratedListingEditPage’is puudub. Hobuste ja teenuste jaoks seostamismudel puudub. Uus ühine profiil säilitab olemasoleva tavakuulutuste filtri; see tarne ei märgi kogu poerubriikide tööd valmis.
- **Lõpetatud diagnostika:** 09.11 read-only raport, esimese paranduspaki peatus ja r2 kontrollaluse taastamine säilivad SERVICE_PROFILE_STRUCTURE_DIAGNOSTIC_20261109.md-s ning vanades päevikutes. Neid ei käsitleta uute paigaldamis- ega diagnostikakäskudena.

## Tegelik kohalik katse

- Värske Next 16.2.1 tootmiskooste PASS, 17,219 s, Node 24.22.1, sünteetiline konfiguratsioon. Kõik 596 build-sisendit jäid muutmata. Esimesel katsel läbisid kooste ja TypeScript, kuid vana AI route vajas puuduolevat sünteetilist serverivõtit; selle katselogi säilib. Runtime’i ei muudetud keskkonna parandamiseks. Olemasolevaid lukustatud sõltuvusi taaskasutati.
- Sihitud TypeScript kontroll PASS; ESLint exit 0, kaks varasemat img-hoiatust profiililehel. Uut navigeerimismoodulit ei pandud suure listingReturnContext faili sisse.
- Tegelikud konteksti/filtri helperid jsdom ajaloo piiril: 12/12 PASS. URL-i ja teenuse sobivus, aegumine, vigased väärtused, blokeeritud sessionStorage, modifier-klikk, UTF-8 filtrid ning teenuse/kuulutuse konteksti kooselu; sisendinihkeid null.
- Päris Chromium 153.0.8010.0: vana r2 allika kaks kasutaja raporteeritud tagasiteeviga korrati; need on enne-parandust tõendid. Uue allika 13/13 kasutusjuhtu PASS: English/Eesti, 390/1365 px, profiili laiendus, horisontaalne eelvaade, filtritega avalik teine leht, korduv Back/Forward/Back, nähtav tagasilink, hiline ülemise sisu kasv, sügav leht, kuulutuse/teenuse kooselu ja otse avamise fallback.
- Brauserikatses 53 päris runtime-faili kõik vastavad 596 build-sisendi inventarile, sisendinihkeid null. Uus build andis katse tegeliku CSS-i. Pika kirjelduse täistekst ja viimane lõik olid loetavad; kaartide piir oli kaks rida. Välisvõrgupäringuid ja pageerror-erandeid null; console.error voogu eraldi ei kogutud.
- Brauserikatses on päris Reacti komponendid/hookid, CSS ja native history; API/auth ning Next Link/router piir on sünteetilised. See ei tõenda päris kontot, Supabase’i, täielikku Next runtime-navigeerimist ega Verceli kasutuskatset.
- Uue lähtekoodiuuendaja varasema r2 raporti/Giti sidumise ning DB-ta veatee kontroll: 8/8 PASS. Täpse lõppmanifesti päris ajutise Giti rakendamise/backup/commit/kohaliku push’i ja idempotentse korduse tõend lisatakse tarne kontrollid-kausta; build ja prior-resolve piir on selles tarnekatses sünteetilised. Maci käiku see ei asenda.
- Varasema r2 SQL-i, fotovaliku, järjestuse ja ühise profiili laiad kontrollid on ajalooline tõend ega ole uuesti käivitatud. Varasem public-profile-offerings testivõlg (sama neli veateksti ootust nii aluses kui kandidaadis) säilib varasemas üleandmises.

## Production / kasutajaliides

- Teenuse fotod/järjestus ja hobuse/tavakuulutuse varasemad vastuvõtud säilivad kasutaja kinnituse piires.
- R2 täpset uut commit’i, täielikku eduraportit ja Ready / Production deployment’i identiteeti viimase UI kinnitusega ei antud. Uuendaja loeb olemasolevat r2 privaatset päevikut ja kontrollib Giti objekte; väärtusi ei oletata ekraanipiltidest.
- Teenuste tagasitee parandus on kontrollitud eraldatud lähtekoopia ja sihitud brauserifixtuuri piires. Uus Maci kirjutus/build/commit/push, Verceli Ready ning kaks päris kasutaja tagasiteed on veel kinnitamata.

## Üks järgmine töö

Paki selqiro-teenuste-tagasitee-20261109.zip Downloads-kaustas lahti ja käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk. Seejärel oota terminalis näidatud sama uue commit’i Verceli Ready / Production tulemust ja kontrolli teenuse brauseri Tagasi teed profiililt ning avalikust teenuseloendist. Varasemat r2 uuendajat, diagnostikat ega vastu võetud fotode/järjestuse katseid ei korrata.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindlat SQL-i, commit’i ega push’i ei korrata automaatselt. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks praegune jätkamiskäsk ja kaks sihitud kasutusteed.
- docs/continuity/SERVICE_RETURN_NAVIGATION_20261109.md ning docs/architecture/service-return-navigation-v1.md — käesolev parandus, katsepiirid ja arhitektuur.
- docs/architecture/service-publication-v1.md ja docs/architecture/profile-marketplace-feed-v1.md — olemasolevad teenuste/profiili andmelepingud.
- docs/continuity/SERVICE_PROFILE_STRUCTURE_DIAGNOSTIC_20261109.md — lõpetatud eelkontrolliparandus; ajalooline tõend.

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
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Käesolev lähtekoodipakk ei ühendu andmebaasi ega käivita SQL-i; varasemat SQL-i kinnitab üksnes r2 salvestatud raport.
- Node/Sharp piirkond fra1, package.json ja package-lock.json säilivad. Macis kasutatakse olemasolevaid lukustatud sõltuvusi; uut installi ega teenuste ühendamist ei alustata. Kohalik build ei tõenda Maci build/push’i, Verceli Ready’t ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
