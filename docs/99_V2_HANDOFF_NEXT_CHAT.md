<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-01

## Praegune checkpoint

01.11 tegelik vana manifesti 55d3e168… Maci käik peatus baseline_verified etapis DATABASE_PRECONDITIONS_NOT_MATCHED teatega. Ainult lugemiseks tehtud DB-eelkontroll toimus, kuid functions ja final_writer_policies ei sobinud; DB kirjutus/build/commit/push jäid alustamata. Põhjuseks on kaks meie fixture’i viga: liiga üldised poliitikanäidised ja final_receipt’i varasem määratlus. Õige sõltuvusräsi kattub tegeliku raportiga. Parandatud kontrollalusega läbisid 26 SQL-i runtime- ja 19 paigalduskaitse katset ning 2 uut paigaldaja regressioonikatset. Varasem runtime-tõend säilib, paranduse Maci rakendamist ega Verceli Ready tulemust pole nähtud.

## Lähtekood ja tõendi piir

- **Aktiivne identiteet:** Nähtav nimi/logo ning tegeliku toimingu identiteet peavad kattuma kuulutuses, sõnumis, jälgimises ja uudisvoos. Vahetus samas või teises aknas ei vii vana mustandit uue identiteedi nimele; olemasolevad konto/tegutseja lukud ja muutumatud saatmiskinnitused säilivad.
- **Ette valmistatud ulatus:** Olemasoleva avaldatud hallatud galerii põhipildi valik; otsingu ja Minu ala kuulutuste merevaigutoon; ausad sisu eemaldamise ja failikoristuse tekstid. Uute piltide lisamine/eemaldamine ning täielik hosted koristus ei ole selle sammuga valmis.
- **Hobused:** Kuulutuste esimese terviku sees: sama lisamiskoht ning ühine otsing/detail/profiil/haldus/salvestamine/kontakt/kaart. Kategooria avab eriväljad ja kinnitused. Mustand on olemas; avaldamine ja ühised lugemisvaated vajavad ühendamist. horse_offers UUID ning müügi/ostusoovi semantika säilivad.
- **Kontrollaluse parandus:** Fixture peab sisaldama tegelikke identiteedipõhiseid lõppkirjutamise poliitikaid ning hilisemat 30-multipart final_receipt’i. Taastatud sõltuvusräsi fb89562d7bb6e653b53e3baad61ae32dc6a64aa1578051a2eed4f50cbf8af4e3 kattub kasutaja raportiga. Kaitseid ega tootmise õiguste piire ei nõrgendata.
- **Kujundus:** ListingSearchPage ja MyAreaListingsSection kasutavad taas merevaiku ning valgeid sisukaarte. Otsingufiltrite/kerimise leping säilib. Teenuste türkiis, tootenäidiste indigo ja kogu portaali ühtlus jäävad senise plaani osaks; Töö varasem täpne toon pole kinnitatud.
- **Lahtine kuulutuste töö:** Avaldatud kuulutuse piltide lisamine/eemaldamine, kogu elutsükli vastuvõtt, hosted lõppkoristus ja mahu vabastamine. Hoitud settle tagastab endiselt pending/filesRemaining:null. Uus tekst eristab kinnitamata koristust; see ei muuda seda lõpetatuks.
- **Logod ja Uudised:** Pärast kuulutuste-hobuste põhivoogu ühendada profiili kanooniline identity_profiles.avatar_url ka vestluse/valiku juurde ning teha oma V2 Uudiste vaade aktiivse identiteedi jälgitavate avalikele postitustele. V1 voog pärib praegu kuulutusi; V2 Uudiste ja Töö lingid suunduvad /v2. Need puudused on alles.
- **Põhipildi leping:** get_my_managed_listing_images_v1 ja set_my_managed_listing_primary_image_v1 seovad konto, aktiivse identiteedi, kuulutuse ning algse avaldamiskatse. Valik kasutab muutumatut algset ordinal’i ja eraldi bigint-esitlusversiooni; pildi URL-e, avaldamiskohti ega failikinnitusi ümber ei kirjutata.
- **Salvestamise piir:** Muutumatu käsk, tegutseja kontroll enne/pärast, üks kirjutus ilma automaatse korduseta. Konflikti või teadmata tulemuse järel uus pildivalik ei avane enne värsket seisu. Salvestusjärgne lugemine ei asenda uuemat põhipildivalikut vanema seisuga; identiteedivahetus hülgab vana seisu ja hilise vastuse.
- **Taastatud alus:** Varasema kandidaadi runtime ja 843 võrreldud muud lähtefaili säilivad. Päris peatunud Maci käik kontrollis baasi b0a04fccbf354f0480a4b6eb8dd176b3c55383a8. Parandatud kandidaat on uues assistendi lähtekoopias; enne järgmist kirjutust kontrollitakse tegelikku baasi uuesti.
- **Testandmete luba:** 01.11 võib eemaldada vanad testkuulutused/testsõnumid, kui need tekitavad probleemi ning konkreetne ulatus ja kasutuseta seosed on teada. Selles sammus ei kustutatud midagi. Kontod, identiteedid, logod, muu sisu ja päevikud säilivad.
- **Vastu võetud sõnumifotod:** Kasutaja kinnitas arvuti ja telefoni fotod, sh Viofo, automaatse vähendamise ning klaviatuuri kohal kirjutusvälja. Commit b0a04fccbf354f0480a4b6eb8dd176b3c55383a8 on vastu võetud foto alus ja tegeliku peatunud 01.11 jooksu baas; uut commit’i ei ole tõendatud.
- **Üleandmise rütm:** Eraldi pakk suurema kontrollitud etapi järel, konteksti/vestluse vahetamisel ja kasutaja soovil. Uus paigaldus: selqiro-kuulutused-pohipilt-parandus-20261101.zip; eraldi üleandmine: selqiro-uleandmine-20261101.zip. Vana pakett/päevik säilib; lühileht renderdatakse sellest CURRENT_STATE-ist.

## Tegelik kohalik katse

- Säilitatud 85 mudeli/kliendi ja 78 tegeliku HTTP-piiri läbinud katset; neid selles paranduses ei korratud. tests/managed-listing-images.test.cjs ja tests/managed-listing-images-handler.test.cjs kontrollivad ranget actor/attempt/URL/bigint-lepingut, muutumatuid käske, Auth/readiness/Host/Origin piiri ning kirjutuse kordamatust.
- Säilitatud lõpliku integreeritud lehe/hook’i/kliendi/tekstisessiooni/pildilaadija brauserikäik 1440/390/320 px juures, sh A → B → A kustutamiskinnituse lähtestus. Sünteetiline Auth, kogu HTTP kinni püütud, välispäringuid/lehevigu polnud; ei korratud. Tõend browser-check/browser-proof.json.
- Uued PGlite 18 kontrollid parandatud allikapõhise fixture’iga: 26/26 runtime + 19/19 paigalduskaitset läbisid. Vana preflight taastoodab raporti täpselt kaks mittesobivat kaitset; uus võtab kehtiva aluse vastu ja tõrjub varasema receipt’i, piiranguteta poliitikaid ning laiendatud rolle. Vana 23 + 15 jääb ajalooks. Native PG17, paralleelseansside võistlust ja paranduse live-rakendamist ei väideta.
- Säilitatud 50 paigaldajakatset / 13,634 s; ei korratud. Uued 2/2 regressioonikatset läbisid / 0,592 s: tegelik kahe-kaitse peatus ilma apply-intent’ita ning uus manifest vana peatunud päeviku kõrval ühe apply ja muutumatu vana päevikuga. Päris ajutine Git/kohalik bare-remote, sünteetilised SQL/build-vastused.
- Säilitatud exit 0 / 19,73 s build sünteetiliste Supabase/OpenAI build-väärtustega ja kuue runtime-faili hoiatusteta ESLint; ei korratud. 843 lähtefaili väljaspool continuity/dokumentatsiooni ja paigaldamata SQL-parandust ning paigaldaja runtime on eelmise kandidaadiga bait-baidilt samad. Ka changes.sql ja capability säilivad.

## Production / kasutajaliides

- Kuulutuse 197 tegelik avaldamine pildiga ning varasem main/Vercel vastuvõtt säilivad. Sama ettevalmistust ei korrata.
- Kasutaja kinnitas 31.10 kuulutusekaardi/teksti ja fotode toimimise arvutis ning telefonis, ka Viofo foto. Kirjutusväli jääb klaviatuuri kohale. Seda tegelikku vastuvõttu ei märgita uuesti ootele.
- Tegelik 01.11 Maci raport kinnitab ainult lugemiseks tehtud DB-eelkontrolli ja kirjutamiseelset peatumist baasil b0a04fccbf354f0480a4b6eb8dd176b3c55383a8. Paranduse rakendamist, uut commit/push’i ega Verceli Ready tulemust pole vaadeldud.
- Põhipildi valik ja merevaigutoon on seni kohalik kandidaat. Uus pakett parandab eelduste kontrollalust; see ei lisa foto lisamist/eemaldamist ega lõplikku koristust. Uudised, hobuste ühine avaldamine ja logoühendus on jätkuvalt lõpetamata. Testandmeid ei eemaldatud.

## Üks järgmine töö

Anna üle selqiro-kuulutused-pohipilt-parandus-20261101.zip ning uuendatud selqiro-uleandmine-20261101.zip. Uus käik peab kontrollima Maci tegelikku baasi; vana peatunud päevik säilib. Kinnita uus raport, commit/push ja Verceli Ready eraldi. Seejärel kuulutuspiltide kogu elutsükkel, kinnitatud koristus/mahu vabastamine ning hobused samas kuulutuste voos; logod/Uudised/ülejäänud moodulid järgnevad, Energy/maksed enne avalikku käivitamist. Vastu võetud sõnumifotode/klaviatuuri paigaldajaid ei korrata.

**Peatumisel:** Peatumisel säilita uus täpne raport ning vana päevik; ära nõrgenda kontrolle, kirjuta peatunud manifesti ümber ega korda vana paketti. Tundmatu lähtebaasi või ebaselge pilvetoimingu puhul jää töö säilitamise juurde. Testandmete tingimuslikku eemaldamisluba kasuta ainult tuvastatud ulatuses, seda uuesti küsimata. Päris sõnumeid ei saadeta ilma selge saatmiskäsuta.

## Loe ainult vajalikku

- docs/continuity/LISTING_PRIMARY_IMAGE_REPAIR_20261101.md: tegelik peatumine, kaks kontrollaluse viga, uus kandidaat ning säilitatud ja uute tõendite piir.
- docs/continuity/LISTING_PRIMARY_IMAGE_20261101.md: eelmise kandidaadi muutumatu funktsionaalne ulatus ja ajaloolised katsed; SQL-aluse sobivuse seis on uuemas parandusdokumendis.
- docs/continuity/LISTINGS_DESIGN_NEWS_20261101.md: kuulutused koos hobustega, värvid, uudisvoog, logoallikas ja tingimuslik testandmete luba.
- supabase/repairs/20261101_listing_primary_image/: parandatud fixture, päritolu/pin’id ja preflight/apply/verify kaitsed. Mudel/klient src/entities/listing/ all ning createJourneyHandler.ts/useManagedListing.ts jäävad muutumatuks.
- src/server/listing-publication/multipart/multipartPublicationImages.ts; ListingCreateForm.tsx, HorseOfferPublicationGate.tsx ja hosted 40_read_models_and_owner.sql: lõpetamata failielutsükkel ning hobuste ühine avaldamine.
- docs/continuity/MESSAGING_PHONE_PHOTO_20261031.md: vastu võetud sõnumifotode tõend. docs/30_V2_SCOPE.md Launch scope correction: Energy and payments säilib.

## Säilivad piirid

- Üks portaal, hoidla ja olemasolev Supabase’i projekt. Kohalik arendusbaas/proovikontod ei kandu pilve. Uut pilve-testbaasi ei looda.
- Olemasolev kolme konto hosted-lubamine ja päris Auth jäävad jõusse. Üldine avalik kasutus ei tohi jääda käsitsi konto lubamise taha, kuid see tarne piirangut ei eemalda.
- Kuulutuspiltide olemasolev private bucket (25 MiB, application/octet-stream,image/webp), avalik published-binding/räsi kontroll ja serverivõtmete piir säilivad. Sõnumifotode olemasolev privaatne bucket on eraldi.
- Kuulutuste hosted settle jääb pending/filesRemaining:null; reserv 29 MiB/pildikoht ja 300 MiB/konto. Lõppkoristus, säilitustähtajad ja reservi vabastamine on eraldi lõpetamata.
- Sõnumifotod: 250 MiB konto kohta koos kinnitatud ja tombstone-kirjetega. Peitmine mahtu ei vabasta. Kasutuse järel piiratud koristus ei ole püsiv scheduler ega hilinenud kirjutuste lõplikkuse tõend.
- V1 hilisem last_read_at ei kasvata olemasolevat V2 loetud ID-d. Oma postkastist peitmine ei kustuta teise osalise sõnumeid; üksiksõnumi tagasivõtmist ei lisata.
- Energy/maksed, teenused, identiteedid, sõnumid, piiratud AI abi ja haldus jäävad kokkulepitud V2 plaani. See tarne ei nihuta neid vaikimisi avaliku käivitamise järel aega.
- 01.11 testandmete luba asendab varasema blanket-keelu ainult vanade testkuulutuste/testsõnumite ja nende tuvastatud kasutuseta seoste ulatuses. Kontod, identiteedid, logod, teenused, tootenäidised ja päevikud säilivad.

## Keskkond

- Maci töökoht ja vanad koopiad säilivad. Tegelik 01.11 12:13:23 UTC alanud peatunud käik kontrollis baasi b0a04fccbf354f0480a4b6eb8dd176b3c55383a8 ja 36 lähtefaili. See on selle jooksu vaatlus, mitte lubadus hilisema HEAD-i või tööpuu kohta.
- GitHub https://github.com/Taivo17/selqiro.git; Vercel https://selqiro.vercel.app; Supabase vyjletlmwoiwxsnsunlm / eu-central-1; paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2.
- Uus kohalik kandidaat: work/selqiro-listing-primary-repair-20261101/source. Eelmine source/pakett ja peatunud päevik säilivad. Tegelik raport: kontrollid/actual-preflight-stop-20261101.json; ülevaade actual-report-review.json; baitide võrdlus retained-proof-and-new-regressions.json.
- Seisukirje kuupäev 2026-11-01; kasutaja tööajavöönd Europe/Tallinn. Uut väliskirjutust, sisselogimist ega teenuse ligipääsu seadistamist selle dokumendiuuenduse põhjal ei eeldata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
