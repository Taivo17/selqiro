# Olemasolev Selqiro portaal — algfoto koristuse tarne

Seis: 04.11.2026. Autoriteetne jooksev seis on
[CURRENT_STATE.json](CURRENT_STATE.json); lühike üleandmine genereeritakse sellest.

## Vastuvõetud alus

R3 vormi ja põhipildi parandus on kasutaja poolt vastu võetud:
`8be94cdff322bc051cd54f5143cd3ea12312493e`, Vercelis `main / Ready / Production`,
kasutaja kinnitus „testides on nüüd korras”. Vana paigaldajat, koondlugejat
ja selle paranduse teste ei korrata.

## Uue muudatuse eesmärk

Ühe avaldatud kuulutuse lõpetatud ja kontrollitud SOURCE-algfoto eemaldamine
Supabase API kaudu. Algfoto loogiline 25 MiB reserv vabaneb; avalik WEB-pilt ja
selle 4 MiB reserv säilivad. Kasutatakse sama omanikuvaadet ja koristuspäevikut.
Täpsed õigused, teenuse vastutuspiir ja allesjääv töö on
[arhitektuurilepingus](../architecture/hosted-completed-source-cleanup-v1.md).

See kandidaat on eraldatud keskkonnas kontrollitud. Maci, pilve-SQL-i,
GitHubi ja Verceli uut tulemust ei ole veel nähtud.

## Üks käsk

Laadi alla `selqiro-algfotode-koristus-20261104.zip` ja paki see Downloads-kaustas
lahti. Käivita terminalis:

```bash
python3 -I -B "$HOME/Downloads/selqiro-algfotode-koristus-20261104/uuenda.py" --publish
```

Siht on olemasolev `~/selqiro`, olenemata terminali hetke kaustast.
Paigaldaja ei paigalda Node'i, npm-pakette ega Supabase CLI-d uuesti.
Kasutatakse senist viie failiga kontrollitud CLI 2.117.0 ja autentimist.

Käsk kontrollib tegeliku haru/HEAD-i, kogu indexi/tööpuu, lähteräsid ja
kinnitatud remote'i. Aluseks on vastu võetud R3 tegelik 958 faili tarne;
varasema 04.11 dokumentatsiooniüleandmise faile ei eeldata juba Maci rakendatuks.
Seejärel kontrollib ja lisab see täpselt sobiva SQL-toe, säilitab varukoopiad,
rakendab allikad, teeb build'i ning piiratud commit'i ja tavalise push'i.
SQL-toe paigaldamine ise ei käivita ühegi foto eemaldamist.

Pärast `VALMIS` tulemust oota Vercelis selle **uue commit'i** `Ready / Production`
tulemust ja värskenda portaali. Siinses dokumendis uut commit'i räsi ette ei anta.

## Üks uus päris kasutuskatse

Kasuta ühe fotoga juba avaldatud kuulutust, mille omanikuvaates on algfaili
koristus veel ootel. Vajuta olemasolevat koristuse jätkamise nuppu.

Oodatud tulemus:

- omanikuvaate värske serverikviitungi järgi pole selle katse algfaile alles;
- koristusplokk kaob pärast kviitungi uuendamist;
- avalik foto ja valitud põhipilt on kuulutuses alles.

Uue kuulutuse avaldamine teeb sama piiratud koristussammu juba pärast
avaldamist. Kui kasutad uut ühe fotoga kuulutust, võib koristusplokk seetõttu
juba puududa. Kui katse sisaldab mitut fotot, tegeleb üks käsk kuni ühe algfotoga.

Kasutajaliides ei näita 25 MiB arvestust eraldi uue rahakotina. Mahu vabanemine
on kontrollitud andmebaasilepingu tagajärg, mitte üksiku nupu ACK-i oletus.
Teadmata tulemuse korral jääb töö ootele ja avalik pilt nähtavale.

## Kui käsk peatub

Saada `PEATATUD` rida ja terminalis nimetatud `result.json`. Säilita päevik ja
olemasolev töö. Tundmatut SQL-rakendamist uuesti ei saadeta: jätkaja loeb sama
lepingu seisu ning ei tee pimedat korduskirjutust. Allikakaitset ei eemaldata
ja teist sihtkausta ei looda peatuse vältimiseks.

## Üleandmine ja allesjäävad piirid

`selqiro-uleandmine-algfotod-20261104.zip` sisaldab täielikku uut lähtekoopiat,
sama paigalduspakki ja kontrollide tõendeid. Vanad väljastatud ZIP-id ja päevikud
säilivad muutmata. Kõik tarnefailid on räsiga seotud.

Pooleliolevate/tühistatud upload'ide koristus, WEB-i eemaldamine pärast
kuulutuse eemaldamist, avaldatud fotode koosseisu muutmine ja püsiv ajastatud
koristaja on järgmised eraldi elutsükli sammud. See tarne ei tähenda kogu
portaali avalikuks avamiseks valmisolekut.
