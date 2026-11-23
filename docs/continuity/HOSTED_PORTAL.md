# Avaliku profiili konto-oleku kontroll — üks järgmine käsk

23.11.2026 Europe/Tallinn. Alus main 4b60782 ja Minu konto on vastu võetud.
Uus pakett lisab ainult kanoonilise avaliku profiili lugemise konto-oleku piiri.

## Käivita uus pakett

Paki `selqiro-profiili-konto-olek-20261123.zip` Downloads-kaustas lahti.
Kui Selqiro kohalik arendusserver on sinu terminalis töös, peata see oma aknas
Ctrl+C-ga. Säilita kõik olemasolevad failid, päevikud ja vanad paketid.

```bash
python3 -I -B "$HOME/Downloads/selqiro-profiili-konto-olek-20261123/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku main 4b60782, 2108 alusfaili, indeksit/tööpuud,
kinnitatud remote’i, sõltuvusi ning eelmise eduka r2 käigu originaalraportit.
Seejärel lisab ainult selle paketi failid, käivitab kaheksa uut kliendikontrolli
ja ühe värske build’i, kontrollib SQL eelseisu, teeb ühe piiratud SQL muudatuse
ning eraldi järelkontrolli. Pärast seda commit’ib ja push’ib ainult selle paketi.
Kontode olekuid, sisu, pilte, sõnumeid, SMTP-d ega sisselogimise seadistust ei muudeta.

Uus commit’i pealkiri on `Respect account availability in public profile reads`.
Tegelik commit’i räsi ilmub terminali ning raportisse; seda ette ei oletata.
SQL võib olla rakendatud enne hilisemat Giti peatumist. Ebaselget kirjutust ei
korrata; raport eristab iga etappi. Peatumisel säilita täpne raport ja päevik.

## Saada täpne raport

Kopeeritud privaatse aruande asukoht kuvatakse real `SAADA SEE FAIL:` ja Finder
valib just selle faili. Koopia vea korral näidatakse kontrollitud originaali;
Finderi vea korral täpset asukohta. Salvestustõrke järel märgitakse viimane säilinud
raport võimalikuks aegunud tõendiks. Raporti puudumisel saada `PEATATUD`-rida.

## Sama uue commit’i Ready / Production järel

1. Värskenda portaali.
2. Ava olemasoleva eraisiku avalik profiil ja kontrolli nime ning pilte.
3. Ava olemasoleva ettevõtte avalik profiil ja kontrolli nime ning pilte.
4. Kontrolli, et Minu konto jääb avatavaks.

Ühtegi kontot pole vaja sulgeda, kustutada ega uut kontot luua. Selle mooduli
puuduva/keelatud konto juhud on läbi kontrollitud eraldatud andmebaasifixtuuridega.
Päris brauseri kasutustee ootab selle uue versiooni avaldamist.

## Piir ja järgmine ulatus

Kanoonilise profiililugeja ning selle meediaprojektsiooni kontroll ei kata veel
kõiki pakkumiste/otsingu, teiste profiilide või ajalooliste sõnumite päringuid.
Varem väljastatud avalikke pildi-URL-e see filter ei tühista. Sulgemise tegevus
lisandub pärast ülejäänud vajalike serveriteede katmist. Sisselogimise/SMTP paus
ja konto terviku → esiletõstmise → reklaamide järjekord säilivad.

Vana kontooleku paigaldust, jätkajaid ega lõpetatud kontrolle ei korrata.
