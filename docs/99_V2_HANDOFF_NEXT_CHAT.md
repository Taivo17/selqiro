<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 14.11.2026 Europe/Tallinn — 29b2457 klient avaldatud; SQL-i auth-õiguste põhjus kinnitatud; eraldi parandus kohalikult kontrollitud ja Macis rakendamata

## Praegune checkpoint

Blokeeringu täpse eemaldamise klient on Macis builditud ning commit/push 29b2457893d6fa9bab2756533319fdc13b841840 ja sama commit’i Ready / Production on kinnitatud. Uuendaja luges 14.11 kell 16:12:12 ja 16:12:20 avalikult täpset kliendimärki. Üks serveri sulgemise SQL-katse peatus: auth/uid õiguste andmine ei lisandunud ja paigalduse järelkontroll katkestas tehingu. 16:12:33 sõltumatu kontroll nägi algset absent-seisu, kõiki üheksat kaitset ja muutmata invariande. Vana katset ei korrata. Eraldi selqiro-blokeeringu-parandus-20261114 muudab ainult uut SQL-allikat ja seotud dokumente; selle rakendamine ja commit/push on veel kinnitamata.

## Lähtekood ja tõendi piir

- **Tegelik kinnitatud lähtealus:** /Users/taivo/selqiro, main, 29b2457893d6fa9bab2756533319fdc13b841840; parent 371f4f4cc1ff62ecadb14d19bf5c8004cff256ea. Täpne 1737-failine Git-puu 9d693408dcedda48a704693b4ce7aa188c7b15ba tuletati varasema 1701-failise aluse ja 60 kontrollitud payloadi kaudu. Maci raporti index/preimage’id ja sama väljaande kontrollvoog seovad selle avaldatud commit’iga. Uut live-Maci/GitHubi lugemist siit ei tehtud.
- **Maci viimane raport:** selqiro-blokeeringu-kontroll-20261113-raport-20261114-161233-d656c288cb17.json, 283347 B, SHA256 098ab6ba0a1b040a2c8774453500a020dd8aff700a479433f7a281bd08466704. Stage stopped_preserved, STOP DATABASE_OUTCOME_NOT_VERIFIED; build passed, push verified, database unconfirmed, Storage not_performed. Kõik 15 eelmise raporti käsukirjet ja 12 markerivaatlust säilivad täpsete prefix’itena; praegu 23 käsku ja 14 vaatlust.
- **SQL-i tegelik tulemus:** 14:12:20.211–14:12:27.208 UTC ehk 16:12:20–16:12:27 Tallinn: üks apply, exit 1, 6.997 s, stdout 274 B, stderr 27 B; 180 s piir ei täitunud. 16:12:33 eraldi verify andis täpselt algse absent-seisu: üheksa kaitset true, samad dependency/capability ning kolm invarianti. See on paigalduse kontrollitud skeemi/õiguste piir, mitte kõigi kasutajaandmete inventuur.
- **Kinnitatud serveritõend:** supabase_logs (1).json: 75037 B, 24 kirjet, SHA256 a26e30134fbbce26bfd6d5aa61fdef8bcaa6fb9ef1e1153d15aa9801ea40f934. 14:12:26.699 UTC kaks 01007 hoiatust auth ja uid kohta; 14:12:26.771 UTC 55000 BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED. Logi SQL-i 63729-baidine prefiks vastab täpselt väljastatud apply.sql räsile be9875629c007fa0407ecca4452beccab601bff2b8e588f9588a5bad412ed4cc; lisatud on ainult teenuse allika/aja kommentaarid.
- **Eraldi paranduse ulatus:** Uus supabase/repairs/20261114_block_removal_auth kasutab olemasoleva auth.uid() jaoks väikest nullargumendiga privaatset postgres-omanikuga funktsiooni; EXECUTE on ainult kitsal CAS-kirjutajal ja omanikul. RLS, helper ja trigger kasutavad sama silda. Auth ACL-i ja require_actor’i õigusi ei muudeta ning püsivat SET/INHERIT-õigust ei laiendata; JWT-parsimist ei dubleerita. Kogu 20261113 SQL ja vana väljaanne/päevik säilivad. Veebirakenduse runtime-lähtefaile ja kasutajaandmeid ei muudeta. Täpne delta on 33 teed: 23 uut SQL-alamkataloogi faili ja 10 dokumenti; 5 asendust ja 28 lisandust, 1732 muutmata alusfaili kaitset, 1765-failine kandidaat.
- **Uue runneri järjekord:** Vana ebaõnnestunud täpne päevik hoitud ainult lugemiseks lukus; värske Git/index/lähte/remote kontroll; DB absent samade invariantidega; olemasoleva 29b2457 kliendimärk; piiratud SQL-i ja dokumentide rakendamine tööpuusse; värske DB/lähte/märgi kontroll; üks uus kaitstud apply-intent ja katse; sõltumatu verify; täpne Git-staging ja commit/push. Kui sama uue jooksu SQL on rakendunud, aga commit katkeb, lubatakse ainult kontrolli ja lõpetamist, mitte uut SQL-katset.
- **Säilinud ajalugu:** Kolm 29b2457 continuity-dokumenti säilivad bait-baidilt docs/continuity/history/block-removal-stopped-20261114/ all koos preservation.json-iga. Kogu varasem dev-log ja arhitektuur säilivad prefiksina. Varasemate pakettide, raportite, logifaili ja päevikute baite ei muudeta.

## Tegelik kohalik katse

- 29b2457 kliendi varasemad 10 sihtkatset, 5 ReactDOM-juhtu, TypeScript ning build jäävad varasemateks tõenditeks; praegune SQL/docs parandus neid ei korda. Maci build passed on eraldi tegeliku 15:50 raporti tulemus.
- Uue auth-paranduse kohalik PGlite PostgreSQL/WASM kontroll: 13 runtime-juhtu ja 7 paigaldusjuhtu koos 11 õiguste/kataloogi rikkumiskatsega PASS. Piiratud postgres saab auth.uid()-t kasutada, kuid ei saa selle ega Auth-skeemi õigusi edasi anda. Auth owner/ACL/definitsioon, kontrollitud kasutajaandmed ja kolm enne/pärast invarianti säilisid; tõendite sisendräside erinevusi ei olnud.
- Täpselt vana be987562… apply.sql taasesitus samal piiratud sünteetilisel alusel andis mõlemad 01007 hoiatused, 55000 BLOCK_REMOVAL_INSTALLED_STATE_NOT_VERIFIED ning täieliku rollback’i algsesse absent-seisu. See kinnitab serverilogist leitud põhjust. Varem läbitud fixture ei katnud seda õiguse edasiandmise piiri.
- Runneri 24 sihitud andmebaasi-, diagnostika- ja protsessijuhtu PASS. Väljastatud pakendi lõplik manifesti/lähte/loaderi/Giti/päeviku seos ja integratsioonitulemus on kontrollid/loplik-kontroll.json-is. SQL-i täpsed tõendid on uue SQL-alamkataloogi runtime-result.json, installation-result.json, original-failure-reproduction.json ning evidence-summary.json.
- Need on kohalikud sünteetilised kontrollid. Päris Supabase’i rakendamist, native PostgreSQL-i paralleelseansside katset ega paranduse Maci commit/push’i ei väideta. Need vajavad uue jooksu raportit; pärast seda jääb üks hilinenud eemaldamiskinnituse kasutuskatse.

## Production / kasutajaliides

- 371f4f4 ja 29b2457 Ready / Production kuvatõmmised on vastu võetud commit’iga seotud visuaalse tõendina. 29b2457 avalik kliendimärk vastas täpsetele baitidele kaks korda 14.11 kell 16:12. See ei ole Verceli API või täieliku deployment-ID lugemine.
- Uus klient on avaldatud; vana eemaldamisõiguse serveripoolne sulgemine ei olnud 16:12:33 kontrollis rakendatud. Vana SQL-tehingu täpne lõppkaitse katkestas sobimatu õigusseisu. Vana journal’i unknown/unconfirmed märgist ei kirjutata tagantjärele ümber.
- Peitmine / Näita uuesti ning varem avatud telefonivestluse kahepoolne blokeerimine ja taastumine on kasutaja poolt vastu võetud. Need katsed säilivad; 24 tunni tegelikku möödumist ega vana mööduva lugemistõrke algpõhjust neist ei järeldata.
- SQL/docs paranduse pärast ei nõuta uut kliendi build’i ega uut Verceli Ready kinnitust. Sama olemasoleva runtime’i täpne avalik märk kontrollitakse siiski värskelt enne andmebaasi kirjutust. Hilinenud vana eemaldamiskinnituse kitsas brauserikatse ootab edukalt lõpetatud paranduse raportit.

## Üks järgmine töö

Paki selqiro-blokeeringu-parandus-20261114.zip Downloads-kausta lahti ja käivita: python3 -I -B "$HOME/Downloads/selqiro-blokeeringu-parandus-20261114/uuenda.py" --publish. Saada selle jooksu täpne SAADA SEE FAIL raport. See on eraldi üle vaadatud SQL/docs parandus; vana selqiro-blokeeringu-kontroll-20261113 käsku ega SQL-katset ei korrata. Pärast paranduse täieliku raporti vastuvõttu kontrolli ainult vana avatud eemaldamiskinnitust sama konto kahes vahelehes.

**Peatumisel:** Enne Maci kirjutusi kontrollitakse tegelikku 29b2457 HEAD-i, kogu indexit/tööpuud/lähteallikat, kinnitatud remote’i ja täpset vana ebaõnnestunud päevikut. Muutunud allikas, remote, päevik, kataloog või ebaselge protsessi/SQL tulemus peatab töö. Ühtki intent’i, päevikut ega raportit ei nullita ega kustutata. Uue katse tundmatut või absent-tulemust automaatselt ei korrata; vana katse puuduv apply-edu ei anna vana käsu kordusluba. STOP korral saada täpne raport või selle puudumisel PEATATUD-rida.

## Loe ainult vajalikku

- docs/99_V2_HANDOFF_NEXT_CHAT.md — sellest seisukirjest genereeritud praegune üleandmine.
- docs/continuity/HOSTED_PORTAL.md — ainult uue paranduse käsk ja raporti saatmine.
- docs/continuity/BLOCK_REMOVAL_AUTH_REPAIR_20261114.md — serverilogi, katkestuse ning uue õigusteparanduse tõendipiir.
- supabase/repairs/20261114_block_removal_auth/README.md ja docs/architecture/provider-controls-v1.md — parandatud kitsas serverileping.
- docs/continuity/SERVICE_ACCESS.json — varasem kuupäevastatud teenuse/CLI leping, mitte praegune Git/DB seis; docs/03_AI_RULES.md ja docs/00_PROJECT_DNA.md.

## Säilivad piirid

- Üks olemasolev portaal, hoidla, Supabase’i projekt ja keele-eelistus. English põhikeel/fallback, Eesti teine keel. Kasutaja sisu/rubriiginimesid ei tõlgita. Tavaline osalemine, rubriigid ja pikendamine ei sõltu Energy ostust.
- 24 tunni peitmine on konto ühe pakkuja identiteedi avastuseelistus, püsiv blokk eraldi kontodevaheline kirje. Ühine menüü on avalikul profiilil; vestluse blokeerimine ja Minu ala haldus säilivad. Vaatamiskoguse väravat/jälgimist ei lisata. Ühe eelistuse eemaldamine ei eemalda teist ega vastaspoole blokki.
- Teenuse aegumine säilitab sisu ja rubriigiseosed omanikule. Peatatud teenuse pikendus ei avalda seda. Teksti/foto/rubriigi/staatuse muutus ei pikenda ega anna kunstlikku uut otsingukohta. Tundmatu pikendus vajab lugemist.
- Avalikud rubriigifiltrid arvestavad nähtavat sisu ja esivanemaid enne lehekülge. Omaniku valija näitab kõiki rubriike; rubriigi eemaldamine säilitab sisu ja fotod. 80 teenust pole konto piir.
- Avaliku foto-URL-i ligipääsu ei muuda pelgalt kuulutuse aegumine privaatseks. Hosted fotode taustakoristus ja tehniliste paneelide eemaldamine on avamiseelne töö. Sellel updateril pole Storage’i toiminguid.
- Töökuulutuse kinnitatud algsuund on ettevõtte avalik profiil/otseviide, üks kuu kehtivust ja selge nähtavusteade; üldise tööotsingu sulgemine vajab serverikontrolli. Üks kuu pole fikseeritud 30 päeva. Töökuulutuste koodi selles sammus pole.
- Universaalne identiteedi üleandmine/privilegeeritud kirjutaja invariant ja vana aktiivse identiteedi seadistaja turvapiir jäävad eraldi. Energy, maksete tuum ja piiratud AI abi säilivad V2 ulatuses. Kontosid, kuulutusi, pilte, sõnumeid ega ajalugu ei kustutata.

## Keskkond

- Olemasolev https://github.com/Taivo17/selqiro.git, https://selqiro.vercel.app ja /Users/taivo/selqiro. Praegune lähtetõend on 29b2457893d6fa9bab2756533319fdc13b841840, 1737 faili; tulevased kirjutused vajavad uut tegelikku kontrolli.
- Supabase vyjletlmwoiwxsnsunlm, instance 2d088814-0900-448a-a9d1-7b05470cb1d2 ja senine hosted-preview kontekst säilivad. Pinitud CLI 2.117.0 viis faili on muutmata; login/link/install/upgrade ega uus projekt pole osa parandusest.
- Vana kirjutuskatse säilib block-removal-20261113/a80ddb6c7cc66b148cff754078316e1ac5fed543cfe91cae34d1d3ef9b4fe0f5/result.json all. Uus väljaanne kasutab eraldi päevikut ja hoiab vana baidid lugemisluku all. Raport on unikaalne privaatne Downloads-koopia, mille täpne tee kuvatakse ja valitakse Finderis.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
