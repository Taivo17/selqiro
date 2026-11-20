# Legacy embedded profile image blocks the media editor

## Accepted starting point

The original profile-media release is accepted at commit `68b6e681f1d3487c6bc9d22708aaa9bac09b4318`, complete tree `ff833185319b9fea711b1d5d3a934d610f785a46`, 1,946 files. Its exact installer receipt passes 424 offline evidence checks. The supplied matching Vercel screenshot independently shows Ready / Production. This proves the installation and deployment boundary, not a successful image upload.

## Observed fault and causal chain

The owner editor's text fields load, but its independent media snapshot fails. The user sees the saved-picture read error and a retry button; both image sections require a verified snapshot before they become available. Retry rereads data and does not invoke the native file picker.

A bounded anonymous read of the user's already-known public profile returned a 117,816-byte media JSON object. Its legacy avatar field was a 117,423-byte `data:` URL, while its cover was an ordinary 180-byte HTTPS URL. Only type/length/status observations were retained, not the image bytes or a key. A separate unauthenticated POST to the owner-media route returned the expected 401, showing the deployed route and configuration could initialize.

The private owner snapshot and public media projection share `profile_media_private.slot_asset`. That resolver previously put an unrestricted selected legacy string into JSON. The server's 65,536-byte RPC limit rejected the owner response before the existing parser could discard an unsupported URL. The HTTP handler consequently returned a media error; the frontend correctly kept the unverified editing session closed. Increasing response limits or treating failure as an empty snapshot would conceal the defect and weaken existing guarantees.

## Narrow correction

The repair replaces only the selected legacy-value handling in `profile_media_private.slot_asset(uuid,text)`. An unsupported embedded value or oversized legacy address is resolved to NULL before JSON serialization. Compatible HTTP(S) references remain available. A byte limit also bounds UTF-8 expansion. Selection precedence is preserved: an invalid selected value does not revive a different lower-priority old image.

The managed-image branch remains unchanged, including authoritative removal. The repair updates no user/profile rows or objects and performs no Storage operations. It changes no grants, owners, RLS rules, media revisions, actor checks, origin checks, upload limits or app request limits. Avatar and cover remain independent: an unsupported avatar cannot prevent a valid cover or both file pickers from becoming available.

## Verification and delivery

The regression uses a synthetic embedded image of the observed length, exercises the actual HTTP service/transport error path, and checks the bounded corrected result. Separate real SQL fixtures exercise the replacement against the accepted catalog using non-superuser caller roles. They verify owner/public results, compatible legacy references, UTF-8 boundaries, managed branches and preservation of source data. Component checks cover both file-input invocations; they do not claim a real Safari file picker or successful production upload.

The new package is independently named and sealed. Its installer requires the exact accepted media receipt and complete source tree, checks the current catalog, attempts the new SQL transaction once, and verifies the outcome through a separate read before committing and pushing. The old package and migration remain immutable. The corrected production behavior remains awaiting the user's execution and usage check.
