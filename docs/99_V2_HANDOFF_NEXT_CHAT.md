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

---

## 2026-07-17 secure store-category delete RPC checkpoint

Completed:

- secure store-category delete RPC added
- child deletion is supported
- childless root deletion is supported
- roots with children are protected
- automatic cascading child deletion is not allowed
- listings remain intact
- only listing/category links are removed
- removed relation count is returned
- active identity access is validated
- anonymous and cross-identity deletion are blocked
- rollback test completed with no remaining test categories or relations

Current UI status:

- category delete buttons and confirmation UI are not implemented yet

Next exact step:

- add `deleteMyStoreCategory` entity API
- extend `useMyAreaStoreCategories` with deletion state/action
- add a compact delete action to root and child controls
- disable root deletion while it has children
- require an explicit confirmation step
- explain that listings remain but category links are removed
- after success, refresh management hierarchy and listing filters
- reset a deleted selected filter to `Kõik rubriigid`

---

## 2026-07-17 V2 store-category delete UI checkpoint

Completed:

- delete entity API added
- category hook supports deletion
- shared delete confirmation control added
- child categories can be deleted
- childless roots can be deleted
- roots with children show a disabled delete action and explanation
- deletion requires explicit confirmation
- listings remain intact
- removed listing-link count is shown after success
- management hierarchy refreshes automatically
- listing category filters refresh automatically
- stale deleted category selection resets to „Kõik rubriigid”
- build and browser tests completed

V2 store-category management now supports:

- root creation
- direct child creation
- root and child rename
- safe root and child deletion
- two-level management UI
- recursive database hierarchy filtering
- hierarchical My Area listing filter

Not implemented yet:

- drag-and-drop or manual ordering
- moving a child between roots
- deeper-than-two-level management UI
- public profile category filtering

Next exact step:

- add store-category assignment to the V2 listing edit page
- load categories for the active identity
- show roots and children hierarchically
- allow selecting one or more categories
- store only explicit `listing_store_categories` links
- do not add duplicate parent links for child selections
- validate category ownership in the database
- save category relations separately from listing basic fields

---

## 2026-07-18 secure listing store-category assignment RPC checkpoint

Completed:

- secure listing/category assignment RPC added
- complete explicit assignment set is replaced atomically
- empty array removes all category links
- duplicate and null IDs are normalized
- active identity access is verified
- listing identity ownership is verified
- every category identity is verified
- failed validation preserves existing relations
- child assignment does not add a duplicate parent link
- rollback test completed with no remaining test categories or relations

Current UI status:

- listing edit does not yet show or save store-category assignments

Next exact step:

- add entity API for loading a listing's current category IDs
- add entity API for calling `set_my_listing_store_categories_v2`
- add a dedicated listing-category assignment hook
- create a hierarchical multi-select component
- show roots with their direct children
- allow selecting one or more explicit categories
- show unsaved-change state
- save categories separately from listing basic fields
- allow saving an empty selection
- reload current assignment after success

---

## 2026-07-18 listing category assignment client checkpoint

Completed:

- current listing category IDs can be loaded
- assignments can be saved through the secure RPC
- independent assignment state hook added
- dirty, clear, reset, saving, success and error states exist
- read-only assignment card added to the listing edit view
- child assignment path display verified in browser
- no duplicate parent relation was shown
- build completed successfully

Current UI status:

- existing assignments are visible
- category selection and assignment saving are not yet exposed

Next exact step:

- replace the read-only content with a hierarchical multi-select
- show root categories with direct children
- allow multiple explicit selections
- do not auto-select a parent when a child is selected
- add separate `Salvesta rubriigid` and `Taasta` actions
- allow clearing all assignments
- show dirty, saving, success and error states
- keep listing basics save unchanged

---

## 2026-07-18 V2 listing store-category assignment UI checkpoint

Completed:

- hierarchical listing category selector added
- roots and direct children are grouped together
- root and child selections are independent
- multiple explicit categories can be selected
- current saved selections load automatically
- dirty state is visible
- clear and restore actions work
- category assignment has its own save action
- empty assignment is supported
- save uses the secure atomic RPC
- refresh preserves the saved assignment
- listing basics and images remain unchanged
- My Area hierarchical filters use the saved relations correctly
- build and browser tests completed

V2 owner store-category functionality now supports:

- root creation
- child creation
- rename
- safe deletion
- hierarchical owner listing filtering
- listing assignment from the edit view

Next exact step:

- add hierarchical store-category filtering to the V2 public profile
- initially show root categories
- expand a root to show its direct children
- selecting a root must show listings from the full descendant branch
- selecting a child must narrow results to that child
- public viewers must see only active and publicly valid listings
- paused and sold listings must remain hidden from other viewers
- preserve relevance and public-profile layout

---

## 2026-07-19 V2 public profile category filter checkpoint

Completed:

- public store categories load by the viewed profile identity
- public category data does not depend on the viewer active identity
- recursive category branch scope added
- public listing query supports category relation filtering
- existing active and expiration visibility rules remain enforced
- compact public category filter added
- only root categories are visible initially
- selecting a root opens its direct children and applies the full branch filter
- selecting a child narrows the result
- selecting another root closes the previous branch
- all-listings clears the filter and closes the branch
- stale selection and profile changes reset safely
- request-loop protection uses a stable scope key
- build and browser tests completed

V2 store-category functionality now supports:

- owner root creation
- owner child creation
- owner rename
- owner safe deletion
- owner My Area hierarchical filtering
- listing category assignment from the edit view
- public profile hierarchical filtering

Next exact step:

- add the V2 identity switcher to the site header
- load all private and business identities accessible to the signed-in user
- show the current active identity
- switch through the existing active-identity API
- refresh every identity-scoped V2 owner module after switching
- do not let identity switching alter an already viewed public profile
- preserve public-profile identity isolation

---

## 2026-07-20 V2 identity switcher checkpoint

Completed:

- secure active-identity switch RPC
- direct profile-write validation trigger
- authenticated and anonymous privileges verified
- private and business identity rollback tests completed
- foreign and null identity selection blocked
- original identity restored after rollback test
- V2 identity entity API moved to secure RPC
- V2 header identity dropdown added
- loading, active and error states added
- identity-scoped owner routes reload after switching
- public profile route and viewed identity remain isolated
- listing read and write ownership rules aligned
- legacy user ownership applies only when `identity_id` is null
- wrong active identity immediately shows forbidden edit state
- redundant identity-profile slug lookup removed
- recursive `business_members` warning removed
- build and browser tests completed successfully

Current checkpoint files:

- `supabase/migrations/20260720170000_add_secure_active_identity_switch.sql`
- `src/entities/identity/api/getMyIdentities.ts`
- `src/entities/identity/api/setActiveIdentity.ts`
- `src/entities/listing/api/getEditableListingById.ts`
- `src/entities/listing/api/getListingById.ts`
- `src/features/v2-shell/model/useV2IdentitySwitcher.ts`
- `src/features/v2-shell/components/V2IdentityBadge.tsx`

Next exact step:

- extend the V2 listing edit view with location editing and Selqiro global category editing
- keep global category separate from owner-defined store categories
- validate identity-first ownership before loading and saving
- make location and global-category writes use a secure server/database boundary
- preserve existing listing store-category assignments
- do not weaken public listing visibility or active-identity isolation

## 2026-07-28 — Product-showcase lifecycle production checkpoint

Completed:

- product-showcase image management checkpoint was already committed as `f45e1af`;
- migration `20260726150000_add_product_showcase_activity_lifecycle.sql` was created;
- local reset, structural checks, behavior tests and RLS tests passed;
- application build passed;
- linked dry-run passed;
- the migration was applied successfully to production;
- local and remote migration histories both contain `20260726150000`;
- production schema dump confirmed every expected field, function, trigger, constraint, index and policy.

Important:

- never edit `20260726150000_add_product_showcase_activity_lifecycle.sql` after its production application;
- any database correction must use a new migration;
- the migration file and this documentation checkpoint still need to be committed and pushed to GitHub;
- the public Storage bucket remains a known future security boundary.

Next safe actions:

1. run `git diff --check`;
2. review the staged scope;
3. commit and push the lifecycle migration plus documentation;
4. verify a clean Git status;
5. begin the isolated owner-UI patch for expiry labels, warnings and explicit activity confirmation.

## 2026-07-30 – Product-showcase deletion production checkpoint

Completed and pushed to the linked production database:

- migration `20260729183000_add_product_showcase_delete_rpcs.sql`;
- archived-only permanent-deletion preparation;
- idempotent UUID deletion lock;
- showcase and gallery mutation guards;
- Storage upload guard;
- complete Storage cleanup manifest;
- safe cancellation before cleanup;
- mandatory completion after partial cleanup;
- final showcase and image-row deletion.

Validation completed:

- local reset;
- structural checks;
- database behavior checks;
- real local Storage API test, including a path belonging to another uploader;
- application build;
- production dry-run and push;
- production schema-dump object verification.

Next isolated patch:

1. add a trusted Next.js server endpoint for the complete deletion orchestration;
2. authenticate the requesting user on the server;
3. call the preparation RPC using the user's session;
4. delete all returned Storage paths using the server-only service/secret client;
5. call the final deletion RPC with the database-issued UUID token;
6. expose the workflow to the owner hook;
7. show `Kustuta jäädavalt` only for archived showcases with a strong confirmation step.

Do not call the three deletion RPCs directly from a browser workflow that would require exposing a privileged Storage key.

## 2026-07-30 – Product-showcase server deletion API checkpoint

Completed:

- trusted route `POST /api/product-showcases/delete`;
- server-side access-token verification;
- user-JWT-scoped preparation and finalization RPC calls;
- server-only service-role Storage removal;
- strict database-manifest path validation;
- bounded Storage delete batches;
- non-cacheable structured responses with request IDs;
- retry-safe handling of partial and concurrent deletion states.

Validation passed:

- application production build;
- route registration;
- client-bundle service-key marker check;
- missing-auth, malformed JSON, missing-ID, invalid-UUID and invalid-token tests;
- real local Auth-user E2E test;
- draft deletion rejection;
- archived showcase deletion;
- registered and cross-uploader orphan Storage cleanup;
- database row deletion;
- complete test-fixture cleanup.

Next isolated patch:

1. add a browser API wrapper that obtains the current access token;
2. expose `deleteShowcase` and `deletingShowcaseId` from `useMyProductShowcases`;
3. remove the deleted item from local state after success;
4. show `Kustuta jäädavalt` only for archived showcases;
5. require an explicit destructive confirmation;
6. disable all card actions while deletion is running;
7. browser-test success, cancellation and retryable error states.

## 2026-07-31 – Product-showcase permanent deletion UI checkpoint

Completed:

- browser API-wrapper for the trusted permanent-delete route;
- authenticated Bearer-token forwarding;
- management-hook deletion state and mutual operation locking;
- immediate local removal after successful deletion;
- archived-only `Kustuta jäädavalt` control;
- exact-title destructive confirmation;
- safe cancellation;
- inline deletion error handling;
- immediate owner count and success-message updates.

Validated in the browser:

- no delete control for published or draft showcases;
- delete control visible for archived showcases;
- confirmation opens correctly;
- wrong title cannot start deletion;
- cancellation performs no mutation;
- real archived showcase deletion succeeds;
- the card disappears immediately;
- the deleted showcase remains absent after reload.

The product-showcase deletion flow is now complete across:

- database locking and deletion RPCs;
- Storage cleanup protection;
- trusted server orchestration;
- authenticated browser API;
- owner management UI.

Next isolated product-showcase patch:

1. load published and currently active product showcases for a real public profile;
2. load their ordered gallery images;
3. render the compact and expanded public-profile showcase section;
4. exclude draft, archived, invalid and expired content;
5. test both anonymous and authenticated public-profile views;
6. preserve the existing public-profile category and expanded-view state boundaries.

## 2026-08-01 – Public-profile product-showcase checkpoint

Completed:

- dedicated public product-showcase and image model;
- active published showcase query;
- one batched gallery query;
- public-field minimization;
- public-profile loading hook;
- removal of the former empty showcase placeholder;
- compact horizontal showcase preview;
- responsive expanded showcase grid;
- selectable gallery thumbnails;
- fullscreen gallery with keyboard and pointer navigation;
- three-second inactivity hiding for gallery arrows;
- long-description `Vaata rohkem / Näita vähem` behavior;
- desktop, narrow viewport, authenticated and anonymous browser validation;
- successful production build.

The product-showcase feature is now complete across:

- owner creation and editing;
- Storage-backed image management;
- publication activity lifecycle;
- secure permanent deletion;
- active public-profile visibility;
- interactive public gallery browsing.

Recommended next isolated feature patch:

1. inspect the remaining placeholder service section on the public profile;
2. define a minimal public service read model;
3. connect only valid active services without changing the completed product-showcase boundary;
4. preserve the existing public-profile responsive and privacy rules.

## 2026-08-01 – Listing return-navigation checkpoint

Completed and browser-tested:

- shared tab-local listing return context;
- source history-token validation;
- products-page card marker and return-context capture;
- asynchronous products-page position restoration;
- detail-page contextual back action;
- direct-entry fallback to `/v2/products`;
- successful production build;
- browser back and visible „Tagasi toodete juurde” action both restore the products browsing position.

Current next patch:

1. connect public-profile listing cards to the same return-context foundation;
2. store and restore public-profile `Vaata kõiki`, selected store category and expanded category branch;
3. preserve the compact horizontal listing row's `scrollLeft`;
4. confirm that the detail action changes to „Tagasi profiilile” for this source;
5. browser-test both compact and expanded public-profile listing flows before commit.

## 2026-08-01 – Public-profile listing return checkpoint

Completed and browser-tested:

- public-profile listing cards use the shared listing return context;
- the detail action becomes „Tagasi profiilile” for this source;
- browser back and the visible detail action restore the previous profile position;
- expanded „Vaata kõiki” state is restored;
- selected store root or child category is restored;
- the expanded root branch is restored;
- compact horizontal listing-row position is restored;
- category request settlement is guarded by `resolvedScopeKey`;
- filtered, unfiltered and compact return flows pass manual testing;
- production build passes.

Recommended next isolated patches:

1. coordinate public-profile expanded sections so opening listings compacts product showcases and opening product showcases compacts listings;
2. defer the full store-category controls until the user opens „Vaata kõiki” on mobile;
3. add left/right touch swipe to public product-showcase galleries;
4. browser-test narrow mobile layouts before each checkpoint.

## 2026-08-02 – Public-profile exclusive expanded sections checkpoint

Completed and browser-tested:

- one shared expanded-section state on the public profile;
- product showcases and listings can no longer remain expanded together;
- opening either large section compacts the other;
- store-category controls remain hidden in compact listings mode;
- compacting listings clears the hidden category filter;
- listing-return restoration can still reopen the listings section and restore its saved UI state;
- desktop and narrow mobile interaction tests pass;
- production build passes.

Recommended next isolated patch:

1. add horizontal touch swipe to public product-showcase card galleries and the full-screen lightbox;
2. preserve thumbnail, keyboard and arrow-button navigation;
3. keep the existing three-second arrow auto-hide behavior;
4. browser-test touch behavior at a narrow mobile width before checkpointing.

## 2026-08-02 – Public showcase touch swipe mobile verification checkpoint

Implemented, pushed and verified on a real phone:

- horizontal swipe on expanded public showcase card galleries;
- horizontal swipe inside the full-screen lightbox;
- vertical page scrolling preserved with `pan-y`;
- compact horizontal showcase row remains independently scrollable;
- accidental lightbox opening after a card swipe is suppressed;
- existing thumbnails, buttons, keyboard controls and three-second arrow auto-hide are preserved;
- production build passes.

Real-device verification on the Vercel deployment confirmed:

- left and right swipe works on an expanded multi-image showcase card;
- left and right swipe works in the full-screen lightbox;
- vertical scrolling does not change the selected image;
- a normal tap still opens the lightbox;
- compact-row horizontal scrolling remains natural;
- existing arrow controls still hide after roughly three seconds.

The public showcase touch-swipe checkpoint is complete. The next feature patch may start from commit `2eab36b` plus this documentation confirmation commit.

## 2026-08-02 – Public showcase gallery extraction checkpoint

Completed and browser-tested:

- extracted `PublicProfileProductShowcaseGallery.tsx`;
- retained the section data and card-content boundary in `PublicProfileProductShowcasesSection.tsx`;
- preserved compact and expanded layouts;
- preserved thumbnails, full-screen lightbox, keyboard controls and Escape;
- preserved touch swipe and vertical scrolling;
- preserved the roughly three-second arrow auto-hide;
- preserved long-description „Vaata rohkem” behavior;
- preserved the mutually exclusive public-profile section expansion;
- production build passes.

Recommended next architecture patch:

1. extract the long-description measurement and toggle UI into a small focused component;
2. keep card layout and data mapping in the section;
3. avoid changing visual behavior during the extraction;
4. browser-test long, short and empty descriptions before checkpointing.

## 2026-08-02 – Public showcase description extraction checkpoint

Completed and browser-tested:

- extracted `PublicProfileProductShowcaseDescription.tsx`;
- moved overflow measurement, `ResizeObserver`, line clamping and expand/collapse state into the new component;
- retained data loading, layout and card composition in `PublicProfileProductShowcasesSection.tsx`;
- preserved short, long and empty-description behavior;
- preserved mobile responsiveness;
- preserved the separated gallery, lightbox, keyboard and touch-swipe behavior;
- preserved mutually exclusive public-profile section expansion;
- production build passes.

The focused public-profile architecture sprint is complete after extracting both the gallery and description responsibilities.

Recommended next isolated feature track:

1. begin the real V2 services foundation;
2. inspect the existing `services` schema and current placeholder UI before coding;
3. implement service display/load first;
4. then add create, edit, status lifecycle, images and public-profile integration in separate testable patches.

## 2026-08-02 – V2 service display foundation checkpoint

Completed and browser-tested:

- added the V2 `Service` entity model;
- added active-identity-scoped service loading;
- added a stale-request-safe `useMyServices` hook;
- replaced the My Area service mock list with `MyServicesSection`;
- added service status and price presentation;
- added loading, error, missing-identity and empty-list states;
- added compact preview and „Vaata kõiki / Näita vähem” behavior;
- removed the misleading static service count from the sidebar;
- retained listings, store categories and product showcases unchanged;
- production build passes;
- manual browser check confirms the correct zero-service empty state.

Recommended next isolated patch:

1. add service create/update input types and a `saveMyService` entity API wrapper around `save_my_service_v2`;
2. extend `useMyServices` with a guarded save mutation;
3. add only the first create-form UI in My Area;
4. keep status changes, images, deletion and public-profile services for later patches;
5. test creation under one active identity and verify another identity cannot see the draft.

## 2026-08-03 – Service category foundation checkpoint

Completed and production-applied:

- added `public.service_categories`;
- seeded 11 roots and 54 direct children;
- added stable category codes and localized labels;
- added public read-only RLS;
- added root/child validation helpers;
- added a `services` category-pair validation trigger;
- verified valid, root-only, mismatched, unknown and empty category cases locally;
- verified the migration in linked production history;
- verified the production schema after push;
- production build passes.

Next isolated patch:

1. add a `ServiceCategory` entity model;
2. add a public read API for active categories;
3. add a loading hook;
4. add a reusable two-level selector;
5. show the selector in My Area without service mutation;
6. only after selector verification, connect `save_my_service_v2` and create the first draft service form.

## 2026-08-03 – Service category selector checkpoint

Completed and browser-tested:

- added the global service-category entity model;
- added active-category read API;
- added stale-request-safe category loading hook;
- added reusable two-level `ServiceCategorySelector`;
- connected a read-only selector preview to My Area services;
- verified root selection, child selection and current-selection label;
- verified root change clears the old child;
- verified `Transport ja autoabi → Puksiirabi`;
- kept the patch free of service and taxonomy mutations;
- production build passes.

Next isolated patch:

1. add `SaveServiceInput` and a `saveMyService` wrapper around `save_my_service_v2`;
2. extend `useMyServices` with a guarded create mutation;
3. replace the read-only preview with the first service draft form;
4. require a root category in the UI while keeping the database compatible with older incomplete drafts;
5. create only drafts;
6. leave edit, status changes, images, deletion and public-profile services for later patches;
7. browser-test persistence and active-identity isolation before commit.

## 2026-08-04 – Service draft creation checkpoint

Completed and browser-tested:

- added service save input and shared field limits;
- added `saveMyService` RPC wrapper;
- added guarded `useMyServices.saveService`;
- replaced the category preview with the first real service draft form;
- required a root category in the create UI;
- supported optional child category and four price types;
- created a draft under the active identity;
- immediately updated counters and the owner list;
- displayed localized category labels, location and price;
- kept images, editing, lifecycle, deletion and public services outside this patch;
- production build passes.

Next isolated service patch:

1. add editing for an existing service draft;
2. reuse the same validated fields and category selector;
3. lock the form to one service operation at a time;
4. verify active-identity isolation and persistence;
5. leave publish/archive controls for the following lifecycle patch.

## 2026-08-04 – My Area showcase card layout fix

Completed and browser-tested:

- stopped a long showcase description from stretching the management image;
- fixed desktop media height at 140 px;
- top-aligned the media and content columns;
- clamped the management description to four lines;
- retained the full text in the existing edit form;
- production build passes.

## 2026-08-04 – Service draft editing checkpoint

Completed and browser-tested:

- added a draft-only „Muuda” action;
- reused the create form for prefilled editing;
- submitted the existing service ID through `save_my_service_v2`;
- guarded active-identity ownership and draft status before and after the write;
- prevented parallel create/edit writes;
- added cancel and immediate local card refresh;
- preserved image and coordinate fields outside the current form;
- kept lifecycle, images, deletion and public services outside this patch;
- production build passes.

Manual testing covered draft editing and persistence. Published and archived services could not yet be tested because service lifecycle controls do not exist.

Next isolated service patch:

1. add the service lifecycle mutation around `set_my_service_status_v2`;
2. add Draft → Publish and Published → Archive controls;
3. add Archived → Draft restoration;
4. keep deletion, images and public-profile rendering separate;
5. verify public read behavior only after lifecycle controls are complete.

## 2026-08-05 – Service lifecycle checkpoint

Completed and browser-tested:

- added `setMyServiceStatus` around `set_my_service_status_v2`;
- added guarded `changeStatus` to `useMyServices`;
- implemented Draft → Publish;
- implemented Published → Archive;
- implemented Archived → Draft restoration;
- prevented parallel create, edit and status operations;
- updated cards and counters without reload;
- kept the edit action draft-only;
- added lifecycle success, error and busy feedback;
- verified all three transitions and persistence after refresh;
- production build passes;
- no migration was required.

Next isolated service patch:

1. add the public-profile service read model and API;
2. load only `published` services for the profile identity;
3. replace the empty public-profile service placeholder with a responsive section;
4. display category, subcategory, description preview, price and privacy-safe location;
5. coordinate service expansion with the existing product-showcase and listing sections;
6. keep service images, deletion and global service discovery separate.

## 2026-08-05 – Service image foundation checkpoint

Completed and production-applied:

- added `public.service_images`;
- added service, identity and uploader ownership fields;
- added deterministic ordering and a single-primary constraint;
- added cross-identity integrity validation;
- added public-published and owner-identity read policies;
- removed ordinary direct table writes;
- added the `service-images` public bucket;
- configured 10 MB and JPEG/PNG/WEBP limits;
- added active-identity draft-only Storage upload, list and delete policies;
- verified local schema, RLS, bucket and privilege behavior;
- verified linked production migration history, public/storage schema and bucket settings;
- production build passes.

Next isolated patch:

1. add `add_my_service_image_v2`;
2. enforce a server-side maximum of 10 images;
3. add `set_my_service_primary_image_v2`;
4. add `delete_my_service_image_v2`;
5. synchronize `services.image_url`;
6. allow deleting the last image because service images are optional;
7. reindex remaining rows and choose a deterministic fallback primary;
8. keep the browser upload UI for the following patch.

## 2026-08-05 – Service image RPC checkpoint

Completed and production-applied:

- added authenticated service-image registration;
- enforced active-identity ownership and draft-only mutation;
- enforced a server-side ten-image maximum;
- added deterministic primary-image selection and ordering;
- synchronized `services.image_url`;
- added deletion manifest output for Storage cleanup;
- allowed removal of the final optional image;
- verified RPC privileges and SECURITY DEFINER status;
- passed a local authenticated E2E test;
- verified linked production migration history and dumped production function definitions;
- production build passes.

Next isolated patch:

1. add the `ServiceImage` TypeScript model and row mapper;
2. load identity-owned service images in deterministic order;
3. upload JPG/PNG/WEBP files to `service-images`;
4. compensate by deleting the Storage object if registration fails;
5. set the primary image through the RPC;
6. delete the database row first and then remove the returned Storage object;
7. add a draft-only responsive `ServiceImageManager`;
8. update service cards locally without a page reload;
9. keep public-profile service rendering and service discovery separate.

## 2026-08-05 – Service-image data-layer checkpoint

Completed:

- added the service-image TypeScript model and row mapper;
- added deterministic image sorting;
- added image loading;
- added validated Storage upload and RPC registration;
- hardened pre-commit upload compensation;
- added primary-image mutation;
- added an authenticated server delete route;
- kept the service-role key server-only;
- prevented client-provided Storage paths;
- exposed Storage cleanup failure separately;
- production build passes.

Next isolated patch:

1. create a draft-only `ServiceImageManager`;
2. load images when the manager opens;
3. allow selecting multiple JPG/PNG/WEBP files within the remaining ten-image limit;
4. display responsive thumbnails and the current primary image;
5. set a primary image without reloading the page;
6. allow deleting the final optional image;
7. warn when database deletion succeeded but Storage cleanup failed;
8. update the parent service card's `imageUrl` immediately;
9. keep published and archived service cards read-only.

## 2026-08-05 – Service-image management checkpoint

Completed and browser-tested:

- added draft-only `ServiceImageManager`;
- added lazy image loading;
- added multi-file upload within the ten-image limit;
- added responsive thumbnails and primary-image preview;
- added primary-image mutation without a page reload;
- added ordinary, primary and final-image deletion;
- added explicit Storage cleanup warnings;
- synchronized service-card `imageUrl` locally;
- coordinated image-operation busy state with other service writes;
- compacted My Area service cards on narrow screens;
- compacted My Area product-showcase cards on narrow screens;
- preserved tablet and desktop layouts;
- production build passes;
- narrow mobile view was manually verified.

Next isolated patch:

1. expose published services on the public profile;
2. add a dedicated public-service entity API and hook;
3. render only publicly visible services;
4. use the same exclusive expanded-section coordination as product showcases and listings;
5. add responsive service cards and long-description handling;
6. keep service discovery `/v2/services` separate from profile-owned service presentation.

## 2026-08-05 – Mobile service-image picker deploy checkpoint

Prepared for production deployment:

- Android/Xiaomi was confirmed as the affected device;
- broadened the system gallery accept filter;
- delayed File input reset until processing completes;
- added same-file reselection support;
- added standard MIME inference from filename extensions;
- added best-effort HEIC/HEIF-to-JPEG preparation;
- generalized all user-facing wording away from iPhone-specific assumptions;
- production build passes.

After Vercel reports the new commit as Ready, retest on the Xiaomi phone:

1. open a draft service image manager;
2. choose a recent gallery photo;
3. press the gallery confirmation action;
4. verify the button changes to an upload state;
5. verify the image appears;
6. capture the visible error message if it still fails.

## 2026-08-08 – Public profile services checkpoint

Completed:

- public service model, API and hook;
- public service image loading and primary-image fallback;
- read-only public profile service cards;
- category, subcategory, location, description and price display;
- exclusive expanded-section coordination with showcases and listings;
- desktop and narrow-mobile browser tests;
- production build.

No database migration was needed.

Known follow-up:

1. add a dedicated `PublicProfileServiceGallery` modeled on the existing product-showcase gallery;
2. support previous/next navigation, image counter, keyboard controls, lightbox and mobile swipe;
3. preserve the current description component;
4. after gallery testing, align the preview image/card geometry of services and public listings to the product-showcase section;
5. keep `/v2/services` discovery work separate.

## 2026-08-08 – Public service gallery checkpoint

Completed and desktop-tested:

- added `PublicProfileServiceGallery.tsx`;
- connected it to `PublicProfileServicesSection.tsx`;
- added full-screen viewing for public service images;
- added multi-image counters and expanded thumbnails;
- added thumbnail, arrow and keyboard navigation;
- added mobile swipe in expanded cards and lightbox;
- preserved post-swipe click suppression;
- preserved the legacy `services.image_url` fallback;
- preserved product-showcase gallery behavior;
- kept existing compact and expanded media heights;
- production build passes.

This checkpoint does not include database or API
changes.

Immediate production validation after Vercel is
ready:

1. open the public profile on a phone;
2. expand the services section;
3. swipe a multi-image service card;
4. open the service lightbox;
5. swipe and close the lightbox;
6. confirm the product-showcase gallery still works.

After mobile validation, the next visual candidate is
a separate shared-media-geometry patch for product
showcases, services and public listings. Do not mix
that layout change into this gallery checkpoint.

## 2026-08-12 – My Area product showcase detail checkpoint

Completed and browser-tested:

- added `/v2/showcase/[id]`;
- added owner-only product-showcase detail loading;
- reused the existing product-showcase gallery;
- made My Area showcase image clickable;
- made title and category clickable;
- made short description clickable;
- kept every management action outside the links;
- made the detail route active-identity scoped;
- hid mobile bottom navigation on the detail route;
- added shared My Area owner-content return context;
- restored the same card to its previous viewport
  position after returning;
- verified production build;
- verified visible Back to My Area behavior.

No database, migration, RPC, RLS or Storage change is
part of this checkpoint.

Next recommended implementation:

1. create `/v2/service/[id]`;
2. add owner-scoped service detail loading;
3. make service image, title and short description
   clickable in My Area;
4. keep service management controls separate;
5. reuse `MyAreaContentType = "service"` and the
   existing return-state foundation;
6. browser-test before documentation and commit.

After service detail parity, return to the separate
public-profile card-geometry alignment task.

## 2026-08-13 – My Area service detail checkpoint

Completed and browser-tested:

- added `/v2/service/[id]`;
- added owner-only service detail loading;
- reused the existing service gallery;
- made the My Area service image clickable;
- made title, category and location metadata clickable;
- made the short description clickable;
- kept price and every management action outside
  the links;
- made the detail route active-identity scoped;
- hid mobile bottom navigation on the detail route;
- reused the shared My Area return context;
- restored the same service card to its previous
  viewport position;
- reopened the complete service list when returning
  to a card beyond the three-card preview;
- verified production build and browser behavior.

No database, migration, RPC, RLS or Storage change is
part of this checkpoint.

Next recommended implementation:

1. align public-profile showcase, service and listing
   card image geometry and vertical rhythm;
2. keep all three content sections visually aligned
   on desktop;
3. preserve horizontal card browsing on narrow
   screens;
4. later implement the planned mobile profile
   accordion where only the first available content
   section is open.

## 2026-08-13 – Public profile card geometry checkpoint

Completed and locally browser-tested:

- aligned compact showcase, service and listing card
  widths to 250 px;
- aligned compact image heights;
- aligned expanded service and listing image heights
  to the showcase reference;
- aligned expanded grids to two columns;
- aligned the listings section shell with the other
  content sections;
- preserved narrow horizontal browsing;
- preserved service gallery behavior;
- preserved listing navigation, filtering and
  profile-return restoration;
- deliberately left the listing detail thumbnail
  strip unchanged;
- verified production build;
- verified desktop compact and expanded layouts;
- verified a narrow desktop viewport.

After deployment, verify the same public profile on
a real phone. The phone check should cover compact
horizontal browsing, partial next-card visibility,
expanded two-column behavior where applicable and
the absence of page-level horizontal overflow.

Next larger design work remains separate:

1. content-type color tones;
2. mobile public-profile accordion with only the
   first available section open;
3. denser mobile information packaging;
4. broader visual polish.

## 2026-08-13 – Public profile section tones checkpoint

Completed and locally browser-tested:

- added an indigo identity to product showcases;
- added a teal identity to services;
- added an amber identity to active listings;
- added a persistent top accent to each section;
- converted section-type labels to tinted pills;
- aligned section action buttons with each tone;
- retained white inner content cards;
- retained all shared card geometry;
- retained horizontal browsing and expanded grids;
- retained showcase and service galleries;
- retained listing category filters, navigation and
  profile-return restoration;
- retained the existing expanded-section state model.

Product decision:

- do not add a new accordion or separate section
  closing behavior now;
- keep the current section behavior;
- later reuse the same semantic content-type color
  system on marketplace/discovery surfaces.

After deployment, verify the public profile on a real
phone. Check section contrast, horizontal browsing,
buttons, galleries, listing filters and the absence of
page-level horizontal overflow.

The next design step should not automatically be an
accordion. First evaluate other compact mobile
information-packaging improvements or audit the
marketplace color-system reuse.

## 2026-08-14 – V2 product discovery colors checkpoint

Completed and locally browser-tested:

- changed product/listing discovery identity to amber;
- changed the related-services strip to teal;
- changed active product controls from black to amber;
- retained a mostly neutral product-page hero;
- retained white product, service and listing cards;
- retained functional status and error colors;
- retained live listing queries and bounded result
  loading;
- retained listing detail navigation and return-state
  restoration;
- verified production build;
- verified that products and services are visually
  distinct in desktop browser testing.

Current truth:

- `/v2/products` featured products are still local
  design data;
- its related-services strip is still local design
  data;
- its lower product-results section uses live
  marketplace listings;
- `/v2/services` is still a design-oriented page and
  needs a separate teal patch before functional data
  integration.

After deployment, verify `/v2/products` on a real
phone for contrast, filter states, horizontal
overflow, live listing opening and return position.

Next ordered work:

1. apply teal identity consistently to `/v2/services`;
2. checkpoint and phone-test the completed color
   system;
3. audit incomplete V2 functional surfaces;
4. start V2 AI-assisted listing creation as the first
   major functional milestone.

## 2026-08-14 – V2 semantic color system complete

Completed and locally browser-tested:

- public-profile showcases use indigo;
- public-profile services use teal;
- public-profile active listings use amber;
- `/v2/products` uses amber for products/listings;
- the related-services strip on `/v2/products` uses
  teal;
- `/v2/services` uses teal across hero, sections,
  cards and modal boundaries;
- white content cards and functional status colors
  remain separate;
- production builds pass.

Current functional truth:

- `/v2/products` is hybrid: live lower listing
  results plus local featured-product and
  related-service design arrays;
- `/v2/services` is still based on local design
  arrays and local modal state;
- the semantic color system is complete only at the
  presentation level.

After deployment, verify `/v2/services` on a real
phone for section contrast, active nearby state,
horizontal quick-update scrolling, modal behavior and
page-level horizontal overflow.

Next ordered work:

1. complete the phone test for service colors;
2. audit incomplete V2 routes, controls and data
   connections;
3. make V2 AI-assisted listing creation the first
   major functional milestone;
4. then connect real service discovery data in small,
   bounded and scalable steps.
