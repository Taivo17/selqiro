begin;

create or replace function public.current_user_has_identity_access(
  p_identity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.identities identity
      where identity.id = p_identity_id
        and identity.status = 'active'
        and (
          (
            identity.type = 'private'
            and identity.user_id = auth.uid()
          )
          or
          (
            identity.type = 'business'
            and exists (
              select 1
              from public.business_members member
              where member.business_account_id =
                identity.business_account_id
                and member.user_id = auth.uid()
                and member.status = 'active'
            )
          )
        )
    );
$function$;

comment on function public.current_user_has_identity_access(uuid) is
  'Internal authorization helper. Returns true when the authenticated user owns an active private identity or is an active member of the business identity.';

revoke all
on function public.current_user_has_identity_access(uuid)
from public, anon, authenticated;

create or replace function public.create_my_store_root_category_v2(
  p_name text
)
returns table (
  id uuid,
  name text,
  sort_order integer,
  parent_id uuid,
  identity_id uuid
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
  v_clean_name text;
  v_next_sort_order integer;
  v_created_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  v_clean_name := regexp_replace(
    btrim(coalesce(p_name, '')),
    '[[:space:]]+',
    ' ',
    'g'
  );

  if char_length(v_clean_name) = 0 then
    raise exception
      'Store category name cannot be empty.'
      using errcode = '22023';
  end if;

  if char_length(v_clean_name) > 60 then
    raise exception
      'Store category name cannot be longer than 60 characters.'
      using errcode = '22023';
  end if;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not public.current_user_has_identity_access(
    v_active_identity_id
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  select
    coalesce(max(category.sort_order), -1) + 1
  into v_next_sort_order
  from public.store_categories category
  where category.identity_id = v_active_identity_id
    and category.parent_id is null;

  insert into public.store_categories (
    user_id,
    identity_id,
    parent_id,
    name,
    sort_order
  )
  values (
    v_user_id,
    v_active_identity_id,
    null,
    v_clean_name,
    v_next_sort_order
  )
  returning *
  into v_created_category;

  return query
  select
    v_created_category.id,
    v_created_category.name,
    v_created_category.sort_order,
    v_created_category.parent_id,
    v_created_category.identity_id;

exception
  when unique_violation then
    raise exception
      'A root store category with this name already exists.'
      using errcode = '23505';
end;
$function$;

comment on function public.create_my_store_root_category_v2(text) is
  'Creates one root store category for the authenticated user active identity. The client does not provide identity_id or parent_id.';

revoke all
on function public.create_my_store_root_category_v2(text)
from public, anon;

grant execute
on function public.create_my_store_root_category_v2(text)
to authenticated;

commit;
