# Töökoha ja tööotsa otsingu selged valikud

26.11.2026, Europe/Tallinn. **Ette valmistatud ja lokaalselt kontrollitud.
Kasutaja Maci käik ning uue commiti tootmise tulemus on veel ootel.**

## Kasutaja otsus

Töö otsija valib kohe „Otsin töökohta” või „Otsin tööotsi”. Väiksem valik
„Kõik pakkumised” jääb alles. Avaldaja senised „Otsin töötajat” ja
„Otsin töö tegijat” kirjeldavad sama jaotuse teist poolt. Eraisik ja ettevõte
võivad mõlemad avaldada seniste õiguste piires. Konto liik ei määra töö liiki.

| Otsija valik | Näidissisu | Käesolev teostus |
| --- | --- | --- |
| Otsin töökohta | Püsiv või tähtajaline töötaja, haljastaja, autojuht | Kõik mitte-tööotsa tüübid, kaasa arvatud täpsustamata alamtüüp |
| Otsin tööotsi | Lumekoristus, aia parandamine, veotellimus | Olemasolev `employment_type='task'` |
| Kõik pakkumised | Mõlemad koos | Senine piiranguta otsing |

Tähtajaline töökoht jääb töökohaks. Korduv tellimus võib olla tööots.
Teenuse pakkumine „Teen vedusid” jääb teenuste rubriiki; tellimus
„Vajan vedu” on tööots. Eraldi veotöö peasuunda selles sammus ei lisata.

## Nähtav käitumine

- Kaks suurt valikut on enne märksõna ja valdkonda; suuna muutmine käivitab otsingu.
- Riik ning linn/piirkond on nähtavad kohe. Praeguse linnavälja abi ütleb
  selgelt, et see otsib sisestatud linna järgi ega kaasa lähikohti automaatselt.
- Töökoha suunas on lisafiltrites töösuhte tüüp ja tööaeg. Tööotsa suunas
  neid ei näidata ning varasema suuna töökoha alamtüüp/tööaeg puhastatakse.
- Ühised märksõna, valdkond, asukoht ja töö tegemise viis säilivad suuna vahetusel.
- „Kõik pakkumised” eemaldab suunapiirangu; „Eemalda filtrid” taastab kogu algseisu.
- Töökaardil kuvatakse olemasolul ka töösuhte tüüp, näiteks „Tähtajaline”.
- Filtrid säilivad URL-is; otsingu muutus tühistab vana päringu ja alustab uut lehekülgede jada.
- Natiivsed raadionupud säilitavad klaviatuuri fookuse; kogu vormi ei looda valiku muutumisel uuesti.

## Üks serverimuudatus

`public.search_public_jobs_v1` säilitab signatuuri, õigused ja seadistused.
Olemasolev `p_employment_type` saab ainult otsingu jaoks väärtuse `employment`.
See tähendab `j.employment_type IS DISTINCT FROM 'task'`, seega kuuluvad
hulka ka varasemad tööpakkumised, mille alamtüüp on NULL. NULL otsinguparameeter
säilitab „kõik” tähenduse; `task` ja konkreetsed töösuhte tüübid säilitavad
oma senise tähenduse. Avaldamise/salvestamise sisulepingusse uut väärtust ei lisata.

Filter rakendub serveris enne kursorit ja lehe suuruse piirangut. Säilivad
kehtivuse, avaldamise, pakkuja/konto kättesaadavuse, peidetud pakkujate ning
blokeerimise kontrollid. Vana rakendus saab sama otsingufunktsiooni kasutada
ka enne uue rakenduse deploy'd. Uus väärtus nõuab esmalt kinnitatud SQL-i;
käivitaja lubab commit/push'i alles pärast selle sõltumatut järelkontrolli.

## Kontrollid ja piirid

Alus `2b3407fee17f4d19594ce45647a1739b26249835`, puu `b6543039421cd86f4227d18f65edde1ca06e8a05`. Täpne lähtealus ning ainult määratud
rakenduse, testide, uue SQL-release'i ja dokumentatsiooni muudatused on seotud
paki kontrollsummadega. Sõltuvusi ei muudeta ega installita.

Ettevalmistuses läbisid 43 kliendi/modeli/SSR kontrolli,
TypeScripti kontroll ja värske Next 16.4.6 build. Eraldatud PostgreSQL 17.6
läbis 58 kontrolli ning käivitaja 35 kontrolli.
Täpne tõendipiir ja sünteetilised sisendid on pakis. Brauseri kasutuskäiku,
Maci käiku, tootmise andmebaasi ega uut Verceli tulemust need ei asenda.

See pakett ei aktiveeri geograafilist lähedusotsingut. Globaalne keskpunkt,
koordinaatide salvestamine, teenindusala, töö tegemise kuupäev/korduvus ning
veo lähte- ja sihtkoht vajavad järgmisi andme- ja lugemislepinguid. Asukoha
kontrollitud lähtekoht ja teostusjärjekord on `location-search-20261126.md`.
