begin;

set local search_path = public, auth, pg_temp;

do $contract$
declare
  v_actual text[];
  v_expected constant text[] := array[
    'content_type:text',
    'content_id:text',
    'identity_id:uuid',
    'owner_user_id:uuid',
    'source_status:text',
    'lifecycle_status:text',
    'content_variant:text',
    'title:text',
    'description:text',
    'price_text:text',
    'price_amount:numeric',
    'price_type:text',
    'currency:text',
    'image_url:text',
    'category:text',
    'subcategory:text',
    'condition:text',
    'city:text',
    'region:text',
    'location_label:text',
    'active_until:timestamp with time zone',
    'published_at:timestamp with time zone',
    'created_at:timestamp with time zone',
    'sort_at:timestamp with time zone',
    'search_text:text'
  ]::text[];
begin
  if to_regclass(
    'public.marketplace_item_projection_v1'
  ) is null then
    raise exception
      'marketplace_item_projection_v1_missing';
  end if;

  select array_agg(
    column_name || ':' || data_type
    order by ordinal_position
  )
  into v_actual
  from information_schema.columns
  where table_schema = 'public'
    and table_name =
      'marketplace_item_projection_v1';

  if v_actual is distinct from v_expected then
    raise exception
      'marketplace_item_projection_columns_invalid: actual=%, expected=%',
      v_actual,
      v_expected;
  end if;
end;
$contract$;

do $definition$
declare
  v_definition text := lower(
    pg_get_viewdef(
      'public.marketplace_item_projection_v1'::regclass,
      true
    )
  );
  v_forbidden text;
begin
  if position('union all' in v_definition) = 0 then
    raise exception
      'marketplace_item_projection_union_all_missing';
  end if;

  if position('listings' in v_definition) = 0
    or position('horse_offers' in v_definition) = 0
  then
    raise exception
      'marketplace_item_projection_source_missing';
  end if;

  if position($needle$'listing'::text$needle$ in v_definition) = 0
    or position($needle$'horse_offer'::text$needle$ in v_definition) = 0
  then
    raise exception
      'marketplace_item_projection_discriminator_missing';
  end if;

  if position($needle$when 'sold'::text then 'closed'::text$needle$ in v_definition) = 0
    and position($needle$when 'sold' then 'closed'$needle$ in v_definition) = 0
  then
    raise exception
      'marketplace_item_projection_listing_status_mapping_missing';
  end if;

  if position($needle$when 'published'::text then 'active'::text$needle$ in v_definition) = 0
    and position($needle$when 'published' then 'active'$needle$ in v_definition) = 0
  then
    raise exception
      'marketplace_item_projection_horse_status_mapping_missing';
  end if;

  foreach v_forbidden in array array[
    'horse_lat',
    'horse_lng',
    'location_text',
    'confirmation_snapshot',
    'seller_confirms_',
    'seller_is_owner_or_authorized',
    'review_decision_note'
  ]::text[]
  loop
    if position(v_forbidden in v_definition) > 0 then
      raise exception
        'marketplace_item_projection_private_marker_present:%',
        v_forbidden;
    end if;
  end loop;
end;
$definition$;

do $rows$
declare
  v_projection_count bigint;
  v_source_count bigint;
  v_duplicate_count bigint;
  v_missing_listing_count bigint;
  v_missing_horse_count bigint;
  v_bad_listing_status_count bigint;
  v_bad_horse_status_count bigint;
begin
  select count(*)
  into v_projection_count
  from public.marketplace_item_projection_v1;

  select
    (select count(*) from public.listings)
    +
    (select count(*) from public.horse_offers)
  into v_source_count;

  if v_projection_count <> v_source_count then
    raise exception
      'marketplace_item_projection_row_count_invalid: projection=%, source=%',
      v_projection_count,
      v_source_count;
  end if;

  select count(*)
  into v_duplicate_count
  from (
    select
      projection.content_type,
      projection.content_id,
      count(*)
    from public.marketplace_item_projection_v1 projection
    group by
      projection.content_type,
      projection.content_id
    having count(*) <> 1
  ) duplicates;

  if v_duplicate_count <> 0 then
    raise exception
      'marketplace_item_projection_duplicate_shared_keys:%',
      v_duplicate_count;
  end if;

  select count(*)
  into v_missing_listing_count
  from public.listings listing
  left join public.marketplace_item_projection_v1 projection
    on projection.content_type = 'listing'
    and projection.content_id = listing.id::text
  where projection.content_id is null;

  if v_missing_listing_count <> 0 then
    raise exception
      'marketplace_item_projection_missing_listings:%',
      v_missing_listing_count;
  end if;

  select count(*)
  into v_missing_horse_count
  from public.horse_offers offer
  left join public.marketplace_item_projection_v1 projection
    on projection.content_type = 'horse_offer'
    and projection.content_id = offer.id::text
  where projection.content_id is null;

  if v_missing_horse_count <> 0 then
    raise exception
      'marketplace_item_projection_missing_horse_offers:%',
      v_missing_horse_count;
  end if;

  select count(*)
  into v_bad_listing_status_count
  from public.listings listing
  join public.marketplace_item_projection_v1 projection
    on projection.content_type = 'listing'
    and projection.content_id = listing.id::text
  where projection.source_status is distinct from listing.status
    or projection.lifecycle_status is distinct from
      case listing.status
        when 'active' then 'active'
        when 'paused' then 'paused'
        when 'sold' then 'closed'
        else listing.status
      end;

  if v_bad_listing_status_count <> 0 then
    raise exception
      'marketplace_item_projection_listing_status_invalid:%',
      v_bad_listing_status_count;
  end if;

  select count(*)
  into v_bad_horse_status_count
  from public.horse_offers offer
  join public.marketplace_item_projection_v1 projection
    on projection.content_type = 'horse_offer'
    and projection.content_id = offer.id::text
  where projection.source_status is distinct from offer.status
    or projection.lifecycle_status is distinct from
      case offer.status
        when 'published' then 'active'
        else offer.status
      end;

  if v_bad_horse_status_count <> 0 then
    raise exception
      'marketplace_item_projection_horse_status_invalid:%',
      v_bad_horse_status_count;
  end if;
end;
$rows$;

do $privacy$
begin
  if has_table_privilege(
    'anon',
    'public.marketplace_item_projection_v1',
    'SELECT'
  ) then
    raise exception
      'marketplace_item_projection_anon_select_not_revoked';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.marketplace_item_projection_v1',
    'SELECT'
  ) then
    raise exception
      'marketplace_item_projection_authenticated_select_not_revoked';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.marketplace_item_projection_v1',
    'SELECT'
  ) then
    raise exception
      'marketplace_item_projection_service_select_missing';
  end if;
end;
$privacy$;

do $canonical$
declare
  v_definition text := lower(
    pg_get_viewdef(
      'public.marketplace_item_projection_v1'::regclass,
      true
    )
  );
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name =
        'marketplace_item_projection_v1'
      and table_type = 'BASE TABLE'
  ) then
    raise exception
      'marketplace_item_projection_must_not_be_base_table';
  end if;

  if position('insert into listings' in v_definition) > 0
    or position('insert into horse_offers' in v_definition) > 0
  then
    raise exception
      'marketplace_item_projection_write_logic_present';
  end if;
end;
$canonical$;

rollback;
