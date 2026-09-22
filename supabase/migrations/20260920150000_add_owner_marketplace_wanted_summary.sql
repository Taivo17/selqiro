begin;

-- Additive owner read only. Never replace the applied v1 projection/RPC.
-- No horse/listing data, status, write permission or publication change.
create function public.project_horse_wanted_owner_summary_v1(p_details jsonb)
returns jsonb
language plpgsql immutable
set search_path = pg_catalog, pg_temp
as $function$
declare
  v_wanted jsonb;
  v_budget jsonb;
  v_area jsonb;
  v_budget_result jsonb := null;
  v_area_result jsonb := null;
  v_amount numeric;
  v_city text;
  v_region text;
begin
  -- Unsupported sections are explicit null, NOT an invented flexible budget.
  -- Never return the original details object or arbitrary nested keys.
  if jsonb_typeof(p_details) = 'object'
    and p_details -> 'schema_version' = '1'::jsonb
    and p_details ->> 'branch' = 'wanted'
    and jsonb_typeof(p_details -> 'wanted') = 'object' then
    v_wanted := p_details -> 'wanted';
    v_budget := v_wanted -> 'budget';
    v_area := v_wanted -> 'search_area';

    if jsonb_typeof(v_budget) = 'object'
      and v_budget ->> 'currency' = 'EUR' then
      if v_budget ->> 'mode' = 'maximum'
        and jsonb_typeof(v_budget -> 'amount') = 'number' then
        -- Cast only after checking JSON numeric type. Malformed legacy text
        -- cannot abort the whole owner list or be interpreted as money.
        v_amount := (v_budget ->> 'amount')::numeric;
        if v_amount >= 0 and v_amount <= 9999999999.99
          and v_amount = round(v_amount, 2) then
          v_budget_result := jsonb_build_object(
            'mode', 'maximum', 'amount', v_amount, 'currency', 'EUR');
        end if;
      elsif v_budget ->> 'mode' = 'contact'
        and (not (v_budget ? 'amount') or v_budget -> 'amount' = 'null'::jsonb) then
        v_budget_result := jsonb_build_object(
          'mode', 'contact', 'amount', null, 'currency', 'EUR');
      end if;
    end if;

    if jsonb_typeof(v_area) = 'object'
      and v_area ->> 'country_code' = 'EE'
      and coalesce(jsonb_typeof(v_area -> 'city_or_municipality'), 'null') in ('string', 'null')
      and coalesce(jsonb_typeof(v_area -> 'region'), 'null') in ('string', 'null') then
      v_city := nullif(btrim(v_area ->> 'city_or_municipality'), '');
      v_region := nullif(btrim(v_area ->> 'region'), '');
      if coalesce(char_length(v_city), 0) <= 160
        and coalesce(char_length(v_region), 0) <= 160 then
        v_area_result := jsonb_build_object(
          'country_code', 'EE', 'city_or_municipality', v_city, 'region', v_region);
      end if;
    end if;
  end if;
  return jsonb_build_object(
    'version', 1, 'budget', v_budget_result, 'search_area', v_area_result);
end;
$function$;

-- v1 remains the one authority for owner access, filtering and page selection.
-- JSON projection runs only on that bounded page. One request / one SQL snapshot.
create function public.get_my_marketplace_items_v2(
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
  search_text text,
  wanted_summary jsonb
)
language sql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $function$
  with owner_page as materialized (
    select *
    from public.get_my_marketplace_items_v1(
      p_result_limit, p_result_offset, p_status_filter,
      p_search_query, p_store_category_filter
    ) with ordinality
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
    item.search_text,
    case when item.content_type = 'horse_offer' and item.content_variant = 'wanted'
      then public.project_horse_wanted_owner_summary_v1(offer.details)
      else null::jsonb
    end as wanted_summary
  from owner_page item
  left join public.horse_offers offer
    on offer.id = case
      when item.content_type = 'horse_offer' and item.content_variant = 'wanted'
        then item.content_id::uuid
      else null::uuid
    end
    and offer.identity_id = item.identity_id
    and offer.offer_type = 'wanted'
  order by item.ordinality;
$function$;

comment on function public.project_horse_wanted_owner_summary_v1(jsonb) is
  'Private pure whitelist projection for the EE horse wanted owner-list summary. Only budget and coarse search area; invalid sections are null. No raw details or seller-field fallbacks.';
comment on function public.get_my_marketplace_items_v2(integer,integer,text,text,uuid) is
  'Additive bounded owner read: unchanged v1 columns, authorization, filters, page order plus minimized wanted_summary. No public exposure, writes, N+1 client reads or new search predicates.';

revoke all on function public.project_horse_wanted_owner_summary_v1(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.get_my_marketplace_items_v2(integer,integer,text,text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_my_marketplace_items_v2(integer,integer,text,text,uuid)
  to authenticated, service_role;

commit;
