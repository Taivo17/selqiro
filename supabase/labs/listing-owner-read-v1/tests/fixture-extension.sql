-- Synthetic extension ONLY in a new disposable helper. Not a full Supabase schema.
-- Horse declaration and helpers copied verbatim from tracked migrations below.
-- auth.users is an ID-only stub for foreign keys; no real accounts/data copied.
BEGIN;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
create table public.horse_offers (
  id uuid primary key
    default gen_random_uuid(),

  identity_id uuid not null
    references public.identities(id)
    on delete cascade,

  created_by_user_id uuid
    references auth.users(id)
    on delete set null,

  updated_by_user_id uuid
    references auth.users(id)
    on delete set null,

  offer_type text not null,

  status text not null
    default 'draft',

  market_country_code text not null
    default 'EE',

  horse_location_country_code text not null
    default 'EE',

  title text not null
    default '',

  description text not null
    default '',

  price_amount numeric(12, 2),

  price_type text not null
    default 'contact',

  currency text not null
    default 'EUR',

  image_url text,

  horse_name text,
  birth_year integer,
  sex text,
  breed text,
  color text,
  height_cm numeric(6, 1),
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

  details jsonb not null
    default '{}'::jsonb,

  current_publication_event_id uuid,

  published_at timestamptz,
  held_at timestamptz,
  paused_at timestamptz,
  closed_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  active_until timestamptz,

  search_vector tsvector not null
    default ''::tsvector,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint horse_offers_offer_type_check
    check (
      offer_type = any (
        array[
          'sale',
          'free_transfer',
          'lease',
          'co_rider',
          'wanted'
        ]::text[]
      )
    ),

  constraint horse_offers_status_check
    check (
      status = any (
        array[
          'draft',
          'published',
          'held_for_review',
          'paused',
          'closed',
          'rejected',
          'archived'
        ]::text[]
      )
    ),

  constraint horse_offers_ee_market_check
    check (
      market_country_code = 'EE'
      and horse_location_country_code = 'EE'
    ),

  constraint horse_offers_title_length_check
    check (
      char_length(title) <= 140
    ),

  constraint horse_offers_description_length_check
    check (
      char_length(description) <= 5000
    ),

  constraint horse_offers_price_amount_check
    check (
      price_amount is null
      or price_amount between 0 and 9999999999.99
    ),

  constraint horse_offers_price_type_check
    check (
      price_type = any (
        array[
          'fixed',
          'from',
          'contact',
          'free'
        ]::text[]
      )
    ),

  constraint horse_offers_price_contract_check
    check (
      (
        offer_type = 'free_transfer'
        and price_type = 'free'
        and price_amount is null
      )
      or
      (
        offer_type <> 'free_transfer'
        and price_type = 'contact'
        and price_amount is null
      )
      or
      (
        offer_type <> 'free_transfer'
        and price_type = any (
          array[
            'fixed',
            'from'
          ]::text[]
        )
        and price_amount is not null
      )
    ),

  constraint horse_offers_currency_check
    check (
      currency = 'EUR'
    ),

  constraint horse_offers_image_url_check
    check (
      image_url is null
      or char_length(
        btrim(image_url)
      ) between 1 and 2000
    ),

  constraint horse_offers_horse_name_check
    check (
      horse_name is null
      or char_length(horse_name) <= 160
    ),

  constraint horse_offers_birth_year_check
    check (
      birth_year is null
      or birth_year between 1900 and 2100
    ),

  constraint horse_offers_sex_check
    check (
      sex is null
      or sex = any (
        array[
          'mare',
          'gelding',
          'stallion',
          'unknown'
        ]::text[]
      )
    ),

  constraint horse_offers_breed_check
    check (
      breed is null
      or char_length(breed) <= 160
    ),

  constraint horse_offers_color_check
    check (
      color is null
      or char_length(color) <= 120
    ),

  constraint horse_offers_height_check
    check (
      height_cm is null
      or height_cm between 1 and 300
    ),

  constraint horse_offers_discipline_check
    check (
      discipline is null
      or char_length(discipline) <= 240
    ),

  constraint horse_offers_training_level_check
    check (
      training_level is null
      or char_length(training_level) <= 500
    ),

  constraint horse_offers_suitability_check
    check (
      suitability is null
      or char_length(suitability) <= 2000
    ),

  constraint horse_offers_health_notes_check
    check (
      health_notes is null
      or char_length(health_notes) <= 3000
    ),

  constraint horse_offers_behavior_notes_check
    check (
      behavior_notes is null
      or char_length(behavior_notes) <= 3000
    ),

  constraint horse_offers_city_check
    check (
      city is null
      or char_length(city) <= 160
    ),

  constraint horse_offers_region_check
    check (
      region is null
      or char_length(region) <= 160
    ),

  constraint horse_offers_location_text_check
    check (
      location_text is null
      or char_length(location_text) <= 300
    ),

  constraint horse_offers_coordinate_pair_check
    check (
      (
        horse_lat is null
        and horse_lng is null
      )
      or
      (
        horse_lat is not null
        and horse_lng is not null
      )
    ),

  constraint horse_offers_latitude_check
    check (
      horse_lat is null
      or horse_lat between -90 and 90
    ),

  constraint horse_offers_longitude_check
    check (
      horse_lng is null
      or horse_lng between -180 and 180
    ),

  constraint horse_offers_details_check
    check (
      jsonb_typeof(details) = 'object'
    ),

  constraint horse_offers_published_state_check
    check (
      status <> 'published'
      or (
        current_publication_event_id is not null
        and published_at is not null
      )
    ),

  constraint horse_offers_held_state_check
    check (
      status <> 'held_for_review'
      or (
        current_publication_event_id is not null
        and held_at is not null
      )
    ),

  constraint horse_offers_paused_state_check
    check (
      status <> 'paused'
      or published_at is not null
    ),

  constraint horse_offers_closed_state_check
    check (
      status <> 'closed'
      or closed_at is not null
    ),

  constraint horse_offers_rejected_state_check
    check (
      status <> 'rejected'
      or rejected_at is not null
    ),

  constraint horse_offers_archived_state_check
    check (
      status <> 'archived'
      or archived_at is not null
    ),

  constraint horse_offers_active_until_check
    check (
      active_until is null
      or (
        published_at is not null
        and active_until > published_at
      )
    )
);
CREATE OR REPLACE FUNCTION "public"."require_my_active_identity_v2"() RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth', 'pg_temp'
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_active_identity_id uuid;
begin
  if v_user_id is null then
    raise exception
      'Authentication is required.'
      using errcode = '42501';
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

  return v_active_identity_id;
end;
$$;
CREATE OR REPLACE FUNCTION "public"."get_store_category_scope_ids"("p_identity_id" "uuid", "p_category_id" "uuid") RETURNS TABLE("category_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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
$$;
ALTER TABLE public.horse_offers ADD COLUMN edit_revision bigint NOT NULL DEFAULT 1 CHECK(edit_revision>=1);
ALTER TABLE public.horse_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.horse_offers,auth.users FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.require_my_active_identity_v2(), public.get_store_category_scope_ids(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.require_my_active_identity_v2(),public.get_store_category_scope_ids(uuid,uuid) TO authenticated,service_role;
COMMIT;
