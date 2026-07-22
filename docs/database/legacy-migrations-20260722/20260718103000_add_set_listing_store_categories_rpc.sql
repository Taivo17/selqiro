begin;

create or replace function public.set_my_listing_store_categories_v2(
  p_listing_id text,
  p_category_ids uuid[] default '{}'::uuid[]
)
returns table (
  listing_id bigint,
  category_ids uuid[],
  assigned_count integer,
  removed_previous_links integer
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;

  v_listing_id bigint;
  v_listing_identity_id uuid;

  v_normalized_category_ids uuid[] := '{}'::uuid[];
  v_requested_count integer := 0;
  v_valid_count integer := 0;
  v_removed_count integer := 0;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
  end if;

  /*
   * Listing IDs arrive from the browser as strings.
   * Accept only a positive numeric database ID.
   */
  if btrim(coalesce(p_listing_id, '')) !~ '^[0-9]+$' then
    raise exception
      'A valid listing ID is required.'
      using errcode = '22023';
  end if;

  v_listing_id := btrim(p_listing_id)::bigint;

  select profile.active_identity_id
  into v_active_identity_id
  from public.profiles profile
  where profile.id = v_user_id;

  if v_active_identity_id is null then
    raise exception
      'Active identity is missing.'
      using errcode = '22023';
  end if;

  if not coalesce(
    public.current_user_has_identity_access(
      v_active_identity_id
    ),
    false
  ) then
    raise exception
      'The active identity does not belong to the authenticated user.'
      using errcode = '42501';
  end if;

  /*
   * Lock and verify the listing.
   *
   * Store categories are identity-owned, therefore V2 assignment
   * requires identity_id ownership. A legacy user_id-only listing
   * must first be migrated to identity ownership.
   */
  select listing.identity_id
  into v_listing_identity_id
  from public.listings listing
  where listing.id = v_listing_id
  for update;

  if not found then
    raise exception
      'The listing does not exist.'
      using errcode = '22023';
  end if;

  if v_listing_identity_id is null
    or v_listing_identity_id <> v_active_identity_id
  then
    raise exception
      'The listing does not belong to the active identity.'
      using errcode = '42501';
  end if;

  /*
   * Normalize the requested set:
   *
   * - NULL input becomes an empty array
   * - NULL category IDs are discarded
   * - duplicate IDs are removed
   * - deterministic ordering is used in the returned value
   */
  select coalesce(
    array_agg(
      distinct requested.category_id
      order by requested.category_id
    ),
    '{}'::uuid[]
  )
  into v_normalized_category_ids
  from unnest(
    coalesce(p_category_ids, '{}'::uuid[])
  ) as requested(category_id)
  where requested.category_id is not null;

  v_requested_count :=
    coalesce(cardinality(v_normalized_category_ids), 0);

  /*
   * Every selected category must belong to the same active identity.
   * A foreign, missing or stale category ID rejects the whole update.
   */
  if v_requested_count > 0 then
    select count(*)::integer
    into v_valid_count
    from public.store_categories category
    where category.identity_id = v_active_identity_id
      and category.id = any(v_normalized_category_ids);

    if v_valid_count <> v_requested_count then
      raise exception
        'One or more store categories do not belong to the active identity.'
        using errcode = '42501';
    end if;
  end if;

  /*
   * Replace the complete explicit assignment set atomically.
   *
   * If validation or insertion fails, PostgreSQL rolls the entire
   * function call back, including this deletion.
   */
  with deleted_links as (
    delete from public.listing_store_categories relation
    where relation.listing_id = v_listing_id
    returning 1
  )
  select count(*)::integer
  into v_removed_count
  from deleted_links;

  if v_requested_count > 0 then
    insert into public.listing_store_categories (
      listing_id,
      store_category_id
    )
    select
      v_listing_id,
      selected_category.category_id
    from unnest(
      v_normalized_category_ids
    ) as selected_category(category_id);
  end if;

  return query
  select
    v_listing_id,
    v_normalized_category_ids,
    v_requested_count,
    v_removed_count;
end;
$function$;

comment on function public.set_my_listing_store_categories_v2(
  text,
  uuid[]
) is
  'Atomically replaces explicit store-category links for a listing belonging to the authenticated user active identity. Empty array removes all links. Parent links are not added automatically.';

revoke all
on function public.set_my_listing_store_categories_v2(
  text,
  uuid[]
)
from public, anon, authenticated;

grant execute
on function public.set_my_listing_store_categories_v2(
  text,
  uuid[]
)
to authenticated;

commit;
