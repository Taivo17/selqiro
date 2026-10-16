# SOURCE signing never released — dormant V2 cleanup boundary

Base: 8f5c3a82a803f9d5f977a9fbce62cbdb656f0164. Candidate only; no migration or API grant.

This step is NOT revocation of a signed upload URL. It handles only a terminal
attempt whose durable grant remains `signing`, without any recorded token/hash.
The unchanged broker persists a token through `record_listing_upload_grant_v1`
before retrieving it through `get_my_listing_upload_grant_v1`; it returns no token
from the signing HTTP response directly. The grant state cannot move backwards.
The getter holds the attempt lock in SHARE mode and requires an open attempt.
Thus `signing` at terminal closure cannot follow a successful owner token release.

One new private immutable `source_no_release` row proves this condition. The same
attempt lock serializes closure, token recording, owner retrieval and this proof.
A trigger additionally fences the unchanged record RPC: a late signing response
cannot persist/release its token after the no-release proof. The source lineage is
not removed. The existing cleaner obtains exactly this target only after proof;
only its subsequent Storage API deletion/absence confirmation releases bytes.

The new server wrapper makes ONE bounded database call. It does not sign, fetch
object bytes, upload, delete, publish, enumerate users, or retry on its own. A lost
response means `reconcile`; the proof is durable, and a later scan skips it. Busy
attempts are skipped rather than blocking a second independent attempt. Repeated
scans do not enqueue a deleted target again.

Existing recorded grants remain blocked even if the token was never retrieved,
its acknowledgement was lost, its time expired or its stored secret was purged.
This conservatism is intentional: the old schema does not prove non-delivery for
recorded tokens. No 404, local abort, timeout, logout or expiry becomes a drain
proof. Source reservations still `reserved` use the existing unsigned reconciler;
insufficient WEB evidence also remains blocked. This is NOT complete file deletion.

All upload, broker, cleaner, existing reconcile, price, identity and policy SOURCE
FILES are unchanged. The lab overlay replaces only the two cleanup eligibility
functions with their original bodies plus the new immutable proof alternative.
It adds a narrowly owned record-fence trigger, not a generic workflow engine.
Future activation must verify the record-before-get broker is the exclusive
capability release path, private secrets are never logged, and no other writer can
use the source namespace. Direct privileged writes remain outside this proof.
A live rollout also needs separate function/ACL/Storage acceptance. Existing users,
listings, images and journals are not deletion-test material.

New tests: 33 Node/HTTP cases with the actual unchanged broker and cleaner against
synthetic loopback responses, strict project ES2017 compile; SQL plan 50 rollback
labels + 15 assertions in five schedules + 2 isolation rejections = 67. SQL is not
yet executed in PostgreSQL during candidate preparation. Two schedules require
real lock waits, three prove skip/progress ordering. No old test suite is replayed.
These are targeted tests, NOT browser, real Auth/Storage or native cloud evidence.
All SQL runs belong only in the disposable, network-isolated fixture.
