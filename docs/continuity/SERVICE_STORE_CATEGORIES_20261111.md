<!-- SELQIRO_SERVICE_STORE_CATEGORIES_ACCEPTED_20261111 -->
## 11.11.2026 — paigaldus ja kasutajavastuvõtt on lõpetatud

Allpool on muutmata ettevalmistusetapi ajalugu, mitte tänane paigaldusjuhis.
Uus commit on `1b0c5ba867e5f466e75f63aee78521d37cf8164f`; SQL-i järelkontroll, build ja push
on lõppraportiga tõendatud. ANTIIK-rubriigi teenusele salvestus, profiilifilter
ning aktiivse sisuga avalikud rubriigid on kasutaja poolt vastu võetud.
Täpsed piirid: `SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md`.
Praegune järg: `CURRENT_STATE.json`; uus kehtivuse ulatus:
`SERVICE_ACTIVITY_NEXT_20261111.md`. Uut terminalikäsku praegu pole.

---

# Teenuste poe rubriigid — 11.11.2026

## Praegune piir

Uus lähtepakk `selqiro-teenuste-poerubriigid-20261111.zip` on ette valmistatud
olemasoleva portaali järgmise väikese sammuna. Käsk on `HOSTED_PORTAL.md`-s.
Maci rakendust, pilve-SQL-i, uut commit/push’i, Verceli Ready-rida ega uut
kasutajavastuvõttu pole selles ettevalmistuskeskkonnas tehtud või vaadeldud.

Viimane tõendatud alus on `d5e77e963f80cb4dab33e6e6667c44d4062c4bbc`, puu
`4a71e443012ff0fcccfe883202c2674fa848a8c4`, 1515 lähtefaili. Alus taastati
muutmata hobuste väljalaskest ja kasutaja lõpetatud paigaldusraportist.
See on täpse tõendi rekonstruktsioon; kasutaja Maci tööpuud siin ei loetud.

Aluse raport:
`selqiro-hobuse-poerubriigid-20261110-raport-20261110-213839-6a4b8cf182de.json`;
SHA256 `d4055d78a78aaee0a3f191bfa2c47cde3ad9ea46436b19df2e3605723b9b12c3`.
Hobuse rubriigisalvestus/profiilist avamine on kasutaja poolt vastu võetud.
Raporti `READY_NOT_CHECKED` ei tühista seda vastuvõttu ega anna põhjust vana
paigaldaja kordamiseks. Täpne Verceli deployment-ID on eraldi tõend.

## Valmis kasutustee

- Teenuse muutmisvaates on enda poe rubriikide eraldi valik ja salvestus.
- Sama rubriigipuu teenindab tava-/hobusekuulutusi ja teenuseid. Teenus säilitab
  kanoonilise `services` UUID; sellest ei tehta `listings` varikoopiat.
- Omanik näeb kõiki rubriike, ka tühje. Avaliku profiili teenuste filter näitab
  ainult vaatajale nähtava teenusega rubriike ja vajalikke ülemrubriike.
- Sama tühjade rubriikide reegel rakendub profiili tava-/hobusekuulutuste osas,
  lähtudes just selle loendi nähtavast sisust. Teenus ei tee üksinda rubriiki
  kuulutuste filtris nähtavaks ja vastupidi.
- Ülemrubriik leiab kogu haru sisu; alamrubriik kitsendab. Omaniku valijas on
  need eraldi valikud. Üks teenus ei dubleeru mitme seose tõttu.
- Filter ja koguarv arvutatakse kogu sobiva tulemuse pealt enne lehekülgi.
  Üle 80 teenuse ei kao tehnilise päringupiiri taha. See ei kehtesta uut
  teenuste arvu limiiti ega otsusta üldist otsingujärjestust.
- Profiilist teenust avades ja tagasi tulles taastuvad rubriik, haru,
  lehekülg ja kerimiskoht. Eemaldatud rubriik või lühenenud loend taastub
  kehtivasse vaatesse selge teatega. Väikese loendi rubriigilugemise tõrge
  jätab avamise ja korduslugemise kasutajale kättesaadavaks.

## Õigused ja säilimine

Uus tabel `service_store_categories` hoiab ainult teenuse/rubriigi seoseid.
API rollidel ei ole sinna otsekirjutust. Eraldi omanikufunktsioonid on
`get_my_service_store_categories_v1` ja `set_my_service_store_categories_v1`.
Need kontrollivad autentimist, salvestatud aktiivset identiteeti, omanikku või
aktiivset äriliikmesust ning teenuse ja kogu rubriigikomplekti kuuluvust.
Komplekt salvestatakse atomaarse toiminguna; osaline võõra rubriigi komplekt
ei muuda seniseid seoseid. Samade ridade kirjutused kasutavad määratud lukujärge.

Rubriigi eemaldamisel kaovad seosed, teenus ja fotod säilivad. Olemasoleva
haldusfunktsiooni `removed_listing_links` tähendab endiselt tavakuulutuste
seoseid; see pole kõigi sisutüüpide kustutatud seoste koguarv.

Avalikud lisanduvad lepingud on `get_public_profile_services_v2` ja
`get_public_profile_store_categories_v2`. Teenuse olemasolev v1 ning
tava-/hobusekuulutuste v2 leping ja varasemad kirjutajad säilivad. Avaliku
rubriigi nähtavus arvestab vastava sisu seniseid avaldamise ja vaataja reegleid.
Teenuse aastast tähtaega need SQL-id veel ei lisa.

Kliendi rubriigisalvestus ei kirjuta põhivormi, fotosid, avaldamise staatust või
kehtivust. Tundmatu salvestustulemus säilitab valiku ja nõuab eraldi lugemist;
kirjutust automaatselt ei korrata. Ajutine sama omaniku õiguste lugemistõrge
peatab kirjutamise, kuid jätab rubriigimooduli mustandi alles. Konto või
identiteedi tegelik vahetus sulgeb vana ulatuse ja eirab selle hilist vastust.

## Kohalik tõendus

| Kontroll | Tulemus | Piir |
| --- | --- | --- |
| SQL runtime | 28/28 PASS | PGlite/PostgreSQL-WASM; 88 teenust, 105 rubriiki |
| SQL paigaldus, drift, rollback | 41/41 PASS | Sünteetiline kataloog ja andmestik |
| Teenuse ReactDOM/API/parser | 12/12 PASS | Tegelikud moodulid, sünteetiline Auth/PostgREST |
| Muudetud jagatud mooduli hobuseregressioon | 11/11 PASS | Kitsas seotud regressioon; varasemat kasutuselevõttu ei korrata |
| Navigeerimise kontekst | 12/12 PASS | jsdom/history/sessionStorage, tegelikud abilised |
| Lõplik Next webpack build | PASS, 48.235 s | 637 sisendit, drift 0, olemasolevad sõltuvused |
| Chromium 153 pärast build’i | 6/6 PASS | English/Eesti, 1365/390 px; 83 rakendussisendit kattuvad build’iga |
| Uuendaja aluse raport | 9/9 PASS | Erineva/muudetu/puuduliku aluse tagasilükkamine |
| Uuendaja SQL-adapter | 13/13 PASS | Lõplikud SQL-baidid; tundmatu tulemuse read-only jätk |

Build’i sisendinventari SHA256:
`f83fdc44bda5d8604df186bc7fe909c8b543fd218c0b008333145b955c06f0f7`.
Build’i logi SHA256:
`8a075edc4f2c8dc1c55534b46e7e645c02f351654f77a86828e26db2db91f02f`.
Lõpliku brauseriraporti SHA256:
`1a4d66f11fbec07469208bf1df8f014081d3f6f608c4d827e7fe5ebc2e18c229`.

Brauserikatses olid tegelik `ServiceEditor`, omaniku hook/API parser, väljad,
galerii, rubriigimoodul, avalik loend/detail ja history. Auth/PostgREST,
omaniku HTTP/actor lugemine, avaldamiskontroller, poliitika/kontakt ning
Next Link/routeri adapter olid sünteetilised. Kontrolliti muu hulgas 85
teenusega filtreeritud teist lehekülge, Back’i ja tagasilinki, muutmata
põhivormi/oote-fotot, teadmata kirjutuse kordamata jätmist ning identiteedi
vahetust. Konsoolihoiatusi/-vigu, lehevigu ja välisvõrgupäringuid oli 0.
Kontrollitud vaated ei kerinud horisontaalselt. See ei ole täis Next-serveri
ega tootmiskeskkonna automaatkatse.

Esimesed kaks brauserikatset peatusid testifixtuuri eeldustel: eestikeelse
leheküljenupu tegelik silt on „Järgmised“ ning identiteedi muutmisel on vana
kaart teadlikult peidetud ja keelatud, mitte tingimata DOM-ist eemaldatud.
Fixtuur täpsustati; rakenduskood pärast lõppbuild’i ei muutunud. Esmased
raportid/logid säilivad eraldi. Varasem läbiv build enne omaniku ajutise
lugimistõrke parandust jääb ajalooliseks kontrolliks.

Paki `kontrollid/final-flow.json` seob eraldi kohaliku tarnekäigu täpse
lõppmanifesti ja kõigi payload-failidega: päris ajutine Git/index, varukoopia,
commit ning kohalik remote; SQL, build ja eelneva commit’i lahendus on seal
sünteetilised. Arhiivi ei väljastata ilma selle lõppkontrollita. See ei asenda
ülaltoodud päris rakenduse build’i ega järgmise Maci jooksu raportit.

Native PostgreSQL mitme sessiooni samaaegset lukustamist, uut live-Supabase’i
rakendust, päris fotofaili üleslaadimist ega Verceli juurutust pole selles
ettevalmistuses tehtud. Need piirid on erinevad kohalikust õiguste ja
salvestuslepingu kontrollist.

## Uued otsused, eraldi järgnevad etapid

`docs/architecture/public-discovery-controls-v1.md` talletab 11.11 suuna:

1. Teenuse kehtivus üks aasta; eraldi info ülevaatamise/pikendamise töö.
2. Vaataja ajutine pakkuja peitmine otsingust — soovitus 7 päeva, tühistatav,
   ei karista pakkujat ega blokeeri sõnumeid või otse profiili külastamist.
3. Ettevõtte töökuulutus üheks kuuks, alguses avalikul profiilil ja otseviitel.
   Globaalne taksonoomia ja otsinguväljad kohe, üldise portaali tööotsingu
   avamine hiljem serveris juhitava avaldamisetapina. Selge teade avaldamisel.

V1 retained lähtekoodis leiti `user_blocks`, mis mõjutab sõnumeid ja
vastastikust nähtavust; eraldi aeguvat vaatajapoolset peitmist ei leitud.
See ei tõenda kõigi varasemate versioonide puudumist. Olemasolevat blokeerimist
ei kasutata uue otsingueelistuse vaikiva asendusena.

Üldine fotode automaatne lõpukoristus, tavakasutaja tehniliste paneelide
eemaldamine ning Energy/maksete ja piiratud AI kokkulepitud ulatus säilivad.
Need tooteotsused ei tähenda, et nimetatud järgmiste etappide kood on valmis.
