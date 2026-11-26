<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 26.11.2026 Europe/Tallinn — töökuulutuse muutmine vastu võetud; otsingusuunad ette valmistatud; asukoha audit valmis

## Praegune checkpoint

Commit 2b3407f on kasutaja raporti, Ready / Production pildi ja salvestamise kontrolliga vastu võetud. Kasutaja kiitis heaks töökoha/tööotsa otsingu ja palus V1 ülemaailmse lähimad-enne asukoha loogika auditit. Otsingusuundade kitsas pakett on ette valmistatud ja lokaalselt kontrollitud; Maci käik ja uus tootmise tulemus on ootel. Globaalne geograafiline otsing vajab asukoha salvestust ja serverilepinguid; selle koodi- ning tooteaudit on valmis.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** 2b3407fee17f4d19594ce45647a1739b26249835; puu b6543039421cd86f4227d18f65edde1ca06e8a05; 2398 täpselt kontrollitud faili.
- **Vastuvõtu tõend:** Kasutaja raport 1294791 baiti, SHA256 89c223c0d700383a47e499b925b6f5fcf53eb037064113dc1d948aafd791a545; 115 pakifaili, 38 lähtefaili muudatust ja 519 käsu teekond. Ready / Production pilt ning salvestamise kinnitus on eraldi kasutaja tõendid.
- **Uus teostus:** Kaks nähtavat otsingusuunda, senised riigi/linna filtrid, suunale sobivad töökoha filtrid ja kaardi alamtüüp. Üks search_public_jobs_v1 keha laiendus, avalik signatuur/õigused ja kirjutamise sisutüübid säilivad.
- **Serveri piir:** employment on ainult otsingu koondväärtus, mis hõlmab mitte-task ja NULL alamtüüpi. Filter rakendub enne kursorit/LIMIT-i; konto/peitmise/blokeerimise/kehtivuse kontrollid säilivad.
- **Asukoha audit:** V1 põhimõte on globaalne kaugusjärjestus. V2 aktiivsed otsingud ei kasuta keskpunkti; uute kuulutuste koordinaadid on keelatud/NULL, teenuse vanad punktid võivad olla aegunud ja töödel puuduvad punktid. Audit ei ole uus tootmise kontroll.
- **Tõendipiir:** Ettevalmistuse testid ja build on eraldatud keskkonnas. Uut Maci käiku, tootmise andmebaasimuutust, commit/push-i ega deploy tulemust pole tehtud ega väidetud.

## Tegelik kohalik katse

- 43 sihitud TS/modeli/RPC/SSR kontrolli, TypeScript ning värske Next 16.4.6 build läbisid. Brauseri visuaalne kasutuskäik ei ole sellega tõendatud.
- 58 eraldatud PostgreSQL 17.6 kontrolli läbisid; koondvalik, NULL alamtüüp, filtrid, leheküljed ja eelseisu kõrvalekalde keeld. Sünteetiliste asenduste piir on tõendis.
- 35 käivitaja kontrolli ja sõltumatu SQL ülevaatus läbisid. Värske kohalik build ning üks kinnitatud SQL-tehing on Maci commit/push'i eeltingimused.

## Production / kasutajaliides

- Viimane vastu võetud tootmise commit on 2b3407fee17f4d19594ce45647a1739b26249835. Kasutaja kinnitas muudatuse salvestamist.
- Sõnumikaardi teadlik ühekordne lisamine, eemaldamine ja viimati jagatud pakkumise päis jäävad vastu võetud käitumiseks.
- Uue tööotsingu paketi Maci käik, live SQL, commit/push ja sama commiti Verceli kontroll on ootel. Globaalne lähedusotsing ei ole veel teostatud.

## Üks järgmine töö

Käivita selqiro-too-otsingu-valikud-20261126/uuenda.py --publish ning tagasta sama käigu JSON-raport. Pärast vastuvõttu on kasutaja praegune prioriteet ühine asukohaotsing: piiratud geograafilise valmisoleku kontroll, avaliku otsingukoha salvestus/muutmine ning serveri kaugusjärjestus. Lähtu location-search-20261126.md auditist; ära taaskäivita vanu konto mooduleid.

**Peatumisel:** Peatumisel tagasta sama käigu raport. Ära korda kinnitamata kirjutust ega vanu pakette. Vana lähtealuse, kõrvalekalduva metadata või teadmata SQL-tulemuse korral ei tehta commit/push-i; põhjus selgitatakse eraldi ainult lugemisega.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — ainus praegune Maci käsk.
- docs/architecture/account-job-write-accepted-20261126.md — 2b3407f vastuvõtt.
- docs/architecture/job-search-purpose-20261126.md — kitsas valmis otsingumuudatus.
- docs/architecture/location-search-20261126.md — kasutaja soov, V1/V2 puudused ja järgmine geograafiline töö.
- supabase/releases/job-search-purpose-v1/README.md — uus SQL, eelseis ja kontroll.
- docs/architecture/followed-news-grouping-20261124.md — säilitatud Uudiste nõuded, mitte tänane käsk.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Kolm olemasolevat kontot ja nende sisu säilivad. Konto active-only alus jääb kehtima. Vestluste/manuste kontroll ei aktiveeri sulgemist ega kustutamist; enne seda tuleb lõpetada muud tegelikud omaniku kirjutused ja meedia lõppkinnitused ning värske autentimise, vana sessiooni tõkestamise ja selge sulgemis-/taastamisvaate tervik.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Kasutaja 26.11 prioriteet on tööotsingu selgus ja ühine kohalik/globaalne asukohaotsing. Varasem konto sulgemise tervik, jälgitavate Uudised, esiletõstmine ja reklaamid säilivad backlog-is. Reklaamija ei ole kolmas kontotüüp.
- Uudised koondab ainult kasutaja valitud jälgitavate poodide/profiilide sisu. Eraisiku ja ettevõtte tavapärane osalemine säilib. Uue kuulutuse avaldamist, olemasoleva muutmist/pikendamist ja eraldi teadet ei käsitleta automaatselt ühe ja sama uue sündmusena.
- Uudiste lahendus peab olema serveris piiratud ja indekseeritud lehekülgedega. Kogu jälgimisnimekirja või kogu voo brauserisse laadimine ei ole uue V2 lahenduse alus. Suurt samaaegsust ei loeta tõendatuks väikese kasutustee ega ühe kliendi sünteetilise katse põhjal.
- Uudiste 4 eelvaadet ja pakutud 7 päeva algvaade on teostusettepanekud. Vanemad perioodid jäävad kättesaadavaks. Nelja eelvaate nägemine ei märgi kõiki teisi kuulutusi loetuks; suur lisamiskogus ei tõrju poe eraldi teadet välja. Näidiskujunduses olevad poed, hinnad ja kogused on kujuteldavad.
- Fotobaitide välissalvestus ja andmebaasi tehing ei ole ühine tehing. Uus valmisoleku ja sõnumisse kinnitamise kontroll tõkestab hilinenud omaksvõtu; poolelioleva välise kirjutuse lõppu ega vana avaliku faili URL-i kohest kadumist sellega ei lubata. Koristamise ja lõppkustutamise töö jääb eraldi.
- Pakkumislink lisatakse ühe teadliku kontaktiavamise kohta järgmisele sõnumile, mitte ainult üks kord kogu vestluse ajal. Sama pakkumise hilisem uus avamine võib selle uuesti lisada. Kaardi automaatne lisamine igale sõnumile ja eraldi Lisa link uuesti tegevus ei kuulu kokkulepitud lahendusse.
- Töökuulutuse konto kontroll ei aktiveeri sulgemist. Tulevane sulgemine teeb Auth/konto-oleku ülemineku ja COMMIT enne profiili/sisu lukkude võtmist eraldi tehingus; vastupidist lukujärjekorda ei lisata.
- Asukoha keskpunkt ei ole automaatne riigi/linnapiirang. Kõik sobivuse/nähtavuse filtrid rakenduvad enne serveri kaugusjärjestust ja lehekülge. Soovi korral valitud maksimumkaugus on range piir.
- Eraisiku avalik asukoht on ligikaudne. Teenuse sobivus arvestab teenindusala, töö asukoht tegelikku töökohta ja kauba asukoht kättesaamiskohta. Puuduvat või aegunud punkti ei asendata salaja profiili või (0,0) punktiga.

## Keskkond

- Kasutaja Maci projekt /Users/taivo/selqiro, https://github.com/Taivo17/selqiro.git. Alus 2b3407fee17f4d19594ce45647a1739b26249835; puu b6543039421cd86f4227d18f65edde1ca06e8a05; 2398 faili.
- Next 16.4.6, React 19.2.4, Sharp 0.35.5, Supabase CLI 2.117.0; projekt vyjletlmwoiwxsnsunlm. Sõltuvused ja teenusekonto seadistused säilivad.
- Eelmine originaalraport säilib ainult lugemiseks, SHA256 89c223c0d700383a47e499b925b6f5fcf53eb037064113dc1d948aafd791a545. Uus eraldi tööotsingu päevik.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
