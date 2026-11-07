# V2 inglise ja eesti kasutajaliidese paigaldamine

Seis: 07.11.2026 Europe/Tallinn. Üks praegune tööjärg on
[CURRENT_STATE.json](CURRENT_STATE.json). Varasemad käsud on ajalugu.

## Vastuvõetud lähtealus

Kasutaja kinnitas viimase foto kuvamise paranduse `785c359`
(`Load the added photo while confirming gallery membership`) Ready / Production
seisu. Üks lisamine võttis 9 sekundit ja foto oli avalikus vaates nähtav.
Frankfurt `fra1` ning kümne foto piir on juba kinnitatud; neid ei korrata.

Uus pakett lisab V2 päisesse **English / Eesti** valiku ja tõlgib olemasolevad
vaated. Sama konto `profiles.language` jääb ainsaks püsivaks eelistuseks.
Pooleliolev vorm ja fotolisamine säilivad keele vahetamisel.

## Üks käsk

Paki **selqiro-v2-keeled-20261107.zip** Downloads-kausta ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-v2-keeled-20261107/uuenda.py" --publish
```

Paigaldaja lahendab `785c359` tegelikus Gitis üheseks commit'iks ja kontrollib
1085 lähtefaili, täielikku indexit/puud, main-haru ja kinnitatud remote'i.
Muudetavad failid varundatakse; järgneb build, piiratud commit ja tavaline push.
SQL-i, fotode koristust ega teenuse seadistamist ei käivitata.

**PEATATUD** korral säilita teade ja raport ning saada need vestlusse.
Varem väljastatud pakette või diagnostikat ei käivitata uuesti.

## Üks kontroll pärast uut Ready tulemust

Oota terminalis näidatud uue commit'i **Ready / Production** tulemust,
värskenda portaali ja vali päisest **English**. Ava kuulutuse muutmine ja
avalik vaade. Värskenda lehte: inglise keele valik peab kontol säilima.
Seejärel vali soovi korral **Eesti**. Müüja pealkiri, kirjeldus ja muu
kasutajasisu peavad jääma samaks.

Kinnitatavate õigusdokumentide praegune originaal on eesti keeles; inglise
liides selgitab seda. Tõlgitud liides ei asenda dokumendi originaalteksti.

## Järgmine arendus

Hobuste täielik avaldamine/fotod/avalik detail/kontakt ja seejärel teenuste
päris avalik kataloog. Ühine tehniline alus ja säilivad erinevused on
[shared-marketplace-foundation.md](../architecture/shared-marketplace-foundation.md).
Teenuste näidisvaade ei ole selle keelepaketi järel veel päris otsing.
