# Foto-valiku ZIP-i parandus r2 — 07.11.2026

## Täpne kasutaja tõend

Kasutaja kinnitas, et ZIP on lahti pakitud. Terminalipildil on käivitatud
`selqiro-foto-valik-20261107/uuenda.py --publish`, mille ainus uus tulemus on
`PEATATUD: PACKAGE_EXTRA_FILE_REFUSED`. Eelmise fotode kiirenduse väljund
teatab edukast build/commit/push’ist commit’iga
`832c6a4c0e97c6b883a81f63ca1821ef3b192cb3`. Värsket Verceli Ready-rida selles
pildis ei ole; seda ei tuletata terminali eduteatest.

## Põhjus

Väljastatud ZIP-i SHA-256:
`78347f278cb651bfee5bc738d270435c245be58cc98e3971ac50e600bebed0ad`.
See sisaldab 32 faili, neist kaks pole uuendaja paigutusreegliga kooskõlas:

- `kontrollid/capacity-tests.log`
- `kontrollid/feature-build.log`

Need failid lisas assistent pärast esialgse 20-failise koosseisu kontrolli.
Tõendifailide kaustas lubatakse ainult .json ja .md faile. Lõpliku ZIP-i CRC
ja baitide kontroll läbis, kuid sama ZIP-i read_package jäi käivitamata.
Seetõttu varasem tarne PASS ei tõendanud väljastatud terviku käivitumist.

Täpsest ZIP-ist lahti pakitud sisu kordab sama peatuse. read_package on
run_delivery esimene samm. Eelkäija lugejat, Journalit, Git-käske, lähtefailide
kirjutust, build’i, commit’i ega push’i ei käivitata. Kõigi nende vaatlejate
arv oli taasesituses 0. Uut result.json-i ei teki, sest Journalit pole loodud.
Selle peatuse puhul piisab kasutaja terminalipildist; raportit pole vaja küsida.

## Parandus

Uus kaust/ZIP on `selqiro-foto-valik-20261107-r2`. Kaks tõendit tarnitakse
sama sisuga nimedega `capacity-tests-log.md` ja `feature-build-log.md`.
Vanas väljastatud ZIP-is ega kasutaja Macis faile ei nimetata ümber ega kustutata.
Eraldi r2-kaust väldib vana koosseisu lisafailide jäämist uude lahtipakkimisse.

Uuendaja ja prior_release.py jäävad bait-baidilt samaks. Sama on eelkäija
profiil ning kolm runtime-faili ja kaks rakenduse testi. Räsikaitset ja
failitüüpide lubatud loendit ei laiendata. Praeguse seisukirje, sellest
loodud üleandmise, käivitusjuhise ja päeviku täiendused kuuluvad r2 uude
manifesti. Maci tegelik lähtealus kontrollitakse endiselt enne kirjutusi.

## Sihitud kontroll

Rakenduskoodi varasem täielik build, 58 sihitud testi ja 7 brauserijuhtu on
sama koodiversiooni tõendid ning neid ei korrata pakendamisvea tõttu.
R2 tarne kontroll kasutab kogu uut koosseisu ja sama uuendajat ajutise kohaliku
Giti/remote’iga. Tegelik rakenduse build on selles tarnekatses asendatud
kontrolliga; tootmise toiminguid ei tehta.

Enne r2 väljastamist kontrollitakse kogu lõplikust ZIP-ist eraldi kataloogi
lahti pakitud sisu samade read_package reeglitega. See peab toimuma pärast
kõigi tõendifailide lisamist. Keelatud .log faili lisamine eksklusiivsesse
negatiivkontrolli peab endiselt peatuma. Rakenduse, SQL-i, Storage’i ega
õiguskontrolli regressiooniteste selle pakivea parandamiseks ei laiendata.

Üks praegune käsk on HOSTED_PORTAL.md-s. R2 tegelik Maci rakendus ja uus
Verceli deployment on kuni kasutaja järgmise tulemuseni ootel.
