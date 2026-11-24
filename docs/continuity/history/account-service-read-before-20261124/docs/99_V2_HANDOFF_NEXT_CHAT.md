<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 24.11.2026 Europe/Tallinn — 0cb3484 vastu võetud; järgmine moodul on teenuste avalik lugemine

## Praegune checkpoint

Avaliku profiili kuulutuste ja poerubriikide konto kättesaadavuse kontroll on 0cb3484-na vastu võetud. Maci raport kinnitab 17 testi, build’i, ühte kontrollitud SQL rakendamist ja commit/push’i; sama commit’i Ready / Production on eraldi Verceli pildil. Kasutaja kinnitas „testimisel kõik töötab”. Järgmise teenuste lugemismooduli lähtekoodiaudit on valmis; selle teostust ega paigaldajat veel ei ole.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main 0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a; puu 6d213969675d86eea8e2ff56b99f9a232715b3a8; 2202 jälgitavat faili. Täpsed baidid, SHA-256, Git blob ja režiimid on kontrollitud vastuvõtu inventari vastu. See on raportiga seotud lähtekoopia, mitte uus Maci või remote’i vaatlus.
- **Aluse tõend:** selqiro-profiili-kuulutuste-konto-olek-20261124-raport-20261124-135557-9f43f399d25a.json; 1359380 baiti; SHA256 38ceedd0b083d20ca524b96a53ae46713dab6bdf61a390e5e3face223ce9260a. Raport vastab väljastatud paketi manifestile dfcdb83702f876e38b580986f8e241c2df9ef2dcc65be88fb393c1c96824acf9. Originaalraport ja väljastatud ZIP säilivad muutmata.
- **Inventar:** review/runner/accepted-inventory.json; SHA256 06215ad319d5972e56f401423ec53eb1a9fa56560a7398dc3a36312a439ea991. Ainult paketi 32 lähtefaili muutus: 7 olemasolevat ja 25 uut. Rakenduskood ning package.json ja lukufail säilisid.
- **Rakendatud piir:** get_public_profile_marketplace_v1/v2 ja get_public_profile_store_categories_v2 kontrollivad ainsa aktiivse profiili kanoonilise omaniku kontot enne sisu. Eraisikul identities.user_id, ettevõttel business_accounts.owner_user_id. Sama account_lifecycle_private.account_is_available(uuid) on üks kontooleku allikas.
- **Vastuseleping:** Sobimatu konto korral säilib tühi kättesaamatu profiili ümbris; päringuviga jääb veaks. Senised sisu-CTE-d, filtrid, koguarv, järjestus ja leheküljed säilivad. Ühine rubriigilugeja katab marketplace ja services ulatuse. Teenuste eraldi sisulugejate konto kontroll on järgmine töö.
- **SQL tõendi piir:** Raporti kolm parsitud enne/pärast ümbrist seostuvad täpsete CLI väljundi pikkuste ja SHA-256-dega. Taastatud ümbrised vastavad räsidele ning sama paketi parser aktsepteerib neid. See ei ole toorkataloogi eksport ega sõltumatu serveri allkiri. Kolme sihtfunktsiooni ja kuue sõltuvuse eelseis vastas selle jooksu kontrollitud siht- ja BASE-tunnistustele; praegust uut live-seisu siin ei küsitud.
- **Järgmise töö piir:** Üks kavand: teenuste visible_to_viewer(uuid) konto kontroll ning profiiliteenuste v1/v2 varane omaniku kontroll. Viimane on vajalik ka identity_id=null ja profile_available=false ümbrise jaoks. is_public, kontakt, meedia ning otsetabelite õigused on eraldi piirid. Audit ei ole valmis rakendus.
- **Dokumentatsiooni piir:** See vastuvõtukirje, sellest genereeritud üleandmine ja nelja projektdokumendi lisad on eraldi ette valmistatud. Neid ei ole pärast 0cb3484 Maci kirjutatud, commit’itud ega pushitud. Need kaasatakse järgmise sisulise koodimuudatusega; olemasolevat paketti ei muudeta.

## Tegelik kohalik katse

- Vastuvõtul kontrolliti olemasolevat raportit ja lähtebaite; rakenduse teste, build’i, SQL-i, paigaldajat ega teenuste ühendusi ei korratud.
- Maci raporti range TAP-kontroll: 17/17 testi, 0 viga, 0 vahelejäetut; üks edukas Next.js 16.4.6 build. Täielikku TAP- ega build’i teksti raport ei sisalda: alles on parsitud tulemused, väljundi pikkused/räsid ning kontrollitud lähte- ja sõltuvuspinnid. Käsu argv pärineb räsiga seotud runner’i lähtekoodist, mitte eksporditud argv-jäljest.
- Ettevalmistuses olid eraldi vastu võetud 17 kliendijuhtumit, 7 sünteetilise hook-harness’i juhtumit, 12 native SQL-vastuse parserikatset, 58 PostgreSQL-i kontrolli ning 20 runner’i juhtumit. Need ei ole tänased korduskatsed. Hook-harness ei olnud React DOM ega brauser; native-wire unavailable-juhtum oli puuduv slug, sobimatu olemasoleva konto juhtumid olid SQL-katsetes.
- Maci käigus: täpne eelseis → üks kolme funktsiooni tehing → kinnitus pärast COMMIT-i → eraldi verify → ainult paketi commit/push. database_apply_count=1; account_rows_read=false ja account_rows_exported=false. Kontode või sisu ridu ei muudetud.
- Jõudluse ettevalmistus näitas ühte konto kontrolli leitud profiili kohta ja indekseeritud slugi/omaniku/konto otsinguid ka 20 000 kõrvalise kirje lisamisel. Suure profiili 1600 pakkumise v2 mediaan oli 966,67 → 981,87 ms; vana ja uus rubriigiharu lugesid kõiki 20 801 seost (järelvaatluses 20 802). Senine kaartide/finality töö enne lehekülge ja lai rubriigiseoste lugemine vajavad eraldi optimeerimist. Miljonite kasutajate koormust ega samaaegsust ei ole tõendatud.

## Production / kasutajaliides

- 0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a on Verceli saadetud pildil Ready / Production, main; koostamisaeg 26 s. Raporti algne vercel=READY_NOT_CHECKED säilib, selle täiendav tõend on pilt.
- Kasutaja kinnitas pärast ettenähtud olemasoleva sisu kasutuskontrolli „testimisel kõik töötab”. See on kasutaja kinnitus; käesolevas sõnumis ei ole iga eraldi kliki võrgujälge. Uut brauserikatset siin ei tehtud.
- Varasemad ac5521a hobuste, 87bff3f tavakuulutuste, 8dc0b3b profiili ja 4b60782 Minu konto etapid säilivad vastu võetuna. Lõpetatud pakette ja teste ei korrata.

## Üks järgmine töö

Valmista 0cb3484 täpselt aluselt üks teenuste avaliku lugemise moodul vastavalt docs/architecture/account-service-read-next-20261124.md-le: lisa konto kättesaadavus visible_to_viewer(uuid) kanoonilise omaniku kontrolli ning profiiliteenuste v1/v2 varasesse profiiliomaniku kontrolli. Kontrolli sihitult vastuselepinguid, tegelikke päringuplaane ja helperi kutsete arvu koos kandidaatteenuste kasvuga, seejärel build ning eraldi uus kaitstud pakett. Praegune vastuvõtt ei vaja kasutajalt uut käsku ega kordustesti.

**Peatumisel:** Enne järgmist Maci kirjutust kontrolli värskelt tegelikku haru, HEAD-i, tööpuud/indexit, allikaid, kinnitatud remote’i, originaalraportit ja täpset SQL eelseisu. Tundmatu seis peatab kirjutuse; säilita kontod, sisu, paketid, raportid ja päevikud. Vana lõpetatud uuendajat ei korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — vastuvõtu seis; uut käivituskäsku ei ole.
- docs/architecture/account-profile-marketplace-read-accepted-20261124.md — raporti, andmebaasi, lähtepuu, deployment’i ja kasutuskontrolli eristus.
- docs/architecture/account-service-read-next-20261124.md — üks järgmine teenuste lugemismoodul ning jõudluse ja õiguste piirid.
- docs/architecture/account-profile-marketplace-read-fence-v1.md — nüüd rakendatud kolme lugeja leping.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, kuulutusi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Konto active-only alus säilib. Sulgemine, taastamine ja lõppkustutamine pole aktiveeritud; enne neid vajavad tervikut ülejäänud lugemised, otseõigused, kirjutused, sõnumid ning meedia.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; https://github.com/Taivo17/selqiro.git. Alus 0cb3484675ac9267a0f9d7f52f6e3dbff5074d1a; puu 6d213969675d86eea8e2ff56b99f9a232715b3a8; 2202 faili. Viimane raportiga kinnitatud remote’i võrdsus: 24.11.2026 kell 13:55:56.980 Europe/Tallinn. See pole praegune uus Git-kontroll.
- Next 16.4.6, Sharp 0.35.5 ja Supabase CLI 2.117.0 pinnid on viimases raportis säilinud. Projekt vyjletlmwoiwxsnsunlm. Sõltuvuste paigaldust, SMTP/Auth seadistust, Storage’i toiminguid ega konto sulgemist/kustutamist ei tehtud.
- Viimase eduka käigu päevik: ~/Library/Application Support/Selqiro/account-profile-marketplace-read-20261124/dfcdb83702f876e38b580986f8e241c2df9ef2dcc65be88fb393c1c96824acf9/result.json. Raporti ekspordikoopia on Downloads-kaustas eespool nimetatud täpse nimega. Kõik varasemad originaalraportid ja päevikud säilivad.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
