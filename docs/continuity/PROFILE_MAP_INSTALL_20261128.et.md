# Avaliku profiili kaardi kasutuselevõtt

28.11.2026, Europe/Tallinn. **ASUKOHT-1 on vastu võetud; praegune samm on
ASUKOHT-1B — avaliku profiili kaart.** Viimane vastu võetud commit on
`af78c7be2a336da661be838d3577bb51b7ad3b66`.

## 1. Mida see uuendus teeb?

Avaliku profiili tühi kaardiplokk asendub liigutatava ja suumitava kaardiga,
mis näitab juba salvestatud linna või piirkonda. Kaardil on ka suurema
vaate avamise link. Uut API võtit ega koha uuesti salvestamist pole vaja.

Ettevõtte avaliku tänavaaadressi juurde lisandub **„Ava aadress Google
Mapsis”**. Asula keskpunkti ei näidata ettevõtte täpse hoonena: praegune
tänavaaadress on tekst ja Google Mapsi link otsib seda kasutaja klõpsul.
Peidetud asukoha korral avalikku kaarti ega aadressi kaardilinki ei kuvata.

## 2. Üks uus käsk

Laadi uus `selqiro-profiili-kaart-20261128.zip` alla ning paki
Downloads-kaustas lahti. Käivita terminalis üks kord:

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-kaart-20261128/uuenda.py" --publish
```

Projekt on senine `/Users/taivo/selqiro`. Uuendaja kontrollib täpset vastu
võetud alust, olemasolevaid sõltuvusi ning varasemate käikude muutmata
raporteid ja päevikuid. Seejärel lisab ta lähtekoodi, teeb fookustestid ja
värske build'i, kontrollib andmebaasi ning lisab ühe avaliku kaardi
lugemisfunktsiooni. Pärast SQL-i kinnitust ja eraldi järelkontrolli tehakse
commit/push. Uuendaja ei ava konto sulgemist ega muuda vanade pakkumiste andmeid.

Lõpus saada **selle uue käigu JSON-raport**. Kui käik peatub, saada sama
raport. Vana asukohapaketti ega lõpetatud kontrolli ei käivitata uuesti.
Kaotatud SQL-kinnitus ei tähenda, et sama kirjutust võiks korrata; esmalt
lahendatakse raportis näidatud täpne seis.

## 3. Sama uue tootmisversiooni kontroll

Oota, kuni uus commit on Vercelis **Ready / Production**. Seejärel ava
avalik profiil ning kontrolli:

| Katse | Oodatav tulemus |
| --- | --- |
| Eraisik, salvestatud Paide linn | Kaart näitab Paide piirkonda, seda saab liigutada ja suumida. Koduaadressi markerit pole. |
| Ettevõte, salvestatud Paide linn | Sama linnakaart ning „Ava suurem kaart” link. |
| Ettevõte, avalik Pärnu mnt 35 Paide | Aadress on loetav; „Ava aadress Google Mapsis” avab selle aadressi otsingu. Linnakaart on selgelt ligikaudne. |
| Asukoha nähtavus peidetud, muudatus salvestatud | Avalikus profiilis pole kaardiplokki ega aadressi kaardilinki. |
| Nähtavus taastatud ja salvestatud | Varem kinnitatud asula kaart ilmub uuesti. |
| Vaheta kahe erineva profiili vahel | Kuvatakse avatud profiili koht; eelmise profiili kaart ei jää alles. |
| Kitsas mobiilivaade | Kaart mahub plokki ja lingid on kasutatavad. |

Kontrollida tuleb nii loetavat profiili kui ka päriselt laaditud kaarti.
Kohalikud automaattestid ja build ei asenda teise teenuse iframe'i
visuaalset kontrolli. Vastuvõtuks sobivad uus JSON-raport, sama commiti
Ready / Production pilt ja kaardi toimimise kinnitus või ekraanipilt.

Kui see samm on vastu võetud, jätkame **ASUKOHT-2-ga**: uue kuulutuse,
teenuse ja tööpakkumise asukoha eeltäide aktiivsest profiilist. Hiljem
tulevad lähimad-enne otsing valitud riigi piires ja ajutine teenusekoht.
