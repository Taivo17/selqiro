# Hobusepaketi eelkontrolli parandus

Seis: 08.11.2026. See dokument selgitab esimese hobusepaketi peatust ja r2
ettevalmistust. Praegune järgmine tegevus on `CURRENT_STATE.json`-is.

## Päris kasutajalt saadud tõend

Algse `selqiro-hobused-20261108` paketi `result.json` kinnitas peatuse
`DATABASE_PRECONDITIONS_NOT_MATCHED`. See toimus enne SQL-i rakendamist ja
enne lähtefailide muutmist. Koostamist, commit'i ega push'i ei tehtud.
Paketi tunnus oli
`575e990e8a7e8702564eadc045cb10507618da0758283741d05436980308d734`.
Selle peatunud paigalduse raport ja päevik säilivad.

Seejärel saadeti `selqiro-hobuste-kontrolli-raport-20261108-124234-84cc6cc8.zip`.
Koguja lõpetas 08.11 kell 10:42:37 UTC ehk 12:42:37 Eesti aja järgi.
Raporti manifesti kõik failiräsid ja ZIP-i CRC kontrolliti; erinevuste loend
arvutati saadud kataloogist eraldi uuesti ning vastas kõigis 15 kirjes.

| Tõend | Tulemus |
| --- | --- |
| main HEAD | `92408b6ceb7a9fec3119d35a86c9bb47628acf22` |
| Lähtefailid | 1106, puhas tööpuu; peatunud raporti indeks võrdub täpse keelealusega |
| Enne/pärast projekt ja indeks | Identsed |
| Andmebaasitoiming | Ainult süsteemikataloogi lugemine, read-only tehing |
| Andmebaasikirjutused, Storage, rakendus- ja Giti kirjutused | Puuduvad |
| Funktsioonid | 171; kood, argumendid, tulemus, omanik ja muud mitte-ACL faktid kattuvad |
| Struktuurid/poliitika-autoriteet/vaated | 5 / 2 / 3; kõik kattuvad |
| Erinevused | Viie funktsiooni ACL, kaks rolliliikmesust ning nende koondräsid |

Raporti ZIP SHA-256:
`11e413f9f3f611a93008660977c3395a1b3d3aa8dadcacbb4201a8257925a948`.
Kataloogifaili SHA-256:
`560748ade20fbb337841390a34309e5b65b9c5798f1fa8b41141abe51c2df9f0`.
Peatunud paigalduse raporti SHA-256:
`b49931e904029c0b5bdca59692156387621a9a58428df544e127bc6e5c3e0221`.

## Põhjus ja säilitatud lähteallikad

Esimese paketi testmudel ei taastanud täielikult Supabase'i seniseid
vaikeõigusi ega PostgreSQLi eri grantor'iga rolliliikmesust.

- `20260722173530_baseline_20260722.sql` annab postgres'e loodavatele
  avaliku skeemi funktsioonidele EXECUTE vaikeõigused rollidele `postgres`,
  `anon`, `authenticated` ja `service_role`.
- `20260913190000_add_owner_horse_offer_draft_update.sql` eemaldab abistajatelt
  `advance_horse_offer_edit_revision_v1()` ja
  `apply_horse_offer_draft_patch_v1(horse_offers,jsonb)` PUBLIC/anon/authenticated
  õigused. See jätab senise `service_role` õiguse alles. Kummagi funktsiooni
  kood ja turvaomadused vastavad säilitatud migratsioonile.
- `20260822130000_add_publication_policy_acceptance_foundation.sql` kolme
  poliitika-triggeri PUBLIC EXECUTE kõrvale jäävad vaikeõigustest ka eksplitsiitsed
  anon/authenticated/service_role kirjed. Need lisakirjed ei muuda selles
  võrdluses õiguste tähendust, sest PUBLIC oli juba olemas.
- `listing-publication-hosted-preview-v1/20_publication_core.sql` ja
  `40_read_models_and_owner.sql` säilitavad kommentaari ja käsu järgi PostgreSQLi
  automaatse rolli looja ADMIN-kirje. Tootmise grantor on `supabase_admin`.
  Mõlemal writer-rollil on selle kirje `admin=true`, `inherit=false`, `set=false`.
  Teine, postgres'e eksplitsiitne kirje on `admin=false`, `inherit=true`, `set=true`.

Mõlemad writer-rollid jäävad NOLOGIN/NOSUPERUSER/NOCREATEDB/NOCREATEROLE/
NOINHERIT/NOREPLICATION/NOBYPASSRLS rollideks. CREATE puudub nii avalikus kui
avaldamise privaatses skeemis. anon/authenticated/service_role liikmesus neis
rollides puudub. Tootmise raport kinnitas need kontrollid eraldi.

## Paranduse piir

r2 taastab need konkreetsed, säilitatud allikaga selgitatud faktid eraldatud
testandmebaasis ja genereerib nende pealt uued täpsed eelkontrolli räsid.
See ei aktsepteeri suvalist tootmiserinevust ega eemalda õiguste/rollide
kontrolli. Seniseid õigusi või liikmesusi ei kirjutata vastavuse saavutamiseks
tootmises ümber. Uus manifest annab eraldi paigalduspäeviku; algset peatunud
päevikut ei muudeta, kustutata ega kasutata r2 kirjutusloana.

Tõendatud sõltuvuste räsi on
`81962c0ac8b2897f130a4ae8b597f16f04a81ca49646c0b74d7076622ddd2f38`.
Tõendatud rollifaktide räsi on
`5396463813a58a0ac5d14c53859a5eb11bdd9b896e8659c546f0f9168232f6ca`.

Hobuse rakenduse 499 runtime-faili ja seitse SQL-i võimekusmoodulit 01–07
säilivad bait-baidilt. Senine ehitamise ja 162 kliendi/serveri testi tõend
kehtib samade sisendite kohta; neid ei esitata uue käitamisena. Paranduse
SQL-paigalduskaitsete ja uuendaja tulemused on lõpliku r2 paketi kõrval olevas
`selqiro-hobused-20261108-r2-kontroll.json` aruandes.

Uute funktsioonide õigused kontrolliti eraldi ka siis, kui testandmebaasis olid
aktiivsed neli säilitatud avaliku skeemi vaikeõigust. Seitse muutmata moodulit
andsid sama oodatud lõpptulemuse: uued RPC-d sulgevad vaikeõigused ja annavad
ainult oma lepingus nõutud ligipääsu. Tootmise seadeid selle katse jaoks ei muudetud.

## Järgmine samm ja tõendi piir

Kasutaja käivitab uue r2 paketi `HOSTED_PORTAL.md` käsuga. Paigaldaja kontrollib
enne kirjutust uuesti tegelikku lähtepuud ja andmebaasi. Edu korral järgneb
build, üks commit ja tavaline push. Pärast sama commit'i Ready / Production
tulemust tehakse üks hobuse avaldamise, avaliku nähtavuse ja hilisema muutmise
kasutuskatse. Alles see kinnitab portaali tegeliku hobusevoo.

Kohalik PostgreSQL/WASM, sünteetilised Storage'i metaandmed ja ajutine Giti
hoidla ei ole päris pilvepaigalduse või brauseri vastuvõtt. Teenused ning
töökuulutused järgivad sama kasutusloogikat järgmistes etappides.
