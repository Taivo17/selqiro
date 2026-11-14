# Praegune samm: blokeeringu täpne eemaldamine kõigis vaadetes

13.11.2026 Europe/Tallinn. Alus on vastu võetud Maci commit
`371f4f4cc1ff62ecadb14d19bf5c8004cff256ea`, 1701 faili. Peitmine/tagasivõtmine
ning juba avatud telefonivestluses blokeerimine/taastumine on kasutaja poolt
vastu võetud. Neid paigaldajaid ja lõpetatud kasutuskatseid ei korrata.

Uus parandus seob iga eemaldamise kasutajale näidatud blokeeringu täpse
rea ja loomise ajaga. Vana hilinenud kinnitus ei tohi eemaldada vahepeal uut
blokki. Praegune pakett on ettevalmistatud; selle Maci/pilve tulemus tuleb
alloleva jooksu raportist, mitte käesolevast tekstist.

## Üks uus käsk

Paki `selqiro-blokeeringu-kontroll-20261113.zip` Downloads-kausta lahti ja käivita:

```bash
python3 -I -B "$HOME/Downloads/selqiro-blokeeringu-kontroll-20261113/uuenda.py" --publish
```

Uuendaja kontrollib tegelikku `/Users/taivo/selqiro` main-haru, täpset alust,
kogu indexit/tööpuud, lähtefaile ja kinnitatud remote'i. Ta hoiab viimase
eduka profile-päeviku olemasolevat lukku ning säilitab selle baidid. Kasutaja
muudatused või teine pooleliolev kirjutus peatavad automaatse jätkamise.

Järjekord on andmebaasi ainult lugemisega eelkontroll → uus lähtekood → build
→ commit/push → täpse uue kliendimärgi vaatlus avalikul portaalil → värske
lähte/remote'i/märgi kontroll → üks uus kaitstud SQL-tehing → eraldi tulemuse
lugemine. Uus klient kasutab juba olemasolevat `blocked_account` CAS-lepingut.
Vanad eemaldamisteed suletakse pärast uue kliendi märgi kontrolli.

SQL muudab ainult blokeeringu eemaldamisega seotud skeemi ja õigusi: vana versioonita eemaldamine
ja blokeeringu ID/aja otsemuutmine sulguvad, kontrollitud kustutus kasutab
kitsast privaatset serveri kirjutajat ja tabelikaitset. Ühtegi kasutaja plokki,
peitmiseelistust, kontot, kuulutust, fotot, sõnumit või ajalugu paigaldus ei muuda.
Storage'i toiminguid ja uute teenuste ühendamist pole.

## Kui veebiversioon pole veel valmis

Kuni 55-sekundilise kontrolli järel võib tulla:

```text
OOTEL: WAITING_FOR_CLIENT_DEPLOYMENT
```

Siis käivita mõne aja pärast **sama uus käsk** uuesti. Kinnitatud build'i,
commit'i ja push'i ei korrata. Värske kontroll ei kirjuta üle vahepeal muutunud
remote'i. Ooteolek ise ei anna õigust andmebaasi kirjutamiseks.

Avalik kliendimärk tõendab täpsete avalike baitide kättesaadavust. See pole
Verceli Ready/API/deployment-ID kviitung ega asenda juba avatud vahelehe koodi.
Kontrolli raportis antud commit'i Ready / Production tulemust ja värskenda portaali.

## Saada selle jooksu täpne raport

Lõpus kuvatakse täpne asukoht:

```text
SAADA SEE FAIL: <selle jooksu absoluutne JSON-tee>
```

Finder valib sama unikaalse privaatse Downloads-koopia. Saada see fail siia.
Vana raportit ei otsita kausta uusima faili järgi. Algne päevik ja kõik koopiad
säilivad. Kui kopeerimine ebaõnnestub, näidatakse kontrollitud originaali;
Finderi vea korral kasuta prinditud rada. Kui raportit ei loodud, saada
`PEATATUD`-rida. Võimalikult aegunud viimase püsiraporti puhul lisa ka STOP-rida.

Muud `PEATATUD`-olekud vajavad selle konkreetse raporti ülevaatust. Ebaselge
SQL-tulemuse järel võib sama uuendaja ainult kontrollida täpset rakendatud seisu;
kirjutust automaatselt ei korrata. Päevikuid, intente, varukoopiaid, raporteid
ja väljaantud pakke ei kustutata ega nullita. Vanu provider-controls verify- või
paigalduskäske ei kasutata uue õigusseisu hindamiseks.

## Pärast selle sammu kinnitamist

Uus kitsas kasutuskatse puudutab hilinenud kinnitust: sama konto ühes vahelehes
avatud eemaldamiskinnitus peab jääma vana blokeeringu juurde, kui teises
vahelehes eemaldatakse see blokk ja luuakse uus. Vana akna kasutamine ei tohi
uut blokki eemaldada; muutunud seis vajab uut ülevaatust/kinnitust. Selle katse
juurde minnakse pärast raporti ja uue deployment'i kontrolli. Lõpetatud laia
kahe seadme blokeerimis-/saatmiskatset ei korrata põhjuseta.

Postkasti ja profiili varasemate mööduvate lugemistõrgete põhjus on eraldi
lahtine tähelepanek; käesolev parandus ei omista neile oletuslikku põhjust.
Üks praegune seis on `CURRENT_STATE.json`; detailne leping ja tõendipiirid on
`BLOCK_REMOVAL_20261113.md`.
