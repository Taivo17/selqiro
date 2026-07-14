begin;

create or replace function public.create_my_store_child_category_v2(
  p_parent_id uuid,
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

  v_parent_identity_id uuid;
  v_parent_parent_id uuid;

  v_clean_name text;
  v_next_sort_order integer;

  v_created_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_parent_id is null then
    raise exception
      'Parent store category is required.'
      using errcode = '22023';
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

  /*
   * Lock the selected parent while the next child sort order is
   * calculated. The parent must exist and belong to the active identity.
   */
  select
    category.identity_id,
    category.parent_id
  into
    v_parent_identity_id,
    v_parent_parent_id
  from public.store_categories category
  where category.id = p_parent_id
  for update;

  if not found then
    raise exception
      'The selected parent store category does not exist.'
      using errcode = '22023';
  end if;

  if v_parent_identity_id is distinct from v_active_identity_id then
    raise exception
      'The selected parent does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * V2 exposes exactly two levels:
   * root -> direct child.
   *
   * The table model itself remains capable of deeper hierarchy later.
   */
  if v_parent_parent_id is not null then
    raise exception
      'V2 child categories can only be added under a root category.'
      using errcode = '22023';
  end if;

  select
    coalesce(max(category.sort_order), -1) + 1
  into v_next_sort_order
  from public.store_categories category
  where category.identity_id = v_active_identity_id
    and category.parent_id = p_parent_id;

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
    p_parent_id,
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
      'A child store category with this name already exists under the selected root.'
      using errcode = '23505';
end;
$function$;

comment on function public.create_my_store_child_category_v2(uuid, text) is
  'Creates one direct child category under a root category belonging to the authenticated user active identity. V2 allows two UI levels.';

revoke all
on function public.create_my_store_child_category_v2(uuid, text)
from public, anon, authenticated;

grant execute
on function public.create_my_store_child_category_v2(uuid, text)
to authenticated;

commit;
