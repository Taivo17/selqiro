# Eemaldatud foto koristuse kontrollpäringu parandus

Seis: 06.11.2026 Europe/Tallinn. Autoriteetne seis on
[CURRENT_STATE.json](CURRENT_STATE.json).

## Mida uus raport näitas

Kuulutuse 201 varasema foto eemaldamiskäsk jõudis teenuseni, kuid järgnev
lugemine tagastas veel sisu. Päris raportis on koristus `retry_wait / try_count2 /
last_error=response`; vastava objekti, upload’i ja osade metaandmed puuduvad.
Lõpetamiskinnitus ning 4 MiB loogilise reservi vabastus on veel ootel.

Üks serverimoodul lisab puudumise kontrollile värske juhusliku `cacheNonce`-i.
Olemasolev SQL, õiguskontroll ja püsiv puudumistõend jäävad kasutusse.
See uuendaja ei käivita SQL-i ega Storage-API-t. Varasemaid paigaldajaid
ja juba tehtud lugemisdiagnostikat ei korrata.

## Üks järgmine käsk

Laadi alla **selqiro-koristuse-parandus-20261106.zip** ja paki see Downloads-kaustas
lahti, nii et seal on kaust `selqiro-koristuse-parandus-20261106`.
Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-koristuse-parandus-20261106/uuenda.py" --publish
```

Vaikimisi hoidla on `~/selqiro`. Uuendaja kontrollib tegeliku haru, täieliku
HEAD-i `b482c02c675c9d6a5a575ece7edc806151df918e`, puhta tööpuu, kogu 1019-failise
indexi, lähteräsid ja kinnitatud remote’i enne kirjutusi. Muudetavad failid
varundatakse uude päevikukausta; seejärel rakendatakse väike koodidelta koos
katsete/dokumentidega, tehakse build, üks commit ning tavaline push.

`PEATATUD` korral saada kood ja selle jooksu `result.json`; säilita töö ja päevikud.
Tundmatut või muudetud lähtebaasi ei kirjutata üle.

## Päris vastuvõtt

1. Oota Vercelis **uuendaja väljundis nimetatud uue commit’i** `Ready / Production`
   tulemust. Vana `b482c02` Ready-rida ei tõenda paranduse avaldamist.
2. Värskenda sama identiteedi all kuulutuse 201 muutmisvaadet.
3. Vajuta olemasoleva eemaldatud foto juures **Korista järgmine fail** üks kord.
4. Serverist loetud null peab peitma eemaldatud fotode koristuspaneeli;
   kaks allesjäänud fotot ja praegune põhipilt peavad säilima. Kontrolli seisu
   värskendus ei tohi paneeli tagasi tuua.

Selleks pole vaja uut fotot ega kuulutust eemaldada. Kui paneel pärast seda
endiselt ühe faili näitab, saada tulemus; järjestikused kordusvajutused pole
uus diagnoos. Tegelik4 MiB vabastus sõltub endiselt serveri lõpetamistõendist,
mitte ainult HTTP-vastusest või paneeli peitmisest.

## Avaliku avamise piir

Praegu võib tehniline paneel testimiseks nähtav olla. Enne avalikku kasutust
peab koristus edenema nupuvajutusest ja avatud omanikuvaatest sõltumata ning
tehnilised koristusloendurid kaovad tavavaatelt. See väike parandus ei lisa
uut koristusmehhanismi ega tõenda kogu fotode elutsükli valmimist.
