-- The existing unique (blocker_id,blocked_id) index retains pair uniqueness.
-- Incoming viewer sets also need blocked_id as the leading lookup key.
-- Bounded transactional CREATE INDEX; no content or preference row writes.
CREATE INDEX user_blocks_blocked_blocker_idx_v1 ON public.user_blocks USING btree(blocked_id,blocker_id);
