## 2026-11-10 current category checkpoint

Ordinary listing category assignment, root/child management and the later
join-table authority repair have been installed and accepted in the user
journey. The matching Vercel Ready / Production evidence is retained. Earlier
preparation-time pending or broader-policy paragraphs below are dated history.

The next prepared extension is canonical horse-offer shop categories. It adds
an independent UUID association and versioned public profile reader; it does
not alter the ordinary listing assignment contract. See
`horse-store-category-assignment-v1.md` and `../continuity/CURRENT_STATE.json`
for actual preparation, installation and acceptance boundaries. Services remain
outside that extension. All older content below is retained unchanged.

---

# Own shop category management v1

## 2026-11-10 prepared direct-write closure

The separately prepared authority release converts both legacy page writers
to the existing atomic assignment RPC, removes direct browser non-SELECT
authority on the join table and retains public reads. Its receipt-independent
category review route supports an identity-owned legacy listing even when the
integrated publication receipt does not exist. This is prepared source; the
actual database closure and rollout remain pending in CURRENT_STATE.
See `store-category-link-authority-v1.md` and
`../continuity/STORE_CATEGORY_AUTHORITY_20261110.md`. Earlier text about the
broader retained policy describes the accepted pre-repair database state.

Implemented in commit `0b2594ad27e8320ab7e71206c8c5cb20edcb5d8a`. The 2026-11-10
Mac report confirms database verification, build and push; the user accepted
root/child CRUD, listing assignment/profile discovery and retained listing after
category removal. Exact Vercel deployment identity is separate and not supplied.
Evidence: `../continuity/CURRENT_STATE.json`.

## Product boundary

Shop categories organize one identity's own profile/store. Existing
`store_categories` and `listing_store_categories` remain authoritative.
They are separate from the global product and service category trees.
Ordinary participation has no Energy or plan gate.

My Area exposes root and direct-child creation, rename, and explicit-confirm
removal of a childless category. Removal deletes the category and its listing
links; the listing, description, images and media objects remain. A parent
with children cannot be removed as a subtree. No move/reparent or sorting
editor is added. Existing deeper or orphaned rows remain visible as other
categories; they are not silently hidden or rewritten.

## Small modules

| Responsibility | Source |
| --- | --- |
| Command/receipt validation | `src/entities/store-category/model/managedStoreCategories.ts` |
| Authenticated reads and RPC | `src/entities/store-category/api/managedStoreCategoriesClient.ts` |
| Draft and unknown-result reconciliation | `src/features/store-category-management/model/storeCategoryManagementDraft.ts` |
| Request and editor lifecycle | `src/features/store-category-management/model/useManagedStoreCategoryManagement.ts` |
| Bound identity during transient checks | `src/features/store-category-management/model/useBoundManagementActor.ts` |
| English/Estonian messages and hierarchy presentation | `storeCategoryManagementMessages.ts`, `managedStoreCategoryTree.ts` in the same model directory |
| Scoped section, rows and inline editor | `ManagedStoreCategorySection.tsx`, `ManagedStoreCategoryRows.tsx`, `ManagedStoreCategoryEditor.tsx` in the feature's components directory |

`useMyAreaIdentity` returns a verified publication actor. `V2MyAreaPage` composes
the section and a desktop/mobile navigation entry. The existing listing
assignment card opens `/v2/my-area#my-area-categories` in a new tab; its existing
save contract stays separate, preserving unsaved listing text.

## Client scope and state

Each request captures user ID, active identity ID and a verified access token.
Explicit Authorization accompanies every read/write. The API checks current
identity access before and after the request. Category reads page through the
whole scoped result with an exact count; there is no small silent category cap.

The hook permits one synchronous operation at a time, uses an abort/deadline,
validates the exact receipt and refreshes the shared category event. A stable
creation UUID belongs to that submitted intent. Rename/delete retain the
original name and parent for compare-and-set.

An uncertain write result is never retried automatically. The editor and its
intent remain visible but read-only until the user requests a read check.
A matching observation is labelled as a read result; it is not fabricated as
a recovered write receipt. A failed check keeps the draft. A changed/missing
target prevents submitting stale values. The user can close the reviewed
editor and start a new deliberate action.

A temporary identity refresh (for example window focus) makes the same editor
read-only while retaining its DOM, text and caret. A confirmed user/identity
change retires the old scope and starts a new one. This is not an authorization
cache: all writes still recheck their captured actor. The older shared filter
hook is notified; unrelated legacy hook races are outside this change.

## Database authority

`public.manage_my_store_category_v1(uuid,uuid,text,uuid,uuid,text,text)` supports
`create_root`, `create_child`, `rename`, `delete`. It requires READ COMMITTED,
`auth.uid()` equal to expected user, the profile's stored active identity, and
current private ownership or active business membership. Relevant rows are
locked before the command. Client ownership checks alone never authorize it.

Names normalize whitespace and have 1–60 Unicode codepoints. Existing
case-insensitive sibling-name uniqueness applies. Creation uses a stable UUID;
only an identical identity/creator/parent/name replay can return unchanged.
Rename/delete compare the exact original name and parent. Renaming does not
change identity, creator, parent, creation time or sort order.

The receipt has exactly ten fields: schema version, operation, actor user,
identity, category, name, order, parent, changed flag and removed-link count.
The function is postgres-owned with a fixed search path; execute permission
is only for authenticated users, not PUBLIC, anon or service_role.

The new repair is isolated in
`supabase/repairs/20261110_store_category_management/`. Its seven guard groups
cover installer/roles/hosted context, retained release, category and identity
functions, table authority, and delete effects on both writable tables.
Unexpected overloads or catalog drift stop installation. First creation is
transactional; exact replay verifies without replacing the function.
See that directory's README for arguments, SQLSTATE mapping and guard details.

## Verification and remaining limits

Fresh SQL runtime 17/17, installation/drift 18/18, client/hook 15/15, targeted
13-file lint, a 610-input production build and four English/Estonian Chromium
journeys passed. Local SQL uses PGlite; browser Auth/PostgREST and unrelated
modules are fixtures. Multi-session lock schedules, live provider behavior,
actual Mac/Git/SQL/Vercel state and the real user journey are separate evidence.
The later Mac report and user acceptance are now recorded in the dated
continuity document; no old local checks were repeated for that review.

The existing direct `listing_store_categories` RLS write path only validates
the listing owner and does not enforce the category identity. This remains a
separate public-launch gate; the new management RPC does not use or widen it.
Horse/service category assignment, terminal photo cleanup and later marketplace
work remain outside this module. See the dated continuity record for exact
proofs and the single next action.
