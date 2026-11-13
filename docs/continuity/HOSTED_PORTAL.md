# Praegune järgmine samm: kontrollpäringu parandusega paigaldus

13.11.2026 Europe/Tallinn. Ainult lugemise kontroll on tehtud: pilves on tugi
`absent`, kõik 16 kaitset vastavad ning Maci main/HEAD on `955c935`, tööpuu puhas.
JIT oli juba välja lülitatud. Uus eraldi pakk vähendab kontrollpäringu korduvat
planeerimist ja nõuab igas tehinguväravas täpselt üht sobivat tulemust.
Selle uue väljaande Maci/pilve käivitust ega edukat paigaldust veel ei ole.

## Üks uus käsk

Paki `selqiro-pakkuja-peitmine-parandus-20261113.zip` Downloads-kausta lahti:

```bash
python3 -I -B "$HOME/Downloads/selqiro-pakkuja-peitmine-parandus-20261113/uuenda.py" --publish
```

Uuendaja sihib sama `/Users/taivo/selqiro` hoidlat. Ta kontrollib värskelt
main-haru, täpset HEAD-i, kogu tööpuud/indexit, lähtefailide baite, kinnitatud
origin'i ja remote-main'i ning teenuste kehtivuse varasemat edukat receipt'i.
Probe’i puhas status ei asenda seda täielikku kontrolli.

Kolme varasema jooksu täpsed raportid ja olemasolevad lukud peavad säilima:
algne 13:33 katse, recovery 14:16:35 ning probe 15:26:39 koos oma pinnitud
nonce-kaustaga. Kõik kolm lukku avatakse ainult lugemiseks ja hoitakse kogu
uue töö jooksul. Täielikke baite, räsi, inode’i ja metaandmeid kontrollitakse
enne, töö käigus ja lõpus. Vanu päevikuid ega nende intente ei muudeta.

## Üks piiritletud katse oma uues päevikus

- Täpne värske `applied`: paigalduskirjutus jäetakse ära ja nõutakse eraldi verify'd.
- Täpne värske `absent` ning selle uue väljaande varasem intent/katse puudub:
  salvestatakse uus intent, tehakse kuni üks optimeeritud SQL-apply ja eraldi verify.
- `unknown`, muutunud alus või sama väljaande varasem kinnitamata katse:
  peatumine; absent ei anna automaatset kirjutuse kordamise luba.

SQL kasutab sama advisory transaction lock'i ja loeb seisu selle all uuesti.
Vahepeal valmis saanud võimekust ei paigaldata uuesti. Kataloogi räsivalemid,
kõik 16 kaitset, invariandid, hosted-kontekst ja 12 runtime-mooduli DDL säilivad.
Kontrollpäringu uus koostamine ja ranges vormis tehinguväravad on uue väljaande
osad; vana paki SQL-i ei kirjutata ümber.

CLI väline piir on lugemisel 90 s ja ühel apply-kutsel 180 s. SQL-i piirid on
lugemisel 20 s, paigalduslause puhul 45 s ning lukul 3 s. Raport säilitab etapi,
tegeliku kestuse, kasutatud piiri ja ohutu veakoodi. Kinnitamata protsessi
lõpetamise järel uut protsessi ei käivitata. Need piirid ei tõenda vana vea põhjust.

Alles eraldi kinnitatud andmebaasiseisu järel varundatakse asendatavad
lähtefailid, rakendatakse 122 faili delta, tehakse build ning täpne commit/push.
24 tunni peitmise ja eraldi püsiva blokeerimise rakenduse leping ei muutu.

## Saada selle jooksu täpne raport

Lõpus kuvatakse `VALMIS` või `PEATATUD` ja:

```text
SAADA SEE FAIL: <selle jooksu täpne absoluutne JSON-tee>
```

Finder valib sama unikaalse privaatse Downloads-koopia. Saada täpselt see fail;
ära otsi kaustast uusimat vana raportit. Kõik olemasolevad koopiad säilivad.
Kopeerimisvea korral näidatakse kontrollitud originaali. Kui Finder ei avane,
kasuta prinditud rada. Kui raportit ei loodud, saada `PEATATUD`-rida. Salvestusvea
korral võib viimane püsiraport olla aegunud: saada see koos peatumise reaga.

Peatumisel ei korrata algset/recovery paigaldajat, seda uut apply-katset ega
juba lõpetatud probe’i automaatselt. Päevikuid, intente, lock-faile, pakke,
raporteid, kontosid, kuulutusi, pilte ja sõnumeid ei kustutata.

## Pärast edukat push'i

Oota raporti **uue commit'i Ready / Production** tulemust Vercelis ja värskenda
portaali. Seejärel kontrollime kahe olemasoleva kontoga kaardi menüüd, 24h
peitmist, **Võta tagasi**, Minu ala haldust ja eraldi blokeerimist. Blokk keelab
uued sõnumid mõlemas suunas; olemasolev ajalugu säilib. Oma bloki eemaldamine
ei eemalda eraldi peitmist ega teise konto blokki.

Samasse kasutuskäiku kuuluvad vana avalehe ja jälgitavate voo päris
PostgREST-päring, fotod ja tõlked. Tootmise kellaaega või kasutajasisu ei muudeta
testi jaoks. Täpne 24h piir on kohaliku SQL-tõendi ulatuses; päris aegumise
vastuvõtt tekib hilisemas tavakasutuses. Tooteleping ja tõendite seosed:
`VIEWER_PROVIDER_CONTROLS_20261113.md`; üks seis on `CURRENT_STATE.json`-is.
