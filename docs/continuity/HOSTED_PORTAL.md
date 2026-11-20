# Kuulutuste AI sulgemise parandus

20.11.2026. Alus on vastu võetud commit `7c7bc11`.

Parandus sulgeb kaks serveri AI-otspunkti ning vana kuulutusevormi AI-kutsed.
Tavaline kuulutuse lisamine, fotod ja mustandid säilivad. Kaasas on järgmise
profiilitöö otsused ja reklaamikonto kavand; neid funktsioone see pakett ei ava.

## Üks käsk

Laadi `selqiro-ai-sulgemise-parandus-20261120.zip` alla ning ava ZIP Downloads-kaustas.
Käivita Terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-ai-sulgemise-parandus-20261120/uuenda.py" --publish
```

Uuendaja kontrollib värsket tegelikku main-haru, täpset `7c7bc11` lähtepuud,
indexit, kinnitatud remote'i ja 19.11 eduka jooksu originaalraportit. Varasemad
paketid ja päevikud säilivad. Andmebaasi, Storage'it ega kontosid ei muudeta.
Enne commit/push'i peavad läbima uus 12 juhtumiga handleritest ja üks täielik
build. Olemasolevaid sõltuvusi ei paigaldata ega uuendata.

## Pärast käsku

Saada täpselt see uus raport, mille rada on `SAADA SEE FAIL` järel. Finder
näitab sama faili. Kui raportit ei saanud luua, saada prinditud STOP-rida.
Tõrke korral ei käivitata varasemaid paigaldajaid ega oletata uut jätkukäsku.

Vercelis kontrolli sama uue commit'i `Ready / Production` olekut. Ava pärast
värskendamist tavaline kuulutuse lisamise vaade. Vana vorm ei paku enam uut
AI fotoanalüüsi; praegune V2 vorm töötas juba käsitsi. Kontrollimiseks ei ole
vaja uut kuulutust või sõnumit avaldada. Varasemast mustandist taastatud
ajalooline AI-tulemus võib endiselt nähtav olla.

## Mida on kontrollitud

- Päris POST-handlerite isoleeritud kontroll: 12/12 läbitud; providerit,
  andmebaasi, Energyt, võtmeid ega sisendkeha ei loeta.
- Üks täielik Next.js/TypeScript build läbis; 730 sisendi räsi ei muutunud.
- Sõltumatu lähteülevaatus ei leidnud selle muudatuse piires blokeerivat viga.
- Uuendaja kontrollid ja tarnekatse on `kontrollid/` all. Nende simuleeritud
  rakenduse test/build ei asenda eespool eraldi tehtud tegelikke kontrolle.

See on kohalik ettevalmistus, mitte kinnitus Maci rakendusest, Git push'ist
või uuest Productioni väljastusest. Brauseri teekonda varem tuvastatud
käivituspiirangu tõttu ei korratud.

Võimalikke varem pooleli jäänud AI Energy reserveeringuid pakett ei tagasta.
Nende koondseis kuulub järgmisse lugemisinventuuri. Profiili õiguste ja
andmete privaatsuse ning sõltuvuste turvaparandused jäävad avamiseelseteks
töödeks. Kõigi portaali riskide lahendamist see pakett ei väida.

Reklaamiplaan: `payload/docs/architecture/advertising-access-plan.md`.
Järgnev profiili ja privaatsuse töö:
`payload/docs/architecture/launch-profile-privacy-plan.md`. Koodi täpne muudatus ja kontrollide piirid:
`payload/docs/architecture/launch-ai-containment.md`.
