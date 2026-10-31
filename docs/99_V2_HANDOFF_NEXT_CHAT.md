<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-31 Europe/Helsinki

## Praegune checkpoint

31.10 kasutaja kinnitab telefoni kirjutusvälja/klaviatuuri parandust ning varem suure foto õnnestumist arvutis. Alles on telefonis valitud Viofo foto avamise tõrge. Saadud JPEG-koopia avaneb; algse telefonifaili põhjus ei ole tõendatud. Uus kitsas kandidaat parandab tõendatud EXIF-päiselugeja ühilduvuse ning lisab piiratud kohaliku HTML-pildielemendi dekodeerimisvariandi. Lõpliku lähtekoodi 55 pildikontrolli, 7 Reacti katsegruppi, 12 dekoodri ressursikontrolli, tootmisbuild/TypeScript/lint ning 22 paigaldajakatset läbisid; päris telefoni uus tulemus ning deployment on ootel.

## Lähtekood ja tõendi piir

- **Fotod:** Brauseri algfail kuni 32 MiB / 64 MP; kohalik päisekontroll, kõigi EXIF-plokkide eemaldamine ning esimene kehtiv suund üks kord. Põhitee on piiratud bitmap, varuvariant 20-sekundilise piiriga kohalik HTMLImage. Kuni 1600 px / 1 400 000 B WebP; serveri, päringu ja konto mahu piirid säilivad.
- **Identiteet:** Pooleli vahetusel peatab konto/operatsiooni külge seotud lukk kõik actor-värskendused kuni matching lõpuni. Aktiivse identiteedi RPC kasutab algse kasutaja kinnitatud sessioonitokenit. Mustandid ja ebaselged korduskatsed ei liigu teise konto alla.
- **Kontrollitud tegevused:** Ranged konto/identiteediga seotud HTTP- ja SQL-käsud; muutumatud saatmiskinnitused; nähtud sõnumi ID järgi loetuks märkimine; oma postkastist peitmine; konto blokeerimine ka V1 otsese saatmise korral. Põhjendamata üksiksõnumi tagasivõtmist ei lisata.
- **Paigaldus:** selqiro-foto-telefon-20261031/uuenda.py --publish on ainult telefoni foto avamise lähtekoodi jätk. Täpsed viimase 31.10 tarne lähteräsid, puhas main, tuntud cbd4757 eellane, remote main == HEAD. Tegelik baas salvestatakse uude messages-photo-20261031 päevikusse; varukoopiad, build, manifesti commit ning tavaline push. DB/Storage parandajaid ei kasutata.
- **Paketi viiteparandus:** Kohaliku skeemi require_actor_hosted_v1 võetakse juba kaardipaketi poolt Git-i paigaldatud supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql failist. Selle SHA aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b ja valitud deklaratsioon on muutmata. Vana cloud-only remondi source_delta ei olnud Maci source-sünkroonimise tõend; puuduva faili kaitset ei muudeta valikuliseks.
- **PostgreSQLi kataloog:** PostgreSQL 18 lisab NOT NULL piirangutele eraldi pg_constraint kirjed. Võrdluses ühtlustatakse ainult see dubleeriv esitus; attnotnull ja kõik muud piirangud jäävad kontrolli alla. PG18 NOT NULL peab olema kinnitatud, jõustatud ja pärandumiseta ning igal nõutud veerul peab olema täpselt üks vastav kirje. PG17 ühilduvust toetab ametlik kataloogikirjeldus; siin käivitatud engine on PGlite PostgreSQL 18.6.
- **Storage’i õigusekontroll:** Varasem guard samastas poliitika loomise õiguse storage.objects omaniku rolli USAGE-ga. Supabase toetab eraldi Supautils poliitikahalduse luba. Uus kontroll loeb ainult registreeritud pg_catalog.pg_settings sighup/string seadet, kontrollib täpset täitjarolli ja storage.objects OID-d. Suvaline custom-GUC tekst või vale roll/tabel ei sobi. Rolle, omanikke ja teenuse konfiguratsiooni ei muudeta. Päris DDL-luba jõustab andmebaas; täpne piirav poliitika kontrollitakse enne COMMIT-i.
- **Telefoni parandus:** Kasutaja kinnitas 31.10 klaviatuuri kohal nähtavat kirjutusvälja koos kuulutusekaardiga ja ilma. Olemasolev route viewport, CSS, composer ning viewport-hook jäävad vastu võetud baiditäpseks aluseks; tänane foto avamise jätk neid ei muuda.
- **Tõendi piir:** Saadud Viofo koopia avaneb, algse telefonifaili tõrget ei reprodutseeritud. Tõendatud on eraldi päiselugeja ühilduvusvead ja piiratud dekodeerimise varuvariandi testid; lõplik tõend on MESSAGING_PHONE_PHOTO_20261031.md ning tarne review/verification.json. Uut füüsilise telefoni õnnestumist ega deployment’i ei eeldata.
- **Uus kandidaat:** Telefoni foto avamise ühilduvus: valikulise EXIF-i talumine, aegunud bitmap-valiku eemaldamine, kohalik HTML-pildielemendi varuvariant ja selgemad tõrketeated. Ainult kolm pildiettevalmistuse lähtefaili.
- **Vastuvõetud alus:** Kuulutus 197, vestlus 38, tekst, kuulutusekaart, fotode saatmine, telefonis nähtav kirjutusväli ning suure foto õnnestumine arvutis on kasutaja tõendiga vastu võetud. Hetkel uuritakse ühe Viofo foto avamise ebaõnnestumist telefonis. Täpse Maci HEAD-i tuvastab uuendaja.

## Tegelik kohalik katse

- Viofo saadud koopia (185 804 B, JPEG 1152 × 1536, EXIF puudub) läbis Pillow ning tegeliku Chromiumi bitmap/HTMLImage/WebP kontrolli. See ei tuvasta telefoni algfaili baitide ega füüsilise seadme tõrke põhjust.
- Vana parseri ühilduvusviga kordus tegelikult dekodeeritavate JPEG-dega: topelt EXIF, tundmatu orientatsioon 0 ja vigane valikuline EXIF. Uus kandidaat säilitab struktuuri ja ressursipiirid.
- Uue lõpliku lähtekoodi PASS: 55 tegeliku Chromiumi pildi ettevalmistuse/loetavuse kontrolli, 7 päris Reacti foto-only katsegruppi, 12 kontrollitud dekoodri elutsükli katset, production build koos TypeScriptiga, 3 lähtefaili lint ning 22 paigaldajakatset. Viofo koopia vähenes 62 792-baidiseks WebP-ks ka sunnitud bitmap-tõrke korral. Tõend tarne review/verification.json-is. Auth/HTTP ja sõnumi kinnitus on sünteetilised; päris sõnumeid ega pilvepilte ei saadetud.
- Varasemad 31.10 suurte fotode ja klaviatuuri katsed on ajaloolised. Kasutaja nüüdne vastuvõtt kinnitab päris telefonis kirjutusvälja nähtavust ning arvutis varem liiga suure foto laadimist. Paigutust ei muudeta ega katsetata uuesti ilma uue veata.

## Production / kasutajaliides

- Kasutaja terminal/Vercel kinnitasid 8f25f65 main pushi, Production Ready, anon-võtme järel redeploy ning kuulutuse 197 avaldamise pildiga. Seda ettevalmistust ei korrata.
- 29.–30.10 kasutaja pildid kinnitavad vestlust 38, ostja teksti lugemist müüja V1/V2 vaates ning seejärel kuulutusekaarti mõlema osalise V2 sõnumis. Vana 503 ja kaardipaigaldaja peatumine ei ole tänane töö.
- 30.10 kaardijätku commit cbd475757690db7bd1faf8784cd43359f45d5be9 ja push on vastu võetud. 31.10 kasutaja kinnitab teksti, kuulutusekaarti ja fotode saatmist ning hiljem klaviatuuri parandust ja suure foto laadimist arvutis. Ühe telefonifoto avamine jäi tõrkega. Viimase kasutuses oleva tootmis-commit’i räsi ei ole teada; uue paranduse tegeliku baasi kontrollib Maci uuendaja.
- Kuulutuste hosted lõppkoristus/reservivabastus ja üldine avalik käivitamine on eraldi lõpetamata tööd; sõnumite tarne neid tehtuks ei märgi.

## Üks järgmine töö

Kasuta uut selqiro-foto-telefon-20261031/uuenda.py --publish pakki. VALMIS järel oota sama commit’i Verceli Ready olekut, värskenda telefonis vestlust ja proovi sama Viofo fotot eraldi tühja tekstiväljaga. Eesmärk on eelvaade ning Foto on saatmiseks valmis. Uuendaja kontrollib viimase tarnitud koodi täpseid räsisid ja tegelikku remote’i, varundab, teeb buildi ning piiratud commit/pushi. Vanu paigaldajaid ei korrata.

**Peatumisel:** PEATATUD korral säilita uue messages-photo-20261031 jooksu result.json ja varukoopiad. Sama käsk jätkab ainult enda kontrollitud päevikust; tundmatut kasutaja tööd ei kirjutata üle. Varasemaid parandajaid ei korrata. Päris sõnumeid ei saadeta tööriistadega ilma selge saatmiskäsuta.

## Loe ainult vajalikku

- docs/continuity/MESSAGING_PHONE_PHOTO_20261031.md: praegune foto avamise jätkutöö, tõendatud ühilduvusvead, üks käsk ning algse telefoni tõendi piir.
- docs/continuity/MESSAGING_MOBILE_FOLLOWUP_20261031.md: varasem suurte fotode ja klaviatuuri parandus, hilisem kasutaja vastuvõtt. Seda paigaldust ei korrata.
- docs/continuity/MESSAGING_MOBILE_FIX_20261030.md: varasema telefoniparanduse ajalugu; fotovalik paranes, klaviatuuri viga jäi kasutaja tõendil alles.
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
- Telefoni kliendiparandus kasutab olemasolevaid lukustatud Node/Next sõltuvusi ning olemasolevat Git-i. See ei käivita Supabase CLI-d, andmebaasipäringuid ega Storage’i operatsioone. Võtmeid ja uusi sisselogimisi ei küsita.
- Telefoni foto avamise paranduse eraldi päevik: ~/Library/Application Support/Selqiro/messages-photo-20261031/<manifest-sha>/. Eelmise klaviatuuri/suurte fotode paranduse päevik säilib; vana paigaldust ei korrata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
