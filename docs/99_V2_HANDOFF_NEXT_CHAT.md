<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-08 Europe/Tallinn

## Praegune checkpoint

Hobuse esimene pakett peatus Macis enne muutmist veaga DATABASE_PRECONDITIONS_NOT_MATCHED. Õige result.json ja 08.11 kell 12:42 Eesti aja järgi kogutud ainult lugemise kontrolliraport kinnitasid main 92408b6, 1106 faili ning muutmata indeksi ja tööpuu. Funktsioonide kood ja tabelistruktuurid vastavad. Viie ACL-i ja kahe automaatse rolliliikmesuse erinevused taastati säilitatud migratsioonide ning PostgreSQLi enda käitumisega. r2 täpne testmudel kattub kõigis võrreldud kataloogifaktides. 38 SQL-juhtu ja 18 uuendaja kontrolli läbisid; runtime ning seitse SQL-moodulit säilivad. Uus selqiro-hobused-20261108-r2 pakett läbib enne väljastamist lõpliku koostatud paigalduspaketi ja ZIP-i kontrolli. Maci paigaldus ning hobuse kasutuskatse on ootel; teenused järgnevad sama lihtsa vooga.

## Lähtekood ja tõendi piir

- **Täpne alus:** Kasutaja kontrolliraport kinnitab main HEAD 92408b6ceb7a9fec3119d35a86c9bb47628acf22 ja puhta 1106-failise keelealuse. Peatunud paigalduse indeksi kõik blobid võrreldi taastatud lähtega: erinevusi pole. Paigaldaja nõuab endiselt eduka keelepaigalduse privaatset päevikut, täpset puud, main-haru, indeksit ja kinnitatud remote’i.
- **Hobuse üks voog:** Kõik viis tüüpi sale/free_transfer/lease/co_rider/wanted: väljad ja fotod → Avalda, hiljem Minu ala → Muuda → Salvesta muudatused. Privaatne prepare ja jätkamispäevik on sisemised; kohustuslikku eraldi mustandi salvestamist ei ole. Avaldatud muutmine kasutab sama horse_offers UUID-d ja eeldatud revisjoni ning jätab vana avaliku versiooni alles kuni atomaarse kinnitamiseni.
- **Täpne tulemus:** Toiming seob kasutaja, aktiivse identiteedi, võtme, sisu, revisjoni, galerii ja näidatud poliitikad. Edu nõuab kinnitatud vastust ning värsket sisu/galerii tagasilugemist. Kadunud prepare/publish vastus taastatakse sama võtmega; teadmata PUT-i ei saadeta pimesi uuesti. Päevikus pole fotobaite ega üleslaadimise saladusi/URL-e.
- **Avalik ja kontakt:** Tüübiga ühine avalik otsing ja profiil, /v2/horse-offer/{UUID}, hallatud horse-media ning olemasolev vestlussüsteem kasutavad kanoonilist hobuse viidet. Tavalisi kuulutusi ja hobuseid eristab content_type koos ID-ga. Privaatne täpne asukoht ei jõua avalikku projektsiooni.
- **Keel ja nõusolek:** English on põhikeel/fallback, Eesti teine keel, profiles.language jääb üheks konto eelistuseks. Keelevahetus säilitab vormi/toimingu. Kasutajasisu ei tõlgita. Praegune kinnitatava poliitika originaal on eesti keeles; mõlema liidese nõusolek seotakse täpse dokumendi ID/versiooni/räsiga.
- **Tarne:** Uus selqiro-hobused-20261108-r2.zip põhineb samal keelealusel, sest r1 peatus enne muudatusi. Senised funktsioonid ja õigused on täpselt kontrollitud; r2 ei kirjuta neid erinevuse tõttu ümber. Uus manifest loob eraldi päeviku, vana 575e990… jääb alles. Hobuse SQL 01–07, varukoopia, kooste, piiratud commit ja tavaline push tehakse guarded paigalduse kaudu.
- **Eelkontrolli tõend:** Ainult lugemise raportis leiti 15 erinevusrida: 3 koondräsi, 5 ACL-i ja nende 5 räsi, 2 rolliliikmesust. Kõigi 171 funktsiooni ülejäänud faktid, 5 struktuuri, 2 poliitika-autoriteeti ja 3 vaadet kattusid. Muutmata runtime’i kooste/kliendikatsete tõend säilib; SQL- ja paigaldustestid kontrollivad r2 parandust eraldi.

## Tegelik kohalik katse

- 35/35 hobuse kontrolleri ja tegelike Reacti SSR-komponentide testi läbisid: kõik viis tüüpi, null/uued/olemasolevad fotod, üks Avalda või Salvesta, täpne UUID/revisjon, taastamine ja identiteedi katkestus, EN/ET ning kinnitatud galerii.
- 6/6 avaliku lugemise lepingutesti läbisid: kanooniline detail, viis hinnastustüüpi, harupõhine väljade kaitse, ühine arvuliste/UUID kirjete otsing, profiili Näita rohkem ja tüübiga vestluskaardid. Lisaks läbis 112 olemasolevat otsingu/sõnumite/keele sihitud regressioonitesti. Uue hobuse voo ja säilivate lepingute lõppkontrollides läbis kokku 162 Node-katset.
- r2 parandatud PostgreSQL/WASM mudeliga läbis 38 SQL-juhtu: 21 paigalduskaitset, 9 avaldamise tuuma ja 8 avaliku/kontakti integratsiooni kontrolli. Uued juhud kontrollivad provider-vaikeõigusi ning keelduvad tundmatust ACL-ist, grant option’ist, overload’ist ja rolli ADMIN/INHERIT/SET/grantor erinevusest. Paigalduskaitsete 21 tulemust koosneb 19 muutmata läbinud juhust ning kahe sihitud jätkukontrolli tulemusest pärast ühe võimatu testseadistuse parandamist; algne jooks ja paranduse diff säilivad tarnearuande tõendis. See ei ole päris Storage ega native paralleelsete sessioonide test. Varasem 9/9 HTTP/meedia testi tõend säilib muutmata runtime’i alusel.
- Varasem tsc --noEmit --incremental false ja npm run build -- --webpack läbisid (build 28,69 s, exit 0). r2 kõik 499 runtime-faili, sõltuvused, build-seaded ja kliendi/serveri testide lähtefailid on nende tõenditega bait-baidilt samad. Neid kontrolle ei esitata uue r2 jooksuna; SQL-testmudeli ja paigalduskaitsete parandus kontrolliti eraldi. Maci paigaldaja teeb tegeliku projekti build’i.
- Selles tööruumis polnud natiivset brauseribinaari. Täielikku visuaalset brauserikatset ei tehtud; kinnitatud on tegelike komponentide SSR ja sünteetilise transpordiga kontrolleri/serveri käitumine. Varasema keelepaketi brauseritõend on ajalugu ega ole uue hobusevoo brauserivastuvõtt.
- r2 uuendaja 18/18 ajutise Giti juhtu läbisid. Uus test kinnitas r1 peatunud päeviku baitide/õiguste säilimise ja uue manifesti eraldi päeviku. Täpse koostatud paketi kontroll kasutab kõiki 1106 päris lähtefaili, kohalikku bare-remote’i ning selgelt märgitud build’i/andmebaasitranspordi asendusi; lõplik tulemus ja ZIP-i kontroll on eraldi tarnearuandes. See ei väida paigaldust kasutaja Macis, Verceli Ready ega brauseri kasutuskatset.

## Production / kasutajaliides

- Kasutaja on kinnitanud tavalise kuulutuse foto lisamise, põhipildi, eemaldamise/koristuse, kümne foto piiri ja avaliku nähtavuse. Viimase foto kuvamise paranduse 785c359 Ready / Production ning üks 9 s lisamine on kasutaja tõend; see pole püsiva keskmise lubadus.
- Frankfurdi fra1 seadistus ja senine EN/ET liides säilivad. Kasutaja kuvatõmmistes on ingliskeelne avalik otsing ning eestikeelne Minu ala; olemasolevat keelepaigaldust ei käsitleta enam järgmise lõpetamata tööna.
- Kasutaja r1 Maci katse peatus enne SQL-i, failide, build’i, commit’i ja push’i tegemist. Ainult lugemise raporti enne/pärast projekti- ja indeksiräsid on identsed. Hobuse SQL-võime puudub; r2 paigaldus ja uus Verceli Ready ning hobusevoo vastuvõtt on ootel.

## Üks järgmine töö

Väljasta kontrollitud selqiro-hobused-20261108-r2.zip ning kasuta HOSTED_PORTAL.md üht uuenda.py --publish käsku. Pärast selle commit’i Ready / Production tulemust tee üks hobuse teekond: loo fotoga kuulutus; kontrolli avalikku detaili, otsingut ja profiili; muuda sama UUID andmeid, lisa teine foto ning määra see põhipildiks; ava teiselt lubatud testkontolt kontakt; vaheta EN/ET. Seejärel vii teenused kanoonilise services UUID peale sama Avalda ning Minu ala Muuda/Salvesta loogikaga. Töökuulutused järgivad seda hiljem. Varasema foto kiiruse, keelepaigalduse ja fra1 vastuvõttu ei korrata ilma uue regressioonita.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks hobusepaketi paigalduskäsk ja sihitud kasutuskatse.
- docs/continuity/HORSE_PREFLIGHT_20261108.md — r1 peatuse põhjus, päris kataloogiraport ja r2 paranduse täpne ulatus.
- docs/architecture/horse-publication-v1.md — privaatne toiming, atomaarne revisjon, pildid, poliitikad ja avalik/kontakti leping.
- docs/architecture/shared-marketplace-foundation.md — ühine kasutusloogika, kanoonilised allikad, teenused järgmisena ja töö hiljem.
- docs/known-issues.md — veel puuduvad hobuse elutsüklitoimingud, teenused, õigusdokumendid ja üldine taustakoristus.
- docs/architecture/interface-language-v1.md — üks keele-eelistus ning sisu/poliitika piir.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. Keel ei muuda sisu, riigi, rahaühiku ega aktiivse identiteedi tähendust.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks. Ühine lugemisprojektsioon kasutab tüüpi koos ID-ga. Varikoopiaid listings tabelisse ei tehta ning arvulise kuulutuse kirjutajat ei kutsuta hobuse/teenuse UUID-ga.
- Hobuse müük, tasuta üleandmine, rent, kaasratsutaja ja ostusoov säilitavad oma väljad. Piltide täpsed baidid/liikmesus, maksimaalselt kümme fotot ja üks põhipilt säilivad. Null fotot on lubatud. Privaatne asukoht ja üleslaadimise saladused ei lähe avalikku vastusesse.
- Draft ja published on muudetavad; held_for_review, paused, closed, rejected, archived on lugemiseks. Uut archive/delete/pause/renew toimingut ei väideta valmis.
- Teenused saavad järgmisena ühe Avalda ning Minu ala Muuda/Salvesta voo ilma kohustusliku eraldi mustandita. Teenuse hinnastus, piirkond ja saadavus jäävad oma lepingusse. Töökuulutused tulevad hiljem.
- Piiratud vastusejärgne koristus ei ole üldine püsiv taustateenus. Katkestatud/aegunud üleslaadimised ja kogu portaali terminalne koristus on eraldi lõpetamata töö. Vanad failid, fotod, päevikud ja varukoopiad säilivad; ajaloolised NEXT/CURRENT pealkirjad ei ole tänased juhised.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Uus pakett lisab kontrollitud hobuse SQL-võime olemasolevasse kinnitatud projekti ainult paigalduskäsu kaudu; arendustöö ei teinud live-toiminguid.
- Verceli Node/Sharp funktsioonide piirkond fra1 säilib. Sõltuvusi ega teenusepiirkonda ei muudeta. Täieliku kohaliku kooste edu ei asenda Maci build/push, Verceli Ready ega kasutaja vastuvõttu.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
