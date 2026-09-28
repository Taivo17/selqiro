begin;

-- Additive function only. No existing rows, table grants, triggers or reads change.
set local lock_timeout = '2s';
set local statement_timeout = '15s';

do $preflight$
begin
  if to_regclass('public.listings') is null
    or to_regclass('public.profiles') is null
    or to_regprocedure('public.current_user_has_identity_access(uuid)') is null then
    raise exception 'listing_activity_foundation_required';
  end if;
end;
$preflight$;

create function public.renew_my_listing_activity_v1(
  p_listing_id text,
  p_expected_active_until timestamptz
)
returns table (
  listing_id text,
  status text,
  active_until timestamptz,
  changed boolean
)
language plpgsql volatile security definer
set search_path = pg_catalog, public, auth, pg_temp
set timezone = 'UTC'
set lock_timeout = '2s'
as $function$
declare
  v_actor uuid := auth.uid();
  v_identity uuid;
  v_id bigint;
  v_status text;
  v_existing_until timestamptz;
  v_new_until timestamptz;
  v_affected bigint;
begin
  if v_actor is null then
    raise exception 'listing_activity_authentication_required' using errcode = '42501';
  end if;
  if p_listing_id is null or char_length(p_listing_id) > 19
    or p_listing_id !~ '^[1-9][0-9]*$' then
    raise exception 'listing_activity_id_invalid' using errcode = '22023';
  end if;
  if p_listing_id::numeric > 9223372036854775807 then
    raise exception 'listing_activity_id_invalid' using errcode = '22023';
  end if;
  v_id := p_listing_id::bigint;
  if p_expected_active_until is not null and not isfinite(p_expected_active_until) then
    raise exception 'listing_activity_deadline_invalid' using errcode = '22023';
  end if;

  -- Same profile-before-listing lock order as the existing classification writer.
  -- A concurrent active-identity switch must wait or this request fails closed.
  select profile.active_identity_id into v_identity
  from public.profiles profile where profile.id = v_actor for update;
  if v_identity is null or not coalesce(
    public.current_user_has_identity_access(v_identity), false
  ) then
    raise exception 'listing_activity_identity_required' using errcode = '42501';
  end if;

  -- Filter ownership BEFORE locking. No legacy user_id fallback or identity adoption.
  select listing.status, listing.active_until into v_status, v_existing_until
  from public.listings listing
  where listing.id = v_id and listing.identity_id = v_identity
  for update;
  if not found then
    raise exception 'listing_activity_not_found_or_forbidden' using errcode = '42501';
  end if;
  if v_status is distinct from 'active' then
    raise exception 'listing_activity_active_status_required' using errcode = '55000';
  end if;
  if v_existing_until is not null and not isfinite(v_existing_until) then
    raise exception 'listing_activity_deadline_invalid' using errcode = '22023';
  end if;
  if v_existing_until is distinct from p_expected_active_until then
    raise exception 'listing_activity_conflict' using errcode = '40001';
  end if;

  -- Historical NULL expiry is currently publicly valid. Do not silently shorten it.
  -- New finite-expiry creation and legacy data migration are separate contracts.
  if v_existing_until is null then
    return query select v_id::text, v_status, v_existing_until, false;
    return;
  end if;

  -- The browser cannot set duration, a new expiry, status or actor identity.
  -- UTC makes this 90 * 24 hours, independent of client/session daylight-saving rules.
  v_new_until := clock_timestamp() + interval '90 days';
  if v_existing_until >= v_new_until then
    return query select v_id::text, v_status, v_existing_until, false;
    return;
  end if;
  update public.listings listing set active_until = v_new_until
  where listing.id = v_id and listing.identity_id = v_identity
    and listing.status = 'active'
    and listing.active_until is not distinct from p_expected_active_until;
  get diagnostics v_affected = row_count;
  if v_affected <> 1 then
    raise exception 'listing_activity_conflict' using errcode = '40001';
  end if;
  return query select v_id::text, v_status, v_new_until, true;
end;
$function$;

comment on function public.renew_my_listing_activity_v1(text, timestamptz) is
  'Explicit free activity confirmation for one existing active-status listing owned by the authenticated active identity. Server UTC 90-day deadline; expected previous deadline protects against stale repeat writes. Does not change status, identity, content, creation time, images, categories or Energy. NULL legacy expiry and a longer existing period remain unchanged. Not a paused/sold republish or a global legacy-writer retirement.';

revoke all on function public.renew_my_listing_activity_v1(text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.renew_my_listing_activity_v1(text, timestamptz)
  to authenticated, service_role;

commit;
