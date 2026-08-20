# V2 listing create

This feature owns the V2 marketplace listing creation flow.

Current first checkpoint:

- `/v2/sell` route exists;
- the flow is text-first: title and description are shown before images;
- up to 10 JPG, PNG or WEBP source images can be selected;
- source files are validated before use;
- images can be reordered or removed locally;
- the first image is the future primary image and the only image planned for the initial AI analysis;
- the UI explicitly tells the user to place the most informative image first;
- title and description are recommended before AI analysis but may remain empty for an unknown object;
- title and description already track field provenance:
  `empty`, `ai` or `user`;
- user-owned text is protected from future silent AI overwrite;
- no database row, Storage object, AI request or publication is created yet;
- the current working `/sell` route remains the mobile default until
  the V2 flow is complete enough to replace it.

Next isolated checkpoint:

1. configure the local test price as 25 Energy;
2. extract shared preparation for the first / primary AI image;
3. extend the authenticated AI request with title, description and a stable operation key;
4. connect `reserve → OpenAI → commit | release`;
5. return a suggested description and merge AI text only into empty or AI-owned fields.
