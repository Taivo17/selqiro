<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-30 Europe/Tallinn

## Praegune checkpoint

30.10 kasutaja tegelik result.json kinnitab main-baasi cbd475757690db7bd1faf8784cd43359f45d5be9, 103 lähtekaitse ja 75 payload-faili lähteseisu läbimist. Jätkupakk 599af1fac165ff90ada9d89f4f4cf18bbe46d0c9543988176b020f080fc00935 peatus baseline_verified etapis DATABASE_PRECONDITIONS_NOT_MATCHED juures. Ainus väär kontroll oli storage_policy_authority; ülejäänud kuus olid tõesed, uus bucket puudus ning DB/Storage/lähtepaigaldus/build/commit/push ei alanud. Parandus tunnustab tavalise omanikupõhise õiguse kõrval registreeritud Supautils policy_grants-i täpset postgres → storage.objects luba. SQLi päris CREATE POLICY ja tehinguline järelkontroll jäävad jõusse. Uue paketi Maci tulemus ja Verceli Ready on ootel.

## Lähtekood ja tõendi piir

- **Fotod:** Üks JPEG/PNG/WebP kuni 5 MiB algfail; brauser ja server kontrollivad eraldi. Uus privaatne message-attachments-v2 hoidla lubab 2 000 000 baiti WebP. Brauserile antakse kontrollitud privaatne Blob, mitte objekti URL. 250 MiB konto eelarve säilitab ka tombstone-kirjed.
- **Identiteet:** Pooleli vahetusel peatab konto/operatsiooni külge seotud lukk kõik actor-värskendused kuni matching lõpuni. Aktiivse identiteedi RPC kasutab algse kasutaja kinnitatud sessioonitokenit. Mustandid ja ebaselged korduskatsed ei liigu teise konto alla.
- **Kontrollitud tegevused:** Ranged konto/identiteediga seotud HTTP- ja SQL-käsud; muutumatud saatmiskinnitused; nähtud sõnumi ID järgi loetuks märkimine; oma postkastist peitmine; konto blokeerimine ka V1 otsese saatmise korral. Põhjendamata üksiksõnumi tagasivõtmist ei lisata.
- **Paigaldus:** selqiro-sonumid-oigused-20261030/uuenda.py --publish hoiab mõlema varasema sõnumipäeviku ainult lugemiseks avatud lukku. Algne 49bb… on täpne SOURCE_GUARD_CHANGED peatus enne kirjutusi; 599… on tegeliku raportiga tõendatud read-only eelkontrolli peatus. Uus päevik seotakse mõlema muutmata raportiga. Vana unknown-seisu ei võeta trusted-baseline’iks; värske eelkontroll peab läbima parandatud õigusekontrolli ja säilitama kõik 11 varasemat invarianti. Seejärel säilivad üks uus privaatne fotohoidla ja tehinguline SQL vajaduse korral, varukoopiad, build ning piiratud commit/push.
- **Paketi viiteparandus:** Kohaliku skeemi require_actor_hosted_v1 võetakse juba kaardipaketi poolt Git-i paigaldatud supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql failist. Selle SHA aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b ja valitud deklaratsioon on muutmata. Vana cloud-only remondi source_delta ei olnud Maci source-sünkroonimise tõend; puuduva faili kaitset ei muudeta valikuliseks.
- **PostgreSQLi kataloog:** PostgreSQL 18 lisab NOT NULL piirangutele eraldi pg_constraint kirjed. Võrdluses ühtlustatakse ainult see dubleeriv esitus; attnotnull ja kõik muud piirangud jäävad kontrolli alla. PG18 NOT NULL peab olema kinnitatud, jõustatud ja pärandumiseta ning igal nõutud veerul peab olema täpselt üks vastav kirje. PG17 ühilduvust toetab ametlik kataloogikirjeldus; siin käivitatud engine on PGlite PostgreSQL 18.6.
- **Storage’i õigusekontroll:** Varasem guard samastas poliitika loomise õiguse storage.objects omaniku rolli USAGE-ga. Supabase toetab eraldi Supautils poliitikahalduse luba. Uus kontroll loeb ainult registreeritud pg_catalog.pg_settings sighup/string seadet, kontrollib täpset täitjarolli ja storage.objects OID-d. Suvaline custom-GUC tekst või vale roll/tabel ei sobi. Rolle, omanikke ja teenuse konfiguratsiooni ei muudeta. Päris DDL-luba jõustab andmebaas; täpne piirav poliitika kontrollitakse enne COMMIT-i.
- **Tõendi piir:** Tegelik Maci result.json on loetud ja tõendab ainult eelkontrollini jõudmist. Uue õigusekontrolli, kataloogikontrolli ja kahe päeviku jätku kohalikud sihitud katsed on review/verification.json-is. Muutmata rakenduse varasemaid parserite/Sharp/React/tootmisbuildi kontrolle ei esitata uuesti käivitatuna. Supautils C hook’i tegelik teenusekäivitus, uue paketi Maci lõpp, Verceli Ready ja füüsilise telefoni klaviatuur on veel kinnitamata.
- **Uus kandidaat:** Sama vestluste/sõnumite andmemudel. Telefonis kasvav kirjutusväli, üks saatmisnool ja kompaktne foto +; arvutis Enter/Shift+Enter. Oma identiteet ja logo jäävad koostaja juurde, partner ja kuulutuse link päisesse. Fotod ja ajaloolised kuulutusekaardid on eraldi manused.
- **Vastuvõetud alus:** Kasutaja kaardijätku VALMIS ja tegelik sõnumijätku raport kinnitavad sama commit’i cbd475757690db7bd1faf8784cd43359f45d5be9. Kuulutuse 197 avaldamine, vestlus 38, tekst ja kuulutusekaart on varasema tõendiga vastu võetud. Mõlema peatunud sõnumikatse andmebaasi paigaldus, build ja push jäid tegemata.

## Tegelik kohalik katse

- Node 31/31 PASS: sõnumite range leping, päris SQL-i kümme vastusekuju, Sharpiga fotokontroll ja tegeliku Supabase SDK identiteedipäringu sessiooniseos. Välised Auth/RPC/Storage vastused on sünteetilised.
- PostgreSQL/PGlite runtime- ja piiratud paigaldajarolliga paigalduskatsed PASS; lõplikud loendused on tarne review/verification.json failis. Kaetud on õigused, foto/kaart, blokeering ka vana INSERT-tee kaudu, muutumatu korduskatse, nähtud ID ja tehingu rollback. See ei tõenda eraldi pärisühenduste samaaegsust.
- Päris Reacti brauserikatsed PASS: 1440/390/360/320 px; 320×360 ja 390×360 nähtav ala koos foto, kaardi ja viierealise mustandiga; fookus, ajalugu, kerimine, lugemata seis ja postkasti haldus. Sünteetilised võrgupiirid, päris fotosisu ettevalmistus.
- 12/12 eraldi identiteedivahetuse brauserikontrolli PASS. Tõendatud varasem focus/TOKEN_REFRESHED/storage race on parandatud; kontrollitud ka shared-identity hiline sessioonivalik ja konto muutus.
- Paigaldaja Git/DB/Storage jätkamiskatsed ning päris kohalike buildi alamprotsesside katkestuskatsed PASS. Siinsete katsete remote on ajutine bare-hoidla, pilvevastused ja updateri build asendatud. Portaali tegelik tootmisbuild ja sihitud lint on eraldi kontrollitud.
- Uue tühja kohaliku arendusbaasi skeemi koostamine ja räside kontroll kuuluvad tarne tõendisse. Olemasoleva lokaalse andmebaasi resetti või automaatset migratsiooni ei lisata.
- Tarnitud allikaviite parandus ja lokaalne koond-SQL säilivad. Uue jätku sihitud testid katavad Supautils registreeritud loa tõlgendamist, omandiõiguseta ja võltsseadega keeldumist, täpset Storage’i poliitikat, PostgreSQLi kataloogide võrdlust ning mõlema vana päeviku lukustust ja muutmata säilitamist ja kõigi 11 invariandi säilimist. Täpsed tulemused ja testikeskkonna piirid on tarne review/verification.json-is.

## Production / kasutajaliides

- Kasutaja terminal/Vercel kinnitasid 8f25f65 main pushi, Production Ready, anon-võtme järel redeploy ning kuulutuse 197 avaldamise pildiga. Seda ettevalmistust ei korrata.
- 29.–30.10 kasutaja pildid kinnitavad vestlust 38, ostja teksti lugemist müüja V1/V2 vaates ning seejärel kuulutusekaarti mõlema osalise V2 sõnumis. Vana 503 ja kaardipaigaldaja peatumine ei ole tänane töö.
- 30.10 kaardijätku commit cbd475757690db7bd1faf8784cd43359f45d5be9 ja push on vastu võetud. Tegelik result.json kinnitab sõnumijätku 599… sama lähtebaasi kontrolli ning ainult lugemisega DB-eelkontrolli. Ainus false guard on storage_policy_authority; DB not_started, build not_run, commit null, push not_run. Uus parandatud kandidaat on eraldi; selle Maci lõpptulemust või Production Ready seisu ei ole kinnitatud.
- Kuulutuste hosted lõppkoristus/reservivabastus ja üldine avalik käivitamine on eraldi lõpetamata tööd; sõnumite tarne neid tehtuks ei märgi.

## Üks järgmine töö

Käivita Downloads-kausta lahti pakitud selqiro-sonumid-oigused-20261030/uuenda.py --publish. Jätk lukustab muutmata mõlemad varasemad sõnumipäevikud, kontrollib täpset cbd4757 lähtebaasi ja võrdleb enne ühtki pilvekirjutust kõiki 11 andmebaasi invarianti ning kolme puuduvate objektide sõrmejälge üles laaditud peatuse tõendiga. Pärast VALMIS tulemust oota sama uue commit’i Restore complete identity-bound V2 messaging Verceli Ready olekut ja värskenda portaali. Vanu kaardi-, kontakti- ega kontoaktiveerijaid ei korrata.

**Peatumisel:** PEATATUD korral säilita result.json, varukoopiad ja mõlemad vanad sõnumipäevikud. Uus jätk nõuab mõlema täpset tõendatud peatust ning hoiab nende lukke kogu töö ajal. Enne pilvekirjutust peab värske DB-lugemine säilitama kõik 11 varasemast raportist pärit invarianti. Sama uus käsk jätkab ainult kontrollitud oma päevikust; ebaselget SQLi/Storage’i loomist ei korrata pimesi. Tundmatuid lähtefaile ei kirjutata üle. Vanu kontakti-, kaardi- ega kontoaktiveerijaid ei korrata. Päris sõnumeid ei saadeta tööriistadega ilma selge saatmiskäsuta.

## Loe ainult vajalikku

- docs/continuity/MESSAGING_RESTORE_20261030.md: kasutusloogika, säiliv V1 ajalugu, piirid ja üks paigalduskäsk.
- supabase/repairs/20261030_messaging_restore/README.md: SQLi õigused, preflight/verify ja tõendi piir.
- src/server/messaging-media/README.md: fotode privaatsus, kinnitused ja koristuse piirid.
- docs/continuity/INBOX_CARDS_20261029.md ja INBOX_V1_REVIEW_20261029.md: varasema kaardi ja V1 auditi ajalugu, mitte korduspaigaldus.

## Säilivad piirid

- Üks portaal, hoidla ja olemasolev Supabase’i projekt. Kohalik arendusbaas/proovikontod ei kandu pilve. Uut pilve-testbaasi ei looda.
- Olemasolev kolme konto hosted-lubamine ja päris Auth jäävad jõusse. Üldine avalik kasutus ei tohi jääda käsitsi konto lubamise taha, kuid see tarne piirangut ei eemalda.
- Kuulutuspiltide olemasolev private bucket (25 MiB, application/octet-stream,image/webp), avalik published-binding/räsi kontroll ja serverivõtmete piir säilivad. Uus sõnumifotode privaatne bucket on eraldi.
- Kuulutuste hosted settle jääb pending/filesRemaining:null; reserv 29 MiB/pildikoht ja 300 MiB/konto. Lõppkoristus, säilitustähtajad ja reservi vabastamine on eraldi lõpetamata.
- Sõnumifotod: 250 MiB konto kohta koos kinnitatud ja tombstone-kirjetega. Peitmine mahtu ei vabasta. Kasutuse järel piiratud koristus ei ole püsiv scheduler ega hilinenud kirjutuste lõplikkuse tõend.
- V1 hilisem last_read_at ei kasvata olemasolevat V2 loetud ID-d. Oma postkastist peitmine ei kustuta teise osalise sõnumeid; üksiksõnumi tagasivõtmist ei lisata.
- Energy/maksed, teenused, identiteedid, sõnumid, piiratud AI abi ja haldus jäävad kokkulepitud V2 plaani. See tarne ei nihuta neid vaikimisi avaliku käivitamise järel aega.

## Keskkond

- Maci main ~/selqiro; säilivad ~/selqiro-veeb-20261026 ja ~/selqiro-v2-integratsioon-20261018. Uuendaja kasutab sama maini, täpseid baashaše ja kasutaja töö kaitset.
- GitHub https://github.com/Taivo17/selqiro.git; Vercel https://selqiro.vercel.app; Supabase vyjletlmwoiwxsnsunlm / eu-central-1; paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2.
- Olemasolev Supabase CLI 2.117.0, viie faili pinnid ja Maci autentimine. Uut tööriista ei paigaldata. Olemasolevat serveri API-võtit kasutatakse ainult uue privaatse bucket’i ettevalmistuseks; võtmeid ei logita ega küsita vestluses.
- Uus päevik/varukoopiad ~/Library/Application Support/Selqiro/messages-20261030/<manifest-sha>/. Kõik varasemad hosted-publication/contact-repair/inbox-cards päevikud säilivad. Raportitesse ei lisata e-posti, paroole, Authorizationi ega võtmeid.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
