# Foto lisamine: allesjäänud eduteade ja konto reserv

Juhtumi tõendid ja paranduse piir, 07.11.2026. Tarne ning Maci/Verceli
kasutuskatse ainus jooksev seis on [`CURRENT_STATE.json`](CURRENT_STATE.json);
kehtiv käsk on [`HOSTED_PORTAL.md`](HOSTED_PORTAL.md). See dokument ei anna
neile paralleelset paigaldusjuhist.

## Aktsepteeritud Maci diagnostika

Aruanne `selqiro-foto-lisamise-raport-20261107-112946-2a66f792.zip` lõpetas
07.11.2026 kell 11:29:46–11:29:48 UTC ehk 13:29 Europe/Tallinn. ZIP-i SHA-256:
`021ab5263e73bed83c1efcd9f8e376a43bdadc1dc2e772eebb277622e6d3556a`.
Vaatluse aeg on `2026-11-07T11:29:47.891990Z`; skeemi kontroll õnnestus.

- Maci Python oli **3.9.6**, koguja etapp `complete` ja andmebaasi vastus
  `read_only_response_validated`.
- Enne ja pärast lugemist oli `main` HEAD
  `a4b5b2d14e456e6e83d4412b839ef330259cd048` ning **1081/1081** lähtefaili
  vastasid väljastatud fotovaliku r2-le. Tracked tööpuu oli puhas; index ja
  lähtepuu võrdlus ei muutunud. Ühine lähteräside kaardi SHA-256:
  `e3667828c0cea2c36016dda3de68750227f5f6c135fae23394e2cb9a2af4c236`.
- Koguja ei kirjutanud rakendusse, Giti, andmebaasi ega Storage'isse ega
  lugenud/kustutanud varasemaid päevikuid. SQL-i vaatlus ei sisalda fotode
  sisu, nimesid, e-poste, kasutajate UUID-sid, objektiteid ega ligipääsutokeneid.
  CLI toorvastust ei eksporditud.

See asendab varasema seisukoha, et konto ja galerii vaatlus on veel ootel.
See tõendab olemasolevat lähteseisu, mitte uue paranduse paigaldust või
Verceli deployment'i.

## Mõõdetud reserv ja galerii

Arvestus on kuulutuste 201/202 ühise algse avaldaja konto `actor_user_id`
põhine üle kahe identiteedi. Raport ei tuvasta brauseri praegust kasutajat
ega pilveteenuse tegelikku vaba kettaruumi.

| Reservi hoidev rühm | Objekte | Loogiline reserv |
| --- | ---: | ---: |
| Avaldatud SOURCE, koristus `pending` / `published_source` | 9 | 225 MiB |
| Aktiivne WEB, koristust pole määratud | 13 | 52 MiB |
| Kokku | 22 | **277 MiB** |

Konto piir on **300 MiB**, vaba loogilist reservi on **23 MiB**. Uus foto
vajab **29 MiB**: 25 MiB SOURCE-i ja 4 MiB WEB-i. Seetõttu keeldub allocator
uuest katsest ka siis, kui galeriis on alla kümne foto. Viis varem kustutatud
SOURCE-i ja üks eemaldatud WEB olid täieliku kustutustõendiga ning hoidsid
0 baiti reservi.

Kontol oli kümme katset, neist viis loodud viimase 24 tunni jooksul. Avatud
või aegunud avatud katseid, lõpetamata sessioone ja multipart-osi ei olnud.
Raport ei leidnud kustutatuks märgitud, kuid endiselt reservi hoidvaid objekte.

| Kuulutus | Aktiivseid fotosid | Revisjon | Viimaste lisamiste SOURCE-i koristus |
| --- | ---: | ---: | --- |
| 201 | 5 | 6 | 3 avaldatud lisamist, SOURCE-id ootel |
| 202 | 3 | 2 | 2 avaldatud lisamist, SOURCE-id ootel |

Liikmesus, põhipildi viide ja nende lisamiste kviitungid sobisid. Need
ajaloolised edukad lisamised ei tõenda kasutaja viimase valitud faili saatmist.
Üheksa struktuurset SOURCE-kandidaati ei anna kustutusluba: iga lõpetamine
peab läbima olemasoleva täpse autoriseerimise ja claim'i.

## Vana eduteate põhjus ja lõplik kliendiparandus

Tegeliku muutmisvaate lokaalses katses kordus järgmine sündmuste jada:
esimene lisamine lõppes; järgmise native failivalija sulgumisel käivitas
`window.focus` omaniku värskenduse; `owner.loading` muutis komponendi
blokeerituks ja saabunud fail jäeti kõrvale. Eelmine lõpetatud päevik ning
„Foto on kuulutusele lisatud.” jäid nähtavale, kuigi uut prepare/PUT/append'i
polnud. See kordab võimalikku rakenduse viga, mitte kasutaja brauseri
sündmuste tagantjärele mõõdetud järjestust.

Lõplik 117-realine `ManagedListingPhotoAdd.tsx` hoiab native sisendi lubatuna
ning seob kohaliku valiku valija avanud kontrolleriga. Valik ootab omaniku ja
galerii lubatud seisu; vana eduteade asendub ausa veel lisamata foto teatega.
Senine terminalse toimingu reset toimub alles kehtivate kaitsete järel.
Lugemisvea või täis galerii ajal saab kohalikust valikust loobuda ilma
kaugtoimingut tühistamata. Üleslaadimine vajab endiselt eraldi kinnitamist.

Komponendi SHA-256:
`06d41d253108f20df9ee2e4eafa579108289a30cb8b70bf4693dc6b61b8ba981`.
Ühes integreeritud Chromiumi jooksus läbisid **9/9** sihitud juhtu:

| Juht | Kontrollitud tulemus |
| --- | --- |
| Fookus enne teise faili tagastamist | Valik säilib; ainult eraldi saatmine viib prepare/PUT/append 1→2 ja galerii 3→4, uue päringuvõtmega. Pooleliolev tekst ja põhipilt säilivad. |
| Native valija katkestamine | Uut toimingut ei teki, senine päevik säilib. |
| Kontrolleri asendus | Vana kontrolleri ootel valik ei lähe uude konteksti. |
| Identiteedi vahetus | Vana valik ei käivita uue identiteedi all üleslaadimist. |
| Uuem teise vahekaardi päevik | Senine reset-kaitse säilitab uuema kirje. |
| Omaniku lugemisviga ja taastumine | Valik ootab; edukas lugemine lubab eelvaate, mitte automaatse saatmise. |
| Omaniku lugemisviga ja kohalik loobumine | Loobumine töötab blokeeritud vaates; päevik ja galerii säilivad. |
| Galerii lugemisviga ja taastumine | Puuduv galerii ei kaota faili ega käivita reset'i või saatmist. |
| Galerii täitumine enne faili tagastamist | Kümne foto teade, puuduv reset/üleslaadimine ning toimiv kohalik loobumine. |

Tõendi `repair-browser-proof.json` SHA-256:
`7d810fb43027d4f3289525607b4e0a11e0dc0be3ee4933ba941765290c89b992`.
Fixture seob 44 rakendusmooduli räsid. Auth, RPC ja Storage olid sünteetilised;
OS-valija sündmus ja fookuse järjekord juhitud. Välist võrku, ootamatuid
rakendustoiminguid ega lehe vigu ei olnud. See ei ole päris Maci/telefoni
OS-valija, tootmise andmebaasi või foto lisamise kiiruse katse. Varasema
viie juhu prototüübi build'i ei loeta selle lõpliku komponendi build'iks.

## Reservi lõpetamise piiratud parandus

Parandus kasutab olemasolevat SOURCE-only hosted koristajat ainult sama
kuulutuse emaavaldamise ja selle päringuvõtme seoses. Praeguse kasutaja õigused
ning täpsed claim-, lease-, Storage'i puudumise ja SQL-i lõpetamistõendid
säilivad. Algse avaldaja ja praeguse lubatud äriliikme erinevus on lubatud;
teise liikme enda reservi vabanemist sellest ei järeldata.

1. Ainult täpne `publication_retained_bytes_limit` / SQLSTATE `54000`
   `prepare`-keeldumine lubab ühe SOURCE-i lõpetamiskatse. Keeldumine toimub
   enne uue katse loomist; tundmatu vastuse järel uut prepare'i ei saadeta.
2. Pärast lõpetamiskatset peab värske, samasse emaavaldamisse seotud omaniku
   kviitung näitama loenduri vähenemist. Siis korratakse esialgset `prepare`
   käsku samade argumentidega kõige rohkem üks kord. Allocator kontrollib
   tegelikku reservi ja kõiki muid tingimusi uuesti.
3. Kinnitatud `append`-kviitung võib käivitada ühe SOURCE-i lõpetamise pärast
   vastust Next.js-i `after()` kaudu. Mõlemal lõpetamiskutsel on 20 sekundi
   piir; järelkutset piirab ka route'i/platvormi eluiga. Koristuse tõrge ei
   kirjuta ümber juba kinnitatud lisamise vastust.

SQL-i, konto ega failide piire ei muudeta; uusi loendureid või üldist kontode
ja kuulutuste skaneerimist ei lisata. Aktiivseid WEB-fotosid see rada ei
kustuta. Reserv vabaneb ainult senise täieliku kustutustõendi alusel, mitte
Storage'i vastuse või nähtava paneeli kadumise tõttu. Üks kutse ei tühjenda
kogu varasemat järjekorda. Täpne püsiv leping on
[avaldatud foto lisamise arhitektuuris](../architecture/published-photo-addition-v1.md).

## Koguja ajatemplivea lahendus ja tarne piir

Esimene raport kell 11:01 UTC peatus `DATABASE_REPORT_TIME_INVALID` veaga
pärast edukat SQL-lugemist; sealt puudusid valideeritud vaatlus ja lõplik Maci
hetktõmmis. Selle tõend säilib, kuid see ei ole enam viimane diagnostika.

R2 täiendab lubatud ajatemplite murdosa ainult ajutises parsimistekstis kuue
numbrini, hoides algse väärtuse muutmata. Lubatud kuju, kalendri ja ajavööndi
kontrollid säilivad. SQL-i ja transporti ei muudetud. Varasemad kümme kitsast
ühilduvuskontrolli olid lokaalsed; nüüd kinnitab 11:29 UTC päris Maci raport
edukat terviklugemist **Python 3.9.6** all, sealhulgas neljakohalist murdosa
`.4332+00:00`. Koguja ühilduvuse kontroll ei ole seega enam ainult prototüüp.

Need tõendid seovad paranduse tegeliku lähtepuu ja mõõdetud reserviprobleemiga.
Uue paranduse Maci paigaldus, sellele vastav Verceli Ready ning päris järgmise
foto lisamine ja avalikus vaates nähtavus vajavad eraldi kasutuskatset. Ühise
build'i, serveritestide ja tarne tulemused kantakse `CURRENT_STATE.json`-i.
Käesolev ülevaade ei luba lühemat üleslaadimisaega ega täielikku ingliskeelset
V2 kasutajaliidest; keele nõue jääb [ühisesse lepingusse](../architecture/interface-language-v1.md).
