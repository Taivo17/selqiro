# Profile entity

Profile entity owns public profile / brand space data for V2 production code.

Public profile should use existing public profile RPCs instead of reading many tables directly in UI.

Initial source:

- get_store_by_slug

V2 production rule:

Public Profile UI should not query Supabase directly.
