<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 28.11.2026 Europe/Tallinn — ASUKOHT-1 vastu võetud; avaliku profiili kaart ASUKOHT-1B kohalikult kontrollitud

## Praegune checkpoint

Üks aktiivne etapp on ASUKOHT-1B: avaliku profiili kaart kasutaja 28.11 palve järgi. ASUKOHT-1 asukohavalik ja salvestamine on raporti, sama commiti Ready / Production ning kasutaja kinnitusega vastu võetud; alus on af78c7b. Uus kaart kasutab ainult kinnitatud asula/piirkonna punkti ja avaliku ettevõtte aadressi eraldi kaardilinki. Kaardipaketi Maci raport ja sama uue versiooni tootmise kontroll on veel ootel. Konto kustutamise tervik jääb pooleli ja pausile.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** af78c7be2a336da661be838d3577bb51b7ad3b66; puu 0481e179f75dccfad7fcbe9285ae5230b5472ba5; 2505 faili ja 41061907 baiti. Git https://github.com/Taivo17/selqiro.git. ASUKOHT-1 paigaldusraport: 1481509 baiti, SHA256 e8836d6f572ce0310d0ffb8280a666be9c3063af30c59b044dd492be28b92166. Kasutaja kinnitas eraisiku ja ettevõtte asukoha salvestamise ning avaliku aadressi toimimist.
- **Metaandmete ajalugu:** 27.11 aluse raport: 310390 baiti, SHA256 cc884c36ae31b5217b69c45e0810f28d5791572f462152225cf67d6fd11c5938; varasem tööotsingu raport jääb samuti muutmata. Uuendaja seob kolme varasema käigu raporti ja päeviku kokku kuue muutmata failina kolme lugemisluku all. PostgreSQL 17.6; PostGIS pole praeguse kaardisammu sõltuvus.
- **Valmistatud teostus:** Üks uus ainult lugemise RPC annab kanoonilise avaliku profiili kontrolli järel kinnitatud asula/piirkonna 7 välja. Range kliendiparser ja katkestatav lisalugemine; tühi profiilitulemus sulgeb ka vaate. Halli kohatäitja asemel laisalt laaditav interaktiivne OpenStreetMapi iframe ja suurema kaardi link; peidetud asukohal kaarti ei ole.
- **Täpsuse piir:** Senised koordinaadid on asula/piirkonna punkt, mitte ettevõtte hoone. Kaardile ei lisata täpse aadressi markerit. Ettevõtte teadlikult avalik aadress saab eraldi Google Mapsi aadressiotsingu lingi; uus geokodeeritud hoonepunkt vajaks eraldi tööd. Eraisikule jääb ainult ligikaudne avalik koht.
- **Seadistus ja ulatus:** Uut API võtit, sõltuvust, Geoapify avalikku päringut, asukoha uuesti valimist ega vanade pakkumiste täitmist ei ole. Senised profiilivormid ja kirjutuslepingud säilivad. Uue kaardi avalik paaniteenus on best-effort; suurema kasutuse korral tuleb teenindusmaht eraldi lahendada.
- **Paketi staatus:** Uus pakett selqiro-profiili-kaart-20261128; kavandatud commit Show privacy-aware public profile location map. Käesolev lähtekood on kohalik ettevalmistus, mitte kasutaja Maci/GitHubi või tootmise paigaldus. Uus käsk ja vastuvõtt: docs/continuity/PROFILE_MAP_INSTALL_20261128.et.md.
- **Tõendipiir:** 52 kliendipoolset regressioonikontrolli, 20 PostgreSQL native juhtumit, 6 SQL-kinnituse parseri rühma ja 49 uuendaja sünteetilist kontrolli on läbinud. Range TypeScript ja värske Next production build läbisid. Native fixture kasutab tegelikke konto/profiili/asukoha lepinguid; meediatee on kontrollitud stub ning pole meedia terviktest. Päris brauseri binaar puudub: välise kaardi laadimist ega visuaalset kasutamist ei märgita kohaliku tõendina läbituks.
- **Konto kustutamise seis:** Vastu on võetud active-only alus, avalike lugemiste ning kontakti/sõnumite/manuste ja töö omaniku kirjutuste kontrollid. Kaardi uus lugemine säilitab olemasoleva kanoonilise profiililugeja konto- ja blokeeringukontrollid. Muud omaniku kirjutused, meedia lõppkinnitused, värske autentimine, vanade sessioonide tõke ning sulgemine/taastamine/lõppkustutus jäävad eraldi lõpetamata tööks.

## Tegelik kohalik katse

- 52 fookustesti läbisid: 22 senise profiili, 8 konto/avaliku profiili ja 22 uue kaardilepingu/kliendi kontrolli. Range TypeScript ja värske Next 16.4.6 production build läbisid; /v2/profile/[slug]/page väljund on seotud. 774 ehituse sisendit säilisid muutmata; kõik 17 otsest sõltuvust vastavad lukufailile, võrgupäringuid 0.
- 20 PostgreSQL 17.6 native juhtumit ja 6 range SQL-kinnituse parseri kontrollirühma läbisid; kohalik server peatati. Sõltumatu SQL ülevaatus PASS: tegelik vastuvõetud alus, säilivad vanad lepingud/andmed, uue RPC õigused, privaatsus, konto ja blokeering, tehingu järelkinnitus ning eraldi verify.
- Uuendaja 49 sünteetilist kontrolli läbisid, 0 vahele jäetud. Need ei kasuta kasutaja Maci, live andmebaasi ega GitHubi. Uuendaja kordab Macis ühte fookustestide jooksu ja teeb värske buildi enne SQLi.
- Brauserijuhtumeid 0 ja ekraanipilte 0: Chromiumi binaar puudub. Kontrollitud on renderdatud märgistus ja lepingud; päris OpenStreetMapi iframe ning Google Mapsi aadressiotsingu tulemus jäävad sama uue tootmisversiooni kasutuskontrolli.

## Production / kasutajaliides

- Viimane vastu võetud tootmise commit on af78c7be2a336da661be838d3577bb51b7ad3b66. Paigaldusraport, Verceli Ready / Production / main pilt ja kasutaja kinnitus asukoha salvestamise ning avaliku ettevõtte aadressi kohta on olemas. Tööotsingu Otsin töökohta / Otsin tööotsi jaotus jääb vastu võetuks.
- ASUKOHT-1B kaardi uut Maci raportit, GitHubi pushi ega sama uue commiti Ready / Production tõendit veel ei ole. Pakkumiste otsing kasutab seni linna/riigi tekstivastet; eeltäide, lähimad-enne otsing ning ajutine teenusekoht ei kuulu sellesse paketti.

## Üks järgmine töö

Laadi selqiro-profiili-kaart-20261128.zip alla ja paki Downloads-kaustas lahti. Käivita üks kord: python3 -I -B "$HOME/Downloads/selqiro-profiili-kaart-20261128/uuenda.py" --publish. Saada uus JSON-raport; kontrolli sama uue commiti Ready / Production ja avaliku profiili kaardi laadimist, liigutamist/suumimist, ettevõtte avaliku aadressi linki ning peidetud asukohta. Uut API võtit pole vaja. ASUKOHT-1B vastuvõtu järel jätkub ASUKOHT-2 uute pakkumiste asukoha eeltäitega. Vanu pakette ega metaandmete kontrolli ei korrata.

**Peatumisel:** Peatumisel säilib ASUKOHT-1B ja lahendatakse sama käigu raportis näidatud konkreetne põhjus. Ära korda lõpetatud pakette ega kinnitamata SQL-kirjutust. Kaotatud rakendamise kinnitus ei anna õigust uuesti rakendada; eraldi verify ei asenda puuduvat pärast-COMMIT kinnitust. Kui lähtekood on edasi liikunud, võrdle muudatusi ja uuenda alust. Vanad NEXT/CURRENT pealkirjad on ajalugu.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md ja PROFILE_MAP_INSTALL_20261128.et.md — üks kehtiv käsk, uus raport ja kaardi vastuvõtt.
- docs/architecture/public-profile-map-v1-20261128.md ning supabase/releases/public-profile-map-v1/README.md — ASUKOHT-1B leping, privaatsuse ja tegeliku tõendi piirid.
- docs/architecture/profile-location-v1-20261127.md — nüüd vastu võetud ASUKOHT-1 algne leping; selle vana paigaldusjuhend on ajalugu.
- docs/architecture/location-country-20261127.md — kehtiv riigipiiri tooteleping ja järjekord ASUKOHT-1B/2/3/4.
- docs/architecture/location-foundation-accepted-20261127/REVIEW.md, location-provider-20261127.md ning docs/third-party/location-country-data/README.md — varasema aluse ja allikate tõendid.
- docs/architecture/account-deletion-status-20261127.et.md ja sama JSON — konto lõpetatud kaitsed ning allesjäänud töö; followed-news-grouping-20261124.md — säilitatud Uudiste nõuded, mitte aktiivne töö.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Kolm olemasolevat kontot ja nende sisu säilivad. Konto active-only alus jääb kehtima. Konto kustutamine on pooleli ja praegu pausil; sulgemine, taastamine ega lõppkustutus ei ole aktiveeritud. Kõik omaniku kirjutused ja meedia lõppkinnitused, värske autentimine ning vana sessiooni tõke pole veel valmis. 30-päevane taastamisaken on plaan, mitte töötav konto olek.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Kasutaja prioriteet on riigipiiriga asukohaotsing. ASUKOHT-1 on vastu võetud; 28.11 palve järgi on üks aktiivne etapp ASUKOHT-1B avaliku profiili kaart, seejärel ASUKOHT-2. Konto sulgemine, Uudised, esiletõstmine ja reklaamid on pausil säilinud tööjärjes. Reklaamija ei ole kolmas kontotüüp.
- Uudised koondab ainult kasutaja valitud jälgitavate poodide/profiilide sisu. Eraisiku ja ettevõtte tavapärane osalemine säilib. Uue kuulutuse avaldamist, olemasoleva muutmist/pikendamist ja eraldi teadet ei käsitleta automaatselt ühe ja sama uue sündmusena.
- Uudiste lahendus peab olema serveris piiratud ja indekseeritud lehekülgedega. Kogu jälgimisnimekirja või kogu voo brauserisse laadimine ei ole uue V2 lahenduse alus. Suurt samaaegsust ei loeta tõendatuks väikese kasutustee ega ühe kliendi sünteetilise katse põhjal.
- Uudiste 4 eelvaadet ja pakutud 7 päeva algvaade on teostusettepanekud. Vanemad perioodid jäävad kättesaadavaks. Nelja eelvaate nägemine ei märgi kõiki teisi kuulutusi loetuks; suur lisamiskogus ei tõrju poe eraldi teadet välja. Näidiskujunduses olevad poed, hinnad ja kogused on kujuteldavad.
- Fotobaitide välissalvestus ja andmebaasi tehing ei ole ühine tehing. Uus valmisoleku ja sõnumisse kinnitamise kontroll tõkestab hilinenud omaksvõtu; poolelioleva välise kirjutuse lõppu ega vana avaliku faili URL-i kohest kadumist sellega ei lubata. Koristamise ja lõppkustutamise töö jääb eraldi.
- Pakkumislink lisatakse ühe teadliku kontaktiavamise kohta järgmisele sõnumile, mitte ainult üks kord kogu vestluse ajal. Sama pakkumise hilisem uus avamine võib selle uuesti lisada. Kaardi automaatne lisamine igale sõnumile ja eraldi Lisa link uuesti tegevus ei kuulu kokkulepitud lahendusse. Kasutaja võib enne saatmist ootel kaardi eemaldada. Vestluse päises on viimati tegelikult jagatud pakkumise nimi ja klõpsatav link; saatmata või eemaldatud kaart päist ei muuda. Sama käitumine kehtib tavakuulutusele, hobusekuulutusele, teenusele ja tööle.
- Töökuulutuse konto kontroll ei aktiveeri sulgemist. Tulevane sulgemine teeb Auth/konto-oleku ülemineku ja COMMIT enne profiili/sisu lukkude võtmist eraldi tehingus; vastupidist lukujärjekorda ei lisata.
- Valitud riik on range otsingupiir; keskpunkt peab kuuluma samasse riiki. Kõik sobivuse/nähtavuse filtrid rakenduvad enne serveri kaugusjärjestust ja lehekülge. Tühi tulemus ei laienda otsingut naaberriiki. Ülemaailmne režiim on hilisem töö.
- Eraisiku avalik koht ja kaugus lähtuvad asula/piirkonna punktist. Täpne koht on ainult ettevõttele teadlikul valikul. Teenindusala, teenuse ajutine koht, tegelik töökoht ja kauba kättesaamise koht on eraldi tähendused; puuduvat punkti ei asendata salaja profiili või (0,0) punktiga.
- Vanade pakkumiste asukohti ei geokodeerita, täideta ega teisendata automaatselt. Need säilivad detailis ja senistes vaadetes; uude lähedusotsingusse ei anta neile väljamõeldud kaugust. Profiili uus põhiasukoht ei liiguta olemasolevaid pakkumisi.
- Otsingukoht ei muuda profiili põhiasukohta. Eeltäide on ainult aktiivse profiili puutumata uue mustandi ühekordne koopia; käsitsi valik, taastatud mustand ja pooleliolev avaldamiskäsk on ülimuslikud. Hobuste senine turupiirang säilib.
- Ajutine teenusekoht on hilisem eraldi etapp: üks käsitsi asukoht, algus/lõpp, aegumine ja tühistamine. See ei ole GPS-jälgimine, saadavuse garantii ega teenuse avaldamise pikendamine. Vana sisuhetktõmmise kviitungeid ei muudeta.

## Keskkond

- Kasutaja Maci projekt /Users/taivo/selqiro. Git https://github.com/Taivo17/selqiro.git, main. Uus uuendaja eeldab täpset af78c7b lähtealust, olemasolevaid sõltuvusi ning kolme varasema käigu raporteid koos privaatsete päevikutega; kuus faili säilivad.
- Next 16.4.6, React 19.2.4, Sharp 0.35.5 ja Supabase CLI 2.117.0 jäävad samaks. Sõltuvusi, CLI seost, Auth/SMTP seadeid, Storagei ega Verceli keskkonnamuutujaid ei muudeta. Senine Geoapify võti jääb serveri asukohavaliku seadistuseks, mitte kaardi sisendiks.
- Uuendaja teeb source → fookustestid → värske build → ainult lugemise SQL eelkontroll → kuni üks kirjutus → pärast COMMITi kinnitus → eraldi verify → commit/push. Ebakindel tulemus peatab; varasemaid katseid automaatselt ei korrata.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
