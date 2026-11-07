# Kuulutuse foto ettevalmistus ja etapiajad

Leping: 06.11.2026. Tegelik Maci/pilve seis on
[`CURRENT_STATE.json`](../continuity/CURRENT_STATE.json).

## Eesmärk ja üks rada

Vähenda suure foto üle võrgu saadetavat mahtu enne olemasolevat privaatset
SOURCE → native serveritöötlus → WEB rada. Brauseri vähendus on jõudlusvõte;
server kontrollib endiselt iga üleslaaditud faili ning otsustab avaldamise.
Üht `listingPhotoPreparation` abi kasutavad nii `OrdinaryPublicationSession`
kui ka `ManagedPhotoAdditionSession`. Teist galeriid, mahabilanssi ega
üleslaadimisjärjekorda ei teki.

Sõnumifotode olemasolev piiratud päiselugeja ja kohalik dekodeerija asuvad
neutraalsetes `shared/media/localImageHeader` ja `localImageDecode` moodulites.
Sõnumifunktsioon säilitab oma ekspordid, piirid ja veakäitumise õhukeste
ümbristega. Kuulutuse retsept ja püsiva jätkamise andmed on listing-moodulis.

## Püsiv brauseriretsept

- Lubatud JPEG/PNG/WebP päis; kuni 25 MiB, 40 miljonit pikslit ja 16384 px serv.
- Päise lugemine on piiratud ühe MiB ning 8192 segmendi/plokiga.
- Tuvastatud animeeritud PNG/WebP keeldutakse enne canvas'e teisendust;
  animatsiooni ei muudeta märkamatult varem keelatud lähte asemel üksikfotoks.
- Kuni 2048 px pikema serva ja 512 KiB fail jääb algseks.
- Suurem fail dekodeeritakse, EXIF-orientatsioon rakendub täpselt üks kord
  ning pikem serv väheneb kuni 2048 px-ni. Pilti ei suurendata.
- Üks WebP kodeering kvaliteediga 0,9; canvas jääb läbipaistvaks. Retsept on
  `webp-2048-q90-v1`. Kodeeringu puudumisel või mahu kasvu korral jäävad
  algsed baidid ja retsept `original-v1`.
- Brauseri loodud bitmap, kohalik URL ja canvas vabastatakse pärast töötlust.
  Kui brauseri dekodeerija ise vajab algse pildi puhvrit, piirab seda eelnev
  pikslite ja mõõtmete kontroll. Piltide töötlus jääb järjestikuseks.

Algset kasutaja faili ei muudeta. SOURCE tähendab nüüd konkreetsesse
üleslaadimiskatsesse saadetud baite, mis võivad olla brauseris ette valmistatud.
Serveri senine JPEG/PNG/WebP kontroll, orientatsioon, metaandmete eemaldamine,
2048 px / WebP82 väljund ja 4 MiB WEB-piir säilivad. Andmebaasi leping ei muutu.

## Täpsed baidid ja jätkamine

Failid ja vormi seis võetakse enne esimest `await`-i kinnisest valikust.
Brauseri ettevalmistus ja räsimine lõpevad enne serveri ettevalmistuspäringut.
Olemasoleva versiooni 1 jätkamiskirje valikuline `preparation` lisab iga faili
jaoks järgmised andmed:

| Väli | Vastutus |
| --- | --- |
| `version`, `recipe` | Täpne ettevalmistuslepingu ja retsepti versioon |
| `clientFileId` | Sama üleslaadimise failikoht |
| `originalBytes`, `originalSha256` | Kasutaja uuesti valitud algse faili vastavus |
| `uploadBytes`, `uploadSha256` | Tegelikult saadetud, serveri kavatsusse seotud baidid |

Failinimesid, fotode sisu, allkirjastatud URL-e ega tokeneid sellesse lisasse
püsivalt ei salvestata. Pooleliolev vana kirje ilma `preparation` väljata
jätkab senise toorfaili räsi järgi. Olemasolev, kuid vigane ettevalmistuse väli
ei muutu vana kirje erandiks.

Kui faili pole veel saadetud, peab uuesti valitud algne fail kattuma ning
brauseri uus tulemus peab andma sama retsepti, mahu ja räsi. Eri brauseri või
koodekiversiooni tulemus võib erineda; siis jätkamine peatub ja kasutaja saab
sama katse selgelt katkestada. Uut katset ega teist faili ei saadeta salaja.

Enne PUT-i kirjutatakse senine `dispatched` märk. Juba saadetud või teadmata
vastusega PUT jätkab ainult kontrolliga; algse foto uuesti valimist ega uut
kodeerimist selleks ei nõuta. Retseptiandmed säilivad iga päevikukirjutusega.
Identiteedi või omaniku konteksti muutus katkestab kohaliku töö ning hiline
kodeerimis-/serverivastus ei muuda uut vaadet.

## Mõõtmine ilma uue töövoota

Brauser kasutab ainult kohalikku `performance.measure` mälu: fikseeritud nimi
`selqiro:photo:<etapp>`, kestus ning ettevalmistusel/saatmisel baidiarvud.
Etapid on preparation, prepare, image_prepare, upload, image_verify, status,
append, gallery, publish ja total. Iga etapi kohta on kuni kaheksa kirjet;
täitumisel tühjendatakse ainult selle etapi varasemad kirjed. Kestus piiratakse
kümne minutiga, baidiarv senise 25 MiB-ga. `total` lõpeb kinnitatud galerii
kuvamise või avaldamiskinnituse juures; brauseri järgnev foto allalaadimine ja
värvimine võib lisada kasutajale nähtavat aega.

Server tagastab asjakohastel pildipäringutel kuni 12 `Server-Timing` mõõtu:
gate, image_auth, source_session, source_finalize, source_read, sanitize,
web_session, web_write, web_finalize, web_read, owner_rpc ja total. Sama nime
kordused liidetakse ühe päringu piires. Vastus sisaldab ainult fikseeritud
nimesid ja piiratud kestusi, mitte identiteete, failinimesid ega andmeid.
Otse brauserist Storage'isse saatmist näitab brauseri upload-etapp.

Kliendi ja serveri total ei ole liidetavad eraldiseisvad ajad: serverietapid
sisalduvad vastava brauseripäringu ajas ning brauseri total hõlmab alametappe.
Etapi nimetus ei tõenda tootmise kitsaskohta enne mõõtmise vaatamist.
Mõõtmise rike ei tohi asendada rakenduse tulemust, algset viga ega põhjustada
korduskatset. Tehnilist kasutajapaneeli, uut telemeetriateenust või püsivat
ajalugu ei lisata. Pilditöötlus ei kasuta AI-d.

## Kontrolli ja väljastuse piir

Sihitud testid katavad tegelike baitide seose, vana/uue kirje jätkamise,
muutunud kodeeringu ohutu keeldumise, identiteedi muutuse ja teise PUT-i
välistamise. Päris brauser kontrollib suurust, orientatsiooni, läbipaistvust
ning lehe laadimise järel katkestatud vastuse jätkamist. Native sanitizer
kontrollitakse samade sünteetiliste sisenditega. Need on kohaliku käitumise
ja mahu tõendid, mitte live-teenuse kiirusmõõtmine.

Käesolev pakett muudab ainult lähtekoodi. SQL-i või Storage'i rakendustoimingut
ei ole. Tootmise ajavõrdlus tuleb pärast sama commit'i Verceli Ready-tulemust.
