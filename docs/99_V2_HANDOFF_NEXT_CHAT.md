# Selqiro V2 handoff järgmise vestluse jaoks

Viimane stabiilne seis:
- V2 avalik profiil töötab.
- Avaliku profiili kuulutused on horisontaalselt scrollitavad ja leht jääb paika.
- V2 Minu ala kuvab aktiivse identiteedi dashboardi.
- V2 Minu ala "Sinu kuulutused" on ühendatud päris andmetega.
- My Area kuulutuse rida:
  - pilt/tekst avab avaliku kuulutuse
  - "Muuda" avab edit-vaate
  - status active/paused/sold on muudetav otse Minu alas
- Paused/sold ei ilmu avalikul profiilil teistele, kuid omanik saab neid Minu alas hallata.
- V2 kuulutuse edit-vaade olemas:
  - põhiandmeid saab muuta
  - status ei muutu edit-vaates
  - pildid:
    - saab lisada mitu pilti
    - saab kustutada
    - saab muuta esimeseks
    - ühe allesoleva pildi kustutamine on keelatud
- V2 kuulutuse detailvaade:
  - pildi osa mobiilis ja desktopis testitud
  - lightbox toetab nooli, swipe'i ja noolede auto-hide käitumist
- V2 toodete vaates:
  - pilt ja tekst avavad kuulutuse
  - "Ava kuulutus" pole enam põhitegevus
  - desktop pildicrop on kompromissina paika jäetud
- V2 Minu ala kuulutuste otsing/filtrid töötavad:
  - otsingusõna
  - status all/active/paused/sold
  - store_categories rubriigid, kui olemas
  - "Vaata kõiki (N)" / "Näita vähem"
  - filtrite tühjendamine

Olulised failid:
- app/v2/my-area/page.tsx
- components/v2/my-area/V2MyAreaPage.tsx
- src/features/my-area/components/MyAreaListingsSection.tsx
- src/features/my-area/model/useMyAreaListings.ts
- src/features/my-area/model/useMyAreaStoreCategories.ts
- src/entities/listing/api/getMyIdentityListings.ts
- app/v2/my-area/listings/[id]/edit/page.tsx
- components/v2/my-area/V2ListingEditPage.tsx
- src/features/listing-edit/components/ListingEditPage.tsx
- src/entities/listing/api/updateListingBasics.ts
- src/entities/listing/api/updateListingStatus.ts
- src/entities/listing/api/uploadListingImage.ts
- src/entities/listing/api/deleteListingImage.ts
- src/entities/listing/api/setListingPrimaryImage.ts
- src/features/listing-detail/components/ListingDetailPage.tsx
- src/features/product-discovery/components/ProductListingCard.tsx

Järgmine loogiline töö:
1. V2 rubriikide haldus Minu alas:
   - lisa rubriik
   - muuda rubriiki
   - kustuta rubriik
   - rubriikide järjekord hiljem
2. V2 kuulutuse edit-vaates rubriigi määramine:
   - vali üks või mitu oma rubriiki
   - salvesta listing_store_categories seos
3. Avaliku profiili V2 poolel rubriikide filter:
   - avalikul profiilil saab vaadata kuulutusi rubriigi järgi
   - paused/sold jäävad avalikult peitu
4. Sama loogika hiljem teenustele, tootenäidistele ja uuendustele.

Oluline otsus:
- Rubriikide haldus on eraldi suurem moodul.
- Seda ei tasu teha vana pika vestluse lõpus.
- Uus vestlus peaks alustama V2 rubriikide haldusest.

Kontroll enne töö alustamist:
npm run build
git status --short

---

## 2026-07-13 store category hierarchy checkpoint

Completed:

- `store_categories.parent_id` added
- self-referencing foreign key uses `ON DELETE RESTRICT`
- hierarchy index added
- same-identity validation added
- self-parent and recursive cycles blocked
- existing 13 categories remain root categories
- rollback test completed with no test data left behind

Architecture decision:

- V2 UI supports root + child categories
- database remains extensible to deeper levels later
- store categories remain separate from the global marketplace category tree

Next step:

- update the V2 store category type/loading layer to include `parent_id`
- display the existing root categories in a dedicated My Area management card
- do not add create/edit/delete in the same first UI step

---

## 2026-07-13 store category name integrity checkpoint

Completed:

- `store_categories.identity_id` is now required
- names are normalized before write
- name length is limited to 1–60 characters
- root sibling names are unique within an identity
- child sibling names are unique within an identity and parent
- same names remain allowed for different identities and different parents
- production migration and rollback test completed successfully
- existing 13 categories remain intact

Next exact step:

- add V2 root category creation
- create with `parent_id = null`
- show a 60-character UI limit and counter
- refresh the management card and listing category filters after creation
- do not add child creation, rename or delete in the same step

---

## 2026-07-14 secure store root category RPC checkpoint

Completed:

- secure root-category creation RPC added
- client supplies only the category name
- active identity is resolved in the database
- private ownership and business membership are validated
- anonymous execution is disabled
- store category RLS now also validates identity access
- own active-identity legacy direct writes remain functional
- cross-identity direct writes are blocked
- RPC and RLS rollback tests completed with no test rows remaining

Known follow-up:

- the current V2 `setActiveIdentity` client API needs a secure RPC before
  a final V2 identity switcher is exposed

Next exact step:

- create store-category entity API for root creation
- extend the My Area category hook with a create action
- add a compact `Lisa ülemrubriik` form
- UI maximum length is 60 characters
- show a character counter
- refresh both category management and listing category filters after success
- do not add child creation, rename or delete in the same step

---

## 2026-07-14 V2 root category creation checkpoint

Completed:

- V2 root-category creation entity API added
- My Area store-category hook now supports root creation
- compact root-category form added
- 60-character input limit and counter added
- empty input is disabled
- saving, success and error states added
- duplicate root names show a clear error
- management card refreshes after creation
- listing category filters refresh after creation
- no manual page refresh is needed
- active-identity isolation was browser-tested

Browser test:

- „Aiasaadused” was created for Taivo Garaaž
- Taivo Garaaž root count changed from 6 to 7
- duplicate „Aiasaadused” was rejected
- Milline Vedu remained at 2 root categories
- no category leaked between identities

Next exact step:

- add direct child-category creation
- each root card gets a compact „Lisa alamrubriik” action
- child RPC receives parent ID and name
- database verifies parent belongs to the active accessible identity
- V2 UI remains limited to two levels
- do not add rename or delete in the same step

---

## 2026-07-14 secure child category RPC checkpoint

Completed:

- secure child-category RPC added
- authenticated execution enabled
- anonymous execution disabled
- parent existence is validated
- parent must belong to the active identity
- parent must be a root category
- third-level creation is blocked by the V2 RPC
- sibling sort order is calculated server-side
- duplicate sibling names are blocked
- same child name under different roots remains allowed
- cross-identity parent usage is blocked
- rollback test completed with no remaining test rows

Next exact step:

- add child-category entity API
- extend `useMyAreaStoreCategories` with child creation
- add a compact „Lisa alamrubriik” action to each root card
- open the form only for the selected root
- use the same 60-character limit and counter
- refresh management hierarchy and listing filters after success
- do not add rename or delete in the same step

---

## 2026-07-14 V2 child category creation UI checkpoint

Completed:

- child-category entity API added
- My Area hook supports child creation
- compact per-root child creation form added
- only one form opens at a time
- 60-character validation and counter added
- duplicate sibling names show a clear error
- successful child creation refreshes hierarchy and listing filters
- V2 UI does not expose third-level creation

Browser-tested:

- SÕIDUAUTOD, VEOAUTOD and MAASTURID were added under AUTOD MÜÜGIKS
- duplicate child creation was rejected
- hierarchy updated without manual page refresh

Next exact work:

1. make listing category filtering hierarchy-aware in the database
2. root selection must include the root and descendants
3. replace the flat My Area category pills with a compact hierarchical filter
4. later reuse the same filter foundation on the public profile

---

## 2026-07-15 hierarchical store-category listing filter checkpoint

Completed:

- recursive category-scope helper added
- `get_my_identity_listings` category filter is now hierarchical
- RPC signature remains unchanged
- root category selection includes descendant-assigned listings
- child category selection narrows to the child scope
- unrelated category branches do not match
- active identity access is checked inside the listings RPC
- no duplicate parent listing-category link is required
- rollback test completed with no remaining test data

Next exact step:

- create a reusable hierarchical store-category filter component
- replace flat category pills in `MyAreaListingsSection`
- initially show `Kõik rubriigid` and root categories
- selecting a root selects its full branch and opens direct children
- selecting a child narrows to that child
- only one root group is expanded at a time
- selected child keeps its root expanded
- clearing filters resets category selection and expanded group
- do not modify the listings hook or entity API in this UI step
- later reuse the same filter foundation on the public profile

---

## 2026-07-17 My Area hierarchical category filter checkpoint

Completed:

- reusable hierarchical category filter component added
- flat My Area category pill list removed
- initial filter state shows roots only
- selecting a root opens direct children
- root selection filters the complete descendant branch
- child selection narrows to the child scope
- selected child keeps its root open
- only one root branch is expanded
- all-categories and clear-filters close the hierarchy
- listing hook and entity API contracts remain unchanged
- build and browser tests completed

Recovery note:

- during development, stale Next.js Fast Refresh state caused:
  - useEffect dependency-size warning
  - repeated Failed to fetch messages
- source code was not the cause
- stopping dev, deleting `.next`, building and restarting dev resolved it
- do not run `npm run build` while `npm run dev` is using the same `.next`
  directory

Important current files:

- `src/features/store-category-filter/components/StoreCategoryHierarchyFilter.tsx`
- `src/features/my-area/components/MyAreaListingsSection.tsx`
- `src/features/my-area/model/useMyAreaListings.ts`
- `src/entities/listing/api/getMyIdentityListings.ts`
- `supabase/migrations/20260714140000_add_hierarchical_store_category_filter.sql`

Next exact step:

- add secure store-category rename RPC
- rename may apply to a root or child
- category must belong to the authenticated user's active identity
- renaming must not change `parent_id`
- use the existing 60-character normalization and uniqueness rules
- add rename entity API and one inline rename UI
- do not add delete in the same step

---

## 2026-07-17 secure store-category rename RPC checkpoint

Completed:

- secure category rename RPC added
- root and child categories are supported
- active identity ownership is validated
- anonymous execution is disabled
- only the category name is changed
- hierarchy position and sort order remain unchanged
- normalization and sibling uniqueness are enforced
- rollback test completed with no remaining test data

Current UI status:

- category rename buttons and inline editor are not implemented yet

Next exact step:

- add store-category rename entity API
- extend `useMyAreaStoreCategories` with rename state/action
- add a compact `Muuda nime` action to root and child cards
- allow only one active inline editor
- use the existing 60-character limit and counter
- refresh hierarchy and listing filters after success
- do not add delete in the same step

---

## 2026-07-17 V2 store-category rename UI checkpoint

Completed:

- root rename UI added
- child rename UI added
- shared inline rename control added
- only one category can be edited at once
- 60-character limit and counter added
- cancel, saving, success and error states added
- hierarchy position remains unchanged
- category management and listing filters refresh after rename
- build and browser tests completed

Next exact step:

- add secure category deletion RPC
- child categories may be deleted
- roots may be deleted only when they have no children
- listings must remain intact
- only listing/category links are removed
- deletion must be restricted to the active accessible identity
- selected deleted filters must reset to all categories
- do not add automatic cascading child deletion
