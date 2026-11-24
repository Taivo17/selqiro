<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 24.11.2026 Europe/Tallinn — suhtluse kontoõiguste kitsas kontroll valmis; Uudiste rühmitamise ettepanek

## Praegune checkpoint

Töökuulutuste avaliku lugemise konto kontroll e336a5b on vastu võetud. Maci raporti 12 testi, build, üks kinnitatud SQL rakendamine, eraldi verify ja commit/push vastavad väljastatud paketile. Sama commit on pildil Ready / Production; olemasoleva ettevõtte tööpakkumise otsing, üksikvaade ja profiililoend avanevad. Eraisiku aktiivset pakkumist kasutaja teatel pole ning seda veebijuhtu ei testitud. Uudiste roll ja olemasolev lähtealus on dokumenteeritud; uut uudisvoogu selles vastuvõtus ei paigaldatud. Järgmise suhtluse etapi jaoks on eraldi ainult lugemise kontrollipakett valmis. Seda pole kasutaja Macis käivitatud ning uut live-kataloogi tulemust pole veel. Uudiste suure lisamiskoguse koondamine ühe avaldaja nelja eelvaatega plokiks on dokumenteeritud ettepanek, mitte paigaldatud funktsioon.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main e336a5b9d02845c688def778babeac0f1e3fec95; puu 7734a70aa174b25b2ce5cc85aca3c0fa4e628624; 2253 jälgitavat faili. Eraldatud lähtekoopia vastab täpsetele SHA-256, Git blob ja režiimi kirjetele. See on raportiga seotud taastatud allikas, mitte uus Maci või remote’i vaatlus.
- **Aluse tõend:** selqiro-too-konto-olek-20261124-raport-20261124-162634-8fdb9330d5e6.json; 1367929 baiti; SHA256 76ee0b1d3dc42838b7ddcafec65c4903638da50adb43a90cff1a271f6f97c629. Raporti run_id/package_sha256 vastavad manifestile 29afa6977d0e5097b1082bee9bb16dd9218c89816c5de1b93f3f2b54c23a250d. Originaalraport ja väljastatud ZIP säilivad muutmata.
- **Inventar:** review/runner/accepted-inventory.json; SHA256 1a5b9ae1ba4f7adb69ec6d06a9b97ff83de0bf2e88d66f558819daa58b91242a. Paketi 33 teed: 7 muudetud dokumenti ja 26 uut dokumentatsiooni-, SQL- ning testifaili. Rakenduse senine kliendikood ja sõltuvused säilisid.
- **Rakendatud piir:** jobs_private.visible_to_viewer(uuid) ja get_public_profile_jobs_v1(text,integer,jsonb) kasutavad sama account_lifecycle_private.account_is_available(uuid) allikat. Eraisiku kanooniline omanik on identities.user_id; ettevõttel business_accounts.owner_user_id.
- **Säilivad lepingud:** Otsingu ja detaili senised funktsioonikehad, sisendid, cursor, tähtajad, task/job liigid, poliitika, kontakt ja owner-listi lukuvaba lugemine säilivad. Profiili kättesaamatu vastus on null-identiteet ning tühi loend. is_public, kirjutused, otseõigused, kontakt/sõnumid ja meedia vajavad kontoelutsükli ülejäänud tööd.
- **SQL tõendi piir:** Eelkontroll before, üks acknowledged apply after ja eraldi verify after vastavad väljastatud SQL-ile ning rangele parserile. Taastatud stdout-ümbriste pikkused/räsid kattuvad raportiga; toorlogi, argv või toorkataloogi eksporti ei ole. Uut live-päringut vastuvõtul ei tehtud.
- **Uudiste tegelik seis:** V2 päise news-link viib /v2 avalehele; V2 avaliku profiili Jälgi nupp on ühendamata; profiili kaks teadet on staatilised näited. Varasem /feed ja store_follows alus on olemas. Nende olemasolu ei tähenda valmis V2 uudisvoogu ega värskelt kontrollitud live-andmebaasi lepingut.
- **Uudiste eesmärk:** Kasutaja näeb tema enda jälgitud poodide/profiilide uusi avalikke kuulutusi ning nende avaldatud teateid. See on põhiosalus ja naasmise põhjus, mitte esiletõstmise või reklaamide osa. Täpne olemasolev alus, kavand ja allikapinnid on followed-news-plan-20261124 failides.
- **Dokumentatsioon:** Eelmise vastuvõtu dokumentatsiooni stage on säilitatud ning käesolev täiendus on sellega ühendatud uues eraldatud stage’is. See pole Maci kirjutatud, commit’itud ega pushitud. Diagnostika ei paigalda dokumentatsiooni ega rakendust. Varasemad paketid ja raportid on muutmata.
- **Suhtluse järgmine kontroll:** Eraldi selqiro-suhtluse-konto-kontroll-20261124.zip kontrollib e336a5b aluspuud, remote main-i ja viimast originaalraportit; teeb ühe fikseeritud Supabase CLI metaandmepäringu. 11 täpselt nimetatud funktsioonisignatuuri, 3 sõnumisuhtluse seost ning ainult nende otsesed mitte-sisemised triggerid. Job contact ja snapshot pinid on eelmisest aktsepteeritud raportist ning neid ei loeta uuesti.
- **Diagnostika ulatus:** Küsitakse funktsioonide ja õiguste metaandmeid/räsisid, mitte kontode, vestluste või sõnumite sisu. Täiskehasid ei ekspordita. Tundmatu räsi ei tõenda automaatselt SQL paranduse sobivust. coverage=complete tähistab küsitud metaandmete kogumise ulatust; implementation_ready jääb false.
- **Uudiste rühmitamine:** Üks jälgitav profiil saab valitud ajavahemikus ühe ploki: kuni 4 kuulutuse eelvaadet, seejärel sama perioodi kuulutuste kogu. Teate eelvaade on eraldi. Pikk lisamisloend ei täida põhivoogu ega lähe korraga brauserisse. Täpne kavand ja ettepanekute staatus: docs/architecture/followed-news-grouping-20261124.md.

## Tegelik kohalik katse

- Vastuvõtul kontrolliti olemasolevat raportit, muutmata väljastatud paketti ja lähteinventari. Rakenduse teste, build’i, SQL-i, paigaldajat ega teenuste ühendusi ei korratud.
- Maci raport: 12/12 nõutud TAP-testi, 0 viga/vahelejäetut; edukas Next.js 16.4.6 build ja 8 koostatud väljundi räsi. Täielikke Maci TAP/build’i tekste ei ole üles laaditud; parsitud tulemused on seotud kontrollitud runner’i, sisendite ning väljundiräsidega.
- 570 lõpetatud käsukirjet; 564 teadaolevat Giti stdout-väljundit taastati ning pikkused/räsid kattusid. Üks SQL rakendamine oli kinnitatud, sõltumatu verify lõppes enne stage/commit/push’i. Eelmise eduka teenuste käigu originaalraporti read-only lukk ja säilimine on raportis kinnitatud.
- Ettevalmistuse varasem eraldatud tõend säilib: 12 kliendijuhtumit, 6 juhitud hook’i juhtumit, 22 native-vastuse juhtu, 4 eraldi oodatud tagasilükkamist, 60 PostgreSQL-i kontrolli, 29 uuendaja kontrolli ja värske build. Need ei asenda puuduva eraisiku aktiivse pakkumise päris veebikontrolli.
- Jõudluse piirid säilivad: sünteetilisel 5500 tööga alusel filtreeritud otsing 500 konto kontrolliga ligikaudu 31,21 → 79,99 ms; 200 tööga profiil 201 kontrolliga 19,75 → 36,00 ms. Varasema 5500 teenuse filtrita otsingu mediaan oli 566,67 → 1105,46 ms. Need on üksikklienti kasutavad sünteetilised katsed, mitte suurmahu või samaaegsuse vastuvõtt.
- Suhtluse diagnostika ettevalmistuse kontrollid: 24 käivitaja fixture-testi, 12 eraldatud PostgreSQL 17.6 kontrolljuhtu ja 31 range parsija juhtu läbisid; sõltumatu ülevaatus PASS, blokeerivaid leide ei ole. Need on kohalikud sünteetilised kontrollid, mitte kasutaja Maci ega live-andmebaasi vaatlus. Rakenduse teste/build’i ei korratud.

## Production / kasutajaliides

- Kasutaja Verceli pildil on e336a5b, Ready / praegune Production, main, 24 s. Raporti algne vercel=READY_NOT_CHECKED säilib; deployment’i tõend on eraldi pilt.
- Kolm sisupilti näitavad Milline Vedu ettevõtte pakkumist „Muruniiduki operaator” otsingus, üksikvaates ja avalikul profiilil. Vaataja aktiivne profiil on Taivo Garaaž. See ei tõenda eraisikust avaldaja aktiivset pakkumist, anonüümset jagamist, kontakti saatmist ega järgmist lehte.
- Kasutaja: „Eraisiku aktiivset töökuulutust hetkel ei ole.” Seis: not_tested_no_existing_active_content. Selle vastuvõtu jaoks ei nõuta uue testkuulutuse loomist.
- Viies pilt näitab avalehte ja Uudised menüüpunkti, mitte töötavat personaalset uudisvoogu. Profiili Viimased teated näited pole päris teadete avaldamise tõend.
- Varasemad a9d86e6 teenuste, 0cb3484 profiili kuulutuste/rubriikide, ac5521a hobuste, 87bff3f tavakuulutuste, 8dc0b3b profiili ja 4b60782 Minu konto etapid säilivad vastu võetuna.
- Pärast e336a5b ei ole käesoleva sammu raames uut deployment’i ega andmebaasimuudatust. Uus suhtluse metaandmeraport on ootel; uus Uudiste voog pole paigaldatud.

## Üks järgmine töö

Käivita ainult selqiro-suhtluse-konto-kontroll-20261124/kontrolli.py ilma --publish liputa ning tagasta selle käigu SAADA SEE FAIL real nimetatud JSON. Seejärel kontrolli raporti aluse, originaalkviitungi säilimise ning täpsete metadata/pini tulemuste vastavust. Alles selle alusel koosta kontakti/saatmise kontoõiguse muudatus, säilitades teise aktiivse osapoole ajaloo ja korduskviitungid. Tundmatu funktsioonikeha vajab vajadusel eraldi täpselt nimetatud lugemist. Konto sulgemist veel ei aktiveerita. Järjekord: konto elutsükkel → Uudised → esiletõstmine → reklaamid.

**Peatumisel:** Diagnostika on ainult lugemiseks. Kui täpne e336a5b alus, 2253 faili, index, remote main, CLI/project või originaalraport ei vasta, peatub käik enne andmebaasivaatlust. Peatumisel saada täpne raport või PEATATUD-rida; ära korda lõpetatud uuendajat ega muuda varasemat paketti. Järgmine kirjutav pakett peab oma eelseisu eraldi värskelt kontrollima.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — uus ainult lugemise kontrollikäsk ja raporti tagastamine.
- docs/architecture/account-contact-catalog-20261124.md — täpne metadata ulatus ja kasutuspiir; live-tulemus ootel.
- docs/architecture/account-next-after-job-read-20261124.md — järgmise kontakti/saatmise muutuse sõltuvused.
- docs/architecture/followed-news-grouping-20261124.md — ühe avaldaja suure lisamiskoguse plokk ja Vaata kõiki käitumine.
- docs/architecture/followed-news-plan-20261124.md — algne Uudiste lähteaudit ja teostusjärjekord.
- docs/architecture/account-job-read-accepted-20261124.md — e336a5b vastuvõtu tõendid.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, kuulutusi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Konto active-only alus säilib. Sulgemine, taastamine ja lõppkustutamine vajavad ülejäänud lugemiste, otseõiguste, kirjutuste, sõnumite ja meedia tervikut.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Konto sulgemise/taastamise/kustutamise tervik → jälgitavate poodide ja profiilide Uudised → kuulutuste esiletõstmine → reklaamid. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.
- Uudised koondab ainult kasutaja valitud jälgitavate poodide/profiilide sisu. Eraisiku ja ettevõtte tavapärane osalemine säilib. Uue kuulutuse avaldamist, olemasoleva muutmist/pikendamist ja eraldi teadet ei käsitleta automaatselt ühe ja sama uue sündmusena.
- Uudiste lahendus peab olema serveris piiratud ja indekseeritud lehekülgedega. Kogu jälgimisnimekirja või kogu voo brauserisse laadimine ei ole uue V2 lahenduse alus. Suurt samaaegsust ei loeta tõendatuks väikese kasutustee ega ühe kliendi sünteetilise katse põhjal.
- Uudiste 4 eelvaadet ja pakutud 7 päeva algvaade on teostusettepanekud. Vanemad perioodid jäävad kättesaadavaks. Nelja eelvaate nägemine ei märgi kõiki teisi kuulutusi loetuks; suur lisamiskogus ei tõrju poe eraldi teadet välja. Näidiskujunduses olevad poed, hinnad ja kogused on kujuteldavad.

## Keskkond

- /Users/taivo/selqiro; https://github.com/Taivo17/selqiro.git. Vastu võetud alus e336a5b9d02845c688def778babeac0f1e3fec95; puu 7734a70aa174b25b2ce5cc85aca3c0fa4e628624; 2253 faili. Viimane raportiga kinnitatud remote’i vaatlus lõppes 24.11.2026 kell 16:26:34.457 Europe/Tallinn. See pole uus Git-päring.
- Next 16.4.6, Sharp 0.35.5, package.json ja lukufail säilisid. Raportis on olemasolev Supabase CLI 2.117.0 ja projekt vyjletlmwoiwxsnsunlm. Sõltuvusi, SMTP-d, Authi ega DNS-i ei seadistatud.
- Viimane originaalraport: ~/Library/Application Support/Selqiro/account-job-read-20261124/29afa6977d0e5097b1082bee9bb16dd9218c89816c5de1b93f3f2b54c23a250d/result.json. Säilita originaal ning saadetud Downloads-koopia. Järgmine pakett seotakse just selle kinnitatud alusega.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
