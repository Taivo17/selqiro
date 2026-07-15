begin;

create or replace function public.get_store_category_scope_ids(
  p_identity_id uuid,
  p_category_id uuid
)
returns table (
  category_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with recursive category_scope (
    category_id,
    visited_ids
  ) as (
    /*
     * Scope always starts from the selected category.
     * The selected category must belong to the supplied identity.
     */
    select
      category.id,
      array[category.id]::uuid[]
    from public.store_categories category
    where category.id = p_category_id
      and category.identity_id = p_identity_id

    union all

    /*
     * Include every descendant.
     * The path guard prevents accidental recursive cycles.
     */
    select
      child.id,
      scope.visited_ids || child.id
    from public.store_categories child
    join category_scope scope
      on child.parent_id = scope.category_id
    where child.identity_id = p_identity_id
      and not child.id = any(scope.visited_ids)
  )
  select scope.category_id
  from category_scope scope;
$function$;

comment on function public.get_store_category_scope_ids(uuid, uuid) is
  'Internal recursive helper. Returns the selected store category and all descendants belonging to the supplied identity.';

revoke all
on function public.get_store_category_scope_ids(uuid, uuid)
from public, anon, authenticated;

create or replace function public.get_my_identity_listings(
  result_limit integer default 30,
  result_offset integer default 0,
  status_filter text default 'all'::text,
  search_query text default ''::text,
  store_category_filter uuid default null::uuid
)
returns table (
  id bigint,
  user_id uuid,
  identity_id uuid,
  created_at timestamp with time zone,
  title text,
  description text,
  price text,
  image text,
  status text,
  active_until timestamp with time zone,
  category text,
  subcategory text,
  details jsonb,
  condition text,
  country text,
  city text,
  location text,
  search_text text,
  manufacturer text,
  part_number text,
  oem_number text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year text,
  engine text
)
language sql
security definer
set search_path = public, auth, pg_temp
as $function$
  with active_profile as (
    select profile.active_identity_id
    from public.profiles profile
    where profile.id = auth.uid()
      and public.current_user_has_identity_access(
        profile.active_identity_id
      )
  ),
  selected_category_scope as (
    select scope.category_id
    from active_profile profile
    cross join lateral public.get_store_category_scope_ids(
      profile.active_identity_id,
      store_category_filter
    ) scope
    where store_category_filter is not null
  )
  select
    listing.id,
    listing.user_id,
    listing.identity_id,
    listing.created_at,
    listing.title,
    listing.description,
    listing.price,
    listing.image,
    listing.status,
    listing.active_until,
    listing.category,
    listing.subcategory,
    listing.details,
    listing.condition,
    listing.country,
    listing.city,
    listing.location,
    listing.search_text,
    listing.manufacturer,
    listing.part_number,
    listing.oem_number,
    listing.vehicle_brand,
    listing.vehicle_model,
    listing.vehicle_year,
    listing.engine
  from active_profile profile
  join public.listings listing
    on listing.identity_id = profile.active_identity_id
  where (
    status_filter = 'all'
    or listing.status = status_filter
  )
  and (
    coalesce(search_query, '') = ''
    or listing.search_vector @@ websearch_to_tsquery(
      'simple',
      search_query
    )
    or listing.search_text ilike '%' || search_query || '%'
    or listing.title ilike '%' || search_query || '%'
    or listing.description ilike '%' || search_query || '%'
  )
  and (
    store_category_filter is null
    or exists (
      select 1
      from public.listing_store_categories listing_category
      join selected_category_scope scope
        on scope.category_id =
          listing_category.store_category_id
      where listing_category.listing_id = listing.id
    )
  )
  order by listing.created_at desc
  limit result_limit
  offset result_offset;
$function$;

comment on function public.get_my_identity_listings(
  integer,
  integer,
  text,
  text,
  uuid
) is
  'Returns active-identity owner listings. Store category filtering includes the selected category and all descendants.';

commit;
