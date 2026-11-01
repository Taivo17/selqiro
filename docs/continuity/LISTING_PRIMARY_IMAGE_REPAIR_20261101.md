# Põhipildi paketi eelduste parandus — 01.11.2026

## Tegelik peatumine

Kasutaja jooksuraport on üleandmises
`kontrollid/actual-preflight-stop-20261101.json`;
ülevaade on `actual-report-review.json`.
Algse raporti SHA-256:
`cdf7f273e6eefdc751be8c5a31eecd1d3450d842500e730450219c1137cd9a8e`.

| Väli | Raportis vaadeldud tulemus |
| --- | --- |
| Jooksu algus | 2026-11-01 12:13:23 UTC |
| Vana manifest | `55d3e168491cf62bf584fdac8f57a9704d308b901d8569e9d4656a0917864814` |
| Kontrollitud baas | `b0a04fccbf354f0480a4b6eb8dd176b3c55383a8` |
| Peatumine | `baseline_verified` / `DATABASE_PRECONDITIONS_NOT_MATCHED` |
| Ainult lugemiseks tehtud DB-käsk | exit 0; capability puudus |
| Mittesobivad kaitsed | `functions`, `final_writer_policies`; ülejäänud 7 sobisid |
| Rakendamine | `database:not_started`, `build:not_run`, `commit:null`, `push:not_run` |

See kinnitab päris andmebaasi lugemiskontrolli ja kirjutamiseelset peatumist.
`state:unknown` kirjeldab paketi tuvastamata aluskoosseisu; see ei tõenda andmete
riket. Vaadeldud baas käib selle konkreetse jooksu kohta. Uut Maci HEAD-i,
andmebaasi kirjutamist ega edukat avaldamist raporti põhjal ei eeldata.

## Kaks tuvastatud viga ja paranduse ulatus

1. Kohalik fixture kasutas lõppkirjutamise poliitikatena `USING(true)` näidiseid,
   kuigi varasema avaldamise õiges allikas on identiteediga piiratud poliitikad.
2. Fixture valis `final_receipt` 20-core määratluse; tegelikus paigaldusjärjekorras
   asendab selle hilisem 30-multipart määratlus.

Õigest allikast sõltumatult taastatud sõltuvuste sõrmejälg kattub tegeliku
raportiga: `fb89562d7bb6e653b53e3baad61ae32dc6a64aa1578051a2eed4f50cbf8af4e3`.
Parandus taastab kontrollaluse ning sellest genereeritud preflight/apply/verify
kaitsed. Tootmise poliitikaid ei avardata kontrolli läbimiseks; `changes.sql`
ja põhipildi capability jäävad muutumatuks. Täpne SQL-parandus on
`supabase/repairs/20261101_listing_primary_image/` all.

## Kontrollide seis ja piir

| Tõend | Seis |
| --- | --- |
| Runtime'i ja sõltuvuste võrdlus | 843 faili väljaspool continuity/dokumentatsiooni ja paigaldamata SQL-parandust on varasema kandidaadiga bait-baidilt samad; ka `uuenda.py` ja `database.py` on samad. |
| Mudel/klient ja HTTP-piir | Varasemad 85 + 78 läbinud katset säilivad; selles paranduses ei korratud. |
| Brauser, build ja lint | Säilivad tegeliku integreeritud lehe 1440/390/320 px kontroll, 19,73 s build ning kuue runtime-faili puhas lint; ei korratud. Auth/HTTP/build-väärtused olid kontrollitud või sünteetilised. |
| Varasem paigaldaja | 50 läbinud katset / 13,634 s säilivad; ei korratud. |
| Uued paigaldaja regressioonid | 2/2 läbisid / 0,592 s: tegeliku kahe-kaitse peatuse kuju ilma apply-intent'ita ning uus manifest vana peatunud päeviku kõrval; üks apply, vana päevik bait-baidilt säilinud. Päris ajutine Git/kohalik bare-remote, sünteetilised SQL/build-vastused. |
| Parandatud SQL-kontrollid | 26/26 runtime- ja 19/19 paigalduskaitse katset läbisid PGlite 18-s. Tulemused on SQL-paranduse tests/runtime-result.json ja tests/installation-result.json failides; vana 23 + 15 tulemus jääb ajalooks. |
| Päris paranduse rakendamine | Maci rakendamist, DB kirjutamist, uut commit/push'i ega Verceli Ready tulemust pole nähtud. |

Vana tarnitud preflight taastoodab täpselt kasutaja raporti kaks mittesobivat
kaitset. Parandatud kontroll võtab õige säilitatud allika vastu ning tõrjub
varasemat receipt'i, piiranguteta avalikke poliitikaid ja rollide loendi laiendust.
Muutumatu `changes.sql` SHA-256 on
`6e131c70b2dc941b411588f2e6585c5bf3a85b23b50f2e2dc19d766ff1297714`;
kohalikes katsetes paigaldatud capability sõrmejälg jääb
`be211792d33b920adfc4c86bb08da0ca6e0d582b68b19960b3fc30aaa2b82df9`.

Võrdlus ja uute paigaldajakatsete piir on
`retained-proof-and-new-regressions.json`-is. Säilitatud brauseritõend on
`browser-check/browser-proof.json`. Kohalikud katsed ei tõenda native PG17 käiku,
eraldi samaaegsete DB-seansside võistlust ega paranduse pilve rakendamist.

## Üleandmine ja järgmine töö

Uus paigalduspakk: `selqiro-kuulutused-pohipilt-parandus-20261101.zip`.
Uuendatud eraldi üleandmine: `selqiro-uleandmine-20261101.zip`.
Kasutada tuleb parandatud paketti; vana peatunud paketti, selle manifesti ega
päevikut ümber ei kirjutata. Uus käik kontrollib tegeliku lähtebaasi uuesti.
Tulemust hinnatakse uue raporti, commit/push'i ning Verceli Ready tõendi järgi.

Funktsionaalne ulatus säilib: olemasoleva hallatud pildi põhipildiks valik,
merevaigutoon avalikus otsingus ja Minu ala kuulutustes ning täpsemad koristamise
olekutekstid. Piltide lisamine/eemaldamine, hosted lõppkoristus ja mahu vabastamine
vajavad järgmist sammu. Seejärel ühendame hobused samasse kuulutuste voogu.
Logod, Uudised ja ülejäänud moodulid järgnevad senises järjekorras;
Energy/maksed jäävad avaliku käivitamise eelseks tööks.

Kasutaja vastu võetud sõnumifotod ja telefoni klaviatuuri käitumine säilivad.
Testkuulutuste/testsõnumite tingimuslikku eemaldamisluba selles paranduses ei
kasutatud. Kontod, identiteedid, logod, muu sisu ja päevikud säilivad.
Eraldi üleandmine antakse suurema kontrollitud etapi, kontekstivahetuse või
kasutaja soovi korral. Eelmise kandidaadi detail:
`LISTING_PRIMARY_IMAGE_20261101.md`; tootesuund:
`LISTINGS_DESIGN_NEWS_20261101.md`. Jooksev seis on `CURRENT_STATE.json`;
`docs/99_V2_HANDOFF_NEXT_CHAT.md` genereeritakse ainult sellest.
