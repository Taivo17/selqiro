# Selqiro praegune tööjärg

24.11.2026 Europe/Tallinn. Vastu võetud tootmise alus: **8b7db90**.

## Järgmine uuendus

Sõnumite ja kontaktide konto-oleku uuendus on vastu võetud. Kasutaja kinnitas sõnumite toimimist. Järgmine pakett lisab sama konto kontrolli vestluste ja pildimanuste allesjäänud kirjutamisteedele.

Paki **selqiro-vestluste-ja-manuste-konto-olek-20261124.zip** Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-vestluste-ja-manuste-konto-olek-20261124/uuenda.py" --publish
```

Saada selle käigu **SAADA SEE FAIL** real nimetatud JSON-fail. Kui skript peatub, saada sama raport; ära käivita vanu pakette ega korda tundmatu tulemusega andmebaasikirjutust.

Paigaldaja kontrollib täpset lähteallikat ja koostab portaali värskelt. Seejärel kontrollib ta andmebaasi eelseisu, teeb ühe kaitstud SQL-tehingu, kontrollib tulemust eraldi ning alles siis avaldab lähtekoodi.

Uue commit'i pealkiri: **Respect account availability in conversation and photo writes**. Oota Vercelis selle sama commit'i **Ready / Production** tulemust.

Seejärel ava olemasolev vestlus teise oma testkontoga ning kontrolli üht tekstisõnumit ja üht pildiga sõnumit. Vaata teise konto alt, et pilt avaneb ja varasem ajalugu on alles. Uut eraisiku töökuulutust selleks vaja ei ole.

See pakett valmistab ette konto sulgemise tervikut. Konto sulgemine ja taastamine pole veel kasutajale aktiveeritud. Andmebaasi isoleeritud katsed, Maci rakendamine, Verceli tulemus ning päris kasutuskontroll on eraldi tõendid.

Järjekord: **kontoelutsükkel → jälgitavate poodide/profiilide Uudised → esiletõstmine → reklaamid**.
