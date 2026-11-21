# Suurem oma profiilipilt vestluste loendis

21.11.2026. Vastu võetud alus on `eb29922`: profiilipildi sobitamise uuendus on kasutaja raporti ja sama commit’i Ready / Production ekraanipildi järgi avaldatud. Kasutaja piltidel on näha sobitatud ja salvestatud profiilipilt ning suuremad vastaspoole pildid sõnumites.

## Selle paranduse tulemus

- Vestluste loendi **Postkast** rea oma profiilipilt: **40 × 40 px**.
- Vastaspoole profiilipilt loendis ja päises: **56 × 56 px**, telefonivaates **48 × 48 px**.
- Avatud vestluse all **Saadad kui** rea oma profiilipilt: **24 × 24 px**.

Muudatus on üks loendiga piiratud CSS-reegel. Pildifailide, sõnumite ega profiiliandmete muutmist see ei tee.

## Käivitamine

Ava `selqiro-postkasti-profiilipilt-20261121.zip` Downloads-kaustas ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-postkasti-profiilipilt-20261121/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat lähtekoodi, indeksit, remote’i ja eelmise eduka käigu originaalraportit. Seejärel käivitab build’i ning teeb piiratud commit’i ja push’i. Uue commit’i pealkiri on **Enlarge the current profile avatar in the conversation list**.

Saada lõpus **SAADA SEE FAIL** juures näidatud uus raport. Oota Vercelis **sama uue commit’i** `Ready / Production` tulemust ja värskenda vestluste loendit.

## Kontrollide piir

Pakett sisaldab kohaliku build’i, täpse muudatuse ülevaatuse ja uuendaja kontrollide tõendeid. Uusi rakenduse ühikteste väikese CSS-muudatuse jaoks ei lisata. Varasema profiilipildi sobitamise 17/17 testi ja build on vastu võetud eelmise Maci raporti alusel, neid ei esitata uue käigu testidena. Uut päris brauseri kasutuskatset siin ei väideta.

Uuendust ei ole selle juhendi koostamise ajal kasutaja eest avaldatud. Peatumisel saada täpne uus raport või raporti puudumisel **PEATATUD** rida. Varasemaid uuendajaid ega SQL-käske pole vaja korrata.
