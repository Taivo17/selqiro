<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 20.11.2026 Europe/Tallinn — profiili lugemisprivaatsus vastu võetud; salvestamise kataloog vastu võetud; profiiliredaktori kandidaat

## Praegune checkpoint

Vastu võetud lähtecommit on d654033. Kasutaja raport kinnitab lugemisprivaatsuse SQL-i järelkontrolli, testi, build’i ja push’i; eraldi ekraanipilt näitab sama commit’i Ready / Production seisu. Uus kell 19:31 kogutud salvestamise kataloog on terviklik ja kinnitab sama lähtepuu ning privaatsusparanduse järelseisu. Järgmine eraldi pakett lisab „Minu profiili” teksti- ja asukohavormi ning piirab selle kirjutamisõigusi. Selle uue paketi Maci käik ja tootmisse jõudmine on veel ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main d6540333c6a1eace53bfac616c1041a8bd238806; parent 5312ea0fa0d430b9f62ffd29c2200b0a6d0f61b3; puu e59b0b64475cd1e8cc515511341a9d21b9d85123; 1900 lähtefaili.
- **Privaatsuse vastuvõtt:** Algne edukas raport 291612 B, SHA256 c921fca4663339fc8a1ca3273975be1d831152bd4ca167a4af358c352760341e; release 8e996cb76fe93bc63917ccf6704ff60102a5f9e5b0a5c69bd51b489d8dd2181e. SQL-i after-räsi 7ec206ef204821ff096d37043d6086cdf1a2165cfe968aea9b7bba3b4deb470f. Eelmised kaks peatunud katset on selle eduka väljastusega lahendatud; neid ei käivitata uuesti.
- **Salvestamise kataloog:** TulemusZIP 30025 B, SHA256 5f8a937bb1b864f838ceba4f72f7f5e17b6132eef1b2999fe6348adab272bdd9; catalog.json 366697 B, SHA256 9d18773d1c2152e7236dab9d790e2f5946729e1a610917ba76726b757426ba0d. Üks read-only päring 20.11 kell 19:31, PostgreSQL 17.6; lähtekood, indeks ja remote jäid muutmata.
- **Kataloogi ulatus:** 7 tabelit, 100 rutiinikandidaati (kõik 15 nimetatud rutiini), 1 profiilitrigger, auth-triggerite kontrollitud ulatuses 0 triggerit, 22 rolli, 23 liikmesust. Kõigi 100 keha kontrollsummad seotakse kinnitatud lähtekoodiga. Puuduvaid nimetatud objekte ei ole.
- **Uus vorm:** /v2/my-area/profile; avalik nimi, kirjeldus, veebileht, riik ja linn/piirkond, ettevõttel eraldi vabatahtlik avalik külastusaadress. Konto liik, profiili püsilink ja olemasolevad pildid ei ole selle vormi kirjutusväljad. /profile suunab ühtsesse vaatesse.
- **Kirjutamise piir:** Iga lugemine ja salvestamine kontrollib uuesti sisseloginud kasutajat, oodatud aktiivset identiteeti ja omanikuõigust. Salvestus on seotud loetud versiooniga; nimi uueneb atomaarse muudatusena mõlemas olemasolevas nimeallikas. Vana laia profiili-/asukohakirjutaja ja kasutaja muudetavate tasemeväljade kõrvalteed suletakse.
- **Ajalugu:** Kolm eelmist continuity-faili säilivad baiditäpselt history/profile-editor-base-d654033-20261120 all. Vanad paketid, raportid ja kinnitatud lähtekoopia jäävad muutmata.

## Tegelik kohalik katse

- Paketi kontrollitõendid seovad iga katse läbivaadatud lähtefailide ja SQL-i kontrollsummadega. Rakenduse katsed käivitavad tegeliku vormimudeli, identiteedi/versiooni olekud ja lugejad sünteetiliste vastustega.
- SQL-i õiguste ja versioonikonfliktide katsed kasutavad eraldatud sünteetilist PostgreSQL/PGlite keskkonda, mitte kasutajaandmeid. Kohaliku mootori versioon ja tegelikult kaetud kontrollid on testiraportis. Hosted PostgreSQL 17.6 seisu kontrollib uuendaja eraldi enne ja pärast rakendamist.
- Täielik Next/TypeScript build kasutab olemasoleva lock-failiga kooskõlas olevaid sõltuvusi ja kohalikku mittetöötavat ühendusseadistust. See kontrollib koostamist, mitte kasutaja brauserit ega uut tootmisväljastust.
- Uuendaja nõuab kohalikku testi ja build’i enne üht SQL-tehingut. Ebaselge vastuse järel loetakse tegelik tulemus; kirjutust ei korrata automaatselt. Uue käigu raport ning sama commit’i Ready / Production tuleb eraldi vastu võtta.

## Production / kasutajaliides

- d654033 lugemisprivaatsuse parandus on kasutaja eduka raporti ja sama commit’i ekraanipildi järgi vastu võetud. Kella 19:31 salvestamise kataloog kinnitab värskelt sama lähtebaasi ja lugemisprivaatsuse järelseisu.
- Uut profiiliredaktori paketti ei ole selle ettevalmistuskirje ajal Macis rakendatud ega Vercelis kinnitatud. Vana raporti READY_NOT_CHECKED välja ei kirjutata tagantjärele ümber.

## Üks järgmine töö

Ava selqiro-minu-profiil-20261120.zip Downloads-kaustas ja käivita ainult: python3 -I -B "$HOME/Downloads/selqiro-minu-profiil-20261120/uuenda.py" --publish. Saada lõpus näidatud täpne uus raport. Pärast edukat commit’i ja push’i kontrolli sama commit’i Verceli Ready / Production seisu ning „Minu profiili” salvestamist. Pärast selle vastuvõttu on järgmine töö ühtne profiilipildi/logo lisamise ja eemaldamise tee, seejärel sõnumite profiilipilt ja link.

**Peatumisel:** Tundmatu lähtepuu, indeks, remote, paketifail, varasema eduka käigu või koguja tõend, CLI või andmebaasiseis peatab töö. Säilita uus raport ja saada see ülevaatuseks. Kontrollsummat ei muudeta tundmatu seisuga sobivaks, puuduvat tõendit käsitsi ei looda ning ebaselget kirjutust automaatselt ei korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — praegune käivitamisjuhis ja tõendipiir.
- docs/architecture/profile-editor-20261120.md — vorm, autoriseerimine, salvestamise taastamine ja järgmised tööd.
- docs/architecture/profile-read-privacy-20261120.md — varasema lugemisparanduse ajalugu; selle rakendus on nüüd vastu võetud.
- docs/architecture/advertising-pricing-self-service-plan.md — kinnitatud iseteenindus ja riigipõhise hinnakirja suund.

## Säilivad piirid

- Piltide lisamine/asendamine/koristus jääb eraldi töösse. Selle vormi salvestus ei muuda profiilipildi ega kaanepildi aadressi, pakkumisi või vestlusi.
- Eraisikule ei küsita tänava- ega korteriaadressi. Linn/piirkond ja kirjeldus on kasutaja sisestatav avalik tekst; neid ei esitata automaatselt anonüümitud või kontrollitud asukohana. Ettevõtte külastusaadress vajab eraldi avaldamisvalikut.
- Välislink on valikuline ja kontrollitud vorminguga; selle sihtlehe sisu turvalisust Selqiro ei kinnita. Rakendus ei laadi vormi salvestamiseks seda veebilehte serverist alla.
- Uus liitumisvoog eraisiku/ettevõtte valikuga, ettevõtte loomine ja üleandmine ning konto sulgemise/kustutamise kord ei kuulu sellesse paketti. Olemasolev identiteedimudel ja pakkumiste omanikud säilivad.
- Tavapakkumiste õigused ei sõltu uuest tasulisest kontotasemest. Vana Premium-kutse kõrvaltee suletakse; Energy arvestuse muutmine ja reklaamitellimused jäävad eraldi tööks.
- Reklaam ja esiletõstmine: iseteenindus, nähtav hinnakiri, ühine stardihind ja riigi erihinna valmidus, fikseeritud paketid. Oksjon ei ole esimese versiooni eeltingimus.
- AI jääb suletuks. Vanade Energy reserveeringute käsitlemine, sõltuvuste turvauuendused ja laiem turvaülevaatus on endiselt eraldi avamiseelsed tööd. See parandus ei ole kogu portaali turvasertifikaat.

## Keskkond

- Olemasolev /Users/taivo/selqiro, Taivo17/selqiro remote, lähtecommit d654033. Uusi projekte, andmebaase ega kontosid ei looda.
- Olemasolev Supabase CLI 2.117.0 ning kinnitatud projekt. Uuendaja ei paigalda sõltuvusi ega küsi võtmete kleepimist; ta kasutab juba olemasolevat ühendust.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
