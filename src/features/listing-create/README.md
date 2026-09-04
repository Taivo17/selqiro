# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current shared flow:

1. choose ordinary listing or an enabled controlled live-animal offer;
2. for `horse + EE`, choose the horse offer type;
3. enter optional title and description;
4. add and order images;
5. optionally request AI analysis;
6. review or enter the content-type-specific fields;
7. review the UI-only publication gate and mark offer-type-specific local
   confirmations;
8. later connect exact policy acceptance, persistence and publication.

Current controlled capability:

- only `horse + EE` is enabled;
- horse offer types are:
  `sale | free_transfer | lease | co_rider | wanted`;
- no horse offer type is silently preselected;
- no separate global marketplace category selector is required for a horse
  offer;
- horse discovery placement is derived later from controlled content type,
  species, market country and offer type;
- horse supplies and horse/livestock trailers remain ordinary product
  categories and never activate horse mode.

Text-first contract:

- ordinary listings use neutral, category-independent title and description
  guidance;
- horse mode uses horse-oriented guidance instead of product examples;
- horse title and description placeholders adapt to the selected offer type;
- `wanted` wording describes the horse being sought rather than a concrete
  horse already offered;
- changing content type or horse offer type does not overwrite existing user
  text;
- empty text remains allowed so AI can later suggest a short title and
  description;
- user-authored text remains protected by field provenance.

AI contract:

- ordinary listings use AI primarily to suggest a valid Selqiro category path;
- controlled live-animal offers already have their content type and species
  chosen by the user;
- horse-mode AI may check for a visible mismatch and suggest only missing
  title, description or visible horse data;
- AI never accepts publication policies or factual confirmations for the user;
- future AI merge logic for horse fields must update only empty or explicitly
  AI-owned fields;
- manual use of the form remains possible without AI.

Horse basic fields:

- concrete-horse flows
  (`sale | free_transfer | lease | co_rider`) show:
  - horse name
  - birth year
  - sex
  - breed
  - color
  - height in centimetres
- `wanted` shows:
  - preferred sex
  - preferred breed

Horse use fields:

- concrete-horse disclosures and wanted search preferences use separate local
  state branches;
- concrete-horse flows show:
  - discipline or use
  - training level
  - suitability
- `wanted` shows:
  - preferred discipline or use
  - preferred training level
  - intended rider/use and suitability preferences
- switching between concrete and wanted branches does not copy one branch's
  semantic values into the other.

Horse health and behavior fields:

- concrete-horse disclosures and wanted preferences again use separate local
  state branches;
- concrete-horse flows show seller-provided:
  - health notes
  - behavior notes
- `wanted` shows:
  - health-related preferences
  - behavior-related preferences
- UI wording must clearly say the information is seller-provided;
- Selqiro must not imply that it verified health, behavior, diagnoses or
  suitability;
- health notes do not replace independent veterinary assessment;
- switching between concrete and wanted branches does not copy disclosure
  semantics into search-preference semantics.

Horse price and budget fields:

- each commercial meaning uses a separate local branch:
  - sale price;
  - lease fee;
  - co-rider fee;
  - wanted-ad budget;
- `free_transfer` has no editable amount and is always free;
- sale supports:
  - fixed amount;
  - from amount;
  - contact/agreement;
- lease and co-rider support the same fee modes plus a visible period:
  - day;
  - week;
  - month;
  - agreed period;
- `wanted` uses:
  - maximum budget;
  - flexible budget;
- wanted budget wording must never be presented as a seller price;
- switching between offer types preserves each branch independently;
- EE pilot currency is currently fixed to EUR in the UI;
- a future persistence review must map seller prices, recurring periods and
  wanted budgets explicitly;
- do not silently encode wanted budget as an ordinary seller price;
- do not silently encode the recurring period into free text.

Horse location fields:

- concrete-horse flows
  (`sale | free_transfer | lease | co_rider`) use a `specific` local branch for
  the horse's actual location;
- `wanted` uses a separate `wanted` local branch for the buyer's desired search
  area;
- switching branches does not copy a wanted search area into an actual horse
  location or vice versa;
- country is read-only `Eesti / EE` in the first Estonia pilot;
- visible fields are:
  - city or municipality;
  - region or county;
- the city or municipality field reuses the existing `LocationAutocomplete`
  and `/api/location/search` flow;
- horse location passes `searchScope="locality"`, so the dropdown keeps only
  matching city-, municipality- and other locality-level results instead of
  business, street, house-number or square matches;
- changing the text immediately clears the previous dropdown and invalidates
  the previous request;
- an older in-flight response is aborted and also ignored by request version,
  so a short-prefix result cannot overwrite a newer full query;
- clearing the input keeps the dropdown closed even if an earlier request
  finishes later;
- autocomplete is assistance only and manual entry remains available;
- only `city`, `region` and the fixed country meaning are represented in this
  UI checkpoint;
- exact location text and coordinates remain private, absent from this UI and
  outside the current local state;
- wanted search-area persistence is not yet defined and must not be silently
  mapped to the concrete horse location fields;
- no location value is saved or published by this checkpoint.

Horse publication-gate UI contract:

- the gate appears after `HorseOfferLocationFields` for every selected horse
  offer type;
- it displays the two policy requirements by stable policy key:
  - `marketplace-general`;
  - `horse-offer-ee`;
- this first UI patch does not load acceptance status and does not call
  `accept_publication_policy_v1`;
- all offer types require these exact local confirmation keys:
  - `publisher_confirms_age_18_or_over`;
  - `publisher_confirms_information_accurate`;
  - `publisher_accepts_transaction_responsibility`;
  - `publisher_confirms_not_for_slaughter`;
- concrete-horse flows additionally require:
  - `publisher_is_owner_or_authorized`;
  - `publisher_confirms_horse_identified`;
  - `publisher_confirms_passport_available`;
- `wanted` intentionally omits the three concrete-horse confirmations;
- changing the horse offer type resets all local confirmation checkboxes, so a
  confirmation is never carried into a materially different offer contract;
- switching temporarily to an ordinary listing only hides the horse gate; when
  the same horse offer type is shown again, its local confirmation state remains;
- AI must never mark a policy acceptance or factual confirmation for the user;
- local progress indicates only whether the currently visible required
  checkboxes have been marked; it must not claim that publication is ready;
- no save, policy-acceptance or publication action is rendered by this patch;
- the authoritative later publication mutation must validate current policy
  acceptance server-side and create an immutable `horse_offer_publication_events`
  snapshot containing exact acceptance evidence, the active confirmation set,
  content hash, risk signals and the publication decision;
- a future persistence mapper must include only confirmations required for the
  active offer type, so hidden concrete-horse values are never submitted for
  `wanted`.

Current state and persistence boundary:

- hidden local values may survive temporary UI switching;
- a future persistence mapper must send only fields relevant to the active
  offer type and current price mode;
- horse fields appear after the shared text, image and optional AI stages;
- factual-confirmation checkboxes are local UI state only and are not
  authoritative acceptance evidence;
- no draft, database row, Storage object, Energy charge, policy-acceptance
  record, immutable publication event or publication mutation is created by
  this checkpoint;
- the production `horse_offers` domain remains the authoritative persistence
  contract for later integration;
- any schema extension for wanted-budget meaning or recurring price period must
  be reviewed in a separate migration.

Future animal expansion:

- the shared `/v2/sell` route remains;
- new species and countries are exposed only through reviewed capabilities;
- the user confirms the species manually or confirms an AI suggestion;
- unsupported species/country combinations remain blocked and absent from the
  selectable UI;
- the production `horse_offers` domain remains horse-specific.

Browser test required before checkpoint:

1. every concrete-horse type shows `Reeglid ja kinnitused` after the location
   card;
2. sale, free transfer, lease and co-rider flows each show seven required local
   confirmation checkboxes;
3. `wanted` shows only the four common checkboxes and the explicit explanation
   that owner, identification and passport confirmations are omitted;
4. the four common checkbox labels and three concrete-horse labels match their
   backend confirmation keys semantically;
5. the progress count starts at `0/7` for a concrete horse and `0/4` for
   `wanted`, then changes correctly as boxes are checked and unchecked;
6. the completed local state says only that local confirmations are marked and
   still says that publication is not connected;
7. changing from any horse offer type to another resets every local
   confirmation checkbox to prevent stale confirmations;
8. switching to an ordinary listing hides the complete horse publication gate;
9. returning to horse mode with the same selected horse offer type restores the
   local confirmation state;
10. both required policy cards are visible, but there is no control that records
    policy acceptance;
11. there is no save, submit, review or publish action in the new card;
12. existing text, images, AI, basic, use, disclosure, price and location UI
    still works;
13. desktop and narrow-mobile layouts remain usable without page-level
    horizontal scrolling;
14. keyboard focus and native checkbox toggling work;
15. browser console has no new errors.

Next isolated checkpoint:

1. browser-test this UI-only horse publication gate;
2. document the verified checkpoint in the main project documents;
3. commit and push the gate UI as one isolated change;
4. then add a read-only publication-policy status data layer before enabling any
   policy-acceptance mutation;
5. keep horse draft persistence, image upload and publication mutation outside
   this checkpoint.
