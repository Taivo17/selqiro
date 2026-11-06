# Selqiro portaal — eemaldatud foto lõppkoristus

Seis: 06.11.2026 Europe/Tallinn. Autoriteetne seis on
[CURRENT_STATE.json](CURRENT_STATE.json); loetav üleandmine genereeritakse sellest.

## Viimane vastu võetud tulemus

Kuulutusel 201 eemaldati kinnitusega üks lisafoto, kaks fotot jäid alles ja
Mercedes määrati põhipildiks. Sama põhipilt ilmus otsingukaardile. Kasutaja
kinnitas toimimist; terminali commit oli
`69ca43454857d3f742aea35faa57cfecf57b7cf1` ja Verceli pildil oli sama prefiksiga
`main / Ready / Production`. Fotoeemalduse ja varasema algfotokoristuse
paigaldajaid ega juba vastu võetud kasutuskatseid ei korrata.

## Käesolev üks samm

Uus pakett lisab ühe juba galeriist eemaldatud WEB-foto lõppkoristuse.
Olemasolev päevik, ühe objekti transport ning ruumiarvestus jäävad kasutusse.
Sama objekti reserv vabaneb alles siis, kui eemaldamise tulemus ja teenuseobjekti
puudumine on kinnitatud. Aktiivsed fotod ja praegune põhipilt säilivad.

Uue sammu lähtekood ja kohalikud kontrollid on ette valmistatud. See ei tõenda
uut Maci paigaldust, pilveandmebaasi muudatust, commit/push'i, Vercelit ega
päris faili puudumist. Nende järgmine kontrollitav tee on allpool.

## Laadi alla, paki lahti ja käivita üks käsk

Laadi alla `selqiro-eemaldatud-fotode-koristus-20261106.zip` ja paki see
Downloads-kaustas lahti. Seal peab tekkima kaust
`selqiro-eemaldatud-fotode-koristus-20261106`, milles asub `uuenda.py`.
Lahtipakkimata ZIP-is olevat skripti Python selle käsuga ei ava.

```bash
python3 -I -B "$HOME/Downloads/selqiro-eemaldatud-fotode-koristus-20261106/uuenda.py" --publish
```

Uuendaja kasutab sama kontrollitud hoidlat (`~/selqiro` vaikimisi) ja
olemasolevat Supabase'i ühendust. Terminaliviiba kaustanimi ei vali sihti.
Tegelik haru, HEAD, kogu index/tööpuu, lähtefailid ja kinnitatud remote
kontrollitakse enne kirjutusi värskelt. Viimane vastu võetud commit on ainult
esivanema kontroll; see ei asenda tegeliku seisu lugemist.

Uus SQL-tugi paigaldatakse enne rakenduskoodi. Seejärel rakendatakse piiratud
delta, tehakse build ning täpne commit ja tavaline push. Paigaldaja ei käivita
faili koristust ega Storage DELETE-i. Olemasolevad päevikud ja kasutaja töö
säilivad. 05.11 vastuvõtudokumentide muudatused on uues deltas kaasas; nende
old-räsid lähtuvad viimasest muutmata väljastatud lähtebaasist.

Kui ilmub `PEATATUD`, säilita töö ja päevikud ning saada peatumisrida koos
samal real nimetatud `result.json` raportiga. Tundmatut kirjutust ei korrata
pimesi ja lähte- või SQL-kaitseid ei eemaldata.

## Sama commit veebis ja üks kitsas katse

1. Oota Vercelis just terminalis väljastatud uue commit'i `Ready / Production`
   tulemust ja värskenda portaali.
2. Ava Taivo Garaaži olemasoleva kuulutuse 201 muutmisvaade. Eelmises vastu
   võetud katses jäi sinna kaks fotot ning üks eemaldatud foto ootab lõppkoristust.
3. Testimiseks on eraldi plokk **„Eemaldatud fotode koristamine”**. Ootel ühe
   faili korral vajuta üks kord **„Korista järgmine fail”**.
4. Värske kinnitatud nullseisu korral plokk kaob. Samad kaks fotot ja praegune
   põhipilt peavad alles jääma. Uut fotot pole selle katse jaoks vaja eemaldada.

Nupp töötleb kuni ühe sobiva objekti. Senine SOURCE-koristus on esimesena;
ainult selle tühja claim'i järel proovitakse varem eemaldatud WEB-i.
Kuulutuse 201 senine SOURCE-loendur oli juba null. Värskendamine ja lehe avamine
loevad seisu ega käivita koristust. Kui kuvatakse kontrollimist vajav või
kinnitamata tulemus, ei loeta faili ega reservi veel vabastatuks.

Nullseis on olemasoleva päeviku ja teenusemetaandmete põhine Selqiro loogiline
arvestus. See ei tähenda teenusepakkuja varjatud ketaste või arve kontrolli.

## Avaliku avamise piir

Tehnilised plokid võivad testimise ajal jääda nähtavaks. Enne avalikku avamist
peab koristus edenema kasutaja nupuvajutusteta ning avatud omanikuvaatest
sõltumata; tehnilised loendurid ja koristusnupud kaovad tavavaatest. Käesolev
samm ei lisa püsivat ajastajat. Ainult paneeli peitmine ei täida nõuet.

Fotode lisamine/asendamine, katkiste üleslaadimiste ning teiste terminalsete
WEB-objektide koristus järgnevad eraldi väikeste sammudena. Täpne käesolev
leping on [hosted-retired-web-cleanup-v1.md](../architecture/hosted-retired-web-cleanup-v1.md).
