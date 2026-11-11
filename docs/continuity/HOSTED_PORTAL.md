# Teenuse üheaastane kehtivus — üks jätkamiskäsk

Seis: 11.11.2026 Europe/Tallinn. Uus lähtepakk on ette valmistatud ja kohalikult
kontrollitud. Praegune tegelik Maci/SQL-i/veebi seis on `CURRENT_STATE.json`-is.
Eelmine teenuste poe rubriikide samm on vastu võetud ning seda ei korrata.

## Rakenda uus pakk

Laadi `selqiro-teenuste-kehtivus-20261111.zip` alla ja paki Downloads-kausta.
Kausta sees peab olema `uuenda.py`. Käivita terminalis üks käsk:

```sh
python3 -I -B "$HOME/Downloads/selqiro-teenuste-kehtivus-20261111/uuenda.py" --publish
```

Uuendaja kontrollib enne kirjutusi olemasolevat `/Users/taivo/selqiro` hoidlat,
haru, HEAD-i, tööpuud/indexit, kogu kinnitatud lähtepuud, eelmist lõppraportit
ja remote'i `https://github.com/Taivo17/selqiro.git`. Oodatud alus on
`1b0c5ba867e5f466e75f63aee78521d37cf8164f`, puu
`6808d687e21b96d7e8b25639e00d0a525f97ad6a` (1563 faili). Erinevust ei kirjutata
üle ega normaliseerita automaatselt. Kasutaja muudatused ja päevikud säilivad.

Järgneb olemasoleva Supabase'i täpne eelkontroll, üks lisanduva SQL-i rakendus,
eraldi järelkontroll, lähtefailid, build ning selle sammu commit/push. Vana V1
kliendileping säilib; uut kontot, projekti, sisselogimist või sõltuvuste
paigaldust pole vaja. Storage'i toiminguid see samm ei tee.

## Üleminek

Avaldatud teenus ja avaldamisajaga (`published_at`) peatatud teenus saavad aasta alates
andmebaasimuudatuse rakendamisest. Algset loomise/avaldamise aega ei muudeta.
Mustandi esimene päris avaldamine alustab tema aastat. Pikendamine on tasuta
ning nõuab omaniku kinnitust, et teenuse salvestatud andmed on endiselt õiged.

## Pärast lõppraportit

1. Oota Vercelis raportis oleva uue commit'i **Ready / Production** tulemust.
2. Värskenda portaali ning ava **Minu ala → Teenused**. Teenusel peab olema
   kehtivuse lõpp ja toiming **Pikenda teenust**.
3. Pikenda üht olemasolevat aktiivset teenust kinnitusega. Kontrolli, et
   kuvatakse salvestatud tähtaeg ja sama teenus avaneb avalikul profiilil
   seniste andmete, fotode ja poe rubriigiga. Eelmisi rubriigikatseid ei korrata.

Kui samal päeval on juba üleminek, jääb kuupäev pikendamisel samaks või muutub
vaid kellaaeg; see on üks aasta kinnituse hetkest, mitte lisa-aasta senise lõpu
otsa. Tootmises ei muudeta käsitsi tähtaega aegumise katsetamiseks.

Uuendaja avaliku raporti väljal olev `READY_NOT_CHECKED` ei kinnita Vercelit.
Brauseri kasutajavastuvõtt on samuti eraldi tõend, mitte SQL-i või Giti asendus.

## Kui toiming peatub

Terminal näitab `PEATATUD`-põhjust ning `SAADA SEE FAIL` real just selle jooksu
unikaalset JSON-faili Downloads-kaustas ja valib sama faili Finderis. Lisa see
fail vestlusse. Kui Finder ei avane, kasuta terminalis kuvatud täpset failiteed.
Kui tõrge tekib enne raporti loomist, ütleb terminal seda ja palub saata
`PEATATUD`-rea; mõne varasema jooksu raportit ei pakuta selle asemel.
Päevikuid, varukoopiaid ja varasemaid raporteid ei kustutata.

Teadmata SQL-i tulemus kontrollitakse lugemisega; kirjutust automaatselt ei
korrata. Jätkamise otsus tehakse selle jooksu raporti põhjal.

Täielik teostus ja tõendipiir: `SERVICE_ACTIVITY_20261111.md`.
Eelmine vastuvõtt: `SERVICE_STORE_CATEGORIES_ACCEPTED_20261111.md`.
