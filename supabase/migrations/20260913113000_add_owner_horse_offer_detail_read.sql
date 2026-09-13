begin;

/*
 * Authenticated owner detail read for one canonical horse offer.
 *
 * Boundaries:
 * - resolves and authorizes the active identity in the database;
 * - returns only an offer belonging to that active identity;
 * - exposes complete owner-editable horse fields and versioned details JSON;
 * - exposes ordered image metadata needed by a future owner detail/edit view;
 * - does not expose Storage paths, uploader IDs or the internal publication event ID;
 * - performs no mutation and does not accept a client-supplied identity ID.
 */

do $block$
begin
  if to_regclass(
    'public.horse_offers'
  ) is null then
    raise exception
      'horse_offers foundation is required first.';
  end if;

  if to_regclass(
    'public.horse_offer_images'
  ) is null then
    raise exception
      'horse_offer_images foundation is required first.';
  end if;

  if to_regprocedure(
    'public.require_my_active_identity_v2()'
  ) is null then
    raise exception
      'require_my_active_identity_v2 foundation is required first.';
  end if;
end;
$block$;

create or replace function
  public.get_my_horse_offer_v1(
    p_offer_id uuid
  )
returns table (
  content_type text,
  content_id text,
  offer_id uuid,
  identity_id uuid,
  offer_type text,
  status text,
  market_country_code text,
  horse_location_country_code text,
  title text,
  description text,
  price_amount numeric,
  price_type text,
  currency text,
  image_url text,
  horse_name text,
  birth_year integer,
  sex text,
  breed text,
  color text,
  height_cm numeric,
  discipline text,
  training_level text,
  suitability text,
  health_notes text,
  behavior_notes text,
  city text,
  region text,
  location_text text,
  horse_lat double precision,
  horse_lng double precision,
  details jsonb,
  published_at timestamptz,
  held_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  active_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  images jsonb
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $function$
  with request_context as materialized (
    select
      public.require_my_active_identity_v2()
        as active_identity_id
  )
  select
    'horse_offer'::text,
    offer.id::text,
    offer.id,
    offer.identity_id,
    offer.offer_type,
    offer.status,
    offer.market_country_code,
    offer.horse_location_country_code,
    offer.title,
    offer.description,
    offer.price_amount,
    offer.price_type,
    offer.currency,
    offer.image_url,
    offer.horse_name,
    offer.birth_year,
    offer.sex,
    offer.breed,
    offer.color,
    offer.height_cm,
    offer.discipline,
    offer.training_level,
    offer.suitability,
    offer.health_notes,
    offer.behavior_notes,
    offer.city,
    offer.region,
    offer.location_text,
    offer.horse_lat,
    offer.horse_lng,
    offer.details,
    offer.published_at,
    offer.held_at,
    offer.paused_at,
    offer.closed_at,
    offer.rejected_at,
    offer.archived_at,
    offer.active_until,
    offer.created_at,
    offer.updated_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            image.id,
            'url',
            coalesce(
              image.medium_url,
              image.original_url,
              image.thumb_url
            ),
            'original_url',
            image.original_url,
            'medium_url',
            image.medium_url,
            'thumb_url',
            image.thumb_url,
            'is_primary',
            image.is_primary,
            'sort_order',
            image.sort_order
          )
          order by
            image.is_primary desc,
            image.sort_order,
            image.created_at,
            image.id
        )
        from public.horse_offer_images image
        where image.horse_offer_id =
          offer.id
          and image.identity_id =
            offer.identity_id
      ),
      '[]'::jsonb
    )
  from request_context context
  join public.horse_offers offer
    on offer.identity_id =
      context.active_identity_id
  where offer.id =
    p_offer_id
  limit 1;
$function$;

comment on function
  public.get_my_horse_offer_v1(uuid)
is
  'Returns one horse offer owned by the authenticated user active identity, including complete owner-editable fields and ordered safe image metadata. The shared owner identity remains content_type plus content_id. Storage paths, uploader IDs and current_publication_event_id are intentionally not exposed.';

revoke all
on function
  public.get_my_horse_offer_v1(uuid)
from public, anon;

grant execute
on function
  public.get_my_horse_offer_v1(uuid)
to authenticated, service_role;

commit;
