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

# V2 final publication, terminal content deletion and bounded cleanup — dormant source contract

2026-10-14. The SAME22 reviewed candidate files are retained without changes. This is
source installation, not a production migration, new route, worker schedule or API permission.
Base `9f3961defbc797518995947bb21196d3208b94b9` is committed/pushed with accepted user
Ready/Production evidence. Exact provenance: `../verification/v2-private-final-publication-tests-20261014.json`.

## Installation boundary

The source installer plans22 exact code/SQL/test/README files plus12 documentation paths:
34 paths (24 new/10 existing),558 selected outputs. ONE new current build and exact staging
are recorded only in the new result.json; this prewritten document does not claim execution.
No app/SQL/native test replay, package install, commit/push, database or Storage command.
Existing modules, approved requirements, previous verification inventories and23 migrations
remain unchanged. The lab README's preparation-time NOT_RUN remains historical tested bytes.

## Server transaction and narrow writer composition

finalizeListing.ts / finalContract.ts / supabaseFinal.ts validate strict account, identity,
attempt, request and canonical price shapes; Auth is checked before user-scoped RPC calls.
A server final confirmation binds the canonical intent, exact price and each selected
immutable ready receipt. publish_my_listing_v1 rechecks actor/active identity/membership,
current accepted policy, normalized fields and all selected images in the same transaction
that creates listing/image rows, with a wall-time policy check after insertion. No Storage
I/O is performed inside the transaction. Zero-image attempts follow the existing contract.

01_state through07_budget compose existing exact price/category/detail/location normalizers,
creation mapping, actor locks, policy versions, attempts, upload grants and WEB receipts.
Generated fragments are recorded in tests/derivation.json. A narrow NOLOGIN/NOBYPASSRLS writer
supports only the intended structured INSERT and authorized terminal DELETE; retained price
UPDATE/TRUNCATE guard branches remain exact. This is a lab composition, not an edit to an
already committed/applied migration or an open grant to a browser/API role.

The activity period starts once using the existing90-day contract. Same-request replay returns
the same outcome: no duplicate listing, renewal, implicit reactivation or resurrection.
Private content payload is cleared; minimal UUID/hash/request/object lineage remains durable.
Changing the form snapshot or image selection requires a different intent/request contract.

## Dormant media delivery

serveListingMedia.ts prepares, but does NOT install, the stable
/api/v2/listing-media/{attempt}/{ordinal} handler. It only reads an active, nonexpired listing
with active identity and its exact verified WEB binding. It checks actual full bytes/hash,
rechecks availability after Storage I/O, and returns no-store/nosniff responses. SOURCE and
private Storage URLs are not returned. Previously delivered images cannot be recalled from
a viewer. Route/UI performance, provider behavior and public/buyer/owner visibility remain
integration gates; this source step does not replace them with a simulated acceptance.

## Content deletion, message retention and nonresurrection

delete_my_published_listing_v1 rechecks current account/identity authorization, without forcing
new policy acceptance just to remove content. Shared-business membership follows the existing
identity contract; original publication replay stays tied to the original account.
Exact cleanup references are persisted BEFORE listing/image content and automatic listing
snapshots in linked conversations/messages are removed in the same transaction. Message text,
chat-owned attachments and participants survive. Existing SET NULL listing references and
narrow managed-image/write guards are included. At most500 linked messages and500 conversations
are processed in one transaction; larger cases or unexpected foreign keys fail atomically.
These bounds are not a finished large-history batching or complete account-erasure design.

content_deleted=true/state=deleting differs from deleted. All exact managed objects must have
acknowledged deletion before deleted (zero objects may complete immediately). A durable outcome
tombstone prevents an old publication request from recreating content. Account/identity erasure
is still RESTRICTed by retained lineage: the tested refusal does NOT implement account deletion.
Late/unlinked message snapshots and all actual writer paths need real integration acceptance.

## What cleanup CAN and CANNOT complete

cleanupOne.ts takes one persisted eligible object/lease, sends one Storage API DELETE, reads
absence through authenticated Storage access and acknowledges that same work key. No immediate
retry or second target follows a lost reply. A lease is60seconds, at most8 claims, with bounded
exponential retry wait up to one hour and a needs_attention outcome. A stale lease cannot finish
another worker's attempt. Counts, age and reserved bytes avoid copying private content into logs.

IMPORTANT: eligibility currently covers only immutable abandoned objects with NO issued SOURCE
dispatch and NO prepared WEB write. Normal issued SOURCE and prepared WEB objects remain
blocked_write_settlement, including files from an ordinary successful image publication.
THIS CANDIDATE DOES NOT YET SUPPORT THEIR COMPLETE FILE DELETION. A successful content deletion
must therefore be shown separately from pending/blocked cleanup. Time passing,404,expiry,
timeout or ready receipts do NOT settle delayed external writes; there is no fake unblock RPC.
Only acknowledged deleted reservations stop counting against quota. Actual late-write finality
and exclusive permitted provider/writer authority must be connected before publication opens.
Short tests do not wait through eight60-second leases or hour-long backoff periods.

## Accepted evidence, not replayed tests

Original V3 Mac result: private-final-publication-tests-v3-20261014-092645-s2o4ahyw.zip,
SHA256 bf5fd58521001aabb5655e435271b026cad22466b1f0f059a7a3d0ec5b474350.
PG17.6:103 rollback+30 assertions in10 schedules+10 expected isolation rejections=143PASS;
63 SQL commands exit0;16 expectedNOTICE lines, no ERROR/FATAL/WARNING. Eight guarded lock waits;
two progress cases are another cleanup object under the SAME account and independent-account
publication, not two independent-account schedules. Temporary SQL role/policy/replay/image/
snapshot/message/FK/bounded-refusal tests passed. Helper removed by saved exact-runner guards.
Full raw snapshots, lock PID replies, Docker inspect and entire Git index were not exported.

81 Node/HTTP tests and strictTS PASS are unchanged earlierV1 evidence, reused inV3 with zero
Node/TS/native execution. Prior Node24.16.0/TS5.9.3, real loopback HTTP with synthetic Auth/REST/
Storage semantics; no cloud acceptance. OriginalV1/V2 whole STOPs remain unmodified. Test-only
policy and service-role scenarios were repaired without changing implementation or expanding
permissions. Offline141-check review is evidence analysis, not141 additional application tests.
The source installer reuses this proof without executing supplied test runners, SQL or Node.

## Same V2 continuation and launch gates

Upload/publication remain disabled; SQL labs-only/API-closed. Wire the existing flow only after
actual delayed-write finality and bounded complete cleanup, exclusive privileged WEB writers,
providerStorage/CORS/large-mobile/late-response contracts, native cloud invocation, full live
schema/role integration, account/identity/message consistency and route/UI integration are
verified. Preserve shared price/identity/policy modules; narrow unsafe legacy writers, not a
new general workflow engine or fullV1 layer. Validate add→find→detail/profile→message→manage→delete
with separate seller,buyer,anonymous sessions. Unknown outcomes must not be shown as success.
One visible Avalda kuulutus action, no mandatory visible draft stage. After this same source
checkpoint is finished, continue actual integration rather than another docs-only finisher.
Energy/payments/AI/search extras wait. No existing account/listing/image/journal deletion is authorized.


## 2026-10-14 — lõppavaldamise ES2017 build-parandus (sama pooleli lähteetapp)

Algne 12:00 paigaldaja kirjutas34 rada, kuid build väljus1-ga; staging/commit/push ei alanud.
12:38 salvestatud logi diagnostika kinnitas TS2737: finalContract.ts:7:133 kasutas
9223372036854775807n literaali, projekti tsconfig.target on ES2017. Vana moodulitestide
kompileerimine kasutas ES2022; see ei kontrollinud tegelikku build-sihti. See oli
ettevalmistuse puudus, mitte kasutaja seadistusviga.

Samas ID-kontrollis asendatakse ainult literaal avaldisega BigInt("9223372036854775807").
Piir jääb täpseks; ei Number-teisendust, uut hinnareeglit, ES2020-sihttaseme tõstmist ega
tüübikontrolli väljalülitamist. Tsconfig/paketid ja23 migratsiooni säilivad.21 ülejäänud
testitud kandidaatfaili, sh kogu SQL ja vana81-testifail, jäävad muutmata. Algne143SQL
tõend säilib; vana81PASS on algse baitversiooni tõend, mitte muudetud faili uus täisvastuvõtt.

Uus tests/listing-publication-final-es2017.test.cjs kontrollib sama tegeliku ES2017/lib/strict
valikuga kompileerimist, vana literaali TS2737 negatiivkontrolli ning41 uut ID/receipt/price
regressiooni, sh1000 deterministlikku piirivõrdlust ühes testis. Assistendi Node22.16.0/
TS5.8.3 peal läbis41/41 ja kogu viie uue mooduli ühenduse ES2017 typecheck. Maci uus käik
teeb need uued kontrollid Node24.16.0/TS5.9.3 peal; vanu143/81/sarju ei korrata.

Eraldi piiratud parandaja kontrollib värskelt tegelikku baasi/koguindexit/tööpuud/558
allikat/23migratsiooni/kaug-main'i. Muutub üks olemasolev TS-rida, lisandub uus test ja
see eraldi parandustõendi dokument; seotud jooksvad dokumendid täpsustuvad. Kokku on
sama lähteetapi kavand36 rada,560valitud allikat. Ainult uute kontrollide järel kirjutused,
seejärel üks uus build ja edul täpne staging. Ei commit/push-i, SQL-i, Storage'i ega installi.
Selle ette kirjutatud teksti järgi ei tohi tulevast build'i/PASS-i eeldada: tegelik tulemus
loe private-final-source-bigint-repair ZIP-ist. STOP-il säilita kõik; vana paigaldajat ei korrata.

Upload/avaldamine jääb suletuks. Hiliste kirjutuste lõplikkus, blocked_write_settlement
objektide täielik koristus, konto/identiteedi/sõnumite ning terve kasutajatee ühendus
jäävad kohustuslikuks. Olemasolevate kontode/kuulutuste/piltide/päevikute kustutusluba puudub.
