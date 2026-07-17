begin;

create or replace function public.rename_my_store_category_v2(
  p_category_id uuid,
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

  v_original_parent_id uuid;
  v_updated_category public.store_categories%rowtype;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  if p_category_id is null then
    raise exception
      'Store category is required.'
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
   * Lock and verify the selected category.
   *
   * Only a category belonging to the current active identity
   * can be renamed.
   */
  select category.parent_id
  into v_original_parent_id
  from public.store_categories category
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id
  for update;

  if not found then
    raise exception
      'The store category does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Rename only.
   *
   * parent_id, identity_id, user_id and sort_order remain unchanged.
   * Existing database triggers normalize and validate the name.
   * Existing unique indexes protect sibling-name uniqueness.
   */
  update public.store_categories as category
  set name = v_clean_name
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id
  returning category.*
  into v_updated_category;

  if v_updated_category.parent_id is distinct from v_original_parent_id then
    raise exception
      'Store category parent changed unexpectedly.'
      using errcode = '23514';
  end if;

  return query
  select
    v_updated_category.id,
    v_updated_category.name,
    v_updated_category.sort_order,
    v_updated_category.parent_id,
    v_updated_category.identity_id;

exception
  when unique_violation then
    raise exception
      'A sibling store category with this name already exists.'
      using errcode = '23505';
end;
$function$;

comment on function public.rename_my_store_category_v2(uuid, text) is
  'Renames a root or child store category belonging to the authenticated user active identity. Hierarchy position remains unchanged.';

revoke all
on function public.rename_my_store_category_v2(uuid, text)
from public, anon, authenticated;

grant execute
on function public.rename_my_store_category_v2(uuid, text)
to authenticated;

commit;
