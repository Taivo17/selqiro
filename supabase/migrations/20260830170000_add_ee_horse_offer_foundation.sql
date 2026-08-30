begin;

/*
 * Estonia-only horse-offer database foundation.
 *
 * This is a separate data/security domain, but it does not require a separate
 * user-facing creation route. V2 may compose these fields into the existing
 * /v2/sell flow when the selected category represents a live horse offer.
 *
 * This migration intentionally creates no authenticated owner/public RPCs and
 * no Storage bucket yet. Those are added in later, independently testable
 * migrations after this data contract is proven locally.
 */

do $block$
begin
  if to_regclass(
    'public.publication_policy_documents'
  ) is null then
    raise exception
      'publication_policy_documents foundation is required first.';
  end if;

  if to_regclass(
    'public.user_publication_policy_acceptances'
  ) is null then
    raise exception
      'user_publication_policy_acceptances foundation is required first.';
  end if;

  if not exists (
    select 1
    from public.publication_policy_documents policy
    where policy.policy_key =
      'marketplace-general'
      and policy.policy_version =
        'marketplace-general-v1'
      and policy.country_code is null
      and policy.locale =
        'et-EE'
      and policy.status =
        'active'
      and policy.effective_from <=
        now()
      and (
        policy.effective_until is null
        or policy.effective_until >
          now()
      )
      and policy.metadata @>
        '{
          "immediate_low_risk_publication": true,
          "risk_based_prepublication_review": true,
          "post_publication_review": true,
          "notice_and_action": true,
          "ai_moderation_mode": "off"
        }'::jsonb
      and 'horse_offer' = any (
        policy.applies_to_content_types
      )
  ) then
    raise exception
      'Active marketplace-general-v1 horse_offer policy is required.';
  end if;

  if not exists (
    select 1
    from public.publication_policy_documents policy
    where policy.policy_key =
      'horse-offer-ee'
      and policy.policy_version =
        'ee-horse-v1'
      and policy.country_code =
        'EE'
      and policy.locale =
        'et-EE'
      and policy.status =
        'active'
      and policy.effective_from <=
        now()
      and (
        policy.effective_until is null
        or policy.effective_until >
          now()
      )
      and policy.metadata @>
        '{
          "market_country_code": "EE",
          "horse_location_country_code": "EE",
          "immediate_low_risk_publication": true,
          "universal_admin_prepublication_review": false,
          "risk_based_prepublication_review": true,
          "post_publication_review": true,
          "notice_and_action": true,
          "default_passport_upload": false,
          "default_id_document_check": false,
          "cross_border_flow": false,
          "ai_moderation_mode": "off"
        }'::jsonb
      and policy.metadata ->
        'supported_offer_types' =
          '[
            "sale",
            "free_transfer",
            "lease",
            "co_rider",
            "wanted"
          ]'::jsonb
      and 'horse_offer' = any (
        policy.applies_to_content_types
      )
  ) then
    raise exception
      'Active ee-horse-v1 publication policy is required.';
  end if;
end;
$block$;

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

comment on table
  public.horse_offers
is
  'Identity-owned EE horse offers. The backend contract is separate for policy and audit safety, while the V2 user experience may remain inside the shared listing creation form.';

comment on column
  public.horse_offers.location_text
is
  'Owner-side location detail. Future public read contracts must expose only privacy-safe city or region data by default.';

comment on column
  public.horse_offers.current_publication_event_id
is
  'The immutable publication event that currently justifies a published or held status.';

create index
  horse_offers_identity_status_updated_idx
on public.horse_offers (
  identity_id,
  status,
  updated_at desc,
  id desc
);

create index
  horse_offers_public_market_type_idx
on public.horse_offers (
  market_country_code,
  offer_type,
  published_at desc,
  id desc
)
where status = 'published';

create index
  horse_offers_public_city_idx
on public.horse_offers (
  market_country_code,
  lower(city),
  published_at desc,
  id desc
)
where status = 'published';

create index
  horse_offers_active_until_idx
on public.horse_offers (
  active_until
)
where status = 'published';

create index
  horse_offers_search_vector_idx
on public.horse_offers
using gin (
  search_vector
);

create table public.horse_offer_images (
  id uuid primary key
    default gen_random_uuid(),

  horse_offer_id uuid not null
    references public.horse_offers(id)
    on delete cascade,

  identity_id uuid not null
    references public.identities(id)
    on delete cascade,

  uploaded_by_user_id uuid
    references auth.users(id)
    on delete set null,

  original_url text not null,
  medium_url text,
  thumb_url text,
  storage_path text not null,

  sort_order integer not null
    default 0,

  is_primary boolean not null
    default false,

  created_at timestamptz not null
    default now(),

  constraint horse_offer_images_original_url_check
    check (
      char_length(
        btrim(original_url)
      ) between 1 and 2000
    ),

  constraint horse_offer_images_medium_url_check
    check (
      medium_url is null
      or char_length(
        btrim(medium_url)
      ) between 1 and 2000
    ),

  constraint horse_offer_images_thumb_url_check
    check (
      thumb_url is null
      or char_length(
        btrim(thumb_url)
      ) between 1 and 2000
    ),

  constraint horse_offer_images_storage_path_check
    check (
      char_length(
        btrim(storage_path)
      ) between 1 and 1000
    ),

  constraint horse_offer_images_sort_order_check
    check (
      sort_order >= 0
    ),

  constraint horse_offer_images_offer_path_key
    unique (
      horse_offer_id,
      storage_path
    )
);

comment on table
  public.horse_offer_images
is
  'Ordered Storage-backed images belonging to one horse offer. Storage upload and mutation RPCs are added in a later isolated migration.';

create index
  horse_offer_images_offer_order_idx
on public.horse_offer_images (
  horse_offer_id,
  is_primary desc,
  sort_order,
  created_at,
  id
);

create index
  horse_offer_images_identity_idx
on public.horse_offer_images (
  identity_id,
  created_at desc
);

create unique index
  horse_offer_images_one_primary_idx
on public.horse_offer_images (
  horse_offer_id
)
where is_primary;

create or replace function
  public.build_horse_offer_content_snapshot_v1(
    p_offer_id uuid
  )
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'schema_version',
    1,
    'offer_id',
    offer.id,
    'identity_id',
    offer.identity_id,
    'offer_type',
    offer.offer_type,
    'market_country_code',
    offer.market_country_code,
    'horse_location_country_code',
    offer.horse_location_country_code,
    'title',
    offer.title,
    'description',
    offer.description,
    'price_amount',
    offer.price_amount,
    'price_type',
    offer.price_type,
    'currency',
    offer.currency,
    'image_url',
    offer.image_url,
    'horse_name',
    offer.horse_name,
    'birth_year',
    offer.birth_year,
    'sex',
    offer.sex,
    'breed',
    offer.breed,
    'color',
    offer.color,
    'height_cm',
    offer.height_cm,
    'discipline',
    offer.discipline,
    'training_level',
    offer.training_level,
    'suitability',
    offer.suitability,
    'health_notes',
    offer.health_notes,
    'behavior_notes',
    offer.behavior_notes,
    'city',
    offer.city,
    'region',
    offer.region,
    'location_text',
    offer.location_text,
    'horse_lat',
    offer.horse_lat,
    'horse_lng',
    offer.horse_lng,
    'details',
    offer.details,
    'images',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            image.id,
            'original_url',
            image.original_url,
            'medium_url',
            image.medium_url,
            'thumb_url',
            image.thumb_url,
            'storage_path',
            image.storage_path,
            'sort_order',
            image.sort_order,
            'is_primary',
            image.is_primary
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
      ),
      '[]'::jsonb
    )
  )
  from public.horse_offers offer
  where offer.id =
    p_offer_id;
$function$;

comment on function
  public.build_horse_offer_content_snapshot_v1(uuid)
is
  'Builds the canonical internal content and ordered-image snapshot used for every horse-offer publication event.';

create table public.horse_offer_publication_events (
  id uuid primary key
    default gen_random_uuid(),

  horse_offer_id uuid not null
    references public.horse_offers(id)
    on delete cascade,

  identity_id uuid not null
    references public.identities(id)
    on delete cascade,

  actor_user_id uuid
    references auth.users(id)
    on delete set null,

  submission_key uuid not null,

  decision text not null,

  general_policy_document_id uuid not null
    references public.publication_policy_documents(id)
    on delete restrict,

  general_policy_version text not null,
  general_policy_content_hash text not null,

  general_acceptance_id uuid
    references public.user_publication_policy_acceptances(id)
    on delete set null,

  horse_policy_document_id uuid not null
    references public.publication_policy_documents(id)
    on delete restrict,

  horse_policy_version text not null,
  horse_policy_content_hash text not null,

  horse_acceptance_id uuid
    references public.user_publication_policy_acceptances(id)
    on delete set null,

  confirmation_snapshot jsonb not null,
  content_snapshot jsonb not null,
  content_hash text not null,

  risk_signals text[] not null
    default '{}'::text[],

  created_at timestamptz not null
    default now(),

  constraint horse_offer_publication_events_submission_key_unique
    unique (
      submission_key
    ),

  constraint horse_offer_publication_events_decision_check
    check (
      decision = any (
        array[
          'published',
          'held_for_review'
        ]::text[]
      )
    ),

  constraint horse_offer_publication_events_policy_version_check
    check (
      general_policy_version ~
        '^[a-z0-9][a-z0-9_-]{1,99}$'
      and horse_policy_version ~
        '^[a-z0-9][a-z0-9_-]{1,99}$'
    ),

  constraint horse_offer_publication_events_policy_hash_check
    check (
      general_policy_content_hash ~
        '^[0-9a-f]{64}$'
      and horse_policy_content_hash ~
        '^[0-9a-f]{64}$'
    ),

  constraint horse_offer_publication_events_snapshot_check
    check (
      jsonb_typeof(confirmation_snapshot) =
        'object'
      and jsonb_typeof(content_snapshot) =
        'object'
    ),

  constraint horse_offer_publication_events_actor_acceptance_check
    check (
      actor_user_id is null
      or (
        general_acceptance_id is not null
        and horse_acceptance_id is not null
      )
    ),

  constraint horse_offer_publication_events_confirmation_keys_check
    check (
      confirmation_snapshot ?&
        array[
          'publisher_confirms_age_18_or_over',
          'publisher_confirms_information_accurate',
          'publisher_accepts_transaction_responsibility',
          'publisher_confirms_not_for_slaughter'
        ]::text[]
    ),

  constraint horse_offer_publication_events_content_hash_check
    check (
      content_hash ~ '^[0-9a-f]{64}$'
    ),

  constraint horse_offer_publication_events_risk_decision_check
    check (
      (
        decision = 'published'
        and cardinality(risk_signals) = 0
      )
      or
      (
        decision = 'held_for_review'
        and cardinality(risk_signals) >= 1
      )
    )
);

comment on table
  public.horse_offer_publication_events
is
  'Append-only per-submission audit snapshots containing the exact policy acceptances, factual confirmations, content hash and deterministic publication decision.';

comment on column
  public.horse_offer_publication_events.confirmation_snapshot
is
  'Per-offer factual confirmations captured again for every publication attempt. These are separate from versioned portal-rule acceptance.';

create index
  horse_offer_publication_events_offer_time_idx
on public.horse_offer_publication_events (
  horse_offer_id,
  created_at desc,
  id desc
);

create index
  horse_offer_publication_events_identity_time_idx
on public.horse_offer_publication_events (
  identity_id,
  created_at desc,
  id desc
);

create or replace function
  public.validate_horse_offer_image_identity_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_offer_identity_id uuid;
begin
  select offer.identity_id
  into v_offer_identity_id
  from public.horse_offers offer
  where offer.id =
    new.horse_offer_id;

  if not found then
    raise exception
      'horse_offer_image_parent_not_found'
      using errcode = '23503';
  end if;

  if new.identity_id is distinct from
    v_offer_identity_id
  then
    raise exception
      'horse_offer_image_identity_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function
  public.validate_horse_offer_image_identity_v1()
is
  'Prevents horse-offer image rows from crossing identity boundaries.';

create trigger
  trg_horse_offer_images_validate_identity_v1
before insert
or update of
  horse_offer_id,
  identity_id
on public.horse_offer_images
for each row
execute function
  public.validate_horse_offer_image_identity_v1();

create or replace function
  public.validate_horse_offer_publication_event_v1()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $function$
declare
  v_offer public.horse_offers%rowtype;
  v_general_policy
    public.publication_policy_documents%rowtype;
  v_horse_policy
    public.publication_policy_documents%rowtype;
  v_general_acceptance
    public.user_publication_policy_acceptances%rowtype;
  v_horse_acceptance
    public.user_publication_policy_acceptances%rowtype;
  v_expected_snapshot jsonb;
  v_calculated_hash text;
begin
  select offer.*
  into v_offer
  from public.horse_offers offer
  where offer.id =
    new.horse_offer_id;

  if not found then
    raise exception
      'horse_offer_publication_parent_not_found'
      using errcode = '23503';
  end if;

  if new.identity_id is distinct from
    v_offer.identity_id
  then
    raise exception
      'horse_offer_publication_identity_mismatch'
      using errcode = '23514';
  end if;

  if new.actor_user_id is null
    or new.general_acceptance_id is null
    or new.horse_acceptance_id is null
  then
    raise exception
      'horse_offer_publication_acceptance_evidence_required'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.identities identity
    where identity.id =
      new.identity_id
      and identity.status =
        'active'
      and (
        (
          identity.type = 'private'
          and identity.user_id =
            new.actor_user_id
        )
        or
        (
          identity.type = 'business'
          and exists (
            select 1
            from public.business_members member
            where member.business_account_id =
              identity.business_account_id
              and member.user_id =
                new.actor_user_id
              and member.status =
                'active'
          )
        )
      )
  ) then
    raise exception
      'horse_offer_publication_actor_identity_forbidden'
      using errcode = '23514';
  end if;

  select policy.*
  into v_general_policy
  from public.publication_policy_documents policy
  where policy.id =
    new.general_policy_document_id;

  if not found
    or v_general_policy.policy_key <>
      'marketplace-general'
    or v_general_policy.country_code is not null
    or v_general_policy.locale <>
      'et-EE'
    or v_general_policy.status <>
      'active'
    or v_general_policy.effective_from >
      now()
    or (
      v_general_policy.effective_until is not null
      and v_general_policy.effective_until <=
        now()
    )
    or not (
      'horse_offer' = any (
        v_general_policy.applies_to_content_types
      )
    )
    or new.general_policy_version <>
      v_general_policy.policy_version
    or new.general_policy_content_hash <>
      v_general_policy.content_hash
  then
    raise exception
      'horse_offer_general_policy_snapshot_invalid'
      using errcode = '23514';
  end if;

  select policy.*
  into v_horse_policy
  from public.publication_policy_documents policy
  where policy.id =
    new.horse_policy_document_id;

  if not found
    or v_horse_policy.policy_key <>
      'horse-offer-ee'
    or v_horse_policy.country_code <>
      'EE'
    or v_horse_policy.locale <>
      'et-EE'
    or v_horse_policy.status <>
      'active'
    or v_horse_policy.effective_from >
      now()
    or (
      v_horse_policy.effective_until is not null
      and v_horse_policy.effective_until <=
        now()
    )
    or not (
      'horse_offer' = any (
        v_horse_policy.applies_to_content_types
      )
    )
    or new.horse_policy_version <>
      v_horse_policy.policy_version
    or new.horse_policy_content_hash <>
      v_horse_policy.content_hash
  then
    raise exception
      'horse_offer_policy_snapshot_invalid'
      using errcode = '23514';
  end if;

  select acceptance.*
  into v_general_acceptance
  from public.user_publication_policy_acceptances acceptance
  where acceptance.id =
    new.general_acceptance_id;

  if not found
    or v_general_acceptance.user_id <>
      new.actor_user_id
    or v_general_acceptance.policy_document_id <>
      new.general_policy_document_id
    or v_general_acceptance.content_hash <>
      new.general_policy_content_hash
  then
    raise exception
      'horse_offer_general_acceptance_snapshot_invalid'
      using errcode = '23514';
  end if;

  select acceptance.*
  into v_horse_acceptance
  from public.user_publication_policy_acceptances acceptance
  where acceptance.id =
    new.horse_acceptance_id;

  if not found
    or v_horse_acceptance.user_id <>
      new.actor_user_id
    or v_horse_acceptance.policy_document_id <>
      new.horse_policy_document_id
    or v_horse_acceptance.content_hash <>
      new.horse_policy_content_hash
  then
    raise exception
      'horse_offer_acceptance_snapshot_invalid'
      using errcode = '23514';
  end if;

  if coalesce(
    (new.confirmation_snapshot ->>
      'publisher_confirms_age_18_or_over')::boolean,
    false
  ) is not true
    or coalesce(
      (new.confirmation_snapshot ->>
        'publisher_confirms_information_accurate')::boolean,
      false
    ) is not true
    or coalesce(
      (new.confirmation_snapshot ->>
        'publisher_accepts_transaction_responsibility')::boolean,
      false
    ) is not true
    or coalesce(
      (new.confirmation_snapshot ->>
        'publisher_confirms_not_for_slaughter')::boolean,
      false
    ) is not true
  then
    raise exception
      'horse_offer_common_confirmations_invalid'
      using errcode = '23514';
  end if;

  if v_offer.offer_type <> 'wanted'
    and (
      coalesce(
        (new.confirmation_snapshot ->>
          'publisher_is_owner_or_authorized')::boolean,
        false
      ) is not true
      or coalesce(
        (new.confirmation_snapshot ->>
          'publisher_confirms_horse_identified')::boolean,
        false
      ) is not true
      or coalesce(
        (new.confirmation_snapshot ->>
          'publisher_confirms_passport_available')::boolean,
        false
      ) is not true
    )
  then
    raise exception
      'horse_offer_specific_confirmations_invalid'
      using errcode = '23514';
  end if;

  v_expected_snapshot :=
    public.build_horse_offer_content_snapshot_v1(
      new.horse_offer_id
    );

  if new.content_snapshot is distinct from
    v_expected_snapshot
  then
    raise exception
      'horse_offer_content_snapshot_mismatch'
      using errcode = '23514';
  end if;

  v_calculated_hash :=
    encode(
      extensions.digest(
        convert_to(
          new.content_snapshot::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

  if new.content_hash <>
    v_calculated_hash
  then
    raise exception
      'horse_offer_content_hash_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function
  public.validate_horse_offer_publication_event_v1()
is
  'Validates publication identity, exact policy and acceptance evidence, confirmations, snapshot identity and SHA-256 content hash.';

create trigger
  trg_horse_offer_publication_events_validate_v1
before insert
on public.horse_offer_publication_events
for each row
execute function
  public.validate_horse_offer_publication_event_v1();

create or replace function
  public.prevent_horse_offer_publication_event_update_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  raise exception
    'horse_offer_publication_event_append_only'
    using errcode = '55000';
end;
$function$;

comment on function
  public.prevent_horse_offer_publication_event_update_v1()
is
  'Prevents an existing horse-offer publication snapshot from being rewritten. Deletion remains reserved for privileged account/content lifecycle operations.';

create trigger
  trg_horse_offer_publication_events_append_only_v1
before update
on public.horse_offer_publication_events
for each row
execute function
  public.prevent_horse_offer_publication_event_update_v1();

create or replace function
  public.validate_horse_offer_current_publication_event_v1()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_event public.horse_offer_publication_events%rowtype;
begin
  if new.status not in (
    'published',
    'held_for_review'
  ) then
    return new;
  end if;

  if new.current_publication_event_id is null then
    raise exception
      'horse_offer_current_publication_event_required'
      using errcode = '23514';
  end if;

  select event.*
  into v_event
  from public.horse_offer_publication_events event
  where event.id =
    new.current_publication_event_id
    and event.horse_offer_id =
      new.id
    and event.identity_id =
      new.identity_id;

  if not found then
    raise exception
      'horse_offer_current_publication_event_invalid'
      using errcode = '23514';
  end if;

  if new.status = 'published'
    and v_event.decision <>
      'published'
  then
    raise exception
      'horse_offer_publication_event_decision_mismatch'
      using errcode = '23514';
  end if;

  if new.status = 'held_for_review'
    and v_event.decision <>
      'held_for_review'
  then
    raise exception
      'horse_offer_publication_event_decision_mismatch'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

comment on function
  public.validate_horse_offer_current_publication_event_v1()
is
  'Requires published and held states to point at a matching immutable publication decision for the same offer and identity.';

create trigger
  trg_horse_offers_validate_current_publication_event_v1
before insert
or update of
  identity_id,
  status,
  current_publication_event_id
on public.horse_offers
for each row
execute function
  public.validate_horse_offer_current_publication_event_v1();

create or replace function
  public.update_horse_offer_search_vector_v1()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  new.search_vector :=
    setweight(
      to_tsvector(
        'simple',
        coalesce(
          new.title,
          ''
        )
      ),
      'A'
    )
    ||
    setweight(
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          new.horse_name,
          new.breed,
          new.color,
          new.discipline,
          new.training_level,
          new.city,
          new.region
        )
      ),
      'B'
    )
    ||
    setweight(
      to_tsvector(
        'simple',
        concat_ws(
          ' ',
          new.description,
          new.suitability,
          new.health_notes,
          new.behavior_notes
        )
      ),
      'C'
    );

  return new;
end;
$function$;

comment on function
  public.update_horse_offer_search_vector_v1()
is
  'Maintains the indexed simple-language search vector for horse offers.';

create trigger
  trg_horse_offers_search_vector_v1
before insert
or update of
  title,
  description,
  horse_name,
  breed,
  color,
  discipline,
  training_level,
  suitability,
  health_notes,
  behavior_notes,
  city,
  region
on public.horse_offers
for each row
execute function
  public.update_horse_offer_search_vector_v1();

create trigger
  trg_horse_offers_updated_at_v1
before update
on public.horse_offers
for each row
execute function
  public.set_v2_profile_content_updated_at();

alter table
  public.horse_offers
  enable row level security;

alter table
  public.horse_offer_images
  enable row level security;

alter table
  public.horse_offer_publication_events
  enable row level security;

revoke all
on table public.horse_offers
from public, anon, authenticated;

revoke all
on table public.horse_offer_images
from public, anon, authenticated;

revoke all
on table public.horse_offer_publication_events
from public, anon, authenticated;

grant all
on table public.horse_offers
to service_role;

grant all
on table public.horse_offer_images
to service_role;

grant all
on table public.horse_offer_publication_events
to service_role;

revoke all
on function
  public.build_horse_offer_content_snapshot_v1(uuid)
from public, anon, authenticated;

grant execute
on function
  public.build_horse_offer_content_snapshot_v1(uuid)
to service_role;

revoke all
on function
  public.validate_horse_offer_image_identity_v1()
from public, anon, authenticated;

grant execute
on function
  public.validate_horse_offer_image_identity_v1()
to service_role;

revoke all
on function
  public.validate_horse_offer_publication_event_v1()
from public, anon, authenticated;

grant execute
on function
  public.validate_horse_offer_publication_event_v1()
to service_role;

revoke all
on function
  public.prevent_horse_offer_publication_event_update_v1()
from public, anon, authenticated;

grant execute
on function
  public.prevent_horse_offer_publication_event_update_v1()
to service_role;

revoke all
on function
  public.validate_horse_offer_current_publication_event_v1()
from public, anon, authenticated;

grant execute
on function
  public.validate_horse_offer_current_publication_event_v1()
to service_role;

revoke all
on function
  public.update_horse_offer_search_vector_v1()
from public, anon, authenticated;

grant execute
on function
  public.update_horse_offer_search_vector_v1()
to service_role;

commit;
