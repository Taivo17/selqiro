# Adjustable local avatar crop and larger message avatars

## Accepted baseline and problem

The current accepted commit is `68c3996215069ba491de5883de3d21653fc0143d`, derived full tree `480d5602eb87c0cd24b7db1cafa2cec01040543c`, 1,955 files. Its exact completed installer receipt, matching Ready / Production screenshot, and user demonstrations of avatar/cover selection, saving and public display were accepted separately. On 21 November the user confirmed that the correspondent avatar opens the correct public profile.

The shared avatar renderer intentionally uses object-contain to avoid trimming logos. A rectangular photograph therefore leaves visible space in a circular frame. The change adds an explicit local choice between filling the frame and keeping the entire image. It does not silently recrop existing saved avatars.

## Image contract

Only a user-selected file enters the fitter. The existing bounded JPEG/PNG/WebP preparation validates headers, animation, decoded pixel dimensions, file bytes and orientation, then produces a limited WebP source. The new avatar fitter retains that prepared source in the current draft and uses it for every adjustment. Repeated fitting never crops an already cropped draft again. The source is discarded with the draft; it is not uploaded as a second object or retained as a separate server original.

The circular preview displays a square crop. Common cover geometry maps normalized focus and zoom to the source rectangle; a local canvas exports that rectangle to a square WebP at the available source resolution (minimum output edge one pixel). The existing output-byte budget, encoding, digest and upload path remain authoritative. Whole-image mode uses the original prepared rectangular image and preserves the existing object-contain display instead of applying a new square crop. The circular mask still applies, so corner details can be clipped by that mask; the preview shows this. A square photo fills the shared avatar renderer naturally.

Personal identities default to fill; company identities default to whole-image. The user can change either default for a selected picture. Zoom is bounded from 100% to 200%; pointer dragging, focus sliders and arrow keys adjust framing. Applying the fit changes the local draft, and the separate Save action performs the existing upload/update flow. Cancel leaves the confirmed image unchanged. Previously saved pictures require reselecting the local original to create a new crop; there is no remote image import or hidden cross-origin fetch.

## Session and authorization boundary

The existing independent media revision, actor binding, explicit final-save semantics and uncertain-result reconciliation stay in place. Crop work is local and abortable. Stale completion after a replacement selection, cancellation, actor change or retirement cannot adopt a picture into another identity. Same-owner focus refresh can preserve local draft work without enabling writes until authorization is current.

Changed image bytes receive a new immutable asset identifier, and any earlier upload receipt is cleared. An uncertain prior upload identifier is never reused for different image bytes. An unconfirmed final update is resolved through the existing snapshot check before another mutation. The fitting panel is bound to its actor and source draft; avatar and cover fitting cannot run concurrently. Native file inputs remain mounted through focus refresh.

## Message presentation

The conversation list and thread header share the larger 56 px correspondent avatar, reduced to 48 px on narrow screens. The small 24 px sender identity badge remains secondary. The existing safe public-profile link, correspondent identity validation, blocked-state behavior and stale-request fencing are unchanged.

## Release and verification boundary

This is a source-only release built on the exact accepted tree and previous successful receipt. There are no SQL migrations, Supabase CLI calls, bucket-policy changes, new API routes or new application dependencies. The Mac updater performs the same full-tree/index/remote and prior-receipt guards, then requires the focused avatar regression and full build before its scoped commit and push.

The verification artifacts cover crop geometry, real local image processing, state-machine races, actual component DOM behavior, and a full Next/TypeScript build. They use synthetic pictures and identities rather than user content or production credentials. Chromium startup was attempted once and blocked by the execution environment; no actual browser UI pass is claimed. The new user-Mac run, deployment and Safari interaction are separate acceptance steps after this package is delivered.
