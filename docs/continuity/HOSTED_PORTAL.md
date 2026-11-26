# Järgmine samm: töökoha ja tööotsa otsingu valikud

26.11.2026. Eelmine töökuulutuse muutmise pakett `2b3407f` on vastu võetud.
Uus pakett on `selqiro-too-otsingu-valikud-20261126.zip`. Laadi alla ja paki Downloads-kaustas lahti.
Käivita olemasoleva Selqiro projekti terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-otsingu-valikud-20261126/uuenda.py" --publish
```

Pakett kontrollib täpset lähtealust, puhast tööpuud/indexit, remote main'i,
eelmist originaalraportit, olemasolevaid sõltuvusi ning Supabase CLI/projekti.
Seejärel rakendab määratud failid, käivitab sihitud klienditestid ja värske
Next build'i. Andmebaasi eelseisu järel lisab üks tehing ainult tööotsingu
koondvaliku; COMMIT-järgset kinnitust kontrollitakse eraldi järelpäringuga.
Ainult kinnitatud tulemuse järel tehakse määratud failidest commit ja push.

Lõpus saada siia selle käigu JSON-raport realt `SAADA SEE FAIL:`; sama fail
valitakse Finderis. Kui käik peatub, saada raport ning ära korda käsku enne
põhjuse selgitamist. Kinnitamata andmebaasikirjutust ei korrata automaatselt.

Pärast edu kontrolli sama uut commit'i Vercelis Ready / Production seisus.
Töö lehel kontrolli kahte suunda, „Kõik pakkumised”, lisafiltreid ja tagasi
otsingusse naasmist. Olemasolev „Muruniiduki operaator, haljastaja” peab
olema töökohtade hulgas ja tööotsade hulgast puuduma. Kui tööotsi praegu pole,
on tühi tööotsade tulemus õige; testi pärast pole vaja uut avalikku pakkumist luua.

Asukohaväli kasutab selles sammus veel senist linnavastet ja ütleb seda
kasutajale. Ülemaailmset lähimad-enne otsingut see pakett ei aktiveeri.
Selle järgmise töö alus on `docs/architecture/location-search-20261126.md`.

Vastu võetud alus: `2b3407fee17f4d19594ce45647a1739b26249835`, puu `b6543039421cd86f4227d18f65edde1ca06e8a05`.
