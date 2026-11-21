# Jobs public image read — 2026-11-21

## Accepted deployment and observed regression

The exact private-jobs release `512fe45b19417b380dac8d8fb6c361c6e8bd043e` is accepted as the new 2000-file source baseline (tree `3a34847882bf0cdb9a05d309177275f1a331a42b`). Its original Mac receipt records the fixed 53 tests, build, one acknowledged SQL apply, independent after read and verified push. The matching user screenshot shows Ready / Production. This acceptance does not certify working discovery: the user reported that adding a private task caused the public jobs list to show a loading error, while its owner view and an older business profile job remained visible.

Anonymous live UI inspection reproduced the list error. Filtering by `Muruniiduki` returned the older business listing; filtering by `lume` failed. No sign-in, mutation, real API body or private legacy image was retrieved during this inspection.

## Reproduced defect

The existing `jobs_private.public_fields` emits raw `identity_profiles.avatar_url`. A historical inline image can exceed the strict public job parser's 4096-character URL limit. `parseJobPage` correctly refuses the invalid record, so one private task with that avatar prevents the entire mixed search result from being accepted. The owner's response does not carry this public employer image; a business-only profile page can remain valid.

Actual SQL and TypeScript parser reproduction isolates this cause with synthetic records. A private task with null working time and no quoted salary works with a null or bounded avatar. Adding only the long inline avatar breaks the mixed page. The hosted raw avatar was not observed; this is a reproduced code defect consistent with the observed portal symptoms.

## Narrow correction

Only the body of `jobs_private.public_fields(public.jobs)` changes: the `logo_url` value now comes from `profile_media_private.slot_url(j.identity_id, 'avatar')`. That existing deployed helper already resolves managed images, honors explicitly removed images, and bounds legacy HTTP(S) references. Unusable legacy image values produce no image reference, while the valid job remains intact. Managed images take priority over stale legacy fields.

The public DTO keys, real private/business identity badge, content, timestamps, ordering, pagination, policy, expiry, visibility and contact logic remain unchanged. Strict client parsing stays in place; no records are silently dropped and no URL limit is raised. The same public record producer serves discovery, detail, public profile jobs and anonymous sharing. Profile-photo editing and uploaded image data are untouched.

## Installation and evidence

The new repair lives in `supabase/repairs/20261121_job_image_read`. Its metadata-only before/after check covers the existing jobs authority plus the media helpers and table metadata used by the correction. It does not inspect user rows. The exact original function body is required before applying; the exact installed body is required afterward. Unknown state stops. An uncertain write is reconciled by an independent read through the same one-attempt journal.

Synthetic SQL fixtures exercise legacy, managed and removed avatars and are consumed by the actual client parser and anonymous sharing tests. Preparation results and their boundaries are recorded in the package's evidence directory and in the current handoff. The source/runtime guard and the user's original report remain mandatory on the Mac. No new hosted change is claimed until the user returns the new report.

## Preserved decisions

Private people and businesses can both offer a specific task or employment in the shared Jobs section. All three accounts currently belong to the user. Email verification activation remains deferred to the custom-domain setup phase before any external testers or public registration; this repair does not touch Auth, SMTP or DNS. The separate email-preparation snapshot must later be rebased as a scoped delta against the then-current source.
