<!-- SELQIRO_WANTED_OWNER_READ_PRODUCTION_VERIFIED_20260923 -->
# Deployment status — 2026-09-23

Migration `20260920150000` is APPLIED_VERIFIED in production
`vyjletlmwoiwxsnsunlm` (20/20 history, exact recorded SQL, no pending dry-run).
Evidence: `wanted-owner-production-rollout-20260923-095611-ncu89gqs.zip`,
SHA-256 `bbe1e603ac5f60a8cc40779d9ad51be8f31060c2c17df6a5f5ef65a1435132a0`.
Source was clean `53615de14bd6c16859fcaa33cdb1e48a17dbf928` at 09:58:51 (+03).
Both new functions/ACLs were verified; v1 and existing writers remain unchanged.
The browser still uses v1. The next feature is the typed v2 list connection and
visible budget/search-area tests, not another deployment or original DB test.
This status supersedes pending source/preflight/deployment wording below; the
technical and product contract remains unchanged. Read docs-finisher output for
its actual commit/build/push. SQL/browser/deployment tests are not rerun by it.

---

# Listing purposes and minimal wanted owner-list summary

Date: 2026-09-20; validation updated 2026-09-22. Base source: `1ae842fbfcc8a8d52f3f44eae8913049a2482c38`.
Status: product direction approved by user; the exact full SQL suite passed on
captured selected real schema in a new isolated helper on Sept22. Source build,
scoped commit/push and separately approved production deployment precede the
client connection. Read the source-finisher result for actual Git/build status.

## User-facing launch decision

Selqiro helps people publish offers and wishes, find products/services and contact
each other. Launch does NOT mediate user-to-user purchases/rent/service payments,
orders, escrow, deposits, automatic contracts or complex booking calendars. Future
commerce depends on user reception, not an unconditional roadmap promise. Selqiro
Energy purchases and optional paid capabilities remain a separate platform concern;
normal marketplace participation is not an Energy-paid permission.

The main path is: publish an offer/wish -> find a suitable contact -> agree together.
Messaging may remain inside Selqiro. Contact is not an automatically confirmed order.
Use clear contextual actions such as `Kirjuta`, `Paku sobivat`, `Küsi saadavust`.
Do not show `Osta kohe` or `Kinnita broneering` without the actual capability.

Users should not need to understand internal content types or database contracts.
Keep one adaptive listing-add flow, one obvious primary action, compact required
confirmations, and optional further details. Publish-first remains the target:
`Avalda kuulutus`; `Salvesta hilisemaks` is optional, never a mandatory draft stage.
Do not expose unsupported choices as working buttons. Architecture is modular;
that does not require a multi-step wizard or separate form for every domain.

## Approved purpose direction (not implemented by this read package)

| User choice | Money | Place |
| --- | --- | --- |
| Müün | Seller price | Actual object area |
| Soovin osta | Buyer budget | Search area |
| Annan rendile / kinnisvara: Annan üürile | Fee + period | Actual object area |
| Soovin rentida / kinnisvara: Soovin üürida | Budget + period | Search area |

Do not use ambiguous `Rendin`. Purpose is independent of category: one car category
can support several purposes without duplicating the whole taxonomy. Country and
category policy decide available choices, also enforced on the server. General
purpose codes and ordinary listing persistence still need their own source audit;
this document does not introduce new enum values into existing records.

Horse `sale`, `free_transfer`, `lease`, `co_rider`, `wanted` keep current meaning.
`lease` offers a concrete horse; current `wanted` uses a purchase budget. A horse
rental request needs its own explicitly designed contract, not reinterpretation of
existing wanted records. Horse country/species restrictions remain intact.
Services remain canonical service objects, not duplicate generic listings.

## Existing source finding

`marketplace_item_projection_v1` and `get_my_marketplace_items_v1` have 25 explicit
columns. They return seller money/actual location and omit wanted budget/search
area. The current client has truthful temporary `Eelarve detailvaates` and
`Otsingupiirkond detailvaates` labels. Owner detail and the accepted draft editor
already display canonical `details.wanted` correctly.

The smallest compatible extension is additive `get_my_marketplace_items_v2`:
reuse the existing v1 owner-authorized page in a MATERIALIZED CTE, then join only
wanted rows to `horse_offers` by canonical UUID and the same identity. Preserve the
v1 result ordinality. One request and one STABLE SQL snapshot; no N+1 detail RPCs,
no client cache as truth, no public raw-table access, no duplicate listing rows.

All 25 existing columns are unchanged. One extra `wanted_summary` JSONB column is:

```json
{
  "version": 1,
  "budget": { "mode": "maximum", "amount": 5000, "currency": "EUR" },
  "search_area": {
    "country_code": "EE",
    "city_or_municipality": "Rapla maakond",
    "region": "Rapla maakond"
  }
}
```

For a supported flexible budget, mode is `contact`, amount is null. Missing coarse
area values stay null. Non-wanted rows have SQL NULL for the entire summary.
Invalid/unsupported sections are JSON null, not an invented flexible budget,
zero amount or fallback to seller fields. The pure private projection helper
returns exactly `version`, `budget`, `search_area`; nested output is explicitly
allowlisted. No whole `details`, private address, coordinates, health/preferences
or arbitrary JSON keys are exported through the new summary. Existing v1 output
columns, including its search_text, are preserved, not redesigned here.

The client follow-up must validate the summary version and display unsupported
sections honestly. Valid wanted rows should show `Eelarve kuni 5 000 €` and
`Rapla maakond` in the list, without opening detail or re-saving. Duplicate
city/region labels should be joined once for display, never edited in storage.
The helper remains private; only the owner RPC is executable by authenticated
and service_role. Authorization still derives from the stored active identity,
not a caller-provided identity. No table grants, writer, revision or policy change.

## Scope and compatibility

New migration: `20260920150000_add_owner_marketplace_wanted_summary.sql`.
New SQL test: `20260920150000_owner_marketplace_wanted_summary_test.sql`.
Existing applied migrations and v1 function/view must remain byte-identical.
The new read may be deployed before switching the browser caller. Old and new
clients can coexist without a write pause. This package does not switch the client.

v1 search predicates, limits (max 500), offset cap, statuses, category behavior and
ordering are deliberately inherited. In particular, this does NOT add searching
by wanted search area or budget. A later search change must act before pagination,
not filter the page after it was loaded. Horse store-category assignment remains
separate and unimplemented. This bounded owner-management query is not a claim of
million-row public search performance. No extra index is introduced without a
query-plan reason; enrichment joins the UUID primary key only for the selected page.

## Accepted validation and rollout boundary — 2026-09-22

The first local run on Sept21 reached 132 checks before the PostgreSQL server
connection was lost during the anonymous permission check (signal 11 in server
log). Original selected baseline was later verified unchanged. That run remains
incomplete; its root cause has not been established. Do not replay it on the
original Selqiro database. No permission check or candidate SQL was weakened.

Actual accepted run Sept22 11:26–11:30 (+03): `wanted-selected-schema-test-20260922-112615-yvgblt0g.zip`,
SHA-256 `303fbefa07177fc88a936a2f18d0b078c9fe5d332d120d81f5d23cb5b0ee81fe`. The full original batch was
executed unchanged in a NEW network-isolated helper using captured selected real
logical schema/ACL/RLS. It passed all 133 exact notices, including the anonymous
DO check, both end markers, exit 0. The limited postgres test actor was not a
superuser. Its schema and selected privileges matched before/after; all 13 fixture
tables were empty and candidate functions absent after rollback. No helper crash
or restart was observed. Only that run's helper was removed. Original selected
catalog/table digests and logical schema matched after the run.

The selected fixture contains 13 tables, a view, a sequence and 22 real captured
functions, not identity/auth/V1 stubs. Data are synthetic. It is NOT the full
Supabase platform: original locale, per-role settings, every extension/service,
Auth HTTP, real user rows, statistics and production runtime are not reproduced.
Sequence counters are not claimed to rewind; the helper is discarded. No original
DB write/test replay, production connection, build or fresh remote Git check was
part of that test run. No engine-crash fix or public-search load result is implied.

Source completion updates the four usual current documents and this contract,
preserves both new SQL files byte-for-byte, then builds and stages seven files.
Only explicit COMMIT PUSH permits committing/pushing the reviewed scope. No DB
commands are included. Previous 166 client checks and user browser acceptance
remain historical; unchanged UI requires no new browser saves in this source step.

After a successful source checkpoint: review its result, then separate read-only
production preflight and explicit approval for this additive read deployment.
Only after production verification connect the typed client/mapper/list rows and
test their visible budget/area. No local-schema install or write pause is required
by source completion. Never replay legacy retirement or alter COMPLETE journals.
