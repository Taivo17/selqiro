<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-12

## Praegune checkpoint

Maci seni ühendamata V2 pildikontrolli teostus on tõendatult läbinud 119/119 testi ja build'i. Lähteetapi lõpetaja säilitab testitud koodi ning täpsustab seitset dokumenti; tema tegelik uus commit/push ja puhas seis tuleb kinnitada tulemuse ZIP-ist. Uus upload ja avaldamine jäävad suletuks.

## Lähtekood ja tõendi piir

- **Lähtebaas:** c8da6f1d3e850ad35da9bf30ea76c8212b964696; 463 valitud baasallikat / 481 pildikontrolli tulemust, mitte kogu repositoorium. Baasi varasem commit/push ja veebivastuvõtt on lõpetatud.
- **Lõpetamise piir:** Uus eraldi finisher kontrollib tegeliku HEAD-i, kogu indexi, tööpuu, 481 allikat ja remote'i enne kirjutusi. Seitse dokumenditäpsustust; kõik 17 koodi-/testi-/näidisfaili muutmata, commit'i ulatus endiselt 24 rada. Tegeliku lõppseisu tõend on finisher'i result.json.
- **Viimane Maci vaatlus:** 12.10.2026 kell 16:17:55 UTC / 19:17:55 Europe/Tallinn: main/c8da6f1, 24 staged rada (18 uut, kuus olemasolevat), ei ühtki unstaged muutust. EI olnud puhas ega commit'itud; sama käigu remote võrdne. See pole uus live-kontroll.

## Tegelik kohalik katse

- 12.10 Maci Node 24.16.0 / Sharp 0.34.5 / libvips 8.17.3 / TypeScript 5.9.3: 119/119 TAP testi, null viga/skip/cancel/TODO. Päris native/protsessid koos eristatud sünteetiliste rikkekatsetega; mitte Storage HTTP ega brauserivastuvõtt.
- Päris npm run build PASS täpse käiviti eduka väljumise järgi. private/build.log pole eksporditud; toorväljundit ja hoiatusi siin eraldi ei loetud. Lõpetaja ei korda teste/build'i, kontrollib ainult muudetud jooksva üleandmise kooskõla.

## Production / kasutajaliides

- c8da6f1 varasem Ready/Production ja kasutaja veebikontroll ning Storage-konteksti lugemine on lõpetatud. Pildikontrolli uue commit'i juurutus/native-pakendus ei ole selle kirje järgi kontrollitud; push võib käivitada olemasoleva automaatika.
- Uus moodul pole ühegi marsruudi/vormiga ühendatud. Katse/upload/publish/koristus/lõppkustutus pole avatud. 23 migratsiooni ja senised hinna-/identiteedi-/reegli-/hobuse-/otsingu-/omaniku moodulid säilivad; DB/Storage-käske lõpetajas pole.

## Üks järgmine töö

Pärast lõpetaja eduka commit/push ja puhta/kaugvõrdse seisu raporti ülevaatust jätka SAMA V2 privaatse katse, muutmatute serverifailide, lõppavaldamise, püsiva koristuse ja lõppkustutuse serverilepinguga olemasoleva hinna/identiteedi/reeglite peal. Ära lisa uut app-patch'i lõpetamata staging'u otsa.

**Peatumisel:** Säilita failid, index ja uus raport/päevik. Ära korda lõpetajat/paigaldajat/lugejat, reset/restore-i, käsitsi commit/push-i ega kustuta markereid. Ka kadunud push-vastus ei luba automaatset korduskatset; loe uue raporti commit/remote välju.

## Loe ainult vajalikku

- Uue image-verifier-source-finish käigu ALUSTA_SIIT.md ja result.json; enne käivitust väline source-finish-ready üleandmine. 19:17 Maci originaaltulemus jääb testide/build'i lähteks.
- docs/architecture/v2-publication-image-verifier-v1.md; docs/architecture/v2-ordinary-listing-create-v1.md; kinnitatud 12.10 avaldamisnõuded. Ajaloolisi NEXT ülesandeid ei korrata.

## Säilivad piirid

- Üks Avalda kuulutus, mitte nähtav kohustuslik mustand. Kontrollitud veebipilt pole uploadi volitus ega tõend DB-katse avaldamisvalmidusest.
- 25 MiB algfaili moodul ei muuda vana 10 MiB avalikku hoidlat. Uus privaatne otseüleslaadimine, hilinenud token, muutmatu veebipilt ja täpsete viidetega koristus peavad koos läbima integratsiooni.
- Praeguseid kontosid, kuulutusi, pilte ja päevikuid ei kustutata. V1 riskantsete kirjutuste kitsas sulgemine on nõutud, mitte täisühilduvuse ehitamine.
- Avaldamise avamise eel kontrollitakse lisamine → otsing → detail/profiil → suhtlus → haldamine → kustutamine eri rollidega. AI/Energy/maksed/otsingu lisad ootavad.

## Keskkond

- Lõpetaja: olemasolev Python 3.9+ ja Git; ei Node/npm/npx/installi, Dockerit ega Supabase CLI-d. Peata dev ja ära muuda projekti jooksu ajal. Git hooks/signing on ainult neis käskudes välja lülitatud, konfiguratsiooni ei kirjutata.
- Algne ZIP leitakse Downloads/selqiro-recovery või Downloads alt räsi järgi. Ainult uus väline finisher'i päevik; vanad puutumata. Uus tulemus-ZIP valitakse Finderis võimalusel automaatselt. private-kausta ei jagata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
