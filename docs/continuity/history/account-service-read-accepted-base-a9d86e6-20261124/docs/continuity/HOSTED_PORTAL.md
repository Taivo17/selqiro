# Teenuste kontooleku kontroll — üks järgmine käsk

24.11.2026 Europe/Tallinn. Main **0cb3484** on vastu võetud. Uus pakett lisab
sama konto kättesaadavuse kontrolli teenuste avalikele lugemistele.

## Käivita uus pakett

Paki `selqiro-teenuste-konto-olek-20261124.zip` Downloads-kaustas lahti. Kui sinu terminalis töötab kohalik
Selqiro arendusserver, peata see oma aknas Ctrl+C-ga. Säilita olemasolevad paketid ja päevikud.

```bash
python3 -I -B "$HOME/Downloads/selqiro-teenuste-konto-olek-20261124/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main 0cb3484, kõiki 2202 alusfaili, indeksit/tööpuud,
kinnitatud remote'i, olemasolevaid täpseid sõltuvusi ning eelmise profiili
kuulutuste/rubriikide käigu originaalraportit. Ta lisab ainult paketi failid,
teeb 15 sihitud kliendikontrolli ja värske build'i. Seejärel kinnitab SQL
eelseisu, asendab ühes kaitstud tehingus kolm funktsioonikeha ja teeb eraldi verify.
Järgneb ainult selle paketi commit/push.

Commit'i pealkiri: `Respect account availability in public service reads`.
Tegelik uus räsi ilmub `Commit:` reale ja raportisse. SQL võib olla rakendatud
enne hilisemat Giti peatumist; raport eristab etappe. Ebaselget kirjutust ei
korrata automaatselt ega vana paketiga.

## Saada täpne raport

Uus privaatne koopia tehakse Downloads-kausta. Absoluutne tee kuvatakse real
`SAADA SEE FAIL:` ning Finder valib just selle faili. Koopia vea korral
näidatakse kontrollitud originaali; Finderi vea korral prinditakse täpne tee.
Salvestustõrke järel märgitakse viimane säilinud raport võimaliku aegunud
tõendina. Kui raportit ei loodud, saada `PEATATUD`-rida.

## Sama uue commit'i Ready / Production järel

1. Värskenda portaali ja ava teenuste otsing. Otsi mõni olemasolev teenus.
2. Ava teenuse üksikvaade, seejärel pakkuja avalik profiil.
3. Ava profiili teenuste osa ning olemasolev teenuserubriik; kui on järgmine leht, ava see.
4. Mine tagasi teenuste otsingusse. Kontrolli olemasolevat era- ja ettevõttekonto sisu.
5. Kui teenusel on juba jagatav avalik link, ava see ka välja logitud vaates.

Puuduva rubriigi, järgmise lehe või teise profiilitüübi teenuse jaoks pole vaja
uut sisu luua. Need on olemasoleva sisu lugemiskontrollid. Konto sulgemist või
kustutamist ei katsetata. Puuduva/piiratud konto ja teised erijuhud kontrolliti
ettevalmistuse eraldatud sünteetilises andmebaasis ning kliendikatsetes.

## Säiliv tööjärg

Ülejäänud lugejad, otseõigused, kirjutused, kontakt/sõnumid ning meedia vajavad
oma lõpetamist enne konto sulgemise/taastamise/kustutamise tervikut. Teenuste
otsingu kandidaatide ja täpsete koguarvude suurmahu optimeerimist see pakett ei
lõpeta. SMTP paus ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
Lõpetatud pakette ja laiu teste ei korrata.
