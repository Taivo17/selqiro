-- Run inside the migration transaction, BEFORE the existing regression suite.
-- Checks effective values at this point; the runner separately proves commit/rollback reset.
do $rollout_limits_test$
begin
  if current_setting('server_version_num')::integer < 170000 then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: PostgreSQL 17 required';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: PostgreSQL 17 or later';
  if current_setting('lock_timeout') <> '2s' then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: lock timeout';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: same-transaction lock timeout 2s';
  if current_setting('statement_timeout') <> '15s' then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: statement timeout';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: same-transaction statement timeout 15s';
  if current_setting('idle_in_transaction_session_timeout') <> '10s' then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: idle timeout';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: same-transaction idle timeout 10s';
  if current_setting('transaction_timeout') <> '30s' then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: transaction timeout';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: same-transaction transaction timeout 30s';
  if current_setting('transaction_read_only') <> 'off' then
    raise exception 'ROLLOUT_LIMITS_ASSERT_FAILED: isolated write transaction required';
  end if;
  raise notice 'ROLLOUT_LIMITS_PASS: isolated write transaction';
end;
$rollout_limits_test$;
select 'PUBLIC_LISTING_ROLLOUT_LIMITS_SUITE=PASS';
