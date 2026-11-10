<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 2026-11-10 Europe/Tallinn

## Praegune checkpoint

10.11.2026 poerubriikide seostamise kasutuskatse on vastu võetud. Kasutaja heakskiidetud oma rubriikide haldus praeguses Minu alas on uues kandidaadis valmis ja kohalikult kontrollitud. Uus pakk on selqiro-poerubriikide-haldus-20261110.zip. Macis rakendamine, uus SQL-võimekus, commit/push, Verceli Ready/Production ja halduse tegelik kasutuskatse on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Uus ettevalmistatud ulatus:** Minu ala Poe rubriigid: ülemrubriigi ja otsese alamrubriigi loomine, ümbernimetamine ning eraldi kinnitusega lasteta rubriigi eemaldamine. Eemaldatakse ainult rubriik ja selle seosed; kuulutus, pildid ja kirjeldus säilivad. English/Eesti. Kuulutuse rubriigivalijast viib haldusesse eraldi vahekaardi link.
- **Õiguste ja vastuse leping:** Väikesed andme-, hooki- ja UI moodulid seovad toimingu kinnitatud kasutaja ja aktiivse identiteediga. Uus manage_my_store_category_v1 RPC kontrollib sama konteksti, õigusi ning algset nime/parenti. Katkenud või ebakindla vastuse korral säilib sisestus; automaatset uut kirjutust ei tehta, kasutaja kontrollib seisu lugemisega.
- **Kontrollitud baas:** Eelmise muutmatu selqiro-poerubriigid-20261110.zip SHA256 64177a91d06febe4a7c70ac3f0655cb0b81b88faf665668476bc585cbce0ab37; manifest b2ed5fa79144982b60f51ab3cc65c08fe5c2b484645f9f36c0da3543d82209d2. 1398-failine lähtepuu b7fca157abd46d1b169664aaabe417920cc055b4 taastati kõigi räside ja režiimide kontrolliga. Need ei ole oletatud Maci commit.
- **Katkestus ja dokumentide delta:** Katkestuse järel puudunud avaldamata haldus taastati eraldi kandidaadis ja sai uued kontrollid. Kadunud etapi testitulemusi ei kasutata nende baitide tõendina. Kuus varasema vastuvõtu dokumendimuudatust on uue tarne sees. Vanu pakke, lähtekoopiaid ja päevikuid ei muudeta.
- **Tarne ja üleandmine:** Uus uuendaja kontrollib tegelikku haru, HEAD-i, kogu indexit/tööpuud, lähtefaile, kinnitatud remote’i ja eelmise täpse eduraporti ahelat. Seitse SQL-eelkontrolli kaitsevad uue võimekuse paigaldust. Paketi manifest, kontrollid ja SQL koopiad seovad tarne täpsete failidega. CURRENT_STATE on autoriteetne; 99_V2_HANDOFF_NEXT_CHAT genereeritakse sellest.
- **Raporti kasutusreegel:** Edul või peatumisel loob uuendaja võimalusel privaatse unikaalse Downloads-raporti, näitab SAADA SEE FAIL täpset teed ja valib sama faili Finderis. Puuduv või võimalik vananenud raport märgitakse ausalt. Juhuslikku uusimat faili ei valita.

## Tegelik kohalik katse

- Värske halduse SQL: guardgen, paigaldus, täpne kordus ja verify PASS; runtime 17/17 ning installi/drifti/rollback’i juhud 18/18 PASS. PGlite/WASM, sünteetilised kasutajad ja andmed. Kuulutuse/piltide säilimine kontrollitud; mitme päris seansi lukustusgraafikut ega live PostgREST-i see ei tõenda.
- Parser/API/ReactDOM/hook 15/15 PASS; muudetud 13 runtime-faili lint PASS. Fikseeritud actor/token, sisendi säilimine, ebakindla tulemuse lugemiskontroll ja konteksti vahetus on sihitud ulatus.
- Värske Next.js tootmiskooste PASS 28,661 s, Node v24.22.1, 610 muutumatut runtime-sisendit. Olemasolevad sõltuvused ja sünteetiline konfiguratsioon; package/lock ei muutunud. Maci ega Verceli buildi see ei tõenda.
- Chromiumi 4/4 käiku PASS: English 1365 px, Eesti 390 px, loomine/muutmine/kinnitusega eemaldamine, filtrite värskendus, fookuse kontrolli ajal sisestuse säilimine, kadunud vastus ja käsitsi readback, kadunud siht ning identiteedivahetus. 44 laaditud runtime-faili klapivad buildiga. Auth/PostgREST ja kõrvalmoodulid on fixture’id. Mõlemad kuvatõmmised vaadati üle; pilte tarnepakki ei lisata.
- Uuendaja eelmise raporti 18/18 ning SQL-adapteri 13/13 sihitud kontrolli PASS. Päeviku/Giti/Finderi/SQL-vastuse piirid on sünteetilised. Lõplik täpse manifesti ajutise Git/indexi/backup/commit/local-remote’i katse ja selle piirid on paki kontrollid/final-delivery-result.json-is; päris Next buildi ja SQL-i tõendid on eraldi.
- Varasema vastu võetud kuulutuse-rubriigiseose ja teenuse Tagasi kasutuskatseid ei korratud. Varem väljastatud paki ning vastuvõtudokumentide arhiivid säilivad muutumatuna.

## Production / kasutajaliides

- 10.11 kasutaja võttis vastu olemasolevate oma rubriikide valiku salvestamise tavakuulutusele, tulemuse nähtavuse avaliku profiili rubriigis ning kuulutuse säilimise seoste eemaldamisel. Piltidel jäävad rubriikide definitsioonid alles; seda ei loeta rubriigikirjete CRUD-halduse vastuvõtuks.
- Varem on kasutaja vastu võtnud teenuse pildid ja uusima teenuse järjestuse ning brauseri Tagasi õige koha nii profiilil kui teenuste loetelus. Kuvatõmmis näitab main / 429ace2 / Restore service list on browser back / Ready / Production ning 26e468e Ready / Production.
- Poerubriikide seostamise täpset uut Maci commit’i ega deployment-ID-d pole kasutaja kinnitusega esitatud. Uue halduse ettevalmistamisel pole Maci, GitHubi, päris andmebaasi, Storage’i ega Verceli kirjutust tehtud. Neid tõendab alles uus tegelik raport ja sama commit’i deployment.

## Üks järgmine töö

Kasuta docs/continuity/HOSTED_PORTAL.md üht uut selqiro-poerubriikide-haldus-20261110 käsku. Seejärel oota raportis näidatud commit’i Verceli Ready/Production tulemust ja tee üks Minu ala rubriikide loomise, ümbernimetamise ning kinnitatud eemaldamise kasutuskäik. Säilita kuulutus ja pildid; vanu paigaldajaid ei korrata.

**Peatumisel:** PEATATUD korral säilita teade, raport, kasutaja muudatused ja kõik päevikud. Räsikaitset, remote’i ega õiguskontrolli ei nõrgendata erinevuse möödumiseks. Ebakindlat SQL-i, commit’i ega push’i ei korrata automaatselt. Uue konkreetse tõendita ei korrata vanu paigaldusi, diagnostikat ega vastuvõetud kasutuskatseid.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks uus käsk ja tegeliku kasutuskatse piir.
- docs/continuity/STORE_CATEGORY_MANAGEMENT_20261110.md — värsked kontrollid, taastamine ja tarne.
- docs/architecture/store-category-management-v1.md — halduse leping ja alles jäävad piirid.
- docs/continuity/STORE_CATEGORIES_20261110.md — eelmise seostamissammu kasutajavastuvõtt.
- docs/continuity/SERVICE_ACCESS.json — olemasolevad sihid ja CLI pin; vanad vaatlused ei ole praegune Maci/Giti seis.

## Säilivad piirid

- Üks portaal, hoidla, Supabase’i projekt, konto ja keele-eelistus. English on põhikeel/fallback, Eesti teine keel; kasutajasisu ei tõlgita.
- Hobune jääb horse_offers ja teenus services kanooniliseks UUID-kirjeks; listings tabelisse varikoopiat ei looda. Kuni kümme fotot, üks põhipilt ja null foto lubamine säilivad.
- Hobuse ja tavakuulutuse staatuse muutmine ei uuenda tähtaega; 90 päeva pikendamine on eraldi omaniku kinnitus. Teenuste käesolev lahendus ei kehtesta uut tähtajareeglit.
- Püsiv kuulutuste arvupiir on otsustamata. 300 MiB on ajutise töö kaitse; kolm avatud ja 20 uut toimingut/24 h on eraldi olemasolevad kasutuselevõtukaitsed. Omaniku teenused on lehekülgedega, mitte ühe väikese vaikse kärpega.
- Üldine terminalne taustakoristus jääb eraldi tööks. Paigaldaja ei kustuta Storage’i objekte; teenuse toimingud koristavad ainult enda kontrollitud algfaile või galeriist eemaldatud hallatud veebifaile.
- Teenuste Quick Update, live-asukoht/saadavus, töötajad ja autopark on eraldi edasine töö; töökuulutused hiljem. Nende olemasolu ei väideta selle tarnega.
- Profiili ühine loend ei liida teenuseid toodete hulka. Poerubriigi valimisel kuvatakse olemasoleva skeemi järgi ainult seostatud tavakuulutusi; hobustele ega teenustele seoseid ei oletata.
- Energy, maksete tuum ja piiratud AI abi jäävad kokkulepitud V2 käivitamise ulatusse pärast käsilolevat kuulutuste/teenuste etappi. Tavaline osalemine ei sõltu Energy ostmisest.
- Haldus ja kuulutuse rubriigiseoste salvestamine on eraldi toimingud. Vana listing_store_categories otsetabeli RLS-kirjutustee kontrollib listing.user_id-d, mitte category.identity_id-d; selle tugevdamine jääb eraldi avaliku avamise tööks. Uus halduse RPC seda vana kirjutusteed ei kasuta ega laienda.

## Keskkond

- Hoidla https://github.com/Taivo17/selqiro.git; portaal https://selqiro.vercel.app; kinnitatud Maci siht /Users/taivo/selqiro. Uut hoidlat, portaali, Supabase’i projekti ega kontosüsteemi ei looda.
- Olemasolev Supabase vyjletlmwoiwxsnsunlm ja paigalduse UUID 2d088814-0900-448a-a9d1-7b05470cb1d2 säilivad. Uus uuendaja kasutab olemasolevat kuupäevaga kinnitatud CLI-transporti; lisab ainult täpselt kontrollitud halduse RPC-võimekuse. Käsitsi SQL-i ega varasemate installide kordamist pole vaja.
- Sõltuvuste package/lock ja Node/Sharp fra1 seadistus säilivad. Selle paki Maci paigaldus/build/commit/push ja Verceli deployment on käesoleva kirje järgi ootel. Räsikaitsega väljastatud pakki ei täiendata tagantjärele; uus kasutajavastuvõtt kantakse järgmisse dokumentide deltasse.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
