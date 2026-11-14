<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 13.11.2026 Europe/Tallinn — 40ceac78 paigaldus ja Ready kinnitatud; profiilile koondamise UI-parandus ette valmistatud

## Praegune checkpoint

24 tunni peitmise ja eraldi blokeerimise andmebaasitugi, Maci build ning commit/push 40ceac78deb255d8006244ae232652956b92bea0 on kinnitatud. 16:07:49 Verceli kuvatõmmis näitab sama 40ceac7 Ready / Production seisu. Kasutaja pole peitmise/blokeerimise toiminguid veel katsetanud. Uus kinnitatud paigutus: ühine peitmise/blokeerimise menüü ainult avalikul profiilil; kaartidelt eemaldada. Vestluse senine blokk ja Minu ala tagasivõtmine/haldus säilivad. Uus selqiro-peitmine-profiilile-20261113 on ainult lähtekoodi ja dokumentide parandus, Macis veel rakendamata. SQL-i ega Supabase CLI-d see samm ei käivita.

## Lähtekood ja tõendi piir

- **Värske vastu võetud alus:** /Users/taivo/selqiro, main, 40ceac78deb255d8006244ae232652956b92bea0; üks parent 955c935fa4e901a8b81885e2dcd18d966d651810. Paigaldatud lähtepuu 44f8042ccefbd78bd80a212398504cc5b4ef6c8a, 1696 faili. Täpse väljaande edukas runner kontrollis lõpus kogu lähteosa/indexit, puhast tööpuud ja remote-main’i võrdsust; siit uut live-Maci/GitHubi lugemist ei tehtud.
- **Eduka paigalduse raport:** selqiro-pakkuja-peitmine-parandus-20261113-raport-20261113-160527-1a8b4c249a2e.json; 262247 B; SHA256 dfefda11c1ff922c397647eaf24afb95968729a465c182d02a415f67753e433e. Väljaande manifest 1f85c82b5440ad8b4636ef53a08478370d69110bb0e45a4db605d60775b18ba2. Stage complete, database verified, build passed, push verified; lõpp 16:05:25 Tallinn ning vana ajaloo säilimiskontroll 16:05:27.
- **Andmebaasi tõend:** Viis logitud transpordikäsku: kaks repository_read’i ning kolm SQL-kutset. Preflight 7,453 s: absent; üks apply 7,207 s: acknowledged applied; eraldi verify 7,272 s: täpselt sama applied. Kõik 16 kaitset tõesed, varasemad pilve invariandid/sõltuvused/hosted-kontekst säilinud. Need on CLI kestused, mitte SQL-i jõudlusmõõtmine. Kolme varasema päeviku lõppkontroll kinnitas säilimise; Storage not_performed.
- **Uue muudatuse ulatus:** Avaliku profiili olemasolev serveri profile-siht lubab peitmist; kasutajaliides ühendab samasse kohta peitmise ja blokeerimise. Tava-, hobuse- ja teenusekaartidel neid menüüsid enam ei ole. Olemasolev vestluse blokk, Minu ala haldus ja Undo säilivad. Uut vaatamiskoguse lävendit, jälgimist ega andmeallikat ei lisata. SQL, serveri õiguskontroll, otsingufiltrid ja 24h tähtaeg ei muutu.
- **Ettevalmistus ja rakendus on eraldi:** Uus profiili-paigutuse kandidaat ja tarnepakett on ette valmistatud täpse 40ceac78 aluse peale. Uut Maci kirjutust, commit/push’i, Verceli versiooni ega kasutustoimingu vastuvõttu pole veel. Uus runner peab enne oma kirjutusi värskelt kontrollima 1696 faili, tervet indexit/tööpuud, haru/HEAD-i ja kinnitatud remote’i.
- **Päevikud ja ajalugu:** Uus runner hoiab viimase eduka 40ceac78 paigalduse täpset privaatset päevikut ainult lugemiseks lukustatuna läbi source/build/commit/push’i. Väljastatud pakke, raporteid ja vanu intente ei muudeta. Eelmise lähteversiooni kolm jooksvat dokumenti säilivad bait-baidilt history/provider-controls-accepted-20261113/ all; need kirjeldavad ajaloolist ettevalmistust ja nende vana käsk ei ole praegune tööjärg.

## Tegelik kohalik katse

- Uue profiili-paigutuse kohalik production build PASS: npm run build -- --webpack, 25,276 s, 675 rakenduse/config sisendit, input_drift=0. Kasutati olemasolevaid lukustatud sõltuvusi ning sünteetilisi teenuseväärtusi; see ei ole Maci build, deployment ega brauserivastuvõtt. Tõend: paki kontrollid/build-result.json.
- Uue profiilimenüü, kaartidelt eemaldamise, konto/sihtmärgi eluea ja säiliva Undo/halduse sihitud DOM-kontrollide ning tarnevoo täpsed tulemused/sisendräsid: vt paki kontrollid/. Sünteetiline Auth/HTTP/Next ja kohalik Git eristatakse päris Maci/pilve tulemusest.
- Paigaldatud SQL-i ega lõpetatud SQL/runtime-teste ei korrata. Uus source-only runner teeb andmebaasi- ja Supabase CLI-kutseid 0. Tema andmebaasi lähtetõend on täpne varem edukas privaatraport; uut fresh SQL kontrolli selle muudatusega ei väideta.
- Vana kasutajaliidese pildid tõendavad kaartide/profiili ja menüü nähtavust. Kasutaja ütles, et toimingud on veel katsetamata. Uue profiilipaigutuse päris kasutuskäik ootab uue commit’i Ready / Production tulemust.

## Production / kasutajaliides

- 40ceac78 paigaldus on kinnitatud: complete, database verified, build passed ja push verified. Raporti enda vercel=READY_NOT_CHECKED piir on täiendatud eraldi 16:07:49 pildiga: Ready / Production, main, 40ceac7, sama commit’i pealkiri. Deployment-ID pole pildil.
- 18:14:47 pilt näitab kuulutuskaarte menüünuppudega; 18:15:01 avatud kaardimenüüs on Peida pakkuja 24 tunniks ja Blokeeri kasutaja. 18:16:16 avalikul profiilil on vana blokeerimismenüü. Need ei kinnita peitmise, tagasivõtmise, blokeerimise, sõnumikeelu ega aegumise edukat toimimist.
- Kasutaja uus otsus muudab juhtnuppude asukohta. Andmebaasi valmis tuge ei paigaldata uuesti. Uus profiilile koondamise UI on lähtekoodis ette valmistatud; selle commit/push, Vercel ja tegelik kasutustee on kinnitamata.
- Varasem 57014 katkestus ja JIT juba off vaatlus jäävad ajalooliseks tõendiks. Edukas hilisem paigaldus ei määra tagantjärele katkestaja päritolu ega tõenda JIT-i mõju. Vanu peatunud katseid ja lõpetatud probe’i ei korrata.

## Üks järgmine töö

Paki selqiro-peitmine-profiilile-20261113.zip Downloads-i lahti ja käivita: python3 -I -B "$HOME/Downloads/selqiro-peitmine-profiilile-20261113/uuenda.py" --publish. See rakendab ainult üle vaadatud lähte-/dokumendimuudatuse, teeb buildi ja täpse commit/push’i; SQL-i/Supabase CLI-d ei käivita. Saada selle jooksu SAADA SEE FAIL real näidatud täpne raport. Seejärel sama uue commit’i Vercel Ready / Production ja kahe olemasoleva konto profiililt algav kasutuskäik.

**Peatumisel:** Peatumisel saada selle jooksu täpne raport; kui raportit ei loodud, PEATATUD-rida. Muutunud alus, index, tööpuu või päevik tuleb enne jätku üle vaadata. Vanu SQL-paigaldajaid, taastajaid ega lõpetatud probe’i ei käivitata. Kontosid, kuulutusi, pilte, sõnumeid, päevikuid, intente ja raportikoopiaid ei kustutata. Võimalikult aegunuks märgitud püsiraport ei kinnita viimase etapi edu.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — ainult uue source-only väljaande käsk ja täpne raport.
- docs/continuity/VIEWER_PROVIDER_CONTROLS_20261113.md — viimane sissekanne: 40ceac78 vastuvõtt ja uus profiilipaigutuse otsus.
- docs/architecture/provider-controls-v1.md — uus UI placement lõik; serveri leping säilib.
- docs/02_AI_MEMORY.md — 13.11 profiilile koondamise püsiv otsus; varasemad dateeritud asukohad on ajalugu.
- docs/continuity/SERVICE_ACCESS.json, docs/03_AI_RULES.md ning docs/00_PROJECT_DNA.md; ainult muudetud mooduli arhitektuur.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu ega rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- Aegumine jätab teenuse ja seosed omanikule alles. Peatatud teenuse pikendamine ei avalda seda. Teksti-, foto-, rubriigi- või staatusemuudatus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab eraldi lugemist, mitte automaatset kirjutuse kordust.
- Teenuse ja kuulutuste avalik rubriigifilter arvestab eraldi jaotise kogu nähtavat sisu ja esivanemaid enne lehekülge. Omaniku haldus/valija näitab kõiki rubriike. Rubriigi eemaldamine säilitab sisu ja fotod; 80 teenust ei ole konto piir.
- Tähtaeg kontrollib pakkumise ja hallatud pildi nähtavust. Varem avaliku Storage-URL-iga fotot ei muuda see privaatseks. Uuendaja ei tee Storage’i toiminguid. Üldine fotode taustakoristus ja tehniliste paneelide eemaldamine jäävad avamiseelseks tööks.
- Ajutine peitmine on konto ühe pakkuja identiteedi 24h avastuseelistus; püsiv blokk on eraldi olemasolevas user_blocks-is. Uus ühine menüü asub ainult avalikul profiilil, kaartidel seda ei ole. Vestluse senine blokeerimine ning Minu ala Undo/haldus säilivad. Vaatamiskoguse väravat ega uut jälgimist ei lisata. Ühe eelistuse eemaldamine ei tühista teist ega teise konto blokki. Uus samm ei muuda SQL-i, õigusi ega serveri otsinguloogikat.
- Töökuulutuse kinnitatud algsuund on ettevõtte avalik profiil/otseviide, üks kuu kehtivust ja nähtavuse selge teade. Üldise tööotsingu sulgemine vajab ka serverikontrolli; üks kuu pole vaikimisi fikseeritud 30 päeva. Töökuulutuste koodi siin pole.
- Uued owner RPC-d kontrollivad oma õigusi. Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir vajavad eraldi lahendust. Energy, maksete tuum ja piiratud AI abi jäävad V2 ulatusse.

## Keskkond

- Sama hoidla https://github.com/Taivo17/selqiro.git, portaal https://selqiro.vercel.app ja Maci siht /Users/taivo/selqiro. Täpne uus alus 40ceac78deb255d8006244ae232652956b92bea0, 1696 faili. Uus runner kontrollib main/HEAD-i ja remote’i uuesti enne kirjutusi.
- Supabase vyjletlmwoiwxsnsunlm ja senine hosted-kontekst säilivad. 40ceac78 raport kinnitas applied toe; uues source-only sammus andmebaasi- ega Supabase CLI-toiminguid ei tehta. Uut kontot, ühendust ega paigaldust ei looda.
- Vastuvõetud privaatpäevik asub provider-controls-optimized-20261113/1f85c82b5440ad8b4636ef53a08478370d69110bb0e45a4db605d60775b18ba2/result.json all. See säilib uue runneri hoitud lugemisluku all; uue jooksu raport on eraldi. Kõik varasemad väljastatud pakid ja kasutaja päevikud säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
