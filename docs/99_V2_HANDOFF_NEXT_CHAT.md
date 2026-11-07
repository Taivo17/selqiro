<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-07 Europe/Tallinn

## Praegune checkpoint

07.11.2026 kell 13:29 Europe/Tallinn uus r2 diagnostika lõpetas edukalt Python 3.9.6 all. Maci main HEAD a4b5b2d14e456e6e83d4412b839ef330259cd048, 1081 täpset lähtefaili ja puhas tracked tööpuu/index säilisid enne/pärast lugemist. Päris konto vaatlus kinnitas 277 MiB reservi, millest 225 MiB oli üheksa avaldatud algfaili ootel koristus. Ettevalmistatud on üks nelja rakendusfaili parandus: foto valik säilib omanikuvaate lugemise ajal ja olemasolev SOURCE-koristus lõpetab foto lisamise tööd. Kohalikud kontrollid ja kogu portaali build läbisid; uus Maci paigaldus, Verceli Ready ja päris lisamine on järgmine samm.

## Lähtekood ja tõendi piir

- **Tegelik lähtealus:** 07.11.2026 11:29:46–11:29:48 UTC Maci r2 raport: main a4b5b2d14e456e6e83d4412b839ef330259cd048, 1081/1081 väljastatud r2 lähteräsi, kinnitatud origin, enne/pärast võrdsed puhtad tracked tööpuu ja index. Untracked faile ei inventeeritud; uut Verceli Ready tõendit pole.
- **Konto reserv:** 300 MiB piirist on 277 MiB reserveeritud: üheksa published_source objekti 225 MiB ja 13 aktiivset WEB-objekti 52 MiB. Vaba 23 MiB ei mahuta uue foto 29 MiB reservi. Avatud/aegunud katseid, pooleliolevaid sessioone/osi ja metainfota reserve vaatluses pole. Aruanne vaatab 201/202 algse avaldaja kontot; see pole praeguse brauseri tegutseja või Storage I/O vaatlus.
- **Galerii vaatlus:** Kuulutus 201: viis aktiivset fotot, revision 6, kolm pending SOURCE-i. Kuulutus 202: kolm fotot, revision 2, kaks pending SOURCE-i; viimane kinnitatud lisamine 06.11 20:40:19 UTC. Mõlema galerii liikmesus ja põhipilt vastavad. Galerii kümne foto piir ja konto reserv on eraldi kontrollid.
- **Valiku parandus:** Üks ManagedListingPhotoAdd komponent säilitab sama kontrolleriga seotud kohaliku File-i fookusest algava omanikuvaate lugemise ajal. Native sisend jääb lubatuks, nähtav avamisnupp on kaitstud. Uus valik läbib olemasoleva reset/journal-kaitse; vana eduteate asemel kuvatakse valiku ootelolek. Kohaliku valiku saab kõrvale jätta ka lugemistõrke ajal. Üleslaadimine vajab endiselt eraldi kasutajatoimingut.
- **Algfaili lõpetamine:** Uus väike completePublishedSource kasutab olemasolevat SOURCE-only koristajat ja värsket seotud omanikuvaate kviitungit. Ainult täpne 54000/publication_retained_bytes_limit võib käivitada ühe sama emaavaldamise algfaili lõpetamise ning ühe identse prepare-korduse, kui ootel failide arv tõendatult vähenes. Tundmatu võrguvastus ei käivita kordust; SQL kontrollib uuesti õigust, revisjoni ja kõiki piire.
- **Vastusejärgne töö:** Kinnitatud append seob ühe SOURCE-lõpetamise Next after()-iga, eraldi 20 sekundi piiriga ja ilma algse päringu abort-signaalita. Õnnestunud append-vastus säilib ka koristuse/registreerimise vea korral. Olemasolev päevik ja lease taastamine säilivad. See pole kontoülene püsiv taustatööde teenus.
- **Tarne:** selqiro-foto-lisamise-parandus-20261107.zip rakendub otse tegelikule a4b5b2d lähtele. Neli rakendusfaili koos asjakohaste dokumentidega; SQL-i, sõltuvusi, limiite ega teenuseseadeid ei muudeta. Paigaldaja kontrollib kõiki 1081 baseline-faili, teeb varukoopiad, build’i, piiratud commit’i ja tavalise push’i; eelkäija paigaldajat ega vanu päevikuid ei käivitata ega muudeta. Täpse lõpliku ZIP-i kontrollitõend jääb muutumatu ZIP-i kõrvale.
- **Keelenõue:** Inglise keel on põhikeel ja puuduvate tõlgete varukeel; eesti on teine keel. profiles.language jääb ainsaks konto keele-eelistuseks. V2 täielik keelekatvus on eraldi lõpetamata töö; käesolev parandus ei loo uut keelesüsteemi.
- **Saabunud raport:** selqiro-foto-lisamise-raport-20261107-112946-2a66f792.zip, SHA-256 021ab5263e73bed83c1efcd9f8e376a43bdadc1dc2e772eebb277622e6d3556a. Täpne väljastatud r2 valideerija võttis vaatluse vastu. Üks read-only SQL-kutse, database:read_only_response_validated; uusi kirjutusi ei tehtud. Ajatemplite ühilduvus Python 3.9.6 all on nüüd päris raportiga kinnitatud.

## Tegelik kohalik katse

- 9/9 sihitud Chromiumi juhtumit PASS: focus-before-change ja teine explicit lisamine, valija katkestamine, kontrolleri/identiteedi vahetus, uuem teise vahekaardi journal, omaniku- ja galeriilugemise tõrge/taastumine, kohaliku valiku katkestamine ning vahepeal täitunud galerii. Tegelik integreeritud komponent/hook/session, sünteetiline Auth/RPC/Storage. Päris Maci/telefoni OS-valijat ei käivitatud.
- 31/31 serveripiiri testi PASS: täpselt üks lubatud prepare-kordus, teiste piirangute/tundmatu vastuse järel korduse puudumine, ema/alamvõtmete eristus, teise lubatud äriliikme tegutseja, vale kviitungi keeldumine, koristuse vea ja held-claim käsitlemine ning kinnitatud append-vastuse säilimine.
- Muutmata tegelik SQL kohaliku PGlite sees: 27 väidet PASS. Sünteetiline 277 MiB =9 SOURCE + 13 WEB keeldus esimesest prepare-st; ühe 25 MiB algfaili tõendatud lõpetamise järel identne prepare õnnestus (281 MiB koos uue 29 MiB-ga). Append andis galerii 3→4 ning vastusejärgne lõpetamine viis reservi 256 MiB-ni. Kõik 13 varasemat WEB-faili ja uus 14. säilisid. Storage ja Auth transport olid sünteetilised; päris teenust ei kasutatud.
- Tegelik Next 16.2.1 after/AfterContext/WorkAsyncStorage kontroll PASS sünteetiliste onClose/waitUntil hookidega: SOURCE-töö ei alanud enne vastust, registreeritud waitUntil sai ühe töö pärast close’i ning päringu katkestamine seda ei katkestanud. See pole hosted deployment ega päris HTTP-serveri katse.
- Üks ühine npm run build -- --webpack PASS (26.42 s), sealhulgas TypeScript ja 27 staatilist lehte. Sünteetilised kohalikud build-seaded, sama package-lock ja olemasolevad sõltuvused; neli rakendusfaili säilisid build’i ajal. Eelmise prototüübi build’i ei kasutata selle paranduse tõendina.
- Paigaldaja 4/4 sihitud tarnekontrolli PASS: täpne baseline, piiratud commit/push ja korduskäivituse idempotentsus, hilisema commit’i säilitamine/keeldumine, tundmatu pakifaili ja puuduva lähtekaitse keeldumine. Tegelik ajutine Git ja kohalik bare-remote, sünteetiline build/tähtis baaskohandus; päris Maci ega välisvõrgu push’i ei tehtud.
- Sõltumatu serveri lähteülevaatus ei leidnud konkreetset takistust. Täpsed lähte-, SQL-, testirakenduse ja framework-räsid säilivad tarne kontrollid-kaustas. Lõplik arhiiv kontrollitakse pärast kõigi failide pakkimist; käesolev dokument on pakki minev enne arhiivi külmutatud hetktõmmis.

## Production / kasutajaliides

- Kasutaja kinnitas varasemalt foto lisamist ja avalikku nähtavust, foto eemaldamist, põhipildi muutmist ning eemaldatud foto koristuspaneeli kadumist. Need kasutuskatsed jäävad vastu võetuks.
- Uus kaebus: viie fotoga kuulutus 201 ei lisa rohkem, täpne konto ruumipiirangu teade; kuulutus 202 näitas vana eduteadet ilma uue fotota. Värske read-only raport kinnitas konto reservi ja olemasolevaid galerii ridu, kuid pole uue paranduse kasutuskatse.
- 17 s ja 19 s stopperiajad on varasema eduka lisamise mõõtmised; 27–31 s oli ligikaudne loendus. Käesoleva paranduse kiirust tootmises pole mõõdetud. Esimene uus prepare võib oodata ühe vana SOURCE-i lõpetamist.
- Maci tegelik viimane kinnitatud lähtecommit on a4b5b2d14e456e6e83d4412b839ef330259cd048. Assistent pole muutnud päris andmebaasi, Storage’it ega Maci. Uue paranduse commit/push, sama commit’i Verceli Ready ja kasutaja uus foto kinnitatakse eraldi.

## Üks järgmine töö

Laadi selqiro-foto-lisamise-parandus-20261107.zip ja paki Downloads-kaustas lahti. Käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk, oota terminalis saadud uue commit’i Verceli Ready tulemust ning värskenda portaali. Lisa kuulutusele 201 üks uus foto ja kontrolli eelvaadet, galerii suurenemist ning avalikku nähtavust; mõõda võimalusel aeg. Uut diagnostikat ega vana paigaldajat ei käivitata selle asemel uuesti.

**Peatumisel:** PEATATUD korral säilita rida ja raport, kasutaja muudatused ning kõik päevikud. Räsikaitset, remote’i või SQL-i õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindla SQL-vastuse järel kontrollitakse tegelikku lõppseisu; sama apply ei käivitu pimesi uuesti. Vanu pakke, paigaldusi ja edukaid kasutuskatseid ei korrata ilma uue konkreetse põhjuseta.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — uue paranduspaki üks käsk ja üks päris kasutuskatse.
- docs/continuity/PHOTO_ADDITION_DIAGNOSTIC_20261107.md — vastuvõetud raport, tegelik reserv, valiku viga ja paranduse piir.
- docs/architecture/published-photo-addition-v1.md — üks fail, sama emaseos, piiratud SOURCE-lõpetamine ja vastusejärgne töö.
- docs/known-issues.md — üldine koristus ja täielik V2 EN/ET katvus jäävad eraldi töödeks.
- docs/engineering-handbook.md — senise koristuskorralduse väike põhjendatud täpsustus.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja kontosüsteem. Tavapärane kuulutuse haldus ei sõltu Energyst. Aktiivses galeriis kuni 10 fotot; eemaldatud järjekorranumbreid ei taaskasutata.
- Konto kolm aegumata avatud katset, 20 uut katset 24 tunnis ja 300 MiB loogiline reserv säilivad. Ühe foto 25 MiB SOURCE + 4 MiB WEB reserv pole faili tegelik ketta- või teenuse arveldatav maht.
- Automaatne samm puudutab üht sama avaldamise lubatud SOURCE-i. WEB-fotod säilivad. Teise identiteedi või konto objekte ei otsita; teise lubatud äriliikme puhul võib algfail kuuluda algse avaldaja reservi. Uus prepare peab endiselt läbima kõik tegelikud piirid.
- Üldine katkestatud/aegunud/terminalsete üleslaadimiste püsiv taustal lõpetamine ja tehniliste paneelide eemaldamine tavakasutaja vaatest on enne avalikku avamist lõpetamata. Paneeli peitmine ei asenda töö lõpetamist.
- Kasutajaliidese keel on konto eelistus, mitte aktiivne äriidentiteet või riik. English põhikeel/fallback ja eesti teine keel; kasutaja sisestatud teksti ning avaldamistingimuste keelt ei muudeta automaatselt.
- Üks foto korraga. Olemasolevaid andmeid ega vanu päevikuid ei kustutata; cleanup eemaldab ainult juba senise lepingu järgi lubatud täpse SOURCE-i pärast avaldamist.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git, portaal https://selqiro.vercel.app, olemasolev Maci siht /Users/taivo/selqiro. Uut hoidlat ega worktree paigaldajat ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm, paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2. Koguja kasutab sama kontrollitud viie faili CLI pini ja kinnitatud project-ref linki; uusi teenuseseadeid ega ligipääsuandmeid ei lisata.
- SERVICE_ACCESS.json-i ajaloolised kuupäevad ja NEXT-pealkirjad pole tänased käsud. Maci/Giti, andmebaasi, Verceli ja kasutuskatse tulemused kinnitatakse eraldi.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
