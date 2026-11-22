# Oma tööde loendi lugemislukk

## Tõend ja ulatus

22.11.2026 `get_my_jobs_v1` Response näitab PostgreSQL-i koodi `55P03` ja teadet `canceling statement due to lock timeout`. Kasutaja nägi ebaõnnestunud lugemist ja järgnevat edukat katset. Konkreetne blokeeriv tehing ei ole teada.

Vastu võetud lähtebaas `78aea6f` sisaldab üht katkestatavat 350 ms viivitusega lisakatset. See jääb samaks. Käesolev parandus muudab ainult `public.get_my_jobs_v1(uuid,uuid,integer,jsonb)` andmebaasifunktsiooni. Jagatud kirjutamise abifunktsioone ei muudeta.

## Põhjus lähtekoodis

Vana loend läbib `jobs_private.require_actor` → `listing_publication_private.require_actor` → `public.lock_listing_creation_actor_v1`. Kirjutamise kontroll võtab konto profiilirea `FOR UPDATE` luku ning mitmele õiguste reale `FOR SHARE` luku. See on kirjutamisel vajalik senise järjekorra säilitamiseks. Üksnes loendi lugemine ei vaja nende õigusridade muutmise välistamist.

Uus RPC on `STABLE SECURITY DEFINER`. See loeb konto, hosted-seaded, lubatud aktori, aktiivse identiteedi, eraisiku omaniku ja ettevõtte aktiivse liikmesuse sama välise SQL-lause snapshot’i järgi. Samale snapshot’ile toetub tööde loend. Kontrollide senine järjestus ja veateated säilivad; isolatsiooniks nõutakse endiselt `READ COMMITTED`.

Üks pooleliolev lugemine võib lõpetada selle alguses kehtinud õigusega ka siis, kui õigus vahepeal teises tehingus tühistatakse. Järgmine SQL-lause peab nägema tühistamist ja keelduma. Seda ei esitata üle kõikide lugemiste serialiseeritud õiguse tühistamisena. Nii välditakse sama vastuse sees vana õiguse kombineerimist hilisema töö sisuga.

`STABLE` RPC peab töötama `READ COMMITTED READ ONLY` tehingus. Kõik andmebaasi lugevad pesastatud õiguste abifunktsioonid on `STABLE`; olemasolev cursor-helper töötleb ainult talle antud argumente. Uusi helper-funktsioone ega õiguste laiendusi ei lisata.

## Säiliv serverileping

- Konto ID tuleb senisest autentitud serverikontekstist ja peab võrduma oodatud kontoga.
- Konto aktiivne identiteet peab võrduma päringu identiteediga ning olema aktiivne ja kontole lubatud.
- Eraisik peab olema selle identiteedi omanik; ettevõtte identiteet vajab aktiivset ettevõtet ja aktiivset liikmesust.
- Hosted-keskkonna lubamine, valmidus, privaatse Storage-bucket’i leping ja aktori lubatud nimekiri jäävad kohustuslikuks.
- Lehekülje piir, cursor, järjestus, oma suletud/peatatud/aegunud tööde nähtavus, täpsed summad ning kõik vastuse väljad säilivad.
- `SECURITY DEFINER`, omanik, ACL, `search_path=pg_catalog,pg_temp`, UTC ja senine kahe sekundi `lock_timeout` säilivad. Ridade kirjutamislukkude vältimine ei kaota tabelite struktuurimuudatuste võimalikke lukke.

Lugemise kontrollid paiknevad ühes piiratud RPC-s. Kuna need peegeldavad kirjutamise autoriteeti, peab tulevane konto, identiteedi, hosted-lubamise või liikmesuse reegli muutus vaatama üle mõlemad teed ja nende vastavuskatsed.

## SQL-i rakendamine

Uus repair-kaust sisaldab algmoodulit ning räsiga seotud `preflight.sql`, `apply.sql` ja `verify.sql` faile. Maci uuendaja saadab olemasoleva täpselt kinnitatud Supabase CLI kaudu ainult need kolm lubatud toimingut.

Eelkontroll nõuab teadaolevat projekti, instantsi, release’i ning täpset tuntud funktsioonide ja tööde metadata kataloogi. Puuduvat funktsiooni ei looda vaikimisi õigustega. Rakendamine kontrollib lähteolekut uuesti samas piiratud tehingus, muudab ühe olemasoleva funktsiooni ja kinnitab järelseisu. PostgREST saab skeemi vahemälu värskendamise teate.

Õigustabelite täielik tegelik metadata fikseeritakse rakendamise sees ning peab lõpus jääma samaks. Selle kontrolli alus ei ole sünteetilise fixture’i täielik skeem. See tõendab muutumatust selle sammu jooksul; see ei ole kogu varasema õigusskeemi uus turvaaudit. Raport sisaldab ainult paigalduse metadata ja räside kokkuvõtet, mitte kontode, tööde või sõnumite sisu.

SQL-kirjutuse kavatsus talletatakse enne välise käsu käivitamist. Tundmatu või katkestatud vastus ei anna luba kirjutust korrata. Eraldi järel-lugemine võib kinnitada täpse lõppoleku; tundmatu või endine seis pärast ebaselget katset nõuab peatumist. Commit/push järgneb ainult kinnitatud build’ile ja SQL-i järelkontrollile.

## Kontrollide piir

Uued katsed kasutavad eraldi kohalikku PostgreSQL-i, sünteetilisi kontosid ja töid ning kahte samaaegset ühendust. Vana veatee kutsutakse esile päriselt hoitud profiililukuga. Kontrollitakse uut loendit, kirjutamise lukkude säilimist, õiguste muutmise snapshot’i, read-only tehingut, ligipääsu keelde, lehekülgi ja täpset vastust.

Fixture taastab kehtivad SQL-deklaratsioonid vastuvõetud lähtekoodist. See ei käivita uuesti vanu kasutuskatsete komplekte ega tee muudatusi päris pilvebaasis. Testi käigus loodud ja muudetud andmed on ainult kohalikud sünteetilised kirjed.

Värske täielik Next.js/TypeScripti build kontrollib portaali koostamist. Rakenduse lähtekood ja sõltuvused on samad kui `78aea6f`-is; varasemad 49 klienditesti võetakse vastu täpse eduka raporti järgi. Brauseri päris kasutuskäik järgneb uue Maci raporti ja sama commit’i Ready / Production tulemusele.
