<!-- SELQIRO_STORE_CATEGORY_MANAGEMENT_ACCEPTED_20261110 -->
# Poe rubriikide haldus on rakendatud ja kasutaja poolt vastu võetud

Seis: 10.11.2026 Europe/Tallinn. See kirje täiendab allpool säilinud
ettevalmistuse ajalugu. Varasemad paigaldus- ja NEXT-juhised ei ole uus käsk.

## Tegelik paigaldusraport

Raport `selqiro-poerubriikide-haldus-20261110-raport-20261110-151733-fa9c72c87ffc.json`:
216469 baiti, SHA256 `1e181c9533d3caa18b165f3541127241793d764e5f2adc2fd47161cd2f56abc7`.
Jooks kestis 15:16:58–15:17:33; andmebaasi järelkontroll oli 15:17:09.
Tulemus: complete, database verified, build passed, push verified.
Commit `0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`, vanem
`71eea82ad83b30b9ddc03641f8f2864b67a85877`.

Võrguühenduseta ülevaatus sidus raporti täpse väljastatud manifestiga,
kontrollis kõiki 51 algset failiräsi, 1398 algindexi kirjet ja aluspuud,
varasema väljalaske ahelat ning uue SQL-i rakendamise räsi. Kõik seitse
andmebaasikaitset läbisid. Seis absent → acknowledged apply → applied/verified,
olemasoleva autoriteedi/funktsioonide/struktuuri invariantsused säilisid.
Rakendamise vastus ja eraldi kontrolllugemine on samad. Storage'i toiminguid
uuendaja ei teinud.

Koostamise null-väljumine ning täpse commit'i/parent'i/pealkirja/51 raja,
terve oodatud puu/indexi, puhta tööpuu ja lubatud remote main-viida vastavus
on pinnitud jooksu kontrollid. Täielikku lõppindexit, commit-objekti ja
build-logi raportis pole; lõppindexist on räsid. Nende baitide sõltumatut
värsket kogumist ei väideta. Vercel on raportis READY_NOT_CHECKED.

## Kasutaja vastuvõtt

Kasutaja kinnitas ülem- ja alamrubriigi lisamist, mõlema nimevahetust,
testkuulutuse seostamist uute rubriikidega ning leidmist avalikult profiililt.
Pärast ülem- ja alamrubriigi eemaldamist jäi kuulutus alles.

Pildid 15:22:42–15:32:04 toetavad käiku: LENNUKID/Gulfstream,
LENNUKID/Embraer, PRIVATE JETS/Embraer, kuulutusele 202 kahe seose salvestus,
ülemrubriigi profiilifilter ja pärast kasutaja kinnitatud eemaldamist alles
olev testkuulutuse kaart Minu alas ning profiilis. Eemaldamise kinnitusekraani,
kõigi piltide/ridade baitvõrdlust ega eraldi alamrubriigifiltri tulemust
piltidel pole. Need piirid ei tühista kasutaja enda selget vastuvõttu.

## Säilitatud üleandmine

Algne 1201978-baidine ZIP SHA256
`060dcb52805da1155cbef0036dd2af763ded0f51063d6c521ef4ad96680a17fa`
ja kõik selle 89 faili säilivad muutumatult. Uus dokumentide delta sisaldab
ACCEPTANCE.json-i, raporti ülevaatust ja piltide tekstilist tõendikirjet;
kuvatõmmiste piksleid ei lisata. Delta ei ole uus rakenduse paigaldaja ega
Maci/GitHubi commit. Praegune tööjärg on CURRENT_STATE.json-is.

---

## Ettevalmistuse ajalugu

# Poe rubriikide haldus — ettevalmistatud 10.11.2026

Kasutaja kiitis heaks oma rubriikide loomise, ümbernimetamise ja eemaldamise
ühendamise praeguse Minu alaga ning pideva üleandmise täiendamise. Üks järgmine
tegevus on `CURRENT_STATE.json`-is ja üks käsk `HOSTED_PORTAL.md`-s.

## Valmis ulatus

- Ülemrubriik ja selle otsene alamrubriik; nime muutmine; eraldi kinnitusega
  lasteta rubriigi eemaldamine. Nimi 1–60 Unicode'i koodipunkti.
- Rubriigi eemaldamisel kaovad ainult rubriik ja selle seosed. Kuulutused,
  kirjeldused, pildiread ja Storage'i objektid säilivad.
- English/Eesti ning desktop/mobile paigutus. Olemasolevad sügavamad või
  puuduva vanemaga rubriigid jäävad nähtavaks; neid ei teisendata.
- Kinnitatud kasutaja/aktiivse identiteedi leping kliendis ja uues RPC-s.
  Katkenud vastuse korral sisestus säilib ning uus automaatkirjutus puudub.
  Käsitsi lugemiskontrolli tulemus on eraldi kirjutuskviitungist.
- Kuulutuse rubriigivalija halduse link avaneb uuel vahekaardil. Kuulutuse
  rubriigiseoste senine salvestus ja avaliku profiili filter säilivad.

Arhitektuur: `../architecture/store-category-management-v1.md`.

## Taastamine ja muutumatud varasemad pakid

Tööruum taastus katkestuse järel varasemast hetkest. Avaldamata halduse allikad
ja jooksud puudusid. Täpselt väljastatud `selqiro-poerubriigid-20261110.zip`
taastati; kõik 1398 baasi faili, SHA256-räsid, režiimid ja Git tree
`b7fca157abd46d1b169664aaabe417920cc055b4` kontrolliti. Selle ZIP-i SHA256 on
`64177a91d06febe4a7c70ac3f0655cb0b81b88faf665668476bc585cbce0ab37`,
manifest `b2ed5fa79144982b60f51ab3cc65c08fe5c2b484645f9f36c0da3543d82209d2`.

Uus kandidaat sisaldab kuut eraldi vastuvõtu dokumentide deltat arhiivist
`selqiro-seis-20261110-poerubriigid-vastu-voetud.zip`, SHA256
`31030aa1286b3154425b25165b13a88b58f2c45f8c4526ca2dc9119610f41427`.
Kadunud poolelioleva etapi PASS-e ei kasutata uue lähtekoodi tõendina.
Varasemaid väljastatud pakke ega päevikuid ei muudeta.

## Värsked sihitud tõendid

| Kontroll | Tulemus ja piir |
| --- | --- |
| SQL guardgen/install/replay/verify | PASS; uus külmutatud 18-failine repair |
| SQL runtime | 17/17 PASS; tegelik PGlite SQL sünteetiliste kasutajate, kuulutuse ja piltidega |
| SQL install/drift/rollback | 18/18 PASS; incoming FK-d, reeglid ja triggerid mõlemal kirjutataval tabelil |
| Parser/API/ReactDOM/hook | 15/15 PASS; sünteetiline Auth/PostgREST |
| Muudetud runtime lint | 13 faili PASS; kogu rakenduse lint'i ei korratud |
| Värske Next.js tootmiskooste | PASS, 28,661 s, Node v24.22.1, 610 muutumatut runtime-sisendit |
| Chromium | 4/4 PASS; English 1365 px, Eesti 390 px, 44 runtime-sisendit klapivad buildiga |
| Uuendaja eelmise raporti leping | 18/18 PASS; sünteetilise raporti ja Giti piiri sihitud juhud |
| Uuendaja SQL-adapter | 13/13 PASS; sünteetilised CLI vastused ja päevik |

Brauseris kontrolliti loomist, ümbernimetamist, lapsega vanema eemaldamise
keeldu, eraldi tühistamist/kinnitust, kuulutuse ja piltide säilimist,
filtrite värskendust, 60 emoji sisendit, fookuse ajal sama välja/teksti/kursori
säilimist, kadunud salvestusvastuse käsitsi kontrolli, kadunud sihti ning
tegelikku identiteedi vahetuse sündmust. Konsooli vigu/hoiatusi ja välist
võrguliiklust polnud. Desktop- ja mobiilipilt vaadati visuaalselt üle; piltide
piksleid pakis ei jagata.

Kohalik SQL ei tõenda mitme seansi lukustusgraafikuid. Brauser kasutab päris
muudetud UI/hook/API koodi ja värske buildi CSS-i, kuid Auth/PostgREST,
identiteedi esitluspäring ning kõrvalmoodulid on fixture'id. Päris
Supabase'i, kasutajakontode või Verceli katset sellest ei järeldata.

Testide ettevalmistuse varasemad vead säilivad tõendites: SQL-fixture'i import,
pildiveeru nimi ja eri fixture'ite timestamp'idega autoriteediräsi võrdlus;
brauserifixture'i puudunud `localPublicationOrigin` eksport. Neid parandati
testipiiril; SQL-i õigusi või tootmise käitumist selleks ei nõrgendatud.

## Täpne tarne

Uus pakk: `selqiro-poerubriikide-haldus-20261110.zip`.
Selle `manifest.json` seob lõpliku payload'i, muutumatu baasi, üheksa helperit
ja kolm SQL koopiat. `base-release.json` SHA256:
`040f52a451b6721237388f1ec32a62a9cd3612082bbcba575f73446d74a63198`.
Lõpliku manifesti ajutise Git/index/backup/commit/local-remote'i tarnekontroll
on paki `kontrollid/final-delivery-result.json`-is. Selle build/SQL/prior-receipt
piirid on sünteetilised; päris Next ja SQL kontrollid on eraldi tõendites.
Tarnearuandesse pannakse lõplik manifesti räsi ning täpne allikate inventar,
ilma et tulevase ZIP-i räsi tekitaks oma payload'is ringviite.

Uuendaja kasutab ainult eelmise paketi täpset lõpetatud privaatset raportit.
See kontrollib kogu commit-ahelat ja 1398-failist baasi, haru, HEAD-i, indexit,
tööpuud ja remote'i; kõrvalisi muudatusi ei kirjutata üle. Olemasolev CLI on
pinnitud. Uus SQL-võimekus paigaldatakse kontrollitud tehingus ning võrreldakse
tegelikke enne/pärast invariantsusi. Teadmata kirjutustulemus ei kutsu esile
pimedat kordusinstalli. Build, commit ja push saavad tegelikus Maci jooksus
oma tõendi. Edul ja peatumisel näidatakse täpset Downloads-raportit ning
valitakse sama fail Finderis; päevikuid säilitatakse.

## Praegune tegelik piir

See on ettevalmistatud ja kohalikult kontrollitud uus haldus. Maci kirjutus,
uus andmebaasivõimekus, commit/push, Verceli Ready/Production ning halduse
tegelik kasutuskatse on ootel. Eelmise seostamissammu kasutajavastuvõtt on
salvestatud `STORE_CATEGORIES_20261110.md`-s ega vaja kordamist.

Vana `listing_store_categories` otsetabeli kirjutusreegli tugevdamine,
hobuste/teenuste rubriigiseosed ja üldine terminalne taustakoristus jäävad
omaette töödeks. Neid pole selle pakiga lõpetatuks märgitud.
