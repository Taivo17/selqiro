# 13.11.2026 — taastaja 14:16 raporti ülevaatus

Ülevaatus on eraldi failipakis, mitte Maci hoidlasse kantud muudatus.
Uus raport fe924a… seob e0b755… manifesti ja vana 4df… katse.
Kõik 122 preimage'i ning 1607 indexikirjet vastavad 955c935 alusele.
Apply lõpetas 80,614 sekundil exit 1; 180 s piir ei täitunud. Eraldi verify
õnnestus 18,934 sekundiga ja andis absent, 16/16 true ning muutmata invariandid.
Source/build/commit/push etapini ei jõutud. Kadunud 207 B stdout'i tõttu
puudub täpne veapõhjus; stderr-only SQLSTATE lugeja ei säilitanud stdout-viga.
Järgmine samm on olemasoleva Postgres-veakirje lugemine täpse ajavahemikuga.
Väljastatud pakke, allikaid, SQL-i ega kasutaja päevikuid ei muudetud.

## Varasem päevik säilib allpool bait-baidilt

<!-- SELQIRO_PROVIDER_CONTROLS_RECOVERY_PREPARED_20261113 -->
## 13.11.2026 — värske absent-tõend ja eraldi kontrollitud jätk

Taastaja sihitud kontrollid: 14 transpordi + 18 päeviku/olekumasina + 8 töövoo/katkestuse katset, kokku 40/40 PASS. Uuendaja lõpliku manifesti tarnevoo tõend väljastatakse paki kontrollid/ kaustas; Maci/pilve tulemust see ei asenda.

Maci teise raporti SHA256 on
4df69e2947e853371aaed548c70571c254e28b226552d9eb2d49e80139ad4a5a.
Vana päevik säilitas esimesed viis käsku ja lisas kaks repository_read'i
ning ühe eduka preflight'i: absent, kõik 16 kaitset olid tõesed, samad invariandid.
Peatumine SQL_PREVIOUS_ATTEMPT_NEEDS_REVIEW oli oodatud korduskatse tõke.
Portaali lähtefailid, build, staging, commit ja push ei alanud.

Uus eraldi jätkupakk kasutab oma format/release/päevikut ning täpset seost
selle vana raportiga. Algne journal/intent jääb baitide kaupa muutmata ja
selle olemasolevat lukku hoitakse kogu uue jooksu jooksul. Värske kontroll
lubab kuni ühe uue apply-katse; tundmatut tulemust automaatselt ei korrata.

Runtime, 24h leping, SQL, õigused ja testiallikad ei muutu. Muutmata SQL-i
luku all tehtav lugemine katab vahepeal valmis saanud vana katse. CLI väline
read/apply piir on eksplitsiitselt 90 s / 180 s; serveri 20 s / 45 s / luku 3 s jäävad.
Uus transport lisab kestuse, etapi ja ohutu veakoodi. See ei väida algpõhjuse
lõplikku tuvastamist. Sihitud uued kontrollid on paki kontrollid/ kaustas;
varasemaid lõppenud rakenduse/SQL-teste ei korrata.

Üks järgmine käsk on docs/continuity/HOSTED_PORTAL.md-s. Jätkupakk on siin
ette valmistatud; Maci käivitust, uut DB tulemust, commit/push'i ega uut
Verceli valmimist veel ei ole. Allolev algne ettevalmistus säilib ajaloona.

---

<!-- SELQIRO_PROVIDER_CONTROLS_PREPARED_20261113 -->
## 13.11.2026 — 24 tunni peitmise ja eraldi blokeerimise lähtekood valmis

Uus moodul on ette valmistatud vastuvõetud `955c935` alusele. Pakkuja menüüd,
Minu ala eraldi haldusloendid, serveri enne-lehekülge filter ja varasema
`user_blocks` registriga ühendus on lähtekoodis. Konto/vaate vahetus ja
hilinenud vastused on piiratud; tundmatut kirjutust ei korrata automaatselt.

Build ning 37 kliendikatset on läbitud. SQL-i 24 runtime-, 49 paigaldus- ja
11 päringuplaani kontrolli on läbitud sünteetilises PostgreSQL/WASM-is.
Päris brauserikatse peatus keskkonnapiiril ja ootab uue veebiversiooni
kasutuskäiku. Maci kirjutust, pilve SQL-i, commit/push'i ega uut deployment'i
siin tehtud ei ole. Paki tarne- ja täpsed sisenditõendid on `kontrollid/` all.

Üks praegune seis on `docs/continuity/CURRENT_STATE.json`, üks jätkamiskäsk
`docs/continuity/HOSTED_PORTAL.md`. Mooduli arhitektuur:
`docs/architecture/provider-controls-v1.md`. Allolevad dateeritud otsused ja
ettevalmistus-/NEXT-kirjed säilivad muutmata ajaloona.

---

<!-- SELQIRO_PROVIDER_CONTROLS_CONFIRMED_20261113 -->
## 13.11.2026 — peitmine 24 tunniks ja eraldi püsiv blokeerimine

Kasutaja kinnitas ajutise peitmise kestuseks 24 tundi. See asendab varasema
7 päeva soovituse. Peitmine on vaataja konto otsingueelistus ühe pakkuja
identiteedi suhtes: automaatne lõpp, kohene tagasivõtmine ja Minu ala haldus.
Sõnumid ja teadlikult avatud profiil/detail säilivad tavapäraste õigustega.

Püsiv blokeerimine jääb eraldi user_blocks-i toiminguks varasema lepingu
alusel: nähtavuse piirang, mõlemapoolne saatmiskeeld, vestlusajaloo säilimine
ja ainult blokeerija eemaldatav blokeering. Peitmise aegumine blokeeringut
ei tühista. Praeguse runtime'i ja haldusvaate täielik ühendus vajab kontrolli.

Leping: docs/continuity/VIEWER_PROVIDER_CONTROLS_20261113.md.
Üks praegune seis: docs/continuity/CURRENT_STATE.json ja genereeritud üleandmine.
Teenuste kehtivuse 955c935 paigaldus/vastuvõtt säilib. Käesolev samm uuendab
dokumente; uut runtime'i, SQL-i, build'i, Maci kirjutust, commit/push'i ega
deployment'i ei tehtud. Delta läheb järgmise sisulise lähtepakiga kaasa.
Allolevad dateeritud 7 päeva soovitused ja NEXT-kirjed on ajalugu.

---

<!-- SELQIRO_SERVICE_ACTIVITY_ACCEPTED_20261111 -->
## 11.11.2026 — teenuse kehtivus ja pikendamine on paigaldatud ning vastu võetud

Maci lõppraport kinnitab SQL-i järelkontrolli, build'i ja push'i commit'iga
955c935fa4e901a8b81885e2dcd18d966d651810; lõpp 20:35:24 Europe/Tallinn.
Sama 955c935 Verceli Ready / Production on kasutaja pildil.
Kasutaja kinnitas pikendamist ning teenuse ja rubriigiseoste säilimist
avalikul profiilil. Puhastusteenuse lõpp muutus 11.11.2027 20:34 → 20:46.

Autoriteetne seis: docs/continuity/CURRENT_STATE.json.
Täpne vastuvõtt: docs/continuity/SERVICE_ACTIVITY_ACCEPTED_20261111.md.
Lõpetatud paigaldajat, SQL-i, build'i ega kasutuskatset ei korrata.
See dokumentide delta ootab järgmist sisulist lähtepakki; uut Maci kirjutust
ega commit'i siin ei tehtud. Järgmine soovitus on ajutine pakkuja peitmine
otsingust; 7 päeva on ettepanek ja selle mooduli kood on koostamata.
Allolevad ettevalmistuse ja varasemate NEXT-ide kirjed säilivad ajaloona.

---

<!-- SELQIRO_SERVICE_ACTIVITY_PREPARED_20261111 -->
## 11.11.2026 — teenuse üheaastane kehtivus on uues lähtepaketis valmis

Teenuse 365-päevane tähtaeg ja omaniku teadlik tasuta pikendamine on valmistatud
paigaldatud `1b0c5ba` allika peale. Minu ala ja muutmisvaade näitavad tähtaega;
aegunud teenus jääb omanikule alles. Serveri ühine avaliku nähtavuse kontroll
arvestab kehtivust enne loendeid, koguarve, rubriike ja lehekülgi.

Üleminek annab avaldatud teenusele ja avaldamisajaga peatatud teenusele
ühe aasta muudatuse rakendamisest. Algseid kuupäevi ei muudeta ega märgita
üleminekut omaniku tehtud kinnituseks. Mustandi periood algab päris avaldamisel.
Sisu, fotode, rubriikide või staatuse salvestamine ei pikenda tähtaega.
Pikendamine säilitab staatuse, sisu, fotod, rubriigid ja otsingujärjestuse aluse.

Kohalikult PASS: SQL runtime 22/22 ja paigaldus 38/38, muudetud transport 25/25,
kliendi/editori sihitud katsed 25/25, TypeScript, Next build ning build'i järel
Chromium 5/5 (English/Eesti, 1365/390 px). Sünteetilised teenusepiirid on
tõendites kirjas. Uue sammu Maci rakendus, SQL-i aktiveerimine, commit/push,
Verceli Ready ja kasutajavastuvõtt on veel kinnitamata.

Üks järgmine käsk on `docs/continuity/HOSTED_PORTAL.md`-s. Autoriteetne seis on
`docs/continuity/CURRENT_STATE.json`, sellest genereeritud üleandmine ning
`docs/continuity/SERVICE_ACTIVITY_20261111.md`. Uus leping on
`docs/architecture/service-activity-v1.md`.

See pakk kannab kaasa ka eelmise teenuste rubriigivastuvõtu dokumentide delta.
Allolevad dateeritud NEXT/ootel-kirjed on ajalugu. Väljastatud pakid, kasutajasisu
ja päevikud säilivad; lõpetatud paigaldusi ega kasutuskatseid ei korrata.

---

<!-- SELQIRO_SERVICE_STORE_CATEGORIES_ACCEPTED_20261111 -->
## 11.11.2026 — teenuse poe rubriigid on paigaldatud ja vastu võetud

Maci lõppraport kinnitab andmebaasi järelkontrolli, build'i, commit'i
`1b0c5ba867e5f466e75f63aee78521d37cf8164f` ja push'i; lõpp 16:31:59 Europe/Tallinn.
Kasutaja salvestas teenusele ANTIIK ning leidis/avas selle profiili filtriga.
Kinnitatud on aktiivse sisuga rubriikide näitamine avalikus profiilis.
See kinnitus ei lisa uut Back-, kustutamis- või aegumiskatset.
Täpne Verceli Ready/deployment-ID on eraldi kinnitamata (`READY_NOT_CHECKED`).

Üks praegune seis on `docs/continuity/CURRENT_STATE.json`; täpne vastuvõtt on
`docs/continuity/SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md`-s.
Järgmine soovitatud töö on teenuse üheaastane kehtivus ja teadlik pikendamine.
Selle vastuvõtu dokumentide delta ootab järgmist sisulist lähtepakki;
uut Maci kirjutust, commit'i ega paigaldajat siin ei tehtud.
Väljastatud teenuste pakki ning allolevat dateeritud ajalugu ei muudeta.

---

<!-- SELQIRO_SERVICE_CATEGORIES_PREPARED_20261111 -->
## 11.11.2026 — teenuste poe rubriigid ja sisuga avalikud filtrid ette valmistatud

Uus samm ühendab olemasoleva teenuse kanoonilise UUID enda poe rubriikidega.
Eraldi salvestus hoiab põhivormi ja fotode poolelioleva töö alles. Lisanduvad
omaniku RPC-d kontrollivad salvestatud aktiivset identiteeti ja kogu
rubriigikomplekti; otsetabeli kirjutust API rollidele ei avata.

Avaliku profiili teenuste ja tava-/hobusekuulutuste filtris on ainult vastava
vaatajale nähtava sisuga rubriigid ja vajalikud ülemrubriigid. Omanikule
säilivad kõik rubriigid. Teenuste päris leheküljed asendavad 80-kirje
tehnilise nähtavuspiiri; uut konto limiiti ei lisata. Tagasitee säilitab
rubriigi, avatud haru, lehekülje ja kerimiskoha. Ajutise omaniku lugimistõrke
ning teadmata salvestuse mustand säilib, konto/identiteedi vahetus sulgeb
vana ulatuse ja hilise vastuse.

Kontrollid: SQL runtime 28/28, paigaldus/drift/rollback 41/41, teenuse
ReactDOM/API 12/12, jagatud mooduli hobuseregressioon 11/11, tagasitee 12/12,
lõppbuild 48.235 s / 637 sisendit / drift 0, Chromium 153 pärast build’i
6/6 English/Eesti desktop/mobiil. Uuendaja aluse raport 9/9 ja SQL-adapter
13/13. Täpse lõppmanifesti tarnekäik on paki `kontrollid/final-flow.json`-is;
selle SQL/build on sünteetilised. Brauserifixtuuri varasemad ebaõnnestunud
eeldused ja logid säilivad; lõppbuild’i järel rakenduskood ei muutunud.

11.11 tooteotsused talletati eraldi: teenus üks aasta, töökuulutus üks kuu,
ettevõtte töökuulutus alguses avalikul profiilil/otseviitel; üldine tööotsing
avaneb hiljem. Ajutine 7-päevane vaatajapoolne pakkuja peitmine on soovitus
eraldi otsingueelistusena. Nende järgmiste etappide koodi see pakk ei lisa.

Viimane tegelik Maci alus on vastu võetud d5e77e9. Uue sammu Maci paigaldus,
pilve-SQL, commit/push, Vercel ja kasutajavastuvõtt on veel kinnitamata.
Pakk sisaldab ka eelmise hobuste vastuvõtu dokumentide kontrollitud delta.
Uuendaja näitab vea korral jooksu täpset `SAADA SEE FAIL` JSON-i ning valib
selle Finderis. Vanu pakke, raporteid ja kasutajasisu ei muudeta/kustutata.

Täpne jätk: `continuity/CURRENT_STATE.json` → sellest genereeritud üleandmine
→ `continuity/HOSTED_PORTAL.md`. Teostus ja tõendid:
`continuity/SERVICE_STORE_CATEGORIES_20261111.md`. Tulevased tooteotsused:
`architecture/public-discovery-controls-v1.md`.

---

<!-- SELQIRO_STORE_CATEGORY_ASSIGNMENT_ACCEPTED_20261110 -->
## 10.11.2026 — poerubriikide seostamine kasutaja poolt vastu võetud

Kasutaja kinnitas olemasolevate oma rubriikide valiku salvestamist ja tulemuse
nähtavust avaliku profiili rubriigifiltris. Valikute eemaldamise järel jäi
kuulutus alles. Viis kuvatõmmist toetavad selle kasutustee vastuvõttu.
Kustutamise kinnitus puudutab siin kuulutuse rubriigiseoseid; rubriigikirjete
endi kustutamist ega kogu rubriigihaldust sellest ei järeldata.

Selle teatega ei lisandunud uue commit'i räsi, terminali eduraportit ega Verceli
Ready/deployment'i identiteeti. Kasutaja nähtav vastuvõtt on kinnitatud.
Väljastatud pakki, selle kontrolltõendeid ja külmutatud lähtekoopiat ei muudeta.
Build'i, paigaldust, pilvetoiminguid ega vastu võetud katset ei korratud.

Uuendatud seisukiri ja sellest genereeritud üleandmine on eraldi dokumentide
koopia. Maci/GitHubi neid selle salvestusega ei rakendatud; delta tuleb kaasa
võtta järgmise sisulise tarnega. Olemasolevate rubriikide loomise, ümbernimetamise
ja eemaldamise haldus ning vana otsetabeli kirjutusõiguse piir jäävad eraldi
arenduseks. Järgmine soovitatud haldussamm pole käesolevaga alanud.

Allpool olevad varasemad ettevalmistuse märked ja käsud on ajalugu.
Praegune seis ja üks järgmine suund on CURRENT_STATE.json-is; vana paigaldaja
korduskäivitamist ei nõuta. Vastuvõtu täpne tõendipiir on eraldi ACCEPTANCE.json-is.

<!-- SELQIRO_STORE_CATEGORY_ASSIGNMENT_PREPARED_20261110 -->
## 2026-11-10 — poerubriikide valik praeguses kuulutuse muutmisvaates

Ette valmistatud on nelja väikese mooduliga, kasutaja/identiteedi/kuulutusega
seotud kaart. Olemasolev valija ja atomaarne `set_my_listing_store_categories_v2`
RPC jäävad kasutusse. Päringud kasutavad fikseeritud tokenit; täpne kviitung,
ühe tegevuse lukk ja vana konteksti tõkked kaitsevad salvestust. Ebaselge tulemuse
järel nõutakse uut lugemist. Rubriigiseos ei salvesta teksti, hinda ega fotosid.

Olemasolevaid rubriike saab valida; integreeritud Minu ala peidetud CRUD jääb
selles sammus avamata. Tühi seis ei suuna peidetud ankrule. Avalik alampuufilter
on olemas; hobuste ja teenuste rubriigiseost ei lisata. Vana otsetabeli RLS-i
laiemat piiri ei esitata parandatuna.

SQL-fixtuur 19/19 PASS (PGlite/WASM, sünteetiline Auth), API/ReactDOM 13/13 PASS,
värske Next webpack build PASS (600 muutumatut sisendit) ning Chromium 4/4 PASS
(English/Eesti, 390/1365 px). Rubriigi salvestamisel säilis sama teksti/hinna
mustand ja input-DOM; console.error/warning/pageerror/välisvõrgupäringuid 0.
Brauseri esmane rakise viga lahendati enne päris brauserijooksu. Uuendaja
esmane helperi proof on 10/10; täpselt väljastatud manifesti helperi ja päris
ajutise Giti tarne tõendid on pakis `kontrollid`. Täpsed failid ja piirid:
`continuity/STORE_CATEGORIES_20261110.md`. Uus tarne on ilma SQL/CLI/Storage'i
toiminguteta. Maci rakendus, uus commit/push, Ready ja rubriigi kasutuskatse on
eraldi kinnitamata. Varasem `429ace2`/`26e468e` Ready ja Tagasi vastuvõtt säilivad.

<!-- SELQIRO_SERVICE_NAVIGATION_ACCEPTED_20261109 -->
## 2026-11-09 — teenuste tagasitee tootmises vastu võetud

Kasutaja kinnitas: „korras nüüd läheb mõlemas kohas tagasi samasse kohta”.
Vastu on võetud teenuse detailist Browser Back nii avalikule profiilile kui
ka avalikku teenuseloendisse. 21:31:20 nimega Verceli kuvatõmmisel on
`429ace2` / `Restore service list on browser back` / `main` / Ready / Production.
Varasem foto/profiiliparandus `26e468e` on samuti Ready / Production nähtav.

Täielikku commit-räsi, Maci eduraportit ega värsket tööpuud/indexit ei antud;
neid ei oletata. Paigaldajat, build'i, teste ega deployd ei korratud.
Käesolev eraldi dokumentide üleandmine sisaldab uut seisukirjet ja sellest
loodud handoff'i; Maci/GitHubi dokumente pole selle salvestusega muudetud.
Väljastatud ZIP-id ja senised päevikud säilivad muutmata.

<!-- SELQIRO_SERVICE_NAVIGATION_ACCEPTANCE_20261109 -->
## 2026-11-09 — teenuste fotod/järjestus vastu võetud; tagasitee parandus valmis lähtekoodis

Kasutaja kinnitas teenuse piltide salvestamise ning uusima teenuse esimese koha
Minu alas ja avalikul profiilil. Hobuse profiililt ning tavakuulutuse avalikust
loendist tagasitee on samuti vastu võetud. Teenuse detailist naastes kadusid
aga profiili/loendi asukoht, laiendus ja otsinguseis; kaks viga korrati vanas
r2 allikas päris brauseris.

Valmis eraldi väike service-navigation moodul, ajalookirjega seotud lähtekoht,
URL-is filtrid, värskete tulemuste piiratud taastamine ja kaardi nähtava koha
joondamine. Sama lähtepunkt säilib korduva Back–Forward–Back puhul; nähtav
back-link arvestab profiilist tulekut. Loendi hiline kasv ja profiilis
teenuse/kuulutuse vahetamine on sihitult kaetud. Pikk kirjeldus jäi detailis
tervikuna loetavaks; kaartide kahe rea reeglit ei muudetud.

Värske Next tootmiskooste PASS (596 sisendit, drift 0), TypeScript PASS,
sihitud lint 0 viga, kontekst/filtrid 12/12 ja Chromiumi kasutusteed 13/13 PASS.
Uuendaja varasema r2 tõendi sidumine ning DB-ta veatee: 8/8 PASS. API/auth ja
Next Link/router piirid on brauserifixtuuris sünteetilised. Lõppmanifesti
päris ajutise Giti tarnekäigu tõend on välise paki kontrollid-kaustas.

Uus source-only pakett seob tegeliku r2 commit'i olemasoleva privaatraporti ja
Giti täieliku puuga; selle uut räsi ei oletata. SQL-i, Storage'i ega teenuste
uuesti ühendamist selles sammus ei ole. Olemasolevad päevikud ja väljastatud
r2 pakk säilivad. Maci kirjutus, commit/push, Verceli Ready ja kasutaja kaks
teenuse tagasiteekatset on veel kinnitamata.

Üks seis: CURRENT_STATE.json. Üks käsk: HOSTED_PORTAL.md. Detailne tõendipiir:
SERVICE_RETURN_NAVIGATION_20261109.md ja service-return-navigation-v1.md.

<!-- SELQIRO_SERVICE_PROFILE_RECONSTRUCTED_R2_20261109 -->
## 2026-11-09 — lugemisraport vastu võetud ja täpne r2 kontrollalus taastatud

- Kell 19:33:50–19:33:54 Europe/Tallinn lõpetatud diagnostika on vastu võetud.
  Kõik 1326 indexikirjet vastavad b05ed30 alusele; enne/pärast allikas muutumatu.
  Eelkontroll kattub esimese peatusega. Koguti kahe tabeli tehniline kirjeldus,
  portaali/andmebaasi/Storage’i ega Git-kirjutusi ei tehtud.
- Kogu metadata ainus struktuurierinevus oli nime CHECK-i pesastatud AND-kuju.
  Selle täpne allikas on vana BETWEEN deklaratsioon. Lisaks taastati fixture’is
  kaks algallikas säilinud PUBLIC EXECUTE õigust. Tootmise piiranguid/õigusi ei muudeta.
- Parandatud fixture annab tegeliku sõltuvusräsi d42b8615… täpselt. Eelmise
  tegeliku r2 invariantide sisenditega taastub kogu vana STOP-eelkontroll.
  Guard’e ei nõrgendata ega tundmatuid räsi ei lubata.
- Rakenduse 557 build’i sisendit ning kolm runtime-SQL-i lähtefaili on sama
  testitud parandusega bait-baidilt identsed. Varasemaid laiu kasutusjuhtude
  teste ei korratud. Täieliku algoleku taastamine PASS; 20 sihitud SQL-kaitse
  ja 10 raporti-veatee integratsioonikatset PASS, tõendid r2 pakis eraldi.
- Kasutaja soovitud raportivoog töötas diagnostikas: täpne Downloads-fail jõudis
  vestlusse, terminalis oli SAADA SEE FAIL ja Finderi valimise käsk. Uue r2
  uuendaja veatee kasutab sama privaatset unikaalset koopiat ning selget fallback’i.
- Üks CURRENT_STATE, sellest genereeritud üleandmine ja HOSTED_PORTAL on
  ajakohastatud. Vana pakett ning päevikud säilivad. Uus r2 Maci paigaldus,
  commit/push, Verceli Ready ja kitsas foto/profiili vastuvõtt on veel ees.
  Allpool olevad diagnostikat ootavad ja esimese paki NEXT-kirjed on ajalugu.

---

<!-- SELQIRO_PROFILE_STRUCTURE_DIAGNOSTIC_20261109 -->
## 2026-11-09 — tegelik peatuse raport ja automaatne raporti leidmine

- Tegelik STOP-raport kinnitas muutmata b05ed30 aluse, 1326 faili ning selle,
  et andmebaasimuudatused, lähtefailide kirjutused, build ja Git-kirjutused ei alanud.
- Ainult profiili sõltuvuskontroll erines. Fixture’i kaks ekslikku PUBLIC EXECUTE
  eemaldamist on algallikaga tõendatud. Kahe tabeli struktuuriräsi erinevus jääb
  tuvastamiseks; tundmatuid räsi ei lubatud ja tootmise õigusi ei muudeta.
- Valmis üks ainult lugev kataloogipäring ja piiratud diagnostika; see tagastab
  ainult vajalikud kaks tabelikirjeldust. Maci tulemus on veel ootel.
- Kasutaja soovil saab raport arusaadava nime Downloads-kaustas ja sama fail
  valitakse Finderis. Terminalis on SAADA SEE FAIL täpne tee. Helperi 11 katset
  läbisid; uue diagnostika 10 integratsioonikatset läbisid samuti. DB/Finder
  olid selles tarnekatses asendatud; päris Finder kinnitub Maci käigus.
- Püsiv tööreegel on docs/03_AI_RULES.md-s. Praegune üks käsk on
  continuity/HOSTED_PORTAL.md-s. Väljastatud vanu pakke ja päevikuid ei muudeta.

---

<!-- SELQIRO_SERVICE_PROFILE_PREFLIGHT_STOP_20261109 -->
## 2026-11-09 — teenuste fotoparanduse eelkontroll peatus Macis

Kasutaja kuvatõmmis näitab väljalaske `0cf78dad191f17bdc73876649470ce1d269e2631356f7090f45daa64d9a366ab`
peatust `DATABASE_PRECONDITIONS_NOT_MATCHED`. Täpne uuendaja kontrolliti üle:
see koht eelneb SQL-i rakendamisele ja portaali lähtefailide/build’i/Giti
muudatustele. Olemasolev report on salvestatud, kuid selle sisu pole veel
saadud. Põhjuseks olnud täpset kataloogi/õiguste/konteksti erinevust ei oletata.

Üks järgmine tegevus on olemasoleva result.json koopia saamine; juhis on
continuity/HOSTED_PORTAL.md-s. Uuendajat ega vanu teste ei korrata. Väljastatud
ZIP-i, manifesti, payload’i ja päevikuid ei muudeta. See märkus uuendab ainult
assistendi ettevalmistatud tööseisu dokumente; Maci kirjutust ei tehtud.

---

<!-- SELQIRO_SERVICE_PROFILE_POLISH_20261109 -->
## 2026-11-09 — teenuste r2 vastu võetud, fotovalik ja profiili loendid

- Kasutaja r2 eduraport kinnitab `b05ed3047a25bc1504403ec70e98ae0ff7757bec`,
  andmebaasi, build’i ja push’i. Täpne sama commit’i Ready jäi raportis kontrollimata.
  Teenuste teksti ja olekute kasutuskatse ning varasem hobuse vastuvõtt säilivad.
- Fotovaliku põhjus taastati: faili valimise akna järel pehme omaniku kontroll
  keelas ajutiselt vormi ja jättis valitud faili kõrvale. Uus parandus säilitab
  kohaliku valiku; päris identiteedimuutus ja salvestuse õiguskontroll säilivad.
- Teenused järjestuvad serveris loomise järgi enne lehekülge. Loendi kirjeldus
  on kuni kaks rida. Profiil saab ühe kanooniliste hobuse- ja tavakuulutuste
  loendi, ühise lehekülje ning korrektse detaili- ja tagasitee.
- Poerubriikide audit leidis praeguses hallatud fotodega muutmisvaates puuduva
  seostamise kaardi. Olemasolev tavakuulutuste avalik filter säilib; hobuste ja
  teenuste täielikku rubriigituge ei väideta.
- Värske build/TypeScript PASS; Reacti 7 + 13 ja SQL-i 44 + 16 kontrolli PASS.
  Chromiumi 14/14 ja uuendaja isoleeritud 15/15 kontrolli PASS. Tõendid ning
  kõik piirid on `continuity/SERVICE_PROFILE_POLISH_20261109.md` ja tarnepaki
  kontrollides; lõplik pakendi räsisidumine on seal eraldi.
- Uus lähteparandus on ette valmistatud. Maci rakendamine, uus commit/push,
  sama commit’i Ready ja kitsas fotode/profiili kasutuskatse on ootel.
  Praegune üks käsk: `continuity/HOSTED_PORTAL.md`. Allpool on ajalugu.

---

<!-- SELQIRO_HORSE_PARITY_20261108 -->
## 2026-11-08 — hobuse avaldamine nähtav, galerii ja elutsükli ühtlustamine

Kasutaja ekraanipildid kinnitavad kahe fotoga hobuse avalikku detaili, ühise
otsingu kaarti ja Minu ala rida. Leitud puudused: galerii nooled/suur vaade,
omaniku pisipilt ja elutsüklivalikud. Uus kandidaat ühendab ühise pildivaaturi,
pisipildi autentitud lugemise ning Aktiivne/Peatatud/Müüdud ja 90-päevase
uuendamise. Pilt ja pealkiri avavad sama sihi, üleliigne parempoolne link kaob.
Sisu salvestamine säilitab staatuse ja tähtaja; vana vorm ei tohi hilisemat
peatamist tühistada. Vana NULL-tähtaeg tuleneb algsest avaldamisest, mitte
uuenduse paigaldusajast. Bulk-aktiveerimist ega uut püsivat kontopiiri ei lisata.

Alus on täpne capacity-r2 1193-failine lähtekood. Maci edukas privaatne raport
ja kõik Giti objektid kontrollitakse uues uuendajas; uut commit’i ei oletata.
Värske kohalik tõend ja päris paigalduse piir on CURRENT_STATE.json-is ning
lõplikus kontrollraportis. Üks järgmine käsk asub continuity/HOSTED_PORTAL.md-s.
Teenused järgivad pärast vastuvõttu sama lihtsat Avalda / Muuda–Salvesta voogu,
töökuulutused tulevad hiljem. Varasemad dateeritud seisud on ajalugu.

---

<!-- SELQIRO_UPLOAD_CAPACITY_PREFLIGHT_R2_20261108 -->
## 2026-11-08 — üleslaadimisruumi esimene peatus ja kontrollaluse r2

- Tagastatud `selqiro-uleslaadimise-ruum-20261108-result.json` räsi on
  `bd8a76d4e3c3d73763ef8acd669dec2ee9d13af89726962c371baba93e3588da`.
  Release `24c41b2440d0dec3f2fd2708b2b44afd843271f024d4419554834b47c451eb5d`
  peatus enne SQL-i rakendamist, lähtefailide muutmist, build'i, commit'i ja push'i.
  Täpne edukas hobuse r2 alus `6bb4385` / 1165 faili säilib.
- Viga oli kohalikus fixture'is: 17 varem väljastatud privaatset funktsiooni
  puudusid, kuigi uus sõltuvuskontroll need tootmises kaasa arvas. Säilitatud
  SQL-i täpsed määratlused, omanikud ja õigused taastavad tegeliku raporti
  funktsioonide räsi `93b95bd4…` ja sõltuvusräsi `bd0d02ea…`.
- R2 parandab kontrollalust ja selle genereeritud kaitseid. Viis runtime-faili
  ning kolm ruumiparanduse SQL-moodulit on muutumatud; kontrolli ulatust ega
  tootmise õigusi ei nõrgendata. Vana pakett ja peatunud päevik jäävad alles.
- Uus pakett on `selqiro-uleslaadimise-ruum-20261108-r2.zip`. Selle paigaldus,
  Ready ja kahe fotoga hobuse avalik tulemus on veel ootel. Praegune käsk ning
  sama toimingu jätkamine on `docs/continuity/HOSTED_PORTAL.md`-s.
- Pärast hobuse vastuvõttu järgnevad teenused sama Avalda / Minu ala
  Muuda–Salvesta loogikaga; töökuulutused hiljem. Kontol mitusada kuulutust on
  eesmärk, täpne püsiv piir pole otsustatud. Allpool säilib varasem ajalugu.

---

<!-- SELQIRO_UPLOAD_CAPACITY_20261108 -->
## 2026-11-08 — kahe hobusefoto ruumikeeld tuvastatud ja parandus valmistatud

- R2 edu on raportiga kinnitatud: `main` `6bb4385`, 1165 faili, SQL/build/push
  edukad. Ainult lugemise raporti ZIP-i SHA-256 on
  `2e50d5516d25c4f73bc77163d0cb03bce55489989e096c45c514312c1f0200d7`.
- Vana arvestus: 175 MiB avaldatud SOURCE + 84 MiB avaldatud WEB = 259 MiB;
  kasutaja kaks uut fotot lisavad 58 MiB ning kontroll sai 317 > 300 MiB.
  Uus ajutine arvestus saab 233 MiB enne koristamist. Püsivat kontokvooti
  ega mitmesaja kuulutuse täpset piirangut selle parandusega ei kehtestata.
- Lisatud ühine ajutise ruumi loendur ja sama algse kasutaja lubatud
  identiteetide piiratud SOURCE-lõpetamine. Värske Storage'i puudumine ning
  seotud püsiv kinnitus on nõutud; avaldatud WEB-i see võime ei kustuta.
  Ainult täpne ruumikeeld võib kinnitatud koristuse järel saada ühe identse korduse.
- 67 uut ja 198 varasemat runtime-katset, tsc ja viie muudetud runtime-faili
  ESLint läbisid. Sünteetilise seadistusega build läbis 28,29 s. SQL-i ja
  täpse tarne tõendid on eraldi; Maci parandus/Ready/vastuvõtt on veel ootel.
- Praegune käsk on `docs/continuity/HOSTED_PORTAL.md`-s. Pärast Ready jätkatakse
  sama hobusetoimingut samade kahe algfotoga ja kontrollitakse avalikku vaadet.
  Kolme avatud / 20 uue toimingu kaitsed ja terminalse koristuse järgmine töö
  on selgelt eristatud. Teenused järgnevad sama lihtsa kanoonilise UUID vooga.

Allpool säilivad varasemad sissekanded; vanad paigalduskäsud on ajalugu.

---

<!-- SELQIRO_HORSE_PUBLICATION_PREPARED_20261108 -->
## 2026-11-08 — kanooniline hobuse avaldamine ja kinnitatud muutmine

- Kasutaja näitas toimivat English/Eesti valikut; varasem foto 785c359 ja
  ühe lisamise 9 s vastuvõtt säilivad. Lähtealus on täpselt taastatud
  1106-failine keelepakett, mitte varasema foto paranduse puu.
- Kõik viis hobusetüüpi kasutavad üht Avalda-toimingut. Privaatne jätkatav
  prepare on sisemine taastemehhanism; kohustuslikku Salvesta mustand sammu
  ei ole. Hobune jääb horse_offers UUID kirjeks, listings koopiat ei teki.
- Minu ala avaldatud hobuse Muuda → Salvesta muudatused kasutab sama UUID-d
  ja eeldatud revisjoni. Vana avalik versioon säilib kuni sisu ja galerii
  atomaarse kinnitamiseni. Kadunud vastus lepitakse sama toiminguvõtmega;
  teadmata PUT-i ei saadeta pimesi uuesti.
- Ühendatud on täpsed poliitikad/kinnitused, hallatud pildid, järjestus ja
  põhipilt, tegelik avalik detail/otsing/profiil ning praegused ühised
  vestlused tüübiga hobusekaartidega. Privaatne täpne asukoht ei lähe avalikku
  projektsiooni. Uus UI/tagasiside on EN/ET, keel ei loo uut toimingut.
- Kohalik tõend: 35 kontrolleri/React SSR + 6 avaliku lugemise/profiili +
  9 meediatranspordi testi ning 8 SQL-integratsiooni + 9 SQL-tuuma +
  12 SQL-paigalduskaitse kontrolli läbisid. Uuendaja 17 ajutise Giti juhtu
  läbisid. TypeScript puhas. Natiivne brauser puudub; täit visuaalset
  brauserikatset ega tootmise Storage-katset ei väideta.
- Täielik npm run build -- --webpack läbis 28,69 s (exit 0) külmutatud
  runtime’i peal sünteetiliste seadetega. Lõplik paketi kontroll säilib
  eraldi tarnearuandes; kohalik build ei tõenda tootmise paigaldust.
- SQL-i 01–07 tarnitakse ühe kontrollitud tehinguna koos preflight/verify
  kaitsetega. Pakett selqiro-hobused-20261108 nõuab eelmise keelepaigalduse
  täpset edukat privaatset päevikut ja lähtepuud. Tootmist pole muudetud;
  Maci paigaldus, uus Ready ja kasutaja vastuvõtt on ootel.
- Draft/published on muudetavad; ülejäänud hobuseseisud on lugemiseks.
  Uusi archive/delete/renew toiminguid ei lisata. Teenused on järgmine
  kanooniline domeen sama Avalda/Muuda/Salvesta vooga, töökuulutused hiljem.
- Uuendatud hobuse arhitektuur, ühine alus, known-issues, üks CURRENT_STATE,
  HOSTED_PORTAL ja sellest genereeritud üleandmine. Varasem päevik säilib.

<!-- SELQIRO_V2_LANGUAGE_PREPARED_20261107 -->
## 2026-11-07 — üks V2 keele-eelistus ja ühise kuulutusaluse audit

- Kasutaja kinnitas foto kuvamise paranduse 785c359 Ready / Production;
  üks lisamine 9 s, foto avalikus vaates nähtav. Varasemat parandust ei korrata.
- V2 päis kasutab üht English/Eesti valikut ja olemasolevat profiles.language
  välja. Inglise keel on vaikimisi/fallback, aktiivne identiteet ei määra keelt.
  Värske autentimispõlvkond, 12 s tähtaeg ja kinnitatud tagasilugemine säilivad.
- Olemasolevad V2 navigeerimise, kuulutuste, profiili, vestluse, energia,
  hobuse, teenuse ja tootenäidise vaated on lokaliseeritud. Kataloogid
  tõlgivad ka nähtava oleku/vea keelevahetusel. Kasutajasisu jääb puutumata.
- 1687 + 174 + 99 + 62 sihitud testi läbisid. Chromiumis 10 provideri,
  üks tegeliku fototöövoo ja 12 päise/demo kuva juhtumit läbisid. Keelevahetus
  ei tekitanud teist üleslaadimist ega salvestamata vormi kadu.
- Ühine Next kooste läbis 27,96 s; kogu vaadatud runtime säilis. Paigaldaja
  6/6 kontrolli läbisid 1085-failise päris baaspuu ja kohaliku Giti kaudu.
  Tootmisteenuseid ei kutsutud; Mac/Ready/keele-eelistuse vastuvõtt on ootel.
- Kõik serveri/API/SQL-failid on algbaasiga identsed. Tingimuste et-EE
  originaaltekst/räsi ja ordinary publication et leping säilivad; inglise
  liides annab eestikeelse dokumendi kohta teate.
- Ühise aluse audit eristab tegelikke võimeid ja järgmisi ühendusi:
  kanoonilised listings, horse_offers ja services säilivad. Hobuste täielik
  avaldamine/fotod/avalik detail tuleb enne päris teenuste kataloogi.
  See keelepakett neid domeeniühendusi veel ei teosta.
- Uuendatud üks CURRENT_STATE, sellest genereeritav üleandmine,
  HOSTED_PORTAL, known-issues ja arhitektuur. Varem väljastatud arhiivi,
  lähtepuu ja käesoleva päeviku senised baidid säilivad.

<!-- SELQIRO_PHOTO_PICKER_PACKAGE_FIX_20261107_R2 -->
## 2026-11-07 — foto-valiku pakendamisviga ja eraldi r2

- Kasutaja ZIP oli lahti pakitud. Terminalipilt näitas uut peatust
  PACKAGE_EXTRA_FILE_REFUSED ning eelneva kiirenduse build/commit/push edu
  commit’iga 832c6a4c0e97c6b883a81f63ca1821ef3b192cb3. Ready-rida pole lisatud.
- Täpne väljastatud 32-failine ZIP kordab vea: assistent lisas pärast
  esialgset tarnekontrolli kaks .log faili, mida pakireeglid ei luba.
  Peatus on enne eelkäija lugejat, Journalit, Giti ja projektikirjutusi;
  seetõttu uut result.json-i ei tekkinud. See oli assistendi pakendamisviga.
- Uus r2-kaust tarnib samad tõendid lubatud .md nimedega. Vana väljastatud
  ZIP, lähtepuu ja päevikud säilivad. Uuendajat, räsikaitset, eelkäija profiili,
  kolme runtime-faili ja kahte rakenduse testi ei muudeta.
- Rakenduse varasemaid build’i/teste ei korrata; r2 tarne kontrollib tervet
  koostepakki ja enne väljastamist just lõplikust ZIP-ist lahti pakitud sisu.
  Käsitsi failide eemaldamist kasutajalt ei nõuta.
- Uuendatud CURRENT_STATE, genereeritud üleandmine, HOSTED_PORTAL ja
  foto-valiku ülevaade; lisatud PHOTO_PICKER_PACKAGE_FIX_20261107.md.
  R2 Maci rakendus, uus commit/push ja Production Ready on veel ootel.

<!-- SELQIRO_PHOTO_PICKER_PREPARED_20261107 -->
## 2026-11-07 — otsene foto valik, täpne piiranguteade ja keeleotsus

- Kasutaja stopperiajad on 17 ja 19 sekundit; varasem 27–31 oli ligikaudne.
  Failide ja võrgu samasus pole kinnitatud. Foto lisamise ja avaliku nähtavuse
  vastuvõtt säilib; tootmise peamine aeglane etapp on veel mõõtmata.
- Üks nähtav foto valimise nupp avab native valija. Sama kehtib järgmise foto
  kohta. Tühi valik ei reset’i toimingut ega päevikut; sobiva faili järel
  kasutatakse olemasolevat kontrollitud reset’i ja uuema kavatsuse kaitset.
  Valimine teeb eelvaate, üleslaadimine vajab eraldi kasutaja toimingut.
- Viie foto järel nähtud üldteade ei olnud galerii piir: koodis on kümme.
  Sama serveri kolme täpse konto piirangu põhjal lisati eraldi teated.
  Kvoote, SQL-i, õigusi, API lepingut, jätkamist ega päringujärjestust ei muudeta.
- Sihitud üks testijooks 58/58 PASS; täielik build PASS 27,72 sekundiga
  sünteetiliste seadetega. Chromiumi 7/7 juhtu läbisid tegeliku vaate ja
  native valijasündmusega; Auth/RPC/Storage olid sünteetilised. Üks klikk/Enter,
  tühi valik, järgmine valik, uuema kavatsuse kaitse, kolm piirangut ja kümne
  foto piir on kaetud. Kaks varasemat keskkonna käivitust ei jõudnud ühegi
  juhtumini; need tõendid säilisid. Uuendaja sihitud 19/19 kontrolli läbisid.
- Keelte read-only audit: V1 eelistus/tõlkemehhanism on olemas, V2 sisaldab
  eestikeelseid püsisõnesid. Kinnitatud English põhikeel ja Eesti teine keel
  dokumenteeriti; terviklik V2 keelekatvus jääb järgmise keeleetapi tööks.
- Uuendatud autoriteetne CURRENT_STATE, sellest genereeritav üleandmine,
  HOSTED_PORTAL, moodulileping, AI_MEMORY, handbook ja known issues. Lisatud
  kitsas vastuvõtu/paranduse märge ja kasutajaliidese keele leping.
- Uus source-only tarne kontrollib ainult vahetult eelnevat edukat raportit,
  mille commit/vanem/täpsed lähtepuud kontrollitakse sõltumatult. SQL-i,
  Supabase CLI-d ega Storage’i ei käivitata; vanad pakid ja päeviku baidid
  säilivad. Uue paketi Maci commit/Ready ja kasutuskatse jäävad ootele.

<!-- SELQIRO_PHOTO_SPEED_PREPARED_20261106 -->
## 2026-11-06 — ühine fotode ettevalmistus ja piiratud etapiajad

- Kasutaja lisas ühe foto edukalt ning hindas kuluks umbes 29 sekundit,
  võimaliku vahemikuga 27–31 sekundit. Stopperit ei kasutatud. See esialgne
  koguaeg ei määra veel aeglast serverietappi.
- Suurte JPEG/PNG/WebP-fotode üks ühine brauseriretsept: pikem serv kuni
  2048 px, WebP 0,9, üks orientatsioonipööre, alfa säilib, suurendamist ei ole.
  Väikseid kuni 2048 px / 512 KiB faile ei kodeerita uuesti; ebasoodne või
  puuduv kodeering jätab algsed baidid. Serveri pildikontroll säilib.
- Sama helper teenindab loomist ja hilisemat lisamist. Olemasoleva
  sõnumifoto päiselugeja/dekodeerija neutraalne osa on shared/media moodulis;
  sõnumi API, piirid ja veakäitumine säilivad õhukeste ümbristega.
- Jätkamiskirje valikuline versioonitud preparation seob algse faili ja
  tegelikult saadetavad baidid. Vana kirje jätkab toorfailiga. Koodeki muutus
  peatab täpsete baitide taastamise, mitte ei saada teist faili sama kavatsuse
  alla. Kadunud PUT-vastus kontrollib sama katset ühe saatmisega.
- Mõõtmised on brauseri piiratud performance.measure ja serveri fikseeritud
  Server-Timing. Failinimesid, sisu, tokeneid ega URL-e ei logita; uut
  telemeetriateenust, andmebaasitabelit või tehnilist paneeli ei ole.
- Kliendi 121 ettevalmistuse/loomise/lisamise testi, 11 sõnumiregressiooni,
  serveri 163 sihitud testi ja viis mõõtmise testi läbisid. TypeScript puhas.
  Täielik build läbis 28,84 sekundiga sünteetiliste keskkonnaseadetega.
- Viis päris Chromiumi muutmisvaate juhtu 1440/390 px läbisid tegeliku
  brauserikodeerija ja native serverisanitizeriga. Transport oli sünteetiline.
  Kaetud suur JPEG, pöördega JPEG, alfa PNG, väike WebP ning kadunud PUT-i
  taastumine pärast lehe laadimist ilma teise saatmiseta. Vanad fotod ja
  põhipilt säilisid; samal lehel säilis salvestamata tekst.
- Kohalik 7141825 B JPEG vähenes 993462 B-ni (86,1%), alfa PNG 12713958 B-st
  843810 B-ni (93,4%). Üksik native teisendusaeg ei näidanud JPEG-i puhul
  kiirenemist (632/668 ms); tõendatud kasu on väiksem võrgu-/SOURCE-maht.
  Tootmise koguaeg ja peamine kitsaskoht jäävad uue deployment'i võrdluseks.
- Uus eraldi source-only paigaldusmall läbis 19 Git/jätkamise kontrolli.
  Olemasolevad kaks raportit leiavad eelkäijad, tegelik puu/vanem/teema ja
  kõik failid kontrollitakse sõltumatult. Lõplik kokkupandud pakett saab oma
  käivitustõendi. SQL-i, Supabase CLI-d ega Storage'i ei käivitata.
- Uuendatud üks CURRENT_STATE ja sellest genereeritud üleandmine,
  HOSTED_PORTAL, jõudlusmärge, moodulileping, handbook ja known issues.
  Väljastatud varasemad pakid ja kogu senise päeviku baidid säilivad.
  Maci build/commit/push, uus Verceli Ready ning päris kiirusekatse on ootel.

<!-- SELQIRO_PHOTO_ADDITION_ACCEPTED_PERFORMANCE_20261106 -->
## 2026-11-06 — foto lisamise kasutuskatse vastu võetud; jõudlus vajab mõõtmist

- Kasutaja kinnitas: „pildi lisamine toimib ja on nähtav ka avalikus vaates”.
  See foto lisamise kasutuskatse on vastu võetud. Varem kinnitatud foto
  eemaldamist, põhipildi muutmist ja koristuspaneeli kadumist ei korrata.
- Kasutaja teatas V2 foto lisamise aeglusest V1-ga võrreldes. Tegelikku ühe
  faili suurust, kogukestust ega serverietappide aegu selles teates ei olnud;
  täpset peamist viivituse põhjust pole veel mõõdetud.
- Olemasoleva lähtekoodi võrdlus: V1 /sell ja /my-page vähendavad foto
  brauseris kuni 1600 px laiuseks JPEG-iks kvaliteediga 0,82 ja kasutavad
  mitme foto korral kuni kolme paralleelset töötlejat. V2 hallatud lisamine
  saadab algse kuni 25 MiB faili, valmistab serveris kuni 2048 px pikema
  servaga WebP-foto ning ootab mitut järjestikust kontrolli ja kinnitust.
- Järgmine soovitus on üks ühine jõudlusparandus: jämedad etappide ajad ja
  failimahud, selle põhjal brauseri ettevalmistus olemasoleva veebiväljundi
  järgi ning ainult tõendatult üleliigsete päringute ühendamine. Pildisisu,
  failinimesid, tokeneid ega allkirjastatud URL-e ei logita. Täpsete baitide,
  identiteedi, õiguste ja sama lisamise taastumise lepingud peavad säilima.
- Uus vastuvõtutäiend on eraldi 1066-failise lähtebaasi töökopias. Muudetud
  on ainult CURRENT_STATE, sellest genereeritud üleandmine, HOSTED_PORTAL,
  known issues ja päevik; lisatud on PHOTO_UPLOAD_PERFORMANCE_20261106.md.
  Kõik varasema päeviku baidid ning väljastatud ZIP/pakk säilivad.
- Uut Maci result.json-i, commit'i ega Verceli Ready-rida ei esitatud. Neid
  ei tuletata nähtavast vastuvõtust. Selle ülevaate käigus rakenduskoodi,
  SQL-i ega pilveteenuseid ei muudetud; build'i, teste ja lõpetatud
  paigaldajat ei korratud. Dokumentide kooskõla ja lähtefailide säilimine
  kontrollitakse eraldi.

<!-- SELQIRO_PUBLISHED_PHOTO_ADDITION_20261106 -->
## 2026-11-06 — ühe foto lisamine avaldatud kuulutusele ette valmistatud

- Kasutaja valis järgmise sammu pärast kuulutuse 201 eemaldatud foto koristuse
  nähtavat vastuvõttu. Lisandub üks foto korraga olemasolevale kuulutusele,
  kuni kümme aktiivset fotot. Senised fotod, URL-id, põhipilt ja pooleliolev
  teksti/hinnavorm säilivad; tühja galerii esimene foto saab põhipildiks.
- Senine ühe pildi privaatne SOURCE→WEB ülekanne eraldati ühiseks abiks ja
  kontrolliti enne uue võime lisamist: 51/51 teekonnajuhtu, build ja kaks
  päris loomiskomponendi brauserijuhtu PASS sünteetilise teenusega.
- Üks kaitstud seostabel seob uue ühe pildikohaga katse algse avaldamisega.
  Galerii jääb listing_images tabelisse. Kviitungi, mahabilansi, töövõtu ja
  koristuse olemasolevaid mehhanisme kasutatakse edasi. Algset avaldamist
  ei avata uuesti ning vana URL-i ei kasutata uue foto jaoks.
- Neli kitsast omaniku RPC-d: ettevalmistus, seis, kinnitatud lisamine ja
  katkestamine. Iga uus muutus kontrollib tegelikku tegutsejat/identiteeti,
  kuulutuse haldamise õigust ja galerii revisjoni. Kadunud vastus taastab sama
  päringu; juba saadetud faili ei saadeta automaatselt teist korda. Kviitung
  jääb loetavaks pärast hilisemat foto või kogu kuulutuse eemaldamist.
- Algsete galeriide ja koristuste vanad vastuseskeemid säilivad SQL-first
  paigalduse ajal. Uue foto eraldi päritolu kasutavad sama galerii, meedialugeja,
  põhipildi muutmine, eemaldamine ja kitsas ühe objekti koristus.
- Sihitud kliendi/galerii/avaldamise jooks 218/218 PASS; hilisem handleri,
  lisamissessiooni, mahupiiri transpordi ja lõpetamise jooks 194/194 PASS.
  Jooksud osaliselt kattuvad. Seotud koristustranspordi 73/73 ning lõppkviitungi
  neli loendurijuhtu läbisid; range päritolu regressioon on lõplikus jooksus.
- Lõplik täielik build PASS 20,95 s. Päris muutmisvaate kuus brauserijuhtu
  1440/390 px PASS: lisamine, uus põhipilt, kadunud vastuse taastumine ilma
  teise PUT-ita, tühja galerii esimene foto, kümne foto piir ja selge ajutise
  mahupiiri teade/katkestamine. Salvestamata pealkiri säilis ja sama identiteedi
  muutumissündmuse järel sai lisamist uuesti kasutada. Teenus oli sünteetiline.
- SQL-i 17/17 sihitud juhtu PASS külmutatud lähte ja fixture'iga: päris seniste
  SQL-RPC-de SOURCE/WEB-valmidus, kinnitamine, algne avaldamine, lisamine,
  äriliikme õigused, vanade URL-ide säilimine, eemaldamine, kviitungi kordus,
  tühistamine ja emakuulutuse eemaldamine. PostgreSQL 17.5/PGlite 0.3.14;
  teenuse metaandmed sünteetilised, päris võrguteenus/lukugraafik kinnitamata.
- SQL-i paigalduse 10/10 kontrolli PASS; 101 päritud funktsiooni õigused
  võrreldi säilitatud release’i ja paranduste kronoloogiaga. Tootmise tegelik
  kataloog kontrollitakse enne rakendamist, seda siin ei loetud.
- Uue uuendaja 12/12 sihitud kontrolli PASS kohaliku ajutise Gitiga. Eelmise
  paranduse päevik on ainult commit'i leidmise alus; kontrollitakse ka täpset
  Giti vanemat, puud, kõiki 1021 lähtefaili, tööpuud/indexit ja remote'i.
  SQL-i teadmata vastus ei põhjusta automaatset uuesti rakendamist.
- Uuendatud üks CURRENT_STATE, sellest genereeritud üleandmine, HOSTED_PORTAL,
  moodulileping, handbook ja known issues. Varem väljastatud paketid ning kogu
  varasem arenduspäevik säilivad. Selle sammu Mac/SQL/commit/push/Vercel ja päris
  foto lisamise kasutuskatse on pärast uue paketi käivitamist ootel.
- Automaatne lõpetamine ilma omaniku leheta, katkestatud/ebaõnnestunud failide
  lõppkoristus ja tehniliste paneelide eemaldamine tavavaatelt on endiselt
  avaliku avamise eelne töö. Käesolev lisamine ei väida neid lõpetatuks.

<!-- SELQIRO_CLEANUP_READBACK_ACCEPTED_20261106 -->
## 2026-11-06 — eemaldatud foto koristuse nähtav kasutuskatse vastu võetud

- Kasutaja teatas: „nüüd peaks olema korras, koristuspaneel kadus”. Kahel
  kuvatõmmisel on kuulutuse 201 sama muutmisvaade: varem üks ootel fail,
  hiljem paneel kadunud; Mercedes põhipildina ja BMW teise fotona säilivad.
- Kasutuskatse on vastu võetud. Selle kinnitusega ei kaasnenud uut täpset
  commit’i/Ready-rida ega SQL-lõppseisu; serveri nulli, deleted-kviitungit või
  4 MiB reservivabastust ei esitata eraldi mõõdetud faktina.
- Ettevalmistatud eraldi kuue dokumendi vastuvõtutäiend: CURRENT_STATE,
  sellest genereeritud99, HOSTED_PORTAL, diagnoosi ajalugu, teadaolevad
  probleemid ning see päevik. Maci/Giti dokumente selle sammuga ei muudeta.
- Väljastatud paranduse ZIP ja kõik rakenduse, SQL-i ning katsete failid
  säilivad. Varasemaid builde, kasutuskatseid, paigaldajat ega diagnostikat
  dokumenteerimise tõttu ei korrata; kontroll piirdub dokumentide vastavusega.
- Järgmine soovitus on foto lisamine olemasolevale avaldatud kuulutusele sama
  pilditöötluse ja avaldamise raja kaudu. Selle funktsiooni teostust siin ei alustata.
- Enne avalikku avamist jäävad vajalikuks avatud omanikuvaatest sõltumatu
  koristus ja tehniliste koristusnuppude/loendurite eemaldamine tavavaatelt.

<!-- SELQIRO_CLEANUP_FRESH_READBACK_20261106 -->
## 2026-11-06 — päris raporti põhjal koristuse kontrollpäringu väike parandus

- Saadud ja kontrollitud 18:30 lugemisraport: main/b482c02c675c9d6a5a575ece7edc806151df918e,
  kogu index 1019 ja 14 valitud faili stabiilsed. See ei ole uus täielik tööpuu
  inventuur. SQL read_only, võimekuseräsi ja 12 õiguserida sobivad.
- Kuulutus 201: kaks aktiivset fotot/üks põhipilt, SOURCE 0; üks eemaldatud WEB
  retry_wait/try2/last_error=response. Objekti/upload’i/osade kõik loendurid0,
  täpne lõpetatud kontrollitud sessioon sobib; deleted-kinnitus on puudu.
- Piiritletud viga: aktsepteeritud DELETE järel tagastas kontroll-GET veel sisu.
  Vahemälu on ametliku teenuselepinguga toetatud seletus; HTTP-päiseid ei kogutud.
  Varem oletatud alles olev multipart-osa ei vasta tegelikule raportile.
- Ainult cleanupOne.ts tootekoodile lisatud värske juhuslik cacheNonce pärast
  aktsepteeritud DELETE-i. Lease’i töövõtit URL-i ei panda. Sama ühe objekti,
  autentitud bounded read’i ja scoped SQL puudumistõendi leping säilib.
- SQL-i 6 piiratud kordust PASS: olemasolev recorder lõpetas juba puuduva
  objekti 1→0 ja vabastas 4 MiB; vana võti ning taastunud metaandmed keeldusid.
  Sünteetiline PGlite/PostgreSQL 17.5, mitte live teenusetulemus.
- Rakenduse build PASS 28,87 s; 122/122 sihitud Node-katset ning 2/2 brauserijuhtu
  päris omanikuvaate ja parandatud töötajaga (1440/390 px) läbisid sünteetilise
  teenusega. Paneel kadus serveri nulli järel; fotod/põhipilt/tekst säilisid.
  Uuendaja 6/6 tarnekatset läbisid päris ajutise Gitiga ja asendatud build’iga.
- Eraldi uus ainult rakenduskoodi puudutav uuendaja kasutab kinnitatud b482c02 baasi ja kogu
  lähte/indexi/remote’i kontrolli, varundust, build’i ning üht commit/push’i.
  SQL-i/Storage’i paigaldaja ei kutsu. Varasemad väljastatud pakid säilivad.
- Uuendatud CURRENT_STATE, genereeritud99, HOSTED_PORTAL, diagnoos, kaks
  moodulilepingut ja teadaolev tõrge. Uue paranduse Mac/deployment/live vastuvõtt
  on ootel; tehnilise paneeli avaliku avamise eel eemaldamise nõue säilib.

<!-- SELQIRO_RETIRED_WEB_DIAGNOSTIC_20261106 -->
## 2026-11-06 — Productionis peatunud eemaldatud foto koristuse diagnoos

- Uus kasutajatõend: b482c02 / main / Ready 46 s / Production; kuulutusel 201 jääb WEB-koristus korduvate vajutuste järel ühele. Kaks aktiivset fotot ja Mercedese põhipilt säilivad.
- Kinnitatud koodipiir: claim/record tõrge võib muutuda vaikseks pending-vastuseks. Sünteetilise alles oleva multipart-osa korral kordus pending1/try_count0; live põhjus on kinnitamata.
- Ette valmistatud üks ainult lugemise kontrollpakk kuulutusele 201, senise pinned CLI ja kinnitatud teenusega. Ühtki claim'i/record'it/Storage'i toimingut ei käivitata.
- Kaks uut SQL-diagnostikajuhtu ja kolm runtime'i veajuhukordust läbisid; vanu laiu kontrolle ega build'i ei korratud. Uue kontrollpaki failide/raporti katsed on eraldi tõendis.
- Uuendatud üks CURRENT_STATE, sellest genereeritud99 ning HOSTED_PORTAL. Tootmise algpõhjus, täis-HEAD, päris Storage'i puudumine ja reservi vabastamine jäävad järgmise lugemisraporti ootele.
- Runtime ja SQL-parandused ning varasemad väljastatud pakid jäid muutmata. Käesolevad uued dokumendid on ettevalmistatud koopias; Maci rakendus/commit puudub.

<!-- SELQIRO_RETIRED_WEB_CLEANUP_20261106 -->
## 2026-11-06 — Varem eemaldatud WEB-foto lõppkoristus ette valmistatud

- Lisatud üks kitsas hosted-koristuse tee juba kinnitatud
  published_image_removed objektile. Senine päevik, lease, kordusreeglid,
  transport ja loogiline arvestus säilivad. Uusi tabeleid/rolle/järjekordi pole.
- Kolm kitsast RPC-d, kaks privaatset helperit ning üks lisaharu senises
  puudumistõendis. Aktiivset fotot ei valita; õigust kontrollitakse senise
  actor-wrapperi ja galeriilepinguga. SQL ei kustuta Storage'i ridu.
- SOURCE claim on esimene; ainult literal null lubab eemaldatud WEB-i claim'i.
  Üks päring töötleb kuni ühe objekti. 4 MiB reserv vabaneb alles täpse
  lõpetatud sessiooni ja teenuseobjekti/upload'i/osade puudumise järel.
  Tundmatu vastus ei vabasta mahtu; hilisem kogu kuulutuse eemaldamine või
  kõrvaline SOURCE-diagnostika ei taasta juba vabastatud WEB-reservi.
- Vana owner-status ja SOURCE-kviitung säilivad. Eraldi autenditud diagnostika
  loeb samast päevikust; selle tõrge ei blokeeri põhitoimetajat. Lehe avamine,
  fookus ja värskendus ei käivita koristust. Testipaneeli nupp on
  „Korista järgmine fail”, sama omaniku toimingulukuga.
- 91/91 sihitud Node-katset PASS: säiliv SOURCE 31, uus töötaja/seis 45 ja
  autenditud lugemistee 15. HTTP on sünteetiline. SQL-i 22 käitumise ja 14
  paigalduse kontrollrühma PASS PostgreSQL 17.5/PGlite 0.3.14 WASM-is.
  Native paralleelseansse ega päris Storage'it ei kasutatud.
- Lõpliku runtime'i build PASS29,33 s. Pärast build'i 11/11 brauserijuhtumit
  PASS tegelike komponentide/hookide/kliendiga,1440/390 px. Olemasoleva 201
  kahe foto ja ühe eemaldatud foto seis läks 1 → 0/0; galerii/põhipilt ning
  salvestamata sisestus säilisid. Lisaks teadmata/vigased/hilised lugemid,
  SOURCE/WEB koosolu ja hilisem kuulutuse eemaldamine.0 leheviga/välispäringut/
  ootamatut toimingut. Teenusevastused on sünteetilised.
- Neli tarne liidesekatset PASS ja kokkupandud tarnekatse PASS, 4,604 s:
  995-failine väljastatud baas, 38 payloadi, 981 guardi, üks täpne commit ja
  tavaline kohalik push. SQL/build selles katses sünteetilised; kordus oli
  ainult lugemine. Lõplikud allikad/manifest kontrollitakse pakendamisel.
- Sõltumatu ülevaatus leidis kaks täpsustust: status-reservi täpne 4 MiB leping
  ning SOURCE-esimese nupu üldisem sõnastus. Need on lõplikus koodis sees.
  SQL-i esimene lugemisõiguse tõrge lahendati olemasoleva wrapperiga õigusi
  laiendamata; algne katse süntaks ning brauseri binaari/fondide lahtipakkimise
  tõrked säilivad katsete ajaloos. Rakenduse uus build polnud tööriistaparanduse
  tõttu vajalik; lõplikud runtime-räsid säilisid.
- Uuendatud CURRENT_STATE, sellest genereeritud üleandmine, HOSTED_PORTAL,
  moodulilepingud, feature README, engineering handbook ja teadaolevad piirid.
  05.11 vastuvõtu viis Maci rakendamata dokumenti on uues deltas, old-räsid
  võetakse muutmata 04.11 fotoeemalduse tarnest. Vanad pakid/päevikud säilivad.
- Uus paigaldaja kinnitab SQL-toe enne lähtefaile/build'i/commit-push'i;
  paigaldaja ise päris faili ei korista. Selle ettevalmistusega ei muudetud
  Maci, pilveandmebaasi, GitHubi ega Vercelit. Järgmine kitsas tee on uus
  uuendaja → sama commit Ready/Production → olemasoleva 201 üks koristussamm.
- Avaliku avamise eel jääb nõue: koristus peab lõppema nupuvajutuse/avatud
  omanikuvaateta, tehnilised loendurid/nupud kaovad tavavaatelt. Püsivat
  ajastajat see samm ei lisa; testimiseks võib diagnostika nähtav olla.

<!-- SELQIRO_PUBLISHED_PHOTO_REMOVAL_ACCEPTED_20261105 -->
## 2026-11-05 — Fotoeemaldus ja järgnev põhipilt veebis vastu võetud

- Kasutaja kinnitas, et kustutamine ja uue põhipildi määramine toimivad.
  Seitsmel kuvatõmmisel on eemaldamise kinnitus, kuulutuse 201 galerii 3 → 2,
  edukas teade, Mercedes uue põhipildina ja sama pilt otsingukaardil.
- Esimene terminaliviga oli Python [Errno 2]: ZIP polnud lahti pakitud ning
  uuenda.py ei leitud. Uuendaja ega SQL ei alanud. Järgnev jooks lõppes
  VALMIS-teatega; uut parandust või korduskäiku ei ole vaja.
- Fotoeemalduse täiscommit on 69ca43454857d3f742aea35faa57cfecf57b7cf1.
  Terminal kinnitab andmebaasitoe, build’i ja commit/push’i; Verceli pildil
  69ca434 / main / Ready 45s / sinine Production.
- Uus terminalipilt lisab ka algfotokoristuse varem puudunud täiscommit’i:
  203021cec14d103d4c2cd38230d33979e2baa02a; Vercelis 203021c / main /
  Ready 46s / Production. Eelmise päeva funktsionaalne vastuvõtt säilib.
- Tõend on kasutaja terminali/juhtpaneeli/veebivaadete põhine. Täit raportit,
  Maci indexit/tööpuud, DB-kataloogiräsi ja deployment-ID-d ei loetud.
  Pilte ei loeta füüsilise WEB-kustutuse ega mahu vabanemise tõendiks.
- Järgmine väike samm on eemaldatud WEB-foto lõppkoristus olemasoleva
  päeviku ja ühe objekti transpordiga. Reserv vabaneb alles tõendatud
  puudumisel. See vastuvõtt ei käivita päris kustutust.
- Uuendati uues üleandmiskoopias viis dokumenti: CURRENT_STATE, sellest
  genereeritud üleandmine, HOSTED_PORTAL, mooduli arhitektuur ja päevik.
  Neid pole eraldi Maci/Giti rakendatud. Vana paigaldaja ja väljastatud
  üleandmine säilivad muutmata; järgmise delta old-räsid tulevad vanast tarnest.
- Runtime, SQL, testid ja paigaldaja on muutmata. Uut build’i, katseid või
  teenuseühendusi ei korratud; kontrolliti dokumentide ulatust, genereerimist
  ning pakendi terviklust. Brauseripilte uude pakki ei lisatud.

<!-- SELQIRO_PUBLISHED_PHOTO_REMOVAL_20261104 -->
## 2026-11-04 — Ühe avaldatud lisafoto eemaldamine

- Ettevalmistatud üks väike fotode muutmise samm: omanik saab konkreetse
  kinnitusega eemaldada mittepõhipildi, kui vähemalt üks foto jääb alles ja
  valitud algfaili koristus on tõendatud. Praegune UI ootab SOURCE-loenduri nulli.
- Sama aktiivsete pildiridade tabel, esitusrevision ja cleanup-päevik jäävad
  kasutusse. Uut tabelit/järjekorda/rolli/mahubilanssi ei looda. Algsete fotode
  URL-id ja kviitungid säilivad; eemaldatud foto mõlemad veebiaadressid sulguvad.
- Üks uus authenticated-only RPC, neli piiratud funktsiooniasendust ja üks
  cleanup-põhjuse lisamine. WEB jääb privaatselt järjekorda ja reservi;
  Storage’i kustutust, valmisolekut või mahu vabastamist ei teeselda.
- Klient seob kinnituse identiteedi/kuulutuse/katse/revisioni/fotoga, kasutab
  senist omaniku toimingulukku ja nõuab värsket serveri lugemit. Ebaselget
  kirjutust ei korrata. Tekstitoimetaja ja salvestamata sisestus säilivad.
- Sõltumatu ülevaatus leidis ja parandas liigse seose: üldine omanikuvaate
  lugem ei tohi sõltuda täiesti korras galeriist. Vigase galeriirea korral
  keelatakse foto muutmine, kuid kuulutuse tekstihaldus ja kogu kuulutuse
  autoriseeritud eemaldamine jäävad võimalikuks. Selle kohta lisati SQL-katse.
- 225/225 sihitud kliendi/mudeli/HTTP/järjestuse katset PASS; lõpliku SQL-i
  20/20 käitumise ja 14/14 paigalduse kontrollrühma PASS (PGlite/PostgreSQL17.5
  WASM, sünteetilised andmed). Lõplik runtime’i build PASS 18,94 s.
- 12/12 brauserijuhtu PASS tegeliku omanikuvaate ja hookidega, 1440/390 px.
  HTTP-vastused olid sünteetilised; 0 leheviga, välispäringut või ootamatut
  toimingut. Esialgse Chromiumi protsessieluea tõrge lahendati ainult katses.
- Uue SQL-raporti parserisidumine ning neli uue tarne liidesekatset PASS.
  Git/index/kohalik remote olid ajutised päris tööriistad; SQL/build seal
  sünteetilised. Varasemate testide tõendid säilivad kuupäevaga, mitte uue
  sammu tootmistõendina. Detailid on üleandmise kontrollikataloogis.
- Kokkupandud tarnekatse PASS 6,737 s: täpne 34 faili delta ja 961 guardi,
  üks commit/kohalik push; kordus ainult luges SQL-kinnitust. Katseraami vana
  raportitee parandati, paigaldaja jäi muutmata. Lõpliku pakendi räsid ja
  allikate vastavus kontrolliti eraldi enne väljastamist.
- Lähtebaasiks on eelmise SOURCE-tarne 978 kontrollitud faili. Viis eraldi
  Maci rakendamata vastuvõtudokumenti kaasatakse uude deltasse. Tegelik HEAD,
  kogu index/tööpuu, lähtefailid ja remote loetakse uuendamisel värskelt;
  R3 räsi on ainult esivanema kontroll. Vanad väljastatud pakid säilivad.
- Uuendatud seisukirje, sellest genereeritud üleandmine, HOSTED_PORTAL,
  mooduli arhitektuur, feature README, engineering handbook ja teadaolevad
  avaliku avamise piirid. Testimiseks jääb koristuspaneel nähtavaks.
- Maci, pilveandmebaasi, GitHubi ega Vercelit selles ettevalmistuses ei
  muudetud; päris kasutaja fotot ei eemaldatud. Järgneb üks uus uuenduskäsk,
  selle commit’i Ready ning üks kitsas testkuulutuse kasutuskatse.

<!-- SELQIRO_HOSTED_SOURCE_WEB_ACCEPTED_20261104 -->
## 2026-11-04 — Algfotokoristuse veebikatse ja avaliku UI otsus

- Kasutaja piltidel väheneb kuulutuse 201 ootel arv 3 → 2 → 1, seejärel
  plokk kaob. Kolm fotot/põhipilt säilivad. Uuel ühe fotoga kuulutusel 202
  plokki pole. Otsingus on piltidega kaardid sisse logitud vaates.
- Nähtav kasutustee on vastu võetud. Uut commit'i, Maci raportit, Verceli
  deployment'i identiteeti, SQL-fingerprinti või mahuloendurit piltidel pole.
  Vanemat R3 räsi ei kanta uue tarne tõendiks.
- Kasutaja otsus: testimisel võib koristus nähtav olla; avalikus portaalis
  peab see olema töökindel taustatöö. Koristusnupp/loendur ja tehnilised
  lõpukinnitused eemaldatakse enne avamist. Kasutaja näeb tegelikku kuulutuse
  olekut ning talle olulist probleemi. Senine sisemine päevik säilib.
- Ainult paneeli peitmine ei täida nõuet: automaatne lõpuni viimine ei tohi
  sõltuda kasutaja nupuvajutusest ega avatud lehest. Praegu UI-d ei muudeta.
- Uuendati viis dokumenti uues üleandmiskoopias: CURRENT_STATE, genereeritud
  lühileht, HOSTED_PORTAL, olemasolev arhitektuurileping ja see päevik.
  Runtime/SQL/testid/paigaldaja säilivad; teste ega build'i ei korratud.
  Dokumente pole eraldi Maci või Giti rakendatud. Eraldi terminalikäsku ei anta.
- Järgmine koodisamm kasutab värskelt loetud tegelikku Git-baasi. Vanad
  väljastatud pakid ja päevikud säilivad; uut kirjutust tootmises ei tehtud.

<!-- SELQIRO_HOSTED_COMPLETED_SOURCE_20261104 -->
## 2026-11-04 — Ühe avaldatud algfoto koristus ja selgem vastutuspiir

- Kasutaja jätkamiskorraldus ja küsimus liigse keerukuse kohta viisid ühe
  konkreetse lihtsustuseni: Supabase'i hallatud teenuselt ei nõuta kättesaamatut
  kohaliku protsessi/privaatse ketta tõendit. Selqiro kinnitab täpse teenuseobjekti
  loogilise eemaldamise; peidetud ajutiste failide elutsükkel kuulub teenusele.
- Lisatud üks väike hosted SOURCE-adapter; olemasolev ühe objekti transport,
  cleanup-päevik, mahuarvestus ja omanikuvaade jäävad kasutusse. Runtime muutub
  kolmes failis; UI ja rakenduse sõltuvused jäävad samaks.
- Lisav SQL annab kaks kitsast service_role-only RPC-d ja privaatse tõendi.
  Üldised koristus-RPC-d ning readiness'i held-piir säilivad. Esimene kustutuse
  kinnitus nõuab lõpetatud/kontrollitud sessiooni ja autoriteetset puudumist;
  hilisem kuulutuse eemaldamine või diagnostika ei lae vabanenud SOURCE-i tagasi.
- 31/31 sihitud Node-katset, 19/19 SQL-käitumise ja 14/14 SQL-paigalduse rühma,
  tootmisbuild (exit 0, 31,49 s), neli brauserijuhtu 1440/390 px ning 14 erinevat
  paigaldaja-liidese katset on läbinud. SQL-keskkond oli PostgreSQL17.5/WASM,
  teenuseandmed sünteetilised; native paralleelseansse ega päris pilve ei katsetatud.
  Täpsed piirid ja eraldi tarne sidumine on üleandmise kontrollifailides.
- Lõplike SQL-raportite parseri sidumine ja üks tegeliku R3 baasiga kokkupandud
  ajutise paki katse läbisid; korduskäik ei korranud SQL-i ega build’i. Git ja
  kohalik remote olid päris, SQL-transport ja build selles tarnekatses sünteetilised.
- Uus uuenduspakk seotakse tegeliku vastu võetud R3 958 faili baasiga, mitte
  hilisema veel Maci rakendamata dokumentatsioonikoopiaga. Varasemad R3 ja
  vastuvõtu ZIP-id säilivad muutmata. Maci/SQL/commit/push/Ready/päris koristuse
  uus tulemus on endiselt ees; selle kohta ettevalmistus tõendit ei anna.
- SOURCE 25 MiB vabastamine jätab WEB-i 4 MiB arvesse. See on loogiline reserv,
  mitte lubadus teenusepakkuja ketta või arve hetkeseisu kohta. Pooleliolevad
  upload'id, WEB-koristus, fotode koosseisu muutmine ja scheduler jäävad eraldi.
- CURRENT_STATE, genereeritud üleandmine ja HOSTED_PORTAL on uuendatud.
  Püsiv otsus: docs/architecture/hosted-completed-source-cleanup-v1.md.
  Engineering handbook sai lühikese keerukuse piiramise reegli; ajaloolist
  AI_MEMORY olekukirjete massi ei kasvatatud uue dubleeriva seisukirjega.

<!-- SELQIRO_IDENTITY_ORDER_ACCEPTED_20261104 -->
## 2026-11-04 — R3 Production ja kasutajavastuvõtt kinnitatud

- Kasutaja terminalipilt: R3 kuulutusevormi/põhipildi parandus, build, commit ja
  push lõpetatud; commit `8be94cdff322bc051cd54f5143cd3ea12312493e`.
- Verceli kasutajapildil on sama `8be94cd`, `main`, `Ready`, sinine `Production`
  ja kestus 46 s. Täpset juurutamisaega suhtelisest „20h ago” tekstist ei tuletata.
- Kasutaja kinnitus „testides on nüüd korras” sulgeb selle paranduse vastuvõtu.
  Terminalis varem nähtud R1/R2 peatused ei ole enam praegune takistus.
- CURRENT_STATE, sellest genereeritud üleandmine, HOSTED_PORTAL ja paranduse
  detaildokument on uues üleandmiskoopia lähtepuus ajakohastatud. Eraldi Maci
  kirjutust, dokumentatsiooni-only commit’i/push’i ega deployment’i ei tehtud.
- Olemasoleva koodi lugemine kinnitas: hosted settle on teadlikult held-režiimis;
  üldine objektikoristaja, piiratud claim/retry päevik ja objektipõhine reserv
  on olemas. Järgmine kitsas töö on avaldatud katse SOURCE-algfoto hosted
  lõpetamistõend ja koristus, aktiivset WEB-i säilitades. Täpne piir:
  `docs/continuity/LISTING_PHOTO_LIFECYCLE_NEXT_20261104.md`.
- 25 MiB SOURCE ja 4 MiB WEB arvestatakse eraldi. SOURCE tulevane tõendatud
  lõppkoristus saab vabastada oma reservi; aktiivne WEB jääb arvesse. Praegune
  held-rada seda ei tee. Selles sammus ei kustutatud faile ega muudetud SQL-i.
- Varasemad rakenduse, brauseri, build’i, paigaldaja ja SQL-kontrollid säilivad
  ajalooliste tõenditena; neid ei korratud. Uut tulemusraportit ei küsitud.

<!-- SELQIRO_IDENTITY_ORDER_R3_OBSERVED_BASE_20261103 -->
## 2026-11-03 — R3 seotakse täielikult mõõdetud 950 faili baasiga

Kasutaja koondraport 14:50:55 Europe/Tallinn on vastu võetud: puhas main / HEAD 04d7081ce51c6da106f726b21dfbfc21e4576f2e, kõik 950 HEAD/index-faili kaetud, enne/pärast muutumatu, kõrvalisi Giti muudatusi ja lugemata faile pole. Kõik 22 kavandatud payloadi baasid sobivad. Erinevused olid 15 puuduvas arhiivifailis ja ühe ajaloodokumendi hilisemas arhiiviplokis; tegelik dokument jääb muutmata. Rakenduskoodis lahknevust pole.

R3 lähtekoopia taastati tegelikust 950 faili baasist; sama paranduse 8 uut faili annavad 958 faili. Paigaldaja Python-kood ning rakenduskood/testid jäid samaks. Manifest seob kõik 936 tegelikku kõrvalfaili ning 14 olemasolevat payloadi baasi ja 8 uut puuduvat rada. HOSTED_PORTAL valikuline puudumine eemaldati. Vanad puuduolevad arhiivifailid jäävad üleandmises ajalooks, neid Maci ei lisata. Väljastatud r1/r2 ja nende päevikud säilivad. Appi/buildi/SQL-i korduskatseid ei tehtud; r3 vajalikud manifesti- ja täpse baasiga paigalduskontrollid on eraldi tõend. Järgmine käsk on CURRENT_STATE-is; Maci rakendamine/commit/push/Ready on veel ees.

<!-- SELQIRO_IDENTITY_ORDER_R2_20261103 -->
## 2026-11-03 — R2 parandab paigalduspaki dokumentide lähte-eeldust

R1 peatus kasutaja Macis kell 13:25 alustatud käigus enne projektikirjutusi: auditidokument INBOX_V1_REVIEW_20261029.md puudus. Raport kinnitab sihi ~/selqiro ja HEAD-i 04d7081ce51c6da106f726b21dfbfc21e4576f2e; build/push ei käivitunud ja uut commit'i pole. Varasema põhipildi parandaja VALMIS-käik sama commit'iga on terminalipildilt vastu võetud.

Eraldi r2 hoiab rakenduskoodi ja paigaldaja täitmisloogika samana. 67 seni tõendamata muutmata Markdown-ajaloodokumenti ei ole enam selle kliendiparanduse olemasolutingimus; kõik ülejäänud 884 täpset lähtekontrolli, kogu tegeliku indexi kaitse ja 22 muudetava faili kontrollid säilivad. HOSTED_PORTAL.md võib tuntud baasi kõrval ka täiesti puududa; sel juhul luuakse juba kavandatud dokument, tundmatut olemasolevat sisu ei kirjutata üle. Vana pakk/päevik ja kasutaja muudatused säilivad. R2 kontrollide täpne piir on LISTING_IDENTITY_ORDER_20261103.md-s; järgmine käsk on CURRENT_STATE-is.

<!-- SELQIRO_LISTING_IDENTITY_ORDER_20261103 -->
## 2026-11-03 — Põhipildi järjekord ja identiteedipõhine kuulutusevorm

Taastatud 01.11 üleandmispakk ning 02.11 kasutaja põhipildi valiku vastuvõtt. Katkenud uus kandidaat polnud kättesaadav; koostatud uus kliendiparandus: valitud foto esimeseks, iga identiteedi avatud vorm eraldi, hobuse mustandi ID/versiooni säilitamine ning lõpetatud avaldamisest selge järgmise kuulutuse alustamine. Hilised vastused ja teise identiteedi sisestus on eraldatud.

119 seotud Node-kontrolli, 4 põhipildi kontrolli, 20 uue paigaldaja kontrolli, sihitud brauserikatsed ning praeguse lähtekoodi build läbisid assistendi eraldatud keskkonnas. Maci/commit/push/Ready ja päris kasutustee uuele parandusele veel puuduvad. Uus paigaldaja on ainult kliendilähtekoodile; andmebaasi ja Storage'it ei muudeta. Täpne tõend ja taastamise piir: `docs/continuity/LISTING_IDENTITY_ORDER_20261103.md`; üks järgmine samm on CURRENT_STATE-is.

<!-- SELQIRO_LISTING_PRIMARY_IMAGE_REPAIR_20261101 -->
## 2026-11-01 — Tegelik eelduste peatus ja kontrollaluse parandus

- Kasutaja `result(1).json` tõendab vana manifesti `55d3e168491cf62bf584fdac8f57a9704d308b901d8569e9d4656a0917864814` peatumist `baseline_verified` etapis teatega `DATABASE_PRECONDITIONS_NOT_MATCHED`. 01.11 12:13:23 UTC alanud käigus kontrollitud baas oli `b0a04fccbf354f0480a4b6eb8dd176b3c55383a8`.
- Ainult lugemiseks tehtud preflight-käsk lõppes exit 0-ga. Ebaõnnestusid täpselt `functions` ja `final_writer_policies`; DB kirjutamist/build'i/commit'i/push'i ei alustatud. Tõend säilib üleandmises `kontrollid/actual-preflight-stop-20261101.json`.
- Leiti kaks meie fixture'i viga: tegelike identiteedipõhiste poliitikate asemel `USING(true)` näidised ja `final_receipt` varasem 20-core määratlus hilisema 30-multipart asemel. Parandatud sõltuvusräsi kattub täpselt tegeliku raportiga. Parandatud PGlite 18 kontrollalusel läbisid 26 runtime- ja 19 paigalduskaitse katset: vana preflight taastoodab tegeliku kahe kaitse peatuse; uus võtab õige aluse vastu ning tõrjub vananenud receipt'i, piiranguteta poliitikad ja laiendatud rollid. Native PG17/paralleelseansside/live-rakendamise tulemust ei väideta.
- 843 muud lähtefaili, runtime UI, `changes.sql`, capability ning paigaldaja runtime säilivad. Varasemaid 85/78/50 katseid, brauserikäiku, build'i ja linti ei käivitatud uuesti. Vana 23 + 15 SQL-tulemus kirjeldab vigast fixture'i, mitte õige aluskoosseisu sobivust.
- Kaks uut paigaldaja regressioonikatset läbisid 0,592 s: tegelik kahe-kaitse peatus ilma apply-intent'ita ja uus manifest vana peatunud päeviku kõrval; üks rakendamine ning vana päevik bait-baidilt säilinud. Päris ajutine Git/kohalik bare-remote, sünteetilised SQL/build-vastused.
- Uus kandidaat on `selqiro-kuulutused-pohipilt-parandus-20261101.zip`, eraldi üleandmine säilitab nime `selqiro-uleandmine-20261101.zip`. Paranduse Maci rakendamist, uut commit/push'i ega Verceli Ready tulemust pole nähtud. Vanu päevikuid, pakette, testandmeid ega ajalugu ei kustutatud.
- Järjekord ja vastu võetud sõnumid säilivad. Uus checkpoint: `docs/continuity/LISTING_PRIMARY_IMAGE_REPAIR_20261101.md`; lühileht tekib `CURRENT_STATE.json` põhjal. Allpool on varasemate hetkede ajalugu.

---

<!-- SELQIRO_LISTING_PRIMARY_IMAGE_20261101 -->
## 2026-11-01 — Olemasoleva põhipildi valik ja merevaigutoon, kohalikult kontrollitud

- Lisatud on olemasoleva hallatud kuulutuspildi põhipildiks valimise mudel, klient, HTTP-tegevused ja omanikuvaate ühendus. Lisav SQL-kandidaat kasutab algset pildikohta ning eraldi esitlusversiooni; URL-e ja avaldamise pildifaile ümber ei nimetata.
- Ranged vastusekontrollid välistavad vale konto/identiteedi/kuulutuse/avaldamiskatse sidumise, arvuks ümardatud bigint-versiooni ning tõendamata salvestused. Teadmata tulemusega kirjutust ei korrata automaatselt.
- Avaliku otsingu ja Minu ala kuulutuste ümbrised kasutavad taas merevaigutooni ning valgeid sisukaarte. Otsingufiltrite, URL-ide ja kerimise lepinguid ei muudetud.
- Koristamise tekstid eristavad avaldatud veebipilte, üleslaaditud algfailide koristamist ja eemaldatud kuulutuse veel lõpetamata failikoristust. See ei kinnita hosted lõppkoristuse ega mahu vabastamise valmimist.
- 85 mudeli/kliendi ja 78 HTTP-piiri sihitud katset läbisid. HTTP-piiril parandati kontrolli käigus puuduvate/lisaväljade liigitus ning UUID lõpureavahetuse vastuvõtmine; juhtumid on kaetud.
- PGlite 18 mittesuperkasutajate 23 runtime- ja 15 paigalduskaitse katset läbisid. Native PG17, samaaegsete eraldi andmebaasiseansside ja päris pilve tulemust ei väideta.
- Paigaldaja 50 kohalikku katset läbisid 13,634 sekundiga: päris Git, kohalik bare-remote, päris timeout/Ctrl-C alamprotsessigrupid ning sünteetilised SQL/build-vastused. Need ei ole Maci ega välise GitHubi/pilve käivitused.
- Lõpliku lähte integreeritud muutmisvaate brauserikontroll läbis 1440/390/320 px juures sünteetilise Authi ja kinni püütud HTTP-ga. Kontrolliti topeltklõpsu ühte kirjutust, ühist hõivatud olekut, sisestuse säilimist, konfliktide/teadmata tulemuse blokeeringut, hiliseid vastuseid ning konto/identiteedi vahetust. A → B → A vahetus ei taasta vana kustutamiskinnitust. Välispäringuid ega lehevigu ei olnud.
- Lõpliku lähte build läbis exit 0 / 19,73 s (`review/run-build.py`, `npm run build -- --webpack`) sünteetiliste Supabase/OpenAI build-väärtustega. Kuue runtime-faili sihitud ESLint läbis hoiatusteta. Esimene katse peatus puuduvate build-väärtuste tõttu lehtede kogumisel; seda ei esitata õnnestunud buildina.
- Maci rakendamist, uut commit/push'i ega Verceli Ready tulemust ei ole nähtud. Vastu võetud sõnumifotode aluseks jääb kasutaja näidatud `b0a04fccbf354f0480a4b6eb8dd176b3c55383a8`; uut commit'i ei oletata.
- Etapi paranduspaki nimi on `selqiro-kuulutused-pohipilt-20261101.zip`; eraldi üleandmine on `selqiro-uleandmine-20261101.zip`. Üleandmine antakse suuremate kontrollitud etappide järel, konteksti vahetamisel ja kasutaja soovil.
- Järgmine töö jääb kuulutuspiltide kogu elutsüklile ja hobuste ühisele kuulutuste voole. Testkirjeid, vanu raporteid ega ajalugu ei kustutatud. Jooksev seis: `docs/continuity/LISTING_PRIMARY_IMAGE_20261101.md` ning `docs/continuity/CURRENT_STATE.json`.

---

<!-- SELQIRO_LISTINGS_DIRECTION_20261101 -->
## 01.11.2026 — Kuulutused koos hobustega; kujundus töö käigus

Kasutaja 01.11 otsus: esimene lõpetatav tervik on kuulutused koos
hobusekuulutustega. Sama lisamiskoht, ühine otsing/detail/profiil/Minu ala ning
vestlus ja kuulutusekaart; hobuse kategooria avab eriväljad ja põhjalikumad
avaldamiskinnitused. Eraldi hobuste portaali ei tehta. See asendab varasema
järjekorra, kus hobused jäid teenuste järel tehtavaks.

Kujundus valmib iga funktsionaalse etapi sees: kuulutuste merevaik, teenuste
türkiis ja tootenäidiste indigo ühtselt otsingus, Minu alas ja profiilil.
Töö täpset varasemat tooni kontrollitud allikast ei kinnitatud. Uudised on
aktiivse identiteedi jälgitavate avalike postituste voog, oma V2 vaates.
V1 voog pärib praegu kuulutusi; üldine avalike postituste voog vajab ühendamist.
Päris logod tuleb lugeda ühisest profiiliallikast: V1/profiil kasutab
identity_profiles.avatar_url, V2 sõnumid/valik praegu identities.avatar_url.

31.10 kasutaja võttis vastu fotode lisamise arvutis ja telefonis, ka Viofo
foto, ning klaviatuuri kohal nähtava kirjutusvälja. Terminali viimane foto
paranduse commit on b0a04fccbf354f0480a4b6eb8dd176b3c55383a8. Sama parandust
uuesti ei paigaldata ega vana ootel staatust tänase tööna ei käsitleta.

Uus tingimuslik luba: vanad testkuulutused ja testsõnumid võib eemaldada, kui
need põhjustavad probleemi; enne teostust määrata konkreetsed kirjed ja seotud
kasutuseta failid. Kontod, identiteedid, logod, teenused, tootenäidised ja
päevikud sellesse loasse ei kuulu. Praegu midagi ei kustutatud. Sama ulatuse
luba uuesti ei küsita. See täpsustus asendab nende testobjektide varasema
üldise kustutamiskeelu, mitte muude objektide kaitset.

Käesolev checkpoint on allikavaatlus ja tööplaan assistendi taastatud
lähtekoopias; uut runtime-parandust, pilvetoimingut ega Maci/GitHubi muudatust
pole tehtud. Täpne audit, järgmine järjekord ja tõendi piir on
`docs/continuity/LISTINGS_DESIGN_NEWS_20261101.md`; jooksev seis on
`docs/continuity/CURRENT_STATE.json`. Allpool on ajaloolised kirjed.

---

<!-- SELQIRO_PHONE_PHOTO_20261031 -->
## 31.10.2026 — Telefoni foto avamise ühilduvus

Kasutaja kinnitab, et telefonis jääb kirjutusväli nüüd klaviatuuri kohal nähtavaks
ning varem liiga suur foto õnnestus arvutis lisada. Need parandused on vastu
võetud. Praegune töö on telefonis valitud Viofo foto avamise tõrge enne üleslaadimist.

Siia saabunud 185 804-baidine JPEG-koopia avaneb; selle põhjal ei oletata telefoni
algfaili vormingut ega EXIF-i. Katses kordus eraldi viga: vana päiselugeja keeldus
loetavatest fotodest vigase või topelt EXIF-i tõttu. Uus kitsas lähtekoodiparandus
talub valikulise lisainfo vigu ning lisab kohaliku pildielemendi varuvariandi,
kui bitmap-dekodeerimine ei toimi. Foto vähendamine ja saatja kontroll säilivad.

Praegune juhis ja tõendi piir on `docs/continuity/MESSAGING_PHONE_PHOTO_20261031.md`;
masinloetav tööjärg on `docs/continuity/CURRENT_STATE.json`. Uus käsk on
`selqiro-foto-telefon-20261031/uuenda.py --publish`. Uue paranduse päris telefoni
tulemus ja Verceli Ready jäävad paigaldusjärgseks. Allpool säilib varasem ajalugu.

---

<!-- SELQIRO_MESSAGES_FOLLOWUP_20261031 -->
## 31.10.2026 — Suurte fotode ja telefoni kirjutusvälja jätkuparandus

Praegune tööjärg on `docs/continuity/CURRENT_STATE.json`; täpne uus juhis on
`docs/continuity/MESSAGING_MOBILE_FOLLOWUP_20261031.md`. Kasutaja kinnitab nüüd fotode saatmist arvutis ja telefonis ning
kuulutusekaardi kaasa minekut. Alles olid üle 5 MB foto keeldumine ja klaviatuuri
taha jääv mitmerealine tekst. Uus lähtekoodikandidaat vähendab suure foto
automaatselt ning korrigeerib vestluse klaviatuuripaigutust.

Lõpliku lähtekoodi build, sihitud kontrollid ja paigaldaja katsed läbisid;
füüsilise telefoni ning uue Verceli deployment'i kinnitus on pärast paigaldamist.
Kasutatakse uut `selqiro-sonumid-parandus-20261031/uuenda.py --publish` käsku.
Varasemaid DB/Storage paigaldajaid ei korrata. Allpool säilib senine ajalugu;
selle vanu staatuseid ei tõlgendata tänase tööjärjena.

---

# Selqiro development log

## 2026-10-30 — Tegeliku DB-eelkontrolli raport ja Supabase’i poliitikaõiguse parandus

- Üles laaditud `result.json` kinnitab jätku 599… baasi `cbd475757690db7bd1faf8784cd43359f45d5be9`, kõiki 75 lähteväärtust ning ainult lugemisega DB-eelkontrolli. Ainus väär guard on `storage_policy_authority`; kuus ülejäänut läbisid. DB/Storage/lähtepaigaldus/build/commit/push ei alanud.
- Omaniku rolli `USAGE` ei ole Supabase’i ainus poliikahalduse tee. Registreeritud Supautils `policy_grants` lubab täpsele rollile täpse tabeli poliitikate haldamist. Parandus kontrollib `pg_settings` registreeritud `sighup`/`string` seadet, rolli ja tabeli OID-d; suvaline custom-GUC ei piisa.
- Piirava Storage’i poliitika tegelik DDL, privaatsuse piirid ja tehinguline järelkontroll säilivad. Rolle, tabeliomanikke ega teenuse konfiguratsiooni ei muudeta.
- PostgreSQL 17/18 dubleeriv NOT NULL kataloogiesitus ühtlustatakse, säilitades veeru not-null nõude ja kontrollides PG18 kinnitamist, jõustamist, pärandumise puudumist ning üks-ühele katvust. Muud piirangud jäävad täpselt pinnituks.
- Eraldi uus jätk säilitab ja lukustab mõlemad vanad päevikud. Enne ühtki pilvekirjutust võrreldakse kõiki 11 varasemat invarianti ja kolme puuduvate objektide sõrmejälge. Vana `unknown` seis ei muutu vaikimisi usaldatud baasiks.
- Sihitud SQLi- ja jätkajatestide täpne tõend on uue paketi `review/verification.json`-is. Rakenduse ja sõltuvuste muutmata baite võrreldakse eelmise kandidaadiga, varasemaid UI/build-kontrolle ei esitata uuesti tehtuna.
- Praegune käsk on `selqiro-sonumid-oigused-20261030/uuenda.py --publish`. Selle Maci lõpp, Verceli Ready ja füüsilise telefoni kasutuskinnitus on ootel. Allolevad parandused on varasem ajalugu.


## 2026-10-30 — Sõnumipaketi lähteviite parandus ja kirjutuseelse peatuse jätk

- Kasutaja terminal kinnitab kaardijätku VALMIS ning commit’i `cbd475757690db7bd1faf8784cd43359f45d5be9` edukat push’i. Vana kaardipakett jääb lõpetatuks.
- Algne sõnumipakett `49bb16da858a518d478846868bd26133fd967c018a9818935e5d0c453baec1a5` peatus `SOURCE_GUARD_CHANGED` juures enne DB-d, Storage’it ja lähtefaile. Üldine veateade ei sisaldanud failinime.
- Tarnitud manifestide võrdlus leidis ühe vea 103 kaitse hulgas: cloud-only kontaktiparanduse `changes.sql` oli assistendi snapshotis, kuid selle `source_delta` ei paigaldunud Git-i. Kõik ülejäänud kaitsed ning 75 payload-faili lähtevariandid sobivad tarnitud ahelaga.
- Kohalik koostaja ja räsi kontroll kasutavad nüüd kaardijätkuga paigaldatud `tests/fixtures/accepted-contact-fix.sql` faili. Mõlema faili SHA on `aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b`; valitud deklaratsioon ja koond-SQL ei muutu. Kaitset ei jäeta vahele.
- Eraldi jätkupakk loeb ja lukustab vana sõnumipäeviku, lubab ainult selle täpset kirjutuseelset peatust ning seob uue päeviku vana raporti räsiga. Vana raportit, lukufaili ega varasemaid paigaldajaid ei muudeta ega käivitata. Lähtevea raport lisab nüüd failitee, kontrolli liigi ja räsid.
- Kitsad jätkaja ja tarnitud baasist taastatud Git-regressioonid on paketi review-tõendis. Rakenduskood, sõltuvused ja sõnumite SQL jäävad eelmise kandidaadiga samaks; nende varasemaid katseid ei esitata uuesti tehtutena.
- Praegune käsk on `selqiro-sonumid-jatk-20261030/uuenda.py --publish`. Maci lõpptulemus, uus Verceli Ready ja päris telefoni kasutuskinnitus jäävad ootele.

## 2026-10-30 — V1 sõnumite kasutusloogika V2-s ja telefoni kirjutusriba

- Kasutaja viimased pildid kinnitavad toimivat kuulutusekaarti mõlema osalise vestluses. Varasem kaardipaigalduse peatuse töö on vastu võetud; vana paketti ei korrata.
- Uus kinnitatud teostus: Enter/Shift+Enter arvutis, telefonis kasvav koostaja ja üks saatmisnool, fotod koos kaardi või tekstiga, oma nimi/logo kirjutusriba juures, nähtav partner ja kuulutuse link.
- Sama vestluste ja sõnumite andmestik; pagineeritud ajalugu, nähtud ID järgi lugemata seis, tegevusjärjestus, oma postkastist peitmine ning konto blokeerimine ka V1 otsese INSERT-tee kaudu.
- Saatmine ja foto sidumine kasutavad muutumatuid kinnitusi. Privaatne fotohoidla on eraldi; piiratud koristus säilitab hilinenud kirjutuse tõkestamiseks tombstone-kirjed. Peitmine ei kustuta mõlema osalise sõnumeid ega vabasta fotode eelarvet.
- Tõendatud focus/token/storage identiteedivahetuse race on parandatud; aktiivse identiteedi RPC kasutab algse konto kinnitatud tokenit. Vana konto hiline tulemus ei muuda uue konto saatjat.
- Node 31/31, eraldi identiteedi brauserikatsed 12/12 ning telefoni/lauaarvuti komponentide katsed PASS. SQLi, updatri katkestuste, buildi ja kohaliku skeemi täpsed tõendid on tarne review/verification.json-is. Testides päris sõnumeid ega pilvekirjutusi ei tehtud.
- Üks uus Maci käsk: selqiro-sonumid-20261030/uuenda.py --publish. Selle kandidaadi Maci käivitamine, Verceli Ready ja füüsilise telefoni kasutuskinnitus on veel ootel. Üldine käivitamine ja kuulutuste varasem lõppkoristus ei muutu tehtuks.


## 2026-10-30 — Kuulutusekaardi SQL-paigalduse õigus ja kontrollitud jätk

- Kasutaja terminalipilt kinnitab `DATABASE_OUTCOME_NOT_VERIFIED` peatust enne lähtekoodi, buildi ja commit/push’i. Pilt ei näita `database_after` sisu; seda ei asendata oletusega.
- Täpne algne SQL kordab piiratud postgres-õigustega katses `42501 permission denied for schema public` viga: uuel funktsiooniomanikul puudus ALTER OWNER jaoks CREATE õigus. Varasem superkasutajaga fixture seda ei tuvastanud.
- Parandus kasutab olemasoleva V1 lähtekoodi grant/owner/revoke järjestust ühes tehingus ning kontrollib public-skeemi omaniku ja ACLi täpset säilimist. V2 lugeja sisu, rakenduskood ja sõltuvused on muutmata.
- SQL 40/40 ja jätkaja 30/30 kontrolli PASS; uus tootmisbuild PASS. Vana päevik on ainult loetav ja lukustatud; uus päevik eraldi. Fresh preflight peab säilitama algsed kuus sõrmejälge. Ebaselget katset või hiljem kadunud kinnitatud lugejat ei paigaldata automaatselt uuesti.
- Tarnitav jätk: `selqiro-postkasti-kaart-jatk-20261030/jatka.py --publish`. Maci tulemus, sama commit’i Verceli Ready ja päris uus kaart on veel ootel. Varasem edukas kontakt/tekstsõnum ja kuulutuse 197 avaldamine jäävad vastu võetuks.

## 2026-10-29 — V1 kuulutusekaart V2 vestluses

- Kuulutuse alt avatud vestlus kannab päritolu-ID koostajasse. Enne saatmist on eemaldatav pildi, pealkirja, täpse hinnateksti ja lingiga eelvaade; kinnitatud saatmise järel manus tühjeneb.
- Iga sõnum kuvab enda serveris salvestatud kaarti. Sama osaliste paari teine kuulutus ei sildista vana sõnumit ümber. Vanadele ilma manuseta tekstidele kaarte tagantjärele ei lisata.
- Uus range v2 lugemisleping jätab v1 lugeja ja kontrollitud saatja alles. Konto/identiteedi vahetus, kordussaatmise sama võti ning ajaloo lehitsemine säilivad.
- 23/23 Node kontrolli, 37/37 SQL kontrolli, tootmisbuild ja 16/16 paigaldaja kontrolli PASS. 14/14 sünteetilist brauseri kasutusolukorda PASS; mobiili- ja töölauavaade kontrollitud. Täielik tõendi piir on INBOX_CARDS_20261029.md-s.
- Üks jätkatav Maci uuenduspakk lisab andmebaasi lugeja, lähtefailid, build’i, commit’i ja push’i. Tegelik Maci käivitamine ning Verceli Ready ei ole ettevalmistuse põhjal kinnitatud.

## 2026-10-29 — Vestlus ja sõnum toimivad; V1 postkasti võrdlus

- Kasutaja kell 21:12–21:18 pildid kinnitavad vestluse 38 avanemist, ostja saadetud sõnumit ja selle lugemist müüja V2 postkastis/vestluses. Sama sõnum avaneb V1 vaates. Varasemat kontakti parandajat ei korrata.
- V1 lisas päritolukuulutuse kaardi konkreetsele sõnumile ja puhastas manuse pärast edu. V2 headeris on kuulutuse link, kuid saatmise UI annab listingId:null ning read-RPC/klient ei väljasta sõnumi manust.
- Olemasolev V2 send-RPC toetab juba serveris kontrollitud kuulutusemanust. Soovitatud järgmine teostus ühendab koostaja ja lugemislepingu selle võimekusega, säilitades per-message konteksti ka sama müüja mitme kuulutuse puhul.
- Audit oli lugemine; rakenduse, andmebaasi ega pilve muudatusi ei tehtud. Täpne võrdlus ja piir on INBOX_V1_REVIEW_20261029.md-s; jooksev üleandmine on uuendatud.

## 2026-10-29 — Vestluse RLS-ringi kitsas andmebaasiparandus

- Uus kasutaja pilt kinnitab LC-RPC-UNKNOWN-HTTP500 jõudmist nupu alla; diagnostikatarne kordamist pole vaja. Päris SQLSTATE ei ole veel otse loetud.
- Accepted funktsioonide ja PUBLIC poliitikatega kohalik katse kordab 42P17 business_members rekursiooni kontaktikirjutaja actor/peer/nime lugemises.
- Valmis on eraldi supabase/repairs parandus: privaatsed definer-helperid, avalike RPCde sama piiratud omanik, muutumatud actor-kontrollid/poliitikad/rollid/andmed.
- Täieliku guarded SQLi 35/35 kontrolli ja parandaja 17/17 kontrolli PASS; täpne tõendi piir CONTACT_REPAIR_20261029.md-s. Päris DB eelkontroll ja rakendamine on veel ootel.
- Üks Maci käsk kontrollib live-seisu, teeb ainult tuntud vea korral ühe SQL-tehingu ning loeb tulemuse üle. Git/source/deploy ei muutu. source_delta on säilitatav allikas, mitte Maci või GitHubi sünkroniseerimise tõend.
- Hosted koristuse/reservide sulgemine ja ülejäänud kokkulepitud V2 ulatus jäävad lahti.

## 2026-10-29 — Päris avaldamine vastu võetud; kontaktivea nähtavus

- 27.–28.10 kasutaja tõendid kinnitavad olemasoleva DB/Storage’i ja kolme konto ettevalmistuse, commit’i `8f25f65` push’i ning Production Ready tulemuse. Neid etappe ei korrata.
- Kuulutus 197 „Müüa BMW”, 4376 €, üks pilt on avaldatud. Detail, suur pilt ja omaniku aktiivne rida avanevad. Teise e-postiga sisselogitud Jaani Pood näeb kuulutust ja pilti, kuid kontakti POST tagastab 503. Selle täpset põhjust pole kinnitatud.
- Chrome Response ei saanud veakeha laadida. Senine kontaktitransport katkestas mitte-2xx keha lugemata. Kitsas kandidaat loeb kuni 4096 baiti, säilitab HTTP tulemuse ning kuvab nupu all ainult lubatud etapi/koodi/staatuse/SQLSTATE-PGRST koodi.
- Konto-, origini- ja readiness’i kontroll, RPC argumendid, idempotentsus ja range eduka vastuse parser säilivad. SQL-i, õigusi ega andmeid ei muudeta.
- 12 sihitud Node kontrolli läbisid sünteetiliste vastustega. Lõpliku build’i, brauserikontrolli ja uuendaja kontrolli seis on `docs/continuity/CONTACT_DIAGNOSTICS_20261029.md`-s. See kirje ei kinnita uue kandidaadi Maci paigaldust ega Productioni jõudmist.
- Jooksev seis ja sellest genereeritud üleandmine on ajakohastatud, et järgmine vestlus ei suunaks tagasi lõpetatud paigalduse juurde.

## 2026-10-27 — Jätkaja Giti autentimisabilise parandus

- Kasutaja 12:30 terminalipilt näitab `GIT_ENVIRONMENT_OVERRIDE_PRESENT`; peatumine toimus enne Git-käske, lähtefailide/indexi/päeviku muutmist ja pilve.
- Paketi r2 väline `jatka.py` lubab olemasoleva `GIT_ASKPASS` abilise. Kahe täitmislipu väärtus määratakse nulliks; muud Git-ülekirjutused keelatakse ja võimaliku keeldumise puhul kuvatakse ainult nimed. Pildil tegelikku muutuja nime pole, VS Code’i abiline on põhjendatud oletus.
- Kontrolliti üksnes uut keskkonnakontrolli mälus. Varasemaid Git-/SQL-/rakenduse teste ja buildi ei korratud. Portaali kood, kolme konto paigaldaja, SQL ja sõltuvused on muutmata; selle paranduse Maci edu on veel kinnitamata.

## 2026-10-27 — Olemasoleva portaali jätk ja kolm päris kontot

- 26.10 täielik veebiallikas on kasutaja 27.10 terminalipildi järgi eraldi `~/selqiro-veeb-20261026` tööpuus staged; commit/push ja uus deployment on veel tegemata.
- Kasutaja katkestas ühe konto paigaldaja enne e-posti sisestamist. 11:54 kuvatõmmis kinnitab `INTERRUPTED`; selle jooksu DB/Storage toimingud ei alanud. Varasemat tööpuu ettevalmistust ei korrata.
- Järgmine lähteparandus võimaldab uut avaldamis- ja kontaktivoogu Taivo kolmel olemasoleval kontol. See on funktsiooni ajutine kasutuselevõtu piirang; e-posti valik terminalis ei asenda brauseri parooliga sisselogimist.
- Parandus tuleb samasse olemasolevasse portaali/andmebaasi ja ettevalmistatud tööpuusse. Uut testportaali, pilvebaasi ega konto loomist pole vaja.
- `AI_BOOT` suunab nüüd ühele jooksvale seisukirjele; praegune sprint ja see päevik on ajakohastatud. Vana LocationCardi eraldamise NEXT oli aegunud: komponent ja hook on olemas.
- 26.10 rakenduse build'i, sihitud Node/SQL ja native kontrollide varasemad tõendid säilivad. Käesoleva paranduse 8 Python-, 4 Git- ja 5 aktiveerimismalli SQL-juhtumit läbisid; täpsed tõendipiirid on jätkupakis. SQL-kontroll kasutas PostgreSQL17.5 WASM-i sünteetiliste andmetega. Uut rakenduse build'i ega päris pilvekatset ei tehtud.
- Järgmine nähtav tulemus on pildiga kuulutus päris veebis ning eri kontode müüja/ostja kontakt. Hosted lõppkoristus ja ruumireservide vabastamine on endiselt lõpetamata.
- Energy ja maksete tuum ning piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse; praegune kuulutuste etapp ei muuda neid automaatselt käivitamisjärgseteks lisadeks.


## 2026-06-26

### Premium / identity admin
- Added admin identities overview.
- Added admin identity detail page.
- Fixed dynamic route `/admin/identities/[identityId]`.
- Admin can set identity plan: `free`, `premium`, `business`.
- Plan is stored in `identity_profiles.plan`.
- Confirmed admin detail refresh keeps `premium`.

### My Page refactor
- `app/my-page/page.tsx` is currently very large, about 2559 lines.
- Decision: refactor My Page into smaller modules and components.
- First component: `app/my-page/components/MembershipCard.tsx`.
- Goal: make future maintenance easier and reduce risk when editing.

### Architecture decision
- Prefer smaller components and hooks.
- Avoid very large files.
- Future structure should move logic into hooks and UI into components.

### Engineering principles
- Adopted Selqiro official development style.
- Added ChatGPT-friendly architecture principle.
- Added development planning rule.
- Added 10-year architecture principle.
- Future development should prioritize modularity, maintainability, clear responsibilities, and easy debugging.


## 2026-10-30 — Telefoni vestluse klaviatuur ja fotovalik

Kasutaja telefoni pildid kinnitavad uuendatud sõnumivaate käivitumist ning näitavad
kaht viga: kuulutusekaart varjas kirjutusvälja ja galerii valik ei jõudnud
foto mustandisse. Parandatud nähtava vaate nihke/kõrguse käsitlemine ja fookuse
ajal kompaktne kaart. Foto valik seotakse enne galerii avamist saatjaga ning
säilib sama saatja korduskontrollini; valele identiteedile seda ei laadita.

Uus tarne on ainult kliendikoodi parandus koos varukoopia, build’i ja piiratud
commit/pushiga. Andmebaasi ega Storage’i ei paigaldata uuesti. Täpsed kontrollid
ja piirid: `docs/continuity/MESSAGING_MOBILE_FIX_20261030.md` ning tarne
`review/verification.json`. Viimase tootmis-commit’i räsi ei oletata pildi põhjal.


## 2026-11-07 — Foto lisamise eksitava eduteate ja reservi diagnoos

- Kasutaja uus teade: kuulutusel 201 täpne üleslaadimisreservi piirang; kuulutusel 202 eduteade ilma uue nähtava fotota. Uut Maci commit’i ega Verceli räsi ei oletata ekraanipildi põhjal.
- Tegeliku r2 komponendi ühes uues Chromiumi katses korrati focus-before-change viga. Omanikuvaate lugemine blokeerib valiku; uus File kaob ja vana lõpetatud journal/eduteade säilib ilma uue prepare/PUT/append’ita. Katse on sünteetilise Auth/RPC/Storage transpordiga, mitte kasutaja päris sündmusjälg.
- Koodi audit eristas kontoülese reservi galerii kümne foto piirist. Juurdelisamise SOURCE koristus jääb järjekorda; katkestatud/aegunud katsete hosted reservi lõpetamine on endiselt lahti. Konkreetse konto reservi põhjuste jaotus on lugemata.
- Valmistatud uus ainult lugemiseks koguja: tegeliku Git/1081 teadaoleva lähtefaili vaatlus ja üks piiratud READ ONLY päring 201/202 galerii, viimaste lisamiste ning ühise algse avaldaja konto reservi koondandmetele. Kasutab muutmata kontrollitud transporti; ei käivita rakendust ega kirjuta projektifaile, indexit, andmebaasi või Storage’it.
- Koguja 7/7 sihitud testi PASS. Uue SQL-i 3/3 PGlite kontrolli PASS täpsete praeguste lugemispredikaatidega; 36 tabeli andmed säilisid. Sama range parser aktsepteeris kõigi kolme tegeliku sünteetilise päringu väljundit. Reaalset konto tulemust sellest ei tuletata.
- Fotovaliku väike ühe komponendi parandus valmistatakse ette eraldi lähtekoopias. See ei kuulu diagnostikapaki paigaldatavasse sisusse. Maci rakendamiseks on vaja värsket tegeliku lähtepuu aruannet; senised räsikaitsega paketid säilivad muutmata.
- Uuendatud CURRENT_STATE, sellest genereeritud üleandmine, HOSTED_PORTAL ja käesolev append-only päevik; lisatud PHOTO_ADDITION_DIAGNOSTIC_20261107 ning known-issues. Need on kohalikud ettevalmistatud dokumendid, mitte Maci hoidlasse kirjutamise tõend. Üks järgmine tegevus on saata uue koguja aruande-ZIP.

- Sama töö prototüübi kontroll lõpetatud: ainult ManagedListingPhotoAdd muutus (108 rida; SHA-256 840a129529818fac815c9008731f103c79380751b09f03ec8474d5305a700618), build PASS 26,39 s ning viis sihitud brauserijuhtu PASS. Teine explicit lisamine andis galerii 3→4; konteksti- ja päevikupiirid säilisid. Esimese jooksu brauseriprotsessi sulgumise tõend säilib; päris Maci/telefoni OS-valija tagastust pole kontrollitud. Seda prototüüpi koguja ei paigalda.

- Diagnostika lõplik 24-failine ZIP läbis pärast kõigi failide pakkimist täpse arhiivi read_package/CRC/baidivõrdluse. SHA-256 d6eecd1ef79c2500ace6bee5427f64e40076d79c2118722f80c7750030d3e853, manifest f1599bfc062372a039c5e09728e620d567d0879f2c6fe7b96a02e998a0a7ea10. Kinnitatud tarne ja vanad väljastatud paketid jäävad muutmata; aruanne päris Macist on järgmine samm.


## 2026-11-07 — foto lisamise diagnostika ajatemplite ühilduvus

- Saabus raport `selqiro-foto-lisamise-raport-20261107-110102-ccc90d21.zip`.
  Enne-lugemist Maci main HEAD `a4b5b2d14e456e6e83d4412b839ef330259cd048`,
  1081/1081 r2 lähtefaili vastavad ja tracked tööpuu/index puhas. Sama commit'i
  build/commit/push on terminalipildiga teatatud; uut Verceli Ready tõendit pole.
- CLI lugemispäring exit 0, kuid koguja `DATABASE_REPORT_TIME_INVALID` tõttu
  konto vaatlus puudub. Toorvastust ega pärast-lugemist hetktõmmist ei säilitatud.
  Vana `database:not_read` on algväärtus, mitte tõend, et päringut ei toimunud.
- Uues eraldi r2 kontrollipakis parandati ainult sekundi murdosa parsimise
  ühilduvus ning vastuse saamise/Pythoniversiooni raportikirje. SQL ja transport
  säilivad bait-baidilt; rakendust, Maci, pilveandmeid ega vanu pakke ei muudetud.
- 10/10 sihitud regressioonikontrolli PASS. Muutmata SQL läbis kohaliku PGlite
  timestamptz katse ja 36 tabeli enne/pärast räsid vastasid. Testimiskeskkond oli
  Python 3.12.14 koos avaldatud Python 3.9 murdosa lugemisabiga; tegelikku 3.9
  protsessi ei käivitatud. Sõltumatu lähteülevaatus ei leidnud takistust.
- Vana portaali build'i ega laiu sarju ei korratud. Üks varane kohaliku fixture'i
  seadistusviga säilib eraldi tõendina; see ei puudutanud päris teenust.
- Uuendati CURRENT_STATE, sellest genereeritavat üleandmist, HOSTED_PORTAL-i,
  juhtumidokumenti ja known-issues'i. Need on ettevalmistatud lähtekoopias.
  Üks järgmine tegevus on uue r2 koguja lugemine ja uus aruande-ZIP.

- Lõplik r2 kontrollipakk: 21 faili / 138027 baiti. Täpsest ZIP-ist read_package, CRC ja baitide vastavus PASS. ZIP SHA-256 `62790e99d2c2b4c5879a729e5a177118d4febb36365bd96a72f4240d20ce93f1`, manifest `333b72b84e683068e6822cf3ded38c54b53cb933797b9433a979b69735879fd7`. Pärast külmutamist ZIP-i ei muudeta; käesolev lõpptõend lisati ainult ettevalmistatud lähtekoopiasse.


## 2026-11-07 — päris reservi vaatlus ja foto lisamise lõpetamine

- Uus r2 diagnostika lõpetas 11:29:48 UTC edukalt Maci Python 3.9.6 all. Enne/pärast main HEAD a4b5b2d14e456e6e83d4412b839ef330259cd048 ja 1081 lähtefaili vastavad; tracked index/tööpuu puhas. Eelmine ajatemplite ühilduvuse puudujääk on päris raportiga lahendatud.
- Päris read-only vaatlus: konto 277 MiB reservist 225 MiB on 9 avaldatud algfaili ning 52 MiB 13 aktiivse veebifoto reserv. Uue foto 29 MiB ei mahu 300 MiB piirile. Kuulutus 201 viis pilti/revision 6, 202 kolm/revision 2; pooleliolevad/aegunud katsed ja sessioonid olid null. Raport pole praeguse brauseri tegutseja ega Storage I/O vaatlus.
- Ühe kliendikomponendi parandus säilitab File-i omanikuvaate focus-lugemise ajal, peidab ootel uue valiku ajal vana eduteate ning jätab reset/journal/identiteedikaitse alles. Kohalikku valikut saab katkestada ka lugemisvea ajal. Native sisend on lubatud; nähtav nupp ja üleslaadimine säilitavad senised õiguskontrollid.
- Lisatud üks väike serveri SOURCE-lõpetamise moodul ja kaks sidumist: täpne kvoodikeeldumine → olemasolev sama emaseose koristaja → värske väiksem loendur → üks identne prepare. Püsiv append seob ühe piiratud töö tegeliku Next after()-iga. Tundmatut kirjutust ei korrata; olemasolev kviitung/ledger ja SQL jäävad autoriteetseks.
- 9/9 brauserijuhtu ja 31/31 serveripiiri juhtu PASS. Muutmata tegelik SQL kohalikus PGlite fixtures läbis 27 väidet:277→281→256 MiB, vana ja uus galerii ning kõik WEB-objektid säilisid. Tegelik Next after/AfterContext koos sünteetilise close/waitUntil elutsükliga läbis vastusejärgse ja request-abort'i sõltumatuse kontrolli. Päris pilve- ega OS-valijakatset ei tehtud.
- Üks kombineeritud production build PASS 26,42 s; neli rakendusfaili säilisid. Paigaldaja 4/4 sihitud kontrolli PASS reaalses ajutises Gitis/kohalikus remotes, sünteetilise build'iga. Sõltumatu lähteülevaatus ei leidnud takistust. Laiu vanu testisarju ei korratud.
- Üks uus app-only paranduspakett valmistatakse tegelikule 1081-failisele a4b5b2d lähtele; see ei käivita eelmisi paigaldajaid, ei vaja migratsiooni ega muuda limiite. Lõpliku ZIP-i kontroll tehakse pärast kogu sisu pakkimist ja säilitatakse väljaspool muutumatut arhiivi.
- Uuendatud on üks CURRENT_STATE ja sellest genereeritav üleandmine, praegune paigaldusjuhis, juhtumileping ja teadaolevad tööd. Engineering Standard täpsustus on põhjendatud: eksplitsiitse lisamise lõpetamine kasutab olemasolevat koristust, üksnes passiivne vaatamine/fookus seda ei käivita.
- Üks järgmine tegevus: Maci uuenda.py --publish, sama commit'i Verceli Ready, üks uus foto 201 kuulutusele ning galerii/avaliku vaate ja tegeliku aja kontroll. Täielik V2 keelekatvus ja üldine taustakoristus on endiselt eraldi lõpetamata tööd.


## 2026-11-07 — Frankfurdi tulemus ja foto kuvamise kattuv laadimine

- Kasutaja võttis f1745be foto valiku/reservi paranduse vastu: viis uut fotot,
  kümne foto piir ning nähtavus galeriis ja avalikus vaates on kinnitatud.
  Varasema viie mõõtmise 20,4 s keskmine on ajalooline võrdlus.
- Sama koodi Production redeploy pärast iad1 → fra1 seadistust on Ready.
  Päris image-verify Server-Timing total 7647,2 → 4345,2 ms; X-Vercel-Id
  arn1::iad1 → arn1::fra1. Üks uus lisamine võttis stopperiga 12 s.
  Eri katsete/failide mõõtudest ei tuletata kindlat püsivat keskmist.
- Serveriaudit ei leidnud põhjendatud vajadust muuta kontrollide lepingut.
  Uus väike kliendimuudatus alustab salvestuskviitungiga seotud WEB-foto
  kaitstud lugemist värske galerii lugemise ajal. Üks peidetud sama võtmega
  pildikomponent saab nähtavaks alles värske liikmesustõendi järel.
  Server, SQL, sõltuvused, limiidid, SOURCE-koristus ja päevik säilivad.
- Kontrolleri 50/50 ja tegeliku integreeritud Reacti Chromiumi 11/11 juhtu
  PASS. Peidetud foto ei anna edu/nuppe/loendurit; nähtavaks muutumine säilitab
  ühe päringu ning sama LI/IMG/Blob URL-i. Tühi galerii, lugemistõrge, uuem
  eemaldamine, identiteedi vahetus, unmount ja käsitsi kordus läbisid.
  Auth/RPC/Storage on katses sünteetilised; pilveteenuseid ei kutsutud.
- Kohalik 800 ms galerii + 1000 ms meedia viitekatse: 2116,5 → 1554,9 ms
  append-vastusest nähtava fotoni. See 561,6 ms ajavõit ei ole tootmise lubadus.
- Üks kogu portaali npm run build -- --webpack PASS 28,77 s; TypeScript ja
  27 staatilist lehte, neli kliendifaili/test/package/lock säilisid. Paigaldaja
  6/6 kontrolli PASS kõigi 1084 aktsepteeritud lähtefailiga, ajutise Giti,
  kohaliku bare-remote'i ja sünteetilise build'iga. Täpne lõplik ZIP kontrollitakse
  pärast pakkimist; selle hilisem tõend säilib muutumatu arhiivi kõrval.
- Uus eraldi selqiro-foto-kuvamine-20261107 pakk lahendab f1745be Macis
  täispikaks commit'iks ning kontrollib kogu lähtepuu/indexit enne kirjutust.
  Eelmisi pakke/päevikuid ei muudeta. CURRENT_STATE ja genereeritud üleandmine
  eristavad vastuvõetud tootmistulemust ning alles paigaldatavat uut parandust.
- Üks järgmine tegevus: uus uuenda.py --publish, selle commit'i Ready ning
  üks stopperiga lisamine testkuulutusele, kus on vaba fotokoht. Kuulutusel 201
  olevaid fotosid katse nimel ei kustutata. V2 täielik EN/ET ja üldine
  taustakoristus jäävad eraldi lõpetamata töödeks.


## 2026-11-08 — hobuse avaldamise r2 eelkontrolli parandus

- Esimese hobusepaketi kasutaja raport kinnitas `DATABASE_PRECONDITIONS_NOT_MATCHED`
  peatuse enne SQL-i, failide, build’i, commit’i ja push’i tegemist. Aluseks jäi
  keeleuuendus `92408b6ceb7a9fec3119d35a86c9bb47628acf22`, 1106 puhast faili.
- Ainult lugemise kataloogiraport lõpetas 10:42:37 UTC. ZIP-i manifest/CRC ja
  failiräsid kontrolliti, kõik 15 erinevusrida arvutati eraldi uuesti. 171
  funktsiooni kood/faktid, 5 struktuuri, 2 poliitika-autoriteeti ja 3 vaadet
  vastasid; erinevused olid viies ACL-is ja kahes automaatses rolliliikmesuses.
- Säilitatud baseline’i vaikeõigused ning kaks rolli loomise allikat selgitavad
  tootmise kuju. Kohalik testadapter kasutab PostgreSQLi enda rolli-DDL-i,
  eraldi supabase_admin bootstrap’i ja tavalist postgres paigaldajat. Kõik
  võrreldud kataloogifaktid kattuvad nüüd päris raportiga. Tootmise õigusi ei
  kirjutata vastavuse saamiseks ümber, kaitseid ei eemaldata.
- Seitse hobuse SQL-võimekusmoodulit ja kõik 499 rakenduse runtime-faili säilisid.
  Genereeritud SQL-is muutusid ainult sõltuvuste räsi ja täpne rollifaktide
  võrdlusväärtus. Muutmata ehitussisendite varasem build ja 162 Node-testi
  tõend säilivad; neid ei käitatud uuesti.
- Parandatud SQL-mudeliga läbis 9 tuuma- ja 8 avaliku/kontakti juhtu ning 21
  paigalduskaitse juhtu. Viimane koosneb 19 läbinud juhust ja kahest sihitud
  jätkukontrollist; ühe võimatu negatiivse testseadistuse algne peatus,
  parandus ja mõlema jooksu tõendid säilivad. Uuendaja 18/18 kontrolli läbisid,
  sh algse peatunud päeviku muutmatus ja eraldi uue väljalaske päevik.
- Uus pakett on `selqiro-hobused-20261108-r2`; vana ZIP ja päevikud jäävad alles.
  Täpne koostatud pakett ja lõplik ZIP kontrollitakse enne väljastamist;
  eraldi tarnearuandes säilivad täpsed baidid, testipiirid ja tulemus.
- Uuendatud on CURRENT_STATE, sellest genereeritav üleandmine, HOSTED_PORTAL,
  juhtumidokument, arhitektuur ja teadaolevad tööd. Järgmine on r2 paigaldus
  Macis, sama commit’i Ready / Production ja üks hobuse avaldamise/muutmise
  kasutuskatse. Teenused järgnevad ühe Avalda ning Minu ala Muuda/Salvesta vooga;
  töökuulutused hiljem.


## 2026-11-08 — hobuse halduse vastuvõtt ja muutmise viimistlus

- Kasutaja kinnitas ühise galerii, suurendamise, omaniku pisipildi, pildilingid,
  peatatud sisu muutmise ning eraldi 90-päevase uuendamise. Korduvat vastuvõttu
  nende punktide jaoks ei nõuta.
- Vana 3000-ms galerii käitumine tuuakse ühisesse komponenti. Hiire liikumine,
  puudutus ja navigeerimine kuvavad nooled; klaviatuurifookus jääb nähtavaks.
- Omaniku atomaarne lugemine tagastab olemasoleva faktilise kinnituse tõendi.
  Muutmisvorm saadab algse sündmuse viite, server kontrollib seda ettevalmistusel
  ja lõppkirjutusel. Algne sündmus/aeg säilib; uued tingimused vajavad eraldi
  nõusolekut. Uue kuulutuse esmast kinnitust ei asendata.
- Uus SQL-parandus ja paigalduspäevik on eraldi. Alus on eelmise halduse 1226
  faili ja receipt’idega kontrollitud tegelik Git-ahel. Uue paranduse paigaldus
  Macis ning Verceli Ready järgnevad; teenused on pärast viimistlust järgmised.
- Täpsed lõplike baitidega seotud kontrollid säilivad paketi kontrollraportis.


## 2026-11-08 — hobuse muutmisvaade avaneb kohe muutmiseks

- Kasutaja kinnitas noolte 3-sekundilise peitumise ja tagasituleku mõlemas
  galeriivaates ning varasema faktilise kinnituse kasutamise. Need eelmise
  viimistluse vastuvõtud on lõpetatud.
- Uus tähelepanek: vana lõpetatud salvestuse brauseripäevik taastas terminalse
  ekraani, jättes muutmisvormi lukku kuni all oleva „Muuda uuesti” vajutamiseni.
  Kasutaja soovib avada Muuda, kohe välju muuta ja vajutada Salvesta muudatused.
- Omaniku vorm võtab nüüd esmalt kasutusele kinnitatud sisu/galerii/revisjoni ja
  lõpetab täpselt selle terminalse toimingu automaatselt olemasoleva lukuga.
  Aktiivse operatsiooni lõpetaja oodatakse ära. Pärast edukat salvestamist saab
  edasi muuta; järgmine salvestus saab uue võtme ja kinnitatud revisjoni.
- Teise vahekaardi lõpetatud toiming ei kirjuta üle kohalikku salvestamata
  teksti ega omista sellele uuemat revisjoni. Kasutaja näeb laadimise teadet;
  serveri revisjonikaitse ja teadmata toimingu taastamine säilivad. Uus muudatus
  ei muuda esmast avaldamist, kinnitusi, SQL-i, galeriid ega tähtaja/staatusereeglit.
- Kolm sihitud kliendisarja 90/90 PASS, sealhulgas seitse editori/hooki/seansi
  elutsükli juhtu. Sõltumatu ülevaataja käivitas varasema 88-juhulise sarja ja
  vaatas üle kaks hiljem lisatud EN/ET renderdusjuhtu; rakenduskood ei muutunud.
  Sõltumatu ülevaatus ning kuus eraldi seansikatset läbisid.
  Next.js/TypeScript tootmiskooste PASS 28,983 s; 535 rakendusfaili räsi säilisid.
  Lint-võrdluses uusi vigu pole, kaks varasemat Reacti viga säilivad.
- Uuendaja 33/33 kontrolli läbisid päris ajutise Giti ja kohalike remote’idega.
  Uus source-only pakett kontrollib eelmise viimistluse 1252-failist puud ja
  privaatse raportiga leitud tegelikku commiti koos eelneva ahelaga. SQL-i ega
  Storage’i ühendust ei kasutata. Lõpliku paketi/ZIP-i kontroll säilib eraldi
  tarnearuandes; varasemad ZIP-id, SQL-failid ja paigalduspäevikud jäävad alles.
- Üks järgmine samm: uus selqiro-hobuse-muutmine-20261108 käsk, selle commit’i
  Ready/Production ning üks Muuda → kohe kirjuta → Salvesta → muuda uuesti
  kasutuskatse ilma eraldi avamisnuputa. Teenused järgnevad sama lihtsa vooga;
  töökuulutused hiljem. Maci rakendamist ega uut deployment’i veel ei väideta.


## 10.11.2026 — poerubriikide halduse jätkamine pärast katkestust

Kasutaja heakskiidetud sama töö jätkub. Taastati räsikontrolliga 1398-failine vastuvõetud baas ning kuus vastuvõtudokumendi deltat. Kadunud poolelioleva halduse baidid taastatakse eraldi kandidaadis; need saavad uued sihitud kontrollid. Varasemad väljastatud pakid säilivad. Maci, GitHubi, päris andmebaasi ega Verceli toimingut ei tehtud.


## 2026-11-10 — poe rubriikide haldus uues kandidaadis valmis

- Praeguse Minu alaga on ühendatud kinnitatud kasutaja/aktiivse identiteediga
  ülem- ja alamrubriigi loomine, nime muutmine ning lasteta rubriigi eraldi
  kinnitusega eemaldamine. Kuulutus, kirjeldus ja pildid säilivad.
- Uus väike kliendi/hooki/UI kiht ning eraldatud manage_my_store_category_v1
  RPC; õigused ja algne nimi/parent kontrollitakse serveris. Katkenud vastuse
  korral säilib sisestus ja kasutaja teeb lugemiskontrolli, automaatset uut
  kirjutust ei tehta. English/Eesti, mobiilipaigutus ja eraldi vahekaardi
  halduslink kuulutuse rubriigivalijas.
- Pärast katkestust taastatud täpne 1398-failine baas sai uue arenduskihi ja
  värsked tõendid: SQL runtime 17/17 ning install/drift 18/18, kliendi/hooki
  15/15, 13 muudetud runtime-faili lint, 610-sisendiline Next build 28,661 s
  ning Chromiumi neli English/Eesti kasutuskäiku PASS. Vanad etapi PASS-id
  ei asenda neid kontrolle. Täpne ulatus ja fixture'i piir on kuupäevakirjes.
- Uuendaja eelmise raporti 18/18 ja SQL-adapteri 13/13 sihitud kontrolli PASS.
  Lõplik manifesti tarnekatse ning inventar säilivad paketi kontrollid kaustas.
  Väljastatud varasemad pakid ja nende päevikud jäävad muutumatuks.
- Uuendatud on autoriteetne CURRENT_STATE, sellest genereeritud üleandmine,
  HOSTED_PORTAL, arhitektuur, teadaolevad piirid ja varasema kasutajavastuvõtu
  kuus dokumendimuudatust. Edul/peatumisel täpne privaatne Downloads-raport
  ja sama faili valimine Finderis jäävad iga uue uuendaja nõudeks.
- Järgmine on uus halduse pakett Macis, raporti sama commit'i Ready/Production
  ja üks ajutise rubriigi halduse tegelik kasutuskäik. Päris SQL-i, Maci,
  GitHubi, Storage'i ega Verceli muutust käesolevas ettevalmistuses ei tehtud.


<!-- SELQIRO_STORE_CATEGORY_MANAGEMENT_ACCEPTED_20261110 -->
## 10.11.2026 — poe rubriikide haldus rakendatud ja vastu võetud

Tegelik uuendaja raport kinnitab commit'i
`0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`, andmebaasi järelkontrolli,
build'i ja push'i. Jooks lõppes 15:17:33 Europe/Tallinn. Kasutaja kinnitas
ülem- ja alamrubriigi loomist, mõlema nime muutmist, testkuulutuse sidumist
ja profiilist leidmist ning rubriikide eemaldamisel kuulutuse säilimist.
See etapp on vastu võetud; paigaldajat ega läbitud kasutuskatset ei korrata.

Verceli täpne Ready/Production rida ja deployment-ID ei ole lisatud;
veebikasutuse vastuvõtt on eraldi kinnitatud. Vana otsetabeli
`listing_store_categories` õiguste piir ja fotokoristuse tööd säilivad.
Praegune tööjärg: `docs/continuity/CURRENT_STATE.json`; raporti täpne piir:
`docs/continuity/STORE_CATEGORY_MANAGEMENT_20261110.md`.

See vastuvõtu dokumentide delta pole eraldi Maci/GitHubi rakendatud. Järgmine
sisuline tarne võtab selle kaasa pärast tegeliku seisu kontrolli. Allolevad
ettevalmistuse kirjed ja vanad NEXT/käivitamisjuhised on ajalugu.


Ülevaatus oli võrguühenduseta: manifesti, 51 algoleku ja 1398 algindexi kirje,
SQL-vastuste ning pilditõendite võrdlus. Rakenduse/SQL/build katseid,
paigaldajat ega pilvetoiminguid ei korratud. Algne ZIP säilib muutumatult.

---

<!-- SELQIRO_STORE_CATEGORY_AUTHORITY_PREPARED_20261110 -->
## 10.11.2026 — ette valmistatud vana rubriigiseoste otsekirjutuse sulgemine

Rubriikide halduse `0b2594a` paigaldus ja kasutajavastuvõtt jäävad lõpetatuks.
Uus eraldi tarne viib kaks vana vormi olemasoleva atomaarse, sama lubatud
identiteeti kontrolliva rubriigiseoste toimingu peale ning sulgeb brauseri
otsesed muudatused `listing_store_categories` tabelile. Tabeli lugemine,
olemasolev RPC, kuulutused, rubriigid ja fotod säilivad.

Uus kliendiversioon peab enne veebis olemas olema; õigusteparandus järgneb
kontrollitud avalikule kliendimärgile. Ooteolekust jätkub sama käsk lõpetatud
build'i/commit'i/push'i kordamata. Teadmata SQL-i tulemus nõuab lugemist.
Vana vormi osaline tulemus suunab olemasoleva kuulutuse eraldi rubriigivaatesse,
mis loeb salvestatud valiku ega eelda avaldamise kviitungit või loo duplikaati.

See on ettevalmistatud lähtekood, mitte uus Maci/SQL-i/commit'i/veebi tõend.
Üks praegune samm on `docs/continuity/CURRENT_STATE.json`-is, käsk
`docs/continuity/HOSTED_PORTAL.md`-s ja tõendid
`docs/continuity/STORE_CATEGORY_AUTHORITY_20261110.md`-s. Leping:
`docs/architecture/store-category-link-authority-v1.md`.
Varasemad allolevad CURRENT/NEXT ja käsud säilivad ajaloona.

Ettevalmistuse sõltumatu ülevaatus leidis, et esialgne taastelink üldisse
integreeritud muutmisvaatesse ei sobinud vana /sell loodud kuulutusele:
seal puudub uue avaldamistee kviitung. Seetõttu lisatakse väike eraldi
rubriigivaade olemasoleva kaitstud lugeja/valijaga. Esimese revisjoni testid ja
build jäävad oma revisjoni tõenditeks; parandatud taastetee saab eraldi kontrolli.

Lõpliku parandatud kliendi kontrollid: adapter/tegelikud handlerid 19/19,
renderdatud taastesihtkoht 10/10 ning pärast build'i Chromium 7/7 + 9/9 PASS.
Next build läbis 79.449 sekundiga, 616 sisendi räsi jäid muutumatuks.
Taastetee 1280/390 px vaated on loetavad. SQL runtime 18/18 ja install/drift
31/31; uuendaja aluse 9, SQL-adapteri 13, kliendimärgi 9 ning jätku/katkestuse
10 katset läbisid. Täpsed tõendid ja sünteetilised piirid on etapikirjes;
käesolev kohalik ettevalmistus ei kirjuta Maci või pilve.


---

<!-- SELQIRO_STORE_CATEGORY_AUTHORITY_INSTALLED_20261110 -->
## 10.11.2026 kell 20.07 — poe rubriigiseoste õigusteparandus on paigaldatud

Kasutaja jätkuraport kinnitab commit'i
`adfa3ae767712b5f71e9fac2d963a765f61fb444`, `stage: complete`,
`database: verified`, `build: passed` ja `push: verified`.
Jooks lõppes 20:07:17 Europe/Tallinn. Üks SQL-i rakenduskatse sai kinnituse;
eraldi järelkontroll kinnitati 20:07:15. Kõik üheksa kontrollirühma läbisid,
sõltuvuste ja kolme invariandi räsid säilisid. Storage'i toiminguid ei tehtud.

Avalik 139-baidine kliendimärk vastas täpselt oodatule 20:07:05 ja 20:07:10.
Varasem 17.35 Verceli kuvatõmmis näitab sama commit'i Ready / Production.
Need on eraldi tõendid; raporti `READY_NOT_CHECKED` jääb ajalooliseks väljaks.
Vana ooteolek on lõpetatud. Build'i/commit'i/push'i, paigaldajat ega SQL-i
ei korrata. Varasem rubriikide halduse kasutajavastuvõtt säilib.

Järgneb üks sihitud kasutuskontroll pärast uut andmebaasi õiguste muutmist:
värskenda portaal, ava testkuulutuse 202 eraldi rubriigivaade, salvesta üks
olemasolev enda rubriik ja kontrolli sama kuulutust profiili rubriigifiltris.
Seda uut käiku pole veel kasutaja poolt kinnitatud. Praegune seis ja üks
järgmine tegevus on `docs/continuity/CURRENT_STATE.json`-is; täpne tõendipiir
on `docs/continuity/STORE_CATEGORY_AUTHORITY_20261110.md`-s.

See on eraldi dokumentide jätkupunkt, mitte Maci/Giti dokumendimuudatus.
Järgmine kontrollitud lähteuuendus võtab selle kaasa. Allpool olevad
ettevalmistuse kirjed, CURRENT/NEXT-pealkirjad ja käivitamiskäsud on ajalugu.

---

Võrguühenduseta jätkuraporti ülevaatus läbis 26 kontrolli; täpne raporti SHA256 on 07854b1ad2faa249203729e812c0dd03a078ebf20043cd0ee2e58d7d414261b1. Raporti database_last_read/absent on rakenduseelne lugemine; lõppseis on database_after/applied ja database/verified. Uuendaja algne build/logi nimi, commit, push ja indexi räsid säilisid. Ülevaatusel ei käivitatud uut build’i, rakenduse/SQL/brauseri katseid, paigaldajat ega pilvetoiminguid. Dokumendid valmistati eraldi jätkupunkti; Maci lähtekoodi ega varem väljastatud pakki ei muudetud.


<!-- SELQIRO_STORE_CATEGORY_AUTHORITY_ACCEPTED_20261110 -->
## 10.11.2026 — poe rubriikide õigusteparanduse kasutustulemus on vastu võetud

Kasutaja kinnitas pärast lõpetatud õigusteparandust: „poerubriigi lisamine õnnestus ja avalikul profiilil on kuulutus selle rubriigi filtris leitav“.
Ootel olnud salvestuse ja profiilifiltri kasutuskontroll on selle tulemuse ulatuses läbitud.
Varasem ülem- ja alamrubriigi loomise, nimevahetuse, seostamise ning eemaldamisel
kuulutuse säilimise vastuvõtt säilib. Paigaldajat, SQL-i ja läbitud katseid ei korrata.

Viimane raportiga kinnitatud paigaldus on `adfa3ae767712b5f71e9fac2d963a765f61fb444`,
10.11 kell 20:07:17 Europe/Tallinn, `database: verified`. Verceli sama commit’i
Ready / Production kuvatõmmis on vastu võetud. Uus kasutajakinnitus ei ole uus
Giti või SQL-kataloogi vaatlus ega kõigi vanade vormide või kontode katse.

Järgmine soovitus on ühendada hobusekuulutused enda poe rubriikidega, säilitades
`horse_offers` kanoonilise UUID. Teenused jäävad eraldi järgmiseks sammuks.
Selle töö koodi pole käesolevas vastuvõtus lisatud. Üks praegune seis ja järgmine
tegevus on `docs/continuity/CURRENT_STATE.json`-is; ulatus on
`docs/continuity/HORSE_STORE_CATEGORY_NEXT_20261110.md`-s.

See on eraldi dokumentide jätkupunkt. Selle dokumentide muudatusi pole Maci hoidlas rakendatud, commit’itud ega push’itud; järgmine kontrollitud lähteuuendus võtab need kaasa. Väljastatud lähte- ja paigalduspakid ning algsed raportid ja päevikud säilivad muutmata.

Allpool säilivad varasemad kirjed ja nende tõendipiirid muutmata. Nendes leiduv
ootel kasutuskatse, NEXT-pealkiri või paigalduskäsk ei ole praegune tööjuhis.



<!-- SELQIRO_HORSE_STORE_CATEGORIES_PREPARED_20261110 -->
## 2026-11-10 — hobuste poe rubriikide tervik ette valmistatud

Kasutaja volitatud järgmine samm ühendab olemasoleva hobuse muutmisvaate ja
avaliku profiili rubriigifiltri. Lisati väikesed UUID-lepingu/API/hook'i/kaardi
moodulid ning õhuke editori ühendus. Rubriigisalvestus säilitab pooleli oleva
teksti ja fotovaliku; ebaselge vastus nõuab lugemiskontrolli. Kinnitatud kogu
vormi reload loeb rubriigid uuesti; tühistamine säilitab töö.

Uus `horse_offer_store_categories` ja owner RPC-d kontrollivad serveris
salvestatud aktiivset identiteeti, omanikku või aktiivset äriliiget ning kogu
valikut. Category FK eemaldab ainult seoseid. Hobuse sisu/olek/tähtaeg/fotod
ja varasem haldus-RPC jäävad muutmata. Profiili uus v2 arvestab kanoonilisi
hobuseid; v1 leping/parser säilivad avatud vanade klientide jaoks.

SQL runtime 25/25 ning install/drift 34/34 PASS; API/ReactDOM 11/11 PASS.
Lõplik build 23.405 s / 626 sisendit PASS. Build'i järel Chromium 153 6/6 PASS,
101 runtime-sisendi räsid sobivad; English/Eesti ja desktop/390 px.
Auth/PostgREST/avalduse piirid on sünteetilised, välisvõrgupäringuid ja
konsoolihoiatusi/-vigu 0. Native SQL mitme sessiooni ajastust ei tõendatud.

Uuendaja kontrollib täpset adfa3ae/1475-failist alust ja eelmist lõpetatud
privaatraportit. SQL-first lisandus → eraldi verify → source/build → commit/push.
Alusraporti 11, SQL-adapteri 13 ja jätku 10 sihitud kontrolli PASS; lõpliku
manifesti päris kohaliku Giti/indexi/backup/commit/remote'i käigu tõend on pakis.
Peatumisel näidatakse unikaalset SAADA SEE FAIL raportit ja valitakse see Finderis.

CURRENT_STATE, genereeritud üleandmine, HOSTED_PORTAL, uus järjepidevuse kirje,
arhitektuur ning pikkade dokumentide uus ettevalmistuse päis on täiendatud.
Eelmise etapi vastuvõtu delta kantakse uue pakiga kaasa; vanad kirjed ja pakid
säilivad muutmata. Vana soovitusfail on tähistatud ajalooliseks kavandiks.

Maci rakendus, uus commit/push, SQL-i paigaldus, deployment ja kasutajavastuvõtt
on veel kinnitamata. Järgmine tegevus on uue paki üks käsk ja selle järel üks
olemasoleva avaliku hobuse salvestus/profiilifiltri katse. Teenuseid ega üldist
fotode taustakoristust selle sammuga lõpetatuks ei märgita.

<!-- SELQIRO_HORSE_STORE_CATEGORIES_ACCEPTED_20261110 -->
## 10.11.2026 — hobuse poe rubriigid on paigaldatud ja vastu võetud

Maci lõppraport kinnitab SQL-i järelkontrolli, build'i, commit'i
`d5e77e963f80cb4dab33e6e6667c44d4062c4bbc` ja push'i; lõpetamine 21:38:37
Europe/Tallinn. Kasutaja kinnitas hobuse rubriikide salvestamist, profiilil
leitavust ning lisatud rubriigi kaudu avamist. Neid lõpetatud samme ei korrata.
Verceli Ready/deployment-ID pole eraldi esitatud (`READY_NOT_CHECKED`).

Praegune seis on `docs/continuity/CURRENT_STATE.json`; täpne vastuvõtt on
`docs/continuity/HORSE_STORE_CATEGORIES_ACCEPTED_20261110.md`-s.
Järgmine soovitatud töö on teenuste ühendamine sama poe rubriikidega;
selle koodi ega SQL-i pole veel koostatud. Muud käivitamise piirid säilivad.
See dokumentide jätk ootab järgmisse lähtepakki kandmist; eraldi Maci kirjutust
või uut commit'i selle vastuvõtu vestluses ei tehtud.

Allpool säilivad varasemad kuupäevaga ettevalmistused ja piirid ajaloolise
tõendina. Nende ootel/NEXT käsud ei tühista eespool kirjeldatud vastuvõttu.

Raporti algfail säilib: 229019 baiti, SHA256
`d4055d78a78aaee0a3f191bfa2c47cde3ad9ea46436b19df2e3605723b9b12c3`.
Üks SQL apply sai kinnitatud vastuse, eraldi verify kinnitas applied seisu,
10 kaitset ning 3 säilinud invarianti. Storage'i toiminguid ei tehtud.
Paigalduspaki, raporti ja uuendaja kontroll oli ainult lugemine/räsivõrdlus;
olemasolevat runtime'i, build'i, SQL-i, Git-push'i ega kasutuskatset ei korratud.
CURRENT_STATE ja sellest genereeritud üleandmine, HOSTED_PORTAL ning käesolev
päevik on uuendatud uues dokumentide jätkupakis. Varasemad pikad dokumendid,
päevik ja väljastatud ZIP säilivad bait-baidilt.


<!-- SELQIRO_PROVIDER_CONTROLS_READONLY_PROBE_PREPARED_20261113 -->
## 13.11.2026 — logi katkestussündmus ja eraldi ainult lugemise kontroll

Uus olemasoleva Supabase logi eksport `supabase_logs.json` on 251119 baiti,
SHA256 `51ada5cd565387c6ea73cd50366ee0cc70fd39a93da1d152b8075af4e6c9bbed`.
Kõik 11 rida vaadati läbi. PostgreSQL 57014 `canceling statement due to user request`
on 14:16:15.901 Europe/Tallinn, 0,143 s enne recovery CLI exit 1 lõpu ajatemplit.
Algatajat ega otsest sessiooni seost eksport ei sisalda; inimese tegevust sellest
ei järeldata. Kohalik 180 s piir ei täitunud. Kaks plan-päist säilitavad kestused,
kuid kolm pikka event_message välja on 80003 märki ning lõpevad kärpemärgiga.
Kogu nähtav SQL vastab muutmata apply algusele; tegelik plaan ja JIT-andmed puuduvad.

Recovery 14:16:35 raport fe924a… jääb viimaseks esitatud Maci tõendiks:
verify absent, kõik 16 kaitset tõesed, samad invariandid; selle uuendaja
source/build/commit/push etapid ei alanud. Algne 955c935 teenuste kehtivuse
vastuvõtt säilib. Uut peitmise/blokeerimise paigaldust ega veebikasutust ei väideta.

Ette on valmistatud eraldi `selqiro-pakkuja-peitmine-kontroll-20261113` pakk.
See teeb kolm READ ONLY päringut: praegune metaandmestik ja advisory-luku kokkuvõte,
muutmata kontrolli SELECT-i EXPLAIN ANALYZE FALSE plaan ning sama SELECT-i
lugemine SET LOCAL jit=off seadega. Kõik 16 kaitset, räsivalemid, invariandid ja
hosted-konteksti leping säilivad. SQL statement_timeout on 20 s, CLI piir 90 s;
globaalseid seadeid, paigaldusskeemi, portaali lähtekoodi ega Giti ei muudeta.
JIT-i mõju jääb hüpoteesiks, mida uus vaatlus aitab uurida.

Skript peab alles kontrollima mõlema varasema päeviku täpseid baite, räsi,
inode'i ja metaandmeid ning hoidma olemasolevad lukud ainult lugemiseks avatuna.
Maci järelmõõtmist pole veel tehtud. Iga jooks saab oma uue privaatse nonce-kausta,
aruande unikaalse Downloads-koopia ja täpse `SAADA SEE FAIL` rea/Finderi valiku.
Viimase salvestuse vea korral märgitakse säilinud raport võimaliku varasema etapina.

Sihitud kohalike kontrollide täpsed tulemused ja sisendräsid: vt checks.
Vanu rakenduse build'e, äriteste, paigaldajaid ega teenuseühendusi ei korratud.
See diagnostika ei muuda rakenduse lähtekoodi ega vaja uut rakenduse buildi.
Uut skripti pole Macis ega pilves käivitatud. Järgmine üks käsk on uues
`docs/continuity/HOSTED_PORTAL.md` failis; saadetakse täpselt selle jooksu raport.
Algset ega recovery `--publish` käsku praegu ei korrata ning vanu faile ei kustutata.

Need on uue eraldi kontrollpaki dokumendid, mitte Maci/Giti dokumentatsioonimuudatus.
CURRENT_STATE uuendati ja üleandmine genereeritakse üksnes sellest seisukirjest.
Kõik selle sissekande eelnevad 119426 päevikubaiti säilivad muutmata; senised
NEXT-, oote- ja avaldamisjuhised on ajalugu. Väljastatud varasemaid pakke ei muudeta.


<!-- SELQIRO_PROVIDER_CONTROLS_OPTIMIZED_PREPARED_20261113 -->
## 13.11.2026 — lugemiskontroll vastu võetud, kontrollpäringu parandus ette valmistatud

Maci 15:26:39 raport (29868 B, SHA256
`3415a99e13217300291e09bce19cdcc583f92f4f373601b8decc8e0bc8857f0f`)
lõppes complete_readonly olekus. Kõik kuus lugemiskutset õnnestusid.
Pilve seis on endiselt absent ja kõik 16 kaitset tõesed; vastus võrdub
varasemate raportite kontrolliga. Algse ja recovery-päeviku täielikud baidid,
räsid, inode ja metaandmed säilisid mõlema hoitud lugemisluku all. See on
Maci jooksu saadud tulemus, mitte enam üksnes paigaldaja koodi lubadus.

Maci main/HEAD on 955c935 ja git status puhas. Origin-konfiguratsioon vastab
kinnitatud sihile; probe ei teinud uut täielikku 1607 faili/indexi räsikontrolli
ega GitHubi remote-main võrdlust. DB/source/Storage kirjutusi, buildi,
commit/push’i, deployment’i ega paigalduse jätkamist ei toimunud.
Viimane vastu võetud veebiversioon on teenuste aastase kehtivuse 955c935.

Metadata, plaani ja kontrolllugemise CLI kestused olid 7,257 / 14,471 / 13,363 s.
JIT oli juba konfiguratsioonis off. ANALYZE FALSE plaanil oli 4355 sõlme,
733 initplan’i, 457 subplan’i ja planeerimisaeg 445,744 ms; päringut see ei
täitnud. 63 veeru struktuurikuju vastas fixture’ile, kuid kolme veeru ACL-i
olemasolu erines. Kogu skeemi/õiguste võrdsust ega JIT-ist tingitud varasemat
katkestust ei väideta. Varasema logi 57014 sündmus on recovery tõrkega ajaliselt
kooskõlas; katkestaja päritolu jäi ekspordis määramata.

Uus eraldi parandus kasutab sama 122 tee delta ja kõigi 12 SQL-runtime-mooduli
muutmata baite. Muutuvad kontrollpäringu koostamine (11 CTE materialiseerimine),
range ühe rea / true tulemust nõudev kolm tehinguväravat, tarne kaitsed ja
viis jooksvat dokumenti. Kataloogi faktid, räsivalemid, 16 kaitset ning
24 tunni peitmise ja eraldi blokeerimise tooteleping säilivad.
Uue SQL-i 11/11 sihitud kontrolli (14 range värava alajuhtu) on PASS; sama
disposable keskkonna plaan vähenes 4623 sõlmelt 1075-le. See ei ole tootmise
plaani uus mõõtmine ega täitmisaja võit. Täpsed kontrollid, sisendräsid ja piirid on
uue paki kontrollid/ kaustas; vanu rakenduse teste ega paigaldajaid ei korrata.

Uue väljaande oma päevik seob ühe uue katse kõigi kolme täpselt läbi vaadatud
raportiga. Kõiki kolme varasemat päevikut hoitakse kogu jooksu jooksul
O_RDONLY lukuga ning nende baite kontrollitakse uuesti. Täpse värske absent'i
ja oma varasema kirjutuseta seis lubab ühe apply-katse; oma intent'i ei
taasesitata. Applied nõuab eraldi verify'd. Alles verified-tulemusest võivad
alata source/build/commit/push; sama advisory-lukk ja värske täielik Git-kontroll
kaitsevad vahepeal muutunud seisu eest. Raport on privaatne unikaalne Downloads-
koopia, mille täpne tee kuvatakse SAADA SEE FAIL real ja valitakse Finderis.

See uus parandus on ette valmistatud, Macis/pilves käivitamata. Üks järgmine
käsk on uues HOSTED_PORTAL.md-s: parandus-paki uuenda.py --publish. Peatumisel
saadetakse selle jooksu täpne raport; vanu originaal-/recovery-käske ega
lõpetatud probe’i automaatselt ei korrata. Kontosid, sisu, fotosid, sõnumeid,
päevikuid, intente ja varasemaid raportikoopiaid ei kustutata.

CURRENT_STATE on uuendatud, üleandmine genereeritakse olemasoleva
render_current_handoff.py abil ainult sellest seisukirjest. Kõik selle
sissekande eelnevad 122339 väljastatud probe-paki päevikubaiti säilivad muutmata.
Väljastatud pakid ja raportid ning ajaloodokumentide baidid säilivad; nende
vanad ootel-, NEXT- ja käivitusjuhised ei ole praegune tööjärg.


<!-- SELQIRO_PROVIDER_CONTROLS_PROFILE_PLACEMENT_20261113 -->
## 13.11.2026 — 40ceac78 paigaldus vastu võetud ja profiilimenüü paigutus täpsustatud

Maci 16:05:27 raport dfefda11c1ff922c397647eaf24afb95968729a465c182d02a415f67753e433e
(262247 B) seob optimeeritud väljaande manifesti 1f85c82b5440ad8b4636ef53a08478370d69110bb0e45a4db605d60775b18ba2.
Database verified, build passed, commit/push
`40ceac78deb255d8006244ae232652956b92bea0` on kinnitatud. 16:07:49 pilt
näitab sama 40ceac7 Ready / Production seisu. Lähtepuu on
44f8042ccefbd78bd80a212398504cc5b4ef6c8a, 1696 faili. Uus paigaldus ei
jätnud allikaid vana 955c935 juurde: see on nüüd ajalooline parent.

Viis transpordikäsku sisaldasid kaht repository_read’i ning preflight/apply/verify
kutseid kestusega 7,453 / 7,207 / 7,272 s. Eraldi verify andis applied,
kõik 16 kaitset ning säilinud pilve invariandid. Need ei ole SQL-i benchmark.
122 preimage’i, täielik algindex ja lõplik lähte/indexi/commit’i/remote’i
kontroll on seotud täpse runneri baitidega. Kolm vana päevikut säilisid
lugemislukkude all; Storage’i toiminguid ei tehtud. Vanu pakke ei muudeta.

Kasutaja näitas kaartidel ning profiilil menüüd ja ütles, et pole toiminguid
veel katsetanud. Seetõttu on kinnitatud deployment ja nähtav UI, kuid
peitmise, Undo, blokeerimise, sõnumikeelu ja aegumise kasutusvastuvõtt ootab.
Kasutaja uus püsiv paigutusotsus: ühine 24h peitmise / eraldi blokeerimise
menüü ainult avalikul profiilil; eemaldada tava-, hobuse- ja teenusekaartidelt.
Vestluse senine blokk ning Minu ala tagasivõtmine/haldus säilivad. Vaatamiste
koguse lävendit või uut jälgimist ei lisata.

Uus UI-kandidaat kasutab sama olemasolevat profile-sihti, serveri õigusi,
24h tähtaega, otsingufiltrit ja revision’iga kaitstud toiminguid. SQL-i,
RPC-sid, andmebaasi ega Storage’it ei muudeta. Source-only runner kontrollib
värskelt 1696 faili alust ja viimast edukat privaatraportit, hoiab selle
lugemislukku ning teeb lähte/build/commit/push’i. Andmebaasi- ja Supabase
CLI-kutseid on 0; vana SQL-i paigaldajat ei korrata.

Uue kohaliku UI production build: PASS, 25,276 s, 675 sisendit, drift 0;
sünteetilised teenuseväärtused ja olemasolevad lukustatud sõltuvused.
Sihitud DOM-i ja tarne täpsed tulemused on paki kontrollid/ kaustas. Uut
Maci kirjutust, commit/push’i, Vercelit ega kasutuskäiku veel ei väideta.
Järgmine üks käsk on selqiro-peitmine-profiilile-20261113 paki uuenda.py --publish;
saadetakse selle jooksu täpne SAADA SEE FAIL raport.

Uuendatud on CURRENT_STATE, sellest olemasoleva generaatoriga handoff,
HOSTED_PORTAL, VIEWER-jätk, arhitektuuri UI-paigutuse lõik ja AI_MEMORY otsus.
Eelmised kolm jooksvat dokumenti säilivad history/provider-controls-accepted-20261113/
all koos preservation.json räsitõendiga. Käesoleva sissekande eelnevad
125991 päevikubaiti ja muud varasemad ajalookirjed säilivad muutmata.
Kontosid, sisu, fotosid, sõnumeid, päevikuid ega raportikoopiaid ei kustutata.

<!-- SELQIRO_PROVIDER_CONTROLS_CONSISTENCY_REVIEW_20261113 -->
## 13.11.2026 — 371f4f4 lähteuuendus vastu võetud, blokeerimiskäigu ajajärg täpsustamisel

Maci 19:07:30 raport (253706 B, SHA256
`668d0f1f7c59ae4e684045fce6905df8acbefe7b6b34bbcbe16886d58457de8f`)
seob profiilile koondamise väljaande manifesti
`2ca5d4a86150f261baed7ddd140b9e09a582e3195a95612e9756d9a745073e2f`.
Stage complete, build passed ja push verified; commit
`371f4f4cc1ff62ecadb14d19bf5c8004cff256ea`, ainus parent 40ceac78.
Lähtepuu `57dd09fecd9258c05bebc985394532f203449e99`, 1701 faili.
Täielik 1696 kirjega algindex, 23 preimage’i, 18 asendust/5 lisandust/0 kustutust
ja puu on kontrollitud. Maci lõppkontroll ja remote-main’i võrdsus on seotud
saadud raporti ning täpse runneriga; uut Maci/GitHubi lugemist audit ei teinud.

See lähteuuendus ei teinud andmebaasi-, Supabase CLI- ega Storage’i toiminguid.
Eelmise eduka optimized-päeviku täielikud baidid, räsi, inode ja metaandmed
säilisid läbi uue jooksu hoitud lugemisluku all. Kolme veel vanema päeviku
säilimine jääb eelmise raporti ajalooliseks tõendiks. SQL applied/16 kaitse
viimane tõend pärineb 40ceac78 paigaldusest, mitte uuest SQL-lugemisest.
Uue 371f4f4 commit’i Vercel Ready / Production on eraldi kontrollimata;
varasema 40ceac7 Ready pilt ei tõenda uut deployment’i.

Kasutaja kinnitas peitmise ja Näita uuesti õnnestumise. 19:10:45 profiili
õnnestumisteade ning 19:12 Minu ala, tagasivõtmise dialoogi ja taas nähtava
kuulutuse järjestus toetavad seda vastuvõttu. Tegelikku 24 tunni möödumist
pole vaadeldud. Kasutaja kirjeldas eraldi mitme seadme blokeerimiskäiku:
blokeerija ei saanud saata, teine telefon sai enne värskendamist saata,
kuulutused ilmusid avalehel tagasi ja uuesti blokeerimise/värskendamise
järel toimis. See ei määra iseenesest serveri mutatsioonide järjekorda.

19:17:40 pilt näitab avatud Eemaldada kasutaja blokeering? dialoogi ja tollast
aktiivse oma bloki teadet; kinnitamise klikki ega lõpetatud eemaldamist pole
pildil. 19:21:34 pildil on 19:21 saabunud sõnum. Üks järgmine samm on küsida,
kas eemaldamine kinnitati ning kas enne seda sõnumit oli uus blokeerimine
juba kinnitatud. Dialoogi avamine, hilisem lehe värskendamine ega nähtav
sõnum ei tõenda üksi aktiivsest serveriblokist möödumist. Pildifailide kellaajad
ei ole sõltumatult kontrollitud serverisündmuste ajatemplid.

19:24:03 pildil on profiili päis/menüü olemas, kuid kuulutuste osa kuvab
Kuulutusi ei saanud laadida. Tegelik rada kasutab marketplace V2 lugejat,
mitte vana kasutamata profiilihooki; konto/revision’i võtmed ja katkestamine
on allikas olemas. Üldteade ei erista transporti, RPC-tõrget ja range vastuse
parsija tõrget. Selle eraldi lugemisvea konkreetne põhjus on lahtine.

Piiratud allikaudit leidis V2 send’i blokeerimiskontrolli ning mõlemat suunda
kontrolliva messages BEFORE INSERT kaitse ka legacy insert’i jaoks.
Värskendus ei ole serveri lubade tõend. Samas puudub vanema vestluse/legacy
sõnaselgel unblock-kirjutajal oodatava block id/created_at versioonikontroll
(CAS): hilinenud eemaldamistaotlus võib puudutada vahepeal taas loodud oma
blokki. Uus profiili/halduse setter kontrollib konkreetset versiooni.
See on eraldi kinnitatud allikaleid, mitte juhtumi tõestatud põhjus.
Üle vaadatud lugemis-/saatmisteedel automaatset unblock’i ei leitud;
pilve hetkeõigusi ega konkreetse juhtumi mutatsioonide ajalugu ei loetud.

Uued tõendid asuvad eraldi töökausta
work/selqiro-provider-controls-consistency-20261113/checks/ all:
profile-result-review-20261113-190730.json (28 võrdlust PASS, 51 pinitud
sisendit, drift 0; SHA256
275aaed6c829a8791ea9a86a2b9c5703cf14ec7f51a7089da98834e81bd63606),
root-consistency-review.json, client-consistency-review.json ja
client-block-writer-addendum.json. Need eristavad paigalduse PASS-i
lahendamata kasutuskäigust. Uusi teste, buildi, paigaldajaid, sõnumi saatmist,
blokeerimist või pilvetoiminguid ei käivitatud.

Valmis on ainult eraldi continuity-overlay: uus CURRENT_STATE, sellest
olemasoleva render_current_handoff.py puhta render-funktsiooniga handoff
ning see append-only päevik. Macis neid dokumente ei rakendatud ega
commititud; runtime’i ja SQL-i ei muudetud. Kõik selle sissekande eelnevad
129008 päevikubaiti säilivad bait-baidilt. Külmutatud profile-kandidaat,
väljastatud pakid ja raportid jäävad muutmata. Eelmise HOSTED_PORTAL-i
profile-paigalduskäsk on juba lõpetatud ajalugu, mitte praegune järgmine töö.
Vanu publish-/SQL-/recovery-/probe-käske ei korrata; sisu, kontosid, pilte,
sõnumeid, päevikuid, intente ega raportikoopiaid ei kustutata.

<!-- SELQIRO_PROVIDER_CONTROLS_UNCERTAIN_HISTORY_20261113 -->
## 13.11.2026 — kasutaja täpsustus jätab vana blokeerimiskatse ajajärje lahtiseks

Kasutaja mäletab, et 19:17 eemaldamise dialoogis ei vajutanud kumbagi nuppu,
jättis toimingu pooleli ja avas postkasti, kuid ei saa seda kindlalt väita.
Sellest ei järeldata kinnitatud unblock'i, kasutaja eksimust ega serveri
blokeeringu läbimurret. Sama mälu täpsustust enam ei küsita.

Järgmine samm on üks kitsas kahe olemasoleva testkonto kasutuskatse, millel
on selge algseis ja kinnitatud tegevuste järjekord. Telefonivestlus avatakse
enne arvutis kinnitatud blokki. Arvutis kontrollitakse Minu ala värske
lugemisega bloki säilimist; telefonile käsitsi refresh'i ei tehta. Ühe
selgelt eristatava testsõnumi puhul eristatakse kirjutamisnuppu, saatmiskatset
ja tegelikku saaja postkasti saabumist. Ebaõnnestumise korral säilitatakse
seis ja ajajärg. See ei ole tööriista kaudu sõnumi saatmine ega uus paigaldus.

Peitmise/tagasivõtmise vastuvõtt, 371f4f4 build/push'i tõend, uue commit'i
Ready-tõendi piir, eraldi vanemate unblock-kirjutajate versioonikontrolli
puudus ning profiili kuulutuste laadimisviga säilivad eelmise kirjeldatuna.
Ajalooline katse jääb ebaselgeks ka siis, kui uus kitsas kasutuskatse õnnestub.
Muudeti ainult eraldi ettevalmistatud järjepidevusdokumendid; Maci lähtefaile,
runtime'i, SQL-i, pakke ja raporteid ei muudetud. Käesolev kontrollitud
kasutuskatse on ette valmistatud, mitte veel kasutaja poolt läbi tehtud.

<!-- SELQIRO_PROVIDER_CONTROLS_TWO_DEVICE_ACCEPTED_20261113 -->
## 13.11.2026 — avatud telefoniga blokeerimise ja taastamise kasutuskäik vastu võetud

Kasutaja korduskatse: Garaazi telefon oli Taivo Garaazi vestluses enne uue
blokeeringu seadmist. Teise poole blokeeringu ja selle eemaldamatuse teade
ilmus kasutaja sõnul kohe; kirjutada ei saanud kumbki pool. Blokeeringu
emaldamise järel taastus telefonis kirjutamisvõimalus. See üks kontrollitud
kasutuskäik on vastu võetud; varasemat 19:17–19:21 ajajärge ei rekonstrueerita
uue katse alusel. Peitmise ja tagasivõtmise varasem vastuvõtt säilib.

20:02:30 arvutipilt toetab enda seatud bloki teadet ja mitteaktiivset
sisestusala ning säilinud sõnumiajalugu. Nähtav 19:21 kirje on varasem ajalugu.
20:02:48 postkasti veateade kaob ja 20:03:01 loend on taas nähtav; Garaazi
real on endiselt saatmise keeld. Uus tõend:
work/selqiro-provider-controls-consistency-20261113/checks/
two-device-acceptance-20261113-2003.json (3876 B; SHA256
`a67304fbc3fdbdbaea86f3bdacef7ab49fa26fe7c57712c7e3ff1af8408d740e`).
Telefoniteade/taastumine tugineb kasutaja kirjeldusele, mitte telefoni
kuvatõmmisele. Uut otsest INSERT-, DELETE-, pilvekataloogi või Vercel
Ready kontrolli ei tehtud; sellist tõendit sellest katsest ei järeldata.

Postkasti piiratud allikalugemine leidis, et üldine värskendamisviga tekib
aktiivse load() tõrke korral. Nähtav esileht loeb iga 7 s järel uuesti,
edukas vastus kustutab teate; quiet retry ajal eelmine teade säilib.
See sobib piltidel taastuva loendiga, kuid ei tõenda võrgu/RPC/parsingu
algset põhjust ega anna alust tõrget lihtsalt peita. 19:24 profiili
kuulutuste laadimisviga jääb eraldi põhjusega lahtiseks.

Üks järgmine tehniline muudatus on varem tuvastatud vanemate vestluse/legacy
unblock-kirjutajate versioonikontrolli ühtlustamine: hilinenud eemaldamine
ei tohi kustutada hiljem taas loodud enda blokki. See lähtekoodileid pole
kummagi kasutuskatse tõendatud põhjus. Toimiva kahe seadme katse kordust ei
paluta. Uue kliendi/serveri üleminek vajab oma kitsast kontrolli.

Muudeti ainult eraldi ettevalmistatud CURRENT_STATE-i, sellest genereeritud
handoff'i ning append-only päevikut. Kõik selle lisandi eelsed päevikubaidid
säilivad. Macis pole dokumente rakendatud ega uut commit/push'i tehtud;
väljaantud pakid, allikad, varasemad raportid ja sisu säilivad.


<!-- SELQIRO_BLOCK_REMOVAL_CAS_PREPARED_20261113 -->
## 13.11.2026 — kõigi blokeeringu eemaldamiste täpne versioonikontroll, ettevalmistatud

Kasutaja „teeme järgmise” autoriseerib varem allikast leitud kirjutuspiiri
paranduse. Alus on Macis vastu võetud 371f4f4, 1701 faili; selle build/push on
raportis kinnitatud. Peitmine/tagasivõtmine ning juba avatud telefonivestluse
kahepoolne blokeerimine/taastumine jäävad vastu võetud kasutuskäikudeks.
Varasema ebaselge katse ja postkasti/profiili mööduvate lugemisvigade põhjust
see muudatus ei diagnoosi.

25 runtime-failis (18 asendust, 7 uut väikest moodulit) on V2/legacy vestluse,
poeprofiili ja halduse eemaldamine ühendatud olemasoleva provider CAS-iga.
Kinnitus seob nähtud bloki ID ja täpse mikrosekunditega ajatempliteksti.
Muutunud/kadunud rida ei suuna vana kinnitust automaatselt uuele blokile.
Üks kirjutuskatse; ebaselge vastuse järel ainult selgesõnaline lugemine.
Vestlus kasutab tegelikku salvestatud peer-kontot, profiil oma serveri resolverit.
Mustandi/saatmise/lugemise senine prefix ja 12 kaitstud runtime-moodulit säilivad.

Uus eraldi supabase/repairs/20261113_block_removal sulgeb vana boolean-false
kirjutaja, brauseri otse-DELETE/UPDATE/TRUNCATE ning ID/aja ja sequence UPDATE
muutmise. Paaripõhine INSERT/idempotentne blokeerimine säilib. CAS-setteri
ainus kustutus delegeerib piiratud NOLOGIN/NOINHERIT/NOBYPASSRLS helperile;
invoker-trigger takistab vana JWT-kontekstiga defineri DELETE-t. Ajutine
schema CREATE ja SET/INHERIT eemaldatakse; täpselt pinitud postgres creator
ADMIN-only kirje (set=false, inherit=false) võib jääda. Hoolduse DELETE erand
nõuab postgres/service_role'i ning tühje JSON/sub/role JWT seadeid. Usaldatud
service-role UPDATE/TRUNCATE/sequence hoolduse üldpiiri siin ei muudeta.
Paigaldus ei kirjuta kasutajate eelistusi ega sisu. Vanad SQL-allikad on muutmata.

Kliendi 10 sihtkatset, 5 ReactDOM-kasutusjuhtu ning TypeScript 5.9.3 läbisid.
Next 16.2.1 webpack build läbis 24.062 sekundiga (683 sisendit, drift=0).
SQL-i 12 runtime- ja 7 installation/tamper-katset läbisid. Vana defineri keha
kloon jõudis uue triggerini ja keeldus; päris paralleelseid sessioone ei testitud.
Uued 13 receipt/report- ja 12 marker-transpordi kontrolli läbisid. Lõpliku
manifesti ajutise Giti tarnevoo ning sõltumatu review PASS on väljaande lõppvärav;
täpsed tulemused tulevad paki kontrollid/ failidest, mitte selle kirje olemasolust.
Native-brauseri/CSS-i katset ega live-sõnumite/SQL/Storage/CLI toimingut siin ei olnud.

Tarne järjekord: värske täpne lähte/HEAD/index/remote kontroll ja viimase eduka
profile-päeviku hoitud lukk → ainult lugemise metadata preflight → uus klient,
build, commit/push → täpne avalik kliendimärk → värske kontroll → üks SQL-intent
ja üks tehingukatse → eraldi tulemuse lugemine. 55 s markeriootuse jätk ei korda
lõpetatud build'i/commit'i/push'i. Teadmata SQL-tulemus ei anna kordusluba.
Public marker ei ole Verceli Ready/deployment-ID tõend ega uuenda vanu vahelehti.
Raporti cleanup_mode held on säilitatud lepingu silt, mitte uus koristuse vaatlus.

Uuendatud CURRENT_STATE, sellest genereeritud handoff, HOSTED_PORTAL, arhitektuur
ja püsireegel. Kolm täpset varasemat continuity-faili säilivad uues history-kaustas;
kogu varasem dev-log ja lisatud kasutuskatse üleandmine säilivad muutmata prefix'ina.
Uus pakett selqiro-blokeeringu-kontroll-20261113 on ettevalmistatud. Selle Maci
rakendamine/build/commit/push, SQL closure ja Ready on veel kinnitamata.
Järgmine tegevus on HOSTED_PORTAL-i üks uus käsk, täpne jooksuraport ja sama
commit'i Ready, seejärel ainult uus hilinenud kinnituse kasutuskatse.


<!-- SELQIRO_BLOCK_REMOVAL_AUTH_REPAIR_PREPARED_20261114 -->
## 14.11.2026 — klient 29b2457 avaldatud; SQL-i õiguste põhjus kinnitatud; eraldi parandus

14.11 15:50 raport kinnitab uue täpse eemaldamise kliendi Maci build’i ja
commit/push’i 29b2457893d6fa9bab2756533319fdc13b841840. Selle commit’i
Ready / Production kuvatõmmis on vastu võetud. 16:12:12 ja 16:12:20
kaks HTTP 200 vaatlust sisaldasid täpset avalikku kliendimärki. Seega vana
kliendi ooteolek on lahendatud; sama build’i/commit’i/push’i kordust ei tehtud.

16:12 raport: 283347 B, SHA256
098ab6ba0a1b040a2c8774453500a020dd8aff700a479433f7a281bd08466704.
Kõik 15 varasemat käsukirjet ning 12 markerivaatlust säilivad prefiksitena.
Uues raportis on 23 käsku, sh täpselt üks SQL apply. Apply kestis 6.997 s,
exit 1, stdout 274 B, stderr 27 B; 180 s piiri ei saavutatud. Eraldi verify
näitas 16:12:33 algset absent-seisu, kõiki üheksat kaitset ning sama kolme
invarianti/dependency/capability räsi. Vana päevik säilib stopped_preserved,
database unconfirmed, outcome unknown ja oma püsiva SQL-intent’iga.

Kasutaja logi supabase_logs (1).json (75037 B, 24 kirjet; SHA256
a26e30134fbbce26bfd6d5aa61fdef8bcaa6fb9ef1e1153d15aa9801ea40f934)
seob täpse 63729-baidise apply.sql räsiga
be9875629c007fa0407ecca4452beccab601bff2b8e588f9588a5bad412ed4cc.
14:12:26.699 UTC hoiatused 01007 kinnitavad, et auth-skeemi ja uid-funktsiooni
õigusi ei antud. 14:12:26.771 UTC 55000
BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED katkestas tehingu. See pole
kasutaja käsuviga ega tõend CLI timeout’ist. Hilisemad 14:41/14:43 lukuootused
on eraldi sündmused ning neid ei käsitleta selle tõrke põhjusena.

Eraldi paranduse selqiro-blokeeringu-parandus-20261114 SQL-alamkataloog
20261114_block_removal_auth jätab kogu vana 20261113 SQL-i muutmata.
Uus privaatne nullargumendiga postgres-omanikuga funktsioon kasutab olemasolevat
auth.uid() lahendust ning annab EXECUTE ainult kitsale CAS-kirjutajale ja
omanikule. RLS, helper ja trigger kasutavad sama silda. Auth ACL-i ega
require_actor’i lepingut ei muudeta, JWT-parsimist ei dubleerita ning
püsivat SET/INHERIT-õigust ei laiendata. Täpsed serveri paigalduse kontrollid säilivad.

Uue runneri piir: vana ebaõnnestunud päeviku muutmata hoitud lugemislukk,
värske 29b2457 Git/index/lähte/remote kontroll, algne DB absent samade
invariantidega ning olemasolev avalik kliendimärk; piiratud SQL-i ja
dokumentide rakendamine tööpuusse,
uus kontroll, üks kaitstud apply-intent ja katse, sõltumatu verify ning
piiratud Git-staging ja commit/push. Oma uue rakendunud SQL-i järel katkenud allikalõpetus
võib ainult kontrollida ja lõpetada, mitte SQL-i korrata. Kliendi build’i ega
läbitud klienditeste ei korrata. SQL/docs delta tõttu ei nõuta uut Ready-pilti.

Kohalikud uued kontrollid: PGlite PostgreSQL/WASM piiratud postgres-paigaldajal
13 runtime-juhtu ning 7 paigaldusjuhtu koos 11 rikkumiskatsega PASS.
Auth kasutusõigus on olemas, aga grant-option puudub. Täpne vana SQL
kordas mõlemad 01007 hoiatused, 55000 järelkaitse ning rollback’i algseisuni.
Auth owner/ACL/definitsioon, kontrollitud kasutajaread ja kolm enne/pärast
invarianti säilisid. SQL-tõendite sisendräside erinevusi ei olnud. Runneri
24 sihitud andmebaasi-, diagnostika- ja protsessijuhtu läbisid.
Täpsed SQL-tõendid on uue alamkataloogi result-failides; väljaande lõplik
manifesti/lähte/loaderi/Giti/päeviku kontrollseos ja integratsioonitulemus on
kontrollid/loplik-kontroll.json-is. Uus apply.sql SHA256 on
c006cb9c095dd2a02b58f93afae5ac42b27067d247796e307105b83348b918f5.
Uue applied-võimekuse pin on
38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854.
Delta: 33 teed (23 uut SQL-faili, 10 dokumenti), 5 asendust, 28 lisandust,
1732 muutmata alusfaili kaitset ning 1765-failine kandidaat.

Need on kohalikud sünteetilised tulemused; native PostgreSQL-i paralleelseansse,
päris Supabase’i rakendamist, uue paranduse Maci source-applied ega
commit/push’i need ei tõenda. Üks järgmine käsk on uues HOSTED_PORTAL-is:
selqiro-blokeeringu-parandus-20261114/uuenda.py --publish. Saadetakse selle
jooksu täpne SAADA SEE FAIL raport. Vana uuendajat ega intent’i ei korrata/nullita.

CURRENT_STATE on uuendatud; üleandmine genereeritakse olemasoleva pinitud
render_current_handoff.py puhta render() funktsiooniga. Kolm 29b2457
continuity-faili säilivad bait-baidilt history/block-removal-stopped-20261114/
all. Käesoleva lisandi eelnevad 141318 päevikubaiti säilivad muutmata.
SERVICE_ACCESS ja selle ajaloolised kuupäevad jäävad muutmata; praeguse seisu
allikas on CURRENT_STATE. Kontosid, sisu, fotosid, sõnumeid, kasutaja
päevikuid, raporteid ega väljastatud pakke ei kustutata.


<!-- SELQIRO_PROVIDER_STATE_FEEDBACK_PREPARED_20261115 -->
## 15.11.2026 — 3aaebc6 vastu võetud; varasema seisupildi kuvaparandus ette valmistatud

14.11 tegelik raport kinnitas SQL-i auth-paranduse ühe apply ja sõltumatu
verify, applied-seisu, üheksa kaitset ning kolme invariandi säilimise.
Commit/push 3aaebc6d663e6d11c02c49bed502b32ed4312852 ja sama commit’i Ready /
Production on vastu võetud. 15.11 kasutaja „kõik toimis sinu kirjelduse järgi”
ning viis pilti kinnitasid uue blokeeringu säilimise pärast vana kinnitust.
Unknown-teade säilib täpse erisusena; selle päringu HTTP/RPC põhjus ei ole teada.
Varem loetud paneeli tekst polnud värske lugemise tõend. Need lõpetatud
SQL-i ja blokeeringu kasutuskatse sammud asendavad vanemate päevikukirjete
ettevalmistamise ja ootel-oleku ainult praeguse seisu mõttes; algkirjed säilivad.

Kasutaja „jätkame” alusel on ette valmistatud väike kuvaparandus. Neli
runtime-faili tuletavad paneeli olemasolevast seansiseisust: ready/saadaval
näitab „Seis viimase kontrolli ajal”, muu varasem seis „Varem loetud seis”
koos selgitusega. Vana sihi puudumisel eelistuste paneel peidetakse, et
mitte väita uue blokeeringu puudumist. Seansimudel, RPC, SQL, CAS, konto-
ja vastusekaitsed ning automaatse korduse keeld on baiditäpselt muutmata.

7/7 uut sihttesti PASS; täielik Next 16.2.1 webpack build ja TypeScript PASS,
675 runtime-/seadistussisendit, drift 0, 28 staatilist lehte. Esimese build’i
keskkonnast puudus olemasoleva AI-marsruudi muutuja; sama lähtekoodiga teine
katse läbis inertsete kohalike build-väärtustega. Esimene tõend säilib.
Tegelik brauserikontroll jäi keskkonna piirangute tõttu tegemata. Kohalik Chromium peatus socket()-õiguse vea tõttu enne ühegi testijuhu käivitumist. Lubatud CDP-brauser ei pääsenud kohaliku HTTP-serverini ning selle file-URL katse keelas brauseri turvapoliitika. Edasised brauserikatsed lõpetati; käesolevat kasutajaliidese tulemust pärisbrauseris ei ole kinnitatud.
Uuendaja 14 sihitud kontrolli läbisid. Lõpliku loaderi, manifesti ja ajutise
Giti kontroll on väljaande kontrollid/loplik-kontroll.json-is koos piiridega.

Tarne: selqiro-salvestatud-seisu-teade-20261115, 19 teed, 8 asendust, 11 lisandust,
0 kustutust; 1757 muutmata alusfaili kaitset, kandidaat 1776 faili.
Uuendaja kontrollib 3aaebc6 alust ja edukat originaalpäevikut, rakendab
ainult payloadi, teeb uue sihttesti ja build’i ning täpse commit/push’i.
SQL-i, Storage’i, teenuste ühendamist ega sõltuvuste paigaldust ei tehta.
Lõpetatud etappe jätk ei korda; ebaselge protsessi tulemus peatab.

Uuendatud CURRENT_STATE, sellest genereeritud handoff, HOSTED_PORTAL ja
arhitektuuri lisand. Täpsed kolm baasdokumenti säilivad uues history-kaustas;
selle lisandi eelnevad 146075 päevikubaiti ning 17474 arhitektuuribaiti säilivad.
Uus Maci rakendamine, commit/push ja Ready / Production on veel kinnitamata.
Üks järgmine tegevus on HOSTED_PORTAL-i uus käsk ja selle täpne SAADA SEE FAIL
raport. Varasemat SQL-paigaldust ja vastu võetud blokeeringukatset ei korrata.


<!-- SELQIRO_JOBS_PUBLIC_PREPARED_20261116 -->
## 16.11.2026 — avalikud tööpakkumised, jagamine ja ühised värvid ette valmistatud

447d1a4 Maci commit/push, Ready / Production ning kasutaja uue seisukirjelduse
pilt on vastu võetud. Uus kandidaat tuletati selle täpsest 1776-failisest
inventuurist. Vana profiili/otseviite-põhise töö alguse plaani asendas kasutaja
otsus teha tööotsing kohe avalikuks; varasem väljastatud plaan säilib muutmata.

Üks kanooniline jobs domeen ühendab ettevõtte profiili, avaliku otsingu,
otseviite, Minu ala halduse ja olemasoleva sõnumikanali. Kasutaja avaldab ühe
tegevusega; serveri mustandi/avaldamise püsivad kviitungid ja revisjonikontroll
säilitavad katkestusest jätku. Tavaline osalemine ei vaja Energy ostu. Üks
UTC kalendrikuu ja teadlik pikendus säilitavad staatuse ning orgaanilise
avaldamiskuupäeva. Optional salary liigub täpse kümnendtekstina.

Ühine jagamine katab tavakuulutuse, hobusepakkumise, teenuse ja töö. Anonüümne
public-RPC metadata ning puhas kanooniline URL ei kasuta omaniku sessiooni.
Merevaigukollane/türkiis/sinine on ühises teemas lisamis-/avaldamisnupu ja
vestluse pakkumiskaardi jaoks. Saatja sõnumimullide eristus ning ajaloolised
kaardid säilivad. Praegune tööviide puhastatakse teise pakkumise valimisel.

40 kliendijuhtu (22 töö, 10 jagamine/meta, 8 sõnumikontekst), 17 SQL-i
sihtkontrolli ning täielik Next/TypeScript build läbisid. Build'i 729
sisendi drift on 0; 31 staatilist lehte. Esimene build väljus 0-ga, kuid
selle jooksu ajal muutusid kolm veateate moodulit; esimene tõend säilis ja
lõplik stabiilne build läbis. SQL kasutab mitte-superkasutajast paigaldajaga
päris PostgreSQL/WASM-i; Auth grant-option puudub. Fixture'i paranduste
FAIL-raportid ja põhjused säilivad test-history.json-is. Native paralleelseansse,
hosted andmebaasi, päris kasutajaid ega Storage'i ei kasutatud.

Brauserikatse jäi BLOCKED: CUA andis kohaliku /v2/jobs HTTP-avaja kohta
ERR_CONNECTION_REFUSED. Paigutust, native share'i ning tegelikku kasutusteed
ei märgita läbinuks. Uue Maci allika/SQL-i/commit-push'i/Productioni tulemused
on veel puudu. Need eristatakse kohalikust ettevalmistusest.

Uuendaja kasutab uut eraldi päevikut, täpset eelmist edukat originaalraportit
ja kogu aluspuu/indexi/lähte/remote'i kontrolli. Build/testid eelnevad ühele
SQL-tehingule; sõltumatu verify eelneb commit/push'ile. Kadunud vastus ei
põhjusta automaatset korduskirjutust. 14 protsessi/raporti/Giti ja 8 andmebaasi
jätkutee sihtkontrolli ning väljaande lõplik päris ajutise Giti tarnekatse
on paki kontrollid/ all koos sünteetiliste piiridega.

CURRENT_STATE, genereeritud üleandmine, HOSTED_PORTAL ja uus arhitektuur
on uuendatud. Kolm baasi continuity-faili säilivad history-kaustas täpselt;
selle lisandi eelnevad 149182 päevikubaiti säilivad. Üks järgmine käsk on
selqiro-too-ja-jagamine-20261116/uuenda.py --publish ning saadetakse selle
jooksu täpne SAADA SEE FAIL raport. Väljastatud pakke, kasutaja muudatusi,
kontosid, sisu, fotosid, sõnumeid ega päevikuid ei kustutata.


## 16.11.2026 — töö kasutuselevõtt ja aktiivse profiili tüübi parandus

Vastu võetud tegelik jobs-jooks lõpetas 12ff2bb111944c463a6c1797cc3cbf35046de6e1,
Maci sihtkontrolli/build’i, ühe SQL-tehingu eraldi verify-ga ning kinnitatud push’i.
Kasutaja pilt kinnitab sama commit’i Ready / Production; töö tühivaade ja
Minu ala värvinupud on nähtavad. Täpne raport SHA256
ed91af6c909b5e13e023219fe155f9f6bddf9c12c372e7108b88a08eafdf76c1.

Pildi Eraisik silt viis vana adapteri lähtekoodiveani: profiili RPC ei anna
tüüpi, kuid lugeja nimetas puuduva tüübi private-iks. Ette valmistatud
parandus kasutab sama aktiivse ID lubatud identiteedirea tegelikku tüüpi
ja kontrollib konto/ID seost üle päringute. 17 uue sihtkontrolli ja
täielik build PASS; brauseriseis BLOCKED. SQL-i ei muudeta ega korrata.

Paranduse Maci rakendus, uus commit/push ja deployment on veel kinnitamata.
Uus lähtekoodi uuendaja ning selle katsed on eraldi väljaandes; varasemad
pakid, algsed raportid ja ajaloolised dokumendibaidid säilivad. Üks järgmine
käsk on HOSTED_PORTAL.md-s; pärast avaldamist kontrollitakse töö lisamise vormi.


## 17.11.2026 — töö avaldamine vastu võetud; teenuste ja töö jaotiste kujundus

Vastu võetud tegelik identiteediparanduse jooks lõpetas 0e9197e250e19f260a6b92ab4dec96c89ca1a183,
Maci sihtkontrolli, build’i ning kinnitatud push’i. Raport 277904 B,
SHA256 91563403068f36e42046467672e471c52c3978fb14b01589bffd319490a31c13. Kasutaja
kuvatõmmis kinnitab sama commit’i Ready / Production. Kasutaja kinnitas
tööpakkumise lisamise ja nähtavuse töö rubriigis ning Minu alas; pildil on
ka avalik detail. Neid katseid selle kujunduse pärast ei korrata.

Kasutaja soovis teenustele ja tööle kuulutustega sarnast heledat raami ja
ülaserva. Ette valmistatud esitlusmuudatus kasutab ühist offerTheme
kogumiabilist: teenused rohekad, töö sinine, 6 px ülariba, valged sisekaardid.
Ulatus on otsing, Minu ala ja avaliku profiili kogumid; andme- ja
õiguskontrollid ei muutu. 10 runtime-faili ülevaatus ning täielik build
PASS; brauseriseis BLOCKED. Rakenduse sihtkatseid ei lisata ega korrata.

Kujunduspakk on eraldi ette valmistatud. Selle Maci rakendus, uus
commit/push ning deployment on veel kinnitamata. Uuendaja on build-only
ja lähtekoodipõhine; SQL-i, Supabase CLI-d ega Storage’it ei kasutata.
Varasemad pakid, aruanded ja kolme continuity-faili täpsed baidid säilivad.
Üks järgmine käsk on HOSTED_PORTAL.md-s.


## 17.11.2026 — teenuste ja töö kujunduse tegelik vastuvõtt

Vastu võetud tagastatud Maci raport: 279207 B, SHA256
13c5644cd5ceb14c86b19f6e8eb82690a1d35bd022aa85c20d73b3df85efc753.
Release a2d6d124cede61be38d06ac7dad419e5e0228732c58cb4a5136868cd221c0ea9,
commit 8c3c8e49a4dfe30799d125b4d45a61003ba5b911, parent 0e9197e.
Jooks 17.11.2026 kell 12:45:05–12:45:37 Europe/Tallinn: complete,
build passed, push verified, tests not_required_style_only,
database/storage not_performed. Eelmise paigalduse raport säilis.

Täielik alusindex, payload, eelkujutised ja muutumatute failide räsid
kattuvad väljastatud paketiga. Tuletatud lõpp-puu sisaldab 1874 faili ja on
7f6ea576188db59d16ee89811521c7a871814730. Väljastatud ZIP säilis muutmata.

Kuus kasutaja töölauapilti kinnitavad teenuste rohekat ja töö sinist
kogumikujundust avalikus otsingus ning Minu alas; tööpakkumine on nüüd
nähtavalt ka avalikul profiilil. Ülaribad ja valged sisekaardid on nähtavad,
kuulutuste kollane vorm säilib. Verceli Ready/Production on raportis
READY_NOT_CHECKED; kitsas ekraan, tegelik jagamine ja pakkumise kontakt
jäävad selle saadetise ulatusest välja. Varasemat BLOCKED kohalikku
brauserikatset ei kirjutata ümber.

Vastuvõtt ei käivitanud uut build’i, testi, paigaldust, sõnumit ega pilvekirjutust.
Järjepidevuse uuendus on eraldi kaasasolevas vastuvõtupakis; see ei kuulu
commit’i 8c3c8e4 ega ole kasutaja hoidlasse rakendatud. Kolm ettevalmistusseisu
faili ja kogu eelnev arenduslogi prefiks on säilitatud baiditäpselt.


## 18.11.2026 — selgemad sõnumimullid ja tervikuna avatav töökaart

Kasutaja kaheksa uut pilti kinnitavad töö jagamisakna avanemist ning tegelikku
kahepoolset vestlust töö ja tavakuulutuse kohta. Välise jagamise lõpuleviimist
ega anonüümset otseviidet need eraldi ei tõenda. Varasem 17.11 kujunduse
vastuvõtt on käesolevasse jooksva seisu dokumentatsiooni üle kantud; selle
algne kirje ning kogu eelnev päevik säilivad.

Ette valmistatud kolm UI-faili muudavad enda mulli #d4ebdc roheliseks ja
saabuva mulli #f1f3f5 helehalliks; tekst ja kellaaeg säilitavad hea kontrasti.
JobCard on nüüd tervikuna üks native Link nii otsingus kui avalikul profiilil.
Sõnumi pakkumiskaart oli juba terviklink, millel on nüüd nähtavam hiire- ja
klaviatuurifookus. Pakkumiste kollane/rohekas/sinine kontekst säilib.

Täpsete kolme lähtefaili ülevaatus ja üks täielik build PASS; 729 sisendi
drift 0. Brauseriseis BLOCKED; näidise ulatus ja tõendid on väljaande
kontrollid/browser-result.json-is. Väikese esitlusmuudatuse pärast ei
korrata vastuvõetud avaldamis-, identiteedi-, SQL-i ega sõnumitranspordi katseid.

Uus eraldi lähtekoodi uuendaja on selqiro-sonumite-ja-kaartide-parandus-20261118. Senine
8c3c8e4 lähtepuu ja eelmise eduka jooksu täpne originaalraport on aluseks.
Kolm alusdokumenti säilivad history/message-card-usability-base-8c3c8e4-20261118
all baiditäpselt. Maci rakendus, uus commit/push ja deployment on veel
kinnitamata. Üks järgmine käsk on HOSTED_PORTAL.md-s. SQL-i, Supabase CLI-d,
Storage’it ega kasutajaandmeid selles sammus ei muudeta.


## 18.11.2026 — 413e8fc vastu võetud; tumedam enda sõnumimull

- Tagastatud sõnumite/kaartide raport 279208 B, SHA256 da455ed3d14d6dc2fd6ea48043c50e20af153857479a28078144eba12edfeeb6: complete, build passed (11,071 s), tests not_required_presentation_only, push verified; commit 413e8fcb3b94fbd307e2d46645fed991306e9476, parent 8c3c8e4. Eelmise päeviku säilimine kinnitatud; DB/Storage not_performed.
- Sõltumatu kontroll sidus 1879-faililise puu b1430ad427acd1105ccc82e1e3a2b43d8457d529 raporti, väljastatud paketi ja säilinud allikaga. See ei ole uus live-Maci eksport. Kasutaja 11.54.52 Verceli pilt näitab sama 413e8fc Ready / Production olekut; 12.02.19 vestluspilt näitab heledat senist paletti. Terviklingi klõpsu või uut tumedat kujundust neist ei järeldata.
- Kasutaja soov: enda poolel hele kiri tumedamal taustal, vastaspool senise heleda tooniga. Üks runtime CSS-fail muudab enda mulli #176b4b taustale ja valge tekstiga; kellaaeg/laadimisteade #d7ebdf, foto kordusnupp ja fookus heledad. Pakkumiskaartide konteksti värvid, native-terviklingid ning vasak/parem paigutus säilivad.
- Kohalik ühe faili ülevaatus ja üks täielik Next.js/TypeScript build PASS; 729 sisendit, drift 0. Arvutatud enda teksti kontrast 6,48:1 ja kellaaja kontrast 5,20:1. Rakenduse vanu funktsionaalseid katseid ei korratud.
- Brauseri visuaalne kontroll BLOCKED: eelmise sammu käivituspiirang ja kohaliku file-URL-i turvakeeld on säilitatud tõend; uut katset ega ümbersõitu ei tehtud. Uut paletti brauseris kontrollituks ei nimetata.
- Kolm 413e8fc ettevalmistusdokumenti on baiditäpselt arhiivitud outgoing-message-contrast-base-413e8fc-20261118 alla; varasemad arhiivid ja päeviku prefiks säilivad. Uus outgoing-message-contrast-20261118 uuendaja teeb eraldi kontrollitud lähteparanduse. Uue kandidaadi Maci raport, uus Ready / Production ja tegelik välimus on järgmised kinnitused.


## 2026-11-20 — AI sulgemine avamiseks; profiili ja reklaami tööpiir

- Kasutaja kinnitas lihtsama konto/profiili ning ilma tasulise AI-ta avamise suuna.
  7c7bc11 sõnumimull on 19.11 raporti ja Productioni piltidega vastu võetud;
  varasemat paigaldust ei korratud.
- Uus isoleeritud kandidaat sulgeb mõlemad AI POST-teed enne kõiki sõltuvusi
  ning eemaldab vana /sell vormi AI-kutsed ja correction-write'i. Kuulutuse
  tavaline insert, fotod ja mustandi taastamine säilivad.
- Tegelike handlerite test 12/12 PASS, täielik Next.js/TypeScript build PASS
  (730 sisendit, drift 0), sõltumatu runtime-ülevaatus ilma blokeeriva leiuta.
  Uue Maci runneri simuleeritud tarnekontrollid on paketis eraldi.
- AI Energy ajaloolised reserveeringud on muutmata ja live-inventeerimata.
  Profiili õigused, avalike andmete piir ja sõltuvuste riskid jäävad järgmisteks
  avamiseelseteks töödeks; üldist turvalisuse kinnitust ei anta.
- Reklaamikavand kasutab üht sisselogimist ja valikulist avalikku profiili.
  Väline veebireklaam on senise Selqiro objekti esiletõstmise eraldi laiendus;
  esimene lihtne tee on päring koos käsitsi ülevaatusega. Reklaami/makseid
  käesolev pakett ei ava.
- Muudatus on kohalikult ette valmistatud. Maci rakendus, commit/push ja
  Verceli vastuvõtt on veel kinnitamata. DB, Storage ja kontoandmed muutmata.


## 20.11.2026 — 5312ea0 ja profiili lugemiskontroll vastu võetud; lugemisprivaatsuse parandus

- AI sulgemise Maci raport, commit 5312ea0 ja sama commit’i Ready / Production pilt vastu võetud; vanad failid ja päevikud säilivad.
- Kell 15:49 tehtud ühe metadata-päringuga koguja lõpetas edukalt, lähtepuu/indeks/remote muutmata. Kinnitatud avalike profiilitabelite liiga lai SELECT ning eraisiku täpse asukoha tagastamine avalikus RPC-s. Kasutajasisu ridu ei loetud.
- Uus eraldi ettevalmistatud parandus sulgeb liigse lugemisligipääsu ja kontrollib oma aktiivse profiili lugemise õigust. Kuulutuse müüjakaart, päise profiililink ja „Minu ala” paketiinfo kasutavad kitsaid RPC-sid. Olemasolevate liikmesusreeglite rekursioonist mõjutatud üleliigsed toortabelipäringud eemaldatakse. SQL rollikatsed, rakenduse sihitud test ja build ning uuendaja tõendid on paketis.
- Uue paranduse Maci rakendus, DB järelkontroll, commit/push ja uus deployment on veel ootel. Uut profiiliredaktorit ega pilditeed ei avata; kirjutusõiguste/versiooni, tasemeväljade kaitse ja kanonilise pildiallika töö järgneb.
- Kasutaja täpsustatud reklaamisuund: automaatne avalik riigipõhine hinnakiri ja iseteenindus on põhitee; ühine alghind ning erihinna valmidus. Varasem käsitsipäringu soovitus on asendatud. Täpne kavand on advertising-pricing-self-service-plan.md-s.


## 20.11.2026 — lugemisprivaatsuse uuendaja kontrollfaili asukoha parandus

- Esimese privaatsuspaketi release `09cc0246f5085b93e02728649f0ed9c8aceb47e33e0384ae678de3f80ea7053b` peatus kell 16:34 `started` etapis veaga `PREVIOUS_RELEASE_RECEIPT_REQUIRED`. Tagastatud 546-baidise raporti SHA256 on `cc2c7d34e4da055faf48b006bc4df3c830bd5b62a87c077b269ef7e1012ca3c9`; database `not_started`, test/build/push `not_run`, commit `null`, commands `[]`. Lähtekoodi, andmebaasi ega avaldamise muutusi ei tehtud.
- Põhjus leiti uuendaja ja koguja failipaigutuse erinevusest: koguja salvestas `FILE_MANIFEST.json`-i ainult ZIP-i, kuid uuendaja otsis seda kaustast. Vana kohalik kaustatest lõi ise ka selle faili ja ei tuvastanud viga. Algse eksportija taasesitus andis kasutaja tagastatud ZIP-iga baiditäpselt sama faili.
- Uus eraldi `selqiro-profiili-lugemisprivaatsus-jatk-20261120` jätkupakett kontrollib kaustas algseid result/catalog-faile ja loeb kolme kontrollitud ZIP-liikme sisu mälus. Puuduvat manifesti ei lisata kausta. Peatunud käigu täpne algne raport ja olemasolev lukk hoitakse ainult lugemiseks; varasema käigu muutumine peatab jätkamise.
- Algne väljastatud ZIP, runner, kõik raportid ja ajaloolised dokumendid säilivad muutmata. Rakenduse lugejate, rakendustesti ja SQL-i baidid jäävad samaks; uuendaja paranduse katsed ja dokumendimuudatused on eraldi. Jätkupaketi Maci rakendus, DB järelkontroll, commit/push ja uus Ready / Production on endiselt ootel. Portaali uut funktsionaalset ulatust ei lisata.


## 20.11.2026 — profiili kataloogikontrolli lokaadist sõltuva järjestuse parandus

- Kell 17:16 peatunud jätkukäigu originaalraport 284433 B, SHA256 `522fbb2910f4afc112a2bd444f9b76dbc5ec5ba93a31904adeeb2c6c4536b843`: `baseline_verified`, `DATABASE_PRECONDITIONS_NOT_MATCHED`. Üks edukas read-only preflight; DB `not_started`, test/build/push `not_run`, commit `null`. Varasem väljastus säilis; uut rakendust ei toimunud.
- Samade kinnitatud metadata väärtuste 11 massiivi lokaadipõhine järjestamine taastoodab täpselt saadud `0fee6aa5265d1213dd0e7be3b841135442affb2dc75fcbfcdc5b9802b50b8eb8` räsi. Ükski õigus, poliitika ega muu väärtus ei muutu. Viga on JSON-teksti vaikimisi kollatsiooni ja kohaliku C-järjestuse erinevus; JavaScripti en-US ning PostgreSQL-i unicode-katse kinnitavad seda sõltumatult.
- Uus eraldi `selqiro-profiili-kontrolli-parandus-20261120` määrab SQL-i kanoonilise tekstijärjestuse selgelt C-ks. Algne enne/pärast seisuleping, õiguste muutuse tõrjumine, rakenduskood ja sisuline privaatsusparandus säilivad. Tundmatut räsi ei muudeta lubatud seisuks.
- Väljastatud ZIP-id, originaalraportid, migratsioonid ja ajalooline lähteüleandmine säilivad; päevikule lisatakse ainult see lõik. Uue paketi Maci rakendus, DB järelkontroll, commit/push ja sama commit’i Verceli Ready / Production tulemus on veel ootel. Järgmine üks käsk ja oodatud `VALMIS`/`SAADA SEE FAIL` tulemus on HOSTED_PORTAL.md-s.


## 20.11.2026 — d654033 ja salvestamise kataloog vastu võetud; Minu profiil

- Lugemisprivaatsuse parandus on vastu võetud algse eduka Maci raporti ja sama d654033 commit’i Ready / Production ekraanipildi alusel. Vana raporti tootmiskontrolli välja ei muudeta. Kella 19:31 uus salvestamise metadata-koguja kinnitas sama 1900-faililise lähtepuu ja SQL-i järelseisu; üks lugemispäring, lähtekood/indeks/remote muutmata, kasutajasisu ekspordita.
- Uus eraldi kandidaat lisab ühtse „Minu profiili” teksti- ja asukohavormi. Avalik nimi, kirjeldus, veebileht, riik ja linn/piirkond on muudetavad; ettevõttel on eraldi vabatahtliku avaliku külastusaadressi valik. Eraisiku vorm ei küsi täpset aadressi. Profiili tüüp, omanik, tasemeväljad ja pildiaadressid ei kuulu salvestusobjekti.
- Iga lugemine ja salvestus seotakse värske kasutaja, aktiivse identiteedi, omanikuõiguse ja loetud profiiliversiooniga. Kaks avatud vormi ei kirjuta vahepeal salvestatud muudatust vaikides üle. Nimi uuendatakse profiili ja identiteedi allikas ühes tehingus. Hilise või ebaselge vastuse korral kontrollitakse tulemust uue lugemisega; automaatset kirjutuse kordamist pole.
- Vana /profile suunab uude vaatesse. Konkureeriv vana asukohavormi sidumine ja Premium-kutse kasutajateed eemaldatakse. SQL sulgeb laiad kliendikirjutused ja vanad laiad profiili/asukohakirjutajad. Uus registreerimine, kontotüübi muutmine, ettevõtte üleandmine ja tasulised paketid ei ole selle väljastuse töö.
- Vana avaliku kirjelduse varuallikas arvestatakse omaniku vormi alglaadimisel. Selgesõnaline tühjendamine jääb tühjaks ega too vana kontokirjeldust tagasi. Veebilehte kuvatakse eristatava välislingina; server ei laadi seda salvestamiseks alla.
- Tegelike rakendusmoodulite sihitud katsed 40/40 PASS; täielik Next.js/TypeScript build PASS, 901 sisendit, drift 0. Esimene kontroll peatus vanale asukohavormile toetuva aegunud testi tõttu; testi ootus parandati uue teekonna järgi ja algne ebaõnnestunud tõend säilib. SQL-i käitumise, täpse metadata-lepingu ja uuendaja kohalike katsete eraldi tulemused seotakse paketi kontrolltõendites kontrollsummadega.
- Kolm senist continuity-faili säilivad baiditäpselt profile-editor-base-d654033-20261120 all. Uue selqiro-minu-profiil-20261120 paketi Maci käik, SQL-i järelkontroll, commit/push ja Verceli vastuvõtt on veel ootel. Üks järgmine käsk on HOSTED_PORTAL.md-s.
- Järgmine töö pärast vastuvõttu on ühtne profiilipildi/logo lisamise, vähendamise, asendamise ja eemaldamise tee, seejärel sõnumite profiilipilt ja avalik profiililink. Praegune parandus ei muuda pildifaile ega pakkumiste/vestluste sisu. Reklaami automaatse hinnakirja ja riigipõhise erihinna suund säilib eraldi kavandis.


## 2026-11-20 — managed profile media (prepared release)

Accepted profile editor `ab5d1d8` and its matching Ready / Production screenshot. The later read-only Storage collection confirms the unchanged 1,917-file tree and actual identity-media policy boundary. Prepared a separate media revision, owner-authorized immutable image pipeline, canonical avatar projections, optional cover fitting and public conversation profile links. The new Mac execution and production deployment remain pending. See `docs/architecture/profile-media-20261120.md` and the current handoff; previous handoff bytes are preserved in `docs/continuity/history/profile-media-base-ab5d1d8-20261120`.

## 2026-11-21 — profile avatar framing and message visibility (prepared)

Accepted the completed 68c3996 media-load repair and the user's image saving/public display evidence. The user also confirmed the existing message-avatar public-profile navigation. Prepared a source-only enhancement: larger correspondent avatars, circular local framing with zoom/pan, explicit whole-image mode for logos, and separate fit/apply/save actions. Repeated framing uses the retained prepared original and cannot reuse an uploaded asset ID for changed bytes. The new package is pinned to the accepted 1,955-file tree and exact previous receipt; prior packages and historical continuity bytes remain preserved. No database operation or new paid/image dependency is introduced. New Mac/deployment acceptance remains pending; local evidence is included with the issued package and does not claim a real Safari run.

## 2026-11-21 — avatar-fit release accepted; own inbox avatar refinement prepared

Accepted the user's completed avatar-fit receipt: commit eb29922d6c47e3ff7bc5bbbd2bbdbaf62f59f22a, parent68c3996, 1964-file tree4e61ce1410982c77e835598f036813233cad409e. The receipt records17/17 focused tests, a successful build and verified push; raw command log bodies were not supplied. Matching Ready / Production and desktop screenshots show framing, saved circular avatar and larger counterpart images. The prior receipt remains immutable.

Prepared one CSS rule scoped to `.inbox .sender .avatar`: own Postkast avatar40px with16px fallback initial. Counterparts remain56px/48px; the opened conversation composer remains24px. No application logic, image pipeline, API, database, dependency or account change. The new source-only updater requires the exact accepted receipt and full source/index/remote guards, runs a current build, then performs its scoped commit/push. Previous application tests are not rerun for this reversible CSS adjustment. New Mac execution and deployment remain pending. The previous three current continuity documents are preserved byte-for-byte in `docs/continuity/history/inbox-avatar-base-eb29922-20261121`.

## 2026-11-21 — inbox avatar accepted; dependency security update prepared

Accepted fb36c3bd932501121fe3c67a667724bd47ea8244, tree bb5cdd87bf94ba2ada7fe97f45c54a734d538e07 (1968 files), from the exact successful Mac receipt and the user's matching Ready/Production and inbox screenshot. The receipt reports one successful webpack build and verified push. Raw Mac Git/build logs were not uploaded. Own inbox avatar40px, counterpart56px/48px and composer24px are accepted; do not replay this release.

Prepared Next/eslint-config-next16.4.6 and Sharp0.35.5, plus compatible lock-only ws8.23.0/source-map-js1.2.4/zod4.6.7. Other14direct dependency declarations and locked versions stay unchanged. Added real loaded-native and five-route NFT gates. The isolated final candidate passed clean install, actual Linux native loading, all 140 existing image tests, the default Turbopack/TypeScript build and all five real route traces (native-3/tests-3/build-3/traces-2). Real build findings required type-only Sharp imports in two codecs and the unchanged publication image include list on the horse/service routes. No image processing behavior was altered. Final npm audit: 10 affected development package names, 8 moderate and 2 high; follow-up tooling work remains. Mac execution repeats only this new version's necessary gates, with immutable stage evidence and exact source/index/remote/prior-receipt guards before scoped commit/push. No SQL, Auth, Storage policy, account or user-image mutations belong to this patch. Final audit residuals are documented; a complete portal security audit is not claimed. User execution/deployment are pending.

User explicitly requested email confirmation and continuation of the agreed order. Recorded next signup/email plan, including actual Auth setting/SMTP/redirect checks, real confirmation landing, resend/expiry behavior and existing-user transition. Official examples support private individual employers in Estonia, USA, Japan, Russia, Brazil, South Africa, India and Thailand; China's household service distinction shows why legal relationship must be separated from account type. Recommended one job flow for both profile types, with coherent owner/public/contact/block backend changes later. No business-only gate was removed in this dependency release. Previous current docs preserved under security-base-fb36c3b-20261121.

## 2026-11-21 — private individuals can offer jobs; email activation deferred

Accepted the exact cd35d18 security-release Mac receipt and matching Ready / Production screenshot; 1976-file accepted tree 9ad98df916b97fd253e1ffd5f0835a2227105140. No old security/image tests or completed runner were replayed during this feature preparation. The user confirmed all three accounts are theirs and nobody else is testing. Email confirmation/SMTP activation is intentionally deferred to selqiro.com setup before inviting outside users; the separate prepared email snapshot remains unapplied and must later be rebased as a scoped delta, never copied wholesale over this feature.

Prepared one jobs flow for private and business identities, with a specific-task choice (employmentType=task), total-task payment (salaryPeriod=task), real public publisher identity type, private-profile jobs, existing exact receipt/CAS semantics and real provider contact. All original 13 content keys remain. Existing employment values and old saved request bytes remain valid; old loaded strict UI needs a refresh after deployment to read new enum/public publisher fields. Existing country-policy fail-closed gate, membership/owner restrictions, expiry and blocking stay in force. Application/build and isolated SQL proof are recorded in the new package; actual Mac/hosted application and deployment remain pending until the user runs the new updater.

## 2026-11-21 - public job discovery and legacy profile images

Accepted deployed private-jobs release 512fe45 and its exact Mac receipt, matching Ready / Production screenshot and reconstructed 2000-file source tree. A new private task remains visible to its owner but public discovery fails; the old business job remains visible on its profile and in a filtered anonymous live search. Reproduced one oversized legacy ip.avatar_url poisoning the strict public job page parser. Prepared a narrow jobs_private.public_fields correction to read the existing profile_media_private.slot_url resolver instead. No user rows, images, permissions, job content fields, pagination or client validation change. Prior source and all issued repairs remain immutable. New application and deployment await the user's scoped repair command and receipt.

## 2026-11-22 — owner job read recovery and unavailable detail guidance

Accepted release 8c2ee5c and the user's search, profile, messaging and closure checks. The supplied screenshots show one initial My Area load failure followed by a successful manual retry. The exact transport/SQL cause is unknown; the audit does not claim an auth race. Added one bounded, abortable retry for recognized transient owner-list read failures, tied to the current verified actor. Permission, input, parsing and cancellation errors are not retried; mutation recovery is unchanged.

The existing public-detail null contract covers closed, paused, expired, absent and restricted jobs. Clarified this state in English and Estonian and added a fixed messages link without exposing hidden job fields or expanding database authority. Added focused API and real React DOM coverage; the new full locked Next16.4.6 build is preparation evidence. Mac execution and deployment remain pending. Prior current handoff files are preserved byte-for-byte under docs/continuity/history/job-load-base-8c2ee5c-20261122.

## 2026-11-22 — owner job read lock repair prepared from accepted 78aea6f

Accepted the exact successful 78aea6f Mac receipt (49 focused client tests, full build and verified push; no SQL change) and matching Ready / Production screenshot. The later Network Response now identifies PostgreSQL 55P03, canceling statement due to lock timeout. The actual blocking transaction remains unidentified. All 2030 accepted source files were reconstructed and verified against SHA-256, Git blob and mode inventory; the full reconstructed tree is 1331942ec5b3428c7a7d592837aeaf2ece217232.

Prepared one-function SQL replacement for public.get_my_jobs_v1: statement-snapshot STABLE reads enforce the existing account, active identity, private ownership, business membership and hosted gates without acquiring row write/share locks. The response/cursor query, function ACL/owner/configuration and shared write helpers remain unchanged. The existing client retry remains bounded to one additional read. Future changes to shared authority must review both read and write paths.

New isolated native PostgreSQL checks passed 44/44, including real two-connection old-lock reproduction, new read during the held lock, unchanged writer lock, READ COMMITTED READ ONLY, coherent concurrent-revocation snapshots, authority failures and exact pagination/response contracts. Guarded SQL installation and runner boundaries have separate sealed evidence. Fresh locked Next16.4.6/TypeScript build passed with inert compilation settings; prior accepted client tests were not replayed.

The guarded updater pins the complete accepted source and successful prior receipt, runs a fresh Mac build, records one SQL write intent before dispatch, independently verifies the after-state and only then commits/pushes its scoped payload. Known RPC/catalog facts are pinned; full actual authority metadata is compared unchanged inside the transaction without inventing a synthetic live baseline. No user data cleanup or content migration is included. The Mac run, hosted SQL result, new commit/push, deployment and real browser acceptance remain pending. Previous current continuity files are preserved byte-for-byte under docs/continuity/history/job-owner-read-base-78aea6f-20261122.

## 2026-11-22 — owner job read lock repair accepted as 034211d

Accepted the actual 19:12:07–19:13:13 Tallinn Mac receipt, SHA256 90c85b1426d40e96537af482e802b2cc49c18c618ef568ae9114b20728da8920.
It confirms a fresh Next16.4.6 build, exactly one acknowledged SQL apply, an independent
read-only after-state verification and verified push of 034211d2ee3dfadd4ba791977c98e310754e4d94, parent78aea6f.
All five commands exited zero with confirmed cleanup; prior receipt preserved.
44 preparation SQL cases and49 prior client tests are explicitly reused, not replayed.

The user's19:13:59 screenshot confirms the same commit Ready / Production. Their19:20–19:21
screenshots show loaded owner job lists and retained closed/active jobs; their text confirms
private and business profile use. Original receipt READY_NOT_CHECKED is preserved, with
later visual/user acceptance recorded separately. New2047-file tree 03768a7e12d1aeb4ff7402d3102800071920df0e is derived
from the exact accepted baseline and issued payload, not a fresh Mac Git dump.

Offline receipt/source review only; no new test, build, SQL, installer, remote or Mac action.
Raw command logs/index bytes are absent, so those execution claims remain receipt-based.
The actual original blocking transaction remains unidentified. This narrow repair is complete.
Acceptance documentation is prepared outside the user's Mac and should travel with the next
scoped source change; it is not an additional committed/deployed update. Next recommendation:
read-only account closure/restoration dependency audit and bounded server contract design.
No existing account/content deletion is authorized.


## 2026-11-22 — Account lifecycle source audit and preview contract

Accepted production base remains 034211d. Completed a read-only dependency
audit of account/private identity/business authority, public content, messaging,
media and Energy/receipt integrity. Source fingerprints match the accepted
inventory; historical FK definitions are explicitly not a fresh live catalog.

Findings include business-owner cascades, exact conversation membership,
irreversible profile-media retirement, side-effecting Energy/media reads and
immutable-ledger/FK interactions. A proposed account lifecycle overlay preserves
independent content/membership state. The first implementation slice is a pure
account/identity/business impact preview; other domains remain not_assessed.
Email confirmation stays deferred to domain launch before external users.

Added architecture audit, bounded server contract and targeted verification
plan. Next work prepares one metadata-only catalog diagnostic; no user rows or
personal aggregates belong in that report. No application code, SQL, Auth,
Storage, DNS, real account/content state, build, deployment or prior installer
was changed or run. Three specialist read-only design reviews passed after
clarifying that wallet tests belong to the later Energy adapter.

This documentation delta carries the previous 034211d acceptance forward and
is prepared outside the Mac. No new commit/push is claimed. Apply together
with the next scoped source change after fresh Git/source verification.


## 2026-11-22 — One chosen account profile; signup preparation recovered

User reaffirmed one account with one chosen private OR business profile at
launch. Company member/role/ownership-transfer UI and a general multi-identity
impact preview are outside that scope. All three accounts are the user's;
only one has two identities, preserved as existing compatibility data.

Recovered the exact 21Nov email/onboarding preparation (SHA256
7d54275c1b868e04f220ba0c8bbcc7ca75ce6093fea6de9b51e88bb116bd03bc).
Its 48 new paths remain absent from accepted 034211d, and the existing auth
page matches its before hash. Six shared dependency files still match.
Historical tests/build were inspected, not rerun; no new runtime acceptance.

Specified the common creation/closure boundary: verified Auth account,
idempotent chosen first profile, account controls for incomplete onboarding,
no closed-account rebootstrap, and restoration of the same account/profile.
Internal business authorization rows remain implementation details.

Auth/SMTP deployment stays deferred to the agreed domain stage. Next work
prepares only the narrow lifecycle/account-creation catalog observation.
Updated continuity, generated handoff, persistent memory and scope document;
preserved prior issued design/state bytes in history. Prepared docs only:
no Mac/Git writes, SQL, build, browser, service setting or account mutation.


## 2026-11-22 — Bounded account foundation catalog diagnostic prepared

Prepared a separate read-only Mac diagnostic against accepted 034211d.
The sealed runner verifies actual Git/HEAD/tree/index/source/remote plus the
existing five-file Supabase CLI pin and linked project before one READ ONLY
catalog query. It returns bounded validated metadata for six account/profile
relations, direct keys/grants/triggers and relevant routine fingerprints.
No application rows, expression literals, secrets, source installation,
account changes, build, commit/push or deployment operation is included.

Preparation passed 48 runner cases using temporary real Git/processes and
fake CLI, 11 native PostgreSQL 17.6 synthetic SQL cases and 27 parser cases.
The own test database was stopped. Mac/Finder/native Supabase/live schema
are not acceptance claims; the user's exact new report is the next evidence.

Carried forward the simple one chosen private/business profile decision,
deferred auth/SMTP installation and all preservation rules. Recorded the
user's requested follow-on order: completed account lifecycle, then existing
offer promotion and external advertising. Profile-optional advertiser access
uses the same account model; no separate role/team system is introduced.
Updated current state/generated handoff/hosted command, memory and architecture.
These cumulative docs remain prepared, not applied in the Mac repository.

## 22.11.2026 — konto aluse raport vastu võetud; Minu konto ette valmistatud

Kasutaja tegelik kataloogikäik 21:58:45–21:58:49 lõpetas complete/complete.
Raport SHA256 9bd1e79598711cf3f0e6af48239c81dc9d7080922aa184ad64763ae74da691e4:
üks ainult lugemise pilvepäring, puhas main 034211d, muutumatu puu/index.
Kõik 11 vajalikku funktsioonikeha/config'i seoti vastu võetud lähtekoodiga;
täiendavat diagnostikat polnud selle esimese mooduli jaoks vaja.

Uus /v2/my-area/account näitab oma konto olekut, e-posti ja teadaolevat algset
loomisaega. Andmejuurdepääs, parser, lugemise elutsükkel, vaade ja tõlked on
eraldi väikestes moodulites. Konto vahetus peidab vana isikliku info kohe;
puuduv olekurida ei muutu Active vaikimisi väärtuseks. Profiil pole eeltingimus.

Lisav SQL loob privaatse aktiivsete olekute tabeli, ühe Auth INSERT-triggeri
ja STABLE lugemise RPC. Olemasolevad Auth/profiili/sisu read säilivad.
ON DELETE RESTRICT tähendab, et otsene Auth kustutus vajab hiljem teadlikku
elutsükli teostust. Sulgemis-, taastamis- või kustutamismutatsiooni veel pole.

Kontrollid: 20/20 rakenduse testi, uus täielik Next 16.4.6/TypeScripti build
(765 muutumatut sisendit), 15/15 native PostgreSQL 17.6 juhtu, 23/23 SQL parseri
juhtu ja 47/47 uuendaja juhtu. Viimased kasutavad tegelikku ajutist Giti ja
sünteetilisi CLI/build/SQL vastuseid. Lõplik SQL/parser ja runner tõend on sama
baiditaseme sisendiga. Eraldatud SQL-server peatati. Brauserikäik jäi enne
lehe avamist keskkonnapiirangu tõttu tegemata; seda ei märgita läbituks.

Ettevalmistatud pakett selqiro-konto-olek-20261122 sisaldab testitud deltat,
üht lisavat SQL release'i, räsikaitsega uuendajat, täpseid tõendeid ja kumulatiivset
dokumentatsiooni. Maci rakendus, päris SQL, commit/push ja uus deployment on
ootel. Vana diagnostikapaketti ega teisi väljastatud arhiive ei muudetud.

## 23.11.2026 — kontooleku uuendaja peatumise vastuvõtt ja eraldi jätku ettevalmistus

Vastu võetud STOP-raport: selqiro-konto-olek-20261122-raport-20261123-143815-48e5c165fd6e.json,
SHA256 db041d83bf5163f9b3e5f0540d3a7bd190eda50fefc348839d9fb4332e5472d7.
Sõltumatu kontroll sidus 60 rakendatud rada, 20 testi ning 189 Giti käsu väljundihashid.
Viimane täielik kontroll 14:38:08.951 Europe/Tallinn: main 034211d, 2047 alusfaili indeksis,
staged diff tühi, 51 uut ja 9 muudetud faili ainult tööpuus.

Build'i käivitusprotsess väljus 0 (6.187s), stdout 2570 baiti ja mõlemad EOF, stderr tühi.
Üldine CLI_TERMINATION_NOT_CONFIRMED tuli lõppkoristusest; konkreetne alamoperatsioon/
errno/PID ei ole teada. Build-passed.log, parsed proof ja artefaktikinnitus ei
jõudnud loomisele. Andmebaasi käske, git add/commit/push'i ei olnud.
Varasemat Productionit see käik ei asendanud.

Valmis eraldi jätkupakk selqiro-konto-oleku-jatk-20261123 uue päeviku ja praeguse
protsessiseisu piiratud kontrolliga. Vana STOP ja kõik originaallogid säilivad.
Rakenduse 11 faili ning SQL release’i 9 faili ei muutu; 20 testi PASS võetakse
täpsest privaatsest logist uuesti kasutusele pärast allikate ja sõltuvuste
värsket kontrolli. Üks uus build on vajalik salvestamata tulemuse tõendamiseks.

Uue jätkukäivitaja 33/33 ja protsessimooduli 33/33 sihitud kontrolli läbisid.
Python 3.12.14 / Linux; päris ajutine Git-hoidla, kohalik bare-remote ja
lapsprotsessid; build/SQL ning Maci käsuvastused olid kontrollandmed.
Külmutatud sisendiräsid võrdsed enne/pärast kontrolli, vana v1 ZIP muutmata.
Logid, allikad ja sõltumatu ülevaatus on paketi proof-kaustas. Rakenduse/SQL-i
varasemaid teste ega päris build’i siin ei korratud. Maci jätk, uus tegelik build,
pilveseisu kontroll/muudatus, commit/push ja deployment on veel tegemata.

## 23.11.2026 — kontooleku jätk peatus enne kirjutusi; UID-parandus r2

Vastu võetud uus raport: selqiro-konto-oleku-jatk-20261123-raport-20261123-165417-33be329be2cf.json,
383150 baiti, SHA256 388d10eac2fdc1260ace24c399a56c842510e81d86aac9ffa9cd1b69e935f852.
Esimese jätku manifest 334f54bb10da6ec0f4dec0917128002e727b9bdb60be8597f6b838cbefa8b251.
27 Giti kontrollkäsku läbisid; v1 60 faili/2047 indeksikirjet, originaalraportid
ja sõltuvused kinnitatud. 20 testi oli reused_verified, executed_again=false.

Ps-proov exit0, stdout26496B, stderr0, mõlemad EOF ja cleanup confirmed;
CURRENT_RUNTIME_UID_SCOPE_FAILED tekkis enne lähte-/dokumendikirjutusi.
Build not_run, database not_started/apply0, commit null, push not_run.
See on käivitaja peatumise tõend, mitte praeguse pilveseisu uus vaatlus.

Apple'i ps -U real UID valik ja uid effective UID väljund olid vana kontrolli
poolt ekslikult võrdsustatud. R2 eristab neid ning säilitab olemasolevate
protsesside, vanade raportite ja indeksi kaitse. Sama rakendus/SQL/testilogid
säilivad; uue neljanda originaalraporti kontroll seob täpse viimase STOP-i.
R2 11/11 UID-regressiooni ja 13/13 raportisidumise/lukustuse/eelseisu kontrolli
läbisid Python 3.12.14 / Linuxis. Täpsed logid, sisendiräsid ning sõltumatu
ülevaatus on r2 proof-kaustas. Senine transport/cleanup ning rakenduse/SQL-i
baidid säilisid. Varasemaid 33+33 kontrolle, 20 rakendusetesti, SQL-kontrolle
ega päris build'i ei korratud. Uus Maci r2 käik, build, SQL ja avaldamine on ees.

## 23.11.2026 — konto oleku vundament vastu võetud (4b60782)

Vastu võetud raport: selqiro-konto-oleku-jatk-20261123-r2-raport-20261123-173202-f3cf50344df6.json;
1315892 baiti, SHA256 df77de0996451e7b8823262294d7edcb128761eaf7e3a0ecbdce4d3bc47e59e6.
Maci käik 17:31:10.507–17:32:02.867 Europe/Tallinn, stage complete.
Üks värske build; tests=reused_verified, executed_again=false (varasemad 20 testi).
SQL preflight/apply/verify 1+1+1, database verified. Kõigi kolme CLI vastuse
salvestatud baidipikkus ja räsi taastati täpselt ning muutmata parser läbis.
Uut pilvepäringut või paigaldust vastuvõtu käigus ei tehtud.

Commit 4b607828d0b153b84166ba963fdb4e77337e11f0; vanem 034211d2ee3dfadd4ba791977c98e310754e4d94.
Puu 8012909c809772c1fd905129cc3643f8614655a3, 2108 faili. Kõik 70 paketi rada commit’is;
r2 kirjutas 15 dokumenti ja säilitas 55 juba õiget faili. Lõppindeks/tööpuu puhtad.
Remote sama commit’i peal kinnitatud 17:32:02.839 Europe/Tallinn.
12 runtime-proovi läbisid; olemasolevaid protsesse ei lõpetatud.
Mõlemad varasemad STOP-id säilivad; vana teadmata cleanup’i ei muudeta PASS-iks.

Verceli kasutajapilt kinnitab 4b60782 Ready / Production. Minu konto pildid ning
kasutaja kinnitus näitavad Aktiivne olekut ja loomiskuupäeva 15. aprill 2026;
emaili väärtus, kõik kontod ja kitsas vaade on nende piltide tõendipiirist väljas.
Andmebaasi täpset kontode arvu ei eksporditud; kolm kontot on kasutaja kontekst.

Vastu võetud on active-only olek ja privaatne lugemine. Sulgemine/taastamine/
kustutamine, uus registreerimine ja SMTP pole selle sammuga kasutusele võetud.
Järgmise väikese töö allikad on olemas: konto aktiivsuse helper ning kanoonilise
avaliku profiili lõppfilter koos media delegatsiooni kontrolliga. See on kavand,
mitte juba tehtud koodimuudatus. Täpne järg account-public-profile-next-20261123.md.

CURRENT_STATE, genereeritud üleandmine, HOSTED_PORTAL, arhitektuur ning mälu/päeviku
lisad on valmis järgmise muudatuse jaoks. Selle vastuvõtu ajal Maci/Giti/pilve ei
kirjutatud; uusi teste ega build’i ei korratud. Väljastatud paketid säilivad.

## 23.11.2026 — avaliku profiili konto-oleku kontroll ette valmistatud

Alus on vastu võetud main 4b60782, puu 8012909c809772c1fd905129cc3643f8614655a3,
2108 faili. Konto oleku vundament ja Minu konto on Maci raporti, Ready / Production
ning kasutaja vaate järgi vastu võetud. Selle lõpetatud paigaldust ei korrata.

Uus serverimuudatus lisab privaatse account_is_available(uuid) kontrolli ja seob
selle get_store_by_slug valitud kandidaadi lõppfiltriga. Kanooniline valik eelneb
sobivusele; kättesaamatu profiili asemel ei tagastata teise konto legacy-aliast.
Ettevõtte konto tuletatakse tegelikust business_accounts.owner_user_id seosest.
Senine asukoha privaatsus, blokeerimine, vastuse kuju ja meedia delegatsioon säilivad.

Kohalikud uued kontrollid: 8 kliendi/React SSR juhtu, 22 eraldatud PostgreSQL 17.6
juhtu, 18 kviitungiparseri juhtu ning värske Next16.4.6/TypeScripti build PASS.
Maci uuendaja 24 sihitud Git/aruande/SQL-töövoo kontrolli läbisid; järgnenud
Commit-rea muudatusel on üks kontroll ja runtime-vaatluse jätkamiskaitsel seitse.
Algset 24 kontrolli ei korratud. Täpsed räsiseosed ning sõltumatu ülevaatus on
paketi proof/runner ja proof/reviews all. Varasemaid laiu kontrollipakke ei korratud.
Päris brauserikäik ootab uut Ready / Production tulemust; SSR ei asenda seda.

See on ettevalmistus, mitte uus Maci paigaldus, SQL rakendus või commit/push.
Kontoridu ega sisu ei muudeta; active-only vundament säilib. Konto sulgemise,
taastamise ja kustutamise toimingud ei ole veel avatud. Ülejäänud otsingu,
pakkumiste, sõnumite, kirjutamiste ja välise pilditöö teed vajavad järgmisi piire.
Uus sisselogimine/SMTP jääb kokkulepitud selqiro.com etappi; konto tervikule
järgnevad kuulutuste esiletõstmine ja reklaamid. Kehtiv tööjärg on ainult
CURRENT_STATE.json-s, sellest genereeritud üleandmises ning HOSTED_PORTAL.md-s.

## 23.11.2026 — avaliku profiili konto-oleku kontroll vastu võetud (8dc0b3b)

Maci raport `selqiro-profiili-konto-olek-20261123-raport-20261123-190200-2ca1275173f0.json`, SHA256 `62ec79032d68bdb6e453953f639255876bbb000da19d11e70d5584111ebf7ba9`, kinnitab ühe uue
8/8 TAP testikäigu, värske build’i, preflight/apply/verify ning commit/push’i.
Commit `8dc0b3b11777b010c8486b45a3f98f0191d97d80`, puu `fc44ed6ae9e903bbbaef1df2017fdca396a1aa02`, 2130 faili; täpselt 30 paketi rada
(8 muudetud, 22 uut). Viimane remote’i võrdsus 19:02:00.673 Europe/Tallinn.
Täielik lõppindeks/tööpuu puhas; kõik 567 käsu protsessilõpud kinnitatud.

Kasutaja Verceli pilt kinnitab sama commit’i Ready / Production. Milline Vedu
ettevõtteprofiil ja Taivo Garaaz eraisikuprofiil on piltidel avatavad koos piltidega;
Minu konto on Aktiivne. Kasutaja kinnitas „kõik lehed avanevad”. Vastu võetakse
küsitud kasutustee, mitte anonüümse, mobiili või kõigi nuppude kontrolli väide.

Kanoonilise profiili kontooleku piir on rakendatud. Täpne SQL ei muuda konto- ega
sisuridu; konto active-only alus säilib. Vana paketti või apply’t ei korrata.
Raporti READY_NOT_CHECKED jääb algseks; deployment’i tõend on eraldi kasutajapilt.
TAP/build toorlogid ei ole raportis; parsitud tulemusi ja räsisid ei nimetata
toorlogide kordusparsimiseks. Vastuvõtul ei tehtud uut testi, build’i ega pilvepäringut.

Järgmine üks moodul: tavakuulutuste avalik otsing ja üksikvaade sama kontooleku
kontrolliga, sealhulgas päriselt kasutatava ühendatud otsingu tavakuulutuste haru.
Sobivus enne lehekülje piiri; senised filtreerimise/järjestuse/hinna/asukoha reeglid
säilivad. Jõudluse hinnang vajab konkreetse päringuplaani kontrolli.
Sulgemine/taastamine/kustutamine järgnevad vajalike serveriteede katmise järel;
siis kuulutuste esiletõstmine ja reklaamid. SMTP paus ja ühe algprofiili suund säilivad.
Täpne jooksva töö allikas on CURRENT_STATE ja sellest genereeritud üleandmine.

See vastuvõtu dokumenditäiendus on 8dc0b3b-järgne ettevalmistus järgmise paketi jaoks;
Maci dokumente pole pärast seda commit’i siin muudetud ega pushitud.

## 23.11.2026 — tavakuulutuste konto-oleku kontroll ette valmistatud

Vastu võetud alus on main 8dc0b3b, puu fc44ed6ae9e903bbbaef1df2017fdca396a1aa02, 2130 faili. Eelmise profiiliparanduse
Maci raport, Ready / Production ning kasutaja eraisiku/ettevõtte profiilide ja Minu
konto kontroll on vastu võetud. Selle vastuvõtu seni ettevalmistatud dokumendid
tulevad selle uue koodipaketiga kaasa; eraldi vana paigaldust ei korrata.

Uus moodul katab kolm tavakuulutuste otsingulugejat ja avaliku üksikvaate.
Tegelik ühendatud marketplace-otsing on kaetud ordinary harus; horses haru on
baiditäpselt sama. Konto omanik ja olemasolev account_is_available on üks
autoriteetne allikas; sobivus kehtib enne koguarvu ja lehekülge. Autorikonto
blokeerimise, hindade, FTS-i, asukoha ning galerii senine leping säilib.

13/13 uut sihitud TypeScripti, anonüümse metadata ja Reacti serverrenderduse kontrolli läbisid; kõik 45 rakenduse sisendräsi säilisid. Kontrollitud on tegelik ühendatud otsingutee, tühja vastuse ja vea eristus ning eesti/inglise vaated. Transport ja vastused olid sünteetilised; see ei ole brauseritest.
37/37 lõpliku SQL-i PostgreSQL 17.6 käitumise ja metaandmete kontrolli läbisid. Parseri 18 varasemat kontrolljuhtu katavad muutmata loogikat; pärast ainult AFTER-räsi muutmist kontrolliti kolme lõplikku päris kviitungit uuesti. Konto-, õiguste-, omaniku-, blokeerimise-, peitmise-, lehekülje-, galerii- ja hobuste senise haru juhud on eraldi tõendatud.
12 000 sünteetilise kuulutusega vana/uue lugeja 14 võrdlusjuhtu säilitasid aktiivsete kontode tulemused. Veel 20 000 otsinguga mitteseotud konto lisamine ei suurendanud kuue valiva kontrolli sobivusfunktsiooni kutsete arvu. Esialgne kõiki identiteete läbiv lahendus asendati kuulutuse identiteedi võtmega piiratud lugemisega. Ühendatud otsingu varasem laia tulemushulga aeglus jääb eraldi optimeerimistööks enne suuremat kasutusmahtu.
Värske täielik Next.js 16.4.6 / TypeScripti build läbis 33,042 sekundiga. Kõik 765 koostamissisendit säilisid. Kasutati täpseid olemasolevaid lukufaili sõltuvusi ja inertseid lokaalseid seadeid; sõltuvusi ei paigaldatud ega uuendatud. Logi SHA256 on 1ac746178e79605831e14522e0247620eb09b91ebb993639600983c1e4de9936.
Uuendaja 14/14 uut sihitud töövoojuhtu läbisid. Lõpliku SQL-kviitungi järel kontrolliti uuesti ainult kolme olemasolevat asjakohast juhtu; kogu komplekti ei korratud. Uus kviitungi kontroll, kadunud kinnituse järel sõltumatu lugemine ja ebaselge kirjutuse automaatse kordamise keeld läbisid. Seitse varasemat Giti, protsessi, sõltuvuste ja transpordi abimoodulit säilivad baiditäpselt.

Lähtekood on ette valmistatud. Maci rakendus, SQL, commit/push, Vercel ja päris
brauseri kasutustee on eraldi ootel. Konto- ega sisuridu ei muudeta. Konto
sulgemise/taastamise/kustutamise käsk ootab ülejäänud vajalikke serveriteid.
SMTP paus ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
Täpsed piirid on docs/architecture/account-listing-read-fence-v1.md-s;
ainus praegune käivituskäsk on CURRENT_STATE.json-st genereeritud juhendis.

## 23.11.2026 — tavakuulutuste konto-oleku kontroll vastu võetud (87bff3f)

Maci raport `selqiro-kuulutuste-konto-olek-20261123-raport-20261123-202738-2e4bf1222037.json`, SHA256 `1771fc501d411e71f45bb63a098a62abe47d6b33612782b6b30b11a7e65e8b95`, kinnitab ühe 13/13 TAP-käigu,
eduka Next16.4.6 build’i, ühe SQL rakendamise, eraldi verify ning commit/push’i.
Commit `87bff3f51a01a6953c37096ed32a1017135fd304`, puu `a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77`, 2154 faili. Täpselt 32 paketi rada: 8 muudetud
ja 24 uut. Viimane remote’i võrdsus 20:27:38.314 Europe/Tallinn; lõpppuu/index puhas.
Kõik 569 käsukirjet on lõpetatud; varasemad päevikud ja raport säilisid.

Sama commit’i Ready / Production on kasutaja pildil ning kasutaja kinnitas
„kõik lehed avanevad”. Raporti READY_NOT_CHECKED säilib; pilt on eraldi tõend.
Kasutajakinnitust ei laiendata eraldi mobiili, anonüümse seansi ega kõigi nuppude
kontrolliks. TAP/build toorlogid pole eksporditud; parsitud tulemused ja räsid on
kontrollitud. Kolm SQL kviitungi ümbrist taastati täpse pikkuse/räsiga ning parsiti.
Terviklikku kataloogi toorväljundit raport ei sisalda. Uusi teste või teenusepäringuid ei tehtud.

Kolme tavakuulutuse otsingulugeja ja üksikvaate kontooleku piir on rakendatud.
Konto- ega sisuridu paigaldusega ei muudetud. Järgmine väike moodul: ühendatud
otsingu horses haru ning get_public_horse_offer_v1 sama privaatse helperiga.
Allikad ja sihitud kontrollid on docs/architecture/account-horse-read-next-20261123.md-s.
Ühendatud laiotsingu 4,25/4,72 s sünteetiline tulemus jääb eraldi optimeerimistööks
enne suuremat kasutusmahtu. Konto tervikule järgnevad esiletõstmine ja reklaamid.

Need dokumendilisad on 87bff3f-järgne ettevalmistus järgmise koodipaketi jaoks;
Maci dokumente pole siit uuesti kirjutatud ega pushitud. Lõpetatud paketti ei korrata.

## 23.11.2026 — hobuste konto-oleku kontroll ette valmistatud (alus 87bff3f)

Tavakuulutuste kontooleku etapp on Maci raporti, sama commit’i Ready / Production
ning kasutaja „kõik lehed avanevad” kinnitusega vastu võetud. Alus `87bff3f51a01a6953c37096ed32a1017135fd304`,
puu `a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77`, 2154 faili. Vastu võetud seisu dokumendid kaasatakse sellesse paketti.

Uus moodul lisab sama kontooleku kontrolli search_public_marketplace_v1 horses
harusse ja get_public_horse_offer_v1 üksikvaatesse. Ordinary haru ja ühine
lehekülje/count/JSON osa säilivad. Konto helper, avaldamise lõplikkus, hinnad,
pildid, tähtajad ning omaniku/avaldaja eristus säilivad. Kontode ega sisu ridu ei muudeta.

12/12 uut kliendi, range parseri, anonüümse jagamismetadata ja Reacti serverrenderduse kontrolli läbisid. Kontrolliti päris rakenduskoodi sünteetiliste vastuste ja hook-olekutega; 42 lähte-/abifaili räsi säilisid. Null-vastus, päringuviga, segatud loendi järjekord/leheküljed, hind, pildid ja avalikud lingid on eraldi kaetud. See ei ole brauseri ega päris teenuse kontroll.

56/56 uut native PostgreSQL 17.6 kontrolli läbisid. Tegelikud konto-, avaldamis-, sisu- ja galeriilõplikkuse funktsioonid töötasid sünteetiliste andmetega. Kontroll hõlmab viis pakkumisliiki, omanikuseoseid, puuduvaid/piiratud kontosid, blokeerimist, peitmist, tähtaegu, vigaseid avaldamisfakte, segatud koguarve/lehekülgi, õigusi ning ühe kaitstud SQL rakendamise ja eraldi verify tulemust. Testitud 9 SQL/lepingu sisendi ja 54 toetava sisendi räsid säilivad; oma klaster on peatatud. Live-andmebaasi eelseis tuleb Macis värskelt kinnitada.

Vana/uue päringu võrdlus kasutas 2400 avaldamise lugemiskontrolli läbivat sünteetilist hobust, 1920 pilti ja 600 tavakuulutust: kõik 12 võrdlusjuhtu andsid samad aktiivsete kontode tulemused. Iga versiooni kohta mõõdeti 3 soojendatud päringut. Veel 20 000 kõrvalise konto lisamisel säilisid 5 valitud juhu tulemused ja konto helperi kutsete arvud 5/3/300/1/1. Segatud laiotsingu mediaan oli 2804,52 → 2954,86 ms (+5,36%, mõõtevahemikud kattusid); hobuste laiotsing 2775,87 → 2549,83 ms. Ühe omaniku 1600 vaste puhul oli 1600 kontrolli; ühe korra kontrollimist konto kohta ei lubata. 43 mõõtmise sisendpin’i jäid muutmata; neli setup’i loetud baas-release’i faili kontrolliti lisaks aktsepteeritud inventari vastu, neid ei lisatud tagantjärele mõõtmise pin’ide hulka. 52 811 päris pesastatud plaani säilivad kadudeta gzip’is ning 27 sisemist lugejaplaani eraldi. Need ühe kliendi kohalikud mõõtmised ei tõenda tootmiskoormust: laiotsingu avaldamiskontrollid, kaartide koostamine enne lehekülge ja hobuste FTS vajavad eraldi optimeerimist enne suuremat kasutusmahtu.

Uus täielik Next.js 16.4.6 / TypeScripti build läbis 32,45 sekundiga. Kõik 765 build’i sisendit säilisid; package.json, lukufail, sõltuvused ja rakenduskood on muutmata. Kasutati olemasolevaid täpseid sõltuvusi ja inertseid kohalikke koostamisseadeid. Valmis /v2/products, /v2/horse-offer/[id] ning /v2/profile/[slug] väljundid.

17/17 uut Maci uuendaja sihitud juhtumit läbisid 17,571 sekundiga. Ajutine Git/kohtvõrgu remote ja piiratud alamprotsessid olid tegelikud; runtime-proov, CLI, SQL ning rakenduse build’i tulemused neis runner’i juhtudes sünteetilised. Kontrolliti täpset 2154-failist alust, tundmatu seisu peatumist, ühe SQL kirjutuse ning ebaselge vastuse järel ainult lugemisega taastumise lepingut, täpset commit/push’i ja raporti säilimist. Kõik 17 runtime-faili vastavad testi pin’idele; seitse varasemat helperit säilivad baiditäpselt. See ei ole uus Maci käivitus.

Kasutaja Maci käivitus, üks SQL muudatus, commit/push, sama uue versiooni
Ready / Production ja tegelik brauseri lugemiskontroll on ootel. Paigaldusjuhis
on docs/continuity/HOSTED_PORTAL.md-s; põhjalik leping on
docs/architecture/account-horse-read-fence-v1.md-s. Konto sulgemise tervik,
profiili pakkumiste otselugejad, muud sisutüübid, kirjutused, sõnumid ja pilditeed
vajavad lõpetamist. Konto tervik → esiletõstmine → reklaamid ning SMTP paus säilivad.
