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
