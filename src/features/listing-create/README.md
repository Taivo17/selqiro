# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current shared flow:

1. choose ordinary listing or an enabled controlled live-animal offer;
2. for `horse + EE`, choose the horse offer type;
3. enter optional title and description;
4. add and order images;
5. optionally request AI analysis;
6. review or enter the content-type-specific fields;
7. later complete policy acceptance, factual confirmations and publication.

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

Current state and persistence boundary:

- hidden local values may survive temporary UI switching;
- a future persistence mapper must send only fields relevant to the active
  offer type and current price mode;
- horse fields appear after the shared text, image and optional AI stages;
- no draft, database row, Storage object, Energy charge, policy acceptance,
  factual confirmation or publication mutation is created by this checkpoint;
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

1. every concrete-horse type shows `Hobuse tegelik asukoht`;
2. `wanted` shows `Kust hobust otsid?`;
3. concrete and wanted branches preserve separate city and region values;
4. changing from `wanted` to a concrete-horse type never copies the wanted
   search area;
5. country is visibly fixed to `Eesti / EE`;
6. type `Türi` quickly and slowly; the dropdown must not show Tallinn or an
   older `Tü` result under the completed query;
7. type `Rakvere`; business results such as names beginning with `Ra` must not
   appear, and a matching locality result should be preferred;
8. type `Tartu`, wait for results, then clear the field; the dropdown must close
   immediately and remain closed;
9. changing any query must hide the previous query's suggestions while the new
   request is waiting;
10. selecting a suggestion fills the city or municipality and available region;
11. manual city and region entry remains possible when no locality suggestion
    is available;
12. changing selected city text clears a stale region from the earlier
    autocomplete choice;
13. no exact address, latitude or longitude field is displayed;
14. changing to ordinary listing hides all horse-only location UI;
15. returning to horse mode restores the local branch values;
16. existing basic, use, health/behavior and price branches still work;
17. desktop and narrow-mobile layouts remain usable without page-level
    horizontal scrolling;
18. browser console has no new errors.

Next isolated checkpoint:

1. browser-test this corrected horse location UI module;
2. document the verified checkpoint in the main project documents;
3. commit and push the complete location UI as one isolated change;
4. inspect the publication-policy and factual-confirmation boundary before the
   following implementation patch;
5. keep persistence and publication mutations outside this UI checkpoint.
