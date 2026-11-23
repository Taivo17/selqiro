# Tavakuulutuste konto-oleku kontroll — üks järgmine käsk

23.11.2026 Europe/Tallinn. Avaliku profiili parandus main 8dc0b3b on vastu võetud.
Uus pakett seob tavakuulutuste avaliku otsingu ja üksikvaate sama kontoolekuga.

## Käivita uus pakett

Paki `selqiro-kuulutuste-konto-olek-20261123.zip` Downloads-kaustas lahti. Kui kohalik Selqiro arendusserver
on sinu terminalis töös, peata see oma aknas Ctrl+C-ga. Säilita olemasolevad failid,
päevikud ja varasemad paketid.

```bash
python3 -I -B "$HOME/Downloads/selqiro-kuulutuste-konto-olek-20261123/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main 8dc0b3b, kõiki 2130 alusfaili, indeksit/tööpuud,
kinnitatud remote’i, täpseid sõltuvusi ning eelmise eduka profiiliparanduse
originaalraportit. Seejärel lisab ainult selle paketi failid, käivitab
13 uut kliendikontrolli ning ühe värske build’i. Värskele SQL
metaandmete eelseisule järgneb üks piiratud SQL tehing ja eraldi järelkontroll.
Pärast seda commit’itakse ning push’itakse ainult selle paketi muudatused.

Commit’i pealkiri: `Respect account availability in ordinary listing reads`.
Tegelik räsi kuvatakse `Commit:` real ja raportis; seda ette ei oletata.
SQL võib olla rakendatud enne hilisemat Giti peatumist. Raport eristab neid etappe;
ebaselget kirjutust automaatselt ei korrata ega parandata käsitsi vana paigaldajaga.

## Saada täpne raport

Uus privaatne koopia tehakse Downloads-kausta ja selle absoluutne asukoht
kuvatakse real `SAADA SEE FAIL:`. Finder valib just selle faili. Koopia vea korral
näidatakse kontrollitud originaali; Finderi vea korral jääb täpne tee terminali.
Salvestustõrke järel on viimane säilinud raport märgitud võimalikuks aegunud
tõendiks. Kui raportit ei loodud, saada `PEATATUD`-rida.

## Sama uue commit’i Ready / Production järel

1. Värskenda portaali.
2. Ava Kuulutused ja vali otsingust üks olemasolev tavakuulutus.
3. Kontrolli pealkirja, hinda, müüjat ja pilte üksikvaates.
4. Kontrolli sama lugemisteed eraisiku ja ettevõtte kontoga.
5. Kontrolli, et olemasolevad avalikud profiilid ja Minu konto jäävad avatavaks.

Need on lugemiskontrollid. Konto sulgemine, kustutamine või uue konto loomine
ei kuulu sellesse sammu. Kontode puudumise ja Auth-piirangute juhud kateti
eraldi sünteetilise PostgreSQL-i kontrollidega.

## Järgmine osa

Uus piir katab tavakuulutuste neli nimetatud lugejat. Hobuste haru, teenuste,
tööde, legacy-lugemiste, sõnumite ja kirjutamise teed vajavad oma kontrolli enne
konto sulgemise/taastamise/kustutamise tegevuse avamist. Varem väljastatud
pildi-URL-e ega väliste teenuste salvestatud jagamise metadata’t ei tühistata.
SMTP paus ning konto tervik → kuulutuste esiletõstmine → reklaamid järjekord säilivad.

Varasemaid lõpetatud paigaldajaid ja kontrollpakke ei korrata.
