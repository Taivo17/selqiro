begin;

create or replace function
  public.get_my_marketplace_items_v1(
    p_result_limit integer default 30,
    p_result_offset integer default 0,
    p_status_filter text default 'all',
    p_search_query text default '',
    p_store_category_filter uuid default null
  )
returns table (
  content_type text,
  content_id text,
  identity_id uuid,
  owner_user_id uuid,
  source_status text,
  lifecycle_status text,
  content_variant text,
  title text,
  description text,
  price_text text,
  price_amount numeric,
  price_type text,
  currency text,
  image_url text,
  category text,
  subcategory text,
  condition text,
  city text,
  region text,
  location_label text,
  active_until timestamptz,
  published_at timestamptz,
  created_at timestamptz,
  sort_at timestamptz,
  search_text text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  with request_context as materialized (
    select
      public.require_my_active_identity_v2()
        as active_identity_id,
      least(
        greatest(
          coalesce(p_result_limit, 30),
          1
        ),
        500
      ) as bounded_limit,
      least(
        greatest(
          coalesce(p_result_offset, 0),
          0
        ),
        1000000
      ) as bounded_offset,
      coalesce(
        nullif(
          lower(
            btrim(
              coalesce(p_status_filter, '')
            )
          ),
          ''
        ),
        'all'
      ) as normalized_status,
      btrim(
        coalesce(p_search_query, '')
      ) as normalized_search
  ),
  selected_category_scope as materialized (
    select scope.category_id
    from request_context context
    cross join lateral
      public.get_store_category_scope_ids(
        context.active_identity_id,
        p_store_category_filter
      ) scope
    where p_store_category_filter is not null
  )
  select
    item.content_type,
    item.content_id,
    item.identity_id,
    item.owner_user_id,
    item.source_status,
    item.lifecycle_status,
    item.content_variant,
    item.title,
    item.description,
    item.price_text,
    item.price_amount,
    item.price_type,
    item.currency,
    item.image_url,
    item.category,
    item.subcategory,
    item.condition,
    item.city,
    item.region,
    item.location_label,
    item.active_until,
    item.published_at,
    item.created_at,
    item.sort_at,
    item.search_text
  from request_context context
  join public.marketplace_item_projection_v1 item
    on item.identity_id =
      context.active_identity_id
  where (
    context.normalized_status = 'all'
    or item.source_status =
      context.normalized_status
    or item.lifecycle_status =
      context.normalized_status
    or (
      context.normalized_status = 'sold'
      and item.lifecycle_status = 'closed'
    )
  )
  and (
    context.normalized_search = ''
    or concat_ws(
      ' ',
      item.title,
      item.description,
      item.search_text,
      item.content_variant,
      item.category,
      item.subcategory,
      item.condition,
      item.city,
      item.region,
      item.location_label
    ) ilike
      '%' || context.normalized_search || '%'
  )
  and (
    p_store_category_filter is null
    or (
      item.content_type = 'listing'
      and exists (
        select 1
        from public.listing_store_categories
          relation
        join selected_category_scope scope
          on scope.category_id =
            relation.store_category_id
        where relation.listing_id::text =
          item.content_id
      )
    )
  )
  order by
    item.sort_at desc nulls last,
    item.created_at desc,
    item.content_type,
    item.content_id desc
  limit (
    select context.bounded_limit
    from request_context context
  )
  offset (
    select context.bounded_offset
    from request_context context
  );
$function$;

comment on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
is
  'Returns a bounded active-identity owner read model over canonical listings and horse offers. The shared key is content_type plus content_id. Legacy get_my_identity_listings remains unchanged. Store-category filtering currently matches generic listing relations only; horse offers remain unassigned until a polymorphic marketplace-item category relation is added.';

revoke all
on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
from public, anon;

grant execute
on function
  public.get_my_marketplace_items_v1(
    integer,
    integer,
    text,
    text,
    uuid
  )
to authenticated, service_role;

commit;
