# Teenuste fotovaliku ja profiililoendite parandus — r2

Seis: 09.11.2026 Europe/Tallinn. Üks praegune seis on CURRENT_STATE.json-is.

Ainult lugemise kontroll on lõpetatud ja selle raport vastu võetud. Esimese
paranduspaki peatus tulenes kohaliku kontrollaluse kahest taastamisveast.
Mõlemad on nüüd algallika ning tegeliku tabelikirjeldusega täpselt seletatud.
R2 kasutab parandatud kontrollalust ning sama varem kontrollitud rakendusmuudatust.

## Üks järgmine käsk

Paki **selqiro-teenuste-parandus-20261109-r2.zip** Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-teenuste-parandus-20261109-r2/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat /Users/taivo/selqiro hoidlat, tegelikku haru,
HEAD-i, tervet indexit/lähtepuud ja kinnitatud remote’i. Ta kasutab sama olemasolevat
Supabase’i projekti ja lukustatud CLI-d, kontrollib teadaolevat algseisu, rakendab
kolme lugemisfunktsiooni muudatuse ning kontrollib tulemust. Alles seejärel
kirjutatakse varundatud lähtefailid, tehakse build ning piiratud commit ja push.
Sõltuvuste uut installi ega teenuste uuesti ühendamist pole vaja.

## Kui töö peatub

Kui raport on olemas ja kontrollitud, on terminalis **SAADA SEE FAIL:** koos
täpse JSON-faili asukohaga ning Finderis valitakse sama fail. Lisa see vestlusse. Raporti koopia saab unikaalse nime
Downloads-kaustas; algne päevik ja varasemad failid säilivad. Kui koopiat teha
või Finderit avada ei õnnestu, annab terminal kontrollitud asukoha. Kui raport
jäi loomata või selle päritolu ei saanud turvaliselt kontrollida, ütleb terminal
seda ning palub saata PEATATUD-rea. Viimase säilinud,
kuid võimalik, et vananenud raporti kohta näidatakse eraldi märkus.

## Pärast edu

Oota Vercelis **terminalis näidatud sama uue commit’i Ready / Production** tulemust
ning värskenda portaali. Seejärel kontrolli ainult muudetud kasutusteed:

1. Vali „Lisa teenus” vormis foto: eelvaade ja loendur peavad kohe muutuma.
   Ühe olemasoleva teenuse „Muuda” vaates lisa foto, salvesta ja kontrolli
   avalikku pilti. Olemasolevaid fotosid ei ole vaja eemaldada.
2. Vaata Minu alas ja profiilil, et viimati loodud teenus on ees ning kirjeldus
   võtab kuni kaks rida. Detailis säilib kogu tekst.
3. Ava profiili ühises kuulutuste loendis tavakuulutus ja hobune ning tule tagasi.
   Filter, lehekülg ja kerimiskoht peavad säilima. Üle 24 tulemuse korral vaata
   ka järgmist lehekülge.

Varem vastu võetud teenuse teksti/olekute ning hobuse galerii katsed kehtivad.
Lõpetatud diagnostikat ja vanu paigaldajaid ei käivitata uuesti. R2 uus SQL ei
muuda kasutajaridu, rubriigitabeleid ega nende õigusi; Storage’i kustutust ei tee.
Vana paranduspakk, selle peatunud päevik ning diagnostika raport jäävad alles.

Poerubriigi määramine praeguses muutmisvaates, hobuste/teenuste rubriigimudel,
üldine automaatne koristus ja tehniliste testpaneelide eemaldamine enne avalikku
avamist jäävad eraldi tööks. Energy, maksete tuum ja piiratud AI järgnevad
kokkulepitud V2 ulatuse sees.
