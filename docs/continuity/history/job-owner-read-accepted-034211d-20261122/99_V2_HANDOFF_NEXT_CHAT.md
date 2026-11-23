<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 22.11.2026 Europe/Tallinn — 78aea6f vastu võetud; tööloendi lugemisluku serveriparandus ette valmistatud

## Praegune checkpoint

78aea6f kliendi korduslugemine ja avalikult kättesaamatu töö selgitus on Maci eduka raporti ning sama commit’i Ready / Production pildi järgi paigaldatud. Hilisem Networki vastus kinnitab get_my_jobs_v1 koodi 55P03: canceling statement due to lock timeout. Uus piiratud SQL-parandus eraldab oma tööde loendi lugemise kirjutamislukkudest; selle Maci ja pilve rakendamine on veel ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 78aea6f6d7c57aee47a29cd0e8b29c9c4e862561; puu 1331942ec5b3428c7a7d592837aeaf2ece217232; 2030 jälgitavat faili. Kogu lähtepuu taastati täpsete SHA-256, Git blob’i ja failirežiimi kontrollidega. See ei ole värske Maci tööpuu ega remote’i lugemine.
- **Aluse tõend:** Raport selqiro-too-laadimise-parandus-20261122-raport-20261122-163401-7a1007d7de00.json, SHA256 3f8466d23f1d89ad74d6fe76bdebaa7240b8424eb2db5176f99ef9ef95f667d3. Raport kinnitab 49 testi, build’i ja push’i; andmebaasi ei muudetud. Sama 78aea6f Ready / Production on eraldi kasutaja pildil. Algset raportit ei muudeta.
- **Tõendatud viga:** Kasutaja Response-pilt kinnitab SQL-i lukuaegumise. Senine get_my_jobs_v1 kutsub ühist kirjutamise aktorikontrolli, mis lukustab profiles rea FOR UPDATE ning muid õiguste ridu FOR SHARE. Tegelikku blokeerinud tehingut ei ole tuvastatud.
- **Parandus:** Asendub ainult public.get_my_jobs_v1(uuid,uuid,integer,jsonb). STABLE lugemine kasutab üht päringu alguse andmebaasivaadet ja säilitab konto, aktiivse identiteedi, eraisiku omaniku, ettevõtte liikmesuse ning hosted-juurdepääsu kontrollid. Rea kirjutamis- ega jagatud lukke see lugemine ei võta.
- **Säiliv leping:** RPC signatuur, õigused, SECURITY DEFINER, fikseeritud search_path, UTC, kahele sekundile seatud lock_timeout, vastuse väljad, summad, revisjonid, järjestus ja cursor säilivad. Muud päringud, kirjutamise abifunktsioonid ja kliendi üks katkestatav lisakatse jäävad samaks.
- **Tõendi piir:** Tuntud funktsioonide ja tööde kataloog on enne/pärast täpselt räsiga piiratud. Muude õigustabelite tegelik metadata loetakse rakendamise sees ja võrreldakse muutumatust; sünteetilise testi täielikku õigustabeli skeemi ei esitata tõendatud pilvealusena. Kasutajaridu paigaldusraportisse ei loeta.
- **Ajalugu:** Eelmise jooksva juhendi kolm faili säilivad baiditäpselt docs/continuity/history/job-owner-read-base-78aea6f-20261122 all. Vanu SQL-pakette, käivitajaid ega vastuvõetud päevikuid ei muudeta.

## Tegelik kohalik katse

- Isoleeritud kohalikus PostgreSQL-is läbitud 44/44 uut sihitud SQL-katset. Algne profiililukk tekitab vanas funktsioonis 55P03; uus loend lõpetab sama luku hoidmise ajal. Kirjutamise varasem lukukontroll säilib.
- Kontrollitud on READ COMMITTED READ ONLY, eraisiku ja ettevõtte piirid, aktiivne profiil, hosted-väravad, täpne lehekülgede/vastuse leping ning samaaegse õiguste muutmise ühtne päringuvaade. Järgmine päring näeb tühistatud õigust ja keeldub.
- Täpse SQL-paki katsed hõlmavad lubatud eel- ja järelseisu, puuduva või muudetud funktsiooni tõrjumist ning korduva rakendamise piiri. Uuendaja eraldi kontrollid hõlmavad piiratud SQL-toimingut, katkestust, raportit ja Git-töövoogu. Täpsed juhud ja logid on paketi proof-kaustas.
- Värske Next.js 16.4.6 / TypeScripti webpack build läbis täpsete lukufaili sõltuvuste ja inertsete kohalike seadetega. Kuue tööde lehe ehitatud väljundid on räsitud; lähtefailide triivi ei olnud.
- Varem vastu võetud 49 klienditesti ei korrata. Macis kontrollitakse räsiga seotud ettevalmistuse SQL-tõendit ja tehakse uus build. Selles keskkonnas ei tehtud pilve SQL-i, Maci käivitust ega päris kontoga brauserikatset.

## Production / kasutajaliides

- 78aea6f on sama commit’i Ready / Production pildi järgi kasutuses. Selle kliendiparanduse korduskäivitamist ei ole vaja.
- Uue ühefunktsioonilise SQL-paranduse kohalik ettevalmistus ja testid on valmis; Maci rakendus, pilve järelkontroll, uus commit/push ning uus Verceli tulemus on ootel.
- Viga põhjustanud tegeliku pikema tehingu päritolu jääb teadmata. Parandus eemaldab loendi tõendatud sõltuvuse õigusridade kirjutamislukust, kuid ei luba, et kõik võimalikud tulevased võrgu- või andmebaasitõrked kaovad.

## Üks järgmine töö

Ava selqiro-too-lugemisluku-parandus-20261122.zip Downloads-kaustas ja käivita python3 -I -B "$HOME/Downloads/selqiro-too-lugemisluku-parandus-20261122/uuenda.py" --publish. Saada SAADA SEE FAIL juures näidatud raport. Pärast sama uue commit’i Ready / Production tulemust värskenda portaali ning ava Minu ala tööd oma eraisiku ja ettevõtte profiiliga.

**Peatumisel:** Tundmatu lähtekood, indeks, remote, eelmise eduka käigu raport, sõltuvus või SQL-kataloog peatab uuendaja. Säilita raport ja päevik. SQL-i kirjutuskatse märgitakse püsivalt enne käivitamist; ebaselget kirjutust automaatselt ei korrata. Järelseisu võib kinnitada eraldi lugemisega. Saada täpselt näidatud raport või selle puudumisel PEATATUD rida.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — selle uue paketi üks käivitamiskäsk ja kasutuskontroll.
- docs/architecture/job-owner-read-lock-20261122.md — lukuta lugemise õigused, snapshot ja tõendi piir.
- docs/architecture/job-load-recovery-20261122.md — vastu võetud kliendi korduskatse; dateeritud senine kirjeldus.
- supabase/repairs/20261122_job_owner_read_lock/README.md — täpse SQL-delta ning ettevalmistuse tõendi leping.

## Säilivad piirid

- Kolm kontot on kasutaja enda omad; väliseid testijaid ei ole. E-posti aktiveerimine lükati edasi domeeni kasutuselevõtuni. Enne väliseid testijaid või avalikku registreerimist tuleb kinnitamine, kirjade saatmine ja parooli taastamine lõpuni kontrollida ka juhul, kui avalik aadress on veel vercel.app.
- Põhidomeeniks valiti selqiro.com. Kasutajale kuuluvad ka selqiro.app, selqiro.io ning selkiro.com/.app/.io. Domeenide ja DNS-i seadistust selles paketis ei tehta.
- Ülesannete ja töökohtade eristus ei otsusta lepingu õiguslikku liiki. Konto tüübi laiendus ei laienda riikide poliitikaid ega möödu senisest country-scoped policy peatumisest.
- Olemasolevaid kasutajaid, profiile, töid, vestlusi, pilte, tingimusi ja kviitungeid ei kustutata ega kirjutata ringi. Üks kalendrikuu kehtivus, tasu täpsed kümnendsummad, poliitika nõusolek, revisjonid ja konto/identiteedi seos säilivad.
- Vanasse avatud brauserilehte jäänud range parser ei pruugi uusi task väärtusi ega avaldaja identity_type välja tunda. Pärast sama versiooni Ready / Production tulemust tuleb leht värskendada. See ei ole nullkatkestusega eri kliendiversioonide leping; senised muutumatud päringusisendid ja kviitungid säilivad.
- AI päringuteed jäävad suletuks. Konto sulgemine/kustutamine, reklaami ja esiletõstmise iseteenindus ning laiem avamiseelne ülevaatus on järgnevad tööd.

## Keskkond

- Olemasolev /Users/taivo/selqiro ning Taivo17/selqiro remote. Selle paketi ainus lähtealus on 78aea6f6d7c57aee47a29cd0e8b29c9c4e862561.
- Next 16.4.6, Sharp 0.35.5, package.json ja package-lock.json säilivad. Maci olemasolevad sõltuvused ja varem kinnitatud Supabase CLI failid kontrollitakse; uuesti paigaldamist ega versiooni vahetamist ei tehta.
- Uuendaja hoiab 78aea6f eduka käigu originaalraporti ainult lugemiseks lukus, kontrollib kogu aluspuud ning teeb pärast edukat build’i, piiratud SQL-i ja sõltumatut järelkontrolli ainult selle paketi commit’i ja push’i.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
