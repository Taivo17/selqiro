# Account state foundation

The account page is independent of the selected identity and public profile.
It reads `get_my_account_state_v1` for the authenticated account with a pinned
access token and expected-user guard. Unknown/missing state is an error; there
is no default-active fallback or initialization during a read.

The session model clears private details synchronously on Auth invalidation,
defers Auth reads out of the callback, cancels RPC reads and discards older
generations. A bounded page deadline also handles Auth SDK calls that do not
offer an AbortSignal. Those underlying SDK calls may settle later; their result
cannot publish into the retired view. No automatic retry runs after an error.

Only the account owner sees the validated account state, optionally the private
email returned by the provider and the original Auth creation date when known.
The page does not treat an email confirmation timestamp as proof of a visited
mailbox. It contains no close, restore or erase control in this foundation.

Navigation uses the existing My Area sidebar/quick links and signed-in header
menu. A missing or slow active-identity read does not prevent the account link.
The old sign-in and registration flow, SMTP, identity ownership and existing
profile fields remain outside this slice.

Run the new targeted tests from the repository root:

```bash
node --test --test-concurrency=1 tests/account-state-v1/account-state.test.cjs
```

These tests execute the actual parser, reader, account session and React view
with synthetic Auth/transport. They never access real accounts or Supabase.
Actual DOM/browser, fresh full build and Mac/deployment acceptance are separate
evidence and must be recorded as such.
