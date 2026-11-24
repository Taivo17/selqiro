# Selqiro praegune tööjärg

24.11.2026 Europe/Tallinn. Vastu võetud tootmise alus on **e336a5b**.
Viimane tööde lugemise pakett on lõpetatud ja seda ei korrata.

## Järgmine samm

Suhtluse kontoõiguste paranduseks vajaliku kitsa metaandme-eelseisu kontroll.
Laadi alla ja paki Downloads-kaustas lahti `selqiro-suhtluse-konto-kontroll-20261124.zip`.
Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-suhtluse-konto-kontroll-20261124/kontrolli.py"
```

Saada siia **täpselt selle käigu** `SAADA SEE FAIL` real nimetatud JSON-fail.
Kontroll valib raporti Finderis. Peatumisel saada sama raport või `PEATATUD`-rida;
ära käivita vanu uuendajaid ega lisa `--publish` lippu.

See käsk teeb ühe ainult lugemise metaandmepäringu ning jätab lähtekoodi,
indexi, kontod ja sisu muutmata. Ta ei tee commit’i, push’i ega Verceli uut build’i.
Konto sulgemine ja uus Uudiste voog pole selle paketiga aktiveeritud.

## Mida saadud raport võimaldab

Pärast raporti kontrolli saab koostada kontakti alustamise ja uue sõnumi saatmise
kontoõiguse muudatuse. Säilitada tuleb aktiivse vestluskaaslase olemasolev ajalugu
ning korduspäringute kviitungid. Metadata kogumise täielikkus ei tõenda veel
muudatuse valmidust; tundmatu pin vajab põhjendatud täpsustust.

Uudiste suure lisamiskoguse jaoks on kavandatud ühe poe plokk kuni nelja
eelvaatega ning sama perioodi „Vaata kõiki” kogu. Kavand on dokumentides,
tootmise lehte pole muudetud.

Tööjärg: **konto elutsükkel → Uudised → esiletõstmine → reklaamid**.
