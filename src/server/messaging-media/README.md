# Private message photos

The `/api/v2/message-images/{upload,read,cancel}` POST routes accept an authenticated bearer token and explicit expected user, active identity and conversation. The existing publication runtime configuration and actor gate remain in force. No service credential is returned to a browser.

One JPEG, PNG or WebP original of at most 5 MiB is accepted by the local browser preparation helper. It resizes to at most 1600 pixels per edge and converts to WebP. The prepared transport is at most 1,400,000 bytes; the entire JSON HTTP request is bounded to 2,000,000 bytes. The server verifies its digest and independently decodes, removes metadata and re-encodes using the existing Sharp dependency. The canonical output is bounded to 1600 pixels per edge and 2,000,000 bytes. Animated/malformed prepared images are rejected.

## Upload and binding

The authenticated reservation RPC checks the exact actor and conversation before external writes. Its immutable request key binds the prepared source digest. A service-only claim freezes the canonical digest, length and dimensions before writing to the private `message-attachments-v2` bucket at `conversationId/attachmentId.webp`. Storage writes use `POST` with `x-upsert: false`, matching the installed Supabase Storage SDK. A readback must match the complete canonical bytes and SHA-256 before SQL can mark the reservation ready. A lost write/finalization acknowledgement is retried with the same prepared image and request key; another image must have a new request key.

Only the controlled SQL message sender can attach a ready reservation, exactly once. Upload is not message sending. An attached image cannot be cancelled or picked up by orphan cleanup. A cancellation that races an external write permanently tombstones the reservation; a late successful write cannot make it bindable again.

## Private reads and old photos

The read route takes only the actor, conversation ID and message ID. SQL supplies the authoritative binding after checking participation. The server reads the private object and returns a `private, no-store` image blob with same-origin resource policy. It never accepts a caller-supplied URL or sends a bucket/path/signed URL to the browser. A new image's length and digest must match its immutable record. A legitimate V1 `messages` object must match the exact conversation prefix and safe filename; it is decoded and re-encoded before proxy delivery. V1 images are never deleted by this subsystem.

## Durable orphan maintenance

After successful authenticated messaging or media operations, Next `after()` schedules a bounded global cleanup pass (at most three claims and a three-second local budget). SQL leases only cancelled or expired unattached new reservations. The server submits deletion observations back to the ledger. Unknown responses retain the claim/tombstone for later retries. Even a successful deletion is not treated as proof that a delayed provider write cannot arrive: tombstones remain and are revisited. No periodic scheduler or provider late-write finality is assumed.

## Local verification

`node --conditions=react-server --test --test-isolation=none tests/message-images.test.cjs`

These tests use local Sharp fixtures and injected synthetic Auth/RPC/Storage. They check metadata removal, format/dimension/animation restrictions, identity/context binding, immutable object write/replay, lost acknowledgements, cancellation races, safe legacy reads, request/response budgets and cleanup bounds. They do not validate hosted database installation, actual storage policies, a real device keyboard or delivery between real users; those remain separate release checks.
