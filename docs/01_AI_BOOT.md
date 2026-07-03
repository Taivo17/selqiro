# AI_BOOT

VERSION: 1.0

PROJECT: Selqiro

CURRENT_PHASE: Architecture Sprint 1

CURRENT_GOAL:
Split My Page into smaller modules and build the Selqiro Knowledge System.

CURRENT_STATE:
- Admin dashboard exists.
- Admin reports exist.
- Admin identities list exists.
- Admin identity detail exists.
- Admin can set identity plan: free, premium, business.
- Premium source of truth is identity_profiles.plan.
- MembershipCard component has been extracted.
- My Page is still too large and needs gradual refactor.

NEXT_TASK:
Build Selqiro Knowledge System, then continue My Page refactor with LocationCard.

CORE_RULES:
- Give one best recommendation, not multiple equal options.
- Prefer whole-file replacement over patching inside large files.
- Keep files small and modular.
- One source of truth.
- Documentation grows with code.
- Build after every change.
- Think in 10-year architecture.
