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
