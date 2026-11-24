# Töökuulutuste avaliku lugemise konto kontroll — vastu võetud

24.11.2026 Europe/Tallinn. **Commit e336a5b on vastu võetud piiratud veebikontrolliga.**

## Tulemus ja tõendid

| Kiht | Kinnitatud tulemus | Tõendi piir |
| --- | --- | --- |
| Maci kontrollid | 12/12 nõutud TAP-testi ja edukas Next.js 16.4.6 build | Raporti parsitud tulemus, väljundite pikkused/räsid ja väljastatud runner’i kontrollileping; täielikke Maci logisid pole üles laaditud |
| Andmebaas | Üks kahe funktsiooni rakendamine, COMMIT-järgne kinnitus ja eraldi verify | Kolm range parseriga kontrollitud ning pikkuse/räsi järgi taastatud stdout-ümbrist; toorkataloogi eksporti pole |
| Git | main e336a5b9d02845c688def778babeac0f1e3fec95; täpselt 33 paketi teed; puhas lõppseis ja push | Viimane salvestatud remote’i vaatlus lõppes 24.11 kell 16:26:34.457 Tallinn; uut remote’i päringut ei tehtud |
| Vercel | e336a5b, Ready / praegune Production, main, 24 s | Eraldi kasutaja pilt; raporti READY_NOT_CHECKED jääb muutmata |
| Ettevõtte töö | Milline Vedu „Muruniiduki operaator” otsingus, üksikvaates ja profiililoendis | Kolm pilti, aktiivne vaataja Taivo Garaaž; puudub iga kliki võrgujälg |
| Eraisiku aktiivne töö | Praegu puudub | Kasutaja kinnitus; veebijuht jäi kontrollimata, uut kuulutust ei nõuta |
| Uudised | Eesmärk ja olemasolev lähtealus auditeeritud | Pole uut teostust ega kasutusele võetud V2 uudisvoogu |

Pildil nähtav nupp ei tõenda selle vajutamist. Kontakti saatmist, anonüümset
jagamislinki, järgmisele lehele liikumist ega piiratud konto käitumist nende
piltidega vastu ei võeta. Viies pilt on avaleht, kus on Uudised menüüpunkt.
See ei ole valmis uudisvoo tõend. Profiili kaks teadet on lähtekoodis staatilised
näited. Täpne visuaalne kirje on `review/visual/screenshot-review.json`.

## Täpne lähtealus

Ainus vanem: `a9d86e63ab667545598da8e40ee2a2d0c7365df3`. Uus puu: `7734a70aa174b25b2ce5cc85aca3c0fa4e628624`; **2253 jälgitavat faili**.
Inventari SHA256: `1a5b9ae1ba4f7adb69ec6d06a9b97ff83de0bf2e88d66f558819daa58b91242a`. Kõik taastatud failid vastavad SHA-256-le,
Git blob’idele ja failirežiimidele. Lähtekoopia ei sisalda `.next` väljundeid,
sõltuvusi ega muid jälgimata ettevalmistusfaile ning ei ole Maci checkout.

Muutus seitse olemasolevat dokumenti ja lisandus 26 dokumentatsiooni-, SQL-
ning testifaili. Senine rakenduse kliendikood, package.json ja lukufail säilisid.
SQL-is asendati ainult `jobs_private.visible_to_viewer(uuid)` ja
`public.get_public_profile_jobs_v1(text,integer,jsonb)` kehad.

Ühine kontooleku allikas on `account_lifecycle_private.account_is_available(uuid)`.
Eraisiku omanik tuleb `identities.user_id` kaudu, ettevõttel
`business_accounts.owner_user_id` kaudu. Puuduv omanik ei anna ligipääsu.
Jäävad varasemad kahepoolsed blokeeringud, nähtavus ja aegumine. Profiili
kättesaamatu konto vastus jääb null-identiteediga tühjaks loendiks.

Otsingu ja detaili funktsioonikehad, tööde avaldamine/poliitika, kontakt,
task/job eristus, cursor ja omaniku lukuvaba haldusloend säilisid. Konto-
ja sisuridu ei muudetud. Konto sulgemist, taastamist ega lõppkustutamist
selle paketiga ei aktiveeritud.

## Raporti kontroll ja piirid

Originaalraport: `selqiro-too-konto-olek-20261124-raport-20261124-162634-8fdb9330d5e6.json`, **1 367 929 baiti**, SHA256 `76ee0b1d3dc42838b7ddcafec65c4903638da50adb43a90cff1a271f6f97c629`.
Muutmata väljastatud ZIP-i SHA256: `e3b14c12b9182873dafffdd4fb930c306cdabcdce5f50b909388c3a2c3393a48`.
Manifesti SHA256: `29afa6977d0e5097b1082bee9bb16dd9218c89816c5de1b93f3f2b54c23a250d`. Raporti run_id/package_sha256 tähistab manifesti,
mitte ZIP-i räsi.

570 käsukirjet on ajalises järjekorras ning lõpetatud koos protsessikoristuse
kinnitusega. 564 teadaolevat Giti stdout-väljundit taastati ja võrreldi
salvestatud pikkuste/räsidega. Kuue ülejäänud väljundi korral säilib runner’i
lähtekoodiga seotud parsitud tõend; täielikke argv massiive ega toorvooge
raport ei ekspordi. Täpsed vahed on `review/runner/review.json`-is.

SQL-i eelkontroll lõppes kell 16:25:59.388, üks kinnitatud rakendamine kell
16:26:03.995 ja eraldi verify kell 16:26:08.194 Tallinn. Kõik toimusid enne
Giti staging’ut. Taastatud ümbrised on 492, 487 ja 487 baiti ning vastavad
salvestatud stdout-räsidele. Kolme käsu 27-baidise stderr’i sisu puudub ja
seda ei tõlgendata. Kataloogisõrmejälg on piiratud metaandmete kontroll,
mitte serveriallkiri ega täieliku andmebaasi uus audit.

Eelmise teenuste etapi alus/järelseis, originaalraporti read-only hoidmine,
CLI 2.117.0 ja projektiviide on kontrollitud. SQL-i ülevaatus ei avanud
elusat teenust. Vastuvõtul ei korratud rakenduse teste, build’i, SQL-i,
uuendajat ega Giti võrguoperatsioone. Algne raport ja väljastatud paketid
säilisid muutmata. Täisraportit ega viit pilti uude arhiivi ei kopeerita.

## Säilivad jõudluse ja kontoelutsükli piirid

Ettevalmistuse sünteetilisel 5500 tööga alusel oli filtreeritud otsingu
mediaan ligikaudu 31,21 → 79,99 ms (500 konto kontrolli) ning 200 tööga
profiili mediaan 19,75 → 36,00 ms (201 kontrolli). Konto ja omaniku
punktotsingud kasutasid indekseid, kuid päringu kandidaatide arvust sõltuv
lisakulu jääb eraldi optimeerimistööks. Teenuste varasem 5500 kandidaadiga
filtrita otsingu piir 566,67 → 1105,46 ms säilib samuti. Need on üksikklienti
kasutavad sünteetilised mõõtmised, mitte tootmiskeskkonna koormusgarantii.
Täpsed varasemad katsed on muutmata paketi proof/performance ning
account-job-read-fence-v1 dokumentatsioonis.

Konto sulgemise tervik vajab allesjäänud lugemis- ja kirjutuspiire,
otseõigusi, kontakti/sõnumeid, meediat ning sessioonide käsitlust. Kolme
olemasolevat kontot ei kasutata hävitavate katsete jaoks.

## Uudiste prioriteet ja järgmine töö

Kasutaja täpsustas 24.11, et Uudised on jälgimisnimekirja lisatud poodide
uute kuulutuste ja teadete voog ning oluline põhjus portaali tagasi tulla.
See on põhifunktsioon ja peab valmima enne tasulisi nähtavusvõimalusi.

**Konto sulgemise/taastamise/kustutamise tervik → jälgitavate poodide ja profiilide Uudised → kuulutuste esiletõstmine → reklaamid.**

Uudiste allikapõhine kavand on `docs/architecture/followed-news-plan-20261124.md`. V2 link, jälgimisnupp ja teadete
näited on veel ühendamata. Olemasolev V1 jälgimise alus on taaskasutatav
alles kontrollitud serverilepingu ning õiguste kaudu. Audit eristab
lähtekoodis leiduvaid objekte värskelt kinnitamata live-kataloogist.

Üks järgmine kontoelutsükli samm ja selle allikapinnid on `docs/architecture/account-next-after-job-read-20261124.md`.
Kontoetapi audit ega Uudiste kavand ei ole uus teostus. Uued seisukirjed ja
nelja projektdokumendi lisad on valmis järgmise sisulise koodipaketi jaoks;
neid pole pärast e336a5b Maci kirjutatud, commit’itud ega pushitud.

**Kasutajal pole selle vastuvõtu jaoks vaja uut käsku käivitada ega uut
eraisiku töökuulutust luua.**
