# Horse draft repeat-save client v1

Source base: `4a910a9`. Production revision contract `20260913190000` is already
installed; this client checkpoint changes NO SQL and does not enable the owner editor.

## Source audit

The 2026-09-14 20:53 collector returned 71 exact tracked source files (19 additional
context files); missing context/import reports were empty. `/v2/sell` is not among
the routes automatically reloaded by V2IdentityBadge. The identity switcher emits
`selqiro:active-identity-changed`. Shared useAuth supplies auth state, not a form reset.
The prior save hook did not subscribe to either boundary and used the legacy writer
for creation and repeat updates. Its JSON fingerprint was not a server revision.

## Compatible client first

1. `ListingCreatePage` owns auth/loading/login. A `ListingCreateForm` keyed by user ID
   owns private fields and the save session. Logout/account changes discard that
   user's form; same-user identity switches retain it and block the wrong context.
2. `getHorseDraftActor` verifies the current user and reads exactly the stored
   active_identity_id. No display fallback identity is accepted. This is a precheck,
   NOT atomic authorization; database authorization remains authoritative.
3. `saveMyHorseOfferDraft` now permits ONLY `offerId === null`. It still uses the
   installed legacy RPC for creation; no server signature changes are assumed.
4. Its returned new row carries the initial revision 1. Accept only JSON number 1
   or text "1" on this compatibility boundary; store it as text. Missing/unexpected
   revisions fail closed, never default to 1. Verify the returned creator, identity,
   type and UUID before considering the session usable.
5. The same-session baseline is the form input submitted with that successful
   write, paired with the revision returned by THAT write. No separate detail read
   followed by a new revision; no editor hydration is used as an update payload.
6. Later saves use `update_my_horse_offer_draft_v1`, existing UUID and exact decimal
   revision. `buildHorseDraftChanges` emits only changed scalar keys on the correct
   branch. Omitted fields, private location/coordinates and unrelated stored details
   are never sent. Null is explicit optional clearing. Price/budget paired changes
   come from the existing validated form mapper. Empty changes skip the RPC.
7. The update response may retain revision for a normalized no-op or advance once.
   Validate identity/cardinality/revision; never coerce a new RPC text token to Number.
   Success records the sent baseline, not fields typed while the request was running.

## Failure and identity boundaries

The session synchronously locks before its first await. A second click does nothing.
There is no autosave, timer, hidden create fallback or automatic mutation retry.
Identity events invalidate pre-dispatch reads. After a known draft is saved, a changed
identity blocks writes while preserving the ID/revision and the current text. Returning
to the original identity or explicitly checking again does not refresh the revision.
An in-flight acknowledged write is retained, but late success is not shown for a
changed identity. Token refresh for the same user is not a new form session.

Conflict (`40001`) or non-draft refusal blocks further writes from this form. Input
stays visible; the user can open saved data in a separate tab. This version has no
merge/reconciliation editor. NEVER fetch a new revision just to retry old values.
A known SQL rejection can be explicitly retried with the SAME old revision. An
ambiguous update instead freezes this form until its result is reviewed; reverting
fields must not turn an unconfirmed write into a falsely confirmed client no-op.
An unconfirmed first creation freezes further creation in this mounted session. The
user must inspect My Area, not blindly retry. Only an explicit PostgreSQL rejection
establishes a rejected transaction; transport/response-shape errors are ambiguous.

Offer type stays locked after known creation or uncertain creation. No silent
conversion to another type and no automatic replacement draft. The UI explains
that another offer type needs a separate new form. The ordinary listing path and
optional/publish-first priority remain. Images are explicitly NOT saved here.

## Limits still open — not a global safety claim

- Old loaded clients can still call legacy server updates. The revision trigger alone
  does not protect against a stale legacy writer writing last. Retire/restrict those
  updates in a separate tested migration AFTER this client is validated/deployed.
- The existing create RPC has neither expected identity nor a durable idempotency
  key. A client precheck cannot close a cross-tab identity change between read and
  INSERT. A mismatching returned identity/creator is detected and the known ID kept,
  but this does not undo the already-authorized creation. An unknown result followed
  by a remount/refresh can also lose the in-memory retry guard. These are explicit
  first-create contract/launch risks, not incidents reproduced on user data.
- This session cannot resume a saved draft after navigation; My Area's owner editor
  stays read-only. When that editor is later enabled it MUST load the atomic
  `get_my_horse_offer_edit_snapshot_v1` snapshot and matching revision.
- Database status/type/location constraints remain final. No publication, image,
  policy-acceptance, lifecycle, category, Energy or generic listing mutation is added.

## Evidence and next step

`node --test tests/horse-draft-repeat-save.test.cjs` runs actual selected modules
with an explicitly fake browser transport, temporary transpilation and no database.
It covers five types, coupled prices/budgets, preservation, bigint revisions, double
click, late responses, context change, conflicts and uncertain outcomes. This is NOT
an authenticated Supabase integration or a React/browser/concurrent-SQL test.

The installer runs the user's real build and leaves the patch staged for review.
Manual browser results are required next for sale/wanted repeat saves, identity
isolation, type lock, narrow layout and ordinary listing regression. Exact evidence is in the result ZIP; preparation tests are not
user execution. No commit or push is automatic in the installer. After reviewing the
result, finish its scoped commit/push, verify deployment, and then design the separate
legacy-update retirement/first-create contract before exposing an owner editor.

## Current preparation evidence

The current runnable package contains the complete client modules, 53 Node tests,
and the small keyed auth wrapper plus extracted form/text/image components. The
53 tests include actual pure/API modules with fake transport, a strict core
TypeScript check against a fake browser declaration and static TSX/source checks.
They do not mount React or contact Supabase. They are rerun in the user's installer.
No dependency or package-lock change is required. The installer cannot authorize
a commit before manual browser evidence is reviewed.


<!-- SELQIRO_REPEAT_SAVE_BROWSER_COPY_20260915 -->
## Browser evidence and copy completion — 2026-09-15

The user confirmed wanted persistence and narrow layout, then A→B→A save gating
and preservation on return. The paired screenshots show B disabled with the
expected warning and A enabled; preserved content is user-reported. They do not
independently verify server IDs/counts or all browser branches. No repeat identity
test is needed merely to reconfirm this same evidence.

The four shared basic/use/location/price helpers no longer claim that nothing is
saved. Their copy is context-neutral; create save feedback and read-only owner
restrictions remain page-owned. Only text changes in those components. Four copy
checks extend the existing fake-transport/static suite from 53 to 57. Actual fresh
build, last visual confirmation, commit/push and deployment are separate evidence.
