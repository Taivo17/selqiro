<!-- SELQIRO_EXISTING_PORTAL_SELECTED_20261026 -->
## 26.10.2026 — Jätkame olemasolevas päris portaalis

Taivo valis olemasoleva Selqiro portaali ja Supabase’i baasi. Eraldi testbaasi ei
tehta. Jooksev juhis on `docs/continuity/HOSTED_PORTAL.md`; konkreetne siht ja
paigalduse UUID on `scripts/hosted/portal-target.json`. Koodis on Production’i
selge opt-in ning avalikud pildid säilivad ka avaldamise pausi ajal. 8 sihitud
juhtu ja Turbopack/TypeScript production-build läbisid. Muutmata SQL-i ning
varasemaid kohalikke/native kontrolle ei korratud.

Kaks valmis Maci käsku teevad eraldi lähtekoodi tööpuu ja olemasoleva DB/Storage’i
ettevalmistuse. Maci käivitamine, commit/push ja uus Verceli deployment on veel
tegemata. Järgmine tulemus on üks päris pildiga kuulutus portaali veebis.
`CURRENT_STATE.json` säilitab täpse vahe ettevalmistuse ja tegeliku rakendamise
vahel. Allpool on varasem ajalugu; lahtine sihivalik on selle otsusega lõpetatud.

---

<!-- SELQIRO_HOSTED_RELEASE_CONNECTED_PREPARED_20261026 -->
## 26.10.2026 — Veebieelvaate terviklik ühendus on lähtekoodis valmis

Praegune tööjärg on `docs/continuity/CURRENT_STATE.json`; praktiline käivitamisjuhis
on `docs/continuity/HOSTED_PREVIEW.md`. Valmis on lisav hosted SQL-release,
managed Storage adapter ning päris Authi ja DB-valmisoleku järgi avanev UI/API.
14 sihitud Node-juhtu, Turbopack-build ja eraldatud PG17.6 avaldamise/hinnamuutmise
SQL-käik läbisid. SQL-käik kasutas nulli pilti; managed Storage HTTP ning päris
Verceli kasutuskäik on veel tegemata. Täpsed tõendi piirid on arhitektuuridokis.

Maci/GitHubi/Vercelisse pole seda muudatust veel üle kantud. Järgmine samm on
konkreetne Supabase eelvaatesiht ja siis üks terviklik veebis avaldamine. Sama
production-baasi kasutav Verceli Preview jagab avalikke kuulutusi; sihivalik ei
ole vaikimisi tehtud. Hosted lõppkoristus jääb ootele ja reserve ei vabastata.
Senised kontod, kohalik töötav keskkond ning kandidaadimuudatused säilivad.
Allpool on ajalugu; lõpetatud metadata kogumist ega vanu NEXT-käske ei korrata.

---

<!-- SELQIRO_HOSTED_METADATA_ACCEPTED_CONFIG_PREPARED_20261026 -->
# Praegune kohalik ja veebikeskkonna seis — 26.10.2026

26.10 kell 20:54:25–20:54:31 Europe/Tallinn lõpetas kasutaja Macis olemasoleva
ühendusega metadata lugemine edukalt. Tulemuse
`existing-web-context-20261026T185425Z-d8603a594704.zip` SHA-256 on
`354afb4e75c0af5239b2af2748cadc6b956c7197b05506bf0e70115ecef50af6`.
CLI 2.117.0 viie faili pin, kogumisskript, päring ja token vastavad ettevalmistusele;
tehing oli READ ONLY. See lugemine on lõpetatud ega vaja kordamist.

Maci peapuu on puhas `main` / `e95fa9ce1d41b9b4c6e4884b6076f414173a946d`.
V2 kandidaat on samal HEAD-il harul `work/v2-integratsioon-20261018`: 85 kirjet,
47 unstaged, 38 untracked, 0 staged ja 0 konflikti. Kandidaadi muudatused säilivad.
Supabase `vyjletlmwoiwxsnsunlm` / Selqiro on `eu-central-1`, `ACTIVE_HEALTHY`,
PostgreSQL 17.6; kõik 23 production-migratsiooni versiooni vastavad lähtele.
`listing_publication_private`, uus price-core ja nende avaldamis-/lugemis-RPC-d
on veel hosted-keskkonda ühendamata. Metadata ei lugenud konto-, tingimuse- ega
kuulutuseridu ega kinnita nende jooksvaid väärtusi.

Valmis on assistendi lähtekoopia eraldi hosted-preview konfiguratsioon,
serveri/SOURCE S3 credential factory ning kliendi valikuline sama projekti
Storage-origin. App-origin tuletatakse Verceli enda deployment-hostist;
valikuline eraldi väärtus peab täpselt vastama. Kohalikud piirangud, API-route'id,
globaalne UI-lüliti, auth-klient, native-pilditöötleja ja skeem jäid samaks.
Kood ei ole veel Macis, GitHubis ega Vercelis.

8 nimetatud sihitud kontrolli läbisid (5 hosted config/S3 ja 3 kliendi Storage-origin), 0 fail/skip; käivitati name-patterniga ainult need uued juhtumid. Vaikimisi Next 16.2.1 Turbopack-build läbis exit 0, 15,308 s; kasutati sünteetilisi build-väärtusi ilma integratsioonilipu/backendita. Kahe esmase käigu failitaseme koondreport ei olnud 8 juhtumi tõend ning säilib diagnostikana; aktsepteeritud lõppreport sisaldab kõiki 8 nimetatud PASS-i. See ei tõenda Maci või tegeliku hosted-keskkonna käitust.
Tõendid on selle jätkupaketi BUILD.json ja TARGETED_TESTS.json; kontrolli ei korrata.

Järgmine töö on lisav hosted release/skeem ja managed S3 adapter koos tegeliku
operation-authority lepinguga, seejärel sama tavakuulutuse veebieelvaade.
Piiratud suletud piloot võib hoida koristuse ootel ning reservi kinni pärast
korrektset Complete/readback'i; see ei tähenda täieliku lõppkoristuse valmisolekut.
Kohalik kasutaja kinnitatud piltidega avaldamine jääb aluseks. Jätkame samas
vestluses olemasoleva Mac → GitHub → Vercel tööviisiga. Uut ühenduste seadistusringi,
metadata-kogumise kordust ega eraldi installeri/testimise etappi see juhis ei lisa.

Täpne arhitektuur: `docs/architecture/hosted-publication-preview-v1.md`.
Jooksev seis: `docs/continuity/CURRENT_STATE.json` ja `SERVICE_ACCESS.json`.
Allpool olevad varasemad NEXT-juhised säilivad ajaloona.

---

<!-- SELQIRO_LOCAL_PUBLICATION_ACCEPTED_SERVICE_CONTINUITY_20261026 -->
# Praegune kohalik seis — 26.10.2026

**Kuulutuse lisamine töötab kasutaja Macis.** Kell 19:12–19:13 kinnitas Taivo
kuulutust „bmw”, hinda 5257 €, aktiivset olekut, kolme pilti ja toimivat galeriid
aadressidel /v2/my-area ning /v2/listing/1. HMR-i laadimistõrge on lahendatud.
Allpool säilitatud varasem „HMR-parandus rakendamata” tekst on ajalooline;
selle põhjal ei korrata paigaldust ega sama kasutuskäiku.

Järgmine next.config.ts muudatus kaasab veebipaketti native-pilditöötleja ja Sharpi.
Selle vaikimisi Turbopack-build ja eraldatud pakendi PNG→WebP töötlus läbisid, kuid
see uus konfiguratsioon pole veel Maci, GitHubi või Vercelisse üle kantud.
Selle pakendamisparanduse tõttu ei ole uut kohalikku paigaldajat vaja.

20:27 Verceli kuvatõmmis näitab selqiro e95fa9c / main / Ready 41s / Production
versiooni kuupäevaga Oct 17. See kinnitab nähtavat varasemat juurutust. Uut Maci
HEAD-i või allikakaarti sellest ei tuletata; viimane eraldi terminali READY oli 17:16.

Jätkame samas vestluses ja sama senise Maci tööviisiga. Peapuu on
/Users/taivo/selqiro, kohalik V2 kandidaat /Users/taivo/selqiro-v2-integratsioon-20261018.
GitHub, olemasolev pinnitud Supabase CLI ja Vercel on senise töö osad;
ChatGPT pluginad ei ole jätkamise eelduseks. Teenuste avalikud andmed ja CLI pin
on SERVICE_ACCESS.json-is. Välise paketi next-action/selqiro-read-existing-web-context.py
ja read-only-inventory.sql on ette valmistatud; kasutaja Macis on käik tegemata.
Portaali, andmeid ja kontosid selleks ei lähtestata.

Praegune tööjärg: CURRENT_STATE.json ja genereeritud docs/99_V2_HANDOFF_NEXT_CHAT.md.

---

## Varasem kohalik juhend ja tõendite ajalugu

# Selqiro kohalik arenduskeskkond

Portaal avaneb aadressil **http://127.0.0.1:63110/v2**. PostgreSQL, Auth, PostgREST ja Storage töötavad samas püsivas arenduskeskkonnas; kontod, kuulutused ja pildid säilivad peatamise ning järgmise käivitamise vahel.

26.10.2026 algpaigaldus on kasutaja Macis tehtud. Kell 13:33 kuvatõmmisel on `READY` ja 807 faili lähtekaart `42d59706a9c14939e0bbc3be02189f5e94a00be6bbba6d8e54e1a29490f59d45`. Algset `update_and_start.py` käsku praeguse paranduse rakendamiseks ei korrata.

## Kuulutusvormi juba paigaldatud parandus

Pakett `selqiro-kuulutuse-lisamine-20261026.zip` parandab sisselogimise ja avaldamise laadimist, käsitsi taastumist ning vormi lukustamist kinnitamise ajal. Selle `apply_and_restart.py` käsk on Macis lõpetatud: 26.10 kell 17:16 kuvatõmmisel on `READY` ning lähtekaart `dc5e110801bf1b9b84ed832169d63461dd57c9864f53c0d90d037c2fdccb3fdc`. Seda lõpetatud paigaldust uue paranduse asemel ei korrata.

Sama keskkonna tunnused säilisid: `instance` on `73f1550a-3768-4cf5-a0e3-a97bdd5d8b33` ja `run_id` on `6215d1f0-e172-4988-a560-b8ca44c2552f`. Uue käivituse `generation` on `d84b8f0a-60a6-4293-a88b-b9c5a8f61430`.

Pildil nimetatud raport on `/Users/taivo/Downloads/selqiro-recovery/publication-update-8f8b6b1d-d242-458a-b6f4-e388a9051b9d/report.json`. Praegune tõend on kuvatõmmis; raporti JSON-i ennast ei ole eraldi loetud. See kinnitab käivitust ja lähtekaarti, mitte vormi terviklikku töötamist.

Õige kuulutusevorm on **http://127.0.0.1:63110/v2/sell**. Assistendi vahepealses vastuses antud `/sell` oli ekslik link vanale vormile. `localhost:3000` viib teise käivitusse.

Kohalike müüja- ja ostjakontode sisselogimisandmed on sinu arvutis:

`/Users/taivo/Library/Application Support/Selqiro/v2-development/accounts.txt`

## Praegune HMR-ühenduse parandus

26.10 kell 18:24 ja 18:25 näitavad õige `/v2/sell` lehe konsoolipildid korduvat viga `ERR_INVALID_HTTP_RESPONSE` ühenduse `ws://127.0.0.1:63110/_next/webpack-hmr` loomisel. Leht näitab uut teksti „Kontrollin sisselogimist…”, kuid vorm ei ole avanenud.

Allikast leitud vastuolu: konteineri Next 16.2.1 käivitatakse hostiga `0.0.0.0`, kuid brauser kasutab `127.0.0.1`. Nexti arenduse päritolukontrolli vaikeloendis seda viimast hosti pole. HMR-ühenduse blokeerimine kirjutab selles Nexti versioonis toorsoklisse `Unauthorized` ilma HTTP olekureata; see sobib nähtava brauseriveaga.

Praeguse paranduse ainus rakenduse konfiguratsioonimuudatus on `next.config.ts` seadistus `allowedDevOrigins: ["127.0.0.1"]`. Konteineri kuulamisaadress, runtime, sõltuvused, andmebaas ja kõik 23 production-migratsiooni jäävad samaks. Kõigi päritolude lubamist ega kontrolli eemaldamist ei kasutata.

Piiratud päriskontroll reprodutseeris vea: Next 16.2.1 kuulas hostil `0.0.0.0`, Chromium 156 avas `http://127.0.0.1:3107/v2/sell`. Enne parandust vastas WebSocketi handshake paljaste `Unauthorized` baitidega, brauseris tekkis kaheksa `ERR_INVALID_HTTP_RESPONSE` viga ning pärast 20-sekundilist ootust püsis laadimisvaade; HMR-sõnumeid oli 0. Ainult konfiguratsiooniparanduse järel vastas handshake `HTTP 101`, saadi neli HMR-sõnumit ning WebSocketi- ja JavaScripti vigu oli 0. „Logi kõigepealt sisse” koos nupuga ilmus 3,723 sekundiga; aeg sisaldab marsruudi kompileerimist. Võõras päritolu jäi blokeerituks.

Tulemus ja piirid on üleandmispaketi failis `evidence/current/HMR_CHECK.json` koos `before.json` ja `after.json` tulemustega. Kontroll kasutas värsket brauserikonteksti ja sünteetilist avalikku anon-võtit. Backend oli peatatud; andmebaasi, Storage’i ega kontode kirjutusi ei tehtud. Next peatati tavaliselt Ctrl+C abil, exit 0. Maci Chrome 151 ja Docker Desktopi porti 63110 ei kontrollitud otse. Täielikku avaldamist, SQL-kontrolle ega build’i ei korratud.

Uut parandust ei ole kasutaja Macis veel rakendatud. Selle täpne paigalduskäsk tuleb uue paketi `ALUSTA_SIIT.md` juhendist; lähtebaas on eelnevas osas kinnitatud `dc5e1108` versioon.

## Igapäevane töö

```bash
cd /Users/taivo/selqiro-v2-integratsioon-20261018
python3 -I -B scripts/dev/dev.py start --source .
```

Pärast lähtekoodi muutmist kopeerib `restart` uue versiooni samasse konteinerisse:

```bash
python3 -I -B scripts/dev/dev.py restart --source .
```

Seisu vaatamine, peatamine ja käivituse teadete lugemine:

```bash
python3 -I -B scripts/dev/dev.py status
python3 -I -B scripts/dev/dev.py stop
python3 -I -B scripts/dev/dev.py logs
```

`start` näitab juba töötava portaali olemasolevat seisu. Lähtekoodi muudatuse laadimiseks kasuta `restart`. Käivituskoodi ja sõltuvuste muutus vajab eraldi üle vaadatud uuendust; selles paketis need ei muutu. `logs` näitab supervisori käivitusteateid; Nexti eraldi `next.log` ei ilmu automaatselt sellesse väljundisse.

## Praegune kasutajatee

Tavakuulutuse lisamine, piltide üleslaadimine, avaldamine, avalik vaade ning omaniku muutmisvaade on kohalikus keskkonnas ühendatud. Omanik saab muuta pealkirja, kirjeldust, seisukorda ja hinda. Avaldatud pildi asendamine ja hobusepakkumise avaldamine jäävad edasisse töösse.

Pärast brauserikoodi käivitumist on sisselogimise, identiteedi ja tingimuste kontrolli ootel 15-sekundiline ajapiir. Enne hüdratsiooni see ajapiir ei käivitu. Tõrke korral saad proovida uuesti. Tingimuste või identiteedi uuesti laadimine hoiab sama avatud vormi teksti ja valitud pilte. Lehe sulgemist või värskendamist ei esitata täitmata vormi automaatse mustandisalvestusena.

Kinnitamise ajal ei saa vormi või pilte muuta. Kui tingimused on vahepeal muutunud, tuleb need uuesti üle vaadata. Kadunud nõustumisvastuse korral loetakse tegelik seis ning oodatakse sinu uut tegevust; kuulutust automaatselt ei avaldata.

## Tõend ja järgmine etapp

Eelmine kuulutuseparandus kontrolliti päris Nexti ja Chromiumiga säilitatud Linuxi arenduskeskkonnas: ajutisest lugemisveast taastumine, sisestuse ja pildi säilimine, värskete tingimuste ülevaatamine ning üks päris pildiga avaldamine. Uus kuulutus avanes ka sisselogimata vaatajale. Assistendi koostatud varasem native-kontroll käivitas Nexti hostiga `127.0.0.1`, kuid Maci konteiner kasutas hosti `0.0.0.0`. See assistendi seadistuserinevus jättis HMR-vea varasemas kontrollis märkamata. Praegune kitsas kontroll kasutas mõlemat tegelikku erinevat hosti. Vanu avaldamis- ega SQL-kontrolle praeguse konfiguratsiooniparanduse jaoks ei korratud.

Järgmine samm on kontrollitud HMR-paranduse Macis rakendamine. Seejärel jätkub sama tavakuulutuse ühendamine eraldi veebieelvaatega. Kasutajaliides ja hosted avaldamine ei ole lõplikult valmis. Veebieelvaateks tuleb ühendada eraldi backend, pilditöötlus ja hoidla koristuse käivitus. Tavaline stop/start ei tõenda algfailide terminalkoristust ega vabasta selle alusel reserve. Ootel koristusseisu säilitatakse ausalt.

Kui uuendus peatub, säilita terminali lõppteade ja seal nimetatud raport. Osalist lähteuuendust ei lähtestata ega kirjutata automaatselt üle. Andmebaasi ja pildihoidla faile uuenduskäsk ei kustuta.
