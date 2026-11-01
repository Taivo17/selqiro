# Kuulutuse põhipilt ja merevaigutoon — 01.11.2026

## Seis ja tõendi piir

Seisukirje kuupäev on **2026-11-01**. See on kohalikult ette valmistatud ja kontrollitud
kuulutuste jätk lähtekoopias `work/selqiro-listing-lifecycle-20261101/source`.
Uue sammu Maci rakendamist, commit/push'i ega Verceli Ready tulemust ei ole
vaadeldud. Ettevalmistus, kohalik kontroll ja päris kasutaja vastuvõtt on eri
seisud; neid ei liideta üheks „valmis” väiteks.

Viimane kasutaja näidatud ja vastu võetud foto paranduse commit on
`b0a04fccbf354f0480a4b6eb8dd176b3c55383a8`. See ei tõenda tänast Maci HEAD-i ega
tööpuu puhtust. Sõnumifotode toimimine arvutis ja telefonis, Viofo foto,
automaatne vähendamine, kuulutusekaart ning klaviatuuri kohal nähtav kirjutusväli
jäävad vastu võetud aluseks. Vanu paigaldajaid ei korrata.

01.11 kasutaja suund säilib: esimene lõpetatav tervik on kuulutused koos
hobustega, kujundus valmib iga etapi sees ning eraldi hobuste portaali ei tule.
Täpsem eelnev audit ja otsused on `LISTINGS_DESIGN_NEWS_20261101.md`.

## Selle sammu täpne ulatus

| Osa | Ette valmistatud käitumine | Piir |
| --- | --- | --- |
| Olemasolev galerii | Omanik näeb hallatud kuulutuse olemasolevaid pilte ja praegust põhipilti. | Galerii peab vastama sama avaldamiskatse algsetele pildikohtadele. |
| Põhipildi valik | Olemasoleva foto põhipildiks määramine salvestatakse oodatud versiooni vastu ja sellele järgneb värske seisupäring. | Uute fotode lisamine, eemaldamine ja kogu pildielutsükkel ei ole selle sammu ulatus. |
| Kujundus | Avalik kuulutuste otsing ja Minu ala kuulutuste sektsioon saavad tagasi merevaigutooni; sisukaardid jäävad valgeks. | Teenuste/näidiste ühendamist, Töö tooni ega kogu portaali kujundust ei märgita tehtuks. |
| Koristamise tekst | Sisu eemaldamine, alles olevad veebipildid, algfailide koristus ja teadmata lõppseis on sõnastatud eraldi. | Hosted lõppkoristus ja reservi vabastamine on jätkuvalt lõpetamata. |

## Andmete ja päringute leping

Lisav SQL-kandidaat asub
`supabase/repairs/20261101_listing_primary_image/changes.sql`-is. See lisab
esitlusversiooni ja kaks olemasoleva omanikuõigusega RPC-d:

- `get_my_managed_listing_images_v1`: oodatud kasutaja, identiteet, kuulutuse ID ja avaldamiskatse UUID.
- `set_my_managed_listing_primary_image_v1`: samad seosed, lisaks oodatud versioon ja algne pildikoha järjekorranumber.

Versioon ja kuulutuse ID liiguvad kanoonilise bigint-tekstina; kliendis ei
ümardata neid JavaScripti arvuks. Galerii sisaldab kuni kümmet algses järjekorras
pildikohta. Iga URL on täpselt `/api/v2/listing-media/<sama katse>/<algne koht>`.
Tühi galerii on loetav; mittetühjas galeriis on täpselt üks põhipilt.

SQL-kandidaat muudab ühes tehingus `listing_images.is_primary`, `listings.image`
ja eraldi esitlusversiooni. Algseid avaldamiskohti, failiteid, failide kinnitusi
ja koristuskirjeid põhipildi valik ümber ei kirjuta. Lugemine ei loo versiooni.
Sama põhipildi valik õige versiooniga ei muuda andmeid. Aegunud versioon annab
konflikti ka siis, kui soovitud pilt on vahepeal juba põhipildiks saanud.

Olemasolev `createJourneyRequestHandler` lisab selleks `owner-images-read` ja
`owner-images-primary` tegevused. Päris Authi kasutaja ning hosted-valmisoleku
kontroll eelnevad RPC-le. Täpne Host/Origin, sisendi võtmed, UUID pikkus ja
kuju, algse koha vahemik ning versiooni kuju kontrollitakse. Tundmatuid serveri
veatekste kliendile ei tagastata.

Tüübitud mudel ja klient kopeerivad käsu muutumatuks enne asünkroonset tööd,
kontrollivad tegutsejat enne ja pärast päringut ning ei korda kirjutust.
Salvestusvastus peab tõendama sama pildivalikut, algseid URL-e/kohti ja täpset
versioonimuutust. Pärast teele saadetud kirjutuse katkemist jääb tulemus
teadmata, kui puudub üheselt lubatud keeldumisvastus. Uus valik on blokeeritud,
kuni värske autoriteetne lugemine on seisu kinnitanud.

Omanikuvaate ühendus säilitab sama konto/identiteedi teksti- ja hinnamuutmise
sisestuse piltide seisu värskendamisel. Konto, aktiivse identiteedi või
avaldamiskatse vahetus kõrvaldab vana seisundi ja hilised vastused. Puuduva
pildihaldustoega ei esitata oletatud põhipilti ega lubata pildikirjutust;
olemasolev teksti muutmise võimalus jääb kasutatavaks.

## Kontrollitud ja veel ootel

| Kontroll | Seis | Tõendi piir |
| --- | --- | --- |
| Tüübitud mudel ja klient | **85/85 läbisid.** `node tests/managed-listing-images.test.cjs` | Tegelikud TS-moodulid, kontrollitud tegutseja ja transport; päris teenusepäringuid ei tehtud. |
| HTTP-piir | **78/78 läbisid.** `node --conditions=react-server tests/managed-listing-images-handler.test.cjs` | Tegelik handler, Authi/valmisoleku kontroll ja HTTP-abikiht; väline fetch oli kontrollitud. |
| Mudeli TypeScript | **Läbis.** Eraldatud range ES2017 kontroll. | Ei asenda kogu rakenduse build'i. |
| Brauseri integreeritud muutmisvaade | **Lõplik lähteversioon läbis 1440/390/320 px juures.** | Tegelik leht, hook, klient, tekstisessioon ja privaatpildi laadija; sünteetiline Auth, kõik HTTP-päringud kinni püütud, välispäringuid ja lehevigu ei olnud. |
| SQL ja paigalduse kaitsed | **23 runtime- ja 15 paigalduskaitse katset läbisid.** | Tegelik PGlite 18, mittesuperkasutaja rollid ja sünteetiline andmestik. Native PG17, eraldi samaaegsete DB-seansside ja live-DB tulemust ei väideta. |
| Paigaldaja | **50 katset läbisid, 13,634 s.** | Päris Git ja kohalik bare-remote, päris timeout/Ctrl-C alamprotsessigrupid; SQL ja build olid sünteetilised. See ei ole Maci ega välise teenuse käivitus. |
| Rakenduse lõplik build | **Läbis: exit 0, 19,73 s.** | `review/run-build.py` käivitas `npm run build -- --webpack` ainult sünteetiliste Supabase/OpenAI build-väärtustega. Päris võtmeid ei kasutatud. |
| Runtime-failide sihitud ESLint | **6 faili läbisid, hoiatusi ei olnud.** | Viimase runtime-lähte kontroll; ei asenda SQL-i ega päris portaali käiku. |
| Maci rakendamine, commit/push, Vercel Ready | **Ei ole vaadeldud.** | Uut commit'i ega production-olekut ei oletata. |
| Päris kasutus uue põhipildivalikuga | **Ei ole vaadeldud.** | Kontrollitud brauserikatse ei asenda kasutaja portaali ega füüsilise telefoni tulemust. |

Brauseritõend `browser-check/browser-proof.json` kuulub üleandmispaki juurde,
väljaspool lähtepuud. Kontroll hõlmas topeltklõpsu ühte kirjutust, ühist hõivatud
olekut, sisestuse säilimist, konflikti ja teadmata tulemuse blokeeringut,
ebaõnnestunud/aegunud salvestusjärgset lugemist, identiteedi vahetumist samas ja
teises aknas, pooleliolevat identiteedivahetust, väljalogimist ja hilise vastuse
hülgamist. Tühi galerii ning puuduv pildihaldusvõime ei blokeerinud olemasolevat
teksti muutmist. 390 px kuvatõmmis vaadati visuaalselt üle. Kustutamise kinnitus
eraldati konto/identiteedi/kuulutuse/katse võtmega alamkomponendiks. Lõpliku
lähte brauseri korduskontroll läbis, sealhulgas A → B → A identiteedivahetuse
juhtum: varasem kustutamiskinnitus ei ilmu tagasi.

SQL-i koondtõendi failid on paranduse kausta
`tests/runtime-result.json` ja `tests/installation-result.json`. Need tõendavad
kohaliku PGlite-käigu tulemusi. Ühe ühendusega kohalik kontroll ei tõenda
kahe päris PostgreSQL-seansi samaaegset võistlust ega pilvepaigalduse tulemust.

Esimene build-katse peatus puuduvate keskkonnaväärtuste tõttu lehtede
kogumisel. Lõplik tõend on sünteetiliste build-väärtustega korduskäigu exit 0
ja 19,73 s; esimest katset ei loeta läbituks.

HTTP-piiri kontroll leidis kaks konkreetset puudust: puuduvate/lisaväljade
vealiigitus ja UUID lõpureavahetuse lubamine. Handleri parandus tagastab
lepinguvigadele `409/refused` ja nõuab uute pilditegevuste UUID-del täpset
36 märki. Vastavad tegeliku handleri katsed läbisid.

## Jätkuv tööjärjekord

1. Anda üle kontrollitud põhipildi/värvitooni parandus ning eraldi tööüleandmine. Rakendamisel kontrollida tegelikku Maci lähtebaasi ja säilitada kasutaja töö; uus Maci tulemus, commit/push ja Verceli Ready tuleb eraldi fikseerida.
2. Viia lõpuni avaldatud kuulutuse piltide kogu elutsükkel: lisamine/eemaldamine, kinnitatud failikoristus ja mahu vabastamine ning kogu kuulutuse halduse vastuvõtt. Pelk reast eemaldamine ei tõenda failide kustutamist.
3. Ühendada hobuste olemasolev vorm, eritingimused ja nõustumised samasse avaldamise, otsingu, detaili, profiili, Minu ala ja kontakti teekonda. Müügi ning ostusoovi semantika ja tüübiga viited säilivad.
4. Jätkata profiili/vestluse päris logode, Uudiste jälgitavate avaliku voo, teenuste, tootenäidiste ja Töö senise plaaniga. Puuduv funktsioon ei tohi näida töötava avalehelingina.
5. Viia ellu ülejäänud kokkulepitud käivitustööd. Energy ja maksete tuum jäävad avaliku käivitamise eelseks, mitte vaikimisi hilisemaks lisaks. Lõpus kontrollida terviku toimimist ja kujunduse ühtlust.

## Üleandmise rütm ja säilivad piirid

Selle etapi failinimed on `selqiro-kuulutused-pohipilt-20261101.zip`
(parandus) ja `selqiro-uleandmine-20261101.zip` (eraldi tööüleandmine).
Nimed ei tõenda nende käivitamist kasutaja Macis. Paigaldamisel tuleb järgida
paki enda algusjuhist; vanu sõnumite/fotode paigaldajaid ei käivitata.

Kasutaja palus tööga jätkata ning küsis eraldi üleandmispakki. See antakse
suuremate kontrollitud etappide järel, konteksti või vestluse vahetamisel ja
kasutaja soovil. Pakk peab sisaldama ühte algusjuhist, täpset lähtebaasi,
muudatuste ulatust, tegelikke kontrolltulemusi, teadaolevaid piiranguid ja
järgmist sammu. Vahepealne chat-uuendus ei asenda pakki; iga pisimuudatus ei
vaja eraldi paigaldusringi.

`CURRENT_STATE.json` on jooksva seisu ainus lühiallikas. `docs/99_V2_HANDOFF_NEXT_CHAT.md`
genereeritakse muutmata `scripts/continuity/render_current_handoff.py` abil ning
hoitakse alla 100 rea ja 16 000 baidi. Üleandmine ei tohi esitada kohalikku
ettevalmistust Macis rakendatud või Vercelis Ready muudatusena.

Vanad testkuulutused/testsõnumid võib kasutaja antud tingimuslikul loal eemaldada,
kui konkreetne probleem ja ulatus on tuvastatud. Selles töös kustutamist ei
tehtud. Kontosid, identiteete, logosid, teenuseid, tootenäidiseid, vanu raporteid
ja päevikuid ei kustutata. Üks portaal, olemasolev Supabase'i projekt ja
praegused ligipääsupiirid säilivad. Hosted failikoristus jääb lõpetamata ning
olemasolevaid reserve ei vabastata pelgalt uue põhipildi valiku tõttu.
