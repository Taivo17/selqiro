begin;

create view public.marketplace_item_projection_v1
with (
  security_barrier = true,
  security_invoker = true
)
as
select
  'listing'::text as content_type,
  listing.id::text as content_id,
  listing.identity_id,
  listing.user_id as owner_user_id,
  listing.status as source_status,
  case listing.status
    when 'active' then 'active'
    when 'paused' then 'paused'
    when 'sold' then 'closed'
    else listing.status
  end::text as lifecycle_status,
  null::text as content_variant,
  listing.title,
  listing.description,
  listing.price as price_text,
  case
    when btrim(coalesce(listing.price, '')) ~
      '^[0-9]+([.,][0-9]{1,2})?$'
    then replace(
      btrim(listing.price),
      ',',
      '.'
    )::numeric
    else null::numeric
  end as price_amount,
  case
    when nullif(
      btrim(coalesce(listing.price, '')),
      ''
    ) is null
    then 'contact'
    else 'legacy_text'
  end::text as price_type,
  null::text as currency,
  listing.image as image_url,
  listing.category,
  listing.subcategory,
  listing.condition,
  listing.city,
  null::text as region,
  coalesce(
    nullif(
      btrim(coalesce(listing.location, '')),
      ''
    ),
    nullif(
      btrim(coalesce(listing.city, '')),
      ''
    )
  ) as location_label,
  listing.active_until,
  null::timestamptz as published_at,
  listing.created_at,
  listing.created_at as sort_at,
  nullif(
    btrim(coalesce(listing.search_text, '')),
    ''
  ) as search_text
from public.listings listing

union all

select
  'horse_offer'::text as content_type,
  offer.id::text as content_id,
  offer.identity_id,
  offer.created_by_user_id as owner_user_id,
  offer.status as source_status,
  case offer.status
    when 'published' then 'active'
    else offer.status
  end::text as lifecycle_status,
  offer.offer_type as content_variant,
  offer.title,
  offer.description,
  null::text as price_text,
  offer.price_amount,
  offer.price_type,
  offer.currency,
  offer.image_url,
  null::text as category,
  null::text as subcategory,
  null::text as condition,
  offer.city,
  offer.region,
  nullif(
    btrim(
      concat_ws(
        ' · ',
        nullif(
          btrim(coalesce(offer.city, '')),
          ''
        ),
        nullif(
          btrim(coalesce(offer.region, '')),
          ''
        )
      )
    ),
    ''
  ) as location_label,
  offer.active_until,
  offer.published_at,
  offer.created_at,
  coalesce(
    offer.published_at,
    offer.updated_at,
    offer.created_at
  ) as sort_at,
  nullif(
    btrim(
      concat_ws(
        ' ',
        offer.title,
        offer.description,
        offer.horse_name,
        offer.breed,
        offer.color,
        offer.discipline,
        offer.training_level,
        offer.suitability,
        offer.health_notes,
        offer.behavior_notes,
        offer.city,
        offer.region
      )
    ),
    ''
  ) as search_text
from public.horse_offers offer;

comment on view
  public.marketplace_item_projection_v1
is
  'Internal read-only UNION ALL projection over canonical listings and horse_offers. content_type plus content_id is the shared key. It is not a writable or canonical marketplace table.';

comment on column
  public.marketplace_item_projection_v1.content_type
is
  'Canonical source discriminator. Current values are listing and horse_offer.';

comment on column
  public.marketplace_item_projection_v1.content_id
is
  'Canonical source ID serialized as text so bigint listing IDs and UUID horse-offer IDs can share one read contract.';

comment on column
  public.marketplace_item_projection_v1.source_status
is
  'Unmodified status from the canonical source row.';

comment on column
  public.marketplace_item_projection_v1.lifecycle_status
is
  'Shared management status. listing sold maps to closed and horse_offer published maps to active; source_status remains authoritative for domain actions.';

comment on column
  public.marketplace_item_projection_v1.search_text
is
  'Read-model text only. High-volume public search may use source-specific indexed predicates and return the same projection shape instead of scanning this view.';

comment on column
  public.marketplace_item_projection_v1.location_label
is
  'Privacy-safe display location. Horse exact location_text and coordinates are intentionally excluded.';

revoke all
on table public.marketplace_item_projection_v1
from public, anon, authenticated;

grant select
on table public.marketplace_item_projection_v1
to service_role;

commit;
