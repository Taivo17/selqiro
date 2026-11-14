# Praegune samm: blokeeringu serveriõiguste parandus

14.11.2026 Europe/Tallinn. Klient on juba avaldatud commit’is
`29b2457893d6fa9bab2756533319fdc13b841840`; selle Maci build/push, Ready /
Production ja kaks täpset avaliku kliendimärgi vastust on vastu võetud.
Uus samm muudab ainult SQL-allikaid ja järjepidevusdokumente. Kliendi build’i,
läbitud klienditeste ning uut Ready-kuvatõmmist selle sammu tõttu ei nõuta.

## Miks on eraldi parandus

Vana uue-õiguse paigaldus tegi ühe SQL-katse ja peatus 14.11 kell 16:12.
Serverilogi kinnitab, et `auth`-skeemi ja `auth.uid()` õiguste andmine
kitsale privaatsele kirjutajale ei lisandunud. Täpne paigalduse lõppkontroll
katkestas tehingu; eraldi kontroll näitas algset `absent`-seisu, kõiki üheksat
kaitset ja muutmata invariande. Vana katset ega selle väljaannet ei korrata.

Eraldi parandus kasutab olemasoleva kontrollitud `auth.uid()` kutse jaoks
väikest privaatset, nullargumendiga postgres-omanikuga funktsiooni. Selle
EXECUTE on ainult kitsal CAS-kirjutajal ja omanikul. RLS, kustutaja ning
trigger kasutavad sama funktsiooni. Auth-skeemi ega `auth.uid()` õigusi ei
muudeta, JWT-parsimist ei dubleerita ning püsivat SET/INHERIT-õigust ei laiendata.

## Kohalik kontroll

Piiratud õigustega sünteetilisel SQL-alusel läbisid 13 käitumisjuhtu ja
7 paigaldusjuhtu koos 11 õiguste/kataloogi rikkumiskatsega. Sama alus
kordas vana SQL-i täpseid õigusehoiatusi ja tagasipööret. Runneri 24
sihitud kontrolli läbisid. Väljastatud pakendi täpne kontrollseos on
`kontrollid/loplik-kontroll.json`. Need tulemused ei tähenda uue paranduse
rakendamist Macis või päris Supabase’is; seda näitab uue jooksu raport.

## Üks uus käsk

Paki `selqiro-blokeeringu-parandus-20261114.zip` Downloads-kausta lahti:

```bash
python3 -I -B "$HOME/Downloads/selqiro-blokeeringu-parandus-20261114/uuenda.py" --publish
```

Käsk kontrollib tegelikku `/Users/taivo/selqiro` main-haru, 29b2457 alust,
kogu indexit/tööpuud/lähteallikat ja kinnitatud remote’i. Vana ebaõnnestunud
päeviku täpseid baite hoitakse ainult lugemiseks lukus. Päevikut ei nullita;
parandusel on eraldi väljaanne, oma päevik ning üks uus kontrollitud intent.

Järjekord: värske lähte/päeviku/remote’i kontroll → andmebaasi algne `absent`
seis samade invariantidega → juba avaldatud kliendi täpne avalik märk →
piiratud uue SQL-i ja dokumentide rakendamine tööpuusse → värske andmebaasi/lähte/märgi
kontroll → üks kaitstud SQL-tehingukatse → eraldi järelkontroll → täpne
Git-staging ja commit/push. Kui selle uue katse SQL on rakendunud, kuid commit katkeb,
kontrollib jätk tegeliku rakendatud seisu ja lõpetab allikad ilma SQL-i kordamata.

Kogu vana `supabase/repairs/20261113_block_removal` säilib. Uus SQL asub
`supabase/repairs/20261114_block_removal_auth` all. Paigaldus ei muuda kasutajate
blokeeringu- või peitmisridu, kontosid, kuulutusi, pilte ega sõnumeid. Storage’i
ja teenuste ühendamise toiminguid ei lisata. Brauseri täpse versiooni nõue
ning kitsad serveri õigused säilivad.

## Saada selle jooksu täpne raport

Terminal näitab ja Finder valib selle jooksu faili:

```text
SAADA SEE FAIL: <selle jooksu absoluutne JSON-tee>
```

Saada just see unikaalne privaatne Downloads-koopia. Originaalpäevik, vana
katse intent ja kõik varasemad raportid säilivad. Kopeerimistõrke korral
näidatakse kontrollitud originaali; Finderi tõrke korral jääb täpne tee
terminali. Kui raportit ei loodud, saada `PEATATUD`-rida. Võimalikult aegunud
püsiraportile lisa ka peatumisrida.

`PEATATUD`-tulemus vajab konkreetse raporti ülevaatust. Uue SQL-katse järel
saadud tundmatu või `absent`-seis ei luba uut kirjutust. Ära käivita vana
`selqiro-blokeeringu-kontroll-20261113` uuendajat, ära kustuta/reset’i
päevikuid ega intente ning ära käivita SQL-i käsitsi.

## Järgmine kasutuskatse

Pärast uue paranduse täieliku raporti vastuvõttu jääb üks kitsas kontroll:
sama konto ühes vahelehes avatud vana eemaldamiskinnitus ei tohi eemaldada
teises vahelehes vahepeal uuesti loodud blokeeringut. Muutunud seis tuleb
uuesti üle vaadata ja eraldi kinnitada. Varem vastu võetud peitmise ning
kahe seadme blokeerimise/saatmiskatse kordust ei nõuta.

Üks praegune seis on `CURRENT_STATE.json`. Täpsed tõendid ja nende piirid on
`BLOCK_REMOVAL_AUTH_REPAIR_20261114.md`-s. Selle juhendi olemasolu ei tõenda
uue paranduse Maci rakendamist, SQL-edu ega uut commit/push’i.
