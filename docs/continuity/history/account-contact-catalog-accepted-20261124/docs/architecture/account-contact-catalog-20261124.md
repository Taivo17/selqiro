# Suhtluse kontoõiguste piiratud eelseisu kontroll

24.11.2026 · **Ette valmistatud ainult lugemise diagnostika; live-tulemus ootel.**

## Eesmärk ja alus

Järgmine kontoelutsükli moodul peab kontrollima kontakti alustaja ning uue sõnumi
saatja ja saaja konto kättesaadavust. Olemasoleva aktiivse teise osapoole ajalugu ja
korduskviitungid peavad säilima. Ühine actor-abiobjekt osaleb ka ajaloo ja piltide
teedel; selle muutmine ilma otseste sõltuvuste eelseisu kontrollita võib muuta
rohkem kui uut kontakti/saatmist.

Ainus alus: `e336a5b9d02845c688def778babeac0f1e3fec95`, puu `7734a70aa174b25b2ce5cc85aca3c0fa4e628624`, 2253 faili.
Viimane aktsepteeritud job-read originaalraport on seotud manifestiga
`29afa6977d0e5097b1082bee9bb16dd9218c89816c5de1b93f3f2b54c23a250d` ja
raporti SHA-256-ga `76ee0b1d3dc42838b7ddcafec65c4903638da50adb43a90cff1a271f6f97c629` (1367929 baiti).

## Kogutav ulatus

Fikseeritud päring vaatleb 11 täpselt määratud funktsioonisignatuuri, kolme
seose (`conversations`, `messages`, `conversation_participants`) õiguse-, RLS-
ja triggerimetaandmeid ning üksnes nende otseseid mitte-sisemisi triggereid.
Täpsed nimed, lubatud vormid ja ülempiirid on paketi `scope.json` ja
`catalog_contract.py` failides. Sõltuvusi rekursiivselt ei laiendata.

Job-contact RPC ja `jobs_private.contact_snapshot` on juba viimases
aktsepteeritud raportis pin'itud; neid ei küsita uuesti. Funktsioonide kehad,
kontoridade sisu, sõnumid, vestluste sisu, seansid ega võtmed ei kuulu eksporti.
Metaandmed hõlmavad signatuuri, omanikku, konfiguratsiooni, ACL-i ning vajalikke
räsisid. Tundmatu räsi on vaatlustulemus, mitte automaatse paranduse alus.

## Käivitaja piirid

Paketis on üks kontrollija, üks fikseeritud SQL ning range vastuse parsija.
Kontrollija kontrollib enne päringut täpset kohalikku aluspuud/indexit, remote
main-i, varasema eduka originaalraporti säilimist ning olemasolevat CLI ja projekti.
Varasema käigu lukk avatakse ainult lugemiseks; uus privaatne päevik on eraldi.
Pärast vaatlust kontrollitakse kohalikku lähtepuud ja originaalraportit uuesti.

SQL kasutab READ ONLY tehingut ja lõpeb ROLLBACK-iga; rakenduse RPC-sid ei
kutsuta. Uue käigu väljund on privaatne raport ja unikaalne Downloads-koopia.
Käsurida annab täpse `SAADA SEE FAIL` tee ning valib faili Finderis.
Täiskehade/toorvigade eksporti, wildcard-kataloogi, dump'i ega kaugeleulatuvat
otsingut ei tehta. Andmebaasi, Authi, Storage'i, SMTP, DNS-i või sõltuvuste
muudatusi ei ole. Kood, index ja sõltuvused säilivad; build'i/teste ei käivitata
kasutaja Macis ning commit'i/push'i ei tehta.

## Tõend ja järgnev töö

Ettevalmistuse kontrollid: 24 käivitaja fixture-testi, 12 eraldatud PostgreSQL 17.6 kontrolljuhtu ja 31 range parsija juhtu läbisid; sõltumatu ülevaatus PASS, blokeerivaid leide ei ole.
Need on eraldatud kohalikud fixture-kontrollid. Juurde on lisatud sõltumatu
ülevaatus ning sisendite räsid. Need ei kinnita veel kasutaja Maci ega live-kataloogi
tulemust. Rakenduse tootmisbuild'i selle diagnostika jaoks ei korratud.

`coverage=complete` näitab ainult nimetatud metadata kogumise katvust.
`implementation_ready=false` jääb ka edukas diagnostikas alles. Saadud raporti
järgmine ülevaatus seob selle täpse aluspuu ja eelneva raportiga ning võrdleb
funktsioonipine olemasoleva lähtealusega. Kui kehapin on tundmatu, tuleb
vajadusel teha kitsas täpselt nimetatud kehalugemine; kogu andmebaasi dump'i
see ei õigusta.

Konto sulgemine/taastamine/kustutamine, suhtluse õiguse SQL muudatus ja Uudiste
rakendus ei ole käesoleva diagnostika tulemus. Nende teostus jätkub kontrollitud
raporti alusel, senise kasutajaandmete säilitamise lepingu piires.
