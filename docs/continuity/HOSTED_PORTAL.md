# Foto lisamise parandus

Seis: 07.11.2026 Europe/Tallinn. Üks autoriteetne tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad käsud on ajalugu.

## Kinnitatud lähtealus

Kasutaja r2 diagnostika lõpetas edukalt Python 3.9.6 all. Maci main HEAD on
`a4b5b2d14e456e6e83d4412b839ef330259cd048`; kõik 1081 lähtefaili vastavad
väljastatud foto valimise r2-le. Tracked tööpuu ja index olid enne/pärast
lugemist puhtad ning muutumatud. Andmebaasi vaatlus kinnitab, et avaldatud
algfailide koristuse ootele jäämine põhjustas konto reservi piirangu.

Uus parandus säilitab järgmise foto kohaliku valiku omanikuvaate lugemise ajal
ning ühendab olemasoleva SOURCE-koristuse lisamistoiminguga. Andmebaasi
migratsiooni ega uut teenuseseadistust see tarne ei vaja.

## Üks käsk

1. Laadi **selqiro-foto-lisamise-parandus-20261107.zip** Downloads-kausta
   ja paki lahti. Tekib samanimeline kaust failiga `uuenda.py`.
2. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-foto-lisamise-parandus-20261107/uuenda.py" --publish
```

Paigaldaja kontrollib enne kirjutamist täpset lähtepuud, main-haru, indexit,
kinnitatud remote'i ja lähtecommit'i. Muudetavatest failidest tehakse varukoopia.
Seejärel tehakse build ning piiratud commit ja push samasse olemasolevasse
hoidlasse. Eelmisi paigaldus- ega diagnostikaprogramme ei käivitata uuesti.
`PEATATUD` korral säilita teade ja raport ning saada need vestlusse.

## Üks kasutuskatse pärast Ready tulemust

Oota Vercelis terminalis näidatud uue commit'i **Ready** tulemust ja värskenda
portaali. Ava kuulutuse 201 muutmisvaade ning lisa üks uus foto. Kontrolli,
et valitud foto eelvaade ilmub, uus foto jõuab galeriisse ja on nähtav ka
avalikus kuulutuses. Vana ruumipuuduse teate korral vali esmalt
„Katkesta lisamine” ja seejärel „Lisa järgmine foto”. Mõõda võimalusel lisamise aeg.

Kui konto reserv enne lisamist ei mahu, võib selle esimene katse sisaldada
ühe varasema lõpetatud algfaili koristust. Edaspidine vastusejärgne koristus
ei pea takistama juba kinnitatud foto kuvamist. Tegelik kiirus kinnitatakse
selle uue kasutuskatsega, mitte kohaliku sünteetilise testi ajaga.

Koristatakse ainult sama kuulutuse olemasoleva lepinguga lubatud algfaili;
aktiivsed veebifotod jäävad alles. Värske päringu ja Storage'i puudumise
tõendamiseta reservi ei vabastata. Üks samm ei tähenda kogu konto koristuse
lõppu. Senised testpaneelid võivad veel näidata teisi ootel faile.

Koodi ettevalmistus, Maci paigaldus, Git, andmebaasi vaatlus, Vercel ja päris
kasutuskatse on eraldi tõendid. Täpne juhtum:
[PHOTO_ADDITION_DIAGNOSTIC_20261107.md](PHOTO_ADDITION_DIAGNOSTIC_20261107.md).
