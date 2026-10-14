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

# V2 private publication upload v1 — source contract and activation boundary

Recorded 2026-10-13. Base b3264d136871bb5126b418cc78662cfd29f9f3d5. This
source package is dormant. Actual installation/build/staging is evidenced by the new
private-upload-source-install result, not by this prewritten document.

## Exact tested implementation

Fourteen files are retained byte-for-byte: five TypeScript modules (shared grant model,
bounded HTTP adapter, browser direct PUT, server issuer and server-only environment
composition); the upload grant SQL lab; the Node test; the lab README and six SQL
fixture/expectation/schedule files. Existing attempt, price, identity, policy and image
verification modules are reused, not replaced. No route or form imports the broker yet.

Auth get-user validates the actor. The existing user-context reservation binds account,
expected active identity, attempt, ordered slot and exact server-selected SOURCE object.
A trusted SQL service-role claim is a durable one-winner signing fence, not a takeover
lease. External Auth/REST/Storage requests do not run inside a database transaction.
One signing request is allowed only after acknowledged claim persistence. The provider
response is recorded durably before an authorized owner read releases the token.

A lost receipt/application acknowledgement can recover the same recorded token on a new
explicit request. A lost signing result must remain uncertain; a second caller cannot
mint another URL for that slot. Late receipts may be kept for bookkeeping after cancel,
identity change or expiry, but release rechecks actor, identity, policy, attempt and time.
Decoding provider iat/exp/path is a consistency check, NOT JWT signature verification or
user authentication. The token is a bearer secret stored in a non-API-readable table.
A bounded SQL purge erases only the expired secret, not object references or quota.

The browser sends one PUT directly to the selected private Storage path after checking
context generation, Blob size and copied-byte SHA256. It sends no service credential,
does not automatically retry, overwrite or delete on an uncertain response. The only
success result is upload_acknowledged_needs_verification. It does not mark image readiness,
create a public listing row or turn the raw source into a public image.

## Accepted test evidence, not current production configuration

See ../verification/v2-private-upload-tests-20261013.json for exact candidate/proof hashes.
Actual 2026-10-13 14:22 PG17.6 disposable helper: 89 rollback assertions, 24 assertions in
8 two-connection schedules, 4 expected READ-COMMITTED-only rejections = 117 PASS.
Seven schedules observed blocking; one independent account completed before first commit.
The two other-actor literals in suite.sql were corrected before this successful v2 run;
42501/publication_account_changed and the authenticated SQL-role expectation were retained.
The other thirteen candidate files were unchanged. Temporary real SQL role grants were
inside tests, not production privileges or full Auth/PostgREST/Storage acceptance.

108 Node/TypeScript passes are the original v1 Mac evidence, Node24.16.0/TS5.9.3; v2 did
not rerun them. Real loopback HTTP, fetch, bytes and aborts used synthetic Auth/REST/Storage.
The original whole v1 STOP remains unchanged. This package does not replay those suites,
the earlier 195/109/119 tests or any production SQL. The helper was removed. Raw lock
polls, Docker inspect and the full Git index were not exported; corresponding claims are
exact-runner guarded observations, not new independent raw/live measurements.

The lab README preserves its preparation-time NOT_RUN wording as historical bytes. It
must not be treated as permission to repeat a completed runner or to apply the lab SQL.

## Fixed candidate bounds and required real integration

The existing candidate allows source <=25 MiB, a 120-second browser PUT deadline,
10-second RPC budgets, 16 KiB bounded response (Auth 64 KiB), token <=4096 chars, a
30-second service send window, expected 7200-second provider token lifetime and 60-second
clock tolerance. Existing attempt/slot/account quotas are unchanged. These are tested
candidate values, not an assertion about the current cloud configuration or mobile reliability.

Storage uses application/octet-stream for quarantine. Real private-bucket ACL/CORS/size,
no-upsert/token lifetime and authorized RPC-role behavior must be tested before routing
traffic. The standard PUT path is not resumable/TUS; the preserved README documents the
provider's >6 MiB recommendation and full 25 MiB/mobile acceptance boundary. No new upload
library or dependency is introduced by the source installer.

A timeout, logout, token expiry, early 404 or secret purge does NOT settle a possibly late
external write, delete a file or release quota. Existing dispatched SOURCE cleanup remains
blocked_write_settlement. A real bounded reconciliation/cleanup worker and write-settlement
contract are mandatory; a queued object reference is not successful deletion.

## Source installation and single next action

14 exact tested new files plus 10 document paths: 24 total (16 new, 8 modified).
The selected-source export becomes 518, not a complete repository. All 502 pre-existing
files except the eight declared documents stay exact; 23 migrations, package files,
approved requirements, prior proof inventories and the existing image verifier do not change.

The installer verifies fresh actual base/parent/whole tree/index/worktree, new targets,
selected files, migrations and approved origin/main. It backs up the eight documents
externally, writes only the package, checks only the changed current handoff, runs one
new existing npm run build and stages only the 24 paths after passing guards. No SQL,
package install, Docker/Supabase, module test, commit/push or Storage operation occurs.
The existing build may read local .env files; it is not a network/OS sandbox. Its raw
output remains private, with exit/byte-count/hash receipts in the shareable report.

Review that actual result once; finish only the same exact source checkpoint under
fresh guards, then continue immutable sanitized WEB persistence, final publication and
durable cleanup/terminal deletion. Do not layer an unreviewed patch on partial staging.
On STOP preserve files/index/journals; no reset/restore/automatic rerun is authorized.

## Same V2 user journey and launch gates

The existing image sanitizer output must be owned/copied, rehashed and stored at an
immutable server-allocated WEB object before readiness. Final publication must atomically
recheck rights/identity, policies, exact price and selected verified images. Old replay
must not recreate a terminally deleted listing. Account/identity erasure and message
retention must agree with object cleanup and any retained tombstone references.

Accept add -> discover -> detail/profile -> contact -> manage -> delete under distinct
seller, buyer and anonymous sessions, with matching price/currency/images/identity and
visibility across readers. Close only legacy unsafe writers that could damage new data.
A Ready deployment, owner page load or lab PASS is not that journey's acceptance.
Failed attempts, cleanup age and reserved bytes need bounded operational visibility
without private payloads or bearer tokens in logs. These are prerequisites, not polish.
No general workflow engine, full V1 layer, Energy/payments/AI/search extras are added.
Existing accounts, test listings, images and operation journals must not be deleted.

## Source references

Approved user requirements: v2-publication-requirements-approved-20261012.md.
The unchanged lab README retains the previously checked provider/SQL primary references.
Their descriptions are not a fresh observation of the user's deployed provider version.
