<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-10-31 Europe/Tallinn

## Praegune checkpoint

31.10 kasutaja kinnitab fotovaliku ja fotosaatmise toimimist arvutis ning telefonis; kuulutusekaart läheb tekstiga kaasa. Üle 5 MB foto lükati tagasi ning kompaktse kaardi puhul jäi mitmerealine tekst telefonis klaviatuuri varju. Uus ainult lähtekoodi jätk lisab piiratud automaatse foto vähendamise ja vestluse klaviatuuripaigutuse tugevama paranduse. Kohalikud lõpliku lähtekoodi kontrollid läbisid; uus Maci käivitamine, Verceli Ready ning füüsilise telefoni kinnitus on ootel.

## Lähtekood ja tõendi piir

- **Fotod:** Brauseri JPEG/PNG/WebP-algfail kuni 32 MiB / 64 MP vähendatakse automaatselt kuni 1600 px ja 1 400 000-baidiseks WebP-ks. Piiratud päisekontroll, kohalik EXIF-asend ja kuni viis kodeerimiskatset. Üleslaadimise 2 000 000-baidi päringupiir, vana serverilugemise 5 MiB piir, privaatne message-attachments-v2 hoidla ja konto 250 MiB eelarve ei muutu.
- **Identiteet:** Pooleli vahetusel peatab konto/operatsiooni külge seotud lukk kõik actor-värskendused kuni matching lõpuni. Aktiivse identiteedi RPC kasutab algse kasutaja kinnitatud sessioonitokenit. Mustandid ja ebaselged korduskatsed ei liigu teise konto alla.
- **Kontrollitud tegevused:** Ranged konto/identiteediga seotud HTTP- ja SQL-käsud; muutumatud saatmiskinnitused; nähtud sõnumi ID järgi loetuks märkimine; oma postkastist peitmine; konto blokeerimine ka V1 otsese saatmise korral. Põhjendamata üksiksõnumi tagasivõtmist ei lisata.
- **Paigaldus:** selqiro-sonumid-parandus-20261031/uuenda.py --publish on ainult lähtefailide jätkuparandus. See kontrollib eelmise 30.10 telefonipaki täpseid baashaše, tuntud cbd4757 eellast, puhast maini ja remote main == HEAD-i. Tegelik baas salvestatakse oma uude päevikusse. Algfailid varundatakse; commit on manifesti piires ning push tavaline. SQLi/Storage'i parandajaid ei impordita ega käivitata.
- **Paketi viiteparandus:** Kohaliku skeemi require_actor_hosted_v1 võetakse juba kaardipaketi poolt Git-i paigaldatud supabase/repairs/20261029_listing_message_cards/tests/fixtures/accepted-contact-fix.sql failist. Selle SHA aaed21297cb61c9e9d76d74e19b973bfd745d401ca431bfd31ec095c13d3bd7b ja valitud deklaratsioon on muutmata. Vana cloud-only remondi source_delta ei olnud Maci source-sünkroonimise tõend; puuduva faili kaitset ei muudeta valikuliseks.
- **PostgreSQLi kataloog:** PostgreSQL 18 lisab NOT NULL piirangutele eraldi pg_constraint kirjed. Võrdluses ühtlustatakse ainult see dubleeriv esitus; attnotnull ja kõik muud piirangud jäävad kontrolli alla. PG18 NOT NULL peab olema kinnitatud, jõustatud ja pärandumiseta ning igal nõutud veerul peab olema täpselt üks vastav kirje. PG17 ühilduvust toetab ametlik kataloogikirjeldus; siin käivitatud engine on PGlite PostgreSQL 18.6.
- **Storage’i õigusekontroll:** Varasem guard samastas poliitika loomise õiguse storage.objects omaniku rolli USAGE-ga. Supabase toetab eraldi Supautils poliitikahalduse luba. Uus kontroll loeb ainult registreeritud pg_catalog.pg_settings sighup/string seadet, kontrollib täpset täitjarolli ja storage.objects OID-d. Suvaline custom-GUC tekst või vale roll/tabel ei sobi. Rolle, omanikke ja teenuse konfiguratsiooni ei muudeta. Päris DDL-luba jõustab andmebaas; täpne piirav poliitika kontrollitakse enne COMMIT-i.
- **Telefoni parandus:** Vestluse marsruudis interactive-widget=resizes-content; nähtava vaateala fallback, sisestuse/pageshow/ResizeObserveri järel mõõtmine, ruumi loov manuste grid-rida ja keritav teadete ala. Toetatud brauseris kasvab textarea native field-sizing'uga, mujal JS-i varuvariant. Kaardi saatmine, foto omanikuseos ja sama saatja värske kontroll säilivad. Füüsilise telefoni lõplik kinnitus on ootel.
- **Tõendi piir:** Uue kandidaadi tõend on MESSAGING_MOBILE_FOLLOWUP_20261031.md ja tarne review/verification.json. Päris Chromiumi pilditöötlus ja React; sünteetilised teenusevastused ja klaviatuuri vaateala. Väga madala ala vana paigutusviga kordus, kuid kasutaja tavakõrguse Androidi-klaviatuuri täpset sündmust siin ei korratud. Uut live deployment'i, pärissõnumit ega pilveüleslaadimist tööriistadega ei tehtud.
- **Uus kandidaat:** Suure foto automaatne vähendamine ja telefoni sisestusvälja/klaviatuuri jätkuparandus olemasolevas V2 vestluses; eelmise täieliku sõnumipaketi paigaldust ei alustata uuesti.
- **Vastuvõetud alus:** Kuulutuse 197 avaldamine, vestlus 38, tekst, kuulutusekaart ja foto valimine/saatmine arvutis ning telefonis on kasutaja tõendiga vastu võetud. Üle 5 MB foto ja kaardiga telefoni kirjutusväli on praeguse uue paranduse siht. Täpse hilisema Maci HEAD-i tuvastab lähte- ja remote-kontroll.

## Tegelik kohalik katse

- 31.10 värsked foto-, hook'i-, vaate-, buildi-, lint- ja paigaldajakontrollid läbisid. Täpsed loendused ja lõpliku lähtekoodi räsid on uue tarne review/verification.json failis ning MESSAGING_MOBILE_FOLLOWUP_20261031.md-s. Kõik teenusevastused ja saatmised on sünteetilised; pildidekodeerimine/kodeerimine ja React on tegelikud.
- 37 pildi ettevalmistuse kontrolli: vana 5 MiB / 16 MP keeldumine kordus. 23 008 191-baidine JPEG vähenes 818 642-baidiseks WebP-ks; kontrolliti ka PNG/WebP, 48 MP JPEG, 24 MP PNG, EXIF-asend, katkestus ja suurusepiirid. Suure faili ebaselge üleslaadimise kordus kasutas identseid baite, räsi ja võtit ning üht dekodeerimist.
- Paigutuses kordus vana viga väga madala nähtava ala ning foto+kaardi+ebaselge saatmisteate koosluses. Uus kandidaat läbis sihitud parandusekontrollid. Sünteetilised nähtava vaateala muutused ei tõenda kasutaja füüsilise Androidi native-klaviatuuri käitumist; tavakõrguse ekraanipildi täpset viga siin ei reprodutseeritud.
- 22 paigaldaja kontrolli läbisid tegelike ajutiste Git-hoidlate ja kohaliku bare-remote'iga; nende build oli asendatud. Lõpliku rakenduse päris production build ja TypeScript kontrolliti eraldi. SQLi/Storage'i varasemaid katseid ei korratud ega esitata värske tõendina.
- 30.10 telefoniparanduse ja varasemate sõnumi-, SQLi-, õiguse- ja Storage'i tööde testid on ajaloolised. 31.10 kasutajatagasiside kinnitas fotovaliku paranemist, kuid lükkas ümber varasema klaviatuuripaigutuse täieliku toimimise eeldamise.

## Production / kasutajaliides

- Kasutaja terminal/Vercel kinnitasid 8f25f65 main pushi, Production Ready, anon-võtme järel redeploy ning kuulutuse 197 avaldamise pildiga. Seda ettevalmistust ei korrata.
- 29.–30.10 kasutaja pildid kinnitavad vestlust 38, ostja teksti lugemist müüja V1/V2 vaates ning seejärel kuulutusekaarti mõlema osalise V2 sõnumis. Vana 503 ja kaardipaigaldaja peatumine ei ole tänane töö.
- 30.10 kaardijätku commit cbd475757690db7bd1faf8784cd43359f45d5be9 ja push on varasema terminaliga vastu võetud. 31.10 kasutaja kinnitab uuendatud vestluse teksti, kuulutusekaardi ning fotode saatmist arvutis ja telefonis. Varasema suurte fotode keeldumise ja klaviatuuri katmise jaoks on nüüd uus kohalik kandidaat. Uus tootmis-commit ei ole teada enne Maci lõpp-raportit; seda ei tuletata ekraanipiltidest.
- Kuulutuste hosted lõppkoristus/reservivabastus ja üldine avalik käivitamine on eraldi lõpetamata tööd; sõnumite tarne neid tehtuks ei märgi.

## Üks järgmine töö

Kasuta uut selqiro-sonumid-parandus-20261031/uuenda.py --publish pakki. Pärast VALMIS tulemust oota selle commit'i Verceli Ready olekut, värskenda vestlust ja kontrolli telefonis üle 5 MB fotot, kuulutusekaart + mitmerealine tekst ning kaart+foto koos. Maci käsk teeb olemasoleva allika/remote'i kontrolli, varukoopiad, buildi, piiratud commit'i ja tavalise pushi. Varasemaid konto-, kontakti-, kaardi-, SQLi- ega Storage'i parandajaid ei korrata.

**Peatumisel:** PEATATUD korral säilita uue telefoniparanduse result.json ja varukoopiad. Sama käsk jätkab ainult enda kontrollitud päevikust, säilitab muudatuste piirid ja ei kirjuta tundmatut kasutaja tööd üle. Vanu konto-, kontakti-, kaardi- ega SQLi/Storage’i paigaldajaid ei korrata. Päris sõnumeid ei saadeta tööriistadega ilma selge saatmiskäsuta.

## Loe ainult vajalikku

- docs/continuity/MESSAGING_MOBILE_FOLLOWUP_20261031.md: praegune ülesanne, uue paranduse piirid ja üks paigalduskäsk.
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
- Uue paranduse päevik ja varukoopiad: ~/Library/Application Support/Selqiro/messages-mobile-20261031/<manifest-sha>/. Varasemad päevikud säilivad. Seda jätku ei seota vanade DB/Storage peatunud jooksude kordamisega.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
