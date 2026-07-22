begin;

/*
 * Protect every authenticated direct update of
 * profiles.active_identity_id.
 *
 * This keeps the current legacy header functional,
 * but prevents it from assigning an inaccessible
 * private or business identity.
 */
create or replace function public.validate_profile_active_identity_v2()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_jwt_role text := coalesce(auth.role(), '');
begin
  if new.active_identity_id
    is not distinct from old.active_identity_id
  then
    return new;
  end if;

  /*
   * SQL Editor, postgres and trusted backend jobs may
   * operate without an end-user JWT.
   *
   * Anonymous or authenticated JWT requests without a
   * user ID must never bypass the identity check.
   */
  if v_user_id is null then
    if v_jwt_role in ('anon', 'authenticated') then
      raise exception
        'Authentication is required to change active identity.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.id is distinct from v_user_id then
    raise exception
      'A user can change only their own active identity.'
      using errcode = '42501';
  end if;

  if new.active_identity_id is null then
    raise exception
      'Active identity cannot be empty.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      new.active_identity_id
    ),
    false
  ) then
    raise exception
      'The selected identity is not accessible to the authenticated user.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

drop trigger if exists
  validate_profile_active_identity_before_write
on public.profiles;

create trigger
  validate_profile_active_identity_before_write
before update of active_identity_id
on public.profiles
for each row
execute function
  public.validate_profile_active_identity_v2();

comment on function
  public.validate_profile_active_identity_v2()
is
  'Validates authenticated direct changes to profiles.active_identity_id. The target identity must belong to the user or be accessible through active business membership.';

/*
 * Canonical V2 active-identity switch operation.
 *
 * The authenticated user is resolved from auth.uid().
 * The client does not supply a user ID.
 */
create or replace function public.set_my_active_identity_v2(
  p_identity_id uuid
)
returns table (
  identity_id uuid,
  identity_type text,
  display_name text,
  avatar_url text,
  slug text,
  changed boolean
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();

  v_previous_identity_id uuid;
  v_identity_type text;
  v_display_name text;
  v_avatar_url text;
  v_slug text;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_identity_id is null then
    raise exception
      'Identity ID is required.'
      using errcode = '22023';
  end if;

  /*
   * The target must be an existing active identity.
   */
  select
    i.type::text,
    i.display_name,
    i.avatar_url,
    ip.slug
  into
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug
  from public.identities i
  left join public.identity_profiles ip
    on ip.identity_id = i.id
  where i.id = p_identity_id
    and i.status = 'active';

  if not found then
    raise exception
      'The selected identity does not exist or is inactive.'
      using errcode = '22023';
  end if;

  /*
   * Private ownership or active business membership
   * must be valid for the authenticated user.
   */
  if not coalesce(
    public.current_user_has_identity_access(
      p_identity_id
    ),
    false
  ) then
    raise exception
      'The selected identity is not accessible to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock the user's profile so concurrent switches are
   * serialized.
   */
  select profile.active_identity_id
  into v_previous_identity_id
  from public.profiles profile
  where profile.id = v_user_id
  for update;

  if not found then
    raise exception
      'The authenticated user profile does not exist.'
      using errcode = '22023';
  end if;

  if v_previous_identity_id
    is distinct from p_identity_id
  then
    update public.profiles
    set active_identity_id = p_identity_id
    where id = v_user_id;
  end if;

  return query
  select
    p_identity_id,
    v_identity_type,
    v_display_name,
    v_avatar_url,
    v_slug,
    (
      v_previous_identity_id
      is distinct from p_identity_id
    );
end;
$function$;

comment on function public.set_my_active_identity_v2(uuid)
is
  'Securely switches the authenticated user active identity after validating private ownership or active business membership. Returns the selected identity summary.';

revoke all
on function public.validate_profile_active_identity_v2()
from public, anon, authenticated;

revoke all
on function public.set_my_active_identity_v2(uuid)
from public, anon, authenticated;

grant execute
on function public.set_my_active_identity_v2(uuid)
to authenticated;

commit;
