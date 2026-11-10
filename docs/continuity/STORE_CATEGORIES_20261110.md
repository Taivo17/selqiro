# Poerubriikide sidumine tavakuulutuse muutmisega — 10.11.2026

Üks praegune seis on `CURRENT_STATE.json`; sellest genereeritakse üleandmine.
Käesolev kuupäevaga kirje selgitab selle sammu ulatust ja tõendite piire.

## Muudatus lähtekoodis

Praegune `IntegratedListingEditPage` saab eraldi poerubriikide kaardi. Neli uut
moodulit eraldavad valideerimise, andmepäringud, oleku ja kasutajaliidese;
arhitektuur on `docs/architecture/listing-store-category-assignment-v1.md`.
Olemasolev valija ja `set_my_listing_store_categories_v2` RPC jäävad kasutusse.

Kõik päringud seotakse alguses fikseeritud kasutaja, aktiivse identiteedi,
kuulutuse ja tokeniga. Salvestus nõuab täpset vastusekviitungit; korraga toimub
üks tegevus ning vana konteksti vastus ei muuda uut vaadet. Ebaselge tulemuse
korral säilib valik ja järgmine salvestus ootab kasutaja käivitatud uut lugemist.
Rubriikide salvestamine ei muuda teksti, hinda ega fotosid.

Avaliku profiili olemasolev rubriigifilter loeb ka valitud rubriigi alampuud.
Tühja valiku salvestamine eemaldab seosed, mitte kuulutuse. Hobustele ja
teenustele selle sammuga rubriigiseost ei lisata.

Integreeritud Minu ala peidab endiselt vana rubriikide halduse. Olemasolevad
rubriigid on valitavad; tühjal seisul pole linki peidetud haldusankrule.
Loomise/ümbernimetamise/kustutamise turvaline avamine on eraldi järgmine töö.
Vana otsetabeli RLS kontrollib seose kirjutamisel ainult kuulutuse `user_id`-d;
siin kasutatav RPC kontrollib lisaks identiteeti ja iga rubriigi kuuluvust.
Üldist andmebaasiõiguste tugevdamist ei ole tehtud ega kinnitatud.

## Olemasolev tootmise vastuvõtt

09.11 kasutaja kinnitas teenuse detailist Tagasi mõlemasse lähtekohta:
avalikule profiilile ja teenuseloendisse. Verceli kuvatõmmisel on `429ace2`
Ready / Production ning varasem foto/profiiliparandus `26e468e` samuti Ready.
Nende täiscommit'e, navigation-eduraportit ega värsket Maci indexit siin ei ole;
käesolev allikatöö ei asenda neid tõendeid ega korda eelmist paigaldust.

## Kohaliku kontrolli tõendipiir

Allolevad `work/` teed on valmistuskeskkonna tõendid. Väljastatud paki
`kontrollid` kaust sisaldab neid tulemusi ning eraldi lõppmanifesti kontrolli;
valmistuskeskkonna ja tegeliku Maci tulemused on eri tõendid.

| Kontroll | Tõend | Seis ja piir |
| --- | --- | --- |
| Olemasoleva SQL-i õigused, atomaarne seos ja avalik alampuufilter | `work/store-category-sql-proof/sql-result.json`, `sql-run.log` | 19/19 PASS; PGlite/WASM, tegelikud säilinud deklaratsioonid, sünteetiline Auth/andmestik; sisendimuutusi 0. Pilvepäringuid ja SQL muudatusi ei tehtud. |
| Uuendaja dünaamiline alus ja veatee | `work/store-category-helper-tests.json`, `store-category-helper-tests.log` | 10/10 PASS ainult `prepared_helpers_only`; manifest puudus, lõpp-payload'i päris Git-voogu see ei kontrolli. |
| Parser/API/hook ja Reacti kasutus | `work/store-category-client-proof/client-result.json`, `client-run.log` | 13/13 PASS; päris API/parser/hook ja ReactDOM/jsdom, sünteetiline Auth/PostgREST; sisendimuutusi 0. |
| Inglise/eesti tegelik brauserivaade | `work/store-category-browser-proof/browser-result.json`, `browser-run.log` | 4/4 PASS, Chromium 153.0.8010.0; päris IntegratedPage, rubriigi/profiili komponendid ja mustand. English/Eesti, 390/1365 px, värske tootmis-CSS; API/auth/fotopiir sünteetilised. 53 sisendit vastavad buildile, sisendinihkeid ja browser/console/välisvõrgu vigu 0. |
| Värske tootmiskooste | `work/store-category-production-build.json`, `store-category-production-build.log` | PASS, Next 16.2.1 webpack, 44,635 s; 600 muutumatut sisendit. Inventar `work/store-category-build-inputs.json`; sünteetiline konfiguratsioon. |
| Külmutatud manifesti helperid | `work/store-category-helper-final-tests.json`, `store-category-helper-final-tests.log` | Täpse väljastatud manifesti tulemus on paki `kontrollid` kaustas; eelnev prepared_helpers_only 10/10 on eraldi tõend. |
| Lõpp-payload'i tarnevoog | `work/store-category-final-flow.json`, `store-category-final-flow.log` | Täpne lõpp-payload on seotud paki `kontrollid` tarnevoo tõendiga; päris ajutine Git/index/backup/commit/local remote, sünteetiline build/prior-resolver piir. |

Brauseri esimene rakise ettevalmistus peatus enne Chromiumi avamist virtuaalse
esbuild-sisendi tõttu. Parandati ainult testirakist; esimene tegelik brauserijooks
läbis 4/4. Pildid jäävad kohalikuks visuaalkontrolliks ega kuulu tarnesse.

SQL-fixtuur ei tõenda native-andmebaasi samaaegseid tehinguid, live PostgREST-i
või tootmise hetkeandmeid. Ka kohalik build ja brauserikatse ei tõenda deployment'i.

## Tarne ja järgmine tegelik kasutus

Uus ainult lähtekoodi uuendaja kasutab olemasoleva navigation-jooksu täpset
privaatset lõpetatud raportit ning Giti sõltumatuid puu/parent/diff kontrolle.
Alus on 1383 faili; kinnitatud lühiräsid on `429ace2` ja `26e468e`, täielikud
commit'id lahendatakse Macis. Neid ei mõelda ette välja. Värske tööpuu/indexi,
HEAD-i ja kinnitatud remote'i kontroll eelneb kirjutustele. Varukoopiad ja
varasemad päevikud säilivad. SQL-i, Supabase CLI, Storage'i ega tarkvarapaigaldust
selles uuendajas ei ole.

Pärast selle paketi väljastamist on sama avaldamiskäsk `HOSTED_PORTAL.md`-s:

```bash
python3 -I -B "$HOME/Downloads/selqiro-poerubriigid-20261110/uuenda.py" --publish
```

Peatus näitab `SAADA SEE FAIL: <absoluutne tee>` ja püüab sama kontrollitud
raporti Finderis valida. Downloads-koopia on privaatne ja kordumatu; kopeerimise
nurjumisel kasutatakse uuesti kontrollitud originaali. Vananenud raport märgitakse
selgelt. Kui selle jooksu raportit pole, küsitakse STOP-rida, mitte juhuslikku
varasemat faili.

Maci rakendus, uus commit/push, selle commit'i Verceli Ready ja rubriigi tegelik
kasutus on veel kinnitamata. Pärast Ready-d: vali olemasolev rubriik avalikult nähtava tavakuulutuse
muutmisvaates, salvesta ja kontrolli avaliku profiili vastavat rubriiki/alampuud.
Seejärel eemalda seos ja kinnita, et kuulutus säilib Kõik-vaates ning selle tekst,
hind ja fotod on alles. Selleks pole vaja kustutada kuulutust ega rubriiki.
