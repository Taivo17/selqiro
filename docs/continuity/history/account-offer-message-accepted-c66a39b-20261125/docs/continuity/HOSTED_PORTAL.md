# Selqiro praegune tööjärg

24.11.2026 Europe/Tallinn. Vastu võetud tootmise alus: **908a457**.

## Pakkumise link sõnumis

Teksti ja piltide saatmine on kasutaja kontrolli järgi korras. See uuendus ühtlustab pakkumiskaardi käitumise tavakuulutustes, hobusekuulutustes, teenustes ja tööpakkumistes.

Iga pakkumise juurest kontakti avamine lisab kaardi järgmisele sõnumile. Sama pakkumise uuesti avamine lisab selle uuesti. Enne saatmist saab kaardi eemaldada. Pärast edukat saatmist on järgmised tekstid, pildid ja vastused ilma automaatse korduskaardita. Vestluse päises on viimati tegelikult jagatud pakkumise nimi ja klõpsatav link.

Paki **selqiro-sonumite-pakkumise-link-20261124.zip** Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-sonumite-pakkumise-link-20261124/uuenda.py" --publish
```

Saada selle käigu **SAADA SEE FAIL** real nimetatud JSON-fail. Kui käivitaja peatub, saada sama raport; ära korda vanu pakette.

Paigaldaja kontrollib täpset lähteallikat, teeb sihitud klienditestid ja ühe värske build'i. Seejärel kontrollib ta andmebaasi eelseisu, rakendab ühe kaitstud SQL-tehingu, kontrollib tulemust eraldi ning avaldab lähtekoodi.

Uue commit'i pealkiri: **Share offer cards only on explicit enquiry**. Oota Vercelis selle sama commit'i **Ready / Production** tulemust ja värskenda avatud portaali vahelehed.

## Kontroll pärast avaldamist

Kasuta kahte olemasolevat oma testkontot. Tee järgmine kontroll tavakuulutuse, hobusekuulutuse, teenuse ja tööpakkumisega:

1. Ava pakkumine ja vali kontakti võtmine. Kirjutamise juures on õige pakkumise eelvaade ja Eemalda.
2. Saada üks sõnum. Kaart on selle sõnumi juures ning päises on sama pakkumise klõpsatav nimi.
3. Saada järgmine tekst ja pilt ning vasta teise konto alt. Automaatselt uut pakkumiskaarti ei lisandu.
4. Ava sama pakkumine uuesti ja vali kontakti võtmine. Kaart tuleb järgmisele sõnumile uuesti kaasa.
5. Ava teine pakkumine. Eelvaade üksi päist ei muuda. Kui eemaldad eelvaate ja saadad teksti, jääb päisesse eelmine jagatud pakkumine. Kui saadad teise pakkumise kaardi, näitab päis seda uut pakkumist.

Sama tootmiskoodi avaldamine ja päris brauseri kontroll on eraldi kohalikust koostamisest ning isoleeritud katsetest. Uut eraisiku töökuulutust pole vaja luua, kui olemasolev ettevõtte tööpakkumine sobib katseks.

Järjekord pärast parandust: **kontoelutsükkel → jälgitavate poodide/profiilide Uudised → esiletõstmine → reklaamid**.
