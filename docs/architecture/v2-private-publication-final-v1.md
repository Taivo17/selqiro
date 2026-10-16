## 16.10.2026 — väljastamata SOURCE-loa sama lähteetapi lõpetamine

**Paigaldus ja uus build on Macis tehtud ning üle vaadatud. Järgneb SAMA 19-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita lõpetaja
commit'i, push'i ega uue juurutuse õnnestumist; loe UUE käigu tegelikku result.json-i.**

- Alus 8f5c3a82a803f9d5f977a9fbce62cbdb656f0164 / main, parent ea212d3.
  Viimane täielik kohalik kaitse 16.10.2026 14:11:07.187940 Tallinn: 19 staged,
  staging'uväliseid muudatusi pole; 594 valitud allikat ja 23 migratsiooni. Tööpuu pole puhas.
  Kaug-main 14:11:05.810431 oli sama baas. Need on salvestatud, mitte uued live-vaatlused.
- Algne paigaldustõend: source-no-release-source-install-20261016-141048-qifwk2zj(1).zip,
  7 399 268 baiti; SHA256 f50255d4c219f4b2895beba617821b702163657f63fa1b528626c317015b6f77.
  Kõik üheksa testitud faili on muutmata paigaldatud; 19 rada = 11 uut + kaheksa dokumenti.
- Päris build 16.10 14:10:58.162576–14:11:02.685298 Tallinn: exit 0.
  Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3/Sharp0.34.5 on selle paigalduse
  varasemad vaatlused, mitte lõpetaja uus runtime-test. Build'i stdout1560b jäi privaatseks;
  selle sisu ega hoiatuste puudumist siin ei väideta. Native-töötlejat ei käivitatud.
- Muutmata Maci 33 Node/HTTP + 67 SQL tõend: ES2017/strict, PG17.6 50 rollback,
  15 kontrolli viies ajastuses ja kaks isolatsioonikeeldumist. Kaks lukuootamist,
  kolm teise tehingu varasemat lõppu; viimane sama konto teine katse. 29 SQL-exit0,
  kaks fixture-NOTICE'it; oma abi eemaldatud. HTTP oli kohalik, Auth/RPC/Storage
  sünteetilised. See pole pilve vastuvõtt; neid ega vanu sarju ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus; värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/594 allika/23 migratsiooni ja lubatud origin/main'i kaitsed enne kirjutusi.
Täpsustatakse ainult üheksat juba samasse 19-rajalisse muudatusse kuuluvat dokumenti.
Kõik üheksa testitud faili, nõuded, inventuurid ja töötavad moodulid säilivad bait-baidilt.
Jooksva üleandmise kontroll, kontrollitud eraldi commit-index, üks commit ja kuni üks
mitte-force main-push. Uus ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Pärast käiku:** loe UUE source-no-release-source-finish tulemus, commit-proof,
remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean järel jätka
otse sama V2 recorded/väljastatud SOURCE-loa lõplikkuse, ebapiisava WEB-tõendi,
püsiva koristuse/lõppkustutuse ja terve kasutajatee ühendust. Eraldi dokumentide
lõpetamise ringi ei lisata. STOP-il säilita failid/index/päevik; ära korda ega tee
käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Uus kitsas proof puudutab suletud katse endiselt signing-olekus, salvestamata tokeniga
juhtumit. Hiline tokenisalvestus keeldub ka pärast koristust. See EI tühista recorded-
või brauserile väljastatud tokenit; ka aegunud/purgitud load ja ebapiisava tõendiga WEB
jäävad blokeerituks. Täielik failikustutus EI OLE valmis. Record-before-get peab olema
ainus väljastustee; lekketa saladused, teise privilegeeritud kirjutaja puudumine ning
tegelik Storage/versioonikustutus/HTTP/CORS/mahud/mobiil/native-pilv vajavad vastuvõttu.
Konto-identiteedi-sõnumite kooskõla, vormid/marsruudid ja müüja–ostja–anonüümse
lisamine→leidmine→detail/profiil→suhtlus→haldamine→kustutamine jäävad kontrollida.
Need on enne avamist vajalikud, mitte mugavused. Energy/maksed/AI/otsingu lisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
8f5c3a8 Ready42s/Production on vastu võetud baasitõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika; lõpetaja uut juurutusolekut ei kinnita.

---

## 16.10.2026 — väljastamata SOURCE-loa testitõend ja piiratud lähtepaigaldus

Praegune commit’itud baas on `8f5c3a82a803f9d5f977a9fbce62cbdb656f0164`.
Eelmine 20-rajaline kirjutusekontroll on commit’itud/push’itud ja üle vaadatud;
8f5c3a8 Ready42s/Production-ekraanipilt on vastu võetud. Sama pilti ei küsita uuesti.
Allolevad vanemad järgmised tööd on ajalugu, mitte käivitamisjuhis.

Väljastamata SOURCE-loa Maci 16.10 12:54 testitõend: 33/33 Node/HTTP-testi ja
ES2017/strict (Node24.16.0/TS5.9.3), 67/67 PG17.6 SQL-kontrolli (50 rollback +
15 viies ajastuses + kaks isolatsioonikeeldumist). Kaks ajastust nõudsid lukuootamist,
kolmes sai teine tehing enne esimese commit’i lõpetada; viimane on sama konto teine katse.
29 SQL-käsku exit0, kaks fixture-NOTICE’it, oma abikonteiner eemaldati. HTTP oli kohalik,
Auth/RPC/Storage sünteetilised. Native- või päris Storage’i vastuvõttu ei toimunud.
Muutmata tõendi inventuur: `docs/verification/v2-source-no-release-tests-20261016.json`.

Uus lähtepaigaldaja säilitab kõik üheksa testitud faili ning lisab kümme dokumenti:
19 rada (11 uut, kaheksa dokumendimuudatust), oodatud lähtevalik 594. **Uue paigalduse,
build’i ja staging’u tulemus on VEEL VAATLEMATA; loe UUE käigu result.json-i.**
Enne kirjutusi värsked tegeliku Git/HEAD/koguindexi/tööpuu/583 allika/23 migratsiooni/
lubatud remote’i kaitsed; seejärel üks uus build ja ainult PASS-i järel täpne staging.
33/67 ega vanemaid teste, SQL-i, Storage’it, Dockerit või paigaldust ei korrata.
Paketipaigaldust, commit’i ega push’i see uus käiviti ei tee. STOP säilitab failid ja indexi.

Kitsas leping: suletud katse endiselt signing-olekus, salvestamata tokeniga SOURCE võib
saada muutmatu väljastamata jätmise tõendi ja koristusloa. Sama katse lukul trigger
keelab hilise tokenisalvestuse (`publication_source_release_sealed`), ka pärast koristust.
Mahureservatsioon säilib kuni koristuse lõpetamise kinnituseni. Record-before-get peab
olema ainus loa väljastustee; logilekked ja teised privilegeeritud kirjutajad pole kaetud.
See EI tühista recorded/väljastatud tokenit. Ka aegunud/purgitud recorded-load, puuduv grant
ja piisava tõendita WEB jäävad blokeerituks. Täielik failikustutus EI OLE valmis.

Üleslaadimine/avaldamine on suletud, SQL labs-only/API-closed. Uut vormi/marsruuti,
bucket’it, API-õigust, ajastatud worker’it või üldmootorit ei avata. Leping:
`docs/architecture/v2-private-source-no-release-v1.md`. Päris Storage/HTTP/CORS/mahud/
mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla ja kogu müüja–ostja–anonüümse tee
vajavad enne avamist vastuvõttu. Energy/maksed/AI/otsingu lisad ootavad.
Pärast uue lähtepaigalduse vastuvõttu lõpeta SAMA lähteetapp eraldi kaitstud commit/push’iga,
siis jätka V2 sisulist ühendust, mitte uut docs-only ringi. Olemasolevaid kontosid,
kuulutusi, pilte ega päevikuid ei kustutata; lõpetatud skripte ei korrata.

---

## 16.10.2026 — sama kirjutusekontrolli lähteetapi lõpetamine

**Paigaldus ja uus build on Macis tehtud ning üle vaadatud. Järgneb sama 20-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita lõpetaja
commit'i, push'i ega uue juurutuse õnnestumist; loe UUE käigu tegelikku result.json-i.**

- Alus ea212d300f915a6f48e427336f4a695a1ea2bfea / main, parent b05c98d.
  Viimane täielik kohalik kaitse 15.10.2026 13:10:23.597051 Tallinn: täpselt 20 staged,
  staging'uväliseid muudatusi pole; 583 valitud allikat ja 23 migratsiooni. Tööpuu pole puhas.
  Kaug-main 13:10:22.151516 oli sama baas. Need on salvestatud, mitte uued live-vaatlused.
- Algne paigaldustõend: write-reconcile-source-install-20261015-131004-ytuhtxnt.zip,
  7 292 455 baiti; SHA256 3516184fff15f2072e41a27a2160fab866ab536d7f648ab28f8bb93cda54517a.
  Kõik kümme testitud faili on muutmata paigaldatud; 20 rada = 12 uut + kaheksa dokumenti.
- Päris build 15.10 13:10:14.925310–13:10:19.415527 Tallinn: exit 0. Varasemad
  Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3/Sharp0.34.5 vaatlused säilivad.
  Build'i stdout 1560 baiti jäi privaatseks; selle sisu ega hoiatuste puudumist siin ei väideta.
- Muutmata Maci 48 Node/HTTP + 83 SQL tõend: ES2017/strict, PG17.6 64 rollback,
  15 kontrolli viies ajastuses ja neli isolatsioonikeeldumist. Neli lukuootamist;
  viies on sama konto teine fail. 31 SQL-exit0, kaks fixture-NOTICE'it; enda abi eemaldati.
  HTTP/baidid olid kohalikud, RPC/Storage sünteetilised; native puudus. Kaks loogilist
  piirnäidet kuuluvad 48 sisse, mitte päris Storage'i katsed. Neid ega vanu sarju ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus; värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/583 allika/23 migratsiooni ning lubatud origin/main'i kaitsed enne kirjutusi.
Täpsustatakse ainult üheksat juba samasse 20-rajalisse muudatusse kuuluvat dokumenti.
Kõik kümme testitud faili, nõuded, inventuurid ning töötavad moodulid säilivad bait-baidilt.
Jooksva üleandmise kontroll, kontrollitud eraldi commit-index, üks commit ja kuni üks
mitte-force main-push. Uus ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Pärast käiku:** loe UUE write-reconcile-source-finish tulemus, commit-proof,
remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean järel jätka
otse sama V2 väljastatud SOURCE-loa lõplikkuse, püsiva koristuse ja terve kasutajatee
ühendamist. Eraldi dokumentide lõpetamise ringi ei lisata. STOP-il säilita failid/index/
päevik; ära korda ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Ainult suletud katse allkirjastuseni mittejõudnud SOURCE-reservatsioon või ühe WEB-kirjutuse
täpse põhikataloogiversiooni ja kogu faili baitide tingimuslik tõend võib saada koristusloa.
Väljastatud/allkirjastamisel SOURCE ja piisava tõendita WEB jäävad blokeerituks.
Täielik failikustutus EI OLE valmis. Tegelik Storage'i järjekord/skeem/versioon,
ainukirjutaja, peidetud POST-korduste puudumine ja failiversioonide kustutamise leping
vajavad vastuvõttu; labori sünteetiline tabel ei loo neid garantiisid teenusesse.
Storage/HTTP/CORS/mahud/mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla,
vormid/marsruudid ja müüja–ostja–anonüümse lisamine→leidmine→detail/profiil→suhtlus→
haldamine→kustutamine vajavad endiselt kontrolli. Energy/maksed/AI/otsingu lisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
ea212d3 Ready46s/Production on vastu võetud baasitõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika, kuid lõpetaja uut juurutusolekut ei kinnita.

---

## 2026-10-15 — piiratud kirjutusekontrolli testitõend ja uus lähtepaigaldus

Praegune commit’itud baas on `ea212d300f915a6f48e427336f4a695a1ea2bfea`.
Selle WEB-kirjutuse 20-rajaline lähteetapp on lõpetatud; Ready46s/Production-ekraanipilt
on vastu võetud. Allolevad vanemad „järgmised tööd” on ajalugu.

Piiratud kirjutusekontrolli Maci tulemus: 48/48 uut Node/HTTP-testi ja ES2017/strict,
83/83 PG17.6 SQL-kontrolli (64 rollback + 15 viies ajastuses + neli isolatsioonikeeldumist).
Neli ajastust nõudsid lukuootamist; viies oli sama konto teine fail. Kaks oodatud
fixture-NOTICE’it, abi eemaldatud. RPC/Storage olid sünteetilised; kaks loogilist
piirnäidet pole teenuses tehtud katsed. Muutmata tõendi inventuur:
`docs/verification/v2-write-reconcile-tests-20261014.json`.

Uus SOURCE-paigaldaja säilitab kõik kümme testitud faili ja lisab kümme dokumenti:
20 rada (12 uut, kaheksa dokumendimuudatust), oodatud lähtevalik 583. **Uue paigalduse,
build’i ja staging’u tulemus on VEEL VAATLEMATA; selle tõend tuleb uuest result.json-ist.**
Paigaldaja teeb värsked Git/index/tööpuu/allika/migratsiooni/remote’i kaitsed, ühe build’i
ning ainult PASS-i järel täpse staging’u. Teste ega SQL-i ei korrata; commit/push’i pole.

Kümne faili leping: `docs/architecture/v2-private-write-reconcile-v1.md`.
Allkirjastuseni mittejõudnud suletud SOURCE-reservatsioon või suletud WEB-objekti täpne
põhikataloogiversioon + kontrollitud kogu faili baidid võivad laborikoostises saada eraldi
koristustõendi. See ei võltsi POST-ACK-i, pildi valmidust ega avaldamist. Väljastatud või
allkirjastamisel SOURCE ja tõendita WEB jäävad blokeerituks; täielik failikustutus pole valmis.
Päris teenuse järjekord/skeem/versioon/ainukirjutaja/peidetud korduste puudumine/versioonikustutus,
Storage/CORS/mahud/mobiil/native, konto/identiteet/sõnumid ja kogu kasutajatee jäävad avamise piiriks.

Üleslaadimine/avaldamine on suletud; SQL labs-only/API-closed. Vajalik uus nelja Storage’i
veeru lugemisõigus on ainult laborikoostises, mitte siinse lähtepaigaldusega productionis.
Pärast uue paigaldustulemuse vastuvõttu lõpeta SAMA lähteetapp kaitstud commit/push-käiguga,
siis jätka sisulist V2 ühendust. Ei lisata eraldi docs-only ringi. Kontod, kuulutused,
pildid ja vanad operatsioonipäevikud säilivad; lõpetatud skripte ei korrata.

---

## 14.10.2026 — WEB-kirjutuse sama lähteetapi lõpetamine

**Paigaldus ja build on Macis tehtud ning üle vaadatud; järgneb sama20-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita veel lõpetaja
commit'i, push'i ega uut juurutust. Tegelik tulemus tuleb uue käigu result.json-ist.**

- Alus b05c98dca11e008e99114e85679e024403fa49e2 / main, parent9f3961d.
  Viimane täielik kohalik vaatlus 14.10.2026 19:25:47.667030 Tallinn:20staged,
  staging'uväliste muudatusteta,571valitud allikat/23migratsiooni. Tööpuu pole puhas.
  Viimane kaug-main'i vaatlus 19:25:46.179744 oli sama baasil. Need pole uued live-vaatlused.
- Algne paigaldustõend: web-write-completion-source-install-20261014-192528-aje23uvf.zip,
  7164099baiti, SHA-256 13eadffadbeb40065ae36aea1127b38acdaf7b4a493c10acc57f6dc6a58acc70.
  Kõik11testitud faili paigaldati muutmata;20rada=11uut+9muudetud.
- Päris build19:25:38.809509–19:25:43.339623 Tallinn exit0. Node24.16.0/npm11.13.0/
  Next16.2.1/TypeScript5.9.3/Sharp0.34.5 on selle varasema paigalduskäigu tõend.
  Build'i stdout1560b jäi privaatseks; selle sisu ega hoiatuste puudumist siin ei väideta.
- Varasem34Node/HTTP+58SQL tõend säilib.34=31uut+3mudeliühilduvust, mitte vana85sarja
  uusvastuvõtt. Päris kohalikHTTP, sünteetilisedAuth/REST/Storage/sanitizer;native puudus.
  PG17.6:44rollback+12neljasajastuses+2isolatsioon,24SQLexit0 ja2NOTICE ettevalmistuses.
  Neid ega muid vanu sarju või build'i lõpetajas ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus, värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/571allika/23migratsiooni ja kinnitatudoriginmain kaitsed enne kirjutusi.
Täpsustatakse ainult8samasse20radalisse muudatusse kuuluvat dokumenti; kõik11testitud
faili, nõuded ja tõendiinventuurid jäävad muutmata. Jooksva üleandmise kontroll,
kontrollitud eraldi indexi koopia, üks täpne commit ja kuni üks mitte-force main-push.
Uus eraldi ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Järgmine tegevus pärast käiku:** loe UUE web-write-completion-source-finish tulemus,
commit-proof, remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean
järel jätka otse sama V2 SOURCE/teadmataWEB välise kirjutuse lõplikkust, püsivat koristust
ja tervet kasutajateed. Uut eraldi dokumentide lõpetamise ringi ei tehta.
STOP-il säilita failid/index/päevik; ära korda ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Kinnitatud üheWEBkirjutuse koristuskviitung ei ole täielik failikustutus. Kõik väljastatud
SOURCE ja teadmataWEB jäävad blokeerituks. Ainukirjutaja/no-proxy-retry/tegelikuStorage
vastuseleping, Storage/CORS/mahud/mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla,
vorm/marsruudid ja müüja–ostja–anonüümse lisamine→leidmine→detail/profiil→suhtlus→haldamine→
kustutamine vajavad tegelikku vastuvõttu. Energy/maksed/AI/otsingulisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
Varasem b05c98d Ready/Production on baasi tõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika, kuid lõpetaja uut juurutusolekut ei kinnita.

---

## 14.10.2026 — ühe WEB-kirjutuse kviitung: testid vastu võetud, piiratud lähtepaigaldus

Praegune commit'itud alus on `b05c98dca11e008e99114e85679e024403fa49e2` (560 valitud allikat, mitte täisrepo).
Eelnev lõppavaldamise lähteetapp on lõpetatud: commit/push/clean ning b05c98d
Ready41s/Production-ekraanitõend on vastu võetud. Neid lõpetamisi ei korrata.
Viimane täielik kohalik vaatlus: 14.10.2026 18:24:58.039505 Tallinn, puhas main,
560 allikat ja 23 migratsiooni; testikäigus GitHubi ei küsitud. See on salvestatud,
mitte käesoleva ettevalmistuse värske vaatlus.

Uus 34/58 testitõend on üle vaadatud: 34 Node/HTTP ja range ES2017 tüübikontroll
Node24.16.0/TS5.9.3 peal; PostgreSQL17.6 44 rollback +12 neljas ajastuses +2
isolatsioonikeeldumist. Native-pilditöötlejat ei kutsutud; Auth/REST/Storage/sanitizer
olid kohaliku HTTP-testmudeli vastused. 34 sisaldab kolme vana WEB-testimudeli
ühilduvuskontrolli, mitte vana 85-testilise sarja kordamist.
Tõend: web-write-completion-tests-20261014-182452-x20z__kg.zip,
SHA-256 256f35709fb725433f5d6a8ebcab02c121bba6502f0ec971eac6bdfd2f865257.
Vt `docs/verification/v2-web-write-completion-tests-20261014.json` ja `docs/architecture/v2-private-web-write-completion-v1.md`.

Sama 11-failine kandidaat säilib bait-baidilt. Muutuvad olemasolev
verifyPrivateWebImage.ts ja listing-publication-web.test.cjs; lisandub üheksa
uut faili. Ainult täielik 200/Id/Key vastus serveri ühelt lubatud WEB POST-ilt
saab anda seotud püsiva kirjutuskviitungi. See ei asenda pildi valmidust ega
kuulutuse lõppkontrolli. Tühistatud kviitungiga WEB saab testides koristusse;
SOURCE ja teadmata WEB jäävad blocked_write_settlement. Täielik failikustutus
EI OLE valmis; 404/timeout/aegumine/ready ei vabasta neid blokeeringuid.

Uus source-only paigaldaja seob need 11 testitud faili 9 dokumendirajaga:
20 rada (11 uut /9 olemasolevat muudetud), 571 valitud tulemusallikat.
Kaks uut dokumendirada on käesoleva ühenduse leping ja tõendiinventuur.
Enne kirjutusi värsked kogu Git/index/tööpuu/560allika/23migratsiooni ja lubatud
kaug-main'i kaitsed. Üks uus päris build, ainult selle edu järel täpne staging.
Paigaldus ja build on selles ette kirjutatud dokumendis VEEL VAATLEMATA;
tegelik tulemus tuleb uuest web-write-completion-source-install result.json-ist.
Testitud koodi ei muudeta, 34/58 ega vanu41/143/81/85/140/... sarju ei korrata.
SQL-i, Storage'i, Dockerit, paketipaigaldust, commit'i ega push'i selles käigus pole.

Üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Uusi marsruute, vorme, bucket'eid, õiguste avamist ega koristaja ajastust ei lisata.
Tegelik Storage'i versioon/vastuseleping, ainukirjutaja piir ning vaheserveri
automaatsete POST-korduste puudumine pole tõendatud. Kõik väljastatud SOURCE
ja teadmata WEB failid, päris Storage/CORS/mahud/mobiil/native-pilv,
konto/identiteedi/sõnumite kooskõla ning müüja–ostja–anonüümse täisteekond ootavad.
Energy/maksed/AI/otsingu lisad ootavad; üldmootorit ega V1 täiskihti ei ehitata.
Olemasolevate kontode, kuulutuste, piltide ja päevikute kustutamisluba pole.

Järgmine tegevus pärast esimest paigalduskäiku: vaata uus tulemus-ZIP üle;
ainult eduka build'i ja täpse staging'u järel lõpeta SAMA lähteetapp kontrollitult.
Ära korda seda paigaldajat või vanu käiviteid, ära lisa kõrvalist rakendusmuudatust.
STOP säilitab kõik osalised failid, indexi, privaatse build-logi ja uue päeviku.
Ei reset/restore'i, käsitsi commit/push'i ega automaatset kordust.
Pärast sama lähteetapi lõpetamist jätkub sisuline V2 ühendamine, mitte eraldi docs-onlyring.

---

## 14.10.2026 — lõppavaldamise lähteetapp pärast ES2017 parandust; kontrollitud lõpetamine

Sama lähteetapi BigInt-parandus on Macis tehtud ja selle tulemus üle vaadatud.
14.10 kell 14:46 läbisid 41 uut regressioonitesti, final-moodulite ES2017 tüübikontroll
ja uus projektibuild (exit 0). ID ülempiir kasutab täpset BigInt("9223372036854775807")
stringi; target ES2017, strict/lib, sõltuvused ja 23 migratsiooni säilisid.
Algne 12:00 build'i STOP ja 12:38 diagnostika on muutmata ajalugu, mitte uus käivitus.
Parandustõend: private-final-source-bigint-repair-20261014-144601-wrmuy_4a.zip,
SHA-256 31ad04b22fbd179b0ac842cbaab8fa4c5c971d624eb2e3b7c755b4c302dcc5ef.

Viimane täielik salvestatud Git-vaatlus oli 14.10.2026 14:46:16.381892 Tallinn:
main/9f3961d, täpselt 36 rada staging'us (26 uut, 10 varasema dokumendi muudatus),
staging'uväliste muudatusteta, 560 valitud allikat. Tööpuu EI OLNUD puhas ning
commit/push EI OLNUD tehtud. Kaug-main'i viimane sama baasi vaatlus oli 14:46:15.027351.
See on varasema käigu tõend, mitte uue lõpetaja värske Git- või võrguvaatlus.

Järgnev kontrollitud source-finisher nõuab enne kirjutusi tegelikku main/HEAD-i,
kogu indexit/tööpuud, 560 allikat, 23 migratsiooni ja kinnitatud kaugsihti.
Täpsustatakse ainult ühtteist juba sama etapi dokumenti. Kõik 22 lõppavaldamise faili
(sealhulgas parandatud TS), uus ES2017 regressioonitest, nõuded ja tõendiinventuurid
säilivad bait-baidilt. Commit'i ulatus jääb samaks 36 rajaks; üks commit ja üks
mitte-force main-push. Uut rakendusfunktsiooni pooleliolevale staging'ule ei lisata.

Tegelikku commit/push/clean/remote tulemust loe uuest private-final-publication-source-finish
result.json-ist, commit-proof.json-ist ja remote-observations.json-ist. See ette
kirjutatud tekst EI kinnita tulevast lõpetamist edukaks. 41 testi/tüübikontrolli/build'i
ning 143/81/85/140/117/108/195/109/119 sarju, vanu paigaldajaid/parandajaid/diagnostikat,
SQL-i või Storage'i käike ei korrata. Kontrollitakse ainult muudetud jooksva üleandmise
kooskõla. Node24.16.0/npm11.13.0/Next16.2.1/TS5.9.3/Sharp0.34.5 on varasema paranduse
vaatlused; lõpetaja neid uuesti ei käivita. Privaatset build-stdout'i ülevaataja ei lugenud.

143 SQL-kontrolli tõend säilib muutmata SQL-i kohta. Vana 81 Node/HTTP-testi PASS
kuulub algsetele failibaitidele, mitte parandatud faili uuele täissarjale. Parandatud
rea tõend on 41 sihitud testi, ES2017 tüübikontroll ja uus build. Varasemad V1/V2 STOP-id
ning testitud README ettevalmistusaegsed NOT_RUN väljad säilivad ajalooliselt.

Pärast selle SAMA lähteetapi lõpetamist ja tulemusülevaatust jätka päris V2 ühendamisega:
hiliste väliste kirjutuste lõplikkus, lubatud privilegeeritud kirjutajad, püsiv piiratud
koristus/lõppkustutus, konto-identiteedi-sõnumite kooskõla, vorm/marsruudid ning kogu
lisamine → leidmine → detail/profiil → suhtlus → haldamine → kustutamine.
Uut eraldi dokumendilõpetamise ringi ei tehta. Tavaliselt väljastatud SOURCE-loaga ja
ettevalmistatud WEB-kirjutusega failid jäävad blocked_write_settlement; nende täielik
failikustutus EI OLE valmis. 404/timeout/aegumine/ready ei tõenda välise kirjutuse lõppu.

Upload/avaldamine jääb suletuks. SQL labs-only/API-closed; uut marsruuti, vormi, bucket'it,
õiguste avamist ega koristaja ajastust see lõpetaja ei lisa. Vana9f3961d Ready/Production
pilt on baasi tõend, mitte tulevase commit'i juurutuse või päris Storage/native vastuvõtt.
Energy/maksed/AI/otsingulisad ootavad; üldmootorit või V1 täiskihti ei ehitata.
Olemasolevaid kontosid/kuulutusi/pilte/päevikuid ei kustutata. STOP säilitab osalised
failid/indexi/uue päeviku; ei käsitsi taastamist, korduskäivitust, commit'i ega push'i.

---

# V2 final publication, terminal content deletion and bounded cleanup — dormant source contract

2026-10-14. The SAME22 reviewed candidate files are retained without changes. This is
source installation, not a production migration, new route, worker schedule or API permission.
Base `9f3961defbc797518995947bb21196d3208b94b9` is committed/pushed with accepted user
Ready/Production evidence. Exact provenance: `../verification/v2-private-final-publication-tests-20261014.json`.

## Installation boundary

The source installer plans22 exact code/SQL/test/README files plus12 documentation paths:
34 paths (24 new/10 existing),558 selected outputs. ONE new current build and exact staging
are recorded only in the new result.json; this prewritten document does not claim execution.
No app/SQL/native test replay, package install, commit/push, database or Storage command.
Existing modules, approved requirements, previous verification inventories and23 migrations
remain unchanged. The lab README's preparation-time NOT_RUN remains historical tested bytes.

## Server transaction and narrow writer composition

finalizeListing.ts / finalContract.ts / supabaseFinal.ts validate strict account, identity,
attempt, request and canonical price shapes; Auth is checked before user-scoped RPC calls.
A server final confirmation binds the canonical intent, exact price and each selected
immutable ready receipt. publish_my_listing_v1 rechecks actor/active identity/membership,
current accepted policy, normalized fields and all selected images in the same transaction
that creates listing/image rows, with a wall-time policy check after insertion. No Storage
I/O is performed inside the transaction. Zero-image attempts follow the existing contract.

01_state through07_budget compose existing exact price/category/detail/location normalizers,
creation mapping, actor locks, policy versions, attempts, upload grants and WEB receipts.
Generated fragments are recorded in tests/derivation.json. A narrow NOLOGIN/NOBYPASSRLS writer
supports only the intended structured INSERT and authorized terminal DELETE; retained price
UPDATE/TRUNCATE guard branches remain exact. This is a lab composition, not an edit to an
already committed/applied migration or an open grant to a browser/API role.

The activity period starts once using the existing90-day contract. Same-request replay returns
the same outcome: no duplicate listing, renewal, implicit reactivation or resurrection.
Private content payload is cleared; minimal UUID/hash/request/object lineage remains durable.
Changing the form snapshot or image selection requires a different intent/request contract.

## Dormant media delivery

serveListingMedia.ts prepares, but does NOT install, the stable
/api/v2/listing-media/{attempt}/{ordinal} handler. It only reads an active, nonexpired listing
with active identity and its exact verified WEB binding. It checks actual full bytes/hash,
rechecks availability after Storage I/O, and returns no-store/nosniff responses. SOURCE and
private Storage URLs are not returned. Previously delivered images cannot be recalled from
a viewer. Route/UI performance, provider behavior and public/buyer/owner visibility remain
integration gates; this source step does not replace them with a simulated acceptance.

## Content deletion, message retention and nonresurrection

delete_my_published_listing_v1 rechecks current account/identity authorization, without forcing
new policy acceptance just to remove content. Shared-business membership follows the existing
identity contract; original publication replay stays tied to the original account.
Exact cleanup references are persisted BEFORE listing/image content and automatic listing
snapshots in linked conversations/messages are removed in the same transaction. Message text,
chat-owned attachments and participants survive. Existing SET NULL listing references and
narrow managed-image/write guards are included. At most500 linked messages and500 conversations
are processed in one transaction; larger cases or unexpected foreign keys fail atomically.
These bounds are not a finished large-history batching or complete account-erasure design.

content_deleted=true/state=deleting differs from deleted. All exact managed objects must have
acknowledged deletion before deleted (zero objects may complete immediately). A durable outcome
tombstone prevents an old publication request from recreating content. Account/identity erasure
is still RESTRICTed by retained lineage: the tested refusal does NOT implement account deletion.
Late/unlinked message snapshots and all actual writer paths need real integration acceptance.

## What cleanup CAN and CANNOT complete

cleanupOne.ts takes one persisted eligible object/lease, sends one Storage API DELETE, reads
absence through authenticated Storage access and acknowledges that same work key. No immediate
retry or second target follows a lost reply. A lease is60seconds, at most8 claims, with bounded
exponential retry wait up to one hour and a needs_attention outcome. A stale lease cannot finish
another worker's attempt. Counts, age and reserved bytes avoid copying private content into logs.

IMPORTANT: eligibility currently covers only immutable abandoned objects with NO issued SOURCE
dispatch and NO prepared WEB write. Normal issued SOURCE and prepared WEB objects remain
blocked_write_settlement, including files from an ordinary successful image publication.
THIS CANDIDATE DOES NOT YET SUPPORT THEIR COMPLETE FILE DELETION. A successful content deletion
must therefore be shown separately from pending/blocked cleanup. Time passing,404,expiry,
timeout or ready receipts do NOT settle delayed external writes; there is no fake unblock RPC.
Only acknowledged deleted reservations stop counting against quota. Actual late-write finality
and exclusive permitted provider/writer authority must be connected before publication opens.
Short tests do not wait through eight60-second leases or hour-long backoff periods.

## Accepted evidence, not replayed tests

Original V3 Mac result: private-final-publication-tests-v3-20261014-092645-s2o4ahyw.zip,
SHA256 bf5fd58521001aabb5655e435271b026cad22466b1f0f059a7a3d0ec5b474350.
PG17.6:103 rollback+30 assertions in10 schedules+10 expected isolation rejections=143PASS;
63 SQL commands exit0;16 expectedNOTICE lines, no ERROR/FATAL/WARNING. Eight guarded lock waits;
two progress cases are another cleanup object under the SAME account and independent-account
publication, not two independent-account schedules. Temporary SQL role/policy/replay/image/
snapshot/message/FK/bounded-refusal tests passed. Helper removed by saved exact-runner guards.
Full raw snapshots, lock PID replies, Docker inspect and entire Git index were not exported.

81 Node/HTTP tests and strictTS PASS are unchanged earlierV1 evidence, reused inV3 with zero
Node/TS/native execution. Prior Node24.16.0/TS5.9.3, real loopback HTTP with synthetic Auth/REST/
Storage semantics; no cloud acceptance. OriginalV1/V2 whole STOPs remain unmodified. Test-only
policy and service-role scenarios were repaired without changing implementation or expanding
permissions. Offline141-check review is evidence analysis, not141 additional application tests.
The source installer reuses this proof without executing supplied test runners, SQL or Node.

## Same V2 continuation and launch gates

Upload/publication remain disabled; SQL labs-only/API-closed. Wire the existing flow only after
actual delayed-write finality and bounded complete cleanup, exclusive privileged WEB writers,
providerStorage/CORS/large-mobile/late-response contracts, native cloud invocation, full live
schema/role integration, account/identity/message consistency and route/UI integration are
verified. Preserve shared price/identity/policy modules; narrow unsafe legacy writers, not a
new general workflow engine or fullV1 layer. Validate add→find→detail/profile→message→manage→delete
with separate seller,buyer,anonymous sessions. Unknown outcomes must not be shown as success.
One visible Avalda kuulutus action, no mandatory visible draft stage. After this same source
checkpoint is finished, continue actual integration rather than another docs-only finisher.
Energy/payments/AI/search extras wait. No existing account/listing/image/journal deletion is authorized.


## 2026-10-14 — lõppavaldamise ES2017 build-parandus (sama pooleli lähteetapp)

Algne 12:00 paigaldaja kirjutas34 rada, kuid build väljus1-ga; staging/commit/push ei alanud.
12:38 salvestatud logi diagnostika kinnitas TS2737: finalContract.ts:7:133 kasutas
9223372036854775807n literaali, projekti tsconfig.target on ES2017. Vana moodulitestide
kompileerimine kasutas ES2022; see ei kontrollinud tegelikku build-sihti. See oli
ettevalmistuse puudus, mitte kasutaja seadistusviga.

Samas ID-kontrollis asendatakse ainult literaal avaldisega BigInt("9223372036854775807").
Piir jääb täpseks; ei Number-teisendust, uut hinnareeglit, ES2020-sihttaseme tõstmist ega
tüübikontrolli väljalülitamist. Tsconfig/paketid ja23 migratsiooni säilivad.21 ülejäänud
testitud kandidaatfaili, sh kogu SQL ja vana81-testifail, jäävad muutmata. Algne143SQL
tõend säilib; vana81PASS on algse baitversiooni tõend, mitte muudetud faili uus täisvastuvõtt.

Uus tests/listing-publication-final-es2017.test.cjs kontrollib sama tegeliku ES2017/lib/strict
valikuga kompileerimist, vana literaali TS2737 negatiivkontrolli ning41 uut ID/receipt/price
regressiooni, sh1000 deterministlikku piirivõrdlust ühes testis. Assistendi Node22.16.0/
TS5.8.3 peal läbis41/41 ja kogu viie uue mooduli ühenduse ES2017 typecheck. Maci uus käik
teeb need uued kontrollid Node24.16.0/TS5.9.3 peal; vanu143/81/sarju ei korrata.

Eraldi piiratud parandaja kontrollib värskelt tegelikku baasi/koguindexit/tööpuud/558
allikat/23migratsiooni/kaug-main'i. Muutub üks olemasolev TS-rida, lisandub uus test ja
see eraldi parandustõendi dokument; seotud jooksvad dokumendid täpsustuvad. Kokku on
sama lähteetapi kavand36 rada,560valitud allikat. Ainult uute kontrollide järel kirjutused,
seejärel üks uus build ja edul täpne staging. Ei commit/push-i, SQL-i, Storage'i ega installi.
Selle ette kirjutatud teksti järgi ei tohi tulevast build'i/PASS-i eeldada: tegelik tulemus
loe private-final-source-bigint-repair ZIP-ist. STOP-il säilita kõik; vana paigaldajat ei korrata.

Upload/avaldamine jääb suletuks. Hiliste kirjutuste lõplikkus, blocked_write_settlement
objektide täielik koristus, konto/identiteedi/sõnumite ning terve kasutajatee ühendus
jäävad kohustuslikuks. Olemasolevate kontode/kuulutuste/piltide/päevikute kustutusluba puudub.
