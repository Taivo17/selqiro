# V2 listing create

This feature owns the V2 marketplace listing creation flow.

Current first checkpoint:

- `/v2/sell` route exists;
- the flow is image-first;
- up to 10 JPG, PNG or WEBP source images can be selected;
- source files are validated before use;
- images can be reordered or removed locally;
- the first image is the future primary image;
- optional title and description can be entered before AI analysis;
- title and description already track field provenance:
  `empty`, `ai` or `user`;
- user-owned text is protected from future silent AI overwrite;
- no database row, Storage object, AI request or publication is created yet;
- the current working `/sell` route remains the mobile default until
  the V2 flow is complete enough to replace it.

Next isolated checkpoint:

1. extract shared image preparation for AI;
2. extend the authenticated AI request with optional title and description;
3. return a suggested description;
4. connect AI results through the provenance merge rules.
