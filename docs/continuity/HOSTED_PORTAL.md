# Poe rubriigiseoste õiguste parandus — uus ettevalmistatud tarne

Seis: 10.11.2026 Europe/Tallinn. Üks praegune seis on
`docs/continuity/CURRENT_STATE.json`; loetav üleandmine genereeritakse sellest.
Senine rubriikide lisamise, nimevahetuse, seostamise ja eemaldamise etapp on
kasutaja poolt vastu võetud. Vana paigaldajat ei korrata.

## Üks uus käsk

Laadi alla `selqiro-poerubriikide-oigused-20261110.zip` ja paki selle kaust
Downloads-kausta. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-poerubriikide-oigused-20261110/uuenda.py" --publish
```

Siht on olemasolev `/Users/taivo/selqiro`, `main`, kinnitatud Selqiro remote
ja täpne vastu võetud `0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a` alus.
Uuendaja kontrollib edukat privaatset alusraportit, tegelikku haru/HEAD-i,
indexit, tööpuud ja lähtefaile enne kirjutusi. Paketis olevaid faile ei muudeta.

## Mida uuendaja teeb

1. Loeb andmebaasi praeguse õiguste seisu ilma seda muutmata.
2. Rakendab uue kliendi ja dokumendid, teeb build'i ning commit/push'i.
3. Kontrollib olemasoleval portaalil uue kliendi täpset avalikku märgistusfaili.
4. Kontrollib uuesti allikat, remote'i ja märgistusfaili ning rakendab alles
   seejärel rubriigiseoste vana otsekirjutusõiguse sulgemise. Loeb tulemuse eraldi.

Kuulutusi, rubriike, pilte, kontosid ega päevikuid selle uuendusega ei kustutata.
Kaks vana vormi kasutavad sama olemasolevat õigusi kontrollivat salvestust.
Rubriikide vea või teadmata tulemuse järel saab olemasoleva kuulutuse tegeliku
valiku üle vaadata eraldi rubriigivaates; sama kuulutust uuesti avaldada pole vaja.

## Kui veebiversioon alles valmib

`OOTEL: WAITING_FOR_CLIENT_DEPLOYMENT` tähendab, et kontrollitud lähtekood
on commit'itud ja üles lükatud, kuid avalik kliendimärk pole veel kinnitatud.
Esimesel sellisel ootamisel pole õigusteparandust veel rakendatud.
Oota veebiversiooni valmimist ja käivita **sama käsk** uuesti.

Jätk kontrollib sama allikat, commit'i, remote'i ja päevikut. Lõpetatud build'i,
commit'i ega push'i ei korrata. Ajalooline andmebaasi seis säilib raportis ka siis,
kui katkestus toimus hiljem. Ebaselget SQL-i tulemust ei lahendata kordussaatmisega.
Muu `PEATATUD` ei ole sama mis tavaline veebiversiooni ooteolek.

## Milline fail vestlusse lisada

Terminal näitab lõpus **`SAADA SEE FAIL:`** ja selle jooksu unikaalse JSON-faili
täpset teed Downloads-kaustas. Macis valitakse sama fail Finderis.
Lisa vestlusse see fail; `PEATATUD` korral lisa ka peatamisrida.
Kui koopia või Finder ebaõnnestub, näitab uuendaja täpset olemasolevat raportit
või ütleb, et faili ei tekkinud. Vanad päevikud säilivad.

## Tõendipiir ja järgmine kontroll

See pakk on ette valmistatud ja kohalikult kontrollitud; uus tegelik Maci,
commit/push'i, andmebaasi ja portaali seis tuleb uuendaja raportist.
Avaliku märgi vaatlus ei ole Verceli Ready/API/deployment-ID kviitung.
Pärast lõpetatud uuendust värskenda portaali, et avatud vaheleht kasutaks uut koodi.
Seejärel kontrollitakse vajaduse korral ainult muudetud vana vormi salvestusteed.
Varasemat halduse kasutuskatset ega selle Verceli kuvatõmmist ei küsita uuesti.

Täpsed kohalikud kontrollid ja piirid:
`docs/continuity/STORE_CATEGORY_AUTHORITY_20261110.md`.
