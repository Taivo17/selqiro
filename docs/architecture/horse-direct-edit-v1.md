# Direct entry into horse editing

Checkpoint: 2026-11-08. The user accepted gallery inactivity controls and reuse
of their saved factual confirmation. They reported that opening My Area → Edit
restored a previous completed operation and disabled the form until Edit again
was clicked at the bottom. The required workflow is open, edit, Save changes.

## Cause and ownership

`HorsePublicationSession.inspect()` reconciles the local operation journal.
A published result is verified by reading the canonical owner snapshot. The
old controller retained that completed journal and entered `published`; the
owner form deliberately allowed changes only during `editing`. That terminal
screen is appropriate for creation but adds an unnecessary step to an editor.

The repair belongs to the owner editor and publication controller. It does not
change SQL, authorization, gallery verification, listing identity, saved
confirmation evidence, status or the 90-day renewal contract.

## Completion handoff

The owner editor automatically finishes a verified completed edit only after
it has adopted and hydrated the matching saved snapshot. Until then its inputs
and Save action remain gated. A loaded snapshot includes content, ordered
gallery, edit revision and saved confirmation as one result; a newer revision
must never be attached to unsaved older form values.

The owner-only completion method waits for the active controller operation to
settle, then takes the existing per-actor/per-listing lock. It rechecks the
terminal request, confirmed snapshot, active context and current journal before
retiring that exact completed intent. A different tab's newer request cannot be
cleared. This also covers terminal feedback emitted before the original
operation's finalizer has run.

The resulting view is `editing`, with saved feedback and editable fields. A
subsequent Save creates a fresh request key using the adopted revision. The
form's normal dirty and validation checks control the Save button. The user
does not need an additional Edit again action before or after saving.

## Unsaved work and recovery

The editor distinguishes its own submitted request from a completed intent
observed from another tab. Its own confirmed save replaces the saved baseline.
A foreign completion cannot overwrite an already dirty local form or silently
advance that form's revision. The local work stays visible with a notice to
reload the saved version; the existing explicit reload asks before discarding
unsaved changes. Server revision checks remain authoritative for every write.

An incomplete, unknown, conflicting or unreadable operation retains the exact
journal and the existing recovery actions. This repair does not automatically
retry a write, replay an uncertain upload, fabricate confirmation, or remove
unknown outcomes to make fields editable. Creation retains its published result
and explicit New listing action. Confirmed cancellation keeps its existing
return-to-form behavior.

## Verification and release

Focused controller/editor tests cover restored completion, hydration before
unlock, another Save with a new key/revision, the terminal/finalizer race,
identity change, foreign journal replacement, dirty local work and retained
unknown recovery. Existing publication/session and saved-confirmation tests
cover the adjacent contracts. Final counts and build evidence are recorded in
`docs/continuity/CURRENT_STATE.json` and the release control report.

The updater is source-only. Its baseline is the previous accepted 1252-file
horse-edit-polish release, manifest
`b80936a4e43c7fe195b0c0fd3061bfdf479dd2a6548211e75bb8a3cce12f1c7f`.
The private receipt locates the actual Mac commit; independent tree, parent,
scope and subject checks establish the baseline before writes. Previously
issued packages, installed SQL and installation journals are retained.

Local synthetic lifecycle and transport tests do not prove a real Mac
installation or Vercel deployment. The remaining acceptance is one reopen/edit/
save journey after the new commit is Ready in Production. Accepted gallery,
confirmation and lifecycle checks need not be repeated without a regression.
