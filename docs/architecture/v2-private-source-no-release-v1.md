## 16.10.2026 — SOURCE-loa väljastusjälje sama lähteetapi lõpetamine

**SOURCE RELEASE SOURCE paigaldus, üks uus projektibuild ja tulemuse ülevaatus on
tehtud. Järgneb SAMA 20-rajalise muudatuse piiratud lõpetaja. See ette kirjutatud
tekst EI kinnita tulevase commit'i, push'i või juurutuse õnnestumist: loe UUE käigu
result.json-i. Allolev vanem „veel tegemata” tekst säilib ajaloolise tõendina.**

- Alus `57251714485e0c100379a3eb923cbca356554055` / main, parent `8f5c3a8`.
  Viimane täielik Maci kaitse 16.10.2026 18:55:29.585941 Tallinn: 20 staged rada,
  staging'uväliseid muudatusi pole; 605 valitud allikat ja 23 migratsiooni.
  Tööpuu pole puhas. Kaug-main 18:55:28.130117 oli sama baas. Need on salvestatud
  vaatlused; lõpetaja nõuab enne uusi kirjutusi värsket tegelikku kontrolli.
- Algne tõend `source-release-source-install-20261016-185509-8mgd_cvj.zip`:
  7 591 391 baiti, SHA256 `88335319b071ce380362d43c24e935051ce0a1527d1287d0711189f0ae53885a`.
  Kõik kümme testitud faili on paigaldatud täpselt. Sama20rada = 11uut/9muudetud,
  millest olemasoleva issuer'i asendus ja üheksa uut faili moodustavad testitud osa.
- Päris build 18:55:20.644282–18:55:25.148589 Tallinn: exit0. Node24.16.0,
  npm11.13.0, Next16.2.1, TypeScript5.9.3 ja Sharp0.34.5 on paigalduse varasemad
  vaatlused, mitte lõpetaja uus runtime-test. Build'i stdout1560b jäi privaatseks;
  toorlogi sisu ega hoiatuste puudumist siin ei väideta. Uut native-katset polnud.
- Muutmata 16:34 Maci tõend: 52 Node/HTTP + 87 SQL, range ES2017, PG17.6
  66rollback+15kontrolli viies ajastuses+6isolatsioonikeeldumist. Neli lukuootamist;
  viiendas sama konto teine katse. 33SQLexit0/kaksfixture-NOTICE'it; oma abi eemaldati.
  Kohalik HTTP kasutas sünteetilist Auth/RPC/Storage/tehingumudelit. SQL service_role
  getter+confirm on ühe tehingu õigustest, mitte kahe PostgRESTi HTTP-commit'i tõend.
  Uue issuer'i tõend on52sihtjuhtu, mitte vana üleslaadimissarja uus täisvastuvõtt.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus, värsked tegelikud main/HEAD/parent/
kogupuu/koguindex/tööpuu/605allika/23migratsiooni/lubatudorigin-main kaitsed.
Täpsustatakse ainult üheksat juba samasse20-rajalisse staging'usse kuuluvat dokumenti.
Kümme testitud faili, nõuded, üheksa tõendiinventuuri ja töötavad moodulid ei muutu.
Jooksva üleandmise kontroll, kontrollitud eraldi commit-index, üks commit ja kuni üks
mitte-force main-push. Build'i,52/87/vanemaid teste,SQL-i,Storage'it ega installi ei tehta.
Uus ühekordne päevik; vanu päevikuid ei avata. Osalist muutust ei taastata automaatselt.

**Pärast käiku:** loe UUE source-release-source-finish tulemus, commit-proof,
remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean järel
jätka otse sama V2 võimalikuna/juba väljastatud SOURCE-loa lõplikkuse, ebapiisava
WEB-tõendi, püsiva koristuse/lõppkustutuse ja terve kasutajatee integratsiooni.
Eraldi docs-only ringi ei lisata. STOP-il säilita failid/index/päevik; ära korda
lõpetajat ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Uus issuer+getter/eraldi kinnitaja on suletud paar; osaline aktiveerimine peab keelduma.
Kaetud recorded-grant ilma intent'ita võib sobida koristusse tõendi, mitte aegumise tõttu.
Võimalikuna/juba väljastatud või ajalooline algse jälgimiseta SOURCE jääb blokeerituks
ka aegumisel/purgimisel. Ebapiisav WEB-tõend ja täielik failikustutus on lahendamata.
Ainus service record/get/eraldi püsivuskinnitus, lekketa saladused, teiste privilegeeritud
kirjutajate puudumine, päris PostgREST/Storage/versioonikustutus/HTTP/CORS/mahud/mobiil/
native-pilv ning konto-identiteedi-sõnumite/vormide/marsruutide kooskõla vajavad vastuvõttu.
Eraldi müüja/ostja/anonüümne lisamine→leidmine→detail/profiil→suhtlus→haldamine→kustutamine
on enne avamist vajalik, mitte mugavus. Energy/maksed/AI/otsingulisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
5725171 Ready39s/Production on vastu võetud baasitõend; sama pilti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika; lõpetaja uut juurutusolekut ei kinnita.

---

## 16.10.2026 — SOURCE-loa väljastusjälje 52/87 tõend ja piiratud lähtepaigaldus

Praegune commit'itud baas on `57251714485e0c100379a3eb923cbca356554055`.
Eelmine 19-rajaline SOURCE-no-release etapp on commit'itud/push'itud ja üle vaadatud;
5725171 Ready39s/Production-ekraanipilt on vastu võetud. Seda etappi ega pilti ei korrata.
Allolevad vanemad järgmised tööd on ajalugu, mitte tänased käivitamisjuhised.

Maci 16.10 kell16:34 SOURCE RELEASE tõend: 52/52 uut Node/HTTP-testi ja ES2017/strict
(Node24.16.0/TS5.9.3), 87/87 PG17.6 SQL-kontrolli (66 rollback + 15 viies ajastuses +
kuus isolatsioonikeeldumist). Neli lukuootamist; viiendas edeneb sama konto teine katse.
33 SQL-käsku exit0, kaks fixture-NOTICE'it; oma abi eemaldati. Auth/RPC/Storage ja
HTTP tehingutulemused on sünteetilised. SQL service-role getter+confirm katse on ühes
tehingus, mitte kahe päris HTTP-commit'i vastuvõtt. Muudetud issuer'i tõend on need
52 sihitud juhtu, mitte vana üleslaadimissarja uus täisvastuvõtt.
Inventuur: `docs/verification/v2-source-release-tests-20261016.json`.

Uus lähtepaigaldaja säilitab kõik kümme testitud faili. Üks neist asendab olemasoleva
issuePrivateUpload.ts-i; üheksa on uued. Kümme dokumendirada annavad kokku20rada:
11uut + üheksa olemasoleva faili muudatus (issuer ja kaheksa dokumenti). Oodatud
valik on605lähtefaili. **Uus paigaldus/build/staging on VEEL VAATLEMATA** selles ette
kirjutatud tekstis; tegeliku käigu allikas on uus source-release-source-install result.json.
Üks uus päris projektibuild ning ainult PASS-i ja värskete kaitsete järel täpne staging.
52/87 ega vanemaid teste ei korrata. SQL/Docker/Storage/install/commit/push puuduvad.

Uue reserved-loa algne muutumatu jälgimine, teenuse kaudu getter ja eraldi püsiva
väljastusjälje kinnitus moodustavad ühe lepingu. Alles kinnituse järel tagastatakse
token brauserile. Kinnitaja ei loo puuduvat intent'i. Intent tähendab „võis olla
väljastatud”, mitte brauseri kättesaamist. Uue lepingu üksiku poole aktiveerimine
peab keelduma, mitte kasutama vana lubavat rada. SQL jääb labs-only/API-closed.
Kaetud recorded-loa suletud katse ja intent'i puudumine võivad anda koristusloa;
ajalooline kaetuseta grant või ükskõik milline intent jääb blokeerituks. Kaetud
intent'ita aegunud/purgitud grant sobib tõendi, mitte aegumise enda tõttu.
See EI tühista väljastatud tokenit. Mahureservatsioon jääb koristuse kinnituseni.

Üleslaadimine ja avaldamine jäävad suletuks. Võimalikult väljastatud SOURCE-load,
ebapiisav WEB-tõend ja täielik failikustutus on endiselt lahtised. Ainuke teenuse
record→get→eraldi püsivuskinnitus, saladustelekketa käitumine ja teiste privilegeeritud
kirjutajate puudumine, päris Storage/HTTP/CORS/versioonikustutus/mahud/mobiil/native-pilv
ning konto-identiteedi-sõnumite/vormide/marsruutide/terve müüja–ostja–anonüümse tee
vastuvõtt on enne avamist vajalikud. Energy/maksed/AI/otsingu lisad ootavad.
Kontode/kuulutuste/piltide/operatsioonipäevikute kustutamisluba puudub.

Pärast uue tulemuse ülevaatust lõpeta SAMA20-rajaline lähteetapp eraldi kaitstud
lõpetajaga, siis jätka sisulist V2 integratsiooni; eraldi docs-only ringi ei tehta.
Enne iga Maci kirjutust tegelik HEAD/koguindex/tööpuu/allikate/migratsioonide/lubatud
remote'i kontroll. STOP säilitab failid/index/päeviku; ära korda ega taasta käsitsi.

--- Varasem muutmata ajalugu ---

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

# V2 väljastamata SOURCE-loa püsiv piir — v1

16.10.2026. Lähtepaigalduse leping; SQL jääb laborisse ja API suletuks.
Üheksa faili Maci33/67 testitõend on vastu võetud. Uus paigaldus/build on VEEL VAATLEMATA.
Baas8f5c3a8/583valitudfaili; uus19-rajaline lähtepakett ei ole täisrepositoorium.

## Kitsas tõend ja hilise vastuse piir

Olemasolev issuePrivateUpload.ts nõuab enne tokeni väljastust record_listing_upload_grant_v1
kinnitust ning omaniku getterit. Grant ei liigu recorded-olekust tagasi signing-olekusse.
Uus proof puudutab ainult suletud katse endiselt signing-olekus granti, mille token,
hash, recorded_at, issued_epoch, expires_epoch ja token_purged_at on NULL. Privaatne source_no_release kirje
seob täpse object_id/grant_id/claim_id. Selle lisamine kasutab sama katse lukku.
Narrow trigger keelab signing→recorded ülemineku hilinenud vastusele ka olemasoleva
record-RPC kaudu:55000/publication_source_release_sealed. Tõend on muutmatu ja säilib
ka pärast koristuse lõpetamist. Getter/allkirjastaja suletud katset ei ava.

See EI OLE Storage-tokeni revokatsioon ega varem alanud pilvekirjutuse lõpetamine.
Recorded-grant jääb blokeerituks ka siis, kui getterit ei kutsutud, vastus kadus,
token aegus või salajane token purgiti. Puuduv grant ei tõenda loa puudumist.
Reserved-juhtum jääb olemasolevale allkirjastamata reservatsiooni kontrollile.
Ebapiisava tõendiga WEB jääb samuti blokeerituks. Aegumine/404/logout/timeout ei piisa.

## Olemasolev koristaja ja maht

settleUnreleasedSourceOne.ts teeb ühe piiratud sisemise RPC; ei signeeri, laadi üles,
loe ega kustuta Storage-faili, ei korda päringut automaatselt. Kadunud vastus annab
reconcile, mitte vale edu. Lukustatud katse jäetakse vahele; teine sobiv katse saab edeneda.
SQL lisab proof’i ja triggeri/RPC ning asendab kaks olemasolevat cleanup-sobivusfunktsiooni
senise sisu ja uue proof-alternatiiviga. Ei uut üldmootorit ega olemasolevate moodulite asendust.
Täpset faili kustutab hiljem muutmata cleanupOne.ts. Korduskontroll ei taasloo lõpetatud
koristusrida; mahureservatsioon säilib tegeliku koristuse lõpetamise kinnituseni.
Testis SOURCE-reservatsioon26 214 400b, mitte kliendi100b. SQL-ACK pole pilvefaili kustutus.
Aktiivse/avaldatud katse pilt ei ole selle tee sihtmärk.

## Õigused ja avamise eeltingimused

Labori privaatne proof/tõkketrigger ja RPC jäävad suletuks public/anon/authenticated/
service_role API-rollidele. Positiivne service_role test kasutab ajutist EXECUTE luba;
RESET ROLE tehakse enne testhelperit ning luba pööratakse tagasi. See ei ava productioni ACL-e.
Record-before-get peab olema ainus loa väljastustee. Muu tee, saladuse logileke või
teine privilegeeritud failikoha kirjutaja pole tõendiga kaetud. Tegelik integratsioon
peab kinnitama need piirid, Storage’i skeemi/versiooni/järjekorra/versioonikustutuse,
HTTP/CORS/mahud/mobiili/native-pilve, konto-identiteedi-sõnumite kooskõla ning kogu
lisamine→leidmine→detail/profiil→suhtlus→haldamine→kustutamine tee eraldi müüja/ostja/anonüümse seansina.
Need on enne avamist vajalikud, mitte hilisemad mugavused. Täielik failikustutus pole valmis.

## Testitõend ja lähtepaigalduse piir

Muutmata inventuur:docs/verification/v2-source-no-release-tests-20261016.json.
Maci33/33Node+ES2017strict PASS; reaalsed kohalikudHTTP-päringud ja muutmata broker/cleaner,
Auth/RPC/Storage sünteetilised, native puudus. PG17.6 67/67:50rollback+15viiesajastuses+2isolatsiooni;
kaks lukuootamist ja kolm teise tehingu varasemat lõppu, viimane sama konto teine katse.
29SQLexit0/kaksfixture-NOTICE’it/omahelpereemaldatud. Need pole päris teenuse katsed.

Lähtepaigaldaja säilitab kõik üheksa testitud TS/SQL/testi/README faili täpselt. Lisab
kümme dokumenti (8muudetud/2uut), ühe uue build’i ja ainultPASS-i järel19stagedrada.
33/67 ega vanemaid teste ei korrata; SQL/Docker/Storage/install/commit/push puuduvad.
Uue tegeliku tulemuse allikas on source-no-release-source-install result.json, mitte
käesolev ette kirjutatud tekst. STOP säilitab failid/index/päeviku. Järgneb sama lähteetapi
kaitstud lõpetamine ja siis sisuline V2 integratsioon, mitte eraldi docs-only ring.
Kasutajale jääb üks Avalda kuulutus toiming. Energy/maksed/AI/otsingu lisad ootavad.
Olemasolevate kontode/kuulutuste/piltide/päevikute kustutamisluba puudub.
