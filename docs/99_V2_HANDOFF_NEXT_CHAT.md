<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-08 Europe/Tallinn

## Praegune checkpoint

Hobuse vahetu muutmine, korduv salvestamine ja galerii jäävad kasutaja poolt vastu võetuks. Esimene teenuste paigaldus peatus enne muudatusi DATABASE_PRECONDITIONS_NOT_MATCHED tõttu. Tegelik raport ja kõik 1255 alusfaili on kontrollitud. Kahe kohaliku ACL-taastamise vea parandamine taastab päris raporti mõlemad räsi täpselt; r2 on läbinud SQL-i, põhjuse taastamise ja sõltumatu ülevaatuse. Teenuste rakenduse kood ning kaheksa paigaldatavat SQL-moodulit on V1-ga samad. Järgmine kasutaja samm on r2 Maci paigaldus, Verceli Ready ja teenuse kasutuskatse.

## Lähtekood ja tõendi piir

- **Alus:** Tegelik Maci commit 78209e8ed0c7330b117d7db070b733eda5aa1723; vastu võetud hobusemuutmise manifest bb70e6bbbbaafeacaedf9fb4dc22fe2e408f978eb3ca96c808bf9ec3e5444c41. Üles laaditud teenuste stoppraporti 1255 Giti indeksi kirjet ja 87 sihtfaili algräsi kattuvad sõltumatult täpselt säilitatud lähtealusega. Eelnev polish/parity/capacity ahel on raportis tuvastatud.
- **Teenuste kasutustee:** Teenuse loomisel on üks Avalda toiming; eraldi nähtav mustandi salvestamine ei ole eeltingimus. Varem olemasolevat mustandit saab samas vormis lõpetada. Omaniku muutmisvaade avaneb kohe muudetavana ja iga kinnitatud salvestuse järel saab jätkata uue toiminguvõtme ning revisjoniga.
- **Andmed ja staatus:** Kanoonilised services ja service_images UUID-kirjed säilivad. Aktiivne on published ja Peatatud on archived; sisu muutmine säilitab staatuse. Muutmata vana null-hind, tühi või mitteaktiivne rubriik ja tühi asukoht säilivad. Uus või muudetud sisend kontrollitakse rangelt. Teenustele ei lisatud uut 90-päevast aegumist ega konto püsivat kuulutuste arvupiiri.
- **Fotod ja avalik vaade:** Null kuni kümme fotot, põhipilt ja järjekord. Uued fotod kasutavad ühist kontrollitud privaatse üleslaadimise voogu; olemasolevad teenusepildid säilivad. Avalik teenuste otsing, detail ja profiil loevad päris avaldatud teenuseid. Detail kasutab sama vastu võetud galeriid. Kontakt avab olemasoleva postkasti teenuse kontekstiga.
- **Kinnitused ja pooleliolev töö:** Teenusel kasutatakse kehtivat üldist avaldamisreeglistikku. Varasem sobiv nõusolek säilib; uus versioon nõuab selget nõustumist. Hobuse faktilisi väiteid teenusele ei rakendata. Teadmata salvestust ei korrata pimesi ja teise vahekaardi tulemus ei kirjuta üle kohalikku salvestamata teksti.
- **Tarne:** Uus SQL asub ainult supabase/repairs/20261108_service_publication all. Täpne eelkonditsioonide kontroll ja üks tehing eelnevad lähtekoodi muutmisele. Ebakindel tehingutulemus kontrollitakse lugemisega. Seejärel varukoopia, kooste, commit ja tavaline push. Vanad väljastatud ZIP-id, rakendatud SQL ja kõik paigalduspäevikud säilivad.
- **r2 peatumise põhjus:** V1 fixture jättis taastamata service_categories tabeli retained TABLES-vaikeõigused ja lisas vanade save_my_service_v2 / set_my_service_status_v2 funktsioonide taastamisel hilisematest FUNCTIONS-vaikeõigustest anon EXECUTE. Algallikate järgi parandatud fixture annab observed dependencies 9dd1c4ef3f97785a8f164bb5409f9e4788835fd7a280d8b5db326c36c1be2572 ja absent capability c33641ef8c175d9b6cb4b80dba1503b95685fd371f68e92d62607101a40c5b26. Need ei ole suvaliselt lubatud uued räsid: mõlemad on lähtekoodist täielikult taastatud.
- **Esimese paketi tõend:** V1 manifest a7464dbe2444a5aaa354ace0c2694f7046adaa3a899828986f634651fd31c7bb; kasutaja stoppraporti SHA256 6430306e81abdae9cf961a1c3722ab6e47f1a86f24f2cfa39d99f824efa61af2. database not_started, build not_run, commit null ja push not_run. V1 pakett ja päevik on muutumatud; r2 saab uue manifesti ja eraldi väljalaskepäeviku.

## Tegelik kohalik katse

- V1 ühine teenuste sari: 75/75 PASS, 0 viga, vahelejätmist või tühistamist. Sõltumatu R2 võrdlus kinnitas viie testifaili, kõigi 576 build-sisendi ja kuue seadistusfaili täpsed räsid. Varasema testilogi ja build-tõendi seos kontrolliti; neid tulemusi ei esitata uue testijooksuna.
- R2 kuus SQL runtime gruppi ja kaheksa paigaldus/drift/rollback/replay juhtu PASS. Uus baseline-reconstruction PASS: mõlema tegeliku räsi taastamine, kahe sõltumatu ACL-kõrvalekalde tagasilükkamine, üks tehing ja replay, vaikeõiguste/rubriigiõiguste säilimine ning vanade kirjutajate sulgemine. 67 source-pin’i kontrollitud; 8 runtime SQL-moodulit V1-ga identsed. PostgreSQL/WASM on eraldatud kohalik katsekeskkond.
- V1 Next.js tootmiskooste koos TypeScriptiga PASS 30,668 s sünteetiliste võtmetega. R2 kõik 576 rakenduse sisendfaili on sama räsi ja sisuga; selle alusel kasutatakse sama kooste tõendit. Sihitud teenuste lint oli 0 viga ja 0 hoiatust; eraldi TSC PASS. Maci build toimub alles r2 paigaldamisel.
- V1 paigaldaja 41/41 kontrolli varasem täislogi on sõltumatult seotud muutmata testiallika, kuue paigaldaja abifaili ja nelja varasema väljalaske lepinguga. R2 täpne pakend saab eraldi koondkatse: uus SQL/manifest, varukoopiad, üks commit, tavaline lokaalne push, korduskäivitus ning peatunud V1 päeviku säilimine. Lõplik pakendi/ZIP tõend asub tarnearuandes; selle katse SQL-i ja build’i piirid on asendatud ning päris SQL-i katsed toimusid eraldi.
- Sõltumatu R2 ülevaatus kinnitas nelja variandiga mõlemad põhjuslikud ACL-erinevused. Guard-generator on V1-ga identne; genereeritud preflight/apply/verify ja catalog erinevad vaid kahe täpse oodatava räsi poolest. Paigaldusejärgne capability, funktsioonide hulgad ja 8 runtime SQL-moodulit säilivad. Native-brauserit, päris kontot, live-andmebaasi, Storage’i, Maci, GitHubi ega Verceli ei kasutatud.
- Muudetud ühise messaging-parseri sari läbis 14/14 juhtu. Public-profile-offerings sarja neli vana veateksti-ootuse tõrget kordusid täpselt muutmata aluses; kandidaat 21/25 ja alus 21/25. Teenuste 75 katse tulemus ei peida seda varasemat testivõlga. Täpsed nimed ja võrdlus on tarnearuande UI ülevaatuses.

## Production / kasutajaliides

- Kasutaja kinnitas hobuse vahetu muutmise ja mitu järjestikust salvestamist koos avaliku tulemusega. Varem kinnitatud galerii, noolte 3-sekundiline peitumine/tagasitulek, Minu ala pisipilt, pildilingid, peatamine/muutmine/aktiveerimine ja eraldi 90-päevane uuendamine jäävad vastu võetuks.
- Esimese teenuste paketi Maci eelkontroll käivitati 08.11.2026 19:49 UTC ja peatus enne muudatusi. Teenuste uus SQL, rakenduse build/push ning Verceli versioon ei ole selle katsega paigaldatud. r2 paigaldus ja teenuste kasutuskatse on ootel; kohalik parandus ei teinud live-andmebaasi, Storage’i ega deployment’i toiminguid.
- English/Eesti, Frankfurt fra1 ja varasem üks 9-sekundiline fotolisamise kasutajamõõt säilivad varasema tõendina.

## Üks järgmine töö

Paki selqiro-teenused-20261108-r2.zip Downloads-kaustas lahti ja järgi HOSTED_PORTAL.md ühte käsku. Oota sama commit’i Ready/Production tulemust ning kontrolli üht kahe fotoga teenuse Avalda teed, kaht järjestikust Muuda/Salvesta toimingut ja peatatud teenuse muutmist ning taastamist. V1 uuendajat ja vastu võetud hobuse/galerii katseid ei korrata.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindlat SQL-i, commit’i ega push’i ei korrata automaatselt. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks teenuste paigalduskäsk ja sihitud kasutuskatse.
- docs/architecture/service-publication-v1.md — teenuste kanoonilised andmed, staatus, salvestamine, fotod, kontaktid ja tarnepiir.
- docs/architecture/shared-marketplace-foundation.md — ühine kasutusloogika ja eraldi domeenid; docs/known-issues.md — allesjäänud piirid.
- supabase/repairs/20261108_service_publication/review/service-sql-review.json — SQL-i tegelikud katsed, täpsed räsid ja sünteetilise keskkonna piirid.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Hobuse ja tavakuulutuse staatuse muutmine ei uuenda tähtaega; 90 päeva pikendamine on eraldi omaniku kinnitus. Teenuste käesolev lahendus ei kehtesta uut tähtajareeglit.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse; kolm avatud ja 20 uut toimingut/24 h on eraldi olemasolevad kasutuselevõtukaitsed. Omaniku teenused on lehekülgedega, mitte ühe väikese vaikse kärpega.
- Üldine terminalne taustakoristus jääb eraldi tööks. Paigaldaja ei kustuta Storage’i objekte; teenuse toimingud koristavad ainult enda kontrollitud algfaile või galeriist eemaldatud hallatud veebifaile.
- Teenuste Quick Update, live-asukoht/saadavus, töötajad ja autopark on eraldi edasine töö; töökuulutused hiljem. Nende olemasolu ei väideta selle tarnega.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Teenuste uus SQL rakendub ainult teadaolevale täpsele eelolekule ühe kontrollitud tehinguga.
- Node/Sharp piirkond fra1 säilib; sõltuvusi ega teenusepiirkonda ei muudeta. Kohalik kooste ei asenda Maci build/push, Verceli Ready ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
