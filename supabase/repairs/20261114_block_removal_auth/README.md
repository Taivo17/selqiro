# Blokeeringu kontrolli Auth-õiguste parandus — 14.11.2026

## Põhjus ja tõendipiir

13.11.2026 väljastatud blokeeringu eemaldamise paketi SQL-osa ei rakendunud.
14.11.2026 kell 14:12:26 UTC väljastas PostgreSQL kaks hoiatust
`01007`: `no privileges were granted for "auth"` ja
`no privileges were granted for "uid"`. Seejärel peatas muudatuse
`55000 BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED`. Eraldi järelkontroll
tuvastas sama algse `absent`-seisu ning üheksa kehtivat sõltuvuskontrolli.
Avaldatud kliendi paigaldust selle parandusega ei korrata.

Veas ei olnud tegemist puuduvate superkasutaja õigustega kogu paigaldajale.
Majutatud `postgres` saab `auth.uid()` välja kutsuda, kuid tal ei ole õigust
anda uuele rollile hallatava Auth-skeemi ega funktsiooni õigusi. Eelmise
kohaliku katse Auth-skeem ja `auth.uid()` kuulusid `postgres`-ele ning see
oluline erinevus jäi selles katses katmata.

See on uus eraldi paranduskataloog. Ükski
`20261113_block_removal` fail ega varem väljastatud pakett ei muutu.

## Muudatus

`03_cas_delete_authority.sql` loob
`provider_controls_private.current_block_actor_v1()` funktsiooni. See on
`postgres`-ele kuuluv, parameetriteta `STABLE SECURITY DEFINER` funktsioon,
mis tagastab üksnes olemasoleva `auth.uid()` tulemuse. Selle otsingutee on
fikseeritud `pg_catalog,pg_temp` ning Auth-funktsiooni nimi täielikult
määratud. Funktsiooni täitmisõigus antakse ainult kitsale blokeeringu
eemaldamise rollile; `PUBLIC`, `anon`, `authenticated` ja `service_role`
seda õigust ei saa. Funktsioon ei kuulu avalikku API-skeemi.

Uus eemaldamisroll kasutab seda funktsiooni kolmes kohas:

- enda blokeeringute lugemise ja eemaldamise RLS-tingimustes;
- täpse rea tunnuse ja loomise aja kontrolliga eemaldamisfunktsioonis;
- kustutamist kontrolliva `SECURITY INVOKER` triggeri enda haru sees.

Auth-skeemile ega `auth.uid()` funktsioonile ei anta ega võeta õigusi.
Nende omanikud ja definitsioonid jäävad samaks. Uuel eemaldamisrollil
puudub Auth-skeemi `USAGE` õigus. Privilegeeritud hoolduse eraldi haru
kasutab endiselt otse `auth.uid()` ning töötab vaid `postgres` või
`service_role` rolli ja täiesti puuduva JWT-konteksti korral. Trigger ei
eelda `AND`-avaldiste hindamisjärjekorda selleks, et lubada hooldust ilma
uue privaatse funktsiooni täitmisõiguseta.

`01_legacy_block_guard.sql`, `02_browser_permissions.sql` ja
`04_cas_setter.sql` on väljastatud versiooniga bait-baidilt samad.
Blokeeringu versiooni kontroll, vana hilinenud eemaldamiskäsu keeld,
brauseri piiratud INSERT ning rea tunnuse ja aja määramise keeld säilivad.
Paigaldus ei muuda kasutajate ridu. Peitmise 24 tunni reegel, vastassuunaline
blokeering, sõnumikeeld, vestluste ajalugu ja olemasolevad rollipiirid säilivad.

## Kataloogi kontroll ja atomaarne paigaldus

`preflight.sql` ja `verify.sql` on identsed ainult lugemiseks mõeldud
kataloogipäringud. Raporti leping on jätkuvalt `block-removal-cas-v1`,
üheksa sõltuvuskontrolli ja kolm muutumatuse räsi. Uus paigaldajatingimus
kontrollib lisaks olemasolevat Auth-skeemi `USAGE` ja `auth.uid()`
`EXECUTE` õigust; õiguste edasiandmist ei nõuta.

Algse täpse `absent`-seisu ja sõltuvuste räsid jäid samaks:

| Fakt | SHA-256 |
| --- | --- |
| Algne `absent` | `db5cbe0aca4e7205a85358cc7586f4d974004b036148b43946b02c6c595f4c56` |
| Uus `applied` | `38eb0ad0d95edc9b4425da9a615ea8b3305623cb7f7bb5da274c35603d24c854` |
| Sõltuvused | `bf0110bd2cf73197cfd513f4fa03033a465c8d0a37c52062bc0cdca1906e4848` |

Rakendatud seisu räsi hõlmab kolme privaatse funktsiooni omanikku,
definitsiooni räsi, seadeid ja ACL-e; rolli kõiki omadusi ning liikmesusi;
uusi RLS-tingimusi, triggerit, tabeli/veergude/jada õigusi ning uusi
skeemi/funktsiooni õigusi. Auth-i uued õiguste kirjed peavad olema tühjad.

`apply.sql` kasutab ühte tehingut, olemasolevat sama nõuandelukku,
`user_blocks` tabelilukku ning enne ja pärast täielikku kataloogikontrolli.
Luku ooteaeg on kuni 3 sekundit ja SQL-lause tähtaeg 45 sekundit;
lugemiskontrollil on 20 sekundi tähtaeg. Täpne rakendatud seis on lubatud
ilma uut DDL-i tegemata. Tundmatu või osaline seis peatab töö.
Paigaldaja peab kasutama ainult selle kataloogi uut `apply.sql` faili.

| Fail | SHA-256 |
| --- | --- |
| `preflight.sql` ja `verify.sql` | `fac12a87ea032f8a5524ce16713dd602b9854c919e4a236c54482d33fe293b9a` |
| `apply.sql` | `c006cb9c095dd2a02b58f93afae5ac42b27067d247796e307105b83348b918f5` |
| `changes.sql` | `5396eeb57d4e6dd91816301d37d7d6362caf42f0e2789597cf7d0c53deda2905` |

## Kohalikud tõendid

Kõik järgnevad katsed käisid eraldatud PGlite PostgreSQL/WASM andmebaasis.
Paigaldaja roll oli `postgres`, `rolsuper=false`, `rolcreaterole=true`.
Auth-skeemi omanik oli `supabase_admin` ning `auth.uid()` omanik
`supabase_auth_admin`. Paigaldajal olid kutsumisõigused, kuid mõlema
õiguse edasiandmine oli keelatud. Need õigused loodi ainult sünteetilise
katsekeskkonna seadistamisel; päristeenuse poole ei pöördutud.

- `original-failure-reproduction.json`: täpne vana väljastatud
  `apply.sql` reprodutseeris mõlemad `01007` hoiatused ja lõpliku
  `55000` keeldumise. Tagasipööre säilitas kõik vaadeldud read,
  Auth-i omanikud/ACL-id/definitsiooni ning täpse algse kataloogiseisu.
- `guard-generation-result.json`: uus tehing rakendus samas piiratud
  keskkonnas, sõltumatu lugemine kinnitas selle, korduv rakendatud
  haru ei muutnud ridu ega kataloogi. Auth jäi muutumatuks.
- `runtime-result.json`: 13 sihitud kontrolli läbisid. Nende seas on
  tegelik CAS-kutse Auth-skeemi õiguseta privaatse rolli all, selle rolli
  RLS, privaatse funktsiooni API-le sulgemine, vana definer-keha
  jõudmine keelava triggerini, aegunud kinnituse keeldumine, teise konto
  kaitse, rea tunnuse/aja võltsimise keeld ning vestluse ajaloo ja
  vastassuunalise blokeeringu säilimine. Mõlema hooldusrolli
  anonüümse, vigase või osalise JWT-kontekstiga kustutamine keeldus.
- `installation-result.json`: 7 paigalduskontrolli ja 11 kataloogi
  tahtliku rikkumise juhtumit läbisid. Uue actor-funktsiooni avalik
  EXECUTE, `SECURITY INVOKER` või muudetud otsingutee annavad tundmatu
  seisu. Osaline DDL, puuduvad või mitmesed raportiread ning NULL-i
  sisaldav järeltingimus pööravad tehingu tagasi.

Katseandmed ja Auth-i funktsioon on sünteetilised; need ei tõenda värsket
pilvepaigaldust ega samaaegsete pärisühenduste üleminekukatset. Tegelik
rakendumine vajab paigaldaja eraldi järelraportit. Vana definer-keha test
tõendab triggeri rollipõhist keeldu, mitte serveri ühenduste ajastust.

Katsete käivitamisel kasutatakse säilitatud SQL-de deklaratsioone ja
testide fixture-faile, mitte varasemaid testikomplekte või paigaldajaid.
Sisendite räsid ja nende muutumatuse kontroll on iga uue tulemuse juures.
PGlite mooduli tee antakse kohaliku käivituse korral keskkonnamuutujaga
`SELQIRO_PGLITE_MODULE`; teste ei kasutata pärisandmebaasi vastu.
