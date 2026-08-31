# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current checkpoint:

- `/v2/sell` remains the single user-facing listing-create route;
- the form has a typed local content boundary:
  `listing | horse_offer`;
- `listing` is the default and preserves the ordinary-listing flow;
- controlled live-animal options come from the species-and-country capability
  registry;
- only `horse + EE` is enabled;
- selecting `Hobusepakkumine` activates horse mode inside the same form;
- horse mode now exposes a typed local offer-type selector:
  `sale | free_transfer | lease | co_rider | wanted`;
- no horse offer type is silently preselected;
- `wanted` is marked as not requiring a specific already-identified horse;
- the selected offer type remains local UI state only;
- switching to an ordinary listing hides the horse offer-type selector without
  clearing shared title, description or image state;
- no unsupported animal or country is exposed in the UI;
- the production `horse_offers` domain remains horse-specific;
- no horse fields, confirmations, database row, Storage object, policy
  acceptance, AI request or publication mutation is created by this checkpoint;
- horse supplies and horse/livestock trailers remain ordinary product
  categories and must never activate live-animal mode;
- the current working `/sell` route remains the mobile default until the V2
  flow is complete enough to replace it.

Browser test required before checkpoint:

1. horse mode shows all five offer types;
2. no offer type is selected initially;
3. every option can be selected;
4. switching to ordinary listing hides the selector;
5. switching back restores the selected horse offer type;
6. title and description remain intact;
7. desktop and narrow-mobile layouts remain usable;
8. browser console has no new errors.

Next isolated checkpoint after this one:

1. add the first horse-specific local field model;
2. render only the fields shared by concrete horse offers;
3. let `wanted` use its own smaller field set;
4. keep persistence, policy acceptance, confirmations, images and publication
   outside that step.
