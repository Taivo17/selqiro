# V2 privaatse avaldamiskatse ja pildikohtade kandidaat

12.10.2026. **Uus tegelik kood; kasutaja reposse paigaldamata ja productionis rakendamata.**
Baas `cb6b68bf2afedd138f18d0f1eccb0562d05e36cb`. See ei ole migratsioon ega avatud RPC.
Kasutajale jääb lõppvoos üks „Avalda kuulutus” toiming; kohustuslikku nähtavat mustandit ei lisata.

## Käesolev kood

1. `01_private_state.sql`: eraldi mitteavalik skeem, katse, järjestatud pildikohad,
   kaks täpset objektiviidet pildi kohta ja koristusviited. Kõigil tabelitel RLS,
   puuduvad lubavad poliitikad; PUBLIC/anon/authenticated/service_role õigused eemaldatud.
   Hinnad, kirjeldused ja failiviited EI satu vanasse avalikult loetavasse listings-tabelisse.
2. `02_values_and_policy.sql`: olemasoleva konto/aktiivse identiteedi lukustaja ja
   versioonitud nõustumiste kontroll; piiratud pildi-intent ja omanikule tagastatav vaade.
3. `03_owner_attempt.sql`: ettevalmistus ja sama taotluse tulemuse taastamine. Kasutab
   olemasolevaid hinna-, kategooria-, põhivälja- ja loomise normaliseerijaid muutmata kujul.
   Sama konto + kordustaotluse võti + identiteet + kanooniline sisu + järjestatud pildi-intent
   annab sama katse; muudetud sisu sama võtmega keeldub. Esmane loomine ja kõik objektiviited
   on üks andmebaasitehing. Avalikku kuulutust ega pildirida ei looda.
4. `04_upload_dispatch.sql`: sisemine ühekordne väljastamise RESERVEERIMINE, mitte signed URL.
   Väljastamise kavatsus peab enne välist Storage-kutset püsivalt commit'itud olema.
   Sama reserveerimise kordus ei anna uut väljastamisluba; kadunud vastus ei ole luba uuesti
   allkirjastada. Tegelik transport, tulemuse taastamine ja õiguse kehtivuse kinnitus puuduvad veel.
5. `05_close_attempt.sql`: omanik tühistab või tulevane aegumise töötlus sulgeb ühe katse;
   täpsed koristusviited kirjutatakse ENNE sisuteksti eemaldamist samas tehingus. Viga jätab
   mõlemad muutmata. Katse ei avane vanast kordustaotlusest uuesti.
6. `src/server/listing-publication/attempts/prepareInput.ts`: puhas käsu koostaja, mitte
   autentimiskontroll ega RPC. Taaskasutab täpset hinnamoodulit ja olemasolevat pildiarvu/
   suuruse piiri, kopeerib ja külmutab sisendi, ei teisenda asukohanimesid ega mõõtühikuid.
   Kliendi räsi või suurus on kavatsus, mitte serveri kontrollitõend.

Objektirada on ainult serveris moodustatud `v1/<attempt-id>/<slot-id>/source.upload` või
`web-v1.webp`. Konto ID-d, kliendi failinime ega kliendi antud rada sinna ei lisata.
`listing-publication-private` on tulevase eraldi privaatse hoidla kandidaatnimi: seda hoidlat
siin EI looda. Vana public `listing-images` seadistus ja olemasolevad URL-id jäävad muutmata.

## Autentimise, identiteedi ja reeglite piir

Kõik omanikutoimingud nõuavad õiget `auth.uid()` ning oodatud kontot/aktiivset identiteeti.
Taaskasutatakse `lock_listing_creation_actor_v1`: konto profiil FOR UPDATE, identiteet ja
vajalik aktiivne äriliikmelisus FOR SHARE. Konto sees on lukujärjekord profiil → katse → objekt.
Erinevad kontod ei saa teineteise katset lugeda; sama ärilise identiteedi kasutamine ei tee
teise konto privaatset katset automaatselt jagatud tööks. Jagatud mustandit ei ehitata.

Kandidaat nõuab READ COMMITTED režiimi; REPEATABLE READ ja SERIALIZABLE keeldutakse.
Iga uus katse ja esimene väljastamisreserveering kontrollib nõutud kehtivaid versioone uuesti.
Katse lugemine või tühistamine ei nõua uute tingimustega nõustumist.

V2 riik on praegu vabatekst, mitte kontrollitud ISO-/poliitika riigikood. Seda ei tuletata
keelest, valuutast, otsingupiirkonnast ega kirjapildist. Käesolev suletud kandidaat kasutab
ainult globaalset `listing` / `et-EE` poliitikavalikut. Kui tekib aktiivne, mitte lõppenud
riigipõhine tavakuulutuse reegel, peatub ettevalmistus/väljastamine selge serveriveaga.
See on konservatiivne keeldumine, mitte valmis riigipõhiste reeglite lahendus või EE-tehingute piirang.
Hobuse `horse_offer` reegel jääb eraldi; seda ei muudeta ega rakendata tavakuulutusele.

Reeglitabeli lühike SHARE-lukk väldib uue reeglirea ilmumist valiku ja kirjutuse vahele.
Välist võrguoperatsiooni selles tehingus pole. Nõustumisread lukustatakse ja seinakella
kehtivust kontrollitakse uuesti ka oote järel; olemasolevaid `now()`-põhiseid abilisi ei muudeta.
See lukk võib hetkeks oodata reeglite halduse kirjutust; 2 s lock_timeout keeldub selle asemel,
et anda eksitav eduteade. Avaliku HTTP endpoint'i koormuspiir on endiselt vajalik.

## Kavandatud testpiirid, mitte productioni seaded

- Üks katse: 24 tundi, kuni 10 pilti, iga algfail kuni 25 MiB, deklareeritud kogumaht kuni 100 MiB.
- Konto: kuni 3 kehtivat avatud katset ja 20 uut katset viimase 24 tunni jooksul.
- Iga pildikoha jaoks reserveeritakse MAKSIMUM: 25 MiB algfail + 4 MiB veebifail, kokku 29 MiB.
  Kliendi väide „1 bait” ei vähenda arvestust; säilinud objektiviidete eelarve on 300 MiB/konto.
- Reserveeritud eelarvet ei vabastata oletusega pärast tühistamist. Tulevane kontrollitud
  koristus peab selle vabastamise siduma tegeliku Storage-tulemusega. Seetõttu ei sobi
  praegune suletud kandidaat ilma koristusühenduseta kasutajatele avamiseks.
- Null pildiga kavatsus on esitatav: kinnitatud nõuded ei määra veel kohustuslikku miinimumi.
  Lõppavaldamise pildinõue tuleb otsustada ja kontrollida sealses ühenduses, mitte siin oletada.

## Püsiv koristusviide ei võrdu kustutatud failiga

Väljastamise reserveeringuta objekt läheb olekusse `pending`. Reserveeritud allkirjastamisega
algfail läheb olekusse `blocked_write_settlement`: võrgukutse võis toimuda või võib hilineda.
Oletuslikku 404, ajapiirangut, väljalogimist või vormi sulgemist ei loeta koristuse kinnituseks.
Praegune kood EI märgi ühtegi objekti kontrollituks, avaldatuks ega Storage'ist kustutatuks.
Queue-radu ei saa selles etapis ümber kirjutada või kustutada; lõplik töötlus vajab oma lepingut.

Supabase uuritud createSignedUploadUrl annab kahe tunni õiguse ilma edasise autentimiseta.
See on välise liidese omadus, mitte siinse katse 24-tunnise tähtaja lubadus. Hilinenud
väljastamine ja upload nõuavad tegelikku HTTP-katset ning püsivat lõpetamise tõendit.
Ühekordne reserveering ei lahenda veel välise teenuse kadunud vastuse taastamist.

Katse tombstone sisaldab endiselt konto/identiteedi viidet ja intent-räsi, mitte kustutatud
sisuväljade koopiat. RESTRICT-seosed ja tähtajata receipt ei ole valmis konto kustutamise/
säilituse poliitika; see tuleb lõppkustutuse ning konto eemaldamise teega ühtlustada.
Me ei eemalda kasutaja kontosid ega olemasolevaid kuulutusi nende testimiseks.

## Uued testid ja tõendipiir

`tests/fixture.generated.sql` koostab ainult uue sünteetilise andmebaasi sõltuvused:
23 täpset deklaratsiooni (tabelid, funktsioonid, kaks reegli-indeksit) kontrollitud baasallikatest.
`DEPENDENCIES.json` annab päritolu ja räsid. Ei käivitata ühtegi vana migratsiooni ega vana testsarja.
Fixture ei ole kogu Supabase skeem: olemasolevate tegelike RLS-poliitikate, triggerite,
rollipäriluse ja HTTP-autentimise täielikku integratsiooni sellega ei kinnitata.

Uus SQL sari: 157 kontrolli ühe välise BEGIN/ROLLBACK sees. Eraldi kataloogi/baasloenduse
võrdlus kinnitab tagasipöörde. Seejärel kandidaat püsib AINULT uues abis 12 päris
mitmeühendusliku ajastuse jaoks (36 kontrolli) ning kahe isolatsioonirežiimi keeldumiseks.
Blokeerivates ajastustes peab juht nägema `pg_blocking_pids` kaudu täpset oodatud ootamist,
mitte lootma unetaimeri järjekorrale. Kahe konto katsed peavad valmima enne esimese commit'i.

Siin assistendi keskkonnas läbis 109 tegeliku käsukoostaja testi ja range TypeScripti kontroll
Node 22.16.0 / TypeScript 5.8.3 peal. Maci käiviti nõuab olemasolevat TypeScript 5.9.3 ja
käivitab ainult need uued testid uuesti selle olemasoleva versiooniga, midagi paigaldamata.
**SQL ei ole assistendi keskkonnas kompileeritud ega käivitatud: PostgreSQL puudub.**
157 + 36 + 2 on kavandatud SQL kontrollide arv, mitte väide edukast käigust.

Uus käiviti ei kirjuta reposse: enne/pärast kontrollib tegelikku cb6b68b Git-seisu, indexit,
481 allikat ja 23 migratsiooni. Kasutab ainult varem teadaolevat olemasolevat PG 17.6 image-ID-d,
uut juhusliku tunnusega network-none konteinerit, mitte originaalset `supabase_db_selqiro`.
Ei paigalda pakette/image'it, ei kasuta DB URL-i või TCP-d, ei tööta hosti bind-mount'idega.
Pärast käiku eemaldatakse ainult tõendatult selle käigu abikonteiner. Ebaselge tulemuse korral
jääb uus päevik ja STOP; vana päevikut ei loeta ega kustutata. Protsessi krahhi järel võib
abi jääda seisma kuni eraldi ülevaatuseni; eemaldamise edu ei oletata.

## Mis peab enne avaldamise avamist veel päriselt ühendatud olema

Tegelik privaatne Storage ja piiratud õigus, native-verifitseerija päris pilveskäivitus,
muutmatu sanitiseeritud väljundi baitide/räsi sidumine, lõppavaldamise korduskontrollid,
URL-ide/nähtavuse kooskõla avalikes lugejates, püsiv piiratud koristustöötleja koos haldusnäitudega,
mittetaastatav kuulutuse lõppkustutus, ohtlike V1 kirjutuste kitsas sulgemine ja telefoni „Lisa”
navigeerimine töötavasse V2 voogu. Sõnumite ja kuulutuse kustutamise sõltuvus vajab eraldi
lepinguotsust; käesolev katse ei loo ega eemalda vestlusi. Need pole ühe SQL PASS-iga valmis.

Kogu teekond lisamine → leidmine → detail/profiil → suhtlus → haldamine → kustutamine
kontrollitakse müüja, ostja ja anonüümse seansiga. Energy, maksed, AI, täielik V1 tugi ja
otsingu mugavused jäävad selle töö vahelt välja. Järgmine repo dokumentide uuendus tuleb
päris koodipaketi paigaldamisel, mitte eraldi lõpetajate tsüklina.

## Ametlikud liideseallikad (12.10.2026; ei tõenda Selqiro runtime'i)

- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- https://www.postgresql.org/docs/17/explicit-locking.html
- https://www.postgresql.org/docs/17/functions-info.html
- https://www.postgresql.org/docs/17/transaction-iso.html
- https://docs.docker.com/reference/api/engine/version/v1.52/
