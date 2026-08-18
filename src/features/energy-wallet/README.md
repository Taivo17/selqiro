# V2 Energy wallet

This feature owns the authenticated V2 Energy wallet
read experience.

Current checkpoint:

- reads `get_my_energy_wallet_v2`;
- reads `get_my_energy_ledger_v2`;
- uses the authenticated active identity;
- reloads after
  `selqiro:active-identity-changed`;
- displays real available paid, available bonus and
  reserved Energy;
- displays real append-only ledger history;
- maps owner-visible `public_metadata`;
- never exposes `internal_metadata`;
- contains no purchase, grant, reserve, commit,
  release or adjustment mutation;
- removes placeholder balances, example history and
  fake payment actions from `/v2/energy`.

- My Area overview and sidebar show the real
  active-identity wallet total through a wallet-only
  summary hook;
- My Area identity preview follows the same active
  identity as the wallet;

- My Area internal profile, Energy and admin
  navigation uses Next `Link`, so browser Back stays
  inside App Router navigation instead of restoring a
  stale full-document loading state;

Still separate:

- welcome Energy;
- reserve / commit / release;
- AI charging;
- admin corrections;
- Energy purchasing and payments.
