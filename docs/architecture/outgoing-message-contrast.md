# Outgoing message contrast — 18 November 2026

This CSS-only iteration follows accepted commit 413e8fc. It supersedes the
pale outgoing-bubble palette documented in message-card-usability.md;
the earlier whole-card links and their behavior remain unchanged.

## Visual decision

Use one stable sender palette in every conversation. Own messages stay on
the right with background #176b4b and white text. Incoming messages stay
on the left with #f1f3f5 and #17231b. The separate offer context keeps its
amber listing/horse, teal service or blue job card with explicit dark text.
This lets position and lightness identify the sender while the attachment
identifies the offer kind. No extra badges, bubble tails or animations.

Own timestamps, long-history notices and nested photo-loading text use
#d7ebdf. Own photo retry buttons use white. Keyboard focus for an own
photo, retry button or offer card uses a white 2px outline with 3px offset.
The open photo dialog still has its explicit white background and dark text.

## Scope

Only src/features/listing-conversation/components/conversation.module.css
changes at runtime. Scoped .mine .bubble rules use the existing sender
class. No JSX, data, message transport, links, conversation ownership,
permissions, block state, text contents, geometry or responsive layout changes.
The explicit offer-card text/background utilities prevent white message text
from turning attachment labels white. Incoming and composer rules are intact.

## Evidence

The previous successful Mac receipt binds release 8b2c3eb1… to 413e8fc;
its source tree has 1879 files and Git tree b1430ad427acd1105ccc82e1e3a2b43d8457d529.
The receipt records complete/build passed/push verified and no database or
Storage work. Its READY_NOT_CHECKED field is kept as historical truth;
the user-supplied matching Vercel screenshot separately shows Ready/Production.
The new conversation screenshot shows the old pale palette only.

Independent source review and one full isolated Next.js/TypeScript build PASS.
729 build inputs are recorded with zero drift. Calculated sRGB contrast:
white own text/focus 6.48:1, own light timestamp 5.20:1, incoming body 14.60:1,
incoming timestamp 5.88:1. This is calculated contrast, not browser measurement.
No application unit or regression suite was added/repeated for this CSS delta.

Browser visual verification is BLOCKED. The preceding executor Chromium
launch was denied before page creation; the cloud browser then explicitly
denied a local file URL. This iteration respects that boundary, makes no
new browser attempt, and does not claim screenshots or browser assertions.
Actual dark-palette acceptance remains a post-deployment user observation.

The new updater has a separate outgoing-message-contrast-20261118 journal,
holds the exact prior original receipt read-only, verifies the actual Mac
base/tree/index/remote and changes only the reviewed payload. It performs one
build and the authorized commit/push. Its small local Git/runner checks use
a simulated build and are separate from the actual candidate build above.
