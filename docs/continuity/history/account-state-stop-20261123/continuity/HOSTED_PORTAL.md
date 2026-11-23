# Minu konto ja aktiivse oleku vundamendi kasutuselevõtt

22.11.2026 Europe/Tallinn. Ainus alus: main 034211d2ee3dfadd4ba791977c98e310754e4d94.
Jooksev tõend ja järgmine tegevus on CURRENT_STATE.json-s.

## Üks käsk

Paki selqiro-konto-olek-20261122.zip Downloads-kaustas lahti.
Kui kohalik arendusserver on terminalis töös, peata see oma aknas Ctrl+C abil.
Ära muuda tööpuud või indeksit käigu ajal.

```bash
python3 -I -B "$HOME/Downloads/selqiro-konto-olek-20261122/uuenda.py" --publish
```

Käsk kontrollib enne kirjutusi olemasolevat /Users/taivo/selqiro hoidlat:
haru, HEAD, kogu aluspuud, indeksit, kinnitatud remote'i, sõltuvusi ning mõlema
vastu võetud käigu täpset originaalraportit. Seejärel rakendab ainult paketi
failid, käivitab uued sihitud testid ja värske build'i, kontrollib pilve eelseisu,
teeb ühe lisava SQL-tehingu, kontrollib järelseisu ja teeb ainult selle paketi
commit'i ning push'i. Uuendaja ei paigalda sõltuvusi ega ühenda teenuseid uuesti.

Commit'i pealkiri: Add private active account state foundation.
Sama commit'i täpne räsi tuleb selle Maci käigu raportist; ette ei määrata seda.

## Lisanduv andmebaasi osa

Uus privaatne konto olekutabel saab olemasolevate Auth kontode aktiivsed read.
Üks Auth INSERT-trigger loob rea ka uuele kontole; algtäide ja triggeri paigaldus
on samas piiratud tehingus. Ainult oma konto oleku lugemise RPC ei vaja profiili.
Üle 1000 konto korral katkeb see piiritletud paigaldus ilma osalise rakenduseta.

Olemasolevaid Auth, profiili, kuulutuse, pildi, vestluse ja Energy ridu ei
muudeta. Olekurida kaitseb Auth konto otsese kustutamise eest ON DELETE RESTRICT
kaudu. Konto sulgemise, taastamise ja kustutamise toiminguid siin veel ei lisata.
SMTP, e-posti kinnitamine, domeen ning varasem registreerimise ettevalmistus
jäävad kokkulepitud pausile.

## Saada selle käigu raport

Lõpus näitab terminal SAADA SEE FAIL: ning raporti täpset absoluutset asukohta.
Finder avatakse just selle uue privaatse koopia juures. Saada see fail siia.
Vana eduka käigu originaal, uus päevik ja kõik varasemad koopiad säilivad.

Kui koopia loomine ebaõnnestub, näidatakse kontrollitud originaali. Kui Finder
ei avane, jääb terminali täpne asukoht. Viimase salvestuse vea järel märgitakse
allesjäänud raport võimalikuks aegunud tõendiks. Kui raportit ei tekkinud,
saada terminali PEATATUD-rida.

PEATATUD korral säilita failid ja päevik. Ära paranda oletuse järgi indeksit,
sõltuvusi ega pilve. Ebaselget SQL apply'd ei saadeta automaatselt uuesti.
Eraldi ainult lugemise kontroll võib kinnitada täpse paigaldatud seisu;
algse COMMIT-vastuse saamine ja hilisem järelseisu vaatlus on eri tõendid.

## Sama uue commit'i Ready / Production järel

1. Värskenda portaali leht.
2. Ava Minu ala → Minu konto. Vaade peab näitama sinu konto e-posti, olekut
   Aktiivne ja teadaolevat algset loomiskuupäeva. Puuduvat kuupäeva ei mõelda välja.
3. Ava ka päise konto menüüst Minu konto.
4. Logi sisse teise olemasoleva kontoga ja kontrolli, et kuvatakse selle konto
   andmeid ning eelmine e-post ei jää nähtavale.
5. Kontrolli kitsas aknas, et tekst ja tagasitee on kasutatavad.

Kontode loomist, sulgemist ega kustutamist selle kontrolli jaoks pole vaja.
Siinne päris brauserikäik jäi keskkonnapiirangu tõttu tegemata; Reacti
serverrenderduse test ei asenda seda kasutajakontrolli.

Pärast vastuvõttu jätkub serveri lugemis- ja kirjutamisteede sidumine konto
olekuga ning seejärel sulgemine, taastamine ja lõppkustutamine. Esiletõstmise ja
reklaamide töö algab pärast konto elutsükli tervikut.
