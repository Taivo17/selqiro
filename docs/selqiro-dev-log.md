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
