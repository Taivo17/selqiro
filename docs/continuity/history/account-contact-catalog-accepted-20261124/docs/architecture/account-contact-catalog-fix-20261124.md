# Selqiro — suhtluse kontoõiguste kontrolli parandus

24.11.2026. Eelmine kontroll peatus teatega `CLI_EXECUTION_FAILED`.
See on **uus parandatud kontrollipakett**, mis teeb ühe ainult lugemise päringu.

## Käivitamine

1. Paki `selqiro-suhtluse-konto-kontrolli-parandus-20261124.zip` Downloads-kaustas lahti.
2. Kopeeri Terminali see üks käsk:

```bash
python3 -I -B "$HOME/Downloads/selqiro-suhtluse-konto-kontrolli-parandus-20261124/kontrolli.py"
```

3. Saada vestlusse **selle uue käigu `SAADA SEE FAIL` real nimetatud JSON-fail**.
   Kontrollija valib faili Finderis.

Käsk ei vaja `--publish` lippu. Kui ilmub `PEATATUD`, saada sama käigu raport.
Vanu lõpetatud uuendajaid ega eelmist vigast kontrollipaketti uuesti käivitada pole vaja.

## Mis parandati

Kontrollipäring kasutas andmebaasireegli tingimuse lugemiseks funktsiooni, mis ei
oska selles kohas käsitleda viidet uuele reale (`NEW`). Sama tingimus on olemas
projekti kontrollitud lähtekoodis. Viga korrati eraldatud PostgreSQL-i katses.
Parandatud päring arvutab tingimuse räsi andmebaasis, tingimust teksti kujule
lahti tõlgendamata. Tingimuse ega funktsioonide sisu raportisse ei lisata.

Käivitaja salvestab äratuntavast veavastusest ainult lubatud veakoodi ja fikseeritud
vealiigi. Lisaks kontrollib ta lähtekoodi seisu ka pärast turvaliselt lõppenud
ebaõnnestunud päringut. Algne peatumise põhjus säilib raportis.

Eelmise raporti toorveateade puudus. Seetõttu on leitud päringuvea kohalik
kordamine tõendatud, kuid eelmise live-käigu täpne serveriviga jääb kinnitamata.

## Mida kontroll teeb

Kontroll seotakse endiselt vastu võetud versiooniga `e336a5b`: 2253 lähtefaili,
index, remote `main`, olemasoleva CLI ja projekti täpsed andmed ning viimase eduka
käigu originaalraport. Seejärel loetakse sama 11 funktsioonisignatuuri ja kolme
suhtluse seose piiratud metaandmed. Päring tehakse üks kord; automaatset korduskatset pole.

Kontrollipakett ei sisalda portaali ega andmebaasi muutmise sammu. Kontosid,
kuulutusi ja sõnumeid ei kustutata, nende sisu ei loeta. Samuti ei tehta uut
commit'i, push'i, Verceli build'i, sõltuvuste paigaldamist ega e-posti seadistust.
Selle kontrolli järel pole Vercelis uut versiooni oodata.

## Tõend ja järgnev töö

`evidence/preparation-checks.json` seob parandatud failid kohalike testide ja
sõltumatu ülevaatusega. `proof` sisaldab nende kontrollide lähteid ja tulemusi.
Eraldatud testid ei tähenda, et uus pakett on sinu Macis või live-andmebaasis juba käivitatud.

Saadud metaandmeid võrdleme lähtekoodiga enne kontakti alustamise ja uue sõnumi
saatmise kontoõiguste muudatust. Ka eduka kogumise korral jääb
`implementation_ready=false`: see kontroll ei aktiveeri konto sulgemist.
Olemasoleva aktiivse vestluskaaslase ajalugu ning varasemad korduspäringute
kviitungid peavad järgmises arenduses säilima.

Uudiste varasem kavand säilib: ühe avaldaja plokis kuni neli eelvaadet ning
„Vaata kõiki” sama perioodi kuulutuste avamiseks. Uudiste lehte selle paketiga ei muudeta.
Tööjärg: **konto elutsükkel → Uudised → esiletõstmine → reklaamid**.

Paketi `docs` ja `doc-updates` on järgmise sisulise muudatuse jaoks ettevalmistatud
üleandmine. Kontrollija neid projekti ei paigalda. Varasemad paketid ja raportid säilivad.


## Täpne ülevaatus ja lepingu piir

Tagastatud v1 raport: 31914 baiti; SHA-256 `572a34d8e58437dbe5d9e77ed1f8f6dc7ac4b7b71aadc15a0023329770679602`.
Ülevaatus on `proof/review/independent/stopped-report-review.json`.
V1 väljastatud SQL, manifest ja runtime jäävad muutmata.

V2 kataloog kasutab välja `when_tree_sha256`, mille sisend on `pg_trigger.tgqual::text`.
Sisemine parse-puu võib sisaldada objektiidentifikaatoreid ja sõltub serveriversioonist.
Selle räsi võrdlus ei tõenda eri andmebaaside tingimuste semantilist võrdsust.
Kogu triggeri definitsiooni räsi arvutatakse jätkuvalt `pg_get_triggerdef` abil;
see ei käivita triggerit ega ava selle teksti raportis. Päringu scope ja piirid säilivad.

V1 protsess lõpetas korrektselt, kuid query exception möödus allika järelkontrollist.
V2 peab kontrollitud protsessilõpu järel tegema järelkontrolli ka päringu/parsingu vea korral,
säilitades esmase vea ja eraldi järelkontrolli tulemuse. Protsessi lõpu kinnitamata jätmisel
ei tohi selle kontrolli nimel uusi Giti käske käivitada.

Veateate vaba tekst, detailid, SQL, võtmed ja toorlogid ei kuulu eksporti.
Ainult rangelt tuvastatud piiratud veavormist saadud lubatud kood/liik on eksporditav.
Tundmatu või mitmetimõistetav viga jääb tundmatuks. Raporti iseeneslik edukaks märkimine
ega ühe failed päringu automaatne kordamine ei ole lubatud.

Ettevalmistuse kontrollid: 34 käivitaja fixture-testi, 9 eraldatud PostgreSQL 17.6 kontrolljuhtu ja 11 v2 parsija juhtu läbisid. Vana päringu viga korrati NEW ning OLD koos NEW-ga tingimustes; tingimuseta ja ainult OLD juhud läbisid. Sõltumatu ülevaatus PASS, blokeerivaid leide ei ole.

Need on kohaliku paranduse tõendid, mitte Maci/live-edu. Selle paranduse käivitaja ei
paigalda dokumentatsiooni. Kõigi varasemate pikkade logide sisu jääb baidiprefiksina alles.
