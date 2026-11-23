<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 23.11.2026 Europe/Tallinn — tavakuulutuste konto-oleku kontroll vastu võetud, main 87bff3f

## Praegune checkpoint

Tavakuulutuste avalike otsingute ja üksikvaate konto-oleku kontroll on Macis ühe SQL rakendamise ning eraldi järelkontrolliga lõpetatud, commit 87bff3f on pushitud. Kasutaja Verceli pilt näitab sama commit’i Ready / Production tulemust ning kasutaja kinnitas „kõik lehed avanevad”. See väike moodul on vastu võetud. Järgmine üks moodul on hobusekuulutuste põhiotsingu ja avaliku üksikvaate sama kontooleku kontroll.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 87bff3f51a01a6953c37096ed32a1017135fd304; ainus vanem 8dc0b3b11777b010c8486b45a3f98f0191d97d80; puu a6f7b7522cd0e88db25caf88b8dd4e9a48c64d77; 2154 jälgitavat faili. 32 paketi rada: 8 muudetud ja 24 uut. Täieliku lõpppuu, indeksi, staged sisu, vanema, pealkirja ning muudetud teede väljundid taastati ja võrreldi raporti pikkuste/räsidega. Ülejäänud alusfailid säilivad; raporti lõpus on puhas tööpuu/index.
- **Maci raport:** selqiro-kuulutuste-konto-olek-20261123-raport-20261123-202738-2e4bf1222037.json, 1350011 baiti, SHA256 1771fc501d411e71f45bb63a098a62abe47d6b33612782b6b30b11a7e65e8b95. Käik 20:26:41.816–20:27:38.341 Europe/Tallinn. Stage complete, tests/build passed, database verified, apply_count 1, push verified. Viimane remote’i võrdsus 20:27:38.314.
- **Andmebaas:** Üks preflight enne, üks kinnitatud apply ning eraldi ainult lugemise verify pärast kinnitasid täpse enne/pärast kataloogiseisu. Kolme CLI kviitungi ümbrised taastati baidipikkuse ja räsi järgi ning parsiti algse range parseriga. Terviklikku kataloogi toorväljundit raport ei ekspordi; selle uuesti parsimist ei väideta.
- **Rakendatud piir:** search_public_listings_v1, search_public_listings_v2, search_public_marketplace_v1 ordinary haru ja get_public_listing_detail_v1. Konto sobivus rakendub enne koguarvu ja lehekülge. Olemasolev konto helper, profiilipiir, omanikud, õigused, hinnad, filtrid, aegumine, galerii ja avalik vastusekuju säilivad.
- **Jõudluse piir:** Ettevalmistuse plaanid kinnitasid kandidaadi identiteedi võtmega piiratud lugemist; 20 000 mitteseotud konto lisamine ei kasvatanud kuue valiva kontrolli sobivuskutsete arvu. See pole tootmiskoormuse tõend. Ühendatud laiotsingu varasem kaartide koostamine enne lehekülge vajab enne suuremat kasutusmahtu eraldi optimeerimist.
- **Dokumentatsiooni piir:** Käesolev vastuvõetud seis ja üleandmine on 87bff3f-järgne ettevalmistus. Maci/Giti dokumente pole pärast seda commit’i siit kirjutatud ega pushitud. Lisad tulevad järgmise sisulise koodipaketiga; eraldi paigaldust pole vaja.

## Tegelik kohalik katse

- Maci üks sihitud TAP-käik: 13/13 testi, null viga/vahelejätmist/katkestust/todo. Logi 3083 baiti, SHA256 955c64832cf494f63741f10392d06b2cf342fae32f995894d3c977a18277b7ec. Raport sisaldab range parseri tulemust ja logi räsi; toorlogi pole lisatud ja seda ei nimetata toorlogi kordusparsimiseks.
- Üks uus edukas Next.js 16.4.6 / TypeScripti build. Logi 2570 baiti, SHA256 bddcfe8957688ce8349121ed3dc45a88b6999fb7f39c259e34495405fa87ea97; kaheksa ehitusartefakti räsi. See ei ole väide tühja vahemäluga koostamisest.
- Kõik 569 käsukirjet on lubatud exit-koodi, lõpetatud voogude ja kinnitatud protsessilõpuga. Kolm runtime-etappi ja 12 kontrolli kinnitasid, et seotud arendusprotsessi ei täheldatud. Senised päevikud ning eelmise eduka käigu ainult lugemiseks lukustatud originaal säilisid.
- Ettevalmistuse 37 SQL-juhtu, 18 muutmata parseriloogika juhtu, kolm lõplikku kviitungit, 14 uuendajajuhu ja kolme asjakohase korduskontrolli tõend säilivad. Vastuvõtul kontrolliti faile, räsisid ja salvestatud tulemusi; uut rakendusetesti, build’i, SQL-i ega teenusepäringut ei tehtud.

## Production / kasutajaliides

- Kasutaja 23.11 kell 20:42:59 kuvatõmmisel on Respect account availability in ordinary listing reads, main 87bff3f, Ready (23 s) ja sinine Production märge. See on raportist eraldi deployment’i tõend; algne READY_NOT_CHECKED säilib.
- Kasutaja kinnitas pärast uuendust „kõik lehed avanevad”. See võetakse küsitud lugemistee kasutajakontrollina vastu. Lisatud pilt näitab Vercelit; eraldi portaalivaate pilte, anonüümset seanssi, mobiili või iga konto ja nupu kontrolli sellest ei tuletata.
- Konto sulgemise/taastamise/kustutamise toimingud pole avatud. Hobuste ja teiste domeenide lugejad ning kirjutamise/sõnumite/piltide elutsükkel vajavad oma piiri enne konto terviku valmimist.

## Üks järgmine töö

Valmista 87bff3f alusel ette hobusekuulutuste põhiotsingu ja avaliku üksikvaate konto-oleku kontroll: search_public_marketplace_v1 ainult horses haru ning get_public_horse_offer_v1. Kasuta sama privaatset account_is_available helperit ja säilita avaldamise lõplikkuse, riigipoliitika, hindade, piltide ning konto/omaniku lepingud. Täpne piir ja sihitud plaanikontroll on docs/architecture/account-horse-read-next-20261123.md-s. Lõpetatud tavakuulutuste paketti ei käivitata uuesti.

**Peatumisel:** 87bff3f paigaldus ja vastuvõtt on lõpetatud. Säilita kõik paketid, raportid ja päevikud. Enne järgmist Maci kirjutust kontrolli tegelikku haru/HEAD-i, lähtepuud, indeksit/tööpuud ja kinnitatud remote’i. Tundmatu lähtekood või SQL eelseis peatab järgmise uuendaja. Lõpetatud paigaldajaid, SQL-i ja laiu teste ei korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — vastu võetud etapp ja üks järgmine töö.
- docs/architecture/account-listing-read-accepted-20261123.md — täpne Mac/Git/SQL/deployment/kasutustee tõend.
- docs/architecture/account-horse-read-next-20261123.md — järgmise kahe hobuselugeja piir ja lähteallikad.
- docs/architecture/account-listing-read-fence-v1.md — nüüd rakendatud tavakuulutuste leping.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, pakkumisi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Vastu võetud SQL asendas ainult nelja lugeja definitsioonid. Konto active-only alus ja sama helper säilivad. Sulgemise ja kustutamise tervik vajab ülejäänud vajalike serveriteede lõpetamist.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; kinnitatud https://github.com/Taivo17/selqiro.git. Viimane tegelik main 87bff3f51a01a6953c37096ed32a1017135fd304, puhas tööpuu/index ning remote’i võrdsus on 23.11 kell 20:27:38.314 raportis. Siinne ülevaatus ei ole värske Maci ega remote’i vaatlus.
- Next 16.4.6, Sharp 0.35.5, package.json ja package-lock.json säilivad. Supabase CLI 2.117.0 ja projekt vyjletlmwoiwxsnsunlm olid kontrollitud. Sõltuvuste paigaldusi, uut linkimist ega uuendusi ei tehtud.
- Edukas originaalpäevik: ~/Library/Application Support/Selqiro/account-listing-read-20261123/f8619bf143a47d7f373aeaebacfebb42d7e1752b0470ab3aa84233afd42c976f/result.json. Eelmise account-public-profile-20261123 originaalraporti täpsed baidid säilisid ainult lugemise lukus.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
