<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-10 Europe/Tallinn

## Praegune checkpoint

10.11.2026 poe rubriikide haldus on kasutaja poolt vastu võetud. Järgmine lubatud töö on ette valmistada vana rubriigiseoste otsekirjutustee sulgemine. Kahe vana vormi salvestus kasutab nüüd olemasolevat atomaarset, sama identiteeti kontrollivat toimingut. Uus lähtekood ja õigusteparandus on eraldi ettevalmistatud tarne; Maci rakendamine, selle commit/push, avalik kliendiversioon ja päris SQL-i tulemus on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Tegelik kinnitatud alus:** Viimane kasutaja raport: main/0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a, Manage own shop categories in My Area; vanem 71eea82ad83b30b9ddc03641f8f2864b67a85877. Jooks lõppes 10.11 kell 15:17:33 Europe/Tallinn: database verified, build passed, push verified. See pole uus live-Giti vaatlus.
- **Aluse sidumine:** 1436-failine aluspuu 4e8226df26a69aa966a9d809c19fb4df771d034f; eelmise väljalaske manifest 734870e7c68b3e5961077295753d175bcaec566f538e88113e8aeab048d87c28. Täpse privaatse eduraporti SHA256 1e181c9533d3caa18b165f3541127241793d764e5f2adc2fd47161cd2f56abc7. Uuendaja ei otsi suvalist viimast raportit.
- **Uus ettevalmistatud tarne:** selqiro-poerubriikide-oigused-20261110.zip; commit’i kavandatud pealkiri Close direct store category link writes. Täpne failide ja abiskriptide ulatus ning räsid on selle paki manifest.json-is; uut tegelikku commit’i siin ei oletata.
- **Kliendi muudatus:** app/sell/page.tsx ja app/my-page/page.tsx kasutavad sama set_my_listing_store_categories_v2 toimingut. Osalise või teadmata tulemuse järel avatakse olemasoleva kuulutuse eraldi rubriigivaade /v2/my-area/listings/[id]/store-categories, mis ei nõua uue avaldamistee kviitungit. Vaade loeb tegeliku salvestatud valiku enne uut käsitsi salvestust.
- **SQL-i ulatus:** Uus supabase/repairs/20261110_store_category_authority eemaldab anon/authenticated/PUBLIC otsesed mitte-SELECT õigused listing_store_categories tabelilt ja vana FOR ALL poliitika. Olemasolev SELECT, kontrollitud RPC-d, tabelid ja andmeread jäävad alles. Ümbritsev kataloog, rollide tegelikud õigused ja täpsed enne/pärast seisud on kontrollitud.
- **Dokumentide järjepidevus:** Uude tarneallikasse on kaasa võetud 12 varem eraldi salvestatud vastuvõtudokumendi muudatust. CURRENT_STATE on üks praegune kirje ja 99_V2_HANDOFF_NEXT_CHAT genereeritakse sellest. Vana väljastatud ZIP, selle lähtekoopia ning päevikud on muutumatud.
- **Raporti kasutusreegel:** Uuendaja näitab SAADA SEE FAIL täpset unikaalse Downloads-raporti teed ja valib sama faili Finderis. Koopia tõrkel näitab olemasolevat privaatraportit või teatab ausalt faili puudumisest. Vanu raporteid ei kirjutata üle.

## Tegelik kohalik katse

- SQL-i sihitud PGlite/PostgreSQL-WASM katsed: runtime 18/18 ning paigalduse/erinevuste kontroll 31/31 PASS. Need kasutavad sünteetilisi kasutajaid ja andmeid; päris Supabase’i ei muudetud. Esimene ebaõnnestunud fixture’i jooks säilib koos täpse põhjusega.
- Lõpliku kliendi katsed: vana adapteri ja tegelike salvestusfunktsioonide 19/19 ning tegeliku eraldi taastesihtkoha/identiteedi/rubriigimoodulite 10/10 PASS. Build'i järel Chromium 153 käigud 7/7 + 9/9 PASS, English/Eesti; 1280/390 px taastetee ekraanivaated on loetavad. Auth/PostgREST, muu kest ja navigeerimise piirid on sünteetilised.
- Värske lõplik Next webpack build PASS: 79.449 s, 616 muutumatut sisendit; inventari SHA256 8be5072e3cde54cc9f98cc395552008d431e8f9627acd53478c34c2984fe6b51. Olemasolevad lukustatud sõltuvused säilisid. Esimene tüübituvastuse build'i viga ja enne taastetee parandust läbinud revisjon on eraldi säilitatud.
- Uuendaja sihitud katsed: aluse raport 9/9, SQL-adapter 13/13, avaliku märgi transport/ajalimiit 9/9 ja source-first katkestused/jätk 10/10 PASS. Lõpliku manifesti ajutise Giti/indexi/varukoopiate/commit'i/kohaliku remote'i tarnekäigu tõend on paki kontrollid/final-flow.json-is. Need pole päris Maci või teenuse toimingud.
- Vana nõrga poliitika tingimuslik reproduktsioon vajab katsekeskkonnas ajaloolist avaliku kuulutuse SELECT-poliitikat. See ei tõenda sama vea praegust tootmises kasutatavust. Paranduse kontrollid kasutavad pärast seda taastatud täpset kataloogialust.
- Varasem poe rubriikide loomise, nimevahetuse, seostamise, profiilifiltri ning eemaldamise kasutajavastuvõtt säilib. Neid paigaldusi ega laiu kontrolle uue tõendita ei korrata.

## Production / kasutajaliides

- Poe rubriikide halduse etapp 0b2594a on päris Maci raporti ja kasutaja käigu järgi lõpetatud; ülem- ja alamrubriigi eemaldamisel jäi testkuulutus alles. Täpsem raporti ja piltide piir on STORE_CATEGORY_MANAGEMENT_20261110.md-s.
- Uue õigusteparanduse lähtekoodi, SQL-i ega uut commit/push’i pole käesolevas keskkonnas Macis või pilves rakendatud. Uuendaja teeb kõigepealt read-only eelkontrolli, seejärel kliendi build/commit/push’i, kontrollib avalikku kliendimärki ja alles siis rakendab õigusteparanduse.
- Avaliku kliendimärgi GET kontrollib täpseid baite samal olemasoleval https://selqiro.vercel.app päritolul. See ei ole Verceli Ready/API/deployment-ID kviitung. Raportis jääb Verceli READY_NOT_CHECKED eraldi välja.
- Kui kliendimärk kuni 55 sekundi jooksul ei ilmu, salvestub WAITING_FOR_CLIENT_DEPLOYMENT. Sama käsk jätkab kontrollitud commit/push’i juurest lõpetatud build’i, commit’i ja push’i kordamata. Enne SQL-i kontrollitakse allikat, remote’i ja kliendimärki uuesti.
- Juba avatud brauserivahelehed võivad hoida vana JavaScripti. Pärast lõpetatud uuendust värskenda portaali; avaliku märgi vaatlus ei tõenda kõigi avatud vahelehtede asendamist. Vastu võetud varasemate etappide Verceli kuvatõmmiseid uuesti ei küsita.

## Üks järgmine töö

Paki uus selqiro-poerubriikide-oigused-20261110 kaust Downloads-kausta ja kasuta HOSTED_PORTAL.md üht käsku: python3 -I -B "$HOME/Downloads/selqiro-poerubriikide-oigused-20261110/uuenda.py" --publish. Kui ilmub OOTEL: WAITING_FOR_CLIENT_DEPLOYMENT, jätka sama käsuga pärast veebiversiooni valmimist. Lõpetamisel või PEATATUD korral saada SAADA SEE FAIL real näidatud täpne JSON; selle põhjal uuendatakse tegelik seis.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Tundmatut õiguste- või lähteerinevust ei parandata kaitsete nõrgendamisega. SQL-i saadetakse kõige rohkem üks rakenduskatse; ebaselge tulemus lahendatakse lugemisega, mitte automaatse korduskirjutusega. Automaatne jätk on lubatud ainult uuendaja täpselt kontrollitud seisust; muud peatust ei käsitleta veebiversiooni ootena.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus käsk, ooteseisu jätk ja täpne raport.
- docs/continuity/STORE_CATEGORY_AUTHORITY_20261110.md — praegune ulatus, kontrolltõendid ja paigalduse piir.
- docs/architecture/store-category-link-authority-v1.md — vana kirjutustee sulgemine, osaline tulemus ja allikas-enne-SQL järjekord.
- docs/continuity/STORE_CATEGORY_MANAGEMENT_20261110.md — lõpetatud eelmise etapi tegelik vastuvõtt.
- docs/continuity/SERVICE_ACCESS.json — samad teenusesihid; vanad vaatlused pole värske Maci/Giti seis.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Hobuse ja tavakuulutuse staatuse muutmine ei uuenda tähtaega; 90 päeva pikendamine on eraldi omaniku kinnitus. Teenuste käesolev lahendus ei kehtesta uut tähtajareeglit.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse; kolm avatud ja 20 uut toimingut/24 h on eraldi olemasolevad kasutuselevõtukaitsed. Omaniku teenused on lehekülgedega, mitte ühe väikese vaikse kärpega.
- Üldine terminalne taustakoristus jääb eraldi tööks. Paigaldaja ei kustuta Storage’i objekte; teenuse toimingud koristavad ainult enda kontrollitud algfaile või galeriist eemaldatud hallatud veebifaile.
- Teenuste Quick Update, live-asukoht/saadavus, töötajad ja autopark on eraldi edasine töö; töökuulutused hiljem. Nende olemasolu ei väideta selle tarnega.
- Profiili ühine loend ei liida teenuseid toodete hulka. Poerubriigi valimisel kuvatakse olemasoleva skeemi järgi ainult seostatud tavakuulutusi; hobustele ega teenustele seoseid ei oletata.
- Energy, maksete tuum ja piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse pärast käsilolevat kuulutuste/teenuste etappi. Tavaline osalemine ei sõltu Energy ostmisest.
- Haldus ja kuulutuse rubriigiseoste salvestamine jäävad eraldi toiminguteks. Ettevalmistatud parandus sulgeb brauseri otsemuudatused ainult seostetabelile. See ei kehtesta universaalset invarianti hilisema listings.identity_id või store_categories.identity_id muutmise ega privilegeeritud kirjutajate suhtes. NULL-identiteediga vana kuulutust ei seota vaikimisi kasutaja ID kaudu ega parandata automaatselt.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; kinnitatud Maci siht /Users/taivo/selqiro. Uut hoidlat, portaali, Supabase’i projekti ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Uue halduse võimekus on kasutaja raporti järgi paigaldatud ja kontrollitud. Sama SQL-i ega varasemaid paigaldajaid ei käivitata uuesti.
- Viimane raportiga kinnitatud Maci lõppseis: 10.11.2026 kell 15:17:33 Europe/Tallinn, main/0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a ja push verified. Uus kandidaat on eraldi kohalik ettevalmistus; Maci/GitHubi/Supabase’i/Verceli värsket seisu ei ole sellest tuletatud. Package/lock ja varem väljastatud pakid jäävad muutmata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
