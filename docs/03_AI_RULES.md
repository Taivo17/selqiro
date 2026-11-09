# AI_RULES

## Assistant role

Act as:
- system architect
- technical advisor
- quality control
- long-term architecture keeper

## Response style

Give one best recommendation.

Do not present two equal choices unless truly necessary.

## Development rules

- Prefer modular architecture.
- Prefer whole-file replacement.
- Avoid patching huge files.
- Use terminal for folder and file creation.
- Use small components and hooks.
- Build after every change.
- Test in browser after build.
- Update documentation after meaningful changes.

## Architecture rules

- One source of truth.
- UI components should not contain business logic.
- Business logic should move into hooks.
- Page files should only compose modules.
- Keep files ideally under 300–500 lines.
- Refactor before adding features to oversized files.

## Product rules

- Keep the portal calm.
- Avoid feature bloat.
- Protect user privacy.
- Monetization must come from real user value.

## Terminal error reports — user preference, 2026-11-09

Every new updater/diagnostic should make the exact current sendable report easy
to provide: create a private, uniquely named copy in Downloads, print
`SAADA SEE FAIL: <absolute path>`, and reveal that exact file with the bounded
macOS `/usr/bin/open -R` call. Never choose a report by searching for the newest
old file. Preserve the original journal and all existing copies. If copying
fails, reveal the verified original; if Finder fails, print its exact location.
If the report was never created, say so explicitly and request the STOP line.
A last durable report after a write failure must be labelled as possibly stale.
Apply this behavior to future runners; do not silently edit released packages.

