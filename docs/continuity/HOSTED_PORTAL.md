# Selqiro portaal — ühe lisafoto eemaldamine

Seis: 04.11.2026 Europe/Tallinn. Autoriteetne seis on
[CURRENT_STATE.json](CURRENT_STATE.json); lühileht genereeritakse sellest.

## Ettevalmistatud tulemus

Avaldatud hallatud kuulutuse muutmisvaates saab kinnituse järel eemaldada ühe
foto, mis ei ole põhipilt. Vähemalt üks foto jääb alles. Põhipildi eemaldamiseks
vali enne teine olemasolev foto põhipildiks.

Eemaldatud foto kaob galeriist ning selle vana avalik ja omaniku veebiaadress
sulgub. Ülejäänud fotode aadressid, põhipilt ja salvestamata tekstimuudatused
säilivad. Katkenud või ebaselge vastuse järel loetakse seisu uuesti; eemaldamist
automaatselt ei korrata.

Selles sammus jääb eemaldatud WEB-fail privaatsesse koristusjärjekorda ja selle
ruum arvestusse. Lõpliku failikoristuse tõend tuleb järgmise kitsa lepinguga.
Uut tabelit, järjekorda, mahubilanssi ega üldist töövoomootorit ei lisata.

## Üks jätkamiskäsk

1. Laadi alla ja paki Downloads-kaustas lahti
   `selqiro-foto-eemaldamine-20261104.zip`.
2. Käivita terminalis:

```sh
python3 -I -B "$HOME/Downloads/selqiro-foto-eemaldamine-20261104/uuenda.py" --publish
```

Uuendaja loeb tegeliku haru, HEAD-i, kogu indexi/tööpuu, lähteräsid ja kinnitatud
remote'i. Seejärel kontrollib olemasoleva andmebaasi täpset lepingut, paigaldab
ühe piiratud SQL-muudatuse, teeb lähtefailide varukoopiad, rakendab muudatuse,
koostab portaali ning teeb täpse commit'i ja tavalise push'i. Paigaldaja ise ei
käivita foto eemaldamise käsku ega kustuta Storage'i objekte.

Lähtebaas on eelmise algfotokoristuse tarne 978 faili. Vana R3 commit on ainult
esivanema kontroll, mitte oletatav praegune HEAD. Ka eelmise vastuvõtu viis
Maci rakendamata dokumenti jõuavad selle kontrollitud muudatusega kaasa.

Kui ilmub `PEATATUD`, saada peatuse rida ja nimetatud `result.json`.
Säilita töö ja päevikud. Tundmatut SQL-tulemust ega muutunud lähtebaasi ei
parandata korduskäivituste või kaitsete eemaldamisega.

## Pärast VALMIS-tulemust

Oota Vercelis terminalis näidatud uue commit'i `Ready / Production` tulemust
ja värskenda portaali.

Tee üks kitsas kasutuskatse olemasoleva vähemalt kolme fotoga testkuulutusega,
mille algfailide koristus on lõpetatud:

1. Ava muutmisvaade ja vali ühe lisafoto **Eemalda foto**.
2. Kinnita eemaldamine. Valitud foto peab kaduma, teised jääma alles.
3. Vali üks allesjäänud foto põhipildiks ja vaata kuulutuse avalikku detaili.
   Allesjäänud galerii ning valitud põhipilt peavad vastama muutmisvaatele.

Kui tulemuse kinnitamine katkeb, kasuta **Kontrolli piltide seisu**.
Ära korda eemaldamist teadmata tulemuse pealt. Viimasele fotole ega praegusele
põhipildile eemaldusnuppu ei kuvata.

## Senine vastuvõtt säilib

Eelmise kasutajapildi jadas vähenes kuulutuse 201 algfailide arv 3 → 2 → 1,
seejärel plokk kadus ja kolm fotot säilisid. Uue ühe fotoga kuulutuse 202
omanikuvaates koristusplokki ei olnud. See nähtav käitumine on vastu võetud;
selle paigaldust või katset ei korrata.

Nende piltide põhjal pole teada algfotokoristuse täpne uus commit, Maci index
või Verceli deployment'i identiteet. Selle fotoeemalduse lähtekood ja kohalikud
kontrollid ei tõenda samuti Maci rakendamist, SQL-i, push'i ega Productionit.
Uuendaja värske raport ning järgnev veebikatse annavad järgmise tõendi.

## Avaliku vaate otsus

Testimise ajal võib senine koristusplokk alles olla. Enne avalikku avamist peab
sobivate failide koristus edenema kasutaja nupuvajutusteta ning avatud
omanikuvaatest sõltumata. Tehniline loendur, koristusnupp ja lõpukinnitused
kaovad tavakasutaja vaatest. Nähtavaks jäävad kuulutuse tegelik olek ja kasutaja
tegevust mõjutav arusaadav probleem. Ainult paneeli peitmine seda nõuet ei täida.

Täpsed piirid:
[published-listing-photo-removal-v1.md](../architecture/published-listing-photo-removal-v1.md).
