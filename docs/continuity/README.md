<!-- SELQIRO_LISTING_PRICE_SERVER_ACCEPTED_SOURCE_FINISH_20261010 -->
## 2026-10-10 — One current state for accepted server tests and source finish

The V2 20:01 result supersedes its preparation-only record. Keep local test PASS,
22 staged paths, source commit/push, production installation and browser/deployment
as different facts. The finisher updates CURRENT_STATE.json and renders docs/99;
it does not edit the historical archive or renderer. Five prepend-only docs retain
all earlier bytes as history. The release architecture document and 14 other new
files are immutable during this finish.

The only input is listing-price-server-local-v2-20261010-200029-4elsr7uo.zip.
The finisher reads saved 77+6 SQL /17 JSON /5 overlaps /26 Node results, not live
journals. It has its own new exclusive append-only finish-attempt; do not remove it
after STOP, cancellation-after-write or completion. No automatic replay/restore.
Its output maps every prior input member to exact bytes, with a direct test-evidence
map and content-addressed storage, not another nested ZIP or deeper history chain.
Use result.txt and CURRENT_STATE.json for actual NEW_COMMIT/push/build/source status.
The latest handoff must ask the user to download it now; do not require whole old chats.

After reviewed source completion the single next task is a read-only production
preflight of the SAME release, including DELETE/TRUNCATE/cascade/admin compatibility.
Do not convert the fixture-gated composition into a production migration in this
source finisher. Actual schema rollout and client/UI activation remain separate.
Energy/payments and unrelated future features remain deferred. Preserve old reports.

---

<!-- SELQIRO_PRICE_SERVER_FIXTURE_DEPENDENCY_V2_20261010 -->
## 10.10.2026 — Serverikoostise V1 peatunud; testibaasi sõltuvuse parandus V2

Kasutaja 19:17 käik peatus enne 77 assertionit: SQLSTATE 42883, puudu oli
`project_horse_wanted_owner_summary_v1(jsonb)` ainult eraldatud testialuses.
Allikas on olemas muutmata migratsioonis `20260920150000_add_owner_marketplace_wanted_summary.sql`.
See ei tõenda puuduolekut productionis; uut productioni vaatlust ei tehtud.
Tagasipööramine, 11 tühja testtabelit ja helperi eemaldamine läbisid. Lõppvaatlus
näitas puhast `835a9bb`; lähtekoodi kirjutus, build, staging ja paralleelkatsed ei alanud.

V2 taastab üksnes täpse suletud abifunktsiooni testialusesse koos allika räsi ja
sõltuvuskirjega. Koostise hinnakirjutaja, guard, API-õigused, kõik olemasolevad
migratsioonid/laborid ning 77 algset assertionit, 17 vastust ja 5 paralleelkatset säilivad.
Lisandub kuus kohustuslikku sõltuvusregressiooni (keha, tüüp/config, ACL ja eelarve).
Uus käik peab tõendama tegeliku SQL/Node/build tulemuse; ettevalmistus pole läbimine.
V1 käivitit ega vanu päevikuid ei korrata, muudeta ega kustutata.

Käiviti: `selqiro-test-listing-price-server-local-corrected.py`.
Sisend: `listing-price-server-local-20261010-191723-9z_olcso.zip`.
Kinnitus `PRICE SERVER LOCAL V2`; ainult uus võrguta helper, seejärel sama 22-failine
pakett/build/staging. Commit/push, production ja uus kasutajaliides puuduvad.
PASS-järgne järgmine töö on sama lähteetapi lõpetamine; Energy/maksed ootavad põhivooge.

---

<!-- SELQIRO_PRICE_SERVER_COMPOSITION_CANDIDATE_20261010 -->
## 2026-10-10 — Existing-listing price server composition candidate

Base 835a9bb is committed/pushed; its 10 Oct 13:45 user run had a green build and
clean remote-equal main. This new 22-path candidate composes retained contracts;
it does not replay old tests, activate production or mount the new UI writer.
A dedicated NOLOGIN/non-bypass role owns only the closed price-CAS core. The new
invoker trigger does not trust arbitrary postgres-owned legacy definers or GUC flags.
Original labs, 23 migrations, 154-code registry and current application APIs stay exact.

See docs/architecture/listing-price-server-release-v1.md for transformations, exact
legacy-writer matrix, selective grants, structured deletion boundary and test limits.
77 new SQL checks/17 captures, five overlapping connection cases and a new parser
bridge must pass in a NEW networkless PG17.6 helper; rollback and same-helper cleanup
precede source writes/build/staging. Actual outcome is in the returned result, not
this candidate entry. No full Supabase/HTTP/JWT/browser/load claim. No commit/push.

After reviewed local PASS: finish this same source checkpoint, then fresh production
preflight and separate rollout consent before the real four-kind edit/view integration.
Never run the fixture composition by hand in production. Preserve old operation journals.
Energy/payments and speculative features remain deferred until core flows/links work.

---

<!-- SELQIRO_EDIT_CLIENT_LOCAL_ACCEPTED_SOURCE_FINISH_20261010 -->
## 2026-10-10 — Current entry: local edit-client PASS, not installer replay

This dated entry supersedes earlier next-step instructions for the completed installer.

The 10 October 12:36–12:37 (+03) user run passed 28 SQL assertions in a new networkless
PostgreSQL 17.6 helper, produced 10 JSON captures, and passed all 108 Node cases plus the
real Mac build. The last Node case consumed every capture from that same SQL run.
Evidence: `listing-edit-client-local-20261010-123648-1beym8qt.zip`, SHA-256
`13630d4a319818b613dc459fc41378b6dfe25a4dceb46f8f5374b688f7145a6c`.
The saved 748-file / 747-manifest report and 427 selected source exports were reviewed.
HEAD remained `7f2db6bc11ad0384ae1cf077c896f2ee77d9ea24`; exactly 16 files were staged,
with no extra unstaged/untracked paths in the final check and remote equal to that BASE.
This is not a new remote observation by this document or the offline review.

Selected schema/privileges and seven empty fixture tables were restored, and only the
new helper was removed before source writes. The original local DB and production were
not connected. SQL used synthetic auth/rows; Node used synthetic transport/actors/timers.
No new two-connection race, HTTP/JWT, React DOM, browser or load test is implied.

The source finisher preserves all nine new files byte-for-byte, amends only seven existing
documents, checks generated files, runs a fresh build and requests COMMIT PUSH before the
exact 16-path commit. Planned subject: `Add account-bound atomic listing edit client`.
Read its result for actual NEW_COMMIT, BUILD, COMMIT, PUSH, clean main and remote equality.
These documents cannot know their own future commit hash or certify a future deployment.
No SQL/Node-suite replay, Docker/Supabase, package install, reset/restore, force-push or old
operation-journal access. A stop preserves files/index/any commit; return the new ZIP first.

The short 99 handoff continues to be generated only from CURRENT_STATE.json. The original
5573-line history archive and renderer remain byte-identical. The new architecture file
listing-edit-client-v1.md is also kept unchanged; its candidate wording is qualified by
this dated actual result and the finisher outcome, not silently rewritten.

The new modules are still not imported by the current route. The account-bound adapters
remain fixture-gated and closed to API roles; neither persistent local nor production
price schema is installed by this source checkpoint. All 23 migrations, previous labs,
154-currency registry, existing save/image APIs, horse editing and renewal stay unchanged.

Next after reviewed source completion: finish THIS price-edit release using the existing
contracts. Assemble controlled server/read/write permissions and legacy direct/SECURITY
DEFINER writer transition; production preflight/application need separate review/consent.
Then connect the real form, auth/identity events, unsaved/image action boundaries and the
contextual named return flow. Display the same canonical price in detail/search/profile/
My Area. Do not add another registry/lab/general framework or activate only the client.
Energy/payments remain deferred until core create/edit/find/contact and visible links work.
No AI, FX, crypto, units, new creation/publication or deletion of test listings/images.

---
<!-- SELQIRO_LISTING_EDIT_CLIENT_CONNECTION_CANDIDATE_20261010 -->
## 2026-10-10 — Hinnamuutmise konto- ja identiteedipõhine kliendiühendus

Alus 7f2db6b: refaktor commit/push/build lõpetatud 09.10 kell 22:42; 10.10 kasutaja
kinnitas sama Verceli Ready/Production ning muutmis-/avaliku vaate töötamise.
Viimane Git-kontroll on endiselt 09.10 käigu tõend, mitte uus vaatlus ekraanipildist.

Uus kandidaat: täpne omaniku snapshot/ack parser, üks atomaarne salvestuspäring,
muutmata hinna väljajätmine, serveri canonical-vastus ja ühe vormi salvestussessioon.
Kaks õhukest suletud SQL-adapterit seovad JWT konto: ainult identiteedist ei piisa,
kui kaks eri kontot kuuluvad samasse ettevõttesse. Sisemist hinnareeglit ei dubleerita.

Käivitamine peab andma 28 uut SQL-kontrolli, 10 tegelikku vastust, 108 Node-testi,
rollback/oma helperi eemaldamise ja build'i. See tekst ei väida ette nende läbimist.
Edu korral 16 faili stagingus, commit/push puuduvad. Loe uus result.txt ja tagasta ZIP.
Töötavat lehte, vanu API-sid, 154 valuuta registrit, 23 migratsiooni ega 01–16 laboreid
selles etapis ei muudeta. Uut API-õigust ega hinnavalikut productionis ei avata.

Kadunud vastus/konflikt: sisestus säilib, automaatset uut kirjutust ega vana vormi
uue revisjoniga sidumist pole. Ainult teadlik lugemine ja kontrollitud versiooni
kasutuselevõtt. Konto vahetus tühjendab selle seansi teksti; A→B→A ei elusta vana vastust.
Hiljem tuleb sama sessioon ühendada päris auth-elutsükli, Reacti, piltide ja lahkumisega.
Navigeerimise ettepanek: üks sihtnimega tagasitee, privaatne lähteinfo mitte avalikku URL-i;
see kandidaat tagasilinki veel ei rakenda ega väida salvestamata sisestuse brauserikaitset.

Järgmine pärast kontrollitud lähteetappi: sama hinnaühenduse väljalaske serveri/vanade
kirjutajate ja õiguste üleminek, siis uus vorm ja neli kooskõlas hinnavaadet. Ei uut
registrit ega üldist vormiraamistikku. Energy/maksed alles pärast portaali põhivooge.
Täpsed failid/testipiirid: docs/architecture/listing-edit-client-v1.md.

---
<!-- SELQIRO_LISTING_EDIT_COMPOSITION_ACCEPTED_FINISH_20261009 -->
## 09.10.2026 — Refaktori tegelik PASS ja brauserikinnitus eraldi commit'i tulemusest

Jooksev seis ei ole enam „käivita refaktori paigaldaja”. 21:33 kasutajakäik lõppes
198 testi/build PASS-iga ning 17 täpselt stage'itud failiga baasil f8a6241. Hilisem
„kõik tundub olevat korras” koos kuue pildiga on vaatamiskontrolli üldine vastuvõtt,
mitte üksikute linkide või kirjutuste mõõdetud tõend. Ära nõua selle kordamist.

Lõpetaja ainus sisend Downloads-is on
`listing-edit-composition-20261009-213330-i2cqjhzn.zip` (622 faili; SHA-256
`b451ca55c86b1f241244580394d9aa2dc97294675dad3ebdb57e937533a9c768`).
Käivita ainult `selqiro-finish-listing-edit-composition.py` pärast dev'i peatamist.
Eraldi nõusolekud FINISH EDIT COMPOSITION ja pärast build'i COMMIT PUSH.
Seitse dokumenti uuenevad; kümme testitud lähte-/testifaili jäävad muutmata.
Kogu index, 418 allikat, 23 migratsiooni, puhas kõrvalmuudatusteta seis ja remote
kontrollitakse uuesti. Oma uus lukk/päevik; vanu operatsioonipäevikuid ei loeta.

`CURRENT_STATE.json` on lühikese repo üleandmislehe ainus allikas. Arhiiv (5573 rida)
ja renderdaja jäävad bait-baidilt samaks. Need commit'itavad dokumendid ei saa teada
enda tulevast commit-räsi: loe tegelik NEW_COMMIT/BUILD/COMMIT/PUSH/WORKTREE/REMOTE
uuest `listing-edit-composition-finish-...zip` tulemusest. Olemasolevat tulemust loe,
mitte ära korda lõpetajat. Katkestusel säilita failid/index/võimalik commit.

Lõpetaja generaatori ja renderdaja --check on failikontrollid, mitte SQL-i või 198
testi kordus. Tõendikaart säilitab eelmise tulemuse baidid; ajaloolised NEXT/CURRENT
kirjed ei tohi uut juhist üle kirjutada. Push ei kinnita iseenesest Verceli juurutust.
Välisel üleandmisel erista alati ettevalmistus, tegelik Maci käik, staging/commit,
testide piirid, kasutaja brauserikinnitus ja production. Uue olulise paketi juures
ütle kasutajale: Laadi see üleandmispakett nüüd alla.

Pärast tulemust jätka sama hinna/valuuta serveri ja kliendi ühendust; ära alusta
uut alussüsteemi. Energy/maksed ootavad põhivoogude ja nähtavate linkide valmimist.

---

<!-- SELQIRO_LISTING_EDIT_COMPOSITION_20261009 -->
## 2026-10-09 — Listing edit composition before atomic price integration

Source base: `f8a624140b206611162dbd3f74ce33278bfab813`, previously committed/pushed
with a real Mac build and clean/remote-equal result at 20:21 +03 on 9 October.
This is the behaviour-preserving UI extraction inside that price-edit work, not a
new price model, data migration, broad collector or additional feature.

`ListingEditPage.tsx` is reduced from 704 to 140 lines. The image actions move to
`useListingEditImages`, still called unconditionally at page level before render
gates. Images, basic fields, description, details, states and actions are small
components. The original three image handler bodies and presentation helper bodies
are byte-identical. Rendering adds no DOM wrapper. Save/read/image APIs, raw price
hydration, routes, permissions, field values and separate classification/store saves
remain unchanged. This step does NOT fix existing save races, loading/error priority,
image reload/unsaved-input handling or enable structured price saving.

One scoped 17-file package: eight new modules, one new test, the existing page and
seven existing docs. All 154-currency/input files, 23 migrations, 01–16 SQL labs,
archive, handoff renderer, dependencies, horse editor, renewal and Energy are preserved.
48 new extraction checks compare 15 old expanded JSX trees, 13 exact function bodies
and event/state flows. Alongside unchanged original-price/display suites there are
198 Node tests with synthetic hooks/JSX/transport, NOT React DOM, HTTP or a browser.

Read the new `listing-edit-composition-*.zip` for actual tests/build/staging; the
installer cannot commit/push or contact a database. It checks tests in an external
source mirror before writing, then runs the real project build before exact staging.
On PASS inspect the local edit view read-only: image controls/field values, sections,
links/back and narrow layout. No new save, deletion, primary switch or upload is
required. Return ZIP + browser findings before separate source finish. On STOP keep
all files/index and return ZIP; no installer replay/reset/restore/manual staging.

After accepted refactor, continue the same price-edit release: parsed full owner
snapshot, a single in-flight/account+identity generation-safe save, structured price
field with explicit currency and normalized preview, atomic server save and coherent
reads. Existing SQL contracts are reused; controlled server roles/legacy writer
transition and HTTP/browser validation precede activation. Do not add another generic
lab or registry. Energy/payments wait until core listing/contact/visible actions work.

---

<!-- SELQIRO_PRICE_INPUT_LOCAL_ACCEPTED_SOURCE_FINISH_20261009 -->
## 09.10.2026 — Hinnasisendi tegelik PASS ja sama lähteetapi lõpetamine

See algus asendab allpool ajalooliste V1/V2 käivituste järgmise tegevuse.
Jooksev tõeallikas on endiselt CURRENT_STATE.json ja sellest genereeritud 99-leht.
19:00 kasutajakäik läbis SQL/Node/build'i ning jättis 18 faili staging'usse samal
fb5be30 baasil. Ainult selle käigu täpne PASS-ZIP on uuele lõpetajale vajalik:
`listing-price-input-local-v2-20261009-190007-eepibvc8.zip`.
Ära korda V1/V2 paigaldajat, valuutakogujat ega SQL-i. Andmebaasi pole paigaldatud.

Uus `selqiro-finish-listing-price-input.py` säilitab testitud 11 faili ja muudab
ainult seitset juba stage'itud dokumenti. Generator --check ja handoff --check
on failide kontrollid; SQL/Node-sviite ei korrata. Värske build ning eraldi
COMMIT PUSH kinnitavad ainult selle 18-faililise lähteetapi. Tegelik commit/push/
puhas tööpuu loetakse lõpetaja result.json-ist, mitte ei ennustata dokumenti.
Ka pärast edu ei suuna repo leht lõpetajat uuesti käivitama: kontrolli tulemust.

Valitud eksport jääb 409 failiks; 398 algallika ja 11 uue faili vahe on dokumenteeritud.
5573-realise arhiivi ja renderdaja baidid jäävad samaks. Tõendi vanad failid võivad
sisaldada NEXT-käske, kuid need pole tänased juhised. Allpool vana 16-koodi laborivalim
on ajalugu: uus 154-koodi sisendiregister on lokaalselt testitud, UI-ga veel ühendamata.

Uue lõpetaja enda attempt-marker blokeerib topeltkirjutuse/commit'i; vanade paigaldus-
ja production-päevikute poole ta ei pöördu. Katkestus säilitab failid/indexi/võimaliku
commit'i ning nõuab raporti ülevaatust, mitte reset/restore/force-push või automaatset kordust.
Tulemusraport eristab ettevalmistust, päris kasutajakäiku, lähtekoodi ja productionit.

Järgneb hinna/valuuta nähtav muutmis- ja kuvamisvoog olemasolevate lepingutega.
Energy/maksed alles pärast põhivoogude ja nähtavate linkide lõpetamist. Iga uue
olulise üleandmispaketi juures tuleta kasutajale eraldi meelde selle allalaadimist.

---
<!-- SELQIRO_PRICE_INPUT_JSON_BOUNDARY_REPAIR_20261009 -->
## 09.10.2026 — hinnasisendi testi JSON-piiri ja generaatori eraldusparandus

16:58–16:59 V1 katse peatus enne esimest hinnakontrolli: input-suite 22P05
(235. rida), sest kogu maatriksi jsonb-laadimine kohtas bad_amount_26 U+0000 märki.
See on testi sisendipiiri viga, mitte 845 hinnareegli ebaõnnestumine. Kolm TS-moodulit
kompileerusid; Node, lähtekirjutus, build ja staging ei alanud. Valitud public-kataloog
taastus tühjaks ja ainult selle käigu abikonteiner eemaldati. Git oli alguses puhas
fb5be30 / remote-equal; katkestuse järel uut lõppkontrolli ei tehtud.
Tõend: listing-price-input-local-20261009-165859-z3on24xa.zip,
SHA256 7df7d18315cc4161e79b22d719de3d594763edfe080765bb14a67ea184808df7.

V2 säilitab kõik 845 algset sisendit/ootust ja 178 täpsuskaarti muutmata baitidega.
Test laadib JSON-i tekstina ja teisendab iga juhtumi eraldi jsonb-ks. Ainult täpne
algne nullmärgijuhtum võib keelduda dekodeerimisel 22P05-ga; ülejäänud 844 peavad
jõudma normaliseerijani. Veaallikas salvestatakse eraldi, seda ei nimetata hinnavalideerija
läbimiseks. Muud veakoodid ega vale juhtumi dekodeerimisviga ei lähe edukaks keeldumiseks.
Kaheksa lisaregressiooni eristavad algset bulk-viga, nullmärki/literaalset kaldkriipsu/
JSON nulli, fixed-nullhinda, täpset piirhinda ja täpselt kahte suletud väärtusfunktsiooni.
1058 algset Node'i kontrolli säilivad; päris SQL-vastuse võrdlus on nõutud enne paigaldust.

Generaator leidis varem lõputagi ainult rea algusest ning kaasas soovimatu
listing_price_legacy_label_v1 funktsiooni. Nüüd eraldab ta täpselt sama algse
normalize_listing_price_v1 lause (SHA256 1a703a5757cbdc7648d881db2a3af2234b891db855d4789bd44b5f1d36b33d45).
Hinnavalideerija keha ei muutu; kõrvaline abifunktsioon jäetakse uuest suletud fragmendist välja.
154 valuuta valik, skaalaandmed, klient/vormimudel, Node-test ja algmaatriks ei muutu.
Kohalik test nõuab nüüd päriselt täpselt kahte public-funktsiooni ning kummalgi puuduvat
PUBLIC käivitusõigust; varasem tühi järelkataloog üksi ei tõendanud funktsioonide arvu.

See on uus ettevalmistatud V2, mitte väide Maci SQL/build PASS-ist. Uus ainus sisend
on ülalnimetatud STOP ZIP, mitte uus XML-laadimine ega vana koguja kordus. Käivita ainult
selqiro-install-listing-price-input-corrected.py; kinnitus PRICE INPUT LOCAL V2.
Pärast kõiki teste, rollback'i ja oma abikonteineri eemaldamist kirjutab käiviti sama
18-failise paketi, teeb build'i ja staging'u. Commit/push puuduvad. STOP korral ära korda.
01–16 laborid, 23 migratsiooni, kasutajaliides, olemasolevad hinnad ja Energy säilivad.
Energy võetakse endiselt ette alles pärast põhivoogude ja nähtavate linkide valmimist.

---

## 09.10.2026 — valuutaregistri sisendietapp

Jooksev seis on CURRENT_STATE.json-is. Energy arendus algab alles pärast põhivoogude
ja nähtavate linkide kontrolli. Uus registry/input pakett ei lülita UI-d ümber.
Registri allikas: `data/currency/listing-currency-registry.v1.json`; `scripts/currency/generate_listing_price_registry.py --check` kontrollib tuletisi.

# Selqiro — kiire ja kontrollitav vestlusevahetus

## Sisenemistee

Alusta `docs/99_V2_HANDOFF_NEXT_CHAT.md` failist. See on genereeritud kokkuvõte,
mitte teine käsitsi toimetatav tööseis. Muuda `docs/continuity/CURRENT_STATE.json`,
seejärel uuenda genereeritud lehte kontrollitud muudatuse sees. Kontrolliks:

```bash
python3 scripts/continuity/render_current_handoff.py --check
```

`--check` ei muuda faile. Ainult teadlik `--write` muudab genereeritud 99-faili;
seda pole vaja käivitada, kui check läbib. Järgmine lähtepakett peab mõlemad failid
koos uuendama. Jooksev leht jääb alla 100 rea; detailid vii viidatud lepingusse.
AI_BOOT/AI_INDEX pole käesolevas kontrollitud ekspordis: neid ei kirjutata oletatud
sisu järgi üle. Vana BOOT/sprint ei asenda tegelikku Git-seisu ja jooksva 99 algust.

## Tõeallikad ja ajad

- Tegelik Git/õiged failibaidid määravad lähtekoodi, index’i ja tööpuu.
- Käigu result.json ja logid määravad tehtud build’i, commit/push’i ning kontrollide ajad.
- Productioni skeemi määrab kuupäevaga serveritõend, mitte migratsioonifaili olemasolu.
- Deployment’i määrab täpse commit’i juurutuse tõend, mitte push üksi.
- Valmis kandidaat, läbi katsetatud kandidaat, paigaldatud lähtekood ja rakendatud
  andmebaas tuleb alati eraldi nimetada. Faili kuupäev ei tõenda toimingu tegemist.

Ära kirjuta enne commit’i selle tulevast räsi dokumenti. Selle checkpoint’i uus
räsi ja build/remote seis tulevad välistest tulemustest. Hilisem tavapärane
checkpoint võib selle kinnitatud räsi uue kirje alusena talletada.

## Failikaart hinnatöö sidumiseks pärast omaniku lugeja talletamist

| Vajadus | Täpne lähtekoht |
|---|---|
| Testitud suletud hinnatuum | supabase/labs/listing-price-core-v1/README.md |
| Testitud salvestus/loomine 04–09 | supabase/labs/listing-price-integration-v1/README.md |
| Testitud avalikud lugejad 10–14 ja neli parserit | supabase/labs/listing-public-read-v1/README.md |
| Omaniku lugeja 15–16 ja kaks parserit | supabase/labs/listing-owner-read-v1/README.md |
| Nende täpsed sõltuvused/testide ajutine asetus | listing-public-read-v1/PROVENANCE.json ja tests/TEST_LAYOUTS.json |
| Mõlema labori päritolu | nende PROVENANCE.json; integratsioonilabori tests/DEPENDENCIES.json |
| Ainult failiräside kontroll | supabase/labs/listing-price-integration-v1/verify_sources.py (ei SQL-i) |
| Uue hinnalepingu piirid | docs/architecture/listing-price-currency-v1.md algus |
| Tavakuulutuse loomine | app/sell/page.tsx |
| Vana muutmistee | app/my-page/page.tsx |
| V2 põhiväljade salvestus | src/entities/listing/api/updateListingBasics.ts |
| Muutmisvormi algväärtused | src/features/listing-edit/model/listingBasicsForm.ts |
| V2 vormi olek | src/features/listing-edit/model/useListingBasicsForm.ts |
| Range avaliku otsingu vastus | src/entities/listing/model/publicSearchResponse.ts |
| Ühine praegune hinnakuva | src/entities/listing/model/priceDisplay.ts |
| Omaniku ühine loend | src/entities/marketplace-item/api/getMyMarketplaceItems.ts |

379-failine kontrollitud baas ja selle checkpoint’i uued failid ei ole kogu repo. Puuduvat konteksti kogu ainult konkreetse
sõltuvuse jaoks; ära alusta uut üldist skeemiauditit, kui varasem tõend katab vajaduse.

Avalike lugejate kaks sviiti on eraldi. Node-testi `__dirname` sõltub ajaloolisest
ajutisest asetusest; seetõttu on täpsed testibaidid `*.reference.cjs.txt` failidena,
mitte ekslikult käivitatavate repo testidena. Neli parserit on päris `.ts` moodulid.
Järgmine harness võib asetuskaardi järgi taastada välise töökausta, ilma testisisu
muutmata. Vanad ühekorra käivitid ei ole üldised projektitestid.

## Kontrollitud keskkond (ajalooline, mitte automaatselt värske)

Kasutaja Mac: `$HOME/selqiro`, main, GitHub `Taivo17/selqiro`. Python 3.9+ standardteegid,
olemasolev Node/npm. Source-checkpoint: Git + olemasolev `npm run build`; peata dev
oma terminalis Ctrl+C abil. Ära tapa kasutaja protsesse, kustuta .next ega paigalda pakette.
Runner ei loe või ekspordi .env faile; tavapärane projekti build kasutab olemasolevat
keskkonnaseadistust. Git keskkonnaülekirjutused eemaldatakse ainult alamprotsessidest.

04.–09.10 laborikatsed kasutasid igaüks uut network-none helperit ja juba olemasolevat image’it
`sha256:5deba92e50cd17bfacf8603834d317cdf3bfc1c016ec8293991997fa3b55fa3d`.
Unix-socket oli `$HOME/.docker/run/docker.sock`, binaaritee `/usr/lib/postgresql/bin`,
PG17.6. Iga eduka käigu helper eemaldati. Algset `supabase_db_selqiro` ei kasutatud.
Binaar `pg_ctl` ja logisilt `version-pg-ctl` on eri nimed; silte ei lõdvendata.

03.10 productioni lugemise projekt: `vyjletlmwoiwxsnsunlm`, olemasolev hash-pinned
Supabase CLI 2.117.0 arm64. `db query --file` töötas; `--`-ga algavat SQL-teksti ei
anta positsioonilise argumendina. Ei npm/npx/latest, relink’i, config.toml oletamist
või vanade privaatlogide eksporti. CLI ei ole selle lähtecheckpoint’i tööriist.

## Lõpetatud toimingud — mitte praegused juhised

Lõpetatud on hinnatuuma v1 STOP ja v2 PASS, hinnalepingu audit v1 STOP/veadiagnostika/v2
PASS, 04.10 hinnatuuma lähtecheckpoint, 05.10 atomic-basics PASS, 06.10 loomise V1/V2 STOP ning V3 PASS. Lõpetatud on ka hinna kaitse/kuvamise, listing-renewal’i, search’i ja varasemad horse/wanted
rollout’id. Ära korda neid, muuda rakendatud migratsioone või kustuta COMPLETE päevikuid.
Uus checkpoint’i väline ainult oma attempt-marker on eraldi varasematest DB päevikutest.
Peatumisel tagasta uus raport; ära paranda staging’ut, reset/restore’i ega push’i käsitsi.

## Lahendamata launch-piirid

Hinnalabor ei paranda kogu portaali turvalisust. Avaliku listings SELECT-poliitika
`true`, vana konto-põhine write-RLS ja AI enrich’i ligipääsu/kulu ülevaatus jäävad eraldi.
Loomine/kordus ja atomaarne põhiväljade+hinna endpoint on lokaalselt testitud, mitte
productionis avatud. Veel on vajalikud versioonitud lugejad, tegelike kirjutajate ja
usaldatud rollide üleminek, kviitungi/kontoandmete säilitamine ning kustutusvooga sobitamine.
16 laborivaluutat on katsevalim; lõplik register vajab enne kasutajasisendit kontrolli.

## Väline üleandmispakk

Üks ALUSTA_SIIT + CURRENT_STATE, otsene source-context, vajalik test/skeemitõend ja
kontrollräsid. Ei ZIP-i sees ZIP-i ahelat. Ajaloolise jooksu failid on evidence all,
kandidaat ja committed source eri tähendusega kaustades. Ära kopeeri private-kausta,
.env-faile, võtmeid, konto- või sõnumiandmeid. Algseid kasutaja tõendeid ei kustutata.

## Uue paketi allalaadimise meeldetuletus

Kasutaja on 38d260a seisu eraldi alla laadinud. Iga uue olulise valmis üleandmise
juures tuleb vestluses eraldi öelda **Laadi see üleandmispakett nüüd alla** ja anda
täpselt uue faili link. Ära väida, et see salvestus automaatselt Maci. Vestlust ei
pea ennetavalt vahetama; fail on katkestuse puhuks. Vana pakett jääb alles.

Tõendifailide ümberpaigutuse kaardid seovad iga algse ZIP-kirje baitide ja räsiga.
Failiviide ei ole sandbox-tee ega terviklik rakendusandmete varukoopia. Käivitatava
Downloads-skripti nimi/sisend/kinnitus peavad kattuma selle skripti konstantidega.

## Omaniku lugemise lähtecheckpoint 09.10.2026

07.10 public-read source lõpetas commit’i 2e5a376; 09.10 owner-read katse lõpus oli
sama puhas main ja remote-võrdsus. Uue `listing-owner-read-source-*.zip` tegelik
tulemus määrab omaniku talletuse build’i/staging’u/commit’i/push’i. Uus commit pole
ette teada. Olemasolev 99 arhiiv ja renderdaja säilivad bait-baidilt.

Omaniku kaks algset parserit säilivad päris `.ts` failidena. Nende `./priceRead`
import läbib selgelt dokumenteeritud kahe realise re-export-faili, mis suunab ühe
juba talletatud public-read parseri juurde. See pole kopeeritud teostus ega uus UI
import. Failipäritolu kontroll seob nii algsed parserid, silla kui ka sõltuvuse.

Omaniku snapshoti retained allikas on tegelik saadetud READ ONLY/UTC tehing, mitte
varasemas payload'is olnud lühem paljas SELECT. TEST_LAYOUTS ütleb selle vahe ära.
Node/driver viited ei ole uus valmis testiraamistik ega luba vana testi korrata.

Pärast lähteetapi tulemuse ülevaatust koosta üks kitsas hinnatöö sidumisplaan,
mitte uus üldaudit ega lõputu laborite lisamine. Täisvormi algandmed, valuutaregister,
serveri expiry-filter, vanade kirjutajate ja RLS üleminek tuleb prioriseerida üheks
kasutajale nähtava tulemuse järjekorraks. Loendi väljavõtted ei ole salvestusandmed.

Tasuta lihtne AI kategooriaabi ning serveri kulukaitse on kasutajaga kinnitatud
hilisem suund. Algul pilt+pealkiri+lühikirjeldus, vajadusel üks piiratud mudelikõne,
alati käsitsi jätkamine. Piloodi arvulisi limiite ega praegust Energy hinda see
lähteetapp ei määra/muuda. Ei AI arendust käesoleva hinnatöö vahele.
