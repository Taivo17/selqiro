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

## Current addition — 2026-10-13 tested WEB-image source installation

The accepted base is 33b485b717591e01d0a67751c8aff42662f3e44a. The private-upload
source checkpoint is COMPLETE (17:56 commit/push/clean evidence, 18:20 matching user
Ready/Production screenshot). Do not repeat its finisher or ask for the screenshot again.
Last full local guard: 21:10:25.610189 Tallinn, clean main / 518 selected sources /
23 migrations. Saved observations do not replace fresh pre-write checks.

All fourteen WEB connection candidates are retained byte-for-byte from the accepted
85 Node/HTTP passes (FOUR native-worker connection cases INCLUDED) and 140 PostgreSQL17.6
helper assertions:108 rollback +24 across8 schedules +8 isolation rejections. Actual Mac
runtime:Node24.16.0/TS5.9.3/Sharp0.34.5/libvips8.17.3. HTTP transported real local bytes,
but Auth/REST/Storage semantics were synthetic; no Supabase/Vercel integration is claimed.

The source-only installer has25 paths:14 tested files plus11 documentation paths
(nine existing/two new). Its534 selected sources are not the full repository. Actual
write/build/staging results come only from private-web-image-source-install result.json;
this prewritten source document does not claim completion. Fresh whole-index/worktree/
source/migration/approved-remote checks precede writes. One new existing build is planned;
no85/140 or earlier117/108/195/109/119 suites, SQL, package install, commit/push or cloud action.

See v2-private-publication-web-v1.md and ../verification/v2-private-web-image-tests-20261013.json.
Existing sanitizer/worker, attempt/upload source, requirements and proof inventories stay exact.
The new explicit lab composition adds WEB intent/ready records and a WEB cleanup fence;
it does not edit prior lab files or apply a migration. No API/form/bucket/grants are enabled.
A ready receipt is not publication or a restriction on all privileged Storage writers.
Prepared WEB writes stay blocked_write_settlement even after ready. No404/timeout/expiry
settles the write or releases quota. Real Storage/native cloud, exclusive authorized
writers, final publish, durable bounded cleanup, terminal deletion and account/identity/
message consistency remain same-flow gates; seller/buyer/anonymous journeys need acceptance.
No general engine, full V1 layer, Energy/payments/AI/search extras or deletion of existing
accounts/listings/images/journals is authorized. Historical README NOT_RUN text stays intact.

---

## 13.10.2026 — privaatse üleslaadimise paigaldus üle vaadatud; sama lähteetapi lõpetamine

14 testitud üleslaadimisfaili on paigaldatud muutmata kujul. 15:22 Maci build läbis
väljumiskoodiga 0 (Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3); privaatset
build-stdout'i pole välises ülevaatuses loetud. 117 SQL- ja 108 transporditesti on
varasem vastuvõetud tõend, mitte selle lõpetaja uus käivitus. V1 STOP säilib ajaloona.
Algne paigaldustõend: private-upload-source-install-20261013-152156-9jwoxw_a.zip,
SHA-256 ba5b2428d894a113fbc67d46fc7d40e4aaeb055ebb989f82490e472a28b06024.

Üle vaadatud paigalduse lõppvaatlus 13.10 kell 15:22:17.544753 Tallinn: main/b3264d1,
24 staged rada, kõrvalmuudatusteta; see tööpuu ei olnud puhas ega uus commit valmis.
Ainult sama lähteetapi eraldi kontrollitud lõpetaja võib pärast värsket HEAD/index/
tööpuu/518 allika/23 migratsiooni/approved remote-kontrolli muuta üheksat ulatuses
olevat dokumenti ja teha ühe 24-rajalise commit'i ning ühe mitte-force main-push'i.
Kõik 14 testitud faili, nõuded ja testiinventuurid säilivad. Build'i ega 117/108/195/
109/119 teste, paigaldajat, Dockerit, Supabase CLI-d või SQL-i ei korrata.

Tegelik commit/push/clean/remote loe uuest private-upload-source-finish tulemuse
result.json-ist ja commit-proof.json-ist. See ette kirjutatud dokument EI kinnita
neid toiminguid eduks. Pärast sama tulemuse ülevaatust jätka otse muutmatu kontrollitud
WEB-pildi, lõppkontrolli/avaldamise, püsiva koristuse ja lõppkustutuse ühendusega;
uut dokumentide lõpetamise ringi ei tehta. Loakviitung/edukas PUT ei ole kontrollitud
pilt; tokeni aegumine/puhastus ei tõenda faili puudumist ega vabasta kvooti. Päris
Storage HTTP/maht/CORS/hiline kirjutus, native-pilve käivitus ning eraldi müüja/ostja/
anonüümse terve kasutajatee vastuvõtt jäävad avamise eeltingimusteks. Konto/identiteedi
ja sõnumite kooskõla peab säilima. Upload/avaldamine on suletud, SQL labs-only/API-closed.
STOP-il säilita failid/index/päevikud; ära korda, taasta, rakenda SQL-i ega tee käsitsi
commit/push-i. Olemasolevate kontode/kuulutuste/piltide/päevikute kustutamisluba puudub.

---

## Current addition — 2026-10-13 tested private-upload source installation

The accepted source base is b3264d136871bb5126b418cc78662cfd29f9f3d5; the earlier
cb6b68b staged/unfinished instructions below are history. Commit/push/clean source finish
was accepted at 11:34 Tallinn, with a separate user Ready/Production screenshot at 11:35.
The last full local guard was 14:22:11.797339 Tallinn, not a fresh observation now.

The fourteen upload candidates are retained byte-for-byte from the accepted v2 PG17.6
helper proof: 89 rollback + 24 assertions in 8 schedules + 4 isolation rejections = 117 PASS.
The 108 Node/TypeScript passes are the original v1 Mac proof, reused without re-execution.
Real local HTTP used synthetic Auth/REST/Storage; it was not a cloud integration test.
The original v1 STOP and preparation-time lab README remain unchanged historical evidence.

This source-only installation has 24 paths: 14 tested files and 10 documentation paths
(eight existing, two new). Its 518-file selected export is not the full repository. Actual
installation/build/staging status comes from the new private-upload-source-install result;
this prewritten document does not assert completion. Fresh whole-index/worktree/source/
migration/approved-remote guards precede writes. One new existing build is planned; no
117/108/195/109/119 suites, SQL, installs, commit/push or cloud actions are replayed.

See v2-private-publication-upload-v1.md and ../verification/v2-private-upload-tests-20261013.json.
No route, form, bucket or API grants are enabled. A durable upload receipt is not a verified
image or publication. Token expiry/purge does not settle external writes, delete Storage
objects, release quota or finish cleanup. Immutable sanitized WEB persistence, final publish,
bounded durable cleanup and irreversible deletion remain SAME-flow activation gates, along
with account/identity/message consistency, narrow unsafe V1 writer closure and actual
seller/buyer/anonymous end-to-end acceptance. No general engine, full V1 layer, Energy,
payments, AI or search extras are added. Existing accounts/listings/images/journals remain.

---

<!-- SELQIRO_PRIVATE_ATTEMPT_INSTALL_REVIEWED_FINISH_20261013 -->
## 2026-10-13 — actual private-attempt installation reviewed; same source checkpoint completion

The source installer has already run. Its unchanged result is
`publication-attempt-source-install-20261013-100540-z_s6nsyk.zip`, SHA-256
`6cdb59d5531992ad92e33d530183c6d16fb40ddce2d457e12c945019caf38b0e`.
Independent offline review accepted all 502 selected sources and the exact 28-path overlay.
All eighteen tested files are installed/staged byte-identically. All 23 migrations,
existing application modules, dependencies and the dormant image verifier are unchanged.
A new actual Mac build exited zero on 13 October 10:05:56 Tallinn; its private stdout
was not independently read. Node24.16.0/npm11.13.0/Next16.2.1/TypeScript5.9.3 were recorded.
The 195 SQL and 109 command tests are prior proof; neither they nor 119 native tests were replayed.
Last full local observation was 10:05:59.825383 Tallinn: main/cb6b68b, exactly 28 staged
paths and no unstaged extras, NOT clean. Last remote observation at 10:05:58.644430 matched
cb6b68b. Those are saved observations, not a present live view or proof of a new commit.

The separate source finisher keeps all eighteen tested files and the 28-path commit scope.
It amends eight documentation paths only; the approved requirements and test inventory stay
exact. Fresh actual Git/index/worktree/source/migration/approved-remote guards precede writes.
Its result.json, commit-proof.json and remote-observations.json determine the actual new
commit/push/clean outcome; this prewritten text is NOT proof that the finisher succeeded.
Read that result once. On STOP preserve partial state and journal; never retry/reset/restore.
After an accepted clean source finish, proceed directly with the SAME V2 private Storage,
immutable verified image, final publication, durable cleanup, terminal deletion and full
seller/buyer/anonymous journey. Do not start another documentation-only finish cycle.
SQL stays labs-only; upload/publication remains disabled. Push may trigger deployment,
but does not verify Ready/Production, cloud-native invocation or Storage HTTP behavior.
No authorization to delete existing accounts, listings, images or journals is granted.
Historical installation/test/next-action wording below is superseded, not a rerun instruction.

---
<!-- SELQIRO_PRIVATE_ATTEMPT_RETAINED_SOURCE_20261013 -->
## 2026-10-13 — retain reviewed private-attempt source; upload stays disabled

Current base is cb6b68bf2afedd138f18d0f1eccb0562d05e36cb: the image-verifier source
finisher completed commit/push/clean, and the matching Ready/Production screenshot was reviewed.
The later 12 October 23:38 v3 helper run passed 195 intended SQL assertions (157+36+2),
with 109 Node/TypeScript passes reused from v2. Own helper removal was verified.
Last full local source observation: 2026-10-12 20:38:26.647430 UTC, clean main/cb6b68b,
481 selected sources and 23 migrations; no fresh GitHub read during that test run.

This source package retains the same eighteen tested files, adds the approved requirements,
contract and proof inventory, and updates current docs. Its 28 paths/502 selected sources are
not proof of installation, build, staging or commit: read the new source-installer result.
Fresh actual Git/index/worktree/source/approved-remote checks precede writes; a new existing
build and the changed handoff check precede staging. No old test/SQL replay or production apply.
See `docs/architecture/v2-private-publication-attempt-v1.md` and
`docs/verification/v2-private-attempt-tests-20261012.json` for evidence and limitations.

The candidate remains a dormant lab and pure command module, not a live RPC or migration.
Private Storage, immutable verified images, final publication, durable cleanup, terminal
listing/account/identity deletion consistency and the whole seller/buyer/anonymous journey
remain activation gates. Cleanup references are not completed file deletion. Existing price,
identity, policy, horse, search and owner modules are preserved. No Energy/payments/AI/search
extras, general workflow engine or full V1 layer. Do not replay completed runners or delete
existing accounts/listings/images/journals. Historical NEXT wording below is superseded.

---
# V2 publication image verifier v1 — dormant server module

Date: 2026-10-12. Source parent/base: `c8da6f1d3e850ad35da9bf30ea76c8212b964696`.
Status: Mac native/source evidence reviewed; NOT a publication endpoint or deployment approval.

## Current evidence and narrow scope

The ordinary fields at c8da6f1 are committed/pushed and user-accepted in Vercel
Ready/Production. The subsequent Storage context is already collected and reviewed.
Do not repeat those completed steps. The source selection is 463 base / 481 result
files, not the complete checkout. Only the dormant image decoder, declarations,
tests/fixtures and documentation are added. No route imports it. Upload and
publication remain disabled; price, identity, policy, horse, search and owner
modules, all 23 migrations, package.json and package-lock.json stay unchanged.

Actual Mac run on 12 October 19:17 (+03): Node 24.16.0, Sharp 0.34.5 matching the
lock, libvips 8.17.3 and TypeScript 5.9.3; all 119 TAP cases passed without failures,
skips, cancellations or TODOs. The exact installer recorded successful npm run
build exit. Its private raw log was intentionally excluded and was not separately
read. Evidence: image-verification-source-20261012-191732-ga_qx0vo.zip, SHA-256
811e98e82e2528b0a99e3da6b9f93aa9b8960ba0d3ae17a3ed0df217e17fcd18.
All 490 archive files, 489 manifest hashes, 481 source triples and the 24-path
staged overlay were independently reconciled. Preparation on Linux Node 22.16.0 /
Sharp 0.34.1 / libvips 8.16.1 is older, separate evidence, not the Mac runtime.

The recorded 16:17:55 UTC Git state was c8da6f1 with 24 staged paths, no unstaged
changes and no commit/push. It is not a fresh live observation. A separate source-
only finisher updates seven documents and finishes exactly those same 24 paths,
preserving tested code/test/fixture bytes. Its own result must establish commit,
push and fresh clean/remote status. No image/application/SQL tests or build are
replayed merely for these documentation amendments. The handoff renderer is checked.

This source completion makes no database/Storage request or schema change. Push
can trigger the existing deployment automation; Ready status, native packaging,
HTTP uploads/expiry, cloud load and the end-to-end user journey remain unverified.
Existing accounts/listings/images/journals are not authorized deletion fixtures.

## Interface and authority

`src/server/listing-publication/images/sanitize.cjs` exports
`sanitizeListingImage(Buffer)` and the closed `PublicationImageError` code union.
`sanitize.d.cts` is checked using the actual strict TypeScript compiler.
The caller supplies bytes downloaded server-side from an authorized exact object;
filename, MIME, path and a client claim of being checked are not accepted as proof.
The result gives only image bytes, dimensions, format, recipe/engine and hashes.
It does NOT grant upload rights, mark a slot ready, create a listing or clean up.
The returned Buffer remains mutable: rehash the bytes actually uploaded and bind
that hash to the immutable sanitized object before recording readiness in the DB.

## Bounded recipe, not inferred deployment settings

| Limit | This module's enforced value |
| --- | --- |
| Original bytes | 25 MiB (26,214,400 bytes), matching the current V2 preview |
| Input formats | JPEG, PNG and WebP; true signatures plus full native decode |
| Input image | at most 40,000,000 pixels; each edge at most 16,384 pixels |
| PNG/WebP structure | bounded to 4,096 chunks; animated/APNG/WebP animation rejected |
| Public-format candidate | static WebP, inside 2,048 × 2,048, no enlargement |
| WebP | quality 82, effort 4, sRGB, maximum 4 MiB encoded output |
| Native operation timeout | 6 seconds; this alone is not a whole-request timeout |
| Parent subprocess deadline | 12 seconds, then SIGKILL; busy until process close |
| Framed header / stderr cap | 2,048 / 16,384 bytes; raw stderr never retained |
| Parallelism | one job per importing Node process, NOT a global/account quota |

EXIF orientation is applied before resizing. The normal encoder metadata-stripping
path is used; the actual output is checked for absent EXIF, GPS-bearing EXIF, ICC,
IPTC, XMP, comments and orientation metadata. Pixels may still contain visible
private information: this is NOT visual redaction, malware certification or a
promise that every device's photo will work. JPEG trailing material is not copied
into the output. Malformed or warning-producing decoding fails closed.

The child has only LANG, TZ and UV_THREADPOOL_SIZE in its environment. No shell,
Storage/DB credential, NODE_OPTIONS or NODE_PATH is passed. stdout is a size-bound
binary protocol; decoder failures return fixed codes, not source metadata or
native diagnostic text. Real process termination is stronger than rejecting a
Promise while native work continues. Nevertheless this is NOT an OS sandbox or
hard resident-memory limit: process memory, concurrency across function instances,
native dependency patching and Vercel packaging need integration verification.

## Actual tests, separated from simulations

- Real native decoding and child processes: synthetic JPEG/PNG/WebP fixtures,
  alpha, resizing and no enlargement, corrupted/truncated input, size limits,
  output hashes, immutable input snapshot, native warnings and single-process busy.
- Eight EXIF orientation values: check actual quadrant pixel positions as well as
  dimensions. Real EXIF GPS/ICC and PNG text/XMP-bearing cases lose metadata.
- Actual 12-second parent deadline and process death use the unchanged supervisor
  with an intentionally hung SYNTHETIC worker; this is not a native exploit test.
- Synthetic child pipes/events/clock test protocol, bounded output, errors and
  races deterministically. The separate TypeScript case is a real compiler run.
- Fixtures are generated, never copied from user photos. Their generator is
  provenance, not a build step or new runtime dependency. Fixture hashes are stored.

No real Storage request, signed-token expiry test, browser upload, SQL/RLS test,
account/identity switch, public listing view, deletion or production action was run.
A green module test/build must not be relabelled full publication acceptance.

## Integration decisions that remain before enabling publication

1. Private durable attempt/slot ownership, expected active identity and idempotent
   request key must be checked and persisted before issuing any upload capability.
   Use the existing price normalizer and policy/identity contracts, not new copies.
2. Browser originals go directly to a NEW private bucket with a deliberately chosen
   size limit. The saved public listing-images bucket is 10 MiB; this module's
   25 MiB does not change that bucket or bypass its policy. Old public links survive.
3. For the examined Supabase createSignedUploadUrl interface, documentation says
   two-hour validity and no further authentication for the bearer. Client logout,
   route closure or a five-minute attempt timer cannot revoke that capability.
   Exact expiry, no-upsert/replay behavior and late upload settlement require real
   API integration. Retain exact paths beyond the latest issued capability plus
   verified settling margin; do not mark cleanup complete merely after an early
   404. A cleanup tombstone must still cover a late object.
4. Re-encode to a separate immutable server-owned key, never the original key.
   The ready DB record must identify the actual object and digest. No client
   overwrite/delete policy may mutate it after verification. Losing a network
   response is not proof that either storage or DB writing failed.
5. Final publication rechecks actor/current identity, current accepted policy,
   exact price and all selected immutable ready images in one defined contract.
   Never insert private content into broadly readable listings as a mere draft.
   The existing closed creator's early active row cannot be wired unchanged.
6. Exact cleanup tasks must survive cancellation, expiration and terminal deletion,
   protect live/published images and run through the Storage API. Never delete
   storage.objects metadata via SQL. Persist file references before deleting their
   source rows. Deleted request receipts must never recreate content on replay.
7. Add an explicit Sharp runtime dependency/packaging contract before importing
   this module into a deployed endpoint. Verify the child worker and native assets
   in actual Vercel output, function deadlines/memory, bounded download, account
   quotas and durable retries. The existing transitive dependency is sufficient
   only for this dormant source/test stage, not a deployment promise.

## Whole journey: blockers versus later conveniences

Before enabling: coherent price/currency/images/identity/visibility in anonymous
search, detail, profile and owner views; seller contact using existing messaging;
real buyer/owner/anonymous sessions; owner management and terminal deletion;
uncertain response recovery without duplicate creation; V1 writers cannot damage
V2 content. Use only specifically authorized NEW fixtures for deletion tests.
All existing accounts/listings/images/journals must remain untouched.

Minimal operations evidence: failed attempts, pending cleanup age, bytes and safe
error codes; do not copy private contents into logs. Full phone/navigation/onboarding
acceptance belongs to launch. Currency memory, AI, Energy, payments and richer
search are not prerequisites for this publication connection. A general workflow
engine and V1 complete compatibility are explicitly out of scope.

## Primary interface references, consulted 2026-10-12

- https://sharp.pixelplumbing.com/api-output/ (metadata defaults; native timeout)
- https://sharp.pixelplumbing.com/api-operation/ (auto-orientation)
- https://sharp.pixelplumbing.com/api-constructor/ (decoder and pixel limits)
- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
- https://supabase.com/docs/guides/storage/management/delete-objects

Current user-approved requirements: external
`selqiro-20261012-kinnitatud-v2-avaldamisnouded(1).md`.
