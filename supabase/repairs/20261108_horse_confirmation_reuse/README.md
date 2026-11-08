# Horse factual confirmation reuse

This repair lets the owner reuse their recorded factual confirmation when editing the same horse offer. It follows the installed horse lifecycle repair and preserves its actor, revision, media and 90-day activity rules.

## Stored evidence and command contract

The existing actor-bound owner snapshot gains an optional `saved_confirmation` descriptor. It contains `schema_version`, the canonical `offer_id`, `identity_id`, `actor_user_id`, immutable `offer_type`, original `publication_event_id`, and original `confirmed_at`. If the evidence is not applicable, the property is null. Reading the descriptor records no new acceptance.

A prepare request may submit the existing explicit factual boolean object, or the exact singleton `{ "reusePublicationEventId": "<original event UUID>" }`. Reuse requires an existing published, paused or closed offer; intact current publication proof; the same offer, identity, offer type and human actor; and an immutable original published event containing all applicable true factual confirmations. Another member of the same business identity cannot reuse a different person's confirmation.

The original event is retained unchanged. A reused command and its new publication event contain the validated original facts plus `reused_from_publication_event_id`. Repeated edits refer directly to the original human event rather than chaining references through later edits. Wanted offers retain their four applicable statements; other offer types retain seven.

Prepare validates the reference while holding the canonical offer row lock. Publish revalidates the source after reacquiring that lock and checking the exact edit revision. The owner snapshot uses a shared canonical row lock and a two-second lock timeout. A changed status or explicit renewal invalidates an already prepared edit through the existing revision comparison.

Current policy acceptance remains separate. The factual reference neither accepts a new policy version nor replaces the shown policy snapshot. Existing in-flight commands containing explicit confirmations remain valid after installation, subject to all original final-write checks.

## Scope and installation

The repair replaces three existing functions and adds one private helper. It does not rewrite offer rows or historical events and adds no table, role, broad grant or trigger bypass. The helper is unavailable to `anon`, `authenticated` and `service_role`. Existing public RPC authority remains unchanged. The bounded owner-read lock timeout is the only intentional execution-setting change.

`preflight.sql`, `apply.sql` and `verify.sql` use report kind `horse-confirmation-reuse-v1`, nine guards and three retained invariants. The generated installer requires the exact prior horse lifecycle catalogue or its own exact installed state. An unexpected function body, ACL, policy definition, writer role or partial install is rejected. SQL application is transactional and exact replay is supported.

## Validation

The disposable PostgreSQL 17.5 PGlite fixture applies the retained lifecycle release before this repair. `tests/runtime.mjs` covers nine runtime scenarios: first publication, repeated active/paused/sold edits, wanted scope, invalid and foreign references, same-person ownership, policy rollover, exact retry and stale status/renewal revisions, invalidated or incomplete original evidence at final write, and a pre-install explicit prepared command. `tests/installation.mjs` covers twelve guarded-install and drift/rollback scenarios.

Generated `runtime-result.json`, `installation-result.json` and `guard-generation-result.json` bind their checks to source hashes. The HTTP tests also verify that the original event reference is forwarded without fabricated booleans or automatic retry. These checks exercise local database semantics and mocked HTTP transport; they do not claim a live production database run, native concurrent connections, real Storage I/O or a Mac installer execution.
