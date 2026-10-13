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
<!-- SELQIRO_V2_IMAGE_VERIFIER_SOURCE_REVIEWED_20261012 -->
## 2026-10-12 — Mac image verifier verified; source-only completion checkpoint

This entry supersedes the earlier pending-Mac image-verifier preparation wording.
The ordinary fields at base c8da6f1d3e850ad35da9bf30ea76c8212b964696 were already
committed/pushed, Ready/Production and user-accepted. The subsequent Storage reader
is complete. Historical NEXT entries below are not current execution instructions.

Reviewed actual Mac evidence: image-verification-source-20261012-191732-ga_qx0vo.zip,
SHA-256 811e98e82e2528b0a99e3da6b9f93aa9b8960ba0d3ae17a3ed0df217e17fcd18.
All 490 entries / 489 manifest hashes, 481 source triples and the exact 24-path
staged overlay were reconciled. Mac Node 24.16.0 / Sharp 0.34.5 / libvips 8.17.3 /
TypeScript 5.9.3 ran 119 passing TAP cases, with no failures, skips, cancellations
or TODOs. Native/synthetic fixture distinctions remain in the image contract.
The exact known installer records a successful real npm run build exit. Its private
raw build log was intentionally not exported; warnings were not independently read.

Recorded final state at 2026-10-12 16:17:55 UTC / 19:17:55 Europe/Tallinn was main
at c8da6f1, exactly 24 staged paths, no unstaged changes: NOT a clean worktree.
Commit/push were NOT_RUN then. That recorded observation is not fresh Git evidence.
The separate source-only finisher amends seven documents, preserves every tested
code/test/fixture byte, checks fresh Git/index/source/remote, then commits/pushes
only the same 24 paths after COMMIT PUSH consent. Read its actual result for the
new commit, push and clean/remote status; this prewritten entry does not prove them.
It does not rerun image/application/SQL tests, native dependencies or the build.
Only the current handoff renderer is checked for the amended documentation.

The image verifier remains dormant: no route/client/Storage integration or upload,
publication, cleanup or deletion is enabled. All 23 migrations, dependencies and
existing app/price/identity/policy/horse/search/owner modules are unchanged.
Push may trigger the existing deployment automation; neither its completion nor
worker/native packaging is established here. Direct Sharp dependency, deployed
native assets, real Storage HTTP/limits and whole-journey acceptance remain open.

After a verified clean source completion, continue the SAME V2 private publication
attempt, immutable server-owned objects, final publish, durable cleanup and terminal
delete using the existing price/identity/policy modules. Recheck permissions and
accepted rules at final publish; prevent duplicates and resurrection on replay.
These are activation blockers, not later convenience features. See the image and
ordinary-creation contracts and the separately approved 12 October requirements.
No broad collector, general workflow engine, complete V1 rewrite, Energy, payments,
AI or search extras. Do not rerun completed installers/readers/finishers/SQL/applies.
Existing accounts, listings, images and operation journals are not deletion fixtures.

---
<!-- SELQIRO_V2_ORDINARY_FIELDS_SOURCE_ACCEPTANCE_20261011 -->
## 2026-10-11 — V2 ordinary-listing fields accepted for source completion

The 11 October 21:00–21:01 (+03) copy-correction run passed 367 Node checks
and the real Mac build. Evidence: `v2-listing-create-copy-20261011-210030-5kgvwfit.zip`,
SHA-256 `46129e936a1d0a5eae310ca308770638dc60aa58e5648f85f76b63daa7e9701b`.
All 1,935 archive entries / 1,934 manifest hashes and 463 selected source triples
were reviewed; the combined 23-path staged patch reconstructs those sources and
reverses to the 451-source HEAD baseline. HEAD stayed at `62afc1f`; source was
staged, not committed. The 21:13 repeat was blocked before new writes/tests/build.
A temporary assistant-side file-processing failure did not change the project;
the original successful archive is now readable and reviewed. Do not rerun either installer.

User browser evidence: initial field tests found no errors; ordinary/horse/ordinary
preserved ordinary input. Desktop/narrow screenshots show manual text guidance,
neutral primary-image copy and all eight Estonian truck-field labels. Image-order
interaction and category Cancel are not separately demonstrated by screenshots.
Node checks use actual modules with synthetic hooks/JSX/API, not React DOM/HTTP.

This entry accompanies `Add V2 ordinary listing fields with clear manual input`.
The finisher changes only seven documents, preserves sixteen implementation/test
files, checks three offline generators, builds, then asks COMMIT PUSH for exactly
23 paths. Read its actual result for the new commit/push/clean/remote status.
Prepared documentation is not proof of execution; deployment is checked separately.

Publication and image upload remain disconnected. The 154-currency input contract,
23 migrations, price laboratories, horse owner saves/editor, and existing renewal
remain unchanged. No AI call, Energy/payment, FX, remembered currency or price-order
feature is introduced. All current accounts/listings are user-declared test data;
that is not deletion consent or permission to weaken authorization.

After reviewed source completion, verify the exact deployment and a read-only
/v2/sell smoke check. Next implement the SAME V2 upload/publication flow from the
already exported source: private pending images, verified identity and versioned
rules acceptance, confirmed publication and duplicate/uncertain-result handling.
The tested creator currently makes an active row before images: do not wire it
blindly. Retire risky V1 writes narrowly rather than rebuilding V1 compatibility.
Review shared storage/delete and account/admin interactions before activation.
No new broad collector, price lab, AI/search feature or Energy work is required
merely to finish this input checkpoint. Preserve all old evidence and journals.

---
<!-- SELQIRO_V2_ORDINARY_COPY_CORRECTION_20261011 -->
## 2026-10-11 — V2 ordinary creation: truthful copy and Estonian truck labels

The preceding fields installer ran on the user's Mac at 14:19–14:20 (+03):
332 Node checks and the real build passed. Evidence:
`v2-ordinary-listing-fields-20261011-141958-k5rlnhdj.zip`, SHA-256
`3159faa42f547f6d32231e786559a79f5cf71f4408ea66c0cb941c8a77a34198`.
The reviewed final state was HEAD `62afc1fadd995876621ea4e6941c0c0cd7b4e4f8`,
20 staged paths, no extra unstaged/untracked files. That was NOT a new commit/push.
The user reported no browser errors and confirmed ordinary → horse → ordinary
input preservation. Sixteen desktop/narrow screenshots show price validation,
local image previews and the deliberately disabled publish action. Category OK
clears category-specific details by contract; Cancel was not separately reported.

This is a copy-only correction within that same unfinished creation checkpoint.
It changes ordinary text guidance, three JSX text blocks in the shared image
preview, and adds exactly eight FIELD_LABELS.et entries to lib/categoryFields.ts.
The shared image label is now “Põhipilt”; neither an empty preview nor its main
image claims AI is running. Horse-specific guidance/AI placeholder, existing
horse draft/policy controls and all shared event/effect logic remain unchanged.
This scope does not claim all future AI wording throughout the portal was removed.

Truck detail labels: axle_configuration → Telgede konfiguratsioon;
gross_weight → Täismass; empty_weight → Tühimass; payload → Kandevõime;
load_space_length/width/height → Koormaruumi pikkus/laius/kõrgus;
tachograph → Sõidumeerik. Only display names change. Category keys, schema,
English fallback, field order, raw input, units and existing translations remain.
Other consumers of this existing shared dictionary receive these same labels.

New tests exercise the ACTUAL shared text/image components and actual detail
renderer, not placeholder versions of those components. Hooks/JSX/object URLs
remain simulated: this is not React DOM/Next/browser or an upload test. Existing
332 tests remain unchanged. The correction requires these regressions, three
offline generator checks and a fresh Mac build before exact staging.
Read the NEW correction result for actual execution; this entry is a candidate
contract, not proof that its tests, build or browser review have already passed.

Correction scope: 11 file writes (three runtime, one new regression suite, seven
documents); final combined checkpoint: 23 staged paths, 463 selected sources.
No commit/push, package installation, SQL, Docker, Supabase, deployment, application
row operation, Storage request or AI request is part of the correction runner.
All 23 migrations, price contracts, currency registry, input/state/save logic,
validation, disabled publication and image actions remain unchanged.

NEXT: review correction ZIP and a brief desktop/narrow copy check, then finish this
SAME 23-path creation-fields checkpoint with separately confirmed commit/push.
Do not rerun the original installer or earlier completed production/diagnostic
runners. Preserve existing staged files, logs and old operation journals on STOP.
After source completion continue V2 upload and verified publication using existing
contracts; no separate full V1 compatibility project. Currency memory and local
price-search grouping are proposals, not implemented by this copy correction.
Energy/payments remain deferred until core flows and visible actions work.

---

# V2 ordinary listing creation — one form, staged integration

11 October 2026. This document accompanies the local-only ordinary-field candidate.
Read the returned installer report for actual test/build/staging results. No commit,
production activation, publication or browser acceptance is implied by source files.

## Approved priority

The user confirms all three present accounts were created by them and the current
listings are test listings. V2 creation must work without V1. Full V1 compatibility
is not a requirement: retire an unsafe legacy write path rather than rebuild V1.
This is not authorization to delete accounts, listings, photos, messages or journals.
User statement is not a database count or proof of closed registration/API access.
Shared auth, identities, messages, services and working horse owner editing remain.
Energy/payments wait until core flows and visible actions/links work.

## This implemented slice: local inputs, NOT publication

The existing `/v2/sell` user-keyed form now composes ordinary category, condition,
price/currency, coarse country/city and applicable detail inputs. Shared title,
description and local image selection remain; horse fields/save/policies are unchanged.
The ordinary branch no longer presents a paid 25-Energy category-assist placeholder
or an instruction to use `/sell`. No AI or Energy invocation is introduced.
Mobile navigation is unchanged in this slice; its `/sell` destination is not a
statement that V1 has been retired. Browser testing opens `/v2/sell` explicitly.

The primary `Avalda kuulutus` button is disabled with an explicit explanation.
A pure local input check never changes this: valid syntax does not prove a successful
save, valid photo upload, account authorization or accepted publication rules.
There is no extra mandatory draft/confirmation stage, backend write, request ID,
local/session storage, cookie, geocoding query, upload, AI request or price API call.
Reload discards current input; the UI says so. Full unsaved-navigation protection
belongs to the actual submit connection, not a claim made by this field slice.

## Reuse and explicit rules

- `lib/categories.ts` is the one taxonomy. Actual ancestry must match. The UI requires
  the last offered level (stricter than the closed SQL lab's accepted prefixes).
  Tests compare all 187 existing prefixes to the stored creation path inventory.
- `lib/categoryFields.ts` determines fields for the complete path. Condition appears
  once. Other detail values remain named free text; no guessed enums or conversions.
  Changing category with entered details asks for confirmation, clears only details
  on consent and preserves text/images/price/location. Cancellation preserves selection.
- `listingPriceInput.ts` and the frozen 154-code currency registry are reused unchanged.
  Amount is text, never Number/parseFloat. Comma or dot explicitly means DECIMAL;
  thousands separators/exponent/symbol/mixed separators are rejected. Currency scale
  errors are shown, never rounded. No currency is inferred from country or language.
  Four kinds: fixed, free, negotiable, unspecified. Fixed zero remains fixed zero.
  Selecting a nonfixed kind deliberately clears irrelevant amount/currency inputs.
  The normalized amount and unambiguous currency code are shown before future submit.
- Country/city are required by the UI and remain coarse text. The existing 22-country
  list supplies optional suggestions, not an all-country allowlist. Other country
  names are allowed. No GPS, exact address, lookup or inferred currency. Coordinates
  are a paired null in this slice's new-row input, not an existing-listing update.
- Text is validated by the existing `normalizeListingEditableBasics`; raw form text
  is not rewritten. The shared horse text guidance and provenance are unchanged.
- Details are selected-key-only strings, bounded and checked for NUL/unpaired
  surrogates. Seven explicit attribute keys are sent once via `attributes`; notably
  engine is not also sent as a duplicate details.engine. Existing server mirrors
  remain that server contract's responsibility. No brand->vehicle_brand inference.
- Input has the exact existing closed row-contract groups: basics, price,
  category_path, location, attributes, details, language. `et` is the current fixed
  form-language tag, not a claim that language was detected from user prose. Actor,
  status, deadline, IDs, image URLs, policy evidence and Energy are not form payload.
- The DTO is preparation for the existing creation contract, not an exposed endpoint.
  Server validation remains required; client validation is not a security boundary.

## Current server and photo limits — do not activate an edit-only release

At reviewed source `62afc1f`, the price edit composition refuses structured INSERT.
The earlier closed creator `09_owner_create.sql` creates an active row and a receipt
before any browser image upload. Do not wire that directly to a button and call the
full workflow atomic. Row creation idempotency is useful and should be reused, but
image attachment and final public visibility need a controlled combined connection.

`uploadListingImage.ts` currently uploads an object, calls `add_listing_image_v2`,
and attempts object removal on any caught RPC error. An uncertain transport reply
does not prove the image row was not committed. Do not copy that catch-all cleanup
into a new publish flow or retry row creation with a new key after a lost reply.
This is a source-level boundary, not an observed lost-photo incident.

Before enabling publication, use the existing creation/price/identity contracts and
make the listing public only after its required images and rules are confirmed.
Any internal staging remains invisible as a mandatory user draft stage. An unknown
reply must retain/recover the same attempt and listing ID, not create a second row.
Choose the smallest tested connection; do not add a general workflow engine.

Legacy V1 whole-listing deletion is files-first and conflicts with the proposed
structured DELETE guard. Close the unsafe path narrowly as part of V2 activation,
including its backend authorization, rather than build a full V1 deletion service.
Hiding this form's /sell link does NOT close that path. Preserve V2's working single-
image actions. Account/admin deletion and Storage permissions remain launch checks.
No existing applied migration or generated fixture gate is changed by this slice.

## Validation and next action

New suite: 236 actual-model/synthetic-JSX cases, including the existing path inventory,
exact huge amounts, fixed zero, precision errors, category cancellation, applicable
fields, payload bounds and ordinary/horse branch isolation. Together with 57 existing
horse-draft-repeat and 39 wording cases: 332 tests, no skip/cancel/todo. Recheck the
actual log for pass counts; the tests are NOT React DOM, SQL, HTTP or a browser.
Pure modules undergo an actual strict TypeScript check. The real full Next/React
build is run by the local installer, not inferred from transpilation tests.

One next action after local installer PASS: targeted read-only browser check of
`/v2/sell` on desktop and narrow layout; no horse save/policy button clicks needed.
Check category/details, exact currency preview, three nonfixed modes, free-text
location, branch switching and visibly unavailable publication. Return the ZIP and
result. Finish this same source checkpoint only after review; do not stack a new patch.
Then connect image completion, current policy validation and server-confirmed publish
within this SAME V2 creation workflow and test the new listing on all four surfaces.
