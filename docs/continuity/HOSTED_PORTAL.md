# Foto lisamine olemasolevale kuulutusele

Seis: 06.11.2026 Europe/Tallinn. Üks autoriteetne seisukirje on
[CURRENT_STATE.json](CURRENT_STATE.json). See muudatus on ette valmistatud;
Maci rakendus, uus commit/push, Verceli deployment ja kasutaja uus fotokatse
kinnitatakse eraldi pärast alloleva uuendaja käivitamist.

## Mis lisandub

Kuulutuse muutmisvaate piltide juurde lisandub **Lisa foto**. Lisada saab ühe
JPEG-, PNG- või WebP-foto korraga, kuni 25 MiB; galeriis saab olla kuni kümme
fotot. Senised fotod ja põhipilt säilivad. Kui kuulutusel pole veel ühtki
fotot, saab esimene lisatud foto põhipildiks.

Sama pilditöötlus teenindab uue kuulutuse avaldamist ja hilisemat foto lisamist.
Foto lisamine ei salvesta pooleliolevaid teksti- ega hinnamuudatusi. Kui võrgu
vastus jääb teadmata, saab kontrollida ja jätkata sama lisamist.

## Üks uuendamiskäsk

1. Laadi alla **selqiro-foto-lisamine-20261106.zip**.
2. Ava ZIP topeltklõpsuga. Downloads-kausta peab tekkima
   **selqiro-foto-lisamine-20261106**, mille sees on **uuenda.py**.
3. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-foto-lisamine-20261106/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat töökausta `/Users/taivo/selqiro`, haru `main`,
HEAD-i, tööpuud ja indexit, kõiki teadaolevaid lähtefaile ning kinnitatud
remote'i `https://github.com/Taivo17/selqiro.git`. Terminaliviiba kaustanimest
sihti ei tuletata. Eelmise vastu võetud paranduse täpne commit loetakse selle
olemasolevast kohalikust tulemuspäevikust ja kontrollitakse sõltumatult selle
Giti vanemat, puud ning faili sisu. Vastuvõtudokumente ei eeldata Macis juba
rakendatuks; need tulevad selle pakiga kaasa.

Seejärel kontrollitakse olemasoleva Supabase'i täpset skeemi, rakendatakse
läbivaadatud muudatus, kontrollitakse tulemust, lisatakse failid, tehakse build
ning üks commit ja tavaline push. Uut projekti ega kontosüsteemi ei looda.
Paigaldaja ei käivita foto üleslaadimist, kuulutuse muutmist ega failikoristust.

Kui kuvatakse `PEATATUD`, säilita väljund ja raport. Lähtefaili või andmebaasi
erinevust ei parandata käsitsi räsikaitsest möödudes. Kui SQL-i vastus katkeb,
kontrollib sama uuendaja jätkamisel tegelikku lõppseisu enne võimalikke
järgmisi samme; SQL-i ei käivitata teadmata tulemuse tõttu pimesi uuesti.

## Vercel ja üks tegelik kasutuskatse

Pärast terminali `VALMIS` tulemust oota Vercelis **sama uue commit'i**
`Ready / Production` tulemust ja värskenda portaali.

1. Ava olemasolev enda kuulutus muutmisvaates.
2. Vali **Lisa foto**, vali üks foto ja vajuta **Lisa kuulutusele**.
3. Veendu, et uus foto lisandus ning senised fotod ja põhipilt jäid alles.
4. Ava kuulutus tavavaates ja kontrolli, et uus foto on galeriis.

Varem vastu võetud foto eemaldamise ja koristuspaneeli kadumise katseid selle
jaoks uuesti ei nõuta. Uue foto saab soovi korral põhipildiks valida sama
olemasoleva tegevusega.

## Säiliv avaliku avamise nõue

Koristuse tehnilised paneelid jäävad praegu testimiseks nähtavaks. Foto lisamise
järel võib SOURCE-algfail vajada senist lõpetamist; uus veebipilt on eraldi.
Automaatne koristus ilma omaniku leheta ja tehniliste paneelide eemaldamine
tavakasutaja vaatest on endiselt avaliku avamise eelne töö.

06.11 kasutaja vastu võetud kuulutuse 201 koristustulemus säilib ajaloos.
Selle tõend ei määra käesoleva uue paketi commit'i ega deployment'i.
