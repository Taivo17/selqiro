# Tööotsingu jaotuse vastuvõtt

27.11.2026, Europe/Tallinn. Kasutaja raporti, muutmatu väljastatud paketi,
säilinud lähtekoodi ja kasutaja piltide võrdlus. Uuendajat, rakenduse teste,
build'i, Git-käske ega SQL-i vastuvõtu käigus ei käivitatud.

## Vastuvõetud tulemus

- Commit: `7c53643012545c7dfa99ba976e6f2613e3c3a201`.
- Pealkiri: `Clarify job and task search intent`.
- Vanem: `2b3407fee17f4d19594ce45647a1739b26249835`.
- Täpne Git-puu: `98444c7d31e7afac995f195d884700b60c82b6cf`.
- 2443 lähtefaili, 40 032 703 baiti. Muudatuse ulatus: 59 faili,
  neist 14 muudetud ja 45 uut; kustutusi ei ole.

Raporti käsutee vastab väljastatud paketi kontrollitud ulatusele. Raportis
on üks testikäik ja build, üks andmebaasi eelseis, üks COMMIT-järgse
kinnitusega rakendamine ning üks eraldi järelkontroll. Commit/push järgneb
andmebaasi kinnitusele; lõppseis seob sama puu kohaliku ja remote main'iga.

Kasutaja Verceli pildil on sama lühikese ID-ga `7c53643` versioon **Ready**,
**Production**, **main**. Seda käsitletakse kasutaja esitatud juurutustõendina,
mitte meie tehtud uue Verceli päringuna.

## Kasutajaliidese nähtav tõend

27.11 pildid näitavad:

- kahe suuna „Otsin töökohta” ja „Otsin tööotsi” olemasolu;
- „Kõik pakkumised” valikut;
- töökoha „Muruniiduki operaator, haljastaja” olemasolu üld- ja töökohtade vaates;
- sama pakkumise puudumist tööotsade vaates, kus kuvatakse aus tühi tulemus;
- kaardil silte „Töökoht”, „Tähtajaline”, „Kohapeal” ja „Paindlik”;
- nähtavaid riigi/asukoha välju ning ausat selgitust, et praegu on linnavaste,
  mitte automaatselt laienev lähedusotsing.

Pildid ei tõenda positiivset tööotsa tulemust, kui ühtegi tööotsa ei ole,
ega kitsast mobiilivaadet või tervet tagasi-navigeerimise kasutuskäiku.
Neid katseid ei märgita tagantjärele sooritatuks. Testi pärast avalikku
tööotsa looma ei pea. Piltide algfailid ei kuulu sellesse jätkamisfaili;
nende nimed ja räsid on `evidence/ui-observations.json`-is.

## Testi- ja build-tõendi piir

Säilinud ettevalmistuse TAP loeti sõltumatult üle: 43/43 õnnestus, vigu,
vahelejätmisi ja katkestusi ei olnud. Ettevalmistuse täisbuildi logi ning
767 sisendit ja 8 kompileeritud artefakti on räsideni võrreldud. SQL-i
ettevalmistustõend sisaldab 58 eraldatud kontrolli. Neid teste ei käivitatud uuesti.

Maci tegeliku käigu 43 testi ja build'i kokkuvõtted on eraldi seotud raporti
käsuräside ja paketi lepinguga. Maci algseid logibaite selles JSON-is ei ole;
nende uut sõltumatut parsimist ei väideta. Täpne tõendipiir ja käsuräside
arvestus on `evidence/job-search-accepted-20261127/` failides.

## Muutmatud sisendid

| Sisend | Baiti | SHA-256 |
| --- | ---: | --- |
| Kasutaja 26.11 kell 12.36.37 raport | 1452209 | `39a9e0d2296e360c4fe3c210b56fca291593ac5965f33368dd3f4de70a38176f` |
| Väljastatud `selqiro-too-otsingu-valikud-20261126.zip` | 1638462 | `8f696a9c87728bc4a5708d0758a922f82192ced052041dcec39687e5b4502d5a` |
| Paketi manifest | — | `e40d9e26abe0e6104e0a959bc782a08cdf2cf78b3543851d4fc92faba57aeeae` |

Paketi failide arv on 159; manifest seob 16 käivitajamoodulit ja 75 artefakti.
Kontroll ei ole uus tootmise andmebaasi või GitHubi päring. Tootmise tegeliku
käigu allikaks jäävad kasutaja saadetud raport ja pildid.

## Järgmine töö

Tööotsingu jaotus on lõpetatud etapp. Selle uuendajat ei korrata.
Järgmine aktiivne teema on riigipiiriga asukohaotsingu alus ASUKOHT-1;
kehtiv piir on `location-country-20261127.md` ja staatus `CURRENT_STATE.json`-is.
