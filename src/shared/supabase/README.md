# Supabase shared layer

This folder contains Supabase access helpers for V2 production code.

Rule:

UI components should not import Supabase directly.

Preferred flow:

UI
↓
feature
↓
entity API
↓
shared Supabase client

This keeps data access easier to understand and test.
