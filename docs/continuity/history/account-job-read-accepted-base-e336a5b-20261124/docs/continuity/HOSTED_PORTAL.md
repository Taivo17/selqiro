# Töökuulutuste kontooleku kontroll — üks järgmine käsk

24.11.2026 Europe/Tallinn. Main **a9d86e6** on vastu võetud. Uus pakett lisab
sama konto kättesaadavuse kontrolli töökuulutuste avalikele lugemistele.

## Käivita uus pakett

Paki `selqiro-too-konto-olek-20261124.zip` Downloads-kaustas lahti. Kui sinu terminalis töötab kohalik
Selqiro arendusserver, peata see oma aknas Ctrl+C-ga. Säilita olemasolevad paketid ja päevikud.

```bash
python3 -I -B "$HOME/Downloads/selqiro-too-konto-olek-20261124/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main a9d86e6, kõiki 2227 alusfaili, indeksit/tööpuud,
kinnitatud remote'i, olemasolevaid täpseid sõltuvusi ning eelmise teenuste
käigu originaalraportit. Ta lisab ainult paketi failid, teeb 12 sihitud
kliendikontrolli ja värske build'i. Seejärel kinnitab SQL eelseisu, asendab
ühes kaitstud tehingus kaks funktsioonikeha ja teeb eraldi verify.
Järgneb ainult selle paketi commit/push.

Commit'i pealkiri: `Respect account availability in public job reads`.
Tegelik uus räsi ilmub `Commit:` reale ja raportisse. SQL võib olla rakendatud
enne hilisemat Giti peatumist; raport eristab etappe. Kui SQL kirjutuse kinnitus
kaob, võib uuendaja järelseisu ainult lugemisega kontrollida, kuid ta peatub
enne commit/push'i. Ta ei korda kirjutust automaatselt ega vana paketiga.

## Saada täpne raport

Uus privaatne koopia tehakse Downloads-kausta. Absoluutne tee kuvatakse real
`SAADA SEE FAIL:` ning Finder valib just selle faili. Koopia vea korral
näidatakse kontrollitud originaali; Finderi vea korral prinditakse täpne tee.
Salvestustõrke järel märgitakse viimane säilinud raport võimaliku aegunud
tõendina. Kui raportit ei loodud, saada `PEATATUD`-rida.

## Sama uue commit'i Ready / Production järel

1. Värskenda portaali ja ava menüüst Töö. Otsi olemasolev aktiivne pakkumine.
2. Ava pakkumise üksikvaade, seejärel avaldaja avalik profiil ja selle tööpakkumised.
3. Kui loendil on järgmine leht, ava see ning mine tagasi otsingusse.
4. Kontrolli olemasolevat eraisiku ja ettevõtte pakkumist.
5. Ava olemasolev avalik jagamislink ka välja logitud vaates, kui sul on see käepärast.

Puuduva järgmise lehe või teise profiilitüübi aktiivse pakkumise jaoks pole vaja
uut sisu luua. Kontode sulgemist ega kustutamist siin ei katsetata. Puuduva või
piiratud konto ja muud erijuhud kontrolliti ettevalmistuse eraldatud sünteetilises
andmebaasis ning tegeliku kliendikoodi kontrollides.

## Säiliv tööjärg

Ülejäänud lugemised, otseõigused, kirjutused, kontakt/sõnumid ning meedia vajavad
lõpetamist enne konto sulgemise, taastamise ja kustutamise tervikut. Teenuste
varasem suurmahu piir säilib; selle paketi tööde mõõtmised on eraldi.
SMTP paus ning konto tervik → esiletõstmine → reklaamid järjekord säilivad.
Lõpetatud paigaldajaid ja laiu teste ei korrata.
