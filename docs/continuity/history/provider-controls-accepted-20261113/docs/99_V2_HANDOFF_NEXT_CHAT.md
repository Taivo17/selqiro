<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 13.11.2026 Europe/Tallinn — 15:26:39 lugemiskontrolli järel ette valmistatud SQL-kontrollpäringu parandus

## Praegune checkpoint

Maci ainult lugemise kontroll lõppes edukalt: pakkuja peitmise/blokeerimise tugi on endiselt absent ja kõik 16 kaitset vastavad. Algse ning recovery-päeviku säilimine kontrolliti päriselt selle jooksu lõpus. Main on 955c935 ja tööpuu puhas; uut paigaldust, buildi, commit/push’i ega deployment’i ei toimunud. Ettevalmistatud selqiro-pakkuja-peitmine-parandus-20261113 vähendab sama kaitsekontrolli päringuplaani kordusi ning kasutab ranget ühe rea / true tulemust nõudvat väravat. See on eraldi uus väljaanne ja üks kontrollitud katse; Macis/pilves pole seda veel käivitatud.

## Lähtekood ja tõendi piir

- **Vastuvõetud alus:** /Users/taivo/selqiro, main, 955c935fa4e901a8b81885e2dcd18d966d651810. Teenuste kehtivuse build/push, sama commit’i Vercel Ready / Production ja pikendamise kasutustee on varem vastu võetud. Alus sisaldab 1607 faili; puu 9fa61dfb5c4f70aac08c63dc59e2de25cafe5d8f.
- **Kolm täpset varasemat raportit:** Algne 13:33 raport: 4df69e2947e853371aaed548c70571c254e28b226552d9eb2d49e80139ad4a5a (252737 B). Recovery 14:16:35: fe924a9733477e40a93c7a0d2f8a5a9eb93b237248eaab29ace51881a9d67d53 (256279 B). Probe 15:26:39: 3415a99e13217300291e09bce19cdcc583f92f4f373601b8decc8e0bc8857f0f (29868 B). Täpsed väljaanded, failinimed ja nonce on VIEWER_PROVIDER_CONTROLS_20261113.md-s ning uues prior_attempt.py-s.
- **Recovery tulemus:** Üks apply lõppes 80,614 s järel exit 1-ga; 180 s CLI piir ei täitunud. Eraldi verify õnnestus 18,934 s-ga: absent, 16/16 true, samad invariandid. Selle jooksu 122 preimage’i ja täielik 1607 kirje index vastasid 955c935 alusele; source/build/commit/push ei alanud.
- **Värske Maci tõendi piir:** Probe kinnitas main/955c935 ja puhta git status’e ning kinnitatud origin-konfiguratsiooni. See ei olnud uus täielik 1607 lähtefaili/indexi räsikontroll ega GitHubi remote-main võrdlus. Uus paigaldaja peab need värskelt tegema. Probe’i lõppraport kinnitab mõlema vana päeviku täielike baitide, räside, inode’i ja metaandmete säilimist hoitud lugemislukkude all.
- **Päringuplaani vaatlus:** Tootmise EXPLAIN ANALYZE FALSE: 4355 sõlme, 733 initplan’i, 457 subplan’i, planning_time_ms 445,744. Päringut see plaan ei täitnud. JIT oli juba konfiguratsioonis off; jit=off lugemise edu ei tõenda JIT-i väljalülitamise mõju ega vana katkestuse põhjust. 63 veeru nimed/järjekord/tüübid/not-null vastasid fixture’ile, kuid price_amount/price_kind/currency ACL-i olemasolu erines; kogu skeemi võrdsust ei väideta.
- **Uus ettevalmistatud lähtepakk:** selqiro-pakkuja-peitmine-parandus-20261113. Täpselt samad 122 payload-teed ja algsed preimage’id; 1607 alusest saab 1696 lähtefaili. Rakenduse runtime, 24h tooteleping ja kõik 12 SQL-i runtime-moodulit säilivad bait-baidilt. Muutuvad kontrollpäringu koostamine, 11 CTE materialiseerimine, kolm ranget tehinguväravat, uue väljaande paigalduskaitsed ja viis jooksvat dokumenti. Täpsed lõppbaidid on uues manifestis.
- **Varasema ajaloo säilimine:** Väljastatud algne, recovery- ja probe-pakk ning kõik raportid jäävad muutmata. Uus jooks hoiab kõigi kolme täpselt pinnitud päeviku olemasolevaid lukke O_RDONLY kaudu kogu töö jooksul ning kontrollib nende baite ja metaandmeid uuesti. Oma uus privaatpäevik ei kopeeri ega nulli vanu intente.

## Tegelik kohalik katse

- Algse 24h funktsiooni build’i, rakenduse/DOM-i ja SQL-runtime’i tõendid kehtivad nende muutmata sisenditele; uusi äriteste ega vana paigaldajat ei korrata. Päris Maci uus build tuleb alles pärast uue andmebaasiseisu eraldi kinnitamist.
- Uue kontrollpäringu 11/11 sihitud SQL-kontrolli PASS, sh 14 nulli/rea-arvu värava alajuhtu. Samas disposable PostgreSQL/WASM-is vähenes ANALYZE FALSE plaan 4623 sõlmelt 1075-le; see pole tootmise kestuse ega koormuse mõõtmine. Täpsed samaväärsuse, tagasipööramise ja muutmata 12 SQL-mooduli tõendid: vt paki kontrollid/.
- Kolme varasema raporti/luku, uue adapteri ühe katse/no-replay, katkestuse ja tarnevoo täpsed tulemused ning sisendräsid: vt paki kontrollid/. Kohalikke päris lukke/Gitti eristatakse sünteetilisest SQL/CLI/buildi piirist. Uut Maci/pilve edu neist ei järeldata.
- BRAUSER: varasema funktsiooni päris brauserijuhtumeid 0 (BLOCKED_ENVIRONMENT); DOM-i tõend ei ole browser PASS. Kahe olemasoleva konto tegelik kasutuskäik ootab uue commit’i Vercel Ready / Production tulemust.

## Production / kasutajaliides

- Viimane vastu võetud veebiversioon on 955c935. Peitmise ja eraldi blokeerimise lähteosa pole nende raportite järgi Maci portaali rakendatud; uut commit/push’i, Verceli tulemust ega kasutusvastuvõttu pole.
- Supabase’i 11-realise logiekspordi SHA256 51ada5cd565387c6ea73cd50366ee0cc70fd39a93da1d152b8075af4e6c9bbed. 57014 katkestus oli 14:16:15.901 Tallinn, 0,143 s enne recovery CLI lõpu ajatemplit. Eksport ei määra katkestaja päritolu ega tõenda inimtegevust; kolm 80003-märgilist pikka välja on kärbitud, tegelik plaan/sessioon puudub.
- Probe jooksis 15:26:04–15:26:39: kolm kohalikku Git-lugemist ja kolm READ ONLY SQL-kutset. Metadata 7,257 s; plaan 14,471 s; täpne 16 kaitse lugemine 13,363 s. Kõik kuus lõppesid edukalt. DB/source/Storage kirjutusi, buildi ega paigalduse jätkamist ei tehtud.
- Viimane pilve seis on absent, 16/16 true; vastus võrdub varasemate raportite kontrolltulemusega. Hosted-kontekst ja invariandid säilivad. Metadata hetkel installeriluku hoidjaid/ootajaid 0; see hetkeseis ei tõenda ajaloolise katkestuse põhjust ega välista hilisemat päringut.
- Uus optimeeritud väljaanne on ette valmistatud, mitte rakendatud. Edu vajab eraldi verified SQL-lugemist → Maci source/build/commit/push raportit → sama uue commit’i Vercel Ready / Production → päris kasutusteed.

## Üks järgmine töö

Paki selqiro-pakkuja-peitmine-parandus-20261113.zip Downloads-i lahti ja käivita üks kord: python3 -I -B "$HOME/Downloads/selqiro-pakkuja-peitmine-parandus-20261113/uuenda.py" --publish. Uus jooks kontrollib kolme vana päevikut ning värsket Maci/Giti/SQL-i seisu; oma varasema kirjutuseta täpne absent lubab ühe kaitstud apply-katse. Source/build/commit/push algavad alles eraldi verified-tulemusest. Saada selle jooksu SAADA SEE FAIL real näidatud täpne raport.

**Peatumisel:** Peatumisel saada sama jooksu täpne uus raport; kui raportit ei loodud, PEATATUD-rida. Vana originaal- ega recovery --publish käsku ja lõpetatud probe’i ei korrata. Uue väljaande oma intent või varasem apply-katse ei luba absent-seisus automaatset kordust; unknown, muutunud alus või kinnitamata protsessi lõpetamine peatab jätku. Päevikuid, intente, lock-faile, raportikoopiaid, pakke ega kasutaja sisu ei muudeta/kustutata. Võimalikult aegunud püsiraport ei kinnita viimase etapi edu.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uue väljaande käsk ja täpne raport.
- docs/continuity/VIEWER_PROVIDER_CONTROLS_20261113.md — muutmata tooteleping, raportite seos ning uus kontrollpäringu parandus.
- docs/architecture/provider-controls-v1.md — serveri ja klientide leping.
- docs/continuity/SERVICE_ACCESS.json — samad sihid ja CLI pinid.
- docs/03_AI_RULES.md ning docs/00_PROJECT_DNA.md; ainult käsil oleva mooduli arhitektuur.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu ega rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- Aegumine jätab teenuse ja seosed omanikule alles. Peatatud teenuse pikendamine ei avalda seda. Teksti-, foto-, rubriigi- või staatusemuudatus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab eraldi lugemist, mitte automaatset kirjutuse kordust.
- Teenuse ja kuulutuste avalik rubriigifilter arvestab eraldi jaotise kogu nähtavat sisu ja esivanemaid enne lehekülge. Omaniku haldus/valija näitab kõiki rubriike. Rubriigi eemaldamine säilitab sisu ja fotod; 80 teenust ei ole konto piir.
- Tähtaeg kontrollib pakkumise ja hallatud pildi nähtavust. Varem avaliku Storage-URL-iga fotot ei muuda see privaatseks. Uuendaja ei tee Storage’i toiminguid. Üldine fotode taustakoristus ja tehniliste paneelide eemaldamine jäävad avamiseelseks tööks.
- Peitmine on vaataja konto ühe pakkuja identiteedi 24h avastuseelistus; püsiv konto blokk on eraldi olemasolevas user_blocks-is. Peitmise/unblock’i eemaldamine ei tühista teise liigi eelistust ega teise poole blokki. Uus lähteosa on Macis rakendamata ja toe puudumine on viimase probe’i lugemise hetkel kinnitatud. Optimeeritud SQL säilitab sama advisory-luku, luku all värske seisukontrolli ja täpsed võimekuse/sõltuvuse/õiguse pinid.
- Töökuulutuse kinnitatud algsuund on ettevõtte avalik profiil/otseviide, üks kuu kehtivust ja nähtavuse selge teade. Üldise tööotsingu sulgemine vajab ka serverikontrolli; üks kuu pole vaikimisi fikseeritud 30 päeva. Töökuulutuste koodi siin pole.
- Uued owner RPC-d kontrollivad oma õigusi. Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir vajavad eraldi lahendust. Energy, maksete tuum ja piiratud AI abi jäävad V2 ulatusse.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git, portaal https://selqiro.vercel.app, Maci siht /Users/taivo/selqiro. Viimane tõendatud HEAD 955c935fa4e901a8b81885e2dcd18d966d651810. Probe kinnitas kohaliku remote’i konfiguratsiooni, mitte GitHubi uue võrdsuse.
- Supabase vyjletlmwoiwxsnsunlm, instance 2d088814-0900-448a-a9d1-7b05470cb1d2, sama CLI 2.117.0 ja olemasolev autentimine. Uut teenuse ühendamist ega paigaldust ei tehta. release_ready=true; cleanup_mode=held on kontrolllepingu väärtus, mitte uus koristusteenuse mõõtmine.
- Uue väljaande privaatpäevik: ~/Library/Application Support/Selqiro/provider-controls-optimized-20261113/<manifestsha>/result.json. Varasemad provider-controls-20261113, provider-controls-recovery-20261113 ja provider-controls-probe-20261113 päevikud jäävad kogu jooksuks lugemisluku alla. CLI read/apply piir 90/180 s; Git-lugemine 20 s; SQL-i read/statement/lock piir 20/45/3 s.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
