<!-- GENERATED from docs/continuity/CURRENT_STATE.json; do not edit independently. -->
# Selqiro — praegune tööüleandmine

Seisukirje: 24.11.2026 Europe/Tallinn — a9d86e6 vastu võetud; järgmine moodul on tööpakkumiste avalik lugemine

## Praegune checkpoint

Teenuste avaliku lugemise konto kättesaadavuse kontroll on a9d86e6-na vastu võetud. Maci raport kinnitab 15 testi, build’i, ühte kontrollitud SQL rakendamist ja commit/push’i. Sama commit’i Ready / Production on Verceli pildil ning kasutaja kinnitas „Testides kõik töötab”. Järgmise tööpakkumiste lugemismooduli lähtekoodiaudit on valmis; selle teostust ega uut paigaldajat veel ei ole.

## Lähtekood ja tõendi piir

- **Vastu võetud alus:** main a9d86e63ab667545598da8e40ee2a2d0c7365df3; puu e5e7d7d2253c7c89ff09bbd84d3e501674c2de90; 2227 jälgitavat faili. Täpsed lähtebaidid, SHA-256, Git blob ja režiimid vastavad kontrollitud inventarile. Eraldatud lähtekoopia on seotud saadetud raportiga; uut Maci või remote’i vaatlust siin ei tehtud.
- **Aluse tõend:** selqiro-teenuste-konto-olek-20261124-raport-20261124-152403-bb0a636ba4be.json; 1362856 baiti; SHA256 3a84650999eaadaee99c280fd17ea029402b8e4542092bfa911a5db90dc8fad2. Raport vastab väljastatud manifestile 72a6f6df04784348f1c91f8741df7dc5c9350bc1cf2dbd5fb7e58b35d2e22998. Originaalraport ning väljastatud ZIP säilivad muutmata.
- **Inventar:** review/runner/accepted-inventory.json; SHA256 ceda65370c3771fee8217d254f6d93d0e89602dd56ae4f2cab9177ac236abc83. Ainult 32 paketi faili: 7 muudetud ja 25 uut; rakenduse senine kliendikood ja sõltuvused säilisid.
- **Rakendatud piir:** service_publication_private.visible_to_viewer(uuid) ning get_public_profile_services_v1/v2 kasutavad sama account_lifecycle_private.account_is_available(uuid) allikat. Eraisiku omanik on identities.user_id; ettevõttel business_accounts.owner_user_id. Profiili autor või liige ei asenda kanoonilist omanikku.
- **Vastuseleping:** Teenuse üksikvaate null, otsingu kitsendatud koguarv/lehekülg ning profiili profile_available=false/null-identiteet/tühjad tulemused säilivad. Sisendi-, päringu- ja parserivead jäävad vigadeks. Senised finality, aegumine, filtrid, järjestus, rubriigid ja kahepoolne blokeerimine säilivad.
- **SQL tõendi piir:** Raporti preflight-before, acknowledged apply-after ja sõltumatu verify-after vastavad väljastatud SQL ning parseri lepingule. Paigaldaja luges kataloogi, mitte konto- ega sisuridu. Parsitud kviitungid ja väljundiräsid ei ole toorkataloogi eksport ega serveri allkiri. Uut live-SQL päringut vastuvõtul ei tehtud.
- **Säilivad piirid:** Teenuste is_public, kontakt, meedia, kirjutused ja otseõigused jäävad eraldi kontoelutsükli tööks. Juba avatud üksikvaate automaatset tühjenemist vaataja muutumisel selle mooduliga ei kinnitata. Konto sulgemise toimingut ei ole aktiveeritud.
- **Järgmine töö:** Üks tööpakkumiste avaliku lugemise moodul: ühine jobs_private.visible_to_viewer(uuid) ning profiili tööloendi varane kanoonilise omaniku konto kontroll. Täpsed sihid, säilivad vastused ja allikapinnid on account-job-read-next-20261124 dokumentides. Audit ei ole teostus.
- **Dokumentatsioon:** Vastuvõtukirje, genereeritud üleandmine ja nelja projektdokumendi lisad on eraldi ette valmistatud järgmise sisulise koodipaketi jaoks. Pärast a9d86e6 pole neid Maci kirjutatud, commit’itud ega pushitud. Varasemaid pakette ei muudeta.

## Tegelik kohalik katse

- Vastuvõtul kontrolliti olemasoleva raporti, väljastatud paketi ning lähtebaaside vastavust. Rakenduse teste, build’i, SQL rakendamist, paigaldajat ega teenuste ühendusi ei korratud.
- Maci raportis läbis range TAP-kontroll 15/15 nõutud testi, 0 viga ja 0 vahelejäetut. Üks Next.js 16.4.6 build läbis; teenuste otsingu, üksikvaate ja avaliku profiili koostatud väljundid on raportis räsitud. Raport säilitab parsitud tulemused ja väljundiräsid; täielikku TAP/build’i teksti ning iga käsu argv-d ei eksporditud.
- Maci käigu järjestus: täpne eelseis → üks kolme funktsiooni tehing → COMMIT-järgne kinnitus → eraldi verify → paketi commit/push. database_apply_count=1, database_apply_acknowledged=true; konto- ja sisuridu ei muudetud. Eelmise eduka käigu originaalraport oli ainult lugemiseks lukus ning säilis.
- Ettevalmistuse kontrollid jäävad varasemaks tõendiks: 15 kliendijuhtumit, 8 juhitud hook’i juhtumit, 20 native SQL-vastuse parsimist ja 3 oodatud kutsujakonteksti tagasilükkamist, 51 PostgreSQL-i juhtumit, 20 uuendaja juhtumit ning värske build. Hook’i katse ei olnud React DOM ega brauser. Neid katseid vastuvõtul ei korratud.
- Säiliv jõudluse piir: 5500 teenuse kandidaadiga sünteetilise filtrita otsingu mediaan oli vana/uus 566,67 → 1105,46 ms. Konto kontroll toimub iga hinnatud teenuse kohta; 200 teenusega profiil tegi 201 kontrolli. Konto/Auth otsingud olid indekseeritud, kuid kandidaatide, täpsete koguarvude ning finality töö vajavad eraldi optimeerimist. Kasutaja praegune toimiv kasutustee ei tõenda suurt mahtu, samaaegsust ega tootmiskeskkonna ajapiiri.

## Production / kasutajaliides

- a9d86e63ab667545598da8e40ee2a2d0c7365df3 on kasutaja Verceli pildil Ready / Production, main; koostamisaeg 22 s. Raporti algne vercel=READY_NOT_CHECKED säilib muutmata; deployment’i tõend on eraldi pilt.
- Kasutaja kinnitas „Testides kõik töötab” pärast ettenähtud olemasoleva teenusesisu kasutuskontrolli. See on päris kasutustee kinnitus; iga eraldi kliki või võrguvastuse jälge uues sõnumis ei lisatud. Uut brauserikatset siin ei tehtud.
- Varasemad 0cb3484 profiili kuulutuste/rubriikide, ac5521a hobuste, 87bff3f tavakuulutuste, 8dc0b3b profiili ja 4b60782 Minu konto etapid säilivad vastu võetuna.

## Üks järgmine töö

Valmista a9d86e6 täpselt aluselt üks tööpakkumiste avaliku lugemise konto kontroll vastavalt docs/architecture/account-job-read-next-20261124.md-le. Kata ühine vaatajalubade helper ning profiili tööloendi korrektne kättesaamatu ümbris; säilita tööde avaldamise/poliitika, omaniku halduse ja kontakti lepingud. Tee uuele piirile sihitud katsed ja päringuplaani kontroll, seejärel build ja uus kaitstud pakett. Praegune vastuvõtt ei vaja kasutajalt käsku ega kordustesti.

**Peatumisel:** Enne järgmist Maci kirjutust kontrolli värskelt tegelikku haru, HEAD-i, tööpuud/indexit, allikaid, kinnitatud remote’i, originaalraportit ja SQL eelseisu. Tundmatu seis peatab kirjutuse. Säilita kontod, sisu, paketid, raportid ja päevikud; lõpetatud uuendajat ei korrata.

## Loe ainult vajalikku

- docs/continuity/HOSTED_PORTAL.md — vastuvõtu seis; uut käivituskäsku ei ole.
- docs/architecture/account-service-read-accepted-20261124.md — lähtepuu, raporti, andmebaasi, deployment’i ja kasutustee eraldi tõendid.
- docs/architecture/account-job-read-next-20261124.md — üks järgmine tööpakkumiste lugemismoodul ning täpne tõendipiir.
- docs/architecture/account-service-read-fence-v1.md — rakendatud teenuste lugemise leping ja säiliv jõudluse piir.

## Säilivad piirid

- Kolm kontot kuuluvad kasutajale; ainult ühel on kaks identiteeti. Uus konto valib eraisiku VÕI ettevõtte. Mitme identiteedi ning ettevõtte töötajate/rollide/omandi üleandmise iseteenindus ei ole avamisulatus.
- Olemasolevaid kontosid, profiile, kuulutusi, pilte, vestlusi, Energy andmeid, kviitungeid ega päevikuid ei kustutata ega kirjutata ümber. Konto active-only alus säilib. Sulgemine, taastamine ja lõppkustutamine vajavad ülejäänud lugemiste, otseõiguste, kirjutuste, sõnumite ja meedia tervikut.
- E-posti aktiveerimine jääb põhidomeeni selqiro.com kasutuselevõtu juurde. Saatmine, kinnitamine ja parooli taastamine peavad olema lõpuni kontrollitud enne väliseid testijaid või avalikku registreerimist ka vercel.app aadressil.
- Kasutajale kuuluvad ka selqiro.app/.io ja selkiro.com/.app/.io. Domeeni valikut uuesti ei küsita; DNS-i selles sammus ei muudeta.
- AI päringuteed jäävad suletuks. Tavaline osalemine ei sõltu Energy ostust. Riigipõhised töökuulutuse poliitikad ja senised avaldamise/vestluse lepingud säilivad.
- Pärast konto sulgemise/taastamise/kustutamise tervikut jätkub olemasolevate kuulutuste esiletõstmise ja seejärel välisreklaamide töö. Reklaamija võib kasutada sama kontot ilma avaliku müüjaprofiilita; reklaamimine ei ole kolmas kontotüüp.

## Keskkond

- /Users/taivo/selqiro; https://github.com/Taivo17/selqiro.git. Alus a9d86e63ab667545598da8e40ee2a2d0c7365df3; puu e5e7d7d2253c7c89ff09bbd84d3e501674c2de90; 2227 faili. Viimane raportiga kinnitatud remote’i võrdsus: 24.11.2026 kell 15:24:03.269 Europe/Tallinn. See pole praegune uus Git-kontroll.
- Next 16.4.6, Sharp 0.35.5, package.json ja lukufail säilisid. Maci raport kinnitab olemasolevat Supabase CLI 2.117.0 ja projekti vyjletlmwoiwxsnsunlm. Sõltuvusi ei paigaldatud ega uuendatud.
- Viimane originaalraport: ~/Library/Application Support/Selqiro/account-service-read-20261124/72a6f6df04784348f1c91f8741df7dc5c9350bc1cf2dbd5fb7e58b35d2e22998/result.json. Edasine uuendaja peab seda kontrollima ja säilitama. Vastuvõtudokumendid on eraldi ettevalmistus; uut Maci või pilvekäiku ei tehtud.

## Ajalugu (mitte praegused käsud)

Vana sisenemisleht: `docs/archive/99_V2_HANDOFF_NEXT_CHAT.before-price-core-20261004-6df0af9.md`.
Kõik 5573 algset rida säilivad bait-baidilt; SHA-256 `667e47990a7d3cc20ff53709cb861663b4565cf1d3c830eda88e0d18e60fdb8a`.
Vanade failide NEXT/CURRENT pealkirjad ei ole tänased käivitamisjuhised.
