## 14.10.2026 — WEB-kirjutuse sama lähteetapi lõpetamine

**Paigaldus ja build on Macis tehtud ning üle vaadatud; järgneb sama20-rajalise
muudatuse piiratud lõpetaja. See ette kirjutatud dokument EI kinnita veel lõpetaja
commit'i, push'i ega uut juurutust. Tegelik tulemus tuleb uue käigu result.json-ist.**

- Alus b05c98dca11e008e99114e85679e024403fa49e2 / main, parent9f3961d.
  Viimane täielik kohalik vaatlus 14.10.2026 19:25:47.667030 Tallinn:20staged,
  staging'uväliste muudatusteta,571valitud allikat/23migratsiooni. Tööpuu pole puhas.
  Viimane kaug-main'i vaatlus 19:25:46.179744 oli sama baasil. Need pole uued live-vaatlused.
- Algne paigaldustõend: web-write-completion-source-install-20261014-192528-aje23uvf.zip,
  7164099baiti, SHA-256 13eadffadbeb40065ae36aea1127b38acdaf7b4a493c10acc57f6dc6a58acc70.
  Kõik11testitud faili paigaldati muutmata;20rada=11uut+9muudetud.
- Päris build19:25:38.809509–19:25:43.339623 Tallinn exit0. Node24.16.0/npm11.13.0/
  Next16.2.1/TypeScript5.9.3/Sharp0.34.5 on selle varasema paigalduskäigu tõend.
  Build'i stdout1560b jäi privaatseks; selle sisu ega hoiatuste puudumist siin ei väideta.
- Varasem34Node/HTTP+58SQL tõend säilib.34=31uut+3mudeliühilduvust, mitte vana85sarja
  uusvastuvõtt. Päris kohalikHTTP, sünteetilisedAuth/REST/Storage/sanitizer;native puudus.
  PG17.6:44rollback+12neljasajastuses+2isolatsioon,24SQLexit0 ja2NOTICE ettevalmistuses.
  Neid ega muid vanu sarju või build'i lõpetajas ei korrata.

**Piiratud lõpetaja:** uus COMMIT PUSH kinnitus, värsked tegelikud main/HEAD/parent/
koguindex/tööpuu/571allika/23migratsiooni ja kinnitatudoriginmain kaitsed enne kirjutusi.
Täpsustatakse ainult8samasse20radalisse muudatusse kuuluvat dokumenti; kõik11testitud
faili, nõuded ja tõendiinventuurid jäävad muutmata. Jooksva üleandmise kontroll,
kontrollitud eraldi indexi koopia, üks täpne commit ja kuni üks mitte-force main-push.
Uus eraldi ühekordne päevik; vanu päevikuid ei avata. Osalisi muutusi ei taastata.

**Järgmine tegevus pärast käiku:** loe UUE web-write-completion-source-finish tulemus,
commit-proof, remote-observations ja lõplik Git-seis. Ainult kinnitatud commit/push/clean
järel jätka otse sama V2 SOURCE/teadmataWEB välise kirjutuse lõplikkust, püsivat koristust
ja tervet kasutajateed. Uut eraldi dokumentide lõpetamise ringi ei tehta.
STOP-il säilita failid/index/päevik; ära korda ega tee käsitsi reset/restore/commit/push'i.

**Avamise piir:** üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Kinnitatud üheWEBkirjutuse koristuskviitung ei ole täielik failikustutus. Kõik väljastatud
SOURCE ja teadmataWEB jäävad blokeerituks. Ainukirjutaja/no-proxy-retry/tegelikuStorage
vastuseleping, Storage/CORS/mahud/mobiil/native-pilv, konto-identiteedi-sõnumite kooskõla,
vorm/marsruudid ja müüja–ostja–anonüümse lisamine→leidmine→detail/profiil→suhtlus→haldamine→
kustutamine vajavad tegelikku vastuvõttu. Energy/maksed/AI/otsingulisad ootavad.
Olemasolevate kontode, kuulutuste, piltide ega päevikute kustutamisluba puudub.
Varasem b05c98d Ready/Production on baasi tõend; seda uuesti ei küsita.
Push võib käivitada olemasoleva Verceli automaatika, kuid lõpetaja uut juurutusolekut ei kinnita.

---

## 14.10.2026 — ühe WEB-kirjutuse kviitung: testid vastu võetud, piiratud lähtepaigaldus

Praegune commit'itud alus on `b05c98dca11e008e99114e85679e024403fa49e2` (560 valitud allikat, mitte täisrepo).
Eelnev lõppavaldamise lähteetapp on lõpetatud: commit/push/clean ning b05c98d
Ready41s/Production-ekraanitõend on vastu võetud. Neid lõpetamisi ei korrata.
Viimane täielik kohalik vaatlus: 14.10.2026 18:24:58.039505 Tallinn, puhas main,
560 allikat ja 23 migratsiooni; testikäigus GitHubi ei küsitud. See on salvestatud,
mitte käesoleva ettevalmistuse värske vaatlus.

Uus 34/58 testitõend on üle vaadatud: 34 Node/HTTP ja range ES2017 tüübikontroll
Node24.16.0/TS5.9.3 peal; PostgreSQL17.6 44 rollback +12 neljas ajastuses +2
isolatsioonikeeldumist. Native-pilditöötlejat ei kutsutud; Auth/REST/Storage/sanitizer
olid kohaliku HTTP-testmudeli vastused. 34 sisaldab kolme vana WEB-testimudeli
ühilduvuskontrolli, mitte vana 85-testilise sarja kordamist.
Tõend: web-write-completion-tests-20261014-182452-x20z__kg.zip,
SHA-256 256f35709fb725433f5d6a8ebcab02c121bba6502f0ec971eac6bdfd2f865257.
Vt `docs/verification/v2-web-write-completion-tests-20261014.json` ja `docs/architecture/v2-private-web-write-completion-v1.md`.

Sama 11-failine kandidaat säilib bait-baidilt. Muutuvad olemasolev
verifyPrivateWebImage.ts ja listing-publication-web.test.cjs; lisandub üheksa
uut faili. Ainult täielik 200/Id/Key vastus serveri ühelt lubatud WEB POST-ilt
saab anda seotud püsiva kirjutuskviitungi. See ei asenda pildi valmidust ega
kuulutuse lõppkontrolli. Tühistatud kviitungiga WEB saab testides koristusse;
SOURCE ja teadmata WEB jäävad blocked_write_settlement. Täielik failikustutus
EI OLE valmis; 404/timeout/aegumine/ready ei vabasta neid blokeeringuid.

Uus source-only paigaldaja seob need 11 testitud faili 9 dokumendirajaga:
20 rada (11 uut /9 olemasolevat muudetud), 571 valitud tulemusallikat.
Kaks uut dokumendirada on käesoleva ühenduse leping ja tõendiinventuur.
Enne kirjutusi värsked kogu Git/index/tööpuu/560allika/23migratsiooni ja lubatud
kaug-main'i kaitsed. Üks uus päris build, ainult selle edu järel täpne staging.
Paigaldus ja build on selles ette kirjutatud dokumendis VEEL VAATLEMATA;
tegelik tulemus tuleb uuest web-write-completion-source-install result.json-ist.
Testitud koodi ei muudeta, 34/58 ega vanu41/143/81/85/140/... sarju ei korrata.
SQL-i, Storage'i, Dockerit, paketipaigaldust, commit'i ega push'i selles käigus pole.

Üleslaadimine ja avaldamine jäävad suletuks; SQL labs-only/API-closed.
Uusi marsruute, vorme, bucket'eid, õiguste avamist ega koristaja ajastust ei lisata.
Tegelik Storage'i versioon/vastuseleping, ainukirjutaja piir ning vaheserveri
automaatsete POST-korduste puudumine pole tõendatud. Kõik väljastatud SOURCE
ja teadmata WEB failid, päris Storage/CORS/mahud/mobiil/native-pilv,
konto/identiteedi/sõnumite kooskõla ning müüja–ostja–anonüümse täisteekond ootavad.
Energy/maksed/AI/otsingu lisad ootavad; üldmootorit ega V1 täiskihti ei ehitata.
Olemasolevate kontode, kuulutuste, piltide ja päevikute kustutamisluba pole.

Järgmine tegevus pärast esimest paigalduskäiku: vaata uus tulemus-ZIP üle;
ainult eduka build'i ja täpse staging'u järel lõpeta SAMA lähteetapp kontrollitult.
Ära korda seda paigaldajat või vanu käiviteid, ära lisa kõrvalist rakendusmuudatust.
STOP säilitab kõik osalised failid, indexi, privaatse build-logi ja uue päeviku.
Ei reset/restore'i, käsitsi commit/push'i ega automaatset kordust.
Pärast sama lähteetapi lõpetamist jätkub sisuline V2 ühendamine, mitte eraldi docs-onlyring.

---

## 14.10.2026 — lõppavaldamise lähteetapp pärast ES2017 parandust; kontrollitud lõpetamine

Sama lähteetapi BigInt-parandus on Macis tehtud ja selle tulemus üle vaadatud.
14.10 kell 14:46 läbisid 41 uut regressioonitesti, final-moodulite ES2017 tüübikontroll
ja uus projektibuild (exit 0). ID ülempiir kasutab täpset BigInt("9223372036854775807")
stringi; target ES2017, strict/lib, sõltuvused ja 23 migratsiooni säilisid.
Algne 12:00 build'i STOP ja 12:38 diagnostika on muutmata ajalugu, mitte uus käivitus.
Parandustõend: private-final-source-bigint-repair-20261014-144601-wrmuy_4a.zip,
SHA-256 31ad04b22fbd179b0ac842cbaab8fa4c5c971d624eb2e3b7c755b4c302dcc5ef.

Viimane täielik salvestatud Git-vaatlus oli 14.10.2026 14:46:16.381892 Tallinn:
main/9f3961d, täpselt 36 rada staging'us (26 uut, 10 varasema dokumendi muudatus),
staging'uväliste muudatusteta, 560 valitud allikat. Tööpuu EI OLNUD puhas ning
commit/push EI OLNUD tehtud. Kaug-main'i viimane sama baasi vaatlus oli 14:46:15.027351.
See on varasema käigu tõend, mitte uue lõpetaja värske Git- või võrguvaatlus.

Järgnev kontrollitud source-finisher nõuab enne kirjutusi tegelikku main/HEAD-i,
kogu indexit/tööpuud, 560 allikat, 23 migratsiooni ja kinnitatud kaugsihti.
Täpsustatakse ainult ühtteist juba sama etapi dokumenti. Kõik 22 lõppavaldamise faili
(sealhulgas parandatud TS), uus ES2017 regressioonitest, nõuded ja tõendiinventuurid
säilivad bait-baidilt. Commit'i ulatus jääb samaks 36 rajaks; üks commit ja üks
mitte-force main-push. Uut rakendusfunktsiooni pooleliolevale staging'ule ei lisata.

Tegelikku commit/push/clean/remote tulemust loe uuest private-final-publication-source-finish
result.json-ist, commit-proof.json-ist ja remote-observations.json-ist. See ette
kirjutatud tekst EI kinnita tulevast lõpetamist edukaks. 41 testi/tüübikontrolli/build'i
ning 143/81/85/140/117/108/195/109/119 sarju, vanu paigaldajaid/parandajaid/diagnostikat,
SQL-i või Storage'i käike ei korrata. Kontrollitakse ainult muudetud jooksva üleandmise
kooskõla. Node24.16.0/npm11.13.0/Next16.2.1/TS5.9.3/Sharp0.34.5 on varasema paranduse
vaatlused; lõpetaja neid uuesti ei käivita. Privaatset build-stdout'i ülevaataja ei lugenud.

143 SQL-kontrolli tõend säilib muutmata SQL-i kohta. Vana 81 Node/HTTP-testi PASS
kuulub algsetele failibaitidele, mitte parandatud faili uuele täissarjale. Parandatud
rea tõend on 41 sihitud testi, ES2017 tüübikontroll ja uus build. Varasemad V1/V2 STOP-id
ning testitud README ettevalmistusaegsed NOT_RUN väljad säilivad ajalooliselt.

Pärast selle SAMA lähteetapi lõpetamist ja tulemusülevaatust jätka päris V2 ühendamisega:
hiliste väliste kirjutuste lõplikkus, lubatud privilegeeritud kirjutajad, püsiv piiratud
koristus/lõppkustutus, konto-identiteedi-sõnumite kooskõla, vorm/marsruudid ning kogu
lisamine → leidmine → detail/profiil → suhtlus → haldamine → kustutamine.
Uut eraldi dokumendilõpetamise ringi ei tehta. Tavaliselt väljastatud SOURCE-loaga ja
ettevalmistatud WEB-kirjutusega failid jäävad blocked_write_settlement; nende täielik
failikustutus EI OLE valmis. 404/timeout/aegumine/ready ei tõenda välise kirjutuse lõppu.

Upload/avaldamine jääb suletuks. SQL labs-only/API-closed; uut marsruuti, vormi, bucket'it,
õiguste avamist ega koristaja ajastust see lõpetaja ei lisa. Vana9f3961d Ready/Production
pilt on baasi tõend, mitte tulevase commit'i juurutuse või päris Storage/native vastuvõtt.
Energy/maksed/AI/otsingulisad ootavad; üldmootorit või V1 täiskihti ei ehitata.
Olemasolevaid kontosid/kuulutusi/pilte/päevikuid ei kustutata. STOP säilitab osalised
failid/indexi/uue päeviku; ei käsitsi taastamist, korduskäivitust, commit'i ega push'i.

---

## Current addition — 2026-10-14 reviewed final-publication source package

Current committed source base: `9f3961defbc797518995947bb21196d3208b94b9` (534 selected
sources, not a full repository). Its 2026-10-13 commit/push/clean result and matching user
Ready53s/Production screenshot were accepted; do not repeat that checkpoint. Latest full
local guard is 2026-10-14 09:26:56.730031 Tallinn, still clean main. These are saved observations.

Final-publication V3 passed 143 real PG17.6 assertions: 103 rollback, 30 assertions in ten
schedules, ten expected isolation rejections. All 63 SQL exits were zero. Sixteen expected
NOTICE lines were reviewed; stderr was NOT all empty. The original 81 Node/HTTP/TypeScript
PASS is reused unchanged V1 evidence, not a V3 rerun. Original V1/V2 overall STOPs remain
unchanged. Temporary SQL roles and loopback synthetic Auth/REST/Storage are not cloud acceptance.

The scoped SOURCE installer retains all22 tested code/SQL/test/README files byte-identically
and writes12 documentation paths:34 total (24 new/10 modified),558 selected outputs. ONE new
current build and exact staging are planned, NOT preclaimed: read the new
private-final-publication-source-install result.json. Fresh actual Git/index/worktree,
534 sources,23 migrations and approved remote guards precede Mac writes. No 143/81 or old
suite replay, SQL execution, package install, commit/push or Storage action. All existing
application modules, approved requirements and earlier proof inventories remain unchanged.

See v2-private-publication-final-v1.md and ../verification/v2-private-final-publication-tests-20261014.json.
Historical candidate README NOT_RUN is retained as tested bytes. SQL stays labs-only/API-closed;
no public route, form, bucket, worker schedule or upload/publication activation is added.
Terminal content deletion is NOT completed file deletion. Normal issued SOURCE and prepared
WEB objects remain blocked_write_settlement; no time/404/expiry/readiness shortcut is introduced.
Account-erasure RESTRICT refusal is not an implemented account erasure journey. Actual delayed
write finality, exclusive privileged writers, Storage/CORS/large-mobile/native-cloud acceptance,
account/identity/message consistency and the full seller/buyer/anonymous journey remain launch gates.
After this SAME source checkpoint finish, continue V2 integration; no new docs-only finish loop,
general workflow engine or full V1 compatibility layer. Energy/payments/AI/search extras wait.
No existing accounts/listings/images/journals may be deleted by this source installation.

---

## 13.10.2026 — WEB-pildi lähtepaigaldus üle vaadatud; sama etapi kontrollitud lõpetamine

Kõik 14 testitud veebipildi ühenduse faili on projektis muutmata kujul. Uus Maci build
läbis 13.10 kell 21:57:49–21:57:54 Tallinn, väljumiskood 0; Node24.16.0/npm11.13.0/
Next16.2.1/TypeScript5.9.3 ja Sharp0.34.5 metadata kontrolliti. Privaatset build-stdout'i
pole välises ülevaatuses loetud; native-koodi selle paigalduse jaoks uuesti ei käivitatud.
Algne paigaldustõend: private-web-image-source-install-20261013-215737-y14_o86h.zip,
SHA-256 a55fffd386bb3636a530dd781b1d8ae877cb97987ff1719a5c8b1867ab362a99.

85 ühendustesti (neli päris worker'i ühenduskatset nende SEES) ning 140 SQL-kontrolli
on varasem vastuvõetud 21:10 Maci tõend, mitte selle lõpetaja uus testikäik. Kohalik
HTTP kasutas sünteetilist Auth/REST/Storage mudelit; eemaldatud PG17.6 abi ei ole
production. Valmis labori README ettevalmistusaegne sõnastus säilib ajalooliste baitidena.

Viimane paigalduse täielik kohalik vaatlus 13.10 kell 21:57:58.255424 Tallinn:
main/33b485b, täpselt 25 staged rada, staging'uväliste muudatusteta. Tööpuu EI OLNUD
puhas, commit/push EI OLNUD tehtud. Järgmine eraldi kontrollitud lähtefinisher peab
värskelt kontrollima tegelikku HEAD/tervet indexit/tööpuud/534 allikat/23 migratsiooni
ja kinnitatud kaugsihti enne kirjutusi. Ainult kümme juba samasse ulatusse kuuluvat
dokumenti täpsustatakse; 14 testitud faili, nõuded ja kõik tõendiinventuurid säilivad.
Kogu commit jääb samaks 25 rajaks; üks commit ja üks mitte-force main-push.

Tegelikku commit/push/clean/remote tulemust loe uuest private-web-image-source-finish
result.json-ist, commit-proof.json-ist ning remote-observations.json-ist. See ette
kirjutatud tekst EI kinnita tulevast käiku edukaks. Build'i ega 85/140/117/108/195/109/
119 testisarju, paigaldajat, SQL-i, Dockerit või Supabase CLI-d ei korrata. Kontrollitakse
ainult muudetud jooksva üleandmise kooskõla. 33b485b varasem Ready/Production pilt on
vastu võetud; see ei ole uue commit'i juurutuse ega native/Storage vastuvõtu tõend.

Pärast sama lähteetapi tulemusülevaatust jätka otse lõppavaldamise, püsiva piiratud
koristuse, lõppkustutuse ning konto/identiteedi/sõnumite kooskõla ühendusega. Uut eraldi
dokumendilõpetamise ringi ei tehta. Valmiduskviitung ei ole avaldatud kuulutus; üks POST
ja räsi-tagasilugemine ei tõenda kõigi privilegeeritud WEB-kirjutajate piirangut.
WEB intent/ready jääb blocked_write_settlement; 404/timeout/expiry/ready ei tõenda
kirjutuse lõppu, faili puudumist ega lõpetatud koristust ning ei vabasta mahukvooti.
Päris Storage/maht/CORS/hiline kirjutus, native-pilv ja terve müüja–ostja–anonüümse
lisamine → leidmine → detail/profiil → suhtlus → haldamine → kustutamine ootavad vastuvõttu.
Upload/avaldamine on suletud, SQL labs-only/API-closed. Energy/maksed/AI/otsingu lisad
ootavad; üldmootorit ega täielikku V1 kihti ei ehitata. STOP-il säilita failid/index/
raport/päevikud; ära korda, taasta ega tee käsitsi SQL-i/commit'i/push'i. Olemasolevate
kontode, kuulutuste, piltide või operatsioonipäevikute kustutamisluba puudub.

---

# V2 private publication WEB image — tested source contract, dormant

2026-10-13. This records the SAME fourteen reviewed candidate bytes, not an applied
migration or a live API. Base33b485b source is committed/pushed with matching user
Ready/Production evidence. Exact provenance: `../verification/v2-private-web-image-tests-20261013.json`.

## Source installation boundary

The limited source installer retains14 code/SQL/test/README files and11 documentation
paths (25 total;16 new/9 existing). It plans ONE current build and exact staging, no
SQL, application/native test replay, package install, commit/push, Storage or deployment.
Actual installation/build/staging exists only when recorded in its new result.json.
The historic lab README's NOT_RUN text is retained as tested bytes, not current instructions.
Existing images/attempts/uploads, price/identity/policy code and23 migrations remain unchanged.

## Implemented connection

`supabaseWebVerifier.ts` is the dormant server-only bridge to the EXISTING
`sanitizeListingImage` worker. No module-initialization network or live route is added.
The sequence is Auth user check → account/active identity/attempt/policy lock → one
per-slot processing claim → bounded authenticated source GET → actual source hash/size
→ existing sanitizer → detached owned output bytes/hash → DB-acknowledged write intent
→ ONE Storage POST without overwrite → full authenticated WEB GET → actual hash/size
→ renewed authorization/policy checks and persistent ready receipt.

Binding includes the actor, expected identity, attempt, slot, request/job/object IDs and
server-assigned exact source/WEB paths. No client path, MIME claim, verified flag, ETag or
successful upload response substitutes for the private DB receipt. Source bytes stay private.

`webImageContract.ts` validates the exact command/binding/intent/receipt shapes and copies
the sanitizer's mutable Buffer before the next await. A second owned copy is checked at
the HTTP write boundary. `webObjectHttp.ts` reads full, unencoded bodies with explicit
bounds and deadlines; redirects, partial ranges, malformed sizes or mismatching hashes
cannot produce readiness. The process-wide binary/native busy guard remains until completion.

Replay of a ready state returns the same receipt. A prepared state can only reconcile the
same exact object: no source reprocessing, new claim takeover, automatic POST retry,
overwrite or error-driven deletion. Unknown/lost claim or prepare responses may leave a
slot unresolved; the future UI must display that honestly and allow controlled cancellation.
Infrastructure/timeout errors are not mislabeled as invalid photographs.

## SQL composition and required cleanup fence

`01_web_receipts.sql` adds the guarded claim/prepare/readiness records and functions.
`02_close_write_fence.sql` is an explicit later lab composition replacing the relevant
predicates in two existing close function bodies, plus a cleanup INSERT guard. It does
not edit the earlier committed lab files or apply anything in the user's database.
All new access stays closed to API roles; temporary SQL test grants are not deployment grants.

A WEB object with acknowledged prepared intent remains `blocked_write_settlement` when
its attempt closes, including after a POST acknowledgement or ready receipt. Earlier
SOURCE fencing remains. Processing without a WEB intent can still enqueue a pending WEB
reference; a prepared/ready write cannot. No timeout/404/expiry/receipt settles an external
write, deletes a Storage file, releases quota or completes cleanup. The actual bounded
persistent worker and terminal deletion must be joined before activation.

## Bounds retained from tested source

SOURCE≤25MiB; WEB≤4MiB, edge≤2048; existing pipeline listing-web-v1 and native12-second
supervisor unchanged. One binary/native operation per Node process; source GET/POST/full
readback each≤30s. Processing window120s, send-start window30s. These windows do not revoke
an already sent remote write. Cross-process limits, full-size/mobile behavior and CORS
still require real integration. No new general workflow engine is introduced.

## Actual accepted tests, not a repeat

Original Mac result `private-web-image-tests-20261013-211016-4zlepdv7.zip`:
SHA256 `0f7285998b71da76be18b4871f23966a63414e03d9fa3ca773c42a7e9f3f8174`.
85/85 Node/HTTP/connection tests, strictTS exit0; FOUR actual existing-worker cases are
INCLUDED in85. Node24.16.0/TS5.9.3/Sharp0.34.5/libvips8.17.3. JPEG/PNG/staticWebP flow
through actual local HTTP bytes/readback/receipt, animation rejects withoutWEBwrite.
New cases check receipt hash/size/dimensions and metadata removal, not golden-pixel
orientation/alpha fidelity. Auth/REST/Storage semantics are SYNTHETIC, not Supabase.

PG17.6 disposable helper:108 rollback +24 assertions in8 schedules +8 expected isolation
rejections =140. Seven guarded lock waits, one independent-account completion. Actual SQL
roles tested with temporary grants, not fullAuth/PostgREST. Helper removal is confirmed by
the exact runner's saved guards; raw full snapshots/inspect/lock replies were not shared.
Offline review118 checks did not rerun the tests. The source installer also reuses the
original proof without executing its runner, tests or SQL. A NEW current build is separate.

## Activation gates and full user journey

Canonical write-once POST and full readback do not restrict every holder of a privileged
Storage service key. Before activation prove the exclusive permitted WEB writers and
controlled deletion, with actual provider behavior; do not invent Storage policies or
change existing public listing-images links blindly. A receipt is not a public listing.

The same V2 work still needs final ownership/identity/policy/price/image readiness checks,
confirmed publication, public serving, real Storage/native-cloud validation, durable
bounded cleanup/terminal deletion, account/identity/message consistency and narrow unsafe
V1 writer closure. Verify creation→discovery→detail/profile→communication→management→deletion
with separate seller,buyer,anonymous sessions. Missing/ambiguous responses must not create
false success or duplicate listings. One visible Avalda kuulutus, no mandatory draft step.
Energy/payments/AI/search extras remain deferred; no fullV1 layer. Existing accounts,
listings, images and operation journals may not be deleted by this source step.
