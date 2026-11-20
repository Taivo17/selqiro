# „Minu profiil” — teksti- ja asukohaandmete muutmine

20.11.2026. Vastu võetud alus on `d654033`. Selle lugemisprivaatsuse parandus on lõpetatud. Uus salvestamise kataloog koguti edukalt kell 19:31 Eesti aja järgi ja kinnitab sama lähtebaasi.

## Käivitamine

Ava `selqiro-minu-profiil-20261120.zip` Downloads-kaustas. Käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-minu-profiil-20261120/uuenda.py" --publish
```

Pakett kontrollib varasemat edukat privaatsusraportit, viimase koguja algseid faile ja ZIP-i, tervet lähtepuud, indeksit, remote’i, olemasolevat CLI-d ja andmebaasiseisu. Seejärel rakendab ta läbivaadatud failid, käivitab rakenduse testid ja build’i ning teeb ühe piiratud SQL-tehingu. Alles sõltumatu järelkontrolli järel tehakse commit ja push.

Säilita varasemad paketid, algsed raportid ning `Downloads/selqiro-recovery` all olev viimane tulemuskaust ja ZIP. Vanu uuendajaid ega kogujat pole vaja uuesti käivitada. Koguja manifest asub ZIP-is; seda ei pea eraldi looma.

## Pärast käiku

Saada terminalis `SAADA SEE FAIL` juures näidatud uus raport. Kui terminal näitab commit’i, oota Vercelis **sama commit’i** `Ready / Production` tulemust ja värskenda portaali.

„Minu alas” avaneb uus **Minu profiil**. Seal saab muuta avalikku nime, kirjeldust, veebilehte ning riiki ja linna/piirkonda. Ettevõttel on ka vabatahtlik avalik külastusaadress. Nime muutus peab olema näha avalikul profiilil ja profiilivalikus. Eraisiku vorm ei küsi täpset koduaadressi.

Profiilipiltide ja logode lisamise/asendamise lahendus on järgmine tööetapp. Praegune vorm ei muuda olemasolevaid pilte. Sõnumite profiililink, lihtsam registreerimine, konto sulgemine ja reklaami iseteenindus tulevad eraldi.

## Kui käik peatub

Saada uus raport või raporti puudumisel terminali `PEATATUD` rida. Ebaselge SQL-vastuse korral kirjutust automaatselt ei korrata. „Valmis” tähendab ainult raportis kontrollitud samme; Verceli ja brauseri tulemus võetakse eraldi vastu.

Uus pakett pole selle juhendi ettevalmistamise ajal kasutaja Macis käivitatud. Varasemate peatunud katsete ajalugu on säilinud, kuid praegune alus on nende järel edukalt vastu võetud `d654033`.
