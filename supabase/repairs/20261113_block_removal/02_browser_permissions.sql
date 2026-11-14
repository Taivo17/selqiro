-- A browser may create its own account pair, but cannot supply/rewrite a CAS
-- generation, reset its sequence, or remove rows outside the existing setter.
-- Explicit column revokes also cover grants that table-level REVOKE cannot undo.
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
REVOKE INSERT(id,blocker_id,blocked_id,created_at),UPDATE(id,blocker_id,blocked_id,created_at)
 ON TABLE public.user_blocks FROM PUBLIC,anon,authenticated;
GRANT INSERT(blocker_id,blocked_id) ON TABLE public.user_blocks TO authenticated;
REVOKE UPDATE ON SEQUENCE public.user_blocks_id_seq FROM PUBLIC,anon,authenticated;
