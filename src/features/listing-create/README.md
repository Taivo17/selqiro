# V2 listing create

This feature owns the shared V2 marketplace listing creation flow.

Current checkpoint:

- `/v2/sell` remains the single user-facing listing-create route;
- the form has a typed local content boundary:
  `listing | horse_offer`;
- `listing` is the default and preserves the existing ordinary-listing flow;
- controlled live-animal options come from a small species-and-country
  capability registry;
- only `horse + EE` is enabled;
- the visible option remains `Hobusepakkumine`;
- selecting it activates horse mode inside the same form;
- no unsupported animal or country is exposed in the UI;
- future species and countries are added by appending a reviewed capability
  and connecting a species-specific fields/confirmations module;
- future additions must not require copying or replacing the shared
  `ListingCreatePage`;
- the production `horse_offers` domain remains horse-specific and is not
  renamed or generalized speculatively;
- no dog, cat or other-pet table, policy, field set, moderation rule or
  publication contract is created by this checkpoint;
- no horse fields, confirmations, database row, Storage object, policy
  acceptance, AI request or publication mutation is created by this
  checkpoint;
- horse supplies and horse/livestock trailers remain ordinary product
  categories and must never activate live-animal mode;
- the existing text-first title/description flow, field provenance and local
  image selection remain unchanged;
- the current working `/sell` route remains the mobile default until the V2
  flow is complete enough to replace it.

Long-term extension pattern:

1. add a reviewed species-and-country capability;
2. add the species-specific fields module;
3. add common and species-specific confirmation modules;
4. add the country policy and secure backend publication contract;
5. expose the option only after all required parts are ready.

Next isolated checkpoint:

1. add typed horse offer types:
   `sale | free_transfer | lease | co_rider | wanted`;
2. render only the offer-type selector and local state in the shared form;
3. keep persistence, policy acceptance, confirmations, image upload and
   publication behavior outside that step.
