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
# V2 private publication attempt v1 — reviewed source retention

Recorded: 2026-10-13. Base: `cb6b68bf2afedd138f18d0f1eccb0562d05e36cb`.
Status: reviewed module/SQL candidate; source-only installation package. **Not an enabled API or production migration.**
Actual installation/build/staging status must come from the new installer result, not this prewritten document.

## Current evidence — replaces historical next actions

The dormant image verifier is committed/pushed at cb6b68b, with a user-provided
Ready/Production screenshot. Its installer/finisher and the Storage context reader are complete.
The 12 October 23:38 v3 helper run then passed 195 intended PostgreSQL 17.6 assertions:
157 rollback checks, 36 assertions across twelve two-session schedules, and two expected
REPEATABLE READ/SERIALIZABLE rejections. Ten schedules observed the expected blocking PID;
two observed another account completing before the first account committed. The helper was removed.
The 109 command-module tests and strict TypeScript check are retained v2 PASS proof, not new v3 execution.
The v1/v2 STOP records are not rewritten. None of these runners should be replayed.

The exact evidence inventory and all eighteen tested file triples are in
`docs/verification/v2-private-attempt-tests-20261012.json`. The original v3 ZIP is embedded,
unchanged, in the new source installer and its external result under `evidence/reviewed-v3-tests.zip`.
The approved requirements are retained byte-for-byte in
`docs/architecture/v2-publication-requirements-approved-20261012.md`.
The lab README and dependency fixture intentionally remain their original tested bytes;
their preparation-time future-tense/NOT_RUN statements are history, not current instructions.
This document and the current handoff supply the later evidence and next action.

## Retained implementation — no parallel source of listing truth

`src/server/listing-publication/attempts/prepareInput.ts` builds bounded immutable
command data. It uses the existing exact price wire normalizer and image selection limits;
it does not authenticate a session, authorize a write, persist data or issue a URL.
`tests/listing-publication-command.test.cjs` remains the exact tested module suite.

`supabase/labs/listing-publication-attempt-v1/01_private_state.sql` through
`05_close_attempt.sql` retain the helper-guarded SQL design. They remain under labs,
not migrations. Test fixtures/plans/expected labels accompany them without modification.
The SQL creates no active/public listing or public image URL. Its own schema/tables/RPCs
remain closed to the API roles, with no permissive RLS policy. Installation executes no SQL.

A private attempt binds account, expected active identity, request key, canonical listing
input and ordered image intent. Replaying the same bound request returns the same attempt;
changing its binding conflicts, and a terminal attempt is not reopened by old requests.
Existing price, category/basic-field, creation-value, actor/identity and versioned-policy
functions are reused. The dependency fixture contains 23 exact source declarations,
not a complete copy of the production schema or its role/authentication model.

Every image slot receives exact server-owned source and web-object references before a
one-time dispatch reservation. The durable reservation must commit before an external
Storage signing call. The current reservation is NOT a signed URL or an upload authorization
exposed to the client. Lost signing responses and late uploads still need a real transport contract.
The candidate bucket name does not create a bucket. The old public `listing-images` bucket
and existing public links remain unchanged.

Cancel/expire enqueue exact cleanup references in the same transaction before clearing
payload. A source whose external dispatch may have begun remains blocked pending external
write settlement. An early 404 or network timeout is not completion. A cleanup record is
NOT a deletion: the worker, persistent retries, terminal confirmation and quota release are
not implemented here. Retained account/identity references and replay tombstones likewise
are NOT a completed account-erasure or message-retention policy.

## Bounded design choices — not live configuration

One attempt: 24 hours, at most ten images, at most 25 MiB per declared source and 100 MiB
declared total. Each slot reserves the full source+web maximum, 25+4=29 MiB, not the
client-declared smaller size. The proposed account limits are three unexpired open attempts,
twenty new attempts per 24 hours and 300 MiB retained reserve. They are tested candidate
values, not production settings. A per-process image worker is not a cloud-wide load limit.

The SQL requires READ COMMITTED and uses the existing account/identity locking contract.
The policy selection is global listing/et-EE only and fails closed when active country-scoped
listing rules require an unresolved country selection. The form's free-text country is not
inferred into a policy ISO code from currency, language or search area. Horse policy remains separate.
The short policy SHARE lock, acceptance-row locks and expiry rechecks do not span an external call.
Real runtime permissions, contention/resource limits and HTTP authentication remain unverified.

## Source installation boundary

The new installer retains the eighteen files byte-for-byte, adds this contract, a compact
proof inventory and the exact approved requirements, and updates seven current documents.
Total scope: 28 paths (21 new, seven existing-document updates); final selected-source
export: 502 files, not a complete repository. Every existing application module, dependency
file, image verifier and all 23 migrations remain unchanged.

Before writes it checks the actual base/parent/tree, whole index, worktree, selected files,
new paths and approved origin/main. A fresh existing `npm run build` follows source writes;
only the changed current handoff is rendered/checked. No SQL, 109 command tests, 119 native
image tests, installs, Docker/Supabase CLI, commits or pushes run. A successful result leaves
exactly the 28 paths staged for review, not committed. Build failure or drift preserves files
and the new one-use journal; no reset/restore/retry occurs. Private build output stays on the Mac.
An existing Next build is not a network-isolation sandbox; the runner makes no DB/Storage call.

## Next integration and whole user journey

First review the actual source-install result, then complete that exact source checkpoint
under fresh guards. Do not add another application patch on unreviewed partial/staged work.
After that continue the SAME V2 publication connection, not a new general workflow engine:
private direct-to-Storage transport and recovery of late/uncertain issuance; immutable verified
web bytes/hash; final rights/policy/price/readiness checks; durable bounded cleanup and terminal
deletion. Old replay must not resurrect deleted content. Account/identity removal and message
retention must agree with that deletion contract without deleting existing test accounts.

Before enabling the user action, verify the entire path with distinct seller, buyer and anonymous
sessions: add -> discover -> detail/profile -> contact -> manage -> delete. Price/currency,
images, identity and visibility must agree across readers. Loading a page as owner is not an
anonymous visibility test. Close only the unsafe legacy V1 writers that could damage the new
objects and connect phone navigation to V2 when it really works; do not rewrite the whole V1.

These are activation gates, not optional polish. Failed attempts, cleanup age and reserved
bytes need bounded operational visibility without private payloads in logs. Energy, payments,
AI, remembered currency and search enhancements stay deferred. New upload/publication remains
disabled. No permission is granted to delete existing accounts, listings, images or journals.
