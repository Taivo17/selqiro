<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 23.11.2026 Europe/Tallinn — 8dc0b3b vastu võetud; tavakuulutuste konto-oleku kontroll ette valmistatud

## Praegune checkpoint

Avaliku profiili konto-oleku kontroll on 8dc0b3b-na Maci raporti, sama commit’i Ready / Production pildi ja kasutaja kontrolli järgi vastu võetud. Uus väike moodul seob tavakuulutuste kolm avalikku otsingulugejat ning üksikvaate olemasoleva kontooleku kontrolliga. Ettevalmistuse sihitud kontrollid ja värske build on läbitud; uue paketi Maci rakendus, SQL, commit/push, deployment ja tegelik kasutustee on ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 8dc0b3b11777b010c8486b45a3f98f0191d97d80, puu fc44ed6ae9e903bbbaef1df2017fdca396a1aa02, 2130 jälgitavat faili. Kõik taastatud failid vastavad aktsepteeritud SHA-256/Git blob kirjetele ning tervikpuule. See pole värske Maci vaatlus.
- **Aluse tõend:** selqiro-profiili-konto-olek-20261123-raport-20261123-190200-2ca1275173f0.json, 1341579 baiti, SHA256 62ec79032d68bdb6e453953f639255876bbb000da19d11e70d5584111ebf7ba9. Selle käigu üks SQL rakendus, järelkontroll, commit/push ja eraldi kasutaja Ready / Production pilt on vastu võetud. Lõpetatud profiilipaketti ei korrata.
- **Uus ulatus:** search_public_listings_v1, search_public_listings_v2, search_public_marketplace_v1 tavakuulutuste haru ja get_public_listing_detail_v1. Tegelik hosted /v2/products kasutab ühendatud otsingut, seetõttu on ka selle ordinary haru kaetud. Hobuste haru on baiditäpselt sama.
- **Üks kontooleku allikas:** Senine privaatne account_is_available(uuid) säilib muutmata. Eraisiku omanik tuleb identities.user_id-st, ettevõttel business_accounts.owner_user_id-st. Puuduv seos või tundmatu tüüp ei kasuta autorit ega liiget varuomanikuna. Kontode ega sisu ridu ei muudeta.
- **Otsing ja detail:** Sobivus kehtib enne koguarvu ja lehekülje piiri. Senised newest järjestus, FTS, filtrid, hinnad, aegumine, galerii ja avalik vastusekuju säilivad. Autorikonto blokeerimise senine tähendus jääb eraldi; ajutine pakkuja peitmine jääb ainult otsingusse. Detailil pole omaniku möödapääsu.
- **SQL tõendi piir:** Kehad ja ACL-id on taastatud aktsepteeritud lähtefailidest. Uuendaja värske metaandmete eelseis peab neid kinnitama; seejärel üks piiratud tehing ja eraldi järelkontroll. Siin kasutati eraldatud sünteetilist PostgreSQL-i, mitte kasutaja pilveandmeid.
- **Jätku piir:** Konto sulgemise/taastamise/kustutamise toiming pole veel avatud. Muud pakkumiste, legacy, sõnumite ja kirjutamise teed jäävad järgnevateks mooduliteks. Värske anonüümne jagamise metadata kasutab sama detaililugejat; varem väljastatud metadata ega avalikke pildi-URL-e ei tühistata.

## Tegelik kohalik katse

- 13/13 uut sihitud TypeScripti, anonüümse metadata ja Reacti serverrenderduse kontrolli läbisid; kõik 45 rakenduse sisendräsi säilisid. Kontrollitud on tegelik ühendatud otsingutee, tühja vastuse ja vea eristus ning eesti/inglise vaated. Transport ja vastused olid sünteetilised; see ei ole brauseritest.
- 37/37 lõpliku SQL-i PostgreSQL 17.6 käitumise ja metaandmete kontrolli läbisid. Parseri 18 varasemat kontrolljuhtu katavad muutmata loogikat; pärast ainult AFTER-räsi muutmist kontrolliti kolme lõplikku päris kviitungit uuesti. Konto-, õiguste-, omaniku-, blokeerimise-, peitmise-, lehekülje-, galerii- ja hobuste senise haru juhud on eraldi tõendatud.
- 12 000 sünteetilise kuulutusega vana/uue lugeja 14 võrdlusjuhtu säilitasid aktiivsete kontode tulemused. Veel 20 000 otsinguga mitteseotud konto lisamine ei suurendanud kuue valiva kontrolli sobivusfunktsiooni kutsete arvu. Esialgne kõiki identiteete läbiv lahendus asendati kuulutuse identiteedi võtmega piiratud lugemisega. Ühendatud otsingu varasem laia tulemushulga aeglus jääb eraldi optimeerimistööks enne suuremat kasutusmahtu.
- Värske täielik Next.js 16.4.6 / TypeScripti build läbis 33,042 sekundiga. Kõik 765 koostamissisendit säilisid. Kasutati täpseid olemasolevaid lukufaili sõltuvusi ja inertseid lokaalseid seadeid; sõltuvusi ei paigaldatud ega uuendatud. Logi SHA256 on 1ac746178e79605831e14522e0247620eb09b91ebb993639600983c1e4de9936.
- Uuendaja 14/14 uut sihitud töövoojuhtu läbisid. Lõpliku SQL-kviitungi järel kontrolliti uuesti ainult kolme olemasolevat asjakohast juhtu; kogu komplekti ei korratud. Uus kviitungi kontroll, kadunud kinnituse järel sõltumatu lugemine ja ebaselge kirjutuse automaatse kordamise keeld läbisid. Seitse varasemat Giti, protsessi, sõltuvuste ja transpordi abimoodulit säilivad baiditäpselt.
- Päris brauserikontroll on ootel. Varasema dokumenteeritud Chromiumi socket- ja pilvebrauseri loopback-piirangu muutumisest uut tõendit ei ole; katset ei korratud ega piirangut eiratud. Sünteetiline transport ja Reacti serverrenderdus ei asenda sama uue commit’i Ready / Production järgset kasutuskontrolli.

## Production / kasutajaliides

- 8dc0b3b profiiliparandus ning eraisiku/ettevõtte avalike profiilide ja Minu konto avanemine on vastu võetud. Uue tavakuulutuste paketi paigaldus ei ole veel tehtud.
- Uuendaja kontrollib kogu tegelikku lähtepuud, indeksit/tööpuud, remote’i, sõltuvusi ja viimase eduka käigu originaalraportit. Uued sihitud testid ja värske build eelnevad ühele SQL muudatusele ning eraldi verify-le. Seejärel tehakse ainult selle paketi commit/push.
- See samm ei muuda kontoolekuid, registreerimist, SMTP-d, Storage’i ega olemasolevaid pakkumisi ja vestlusi. Ettevalmistatud lähtekood, Maci rakendus, SQL, commit/push ja Vercel on eraldi tõendid.

## Üks järgmine töö

Paki selqiro-kuulutuste-konto-olek-20261123.zip Downloads-kaustas lahti ja käivita python3 -I -B "$HOME/Downloads/selqiro-kuulutuste-konto-olek-20261123/uuenda.py" --publish. Saada täpselt SAADA SEE FAIL juures näidatud raport. Pärast sama uue commit’i Ready / Production tulemust värskenda portaali ning ava tavakuulutuste otsingust olemasolev kuulutus koos piltidega. Kontrolli sama lugemisteed eraisiku ja ettevõtte kontoga; Minu konto ning olemasolevad avalikud profiilid peavad jääma avatavaks.

**Peatumisel:** Säilita allikad, indeks, kontod, sisu, paketid, raportid ja päevikud. Tundmatu lähtepuu, originaalraport, protsessiseis, sõltuvus või SQL eelseis peatab uuendaja. Ebaselget SQL kirjutust automaatselt ei korrata. Saada täpne näidatud raport või selle puudumisel PEATATUD-rida. Vanu paigaldajaid ega käsitsi SQL-i ei käivitata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — selle paketi üks käsk ja kasutuskontroll.
- docs/architecture/account-listing-read-fence-v1.md — neli serverilugejat, otsingu piir ja tõendid.
- docs/architecture/account-public-profile-accepted-20261123.md — vastu võetud 8dc0b3b alus.
- supabase/releases/account-listing-read-fence-v1/README.md — SQL eelseisu ja rakenduse leping.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, pakkumisi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata, liideta ega kirjutata ümber. Uus SQL asendab ainult nelja avaliku tavakuulutuse lugeja definitsiooni. Konto active-only alus ja olemasolev privaatne sobivusfunktsioon säilivad. Konto sulgemine või kustutamine vajab ülejäänud teede lõpetamist.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; kinnitatud https://github.com/Taivo17/selqiro.git. Paketi ainus alus on 8dc0b3b11777b010c8486b45a3f98f0191d97d80, fc44ed6ae9e903bbbaef1df2017fdca396a1aa02, 2130 faili. Viimane Maci vaatlus on 23.11 kell 19:02 raportis; enne uut kirjutust tehakse värske kontroll.
- Next 16.4.6, Sharp 0.35.5, package.json ja package-lock.json säilivad. Olemasolev Supabase CLI 2.117.0, projekt vyjletlmwoiwxsnsunlm ja senised sõltuvused kontrollitakse; paigaldusi ega uuendusi ei tehta.
- Uus päevik on ~/Library/Application Support/Selqiro/account-listing-read-20261123/<manifest-sha256> all. Eelmise account-public-profile-20261123/ef66792304f6ea94ed7773954d7773b82fd3e37f28d67fbde22cb935c8228574/result.json täpsed baidid jäävad ainult lugemiseks lukustatuks ja säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
