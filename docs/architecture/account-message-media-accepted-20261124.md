# Vestluste ja manuste konto-oleku uuenduse vastuvõtt

**PASS — tagastatud raport, üks andmebaasimuudatus ja avaldatud lähtekood on omavahel kooskõlas.**

Raporti käivitus toimus 24.11.2026 kell **21:19:41.618–21:20:35.250 (Europe/Tallinn)**. Paketi ZIP, manifest ja kõik **178 väljastatud faili** vastavad täpsetele kontrollsummadele. Viimase eduka suhtluse uuenduse originaalraport on muutumatult seotud ja säilitatud ainult lugemiseks; varasemate raportite säilimine on selle täpse kviitungi kaudu seotud.

## Andmebaas

Täpselt kolm andmebaasikäsku: eelseis, **üks rakendamine**, eraldi järelkontroll. Kõigi kolme JSON-väljundi täpsed baidid ja räsi taastati ning vastused kontrolliti väljastatud range parsijaga. Eelseis vastab nõutud `before` lepingule; rakendamise kinnitus ja järelkontroll vastavad samale nõutud `after` lepingule.

Kinnitus paikneb kontrollitud SQL-is pärast `COMMIT`-i ning raport kinnitab `database_apply_acknowledged=true` ja `acknowledged_apply_and_independent_verify`. Tundmatu tulemusega korduskirjutust ei toimunud. Täpsete wrapperite metaandmete ja paigaldusõiguste nõuded läbisid kontrolli. Kontode, sõnumite või piltide andmeridu kontrollvastused ei ekspordi.

## Lähtekood ja avaldamine

- Alus: `8b7db90d08682b512d76e64c699af56fc8cae6a3`, **2305 faili**.
- Muudatus: **39 faili — 9 muudetud dokumenti ja 30 uut faili**.
- Uus commit: `908a45717c6c66e717ab46c2ec0aa7bb5dd44954`.
- Uus puu: `ed872b82a9ac67fe9f0073716492e2fb7b90b893`, **2335 faili**.
- Pealkiri: **Respect account availability in conversation and photo writes**.

Kõigi **521 käsu** järjekord vastab täpselt seotud edukale kooditeele. **519 väljundit** taastati baiditäpselt, sealhulgas 39 indeksisse lisatud faili, neli lõplikku kogu puu/indeksi kontrolli ja avaldamisjärgne `origin/main`. Üks `git add`, üks commit ja üks jõustamata push toimusid pärast andmebaasi kinnitust. Kõik protsessid lõpetati kontrollitult, elusaid protsessirühma liikmeid ega lõpetamata puhastust ei täheldatud. Kolm tegeliku UID alusel tehtud käitusvaatlust ja nende 12 abikontrolli on korras.

Tehti **üks värske Maci build** (Next.js 16.4.6), mis läbis kontrolli; kaheksa koostamisartefakti räsi on raportis. Rakenduse teste SQL-i ja dokumentatsiooni uuenduse tõttu ei korratud. **32 native-kontrolli ja 3 eraldi paigaldusõiguste kontrolli** jäävad varasemaks isoleeritud ettevalmistustõendiks, mitte uueks kasutajakatseks.

Vastu võetud 2335-failine lähtekoopia ja selle täpne inventar on loodud uues töökaustas. See sisaldab ainult kontrollitud lähtefaile; Git-metaandmeid, sõltuvusi ega buildi väljundit ei lisatud. Sõltuvuste inventar kopeeriti muutmata kujul.

## Kasutaja tõend ja eraldi avatud probleem

Põhiagendi edastatud kasutaja kinnitus ütleb, et **tekst ja pildid jõuavad kohale**. Edastatud Verceli pilt näitab commit'i `908a457`, `main`, **Ready / Production**, **21 s**. See on eraldi kasutaja tõend; paigaldaja ise jätab korrektselt `READY_NOT_CHECKED`, ning selles ülevaates brauserit ega Verceli API-t ei avatud.

Kasutaja kirjeldatud **korduvad hobuse- ja tööpakkumise kaardid**, samal ajal kui tavakuulutuse kaart ilmub üks kord, on eraldi avatud kasutajaliidese probleem. Vastuvõtt ei väida selle põhjust ega parandamist.

## Tõendi piirid

Raport koos täpselt seotud koodiga on kooskõlaline käivitustõend, mitte serveri krüptograafiline kinnitus. Buildi ja commit'i algtekst, indeksi binaarbaidid ja käskude toored argumendid pole raportis. Nende kontroll on piiratud seotud käivitaja tõendite ja sõltumatult taastatud hilisemate väljunditega.

Konto sulgemist/kustutamist, e-posti/SMTP/Authi seadistamist, sõltuvuste paigaldamist ega päris failide Storage-toiminguid paigaldaja ei teinud. Kasutaja pildi saatmise kinnitus jääb eraldi kasutustoiminguks ega tõenda suletud konto käitumist. Kontoelutsükli ülejäänud töö jääb avatuks.

Ülevaatus luges olemasolevaid faile ja kasutas ainult puhast SQL-vastuse parsijat. Maci töövoogu, andmebaasi, kaug-Giti, brauserit, buildi ega käitumisteste ei käivitatud. Vanu pakette, lähtekoodi ja raporteid ei muudetud.
