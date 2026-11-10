# 10.11.2026 — hobusekuulutuse ühendamine enda poe rubriikidega

## Seis ja vastuvõetud alus

See on uue lähtepaki **ettevalmistus**, mitte Maci, Supabase'i või Verceli
lõpetamisraport. Kasutaja andis järgmise hobuste sammu tegemiseks loa.
Viimane tegelik alus on `adfa3ae767712b5f71e9fac2d963a765f61fb444`,
10.11 kell 20:07:17 Europe/Tallinn. Eelmise õigusteparanduse lõppraport, sama
commit'i Ready / Production pilt ja kasutaja salvestus/profiilikinnitus on vastu
võetud. Neid toiminguid ei korrata. Varasem täisvastuvõtt ja aruannete piirid
säilivad `STORE_CATEGORY_AUTHORITY_20261110.md`-s.

Uus pakk: `selqiro-hobuse-poerubriigid-20261110.zip`. Paigaldaja alus on 1475
täpselt kontrollitud lähtefaili; manifest määrab iga muudatuse alg- ja lõppräsid,
muutumatud kaitsed, SQL-i ning abimoodulid. Pakk rakendub olemasolevasse
`/Users/taivo/selqiro` hoidlasse. Eelmisi väljastatud pakke ei muudeta.

## Kasutajale nähtav tervik

Hobuse muutmisvaates on eraldi „Poe rubriigid” kaart. Omanik saab valida null,
ühe või mitu enda rubriiki. Ülem- ja alamrubriik on selged eraldi salvestatud
valikud; alamrubriik ei lisa ülemrubriigi seost automaatselt. Salvestamisel jäävad
pooleli olev pealkiri, muu sisu ja valitud foto alles. Rubriigitoiming ei avalda
hobust uuesti ega pikenda tähtaega.

Profiili ülemrubriigi filter leiab seosed kogu oma alamharust, alamrubriigi filter
kitsendab tulemust. Ülem- ja alamrubriigiga korraga seotud hobune ilmub ühe korra.
Kaardilt avatakse sama kanoonilise UUID-ga hobuse detailvaade. Avaliku nähtavuse,
aegumise ja blokeerimise reeglid säilivad. Teenused jäävad omaette loendisse.

Ebaselge salvestusvastuse korral ei näidata tõendamata edu ega korrata kirjutust.
Valik säilib; nupp „Kontrolli salvestatud valikut” loeb sama hobuse tegeliku
seisundi uuesti. Aktiivse identiteedi vahetus või sessiooni kadumine kõrvaldab
vana konteksti vastused. Vormilt lahkumise hoiatus arvestab ka rubriigi mustandit.
Kinnitatud kogu vormi uuestilaadimine loeb rubriigid uuesti; selle tühistamisel
säilivad sama DOM ja pooleli olevad väljad. English/Eesti kasutavad olemasolevaid
tõlkeallikaid.

## Väikesed moodulid ja üks andmeallikas

- `src/entities/horse-offer/model/storeCategories.ts` — UUID, valiku ja kviitungi leping.
- `src/entities/horse-offer/api/horseStoreCategoriesClient.ts` — fikseeritud aktor/token,
  konteksti eel-/järelkontroll ning eraldi omaniku RPC-d.
- `src/features/horse-offer-edit/model/useHorseStoreCategories.ts` — sõltumatu valik,
  tegevuselukk, konteksti vahetus, mustand ja teadmata tulemuse lugemiskontroll.
- `src/features/horse-offer-edit/components/HorseStoreCategoryCard.tsx` — olemasoleva
  kahetasandilise valija ja sõnumite kasutamine.
- `OwnerHorseOfferEditor.tsx` — kaardi koostamine ja olemasoleva lahkumishoiatuse
  laiendus; rubriikide äriloogikat editorisse ei lisata.
- `src/entities/listing/model/publicRead/publicProfileMarketplaceV2.ts` ning
  `src/entities/listing/api/getPublicProfileMarketplace.ts` — profiili v2 leping.

SQL on uues `supabase/repairs/20261110_horse_store_categories` kaustas. Tabel
`horse_offer_store_categories` sisaldab ainult hobuse ja rubriigi UUID-seost.
Get/set kontrollivad serveris salvestatud aktiivset identiteeti, eraisiku
omanikku/aktiivset äriliiget, hobuse kuuluvust ja tervet rubriigivalikut. Tabelil
pole otseseid anon/authenticated/service_role õigusi. Vigane komplekt ei eemalda
osaliselt vanu seoseid; tühi komplekt eemaldab ainult valiku.

Rubriigi eemaldamise olemasolev RPC jääb muutmata; uue tabeli FK koristab ainult
seosed. Hobune ja fotod säilivad. Olemasoleva kviitungi `removed_listing_links`
väli loendab jätkuvalt ainult tavakuulutuse seoseid, mitte hobuseid. Privilegeeritud
kirjutajad ja hilisem identiteedi üleandmine pole selle sammu universaalne invariant.

## Miks uus v2 profiililugeja

Senine kliendi `publicProfileMarketplaceV1.ts` keelab rubriigi valimisel kõik
kaardid peale tavakuulutuse. Sama v1 RPC muutmine katkestaks juba avatud vana
brauseriversiooni, kui hobuseseos lisatakse. Seepärast jäävad vana v1 SQL ja
parser bait-baidilt alles. Uus `get_public_profile_marketplace_v2` kasutab sama
sisendit, vastuse `schema_version` on 2 ning uus parser lubab kanoonilisi
tavakuulutusi ja hobuseid. Püsiv kirjutatav allikas ei dubleeru.

V2 loeb ainult lubatud avalikke välju. Sama vastavuste kogum arvutatakse enne
ühist loendust ja lehekülge. Müüja enda rubriigi alampuu, sortimine ning
topeltkirjete vältimine säilivad. V1 kinnitatud klientide jaoks ei muudeta väljundit.

## Sihitud kontrollid

| Kontroll | Tulemus ja piir |
| --- | --- |
| SQL runtime | 25/25 PASS; tegelikud uued RPC-d ja säilivad kategooria/avaliku nähtavuse funktsioonid sünteetilisel PGlite baasil |
| SQL paigaldus, rollback ja erinevused | 34/34 PASS; täpne alus, uus võimekus, vanad õigused/v1, FK/poliitika/triggeri kõrvalekalded ning olemasoleva sisu säilimine |
| Kliendi API/ReactDOM/parser | 11/11 PASS; samaaegse topeltklõpsu tõke, identiteedi vahetus, täielikud leheküljed, vigased vastused, ebaselge kirjutuse lugemine |
| Lõplik Next webpack build | 23.405 s, 626 muutumatut sisendit; olemasolevad lukustatud sõltuvused |
| Build'i järel Chromium 153 | 6/6 PASS; tegelik editor/context/form/gallery/valija/profiilifilter, English/Eesti, desktop/390 px |
| Brauseri sisendid | 101 vastab build'i räsiloendile, drift 0; konsooli hoiatusi/vigu ja välisvõrgupäringuid 0 |
| Uuendaja aluse raport, SQL adapter, jätk | 11/11, 13/13, 10/10 PASS; sünteetiline transport, säilinud täpne alusraport |
| Täpse lõppmanifesti tarnekäik | Tõend `kontrollid/final-flow.json`; päris ajutine Git/index/backup/commit/kohalik remote, sünteetiline SQL/build |

Brauserikatse isoleerib Auth/PostgREST-i, omaniku lugemise, avaldamiskontrolleri,
poliitikavärava, keelekonteksti ning Next Link transpordi. See pole täisportaali
või tootmiskonto katse. SQL-katsed ei kinnita native PostgreSQL mitme samaaegse
sessiooni ajastust; lukujärjekorda vaadati eraldi. Uut pilve ega Storage'it ei puudutatud.

Esimene build läbis enne kinnitatud vormilaadimise täpsustust ning säilib eraldi.
Selle konkreetse paranduse järel tehti lõplik build ja brauserikontroll.
SQL-i esimese runtime-katse aegunud testkirje avaldamise ajatempel rikkus olemasolevat
`active_until > published_at` piirangut; parandati ainult sünteetiline fixture.
Tootmis-SQL ei muutunud ja esimene logi säilib. Kaks olemasolevat testitransporti,
mis kutsusid vana wrapperit v1-na, viidi uue wrapperiga v2-le; v1 parseri
regressioonid säilisid. Olemasoleva profiilitesti 13/13 ning transpordi
ühilduvuse 1/1 PASS on pakis eraldi tõendina.

## Üks rakendustee ja veel kinnitamata sammud

Käsk on `HOSTED_PORTAL.md`-s. Uuendaja kontrollib enne kirjutusi tegeliku haru,
HEAD-i, kogu indexi/lähtepuu ja kinnitatud remote'i ning eelmise lõpetatud raporti.
Lisanduv SQL on ühes tehingus ja järelkontrolliga; alles siis tulevad lähtefailid,
build, commit ja push. SQL-i tundmatu tulemus vajab lugemist; sama kirjutuskatset
automaatselt ei korrata. Vanad paigaldajad, sõltuvuste paigaldused ja kontode
ühendused ei kuulu jooksu.

Kõik järgmised tõendid on praegu **kinnitamata**: Maci rakendus/staged töö, uus
commit/push, uus andmebaasi võimekus, sama commit'i Ready / Production ning
hobuse rubriigivaliku tegelik kasutajavastuvõtt. Lokaalne edu ei märgi neid tehtuks.

Pärast Ready-tulemust piisab ühest olemasoleva avaliku hobuse valik/salvestus →
profiili sama rubriigi filter → sama hobuse avamise katsest. Tavakuulutuste vana
CRUD-katset ei korrata. Kustutamiskatset kasutajalt praegu ei nõuta.

## Üleandmine ja säilivad tööd

`CURRENT_STATE.json` määrab ühe praeguse tegevuse; `99_V2_HANDOFF_NEXT_CHAT.md`
genereeritakse sellest. Pakk sisaldab ka eelmise etapi vastu võetud dokumentide
deltat, uut arhitektuuri ja arenduspäeviku jätku. Pikad varasemad kirjed säilivad
muutmata; nende NEXT/CURRENT käsud on ajalugu. Varem väljastatud pakke ei muudeta.

Teenuste rubriigiseosed, üldine terminalne fotokoristus, aktiivse identiteedi
valiku üldine turvaparandus ning hilisemad V2 Energy/maksed/piiratud AI on eraldi
tööd. See pakett ei muuda neid automaatselt lõpetatuks.
