# Konto oleku vundament — vastu võetud 23.11.2026

## Tulemus

Maci raport, täpse väljastatud paketi võrdlus, sõltumatu SQL-i/parseri ülevaatus
ning kasutaja Verceli ja päris vaate pildid kinnitavad kontooleku etapi valmimist.
Vastu võetud commit on `4b607828d0b153b84166ba963fdb4e77337e11f0`, Git-puu `8012909c809772c1fd905129cc3643f8614655a3`,
2108 jälgitavat faili. Report ei ole iseseisev Verceli tõend; allpool on piirid eraldi.

| Osa | Vastu võetud tõend |
| --- | --- |
| Maci lähtekood | Kõik 70 paketi rada commit’is; neli täielikku järelkontrolli; tööpuu ja indeks puhtad. R2 kirjutas 15 dokumenti, ülejäänud 55 faili olid õiged. |
| Testid | Sama lähtekoodi 20 varem läbitud testi tõend kontrolliti üle; neid ei käivitatud uuesti. |
| Build | Üks värske Next.js 16.4.6 build; parsitud logi, seitse artefaktiräsi ja kinnitatud protsessilõpp. |
| Andmebaas | Üks preflight, üks kinnitatud apply ja eraldi ainult lugemise verify; kõik vajalikud olekuread olemas kontrolli piiris. |
| Commit / push | Main `4b607828d0b153b84166ba963fdb4e77337e11f0`; viimane remote’i võrdsus 23.11 kell 17:32:02.839 Europe/Tallinn. |
| Deployment | Kasutaja 17.33.20 nimega Verceli pilt: sama 4b60782, Ready / Production. |
| Tegelik vaade | Kasutaja „minu konto on olemas”; Minu konto vaates Aktiivne, tagasilink, loomiskuupäev 15. aprill 2026. Päises Milline Vedu. |

E-posti väärtus on pildilt väljas. Kõigi kolme konto, kitsas vaates kuvamise või
kõigi sisenemisteede läbimist nende piltide põhjal ei väideta. Need piirid ei
muuda nähtud edukat konto lugemist ega deployment’i kinnitust.

## Täpne raport ja väljastatud pakett

Raport `selqiro-konto-oleku-jatk-20261123-r2-raport-20261123-173202-f3cf50344df6.json` on 1315892 baiti,
SHA256 `df77de0996451e7b8823262294d7edcb128761eaf7e3a0ecbdce4d3bc47e59e6`. Jooks kestis 17:31:10.507–17:32:02.867 Europe/Tallinn.

[Algne Maci raport](https://chatgpt.com/library?file_id=libfile_fde3_f-384b899c31108191b7773deb65704b9f_47723c41e94c8191aa89f8c107f6c132&account_id=personal) ja
[muutmata r2 pakett](https://chatgpt.com/library?file_id=libfile_fde3_f-f723c08e2b5c8191a83eeabb32ad782d_47723c41e94c8191aa89f8c107f6c132&account_id=personal) jäävad eraldi originaalideks.
R2 ZIP-i SHA256 on `a834294d7c1cbd39cbbf2b00a12848b602e6b92f0b5c672f8b0e87506cf0fe50`;
manifesti SHA256 on `19622aaeaf5b1709cc10efaec8bda07e7263bae843962c5bd1f9bb6c10fd3c98`.

Ülevaatused ning nende räsid asuvad vastuvõtupaki `review/` ja
`evidence/acceptance.json` all. Paketis pole uut uuendajat ega SQL kirjutuskäsku.

## Andmebaasi ulatus

Lisandus üks privaatne skeem, üks kontooleku tabel, kaks funktsiooni ja üks
Auth INSERT-trigger. Olek saab olla ainult `active`. Igal Auth kontol on üks
olekurida; puuduv rida ei tähenda aktiivset kontot. Positiivne bigint revisjon
liigub kliendile kümnendstringina. Auth-välisvõti on ON DELETE RESTRICT.

Raport ei ekspordi kontode arvu ega isikuandmeid. Kasutaja kolm kontot jäävad
kasutaja antud kontekstiks; verify tõendab kõigi vaadeldud Auth kontode katvust
kuni 1000 konto piiri sees. Registreerimise triggeri definitsioon on kontrollitud,
kuid uut päris registreerimist selle raportiga ei katsetatud.

SQL kirjutab ainult uude privaatsesse olekutabelisse. Kõigi 11 kaitstud vana
funktsiooni definitsioonid/õigustega seotud seaded ja kahe vana triggeri leping
säilisid. Olemasolevaid kontosid, profiile, sisu ega finantsridu SQL ei muuda.
See järeldus tugineb täpsele SQL-i ulatusele; värsket globaalset sisu- või
saldode võrdlust ei tehtud.

## Mis jääb järgmiseks

Sulgemine, taastamine ja lõppkustutamine ei ole veel teostatud. Esimene järgmine
moodul katab ainult kanoonilise avaliku profiilikaardi ja selle meediaprojektsiooni
konto kättesaadavusega; selle kavand on `account-public-profile-next-20261123.md`.
Ülejäänud avalikud päringud, kirjutamised, kontaktid/sõnumid ja välise pilditöö
lõppkinnitus tuleb katta enne sulgemistoimingu lubamist. Varem väljastatud avalik
pildi-URL ei muutu ühe profiilifiltriga kasutuskõlbmatuks.

Kasutaja ühe eraisiku või ettevõtte profiili suund säilib; uut mitme identiteedi,
liikmete või omandi üleandmise kasutajaliidest ei lisata. E-posti/sisselogimise
kokkulepitud paus säilib. Konto tervikule järgnevad kuulutuste esiletõstmine ja reklaamid.

## Vastuvõtudokumentide asukoha piir

See dokument, uus CURRENT_STATE, sellest genereeritud üleandmine ning päeviku ja
AI mälu täiendused on ette valmistatud pärast 4b60782 kasutuselevõttu. Neid pole
siit kasutaja Maci kirjutatud, staged, commit’itud või pushitud. Need lähevad kaasa
järgmise sisulise muudatusega. Väljastatud v1, r1, r2 paketid ega nende juhendid
pole ümber kirjutatud. Kõik vanad STOP-id ja originaalpäevikud säilivad.
