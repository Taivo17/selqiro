<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 24.11.2026 Europe/Tallinn — a9d86e6 vastu võetud; tööpakkumiste avaliku lugemise konto kontroll ette valmistatud

## Praegune checkpoint

Teenuste kontooleku a9d86e6 etapp on Maci raporti, sama commit’i Ready / Production pildi ja kasutaja „Testides kõik töötab” kinnitusega vastu võetud. Uus väike moodul lisab tööpakkumiste avalikule lugemisele konto kontrolli kahe funktsioonikehaga. Sihitud kliendi-, SQL-, mahu- ja uuendaja kontrollid ning värske build läbisid. Maci rakendus, üks SQL tehing, uus commit/push ja veebikontroll on ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main a9d86e63ab667545598da8e40ee2a2d0c7365df3; puu e5e7d7d2253c7c89ff09bbd84d3e501674c2de90; 2227 faili. Eraldatud alus vastab vastuvõtu inventari SHA-256/Git blob/režiimidele. See pole uus Maci või remote’i vaatlus.
- **Aluse tõend:** selqiro-teenuste-konto-olek-20261124-raport-20261124-152403-bb0a636ba4be.json; 1362856 baiti; SHA256 3a84650999eaadaee99c280fd17ea029402b8e4542092bfa911a5db90dc8fad2. Raport kinnitab 15 testi, build’i, üht SQL rakendamist ja commit/push’i. Ready / Production pilt ja kasutaja kinnitus on eraldi tõendid.
- **Uus piir:** jobs_private.visible_to_viewer(uuid) ning get_public_profile_jobs_v1(text,integer,jsonb). Ühine helper kontrollib identiteedi kanoonilise omaniku kontot; profiililugeja kontrollib sama konto enne sisu ja nullib sobimatu identiteedi.
- **Üks kontooleku allikas:** account_lifecycle_private.account_is_available(uuid) säilib muutmata. Eraisikul identities.user_id; ettevõttel business_accounts.owner_user_id. Autor ega liige ei ole asendusomanik.
- **Vastuseleping:** Detaili null ning profiili null-identiteet/tühjad items/has_more=false/next_cursor=null säilivad. Otsing filtreerib enne lehekülje moodustamist. Uut vastusevälja ega täpset koguarvu ei lisata. Päringu- ja sisendivead jäävad vigadeks.
- **SQL tõendi piir:** Eelmise teenuste BASE/AFTER ning viimase tööde paranduse sõltuvused on kontrollis. Uued tööde kataloogiootused pärinevad lähtekoodist ja isoleeritud PostgreSQL-ist; Maci jooks vajab värsket täpset eelseisu.
- **Säilivad piirid:** is_public, avalikud väljad, omaniku lugemisluku parandus, kontakt, kirjutused, kviitungid, poliitika, raha ja kehtivus säilivad. Konto sulgemist, taastamist või kustutamist ei aktiveerita.
- **Dokumentatsioon:** a9d86e6 vastuvõtudokumendid, uus seisukirje ning nelja projektdokumendi lisad kaasatakse uude paketti. Vanad juhendid, päevikud ja väljastatud paketid säilivad.

## Tegelik kohalik katse

- 12/12 uut sihitud kliendikontrolli läbisid muutmata API-de/parseritega; 25 lähte-/lukufaili pinni säilisid. Lisaks läbis 6 päris hook’i juhitud kontrolli: vaataja/profiili vahetus, katkestus, vana edu/vea peitmine ja pooleliolev kursorileht. Hook’i katse pole React DOM ega brauser. Värske native PostgreSQL-i 22 vastusest läbis 20 päris parsingu ja 2 olid korrektsed null-detailid; 4 eraldi vigase konteksti/vastuse kontrolli lükati tagasi. Esimese katse otse sisestatud mittekanooniline sünteetiline palgasumma parandati tegeliku normaliseerija järgi; algne katse säilib. Portaali koodi, parsereid ega sõltuvusi selleks ei muudetud.
- 60/60 native PostgreSQL 17.6 kontrolli läbisid parandatud sünteetiliste sisenditega: kanooniline era-/ettevõtte omanik, puuduv või piiratud konto/Auth, detail, profiili null-ümbris, otsing, filtrid, kursorid, blokeerimine/peitmine, aegumine, õigused ja kataloogitriiv. Tegelik kaitstud apply, COMMIT-järgne kviitung ning eraldi verify läbisid; katkine tehing ja vale eelseis peatusid. 19 sünteetilise relatsiooni sõrmejälg säilis ja klaster peatati. Kõik 180 sisendit säilisid katse ajal; kaks genereeritud metaandmefaili finaliseeriti hiljem ning käiguaegsed koopiad on alles. Maci live-kataloog vajab eraldi värsket vastavust.
- 33 vana/uue võrdlusjuhtu, 198 ajastatud RPC-kutset ja 75 eraldi valitud päringuplaani. Katses kasvas 24 tööd 500 sobiva tööni ning lisati 5000 kõrvalist kontot/tööd, sh 2500 ettevõtet. Ühe kliendi muutumatutel katseandmetel olid kõik vastuseväljad võrdsed peale iga päringu read_at aja; see ei olnud üks jagatud MVCC snapshot. 5500 tööga filtrita otsing tegi 25 konto kontrolli (mediaan 13.41 → 15.57 ms), filtreeritud otsing 500 (31.21 → 79.99 ms) ja 200 tööga profiil 201 (19.75 → 36.00 ms); profiili limit=1 tegi samuti 201 kontrolli. Konto/Auth ning ettevõtte omaniku lugemine kasutas PK-indekseid. Filtrita otsing kasutas avaldamise kursoriindeksit; filtreeritud/profiili kandidaatide töö vajab eraldi optimeerimist. Kolm kordust, üks klient ja sünteetiline andmestik ei kinnita Productioni latentsust, RPC eelarvet ega samaaegset suurt mahtu. Varasem teenuste mahu piir säilib.
- Üks uus täielik Next.js 16.4.6 / TypeScript 5.9.3 build läbis 34.77 sekundiga eraldi tühja build-kaustaga. Kõik 765 sisendit säilisid; valmis tööotsingu, töö üksikvaate ja avaliku profiili väljundid. Kasutati lukufaili täpseid olemasolevaid sõltuvusi ja inertseid lokaalseid seadeid. Maci build ning Verceli avaldamine on järgmised eraldi tõendid.
- 29/29 uut uuendaja kontrolljuhtu läbisid 36.672 sekundiga; 46 külmutatud sisendit säilisid. Päris ajutine Git-hoidla/bare-remote ning piiratud oma alamprotsessid kontrollisid järjestust ja peatumist. Runtime-proov, CLI, SQL- ja build-vastused olid selles runneri katses sünteetilised. Seitse jagatud helperit jäid baiditäpseks. Kadunud SQL kinnituse järel tuvastatud järelseis ei luba commit/push’i ega automaatset korduskirjutust.
- Üks selle versiooni kohaliku Chromiumi käivituskatse peatus enne lehe loomist: socket() failed: Operation not permitted. Brauseriväiteid 0; päris kontosid ei kasutatud. Käivitust ei korratud lisalippude või teise ligipääsuteega. Tegelik veebikontroll jääb pärast sama uue commit’i Ready / Production tulemust kasutaja Macis teha.

## Production / kasutajaliides

- a9d86e6 ja varasemad profiili, tava- ja hobusekuulutuste, profiili turusisu ning Minu konto etapid on vastu võetud. Uue tööde paketi Maci ega live-SQL käivitust pole siin tehtud.
- Uuendaja kontrollib tegelikku lähtepuud/indexit, remote’i, sõltuvusi ja eelmise eduka käigu originaali; teeb 12 uut sihitud testi ning build’i. Seejärel täpne SQL eelseis, üks kahe keha tehing, COMMIT-järgne kinnitus, eraldi verify ja ainult paketi commit/push.
- Kadunud SQL kinnituse korral võib ainult lugedes tuvastada järelseisu, kuid commit/push peatub. Tundmatut kirjutust ei korrata. Kontode/sisu ridu, Auth/SMTP/DNS/Storage’i ega sõltuvusi ei muudeta.

## Üks järgmine töö

Paki selqiro-too-konto-olek-20261124.zip Downloads-kaustas lahti ja käivita python3 -I -B "$HOME/Downloads/selqiro-too-konto-olek-20261124/uuenda.py" --publish. Saada täpselt SAADA SEE FAIL real näidatud raport. Pärast sama uue commit’i Ready / Production tulemust värskenda portaali ja kontrolli olemasoleva tööpakkumise otsing → üksikvaade → avaldaja profiili tööd → tagasi teekonda. Kasuta olemasolevat era- ja ettevõttekonto sisu; puuduva erijuhu jaoks uut sisu ei looda.

**Peatumisel:** Tundmatu lähtepuu, indeks, originaalraport, protsessiseis, sõltuvus või SQL eelseis peatab uuendaja. Säilita lähtekood, sisu, paketid ja päevikud. Kadunud SQL kinnituse korral kirjutust ei korrata ning avaldamist ei jätkata automaatselt. Saada täpne raport või selle puudumisel PEATATUD-rida.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — uue paketi üks käsk ja kasutuskontroll.
- docs/architecture/account-job-read-fence-v1.md — kahe funktsiooni leping, kontrollid ja piirid.
- docs/architecture/account-service-read-accepted-20261124.md — vastu võetud a9d86e6 alus.
- supabase/releases/account-job-read-fence-v1/README.md — SQL eelseis ja üks tehing.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, kuulutusi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Konto active-only alus säilib. Sulgemine, taastamine ja lõppkustutamine vajavad ülejäänud lugemiste, otseõiguste, kirjutuste, sõnumite ja meedia tervikut.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; kinnitatud https://github.com/Taivo17/selqiro.git. Ainus alus a9d86e63ab667545598da8e40ee2a2d0c7365df3, puu e5e7d7d2253c7c89ff09bbd84d3e501674c2de90, 2227 faili. Viimane vastu võetud remote’i võrdsus: 24.11 kell 15:24:03.269 Europe/Tallinn. Enne kirjutust kontrollitakse tegelikku seisu värskelt.
- Next 16.4.6, Sharp 0.35.5, package.json ja lukufail säilivad. Kontrollitakse olemasolevat Supabase CLI 2.117.0 ja projekti vyjletlmwoiwxsnsunlm; paigaldusi ega uusi ühendamisi ei tehta.
- Uus päevik: ~/Library/Application Support/Selqiro/account-job-read-20261124/<manifest-sha256>. Eelmise account-service-read-20261124/72a6f6df04784348f1c91f8741df7dc5c9350bc1cf2dbd5fb7e58b35d2e22998/result.json originaali hoitakse ainult lugemiseks lukus.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
