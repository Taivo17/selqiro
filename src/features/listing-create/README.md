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

- ordinary listings use neutral, category-independent title and description guidance;
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

Horse basic-field checkpoint:

- concrete-horse flows
  (`sale | free_transfer | lease | co_rider`) show:
  - horse name
  - birth year
  - sex
  - breed
  - color
  - height in centimetres
- `wanted` shows only:
  - preferred sex
  - preferred breed
- the horse fields appear after the shared text, image and optional AI stages;
- hidden local values may survive temporary mode changes;
- a future persistence mapper must send only fields relevant to the active
  offer type;
- no draft, database row, Storage object, policy acceptance, confirmation or
  publication mutation is created by this checkpoint.

Future animal expansion:

- the shared `/v2/sell` route remains;
- new species and countries are exposed only through reviewed capabilities;
- the user confirms the species manually or confirms an AI suggestion;
- unsupported species/country combinations remain blocked and absent from the
  selectable UI;
- the production `horse_offers` domain remains horse-specific.

Browser test required before checkpoint:

1. ordinary listing uses neutral wording that does not suggest one preferred product category;
2. each horse offer type shows suitable horse-oriented examples;
3. `wanted` wording does not imply an already owned concrete horse;
4. changing offer type does not overwrite entered title or description;
5. ordinary listing keeps category-oriented AI guidance;
6. horse mode says AI does not choose an ordinary product category;
7. horse basic fields remain after the AI card;
8. desktop and narrow-mobile layouts remain usable;
9. browser console has no new errors.

Next isolated checkpoint:

1. document and commit the aligned horse basic-field and AI flow;
2. add the next horse-use fields separately:
   discipline, training level and suitability;
3. keep location, price, confirmations, persistence, images and publication
   outside that next patch.
