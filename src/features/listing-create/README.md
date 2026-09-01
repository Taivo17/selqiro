# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current shared flow:

1. choose ordinary listing or an enabled controlled live-animal offer;
2. for `horse + EE`, choose the horse offer type;
3. enter optional title and description;
4. add and order images;
5. optionally request AI analysis;
6. review or enter the content-type-specific fields;
7. later complete location, price, policy acceptance, factual confirmations and
   publication.

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

Current state and persistence boundary:

- hidden local values may survive temporary UI switching;
- a future persistence mapper must send only fields relevant to the active
  offer type;
- horse fields appear after the shared text, image and optional AI stages;
- no draft, database row, Storage object, Energy charge, policy acceptance,
  factual confirmation or publication mutation is created by this checkpoint;
- the production `horse_offers` domain remains the authoritative persistence
  contract for later integration.

Future animal expansion:

- the shared `/v2/sell` route remains;
- new species and countries are exposed only through reviewed capabilities;
- the user confirms the species manually or confirms an AI suggestion;
- unsupported species/country combinations remain blocked and absent from the
  selectable UI;
- the production `horse_offers` domain remains horse-specific.

Browser test required before checkpoint:

1. concrete-horse offer types show health and behavior disclosure fields;
2. disclosure wording states that the information comes from the publisher;
3. `wanted` shows only health and behavior preferences;
4. concrete disclosures and wanted preferences remain separate while
   switching;
5. changing to ordinary listing hides all horse-only UI;
6. returning to horse mode restores local values;
7. desktop and narrow-mobile layouts remain usable;
8. no page-level horizontal scrolling is introduced;
9. browser console has no new errors.

Next isolated checkpoint:

1. document and commit the health and behavior disclosure module;
2. add price fields in a separate patch;
3. keep location, confirmations, persistence, images and publication outside
   that next patch.
