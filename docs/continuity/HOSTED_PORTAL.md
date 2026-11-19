# Enda sõnumimulli kontrasti parandus

18.11.2026. Alus on vastu võetud commit 413e8fc.
Enda sõnumid saavad tumerohelise tausta, valge teksti ja heleda kellaaja.
Vastaspoole mull jääb helehalliks tumeda tekstiga. Sõnumis oleva pakkumise
kollane, türkiissinine või sinine kaart säilib tervikuna avatava lingina.

## Üks käsk

Laadi selqiro-tumeda-sonumimulli-parandus-20261118.zip alla ja ava see Downloads-kaustas.
Käivita Terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-tumeda-sonumimulli-parandus-20261118/uuenda.py" --publish
```

Uuendaja kontrollib olemasolevat /Users/taivo/selqiro hoidlat, main-haru,
täpset 413e8fc lähtepuud, indexit ja kinnitatud remote’i. Eelmise õnnestunud
sõnumite/kaartide paranduse originaalraport säilib lugemisluku all.
Muudatus katab ühe CSS-faili ja järjepidevuse dokumendid. Seejärel tehakse
üks täielik build ning kinnitatakse commit/push. Andmebaasi või Storage’i
toiminguid ei tehta. Varasemaid paigaldajaid ja lõpetatud katseid ei korrata.

## Pärast käsku

Saada selle jooksu täpne fail, mille rada algab Terminalis sõnadega
SAADA SEE FAIL. Finder näitab sama faili. Kui uut raportit ei saanud luua,
saada prinditud STOP-rida.

Vercelis oota uue commit’i Ready / Production olekut. Värskenda portaali
ja ava olemasolev vestlus: paremal on sinu tumeroheline mull valge kirjaga,
vasakul vastaspoole helehall mull tumeda kirjaga. Kellaaeg peab olema
loetav ka tumedal mullil. Uut kuulutust ega kontrollsõnumit pole vaja luua.

## Kohalik kontroll ja tõendi piir

Ühe CSS-faili lähteülevaatus ja täielik Next.js/TypeScript build läbisid;
729 build’i sisendi räsi ei muutunud. Arvutatud enda teksti kontrast on
6,48:1 ja heleda kellaaja kontrast 5,20:1. Uuendaja piiratud kontrollide
tulemused on kontrollid/ kaustas.

Brauseri visuaalne kontroll on BLOCKED: eelmine katse tuvastas executori
Chromiumi käivituspiirangu ja pilvebrauseri kohaliku file-URL-i turvakeelu.
Piirangut ei proovitud vältida ega korduskatset tehtud. Uue tumeda
kujunduse tegelik välimus vajab pärast avaldamist kasutaja kinnitust.
Kohalik build ei tõenda Maci käivitust, push’i ega uut Verceli väljastust.

Eelmise 413e8fc jooksu raport ja sama commit’i Ready / Production pilt
on vastu võetud. Need tõendid kuuluvad eelmisele, heledale kujundusele.
