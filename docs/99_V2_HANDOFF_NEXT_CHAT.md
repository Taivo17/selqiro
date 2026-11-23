<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 23.11.2026 Europe/Tallinn — 4b60782 vastu võetud; avaliku profiili konto-oleku kontroll ette valmistatud

## Praegune checkpoint

Minu konto ja konto aktiivse oleku vundament on 4b60782-na Maci raporti, Verceli Ready / Production pildi ning kasutaja konto vaate järgi vastu võetud. Järgmine väike serverimoodul seob kanoonilise avaliku profiili ja selle meediaprojektsiooni sama konto olekuga. Lähtekood ning sihitud kontrollid on valmis; selle uue paketi Maci käik, SQL, commit/push ja kasutustee on ootel.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 4b607828d0b153b84166ba963fdb4e77337e11f0, puu 8012909c809772c1fd905129cc3643f8614655a3, 2108 jälgitavat faili. Taastatud failid vastavad kõigi SHA-256/Git blob kirjete ning arvutatud tervikpuu järgi aktsepteeritud seisule. See pole värske Maci vaatlus.
- **Aluse tõend:** Edukas r2 raport selqiro-konto-oleku-jatk-20261123-r2-raport-20261123-173202-f3cf50344df6.json; SHA256 df77de0996451e7b8823262294d7edcb128761eaf7e3a0ecbdce4d3bc47e59e6. Üks kontooleku SQL paigaldus, järelkontroll, värske build ja push on vastu võetud. Vanu paigalduskäske ei korrata.
- **Uus kitsas muudatus:** Üks privaatne STABLE account_is_available(uuid) ning get_store_by_slug valitud kandidaadi lõppfilter. Ühe konto olekurida ja Auth kättesaadavus määravad sobivuse; puuduv rida ei loo end lugemisel. Algoleku trigger ja active-only piirang säilivad.
- **Kanooniline valik ja omanik:** Kanooniline slug valitakse enne konto sobivuse kontrolli; kättesaamatu profiili asemel ei avata teise konto vana aliast. Eraisiku omanik on identities.user_id, ettevõttel business_accounts.owner_user_id. Tundmatu tüüp või omanik ei ole sobiv.
- **Säiliv avalik leping:** Profiili tagastatavad väljad, asukoha privaatsus, blokeerimine ja staatuse kontrollid säilivad. get_public_profile_media_v1 delegatsioon ning rakenduse kliendikood jäävad samaks. Meedia edukas null-vastus ja tehnilise vea senine fallback on eraldi olukorrad.
- **SQL tõendi piir:** Uued katsetulemused pärinevad eraldatud PostgreSQL 17.6-st. Paigaldaja värske eelseis peab kinnitama tegelikud definitsioonid, õigused, oleku aluse ja omanikuviited. Senise profiililugeja ACL on lähtekoodist taastatud, mitte selles ettevalmistuses uuesti pilvest loetud.
- **Jätku piir:** Otse kutsutavad pakkumiste/otsingu, teiste profiili- ja sõnumikaartide lugejad, kirjutamised ning välise pilditöö lõppkinnitus jäävad järgmisteks osadeks. Varem väljastatud avalikke pildi-URL-e see filter ei tühista. Konto sulgemise/taastamise/kustutamise toiminguid ei avata.

## Tegelik kohalik katse

- 8/8 uut kliendikontrolli läbisid tegeliku TypeScripti lugeja ja meediaparseriga; Reacti serverrenderdus katab tühja, laadimise ja vea vaate eesti/inglise keeles. Transpordivastused olid sünteetilised. Node v24.22.3, TypeScript 5.9.3, React 19.2.4; lähtefailide triivi ei olnud.
- 22/22 eraldatud PostgreSQL 17.6 kontrolli ning 18/18 uue kviitungiparseri kontrolli läbisid. Kontrolliti aktiivset era- ja ettevõttekontot, mõlemat ettevõtte omanikuseose suunda, puuduvat olekut, aliaste kokkupõrget, õigusi, blokeeringut, asukohta ja meediat. Oma klaster lõpetati.
- Lugemine õnnestus ainult lugemise tehingus ka teises ühenduses lukustatud Auth/olekurea korral. Sünteetiline päringuplaan kinnitab kahe täpse võtmeindeksi kasutatavust; see ei ole tootmise koormustest.
- Täielik Next.js 16.4.6 / TypeScripti webpack-build läbis 34.331 sekundiga. 765 koostamissisendi triiv puudus; logi SHA256 73da1cfbe76c03ccc6234c0b60ee80ee0d08181650f2248616a96a02c248e4e9. Kasutati täpseid olemasolevaid sõltuvusi ja inertseid lokaalseid seadeid.
- Uuendaja 24/24 sihitud kontrolli läbisid tegelike ajutiste Git-hoidlate ja kohaliku bare remote’iga; CLI/SQL/build/protsessivaatluse vastused olid kontrollandmed. Järgnenud Commit-rea muudatusel on üks eraldi kontroll ning varasema runtime-vaatluse jätkamiskaitsel seitse eraldi kontrolli. Algset 24 kontrolli ei korratud: täpsed räsiseosed ja sõltumatu ülevaatus on proof/runner ning proof/reviews all. Päris Maci käivitust need ei asenda.
- Päris brauserikontroll ootab sama uue commit’i Ready / Production tulemust. Varasemat Chromiumi socket- ja pilvebrauseri loopback-piirangut ei proovitud uuesti ega eiratud. Reacti serverrenderdust ei nimetata brauseritestiks.

## Production / kasutajaliides

- 4b60782 ja selle Minu konto aktiivne vaade on vastu võetud. Eduka r2 originaalraport ning mõlemad vanad STOP-id säilivad. Uus pakett hoiab viimast edukat originaalraportit ainult lugemiseks lukus.
- Uus avaliku profiili piir on ainult ette valmistatud lähtekood. Selle Maci rakendamine/staging, pilve SQL, commit/push ja uus deployment ei ole veel tehtud ega kinnitatud.
- Uuendaja ei muuda konto- või sisuridu, Storage’i, SMTP/Auth seadistust ega sõltuvusi. Sihitud uued testid ja värske build eelnevad ühele SQL paigaldusele. Selle järel kontrollitakse tulemust ning tehakse täpse paketi commit/push.

## Üks järgmine töö

Paki selqiro-profiili-konto-olek-20261123.zip Downloads-kaustas lahti ja käivita python3 -I -B "$HOME/Downloads/selqiro-profiili-konto-olek-20261123/uuenda.py" --publish. Saada täpselt SAADA SEE FAIL juures näidatud uus raport. Pärast sama uue commit’i Ready / Production tulemust värskenda portaali ning kontrolli olemasoleva eraisiku ja ettevõtte avalikku profiili koos piltidega; Minu konto peab jääma avatavaks.

**Peatumisel:** Säilita kõik olemasolevad failid, indeks, raportid ja päevikud. Uuendaja peatub tundmatu lähtepuu, indeksi, sõltuvuse, originaalraporti, protsessiseisu või SQL eelseisu korral. Ebaselget SQL kirjutust automaatselt ei korrata. Saada näidatud täpne raport või selle puudumisel PEATATUD-rida; vana kontooleku uuendajat/jätkajaid ei käivitata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — selle uue paketi üks käsk ja tegelik kasutuskontroll.
- docs/architecture/account-public-profile-fence-v1.md — uus serveripiir ja katmata teed.
- docs/architecture/account-state-accepted-20261123.md — vastu võetud 4b60782 tõendid.
- supabase/releases/account-public-profile-fence-v1/README.md — täpne SQL ulatus ja kontrollid.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, pakkumisi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata, liideta ega kirjutata ümber. Uus SQL lisab privaatse ainult lugeva abifunktsiooni ja asendab ühe avaliku profiili lugeja; konto- ega sisuridu ei lisata ega muudeta. Sisemised omandi- ja õiguskontrollid säilivad.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro, kinnitatud Taivo17/selqiro remote. Paketi ainus alus on 4b607828d0b153b84166ba963fdb4e77337e11f0. Enne kirjutust kontrollitakse tegelikku main/HEAD-i, kogu aluspuud, tööpuud/indexit ja remote’i.
- Next 16.4.6, Sharp 0.35.5 ning package.json/package-lock.json säilivad. Olemasolev Supabase CLI 2.117.0 ja projekt vyjletlmwoiwxsnsunlm kontrollitakse senise viie faili pin’i järgi; uut paigaldust ega ühendamist ei tehta.
- Uus päevik on ~/Library/Application Support/Selqiro/account-public-profile-20261123/<manifest-sha256> all. Senise account-state-continuation-r2-20261123/19622aaeaf5b1709cc10efaec8bda07e7263bae843962c5bd1f9bb6c10fd3c98/result.json baidid säilivad. Käivitaja eduka käigu raporti, uue commit’i ja pilveseisu tõend tuleb kasutaja Macist.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
