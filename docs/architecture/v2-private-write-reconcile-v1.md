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

# V2 piiratud kirjutuse lõplikkuse kontroll — v1

2026-10-15. Lähtepaigalduse leping, mitte productioni migratsioon või avaldamisava.
Kümne faili muutmata Maci 48/83 testitõend on vastu võetud; uus paigaldus/build on
VEEL VAATLEMATA. Lähtebaas ea212d3, 571 valitud faili, mitte täisrepositoorium.

## Kaks piiratud juhtumit

Suletud katse püsiv SOURCE-reservatsioon on sobiv ainult siis, kui allkirjastamise claim
pole kunagi alanud. Olemasolev signer, tühistamine ja tõendi salvestus kasutavad sama
katse lukku. Puuduv grant, signing/recorded olek, aegumine, logout või 404 ei tõenda
selle juhtumi ohutust. Varem väljastatud luba ei tühistata.

Ühe ettevalmistatud WEB-kirjutuse kadunud vastuse korral tuleb lugeda põhikataloogi
konkreetne objekti-ID/versioon, kogu fail (kuni 4 MiB, olemasolev 30 s baidilugeja) ning
kontrollida räsi ja mahtu. Salvestus kontrollib sama põhirea versiooni uuesti. Eraldi
muutmatu tõend ei võltsi HTTP200/Id/Key vastust ega tekita pildi valmidust/kuulutust.
Muutunud, puuduv või vastuoluline objekt jääb blokeerituks. Aktiivne/avaldatud pilt ei sobi.

WEB-juhtum on tingimuslik: tegelikus teenuses tuleb kinnitada kirjutus enne kataloogi-
commit’i, skeem/versioon, ainukirjutaja, peidetud POST-korduste puudumine ning failiversioonide
kustutamise leping. Uus SQL ei loo neid garantiisid Storage’i sisse. Testi nelja veeruga
storage.objects on sünteetiline, mitte tegeliku teenuse skeemivaatlus.

## Püsiv piiratud töö ja olemasoleva koristaja kasutus

reconcileWriteOne.ts: üks claim, kuni üks WEB GET, üks tulemus. Allkirjastamist,
üleslaadimist, kustutamist ega avaldamist see ei tee; automaatseid võrgukordusi pole.
Andmebaas säilitab 60 s CAS-tööõiguse, kuni kaheksa katset, kasvava tagasiootamise
alates 30 sekundist kuni 3600 sekundini ning needs_attention oleku. Aegunud claim saab
uue võtme, vana võti keeldub. See ei ole admini kasutajaliides ega ajastatud worker.

Tõend võib vabastada ainult täpse suletud katse faili blocked_write_settlement olekust
pending olekusse. Senine cleanupOne.ts teeb eraldi Storage API kustutuse ja kviitungi;
selle koodi siin ei muudeta. Lõpetatud koristust ei panda tagasi ootele. Väljastatud
SOURCE-loaga kustutatud kuulutus jääb deleting/files_remaining, mitte täielikult kustutatuks.

## Õiguste piir

Kaks sisemist RPC-d kasutavad olemasolevat dedicated final-writer rolli. Uued tabelid
kasutavad FORCE RLS-i; anon/authenticated/service_role API ligipääsu ei avata. Labori
final-writer saab ainult SELECT(id,bucket_id,name,version) filtreeritud ligipääsu teadaolevale
privaatsele WEB-rajale; Storage’i kirjutusõigusi ei lisata. See lugemisõigus vajab enne
productionit eraldi kontrolli. Testides anti ainult ajutine EXECUTE ja pöörati tagasi.

## Tõend ja järgmine kontroll

Maci Node24.16.0/TS5.9.3 ES2017/strict: 48/48. Päris loopback HTTP, sünteetiline RPC/Storage,
mitte native/pilv. Kaks loogilist piirnäidet on selle arvu sees. PG17.6: 64 rollback,
15 kontrolli viies ajastuses, neli isolatsioonikeeldumist. Neli päris lukuootamist;
viies sama konto teise faili edenemine. Kaks fixture-NOTICE’it, enda abi eemaldatud.
Inventuur: docs/verification/v2-write-reconcile-tests-20261014.json. Kandidaadi README
ettevalmistuse NOT_RUN-väiteid ei kirjutata ümber; hilisem PASS on inventuuris.

Paigaldaja säilitab kõik kümme testitud faili, lisab kooskõlalised dokumendid, teeb ühe
uue build’i ja ainult edul täpse 20-rajalise staging’u. Ei testi/SQL/commit/push’i.
Tulemust hinnatakse eraldi; seejärel lõpetatakse sama lähteetapp, mitte uus docs-only ring.
Üleslaadimine/avaldamine jääb suletuks. Väljastatud SOURCE, tõendita WEB, päris Storage,
konto/identiteet/sõnumid, vormid/marsruudid ja kogu müüja–ostja–anonüümse teekond on
endiselt avamise piirid. Energy/maksed/AI/otsingu lisad ootavad. Olemasolevaid kontosid,
kuulutusi, pilte või operatsioonipäevikuid ei kustutata.
