# Poe rubriikide haldus — järgmine kasutuselevõtt

Seis: 10.11.2026 Europe/Tallinn. Autoriteetne seis on
`docs/continuity/CURRENT_STATE.json`; loetav üleandmine genereeritakse sellest.

## Valmis ettevalmistus

Uus `selqiro-poerubriikide-haldus-20261110.zip` ühendab praeguse Minu alaga
oma ülem- ja alamrubriikide loomise, ümbernimetamise ning lasteta rubriigi
kinnitatud eemaldamise. Eemaldamine jätab kuulutused, pildid ja kirjeldused alles.
Kasutajaliides on inglise ja eesti keeles. Kuulutuse rubriigivalija halduse link
avaneb uuel vahekaardil, et pooleliolev kuulutuse muutmine säiliks.

## Üks käsk

Paki ZIP lahti Downloads-kaustas. Käivita Terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-poerubriikide-haldus-20261110/uuenda.py" --publish
```

Uuendaja leiab eelmise rubriigiseostamise täpse lõpetatud raporti ning kontrollib
tegelikku kinnitatud hoidlat `/Users/taivo/selqiro`, main-haru, HEAD-i, tervet
indexit ja tööpuud, lähtefaile ning remote’i. Varasemaid paigaldajaid ei korrata.
Seejärel kontrollib see olemasoleva andmebaasi eeldusi, lisab ainult uue halduse
RPC, kontrollib tulemust, rakendab täpse lähtepaketi ning teeb build’i, commit’i
ja push’i. Vana töö ja päevikud säilivad. Tuvastamata seisu korral töö peatub.

## Pärast edu

Oota Vercelis terminalis näidatud **sama commit’i** `Ready / Production` tulemust.
Värskenda portaali ning ava **Minu ala → Poe rubriigid**.

Üks lühike kasutuskäik:

1. Loo ajutine ülemrubriik ja selle alla alamrubriik; nimeta alamrubriik ümber.
2. Seo üks olemasolev tavakuulutus selle alamrubriigiga senises rubriigivalijas
   ning vaata tulemust avaliku profiili rubriigifiltris.
3. Eemalda ainult see ajutine alamrubriik halduse eraldi kinnitusega.
   Kontrolli, et kuulutus, kirjeldus ja pildid on endiselt alles ning kuulutus
   on profiili **Kõik kuulutused** vaates nähtav.
4. Eemalda soovi korral nüüd tühjaks jäänud ajutine ülemrubriik.

Alamrubriikidega ülemrubriiki korraga eemaldada ei saa. Uue halduse katseks
pole vaja varasemaid teenuste, galeriide või navigeerimise katseid korrata.

## Kui terminal peatub

Saada **PEATATUD-rida** ja fail, mille täpne asukoht on real **SAADA SEE FAIL:**.
Uuendaja teeb võimalusel privaatsest päevikust unikaalse koopia Downloads-kausta
ning valib sama faili Finderis. Koopia või Finderi tõrke korral näidatakse
kontrollitud originaali/asukohta või öeldakse selgelt, et raportit pole.
Vanu raporteid ja päevikuid ei kustutata. Ebakindlat SQL-i ega kirjutust ei
korrata automaatselt ja kaitseid ei nõrgendata peatumisest möödumiseks.

## Tõendi piir

Kohalik kooste, sihitud kliendi/SQL kontrollid ning English/Eesti desktop/mobile
brauserikäigud on tehtud. Uus halduse SQL, Maci paigaldus, commit/push ja Verceli
väljalase ei ole selle ettevalmistusega tegelikult tehtud. Varasem kuulutuse
rubriigiseoste salvestus ja eemaldamisel kuulutuse säilimine on kasutaja poolt
juba vastu võetud; see eristub rubriigikirjete endi haldusest.

Täpsed kontrollid: `STORE_CATEGORY_MANAGEMENT_20261110.md` ja paki `kontrollid/`.
Pärast tegelikku tulemust uuendatakse seisukirjet, genereeritud üleandmist ja
arenduspäevikut uue deltana; väljastatud ZIP-i varjatult ei muudeta.
