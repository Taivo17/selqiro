# Suhtluse konto-oleku uuenduse sõltumatu vastuvõtt

**Tulemus: PASS — tagastatud raport kinnitab kontrollitud konto kirjutuspiiri rakendamist ja lähtekoodi avaldamist.**

Raport käsitleb 24.11.2026 kell **20:06:17.667–20:07:14.861 (Europe/Tallinn)** toimunud käivitust. Pakett, ZIP, manifest ja kõik 209 väljastatud faili vastavad kontrollsummadele. Varasemate töökuulutuste ja parandatud suhtluskataloogi originaalraportite kontrollsummad ning nende säilitamise tõend vastavad väljastatud käivitajale.

## Andmebaasi rakendamine

Raportis on täpselt kolm andmebaasikäsku: eelseisu kontroll, **üks rakendamine** ja eraldi järelkontroll. Taastasin kõigi kolme CLI JSON-väljundi täpsed baidid ning kontrollisin need väljastatud range parsijaga. Eelseis on tuntud `before`; rakendamise kinnitus ja sõltumatu järelkontroll on mõlemad täpselt nõutud `after` kontrollsummaga.

Rakendamise kinnitus tuleb kontrollitud SQL-is pärast `COMMIT`-i. Raport märgib `database_apply_acknowledged=true` ning `acknowledged_apply_and_independent_verify`. Rakendamist ei korratud. Väljastatud SQL-i täpne õigus- ja kataloogikontroll läbis käivituse; kasutajate kontoridu ega sõnumeid need kontrollpäringud ei väljasta.

## Lähtekood, koostamine ja avaldamine

- Algseis: `e336a5b9d02845c688def778babeac0f1e3fec95`, 2253 lähtefaili.
- Muudatus: 59 täpselt lubatud faili — 7 olemasolevat dokumenti ja 52 uut faili.
- Uus commit: `8b7db90d08682b512d76e64c699af56fc8cae6a3`.
- Uus puu: `6f8e9b6e7b8e3e5ab2add913247a424908f91630`, **2305 lähtefaili**.
- Commit’i pealkiri: **Respect account availability in contact and message writes**.

Kõigi **541 käsu** järjekord vastab väljastatud koodi edukale teekonnale. **539 väljundi** täpsed baidid ja kontrollsummad on sõltumatult taastatud, sealhulgas kõik 59 lisatud indeksifaili, neli lõplikku kogu puu/indeksi kontrolli ja avaldamisjärgne `origin/main`. Kõik käsud lõppesid kontrollitult; elus protsessirühma liikmeid ega lõpetamata puhastust raportis ei ole. Kolm jooksva kasutaja tegeliku UID alusel tehtud käitusvaatlust ja nende 12 abikontrolli on korras.

Macis tehti **üks värske tootmisversiooni koostamine**, mis lõppes edukalt. Kaheksa koostamisartefakti kontrollsummad on raportis. Selle SQL-i ja dokumentatsiooni muudatuse puhul rakenduse teste uuesti ei käivitatud; **48 PostgreSQL-i kontrolljuhtu** jäävad eraldi, muutumatu ettevalmistustõendina paketti.

## Kasutaja kinnitus on eraldi tõend

Kasutaja teatas, et sõnumite katsetamine õnnestus. Põhiagendi edastatud ekraanipilt näitab `main` haru commit’i `8b7db90` sama pealkirjaga olekus **Ready / Production**, kestusega **22 s**. See täiendab käivitaja raportit; käivitaja enda väli jääb korrektselt `READY_NOT_CHECKED` ning selles ülevaatuses Verceli ega brauserit eraldi ei avatud.

## Piirid

Raport koos täpselt seotud lähtekoodiga on kooskõlaline käivitustõend, mitte serveri krüptograafiline kinnitus. Koostamise ja `git commit` käsu algteksti ning indeksi algseid binaarbaite raport ei sisalda; nende õnnestumist toetavad käivitaja kontrollid ning hilisemad täpselt taastatud lähtekoodi, commit’i ja kaugviite väljundid. Käskude argumendid tulenevad seotud koodist, sest toorest argumentide protokolli ei ekspordita.

**Konto sulgemist või kustutamist ei aktiveeritud.** E-posti/SMTP/Auth seadistust, sõltuvuste paigaldamist ega Storage-toiminguid ei tehtud. Sõnumite õnnestunud kasutajakatse ei tõenda suletud konto käitumist. Vestluste/osaliste otseste kirjutuste ja ülejäänud kontoelutsükli tingimused jäävad järgmise tööetapi osaks.

Ülevaatus kasutas ainult olemasolevaid faile ja puhast vastuseparsijat. Maci töövoogu, andmebaasi, Giti kaugkäskusid, brauserit, koostamist ega käitumisteste siin uuesti ei käivitatud. Varasemad paketid jäid muutmata.
