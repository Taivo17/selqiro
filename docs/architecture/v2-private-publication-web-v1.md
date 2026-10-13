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
