# Hobusekuulutuste konto-oleku kontroll — üks järgmine käsk

23.11.2026 Europe/Tallinn. Main **87bff3f** on vastu võetud. Uus pakett seob
hobuste põhiotsingu ja avaliku üksikvaate sama kontoolekuga.

## Käivita uus pakett

Paki `selqiro-hobuste-konto-olek-20261123.zip` Downloads-kaustas lahti. Kui kohalik Selqiro arendusserver
on sinu terminalis töös, peata see oma aknas Ctrl+C-ga. Säilita olemasolevad
failid, päevikud ja varasemad paketid.

```bash
python3 -I -B "$HOME/Downloads/selqiro-hobuste-konto-olek-20261123/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main 87bff3f, kõiki 2154 alusfaili, indeksit/tööpuud,
kinnitatud remote’i, täpseid sõltuvusi ja eelmise tavakuulutuste käigu originaali.
Ta lisab ainult selle paketi failid, käivitab 12 uut kliendikontrolli
ja ühe värske build’i. Seejärel kontrollib ta andmebaasi metaandmete eelseisu,
rakendab ühe piiratud kahe lugeja SQL tehingu ja teeb eraldi järelkontrolli.
Järgneb ainult selle paketi commit/push.

Commit’i pealkiri: `Respect account availability in public horse reads`.
Tegelik räsi kuvatakse `Commit:` real ja raportis; seda ette ei oletata.
SQL võib olla rakendatud enne hilisemat Giti peatumist. Raport eristab etappe;
ebaselget kirjutust ei korrata automaatselt ega käsitsi vana paigaldajaga.

## Saada täpne raport

Uus privaatne koopia tehakse Downloads-kausta. Absoluutne tee ilmub real
`SAADA SEE FAIL:` ja Finder valib just selle faili. Koopia vea korral näidatakse
kontrollitud originaali; Finderi vea korral jääb täpne tee terminali.
Salvestustõrke järel märgitakse viimane säilinud raport võimalikuks aegunud
tõendiks. Kui raportit ei loodud, saada `PEATATUD`-rida.

## Sama uue commit’i Ready / Production järel

1. Värskenda portaali.
2. Ava Kuulutused, vali hobuste kategooria ja ava üks olemasolev avalik pakkumine.
3. Kontrolli üksikvaate pealkirja, hinda, müüjat ja pilte; ava sama pakkumine ka profiilikaardilt.
4. Ava üks olemasolev tavakuulutus otsingust.
5. Kontrolli, et eraisiku ja ettevõtte avalikud profiilid ning Minu konto avanevad.

Need on olemasoleva sisu lugemiskontrollid. Kontode sulgemine/kustutamine ja uue
konto loomine ei kuulu sellesse sammu. Puuduva ning piiratud konto juhud on
kaetud eraldatud sünteetilise PostgreSQL-i katsetega.

## Säiliv tööjärg

Profiili pakkumiste/rubriikide otselugejad, muud sisutüübid, kirjutused, sõnumid
ja meedia vajavad oma kontrolli enne konto sulgemise/taastamise/kustutamise
tegevust. Ühendatud laiotsingu kaartide koostamine enne lehekülge jääb eraldi
optimeerimistööks enne suuremat kasutusmahtu. SMTP paus ning konto tervik
→ esiletõstmine → reklaamid järjekord säilivad.

Lõpetatud pakette, SQL-i ja laiu teste ei korrata.
