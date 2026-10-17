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

# V2 — SOURCE-loa algne jälgimine ja püsiv väljastuspiir

16.10.2026. Testitud 52/87 kandidaat; uus lähtepaigaldus/build/staging VEEL VAATLEMATA.
Baas5725171 on commit'itud/push'itud, puhas ja Ready39s/Production-tõendiga. Uus SQL on
laboris/API-closed; see dokument ei tõenda productioni rakendust ega avaldamise avamist.

## Üks kitsas leping olemasolevas V2 voos

Uue reserved-grant'i INSERT loob muutumatu source_release_tracking kirje. Kaetus
algab reservatsioonist, mitte ajaloolisest oletusest. Ajaloolisi lubasid ei täideta
tagantjärele. Tokeni recorded-olek ei tähenda automaatselt väljastamist.

Muudetud issuePrivateUpload säilitab Authi serverikontrolli, konto/identiteedi/katse,
faili räsi/mahu/raja ning olemasoleva reserveerimise/allkirjastamise/salvestamise.
Getter nõuab tegelikku teenuserolli ja teeb enne tokeni serverile tagastamist
muutmatu source_release_intents kirje. See tähendab „võis olla väljastatud”, mitte
brauseri kättesaamiskinnitust. Sisemine release-ID ei lisandu brauseri grant-objektile.

Enne tokeni brauserile andmist teeb server teise eraldi HTTP-RPC confirm'i. See peab
leidma sama release-ID,tokeniräsi,granti ja konteksti; puuduvat intent'i ta EI loo.
Rollback'i, kadunud vastuse, vigase või muudetud seose, tühistamise või aegumise
korral tokenit ei väljastata. Automaatset võrgukordust ega uut allkirjastust ei tehta.

Esimese tehingu vastus ei ole püsiva intent'i tõend. Teine HTTP-päring peab toimuma
sõltumatu tehinguna. Tegelik PostgRESTi konfiguratsioon ja commit-piir jäävad avamise
integratsioonikatsesse. SQL-i teenuserolli getter+confirm-test ühes tehingus ei tõenda
seda HTTP-omadust. Salvestatud recorded_at on INSERT-vaatlus, mitte commit'i kellaaeg.

## Koristuse lisand ja säilivad piirid

settleRecordedSourceOne teeb ühe piiratud DB-RPC ega allkirjasta/loe/kustuta Storage'i
faili või korda päringut. Ainult lõpetatud katse algusest kaetud recorded-grant,
millel pole intent'i, saab muutumatu source_recorded_never_released tõendi ja oma
blocked SOURCE-koristusrida pending-olekusse. Olemasolev cleanupOne teeb eemaldamise
hiljem Storage API kaudu. Mahureservatsioon säilib kuni koristuse kinnituseni.

Aktiivse/avaldatud katse fail,ajalooline kaetuseta grant ja iga intent'iga grant
jäävad keelatuks. Kaetud ning intent'ita aegunud või saladusest puhastatud grant võib
sobida just tõendi,mitte aegumise tõttu. Ajalooline või võimalikuna väljastatud luba
jääb ka aegunult/purgitult blokeerituks. See EI tühista väljastatud Storage-tokenit.
Signing-no-release,unsigned SOURCE ja senine tingimuslik WEB-tõend säilivad.
Ebapiisava WEB-tõendi piiri ei muudeta; täielik failikustutus pole valmis.

## Õigused ja osalise ühenduse keeld

Kolm uut tabelit on RLS/FORCE RLS-iga, API-rollidele suletud ja muutmiskaitsega.
Testitud funktsioonid kasutavad olemasolevaid actor/identity/policy abifunktsioone ja
lukujärjekorda. Kaks cleanup-eligibility abifunktsiooni saavad ainult täiendava
proof-alternatiivi. Getter'i postgres-omand säilib; see pole lõpliku productioni
privileegikitsuse tõend. Positiivsed teenuserolli testid kasutavad ajutist EXECUTE'i;
RESET ROLE enne ranget kontrolli ja grantide rollback. Productioni õigusi ei avata.

Uus issuer ja SQL getter/confirm moodustavad sobiva paari. Puuduva poole korral peab
väljastus keelduma; vana authenticated otsegetter pole ümbersõit. Koodi paigaldamine
ja build ei aktiveeri uut liidest. Ainus service record/get/eraldi-püsivuskinnituse
tee, saladuste mitte-logimine ja teiste privilegeeritud kirjutajate puudumine
vajavad endiselt päris integratsiooni vastuvõttu.

## Täpne tõend ja lähtepaigalduse ulatus

Inventuur docs/verification/v2-source-release-tests-20261016.json säilitab algse
16:34Maci52/52Node+ES2017strict ja87/87PG17.6 tõendi. Muudetud issuer ja vana cleanupOne
käivitati kohaliku sünteetilise Auth/RPC/Storage/tehingumudeliga. Native/pilvekatset pole.
87SQL=66rollback+15viiesajastuses+6isolatsiooni;4lukuootamist,viies sama konto teine katse.
33SQLexit0/kaksfixture-NOTICE'it/omaabi eemaldatud. Varasem üleslaadimissari käib vana
issuer-versiooni kohta; uus52sihtjuhtu ei ole selle sarja uus täisvastuvõtt.

Paigaldaja säilitab kümme testitud faili, muudab kaheksa dokumenti ja lisab kaks uut:
20rada (11uut/9muudetud), oodatud605lähtefaili. Üks uus päris build ja ainultPASS-i
järel20stagedrada. 52/87 ega varasemaid teste, SQL-i, Storage'i, Dockerit, paketipaigaldust,
commit'i või push'i ei tehta. Tegeliku paigalduse/build'i allikas on uue käigu result.json,
mitte ette kirjutatud dokument. STOP säilitab failid/index/päeviku, automaatset taastamist pole.

## Kogu kasutajatee enne avamist

Üleslaadimine/avaldamine jäävad suletuks. Päris Storage/versioonikustutus/HTTP/CORS/
mahud/mobiil/native-pilv,konto-identiteedi-sõnumite kooskõla ning lisamine→leidmine→
detail/profiil→suhtlemine→haldamine→kustutamine tuleb kontrollida eraldi müüja,ostja ja
anonüümse seansina. Need on vältimatud, mitte hilisemad mugavused. Kasutajale üks
Avalda kuulutus,toimivad hinna/identiteedi/reegli/hobuse/sõnumimoodulid säilivad.
Energy/maksed/AI/otsingu lisad ootavad. Olemasolevate kontode,kuulutuste,piltide ja
operatsioonipäevikute kustutamisluba pole. Pärast sama lähteetapi kaitstud lõpetamist
jätkub sisuline V2 integratsioon, mitte eraldi docs-only töö.
