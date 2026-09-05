# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current shared flow:

1. choose ordinary listing or an enabled controlled live-animal offer;
2. for `horse + EE`, choose the horse offer type;
3. enter optional title and description;
4. add and order images;
5. optionally request AI analysis;
6. review or enter the content-type-specific fields;
7. review the account-backed read-only policy status and mark the
   offer-type-specific local factual confirmation;
8. later open and accept the exact policy text, then connect persistence and
   publication in separate checkpoints.

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
  mapped to the concrete horse location <!-- SELQIRO_V2_HORSE_POLICY_STATUS_READ_ONLY -->
Horse publication-gate UI contract:

- the gate appears after `HorseOfferLocationFields` for every selected horse
  offer type;
- it requires these two stable policy keys:
  - `marketplace-general`;
  - `horse-offer-ee`;
- the current user policy state is loaded read-only through:
  `get_my_required_publication_policy_status_v1`;
- the RPC call uses the fixed first-pilot scope:
  - `p_content_type = horse_offer`;
  - `p_country_code = EE`;
  - `p_locale = et-EE`;
- data access follows the production boundary:
  `HorseOfferPublicationGate` -> `useHorseOfferPublicationPolicyStatus` ->
  `getMyRequiredPublicationPolicyStatus` -> Supabase RPC;
- the typed entity result retains the policy document ID, key, version, country,
  locale, title, summary, full body text, exact content hash, metadata and the
  authenticated user's acceptance ID/time;
- the UI renders explicit `loading`, `ready`, `empty` and retryable `error`
  states;
- a loaded policy card is marked `Nõustutud` only when the RPC returns
  `accepted = true`; otherwise it is marked `Nõustumata`;
- missing required policy rows are not treated as acceptance and the UI offers a
  read-only retry;
- a request sequence guard ignores late results after retry or unmount, including
  when the user temporarily leaves horse mode;
- policy acceptance remains user-owned; the active identity is context and does
  not turn this read into an identity-owned acceptance mutation;
- all seven stable factual-confirmation keys remain explicit in typed local
  state and keep their one-to-one backend meaning;
- the UI renders the active offer type's statements as a readable list and uses
  exactly one aggregate confirmation checkbox;
- selecting the aggregate checkbox expands to every required key for the active
  offer type; clearing it resets all seven typed values to false;
- every horse offer uses these four common keys:
  - `publisher_confirms_age_18_or_over`;
  - `publisher_confirms_information_accurate`;
  - `publisher_accepts_transaction_responsibility`;
  - `publisher_confirms_not_for_slaughter`;
- concrete-horse flows additionally use:
  - `publisher_is_owner_or_authorized`;
  - `publisher_confirms_horse_identified`;
  - `publisher_confirms_passport_available`;
- `wanted` shows four statements and intentionally omits the three
  concrete-horse statements;
- changing the horse offer type resets the aggregate factual confirmation and
  every expanded key;
- switching temporarily to an ordinary listing hides the horse gate and cancels
  the relevance of any late status response, while the separate horse form state
  remains available when returning;
- AI must never mark policy acceptance or the aggregate factual confirmation;
- this checkpoint does not call `accept_publication_policy_v1`, save a horse
  draft, upload horse images, create a publication event or publish an offer;
- the authoritative later acceptance mutation must submit the exact loaded
  document ID, version and content hash, and the later publication mutation must
  validate current acceptance server-side.

 evidence,
  content hash, risk signals and the publication decision.

Current state and persistence boundary:

- hidden local values may survive temporary UI switching;
- a future persistence mapper must send only fields relevant to the active
  offer type and current price mode;
- horse fields appear after the shared text, image and optional AI stages;
- the aggregate factual-confirmation checkbox and its expanded typed key
  state are local UI state only and are not authoritative acceptance evidence;
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

1. open `/v2/sell`, select `Hobusepakkumine` and choose a concrete-horse offer
   type;
2. the policy area may briefly show `Kontrollin`, then both required cards must
   settle to either `Nõustutud` or `Nõustumata` from the authenticated account;
3. neither card may remain on the old static `Nõutud` / `not-connected` state;
4. each settled card shows the active policy version and preserves its title and
   summary from the RPC response;
5. no policy is marked accepted merely because the factual aggregate checkbox is
   checked;
6. the factual side still shows seven statements and exactly one checkbox for a
   concrete horse;
7. `wanted` still shows four statements, one checkbox and the explanation that
   owner, identification and passport statements are omitted;
8. changing horse offer type still resets the aggregate factual confirmation;
9. switching to an ordinary listing hides the complete horse gate; returning to
   horse mode reloads the policy status without losing the separate horse form
   values;
10. reloading the browser produces the same account-backed policy status;
11. there is no control that records a new policy acceptance and no save,
    submit, review or publish action in the gate;
12. the `Proovi uuesti` action is shown only for an empty, incomplete or failed
    policy-status response and performs another read-only request;
13. existing text, images, AI, basic, use, disclosure, price and location UI
    still works;
14. desktop and narrow-mobile layouts remain usable without page-level
    horizontal scrolling;
15. the browser console has no new error during the normal successful load.

Next isolated checkpoint:

1. browser-test the read-only policy-status connection;
2. update the four main project documents after the browser result is confirmed;
3. commit and push this read-only connection as one isolated change;
4. only after that, design the full policy-text view and the controlled
   `accept_publication_policy_v1` mutation;
5. keep horse draft persistence, image upload and publication mutation outside
   this checkpoint.
