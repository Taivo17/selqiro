# Profiili kuulutuste ja rubriikide konto kontroll — üks järgmine käsk

24.11.2026 Europe/Tallinn. Main **ac5521a** on vastu võetud. Uus pakett lisab sama
konto kättesaadavuse kontrolli profiili kuulutuste ja avalike poerubriikide lugejatele.

## Käivita uus pakett

Paki `selqiro-profiili-kuulutuste-konto-olek-20261124.zip` Downloads-kaustas lahti. Kui sinu terminalis töötab kohalik
Selqiro arendusserver, peata see oma aknas Ctrl+C-ga. Säilita olemasolevad paketid ja päevikud.

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-kuulutuste-konto-olek-20261124/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main ac5521a, kõiki 2177 alusfaili, indeksit/tööpuud,
kinnitatud remote'i, olemasolevaid täpseid sõltuvusi ja eelmise hobuste käigu
originaalraportit. Ta lisab ainult selle paketi failid, teeb 17
sihitud kliendikontrolli ja värske build'i. Seejärel kinnitab SQL eelseisu,
asendab ühes kaitstud tehingus kolm lugejat ning teeb eraldi järelkontrolli.
Järgneb ainult paketi commit/push.

Commit'i pealkiri: `Respect account availability in public profile marketplace reads`.
Tegelik uus räsi ilmub `Commit:` reale ja raportisse. SQL võib olla rakendatud
enne hilisemat Giti peatumist; raport eristab etappe. Ebaselget kirjutust ei
korrata automaatselt ega vana paigaldajaga.

## Saada täpne raport

Uus privaatne koopia tehakse Downloads-kausta. Absoluutne tee kuvatakse real
`SAADA SEE FAIL:` ning Finder valib just selle faili. Koopia vea korral
näidatakse kontrollitud originaali; Finderi vea korral prinditakse täpne tee.
Salvestustõrke järel märgitakse viimane säilinud raport võimaliku aegunud
tõendina. Kui raportit ei loodud, saada `PEATATUD`-rida.

## Sama uue commit'i Ready / Production järel

1. Värskenda portaali ja ava eraisiku avalik profiil.
2. Ava selle kuulutuste loend ning mõni olemasolev poerubriik. Kui on järgmine leht, ava see.
3. Ava profiililt olemasolev tava- ja hobusekuulutus ning mine tagasi profiilile.
4. Ava ettevõtte avalik profiil ja selle olemasolevad kuulutused/rubriigid.
5. Ava teenuste osa ja olemasolevad teenuserubriigid — nende valikud kasutavad sama rubriigilugejat.

Puuduva rubriigi või järgmise lehe jaoks pole vaja testandmeid juurde luua.
Need on olemasoleva sisu lugemiskontrollid. Konto sulgemist/kustutamist ei katsetata.
Puuduva/piiratud konto, rubriikide ja lehekülgede erijuhud on eraldatud
sünteetilise andmebaasi ning kliendi kontrollides.

## Säiliv tööjärg

Teenuste/tööde eraldi lugejad, showcase, legacy-teed, tabelite otseõigused,
kirjutused, kontakt/sõnumid ja meedia vajavad oma lõpetamist enne konto
sulgemise/taastamise/kustutamise tervikut. Suure mahu otsingu/profiililoendite
optimeerimine jääb eraldi tööks. SMTP paus ning konto tervik → esiletõstmine →
reklaamid järjekord säilivad. Lõpetatud pakette ja laiu teste ei korrata.
