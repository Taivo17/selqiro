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

# Listing price server composition v1 — candidate, not production activation

10 October 2026. Base `835a9bbee989b0a53b698445c33a36ac917c8563`.
One scoped connection of existing tested price contracts and existing readers.
The generated SQL is fixture-gated, outside migrations. It has NOT been applied to
production or the original local database. The external result supplies actual PASS/STOP.

## Composition, not another price engine

`composition-inputs.json` pins exact retained bytes. The offline composer extracts named
function definitions using their own dollar delimiters. It produces the test composition,
per-segment provenance and a separate selected baseline fixture. No SQL or network is run
by the composer. `--check` must reproduce all outputs byte-for-byte.

Reused unchanged: the frozen 154-code scale, normalization/snapshot/value helpers,
full basic-field value contract, atomic basic save body, account-bound public adapters,
all public detail/search/profile price readers and mixed-owner money readers. The 16-code
lab is not edited; only the release uses the previously tested generated 154-code map.
Existing migrations, indexes, old API functions and laboratory source files stay unchanged.
No create-idempotency engine is activated by this existing-listing edit slice.

Two narrow function changes are explicit in the composition provenance:
1. `lock_my_listing_basics_v1` becomes a CLOSED postgres-owned SECURITY DEFINER. Its
   body and fixed profile → identity → membership → listing lock order are unchanged.
2. `set_my_listing_price_core_v1` delegates that same locking/authentication to the one
   locker and receives a dedicated owner role. Its input revision grammar, CAS before
   no-op, price normalization and UPDATE/result logic are unchanged.

This avoids giving the dedicated writer SELECT/UPDATE on account/membership tables or
entering their legacy recursive RLS. The expected actor is still checked by the outer
adapter against auth.uid; expected identity and revision are preconditions, not permission.
No user-controlled GUC or claimed JWT role grants the effective SQL writer authority.

## Narrow SQL authority

`selqiro_listing_price_writer_v1` is NOLOGIN, NOSUPERUSER, NOINHERIT, NOBYPASSRLS,
NOCREATEDB, NOCREATEROLE and NOREPLICATION. It owns only the closed price-CAS function.
It receives public-schema USAGE, SELECT on listings, UPDATE of exactly price_kind,
price_amount and currency, and EXECUTE on the fixed locker/identity/pure helpers.
An UPDATE policy checks existing identity access. It receives no auth-schema grant and
no table read/write privileges on profiles, identities or business_members.

Only the existing trusted postgres schema administrator is a member, with explicit
ADMIN/INHERIT/SET options. No anon/authenticated/service-role membership or SET path is
created. Temporary public-schema CREATE used to transfer function ownership is revoked
in the same transaction. This is not protection against a malicious database administrator
who can change role memberships, function bodies or disable triggers.

The new `guard_listing_price_v2` is SECURITY INVOKER. It recognizes the effective SQL
writer role, NOT a postgres-owned legacy definer, auth.role string, request flag or GUC.
It derives the canonical old `price` display string and increments price_revision itself.
The dedicated writer has no direct UPDATE grant on either derived field.

The old v1 lab guard remains unchanged and is NOT loaded in the new composition.
No new role or guard is created in the real application database by the source installer.

## Transition matrix

| Operation | Candidate behavior in isolated helper |
|---|---|
| Old raw-price insert/update | Existing access rules still apply; raw price stays raw, revision advances on an actual money change. |
| Raw → structured price | Only the account-bound atomic API delegates to the dedicated price-CAS writer. |
| Structured price through old direct or postgres-owned definer write | Reject; the whole statement rolls back, including stale title changes. |
| Unchanged money + title/description/condition | Old behavior remains; this is NOT a claim of global basic-field CAS enforcement. |
| Images, classification/location, store links, status, explicit renewal | Existing exact writer functions remain; money/revision must be preserved. |
| Manual price_revision, structured downgrade or owner-tuple change | Reject. |
| Structured direct insertion | Not exposed in this edit slice; creation integration is later. |
| Structured row DELETE | Reject pending a separately controlled deletion flow. Raw legacy DELETE remains unchanged. |
| TRUNCATE listings | Reject, even with the old broad table privilege. There is no UI truncate operation. |

The deletion boundary can affect future account-deletion cascades. Review it explicitly
before production; do not claim all legacy deletion/admin flows remain compatible.
Existing test listings are NOT deleted. No cleanup is authorized by the user's intention
to delete test content later.

Known exact older functions used by this test: add_listing_image_v2,
set_listing_primary_image_v2, delete_listing_image_v2,
update_my_listing_classification_location_v2 and set_my_listing_store_categories_v2
from the July baseline; renewal and shared helpers from the already retained fixture.
Their bodies are not replaced. Source/captured metadata is historical, not fresh production.
The broad original listings table privileges/RLS are deliberately reproduced, not silently
fixed. A synthetic unsafe postgres-owned price writer exercises the bypass boundary;
it is NOT evidence that such an unsafe RPC exists in production.

Relevant existing clients: `src/entities/listing/api/updateListingBasics.ts` still performs
legacy direct UPDATE/Number conversion; `app/sell/page.tsx` and `app/my-page/page.tsx`
remain legacy writers. No new client falls back to them on failure. Production activation
must coordinate old open forms and display a useful reopen/upgrade error; the current
old client passes through server message and is NOT made user-friendly by this SQL test.
A hypothetical unreviewed SECURITY DEFINER that alters DDL is outside this DML boundary.

## Intended grants are tested, not deployed

Authenticated: account-bound get/save edit and mixed owner v3 reader.
Anonymous/authenticated: bounded public search v2, detail v1 and public profile list v1.
Pure value helpers retain their prior no-row-access grants. Other new helpers remain
closed to all API roles; service_role is not given the new edit API. Old v1/v2 readers
remain intact. The old search returns the canonical explicit raw label without inventing
its old currency field, so clients are not forced onto a wrong envelope.

Production preflight must verify the real role graph/default/schema/column grants,
function owners/bodies and application writers. No API-opening approval is inferred from
this helper. Never strip the fixture gate and run these files manually in production.

## New test boundary

77 uniquely labelled SQL assertions, 17 captured JSON responses, five overlapping
connection cases and a new parser bridge target this composition. Old test suites are
retained as historical evidence and are not replayed. Ten selected public tables plus an
ID-only auth.users FK stub are synthetic, NOT a full Supabase schema or account service.

The outer test transaction rolls back additions/data/role grants; before/after snapshots
include functions/owners/ACLs, relations/columns, constraints/indexes/triggers/policies,
schemas/default grants, relevant roles/memberships and eleven empty table counts.
Then the same candidate may commit ONLY inside that disposable helper for five real
concurrency cases: new/new CAS; old raw writer first; new writer first; membership
revocation; active identity change. Each must observe B waiting on a real database lock,
then validate exact SQLSTATE/message and surviving row. No latency/load claim is made.

The helper is removed before repository writes/build/staging. Existing database/container,
production, real accounts/listings, migrations and old journals are untouched. TypeScript
parsers consume the actual captured SQL from this run; no network API is involved.
All 427 base source files plus the exact candidate are checked before and after. Source
installation happens only after tests, rollback and verified same-helper removal.

## What remains after the local PASS

Review result, finish this exact source checkpoint, then a separately approved fresh
production preflight and controlled rollout. Verify real HTTP/JWT role behavior before
mounting the new writer. The current UI still uses the old save and no currency selector.
Then connect the prepared session and four-kind price card, account/identity events,
unsaved-text/image-reload protection and context-named return navigation, and read the
same canonical price in detail/search/profile/My Area. Preserve horse price vs wanted budget.

Energy/payments/AI/FX/crypto/units and test-content cleanup remain outside this change.
