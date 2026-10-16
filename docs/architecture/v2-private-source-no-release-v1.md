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
