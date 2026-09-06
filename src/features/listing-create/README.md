# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current shared flow:

1. choose ordinary listing or an enabled controlled live-animal offer;
2. for `horse + EE`, choose the horse offer type;
3. enter optional title and description;
4. add and order images;
5. optionally request AI analysis;
6. review or enter the content-type-specific fields;
7. review the account-backed policy status, open the exact active policy text,
   explicitly save any missing policy acceptances and mark the separate
   offer-type-specific factual confirmation;
8. later connect horse persistence and publication in separate checkpoints.

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
- the controlled policy action calls `accept_publication_policy_v1` only for
  currently missing active documents, one exact document per RPC call;
- every call submits the server-loaded document ID, version and content hash,
  uses `identity_id = null` so the server resolves audit context, and records the
  `publication_gate` source;
- status is reloaded after every successful acceptance and after any failure;
  successful append-only records remain valid during a partial failure;
- a newly changed document snapshot is never auto-accepted from the old user
  confirmation and must be opened and confirmed again;
- this checkpoint still does not save a horse draft, upload horse images, create
  a publication event, spend Energy or publish an offer;
- the later publication mutation must validate current acceptance server-side.

 evidence,
  content hash, risk signals and the publication decision.

<!-- SELQIRO_V2_HORSE_POLICY_ACCEPTANCE -->
Horse publication-policy acceptance contract:

- every loaded active policy card exposes its exact full body through an
  expandable native `details` control;
- accepted and unaccepted documents remain separately visible with their exact
  active version;
- the user gets one aggregate policy acknowledgement checkbox and one
  `Salvesta nõustumine` button for all currently missing required documents;
- this policy checkbox is separate from the existing one-checkbox per-offer
  factual confirmation; neither action changes the other;
- the entity API calls `accept_publication_policy_v1` once per document with the
  exact `policy_document_id`, `policy_version` and `content_hash` returned by the
  authoritative status response;
- the feature hook blocks double clicks, keeps the initial reviewed snapshot as
  the acceptance set, refreshes status after each success and after any failure,
  and refuses to auto-accept a policy that changed during the operation;
- partial success is safe because acceptance history is append-only and
  idempotent; after refresh, only still-missing documents remain retryable;
- the browser action creates a real user-level policy acceptance. It does not
  save a horse offer, upload images, create a publication event, spend Energy or
  publish content.

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

Important one-time test note: a successful click on `Salvesta nõustumine` writes
append-only acceptance records to the authenticated user. Capture the
`Nõustumata` state and full-text behavior before the first successful click.

1. open `/v2/sell`, select `Hobusepakkumine` and choose a concrete-horse offer
   type while signed in as a user who has not yet accepted the active policies;
2. both required policy cards load from the account-backed status RPC and show
   their exact version plus `Nõustumata`;
3. each card has `Ava täistekst`, expands the complete active body and remains
   usable by keyboard on desktop and narrow mobile;
4. the gate contains exactly two user checkboxes: one aggregate policy
   acknowledgement and the separate aggregate factual confirmation;
5. the policy save button is disabled until the policy acknowledgement is
   checked, and neither policy action changes the factual checkbox;
6. one click starts a guarded sequential save, calls one document per RPC, shows
   progress and prevents a second click while running;
7. after each success the authoritative status is reloaded; after both succeed,
   both cards show `Nõustutud`, the missing-policy controls disappear and a
   success message remains visible;
8. reloading the page keeps both documents `Nõustutud` for the same user;
9. when all documents are already accepted, full text remains readable but no
   new acceptance checkbox or save button is shown;
10. changing horse offer type still resets only the per-offer factual
    confirmation, while user-level policy acceptance remains accepted;
11. `wanted` still shows four factual statements, concrete-horse flows still show
    seven, and both use exactly one factual aggregate checkbox;
12. failed status loading remains retryable and no stale response may replace a
    newer request;
13. there is still no horse draft save, image upload, publication-event creation,
    Energy action, review submission or publish action in the gate;
14. existing text, image, AI, basic, use, disclosure, price and location UI still
    works;
15. desktop and narrow-mobile layouts have no page-level horizontal scrolling,
    and the browser console has no new error in the normal successful flow.

Next isolated checkpoint:

1. browser-test the controlled policy-acceptance connection before committing;
2. update the four living project documents with the verified browser result;
3. commit and push the acceptance connection as one isolated change;
4. then begin a read-only audit of the horse draft-save RPC and map the current
   shared form state to its exact persistence contract;
5. keep image upload and publication mutation outside that first persistence
   checkpoint.
