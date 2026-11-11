# Teenuse 365-päevane kehtivus ja teadlik pikendamine

Valmistatud 11.11.2026 Europe/Tallinn. See on uue lähtepaketi teostuskirje,
mitte tõend Maci kirjutuse, tootmis-SQL-i, commit/push'i ega Verceli kohta.
Üks praegune järg on `CURRENT_STATE.json`; käsk on `HOSTED_PORTAL.md`-s.

## Tõendatud alus ja eelmine vastuvõtt

Viimane Maci lõppraport: `1b0c5ba867e5f466e75f63aee78521d37cf8164f`,
main, `/Users/taivo/selqiro`, 1563-failine puu
`6808d687e21b96d7e8b25639e00d0a525f97ad6a`. Eelmine muutmata raport on
`selqiro-teenuste-poerubriigid-20261111-raport-20261111-163201-1847005ab277.json`,
SHA256 `024d92a76b33fc5b6e3ea51f3fa0216b47c4bafe122243552d9d43372b7350ff`.
Kasutaja võttis vastu teenuse ANTIIK-seose ning sisuga avalikud rubriigifiltrid.
Selle sammu Verceli täpne Ready-rida/deployment-ID ei ole eraldi esitatud.

Uus kandidaat on kontrollitud täpse väljastatud lähtepuu vastu. Eelmise
vastuvõtu 13-failine dokumentide delta kandub siia; eraldi dokumentide
paigaldust kasutajalt ei nõuta. Varasema seisukirje, genereeritud üleandmise ja
HOSTED_PORTAL-i täpsed baidid on `history/service-store-categories-accepted-20261111/`
all koos räsitõendiga. Varem väljastatud lähtepakki ei muudeta.

## Kasutustulemus

- Minu ala näitab serveri tähtaega ja aegunud teenuse olekut; aegunud teenuse
  link avab omaniku muutmisvaate. Teenus, fotod ja rubriigiseosed jäävad alles.
- `Pikenda teenust` avab kinnituse, et salvestatud teenuse kirjeldus, hind ja
  teeninduspiirkond on endiselt õiged. Kinnitamine on tasuta.
- Pikendamine annab 365 × 24 tundi serveri kinnitushetkest. Kui olemasolev
  periood on pikem, seda ei lühendata. Aastaid ei liideta senise lõpu otsa.
- Peatatud teenus jääb pärast pikendamist peatatuks. Sisu-, foto-, rubriigi-
  ja staatusemuudatus ei pikenda tähtaega. Algne järjestuse alus säilib.
- Muutmisvaate tähtajapaneel kasutab eraldi metadata-lugemist. Salvestamata
  tekst, fotod ja rubriigivalik säilivad; enne nende salvestamist ei saa
  kinnitada, et salvestatud andmed on ajakohased.
- Teadmata pikendustulemus vajab eraldi lugemist. Klient ei korda kirjutust
  automaatselt ega kuva kontrollimata edu. Identiteedivahetuse hilised vastused
  ei rakendu uue identiteedi vaatesse.
- English/Eesti tõlked kasutavad olemasolevat keeleallikat; kasutaja sisu ei
  tõlgita. Minu ala lehekülg toob tähtajad ühe päringuga, mitte iga rea kohta.

## Andmeallikas, üleminek ja avalik nähtavus

`services` jääb kanooniliseks teenuseks. Uus privaatne activity-kirje hoiab
ainult tähtaja metadatat. Olemasoleval skeemil ei ole teenuse tähtaega;
loomise või avaldamise vanust ei käsitleta omaniku värske kinnitusena.
Üks serveris fikseeritud üleminekuhetk annab praegu avaldatud teenustele ja
avaldamisajaga (`published_at`) arhiveeritud teenustele aasta. Nende `origin=transition` ning
`last_confirmed_at=null`. Algseid teenuse kuupäevi ja ridu ei kirjutata ümber.
Mustand või avaldamisajata arhiveeritud teenus saab tähtaja esimesel päris
avaldamisel. Korduv paigaldamine uut aastat ei anna.

Uued owner RPC-d kontrollivad salvestatud aktiivset identiteeti ja olemasolevat
omaniku/aktiivse äriliikme õigust. Pikendamine võrdleb täpset eelmist tähtaega
koos mikrosekunditega ning kirjutab ainult activity-kirjet. V1 omaniku vastus
jääb muutmata; V2 lugemine lisab ühe activity-ploki. SQL võib rakenduda enne
uut veebiklienti. Praegu avalike teenuste nähtavus säilib üleminekul.

Ühine serveri `is_public` kontroll lisab tähtaja enne avalikku otsingut,
profiili V1/V2 lugejaid, teenuste poerubriike, loenduse/lehekülje piiri,
detaili, hallatud pildi ligipääsu ja uut kontaktipäringut. Omaniku ligipääs ja
olemasolevad sõnumid säilivad. Varem avaliku Storage-URL-iga fotot ei muuda
tähtaeg privaatseks. Selles sammus Storage'i kirjutusi ega kustutusi ei ole.

Täielik leping: `../architecture/service-activity-v1.md`.

## Vajalikud kohalikud kontrollid

| Kontroll | Tulemus | Tõendipiir |
| --- | --- | --- |
| SQL runtime | 22/22 PASS | PostgreSQL/WASM, sünteetilised read; mitte päris Supabase'i paralleelsessioonid |
| SQL paigaldus/erinevused/rollback | 38/38 PASS | Täpsed allikapin'id, 14 kaitset ja muutumatuse kontrollid |
| Muudetud HTTP-transport | 25/25 PASS | 8 uut ja 17 mõjutatud olemasolevat juhtu, sünteetiline Auth/RPC |
| Kliendi mudel/API/kontroller ja editor | 25/25 PASS | 13 uut ja 12 mõjutatud editorijuhtu, jsdom/HTTP-piir |
| TypeScript | PASS | Olemasolevad lukustatud sõltuvused |
| Next webpack build | PASS | 25.715 s; 647 sisendit, drift 0; sünteetiline seadistus |
| Build'i järgne Chromium 153 | 5/5 PASS | EN/ET, 1365/390 px; tegelikud moodulid ja tootmise CSS, sünteetilised teenusepiirid |
| Uuendaja eelmise raporti ja SQL-adapter | 9/9 + 15/15 PASS | Kohalikud kontrollid, tootmistoiminguid 0 |

Build'i sisendinventari SHA256:
`3015b717a5c5b15724d35fca9acedd1e8133610858d365531d8205c2dc3e9a1a`.
Brauseri 51 kasutatud rakendussisendit kattuvad build'iga. Konsoolihoiatusi,
konsooli-/lehevigu ja välisvõrgupäringuid 0; horisontaalset ülevoolu ei olnud.
Kontrolliti kinnitusest loobumist, aegunud aktiivse ja peatatud teenuse
pikendamist, salvestamata töö säilimist pärast kadunud kirjutusvastust ja
lugemistõrget ning identiteedivahetuse hilise vastuse eiramist. Nähtav dialog,
omaniku loend ja taastatud tähtajapaneel vaadati ekraanipiltidelt üle.

Katses kasutati tegelikku ReactDOM-i, My Area hook'i, editorit, galerii-/välja-
ja rubriigikomponente ning activity mudelit, API-d ja kontrollerit. Auth/HTTP/
PostgREST, avaldamiskontroller/poliitika ning Next-navigeerimise adapter on
sünteetilised. Täis Next-serverit, päris faile üles laadivat ega tootmiskatset
see ei asenda. Kõik SQL-i ja klientide tõendid sisaldavad allikate räsisid.

Täpse väljastatud manifesti tarnekäigu lõpptulemus on paki
`kontrollid/final-flow.json`-is. See käik kasutab tegelikku ajutist Git/indexit,
varukoopiat, täit aluspuud, uut payload'i ning kohalikku bare-remote'i; SQL ja
build on selles tarnekatses eraldi sünteetilised. Tegelik build on eespool.
Esmane HTTP-test leidis lisavälja sisendivea vale HTTP-liigituse; see parandati
enne lõppbuild'i ning lõplikus transpordikatses 25/25 PASS. Esmane logi säilib.

## Üks järgmine päris samm

Kasuta `HOSTED_PORTAL.md` üht uut jätkamiskäsku. Selle jooksu raport peab
kinnitama SQL-i järelkontrolli, kohalikku build'i, uut commit'i ja push'i.
Seejärel sama commit'i Verceli Ready / Production ning üks teenuse
pikendamise ja avaliku profiili kasutustee. Praegu neid uue sammu päris
tõendeid ei ole. Kontosid, teenuseid, fotosid ega päevikuid ei kustutata.

## Hilisem töö

Ajutine pakkuja otsingust peitmine ja ettevõtte profiilist algavad ühekuused
tööpakkumised jäävad järgnevateks eraldi mooduliteks. Üldine fotode
taustakoristus, tavakasutaja tehniliste paneelide eemaldamine, identiteedi
üleandmise turvapiir, Energy/maksete tuum ja piiratud AI abi jäävad kehtima.
See samm ei muuda neid valmisolekuks.
