<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 24.11.2026 Europe/Tallinn — hobusekuulutuste konto-oleku kontroll vastu võetud, main ac5521a

## Praegune checkpoint

Hobusekuulutuste üldotsingu ja avaliku üksikvaate konto-oleku kontroll on vastu võetud: Maci raport kinnitab ühe SQL rakendamise, eraldi järelkontrolli, testid, build’i ja ac5521a commit/push’i. Sama commit on kasutaja Verceli pildil Ready / Production. Kasutaja kinnitas „kuulutused avanevad” ning näitas hobuse- ja tavakuulutust, otsingut, Minu ala loendit ning mõlemat avalikku profiilitüüpi. Järgmine üks moodul on avaliku profiili kuulutuste ja poerubriikide eraldi lugejate konto-oleku kontroll.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main ac5521a7e944ebfb3710ea97b9913cc91b9130ee; ainus vanem 87bff3f51a01a6953c37096ed32a1017135fd304; puu 3466f08a7134bd6fb8b334b7520924f85cfad394; 2177 jälgitavat faili. 32 täpset paketi rada: 9 muudetud ja 23 uut. Lõpppuu, indeksikirjed ja staged failid taastati paketi ning eelmise aluse baitidest; nende pikkused ja räsid vastavad raporti Giti väljunditele. Ülejäänud alus säilib. Raporti lõpus on puhas tööpuu/index.
- **Maci raport:** selqiro-hobuste-konto-olek-20261123-raport-20261123-222207-586571aebed0.json, 1353920 baiti, SHA256 e419d6395a85b8d9a8c213bc6aad58d74878e3a5bd311230401fb38b5986c5c1. Käik 23.11 kell 22:21:10.946–22:22:07.849 Europe/Tallinn. Stage complete, 12 testi/build passed, database verified, apply_count 1 ja push verified.
- **Andmebaas:** Üks preflight enne, üks COMMIT-i järel kinnitatud apply ja eraldi ainult lugemise verify pärast kinnitavad täpse valitud kataloogiseisu. Kolme vastuseümbrise taastatud baidid vastavad salvestatud pikkustele/räsidele ning läbivad algse range parseri. Tervet kataloogi ega konto/sisu ridu raport ei ekspordi. Järelkontroll lõppes 23.11 kell 22:21:42.525 Europe/Tallinn; see pole uus pilvepäring.
- **Rakendatud piir:** search_public_marketplace_v1 ainult horses haru ja get_public_horse_offer_v1(uuid). Ühendatud otsingu ordinary haru ning ühine count/page/JSON lõpposa säilivad baiditäpselt. Konto helper on muutmata; eraisiku konto tuleb identities.user_id-st, ettevõttel business_accounts.owner_user_id-st.
- **Säiliv leping:** Avaldaja kahepoolne blokeerimine, otsingu peitmine, avaldamise ja galerii lõplikkus, tähtajad, viis pakkumisliiki, EE/EUR, hinnad ja avalikud väljad säilivad. Puuduv üksikvaade jääb tooreks null-vastuseks. Kontode/sisu ridu, SMTP-d, Auth-i, Storage’i ega sõltuvusi paigaldus ei muutnud.
- **Järgmise mooduli tõendipiir:** Kolme profiili pakkumiste/rubriikide RPC allikad ja tegelikud kliendikutsed on auditeeritud. Nende täpset live-definitsiooni ja õigusi see hobuste paigaldus ei kontrollinud; järgmine uuendaja peab eelseisu värskelt tõendama. Uut teostust ega paigalduskäsku pole vastuvõtupakis.
- **Dokumentatsiooni piir:** Käesolev vastuvõetud seis, üleandmine ja päevikulisad on ac5521a-järgne ettevalmistus. Neid pole siit Maci kirjutatud, commit’itud ega pushitud. Järgmine sisuline koodipakett võtab lisad kaasa; eraldi paigaldust pole vaja.

## Tegelik kohalik katse

- Maci üks sihitud 12/12 TAP-käik; null viga, vahelejätmist, katkestust ja todo. Logi 3107 baiti, SHA256 993330c528cbf3bbeff18e994f16a02f53742f6cb1f02a6c4e14bc6551d98257. Üks edukas Next.js 16.4.6 / TypeScripti build; logi 2570 baiti, SHA256 e2cd9f85334dee5833076e5926884831ac42e8eb5c6bee21deee8c51d7ed5443. Kaheksa ehitusartefakti räsi hõlmavad products, horse-offer ja profile lehti. Toorlogid ja ehitusfailid pole lisatud; kontrolliti parsitud tõendeid ja räsiseoseid, neid toorloge siin uuesti ei parsitud. Tühja vahemäluga build’i ei väideta.
- Kõigi 569 käsu väljundivood ja protsessilõpud on raportis kinnitatud. Kolm runtime-etappi ning 12 proovi ei täheldanud seotud arendusprotsessi. Eelmise eduka tavakuulutuste käigu täpne originaal säilis ainult lugemise lukus. Väljastatud pakett ja raportid säilivad.
- Ettevalmistuse 12 kliendi-, 56 native PostgreSQL-i ja 17 uuendajakontrolli ning täieliku build’i tõend jääb muutmata paketti. Vastuvõtul võrreldi salvestatud tulemusi, allikaid ja räsisid; rakenduseteste, build’i, SQL-i ega teenusepäringuid ei korratud.
- Varasem sünteetiline mõõtmine: 2400 avaldatavat hobust, 600 tavakuulutust ja 1920 pilti; 12 vana/uue päringu võrdluses aktiivsete kontode tulemused samad. 20 000 kõrvalise konto lisamisel viie valitud juhu sobivuskutsete arvud säilisid. Segatud laiotsingu mediaan 2804,52 → 2954,86 ms (+5,36%, kattuvad vahemikud). Need pole tootmiskoormuse tulemused. Laiotsingu lõplikkuse kontrollid, kaartide koostamine enne lehekülge ja hobuste FTS vajavad enne suuremat kasutusmahtu eraldi optimeerimist.

## Production / kasutajaliides

- Kasutaja kuvatõmmisel Screenshot 2026-11-23 at 22.22.57.png on õige pealkiri, main ac5521a, Ready (21 s) ja sinine Production. See on eraldi deployment’i tõend; originaalraporti READY_NOT_CHECKED väli säilib.
- Kasutaja 24.11 pildid ja „kuulutused avanevad” kinnitavad olemasoleva hobusekuulutuse kaht pilti, hinda/müüjat ja andmeid; segatud otsingut; tavakuulutuse kuut pilti ja andmeid; Minu ala loendit ning Taivo Garaazi ja Milline Veo avalikke profiile. Nuppude käivitamist, täpset klikkide järjekorda ega uut anonüümset/mobiilset seanssi ei tuletata. Minu konto navilink pole uus selle lehe kontroll.
- Konto sulgemine, taastamine ja kustutamine pole avatud. Profiili pakkumiste/rubriikide otselugejad, teised sisutüübid, kirjutused, sõnumid ning meedia vajavad oma lõpetamist. Avalikke pildi-URL-e ega varem salvestatud metadata’t see samm ei tühista.

## Üks järgmine töö

Valmista ac5521a alusel ette avaliku profiili kuulutuste ja poerubriikide konto-oleku kontroll: get_public_profile_marketplace_v1/v2 ning get_public_profile_store_categories_v2. Säilita üheselt leitud aktiivse profiili nime lahendamine, olemasolev vastusekuju, filtrid, loendamine/leheküljed ja õigused. Kasuta sama privaatset account_is_available helperit. Ühise rubriigilugeja profiilikontroll kehtib nii marketplace kui services ulatuses; teenuste sisuline sobivusloogika jääb muutmata. Täpne audit on docs/architecture/account-profile-marketplace-read-next-20261124.md. Lõpetatud hobuste paketti ei korrata.

**Peatumisel:** ac5521a paigaldus ja selle mooduli vastuvõtt on lõpetatud. Säilita paketid, raportid, päevikud ja kogu olemasolev sisu. Enne järgmist Maci kirjutust kontrolli tegelikku haru/HEAD-i, lähtepuud, indeksit/tööpuud ning kinnitatud remote’i. Tundmatu lähtekood või SQL eelseis peatab järgmise uuendaja. Lõpetatud paigaldajaid, SQL-i ja laiu teste ei korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — vastu võetud etapp ja üks järgmine töö.
- docs/architecture/account-horse-read-accepted-20261124.md — Maci/Giti/SQL-i, deployment’i ja kasutuskontrolli täpne piir.
- docs/architecture/account-profile-marketplace-read-next-20261124.md — järgmise kolme profiililugeja audit ja allikapin’id.
- docs/architecture/account-horse-read-fence-v1.md — nüüd rakendatud kahe hobuselugeja leping.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, kuulutusi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Vastu võetud SQL asendas ainult kahe hobuselugeja definitsioonid. Konto active-only alus ja sama sobivusfunktsioon säilivad. Sulgemise/kustutamise tervik vajab ülejäänud serveriteede lõpetamist.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; kinnitatud https://github.com/Taivo17/selqiro.git. Main ac5521a7e944ebfb3710ea97b9913cc91b9130ee, puu 3466f08a7134bd6fb8b334b7520924f85cfad394, 2177 faili. Viimane raporti remote’i võrdsus 23.11 kell 22:22:07.822 Europe/Tallinn; tööpuu/index puhas. Siinne vastuvõtt ei ole värske Maci ega remote’i vaatlus.
- Next 16.4.6, Sharp 0.35.5, package.json ja package-lock.json säilivad. Olemasolev Supabase CLI 2.117.0 ja projekt vyjletlmwoiwxsnsunlm kontrolliti. Sõltuvusi ega teenuseid ei paigaldatud, uuendatud ega uuesti ühendatud.
- Edukas originaalpäevik: ~/Library/Application Support/Selqiro/account-horse-read-20261123/da207b8172dfc18521af6b009ec8730b2404be2692de48110fd0b5ad93df974c/result.json. Eelmise account-listing-read-20261123 originaali täpsed baidid ja kõik varasemad paketid säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
