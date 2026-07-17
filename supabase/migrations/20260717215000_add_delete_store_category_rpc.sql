begin;

create or replace function public.delete_my_store_category_v2(
  p_category_id uuid
)
returns table (
  deleted_category_id uuid,
  deleted_name text,
  deleted_parent_id uuid,
  deleted_level text,
  removed_listing_links integer
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_category_name text;
  v_parent_id uuid;

  v_child_count integer;
  v_removed_listing_links integer := 0;
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
   * Lock the selected category.
   *
   * The category must belong to the current active identity.
   * The row lock also prevents a concurrent child insertion while
   * the deletion checks are running.
   */
  select
    category.name,
    category.parent_id
  into
    v_category_name,
    v_parent_id
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
   * Never cascade-delete child categories.
   *
   * A root category must first be emptied by deleting or moving
   * its direct children through separate user-confirmed actions.
   */
  select count(*)::integer
  into v_child_count
  from public.store_categories child
  where child.parent_id = p_category_id;

  if v_child_count > 0 then
    raise exception
      'The store category has child categories and cannot be deleted.'
      using errcode = '23503';
  end if;

  /*
   * Remove only listing/category relations.
   *
   * Listings themselves remain untouched. Although the foreign key
   * also uses ON DELETE CASCADE, explicit deletion lets the RPC return
   * the exact number of removed relations.
   */
  with deleted_links as (
    delete from public.listing_store_categories relation
    where relation.store_category_id = p_category_id
    returning 1
  )
  select count(*)::integer
  into v_removed_listing_links
  from deleted_links;

  delete from public.store_categories category
  where category.id = p_category_id
    and category.identity_id = v_active_identity_id;

  if not found then
    raise exception
      'The store category could not be deleted.'
      using errcode = '40001';
  end if;

  return query
  select
    p_category_id,
    v_category_name,
    v_parent_id,
    case
      when v_parent_id is null then 'root'
      else 'child'
    end::text,
    v_removed_listing_links;
end;
$function$;

comment on function public.delete_my_store_category_v2(uuid) is
  'Deletes one child category or one childless root category belonging to the authenticated user active identity. Listings remain intact; only listing/category relations are removed.';

revoke all
on function public.delete_my_store_category_v2(uuid)
from public, anon, authenticated;

grant execute
on function public.delete_my_store_category_v2(uuid)
to authenticated;

commit;
