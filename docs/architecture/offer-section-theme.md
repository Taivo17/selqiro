# Pakkumiste kogumite kujundus

## Eesmärk

Teenuste ja töö kogumid kasutavad sama rahulikku visuaalset struktuuri
nagu kuulutused. Värv aitab ära tunda pakkumise liigi; nähtav pealkiri
ja tegevuse tekst annavad sama tähenduse ka värvi eristamata.

## Üks esitluse allikas

`src/shared/marketplace/offerTheme.ts` määrab olemasolevad liigivärvid ja
`getOfferSectionClass(kind)` annab kogumi välisraami. Tailwindi klassid
on terviklike staatiliste stringidena, et need jõuaksid production-CSS-i.
Abiline ei loe andmeid ega sisalda õiguste või avaldamise reegleid.

| Liik | Taust | Piir | Ülariba |
| --- | --- | --- | --- |
| Kuulutused | amber-50 | amber-200 | amber-500 |
| Teenused | teal-50 | teal-200 | teal-500 |
| Töö | blue-50 | blue-200 | blue-500 |

Raami ümardus on 30 px ja ülariba kõrgus 6 px. Riba järgib ümardatud
ülaserva. Olemasolev vaate sisemine vahe jäetakse selle vaate määrata.
Sisemised pakkumiskaardid on valged; My Area tööpakkumiste read saavad
valge sisepinna, et sisu eristuks sinisest välisraamist.

## Kasutuskohad

Sama raam on avaliku otsingu tulemustel, Minu ala pakkumiste kogumitel
ning avaliku profiili kogumitel kõigi kolme liigi puhul. Olemasolevad
kuulutuste ja profiili teenuste raamid kasutavad sama abilist, säilitades
senise tausta, ülariba, ümarduse ning sisuvahed.

Töö avastamisvaate tulemused, laadimise ja tühja seisu paneelid kasutavad
ühtset sinist raami. Teenuste otsing säilitab olemasoleva tulemusstruktuuri.
Kogumi pealkirjad, filtrid, kaardid ja navigeerimine jäävad oma moodulisse.

## Ulatuse piir

See samm ei muuda vormide või avaliku detaili struktuuri, tegevusnuppude
värve, sõnumimulle, jagamist, identiteedi lugemist, andmepäringuid ega
serveri õigusi. Värv ei märgi staatust: edu-, vea- ja hoiatussõnumid
säilitavad oma tähenduse. Ükski kasutajaandmete rida ei muutu.

Täielik build kontrollib koostamist ja CSS-i tootmist. Visuaalne ülevaatus
vaatab kogumite toonierinevust, ülariba, valgeid sisekaarte ja kitsast
ekraani. Rakenduse käitumist peegeldavaid uusi teste pole klassimuudatusele
vaja. Täpsed väljastus- ja kasutuselevõtu tõendid on CURRENT_STATE.json-is
ning jooksu raportis; valmis koodi ei samastata avaldatud veebiversiooniga.
