<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 20.11.2026 Europe/Tallinn — 7c7bc11 vastu võetud; avamise AI sulgemine ette valmistatud

## Praegune checkpoint

Kasutaja kinnitas lihtsama profiili/privaatsuse ja ilma tasulise AI-ta avamise suuna. Enda tume sõnumimull 7c7bc11 on 19.11 Maci raporti ja Productioni piltidega vastu võetud. Uus piiratud parandus sulgeb kaks kuulutuste AI serverirada ning eemaldab vana /sell vormi AI-kutsed. Kolme runtime-faili parandus, handleritest ja dokumendid on kohalikult kontrollitud; Maci rakendus ning uus väljastus on veel tegemata. Reklaam ja esiletõstmine on tulevane töö: üks sisselogimine, valikuline avalik profiil, olemasolev Energy vundament.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main, 7c7bc115e209495d5610a76e8626f9f049451274; parent 413e8fcb3b94fbd307e2d46645fed991306e9476; puu 93bfb66962da51bad3fdb7674e383089938a3481, 1884 faili. Kõik algfailid vastavad vastu võetud inventuurile. See pole uus live-Maci eksport.
- **Vastuvõtu tõend:** 19.11 originaalraport 279858 B, SHA256 4383326edacd75b76f0c659ba65bbce1232631b3a9cfb4d6712bfc9c2ecbd4fa: complete, build passed, push verified. Sama commit'i Ready / Production ja tumeda sõnumimulli pildid on eraldi vastu võetud. Raporti ajaloolist READY_NOT_CHECKED välja ei muudeta.
- **Muudatus:** enrich-listing ja analyze-listing POST annavad kohe 503/listing_ai_disabled ilma provider-, DB- või Energy tegevuseta. /sell ei käivita fotoanalüüsi, automaatset rikastamist ega AI kategooriaparanduse kirjutust. Tavaline salvestus, pildid ja mustandi taastamine säilivad; vana mustandi ajalooline AI tulemus võib endiselt nähtav olla.
- **Tõendi piir:** Uues paketis on 3 runtime-faili, 1 sisuline test ja 11 dokumentatsioonifaili. Lähteülevaatus ei kinnita live andmebaasi õigusi. Andmebaasi, Storage'i, päris kontosid, võtmeid ega vanu Energy reserveeringuid selles sammus ei loeta ega muudeta.
- **Järjepidevus:** Aluse kolm senist continuity-faili säilivad baiditäpselt history/launch-ai-containment-base-7c7bc11-20261120 all. Dev-log täieneb lõppu. Väljastatud novembri paketid ja nende päevikud jäävad muutmata. Uus reklaamikavand eristab varasemat Selqiro objektide esiletõstmist välise veebilehe reklaami laiendusest.

## Tegelik kohalik katse

- Tegelikke POST-handlereid käivitav test PASS: 12/12. Mõlema mooduli import ja anonüümne, Bearer-, V2 lepinguga, tundmatu lepinguga ning vigase JSON-iga päring ei loe sõltuvusi, võrku, environment'i ega päringut. See pole live HTTP ega brauseri test.
- Üks täielik Next.js/TypeScript build PASS; 730 sisendit, räside muutus 0. Kasutatud olemasolevaid lukustatud sõltuvusi ning passiivset loopback compile-konfiguratsiooni.
- Sõltumatu runtime-ülevaatus: blokeerivat leidu ei ole. Kuulutuse insert ja mustandi salvestamise/taastamise plokid on alusega bait-baidilt samad. V2 praegune vorm ei renderda alles jäetud AI-kaardi komponenti.
- Uuendaja kontrollid ja lõpliku paketi tarnekontroll on kontrollid/ all. Nende simuleeritud app-test/build ei asenda eespool eraldi käivitatud päris handleritesti ja build'i. Brauseri teekonda ei korratud varem tuvastatud käivituspiirangu tõttu; uus Productioni vastuvõtt on ootel.

## Production / kasutajaliides

- Viimane vastu võetud väljastus on 7c7bc11. Praegune AI sulgemine pole Macis rakendatud, committitud, push'itud ega Productionis kinnitatud.
- Töö, teenuste ja kuulutuste varasem vastuvõtt ning tumedad enda sõnumimullid säilivad. Avalikku portaali ei katsetatud ründepäringute, uue kuulutuse, uue sõnumi või andmete kustutamisega.

## Üks järgmine töö

Ava uus selqiro-ai-sulgemise-parandus-20261120.zip Downloads-kaustas ja käivita HOSTED_PORTAL.md üks uuenda.py --publish käsk. See kontrollib värsket tegelikku alust ja eelnevat originaalraportit, rakendab piiratud muudatuse ning nõuab testi ja build'i enne commit/push'i. Saada selle jooksu täpne SAADA SEE FAIL raport ja sama commit'i Verceli Ready / Production tulemus. Järgnev arendus on profiili õiguste ja avalike andmete lugemisinventuur enne uut profiiliredaktorit, mitte vana paranduse kordamine.

**Peatumisel:** Tundmatu HEAD, lähtepuu, index, remote, kasutaja muudatused või ebaselge jooks peatavad uuendaja; neid ei kirjutata üle. Vana originaalraport säilib lukustatult. Eelmisi paigaldajaid, SQL-i ega lõpetatud kontrolle ei korrata uue tõendita. Raporti vea korral saada täpne uus raport või prinditud STOP-rida.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — üks praeguse paranduse käsk ja tulemuse piir.
- docs/architecture/launch-ai-containment.md — sulgemine, testid ja varasemate Energy toimingute piirang.
- docs/architecture/launch-profile-privacy-plan.md — 20.11 kinnitatud suund ja järgmine profiili turvatöö.
- docs/architecture/advertising-access-plan.md — reklaamikonto ilma avaliku profiilita, lihtsad etapid ja allikad.
- kontrollid/ — tegelik handleritest ja build, sõltumatud ülevaatused, uuendaja ning tarnekontroll. SERVICE_ACCESS.json teenusesihid säilivad; selle vanad hetkeseisud ei ole tänane live-tõend.

## Säilivad piirid

- Üks olemasolev portaal ja andmebaas. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu ei tõlgita omavoliliselt. Tavaline osalemine, avaldamine, otsing ja pikendamine ei sõltu Energy ostust.
- Uuele tavakasutajale üks nähtav eraisiku või ettevõtte profiil; olemasolevate mitme identiteediga kontode andmed ja õigused säilivad. Konto, sisemine identiteet ning avaliku profiili avaldamine tuleb selgelt lahutada. Profiilita reklaamimine ei vaja uut autentimissüsteemi.
- Eraisiku avalik asukoht on linn/piirkond; täpset koduaadressi selleks ei koguta. Ettevõtte külastusaadress on vabatahtlik ja eraldi privaatsest arveldusest. Profiilipildi eemaldamise luba ei laiene kõigile kaane-, pakkumise- ega vestlusfotodele.
- Konto sulgemise 30-päevane taastamisaken on tootesoovitus, mitte kohustuslik õiguslik viivitus. Sisselogimine ei pikenda tähtaega, taastamine on teadlik. Kustutamise, vestluste, varukoopiate ja vaidlustõendite alused/tähtajad tuleb enne rakendust lõpuni sõnastada.
- Avamine ilma tasulise AI-ta asendab vana AI launchscope'i. Tulevane taasavamine on eraldi kontrollitud muudatus. Energy ja maksete vundament säilib reklaami jaoks, kuid uut reklaamirahakotti ega uut konto privileegitaset ei lisata.
- Reklaamikavand ei ole valmis funktsioon. Senine top_ad/featured, asjakohasus, fikseeritud Energy arvestus ja duplikaatide vältimine säilivad. Väline URL on eraldi laiendus; alguses piisab päringust ja käsitsi ülevaatusest. CPC/CPM/oksjon ei ole selle etapi ulatus.
- AI hard-off ei vabasta automaatselt varasemaid reserveeringuid. Nende olemasolu pole live kontrollitud; järgmine inventuur loendab vaid koondseisu. Automaatset mass-tagastust ega vana paid-raja taasavamist ei tehta.
- Vana profiilikirjutaja, avalike profiiliandmete õigused ning Next.js/Sharp sõltuvusriskid jäävad eraldi avamiseelseteks töödeks. Käesolev patch ei ole kogu portaali turvaauditi lõpetamine. Varasemad pakkumise kehtivuse, rubriikide, peitmise/blokeerimise ja fotokoristuse piirid säilivad.

## Keskkond

- Olemasolev /Users/taivo/selqiro, kinnitatud Taivo17/selqiro remote ja selqiro.vercel.app. Uusi teenuseid, maksekontosid ega andmebaase ei looda.
- Uus päevik launch-ai-containment-20261120. Eelmine outgoing-message-contrast-20261118 originaalraport hoitakse muutmata lugemislukuga; vana allalaaditud raportikoopia ei asenda seda.
- Uuendaja kasutab olemasolevaid lukustatud sõltuvusi, node --test tests/launch-ai-disabled.test.mjs ning ühte täielikku build'i. Mõlemad peavad läbima enne commit/push'i. Iga jooksu raport on unikaalne privaatne Downloads-fail, SAADA SEE FAIL näitab täpset rada ning Finderi avamine on piiratud.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
