# Selqiro praegune tööjärg

24.11.2026 Europe/Tallinn. Vastu võetud tootmise alus: **e336a5b**.

## Üks järgmine samm

Parandatud suhtluse metaandmete kontroll on edukalt lõpetatud. Uus kirjutav pakett lisab konto kättesaadavuse kontrolli uutele kontaktidele ja sõnumitele.

Paki **selqiro-suhtluse-konto-olek-20261124.zip** Downloads-kaustas lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-suhtluse-konto-olek-20261124/uuenda.py" --publish
```

Saada selle käigu **SAADA SEE FAIL** real nimetatud JSON-fail. Peatumisel saada sama raport; ära käivita vanu pakette ega korda ebaõnnestunud andmebaasikirjutust.

Edu korral peab raportis olema üks kinnitatud SQL rakendamine, eraldi järelkontroll ning uus commit/push. Oota Vercelis selle sama commit-i **Ready / Production** tulemust.

Uue commit-i pealkiri: **Respect account availability in contact and message writes**.

Seejärel kontrolli olemasolevate testkontodega vana vestluse avamist, aktiivse avaldajaga kontakti loomist ning ühe uue sõnumi saatmist. Uut eraisiku töökuulutust ei ole selleks vaja luua. Konto sulgemise nuppu see pakett ei lisa.

Ettevalmistuse SQL katsed, Maci rakendamine, Verceli deployment ja tegelik veebikontroll on eraldi tõendid. Loe `docs/architecture/account-contact-write-fence-v1.md`.

Järjekord: **kontoelutsükkel → jälgitavate poodide/profiilide Uudised → esiletõstmine → reklaamid**.
