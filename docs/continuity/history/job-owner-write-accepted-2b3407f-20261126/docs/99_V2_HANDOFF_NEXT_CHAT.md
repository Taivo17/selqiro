<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 25.11.2026 Europe/Tallinn — sõnumite muudatus vastu võetud; töökuulutuste kirjutuskontroll ette valmistatud

## Praegune checkpoint

Commit c66a39b on vastu võetud: kasutaja raport, sama commiti Ready / Production pilt ja sõnumite/piltide kasutuskontroll on kinnitatud. Uus kitsas moodul kontrollib tegija ja tegeliku omaniku konto kättesaadavust töökuulutuse salvestamisel, avaldamisel, staatuse muutmisel ja tähtaja pikendamisel. Kohalikud SQL-i ja käivitaja kontrollid on läbitud; uus Maci rakendus ja tootmise tulemus on ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** c66a39b96c8d204382413a7ab652e66898782f18; puu c6e2726a6d97d12731dc2d505a734164523b90e0; 2367 faili, iga faili SHA-256 ja Git blob kontrollitud.
- **Raporti vastuvõtt:** Pakkumiskaartide raport 1430209 baiti, SHA256 50470dbbb4d46ce0dce6a5e0e89ed1c9a4fa188bc2d1d9bda1f71c719215b0a6. Täpne pakett, 592 käsu teekond, SQL-tehing, järelkontroll ja commit/push on kontrollitud.
- **Tootmise kinnitus:** Kasutaja pildil c66a39b main Ready / Production, 30 s. Kasutaja kinnitas sõnumite ja piltide toimimist ning iseendale saatmise keeldumist.
- **Uus teostus:** Üks privaatne konto kontroll ja üks minimaalne jobs_private.mutate muudatus. Neli avalikku signatuuri ja ühine require_actor säilivad. Täpne lõpetatud korduspäring jääb enne uue toimingu konto kontrolli.
- **Omistamine:** Eraisiku identiteedi user_id või ettevõtte business_accounts.owner_user_id; tegija ja omanik deduplikeeritakse. Uus kontroll ei toetu avaldaja nimele, vana looja ID-le ega kliendi rollilipule.
- **Eelseisu piir:** Teadaolevad kehad ja õigused on varasemate aktsepteeritud pinidega seotud. Värske read-only preflight ja sama tehingu kontroll peavad need enne DDL-i kinnitama; kõrvalekalle peatab rakendamise.
- **Koostamise piir:** Muudetakse ainult SQL release'i ja dokumentatsiooni. Kõik rakenduse ja sõltuvuste failid säilivad. Uut Next build'i ega klienditestide ringi ei tehta; varasemat tulemust ei nimetata uueks.

## Tegelik kohalik katse

- Eraldatud PostgreSQL 17.6: 39 sihitud kontrolli läbisid; kontrollitud isiklik ja ettevõtte omanik, keelatud uued kirjutused, kordused ning tehingu/lukkude piirid. Sünteetiline Authi ja õiguste alus ei ole tootmise tõend.
- Käivitaja: 27 sihitud kontrolli läbisid. SQL/docs-only ulatus on jõustatud; kinnitamata kirjutust ei korrata automaatselt ning commit/push nõuab SQL järelkontrolli.
- Sõltumatu SQL-i ülevaatus PASS; lõplik pakett seotakse eraldi ülevaadatud failide kontrollsummadega enne väljastamist.

## Production / kasutajaliides

- Viimane vastu võetud tootmise commit on c66a39b96c8d204382413a7ab652e66898782f18.
- Sõnumikaardi ühekordne teadlik jagamine, uus sama pakkumise päring, eemaldatav eelvaade ning viimati jagatud päis on lõpetatud samm.
- Uue töökuulutuse kirjutuskontrolli live-preflight, rakendamine, commit/push ja Verceli tulemus on veel ootel.

## Üks järgmine töö

Käivita ainult selqiro-too-muutmise-konto-olek-20261125/uuenda.py --publish ning tagasta sama käigu SAADA SEE FAIL JSON. Edu järel kontrolli uut commit'i Vercelis. Pärast vastuvõttu jätkub kontoelutsükli ülejäänud kirjutuste/meedia kontroll ja sulgemise tervik; siis Uudised → esiletõstmine → reklaamid.

**Peatumisel:** Tagasta selle käigu raport. Ära korda vanu pakette ega kinnitamata kirjutust. Algne c66a39b paigaldusraport ja varasemad päevikud säilivad. Teadmata eelseis või kirjutuse tulemus peatab commit/push-i; selgitamine toimub eraldi ainult lugemisega.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — ainus praegune Maci käsk.
- docs/architecture/offer-message-intent-accepted-20261125.md — eelmise muudatuse lõplik vastuvõtt.
- docs/architecture/account-job-write-fence-v1.md — selle mooduli ulatus ja kontrollid.
- supabase/releases/account-job-write-fence-v1/README.md — SQL eelseis, tehing ja järelkontroll.
- docs/architecture/account-model-lifecycle-20261122.md — konto mudel ja e-posti paus.
- docs/architecture/followed-news-grouping-20261124.md — säilitatud uudiste kavand.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Kolm olemasolevat kontot ja nende sisu säilivad. Konto active-only alus jääb kehtima. Vestluste/manuste kontroll ei aktiveeri sulgemist ega kustutamist; enne seda tuleb lõpetada muud tegelikud omaniku kirjutused ja meedia lõppkinnitused ning värske autentimise, vana sessiooni tõkestamise ja selge sulgemis-/taastamisvaate tervik.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Konto sulgemise/taastamise/kustutamise tervik → jälgitavate poodide ja profiilide Uudised → kuulutuste esiletõstmine → reklaamid. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.
- Uudised koondab ainult kasutaja valitud jälgitavate poodide/profiilide sisu. Eraisiku ja ettevõtte tavapärane osalemine säilib. Uue kuulutuse avaldamist, olemasoleva muutmist/pikendamist ja eraldi teadet ei käsitleta automaatselt ühe ja sama uue sündmusena.
- Uudiste lahendus peab olema serveris piiratud ja indekseeritud lehekülgedega. Kogu jälgimisnimekirja või kogu voo brauserisse laadimine ei ole uue V2 lahenduse alus. Suurt samaaegsust ei loeta tõendatuks väikese kasutustee ega ühe kliendi sünteetilise katse põhjal.
- Uudiste 4 eelvaadet ja pakutud 7 päeva algvaade on teostusettepanekud. Vanemad perioodid jäävad kättesaadavaks. Nelja eelvaate nägemine ei märgi kõiki teisi kuulutusi loetuks; suur lisamiskogus ei tõrju poe eraldi teadet välja. Näidiskujunduses olevad poed, hinnad ja kogused on kujuteldavad.
- Fotobaitide välissalvestus ja andmebaasi tehing ei ole ühine tehing. Uus valmisoleku ja sõnumisse kinnitamise kontroll tõkestab hilinenud omaksvõtu; poolelioleva välise kirjutuse lõppu ega vana avaliku faili URL-i kohest kadumist sellega ei lubata. Koristamise ja lõppkustutamise töö jääb eraldi.
- Pakkumislink lisatakse ühe teadliku kontaktiavamise kohta järgmisele sõnumile, mitte ainult üks kord kogu vestluse ajal. Sama pakkumise hilisem uus avamine võib selle uuesti lisada. Kaardi automaatne lisamine igale sõnumile ja eraldi Lisa link uuesti tegevus ei kuulu kokkulepitud lahendusse.
- Töökuulutuse konto kontroll ei aktiveeri sulgemist. Tulevane sulgemine teeb Auth/konto-oleku ülemineku ja COMMIT enne profiili/sisu lukkude võtmist eraldi tehingus; vastupidist lukujärjekorda ei lisata.

## Keskkond

- Kasutaja olemasolev Maci projekt /Users/taivo/selqiro ja https://github.com/Taivo17/selqiro.git. Vastu võetud alus c66a39b96c8d204382413a7ab652e66898782f18; puu c6e2726a6d97d12731dc2d505a734164523b90e0; 2367 faili.
- Next 16.4.6, Sharp 0.35.5, Supabase CLI 2.117.0 ning projekt vyjletlmwoiwxsnsunlm. Sõltuvusi, SMTP-d, Authi seadistust ega DNS-i selles moodulis ei muudeta.
- Eelmine originaalraport säilib ainult lugemiseks, SHA256 50470dbbb4d46ce0dce6a5e0e89ed1c9a4fa188bc2d1d9bda1f71c719215b0a6. Uus eraldi päevik account-job-write-20261125.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
