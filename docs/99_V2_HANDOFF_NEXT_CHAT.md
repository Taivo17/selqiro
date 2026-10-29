<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-29 Europe/Tallinn

## Praegune checkpoint

29.10.2026: päris portaalis on kuulutus 197 koos pildiga avaldatud ja teise e-postiga sisselogitud ostjale nähtav. Vastuvõetud main-commit on 8f25f65; 28.10 Verceli Production redeploy on Ready. Ostja Jaani Pood nupu Kirjuta müüjale POST /api/v2/listing-contact/contact tagastab 503. Chrome ei anna selle vastuse keha kätte; algpõhjus pole kinnitatud. Valmis on väike kontaktivea diagnostika lähteparandus, mille Maci rakendamine, uus commit/push ja deployment on veel kinnitamata. Sama DevToolsi ringi ega lõpetatud 27.10 paigaldust ei korrata.

## Lähtekood ja tõendi piir

- **Vastuvõetud alus:** 8f25f65: Connect controlled listing publication to the existing Selqiro portal. Eelmine main-commit e95fa9ce1d41b9b4c6e4884b6076f414173a946d. Uuendaja kontrollib kordumatu täieliku SHA, vanema, tegeliku main-haru, hoidla/remote’i ja failihašid enne kirjutust.
- **Kitsas kandidaat:** Kontaktitransport loeb vea JSON-i kuni 4096 baiti. Server ja klient säilitavad ainult lubatud etapi, põhjuse, HTTP staatuse ja teadaoleva SQLSTATE/PGRST koodi; nupu all kuvatakse lühike LC- tõrkekood. See parandab vea nähtavust, mitte veel kinnitamata 503 algpõhjust.
- **Säiliv käitumine:** Origini/Authi/readiness’i kontroll, RPC argumendid, sama katse võti, range edukas vastus ja suunamine säilivad. SQL-release, andmed, sõltuvusversioonid ja keskkonnaseaded ei kuulu koodideltasse.
- **Tarne piir:** Assistendis ettevalmistatud ja kontrollitud failid ei tähenda Maci paigaldust ega veebis avaldamist. Ühekordne uuendaja, lokaalne build, commit, push ja Verceli Ready tuleb eraldi tõendada.
- **Järjepidevus:** 27.–28.10 lõpetatud seadistus ja päris pildiga avaldamine on nüüd jooksvasse seisu kantud. Ajaloolised paigaldusjuhised, kontod, andmed ja senised privaatpäevikud säilivad.

## Tegelik kohalik katse

- Varasemad kohaliku avaldamise ja 26.–27.10 release’i kontrollid säilivad ajaloolise tõendina; nende laiu sarju selle diagnostikaparanduse tõttu ei korrata.
- 29.10 kontaktidiagnostika sihitud Node kontroll: 12/12 PASS, sünteetilised Auth/readiness/RPC vastused. Kontrollitud on veakeha 4096 baidi piir, HTTP staatuse säilimine aeglase veakeha puhul, katkestus/ajapiir, lubatud diagnostika, muutumatud konto/origini piirid ja range eduka vastuse leping.
- Lõplik Next16.2.1 production Webpack-build PASS: kompileerimine 5,3 s, TypeScript 8,4 s, 27 staatilist lehte. Ainult sünteetilised build’i seaded; päris Authi/andmebaasi ei kutsutud. Sõltuvuste lukufail ja versioonid ei muutunud.
- Build’i järel päris komponendi/kliendi kohalik brauseriproov Chrome for Testing156.0.8078.73-s PASS: lubatud tõrkekood nähtav, kõrvaline tekst väljajäetud, kolm käsitsi klõpsu tekitasid kolm päringut sama võtmega, edu suunas õigele vestluse URL-ile. Konto/router olid sünteetilised ja HTTP vastused pealt püütud; päris vestlus pole selle prooviga tõendatud.
- Uuendaja13/13 sihitud kontrolli PASS ajutiste kohalike Git-hoidlate/remote’idega; build ja sõltuvuskäsud olid mockitud. Kontrolliti kõrvalise töö säilimist, täpseid faile, build’i/push’i ebaõnnestumist ja kadunud push-vastuse ühekordset lugemiskinnitust. Python3.9 süntaks sobib. Maci rakendamine ja uus Verceli deployment on veel kinnitamata.

## Production / kasutajaliides

- 27.10 terminalipilt kinnitab DB-release’i, privaatse pildikogu ja kolme olemasoleva konto lubamise lõpetamist. Sama käik ise ei push’inud. Järgnev kasutaja terminalipilt kinnitab e95fa9c..8f25f65 main -> main push’i; täielikku uut SHA-d pole assistent Macist lugenud.
- Verceli kasutaja pilt: 8f25f65 / main / Ready 59s / Production. 28.10 Production anon-võtme seadistuse järel sama lähtecommit’i uus redeploy: Ready 1m9s / Production. Need on juba vastu võetud, mitte järgmised korduskatsed.
- Kuulutus 197: Müüa BMW, 4376 €, Taivo Garaaž, üks pilt. Kasutaja pildid näitavad avaldamise kinnitust, detaili, suurt pilti ja Minu ala Aktiivne olekut (kehtib kuni 26. jaan 2027 20:22).
- Ostja Jaani Pood on kasutaja sõnul sisse logitud teise e-postiga; sama kuulutus ja pilt avanevad. 28.10T20:02:27Z contact-päringu päistes on HTTP503, application/json. Vastuse keha puudub DevToolsis; ei ole alust väita kindlat SQL-, konto- või võtmeviga.
- Pildi koristusvaates: koristamisel 1, sulgemise kontroll ootel 0, vajavad tähelepanu 0, reserveeritud 29 MiB. Üheminutiline ooteaeg ei tõenda kinnijäämist. Hosted lõppkoristust ega avalikku täismahus valmidust ei ole vastu võetud.

## Üks järgmine töö

Valmis diagnostikaparanduse pakett rakendatakse ühekordselt olemasolevale ~/selqiro main-harule, kontrollitakse build ning saadetakse tavalise commit/push abil samasse GitHubi. Paketi --publish tähendab neid avaldamissamme. Pärast sama uue commit’i Verceli Ready tulemust avab ostja kuulutuse 197 ja vajutab ühe korra Kirjuta müüjale. Kui kontakt ebaõnnestub, piisab nupu all kuvatavast LC- algusega tõrkekoodist. Seejärel parandada tuvastatud põhjus. DevToolsi Response/Edit/Copy-as-fetch ringi, kolme konto aktiveerimist ja kuulutuse avaldamist uuesti ei nõuta.

**Peatumisel:** Erineva HEAD-i, remote’i, failihaši või kohaliku töö korral säilita kõik failid/index/commit ja lahenda tegelik erinevus. Ära kasuta reset/clean/stash/force-push’i, ära käivita vana ettevalmistajat ega muuda kontoõigusi oletuse põhjal. Ebaselge push’i puhul loe remote’i tulemus enne uut kirjutust. Tõrkekoodi võib jagada; Authorization’it ja võtmeid ei küsita.

## Loe ainult vajalikku

- docs/continuity/CONTACT_DIAGNOSTICS_20261029.md: praegune kontaktitõrge, kitsas lähteparandus, tõendi piir ja üks järgmine samm.
- docs/continuity/HOSTED_PORTAL.md: kindel olemasolev siht ja ajalooline seadistus. Sealne 27.10 paigaldus on lõpetatud ega ole praegune käivitusjuhis.
- src/entities/conversation/model/contactDiagnostic.ts, api/contactHttp.ts ning src/server/listing-publication/contact/: tõrkekoodi tegelik päritolu; SQL-i muutmine vajab esmalt konkreetset põhjust.
- docs/30_V2_SCOPE.md ja docs/31_V2_BUILD_PLAN.md: ühe portaali kokkulepitud V2 ulatus. CURRENT_STATE on praeguse tegevuse allikas; docs/99 genereeritakse sellest.

## Säilivad piirid

- Üks portaal ja hoidla; eraldi pilve-testbaasi ei looda. Varasem kohalik V2 backend ja proovikontod on arendusvahend ega kandu päris Supabase’i. Olemasolev lokaalne kasutuskinnitus säilib.
- Terminali e-post valib kolm olemasolevat kontot funktsiooni ajutiseks lubamiseks. Brauseris nõutakse päris Authi; paroole, e-posti ega võtmeid raportitesse ei ekspordita. Lõplik avalik kasutus ei tohi jääda käsitsi kolme konto lubamise taha.
- Sama private bucket: 25 MiB ja application/octet-stream,image/webp. Tegelik storage/readiness kontroll säilib. Serveri võtmed ei liigu brauserisse; avalik media peab endiselt vastama published-binding’u ja räsi lepingule.
- Hosted settle on endiselt pending/filesRemaining:null; lõppkoristus ja reserve vabastamine on ootel. Reserv 29 MiB/pildikoht, 300 MiB/konto. Üldine avalik väljalase nõuab püsivat koristust ja säilitustähtaegu. Üks pildiga kasutuskäik ei tõenda neid valmis.
- Tavaline avaldamine jääb üheks Avalda kuulutus tegevuseks. Energy/maksete tuum, teenused, identiteedid, sõnumid, piiratud AI abi ja haldus jäävad kokkulepitud V2 plaani; praegune kuulutuste etapp ei lükka neid vaikimisi avaliku käivitamise järel aega.

## Keskkond

- Maci olemasolev main: ~/selqiro. Säilivad ~/selqiro-veeb-20261026 (work/portal-20261026) ja ~/selqiro-v2-integratsioon-20261018. Värske täielik HEAD ja puhas tööseis tuleb enne järgmist kirjutust päriselt kontrollida.
- GitHub https://github.com/Taivo17/selqiro.git; Vercel selqiro / Taivo’s projects / https://selqiro.vercel.app; Supabase vyjletlmwoiwxsnsunlm / eu-central-1; paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2.
- Olemasolev Supabase CLI ja Maci autentimine säilivad. ChatGPT pluginate uus ühendamine ei ole selle koodiparanduse eeltingimus. Assistendi isoleeritud lähtekoopia ei ole kasutaja Mac ega tõenda tema praegust Git-seisu.
- Varasem privaatne ettevalmistusraport ~/Library/Application Support/Selqiro/hosted-publication/2d088814-0900-448a-a9d1-7b05470cb1d2/prepare-report.json jääb alles. Kontode e-postid, paroolid, võtmed ja brauseri Authorization ei kuulu raportitesse.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
